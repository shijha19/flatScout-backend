import express from 'express';
import Booking from '../models/booking.models.js';
import User from '../models/user.models.js';
import FlatListing from '../models/flatListing.models.js';
import { sendBookingNotification, sendBookingConfirmation } from '../services/emailService.js';

const router = express.Router();

// Get all bookings for a user (both as visitor and owner)
router.get('/user-bookings', async (req, res) => {
  try {
    const { userEmail } = req.query;
    
    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' });
    }

    // Get user details
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get bookings where user is the visitor
    const visitorBookings = await Booking.find({ visitorEmail: userEmail })
      .populate('flatId', 'title location rent images')
      .sort({ date: 1, timeSlot: 1 });

    // Get bookings where user is the flat owner
    const ownerBookings = await Booking.find({ ownerEmail: userEmail })
      .populate('flatId', 'title location rent images')
      .populate('userId', 'name email')
      .sort({ date: 1, timeSlot: 1 });

    res.json({
      success: true,
      visitorBookings,
      ownerBookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available time slots for a specific date and flat
router.get('/availability', async (req, res) => {
  try {
    const { flatId, date } = req.query;
    
    if (!flatId || !date) {
      return res.status(400).json({ message: 'Flat ID and date are required' });
    }

    // Validate that the requested date is not in the past
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    requestedDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (requestedDate < today) {
      return res.status(400).json({ 
        message: 'Cannot check availability for past dates',
        availableSlots: [],
        bookedSlots: []
      });
    }

    // Get all bookings for this flat on this date
    const existingBookings = await Booking.find({
      flatId,
      date: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    }).select('timeSlot');

    const bookedSlots = existingBookings.map(booking => booking.timeSlot);
    
    const allTimeSlots = [
      '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
      '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00',
      '17:00-18:00', '18:00-19:00'
    ];

    const availableSlots = allTimeSlots.filter(slot => !bookedSlots.includes(slot));

    res.json({
      success: true,
      availableSlots,
      bookedSlots
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new booking
router.post('/create', async (req, res) => {
  try {
    const {
      flatId,
      ownerEmail,
      date,
      timeSlot,
      visitorName,
      visitorEmail,
      visitorPhone,
      purpose,
      notes
    } = req.body;

    // Validate required fields
    if (!flatId || !ownerEmail || !date || !timeSlot || !visitorName || !visitorEmail || !visitorPhone || !purpose) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Validate that the booking date is not in the past
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    bookingDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (bookingDate < today) {
      return res.status(400).json({ 
        message: 'Cannot book visits for past dates. Please select today or a future date.' 
      });
    }

    // Get user making the booking
    const user = await User.findOne({ email: visitorEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if flat exists
    const flat = await FlatListing.findById(flatId);
    if (!flat) {
      return res.status(404).json({ message: 'Flat not found' });
    }

    // Check if the time slot is already booked
    const existingBooking = await Booking.findOne({
      flatId,
      date: new Date(date),
      timeSlot,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBooking) {
      return res.status(409).json({ 
        message: 'This time slot is already booked',
        conflictingBooking: existingBooking
      });
    }

    // Create new booking
    const newBooking = new Booking({
      userId: user._id,
      flatId,
      ownerEmail,
      date: new Date(date),
      timeSlot,
      visitorName,
      visitorEmail,
      visitorPhone,
      purpose,
      notes,
      createdBy: {
        name: user.name,
        email: user.email,
        userId: user._id
      }
    });

    const savedBooking = await newBooking.save();
    
    // Populate the saved booking with flat details
    const populatedBooking = await Booking.findById(savedBooking._id)
      .populate('flatId', 'title location rent images');

    // Send email notifications
    try {
      const bookingDetails = {
        visitorName,
        visitorEmail,
        visitorPhone,
        flatTitle: flat.title,
        flatLocation: flat.location,
        date,
        timeSlot,
        purpose,
        notes,
        ownerEmail
      };

      // Send notification to flat owner
      const ownerNotification = await sendBookingNotification(ownerEmail, bookingDetails);
      console.log('Owner notification result:', ownerNotification);

      // Send confirmation to visitor
      const visitorConfirmation = await sendBookingConfirmation(visitorEmail, bookingDetails);
      console.log('Visitor confirmation result:', visitorConfirmation);

    } catch (emailError) {
      console.error('Email notification error:', emailError);
      // Don't fail the booking creation if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    // Handle duplicate key error (double booking)
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'This time slot is already booked',
        error: 'Duplicate booking attempt'
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update booking status
router.put('/update-status', async (req, res) => {
  try {
    const { bookingId, status, userEmail } = req.body;

    if (!bookingId || !status || !userEmail) {
      return res.status(400).json({ message: 'Booking ID, status, and user email are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only owner or visitor can update the booking status
    if (booking.ownerEmail !== userEmail && booking.visitorEmail !== userEmail) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }

    booking.status = status;
    await booking.save();

    const updatedBooking = await Booking.findById(bookingId)
      .populate('flatId', 'title location rent images')
      .populate('userId', 'name email');

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel booking
router.delete('/cancel/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only owner or visitor can cancel the booking
    if (booking.ownerEmail !== userEmail && booking.visitorEmail !== userEmail) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get bookings for a specific date range
router.get('/date-range', async (req, res) => {
  try {
    const { startDate, endDate, userEmail } = req.query;

    if (!startDate || !endDate || !userEmail) {
      return res.status(400).json({ message: 'Start date, end date, and user email are required' });
    }

    const bookings = await Booking.find({
      $or: [
        { visitorEmail: userEmail },
        { ownerEmail: userEmail }
      ],
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
    .populate('flatId', 'title location rent images')
    .populate('userId', 'name email')
    .sort({ date: 1, timeSlot: 1 });

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching bookings by date range:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

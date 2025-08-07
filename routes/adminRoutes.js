import express from 'express';
import User from '../models/user.models.js';
import FlatListing from '../models/flatListing.models.js';
import FlatmateProfile from '../models/FlatmateProfile.js';
import Booking from '../models/booking.models.js';
import ConnectionRequest from '../models/connectionRequest.models.js';
import Report from '../models/report.models.js';
import { adminOnly } from '../middlewares/adminAuth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard-stats', adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalFlats = await FlatListing.countDocuments();
    const totalFlatmates = await FlatmateProfile.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalReports = await Report.countDocuments();
    const pendingConnections = await ConnectionRequest.countDocuments({ status: 'pending' });

    // Recent activity
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    const recentBookings = await Booking.find()
      .populate('flatId', 'title')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Monthly stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersThisMonth = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    const newFlatsThisMonth = await FlatListing.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    const newBookingsThisMonth = await Booking.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });

    // Booking status breakdown
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });

    res.json({
      totalStats: {
        totalUsers,
        totalFlats,
        totalFlatmates,
        totalBookings,
        totalReports,
        pendingConnections
      },
      monthlyStats: {
        newUsersThisMonth,
        newFlatsThisMonth,
        newBookingsThisMonth
      },
      bookingStats: {
        confirmed: confirmedBookings,
        pending: pendingBookings,
        cancelled: cancelledBookings
      },
      recentActivity: {
        recentUsers: recentUsers.map(user => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        })),
        recentBookings
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users with pagination
router.get('/users', adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('connections', 'name email');

    const totalUsers = await User.countDocuments(searchQuery);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all flat listings with pagination
router.get('/flats', adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const searchQuery = search ? {
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { ownerEmail: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const flats = await FlatListing.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalFlats = await FlatListing.countDocuments(searchQuery);

    res.json({
      flats,
      pagination: {
        page,
        limit,
        total: totalFlats,
        pages: Math.ceil(totalFlats / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all bookings with pagination
router.get('/bookings', adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || '';

    const searchQuery = status ? { status } : {};

    const bookings = await Booking.find(searchQuery)
      .populate('flatId', 'title location rent')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBookings = await Booking.countDocuments(searchQuery);

    res.json({
      bookings,
      pagination: {
        page,
        limit,
        total: totalBookings,
        pages: Math.ceil(totalBookings / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all reports with pagination
router.get('/reports', adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || '';

    const searchQuery = status ? { status } : {};

    const reports = await Report.find(searchQuery)
      .populate('reportedBy', 'name email')
      .populate('listingId', 'title location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReports = await Report.countDocuments(searchQuery);

    res.json({
      reports,
      pagination: {
        page,
        limit,
        total: totalReports,
        pages: Math.ceil(totalReports / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user role
router.put('/users/:id/role', adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be user or admin.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Also delete related data
    await FlatmateProfile.findOneAndDelete({ userId: req.params.id });
    await FlatListing.deleteMany({ ownerEmail: user.email });
    await Booking.deleteMany({ visitorEmail: user.email });
    await ConnectionRequest.deleteMany({
      $or: [{ fromUser: req.params.id }, { toUser: req.params.id }]
    });

    res.json({ message: 'User and related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete flat listing
router.delete('/flats/:id', adminOnly, async (req, res) => {
  try {
    const flat = await FlatListing.findByIdAndDelete(req.params.id);
    
    if (!flat) {
      return res.status(404).json({ message: 'Flat listing not found.' });
    }

    // Delete related bookings
    await Booking.deleteMany({ flatId: req.params.id });

    res.json({ message: 'Flat listing and related bookings deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update booking status
router.put('/bookings/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('flatId', 'title').populate('userId', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    res.json({ message: 'Booking status updated successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get analytics data
router.get('/analytics', adminOnly, async (req, res) => {
  try {
    // User registration trend (last 12 months)
    const months = [];
    const userCounts = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const count = await User.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      userCounts.push(count);
    }

    // Booking trend (last 12 months)
    const bookingCounts = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const count = await Booking.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      bookingCounts.push(count);
    }

    // Top locations
    const topLocations = await FlatListing.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      userTrend: {
        months,
        data: userCounts
      },
      bookingTrend: {
        months,
        data: bookingCounts
      },
      topLocations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

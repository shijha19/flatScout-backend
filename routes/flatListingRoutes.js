import express from 'express';
import FlatListing from '../models/flatListing.models.js';
import User from '../models/user.models.js';
import LoggingService from '../services/loggingService.js';

const router = express.Router();

// Create a new flat listing
router.post('/', async (req, res) => {
  console.log('Received flat listing POST:', req.body); // Debug log
  try {
    const flat = new FlatListing(req.body);
    await flat.save();

    // Log the activity if we have owner email
    if (flat.ownerEmail) {
      try {
        const user = await User.findOne({ email: flat.ownerEmail });
        if (user) {
          await LoggingService.logActivity({
            userId: user._id,
            userEmail: user.email,
            userName: user.name,
            action: 'FLAT_CREATED',
            description: `Created new flat listing: ${flat.title} in ${flat.location}`,
            metadata: {
              flatId: flat._id,
              flatTitle: flat.title,
              location: flat.location,
              rent: flat.rent
            },
            req
          });
        }
      } catch (logError) {
        console.error('Error logging flat creation:', logError);
      }
    }

    res.status(201).json({ message: 'Flat listing created successfully', flat });
  } catch (err) {
    console.error('Flat listing creation error:', err); // Debug log
    res.status(400).json({ message: 'Failed to create flat listing', error: err.message });
  }
});

// Get all flat listings
router.get('/', async (req, res) => {
  try {
    const flats = await FlatListing.find().sort({ createdAt: -1 });
    res.status(200).json({ flats });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch flat listings', error: err.message });
  }
});


// Get a single flat listing by ID
router.get('/:id', async (req, res) => {
  try {
    const flat = await FlatListing.findById(req.params.id);
    if (!flat) {
      return res.status(404).json({ message: 'Flat not found' });
    }

    // Log the view if we have user info (optional, for activity tracking)
    const userEmail = req.query.userEmail || req.headers['user-email'];
    if (userEmail) {
      try {
        const user = await User.findOne({ email: userEmail });
        if (user) {
          await LoggingService.logActivity({
            userId: user._id,
            userEmail: user.email,
            userName: user.name,
            action: 'FLAT_VIEWED',
            description: `Viewed flat listing: ${flat.title} in ${flat.location}`,
            metadata: {
              flatId: flat._id,
              flatTitle: flat.title,
              location: flat.location,
              ownerEmail: flat.ownerEmail
            },
            req
          });
        }
      } catch (logError) {
        console.error('Error logging flat view:', logError);
      }
    }

    res.status(200).json({ flat });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch flat', error: err.message });
  }
});

export default router;

import express from 'express';
import FlatListing from '../models/flatListing.models.js';

const router = express.Router();

// Create a new flat listing
router.post('/', async (req, res) => {
  console.log('Received flat listing POST:', req.body); // Debug log
  try {
    const flat = new FlatListing(req.body);
    await flat.save();
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
    res.status(200).json({ flat });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch flat', error: err.message });
  }
});

export default router;

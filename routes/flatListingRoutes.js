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

// Add a review to a flat listing
router.post('/:id/reviews', async (req, res) => {
  try {
    const { 
      reviewerName, 
      reviewerEmail, 
      rating, 
      comment,
      cleanlinessRating,
      locationRating,
      valueForMoneyRating,
      landlordRating,
      pros,
      cons,
      stayDuration,
      wouldRecommend,
      photos
    } = req.body;
    
    // Validate required fields
    if (!reviewerName || !reviewerEmail || !rating || !comment) {
      return res.status(400).json({ message: 'Required review fields are missing' });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Validate comment length
    if (comment.trim().length < 10) {
      return res.status(400).json({ message: 'Comment must be at least 10 characters long' });
    }

    const flat = await FlatListing.findById(req.params.id);
    if (!flat) {
      return res.status(404).json({ message: 'Flat not found' });
    }

    // Check if user has already reviewed this flat
    const existingReview = flat.reviews.find(review => review.reviewerEmail === reviewerEmail);
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this property' });
    }

    // Create the enhanced review
    const newReview = {
      reviewerName,
      reviewerEmail,
      rating: Number(rating),
      comment: comment.trim(),
      cleanlinessRating: Number(cleanlinessRating) || 5,
      locationRating: Number(locationRating) || 5,
      valueForMoneyRating: Number(valueForMoneyRating) || 5,
      landlordRating: Number(landlordRating) || 5,
      pros: pros?.trim() || '',
      cons: cons?.trim() || '',
      stayDuration: stayDuration || '',
      wouldRecommend: wouldRecommend !== false, // default to true
      photos: photos || [],
      reviewDate: new Date()
    };

    flat.reviews.push(newReview);

    // Update average rating and total reviews
    flat.totalReviews = flat.reviews.length;
    
    // Calculate weighted average including category ratings
    const totalRating = flat.reviews.reduce((sum, review) => {
      const categoryAverage = (
        review.rating +
        (review.cleanlinessRating || review.rating) +
        (review.locationRating || review.rating) +
        (review.valueForMoneyRating || review.rating) +
        (review.landlordRating || review.rating)
      ) / 5;
      return sum + categoryAverage;
    }, 0);
    
    flat.averageRating = Math.round((totalRating / flat.totalReviews) * 10) / 10;

    await flat.save();

    // Log the review activity
    try {
      const user = await User.findOne({ email: reviewerEmail });
      if (user) {
        await LoggingService.logActivity({
          userId: user._id,
          userEmail: user.email,
          userName: user.name,
          action: 'REVIEW_ADDED',
          description: `Added enhanced review for flat: ${flat.title} in ${flat.location}`,
          metadata: {
            flatId: flat._id,
            flatTitle: flat.title,
            rating: rating,
            overallRating: newReview.rating,
            categoryRatings: {
              cleanliness: newReview.cleanlinessRating,
              location: newReview.locationRating,
              valueForMoney: newReview.valueForMoneyRating,
              landlord: newReview.landlordRating
            },
            wouldRecommend: newReview.wouldRecommend,
            reviewText: comment.substring(0, 100) + (comment.length > 100 ? '...' : '')
          },
          req
        });
      }
    } catch (logError) {
      console.error('Error logging review addition:', logError);
    }

    res.status(201).json({ 
      message: 'Enhanced review added successfully', 
      review: newReview,
      averageRating: flat.averageRating,
      totalReviews: flat.totalReviews
    });
  } catch (err) {
    console.error('Add review error:', err);
    res.status(500).json({ message: 'Failed to add review', error: err.message });
  }
});

// Get reviews for a flat listing
router.get('/:id/reviews', async (req, res) => {
  try {
    const flat = await FlatListing.findById(req.params.id).select('reviews averageRating totalReviews');
    if (!flat) {
      return res.status(404).json({ message: 'Flat not found' });
    }

    // Sort reviews by newest first
    const sortedReviews = flat.reviews.sort((a, b) => new Date(b.reviewDate) - new Date(a.reviewDate));

    res.status(200).json({ 
      reviews: sortedReviews,
      averageRating: flat.averageRating,
      totalReviews: flat.totalReviews
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ message: 'Failed to fetch reviews', error: err.message });
  }
});

export default router;

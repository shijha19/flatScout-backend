import mongoose from 'mongoose';

const flatListingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: String,
    required: true
  },
  bedrooms: {
    type: Number,
    required: true
  },
  bathrooms: {
    type: Number,
    required: true
  },
  area: {
    type: Number,
    required: true
  },
  furnished: {
    type: String,
    enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'],
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  contactName: {
    type: String,
    required: true,
    trim: true
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true
  },
  contactEmail: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: String, // user email or id
    required: false
  },
  reviews: [{
    reviewerName: {
      type: String,
      required: true,
      trim: true
    },
    reviewerEmail: {
      type: String,
      required: true,
      trim: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    // Enhanced rating categories
    cleanlinessRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    locationRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    valueForMoneyRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    landlordRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000
    },
    // Enhanced review fields
    pros: {
      type: String,
      trim: true,
      maxlength: 500
    },
    cons: {
      type: String,
      trim: true,
      maxlength: 500
    },
    stayDuration: {
      type: String,
      enum: ['1-3 months', '3-6 months', '6-12 months', '1+ years', 'Visited only', ''],
      default: ''
    },
    wouldRecommend: {
      type: Boolean,
      default: true
    },
    verified: {
      type: Boolean,
      default: false
    },
    helpfulVotes: {
      type: Number,
      default: 0
    },
    photos: [{
      type: String // URLs to uploaded photos
    }],
    reviewDate: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const FlatListing = mongoose.model('FlatListing', flatListingSchema, 'flat-listings');
export default FlatListing;

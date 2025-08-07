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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const FlatListing = mongoose.model('FlatListing', flatListingSchema, 'flat-listings');
export default FlatListing;

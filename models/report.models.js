import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FlatListing',
    required: false // Made optional since users can report external URLs
  },
  listingUrl: {
    type: String,
    required: false // For external listing URLs
  },
  reason: {
    type: String,
    required: true,
    enum: ['inappropriate_content', 'fake_listing', 'spam', 'fraud', 'other']
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['listing', 'user', 'payment', 'safety', 'technical'],
    default: 'listing'
  },
  evidence: {
    type: String,
    default: ''
  },
  contactAttempted: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

reportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
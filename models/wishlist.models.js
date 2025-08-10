import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // What they're saving (flat listing or flatmate profile)
  itemType: {
    type: String,
    enum: ['flat', 'flatmate', 'pg'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemModel'
  },
  itemModel: {
    type: String,
    required: true,
    enum: ['FlatListing', 'FlatmateProfile', 'PG']
  },
  // Organization features
  category: {
    type: String,
    enum: ['favorites', 'maybe', 'contacted', 'visited', 'applied'],
    default: 'favorites'
  },
  notes: {
    type: String,
    maxlength: 500,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  // Priority for user organization
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  // Reminder settings
  reminderDate: {
    type: Date
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  // Quick access data (denormalized for performance)
  itemSnapshot: {
    title: String,
    location: String,
    price: Number,
    imageUrl: String,
    contactInfo: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
wishlistSchema.index({ user: 1, itemType: 1 });
wishlistSchema.index({ user: 1, category: 1 });
wishlistSchema.index({ user: 1, createdAt: -1 });
wishlistSchema.index({ user: 1, itemId: 1, itemType: 1 }, { unique: true });

// Virtual for populated item data
wishlistSchema.virtual('item', {
  refPath: 'itemModel',
  localField: 'itemId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
wishlistSchema.set('toJSON', { virtuals: true });
wishlistSchema.set('toObject', { virtuals: true });

// Instance methods
wishlistSchema.methods.updateSnapshot = async function() {
  await this.populate('item');
  
  if (this.item) {
    const snapshot = {};
    
    if (this.itemType === 'flat') {
      snapshot.title = this.item.title;
      snapshot.location = this.item.location?.address || this.item.location;
      snapshot.price = this.item.rent;
      snapshot.imageUrl = this.item.images?.[0];
      snapshot.contactInfo = this.item.contactInfo?.phone;
    } else if (this.itemType === 'flatmate') {
      snapshot.title = this.item.name || `${this.item.firstName} ${this.item.lastName}`;
      snapshot.location = this.item.location?.preferredArea || this.item.currentLocation;
      snapshot.price = this.item.budget?.max;
      snapshot.imageUrl = this.item.profilePicture;
      snapshot.contactInfo = this.item.contactInfo?.phone;
    } else if (this.itemType === 'pg') {
      snapshot.title = this.item.name;
      snapshot.location = this.item.location?.address;
      snapshot.price = this.item.pricing?.monthly;
      snapshot.imageUrl = this.item.images?.[0];
      snapshot.contactInfo = this.item.contactInfo?.phone;
    }
    
    this.itemSnapshot = snapshot;
    await this.save();
  }
};

// Static methods
wishlistSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ user: userId });
  
  if (options.category) {
    query.where('category', options.category);
  }
  
  if (options.itemType) {
    query.where('itemType', options.itemType);
  }
  
  if (options.tags && options.tags.length > 0) {
    query.where('tags').in(options.tags);
  }
  
  return query
    .populate('item')
    .sort(options.sortBy || '-createdAt')
    .limit(options.limit || 50);
};

// Get wishlist categories for a user
wishlistSchema.statics.getCategories = function(userId) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { 
      _id: '$category', 
      count: { $sum: 1 },
      lastAdded: { $max: '$createdAt' }
    }},
    { $sort: { count: -1 } }
  ]);
};

// Get tags for a user
wishlistSchema.statics.getUserTags = function(userId) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$tags' },
    { $group: { 
      _id: '$tags', 
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
};
wishlistSchema.statics.getCategories = function(userId) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { 
      _id: '$category', 
      count: { $sum: 1 },
      lastAdded: { $max: '$createdAt' }
    }},
    { $sort: { count: -1 } }
  ]);
};

wishlistSchema.statics.getUserTags = function(userId) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$tags' },
    { $group: { 
      _id: '$tags', 
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
};

// Middleware
wishlistSchema.pre('save', function(next) {
  // Clean up tags
  if (this.tags) {
    this.tags = this.tags
      .filter(tag => tag && tag.trim())
      .map(tag => tag.trim().toLowerCase())
      .slice(0, 10); // Limit tags
  }
  next();
});

// Pre-remove middleware to clean up related data
wishlistSchema.pre('remove', async function(next) {
  // Could add cleanup logic here if needed
  next();
});

export default mongoose.model('Wishlist', wishlistSchema);

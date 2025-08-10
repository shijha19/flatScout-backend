import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'connection_request',
      'connection_accepted',
      'new_message',
      'booking_request',
      'booking_confirmed',
      'booking_cancelled',
      'new_match',
      'listing_updated',
      'rent_reminder',
      'system_announcement',
      'profile_view',
      'new_listing_in_area',
      'wishlist_added',
      'wishlist_removed'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  actionUrl: {
    type: String
  },
  actionText: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  sentVia: [{
    type: String,
    enum: ['push', 'email', 'sms', 'in_app']
  }],
  metadata: {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    relatedListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlatListing'
    },
    relatedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ type: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;

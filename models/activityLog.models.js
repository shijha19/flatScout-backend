import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      'USER_REGISTERED',
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_PROFILE_UPDATED',
      'USER_PASSWORD_CHANGED',
      
      // Flat actions
      'FLAT_CREATED',
      'FLAT_UPDATED',
      'FLAT_DELETED',
      'FLAT_VIEWED',
      
      // Booking actions
      'BOOKING_CREATED',
      'BOOKING_CONFIRMED',
      'BOOKING_CANCELLED',
      
      // Connection actions
      'CONNECTION_REQUEST_SENT',
      'CONNECTION_REQUEST_ACCEPTED',
      'CONNECTION_REQUEST_DECLINED',
      
      // Report actions
      'REPORT_SUBMITTED',
      'REPORT_RESOLVED',
      
      // Admin actions
      'ADMIN_USER_PROMOTED',
      'ADMIN_USER_DEMOTED',
      'ADMIN_USER_DELETED',
      'ADMIN_FLAT_DELETED',
      'ADMIN_REPORT_HANDLED',
      
      // Chat actions
      'MESSAGE_SENT',
      'CHAT_STARTED',
      
      // Other actions
      'FLATMATE_PROFILE_CREATED',
      'FLATMATE_PROFILE_UPDATED',
    ]
  },
  description: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;

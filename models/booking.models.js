import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  flatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FlatListing',
    required: true,
  },
  ownerEmail: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  timeSlot: {
    type: String,
    required: true,
    enum: [
      '09:00-10:00',
      '10:00-11:00', 
      '11:00-12:00',
      '12:00-13:00',
      '13:00-14:00',
      '14:00-15:00',
      '15:00-16:00',
      '16:00-17:00',
      '17:00-18:00',
      '18:00-19:00'
    ]
  },
  visitorName: {
    type: String,
    required: true,
  },
  visitorEmail: {
    type: String,
    required: true,
  },
  visitorPhone: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
    enum: ['Flat Visit', 'Property Inspection', 'Meet & Greet', 'Document Verification', 'Other']
  },
  notes: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  createdBy: {
    name: String,
    email: String,
    userId: mongoose.Schema.Types.ObjectId
  }
}, {
  timestamps: true,
});

// Create compound index to prevent double booking for same flat, date, and time slot
bookingSchema.index({ flatId: 1, date: 1, timeSlot: 1 }, { unique: true });

// Index for efficient queries
bookingSchema.index({ userId: 1, date: 1 });
bookingSchema.index({ ownerEmail: 1, date: 1 });
bookingSchema.index({ date: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;

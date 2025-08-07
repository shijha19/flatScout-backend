import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
});

// Ensure no duplicate requests between the same users
connectionRequestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

const ConnectionRequest = mongoose.model("ConnectionRequest", connectionRequestSchema);

export default ConnectionRequest;

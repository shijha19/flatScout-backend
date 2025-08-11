import express from "express";
import User from "../models/user.models.js";
import ConnectionRequest from "../models/connectionRequest.models.js";
import NotificationService from "../services/notificationService.js";

const router = express.Router();

// Send a connection request
router.post("/send-request", async (req, res) => {
  const { userEmail, connectToUserId } = req.body;
  
  if (!userEmail || !connectToUserId) {
    return res.status(400).json({ message: "userEmail and connectToUserId are required." });
  }

  try {
    // Find the requesting user
    const fromUser = await User.findOne({ email: userEmail });
    if (!fromUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const mongoose = (await import('mongoose')).default;
    let toUser = null;

    // Try to find target user - first by ObjectId if valid, then by other means
    if (mongoose.Types.ObjectId.isValid(connectToUserId)) {
      // Try to find by MongoDB ObjectId
      toUser = await User.findById(connectToUserId);
    }
    
    // If not found by ObjectId, try to find by email (in case connectToUserId is an email)
    if (!toUser && connectToUserId.includes('@')) {
      toUser = await User.findOne({ email: connectToUserId });
    }
    
    // If still not found, try to find through FlatmateProfile
    if (!toUser) {
      const FlatmateProfile = (await import('../models/FlatmateProfile.js')).default;
      
      // Find FlatmateProfile that has this userId (could be ObjectId or email)
      const flatmateProfile = await FlatmateProfile.findOne({ userId: connectToUserId });
      if (flatmateProfile && flatmateProfile.userEmail) {
        toUser = await User.findOne({ email: flatmateProfile.userEmail });
      }
    }

    if (!toUser) {
      return res.status(404).json({ message: "Target user not found." });
    }

    // Check if users are already connected
    const fromUserObjId = fromUser._id;
    const toUserObjId = toUser._id;
    
    if (fromUser.connections.some(id => id.equals(toUserObjId))) {
      return res.status(409).json({ message: "Already connected to this user." });
    }

    // Check if there's already a pending request
    const existingRequest = await ConnectionRequest.findOne({
      $or: [
        { fromUser: fromUserObjId, toUser: toUserObjId },
        { fromUser: toUserObjId, toUser: fromUserObjId }
      ],
      status: "pending"
    });

    if (existingRequest) {
      if (existingRequest.fromUser.equals(fromUserObjId)) {
        return res.status(409).json({ message: "Connection request already sent." });
      } else {
        return res.status(409).json({ message: "This user has already sent you a connection request." });
      }
    }

    // Create new connection request
    const connectionRequest = new ConnectionRequest({
      fromUser: fromUserObjId,
      toUser: toUserObjId
    });

    await connectionRequest.save();

    // Send notification to the recipient
    try {
      await NotificationService.sendConnectionRequest(fromUserObjId, toUserObjId, connectionRequest._id);
    } catch (notificationError) {
      console.error('Error sending connection request notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.status(200).json({ 
      message: "Connection request sent successfully.",
      request: connectionRequest
    });

  } catch (err) {
    console.error('Error in send-request:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Accept a connection request
router.post("/accept-request", async (req, res) => {
  console.log('=== ACCEPT REQUEST ENDPOINT HIT ===');
  console.log('Request body:', req.body);
  
  const { requestId, userEmail } = req.body;
  
  if (!requestId || !userEmail) {
    console.log('Missing required fields:', { requestId, userEmail });
    return res.status(400).json({ message: "requestId and userEmail are required." });
  }

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const connectionRequest = await ConnectionRequest.findById(requestId).populate('fromUser', 'name email');
    if (!connectionRequest) {
      return res.status(404).json({ message: "Connection request not found." });
    }

    // Verify this request is for the current user
    if (!connectionRequest.toUser.equals(user._id)) {
      return res.status(403).json({ message: "Not authorized to accept this request." });
    }

    if (connectionRequest.status !== "pending") {
      return res.status(400).json({ message: "This request has already been processed." });
    }

    // Update request status
    connectionRequest.status = "accepted";
    connectionRequest.respondedAt = new Date();
    await connectionRequest.save();

    // Add both users to each other's connections
    const fromUser = await User.findById(connectionRequest.fromUser._id);
    
    if (!user.connections.includes(connectionRequest.fromUser._id)) {
      user.connections.push(connectionRequest.fromUser._id);
      await user.save();
    }
    
    if (!fromUser.connections.includes(user._id)) {
      fromUser.connections.push(user._id);
      await fromUser.save();
    }

    // Send notification to the person who sent the request
    try {
      await NotificationService.sendConnectionAccepted(user._id, connectionRequest.fromUser._id);
    } catch (notificationError) {
      console.error('Error sending connection accepted notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.status(200).json({ 
      message: "Connection request accepted.",
      connectedUser: connectionRequest.fromUser
    });

  } catch (err) {
    console.error('Error in accept-request:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Decline a connection request
router.post("/decline-request", async (req, res) => {
  const { requestId, userEmail } = req.body;
  
  if (!requestId || !userEmail) {
    return res.status(400).json({ message: "requestId and userEmail are required." });
  }

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const connectionRequest = await ConnectionRequest.findById(requestId);
    if (!connectionRequest) {
      return res.status(404).json({ message: "Connection request not found." });
    }

    // Verify this request is for the current user
    if (!connectionRequest.toUser.equals(user._id)) {
      return res.status(403).json({ message: "Not authorized to decline this request." });
    }

    if (connectionRequest.status !== "pending") {
      return res.status(400).json({ message: "This request has already been processed." });
    }

    // Update request status
    connectionRequest.status = "declined";
    connectionRequest.respondedAt = new Date();
    await connectionRequest.save();

    res.status(200).json({ message: "Connection request declined." });

  } catch (err) {
    console.error('Error in decline-request:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get pending connection requests for a user
router.get("/pending-requests", async (req, res) => {
  const { userEmail } = req.query;
  
  if (!userEmail) {
    return res.status(400).json({ message: "userEmail is required." });
  }

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const pendingRequests = await ConnectionRequest.find({
      toUser: user._id,
      status: "pending"
    }).populate('fromUser', 'name email _id').sort({ createdAt: -1 });

    res.status(200).json({ requests: pendingRequests });

  } catch (err) {
    console.error('Error in pending-requests:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Check connection status between two users
router.get("/connection-status", async (req, res) => {
  const { userEmail, targetUserId } = req.query;
  
  if (!userEmail || !targetUserId) {
    return res.status(400).json({ message: "userEmail and targetUserId are required." });
  }

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const mongoose = (await import('mongoose')).default;
    let targetUser = null;

    // Try to find target user - first by ObjectId if valid, then by other means
    if (mongoose.Types.ObjectId.isValid(targetUserId)) {
      // Try to find by MongoDB ObjectId
      targetUser = await User.findById(targetUserId);
    }
    
    // If not found by ObjectId, try to find by email (in case targetUserId is an email)
    if (!targetUser && targetUserId.includes('@')) {
      targetUser = await User.findOne({ email: targetUserId });
    }
    
    // If still not found, try to find through FlatmateProfile
    if (!targetUser) {
      const FlatmateProfile = (await import('../models/FlatmateProfile.js')).default;
      
      // Find FlatmateProfile that has this userId (could be ObjectId or email)
      const flatmateProfile = await FlatmateProfile.findOne({ userId: targetUserId });
      if (flatmateProfile && flatmateProfile.userEmail) {
        targetUser = await User.findOne({ email: flatmateProfile.userEmail });
      }
    }

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found." });
    }

    const targetUserObjId = targetUser._id;

    // Check if already connected
    const isConnected = user.connections.some(id => id.equals(targetUserObjId));
    if (isConnected) {
      return res.status(200).json({ status: "connected" });
    }

    // Check for pending requests
    const pendingRequest = await ConnectionRequest.findOne({
      $or: [
        { fromUser: user._id, toUser: targetUserObjId, status: "pending" },
        { fromUser: targetUserObjId, toUser: user._id, status: "pending" }
      ]
    });

    if (pendingRequest) {
      if (pendingRequest.fromUser.equals(user._id)) {
        return res.status(200).json({ status: "request_sent" });
      } else {
        return res.status(200).json({ status: "request_received" });
      }
    }

    res.status(200).json({ status: "not_connected" });

  } catch (err) {
    console.error('Error in connection-status:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;

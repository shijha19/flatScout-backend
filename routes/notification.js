import express from "express";
import User from "../models/user.models.js";
import ConnectionRequest from "../models/connectionRequest.models.js";

const router = express.Router();

// Get notifications: pending connection requests for the logged-in user
router.get("/notifications", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: "userId is required." });

  try {
    // ...removed Notification API fetch log...
    
    // Find both sent and received pending connection requests for this user
    const receivedRequests = await ConnectionRequest.find({
      toUser: userId,
      status: "pending"
    }).populate('fromUser', 'name email _id').sort({ createdAt: -1 });
    
    // ...removed Notification API received requests log...
    
    const sentRequests = await ConnectionRequest.find({
      fromUser: userId,
      status: "pending"
    }).populate('toUser', 'name email _id').sort({ createdAt: -1 });
    
    // ...removed Notification API sent requests log...

    // Format the response to match the existing notification structure
    const notifications = [
      ...receivedRequests
        .filter(request => request.fromUser) // Filter out requests with null fromUser
        .map(request => ({
          _id: request._id,
          name: request.fromUser.name,
          email: request.fromUser.email,
          fromUserId: request.fromUser._id,
          direction: "received",
          type: "connection_request",
          createdAt: request.createdAt
        })),
      ...sentRequests
        .filter(request => request.toUser) // Filter out requests with null toUser
        .map(request => ({
          _id: request._id,
          name: request.toUser.name,
          email: request.toUser.email,
          toUserId: request.toUser._id,
          direction: "sent",
          type: "connection_request",
          createdAt: request.createdAt
        }))
    ];
    
    // ...removed Notification API formatted notifications log...
    res.status(200).json({ notifications });
  } catch (error) {
    console.error('[Notification API] error:', error);
    res.status(500).json({ message: "Failed to fetch notifications.", error: error.message });
  }
});

export default router;

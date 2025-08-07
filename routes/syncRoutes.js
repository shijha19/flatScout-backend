import express from 'express';
import ConnectionRequest from '../models/connectionRequest.models.js';
import User from '../models/user.models.js';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

// Sync connections between ConnectionRequest and User.connections
router.post('/sync-connections', auth, async (req, res) => {
  try {
    console.log('Starting connection synchronization...');
    
    // Get all accepted connection requests
    const acceptedConnections = await ConnectionRequest.find({ status: 'accepted' });
    console.log(`Found ${acceptedConnections.length} accepted connection requests`);
    
    let syncCount = 0;
    
    for (const connection of acceptedConnections) {
      const fromUserId = connection.fromUser;
      const toUserId = connection.toUser;
      
      // Get both users
      const fromUser = await User.findById(fromUserId);
      const toUser = await User.findById(toUserId);
      
      if (!fromUser || !toUser) {
        console.log(`Skipping connection - user not found: ${fromUserId} -> ${toUserId}`);
        continue;
      }
      
      let updated = false;
      
      // Add toUser to fromUser's connections if not already there
      if (!fromUser.connections.includes(toUserId)) {
        fromUser.connections.push(toUserId);
        await fromUser.save();
        console.log(`Added ${toUser.name} to ${fromUser.name}'s connections`);
        updated = true;
      }
      
      // Add fromUser to toUser's connections if not already there
      if (!toUser.connections.includes(fromUserId)) {
        toUser.connections.push(fromUserId);
        await toUser.save();
        console.log(`Added ${fromUser.name} to ${toUser.name}'s connections`);
        updated = true;
      }
      
      if (updated) {
        syncCount++;
      }
    }
    
    console.log(`Connection synchronization completed. Updated ${syncCount} connections.`);
    
    res.json({
      message: 'Connection synchronization completed',
      totalAcceptedRequests: acceptedConnections.length,
      syncedConnections: syncCount
    });
    
  } catch (error) {
    console.error('Error syncing connections:', error);
    res.status(500).json({ message: 'Error syncing connections', error: error.message });
  }
});

// Get connection stats for debugging
router.get('/connection-stats', auth, async (req, res) => {
  try {
    const { userEmail } = req.query;
    
    if (!userEmail) {
      return res.status(400).json({ message: 'userEmail is required' });
    }
    
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get accepted connection requests where user is involved
    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { fromUser: user._id },
        { toUser: user._id }
      ],
      status: 'accepted'
    });
    
    // Get user's connections array
    const userConnections = await User.findById(user._id).populate('connections', 'name email');
    
    res.json({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      connectionRequestsCount: connectionRequests.length,
      userConnectionsCount: userConnections.connections.length,
      connectionRequests: connectionRequests.map(cr => ({
        id: cr._id,
        fromUser: cr.fromUser,
        toUser: cr.toUser,
        status: cr.status,
        createdAt: cr.createdAt,
        respondedAt: cr.respondedAt
      })),
      userConnections: userConnections.connections.map(c => ({
        id: c._id,
        name: c.name,
        email: c.email
      }))
    });
    
  } catch (error) {
    console.error('Error getting connection stats:', error);
    res.status(500).json({ message: 'Error getting connection stats', error: error.message });
  }
});

export default router;

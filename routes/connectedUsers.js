import express from 'express';
import ConnectionRequest from '../models/connectionRequest.models.js';
import User from '../models/user.models.js';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

router.get('/connected-users/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching connected users for userId:', userId);

    // Find all accepted connection requests where the user is either the sender or receiver
    const connections = await ConnectionRequest.find({
      $or: [
        { fromUser: userId },
        { toUser: userId }
      ],
      status: 'accepted'
    });

    console.log('Found connections:', connections.length);
    console.log('Connection details:', connections.map(conn => ({
      id: conn._id,
      from: conn.fromUser,
      to: conn.toUser,
      status: conn.status,
      createdAt: conn.createdAt,
      respondedAt: conn.respondedAt
    })));

    // Extract the IDs of connected users
    const connectedUserIds = connections.map(conn => 
      conn.fromUser.toString() === userId ? conn.toUser : conn.fromUser
    );

    console.log('Connected user IDs:', connectedUserIds);

    // Fetch user details for connected users
    const connectedUsers = await User.find(
      { _id: { $in: connectedUserIds } },
      'name email profileImage' // Correct field name is profileImage, not profilePicture
    );

    console.log('Found connected users in database:', connectedUsers.length);
    console.log('User details found:', connectedUsers.map(u => ({ id: u._id, name: u.name, email: u.email })));

    // Check if any user IDs were not found
    const foundUserIds = connectedUsers.map(u => u._id.toString());
    const missingUserIds = connectedUserIds.filter(id => !foundUserIds.includes(id.toString()));
    if (missingUserIds.length > 0) {
      console.log('WARNING: Missing users for IDs:', missingUserIds);
    }

    // Add fallback avatars for users without profile pictures
    const usersWithAvatars = connectedUsers.map(user => {
      console.log('User profile data:', { 
        name: user.name, 
        email: user.email, 
        profileImage: user.profileImage 
      });
      
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profileImage && user.profileImage !== '' 
          ? user.profileImage 
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4f46e5&color=fff&size=128`
      };
    });

    console.log('Returning connected users:', usersWithAvatars.length);
    res.json({ connectedUsers: usersWithAvatars });
  } catch (error) {
    console.error('Error fetching connected users:', error);
    res.status(500).json({ message: 'Error fetching connected users' });
  }
});

export default router;

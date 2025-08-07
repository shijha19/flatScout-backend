import ConnectionRequest from '../models/connectionRequest.models.js';
import User from '../models/user.models.js';

// Utility function to create test connections between users
export const createTestConnections = async (req, res) => {
  try {
    // This is a development-only endpoint
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'This endpoint is only available in development' });
    }

    const { userEmail1, userEmail2 } = req.body;

    // Find both users
    const user1 = await User.findOne({ email: userEmail1 });
    const user2 = await User.findOne({ email: userEmail2 });

    if (!user1 || !user2) {
      return res.status(404).json({ message: 'One or both users not found' });
    }

    // Create a connection request and immediately accept it
    const connectionRequest = new ConnectionRequest({
      fromUser: user1._id,
      toUser: user2._id,
      status: 'accepted',
      respondedAt: new Date()
    });

    await connectionRequest.save();

    res.json({ 
      message: 'Test connection created successfully',
      connection: {
        from: user1.name,
        to: user2.name,
        status: 'accepted'
      }
    });
  } catch (error) {
    console.error('Error creating test connection:', error);
    res.status(500).json({ message: 'Error creating test connection' });
  }
};

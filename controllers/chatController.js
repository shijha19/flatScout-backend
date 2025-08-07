import { StreamChat } from 'stream-chat';
import User from '../models/user.models.js';

const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

export const generateToken = async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Get user from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profileImage = user.profileImage && user.profileImage !== '' 
      ? user.profileImage 
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4f46e5&color=fff&size=128`;

    console.log('Creating main user in Stream:', { 
      id: userId, 
      name: user.name, 
      image: profileImage 
    });

    // Create or update user in Stream Chat
    await serverClient.upsertUser({
      id: userId,
      name: user.name || 'Anonymous',
      image: profileImage,
      email: user.email,
    });

    // Generate Stream Chat token
    const token = serverClient.createToken(userId);

    // Return token to client
    res.json({ token });
  } catch (error) {
    console.error('Error generating chat token:', error);
    res.status(500).json({ message: 'Error generating chat token' });
  }
};

export const createChatUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'userIds array is required' });
    }

    // Get users from database
    const users = await User.find({ _id: { $in: userIds } });
    
    // Create all users in Stream Chat with proper profile pictures
    const streamUsers = users.map(user => {
      const profileImage = user.profileImage && user.profileImage !== '' 
        ? user.profileImage 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4f46e5&color=fff&size=128`;
      
      console.log('Creating Stream user:', { 
        id: user._id.toString(), 
        name: user.name, 
        image: profileImage 
      });
      
      return {
        id: user._id.toString(),
        name: user.name || 'Anonymous',
        image: profileImage,
        email: user.email,
      };
    });

    await serverClient.upsertUsers(streamUsers);

    res.json({ message: 'Users created successfully', count: streamUsers.length });
  } catch (error) {
    console.error('Error creating chat users:', error);
    res.status(500).json({ message: 'Error creating chat users' });
  }
};

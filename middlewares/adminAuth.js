import User from '../models/user.models.js';

// Middleware to check if user is admin
export const adminOnly = async (req, res, next) => {
  try {
    const userEmail = req.body.userEmail || req.query.userEmail || req.headers['user-email'];
    
    if (!userEmail) {
      return res.status(401).json({ message: 'User email required for authentication.' });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Middleware to check if user is authenticated (admin or regular user)
export const authenticated = async (req, res, next) => {
  try {
    const userEmail = req.body.userEmail || req.query.userEmail || req.headers['user-email'];
    
    if (!userEmail) {
      return res.status(401).json({ message: 'User email required for authentication.' });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

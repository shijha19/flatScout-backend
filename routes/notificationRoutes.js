import express from 'express';
import NotificationService from '../services/notificationService.js';
import User from '../models/user.models.js';

const router = express.Router();

// Get user notifications
router.get('/notifications', async (req, res) => {
  try {
    const { userEmail, page = 1, limit = 20, unreadOnly = false } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await NotificationService.getUserNotifications(user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark notification as read (delete it)
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const notification = await NotificationService.markAsRead(id, user._id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted', notification });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark all notifications as read (delete them)
router.put('/notifications/read-all', async (req, res) => {
  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await NotificationService.markAllAsRead(user._id);
    res.json({ message: 'All notifications deleted', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Subscribe to push notifications
router.post('/push/subscribe', async (req, res) => {
  try {
    const { userEmail, subscription } = req.body;
    const userAgent = req.get('User-Agent');

    if (!userEmail || !subscription) {
      return res.status(400).json({ message: 'User email and subscription are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await NotificationService.subscribeToPush(user._id, subscription, userAgent);
    res.json({ message: 'Successfully subscribed to push notifications', subscription: result });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unsubscribe from push notifications
router.post('/push/unsubscribe', async (req, res) => {
  try {
    const { userEmail, endpoint } = req.body;

    if (!userEmail || !endpoint) {
      return res.status(400).json({ message: 'User email and endpoint are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await NotificationService.unsubscribeFromPush(user._id, endpoint);
    res.json({ message: 'Successfully unsubscribed from push notifications', subscription: result });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  res.json({ 
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BP8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8'
  });
});

// Test notification (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', async (req, res) => {
    try {
      const { userEmail, type = 'system_announcement', title, message } = req.body;

      if (!userEmail || !title || !message) {
        return res.status(400).json({ message: 'User email, title, and message are required' });
      }

      // Find user by email
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const notification = await NotificationService.createNotification({
        userId: user._id,
        type,
        title,
        message,
        sendPush: true,
        sendEmail: false
      });

      res.json({ message: 'Test notification sent', notification });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
}

// Cleanup old notifications (older than 1 day)
router.post('/cleanup-old', async (req, res) => {
  try {
    const result = await NotificationService.cleanupOldNotifications();
    res.json({ 
      message: 'Old notifications cleanup completed', 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

import mongoose from 'mongoose';
import NotificationService from './services/notificationService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function cleanupOldNotifications() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');
    console.log('Starting cleanup of old notifications...');

    // Clean up old notifications (older than 1 day)
    const result = await NotificationService.cleanupOldNotifications();
    
    console.log('Cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    process.exit(1);
  }
}

cleanupOldNotifications();

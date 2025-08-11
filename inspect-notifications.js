// Script to inspect notifications in the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const notificationSchema = new mongoose.Schema({}, { strict: false });
const Notification = mongoose.model('Notification', notificationSchema);

async function inspectNotifications() {
  try {
    // Find all connection request notifications
    const notifications = await Notification.find({
      type: 'connection_request'
    }).sort({ createdAt: -1 });

    console.log(`Found ${notifications.length} connection request notifications:`);

    for (const notification of notifications) {
      console.log('\n=== Notification ===');
      console.log('ID:', notification._id);
      console.log('Type:', notification.type);
      console.log('Title:', notification.title);
      console.log('Message:', notification.message);
      console.log('UserId:', notification.userId);
      console.log('Metadata:', JSON.stringify(notification.metadata, null, 2));
      console.log('CreatedAt:', notification.createdAt);
      console.log('UpdatedAt:', notification.updatedAt);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error inspecting notifications:', error);
    process.exit(1);
  }
}

inspectNotifications();

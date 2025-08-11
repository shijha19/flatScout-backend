// Quick script to fix the existing notification in the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const notificationSchema = new mongoose.Schema({}, { strict: false });
const Notification = mongoose.model('Notification', notificationSchema);

const connectionRequestSchema = new mongoose.Schema({}, { strict: false });
const ConnectionRequest = mongoose.model('ConnectionRequest', connectionRequestSchema);

async function fixNotifications() {
  try {
    // Find connection request notifications without connectionRequestId
    const notifications = await Notification.find({
      type: 'connection_request',
      'metadata.connectionRequestId': { $exists: false }
    });

    console.log(`Found ${notifications.length} notifications to fix`);

    for (const notification of notifications) {
      console.log('Fixing notification:', notification._id);
      
      // Find the corresponding connection request
      // We'll look for a pending connection request to this user around the same time
      const connectionRequests = await ConnectionRequest.find({
        toUser: notification.userId,
        status: 'pending',
        createdAt: {
          $gte: new Date(notification.createdAt.getTime() - 60000), // 1 minute before
          $lte: new Date(notification.createdAt.getTime() + 60000)  // 1 minute after
        }
      }).sort({ createdAt: -1 });

      if (connectionRequests.length > 0) {
        const connectionRequest = connectionRequests[0];
        console.log('Found matching connection request:', connectionRequest._id);
        
        // Update the notification
        await Notification.updateOne(
          { _id: notification._id },
          { 
            $set: { 
              'metadata.connectionRequestId': connectionRequest._id 
            } 
          }
        );
        
        console.log('Updated notification:', notification._id);
      } else {
        console.log('No matching connection request found for notification:', notification._id);
      }
    }

    console.log('Finished fixing notifications');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing notifications:', error);
    process.exit(1);
  }
}

fixNotifications();

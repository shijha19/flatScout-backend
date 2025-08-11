import webpush from 'web-push';
import Notification from '../models/notification.models.js';
import PushSubscription from '../models/pushSubscription.models.js';
import User from '../models/user.models.js';
import { sendEmail } from './emailService.js';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:support@flatscout.com',
  process.env.VAPID_PUBLIC_KEY || 'BP8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8',
  process.env.VAPID_PRIVATE_KEY || 'VGhpcyBpcyBhIGZha2UgcHJpdmF0ZSBrZXkgZm9yIGRldmVsb3BtZW50'
);

class NotificationService {
  /**
   * Create and send a notification to a user
   */
  static async createNotification({
    userId,
    type,
    title,
    message,
    data = {},
    priority = 'medium',
    actionUrl = null,
    actionText = null,
    expiresAt = null,
    sendPush = true,
    sendEmail = false,
    metadata = {}
  }) {
    try {
      // Create notification in database
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        data,
        priority,
        actionUrl,
        actionText,
        expiresAt,
        metadata
      });

      await notification.save();

      // Send via different channels
      const sentVia = ['in_app'];

      // Send push notification
      if (sendPush) {
        const pushSent = await this.sendPushNotification(userId, {
          title,
          body: message,
          data: {
            notificationId: notification._id.toString(),
            type,
            actionUrl,
            ...data
          }
        });
        if (pushSent) sentVia.push('push');
      }

      // Send email notification
      if (sendEmail) {
        const emailSent = await this.sendEmailNotification(userId, {
          title,
          message,
          actionUrl,
          actionText
        });
        if (emailSent) sentVia.push('email');
      }

      // Update notification with sent channels
      notification.sentVia = sentVia;
      await notification.save();

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to user's subscribed devices
   */
  static async sendPushNotification(userId, payload) {
    try {
      const subscriptions = await PushSubscription.find({ 
        userId, 
        active: true 
      });

      if (subscriptions.length === 0) {
        console.log(`No active push subscriptions found for user ${userId}`);
        return false;
      }

      const pushPromises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
              }
            },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/badge-72x72.png',
              data: payload.data,
              actions: payload.actionUrl ? [{
                action: 'open',
                title: 'Open',
                icon: '/icons/open-icon.png'
              }] : []
            })
          );

          // Update last used
          subscription.lastUsed = new Date();
          await subscription.save();

          return true;
        } catch (error) {
          console.error('Error sending push to subscription:', error);
          
          // If subscription is invalid, mark as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            subscription.active = false;
            await subscription.save();
          }
          
          return false;
        }
      });

      const results = await Promise.allSettled(pushPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      console.log(`Sent push notifications to ${successCount}/${subscriptions.length} devices`);
      return successCount > 0;
    } catch (error) {
      console.error('Error sending push notifications:', error);
      return false;
    }
  }

  /**
   * Send email notification
   */
  static async sendEmailNotification(userId, { title, message, actionUrl, actionText }) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.email) {
        console.log(`No email found for user ${userId}`);
        return false;
      }

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">FlatScout</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">${message}</p>
            ${actionUrl && actionText ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${actionUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  ${actionText}
                </a>
              </div>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              You received this notification because you have an account with FlatScout.
              <br><a href="${process.env.FRONTEND_URL}/profile" style="color: #667eea;">Manage notification preferences</a>
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject: `FlatScout: ${title}`,
        html: emailContent
      });

      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    try {
      const query = { userId };
      if (unreadOnly) {
        query.read = false;
      }

      const notifications = await Notification.find(query)
        .populate('metadata.fromUser', 'name email profileImage')
        .populate('metadata.relatedListing', 'title location')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ userId, read: false });

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
      );

      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  static async subscribeToPush(userId, subscription, userAgent = null) {
    try {
      const existingSubscription = await PushSubscription.findOne({
        userId,
        endpoint: subscription.endpoint
      });

      if (existingSubscription) {
        // Update existing subscription
        existingSubscription.keys = subscription.keys;
        existingSubscription.active = true;
        existingSubscription.lastUsed = new Date();
        existingSubscription.userAgent = userAgent;
        await existingSubscription.save();
        return existingSubscription;
      } else {
        // Create new subscription
        const newSubscription = new PushSubscription({
          userId,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent,
          active: true
        });
        await newSubscription.save();
        return newSubscription;
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  static async unsubscribeFromPush(userId, endpoint) {
    try {
      const result = await PushSubscription.findOneAndUpdate(
        { userId, endpoint },
        { active: false },
        { new: true }
      );

      return result;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      console.log(`Cleaned up ${result.deletedCount} expired notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  /**
   * Predefined notification templates
   */
  static async sendConnectionRequest(fromUserId, toUserId, connectionRequestId) {
    const fromUser = await User.findById(fromUserId);
    console.log('Creating connection request notification with:', {
      fromUserId,
      toUserId,
      connectionRequestId,
      fromUserName: fromUser?.name
    });
    
    const notification = await this.createNotification({
      userId: toUserId,
      type: 'connection_request',
      title: 'New Connection Request',
      message: `${fromUser.name} wants to connect with you!`,
      actionUrl: '/profile',
      actionText: 'View Request',
      sendPush: true,
      metadata: { 
        fromUser: fromUserId,
        connectionRequestId: connectionRequestId
      }
    });
    
    console.log('Created notification:', JSON.stringify(notification, null, 2));
    return notification;
  }

  static async sendConnectionAccepted(fromUserId, toUserId) {
    const fromUser = await User.findById(fromUserId);
    return this.createNotification({
      userId: toUserId,
      type: 'connection_accepted',
      title: 'Connection Accepted!',
      message: `${fromUser.name} accepted your connection request. You can now chat!`,
      actionUrl: '/chat',
      actionText: 'Start Chatting',
      sendPush: true,
      metadata: { fromUser: fromUserId }
    });
  }

  static async sendNewMessage(fromUserId, toUserId, messagePreview) {
    const fromUser = await User.findById(fromUserId);
    return this.createNotification({
      userId: toUserId,
      type: 'new_message',
      title: `New message from ${fromUser.name}`,
      message: messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      actionUrl: '/chat',
      actionText: 'Reply',
      sendPush: true,
      priority: 'high',
      metadata: { fromUser: fromUserId }
    });
  }

  static async sendBookingRequest(bookingId, ownerUserId, visitorName) {
    return this.createNotification({
      userId: ownerUserId,
      type: 'booking_request',
      title: 'New Booking Request',
      message: `${visitorName} wants to schedule a visit to your property.`,
      actionUrl: '/booking-calendar',
      actionText: 'View Booking',
      sendPush: true,
      sendEmail: true,
      metadata: { relatedBooking: bookingId }
    });
  }

  static async sendNewMatch(userId, matchCount) {
    return this.createNotification({
      userId,
      type: 'new_match',
      title: 'New Flatmate Matches!',
      message: `We found ${matchCount} new compatible flatmate${matchCount > 1 ? 's' : ''} for you.`,
      actionUrl: '/find-flatmate',
      actionText: 'View Matches',
      sendPush: true
    });
  }
}

export default NotificationService;

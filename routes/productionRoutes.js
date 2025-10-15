import express from 'express';
import User from '../models/user.models.js';
import FlatmateProfile from '../models/FlatmateProfile.js';
import NotificationService from '../services/notificationService.js';

const router = express.Router();

// Comprehensive production debugging endpoint
router.get('/debug/production-check', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not set',
        frontendUrl: process.env.FRONTEND_URL || 'not set',
        mongoUri: process.env.MONGO_URI ? 'configured' : 'not configured',
        cors: 'enabled'
      },
      database: {},
      apis: {},
      errors: []
    };

    // Test database connection
    try {
      const userCount = await User.countDocuments();
      const profileCount = await FlatmateProfile.countDocuments();
      
      testResults.database = {
        connected: true,
        users: userCount,
        profiles: profileCount
      };
      
      if (userCount === 0) {
        testResults.errors.push('No users found in database');
      }
      if (profileCount === 0) {
        testResults.errors.push('No flatmate profiles found');
      }
    } catch (dbError) {
      testResults.database = {
        connected: false,
        error: dbError.message
      };
      testResults.errors.push(`Database error: ${dbError.message}`);
    }

    // Test flatmate API
    try {
      const sampleUser = await User.findOne();
      if (sampleUser) {
        // Test the matches endpoint logic
        const profiles = await FlatmateProfile.find({ 
          userId: { $ne: sampleUser._id.toString() }
        }).limit(5);
        
        testResults.apis.flatmate = {
          working: true,
          sampleUserId: sampleUser._id.toString(),
          availableProfiles: profiles.length,
          sampleProfileIds: profiles.map(p => p._id.toString())
        };
      } else {
        testResults.apis.flatmate = {
          working: false,
          error: 'No users available for testing'
        };
      }
    } catch (flatmateError) {
      testResults.apis.flatmate = {
        working: false,
        error: flatmateError.message
      };
      testResults.errors.push(`Flatmate API error: ${flatmateError.message}`);
    }

    // Test notification API
    try {
      const sampleUser = await User.findOne();
      if (sampleUser) {
        const notifications = await NotificationService.getUserNotifications(sampleUser._id, {
          page: 1,
          limit: 5
        });
        
        testResults.apis.notifications = {
          working: true,
          sampleUserId: sampleUser._id.toString(),
          notificationCount: notifications.notifications?.length || 0,
          unreadCount: notifications.unreadCount || 0
        };
      } else {
        testResults.apis.notifications = {
          working: false,
          error: 'No users available for testing'
        };
      }
    } catch (notificationError) {
      testResults.apis.notifications = {
        working: false,
        error: notificationError.message
      };
      testResults.errors.push(`Notification API error: ${notificationError.message}`);
    }

    // Test request headers and origin
    testResults.request = {
      origin: req.get('origin') || 'not provided',
      userAgent: req.get('user-agent') || 'not provided',
      host: req.get('host') || 'not provided',
      referer: req.get('referer') || 'not provided',
      contentType: req.get('content-type') || 'not provided'
    };

    // Overall health assessment
    testResults.overallHealth = testResults.errors.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED';
    
    console.log('Production check completed:', testResults.overallHealth);
    res.json(testResults);
    
  } catch (error) {
    console.error('Production check failed:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      overallHealth: 'CRITICAL_ERROR',
      error: error.message,
      stack: error.stack
    });
  }
});

// Quick health check for load balancers
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
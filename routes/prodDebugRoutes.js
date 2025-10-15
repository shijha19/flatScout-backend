import express from 'express';
import FlatmateProfile from '../models/FlatmateProfile.js';
import User from '../models/user.models.js';

const router = express.Router();

// Quick production debug endpoint (no auth required for debugging)
router.get('/debug/production-status', async (req, res) => {
  try {
    // Set proper JSON headers
    res.setHeader('Content-Type', 'application/json');
    
    const result = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      database: {
        connected: false,
        userCount: 0,
        profileCount: 0
      },
      api: {
        status: 'checking'
      }
    };

    // Check database connection
    try {
      result.database.connected = true;
      result.database.userCount = await User.countDocuments();
      result.database.profileCount = await FlatmateProfile.countDocuments();
    } catch (dbError) {
      result.database.error = dbError.message;
    }

    // Quick sample data check
    if (result.database.profileCount > 0) {
      const sampleProfile = await FlatmateProfile.findOne({}, { name: 1, userId: 1, userEmail: 1 });
      result.sampleProfile = {
        hasName: !!sampleProfile?.name,
        hasUserId: !!sampleProfile?.userId,
        hasUserEmail: !!sampleProfile?.userEmail,
        userIdFormat: sampleProfile?.userId?.includes('@') ? 'email' : 'objectId'
      };
    }

    result.api.status = 'ok';
    res.json(result);
    
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test the actual flatmate matches endpoint with better error handling
router.get('/debug/test-matches/:userId', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    
    const userId = req.params.userId;
    const userEmail = req.query.userEmail;
    
    // Test the exact same logic as the main endpoint but with detailed logging
    const result = {
      timestamp: new Date().toISOString(),
      input: { userId, userEmail },
      steps: []
    };

    // Step 1: Find current user
    result.steps.push('Finding current user...');
    let currentUser = null;
    if (/^[a-fA-F0-9]{24}$/.test(userId)) {
      currentUser = await User.findById(userId);
      result.steps.push(`Found user by ObjectId: ${!!currentUser}`);
    }
    if (!currentUser && userEmail) {
      currentUser = await User.findOne({ email: userEmail });
      result.steps.push(`Found user by email: ${!!currentUser}`);
    }

    if (!currentUser) {
      result.error = 'User not found';
      return res.status(404).json(result);
    }

    result.currentUser = {
      name: currentUser.name,
      email: currentUser.email,
      connectionsCount: currentUser.connections?.length || 0
    };

    // Step 2: Build query
    let query = { userId: { $ne: userId } };
    if (userEmail) {
      query = {
        $and: [
          { userId: { $ne: userId } },
          { userEmail: { $ne: userEmail } }
        ]
      };
    }
    result.query = query;
    result.steps.push('Built exclusion query');

    // Step 3: Find profiles
    const allProfiles = await FlatmateProfile.find(query);
    result.steps.push(`Found ${allProfiles.length} profiles after exclusion`);

    // Step 4: Filter connections
    let filteredProfiles = allProfiles;
    if (currentUser.connections && currentUser.connections.length > 0) {
      const beforeCount = filteredProfiles.length;
      filteredProfiles = allProfiles.filter(profile => {
        const isConnected = currentUser.connections.some(connId => {
          if (profile.userId && /^[a-fA-F0-9]{24}$/.test(profile.userId)) {
            return connId.equals(profile.userId);
          }
          return false;
        });
        return !isConnected;
      });
      result.steps.push(`Filtered out ${beforeCount - filteredProfiles.length} connected users`);
    }

    // Step 5: Check for valid users
    const validProfiles = [];
    for (const profile of filteredProfiles.slice(0, 5)) { // Check first 5
      let user = null;
      if (profile.userId && /^[a-fA-F0-9]{24}$/.test(profile.userId)) {
        user = await User.findById(profile.userId);
      }
      if (!user && profile.userEmail) {
        user = await User.findOne({ email: profile.userEmail });
      }
      if (!user && profile.userId && profile.userId.includes('@')) {
        user = await User.findOne({ email: profile.userId });
      }

      if (user) {
        validProfiles.push({
          profileName: profile.name,
          userId: profile.userId,
          userEmail: profile.userEmail,
          matchedUserName: user.name
        });
      }
    }

    result.validProfilesChecked = validProfiles.length;
    result.sampleValidProfiles = validProfiles;
    result.steps.push(`Found ${validProfiles.length} valid profiles from ${Math.min(5, filteredProfiles.length)} checked`);

    result.totalProfilesWouldReturn = filteredProfiles.length;
    
    res.json(result);
    
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
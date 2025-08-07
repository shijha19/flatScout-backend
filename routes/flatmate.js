import express from 'express';
import FlatmateProfile from '../models/FlatmateProfile.js';
import User from '../models/user.models.js';

const router = express.Router();

// Debug endpoint to inspect data consistency
router.get('/debug/data-check', async (req, res) => {
  try {
    console.log('=== DEBUG: Checking data consistency ===');
    
    // Get all users
    const users = await User.find({}, { _id: 1, email: 1, name: 1 });
    console.log('Users in database:', users.map(u => ({ _id: u._id.toString(), email: u.email, name: u.name })));
    
    // Get all flatmate profiles
    const profiles = await FlatmateProfile.find({}, { _id: 1, userId: 1, userEmail: 1, name: 1 });
    console.log('FlatmateProfiles in database:', profiles.map(p => ({ 
      _id: p._id.toString(), 
      userId: p.userId, 
      userEmail: p.userEmail, 
      name: p.name 
    })));
    
    // Check for mismatches
    const mismatches = [];
    for (const profile of profiles) {
      const matchingUser = users.find(u => 
        u._id.toString() === profile.userId || 
        u.email === profile.userId || 
        u.email === profile.userEmail
      );
      
      if (!matchingUser) {
        mismatches.push({
          profileId: profile._id.toString(),
          profileName: profile.name,
          userId: profile.userId,
          userEmail: profile.userEmail
        });
      }
    }
    
    console.log('Profiles without matching users:', mismatches);
    
    res.json({
      users: users.length,
      profiles: profiles.length,
      mismatches: mismatches.length,
      userIds: users.map(u => u._id.toString()),
      profileUserIds: profiles.map(p => p.userId),
      mismatches
    });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get flatmate profile by userId
router.get('/profile/:userId', async (req, res) => {
  try {
    const profile = await FlatmateProfile.findOne({ userId: req.params.userId });
    if (!profile) return res.status(404).json(null);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get full profile (user + flatmate profile) by userId
router.get('/profile/full/:userId', async (req, res) => {
  try {
    const userId = decodeURIComponent(req.params.userId);
    console.log('Looking for user with ID:', userId, 'Original param:', req.params.userId);
    
    let user = null;
    let profile = null;
    
    // Strategy 1: Try to find user by _id (if it's a MongoDB ObjectId)
    if (/^[a-fA-F0-9]{24}$/.test(userId)) {
      console.log('Trying to find user by MongoDB ObjectId');
      user = await User.findById(userId);
      if (user) {
        console.log('Found user by ObjectId:', user.name, 'with email:', user.email);
        // Get flatmate profile using multiple strategies since profiles may be stored with different userId formats
        profile = await FlatmateProfile.findOne({ userId: userId }) ||                    // Try the ObjectId itself
                   await FlatmateProfile.findOne({ userId: user._id.toString() }) ||      // Try ObjectId as string
                   await FlatmateProfile.findOne({ userEmail: user.email }) ||            // Try user's email in userEmail field
                   await FlatmateProfile.findOne({ userId: user.email });                 // Try user's email in userId field
        
        if (profile) {
          console.log('Found profile for user:', profile.name);
        } else {
          console.log('No profile found for user:', user.name, 'Tried userId:', userId, 'userEmail:', user.email);
        }
      }
    }
    
    // Strategy 2: If not found by ObjectId, try to find user by email
    if (!user && userId.includes('@')) {
      console.log('Trying to find user by email');
      user = await User.findOne({ email: userId });
      if (user) {
        console.log('Found user by email:', user.name);
        // Get flatmate profile using the user's ObjectId or email
        profile = await FlatmateProfile.findOne({ userId: user._id.toString() }) ||
                   await FlatmateProfile.findOne({ userEmail: userId }) ||
                   await FlatmateProfile.findOne({ userId: userId });
      }
    }
    
    // Strategy 3: If still not found, try to find flatmate profile first and get user from there
    if (!user) {
      console.log('Trying to find flatmate profile first');
      profile = await FlatmateProfile.findOne({ userId: userId }) ||
                await FlatmateProfile.findOne({ userEmail: userId });
      
      if (profile) {
        console.log('Found flatmate profile:', profile.name, 'Profile userId:', profile.userId, 'Profile userEmail:', profile.userEmail);
        // Try to find user by the userId in the profile
        if (profile.userId && /^[a-fA-F0-9]{24}$/.test(profile.userId)) {
          user = await User.findById(profile.userId);
        } else if (profile.userEmail) {
          user = await User.findOne({ email: profile.userEmail });
        }
        
        // If still no user found, try finding by the userId as email
        if (!user && profile.userId && profile.userId.includes('@')) {
          user = await User.findOne({ email: profile.userId });
        }
      }
    }
    
    if (!user) {
      console.log('User not found with any strategy. Searched with userId:', userId);
      console.log('Available FlatmateProfiles count:', await FlatmateProfile.countDocuments());
      console.log('Available Users count:', await User.countDocuments());
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Final result - User:', user.name, 'Profile:', profile ? profile.name : 'No profile');
    
    res.json({
      user: user,
      profile: profile
    });
  } catch (err) {
    console.error('Error in /profile/full/:userId:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create or update flatmate profile by userId
router.post('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const update = req.body;
    const profile = await FlatmateProfile.findOneAndUpdate(
      { userId },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get matches for a user, show all cards except own and already connected users
router.get('/matches/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const userEmail = req.query.userEmail;
    
    // First, find the current user to get their connections
    let currentUser = null;
    if (/^[a-fA-F0-9]{24}$/.test(userId)) {
      currentUser = await User.findById(userId);
    }
    if (!currentUser && userEmail) {
      currentUser = await User.findOne({ email: userEmail });
    }
    
    let query = { userId: { $ne: userId } };
    if (userEmail) {
      query = {
        $and: [
          { userId: { $ne: userId } },
          { userEmail: { $ne: userEmail } }
        ]
      };
    }
    
    const allProfiles = await FlatmateProfile.find(query);
    
    // Filter out profiles of already connected users
    let filteredProfiles = allProfiles;
    if (currentUser && currentUser.connections && currentUser.connections.length > 0) {
      filteredProfiles = allProfiles.filter(profile => {
        // Check if this profile belongs to a connected user
        const isConnected = currentUser.connections.some(connId => {
          // Check by User ObjectId
          if (profile.userId && /^[a-fA-F0-9]{24}$/.test(profile.userId)) {
            return connId.equals(profile.userId);
          }
          // Note: For email-based connections, we'll check during user lookup below
          return false;
        });
        return !isConnected;
      });
    }
    
    // For each profile, try to find the corresponding User to get the correct _id for navigation
    const enhancedProfiles = await Promise.all(filteredProfiles.map(async (profile) => {
      let user = null;
      // Try to find the user by various means
      if (profile.userId && /^[a-fA-F0-9]{24}$/.test(profile.userId)) {
        user = await User.findById(profile.userId);
      }
      if (!user && profile.userEmail) {
        user = await User.findOne({ email: profile.userEmail });
      }
      if (!user && profile.userId && profile.userId.includes('@')) {
        user = await User.findOne({ email: profile.userId });
      }

      // Additional check: if user found, verify they're not in the connections list by User ObjectId
      if (user && currentUser && currentUser.connections && currentUser.connections.length > 0) {
        const isConnectedByUserId = currentUser.connections.some(connId => connId.equals(user._id));
        if (isConnectedByUserId) {
          return null; // Skip this profile as it belongs to a connected user
        }
      }

      // Return profile with the correct user _id for navigation
      const profileObj = profile.toObject();
      if (user) {
        profileObj.actualUserId = user._id.toString();
        // If profile.photoUrl is missing or empty, use user's profileImage
        if ((!profileObj.photoUrl || profileObj.photoUrl === '') && user.profileImage) {
          profileObj.photoUrl = user.profileImage;
        }
      }
      return profileObj;
    }));
    
    // Filter out null values (connected users that were skipped)
    const finalProfiles = enhancedProfiles.filter(profile => profile !== null);
    res.json(finalProfiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

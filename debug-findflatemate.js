import mongoose from 'mongoose';
import FlatmateProfile from './models/FlatmateProfile.js';
import User from './models/user.models.js';

// Debug script to investigate FindFlatmate issues in production
async function debugFindFlatmate() {
  try {
    console.log('=== FIND FLATMATE DEBUG SCRIPT ===\n');
    
    // 1. Check database connection
    console.log('1. Database Connection Status:', mongoose.connection.readyState);
    if (mongoose.connection.readyState !== 1) {
      console.log('❌ Database not connected! Connection states: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting');
      return;
    }
    
    // 2. Count total records
    const userCount = await User.countDocuments();
    const profileCount = await FlatmateProfile.countDocuments();
    console.log('2. Total Records:');
    console.log(`   Users: ${userCount}`);
    console.log(`   FlatmateProfiles: ${profileCount}`);
    
    if (userCount === 0) {
      console.log('❌ No users found in database!');
      return;
    }
    
    if (profileCount === 0) {
      console.log('❌ No flatmate profiles found in database!');
      console.log('💡 Users need to complete their flatmate profiles before they appear in Find Flatmate');
      return;
    }
    
    // 3. Check sample user data
    console.log('\n3. Sample User Data:');
    const sampleUsers = await User.find({}, { name: 1, email: 1, userType: 1, hasCompletedPreferences: 1 }).limit(5);
    sampleUsers.forEach((user, i) => {
      console.log(`   User ${i + 1}: ${user.name} (${user.email}) - Type: ${user.userType}, Completed: ${user.hasCompletedPreferences}`);
    });
    
    // 4. Check sample flatmate profile data
    console.log('\n4. Sample FlatmateProfile Data:');
    const sampleProfiles = await FlatmateProfile.find({}, { name: 1, userId: 1, userEmail: 1, age: 1, gender: 1 }).limit(5);
    sampleProfiles.forEach((profile, i) => {
      console.log(`   Profile ${i + 1}: ${profile.name} - UserId: ${profile.userId}, Email: ${profile.userEmail}, Age: ${profile.age}, Gender: ${profile.gender}`);
    });
    
    // 5. Check for data consistency issues
    console.log('\n5. Data Consistency Check:');
    const orphanedProfiles = [];
    const profilesWithNoMatchingUser = [];
    
    for (const profile of sampleProfiles) {
      let matchingUser = null;
      
      // Try finding user by ObjectId
      if (/^[a-fA-F0-9]{24}$/.test(profile.userId)) {
        try {
          matchingUser = await User.findById(profile.userId);
        } catch (e) {
          // Invalid ObjectId
        }
      }
      
      // Try finding user by email
      if (!matchingUser && profile.userEmail) {
        matchingUser = await User.findOne({ email: profile.userEmail });
      }
      
      // Try finding user by email in userId field
      if (!matchingUser && profile.userId && profile.userId.includes('@')) {
        matchingUser = await User.findOne({ email: profile.userId });
      }
      
      if (!matchingUser) {
        orphanedProfiles.push({
          profileId: profile._id,
          name: profile.name,
          userId: profile.userId,
          userEmail: profile.userEmail
        });
      }
    }
    
    console.log(`   Orphaned profiles (no matching user): ${orphanedProfiles.length}`);
    if (orphanedProfiles.length > 0) {
      console.log('   ❌ Found orphaned profiles:', orphanedProfiles);
    }
    
    // 6. Test matches endpoint logic
    console.log('\n6. Testing Matches Endpoint Logic:');
    const testUser = await User.findOne();
    if (testUser) {
      console.log(`   Testing with user: ${testUser.name} (ID: ${testUser._id})`);
      
      // Simulate the matches query
      const userId = testUser._id.toString();
      const userEmail = testUser.email;
      
      let query = { userId: { $ne: userId } };
      if (userEmail) {
        query = {
          $and: [
            { userId: { $ne: userId } },
            { userEmail: { $ne: userEmail } }
          ]
        };
      }
      
      const matchingProfiles = await FlatmateProfile.find(query);
      console.log(`   Profiles matching query: ${matchingProfiles.length}`);
      
      // Filter by connections
      let filteredProfiles = matchingProfiles;
      if (testUser.connections && testUser.connections.length > 0) {
        console.log(`   User has ${testUser.connections.length} connections, filtering them out...`);
        const beforeFilter = filteredProfiles.length;
        filteredProfiles = matchingProfiles.filter(profile => {
          const isConnected = testUser.connections.some(connId => {
            if (profile.userId && /^[a-fA-F0-9]{24}$/.test(profile.userId)) {
              return connId.equals(profile.userId);
            }
            return false;
          });
          return !isConnected;
        });
        console.log(`   After connection filter: ${filteredProfiles.length} (removed ${beforeFilter - filteredProfiles.length})`);
      }
      
      // Check for valid users for each profile
      let validProfiles = 0;
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
          validProfiles++;
        }
      }
      
      console.log(`   Valid profiles (with existing users): ${validProfiles}/${Math.min(5, filteredProfiles.length)} checked`);
      
      if (filteredProfiles.length === 0) {
        console.log('   ❌ No profiles would be returned by matches endpoint!');
        console.log('   💡 Possible causes:');
        console.log('      - All profiles belong to the same user');
        console.log('      - All profiles belong to connected users');
        console.log('      - Query is excluding all profiles');
      }
    }
    
    // 7. Check for common production issues
    console.log('\n7. Common Production Issues Check:');
    
    // Check for users without completed preferences
    const usersWithoutPrefs = await User.countDocuments({ hasCompletedPreferences: false });
    console.log(`   Users without completed preferences: ${usersWithoutPrefs}`);
    
    // Check for profiles with missing required fields
    const profilesWithMissingFields = await FlatmateProfile.find({
      $or: [
        { name: { $exists: false } },
        { name: '' },
        { age: { $exists: false } },
        { gender: { $exists: false } },
        { userId: { $exists: false } },
        { userId: '' }
      ]
    }).countDocuments();
    console.log(`   Profiles with missing required fields: ${profilesWithMissingFields}`);
    
    // Check user types
    const flatOwners = await User.countDocuments({ userType: 'flat_owner' });
    const flatFinders = await User.countDocuments({ userType: 'flat_finder' });
    console.log(`   User types - Flat Owners: ${flatOwners}, Flat Finders: ${flatFinders}`);
    
    // 8. Environment-specific checks
    console.log('\n8. Environment Check:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   Database URL: ${process.env.MONGODB_URI ? 'set' : 'not set'}`);
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('Debug script error:', error);
  }
}

// Export for use in routes or run directly
export default debugFindFlatmate;

// If running directly
if (process.argv[2] === 'run') {
  // You would need to connect to your database first
  console.log('To run this debug script:');
  console.log('1. Import it in your server.js or a route');
  console.log('2. Call debugFindFlatmate() after database connection is established');
  console.log('3. Or create an endpoint that calls this function');
}
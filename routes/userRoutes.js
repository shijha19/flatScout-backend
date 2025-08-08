import express from "express";
import User from "../models/user.models.js";
import LoggingService from "../services/loggingService.js";

const router = express.Router();

// Get user by email - needed for notifications
router.get("/by-email/:email", async (req, res) => {
  const { email } = req.params;
  if (!email) return res.status(400).json({ message: "Email is required." });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json({ user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Add a connection (user connects to another user)
router.post("/connect", async (req, res) => {
  const { userEmail, connectToUserId } = req.body;
  if (!userEmail || !connectToUserId) {
    return res
      .status(400)
      .json({ message: "userEmail and connectToUserId are required." });
  }
  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).json({ message: "User not found." });
    // Debug log for connectToUserId
    console.log('Connect request:', { userEmail, connectToUserId });
    // Use the already imported mongoose instead of require
    const mongoose = (await import('mongoose')).default;
    if (!mongoose.Types.ObjectId.isValid(connectToUserId)) {
      console.error('Invalid ObjectId:', connectToUserId);
      return res.status(400).json({ message: "Invalid user id format.", id: connectToUserId });
    }
    const connectToObjId = new mongoose.Types.ObjectId(connectToUserId);
    if (user.connections.some(id => id.equals(connectToObjId))) {
      return res.status(409).json({ message: "Already connected." });
    }
    user.connections.push(connectToObjId);
    try {
      await user.save();
    } catch (saveErr) {
      console.error('Error saving user:', saveErr);
      return res.status(500).json({ message: "Error saving user.", error: saveErr.message });
    }
    res
      .status(200)
      .json({ message: "Connection added.", connections: user.connections });
  } catch (err) {
    console.error('Server error in /connect:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all connections for a user with detailed flatmate profile information
router.get("/connections", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email is required." });
  try {
    const user = await User.findOne({ email }).populate("connections");
    if (!user) return res.status(404).json({ message: "User not found." });
    
    // Get FlatmateProfile for each connection
    const FlatmateProfile = (await import('../models/FlatmateProfile.js')).default;
    const connectionsWithProfiles = await Promise.all(
      user.connections.map(async (connectedUser) => {
        // Find the flatmate profile for this connected user
        let profile = await FlatmateProfile.findOne({ 
          $or: [
            { userId: connectedUser._id.toString() },
            { userEmail: connectedUser.email },
            { userId: connectedUser.email }
          ]
        });
        
        return {
          ...connectedUser.toObject(),
          flatmateProfile: profile ? profile.toObject() : null
        };
      })
    );
    
    res.status(200).json({ connections: connectionsWithProfiles });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Change password route
router.put("/change-password", async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ message: "All fields are required." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (user.password !== oldPassword) {
      return res.status(401).json({ message: "Old password is incorrect." });
    }
    user.password = newPassword;
    await user.save();

    // Log the password change activity
    await LoggingService.logActivity({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      action: 'USER_PASSWORD_CHANGED',
      description: `User changed password: ${user.name} (${user.email})`,
      metadata: {
        timestamp: new Date()
      },
      req
    });

    res.status(200).json({ message: "Password changed successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get user profile by email (for frontend display)
router.get("/profile", async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Signup route: create user in MongoDB if not exists
router.post("/signup", async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res
      .status(400)
      .json({ message: "Email, name, and password are required." });
  }
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(409)
        .json({ message: "User already exists. Please log in." });
    }
    user = new User({ email, name, password });
    await user.save();

    // Log the registration activity
    await LoggingService.logActivity({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      action: 'USER_REGISTERED',
      description: `New user registered: ${user.name} (${user.email})`,
      metadata: {
        registrationMethod: 'email'
      },
      req
    });

    res
      .status(201)
      .json({ message: "Signup successful. You can now log in.", user });
  } catch (err) {
    console.error("Error in /signup:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login route: add user to DB if not exists
router.post("/login", async (req, res) => {
  const { email, name, password } = req.body;
  console.log("Received login:", { email, name }); // Debug log
  if (!email || !name || !password) {
    return res
      .status(400)
      .json({ message: "Email, name, and password are required." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // User not found, send 401 and message to redirect to signup
      return res
        .status(401)
        .json({ message: "User not found. Please sign up." });
    }
    if (user.name !== name || user.password !== password) {
      // Name or password do not match
      return res
        .status(401)
        .json({
          message: "Invalid credentials. Please check your name and password.",
        });
    }

    // Log the login activity
    await LoggingService.logActivity({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      action: 'USER_LOGIN',
      description: `User logged in: ${user.name} (${user.email})`,
      metadata: {
        loginMethod: 'email'
      },
      req
    });

    // User exists and credentials match, allow login
    res.status(200).json({ message: "Login successful", user });
  } catch (err) {
    console.error("Error in /login:", err); // Debug log
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update user profile
router.put("/profile", async (req, res) => {
  const { email, name, phone, bio, location, profileImage } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ message: "Email is required to update profile." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    
    const oldData = {
      name: user.name,
      phone: user.phone,
      bio: user.bio,
      location: user.location,
      profileImage: user.profileImage
    };

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (profileImage) user.profileImage = profileImage;
    await user.save();

    // Log the profile update activity
    await LoggingService.logActivity({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      action: 'USER_PROFILE_UPDATED',
      description: `User updated profile: ${user.name} (${user.email})`,
      metadata: {
        updatedFields: Object.keys(req.body).filter(key => key !== 'email'),
        oldData,
        newData: {
          name: user.name,
          phone: user.phone,
          bio: user.bio,
          location: user.location,
          profileImage: user.profileImage
        }
      },
      req
    });

    res.status(200).json({ message: "Profile updated successfully.", user });
  } catch (err) {
    console.error("Error in PUT /profile:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Logout route (for logging purposes)
router.post("/logout", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }
  try {
    const user = await User.findOne({ email });
    if (user) {
      // Log the logout activity
      await LoggingService.logActivity({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        action: 'USER_LOGOUT',
        description: `User logged out: ${user.name} (${user.email})`,
        metadata: {
          timestamp: new Date()
        },
        req
      });
    }
    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.error("Error in /logout:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Make user admin (for initial setup - remove in production)
router.put("/make-admin/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOneAndUpdate(
      { email },
      { role: 'admin' },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    
    res.json({ message: "User is now an admin", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;

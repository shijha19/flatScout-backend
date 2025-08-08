import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/user.models.js';
dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Try to find the user by googleId or email
      let user = await User.findOne({ $or: [ { googleId: profile.id }, { email: profile.emails[0].value } ] });
      if (!user) {
        // Create a new user if not found
        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          password: Math.random().toString(36).slice(-8) // dummy password, not used
        });
        await user.save();
      }
      // Create payload for JWT
      const userPayload = {
        _id: user._id,
        name: user.name,
        email: user.email,
        picture: profile.photos[0]?.value,
        googleId: user.googleId,
        hasCompletedPreferences: user.hasCompletedPreferences
      };
      // Generate JWT token
      const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
      return done(null, { ...userPayload, token });
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

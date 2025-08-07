import express from 'express';
import passport from 'passport';
const router = express.Router();

// Test route to verify auth is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes are working!',
    environment: process.env.NODE_ENV || 'development',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    frontendUrl: process.env.FRONTEND_URL
  });
});

// 1. Redirect to Google for login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Google callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    const token = req.user.token;
    // Redirect to frontend with JWT token as query param
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/oauth-success?token=${token}`);
  }
);

export default router;

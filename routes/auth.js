import express from 'express';
import passport from 'passport';
const router = express.Router();

// 1. Redirect to Google for login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Google callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    const token = req.user.token;
    // Redirect to frontend with JWT token as query param
    res.redirect(`http://localhost:5173/oauth-success?token=${token}`);
  }
);

export default router;

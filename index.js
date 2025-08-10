import express from 'express';
import session from 'express-session';
import passport from 'passport';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import pgRoutes from './routes/pgRoutes.js';
import userRoutes from './routes/userRoutes.js';
import flatListingRoutes from './routes/flatListingRoutes.js';
import flatmateRoutes from './routes/flatmate.js';
import authRoutes from './routes/auth.js';
import legacyNotificationRoutes from './routes/notification.js';
import connectionRequestRoutes from './routes/connectionRequest.js';
import connectedUsersRoutes from './routes/connectedUsers.js';
import bookingRoutes from './routes/booking.js';
import testEmailRoutes from './routes/testEmail.js';
import adminRoutes from './routes/adminRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import { createTestConnections } from './controllers/testController.js';
import './config/passport.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Session middleware
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// JSON body parser
app.use(express.json());

// Serve static files from public directory (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static('public'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pg', pgRoutes);
app.use('/api/user', userRoutes);
app.use('/api/flats', flatListingRoutes);
app.use('/api/flatmates', flatmateRoutes);
app.use('/api/notification', legacyNotificationRoutes);
app.use('/api/connection', connectionRequestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/connected-users', connectedUsersRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/test', testEmailRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Development-only test endpoints
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/test/create-connection', createTestConnections);
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api", (req, res) => {
  res.json({ message: "Hello from the backend!" });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

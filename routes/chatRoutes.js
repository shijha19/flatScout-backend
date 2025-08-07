import express from 'express';
import { generateToken, createChatUsers } from '../controllers/chatController.js';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

// Generate Stream Chat token
router.post('/token', auth, generateToken);

// Create users in Stream Chat (server-side only)
router.post('/create-users', auth, createChatUsers);

export default router;

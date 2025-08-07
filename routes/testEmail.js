import express from 'express';
import { sendBookingNotification, sendBookingConfirmation } from '../services/emailService.js';

const router = express.Router();

// Test email endpoint - for development/testing only
router.post('/test-email', async (req, res) => {
  try {
    const { type, email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const testBookingDetails = {
      visitorName: "Test Visitor",
      visitorEmail: "test.visitor@example.com",
      visitorPhone: "+1234567890",
      flatTitle: "Test 2BHK Apartment",
      flatLocation: "Test Location, Test City",
      date: new Date().toISOString().split('T')[0],
      timeSlot: "10:00-11:00",
      purpose: "Flat Visit",
      notes: "This is a test email notification",
      ownerEmail: email
    };

    let result;
    if (type === 'owner') {
      result = await sendBookingNotification(email, testBookingDetails);
    } else if (type === 'visitor') {
      result = await sendBookingConfirmation(email, testBookingDetails);
    } else {
      return res.status(400).json({ message: 'Type must be "owner" or "visitor"' });
    }

    if (result.success) {
      res.json({ 
        success: true, 
        message: `Test ${type} email sent successfully!`,
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send test email',
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

export default router;

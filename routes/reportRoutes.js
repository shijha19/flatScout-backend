import express from 'express';
import Report from '../models/report.models.js';
import User from '../models/user.models.js';
import FlatListing from '../models/flatListing.models.js';
import LoggingService from '../services/loggingService.js';

const router = express.Router();

// Submit a new report
router.post('/submit', async (req, res) => {
  try {
    const {
      reportMethod,
      existingListingId,
      listingUrl,
      reportType,
      description,
      reporterName,
      reporterEmail,
      evidence,
      priority,
      category,
      contactAttempted
    } = req.body;

    // Validate required fields
    if (!reporterEmail || !description || !reportType) {
      return res.status(400).json({ 
        message: 'Missing required fields: reporterEmail, description, and reportType are required.' 
      });
    }

    // Find the user who is reporting
    const reportingUser = await User.findOne({ email: reporterEmail });
    if (!reportingUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let listingId = null;
    
    // If reporting an existing listing, find the flat
    if (reportMethod === 'existing' && existingListingId) {
      const flatListing = await FlatListing.findById(existingListingId);
      if (!flatListing) {
        return res.status(404).json({ message: 'Flat listing not found.' });
      }
      listingId = existingListingId;
    }

    // Map frontend report types to backend enum values
    const reasonMapping = {
      'fraud': 'fraud',
      'fake': 'fake_listing', 
      'scam': 'fraud',
      'spam': 'spam',
      'inappropriate': 'inappropriate_content',
      'pricing': 'other',
      'photos': 'fake_listing',
      'contact': 'other',
      'outdated': 'other',
      'other': 'other'
    };

    const mappedReason = reasonMapping[reportType] || 'other';

    // Create the report
    const reportData = {
      reportedBy: reportingUser._id,
      reason: mappedReason,
      description: description,
      status: 'pending'
    };

    // Add listing ID if available
    if (listingId) {
      reportData.listingId = listingId;
    }

    const report = new Report(reportData);
    await report.save();

    // Log the activity
    await LoggingService.logActivity({
      userId: reportingUser._id,
      userEmail: reportingUser.email,
      userName: reportingUser.name,
      action: 'REPORT_SUBMITTED',
      description: `User submitted a report for ${reportType}: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
      metadata: {
        reportId: report._id,
        reportType,
        listingId: listingId || null,
        listingUrl: listingUrl || null,
        priority,
        category
      },
      req
    });

    res.status(201).json({ 
      message: 'Report submitted successfully',
      reportId: report._id 
    });

  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's report history
router.get('/history/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const reports = await Report.find({ reportedBy: user._id })
      .populate('listingId', 'title location')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ reports });
  } catch (error) {
    console.error('Error fetching report history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
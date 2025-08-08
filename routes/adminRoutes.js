import express from 'express';
import User from '../models/user.models.js';
import FlatListing from '../models/flatListing.models.js';
import FlatmateProfile from '../models/FlatmateProfile.js';
import Booking from '../models/booking.models.js';
import ConnectionRequest from '../models/connectionRequest.models.js';
import Report from '../models/report.models.js';
import ActivityLog from '../models/activityLog.models.js';
import LoggingService from '../services/loggingService.js';
import { adminOnly } from '../middlewares/adminAuth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard-stats', adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalFlats = await FlatListing.countDocuments();
    const totalFlatmates = await FlatmateProfile.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalReports = await Report.countDocuments();
    const pendingConnections = await ConnectionRequest.countDocuments({ status: 'pending' });
    const totalActivities = await ActivityLog.countDocuments();

    // Recent activity
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    const recentBookings = await Booking.find()
      .populate('flatId', 'title')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Monthly stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersThisMonth = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    const newFlatsThisMonth = await FlatListing.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    const newBookingsThisMonth = await Booking.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    const activitiesThisMonth = await ActivityLog.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Booking status breakdown
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });

    // Get activity stats
    const activityStats = await LoggingService.getActivityStats(30);
    const recentActivities = await LoggingService.getRecentActivities(10);

    // User role breakdown
    const adminCount = await User.countDocuments({ role: 'admin' });
    const regularUserCount = await User.countDocuments({ role: 'user' });

    res.json({
      totalStats: {
        totalUsers,
        totalFlats,
        totalFlatmates,
        totalBookings,
        totalReports,
        pendingConnections,
        totalActivities,
        adminCount,
        regularUserCount
      },
      monthlyStats: {
        newUsersThisMonth,
        newFlatsThisMonth,
        newBookingsThisMonth,
        activitiesThisMonth
      },
      bookingStats: {
        confirmed: confirmedBookings,
        pending: pendingBookings,
        cancelled: cancelledBookings
      },
      recentActivity: {
        recentUsers: recentUsers.map(user => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        })),
        recentBookings,
        recentActivities
      },
      activityStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users with pagination
router.get('/users', adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password')
      .populate('connections', 'name email');

    const totalUsers = await User.countDocuments(searchQuery);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get activity logs with pagination
router.get('/activity-logs', adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const action = req.query.action || '';
    const userId = req.query.userId || '';

    let searchQuery = {};
    if (action) searchQuery.action = action;
    if (userId) searchQuery.userId = userId;

    const activities = await ActivityLog.find(searchQuery)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalActivities = await ActivityLog.countDocuments(searchQuery);

    res.json({
      activities,
      pagination: {
        page,
        limit,
        total: totalActivities,
        pages: Math.ceil(totalActivities / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get system metrics
router.get('/system-metrics', adminOnly, async (req, res) => {
  try {
    const activityStats = await LoggingService.getActivityStats(30);
    const hourlyData = await LoggingService.getHourlyActivityData(7);
    
    // User growth over time
    const userGrowth = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const count = await User.countDocuments({
        createdAt: { $gte: startOfDay, $lt: endOfDay }
      });
      
      userGrowth.push({
        date: startOfDay.toISOString().split('T')[0],
        count
      });
    }

    // Most active users (by activity logs)
    const activeUsers = await ActivityLog.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$userId',
          activityCount: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $sort: { activityCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          role: '$user.role',
          activityCount: 1,
          lastActivity: 1
        }
      }
    ]);

    res.json({
      activityStats,
      hourlyData,
      userGrowth,
      activeUsers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all flat listings with pagination
router.get('/flats', adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const searchQuery = search ? {
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { ownerEmail: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const flats = await FlatListing.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalFlats = await FlatListing.countDocuments(searchQuery);

    res.json({
      flats,
      pagination: {
        page,
        limit,
        total: totalFlats,
        pages: Math.ceil(totalFlats / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all bookings with pagination
router.get('/bookings', adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || '';

    const searchQuery = status ? { status } : {};

    const bookings = await Booking.find(searchQuery)
      .populate('flatId', 'title location rent')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBookings = await Booking.countDocuments(searchQuery);

    res.json({
      bookings,
      pagination: {
        page,
        limit,
        total: totalBookings,
        pages: Math.ceil(totalBookings / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all reports with pagination
router.get('/reports', adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || '';

    const searchQuery = status ? { status } : {};

    const reports = await Report.find(searchQuery)
      .populate('reportedBy', 'name email')
      .populate('listingId', 'title location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReports = await Report.countDocuments(searchQuery);

    res.json({
      reports,
      pagination: {
        page,
        limit,
        total: totalReports,
        pages: Math.ceil(totalReports / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user role
router.put('/users/:id/role', adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be user or admin.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Log the activity
    await LoggingService.logActivity({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: req.user.name,
      action: role === 'admin' ? 'ADMIN_USER_PROMOTED' : 'ADMIN_USER_DEMOTED',
      description: `${role === 'admin' ? 'Promoted' : 'Demoted'} user ${user.name} (${user.email}) ${role === 'admin' ? 'to admin' : 'to regular user'}`,
      metadata: {
        targetUserId: user._id,
        targetUserEmail: user.email,
        oldRole,
        newRole: role
      },
      req
    });

    res.json({ message: 'User role updated successfully', user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }});
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent admins from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account.' });
    }

    // Log the activity before deletion
    await LoggingService.logActivity({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: req.user.name,
      action: 'ADMIN_USER_DELETED',
      description: `Deleted user ${user.name} (${user.email})`,
      metadata: {
        deletedUserId: user._id,
        deletedUserEmail: user.email,
        deletedUserName: user.name,
        deletedUserRole: user.role
      },
      req
    });

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    // Also delete related data
    await FlatmateProfile.findOneAndDelete({ userId: req.params.id });
    await FlatListing.deleteMany({ ownerEmail: user.email });
    await Booking.deleteMany({ visitorEmail: user.email });
    await ConnectionRequest.deleteMany({
      $or: [{ fromUser: req.params.id }, { toUser: req.params.id }]
    });

    res.json({ message: 'User and related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete flat listing
router.delete('/flats/:id', adminOnly, async (req, res) => {
  try {
    const flat = await FlatListing.findByIdAndDelete(req.params.id);
    
    if (!flat) {
      return res.status(404).json({ message: 'Flat listing not found.' });
    }

    // Delete related bookings
    await Booking.deleteMany({ flatId: req.params.id });

    res.json({ message: 'Flat listing and related bookings deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update booking status
router.put('/bookings/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('flatId', 'title').populate('userId', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    res.json({ message: 'Booking status updated successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get analytics data
router.get('/analytics', adminOnly, async (req, res) => {
  try {
    // User registration trend (last 12 months)
    const months = [];
    const userCounts = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const count = await User.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      userCounts.push(count);
    }

    // Booking trend (last 12 months)
    const bookingCounts = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const count = await Booking.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      bookingCounts.push(count);
    }

    // Top locations
    const topLocations = await FlatListing.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      userTrend: {
        months,
        data: userCounts
      },
      bookingTrend: {
        months,
        data: bookingCounts
      },
      topLocations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update report status
router.put('/reports/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be pending, reviewed, resolved, or dismissed.' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    const oldStatus = report.status;
    report.status = status;
    await report.save();

    // Log the activity
    await LoggingService.logActivity({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: req.user.name,
      action: 'ADMIN_REPORT_STATUS_UPDATED',
      description: `Updated report status from ${oldStatus} to ${status}`,
      metadata: {
        reportId: report._id,
        oldStatus,
        newStatus: status,
        reportReason: report.reason
      },
      req
    });

    res.json({ message: 'Report status updated successfully', report });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

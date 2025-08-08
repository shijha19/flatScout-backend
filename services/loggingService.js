import ActivityLog from '../models/activityLog.models.js';

class LoggingService {
  static async logActivity({
    userId,
    userEmail,
    userName,
    action,
    description,
    metadata = {},
    req = null
  }) {
    try {
      const logData = {
        userId,
        userEmail,
        userName,
        action,
        description,
        metadata,
      };

      // Add request information if available
      if (req) {
        logData.ipAddress = req.ip || req.connection?.remoteAddress || '';
        logData.userAgent = req.get('User-Agent') || '';
      }

      const log = new ActivityLog(logData);
      await log.save();
      
      console.log(`[ACTIVITY LOG] ${action}: ${description}`);
      return log;
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  static async getUserActivities(userId, limit = 50) {
    try {
      return await ActivityLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }
  }

  static async getRecentActivities(limit = 100, filter = {}) {
    try {
      const query = { ...filter };
      return await ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name email role')
        .lean();
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  static async getActivityStats(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await ActivityLog.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      return [];
    }
  }

  static async getHourlyActivityData(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const hourlyData = await ActivityLog.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
              hour: { $hour: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
        }
      ]);

      return hourlyData;
    } catch (error) {
      console.error('Error fetching hourly activity data:', error);
      return [];
    }
  }
}

export default LoggingService;

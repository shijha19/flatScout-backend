# Admin Dashboard Documentation

## Overview

The FlatScout Admin Dashboard provides comprehensive administration tools for managing the platform. It includes user management, activity monitoring, system metrics, and logging capabilities.

## Features

### 1. Dashboard Overview
- **Total Statistics**: Users, flats, bookings, reports, admin count
- **Monthly Growth**: New users, flats, bookings, and activities
- **Recent Activity**: Latest user actions and system events
- **Activity Breakdown**: Visual representation of platform activity

### 2. User Management
- **View All Users**: Paginated list with search functionality
- **Promote/Demote Admins**: Convert users to admins and vice versa
- **Delete Users**: Remove users and all associated data
- **User Details**: View registration date, role, and activity

### 3. Activity Logs
- **Comprehensive Logging**: All user actions are tracked
- **Filter by Action**: Filter logs by specific activity types
- **Detailed Information**: User details, timestamps, and metadata
- **Pagination**: Handle large volumes of log data

### 4. System Metrics
- **Activity Statistics**: Breakdown of actions over the last 30 days
- **Most Active Users**: Users with highest activity counts
- **User Growth Trends**: Registration patterns over time
- **Hourly Activity Data**: Peak usage times and patterns

## Logged Activities

The system automatically logs the following activities:

### User Activities
- `USER_REGISTERED` - New user registration
- `USER_LOGIN` - User login
- `USER_LOGOUT` - User logout
- `USER_PROFILE_UPDATED` - Profile changes
- `USER_PASSWORD_CHANGED` - Password changes

### Flat Activities
- `FLAT_CREATED` - New flat listing created
- `FLAT_UPDATED` - Flat listing modified
- `FLAT_DELETED` - Flat listing removed
- `FLAT_VIEWED` - Flat listing viewed

### Booking Activities
- `BOOKING_CREATED` - New booking request
- `BOOKING_CONFIRMED` - Booking confirmed
- `BOOKING_CANCELLED` - Booking cancelled

### Connection Activities
- `CONNECTION_REQUEST_SENT` - Connection request sent
- `CONNECTION_REQUEST_ACCEPTED` - Connection request accepted
- `CONNECTION_REQUEST_DECLINED` - Connection request declined

### Admin Activities
- `ADMIN_USER_PROMOTED` - User promoted to admin
- `ADMIN_USER_DEMOTED` - User demoted to regular user
- `ADMIN_USER_DELETED` - User deleted by admin
- `ADMIN_FLAT_DELETED` - Flat deleted by admin
- `ADMIN_REPORT_HANDLED` - Report processed by admin

### Other Activities
- `MESSAGE_SENT` - Chat message sent
- `CHAT_STARTED` - New chat conversation
- `FLATMATE_PROFILE_CREATED` - Flatmate profile created
- `FLATMATE_PROFILE_UPDATED` - Flatmate profile updated
- `REPORT_SUBMITTED` - New report submitted
- `REPORT_RESOLVED` - Report resolved

## Admin Setup

### Initial Admin Creation

1. Register a user account through the normal signup process
2. Navigate to `/admin-setup.html` on your backend server
3. Enter the user's email address
4. Click "Make Admin" to promote the user

**Example**: If your backend runs on `http://localhost:5000`, visit `http://localhost:5000/admin-setup.html`

### Accessing the Admin Dashboard

1. Log in with an admin account
2. Click on your profile dropdown in the navbar
3. Select "Admin Dashboard"
4. The dashboard will only appear for users with admin role

## API Endpoints

### Dashboard Statistics
- `GET /api/admin/dashboard-stats` - Get overview statistics

### User Management
- `GET /api/admin/users` - Get paginated user list
- `PUT /api/admin/users/:id/role` - Update user role
- `DELETE /api/admin/users/:id` - Delete user

### Activity Logs
- `GET /api/admin/activity-logs` - Get paginated activity logs

### System Metrics
- `GET /api/admin/system-metrics` - Get detailed system metrics

### Analytics
- `GET /api/admin/analytics` - Get analytics data (existing endpoint)

## Security

- All admin endpoints require authentication and admin role verification
- Admin middleware checks user role before allowing access
- Activity logs include IP addresses and user agents for security auditing
- Admin users cannot delete themselves to prevent lockout

## Database Models

### ActivityLog Schema
```javascript
{
  userId: ObjectId,          // User who performed the action
  userEmail: String,         // User's email
  userName: String,          // User's name
  action: String,            // Action type (enum)
  description: String,       // Human-readable description
  metadata: Mixed,           // Additional data
  ipAddress: String,         // User's IP address
  userAgent: String,         // User's browser/device info
  createdAt: Date           // Timestamp
}
```

## Usage Examples

### Promoting a User to Admin
```javascript
// Frontend call
const response = await fetch(`/api/admin/users/${userId}/role`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    role: 'admin',
    userEmail: currentAdminEmail 
  })
});
```

### Fetching Activity Logs
```javascript
// Get recent activities with filters
const response = await fetch(
  `/api/admin/activity-logs?page=1&limit=20&action=USER_LOGIN&userEmail=${adminEmail}`
);
```

### Getting System Metrics
```javascript
// Get comprehensive system metrics
const response = await fetch(`/api/admin/system-metrics?userEmail=${adminEmail}`);
```

## Frontend Components

### AdminDashboard Component
Located at: `frontend/src/pages/AdminReportDashboard.jsx`

Features:
- Tabbed interface for different admin functions
- Real-time statistics and metrics
- Responsive design with mobile support
- Search and filter capabilities
- Pagination for large datasets

### AdminProtectedRoute Component
Located at: `frontend/src/components/AdminProtectedRoute.jsx`

Features:
- Checks admin status before rendering
- Redirects non-admin users
- Loading states during verification

## Environment Setup

Ensure these environment variables are set:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## Troubleshooting

### Common Issues

1. **Admin Dashboard not visible**: Ensure user has admin role in database
2. **Activity logs empty**: Check that LoggingService is properly imported in routes
3. **Permission denied**: Verify admin middleware is working correctly
4. **Database connection**: Ensure MongoDB is running and accessible

### Debugging

Enable debug logging by setting:
```env
DEBUG=flatscout:*
```

Check browser console and server logs for detailed error information.

## Future Enhancements

Potential improvements:
- Real-time dashboard updates with WebSocket
- Email notifications for admin activities
- Bulk user operations
- Advanced analytics and reporting
- Export functionality for logs and data
- Role-based permissions (super admin, moderator, etc.)
- Audit trail for admin actions

## Contributing

When adding new activities:

1. Add the activity type to the enum in `ActivityLog` model
2. Import `LoggingService` in relevant route files
3. Call `LoggingService.logActivity()` with appropriate metadata
4. Update this documentation with the new activity type

Example:
```javascript
await LoggingService.logActivity({
  userId: user._id,
  userEmail: user.email,
  userName: user.name,
  action: 'NEW_ACTIVITY_TYPE',
  description: 'Description of what happened',
  metadata: { /* relevant data */ },
  req
});
```

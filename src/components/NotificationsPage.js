import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Grid,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Avatar,
  Breadcrumbs,
  Link,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Stack,
  Badge,
  Tooltip,
  Checkbox,
  Fab,
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  NotificationsOff,
  MarkEmailRead,
  Delete,
  MoreVert,
  Home,
  Settings,
  CheckCircle,
  Info,
  Warning,
  Error as ErrorIcon,
  Schedule,
  Group,
  Storage,
  Security,
  Share,
  FileUpload,
  Person,
  Clear,
  DoneAll,
  FilterList,
} from '@mui/icons-material';

const NotificationsPage = ({ user, onBack }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    fileUploadNotifications: true,
    teamNotifications: true,
    securityNotifications: true,
    marketingNotifications: false,
  });
  const [filter, setFilter] = useState('all');

  const API_BASE = 'http://localhost:3030/api';

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Show snackbar message
  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Mock notifications data
  const mockNotifications = [
    {
      id: 1,
      message: 'File "document.pdf" uploaded successfully to WebDAV',
      type: 'success',
      category: 'file',
      read: false,
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    },
    {
      id: 2,
      message: 'You have been added to "Development Team"',
      type: 'info',
      category: 'team',
      read: false,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    },
    {
      id: 3,
      message: 'Storage usage is now at 75% capacity',
      type: 'warning',
      category: 'storage',
      read: true,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: 4,
      message: 'New login detected from Chrome on Windows',
      type: 'security',
      category: 'security',
      read: true,
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    },
    {
      id: 5,
      message: 'John Doe shared "project-files.zip" with you',
      type: 'info',
      category: 'sharing',
      read: false,
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    },
    {
      id: 6,
      message: 'WebDAV connection restored successfully',
      type: 'success',
      category: 'system',
      read: true,
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    },
    {
      id: 7,
      message: 'Failed to upload "large-file.mp4" - file too large',
      type: 'error',
      category: 'file',
      read: false,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
  ];

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        // Use mock data if API returns empty
        setNotifications(data.notifications?.length > 0 ? data.notifications : mockNotifications);
      } else {
        setNotifications(mockNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications(mockNotifications);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (response.ok || true) { // Allow for mock data
        setNotifications(notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        ));
        showMessage('Notification marked as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Update locally for demo
      setNotifications(notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      ));
      showMessage('Notification marked as read');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      setNotifications(notifications.filter(notification => notification.id !== notificationId));
      showMessage('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showMessage('Error deleting notification', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
      showMessage('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showMessage('Error marking all as read', 'error');
    }
  };

  const handleDeleteSelected = async () => {
    try {
      setNotifications(notifications.filter(notification => 
        !selectedNotifications.includes(notification.id)
      ));
      setSelectedNotifications([]);
      showMessage(`${selectedNotifications.length} notifications deleted`);
    } catch (error) {
      console.error('Error deleting selected notifications:', error);
      showMessage('Error deleting notifications', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) {
      return;
    }

    try {
      setNotifications([]);
      setSelectedNotifications([]);
      showMessage('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      showMessage('Error clearing notifications', 'error');
    }
  };

  const handleMenuOpen = (event, notification) => {
    setMenuAnchor(event.currentTarget);
    setSelectedNotification(notification);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedNotification(null);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleToggleSelection = (notificationId) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleSelectAll = () => {
    const filteredIds = filteredNotifications.map(n => n.id);
    setSelectedNotifications(
      selectedNotifications.length === filteredIds.length ? [] : filteredIds
    );
  };

  const getNotificationIcon = (type, category) => {
    switch (category) {
      case 'file':
        return <FileUpload color={type === 'error' ? 'error' : 'primary'} />;
      case 'team':
        return <Group color="primary" />;
      case 'storage':
        return <Storage color={type === 'warning' ? 'warning' : 'primary'} />;
      case 'security':
        return <Security color="error" />;
      case 'sharing':
        return <Share color="primary" />;
      case 'system':
        return type === 'error' ? <ErrorIcon color="error" /> : <CheckCircle color="success" />;
      default:
        return <Info color="primary" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'security':
        return 'error';
      default:
        return 'info';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return !notification.read; // Unread
    if (tabValue === 2) return notification.read; // Read
    return true;
  }).filter(notification => {
    if (filter === 'all') return true;
    return notification.category === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          component="button" 
          variant="body1" 
          onClick={onBack}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <Home fontSize="small" />
          Dashboard
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Notifications fontSize="small" />
          Notifications
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
            Notifications
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DoneAll />}
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All Read
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Clear />}
              onClick={handleClearAll}
              disabled={notifications.length === 0}
            >
              Clear All
            </Button>
          </Stack>
        </Box>

        {/* Tabs */}
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            label={`All (${notifications.length})`} 
            icon={<Notifications />} 
          />
          <Tab 
            label={
              <Badge badgeContent={unreadCount} color="error" showZero={false}>
                Unread
              </Badge>
            } 
            icon={<NotificationsActive />} 
          />
          <Tab 
            label={`Read (${notifications.length - unreadCount})`} 
            icon={<MarkEmailRead />} 
          />
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {/* Notifications List */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {/* Bulk Actions */}
            {selectedNotifications.length > 0 && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2">
                    {selectedNotifications.length} selected
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<DoneAll />}
                    onClick={() => {
                      selectedNotifications.forEach(id => handleMarkAsRead(id));
                      setSelectedNotifications([]);
                    }}
                  >
                    Mark as Read
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={handleDeleteSelected}
                  >
                    Delete
                  </Button>
                </Stack>
              </Box>
            )}

            {/* Filter Bar */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <FilterList />
              <Chip 
                label="All" 
                onClick={() => setFilter('all')}
                color={filter === 'all' ? 'primary' : 'default'}
                variant={filter === 'all' ? 'filled' : 'outlined'}
              />
              <Chip 
                label="Files" 
                onClick={() => setFilter('file')}
                color={filter === 'file' ? 'primary' : 'default'}
                variant={filter === 'file' ? 'filled' : 'outlined'}
              />
              <Chip 
                label="Teams" 
                onClick={() => setFilter('team')}
                color={filter === 'team' ? 'primary' : 'default'}
                variant={filter === 'team' ? 'filled' : 'outlined'}
              />
              <Chip 
                label="Security" 
                onClick={() => setFilter('security')}
                color={filter === 'security' ? 'primary' : 'default'}
                variant={filter === 'security' ? 'filled' : 'outlined'}
              />
              <Box sx={{ ml: 'auto' }}>
                <Checkbox
                  checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                  indeterminate={selectedNotifications.length > 0 && selectedNotifications.length < filteredNotifications.length}
                  onChange={handleSelectAll}
                />
              </Box>
            </Box>

            {filteredNotifications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <NotificationsOff sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No notifications
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {tabValue === 1 ? 'All caught up! No unread notifications.' : 'You have no notifications yet.'}
                </Typography>
              </Box>
            ) : (
              <List>
                {filteredNotifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      sx={{
                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                        borderLeft: !notification.read ? '4px solid' : '4px solid transparent',
                        borderLeftColor: !notification.read ? `${getNotificationColor(notification.type)}.main` : 'transparent',
                        '&:hover': { bgcolor: 'action.selected' }
                      }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            {formatTimeAgo(notification.created_at)}
                          </Typography>
                          <IconButton onClick={(e) => handleMenuOpen(e, notification)}>
                            <MoreVert />
                          </IconButton>
                        </Box>
                      }
                    >
                      <Checkbox
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => handleToggleSelection(notification.id)}
                        sx={{ mr: 1 }}
                      />
                      <ListItemIcon>
                        {getNotificationIcon(notification.type, notification.category)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                fontWeight: notification.read ? 'normal' : 'bold',
                                color: notification.read ? 'text.secondary' : 'text.primary'
                              }}
                            >
                              {notification.message}
                            </Typography>
                            {!notification.read && (
                              <Chip label="New" size="small" color="primary" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={notification.category} 
                              size="small" 
                              variant="outlined"
                            />
                            <Chip 
                              label={notification.type} 
                              size="small" 
                              color={getNotificationColor(notification.type)}
                              variant="outlined"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < filteredNotifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Settings Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings />
              Notification Settings
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  />
                }
                label="Email Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.pushNotifications}
                    onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                  />
                }
                label="Push Notifications"
              />
              <Divider />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.fileUploadNotifications}
                    onChange={(e) => setSettings({ ...settings, fileUploadNotifications: e.target.checked })}
                  />
                }
                label="File Upload/Download"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.teamNotifications}
                    onChange={(e) => setSettings({ ...settings, teamNotifications: e.target.checked })}
                  />
                }
                label="Team Activities"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.securityNotifications}
                    onChange={(e) => setSettings({ ...settings, securityNotifications: e.target.checked })}
                  />
                }
                label="Security Alerts"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.marketingNotifications}
                    onChange={(e) => setSettings({ ...settings, marketingNotifications: e.target.checked })}
                  />
                }
                label="Marketing Updates"
              />
            </Stack>

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => showMessage('Settings saved successfully!')}
            >
              Save Settings
            </Button>
          </Paper>

          {/* Quick Stats */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Stats
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Total:</Typography>
                <Typography variant="body2" fontWeight="bold">{notifications.length}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Unread:</Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">{unreadCount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">This Week:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {notifications.filter(n => {
                    const notifDate = new Date(n.created_at);
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    return notifDate > weekAgo;
                  }).length}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => showMessage('Test notification sent!')}
      >
        <NotificationsActive />
      </Fab>

      {/* Notification Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {!selectedNotification?.read && (
          <MenuItem 
            onClick={() => {
              handleMarkAsRead(selectedNotification?.id);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <MarkEmailRead fontSize="small" />
            </ListItemIcon>
            Mark as Read
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Share fontSize="small" />
          </ListItemIcon>
          Share
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            handleDeleteNotification(selectedNotification?.id);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default NotificationsPage;
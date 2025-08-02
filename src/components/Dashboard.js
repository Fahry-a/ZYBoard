// src/components/Dashboard.js - Complete updated version
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Paper,
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Drawer,
  Card,
  CardContent,
  Avatar,
  Stack,
  Chip,
  TextField,
  LinearProgress,
  Menu,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  ListItemButton,
} from '@mui/material';
import Badge from '@mui/material/Badge';
import {
  Menu as MenuIcon,
  LightMode,
  DarkMode,
  Logout,
  Person,
  Settings,
  Notifications,
  Dashboard as DashboardIcon,
  Storage,
  Group,
  BarChart,
  Refresh,
  CloudQueue,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { ColorModeContext } from '../App';
import StoragePage from './StoragePage';
import TeamsPage from './TeamsPage';
import NotificationsPage from './NotificationsPage';

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [storageInfo, setStorageInfo] = useState({ totalSpace: 0, usedSpace: 0, availableSpace: 0 });
  const [recentActivities, setRecentActivities] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [refreshing, setRefreshing] = useState(false);

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

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/user/profile`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        setUser(data);
        
        // Fetch all data only for dashboard page
        if (currentPage === 'dashboard') {
          await fetchAllData();
        }
        
      } catch (err) {
        console.error('Auth error:', err);
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, currentPage]);

  // Fetch all dashboard data
  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchFiles(),
        fetchNotifications(),
        fetchStorageInfo(),
        fetchRecentActivities(),
        fetchTeamMembers(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('Error loading dashboard data', 'error');
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${API_BASE}/files`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchStorageInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/storage/info`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setStorageInfo(data);
      }
    } catch (error) {
      console.error('Error fetching storage info:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await fetch(`${API_BASE}/activities`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setRecentActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${API_BASE}/team/members`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    if (currentPage === 'dashboard') {
      await fetchAllData();
    }
    setRefreshing(false);
    showMessage('Dashboard refreshed!');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Navigation
  const handleNavigation = (page) => {
    setCurrentPage(page);
    setDrawerOpen(false);
  };

  // Calculate storage percentage
  const storagePercentage = storageInfo.totalSpace > 0 
    ? (storageInfo.usedSpace / storageInfo.totalSpace) * 100 
    : 0;

  // Get unread notifications count
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const drawerContent = (
    <Box sx={{ width: 250 }}>
      <List>
        <ListItemButton 
          selected={currentPage === 'dashboard'}
          onClick={() => handleNavigation('dashboard')}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        <ListItemButton 
          selected={currentPage === 'storage'}
          onClick={() => handleNavigation('storage')}
        >
          <ListItemIcon>
            <Storage />
          </ListItemIcon>
          <ListItemText primary="Storage" />
        </ListItemButton>
        <ListItemButton 
          selected={currentPage === 'teams'}
          onClick={() => handleNavigation('teams')}
        >
          <ListItemIcon>
            <Group />
          </ListItemIcon>
          <ListItemText primary="Teams" />
        </ListItemButton>
        <ListItemButton 
          selected={currentPage === 'notifications'}
          onClick={() => handleNavigation('notifications')}
        >
          <ListItemIcon>
            <Badge badgeContent={unreadNotificationsCount} color="error">
              <Notifications />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Notifications" />
        </ListItemButton>
        <ListItemButton>
          <ListItemIcon>
            <BarChart />
          </ListItemIcon>
          <ListItemText primary="Analytics" />
        </ListItemButton>
      </List>
    </Box>
  );

  // Dashboard content component
  const DashboardContent = () => (
    <Container maxWidth="lg" sx={{ mt: 10, mb: 4 }}>
      <Grid container spacing={3}>
        {/* User Welcome Card */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56 }}>
                {user?.username?.[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h5" gutterBottom>
                  Welcome back, {user?.username || 'User'}!
                </Typography>
                <Typography color="textSecondary">
                  Email: {user?.email}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Member since: {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    icon={<CloudQueue />} 
                    label="WebDAV Storage Active" 
                    color="success" 
                    size="small" 
                  />
                  {unreadNotificationsCount > 0 && (
                    <Chip 
                      icon={<Notifications />} 
                      label={`${unreadNotificationsCount} unread`} 
                      color="error" 
                      size="small"
                      onClick={() => setCurrentPage('notifications')}
                      clickable
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setCurrentPage('storage')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Storage Usage
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {Math.round(storagePercentage)}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {formatFileSize(storageInfo.usedSpace)} used
                  </Typography>
                </Box>
                <Storage sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={storagePercentage} 
                sx={{ mt: 1 }}
                color={storagePercentage > 80 ? 'error' : 'primary'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setCurrentPage('storage')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Total Files
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {files.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    On WebDAV server
                  </Typography>
                </Box>
                <CloudQueue sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setCurrentPage('teams')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Team Members
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {teamMembers.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active collaborators
                  </Typography>
                </Box>
                <Group sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setCurrentPage('notifications')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Notifications
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {unreadNotificationsCount}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Unread messages
                  </Typography>
                </Box>
                <Badge badgeContent={unreadNotificationsCount} color="error">
                  <Notifications sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Access */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Storage />}
                  onClick={() => setCurrentPage('storage')}
                  sx={{ py: 2 }}
                >
                  Manage Storage
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Group />}
                  onClick={() => setCurrentPage('teams')}
                  sx={{ py: 2 }}
                >
                  Team Management
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Notifications />}
                  onClick={() => setCurrentPage('notifications')}
                  sx={{ py: 2 }}
                >
                  View Notifications
                  {unreadNotificationsCount > 0 && (
                    <Chip 
                      label={unreadNotificationsCount} 
                      size="small" 
                      color="error" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<BarChart />}
                  sx={{ py: 2 }}
                >
                  View Analytics
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Recent Files */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Recent Files ({files.length})
              </Typography>
              <Button
                variant="text"
                onClick={() => setCurrentPage('storage')}
                endIcon={<Storage />}
              >
                View All Files
              </Button>
            </Box>
            
            {files.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CloudQueue sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No files uploaded yet
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Start uploading files to your WebDAV storage
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setCurrentPage('storage')}
                  startIcon={<Storage />}
                >
                  Go to Storage
                </Button>
              </Box>
            ) : (
              <List>
                {files.slice(0, 5).map((file, index) => (
                  <React.Fragment key={file.id}>
                    <ListItem>
                      <ListItemIcon>
                        <CloudQueue color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={file.original_name}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="caption" color="textSecondary">
                              {formatFileSize(file.size)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {formatDate(file.created_at)}
                            </Typography>
                            <Chip label="WebDAV" size="small" color="primary" variant="outlined" />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < Math.min(files.length, 5) - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Recent Activity & Notifications */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Recent Notifications */}
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Badge badgeContent={unreadNotificationsCount} color="error">
                    <Notifications />
                  </Badge>
                  Recent Notifications
                </Typography>
                <Button
                  size="small"
                  onClick={() => setCurrentPage('notifications')}
                >
                  View All
                </Button>
              </Box>
              {notifications.length === 0 ? (
                <Typography color="textSecondary" variant="body2">
                  No notifications yet
                </Typography>
              ) : (
                <List dense>
                  {notifications.slice(0, 3).map((notification) => (
                    <ListItem key={notification.id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ 
                            fontWeight: notification.read ? 'normal' : 'bold',
                            color: notification.read ? 'text.secondary' : 'text.primary'
                          }}>
                            {notification.message}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                              {formatDate(notification.created_at)}
                            </Typography>
                            {!notification.read && (
                              <Chip label="New" size="small" color="primary" />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            {/* Recent Activity */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule />
                Recent Activity
              </Typography>
              {recentActivities.length === 0 ? (
                <Typography color="textSecondary" variant="body2">
                  No recent activity
                </Typography>
              ) : (
                <List dense>
                  {recentActivities.slice(0, 4).map((activity) => (
                    <ListItem key={activity.id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2">
                            {activity.action}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="textSecondary">
                            {formatDate(activity.created_at)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            {/* Team Members */}
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Group />
                  Team Members
                </Typography>
                <Button
                  size="small"
                  onClick={() => setCurrentPage('teams')}
                >
                  Manage
                </Button>
              </Box>
              {teamMembers.length === 0 ? (
                <Typography color="textSecondary" variant="body2">
                  No team members yet
                </Typography>
              ) : (
                <List dense>
                  {teamMembers.slice(0, 3).map((member) => (
                    <ListItem key={member.id} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {member.username?.[0]?.toUpperCase() || member.name?.[0]?.toUpperCase()}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2">
                            {member.username || member.name}
                          </Typography>
                        }
                        secondary={
                          <Chip label={member.role} size="small" variant="outlined" />
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ZYBoard - {
              currentPage === 'storage' ? 'Storage Management' : 
              currentPage === 'teams' ? 'Team Management' :
              currentPage === 'notifications' ? 'Notifications' :
              'Dashboard'
            }
          </Typography>
          
          {currentPage === 'dashboard' && (
            <TextField
              size="small"
              placeholder="Search..."
              sx={{ 
                mr: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 1,
                '& .MuiInputBase-input': { color: 'white' }
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}

          <IconButton color="inherit" onClick={handleRefresh} disabled={refreshing}>
            <Refresh />
          </IconButton>

          <IconButton 
            color="inherit"
            onClick={() => setCurrentPage('notifications')}
          >
            <Badge badgeContent={unreadNotificationsCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          <IconButton color="inherit" onClick={colorMode.toggleColorMode}>
            {theme.palette.mode === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
          
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <Person />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      {currentPage === 'storage' ? (
        <StoragePage user={user} onBack={() => setCurrentPage('dashboard')} />
      ) : currentPage === 'teams' ? (
        <TeamsPage user={user} onBack={() => setCurrentPage('dashboard')} />
      ) : currentPage === 'notifications' ? (
        <NotificationsPage user={user} onBack={() => setCurrentPage('dashboard')} />
      ) : (
        <DashboardContent />
      )}

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Snackbar for messages */}
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
    </Box>
  );
};

export default Dashboard;
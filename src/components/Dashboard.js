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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Menu,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import Badge from '@mui/material/Badge';
import {
  Menu as MenuIcon,
  LightMode,
  DarkMode,
  Folder,
  InsertDriveFile,
  Logout,
  CloudUpload,
  AddCircle,
  Delete,
  Edit,
  Share,
  Download,
  Person,
  Settings,
  Notifications,
  Dashboard as DashboardIcon,
  Storage,
  Group,
  BarChart,
  Refresh,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { ColorModeContext } from '../App';

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
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

  const getAuthHeadersForUpload = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
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
        
        // Fetch all data
        await fetchAllData();
        
      } catch (err) {
        console.error('Auth error:', err);
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

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

  // Fetch files from API
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
      showMessage('Error loading files', 'error');
    }
  };

  // Fetch notifications
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

  // Fetch storage info
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

  // Fetch recent activities
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

  // Fetch team members
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

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      showMessage('Please select a file', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          showMessage('File uploaded successfully!');
          setUploadDialog(false);
          setSelectedFile(null);
          fetchFiles(); // Refresh files list
          fetchStorageInfo(); // Refresh storage info
          fetchRecentActivities(); // Refresh activities
        } else {
          const response = JSON.parse(xhr.responseText);
          showMessage(response.message || 'Upload failed', 'error');
        }
        setUploading(false);
        setUploadProgress(0);
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        showMessage('Upload failed', 'error');
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', `${API_BASE}/files/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      showMessage('Upload failed', 'error');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        showMessage('File deleted successfully!');
        fetchFiles(); // Refresh files list
        fetchStorageInfo(); // Refresh storage info
        fetchRecentActivities(); // Refresh activities
      } else {
        const data = await response.json();
        showMessage(data.message || 'Delete failed', 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showMessage('Delete failed', 'error');
    }
  };

  // Handle file download
  const handleDownloadFile = (fileName, originalName) => {
    // Create download link
    const link = document.createElement('a');
    link.href = `${API_BASE}/files/download/${fileName}`;
    link.download = originalName;
    link.click();
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    showMessage('Dashboard refreshed!');
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        showMessage('File size must be less than 10MB', 'error');
        return;
      }
      setSelectedFile(file);
    }
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

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      fetchNotifications(); // Refresh notifications
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Filter files based on search query
  const filteredFiles = files.filter(file =>
    file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate storage percentage
  const storagePercentage = storageInfo.totalSpace > 0 
    ? (storageInfo.usedSpace / storageInfo.totalSpace) * 100 
    : 0;

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
        <ListItem button>
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <Storage />
          </ListItemIcon>
          <ListItemText primary="Storage" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <Group />
          </ListItemIcon>
          <ListItemText primary="Team" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <BarChart />
          </ListItemIcon>
          <ListItemText primary="Analytics" />
        </ListItem>
      </List>
    </Box>
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
            ZYBoard Dashboard
          </Typography>
          
          <TextField
            size="small"
            placeholder="Search files..."
            sx={{ 
              mr: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 1,
              '& .MuiInputBase-input': { color: 'white' }
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <IconButton color="inherit" onClick={handleRefresh} disabled={refreshing}>
            <Refresh />
          </IconButton>

          <IconButton color="inherit">
            <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
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
                    Welcome, {user?.username || 'User'}
                  </Typography>
                  <Typography color="textSecondary">
                    Email: {user?.email}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Member since: {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Storage Usage
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={storagePercentage} 
                  sx={{ mb: 1 }}
                  color={storagePercentage > 80 ? 'error' : 'primary'}
                />
                <Typography variant="body2" color="textSecondary">
                  {formatFileSize(storageInfo.usedSpace)} of {formatFileSize(storageInfo.totalSpace)} used
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatFileSize(storageInfo.availableSpace)} available
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Team Members
                </Typography>
                <Typography variant="h4">
                  {teamMembers.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Active collaborators
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Files
                </Typography>
                <Typography variant="h4">
                  {files.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Files uploaded
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Files Section */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Files ({filteredFiles.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => setUploadDialog(true)}
                >
                  Upload File
                </Button>
              </Box>
              
              {filteredFiles.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="textSecondary">
                    {searchQuery ? 'No files match your search' : 'No files uploaded yet'}
                  </Typography>
                </Box>
              ) : (
                <List>
                  {filteredFiles.map((file) => (
                    <React.Fragment key={file.id}>
                      <ListItem
                        secondaryAction={
                          <Stack direction="row" spacing={1}>
                            <IconButton 
                              size="small"
                              onClick={() => handleDownloadFile(file.filename, file.original_name)}
                            >
                              <Download />
                            </IconButton>
                            <IconButton size="small">
                              <Share />
                            </IconButton>
                            <IconButton 
                              size="small"
                              onClick={() => handleDeleteFile(file.id, file.original_name)}
                            >
                              <Delete />
                            </IconButton>
                          </Stack>
                        }
                      >
                        <ListItemIcon>
                          <InsertDriveFile />
                        </ListItemIcon>
                        <ListItemText 
                          primary={file.original_name}
                          secondary={`${formatFileSize(file.size)} • ${file.type} • ${formatDate(file.created_at)}`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              {recentActivities.length === 0 ? (
                <Typography color="textSecondary">No recent activity</Typography>
              ) : (
                <List>
                  {recentActivities.slice(0, 5).map((activity) => (
                    <ListItem key={activity.id}>
                      <ListItemText
                        primary={activity.action}
                        secondary={formatDate(activity.created_at)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Team Members */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Team Members
              </Typography>
              {teamMembers.length === 0 ? (
                <Typography color="textSecondary">No team members</Typography>
              ) : (
                <List>
                  {teamMembers.slice(0, 5).map((member) => (
                    <ListItem key={member.id}>
                      <ListItemIcon>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {member.username?.[0]?.toUpperCase() || member.name?.[0]?.toUpperCase()}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={member.username || member.name}
                        secondary={member.role}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => !uploading && setUploadDialog(false)}>
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, minWidth: 400 }}>
            <input
              type="file"
              onChange={handleFileSelect}
              style={{ marginBottom: 16, width: '100%' }}
              disabled={uploading}
            />
            {selectedFile && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Typography>
            )}
            {uploading && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Uploading... {Math.round(uploadProgress)}%
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || uploading}
            variant="contained"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

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
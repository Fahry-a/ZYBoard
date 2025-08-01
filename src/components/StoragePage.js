import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Grid,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Chip,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Menu,
  MenuItem,
  Tooltip,
  Fab,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Folder,
  Download,
  Delete,
  Share,
  Edit,
  MoreVert,
  Add,
  Search,
  ViewList,
  ViewModule,
  Sort,
  ArrowUpward,
  ArrowDownward,
  Refresh,
  Storage as StorageIcon,
  PieChart,
  Home,
} from '@mui/icons-material';

const StoragePage = ({ user, onBack }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState({ totalSpace: 0, usedSpace: 0, availableSpace: 0 });
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('list');
  const [filterType, setFilterType] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedFileData, setSelectedFileData] = useState(null);
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

  // Get file type icon
  const getFileIcon = (type) => {
    if (type.includes('image')) return '🖼️';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📄';
  };

  // Get file type category
  const getFileCategory = (type) => {
    if (type.includes('image')) return 'Images';
    if (type.includes('video')) return 'Videos';
    if (type.includes('audio')) return 'Audio';
    if (type.includes('pdf')) return 'Documents';
    if (type.includes('word') || type.includes('text')) return 'Documents';
    if (type.includes('excel') || type.includes('sheet')) return 'Spreadsheets';
    if (type.includes('zip') || type.includes('rar')) return 'Archives';
    return 'Other';
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchFiles(),
        fetchStorageInfo(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('Error loading storage data', 'error');
    } finally {
      setLoading(false);
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
      showMessage('Error loading files', 'error');
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

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          showMessage('File uploaded successfully to WebDAV!');
          setUploadDialog(false);
          setSelectedFile(null);
          fetchAllData();
        } else {
          const response = JSON.parse(xhr.responseText);
          showMessage(response.message || 'Upload failed', 'error');
        }
        setUploading(false);
        setUploadProgress(0);
      });

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
        showMessage('File deleted successfully from WebDAV!');
        fetchAllData();
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
    showMessage('Storage data refreshed!');
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showMessage('File size must be less than 10MB', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleMenuOpen = (event, file) => {
    setMenuAnchor(event.currentTarget);
    setSelectedFileData(file);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedFileData(null);
  };

  // Filter and sort files
  const filteredAndSortedFiles = files
    .filter(file => {
      const matchesSearch = file.original_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || getFileCategory(file.type).toLowerCase() === filterType.toLowerCase();
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.original_name.localeCompare(b.original_name);
          break;
        case 'size':
          compareValue = a.size - b.size;
          break;
        case 'type':
          compareValue = a.type.localeCompare(b.type);
          break;
        case 'date':
        default:
          compareValue = new Date(a.created_at) - new Date(b.created_at);
          break;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

  // Calculate storage percentage
  const storagePercentage = storageInfo.totalSpace > 0 
    ? (storageInfo.usedSpace / storageInfo.totalSpace) * 100 
    : 0;

  // Get storage by category
  const getStorageByCategory = () => {
    const categories = {};
    files.forEach(file => {
      const category = getFileCategory(file.type);
      if (!categories[category]) {
        categories[category] = { count: 0, size: 0 };
      }
      categories[category].count++;
      categories[category].size += file.size;
    });
    return categories;
  };

  const storageByCategory = getStorageByCategory();

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
          <StorageIcon fontSize="small" />
          Storage
        </Typography>
      </Breadcrumbs>

      <Grid container spacing={3}>
        {/* Storage Overview */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon />
                Storage Overview
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Space Usage
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={storagePercentage} 
                      sx={{ mb: 2, height: 8, borderRadius: 4 }}
                      color={storagePercentage > 80 ? 'error' : storagePercentage > 60 ? 'warning' : 'primary'}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Used: {formatFileSize(storageInfo.usedSpace)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total: {formatFileSize(storageInfo.totalSpace)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Available: {formatFileSize(storageInfo.availableSpace)} ({Math.round(100 - storagePercentage)}% free)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      File Statistics
                    </Typography>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Total Files:</Typography>
                        <Typography variant="body2" fontWeight="bold">{files.length}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Average Size:</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {files.length > 0 ? formatFileSize(storageInfo.usedSpace / files.length) : '0 Bytes'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Storage on:</Typography>
                        <Chip label="WebDAV" size="small" color="primary" />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Storage by Category */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PieChart />
              Storage by Category
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(storageByCategory).map(([category, data]) => (
                <Grid item xs={12} sm={6} md={3} key={category}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="primary">
                        {getFileIcon(category.toLowerCase())}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {category}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {data.count} files
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {formatFileSize(data.size)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Files Management */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Folder />
                Files ({filteredAndSortedFiles.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={() => setUploadDialog(true)}
              >
                Upload to WebDAV
              </Button>
            </Box>

            {/* Filters and Search */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ minWidth: 200 }}
              />
              
              <TextField
                select
                size="small"
                label="Category"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                sx={{ minWidth: 120 }}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="all">All Files</option>
                <option value="images">Images</option>
                <option value="videos">Videos</option>
                <option value="audio">Audio</option>
                <option value="documents">Documents</option>
                <option value="archives">Archives</option>
                <option value="other">Other</option>
              </TextField>

              <TextField
                select
                size="small"
                label="Sort by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                sx={{ minWidth: 120 }}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="type">Type</option>
              </TextField>

              <IconButton 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                color="primary"
              >
                {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
              </IconButton>

              <Box sx={{ display: 'flex', ml: 'auto' }}>
                <IconButton 
                  onClick={() => setViewMode('list')}
                  color={viewMode === 'list' ? 'primary' : 'default'}
                >
                  <ViewList />
                </IconButton>
                <IconButton 
                  onClick={() => setViewMode('grid')}
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                >
                  <ViewModule />
                </IconButton>
              </Box>
            </Box>

            {/* Files List */}
            {filteredAndSortedFiles.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <StorageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  {searchQuery || filterType !== 'all' ? 'No files match your criteria' : 'No files uploaded yet'}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  {searchQuery || filterType !== 'all' 
                    ? 'Try adjusting your search or filter criteria' 
                    : 'Upload your first file to WebDAV storage'}
                </Typography>
                {!searchQuery && filterType === 'all' && (
                  <Button
                    variant="contained"
                    startIcon={<CloudUpload />}
                    onClick={() => setUploadDialog(true)}
                  >
                    Upload File
                  </Button>
                )}
              </Box>
            ) : (
              <List>
                {filteredAndSortedFiles.map((file, index) => (
                  <React.Fragment key={file.id}>
                    <ListItem
                      secondaryAction={
                        <IconButton onClick={(e) => handleMenuOpen(e, file)}>
                          <MoreVert />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <Box sx={{ fontSize: '24px' }}>
                          {getFileIcon(file.type)}
                        </Box>
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {file.original_name}
                            </Typography>
                            <Chip 
                              label={getFileCategory(file.type)} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                            <Typography variant="body2" color="textSecondary">
                              {formatFileSize(file.size)}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {file.type}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {formatDate(file.created_at)}
                            </Typography>
                            <Chip label="WebDAV" size="small" color="primary" variant="outlined" />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < filteredAndSortedFiles.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setUploadDialog(true)}
      >
        <Add />
      </Fab>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => !uploading && setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload File to WebDAV</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <input
              type="file"
              onChange={handleFileSelect}
              style={{ marginBottom: 16, width: '100%' }}
              disabled={uploading}
            />
            {selectedFile && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Selected:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </Typography>
                <Typography variant="body2">
                  <strong>Destination:</strong> WebDAV Server - /cloud/user_{user?.id}/
                </Typography>
              </Alert>
            )}
            {uploading && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Uploading to WebDAV... {Math.round(uploadProgress)}%
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
            {uploading ? 'Uploading...' : 'Upload to WebDAV'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          onClick={() => {
            handleDownloadFile(selectedFileData?.filename, selectedFileData?.original_name);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          Download
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Share fontSize="small" />
          </ListItemIcon>
          Share
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          Rename
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            handleDeleteFile(selectedFileData?.id, selectedFileData?.original_name);
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

export default StoragePage;
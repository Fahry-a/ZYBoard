import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import DatabaseFactory from './config/database-factory.js';
import webdavService from './services/webdavService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize database adapter
const db = DatabaseFactory.create(process.env.DB_TYPE || 'supabase');

// Middleware
app.use(cors());
app.use(express.json());

// Memory storage for multer (we'll upload to WebDAV instead of disk)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar|mp4|mp3|xlsx|xls|pptx|ppt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only specific file types are allowed'));
    }
  }
});

// Test database and WebDAV connections
const testConnections = async () => {
    try {
        const dbConnected = await db.testConnection();
        const dbInfo = db.getConnectionInfo();
        
        if (dbConnected) {
            console.log(`✅ Database (${dbInfo.type}) connected successfully`);
        } else {
            console.log(`❌ Database (${dbInfo.type}) connection failed`);
        }
        
        const webdavConnected = await webdavService.checkConnection();
        if (webdavConnected) {
            console.log('✅ WebDAV connected successfully');
        } else {
            console.log('❌ WebDAV connection failed');
        }
        
        return dbConnected && webdavConnected;
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        return false;
    }
};

// Authentication middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ message: err.message });
    }
    
    if (err.message === 'Only specific file types are allowed') {
        return res.status(400).json({ message: 'File type not allowed' });
    }
    
    res.status(500).json({ 
        message: 'Something broke!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

// Helper functions
const logActivity = async (userId, action, metadata = {}) => {
    try {
        await db.insertActivity(userId, action, metadata);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

const createNotification = async (userId, message, type = 'info', category = 'general') => {
    try {
        await db.insertNotification(userId, message, type, category);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if user exists
        const existingUsersByEmail = await db.findUserByEmail(email);
        if (existingUsersByEmail.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = await db.insertUser(username, email, hashedPassword);
        const userId = result.insertId;

        // For MySQL, we need to manually create storage allocation (Supabase handles it via trigger)
        if (db.type === 'mysql') {
            try {
                await db.insertStorage(userId, 1073741824, 0); // 1GB default
            } catch (storageError) {
                console.warn('Storage allocation creation warning:', storageError.message);
            }
        }

        const token = jwt.sign(
            { id: userId, username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await logActivity(userId, 'Account created');
        await createNotification(userId, 'Welcome to ZYBoard! Your account has been created successfully.', 'success', 'general');

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: userId,
                username,
                email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const users = await db.findUserByEmail(email);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await logActivity(user.id, 'User logged in');

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// File Routes with WebDAV Integration
app.post('/api/files/upload', verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Check storage limit
        let storage = await db.findStorageByUserId(req.user.id);

        if (storage.length === 0) {
            // Create default storage allocation
            await db.insertStorage(req.user.id, 1073741824, 0); // 1GB default
            storage = [{ total_space: 1073741824, used_space: 0 }];
        }

        const fileSize = req.file.size;
        const newUsedSpace = storage[0].used_space + fileSize;

        if (newUsedSpace > storage[0].total_space) {
            return res.status(400).json({ message: 'Storage limit exceeded' });
        }

        // Generate unique filename
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname);
        
        // Upload to WebDAV
        const webdavPath = await webdavService.uploadFile(req.user.id, uniqueName, req.file.buffer);

        // Update storage usage
        await db.updateStorageUsed(req.user.id, newUsedSpace);

        // Save file info to database
        const result = await db.insertFile(req.user.id, uniqueName, req.file.originalname, fileSize, req.file.mimetype, webdavPath);

        // Log activity and create notification
        await logActivity(req.user.id, `Uploaded file: ${req.file.originalname}`, {
            fileId: result.insertId,
            fileSize: fileSize,
            fileType: req.file.mimetype
        });
        
        await createNotification(
            req.user.id, 
            `File "${req.file.originalname}" uploaded successfully to WebDAV`, 
            'success', 
            'file'
        );

        res.status(201).json({
            message: 'File uploaded successfully',
            file: {
                id: result.insertId,
                filename: req.file.originalname,
                size: fileSize,
                type: req.file.mimetype
            }
        });
    } catch (error) {
        console.error('File upload error:', error);
        
        // Create error notification
        try {
            await createNotification(
                req.user.id, 
                `Failed to upload "${req.file?.originalname || 'file'}" - ${error.message}`, 
                'error', 
                'file'
            );
        } catch (notifError) {
            console.error('Error creating notification:', notifError);
        }
        
        res.status(500).json({ message: 'Error uploading file' });
    }
});

app.get('/api/files', verifyToken, async (req, res) => {
    try {
        const files = await db.findFilesByUserId(req.user.id);
        res.json({ files });
    } catch (error) {
        console.error('Files fetch error:', error);
        res.status(500).json({ message: 'Error fetching files' });
    }
});

app.get('/api/files/download/:filename', verifyToken, async (req, res) => {
    try {
        const files = await db.findFileByFilename(req.params.filename, req.user.id);

        if (files.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const file = files[0];
        
        // Download from WebDAV
        const fileBuffer = await webdavService.downloadFile(req.user.id, file.filename);

        // Log activity
        await logActivity(req.user.id, `Downloaded file: ${file.original_name}`, {
            fileId: file.id,
            fileName: file.original_name
        });

        // Set appropriate headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
        res.setHeader('Content-Type', file.type);
        res.setHeader('Content-Length', file.size);

        // Send the file buffer
        res.send(fileBuffer);
    } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({ message: 'Error downloading file' });
    }
});

app.delete('/api/files/:id', verifyToken, async (req, res) => {
    try {
        const files = await db.findFileById(req.params.id, req.user.id);

        if (files.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const fileData = files[0];

        // Delete from WebDAV
        try {
            await webdavService.deleteFile(req.user.id, fileData.filename);
        } catch (error) {
            console.warn('File not found on WebDAV:', fileData.filename);
        }

        // Update storage usage
        await db.decrementStorageUsed(req.user.id, fileData.size);

        // Delete database record
        await db.deleteFile(req.params.id);

        // Log activity and create notification
        await logActivity(req.user.id, `Deleted file: ${fileData.original_name}`, {
            fileId: fileData.id,
            fileName: fileData.original_name
        });
        
        await createNotification(
            req.user.id, 
            `File "${fileData.original_name}" deleted successfully`, 
            'info', 
            'file'
        );

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('File delete error:', error);
        res.status(500).json({ message: 'Error deleting file' });
    }
});

// Storage Routes
app.get('/api/storage/info', verifyToken, async (req, res) => {
    try {
        let storage = await db.findStorageByUserId(req.user.id);

        if (storage.length === 0) {
            await db.insertStorage(req.user.id, 1073741824, 0); // 1GB default
            storage = [{ total_space: 1073741824, used_space: 0 }];
        }

        res.json({
            totalSpace: storage[0].total_space,
            usedSpace: storage[0].used_space,
            availableSpace: storage[0].total_space - storage[0].used_space
        });
    } catch (error) {
        console.error('Storage info error:', error);
        res.status(500).json({ message: 'Error fetching storage info' });
    }
});

// Activity Routes
app.get('/api/activities', verifyToken, async (req, res) => {
    try {
        const activities = await db.findActivitiesByUserId(req.user.id, 20);
        res.json({ activities });
    } catch (error) {
        console.error('Activities fetch error:', error);
        res.status(500).json({ message: 'Error fetching activities' });
    }
});

// Team Routes
app.post('/api/teams', verifyToken, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Team name is required' });
        }

        const result = await db.insertTeam(name.trim(), description || '', req.user.id);

        // Add creator as admin
        await db.insertTeamMember(result.insertId, req.user.id, 'admin');

        // Log activity
        await logActivity(req.user.id, `Created team: ${name}`, {
            teamId: result.insertId,
            teamName: name
        });

        await createNotification(
            req.user.id,
            `Team "${name}" created successfully`,
            'success',
            'team'
        );

        res.status(201).json({
            message: 'Team created successfully',
            team: {
                id: result.insertId,
                name,
                description,
                created_by: req.user.id
            }
        });
    } catch (error) {
        console.error('Team creation error:', error);
        res.status(500).json({ message: 'Error creating team' });
    }
});

app.get('/api/teams', verifyToken, async (req, res) => {
    try {
        const teams = await db.findTeamsByUserId(req.user.id);
        res.json({ teams });
    } catch (error) {
        console.error('Teams fetch error:', error);
        res.status(500).json({ message: 'Error fetching teams' });
    }
});

app.get('/api/teams/members', verifyToken, async (req, res) => {
    try {
        const members = await db.findTeamMembersByUserId(req.user.id);
        res.json({ members });
    } catch (error) {
        console.error('Team members fetch error:', error);
        res.status(500).json({ message: 'Error fetching team members' });
    }
});

// Notifications Routes
app.get('/api/notifications', verifyToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0, unread_only = false } = req.query;
        
        const notifications = await db.findNotificationsByUserId(
            req.user.id, 
            unread_only === 'true', 
            parseInt(limit), 
            parseInt(offset)
        );

        // Get unread count
        const unreadCount = await db.countUnreadNotifications(req.user.id);

        res.json({ 
            notifications,
            unread_count: unreadCount,
            total: notifications.length
        });
    } catch (error) {
        console.error('Notifications fetch error:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

app.patch('/api/notifications/:id/read', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.markNotificationAsRead(id, req.user.id);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Notification update error:', error);
        res.status(500).json({ message: 'Error updating notification' });
    }
});

app.patch('/api/notifications/mark-all-read', verifyToken, async (req, res) => {
    try {
        await db.markAllNotificationsAsRead(req.user.id);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ message: 'Error marking all notifications as read' });
    }
});

app.delete('/api/notifications/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.deleteNotification(id, req.user.id);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Notification delete error:', error);
        res.status(500).json({ message: 'Error deleting notification' });
    }
});

app.delete('/api/notifications', verifyToken, async (req, res) => {
    try {
        await db.deleteAllNotifications(req.user.id);
        res.json({ message: 'All notifications deleted successfully' });
    } catch (error) {
        console.error('Delete all notifications error:', error);
        res.status(500).json({ message: 'Error deleting all notifications' });
    }
});

// User Profile Routes
app.get('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const users = await db.findUserById(req.user.id);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

// Statistics Routes
app.get('/api/user/stats', verifyToken, async (req, res) => {
    try {
        const stats = await db.getUserStats(req.user.id);
        
        if (!stats) {
            return res.status(404).json({ message: 'User stats not found' });
        }

        res.json(stats);
    } catch (error) {
        console.error('User stats error:', error);
        res.status(500).json({ message: 'Error fetching user statistics' });
    }
});

app.get('/api/user/file-types', verifyToken, async (req, res) => {
    try {
        const fileTypes = await db.getFileTypeStats(req.user.id);
        res.json({ file_types: fileTypes });
    } catch (error) {
        console.error('File types stats error:', error);
        res.status(500).json({ message: 'Error fetching file type statistics' });
    }
});

app.get('/api/user/activity-stats', verifyToken, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const activityStats = await db.getRecentActivity(req.user.id, parseInt(days));
        res.json({ activity_stats: activityStats });
    } catch (error) {
        console.error('Activity stats error:', error);
        res.status(500).json({ message: 'Error fetching activity statistics' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const dbStatus = await db.testConnection();
    const webdavStatus = await webdavService.checkConnection();
    const dbInfo = db.getConnectionInfo();
    
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
            type: dbInfo.type,
            status: dbStatus ? 'Connected' : 'Disconnected'
        },
        webdav: webdavStatus ? 'Connected' : 'Disconnected'
    });
});

// Database info endpoint
app.get('/api/database/info', async (req, res) => {
    const dbInfo = db.getConnectionInfo();
    res.json({
        database: {
            type: dbInfo.type,
            connected: await db.testConnection()
        }
    });
});

// Maintenance endpoints (optional)
app.post('/api/admin/cleanup/notifications', verifyToken, async (req, res) => {
    try {
        const { days = 30 } = req.body;
        const result = await db.cleanupOldNotifications(days);
        
        await logActivity(req.user.id, `Cleaned up old notifications (${result.deletedCount} deleted)`, {
            deletedCount: result.deletedCount,
            days: days
        });
        
        res.json({ 
            message: `Cleaned up ${result.deletedCount} old notifications`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Cleanup notifications error:', error);
        res.status(500).json({ message: 'Error cleaning up notifications' });
    }
});

app.post('/api/admin/cleanup/activities', verifyToken, async (req, res) => {
    try {
        const { days = 90 } = req.body;
        const result = await db.cleanupOldActivities(days);
        
        await logActivity(req.user.id, `Cleaned up old activities (${result.deletedCount} deleted)`, {
            deletedCount: result.deletedCount,
            days: days
        });
        
        res.json({ 
            message: `Cleaned up ${result.deletedCount} old activities`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Cleanup activities error:', error);
        res.status(500).json({ message: 'Error cleaning up activities' });
    }
});

// Apply error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT_BACKEND || 3030;

const startServer = async () => {
    const connectionsOk = await testConnections();

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🗄️ Database: ${db.getConnectionInfo().type}`);
        if (!connectionsOk) {
            console.warn('⚠️  Warning: Server running but some connections failed');
        }
    });
};

startServer();
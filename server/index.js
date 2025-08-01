const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');

dotenv.config();

const webdavService = require('./services/webdavService');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Memory storage for multer (we'll upload to WebDAV instead of disk)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar|mp4|mp3/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only specific file types are allowed'));
    }
  }
});

// Database configuration
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zyboard_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database and WebDAV connections
const testConnections = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        
        const webdavConnected = await webdavService.checkConnection();
        if (webdavConnected) {
            console.log('✅ WebDAV connected successfully');
        } else {
            console.log('❌ WebDAV connection failed');
        }
        
        return true;
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

// Auth Routes (unchanged)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const connection = await pool.getConnection();

        try {
            const [existingUsers] = await connection.execute(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, email]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({ message: 'Username or email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const [result] = await connection.execute(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hashedPassword]
            );

            await connection.execute(
                'INSERT INTO storage_allocation (user_id, total_space, used_space) VALUES (?, ?, ?)',
                [result.insertId, 1024 * 1024 * 1024, 0]
            );

            const token = jwt.sign(
                { id: result.insertId, username },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            await connection.execute(
                'INSERT INTO activities (user_id, action) VALUES (?, ?)',
                [result.insertId, 'Account created']
            );

            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: {
                    id: result.insertId,
                    username,
                    email
                }
            });
        } finally {
            connection.release();
        }
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

        const connection = await pool.getConnection();

        try {
            const [users] = await connection.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

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

            await connection.execute(
                'INSERT INTO activities (user_id, action) VALUES (?, ?)',
                [user.id, 'User logged in']
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        } finally {
            connection.release();
        }
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

        const connection = await pool.getConnection();

        try {
            // Check storage limit
            const [storage] = await connection.execute(
                'SELECT * FROM storage_allocation WHERE user_id = ?',
                [req.user.id]
            );

            if (storage.length === 0) {
                await connection.execute(
                    'INSERT INTO storage_allocation (user_id, total_space, used_space) VALUES (?, ?, ?)',
                    [req.user.id, 1024 * 1024 * 1024, 0]
                );
                storage.push({ total_space: 1024 * 1024 * 1024, used_space: 0 });
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
            await connection.execute(
                'UPDATE storage_allocation SET used_space = ? WHERE user_id = ?',
                [newUsedSpace, req.user.id]
            );

            // Save file info to database
            const [result] = await connection.execute(
                'INSERT INTO files (user_id, filename, original_name, size, type, path) VALUES (?, ?, ?, ?, ?, ?)',
                [req.user.id, uniqueName, req.file.originalname, fileSize, req.file.mimetype, webdavPath]
            );

            // Log activity
            await connection.execute(
                'INSERT INTO activities (user_id, action) VALUES (?, ?)',
                [req.user.id, `Uploaded file: ${req.file.originalname}`]
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
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ message: 'Error uploading file' });
    }
});

app.get('/api/files', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            const [files] = await connection.execute(
                'SELECT id, filename, original_name, size, type, created_at, updated_at FROM files WHERE user_id = ? ORDER BY created_at DESC',
                [req.user.id]
            );

            res.json({ files });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Files fetch error:', error);
        res.status(500).json({ message: 'Error fetching files' });
    }
});

app.get('/api/files/download/:filename', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            const [files] = await connection.execute(
                'SELECT * FROM files WHERE filename = ? AND user_id = ?',
                [req.params.filename, req.user.id]
            );

            if (files.length === 0) {
                return res.status(404).json({ message: 'File not found' });
            }

            const file = files[0];
            
            // Download from WebDAV
            const fileBuffer = await webdavService.downloadFile(req.user.id, file.filename);

            // Log activity
            await connection.execute(
                'INSERT INTO activities (user_id, action) VALUES (?, ?)',
                [req.user.id, `Downloaded file: ${file.original_name}`]
            );

            // Set appropriate headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
            res.setHeader('Content-Type', file.type);
            res.setHeader('Content-Length', file.size);

            // Send the file buffer
            res.send(fileBuffer);

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({ message: 'Error downloading file' });
    }
});

app.delete('/api/files/:id', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            const [file] = await connection.execute(
                'SELECT * FROM files WHERE id = ? AND user_id = ?',
                [req.params.id, req.user.id]
            );

            if (file.length === 0) {
                return res.status(404).json({ message: 'File not found' });
            }

            const fileData = file[0];

            // Delete from WebDAV
            try {
                await webdavService.deleteFile(req.user.id, fileData.filename);
            } catch (error) {
                console.warn('File not found on WebDAV:', fileData.filename);
            }

            // Update storage usage
            await connection.execute(
                'UPDATE storage_allocation SET used_space = used_space - ? WHERE user_id = ?',
                [fileData.size, req.user.id]
            );

            // Delete database record
            await connection.execute(
                'DELETE FROM files WHERE id = ?',
                [req.params.id]
            );

            // Log activity
            await connection.execute(
                'INSERT INTO activities (user_id, action) VALUES (?, ?)',
                [req.user.id, `Deleted file: ${fileData.original_name}`]
            );

            res.json({ message: 'File deleted successfully' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('File delete error:', error);
        res.status(500).json({ message: 'Error deleting file' });
    }
});

// Storage Routes (unchanged)
app.get('/api/storage/info', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            let [storage] = await connection.execute(
                'SELECT * FROM storage_allocation WHERE user_id = ?',
                [req.user.id]
            );

            if (storage.length === 0) {
                await connection.execute(
                    'INSERT INTO storage_allocation (user_id, total_space, used_space) VALUES (?, ?, ?)',
                    [req.user.id, 1024 * 1024 * 1024, 0]
                );
                storage = [{ total_space: 1024 * 1024 * 1024, used_space: 0 }];
            }

            res.json({
                totalSpace: storage[0].total_space,
                usedSpace: storage[0].used_space,
                availableSpace: storage[0].total_space - storage[0].used_space
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Storage info error:', error);
        res.status(500).json({ message: 'Error fetching storage info' });
    }
});

// Activity Routes (unchanged)
app.get('/api/activities', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            const [activities] = await connection.execute(
                'SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
                [req.user.id]
            );

            res.json({ activities });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Activities fetch error:', error);
        res.status(500).json({ message: 'Error fetching activities' });
    }
});

// Team Routes (unchanged)
app.get('/api/team/members', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            const [members] = await connection.execute(
                `SELECT u.id, u.username, u.email, tm.role 
                 FROM team_members tm 
                 JOIN users u ON tm.user_id = u.id 
                 WHERE tm.team_id IN (
                     SELECT team_id FROM team_members WHERE user_id = ?
                 )`,
                [req.user.id]
            );

            res.json({ members });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Team members fetch error:', error);
        res.status(500).json({ message: 'Error fetching team members' });
    }
});

// Notification Routes (unchanged)
app.get('/api/notifications', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            const [notifications] = await connection.execute(
                'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
                [req.user.id]
            );

            res.json({ notifications });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Notifications fetch error:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

app.patch('/api/notifications/:id/read', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            await connection.execute(
                'UPDATE notifications SET `read` = true WHERE id = ? AND user_id = ?',
                [req.params.id, req.user.id]
            );

            res.json({ message: 'Notification marked as read' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Notification update error:', error);
        res.status(500).json({ message: 'Error updating notification' });
    }
});

// User Profile Routes (unchanged)
app.get('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            const [users] = await connection.execute(
                'SELECT id, username, email, created_at FROM users WHERE id = ?',
                [req.user.id]
            );

            if (users.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json(users[0]);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const webdavStatus = await webdavService.checkConnection();
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        webdav: webdavStatus ? 'Connected' : 'Disconnected'
    });
});

// Apply error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3030;

const startServer = async () => {
    const connectionsOk = await testConnections();

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
        if (!connectionsOk) {
            console.warn('⚠️  Warning: Server running but some connections failed');
        }
    });
};

startServer();
import express from 'express';
import cors from 'cors';
import { createClient } from 'webdav';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pool from './config/db.js';
import { verifyToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Gunakan environment variable
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// WebDAV client creator function
const createWebDAVClient = (username) => {
  return createClient(`${process.env.WEBDAV_URL}/cloud-s/${username}`, {
    username: process.env.WEBDAV_USERNAME,
    password: process.env.WEBDAV_PASSWORD
  });
};

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const connection = await pool.getConnection();

    try {
      // Check if username or email already exists
      const [existingUser] = await connection.execute(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const [result] = await connection.execute(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );

      // Create user storage entry
      await connection.execute(
        'INSERT INTO user_storage (user_id, storage_path) VALUES (?, ?)',
        [result.insertId, `/cloud-s/${username}`]
      );

      // Create user directory in WebDAV
      const webdavClient = createWebDAVClient(username);
      await webdavClient.createDirectory('');

      res.status(201).json({ message: 'User registered successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const connection = await pool.getConnection();

    try {
      // Get user
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = users[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Create token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
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

// Protected file routes
app.get('/api/files', verifyToken, async (req, res) => {
  try {
    const webdavClient = createWebDAVClient(req.user.username);
    const directoryItems = await webdavClient.getDirectoryContents('');
    res.json(directoryItems);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ message: 'Error fetching files' });
  }
});

app.post('/api/files/upload', verifyToken, async (req, res) => {
  try {
    const { fileName, fileContent } = req.body;
    const webdavClient = createWebDAVClient(req.user.username);
    await webdavClient.putFileContents(fileName, fileContent);
    res.json({ message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

app.delete('/api/files/:fileName', verifyToken, async (req, res) => {
  try {
    const { fileName } = req.params;
    const webdavClient = createWebDAVClient(req.user.username);
    await webdavClient.deleteFile(fileName);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

const PORT = process.env.PORT || 3030;

async function testConnections() {
  let mysqlOk = false;
  let webdavOk = false;

  // Test MySQL
  try {
    const connection = await pool.getConnection();
    await connection.ping(); // Cek koneksi
    connection.release();
    mysqlOk = true;
    console.log('✅ MySQL connection OK');
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
  }

  // Test WebDAV
  try {
    const testClient = createClient(process.env.WEBDAV_URL, {
      username: process.env.WEBDAV_USERNAME,
      password: process.env.WEBDAV_PASSWORD
    });

    // Cek direktori root bisa diakses
    await testClient.getDirectoryContents('/');
    webdavOk = true;
    console.log('✅ WebDAV connection OK');
  } catch (err) {
    console.error('❌ WebDAV connection failed:', err.message);
  }

  // Jalankan server setelah tes koneksi
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    if (!mysqlOk || !webdavOk) {
      console.warn('⚠️ Warning: Not all services are connected properly.');
    }
  });
}

testConnections();

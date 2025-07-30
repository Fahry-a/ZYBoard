import express from 'express';
import mysql from 'mysql2';
import { createClient } from 'webdav';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'cloud_storage'
});

// WebDAV Client
const webdavClient = createClient(process.env.WEBDAV_URL, {
  username: process.env.WEBDAV_USERNAME,
  password: process.env.WEBDAV_PASSWORD
});

// Routes
app.get('/api/files', async (req, res) => {
  try {
    const directoryItems = await webdavClient.getDirectoryContents('/');
    res.json(directoryItems);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

app.post('/api/upload', async (req, res) => {
  try {
    const { fileName, fileContent } = req.body;
    await webdavClient.putFileContents(fileName, fileContent);
    res.json({ message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.delete('/api/files/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    await webdavClient.deleteFile(fileName);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

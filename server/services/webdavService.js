// server/services/webdavService.js
import { createClient } from 'webdav';
import dotenv from 'dotenv';

dotenv.config();

class WebDAVService {
  constructor() {
    console.log("🧪 WEBDAV_URL =", process.env.WEBDAV_URL);
    console.log("🧪 WEBDAV_USERNAME =", process.env.WEBDAV_USERNAME);
    console.log("🧪 WEBDAV_PASSWORD =", process.env.WEBDAV_PASSWORD ? '***' : 'NOT SET');
    
    this.client = createClient(
      process.env.WEBDAV_URL,
      {
        username: process.env.WEBDAV_USERNAME,
        password: process.env.WEBDAV_PASSWORD,
      }
    );
    this.baseDir = '/cloud';
  }

  async initializeUserDirectory(userId) {
    const userDir = `${this.baseDir}/user_${userId}`;
    try {
      const exists = await this.client.exists(userDir);
      if (!exists) {
        await this.client.createDirectory(userDir, { recursive: true });
        console.log(`📁 Created user directory: ${userDir}`);
      }
      return userDir;
    } catch (error) {
      console.error('Error initializing user directory:', error);
      throw new Error('Failed to initialize user directory');
    }
  }

  async uploadFile(userId, filename, fileBuffer) {
    try {
      const userDir = await this.initializeUserDirectory(userId);
      const filePath = `${userDir}/${filename}`;
      
      await this.client.putFileContents(filePath, fileBuffer);
      console.log(`📤 File uploaded to WebDAV: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Error uploading to WebDAV:', error);
      throw new Error('Failed to upload file to WebDAV');
    }
  }

  async downloadFile(userId, filename) {
    try {
      const userDir = `${this.baseDir}/user_${userId}`;
      const filePath = `${userDir}/${filename}`;
      
      const exists = await this.client.exists(filePath);
      if (!exists) {
        throw new Error('File not found');
      }
      
      console.log(`📥 Downloading file from WebDAV: ${filePath}`);
      const fileContent = await this.client.getFileContents(filePath);
      return fileContent;
    } catch (error) {
      console.error('Error downloading from WebDAV:', error);
      throw new Error('Failed to download file from WebDAV');
    }
  }

  async deleteFile(userId, filename) {
    try {
      const userDir = `${this.baseDir}/user_${userId}`;
      const filePath = `${userDir}/${filename}`;
      
      const exists = await this.client.exists(filePath);
      if (!exists) {
        console.warn(`File not found for deletion: ${filePath}`);
        return true; // Consider it successful if file doesn't exist
      }
      
      await this.client.deleteFile(filePath);
      console.log(`🗑️ File deleted from WebDAV: ${filePath}`);
      return true;
    } catch (error) {
      console.error('Error deleting from WebDAV:', error);
      throw new Error('Failed to delete file from WebDAV');
    }
  }

  async listFiles(userId) {
    try {
      const userDir = `${this.baseDir}/user_${userId}`;
      const exists = await this.client.exists(userDir);
      
      if (!exists) {
        await this.initializeUserDirectory(userId);
        return [];
      }
      
      const files = await this.client.getDirectoryContents(userDir);
      return files.filter(file => file.type === 'file');
    } catch (error) {
      console.error('Error listing files from WebDAV:', error);
      return [];
    }
  }

  async getFileStats(userId, filename) {
    try {
      const userDir = `${this.baseDir}/user_${userId}`;
      const filePath = `${userDir}/${filename}`;
      
      const stats = await this.client.stat(filePath);
      return stats;
    } catch (error) {
      console.error('Error getting file stats:', error);
      throw new Error('Failed to get file statistics');
    }
  }

  async checkConnection() {
    try {
      await this.client.exists('/');
      console.log('✅ WebDAV connection test successful');
      return true;
    } catch (error) {
      console.error('❌ WebDAV connection failed:', error.message);
      return false;
    }
  }

  async getUserStorageUsage(userId) {
    try {
      const files = await this.listFiles(userId);
      let totalSize = 0;
      
      for (const file of files) {
        totalSize += file.size || 0;
      }
      
      return {
        fileCount: files.length,
        totalSize: totalSize,
        files: files
      };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return {
        fileCount: 0,
        totalSize: 0,
        files: []
      };
    }
  }

  async createDirectory(userId, dirName) {
    try {
      const userDir = await this.initializeUserDirectory(userId);
      const dirPath = `${userDir}/${dirName}`;
      
      await this.client.createDirectory(dirPath);
      console.log(`📁 Directory created: ${dirPath}`);
      return dirPath;
    } catch (error) {
      console.error('Error creating directory:', error);
      throw new Error('Failed to create directory');
    }
  }

  async moveFile(userId, oldFilename, newFilename) {
    try {
      const userDir = `${this.baseDir}/user_${userId}`;
      const oldPath = `${userDir}/${oldFilename}`;
      const newPath = `${userDir}/${newFilename}`;
      
      await this.client.moveFile(oldPath, newPath);
      console.log(`📦 File moved: ${oldPath} -> ${newPath}`);
      return newPath;
    } catch (error) {
      console.error('Error moving file:', error);
      throw new Error('Failed to move file');
    }
  }

  async copyFile(userId, sourceFilename, destFilename) {
    try {
      const userDir = `${this.baseDir}/user_${userId}`;
      const sourcePath = `${userDir}/${sourceFilename}`;
      const destPath = `${userDir}/${destFilename}`;
      
      await this.client.copyFile(sourcePath, destPath);
      console.log(`📋 File copied: ${sourcePath} -> ${destPath}`);
      return destPath;
    } catch (error) {
      console.error('Error copying file:', error);
      throw new Error('Failed to copy file');
    }
  }
}

const webdavService = new WebDAVService();
export default webdavService;
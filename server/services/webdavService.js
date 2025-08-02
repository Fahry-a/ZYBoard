// server/services/webdavService.js
const { createClient } = require('webdav');
const fs = require('fs').promises;
const path = require('path');

class WebDAVService {
  constructor() {
    console.log("🧪 WEBDAV_URL =", process.env.WEBDAV_URL);
    console.log("🧪 WEBDAV_USERNAME =", process.env.WEBDAV_USERNAME);
    console.log("🧪 WEBDAV_PASSWORD =", process.env.WEBDAV_PASSWORD);
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
      
      return await this.client.getFileContents(filePath);
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
        throw new Error('File not found');
      }
      
      await this.client.deleteFile(filePath);
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
      return true;
    } catch (error) {
      console.error('WebDAV connection failed:', error);
      return false;
    }
  }
}

module.exports = new WebDAVService();
// server/config/adapters/MySQLAdapter.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

class MySQLAdapter {
  constructor() {
    this.type = 'mysql';
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'zyboard_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000,
    });
  }

  async query(sql, params = []) {
    const connection = await this.pool.getConnection();
    try {
      const [results] = await connection.execute(sql, params);
      return results;
    } finally {
      connection.release();
    }
  }

  async transaction(queries) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const results = [];
      for (const { sql, params } of queries) {
        const [result] = await connection.execute(sql, params);
        results.push(result);
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      console.error('MySQL connection test failed:', error);
      return false;
    }
  }

  getConnectionInfo() {
    return {
      type: this.type,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      connected: true
    };
  }

  // User operations
  async insertUser(username, email, hashedPassword) {
    const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    const result = await this.query(sql, [username, email, hashedPassword]);
    return { insertId: result.insertId };
  }

  async findUserByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const results = await this.query(sql, [email]);
    return results;
  }

  async findUserById(id) {
    const sql = 'SELECT id, username, email, created_at FROM users WHERE id = ?';
    const results = await this.query(sql, [id]);
    return results;
  }

  // File operations
  async insertFile(userId, filename, originalName, size, type, path) {
    const sql = 'INSERT INTO files (user_id, filename, original_name, size, type, path) VALUES (?, ?, ?, ?, ?, ?)';
    const result = await this.query(sql, [userId, filename, originalName, size, type, path]);
    return { insertId: result.insertId };
  }

  async findFilesByUserId(userId) {
    const sql = 'SELECT id, filename, original_name, size, type, created_at, updated_at FROM files WHERE user_id = ? ORDER BY created_at DESC';
    return await this.query(sql, [userId]);
  }

  async findFileById(id, userId) {
    const sql = 'SELECT * FROM files WHERE id = ? AND user_id = ?';
    const results = await this.query(sql, [id, userId]);
    return results;
  }

  async findFileByFilename(filename, userId) {
    const sql = 'SELECT * FROM files WHERE filename = ? AND user_id = ?';
    const results = await this.query(sql, [filename, userId]);
    return results;
  }

  async deleteFile(id) {
    const sql = 'DELETE FROM files WHERE id = ?';
    const result = await this.query(sql, [id]);
    return { affectedRows: result.affectedRows };
  }

  // Storage operations
  async findStorageByUserId(userId) {
    const sql = 'SELECT * FROM storage_allocation WHERE user_id = ?';
    return await this.query(sql, [userId]);
  }

  async insertStorage(userId, totalSpace, usedSpace) {
    const sql = 'INSERT INTO storage_allocation (user_id, total_space, used_space) VALUES (?, ?, ?)';
    const result = await this.query(sql, [userId, totalSpace, usedSpace]);
    return { insertId: result.insertId };
  }

  async updateStorageUsed(userId, usedSpace) {
    const sql = 'UPDATE storage_allocation SET used_space = ? WHERE user_id = ?';
    const result = await this.query(sql, [usedSpace, userId]);
    return { affectedRows: result.affectedRows };
  }

  async decrementStorageUsed(userId, decrementBy) {
    const sql = 'UPDATE storage_allocation SET used_space = used_space - ? WHERE user_id = ?';
    const result = await this.query(sql, [decrementBy, userId]);
    return { affectedRows: result.affectedRows };
  }

  // Activity operations
  async insertActivity(userId, action, metadata = null) {
    const sql = 'INSERT INTO activities (user_id, action, metadata) VALUES (?, ?, ?)';
    const result = await this.query(sql, [userId, action, metadata]);
    return { insertId: result.insertId };
  }

  async findActivitiesByUserId(userId, limit = 20) {
    const sql = 'SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ?';
    return await this.query(sql, [userId, limit]);
  }

  // Notification operations
  async insertNotification(userId, message, type = 'info', category = 'general') {
    const sql = 'INSERT INTO notifications (user_id, message, type, category) VALUES (?, ?, ?, ?)';
    const result = await this.query(sql, [userId, message, type, category]);
    return { insertId: result.insertId };
  }

  async findNotificationsByUserId(userId, unreadOnly = false, limit = 50, offset = 0) {
    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];

    if (unreadOnly) {
      sql += ' AND `read` = false';
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await this.query(sql, params);
  }

  async markNotificationAsRead(id, userId) {
    const sql = 'UPDATE notifications SET `read` = true WHERE id = ? AND user_id = ?';
    const result = await this.query(sql, [id, userId]);
    return { affectedRows: result.affectedRows };
  }

  async markAllNotificationsAsRead(userId) {
    const sql = 'UPDATE notifications SET `read` = true WHERE user_id = ? AND `read` = false';
    const result = await this.query(sql, [userId]);
    return { affectedRows: result.affectedRows };
  }

  async deleteNotification(id, userId) {
    const sql = 'DELETE FROM notifications WHERE id = ? AND user_id = ?';
    const result = await this.query(sql, [id, userId]);
    return { affectedRows: result.affectedRows };
  }

  async deleteAllNotifications(userId) {
    const sql = 'DELETE FROM notifications WHERE user_id = ?';
    const result = await this.query(sql, [userId]);
    return { affectedRows: result.affectedRows };
  }

  async countUnreadNotifications(userId) {
    const sql = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND `read` = false';
    const results = await this.query(sql, [userId]);
    return results[0].count;
  }

  // Team operations
  async insertTeam(name, description, createdBy) {
    const sql = 'INSERT INTO teams (name, description, created_by) VALUES (?, ?, ?)';
    const result = await this.query(sql, [name, description, createdBy]);
    return { insertId: result.insertId };
  }

  async findTeamsByUserId(userId) {
    const sql = `
      SELECT t.*, 
             COUNT(tm.user_id) as member_count,
             u.username as creator_name
      FROM teams t 
      LEFT JOIN team_members tm ON t.id = tm.team_id 
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id IN (
          SELECT DISTINCT team_id FROM team_members WHERE user_id = ?
      )
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    return await this.query(sql, [userId]);
  }

  async insertTeamMember(teamId, userId, role = 'member') {
    const sql = 'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)';
    const result = await this.query(sql, [teamId, userId, role]);
    return { insertId: result.insertId };
  }

  async findTeamMembersByUserId(userId) {
    const sql = `
      SELECT u.id, u.username, u.email, u.created_at,
             tm.role, tm.created_at as joined_at, 
             t.id as team_id, t.name as team_name
      FROM team_members tm 
      JOIN users u ON tm.user_id = u.id 
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.team_id IN (
          SELECT team_id FROM team_members WHERE user_id = ?
      )
      ORDER BY tm.created_at DESC
    `;
    return await this.query(sql, [userId]);
  }

  async checkTeamAdmin(teamId, userId) {
    const sql = 'SELECT * FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?';
    const results = await this.query(sql, [teamId, userId, 'admin']);
    return results.length > 0;
  }

  async checkTeamOwner(teamId, userId) {
    const sql = 'SELECT * FROM teams WHERE id = ? AND created_by = ?';
    const results = await this.query(sql, [teamId, userId]);
    return results.length > 0;
  }

  async deleteTeam(teamId) {
    // Delete team members first, then team
    await this.query('DELETE FROM team_members WHERE team_id = ?', [teamId]);
    const result = await this.query('DELETE FROM teams WHERE id = ?', [teamId]);
    return { affectedRows: result.affectedRows };
  }

  async removeTeamMember(teamId, memberId) {
    const sql = 'DELETE FROM team_members WHERE team_id = ? AND user_id = ?';
    const result = await this.query(sql, [teamId, memberId]);
    return { affectedRows: result.affectedRows };
  }

  // Advanced queries
  async getUserStats(userId) {
    const sql = `
      SELECT 
        u.id, u.username, u.email, u.created_at,
        sa.total_space, sa.used_space,
        (sa.total_space - sa.used_space) as available_space,
        ROUND((sa.used_space / sa.total_space) * 100, 2) as usage_percentage,
        COUNT(f.id) as file_count,
        COALESCE(AVG(f.size), 0) as avg_file_size,
        MAX(f.created_at) as last_upload
      FROM users u
      LEFT JOIN storage_allocation sa ON u.id = sa.user_id
      LEFT JOIN files f ON u.id = f.user_id
      WHERE u.id = ?
      GROUP BY u.id, u.username, u.email, u.created_at, sa.total_space, sa.used_space
    `;
    const results = await this.query(sql, [userId]);
    return results[0] || null;
  }

  async getFileTypeStats(userId) {
    const sql = `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(size) as total_size,
        AVG(size) as avg_size
      FROM files 
      WHERE user_id = ? 
      GROUP BY type 
      ORDER BY count DESC
    `;
    return await this.query(sql, [userId]);
  }

  async getRecentActivity(userId, days = 7) {
    const sql = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as activity_count
      FROM activities 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    return await this.query(sql, [userId, days]);
  }

  // Cleanup and maintenance
  async cleanupOldNotifications(days = 30) {
    const sql = 'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY) AND `read` = true';
    const result = await this.query(sql, [days]);
    return { deletedCount: result.affectedRows };
  }

  async cleanupOldActivities(days = 90) {
    const sql = 'DELETE FROM activities WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
    const result = await this.query(sql, [days]);
    return { deletedCount: result.affectedRows };
  }

  // Close connection pool
  async close() {
    await this.pool.end();
  }
}

export default MySQLAdapter;
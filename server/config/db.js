// server/config/db.js
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import DatabaseFactory from './database-factory.js';
import dotenv from 'dotenv';
dotenv.config();

const db = DatabaseFactory.create(process.env.DB_TYPE || 'supabase');


let dbClient = null;

// MySQL/MariaDB Configuration
const createMySQLConnection = () => {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'zyboard_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
};

// Supabase Configuration
const createSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase connection');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Database Adapter Class
class DatabaseAdapter {
  constructor() {
    this.type = db;
    
    if (this.type === 'supabase') {
      this.client = createSupabaseClient();
    } else {
      this.client = createMySQLConnection();
    }
  }

  // Generic query method
  async query(sql, params = []) {
    if (this.type === 'mysql') {
      const connection = await this.client.getConnection();
      try {
        const [results] = await connection.execute(sql, params);
        return results;
      } finally {
        connection.release();
      }
    } else {
      // Convert MySQL queries to Supabase operations
      return await this.executeSupabaseQuery(sql, params);
    }
  }

  // Convert MySQL queries to Supabase operations
  async executeSupabaseQuery(sql, params = []) {
    const sqlLower = sql.toLowerCase().trim();
    
    // INSERT operations
    if (sqlLower.startsWith('insert into users')) {
      return await this.handleUserInsert(sql, params);
    }
    
    if (sqlLower.startsWith('insert into files')) {
      return await this.handleFileInsert(sql, params);
    }
    
    if (sqlLower.startsWith('insert into activities')) {
      return await this.handleActivityInsert(sql, params);
    }
    
    if (sqlLower.startsWith('insert into notifications')) {
      return await this.handleNotificationInsert(sql, params);
    }
    
    if (sqlLower.startsWith('insert into teams')) {
      return await this.handleTeamInsert(sql, params);
    }
    
    if (sqlLower.startsWith('insert into team_members')) {
      return await this.handleTeamMemberInsert(sql, params);
    }
    
    if (sqlLower.startsWith('insert into storage_allocation')) {
      return await this.handleStorageInsert(sql, params);
    }

    // SELECT operations
    if (sqlLower.startsWith('select')) {
      return await this.handleSelect(sql, params);
    }
    
    // UPDATE operations
    if (sqlLower.startsWith('update')) {
      return await this.handleUpdate(sql, params);
    }
    
    // DELETE operations
    if (sqlLower.startsWith('delete')) {
      return await this.handleDelete(sql, params);
    }
    
    throw new Error(`Unsupported SQL operation: ${sql}`);
  }

  // User operations
  async handleUserInsert(sql, params) {
    const [username, email, hashedPassword] = params;
    const { data, error } = await this.client
      .from('users')
      .insert({
        username,
        email,
        password: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return { insertId: data.id };
  }

  // File operations
  async handleFileInsert(sql, params) {
    const [user_id, filename, original_name, size, type, path] = params;
    const { data, error } = await this.client
      .from('files')
      .insert({
        user_id,
        filename,
        original_name,
        size,
        type,
        path,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return { insertId: data.id };
  }

  // Activity operations
  async handleActivityInsert(sql, params) {
    const [user_id, action] = params;
    const { data, error } = await this.client
      .from('activities')
      .insert({
        user_id,
        action,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return { insertId: data.id };
  }

  // Notification operations
  async handleNotificationInsert(sql, params) {
    let user_id, message, type = 'info', category = 'general';
    
    if (params.length === 2) {
      [user_id, message] = params;
    } else if (params.length === 4) {
      [user_id, message, type, category] = params;
    }
    
    const { data, error } = await this.client
      .from('notifications')
      .insert({
        user_id,
        message,
        type,
        category,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return { insertId: data.id };
  }

  // Team operations
  async handleTeamInsert(sql, params) {
    const [name, created_by] = params;
    const { data, error } = await this.client
      .from('teams')
      .insert({
        name,
        created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return { insertId: data.id };
  }

  // Team member operations
  async handleTeamMemberInsert(sql, params) {
    const [team_id, user_id, role] = params;
    const { data, error } = await this.client
      .from('team_members')
      .insert({
        team_id,
        user_id,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return { insertId: data.id };
  }

  // Storage allocation operations
  async handleStorageInsert(sql, params) {
    const [user_id, total_space, used_space] = params;
    const { data, error } = await this.client
      .from('storage_allocation')
      .insert({
        user_id,
        total_space,
        used_space,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return { insertId: data.id };
  }

  // Generic SELECT handler
  async handleSelect(sql, params) {
    // This is a simplified handler - you might need to implement more complex parsing
    // For now, we'll handle common patterns
    
    if (sql.includes('FROM users WHERE email = ?')) {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('email', params[0]);
      if (error) throw error;
      return data;
    }
    
    if (sql.includes('FROM users WHERE username = ? OR email = ?')) {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .or(`username.eq.${params[0]},email.eq.${params[1]}`);
      if (error) throw error;
      return data;
    }
    
    if (sql.includes('FROM files WHERE user_id = ?')) {
      const { data, error } = await this.client
        .from('files')
        .select('*')
        .eq('user_id', params[0])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    
    if (sql.includes('FROM storage_allocation WHERE user_id = ?')) {
      const { data, error } = await this.client
        .from('storage_allocation')
        .select('*')
        .eq('user_id', params[0]);
      if (error) throw error;
      return data;
    }
    
    if (sql.includes('FROM activities WHERE user_id = ?')) {
      const { data, error } = await this.client
        .from('activities')
        .select('*')
        .eq('user_id', params[0])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    }
    
    if (sql.includes('FROM notifications WHERE user_id = ?')) {
      let query = this.client
        .from('notifications')
        .select('*')
        .eq('user_id', params[0]);
        
      if (sql.includes('AND `read` = false')) {
        query = query.eq('read', false);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    
    // Add more SELECT patterns as needed
    throw new Error(`Unsupported SELECT query: ${sql}`);
  }

  // Generic UPDATE handler
  async handleUpdate(sql, params) {
    if (sql.includes('UPDATE storage_allocation SET used_space = ?')) {
      const { data, error } = await this.client
        .from('storage_allocation')
        .update({ 
          used_space: params[0],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', params[1]);
      if (error) throw error;
      return { affectedRows: data?.length || 1 };
    }
    
    if (sql.includes('UPDATE notifications SET `read` = true')) {
      let query = this.client
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        });
        
      if (sql.includes('WHERE id = ? AND user_id = ?')) {
        query = query.eq('id', params[0]).eq('user_id', params[1]);
      } else if (sql.includes('WHERE user_id = ? AND `read` = false')) {
        query = query.eq('user_id', params[0]).eq('read', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return { affectedRows: data?.length || 1 };
    }
    
    throw new Error(`Unsupported UPDATE query: ${sql}`);
  }

  // Generic DELETE handler
  async handleDelete(sql, params) {
    if (sql.includes('DELETE FROM files WHERE id = ?')) {
      const { data, error } = await this.client
        .from('files')
        .delete()
        .eq('id', params[0]);
      if (error) throw error;
      return { affectedRows: data?.length || 1 };
    }
    
    if (sql.includes('DELETE FROM notifications WHERE id = ? AND user_id = ?')) {
      const { data, error } = await this.client
        .from('notifications')
        .delete()
        .eq('id', params[0])
        .eq('user_id', params[1]);
      if (error) throw error;
      return { affectedRows: data?.length || 1 };
    }
    
    if (sql.includes('DELETE FROM notifications WHERE user_id = ?')) {
      const { data, error } = await this.client
        .from('notifications')
        .delete()
        .eq('user_id', params[0]);
      if (error) throw error;
      return { affectedRows: data?.length || 1 };
    }
    
    throw new Error(`Unsupported DELETE query: ${sql}`);
  }

  // Test connection
  async testConnection() {
    try {
      if (this.type === 'mysql') {
        const connection = await this.client.getConnection();
        connection.release();
        return true;
      } else {
        const { data, error } = await this.client.from('users').select('count').limit(1);
        return !error;
      }
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  // Get connection info
  getConnectionInfo() {
    return {
      type: this.type,
      connected: true
    };
  }
}

// Create and export database adapter instance
export default db;
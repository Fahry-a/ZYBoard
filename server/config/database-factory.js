// server/config/database-factory.js
import MySQLAdapter from './adapters/MySQLAdapter.js';
import SupabaseAdapter from './adapters/SupabaseAdapter.js';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseFactory {
  static create(type = process.env.DB_TYPE || 'mysql') {
    switch (type.toLowerCase()) {
      case 'mysql':
      case 'mariadb':
        return new MySQLAdapter();
      
      case 'supabase':
      case 'postgresql':
      case 'postgres':
        return new SupabaseAdapter();
      
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  static async testAllConnections() {
    const results = {};
    
    try {
      const mysql = new MySQLAdapter();
      results.mysql = {
        available: true,
        connected: await mysql.testConnection()
      };
    } catch (error) {
      results.mysql = {
        available: false,
        error: error.message
      };
    }

    try {
      const supabase = new SupabaseAdapter();
      results.supabase = {
        available: true,
        connected: await supabase.testConnection()
      };
    } catch (error) {
      results.supabase = {
        available: false,
        error: error.message
      };
    }

    return results;
  }
}

export default DatabaseFactory;
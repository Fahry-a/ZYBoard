// server/config/adapters/SupabaseAdapter.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class SupabaseAdapter {
  constructor() {
    this.type = 'supabase';
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase connection');
    }
    
    this.client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  async query(sql, params = []) {
    // This method is kept for compatibility, but Supabase uses its own query methods
    throw new Error('Direct SQL queries not supported in Supabase adapter. Use specific methods instead.');
  }

  async testConnection() {
    try {
      const { data, error } = await this.client.from('users').select('count').limit(1);
      if (error && error.code !== 'PGRST116') {
        console.error('Supabase test connection error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  getConnectionInfo() {
    return {
      type: this.type,
      url: process.env.SUPABASE_URL,
      connected: true
    };
  }

  // User operations
  async insertUser(username, email, hashedPassword) {
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
      
    if (error) {
      console.error('Insert user error:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
    return { insertId: data.id };
  }

  async findUserByEmail(email) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email);
      
    if (error) {
      console.error('Find user by email error:', error);
      throw new Error(`Failed to find user: ${error.message}`);
    }
    return data || [];
  }

  async findUserById(id) {
    const { data, error } = await this.client
      .from('users')
      .select('id, username, email, created_at')
      .eq('id', id);
      
    if (error) {
      console.error('Find user by ID error:', error);
      throw new Error(`Failed to find user: ${error.message}`);
    }
    return data || [];
  }

  // File operations
  async insertFile(userId, filename, originalName, size, type, path) {
    const { data, error } = await this.client
      .from('files')
      .insert({
        user_id: userId,
        filename,
        original_name: originalName,
        size,
        type,
        path,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Insert file error:', error);
      throw new Error(`Failed to insert file: ${error.message}`);
    }
    return { insertId: data.id };
  }

  async findFilesByUserId(userId) {
    const { data, error } = await this.client
      .from('files')
      .select('id, filename, original_name, size, type, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Find files by user ID error:', error);
      throw new Error(`Failed to find files: ${error.message}`);
    }
    return data || [];
  }

  async findFileById(id, userId) {
    const { data, error } = await this.client
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) {
      console.error('Find file by ID error:', error);
      throw new Error(`Failed to find file: ${error.message}`);
    }
    return data || [];
  }

  async findFileByFilename(filename, userId) {
    const { data, error } = await this.client
      .from('files')
      .select('*')
      .eq('filename', filename)
      .eq('user_id', userId);
      
    if (error) {
      console.error('Find file by filename error:', error);
      throw new Error(`Failed to find file: ${error.message}`);
    }
    return data || [];
  }

  async deleteFile(id) {
    const { data, error } = await this.client
      .from('files')
      .delete()
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('Delete file error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
    return { affectedRows: data?.length || 0 };
  }

  // Storage operations
  async findStorageByUserId(userId) {
    const { data, error } = await this.client
      .from('storage_allocation')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Find storage by user ID error:', error);
      throw new Error(`Failed to find storage: ${error.message}`);
    }
    return data || [];
  }

  async insertStorage(userId, totalSpace, usedSpace) {
    const { data, error } = await this.client
      .from('storage_allocation')
      .insert({
        user_id: userId,
        total_space: totalSpace,
        used_space: usedSpace,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Insert storage error:', error);
      throw new Error(`Failed to insert storage: ${error.message}`);
    }
    return { insertId: data.id };
  }

  async updateStorageUsed(userId, usedSpace) {
    const { data, error } = await this.client
      .from('storage_allocation')
      .update({ 
        used_space: usedSpace,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();
      
    if (error) {
      console.error('Update storage error:', error);
      throw new Error(`Failed to update storage: ${error.message}`);
    }
    return { affectedRows: data?.length || 0 };
  }

  async decrementStorageUsed(userId, decrementBy) {
    // Get current usage first
    const current = await this.findStorageByUserId(userId);
    if (current.length === 0) return { affectedRows: 0 };
    
    const newUsage = Math.max(0, current[0].used_space - decrementBy);
    return await this.updateStorageUsed(userId, newUsage);
  }

  // Activity operations
  async insertActivity(userId, action, metadata = null) {
    const { data, error } = await this.client
      .from('activities')
      .insert({
        user_id: userId,
        action,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Insert activity error:', error);
      throw new Error(`Failed to insert activity: ${error.message}`);
    }
    return { insertId: data.id };
  }

  async findActivitiesByUserId(userId, limit = 20) {
    const { data, error } = await this.client
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Find activities error:', error);
      throw new Error(`Failed to find activities: ${error.message}`);
    }
    return data || [];
  }

  // Notification operations
  async insertNotification(userId, message, type = 'info', category = 'general') {
    const { data, error } = await this.client
      .from('notifications')
      .insert({
        user_id: userId,
        message,
        type,
        category,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Insert notification error:', error);
      throw new Error(`Failed to insert notification: ${error.message}`);
    }
    return { insertId: data.id };
  }

  async findNotificationsByUserId(userId, unreadOnly = false, limit = 50, offset = 0) {
    let query = this.client
      .from('notifications')
      .select('*')
      .eq('user_id', userId);
      
    if (unreadOnly) {
      query = query.eq('read', false);
    }
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Find notifications error:', error);
      throw new Error(`Failed to find notifications: ${error.message}`);
    }
    return data || [];
  }

  async markNotificationAsRead(id, userId) {
    const { data, error } = await this.client
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select();
      
    if (error) {
      console.error('Mark notification as read error:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
    return { affectedRows: data?.length || 0 };
  }

  async markAllNotificationsAsRead(userId) {
    const { data, error } = await this.client
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
      .select();
      
    if (error) {
      console.error('Mark all notifications as read error:', error);
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
    return { affectedRows: data?.length || 0 };
  }

  async deleteNotification(id, userId) {
    const { data, error } = await this.client
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select();
      
    if (error) {
      console.error('Delete notification error:', error);
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
    return { affectedRows: data?.length || 0 };
  }

  async deleteAllNotifications(userId) {
    const { data, error } = await this.client
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .select();
      
    if (error) {
      console.error('Delete all notifications error:', error);
      throw new Error(`Failed to delete all notifications: ${error.message}`);
    }
    return { affectedRows: data?.length || 0 };
  }

  async countUnreadNotifications(userId) {
    const { count, error } = await this.client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
      
    if (error) {
      console.error('Count unread notifications error:', error);
      throw new Error(`Failed to count unread notifications: ${error.message}`);
    }
    return count || 0;
  }

  // Team operations
  async insertTeam(name, description, createdBy) {
    const { data, error } = await this.client
      .from('teams')
      .insert({
        name,
        description,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Insert team error:', error);
      throw new Error(`Failed to insert team: ${error.message}`);
    }
    return { insertId: data.id };
  }

  async findTeamsByUserId(userId) {
    try {
      // First, get team IDs for the user
      const { data: teamMemberships, error: memberError } = await this.client
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId);
        
      if (memberError) {
        console.error('Find team memberships error:', memberError);
        throw new Error(`Failed to find team memberships: ${memberError.message}`);
      }
      
      if (!teamMemberships || teamMemberships.length === 0) return [];
      
      const teamIds = teamMemberships.map(tm => tm.team_id);
      
      // Get team details
      const { data: teams, error: teamsError } = await this.client
        .from('teams')
        .select(`
          *,
          users!teams_created_by_fkey(username)
        `)
        .in('id', teamIds)
        .order('created_at', { ascending: false });
        
      if (teamsError) {
        console.error('Find teams error:', teamsError);
        throw new Error(`Failed to find teams: ${teamsError.message}`);
      }
      
      // Get member counts for each team
      const teamsWithCounts = await Promise.all(teams.map(async (team) => {
        const { count, error: countError } = await this.client
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);
          
        return {
          ...team,
          creator_name: team.users?.username || 'Unknown',
          member_count: count || 0
        };
      }));
      
      return teamsWithCounts;
    } catch (error) {
      console.error('Find teams by user ID error:', error);
      throw new Error(`Failed to find teams: ${error.message}`);
    }
  }

  async insertTeamMember(teamId, userId, role = 'member') {
    const { data, error } = await this.client
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Insert team member error:', error);
      throw new Error(`Failed to insert team member: ${error.message}`);
    }
    return { insertId: data.id };
  }

  async findTeamMembersByUserId(userId) {
    try {
      // Get user's team memberships with related team and user data
      const { data: teamMemberships, error } = await this.client
        .from('team_members')
        .select(`
          *,
          users!team_members_user_id_fkey(id, username, email, created_at),
          teams!team_members_team_id_fkey(id, name)
        `);
        
      if (error) {
        console.error('Find team members error:', error);
        throw new Error(`Failed to find team members: ${error.message}`);
      }
      
      // Filter for teams that the user is a member of
      const userTeamIds = teamMemberships
        .filter(tm => tm.user_id === userId)
        .map(tm => tm.team_id);
      
      const teamMembers = teamMemberships
        .filter(tm => userTeamIds.includes(tm.team_id))
        .map(tm => ({
          id: tm.users.id,
          username: tm.users.username,
          email: tm.users.email,
          created_at: tm.users.created_at,
          role: tm.role,
          joined_at: tm.created_at,
          team_id: tm.teams.id,
          team_name: tm.teams.name
        }));
        
      return teamMembers;
    } catch (error) {
      console.error('Find team members by user ID error:', error);
      throw new Error(`Failed to find team members: ${error.message}`);
    }
  }

  async checkTeamAdmin(teamId, userId) {
    const { data, error } = await this.client
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('role', 'admin');
      
    if (error) {
      console.error('Check team admin error:', error);
      return false;
    }
    return data && data.length > 0;
  }

  async checkTeamOwner(teamId, userId) {
    const { data, error } = await this.client
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .eq('created_by', userId);
      
    if (error) {
      console.error('Check team owner error:', error);
      return false;
    }
    return data && data.length > 0;
  }

  async deleteTeam(teamId) {
    // Delete team (cascade will handle team_members)
    const { data, error } = await this.client
      .from('teams')
      .delete()
      .eq('id', teamId)
      .select();
      
    if (error) {
      console.error('Delete team error:', error);
      throw new Error(`Failed to delete team: ${error.message}`);
    }
    return { affectedRows: data?.length || 0 };
  }

  async removeTeamMember(teamId, memberId) {
    const { data, error } = await this.client
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberId)
      .select();
      
    if (error) {
      console.error('Remove team member error:', error);
      throw new Error(`Failed to remove team member: ${error.message}`);
    }
    return { affectedRows: data?.length || 0 };
  }

  // Advanced queries
  async getUserStats(userId) {
    try {
      // Get user data
      const users = await this.findUserById(userId);
      if (users.length === 0) return null;
      
      // Get storage data
      const storage = await this.findStorageByUserId(userId);
      const storageStats = storage[0] || { total_space: 1073741824, used_space: 0 };
      
      // Get files data
      const files = await this.findFilesByUserId(userId);
      
      const fileCount = files.length;
      const avgFileSize = files.length > 0 ? files.reduce((sum, f) => sum + f.size, 0) / files.length : 0;
      const lastUpload = files.length > 0 ? files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at : null;
      
      return {
        ...users[0],
        total_space: storageStats.total_space,
        used_space: storageStats.used_space,
        available_space: storageStats.total_space - storageStats.used_space,
        usage_percentage: Math.round((storageStats.used_space / storageStats.total_space) * 100 * 100) / 100,
        file_count: fileCount,
        avg_file_size: avgFileSize,
        last_upload: lastUpload
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      throw new Error(`Failed to get user stats: ${error.message}`);
    }
  }

  async getFileTypeStats(userId) {
    try {
      const files = await this.findFilesByUserId(userId);
      
      const stats = {};
      files.forEach(file => {
        if (!stats[file.type]) {
          stats[file.type] = {
            type: file.type,
            count: 0,
            total_size: 0
          };
        }
        stats[file.type].count++;
        stats[file.type].total_size += file.size;
      });
      
      return Object.values(stats).map(stat => ({
        ...stat,
        avg_size: stat.total_size / stat.count
      })).sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Get file type stats error:', error);
      throw new Error(`Failed to get file type stats: ${error.message}`);
    }
  }

  async getRecentActivity(userId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await this.client
        .from('activities')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());
        
      if (error) {
        console.error('Get recent activity error:', error);
        throw new Error(`Failed to get recent activity: ${error.message}`);
      }
      
      // Group by date
      const activityByDate = {};
      (data || []).forEach(activity => {
        const date = activity.created_at.split('T')[0];
        activityByDate[date] = (activityByDate[date] || 0) + 1;
      });
      
      return Object.entries(activityByDate).map(([date, activity_count]) => ({
        date,
        activity_count
      })).sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Get recent activity error:', error);
      throw new Error(`Failed to get recent activity: ${error.message}`);
    }
  }

  // Cleanup and maintenance
  async cleanupOldNotifications(days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const { data, error } = await this.client
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('read', true)
        .select();
        
      if (error) {
        console.error('Cleanup old notifications error:', error);
        throw new Error(`Failed to cleanup old notifications: ${error.message}`);
      }
      return { deletedCount: data?.length || 0 };
    } catch (error) {
      console.error('Cleanup old notifications error:', error);
      throw new Error(`Failed to cleanup old notifications: ${error.message}`);
    }
  }

  async cleanupOldActivities(days = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const { data, error } = await this.client
        .from('activities')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select();
        
      if (error) {
        console.error('Cleanup old activities error:', error);
        throw new Error(`Failed to cleanup old activities: ${error.message}`);
      }
      return { deletedCount: data?.length || 0 };
    } catch (error) {
      console.error('Cleanup old activities error:', error);
      throw new Error(`Failed to cleanup old activities: ${error.message}`);
    }
  }

  // Transaction support (limited in Supabase)
  async transaction(operations) {
    // Supabase doesn't support transactions in the same way as SQL databases
    // This is a simplified implementation that runs operations sequentially
    const results = [];
    
    for (const operation of operations) {
      try {
        const result = await operation();
        results.push(result);
      } catch (error) {
        // If any operation fails, we can't rollback previous operations
        // This is a limitation of the Supabase approach
        console.error('Transaction operation failed:', error);
        throw new Error(`Transaction failed at operation ${results.length + 1}: ${error.message}`);
      }
    }
    
    return results;
  }

  // Close connection (not needed for Supabase)
  async close() {
    // Supabase handles connection management automatically
    return true;
  }
}

export default SupabaseAdapter;
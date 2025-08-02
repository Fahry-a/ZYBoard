CREATE DATABASE IF NOT EXISTS zyboard_db;
USE zyboard_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Storage allocation table
CREATE TABLE IF NOT EXISTS storage_allocation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_space BIGINT NOT NULL,
    used_space BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    type VARCHAR(100) NOT NULL,
    path VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    `read` BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- File sharing table
CREATE TABLE IF NOT EXISTS file_sharing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id INT NOT NULL,
    shared_by INT NOT NULL,
    shared_with INT NOT NULL,
    permission ENUM('read', 'write') NOT NULL DEFAULT 'read',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id),
    FOREIGN KEY (shared_by) REFERENCES users(id),
    FOREIGN KEY (shared_with) REFERENCES users(id)
);

-- Tambahan kolom ke tabel notifikasi
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type ENUM('info', 'success', 'warning', 'error', 'security') DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category ENUM('general', 'file', 'team', 'storage', 'security', 'sharing', 'system') DEFAULT 'general';

-- Index untuk notifikasi
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, `read`);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- Deskripsi dan index untuk tim
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_team_user ON team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- Index untuk files
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
CREATE INDEX IF NOT EXISTS idx_files_size ON files(size);

-- Tabel pengaturan notifikasi
CREATE TABLE IF NOT EXISTS notification_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    file_upload_notifications BOOLEAN DEFAULT TRUE,
    team_notifications BOOLEAN DEFAULT TRUE,
    security_notifications BOOLEAN DEFAULT TRUE,
    marketing_notifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id)
);

-- Tabel notifikasi sistem
CREATE TABLE IF NOT EXISTS system_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    target_users ENUM('all', 'active', 'specific') DEFAULT 'all',
    created_by INT NOT NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabel user yang telah melihat notifikasi sistem
CREATE TABLE IF NOT EXISTS user_system_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    system_notification_id INT NOT NULL,
    seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (system_notification_id) REFERENCES system_notifications(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_system_notif (user_id, system_notification_id)
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NULL,
    resource_id INT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_action (action)
);

-- Link share publik
CREATE TABLE IF NOT EXISTS file_share_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id INT NOT NULL,
    created_by INT NOT NULL,
    share_token VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    expires_at TIMESTAMP NULL,
    download_limit INT NULL DEFAULT NULL,
    download_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_share_token (share_token),
    INDEX idx_share_file (file_id)
);

-- Insert default notification settings (hanya jika user ada)
INSERT IGNORE INTO notification_settings (user_id)
SELECT id FROM users;

-- ✅ INSERT notifikasi sistem dengan ID user pertama (tidak hardcoded)
INSERT INTO system_notifications (title, message, type, priority, created_by)
SELECT 
  'Welcome to ZYBoard!',
  'Welcome to ZYBoard cloud storage platform. Start by uploading your first file to WebDAV.',
  'info',
  'medium',
  id
FROM users
ORDER BY id ASC
LIMIT 1;

-- Tambahan metadata pada tabel aktivitas
ALTER TABLE activities ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_agent TEXT NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS metadata JSON NULL;

-- Views
CREATE OR REPLACE VIEW team_stats AS
SELECT 
    t.id,
    t.name,
    t.description,
    t.created_by,
    t.created_at,
    COUNT(tm.user_id) as member_count,
    COUNT(CASE WHEN tm.role = 'admin' THEN 1 END) as admin_count,
    u.username as creator_name
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
LEFT JOIN users u ON t.created_by = u.id
GROUP BY t.id, t.name, t.description, t.created_by, t.created_at, u.username;

CREATE OR REPLACE VIEW user_storage_stats AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    sa.total_space,
    sa.used_space,
    (sa.total_space - sa.used_space) as available_space,
    ROUND((sa.used_space / sa.total_space) * 100, 2) as usage_percentage,
    COUNT(f.id) as file_count,
    AVG(f.size) as avg_file_size,
    MAX(f.created_at) as last_upload
FROM users u
LEFT JOIN storage_allocation sa ON u.id = sa.user_id
LEFT JOIN files f ON u.id = f.user_id
GROUP BY u.id, u.username, u.email, sa.total_space, sa.used_space;

-- Trigger otomatis insert pengaturan user baru
DELIMITER //
CREATE TRIGGER create_user_settings
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO notification_settings (user_id) VALUES (NEW.id);
    INSERT INTO storage_allocation (user_id, total_space, used_space)
    VALUES (NEW.id, 1073741824, 0)
    ON DUPLICATE KEY UPDATE user_id = user_id;
END//
DELIMITER ;
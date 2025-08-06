// scripts/setup-mysql.js
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupMySQL() {
    console.log('🔄 Setting up MySQL database...');
    
    try {
        // Connect to MySQL
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        console.log('✅ Connected to MySQL server');

        // Read and execute SQL file
        const sqlPath = path.join(__dirname, '..', 'config', 'database.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');
        
        console.log('📄 Executing database schema...');
        await connection.execute(sql);
        
        console.log('✅ MySQL database setup completed successfully!');
        console.log('📊 Tables created:');
        console.log('   - users');
        console.log('   - storage_allocation');
        console.log('   - files');
        console.log('   - teams');
        console.log('   - team_members');
        console.log('   - activities');
        console.log('   - notifications');
        console.log('   - file_sharing');
        console.log('   - notification_settings');
        console.log('   - system_notifications');
        console.log('   - user_system_notifications');
        console.log('   - audit_logs');
        console.log('   - file_share_links');
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ MySQL setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    setupMySQL();
}

export default setupMySQL;
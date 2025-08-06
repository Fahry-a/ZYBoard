// scripts/setup-supabase.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupSupabase() {
    console.log('🔄 Setting up Supabase database...');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
        console.log('💡 Please set these in your .env file:');
        console.log('   SUPABASE_URL=https://your-project.supabase.co');
        console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
        process.exit(1);
    }
    
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        console.log('✅ Connected to Supabase');

        // Test connection
        const { data, error } = await supabase.from('users').select('count').limit(1);
        
        if (error && error.code === 'PGRST116') {
            console.log('📄 Tables not found, they need to be created manually');
            console.log('🔧 Please run the Supabase schema SQL in your Supabase dashboard:');
            console.log('   1. Go to your Supabase dashboard');
            console.log('   2. Navigate to SQL Editor');
            console.log('   3. Run the SQL from supabase-schema.sql');
            console.log('');
            
            // Show the schema file path
            const schemaPath = path.join(__dirname, '..', 'config', 'supabase-schema.sql');
            console.log(`📁 Schema file location: ${schemaPath}`);
            
            // Try to read and display first few lines of schema
            try {
                const schema = await fs.readFile(schemaPath, 'utf8');
                const lines = schema.split('\n').slice(0, 10);
                console.log('📝 Schema preview:');
                lines.forEach(line => console.log(`   ${line}`));
                console.log('   ...');
            } catch (readError) {
                console.log('⚠️ Could not read schema file, but you can find it in the config folder');
            }
            
        } else if (error) {
            throw error;
        } else {
            console.log('✅ Supabase tables already exist and are accessible');
            
            // Check which tables exist
            const tableChecks = [
                'users', 'storage_allocation', 'files', 'teams', 'team_members', 
                'activities', 'notifications', 'file_sharing', 'notification_settings',
                'system_notifications', 'user_system_notifications', 'audit_logs', 
                'file_share_links'
            ];
            
            console.log('🔍 Checking table structure...');
            const existingTables = [];
            
            for (const table of tableChecks) {
                try {
                    const { data, error } = await supabase.from(table).select('*').limit(1);
                    if (!error) {
                        existingTables.push(table);
                    }
                } catch (e) {
                    // Table doesn't exist or no access
                }
            }
            
            console.log('📊 Available tables:');
            existingTables.forEach(table => console.log(`   ✅ ${table}`));
            
            if (existingTables.length < tableChecks.length) {
                const missingTables = tableChecks.filter(t => !existingTables.includes(t));
                console.log('⚠️ Missing tables:');
                missingTables.forEach(table => console.log(`   ❌ ${table}`));
                console.log('💡 Please ensure all tables are created using the provided schema');
            }
        }
        
        console.log('');
        console.log('🎉 Supabase setup verification completed!');
        console.log('💡 Next steps:');
        console.log('   1. Make sure all tables are created in Supabase');
        console.log('   2. Set DB_TYPE=supabase in your .env file');
        console.log('   3. Start your server with npm run dev');
        
    } catch (error) {
        console.error('❌ Supabase setup failed:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('   - Check your SUPABASE_URL is correct');
        console.log('   - Verify your SERVICE_ROLE_KEY has the right permissions');
        console.log('   - Ensure your Supabase project is active');
        process.exit(1);
    }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    setupSupabase();
}

export default setupSupabase;
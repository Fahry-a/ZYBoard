// server/scripts/setup.js
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import setupMySQL from './setup-mysql.js';
import setupSupabase from './setup-supabase.js';
import DatabaseFactory from '../config/database-factory.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function checkEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  try {
    await fs.access(envPath);
    console.log('✅ .env file found');
    return true;
  } catch {
    console.log('❌ .env file not found');
    try {
      await fs.access(envExamplePath);
      console.log('📄 .env.example file found, copying to .env...');
      const envExample = await fs.readFile(envExamplePath, 'utf8');
      await fs.writeFile(envPath, envExample);
      console.log('✅ .env file created from .env.example');
      console.log('⚠️  Please edit .env file with your actual configuration');
      return false;
    } catch {
      console.log('❌ .env.example file not found');
      return false;
    }
  }
}

async function testDatabaseConnection(dbType) {
  try {
    console.log(`🔄 Testing ${dbType} connection...`);
    const db = DatabaseFactory.create(dbType);
    const isConnected = await db.testConnection();
    
    if (isConnected) {
      console.log(`✅ ${dbType} connection successful`);
      return true;
    } else {
      console.log(`❌ ${dbType} connection failed`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${dbType} connection error:`, error.message);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 ZYBoard Backend Setup');
  console.log('========================\n');

  // Check .env file
  const hasEnv = await checkEnvFile();
  if (!hasEnv) {
    console.log('\n⚠️  Please configure your .env file before running setup again.');
    process.exit(1);
  }

  // Re-load environment variables
  dotenv.config();

  console.log('\n📊 Available database options:');
  console.log('1. MySQL/MariaDB');
  console.log('2. Supabase (PostgreSQL)');
  
  let choice;
  if (process.env.DB_TYPE) {
    console.log(`\n📝 Current DB_TYPE in .env: ${process.env.DB_TYPE}`);
    const useExisting = await askQuestion('Use existing DB_TYPE? (y/n): ');
    if (useExisting.toLowerCase() === 'y' || useExisting.toLowerCase() === 'yes') {
      choice = process.env.DB_TYPE === 'mysql' ? '1' : '2';
    }
  }
  
  if (!choice) {
    choice = await askQuestion('\nChoose database type (1 or 2): ');
  }

  let dbType;
  switch (choice) {
    case '1':
      dbType = 'mysql';
      break;
    case '2':
      dbType = 'supabase';
      break;
    default:
      console.log('❌ Invalid choice');
      process.exit(1);
  }

  console.log(`\n🔧 Setting up ${dbType}...`);

  // Test connection first
  const connectionOk = await testDatabaseConnection(dbType);
  
  if (!connectionOk) {
    console.log('\n❌ Database connection failed. Please check your configuration:');
    
    if (dbType === 'mysql') {
      console.log('  - DB_HOST');
      console.log('  - DB_USER');
      console.log('  - DB_PASSWORD');
      console.log('  - DB_NAME');
    } else {
      console.log('  - SUPABASE_URL');
      console.log('  - SUPABASE_SERVICE_ROLE_KEY');
    }
    
    process.exit(1);
  }

  // Run setup
  try {
    if (dbType === 'mysql') {
      await setupMySQL();
    } else {
      await setupSupabase();
    }
    
    console.log('\n🎉 Database setup completed successfully!');
    
    // Final connection test
    console.log('\n🧪 Running final connection test...');
    const finalTest = await testDatabaseConnection(dbType);
    
    if (finalTest) {
      console.log('✅ Final connection test passed');
      
      console.log('\n📋 Next steps:');
      console.log('1. Make sure your WebDAV server is running');
      console.log('2. Configure WebDAV settings in .env:');
      console.log('   - WEBDAV_URL');
      console.log('   - WEBDAV_USERNAME');
      console.log('   - WEBDAV_PASSWORD');
      console.log('3. Start the server: npm run dev');
      
    } else {
      console.log('❌ Final connection test failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  try {
    await setupDatabase();
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    rl.close();
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
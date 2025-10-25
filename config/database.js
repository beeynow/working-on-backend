// ==================== config/database.js ====================
const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Database initialization - create tables if they don't exist
const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table (stores Clerk user data and subscription info)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        clerk_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'free',
        subscription_status VARCHAR(50) DEFAULT 'inactive',
        subscription_plan VARCHAR(50),
        daily_uploads INTEGER DEFAULT 0,
        last_reset_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Files table (tracks all uploaded and converted files)
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(clerk_id) ON DELETE CASCADE,
        filename VARCHAR(500) NOT NULL,
        original_name VARCHAR(500) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_size BIGINT NOT NULL,
        file_path TEXT NOT NULL,
        conversion_status VARCHAR(50) DEFAULT 'pending',
        converted_filename VARCHAR(500),
        converted_path TEXT,
        operation_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        downloaded_at TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);

    // Activity logs table (for admin dashboard)
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(clerk_id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // System stats table (for admin analytics)
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_stats (
        id SERIAL PRIMARY KEY,
        date DATE UNIQUE DEFAULT CURRENT_DATE,
        total_uploads INTEGER DEFAULT 0,
        total_conversions INTEGER DEFAULT 0,
        total_users INTEGER DEFAULT 0,
        active_users INTEGER DEFAULT 0,
        free_users INTEGER DEFAULT 0,
        premium_users INTEGER DEFAULT 0,
        total_storage_mb BIGINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
      CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    await client.query('COMMIT');
    logger.info('Database tables initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDatabase };

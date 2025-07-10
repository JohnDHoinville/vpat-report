// Database Configuration for Accessibility Testing Platform
// PostgreSQL connection configuration

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'accessibility_testing',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
};

// Get current environment configuration
const environment = process.env.NODE_ENV || 'development';
const currentConfig = dbConfig[environment];

// Create connection pool
const pool = new Pool(currentConfig);

// Database connection wrapper
class Database {
  constructor() {
    this.pool = pool;
  }

  async query(text, params) {
    const start = Date.now();
    const res = await this.pool.query(text, params);
    const duration = Date.now() - start;
    
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  }

  async getClient() {
    return await this.pool.connect();
  }

  async end() {
    await this.pool.end();
  }

  // Helper methods for common operations
  async findById(table, id) {
    const query = `SELECT * FROM ${table} WHERE id = $1`;
    const result = await this.query(query, [id]);
    return result.rows[0];
  }

  async findMany(table, conditions = {}, orderBy = 'created_at DESC', limit = 100) {
    let query = `SELECT * FROM ${table}`;
    let params = [];
    let paramCount = 0;

    // Add WHERE conditions
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => {
        paramCount++;
        params.push(conditions[key]);
        return `${key} = $${paramCount}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    // Add ORDER BY
    query += ` ORDER BY ${orderBy}`;
    
    // Add LIMIT
    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async update(table, id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.query(query, [id, ...values]);
    return result.rows[0];
  }

  async delete(table, id) {
    const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
    const result = await this.query(query, [id]);
    return result.rows[0];
  }

  // Test database connection
  async testConnection() {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      console.log('✅ Database connection successful:', result.rows[0].current_time);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  // Initialize database schema
  async initializeSchema() {
    try {
      console.log('🔄 Initializing database schema...');
      
      // Check if tables exist
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `;
      
      const result = await this.query(tablesQuery);
      const existingTables = result.rows.map(row => row.table_name);
      
      console.log(`📋 Found ${existingTables.length} existing tables:`, existingTables);
      
      return existingTables;
    } catch (error) {
      console.error('❌ Error checking database schema:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
const db = new Database();

module.exports = {
  db,
  pool,
  dbConfig: currentConfig
}; 
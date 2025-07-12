const { Pool, Client } = require('pg');
require('dotenv').config();

/**
 * Database Configuration for Accessibility Testing Platform
 * Single-user PostgreSQL setup with connection pooling and helper methods
 */

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'accessibility_testing',
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || '',
    
    // Connection pool settings
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    
    // Additional PostgreSQL settings
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    statement_timeout: 10000,
    query_timeout: 10000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client:', err);
    process.exit(-1);
});

/**
 * Database Helper Class
 * Provides simplified database operations for accessibility testing
 */
class DatabaseHelper {
    constructor() {
        this.pool = pool;
    }

    /**
     * Test database connection
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as current_time');
            client.release();
            
            console.log('✅ Database connection successful:', result.rows[0].current_time);
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
    }

    /**
     * Initialize database schema (check if tables exist)
     * @returns {Promise<Array>} List of existing tables
     */
    async initializeSchema() {
        try {
            const query = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN (
                    'projects', 'site_discovery', 'discovered_pages', 
                    'wcag_requirements', 'section_508_requirements', 
                    'test_sessions', 'automated_test_results', 
                    'manual_test_results', 'violations', 'vpat_reports'
                )
                ORDER BY table_name;
            `;
            
            const result = await this.query(query);
            console.log(`🔄 Initializing database schema...`);
            console.log(`📋 Found ${result.rows.length} tables:`, result.rows.map(r => r.table_name));
            
            return result.rows;
        } catch (error) {
            console.error('❌ Schema initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Execute a query with parameters
     * @param {string} text SQL query text
     * @param {Array} params Query parameters
     * @returns {Promise<Object>} Query result
     */
    async query(text, params = []) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            if (process.env.LOG_LEVEL === 'debug') {
                console.log('🔍 Executed query:', { text, duration, rows: result.rowCount });
            }
            
            return result;
        } catch (error) {
            console.error('❌ Query execution failed:', { text, error: error.message });
            throw error;
        }
    }

    /**
     * Insert a single record
     * @param {string} table Table name
     * @param {Object} data Data to insert
     * @returns {Promise<Object>} Inserted record
     */
    async insert(table, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, index) => `$${index + 1}`);
        
        const query = `
            INSERT INTO ${table} (${keys.join(', ')}) 
            VALUES (${placeholders.join(', ')}) 
            RETURNING *;
        `;
        
        try {
            const result = await this.query(query, values);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                console.log(`⚠️ Record already exists in ${table}:`, error.detail);
                return null;
            }
            throw error;
        }
    }

    /**
     * Find a single record by criteria
     * @param {string} table Table name
     * @param {Object} criteria Where criteria
     * @returns {Promise<Object|null>} Found record or null
     */
    async findOne(table, criteria = {}) {
        const keys = Object.keys(criteria);
        const values = Object.values(criteria);
        
        let whereClause = '';
        if (keys.length > 0) {
            const conditions = keys.map((key, index) => `${key} = $${index + 1}`);
            whereClause = `WHERE ${conditions.join(' AND ')}`;
        }
        
        const query = `SELECT * FROM ${table} ${whereClause} LIMIT 1;`;
        
        const result = await this.query(query, values);
        return result.rows[0] || null;
    }

    /**
     * Find multiple records by criteria
     * @param {string} table Table name
     * @param {Object} criteria Where criteria
     * @param {string} orderBy Order by clause
     * @param {number} limit Limit results
     * @returns {Promise<Array>} Found records
     */
    async findMany(table, criteria = {}, orderBy = '', limit = null) {
        const keys = Object.keys(criteria);
        const values = Object.values(criteria);
        
        let whereClause = '';
        if (keys.length > 0) {
            const conditions = keys.map((key, index) => `${key} = $${index + 1}`);
            whereClause = `WHERE ${conditions.join(' AND ')}`;
        }
        
        let orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
        let limitClause = limit ? `LIMIT ${limit}` : '';
        
        const query = `SELECT * FROM ${table} ${whereClause} ${orderClause} ${limitClause};`;
        
        const result = await this.query(query, values);
        return result.rows;
    }

    /**
     * Update records by criteria
     * @param {string} table Table name
     * @param {Object} data Data to update
     * @param {Object} criteria Where criteria
     * @returns {Promise<Array>} Updated records
     */
    async update(table, data, criteria) {
        const dataKeys = Object.keys(data);
        const dataValues = Object.values(data);
        const criteriaKeys = Object.keys(criteria);
        const criteriaValues = Object.values(criteria);
        
        const setClause = dataKeys.map((key, index) => `${key} = $${index + 1}`).join(', ');
        const whereClause = criteriaKeys.map((key, index) => `${key} = $${dataValues.length + index + 1}`).join(' AND ');
        
        const query = `
            UPDATE ${table} 
            SET ${setClause} 
            WHERE ${whereClause} 
            RETURNING *;
        `;
        
        const result = await this.query(query, [...dataValues, ...criteriaValues]);
        return result.rows;
    }

    /**
     * Delete records by criteria
     * @param {string} table Table name
     * @param {Object} criteria Where criteria
     * @returns {Promise<number>} Number of deleted records
     */
    async delete(table, criteria) {
        const keys = Object.keys(criteria);
        const values = Object.values(criteria);
        const conditions = keys.map((key, index) => `${key} = $${index + 1}`);
        
        const query = `DELETE FROM ${table} WHERE ${conditions.join(' AND ')};`;
        
        const result = await this.query(query, values);
        return result.rowCount;
    }

    /**
     * Execute a transaction
     * @param {Function} callback Function to execute in transaction
     * @returns {Promise<any>} Transaction result
     */
    async transaction(callback) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>} Database statistics
     */
    async getStats() {
        try {
            const tableStats = await this.query(`
                SELECT 
                    schemaname,
                    relname as tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_rows
                FROM pg_stat_user_tables 
                ORDER BY relname;
            `);

            const connectionStats = {
                total: this.pool.totalCount,
                idle: this.pool.idleCount,
                waiting: this.pool.waitingCount
            };

            return {
                tables: tableStats.rows,
                connections: connectionStats,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Failed to get database stats:', error.message);
            return null;
        }
    }

    /**
     * Close database connections
     */
    async end() {
        await this.pool.end();
        console.log('🔌 Database connections closed');
    }
}

// Create and export database helper instance
const db = new DatabaseHelper();

module.exports = {
    db,
    pool,
    dbConfig,
    DatabaseHelper
}; 
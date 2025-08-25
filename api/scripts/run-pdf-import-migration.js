/**
 * Run PDF Import Table Migration
 * Creates the pdf_imports table and related indexes
 */

const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../../database/config');
const { logger } = require('../utils/logger');

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting PDF Import table migration...');
        
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '../database/migrations/create_pdf_imports_table.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');
        
        // Execute the migration
        await client.query('BEGIN');
        
        console.log('📝 Creating pdf_imports table and indexes...');
        await client.query(migrationSQL);
        
        await client.query('COMMIT');
        
        console.log('✅ PDF Import table migration completed successfully!');
        console.log('📋 Created:');
        console.log('   - pdf_imports table');
        console.log('   - Indexes for performance');
        console.log('   - Triggers for updated_at');
        console.log('   - Comments for documentation');
        
        // Verify the table was created
        const checkTableQuery = `
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'pdf_imports' 
            ORDER BY ordinal_position
        `;
        
        const result = await client.query(checkTableQuery);
        console.log(`📊 Table created with ${result.rows.length} columns`);
        
        logger.info('✅ PDF Import migration completed', {
            tableCreated: 'pdf_imports',
            columnCount: result.rows.length
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        logger.error('❌ PDF Import migration failed', { error: error.message });
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = runMigration;

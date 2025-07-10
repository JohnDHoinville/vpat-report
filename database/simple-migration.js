const MigrationService = require('./migration-service');
const { db } = require('./config');

/**
 * Simple Migration Script for Existing Test Data
 * Uses MigrationService to convert JSON files to database records
 */

async function runMigration() {
    console.log('🔄 Starting Simple Migration of Existing Test Data');
    console.log('================================================');
    
    const migrationService = new MigrationService();
    
    try {
        // Test database connection first
        console.log('🔍 Testing database connection...');
        const connected = await db.testConnection();
        
        if (!connected) {
            console.error('❌ Database connection failed. Please check your database setup.');
            process.exit(1);
        }
        
        // Check if database has required tables
        console.log('📋 Checking database schema...');
        const tables = await db.initializeSchema();
        const requiredTables = [
            'projects', 'site_discovery', 'discovered_pages', 
            'test_sessions', 'automated_test_results'
        ];
        
        const missingTables = requiredTables.filter(
            table => !tables.some(t => t.table_name === table)
        );
        
        if (missingTables.length > 0) {
            console.error('❌ Missing required tables:', missingTables);
            console.error('Please run the database schema setup first.');
            process.exit(1);
        }
        
        console.log('✅ Database schema validated');
        
        // Check for existing migrated data
        console.log('🔍 Checking for existing migrated data...');
        const existingProjects = await db.findMany('projects', { 
            name: 'Historical Test Data (Migrated)' 
        });
        
        if (existingProjects.length > 0) {
            console.log('⚠️ Found existing migrated data. This will add to existing records.');
            console.log('   If you want to start fresh, delete the existing project first.');
            
            // Ask for confirmation in a production environment
            // For now, we'll proceed
            console.log('🚀 Proceeding with migration...');
        }
        
        // Run the migration
        const startTime = Date.now();
        await migrationService.migrateAll();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        // Verify migration results
        console.log('\n🔍 Verifying migration results...');
        await verifyMigration();
        
        console.log(`\n🎉 Migration completed successfully in ${duration} seconds!`);
        console.log('\n📋 Next Steps:');
        console.log('   • Review migrated data in database');
        console.log('   • Test API endpoints with migrated data');
        console.log('   • Consider archiving original JSON files');
        console.log('   • Start using database-driven workflows');
        
    } catch (error) {
        console.error('\n💥 Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        console.log('\n🔧 Troubleshooting tips:');
        console.log('   • Check database connection settings in .env');
        console.log('   • Ensure PostgreSQL is running');
        console.log('   • Verify all required tables exist');
        console.log('   • Check file permissions on reports directory');
        
        process.exit(1);
        
    } finally {
        // Always close database connections
        console.log('\n🔌 Closing database connections...');
        await db.end();
    }
}

/**
 * Verify migration results
 */
async function verifyMigration() {
    try {
        // Count migrated records
        const projectCount = await db.query('SELECT COUNT(*) FROM projects WHERE description LIKE \'%migrated%\'');
        const sessionCount = await db.query('SELECT COUNT(*) FROM test_sessions WHERE description LIKE \'%migrated%\'');
        const pageCount = await db.query('SELECT COUNT(*) FROM discovered_pages');
        const resultCount = await db.query('SELECT COUNT(*) FROM automated_test_results WHERE tool_name = \'migrated_data\' OR tool_name IN (\'axe\', \'pa11y\', \'lighthouse\')');
        
        console.log('📊 Migration verification:');
        console.log(`   • Projects: ${projectCount.rows[0].count}`);
        console.log(`   • Test sessions: ${sessionCount.rows[0].count}`);
        console.log(`   • Discovered pages: ${pageCount.rows[0].count}`);
        console.log(`   • Test results: ${resultCount.rows[0].count}`);
        
        // Check for any obvious issues
        const orphanedResults = await db.query(`
            SELECT COUNT(*) FROM automated_test_results 
            WHERE page_id NOT IN (SELECT id FROM discovered_pages)
        `);
        
        if (parseInt(orphanedResults.rows[0].count) > 0) {
            console.log(`⚠️ Warning: ${orphanedResults.rows[0].count} orphaned test results found`);
        } else {
            console.log('✅ No orphaned records found');
        }
        
        // Sample some data to verify structure
        const sampleResult = await db.query(`
            SELECT 
                p.name as project_name,
                ts.name as session_name,
                dp.url,
                atr.tool_name,
                atr.violations_count
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            JOIN projects p ON ts.project_id = p.id
            JOIN discovered_pages dp ON atr.page_id = dp.id
            LIMIT 3
        `);
        
        if (sampleResult.rows.length > 0) {
            console.log('✅ Sample migrated data structure looks good');
            if (process.env.LOG_LEVEL === 'debug') {
                console.log('Sample records:', sampleResult.rows);
            }
        }
        
    } catch (error) {
        console.error('❌ Migration verification failed:', error.message);
        throw error;
    }
}

/**
 * Handle cleanup if migration is interrupted
 */
process.on('SIGINT', async () => {
    console.log('\n🛑 Migration interrupted by user');
    console.log('⚠️ Some data may have been partially migrated');
    console.log('   You can safely re-run the migration script');
    
    try {
        await db.end();
    } catch (error) {
        // Ignore errors during cleanup
    }
    
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Run the migration
if (require.main === module) {
    runMigration();
}

module.exports = {
    runMigration,
    verifyMigration
}; 
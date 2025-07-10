const { db } = require('./database/config');

/**
 * Database Connection Test Script
 * Verifies PostgreSQL setup and schema for accessibility testing platform
 */

async function testDatabaseSetup() {
    console.log('🔍 Testing Database Setup for Accessibility Testing Platform');
    console.log('======================================================');
    
    let allTestsPassed = true;
    
    try {
        // Test 1: Database Connection
        console.log('\n1️⃣ Testing database connection...');
        const connected = await db.testConnection();
        
        if (!connected) {
            console.error('❌ Database connection failed');
            allTestsPassed = false;
            return;
        }
        
        // Test 2: Schema Initialization
        console.log('\n2️⃣ Checking database schema...');
        const tables = await db.initializeSchema();
        
        const expectedTables = [
            'automated_test_results',
            'discovered_pages', 
            'manual_test_results',
            'projects',
            'section_508_requirements',
            'site_discovery',
            'test_sessions',
            'violations',
            'vpat_reports',
            'wcag_requirements'
        ];
        
        const foundTableNames = tables.map(t => t.table_name).sort();
        const missingTables = expectedTables.filter(table => !foundTableNames.includes(table));
        
        if (missingTables.length > 0) {
            console.error('❌ Missing tables:', missingTables);
            allTestsPassed = false;
        } else {
            console.log('✅ All 10 required tables found');
        }
        
        // Test 3: Basic CRUD Operations
        console.log('\n3️⃣ Testing basic database operations...');
        
        // Test INSERT
        const testProject = await db.insert('projects', {
            name: 'Database Test Project',
            client_name: 'Test Client',
            primary_url: 'https://test.example.com',
            description: 'Test project for database connection verification'
        });
        
        if (testProject) {
            console.log('✅ INSERT operation successful');
            
            // Test SELECT
            const foundProject = await db.findOne('projects', { id: testProject.id });
            if (foundProject && foundProject.name === 'Database Test Project') {
                console.log('✅ SELECT operation successful');
            } else {
                console.error('❌ SELECT operation failed');
                allTestsPassed = false;
            }
            
            // Test UPDATE
            const updatedProjects = await db.update('projects', 
                { description: 'Updated test description' }, 
                { id: testProject.id }
            );
            
            if (updatedProjects.length > 0 && updatedProjects[0].description === 'Updated test description') {
                console.log('✅ UPDATE operation successful');
            } else {
                console.error('❌ UPDATE operation failed');
                allTestsPassed = false;
            }
            
            // Test DELETE (cleanup)
            const deletedCount = await db.delete('projects', { id: testProject.id });
            if (deletedCount === 1) {
                console.log('✅ DELETE operation successful');
            } else {
                console.error('❌ DELETE operation failed');
                allTestsPassed = false;
            }
            
        } else {
            console.error('❌ INSERT operation failed');
            allTestsPassed = false;
        }
        
        // Test 4: Foreign Key Relationships
        console.log('\n4️⃣ Testing foreign key relationships...');
        
        // Create a test project for relationship testing
        const relationshipTestProject = await db.insert('projects', {
            name: 'FK Test Project',
            client_name: 'FK Test Client', 
            primary_url: 'https://fk-test.example.com'
        });
        
        if (relationshipTestProject) {
            // Test site_discovery -> projects relationship
            const testDiscovery = await db.insert('site_discovery', {
                project_id: relationshipTestProject.id,
                primary_url: 'https://fk-test.example.com',
                domain: 'fk-test.example.com',
                status: 'completed',
                total_pages_found: 1
            });
            
            if (testDiscovery) {
                console.log('✅ Foreign key relationship (site_discovery -> projects) working');
                
                // Cleanup
                await db.delete('site_discovery', { id: testDiscovery.id });
            } else {
                console.error('❌ Foreign key relationship test failed');
                allTestsPassed = false;
            }
            
            // Cleanup
            await db.delete('projects', { id: relationshipTestProject.id });
        }
        
        // Test 5: Database Statistics
        console.log('\n5️⃣ Testing database statistics...');
        const stats = await db.getStats();
        
        if (stats && stats.tables && stats.connections) {
            console.log('✅ Database statistics available');
            console.log(`📊 Tables with data: ${stats.tables.filter(t => t.live_rows > 0).length}`);
            console.log(`🔗 Active connections: ${stats.connections.total}`);
        } else {
            console.error('❌ Database statistics failed');
            allTestsPassed = false;
        }
        
        // Test 6: Environment Configuration
        console.log('\n6️⃣ Testing environment configuration...');
        
        const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];
        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingEnvVars.length > 0) {
            console.error('❌ Missing environment variables:', missingEnvVars);
            allTestsPassed = false;
        } else {
            console.log('✅ Environment configuration complete');
        }
        
        // Final Results
        console.log('\n======================================================');
        if (allTestsPassed) {
            console.log('🎉 ALL TESTS PASSED! Database setup is complete and ready for use.');
            console.log('\n📋 Next Steps:');
            console.log('   • Run data migration: node database/simple-migration.js');
            console.log('   • Seed WCAG requirements: node database/seed-requirements.js');
            console.log('   • Start API backend: node scripts/dashboard-backend-db.js');
            process.exit(0);
        } else {
            console.log('❌ SOME TESTS FAILED! Please check the errors above and fix before proceeding.');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Test script failed with error:', error.message);
        console.error('Stack trace:', error.stack);
        allTestsPassed = false;
        process.exit(1);
        
    } finally {
        // Always close database connections
        console.log('\n🔌 Closing database connections...');
        await db.end();
    }
}

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

// Run the test
testDatabaseSetup(); 
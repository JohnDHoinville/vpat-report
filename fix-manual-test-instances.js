const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
});

async function fixManualTestInstances() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Starting to fix incorrectly marked manual test instances...');
        
        // First, let's see what manual test instances exist
        const checkQuery = `
            SELECT id, test_method_used, result
            FROM test_instances 
            WHERE session_id = 'b4d036be-ef3b-4c0e-a4f3-84c593d48027'
            AND test_method_used = 'manual'
            LIMIT 5
        `;
        
        const checkResult = await client.query(checkQuery);
        console.log(`📋 Found ${checkResult.rows.length} manual test instances to check`);
        
        if (checkResult.rows.length > 0) {
            console.log('🔍 Sample manual test instance:');
            console.log(JSON.stringify(checkResult.rows[0], null, 2));
        }
        
        // Update all manual test instances to automated since they all have Lighthouse results
        const updateQuery = `
            UPDATE test_instances 
            SET test_method_used = 'automated'
            WHERE session_id = 'b4d036be-ef3b-4c0e-a4f3-84c593d48027'
            AND test_method_used = 'manual'
        `;
        
        const result = await client.query(updateQuery);
        
        console.log(`✅ Fixed ${result.rowCount} test instances from manual to automated`);
        
        // Verify the fix
        const verifyQuery = `
            SELECT 
                COUNT(*) as total_instances,
                COUNT(CASE WHEN test_method_used = 'automated' THEN 1 END) as automated_instances,
                COUNT(CASE WHEN test_method_used = 'manual' THEN 1 END) as manual_instances
            FROM test_instances 
            WHERE session_id = 'b4d036be-ef3b-4c0e-a4f3-84c593d48027'
        `;
        
        const verifyResult = await client.query(verifyQuery);
        const stats = verifyResult.rows[0];
        
        console.log('📊 Updated test instance counts:');
        console.log(`   Total: ${stats.total_instances}`);
        console.log(`   Automated: ${stats.automated_instances}`);
        console.log(`   Manual: ${stats.manual_instances}`);
        
        if (stats.manual_instances > 0) {
            console.log('⚠️  Warning: There are still manual test instances. These might be legitimate manual tests.');
        }
        
    } catch (error) {
        console.error('❌ Error fixing test instances:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the fix
fixManualTestInstances()
    .then(() => {
        console.log('✅ Fix completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    }); 
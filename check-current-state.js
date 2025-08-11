const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
});

async function checkCurrentState() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking current state of test instances and requirements...');
        
        // Check test instances
        const testInstancesQuery = `
            SELECT 
                ti.test_method_used,
                COUNT(*) as count
            FROM test_instances ti
            WHERE ti.session_id = 'b4d036be-ef3b-4c0e-a4f3-84c593d48027'
            GROUP BY ti.test_method_used
        `;
        
        const testInstancesResult = await client.query(testInstancesQuery);
        console.log('\n📊 Test Instances by Method:');
        testInstancesResult.rows.forEach(row => {
            console.log(`  - ${row.test_method_used}: ${row.count}`);
        });
        
        // Check requirements by test method
        const requirementsQuery = `
            SELECT 
                ur.test_method,
                COUNT(*) as count
            FROM unified_requirements ur
            WHERE ur.requirement_id IN (
                SELECT DISTINCT ur2.requirement_id 
                FROM test_instances ti 
                JOIN unified_requirements ur2 ON ti.requirement_id = ur2.id 
                WHERE ti.session_id = 'b4d036be-ef3b-4c0e-a4f3-84c593d48027'
            )
            GROUP BY ur.test_method
        `;
        
        const requirementsResult = await client.query(requirementsQuery);
        console.log('\n📊 Requirements by Test Method:');
        requirementsResult.rows.forEach(row => {
            console.log(`  - ${row.test_method}: ${row.count}`);
        });
        
        // Check a few specific requirements
        const specificQuery = `
            SELECT 
                ur.requirement_id,
                ur.test_method,
                COUNT(ti.id) as instance_count,
                COUNT(CASE WHEN ti.test_method_used = 'automated' THEN 1 END) as automated_count,
                COUNT(CASE WHEN ti.test_method_used = 'manual' THEN 1 END) as manual_count
            FROM unified_requirements ur
            LEFT JOIN test_instances ti ON ur.id = ti.requirement_id 
                AND ti.session_id = 'b4d036be-ef3b-4c0e-a4f3-84c593d48027'
            WHERE ur.requirement_id IN ('1.1.1', '1.2.1', '1.2.2', '1.3.1', '1.4.2')
            GROUP BY ur.requirement_id, ur.test_method
            ORDER BY ur.requirement_id
        `;
        
        const specificResult = await client.query(specificQuery);
        console.log('\n📊 Specific Requirements:');
        specificResult.rows.forEach(row => {
            console.log(`  - ${row.requirement_id}: Required=${row.test_method}, Instances=${row.instance_count} (Auto=${row.automated_count}, Manual=${row.manual_count})`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkCurrentState(); 
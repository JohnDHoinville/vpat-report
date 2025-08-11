const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
});

async function generateWCAGRequirementsTable() {
    const client = await pool.connect();
    
    try {
        console.log('📋 Generating comprehensive WCAG requirements table...\n');
        
        // Get all WCAG requirements
        const query = `
            SELECT 
                requirement_id as criterion,
                title,
                level,
                test_method
            FROM unified_requirements 
            WHERE standard_type = 'wcag'
            ORDER BY requirement_id
        `;
        
        const result = await client.query(query);
        
        console.log('| Criterion | Title | Level | Test Method |');
        console.log('|-----------|-------|-------|-------------|');
        
        result.rows.forEach(row => {
            const criterion = row.criterion.padEnd(8);
            const title = (row.title.length > 50 ? row.title.substring(0, 47) + '...' : row.title).padEnd(53);
            const level = row.level.padEnd(5);
            const testMethod = row.test_method.padEnd(11);
            
            console.log(`| ${criterion} | ${title} | ${level} | ${testMethod} |`);
        });
        
        // Summary statistics
        const summaryQuery = `
            SELECT 
                test_method,
                level,
                COUNT(*) as count
            FROM unified_requirements 
            WHERE standard_type = 'wcag'
            GROUP BY test_method, level
            ORDER BY level, test_method
        `;
        
        const summaryResult = await client.query(summaryQuery);
        
        console.log('\n📊 Summary by Level and Test Method:');
        console.log('| Level | Test Method | Count |');
        console.log('|-------|-------------|-------|');
        
        summaryResult.rows.forEach(row => {
            const level = row.level.padEnd(5);
            const testMethod = row.test_method.padEnd(11);
            const count = row.count.toString().padEnd(5);
            console.log(`| ${level} | ${testMethod} | ${count} |`);
        });
        
        // Total counts
        const totalQuery = `
            SELECT 
                test_method,
                COUNT(*) as count
            FROM unified_requirements 
            WHERE standard_type = 'wcag'
            GROUP BY test_method
            ORDER BY test_method
        `;
        
        const totalResult = await client.query(totalQuery);
        
        console.log('\n📊 Total Requirements by Test Method:');
        totalResult.rows.forEach(row => {
            console.log(`  - ${row.test_method}: ${row.count} requirements`);
        });
        
        // Check Section 508 requirements
        const section508Query = `
            SELECT 
                requirement_id,
                title,
                test_method,
                COUNT(*) as count
            FROM unified_requirements 
            WHERE standard_type = 'section_508'
            GROUP BY requirement_id, title, test_method
            ORDER BY requirement_id
        `;
        
        const section508Result = await client.query(section508Query);
        
        if (section508Result.rows.length > 0) {
            console.log('\n📋 Section 508 Requirements:');
            console.log('| Requirement | Title | Test Method |');
            console.log('|-------------|-------|-------------|');
            
            section508Result.rows.forEach(row => {
                const req = (row.requirement_id || 'N/A').padEnd(11);
                const title = (row.title.length > 40 ? row.title.substring(0, 37) + '...' : row.title).padEnd(43);
                const testMethod = row.test_method.padEnd(11);
                console.log(`| ${req} | ${title} | ${testMethod} |`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

generateWCAGRequirementsTable(); 
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
});

async function fixTestInstancesCorrectly() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Starting to fix test instances based on actual WCAG test method requirements...');
        
        // Get all test instances with their requirements
        const checkQuery = `
            SELECT 
                ti.id,
                ti.test_method_used,
                ti.result,
                ur.requirement_id as criterion_number,
                ur.test_method as required_test_method
            FROM test_instances ti
            JOIN unified_requirements ur ON ti.requirement_id = ur.id
            WHERE ti.session_id = 'b4d036be-ef3b-4c0e-a4f3-84c593d48027'
            ORDER BY ur.requirement_id, ti.test_method_used
        `;
        
        const checkResult = await client.query(checkQuery);
        console.log(`📋 Found ${checkResult.rows.length} test instances to analyze`);
        
        // Group by criterion to understand the current state
        const criterionGroups = {};
        checkResult.rows.forEach(row => {
            if (!criterionGroups[row.criterion_number]) {
                criterionGroups[row.criterion_number] = {
                    required_method: row.required_test_method,
                    instances: []
                };
            }
            criterionGroups[row.criterion_number].instances.push({
                id: row.id,
                current_method: row.test_method_used,
                result: row.result
            });
        });
        
        console.log('\n📊 Current state by criterion:');
        Object.keys(criterionGroups).forEach(criterion => {
            const group = criterionGroups[criterion];
            const methodCounts = {};
            group.instances.forEach(inst => {
                methodCounts[inst.current_method] = (methodCounts[inst.current_method] || 0) + 1;
            });
            console.log(`${criterion}: Required=${group.required_method}, Current=${JSON.stringify(methodCounts)}`);
        });
        
        // Now fix based on actual requirements
        let fixedCount = 0;
        
        for (const [criterion, group] of Object.entries(criterionGroups)) {
            console.log(`\n🔍 Processing criterion ${criterion} (required: ${group.required_method})`);
            
            if (group.required_method === 'manual') {
                // For manual-only requirements, all instances should be manual
                for (const instance of group.instances) {
                    if (instance.current_method !== 'manual') {
                        console.log(`  ❌ Fixing instance ${instance.id}: ${instance.current_method} → manual`);
                        await client.query(
                            'UPDATE test_instances SET test_method_used = $1 WHERE id = $2',
                            ['manual', instance.id]
                        );
                        fixedCount++;
                    }
                }
            } else if (group.required_method === 'automated') {
                // For automated-only requirements, all instances should be automated
                for (const instance of group.instances) {
                    if (instance.current_method !== 'automated') {
                        console.log(`  ❌ Fixing instance ${instance.id}: ${instance.current_method} → automated`);
                        await client.query(
                            'UPDATE test_instances SET test_method_used = $1 WHERE id = $2',
                            ['automated', instance.id]
                        );
                        fixedCount++;
                    }
                }
            } else if (group.required_method === 'both') {
                // For hybrid requirements, we need to determine based on the result
                // If it has Lighthouse results, it should be automated
                // If it has manual results or no results, it should be manual
                for (const instance of group.instances) {
                    let shouldBeMethod = 'manual'; // default
                    
                    // Check if result is a string and contains lighthouse
                    const resultStr = typeof instance.result === 'string' ? instance.result : JSON.stringify(instance.result);
                    if (resultStr && resultStr.includes('"tool":"lighthouse"')) {
                        shouldBeMethod = 'automated';
                    }
                    
                    if (instance.current_method !== shouldBeMethod) {
                        console.log(`  ❌ Fixing instance ${instance.id}: ${instance.current_method} → ${shouldBeMethod} (has lighthouse result: ${resultStr && resultStr.includes('"tool":"lighthouse"')})`);
                        await client.query(
                            'UPDATE test_instances SET test_method_used = $1 WHERE id = $2',
                            [shouldBeMethod, instance.id]
                        );
                        fixedCount++;
                    }
                }
            }
        }
        
        console.log(`\n✅ Fixed ${fixedCount} test instances based on actual WCAG requirements`);
        
        // Show final state
        const finalResult = await client.query(checkQuery);
        console.log('\n📊 Final state by criterion:');
        const finalGroups = {};
        finalResult.rows.forEach(row => {
            if (!finalGroups[row.criterion_number]) {
                finalGroups[row.criterion_number] = {
                    required_method: row.required_test_method,
                    instances: []
                };
            }
            finalGroups[row.criterion_number].instances.push({
                id: row.id,
                current_method: row.test_method_used
            });
        });
        
        Object.keys(finalGroups).forEach(criterion => {
            const group = finalGroups[criterion];
            const methodCounts = {};
            group.instances.forEach(inst => {
                methodCounts[inst.current_method] = (methodCounts[inst.current_method] || 0) + 1;
            });
            console.log(`${criterion}: Required=${group.required_method}, Final=${JSON.stringify(methodCounts)}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixTestInstancesCorrectly(); 
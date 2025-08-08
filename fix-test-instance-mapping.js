const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'accessibility_testing',
    user: 'postgres',
    password: 'postgres'
});

async function fixTestInstanceMapping() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Fixing test instance mapping to automated test results...');
        
        const sessionId = 'b591df2b-fd0c-47a9-bfad-468474c29101';
        
        // Get all automated test results for this session
        const resultsQuery = `
            SELECT atr.*, dp.url as page_url
            FROM automated_test_results atr
            JOIN discovered_pages dp ON atr.page_id = dp.id
            WHERE atr.test_session_id = $1::uuid
            AND atr.status = 'completed'
            ORDER BY atr.executed_at ASC
        `;
        
        const results = await client.query(resultsQuery, [sessionId]);
        console.log(`📊 Found ${results.rows.length} automated test results`);
        
        let updatedCount = 0;
        
        for (const result of results.rows) {
            // Find test instances for this page that are automated and have generic notes
            const testInstancesQuery = `
                SELECT ti.id, ti.status, ti.notes
                FROM test_instances ti
                WHERE ti.session_id = $1::uuid
                AND ti.page_id = $2::uuid
                AND ti.test_method_used = 'automated'
                AND (ti.automated_result_id IS NULL OR ti.notes LIKE '%Automated test completed successfully%')
                LIMIT 1
            `;
            
            const testInstances = await client.query(testInstancesQuery, [sessionId, result.page_id]);
            
            if (testInstances.rows.length > 0) {
                const testInstance = testInstances.rows[0];
                
                // Determine status based on violations
                const hasViolations = result.violations_count > 0;
                const newStatus = hasViolations ? 'failed' : 'passed';
                
                // Create meaningful notes and evidence
                const notes = hasViolations 
                    ? `${result.tool_name} found ${result.violations_count} violation(s)`
                    : `${result.tool_name} found no violations`;
                
                const evidence = JSON.stringify({
                    tool: result.tool_name,
                    violations_count: result.violations_count,
                    passes_count: result.passes_count,
                    warnings_count: result.warnings_count || 0,
                    result: hasViolations ? 'failed' : 'passed',
                    executed_at: result.executed_at,
                    page_url: result.page_url
                });
                
                // Update the test instance
                const updateQuery = `
                    UPDATE test_instances 
                    SET status = $1,
                        automated_result_id = $2::uuid,
                        notes = $3,
                        evidence = $4
                    WHERE id = $5::uuid
                `;
                
                await client.query(updateQuery, [
                    newStatus,
                    result.id,
                    notes,
                    evidence,
                    testInstance.id
                ]);
                
                updatedCount++;
                console.log(`✅ Updated test instance ${testInstance.id} to ${newStatus} (${result.tool_name}: ${result.violations_count} violations)`);
            }
        }
        
        console.log(`🎉 Successfully updated ${updatedCount} test instances`);
        
        // Show final status
        const finalQuery = `
            SELECT test_method_used, status, COUNT(*) as count 
            FROM test_instances 
            WHERE session_id = $1::uuid
            GROUP BY test_method_used, status 
            ORDER BY test_method_used, status
        `;
        
        const finalResult = await client.query(finalQuery, [sessionId]);
        console.log('📊 Final test instance status:');
        finalResult.rows.forEach(row => {
            console.log(`  ${row.test_method_used} - ${row.status}: ${row.count}`);
        });
        
    } catch (error) {
        console.error('❌ Error fixing test instance mapping:', error);
    } finally {
        client.release();
    }
}

// Run the fix
fixTestInstanceMapping()
    .then(() => {
        console.log('🎉 Test instance mapping fix completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Test instance mapping fix failed:', error);
        process.exit(1);
    }); 
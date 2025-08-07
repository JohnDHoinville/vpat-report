const { Pool } = require('pg');

class TestSelectionHandler {
    constructor() {
        this.pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'accessibility_testing',
            user: 'johnhoinville',
            password: ''
        });
    }

    /**
     * Select tests for automated testing - changes status from 'not_started' to 'pending'
     * @param {string} sessionId - The testing session ID
     * @param {Array} testInstanceIds - Array of test instance IDs to select (optional, if not provided selects all automated tests)
     * @param {boolean} selectAll - If true, selects all automated tests in the session
     */
    async selectTestsForAutomation(sessionId, testInstanceIds = null, selectAll = false) {
        try {
            console.log(`🔄 Selecting tests for automation in session: ${sessionId}`);
            
            let query;
            let params;

            if (selectAll) {
                // Select all automated tests that are not_started
                query = `
                    UPDATE test_instances 
                    SET status = 'pending', updated_at = CURRENT_TIMESTAMP
                    WHERE session_id = $1 
                    AND test_method_used IN ('automated', 'hybrid')
                    AND status = 'not_started'
                `;
                params = [sessionId];
            } else if (testInstanceIds && testInstanceIds.length > 0) {
                // Select specific test instances
                const placeholders = testInstanceIds.map((_, index) => `$${index + 2}`).join(',');
                query = `
                    UPDATE test_instances 
                    SET status = 'pending', updated_at = CURRENT_TIMESTAMP
                    WHERE session_id = $1 
                    AND id IN (${placeholders})
                    AND test_method_used IN ('automated', 'hybrid')
                    AND status = 'not_started'
                `;
                params = [sessionId, ...testInstanceIds];
            } else {
                console.log('⚠️ No test instances specified and selectAll is false');
                return { success: false, message: 'No test instances specified' };
            }

            const result = await this.pool.query(query, params);
            console.log(`✅ Selected ${result.rowCount} tests for automation`);

            // Create automated test results entries for the selected tests
            await this.createAutomatedTestResults(sessionId, result.rowCount);

            return { 
                success: true, 
                selectedCount: result.rowCount,
                message: `Selected ${result.rowCount} tests for automation`
            };

        } catch (error) {
            console.error('❌ Error selecting tests for automation:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create automated test results entries for selected tests
     * @param {string} sessionId - The testing session ID
     * @param {number} expectedCount - Expected number of tests selected
     */
    async createAutomatedTestResults(sessionId, expectedCount) {
        try {
            console.log(`📝 Creating automated test results for ${expectedCount} selected tests`);

            // Get the selected test instances that are now pending
            const selectedTestsQuery = `
                SELECT DISTINCT ti.page_id, dp.url
                FROM test_instances ti
                JOIN discovered_pages dp ON ti.page_id = dp.id
                WHERE ti.session_id = $1 
                AND ti.status = 'pending'
                AND ti.test_method_used IN ('automated', 'hybrid')
            `;

            const selectedTests = await this.pool.query(selectedTestsQuery, [sessionId]);
            console.log(`📄 Found ${selectedTests.rows.length} unique pages for automated testing`);

            // Define the tools to run
            const tools = ['axe-core', 'pa11y', 'lighthouse'];

            // Create pending automated test results for each page and tool
            for (const test of selectedTests.rows) {
                for (const tool of tools) {
                    const insertQuery = `
                        INSERT INTO automated_test_results (
                            test_session_id, page_id, tool_name, status, 
                            started_at
                        ) VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)
                        ON CONFLICT (test_session_id, page_id, tool_name) 
                        DO UPDATE SET 
                            status = 'pending',
                            started_at = CURRENT_TIMESTAMP
                    `;

                    await this.pool.query(insertQuery, [sessionId, test.page_id, tool]);
                }
            }

            console.log(`✅ Created automated test results for ${selectedTests.rows.length} pages × ${tools.length} tools`);

        } catch (error) {
            console.error('❌ Error creating automated test results:', error);
        }
    }

    /**
     * Get test selection status for a session
     * @param {string} sessionId - The testing session ID
     */
    async getTestSelectionStatus(sessionId) {
        try {
            const query = `
                SELECT 
                    test_method_used,
                    status,
                    COUNT(*) as count
                FROM test_instances 
                WHERE session_id = $1
                GROUP BY test_method_used, status
                ORDER BY test_method_used, status
            `;

            const result = await this.pool.query(query, [sessionId]);
            
            const status = {
                total: 0,
                byMethod: {},
                byStatus: {},
                readyForAutomation: 0,
                pendingAutomation: 0,
                completed: 0
            };

            result.rows.forEach(row => {
                status.total += parseInt(row.count);
                
                // By method
                if (!status.byMethod[row.test_method_used]) {
                    status.byMethod[row.test_method_used] = {};
                }
                status.byMethod[row.test_method_used][row.status] = parseInt(row.count);

                // By status
                if (!status.byStatus[row.status]) {
                    status.byStatus[row.status] = 0;
                }
                status.byStatus[row.status] += parseInt(row.count);

                // Ready for automation (automated/hybrid tests that are not_started)
                if ((row.test_method_used === 'automated' || row.test_method_used === 'hybrid') && row.status === 'not_started') {
                    status.readyForAutomation += parseInt(row.count);
                }

                // Pending automation
                if (row.status === 'pending') {
                    status.pendingAutomation += parseInt(row.count);
                }

                // Completed tests
                if (['passed', 'failed', 'human_review'].includes(row.status)) {
                    status.completed += parseInt(row.count);
                }
            });

            return status;

        } catch (error) {
            console.error('❌ Error getting test selection status:', error);
            return null;
        }
    }

    /**
     * Reset test selection - set all automated tests back to 'not_started'
     * @param {string} sessionId - The testing session ID
     */
    async resetTestSelection(sessionId) {
        try {
            console.log(`🔄 Resetting test selection for session: ${sessionId}`);

            // Reset automated test instances to not_started
            const resetQuery = `
                UPDATE test_instances 
                SET status = 'not_started', updated_at = CURRENT_TIMESTAMP
                WHERE session_id = $1 
                AND test_method_used IN ('automated', 'hybrid')
                AND status = 'pending'
            `;

            const result = await this.pool.query(resetQuery, [sessionId]);
            console.log(`✅ Reset ${result.rowCount} tests to not_started`);

            // Remove pending automated test results
            const removeResultsQuery = `
                DELETE FROM automated_test_results 
                WHERE test_session_id = $1 
                AND status = 'pending'
            `;

            const removeResult = await this.pool.query(removeResultsQuery, [sessionId]);
            console.log(`✅ Removed ${removeResult.rowCount} pending automated test results`);

            return { 
                success: true, 
                resetCount: result.rowCount,
                removedResults: removeResult.rowCount
            };

        } catch (error) {
            console.error('❌ Error resetting test selection:', error);
            return { success: false, error: error.message };
        }
    }

    async close() {
        await this.pool.end();
    }
}

// Example usage
async function example() {
    const handler = new TestSelectionHandler();
    
    try {
        const sessionId = 'b591df2b-fd0c-47a9-bfad-468474c29101';
        
        // Get current status
        const status = await handler.getTestSelectionStatus(sessionId);
        console.log('📊 Current test selection status:', status);
        
        // Select all automated tests
        const result = await handler.selectTestsForAutomation(sessionId, null, true);
        console.log('✅ Selection result:', result);
        
        // Get updated status
        const updatedStatus = await handler.getTestSelectionStatus(sessionId);
        console.log('📊 Updated test selection status:', updatedStatus);
        
    } catch (error) {
        console.error('❌ Example error:', error);
    } finally {
        await handler.close();
    }
}

// Export for use in other modules
module.exports = TestSelectionHandler;

// Run example if this file is executed directly
if (require.main === module) {
    example();
} 
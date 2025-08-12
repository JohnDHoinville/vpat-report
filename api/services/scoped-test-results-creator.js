/**
 * Scoped Test Results Creator
 * 
 * Creates automated test results entries scoped to specific targets.
 * Replaces the existing createAutomatedTestResultsForSession with 
 * target-aware creation that only affects intended test instances.
 * 
 * @author Development Team
 * @date August 12, 2025
 * @version 1.0.0
 */

const { pool } = require('../../database/config');

class ScopedTestResultsCreator {
    constructor() {
        // Tool compatibility matrix for different WCAG requirements
        this.toolCompatibility = {
            'axe-core': {
                // High compatibility with most automated requirements
                compatible_criteria: ['1.1.1', '1.3.1', '1.4.2', '1.4.3', '2.1.1', '2.1.2', '2.4.1', '2.4.2', '3.1.1', '4.1.1', '4.1.2'],
                description: 'Comprehensive accessibility testing engine'
            },
            'pa11y': {
                // Good compatibility with structural and content requirements
                compatible_criteria: ['1.1.1', '1.3.1', '2.4.1', '2.4.2', '2.4.6', '3.1.1', '4.1.1', '4.1.2'],
                description: 'Command-line accessibility testing tool'
            },
            'lighthouse': {
                // Focus on performance and basic accessibility
                compatible_criteria: ['1.1.1', '2.4.2', '2.4.4', '3.1.1'],
                description: 'Google Lighthouse accessibility audit'
            },
            'contrast-analyzer': {
                // Specialized for color contrast testing
                compatible_criteria: ['1.4.3', '1.4.6', '1.4.11'],
                description: 'Color contrast analysis tool'
            }
        };
    }

    /**
     * Create automated test results for specific targets
     * @param {string} sessionId - Test session ID
     * @param {Array} tools - Array of tool names to use
     * @param {Array} targets - Array of resolved targets from AutomationTargetResolver
     * @param {string} automationRunId - Optional automation run ID for tracking
     * @returns {number} Number of test results created
     */
    async createForTargets(sessionId, tools, targets, automationRunId = null) {
        try {
            console.log(`📝 Creating scoped test results for ${targets.length} targets with tools: ${tools.join(', ')}`);

            if (!targets || targets.length === 0) {
                console.warn('⚠️ No targets provided for test results creation');
                return 0;
            }

            if (!tools || tools.length === 0) {
                throw new Error('Tools array cannot be empty');
            }

            // Get unique pages from targets
            const uniquePages = this.getUniquePages(targets);
            console.log(`📄 Identified ${uniquePages.length} unique pages for testing`);

            let createdCount = 0;
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Create test results for each unique page and applicable tool
                for (const page of uniquePages) {
                    // Get requirements for this page from targets
                    const pageTargets = targets.filter(t => t.page_id === page.page_id);
                    const pageRequirements = this.getUniqueRequirements(pageTargets);

                    for (const tool of tools) {
                        // Check if this tool should test this page based on its requirements
                        const applicableRequirements = this.getApplicableRequirementsForTool(tool, pageRequirements);
                        
                        if (applicableRequirements.length > 0) {
                            const insertQuery = `
                                INSERT INTO automated_test_results (
                                    test_session_id, 
                                    page_id, 
                                    tool_name, 
                                    status,
                                    started_at,
                                    automation_run_id,
                                    target_requirement_id
                                ) VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP, $4, $5)
                                ON CONFLICT (test_session_id, page_id, tool_name) 
                                DO UPDATE SET 
                                    status = 'pending',
                                    started_at = CURRENT_TIMESTAMP,
                                    automation_run_id = EXCLUDED.automation_run_id,
                                    target_requirement_id = EXCLUDED.target_requirement_id
                            `;

                            // Use the first applicable requirement as the primary target
                            // (the worker will apply results to all applicable requirements)
                            const primaryRequirement = applicableRequirements[0].requirement_id;

                            await client.query(insertQuery, [
                                sessionId, 
                                page.page_id, 
                                tool, 
                                automationRunId,
                                primaryRequirement
                            ]);

                            createdCount++;
                            
                            console.log(`✅ Created test result: ${tool} for ${page.url} (targeting ${applicableRequirements.length} requirements)`);
                        } else {
                            console.log(`⏭️ Skipping ${tool} for ${page.url} (no applicable requirements)`);
                        }
                    }
                }

                await client.query('COMMIT');
                
                // Verify entries were actually created
                const verifyQuery = `
                    SELECT COUNT(*) as count 
                    FROM automated_test_results 
                    WHERE test_session_id = $1 
                    AND status = 'pending'
                    ${automationRunId ? 'AND automation_run_id = $2' : ''}
                `;
                
                const verifyParams = automationRunId ? [sessionId, automationRunId] : [sessionId];
                const verifyResult = await client.query(verifyQuery, verifyParams);
                const actualCount = parseInt(verifyResult.rows[0].count);
                
                if (actualCount === 0 && createdCount > 0) {
                    throw new Error('Failed to create automated test results - no pending entries found after creation');
                }
                
                console.log(`🔍 VERIFICATION: ${actualCount} pending automated test results confirmed in database`);
                console.log(`✅ Successfully created ${createdCount} scoped test results`);
                
                return createdCount;

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            console.error('❌ Error creating scoped test results:', error);
            
            // Log additional debug info
            try {
                const debugQuery = `
                    SELECT COUNT(*) as total_instances, COUNT(DISTINCT page_id) as unique_pages 
                    FROM test_instances 
                    WHERE session_id = $1 AND status = 'pending'
                `;
                const debugResult = await pool.query(debugQuery, [sessionId]);
                console.error(`🔍 DEBUG INFO: Session ${sessionId} has ${debugResult.rows[0].total_instances} pending instances across ${debugResult.rows[0].unique_pages} unique pages`);
            } catch (debugError) {
                console.error('Failed to get debug info:', debugError);
            }
            
            throw new Error(`Failed to create scoped test results: ${error.message}`);
        }
    }

    /**
     * Get unique pages from targets
     * @param {Array} targets - Array of target objects
     * @returns {Array} Array of unique page objects
     */
    getUniquePages(targets) {
        const pageMap = new Map();
        
        targets.forEach(target => {
            if (!pageMap.has(target.page_id)) {
                pageMap.set(target.page_id, {
                    page_id: target.page_id,
                    url: target.url,
                    title: target.page_title || target.title
                });
            }
        });
        
        return Array.from(pageMap.values());
    }

    /**
     * Get unique requirements from targets
     * @param {Array} targets - Array of target objects
     * @returns {Array} Array of unique requirement objects
     */
    getUniqueRequirements(targets) {
        const requirementMap = new Map();
        
        targets.forEach(target => {
            if (!requirementMap.has(target.requirement_id)) {
                requirementMap.set(target.requirement_id, {
                    requirement_id: target.requirement_id,
                    criterion_number: target.criterion_number,
                    title: target.requirement_title || target.title,
                    test_method: target.requirement_test_method || target.test_method
                });
            }
        });
        
        return Array.from(requirementMap.values());
    }

    /**
     * Determine which requirements a tool can test
     * @param {string} toolName - Name of the testing tool
     * @param {Array} requirements - Array of requirement objects
     * @returns {Array} Array of requirements this tool can test
     */
    getApplicableRequirementsForTool(toolName, requirements) {
        const toolConfig = this.toolCompatibility[toolName];
        
        if (!toolConfig) {
            // If tool not in compatibility matrix, assume it can test all requirements
            console.warn(`⚠️ Tool ${toolName} not in compatibility matrix, assuming universal compatibility`);
            return requirements;
        }

        return requirements.filter(requirement => {
            // Check if the tool is compatible with this WCAG criterion
            const criterionNumber = requirement.criterion_number;
            const isCompatible = toolConfig.compatible_criteria.includes(criterionNumber);
            
            if (!isCompatible) {
                console.log(`⏭️ ${toolName} skipping ${criterionNumber} (not in compatibility list)`);
            }
            
            return isCompatible;
        });
    }

    /**
     * Update tool compatibility matrix
     * @param {string} toolName - Name of the tool
     * @param {Object} compatibility - Compatibility configuration
     */
    updateToolCompatibility(toolName, compatibility) {
        this.toolCompatibility[toolName] = compatibility;
        console.log(`🔧 Updated compatibility for tool: ${toolName}`);
    }

    /**
     * Get all available tools and their compatibility
     * @returns {Object} Tool compatibility matrix
     */
    getToolCompatibility() {
        return { ...this.toolCompatibility };
    }

    /**
     * Filter tools by requirement compatibility
     * @param {Array} tools - Array of tool names
     * @param {string} criterionNumber - WCAG criterion number (e.g., '2.4.2')
     * @returns {Array} Array of compatible tool names
     */
    filterToolsByRequirement(tools, criterionNumber) {
        return tools.filter(tool => {
            const toolConfig = this.toolCompatibility[tool];
            if (!toolConfig) {
                return true; // Unknown tools are assumed compatible
            }
            return toolConfig.compatible_criteria.includes(criterionNumber);
        });
    }

    /**
     * Create test results for a single page with specific requirements
     * @param {string} sessionId - Test session ID
     * @param {string} pageId - Page ID
     * @param {Array} tools - Array of tool names
     * @param {Array} requirementIds - Array of requirement IDs to target
     * @param {string} automationRunId - Optional automation run ID
     * @returns {number} Number of test results created
     */
    async createForPage(sessionId, pageId, tools, requirementIds = [], automationRunId = null) {
        try {
            console.log(`📝 Creating test results for page ${pageId} with ${tools.length} tools`);

            let createdCount = 0;
            
            for (const tool of tools) {
                // If specific requirements are provided, check tool compatibility
                let shouldCreate = true;
                let primaryRequirement = null;

                if (requirementIds.length > 0) {
                    // Get requirement details to check compatibility
                    const reqQuery = `
                        SELECT requirement_id, ur.requirement_id as criterion_number 
                        FROM unified_requirements ur 
                        WHERE ur.id = ANY($1)
                    `;
                    const reqResult = await pool.query(reqQuery, [requirementIds]);
                    
                    const compatibleReqs = reqResult.rows.filter(req => {
                        const toolConfig = this.toolCompatibility[tool];
                        return !toolConfig || toolConfig.compatible_criteria.includes(req.criterion_number);
                    });

                    shouldCreate = compatibleReqs.length > 0;
                    primaryRequirement = compatibleReqs[0]?.requirement_id || null;
                }

                if (shouldCreate) {
                    const insertQuery = `
                        INSERT INTO automated_test_results (
                            test_session_id, page_id, tool_name, status,
                            started_at, automation_run_id, target_requirement_id
                        ) VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP, $4, $5)
                        ON CONFLICT (test_session_id, page_id, tool_name) 
                        DO UPDATE SET 
                            status = 'pending',
                            started_at = CURRENT_TIMESTAMP,
                            automation_run_id = EXCLUDED.automation_run_id,
                            target_requirement_id = EXCLUDED.target_requirement_id
                    `;

                    await pool.query(insertQuery, [
                        sessionId, pageId, tool, automationRunId, primaryRequirement
                    ]);

                    createdCount++;
                    console.log(`✅ Created test result: ${tool} for page ${pageId}`);
                }
            }

            return createdCount;

        } catch (error) {
            console.error('❌ Error creating test results for page:', error);
            throw new Error(`Failed to create test results for page: ${error.message}`);
        }
    }

    /**
     * Get statistics about created test results
     * @param {string} sessionId - Test session ID
     * @param {string} automationRunId - Optional automation run ID
     * @returns {Object} Statistics object
     */
    async getTestResultsStatistics(sessionId, automationRunId = null) {
        try {
            const query = `
                SELECT 
                    tool_name,
                    status,
                    COUNT(*) as count
                FROM automated_test_results 
                WHERE test_session_id = $1
                ${automationRunId ? 'AND automation_run_id = $2' : ''}
                GROUP BY tool_name, status
                ORDER BY tool_name, status
            `;

            const params = automationRunId ? [sessionId, automationRunId] : [sessionId];
            const result = await pool.query(query, params);

            const stats = {
                total: 0,
                by_tool: {},
                by_status: {}
            };

            result.rows.forEach(row => {
                stats.total += row.count;
                
                if (!stats.by_tool[row.tool_name]) {
                    stats.by_tool[row.tool_name] = {};
                }
                stats.by_tool[row.tool_name][row.status] = row.count;
                
                if (!stats.by_status[row.status]) {
                    stats.by_status[row.status] = 0;
                }
                stats.by_status[row.status] += row.count;
            });

            return stats;

        } catch (error) {
            console.error('❌ Error getting test results statistics:', error);
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }

    /**
     * Clean up test results for a specific automation run
     * @param {string} automationRunId - Automation run ID
     * @returns {number} Number of test results cleaned up
     */
    async cleanupTestResults(automationRunId) {
        try {
            const query = `
                DELETE FROM automated_test_results 
                WHERE automation_run_id = $1 
                AND status IN ('pending', 'cancelled')
            `;

            const result = await pool.query(query, [automationRunId]);
            
            console.log(`🗑️ Cleaned up ${result.rowCount} test results for run ${automationRunId}`);
            return result.rowCount;

        } catch (error) {
            console.error('❌ Error cleaning up test results:', error);
            throw new Error(`Failed to cleanup test results: ${error.message}`);
        }
    }
}

module.exports = ScopedTestResultsCreator;
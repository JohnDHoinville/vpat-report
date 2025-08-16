/**
 * Unified Automation Controller
 * 
 * Main controller class for the unified automation testing architecture.
 * Provides consistent behavior across all automation entry points while 
 * supporting granular targeting from session-wide to single-requirement testing.
 * 
 * @author Development Team
 * @date August 12, 2025
 * @version 1.0.0
 */

const { v4: uuidv4 } = require('uuid');
const AutomationTargetResolver = require('./automation-target-resolver');
const TestAutomationService = require('./test-automation-service');
const { pool } = require('../../database/config');

class UnifiedAutomationController {
    constructor(wsService = null) {
        this.wsService = wsService;
        this.targetResolver = new AutomationTargetResolver();
        this.testAutomationService = new TestAutomationService(wsService);
        this.runningTests = new Map();
    }

    /**
     * Validate automation targets before execution
     * @param {string} sessionId - Test session ID
     * @param {string} targetMode - 'session' | 'requirements' | 'instances'
     * @param {Array} targetIds - Array of target IDs (requirements or instances)
     * @returns {Object} Validation result with errors if any
     */
    async validateTargets(sessionId, targetMode, targetIds = []) {
        try {
            console.log(`🔍 Validating targets: ${targetMode} mode with ${targetIds.length} targets for session ${sessionId}`);

            const validation = {
                valid: true,
                errors: [],
                warnings: [],
                targetCount: 0,
                pageCount: 0
            };

            // Validate session exists
            const sessionQuery = 'SELECT id, status FROM test_sessions WHERE id = $1';
            const sessionResult = await pool.query(sessionQuery, [sessionId]);
            
            if (sessionResult.rows.length === 0) {
                validation.valid = false;
                validation.errors.push(`Session ${sessionId} not found`);
                return validation;
            }

            // Validate target mode
            const validModes = ['session', 'requirements', 'instances'];
            if (!validModes.includes(targetMode)) {
                validation.valid = false;
                validation.errors.push(`Invalid target mode: ${targetMode}. Must be one of: ${validModes.join(', ')}`);
                return validation;
            }

            // Mode-specific validation
            switch (targetMode) {
                case 'session':
                    // For session mode, no specific targets needed
                    const sessionTargets = await this.targetResolver.resolveSessionTargets(sessionId);
                    validation.targetCount = sessionTargets.length;
                    validation.pageCount = new Set(sessionTargets.map(t => t.page_id)).size;
                    break;

                case 'requirements':
                    if (!targetIds || targetIds.length === 0) {
                        validation.valid = false;
                        validation.errors.push('Requirements mode requires at least one requirement ID');
                        return validation;
                    }
                    
                    const requirementTargets = await this.targetResolver.resolveRequirementTargets(sessionId, targetIds);
                    validation.targetCount = requirementTargets.length;
                    validation.pageCount = new Set(requirementTargets.map(t => t.page_id)).size;
                    
                    // Check if all requirement IDs were found
                    const foundRequirementIds = new Set(requirementTargets.map(t => t.requirement_id));
                    const missingRequirements = targetIds.filter(id => !foundRequirementIds.has(id));
                    if (missingRequirements.length > 0) {
                        validation.warnings.push(`Requirements not found or not automated: ${missingRequirements.join(', ')}`);
                    }
                    break;

                case 'instances':
                    if (!targetIds || targetIds.length === 0) {
                        validation.valid = false;
                        validation.errors.push('Instances mode requires at least one test instance ID');
                        return validation;
                    }
                    
                    const instanceTargets = await this.targetResolver.resolveInstanceTargets(sessionId, targetIds);
                    validation.targetCount = instanceTargets.length;
                    validation.pageCount = new Set(instanceTargets.map(t => t.page_id)).size;
                    
                    // Check if all instance IDs were found
                    const foundInstanceIds = new Set(instanceTargets.map(t => t.test_instance_id));
                    const missingInstances = targetIds.filter(id => !foundInstanceIds.has(id));
                    if (missingInstances.length > 0) {
                        validation.warnings.push(`Test instances not found: ${missingInstances.join(', ')}`);
                    }
                    break;
            }

            if (validation.targetCount === 0) {
                validation.valid = false;
                validation.errors.push(`No valid automation targets found for ${targetMode} mode`);
            }

            console.log(`✅ Validation complete: ${validation.valid ? 'VALID' : 'INVALID'}, ${validation.targetCount} targets, ${validation.pageCount} pages`);
            return validation;

        } catch (error) {
            console.error('❌ Error validating targets:', error);
            return {
                valid: false,
                errors: [`Validation failed: ${error.message}`],
                warnings: [],
                targetCount: 0,
                pageCount: 0
            };
        }
    }

    /**
     * Preview automation scope without executing
     * @param {string} sessionId - Test session ID
     * @param {string} targetMode - 'session' | 'requirements' | 'instances'
     * @param {Array} targetIds - Array of target IDs
     * @param {Array} tools - Array of tool names to use
     * @returns {Object} Preview information
     */
    async previewAutomationScope(sessionId, targetMode, targetIds = [], tools = ['axe-core', 'pa11y', 'lighthouse']) {
        try {
            console.log(`🔍 Generating automation scope preview for ${targetMode} mode`);

            // First validate the targets
            const validation = await this.validateTargets(sessionId, targetMode, targetIds);
            if (!validation.valid) {
                return {
                    success: false,
                    errors: validation.errors,
                    warnings: validation.warnings
                };
            }

            // Resolve targets to get detailed information
            let targets = [];
            switch (targetMode) {
                case 'session':
                    targets = await this.targetResolver.resolveSessionTargets(sessionId);
                    break;
                case 'requirements':
                    targets = await this.targetResolver.resolveRequirementTargets(sessionId, targetIds);
                    break;
                case 'instances':
                    targets = await this.targetResolver.resolveInstanceTargets(sessionId, targetIds);
                    break;
            }

            // Group targets by page and requirement for preview
            const pageGroups = {};
            const requirementGroups = {};
            
            targets.forEach(target => {
                // Group by page
                if (!pageGroups[target.page_id]) {
                    pageGroups[target.page_id] = {
                        page_id: target.page_id,
                        url: target.url,
                        title: target.page_title,
                        requirements: []
                    };
                }
                
                // Group by requirement
                const reqKey = target.criterion_number;
                if (!requirementGroups[reqKey]) {
                    requirementGroups[reqKey] = {
                        requirement_id: target.requirement_id,
                        criterion_number: target.criterion_number,
                        title: target.requirement_title,
                        pages: new Set(),
                        instances: 0
                    };
                }
                
                pageGroups[target.page_id].requirements.push({
                    criterion_number: target.criterion_number,
                    title: target.requirement_title
                });
                
                requirementGroups[reqKey].pages.add(target.url);
                requirementGroups[reqKey].instances++;
            });

            // Convert sets to arrays for JSON serialization
            Object.values(requirementGroups).forEach(req => {
                req.pages = Array.from(req.pages);
            });

            const preview = {
                success: true,
                mode: targetMode,
                summary: {
                    total_targets: targets.length,
                    unique_pages: Object.keys(pageGroups).length,
                    unique_requirements: Object.keys(requirementGroups).length,
                    tools: tools.length,
                    estimated_tests: Object.keys(pageGroups).length * tools.length
                },
                scope: {
                    pages: Object.values(pageGroups),
                    requirements: Object.values(requirementGroups),
                    tools: tools
                },
                warnings: validation.warnings
            };

            console.log(`✅ Preview generated: ${preview.summary.total_targets} targets, ${preview.summary.unique_pages} pages, ${preview.summary.unique_requirements} requirements`);
            return preview;

        } catch (error) {
            console.error('❌ Error generating automation preview:', error);
            return {
                success: false,
                errors: [`Preview generation failed: ${error.message}`]
            };
        }
    }

    /**
     * Execute automation with the specified targets
     * @param {string} sessionId - Test session ID
     * @param {Object} config - Automation configuration
     * @returns {Object} Execution result
     */
    async executeAutomation(sessionId, config = {}) {
        try {
            const {
                target_mode = 'session',
                target_ids = [],
                tools = ['axe-core', 'pa11y', 'lighthouse'],
                run_async = true,
                options = {},
                userId,
                clientMetadata = {}
            } = config;

            const runId = uuidv4();
            
            console.log(`🚀 Starting unified automation run ${runId}: ${target_mode} mode with ${target_ids.length} targets`);

            // Validate targets first
            const validation = await this.validateTargets(sessionId, target_mode, target_ids);
            if (!validation.valid) {
                throw new Error(`Target validation failed: ${validation.errors.join(', ')}`);
            }

            // Check if preview mode
            if (options.preview_mode) {
                console.log('📋 Preview mode requested, returning scope without execution');
                return await this.previewAutomationScope(sessionId, target_mode, target_ids, tools);
            }

            // Resolve targets for execution
            let targets = [];
            switch (target_mode) {
                case 'session':
                    targets = await this.targetResolver.resolveSessionTargets(sessionId);
                    break;
                case 'requirements':
                    targets = await this.targetResolver.resolveRequirementTargets(sessionId, target_ids);
                    break;
                case 'instances':
                    targets = await this.targetResolver.resolveInstanceTargets(sessionId, target_ids);
                    break;
            }

            // Create automation run record
            const runRecord = await this.createAutomationRun(runId, sessionId, target_mode, {
                target_ids,
                target_count: targets.length,
                page_count: new Set(targets.map(t => t.page_id)).size,
                tools,
                userId,
                clientMetadata
            });

            // Get unique pages from targets for test execution
            const uniquePages = this.getUniquePages(targets);
            console.log(`📄 Identified ${uniquePages.length} unique pages for testing`);

            // Emit WebSocket events
            if (this.wsService) {
                this.wsService.emitToProject(runRecord.project_id, 'automation_started', {
                    run_id: runId,
                    session_id: sessionId,
                    target_mode,
                    target_count: targets.length,
                    page_count: uniquePages.length,
                    tools,
                    started_at: new Date().toISOString()
                });
            }

            // Track running test
            this.runningTests.set(runId, {
                sessionId,
                target_mode,
                targets: targets.length,
                startedAt: new Date(),
                status: 'running'
            });

            if (run_async) {
                // Execute tests asynchronously
                console.log(`🔄 Starting asynchronous test execution for run ${runId}`);
                this.executeTestsAsync(runId, sessionId, tools, uniquePages, userId, targets, options);
                
                return {
                    success: true,
                    run_id: runId,
                    mode: target_mode,
                    summary: {
                        targets_resolved: targets.length,
                        pages_affected: uniquePages.length,
                        requirements_affected: new Set(targets.map(t => t.requirement_id)).size,
                        tools_used: tools
                    },
                    status: 'started',
                    estimated_duration: `${Math.ceil(uniquePages.length * tools.length / 3)} minutes`
                };
            } else {
                // Execute tests synchronously
                console.log(`⚡ Starting synchronous test execution for run ${runId}`);
                const testResults = await this.testAutomationService.executeAutomatedTests(
                    runId, sessionId, tools, uniquePages, true, true, userId, null, options
                );
                
                // Check if authentication is pending
                if (testResults && testResults.isPending) {
                    console.log(`🔐 Authentication pending - keeping run active for session ${sessionId}`);
                    await this.updateRunStatus(runId, 'running', { 
                        message: testResults.message,
                        authRequired: true,
                        authPending: true,
                        sessionId: sessionId,
                        status: 'awaiting_authentication'
                    });
                    
                    return {
                        success: true,
                        run_id: runId,
                        status: 'awaiting_authentication',
                        message: testResults.message,
                        authRequired: true,
                        instructions: 'Please complete login in browser window and click "Successfully Logged In" button'
                    };
                }
                
                // Update run status with test results
                await this.updateRunStatus(runId, 'completed', { testResults });
                
                return {
                    success: true,
                    run_id: runId,
                    mode: target_mode,
                    summary: {
                        targets_resolved: targets.length,
                        pages_affected: uniquePages.length,
                        requirements_affected: new Set(targets.map(t => t.requirement_id)).size,
                        tools_used: tools,
                        total_issues: testResults.total_issues || 0,
                        critical_issues: testResults.critical_issues || 0,
                        pages_tested: testResults.pages_tested || 0,
                        test_instances_updated: testResults.test_instances_updated || 0
                    },
                    status: 'completed',
                    results: testResults
                };
            }

        } catch (error) {
            console.error('❌ Error executing automation:', error);
            return {
                success: false,
                error: error.message,
                details: error.stack
            };
        }
    }

    /**
     * Create automation run record in database
     * @private
     */
    async createAutomationRun(runId, sessionId, targetMode, metadata) {
        const query = `
            INSERT INTO automation_runs_v2 (
                id, session_id, target_mode, target_metadata, 
                tools_used, created_at, status
            ) VALUES ($1, $2, $3, $4, $5, NOW(), 'running')
            RETURNING *
        `;

        // Get project_id for the session
        const sessionQuery = 'SELECT project_id FROM test_sessions WHERE id = $1';
        const sessionResult = await pool.query(sessionQuery, [sessionId]);
        const projectId = sessionResult.rows[0]?.project_id;

        const result = await pool.query(query, [
            runId,
            sessionId,
            targetMode,
            JSON.stringify(metadata),
            metadata.tools
        ]);

        return { ...result.rows[0], project_id: projectId };
    }

    /**
     * Get automation run status
     * @param {string} runId - Automation run ID
     * @returns {Object} Run status information
     */
    async getAutomationStatus(runId) {
        try {
            const query = `
                SELECT 
                    ar.*,
                    ts.name as session_name,
                    ts.project_id,
                    COUNT(atr.id) as total_tests,
                    COUNT(CASE WHEN atr.status = 'completed' THEN 1 END) as completed_tests,
                    COUNT(CASE WHEN atr.status = 'running' THEN 1 END) as running_tests,
                    COUNT(CASE WHEN atr.status = 'pending' THEN 1 END) as pending_tests
                FROM automation_runs_v2 ar
                JOIN test_sessions ts ON ar.session_id = ts.id
                LEFT JOIN automated_test_results atr ON atr.automation_run_id = ar.id
                WHERE ar.id = $1
                GROUP BY ar.id, ts.name, ts.project_id
            `;

            const result = await pool.query(query, [runId]);
            
            if (result.rows.length === 0) {
                return { success: false, error: 'Automation run not found' };
            }

            const run = result.rows[0];
            const progress = run.total_tests > 0 ? (run.completed_tests / run.total_tests) * 100 : 0;

            return {
                success: true,
                run_id: runId,
                status: run.status,
                target_mode: run.target_mode,
                progress: Math.round(progress),
                tests: {
                    total: run.total_tests,
                    completed: run.completed_tests,
                    running: run.running_tests,
                    pending: run.pending_tests
                },
                session: {
                    id: run.session_id,
                    name: run.session_name,
                    project_id: run.project_id
                },
                timing: {
                    created_at: run.created_at,
                    updated_at: run.updated_at
                },
                metadata: run.target_metadata
            };

        } catch (error) {
            console.error('❌ Error getting automation status:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update automation run status
     * @param {string} runId - Automation run ID
     * @param {string} status - New status ('running', 'completed', 'failed', 'cancelled')
     * @param {Object} data - Additional data to update
     * @returns {Object} Update result
     */
    async updateRunStatus(runId, status, data = {}) {
        try {
            console.log(`📊 Updating unified automation run ${runId} status to ${status}`);

            // Only update columns that actually exist in automation_runs_v2
            let updateData = { status };
            
            if (status === 'completed' || status === 'failed') {
                updateData.completed_at = new Date();
                
                // Set error message if provided and status is failed
                if (status === 'failed' && data.error) {
                    updateData.error_message = data.error;
                }
                
                // Set progress to 100% when completed
                if (status === 'completed') {
                    updateData.progress_percentage = 100;
                }
                
                // Store additional test results data in target_metadata
                if (data.testResults) {
                    const resultsMetadata = {
                        total_issues: data.testResults.total_issues || 0,
                        critical_issues: data.testResults.critical_issues || 0,
                        pages_tested: data.testResults.pages_tested || 0,
                        test_instances_updated: data.testResults.test_instances_updated || 0,
                        evidence_files_created: data.testResults.evidence_files_created || 0,
                        duration_ms: data.testResults.duration || 0,
                        tools_used: data.testResults.tools_used || [],
                        completed_at: new Date().toISOString()
                    };
                    
                    // Merge with existing target_metadata
                    const currentRun = await pool.query('SELECT target_metadata FROM automation_runs_v2 WHERE id = $1', [runId]);
                    const existingMetadata = currentRun.rows[0]?.target_metadata || {};
                    
                    updateData.target_metadata = {
                        ...existingMetadata,
                        results: resultsMetadata
                    };
                }
            }

            // Build dynamic update query
            const setClause = Object.keys(updateData).map((key, i) => 
                `${key} = $${i + 2}`
            ).join(', ');
            
            const query = `
                UPDATE automation_runs_v2 
                SET ${setClause}, updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `;

            const values = [runId, ...Object.values(updateData)];
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                return { success: false, error: 'Automation run not found' };
            }

            const updatedRun = result.rows[0];
            
            // Emit WebSocket event for status change
            if (this.wsService && status === 'completed') {
                const results = updatedRun.target_metadata?.results || {};
                this.wsService.emitToProject(updatedRun.project_id || 'unknown', 'automation_completed', {
                    run_id: runId,
                    session_id: updatedRun.session_id,
                    status: status,
                    target_mode: updatedRun.target_mode,
                    tools_used: updatedRun.tools_used,
                    progress_percentage: updatedRun.progress_percentage,
                    completed_at: updatedRun.completed_at,
                    summary: {
                        total_issues: results.total_issues || 0,
                        critical_issues: results.critical_issues || 0,
                        pages_tested: results.pages_tested || 0,
                        test_instances_updated: results.test_instances_updated || 0,
                        evidence_files_created: results.evidence_files_created || 0,
                        duration_ms: results.duration_ms || 0
                    }
                });
            }

            // Remove from running tests tracking
            this.runningTests.delete(runId);

            console.log(`✅ Automation run ${runId} updated to ${status} successfully`);
            return { success: true, run: updatedRun };

        } catch (error) {
            console.error('❌ Error updating automation run status:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if automation run is complete and update status
     * @param {string} runId - Automation run ID
     * @returns {Object} Check result
     */
    async checkAndUpdateRunCompletion(runId) {
        try {
            // Check if all tests for this run are complete
            const statusQuery = `
                SELECT 
                    COUNT(*) as total_tests,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tests,
                    COUNT(CASE WHEN status = 'running' THEN 1 END) as running_tests,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests
                FROM automated_test_results 
                WHERE automation_run_id = $1
            `;
            
            const result = await pool.query(statusQuery, [runId]);
            const stats = result.rows[0];
            
            console.log(`🔍 Run ${runId} status: ${stats.completed_tests}/${stats.total_tests} complete, ${stats.pending_tests} pending, ${stats.running_tests} running, ${stats.failed_tests} failed`);
            
            // If all tests are complete (no pending or running), mark run as complete
            if (stats.total_tests > 0 && stats.pending_tests === 0 && stats.running_tests === 0) {
                const finalStatus = stats.failed_tests > 0 ? 'completed' : 'completed'; // All completed regardless of failures
                const updateResult = await this.updateRunStatus(runId, finalStatus);
                
                return { 
                    success: true, 
                    completed: true, 
                    status: finalStatus,
                    stats 
                };
            }
            
            return { 
                success: true, 
                completed: false, 
                stats 
            };
            
        } catch (error) {
            console.error('❌ Error checking automation run completion:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute tests asynchronously without blocking
     * @param {string} runId - Automation run ID
     * @param {string} sessionId - Test session ID
     * @param {Array} tools - Array of tool names
     * @param {Array} pages - Array of page objects
     * @param {string} userId - User ID
     * @param {Array} targets - Array of resolved targets
     */
    executeTestsAsync(runId, sessionId, tools, pages, userId, targets, options = {}) {
        // Execute tests in background without blocking
        setImmediate(async () => {
            try {
                console.log(`🚀 Background execution started for run ${runId}`);
                const testResults = await this.testAutomationService.executeAutomatedTests(
                    runId, sessionId, tools, pages, true, true, userId, null, options
                );
                console.log(`✅ Background execution completed for run ${runId}`);
                
                // Update run status with test results
                await this.updateRunStatus(runId, 'completed', { testResults });
            } catch (error) {
                console.error(`❌ Background test execution failed for run ${runId}:`, error);
                // Update run status to failed
                await this.updateRunStatus(runId, 'failed', { error: error.message });
            }
        });
    }

    /**
     * Get unique pages from targets
     * @param {Array} targets - Array of resolved targets
     * @returns {Array} Array of unique page objects
     */
    getUniquePages(targets) {
        const pageMap = new Map();
        
        for (const target of targets) {
            if (!pageMap.has(target.page_id)) {
                pageMap.set(target.page_id, {
                    page_id: target.page_id,
                    url: target.url || target.page_url, // Handle both column names
                    title: target.page_title || target.url || target.page_url || 'Untitled Page'
                });
            }
        }
        
        return Array.from(pageMap.values());
    }

    /**
     * Cancel a running automation
     * @param {string} runId - Automation run ID
     * @returns {Object} Cancellation result
     */
    async cancelAutomation(runId) {
        try {
            // Use the new updateRunStatus method
            const result = await this.updateRunStatus(runId, 'cancelled');
            
            if (!result.success) {
                return result;
            }

            // Remove from running tests tracking
            this.runningTests.delete(runId);

            console.log(`✅ Automation run ${runId} cancelled successfully`);
            return { success: true, message: 'Automation cancelled' };

        } catch (error) {
            console.error('❌ Error cancelling automation:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = UnifiedAutomationController;
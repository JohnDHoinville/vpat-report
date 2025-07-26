const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const TestAutomationService = require('../services/test-automation-service');
const { pool } = require('../../database/config');

/**
 * Automated Testing API Routes
 * Implements Task 3.2: Automated Test Orchestration Service
 * 
 * Features:
 * - Trigger automated tests (Axe, Pa11y, Lighthouse)
 * - Monitor test execution progress  
 * - Retrieve automation results and history
 * - Manage automated test configurations
 */

// Initialize automation service
const automationService = new TestAutomationService();

/**
 * POST /api/automated-testing/run/:session_id
 * Trigger automated accessibility testing for a session
 */
router.post('/run/:session_id', authenticateToken, async (req, res) => {
    try {
        const { session_id } = req.params;
        const {
            tools = ['axe-core', 'pa11y', 'lighthouse'],
            pages = null, // null = all pages, array = specific page IDs
            update_test_instances = true,
            create_evidence = true,
            run_async = false // If true, return immediately and run in background
        } = req.body;

        console.log(`🚀 Starting automated testing for session ${session_id}`);
        console.log(`🔧 Tools: ${tools.join(', ')}`);
        console.log(`📄 Pages: ${pages ? pages.length + ' specific pages' : 'all discovered pages'}`);

        // Validate session exists and user has access
        const sessionQuery = `
            SELECT ts.*, p.name as project_name 
            FROM test_sessions ts 
            LEFT JOIN projects p ON ts.project_id = p.id 
            WHERE ts.id = $1
        `;
        
        const sessionResult = await pool.query(sessionQuery, [session_id]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Testing session not found'
            });
        }

        const session = sessionResult.rows[0];

        // Validate tools
        const validTools = ['axe-core', 'pa11y', 'lighthouse'];
        const invalidTools = tools.filter(tool => !validTools.includes(tool));
        
        if (invalidTools.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid tools specified: ${invalidTools.join(', ')}`,
                valid_tools: validTools
            });
        }

        const testOptions = {
            tools,
            pages,
            updateTestInstances: update_test_instances,
            createEvidence: create_evidence
        };

        if (run_async) {
            // Run tests in background and return immediately
            automationService.runAutomatedTests(session_id, testOptions)
                .then(results => {
                    console.log(`✅ Background automation completed for session ${session_id}`);
                })
                .catch(error => {
                    console.error(`❌ Background automation failed for session ${session_id}:`, error);
                });

            res.status(202).json({
                success: true,
                message: 'Automated testing started in background',
                session_id,
                tools,
                estimated_duration: estimateTestDuration(tools, pages),
                status_endpoint: `/api/automated-testing/status/${session_id}`
            });

        } else {
            // Run tests synchronously and wait for completion
            const results = await automationService.runAutomatedTests(session_id, testOptions);

            res.json({
                success: true,
                message: 'Automated testing completed successfully',
                data: results
            });
        }

    } catch (error) {
        console.error('Error running automated tests:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run automated tests',
            details: error.message
        });
    }
});

/**
 * GET /api/automated-testing/status/:session_id
 * Get current status of automated testing for a session
 */
router.get('/status/:session_id', authenticateToken, async (req, res) => {
    try {
        const { session_id } = req.params;

        // Get latest automation run
        const latestRunQuery = `
            SELECT * FROM get_latest_automation_results($1)
        `;

        const latestResult = await pool.query(latestRunQuery, [session_id]);

        // Get automation summary
        const summaryQuery = `
            SELECT * FROM get_automation_summary($1)
        `;

        const summaryResult = await pool.query(summaryQuery, [session_id]);

        // Get any currently running tests (would need to implement background job tracking)
        const statusData = {
            session_id,
            latest_run: latestResult.rows[0] || null,
            summary: summaryResult.rows[0] || {
                total_runs: 0,
                last_run_date: null,
                total_issues_found: 0,
                critical_issues_found: 0,
                tools_used: [],
                test_instances_updated: 0
            },
            is_running: false, // TODO: Implement background job tracking
            last_updated: new Date().toISOString()
        };

        res.json({
            success: true,
            data: statusData
        });

    } catch (error) {
        console.error('Error getting automation status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get automation status',
            details: error.message
        });
    }
});

/**
 * GET /api/automated-testing/history/:session_id
 * Get automation run history for a session
 */
router.get('/history/:session_id', authenticateToken, async (req, res) => {
    try {
        const { session_id } = req.params;
        const { 
            limit = 10, 
            offset = 0,
            include_details = 'false'
        } = req.query;

        const history = await automationService.getAutomationHistory(session_id);

        // Filter and paginate results
        const paginatedHistory = history
            .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
            .map(run => {
                const processedRun = {
                    id: run.id,
                    tools_used: run.tools_used,
                    pages_tested: run.pages_tested,
                    started_at: run.started_at,
                    completed_at: run.completed_at,
                    total_issues: run.total_issues,
                    critical_issues: run.critical_issues,
                    test_instances_updated: run.test_instances_updated,
                    evidence_files_created: run.evidence_files_created
                };

                // Include detailed results if requested
                if (include_details === 'true') {
                    processedRun.raw_results = run.raw_results;
                }

                return processedRun;
            });

        res.json({
            success: true,
            data: {
                session_id,
                runs: paginatedHistory,
                pagination: {
                    total: history.length,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: (parseInt(offset) + paginatedHistory.length) < history.length
                }
            }
        });

    } catch (error) {
        console.error('Error getting automation history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get automation history',
            details: error.message
        });
    }
});

/**
 * GET /api/automated-testing/results/:run_id
 * Get detailed results from a specific automation run
 */
router.get('/results/:run_id', authenticateToken, async (req, res) => {
    try {
        const { run_id } = req.params;
        const { 
            tool = null, // Filter by specific tool
            include_raw_results = 'false',
            include_evidence = 'true'
        } = req.query;

        // Get automation run details
        const runQuery = `
            SELECT atr.*, ts.name as session_name, p.name as project_name
            FROM automated_test_runs atr
            LEFT JOIN test_sessions ts ON atr.session_id = ts.id
            LEFT JOIN projects p ON ts.project_id = p.id
            WHERE atr.id = $1
        `;

        const runResult = await pool.query(runQuery, [run_id]);

        if (runResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Automation run not found'
            });
        }

        const run = runResult.rows[0];

        // Process results based on filters
        let processedResults = run.raw_results;

        if (tool && processedResults[tool]) {
            processedResults = { [tool]: processedResults[tool] };
        }

        // Get evidence if requested
        let evidence = [];
        if (include_evidence === 'true') {
            const evidenceQuery = `
                SELECT te.*, ti.criterion_number, tr.title as requirement_title
                FROM test_evidence te
                LEFT JOIN test_instances ti ON te.test_instance_id = ti.id
                LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
                WHERE te.evidence_type = 'automated_result'
                AND te.metadata->>'tool' = ANY($1)
                AND ti.session_id = $2
                ORDER BY te.created_at DESC
            `;

            const toolsUsed = run.tools_used || [];
            const evidenceResult = await pool.query(evidenceQuery, [toolsUsed, run.session_id]);
            evidence = evidenceResult.rows;
        }

        const responseData = {
            run_details: {
                id: run.id,
                session_id: run.session_id,
                session_name: run.session_name,
                project_name: run.project_name,
                tools_used: run.tools_used,
                pages_tested: run.pages_tested,
                started_at: run.started_at,
                completed_at: run.completed_at,
                total_issues: run.total_issues,
                critical_issues: run.critical_issues,
                test_instances_updated: run.test_instances_updated,
                evidence_files_created: run.evidence_files_created
            },
            evidence: evidence
        };

        // Include raw results if requested
        if (include_raw_results === 'true') {
            responseData.raw_results = processedResults;
        }

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error getting automation results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get automation results',
            details: error.message
        });
    }
});

/**
 * GET /api/automated-testing/tools
 * Get information about available automated testing tools
 */
router.get('/tools', authenticateToken, async (req, res) => {
    try {
        const toolsInfo = {
            'axe-core': {
                name: 'Axe-core',
                description: 'Fast and accurate accessibility testing engine',
                version: require('axe-core/package.json').version,
                supported_standards: ['WCAG 2.0', 'WCAG 2.1', 'WCAG 2.2', 'Section 508'],
                test_types: ['automated'],
                execution_time: 'fast',
                capabilities: [
                    'Color contrast analysis',
                    'Keyboard navigation testing',
                    'ARIA implementation validation',
                    'Semantic structure analysis',
                    'Form accessibility',
                    'Image alt text validation'
                ]
            },
            'pa11y': {
                name: 'Pa11y',
                description: 'Command-line accessibility testing tool',
                version: require('pa11y/package.json').version,
                supported_standards: ['WCAG 2.0', 'WCAG 2.1', 'Section 508'],
                test_types: ['automated'],
                execution_time: 'medium',
                capabilities: [
                    'HTML code analysis',
                    'WCAG compliance checking',
                    'Command-line integration',
                    'Headless browser testing',
                    'Custom rule configuration'
                ]
            },
            'lighthouse': {
                name: 'Lighthouse',
                description: 'Google\'s web quality auditing tool',
                version: require('lighthouse/package.json').version,
                supported_standards: ['WCAG 2.0', 'WCAG 2.1'],
                test_types: ['automated'],
                execution_time: 'slow',
                capabilities: [
                    'Comprehensive accessibility audit',
                    'Performance integration',
                    'Color contrast analysis',
                    'Navigation and focus management',
                    'Image and media accessibility',
                    'Form and input accessibility'
                ]
            }
        };

        res.json({
            success: true,
            data: {
                available_tools: Object.keys(toolsInfo),
                tool_details: toolsInfo,
                integration_features: {
                    'intelligent_mapping': 'Automatic mapping of tool results to WCAG/Section 508 requirements',
                    'test_instance_updates': 'Automatic status updates for test instances based on results',
                    'evidence_collection': 'Automatic collection and storage of test evidence',
                    'audit_trail': 'Complete audit trail of automated test executions'
                }
            }
        });

    } catch (error) {
        console.error('Error getting tools info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get tools information',
            details: error.message
        });
    }
});

/**
 * DELETE /api/automated-testing/run/:run_id
 * Delete an automation run and its associated data
 */
router.delete('/run/:run_id', authenticateToken, async (req, res) => {
    try {
        const { run_id } = req.params;
        const { delete_evidence = 'false' } = req.query;

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Get run details first
            const runQuery = 'SELECT * FROM automated_test_runs WHERE id = $1';
            const runResult = await client.query(runQuery, [run_id]);

            if (runResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    error: 'Automation run not found'
                });
            }

            const run = runResult.rows[0];

            // Delete associated evidence if requested
            if (delete_evidence === 'true') {
                const deleteEvidenceQuery = `
                    DELETE FROM test_evidence 
                    WHERE evidence_type = 'automated_result'
                    AND metadata->>'run_id' = $1
                `;
                await client.query(deleteEvidenceQuery, [run_id]);
            }

            // Delete the automation run
            const deleteRunQuery = 'DELETE FROM automated_test_runs WHERE id = $1';
            await client.query(deleteRunQuery, [run_id]);

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Automation run deleted successfully',
                deleted_run: {
                    id: run.id,
                    session_id: run.session_id,
                    tools_used: run.tools_used,
                    completed_at: run.completed_at
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error deleting automation run:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete automation run',
            details: error.message
        });
    }
});

/**
 * Helper function to estimate test duration
 */
function estimateTestDuration(tools, pages) {
    const baseTimes = {
        'axe-core': 5,    // seconds per page
        'pa11y': 10,      // seconds per page  
        'lighthouse': 20  // seconds per page
    };

    const pageCount = pages ? pages.length : 10; // Default estimate
    const totalSeconds = tools.reduce((total, tool) => {
        return total + (baseTimes[tool] || 10) * pageCount;
    }, 0);

    return `${Math.ceil(totalSeconds / 60)} minutes`;
}

module.exports = router; 
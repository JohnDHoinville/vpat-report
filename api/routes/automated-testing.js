const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const TestAutomationService = require('../services/test-automation-service');

// Export a function that creates the router with websocket service
module.exports = function(wsService) {
    const router = express.Router();
    
    // Initialize automation service with websocket support
    const automationService = new TestAutomationService(wsService);

/**
 * Trigger automated tests for a testing session
 * POST /api/automated-testing/run/:sessionId
 */
router.post('/run/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { 
            tools = ['axe', 'pa11y'], // Default tools
            run_async = true,
            pages = null, // Specific pages to test, null = all pages
            requirements = null, // Specific requirements to test, null = all requirements
            update_test_instances = true,
            create_evidence = true,
            max_pages = 100 // Maximum number of pages to test
        } = req.body;

        console.log(`🤖 Starting automated tests for session ${sessionId} with tools: ${tools.join(', ')}`);

        // Validate tools
        const validTools = ['axe', 'pa11y', 'lighthouse', 'contrast-analyzer', 'mobile-accessibility', 'wave', 'form-accessibility', 'heading-structure', 'migrated_data', 'playwright', 'playwright-axe', 'playwright-lighthouse', 'cypress', 'selenium', 'webdriver'];
        const invalidTools = tools.filter(tool => !validTools.includes(tool));
        if (invalidTools.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid tools: ${invalidTools.join(', ')}. Valid tools: ${validTools.join(', ')}`
            });
        }

        // Start automation run
        const result = await automationService.runAutomatedTests(sessionId, {
            tools,
            runAsync: run_async,
            pages,
            requirements,
            updateTestInstances: update_test_instances,
            createEvidence: create_evidence,
            maxPages: max_pages,
            userId: req.user.userId,
            clientMetadata: {
                client_ip: req.ip || req.connection.remoteAddress || 'unknown',
                user_agent: req.get('User-Agent') || 'unknown',
                request_timestamp: new Date().toISOString()
            }
        });

        res.json({
            success: true,
            message: 'Automated tests started successfully',
            data: result,
            tools: tools,
            session_id: sessionId,
            run_id: result.run_id
        });

    } catch (error) {
        console.error('Error running automated tests:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to start automated tests'
        });
    }
});

/**
 * Get automation status for a session
 * GET /api/automated-testing/status/:sessionId
 */
router.get('/status/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const status = await automationService.getAutomationStatus(sessionId);
        
        res.json({
            success: true,
            data: {
                session_id: sessionId,
                status: status.current_status,
                summary: status.summary,
                latest_run: status.latest_run,
                total_runs: status.total_runs
            }
        });

    } catch (error) {
        console.error('Error getting automation status:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get automation status'
        });
    }
});

/**
 * Review automated test result
 * POST /api/automated-testing/review/:instanceId
 */
router.post('/review/:instanceId', authenticateToken, async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { action, notes } = req.body; // action: 'approve' or 'reject'
        
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid action. Must be "approve" or "reject"'
            });
        }

        const { db } = require('../../database/config');
        
        // Update test instance status based on review
        const newStatus = action === 'approve' ? 'passed' : 'failed';
        
        const updateQuery = `
            UPDATE test_instances 
            SET 
                status = $1,
                reviewed_by = $2,
                reviewed_at = CURRENT_TIMESTAMP,
                review_notes = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;
        
        const result = await db.query(updateQuery, [
            newStatus,
            req.user.userId,
            notes || null,
            instanceId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        // Log the review action
        const auditQuery = `
            INSERT INTO test_audit_log (
                session_id, test_instance_id, action, user_id, 
                details, timestamp
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `;
        
        await db.query(auditQuery, [
            result.rows[0].session_id,
            instanceId,
            `automated_test_review_${action}`,
            req.user.userId,
            JSON.stringify({
                previous_status: 'passed_review_required',
                new_status: newStatus,
                review_notes: notes,
                action: action
            })
        ]);

        res.json({
            success: true,
            message: `Automated test ${action}d successfully`,
            data: {
                instance_id: instanceId,
                new_status: newStatus,
                reviewed_by: req.user.userId,
                reviewed_at: new Date().toISOString(),
                review_notes: notes
            }
        });

    } catch (error) {
        console.error('Error reviewing automated test:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to review automated test'
        });
    }
});

/**
 * Get test instances requiring review
 * GET /api/automated-testing/review-required/:sessionId
 */
router.get('/review-required/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        
        const { db } = require('../../database/config');
        
        const offset = (page - 1) * limit;
        
        const query = `
            SELECT 
                ti.id,
                ti.status,
                ti.created_at,
                ti.updated_at,
                ti.reviewed_by,
                ti.reviewed_at,
                ti.review_notes,
                tr.criterion_number,
                tr.title as requirement_title,
                dp.url as page_url,
                dp.title as page_title,
                u.username as reviewer_name
            FROM test_instances ti
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN users u ON ti.reviewed_by = u.id
            WHERE ti.session_id = $1 
            AND ti.status = 'passed_review_required'
            ORDER BY ti.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const result = await db.query(query, [sessionId, limit, offset]);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM test_instances 
            WHERE session_id = $1 
            AND status = 'passed_review_required'
        `;
        
        const countResult = await db.query(countQuery, [sessionId]);
        
        res.json({
            success: true,
            data: {
                instances: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].total),
                    total_pages: Math.ceil(countResult.rows[0].total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting review required instances:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get review required instances'
        });
    }
});

/**
 * Get automation history for a session
 * GET /api/automated-testing/history/:sessionId
 */
router.get('/history/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { limit = 10, offset = 0 } = req.query;
        
        const history = await automationService.getAutomationHistory(sessionId, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        res.json({
            success: true,
            data: {
                session_id: sessionId,
                runs: history.runs,
                pagination: history.pagination
            }
        });

    } catch (error) {
        console.error('Error getting automation history:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get automation history'
        });
    }
});

/**
 * Get detailed results for a specific automation run
 * GET /api/automated-testing/results/:runId
 */
router.get('/results/:runId', authenticateToken, async (req, res) => {
    try {
        const { runId } = req.params;
        
        const results = await automationService.getAutomationResults(runId);
        
        res.json({
            success: true,
            data: {
                run_id: runId,
                results: results.detailed_results,
                summary: results.summary,
                evidence: results.evidence_files,
                test_instances_updated: results.test_instances_updated
            }
        });

    } catch (error) {
        console.error('Error getting automation results:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get automation results'
        });
    }
});

/**
 * Get available automation tools
 * GET /api/automated-testing/tools
 */
router.get('/tools', authenticateToken, async (req, res) => {
    try {
        const availableTools = await automationService.getAvailableTools();
        
        res.json({
            success: true,
            tools: availableTools,
            message: 'Available automation tools retrieved successfully'
        });

    } catch (error) {
        console.error('Error getting available tools:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get available tools'
        });
    }
});

/**
 * Configure automation tools
 * POST /api/automated-testing/tools
 */
router.post('/tools', authenticateToken, async (req, res) => {
    try {
        const { tools, configuration } = req.body;
        
        const result = await automationService.configureTools(tools, configuration);
        
        res.json({
            success: true,
            message: 'Automation tools configured successfully',
            data: result
        });

    } catch (error) {
        console.error('Error configuring tools:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to configure tools'
        });
    }
});

/**
 * Get automation run status (GET version for status checking)
 * GET /api/automated-testing/run/:sessionId
 */
router.get('/run/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const status = await automationService.getAutomationStatus(sessionId);
        
        res.json({
            success: true,
            data: {
                session_id: sessionId,
                status: status.current_status,
                summary: status.summary,
                latest_run: status.latest_run,
                total_runs: status.total_runs
            }
        });

    } catch (error) {
        console.error('Error getting automation run status:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get automation run status'
        });
    }
});

/**
 * Cancel a running automation run
 * DELETE /api/automated-testing/run/:runId
 */
router.delete('/run/:runId', authenticateToken, async (req, res) => {
    try {
        const { runId } = req.params;
        
        const result = await automationService.cancelAutomationRun(runId, req.user.userId);
        
        res.json({
            success: true,
            message: 'Automation run cancelled successfully',
            data: {
                run_id: runId,
                cancelled_at: result.cancelled_at,
                reason: 'User requested cancellation'
            }
        });

    } catch (error) {
        console.error('Error cancelling automation run:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to cancel automation run'
        });
    }
});

/**
 * Run automated test for a specific test instance
 * POST /api/automated-testing/run-instance/:instanceId
 */
router.post('/run-instance/:instanceId', authenticateToken, async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { tools = ['axe'] } = req.body;
        
        const result = await automationService.runTestForInstance(instanceId, {
            tools,
            userId: req.user.userId
        });
        
        res.json({
            success: true,
            message: 'Automated test for instance completed',
            data: {
                instance_id: instanceId,
                results: result.results,
                status_updated: result.status_updated,
                evidence_created: result.evidence_created
            }
        });

    } catch (error) {
        console.error('Error running automated test for instance:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to run automated test for instance'
        });
    }
});

/**
 * Get automation configuration and settings
 * GET /api/automated-testing/config
 */
router.get('/config', authenticateToken, async (req, res) => {
    try {
        const config = await automationService.getAutomationConfig();
        
        res.json({
            success: true,
            data: {
                config: config,
                supported_standards: ['WCAG 2.1', 'WCAG 2.2', 'Section 508'],
                parallel_execution: true,
                evidence_collection: true
            }
        });

    } catch (error) {
        console.error('Error getting automation config:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get automation config'
        });
    }
});

/**
 * Get automation results for a specific test instance
 * GET /api/automated-testing/instance-results/:instanceId
 */
router.get('/instance-results/:instanceId', authenticateToken, async (req, res) => {
    try {
        const { instanceId } = req.params;
        
        console.log(`🔍 Getting automation results for test instance: ${instanceId}`);
        
        // Query automation results from the database
        const { pool } = require('../../database/config');
        
        const query = `
            SELECT 
                atr.id,
                atr.test_session_id,
                atr.tool_name,
                atr.tool_version,
                atr.raw_results,
                atr.violations_count,
                atr.warnings_count,
                atr.passes_count,
                atr.test_duration_ms,
                atr.executed_at,
                atr.browser_name,
                atr.viewport_width,
                atr.viewport_height,
                atr.test_environment,
                atr.test_suite
            FROM automated_test_results atr
            JOIN test_instances ti ON ti.session_id = atr.test_session_id
            WHERE ti.id = $1
            ORDER BY atr.executed_at DESC
        `;
        
        const result = await pool.query(query, [instanceId]);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            message: `Found ${result.rows.length} automation results for test instance`
        });

    } catch (error) {
        console.error('Error getting automation results:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get automation results'
        });
    }
});

// Get detailed specialized analysis results for a test instance
router.get('/specialized-analysis/:instanceId', authenticateToken, async (req, res) => {
    try {
        const { instanceId } = req.params;
        
        // Get test instance with result data
        const query = `
            SELECT ti.*, tr.criterion_number, tr.title as requirement_title,
                   tr.test_method
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ti.id = $1
        `;
        
        const result = await pool.query(query, [instanceId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Test instance not found' });
        }
        
        const testInstance = result.rows[0];
        
        if (!testInstance.result) {
            return res.status(404).json({ error: 'No result data available for this test instance' });
        }
        
        let resultData;
        try {
            resultData = typeof testInstance.result === 'string' ? JSON.parse(testInstance.result) : testInstance.result;
        } catch (e) {
            return res.status(500).json({ error: 'Invalid result data format' });
        }
        
        // Extract specialized analysis data
        const specializedAnalysis = {
            test_instance_id: instanceId,
            requirement: {
                criterion_number: testInstance.criterion_number,
                title: testInstance.requirement_title,
                test_method: testInstance.test_method
            },
            summary: {
                status: testInstance.status,
                confidence_level: testInstance.confidence_level,
                total_violations: resultData.automated_analysis?.total_violations || 0,
                critical_violations: resultData.automated_analysis?.critical_violations || 0,
                tools_used: resultData.automated_analysis?.tools_used || [],
                test_timestamp: resultData.automated_analysis?.test_timestamp,
                test_duration_ms: resultData.automated_analysis?.test_duration_ms
            },
            specialized_analysis: resultData.automated_analysis?.specialized_analysis || {},
            remediation_guidance: resultData.automated_analysis?.remediation_guidance || [],
            tool_results: resultData.automated_analysis?.tool_results || {}
        };
        
        res.json(specializedAnalysis);
        
    } catch (error) {
        console.error('Error retrieving specialized analysis:', error);
        res.status(500).json({ error: 'Failed to retrieve specialized analysis data' });
    }
});

// Get remediation guidance for a session
router.get('/remediation-guidance/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        
        // Get all test instances with remediation guidance for the session
        const query = `
            SELECT ti.id, ti.status, ti.result, ti.tested_at,
                   tr.criterion_number, tr.title as requirement_title,
                   cdp.url as page_url, cdp.title as page_title
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN crawler_discovered_pages cdp ON ti.page_id = cdp.id
            WHERE ti.session_id = $1 AND ti.result IS NOT NULL
            ORDER BY ti.tested_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const result = await pool.query(query, [sessionId, limit, offset]);
        
        const remediationItems = [];
        
        for (const instance of result.rows) {
            if (!instance.result) continue;
            
            let resultData;
            try {
                resultData = typeof instance.result === 'string' ? JSON.parse(instance.result) : instance.result;
            } catch (e) {
                continue;
            }
            
            if (resultData.automated_analysis?.remediation_guidance) {
                resultData.automated_analysis.remediation_guidance.forEach(guidance => {
                    remediationItems.push({
                        test_instance_id: instance.id,
                        requirement: instance.criterion_number,
                        requirement_title: instance.requirement_title,
                        page_url: instance.page_url,
                        page_title: instance.page_title,
                        status: instance.status,
                        tested_at: instance.tested_at,
                        ...guidance
                    });
                });
            }
        }
        
        // Count total items for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM test_instances ti
            WHERE ti.session_id = $1 AND ti.result IS NOT NULL
        `;
        
        const countResult = await pool.query(countQuery, [sessionId]);
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            remediation_items: remediationItems,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error retrieving remediation guidance:', error);
        res.status(500).json({ error: 'Failed to retrieve remediation guidance' });
    }
});

    return router;
}; 
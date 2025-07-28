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
            tools = ['axe-core', 'pa11y'], // Default tools
            run_async = true,
            pages = null, // Specific pages to test, null = all pages
            requirements = null, // Specific requirements to test, null = all requirements
            update_test_instances = true,
            create_evidence = true 
        } = req.body;

        console.log(`🤖 Starting automated tests for session ${sessionId} with tools: ${tools.join(', ')}`);

        // Validate tools
        const validTools = ['axe-core', 'pa11y', 'lighthouse'];
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
        const { tools = ['axe-core'] } = req.body;
        
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
 * GET /api/automated-testing/results/:instanceId
 */
router.get('/results/:instanceId', authenticateToken, async (req, res) => {
    try {
        const { instanceId } = req.params;
        
        console.log(`🔍 Getting automation results for test instance: ${instanceId}`);
        
        // Query automation results from the database
        const { pool } = require('../server');
        
        const query = `
            SELECT 
                atr.id,
                atr.session_id,
                atr.status,
                atr.tools_used,
                atr.result,
                atr.issues_found,
                atr.summary,
                atr.created_at,
                atr.completed_at,
                atr.created_by
            FROM automated_test_runs atr
            JOIN test_instances ti ON ti.session_id = atr.session_id
            WHERE ti.id = $1
            ORDER BY atr.created_at DESC
        `;
        
        const result = await pool.query(query, [instanceId]);
        
        res.json({
            success: true,
            results: result.rows,
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

    return router;
}; 
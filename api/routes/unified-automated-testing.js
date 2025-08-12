/**
 * Unified Automated Testing API Routes
 * 
 * Single API endpoint for all automation needs, providing consistent behavior
 * across all automation entry points with support for multiple targeting modes.
 * 
 * @author Development Team
 * @date August 12, 2025
 * @version 1.0.0
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const UnifiedAutomationController = require('../services/unified-automation-controller');

module.exports = (wsService) => {
    const router = express.Router();

/**
 * Unified Automation Endpoint
 * POST /api/automated-testing/unified-run/:sessionId
 * 
 * The single entry point for all automation needs, supporting:
 * - Session-wide automation (all automated requirements)
 * - Requirement-specific automation (selected requirements)
 * - Instance-specific automation (individual test instances)
 */
router.post('/unified-run/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            target_mode = 'session',           // 'session' | 'requirements' | 'instances'
            target_ids = [],                   // Array of requirement IDs or instance IDs
            tools = ['axe-core', 'pa11y', 'lighthouse'], // Tools to use
            run_async = true,                  // Whether to run asynchronously
            options = {}                       // Additional options (preview_mode, force_retest, etc.)
        } = req.body;

        console.log(`🚀 UNIFIED AUTOMATION REQUEST: ${target_mode} mode for session ${sessionId}`);
        console.log(`🎯 Targets: ${target_ids.length} IDs, Tools: ${tools.join(', ')}, Async: ${run_async}`);
        console.log(`🔧 Options:`, options);
        console.log(`👤 User: ${req.user?.id || 'unknown'}`);

        // Get WebSocket service
        const wsService = req.app.get('wsService');
        
        // Initialize unified automation controller
        const controller = new UnifiedAutomationController(wsService);

        // Validate input parameters
        const validationErrors = validateUnifiedAutomationRequest(target_mode, target_ids, tools, options);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request parameters',
                validation_errors: validationErrors,
                help: {
                    target_mode: 'Must be one of: session, requirements, instances',
                    target_ids: 'Array of UUIDs (required for requirements/instances modes)',
                    tools: 'Array of tool names (axe-core, pa11y, lighthouse, contrast-analyzer)',
                    options: 'Object with preview_mode, force_retest, etc.'
                }
            });
        }

        // Handle preview mode - return scope without execution
        if (options.preview_mode) {
            console.log('📋 Preview mode requested - generating scope preview');
            const preview = await controller.previewAutomationScope(sessionId, target_mode, target_ids, tools);
            
            return res.json({
                success: preview.success,
                mode: 'preview',
                ...preview
            });
        }

        // Execute automation
        const config = {
            target_mode,
            target_ids,
            tools,
            run_async,
            options,
            userId: req.user.id,
            clientMetadata: {
                client_ip: req.ip || req.connection?.remoteAddress || 'unknown',
                user_agent: req.get('User-Agent') || 'unknown',
                request_timestamp: new Date().toISOString(),
                endpoint: 'unified-run',
                target_mode
            }
        };

        const result = await controller.executeAutomation(sessionId, config);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: `Automation started successfully in ${target_mode} mode`,
                data: result,
                endpoint_info: {
                    version: '2.0',
                    unified: true,
                    capabilities: ['session', 'requirements', 'instances', 'preview'],
                    real_time_updates: true
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
                details: result.details,
                endpoint_info: {
                    version: '2.0',
                    unified: true,
                    troubleshooting: 'Check target validation and session status'
                }
            });
        }

    } catch (error) {
        console.error('❌ Unified automation endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during automation execution',
            message: error.message,
            endpoint_info: {
                version: '2.0',
                unified: true,
                support: 'Check logs for detailed error information'
            }
        });
    }
});

/**
 * Get Automation Run Status
 * GET /api/automated-testing/unified-run/:sessionId/status/:runId
 */
router.get('/unified-run/:sessionId/status/:runId', authenticateToken, async (req, res) => {
    try {
        const { sessionId, runId } = req.params;
        
        console.log(`📊 Getting status for automation run: ${runId}`);

        const wsService = req.app.get('wsService');
        const controller = new UnifiedAutomationController(wsService);
        
        const status = await controller.getAutomationStatus(runId);
        
        res.json({
            success: status.success,
            data: status.success ? status : null,
            error: status.success ? null : status.error,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting automation status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get automation status',
            message: error.message
        });
    }
});

/**
 * Cancel Automation Run
 * DELETE /api/automated-testing/unified-run/:sessionId/:runId
 */
router.delete('/unified-run/:sessionId/:runId', authenticateToken, async (req, res) => {
    try {
        const { sessionId, runId } = req.params;
        
        console.log(`🛑 Cancelling automation run: ${runId}`);

        const wsService = req.app.get('wsService');
        const controller = new UnifiedAutomationController(wsService);
        
        const result = await controller.cancelAutomation(runId);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Automation run cancelled successfully',
                run_id: runId
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                run_id: runId
            });
        }

    } catch (error) {
        console.error('❌ Error cancelling automation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel automation',
            message: error.message
        });
    }
});

/**
 * Preview Automation Scope
 * POST /api/automated-testing/unified-run/:sessionId/preview
 */
router.post('/unified-run/:sessionId/preview', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            target_mode = 'session',
            target_ids = [],
            tools = ['axe-core', 'pa11y', 'lighthouse']
        } = req.body;

        console.log(`🔍 Preview request: ${target_mode} mode for session ${sessionId}`);

        const wsService = req.app.get('wsService');
        const controller = new UnifiedAutomationController(wsService);
        
        const preview = await controller.previewAutomationScope(sessionId, target_mode, target_ids, tools);
        
        res.json({
            success: preview.success,
            mode: 'preview_only',
            ...preview
        });

    } catch (error) {
        console.error('❌ Error generating preview:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate automation preview',
            message: error.message
        });
    }
});

/**
 * Get Available Tools and Capabilities
 * GET /api/automated-testing/unified-run/capabilities
 */
router.get('/unified-run/capabilities', authenticateToken, async (req, res) => {
    try {
        const capabilities = {
            version: '2.0',
            unified_endpoint: true,
            targeting_modes: {
                session: {
                    description: 'Test all automated requirements in the session',
                    requires_target_ids: false,
                    example: { target_mode: 'session' }
                },
                requirements: {
                    description: 'Test specific requirements across all pages',
                    requires_target_ids: true,
                    example: { target_mode: 'requirements', target_ids: ['req-uuid-1', 'req-uuid-2'] }
                },
                instances: {
                    description: 'Test specific test instances',
                    requires_target_ids: true,
                    example: { target_mode: 'instances', target_ids: ['instance-uuid-1'] }
                }
            },
            available_tools: {
                'axe-core': {
                    description: 'Comprehensive accessibility testing engine',
                    compatible_criteria: ['1.1.1', '1.3.1', '1.4.2', '1.4.3', '2.1.1', '2.1.2', '2.4.1', '2.4.2', '3.1.1', '4.1.1', '4.1.2']
                },
                'pa11y': {
                    description: 'Command-line accessibility testing tool',
                    compatible_criteria: ['1.1.1', '1.3.1', '2.4.1', '2.4.2', '2.4.6', '3.1.1', '4.1.1', '4.1.2']
                },
                'lighthouse': {
                    description: 'Google Lighthouse accessibility audit',
                    compatible_criteria: ['1.1.1', '2.4.2', '2.4.4', '3.1.1']
                },
                'contrast-analyzer': {
                    description: 'Color contrast analysis tool',
                    compatible_criteria: ['1.4.3', '1.4.6', '1.4.11']
                }
            },
            options: {
                preview_mode: 'Generate scope preview without executing tests',
                force_retest: 'Retest even completed instances',
                run_async: 'Run tests asynchronously (default: true)'
            },
            real_time_updates: {
                websocket_events: ['automation_started', 'automation_progress', 'automation_completed'],
                status_endpoint: '/unified-run/:sessionId/status/:runId'
            }
        };

        res.json({
            success: true,
            capabilities
        });

    } catch (error) {
        console.error('❌ Error getting capabilities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get capabilities',
            message: error.message
        });
    }
});

/**
 * Validate unified automation request parameters
 * @private
 */
function validateUnifiedAutomationRequest(targetMode, targetIds, tools, options) {
    const errors = [];
    
    // Validate target mode
    const validModes = ['session', 'requirements', 'instances'];
    if (!validModes.includes(targetMode)) {
        errors.push(`Invalid target_mode: ${targetMode}. Must be one of: ${validModes.join(', ')}`);
    }
    
    // Validate target IDs for modes that require them
    if (['requirements', 'instances'].includes(targetMode)) {
        if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
            errors.push(`target_ids array is required and cannot be empty for ${targetMode} mode`);
        } else {
            // Validate UUID format for target IDs
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const invalidIds = targetIds.filter(id => !uuidRegex.test(id));
            if (invalidIds.length > 0) {
                errors.push(`Invalid UUID format in target_ids: ${invalidIds.slice(0, 3).join(', ')}${invalidIds.length > 3 ? '...' : ''}`);
            }
        }
    }
    
    // Validate tools
    if (!tools || !Array.isArray(tools) || tools.length === 0) {
        errors.push('tools array is required and cannot be empty');
    } else {
        const validTools = ['axe-core', 'pa11y', 'lighthouse', 'contrast-analyzer'];
        const invalidTools = tools.filter(tool => !validTools.includes(tool));
        if (invalidTools.length > 0) {
            errors.push(`Invalid tools: ${invalidTools.join(', ')}. Valid tools: ${validTools.join(', ')}`);
        }
    }
    
    // Validate options
    if (options && typeof options !== 'object') {
        errors.push('options must be an object');
    }
    
    return errors;
}

    return router;
};
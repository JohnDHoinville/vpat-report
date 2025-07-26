const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const AuditTrailService = require('../../database/services/audit-trail-service');
const { pool } = require('../../database/config');

// Initialize audit trail service
const auditService = new AuditTrailService();

/**
 * Get audit trail for a specific test session
 * GET /api/audit-trail/session/:sessionId
 */
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { 
            limit = 50, 
            offset = 0, 
            action_type = null,
            changed_by = null,
            start_date = null,
            end_date = null,
            include_metadata = 'true'
        } = req.query;

        console.log(`📋 Getting audit trail for session ${sessionId}`);

        // Validate session access
        const sessionCheck = await pool.query(
            'SELECT id FROM test_sessions WHERE id = $1',
            [sessionId]
        );

        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Testing session not found'
            });
        }

        const auditTrail = await auditService.getSessionAuditTrail(sessionId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            actionType: action_type,
            changedBy: changed_by,
            startDate: start_date,
            endDate: end_date,
            includeMetadata: include_metadata === 'true'
        });

        res.json({
            success: true,
            data: {
                session_id: sessionId,
                audit_entries: auditTrail.entries,
                pagination: auditTrail.pagination,
                summary: auditTrail.summary
            }
        });

    } catch (error) {
        console.error('Error getting session audit trail:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get audit trail'
        });
    }
});

/**
 * Get audit trail for a specific test instance
 * GET /api/audit-trail/test-instance/:instanceId
 */
router.get('/test-instance/:instanceId', authenticateToken, async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { include_metadata = 'true' } = req.query;

        console.log(`📋 Getting audit trail for test instance ${instanceId}`);

        const auditTrail = await auditService.getTestInstanceAuditTrail(instanceId, {
            includeMetadata: include_metadata === 'true'
        });

        res.json({
            success: true,
            data: {
                test_instance_id: instanceId,
                audit_entries: auditTrail.entries,
                summary: auditTrail.summary
            }
        });

    } catch (error) {
        console.error('Error getting test instance audit trail:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get test instance audit trail'
        });
    }
});

/**
 * Get comprehensive audit timeline for a session
 * GET /api/audit-trail/timeline/:sessionId
 */
router.get('/timeline/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { 
            group_by = 'day', // hour, day, week
            include_automation = 'true',
            include_manual = 'true' 
        } = req.query;

        console.log(`⏰ Generating audit timeline for session ${sessionId}`);

        const timeline = await auditService.generateAuditTimeline(sessionId, {
            groupBy: group_by,
            includeAutomation: include_automation === 'true',
            includeManual: include_manual === 'true'
        });

        res.json({
            success: true,
            data: {
                session_id: sessionId,
                timeline: timeline.timeline,
                summary: timeline.summary,
                group_by: group_by,
                total_events: timeline.total_events
            }
        });

    } catch (error) {
        console.error('Error generating audit timeline:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate audit timeline'
        });
    }
});

/**
 * Get audit statistics for a session
 * GET /api/audit-trail/stats/:sessionId
 */
router.get('/stats/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { 
            period = '7d' // 1d, 7d, 30d, all
        } = req.query;

        console.log(`📊 Getting audit statistics for session ${sessionId}, period: ${period}`);

        const stats = await auditService.getAuditStatistics(sessionId, {
            period: period
        });

        res.json({
            success: true,
            data: {
                session_id: sessionId,
                period: period,
                statistics: stats
            }
        });

    } catch (error) {
        console.error('Error getting audit statistics:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get audit statistics'
        });
    }
});

/**
 * Create audit log entry
 * POST /api/audit-trail/log
 */
router.post('/log', authenticateToken, async (req, res) => {
    try {
        const {
            test_instance_id,
            action_type,
            reason,
            old_value = null,
            new_value = null,
            metadata = {}
        } = req.body;

        console.log(`📝 Creating audit log entry for instance ${test_instance_id}: ${action_type}`);

        // Validate required fields
        if (!test_instance_id || !action_type || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: test_instance_id, action_type, reason'
            });
        }

        const auditEntry = await auditService.createAuditLogEntry({
            testInstanceId: test_instance_id,
            actionType: action_type,
            changedBy: req.user.userId,
            reason: reason,
            oldValue: old_value,
            newValue: new_value,
            metadata: metadata,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            success: true,
            message: 'Audit log entry created successfully',
            data: {
                audit_entry: auditEntry
            }
        });

    } catch (error) {
        console.error('Error creating audit log entry:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create audit log entry'
        });
    }
});

/**
 * Get audit log entry details
 * GET /api/audit-trail/entry/:entryId
 */
router.get('/entry/:entryId', authenticateToken, async (req, res) => {
    try {
        const { entryId } = req.params;

        console.log(`📋 Getting audit entry details: ${entryId}`);

        const entry = await auditService.getAuditEntryDetails(entryId);

        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Audit entry not found'
            });
        }

        res.json({
            success: true,
            data: {
                audit_entry: entry
            }
        });

    } catch (error) {
        console.error('Error getting audit entry details:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get audit entry details'
        });
    }
});

/**
 * Search audit trail with advanced filters
 * POST /api/audit-trail/search
 */
router.post('/search', authenticateToken, async (req, res) => {
    try {
        const {
            session_ids = [],
            test_instance_ids = [],
            action_types = [],
            changed_by_users = [],
            date_range = {},
            search_text = '',
            limit = 100,
            offset = 0
        } = req.body;

        console.log(`🔍 Searching audit trail with filters`);

        const searchResults = await auditService.searchAuditTrail({
            sessionIds: session_ids,
            testInstanceIds: test_instance_ids,
            actionTypes: action_types,
            changedByUsers: changed_by_users,
            dateRange: date_range,
            searchText: search_text,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: {
                results: searchResults.entries,
                pagination: searchResults.pagination,
                filters_applied: {
                    session_ids: session_ids.length,
                    test_instance_ids: test_instance_ids.length,
                    action_types: action_types.length,
                    changed_by_users: changed_by_users.length,
                    date_range: Object.keys(date_range).length > 0,
                    search_text: search_text.length > 0
                }
            }
        });

    } catch (error) {
        console.error('Error searching audit trail:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to search audit trail'
        });
    }
});

/**
 * Export audit report
 * GET /api/audit-trail/export/:sessionId
 */
router.get('/export/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { 
            format = 'json', // json, csv, pdf
            include_metadata = 'true',
            date_range = null
        } = req.query;

        console.log(`📤 Exporting audit report for session ${sessionId} in ${format} format`);

        const report = await auditService.exportAuditReport(sessionId, {
            format: format,
            includeMetadata: include_metadata === 'true',
            dateRange: date_range ? JSON.parse(date_range) : null
        });

        // Set appropriate content type and headers
        const contentTypes = {
            'json': 'application/json',
            'csv': 'text/csv',
            'pdf': 'application/pdf'
        };

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `audit-report-${sessionId}-${timestamp}.${format}`;

        res.setHeader('Content-Type', contentTypes[format] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        if (format === 'json') {
            res.json({
                success: true,
                data: report
            });
        } else {
            res.send(report);
        }

    } catch (error) {
        console.error('Error exporting audit report:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to export audit report'
        });
    }
});

/**
 * Get audit trail configuration
 * GET /api/audit-trail/config
 */
router.get('/config', authenticateToken, async (req, res) => {
    try {
        const config = await auditService.getAuditTrailConfig();

        res.json({
            success: true,
            data: {
                config: config,
                supported_action_types: [
                    'test_instance_created',
                    'test_instance_updated',
                    'status_changed',
                    'tester_assigned',
                    'automated_test_result',
                    'evidence_added',
                    'evidence_removed',
                    'session_created',
                    'session_updated',
                    'session_activated',
                    'session_completed',
                    'bulk_operation',
                    'export_generated'
                ],
                retention_policies: {
                    audit_logs: '7 years',
                    evidence_files: '5 years',
                    metadata: '10 years'
                }
            }
        });

    } catch (error) {
        console.error('Error getting audit trail config:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get audit trail configuration'
        });
    }
});

/**
 * Verify audit trail integrity
 * POST /api/audit-trail/verify/:sessionId
 */
router.post('/verify/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { check_checksums = 'true' } = req.body;

        console.log(`🔐 Verifying audit trail integrity for session ${sessionId}`);

        // This would require admin role in a full implementation
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin role required for audit trail verification'
            });
        }

        const verification = await auditService.verifyAuditTrailIntegrity(sessionId, {
            checkChecksums: check_checksums === 'true'
        });

        res.json({
            success: true,
            data: {
                session_id: sessionId,
                verification_result: verification.status,
                integrity_check: verification.integrity,
                issues_found: verification.issues,
                verified_at: new Date().toISOString(),
                verified_by: req.user.userId
            }
        });

    } catch (error) {
        console.error('Error verifying audit trail integrity:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to verify audit trail integrity'
        });
    }
});

module.exports = router; 
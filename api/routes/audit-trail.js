const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const AuditLogger = require('../middleware/audit-logger');
const { pool } = require('../../database/config');

/**
 * Comprehensive Audit Trail API
 * Implements Task 4.1 from PRD: Comprehensive Audit Trail & Change Tracking
 * 
 * Features:
 * - Detailed activity logging with full context
 * - Evidence upload tracking with versioning
 * - Timeline generation for sessions and test instances
 * - Audit report generation for compliance
 */

/**
 * GET /api/audit-trail/test-instances/:id
 * Get comprehensive audit trail for a specific test instance
 */
router.get('/test-instances/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            include_evidence = 'true',
            include_tool_output = 'false',
            limit = 50,
            offset = 0 
        } = req.query;

        // Get test instance details
        const testInstanceQuery = `
            SELECT ti.*, tr.title as requirement_title, tr.criterion_number,
                   ts.name as session_name, p.name as project_name
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN test_sessions ts ON ti.session_id = ts.id
            LEFT JOIN projects p ON ts.project_id = p.id
            WHERE ti.id = $1
        `;
        
        const testInstanceResult = await pool.query(testInstanceQuery, [id]);
        
        if (testInstanceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        const testInstance = testInstanceResult.rows[0];

        // Get audit trail entries
        let auditQuery = `
            SELECT 
                tal.*,
                u1.username as changed_by_username,
                u1.full_name as changed_by_fullname,
                ar.tool_output as automated_result_details
            FROM test_audit_log tal
            LEFT JOIN users u1 ON tal.changed_by = u1.id
            LEFT JOIN automated_test_results ar ON tal.automated_result_id = ar.id
            WHERE tal.test_instance_id = $1
            ORDER BY tal.changed_at DESC
            LIMIT $2 OFFSET $3
        `;

        const auditResult = await pool.query(auditQuery, [id, limit, offset]);

        // Process audit entries
        const auditEntries = auditResult.rows.map(entry => {
            const processedEntry = {
                id: entry.id,
                action_type: entry.action_type,
                field_changed: entry.field_changed,
                old_value: entry.old_value,
                new_value: entry.new_value,
                reason: entry.reason,
                changed_at: entry.changed_at,
                changed_by: {
                    id: entry.changed_by,
                    username: entry.changed_by_username,
                    full_name: entry.changed_by_fullname
                },
                metadata: entry.metadata
            };

            // Include evidence if requested
            if (include_evidence === 'true' && entry.evidence) {
                processedEntry.evidence = entry.evidence;
            }

            // Include tool output if requested
            if (include_tool_output === 'true' && entry.automated_result_details) {
                processedEntry.tool_output = entry.automated_result_details;
            }

            return processedEntry;
        });

        // Get total count for pagination
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM test_audit_log WHERE test_instance_id = $1',
            [id]
        );

        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                test_instance: testInstance,
                audit_trail: auditEntries,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: (parseInt(offset) + auditEntries.length) < total
                }
            }
        });

    } catch (error) {
        console.error('Error fetching test instance audit trail:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit trail',
            details: error.message
        });
    }
});

/**
 * GET /api/audit-trail/sessions/:id
 * Get comprehensive audit trail for a testing session
 */
router.get('/sessions/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            action_types,
            date_from,
            date_to,
            changed_by,
            limit = 100,
            offset = 0 
        } = req.query;

        // Get session details
        const sessionQuery = `
            SELECT ts.*, p.name as project_name,
                   u1.username as created_by_username,
                   u1.full_name as created_by_fullname
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN users u1 ON ts.created_by = u1.id
            WHERE ts.id = $1
        `;
        
        const sessionResult = await pool.query(sessionQuery, [id]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Testing session not found'
            });
        }

        const session = sessionResult.rows[0];

        // Build dynamic query for session audit trail
        let conditions = ['tal.session_id = $1'];
        let params = [id];
        let paramCount = 1;

        if (action_types) {
            paramCount++;
            const actionTypesArray = action_types.split(',');
            conditions.push(`tal.action_type = ANY($${paramCount})`);
            params.push(actionTypesArray);
        }

        if (date_from) {
            paramCount++;
            conditions.push(`tal.changed_at >= $${paramCount}`);
            params.push(date_from);
        }

        if (date_to) {
            paramCount++;
            conditions.push(`tal.changed_at <= $${paramCount}`);
            params.push(date_to);
        }

        if (changed_by) {
            paramCount++;
            conditions.push(`tal.changed_by = $${paramCount}`);
            params.push(changed_by);
        }

        const whereClause = conditions.join(' AND ');

        // Get session-level audit trail
        const sessionAuditQuery = `
            SELECT 
                tal.*,
                u1.username as changed_by_username,
                u1.full_name as changed_by_fullname,
                ti.id as test_instance_id,
                tr.criterion_number,
                tr.title as requirement_title
            FROM test_audit_log tal
            LEFT JOIN users u1 ON tal.changed_by = u1.id
            LEFT JOIN test_instances ti ON tal.test_instance_id = ti.id
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ${whereClause}
            ORDER BY tal.changed_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        params.push(limit, offset);
        const auditResult = await pool.query(sessionAuditQuery, params);

        // Process audit entries with enhanced context
        const auditEntries = auditResult.rows.map(entry => ({
            id: entry.id,
            session_id: entry.session_id,
            test_instance_id: entry.test_instance_id,
            action_type: entry.action_type,
            field_changed: entry.field_changed,
            old_value: entry.old_value,
            new_value: entry.new_value,
            reason: entry.reason,
            changed_at: entry.changed_at,
            changed_by: {
                id: entry.changed_by,
                username: entry.changed_by_username,
                full_name: entry.changed_by_fullname
            },
            test_context: {
                criterion_number: entry.criterion_number,
                requirement_title: entry.requirement_title
            },
            metadata: entry.metadata
        }));

        // Get activity summary
        const summaryQuery = `
            SELECT 
                action_type,
                COUNT(*) as count,
                MAX(changed_at) as last_occurrence
            FROM test_audit_log
            WHERE session_id = $1
            GROUP BY action_type
            ORDER BY count DESC
        `;

        const summaryResult = await pool.query(summaryQuery, [id]);

        // Get total count for pagination
        const countParams = params.slice(0, -2); // Remove limit and offset
        const countQuery = `
            SELECT COUNT(*) as total
            FROM test_audit_log tal
            LEFT JOIN test_instances ti ON tal.test_instance_id = ti.id
            WHERE ${whereClause}
        `;

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                session,
                audit_trail: auditEntries,
                activity_summary: summaryResult.rows,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: (parseInt(offset) + auditEntries.length) < total
                }
            }
        });

    } catch (error) {
        console.error('Error fetching session audit trail:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session audit trail',
            details: error.message
        });
    }
});

/**
 * GET /api/audit-trail/timeline/:session_id
 * Generate comprehensive timeline for session with all activities
 */
router.get('/timeline/:session_id', authenticateToken, async (req, res) => {
    try {
        const { session_id } = req.params;
        const { 
            granularity = 'day', // day, hour, week
            include_system_events = 'true',
            group_by_user = 'false'
        } = req.query;

        // Get comprehensive timeline data
        const timelineQuery = `
            WITH timeline_events AS (
                -- Session creation
                SELECT 
                    ts.created_at as event_time,
                    'session_created' as event_type,
                    'Session created' as description,
                    ts.created_by as user_id,
                    u.username,
                    u.full_name,
                    ts.name as context,
                    1 as importance_score
                FROM test_sessions ts
                LEFT JOIN users u ON ts.created_by = u.id
                WHERE ts.id = $1
                
                UNION ALL
                
                -- Test instance changes
                SELECT 
                    tal.changed_at as event_time,
                    tal.action_type as event_type,
                    CASE 
                        WHEN tal.action_type = 'status_change' THEN 
                            'Status changed from "' || COALESCE(tal.old_value, 'none') || '" to "' || tal.new_value || '"'
                        WHEN tal.action_type = 'assignment' THEN 
                            'Test assigned to user'
                        WHEN tal.action_type = 'created' THEN 
                            'Test instance created'
                        ELSE tal.action_type
                    END as description,
                    tal.changed_by as user_id,
                    u.username,
                    u.full_name,
                    tr.criterion_number || ': ' || tr.title as context,
                    CASE 
                        WHEN tal.action_type = 'status_change' THEN 3
                        WHEN tal.action_type = 'assignment' THEN 2
                        ELSE 1
                    END as importance_score
                FROM test_audit_log tal
                LEFT JOIN users u ON tal.changed_by = u.id
                LEFT JOIN test_instances ti ON tal.test_instance_id = ti.id
                LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
                WHERE tal.session_id = $1
            )
            SELECT *
            FROM timeline_events
            ORDER BY event_time DESC, importance_score DESC
        `;

        const timelineResult = await pool.query(timelineQuery, [session_id]);

        // Group events by time period if requested
        let groupedTimeline = timelineResult.rows;

        if (granularity !== 'raw') {
            const groupedEvents = {};
            
            timelineResult.rows.forEach(event => {
                let groupKey;
                const eventDate = new Date(event.event_time);
                
                switch (granularity) {
                    case 'hour':
                        groupKey = eventDate.toISOString().substring(0, 13) + ':00:00.000Z';
                        break;
                    case 'day':
                        groupKey = eventDate.toISOString().substring(0, 10);
                        break;
                    case 'week':
                        const weekStart = new Date(eventDate);
                        weekStart.setDate(eventDate.getDate() - eventDate.getDay());
                        groupKey = weekStart.toISOString().substring(0, 10);
                        break;
                }

                if (!groupedEvents[groupKey]) {
                    groupedEvents[groupKey] = {
                        period: groupKey,
                        events: [],
                        event_count: 0,
                        users_involved: new Set()
                    };
                }

                groupedEvents[groupKey].events.push(event);
                groupedEvents[groupKey].event_count++;
                if (event.username) {
                    groupedEvents[groupKey].users_involved.add(event.username);
                }
            });

            // Convert sets to arrays and sort
            groupedTimeline = Object.values(groupedEvents).map(group => ({
                ...group,
                users_involved: Array.from(group.users_involved)
            })).sort((a, b) => new Date(b.period) - new Date(a.period));
        }

        // Get session statistics
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT tal.test_instance_id) as tests_modified,
                COUNT(DISTINCT tal.changed_by) as users_involved,
                COUNT(*) as total_changes,
                MIN(tal.changed_at) as first_activity,
                MAX(tal.changed_at) as last_activity
            FROM test_audit_log tal
            WHERE tal.session_id = $1
        `;

        const statsResult = await pool.query(statsQuery, [session_id]);

        res.json({
            success: true,
            data: {
                session_id,
                timeline: groupedTimeline,
                statistics: statsResult.rows[0],
                metadata: {
                    granularity,
                    include_system_events,
                    group_by_user,
                    generated_at: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        console.error('Error generating timeline:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate timeline',
            details: error.message
        });
    }
});

/**
 * POST /api/audit-trail/log-change
 * Manually log a change with full context (for system integrations)
 */
router.post('/log-change', authenticateToken, async (req, res) => {
    try {
        const {
            test_instance_id,
            session_id,
            action_type,
            field_changed,
            old_value,
            new_value,
            reason,
            metadata = {},
            evidence = []
        } = req.body;

        // Validate required fields
        if (!test_instance_id && !session_id) {
            return res.status(400).json({
                success: false,
                error: 'Either test_instance_id or session_id is required'
            });
        }

        if (!action_type) {
            return res.status(400).json({
                success: false,
                error: 'action_type is required'
            });
        }

        // Create audit log entry
        const insertQuery = `
            INSERT INTO test_audit_log (
                test_instance_id, session_id, changed_by, action_type, 
                field_changed, old_value, new_value, reason, 
                changed_at, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
            RETURNING id, changed_at
        `;

        const result = await pool.query(insertQuery, [
            test_instance_id,
            session_id,
            req.user.id,
            action_type,
            field_changed,
            old_value,
            new_value,
            reason,
            JSON.stringify(metadata)
        ]);

        const auditEntry = result.rows[0];

        // Log evidence if provided
        if (evidence.length > 0) {
            const evidenceQuery = `
                INSERT INTO test_evidence (
                    test_instance_id, audit_log_id, evidence_type, 
                    file_path, description, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `;

            for (const evidenceItem of evidence) {
                await pool.query(evidenceQuery, [
                    test_instance_id,
                    auditEntry.id,
                    evidenceItem.type || 'manual',
                    evidenceItem.file_path,
                    evidenceItem.description,
                    JSON.stringify(evidenceItem.metadata || {})
                ]);
            }
        }

        res.status(201).json({
            success: true,
            data: {
                audit_entry_id: auditEntry.id,
                logged_at: auditEntry.changed_at,
                evidence_count: evidence.length
            },
            message: 'Change logged successfully'
        });

    } catch (error) {
        console.error('Error logging change:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log change',
            details: error.message
        });
    }
});

/**
 * GET /api/audit-trail/compliance-report/:session_id
 * Generate compliance audit report for a session
 */
router.get('/compliance-report/:session_id', authenticateToken, async (req, res) => {
    try {
        const { session_id } = req.params;
        const { 
            format = 'json', // json, csv, pdf
            include_evidence = 'true',
            compliance_standard = 'wcag_aa'
        } = req.query;

        // Get session and project details
        const sessionQuery = `
            SELECT ts.*, p.name as project_name, p.url as project_url,
                   u1.username as created_by_username, u1.full_name as created_by_fullname
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN users u1 ON ts.created_by = u1.id
            WHERE ts.id = $1
        `;

        const sessionResult = await pool.query(sessionQuery, [session_id]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        const session = sessionResult.rows[0];

        // Get comprehensive test results with audit trail
        const complianceQuery = `
            SELECT 
                ti.id as test_instance_id,
                ti.status,
                ti.notes,
                tr.criterion_number,
                tr.title as requirement_title,
                tr.level,
                tr.test_method,
                tr.acceptance_criteria,
                -- Latest audit entry
                tal.changed_at as last_updated,
                tal.reason as last_change_reason,
                tal.changed_by,
                u1.username as last_changed_by_username,
                u1.full_name as last_changed_by_fullname,
                -- Evidence count
                (SELECT COUNT(*) FROM test_evidence te WHERE te.test_instance_id = ti.id) as evidence_count,
                -- Pass/fail summary
                CASE 
                    WHEN ti.status = 'passed' THEN 'PASS'
                    WHEN ti.status = 'failed' THEN 'FAIL'
                    WHEN ti.status = 'not_applicable' THEN 'N/A'
                    WHEN ti.status = 'untestable' THEN 'UNTESTABLE'
                    ELSE 'PENDING'
                END as compliance_status
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN (
                SELECT DISTINCT ON (test_instance_id) 
                    test_instance_id, changed_at, reason, changed_by
                FROM test_audit_log 
                WHERE session_id = $1
                ORDER BY test_instance_id, changed_at DESC
            ) tal ON ti.id = tal.test_instance_id
            LEFT JOIN users u1 ON tal.changed_by = u1.id
            WHERE ti.session_id = $1
            ORDER BY tr.criterion_number
        `;

        const complianceResult = await pool.query(complianceQuery, [session_id]);

        // Calculate compliance metrics
        const testResults = complianceResult.rows;
        const totalTests = testResults.length;
        const passedTests = testResults.filter(t => t.status === 'passed').length;
        const failedTests = testResults.filter(t => t.status === 'failed').length;
        const pendingTests = testResults.filter(t => !['passed', 'failed', 'not_applicable', 'untestable'].includes(t.status)).length;
        const notApplicableTests = testResults.filter(t => t.status === 'not_applicable').length;
        const untestableTests = testResults.filter(t => t.status === 'untestable').length;

        const completedTests = totalTests - pendingTests;
        const complianceRate = completedTests > 0 ? (passedTests / completedTests * 100).toFixed(2) : 0;

        // Get audit trail summary
        const auditSummaryQuery = `
            SELECT 
                action_type,
                COUNT(*) as count,
                MIN(changed_at) as first_occurrence,
                MAX(changed_at) as last_occurrence
            FROM test_audit_log
            WHERE session_id = $1
            GROUP BY action_type
            ORDER BY count DESC
        `;

        const auditSummaryResult = await pool.query(auditSummaryQuery, [session_id]);

        const report = {
            metadata: {
                generated_at: new Date().toISOString(),
                generated_by: {
                    id: req.user.id,
                    username: req.user.username,
                    full_name: req.user.full_name
                },
                compliance_standard,
                include_evidence: include_evidence === 'true'
            },
            session: session,
            compliance_summary: {
                total_tests: totalTests,
                completed_tests: completedTests,
                passed_tests: passedTests,
                failed_tests: failedTests,
                pending_tests: pendingTests,
                not_applicable_tests: notApplicableTests,
                untestable_tests: untestableTests,
                compliance_rate: parseFloat(complianceRate),
                completion_rate: totalTests > 0 ? (completedTests / totalTests * 100).toFixed(2) : 0
            },
            test_results: testResults,
            audit_activity: auditSummaryResult.rows,
            recommendations: generateComplianceRecommendations(testResults, complianceRate)
        };

        // Return based on format
        if (format === 'json') {
            res.json({
                success: true,
                data: report
            });
        } else {
            // For CSV/PDF formats, we'd implement exporters here
            res.status(501).json({
                success: false,
                error: `Format ${format} not yet implemented`,
                available_formats: ['json']
            });
        }

    } catch (error) {
        console.error('Error generating compliance report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate compliance report',
            details: error.message
        });
    }
});

/**
 * Helper function to generate compliance recommendations
 */
function generateComplianceRecommendations(testResults, complianceRate) {
    const recommendations = [];
    
    const failedTests = testResults.filter(t => t.status === 'failed');
    const pendingTests = testResults.filter(t => !['passed', 'failed', 'not_applicable', 'untestable'].includes(t.status));
    
    if (complianceRate < 80) {
        recommendations.push({
            priority: 'high',
            category: 'compliance',
            message: `Compliance rate is ${complianceRate}%. Focus on resolving failed tests to meet accessibility standards.`,
            action_items: failedTests.slice(0, 5).map(t => `Fix: ${t.criterion_number} - ${t.requirement_title}`)
        });
    }
    
    if (pendingTests.length > 0) {
        recommendations.push({
            priority: 'medium',
            category: 'testing',
            message: `${pendingTests.length} tests are still pending. Complete testing to get full compliance picture.`,
            action_items: [`Complete testing for ${pendingTests.length} pending requirements`]
        });
    }
    
    if (failedTests.length === 0 && pendingTests.length === 0) {
        recommendations.push({
            priority: 'low',
            category: 'maintenance',
            message: 'All tests completed successfully! Consider regular re-testing to maintain compliance.',
            action_items: ['Schedule periodic compliance reviews', 'Document accessibility procedures']
        });
    }
    
    return recommendations;
}

module.exports = router; 
const express = require('express');
const router = express.Router();
const { pool } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');
const AuditLogger = require('../middleware/audit-logger');

/**
 * GET /api/test-instances/test
 * Test endpoint to verify database connection and schema (no auth required)
 */
router.get('/test', async (req, res) => {
    try {
        const query = `
            SELECT 
                ti.id,
                ti.status,
                tr.title as requirement_title,
                ts.name as session_name
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN test_sessions ts ON ti.session_id = ts.id
            LIMIT 3
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            message: 'Test Instances API is working correctly',
            data: {
                total_found: result.rows.length,
                sample_instances: result.rows
            }
        });

    } catch (error) {
        console.error('❌ Error in test instances test endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test instances',
            details: error.message
        });
    }
});

/**
 * GET /api/test-instances
 * Get test instances with filtering and pagination
 * 
 * Query Parameters:
 * - session_id: Filter by testing session
 * - requirement_id: Filter by requirement
 * - page_id: Filter by page
 * - status: Filter by test status
 * - assigned_tester: Filter by assigned tester
 * - reviewer: Filter by reviewer
 * - test_method: Filter by test method used
 * - confidence_level: Filter by confidence level
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 25)
 * - sort: Sort field (updated_at, created_at, status, requirement_type)
 * - order: Sort order (asc, desc, default: desc)
 * - include_details: Include full requirement and user details (default: false)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            session_id,
            requirement_id,
            page_id,
            status,
            assigned_tester,
            reviewer,
            test_method,
            confidence_level,
            page = 1,
            limit = 25,
            sort = 'updated_at',
            order = 'desc',
            include_details = false
        } = req.query;

        // Build WHERE conditions
        const conditions = [];
        const params = [];
        let paramCount = 0;

        if (session_id) {
            paramCount++;
            conditions.push(`ti.session_id = $${paramCount}`);
            params.push(session_id);
        }

        if (requirement_id) {
            paramCount++;
            conditions.push(`ti.requirement_id = $${paramCount}`);
            params.push(requirement_id);
        }

        if (page_id) {
            paramCount++;
            conditions.push(`ti.page_id = $${paramCount}`);
            params.push(page_id);
        }

        if (status) {
            paramCount++;
            conditions.push(`ti.status = $${paramCount}`);
            params.push(status);
        }

        if (assigned_tester) {
            paramCount++;
            conditions.push(`ti.assigned_tester = $${paramCount}`);
            params.push(assigned_tester);
        }

        if (reviewer) {
            paramCount++;
            conditions.push(`ti.reviewer = $${paramCount}`);
            params.push(reviewer);
        }

        if (test_method) {
            paramCount++;
            conditions.push(`ti.test_method_used = $${paramCount}`);
            params.push(test_method);
        }

        if (confidence_level) {
            paramCount++;
            conditions.push(`ti.confidence_level = $${paramCount}`);
            params.push(confidence_level);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Validate sort field
        const validSortFields = ['updated_at', 'created_at', 'status', 'requirement_type', 'started_at', 'completed_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'updated_at';
        const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        // Calculate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Build select fields based on include_details
        const baseFields = `
            ti.id,
            ti.session_id,
            ti.requirement_id,
            ti.page_id,
            ti.status,
            ti.assigned_tester,
            ti.reviewer,
            ti.confidence_level,
            ti.notes,
            ti.remediation_notes,
            ti.evidence,
            ti.test_method_used,
            ti.tool_used,
            ti.created_at,
            ti.updated_at,
            ti.started_at,
            ti.completed_at,
            ti.assigned_at,
            ti.reviewed_at
        `;

        const detailFields = include_details === 'true' ? `
            , tr.requirement_type,
            tr.criterion_number,
            tr.title as requirement_title,
            tr.level as requirement_level,
            tr.test_method as requirement_test_method,
            ts.name as session_name,
            ts.project_id,
            dp.url as page_url,
            dp.title as page_title,
            at_user.username as assigned_tester_name,
            at_user.email as assigned_tester_email,
            rv_user.username as reviewer_name,
            rv_user.email as reviewer_email
        ` : '';

        const joinClause = include_details === 'true' ? `
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN test_sessions ts ON ti.session_id = ts.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN users at_user ON ti.assigned_tester = at_user.id
            LEFT JOIN users rv_user ON ti.reviewer = rv_user.id
        ` : '';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM test_instances ti
            ${joinClause}
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, params);
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limitNum);

        // Get test instances with pagination
        paramCount += 2;
        const query = `
            SELECT ${baseFields} ${detailFields}
            FROM test_instances ti
            ${joinClause}
            ${whereClause}
            ORDER BY ti.${sortField} ${sortOrder}
            LIMIT $${paramCount - 1} OFFSET $${paramCount}
        `;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        // Group by status for summary
        const statusSummary = result.rows.reduce((acc, test) => {
            acc[test.status] = (acc[test.status] || 0) + 1;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                test_instances: result.rows,
                summary: {
                    total_instances: totalItems,
                    by_status: statusSummary
                },
                pagination: {
                    current_page: pageNum,
                    total_pages: totalPages,
                    total_items: totalItems,
                    items_per_page: limitNum,
                    has_next: pageNum < totalPages,
                    has_prev: pageNum > 1
                },
                filters: {
                    session_id,
                    requirement_id,
                    page_id,
                    status,
                    assigned_tester,
                    reviewer,
                    test_method,
                    confidence_level,
                    sort: sortField,
                    order: sortOrder,
                    include_details: include_details === 'true'
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching test instances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test instances',
            details: error.message
        });
    }
});

/**
 * GET /api/test-instances/:id
 * Get a specific test instance with full details
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                ti.*,
                tr.requirement_type,
                tr.criterion_number,
                tr.title as requirement_title,
                tr.description as requirement_description,
                tr.level as requirement_level,
                tr.test_method as requirement_test_method,
                tr.testing_instructions,
                tr.acceptance_criteria,
                tr.failure_examples,
                ts.name as session_name,
                ts.project_id,
                ts.conformance_level,
                dp.url as page_url,
                dp.title as page_title,
                at_user.username as assigned_tester_name,
                at_user.email as assigned_tester_email,
                rv_user.username as reviewer_name,
                rv_user.email as reviewer_email
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN test_sessions ts ON ti.session_id = ts.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN users at_user ON ti.assigned_tester = at_user.id
            LEFT JOIN users rv_user ON ti.reviewer = rv_user.id
            WHERE ti.id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error fetching test instance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test instance',
            details: error.message
        });
    }
});

/**
 * POST /api/test-instances
 * Create a new test instance
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            session_id,
            requirement_id,
            page_id = null,
            assigned_tester = null,
            notes = null,
            test_method_used = null,
            tool_used = null
        } = req.body;

        // Validate required fields
        if (!session_id || !requirement_id) {
            return res.status(400).json({
                success: false,
                error: 'session_id and requirement_id are required'
            });
        }

        // Check if test instance already exists for this combination
        const existingQuery = `
            SELECT id FROM test_instances 
            WHERE session_id = $1 AND requirement_id = $2 AND (page_id = $3 OR (page_id IS NULL AND $3 IS NULL))
        `;
        const existingResult = await pool.query(existingQuery, [session_id, requirement_id, page_id]);

        if (existingResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Test instance already exists for this session/requirement/page combination'
            });
        }

        const insertQuery = `
            INSERT INTO test_instances (
                session_id, requirement_id, page_id, assigned_tester, 
                notes, test_method_used, tool_used, assigned_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const assignedAt = assigned_tester ? new Date() : null;

        const result = await pool.query(insertQuery, [
            session_id,
            requirement_id,
            page_id,
            assigned_tester,
            notes,
            test_method_used,
            tool_used,
            assignedAt
        ]);

        res.status(201).json({
            success: true,
            message: 'Test instance created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error creating test instance:', error);
        
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: 'Invalid reference to session, requirement, page, or user'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create test instance',
            details: error.message
        });
    }
});

/**
 * PUT /api/test-instances/:id
 * Update a test instance
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            assigned_tester,
            reviewer,
            confidence_level,
            notes,
            remediation_notes,
            evidence,
            test_method_used,
            tool_used
        } = req.body;

        // Check if test instance exists
        const existingQuery = 'SELECT * FROM test_instances WHERE id = $1';
        const existingResult = await pool.query(existingQuery, [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        const existing = existingResult.rows[0];

        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramCount = 0;

        if (status !== undefined) {
            paramCount++;
            updates.push(`status = $${paramCount}`);
            params.push(status);
            
            // Update timing fields based on status
            if (status === 'in_progress' && !existing.started_at) {
                paramCount++;
                updates.push(`started_at = $${paramCount}`);
                params.push(new Date());
            } else if (['passed', 'failed', 'untestable', 'not_applicable'].includes(status) && !existing.completed_at) {
                paramCount++;
                updates.push(`completed_at = $${paramCount}`);
                params.push(new Date());
            }
        }

        if (assigned_tester !== undefined) {
            paramCount++;
            updates.push(`assigned_tester = $${paramCount}`);
            params.push(assigned_tester);
            
            if (assigned_tester && !existing.assigned_at) {
                paramCount++;
                updates.push(`assigned_at = $${paramCount}`);
                params.push(new Date());
            }
        }

        if (reviewer !== undefined) {
            paramCount++;
            updates.push(`reviewer = $${paramCount}`);
            params.push(reviewer);
        }

        if (confidence_level !== undefined) {
            paramCount++;
            updates.push(`confidence_level = $${paramCount}`);
            params.push(confidence_level);
        }

        if (notes !== undefined) {
            paramCount++;
            updates.push(`notes = $${paramCount}`);
            params.push(notes);
        }

        if (remediation_notes !== undefined) {
            paramCount++;
            updates.push(`remediation_notes = $${paramCount}`);
            params.push(remediation_notes);
        }

        if (evidence !== undefined) {
            paramCount++;
            updates.push(`evidence = $${paramCount}`);
            params.push(JSON.stringify(evidence));
        }

        if (test_method_used !== undefined) {
            paramCount++;
            updates.push(`test_method_used = $${paramCount}`);
            params.push(test_method_used);
        }

        if (tool_used !== undefined) {
            paramCount++;
            updates.push(`tool_used = $${paramCount}`);
            params.push(tool_used);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid update fields provided'
            });
        }

        // Add updated_at and user tracking
        paramCount++;
        updates.push(`updated_at = $${paramCount}`);
        params.push(new Date());

        // Add WHERE clause
        paramCount++;
        params.push(id);

        const updateQuery = `
            UPDATE test_instances 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(updateQuery, params);

        res.json({
            success: true,
            message: 'Test instance updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error updating test instance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update test instance',
            details: error.message
        });
    }
});

/**
 * POST /api/test-instances/:id/assign
 * Assign a test instance to a tester
 */
router.post('/:id/assign', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_tester, notes } = req.body;

        if (!assigned_tester) {
            return res.status(400).json({
                success: false,
                error: 'assigned_tester is required'
            });
        }

        const updateQuery = `
            UPDATE test_instances 
            SET assigned_tester = $1, assigned_at = $2, notes = COALESCE(notes, '') || $3, updated_at = $4
            WHERE id = $5
            RETURNING *
        `;

        const assignmentNote = notes ? `\n[Assignment] ${notes}` : '';
        const result = await pool.query(updateQuery, [
            assigned_tester,
            new Date(),
            assignmentNote,
            new Date(),
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        res.json({
            success: true,
            message: 'Test instance assigned successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error assigning test instance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign test instance',
            details: error.message
        });
    }
});

/**
 * POST /api/test-instances/:id/evidence
 * Add evidence to a test instance
 */
router.post('/:id/evidence', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { evidence_type, file_path, description, metadata } = req.body;

        if (!evidence_type || !file_path) {
            return res.status(400).json({
                success: false,
                error: 'evidence_type and file_path are required'
            });
        }

        // Get current evidence
        const getCurrentQuery = 'SELECT evidence FROM test_instances WHERE id = $1';
        const currentResult = await pool.query(getCurrentQuery, [id]);

        if (currentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        const currentEvidence = currentResult.rows[0].evidence || [];
        
        // Add new evidence
        const newEvidence = {
            id: require('crypto').randomUUID(),
            type: evidence_type,
            file_path,
            description,
            metadata: metadata || {},
            uploaded_by: req.user.id,
            uploaded_at: new Date().toISOString()
        };

        const updatedEvidence = [...currentEvidence, newEvidence];

        const updateQuery = `
            UPDATE test_instances 
            SET evidence = $1, updated_at = $2
            WHERE id = $3
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            JSON.stringify(updatedEvidence),
            new Date(),
            id
        ]);

        res.json({
            success: true,
            message: 'Evidence added successfully',
            data: {
                test_instance: result.rows[0],
                new_evidence: newEvidence
            }
        });

    } catch (error) {
        console.error('❌ Error adding evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add evidence',
            details: error.message
        });
    }
});

/**
 * GET /api/test-instances/:id/audit-trail
 * Get audit trail for a specific test instance
 */
router.get('/:id/audit-trail', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            limit = 50, 
            offset = 0, 
            action_type = null,
            start_date = null,
            end_date = null 
        } = req.query;

        // Use the AuditLogger to get audit trail
        const auditTrail = await AuditLogger.getAuditTrail(id, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            actionType: action_type,
            startDate: start_date,
            endDate: end_date
        });

        res.json({
            success: true,
            data: auditTrail
        });

    } catch (error) {
        console.error('❌ Error fetching audit trail:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit trail',
            details: error.message
        });
    }
});

/**
 * GET /api/test-instances/:id/statistics
 * Get statistics for a specific test instance
 */
router.get('/:id/statistics', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Get audit statistics
        const auditStats = await AuditLogger.getAuditStatistics(id);
        
        // Get test instance details for additional stats
        const instanceQuery = `
            SELECT 
                status,
                created_at,
                updated_at,
                started_at,
                completed_at,
                assigned_at,
                reviewed_at,
                confidence_level,
                test_method_used,
                tool_used
            FROM test_instances 
            WHERE id = $1
        `;
        const instanceResult = await pool.query(instanceQuery, [id]);

        if (instanceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        const instance = instanceResult.rows[0];
        
        // Calculate time metrics
        const timeMetrics = {
            total_time: null,
            testing_time: null,
            review_time: null,
            time_to_assignment: null
        };

        if (instance.created_at && instance.completed_at) {
            timeMetrics.total_time = new Date(instance.completed_at) - new Date(instance.created_at);
        }

        if (instance.started_at && instance.completed_at) {
            timeMetrics.testing_time = new Date(instance.completed_at) - new Date(instance.started_at);
        }

        if (instance.created_at && instance.assigned_at) {
            timeMetrics.time_to_assignment = new Date(instance.assigned_at) - new Date(instance.created_at);
        }

        res.json({
            success: true,
            data: {
                instance_details: instance,
                audit_statistics: auditStats,
                time_metrics: timeMetrics
            }
        });

    } catch (error) {
        console.error('❌ Error fetching test instance statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test instance statistics',
            details: error.message
        });
    }
});

/**
 * DELETE /api/test-instances/:id
 * Delete a test instance (admin only)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if test instance exists
        const checkQuery = 'SELECT id FROM test_instances WHERE id = $1';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        // Delete the test instance (cascade will handle audit logs)
        const deleteQuery = 'DELETE FROM test_instances WHERE id = $1';
        await pool.query(deleteQuery, [id]);

        res.json({
            success: true,
            message: 'Test instance deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting test instance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete test instance',
            details: error.message
        });
    }
});

module.exports = router; 
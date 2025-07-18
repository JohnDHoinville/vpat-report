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
 * Update a test instance with enhanced status management and workflow validation
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

        // Enhanced status validation and transition rules
        if (status !== undefined) {
            const validStatuses = ['pending', 'in_progress', 'passed', 'failed', 'untestable', 'not_applicable', 'needs_review'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            // Status transition validation rules
            const statusTransitions = {
                'pending': ['in_progress', 'passed', 'failed', 'untestable', 'not_applicable'],
                'in_progress': ['passed', 'failed', 'untestable', 'not_applicable', 'needs_review', 'pending'],
                'passed': ['needs_review', 'in_progress'],
                'failed': ['needs_review', 'in_progress'],
                'untestable': ['needs_review', 'in_progress'],
                'not_applicable': ['needs_review', 'in_progress'],
                'needs_review': ['passed', 'failed', 'untestable', 'not_applicable', 'in_progress']
            };

            const allowedTransitions = statusTransitions[existing.status] || [];
            if (existing.status !== status && !allowedTransitions.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status transition from '${existing.status}' to '${status}'. Allowed transitions: ${allowedTransitions.join(', ')}`
                });
            }

            // Require confidence level for completed statuses
            if (['passed', 'failed', 'untestable', 'not_applicable'].includes(status)) {
                if (!confidence_level && !existing.confidence_level) {
                    return res.status(400).json({
                        success: false,
                        error: 'Confidence level is required when marking test as completed'
                    });
                }
            }

            // Require notes for failed tests
            if (status === 'failed' && !notes && !existing.notes) {
                return res.status(400).json({
                    success: false,
                    error: 'Notes are required when marking test as failed'
                });
            }
        }

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
            } else if (status === 'pending') {
                // Reset timing when returning to pending
                paramCount++;
                updates.push(`started_at = $${paramCount}`);
                params.push(null);
                paramCount++;
                updates.push(`completed_at = $${paramCount}`);
                params.push(null);
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
            const validConfidenceLevels = ['low', 'medium', 'high'];
            if (!validConfidenceLevels.includes(confidence_level)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid confidence level. Must be one of: ${validConfidenceLevels.join(', ')}`
                });
            }
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
        const updatedInstance = result.rows[0];

        // Get session and project info for WebSocket notifications
        const sessionQuery = `
            SELECT ts.id as session_id, ts.project_id, ts.name as session_name,
                   tr.criterion_number, tr.title as requirement_title
            FROM test_instances ti
            JOIN test_sessions ts ON ti.session_id = ts.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ti.id = $1
        `;
        const sessionResult = await pool.query(sessionQuery, [id]);
        const sessionInfo = sessionResult.rows[0];

        // Emit WebSocket notification for status changes
        if (status !== undefined && status !== existing.status) {
            const websocketService = req.app.get('websocketService');
            if (websocketService) {
                const statusChangeData = {
                    testInstanceId: id,
                    sessionId: sessionInfo.session_id,
                    projectId: sessionInfo.project_id,
                    requirementTitle: sessionInfo.requirement_title,
                    criterionNumber: sessionInfo.criterion_number,
                    oldStatus: existing.status,
                    newStatus: status,
                    updatedBy: req.user?.username || 'System',
                    timestamp: new Date().toISOString(),
                    confidence_level: confidence_level || existing.confidence_level
                };

                // Emit to session participants
                websocketService.emitSessionProgress(sessionInfo.session_id, sessionInfo.project_id, {
                    type: 'test_status_changed',
                    data: statusChangeData
                });

                // Emit specific status change notification
                websocketService.io.to(`session_${sessionInfo.session_id}`).emit('test_status_changed', statusChangeData);
            }
        }

        // Log the change for audit trail
        if (req.app.get('auditLogger')) {
            await req.app.get('auditLogger').logChange(
                'test_instance',
                id,
                req.user?.id || 'system',
                'update',
                { old: existing, new: updatedInstance },
                `Test instance updated: ${status ? `status changed to ${status}` : 'properties updated'}`
            );
        }

        res.json({
            success: true,
            message: 'Test instance updated successfully',
            data: updatedInstance,
            statusChange: status !== undefined && status !== existing.status ? {
                from: existing.status,
                to: status
            } : null
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
 * GET /api/test-instances/:id/status
 * Get current status of a test instance
 */
router.get('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                id,
                status,
                confidence_level,
                notes,
                assigned_tester,
                started_at,
                completed_at,
                created_at,
                updated_at
            FROM test_instances 
            WHERE id = $1
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
        console.error('Error fetching test instance status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test instance status',
            details: error.message
        });
    }
});

/**
 * PUT /api/test-instances/:id/status
 * Dedicated endpoint for status management with enhanced workflow validation
 */
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            status, 
            confidence_level, 
            notes, 
            remediation_notes,
            evidence,
            force = false // Allow bypassing some validation rules
        } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        // Get current test instance with full context
        const instanceQuery = `
            SELECT ti.*, ts.name as session_name, ts.project_id,
                   tr.criterion_number, tr.title as requirement_title,
                   u.username as assigned_tester_name
            FROM test_instances ti
            JOIN test_sessions ts ON ti.session_id = ts.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN users u ON ti.assigned_tester = u.id
            WHERE ti.id = $1
        `;
        const instanceResult = await pool.query(instanceQuery, [id]);

        if (instanceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        const instance = instanceResult.rows[0];

        // Enhanced status validation
        const validStatuses = ['pending', 'in_progress', 'passed', 'failed', 'untestable', 'not_applicable', 'needs_review'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Status transition validation (unless forced)
        if (!force) {
            const statusTransitions = {
                'pending': ['in_progress', 'passed', 'failed', 'untestable', 'not_applicable'],
                'in_progress': ['passed', 'failed', 'untestable', 'not_applicable', 'needs_review', 'pending'],
                'passed': ['needs_review', 'in_progress'],
                'failed': ['needs_review', 'in_progress'],
                'untestable': ['needs_review', 'in_progress'],
                'not_applicable': ['needs_review', 'in_progress'],
                'needs_review': ['passed', 'failed', 'untestable', 'not_applicable', 'in_progress']
            };

            const allowedTransitions = statusTransitions[instance.status] || [];
            if (instance.status !== status && !allowedTransitions.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status transition from '${instance.status}' to '${status}'. Allowed transitions: ${allowedTransitions.join(', ')}`,
                    allowedTransitions
                });
            }
        }

        // Business rule validations
        const validationErrors = [];

        // Require assignment for in-progress status
        if (status === 'in_progress' && !instance.assigned_tester) {
            validationErrors.push('Test must be assigned to a tester before marking as in-progress');
        }

        // Require confidence level for completed statuses
        if (['passed', 'failed', 'untestable', 'not_applicable'].includes(status)) {
            if (!confidence_level && !instance.confidence_level) {
                validationErrors.push('Confidence level is required for completed tests');
            }
        }

        // Require notes for failed tests
        if (status === 'failed' && !notes && !instance.notes) {
            validationErrors.push('Notes explaining the failure are required for failed tests');
        }

        // Require reviewer for needs_review status
        if (status === 'needs_review' && !instance.reviewer) {
            validationErrors.push('Reviewer must be assigned before marking test as needs review');
        }

        if (validationErrors.length > 0 && !force) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                validationErrors
            });
        }

        // Build update query
        const updates = ['status = $2'];
        const params = [id, status];
        let paramCount = 2;

        // Handle timing fields based on status
        if (status === 'in_progress' && !instance.started_at) {
            paramCount++;
            updates.push(`started_at = $${paramCount}`);
            params.push(new Date());
        } else if (['passed', 'failed', 'untestable', 'not_applicable'].includes(status) && !instance.completed_at) {
            paramCount++;
            updates.push(`completed_at = $${paramCount}`);
            params.push(new Date());
        } else if (status === 'pending') {
            // Reset timing when returning to pending
            paramCount++;
            updates.push(`started_at = $${paramCount}`);
            params.push(null);
            paramCount++;
            updates.push(`completed_at = $${paramCount}`);
            params.push(null);
        } else if (status === 'needs_review') {
            paramCount++;
            updates.push(`reviewed_at = $${paramCount}`);
            params.push(new Date());
        }

        // Add optional fields
        if (confidence_level) {
            paramCount++;
            updates.push(`confidence_level = $${paramCount}`);
            params.push(confidence_level);
        }

        if (notes) {
            paramCount++;
            updates.push(`notes = $${paramCount}`);
            params.push(notes);
        }

        if (remediation_notes) {
            paramCount++;
            updates.push(`remediation_notes = $${paramCount}`);
            params.push(remediation_notes);
        }

        if (evidence) {
            paramCount++;
            updates.push(`evidence = $${paramCount}`);
            params.push(JSON.stringify(evidence));
        }

        // Add updated timestamp
        paramCount++;
        updates.push(`updated_at = $${paramCount}`);
        params.push(new Date());

        // Execute update
        const updateQuery = `
            UPDATE test_instances 
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(updateQuery, params);
        const updatedInstance = result.rows[0];

        // Emit WebSocket notification
        const websocketService = req.app.get('websocketService');
        if (websocketService) {
            const statusChangeData = {
                testInstanceId: id,
                sessionId: instance.session_id,
                projectId: instance.project_id,
                requirementTitle: instance.requirement_title,
                criterionNumber: instance.criterion_number,
                oldStatus: instance.status,
                newStatus: status,
                updatedBy: req.user?.username || 'System',
                timestamp: new Date().toISOString(),
                confidence_level: confidence_level || instance.confidence_level,
                assignedTester: instance.assigned_tester_name
            };

            // Emit to session room
            websocketService.io.to(`session_${instance.session_id}`).emit('test_status_changed', statusChangeData);

            // Emit to project room
            websocketService.io.to(`project_${instance.project_id}`).emit('project_test_updated', statusChangeData);

            // Send personal notification to assigned tester if relevant
            if (instance.assigned_tester && ['needs_review', 'passed', 'failed'].includes(status)) {
                websocketService.emitUserNotification(instance.assigned_tester, {
                    type: 'test_status_updated',
                    title: 'Test Status Updated',
                    message: `Test ${instance.criterion_number} has been marked as ${status}`,
                    data: statusChangeData
                });
            }
        }

        // Log audit trail
        if (req.app.get('auditLogger')) {
            await req.app.get('auditLogger').logChange(
                'test_instance',
                id,
                req.user?.id || 'system',
                'status_change',
                { 
                    from: instance.status, 
                    to: status,
                    confidence_level,
                    notes,
                    remediation_notes
                },
                `Status changed from ${instance.status} to ${status}`
            );
        }

        res.json({
            success: true,
            message: `Test status updated to ${status}`,
            data: updatedInstance,
            statusChange: {
                from: instance.status,
                to: status,
                timestamp: new Date().toISOString(),
                updatedBy: req.user?.username || 'System'
            }
        });

    } catch (error) {
        console.error('❌ Error updating test status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update test status',
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

        // Check if test instance exists
        const instanceExists = await pool.query('SELECT id FROM test_instances WHERE id = $1', [id]);
        if (instanceExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        // Check if user exists (only if assigning, not unassigning)
        if (assigned_tester) {
            const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [assigned_tester]);
            if (userExists.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
        }

        // Update the test instance
        const updateQuery = `
            UPDATE test_instances 
            SET 
                assigned_tester = $1,
                assigned_at = CASE WHEN $1 IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,
                updated_at = CURRENT_TIMESTAMP,
                notes = COALESCE($2, notes)
            WHERE id = $3
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [assigned_tester, notes, id]);

        const isAssignment = assigned_tester !== null;
        const message = isAssignment ? 'Test instance assigned successfully' : 'Test instance unassigned successfully';

        res.json({
            success: true,
            message: message,
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
 * GET /api/test-instances/:id/assign
 * Get available testers for assignment
 */
router.get('/:id/assign', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if test instance exists
        const instanceExists = await pool.query('SELECT id FROM test_instances WHERE id = $1', [id]);
        if (instanceExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        // Get available testers
        const testersQuery = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.email,
                u.role,
                COUNT(ti.id) as assigned_tests_count
            FROM users u
            LEFT JOIN test_instances ti ON u.id = ti.assigned_tester AND ti.status IN ('pending', 'in_progress')
            WHERE u.is_active = true AND u.role IN ('admin', 'user')
            GROUP BY u.id, u.username, u.full_name, u.email, u.role
            ORDER BY assigned_tests_count ASC, u.username ASC
        `;

        const result = await pool.query(testersQuery);

        res.json({
            success: true,
            data: {
                available_testers: result.rows,
                test_instance_id: id
            }
        });

    } catch (error) {
        console.error('❌ Error fetching available testers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available testers',
            details: error.message
        });
    }
});

/**
 * POST /api/test-instances/:id/evidence
 * Add evidence to a test instance with enhanced file validation and metadata
 */
router.post('/:id/evidence', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            evidence_type, 
            file_path, 
            description, 
            metadata,
            file_size,
            mime_type,
            original_filename
        } = req.body;

        if (!evidence_type || !file_path) {
            return res.status(400).json({
                success: false,
                error: 'evidence_type and file_path are required'
            });
        }

        // Validate evidence type
        const validEvidenceTypes = [
            'screenshot', 
            'video', 
            'audio', 
            'document', 
            'test_result', 
            'accessibility_report',
            'screen_recording',
            'browser_console_log',
            'network_trace',
            'other'
        ];

        if (!validEvidenceTypes.includes(evidence_type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid evidence type. Must be one of: ${validEvidenceTypes.join(', ')}`
            });
        }

        // Validate file size (max 50MB)
        if (file_size && file_size > 50 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'File size cannot exceed 50MB'
            });
        }

        // Validate MIME type for security
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/quicktime',
            'audio/mp3', 'audio/wav', 'audio/ogg',
            'application/pdf', 'text/plain', 'text/html', 'application/json',
            'application/zip', 'application/x-zip-compressed'
        ];

        if (mime_type && !allowedMimeTypes.includes(mime_type)) {
            return res.status(400).json({
                success: false,
                error: 'File type not allowed'
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
        
        // Create new evidence entry
        const newEvidence = {
            id: require('crypto').randomUUID(),
            type: evidence_type,
            file_path,
            description: description || '',
            metadata: {
                ...metadata,
                file_size,
                mime_type,
                original_filename,
                upload_timestamp: new Date().toISOString(),
                uploaded_by_user: req.user?.id,
                uploaded_by_username: req.user?.username
            },
            uploaded_by: req.user?.id || 'system',
            uploaded_at: new Date().toISOString(),
            status: 'active'
        };

        const updatedEvidence = [...currentEvidence, newEvidence];

        // Update test instance with new evidence
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

        // Get session info for WebSocket notification
        const sessionQuery = `
            SELECT ts.id as session_id, ts.project_id, ts.name as session_name,
                   tr.criterion_number, tr.title as requirement_title
            FROM test_instances ti
            JOIN test_sessions ts ON ti.session_id = ts.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ti.id = $1
        `;
        const sessionResult = await pool.query(sessionQuery, [id]);
        const sessionInfo = sessionResult.rows[0];

        // Emit WebSocket notification
        const websocketService = req.app.get('websocketService');
        if (websocketService && sessionInfo) {
            const evidenceData = {
                testInstanceId: id,
                sessionId: sessionInfo.session_id,
                projectId: sessionInfo.project_id,
                evidenceId: newEvidence.id,
                evidenceType: evidence_type,
                description,
                uploadedBy: req.user?.username || 'System',
                timestamp: new Date().toISOString()
            };

            websocketService.io.to(`session_${sessionInfo.session_id}`).emit('evidence_added', evidenceData);
        }

        // Log audit trail
        if (req.app.get('auditLogger')) {
            await req.app.get('auditLogger').logChange(
                'test_instance',
                id,
                req.user?.id || 'system',
                'evidence_added',
                newEvidence,
                `Evidence added: ${evidence_type} - ${description}`
            );
        }

        res.json({
            success: true,
            message: 'Evidence added successfully',
            data: {
                test_instance: result.rows[0],
                new_evidence: newEvidence,
                total_evidence_count: updatedEvidence.length
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
 * DELETE /api/test-instances/:id/evidence/:evidenceId
 * Remove specific evidence from a test instance
 */
router.delete('/:id/evidence/:evidenceId', authenticateToken, async (req, res) => {
    try {
        const { id, evidenceId } = req.params;

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
        
        // Find and remove the evidence
        const evidenceIndex = currentEvidence.findIndex(ev => ev.id === evidenceId);
        
        if (evidenceIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Evidence not found'
            });
        }

        const removedEvidence = currentEvidence[evidenceIndex];
        
        // Check permissions (only uploader or admin can remove)
        if (removedEvidence.uploaded_by !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'You can only remove evidence that you uploaded'
            });
        }

        // Mark as deleted instead of removing (for audit trail)
        const updatedEvidence = currentEvidence.map(ev => 
            ev.id === evidenceId 
                ? { ...ev, status: 'deleted', deleted_at: new Date().toISOString(), deleted_by: req.user?.id }
                : ev
        );

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

        // Log audit trail
        if (req.app.get('auditLogger')) {
            await req.app.get('auditLogger').logChange(
                'test_instance',
                id,
                req.user?.id || 'system',
                'evidence_deleted',
                removedEvidence,
                `Evidence deleted: ${removedEvidence.type} - ${removedEvidence.description}`
            );
        }

        res.json({
            success: true,
            message: 'Evidence removed successfully',
            data: {
                test_instance: result.rows[0],
                removed_evidence: removedEvidence
            }
        });

    } catch (error) {
        console.error('❌ Error removing evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove evidence',
            details: error.message
        });
    }
});

/**
 * PUT /api/test-instances/:id/evidence/:evidenceId
 * Update evidence metadata and description
 */
router.put('/:id/evidence/:evidenceId', authenticateToken, async (req, res) => {
    try {
        const { id, evidenceId } = req.params;
        const { description, metadata } = req.body;

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
        
        // Find the evidence to update
        const evidenceIndex = currentEvidence.findIndex(ev => ev.id === evidenceId);
        
        if (evidenceIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Evidence not found'
            });
        }

        const existingEvidence = currentEvidence[evidenceIndex];
        
        // Check permissions
        if (existingEvidence.uploaded_by !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'You can only update evidence that you uploaded'
            });
        }

        // Update the evidence
        const updatedEvidence = currentEvidence.map(ev => 
            ev.id === evidenceId 
                ? { 
                    ...ev, 
                    description: description !== undefined ? description : ev.description,
                    metadata: { 
                        ...ev.metadata, 
                        ...metadata,
                        last_updated: new Date().toISOString(),
                        updated_by: req.user?.id
                    }
                }
                : ev
        );

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
            message: 'Evidence updated successfully',
            data: {
                test_instance: result.rows[0],
                updated_evidence: updatedEvidence.find(ev => ev.id === evidenceId)
            }
        });

    } catch (error) {
        console.error('❌ Error updating evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update evidence',
            details: error.message
        });
    }
});

/**
 * GET /api/test-instances/:id/evidence
 * Get all evidence for a test instance (excluding deleted items)
 */
router.get('/:id/evidence', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { include_deleted = false } = req.query;

        const query = 'SELECT evidence FROM test_instances WHERE id = $1';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        let evidence = result.rows[0].evidence || [];
        
        // Filter out deleted evidence unless explicitly requested
        if (!include_deleted) {
            evidence = evidence.filter(ev => ev.status !== 'deleted');
        }

        // Sort by upload date (newest first)
        evidence.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

        res.json({
            success: true,
            data: evidence,
            summary: {
                total_count: evidence.length,
                by_type: evidence.reduce((acc, ev) => {
                    acc[ev.type] = (acc[ev.type] || 0) + 1;
                    return acc;
                }, {}),
                total_size: evidence.reduce((acc, ev) => acc + (ev.metadata?.file_size || 0), 0)
            }
        });

    } catch (error) {
        console.error('❌ Error fetching evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch evidence',
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

/**
 * POST /api/test-instances/bulk/status
 * Bulk update status for multiple test instances
 */
router.post('/bulk/status', authenticateToken, async (req, res) => {
    try {
        const { 
            test_instance_ids, 
            status, 
            confidence_level, 
            notes, 
            force = false 
        } = req.body;

        if (!test_instance_ids || !Array.isArray(test_instance_ids) || test_instance_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'test_instance_ids array is required'
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        const validStatuses = ['pending', 'in_progress', 'passed', 'failed', 'untestable', 'not_applicable', 'needs_review'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const client = await pool.connect();
        const results = [];
        const errors = [];

        try {
            await client.query('BEGIN');

            for (const testId of test_instance_ids) {
                try {
                    // Get current instance
                    const instanceQuery = `
                        SELECT ti.*, ts.name as session_name, ts.project_id,
                               tr.criterion_number, tr.title as requirement_title
                        FROM test_instances ti
                        JOIN test_sessions ts ON ti.session_id = ts.id
                        JOIN test_requirements tr ON ti.requirement_id = tr.id
                        WHERE ti.id = $1
                    `;
                    const instanceResult = await client.query(instanceQuery, [testId]);

                    if (instanceResult.rows.length === 0) {
                        errors.push({ testId, error: 'Test instance not found' });
                        continue;
                    }

                    const instance = instanceResult.rows[0];

                    // Validate status transition (unless forced)
                    if (!force) {
                        const statusTransitions = {
                            'pending': ['in_progress', 'passed', 'failed', 'untestable', 'not_applicable'],
                            'in_progress': ['passed', 'failed', 'untestable', 'not_applicable', 'needs_review', 'pending'],
                            'passed': ['needs_review', 'in_progress'],
                            'failed': ['needs_review', 'in_progress'],
                            'untestable': ['needs_review', 'in_progress'],
                            'not_applicable': ['needs_review', 'in_progress'],
                            'needs_review': ['passed', 'failed', 'untestable', 'not_applicable', 'in_progress']
                        };

                        const allowedTransitions = statusTransitions[instance.status] || [];
                        if (instance.status !== status && !allowedTransitions.includes(status)) {
                            errors.push({ 
                                testId, 
                                error: `Invalid transition from ${instance.status} to ${status}`,
                                currentStatus: instance.status,
                                allowedTransitions
                            });
                            continue;
                        }
                    }

                    // Build update query
                    const updates = ['status = $2'];
                    const params = [testId, status];
                    let paramCount = 2;

                    // Handle timing fields
                    if (status === 'in_progress' && !instance.started_at) {
                        paramCount++;
                        updates.push(`started_at = $${paramCount}`);
                        params.push(new Date());
                    } else if (['passed', 'failed', 'untestable', 'not_applicable'].includes(status) && !instance.completed_at) {
                        paramCount++;
                        updates.push(`completed_at = $${paramCount}`);
                        params.push(new Date());
                    } else if (status === 'pending') {
                        paramCount++;
                        updates.push(`started_at = $${paramCount}`);
                        params.push(null);
                        paramCount++;
                        updates.push(`completed_at = $${paramCount}`);
                        params.push(null);
                    }

                    if (confidence_level) {
                        paramCount++;
                        updates.push(`confidence_level = $${paramCount}`);
                        params.push(confidence_level);
                    }

                    if (notes) {
                        paramCount++;
                        updates.push(`notes = $${paramCount}`);
                        params.push(notes);
                    }

                    paramCount++;
                    updates.push(`updated_at = $${paramCount}`);
                    params.push(new Date());

                    const updateQuery = `
                        UPDATE test_instances 
                        SET ${updates.join(', ')}
                        WHERE id = $1
                        RETURNING *
                    `;

                    const updateResult = await client.query(updateQuery, params);
                    const updatedInstance = updateResult.rows[0];

                    results.push({
                        testId,
                        success: true,
                        oldStatus: instance.status,
                        newStatus: status,
                        data: updatedInstance
                    });

                    // Emit WebSocket notification
                    const websocketService = req.app.get('websocketService');
                    if (websocketService) {
                        const statusChangeData = {
                            testInstanceId: testId,
                            sessionId: instance.session_id,
                            projectId: instance.project_id,
                            requirementTitle: instance.requirement_title,
                            criterionNumber: instance.criterion_number,
                            oldStatus: instance.status,
                            newStatus: status,
                            updatedBy: req.user?.username || 'System',
                            timestamp: new Date().toISOString(),
                            bulkOperation: true
                        };

                        websocketService.io.to(`session_${instance.session_id}`).emit('test_status_changed', statusChangeData);
                    }

                } catch (error) {
                    errors.push({ testId, error: error.message });
                }
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: `Bulk status update completed. ${results.length} successful, ${errors.length} errors.`,
                results,
                errors,
                summary: {
                    total: test_instance_ids.length,
                    successful: results.length,
                    failed: errors.length,
                    status: status
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error in bulk status update:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform bulk status update',
            details: error.message
        });
    }
});

/**
 * POST /api/test-instances/bulk/assign
 * Bulk assign multiple test instances to a tester
 */
router.post('/bulk/assign', authenticateToken, async (req, res) => {
    try {
        const { test_instance_ids, assigned_tester, notes } = req.body;

        if (!test_instance_ids || !Array.isArray(test_instance_ids) || test_instance_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'test_instance_ids array is required'
            });
        }

        if (!assigned_tester) {
            return res.status(400).json({
                success: false,
                error: 'assigned_tester is required'
            });
        }

        // Verify tester exists
        const testerExists = await pool.query('SELECT id, username FROM users WHERE id = $1', [assigned_tester]);
        if (testerExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Assigned tester not found'
            });
        }

        const testerInfo = testerExists.rows[0];
        const client = await pool.connect();
        const results = [];
        const errors = [];

        try {
            await client.query('BEGIN');

            for (const testId of test_instance_ids) {
                try {
                    // Get current instance
                    const instanceQuery = `
                        SELECT ti.*, ts.name as session_name, ts.project_id,
                               tr.criterion_number, tr.title as requirement_title
                        FROM test_instances ti
                        JOIN test_sessions ts ON ti.session_id = ts.id
                        JOIN test_requirements tr ON ti.requirement_id = tr.id
                        WHERE ti.id = $1
                    `;
                    const instanceResult = await client.query(instanceQuery, [testId]);

                    if (instanceResult.rows.length === 0) {
                        errors.push({ testId, error: 'Test instance not found' });
                        continue;
                    }

                    const instance = instanceResult.rows[0];

                    // Update assignment
                    const updateQuery = `
                        UPDATE test_instances 
                        SET 
                            assigned_tester = $2,
                            assigned_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP,
                            notes = COALESCE($3, notes)
                        WHERE id = $1
                        RETURNING *
                    `;

                    const updateResult = await client.query(updateQuery, [testId, assigned_tester, notes]);
                    const updatedInstance = updateResult.rows[0];

                    results.push({
                        testId,
                        success: true,
                        previousTester: instance.assigned_tester,
                        newTester: assigned_tester,
                        data: updatedInstance
                    });

                    // Emit WebSocket notification
                    const websocketService = req.app.get('websocketService');
                    if (websocketService) {
                        const assignmentData = {
                            testInstanceId: testId,
                            sessionId: instance.session_id,
                            projectId: instance.project_id,
                            requirementTitle: instance.requirement_title,
                            criterionNumber: instance.criterion_number,
                            assignedTester: assigned_tester,
                            testerName: testerInfo.username,
                            assignedBy: req.user?.username || 'System',
                            timestamp: new Date().toISOString(),
                            bulkOperation: true
                        };

                        websocketService.io.to(`session_${instance.session_id}`).emit('test_assigned', assignmentData);
                        
                        // Notify the assigned tester
                        websocketService.emitUserNotification(assigned_tester, {
                            type: 'test_assigned',
                            title: 'New Test Assignment',
                            message: `You have been assigned test ${instance.criterion_number} in ${instance.session_name}`,
                            data: assignmentData
                        });
                    }

                } catch (error) {
                    errors.push({ testId, error: error.message });
                }
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: `Bulk assignment completed. ${results.length} successful, ${errors.length} errors.`,
                results,
                errors,
                summary: {
                    total: test_instance_ids.length,
                    successful: results.length,
                    failed: errors.length,
                    assignedTo: testerInfo.username
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error in bulk assignment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform bulk assignment',
            details: error.message
        });
    }
});

/**
 * POST /api/test-instances/bulk/notes
 * Bulk add notes to multiple test instances
 */
router.post('/bulk/notes', authenticateToken, async (req, res) => {
    try {
        const { test_instance_ids, notes, append = true } = req.body;

        if (!test_instance_ids || !Array.isArray(test_instance_ids) || test_instance_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'test_instance_ids array is required'
            });
        }

        if (!notes) {
            return res.status(400).json({
                success: false,
                error: 'Notes are required'
            });
        }

        const client = await pool.connect();
        const results = [];
        const errors = [];

        try {
            await client.query('BEGIN');

            for (const testId of test_instance_ids) {
                try {
                    let updateQuery;
                    let params;

                    if (append) {
                        // Append to existing notes
                        updateQuery = `
                            UPDATE test_instances 
                            SET 
                                notes = CASE 
                                    WHEN notes IS NULL OR notes = '' THEN $2
                                    ELSE notes || E'\n\n--- Bulk Update ---\n' || $2
                                END,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                            RETURNING *
                        `;
                        params = [testId, notes];
                    } else {
                        // Replace existing notes
                        updateQuery = `
                            UPDATE test_instances 
                            SET notes = $2, updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                            RETURNING *
                        `;
                        params = [testId, notes];
                    }

                    const updateResult = await client.query(updateQuery, params);

                    if (updateResult.rows.length === 0) {
                        errors.push({ testId, error: 'Test instance not found' });
                        continue;
                    }

                    results.push({
                        testId,
                        success: true,
                        data: updateResult.rows[0]
                    });

                } catch (error) {
                    errors.push({ testId, error: error.message });
                }
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: `Bulk notes update completed. ${results.length} successful, ${errors.length} errors.`,
                results,
                errors,
                summary: {
                    total: test_instance_ids.length,
                    successful: results.length,
                    failed: errors.length,
                    operation: append ? 'append' : 'replace'
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error in bulk notes update:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform bulk notes update',
            details: error.message
        });
    }
});

/**
 * POST /api/test-instances/:id/review
 * Submit a test instance for review
 */
router.post('/:id/review', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewer_id, review_notes, priority = 'normal' } = req.body;

        // Get current test instance
        const instanceQuery = `
            SELECT ti.*, ts.name as session_name, ts.project_id,
                   tr.criterion_number, tr.title as requirement_title,
                   u.username as assigned_tester_name
            FROM test_instances ti
            JOIN test_sessions ts ON ti.session_id = ts.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN users u ON ti.assigned_tester = u.id
            WHERE ti.id = $1
        `;
        const instanceResult = await pool.query(instanceQuery, [id]);

        if (instanceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        const instance = instanceResult.rows[0];

        // Validate that test is in a reviewable state
        const reviewableStatuses = ['passed', 'failed', 'untestable', 'not_applicable'];
        if (!reviewableStatuses.includes(instance.status)) {
            return res.status(400).json({
                success: false,
                error: `Test must be completed before review. Current status: ${instance.status}`
            });
        }

        // Verify reviewer exists if specified
        let reviewerInfo = null;
        if (reviewer_id) {
            const reviewerQuery = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [reviewer_id]);
            if (reviewerQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Specified reviewer not found'
                });
            }
            reviewerInfo = reviewerQuery.rows[0];
        }

        // Update test instance for review
        const updateQuery = `
            UPDATE test_instances 
            SET 
                status = 'needs_review',
                reviewer = $2,
                updated_at = CURRENT_TIMESTAMP,
                notes = CASE 
                    WHEN $3 IS NOT NULL THEN 
                        COALESCE(notes, '') || 
                        CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n--- Review Request ---\n' ELSE '' END ||
                        $3
                    ELSE notes
                END
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [id, reviewer_id, review_notes]);
        const updatedInstance = result.rows[0];

        // Create review record in audit log
        if (req.app.get('auditLogger')) {
            await req.app.get('auditLogger').logChange(
                'test_instance',
                id,
                req.user?.id || 'system',
                'review_requested',
                {
                    reviewer_id,
                    review_notes,
                    priority,
                    previous_status: instance.status
                },
                `Review requested for test ${instance.criterion_number}`
            );
        }

        // Emit WebSocket notifications
        const websocketService = req.app.get('websocketService');
        if (websocketService) {
            const reviewData = {
                testInstanceId: id,
                sessionId: instance.session_id,
                projectId: instance.project_id,
                requirementTitle: instance.requirement_title,
                criterionNumber: instance.criterion_number,
                requestedBy: req.user?.username || 'System',
                reviewer: reviewerInfo?.username || 'Unassigned',
                priority,
                timestamp: new Date().toISOString()
            };

            // Notify session participants
            websocketService.io.to(`session_${instance.session_id}`).emit('review_requested', reviewData);

            // Notify specific reviewer if assigned
            if (reviewer_id) {
                websocketService.emitUserNotification(reviewer_id, {
                    type: 'review_assigned',
                    title: 'New Review Assignment',
                    message: `You have been assigned to review test ${instance.criterion_number} in ${instance.session_name}`,
                    data: reviewData
                });
            }
        }

        res.json({
            success: true,
            message: 'Test submitted for review successfully',
            data: updatedInstance,
            review_info: {
                reviewer: reviewerInfo,
                priority,
                submitted_by: req.user?.username || 'System',
                submitted_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error submitting test for review:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit test for review',
            details: error.message
        });
    }
});

/**
 * POST /api/test-instances/:id/review/approve
 * Approve a test instance after review
 */
router.post('/:id/review/approve', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            approved_status, 
            review_comments, 
            confidence_adjustment,
            recommendations 
        } = req.body;

        // Validate approved status
        const validApprovedStatuses = ['passed', 'failed', 'untestable', 'not_applicable'];
        if (!validApprovedStatuses.includes(approved_status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid approved status. Must be one of: ${validApprovedStatuses.join(', ')}`
            });
        }

        // Get current test instance
        const instanceQuery = `
            SELECT ti.*, ts.name as session_name, ts.project_id,
                   tr.criterion_number, tr.title as requirement_title
            FROM test_instances ti
            JOIN test_sessions ts ON ti.session_id = ts.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ti.id = $1
        `;
        const instanceResult = await pool.query(instanceQuery, [id]);

        if (instanceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        const instance = instanceResult.rows[0];

        // Verify test is in review status
        if (instance.status !== 'needs_review') {
            return res.status(400).json({
                success: false,
                error: `Test is not in review status. Current status: ${instance.status}`
            });
        }

        // Verify user is the assigned reviewer or has admin rights
        if (instance.reviewer !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to review this test'
            });
        }

        // Update test instance with approval
        const updateQuery = `
            UPDATE test_instances 
            SET 
                status = $2,
                reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP,
                confidence_level = COALESCE($3, confidence_level),
                notes = CASE 
                    WHEN $4 IS NOT NULL THEN 
                        COALESCE(notes, '') || 
                        E'\n\n--- Review Approval ---\n' || $4
                    ELSE notes
                END,
                remediation_notes = CASE 
                    WHEN $5 IS NOT NULL THEN 
                        COALESCE(remediation_notes, '') || 
                        CASE WHEN remediation_notes IS NOT NULL AND remediation_notes != '' THEN E'\n\n--- Review Recommendations ---\n' ELSE '' END ||
                        $5
                    ELSE remediation_notes
                END
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            id, 
            approved_status, 
            confidence_adjustment, 
            review_comments,
            recommendations
        ]);
        const updatedInstance = result.rows[0];

        // Log review approval
        if (req.app.get('auditLogger')) {
            await req.app.get('auditLogger').logChange(
                'test_instance',
                id,
                req.user?.id || 'system',
                'review_approved',
                {
                    approved_status,
                    review_comments,
                    confidence_adjustment,
                    recommendations,
                    previous_status: instance.status
                },
                `Review approved: ${instance.criterion_number} - ${approved_status}`
            );
        }

        // Emit WebSocket notifications
        const websocketService = req.app.get('websocketService');
        if (websocketService) {
            const approvalData = {
                testInstanceId: id,
                sessionId: instance.session_id,
                projectId: instance.project_id,
                requirementTitle: instance.requirement_title,
                criterionNumber: instance.criterion_number,
                approvedStatus: approved_status,
                reviewedBy: req.user?.username || 'System',
                timestamp: new Date().toISOString(),
                hasRecommendations: !!recommendations
            };

            // Notify session participants
            websocketService.io.to(`session_${instance.session_id}`).emit('review_approved', approvalData);

            // Notify original tester
            if (instance.assigned_tester) {
                websocketService.emitUserNotification(instance.assigned_tester, {
                    type: 'review_completed',
                    title: 'Review Completed',
                    message: `Your test ${instance.criterion_number} has been reviewed and approved as ${approved_status}`,
                    data: approvalData
                });
            }
        }

        res.json({
            success: true,
            message: `Test approved as ${approved_status}`,
            data: updatedInstance,
            review_result: {
                approved_status,
                reviewed_by: req.user?.username || 'System',
                reviewed_at: new Date().toISOString(),
                has_comments: !!review_comments,
                has_recommendations: !!recommendations
            }
        });

    } catch (error) {
        console.error('❌ Error approving test review:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve test review',
            details: error.message
        });
    }
});

/**
 * POST /api/test-instances/:id/review/reject
 * Reject a test instance and request changes
 */
router.post('/:id/review/reject', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            rejection_reason, 
            required_changes, 
            return_to_status = 'in_progress',
            priority = 'normal'
        } = req.body;

        if (!rejection_reason) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required'
            });
        }

        // Get current test instance
        const instanceQuery = `
            SELECT ti.*, ts.name as session_name, ts.project_id,
                   tr.criterion_number, tr.title as requirement_title
            FROM test_instances ti
            JOIN test_sessions ts ON ti.session_id = ts.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ti.id = $1
        `;
        const instanceResult = await pool.query(instanceQuery, [id]);

        if (instanceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }

        const instance = instanceResult.rows[0];

        // Verify test is in review status
        if (instance.status !== 'needs_review') {
            return res.status(400).json({
                success: false,
                error: `Test is not in review status. Current status: ${instance.status}`
            });
        }

        // Verify user is the assigned reviewer or has admin rights
        if (instance.reviewer !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to review this test'
            });
        }

        // Update test instance with rejection
        const updateQuery = `
            UPDATE test_instances 
            SET 
                status = $2,
                reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP,
                notes = COALESCE(notes, '') || 
                    E'\n\n--- Review Rejection ---\n' || $3 ||
                    CASE WHEN $4 IS NOT NULL THEN E'\n\nRequired Changes:\n' || $4 ELSE '' END
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            id, 
            return_to_status, 
            rejection_reason,
            required_changes
        ]);
        const updatedInstance = result.rows[0];

        // Log review rejection
        if (req.app.get('auditLogger')) {
            await req.app.get('auditLogger').logChange(
                'test_instance',
                id,
                req.user?.id || 'system',
                'review_rejected',
                {
                    rejection_reason,
                    required_changes,
                    return_to_status,
                    priority,
                    previous_status: instance.status
                },
                `Review rejected: ${instance.criterion_number} - ${rejection_reason}`
            );
        }

        // Emit WebSocket notifications
        const websocketService = req.app.get('websocketService');
        if (websocketService) {
            const rejectionData = {
                testInstanceId: id,
                sessionId: instance.session_id,
                projectId: instance.project_id,
                requirementTitle: instance.requirement_title,
                criterionNumber: instance.criterion_number,
                rejectionReason: rejection_reason,
                requiredChanges: required_changes,
                returnToStatus: return_to_status,
                reviewedBy: req.user?.username || 'System',
                priority,
                timestamp: new Date().toISOString()
            };

            // Notify session participants
            websocketService.io.to(`session_${instance.session_id}`).emit('review_rejected', rejectionData);

            // Notify original tester
            if (instance.assigned_tester) {
                websocketService.emitUserNotification(instance.assigned_tester, {
                    type: 'review_rejected',
                    title: 'Review Changes Requested',
                    message: `Your test ${instance.criterion_number} requires changes: ${rejection_reason}`,
                    data: rejectionData,
                    priority
                });
            }
        }

        res.json({
            success: true,
            message: 'Test review rejected and returned for changes',
            data: updatedInstance,
            review_result: {
                action: 'rejected',
                rejection_reason,
                required_changes,
                return_to_status,
                reviewed_by: req.user?.username || 'System',
                reviewed_at: new Date().toISOString(),
                priority
            }
        });

    } catch (error) {
        console.error('❌ Error rejecting test review:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reject test review',
            details: error.message
        });
    }
});

/**
 * GET /api/test-instances/reviews/pending
 * Get all test instances pending review for the current user
 */
router.get('/reviews/pending', authenticateToken, async (req, res) => {
    try {
        const { 
            session_id, 
            project_id, 
            priority,
            page = 1, 
            limit = 25,
            sort = 'updated_at',
            order = 'desc'
        } = req.query;

        // Build WHERE conditions
        const conditions = ['ti.status = \'needs_review\''];
        const params = [];
        let paramCount = 0;

        // Filter by reviewer (current user or unassigned)
        paramCount++;
        conditions.push(`(ti.reviewer = $${paramCount} OR ti.reviewer IS NULL)`);
        params.push(req.user?.id);

        if (session_id) {
            paramCount++;
            conditions.push(`ti.session_id = $${paramCount}`);
            params.push(session_id);
        }

        if (project_id) {
            paramCount++;
            conditions.push(`ts.project_id = $${paramCount}`);
            params.push(project_id);
        }

        // Pagination
        const limitNum = Math.min(parseInt(limit) || 25, 100);
        const offset = (parseInt(page) || 1 - 1) * limitNum;

        // Sort validation
        const validSortFields = ['updated_at', 'created_at', 'criterion_number', 'priority'];
        const sortField = validSortFields.includes(sort) ? sort : 'updated_at';
        const sortOrder = order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM test_instances ti
            JOIN test_sessions ts ON ti.session_id = ts.id
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, params);
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limitNum);

        // Get pending reviews
        paramCount += 2;
        const query = `
            SELECT 
                ti.*,
                ts.name as session_name,
                ts.project_id,
                tr.criterion_number,
                tr.title as requirement_title,
                tr.level as requirement_level,
                dp.url as page_url,
                dp.title as page_title,
                at_user.username as assigned_tester_name,
                rv_user.username as reviewer_name,
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ti.updated_at))/3600 as hours_pending
            FROM test_instances ti
            JOIN test_sessions ts ON ti.session_id = ts.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN users at_user ON ti.assigned_tester = at_user.id
            LEFT JOIN users rv_user ON ti.reviewer = rv_user.id
            ${whereClause}
            ORDER BY ti.${sortField} ${sortOrder}
            LIMIT $${paramCount - 1} OFFSET $${paramCount}
        `;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page) || 1,
                limit: limitNum,
                total_items: totalItems,
                total_pages: totalPages,
                has_next: (parseInt(page) || 1) < totalPages,
                has_prev: (parseInt(page) || 1) > 1
            },
            summary: {
                total_pending: totalItems,
                assigned_to_me: result.rows.filter(r => r.reviewer === req.user?.id).length,
                unassigned: result.rows.filter(r => !r.reviewer).length,
                urgent: result.rows.filter(r => r.hours_pending > 24).length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching pending reviews:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending reviews',
            details: error.message
        });
    }
});

module.exports = router; 
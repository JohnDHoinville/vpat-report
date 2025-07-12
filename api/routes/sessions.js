/**
 * Testing Sessions API Routes
 * Unified Testing Session Architecture
 * Created: December 11, 2024
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../../database/config');
const AuditLogger = require('../middleware/audit-logger');

// Apply audit logging middleware to all routes
router.use(AuditLogger.auditMiddleware());

/**
 * GET /api/sessions
 * List testing sessions with filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const {
            project_id,
            status,
            conformance_level,
            page = 1,
            limit = 20,
            sort_by = 'updated_at',
            sort_order = 'DESC',
            search
        } = req.query;

        // Build WHERE conditions
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (project_id) {
            whereConditions.push(`ts.project_id = $${paramIndex}`);
            queryParams.push(project_id);
            paramIndex++;
        }

        if (status) {
            whereConditions.push(`ts.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (conformance_level) {
            whereConditions.push(`ts.conformance_level = $${paramIndex}`);
            queryParams.push(conformance_level);
            paramIndex++;
        }

        if (search) {
            whereConditions.push(`(ts.name ILIKE $${paramIndex} OR ts.description ILIKE $${paramIndex})`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Validate sort parameters
        const allowedSortFields = ['name', 'created_at', 'updated_at', 'completion_percentage', 'status'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'updated_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Calculate offset
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Main query
        const query = `
            SELECT 
                ts.id,
                ts.name,
                ts.description,
                ts.conformance_level,
                ts.status,
                ts.total_tests_count,
                ts.completed_tests_count,
                ts.passed_tests_count,
                ts.failed_tests_count,
                ts.completion_percentage,
                ts.created_at,
                ts.updated_at,
                p.name as project_name,
                p.primary_url as project_url,
                au.username as created_by_username,
                COUNT(ti.id) as current_test_instances
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN users au ON ts.created_by = au.id
            LEFT JOIN test_instances ti ON ts.id = ti.session_id
            ${whereClause}
            GROUP BY ts.id, p.name, p.primary_url, au.username
            ORDER BY ts.${sortField} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(DISTINCT ts.id) as total
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset

        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / parseInt(limit));

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_count: totalCount,
                limit: parseInt(limit),
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching testing sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch testing sessions',
            error: error.message
        });
    }
});

/**
 * GET /api/sessions/:id
 * Get detailed session information with progress summary
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { include_tests = false } = req.query;

        // Get session details
        const sessionQuery = `
            SELECT 
                ts.*,
                p.name as project_name,
                p.primary_url as project_url,
                p.description as project_description,
                au_created.username as created_by_username
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN users au_created ON ts.created_by = au_created.id
            WHERE ts.id = $1
        `;

        const sessionResult = await pool.query(sessionQuery, [id]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Testing session not found'
            });
        }

        const session = sessionResult.rows[0];

        // Get detailed progress statistics
        const progressQuery = `
            SELECT 
                COUNT(*) as total_tests,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_tests,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tests,
                COUNT(*) FILTER (WHERE status = 'passed') as passed_tests,
                COUNT(*) FILTER (WHERE status = 'failed') as failed_tests,
                COUNT(*) FILTER (WHERE status = 'untestable') as untestable_tests,
                COUNT(*) FILTER (WHERE status = 'not_applicable') as not_applicable_tests,
                COUNT(*) FILTER (WHERE status = 'needs_review') as needs_review_tests,
                COUNT(*) FILTER (WHERE test_method_used = 'automated') as automated_tests,
                COUNT(*) FILTER (WHERE test_method_used = 'manual') as manual_tests,
                COUNT(DISTINCT assigned_tester) as unique_testers,
                COUNT(DISTINCT page_id) as pages_tested
            FROM test_instances 
            WHERE session_id = $1
        `;

        const progressResult = await pool.query(progressQuery, [id]);
        const progress = progressResult.rows[0];

        // Get requirement breakdown
        const requirementBreakdown = await pool.query(`
            SELECT 
                tr.requirement_type,
                tr.level,
                COUNT(*) as total_requirements,
                COUNT(*) FILTER (WHERE ti.status = 'passed') as passed_requirements,
                COUNT(*) FILTER (WHERE ti.status = 'failed') as failed_requirements
            FROM test_requirements tr
            LEFT JOIN test_instances ti ON tr.id = ti.requirement_id AND ti.session_id = $1
            WHERE tr.is_active = true
            GROUP BY tr.requirement_type, tr.level
            ORDER BY tr.requirement_type, tr.level
        `, [id]);

        // Optionally include test instances
        let testInstances = null;
        if (include_tests === 'true') {
            const testsQuery = `
                SELECT 
                    ti.id,
                    ti.status,
                    ti.assigned_tester,
                    ti.confidence_level,
                    ti.test_method_used,
                    ti.updated_at,
                    tr.criterion_number,
                    tr.title as requirement_title,
                    tr.requirement_type,
                    tr.level as requirement_level,
                    dp.url as page_url,
                    dp.title as page_title,
                    au.username as tester_username
                FROM test_instances ti
                JOIN test_requirements tr ON ti.requirement_id = tr.id
                LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
                LEFT JOIN users au ON ti.assigned_tester = au.id
                WHERE ti.session_id = $1
                ORDER BY tr.criterion_number, dp.url
            `;

            const testsResult = await pool.query(testsQuery, [id]);
            testInstances = testsResult.rows;
        }

        res.json({
            success: true,
            data: {
                session,
                progress,
                requirement_breakdown: requirementBreakdown.rows,
                test_instances: testInstances
            }
        });

    } catch (error) {
        console.error('Error fetching session details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch session details',
            error: error.message
        });
    }
});

/**
 * GET /api/sessions/:id/progress
 * Get detailed progress metrics for a testing session
 */
router.get('/:id/progress', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if session exists
        const sessionExists = await pool.query('SELECT id FROM test_sessions WHERE id = $1', [id]);
        if (sessionExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Testing session not found'
            });
        }

        // Get detailed progress metrics
        const progressQuery = `
            WITH progress_metrics AS (
                SELECT 
                    COUNT(*) as total_tests,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tests,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tests,
                    COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed_tests,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
                    COUNT(CASE WHEN status = 'untestable' THEN 1 END) as untestable_tests,
                    COUNT(CASE WHEN status = 'not_applicable' THEN 1 END) as not_applicable_tests,
                    COUNT(CASE WHEN status = 'needs_review' THEN 1 END) as needs_review_tests,
                    COUNT(CASE WHEN status IN ('passed', 'failed', 'not_applicable', 'untestable') THEN 1 END) as completed_tests,
                    COUNT(DISTINCT assigned_tester) FILTER (WHERE assigned_tester IS NOT NULL) as active_testers,
                    COUNT(DISTINCT page_id) as pages_under_test
                FROM test_instances 
                WHERE session_id = $1
            ),
            requirement_breakdown AS (
                SELECT 
                    tr.level as conformance_level,
                    COUNT(*) as total_requirements,
                    COUNT(CASE WHEN ti.status IN ('passed', 'failed', 'not_applicable', 'untestable') THEN 1 END) as completed_requirements,
                    COUNT(CASE WHEN ti.status = 'passed' THEN 1 END) as passed_requirements,
                    COUNT(CASE WHEN ti.status = 'failed' THEN 1 END) as failed_requirements
                FROM test_instances ti
                JOIN test_requirements tr ON ti.requirement_id = tr.id
                WHERE ti.session_id = $1
                GROUP BY tr.level
            ),
            tester_workload AS (
                SELECT 
                    u.username as tester_name,
                    COUNT(*) as assigned_tests,
                    COUNT(CASE WHEN ti.status IN ('passed', 'failed', 'not_applicable', 'untestable') THEN 1 END) as completed_tests,
                    COUNT(CASE WHEN ti.status = 'in_progress' THEN 1 END) as in_progress_tests,
                    ROUND(
                        (COUNT(CASE WHEN ti.status IN ('passed', 'failed', 'not_applicable', 'untestable') THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(*), 0), 1
                    ) as completion_percentage
                FROM test_instances ti
                LEFT JOIN users u ON ti.assigned_tester = u.id
                WHERE ti.session_id = $1 AND ti.assigned_tester IS NOT NULL
                GROUP BY u.id, u.username
            )
            SELECT 
                (SELECT row_to_json(progress_metrics) FROM progress_metrics) as overall_progress,
                (
                    SELECT json_agg(
                        json_build_object(
                            'conformance_level', conformance_level,
                            'total_requirements', total_requirements,
                            'completed_requirements', completed_requirements,
                            'passed_requirements', passed_requirements,
                            'failed_requirements', failed_requirements,
                            'completion_percentage', ROUND((completed_requirements * 100.0) / NULLIF(total_requirements, 0), 1)
                        )
                    ) FROM requirement_breakdown
                ) as requirement_breakdown,
                (
                    SELECT json_agg(
                        json_build_object(
                            'tester_name', tester_name,
                            'assigned_tests', assigned_tests,
                            'completed_tests', completed_tests,
                            'in_progress_tests', in_progress_tests,
                            'completion_percentage', completion_percentage
                        )
                    ) FROM tester_workload
                ) as tester_workload
        `;

        const result = await pool.query(progressQuery, [id]);
        const progressData = result.rows[0];

        // Calculate completion percentage
        const overallProgress = progressData.overall_progress || {};
        const completionPercentage = overallProgress.total_tests > 0 
            ? Math.round((overallProgress.completed_tests / overallProgress.total_tests) * 100)
            : 0;

        res.json({
            success: true,
            data: {
                session_id: id,
                completion_percentage: completionPercentage,
                overall_progress: overallProgress,
                requirement_breakdown: progressData.requirement_breakdown || [],
                tester_workload: progressData.tester_workload || [],
                summary: {
                    total_tests: overallProgress.total_tests || 0,
                    completed_tests: overallProgress.completed_tests || 0,
                    remaining_tests: (overallProgress.total_tests || 0) - (overallProgress.completed_tests || 0),
                    active_testers: overallProgress.active_testers || 0,
                    pages_under_test: overallProgress.pages_under_test || 0
                }
            }
        });

    } catch (error) {
        console.error('Error fetching session progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch session progress',
            error: error.message
        });
    }
});

/**
 * POST /api/sessions
 * Create a new testing session with conformance level selection
 */
router.post('/', async (req, res) => {
    try {
        const {
            project_id,
            name,
            description,
            conformance_level,
            page_scope = 'all', // 'all' or 'selected'
            selected_pages = [],
            auto_generate_tests = true
        } = req.body;

        // Validate required fields
        if (!project_id || !name || !conformance_level) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: project_id, name, conformance_level'
            });
        }

        // Validate conformance level
        const validConformanceLevels = ['A', 'AA', 'AAA', 'Section508', 'Custom'];
        if (!validConformanceLevels.includes(conformance_level)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid conformance level'
            });
        }

        // Verify project exists
        const projectResult = await pool.query('SELECT id FROM projects WHERE id = $1', [project_id]);
        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Start transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Create testing session
            const sessionResult = await client.query(`
                INSERT INTO test_sessions (
                    project_id, name, description, conformance_level, 
                    status, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                project_id,
                name,
                description,
                conformance_level,
                'planning',
                req.user?.id
            ]);

            const session = sessionResult.rows[0];

            // Auto-generate test instances if requested
            if (auto_generate_tests) {
                await generateTestInstances(client, session.id, conformance_level, page_scope, selected_pages);
            }

            await client.query('COMMIT');

            // Get updated session with statistics
            const updatedSession = await pool.query(`
                SELECT ts.*, p.name as project_name
                FROM test_sessions ts
                LEFT JOIN projects p ON ts.project_id = p.id
                WHERE ts.id = $1
            `, [session.id]);

            res.status(201).json({
                success: true,
                message: 'Testing session created successfully',
                data: updatedSession.rows[0]
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error creating testing session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create testing session',
            error: error.message
        });
    }
});

/**
 * PUT /api/sessions/:id
 * Update session metadata and status
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            status
        } = req.body;

        // Check if session exists
        const existingSession = await pool.query('SELECT * FROM test_sessions WHERE id = $1', [id]);
        if (existingSession.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Testing session not found'
            });
        }

        // Build update query dynamically
        let updateFields = [];
        let queryParams = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            queryParams.push(name);
            paramIndex++;
        }

        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            queryParams.push(description);
            paramIndex++;
        }

        if (status !== undefined) {
            const validStatuses = ['draft', 'active', 'completed', 'archived'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status value'
                });
            }
            updateFields.push(`status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        // Add updated_at
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        // Add WHERE clause parameter
        queryParams.push(id);

        const updateQuery = `
            UPDATE test_sessions 
            SET ${updateFields.join(', ')}
            WHERE id = $${queryParams.length}
            RETURNING *
        `;

        const result = await pool.query(updateQuery, queryParams);

        res.json({
            success: true,
            message: 'Testing session updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating testing session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update testing session',
            error: error.message
        });
    }
});

/**
 * DELETE /api/sessions/:id
 * Archive session (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent = false } = req.query;

        // Check if session exists
        const existingSession = await pool.query('SELECT * FROM test_sessions WHERE id = $1', [id]);
        if (existingSession.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Testing session not found'
            });
        }

        if (permanent === 'true') {
            // Permanent deletion (use with caution)
            await pool.query('DELETE FROM test_sessions WHERE id = $1', [id]);
            
            res.json({
                success: true,
                message: 'Testing session permanently deleted'
            });
        } else {
            // Soft delete - archive the session
            await pool.query(`
                UPDATE test_sessions 
                SET status = 'archived', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [id]);

            res.json({
                success: true,
                message: 'Testing session archived successfully'
            });
        }

    } catch (error) {
        console.error('Error deleting testing session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete testing session',
            error: error.message
        });
    }
});

/**
 * POST /api/sessions/:id/duplicate
 * Duplicate an existing session
 */
router.post('/:id/duplicate', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, copy_test_results = false } = req.body;

        // Get original session
        const originalSession = await pool.query('SELECT * FROM test_sessions WHERE id = $1', [id]);
        if (originalSession.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Original testing session not found'
            });
        }

        const original = originalSession.rows[0];
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Create duplicate session
            const duplicateResult = await client.query(`
                INSERT INTO test_sessions (
                    project_id, name, description, conformance_level,
                    status, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                original.project_id,
                name || `${original.name} (Copy)`,
                original.description,
                original.conformance_level,
                'planning',
                req.user?.id
            ]);

            const duplicateSession = duplicateResult.rows[0];

            // Copy test instances
            if (copy_test_results) {
                await client.query(`
                    INSERT INTO test_instances (
                        session_id, requirement_id, page_id, status,
                        notes, evidence, test_method_used, assigned_tester,
                        confidence_level
                    )
                    SELECT 
                        $1, requirement_id, page_id, 
                        CASE WHEN $2 THEN status ELSE 'pending' END,
                        notes, evidence, test_method_used, assigned_tester,
                        confidence_level
                    FROM test_instances
                    WHERE session_id = $3
                `, [duplicateSession.id, copy_test_results, id]);
            } else {
                // Generate fresh test instances
                await generateTestInstances(
                    client, 
                    duplicateSession.id, 
                    original.conformance_level, 
                    'all', 
                    []
                );
            }

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Testing session duplicated successfully',
                data: duplicateSession
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error duplicating testing session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to duplicate testing session',
            error: error.message
        });
    }
});

/**
 * GET /api/sessions/:sessionId/tests
 * Get test instances for a specific session with filtering and pagination
 */
router.get('/:sessionId/tests', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            page = 1,
            limit = 25,
            status,
            requirement_type,
            level,
            assigned_tester,
            search,
            sort_by = 'updated_at',
            sort_order = 'DESC'
        } = req.query;

        // Verify session exists
        const sessionCheck = await pool.query('SELECT id FROM test_sessions WHERE id = $1', [sessionId]);
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Testing session not found'
            });
        }

        // Build WHERE conditions
        let whereConditions = ['ti.session_id = $1'];
        let queryParams = [sessionId];
        let paramIndex = 2;

        if (status) {
            whereConditions.push(`ti.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (requirement_type) {
            whereConditions.push(`tr.requirement_type = $${paramIndex}`);
            queryParams.push(requirement_type);
            paramIndex++;
        }

        if (level) {
            whereConditions.push(`tr.level = $${paramIndex}`);
            queryParams.push(level);
            paramIndex++;
        }

        if (assigned_tester) {
            whereConditions.push(`ti.assigned_tester = $${paramIndex}`);
            queryParams.push(assigned_tester);
            paramIndex++;
        }

        if (search) {
            whereConditions.push(`(tr.title ILIKE $${paramIndex} OR tr.description ILIKE $${paramIndex})`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Calculate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Validate sort parameters
        const allowedSortFields = ['updated_at', 'created_at', 'status', 'criterion_number'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'updated_at';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get test instances
        const testsQuery = `
            SELECT 
                ti.id,
                ti.status,
                ti.assigned_tester,
                ti.confidence_level,
                ti.test_method_used,
                ti.notes,
                ti.evidence,
                ti.remediation_notes,
                ti.created_at,
                ti.updated_at,
                tr.criterion_number,
                tr.title as requirement_title,
                tr.description as requirement_description,
                tr.requirement_type,
                tr.level as requirement_level,
                tr.test_method as default_test_method,
                dp.url as page_url,
                dp.title as page_title,
                au.username as tester_username,
                au.full_name as tester_full_name
            FROM test_instances ti
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN users au ON ti.assigned_tester = au.id
            WHERE ${whereClause}
            ORDER BY tr.${sortField} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limitNum, offset);
        const testsResult = await pool.query(testsQuery, queryParams);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM test_instances ti
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            WHERE ${whereClause}
        `;

        const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / limitNum);

        res.json({
            success: true,
            data: testsResult.rows,
            pagination: {
                current_page: pageNum,
                total_pages: totalPages,
                total_count: totalCount,
                limit: limitNum,
                has_next: pageNum < totalPages,
                has_prev: pageNum > 1
            }
        });

    } catch (error) {
        console.error('Error fetching session test instances:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test instances',
            error: error.message
        });
    }
});

/**
 * GET /api/sessions/:sessionId/progress
 * Get progress metrics and analytics for a specific session
 */
router.get('/:sessionId/progress', async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Verify session exists
        const sessionCheck = await pool.query('SELECT id, name FROM test_sessions WHERE id = $1', [sessionId]);
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Testing session not found'
            });
        }

        // Get comprehensive progress metrics
        const progressQuery = `
            WITH session_stats AS (
                SELECT 
                    COUNT(*) as total_tests,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_tests,
                    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tests,
                    COUNT(*) FILTER (WHERE status = 'passed') as passed_tests,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed_tests,
                    COUNT(*) FILTER (WHERE status = 'untestable') as untestable_tests,
                    COUNT(*) FILTER (WHERE status = 'not_applicable') as not_applicable_tests,
                    COUNT(*) FILTER (WHERE status = 'needs_review') as needs_review_tests,
                    COUNT(*) FILTER (WHERE status IN ('passed', 'failed', 'untestable', 'not_applicable')) as completed_tests,
                    COUNT(DISTINCT assigned_tester) FILTER (WHERE assigned_tester IS NOT NULL) as unique_testers,
                    COUNT(DISTINCT page_id) FILTER (WHERE page_id IS NOT NULL) as pages_tested
                FROM test_instances 
                WHERE session_id = $1
            ),
            requirement_level_stats AS (
                SELECT 
                    tr.level,
                    tr.requirement_type,
                    COUNT(*) as total_requirements,
                    COUNT(*) FILTER (WHERE ti.status = 'passed') as passed_requirements,
                    COUNT(*) FILTER (WHERE ti.status = 'failed') as failed_requirements
                FROM test_instances ti
                JOIN test_requirements tr ON ti.requirement_id = tr.id
                WHERE ti.session_id = $1
                GROUP BY tr.level, tr.requirement_type
            ),
            tester_stats AS (
                SELECT 
                    au.id as tester_id,
                    au.username,
                    au.full_name,
                    COUNT(*) as assigned_tests,
                    COUNT(*) FILTER (WHERE ti.status IN ('passed', 'failed', 'untestable', 'not_applicable')) as completed_tests,
                    COUNT(*) FILTER (WHERE ti.status = 'passed') as passed_tests,
                    COUNT(*) FILTER (WHERE ti.status = 'failed') as failed_tests
                FROM test_instances ti
                LEFT JOIN users au ON ti.assigned_tester = au.id
                WHERE ti.session_id = $1 AND ti.assigned_tester IS NOT NULL
                GROUP BY au.id, au.username, au.full_name
            )
            SELECT 
                (SELECT row_to_json(session_stats.*) FROM session_stats) as overall_progress,
                (
                    SELECT json_agg(
                        json_build_object(
                            'level', level,
                            'requirement_type', requirement_type,
                            'total_requirements', total_requirements,
                            'completed_requirements', completed_requirements,
                            'passed_requirements', passed_requirements,
                            'failed_requirements', failed_requirements,
                            'completion_percentage', ROUND((completed_requirements * 100.0) / NULLIF(total_requirements, 0), 1)
                        )
                    )
                    FROM requirement_level_stats
                ) as requirement_breakdown,
                (
                    SELECT json_agg(
                        json_build_object(
                            'tester_id', tester_id,
                            'username', username,
                            'full_name', full_name,
                            'assigned_tests', assigned_tests,
                            'completed_tests', completed_tests,
                            'passed_tests', passed_tests,
                            'failed_tests', failed_tests,
                            'completion_percentage', ROUND((completed_tests * 100.0) / NULLIF(assigned_tests, 0), 1)
                        )
                    )
                    FROM tester_stats
                ) as tester_breakdown
        `;

        const progressResult = await pool.query(progressQuery, [sessionId]);
        const progressData = progressResult.rows[0];

        // Calculate additional metrics
        const overallProgress = progressData.overall_progress || {};
        const completionPercentage = overallProgress.total_tests > 0 
            ? Math.round((overallProgress.completed_tests / overallProgress.total_tests) * 100) 
            : 0;

        // Get trend data (last 7 days of activity)
        const trendQuery = `
            SELECT 
                DATE(updated_at) as date,
                COUNT(*) FILTER (WHERE status IN ('passed', 'failed', 'untestable', 'not_applicable')) as tests_completed
            FROM test_instances 
            WHERE session_id = $1 
            AND updated_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(updated_at)
            ORDER BY date
        `;

        const trendResult = await pool.query(trendQuery, [sessionId]);

        res.json({
            success: true,
            session_id: sessionId,
            session_name: sessionCheck.rows[0].name,
            data: {
                overall_progress: {
                    ...overallProgress,
                    completion_percentage: completionPercentage
                },
                requirement_breakdown: progressData.requirement_breakdown || [],
                tester_breakdown: progressData.tester_breakdown || [],
                daily_progress: trendResult.rows,
                last_updated: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error fetching session progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch session progress',
            error: error.message
        });
    }
});

/**
 * GET /api/sessions/:id/tests
 * Get test instances for a specific session with pagination
 */
router.get('/:id/tests', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            page = 1, 
            limit = 20, 
            status, 
            assigned_tester, 
            requirement_type,
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        // Build WHERE conditions
        let whereConditions = ['ti.session_id = $1'];
        let queryParams = [id];
        let paramIndex = 2;

        if (status) {
            whereConditions.push(`ti.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (assigned_tester) {
            whereConditions.push(`ti.assigned_tester = $${paramIndex}`);
            queryParams.push(assigned_tester);
            paramIndex++;
        }

        if (requirement_type) {
            whereConditions.push(`tr.requirement_type = $${paramIndex}`);
            queryParams.push(requirement_type);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');
        
        // Calculate offset
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Main query
        const query = `
            SELECT 
                ti.id,
                ti.session_id,
                ti.requirement_id,
                ti.page_id,
                ti.status,
                ti.test_method_used,
                ti.result,
                ti.notes,
                ti.evidence,
                ti.assigned_tester,
                ti.created_at,
                ti.updated_at,
                tr.requirement_text,
                tr.requirement_type,
                tr.level,
                tr.success_criteria,
                dp.title as page_title,
                dp.url as page_url,
                u.username as assigned_tester_name
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN users u ON ti.assigned_tester = u.id
            WHERE ${whereClause}
            ORDER BY ti.${sort_by} ${sort_order}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ${whereClause}
        `;

        const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / parseInt(limit));

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_count: totalCount,
                limit: parseInt(limit),
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching session tests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch session tests',
            error: error.message
        });
    }
});

/**
 * GET /api/sessions/:id/progress
 * Get detailed progress information for a session
 */
router.get('/:id/progress', async (req, res) => {
    try {
        const { id } = req.params;

        // Get session basic info
        const sessionQuery = `
            SELECT 
                id,
                name,
                status,
                conformance_level,
                total_tests_count,
                completed_tests_count,
                passed_tests_count,
                failed_tests_count,
                completion_percentage,
                created_at,
                updated_at
            FROM test_sessions 
            WHERE id = $1
        `;

        const sessionResult = await pool.query(sessionQuery, [id]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        const session = sessionResult.rows[0];

        // Get detailed progress statistics
        const progressQuery = `
            SELECT 
                COUNT(*) as total_tests,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_tests,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tests,
                COUNT(*) FILTER (WHERE status = 'passed') as passed_tests,
                COUNT(*) FILTER (WHERE status = 'failed') as failed_tests,
                COUNT(*) FILTER (WHERE status = 'untestable') as untestable_tests,
                COUNT(*) FILTER (WHERE status = 'not_applicable') as not_applicable_tests,
                COUNT(*) FILTER (WHERE status = 'needs_review') as needs_review_tests,
                COUNT(*) FILTER (WHERE test_method_used = 'automated') as automated_tests,
                COUNT(*) FILTER (WHERE test_method_used = 'manual') as manual_tests,
                COUNT(DISTINCT assigned_tester) as unique_testers,
                COUNT(DISTINCT page_id) as pages_tested,
                COUNT(DISTINCT requirement_id) as requirements_tested
            FROM test_instances 
            WHERE session_id = $1
        `;

        const progressResult = await pool.query(progressQuery, [id]);
        const progress = progressResult.rows[0];

        // Get requirement breakdown
        const requirementBreakdown = await pool.query(`
            SELECT 
                tr.requirement_type,
                tr.level,
                COUNT(*) as total_tests,
                COUNT(*) FILTER (WHERE ti.status = 'passed') as passed_tests,
                COUNT(*) FILTER (WHERE ti.status = 'failed') as failed_tests,
                COUNT(*) FILTER (WHERE ti.status IN ('passed', 'failed', 'untestable', 'not_applicable')) as completed_tests
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ti.session_id = $1
            GROUP BY tr.requirement_type, tr.level
            ORDER BY tr.requirement_type, tr.level
        `, [id]);

        // Get tester assignments
        const testerBreakdown = await pool.query(`
            SELECT 
                u.username,
                u.id as user_id,
                COUNT(*) as assigned_tests,
                COUNT(*) FILTER (WHERE ti.status = 'passed') as passed_tests,
                COUNT(*) FILTER (WHERE ti.status = 'failed') as failed_tests,
                COUNT(*) FILTER (WHERE ti.status IN ('passed', 'failed', 'untestable', 'not_applicable')) as completed_tests
            FROM test_instances ti
            LEFT JOIN users u ON ti.assigned_tester = u.id
            WHERE ti.session_id = $1 AND ti.assigned_tester IS NOT NULL
            GROUP BY u.id, u.username
            ORDER BY assigned_tests DESC
        `, [id]);

        // Calculate completion rates
        const completionRate = progress.total_tests > 0 ? 
            ((parseInt(progress.passed_tests) + parseInt(progress.failed_tests) + 
              parseInt(progress.untestable_tests) + parseInt(progress.not_applicable_tests)) / 
             parseInt(progress.total_tests) * 100).toFixed(1) : 0;

        const passRate = progress.total_tests > 0 ? 
            (parseInt(progress.passed_tests) / parseInt(progress.total_tests) * 100).toFixed(1) : 0;

        res.json({
            success: true,
            data: {
                session: session,
                progress: {
                    ...progress,
                    completion_rate: parseFloat(completionRate),
                    pass_rate: parseFloat(passRate)
                },
                requirement_breakdown: requirementBreakdown.rows,
                tester_breakdown: testerBreakdown.rows
            }
        });

    } catch (error) {
        console.error('Error fetching session progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch session progress',
            error: error.message
        });
    }
});

/**
 * Helper function to generate test instances for a session
 */
async function generateTestInstances(client, sessionId, conformanceLevel, pageScope, selectedPages) {
    // Get applicable test requirements based on conformance level
    let requirementConditions = ['tr.is_active = true'];
    
    if (conformanceLevel === 'A') {
        requirementConditions.push("(tr.requirement_type = 'wcag' AND tr.level = 'a')");
    } else if (conformanceLevel === 'AA') {
        requirementConditions.push("(tr.requirement_type = 'wcag' AND tr.level IN ('a', 'aa'))");
    } else if (conformanceLevel === 'AAA') {
        requirementConditions.push("(tr.requirement_type = 'wcag' AND tr.level IN ('a', 'aa', 'aaa'))");
    } else if (conformanceLevel === 'Section508') {
        requirementConditions.push("tr.requirement_type = 'section508'");
    } else if (conformanceLevel === 'Custom') {
        // For Custom, include all active requirements
        requirementConditions.push("tr.is_active = true");
    }

    const requirementQuery = `
        SELECT id FROM test_requirements tr
        WHERE ${requirementConditions.join(' OR ')}
        ORDER BY tr.requirement_type, tr.criterion_number
    `;

    const requirements = await client.query(requirementQuery);

    // Get pages to test - for now, create tests without specific pages
    // Later this can be enhanced to link to actual discovered pages
    let pages = [];

    if (pages.length === 0) {
        // Create test instances without specific pages (site-wide tests)
        for (const requirement of requirements.rows) {
            await client.query(`
                INSERT INTO test_instances (
                    session_id, requirement_id, status
                ) VALUES ($1, $2, $3)
            `, [sessionId, requirement.id, 'pending']);
        }
    } else {
        // Create test instances for each requirement/page combination
        for (const requirement of requirements.rows) {
            for (const page of pages) {
                await client.query(`
                    INSERT INTO test_instances (
                        session_id, requirement_id, page_id, status
                    ) VALUES ($1, $2, $3, $4)
                `, [sessionId, requirement.id, page.id, 'pending']);
            }
        }
    }

    // Update session statistics
    await client.query(`
        UPDATE test_sessions 
        SET total_tests_count = (
            SELECT COUNT(*) FROM test_instances WHERE session_id = $1
        )
        WHERE id = $1
    `, [sessionId]);
}

module.exports = router; 
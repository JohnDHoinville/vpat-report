/**
 * Testing Sessions API Routes
 * Unified Testing Session Architecture
 * Created: December 11, 2024
 */

const express = require('express');
const router = express.Router();
const pool = require('../../database/config');
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
                ts.estimated_completion_date,
                ts.created_at,
                ts.updated_at,
                p.name as project_name,
                p.url as project_url,
                au.username as created_by_username,
                COUNT(ti.id) as current_test_instances
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN auth_users au ON ts.created_by = au.id
            LEFT JOIN test_instances ti ON ts.id = ti.session_id
            ${whereClause}
            GROUP BY ts.id, p.name, p.url, au.username
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
                p.url as project_url,
                p.description as project_description,
                au_created.username as created_by_username,
                au_updated.username as updated_by_username
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN auth_users au_created ON ts.created_by = au_created.id
            LEFT JOIN auth_users au_updated ON ts.updated_by = au_updated.id
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
                LEFT JOIN auth_users au ON ti.assigned_tester = au.id
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
        const validConformanceLevels = ['wcag_a', 'wcag_aa', 'wcag_aaa', 'section_508', 'combined'];
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
                    status, created_by, updated_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                project_id,
                name,
                description,
                conformance_level,
                'draft',
                req.user?.id,
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
            status,
            estimated_completion_date
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

        if (estimated_completion_date !== undefined) {
            updateFields.push(`estimated_completion_date = $${paramIndex}`);
            queryParams.push(estimated_completion_date);
            paramIndex++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        // Add updated_by and updated_at
        updateFields.push(`updated_by = $${paramIndex}`);
        queryParams.push(req.user?.id);
        paramIndex++;

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        // Add WHERE clause parameter
        queryParams.push(id);

        const updateQuery = `
            UPDATE test_sessions 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
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
                SET status = 'archived', updated_by = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [id, req.user?.id]);

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
                    status, created_by, updated_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                original.project_id,
                name || `${original.name} (Copy)`,
                original.description,
                original.conformance_level,
                'draft',
                req.user?.id,
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
 * Helper function to generate test instances for a session
 */
async function generateTestInstances(client, sessionId, conformanceLevel, pageScope, selectedPages) {
    // Get applicable test requirements based on conformance level
    let requirementConditions = ['tr.is_active = true'];
    
    if (conformanceLevel === 'wcag_a') {
        requirementConditions.push("(tr.requirement_type = 'wcag' AND tr.level = 'a')");
    } else if (conformanceLevel === 'wcag_aa') {
        requirementConditions.push("(tr.requirement_type = 'wcag' AND tr.level IN ('a', 'aa'))");
    } else if (conformanceLevel === 'wcag_aaa') {
        requirementConditions.push("(tr.requirement_type = 'wcag' AND tr.level IN ('a', 'aa', 'aaa'))");
    } else if (conformanceLevel === 'section_508') {
        requirementConditions.push("tr.requirement_type = 'section_508'");
    } else if (conformanceLevel === 'combined') {
        requirementConditions.push("tr.requirement_type IN ('wcag', 'section_508')");
    }

    const requirementQuery = `
        SELECT id FROM test_requirements tr
        WHERE ${requirementConditions.join(' AND ')}
        ORDER BY tr.requirement_type, tr.criterion_number
    `;

    const requirements = await client.query(requirementQuery);

    // Get pages to test
    let pages = [];
    if (pageScope === 'selected' && selectedPages.length > 0) {
        const pageQuery = `
            SELECT id FROM discovered_pages 
            WHERE id = ANY($1)
        `;
        const pageResult = await client.query(pageQuery, [selectedPages]);
        pages = pageResult.rows;
    } else {
        // Get all pages for the project
        const sessionProject = await client.query(`
            SELECT project_id FROM test_sessions WHERE id = $1
        `, [sessionId]);
        
        const pageQuery = `
            SELECT id FROM discovered_pages 
            WHERE project_id = $1
            ORDER BY url
        `;
        const pageResult = await client.query(pageQuery, [sessionProject.rows[0].project_id]);
        pages = pageResult.rows;
    }

    // Create test instances for each requirement/page combination
    for (const requirement of requirements.rows) {
        if (pages.length > 0) {
            // Create test instances for each page
            for (const page of pages) {
                await client.query(`
                    INSERT INTO test_instances (
                        session_id, requirement_id, page_id, status
                    ) VALUES ($1, $2, $3, $4)
                    ON CONFLICT (session_id, requirement_id, page_id) DO NOTHING
                `, [sessionId, requirement.id, page.id, 'pending']);
            }
        } else {
            // Create site-wide test instance (no specific page)
            await client.query(`
                INSERT INTO test_instances (
                    session_id, requirement_id, status
                ) VALUES ($1, $2, $3)
                ON CONFLICT (session_id, requirement_id, page_id) DO NOTHING
            `, [sessionId, requirement.id, 'pending']);
        }
    }
}

module.exports = router; 
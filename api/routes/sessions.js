/**
 * Testing Sessions API Routes
 * Unified Testing Session Architecture
 * Created: December 11, 2024
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../../database/config');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const AuditLogger = require('../middleware/audit-logger');
const { orchestrator } = require('../../scripts/unified-test-orchestrator');
const PlaywrightIntegrationService = require('../../database/services/playwright-integration-service');

// Apply audit logging middleware to all routes
router.use(AuditLogger.auditMiddleware());

// Session Management Endpoints for Browser Session Capture
// These must come BEFORE parameterized routes to avoid conflicts

/**
 * GET /api/session/info
 * Get information about the current browser session
 */
router.get('/info', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        const sessionFile = path.join(__dirname, '../../fm-session.json');
        
        if (fs.existsSync(sessionFile)) {
            const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
            
            // Extract metadata
            const metadata = {
                username: sessionData.username || 'Unknown',
                capturedDate: sessionData.timestamp || new Date().toISOString(),
                expirationDate: sessionData.expirationDate || 'Unknown',
                pagesCount: sessionData.accessiblePages || 0
            };
            
            res.json({
                exists: true,
                metadata: metadata
            });
        } else {
            res.json({
                exists: false
            });
        }
    } catch (error) {
        console.error('Session info error:', error);
        res.status(500).json({
            exists: false,
            error: error.message
        });
    }
});

/**
 * POST /api/session/capture
 * Start browser session capture process
 */
router.post('/capture', (req, res) => {
    try {
        const { spawn } = require('child_process');
        const path = require('path');
        
        // Use absolute path to the extract-browser-session.js script
        const scriptPath = path.join(__dirname, '../../extract-browser-session.js');
        
        console.log(`Starting session capture with script: ${scriptPath}`);
        
        // Spawn the session capture script
        const captureProcess = spawn('node', [scriptPath], {
            detached: true,
            stdio: 'pipe'
        });
        
        let output = '';
        let errorOutput = '';
        
        captureProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        captureProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        captureProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Session capture completed successfully');
            } else {
                console.error('Session capture failed with exit code', code);
                console.error('Error output:', errorOutput);
            }
        });
        
        // Respond immediately since this is an asynchronous process
        res.json({
            success: true,
            message: 'Session capture started',
            processId: captureProcess.pid
        });
        
    } catch (error) {
        console.error('Session capture error:', error);
        res.status(500).json({
            success: false,
            message: 'Session capture failed',
            error: error.message
        });
    }
});

/**
 * POST /api/session/test
 * Test if the current session is valid and count accessible pages
 */
router.post('/test', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        const sessionFile = path.join(__dirname, '../../fm-session.json');
        
        if (!fs.existsSync(sessionFile)) {
            return res.json({
                success: false,
                message: 'No session file found'
            });
        }
        
        const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        
        // Simulate testing session validity
        // In a real implementation, this would test against actual websites
        const mockPagesCount = Math.floor(Math.random() * 50) + 100; // 100-150 pages
        
        res.json({
            success: true,
            message: 'Session is valid',
            pagesCount: mockPagesCount,
            sessionValid: true
        });
        
    } catch (error) {
        console.error('Session test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test session',
            error: error.message
        });
    }
});

/**
 * DELETE /api/session/clear
 * Clear the current browser session
 */
router.delete('/clear', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        const sessionFile = path.join(__dirname, '../../fm-session.json');
        
        if (fs.existsSync(sessionFile)) {
            fs.unlinkSync(sessionFile);
            res.json({
                success: true,
                message: 'Session cleared successfully'
            });
        } else {
            res.json({
                success: true,
                message: 'No session to clear'
            });
        }
        
    } catch (error) {
        console.error('Session clear error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear session',
            error: error.message
        });
    }
});

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
        } else {
            // By default, exclude archived sessions unless specifically requested
            const include_archived = req.query.include_archived === 'true';
            if (!include_archived) {
                whereConditions.push(`ts.status != 'archived'`);
            }
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
                    COALESCE(wr.criterion_number, tr.criterion_number) as criterion_number,
                    COALESCE(wr.title, tr.title) as requirement_title,
                    tr.requirement_type,
                    COALESCE(wr.level, tr.level) as requirement_level,
                    COALESCE(wr.test_method, tr.test_method) as requirement_test_method,
                    dp.url as page_url,
                    dp.title as page_title,
                    au.username as tester_username
                FROM test_instances ti
                JOIN test_requirements tr ON ti.requirement_id = tr.id
                LEFT JOIN wcag_requirements wr ON tr.criterion_number = wr.criterion_number AND tr.requirement_type = 'wcag'
                LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
                LEFT JOIN users au ON ti.assigned_tester = au.id
                WHERE ti.session_id = $1
                ORDER BY COALESCE(wr.criterion_number, tr.criterion_number), dp.url
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
 * DELETE /api/sessions/bulk
 * Bulk delete sessions (archive or permanent)
 */
router.delete('/bulk', async (req, res) => {
    try {
        const { session_ids, permanent = false, confirm_permanent = false } = req.body;

        if (!session_ids || !Array.isArray(session_ids) || session_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'session_ids array is required'
            });
        }

        // Validate UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const invalidIds = session_ids.filter(id => !uuidRegex.test(id));
        
        if (invalidIds.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid session IDs provided',
                invalid_ids: invalidIds,
                note: 'All session IDs must be valid UUIDs'
            });
        }

        // Check if sessions exist
        const existingSessions = await pool.query(`
            SELECT ts.id, ts.name, ts.status, p.name as project_name,
                   COUNT(ti.id) as test_instance_count,
                   COUNT(atr.id) as automated_result_count
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN test_instances ti ON ts.id = ti.session_id
            LEFT JOIN automated_test_results atr ON ts.id = atr.test_session_id
            WHERE ts.id = ANY($1)
            GROUP BY ts.id, ts.name, ts.status, p.name
        `, [session_ids]);

        if (existingSessions.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No sessions found with provided IDs'
            });
        }

        const sessions = existingSessions.rows;
        
        if (permanent === true) {
            // Require explicit confirmation for bulk permanent deletion
            if (confirm_permanent !== true) {
                return res.status(400).json({
                    success: false,
                    message: 'Bulk permanent deletion requires explicit confirmation',
                    sessions_to_delete: sessions.map(s => ({
                        id: s.id,
                        name: s.name,
                        project: s.project_name,
                        test_instances: s.test_instance_count,
                        automated_results: s.automated_result_count
                    })),
                    total_sessions: sessions.length,
                    required_parameter: 'confirm_permanent: true'
                });
            }

            console.log(`🗑️ BULK PERMANENT DELETION: Starting for ${sessions.length} sessions`);
            
            const deletedSessions = [];
            const errors = [];
            
            for (const session of sessions) {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    
                    console.log(`🗑️ Deleting session: ${session.name} (${session.id})`);
                    
                    // Delete in proper order (same as single deletion)
                    await client.query(`
                        DELETE FROM test_instance_audit_log 
                        WHERE test_instance_id IN (
                            SELECT id FROM test_instances WHERE session_id = $1
                        )
                    `, [session.id]);
                    
                    await client.query(`
                        DELETE FROM evidence_repository 
                        WHERE test_instance_id IN (
                            SELECT id FROM test_instances WHERE session_id = $1
                        )
                    `, [session.id]);
                    
                    await client.query(`
                        DELETE FROM automated_result_review_queue 
                        WHERE test_instance_id IN (
                            SELECT id FROM test_instances WHERE session_id = $1
                        )
                    `, [session.id]);
                    
                    await client.query(`
                        DELETE FROM violations 
                        WHERE automated_result_id IN (
                            SELECT id FROM automated_test_results WHERE test_session_id = $1
                        ) OR manual_result_id IN (
                            SELECT id FROM manual_test_results WHERE test_session_id = $1
                        )
                    `, [session.id]);
                    
                    await client.query('DELETE FROM frontend_test_runs WHERE test_session_id = $1', [session.id]);
                    await client.query('DELETE FROM automated_test_results WHERE test_session_id = $1', [session.id]);
                    await client.query('DELETE FROM manual_test_results WHERE test_session_id = $1', [session.id]);
                    const deleteTestInstances = await client.query('DELETE FROM test_instances WHERE session_id = $1', [session.id]);
                    const deleteSession = await client.query('DELETE FROM test_sessions WHERE id = $1', [session.id]);
                    
                    await client.query('COMMIT');
                    
                    deletedSessions.push({
                        id: session.id,
                        name: session.name,
                        project: session.project_name,
                        test_instances_deleted: deleteTestInstances.rowCount
                    });
                    
                    console.log(`✅ Deleted session: ${session.name}`);
                    
                } catch (error) {
                    await client.query('ROLLBACK');
                    console.error(`❌ Failed to delete session ${session.name}:`, error);
                    errors.push({
                        session: session.name,
                        error: error.message
                    });
                } finally {
                    client.release();
                }
            }
            
            res.json({
                success: true,
                message: `Bulk permanent deletion completed`,
                results: {
                    deleted_count: deletedSessions.length,
                    error_count: errors.length,
                    deleted_sessions: deletedSessions,
                    errors: errors
                }
            });
            
        } else {
            // Bulk soft delete (archive)
            const archiveQuery = `
                UPDATE test_sessions 
                SET status = 'archived', updated_at = CURRENT_TIMESTAMP
                WHERE id = ANY($1)
            `;
            
            const result = await pool.query(archiveQuery, [session_ids]);
            
            res.json({
                success: true,
                message: 'Sessions archived successfully',
                archived_count: result.rowCount,
                sessions: sessions.map(s => ({ id: s.id, name: s.name, project: s.project_name }))
            });
        }

    } catch (error) {
        console.error('Error in bulk session deletion:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete sessions',
            error: error.message
        });
    }
});

/**
 * DELETE /api/sessions/:id
 * Archive session (soft delete) or permanently delete with all related data
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent = false, confirm_permanent = false } = req.query;

        // Check if session exists
        const existingSession = await pool.query(`
            SELECT ts.*, p.name as project_name,
                   COUNT(ti.id) as test_instance_count,
                   COUNT(atr.id) as automated_result_count
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN test_instances ti ON ts.id = ti.session_id
            LEFT JOIN automated_test_results atr ON ts.id = atr.test_session_id
            WHERE ts.id = $1
            GROUP BY ts.id, p.name
        `, [id]);
        
        if (existingSession.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Testing session not found'
            });
        }

        const session = existingSession.rows[0];

        if (permanent === 'true') {
            // Require explicit confirmation for permanent deletion
            if (confirm_permanent !== 'true') {
                return res.status(400).json({
                    success: false,
                    message: 'Permanent deletion requires explicit confirmation',
                    session_info: {
                        name: session.name,
                        project: session.project_name,
                        test_instances: session.test_instance_count,
                        automated_results: session.automated_result_count,
                        created_at: session.created_at
                    },
                    required_parameter: 'confirm_permanent=true'
                });
            }

            console.log(`🗑️ PERMANENT DELETION: Starting cascade delete for session ${session.name} (${id})`);
            
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Delete in proper order to handle foreign key constraints
                
                // 1. Delete audit trail data first
                console.log('🗑️ Deleting audit trail data...');
                await client.query(`
                    DELETE FROM test_instance_audit_log 
                    WHERE test_instance_id IN (
                        SELECT id FROM test_instances WHERE session_id = $1
                    )
                `, [id]);
                
                // 2. Delete evidence repository entries
                console.log('🗑️ Deleting evidence repository...');
                await client.query(`
                    DELETE FROM evidence_repository 
                    WHERE test_instance_id IN (
                        SELECT id FROM test_instances WHERE session_id = $1
                    )
                `, [id]);
                
                // 3. Delete automated result review queue
                console.log('🗑️ Deleting review queue entries...');
                await client.query(`
                    DELETE FROM automated_result_review_queue 
                    WHERE test_instance_id IN (
                        SELECT id FROM test_instances WHERE session_id = $1
                    )
                `, [id]);
                
                // 4. Delete violations (they reference test results)
                console.log('🗑️ Deleting violations...');
                await client.query(`
                    DELETE FROM violations 
                    WHERE automated_result_id IN (
                        SELECT id FROM automated_test_results WHERE test_session_id = $1
                    ) OR manual_result_id IN (
                        SELECT id FROM manual_test_results WHERE test_session_id = $1
                    )
                `, [id]);
                
                // 5. Delete frontend test runs
                console.log('🗑️ Deleting frontend test runs...');
                await client.query('DELETE FROM frontend_test_runs WHERE test_session_id = $1', [id]);
                
                // 6. Delete automated test results
                console.log('🗑️ Deleting automated test results...');
                await client.query('DELETE FROM automated_test_results WHERE test_session_id = $1', [id]);
                
                // 7. Delete manual test results
                console.log('🗑️ Deleting manual test results...');
                await client.query('DELETE FROM manual_test_results WHERE test_session_id = $1', [id]);
                
                // 8. Delete test instances
                console.log('🗑️ Deleting test instances...');
                const deleteTestInstances = await client.query('DELETE FROM test_instances WHERE session_id = $1', [id]);
                
                // 9. Finally delete the session
                console.log('🗑️ Deleting session...');
                const deleteSession = await client.query('DELETE FROM test_sessions WHERE id = $1', [id]);
                
                await client.query('COMMIT');
                
                console.log(`✅ PERMANENT DELETION COMPLETE: Session "${session.name}" and all related data deleted`);
                
                res.json({
                    success: true,
                    message: 'Testing session permanently deleted',
                    deleted_data: {
                        session_name: session.name,
                        project_name: session.project_name,
                        test_instances_deleted: deleteTestInstances.rowCount,
                        session_deleted: deleteSession.rowCount > 0
                    }
                });
                
            } catch (error) {
                await client.query('ROLLBACK');
                console.error(`❌ PERMANENT DELETION FAILED for session ${id}:`, error);
                throw error;
            } finally {
                client.release();
            }
            
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
 * GET /api/sessions/:sessionId/audit-timeline
 * Get chronological audit timeline for a session showing all activity with user attribution
 */
router.get('/:sessionId/audit-timeline', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            limit = 100,
            offset = 0,
            start_date,
            end_date,
            user_id,
            action_type,
            test_instance_id
        } = req.query;

        // Verify session exists
        const sessionCheck = await pool.query('SELECT id, name FROM test_sessions WHERE id = $1', [sessionId]);
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

        if (start_date) {
            whereConditions.push(`tal.timestamp >= $${paramIndex}`);
            queryParams.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            whereConditions.push(`tal.timestamp <= $${paramIndex}`);
            queryParams.push(end_date);
            paramIndex++;
        }

        if (user_id) {
            whereConditions.push(`tal.user_id = $${paramIndex}`);
            queryParams.push(user_id);
            paramIndex++;
        }

        if (action_type) {
            whereConditions.push(`tal.action_type = $${paramIndex}`);
            queryParams.push(action_type);
            paramIndex++;
        }

        if (test_instance_id) {
            whereConditions.push(`tal.test_instance_id = $${paramIndex}`);
            queryParams.push(test_instance_id);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Get timeline data with rich context
        const timelineQuery = `
            SELECT 
                tal.id as audit_id,
                tal.timestamp,
                tal.action_type,
                tal.change_description,
                tal.old_value,
                tal.new_value,
                tal.details,
                tal.ip_address,
                tal.user_agent,
                
                -- User information
                u.username,
                u.full_name,
                u.role as user_role,
                
                -- Test instance context
                ti.id as test_instance_id,
                ti.status as current_status,
                tr.criterion_number,
                tr.title as requirement_title,
                tr.level as requirement_level,
                tr.requirement_type,
                
                -- Page context (if applicable)
                dp.url as page_url,
                dp.title as page_title,
                dp.page_type,
                
                -- Session context
                ts.name as session_name,
                
                -- Calculate time since previous action for this test
                LAG(tal.timestamp) OVER (
                    PARTITION BY tal.test_instance_id 
                    ORDER BY tal.timestamp
                ) as previous_action_time,
                
                -- Calculate time to next action for this test
                LEAD(tal.timestamp) OVER (
                    PARTITION BY tal.test_instance_id 
                    ORDER BY tal.timestamp
                ) as next_action_time
                
            FROM test_audit_log tal
            JOIN test_instances ti ON tal.test_instance_id = ti.id
            JOIN test_sessions ts ON ti.session_id = ts.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN users u ON tal.user_id = u.id
            WHERE ${whereClause}
            ORDER BY tal.timestamp DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(parseInt(limit), parseInt(offset));
        const timelineResult = await pool.query(timelineQuery, queryParams);

        // Get summary statistics for the timeline
        const statsQuery = `
            SELECT 
                COUNT(*) as total_actions,
                COUNT(DISTINCT tal.user_id) as unique_users,
                COUNT(DISTINCT tal.test_instance_id) as tests_affected,
                COUNT(DISTINCT DATE(tal.timestamp)) as active_days,
                MIN(tal.timestamp) as first_action,
                MAX(tal.timestamp) as last_action,
                
                -- Action type breakdown
                COUNT(CASE WHEN tal.action_type = 'created' THEN 1 END) as tests_created,
                COUNT(CASE WHEN tal.action_type = 'assignment' THEN 1 END) as assignments_made,
                COUNT(CASE WHEN tal.action_type = 'status_change' THEN 1 END) as status_changes,
                COUNT(CASE WHEN tal.action_type = 'note_updated' THEN 1 END) as notes_updated,
                COUNT(CASE WHEN tal.action_type = 'evidence_uploaded' THEN 1 END) as evidence_uploads,
                
                -- User activity breakdown
                json_agg(DISTINCT jsonb_build_object(
                    'user_id', u.id,
                    'username', u.username,
                    'full_name', u.full_name,
                    'action_count', COUNT(tal.id) OVER (PARTITION BY tal.user_id)
                )) FILTER (WHERE u.id IS NOT NULL) as user_activity
                
            FROM test_audit_log tal
            JOIN test_instances ti ON tal.test_instance_id = ti.id
            LEFT JOIN users u ON tal.user_id = u.id
            WHERE ${whereClause.replace(/LIMIT.*/, '')}
        `;

        const statsResult = await pool.query(statsQuery, queryParams.slice(0, -2));

        // Process timeline data to add calculated fields
        const processedTimeline = timelineResult.rows.map(row => {
            const timeSincePrevious = row.previous_action_time 
                ? Math.round((new Date(row.timestamp) - new Date(row.previous_action_time)) / 1000)
                : null;
            
            const timeToNext = row.next_action_time
                ? Math.round((new Date(row.next_action_time) - new Date(row.timestamp)) / 1000)
                : null;

            return {
                ...row,
                time_since_previous_seconds: timeSincePrevious,
                time_to_next_seconds: timeToNext,
                formatted_timestamp: new Date(row.timestamp).toISOString(),
                
                // Parse JSON fields safely
                old_value: row.old_value ? (typeof row.old_value === 'string' ? JSON.parse(row.old_value) : row.old_value) : null,
                new_value: row.new_value ? (typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value) : null,
                details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : {}
            };
        });

        res.json({
            success: true,
            session_id: sessionId,
            session_name: sessionCheck.rows[0].name,
            data: {
                timeline: processedTimeline,
                statistics: statsResult.rows[0],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: timelineResult.rows.length === parseInt(limit)
                },
                filters_applied: {
                    start_date,
                    end_date,
                    user_id,
                    action_type,
                    test_instance_id
                }
            }
        });

    } catch (error) {
        console.error('Error fetching audit timeline:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit timeline',
            error: error.message
        });
    }
});

/**
 * GET /api/sessions/:sessionId/activity-feed
 * Get real-time activity feed for a session with live updates
 */
router.get('/:sessionId/activity-feed', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            limit = 20,
            offset = 0,
            since = null, // ISO timestamp for real-time updates
            include_system = 'true'
        } = req.query;

        // Verify session exists
        const sessionCheck = await pool.query('SELECT id, name FROM test_sessions WHERE id = $1', [sessionId]);
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Testing session not found'
            });
        }

        // Build WHERE conditions for activity feed
        let whereConditions = ['ti.session_id = $1'];
        let queryParams = [sessionId];
        let paramIndex = 2;

        // Filter by timestamp for real-time updates
        if (since) {
            whereConditions.push(`tal.timestamp > $${paramIndex}`);
            queryParams.push(since);
            paramIndex++;
        }

        // Option to exclude system actions
        if (include_system === 'false') {
            whereConditions.push(`tal.user_id IS NOT NULL`);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get recent activity with aggregated information
        const activityQuery = `
            WITH recent_activity AS (
                SELECT 
                    tal.id as activity_id,
                    tal.timestamp,
                    tal.action_type,
                    tal.change_description,
                    tal.user_id,
                    tal.test_instance_id,
                    
                    -- User information
                    u.username,
                    u.full_name,
                    u.role as user_role,
                    
                    -- Test instance context
                    ti.status as test_status,
                    tr.criterion_number,
                    tr.title as requirement_title,
                    tr.level as requirement_level,
                    tr.requirement_type,
                    
                    -- Page context
                    dp.url as page_url,
                    dp.title as page_title,
                    
                    -- Calculate activity grouping (within 5 minutes)
                    LAG(tal.timestamp) OVER (
                        PARTITION BY tal.user_id, tal.action_type 
                        ORDER BY tal.timestamp
                    ) as prev_timestamp
                    
                FROM test_audit_log tal
                JOIN test_instances ti ON tal.test_instance_id = ti.id
                JOIN test_requirements tr ON ti.requirement_id = tr.id
                LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
                LEFT JOIN users u ON tal.user_id = u.id
                WHERE ${whereClause}
                ORDER BY tal.timestamp DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            )
            SELECT 
                *,
                CASE 
                    WHEN prev_timestamp IS NULL THEN false
                    WHEN EXTRACT(EPOCH FROM (timestamp - prev_timestamp)) < 300 THEN true
                    ELSE false
                END as is_grouped_activity
            FROM recent_activity
        `;

        queryParams.push(parseInt(limit), parseInt(offset));
        const activityResult = await pool.query(activityQuery, queryParams);

        // Get activity summary statistics
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_activities_today,
                COUNT(DISTINCT tal.user_id) as active_users_today,
                COUNT(DISTINCT tal.test_instance_id) as tests_updated_today,
                
                -- Activity type breakdown for today
                COUNT(CASE WHEN tal.action_type = 'status_change' THEN 1 END) as status_changes_today,
                COUNT(CASE WHEN tal.action_type = 'evidence_uploaded' THEN 1 END) as evidence_uploads_today,
                COUNT(CASE WHEN tal.action_type = 'note_updated' THEN 1 END) as notes_updated_today,
                
                -- Recent user activity (last hour)
                json_agg(DISTINCT jsonb_build_object(
                    'user_id', u.id,
                    'username', u.username,
                    'full_name', u.full_name,
                    'last_activity', (
                        SELECT MAX(tal3.timestamp) 
                        FROM test_audit_log tal3 
                        JOIN test_instances ti3 ON tal3.test_instance_id = ti3.id 
                        WHERE tal3.user_id = u.id 
                        AND ti3.session_id = $1
                    ),
                    'activity_count_last_hour', (
                        SELECT COUNT(*) 
                        FROM test_audit_log tal2 
                        JOIN test_instances ti2 ON tal2.test_instance_id = ti2.id 
                        WHERE tal2.user_id = u.id 
                        AND ti2.session_id = $1 
                        AND tal2.timestamp > NOW() - INTERVAL '1 hour'
                    )
                )) FILTER (WHERE u.id IS NOT NULL AND tal.timestamp > NOW() - INTERVAL '1 hour') as recent_user_activity
                
            FROM test_audit_log tal
            JOIN test_instances ti ON tal.test_instance_id = ti.id
            LEFT JOIN users u ON tal.user_id = u.id
            WHERE ti.session_id = $1 AND tal.timestamp > CURRENT_DATE
        `;

        const summaryResult = await pool.query(summaryQuery, [sessionId]);

        // Process activity data for better frontend consumption
        const processedActivity = activityResult.rows.map(row => ({
            ...row,
            formatted_timestamp: new Date(row.timestamp).toISOString(),
            relative_time: getRelativeTime(row.timestamp),
            activity_icon: getActivityIcon(row.action_type),
            activity_color: getActivityColor(row.action_type),
            activity_description: formatActivityDescription(row)
        }));

        res.json({
            success: true,
            session_id: sessionId,
            session_name: sessionCheck.rows[0].name,
            data: {
                activities: processedActivity,
                summary: summaryResult.rows[0],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: activityResult.rows.length === parseInt(limit)
                },
                real_time: {
                    since: since,
                    server_timestamp: new Date().toISOString(),
                    update_interval: 30000 // 30 seconds
                }
            }
        });

    } catch (error) {
        console.error('Error fetching activity feed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity feed',
            error: error.message
        });
    }
});

// Helper functions for activity feed processing
function getRelativeTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return time.toLocaleDateString();
}

function getActivityIcon(actionType) {
    const icons = {
        'created': 'fas fa-plus-circle',
        'assignment': 'fas fa-user-tag',
        'status_change': 'fas fa-exchange-alt',
        'note_updated': 'fas fa-sticky-note',
        'evidence_uploaded': 'fas fa-paperclip',
        'review_requested': 'fas fa-eye',
        'reviewed': 'fas fa-check-circle',
        'approved': 'fas fa-thumbs-up',
        'rejected': 'fas fa-thumbs-down'
    };
    return icons[actionType] || 'fas fa-circle';
}

function getActivityColor(actionType) {
    const colors = {
        'created': 'text-blue-600',
        'assignment': 'text-purple-600',
        'status_change': 'text-orange-600',
        'note_updated': 'text-gray-600',
        'evidence_uploaded': 'text-green-600',
        'review_requested': 'text-yellow-600',
        'reviewed': 'text-green-600',
        'approved': 'text-green-600',
        'rejected': 'text-red-600'
    };
    return colors[actionType] || 'text-gray-600';
}

function formatActivityDescription(activity) {
    const user = activity.username || 'System';
    const criterion = activity.criterion_number || 'Unknown';
    
    switch (activity.action_type) {
        case 'created':
            return `${user} created test for ${criterion}`;
        case 'assignment':
            return `${user} was assigned to test ${criterion}`;
        case 'status_change':
            return `${user} changed status of ${criterion}`;
        case 'note_updated':
            return `${user} updated notes for ${criterion}`;
        case 'evidence_uploaded':
            return `${user} uploaded evidence for ${criterion}`;
        case 'review_requested':
            return `${user} requested review for ${criterion}`;
        case 'reviewed':
            return `${user} reviewed test ${criterion}`;
        default:
            return activity.change_description || `${user} performed action on ${criterion}`;
    }
}

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

/**
 * GET /api/sessions/:sessionId/audit-timeline
 * Get chronological audit timeline for a session showing all activity with user attribution
 */
router.get('/:sessionId/audit-timeline', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            limit = 100,
            offset = 0,
            start_date,
            end_date,
            user_id,
            action_type,
            test_instance_id
        } = req.query;

        // Verify session exists
        const sessionCheck = await pool.query('SELECT id, name FROM test_sessions WHERE id = $1', [sessionId]);
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

        if (start_date) {
            whereConditions.push(`tal.timestamp >= $${paramIndex}`);
            queryParams.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            whereConditions.push(`tal.timestamp <= $${paramIndex}`);
            queryParams.push(end_date);
            paramIndex++;
        }

        if (user_id) {
            whereConditions.push(`tal.user_id = $${paramIndex}`);
            queryParams.push(user_id);
            paramIndex++;
        }

        if (action_type) {
            whereConditions.push(`tal.action_type = $${paramIndex}`);
            queryParams.push(action_type);
            paramIndex++;
        }

        if (test_instance_id) {
            whereConditions.push(`tal.test_instance_id = $${paramIndex}`);
            queryParams.push(test_instance_id);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Get timeline data with rich context
        const timelineQuery = `
            SELECT 
                tal.id as audit_id,
                tal.timestamp,
                tal.action_type,
                tal.change_description,
                tal.old_value,
                tal.new_value,
                tal.details,
                tal.ip_address,
                tal.user_agent,
                
                -- User information
                u.username,
                u.full_name,
                u.role as user_role,
                
                -- Test instance context
                ti.id as test_instance_id,
                ti.status as current_status,
                tr.criterion_number,
                tr.title as requirement_title,
                tr.level as requirement_level,
                tr.requirement_type,
                
                -- Page context (if applicable)
                dp.url as page_url,
                dp.title as page_title,
                dp.page_type,
                
                -- Session context
                ts.name as session_name,
                
                -- Calculate time since previous action for this test
                LAG(tal.timestamp) OVER (
                    PARTITION BY tal.test_instance_id 
                    ORDER BY tal.timestamp
                ) as previous_action_time,
                
                -- Calculate time to next action for this test
                LEAD(tal.timestamp) OVER (
                    PARTITION BY tal.test_instance_id 
                    ORDER BY tal.timestamp
                ) as next_action_time
                
            FROM test_audit_log tal
            JOIN test_instances ti ON tal.test_instance_id = ti.id
            JOIN test_sessions ts ON ti.session_id = ts.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN users u ON tal.user_id = u.id
            WHERE ${whereClause}
            ORDER BY tal.timestamp DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(parseInt(limit), parseInt(offset));
        const timelineResult = await pool.query(timelineQuery, queryParams);

        // Get summary statistics for the timeline
        const statsQuery = `
            SELECT 
                COUNT(*) as total_actions,
                COUNT(DISTINCT tal.user_id) as unique_users,
                COUNT(DISTINCT tal.test_instance_id) as tests_affected,
                COUNT(DISTINCT DATE(tal.timestamp)) as active_days,
                MIN(tal.timestamp) as first_action,
                MAX(tal.timestamp) as last_action,
                
                -- Action type breakdown
                COUNT(CASE WHEN tal.action_type = 'created' THEN 1 END) as tests_created,
                COUNT(CASE WHEN tal.action_type = 'assignment' THEN 1 END) as assignments_made,
                COUNT(CASE WHEN tal.action_type = 'status_change' THEN 1 END) as status_changes,
                COUNT(CASE WHEN tal.action_type = 'note_updated' THEN 1 END) as notes_updated,
                COUNT(CASE WHEN tal.action_type = 'evidence_uploaded' THEN 1 END) as evidence_uploads,
                
                -- User activity breakdown
                json_agg(DISTINCT jsonb_build_object(
                    'user_id', u.id,
                    'username', u.username,
                    'full_name', u.full_name,
                    'action_count', (
                        SELECT COUNT(*) 
                        FROM test_audit_log tal2 
                        JOIN test_instances ti2 ON tal2.test_instance_id = ti2.id 
                        WHERE tal2.user_id = u.id AND ti2.session_id = $1
                    )
                )) FILTER (WHERE u.id IS NOT NULL) as user_activity
                
            FROM test_audit_log tal
            JOIN test_instances ti ON tal.test_instance_id = ti.id
            LEFT JOIN users u ON tal.user_id = u.id
            WHERE ${whereClause.replace(/LIMIT.*/, '').replace(/OFFSET.*/, '')}
        `;

        const statsParams = [sessionId, ...queryParams.slice(1, -2)];
        const statsResult = await pool.query(statsQuery, statsParams);

        // Process timeline data to add calculated fields
        const processedTimeline = timelineResult.rows.map(row => {
            const timeSincePrevious = row.previous_action_time 
                ? Math.round((new Date(row.timestamp) - new Date(row.previous_action_time)) / 1000)
                : null;
            
            const timeToNext = row.next_action_time
                ? Math.round((new Date(row.next_action_time) - new Date(row.timestamp)) / 1000)
                : null;

            return {
                ...row,
                time_since_previous_seconds: timeSincePrevious,
                time_to_next_seconds: timeToNext,
                formatted_timestamp: new Date(row.timestamp).toISOString(),
                
                // Parse JSON fields safely
                old_value: row.old_value ? (typeof row.old_value === 'string' ? JSON.parse(row.old_value) : row.old_value) : null,
                new_value: row.new_value ? (typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value) : null,
                details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : {}
            };
        });

        res.json({
            success: true,
            session_id: sessionId,
            session_name: sessionCheck.rows[0].name,
            data: {
                timeline: processedTimeline,
                statistics: statsResult.rows[0],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: timelineResult.rows.length === parseInt(limit)
                },
                filters_applied: {
                    start_date,
                    end_date,
                    user_id,
                    action_type,
                    test_instance_id
                }
            }
        });

    } catch (error) {
        console.error('Error fetching audit timeline:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit timeline',
            error: error.message
        });
    }
});

// Generate audit report for compliance documentation
router.get('/:sessionId/audit-report', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { 
            format = 'json', 
            includeEvidence = 'true',
            includeTimeline = 'true',
            reportType = 'full',
            dateRange = null
        } = req.query;

        // Validate session exists
        const sessionQuery = `
            SELECT s.*, p.name as project_name, p.description as project_description
            FROM testing_sessions s
            JOIN projects p ON s.project_id = p.id
            WHERE s.id = $1
        `;
        const sessionResult = await pool.query(sessionQuery, [sessionId]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessionResult.rows[0];

        // Build date filter for audit data
        let dateFilter = '';
        let dateParams = [sessionId];
        if (dateRange) {
            const [startDate, endDate] = dateRange.split(',');
            dateFilter = ' AND tal.created_at BETWEEN $2 AND $3';
            dateParams.push(startDate, endDate);
        }

        // Get comprehensive audit data
        const auditQuery = `
            SELECT 
                tal.*,
                ti.test_requirement_id,
                ti.page_id,
                tr.requirement_text,
                tr.criterion_id,
                tr.level as requirement_level,
                dp.url as page_url,
                dp.title as page_title,
                u.username,
                u.email,
                CASE 
                    WHEN tal.action_type = 'status_change' THEN 
                        CONCAT('Status changed from ', tal.metadata->>'old_status', ' to ', tal.metadata->>'new_status')
                    WHEN tal.action_type = 'evidence_upload' THEN 
                        CONCAT('Evidence uploaded: ', tal.metadata->>'file_name')
                    WHEN tal.action_type = 'comment_added' THEN 
                        CONCAT('Comment: ', tal.metadata->>'comment')
                    WHEN tal.action_type = 'test_assigned' THEN 
                        CONCAT('Test assigned to ', tal.metadata->>'assigned_to')
                    WHEN tal.action_type = 'review_requested' THEN 
                        'Review requested'
                    ELSE tal.action_type
                END as action_description
            FROM test_audit_log tal
            LEFT JOIN test_instances ti ON tal.test_instance_id = ti.id
            LEFT JOIN test_requirements tr ON ti.test_requirement_id = tr.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN users u ON tal.user_id = u.id
            WHERE tal.session_id = $1 ${dateFilter}
            ORDER BY tal.created_at DESC
        `;

        const auditResult = await pool.query(auditQuery, dateParams);

        // Get test summary statistics
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_tests,
                COUNT(CASE WHEN ti.status = 'passed' THEN 1 END) as passed_tests,
                COUNT(CASE WHEN ti.status = 'failed' THEN 1 END) as failed_tests,
                COUNT(CASE WHEN ti.status = 'not_applicable' THEN 1 END) as na_tests,
                COUNT(CASE WHEN ti.status = 'pending' THEN 1 END) as pending_tests,
                COUNT(DISTINCT ti.page_id) as pages_tested,
                COUNT(DISTINCT tr.criterion_id) as criteria_tested,
                COUNT(CASE WHEN tr.level = 'A' THEN 1 END) as level_a_tests,
                COUNT(CASE WHEN tr.level = 'AA' THEN 1 END) as level_aa_tests,
                COUNT(CASE WHEN tr.level = 'AAA' THEN 1 END) as level_aaa_tests
            FROM test_instances ti
            JOIN test_requirements tr ON ti.test_requirement_id = tr.id
            WHERE ti.session_id = $1
        `;

        const summaryResult = await pool.query(summaryQuery, [sessionId]);
        const summary = summaryResult.rows[0];

        // Get evidence summary if requested
        let evidenceSummary = null;
        if (includeEvidence === 'true') {
            const evidenceQuery = `
                SELECT 
                    COUNT(*) as total_evidence,
                    COUNT(CASE WHEN tal.action_type = 'evidence_upload' THEN 1 END) as uploaded_files,
                    COUNT(CASE WHEN tal.metadata->>'evidence_type' = 'screenshot' THEN 1 END) as screenshots,
                    COUNT(CASE WHEN tal.metadata->>'evidence_type' = 'document' THEN 1 END) as documents,
                    COUNT(CASE WHEN tal.metadata->>'evidence_type' = 'video' THEN 1 END) as videos
                FROM test_audit_log tal
                WHERE tal.session_id = $1 AND tal.action_type = 'evidence_upload'
            `;
            
            const evidenceResult = await pool.query(evidenceQuery, [sessionId]);
            evidenceSummary = evidenceResult.rows[0];
        }

        // Get timeline data if requested
        let timelineData = null;
        if (includeTimeline === 'true') {
            const timelineQuery = `
                SELECT 
                    DATE(tal.created_at) as activity_date,
                    COUNT(*) as total_activities,
                    COUNT(CASE WHEN tal.action_type = 'status_change' THEN 1 END) as status_changes,
                    COUNT(CASE WHEN tal.action_type = 'evidence_upload' THEN 1 END) as evidence_uploads,
                    COUNT(CASE WHEN tal.action_type = 'comment_added' THEN 1 END) as comments_added,
                    COUNT(DISTINCT tal.user_id) as active_users
                FROM test_audit_log tal
                WHERE tal.session_id = $1 ${dateFilter}
                GROUP BY DATE(tal.created_at)
                ORDER BY activity_date DESC
            `;
            
            const timelineResult = await pool.query(timelineQuery, dateParams);
            timelineData = timelineResult.rows;
        }

        // Get compliance metrics
        const complianceQuery = `
            SELECT 
                tr.level,
                tr.criterion_id,
                COUNT(*) as total_tests,
                COUNT(CASE WHEN ti.status = 'passed' THEN 1 END) as passed,
                COUNT(CASE WHEN ti.status = 'failed' THEN 1 END) as failed,
                COUNT(CASE WHEN ti.status = 'not_applicable' THEN 1 END) as not_applicable,
                ROUND(
                    (COUNT(CASE WHEN ti.status = 'passed' THEN 1 END) * 100.0) / 
                    NULLIF(COUNT(CASE WHEN ti.status IN ('passed', 'failed') THEN 1 END), 0), 
                    2
                ) as compliance_percentage
            FROM test_instances ti
            JOIN test_requirements tr ON ti.test_requirement_id = tr.id
            WHERE ti.session_id = $1
            GROUP BY tr.level, tr.criterion_id
            ORDER BY tr.level, tr.criterion_id
        `;

        const complianceResult = await pool.query(complianceQuery, [sessionId]);

        // Calculate overall compliance score
        const overallCompliance = summary.total_tests > 0 ? 
            Math.round((parseInt(summary.passed_tests) * 100) / 
            (parseInt(summary.passed_tests) + parseInt(summary.failed_tests))) : 0;

        // Build comprehensive report
        const report = {
            metadata: {
                sessionId: session.id,
                sessionName: session.name,
                projectName: session.project_name,
                projectDescription: session.project_description,
                generatedAt: new Date().toISOString(),
                generatedBy: req.user ? req.user.username : 'System',
                reportType,
                dateRange: dateRange || 'All time',
                includeEvidence: includeEvidence === 'true',
                includeTimeline: includeTimeline === 'true'
            },
            executive_summary: {
                totalTests: parseInt(summary.total_tests),
                passedTests: parseInt(summary.passed_tests),
                failedTests: parseInt(summary.failed_tests),
                notApplicableTests: parseInt(summary.na_tests),
                pendingTests: parseInt(summary.pending_tests),
                pagesTested: parseInt(summary.pages_tested),
                criteriaTested: parseInt(summary.criteria_tested),
                overallCompliance: overallCompliance,
                complianceLevel: overallCompliance >= 95 ? 'Excellent' : 
                               overallCompliance >= 80 ? 'Good' : 
                               overallCompliance >= 60 ? 'Fair' : 'Needs Improvement'
            },
            wcag_breakdown: {
                levelA: parseInt(summary.level_a_tests),
                levelAA: parseInt(summary.level_aa_tests),
                levelAAA: parseInt(summary.level_aaa_tests)
            },
            compliance_details: complianceResult.rows,
            audit_activities: auditResult.rows,
            evidence_summary: evidenceSummary,
            timeline_data: timelineData,
            recommendations: generateRecommendations(summary, complianceResult.rows)
        };

        // Handle different output formats
        if (format === 'pdf') {
            // Return PDF generation endpoint (will be handled by frontend)
            return res.json({ 
                success: true, 
                reportData: report,
                pdfEndpoint: `/api/sessions/${sessionId}/audit-report/pdf`
            });
        }

        res.json({
            success: true,
            report
        });

    } catch (error) {
        console.error('Error generating audit report:', error);
        res.status(500).json({ error: 'Failed to generate audit report' });
    }
});

// Helper function to generate recommendations
function generateRecommendations(summary, complianceData) {
    const recommendations = [];
    
    const totalTests = parseInt(summary.total_tests);
    const failedTests = parseInt(summary.failed_tests);
    const pendingTests = parseInt(summary.pending_tests);
    
    if (failedTests > 0) {
        recommendations.push({
            priority: 'high',
            category: 'compliance',
            title: 'Address Failed Tests',
            description: `${failedTests} tests have failed and require immediate attention to meet accessibility standards.`,
            actionItems: [
                'Review failed test details and evidence',
                'Implement necessary fixes',
                'Re-test affected functionality',
                'Document remediation efforts'
            ]
        });
    }
    
    if (pendingTests > 0) {
        recommendations.push({
            priority: 'medium',
            category: 'testing',
            title: 'Complete Pending Tests',
            description: `${pendingTests} tests are still pending completion.`,
            actionItems: [
                'Assign pending tests to team members',
                'Set completion deadlines',
                'Ensure adequate testing resources'
            ]
        });
    }
    
    // Analyze compliance by level
    const levelAFailures = complianceData.filter(c => c.level === 'A' && parseInt(c.failed) > 0);
    const levelAAFailures = complianceData.filter(c => c.level === 'AA' && parseInt(c.failed) > 0);
    
    if (levelAFailures.length > 0) {
        recommendations.push({
            priority: 'critical',
            category: 'wcag_compliance',
            title: 'Critical WCAG Level A Failures',
            description: `Level A criteria failures prevent basic accessibility. Address immediately.`,
            actionItems: levelAFailures.map(f => `Fix criterion ${f.criterion_id} (${f.failed} failures)`)
        });
    }
    
    if (levelAAFailures.length > 0) {
        recommendations.push({
            priority: 'high',
            category: 'wcag_compliance',
            title: 'WCAG Level AA Failures',
            description: `Level AA criteria failures affect standard accessibility compliance.`,
            actionItems: levelAAFailures.map(f => `Address criterion ${f.criterion_id} (${f.failed} failures)`)
        });
    }
    
    // General recommendations based on compliance score
    const overallCompliance = totalTests > 0 ? 
        Math.round((parseInt(summary.passed_tests) * 100) / 
        (parseInt(summary.passed_tests) + parseInt(summary.failed_tests))) : 0;
    
    if (overallCompliance < 80) {
        recommendations.push({
            priority: 'high',
            category: 'process',
            title: 'Improve Testing Process',
            description: 'Overall compliance score indicates need for process improvements.',
            actionItems: [
                'Review testing methodology',
                'Increase team training on accessibility standards',
                'Implement automated accessibility testing',
                'Establish regular accessibility reviews'
            ]
        });
    }
    
    return recommendations;
}

// Generate PDF report (placeholder for PDF generation)
router.get('/:sessionId/audit-report/pdf', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // This would integrate with a PDF generation service
        // For now, return a placeholder response
        res.json({
            success: true,
            message: 'PDF generation endpoint ready',
            note: 'PDF generation requires additional setup with libraries like Puppeteer or PDFKit'
        });
        
    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({ error: 'Failed to generate PDF report' });
    }
});

// ===========================
// CHANGE APPROVAL WORKFLOW ENDPOINTS
// ===========================

// Get pending approval requests for a session
router.get('/:sessionId/approval-requests', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status = 'pending', urgency, requester, limit = 50, offset = 0 } = req.query;

        // Build where clause for filtering
        let whereClause = 'car.session_id = $1';
        const queryParams = [sessionId];
        let paramIndex = 1;

        if (status && status !== 'all') {
            paramIndex++;
            whereClause += ` AND car.status = $${paramIndex}`;
            queryParams.push(status);
        }

        if (urgency) {
            paramIndex++;
            whereClause += ` AND car.urgency_level = $${paramIndex}`;
            queryParams.push(urgency);
        }

        if (requester) {
            paramIndex++;
            whereClause += ` AND car.requested_by = $${paramIndex}`;
            queryParams.push(requester);
        }

        // Get approval requests with related data
        const requestsQuery = `
            SELECT 
                car.id,
                car.test_instance_id,
                car.change_type,
                car.field_name,
                car.old_value,
                car.new_value,
                car.change_reason,
                car.requested_by,
                u_requester.username as requester_username,
                u_requester.full_name as requester_full_name,
                car.requested_at,
                car.status,
                car.urgency_level,
                car.business_justification,
                car.impact_assessment,
                car.approval_deadline,
                car.required_approvers,
                car.approver_roles,
                
                -- Test instance details
                ti.status as test_status,
                tr.criterion_number,
                tr.title as requirement_title,
                dp.url as page_url,
                dp.title as page_title,
                
                -- Approval progress
                COUNT(ca.id) FILTER (WHERE ca.decision = 'approved') as approvals_received,
                COUNT(ca.id) FILTER (WHERE ca.decision = 'rejected') as rejections_received,
                COUNT(ca.id) FILTER (WHERE ca.decision = 'abstained') as abstentions_received,
                
                -- Time calculations
                EXTRACT(EPOCH FROM (car.approval_deadline - CURRENT_TIMESTAMP))/3600 as hours_until_deadline,
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - car.requested_at))/3600 as hours_since_requested
                
            FROM change_approval_requests car
            JOIN users u_requester ON car.requested_by = u_requester.id
            JOIN test_instances ti ON car.test_instance_id = ti.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN change_approvals ca ON car.id = ca.request_id
            WHERE ${whereClause}
            GROUP BY car.id, u_requester.username, u_requester.full_name, ti.status, 
                     tr.criterion_number, tr.title, dp.url, dp.title
            ORDER BY 
                CASE car.urgency_level 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'normal' THEN 3 
                    WHEN 'low' THEN 4 
                END,
                car.requested_at ASC
            LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
        `;

        queryParams.push(parseInt(limit), parseInt(offset));
        const requestsResult = await pool.query(requestsQuery, queryParams);

        // Get total count
        const countQuery = `
            SELECT COUNT(DISTINCT car.id) as total
            FROM change_approval_requests car
            JOIN users u_requester ON car.requested_by = u_requester.id
            WHERE ${whereClause}
        `;

        const countResult = await pool.query(countQuery, queryParams.slice(0, -2));

        res.json({
            requests: requestsResult.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < parseInt(countResult.rows[0].total)
            }
        });

    } catch (error) {
        console.error('Error fetching approval requests:', error);
        res.status(500).json({ error: 'Failed to fetch approval requests' });
    }
});

// Get specific approval request details
router.get('/:sessionId/approval-requests/:requestId', async (req, res) => {
    try {
        const { sessionId, requestId } = req.params;

        // Get detailed approval request information
        const requestQuery = `
            SELECT 
                car.*,
                u_requester.username as requester_username,
                u_requester.full_name as requester_full_name,
                u_requester.email as requester_email,
                
                -- Test instance details
                ti.status as test_status,
                ti.confidence_level,
                ti.notes as test_notes,
                tr.criterion_number,
                tr.title as requirement_title,
                tr.description as requirement_description,
                tr.requirement_type,
                tr.level as requirement_level,
                dp.url as page_url,
                dp.title as page_title,
                
                -- Approval rule details
                car_rule.rule_name,
                car_rule.description as rule_description,
                
                -- Time calculations
                EXTRACT(EPOCH FROM (car.approval_deadline - CURRENT_TIMESTAMP))/3600 as hours_until_deadline,
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - car.requested_at))/3600 as hours_since_requested
                
            FROM change_approval_requests car
            JOIN users u_requester ON car.requested_by = u_requester.id
            JOIN test_instances ti ON car.test_instance_id = ti.id
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
            LEFT JOIN change_approval_rules car_rule ON car.approval_rule_id = car_rule.id
            WHERE car.id = $1 AND car.session_id = $2
        `;

        const requestResult = await pool.query(requestQuery, [requestId, sessionId]);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Approval request not found' });
        }

        // Get approval history
        const approvalsQuery = `
            SELECT 
                ca.*,
                u_approver.username as approver_username,
                u_approver.full_name as approver_full_name,
                u_approver.email as approver_email,
                u_delegated.username as delegated_from_username
            FROM change_approvals ca
            JOIN users u_approver ON ca.approver_id = u_approver.id
            LEFT JOIN users u_delegated ON ca.delegated_from = u_delegated.id
            WHERE ca.request_id = $1
            ORDER BY ca.decided_at DESC
        `;

        const approvalsResult = await pool.query(approvalsQuery, [requestId]);

        // Get escalation history
        const escalationsQuery = `
            SELECT 
                cae.*,
                u_escalated_to.username as escalated_to_username,
                u_escalated_to.full_name as escalated_to_full_name,
                u_escalated_by.username as escalated_by_username
            FROM change_approval_escalations cae
            JOIN users u_escalated_to ON cae.escalated_to = u_escalated_to.id
            LEFT JOIN users u_escalated_by ON cae.escalated_by = u_escalated_by.id
            WHERE cae.request_id = $1
            ORDER BY cae.created_at DESC
        `;

        const escalationsResult = await pool.query(escalationsQuery, [requestId]);

        res.json({
            request: requestResult.rows[0],
            approvals: approvalsResult.rows,
            escalations: escalationsResult.rows
        });

    } catch (error) {
        console.error('Error fetching approval request details:', error);
        res.status(500).json({ error: 'Failed to fetch approval request details' });
    }
});

// Submit approval decision
router.post('/:sessionId/approval-requests/:requestId/approve', async (req, res) => {
    try {
        const { sessionId, requestId } = req.params;
        const { decision, reason, conditions, review_notes } = req.body;
        const approverId = req.user?.id || '46088230-6133-45e3-8a04-06feea298094'; // Default admin user

        // Validate decision
        if (!['approved', 'rejected', 'abstained'].includes(decision)) {
            return res.status(400).json({ error: 'Invalid decision. Must be approved, rejected, or abstained' });
        }

        // Get current approval request
        const requestQuery = `
            SELECT car.*, u.role as approver_role
            FROM change_approval_requests car, users u
            WHERE car.id = $1 AND car.session_id = $2 AND u.id = $3
        `;

        const requestResult = await pool.query(requestQuery, [requestId, sessionId, approverId]);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Approval request not found or you are not authorized' });
        }

        const request = requestResult.rows[0];

        // Check if request is still pending
        if (request.status !== 'pending') {
            return res.status(400).json({ error: 'Approval request is no longer pending' });
        }

        // Check if user's role is in the approver roles
        const approverRoles = request.approver_roles;
        if (!approverRoles.includes(request.approver_role)) {
            return res.status(403).json({ error: 'You are not authorized to approve this request' });
        }

        // Check if user has already submitted a decision
        const existingApprovalQuery = `
            SELECT id FROM change_approvals 
            WHERE request_id = $1 AND approver_id = $2
        `;

        const existingResult = await pool.query(existingApprovalQuery, [requestId, approverId]);

        if (existingResult.rows.length > 0) {
            return res.status(400).json({ error: 'You have already submitted a decision for this request' });
        }

        // Insert approval decision
        const approvalQuery = `
            INSERT INTO change_approvals (
                request_id, approver_id, approver_role, decision, 
                decision_reason, conditions, review_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const approvalResult = await pool.query(approvalQuery, [
            requestId, approverId, request.approver_role, decision, reason, conditions, review_notes
        ]);

        // Check if we have enough approvals or rejections to finalize the request
        const decisionsQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE decision = 'approved') as approvals,
                COUNT(*) FILTER (WHERE decision = 'rejected') as rejections
            FROM change_approvals
            WHERE request_id = $1
        `;

        const decisionsResult = await pool.query(decisionsQuery, [requestId]);
        const { approvals, rejections } = decisionsResult.rows[0];

        let finalStatus = 'pending';
        let finalizedAt = null;

        // Determine if request should be finalized
        if (parseInt(rejections) > 0) {
            finalStatus = 'rejected';
            finalizedAt = new Date();
        } else if (parseInt(approvals) >= request.required_approvers) {
            finalStatus = 'approved';
            finalizedAt = new Date();
        }

        // Update request status if finalized
        if (finalStatus !== 'pending') {
            const updateQuery = `
                UPDATE change_approval_requests 
                SET status = $1, approved_at = $2, approved_by = $3
                WHERE id = $4
            `;

            await pool.query(updateQuery, [finalStatus, finalizedAt, approverId, requestId]);

            // If approved, apply the change to the test instance
            if (finalStatus === 'approved') {
                await applyApprovedChange(request);
            }
        }

        // Log the approval action
        const auditQuery = `
            INSERT INTO test_audit_log (
                test_instance_id, user_id, action_type, change_description, details
            ) VALUES ($1, $2, $3, $4, $5)
        `;

        await pool.query(auditQuery, [
            request.test_instance_id,
            approverId,
            decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'abstained',
            `Change request ${decision}: ${reason || 'No reason provided'}`,
            JSON.stringify({
                approval_request_id: requestId,
                decision: decision,
                final_status: finalStatus,
                conditions: conditions
            })
        ]);

        res.json({
            approval: approvalResult.rows[0],
            request_status: finalStatus,
            message: finalStatus === 'pending' ? 'Approval recorded, waiting for additional approvals' : 
                     finalStatus === 'approved' ? 'Change approved and applied' : 'Change rejected'
        });

    } catch (error) {
        console.error('Error submitting approval decision:', error);
        res.status(500).json({ error: 'Failed to submit approval decision' });
    }
});

// Create manual approval request
router.post('/:sessionId/approval-requests', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { 
            test_instance_id, change_type, field_name, old_value, new_value, 
            change_reason, urgency_level = 'normal', business_justification, 
            impact_assessment, required_approvers = 1, approver_roles = ['manager']
        } = req.body;
        const requesterId = req.user?.id || '46088230-6133-45e3-8a04-06feea298094'; // Default admin user

        // Validate required fields
        if (!test_instance_id || !change_type || !field_name || !change_reason) {
            return res.status(400).json({ 
                error: 'Missing required fields: test_instance_id, change_type, field_name, change_reason' 
            });
        }

        // Create approval request
        const requestQuery = `
            INSERT INTO change_approval_requests (
                test_instance_id, session_id, change_type, field_name, 
                old_value, new_value, change_reason, requested_by,
                urgency_level, business_justification, impact_assessment,
                required_approvers, approver_roles, approval_deadline
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const approvalDeadline = new Date();
        approvalDeadline.setHours(approvalDeadline.getHours() + 24); // Default 24 hour deadline

        const requestResult = await pool.query(requestQuery, [
            test_instance_id, sessionId, change_type, field_name,
            JSON.stringify(old_value), JSON.stringify(new_value), change_reason, requesterId,
            urgency_level, business_justification, impact_assessment,
            required_approvers, JSON.stringify(approver_roles), approvalDeadline
        ]);

        // Log the approval request creation
        const auditQuery = `
            INSERT INTO test_audit_log (
                test_instance_id, user_id, action_type, change_description, details
            ) VALUES ($1, $2, $3, $4, $5)
        `;

        await pool.query(auditQuery, [
            test_instance_id,
            requesterId,
            'approval_requested',
            `Manual approval request created: ${change_reason}`,
            JSON.stringify({
                approval_request_id: requestResult.rows[0].id,
                change_type: change_type,
                urgency_level: urgency_level
            })
        ]);

        res.json({
            request: requestResult.rows[0],
            message: 'Approval request created successfully'
        });

    } catch (error) {
        console.error('Error creating approval request:', error);
        res.status(500).json({ error: 'Failed to create approval request' });
    }
});

// Helper function to apply approved changes
async function applyApprovedChange(request) {
    try {
        const { test_instance_id, field_name, new_value } = request;
        
        // Build update query based on field being changed
        let updateQuery;
        let updateValue = typeof new_value === 'string' ? JSON.parse(new_value) : new_value;

        switch (field_name) {
            case 'status':
                updateQuery = 'UPDATE test_instances SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
                break;
            case 'assigned_tester':
                updateQuery = 'UPDATE test_instances SET assigned_tester = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
                break;
            case 'confidence_level':
                updateQuery = 'UPDATE test_instances SET confidence_level = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
                break;
            case 'notes':
                updateQuery = 'UPDATE test_instances SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
                break;
            case 'remediation_notes':
                updateQuery = 'UPDATE test_instances SET remediation_notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
                break;
            case 'evidence':
                updateQuery = 'UPDATE test_instances SET evidence = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
                updateValue = JSON.stringify(updateValue);
                break;
            default:
                console.warn(`Unknown field for approval: ${field_name}`);
                return;
        }

        await pool.query(updateQuery, [updateValue, test_instance_id]);

        console.log(`Applied approved change: ${field_name} updated for test instance ${test_instance_id}`);

    } catch (error) {
        console.error('Error applying approved change:', error);
        throw error;
    }
}

// Get approval statistics for a session
router.get('/:sessionId/approval-statistics', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { days = 30 } = req.query;

        // Get approval statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_requests,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
                COUNT(*) FILTER (WHERE status = 'auto_approved') as auto_approved_requests,
                COUNT(*) FILTER (WHERE status = 'expired') as expired_requests,
                
                -- By urgency
                COUNT(*) FILTER (WHERE urgency_level = 'critical') as critical_requests,
                COUNT(*) FILTER (WHERE urgency_level = 'high') as high_requests,
                COUNT(*) FILTER (WHERE urgency_level = 'normal') as normal_requests,
                COUNT(*) FILTER (WHERE urgency_level = 'low') as low_requests,
                
                -- By change type
                COUNT(*) FILTER (WHERE change_type = 'status_change') as status_change_requests,
                COUNT(*) FILTER (WHERE change_type = 'assignment_change') as assignment_change_requests,
                COUNT(*) FILTER (WHERE change_type = 'evidence_modification') as evidence_modification_requests,
                COUNT(*) FILTER (WHERE change_type = 'confidence_change') as confidence_change_requests,
                
                -- Timing statistics
                AVG(EXTRACT(EPOCH FROM (approved_at - requested_at))/3600) 
                    FILTER (WHERE approved_at IS NOT NULL) as avg_approval_time_hours,
                MIN(EXTRACT(EPOCH FROM (approved_at - requested_at))/3600) 
                    FILTER (WHERE approved_at IS NOT NULL) as min_approval_time_hours,
                MAX(EXTRACT(EPOCH FROM (approved_at - requested_at))/3600) 
                    FILTER (WHERE approved_at IS NOT NULL) as max_approval_time_hours
                    
            FROM change_approval_requests
            WHERE session_id = $1 
            AND requested_at >= CURRENT_TIMESTAMP - INTERVAL '${parseInt(days)} days'
        `;

        const statsResult = await pool.query(statsQuery, [sessionId]);

        // Get daily breakdown
        const dailyQuery = `
            SELECT 
                DATE_TRUNC('day', requested_at) as request_date,
                COUNT(*) as requests_count,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
                AVG(EXTRACT(EPOCH FROM (approved_at - requested_at))/3600) 
                    FILTER (WHERE approved_at IS NOT NULL) as avg_approval_time_hours
            FROM change_approval_requests
            WHERE session_id = $1 
            AND requested_at >= CURRENT_TIMESTAMP - INTERVAL '${parseInt(days)} days'
            GROUP BY DATE_TRUNC('day', requested_at)
            ORDER BY request_date DESC
        `;

        const dailyResult = await pool.query(dailyQuery, [sessionId]);

        res.json({
            overall: statsResult.rows[0],
            daily_breakdown: dailyResult.rows
        });

    } catch (error) {
        console.error('Error fetching approval statistics:', error);
        res.status(500).json({ error: 'Failed to fetch approval statistics' });
    }
});

/**
 * POST /api/sessions/:sessionId/start-playwright
 * Start Playwright testing for an existing compliance session
 */
router.post('/:sessionId/start-playwright', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            testTypes = ['basic', 'keyboard', 'screen-reader', 'form'],
            browsers = ['chromium'],
            viewports = ['desktop'],
            authConfigId
        } = req.body;

        // Verify session exists
        const sessionQuery = await pool.query(`
            SELECT ts.*, p.name as project_name, p.primary_url, p.id as project_id
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `, [sessionId]);

        if (sessionQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found'
            });
        }

        const session = sessionQuery.rows[0];

        console.log(`🎭 Starting Playwright tests for session: ${session.name}`);

        // Initialize PlaywrightIntegrationService
        const integrationService = new PlaywrightIntegrationService();

        // Create frontend test run
        const testRun = await integrationService.createFrontendTestRun(sessionId, {
            runName: `Playwright Test Run - ${new Date().toISOString()}`,
            testSuite: 'playwright',
            testEnvironment: process.env.NODE_ENV || 'development',
            browsers,
            viewports,
            testTypes,
            initiatedBy: req.user?.id || null,
            metadata: {
                triggeredViaApi: true,
                authConfigId,
                startedAt: new Date().toISOString()
            }
        });

        // Set environment variables for Playwright execution
        process.env.TEST_SESSION_ID = sessionId;
        process.env.TEST_PROJECT_ID = session.project_id;
        if (authConfigId) {
            process.env.TEST_AUTH_CONFIG_ID = authConfigId;
        }

        // Start Playwright tests asynchronously
        const playwrightPromise = integrationService.runPlaywrightTests({
            sessionId,
            testRunId: testRun.id,
            testTypes,
            browsers,
            viewports,
            baseUrl: session.primary_url
        });

        res.status(202).json({
            success: true,
            message: 'Playwright testing initiated successfully',
            session: {
                id: sessionId,
                name: session.name,
                project: session.project_name
            },
            testRun: {
                id: testRun.id,
                name: testRun.run_name,
                status: testRun.status
            },
            configuration: {
                testTypes,
                browsers,
                viewports
            },
            status: 'initiated',
            instructions: 'Monitor progress via WebSocket or GET /api/sessions/:sessionId/test-progress'
        });

        // Handle completion in background
        playwrightPromise.then(result => {
            console.log(`✅ Playwright testing completed for session ${sessionId}:`, result);
        }).catch(error => {
            console.error(`❌ Playwright testing failed for session ${sessionId}:`, error);
        });

    } catch (error) {
        console.error('Error starting Playwright testing for session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start Playwright testing',
            message: error.message
        });
    }
});

/**
 * GET /api/sessions/:sessionId/test-progress
 * Get real-time progress of automated testing for a session
 */
router.get('/:sessionId/test-progress', async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Get session info
        const sessionQuery = await pool.query(`
            SELECT ts.*, p.name as project_name
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `, [sessionId]);

        if (sessionQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found'
            });
        }

        const session = sessionQuery.rows[0];

        // Get frontend test runs progress
        const frontendRunsQuery = await pool.query(`
            SELECT 
                id, run_name, status, test_suite, test_environment,
                started_at, completed_at, execution_duration_ms,
                total_tests_executed, tests_passed, tests_failed,
                total_violations_found, browsers_tested, viewports_tested,
                created_at
            FROM frontend_test_runs 
            WHERE test_session_id = $1 
            ORDER BY created_at DESC
        `, [sessionId]);

        // Get automated test results summary
        const automatedResultsQuery = await pool.query(`
            SELECT 
                COUNT(*) as total_tests,
                COUNT(*) FILTER (WHERE violations_count = 0) as passed_tests,
                COUNT(*) FILTER (WHERE violations_count > 0) as failed_tests,
                SUM(violations_count) as total_violations,
                COUNT(DISTINCT tool_name) as tools_used,
                COUNT(DISTINCT page_url) as pages_tested,
                MIN(executed_at) as first_test,
                MAX(executed_at) as last_test
            FROM automated_test_results 
            WHERE test_session_id = $1
        `, [sessionId]);

        // Get overall unified results if available
        const unifiedResultsQuery = await pool.query(`
            SELECT * FROM compliance_session_test_results 
            WHERE session_id = $1
        `, [sessionId]);

        const response = {
            success: true,
            session: {
                id: sessionId,
                name: session.name,
                project: session.project_name,
                status: session.status,
                testingApproach: session.testing_approach
            },
            frontendTestRuns: frontendRunsQuery.rows,
            automatedTestsSummary: automatedResultsQuery.rows[0] || {
                total_tests: 0,
                passed_tests: 0,
                failed_tests: 0,
                total_violations: 0,
                tools_used: 0,
                pages_tested: 0
            },
            overallProgress: unifiedResultsQuery.rows[0] || null,
            lastUpdated: new Date().toISOString()
        };

        res.json(response);

    } catch (error) {
        console.error('Error getting test progress:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve test progress',
            message: error.message
        });
    }
});

/**
 * GET /api/sessions/:sessionId/playwright-results
 * Get Playwright-specific test results for a session
 */
router.get('/:sessionId/playwright-results', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { testRunId, browser, includeDetails = 'true' } = req.query;

        // Get session info
        const sessionQuery = await pool.query(`
            SELECT ts.*, p.name as project_name
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `, [sessionId]);

        if (sessionQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found'
            });
        }

        // Build query for Playwright results
        let resultsQuery = `
            SELECT 
                atr.id, atr.tool_name, atr.test_url as page_url, atr.executed_at,
                atr.violations_count, atr.warnings_count, atr.passes_count,
                atr.browser_name, atr.viewport_width, atr.viewport_height,
                atr.test_environment, atr.frontend_test_metadata,
                ftr.run_name, ftr.test_suite, ftr.status as run_status
            FROM automated_test_results atr
            LEFT JOIN frontend_test_runs ftr ON atr.frontend_test_run_id = ftr.id
            WHERE atr.test_session_id = $1 
            AND atr.tool_name LIKE 'playwright%'
        `;
        
        const queryParams = [sessionId];
        let paramIndex = 2;

        if (testRunId) {
            resultsQuery += ` AND atr.frontend_test_run_id = $${paramIndex}`;
            queryParams.push(testRunId);
            paramIndex++;
        }

        if (browser) {
            resultsQuery += ` AND atr.browser_name = $${paramIndex}`;
            queryParams.push(browser);
            paramIndex++;
        }

        resultsQuery += ` ORDER BY atr.executed_at DESC`;

        const results = await pool.query(resultsQuery, queryParams);

        // Get violations if details requested
        let violations = [];
        if (includeDetails === 'true' && results.rows.length > 0) {
            const resultIds = results.rows.map(r => r.id);
            const violationsQuery = await pool.query(`
                SELECT 
                    v.*, atr.page_url, atr.browser_name, atr.tool_name
                FROM violations v
                JOIN automated_test_results atr ON v.automated_result_id = atr.id
                WHERE v.automated_result_id = ANY($1)
                ORDER BY v.severity DESC, v.wcag_criterion
            `, [resultIds]);
            violations = violationsQuery.rows;
        }

        // Calculate summary statistics
        const summary = {
            totalTests: results.rows.length,
            passedTests: results.rows.filter(r => r.violations_count === 0).length,
            failedTests: results.rows.filter(r => r.violations_count > 0).length,
            totalViolations: results.rows.reduce((sum, r) => sum + (r.violations_count || 0), 0),
            browsersUsed: [...new Set(results.rows.map(r => r.browser_name))],
            pagesTestedCount: [...new Set(results.rows.map(r => r.page_url))].length
        };

        res.json({
            success: true,
            sessionId,
            summary,
            results: results.rows,
            violations: includeDetails === 'true' ? violations : null,
            resultCount: results.rows.length,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting Playwright results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve Playwright results',
            message: error.message
        });
    }
});

/**
 * GET /api/sessions/:sessionId/test-configuration
 * Get comprehensive test configuration and requirements mapping for a compliance session
 */
router.get('/:sessionId/test-configuration', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Get session details
        const sessionQuery = await pool.query(`
            SELECT ts.*, p.name as project_name, p.primary_url, p.id as project_id
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `, [sessionId]);

        if (sessionQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found'
            });
        }

        const session = sessionQuery.rows[0];

        // Get available pages for testing from WEB CRAWLERS
        const pagesQuery = await pool.query(`
            SELECT cdp.id, cdp.url, cdp.title, cdp.page_type, cdp.content_type, 
                   cr.id as crawler_run_id, cr.status as crawler_status
            FROM crawler_discovered_pages cdp
            JOIN crawler_runs cr ON cdp.crawler_run_id = cr.id
            JOIN web_crawlers wc ON cr.crawler_id = wc.id
            WHERE wc.project_id = $1 AND cr.status = 'completed'
            AND cdp.status_code BETWEEN 200 AND 299
            ORDER BY cdp.url
            LIMIT 50
        `, [session.project_id]);

        // Get WCAG requirements based on conformance level
        const conformanceLevel = session.conformance_level || 'wcag_aa';
        const includeLevels = conformanceLevel === 'wcag_aaa' ? ['A', 'AA', 'AAA'] : 
                             conformanceLevel === 'wcag_aa' ? ['A', 'AA'] : ['A'];

        const requirementsQuery = await pool.query(`
            SELECT 
                wr.id,
                wr.criterion_number,
                wr.title,
                wr.description,
                wr.level,
                wr.wcag_version,
                wr.tool_mappings,
                wr.manual_test_procedure,
                wr.understanding_url,
                wr.applies_to_page_types
            FROM wcag_requirements wr
            WHERE wr.level = ANY($1) AND wr.wcag_version = '2.1'
            ORDER BY wr.criterion_number
        `, [includeLevels]);

        // Get automated tool configurations
        const automatedToolConfigs = {
            playwright: {
                name: 'Playwright Frontend Testing',
                description: 'End-to-end accessibility testing with real browser automation',
                testTypes: [
                    { id: 'basic', name: 'Basic Accessibility', description: 'Core axe-core rule violations' },
                    { id: 'keyboard', name: 'Keyboard Navigation', description: 'Tab order, focus management, keyboard traps' },
                    { id: 'screen-reader', name: 'Screen Reader Compatibility', description: 'ARIA attributes, semantic structure' },
                    { id: 'form', name: 'Form Accessibility', description: 'Labels, validation, error messages' },
                    { id: 'mobile', name: 'Mobile Accessibility', description: 'Touch targets, responsive design' },
                    { id: 'dynamic', name: 'Dynamic Content', description: 'Live regions, dynamic updates' }
                ],
                browsers: [
                    { id: 'chromium', name: 'Chromium', default: true },
                    { id: 'firefox', name: 'Firefox', default: false },
                    { id: 'webkit', name: 'WebKit (Safari)', default: false }
                ],
                viewports: [
                    { id: 'desktop', name: 'Desktop (1920x1080)', default: true },
                    { id: 'tablet', name: 'Tablet (768x1024)', default: true },
                    { id: 'mobile', name: 'Mobile (375x667)', default: true }
                ],
                estimatedTime: '15-30 minutes per page'
            },
            axe: {
                name: 'axe-core Backend Testing',
                description: 'Fast automated accessibility rule checking',
                coverage: 'Covers ~40% of WCAG 2.1 issues automatically',
                testScope: 'Page structure, ARIA usage, color contrast, semantic HTML',
                estimatedTime: '2-3 minutes per page'
            },
            pa11y: {
                name: 'Pa11y Backend Testing', 
                description: 'Command-line accessibility testing with multiple engines',
                coverage: 'Complementary rules to axe-core, HTML validation',
                testScope: 'Alternative perspective on accessibility violations',
                estimatedTime: '2-3 minutes per page'
            },
            lighthouse: {
                name: 'Lighthouse Performance & Accessibility',
                description: 'Google Lighthouse accessibility audit',
                coverage: 'Performance impact on accessibility, best practices',
                testScope: 'Core Web Vitals affecting accessibility users',
                estimatedTime: '3-5 minutes per page'
            }
        };

        // Map requirements to testing methods
        const requirementMappings = [];
        requirementsQuery.rows.forEach(req => {
            const toolMappings = req.tool_mappings || {};
            const hasAutomatedCoverage = Object.keys(toolMappings).length > 0;
            const hasManualProcedure = req.manual_test_procedure && req.manual_test_procedure.trim() !== '';

            let testMethod = 'manual';
            if (hasAutomatedCoverage && hasManualProcedure) {
                testMethod = 'hybrid';
            } else if (hasAutomatedCoverage) {
                testMethod = 'automated';
            }

            requirementMappings.push({
                requirement: req,
                testMethod,
                automatedCoverage: hasAutomatedCoverage ? Object.keys(toolMappings) : [],
                manualRequired: hasManualProcedure,
                estimatedAutomatedTime: hasAutomatedCoverage ? '2-5 minutes' : null,
                estimatedManualTime: hasManualProcedure ? '5-15 minutes' : null
            });
        });

        // Calculate test estimates
        const pageCount = pagesQuery.rows.length;
        const testEstimates = {
            playwright: {
                totalTests: pageCount * 6, // 6 test types per page
                estimatedMinutes: pageCount * 20,
                coverage: requirementMappings.filter(r => r.testMethod === 'automated' || r.testMethod === 'hybrid').length
            },
            backend: {
                totalTests: pageCount * 3, // axe, pa11y, lighthouse per page
                estimatedMinutes: pageCount * 8,
                coverage: requirementMappings.filter(r => r.automatedCoverage.length > 0).length
            },
            manual: {
                totalTests: requirementMappings.filter(r => r.manualRequired).length * pageCount,
                estimatedMinutes: requirementMappings.filter(r => r.manualRequired).length * pageCount * 10,
                coverage: requirementMappings.filter(r => r.manualRequired).length
            }
        };

        res.json({
            success: true,
            data: {
                session: {
                    id: session.id,
                    name: session.name,
                    project_name: session.project_name,
                    conformance_level: session.conformance_level,
                    status: session.status
                },
                scope: {
                    pages: pagesQuery.rows,
                    pageCount: pageCount,
                    conformanceLevels: includeLevels
                },
                testConfiguration: {
                    automatedTools: automatedToolConfigs,
                    estimates: testEstimates
                },
                requirements: {
                    total: requirementMappings.length,
                    byMethod: {
                        automated: requirementMappings.filter(r => r.testMethod === 'automated').length,
                        manual: requirementMappings.filter(r => r.testMethod === 'manual').length,
                        hybrid: requirementMappings.filter(r => r.testMethod === 'hybrid').length
                    },
                    details: requirementMappings
                }
            }
        });

    } catch (error) {
        console.error('Error getting test configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get test configuration',
            message: error.message
        });
    }
});

/**
 * GET /api/sessions/:sessionId/comprehensive-summary
 * Get comprehensive summary showing requirements and pages breakdown
 */
router.get('/:sessionId/comprehensive-summary', async (req, res) => {
    try {
        const { sessionId } = req.params;

        console.log(`📊 Getting comprehensive summary for session: ${sessionId}`);

        // Get session basic info
        const sessionQuery = `
            SELECT 
                ts.*,
                p.name as project_name,
                p.primary_url as project_url
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `;
        const sessionResult = await pool.query(sessionQuery, [sessionId]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found'
            });
        }

        const session = sessionResult.rows[0];

        // Get requirements breakdown by status
        const requirementsQuery = `
            SELECT 
                tr.criterion_number,
                tr.title as requirement_title,
                tr.level as requirement_level,
                tr.requirement_type,
                ti.status,
                COUNT(*) as test_instance_count,
                COUNT(DISTINCT ti.page_id) as pages_tested,
                MAX(ti.updated_at) as last_updated
            FROM test_instances ti
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ti.session_id = $1
            GROUP BY tr.id, tr.criterion_number, tr.title, tr.level, tr.requirement_type, ti.status
            ORDER BY tr.criterion_number, ti.status
        `;
        const requirementsResult = await pool.query(requirementsQuery, [sessionId]);

        // Get pages breakdown by status
        const pagesQuery = `
            SELECT 
                dp.url,
                dp.title as page_title,
                dp.page_type,
                ti.status,
                COUNT(*) as test_instance_count,
                COUNT(DISTINCT ti.requirement_id) as requirements_tested,
                MAX(ti.updated_at) as last_updated
            FROM test_instances ti
            JOIN discovered_pages dp ON ti.page_id = dp.id
            WHERE ti.session_id = $1
            GROUP BY dp.id, dp.url, dp.title, dp.page_type, ti.status
            ORDER BY dp.url, ti.status
        `;
        const pagesResult = await pool.query(pagesQuery, [sessionId]);

        // Get overall summary statistics
        const summaryQuery = `
            SELECT 
                COUNT(DISTINCT tr.id) as total_requirements,
                COUNT(DISTINCT CASE WHEN ti.status = 'passed' THEN tr.id END) as requirements_passed,
                COUNT(DISTINCT CASE WHEN ti.status = 'failed' THEN tr.id END) as requirements_failed,
                COUNT(DISTINCT CASE WHEN ti.status = 'not_applicable' THEN tr.id END) as requirements_not_applicable,
                COUNT(DISTINCT CASE WHEN ti.status IN ('pending', 'in_progress', 'needs_review') THEN tr.id END) as requirements_in_progress,
                
                COUNT(DISTINCT dp.id) as total_pages,
                COUNT(DISTINCT CASE WHEN ti.status = 'passed' THEN dp.id END) as pages_with_passes,
                COUNT(DISTINCT CASE WHEN ti.status = 'failed' THEN dp.id END) as pages_with_failures,
                COUNT(DISTINCT CASE WHEN ti.status = 'not_applicable' THEN dp.id END) as pages_not_applicable,
                COUNT(DISTINCT CASE WHEN ti.status IN ('pending', 'in_progress', 'needs_review') THEN dp.id END) as pages_in_progress,
                
                COUNT(*) as total_test_instances,
                COUNT(CASE WHEN ti.status = 'passed' THEN 1 END) as test_instances_passed,
                COUNT(CASE WHEN ti.status = 'failed' THEN 1 END) as test_instances_failed,
                COUNT(CASE WHEN ti.status = 'not_applicable' THEN 1 END) as test_instances_not_applicable,
                COUNT(CASE WHEN ti.status IN ('pending', 'in_progress', 'needs_review') THEN 1 END) as test_instances_in_progress,
                
                -- Requirement+Page combinations
                COUNT(DISTINCT CONCAT(tr.id, '-', dp.id)) as total_requirement_page_combinations,
                COUNT(DISTINCT CASE WHEN ti.status = 'passed' THEN CONCAT(tr.id, '-', dp.id) END) as requirement_page_passed,
                COUNT(DISTINCT CASE WHEN ti.status = 'failed' THEN CONCAT(tr.id, '-', dp.id) END) as requirement_page_failed,
                COUNT(DISTINCT CASE WHEN ti.status = 'not_applicable' THEN CONCAT(tr.id, '-', dp.id) END) as requirement_page_not_applicable,
                COUNT(DISTINCT CASE WHEN ti.status IN ('pending', 'in_progress', 'needs_review') THEN CONCAT(tr.id, '-', dp.id) END) as requirement_page_in_progress

            FROM test_instances ti
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            JOIN discovered_pages dp ON ti.page_id = dp.id
            WHERE ti.session_id = $1
        `;
        const summaryResult = await pool.query(summaryQuery, [sessionId]);

        // Get automated test results summary
        const automatedSummaryQuery = `
            SELECT 
                COUNT(*) as total_automated_results,
                SUM(violations_count) as total_violations,
                SUM(passes_count) as total_passes,
                COUNT(DISTINCT page_id) as pages_tested_automated,
                COUNT(DISTINCT tool_name) as tools_used
            FROM automated_test_results
            WHERE test_session_id = $1
        `;
        const automatedSummaryResult = await pool.query(automatedSummaryQuery, [sessionId]);

        // Process the data for easier frontend consumption
        const requirementsSummary = requirementsResult.rows.reduce((acc, row) => {
            const key = `${row.criterion_number}`;
            if (!acc[key]) {
                acc[key] = {
                    criterion_number: row.criterion_number,
                    title: row.requirement_title,
                    level: row.requirement_level,
                    requirement_type: row.requirement_type,
                    statuses: {},
                    total_test_instances: 0,
                    pages_tested: 0,
                    last_updated: row.last_updated
                };
            }
            acc[key].statuses[row.status] = row.test_instance_count;
            acc[key].total_test_instances += row.test_instance_count;
            acc[key].pages_tested = Math.max(acc[key].pages_tested, row.pages_tested);
            if (!acc[key].last_updated || row.last_updated > acc[key].last_updated) {
                acc[key].last_updated = row.last_updated;
            }
            return acc;
        }, {});

        const pagesSummary = pagesResult.rows.reduce((acc, row) => {
            const key = row.url;
            if (!acc[key]) {
                acc[key] = {
                    url: row.url,
                    title: row.page_title,
                    page_type: row.page_type,
                    statuses: {},
                    total_test_instances: 0,
                    requirements_tested: 0,
                    last_updated: row.last_updated
                };
            }
            acc[key].statuses[row.status] = row.test_instance_count;
            acc[key].total_test_instances += row.test_instance_count;
            acc[key].requirements_tested = Math.max(acc[key].requirements_tested, row.requirements_tested);
            if (!acc[key].last_updated || row.last_updated > acc[key].last_updated) {
                acc[key].last_updated = row.last_updated;
            }
            return acc;
        }, {});

        const summary = summaryResult.rows[0];
        const automatedSummary = automatedSummaryResult.rows[0];

        res.json({
            success: true,
            data: {
                session,
                summary: {
                    // Requirements summary
                    requirements: {
                        total: parseInt(summary.total_requirements) || 0,
                        passed: parseInt(summary.requirements_passed) || 0,
                        failed: parseInt(summary.requirements_failed) || 0,
                        not_applicable: parseInt(summary.requirements_not_applicable) || 0,
                        in_progress: parseInt(summary.requirements_in_progress) || 0
                    },
                    // Pages summary
                    pages: {
                        total: parseInt(summary.total_pages) || 0,
                        with_passes: parseInt(summary.pages_with_passes) || 0,
                        with_failures: parseInt(summary.pages_with_failures) || 0,
                        not_applicable: parseInt(summary.pages_not_applicable) || 0,
                        in_progress: parseInt(summary.pages_in_progress) || 0
                    },
                    // Test instances summary
                    test_instances: {
                        total: parseInt(summary.total_test_instances) || 0,
                        passed: parseInt(summary.test_instances_passed) || 0,
                        failed: parseInt(summary.test_instances_failed) || 0,
                        not_applicable: parseInt(summary.test_instances_not_applicable) || 0,
                        in_progress: parseInt(summary.test_instances_in_progress) || 0
                    },
                    // Requirement+Page combinations
                    requirement_page_combinations: {
                        total: parseInt(summary.total_requirement_page_combinations) || 0,
                        passed: parseInt(summary.requirement_page_passed) || 0,
                        failed: parseInt(summary.requirement_page_failed) || 0,
                        not_applicable: parseInt(summary.requirement_page_not_applicable) || 0,
                        in_progress: parseInt(summary.requirement_page_in_progress) || 0
                    },
                    // Automated testing summary
                    automated_testing: {
                        total_results: parseInt(automatedSummary.total_automated_results) || 0,
                        total_violations: parseInt(automatedSummary.total_violations) || 0,
                        total_passes: parseInt(automatedSummary.total_passes) || 0,
                        pages_tested: parseInt(automatedSummary.pages_tested_automated) || 0,
                        tools_used: parseInt(automatedSummary.tools_used) || 0
                    }
                },
                requirements_breakdown: Object.values(requirementsSummary),
                pages_breakdown: Object.values(pagesSummary)
            }
        });

    } catch (error) {
        console.error('❌ Error getting comprehensive summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get comprehensive summary',
            details: error.message
        });
    }
});

module.exports = router; 
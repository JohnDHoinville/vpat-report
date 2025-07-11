const express = require('express');
const { db } = require('../../database/config');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * Test Session Routes
 * Handles CRUD operations for accessibility test sessions
 */

/**
 * GET /api/sessions
 * List all test sessions with optional filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            project_id,
            status,
            search,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Build query conditions
        let whereClause = '';
        let queryParams = [];
        let paramIndex = 1;

        if (project_id) {
            whereClause += ` AND ts.project_id = $${paramIndex}`;
            queryParams.push(project_id);
            paramIndex++;
        }

        if (status) {
            whereClause += ` AND ts.status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (ts.name ILIKE $${paramIndex} OR ts.description ILIKE $${paramIndex + 1})`;
            queryParams.push(`%${search}%`, `%${search}%`);
            paramIndex += 2;
        }

        // Validate sort column
        const allowedSortColumns = ['name', 'status', 'created_at', 'updated_at'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) 
            FROM test_sessions ts 
            WHERE 1=1 ${whereClause}
        `;
        const countResult = await db.query(countQuery, queryParams);
        const totalItems = parseInt(countResult.rows[0].count);

        // Get sessions
        queryParams.push(limitNum, offset);
        const sessionsQuery = `
            SELECT 
                ts.*,
                p.name as project_name,
                (
                    SELECT COUNT(*) 
                    FROM automated_test_results atr 
                    WHERE atr.test_session_id = ts.id
                ) as result_count,
                (
                    SELECT COUNT(DISTINCT atr.page_id) 
                    FROM automated_test_results atr 
                    WHERE atr.test_session_id = ts.id
                ) as pages_tested
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE 1=1 ${whereClause}
            ORDER BY ts.${sortColumn} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const result = await db.query(sessionsQuery, queryParams);

        res.json({
            data: result.rows,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_items: totalItems,
                total_pages: Math.ceil(totalItems / limitNum),
                has_next: pageNum * limitNum < totalItems,
                has_prev: pageNum > 1
            },
            meta: {
                project_id,
                status,
                search,
                sort: sortColumn,
                order: sortOrder
            }
        });

    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({
            error: 'Failed to fetch sessions',
            message: error.message
        });
    }
});

/**
 * GET /api/sessions/:id
 * Get a specific test session by ID with related data
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { include } = req.query;

        // Get session details
        const sessionQuery = `
            SELECT 
                ts.*,
                p.name as project_name,
                p.primary_url,
                (
                    SELECT COUNT(*) 
                    FROM automated_test_results atr 
                    WHERE atr.test_session_id = ts.id
                ) as result_count,
                (
                    SELECT COUNT(DISTINCT atr.page_id) 
                    FROM automated_test_results atr 
                    WHERE atr.test_session_id = ts.id
                ) as pages_tested,
                (
                    SELECT SUM(atr.violations_count) 
                    FROM automated_test_results atr 
                    WHERE atr.test_session_id = ts.id
                ) as total_violations
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `;

        const result = await db.query(sessionQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                id
            });
        }

        const session = result.rows[0];

        // Include related data if requested
        if (include) {
            const includeItems = include.split(',');

            if (includeItems.includes('results')) {
                const resultsQuery = `
                    SELECT 
                        atr.*,
                        dp.url as page_url,
                        dp.title as page_title
                    FROM automated_test_results atr
                    JOIN discovered_pages dp ON atr.page_id = dp.id
                    WHERE atr.test_session_id = $1
                    ORDER BY atr.executed_at DESC
                `;
                const resultsResult = await db.query(resultsQuery, [id]);
                session.results = resultsResult.rows;
            }

            if (includeItems.includes('pages')) {
                const pagesQuery = `
                    SELECT DISTINCT
                        dp.id,
                        dp.url,
                        dp.title,
                        dp.page_type,
                        (
                            SELECT COUNT(*) 
                            FROM automated_test_results atr 
                            WHERE atr.page_id = dp.id AND atr.test_session_id = $1
                        ) as test_count
                    FROM discovered_pages dp
                    JOIN automated_test_results atr ON dp.id = atr.page_id
                    WHERE atr.test_session_id = $1
                    ORDER BY dp.url
                `;
                const pagesResult = await db.query(pagesQuery, [id]);
                session.pages = pagesResult.rows;
            }

            if (includeItems.includes('summary')) {
                const summaryQuery = `
                    SELECT 
                        atr.tool_name,
                        COUNT(*) as test_count,
                        SUM(atr.violations_count) as total_violations,
                        AVG(atr.violations_count) as avg_violations,
                        MIN(atr.executed_at) as first_test,
                        MAX(atr.executed_at) as last_test
                    FROM automated_test_results atr
                    WHERE atr.test_session_id = $1
                    GROUP BY atr.tool_name
                    ORDER BY test_count DESC
                `;
                const summaryResult = await db.query(summaryQuery, [id]);
                session.tool_summary = summaryResult.rows;
            }
        }

        res.json(session);

    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({
            error: 'Failed to fetch session',
            message: error.message
        });
    }
});

/**
 * POST /api/sessions
 * Create a new test session
 */
router.post('/', async (req, res) => {
    try {
        const {
            project_id,
            name,
            description,
            scope = {},
            test_type = 'full',
            status = 'planning'
        } = req.body;

        // Validate required fields
        if (!project_id) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Project ID is required'
            });
        }

        if (!name) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Session name is required'
            });
        }

        // Verify project exists
        const projectExists = await db.query('SELECT id FROM projects WHERE id = $1', [project_id]);
        if (projectExists.rows.length === 0) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Project not found'
            });
        }

        // Validate status
        const allowedStatuses = ['planning', 'in_progress', 'completed', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Validation failed',
                message: `Status must be one of: ${allowedStatuses.join(', ')}`
            });
        }

        // Validate test type
        const allowedTestTypes = ['full', 'automated_only', 'manual_only', 'followup'];
        if (!allowedTestTypes.includes(test_type)) {
            return res.status(400).json({
                error: 'Validation failed',
                message: `Test type must be one of: ${allowedTestTypes.join(', ')}`
            });
        }

        // Create session
        const id = uuidv4();
        const insertQuery = `
            INSERT INTO test_sessions (
                id, project_id, name, description, scope, test_type, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await db.query(insertQuery, [
            id, project_id, name, description, JSON.stringify(scope), test_type, status
        ]);

        res.status(201).json({
            message: 'Test session created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({
            error: 'Failed to create session',
            message: error.message
        });
    }
});

/**
 * PUT /api/sessions/:id
 * Update an existing test session
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            scope,
            test_type,
            status
        } = req.body;

        // Check if session exists
        const existsQuery = 'SELECT id FROM test_sessions WHERE id = $1';
        const existsResult = await db.query(existsQuery, [id]);

        if (existsResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                id
            });
        }

        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            values.push(name);
            paramIndex++;
        }

        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            values.push(description);
            paramIndex++;
        }

        if (scope !== undefined) {
            updateFields.push(`scope = $${paramIndex}`);
            values.push(JSON.stringify(scope));
            paramIndex++;
        }

        if (test_type !== undefined) {
            const allowedTestTypes = ['full', 'automated_only', 'manual_only', 'followup'];
            if (!allowedTestTypes.includes(test_type)) {
                return res.status(400).json({
                    error: 'Validation failed',
                    message: `Test type must be one of: ${allowedTestTypes.join(', ')}`
                });
            }

            updateFields.push(`test_type = $${paramIndex}`);
            values.push(test_type);
            paramIndex++;
        }

        if (status !== undefined) {
            const allowedStatuses = ['planning', 'in_progress', 'completed', 'cancelled'];
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    error: 'Validation failed',
                    message: `Status must be one of: ${allowedStatuses.join(', ')}`
                });
            }

            updateFields.push(`status = $${paramIndex}`);
            values.push(status);
            paramIndex++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'No valid fields provided for update'
            });
        }

        // Add updated_at and id to the query
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const updateQuery = `
            UPDATE test_sessions 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(updateQuery, values);

        res.json({
            message: 'Session updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({
            error: 'Failed to update session',
            message: error.message
        });
    }
});

/**
 * POST /api/sessions/:id/pause
 * Pause a running test session
 */
router.post('/:id/pause', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if session exists and is in progress
        const checkQuery = `
            SELECT id, name, status
            FROM test_sessions 
            WHERE id = $1
        `;
        const checkResult = await db.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                id
            });
        }

        const session = checkResult.rows[0];

        if (session.status !== 'in_progress') {
            return res.status(400).json({
                error: 'Can only pause sessions that are in progress',
                current_status: session.status
            });
        }

        // Update session status to paused and store pause timestamp
        const pauseQuery = `
            UPDATE test_sessions 
            SET status = 'paused', 
                updated_at = CURRENT_TIMESTAMP,
                paused_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(pauseQuery, [id]);

        // TODO: Signal any running test processes to pause
        // This would integrate with the testing service to gracefully pause ongoing tests

        res.json({
            message: 'Session paused successfully',
            session: result.rows[0]
        });

    } catch (error) {
        console.error('Error pausing session:', error);
        res.status(500).json({
            error: 'Failed to pause session',
            message: error.message
        });
    }
});

/**
 * POST /api/sessions/:id/resume
 * Resume a paused test session
 */
router.post('/:id/resume', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if session exists and is paused
        const checkQuery = `
            SELECT id, name, status, paused_at
            FROM test_sessions 
            WHERE id = $1
        `;
        const checkResult = await db.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                id
            });
        }

        const session = checkResult.rows[0];

        if (session.status !== 'paused') {
            return res.status(400).json({
                error: 'Can only resume sessions that are paused',
                current_status: session.status
            });
        }

        // Update session status to in_progress and clear pause timestamp
        const resumeQuery = `
            UPDATE test_sessions 
            SET status = 'in_progress', 
                updated_at = CURRENT_TIMESTAMP,
                paused_at = NULL,
                resumed_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(resumeQuery, [id]);

        // TODO: Signal testing service to resume from where it left off
        // This would integrate with the testing service to continue testing

        res.json({
            message: 'Session resumed successfully',
            session: result.rows[0]
        });

    } catch (error) {
        console.error('Error resuming session:', error);
        res.status(500).json({
            error: 'Failed to resume session',
            message: error.message
        });
    }
});

/**
 * DELETE /api/sessions/:id
 * Delete a test session and all related data
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if session exists and get related data count
        const checkQuery = `
            SELECT 
                ts.name,
                p.name as project_name,
                (SELECT COUNT(*) FROM automated_test_results WHERE test_session_id = ts.id) as result_count
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `;
        const checkResult = await db.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                id
            });
        }

        const session = checkResult.rows[0];

        // Delete session (cascading will handle related data)
        const deleteQuery = 'DELETE FROM test_sessions WHERE id = $1';
        await db.query(deleteQuery, [id]);

        res.json({
            message: 'Session deleted successfully',
            deleted: {
                id,
                name: session.name,
                project_name: session.project_name,
                results_deleted: session.result_count
            }
        });

    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({
            error: 'Failed to delete session',
            message: error.message
        });
    }
});

/**
 * GET /api/sessions/:id/results
 * Get all test results for a specific session
 */
router.get('/:id/results', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            page = 1,
            limit = 50,
            tool_name,
            sort = 'executed_at',
            order = 'DESC'
        } = req.query;

        // Check if session exists
        const sessionExists = await db.query('SELECT id FROM test_sessions WHERE id = $1', [id]);
        if (sessionExists.rows.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                id
            });
        }

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Build query
        let whereClause = 'WHERE atr.test_session_id = $1';
        let queryParams = [id];
        let paramIndex = 2;

        if (tool_name) {
            whereClause += ` AND atr.tool_name = $${paramIndex}`;
            queryParams.push(tool_name);
            paramIndex++;
        }

        // Validate sort
        const allowedSortColumns = ['tool_name', 'violations_count', 'executed_at'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'executed_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM automated_test_results atr ${whereClause}`;
        const countResult = await db.query(countQuery, queryParams);
        const totalItems = parseInt(countResult.rows[0].count);

        // Get results
        queryParams.push(limitNum, offset);
        const resultsQuery = `
            SELECT 
                atr.*,
                dp.url as page_url,
                dp.title as page_title,
                dp.page_type
            FROM automated_test_results atr
            JOIN discovered_pages dp ON atr.page_id = dp.id
            ${whereClause}
            ORDER BY atr.${sortColumn} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const result = await db.query(resultsQuery, queryParams);

        res.json({
            data: result.rows,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_items: totalItems,
                total_pages: Math.ceil(totalItems / limitNum),
                has_next: pageNum * limitNum < totalItems,
                has_prev: pageNum > 1
            }
        });

    } catch (error) {
        console.error('Error fetching session results:', error);
        res.status(500).json({
            error: 'Failed to fetch session results',
            message: error.message
        });
    }
});

/**
 * GET /api/sessions/:id/summary
 * Get test session summary with statistics
 */
router.get('/:id/summary', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if session exists
        const sessionQuery = `
            SELECT 
                ts.*,
                p.name as project_name
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `;
        const sessionResult = await db.query(sessionQuery, [id]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                id
            });
        }

        const session = sessionResult.rows[0];

        // Get summary statistics
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_tests,
                COUNT(DISTINCT page_id) as pages_tested,
                COUNT(DISTINCT tool_name) as tools_used,
                SUM(violations_count) as total_violations,
                AVG(violations_count) as avg_violations_per_test,
                MIN(executed_at) as first_test,
                MAX(executed_at) as last_test
            FROM automated_test_results
            WHERE test_session_id = $1
        `;
        const summaryResult = await db.query(summaryQuery, [id]);

        // Get tool breakdown
        const toolBreakdownQuery = `
            SELECT 
                tool_name,
                COUNT(*) as test_count,
                SUM(violations_count) as violations,
                AVG(violations_count) as avg_violations
            FROM automated_test_results
            WHERE test_session_id = $1
            GROUP BY tool_name
            ORDER BY test_count DESC
        `;
        const toolBreakdownResult = await db.query(toolBreakdownQuery, [id]);

        // Get page breakdown
        const pageBreakdownQuery = `
            SELECT 
                dp.url,
                dp.title,
                dp.page_type,
                COUNT(atr.id) as test_count,
                SUM(atr.violations_count) as violations
            FROM discovered_pages dp
            JOIN automated_test_results atr ON dp.id = atr.page_id
            WHERE atr.test_session_id = $1
            GROUP BY dp.id, dp.url, dp.title, dp.page_type
            ORDER BY violations DESC, test_count DESC
        `;
        const pageBreakdownResult = await db.query(pageBreakdownQuery, [id]);

        res.json({
            session: {
                id: session.id,
                name: session.name,
                project_name: session.project_name,
                status: session.status,
                test_type: session.test_type,
                created_at: session.created_at
            },
            summary: summaryResult.rows[0],
            tool_breakdown: toolBreakdownResult.rows,
            page_breakdown: pageBreakdownResult.rows.slice(0, 10) // Top 10 pages
        });

    } catch (error) {
        console.error('Error fetching session summary:', error);
        res.status(500).json({
            error: 'Failed to fetch session summary',
            message: error.message
        });
    }
});

module.exports = router; 
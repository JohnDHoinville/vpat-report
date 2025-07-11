const express = require('express');
const { db } = require('../../database/config');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const SiteDiscoveryService = require('../../database/services/site-discovery-service');
const SimpleTestingService = require('../../database/services/simple-testing-service');

const router = express.Router();

/**
 * Project Routes
 * Handles CRUD operations for accessibility testing projects
 */

/**
 * GET /api/projects
 * List all projects with optional filtering and pagination
 */
router.get('/', optionalAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            status,
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

        if (search) {
            whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1})`;
            queryParams.push(`%${search}%`, `%${search}%`);
            paramIndex += 2;
        }

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        // Validate sort column
        const allowedSortColumns = ['name', 'status', 'created_at', 'updated_at'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) 
            FROM projects 
            WHERE 1=1 ${whereClause}
        `;
        const countResult = await db.query(countQuery, queryParams);
        const totalItems = parseInt(countResult.rows[0].count);

        // Get projects
        queryParams.push(limitNum, offset);
        const projectsQuery = `
            SELECT 
                id,
                name,
                description,
                client_name,
                primary_url,
                status,
                created_at,
                updated_at,
                (
                    SELECT COUNT(*) 
                    FROM test_sessions ts 
                    WHERE ts.project_id = projects.id
                ) as session_count
            FROM projects 
            WHERE 1=1 ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const result = await db.query(projectsQuery, queryParams);

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
                search,
                status,
                sort: sortColumn,
                order: sortOrder
            }
        });

    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            error: 'Failed to fetch projects',
            message: error.message
        });
    }
});

/**
 * GET /api/projects/:id
 * Get a specific project by ID with related data
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { include } = req.query;

        // Get project details
        const projectQuery = `
            SELECT 
                p.*,
                (
                    SELECT COUNT(*) 
                    FROM test_sessions ts 
                    WHERE ts.project_id = p.id
                ) as session_count,
                (
                    SELECT COUNT(*) 
                    FROM test_sessions ts 
                    JOIN automated_test_results atr ON ts.id = atr.test_session_id
                    WHERE ts.project_id = p.id
                ) as total_test_results
            FROM projects p 
            WHERE p.id = $1
        `;

        const result = await db.query(projectQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
                id
            });
        }

        const project = result.rows[0];

        // Include related data if requested
        if (include && include.includes('sessions')) {
            const sessionsQuery = `
                SELECT 
                    ts.*,
                    (
                        SELECT COUNT(*) 
                        FROM automated_test_results atr 
                        WHERE atr.test_session_id = ts.id
                    ) as result_count
                FROM test_sessions ts 
                WHERE ts.project_id = $1
                ORDER BY ts.created_at DESC
            `;
            const sessionResult = await db.query(sessionsQuery, [id]);
            project.sessions = sessionResult.rows;
        }

        res.json(project);

    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            error: 'Failed to fetch project',
            message: error.message
        });
    }
});

/**
 * POST /api/projects
 * Create a new project (requires authentication)
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            name,
            description,
            client_name,
            primary_url,
            status = 'active'
        } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Project name is required'
            });
        }

        if (!primary_url) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Primary URL is required'
            });
        }

        // Validate URL format
        try {
            new URL(primary_url);
        } catch (error) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Invalid primary URL format'
            });
        }

        // Validate status
        const allowedStatuses = ['active', 'completed', 'paused', 'archived'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Validation failed',
                message: `Status must be one of: ${allowedStatuses.join(', ')}`
            });
        }

        // Create project
        const id = uuidv4();
        const insertQuery = `
            INSERT INTO projects (
                id, name, description, client_name, primary_url, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await db.query(insertQuery, [
            id, name, description, client_name, primary_url, status, req.user.id
        ]);

        res.status(201).json({
            message: 'Project created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating project:', error);
        
        // Handle unique constraint violations
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Project already exists',
                message: 'A project with this name or URL already exists'
            });
        }

        res.status(500).json({
            error: 'Failed to create project',
            message: error.message
        });
    }
});

/**
 * PUT /api/projects/:id
 * Update an existing project (requires authentication)
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            client_name,
            primary_url,
            status
        } = req.body;

        // Check if project exists
        const existsQuery = 'SELECT id FROM projects WHERE id = $1';
        const existsResult = await db.query(existsQuery, [id]);

        if (existsResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
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

        if (client_name !== undefined) {
            updateFields.push(`client_name = $${paramIndex}`);
            values.push(client_name);
            paramIndex++;
        }

        if (primary_url !== undefined) {
            // Validate URL format
            try {
                new URL(primary_url);
            } catch (error) {
                return res.status(400).json({
                    error: 'Validation failed',
                    message: 'Invalid primary URL format'
                });
            }

            updateFields.push(`primary_url = $${paramIndex}`);
            values.push(primary_url);
            paramIndex++;
        }

        if (status !== undefined) {
            const allowedStatuses = ['active', 'completed', 'paused', 'archived'];
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
            UPDATE projects 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(updateQuery, values);

        res.json({
            message: 'Project updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({
            error: 'Failed to update project',
            message: error.message
        });
    }
});

/**
 * DELETE /api/projects/:id
 * Delete a project and all related data (requires authentication)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if project exists and get related data count
        const checkQuery = `
            SELECT 
                p.name,
                (SELECT COUNT(*) FROM test_sessions WHERE project_id = p.id) as session_count
            FROM projects p 
            WHERE p.id = $1
        `;
        const checkResult = await db.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
                id
            });
        }

        const project = checkResult.rows[0];

        // Delete project (cascading will handle related data)
        const deleteQuery = 'DELETE FROM projects WHERE id = $1';
        await db.query(deleteQuery, [id]);

        res.json({
            message: 'Project deleted successfully',
            deleted: {
                id,
                name: project.name,
                sessions_deleted: project.session_count
            }
        });

    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({
            error: 'Failed to delete project',
            message: error.message
        });
    }
});

/**
 * GET /api/projects/:id/sessions
 * Get all test sessions for a specific project
 */
router.get('/:id/sessions', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            page = 1,
            limit = 50,
            status,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        // Check if project exists
        const projectExists = await db.query('SELECT id FROM projects WHERE id = $1', [id]);
        if (projectExists.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
                id
            });
        }

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Build query
        let whereClause = 'WHERE project_id = $1';
        let queryParams = [id];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        // Validate sort
        const allowedSortColumns = ['name', 'status', 'created_at', 'updated_at'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM test_sessions ${whereClause}`;
        const countResult = await db.query(countQuery, queryParams);
        const totalItems = parseInt(countResult.rows[0].count);

        // Get sessions
        queryParams.push(limitNum, offset);
        const sessionsQuery = `
            SELECT 
                ts.*,
                (
                    SELECT COUNT(*) 
                    FROM automated_test_results atr 
                    WHERE atr.test_session_id = ts.id
                ) as result_count
            FROM test_sessions ts 
            ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder}
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
            }
        });

    } catch (error) {
        console.error('Error fetching project sessions:', error);
        res.status(500).json({
            error: 'Failed to fetch project sessions',
            message: error.message
        });
    }
});

/**
 * POST /api/projects/:id/discoveries
 * Start site discovery for a project (optionally authenticated)
 */
router.post('/:id/discoveries', optionalAuth, async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const {
            primary_url,
            maxDepth = 3,
            maxPages = 100,
            respectRobots = true,
            timeout = 10000
        } = req.body;

        // Check if project exists
        const projectExists = await db.query('SELECT primary_url FROM projects WHERE id = $1', [projectId]);
        if (projectExists.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
                id: projectId
            });
        }

        const urlToUse = primary_url || projectExists.rows[0].primary_url;

        // Get WebSocket service from app
        const wsService = req.app.get('wsService');
        
        // Initialize discovery service with WebSocket
        const discoveryService = new SiteDiscoveryService(wsService);

        // Start discovery
        const discovery = await discoveryService.startDiscovery(projectId, urlToUse, {
            maxDepth,
            maxPages,
            respectRobots,
            timeout
        });

        res.status(201).json({
            message: 'Site discovery started',
            discovery
        });

    } catch (error) {
        console.error('Error starting discovery:', error);
        res.status(500).json({
            error: 'Failed to start discovery',
            message: error.message
        });
    }
});

/**
 * GET /api/projects/:id/discoveries
 * Get discovery sessions for a project
 */
router.get('/:id/discoveries', async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const { status, limit = 10 } = req.query;

        // Get WebSocket service from app
        const wsService = req.app.get('wsService');
        
        // Initialize discovery service
        const discoveryService = new SiteDiscoveryService(wsService);

        // Get discoveries
        const discoveries = await discoveryService.listDiscoveries(projectId, {
            status,
            limit: parseInt(limit)
        });

        res.json({
            data: discoveries
        });

    } catch (error) {
        console.error('Error fetching discoveries:', error);
        res.status(500).json({
            error: 'Failed to fetch discoveries',
            message: error.message
        });
    }
});

/**
 * DELETE /api/projects/:id/discoveries/:discoveryId
 * Delete a site discovery session and all its discovered pages (requires authentication)
 */
router.delete('/:id/discoveries/:discoveryId', authenticateToken, async (req, res) => {
    try {
        const { id: projectId, discoveryId } = req.params;

        // Check if project exists and discovery belongs to it
        const checkQuery = `
            SELECT sd.domain, sd.primary_url, sd.total_pages_found
            FROM site_discovery sd 
            WHERE sd.id = $1 AND sd.project_id = $2
        `;
        const checkResult = await db.query(checkQuery, [discoveryId, projectId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Discovery not found or does not belong to this project',
                discoveryId,
                projectId
            });
        }

        const discovery = checkResult.rows[0];

        // Get WebSocket service from app
        const wsService = req.app.get('wsService');
        
        // Initialize discovery service
        const discoveryService = new SiteDiscoveryService(wsService);

        // Delete discovery and all its pages
        const deleted = await discoveryService.deleteDiscovery(discoveryId);

        if (!deleted) {
            return res.status(404).json({
                error: 'Discovery not found',
                discoveryId
            });
        }

        res.json({
            message: 'Discovery deleted successfully',
            deleted: {
                id: discoveryId,
                domain: discovery.domain,
                primary_url: discovery.primary_url,
                pages_deleted: discovery.total_pages_found
            }
        });

    } catch (error) {
        console.error('Error deleting discovery:', error);
        res.status(500).json({
            error: 'Failed to delete discovery',
            message: error.message
        });
    }
});

/**
 * GET /api/projects/:id/discoveries/:discoveryId/pages
 * Get all discovered pages for a specific discovery session
 */
router.get('/:id/discoveries/:discoveryId/pages', async (req, res) => {
    try {
        const { id: projectId, discoveryId } = req.params;
        const {
            page = 1,
            limit = 100,
            search,
            page_type,
            sort = 'url',
            order = 'ASC'
        } = req.query;

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(500, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Build query conditions
        let whereClause = 'WHERE dp.discovery_id = $1 AND sd.project_id = $2';
        let queryParams = [discoveryId, projectId];
        let paramIndex = 3;

        if (search) {
            whereClause += ` AND (dp.url ILIKE $${paramIndex} OR dp.title ILIKE $${paramIndex + 1})`;
            queryParams.push(`%${search}%`, `%${search}%`);
            paramIndex += 2;
        }

        if (page_type) {
            whereClause += ` AND dp.page_type = $${paramIndex}`;
            queryParams.push(page_type);
            paramIndex++;
        }

        // Validate sort column
        const allowedSortColumns = ['url', 'title', 'page_type', 'discovered_at', 'depth'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'url';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) 
            FROM discovered_pages dp 
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            ${whereClause}
        `;
        const countResult = await db.query(countQuery, queryParams);
        const totalItems = parseInt(countResult.rows[0].count);

        // Get pages
        queryParams.push(limitNum, offset);
        const pagesQuery = `
            SELECT 
                dp.*,
                sd.primary_url as site_primary_url,
                sd.domain as site_domain,
                sd.status as discovery_status,
                (
                    SELECT COUNT(*) 
                    FROM automated_test_results atr 
                    WHERE atr.page_id = dp.id
                ) as test_count
            FROM discovered_pages dp
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            ${whereClause}
            ORDER BY dp.${sortColumn} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const result = await db.query(pagesQuery, queryParams);

        // Also get discovery info
        const discoveryQuery = `
            SELECT id, domain, primary_url, status, total_pages_found, started_at, completed_at
            FROM site_discovery 
            WHERE id = $1 AND project_id = $2
        `;
        const discoveryResult = await db.query(discoveryQuery, [discoveryId, projectId]);

        if (discoveryResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Discovery not found',
                discoveryId,
                projectId
            });
        }

        res.json({
            discovery: discoveryResult.rows[0],
            pages: result.rows,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_items: totalItems,
                total_pages: Math.ceil(totalItems / limitNum),
                has_next: pageNum * limitNum < totalItems,
                has_prev: pageNum > 1
            },
            meta: {
                search,
                page_type,
                sort: sortColumn,
                order: sortOrder
            }
        });

    } catch (error) {
        console.error('Error fetching discovery pages:', error);
        res.status(500).json({
            error: 'Failed to fetch discovery pages',
            message: error.message
        });
    }
});

/**
 * POST /api/projects/:id/test-sessions
 * Start automated testing for a project (requires authentication)
 */
router.post('/:id/test-sessions', authenticateToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const {
            name,
            description,
            testTypes = ['axe', 'pa11y'],
            maxPages = 50
        } = req.body;

        // Get WebSocket service from app
        const wsService = req.app.get('wsService');
        
        // Initialize testing service with WebSocket
        const testingService = new SimpleTestingService(wsService);

        // Create test session
        const session = await testingService.createTestSession(projectId, {
            name: name || `Automated Test - ${new Date().toLocaleDateString()}`,
            description,
            session_type: 'automated'
        });

        // Start automated testing
        await testingService.startAutomatedTesting(session.id, {
            testTypes,
            maxPages
        });

        res.status(201).json({
            message: 'Automated testing started',
            session
        });

    } catch (error) {
        console.error('Error starting automated testing:', error);
        res.status(500).json({
            error: 'Failed to start automated testing',
            message: error.message
        });
    }
});

/**
 * GET /api/projects/:id/websocket-stats
 * Get WebSocket connection statistics for a project (requires authentication)
 */
router.get('/:id/websocket-stats', authenticateToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;

        // Get WebSocket service from app
        const wsService = req.app.get('wsService');
        
        if (!wsService) {
            return res.status(503).json({
                error: 'WebSocket service not available'
            });
        }

        const stats = wsService.getStats();
        const projectUsers = wsService.getProjectUsers(projectId);

        res.json({
            project_id: projectId,
            connected_users: projectUsers.length,
            user_ids: projectUsers,
            global_stats: stats
        });

    } catch (error) {
        console.error('Error fetching WebSocket stats:', error);
        res.status(500).json({
            error: 'Failed to fetch WebSocket stats',
            message: error.message
        });
    }
});

module.exports = router; 
const express = require('express');
const { db } = require('../../database/config');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const SiteDiscoveryService = require('../../database/services/site-discovery-service');
const SimpleTestingService = require('../../database/services/simple-testing-service');
const { orchestrator } = require('../../scripts/unified-test-orchestrator');

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
 * Delete a project and all related data including new audit trail tables (requires authentication)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { confirm_permanent = false } = req.query;

        // Check if project exists and get comprehensive data count
        const checkQuery = `
            SELECT 
                p.name,
                p.primary_url,
                (SELECT COUNT(*) FROM test_sessions WHERE project_id = p.id) as session_count,
                (SELECT COUNT(*) FROM test_instances WHERE session_id IN 
                    (SELECT id FROM test_sessions WHERE project_id = p.id)) as test_instance_count,
                (SELECT COUNT(*) FROM automated_test_results WHERE test_session_id IN 
                    (SELECT id FROM test_sessions WHERE project_id = p.id)) as automated_result_count,
                (SELECT COUNT(*) FROM discovered_pages WHERE discovery_id IN 
                    (SELECT id FROM site_discovery WHERE project_id = p.id)) as discovered_page_count
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

        // Require explicit confirmation for project deletion (impacts lots of data)
        if (confirm_permanent !== 'true') {
            return res.status(400).json({
                error: 'Project deletion requires explicit confirmation',
                project_info: {
                    name: project.name,
                    primary_url: project.primary_url,
                    sessions: project.session_count,
                    test_instances: project.test_instance_count,
                    automated_results: project.automated_result_count,
                    discovered_pages: project.discovered_page_count
                },
                warning: 'This will permanently delete ALL project data including sessions, test results, audit trails, and discoveries',
                required_parameter: 'confirm_permanent=true'
            });
        }

        console.log(`🗑️ PROJECT DELETION: Starting cascade delete for project "${project.name}" (${id})`);
        
        await db.query('BEGIN');
        
        try {
            // Delete in proper order to handle foreign key constraints and new audit trail tables
            
            // 1. Delete audit trail data for all test instances in this project
            console.log('🗑️ Deleting audit trail data...');
            await db.query(`
                DELETE FROM test_instance_audit_log 
                WHERE test_instance_id IN (
                    SELECT ti.id FROM test_instances ti
                    JOIN test_sessions ts ON ti.session_id = ts.id
                    WHERE ts.project_id = $1
                )
            `, [id]);
            
            // 2. Delete evidence repository entries
            console.log('🗑️ Deleting evidence repository...');
            await db.query(`
                DELETE FROM evidence_repository 
                WHERE test_instance_id IN (
                    SELECT ti.id FROM test_instances ti
                    JOIN test_sessions ts ON ti.session_id = ts.id
                    WHERE ts.project_id = $1
                )
            `, [id]);
            
            // 3. Delete automated result review queue
            console.log('🗑️ Deleting review queue entries...');
            await db.query(`
                DELETE FROM automated_result_review_queue 
                WHERE test_instance_id IN (
                    SELECT ti.id FROM test_instances ti
                    JOIN test_sessions ts ON ti.session_id = ts.id
                    WHERE ts.project_id = $1
                )
            `, [id]);
            
            // 4. Delete violations (they reference test results)
            console.log('🗑️ Deleting violations...');
            await db.query(`
                DELETE FROM violations 
                WHERE automated_result_id IN (
                    SELECT id FROM automated_test_results WHERE test_session_id IN 
                        (SELECT id FROM test_sessions WHERE project_id = $1)
                ) OR manual_result_id IN (
                    SELECT id FROM manual_test_results WHERE test_session_id IN 
                        (SELECT id FROM test_sessions WHERE project_id = $1)
                )
            `, [id]);
            
            // 5. Delete frontend test runs
            console.log('🗑️ Deleting frontend test runs...');
            await db.query(`
                DELETE FROM frontend_test_runs 
                WHERE test_session_id IN (
                    SELECT id FROM test_sessions WHERE project_id = $1
                )
            `, [id]);
            
            // 6. Delete automated test results
            console.log('🗑️ Deleting automated test results...');
            const deleteAutomatedResults = await db.query(`
                DELETE FROM automated_test_results 
                WHERE test_session_id IN (
                    SELECT id FROM test_sessions WHERE project_id = $1
                )
            `, [id]);
            
            // 7. Delete manual test results
            console.log('🗑️ Deleting manual test results...');
            await db.query(`
                DELETE FROM manual_test_results 
                WHERE test_session_id IN (
                    SELECT id FROM test_sessions WHERE project_id = $1
                )
            `, [id]);
            
            // 8. Delete test instances
            console.log('🗑️ Deleting test instances...');
            const deleteTestInstances = await db.query(`
                DELETE FROM test_instances 
                WHERE session_id IN (
                    SELECT id FROM test_sessions WHERE project_id = $1
                )
            `, [id]);
            
            // 9. Delete test sessions
            console.log('🗑️ Deleting test sessions...');
            const deleteSessions = await db.query('DELETE FROM test_sessions WHERE project_id = $1', [id]);
            
            // 10. Delete discovered pages (they reference site discoveries)
            console.log('🗑️ Deleting discovered pages...');
            const deletePages = await db.query(`
                DELETE FROM discovered_pages 
                WHERE discovery_id IN (
                    SELECT id FROM site_discovery WHERE project_id = $1
                )
            `, [id]);
            
            // 11. Delete site discoveries
            console.log('🗑️ Deleting site discoveries...');
            const deleteDiscoveries = await db.query('DELETE FROM site_discovery WHERE project_id = $1', [id]);
            
            // 12. Finally delete the project
            console.log('🗑️ Deleting project...');
            const deleteProject = await db.query('DELETE FROM projects WHERE id = $1', [id]);
            
            await db.query('COMMIT');
            
            console.log(`✅ PROJECT DELETION COMPLETE: "${project.name}" and all related data deleted`);
            
        } catch (deleteError) {
            await db.query('ROLLBACK');
            console.error(`❌ PROJECT DELETION FAILED for project ${id}:`, deleteError);
            throw deleteError;
        }

        res.json({
            message: 'Project deleted successfully',
            deleted_data: {
                id,
                name: project.name,
                primary_url: project.primary_url,
                sessions_deleted: deleteSessions.rowCount,
                test_instances_deleted: deleteTestInstances.rowCount,
                automated_results_deleted: deleteAutomatedResults.rowCount,
                discovered_pages_deleted: deletePages.rowCount,
                discoveries_deleted: deleteDiscoveries.rowCount,
                project_deleted: deleteProject.rowCount > 0
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
            excludePublicPages = false,  // Skip public pages, discover only authenticated content
            dynamicAuth = false  // Prompt for credentials when login page is encountered
        } = req.body;
        
        // Debug: Log the actual request parameters
        console.log(`🔍 Discovery API request: excludePublicPages=${excludePublicPages}, dynamicAuth=${dynamicAuth}`);

        // Validate project exists
        const project = await db.query(
            'SELECT id, name FROM projects WHERE id = $1',
            [projectId]
        );

        if (project.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Start discovery using site discovery service
        const discoveryId = await SiteDiscoveryService.startDiscovery(
            projectId,
            excludePublicPages,
            dynamicAuth
        );

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

        // Delete discovery and all its pages using enhanced delete function
        const deleteResult = await discoveryService.deleteDiscovery(discoveryId);

        if (!deleteResult.success) {
            return res.status(500).json({
                success: false,
                error: deleteResult.error || 'Failed to delete discovery',
                message: deleteResult.message || 'Discovery deletion failed',
                discoveryId
            });
        }

        res.json({
            success: true,
            message: deleteResult.message,
            deleted: {
                id: discoveryId,
                domain: discovery.domain,
                primary_url: discovery.primary_url,
                pages_deleted: deleteResult.deleted_pages,
                test_instances_cleaned: deleteResult.deleted_instances,
                results_cleaned: deleteResult.deleted_results
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

// API endpoint to handle dynamic authentication responses
router.post('/api/projects/:id/discoveries/:discoveryId/auth-response', async (req, res) => {
    try {
        const { id: projectId, discoveryId } = req.params;
        const { promptId, credentials } = req.body;

        // Get the dynamic auth service
        const DynamicAuthService = require('../../database/services/dynamic-auth-service');
        const dynamicAuthService = new DynamicAuthService(req.pool, req.wsService);

        // Handle the auth response
        await dynamicAuthService.handleAuthResponse(discoveryId, promptId, credentials);

        res.json({
            message: 'Authentication response processed',
            promptId,
            discoveryId
        });

    } catch (error) {
        console.error('Error processing auth response:', error);
        res.status(500).json({
            error: 'Failed to process authentication response',
            message: error.message
        });
    }
});

/**
 * POST /api/projects/:id/discoveries/:discoveryId/recover
 * Recover a stuck discovery session (requires authentication)
 */
router.post('/:id/discoveries/:discoveryId/recover', optionalAuth, async (req, res) => {
    try {
        const { id: projectId, discoveryId } = req.params;

        // Check if project exists and discovery belongs to it
        const checkQuery = `
            SELECT sd.domain, sd.primary_url, sd.status
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

        // Get WebSocket service from app
        const wsService = req.app.get('wsService');
        
        // Initialize discovery service
        const discoveryService = new SiteDiscoveryService(wsService);

        // Attempt recovery
        const result = await discoveryService.recoverStuckDiscovery(discoveryId);

        res.json({
            success: result.success,
            result,
            message: result.message
        });

    } catch (error) {
        console.error('Error recovering discovery:', error);
        res.status(500).json({
            error: 'Failed to recover discovery',
            message: error.message
        });
    }
});

/**
 * POST /api/projects/:id/discoveries/recover-all
 * Recover all stuck discoveries in a project
 */
router.post('/:id/discoveries/recover-all', optionalAuth, async (req, res) => {
    try {
        const { id: projectId } = req.params;

        // Check if project exists
        const projectExists = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
        if (projectExists.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
                projectId
            });
        }

        // Get WebSocket service from app
        const wsService = req.app.get('wsService');
        
        // Initialize discovery service
        const discoveryService = new SiteDiscoveryService(wsService);

        // Recover all stuck discoveries
        const result = await discoveryService.recoverAllStuckDiscoveries(projectId);

        res.json({
            success: true,
            result,
            message: `Attempted recovery on ${result.recovered} discoveries`
        });

    } catch (error) {
        console.error('Error recovering all discoveries:', error);
        res.status(500).json({
            error: 'Failed to recover discoveries',
            message: error.message
        });
    }
});

/**
 * GET /api/projects/:id/discoveries/pending
 * List all pending/stuck discoveries for debugging
 */
router.get('/:id/discoveries/pending', optionalAuth, async (req, res) => {
    try {
        const { id: projectId } = req.params;

        // Check if project exists
        const projectExists = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
        if (projectExists.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
                projectId
            });
        }

        // Get WebSocket service from app
        const wsService = req.app.get('wsService');
        
        // Initialize discovery service
        const discoveryService = new SiteDiscoveryService(wsService);

        // List pending discoveries
        const pendingDiscoveries = await discoveryService.listPendingDiscoveries();
        
        // Filter to current project
        const projectPendingDiscoveries = pendingDiscoveries.filter(d => d.project_id === projectId);

        res.json({
            success: true,
            discoveries: projectPendingDiscoveries,
            total: projectPendingDiscoveries.length
        });

    } catch (error) {
        console.error('Error listing pending discoveries:', error);
        res.status(500).json({
            error: 'Failed to list pending discoveries',
            message: error.message
        });
    }
});

/**
 * POST /api/projects/:id/discoveries/cleanup
 * Clean up orphaned discovery data
 */
router.post('/:id/discoveries/cleanup', optionalAuth, async (req, res) => {
    try {
        const { id: projectId } = req.params;

        // Check if project exists
        const projectExists = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
        if (projectExists.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
                projectId
            });
        }

        // Get WebSocket service from app
        const wsService = req.app.get('wsService');
        
        // Initialize discovery service
        const discoveryService = new SiteDiscoveryService(wsService);

        // Clean up orphaned data
        const result = await discoveryService.cleanupOrphanedData();

        res.json({
            success: true,
            result,
            message: result.message
        });

    } catch (error) {
        console.error('Error cleaning up discovery data:', error);
        res.status(500).json({
            error: 'Failed to cleanup discovery data',
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
            maxPages = 50,
            auth_config_id,
            auth_role,
            auth_description,
            session_id,
            target_requirements,
            scope
        } = req.body;

        // Get WebSocket service from app
        const wsService = req.app.get('wsService');
        
        // Initialize testing service with WebSocket
        const testingService = new SimpleTestingService(wsService);

        // Create test session with authentication configuration
        const session = await testingService.createTestSession(projectId, {
            name: name || `Automated Test - ${new Date().toLocaleDateString()}`,
            description,
            session_type: 'automated',
            scope: scope || { testType: 'automated', tools: testTypes || ['axe', 'pa11y'] },
            auth_config_id,
            auth_role,
            auth_description
        });

        // Start automated testing with authentication
        await testingService.startAutomatedTesting(session.id, {
            testTypes,
            maxPages,
            auth_config_id,
            auth_role
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
 * POST /api/projects/:id/comprehensive-testing
 * Start comprehensive testing (frontend + backend) for a project using UnifiedTestOrchestrator
 */
router.post('/:id/comprehensive-testing', authenticateToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const {
            sessionName,
            description,
            testingApproach = 'hybrid',
            includeFrontend = true,
            includeBackend = true,
            includeManual = false,
            testTypes = ['basic', 'keyboard', 'screen-reader', 'form', 'mobile'],
            browsers = ['chromium', 'firefox', 'webkit'],
            backendTools = ['axe', 'pa11y', 'lighthouse'],
            maxPages = 50,
            viewports = ['desktop', 'tablet', 'mobile'],
            authConfigId
        } = req.body;

        // Verify project exists
        const projectExists = await db.query('SELECT id, name, primary_url FROM projects WHERE id = $1', [projectId]);
        if (projectExists.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
                id: projectId
            });
        }

        const project = projectExists.rows[0];

        console.log(`🚀 Starting comprehensive testing for project: ${project.name}`);

        // Configure orchestration
        const testConfig = {
            sessionName: sessionName || `Comprehensive Test - ${project.name} - ${new Date().toLocaleDateString()}`,
            description: description || `Automated frontend and backend accessibility testing for ${project.name}`,
            testingApproach,
            includeFrontend,
            includeBackend,
            includeManual,
            testTypes,
            browsers,
            backendTools,
            maxPages,
            viewports,
            projectId,
            initiatedBy: req.user?.username || 'api-user',
            authConfigId
        };

        // Start comprehensive testing orchestration
        const orchestrationPromise = orchestrator.orchestrateComplianceTest(projectId, testConfig);

        // Don't wait for completion - return immediate response
        res.status(202).json({
            success: true,
            message: 'Comprehensive testing initiated successfully',
            project: {
                id: projectId,
                name: project.name,
                primary_url: project.primary_url
            },
            testConfiguration: {
                approach: testingApproach,
                includeFrontend,
                includeBackend,
                includeManual,
                frontendTests: includeFrontend ? { testTypes, browsers, viewports } : null,
                backendTests: includeBackend ? { tools: backendTools, maxPages } : null
            },
            status: 'initiated',
            message_details: 'Testing orchestration started. Monitor progress via WebSocket or session endpoints.'
        });

        // Handle orchestration completion in background
        orchestrationPromise.then(result => {
            console.log(`✅ Comprehensive testing completed for project ${projectId}:`, result.summary);
        }).catch(error => {
            console.error(`❌ Comprehensive testing failed for project ${projectId}:`, error);
        });

    } catch (error) {
        console.error('Error starting comprehensive testing:', error);
        res.status(500).json({
            error: 'Failed to start comprehensive testing',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * POST /api/projects/:id/playwright-testing
 * Start Playwright-only testing for a project
 */
router.post('/:id/playwright-testing', authenticateToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const {
            sessionName,
            description,
            testTypes = ['basic', 'keyboard', 'screen-reader', 'form'],
            browsers = ['chromium'],
            viewports = ['desktop'],
            maxPages = 25,
            authConfigId
        } = req.body;

        // Verify project exists
        const projectExists = await db.query('SELECT id, name, primary_url FROM projects WHERE id = $1', [projectId]);
        if (projectExists.rows.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
                id: projectId
            });
        }

        const project = projectExists.rows[0];

        console.log(`🎭 Starting Playwright testing for project: ${project.name}`);

        // Configure Playwright-only testing
        const testConfig = {
            sessionName: sessionName || `Playwright Test - ${project.name} - ${new Date().toLocaleDateString()}`,
            description: description || `Frontend accessibility testing with Playwright for ${project.name}`,
            testingApproach: 'automated_only',
            includeFrontend: true,
            includeBackend: false,
            includeManual: false,
            testTypes,
            browsers,
            viewports,
            maxPages,
            projectId,
            initiatedBy: req.user?.username || 'api-user',
            authConfigId
        };

        // Start Playwright testing orchestration
        const orchestrationPromise = orchestrator.orchestrateComplianceTest(projectId, testConfig);

        res.status(202).json({
            success: true,
            message: 'Playwright testing initiated successfully',
            project: {
                id: projectId,
                name: project.name,
                primary_url: project.primary_url
            },
            testConfiguration: {
                testTypes,
                browsers,
                viewports,
                maxPages
            },
            status: 'initiated',
            message_details: 'Playwright tests started. Monitor progress via WebSocket or session endpoints.'
        });

        // Handle completion in background
        orchestrationPromise.then(result => {
            console.log(`✅ Playwright testing completed for project ${projectId}:`, result.summary);
        }).catch(error => {
            console.error(`❌ Playwright testing failed for project ${projectId}:`, error);
        });

    } catch (error) {
        console.error('Error starting Playwright testing:', error);
        res.status(500).json({
            error: 'Failed to start Playwright testing',
            message: error.message
        });
    }
});

/**
 * GET /api/projects/:id/auth-configs
 * Get available authentication configurations for a project
 */
router.get('/:id/auth-configs', async (req, res) => {
    try {
        const { id: projectId } = req.params;

        // Get project details to get its primary domain
        const projectResult = await db.query('SELECT primary_url FROM projects WHERE id = $1', [projectId]);
        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const primaryUrl = projectResult.rows[0].primary_url;
        const domain = new URL(primaryUrl).hostname;

        // Get authentication configurations for this domain
        const result = await db.query(`
            SELECT 
                ac.id,
                ac.name,
                ac.type,
                ac.domain,
                ac.username,
                ac.login_page,
                ac.success_url,
                ac.status,
                ac.auth_role,
                ac.auth_description,
                ac.priority,
                ac.is_default,
                ac.created_at,
                p.name as project_name
            FROM auth_configs ac
            LEFT JOIN projects p ON ac.project_id = p.id
            WHERE ac.domain = $1 AND ac.status = 'active'
            ORDER BY ac.priority ASC, ac.is_default DESC, ac.created_at DESC
        `, [domain]);

        res.json({
            success: true,
            data: {
                project_id: projectId,
                domain: domain,
                primary_url: primaryUrl,
                auth_configs: result.rows,
                total_configs: result.rows.length
            }
        });

    } catch (error) {
        console.error('Error fetching project auth configs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch authentication configurations',
            message: error.message
        });
    }
});

/**
 * POST /api/projects/:id/roles
 * Create or update project roles
 */
router.post('/:id/roles', authenticateToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const {
            role_name,
            role_description,
            role_type = 'user',
            priority = 1,
            is_default = false,
            testing_scope = { automated: true, manual: true }
        } = req.body;

        // Validate required fields
        if (!role_name) {
            return res.status(400).json({
                success: false,
                error: 'Role name is required'
            });
        }

        // Check if project exists
        const projectExists = await db.query('SELECT id FROM projects WHERE id = $1', [projectId]);
        if (projectExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Insert or update project role
        const result = await db.query(`
            INSERT INTO project_roles (
                project_id, role_name, role_description, role_type, 
                priority, is_default, testing_scope
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (project_id, role_name) 
            DO UPDATE SET
                role_description = EXCLUDED.role_description,
                role_type = EXCLUDED.role_type,
                priority = EXCLUDED.priority,
                is_default = EXCLUDED.is_default,
                testing_scope = EXCLUDED.testing_scope,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [projectId, role_name, role_description, role_type, priority, is_default, JSON.stringify(testing_scope)]);

        res.status(201).json({
            success: true,
            message: 'Project role created/updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating/updating project role:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create/update project role',
            message: error.message
        });
    }
});

/**
 * GET /api/projects/:id/roles
 * Get all roles for a project
 */
router.get('/:id/roles', authenticateToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;

        const result = await db.query(`
            SELECT * FROM project_roles 
            WHERE project_id = $1 
            ORDER BY priority ASC, is_default DESC, role_name ASC
        `, [projectId]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching project roles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project roles',
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
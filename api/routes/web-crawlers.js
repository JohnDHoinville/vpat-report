const express = require('express');
const router = express.Router();
const PlaywrightCrawlerService = require('../../database/services/playwright-crawler-service');
const WebCrawlerImportService = require('../../database/services/web-crawler-import-service');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { dbConfig } = require('../../database/config');

// Services will be injected after WebSocket service is available
let crawlerService = null;
let importService = null;

// Initialize services with WebSocket support
function initializeServices(websocketService = null) {
    crawlerService = new PlaywrightCrawlerService(dbConfig, websocketService);
    importService = new WebCrawlerImportService();
    console.log('🔧 Web crawler services initialized with WebSocket support');
}

// Middleware to ensure services are initialized
function ensureServices(req, res, next) {
    if (!crawlerService) {
        initializeServices(); // Initialize without WebSocket if not available
    }
    next();
}

/**
 * Get all web crawlers for a project
 */
router.get('/projects/:projectId/crawlers', ensureServices, optionalAuth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT c.*, 
                   COUNT(cr.id) as total_runs,
                   MAX(cr.completed_at) as last_run_at,
                   (SELECT COUNT(*) FROM crawler_discovered_pages cdp 
                    JOIN crawler_runs cr2 ON cdp.crawler_run_id = cr2.id 
                    WHERE cr2.crawler_id = c.id) as total_pages_discovered
            FROM web_crawlers c
            LEFT JOIN crawler_runs cr ON c.id = cr.crawler_id
            WHERE c.project_id = $1
        `;
        
        const params = [projectId];
        let paramCount = 2;

        if (status) {
            query += ` AND c.status = $${paramCount++}`;
            params.push(status);
        }

        query += ` GROUP BY c.id ORDER BY c.updated_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
        params.push(limit, offset);

        const client = await crawlerService.pool.connect();
        const result = await client.query(query, params);
        client.release();

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.rows.length
            }
        });
    } catch (error) {
        console.error('Error fetching crawlers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get single web crawler with detailed information
 */
router.get('/crawlers/:crawlerId', authenticateToken, async (req, res) => {
    try {
        const { crawlerId } = req.params;

        const client = await crawlerService.pool.connect();
        
        // Get crawler details
        const crawlerQuery = `
            SELECT c.*, 
                   COUNT(cr.id) as total_runs,
                   MAX(cr.completed_at) as last_run_at,
                   (SELECT COUNT(*) FROM crawler_discovered_pages cdp 
                    JOIN crawler_runs cr2 ON cdp.crawler_run_id = cr2.id 
                    WHERE cr2.crawler_id = c.id) as total_pages_discovered
            FROM web_crawlers c
            LEFT JOIN crawler_runs cr ON c.id = cr.crawler_id
            WHERE c.id = $1
            GROUP BY c.id
        `;
        
        const crawlerResult = await client.query(crawlerQuery, [crawlerId]);
        
        if (crawlerResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Crawler not found' });
        }

        const crawler = crawlerResult.rows[0];

        // Get recent runs
        const runsQuery = `
            SELECT id, status, started_at, completed_at, duration_ms, 
                   pages_discovered, pages_crawled, pages_failed, auth_successful
            FROM crawler_runs 
            WHERE crawler_id = $1 
            ORDER BY started_at DESC 
            LIMIT 10
        `;
        
        const runsResult = await client.query(runsQuery, [crawlerId]);
        crawler.recent_runs = runsResult.rows;

        // Get authentication session status
        const sessionQuery = `
            SELECT session_name, authenticated_user, auth_level, is_active, 
                   last_used_at, expires_at
            FROM crawler_auth_sessions 
            WHERE crawler_id = $1 AND is_active = true
        `;
        
        const sessionResult = await client.query(sessionQuery, [crawlerId]);
        crawler.auth_sessions = sessionResult.rows;

        client.release();

        // Remove sensitive data before sending response
        delete crawler.auth_credentials;

        res.json({ success: true, data: crawler });
    } catch (error) {
        console.error('Error fetching crawler:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Create new web crawler
 */
router.post('/projects/:projectId/crawlers', optionalAuth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const crawlerData = {
            ...req.body,
            project_id: projectId,
            created_by: req.user.id
        };

        // Validate required fields
        if (!crawlerData.name || !crawlerData.base_url) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name and base URL are required' 
            });
        }

        // Validate URL format
        try {
            new URL(crawlerData.base_url);
        } catch {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid base URL format' 
            });
        }

        const crawler = await crawlerService.createCrawler(crawlerData);
        
        // Remove sensitive data before sending response
        delete crawler.auth_credentials;

        res.status(201).json({ success: true, data: crawler });
    } catch (error) {
        console.error('Error creating crawler:', error);
        
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({ 
                success: false, 
                error: 'Crawler with this name already exists in the project' 
            });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update web crawler configuration
 */
router.put('/crawlers/:crawlerId', authenticateToken, async (req, res) => {
    try {
        const { crawlerId } = req.params;
        const updateData = req.body;

        // Don't allow updating project_id or created_by
        delete updateData.project_id;
        delete updateData.created_by;
        delete updateData.id;

        const crawler = await crawlerService.updateCrawler(crawlerId, updateData);
        
        // Remove sensitive data before sending response
        delete crawler.auth_credentials;

        res.json({ success: true, data: crawler });
    } catch (error) {
        console.error('Error updating crawler:', error);
        
        if (error.message === 'Crawler not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Delete web crawler
 */
router.delete('/crawlers/:crawlerId', authenticateToken, async (req, res) => {
    try {
        const { crawlerId } = req.params;

        const client = await crawlerService.pool.connect();
        
        // Check if crawler exists and get project for authorization
        const checkQuery = `
            SELECT c.id, c.project_id, c.name, c.status
            FROM web_crawlers c
            WHERE c.id = $1
        `;
        
        const checkResult = await client.query(checkQuery, [crawlerId]);
        
        if (checkResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, error: 'Crawler not found' });
        }

        const crawler = checkResult.rows[0];

        // Check if crawler is currently running
        if (crawler.status === 'running') {
            client.release();
            return res.status(409).json({ 
                success: false, 
                error: 'Cannot delete a running crawler. Stop it first.' 
            });
        }

        // Delete crawler (cascades to related tables)
        await client.query('DELETE FROM web_crawlers WHERE id = $1', [crawlerId]);
        
        client.release();

        res.json({ 
            success: true, 
            message: `Crawler "${crawler.name}" deleted successfully` 
        });
    } catch (error) {
        console.error('Error deleting crawler:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Start crawler execution
 */
router.post('/crawlers/:crawlerId/start', optionalAuth, async (req, res) => {
    try {
        const { crawlerId } = req.params;
        const runConfig = {
            ...req.body,
            triggered_by: 'manual',
            user_id: req.user?.id || 'anonymous'
        };

        const crawlerRun = await crawlerService.startCrawler(crawlerId, runConfig);

        res.json({ 
            success: true, 
            data: crawlerRun,
            message: 'Crawler started successfully' 
        });
    } catch (error) {
        console.error('Error starting crawler:', error);
        
        if (error.message === 'Crawler not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        
        if (error.message === 'Crawler is already running') {
            return res.status(409).json({ success: false, error: error.message });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Stop crawler execution
 */
router.post('/crawlers/:crawlerId/stop', authenticateToken, async (req, res) => {
    try {
        const { crawlerId } = req.params;

        // Check if crawler is running
        if (!crawlerService.activeCrawlers.has(crawlerId)) {
            return res.status(409).json({ 
                success: false, 
                error: 'Crawler is not currently running' 
            });
        }

        // Get the running crawler run ID
        const runId = crawlerService.activeCrawlers.get(crawlerId);
        
        // Update status to cancelled
        await crawlerService.updateCrawlerRunStatus(runId, 'cancelled', {
            completed_at: new Date().toISOString()
        });

        // Remove from active crawlers
        crawlerService.activeCrawlers.delete(crawlerId);

        res.json({ 
            success: true, 
            message: 'Crawler stopped successfully' 
        });
    } catch (error) {
        console.error('Error stopping crawler:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get crawler runs with pagination
 */
router.get('/crawlers/:crawlerId/runs', authenticateToken, async (req, res) => {
    try {
        const { crawlerId } = req.params;
        const { status, limit = 20, offset = 0 } = req.query;

        let query = `
            SELECT cr.*, 
                   (SELECT COUNT(*) FROM crawler_discovered_pages WHERE crawler_run_id = cr.id) as pages_found
            FROM crawler_runs cr
            WHERE cr.crawler_id = $1
        `;
        
        const params = [crawlerId];
        let paramCount = 2;

        if (status) {
            query += ` AND cr.status = $${paramCount++}`;
            params.push(status);
        }

        query += ` ORDER BY cr.started_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
        params.push(limit, offset);

        const client = await crawlerService.pool.connect();
        const result = await client.query(query, params);
        client.release();

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.rows.length
            }
        });
    } catch (error) {
        console.error('Error fetching crawler runs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get discovered pages from crawler with testing integration
 */
router.get('/crawlers/:crawlerId/pages', authenticateToken, async (req, res) => {
    try {
        const { crawlerId } = req.params;
        const { 
            run_id, 
            selected_for_testing, 
            has_forms, 
            requires_auth,
            limit = 100, 
            offset = 0,
            search 
        } = req.query;

        let query = `
            SELECT cdp.*, cr.started_at as run_started_at
            FROM crawler_discovered_pages cdp
            JOIN crawler_runs cr ON cdp.crawler_run_id = cr.id
            WHERE cdp.crawler_id = $1
        `;
        
        const params = [crawlerId];
        let paramCount = 2;

        if (run_id) {
            query += ` AND cdp.crawler_run_id = $${paramCount++}`;
            params.push(run_id);
        }

        if (selected_for_testing === 'true') {
            query += ` AND (cdp.selected_for_manual_testing = true OR cdp.selected_for_automated_testing = true)`;
        }

        if (has_forms === 'true') {
            query += ` AND cdp.has_forms = true`;
        }

        if (requires_auth === 'true') {
            query += ` AND cdp.requires_auth = true`;
        }

        if (search) {
            query += ` AND (cdp.url ILIKE $${paramCount++} OR cdp.title ILIKE $${paramCount})`;
            params.push(`%${search}%`, `%${search}%`);
            paramCount++;
        }

        query += ` ORDER BY cdp.last_crawled_at DESC, cdp.testing_priority DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
        params.push(limit, offset);

        const client = await crawlerService.pool.connect();
        const result = await client.query(query, params);
        client.release();

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.rows.length
            }
        });
    } catch (error) {
        console.error('Error fetching crawler pages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update page testing selection
 */
router.put('/crawler-pages/:pageId/testing', authenticateToken, async (req, res) => {
    try {
        const { pageId } = req.params;
        const { 
            selected_for_manual_testing, 
            selected_for_automated_testing, 
            testing_priority,
            testing_notes 
        } = req.body;

        const client = await crawlerService.pool.connect();
        
        const updateQuery = `
            UPDATE crawler_discovered_pages 
            SET selected_for_manual_testing = COALESCE($1, selected_for_manual_testing),
                selected_for_automated_testing = COALESCE($2, selected_for_automated_testing),
                testing_priority = COALESCE($3, testing_priority),
                testing_notes = COALESCE($4, testing_notes),
                last_crawled_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `;

        const result = await client.query(updateQuery, [
            selected_for_manual_testing,
            selected_for_automated_testing,
            testing_priority,
            testing_notes,
            pageId
        ]);

        client.release();

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Page not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating page testing selection:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Bulk update page testing selection
 */
router.put('/crawlers/:crawlerId/pages/bulk-testing', authenticateToken, async (req, res) => {
    try {
        const { crawlerId } = req.params;
        const { 
            page_ids, 
            selected_for_manual_testing, 
            selected_for_automated_testing, 
            testing_priority 
        } = req.body;

        if (!page_ids || !Array.isArray(page_ids) || page_ids.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'page_ids array is required' 
            });
        }

        const client = await crawlerService.pool.connect();
        
        const placeholders = page_ids.map((_, index) => `$${index + 2}`).join(',');
        const updateQuery = `
            UPDATE crawler_discovered_pages 
            SET selected_for_manual_testing = COALESCE($1, selected_for_manual_testing),
                selected_for_automated_testing = COALESCE($${page_ids.length + 2}, selected_for_automated_testing),
                testing_priority = COALESCE($${page_ids.length + 3}, testing_priority)
            WHERE crawler_id = $${page_ids.length + 4} AND id IN (${placeholders})
            RETURNING id, url, selected_for_manual_testing, selected_for_automated_testing
        `;

        const params = [
            selected_for_manual_testing,
            ...page_ids,
            selected_for_automated_testing,
            testing_priority,
            crawlerId
        ];

        const result = await client.query(updateQuery, params);
        client.release();

        res.json({ 
            success: true, 
            data: result.rows,
            updated_count: result.rows.length 
        });
    } catch (error) {
        console.error('Error bulk updating page testing selection:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get crawler statistics and metrics
 */
router.get('/crawlers/:crawlerId/stats', authenticateToken, async (req, res) => {
    try {
        const { crawlerId } = req.params;

        const client = await crawlerService.pool.connect();
        
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT cr.id) as total_runs,
                COUNT(DISTINCT cdp.id) as total_pages_discovered,
                COUNT(DISTINCT cdp.id) FILTER (WHERE cdp.selected_for_manual_testing = true) as pages_selected_manual,
                COUNT(DISTINCT cdp.id) FILTER (WHERE cdp.selected_for_automated_testing = true) as pages_selected_automated,
                COUNT(DISTINCT cdp.id) FILTER (WHERE cdp.has_forms = true) as pages_with_forms,
                COUNT(DISTINCT cdp.id) FILTER (WHERE cdp.requires_auth = true) as pages_requiring_auth,
                AVG(cdp.response_time_ms) as avg_response_time,
                AVG(cr.duration_ms) as avg_run_duration,
                MAX(cr.completed_at) as last_successful_run
            FROM web_crawlers wc
            LEFT JOIN crawler_runs cr ON wc.id = cr.crawler_id AND cr.status = 'completed'
            LEFT JOIN crawler_discovered_pages cdp ON cr.id = cdp.crawler_run_id
            WHERE wc.id = $1
            GROUP BY wc.id
        `;

        const result = await client.query(statsQuery, [crawlerId]);
        client.release();

        const stats = result.rows[0] || {};

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching crawler stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get discovered pages for a crawler
 */
router.get('/crawlers/:crawlerId/pages', ensureServices, optionalAuth, async (req, res) => {
    try {
        const { crawlerId } = req.params;
        const { limit = 100, offset = 0, status = null } = req.query;

        const client = await pool.connect();

        // Get pages from the most recent completed run
        const pagesQuery = `
            SELECT 
                cdp.id,
                cdp.url,
                cdp.title,
                cdp.description,
                cdp.status_code,
                cdp.content_type,
                cdp.depth,
                cdp.parent_url,
                cdp.page_data,
                cdp.discovered_at,
                cr.id as crawler_run_id,
                cr.started_at as run_started_at
            FROM crawler_discovered_pages cdp
            JOIN crawler_runs cr ON cdp.crawler_run_id = cr.id
            WHERE cr.crawler_id = $1 
                AND cr.status = 'completed'
                ${status ? 'AND cdp.status_code = $4' : ''}
            ORDER BY cr.started_at DESC, cdp.discovered_at DESC
            LIMIT $2 OFFSET $3
        `;

        const queryParams = [crawlerId, limit, offset];
        if (status) {
            queryParams.push(status);
        }

        const result = await client.query(pagesQuery, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM crawler_discovered_pages cdp
            JOIN crawler_runs cr ON cdp.crawler_run_id = cr.id
            WHERE cr.crawler_id = $1 
                AND cr.status = 'completed'
                ${status ? 'AND cdp.status_code = $2' : ''}
        `;
        const countParams = [crawlerId];
        if (status) {
            countParams.push(status);
        }
        
        const countResult = await client.query(countQuery, countParams);
        client.release();

        res.json({ 
            success: true, 
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: (parseInt(offset) + parseInt(limit)) < parseInt(countResult.rows[0].total)
            }
        });
    } catch (error) {
        console.error('Error fetching crawler pages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Test authentication for crawler
 */
router.post('/crawlers/:crawlerId/test-auth', authenticateToken, async (req, res) => {
    try {
        const { crawlerId } = req.params;
        const testConfig = req.body;

        // This would implement a test authentication flow
        // For now, return a placeholder response
        res.json({ 
            success: true, 
            message: 'Authentication test feature coming soon',
            data: { test_passed: true, details: 'Mock auth test' }
        });
    } catch (error) {
        console.error('Error testing crawler auth:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/web-crawlers/projects/:projectId/import
 * Import existing crawler results from JSON files
 */
router.post('/projects/:projectId/import', optionalAuth, async (req, res) => {
    try {
        const { projectId } = req.params;

        console.log(`📥 Importing web crawler results for project: ${projectId}`);

        const importResults = await importService.importCrawlerResultsForProject(projectId);

        res.json({
            success: true,
            data: importResults,
            message: `Successfully imported ${importResults.filesProcessed} crawler result files with ${importResults.pagesImported} pages`
        });

    } catch (error) {
        console.error('❌ Error importing crawler results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import crawler results',
            message: error.message
        });
    }
});

/**
 * POST /api/web-crawlers/import-all
 * Import all crawler results from JSON files (for all projects)
 */
router.post('/import-all', authenticateToken, async (req, res) => {
    try {
        console.log(`📥 Importing all web crawler results...`);

        // Get all projects
        const client = await crawlerService.pool.connect();
        const projectsResult = await client.query('SELECT id, name FROM projects');
        client.release();

        const allResults = [];
        let totalFiles = 0;
        let totalPages = 0;

        for (const project of projectsResult.rows) {
            try {
                const importResults = await importService.importCrawlerResultsForProject(project.id);
                allResults.push(importResults);
                totalFiles += importResults.filesProcessed;
                totalPages += importResults.pagesImported;
            } catch (error) {
                console.error(`❌ Error importing for project ${project.name}:`, error.message);
                allResults.push({
                    projectId: project.id,
                    projectName: project.name,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: {
                projectsProcessed: allResults.length,
                totalFilesProcessed: totalFiles,
                totalPagesImported: totalPages,
                results: allResults
            },
            message: `Successfully imported crawler results for ${allResults.length} projects`
        });

    } catch (error) {
        console.error('❌ Error importing all crawler results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import crawler results',
            message: error.message
        });
    }
});

/**
 * GET /api/web-crawlers/projects/:projectId/json-results
 * Get web crawler results directly from JSON files (bypasses database)
 */
router.get('/projects/:projectId/json-results', optionalAuth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const fs = require('fs').promises;
        const path = require('path');
        
        console.log(`📁 Loading crawler results from JSON files for project: ${projectId}`);
        
        // Get project info to match domain
        const client = await crawlerService.pool.connect();
        const projectResult = await client.query('SELECT id, name, primary_url FROM projects WHERE id = $1', [projectId]);
        client.release();
        
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        const project = projectResult.rows[0];
        const projectDomain = new URL(project.primary_url).hostname;
        
        const reportsDir = path.join(__dirname, '../../reports');
        const files = await fs.readdir(reportsDir);
        const crawlerFiles = files.filter(file => 
            file.startsWith('site-crawl-') && file.endsWith('.json')
        );
        
        const crawlerResults = [];
        
        for (const fileName of crawlerFiles) {
            try {
                const filePath = path.join(reportsDir, fileName);
                const fileContent = await fs.readFile(filePath, 'utf8');
                const crawlData = JSON.parse(fileContent);
                
                // Check if this crawl matches the project domain
                const crawlDomain = extractDomainFromCrawlData(crawlData);
                if (crawlDomain && crawlDomain.includes(projectDomain)) {
                    // Create a simplified crawler object
                    const crawler = {
                        id: fileName.replace('.json', ''),
                        name: extractCrawlerName(fileName),
                        status: 'completed',
                        base_url: crawlData.rootUrl || crawlData.summary?.primaryUrl || project.primary_url,
                        total_pages_found: crawlData.summary?.totalPages || crawlData.pages?.length || 0,
                        last_run_at: crawlData.startTime || new Date().toISOString(),
                        pages: crawlData.pages || [],
                        summary: crawlData.summary || {},
                        file_name: fileName
                    };
                    
                    crawlerResults.push(crawler);
                }
            } catch (error) {
                console.error(`❌ Error reading ${fileName}:`, error.message);
            }
        }
        
        // Sort by most recent first
        crawlerResults.sort((a, b) => new Date(b.last_run_at) - new Date(a.last_run_at));
        
        console.log(`📄 Found ${crawlerResults.length} crawler results for project ${project.name}`);
        
        res.json({
            success: true,
            data: crawlerResults
        });
        
    } catch (error) {
        console.error('❌ Error loading crawler JSON results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load crawler results',
            message: error.message
        });
    }
});

// Helper functions for JSON results
function extractDomainFromCrawlData(crawlData) {
    const primaryUrl = crawlData.rootUrl || crawlData.summary?.primaryUrl || crawlData.baseUrl;
    if (primaryUrl) {
        try {
            return new URL(primaryUrl).hostname;
        } catch (error) {
            return null;
        }
    }
    
    // Try to extract from first page
    if (crawlData.pages && crawlData.pages.length > 0) {
        try {
            return new URL(crawlData.pages[0].url).hostname;
        } catch (error) {
            return null;
        }
    }
    
    return null;
}

function extractCrawlerName(fileName) {
    // Parse filename: site-crawl-Discovery-1d3482d6-69cb-4efb-b766-5fa94b9f8c52-2025-07-17T13-29-41-711Z.json
    const parts = fileName.replace('.json', '').split('-');
    if (parts.length > 2) {
        return parts[2] || 'Discovery';
    }
    return 'Discovery';
}

module.exports = router;
module.exports.initializeServices = initializeServices; 
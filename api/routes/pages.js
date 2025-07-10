const express = require('express');
const { db } = require('../../database/config');

const router = express.Router();

/**
 * Discovered Pages Routes
 * Handles read operations for discovered pages (mostly read-only)
 */

/**
 * GET /api/pages
 * List all discovered pages with optional filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            page_type,
            sort = 'url',
            order = 'ASC'
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
        const allowedSortColumns = ['url', 'title', 'page_type', 'discovered_at'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'url';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) 
            FROM discovered_pages dp 
            WHERE 1=1 ${whereClause}
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
                (
                    SELECT COUNT(*) 
                    FROM automated_test_results atr 
                    WHERE atr.page_id = dp.id
                ) as test_count
            FROM discovered_pages dp
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            WHERE 1=1 ${whereClause}
            ORDER BY dp.${sortColumn} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const result = await db.query(pagesQuery, queryParams);

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
                page_type,
                sort: sortColumn,
                order: sortOrder
            }
        });

    } catch (error) {
        console.error('Error fetching pages:', error);
        res.status(500).json({
            error: 'Failed to fetch pages',
            message: error.message
        });
    }
});

/**
 * GET /api/pages/:id
 * Get a specific page by ID with related data
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { include } = req.query;

        // Get page details
        const pageQuery = `
            SELECT 
                dp.*,
                sd.primary_url as site_primary_url,
                sd.domain as site_domain,
                sd.status as discovery_status,
                (
                    SELECT COUNT(*) 
                    FROM automated_test_results atr 
                    WHERE atr.page_id = dp.id
                ) as test_count,
                (
                    SELECT SUM(atr.violations_count) 
                    FROM automated_test_results atr 
                    WHERE atr.page_id = dp.id
                ) as total_violations
            FROM discovered_pages dp
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            WHERE dp.id = $1
        `;

        const result = await db.query(pageQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Page not found',
                id
            });
        }

        const page = result.rows[0];

        // Include related data if requested
        if (include) {
            const includeItems = include.split(',');

            if (includeItems.includes('results')) {
                const resultsQuery = `
                    SELECT 
                        atr.*,
                        ts.name as session_name,
                        p.name as project_name
                    FROM automated_test_results atr
                    JOIN test_sessions ts ON atr.test_session_id = ts.id
                    JOIN projects p ON ts.project_id = p.id
                    WHERE atr.page_id = $1
                    ORDER BY atr.executed_at DESC
                `;
                const resultsResult = await db.query(resultsQuery, [id]);
                page.test_results = resultsResult.rows;
            }

            if (includeItems.includes('summary')) {
                const summaryQuery = `
                    SELECT 
                        atr.tool_name,
                        COUNT(*) as test_count,
                        SUM(atr.violations_count) as violations,
                        AVG(atr.violations_count) as avg_violations,
                        MIN(atr.executed_at) as first_test,
                        MAX(atr.executed_at) as last_test
                    FROM automated_test_results atr
                    WHERE atr.page_id = $1
                    GROUP BY atr.tool_name
                    ORDER BY violations DESC
                `;
                const summaryResult = await db.query(summaryQuery, [id]);
                page.tool_summary = summaryResult.rows;
            }
        }

        res.json(page);

    } catch (error) {
        console.error('Error fetching page:', error);
        res.status(500).json({
            error: 'Failed to fetch page',
            message: error.message
        });
    }
});

/**
 * GET /api/pages/:id/results
 * Get all test results for a specific page
 */
router.get('/:id/results', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            page = 1,
            limit = 50,
            tool_name,
            session_id,
            sort = 'executed_at',
            order = 'DESC'
        } = req.query;

        // Check if page exists
        const pageExists = await db.query('SELECT id FROM discovered_pages WHERE id = $1', [id]);
        if (pageExists.rows.length === 0) {
            return res.status(404).json({
                error: 'Page not found',
                id
            });
        }

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Build query
        let whereClause = 'WHERE atr.page_id = $1';
        let queryParams = [id];
        let paramIndex = 2;

        if (tool_name) {
            whereClause += ` AND atr.tool_name = $${paramIndex}`;
            queryParams.push(tool_name);
            paramIndex++;
        }

        if (session_id) {
            whereClause += ` AND atr.test_session_id = $${paramIndex}`;
            queryParams.push(session_id);
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
                ts.name as session_name,
                p.name as project_name
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            JOIN projects p ON ts.project_id = p.id
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
        console.error('Error fetching page results:', error);
        res.status(500).json({
            error: 'Failed to fetch page results',
            message: error.message
        });
    }
});

module.exports = router; 
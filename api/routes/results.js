const express = require('express');
const { db } = require('../../database/config');

const router = express.Router();

/**
 * Test Results Routes
 * Handles read operations for automated test results
 */

/**
 * GET /api/results
 * List all test results with optional filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            tool_name,
            session_id,
            project_id,
            violations_min,
            violations_max,
            sort = 'executed_at',
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

        if (project_id) {
            whereClause += ` AND ts.project_id = $${paramIndex}`;
            queryParams.push(project_id);
            paramIndex++;
        }

        if (violations_min !== undefined) {
            whereClause += ` AND atr.violations_count >= $${paramIndex}`;
            queryParams.push(parseInt(violations_min));
            paramIndex++;
        }

        if (violations_max !== undefined) {
            whereClause += ` AND atr.violations_count <= $${paramIndex}`;
            queryParams.push(parseInt(violations_max));
            paramIndex++;
        }

        // Validate sort column
        const allowedSortColumns = ['tool_name', 'violations_count', 'executed_at'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'executed_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) 
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            WHERE 1=1 ${whereClause}
        `;
        const countResult = await db.query(countQuery, queryParams);
        const totalItems = parseInt(countResult.rows[0].count);

        // Get results
        queryParams.push(limitNum, offset);
        const resultsQuery = `
            SELECT 
                atr.*,
                ts.name as session_name,
                p.name as project_name,
                dp.url as page_url,
                dp.title as page_title,
                dp.page_type
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            JOIN projects p ON ts.project_id = p.id
            JOIN discovered_pages dp ON atr.page_id = dp.id
            WHERE 1=1 ${whereClause}
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
            },
            meta: {
                tool_name,
                session_id,
                project_id,
                violations_min,
                violations_max,
                sort: sortColumn,
                order: sortOrder
            }
        });

    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({
            error: 'Failed to fetch results',
            message: error.message
        });
    }
});

/**
 * GET /api/results/automated-test-results
 * List automated test results for requirements dashboard
 */
router.get('/automated-test-results', async (req, res) => {
    try {
        const { session_id } = req.query;
        
        if (!session_id) {
            return res.status(400).json({ 
                error: 'session_id is required' 
            });
        }

        const query = `
            SELECT 
                atr.id,
                atr.tool_name,
                atr.result_type,
                atr.wcag_criterion,
                atr.page_url,
                atr.violations_count,
                atr.passes_count,
                atr.executed_at,
                CASE 
                    WHEN atr.violations_count > 0 THEN 'fail'
                    WHEN atr.passes_count > 0 THEN 'pass'
                    ELSE 'unknown'
                END as result
            FROM automated_test_results atr
            WHERE atr.test_session_id = $1
            ORDER BY atr.wcag_criterion, atr.tool_name, atr.executed_at DESC
        `;

        const result = await db.query(query, [session_id]);
        
        res.json({
            data: result.rows,
            total: result.rows.length,
            session_id: session_id
        });

    } catch (error) {
        console.error('Error fetching automated test results:', error);
        res.status(500).json({ 
            error: 'Failed to fetch automated test results',
            details: error.message 
        });
    }
});

/**
 * GET /api/results/statistics
 * Get overall statistics about test results
 */
router.get('/statistics', async (req, res) => {
    try {
        const { project_id, tool_name, days = 30 } = req.query;

        // Build date filter
        let dateFilter = '';
        let queryParams = [];
        let paramIndex = 1;

        if (days) {
            dateFilter = ` AND atr.executed_at >= NOW() - INTERVAL '${parseInt(days)} days'`;
        }

        if (project_id) {
            dateFilter += ` AND ts.project_id = $${paramIndex}`;
            queryParams.push(project_id);
            paramIndex++;
        }

        if (tool_name) {
            dateFilter += ` AND atr.tool_name = $${paramIndex}`;
            queryParams.push(tool_name);
            paramIndex++;
        }

        // Get overall statistics
        const overallQuery = `
            SELECT 
                COUNT(*) as total_tests,
                COUNT(DISTINCT atr.test_session_id) as total_sessions,
                COUNT(DISTINCT ts.project_id) as total_projects,
                COUNT(DISTINCT atr.page_id) as total_pages,
                COUNT(DISTINCT atr.tool_name) as total_tools,
                SUM(atr.violations_count) as total_violations,
                AVG(atr.violations_count) as avg_violations,
                MIN(atr.executed_at) as earliest_test,
                MAX(atr.executed_at) as latest_test
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            WHERE 1=1 ${dateFilter}
        `;
        const overallResult = await db.query(overallQuery, queryParams);

        // Get tool breakdown
        const toolBreakdownQuery = `
            SELECT 
                atr.tool_name,
                COUNT(*) as test_count,
                SUM(atr.violations_count) as total_violations,
                AVG(atr.violations_count) as avg_violations,
                COUNT(DISTINCT atr.page_id) as pages_tested
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            WHERE 1=1 ${dateFilter}
            GROUP BY atr.tool_name
            ORDER BY test_count DESC
        `;
        const toolBreakdownResult = await db.query(toolBreakdownQuery, queryParams);

        // Get project breakdown
        const projectBreakdownQuery = `
            SELECT 
                p.name as project_name,
                p.id as project_id,
                COUNT(atr.id) as test_count,
                SUM(atr.violations_count) as total_violations,
                COUNT(DISTINCT atr.test_session_id) as session_count,
                COUNT(DISTINCT atr.page_id) as pages_tested
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            JOIN projects p ON ts.project_id = p.id
            WHERE 1=1 ${dateFilter}
            GROUP BY p.id, p.name
            ORDER BY test_count DESC
        `;
        const projectBreakdownResult = await db.query(projectBreakdownQuery, queryParams);

        // Get violation distribution
        const violationDistributionQuery = `
            WITH violation_ranges AS (
                SELECT 
                    CASE 
                        WHEN violations_count = 0 THEN '0'
                        WHEN violations_count BETWEEN 1 AND 5 THEN '1-5'
                        WHEN violations_count BETWEEN 6 AND 10 THEN '6-10'
                        WHEN violations_count BETWEEN 11 AND 25 THEN '11-25'
                        WHEN violations_count BETWEEN 26 AND 50 THEN '26-50'
                        ELSE '50+'
                    END as violation_range,
                    CASE 
                        WHEN violations_count = 0 THEN 0
                        WHEN violations_count BETWEEN 1 AND 5 THEN 1
                        WHEN violations_count BETWEEN 6 AND 10 THEN 2
                        WHEN violations_count BETWEEN 11 AND 25 THEN 3
                        WHEN violations_count BETWEEN 26 AND 50 THEN 4
                        ELSE 5
                    END as sort_order
                FROM automated_test_results atr
                JOIN test_sessions ts ON atr.test_session_id = ts.id
                WHERE 1=1 ${dateFilter}
            )
            SELECT 
                violation_range,
                COUNT(*) as test_count
            FROM violation_ranges
            GROUP BY violation_range, sort_order
            ORDER BY sort_order
        `;
        const violationDistributionResult = await db.query(violationDistributionQuery, queryParams);

        res.json({
            period: `Last ${days} days`,
            overall: overallResult.rows[0],
            tool_breakdown: toolBreakdownResult.rows,
            project_breakdown: projectBreakdownResult.rows,
            violation_distribution: violationDistributionResult.rows
        });

    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

/**
 * GET /api/results/:id
 * Get a specific test result by ID with full details
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultQuery = `
            SELECT 
                atr.*,
                ts.name as session_name,
                ts.test_type,
                ts.status as session_status,
                p.name as project_name,
                dp.url as page_url,
                dp.title as page_title,
                dp.page_type,
                dp.http_status,
                sd.primary_url as site_primary_url,
                sd.domain as site_domain
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            JOIN projects p ON ts.project_id = p.id
            JOIN discovered_pages dp ON atr.page_id = dp.id
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            WHERE atr.id = $1
        `;

        const result = await db.query(resultQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Test result not found',
                id
            });
        }

        const testResult = result.rows[0];

        // Parse raw_results if it exists
        if (testResult.raw_results) {
            try {
                testResult.parsed_results = JSON.parse(testResult.raw_results);
            } catch (error) {
                testResult.parsed_results = null;
                testResult.parse_error = 'Invalid JSON in raw_results';
            }
        }

        res.json(testResult);

    } catch (error) {
        console.error('Error fetching result:', error);
        res.status(500).json({
            error: 'Failed to fetch result',
            message: error.message
        });
    }
});

/**
 * GET /api/results/trends
 * Get trend data for violations over time
 */
router.get('/trends', async (req, res) => {
    try {
        const { 
            project_id, 
            tool_name, 
            days = 30, 
            interval = 'day' 
        } = req.query;

        // Validate interval
        const allowedIntervals = ['hour', 'day', 'week', 'month'];
        const timeInterval = allowedIntervals.includes(interval) ? interval : 'day';

        // Build filters
        let whereClause = '';
        let queryParams = [];
        let paramIndex = 1;

        if (project_id) {
            whereClause += ` AND ts.project_id = $${paramIndex}`;
            queryParams.push(project_id);
            paramIndex++;
        }

        if (tool_name) {
            whereClause += ` AND atr.tool_name = $${paramIndex}`;
            queryParams.push(tool_name);
            paramIndex++;
        }

        // Get trend data
        const trendsQuery = `
            SELECT 
                DATE_TRUNC('${timeInterval}', atr.executed_at) as time_period,
                COUNT(*) as test_count,
                SUM(atr.violations_count) as total_violations,
                AVG(atr.violations_count) as avg_violations,
                COUNT(DISTINCT atr.page_id) as pages_tested,
                COUNT(DISTINCT atr.tool_name) as tools_used
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            WHERE atr.executed_at >= NOW() - INTERVAL '${parseInt(days)} days'
            ${whereClause}
            GROUP BY time_period
            ORDER BY time_period ASC
        `;
        const trendsResult = await db.query(trendsQuery, queryParams);

        // Get tool trends if no specific tool requested
        let toolTrends = [];
        if (!tool_name) {
            const toolTrendsQuery = `
                SELECT 
                    DATE_TRUNC('${timeInterval}', atr.executed_at) as time_period,
                    atr.tool_name,
                    COUNT(*) as test_count,
                    SUM(atr.violations_count) as violations
                FROM automated_test_results atr
                JOIN test_sessions ts ON atr.test_session_id = ts.id
                WHERE atr.executed_at >= NOW() - INTERVAL '${parseInt(days)} days'
                ${whereClause}
                GROUP BY time_period, atr.tool_name
                ORDER BY time_period ASC, atr.tool_name
            `;
            const toolTrendsResult = await db.query(toolTrendsQuery, queryParams);
            toolTrends = toolTrendsResult.rows;
        }

        res.json({
            period: `Last ${days} days`,
            interval: timeInterval,
            filters: { project_id, tool_name },
            overall_trends: trendsResult.rows,
            tool_trends: toolTrends
        });

    } catch (error) {
        console.error('Error fetching trends:', error);
        res.status(500).json({
            error: 'Failed to fetch trends',
            message: error.message
        });
    }
});

/**
 * GET /api/results/compare
 * Compare test results between different time periods or filters
 */
router.get('/compare', async (req, res) => {
    try {
        const {
            project_id,
            tool_name,
            period1_days = 7,
            period2_days = 14
        } = req.query;

        const period1 = parseInt(period1_days);
        const period2 = parseInt(period2_days);

        // Build base filters
        let whereClause = '';
        let queryParams = [];
        let paramIndex = 1;

        if (project_id) {
            whereClause += ` AND ts.project_id = $${paramIndex}`;
            queryParams.push(project_id);
            paramIndex++;
        }

        if (tool_name) {
            whereClause += ` AND atr.tool_name = $${paramIndex}`;
            queryParams.push(tool_name);
            paramIndex++;
        }

        // Get period 1 data (most recent)
        const period1Query = `
            SELECT 
                COUNT(*) as test_count,
                SUM(atr.violations_count) as total_violations,
                AVG(atr.violations_count) as avg_violations,
                COUNT(DISTINCT atr.page_id) as pages_tested
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            WHERE atr.executed_at >= NOW() - INTERVAL '${period1} days'
            ${whereClause}
        `;
        const period1Result = await db.query(period1Query, queryParams);

        // Get period 2 data (older comparison period)
        const period2Query = `
            SELECT 
                COUNT(*) as test_count,
                SUM(atr.violations_count) as total_violations,
                AVG(atr.violations_count) as avg_violations,
                COUNT(DISTINCT atr.page_id) as pages_tested
            FROM automated_test_results atr
            JOIN test_sessions ts ON atr.test_session_id = ts.id
            WHERE atr.executed_at >= NOW() - INTERVAL '${period2} days'
            AND atr.executed_at < NOW() - INTERVAL '${period1} days'
            ${whereClause}
        `;
        const period2Result = await db.query(period2Query, queryParams);

        const period1Data = period1Result.rows[0];
        const period2Data = period2Result.rows[0];

        // Calculate changes
        const calculateChange = (current, previous) => {
            if (previous === 0 || previous === null) return null;
            return ((current - previous) / previous * 100).toFixed(2);
        };

        const comparison = {
            period1: {
                label: `Last ${period1} days`,
                data: period1Data
            },
            period2: {
                label: `${period2}-${period1} days ago`,
                data: period2Data
            },
            changes: {
                test_count: calculateChange(period1Data.test_count, period2Data.test_count),
                total_violations: calculateChange(period1Data.total_violations, period2Data.total_violations),
                avg_violations: calculateChange(period1Data.avg_violations, period2Data.avg_violations),
                pages_tested: calculateChange(period1Data.pages_tested, period2Data.pages_tested)
            }
        };

        res.json(comparison);

    } catch (error) {
        console.error('Error comparing results:', error);
        res.status(500).json({
            error: 'Failed to compare results',
            message: error.message
        });
    }
});

module.exports = router; 
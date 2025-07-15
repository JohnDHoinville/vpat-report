const express = require('express');
const { db } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth'); // Added auth middleware

const router = express.Router();

/**
 * Test Results Routes
 * Handles read operations for automated test results
 */

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
                atr.test_session_id,
                atr.page_id,
                atr.violations_count,
                atr.warnings_count,
                atr.passes_count,
                atr.test_duration_ms,
                atr.executed_at,
                atr.raw_results,
                dp.url as page_url,
                dp.title as page_title,
                dp.page_type,
                CASE 
                    WHEN atr.violations_count > 0 THEN 'fail'
                    WHEN atr.passes_count > 0 THEN 'pass'
                    ELSE 'unknown'
                END as result_status,
                -- Extract WCAG criteria from violations in raw_results
                CASE 
                    WHEN atr.tool_name = 'lighthouse' THEN
                        COALESCE(
                            (SELECT DISTINCT v.wcag_criterion 
                             FROM violations v 
                             WHERE v.automated_result_id = atr.id 
                             AND v.wcag_criterion IS NOT NULL 
                             AND v.wcag_criterion != '' 
                             AND v.wcag_criterion ~ '^[0-9]+\\.[0-9]+\\.[0-9]+$'
                             LIMIT 1),
                            'general_lighthouse'
                        )
                    WHEN atr.tool_name = 'axe' THEN
                        COALESCE(
                            -- Try to extract from violations first
                            (SELECT DISTINCT 
                                CASE 
                                    WHEN wcag_tag = 'wcag111' THEN '1.1.1'
                                    WHEN wcag_tag = 'wcag143' THEN '1.4.3'
                                    WHEN wcag_tag = 'wcag211' THEN '2.1.1'
                                    WHEN wcag_tag = 'wcag213' THEN '2.1.3'
                                    WHEN wcag_tag = 'wcag241' THEN '2.4.1'
                                    WHEN wcag_tag = 'wcag242' THEN '2.4.2'
                                    WHEN wcag_tag = 'wcag311' THEN '3.1.1'
                                    WHEN wcag_tag = 'wcag332' THEN '3.3.2'
                                    WHEN wcag_tag = 'wcag411' THEN '4.1.1'
                                    WHEN wcag_tag = 'wcag412' THEN '4.1.2'
                                    ELSE wcag_tag
                                END
                             FROM (
                                 SELECT jsonb_array_elements_text(
                                     violation_item->'wcagCriteria'
                                 ) as wcag_tag
                                 FROM jsonb_array_elements(
                                     COALESCE(atr.raw_results->'result'->'detailedViolations', '[]'::jsonb)
                                 ) as violation_item
                                 WHERE jsonb_array_length(violation_item->'wcagCriteria') > 0
                             ) wcag_extraction
                             WHERE wcag_tag ~ '^wcag[0-9]+$'
                             LIMIT 1),
                            -- Fallback to violations table
                            (SELECT DISTINCT v.wcag_criterion 
                             FROM violations v 
                             WHERE v.automated_result_id = atr.id 
                             AND v.wcag_criterion IS NOT NULL 
                             AND v.wcag_criterion != '' 
                             AND v.wcag_criterion ~ '^[0-9]+\\.[0-9]+\\.[0-9]+$'
                             LIMIT 1),
                            'general_axe'
                        )
                    ELSE 'general_automated'
                END as wcag_criterion
            FROM automated_test_results atr
            JOIN discovered_pages dp ON atr.page_id = dp.id
            WHERE atr.test_session_id = $1
            ORDER BY atr.tool_name, dp.url, atr.executed_at DESC
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
 * GET /api/results/page-results/:sessionId
 * Get comprehensive page-level test results for a session
 * Shows which pages passed/failed, tool coverage, violation details
 */
router.get('/page-results/:sessionId', authenticateToken, async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        
        // Get session info
        const sessionQuery = `
            SELECT ts.*, p.name as project_name, p.primary_url as project_url
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `;
        const sessionResult = await db.query(sessionQuery, [sessionId]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found'
            });
        }
        
        // Get comprehensive page test results
        const pageResultsQuery = `
            WITH page_test_summary AS (
                -- Get test results for each page and tool
                SELECT 
                    dp.url,
                    dp.title,
                    dp.page_type,
                    atr.tool_name,
                    COUNT(*) as total_tests,
                    SUM(atr.violations_count) as violations,
                    SUM(atr.passes_count) as passes,
                    MAX(atr.executed_at) as last_tested
                FROM discovered_pages dp
                LEFT JOIN automated_test_results atr ON dp.id = atr.page_id 
                    AND atr.test_session_id = $1
                WHERE dp.discovery_id IN (
                    SELECT discovery_id FROM test_sessions WHERE id = $1
                )
                GROUP BY dp.url, dp.title, dp.page_type, atr.tool_name
                ORDER BY dp.url, atr.tool_name
            ),
            page_status AS (
                -- Calculate status for each page
                SELECT 
                    url,
                    title,
                    page_type,
                    CASE 
                        WHEN SUM(violations) > 0 THEN 'failed'
                        WHEN SUM(total_tests) > 0 THEN 'passed'
                        ELSE 'not_tested'
                    END as status,
                    COUNT(DISTINCT tool_name) as tools_used,
                    SUM(violations) as total_violations,
                    SUM(passes) as total_passes,
                    SUM(total_tests) as total_tests,
                    MAX(last_tested) as last_tested,
                    CASE 
                        WHEN COUNT(DISTINCT tool_name) >= 3 THEN 100
                        WHEN COUNT(DISTINCT tool_name) = 2 THEN 75
                        WHEN COUNT(DISTINCT tool_name) = 1 THEN 50
                        ELSE 0
                    END as coverage_score
                FROM page_test_summary
                WHERE tool_name IS NOT NULL
                GROUP BY url, title, page_type
            )
            SELECT * FROM page_status
            ORDER BY 
                CASE status 
                    WHEN 'failed' THEN 1
                    WHEN 'passed' THEN 2
                    WHEN 'not_tested' THEN 3
                END,
                url
        `;
        
        const pageResults = await db.query(pageResultsQuery, [sessionId]);
        
        // Get violation details for failed pages
        const violationQuery = `
            SELECT 
                dp.url,
                atr.tool_name,
                atd.impact,
                atd.description,
                atd.help_url,
                atd.wcag_tags,
                COUNT(*) as occurrence_count
            FROM automated_test_results atr
            JOIN automated_test_details atd ON atr.id = atd.result_id
            JOIN discovered_pages dp ON atr.page_id = dp.id
            WHERE atr.test_session_id = $1 
                AND atr.violations_count > 0
            GROUP BY dp.url, atr.tool_name, atd.impact, atd.description, atd.help_url, atd.wcag_tags
            ORDER BY dp.url, atr.tool_name, 
                CASE atd.impact 
                    WHEN 'critical' THEN 1
                    WHEN 'serious' THEN 2
                    WHEN 'moderate' THEN 3
                    WHEN 'minor' THEN 4
                    ELSE 5
                END
        `;
        
        const violations = await db.query(violationQuery, [sessionId]);
        
        // Calculate summary statistics
        const summary = {
            total_pages: pageResults.rows.length,
            failed_pages: pageResults.rows.filter(p => p.status === 'failed').length,
            passed_pages: pageResults.rows.filter(p => p.status === 'passed').length,
            not_tested_pages: pageResults.rows.filter(p => p.status === 'not_tested').length,
            average_coverage: pageResults.rows.length > 0 
                ? Math.round(pageResults.rows.reduce((sum, p) => sum + (p.coverage_score || 0), 0) / pageResults.rows.length)
                : 0,
            total_violations: pageResults.rows.reduce((sum, p) => sum + (p.total_violations || 0), 0),
            total_passes: pageResults.rows.reduce((sum, p) => sum + (p.total_passes || 0), 0)
        };
        
        // Group violations by page and severity
        const violationsByPage = {};
        violations.rows.forEach(v => {
            if (!violationsByPage[v.url]) {
                violationsByPage[v.url] = {
                    critical: [],
                    serious: [],
                    moderate: [],
                    minor: []
                };
            }
            const severity = v.impact || 'minor';
            violationsByPage[v.url][severity].push(v);
        });
        
        res.json({
            success: true,
            session: sessionResult.rows[0],
            summary,
            pages: pageResults.rows,
            violations: violationsByPage
        });
        
    } catch (error) {
        console.error('Error fetching page results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch page results',
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
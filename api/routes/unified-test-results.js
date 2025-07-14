/**
 * Unified Test Results API Routes
 * Provides comprehensive access to all test results (automated + manual) for compliance sessions
 * Author: AI Assistant
 * Date: 2025-01-14
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vpat_db',
    user: process.env.DB_USER || 'vpat_user',
    password: process.env.DB_PASSWORD || 'vpat_password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * GET /api/unified-test-results/session/:sessionId
 * Get comprehensive test results summary for a compliance session
 */
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { 
            includeDetails = 'true', 
            testType = 'all',  // 'all', 'automated', 'manual'
            pageUrl,
            tool,
            browser
        } = req.query;

        console.log(`📊 Getting unified test results for session: ${sessionId}`);

        // Get session summary
        const summaryQuery = await pool.query(`
            SELECT * FROM compliance_session_test_results 
            WHERE session_id = $1
        `, [sessionId]);

        if (summaryQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found or no results available'
            });
        }

        const summary = summaryQuery.rows[0];

        let detailedResults = [];
        if (includeDetails === 'true') {
            let detailsQuery = `
                SELECT * FROM detailed_compliance_test_results 
                WHERE session_id = $1
            `;
            const queryParams = [sessionId];
            let paramIndex = 2;

            // Add filters
            if (testType !== 'all') {
                detailsQuery += ` AND test_type = $${paramIndex}`;
                queryParams.push(testType);
                paramIndex++;
            }

            if (pageUrl) {
                detailsQuery += ` AND page_url ILIKE $${paramIndex}`;
                queryParams.push(`%${pageUrl}%`);
                paramIndex++;
            }

            if (tool) {
                detailsQuery += ` AND test_tool = $${paramIndex}`;
                queryParams.push(tool);
                paramIndex++;
            }

            if (browser) {
                detailsQuery += ` AND browser_name = $${paramIndex}`;
                queryParams.push(browser);
                paramIndex++;
            }

            detailsQuery += ` ORDER BY page_url, test_executed_at DESC`;

            const detailsResult = await pool.query(detailsQuery, queryParams);
            detailedResults = detailsResult.rows;
        }

        // Get frontend test runs
        const testRunsQuery = await pool.query(`
            SELECT 
                id, run_name, test_suite, test_environment, status,
                started_at, completed_at, execution_duration_ms,
                total_tests_executed, tests_passed, tests_failed,
                total_violations_found, browsers_tested, viewports_tested
            FROM frontend_test_runs 
            WHERE test_session_id = $1 
            ORDER BY created_at DESC
        `, [sessionId]);

        // Get test coverage by WCAG criteria
        const wcagCoverageQuery = await pool.query(`
            SELECT 
                v.wcag_criterion,
                COUNT(DISTINCT atr.id) as automated_tests,
                COUNT(DISTINCT mtr.id) as manual_tests,
                SUM(CASE WHEN atr.violations_count = 0 AND mtr.result = 'pass' THEN 1 
                         WHEN atr.violations_count = 0 AND mtr.result IS NULL THEN 1
                         WHEN atr.violations_count IS NULL AND mtr.result = 'pass' THEN 1
                         ELSE 0 END) as passed_tests,
                SUM(CASE WHEN atr.violations_count > 0 OR mtr.result = 'fail' THEN 1 ELSE 0 END) as failed_tests
            FROM test_sessions ts
            LEFT JOIN automated_test_results atr ON ts.id = atr.test_session_id
            LEFT JOIN violations v ON atr.id = v.automated_result_id
            LEFT JOIN manual_test_results mtr ON ts.id = mtr.test_session_id
            WHERE ts.id = $1 AND v.wcag_criterion IS NOT NULL
            GROUP BY v.wcag_criterion
            ORDER BY v.wcag_criterion
        `, [sessionId]);

        // Compile comprehensive response
        const response = {
            success: true,
            sessionId: sessionId,
            summary: {
                ...summary,
                generatedAt: new Date().toISOString()
            },
            testRuns: {
                frontend: testRunsQuery.rows,
                total: testRunsQuery.rows.length
            },
            wcagCoverage: wcagCoverageQuery.rows,
            resultsSummary: {
                totalTests: summary.total_automated_tests + summary.total_manual_tests,
                automatedTests: {
                    total: summary.total_automated_tests,
                    frontend: summary.frontend_automated_tests,
                    backend: summary.backend_automated_tests,
                    violations: summary.total_automated_violations
                },
                manualTests: {
                    total: summary.total_manual_tests,
                    passed: summary.manual_tests_passed,
                    failed: summary.manual_tests_failed
                },
                overallCompliance: summary.compliance_percentage
            }
        };

        if (includeDetails === 'true') {
            response.detailedResults = detailedResults;
            response.pagination = {
                total: detailedResults.length,
                filters: { testType, pageUrl, tool, browser }
            };
        }

        res.json(response);

    } catch (error) {
        console.error('❌ Error getting unified test results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve test results'
        });
    }
});

/**
 * GET /api/unified-test-results/session/:sessionId/violations
 * Get all violations (automated + manual) for a compliance session
 */
router.get('/session/:sessionId/violations', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { severity, wcagCriterion, pageUrl, groupBy = 'page' } = req.query;

        console.log(`🔍 Getting violations for session: ${sessionId}`);

        let violationsQuery = `
            SELECT 
                v.id as violation_id,
                v.violation_type,
                v.severity,
                v.wcag_criterion,
                v.section_508_criterion,
                v.description,
                v.remediation_guidance,
                v.element_selector,
                v.element_html,
                v.help_url,
                v.created_at,
                
                -- Source information
                CASE 
                    WHEN v.automated_result_id IS NOT NULL THEN 'automated'
                    WHEN v.manual_result_id IS NOT NULL THEN 'manual'
                END as source_type,
                
                -- Page information
                dp.url as page_url,
                dp.title as page_title,
                
                -- Tool information (for automated)
                atr.tool_name,
                atr.browser_name,
                
                -- Manual test information
                mtr.tester_name,
                mtr.confidence_level
                
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            LEFT JOIN discovered_pages dp ON COALESCE(atr.page_id, mtr.page_id) = dp.id
            WHERE COALESCE(atr.test_session_id, mtr.test_session_id) = $1
        `;

        const queryParams = [sessionId];
        let paramIndex = 2;

        // Add filters
        if (severity) {
            violationsQuery += ` AND v.severity = $${paramIndex}`;
            queryParams.push(severity);
            paramIndex++;
        }

        if (wcagCriterion) {
            violationsQuery += ` AND v.wcag_criterion = $${paramIndex}`;
            queryParams.push(wcagCriterion);
            paramIndex++;
        }

        if (pageUrl) {
            violationsQuery += ` AND dp.url ILIKE $${paramIndex}`;
            queryParams.push(`%${pageUrl}%`);
            paramIndex++;
        }

        violationsQuery += ` ORDER BY v.severity DESC, dp.url, v.created_at DESC`;

        const violationsResult = await pool.query(violationsQuery, queryParams);
        const violations = violationsResult.rows;

        // Group violations if requested
        let groupedViolations = {};
        if (groupBy) {
            violations.forEach(violation => {
                let groupKey;
                switch (groupBy) {
                    case 'page':
                        groupKey = violation.page_url || 'Unknown Page';
                        break;
                    case 'severity':
                        groupKey = violation.severity || 'Unknown';
                        break;
                    case 'wcag':
                        groupKey = violation.wcag_criterion || 'No WCAG Mapping';
                        break;
                    case 'source':
                        groupKey = violation.source_type || 'Unknown Source';
                        break;
                    case 'tool':
                        groupKey = violation.tool_name || violation.tester_name || 'Unknown Tool';
                        break;
                    default:
                        groupKey = 'All';
                }

                if (!groupedViolations[groupKey]) {
                    groupedViolations[groupKey] = [];
                }
                groupedViolations[groupKey].push(violation);
            });
        }

        // Calculate statistics
        const statistics = {
            total: violations.length,
            bySeverity: {},
            bySource: {},
            byWCAG: {},
            byPage: {}
        };

        violations.forEach(violation => {
            // By severity
            const severity = violation.severity || 'unknown';
            statistics.bySeverity[severity] = (statistics.bySeverity[severity] || 0) + 1;

            // By source
            const source = violation.source_type || 'unknown';
            statistics.bySource[source] = (statistics.bySource[source] || 0) + 1;

            // By WCAG criterion
            const wcag = violation.wcag_criterion || 'unmapped';
            statistics.byWCAG[wcag] = (statistics.byWCAG[wcag] || 0) + 1;

            // By page
            const page = violation.page_url || 'unknown';
            statistics.byPage[page] = (statistics.byPage[page] || 0) + 1;
        });

        res.json({
            success: true,
            sessionId: sessionId,
            violations: groupBy ? groupedViolations : violations,
            statistics: statistics,
            filters: { severity, wcagCriterion, pageUrl, groupBy },
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting session violations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve violations'
        });
    }
});

/**
 * GET /api/unified-test-results/session/:sessionId/coverage
 * Get test coverage analysis for a compliance session
 */
router.get('/session/:sessionId/coverage', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { standard = 'wcag' } = req.query; // 'wcag' or 'section_508'

        console.log(`📋 Getting test coverage for session: ${sessionId}`);

        // Get WCAG coverage
        const wcagCoverageQuery = await pool.query(`
            WITH wcag_criteria AS (
                SELECT criterion_number, title, level 
                FROM wcag_requirements 
                WHERE status = 'active'
            ),
            tested_criteria AS (
                SELECT DISTINCT 
                    v.wcag_criterion,
                    COUNT(DISTINCT atr.id) as automated_tests,
                    COUNT(DISTINCT mtr.id) as manual_tests,
                    SUM(CASE WHEN atr.violations_count = 0 THEN 1 ELSE 0 END) as automated_passes,
                    SUM(CASE WHEN mtr.result = 'pass' THEN 1 ELSE 0 END) as manual_passes,
                    SUM(CASE WHEN atr.violations_count > 0 THEN 1 ELSE 0 END) as automated_failures,
                    SUM(CASE WHEN mtr.result = 'fail' THEN 1 ELSE 0 END) as manual_failures
                FROM violations v
                LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                WHERE COALESCE(atr.test_session_id, mtr.test_session_id) = $1
                AND v.wcag_criterion IS NOT NULL
                GROUP BY v.wcag_criterion
            )
            SELECT 
                wc.criterion_number,
                wc.title,
                wc.level,
                COALESCE(tc.automated_tests, 0) as automated_tests,
                COALESCE(tc.manual_tests, 0) as manual_tests,
                COALESCE(tc.automated_passes, 0) as automated_passes,
                COALESCE(tc.manual_passes, 0) as manual_passes,
                COALESCE(tc.automated_failures, 0) as automated_failures,
                COALESCE(tc.manual_failures, 0) as manual_failures,
                CASE 
                    WHEN COALESCE(tc.automated_tests, 0) + COALESCE(tc.manual_tests, 0) > 0 THEN 'tested'
                    ELSE 'not_tested'
                END as coverage_status
            FROM wcag_criteria wc
            LEFT JOIN tested_criteria tc ON wc.criterion_number = tc.wcag_criterion
            ORDER BY wc.criterion_number
        `, [sessionId]);

        // Get page coverage
        const pageCoverageQuery = await pool.query(`
            SELECT 
                dp.url,
                dp.title,
                dp.page_type,
                COUNT(DISTINCT atr.id) as automated_tests,
                COUNT(DISTINCT mtr.id) as manual_tests,
                COUNT(DISTINCT CASE WHEN atr.tool_name LIKE 'playwright%' THEN atr.id END) as frontend_tests,
                COUNT(DISTINCT CASE WHEN atr.tool_name IN ('axe', 'pa11y', 'lighthouse') THEN atr.id END) as backend_tests,
                SUM(atr.violations_count) as total_violations,
                COUNT(DISTINCT v.id) as unique_violations
            FROM discovered_pages dp
            LEFT JOIN automated_test_results atr ON dp.id = atr.page_id AND atr.test_session_id = $1
            LEFT JOIN manual_test_results mtr ON dp.id = mtr.page_id AND mtr.test_session_id = $1
            LEFT JOIN violations v ON atr.id = v.automated_result_id OR mtr.id = v.manual_result_id
            WHERE atr.id IS NOT NULL OR mtr.id IS NOT NULL
            GROUP BY dp.url, dp.title, dp.page_type
            ORDER BY dp.url
        `, [sessionId]);

        // Calculate coverage statistics
        const wcagCoverage = wcagCoverageQuery.rows;
        const pageCoverage = pageCoverageQuery.rows;

        const coverageStats = {
            wcag: {
                totalCriteria: wcagCoverage.length,
                testedCriteria: wcagCoverage.filter(c => c.coverage_status === 'tested').length,
                coveragePercentage: Math.round((wcagCoverage.filter(c => c.coverage_status === 'tested').length / wcagCoverage.length) * 100),
                byLevel: {
                    A: wcagCoverage.filter(c => c.level === 'A'),
                    AA: wcagCoverage.filter(c => c.level === 'AA'),
                    AAA: wcagCoverage.filter(c => c.level === 'AAA')
                }
            },
            pages: {
                totalPages: pageCoverage.length,
                fullyTestedPages: pageCoverage.filter(p => p.automated_tests > 0 && p.manual_tests > 0).length,
                automatedOnlyPages: pageCoverage.filter(p => p.automated_tests > 0 && p.manual_tests === 0).length,
                manualOnlyPages: pageCoverage.filter(p => p.automated_tests === 0 && p.manual_tests > 0).length
            },
            testing: {
                frontendCoverage: pageCoverage.filter(p => p.frontend_tests > 0).length,
                backendCoverage: pageCoverage.filter(p => p.backend_tests > 0).length,
                manualCoverage: pageCoverage.filter(p => p.manual_tests > 0).length
            }
        };

        res.json({
            success: true,
            sessionId: sessionId,
            standard: standard,
            wcagCoverage: wcagCoverage,
            pageCoverage: pageCoverage,
            coverageStatistics: coverageStats,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting test coverage:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve test coverage'
        });
    }
});

/**
 * POST /api/unified-test-results/session/:sessionId/import-playwright
 * Import existing Playwright reports into compliance session
 */
router.post('/session/:sessionId/import-playwright', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { reportPattern = 'playwright-*.json', cleanup = false } = req.body;

        console.log(`📥 Importing Playwright reports for session: ${sessionId}`);

        // Import using the PlaywrightIntegrationService
        const PlaywrightIntegrationService = require('../../database/services/playwright-integration-service');
        const integrationService = new PlaywrightIntegrationService();

        const importResults = await integrationService.processPlaywrightReports(sessionId, reportPattern);

        // Cleanup old reports if requested
        if (cleanup) {
            await integrationService.cleanupProcessedReports(7); // Clean files older than 7 days
        }

        res.json({
            success: true,
            sessionId: sessionId,
            importResults: importResults,
            message: `Successfully imported ${importResults.resultsStored} Playwright test results`
        });

    } catch (error) {
        console.error('❌ Error importing Playwright reports:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import Playwright reports'
        });
    }
});

/**
 * GET /api/unified-test-results/session/:sessionId/export
 * Export comprehensive test results for external use
 */
router.get('/session/:sessionId/export', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { format = 'json' } = req.query; // 'json', 'csv', 'xlsx'

        console.log(`📤 Exporting test results for session: ${sessionId}`);

        // Get comprehensive results
        const summaryQuery = await pool.query(`
            SELECT * FROM compliance_session_test_results WHERE session_id = $1
        `, [sessionId]);

        const detailsQuery = await pool.query(`
            SELECT * FROM detailed_compliance_test_results 
            WHERE session_id = $1 
            ORDER BY page_url, test_executed_at
        `, [sessionId]);

        if (summaryQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found'
            });
        }

        const exportData = {
            sessionSummary: summaryQuery.rows[0],
            detailedResults: detailsQuery.rows,
            exportMetadata: {
                generatedAt: new Date().toISOString(),
                sessionId: sessionId,
                format: format,
                totalResults: detailsQuery.rows.length
            }
        };

        // Set appropriate headers based on format
        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="test-results-${sessionId}.json"`);
            res.json(exportData);
        } else {
            // For other formats, return JSON with conversion instructions
            res.json({
                success: true,
                message: `JSON export ready. Additional formats (${format}) can be processed client-side.`,
                data: exportData
            });
        }

    } catch (error) {
        console.error('❌ Error exporting test results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export test results'
        });
    }
});

module.exports = router; 
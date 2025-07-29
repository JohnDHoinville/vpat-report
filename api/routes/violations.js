const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

// Use shared database configuration
const { DatabaseHelper } = require('../../database/config');
const pool = DatabaseHelper;

/**
 * GET /api/violations/session/:sessionId
 * Get all violations for a test session with advanced filtering
 */
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            severity,
            source, // 'automated', 'manual', 'both'
            tool,
            wcag_level,
            wcag_criteria,
            page_url,
            violation_type,
            status,
            limit = 100,
            offset = 0,
            sort_by = 'severity',
            sort_order = 'desc',
            group_by
        } = req.query;

        let query = `
            SELECT 
                v.*,
                atr.tool_name,
                atr.page_id as automated_page_id,
                mtr.page_id as manual_page_id,
                dp.url,
                dp.title as page_title,
                dp.page_type,
                mtr.tester_name,
                mtr.confidence_level,
                wr.criterion_number as wcag_criterion_number,
                wr.title as wcag_title,
                wr.level as wcag_level,
                sr.section_number as section_508_number,
                sr.title as section_508_title,
                CASE 
                    WHEN v.automated_result_id IS NOT NULL THEN 'automated'
                    WHEN v.manual_result_id IS NOT NULL THEN 'manual'
                END as source_type
            FROM violations v
            LEFT JOIN automated_tests atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_tests mtr ON v.manual_result_id = mtr.id
            LEFT JOIN crawler_discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
            LEFT JOIN wcag_requirements wr ON v.wcag_criterion = wr.criterion_number
            LEFT JOIN section_508_requirements sr ON v.section_508_criterion = sr.section_number
            WHERE (atr.test_session_id = $1 OR mtr.test_session_id = $1)
        `;

        const queryParams = [sessionId];
        let paramCount = 1;

        // Add filters
        if (severity) {
            paramCount++;
            query += ` AND v.severity = $${paramCount}`;
            queryParams.push(severity);
        }

        if (source && source !== 'both') {
            if (source === 'automated') {
                query += ` AND v.automated_result_id IS NOT NULL`;
            } else if (source === 'manual') {
                query += ` AND v.manual_result_id IS NOT NULL`;
            }
        }

        if (tool) {
            paramCount++;
            query += ` AND atr.tool_name = $${paramCount}`;
            queryParams.push(tool);
        }

        if (wcag_level) {
            paramCount++;
            query += ` AND wr.level = $${paramCount}`;
            queryParams.push(wcag_level);
        }

        if (wcag_criteria) {
            paramCount++;
            query += ` AND v.wcag_criterion = $${paramCount}`;
            queryParams.push(wcag_criteria);
        }

        if (page_url) {
            paramCount++;
            query += ` AND dp.url ILIKE $${paramCount}`;
            queryParams.push(`%${page_url}%`);
        }

        if (violation_type) {
            paramCount++;
            query += ` AND v.violation_type ILIKE $${paramCount}`;
            queryParams.push(`%${violation_type}%`);
        }

        if (status) {
            paramCount++;
            query += ` AND v.status = $${paramCount}`;
            queryParams.push(status);
        }

        // Add sorting
        const validSortFields = ['severity', 'created_at', 'wcag_criterion', 'page_title', 'source_type'];
        const validSortOrders = ['asc', 'desc'];
        
        if (validSortFields.includes(sort_by) && validSortOrders.includes(sort_order)) {
            // Special sorting for severity
            if (sort_by === 'severity') {
                query += ` ORDER BY 
                    CASE v.severity 
                        WHEN 'critical' THEN 1
                        WHEN 'serious' THEN 2 
                        WHEN 'moderate' THEN 3
                        WHEN 'minor' THEN 4
                        ELSE 5
                    END ${sort_order}`;
            } else {
                query += ` ORDER BY ${sort_by} ${sort_order}`;
            }
        }

        // Add pagination
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, queryParams);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(DISTINCT v.id) as total
            FROM violations v
            LEFT JOIN automated_tests atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_tests mtr ON v.manual_result_id = mtr.id
            LEFT JOIN crawler_discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
            LEFT JOIN wcag_requirements wr ON v.wcag_criterion = wr.criterion_number
            WHERE (atr.test_session_id = $1 OR mtr.test_session_id = $1)
        `;

        // Apply same filters to count query (exclude pagination params)
        const countParams = [sessionId];
        let countParamCount = 1;

        // Rebuild the same filters for count query
        if (severity) {
            countParamCount++;
            countQuery += ` AND v.severity = $${countParamCount}`;
            countParams.push(severity);
        }

        if (source && source !== 'both') {
            if (source === 'automated') {
                countQuery += ` AND v.automated_result_id IS NOT NULL`;
            } else if (source === 'manual') {
                countQuery += ` AND v.manual_result_id IS NOT NULL`;
            }
        }

        if (tool) {
            countParamCount++;
            countQuery += ` AND atr.tool_name = $${countParamCount}`;
            countParams.push(tool);
        }

        if (wcag_level) {
            countParamCount++;
            countQuery += ` AND wr.level = $${countParamCount}`;
            countParams.push(wcag_level);
        }

        if (wcag_criteria) {
            countParamCount++;
            countQuery += ` AND v.wcag_criterion = $${countParamCount}`;
            countParams.push(wcag_criteria);
        }

        if (page_url) {
            countParamCount++;
            countQuery += ` AND dp.url ILIKE $${countParamCount}`;
            countParams.push(`%${page_url}%`);
        }

        if (violation_type) {
            countParamCount++;
            countQuery += ` AND v.violation_type ILIKE $${countParamCount}`;
            countParams.push(`%${violation_type}%`);
        }

        if (status) {
            countParamCount++;
            countQuery += ` AND v.status = $${countParamCount}`;
            countParams.push(status);
        }

        const countResult = await pool.query(countQuery, countParams);

        res.json({
            violations: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: parseInt(offset) + parseInt(limit) < parseInt(countResult.rows[0].total)
            }
        });

    } catch (error) {
        console.error('Error getting session violations:', error);
        res.status(500).json({ error: 'Failed to retrieve violations' });
    }
});

/**
 * GET /api/violations/session/:sessionId/summary
 * Get violation summary statistics for a session
 */
router.get('/session/:sessionId/summary', async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Get violation counts by severity
        const severityQuery = `
            SELECT 
                v.severity,
                COUNT(*) as count
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            WHERE atr.test_session_id = $1 OR mtr.test_session_id = $1
            GROUP BY v.severity
            ORDER BY 
                CASE v.severity 
                    WHEN 'critical' THEN 1
                    WHEN 'serious' THEN 2 
                    WHEN 'moderate' THEN 3
                    WHEN 'minor' THEN 4
                    ELSE 5
                END
        `;

        // Get violation counts by source
        const sourceQuery = `
            SELECT 
                CASE 
                    WHEN v.automated_result_id IS NOT NULL THEN 'automated'
                    WHEN v.manual_result_id IS NOT NULL THEN 'manual'
                END as source_type,
                COUNT(*) as count
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            WHERE atr.test_session_id = $1 OR mtr.test_session_id = $1
            GROUP BY source_type
        `;

        // Get violation counts by WCAG level
        const wcagLevelQuery = `
            SELECT 
                wr.level as wcag_level,
                COUNT(*) as count
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            LEFT JOIN wcag_requirements wr ON v.wcag_criterion = wr.criterion_number
            WHERE (atr.test_session_id = $1 OR mtr.test_session_id = $1) AND wr.level IS NOT NULL
            GROUP BY wr.level
            ORDER BY wr.level
        `;

        // Get violation counts by page
        const pageQuery = `
            SELECT 
                dp.url,
                dp.title,
                COUNT(*) as violation_count
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
            WHERE atr.test_session_id = $1 OR mtr.test_session_id = $1
            GROUP BY dp.url, dp.title
            ORDER BY violation_count DESC
            LIMIT 10
        `;

        // Get most common violation types
        const violationTypesQuery = `
            SELECT 
                v.violation_type,
                v.wcag_criterion,
                wr.title as wcag_title,
                COUNT(*) as count
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            LEFT JOIN wcag_requirements wr ON v.wcag_criterion = wr.criterion_number
            WHERE atr.test_session_id = $1 OR mtr.test_session_id = $1
            GROUP BY v.violation_type, v.wcag_criterion, wr.title
            ORDER BY count DESC
            LIMIT 10
        `;

        // Get violation counts by tool (for automated violations)
        const toolQuery = `
            SELECT 
                atr.tool_name,
                COUNT(*) as count
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            WHERE atr.test_session_id = $1 AND atr.tool_name IS NOT NULL
            GROUP BY atr.tool_name
            ORDER BY count DESC
        `;

        const [severityResult, sourceResult, wcagLevelResult, pageResult, violationTypesResult, toolResult] = await Promise.all([
            pool.query(severityQuery, [sessionId]),
            pool.query(sourceQuery, [sessionId]),
            pool.query(wcagLevelQuery, [sessionId]),
            pool.query(pageQuery, [sessionId]),
            pool.query(violationTypesQuery, [sessionId]),
            pool.query(toolQuery, [sessionId])
        ]);

        res.json({
            by_severity: severityResult.rows,
            by_source: sourceResult.rows,
            by_wcag_level: wcagLevelResult.rows,
            by_page: pageResult.rows,
            by_tool: toolResult.rows,
            common_violations: violationTypesResult.rows
        });

    } catch (error) {
        console.error('Error getting violation summary:', error);
        res.status(500).json({ error: 'Failed to retrieve violation summary' });
    }
});

/**
 * GET /api/violations/:violationId
 * Get detailed information about a specific violation
 */
router.get('/:violationId', async (req, res) => {
    try {
        const { violationId } = req.params;

        const query = `
            SELECT 
                v.*,
                atr.tool_name,
                atr.tool_version,
                atr.raw_results,
                atr.test_duration_ms,
                atr.executed_at as automated_test_date,
                mtr.tester_name,
                mtr.confidence_level,
                mtr.notes as manual_notes,
                mtr.evidence as manual_evidence,
                mtr.tested_at as manual_test_date,
                dp.url,
                dp.title as page_title,
                dp.page_type,
                dp.http_status,
                wr.criterion_number as wcag_criterion_number,
                wr.title as wcag_title,
                wr.description as wcag_description,
                wr.level as wcag_level,
                sr.section_number as section_508_number,
                sr.title as section_508_title,
                sr.description as section_508_description,
                CASE 
                    WHEN v.automated_result_id IS NOT NULL THEN 'automated'
                    WHEN v.manual_result_id IS NOT NULL THEN 'manual'
                END as source_type
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
            LEFT JOIN wcag_requirements wr ON v.wcag_criterion = wr.criterion_number
            LEFT JOIN section_508_requirements sr ON v.section_508_criterion = sr.section_number
            WHERE v.id = $1
        `;

        const result = await pool.query(query, [violationId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Violation not found' });
        }

        const violation = result.rows[0];

        // Get similar violations (same violation type, different pages)
        const similarQuery = `
            SELECT 
                v.id,
                v.severity,
                v.description,
                dp.url,
                dp.title as page_title,
                CASE 
                    WHEN v.automated_result_id IS NOT NULL THEN 'automated'
                    WHEN v.manual_result_id IS NOT NULL THEN 'manual'
                END as source_type
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
            WHERE v.violation_type = $1 AND v.id != $2
            ORDER BY v.created_at DESC
            LIMIT 5
        `;

        const similarResult = await pool.query(similarQuery, [violation.violation_type, violationId]);

        // Get WCAG requirement details if available
        let wcagRequirement = null;
        if (violation.wcag_criterion) {
            const wcagQuery = `
                SELECT 
                    criterion_number,
                    title,
                    description,
                    level,
                    understanding_url,
                    manual_test_procedure
                FROM wcag_requirements 
                WHERE criterion_number = $1
            `;
            const wcagResult = await pool.query(wcagQuery, [violation.wcag_criterion]);
            wcagRequirement = wcagResult.rows[0] || null;
        }

        // Get violation history for same page and criterion
        let violationHistory = [];
        if (violation.wcag_criterion) {
            const historyQuery = `
                SELECT 
                    v.id,
                    v.severity,
                    v.status,
                    v.created_at,
                    atr.tool_name,
                    CASE 
                        WHEN v.automated_result_id IS NOT NULL THEN 'automated'
                        WHEN v.manual_result_id IS NOT NULL THEN 'manual'
                    END as source_type
                FROM violations v
                LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
                WHERE v.wcag_criterion = $1 
                AND dp.url = $2 
                AND v.id != $3
                ORDER BY v.created_at DESC
                LIMIT 10
            `;
            const historyResult = await pool.query(historyQuery, [violation.wcag_criterion, violation.url, violationId]);
            violationHistory = historyResult.rows;
        }

        res.json({
            violation,
            similar_violations: similarResult.rows,
            wcag_requirement: wcagRequirement,
            violation_history: violationHistory
        });

    } catch (error) {
        console.error('Error getting violation details:', error);
        res.status(500).json({ error: 'Failed to retrieve violation details' });
    }
});

/**
 * PUT /api/violations/:violationId/status
 * Update violation status (for remediation tracking)
 */
router.put('/:violationId/status', async (req, res) => {
    try {
        const { violationId } = req.params;
        const { status, resolution_notes } = req.body;

        const validStatuses = ['open', 'in_progress', 'resolved', 'wont_fix', 'duplicate'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const updateFields = ['status = $2'];
        const queryParams = [violationId, status];
        let paramCount = 2;

        if (resolution_notes) {
            paramCount++;
            updateFields.push(`resolution_notes = $${paramCount}`);
            queryParams.push(resolution_notes);
        }

        if (status === 'resolved') {
            paramCount++;
            updateFields.push(`resolved_at = $${paramCount}`);
            queryParams.push(new Date());
        }

        const query = `
            UPDATE violations 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, queryParams);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Violation not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error updating violation status:', error);
        res.status(500).json({ error: 'Failed to update violation status' });
    }
});

/**
 * GET /api/violations/session/:sessionId/export
 * Export violations as CSV or JSON
 */
router.get('/session/:sessionId/export', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { format = 'json' } = req.query;

        const query = `
            SELECT 
                v.id,
                v.violation_type,
                v.severity,
                v.wcag_criterion,
                v.section_508_criterion,
                v.description,
                v.remediation_guidance,
                v.element_selector,
                v.help_url,
                v.status,
                v.created_at,
                dp.url as page_url,
                dp.title as page_title,
                atr.tool_name,
                mtr.tester_name,
                wr.title as wcag_title,
                wr.level as wcag_level,
                CASE 
                    WHEN v.automated_result_id IS NOT NULL THEN 'automated'
                    WHEN v.manual_result_id IS NOT NULL THEN 'manual'
                END as source_type
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
            LEFT JOIN wcag_requirements wr ON v.wcag_criterion = wr.criterion_number
            WHERE atr.test_session_id = $1 OR mtr.test_session_id = $1
            ORDER BY 
                CASE v.severity 
                    WHEN 'critical' THEN 1
                    WHEN 'serious' THEN 2 
                    WHEN 'moderate' THEN 3
                    WHEN 'minor' THEN 4
                    ELSE 5
                END,
                dp.url
        `;

        const result = await pool.query(query, [sessionId]);

        if (format === 'csv') {
            const csv = convertToCSV(result.rows);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="violations-${sessionId}.csv"`);
            res.send(csv);
        } else {
            res.json({
                session_id: sessionId,
                exported_at: new Date().toISOString(),
                violations: result.rows
            });
        }

    } catch (error) {
        console.error('Error exporting violations:', error);
        res.status(500).json({ error: 'Failed to export violations' });
    }
});

// Helper function to convert JSON to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

/**
 * GET /api/violations/wcag-requirements/:criterion
 * Get WCAG requirement information for a specific criterion
 */
router.get('/wcag-requirements/:criterion', async (req, res) => {
    try {
        const { criterion } = req.params;

        const query = `
            SELECT 
                criterion_number,
                title,
                description,
                level,
                understanding_url,
                guideline_title
            FROM wcag_requirements
            WHERE criterion_number = $1
        `;

        const result = await pool.query(query, [criterion]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'WCAG requirement not found' });
        }

        res.json({ 
            success: true,
            requirement: result.rows[0]
        });

    } catch (error) {
        console.error('Error getting WCAG requirement:', error);
        res.status(500).json({ error: 'Failed to retrieve WCAG requirement' });
    }
});

/**
 * POST /api/violations/history
 * Get violation history for a specific WCAG criterion and page
 */
router.post('/history', async (req, res) => {
    try {
        const { wcag_criterion, page_url, session_id } = req.body;

        const query = `
            SELECT 
                v.id,
                v.severity,
                v.description,
                v.notes,
                v.status,
                v.created_at,
                atr.tool_name,
                atr.tool_version,
                ts.session_name,
                ts.created_at as session_created
            FROM violations v
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN discovered_pages dp ON atr.page_id = dp.id
            LEFT JOIN test_sessions ts ON atr.test_session_id = ts.id
            WHERE v.wcag_criterion = $1 
            AND dp.url = $2
            AND ts.id != $3
            ORDER BY v.detected_at DESC
            LIMIT 10
        `;

        const result = await pool.query(query, [wcag_criterion, page_url, session_id]);

        res.json({ 
            success: true,
            history: result.rows
        });

    } catch (error) {
        console.error('Error getting violation history:', error);
        res.status(500).json({ error: 'Failed to retrieve violation history' });
    }
});

/**
 * PUT /api/violations/:id/update
 * Update violation notes and status
 */
router.put('/:id/update', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, status } = req.body;

        const query = `
            UPDATE violations 
            SET 
                notes = $1,
                status = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;

        const result = await pool.query(query, [notes, status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Violation not found' });
        }

        res.json({ 
            success: true,
            violation: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating violation:', error);
        res.status(500).json({ error: 'Failed to update violation' });
    }
});

/**
 * GET /api/violations/session/:sessionId/all-results
 * Get ALL test results (both passed and failed) for a session
 */
router.get('/session/:sessionId/all-results', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { page = 1, limit = 50, severity, wcag_criterion, tool_name, result_type = 'all' } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Build WHERE clauses for filtering
        let whereConditions = [];
        let params = [sessionId];
        let paramCount = 1;

        if (severity) {
            paramCount++;
            whereConditions.push(`v.severity = $${paramCount}`);
            params.push(severity);
        }

        if (wcag_criterion) {
            paramCount++;
            whereConditions.push(`v.wcag_criterion = $${paramCount}`);
            params.push(wcag_criterion);
        }

        if (tool_name) {
            paramCount++;
            whereConditions.push(`v.tool_name = $${paramCount}`);
            params.push(tool_name);
        }

        const whereClause = whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : '';

        // Build query based on result_type filter
        let query;
        let countQuery;

        if (result_type === 'fail') {
            // Only failures (existing violations)
            query = `
                SELECT 
                    v.id,
                    v.violation_type as test_name,
                    'fail' as result,
                    v.severity,
                    v.wcag_criterion,
                    v.section_508_criterion,
                    v.element_selector,
                    v.element_html,
                    v.description,
                    v.remediation_guidance,
                    v.help_url,
                    v.created_at,
                    dp.url as page_url,
                    dp.title as page_title,
                    atr.tool_name,
                    mtr.tester_name,
                    mtr.confidence_level,
                    mtr.notes as manual_notes,
                    'violation' as result_type
                FROM violations v
                LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
                WHERE (atr.test_session_id = $1 OR mtr.test_session_id = $1)
                ${whereClause}
                ORDER BY v.created_at DESC, dp.url
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;
            
            countQuery = `
                SELECT COUNT(*) as total
                FROM violations v
                LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                WHERE (atr.test_session_id = $1 OR mtr.test_session_id = $1)
                ${whereClause}
            `;
        } else if (result_type === 'pass') {
            // Only passes (manual passes + automated passes extracted from raw_results)
            query = `
                SELECT * FROM (
                    -- Manual test passes
                    SELECT 
                        mtr.id,
                        CASE 
                            WHEN wr.title IS NOT NULL THEN wr.title
                            WHEN sr.title IS NOT NULL THEN sr.title
                            ELSE 'Manual Test'
                        END as test_name,
                        'pass' as result,
                        'n/a' as severity,
                        wr.criterion_number as wcag_criterion,
                        sr.section_number as section_508_criterion,
                        NULL as element_selector,
                        NULL as element_html,
                        mtr.notes as description,
                        NULL as remediation_guidance,
                        NULL as help_url,
                        mtr.tested_at as created_at,
                        dp.url as page_url,
                        dp.title as page_title,
                        'manual' as tool_name,
                        mtr.tester_name,
                        mtr.confidence_level,
                        mtr.notes as manual_notes,
                        'manual_pass' as result_type
                    FROM manual_test_results mtr
                    JOIN discovered_pages dp ON mtr.page_id = dp.id
                    LEFT JOIN wcag_requirements wr ON mtr.requirement_id = wr.id AND mtr.requirement_type = 'wcag'
                    LEFT JOIN section_508_requirements sr ON mtr.requirement_id = sr.id AND mtr.requirement_type = 'section_508'
                    WHERE mtr.test_session_id = $1 AND mtr.result = 'pass'

                    UNION ALL

                    -- Automated test passes (extracted from raw_results)
                    SELECT 
                        atr.id,
                        passed_test.rule_id as test_name,
                        'pass' as result,
                        'n/a' as severity,
                        passed_test.wcag_criterion,
                        NULL as section_508_criterion,
                        passed_test.element_selector,
                        passed_test.element_html,
                        passed_test.description,
                        passed_test.help_text as remediation_guidance,
                        passed_test.help_url,
                        atr.executed_at as created_at,
                        dp.url as page_url,
                        dp.title as page_title,
                        atr.tool_name,
                        NULL as tester_name,
                        'high' as confidence_level,
                        NULL as manual_notes,
                        'automated_pass' as result_type
                    FROM automated_test_results atr
                    JOIN discovered_pages dp ON atr.page_id = dp.id
                    CROSS JOIN LATERAL (
                        -- Extract detailed pass data when available as array
                        SELECT 
                            COALESCE(pass_item->>'id', 'automated-pass') as rule_id,
                            COALESCE(pass_item->>'description', 'Automated test passed') as description,
                            COALESCE(pass_item->>'help', 'This test passed successfully') as help_text,
                            pass_item->>'helpUrl' as help_url,
                            CASE 
                                WHEN pass_item->'tags' ? '1.1.1' THEN '1.1.1'
                                WHEN pass_item->'tags' ? '1.3.1' THEN '1.3.1'
                                WHEN pass_item->'tags' ? '1.4.3' THEN '1.4.3'
                                WHEN pass_item->'tags' ? '2.1.1' THEN '2.1.1'
                                WHEN pass_item->'tags' ? '2.4.1' THEN '2.4.1'
                                WHEN pass_item->'tags' ? '3.1.1' THEN '3.1.1'
                                WHEN pass_item->'tags' ? '4.1.1' THEN '4.1.1'
                                WHEN pass_item->'tags' ? '4.1.2' THEN '4.1.2'
                                ELSE NULL
                            END as wcag_criterion,
                            COALESCE(
                                pass_item->'nodes'->0->>'target',
                                'body'
                            ) as element_selector,
                            COALESCE(
                                pass_item->'nodes'->0->>'html',
                                ''
                            ) as element_html
                        FROM jsonb_array_elements(
                            CASE 
                                WHEN jsonb_typeof(COALESCE(atr.raw_results->'result'->'passes', atr.raw_results->'passes')) = 'array' 
                                THEN COALESCE(atr.raw_results->'result'->'passes', atr.raw_results->'passes')
                                ELSE '[]'::jsonb
                            END
                        ) as pass_item
                        WHERE jsonb_typeof(COALESCE(atr.raw_results->'result'->'passes', atr.raw_results->'passes')) = 'array'
                        
                        UNION ALL
                        
                        -- Generate summary entries when passes is scalar
                        SELECT 
                            (atr.tool_name || '-pass-' || generate_series.num) as rule_id,
                            (atr.tool_name || ' automated test passed') as description,
                            'This automated test passed successfully' as help_text,
                            NULL as help_url,
                            NULL as wcag_criterion,
                            'body' as element_selector,
                            '' as element_html
                        FROM generate_series(1, LEAST(atr.passes_count, 10)) as generate_series(num)
                        WHERE jsonb_typeof(COALESCE(atr.raw_results->'result'->'passes', atr.raw_results->'passes')) != 'array'
                        AND atr.passes_count > 0
                    ) as passed_test
                    WHERE atr.test_session_id = $1 AND atr.passes_count > 0
                ) all_passes
                ${whereClause.replace(/v\./g, 'all_passes.')}
                ORDER BY created_at DESC, page_url
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            countQuery = `
                SELECT COUNT(*) as total FROM (
                    SELECT mtr.id FROM manual_test_results mtr
                    WHERE mtr.test_session_id = $1 AND mtr.result = 'pass'
                    
                    UNION ALL
                    
                    -- Count automated pass entries based on passes_count
                    SELECT 
                        (atr.id::text || '-' || generate_series.num) as synthetic_id
                    FROM automated_test_results atr
                    CROSS JOIN generate_series(1, LEAST(atr.passes_count, 10)) as generate_series(num)
                    WHERE atr.test_session_id = $1 AND atr.passes_count > 0
                ) all_passes
            `;
        } else {
            // All results (both passes and failures)
            query = `
                SELECT * FROM (
                    -- Failed tests (violations)
                    SELECT 
                        v.id,
                        v.violation_type as test_name,
                        'fail' as result,
                        v.severity,
                        v.wcag_criterion,
                        v.section_508_criterion,
                        v.element_selector,
                        v.element_html,
                        v.description,
                        v.remediation_guidance,
                        v.help_url,
                        v.created_at,
                        dp.url as page_url,
                        dp.title as page_title,
                        COALESCE(atr.tool_name, 'manual') as tool_name,
                        mtr.tester_name,
                        mtr.confidence_level,
                        mtr.notes as manual_notes,
                        CASE WHEN atr.id IS NOT NULL THEN 'automated_fail' ELSE 'manual_fail' END as result_type
                    FROM violations v
                    LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                    LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                    LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
                    WHERE (atr.test_session_id = $1 OR mtr.test_session_id = $1)

                    UNION ALL

                    -- Manual test passes
                    SELECT 
                        mtr.id,
                        CASE 
                            WHEN wr.title IS NOT NULL THEN wr.title
                            WHEN sr.title IS NOT NULL THEN sr.title
                            ELSE 'Manual Test'
                        END as test_name,
                        'pass' as result,
                        'n/a' as severity,
                        wr.criterion_number as wcag_criterion,
                        sr.section_number as section_508_criterion,
                        NULL as element_selector,
                        NULL as element_html,
                        mtr.notes as description,
                        NULL as remediation_guidance,
                        NULL as help_url,
                        mtr.tested_at as created_at,
                        dp.url as page_url,
                        dp.title as page_title,
                        'manual' as tool_name,
                        mtr.tester_name,
                        mtr.confidence_level,
                        mtr.notes as manual_notes,
                        'manual_pass' as result_type
                    FROM manual_test_results mtr
                    JOIN discovered_pages dp ON mtr.page_id = dp.id
                    LEFT JOIN wcag_requirements wr ON mtr.requirement_id = wr.id AND mtr.requirement_type = 'wcag'
                    LEFT JOIN section_508_requirements sr ON mtr.requirement_id = sr.id AND mtr.requirement_type = 'section_508'
                    WHERE mtr.test_session_id = $1 AND mtr.result = 'pass'

                    UNION ALL

                    -- Automated test passes (extracted from raw_results)
                    SELECT 
                        atr.id,
                        passed_test.rule_id as test_name,
                        'pass' as result,
                        'n/a' as severity,
                        passed_test.wcag_criterion,
                        NULL as section_508_criterion,
                        passed_test.element_selector,
                        passed_test.element_html,
                        passed_test.description,
                        passed_test.help_text as remediation_guidance,
                        passed_test.help_url,
                        atr.executed_at as created_at,
                        dp.url as page_url,
                        dp.title as page_title,
                        atr.tool_name,
                        NULL as tester_name,
                        'high' as confidence_level,
                        NULL as manual_notes,
                        'automated_pass' as result_type
                    FROM automated_test_results atr
                    JOIN discovered_pages dp ON atr.page_id = dp.id
                    CROSS JOIN LATERAL (
                        -- Extract detailed pass data when available as array
                        SELECT 
                            COALESCE(pass_item->>'id', 'automated-pass') as rule_id,
                            COALESCE(pass_item->>'description', 'Automated test passed') as description,
                            COALESCE(pass_item->>'help', 'This test passed successfully') as help_text,
                            pass_item->>'helpUrl' as help_url,
                            CASE 
                                WHEN pass_item->'tags' ? '1.1.1' THEN '1.1.1'
                                WHEN pass_item->'tags' ? '1.3.1' THEN '1.3.1'
                                WHEN pass_item->'tags' ? '1.4.3' THEN '1.4.3'
                                WHEN pass_item->'tags' ? '2.1.1' THEN '2.1.1'
                                WHEN pass_item->'tags' ? '2.4.1' THEN '2.4.1'
                                WHEN pass_item->'tags' ? '3.1.1' THEN '3.1.1'
                                WHEN pass_item->'tags' ? '4.1.1' THEN '4.1.1'
                                WHEN pass_item->'tags' ? '4.1.2' THEN '4.1.2'
                                ELSE NULL
                            END as wcag_criterion,
                            COALESCE(
                                pass_item->'nodes'->0->>'target',
                                'body'
                            ) as element_selector,
                            COALESCE(
                                pass_item->'nodes'->0->>'html',
                                ''
                            ) as element_html
                        FROM jsonb_array_elements(
                            CASE 
                                WHEN jsonb_typeof(COALESCE(atr.raw_results->'result'->'passes', atr.raw_results->'passes')) = 'array' 
                                THEN COALESCE(atr.raw_results->'result'->'passes', atr.raw_results->'passes')
                                ELSE '[]'::jsonb
                            END
                        ) as pass_item
                        WHERE jsonb_typeof(COALESCE(atr.raw_results->'result'->'passes', atr.raw_results->'passes')) = 'array'
                        
                        UNION ALL
                        
                        -- Generate summary entries when passes is scalar
                        SELECT 
                            (atr.tool_name || '-pass-' || generate_series.num) as rule_id,
                            (atr.tool_name || ' automated test passed') as description,
                            'This automated test passed successfully' as help_text,
                            NULL as help_url,
                            NULL as wcag_criterion,
                            'body' as element_selector,
                            '' as element_html
                        FROM generate_series(1, LEAST(atr.passes_count, 10)) as generate_series(num)
                        WHERE jsonb_typeof(COALESCE(atr.raw_results->'result'->'passes', atr.raw_results->'passes')) != 'array'
                        AND atr.passes_count > 0
                    ) as passed_test
                    WHERE atr.test_session_id = $1 AND atr.passes_count > 0
                ) all_results
                ${whereClause.replace(/v\./g, 'all_results.')}
                ORDER BY created_at DESC, page_url
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            countQuery = `
                SELECT COUNT(*) as total FROM (
                    SELECT v.id::text as result_id FROM violations v
                    LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                    LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                    WHERE (atr.test_session_id = $1 OR mtr.test_session_id = $1)
                    
                    UNION ALL
                    
                    SELECT mtr.id::text as result_id FROM manual_test_results mtr
                    WHERE mtr.test_session_id = $1 AND mtr.result = 'pass'
                    
                    UNION ALL
                    
                    -- Count automated pass entries based on passes_count
                    SELECT 
                        (atr.id::text || '-' || generate_series.num) as result_id
                    FROM automated_test_results atr
                    CROSS JOIN generate_series(1, LEAST(atr.passes_count, 10)) as generate_series(num)
                    WHERE atr.test_session_id = $1 AND atr.passes_count > 0
                ) all_results
            `;
        }

        // Add pagination parameters
        params.push(limit, offset);

        // Execute queries
        const [results, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, params.slice(0, -2)) // Remove limit/offset for count
        ]);

        const totalResults = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalResults / limit);

        res.json({
            success: true,
            data: results.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResults,
                pages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: {
                result_type,
                severity,
                wcag_criterion,
                tool_name
            }
        });

    } catch (error) {
        console.error('❌ Error fetching all test results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test results'
        });
    }
});

/**
 * GET /api/violations/session/:sessionId/all-results/summary
 * Get summary statistics for all test results (passed and failed)
 */
router.get('/session/:sessionId/all-results/summary', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { result_type = 'all' } = req.query;

        let query;
        
        if (result_type === 'fail') {
            // Only failures summary
            query = `
                SELECT 
                    COUNT(*) as total_results,
                    COUNT(*) as total_violations,
                    0 as total_passes,
                    COUNT(DISTINCT CASE WHEN atr.tool_name IS NOT NULL THEN atr.tool_name ELSE 'manual' END) as tools_used,
                    COUNT(DISTINCT dp.url) as pages_affected,
                    COUNT(CASE WHEN v.severity = 'critical' THEN 1 END) as critical_count,
                    COUNT(CASE WHEN v.severity = 'serious' THEN 1 END) as serious_count,
                    COUNT(CASE WHEN v.severity = 'moderate' THEN 1 END) as moderate_count,
                    COUNT(CASE WHEN v.severity = 'minor' THEN 1 END) as minor_count
                FROM violations v
                LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
                WHERE (atr.test_session_id = $1 OR mtr.test_session_id = $1)
            `;
        } else if (result_type === 'pass') {
            // Only passes summary
            query = `
                SELECT 
                    COUNT(*) as total_results,
                    0 as total_violations,
                    COUNT(*) as total_passes,
                    COUNT(DISTINCT tool_name) as tools_used,
                    COUNT(DISTINCT page_url) as pages_affected,
                    0 as critical_count,
                    0 as serious_count,
                    0 as moderate_count,
                    0 as minor_count
                FROM (
                    SELECT 'manual' as tool_name, dp.url as page_url
                    FROM manual_test_results mtr
                    JOIN discovered_pages dp ON mtr.page_id = dp.id
                    WHERE mtr.test_session_id = $1 AND mtr.result = 'pass'
                    
                    UNION ALL
                    
                    SELECT atr.tool_name, dp.url as page_url
                    FROM automated_test_results atr
                    JOIN discovered_pages dp ON atr.page_id = dp.id
                    CROSS JOIN LATERAL (
                        SELECT 1 FROM jsonb_array_elements(
                            COALESCE(atr.raw_results->'result'->'passes', atr.raw_results->'passes', '[]'::jsonb)
                        )
                    ) as passed_test
                    WHERE atr.test_session_id = $1 AND atr.passes_count > 0
                ) all_passes
            `;
        } else {
            // All results summary
            query = `
                WITH violation_summary AS (
                    SELECT 
                        COUNT(*) as violation_count,
                        COUNT(DISTINCT CASE WHEN atr.tool_name IS NOT NULL THEN atr.tool_name ELSE 'manual' END) as violation_tools,
                        COUNT(DISTINCT dp.url) as violation_pages,
                        COUNT(CASE WHEN v.severity = 'critical' THEN 1 END) as critical_count,
                        COUNT(CASE WHEN v.severity = 'serious' THEN 1 END) as serious_count,
                        COUNT(CASE WHEN v.severity = 'moderate' THEN 1 END) as moderate_count,
                        COUNT(CASE WHEN v.severity = 'minor' THEN 1 END) as minor_count
                    FROM violations v
                    LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                    LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                    LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
                    WHERE (atr.test_session_id = $1 OR mtr.test_session_id = $1)
                ),
                pass_summary AS (
                    SELECT 
                        COUNT(*) as pass_count,
                        COUNT(DISTINCT tool_name) as pass_tools,
                        COUNT(DISTINCT page_url) as pass_pages
                    FROM (
                        SELECT 'manual' as tool_name, dp.url as page_url
                        FROM manual_test_results mtr
                        JOIN discovered_pages dp ON mtr.page_id = dp.id
                        WHERE mtr.test_session_id = $1 AND mtr.result = 'pass'
                        
                        UNION ALL
                        
                        SELECT atr.tool_name, dp.url as page_url
                        FROM automated_test_results atr
                        JOIN discovered_pages dp ON atr.page_id = dp.id
                        CROSS JOIN LATERAL (
                            SELECT 1 FROM jsonb_array_elements(
                                COALESCE(atr.raw_results->'result'->'passes', atr.raw_results->'passes', '[]'::jsonb)
                            )
                        ) as passed_test
                        WHERE atr.test_session_id = $1 AND atr.passes_count > 0
                    ) all_passes
                )
                SELECT 
                    (vs.violation_count + ps.pass_count) as total_results,
                    vs.violation_count as total_violations,
                    ps.pass_count as total_passes,
                    GREATEST(vs.violation_tools, ps.pass_tools) as tools_used,
                    GREATEST(vs.violation_pages, ps.pass_pages) as pages_affected,
                    vs.critical_count,
                    vs.serious_count,
                    vs.moderate_count,
                    vs.minor_count
                FROM violation_summary vs, pass_summary ps
            `;
        }

        const result = await pool.query(query, [sessionId]);
        const summary = result.rows[0];

        res.json({
            success: true,
            summary: {
                totalResults: parseInt(summary.total_results) || 0,
                totalViolations: parseInt(summary.total_violations) || 0,
                totalPasses: parseInt(summary.total_passes) || 0,
                toolsUsed: parseInt(summary.tools_used) || 0,
                pagesAffected: parseInt(summary.pages_affected) || 0,
                severityBreakdown: {
                    critical: parseInt(summary.critical_count) || 0,
                    serious: parseInt(summary.serious_count) || 0,
                    moderate: parseInt(summary.moderate_count) || 0,
                    minor: parseInt(summary.minor_count) || 0
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching all test results summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test results summary'
        });
    }
});

module.exports = router; 
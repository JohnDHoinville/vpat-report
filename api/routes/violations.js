const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
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
            paramCount++;
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
            LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
            LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
            LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
            LEFT JOIN wcag_requirements wr ON v.wcag_criterion = wr.criterion_number
            WHERE (atr.test_session_id = $1 OR mtr.test_session_id = $1)
        `;

        // Apply same filters to count query (exclude pagination params)
        const countParams = queryParams.slice(0, -2);
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

        const [severityResult, sourceResult, wcagLevelResult, pageResult, violationTypesResult] = await Promise.all([
            pool.query(severityQuery, [sessionId]),
            pool.query(sourceQuery, [sessionId]),
            pool.query(wcagLevelQuery, [sessionId]),
            pool.query(pageQuery, [sessionId]),
            pool.query(violationTypesQuery, [sessionId])
        ]);

        res.json({
            by_severity: severityResult.rows,
            by_source: sourceResult.rows,
            by_wcag_level: wcagLevelResult.rows,
            by_page: pageResult.rows,
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
                wr.guideline as wcag_guideline,
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

        res.json({
            violation,
            similar_violations: similarResult.rows
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

module.exports = router; 
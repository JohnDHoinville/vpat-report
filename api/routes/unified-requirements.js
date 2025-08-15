const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../../database/config');

/**
 * GET /api/unified-requirements/test
 * Test endpoint to verify unified requirements view
 */
router.get('/test', async (req, res) => {
    try {
        const query = `
            SELECT 
                standard_type,
                requirement_id,
                title,
                test_method,
                level
            FROM unified_requirements
            ORDER BY standard_type, requirement_id
            LIMIT 5
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            message: 'Unified Requirements API is working correctly',
            data: {
                total_found: result.rows.length,
                sample_requirements: result.rows
            }
        });

    } catch (error) {
        console.error('❌ Error in unified requirements test endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch unified requirements',
            details: error.message
        });
    }
});

/**
 * GET /api/unified-requirements
 * Get all requirements from unified view with optional filtering
 * 
 * Query Parameters:
 * - conformance_level: Filter by conformance level (wcag_a, wcag_aa, wcag_aaa, section_508)
 * - standard_type: Filter by standard type (wcag, section508)
 * - level: Filter by WCAG level (A, AA, AAA) or Section 508 level (Required)
 * - test_method: Filter by test method (automated, manual, both)
 * - search: Search in title or description
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 50)
 * - sort: Sort field (requirement_id, title, test_method, level)
 * - order: Sort order (asc, desc, default: asc)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            conformance_level,
            standard_type,
            level,
            test_method,
            search,
            page = 1,
            limit = 50,
            sort = 'requirement_id',
            order = 'asc'
        } = req.query;

        // Build WHERE conditions
        const conditions = [];
        const params = [];
        let paramCount = 0;

        if (conformance_level) {
            if (conformance_level === 'wcag_a') {
                conditions.push(`standard_type = 'wcag' AND level = 'A'`);
            } else if (conformance_level === 'wcag_aa') {
                conditions.push(`standard_type = 'wcag' AND level IN ('A', 'AA')`);
            } else if (conformance_level === 'wcag_aaa') {
                conditions.push(`standard_type = 'wcag' AND level IN ('A', 'AA', 'AAA')`);
            } else if (conformance_level === 'section_508') {
                conditions.push(`standard_type = 'section508'`);
            }
        }

        if (standard_type) {
            paramCount++;
            conditions.push(`standard_type = $${paramCount}`);
            params.push(standard_type);
        }

        if (level) {
            paramCount++;
            conditions.push(`level = $${paramCount}`);
            params.push(level);
        }

        if (test_method) {
            paramCount++;
            conditions.push(`test_method = $${paramCount}`);
            params.push(test_method);
        }

        if (search) {
            paramCount++;
            conditions.push(`(title ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
            params.push(`%${search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Validate sort field
        const validSortFields = ['requirement_id', 'title', 'test_method', 'level', 'standard_type'];
        const sortField = validSortFields.includes(sort) ? sort : 'requirement_id';
        const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        // Calculate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM unified_requirements
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, params);
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limitNum);

        // Get requirements with pagination
        paramCount += 2;
        const query = `
            SELECT 
                id,
                standard_type,
                requirement_id,
                version,
                level,
                title,
                description,
                manual_test_procedure,
                tool_mappings,
                understanding_url,
                applies_to_page_types,
                testable_method,
                automation_coverage,
                test_method,
                guideline_title,
                section_508_mapping,
                created_at
            FROM unified_requirements
            ${whereClause}
            ORDER BY ${sortField} ${sortOrder}
            LIMIT $${paramCount - 1} OFFSET $${paramCount}
        `;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        // Group by standard type and level for better organization
        const groupedRequirements = result.rows.reduce((acc, req) => {
            const key = req.standard_type === 'wcag' ? `wcag_${req.level.toLowerCase()}` : req.standard_type;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(req);
            return acc;
        }, {});

        // Calculate statistics
        const stats = {
            total: totalItems,
            by_standard: {},
            by_test_method: {},
            section_508_mappings: result.rows.filter(r => r.section_508_mapping).length
        };

        // Standard breakdown
        result.rows.forEach(req => {
            const std = req.standard_type;
            if (!stats.by_standard[std]) stats.by_standard[std] = 0;
            stats.by_standard[std]++;
            
            const method = req.test_method || 'unknown';
            if (!stats.by_test_method[method]) stats.by_test_method[method] = 0;
            stats.by_test_method[method]++;
        });

        res.json({
            success: true,
            data: {
                requirements: result.rows,
                grouped: groupedRequirements,
                statistics: stats,
                pagination: {
                    current_page: pageNum,
                    total_pages: totalPages,
                    total_items: totalItems,
                    items_per_page: limitNum,
                    has_next: pageNum < totalPages,
                    has_prev: pageNum > 1
                },
                filters: {
                    conformance_level,
                    standard_type,
                    level,
                    test_method,
                    search,
                    sort: sortField,
                    order: sortOrder
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching unified requirements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch unified requirements',
            details: error.message
        });
    }
});

/**
 * GET /api/unified-requirements/:id
 * Get a specific requirement by ID from the unified view
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                id,
                standard_type,
                requirement_id,
                version,
                level,
                title,
                description,
                manual_test_procedure,
                tool_mappings,
                understanding_url,
                applies_to_page_types,
                testable_method,
                automation_coverage,
                test_method,
                guideline_title,
                section_508_mapping,
                created_at
            FROM unified_requirements
            WHERE id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Requirement not found'
            });
        }

        const requirement = result.rows[0];

        // If this is a WCAG requirement with Section 508 mapping, get the mapped requirement details
        let mappedRequirement = null;
        if (requirement.standard_type === 'wcag' && requirement.section_508_mapping) {
            const mappedQuery = `
                SELECT * FROM unified_requirements 
                WHERE standard_type = 'section508' AND requirement_id = $1
            `;
            const mappedResult = await pool.query(mappedQuery, [requirement.section_508_mapping]);
            if (mappedResult.rows.length > 0) {
                mappedRequirement = mappedResult.rows[0];
            }
        }

        res.json({
            success: true,
            data: {
                requirement,
                mapped_section_508: mappedRequirement
            }
        });

    } catch (error) {
        console.error('❌ Error fetching requirement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch requirement',
            details: error.message
        });
    }
});

/**
 * GET /api/unified-requirements/conformance/:level
 * Get all requirements for a specific conformance level
 */
router.get('/conformance/:level', authenticateToken, async (req, res) => {
    try {
        const { level } = req.params;

        // Validate conformance level
        const validLevels = ['wcag_a', 'wcag_aa', 'wcag_aaa', 'section_508'];
        if (!validLevels.includes(level)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid conformance level',
                valid_levels: validLevels
            });
        }

        let whereCondition = '';
        if (level === 'wcag_a') {
            whereCondition = `WHERE requirement_type = 'wcag' AND level = 'a'`;
        } else if (level === 'wcag_aa') {
            whereCondition = `WHERE requirement_type = 'wcag' AND level IN ('a', 'aa')`;
        } else if (level === 'wcag_aaa') {
            whereCondition = `WHERE requirement_type = 'wcag' AND level IN ('a', 'aa', 'aaa')`;
        } else if (level === 'section_508') {
            whereCondition = `WHERE requirement_type = 'section_508'`;
        }
        
        // Add is_active condition to existing WHERE clause
        whereCondition += ` AND is_active = true`;

        const result = await pool.query(`
            SELECT 
                id,
                requirement_type as standard_type,
                criterion_number,
                title,
                description,
                level,
                test_method,
                testing_instructions,
                acceptance_criteria,
                failure_examples,
                is_active,
                priority,
                estimated_time_minutes,
                wcag_url,
                section_508_url,
                created_at,
                updated_at
            FROM test_requirements 
            ${whereCondition}
            ORDER BY requirement_type, criterion_number
        `);

        // Group by requirement type and level for better organization
        const groupedByLevel = result.rows.reduce((acc, req) => {
            const key = req.standard_type === 'wcag' ? req.level : req.standard_type;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(req);
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                conformance_level: level,
                total_requirements: result.rows.length,
                requirements: result.rows,
                by_level: groupedByLevel,
                summary: {
                    automated: result.rows.filter(r => r.test_method === 'automated').length,
                    manual: result.rows.filter(r => r.test_method === 'manual').length,
                    both: result.rows.filter(r => r.test_method === 'both').length,
                    section_508_mappings: result.rows.filter(r => r.section_508_mapping).length
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching requirements by conformance level:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch requirements by conformance level',
            details: error.message
        });
    }
});

/**
 * GET /api/unified-requirements/session/:sessionId
 * Get requirements for a specific test session
 */
router.get('/session/:sessionId', async (req, res) => {
    // Require proper authentication
    try {
        await authenticateToken(req, res, () => {});
        if (res.headersSent) return; // Authentication failed
    } catch (error) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const { sessionId } = req.params;
        // Get session conformance level
        const sessionQuery = await pool.query(`
            SELECT conformance_level 
            FROM test_sessions 
            WHERE id = $1
        `, [sessionId]);

        if (sessionQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found'
            });
        }

        const conformanceLevel = sessionQuery.rows[0].conformance_level || 'wcag_aa';
        
        // Map session conformance level to requirements filter
        let whereCondition = '';
        if (conformanceLevel === 'wcag_a') {
            whereCondition = `WHERE ur.standard_type = 'wcag' AND ur.level = 'A'`;
        } else if (conformanceLevel === 'wcag_aa') {
            whereCondition = `WHERE ur.standard_type = 'wcag' AND ur.level IN ('A', 'AA')`;
        } else if (conformanceLevel === 'wcag_aaa' || conformanceLevel === 'AAA') {
            whereCondition = `WHERE ur.standard_type = 'wcag' AND ur.level IN ('A', 'AA', 'AAA')`;
        } else if (conformanceLevel === 'section_508') {
            whereCondition = `WHERE ur.standard_type = 'section508'`;where 
        } else if (conformanceLevel === 'combined') {
            // Combined includes all WCAG and Section 508 requirements
            whereCondition = `WHERE ur.standard_type IN ('wcag', 'section508')`;
        } else {
            // Default to WCAG AA
            whereCondition = `WHERE ur.standard_type = 'wcag' AND ur.level IN ('A', 'AA')`;
        }
        
        // Get requirements with test instance statuses from unified_requirements (same table used in session creation)
        const result = await pool.query(`
            SELECT 
                ur.id,
                ur.standard_type,
                ur.requirement_id as criterion_number,
                ur.title,
                ur.description,
                ur.level,
                ur.test_method,
                COALESCE(ur.tool_mappings->'automated_tools', '[]'::jsonb) as automated_tools, -- Fixed: Extract tools array from JSONB
                ur.manual_test_procedure as testing_instructions,
                ur.understanding_url,
                ur.applies_to_page_types,
                ur.created_at,
                -- Test instance statuses
                COUNT(ti.id) as total_test_instances,
                COUNT(CASE WHEN ti.status = 'passed' THEN 1 END) as passed_instances,
                COUNT(CASE WHEN ti.status = 'failed' THEN 1 END) as failed_instances,
                COUNT(CASE WHEN ti.status = 'in_progress' THEN 1 END) as in_progress_instances,
                COUNT(CASE WHEN ti.status = 'pending' THEN 1 END) as pending_instances,
                COUNT(CASE WHEN ti.status = 'needs_review' THEN 1 END) as needs_review_instances,
                COUNT(CASE WHEN ti.status = 'not_applicable' THEN 1 END) as not_applicable_instances,
                COUNT(CASE WHEN ti.test_method_used = 'automated' THEN 1 END) as automated_instances,
                COUNT(CASE WHEN ti.test_method_used = 'manual' THEN 1 END) as manual_instances,
                -- Overall status calculation
                CASE 
                    WHEN COUNT(ti.id) = 0 THEN 'not_tested'
                    WHEN COUNT(CASE WHEN ti.status = 'failed' THEN 1 END) > 0 THEN 'failed'
                    WHEN COUNT(CASE WHEN ti.status = 'passed' THEN 1 END) = COUNT(ti.id) THEN 'passed'
                    WHEN COUNT(CASE WHEN ti.status IN ('in_progress', 'needs_review') THEN 1 END) > 0 THEN 'in_progress'
                    WHEN COUNT(CASE WHEN ti.status = 'pending' THEN 1 END) > 0 THEN 'pending'
                    ELSE 'partial'
                END as overall_status,
                -- Automated status
                CASE 
                    WHEN COUNT(CASE WHEN ti.test_method_used = 'automated' AND ti.status = 'failed' THEN 1 END) > 0 THEN 'failed'
                    WHEN COUNT(CASE WHEN ti.test_method_used = 'automated' AND ti.status = 'passed' THEN 1 END) > 0 
                         AND COUNT(CASE WHEN ti.test_method_used = 'automated' THEN 1 END) = COUNT(CASE WHEN ti.test_method_used = 'automated' AND ti.status = 'passed' THEN 1 END) THEN 'passed'
                    WHEN COUNT(CASE WHEN ti.test_method_used = 'automated' AND ti.status IN ('in_progress', 'needs_review') THEN 1 END) > 0 THEN 'in_progress'
                    WHEN COUNT(CASE WHEN ti.test_method_used = 'automated' THEN 1 END) > 0 THEN 'pending'
                    ELSE 'not_tested'
                END as automated_status,
                -- Manual status
                CASE 
                    WHEN COUNT(CASE WHEN ti.test_method_used = 'manual' AND ti.status = 'failed' THEN 1 END) > 0 THEN 'failed'
                    WHEN COUNT(CASE WHEN ti.test_method_used = 'manual' AND ti.status = 'passed' THEN 1 END) > 0 
                         AND COUNT(CASE WHEN ti.test_method_used = 'manual' THEN 1 END) = COUNT(CASE WHEN ti.test_method_used = 'manual' AND ti.status = 'passed' THEN 1 END) THEN 'passed'
                    WHEN COUNT(CASE WHEN ti.test_method_used = 'manual' AND ti.status IN ('in_progress', 'needs_review') THEN 1 END) > 0 THEN 'in_progress'
                    WHEN COUNT(CASE WHEN ti.test_method_used = 'manual' THEN 1 END) > 0 THEN 'pending'
                    ELSE 'not_tested'
                END as manual_status
            FROM unified_requirements ur
            LEFT JOIN test_instances ti ON ur.id = ti.requirement_id AND ti.session_id = $1
            ${whereCondition}
            GROUP BY ur.id, ur.standard_type, ur.requirement_id, ur.title, ur.description, ur.level, ur.test_method, ur.tool_mappings, ur.manual_test_procedure, ur.understanding_url, ur.applies_to_page_types, ur.created_at
            ORDER BY ur.standard_type, ur.requirement_id
        `, [sessionId]);

        // Debug: Check for our expected failed requirements
        const failedReqs = result.rows.filter(r => ['1.3.6', '1.4.6', '2.4.12', '2.4.13'].includes(r.criterion_number));
        console.log(`🔍 DEBUG API: Found ${failedReqs.length} expected failed requirements:`, 
            failedReqs.map(r => ({id: r.criterion_number, automated_status: r.automated_status, failed_instances: r.failed_instances})));

        res.json({
            success: true,
            data: {
                session_id: sessionId,
                conformance_level: conformanceLevel,
                total_requirements: result.rows.length,
                requirements: result.rows
            }
        });

    } catch (error) {
        console.error('❌ Error fetching session requirements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session requirements',
            details: error.message
        });
    }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const AuditLogger = require('../middleware/audit-logger');
const { pool } = require('../../database/config');

/**
 * GET /api/requirements/test
 * Test endpoint to verify database connection and schema (no auth required)
 */
router.get('/test', async (req, res) => {
    try {
        const query = `
            SELECT 
                id as requirement_id,
                requirement_type,
                criterion_number,
                title,
                level,
                test_method,
                is_active as enabled,
                priority
            FROM test_requirements
            LIMIT 3
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            message: 'Requirements API is working correctly',
            data: {
                total_found: result.rows.length,
                sample_requirements: result.rows
            }
        });

    } catch (error) {
        console.error('❌ Error in test endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test requirements',
            details: error.message
        });
    }
});

/**
 * GET /api/requirements
 * Get all test requirements with optional filtering
 * 
 * Query Parameters:
 * - conformance_level: Filter by conformance level (A, AA, AAA, Section508)
 * - category: Filter by requirement category
 * - enabled: Filter by enabled status (true/false)
 * - search: Search in title or description
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 50)
 * - sort: Sort field (title, conformance_level, category, created_at)
 * - order: Sort order (asc, desc, default: asc)
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            conformance_level,
            category,
            enabled,
            search,
            test_method,
            requirement_type,
            page = 1,
            limit = 50,
            sort = 'conformance_level',
            order = 'asc'
        } = req.query;

        // Build WHERE conditions
        const conditions = [];
        const params = [];
        let paramCount = 0;

        if (conformance_level) {
            paramCount++;
            conditions.push(`level = $${paramCount}`);
            params.push(conformance_level);
        }

        if (requirement_type) {
            paramCount++;
            conditions.push(`requirement_type = $${paramCount}`);
            params.push(requirement_type);
        }

        if (category) {
            paramCount++;
            conditions.push(`test_method = $${paramCount}`);
            params.push(category);
        }

        if (test_method) {
            paramCount++;
            conditions.push(`test_method = $${paramCount}`);
            params.push(test_method);
        }

        if (enabled !== undefined) {
            paramCount++;
            conditions.push(`is_active = $${paramCount}`);
            params.push(enabled === 'true');
        }

        if (search) {
            paramCount++;
            conditions.push(`(title ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
            params.push(`%${search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Validate sort field
        const validSortFields = ['title', 'requirement_type', 'test_method', 'created_at', 'requirement_id'];
        const sortField = validSortFields.includes(sort) ? sort : 'requirement_type';
        const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        // Calculate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM test_requirements
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, params);
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limitNum);

        // Get requirements with pagination
        paramCount += 2;
        const query = `
            SELECT 
                id as requirement_id,
                requirement_type,
                criterion_number,
                title,
                description,
                level,
                test_method,
                testing_instructions,
                acceptance_criteria,
                failure_examples,
                wcag_url,
                section_508_url,
                is_active as enabled,
                priority,
                estimated_time_minutes,
                automated_tools,
                tool_mapping,
                automation_confidence,
                created_at,
                updated_at
            FROM test_requirements
            ${whereClause}
            ORDER BY ${sortField} ${sortOrder}, criterion_number ASC
            LIMIT $${paramCount - 1} OFFSET $${paramCount}
        `;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        // Group by conformance level for better organization
        const groupedRequirements = result.rows.reduce((acc, req) => {
            if (!acc[req.requirement_type]) {
                acc[req.requirement_type] = [];
            }
            acc[req.requirement_type].push(req);
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                requirements: result.rows,
                grouped: groupedRequirements,
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
                    category,
                    enabled,
                    search,
                    sort: sortField,
                    order: sortOrder
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching test requirements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test requirements',
            details: error.message
        });
    }
});

/**
 * GET /api/requirements/:id
 * Get a specific test requirement by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                id as requirement_id,
                requirement_type,
                criterion_number,
                title,
                description,
                level,
                test_method,
                testing_instructions,
                acceptance_criteria,
                failure_examples,
                wcag_url,
                section_508_url,
                is_active as enabled,
                priority,
                estimated_time_minutes,
                created_at,
                updated_at
            FROM test_requirements
            WHERE id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test requirement not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error fetching test requirement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test requirement',
            details: error.message
        });
    }
});

/**
 * GET /api/requirements/conformance/:level
 * Get all requirements for a specific conformance level
 * This is a convenience endpoint for session creation
 */
router.get('/conformance/:level', authenticateToken, async (req, res) => {
    try {
        const { level } = req.params;

        // Validate conformance level
        const validLevels = ['A', 'AA', 'AAA', 'Section508'];
        if (!validLevels.includes(level)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid conformance level',
                valid_levels: validLevels
            });
        }

        const query = `
            SELECT 
                id as requirement_id,
                requirement_type,
                criterion_number,
                title,
                description,
                level,
                test_method,
                testing_instructions,
                acceptance_criteria,
                failure_examples,
                wcag_url,
                section_508_url,
                is_active as enabled
            FROM test_requirements
            WHERE requirement_type = $1 AND is_active = true
            ORDER BY criterion_number
        `;

        const result = await pool.query(query, [level]);

        // Group by category
        const groupedByCategory = result.rows.reduce((acc, req) => {
            if (!acc[req.requirement_type]) {
                acc[req.requirement_type] = [];
            }
            acc[req.requirement_type].push(req);
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                conformance_level: level,
                total_requirements: result.rows.length,
                requirements: result.rows,
                by_category: groupedByCategory
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
 * GET /api/requirements/stats/summary
 * Get summary statistics for test requirements
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_requirements,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_requirements,
                COUNT(CASE WHEN requirement_type = 'wcag' THEN 1 END) as wcag_requirements,
                COUNT(CASE WHEN requirement_type = 'section_508' THEN 1 END) as section_508_requirements,
                COUNT(CASE WHEN level = 'A' THEN 1 END) as level_a_requirements,
                COUNT(CASE WHEN level = 'AA' THEN 1 END) as level_aa_requirements,
                COUNT(CASE WHEN level = 'AAA' THEN 1 END) as level_aaa_requirements,
                COUNT(CASE WHEN test_method = 'automated' THEN 1 END) as automated_requirements,
                COUNT(CASE WHEN test_method = 'manual' THEN 1 END) as manual_requirements,
                COUNT(CASE WHEN test_method = 'both' THEN 1 END) as both_requirements
            FROM test_requirements
        `;

        const result = await pool.query(statsQuery);

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error fetching requirements stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch requirements statistics',
            details: error.message
        });
    }
});

/**
 * PUT /api/requirements/:id
 * Update a test requirement (admin only)
 * This endpoint is for administrative updates to requirements
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            testing_instructions,
            acceptance_criteria,
            failure_examples,
            reference_links,
            enabled
        } = req.body;

        // Check if requirement exists
        const existingQuery = 'SELECT * FROM test_requirements WHERE id = $1';
        const existingResult = await pool.query(existingQuery, [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test requirement not found'
            });
        }

        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramCount = 0;

        if (title !== undefined) {
            paramCount++;
            updates.push(`title = $${paramCount}`);
            params.push(title);
        }

        if (description !== undefined) {
            paramCount++;
            updates.push(`description = $${paramCount}`);
            params.push(description);
        }

        if (testing_instructions !== undefined) {
            paramCount++;
            updates.push(`testing_instructions = $${paramCount}`);
            params.push(testing_instructions);
        }

        if (acceptance_criteria !== undefined) {
            paramCount++;
            updates.push(`acceptance_criteria = $${paramCount}`);
            params.push(JSON.stringify(acceptance_criteria));
        }

        if (failure_examples !== undefined) {
            paramCount++;
            updates.push(`failure_examples = $${paramCount}`);
            params.push(JSON.stringify(failure_examples));
        }

        if (reference_links !== undefined) {
            paramCount++;
            updates.push(`reference_links = $${paramCount}`);
            params.push(JSON.stringify(reference_links));
        }

        if (enabled !== undefined) {
            paramCount++;
            updates.push(`is_active = $${paramCount}`);
            params.push(enabled);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid update fields provided'
            });
        }

        // Add updated_at
        paramCount++;
        updates.push(`updated_at = $${paramCount}`);
        params.push(new Date());

        // Add WHERE clause
        paramCount++;
        params.push(id);

        const updateQuery = `
            UPDATE test_requirements 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(updateQuery, params);

        res.json({
            success: true,
            message: 'Test requirement updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error updating test requirement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update test requirement',
            details: error.message
        });
    }
});

/**
 * POST /api/requirements/validate
 * Validate test requirements data (useful for testing and validation)
 */
router.post('/validate', authenticateToken, async (req, res) => {
    try {
        const { requirements } = req.body;

        if (!Array.isArray(requirements)) {
            return res.status(400).json({
                success: false,
                error: 'Requirements must be an array'
            });
        }

        const validationResults = [];
        const validRequirementTypes = ['wcag', 'section508', 'custom'];

        for (let i = 0; i < requirements.length; i++) {
            const req = requirements[i];
            const issues = [];

            // Check required fields
            if (!req.requirement_type) issues.push('requirement_type is required');
            if (!req.criterion_number) issues.push('criterion_number is required');
            if (!req.title) issues.push('title is required');
            if (!req.description) issues.push('description is required');

            // Check requirement type validity
            if (req.requirement_type && !validRequirementTypes.includes(req.requirement_type)) {
                issues.push(`Invalid requirement_type: ${req.requirement_type}`);
            }

            // Check JSON fields
            try {
                if (req.acceptance_criteria && typeof req.acceptance_criteria === 'string') {
                    JSON.parse(req.acceptance_criteria);
                }
            } catch (e) {
                issues.push('acceptance_criteria is not valid JSON');
            }

            try {
                if (req.failure_examples && typeof req.failure_examples === 'string') {
                    JSON.parse(req.failure_examples);
                }
            } catch (e) {
                issues.push('failure_examples is not valid JSON');
            }

            try {
                if (req.reference_links && typeof req.reference_links === 'string') {
                    JSON.parse(req.reference_links);
                }
            } catch (e) {
                issues.push('reference_links is not valid JSON');
            }

            validationResults.push({
                index: i,
                title: req.title || 'Unknown',
                valid: issues.length === 0,
                issues: issues
            });
        }

        const totalRequirements = requirements.length;
        const validRequirements = validationResults.filter(r => r.valid).length;
        const invalidRequirements = totalRequirements - validRequirements;

        res.json({
            success: true,
            data: {
                summary: {
                    total: totalRequirements,
                    valid: validRequirements,
                    invalid: invalidRequirements,
                    success_rate: ((validRequirements / totalRequirements) * 100).toFixed(2) + '%'
                },
                results: validationResults,
                invalid_only: validationResults.filter(r => !r.valid)
            }
        });

    } catch (error) {
        console.error('❌ Error validating requirements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate requirements',
            details: error.message
        });
    }
});

/**
 * GET /api/requirements/wcag/:criterionNumber
 * Get detailed WCAG requirement information including description, testing procedures, and links
 */
router.get('/wcag/:criterionNumber', async (req, res) => {
    try {
        const { criterionNumber } = req.params;
        
        console.log(`📋 Fetching detailed WCAG info for criterion: ${criterionNumber}`);
        
        const query = `
            SELECT 
                wr.id,
                wr.wcag_version,
                wr.level,
                wr.criterion_number,
                wr.title,
                wr.description,
                wr.understanding_url,
                wr.manual_test_procedure,
                wr.tool_mappings,
                wr.applies_to_page_types,
                wr.guideline_title,
                wr.test_method,
                wr.created_at
            FROM wcag_requirements wr
            WHERE wr.criterion_number = $1
            LIMIT 1
        `;
        
        const result = await pool.query(query, [criterionNumber]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'WCAG requirement not found',
                criterion_number: criterionNumber
            });
        }
        
        const requirement = result.rows[0];
        
        // Enhance the response with formatted data
        const enhancedRequirement = {
            ...requirement,
            // Extract testing instructions from manual_test_procedure
            testing_instructions: requirement.manual_test_procedure?.overview || 
                                requirement.manual_test_procedure?.steps?.join('\n') || 
                                requirement.description,
            
            // Format the test method for display
            test_method_display: requirement.test_method === 'both' ? 'Both' : 
                               requirement.test_method === 'automated' ? 'Automated' : 'Manual',
            
            // Generate WCAG link if not provided
            wcag_link: requirement.understanding_url || 
                      `https://www.w3.org/WAI/WCAG21/Understanding/${criterionNumber.replace(/\./g, '-')}.html`,
            
            // Extract common failures if available
            common_failures: requirement.manual_test_procedure?.common_failures || [],
            
            // Extract testing steps if available
            testing_steps: requirement.manual_test_procedure?.steps || [],
            
            // Extract tools needed
            tools_needed: requirement.manual_test_procedure?.tools_needed || []
        };
        
        console.log(`✅ Found detailed WCAG requirement: ${requirement.title}`);
        
        res.json({
            success: true,
            data: enhancedRequirement
        });
        
    } catch (error) {
        console.error('❌ Error fetching WCAG requirement details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch WCAG requirement details',
            details: error.message
        });
    }
});

module.exports = router; 
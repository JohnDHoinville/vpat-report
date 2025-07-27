const express = require('express');
const router = express.Router();
const { pool } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');

/**
 * TEST INSTANCES API
 * 
 * Unified test instance management with dynamic URL-to-requirement mapping
 * Handles individual test execution, results, and evidence management
 */

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create test instances for selected pages in a session
 */
async function createTestInstancesForPages(client, sessionId, pageIds) {
    // Get session details and requirements
    const sessionQuery = `
        SELECT ts.*, array_agg(tr.id) as requirement_ids
        FROM test_sessions ts
        JOIN test_instances ti ON ts.id = ti.session_id
        JOIN test_requirements tr ON ti.requirement_id = tr.id
        WHERE ts.id = $1
        GROUP BY ts.id
    `;
    
    const sessionResult = await client.query(sessionQuery, [sessionId]);
    if (sessionResult.rows.length === 0) {
        throw new Error('Session not found');
    }
    
    const session = sessionResult.rows[0];
    
    // Get all requirements for this session
    const requirementsQuery = `
        SELECT DISTINCT tr.*
        FROM test_requirements tr
        JOIN test_instances ti ON tr.id = ti.requirement_id
        WHERE ti.session_id = $1
    `;
    
    const requirementsResult = await client.query(requirementsQuery, [sessionId]);
    const requirements = requirementsResult.rows;
    
    // Get page details
    const pagesQuery = `
        SELECT id, url, title, crawler_id, status_code, content_type, 
               first_discovered_at as created_at, discovered_at, last_crawled_at
        FROM crawler_discovered_pages 
        WHERE id = ANY($1)
    `;
    
    const pagesResult = await client.query(pagesQuery, [pageIds]);
    const pages = pagesResult.rows;
    
    const newInstances = [];
    
    // Create test instance for each requirement × page combination
    for (const requirement of requirements) {
        for (const page of pages) {
            // Check if instance already exists
            const existingQuery = `
                SELECT id FROM test_instances 
                WHERE session_id = $1 AND requirement_id = $2 AND page_id = $3
            `;
            
            const existingResult = await client.query(existingQuery, [
                sessionId, requirement.id, page.id
            ]);
            
            if (existingResult.rows.length === 0) {
                // Create new test instance
                const insertQuery = `
                    INSERT INTO test_instances (
                        session_id, requirement_id, page_id, status,
                        test_method_used, created_at
                    ) VALUES ($1, $2, $3, 'pending', $4, CURRENT_TIMESTAMP)
                    RETURNING *
                `;
                
                const testMethod = requirement.test_method === 'both' ? 'automated' : requirement.test_method;
                const instanceResult = await client.query(insertQuery, [
                    sessionId, requirement.id, page.id, testMethod
                ]);
                
                newInstances.push(instanceResult.rows[0]);
            }
        }
    }
    
    return newInstances;
}

/**
 * Apply smart requirement filtering based on page characteristics
 */
function filterRequirementsForPage(requirements, page) {
    return requirements.filter(requirement => {
        // Apply intelligent filtering based on page metadata
        const criterion = requirement.criterion_number;
        
        // Form-specific requirements
        if (criterion.includes('3.3') || criterion.includes('4.1.2')) {
            // Only apply form requirements to pages with forms
            return page.has_forms;
        }
        
        // Authentication-specific requirements
        if (criterion.includes('2.2') || criterion.includes('3.2')) {
            // Apply session/timing requirements more broadly to auth pages
            return page.requires_auth || page.has_forms;
        }
        
        // Media requirements (if we had media detection)
        if (criterion.includes('1.2') || criterion.includes('1.4.2')) {
            // Would check for video/audio content
            // For now, apply to all pages
            return true;
        }
        
        // Apply all other requirements to all pages
        return true;
    });
}

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * GET /api/test-instances
 * List test instances with filtering and pagination
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            session_id,
            status,
            requirement_id,
            page_id,
            assigned_tester,
            test_method_used,
            limit = 50,
            offset = 0,
            page = null,
            search = null,
            testMethod = null,
            level = null,
            include_details = 'false'
        } = req.query;

        // Calculate offset from page if provided
        const actualLimit = parseInt(limit);
        let actualOffset = parseInt(offset);
        if (page) {
            actualOffset = (parseInt(page) - 1) * actualLimit;
        }
        
        let query = `
            SELECT ti.*,
                   tr.criterion_number, tr.title as requirement_title, tr.level as requirement_level,
                   tr.test_method as requirement_test_method,
                   cdp.url as page_url, cdp.title as page_title,
                   tester.username as assigned_tester_username,
                   reviewer.username as reviewer_username
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN crawler_discovered_pages cdp ON ti.page_id = cdp.id
            LEFT JOIN users tester ON ti.assigned_tester = tester.id
            LEFT JOIN users reviewer ON ti.reviewer = reviewer.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        if (session_id) {
            paramCount++;
            query += ` AND ti.session_id = $${paramCount}`;
            params.push(session_id);
        }
        
        if (status) {
            paramCount++;
            query += ` AND ti.status = $${paramCount}`;
            params.push(status);
        }
        
        if (requirement_id) {
            paramCount++;
            query += ` AND ti.requirement_id = $${paramCount}`;
            params.push(requirement_id);
        }
        
        if (page_id) {
            paramCount++;
            query += ` AND ti.page_id = $${paramCount}`;
            params.push(page_id);
        }
        
        if (assigned_tester) {
            paramCount++;
            query += ` AND ti.assigned_tester = $${paramCount}`;
            params.push(assigned_tester);
        }
        
        if (test_method_used || testMethod) {
            paramCount++;
            query += ` AND ti.test_method_used = $${paramCount}`;
            params.push(test_method_used || testMethod);
        }

        // Add search functionality
        if (search) {
            paramCount++;
            query += ` AND (
                LOWER(tr.criterion_number) LIKE LOWER($${paramCount}) OR
                LOWER(tr.title) LIKE LOWER($${paramCount}) OR
                LOWER(cdp.url) LIKE LOWER($${paramCount}) OR
                LOWER(cdp.title) LIKE LOWER($${paramCount}) OR
                LOWER(ti.notes) LIKE LOWER($${paramCount})
            )`;
            params.push(`%${search}%`);
        }

        // Add level filter
        if (level) {
            paramCount++;
            query += ` AND tr.level = $${paramCount}`;
            params.push(level);
        }
        
        query += ` ORDER BY ti.updated_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(actualLimit, actualOffset);
        
        const result = await pool.query(query, params);
        
        // Get total count with same filters
        let countQuery = `
            SELECT COUNT(*) as total
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN crawler_discovered_pages cdp ON ti.page_id = cdp.id
            WHERE 1=1
        `;
        
        let countParams = [];
        let countParamCount = 0;
        
        if (session_id) {
            countParamCount++;
            countQuery += ` AND ti.session_id = $${countParamCount}`;
            countParams.push(session_id);
        }
        
        if (status) {
            countParamCount++;
            countQuery += ` AND ti.status = $${countParamCount}`;
            countParams.push(status);
        }

        if (requirement_id) {
            countParamCount++;
            countQuery += ` AND ti.requirement_id = $${countParamCount}`;
            countParams.push(requirement_id);
        }
        
        if (page_id) {
            countParamCount++;
            countQuery += ` AND ti.page_id = $${countParamCount}`;
            countParams.push(page_id);
        }
        
        if (assigned_tester) {
            countParamCount++;
            countQuery += ` AND ti.assigned_tester = $${countParamCount}`;
            countParams.push(assigned_tester);
        }
        
        if (test_method_used || testMethod) {
            countParamCount++;
            countQuery += ` AND ti.test_method_used = $${countParamCount}`;
            countParams.push(test_method_used || testMethod);
        }

        if (search) {
            countParamCount++;
            countQuery += ` AND (
                LOWER(tr.criterion_number) LIKE LOWER($${countParamCount}) OR
                LOWER(tr.title) LIKE LOWER($${countParamCount}) OR
                LOWER(cdp.url) LIKE LOWER($${countParamCount}) OR
                LOWER(cdp.title) LIKE LOWER($${countParamCount}) OR
                LOWER(ti.notes) LIKE LOWER($${countParamCount})
            )`;
            countParams.push(`%${search}%`);
        }

        if (level) {
            countParamCount++;
            countQuery += ` AND tr.level = $${countParamCount}`;
            countParams.push(level);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);
        const currentPage = page ? parseInt(page) : Math.floor(actualOffset / actualLimit) + 1;
        const totalPages = Math.ceil(total / actualLimit);
        
        res.json({
            success: true,
            test_instances: result.rows,
            pagination: {
                total,
                total_pages: totalPages,
                current_page: currentPage,
                page_size: actualLimit,
                offset: actualOffset,
                has_more: actualOffset + actualLimit < total,
                has_previous: currentPage > 1
            },
            performance: {
                query_time: Date.now(),
                results_count: result.rows.length,
                filters_applied: {
                    session_id: !!session_id,
                    status: !!status,
                    search: !!search,
                    level: !!level,
                    test_method: !!(test_method_used || testMethod),
                    assigned_tester: !!assigned_tester
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching test instances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test instances',
            details: error.message
        });
    }
});

/**
 * GET /api/test-instances/:id
 * Get detailed test instance information
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { include_audit_log = 'false' } = req.query;
        
        const query = `
            SELECT ti.*,
                   tr.criterion_number, tr.title as requirement_title, tr.description as requirement_description,
                   tr.level as requirement_level, tr.test_method as requirement_test_method,
                   tr.testing_instructions, tr.acceptance_criteria, tr.failure_examples,
                   tr.wcag_url, tr.section_508_url,
                   cdp.url as page_url, cdp.title as page_title, cdp.description as page_description,
                   cdp.has_forms, cdp.requires_auth, cdp.status_code,
                   ts.name as session_name, ts.conformance_level,
                   tester.username as assigned_tester_username, tester.email as assigned_tester_email,
                   reviewer.username as reviewer_username, reviewer.email as reviewer_email
            FROM test_instances ti
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            LEFT JOIN crawler_discovered_pages cdp ON ti.page_id = cdp.id
            LEFT JOIN test_sessions ts ON ti.session_id = ts.id
            LEFT JOIN users tester ON ti.assigned_tester = tester.id
            LEFT JOIN users reviewer ON ti.reviewer = reviewer.id
            WHERE ti.id = $1
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }
        
        const testInstance = result.rows[0];
        
        // Optionally include audit log
        let auditLog = null;
        if (include_audit_log === 'true') {
            const auditQuery = `
                SELECT tal.*,
                       u.username, u.email
                FROM test_audit_log tal
                LEFT JOIN users u ON tal.user_id = u.id
                WHERE tal.test_instance_id = $1
                ORDER BY tal.timestamp DESC
            `;
            
            const auditResult = await pool.query(auditQuery, [id]);
            auditLog = auditResult.rows;
        }
        
        res.json({
            success: true,
            test_instance: {
                ...testInstance,
                audit_log: auditLog
            }
        });
        
    } catch (error) {
        console.error('Error fetching test instance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test instance',
            details: error.message
        });
    }
});

/**
 * PUT /api/test-instances/:id
 * Update test instance status, notes, evidence, etc.
 */
router.put('/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const {
            status,
            notes,
            remediation_notes,
            evidence,
            confidence_level,
            assigned_tester,
            reviewer
        } = req.body;
        
        // Get current test instance
        const currentQuery = `SELECT * FROM test_instances WHERE id = $1`;
        const currentResult = await client.query(currentQuery, [id]);
        
        if (currentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }
        
        const currentInstance = currentResult.rows[0];
        
        // Build dynamic update query
        const updates = [];
        const params = [];
        let paramCount = 0;
        
        if (status !== undefined) {
            paramCount++;
            updates.push(`status = $${paramCount}`);
            params.push(status);
            
            // Update completion timestamp
            if (['passed', 'failed', 'untestable', 'not_applicable'].includes(status)) {
                updates.push('completed_at = CURRENT_TIMESTAMP');
            }
        }
        
        if (notes !== undefined) {
            paramCount++;
            updates.push(`notes = $${paramCount}`);
            params.push(notes);
        }
        
        if (remediation_notes !== undefined) {
            paramCount++;
            updates.push(`remediation_notes = $${paramCount}`);
            params.push(remediation_notes);
        }
        
        if (evidence !== undefined) {
            paramCount++;
            updates.push(`evidence = $${paramCount}`);
            params.push(JSON.stringify(evidence));
        }
        
        if (confidence_level !== undefined) {
            paramCount++;
            updates.push(`confidence_level = $${paramCount}`);
            params.push(confidence_level);
        }
        
        if (assigned_tester !== undefined) {
            paramCount++;
            updates.push(`assigned_tester = $${paramCount}`);
            params.push(assigned_tester);
            updates.push('assigned_at = CURRENT_TIMESTAMP');
        }
        
        if (reviewer !== undefined) {
            paramCount++;
            updates.push(`reviewer = $${paramCount}`);
            params.push(reviewer);
        }
        
        if (updates.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        
        // Add test instance ID for WHERE clause
        paramCount++;
        params.push(id);
        
        const updateQuery = `
            UPDATE test_instances 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;
        
        const result = await client.query(updateQuery, params);
        const updatedInstance = result.rows[0];
        
        // Log the change
        const changeDescription = [];
        if (status && status !== currentInstance.status) {
            changeDescription.push(`Status changed from '${currentInstance.status}' to '${status}'`);
        }
        if (notes && notes !== currentInstance.notes) {
            changeDescription.push('Notes updated');
        }
        if (evidence) {
            changeDescription.push('Evidence updated');
        }
        
        if (changeDescription.length > 0) {
            const auditQuery = `
                INSERT INTO test_audit_log (
                    test_instance_id, session_id, changed_by, action_type, reason,
                    old_value, new_value, changed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            `;
            
            const actionType = status && status !== currentInstance.status ? 'status_change' : 'note_updated';
            
            await client.query(auditQuery, [
                id, currentInstance.session_id, req.user.id, actionType, changeDescription.join('; '),
                JSON.stringify({ status: currentInstance.status, notes: currentInstance.notes }),
                JSON.stringify({ status: status || currentInstance.status, notes: notes || currentInstance.notes })
            ]);
        }
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            test_instance: updatedInstance
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating test instance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update test instance',
            details: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/test-instances/bulk-create
 * Create test instances for selected pages in a session
 */
router.post('/bulk-create', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { session_id, page_ids, apply_smart_filtering = true } = req.body;
        
        if (!session_id || !page_ids || !Array.isArray(page_ids)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'session_id and page_ids array are required'
            });
        }
        
        // Verify session exists
        const sessionCheck = await client.query('SELECT id FROM test_sessions WHERE id = $1', [session_id]);
        if (sessionCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        // Get all requirements for this session's conformance level
        const sessionQuery = `
            SELECT conformance_level FROM test_sessions WHERE id = $1
        `;
        
        const sessionResult = await client.query(sessionQuery, [session_id]);
        const conformanceLevel = sessionResult.rows[0].conformance_level;
        
        // Get requirements based on conformance level
        let requirementsQuery;
        switch (conformanceLevel) {
            case 'wcag_a':
                requirementsQuery = `
                    SELECT * FROM test_requirements 
                    WHERE requirement_type = 'wcag' AND level = 'a' AND is_active = true
                `;
                break;
            case 'wcag_aa':
                requirementsQuery = `
                    SELECT * FROM test_requirements 
                    WHERE requirement_type = 'wcag' AND level IN ('a', 'aa') AND is_active = true
                `;
                break;
            case 'wcag_aaa':
                requirementsQuery = `
                    SELECT * FROM test_requirements 
                    WHERE requirement_type = 'wcag' AND is_active = true
                `;
                break;
            case 'section_508':
                requirementsQuery = `
                    SELECT * FROM test_requirements 
                    WHERE requirement_type = 'section_508' AND is_active = true
                `;
                break;
            case 'combined':
                requirementsQuery = `
                    SELECT * FROM test_requirements 
                    WHERE is_active = true
                `;
                break;
            default:
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: `Invalid conformance level: ${conformanceLevel}`
                });
        }
        
        const requirementsResult = await client.query(requirementsQuery);
        const allRequirements = requirementsResult.rows;
        
        // Get page details
        const pagesQuery = `
            SELECT id, url, title, crawler_id, status_code, content_type, 
                   first_discovered_at as created_at, discovered_at, last_crawled_at
            FROM crawler_discovered_pages 
            WHERE id = ANY($1)
        `;
        
        const pagesResult = await client.query(pagesQuery, [page_ids]);
        const pages = pagesResult.rows;
        
        const newInstances = [];
        
        // Create test instances for each page
        for (const page of pages) {
            // Apply smart filtering if requested
            const requirements = apply_smart_filtering 
                ? filterRequirementsForPage(allRequirements, page)
                : allRequirements;
            
            for (const requirement of requirements) {
                // Check if instance already exists
                const existingQuery = `
                    SELECT id FROM test_instances 
                    WHERE session_id = $1 AND requirement_id = $2 AND page_id = $3
                `;
                
                const existingResult = await client.query(existingQuery, [
                    session_id, requirement.id, page.id
                ]);
                
                if (existingResult.rows.length === 0) {
                    // Create new test instance
                    const insertQuery = `
                        INSERT INTO test_instances (
                            session_id, requirement_id, page_id, status,
                            test_method_used, created_at
                        ) VALUES ($1, $2, $3, 'pending', $4, CURRENT_TIMESTAMP)
                        RETURNING *
                    `;
                    
                    const testMethod = requirement.test_method === 'both' ? 'automated' : requirement.test_method;
                    const instanceResult = await client.query(insertQuery, [
                        session_id, requirement.id, page.id, testMethod
                    ]);
                    
                    newInstances.push(instanceResult.rows[0]);
                }
            }
        }
        
        // Log bulk creation
        if (newInstances.length > 0) {
            const auditQuery = `
                INSERT INTO test_audit_log (
                    test_instance_id, session_id, changed_by, action_type, reason,
                    changed_at, metadata
                ) SELECT 
                    id, $3, $1, 'created', 'Test instance created via bulk creation',
                    CURRENT_TIMESTAMP, '{"bulk_creation": true, "page_count": $2}'::jsonb
                FROM (SELECT id FROM test_instances WHERE session_id = $3 AND created_at >= $4) ti
            `;
            
            await client.query(auditQuery, [
                req.user.id, 
                pages.length, 
                session_id, 
                new Date(Date.now() - 1000) // Within last second
            ]);
        }
        
        await client.query('COMMIT');
        
        res.status(201).json({
            success: true,
            created_instances: newInstances.length,
            total_pages_processed: pages.length,
            total_requirements_applied: allRequirements.length,
            smart_filtering_applied: apply_smart_filtering,
            instances: newInstances.slice(0, 10) // Return first 10 for reference
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error bulk creating test instances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to bulk create test instances',
            details: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/test-instances/:id/assign
 * Assign a test instance to a tester
 */
router.post('/:id/assign', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_tester } = req.body;
        
        if (!assigned_tester) {
            return res.status(400).json({
                success: false,
                error: 'assigned_tester is required'
            });
        }
        
        const updateQuery = `
            UPDATE test_instances 
            SET assigned_tester = $1, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [assigned_tester, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test instance not found'
            });
        }
        
        // Log assignment
        const auditQuery = `
            INSERT INTO test_audit_log (
                test_instance_id, session_id, changed_by, action_type, reason,
                changed_at
            ) VALUES ($1, $2, $3, 'assignment', $4, CURRENT_TIMESTAMP)
        `;
        
        await pool.query(auditQuery, [
            id, result.rows[0].session_id, req.user.id, `Test assigned to tester ID: ${assigned_tester}`
        ]);
        
        res.json({
            success: true,
            test_instance: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error assigning test instance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign test instance',
            details: error.message
        });
    }
});

/**
 * GET /api/test-instances/session/:sessionId/matrix
 * Get a testing matrix view for a session (requirements vs pages)
 */
router.get('/session/:sessionId/matrix', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Get session info
        const sessionQuery = `
            SELECT * FROM test_sessions WHERE id = $1
        `;
        const sessionResult = await pool.query(sessionQuery, [sessionId]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        // Get matrix data
        const matrixQuery = `
            SELECT 
                tr.id as requirement_id,
                tr.criterion_number,
                tr.title as requirement_title,
                tr.level,
                tr.test_method,
                cdp.id as page_id,
                cdp.url as page_url,
                cdp.title as page_title,
                ti.id as test_instance_id,
                ti.status,
                ti.confidence_level,
                ti.assigned_tester,
                u.username as assigned_tester_username
            FROM test_requirements tr
            CROSS JOIN crawler_discovered_pages cdp
            LEFT JOIN test_instances ti ON (
                tr.id = ti.requirement_id 
                AND cdp.id = ti.page_id 
                AND ti.session_id = $1
            )
            LEFT JOIN users u ON ti.assigned_tester = u.id
            WHERE cdp.id IN (
                SELECT DISTINCT page_id 
                FROM test_instances 
                WHERE session_id = $1 AND page_id IS NOT NULL
            )
            AND tr.id IN (
                SELECT DISTINCT requirement_id 
                FROM test_instances 
                WHERE session_id = $1
            )
            ORDER BY tr.criterion_number, cdp.url
        `;
        
        const matrixResult = await pool.query(matrixQuery, [sessionId]);
        
        // Organize data into matrix format
        const requirements = {};
        const pages = {};
        const matrix = {};
        
        matrixResult.rows.forEach(row => {
            // Build requirements map
            if (!requirements[row.requirement_id]) {
                requirements[row.requirement_id] = {
                    id: row.requirement_id,
                    criterion_number: row.criterion_number,
                    title: row.requirement_title,
                    level: row.level,
                    test_method: row.test_method
                };
            }
            
            // Build pages map
            if (!pages[row.page_id]) {
                pages[row.page_id] = {
                    id: row.page_id,
                    url: row.page_url,
                    title: row.page_title
                };
            }
            
            // Build matrix
            const key = `${row.requirement_id}-${row.page_id}`;
            matrix[key] = {
                test_instance_id: row.test_instance_id,
                status: row.status,
                confidence_level: row.confidence_level,
                assigned_tester: row.assigned_tester,
                assigned_tester_username: row.assigned_tester_username
            };
        });
        
        res.json({
            success: true,
            session: sessionResult.rows[0],
            matrix: {
                requirements: Object.values(requirements),
                pages: Object.values(pages),
                test_instances: matrix
            }
        });
        
    } catch (error) {
        console.error('Error fetching testing matrix:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch testing matrix',
            details: error.message
        });
    }
});

module.exports = router; 
module.exports = router; 
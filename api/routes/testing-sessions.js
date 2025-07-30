const express = require('express');
const router = express.Router();
const { pool } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');

/**
 * TESTING SESSIONS API
 * 
 * Unified testing session management for accessibility compliance
 * Supports WCAG (A, AA, AAA) and Section 508 conformance levels
 * Automatic requirement copying and test instance generation
 */

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get requirements based on conformance level
 */
async function getRequirementsForConformanceLevel(conformanceLevel) {
    let query;
    let params = [];
    
    switch (conformanceLevel) {
        case 'wcag_a':
            query = `
                SELECT * FROM test_requirements 
                WHERE requirement_type = 'wcag' AND level = 'a' AND is_active = true
                ORDER BY criterion_number
            `;
            break;
            
        case 'wcag_aa':
            query = `
                SELECT * FROM test_requirements 
                WHERE requirement_type = 'wcag' AND level IN ('a', 'aa') AND is_active = true
                ORDER BY criterion_number
            `;
            break;
            
        case 'wcag_aaa':
            query = `
                SELECT * FROM test_requirements 
                WHERE requirement_type = 'wcag' AND is_active = true
                ORDER BY criterion_number
            `;
            break;
            
        case 'section_508':
            query = `
                SELECT * FROM test_requirements 
                WHERE requirement_type = 'section_508' AND is_active = true
                ORDER BY criterion_number
            `;
            break;
            
        case 'combined':
            query = `
                SELECT * FROM test_requirements 
                WHERE requirement_type IN ('wcag', 'section_508') 
                AND is_active = true
                ORDER BY requirement_type, criterion_number
            `;
            break;
            
        default:
            throw new Error(`Invalid conformance level: ${conformanceLevel}`);
    }
    
    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Create test instances for a session
 */
async function createTestInstances(client, sessionId, requirements, pages = null) {
    const instances = [];
    
    for (const requirement of requirements) {
        if (pages && pages.length > 0) {
            // Create instances for each page
            for (const page of pages) {
                const instanceQuery = `
                    INSERT INTO test_instances (
                        session_id, requirement_id, page_id, status, 
                        test_method_used, created_at
                    ) VALUES ($1, $2, $3, 'pending', $4, CURRENT_TIMESTAMP)
                    RETURNING *
                `;
                
                const testMethod = requirement.test_method === 'both' ? 'automated' : requirement.test_method;
                const instanceResult = await client.query(instanceQuery, [
                    sessionId, requirement.id, page.id, testMethod
                ]);
                
                instances.push(instanceResult.rows[0]);
            }
        } else {
            // Create site-wide instance (no specific page)
            const instanceQuery = `
                INSERT INTO test_instances (
                    session_id, requirement_id, status, 
                    test_method_used, created_at
                ) VALUES ($1, $2, 'pending', $3, CURRENT_TIMESTAMP)
                RETURNING *
            `;
            
            const testMethod = requirement.test_method === 'both' ? 'automated' : requirement.test_method;
            const instanceResult = await client.query(instanceQuery, [
                sessionId, requirement.id, testMethod
            ]);
            
            instances.push(instanceResult.rows[0]);
        }
    }
    
    return instances;
}

/**
 * Calculate session progress statistics
 */
async function calculateSessionProgress(sessionId) {
    const query = `
        SELECT 
            COUNT(*) as total_tests,
            COUNT(CASE WHEN status IN ('passed', 'failed', 'untestable', 'not_applicable') THEN 1 END) as completed_tests,
            COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed_tests,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
            COUNT(CASE WHEN status = 'untestable' THEN 1 END) as untestable_tests,
            COUNT(CASE WHEN status = 'not_applicable' THEN 1 END) as not_applicable_tests,
            COUNT(CASE WHEN status = 'needs_review' THEN 1 END) as needs_review_tests,
            COUNT(CASE WHEN status IN ('pending', 'in_progress') THEN 1 END) as remaining_tests
        FROM test_instances 
        WHERE session_id = $1
    `;
    
    const result = await pool.query(query, [sessionId]);
    const stats = result.rows[0];
    
    const completionPercentage = stats.total_tests > 0 
        ? ((parseInt(stats.completed_tests) / parseInt(stats.total_tests)) * 100).toFixed(2)
        : 0;
    
    return {
        totalTests: parseInt(stats.total_tests),
        completedTests: parseInt(stats.completed_tests),
        passedTests: parseInt(stats.passed_tests),
        failedTests: parseInt(stats.failed_tests),
        untestableTests: parseInt(stats.untestable_tests),
        notApplicableTests: parseInt(stats.not_applicable_tests),
        needsReviewTests: parseInt(stats.needs_review_tests),
        remainingTests: parseInt(stats.remaining_tests),
        completionPercentage: parseFloat(completionPercentage)
    };
}

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * GET /api/testing-sessions
 * List all testing sessions for a project
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { project_id, status, conformance_level } = req.query;
        
        let query = `
            SELECT 
                ts.*,
                p.name as project_name,
                creator.username as created_by_username,
                updater.username as updated_by_username
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN users creator ON ts.created_by = creator.id  
            LEFT JOIN users updater ON ts.updated_by = updater.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        if (project_id) {
            paramCount++;
            query += ` AND ts.project_id = $${paramCount}`;
            params.push(project_id);
        }
        
        if (status) {
            paramCount++;
            query += ` AND ts.status = $${paramCount}`;
            params.push(status);
        }
        
        if (conformance_level) {
            paramCount++;
            query += ` AND ts.conformance_level = $${paramCount}`;
            params.push(conformance_level);
        }
        
        query += ` ORDER BY ts.updated_at DESC`;
        
        const result = await pool.query(query, params);
        
        // Add progress statistics for each session
        const sessionsWithProgress = await Promise.all(
            result.rows.map(async (session) => {
                const progress = await calculateSessionProgress(session.id);
                return {
                    ...session,
                    progress
                };
            })
        );
        
        res.json({
            success: true,
            sessions: sessionsWithProgress,
            total: sessionsWithProgress.length
        });
        
    } catch (error) {
        console.error('Error fetching testing sessions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch testing sessions',
            details: error.message
        });
    }
});

/**
 * GET /api/testing-sessions/:id
 * Get detailed information about a specific testing session
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { include_instances = 'false' } = req.query;
        
        // Get session details
        const sessionQuery = `
            SELECT 
                ts.*,
                p.name as project_name,
                p.description as project_description,
                creator.username as created_by_username,
                updater.username as updated_by_username
            FROM test_sessions ts
            LEFT JOIN projects p ON ts.project_id = p.id
            LEFT JOIN users creator ON ts.created_by = creator.id  
            LEFT JOIN users updater ON ts.updated_by = updater.id
            WHERE ts.id = $1
        `;
        
        const sessionResult = await pool.query(sessionQuery, [id]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Testing session not found'
            });
        }
        
        const session = sessionResult.rows[0];
        
        // Get progress statistics
        const progress = await calculateSessionProgress(id);
        
        // Optionally include test instances
        let testInstances = null;
        if (include_instances === 'true') {
            const instancesQuery = `
                SELECT 
                    ti.*,
                    tr.criterion_number,
                    tr.title as requirement_title,
                    tr.description as requirement_description,
                    tr.level as requirement_level,
                    tr.test_method as requirement_test_method,
                    tr.testing_instructions,
                    dp.url as page_url,
                    dp.title as page_title,
                    tester.username as assigned_tester_username,
                    reviewer.username as reviewer_username
                FROM test_instances ti
                LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
                LEFT JOIN crawler_discovered_pages dp ON ti.page_id = dp.id
                LEFT JOIN users tester ON ti.assigned_tester = tester.id
                LEFT JOIN users reviewer ON ti.reviewer = reviewer.id
                WHERE ti.session_id = $1
                ORDER BY tr.criterion_number, dp.url
            `;
            
            const instancesResult = await pool.query(instancesQuery, [id]);
            testInstances = instancesResult.rows;
        }
        
        res.json({
            success: true,
            session: {
                ...session,
                progress,
                test_instances: testInstances
            }
        });
        
    } catch (error) {
        console.error('Error fetching testing session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch testing session',
            details: error.message
        });
    }
});

/**
 * POST /api/testing-sessions
 * Create a new testing session with wizard-based configuration
 */
router.post('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const {
            project_id,
            name,
            description,
            conformance_levels = [],
            selected_crawler_ids = [],
            selected_page_ids = [],
            smart_filtering = true,
            manual_requirements = []
        } = req.body;
        
        console.log('🧙‍♂️ Creating session with wizard data:', {
            project_id,
            name,
            conformance_levels,
            selected_crawler_ids,
            selected_page_ids: selected_page_ids.length,
            smart_filtering,
            manual_requirements: manual_requirements.length
        });
        
        // Validate required fields
        if (!project_id || !name) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: project_id, name'
            });
        }
        
        if (conformance_levels.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'At least one conformance level must be selected'
            });
        }
        
        if (selected_page_ids.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'At least one page must be selected for testing'
            });
        }
        
        // Verify project exists
        const projectCheck = await client.query('SELECT id FROM projects WHERE id = $1', [project_id]);
        if (projectCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        
        // Map wizard conformance levels to database values for session storage
        const dbLevelMapping = {
            'wcag_22_a': 'A',
            'wcag_22_aa': 'AA',
            'wcag_22_aaa': 'AAA',
            'section_508_base': 'Section508',
            'section_508_enhanced': 'Section508'
        };
        
        const mappedLevels = conformance_levels.map(level => dbLevelMapping[level] || level);
        const uniqueLevels = [...new Set(mappedLevels)]; // Remove duplicates
        
        // Database constraint allows single values or 'combined' for multiple
        const dbConformanceLevel = uniqueLevels.length > 1 ? 'combined' : uniqueLevels[0] || 'combined';
        
        console.log('📋 Mapped conformance levels:', conformance_levels, '->', dbConformanceLevel);
        
        const sessionQuery = `
            INSERT INTO test_sessions (
                project_id, name, description, conformance_level,
                status, created_by, updated_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, 'planning', $5, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        
        const sessionResult = await client.query(sessionQuery, [
            project_id, name, description, dbConformanceLevel, req.user.id
        ]);
        
        const session = sessionResult.rows[0];
        console.log('✅ Session created:', session.id);
        
        // Get requirements for selected conformance levels
        const requirements = await getRequirementsForWizardLevels(conformance_levels, smart_filtering, manual_requirements);
        
        if (requirements.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: `No active requirements found for selected conformance levels: ${conformance_levels.join(', ')}`
            });
        }
        
        console.log(`📋 Found ${requirements.length} requirements for conformance levels`);
        
        // Get selected pages from crawler data (cross-crawler deduplication)
        const pages = await getSelectedPagesFromCrawlers(selected_page_ids, selected_crawler_ids);
        
        if (pages.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'No valid pages found for selected page IDs'
            });
        }
        
        console.log(`🗂️ Found ${pages.length} pages for testing`);
        
        // Create test instances
        const testInstances = await createTestInstances(client, session.id, requirements, pages);
        
        // Log session creation
        const auditQuery = `
            INSERT INTO test_audit_log (
                test_instance_id, user_id, action_type, change_description,
                timestamp, details
            ) SELECT 
                id, $1, 'created', 'Test instance created for new session',
                CURRENT_TIMESTAMP, '{"session_creation": true}'::jsonb
            FROM (SELECT id FROM test_instances WHERE session_id = $2) ti
        `;
        
        await client.query(auditQuery, [req.user.id, session.id]);
        
        await client.query('COMMIT');
        
        // Get final progress statistics
        const progress = await calculateSessionProgress(session.id);
        
        res.status(201).json({
            success: true,
            session: {
                ...session,
                progress
            },
            test_instances_created: testInstances.length,
            requirements_copied: requirements.length,
            pages_included: pages ? pages.length : 0
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating testing session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create testing session',
            details: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/testing-sessions/:id
 * Update a testing session
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;
        
        // Build dynamic update query
        const updates = [];
        const params = [];
        let paramCount = 0;
        
        if (name !== undefined) {
            paramCount++;
            updates.push(`name = $${paramCount}`);
            params.push(name);
        }
        
        if (description !== undefined) {
            paramCount++;
            updates.push(`description = $${paramCount}`);
            params.push(description);
        }
        
        if (status !== undefined) {
            const validStatuses = ['planning', 'in_progress', 'paused', 'completed', 'cancelled', 'failed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }
            paramCount++;
            updates.push(`status = $${paramCount}`);
            params.push(status);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }
        
        // Add updated_by and updated_at
        paramCount++;
        updates.push(`updated_by = $${paramCount}`);
        params.push(req.user.id);
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        
        // Add session ID for WHERE clause
        paramCount++;
        params.push(id);
        
        const query = `
            UPDATE test_sessions 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Testing session not found'
            });
        }
        
        const session = result.rows[0];
        const progress = await calculateSessionProgress(session.id);
        
        res.json({
            success: true,
            session: {
                ...session,
                progress
            }
        });
        
    } catch (error) {
        console.error('Error updating testing session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update testing session',
            details: error.message
        });
    }
});

/**
 * DELETE /api/testing-sessions/:id
 * Delete a testing session and all associated test instances
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        
        // Check if session exists
        const sessionCheck = await client.query('SELECT * FROM test_sessions WHERE id = $1', [id]);
        if (sessionCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Testing session not found'
            });
        }
        
        const session = sessionCheck.rows[0];
        
        // Delete test instances (will cascade delete audit logs)
        const deleteInstancesResult = await client.query(
            'DELETE FROM test_instances WHERE session_id = $1',
            [id]
        );
        
        // Delete the session
        await client.query('DELETE FROM test_sessions WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Testing session deleted successfully',
            deleted_session: session,
            deleted_test_instances: deleteInstancesResult.rowCount
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting testing session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete testing session',
            details: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/testing-sessions/:id/progress
 * Get detailed progress statistics for a session
 */
router.get('/:id/progress', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verify session exists
        const sessionCheck = await pool.query('SELECT id FROM test_sessions WHERE id = $1', [id]);
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Testing session not found'
            });
        }
        
        const progress = await calculateSessionProgress(id);
        
        // Get breakdown by requirement type and level
        const breakdownQuery = `
            SELECT 
                tr.requirement_type,
                tr.level,
                tr.test_method,
                COUNT(*) as total_tests,
                COUNT(CASE WHEN ti.status = 'passed' THEN 1 END) as passed,
                COUNT(CASE WHEN ti.status = 'failed' THEN 1 END) as failed,
                COUNT(CASE WHEN ti.status IN ('passed', 'failed', 'untestable', 'not_applicable') THEN 1 END) as completed
            FROM test_instances ti
            JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ti.session_id = $1
            GROUP BY tr.requirement_type, tr.level, tr.test_method
            ORDER BY tr.requirement_type, tr.level
        `;
        
        const breakdownResult = await pool.query(breakdownQuery, [id]);
        
        res.json({
            success: true,
            progress: {
                ...progress,
                breakdown: breakdownResult.rows
            }
        });
        
    } catch (error) {
        console.error('Error fetching session progress:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session progress',
            details: error.message
        });
    }
});

/**
 * POST /api/testing-sessions/:id/duplicate
 * Create a copy of an existing testing session
 */
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { name, description } = req.body;
        
        // Get original session
        const originalSessionQuery = `
            SELECT * FROM test_sessions WHERE id = $1
        `;
        const originalResult = await client.query(originalSessionQuery, [id]);
        
        if (originalResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Original testing session not found'
            });
        }
        
        const originalSession = originalResult.rows[0];
        
        // Create new session
        const newSessionQuery = `
            INSERT INTO test_sessions (
                project_id, name, description, conformance_level,
                status, created_by, updated_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, 'planning', $5, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        
        const newSessionResult = await client.query(newSessionQuery, [
            originalSession.project_id,
            name || `${originalSession.name} (Copy)`,
            description || originalSession.description,
            originalSession.conformance_level,
            req.user.id
        ]);
        
        const newSession = newSessionResult.rows[0];
        
        // Copy test instances
        const copyInstancesQuery = `
            INSERT INTO test_instances (
                session_id, requirement_id, page_id, status,
                test_method_used, created_at
            )
            SELECT 
                $1, requirement_id, page_id, 'pending',
                test_method_used, CURRENT_TIMESTAMP
            FROM test_instances 
            WHERE session_id = $2
        `;
        
        await client.query(copyInstancesQuery, [newSession.id, id]);
        
        await client.query('COMMIT');
        
        const progress = await calculateSessionProgress(newSession.id);
        
        res.status(201).json({
            success: true,
            session: {
                ...newSession,
                progress
            },
            original_session_id: id
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error duplicating testing session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to duplicate testing session',
            details: error.message
        });
    } finally {
        client.release();
    }
});

// ===== WIZARD HELPER FUNCTIONS =====

/**
 * Get requirements for multiple conformance levels (wizard approach)
 */
async function getRequirementsForWizardLevels(conformanceLevels, smartFiltering = true, manualRequirements = []) {
    try {
        console.log('📋 Getting requirements for wizard levels:', conformanceLevels);
        
        // Map both wizard and database conformance levels to database values (use lowercase to match DB)
        const levelMapping = {
            // Wizard format (preferred)
            'wcag_22_a': { type: 'wcag', level: 'a' },
            'wcag_22_aa': { type: 'wcag', level: 'aa' },
            'wcag_22_aaa': { type: 'wcag', level: 'aaa' },
            'section_508_base': { type: 'section_508', level: 'base' },
            'section_508_enhanced': { type: 'section_508', level: 'enhanced' },
            // Database format (backward compatibility)
            'wcag_a': { type: 'wcag', level: 'a' },
            'wcag_aa': { type: 'wcag', level: 'aa' },
            'wcag_aaa': { type: 'wcag', level: 'aaa' },
            'section_508': { type: 'section_508', level: 'base' } // Default to base for section_508
        };
        
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;
        
        for (const conformanceLevel of conformanceLevels) {
            const mapping = levelMapping[conformanceLevel];
            if (mapping) {
                console.log(`✅ Mapped ${conformanceLevel} -> ${mapping.type}:${mapping.level}`);
                whereConditions.push(`(requirement_type = $${paramIndex} AND level = $${paramIndex + 1})`);
                queryParams.push(mapping.type, mapping.level);
                paramIndex += 2;
            } else {
                console.log(`❌ No mapping found for conformance level: ${conformanceLevel}`);
            }
        }
        
        if (whereConditions.length === 0) {
            console.log('⚠️ No valid conformance levels provided');
            return [];
        }
        
        const query = `
            SELECT * FROM test_requirements 
            WHERE is_active = true 
            AND (${whereConditions.join(' OR ')})
            ORDER BY requirement_type, level, criterion_number
        `;
        
        const result = await pool.query(query, queryParams);
        let requirements = result.rows;
        
        console.log(`✅ Found ${requirements.length} requirements for levels: ${conformanceLevels.join(', ')}`);
        
        // Apply manual filtering if not using smart filtering
        if (!smartFiltering && manualRequirements.length > 0) {
            requirements = requirements.filter(req => manualRequirements.includes(req.id));
            console.log(`🎯 Manual filtering applied: ${requirements.length} requirements selected`);
        }
        
        // TODO: Implement smart filtering logic based on page content analysis
        // For now, smart filtering just returns all applicable requirements
        
        return requirements;
        
    } catch (error) {
        console.error('Error getting requirements for wizard levels:', error);
        return [];
    }
}

/**
 * Get selected pages from multiple crawlers with deduplication
 */
async function getSelectedPagesFromCrawlers(selectedPageIds, selectedCrawlerIds) {
    try {
        console.log('🗂️ Getting pages from crawlers:', { selectedPageIds: selectedPageIds.length, selectedCrawlerIds });
        
        if (selectedPageIds.length === 0) {
            return [];
        }
        
        // Query to get pages from crawler_discovered_pages and map to discovered_pages
        const query = `
            SELECT 
                dp.id,
                cdp.url,
                cdp.title,
                cdp.crawler_id,
                cdp.status_code,
                cdp.content_type,
                cdp.first_discovered_at
            FROM crawler_discovered_pages cdp
            JOIN discovered_pages dp ON cdp.url = dp.url
            WHERE cdp.id = ANY($1::uuid[])
            ORDER BY cdp.url
        `;
        
        const result = await pool.query(query, [selectedPageIds]);
        const pages = result.rows;
        
        console.log(`✅ Retrieved ${pages.length} pages from crawler data`);
        
        // Map first_discovered_at to created_at for backward compatibility
        pages.forEach(page => {
            page.created_at = page.first_discovered_at;
        });
        
        // Additional deduplication by URL (in case same URL appears in multiple crawlers)
        const urlMap = new Map();
        pages.forEach(page => {
            if (!urlMap.has(page.url)) {
                urlMap.set(page.url, page);
            }
        });
        
        const deduplicatedPages = Array.from(urlMap.values());
        
        if (deduplicatedPages.length !== pages.length) {
            console.log(`🔄 Deduplicated ${pages.length} pages to ${deduplicatedPages.length} unique URLs`);
        }
        
        return deduplicatedPages;
        
    } catch (error) {
        console.error('Error getting selected pages from crawlers:', error);
        return [];
    }
}

/**
 * Create test instances with URL-based approach (Requirements × URLs = Tests)
 */
async function createTestInstances(client, sessionId, requirements, pages) {
    console.log(`🧪 Creating test matrix: ${requirements.length} requirements × ${pages.length} pages = ${requirements.length * pages.length} tests`);
    
    const instances = [];
    
    for (const requirement of requirements) {
        for (const page of pages) {
            const instanceQuery = `
                INSERT INTO test_instances (
                    session_id, requirement_id, page_id, status, 
                    test_method_used, created_at
                ) VALUES ($1, $2, $3, 'pending', $4, CURRENT_TIMESTAMP)
                RETURNING *
            `;
            
            const testMethod = requirement.test_method === 'both' ? 'automated' : requirement.test_method;
            
            try {
                const instanceResult = await client.query(instanceQuery, [
                    sessionId, requirement.id, page.id, testMethod
                ]);
                
                instances.push(instanceResult.rows[0]);
                
            } catch (error) {
                // Handle unique constraint violations (requirement + page already exists)
                if (error.code === '23505') {
                    console.log(`⚠️ Skipping duplicate test: ${requirement.criterion_number} × ${page.url}`);
                } else {
                    throw error;
                }
            }
        }
    }
    
    console.log(`✅ Successfully created ${instances.length} test instances`);
    return instances;
}

/**
 * Generate VPAT report for a testing session
 * GET /api/testing-sessions/:sessionId/vpat
 */
router.get('/:sessionId/vpat', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { 
            format = 'html',
            include_evidence = 'true',
            organization_name = '',
            product_name = '',
            product_version = '',
            evaluation_date = new Date().toISOString().split('T')[0]
        } = req.query;

        console.log(`📋 Generating VPAT report for session ${sessionId}`);

        // Get session information
        const sessionQuery = `
            SELECT ts.*, p.name as project_name, p.description as project_description
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `;
        const sessionResult = await pool.query(sessionQuery, [sessionId]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Testing session not found'
            });
        }

        const session = sessionResult.rows[0];

        // Get test results for VPAT generation
        const testResultsQuery = `
            WITH test_results AS (
                SELECT 
                    ti.id,
                    ti.status,
                    ti.result,
                    tr.criterion_number as wcag_criterion,
                    tr.title as requirement_title,
                    tr.level as wcag_level,
                    tr.section_508_equivalent,
                    cdp.url as page_url,
                    cdp.title as page_title,
                    u.username as tester_name,
                    ti.tested_at,
                    ti.notes,
                    te.evidence_type,
                    te.file_path as evidence_file
                FROM test_instances ti
                JOIN test_requirements tr ON ti.requirement_id = tr.id
                LEFT JOIN crawler_discovered_pages cdp ON ti.page_id = cdp.id
                LEFT JOIN users u ON ti.assigned_tester = u.id
                LEFT JOIN test_evidence te ON ti.id = te.test_instance_id
                WHERE ti.session_id = $1
            )
            SELECT 
                wcag_criterion,
                requirement_title,
                wcag_level,
                section_508_equivalent,
                COUNT(*) as total_tests,
                COUNT(CASE WHEN result = 'pass' THEN 1 END) as passed_tests,
                COUNT(CASE WHEN result = 'fail' THEN 1 END) as failed_tests,
                COUNT(CASE WHEN result = 'not_applicable' THEN 1 END) as na_tests,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tests,
                COUNT(DISTINCT page_url) as pages_tested,
                string_agg(DISTINCT page_url, '; ') as tested_pages,
                array_agg(DISTINCT evidence_file) FILTER (WHERE evidence_file IS NOT NULL) as evidence_files
            FROM test_results
            GROUP BY wcag_criterion, requirement_title, wcag_level, section_508_equivalent
            ORDER BY wcag_criterion
        `;

        const resultsResult = await pool.query(testResultsQuery, [sessionId]);
        const testResults = resultsResult.rows;

        // Calculate overall compliance
        const overallStats = testResults.reduce((acc, row) => {
            acc.totalTests += parseInt(row.total_tests);
            acc.passedTests += parseInt(row.passed_tests);
            acc.failedTests += parseInt(row.failed_tests);
            acc.naTests += parseInt(row.na_tests);
            acc.pendingTests += parseInt(row.pending_tests);
            return acc;
        }, { totalTests: 0, passedTests: 0, failedTests: 0, naTests: 0, pendingTests: 0 });

        const complianceRate = overallStats.totalTests > 0 ? 
            Math.round((overallStats.passedTests / overallStats.totalTests) * 100) : 0;

        // Determine compliance level for each criterion
        const vpatResults = testResults.map(result => {
            const total = parseInt(result.total_tests);
            const passed = parseInt(result.passed_tests);
            const failed = parseInt(result.failed_tests);
            const pending = parseInt(result.pending_tests);

            let conformanceLevel;
            let remarks;

            if (pending > 0) {
                conformanceLevel = 'Not Evaluated';
                remarks = `Testing in progress (${pending} tests pending)`;
            } else if (failed > 0) {
                conformanceLevel = 'Does Not Support';
                remarks = `${failed} failed test${failed > 1 ? 's' : ''} found across ${result.pages_tested} page${result.pages_tested > 1 ? 's' : ''}`;
            } else if (passed === total && total > 0) {
                conformanceLevel = 'Supports';
                remarks = `All ${passed} tests passed across ${result.pages_tested} page${result.pages_tested > 1 ? 's' : ''}`;
            } else if (parseInt(result.na_tests) === total) {
                conformanceLevel = 'Not Applicable';
                remarks = 'This criterion does not apply to the tested content';
            } else {
                conformanceLevel = 'Partially Supports';
                remarks = `${passed} passed, ${failed} failed tests`;
            }

            return {
                criterion: result.wcag_criterion,
                title: result.requirement_title,
                level: result.wcag_level,
                section508: result.section_508_equivalent,
                conformanceLevel,
                remarks,
                testDetails: {
                    total,
                    passed,
                    failed,
                    pending,
                    pagesCount: parseInt(result.pages_tested),
                    testedPages: result.tested_pages
                },
                evidenceFiles: include_evidence === 'true' ? result.evidence_files : null
            };
        });

        // Build VPAT document
        const vpatDocument = {
            metadata: {
                generatedAt: new Date().toISOString(),
                generatedBy: req.user?.username || 'System',
                vpatVersion: '2.4 Rev 508',
                sessionId: session.id,
                sessionName: session.name,
                projectName: session.project_name,
                evaluationDate,
                organizationInfo: {
                    name: organization_name || session.project_name,
                    productName: product_name || session.name,
                    productVersion: product_version || '1.0',
                    evaluationType: 'Web Application Accessibility Assessment',
                    conformanceLevel: 'Level AA',
                    evaluationScope: `${testResults.length} WCAG 2.2 criteria tested across ${[...new Set(testResults.flatMap(r => r.tested_pages?.split('; ') || []))].length} pages`
                }
            },
            executiveSummary: {
                overallComplianceRate: complianceRate,
                complianceLevel: complianceRate >= 95 ? 'Excellent' : complianceRate >= 80 ? 'Good' : complianceRate >= 60 ? 'Fair' : 'Needs Improvement',
                totalCriteria: testResults.length,
                totalTests: overallStats.totalTests,
                passedTests: overallStats.passedTests,
                failedTests: overallStats.failedTests,
                pendingTests: overallStats.pendingTests,
                keyFindings: vpatResults.filter(r => r.conformanceLevel === 'Does Not Support').length === 0 ? 
                    'No critical accessibility barriers identified' : 
                    `${vpatResults.filter(r => r.conformanceLevel === 'Does Not Support').length} criteria require remediation`
            },
            wcagResults: vpatResults,
            section508Mapping: vpatResults.filter(r => r.section508).map(r => ({
                section508Criterion: r.section508,
                wcagEquivalent: r.criterion,
                conformanceLevel: r.conformanceLevel,
                remarks: r.remarks
            })),
            recommendations: vpatResults
                .filter(r => r.conformanceLevel === 'Does Not Support')
                .map(r => ({
                    criterion: r.criterion,
                    title: r.title,
                    priority: r.level === 'AA' ? 'High' : r.level === 'A' ? 'Critical' : 'Medium',
                    recommendation: `Address failures in ${r.criterion}: ${r.title}`
                }))
        };

        if (format === 'json') {
            res.json({
                success: true,
                vpat: vpatDocument
            });
        } else {
            // Generate HTML VPAT
            const htmlVpat = generateHTMLVPAT(vpatDocument);
            
            res.set({
                'Content-Type': 'text/html',
                'Content-Disposition': `attachment; filename="VPAT-${session.name}-${new Date().toISOString().split('T')[0]}.html"`
            });
            res.send(htmlVpat);
        }

        console.log(`✅ VPAT report generated successfully for session ${sessionId}`);

    } catch (error) {
        console.error('Error generating VPAT report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate VPAT report',
            message: error.message
        });
    }
});

/**
 * Generate HTML VPAT document
 */
function generateHTMLVPAT(vpatDocument) {
    const { metadata, executiveSummary, wcagResults, section508Mapping, recommendations } = vpatDocument;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VPAT ${metadata.vpatVersion} - ${metadata.organizationInfo.productName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .section { margin: 30px 0; }
        .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .supports { background-color: #d4edda; }
        .does-not-support { background-color: #f8d7da; }
        .partially-supports { background-color: #fff3cd; }
        .not-applicable { background-color: #f8f9fa; }
        .not-evaluated { background-color: #e2e3e5; }
        .summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { padding: 20px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
        .generated-info { font-size: 0.9em; color: #666; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Voluntary Product Accessibility Template (VPAT®)</h1>
        <h2>${metadata.vpatVersion}</h2>
        <h3>${metadata.organizationInfo.productName}</h3>
        <p><strong>Organization:</strong> ${metadata.organizationInfo.name}</p>
        <p><strong>Evaluation Date:</strong> ${metadata.evaluationDate}</p>
        <p><strong>Product Version:</strong> ${metadata.organizationInfo.productVersion}</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="summary-stats">
            <div class="stat-card">
                <h3>Overall Compliance</h3>
                <p style="font-size: 2em; margin: 0; color: ${executiveSummary.overallComplianceRate >= 80 ? '#28a745' : '#dc3545'};">
                    ${executiveSummary.overallComplianceRate}%
                </p>
                <p>${executiveSummary.complianceLevel}</p>
            </div>
            <div class="stat-card">
                <h3>Criteria Tested</h3>
                <p style="font-size: 2em; margin: 0;">${executiveSummary.totalCriteria}</p>
                <p>WCAG 2.2 Criteria</p>
            </div>
            <div class="stat-card">
                <h3>Tests Passed</h3>
                <p style="font-size: 2em; margin: 0; color: #28a745;">${executiveSummary.passedTests}</p>
                <p>of ${executiveSummary.totalTests} total tests</p>
            </div>
            <div class="stat-card">
                <h3>Issues Found</h3>
                <p style="font-size: 2em; margin: 0; color: ${executiveSummary.failedTests > 0 ? '#dc3545' : '#28a745'};">${executiveSummary.failedTests}</p>
                <p>Failed Tests</p>
            </div>
        </div>
        <p><strong>Key Findings:</strong> ${executiveSummary.keyFindings}</p>
        <p><strong>Evaluation Scope:</strong> ${metadata.organizationInfo.evaluationScope}</p>
    </div>

    <div class="section">
        <h2>WCAG 2.2 Conformance Report</h2>
        <table>
            <thead>
                <tr>
                    <th>Criterion</th>
                    <th>Title</th>
                    <th>Level</th>
                    <th>Conformance Level</th>
                    <th>Remarks and Explanations</th>
                </tr>
            </thead>
            <tbody>
                ${wcagResults.map(result => `
                    <tr class="${result.conformanceLevel.toLowerCase().replace(/\s+/g, '-')}">
                        <td>${result.criterion}</td>
                        <td>${result.title}</td>
                        <td>${result.level}</td>
                        <td><strong>${result.conformanceLevel}</strong></td>
                        <td>${result.remarks}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${section508Mapping.length > 0 ? `
    <div class="section">
        <h2>Section 508 Compliance Report</h2>
        <table>
            <thead>
                <tr>
                    <th>Section 508 Criterion</th>
                    <th>WCAG 2.2 Equivalent</th>
                    <th>Conformance Level</th>
                    <th>Remarks</th>
                </tr>
            </thead>
            <tbody>
                ${section508Mapping.map(mapping => `
                    <tr class="${mapping.conformanceLevel.toLowerCase().replace(/\s+/g, '-')}">
                        <td>${mapping.section508Criterion}</td>
                        <td>${mapping.wcagEquivalent}</td>
                        <td><strong>${mapping.conformanceLevel}</strong></td>
                        <td>${mapping.remarks}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    ${recommendations.length > 0 ? `
    <div class="section">
        <h2>Recommendations for Remediation</h2>
        <table>
            <thead>
                <tr>
                    <th>Priority</th>
                    <th>Criterion</th>
                    <th>Issue</th>
                    <th>Recommendation</th>
                </tr>
            </thead>
            <tbody>
                ${recommendations.map(rec => `
                    <tr>
                        <td><strong>${rec.priority}</strong></td>
                        <td>${rec.criterion}</td>
                        <td>${rec.title}</td>
                        <td>${rec.recommendation}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : '<div class="section"><h2>Recommendations</h2><p><strong>Excellent!</strong> No issues found that require remediation.</p></div>'}

    <div class="generated-info">
        <p><strong>Report Generated:</strong> ${metadata.generatedAt}</p>
        <p><strong>Generated By:</strong> ${metadata.generatedBy}</p>
        <p><strong>Testing Session:</strong> ${metadata.sessionName}</p>
        <p><strong>VPAT Version:</strong> ${metadata.vpatVersion}</p>
        <p><em>This report was automatically generated from accessibility test results using the VPAT Accessibility Testing Platform.</em></p>
    </div>
</body>
</html>
    `.trim();
}

module.exports = router; 
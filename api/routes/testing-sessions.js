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
            'wcag_22_a': 'wcag_a',
            'wcag_22_aa': 'wcag_aa',
            'wcag_22_aaa': 'wcag_aaa',
            'section_508_base': 'section_508',
            'section_508_enhanced': 'section_508'
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
                test_instance_id, session_id, changed_by, action_type, reason,
                changed_at, metadata
            ) SELECT 
                id, $2, $1, 'created', 'Test instance created for new session',
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
        
        // Query to get pages from crawler_discovered_pages (web crawler data)
        const query = `
            SELECT 
                id,
                url,
                title,
                crawler_id,
                status_code,
                content_type,
                first_discovered_at
            FROM crawler_discovered_pages 
            WHERE id = ANY($1::uuid[])
            ORDER BY url
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

module.exports = router; 
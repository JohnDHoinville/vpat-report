const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/manual-testing');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET /api/manual-testing/requirements
// Get all WCAG requirements with testing procedures
router.get('/requirements', authenticateToken, async (req, res) => {
    try {
        const { level, page_type, search } = req.query;
        
        let query = `
            SELECT 
                id,
                wcag_version,
                level,
                criterion_number,
                title,
                description,
                manual_test_procedure,
                tool_mappings,
                understanding_url,
                applies_to_page_types
            FROM wcag_requirements 
            WHERE 1=1
        `;
        const params = [];
        
        if (level) {
            query += ` AND level = $${params.length + 1}`;
            params.push(level);
        }
        
        if (page_type) {
            query += ` AND ($${params.length + 1} = ANY(applies_to_page_types) OR 'all' = ANY(applies_to_page_types))`;
            params.push(page_type);
        }
        
        if (search) {
            query += ` AND (title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }
        
        query += ` ORDER BY criterion_number`;
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            requirements: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching WCAG requirements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch WCAG requirements'
        });
    }
});

// GET /api/manual-testing/session/:sessionId/assignments
// Get smart testing assignments for a session (excludes automated coverage, prioritizes manual-only criteria)
router.get('/session/:sessionId/assignments', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status, page_id, requirement_id, priority, coverage_type = 'smart' } = req.query;
        
        let query;
        let params = [sessionId];
        
        if (coverage_type === 'smart') {
            // Smart filtering: Exclude criteria already passed by automated tests, prioritize manual-only
            query = `
                WITH                 automated_coverage AS (
                    -- Get pages that have automated test results but no violations for WCAG criteria (passed)
                    SELECT DISTINCT 
                        dp.id as page_id,
                        wr.criterion_number
                    FROM test_sessions ts
                    JOIN site_discovery sd ON ts.project_id = sd.project_id  
                    JOIN discovered_pages dp ON sd.id = dp.discovery_id
                    JOIN automated_test_results ar ON dp.id = ar.page_id
                    CROSS JOIN wcag_requirements wr
                    WHERE ts.id = $1 
                    AND ar.id IS NOT NULL  -- Has automated test results
                    AND NOT EXISTS (
                        -- No violations found for this WCAG criterion
                        SELECT 1 FROM violations v 
                        WHERE v.automated_result_id = ar.id 
                        AND v.wcag_criterion = wr.criterion_number
                    )
                    AND wr.testable_method IN ('automated', 'hybrid')  -- Only for automatable criteria
                ),
                failed_automated AS (
                    -- Get WCAG criteria that have violations and need manual verification
                    SELECT DISTINCT 
                        dp.id as page_id,
                        v.wcag_criterion as criterion_number,
                        'verification_needed' as assignment_type
                    FROM test_sessions ts
                    JOIN site_discovery sd ON ts.project_id = sd.project_id  
                    JOIN discovered_pages dp ON sd.id = dp.discovery_id
                    JOIN automated_test_results ar ON dp.id = ar.page_id
                    JOIN violations v ON v.automated_result_id = ar.id
                    WHERE ts.id = $1 
                    AND v.wcag_criterion IS NOT NULL
                ),
                testing_matrix AS (
                    SELECT 
                        dp.id as page_id,
                        dp.url as page_url,
                        dp.title as page_title,
                        dp.page_type,
                        wr.id as requirement_id,
                        wr.criterion_number,
                        wr.title as requirement_title,
                        wr.level as wcag_level,
                        wr.manual_test_procedure,
                        wr.testable_method,
                        wr.automation_coverage,
                        CASE 
                            WHEN 'all' = ANY(wr.applies_to_page_types) THEN true
                            WHEN dp.page_type = ANY(wr.applies_to_page_types) THEN true
                            ELSE false
                        END as applicable,
                        CASE 
                            WHEN fa.criterion_number IS NOT NULL THEN 'failed_verification'
                            WHEN ac.criterion_number IS NOT NULL THEN 'automated_covered'
                            WHEN wr.testable_method = 'manual_only' THEN 'manual_priority'
                            WHEN wr.testable_method = 'hybrid' AND wr.automation_coverage = 'low' THEN 'manual_recommended'
                            WHEN wr.testable_method = 'automated' THEN 'automated_primary'
                            ELSE 'manual_standard'
                        END as test_category,
                        CASE 
                            WHEN fa.criterion_number IS NOT NULL THEN 5  -- Failed automated = highest priority
                            WHEN wr.testable_method = 'manual_only' THEN 4  -- Manual-only = high priority
                            WHEN wr.testable_method = 'hybrid' AND wr.automation_coverage = 'low' THEN 3  -- Low automation coverage
                            WHEN wr.level = 'A' THEN 2
                            WHEN wr.level = 'AA' THEN 2  
                            WHEN wr.level = 'AAA' THEN 1
                            ELSE 0
                        END as smart_priority_score
                    FROM discovered_pages dp
                    JOIN site_discovery sd ON dp.discovery_id = sd.id
                    JOIN test_sessions ts ON sd.project_id = ts.project_id
                    CROSS JOIN wcag_requirements wr
                    LEFT JOIN automated_coverage ac ON (dp.id = ac.page_id AND wr.criterion_number = ac.criterion_number)
                    LEFT JOIN failed_automated fa ON (dp.id = fa.page_id AND wr.criterion_number = fa.criterion_number)
                    WHERE ts.id = $1
                )
                SELECT 
                    tm.*,
                    mtr.result as current_result,
                    mtr.confidence_level,
                    mtr.notes,
                    mtr.tested_at,
                    mtr.tester_name,
                    mtr.assigned_tester,
                    CASE 
                        WHEN mtr.result IS NOT NULL THEN 'completed'
                        WHEN tm.applicable = false THEN 'not_applicable'
                        WHEN tm.test_category = 'automated_covered' THEN 'automated_passed'
                        WHEN tm.test_category = 'failed_verification' THEN 'needs_verification'
                        WHEN tm.test_category = 'manual_priority' THEN 'manual_required'
                        WHEN tm.test_category = 'manual_recommended' THEN 'manual_recommended'
                        WHEN tm.test_category = 'automated_primary' THEN 'automated_sufficient'
                        ELSE 'pending'
                    END as assignment_status
                FROM testing_matrix tm
                LEFT JOIN manual_test_results mtr ON (
                    tm.page_id = mtr.page_id AND 
                    tm.requirement_id = mtr.requirement_id AND 
                    mtr.test_session_id = $1
                )
                WHERE tm.applicable = true
                -- Smart filtering: Exclude automated-covered unless specifically requested
                AND tm.test_category NOT IN ('automated_covered', 'automated_primary')
            `;
        } else {
            // Legacy mode: Show all applicable criteria (backward compatibility)
            query = `
                WITH testing_matrix AS (
                    SELECT 
                        dp.id as page_id,
                        dp.url as page_url,
                        dp.title as page_title,
                        dp.page_type,
                        wr.id as requirement_id,
                        wr.criterion_number,
                        wr.title as requirement_title,
                        wr.level as wcag_level,
                        wr.manual_test_procedure,
                        wr.testable_method,
                        CASE 
                            WHEN 'all' = ANY(wr.applies_to_page_types) THEN true
                            WHEN dp.page_type = ANY(wr.applies_to_page_types) THEN true
                            ELSE false
                        END as applicable,
                        'manual_standard' as test_category,
                        CASE 
                            WHEN wr.level = 'A' THEN 3
                            WHEN wr.level = 'AA' THEN 2  
                            WHEN wr.level = 'AAA' THEN 1
                            ELSE 0
                        END as smart_priority_score
                    FROM discovered_pages dp
                    JOIN site_discovery sd ON dp.discovery_id = sd.id
                    JOIN test_sessions ts ON sd.project_id = ts.project_id
                    CROSS JOIN wcag_requirements wr
                    WHERE ts.id = $1
                )
                SELECT 
                    tm.*,
                    mtr.result as current_result,
                    mtr.confidence_level,
                    mtr.notes,
                    mtr.tested_at,
                    mtr.tester_name,
                    mtr.assigned_tester,
                    CASE 
                        WHEN mtr.result IS NOT NULL THEN 'completed'
                        WHEN tm.applicable = false THEN 'not_applicable'
                        ELSE 'pending'
                    END as assignment_status
                FROM testing_matrix tm
                LEFT JOIN manual_test_results mtr ON (
                    tm.page_id = mtr.page_id AND 
                    tm.requirement_id = mtr.requirement_id AND 
                    mtr.test_session_id = $1
                )
                WHERE tm.applicable = true
            `;
        }
        
        // Add filters
        if (status) {
            if (status === 'pending') {
                query += ` AND mtr.result IS NULL`;
            } else if (status === 'completed') {
                query += ` AND mtr.result IS NOT NULL`;
            } else if (status === 'needs_verification') {
                query += ` AND tm.test_category = 'failed_verification'`;
            } else if (status === 'manual_priority') {
                query += ` AND tm.test_category IN ('manual_priority', 'manual_recommended')`;
            }
        }
        
        if (page_id) {
            query += ` AND tm.page_id = $${params.length + 1}`;
            params.push(page_id);
        }
        
        if (requirement_id) {
            query += ` AND tm.requirement_id = $${params.length + 1}`;
            params.push(requirement_id);
        }
        
        if (priority === 'high') {
            query += ` AND tm.smart_priority_score >= 3`;
        }
        
        query += ` ORDER BY tm.smart_priority_score DESC, tm.criterion_number, tm.page_url`;
        
        const result = await pool.query(query, params);
        
        // Group by page for better organization
        const pageGroups = {};
        result.rows.forEach(row => {
            if (!pageGroups[row.page_id]) {
                pageGroups[row.page_id] = {
                    page_id: row.page_id,
                    page_url: row.page_url,
                    page_title: row.page_title,
                    page_type: row.page_type,
                    assignments: []
                };
            }
            
            pageGroups[row.page_id].assignments.push({
                requirement_id: row.requirement_id,
                criterion_number: row.criterion_number,
                requirement_title: row.requirement_title,
                wcag_level: row.wcag_level,
                manual_test_procedure: row.manual_test_procedure,
                testable_method: row.testable_method,
                test_category: row.test_category,
                smart_priority_score: row.smart_priority_score,
                assignment_status: row.assignment_status,
                current_result: row.current_result,
                confidence_level: row.confidence_level,
                notes: row.notes,
                tested_at: row.tested_at,
                tester_name: row.tester_name,
                assigned_tester: row.assigned_tester
            });
        });
        
        // Calculate summary with category breakdown
        const categorySummary = result.rows.reduce((acc, row) => {
            acc[row.test_category] = (acc[row.test_category] || 0) + 1;
            return acc;
        }, {});
        
        res.json({
            success: true,
            assignments: Object.values(pageGroups),
            total_assignments: result.rows.length,
            coverage_type: coverage_type,
            summary: {
                pending: result.rows.filter(r => !r.current_result).length,
                completed: result.rows.filter(r => r.current_result).length,
                passed: result.rows.filter(r => r.current_result === 'pass').length,
                failed: result.rows.filter(r => r.current_result === 'fail').length,
                needs_verification: result.rows.filter(r => r.test_category === 'failed_verification').length,
                manual_priority: result.rows.filter(r => r.test_category === 'manual_priority').length,
                manual_recommended: result.rows.filter(r => r.test_category === 'manual_recommended').length
            },
            category_breakdown: categorySummary
        });
        
    } catch (error) {
        console.error('❌ Error fetching smart test assignments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch test assignments'
        });
    }
});

// POST /api/manual-testing/upload-image
// Upload evidence images for manual testing
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        const { testSessionId, pageId, requirementId } = req.body;
        
        if (!testSessionId || !pageId || !requirementId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: testSessionId, pageId, requirementId'
            });
        }

        // Store image metadata in database
        const imageRecord = await pool.query(`
            INSERT INTO manual_test_evidence (
                test_session_id,
                page_id,
                requirement_id,
                file_name,
                file_path,
                file_size,
                mime_type,
                uploaded_by,
                uploaded_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            RETURNING id, file_name, file_path
        `, [
            testSessionId,
            pageId,
            requirementId,
            req.file.filename,
            req.file.path,
            req.file.size,
            req.file.mimetype,
            req.user.id
        ]);

        res.json({
            success: true,
            image: {
                id: imageRecord.rows[0].id,
                name: imageRecord.rows[0].file_name,
                url: `/uploads/manual-testing/${imageRecord.rows[0].file_name}`
            }
        });

    } catch (error) {
        console.error('❌ Error uploading image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload image'
        });
    }
});

// POST /api/manual-testing/session/:sessionId/result
// Submit a manual test result
router.post('/session/:sessionId/result', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            page_id,
            requirement_id,
            requirement_type = 'wcag',
            result,
            confidence_level = 'medium',
            notes,
            images = [],
            evidence,
            tester_name,
            tested_at,
            auth_config_id,
            auth_role,
            tested_as_role
        } = req.body;
        
        // Validate required fields
        if (!page_id || !requirement_id || !result) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: page_id, requirement_id, result'
            });
        }
        
        // Validate result value
        if (!['pass', 'fail', 'not_applicable', 'not_tested', 'in_progress', 'assigned'].includes(result)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid result value. Must be: pass, fail, not_applicable, not_tested, in_progress, or assigned'
            });
        }

        // Begin transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Check if result already exists (upsert behavior)
            const existingResult = await client.query(`
                SELECT id FROM manual_test_results 
                WHERE test_session_id = $1 AND page_id = $2 AND requirement_id = $3
            `, [sessionId, page_id, requirement_id]);
            
            let resultId;
            
            if (existingResult.rows.length > 0) {
                // Update existing result with authentication info
                const updateResult = await client.query(`
                    UPDATE manual_test_results 
                    SET 
                        result = $4,
                        confidence_level = $5,
                        notes = $6,
                        evidence = $7,
                        tester_name = $8,
                        retested_at = CURRENT_TIMESTAMP,
                        tested_at = COALESCE($9::timestamp, tested_at),
                        auth_config_id = $10,
                        auth_role = $11,
                        tested_as_role = $12
                    WHERE test_session_id = $1 AND page_id = $2 AND requirement_id = $3
                    RETURNING id
                `, [sessionId, page_id, requirement_id, result, confidence_level, notes, JSON.stringify(evidence || {}), tester_name, tested_at, auth_config_id, auth_role, tested_as_role]);
                
                resultId = updateResult.rows[0].id;
                
            } else {
                // Insert new result
                const insertResult = await client.query(`
                    INSERT INTO manual_test_results (
                        test_session_id, page_id, requirement_id, requirement_type,
                        result, confidence_level, notes, evidence, tester_name, tested_at,
                        auth_config_id, auth_role, tested_as_role
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamp, CURRENT_TIMESTAMP), $11, $12, $13)
                    RETURNING id
                `, [sessionId, page_id, requirement_id, requirement_type, result, confidence_level, notes, JSON.stringify(evidence || {}), tester_name, tested_at, auth_config_id, auth_role, tested_as_role]);
                
                resultId = insertResult.rows[0].id;
            }

            // Associate images with this test result
            if (images && images.length > 0) {
                for (const image of images) {
                    if (image.id) {
                        await client.query(`
                            UPDATE manual_test_evidence 
                            SET manual_result_id = $1, description = $2
                            WHERE id = $3
                        `, [resultId, image.description || '', image.id]);
                    }
                }
            }
            
            // If result is 'fail', create or update a violation record
            if (result === 'fail') {
                // Get the WCAG criterion number for the violation
                const requirementResult = await client.query(`
                    SELECT criterion_number, title, description FROM wcag_requirements WHERE id = $1
                `, [requirement_id]);
                
                const requirement = requirementResult.rows[0];
                const wcagCriterion = requirement?.criterion_number || requirement_id;
                
                // Check if violation already exists for this result
                const existingViolation = await client.query(`
                    SELECT id FROM violations WHERE manual_result_id = $1
                `, [resultId]);
                
                if (existingViolation.rows.length > 0) {
                    // Update existing violation
                    await client.query(`
                        UPDATE violations 
                        SET 
                            description = $2,
                            remediation_guidance = $3,
                            notes = $4,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE manual_result_id = $1
                    `, [
                        resultId,
                        notes || requirement?.description || 'Manual test failure',
                        evidence?.remediation_suggestions || 'See WCAG guidelines for remediation',
                        notes
                    ]);
                } else {
                    // Create new violation
                    await client.query(`
                        INSERT INTO violations (
                            manual_result_id,
                            violation_type,
                            severity,
                            wcag_criterion,
                            description,
                            remediation_guidance,
                            notes,
                            created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                    `, [
                        resultId,
                        'manual_test_failure',
                        'serious', // Default severity, could be made configurable
                        wcagCriterion,
                        notes || requirement?.description || 'Manual test failure',
                        evidence?.remediation_suggestions || 'See WCAG guidelines for remediation',
                        notes
                    ]);
                }
            } else {
                // If result is not 'fail', remove any existing violations for this result
                await client.query(`
                    DELETE FROM violations WHERE manual_result_id = $1
                `, [resultId]);
            }
            
            // Commit transaction
            await client.query('COMMIT');
            
            // Update session progress (outside transaction)
            await updateSessionProgress(sessionId);
            
            res.json({
                success: true,
                message: 'Test result recorded successfully',
                result_id: resultId,
                images_associated: images.length
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Error recording test result:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record test result'
        });
    }
});

// GET /api/manual-testing/session/:sessionId/progress
// Get testing progress for a session
router.get('/session/:sessionId/progress', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const progressQuery = `
            WITH session_scope AS (
                SELECT 
                    COUNT(*) as total_applicable_tests,
                    COUNT(CASE WHEN mtr.result IS NOT NULL THEN 1 END) as completed_tests,
                    COUNT(CASE WHEN mtr.result = 'pass' THEN 1 END) as passed_tests,
                    COUNT(CASE WHEN mtr.result = 'fail' THEN 1 END) as failed_tests,
                    COUNT(CASE WHEN mtr.result = 'not_applicable' THEN 1 END) as not_applicable_tests
                FROM discovered_pages dp
                JOIN site_discovery sd ON dp.discovery_id = sd.id
                JOIN test_sessions ts ON sd.project_id = ts.project_id
                CROSS JOIN wcag_requirements wr
                LEFT JOIN manual_test_results mtr ON (
                    dp.id = mtr.page_id AND 
                    wr.id = mtr.requirement_id AND 
                    mtr.test_session_id = ts.id
                )
                WHERE ts.id = $1
                AND (
                    'all' = ANY(wr.applies_to_page_types) OR 
                    dp.page_type = ANY(wr.applies_to_page_types)
                )
            ),
            page_progress AS (
                SELECT 
                    dp.id as page_id,
                    dp.url as page_url,
                    dp.page_type,
                    COUNT(*) as total_criteria,
                    COUNT(CASE WHEN mtr.result IS NOT NULL THEN 1 END) as completed_criteria,
                    ROUND(
                        (COUNT(CASE WHEN mtr.result IS NOT NULL THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(*), 0), 
                        1
                    ) as completion_percentage
                FROM discovered_pages dp
                JOIN site_discovery sd ON dp.discovery_id = sd.id
                JOIN test_sessions ts ON sd.project_id = ts.project_id
                CROSS JOIN wcag_requirements wr
                LEFT JOIN manual_test_results mtr ON (
                    dp.id = mtr.page_id AND 
                    wr.id = mtr.requirement_id AND 
                    mtr.test_session_id = ts.id
                )
                WHERE ts.id = $1
                AND (
                    'all' = ANY(wr.applies_to_page_types) OR 
                    dp.page_type = ANY(wr.applies_to_page_types)
                )
                GROUP BY dp.id, dp.url, dp.page_type
            ),
            wcag_level_progress AS (
                SELECT 
                    wr.level,
                    COUNT(*) as total_criteria,
                    COUNT(CASE WHEN mtr.result IS NOT NULL THEN 1 END) as completed_criteria,
                    COUNT(CASE WHEN mtr.result = 'pass' THEN 1 END) as passed_criteria,
                    COUNT(CASE WHEN mtr.result = 'fail' THEN 1 END) as failed_criteria
                FROM discovered_pages dp
                JOIN site_discovery sd ON dp.discovery_id = sd.id
                JOIN test_sessions ts ON sd.project_id = ts.project_id
                CROSS JOIN wcag_requirements wr
                LEFT JOIN manual_test_results mtr ON (
                    dp.id = mtr.page_id AND 
                    wr.id = mtr.requirement_id AND 
                    mtr.test_session_id = ts.id
                )
                WHERE ts.id = $1
                AND (
                    'all' = ANY(wr.applies_to_page_types) OR 
                    dp.page_type = ANY(wr.applies_to_page_types)
                )
                GROUP BY wr.level
            )
            SELECT 
                (SELECT row_to_json(session_scope.*) FROM session_scope) as overall_progress,
                (
                    SELECT json_agg(
                        json_build_object(
                            'page_id', page_id,
                            'page_url', page_url,
                            'page_type', page_type,
                            'total_criteria', total_criteria,
                            'completed_criteria', completed_criteria,
                            'completion_percentage', completion_percentage
                        )
                    )
                    FROM page_progress
                ) as page_progress,
                (
                    SELECT json_agg(
                        json_build_object(
                            'wcag_level', level,
                            'total_criteria', total_criteria,
                            'completed_criteria', completed_criteria,
                            'passed_criteria', passed_criteria,
                            'failed_criteria', failed_criteria,
                            'completion_percentage', ROUND((completed_criteria * 100.0) / NULLIF(total_criteria, 0), 1)
                        )
                    )
                    FROM wcag_level_progress
                ) as wcag_level_progress
        `;
        
        const result = await pool.query(progressQuery, [sessionId]);
        const progressData = result.rows[0];
        
        res.json({
            success: true,
            progress: {
                overall: progressData.overall_progress,
                by_page: progressData.page_progress || [],
                by_wcag_level: progressData.wcag_level_progress || []
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching progress:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch testing progress'
        });
    }
});

// GET /api/manual-testing/session/:sessionId/coverage-analysis
// Get comprehensive coverage analysis showing automated vs manual testing scope
router.get('/session/:sessionId/coverage-analysis', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const analysisQuery = `
            WITH             automated_coverage AS (
                -- Get WCAG criteria coverage from automated tests
                SELECT DISTINCT 
                    dp.id as page_id,
                    dp.url as page_url,
                    dp.page_type,
                    wr.criterion_number,
                    CASE 
                        WHEN v.wcag_criterion IS NOT NULL THEN 'fail'
                        ELSE 'pass'
                    END as automated_result,
                    ar.tool_name,
                    ar.executed_at as automated_tested_at
                FROM test_sessions ts
                JOIN site_discovery sd ON ts.project_id = sd.project_id  
                JOIN discovered_pages dp ON sd.id = dp.discovery_id
                JOIN automated_test_results ar ON dp.id = ar.page_id
                CROSS JOIN wcag_requirements wr
                LEFT JOIN violations v ON (v.automated_result_id = ar.id AND v.wcag_criterion = wr.criterion_number)
                WHERE ts.id = $1 
                AND wr.testable_method IN ('automated', 'hybrid')  -- Only for automatable criteria
                AND ar.id IS NOT NULL  -- Has automated test results
            ),
            manual_coverage AS (
                -- Get WCAG criteria coverage from manual tests
                SELECT DISTINCT 
                    dp.id as page_id,
                    dp.url as page_url,
                    dp.page_type,
                    wr.criterion_number,
                    mtr.result as manual_result,
                    mtr.tested_at as manual_tested_at,
                    mtr.tester_name
                FROM test_sessions ts
                JOIN site_discovery sd ON ts.project_id = sd.project_id  
                JOIN discovered_pages dp ON sd.id = dp.discovery_id
                JOIN wcag_requirements wr ON true
                LEFT JOIN manual_test_results mtr ON (
                    dp.id = mtr.page_id AND 
                    wr.id = mtr.requirement_id AND 
                    mtr.test_session_id = ts.id
                )
                WHERE ts.id = $1
                AND (
                    'all' = ANY(wr.applies_to_page_types) OR
                    dp.page_type = ANY(wr.applies_to_page_types)
                )
            ),
            wcag_universe AS (
                -- All applicable WCAG criteria for this session's pages
                SELECT DISTINCT
                    dp.id as page_id,
                    dp.url as page_url,
                    dp.page_type,
                    wr.criterion_number,
                    wr.title,
                    wr.level as wcag_level,
                    wr.testable_method,
                    wr.automation_coverage
                FROM test_sessions ts
                JOIN site_discovery sd ON ts.project_id = sd.project_id  
                JOIN discovered_pages dp ON sd.id = dp.discovery_id
                CROSS JOIN wcag_requirements wr
                WHERE ts.id = $1
                AND (
                    'all' = ANY(wr.applies_to_page_types) OR
                    dp.page_type = ANY(wr.applies_to_page_types)
                )
            )
            SELECT 
                wu.page_id,
                wu.page_url,
                wu.page_type,
                wu.criterion_number,
                wu.title,
                wu.wcag_level,
                wu.testable_method,
                wu.automation_coverage,
                ac.automated_result,
                ac.tool_name,
                ac.automated_tested_at,
                mc.manual_result,
                mc.manual_tested_at,
                mc.tester_name,
                CASE 
                    WHEN ac.automated_result IS NOT NULL AND mc.manual_result IS NOT NULL THEN 'both_tested'
                    WHEN ac.automated_result IS NOT NULL THEN 'automated_only'
                    WHEN mc.manual_result IS NOT NULL THEN 'manual_only'
                    WHEN wu.testable_method = 'automated' THEN 'automated_pending'
                    WHEN wu.testable_method = 'manual_only' THEN 'manual_pending'
                    ELSE 'untested'
                END as coverage_status,
                CASE 
                    WHEN ac.automated_result = 'pass' AND mc.manual_result = 'pass' THEN 'verified_pass'
                    WHEN ac.automated_result = 'fail' AND mc.manual_result = 'pass' THEN 'false_positive'
                    WHEN ac.automated_result = 'pass' AND mc.manual_result = 'fail' THEN 'missed_by_automation'
                    WHEN ac.automated_result = 'fail' AND mc.manual_result = 'fail' THEN 'confirmed_fail'
                    WHEN ac.automated_result = 'pass' AND mc.manual_result IS NULL THEN 'auto_pass_unverified'
                    WHEN ac.automated_result = 'fail' AND mc.manual_result IS NULL THEN 'auto_fail_unverified'
                    WHEN ac.automated_result IS NULL AND mc.manual_result = 'pass' THEN 'manual_pass'
                    WHEN ac.automated_result IS NULL AND mc.manual_result = 'fail' THEN 'manual_fail'
                    ELSE 'no_result'
                END as result_comparison
            FROM wcag_universe wu
            LEFT JOIN automated_coverage ac ON (wu.page_id = ac.page_id AND wu.criterion_number = ac.criterion_number)
            LEFT JOIN manual_coverage mc ON (wu.page_id = mc.page_id AND wu.criterion_number = mc.criterion_number)
            ORDER BY wu.page_url, wu.criterion_number
        `;
        
        const result = await pool.query(analysisQuery, [sessionId]);
        
        // Calculate summary statistics
        const coverage = result.rows;
        const totalCriteria = coverage.length;
        
        // Coverage status breakdown
        const coverageStatusSummary = coverage.reduce((acc, row) => {
            acc[row.coverage_status] = (acc[row.coverage_status] || 0) + 1;
            return acc;
        }, {});
        
        // Result comparison breakdown
        const resultComparisonSummary = coverage.reduce((acc, row) => {
            acc[row.result_comparison] = (acc[row.result_comparison] || 0) + 1;
            return acc;
        }, {});
        
        // Testable method breakdown
        const testableMethodSummary = coverage.reduce((acc, row) => {
            acc[row.testable_method] = (acc[row.testable_method] || 0) + 1;
            return acc;
        }, {});
        
        // WCAG level breakdown  
        const wcagLevelSummary = coverage.reduce((acc, row) => {
            acc[row.wcag_level] = (acc[row.wcag_level] || 0) + 1;
            return acc;
        }, {});
        
        // Calculate efficiency metrics
        const automatedTests = coverage.filter(r => r.automated_result).length;
        const manualTests = coverage.filter(r => r.manual_result).length;
        const duplicateTests = coverage.filter(r => r.automated_result && r.manual_result).length;
        const automationEfficiency = totalCriteria > 0 ? Math.round((automatedTests / totalCriteria) * 100) : 0;
        const manualEfficiency = totalCriteria > 0 ? Math.round((manualTests / totalCriteria) * 100) : 0;
        const redundancyRate = automatedTests > 0 ? Math.round((duplicateTests / automatedTests) * 100) : 0;
        
        // Group by page for detailed breakdown
        const pageBreakdown = {};
        coverage.forEach(row => {
            if (!pageBreakdown[row.page_id]) {
                pageBreakdown[row.page_id] = {
                    page_id: row.page_id,
                    page_url: row.page_url,
                    page_type: row.page_type,
                    criteria: [],
                    summary: {
                        total: 0,
                        automated_tested: 0,
                        manual_tested: 0,
                        both_tested: 0,
                        untested: 0
                    }
                };
            }
            
            pageBreakdown[row.page_id].criteria.push({
                criterion_number: row.criterion_number,
                title: row.title,
                wcag_level: row.wcag_level,
                testable_method: row.testable_method,
                automation_coverage: row.automation_coverage,
                coverage_status: row.coverage_status,
                result_comparison: row.result_comparison,
                automated_result: row.automated_result,
                manual_result: row.manual_result
            });
            
            // Update page summary
            const pageSummary = pageBreakdown[row.page_id].summary;
            pageSummary.total++;
            
            if (row.automated_result) pageSummary.automated_tested++;
            if (row.manual_result) pageSummary.manual_tested++;
            if (row.automated_result && row.manual_result) pageSummary.both_tested++;
            if (!row.automated_result && !row.manual_result) pageSummary.untested++;
        });
        
        res.json({
            success: true,
            session_id: sessionId,
            total_criteria: totalCriteria,
            coverage_analysis: {
                coverage_status: coverageStatusSummary,
                result_comparison: resultComparisonSummary,
                testable_method: testableMethodSummary,
                wcag_level: wcagLevelSummary
            },
            efficiency_metrics: {
                automation_efficiency: automationEfficiency,
                manual_efficiency: manualEfficiency,
                redundancy_rate: redundancyRate,
                total_automated_tests: automatedTests,
                total_manual_tests: manualTests,
                duplicate_tests: duplicateTests
            },
            page_breakdown: Object.values(pageBreakdown),
            recommendations: generateCoverageRecommendations(coverageStatusSummary, resultComparisonSummary, efficiency_metrics = {
                automation_efficiency: automationEfficiency,
                manual_efficiency: manualEfficiency,
                redundancy_rate: redundancyRate
            })
        });
        
    } catch (error) {
        console.error('❌ Error generating coverage analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate coverage analysis'
        });
    }
});

// GET /api/manual-testing/requirement/:id/procedure
// Get detailed testing procedure for a requirement with context
router.get('/requirement/:id/procedure', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { page_type, page_id, session_id } = req.query;
        
        const requirement = await pool.query(`
            SELECT 
                id,
                wcag_version,
                level,
                criterion_number,
                title,
                description,
                manual_test_procedure,
                tool_mappings,
                understanding_url,
                applies_to_page_types,
                testable_method,
                automation_coverage
            FROM wcag_requirements 
            WHERE id = $1
        `, [id]);
        
        if (requirement.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'WCAG requirement not found'
            });
        }
        
        const req_data = requirement.rows[0];
        
        // Get context about why this test is being shown
        let testContext = {
            category: 'manual_standard',
            violations: [],
            recommended_tools: [],
            context_message: ''
        };
        
        if (page_id && session_id) {
            // Determine test category and get violation details if applicable
            const contextQuery = `
                WITH test_context AS (
                    SELECT 
                        CASE 
                            WHEN v.wcag_criterion IS NOT NULL THEN 'failed_verification'
                            WHEN wr.testable_method = 'manual_only' THEN 'manual_priority'
                            WHEN wr.testable_method = 'hybrid' AND wr.automation_coverage = 'low' THEN 'manual_recommended'
                            WHEN wr.testable_method = 'automated' THEN 'automated_primary'
                            ELSE 'manual_standard'
                        END as test_category
                    FROM discovered_pages dp
                    JOIN test_sessions ts ON dp.id = $2
                    JOIN automated_test_results ar ON dp.id = ar.page_id
                    CROSS JOIN wcag_requirements wr
                    LEFT JOIN violations v ON (v.automated_result_id = ar.id AND v.wcag_criterion = wr.criterion_number)
                    WHERE ts.id = $3 AND wr.id = $1
                    LIMIT 1
                )
                SELECT 
                    tc.test_category,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', v.id,
                                'severity', v.severity,
                                'description', v.description,
                                'element_selector', v.element_selector,
                                'element_html', v.element_html,
                                'remediation_guidance', v.remediation_guidance,
                                'tool_name', ar.tool_name
                            )
                        ) FILTER (WHERE v.id IS NOT NULL),
                        '[]'::json
                    ) as violations
                FROM test_context tc
                LEFT JOIN discovered_pages dp ON dp.id = $2
                LEFT JOIN automated_test_results ar ON dp.id = ar.page_id
                LEFT JOIN violations v ON (v.automated_result_id = ar.id AND v.wcag_criterion = $4)
                GROUP BY tc.test_category
            `;
            
            const contextResult = await pool.query(contextQuery, [id, page_id, session_id, req_data.criterion_number]);
            
            if (contextResult.rows.length > 0) {
                const context = contextResult.rows[0];
                testContext.category = context.test_category;
                testContext.violations = context.violations || [];
                
                // Set context-specific guidance
                switch (context.test_category) {
                    case 'failed_verification':
                        testContext.context_message = `⚠️ Automated testing found ${testContext.violations.length} potential issue(s) with this criterion. Please verify if these are genuine accessibility problems or false positives.`;
                        testContext.recommended_tools = ['screen reader', 'keyboard navigation', 'manual inspection'];
                        break;
                    case 'manual_priority':
                        testContext.context_message = `🔍 This criterion requires manual testing as it cannot be reliably automated. Focus on user experience and real-world accessibility.`;
                        testContext.recommended_tools = ['screen reader', 'keyboard navigation', 'voice control', 'user testing'];
                        break;
                    case 'manual_recommended':
                        testContext.context_message = `📋 This criterion has limited automation coverage. Manual testing helps ensure comprehensive accessibility.`;
                        testContext.recommended_tools = ['screen reader', 'keyboard navigation', 'manual inspection'];
                        break;
                    default:
                        testContext.context_message = `📝 Standard manual accessibility testing for this criterion.`;
                        testContext.recommended_tools = ['screen reader', 'keyboard navigation', 'manual inspection'];
                }
            }
        }
        
        // Customize procedure based on page type if provided
        let procedure = req_data.manual_test_procedure;
        if (page_type && procedure && procedure.contextual_steps) {
            procedure = {
                ...procedure,
                steps: procedure.contextual_steps[page_type] || procedure.steps
            };
        }
        
        res.json({
            success: true,
            requirement: {
                ...req_data,
                manual_test_procedure: procedure
            },
            test_context: testContext
        });
        
    } catch (error) {
        console.error('❌ Error fetching requirement procedure:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch requirement procedure'
        });
    }
});

// Helper function to update session progress
async function updateSessionProgress(sessionId) {
    try {
        await pool.query(`
            UPDATE test_sessions 
            SET progress_summary = (
                SELECT json_build_object(
                    'total_tests', COUNT(*),
                    'completed_tests', COUNT(CASE WHEN mtr.result IS NOT NULL THEN 1 END),
                    'passed_tests', COUNT(CASE WHEN mtr.result = 'pass' THEN 1 END),
                    'failed_tests', COUNT(CASE WHEN mtr.result = 'fail' THEN 1 END),
                    'completion_percentage', ROUND(
                        (COUNT(CASE WHEN mtr.result IS NOT NULL THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(*), 0), 
                        1
                    ),
                    'last_updated', CURRENT_TIMESTAMP
                )
                FROM discovered_pages dp
                JOIN site_discovery sd ON dp.discovery_id = sd.id
                JOIN test_sessions ts ON sd.project_id = ts.project_id
                CROSS JOIN wcag_requirements wr
                LEFT JOIN manual_test_results mtr ON (
                    dp.id = mtr.page_id AND 
                    wr.id = mtr.requirement_id AND 
                    mtr.test_session_id = ts.id
                )
                WHERE ts.id = $1
                AND (
                    'all' = ANY(wr.applies_to_page_types) OR 
                    dp.page_type = ANY(wr.applies_to_page_types)
                )
            )
            WHERE id = $1
        `, [sessionId]);
    } catch (error) {
        console.error('⚠️ Error updating session progress:', error);
    }
}

// Helper function to generate coverage recommendations
function generateCoverageRecommendations(coverageStatus, resultComparison, efficiencyMetrics) {
    const recommendations = [];
    
    // Check automation efficiency
    if (efficiencyMetrics.automation_efficiency < 40) {
        recommendations.push({
            type: 'automation',
            priority: 'high',
            title: 'Increase Automated Testing Coverage',
            description: `Only ${efficiencyMetrics.automation_efficiency}% of applicable WCAG criteria are covered by automated tests.`,
            actions: [
                'Add more automated testing tools (axe-core, pa11y, Lighthouse)',
                'Configure tools to test more WCAG criteria',
                'Implement automated testing in CI/CD pipeline'
            ]
        });
    }
    
    // Check for manual testing gaps
    if (coverageStatus.manual_pending > 5) {
        recommendations.push({
            type: 'manual',
            priority: 'medium',
            title: 'Address Manual Testing Backlog',
            description: `${coverageStatus.manual_pending} manual-only criteria require testing.`,
            actions: [
                'Prioritize manual testing for Level A and AA criteria',
                'Focus on user experience and accessibility workflow testing',
                'Schedule screen reader and keyboard navigation testing'
            ]
        });
    }
    
    // Check for verification needs
    if (resultComparison.auto_fail_unverified > 0) {
        recommendations.push({
            type: 'verification',
            priority: 'high',
            title: 'Verify Failed Automated Tests',
            description: `${resultComparison.auto_fail_unverified} automated test failures need manual verification.`,
            actions: [
                'Review false positive rates for automated tools',
                'Manually verify flagged accessibility issues',
                'Update automated test configurations to reduce noise'
            ]
        });
    }
    
    // Check redundancy
    if (efficiencyMetrics.redundancy_rate > 60) {
        recommendations.push({
            type: 'efficiency',
            priority: 'low',
            title: 'Reduce Testing Redundancy',
            description: `${efficiencyMetrics.redundancy_rate}% of automated tests are being duplicated manually.`,
            actions: [
                'Configure manual testing to exclude criteria well-covered by automation',
                'Focus manual testing on areas with low automation coverage',
                'Use smart filtering to optimize testing workflows'
            ]
        });
    }
    
    return recommendations;
}

// ==============================================
// TESTER ASSIGNMENT ENDPOINTS
// ==============================================

// GET /api/manual-testing/testers
// Get list of available testers
router.get('/testers', authenticateToken, async (req, res) => {
    try {
        console.log('📋 Loading available testers...');
        
        const testers = await pool.query(`
            SELECT 
                id,
                username,
                full_name,
                email,
                role,
                is_active
            FROM users 
            WHERE is_active = true
            AND role IN ('admin', 'user')
            ORDER BY full_name, username
        `);
        
        res.json({
            success: true,
            testers: testers.rows
        });
        
    } catch (error) {
        console.error('❌ Error loading testers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load available testers'
        });
    }
});

// POST /api/manual-testing/assign-tester
// Assign a tester to specific requirements
router.post('/assign-tester', authenticateToken, async (req, res) => {
    try {
        const { 
            session_id, 
            page_id, 
            requirement_ids, // Array of requirement IDs
            assigned_tester_id,
            assigned_by 
        } = req.body;
        
        console.log('🎯 Assigning tester:', { session_id, page_id, requirement_ids, assigned_tester_id });
        
        // Get tester info
        const testerResult = await pool.query(`
            SELECT id, username, full_name FROM users WHERE id = $1
        `, [assigned_tester_id]);
        
        if (testerResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Tester not found'
            });
        }
        
        const tester = testerResult.rows[0];
        const assignments = [];
        
        // Process each requirement assignment
        for (const requirement_id of requirement_ids) {
            // Check if assignment already exists
            const existingResult = await pool.query(`
                SELECT id FROM manual_test_results 
                WHERE test_session_id = $1 AND page_id = $2 AND requirement_id = $3
            `, [session_id, page_id, requirement_id]);
            
            if (existingResult.rows.length > 0) {
                // Update existing assignment
                await pool.query(`
                    UPDATE manual_test_results 
                    SET assigned_tester = $1, 
                        result = 'assigned',
                        retested_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                `, [tester.full_name || tester.username, existingResult.rows[0].id]);
                
                assignments.push({
                    requirement_id,
                    assignment_id: existingResult.rows[0].id,
                    action: 'updated'
                });
            } else {
                // Create new assignment
                const newAssignment = await pool.query(`
                    INSERT INTO manual_test_results (
                        test_session_id, 
                        page_id, 
                        requirement_id, 
                        requirement_type,
                        result,
                        assigned_tester,
                        confidence_level,
                        notes,
                        tester_name,
                        tested_at
                    ) VALUES ($1, $2, $3, 'wcag', 'assigned', $4, 'medium', 
                             'Assigned to tester for manual evaluation', $5, CURRENT_TIMESTAMP)
                    RETURNING id
                `, [session_id, page_id, requirement_id, tester.full_name || tester.username, assigned_by]);
                
                assignments.push({
                    requirement_id,
                    assignment_id: newAssignment.rows[0].id,
                    action: 'created'
                });
            }
        }
        
        // Update session progress
        await updateSessionProgress(session_id);
        
        res.json({
            success: true,
            message: `Successfully assigned ${requirement_ids.length} requirement(s) to ${tester.full_name || tester.username}`,
            assignments,
            assigned_tester: tester
        });
        
    } catch (error) {
        console.error('❌ Error assigning tester:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign tester'
        });
    }
});

// POST /api/manual-testing/unassign-tester
// Remove tester assignment from requirements
router.post('/unassign-tester', authenticateToken, async (req, res) => {
    try {
        const { session_id, page_id, requirement_ids } = req.body;
        
        console.log('🔄 Unassigning tester from requirements:', { session_id, page_id, requirement_ids });
        
        for (const requirement_id of requirement_ids) {
            await pool.query(`
                UPDATE manual_test_results 
                SET assigned_tester = NULL,
                    result = 'not_tested',
                    retested_at = CURRENT_TIMESTAMP
                WHERE test_session_id = $1 AND page_id = $2 AND requirement_id = $3
            `, [session_id, page_id, requirement_id]);
        }
        
        // Update session progress
        await updateSessionProgress(session_id);
        
        res.json({
            success: true,
            message: `Successfully unassigned ${requirement_ids.length} requirement(s)`
        });
        
    } catch (error) {
        console.error('❌ Error unassigning tester:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unassign tester'
        });
    }
});

module.exports = router; 
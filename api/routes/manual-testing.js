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
// Get testing assignments for a session
router.get('/session/:sessionId/assignments', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status, page_id, requirement_id, priority } = req.query;
        
        let query = `
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
                    CASE 
                        WHEN 'all' = ANY(wr.applies_to_page_types) THEN true
                        WHEN dp.page_type = ANY(wr.applies_to_page_types) THEN true
                        ELSE false
                    END as applicable,
                    CASE 
                        WHEN wr.level = 'A' THEN 3
                        WHEN wr.level = 'AA' THEN 2  
                        WHEN wr.level = 'AAA' THEN 1
                        ELSE 0
                    END as priority_score
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
                CASE 
                    WHEN mtr.result IS NOT NULL THEN 'completed'
                    WHEN tm.applicable THEN 'pending'
                    ELSE 'not_applicable'
                END as assignment_status
            FROM testing_matrix tm
            LEFT JOIN manual_test_results mtr ON (
                tm.page_id = mtr.page_id AND 
                tm.requirement_id = mtr.requirement_id AND 
                mtr.test_session_id = $1
            )
            WHERE tm.applicable = true
        `;
        
        const params = [sessionId];
        
        if (status) {
            if (status === 'pending') {
                query += ` AND mtr.result IS NULL`;
            } else if (status === 'completed') {
                query += ` AND mtr.result IS NOT NULL`;
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
            query += ` AND tm.priority_score >= 2`;
        }
        
        query += ` ORDER BY tm.priority_score DESC, tm.criterion_number, tm.page_url`;
        
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
                priority_score: row.priority_score,
                assignment_status: row.assignment_status,
                current_result: row.current_result,
                confidence_level: row.confidence_level,
                notes: row.notes,
                tested_at: row.tested_at,
                tester_name: row.tester_name
            });
        });
        
        res.json({
            success: true,
            assignments: Object.values(pageGroups),
            total_assignments: result.rows.length,
            summary: {
                pending: result.rows.filter(r => !r.current_result).length,
                completed: result.rows.filter(r => r.current_result).length,
                passed: result.rows.filter(r => r.current_result === 'pass').length,
                failed: result.rows.filter(r => r.current_result === 'fail').length
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching test assignments:', error);
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
            tested_at
        } = req.body;
        
        // Validate required fields
        if (!page_id || !requirement_id || !result) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: page_id, requirement_id, result'
            });
        }
        
        // Validate result value
        if (!['pass', 'fail', 'not_applicable', 'not_tested'].includes(result)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid result value. Must be: pass, fail, not_applicable, or not_tested'
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
                // Update existing result
                const updateResult = await client.query(`
                    UPDATE manual_test_results 
                    SET 
                        result = $4,
                        confidence_level = $5,
                        notes = $6,
                        evidence = $7,
                        tester_name = $8,
                        retested_at = CURRENT_TIMESTAMP,
                        tested_at = COALESCE($9::timestamp, tested_at)
                    WHERE test_session_id = $1 AND page_id = $2 AND requirement_id = $3
                    RETURNING id
                `, [sessionId, page_id, requirement_id, result, confidence_level, notes, JSON.stringify(evidence || {}), tester_name, tested_at]);
                
                resultId = updateResult.rows[0].id;
                
            } else {
                // Insert new result
                const insertResult = await client.query(`
                    INSERT INTO manual_test_results (
                        test_session_id, page_id, requirement_id, requirement_type,
                        result, confidence_level, notes, evidence, tester_name, tested_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamp, CURRENT_TIMESTAMP))
                    RETURNING id
                `, [sessionId, page_id, requirement_id, requirement_type, result, confidence_level, notes, JSON.stringify(evidence || {}), tester_name, tested_at]);
                
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

// GET /api/manual-testing/requirement/:id/procedure
// Get detailed testing procedure for a requirement
router.get('/requirement/:id/procedure', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { page_type } = req.query;
        
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
                applies_to_page_types
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
            }
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

module.exports = router; 
const { Pool } = require('pg');
const { pool } = require('../config');
const { v4: uuidv4 } = require('uuid');
const ComprehensiveTestRunner = require('../../scripts/comprehensive-test-runner');
const WCAGCriteriaMapper = require('../../scripts/wcag-criteria-mapper');

/**
 * Simple Testing Service
 * Orchestrates automated and manual accessibility testing
 * Integrates with database for session management and result storage
 */
class SimpleTestingService {
    constructor(wsService = null) {
        this.pool = pool;
        this.activeTestSessions = new Map(); // Track running test sessions
        this.wcagMapper = new WCAGCriteriaMapper();
        this.wsService = wsService; // WebSocket service for real-time updates
    }

    /**
     * Create a new test session for a project
     * @param {string} projectId - Project UUID
     * @param {Object} sessionData - Session configuration
     * @returns {Object} Created test session
     */
    async createTestSession(projectId, sessionData) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Validate project exists
            const projectCheck = await client.query(
                'SELECT id, name FROM projects WHERE id = $1',
                [projectId]
            );
            
            if (projectCheck.rows.length === 0) {
                throw new Error(`Project not found: ${projectId}`);
            }
            
            const project = projectCheck.rows[0];
            
            // Create test session
            const sessionResult = await client.query(
                `INSERT INTO test_sessions 
                 (project_id, name, description, scope, status, test_type, progress_summary)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    projectId,
                    sessionData.name || `Test Session - ${new Date().toISOString().split('T')[0]}`,
                    sessionData.description || 'Accessibility testing session',
                    sessionData.scope || {
                        testTypes: ['axe', 'pa11y', 'lighthouse'],
                        includeManualTesting: true,
                        wcagLevel: 'AA'
                    },
                    'planning',
                    sessionData.testType || 'full',
                    {
                        pagesDiscovered: 0,
                        automatedTestsCompleted: 0,
                        manualTestsCompleted: 0,
                        violationsFound: 0
                    }
                ]
            );
            
            const session = sessionResult.rows[0];
            
            await client.query('COMMIT');
            
            return {
                ...session,
                projectName: project.name
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Start automated testing for a session
     * @param {string} sessionId - Test session UUID
     * @param {Object} options - Testing options
     * @returns {Object} Testing progress information
     */
    async startAutomatedTesting(sessionId, options = {}) {
        const client = await this.pool.connect();
        
        try {
            // Get session and validate
            const sessionResult = await client.query(
                'SELECT * FROM test_sessions WHERE id = $1',
                [sessionId]
            );
            
            if (sessionResult.rows.length === 0) {
                throw new Error(`Test session not found: ${sessionId}`);
            }
            
            const session = sessionResult.rows[0];
            
            // Get discovered pages for this project
            const pagesResult = await client.query(
                `SELECT dp.* FROM discovered_pages dp
                 JOIN site_discovery sd ON dp.discovery_id = sd.id
                 WHERE sd.project_id = $1 AND sd.status = 'completed'
                 ORDER BY dp.discovered_at
                 LIMIT $2`,
                [session.project_id, options.maxPages || 50]
            );
            
            const pages = pagesResult.rows;
            
            if (pages.length === 0) {
                throw new Error('No discovered pages found for testing. Please run site discovery first.');
            }
            
            // Update session status
            await client.query(
                'UPDATE test_sessions SET status = $1, started_at = CURRENT_TIMESTAMP WHERE id = $2',
                ['in_progress', sessionId]
            );
            
            // Emit milestone: Testing started
            if (this.wsService) {
                const testTypes = options.testTypes || ['axe', 'pa11y'];
                this.wsService.emitTestingMilestone(sessionId, session.project_id, {
                    type: 'testing_started',
                    message: `Automated testing started with ${testTypes.length} tools on ${pages.length} pages`,
                    testTypes,
                    pageCount: pages.length
                });
            }

            // Start automated testing asynchronously
            this.runAutomatedTests(sessionId, pages, options)
                .catch(error => {
                    console.error(`Automated testing failed for session ${sessionId}:`, error);
                    this.updateSessionStatus(sessionId, 'failed', { error: error.message });
                });
            
            return {
                sessionId,
                status: 'in_progress',
                pagesFound: pages.length,
                testTypes: options.testTypes || ['axe', 'pa11y', 'lighthouse'],
                startedAt: new Date().toISOString()
            };
            
        } finally {
            client.release();
        }
    }

    /**
     * Run automated tests for all pages in a session
     * @param {string} sessionId - Test session UUID
     * @param {Array} pages - Array of discovered pages
     * @param {Object} options - Testing options
     */
    async runAutomatedTests(sessionId, pages, options) {
        try {
            this.activeTestSessions.set(sessionId, { status: 'running', progress: 0 });
            
            const testTypes = options.testTypes || ['axe', 'pa11y', 'lighthouse'];
            const totalTests = pages.length * testTypes.length;
            let completedTests = 0;
            
            // Get project ID for WebSocket broadcasting
            const projectId = await this.getProjectIdFromSession(sessionId);
            
            // Create test runner
            const runner = new ComprehensiveTestRunner({
                testTypes: testTypes.map(type => `a11y:${type}`),
                headless: true,
                timeout: 30000
            });
            
            for (const page of pages) {
                for (const toolName of testTypes) {
                    try {
                        console.log(`Running ${toolName} test for: ${page.url}`);
                        
                        // Run single test
                        const result = await runner.runSingleTest(page.url, `a11y:${toolName}`);
                        
                        // Store result in database
                        await this.storeAutomatedTestResult(sessionId, page.id, toolName, result);
                        
                        completedTests++;
                        const progress = Math.round((completedTests / totalTests) * 100);
                        
                        // Update progress
                        await this.updateSessionProgress(sessionId, {
                            automatedTestsCompleted: completedTests,
                            totalAutomatedTests: totalTests,
                            progress: progress
                        });
                        
                        this.activeTestSessions.set(sessionId, { 
                            status: 'running', 
                            progress,
                            currentPage: page.url,
                            currentTool: toolName
                        });
                        
                        // Emit real-time progress via WebSocket
                        if (this.wsService) {
                            this.wsService.emitSessionProgress(sessionId, projectId, {
                                stage: 'automated_testing',
                                percentage: progress,
                                currentPage: page.url,
                                currentTool: toolName,
                                completedTests,
                                totalTests,
                                message: `Testing ${page.url} with ${toolName} (${completedTests}/${totalTests})`
                            });
                            
                            // Emit milestone events at key progress points
                            if (progress === 25) {
                                this.wsService.emitTestingMilestone(sessionId, projectId, {
                                    type: 'testing_quarter_complete',
                                    message: '25% of testing completed',
                                    progress: 25
                                });
                            } else if (progress === 50) {
                                this.wsService.emitTestingMilestone(sessionId, projectId, {
                                    type: 'testing_half_complete',
                                    message: 'Halfway through testing!',
                                    progress: 50
                                });
                            } else if (progress === 75) {
                                this.wsService.emitTestingMilestone(sessionId, projectId, {
                                    type: 'testing_three_quarter_complete',
                                    message: '75% of testing completed',
                                    progress: 75
                                });
                            }
                        }
                        
                    } catch (error) {
                        console.error(`Test failed for ${page.url} with ${toolName}:`, error);
                        
                        // Store error result
                        await this.storeAutomatedTestResult(sessionId, page.id, toolName, {
                            tool: toolName,
                            status: 'failed',
                            error: error.message,
                            violations: 0,
                            passes: 0
                        });
                        
                        completedTests++;
                    }
                }
            }
            
            // Calculate final violation summary
            const violationSummary = await this.calculateSessionViolationSummary(sessionId);
            
            // Mark session as completed with final violation counts
            await this.updateSessionStatus(sessionId, 'completed', {
                automatedTestsCompleted: completedTests,
                totalAutomatedTests: totalTests,
                violationsFound: violationSummary.totalViolations,
                passesFound: violationSummary.totalPasses,
                warningsFound: violationSummary.totalWarnings
            });
            
            // Emit completion event via WebSocket
            if (this.wsService) {
                this.wsService.emitSessionComplete(sessionId, projectId, {
                    status: 'completed',
                    automatedTestsCompleted: completedTests,
                    totalAutomatedTests: totalTests,
                    totalPages: pages.length,
                    message: `Automated testing completed! Tested ${pages.length} pages with ${testTypes.length} tools`
                });
            }
            
            this.activeTestSessions.delete(sessionId);
            
            console.log(`✅ Automated testing completed for session ${sessionId}`);
            
        } catch (error) {
            await this.updateSessionStatus(sessionId, 'failed', { error: error.message });
            this.activeTestSessions.delete(sessionId);
            throw error;
        }
    }

    /**
     * Store automated test result in database
     * @param {string} sessionId - Test session UUID
     * @param {string} pageId - Page UUID
     * @param {string} toolName - Tool name (axe, pa11y, lighthouse)
     * @param {Object} result - Test result data
     */
    async storeAutomatedTestResult(sessionId, pageId, toolName, result) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Extract counts from nested result structure
            const testData = result.result || result;  // Handle both nested and flat structures
            const violationsCount = testData.violations || 0;
            const warningsCount = testData.warnings || 0;
            const passesCount = testData.passes || 0;
            const duration = result.duration || testData.duration || 0;

            console.log(`📊 Storing test result - Tool: ${toolName}, Violations: ${violationsCount}, Warnings: ${warningsCount}, Passes: ${passesCount}`);

            // Store main test result
            const testResult = await client.query(
                `INSERT INTO automated_test_results 
                 (test_session_id, page_id, tool_name, tool_version, raw_results, 
                  violations_count, warnings_count, passes_count, test_duration_ms)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (test_session_id, page_id, tool_name) DO UPDATE SET
                 raw_results = EXCLUDED.raw_results,
                 violations_count = EXCLUDED.violations_count,
                 warnings_count = EXCLUDED.warnings_count,
                 passes_count = EXCLUDED.passes_count,
                 executed_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [
                    sessionId,
                    pageId,
                    toolName,
                    result.tool_version || testData.tool_version || '1.0',
                    result,
                    violationsCount,
                    warningsCount,
                    passesCount,
                    duration
                ]
            );
            
            const testResultId = testResult.rows[0].id;
            
            // Store violations if any - check both nested and flat structures
            const detailedViolations = testData.detailedViolations || result.detailedViolations || [];
            
            if (detailedViolations && detailedViolations.length > 0) {
                console.log(`💾 Storing ${detailedViolations.length} detailed violations for ${toolName}`);
                
                for (const violation of detailedViolations) {
                    await client.query(
                        `INSERT INTO violations 
                         (automated_result_id, violation_type, severity, wcag_criterion, 
                          element_selector, element_html, description, remediation_guidance, help_url)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [
                            testResultId,
                            violation.id || 'unknown',
                            violation.impact || 'moderate',
                            (violation.wcagCriteria && violation.wcagCriteria[0]) || null,
                            violation.nodes && violation.nodes[0] ? violation.nodes[0].target?.join(', ') : null,
                            violation.nodes && violation.nodes[0] ? violation.nodes[0].html : null,
                            violation.description || violation.help,
                            violation.help,
                            violation.helpUrl
                        ]
                    );
                }
            } else {
                console.log(`ℹ️  No detailed violations found for ${toolName} (violations count: ${violationsCount})`);
            }
            
            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create manual test result
     * @param {string} sessionId - Test session UUID
     * @param {string} pageId - Page UUID
     * @param {Object} manualResult - Manual test data
     * @returns {Object} Created manual test result
     */
    async createManualTestResult(sessionId, pageId, manualResult) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Validate requirement if provided
            let requirementId = manualResult.requirementId;
            if (manualResult.requirementType === 'wcag' && manualResult.wcagCriterion) {
                const wcagResult = await client.query(
                    'SELECT id FROM wcag_requirements WHERE criterion_number = $1',
                    [manualResult.wcagCriterion]
                );
                if (wcagResult.rows.length > 0) {
                    requirementId = wcagResult.rows[0].id;
                }
            } else if (manualResult.requirementType === 'section_508' && manualResult.section508Criterion) {
                const section508Result = await client.query(
                    'SELECT id FROM section_508_requirements WHERE section_number = $1',
                    [manualResult.section508Criterion]
                );
                if (section508Result.rows.length > 0) {
                    requirementId = section508Result.rows[0].id;
                }
            }
            
            // Create manual test result
            const result = await client.query(
                `INSERT INTO manual_test_results 
                 (test_session_id, page_id, requirement_id, requirement_type, result, 
                  confidence_level, notes, evidence, tester_name)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [
                    sessionId,
                    pageId,
                    requirementId,
                    manualResult.requirementType || 'wcag',
                    manualResult.result,
                    manualResult.confidenceLevel || 'medium',
                    manualResult.notes,
                    manualResult.evidence || {},
                    manualResult.testerName
                ]
            );
            
            const manualTestResult = result.rows[0];
            
            // If this is a failure, create a violation record
            if (manualResult.result === 'fail') {
                await client.query(
                    `INSERT INTO violations 
                     (manual_result_id, violation_type, severity, wcag_criterion, section_508_criterion,
                      description, remediation_guidance)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        manualTestResult.id,
                        manualResult.violationType || 'manual-finding',
                        manualResult.severity || 'moderate',
                        manualResult.wcagCriterion,
                        manualResult.section508Criterion,
                        manualResult.notes,
                        manualResult.remediationGuidance
                    ]
                );
            }
            
            await client.query('COMMIT');
            
            // Update session progress
            await this.updateSessionProgress(sessionId, {
                manualTestsCompleted: '+1'
            });
            
            return manualTestResult;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get WCAG requirements for manual testing
     * @param {string} level - WCAG level (A, AA, AAA)
     * @param {Array} pageTypes - Page types to filter requirements
     * @returns {Array} WCAG requirements
     */
    async getWCAGRequirements(level = 'AA', pageTypes = ['all']) {
        const client = await this.pool.connect();
        
        try {
            let query = `
                SELECT * FROM wcag_requirements 
                WHERE level IN ('A'${level === 'AA' || level === 'AAA' ? ", 'AA'" : ''}${level === 'AAA' ? ", 'AAA'" : ''})
            `;
            
            if (pageTypes.length > 0 && !pageTypes.includes('all')) {
                query += ` AND (applies_to_page_types @> $1 OR 'all' = ANY(applies_to_page_types))`;
                const result = await client.query(query, [JSON.stringify(pageTypes)]);
                return result.rows;
            } else {
                const result = await client.query(query);
                return result.rows;
            }
            
        } finally {
            client.release();
        }
    }

    /**
     * Get Section 508 requirements for manual testing
     * @param {Array} pageTypes - Page types to filter requirements
     * @returns {Array} Section 508 requirements
     */
    async getSection508Requirements(pageTypes = ['all']) {
        const client = await this.pool.connect();
        
        try {
            let query = 'SELECT * FROM section_508_requirements';
            
            if (pageTypes.length > 0 && !pageTypes.includes('all')) {
                query += ` WHERE applies_to_page_types @> $1 OR 'all' = ANY(applies_to_page_types)`;
                const result = await client.query(query, [JSON.stringify(pageTypes)]);
                return result.rows;
            } else {
                const result = await client.query(query);
                return result.rows;
            }
            
        } finally {
            client.release();
        }
    }

    /**
     * Get test session with detailed results
     * @param {string} sessionId - Test session UUID
     * @returns {Object} Session with results
     */
    async getTestSession(sessionId) {
        const client = await this.pool.connect();
        
        try {
            // Get session info
            const sessionResult = await client.query(
                `SELECT ts.*, p.name as project_name, p.primary_url 
                 FROM test_sessions ts 
                 JOIN projects p ON ts.project_id = p.id 
                 WHERE ts.id = $1`,
                [sessionId]
            );
            
            if (sessionResult.rows.length === 0) {
                throw new Error(`Test session not found: ${sessionId}`);
            }
            
            const session = sessionResult.rows[0];
            
            // Get automated test results summary
            const automatedSummary = await client.query(
                `SELECT 
                    tool_name,
                    COUNT(*) as tests_run,
                    SUM(violations_count) as total_violations,
                    SUM(warnings_count) as total_warnings,
                    SUM(passes_count) as total_passes
                 FROM automated_test_results 
                 WHERE test_session_id = $1 
                 GROUP BY tool_name`,
                [sessionId]
            );
            
            // Get manual test results summary
            const manualSummary = await client.query(
                `SELECT 
                    requirement_type,
                    result,
                    COUNT(*) as count
                 FROM manual_test_results 
                 WHERE test_session_id = $1 
                 GROUP BY requirement_type, result`,
                [sessionId]
            );
            
            // Get violations summary
            const violationsSummary = await client.query(
                `SELECT 
                    severity,
                    COUNT(*) as count
                 FROM violations v
                 LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                 LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                 WHERE atr.test_session_id = $1 OR mtr.test_session_id = $1
                 GROUP BY severity`,
                [sessionId]
            );
            
            return {
                ...session,
                isActive: this.activeTestSessions.has(sessionId),
                automatedResults: automatedSummary.rows,
                manualResults: manualSummary.rows,
                violationsSummary: violationsSummary.rows
            };
            
        } finally {
            client.release();
        }
    }

    /**
     * Get test session results for VPAT generation
     * @param {string} sessionId - Test session UUID
     * @returns {Object} Comprehensive results data
     */
    async getSessionResultsForVPAT(sessionId) {
        const client = await this.pool.connect();
        
        try {
            // Get session and project info
            const session = await this.getTestSession(sessionId);
            
            // Get detailed automated results
            const automatedResults = await client.query(
                `SELECT atr.*, dp.url, dp.title, dp.page_type
                 FROM automated_test_results atr
                 JOIN discovered_pages dp ON atr.page_id = dp.id
                 WHERE atr.test_session_id = $1
                 ORDER BY dp.url, atr.tool_name`,
                [sessionId]
            );
            
            // Get detailed manual results
            const manualResults = await client.query(
                `SELECT mtr.*, dp.url, dp.title, dp.page_type,
                        wr.criterion_number, wr.title as wcag_title,
                        sr.section_number, sr.title as section_508_title
                 FROM manual_test_results mtr
                 JOIN discovered_pages dp ON mtr.page_id = dp.id
                 LEFT JOIN wcag_requirements wr ON mtr.requirement_id = wr.id AND mtr.requirement_type = 'wcag'
                 LEFT JOIN section_508_requirements sr ON mtr.requirement_id = sr.id AND mtr.requirement_type = 'section_508'
                 WHERE mtr.test_session_id = $1
                 ORDER BY dp.url, wr.criterion_number, sr.section_number`,
                [sessionId]
            );
            
            // Get all violations with context
            const violations = await client.query(
                `SELECT v.*, 
                        atr.tool_name, atr.page_id as automated_page_id,
                        mtr.page_id as manual_page_id,
                        dp.url, dp.title, dp.page_type
                 FROM violations v
                 LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                 LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                 LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
                 WHERE atr.test_session_id = $1 OR mtr.test_session_id = $1
                 ORDER BY v.severity DESC, dp.url`,
                [sessionId]
            );
            
            return {
                session,
                automatedResults: automatedResults.rows,
                manualResults: manualResults.rows,
                violations: violations.rows
            };
            
        } finally {
            client.release();
        }
    }

    /**
     * Update session status
     * @param {string} sessionId - Test session UUID
     * @param {string} status - New status
     * @param {Object} metadata - Additional metadata
     */
    async updateSessionStatus(sessionId, status, metadata = {}) {
        const client = await this.pool.connect();
        
        try {
            const updates = ['status = $2'];
            const values = [sessionId, status];
            let paramIndex = 3;

            if (status === 'completed' || status === 'failed') {
                updates.push(`completed_at = $${paramIndex++}`);
                values.push(new Date());
            }

            if (metadata && Object.keys(metadata).length > 0) {
                updates.push(`progress_summary = progress_summary || $${paramIndex++}`);
                values.push(JSON.stringify(metadata));
            }

            const query = `UPDATE test_sessions SET ${updates.join(', ')} WHERE id = $1`;
            await client.query(query, values);
            
        } catch (error) {
            console.error('Error updating session status:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Update session progress
     * @param {string} sessionId - Test session UUID
     * @param {Object} progress - Progress updates
     */
    async updateSessionProgress(sessionId, progress) {
        const client = await this.pool.connect();
        
        try {
            // Handle incremental updates (e.g., '+1' for manualTestsCompleted)
            const updates = {};
            for (const [key, value] of Object.entries(progress)) {
                if (typeof value === 'string' && value.startsWith('+')) {
                    // Incremental update
                    const increment = parseInt(value.substring(1));
                    updates[key] = `COALESCE((progress_summary->>'${key}')::int, 0) + ${increment}`;
                } else {
                    updates[key] = value;
                }
            }
            
            const updateQuery = Object.keys(updates).map(key => 
                typeof updates[key] === 'string' && updates[key].includes('COALESCE') 
                    ? `'${key}', ${updates[key]}` 
                    : `'${key}', ${typeof updates[key] === 'number' ? updates[key] : `'${updates[key]}'`}`
            ).join(', ');
            
            await client.query(
                `UPDATE test_sessions 
                 SET progress_summary = jsonb_build_object(${updateQuery})
                 WHERE id = $1`,
                [sessionId]
            );
            
        } catch (error) {
            console.error('Error updating session progress:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Stop active test session
     * @param {string} sessionId - Test session UUID
     */
    async stopTestSession(sessionId) {
        if (this.activeTestSessions.has(sessionId)) {
            this.activeTestSessions.delete(sessionId);
            await this.updateSessionStatus(sessionId, 'cancelled');
            return true;
        }
        return false;
    }

    /**
     * Delete test session and all results
     * @param {string} sessionId - Test session UUID
     */
    async deleteTestSession(sessionId) {
        // Stop if active
        await this.stopTestSession(sessionId);
        
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Delete violations first (they reference results)
            await client.query(
                `DELETE FROM violations 
                 WHERE automated_result_id IN (
                     SELECT id FROM automated_test_results WHERE test_session_id = $1
                 ) OR manual_result_id IN (
                     SELECT id FROM manual_test_results WHERE test_session_id = $1
                 )`,
                [sessionId]
            );
            
            // Delete test results
            await client.query('DELETE FROM automated_test_results WHERE test_session_id = $1', [sessionId]);
            await client.query('DELETE FROM manual_test_results WHERE test_session_id = $1', [sessionId]);
            
            // Delete session
            const result = await client.query('DELETE FROM test_sessions WHERE id = $1', [sessionId]);
            
            await client.query('COMMIT');
            
            return result.rowCount > 0;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get testing statistics for a project
     * @param {string} projectId - Project UUID
     * @returns {Object} Testing statistics
     */
    async getProjectTestingStats(projectId) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    COUNT(DISTINCT ts.id) as total_sessions,
                    COUNT(DISTINCT CASE WHEN ts.status = 'completed' THEN ts.id END) as completed_sessions,
                    COUNT(DISTINCT CASE WHEN ts.status = 'in_progress' THEN ts.id END) as active_sessions,
                    COUNT(atr.id) as total_automated_tests,
                    COUNT(mtr.id) as total_manual_tests,
                    COUNT(v.id) as total_violations,
                    COUNT(DISTINCT CASE WHEN v.severity = 'critical' THEN v.id END) as critical_violations
                FROM test_sessions ts
                LEFT JOIN automated_test_results atr ON ts.id = atr.test_session_id
                LEFT JOIN manual_test_results mtr ON ts.id = mtr.test_session_id
                LEFT JOIN violations v ON (atr.id = v.automated_result_id OR mtr.id = v.manual_result_id)
                WHERE ts.project_id = $1
            `, [projectId]);
            
            return result.rows[0];
            
        } finally {
            client.release();
        }
    }

    /**
     * Get project ID from session ID
     * @param {string} sessionId - Session UUID
     * @returns {string} Project UUID
     */
    async getProjectIdFromSession(sessionId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT project_id FROM test_sessions WHERE id = $1',
                [sessionId]
            );
            return result.rows[0]?.project_id;
        } finally {
            client.release();
        }
    }

    /**
     * Calculate violation summary for a session
     * @param {string} sessionId - Test session UUID
     * @returns {Object} Violation summary
     */
    async calculateSessionViolationSummary(sessionId) {
        const client = await this.pool.connect();
        
        try {
            // Get summary from automated test results
            const automatedSummary = await client.query(
                `SELECT 
                    SUM(violations_count) as total_violations,
                    SUM(warnings_count) as total_warnings, 
                    SUM(passes_count) as total_passes,
                    COUNT(*) as total_tests
                 FROM automated_test_results 
                 WHERE test_session_id = $1`,
                [sessionId]
            );
            
            // Get count of detailed violations
            const violationCount = await client.query(
                `SELECT COUNT(*) as detailed_violations
                 FROM violations v
                 JOIN automated_test_results atr ON v.automated_result_id = atr.id
                 WHERE atr.test_session_id = $1`,
                [sessionId]
            );
            
            const summary = automatedSummary.rows[0];
            const detailedCount = violationCount.rows[0];
            
            console.log(`📊 Session ${sessionId} summary: ${summary.total_violations} violations, ${summary.total_passes} passes, ${detailedCount.detailed_violations} detailed violations`);
            
            return {
                totalViolations: parseInt(summary.total_violations) || 0,
                totalWarnings: parseInt(summary.total_warnings) || 0,
                totalPasses: parseInt(summary.total_passes) || 0,
                totalTests: parseInt(summary.total_tests) || 0,
                detailedViolations: parseInt(detailedCount.detailed_violations) || 0
            };
            
        } finally {
            client.release();
        }
    }

    /**
     * Set WebSocket service for real-time updates
     * @param {WebSocketService} wsService - WebSocket service instance
     */
    setWebSocketService(wsService) {
        this.wsService = wsService;
    }
}

module.exports = SimpleTestingService; 
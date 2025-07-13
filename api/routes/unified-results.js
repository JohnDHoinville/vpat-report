const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../../database/config');
const RequirementTestMappingService = require('../../database/services/requirement-test-mapping-service');

// Initialize the mapping service
const mappingService = new RequirementTestMappingService();

/**
 * GET /api/unified-results/session/:sessionId
 * Get unified view of all test results (automated + manual) for a compliance session
 */
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { page_id, requirement_level, status_filter } = req.query;

        // Get session details
        const sessionQuery = `
            SELECT ts.*, p.name as project_name, p.primary_url
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `;
        const sessionResult = await pool.query(sessionQuery, [sessionId]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found'
            });
        }

        const session = sessionResult.rows[0];

        // Get all WCAG requirements for the session's conformance level
        const requirementMappings = await mappingService.getAllRequirementMappings();
        
        // Filter requirements based on session's conformance level
        const sessionLevel = session.conformance_level || 'wcag_aa';
        const includeLevels = sessionLevel === 'wcag_aaa' ? ['A', 'AA', 'AAA'] : 
                             sessionLevel === 'wcag_aa' ? ['A', 'AA'] : ['A'];

        const relevantRequirements = Object.keys(requirementMappings).filter(criterionNumber => {
            const requirement = requirementMappings[criterionNumber];
            return requirement.requirement && includeLevels.includes(requirement.requirement.level);
        });

        // Get automated test results for the session
        const automatedResultsQuery = `
            WITH session_pages AS (
                SELECT DISTINCT dp.id as page_id, dp.url, dp.title
                FROM test_sessions ts
                JOIN site_discovery sd ON ts.project_id = sd.project_id
                JOIN discovered_pages dp ON sd.id = dp.discovery_id
                WHERE ts.id = $1
                ${page_id ? 'AND dp.id = $2' : ''}
            ),
            automated_violations AS (
                SELECT 
                    sp.page_id,
                    sp.url,
                    sp.title,
                    v.wcag_criterion,
                    v.tool_name,
                    v.rule_id,
                    v.severity,
                    v.description,
                    COUNT(*) as violation_count,
                    array_agg(DISTINCT v.xpath) as affected_elements
                FROM session_pages sp
                JOIN automated_test_results ar ON sp.page_id = ar.page_id
                JOIN violations v ON ar.id = v.automated_result_id
                WHERE v.wcag_criterion IS NOT NULL
                GROUP BY sp.page_id, sp.url, sp.title, v.wcag_criterion, v.tool_name, v.rule_id, v.severity, v.description
            )
            SELECT * FROM automated_violations
            ORDER BY page_id, wcag_criterion, tool_name
        `;
        
        const automatedParams = page_id ? [sessionId, page_id] : [sessionId];
        const automatedResults = await pool.query(automatedResultsQuery, automatedParams);

        // Get manual test results for the session
        const manualResultsQuery = `
            SELECT 
                mtr.page_id,
                dp.url,
                dp.title,
                wr.criterion_number,
                wr.title as requirement_title,
                wr.level,
                mtr.result,
                mtr.confidence_level,
                mtr.notes,
                mtr.evidence,
                mtr.tested_at,
                mtr.tester_name,
                mtr.assigned_tester
            FROM manual_test_results mtr
            JOIN wcag_requirements wr ON mtr.requirement_id = wr.id
            JOIN discovered_pages dp ON mtr.page_id = dp.id
            WHERE mtr.test_session_id = $1
            ${page_id ? 'AND mtr.page_id = $2' : ''}
            ORDER BY dp.url, wr.criterion_number
        `;
        
        const manualParams = page_id ? [sessionId, page_id] : [sessionId];
        const manualResults = await pool.query(manualResultsQuery, manualParams);

        // Organize results by WCAG requirement
        const unifiedResults = {};
        
        // Initialize all relevant requirements
        relevantRequirements.forEach(criterionNumber => {
            const mapping = requirementMappings[criterionNumber];
            unifiedResults[criterionNumber] = {
                criterionNumber,
                title: mapping.requirement?.title || 'Unknown',
                level: mapping.requirement?.level || 'A',
                principle: mapping.requirement?.principle || 'Unknown',
                testStrategy: mapping.testStrategy,
                estimatedEffort: mapping.estimatedEffort,
                automatedResults: {
                    tools: [],
                    violations: [],
                    status: 'not_tested',
                    confidence: 'unknown'
                },
                manualResults: {
                    tests: [],
                    status: 'not_tested',
                    overallResult: null,
                    confidence: 'unknown'
                },
                overallStatus: 'not_tested',
                overallConfidence: 'unknown',
                requiresAttention: false,
                pages: new Set()
            };
        });

        // Process automated results
        automatedResults.rows.forEach(row => {
            const criterionNumber = row.wcag_criterion;
            if (unifiedResults[criterionNumber]) {
                unifiedResults[criterionNumber].automatedResults.violations.push({
                    pageId: row.page_id,
                    pageUrl: row.url,
                    pageTitle: row.title,
                    tool: row.tool_name,
                    rule: row.rule_id,
                    severity: row.severity,
                    description: row.description,
                    violationCount: parseInt(row.violation_count),
                    affectedElements: row.affected_elements
                });
                
                if (!unifiedResults[criterionNumber].automatedResults.tools.includes(row.tool_name)) {
                    unifiedResults[criterionNumber].automatedResults.tools.push(row.tool_name);
                }
                
                unifiedResults[criterionNumber].automatedResults.status = 'violation';
                unifiedResults[criterionNumber].pages.add(row.url);
            }
        });

        // Process manual results
        manualResults.rows.forEach(row => {
            const criterionNumber = row.criterion_number;
            if (unifiedResults[criterionNumber]) {
                unifiedResults[criterionNumber].manualResults.tests.push({
                    pageId: row.page_id,
                    pageUrl: row.url,
                    pageTitle: row.title,
                    result: row.result,
                    confidenceLevel: row.confidence_level,
                    notes: row.notes,
                    evidence: row.evidence,
                    testedAt: row.tested_at,
                    testerName: row.tester_name,
                    assignedTester: row.assigned_tester
                });
                
                // Determine overall manual result status
                if (row.result === 'fail') {
                    unifiedResults[criterionNumber].manualResults.status = 'violation';
                    unifiedResults[criterionNumber].manualResults.overallResult = 'fail';
                } else if (row.result === 'pass' && unifiedResults[criterionNumber].manualResults.status !== 'violation') {
                    unifiedResults[criterionNumber].manualResults.status = 'passed';
                    unifiedResults[criterionNumber].manualResults.overallResult = 'pass';
                } else if (row.result === 'not_applicable') {
                    if (unifiedResults[criterionNumber].manualResults.status === 'not_tested') {
                        unifiedResults[criterionNumber].manualResults.status = 'not_applicable';
                        unifiedResults[criterionNumber].manualResults.overallResult = 'not_applicable';
                    }
                }
                
                unifiedResults[criterionNumber].pages.add(row.url);
            }
        });

        // Calculate overall status and confidence for each requirement
        Object.keys(unifiedResults).forEach(criterionNumber => {
            const result = unifiedResults[criterionNumber];
            
            // Convert pages Set to Array for JSON serialization
            result.pages = Array.from(result.pages);
            
            // Determine overall status
            if (result.automatedResults.status === 'violation' || result.manualResults.status === 'violation') {
                result.overallStatus = 'violation';
                result.requiresAttention = true;
            } else if (result.automatedResults.status === 'passed' || result.manualResults.status === 'passed') {
                result.overallStatus = 'passed';
            } else if (result.manualResults.status === 'not_applicable') {
                result.overallStatus = 'not_applicable';
            } else {
                result.overallStatus = 'not_tested';
                
                // Check if this requirement should have been tested
                if (result.testStrategy.primary === 'automated' && result.automatedResults.tools.length === 0) {
                    result.requiresAttention = true;
                } else if (result.testStrategy.primary === 'manual' && result.manualResults.tests.length === 0) {
                    result.requiresAttention = true;
                }
            }
            
            // Determine overall confidence
            const hasHighConfidenceAutomated = result.automatedResults.tools.length > 0 && 
                                             result.testStrategy.automatedCoverage === 'high';
            const hasHighConfidenceManual = result.manualResults.tests.some(test => 
                                           test.confidenceLevel === 'high');
            
            if (hasHighConfidenceAutomated && hasHighConfidenceManual) {
                result.overallConfidence = 'high';
            } else if (hasHighConfidenceAutomated || hasHighConfidenceManual) {
                result.overallConfidence = 'medium';
            } else if (result.automatedResults.tools.length > 0 || result.manualResults.tests.length > 0) {
                result.overallConfidence = 'low';
            } else {
                result.overallConfidence = 'unknown';
            }
        });

        // Apply filters if requested
        let filteredResults = unifiedResults;
        if (status_filter) {
            filteredResults = {};
            Object.keys(unifiedResults).forEach(criterionNumber => {
                if (unifiedResults[criterionNumber].overallStatus === status_filter) {
                    filteredResults[criterionNumber] = unifiedResults[criterionNumber];
                }
            });
        }

        if (requirement_level) {
            const levelFiltered = {};
            Object.keys(filteredResults).forEach(criterionNumber => {
                if (filteredResults[criterionNumber].level === requirement_level.toUpperCase()) {
                    levelFiltered[criterionNumber] = filteredResults[criterionNumber];
                }
            });
            filteredResults = levelFiltered;
        }

        // Calculate summary statistics
        const summary = {
            totalRequirements: Object.keys(unifiedResults).length,
            tested: 0,
            passed: 0,
            violations: 0,
            notTested: 0,
            notApplicable: 0,
            requiresAttention: 0,
            byLevel: {
                A: { total: 0, tested: 0, passed: 0, violations: 0 },
                AA: { total: 0, tested: 0, passed: 0, violations: 0 },
                AAA: { total: 0, tested: 0, passed: 0, violations: 0 }
            },
            testCoverage: {
                automated: 0,
                manual: 0,
                hybrid: 0,
                notTested: 0
            }
        };

        Object.values(unifiedResults).forEach(result => {
            // Overall status counts
            switch (result.overallStatus) {
                case 'passed':
                    summary.passed++;
                    summary.tested++;
                    break;
                case 'violation':
                    summary.violations++;
                    summary.tested++;
                    break;
                case 'not_applicable':
                    summary.notApplicable++;
                    break;
                default:
                    summary.notTested++;
            }

            if (result.requiresAttention) {
                summary.requiresAttention++;
            }

            // By level counts
            const level = result.level;
            if (summary.byLevel[level]) {
                summary.byLevel[level].total++;
                if (result.overallStatus === 'passed') {
                    summary.byLevel[level].passed++;
                    summary.byLevel[level].tested++;
                } else if (result.overallStatus === 'violation') {
                    summary.byLevel[level].violations++;
                    summary.byLevel[level].tested++;
                }
            }

            // Test coverage counts
            const hasAutomated = result.automatedResults.tools.length > 0;
            const hasManual = result.manualResults.tests.length > 0;
            
            if (hasAutomated && hasManual) {
                summary.testCoverage.hybrid++;
            } else if (hasAutomated) {
                summary.testCoverage.automated++;
            } else if (hasManual) {
                summary.testCoverage.manual++;
            } else {
                summary.testCoverage.notTested++;
            }
        });

        res.json({
            success: true,
            data: {
                session: {
                    id: session.id,
                    name: session.name,
                    projectName: session.project_name,
                    primaryUrl: session.primary_url,
                    conformanceLevel: session.conformance_level,
                    status: session.status,
                    createdAt: session.created_at
                },
                results: filteredResults,
                summary,
                filters: {
                    pageId: page_id || null,
                    requirementLevel: requirement_level || null,
                    statusFilter: status_filter || null
                }
            }
        });

    } catch (error) {
        console.error('Error getting unified results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get unified results',
            details: error.message
        });
    }
});

/**
 * GET /api/unified-results/requirement/:sessionId/:criterionNumber
 * Get detailed unified results for a specific WCAG requirement in a session
 */
router.get('/requirement/:sessionId/:criterionNumber', authenticateToken, async (req, res) => {
    try {
        const { sessionId, criterionNumber } = req.params;

        // Get requirement mapping
        const mapping = await mappingService.getRequirementMapping(criterionNumber);

        // Get detailed automated results
        const automatedQuery = `
            SELECT 
                dp.id as page_id,
                dp.url,
                dp.title,
                v.tool_name,
                v.rule_id,
                v.severity,
                v.description,
                v.xpath,
                v.element_html,
                v.help_url,
                ar.test_date,
                ar.tool_version
            FROM test_sessions ts
            JOIN site_discovery sd ON ts.project_id = sd.project_id
            JOIN discovered_pages dp ON sd.id = dp.discovery_id
            JOIN automated_test_results ar ON dp.id = ar.page_id
            JOIN violations v ON ar.id = v.automated_result_id
            WHERE ts.id = $1 AND v.wcag_criterion = $2
            ORDER BY dp.url, v.tool_name, v.severity DESC
        `;

        const automatedResults = await pool.query(automatedQuery, [sessionId, criterionNumber]);

        // Get detailed manual results
        const manualQuery = `
            SELECT 
                dp.id as page_id,
                dp.url,
                dp.title,
                wr.title as requirement_title,
                wr.description,
                wr.manual_test_procedure,
                mtr.result,
                mtr.confidence_level,
                mtr.notes,
                mtr.evidence,
                mtr.tested_at,
                mtr.tester_name,
                mtr.assigned_tester,
                mtr.testing_time_minutes
            FROM test_sessions ts
            JOIN site_discovery sd ON ts.project_id = sd.project_id
            JOIN discovered_pages dp ON sd.id = dp.discovery_id
            JOIN manual_test_results mtr ON dp.id = mtr.page_id
            JOIN wcag_requirements wr ON mtr.requirement_id = wr.id
            WHERE ts.id = $1 AND wr.criterion_number = $2
            ORDER BY dp.url, mtr.tested_at DESC
        `;

        const manualResults = await pool.query(manualQuery, [sessionId, criterionNumber]);

        res.json({
            success: true,
            data: {
                criterionNumber,
                mapping,
                automatedResults: automatedResults.rows,
                manualResults: manualResults.rows,
                summary: {
                    automatedViolations: automatedResults.rows.length,
                    manualTests: manualResults.rows.length,
                    pagesAffected: new Set([
                        ...automatedResults.rows.map(r => r.page_id),
                        ...manualResults.rows.map(r => r.page_id)
                    ]).size
                }
            }
        });

    } catch (error) {
        console.error('Error getting detailed requirement results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get detailed requirement results',
            details: error.message
        });
    }
});

/**
 * GET /api/unified-results/summary/:sessionId
 * Get high-level summary of compliance session results
 */
router.get('/summary/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Get session info
        const sessionQuery = `
            SELECT ts.*, p.name as project_name
            FROM test_sessions ts
            JOIN projects p ON ts.project_id = p.id
            WHERE ts.id = $1
        `;
        const sessionResult = await pool.query(sessionQuery, [sessionId]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test session not found'
            });
        }

        const session = sessionResult.rows[0];

        // Get quick counts
        const countsQuery = `
            WITH automated_summary AS (
                SELECT 
                    COUNT(DISTINCT v.wcag_criterion) as automated_violations_criteria,
                    COUNT(*) as total_automated_violations
                FROM test_sessions ts
                JOIN site_discovery sd ON ts.project_id = sd.project_id
                JOIN discovered_pages dp ON sd.id = dp.discovery_id
                JOIN automated_test_results ar ON dp.id = ar.page_id
                JOIN violations v ON ar.id = v.automated_result_id
                WHERE ts.id = $1 AND v.wcag_criterion IS NOT NULL
            ),
            manual_summary AS (
                SELECT 
                    COUNT(DISTINCT wr.criterion_number) as manual_tested_criteria,
                    COUNT(CASE WHEN mtr.result = 'fail' THEN 1 END) as manual_violations,
                    COUNT(CASE WHEN mtr.result = 'pass' THEN 1 END) as manual_passes
                FROM test_sessions ts
                JOIN manual_test_results mtr ON ts.id = mtr.test_session_id
                JOIN wcag_requirements wr ON mtr.requirement_id = wr.id
                WHERE ts.id = $1
            )
            SELECT 
                COALESCE(a.automated_violations_criteria, 0) as automated_violations_criteria,
                COALESCE(a.total_automated_violations, 0) as total_automated_violations,
                COALESCE(m.manual_tested_criteria, 0) as manual_tested_criteria,
                COALESCE(m.manual_violations, 0) as manual_violations,
                COALESCE(m.manual_passes, 0) as manual_passes
            FROM automated_summary a
            FULL OUTER JOIN manual_summary m ON true
        `;

        const countsResult = await pool.query(countsQuery, [sessionId]);
        const counts = countsResult.rows[0];

        // Calculate compliance score
        const totalRequirements = session.conformance_level === 'wcag_aaa' ? 78 : 
                                session.conformance_level === 'wcag_aa' ? 50 : 30;
        
        const testedRequirements = parseInt(counts.automated_violations_criteria) + 
                                 parseInt(counts.manual_tested_criteria);
        
        const violationRequirements = parseInt(counts.automated_violations_criteria) + 
                                    parseInt(counts.manual_violations);
        
        const passedRequirements = testedRequirements - violationRequirements;
        const complianceScore = testedRequirements > 0 ? 
                              Math.round((passedRequirements / testedRequirements) * 100) : 0;

        res.json({
            success: true,
            data: {
                session: {
                    id: session.id,
                    name: session.name,
                    projectName: session.project_name,
                    conformanceLevel: session.conformance_level,
                    status: session.status
                },
                summary: {
                    totalRequirements,
                    testedRequirements,
                    passedRequirements,
                    violationRequirements,
                    untested: totalRequirements - testedRequirements,
                    complianceScore,
                    automatedViolationsCriteria: parseInt(counts.automated_violations_criteria),
                    totalAutomatedViolations: parseInt(counts.total_automated_violations),
                    manualTestedCriteria: parseInt(counts.manual_tested_criteria),
                    manualViolations: parseInt(counts.manual_violations),
                    manualPasses: parseInt(counts.manual_passes),
                    testingProgress: Math.round((testedRequirements / totalRequirements) * 100)
                }
            }
        });

    } catch (error) {
        console.error('Error getting session summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get session summary',
            details: error.message
        });
    }
});

module.exports = router; 
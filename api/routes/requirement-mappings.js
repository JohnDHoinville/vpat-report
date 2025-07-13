const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const RequirementTestMappingService = require('../../database/services/requirement-test-mapping-service');

// Initialize the mapping service
const mappingService = new RequirementTestMappingService();

/**
 * GET /api/requirement-mappings/wcag/:criterionNumber
 * Get detailed mapping for a specific WCAG requirement
 */
router.get('/wcag/:criterionNumber', authenticateToken, async (req, res) => {
    try {
        const { criterionNumber } = req.params;
        
        const mapping = await mappingService.getRequirementMapping(criterionNumber);
        
        res.json({
            success: true,
            data: mapping
        });
        
    } catch (error) {
        console.error('Error getting requirement mapping:', error);
        res.status(404).json({
            success: false,
            error: 'Requirement mapping not found',
            details: error.message
        });
    }
});

/**
 * GET /api/requirement-mappings/all
 * Get mappings for all WCAG requirements
 */
router.get('/all', authenticateToken, async (req, res) => {
    try {
        const mappings = await mappingService.getAllRequirementMappings();
        
        // Calculate summary statistics
        const summary = {
            totalRequirements: Object.keys(mappings).length,
            automatedOnly: 0,
            manualOnly: 0,
            hybrid: 0,
            unknown: 0,
            averageEffort: 0
        };
        
        let totalEffort = 0;
        Object.values(mappings).forEach(mapping => {
            if (mapping.testStrategy) {
                switch (mapping.testStrategy.primary) {
                    case 'automated':
                        summary.automatedOnly++;
                        break;
                    case 'manual':
                        summary.manualOnly++;
                        break;
                    case 'hybrid':
                        summary.hybrid++;
                        break;
                    default:
                        summary.unknown++;
                }
                
                if (mapping.estimatedEffort) {
                    totalEffort += mapping.estimatedEffort.total;
                }
            }
        });
        
        summary.averageEffort = Math.round(totalEffort / summary.totalRequirements);
        
        res.json({
            success: true,
            data: {
                mappings,
                summary
            }
        });
        
    } catch (error) {
        console.error('Error getting all requirement mappings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get requirement mappings',
            details: error.message
        });
    }
});

/**
 * GET /api/requirement-mappings/by-method/:testMethod
 * Get requirements filtered by test method (automated, manual, hybrid)
 */
router.get('/by-method/:testMethod', authenticateToken, async (req, res) => {
    try {
        const { testMethod } = req.params;
        
        if (!['automated', 'manual', 'hybrid'].includes(testMethod)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid test method. Must be: automated, manual, or hybrid'
            });
        }
        
        const requirements = mappingService.getRequirementsByTestMethod(testMethod);
        
        res.json({
            success: true,
            data: {
                testMethod,
                count: requirements.length,
                requirements
            }
        });
        
    } catch (error) {
        console.error('Error getting requirements by test method:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get requirements by test method',
            details: error.message
        });
    }
});

/**
 * GET /api/requirement-mappings/automated-tools/:criterionNumber
 * Get automated tools that can test a specific requirement
 */
router.get('/automated-tools/:criterionNumber', authenticateToken, async (req, res) => {
    try {
        const { criterionNumber } = req.params;
        
        const tools = mappingService.getAutomatedToolsForRequirement(criterionNumber);
        
        res.json({
            success: true,
            data: {
                criterionNumber,
                toolCount: tools.length,
                tools
            }
        });
        
    } catch (error) {
        console.error('Error getting automated tools for requirement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get automated tools for requirement',
            details: error.message
        });
    }
});

/**
 * GET /api/requirement-mappings/manual-procedure/:criterionNumber
 * Get manual test procedure for a specific requirement
 */
router.get('/manual-procedure/:criterionNumber', authenticateToken, async (req, res) => {
    try {
        const { criterionNumber } = req.params;
        
        const procedure = mappingService.getManualTestProcedure(criterionNumber);
        
        if (!procedure) {
            return res.status(404).json({
                success: false,
                error: 'No manual test procedure found for this requirement'
            });
        }
        
        res.json({
            success: true,
            data: {
                criterionNumber,
                procedure
            }
        });
        
    } catch (error) {
        console.error('Error getting manual test procedure:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get manual test procedure',
            details: error.message
        });
    }
});

/**
 * POST /api/requirement-mappings/analyze-results
 * Analyze automated test results and map to WCAG requirements
 */
router.post('/analyze-results', authenticateToken, async (req, res) => {
    try {
        const { testResults } = req.body;
        
        if (!testResults) {
            return res.status(400).json({
                success: false,
                error: 'Test results are required'
            });
        }
        
        const analysis = await mappingService.analyzeAutomatedResults(testResults);
        
        // Calculate summary statistics
        const summary = {
            totalRequirements: Object.keys(analysis).length,
            tested: 0,
            passed: 0,
            violations: 0,
            notTested: 0
        };
        
        Object.values(analysis).forEach(result => {
            switch (result.status) {
                case 'passed':
                    summary.tested++;
                    summary.passed++;
                    break;
                case 'violation':
                    summary.tested++;
                    summary.violations++;
                    break;
                case 'not_tested':
                    summary.notTested++;
                    break;
            }
        });
        
        res.json({
            success: true,
            data: {
                analysis,
                summary
            }
        });
        
    } catch (error) {
        console.error('Error analyzing test results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze test results',
            details: error.message
        });
    }
});

/**
 * GET /api/requirement-mappings/coverage-summary
 * Get overall coverage summary of automated vs manual testing
 */
router.get('/coverage-summary', authenticateToken, async (req, res) => {
    try {
        const mappings = await mappingService.getAllRequirementMappings();
        
        const coverage = {
            automated: {
                high: 0,
                medium: 0,
                low: 0,
                none: 0
            },
            manual: {
                required: 0,
                optional: 0,
                none: 0
            },
            testMethods: {
                automated: 0,
                manual: 0,
                hybrid: 0,
                unknown: 0
            },
            totalEffort: {
                automated: 0,
                manual: 0,
                total: 0
            }
        };
        
        Object.values(mappings).forEach(mapping => {
            if (mapping.testStrategy) {
                // Count test methods
                coverage.testMethods[mapping.testStrategy.primary]++;
                
                // Count automated coverage
                switch (mapping.testStrategy.automatedCoverage) {
                    case 'high':
                        coverage.automated.high++;
                        break;
                    case 'medium':
                        coverage.automated.medium++;
                        break;
                    case 'low':
                        coverage.automated.low++;
                        break;
                    default:
                        coverage.automated.none++;
                }
                
                // Count manual requirements
                if (mapping.manualProcedure) {
                    coverage.manual.required++;
                } else if (mapping.testStrategy.primary === 'automated') {
                    coverage.manual.none++;
                } else {
                    coverage.manual.optional++;
                }
                
                // Sum effort estimates
                if (mapping.estimatedEffort) {
                    coverage.totalEffort.automated += mapping.estimatedEffort.automated;
                    coverage.totalEffort.manual += mapping.estimatedEffort.manual;
                    coverage.totalEffort.total += mapping.estimatedEffort.total;
                }
            }
        });
        
        res.json({
            success: true,
            data: {
                coverage,
                totalRequirements: Object.keys(mappings).length,
                automatedCoveragePercentage: Math.round(
                    ((coverage.automated.high + coverage.automated.medium) / Object.keys(mappings).length) * 100
                ),
                manualTestingRequired: coverage.manual.required,
                estimatedTotalHours: Math.round(coverage.totalEffort.total / 60 * 10) / 10
            }
        });
        
    } catch (error) {
        console.error('Error getting coverage summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get coverage summary',
            details: error.message
        });
    }
});

module.exports = router; 
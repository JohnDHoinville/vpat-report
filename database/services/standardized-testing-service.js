/**
 * Standardized Testing Service
 * Date: July 14, 2025
 * Description: Implements standardized testing templates for consistent WCAG criteria testing across projects
 */

const RequirementTestMappingService = require('./requirement-test-mapping-service');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class StandardizedTestingService {
    constructor() {
        this.mappingService = new RequirementTestMappingService();
        this.templates = this.loadStandardizedTemplates();
        this.automatedTools = this.initializeAutomatedTools();
        this.testingProcedures = this.initializeTestingProcedures();
    }

    /**
     * Load standardized testing templates
     */
    loadStandardizedTemplates() {
        return {
            automated: {
                type: 'automated',
                description: 'Automated testing for WCAG criteria with high automation confidence',
                tools: ['axe-core', 'pa11y', 'lighthouse', 'playwright'],
                configuration: {
                    confidence_threshold: 'medium',
                    require_manual_verification: false,
                    automated_only: true
                },
                procedure: [
                    'Execute automated accessibility scanning tools',
                    'Validate results against WCAG success criteria',
                    'Generate detailed violation reports with evidence',
                    'Mark test instances as pass/fail based on automated results',
                    'Assign confidence level based on tool reliability'
                ]
            },
            manual: {
                type: 'manual',
                description: 'Manual testing for WCAG criteria requiring human assessment',
                tools: ['screen_reader', 'keyboard_navigation', 'visual_inspection', 'cognitive_assessment'],
                configuration: {
                    require_tester_assignment: true,
                    require_evidence: true,
                    manual_only: true
                },
                procedure: [
                    'Assign qualified accessibility tester',
                    'Follow manual testing procedures for specific criterion',
                    'Document findings with screenshots and evidence',
                    'Provide remediation guidance and recommendations',
                    'Mark with appropriate confidence level and detailed notes'
                ]
            },
            hybrid: {
                type: 'both',
                description: 'Hybrid testing combining automated detection with manual verification',
                tools: ['axe-core', 'pa11y', 'lighthouse', 'playwright', 'manual_verification'],
                configuration: {
                    start_with_automation: true,
                    require_manual_verification: true,
                    confidence_escalation: true
                },
                procedure: [
                    'Execute automated accessibility scanning for baseline detection',
                    'Identify potential violations and automated passes',
                    'Flag edge cases and false positives for manual review',
                    'Assign manual verification for complex scenarios',
                    'Combine automated and manual results for comprehensive assessment',
                    'Provide final determination with confidence rating'
                ]
            }
        };
    }

    /**
     * Initialize automated testing tools configuration
     */
    initializeAutomatedTools() {
        return {
            'axe-core': {
                command: 'npx playwright test tests/playwright/basic-functionality.spec.js',
                timeout: 60000,
                outputFormat: 'json',
                wcagLevels: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
                reliability: 'excellent'
            },
            'pa11y': {
                command: 'npx pa11y --reporter json --standard WCAG2AA',
                timeout: 30000,
                outputFormat: 'json',
                wcagLevels: ['WCAG2A', 'WCAG2AA'],
                reliability: 'good'
            },
            'lighthouse': {
                command: 'npx lighthouse --only-categories=accessibility --output=json --quiet',
                timeout: 60000,
                outputFormat: 'json',
                wcagLevels: ['basic'],
                reliability: 'good'
            },
            'playwright': {
                command: 'npx playwright test',
                timeout: 120000,
                outputFormat: 'json',
                wcagLevels: ['custom'],
                reliability: 'excellent'
            }
        };
    }

    /**
     * Initialize detailed testing procedures for each criterion type
     */
    initializeTestingProcedures() {
        return {
            // Automated procedures
            '1.1.1_automated': {
                tools: ['axe-core', 'pa11y', 'lighthouse'],
                procedure: 'Scan for missing alt text, empty alt attributes, and inappropriate alt text patterns',
                validation: 'Verify all non-text content has appropriate alternative text',
                confidence: 'high'
            },
            '1.4.3_automated': {
                tools: ['axe-core', 'pa11y', 'contrast-analyzer'],
                procedure: 'Calculate color contrast ratios for all text elements against backgrounds',
                validation: 'Ensure contrast ratios meet WCAG AA standards (4.5:1 normal, 3:1 large)',
                confidence: 'high'
            },
            '4.1.2_automated': {
                tools: ['axe-core', 'pa11y', 'lighthouse'],
                procedure: 'Validate ARIA roles, properties, and accessible names for all UI components',
                validation: 'Verify all interactive elements have proper names, roles, and values',
                confidence: 'high'
            },
            
            // Manual procedures
            '1.2.1_manual': {
                tools: ['manual_assessment'],
                procedure: 'Review audio-only and video-only content for appropriate alternatives',
                validation: 'Verify transcripts, audio descriptions, or equivalent alternatives exist',
                confidence: 'high'
            },
            '2.1.4_manual': {
                tools: ['keyboard_testing'],
                procedure: 'Test all character key shortcuts for conflicts and override mechanisms',
                validation: 'Ensure shortcuts can be turned off, remapped, or activated only when focused',
                confidence: 'high'
            },
            '3.2.3_manual': {
                tools: ['visual_inspection', 'navigation_testing'],
                procedure: 'Review navigation mechanisms across multiple pages for consistency',
                validation: 'Verify consistent navigation placement, styling, and functionality',
                confidence: 'high'
            },
            
            // Hybrid procedures
            '1.4.13_hybrid': {
                tools: ['playwright', 'manual_verification'],
                procedure: 'Automated detection of hover/focus triggers, manual verification of dismissibility and persistence',
                validation: 'Ensure hover/focus content is dismissible, persistent, and hoverable',
                confidence: 'medium'
            },
            '2.1.1_hybrid': {
                tools: ['playwright', 'manual_verification'],
                procedure: 'Automated keyboard navigation testing with manual verification of complex interactions',
                validation: 'Verify all functionality is keyboard accessible including complex widgets',
                confidence: 'medium'
            },
            '2.4.1_hybrid': {
                tools: ['axe-core', 'manual_verification'],
                procedure: 'Automated detection of skip links and landmarks, manual verification of functionality',
                validation: 'Ensure bypass mechanisms work effectively for actual users',
                confidence: 'medium'
            }
        };
    }

    /**
     * Execute standardized testing for a specific criterion
     */
    async executeStandardizedTest(criterionNumber, testMethod, url, options = {}) {
        console.log(`🧪 Executing standardized test for ${criterionNumber} using ${testMethod} method`);
        
        const template = this.templates[testMethod === 'both' ? 'hybrid' : testMethod];
        if (!template) {
            throw new Error(`No template found for test method: ${testMethod}`);
        }
        
        const result = {
            criterion: criterionNumber,
            testMethod: testMethod,
            timestamp: new Date().toISOString(),
            template: template.type,
            tools: [],
            results: [],
            violations: [],
            passes: [],
            summary: {
                status: 'pending',
                confidence: 'unknown',
                automatedScore: null,
                manualScore: null,
                finalScore: null,
                notes: ''
            }
        };
        
        try {
            if (testMethod === 'automated' || testMethod === 'both') {
                console.log('  🤖 Running automated tests...');
                await this.executeAutomatedTests(criterionNumber, url, result, options);
            }
            
            if (testMethod === 'manual' || testMethod === 'both') {
                console.log('  👤 Preparing manual test procedures...');
                await this.prepareManualTests(criterionNumber, result, options);
            }
            
            // Combine results and determine final status
            this.combineResults(result);
            
            console.log(`✅ Standardized test completed for ${criterionNumber}: ${result.summary.status}`);
            
        } catch (error) {
            result.summary.status = 'error';
            result.summary.notes = `Test execution failed: ${error.message}`;
            console.error(`❌ Test failed for ${criterionNumber}:`, error.message);
        }
        
        return result;
    }

    /**
     * Execute automated tests for a criterion
     */
    async executeAutomatedTests(criterionNumber, url, result, options) {
        const automatedTools = this.getAutomatedToolsForCriterion(criterionNumber);
        
        for (const toolConfig of automatedTools) {
            try {
                console.log(`    Running ${toolConfig.tool}...`);
                
                const toolResult = await this.runAutomatedTool(toolConfig.tool, url, criterionNumber);
                
                result.tools.push(toolConfig.tool);
                result.results.push({
                    tool: toolConfig.tool,
                    timestamp: new Date().toISOString(),
                    ...toolResult
                });
                
                // Extract violations and passes specific to this criterion
                if (toolResult.violations) {
                    const criterionViolations = toolResult.violations.filter(v => 
                        this.isViolationForCriterion(v, criterionNumber));
                    result.violations.push(...criterionViolations);
                }
                
                if (toolResult.passes) {
                    const criterionPasses = toolResult.passes.filter(p => 
                        this.isPassForCriterion(p, criterionNumber));
                    result.passes.push(...criterionPasses);
                }
                
            } catch (error) {
                console.log(`    Warning: ${toolConfig.tool} failed: ${error.message}`);
                result.results.push({
                    tool: toolConfig.tool,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Calculate automated score
        if (result.violations.length === 0 && result.passes.length > 0) {
            result.summary.automatedScore = 'pass';
        } else if (result.violations.length > 0) {
            result.summary.automatedScore = 'fail';
        } else {
            result.summary.automatedScore = 'not-tested';
        }
    }

    /**
     * Prepare manual test procedures
     */
    async prepareManualTests(criterionNumber, result, options) {
        const procedureKey = `${criterionNumber}_${result.testMethod === 'both' ? 'hybrid' : 'manual'}`;
        const procedure = this.testingProcedures[procedureKey];
        
        if (procedure) {
            result.manualProcedure = {
                criterion: criterionNumber,
                tools: procedure.tools,
                steps: procedure.procedure,
                validation: procedure.validation,
                expectedConfidence: procedure.confidence,
                instructions: this.generateDetailedInstructions(criterionNumber, result.testMethod)
            };
        } else {
            // Generate generic manual procedure
            result.manualProcedure = {
                criterion: criterionNumber,
                tools: ['manual_assessment'],
                steps: 'Follow manual testing guidelines for this criterion',
                validation: 'Verify compliance with WCAG success criteria',
                expectedConfidence: 'medium',
                instructions: this.generateDetailedInstructions(criterionNumber, result.testMethod)
            };
        }
        
        // Set manual score as pending (requires human assessment)
        result.summary.manualScore = 'pending';
    }

    /**
     * Get automated tools that can test a specific criterion
     */
    getAutomatedToolsForCriterion(criterionNumber) {
        const mappings = this.mappingService.getAutomatedToolsForRequirement(criterionNumber);
        
        return mappings.map(mapping => ({
            tool: mapping.tool,
            confidence: mapping.confidence,
            coverage: mapping.coverage,
            config: this.automatedTools[mapping.tool]
        })).filter(tool => tool.config); // Only tools that are configured
    }

    /**
     * Run a specific automated tool
     */
    async runAutomatedTool(toolName, url, criterionNumber) {
        const toolConfig = this.automatedTools[toolName];
        if (!toolConfig) {
            throw new Error(`Tool ${toolName} not configured`);
        }
        
        try {
            let command;
            
            switch (toolName) {
                case 'axe-core':
                    command = `npx playwright test tests/playwright/basic-functionality.spec.js --project=chromium --reporter=json`;
                    break;
                case 'pa11y':
                    command = `npx pa11y "${url}" --reporter json --standard WCAG2AA --timeout 30000`;
                    break;
                case 'lighthouse':
                    command = `npx lighthouse "${url}" --only-categories=accessibility --output=json --quiet --chrome-flags="--headless"`;
                    break;
                case 'playwright':
                    command = `npx playwright test tests/playwright/enhanced-hover-focus-testing.spec.js --project=chromium --reporter=json`;
                    break;
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
            
            console.log(`      Executing: ${command}`);
            const output = execSync(command, { 
                encoding: 'utf8', 
                timeout: toolConfig.timeout,
                cwd: process.cwd()
            });
            
            return this.parseToolOutput(toolName, output);
            
        } catch (error) {
            // Some tools return non-zero exit codes when violations are found
            if (error.stdout) {
                try {
                    return this.parseToolOutput(toolName, error.stdout);
                } catch (parseError) {
                    throw new Error(`Tool execution failed: ${error.message}`);
                }
            }
            throw error;
        }
    }

    /**
     * Parse tool output into standardized format
     */
    parseToolOutput(toolName, output) {
        try {
            switch (toolName) {
                case 'axe-core':
                case 'playwright':
                    // Playwright test results
                    const playwrightResults = JSON.parse(output);
                    return this.parsePlaywrightResults(playwrightResults);
                    
                case 'pa11y':
                    const pa11yResults = JSON.parse(output);
                    return this.parsePa11yResults(pa11yResults);
                    
                case 'lighthouse':
                    const lighthouseResults = JSON.parse(output);
                    return this.parseLighthouseResults(lighthouseResults);
                    
                default:
                    return {
                        violations: [],
                        passes: [],
                        raw: output
                    };
            }
        } catch (error) {
            throw new Error(`Failed to parse ${toolName} output: ${error.message}`);
        }
    }

    /**
     * Parse Playwright test results
     */
    parsePlaywrightResults(results) {
        const violations = [];
        const passes = [];
        
        if (results.tests) {
            results.tests.forEach(test => {
                if (test.status === 'failed') {
                    violations.push({
                        id: test.title,
                        impact: 'serious',
                        description: test.title,
                        error: test.errors?.[0]?.message || 'Test failed'
                    });
                } else if (test.status === 'passed') {
                    passes.push({
                        id: test.title,
                        description: test.title
                    });
                }
            });
        }
        
        return { violations, passes, tool: 'playwright' };
    }

    /**
     * Parse Pa11y results
     */
    parsePa11yResults(results) {
        const violations = [];
        const passes = [];
        
        if (Array.isArray(results)) {
            results.forEach(issue => {
                if (issue.type === 'error') {
                    violations.push({
                        id: issue.code,
                        impact: 'serious',
                        description: issue.message,
                        selector: issue.selector,
                        context: issue.context
                    });
                } else if (issue.type === 'notice') {
                    passes.push({
                        id: issue.code,
                        description: issue.message
                    });
                }
            });
        }
        
        return { violations, passes, tool: 'pa11y' };
    }

    /**
     * Parse Lighthouse results
     */
    parseLighthouseResults(results) {
        const violations = [];
        const passes = [];
        
        if (results.audits) {
            Object.entries(results.audits).forEach(([auditId, audit]) => {
                if (audit.score !== null && audit.score < 1) {
                    violations.push({
                        id: auditId,
                        impact: audit.score < 0.5 ? 'serious' : 'moderate',
                        description: audit.title,
                        helpUrl: `https://web.dev/${auditId}/`
                    });
                } else if (audit.score === 1) {
                    passes.push({
                        id: auditId,
                        description: audit.title
                    });
                }
            });
        }
        
        return { violations, passes, tool: 'lighthouse' };
    }

    /**
     * Check if a violation applies to a specific criterion
     */
    isViolationForCriterion(violation, criterionNumber) {
        // Use the mapping service to determine if this violation maps to the criterion
        const tools = this.mappingService.getAutomatedToolsForRequirement(criterionNumber);
        return tools.some(tool => 
            tool.rule === violation.id || 
            violation.wcagCriteria?.includes(criterionNumber)
        );
    }

    /**
     * Check if a pass applies to a specific criterion
     */
    isPassForCriterion(pass, criterionNumber) {
        // Similar logic as violations
        const tools = this.mappingService.getAutomatedToolsForRequirement(criterionNumber);
        return tools.some(tool => 
            tool.rule === pass.id || 
            pass.wcagCriteria?.includes(criterionNumber)
        );
    }

    /**
     * Combine automated and manual results
     */
    combineResults(result) {
        const hasAutomated = result.summary.automatedScore !== null;
        const hasManual = result.summary.manualScore && result.summary.manualScore !== 'pending';
        
        if (result.testMethod === 'automated') {
            result.summary.finalScore = result.summary.automatedScore;
            result.summary.status = result.summary.automatedScore;
            result.summary.confidence = result.violations.length === 0 ? 'high' : 'high';
        } else if (result.testMethod === 'manual') {
            result.summary.finalScore = result.summary.manualScore || 'pending';
            result.summary.status = result.summary.manualScore || 'pending';
            result.summary.confidence = 'pending';
        } else if (result.testMethod === 'both') {
            if (hasAutomated && hasManual) {
                // Combine both results
                if (result.summary.automatedScore === 'fail' || result.summary.manualScore === 'fail') {
                    result.summary.finalScore = 'fail';
                } else if (result.summary.automatedScore === 'pass' && result.summary.manualScore === 'pass') {
                    result.summary.finalScore = 'pass';
                } else {
                    result.summary.finalScore = 'pending';
                }
                result.summary.status = result.summary.finalScore;
                result.summary.confidence = 'high';
            } else if (hasAutomated) {
                result.summary.finalScore = result.summary.automatedScore;
                result.summary.status = 'pending'; // Still needs manual verification
                result.summary.confidence = 'medium';
            } else {
                result.summary.finalScore = 'pending';
                result.summary.status = 'pending';
                result.summary.confidence = 'pending';
            }
        }
        
        // Add summary notes
        if (result.violations.length > 0) {
            result.summary.notes = `${result.violations.length} violation(s) found. ${result.passes.length} checks passed.`;
        } else if (result.passes.length > 0) {
            result.summary.notes = `${result.passes.length} checks passed. No violations detected.`;
        } else {
            result.summary.notes = 'No automated tests could be executed for this criterion.';
        }
    }

    /**
     * Generate detailed testing instructions
     */
    generateDetailedInstructions(criterionNumber, testMethod) {
        const mapping = this.mappingService.wcagRequirements[criterionNumber];
        if (!mapping) return 'Follow standard WCAG testing procedures.';
        
        let instructions = `WCAG ${criterionNumber} (Level ${mapping.level}): ${mapping.principle}\n\n`;
        
        if (testMethod === 'automated') {
            instructions += 'AUTOMATED TESTING:\n';
            instructions += '1. Run automated accessibility scanning tools\n';
            instructions += '2. Review generated violation reports\n';
            instructions += '3. Validate automated findings\n';
            instructions += '4. Mark test instance based on automated results\n';
        } else if (testMethod === 'manual') {
            instructions += 'MANUAL TESTING:\n';
            instructions += '1. Assign qualified accessibility tester\n';
            instructions += '2. Follow manual testing procedures\n';
            instructions += '3. Document findings with evidence\n';
            instructions += '4. Provide remediation guidance\n';
            instructions += '5. Mark with confidence level and notes\n';
        } else if (testMethod === 'both') {
            instructions += 'HYBRID TESTING:\n';
            instructions += '1. Start with automated scanning for baseline detection\n';
            instructions += '2. Review automated results for accuracy\n';
            instructions += '3. Conduct manual verification for edge cases\n';
            instructions += '4. Combine automated and manual findings\n';
            instructions += '5. Provide final assessment with confidence rating\n';
        }
        
        return instructions;
    }

    /**
     * Batch test multiple criteria using standardized templates
     */
    async batchTestCriteria(criteria, url, options = {}) {
        console.log(`🚀 Starting batch testing for ${criteria.length} criteria`);
        
        const results = [];
        const errors = [];
        
        for (const criterion of criteria) {
            try {
                const result = await this.executeStandardizedTest(
                    criterion.criterion_number, 
                    criterion.test_method, 
                    url, 
                    options
                );
                results.push(result);
            } catch (error) {
                errors.push({
                    criterion: criterion.criterion_number,
                    error: error.message
                });
                console.error(`❌ Failed to test ${criterion.criterion_number}:`, error.message);
            }
        }
        
        console.log(`✅ Batch testing completed: ${results.length} successful, ${errors.length} errors`);
        
        return {
            results,
            errors,
            summary: this.generateBatchSummary(results)
        };
    }

    /**
     * Generate summary for batch testing
     */
    generateBatchSummary(results) {
        const summary = {
            total: results.length,
            passed: results.filter(r => r.summary.finalScore === 'pass').length,
            failed: results.filter(r => r.summary.finalScore === 'fail').length,
            pending: results.filter(r => r.summary.finalScore === 'pending').length,
            automated: results.filter(r => r.testMethod === 'automated').length,
            manual: results.filter(r => r.testMethod === 'manual').length,
            hybrid: results.filter(r => r.testMethod === 'both').length
        };
        
        summary.passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
        
        return summary;
    }

    /**
     * Save testing results to database
     */
    async saveTestResults(sessionId, projectId, results) {
        console.log(`💾 Saving ${results.length} test results to database...`);
        
        // Implementation would save to test_instances table
        // This is a placeholder for the actual database integration
        
        return {
            saved: results.length,
            sessionId,
            projectId
        };
    }
}

module.exports = StandardizedTestingService; 
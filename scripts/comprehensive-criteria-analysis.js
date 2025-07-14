/**
 * Comprehensive WCAG Criteria Analysis and Test Method Alignment
 * Date: July 14, 2025
 * Description: Analyzes all WCAG criteria for test method inconsistencies and creates standardized templates
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ComprehensiveCriteriaAnalyzer {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            analysis: {},
            inconsistencies: [],
            recommendations: [],
            templates: {},
            summary: {
                totalCriteria: 0,
                automatedCriteria: 0,
                manualCriteria: 0,
                hybridCriteria: 0,
                inconsistentCriteria: 0,
                misalignedCriteria: []
            }
        };
        
        // Load automated test capability mappings
        this.automatedCapabilities = this.loadAutomatedCapabilities();
        this.wcagDefinitions = this.loadWCAGDefinitions();
    }

    /**
     * Load known automated testing capabilities from various tools
     */
    loadAutomatedCapabilities() {
        return {
            'axe-core': {
                '1.1.1': ['area-alt', 'image-alt', 'input-image-alt', 'object-alt', 'svg-img-alt'],
                '1.3.1': ['definition-list', 'dlitem', 'list', 'listitem', 'aria-required-children', 'aria-required-parent'],
                '1.4.3': ['color-contrast'],
                '2.1.1': ['accesskeys'],
                '2.1.2': ['no-keyboard-trap'],
                '2.4.1': ['bypass', 'skip-link'],
                '2.4.2': ['document-title'],
                '2.4.3': ['tabindex'],
                '2.4.4': ['link-name'],
                '2.4.7': ['focus-visible'],
                '3.1.1': ['html-has-lang', 'html-lang-valid'],
                '3.1.2': ['valid-lang'],
                '3.2.1': ['no-onchange'],
                '3.2.2': ['no-auto-refresh'],
                '3.3.1': ['aria-describedby-id-refs'],
                '3.3.2': ['label'],
                '4.1.1': ['duplicate-id'],
                '4.1.2': ['aria-roles', 'aria-valid-attr', 'button-name', 'select-name'],
                '4.1.3': ['aria-live-regions']
            },
            'pa11y': {
                '1.1.1': ['H37', 'H24'],
                '1.3.1': ['H43', 'H63'],
                '1.4.3': ['G18', 'G145'],
                '2.4.1': ['H64'],
                '2.4.2': ['H25'],
                '3.1.1': ['H57'],
                '4.1.1': ['F77'],
                '4.1.2': ['H91']
            },
            'lighthouse': {
                '1.1.1': ['image-alt', 'input-image-alt', 'object-alt'],
                '1.3.1': ['definition-list', 'dlitem', 'list', 'listitem'],
                '1.4.3': ['color-contrast'],
                '2.4.1': ['bypass'],
                '2.4.2': ['document-title'],
                '3.1.1': ['html-has-lang', 'html-lang-valid'],
                '4.1.1': ['duplicate-id-aria', 'duplicate-id-active'],
                '4.1.2': ['aria-allowed-attr', 'aria-roles', 'button-name']
            },
            'playwright': {
                '1.4.10': ['reflow-testing'],
                '1.4.12': ['text-spacing-testing'],
                '1.4.13': ['hover-content-detection', 'focus-content-detection'],
                '2.1.1': ['keyboard-navigation'],
                '2.1.2': ['keyboard-trap-detection'],
                '2.4.3': ['focus-management'],
                '2.4.7': ['focus-visible-testing']
            }
        };
    }

    /**
     * Load WCAG criteria definitions with testing guidance
     */
    loadWCAGDefinitions() {
        return {
            '1.1.1': {
                title: 'Non-text Content',
                level: 'A',
                principle: 'Perceivable',
                automatable: 'high',
                reasoning: 'Alt text presence and quality can be detected programmatically',
                manualNeeded: 'Quality assessment of alt text relevance'
            },
            '1.2.1': {
                title: 'Audio-only and Video-only (Prerecorded)',
                level: 'A',
                principle: 'Perceivable',
                automatable: 'low',
                reasoning: 'Requires human assessment of media content and alternatives',
                manualNeeded: 'Content analysis and alternative evaluation'
            },
            '1.2.2': {
                title: 'Captions (Prerecorded)',
                level: 'A',
                principle: 'Perceivable',
                automatable: 'low',
                reasoning: 'Caption presence can be detected, quality requires human review',
                manualNeeded: 'Caption accuracy and synchronization assessment'
            },
            '1.3.1': {
                title: 'Info and Relationships',
                level: 'A',
                principle: 'Perceivable',
                automatable: 'medium',
                reasoning: 'Semantic markup can be detected, relationships need verification',
                manualNeeded: 'Relationship accuracy and completeness'
            },
            '1.3.2': {
                title: 'Meaningful Sequence',
                level: 'A',
                principle: 'Perceivable',
                automatable: 'medium',
                reasoning: 'Reading order can be determined programmatically',
                manualNeeded: 'Sequence meaningfulness verification'
            },
            '1.3.3': {
                title: 'Sensory Characteristics',
                level: 'A',
                principle: 'Perceivable',
                automatable: 'low',
                reasoning: 'Requires human interpretation of instructions and references',
                manualNeeded: 'Instruction clarity and alternative cues'
            },
            '1.4.1': {
                title: 'Use of Color',
                level: 'A',
                principle: 'Perceivable',
                automatable: 'medium',
                reasoning: 'Color usage patterns can be detected, meaning requires review',
                manualNeeded: 'Alternative indicators for color-conveyed information'
            },
            '1.4.3': {
                title: 'Contrast (Minimum)',
                level: 'AA',
                principle: 'Perceivable',
                automatable: 'high',
                reasoning: 'Contrast ratios can be calculated programmatically',
                manualNeeded: 'Edge cases and complex backgrounds'
            },
            '1.4.4': {
                title: 'Resize Text',
                level: 'AA',
                principle: 'Perceivable',
                automatable: 'high',
                reasoning: 'Text scaling behavior can be tested programmatically',
                manualNeeded: 'Usability at different zoom levels'
            },
            '1.4.10': {
                title: 'Reflow',
                level: 'AA',
                principle: 'Perceivable',
                automatable: 'high',
                reasoning: 'Responsive behavior can be tested across viewports',
                manualNeeded: 'Content loss and horizontal scrolling edge cases'
            },
            '1.4.11': {
                title: 'Non-text Contrast',
                level: 'AA',
                principle: 'Perceivable',
                automatable: 'medium',
                reasoning: 'UI component contrast can be calculated',
                manualNeeded: 'Component identification and context assessment'
            },
            '1.4.12': {
                title: 'Text Spacing',
                level: 'AA',
                principle: 'Perceivable',
                automatable: 'high',
                reasoning: 'CSS override effects can be tested programmatically',
                manualNeeded: 'Content overlap and readability verification'
            },
            '1.4.13': {
                title: 'Content on Hover or Focus',
                level: 'AA',
                principle: 'Perceivable',
                automatable: 'medium',
                reasoning: 'Hover/focus triggers can be detected, behavior needs verification',
                manualNeeded: 'Dismissibility, persistence, and hover behavior'
            },
            '2.1.1': {
                title: 'Keyboard',
                level: 'A',
                principle: 'Operable',
                automatable: 'medium',
                reasoning: 'Basic keyboard navigation can be tested programmatically',
                manualNeeded: 'Complex interactions and workflow completion'
            },
            '2.1.2': {
                title: 'No Keyboard Trap',
                level: 'A',
                principle: 'Operable',
                automatable: 'high',
                reasoning: 'Focus traps can be detected through navigation testing',
                manualNeeded: 'Complex modal and widget behaviors'
            },
            '2.1.4': {
                title: 'Character Key Shortcuts',
                level: 'A',
                principle: 'Operable',
                automatable: 'low',
                reasoning: 'Requires testing of actual key combinations and conflicts',
                manualNeeded: 'Shortcut discovery and conflict assessment'
            },
            '2.4.1': {
                title: 'Bypass Blocks',
                level: 'A',
                principle: 'Operable',
                automatable: 'high',
                reasoning: 'Skip links and landmarks can be detected',
                manualNeeded: 'Functionality and target verification'
            },
            '2.4.2': {
                title: 'Page Titled',
                level: 'A',
                principle: 'Operable',
                automatable: 'high',
                reasoning: 'Page title presence and structure can be verified',
                manualNeeded: 'Title descriptiveness and accuracy'
            },
            '2.4.3': {
                title: 'Focus Order',
                level: 'A',
                principle: 'Operable',
                automatable: 'high',
                reasoning: 'Tab order can be programmatically determined',
                manualNeeded: 'Logical order and visual flow verification'
            },
            '2.4.4': {
                title: 'Link Purpose (In Context)',
                level: 'A',
                principle: 'Operable',
                automatable: 'medium',
                reasoning: 'Link text can be analyzed, context requires interpretation',
                manualNeeded: 'Purpose clarity and context sufficiency'
            },
            '2.4.6': {
                title: 'Headings and Labels',
                level: 'AA',
                principle: 'Operable',
                automatable: 'medium',
                reasoning: 'Heading structure can be detected, descriptiveness needs review',
                manualNeeded: 'Heading and label clarity and descriptiveness'
            },
            '2.4.7': {
                title: 'Focus Visible',
                level: 'AA',
                principle: 'Operable',
                automatable: 'high',
                reasoning: 'Focus indicators can be detected and measured',
                manualNeeded: 'Visibility in various contexts and backgrounds'
            },
            '3.1.1': {
                title: 'Language of Page',
                level: 'A',
                principle: 'Understandable',
                automatable: 'high',
                reasoning: 'HTML lang attribute can be verified programmatically',
                manualNeeded: 'Language accuracy verification'
            },
            '3.1.2': {
                title: 'Language of Parts',
                level: 'AA',
                principle: 'Understandable',
                automatable: 'medium',
                reasoning: 'Lang attributes can be detected, accuracy needs verification',
                manualNeeded: 'Language change identification and accuracy'
            },
            '3.2.1': {
                title: 'On Focus',
                level: 'A',
                principle: 'Understandable',
                automatable: 'high',
                reasoning: 'Focus events and context changes can be monitored',
                manualNeeded: 'Unexpected changes and user experience'
            },
            '3.2.2': {
                title: 'On Input',
                level: 'A',
                principle: 'Understandable',
                automatable: 'high',
                reasoning: 'Input events and changes can be monitored',
                manualNeeded: 'Unexpected changes and user experience'
            },
            '3.3.1': {
                title: 'Error Identification',
                level: 'A',
                principle: 'Understandable',
                automatable: 'medium',
                reasoning: 'Error markup can be detected, identification needs review',
                manualNeeded: 'Error clarity and identification completeness'
            },
            '3.3.2': {
                title: 'Labels or Instructions',
                level: 'A',
                principle: 'Understandable',
                automatable: 'medium',
                reasoning: 'Labels can be detected, sufficiency needs assessment',
                manualNeeded: 'Label clarity and instruction adequacy'
            },
            '4.1.1': {
                title: 'Parsing',
                level: 'A',
                principle: 'Robust',
                automatable: 'high',
                reasoning: 'HTML validation can be performed programmatically',
                manualNeeded: 'Impact assessment of parsing errors'
            },
            '4.1.2': {
                title: 'Name, Role, Value',
                level: 'A',
                principle: 'Robust',
                automatable: 'high',
                reasoning: 'ARIA properties and roles can be verified',
                manualNeeded: 'Accuracy and completeness of accessible names'
            },
            '4.1.3': {
                title: 'Status Messages',
                level: 'AA',
                principle: 'Robust',
                automatable: 'medium',
                reasoning: 'Live regions can be detected, messaging needs verification',
                manualNeeded: 'Message appropriateness and timing'
            }
        };
    }

    /**
     * Main analysis function
     */
    async analyze() {
        console.log('🔍 Starting comprehensive WCAG criteria analysis...');
        
        try {
            // Get current database state
            const databaseCriteria = await this.getDatabaseCriteria();
            
            // Analyze each criterion
            for (const criterion of databaseCriteria) {
                await this.analyzeCriterion(criterion);
            }
            
            // Generate recommendations
            this.generateRecommendations();
            
            // Create templates
            this.createStandardizedTemplates();
            
            // Generate summary
            this.generateSummary();
            
            // Save results
            await this.saveResults();
            
            console.log('✅ Analysis complete!');
            return this.results;
            
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            throw error;
        }
    }

    /**
     * Get current criteria from database
     */
    async getDatabaseCriteria() {
        try {
            const query = `
                SELECT 
                    criterion_number, 
                    title, 
                    test_method, 
                    requirement_type,
                    testing_instructions
                FROM test_requirements 
                WHERE requirement_type = 'wcag' 
                ORDER BY criterion_number;
            `;
            
            const output = execSync(`psql accessibility_testing -c "${query}" -t --csv`, 
                { encoding: 'utf8' });
            
            const lines = output.trim().split('\n').filter(line => line.length > 0);
            
            return lines.map(line => {
                const [criterion_number, title, test_method, requirement_type, testing_instructions] = 
                    line.split(',').map(field => field.replace(/^"|"$/g, ''));
                
                return {
                    criterion_number,
                    title,
                    test_method,
                    requirement_type,
                    testing_instructions: testing_instructions || ''
                };
            });
            
        } catch (error) {
            console.error('Failed to get database criteria:', error);
            return [];
        }
    }

    /**
     * Analyze individual criterion
     */
    async analyzeCriterion(criterion) {
        const criterionNumber = criterion.criterion_number;
        const wcagDef = this.wcagDefinitions[criterionNumber];
        
        if (!wcagDef) {
            this.results.inconsistencies.push({
                criterion: criterionNumber,
                type: 'missing_definition',
                message: `No WCAG definition found for criterion ${criterionNumber}`,
                severity: 'warning'
            });
            return;
        }
        
        // Analyze automated capabilities
        const automatedTools = this.getAutomatedToolsForCriterion(criterionNumber);
        const hasAutomatedCapability = automatedTools.length > 0;
        
        // Determine recommended test method
        const recommendedMethod = this.determineRecommendedTestMethod(wcagDef, hasAutomatedCapability);
        
        // Check for inconsistencies
        const isInconsistent = criterion.test_method !== recommendedMethod;
        
        const analysis = {
            criterion: criterionNumber,
            title: criterion.title,
            currentMethod: criterion.test_method,
            recommendedMethod: recommendedMethod,
            wcagDefinition: wcagDef,
            automatedTools: automatedTools,
            hasAutomatedCapability: hasAutomatedCapability,
            isInconsistent: isInconsistent,
            reasoning: this.generateReasoning(wcagDef, hasAutomatedCapability, recommendedMethod),
            testingInstructions: criterion.testing_instructions
        };
        
        this.results.analysis[criterionNumber] = analysis;
        
        if (isInconsistent) {
            this.results.inconsistencies.push({
                criterion: criterionNumber,
                type: 'method_mismatch',
                current: criterion.test_method,
                recommended: recommendedMethod,
                severity: 'high',
                reasoning: analysis.reasoning
            });
            
            this.results.summary.misalignedCriteria.push(criterionNumber);
        }
    }

    /**
     * Get automated tools that can test a criterion
     */
    getAutomatedToolsForCriterion(criterionNumber) {
        const tools = [];
        
        Object.keys(this.automatedCapabilities).forEach(toolName => {
            const toolCapabilities = this.automatedCapabilities[toolName];
            if (toolCapabilities[criterionNumber]) {
                tools.push({
                    tool: toolName,
                    rules: toolCapabilities[criterionNumber],
                    ruleCount: toolCapabilities[criterionNumber].length
                });
            }
        });
        
        return tools;
    }

    /**
     * Determine recommended test method based on capabilities
     */
    determineRecommendedTestMethod(wcagDef, hasAutomatedCapability) {
        const automatable = wcagDef.automatable;
        
        if (automatable === 'high' && hasAutomatedCapability) {
            return 'both'; // High confidence in automation + manual verification
        } else if (automatable === 'medium' && hasAutomatedCapability) {
            return 'both'; // Medium automation + manual assessment
        } else if (automatable === 'high' && !hasAutomatedCapability) {
            return 'automated'; // Should be automatable but no tools configured
        } else if (automatable === 'low' || !hasAutomatedCapability) {
            return 'manual'; // Low automation potential or no tools
        } else {
            return 'manual'; // Default to manual
        }
    }

    /**
     * Generate reasoning for recommendation
     */
    generateReasoning(wcagDef, hasAutomatedCapability, recommendedMethod) {
        let reasoning = wcagDef.reasoning + '. ';
        
        if (hasAutomatedCapability) {
            reasoning += 'Automated tools are available for detection. ';
        } else {
            reasoning += 'No automated tools currently configured. ';
        }
        
        if (wcagDef.manualNeeded) {
            reasoning += `Manual testing needed for: ${wcagDef.manualNeeded}.`;
        }
        
        return reasoning;
    }

    /**
     * Generate recommendations for fixes
     */
    generateRecommendations() {
        console.log('📋 Generating recommendations...');
        
        // Method alignment recommendations
        const methodMismatches = this.results.inconsistencies.filter(inc => inc.type === 'method_mismatch');
        
        if (methodMismatches.length > 0) {
            this.results.recommendations.push({
                category: 'method_alignment',
                priority: 'high',
                title: 'Fix Test Method Inconsistencies',
                description: `${methodMismatches.length} criteria have misaligned test methods`,
                criteria: methodMismatches.map(mm => mm.criterion),
                action: 'Update database test_method values to match automated capabilities',
                sql_script: this.generateMethodAlignmentSQL(methodMismatches)
            });
        }
        
        // Automation enhancement recommendations
        const manualOnlyCriteria = Object.values(this.results.analysis)
            .filter(analysis => analysis.recommendedMethod === 'manual' && 
                             analysis.wcagDefinition.automatable !== 'low');
        
        if (manualOnlyCriteria.length > 0) {
            this.results.recommendations.push({
                category: 'automation_enhancement',
                priority: 'medium',
                title: 'Add Automated Testing Capabilities',
                description: `${manualOnlyCriteria.length} criteria could benefit from automated testing`,
                criteria: manualOnlyCriteria.map(c => c.criterion),
                action: 'Implement automated test rules for these criteria'
            });
        }
        
        // Template standardization
        this.results.recommendations.push({
            category: 'template_standardization',
            priority: 'medium',
            title: 'Standardize Testing Templates',
            description: 'Create standardized templates for consistent testing across projects',
            action: 'Apply generated templates to seed data and testing procedures'
        });
    }

    /**
     * Generate SQL script for method alignment
     */
    generateMethodAlignmentSQL(mismatches) {
        let sql = `-- WCAG Criteria Test Method Alignment\n-- Generated: ${new Date().toISOString()}\n\n`;
        
        mismatches.forEach(mismatch => {
            sql += `-- ${mismatch.criterion}: ${mismatch.current} → ${mismatch.recommended}\n`;
            sql += `UPDATE test_requirements SET test_method = '${mismatch.recommended}' WHERE criterion_number = '${mismatch.criterion}';\n\n`;
        });
        
        sql += `-- Verification query\nSELECT criterion_number, title, test_method FROM test_requirements WHERE requirement_type = 'wcag' ORDER BY criterion_number;\n`;
        
        return sql;
    }

    /**
     * Create standardized templates
     */
    createStandardizedTemplates() {
        console.log('📝 Creating standardized templates...');
        
        // Group criteria by test method
        const methodGroups = {
            automated: [],
            manual: [],
            both: []
        };
        
        Object.values(this.results.analysis).forEach(analysis => {
            methodGroups[analysis.recommendedMethod].push(analysis);
        });
        
        // Create templates for each method
        this.results.templates = {
            automated: this.createAutomatedTemplate(methodGroups.automated),
            manual: this.createManualTemplate(methodGroups.manual),
            hybrid: this.createHybridTemplate(methodGroups.both)
        };
    }

    /**
     * Create automated testing template
     */
    createAutomatedTemplate(criteria) {
        return {
            type: 'automated',
            description: 'Automated testing template for WCAG criteria with high automation confidence',
            criteria_count: criteria.length,
            criteria: criteria.map(c => c.criterion),
            tools: ['axe-core', 'pa11y', 'lighthouse', 'playwright'],
            configuration: {
                confidence_threshold: 'medium',
                require_manual_verification: false,
                automated_only: true
            },
            testing_procedure: [
                'Run automated accessibility scanning tools',
                'Validate results against WCAG criteria',
                'Generate violation reports',
                'Mark as pass/fail based on automated results'
            ],
            sql_template: this.generateSQLTemplate('automated', criteria)
        };
    }

    /**
     * Create manual testing template
     */
    createManualTemplate(criteria) {
        return {
            type: 'manual',
            description: 'Manual testing template for WCAG criteria requiring human assessment',
            criteria_count: criteria.length,
            criteria: criteria.map(c => c.criterion),
            tools: ['screen_reader', 'keyboard_navigation', 'visual_inspection'],
            configuration: {
                require_tester_assignment: true,
                require_evidence: true,
                manual_only: true
            },
            testing_procedure: [
                'Assign qualified tester',
                'Follow manual testing procedures',
                'Document findings with evidence',
                'Provide remediation guidance',
                'Mark with confidence level and notes'
            ],
            sql_template: this.generateSQLTemplate('manual', criteria)
        };
    }

    /**
     * Create hybrid testing template
     */
    createHybridTemplate(criteria) {
        return {
            type: 'both',
            description: 'Hybrid testing template combining automated detection with manual verification',
            criteria_count: criteria.length,
            criteria: criteria.map(c => c.criterion),
            tools: ['axe-core', 'pa11y', 'lighthouse', 'playwright', 'manual_verification'],
            configuration: {
                start_with_automation: true,
                require_manual_verification: true,
                confidence_escalation: true
            },
            testing_procedure: [
                'Run automated accessibility scanning',
                'Identify potential violations and passes',
                'Assign manual verification for edge cases',
                'Combine automated and manual results',
                'Provide comprehensive assessment'
            ],
            sql_template: this.generateSQLTemplate('both', criteria)
        };
    }

    /**
     * Generate SQL template for criteria type
     */
    generateSQLTemplate(method, criteria) {
        let sql = `-- ${method.toUpperCase()} Testing Template\n`;
        sql += `-- Generated: ${new Date().toISOString()}\n\n`;
        
        criteria.forEach(criterion => {
            const instructions = this.generateTestingInstructions(criterion, method);
            sql += `UPDATE test_requirements SET \n`;
            sql += `    test_method = '${method}',\n`;
            sql += `    testing_instructions = '${instructions}'\n`;
            sql += `WHERE criterion_number = '${criterion.criterion}';\n\n`;
        });
        
        return sql;
    }

    /**
     * Generate testing instructions for a criterion
     */
    generateTestingInstructions(criterion, method) {
        const wcagDef = criterion.wcagDefinition;
        let instructions = '';
        
        if (method === 'automated') {
            instructions = `AUTOMATED: Use accessibility scanning tools to detect violations. ${wcagDef.reasoning}`;
        } else if (method === 'manual') {
            instructions = `MANUAL: ${wcagDef.manualNeeded || 'Requires human assessment'}. ${wcagDef.reasoning}`;
        } else if (method === 'both') {
            instructions = `HYBRID: Start with automated scanning for baseline detection. Manual verification required for ${wcagDef.manualNeeded || 'context and accuracy'}. ${wcagDef.reasoning}`;
        }
        
        // Add tool-specific guidance
        if (criterion.automatedTools.length > 0) {
            const toolNames = criterion.automatedTools.map(t => t.tool).join(', ');
            instructions += ` Tools available: ${toolNames}.`;
        }
        
        return instructions.replace(/'/g, "''"); // Escape quotes for SQL
    }

    /**
     * Generate summary statistics
     */
    generateSummary() {
        const analyses = Object.values(this.results.analysis);
        
        this.results.summary.totalCriteria = analyses.length;
        this.results.summary.automatedCriteria = analyses.filter(a => a.recommendedMethod === 'automated').length;
        this.results.summary.manualCriteria = analyses.filter(a => a.recommendedMethod === 'manual').length;
        this.results.summary.hybridCriteria = analyses.filter(a => a.recommendedMethod === 'both').length;
        this.results.summary.inconsistentCriteria = this.results.inconsistencies.length;
    }

    /**
     * Save results to files
     */
    async saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseFilename = `wcag-criteria-analysis-${timestamp}`;
        
        // Save complete analysis
        const analysisPath = `reports/${baseFilename}.json`;
        fs.writeFileSync(analysisPath, JSON.stringify(this.results, null, 2));
        console.log(`💾 Complete analysis saved to: ${analysisPath}`);
        
        // Save SQL fixes
        const methodMismatches = this.results.inconsistencies.filter(inc => inc.type === 'method_mismatch');
        if (methodMismatches.length > 0) {
            const sqlPath = `database/${baseFilename}-fixes.sql`;
            fs.writeFileSync(sqlPath, this.generateMethodAlignmentSQL(methodMismatches));
            console.log(`🔧 SQL fixes saved to: ${sqlPath}`);
        }
        
        // Save templates
        Object.keys(this.results.templates).forEach(templateType => {
            const template = this.results.templates[templateType];
            const templatePath = `database/templates/wcag-${templateType}-template.sql`;
            
            // Ensure directory exists
            const dir = path.dirname(templatePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(templatePath, template.sql_template);
            console.log(`📋 ${templateType} template saved to: ${templatePath}`);
        });
        
        // Save summary report
        const summaryPath = `reports/${baseFilename}-summary.txt`;
        fs.writeFileSync(summaryPath, this.generateSummaryReport());
        console.log(`📊 Summary report saved to: ${summaryPath}`);
    }

    /**
     * Generate human-readable summary report
     */
    generateSummaryReport() {
        const summary = this.results.summary;
        
        let report = `WCAG Criteria Analysis Summary\n`;
        report += `Generated: ${this.results.timestamp}\n`;
        report += `${'='.repeat(50)}\n\n`;
        
        report += `📊 OVERVIEW:\n`;
        report += `  Total WCAG Criteria: ${summary.totalCriteria}\n`;
        report += `  Automated: ${summary.automatedCriteria} (${Math.round(summary.automatedCriteria/summary.totalCriteria*100)}%)\n`;
        report += `  Manual: ${summary.manualCriteria} (${Math.round(summary.manualCriteria/summary.totalCriteria*100)}%)\n`;
        report += `  Hybrid: ${summary.hybridCriteria} (${Math.round(summary.hybridCriteria/summary.totalCriteria*100)}%)\n`;
        report += `  Inconsistent: ${summary.inconsistentCriteria}\n\n`;
        
        if (summary.misalignedCriteria.length > 0) {
            report += `❌ MISALIGNED CRITERIA:\n`;
            summary.misalignedCriteria.forEach(criterion => {
                const analysis = this.results.analysis[criterion];
                report += `  ${criterion}: ${analysis.currentMethod} → ${analysis.recommendedMethod}\n`;
            });
            report += `\n`;
        }
        
        report += `✅ RECOMMENDATIONS:\n`;
        this.results.recommendations.forEach(rec => {
            report += `  ${rec.title} (${rec.priority}): ${rec.description}\n`;
        });
        
        return report;
    }
}

// Main execution
async function main() {
    if (require.main === module) {
        try {
            const analyzer = new ComprehensiveCriteriaAnalyzer();
            const results = await analyzer.analyze();
            
            console.log('\n📊 ANALYSIS COMPLETE');
            console.log(`Total criteria analyzed: ${results.summary.totalCriteria}`);
            console.log(`Inconsistencies found: ${results.summary.inconsistentCriteria}`);
            console.log(`Recommendations generated: ${results.recommendations.length}`);
            
            process.exit(0);
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            process.exit(1);
        }
    }
}

module.exports = ComprehensiveCriteriaAnalyzer;

// Run if called directly
main(); 
/**
 * Automated Evidence Service
 * Extracts detailed evidence from automated tool results (axe, lighthouse, pa11y)
 * Provides structured evidence for both pass and fail results
 */

const { Pool } = require('pg');

class AutomatedEvidenceService {
    constructor(pool) {
        this.pool = pool;
        this.evidenceExtractors = {
            'axe': this.extractAxeEvidence.bind(this),
            'lighthouse': this.extractLighthouseEvidence.bind(this),
            'pa11y': this.extractPa11yEvidence.bind(this),
            'playwright': this.extractPlaywrightEvidence.bind(this)
        };
    }

    /**
     * Main method to extract evidence from automated test result
     * @param {Object} automatedResult - Raw automated test result
     * @param {string} wcagCriterion - WCAG criterion being tested
     * @returns {Object} Structured evidence object
     */
    async extractEvidence(automatedResult, wcagCriterion) {
        const toolName = automatedResult.tool_name;
        const rawResults = automatedResult.raw_results;
        
        console.log(`🔍 Extracting evidence for ${toolName} - WCAG ${wcagCriterion}`);
        
        const extractor = this.evidenceExtractors[toolName];
        if (!extractor) {
            console.warn(`⚠️  No evidence extractor for tool: ${toolName}`);
            return this.createGenericEvidence(automatedResult, wcagCriterion);
        }
        
        try {
            const evidence = await extractor(rawResults, wcagCriterion, automatedResult);
            return this.enhanceEvidence(evidence, automatedResult);
        } catch (error) {
            console.error(`❌ Error extracting ${toolName} evidence:`, error);
            return this.createGenericEvidence(automatedResult, wcagCriterion);
        }
    }

    /**
     * Extract evidence from axe-core results
     */
    async extractAxeEvidence(rawResults, wcagCriterion, automatedResult) {
        const result = rawResults.result || rawResults;
        const passes = result.passes || 0;
        const violations = result.violations || 0;
        const detailedViolations = result.detailedViolations || [];
        
        // Determine if this is a pass or fail
        const isPass = violations === 0 || (typeof violations === 'number' && violations === 0);
        
        if (isPass) {
            return this.extractAxePassEvidence(rawResults, wcagCriterion, passes);
        } else {
            return this.extractAxeFailEvidence(rawResults, wcagCriterion, detailedViolations);
        }
    }

    /**
     * Extract pass evidence from axe-core
     */
    async extractAxePassEvidence(rawResults, wcagCriterion, passCount) {
        const result = rawResults.result || rawResults;
        
        // Try to extract detailed pass information from raw axe results
        let passDetails = [];
        
        // Look for detailed passes in the raw axe output
        if (result.passes && Array.isArray(result.passes)) {
            passDetails = result.passes
                .filter(pass => this.passMatchesWCAGCriterion(pass, wcagCriterion))
                .map(pass => ({
                    rule_id: pass.id,
                    rule_description: pass.description || pass.help,
                    help_text: pass.help,
                    help_url: pass.helpUrl,
                    elements_tested: (pass.nodes || []).map(node => ({
                        selector: Array.isArray(node.target) ? node.target.join(' ') : node.target,
                        html: this.truncateHtml(node.html),
                        verification: `Passed: ${pass.help || 'Accessibility rule satisfied'}`
                    })),
                    wcag_criteria: (pass.tags || []).filter(tag => tag.startsWith('wcag')),
                    confidence_indicators: this.analyzeAxePassConfidence(pass)
                }));
        }
        
        // If no detailed passes found, create summary evidence
        if (passDetails.length === 0) {
            passDetails = [{
                rule_id: `wcag-${wcagCriterion}`,
                rule_description: `WCAG ${wcagCriterion} automated validation`,
                help_text: `Axe-core found no violations for WCAG ${wcagCriterion}`,
                verification: `${passCount} accessibility checks passed`,
                confidence_indicators: {
                    elements_scanned: 'multiple',
                    scan_depth: 'comprehensive',
                    rule_coverage: 'standard'
                }
            }];
        }

        return {
            evidence_type: 'automated_pass',
            tool_result: 'pass',
            confidence_level: this.calculateAxePassConfidence(result, wcagCriterion),
            evidence_strength: passDetails.length > 0 ? 'high' : 'medium',
            
            test_execution: {
                tool: 'axe-core',
                method: 'static_dom_analysis',
                scope: 'full_page',
                execution_time: rawResults.duration || result.executionTime,
                timestamp: rawResults.endTime || new Date().toISOString()
            },
            
            pass_evidence: {
                rules_satisfied: passDetails.map(p => p.rule_description),
                detailed_findings: passDetails,
                elements_verified: passDetails.flatMap(p => p.elements_tested || []),
                total_checks_passed: passCount,
                wcag_compliance_indicators: this.getWCAGComplianceIndicators(wcagCriterion, passDetails)
            },
            
            review_indicators: {
                requires_human_review: this.shouldRequireReview(wcagCriterion, 'pass', 'axe'),
                review_reason: this.getReviewReason(wcagCriterion, 'pass', 'axe'),
                complexity_score: this.calculateComplexityScore(wcagCriterion, passDetails),
                false_positive_risk: this.calculateFalsePositiveRisk('axe', wcagCriterion, 'pass')
            }
        };
    }

    /**
     * Extract fail evidence from axe-core
     */
    async extractAxeFailEvidence(rawResults, wcagCriterion, detailedViolations) {
        const relevantViolations = detailedViolations.filter(v => 
            this.violationMatchesWCAGCriterion(v, wcagCriterion)
        );

        const violationDetails = relevantViolations.map(violation => ({
            rule_id: violation.id,
            description: violation.description,
            impact: violation.impact,
            help_text: violation.help,
            help_url: violation.helpUrl,
            affected_elements: (violation.nodes || []).map(node => ({
                selector: Array.isArray(node.target) ? node.target.join(' ') : node.target,
                html: this.truncateHtml(node.html),
                failure_summary: node.failureSummary,
                remediation_guidance: this.generateRemediationGuidance(violation, node)
            })),
            wcag_criteria: violation.wcagCriteria || [],
            severity_assessment: this.assessSeverity(violation)
        }));

        return {
            evidence_type: 'automated_fail',
            tool_result: 'fail',
            confidence_level: 'high', // Axe failures are generally reliable
            evidence_strength: 'high',
            
            test_execution: {
                tool: 'axe-core',
                method: 'static_dom_analysis',
                scope: 'full_page',
                execution_time: rawResults.duration,
                timestamp: rawResults.endTime || new Date().toISOString()
            },
            
            fail_evidence: {
                violations_found: violationDetails,
                total_violations: relevantViolations.length,
                impact_summary: this.summarizeImpact(relevantViolations),
                affected_areas: this.identifyAffectedAreas(violationDetails),
                remediation_priority: this.assessRemediationPriority(relevantViolations)
            },
            
            review_indicators: {
                requires_human_review: this.shouldRequireReview(wcagCriterion, 'fail', 'axe'),
                review_reason: this.getReviewReason(wcagCriterion, 'fail', 'axe'),
                complexity_score: this.calculateComplexityScore(wcagCriterion, violationDetails),
                false_positive_risk: this.calculateFalsePositiveRisk('axe', wcagCriterion, 'fail')
            }
        };
    }

    /**
     * Extract evidence from Lighthouse results
     */
    async extractLighthouseEvidence(rawResults, wcagCriterion, automatedResult) {
        const result = rawResults.result || rawResults;
        const accessibilityScore = result.accessibilityScore || result.score;
        const violations = result.violations || 0;
        
        const isPass = violations === 0 && accessibilityScore >= 90; // Lighthouse threshold
        
        if (isPass) {
            return this.extractLighthousePassEvidence(rawResults, wcagCriterion, accessibilityScore);
        } else {
            return this.extractLighthouseFailEvidence(rawResults, wcagCriterion, result.detailedViolations || []);
        }
    }

    /**
     * Extract pass evidence from Lighthouse
     */
    async extractLighthousePassEvidence(rawResults, wcagCriterion, score) {
        const result = rawResults.result || rawResults;
        
        return {
            evidence_type: 'automated_pass',
            tool_result: 'pass',
            confidence_level: this.calculateLighthouseConfidence(score),
            evidence_strength: score >= 95 ? 'high' : 'medium',
            
            test_execution: {
                tool: 'lighthouse',
                method: 'chromium_audit',
                scope: 'full_page_plus_performance',
                timestamp: new Date().toISOString()
            },
            
            pass_evidence: {
                accessibility_score: score,
                performance_context: result.performanceScore,
                audit_results: 'accessibility_audit_passed',
                lighthouse_categories: ['accessibility'],
                best_practices_confirmed: this.getLighthouseBestPractices(wcagCriterion)
            },
            
            review_indicators: {
                requires_human_review: score < 95 || this.shouldRequireReview(wcagCriterion, 'pass', 'lighthouse'),
                review_reason: score < 95 ? 'Accessibility score below 95%' : this.getReviewReason(wcagCriterion, 'pass', 'lighthouse'),
                complexity_score: 0.3, // Lighthouse is less complex than axe
                false_positive_risk: 0.2
            }
        };
    }

    /**
     * Extract evidence from Pa11y results
     */
    async extractPa11yEvidence(rawResults, wcagCriterion, automatedResult) {
        const result = rawResults.result || rawResults;
        const violations = result.violations || 0;
        
        if (violations === 0) {
            return this.extractPa11yPassEvidence(rawResults, wcagCriterion);
        } else {
            return this.extractPa11yFailEvidence(rawResults, wcagCriterion, result.detailedViolations || []);
        }
    }

    /**
     * Extract evidence from Playwright results
     */
    async extractPlaywrightEvidence(rawResults, wcagCriterion, automatedResult) {
        // Playwright results can contain axe or other tools
        if (rawResults.tool === 'axe-core' || rawResults.result?.tool === 'axe-core') {
            return this.extractAxeEvidence(rawResults, wcagCriterion, automatedResult);
        }
        
        return this.createGenericEvidence(automatedResult, wcagCriterion);
    }

    /**
     * Enhance evidence with additional metadata
     */
    enhanceEvidence(evidence, automatedResult) {
        return {
            ...evidence,
            
            // Add metadata
            metadata: {
                extraction_timestamp: new Date().toISOString(),
                automated_result_id: automatedResult.id,
                tool_version: automatedResult.tool_version,
                page_context: {
                    url: automatedResult.page_url,
                    title: automatedResult.page_title
                }
            },
            
            // Add quality indicators
            quality_indicators: {
                evidence_completeness: this.assessEvidenceCompleteness(evidence),
                data_integrity: this.assessDataIntegrity(evidence),
                extraction_confidence: this.assessExtractionConfidence(evidence)
            }
        };
    }

    /**
     * Helper methods for analysis
     */
    
    passMatchesWCAGCriterion(pass, wcagCriterion) {
        if (!pass.tags) return false;
        return pass.tags.some(tag => tag.includes(wcagCriterion.replace('.', '')));
    }
    
    violationMatchesWCAGCriterion(violation, wcagCriterion) {
        if (!violation.wcagCriteria) return false;
        return violation.wcagCriteria.some(criteria => criteria.includes(wcagCriterion.replace('.', '')));
    }
    
    truncateHtml(html, maxLength = 200) {
        if (!html) return '';
        return html.length > maxLength ? html.substring(0, maxLength) + '...' : html;
    }
    
    calculateAxePassConfidence(result, wcagCriterion) {
        // Higher confidence for more passes and specific criterion matches
        const passCount = result.passes || 0;
        if (passCount > 10) return 'high';
        if (passCount > 5) return 'medium';
        return 'low';
    }
    
    calculateLighthouseConfidence(score) {
        if (score >= 95) return 'high';
        if (score >= 85) return 'medium';
        return 'low';
    }
    
    shouldRequireReview(wcagCriterion, result, tool) {
        // Define criteria that require human review
        const alwaysReviewCriteria = ['3.3.4', '2.4.4', '3.2.1', '3.2.2'];
        const reviewForPasses = ['3.3.4']; // Financial/legal data
        
        if (alwaysReviewCriteria.includes(wcagCriterion)) return true;
        if (result === 'pass' && reviewForPasses.includes(wcagCriterion)) return true;
        if (tool === 'lighthouse' && result === 'pass') return true; // Lighthouse passes need verification
        
        return false;
    }
    
    getReviewReason(wcagCriterion, result, tool) {
        if (wcagCriterion === '3.3.4') return 'Financial/legal data context requires manual verification';
        if (tool === 'lighthouse' && result === 'pass') return 'Lighthouse automated pass needs manual confirmation';
        return 'Standard review process for this criterion';
    }
    
    calculateComplexityScore(wcagCriterion, details) {
        // Complex criteria get higher scores
        const complexCriteria = ['3.3.4', '2.4.4', '3.2.1'];
        if (complexCriteria.includes(wcagCriterion)) return 0.8;
        return 0.4;
    }
    
    calculateFalsePositiveRisk(tool, wcagCriterion, result) {
        // Tool-specific false positive risk
        if (tool === 'axe' && result === 'fail') return 0.1; // Axe failures are reliable
        if (tool === 'lighthouse' && result === 'pass') return 0.3; // Lighthouse passes need verification
        return 0.2;
    }
    
    /**
     * Create generic evidence when specific extractor is not available
     */
    createGenericEvidence(automatedResult, wcagCriterion) {
        const isPass = automatedResult.violations_count === 0;
        
        return {
            evidence_type: isPass ? 'automated_pass' : 'automated_fail',
            tool_result: isPass ? 'pass' : 'fail',
            confidence_level: 'medium',
            evidence_strength: 'medium',
            
            test_execution: {
                tool: automatedResult.tool_name,
                method: 'automated_scan',
                timestamp: automatedResult.executed_at
            },
            
            [isPass ? 'pass_evidence' : 'fail_evidence']: {
                summary: isPass ? 
                    `${automatedResult.tool_name} found no violations for WCAG ${wcagCriterion}` :
                    `${automatedResult.tool_name} found ${automatedResult.violations_count} violations for WCAG ${wcagCriterion}`,
                raw_tool_output: automatedResult.raw_results
            },
            
            review_indicators: {
                requires_human_review: true,
                review_reason: 'Generic evidence extraction - manual review recommended',
                complexity_score: 0.5,
                false_positive_risk: 0.4
            }
        };
    }

    // Additional helper methods for evidence analysis
    analyzeAxePassConfidence(pass) {
        return {
            rule_reliability: pass.id ? 'high' : 'medium',
            element_coverage: (pass.nodes || []).length > 0 ? 'specific' : 'general',
            test_depth: 'dom_analysis'
        };
    }

    getWCAGComplianceIndicators(wcagCriterion, passDetails) {
        return {
            criterion_tested: wcagCriterion,
            compliance_level: this.determineComplianceLevel(wcagCriterion),
            automated_coverage: passDetails.length > 0 ? 'comprehensive' : 'basic'
        };
    }

    determineComplianceLevel(wcagCriterion) {
        const aaaCriteria = ['2.4.9', '2.4.10', '3.2.5', '3.3.6'];
        return aaaCriteria.includes(wcagCriterion) ? 'AAA' : 'AA';
    }

    assessEvidenceCompleteness(evidence) {
        let score = 0;
        if (evidence.test_execution) score += 0.3;
        if (evidence.pass_evidence || evidence.fail_evidence) score += 0.4;
        if (evidence.review_indicators) score += 0.3;
        return score >= 0.8 ? 'complete' : score >= 0.5 ? 'partial' : 'minimal';
    }

    assessDataIntegrity(evidence) {
        // Check for required fields and data consistency
        const hasRequiredFields = evidence.evidence_type && evidence.tool_result && evidence.confidence_level;
        return hasRequiredFields ? 'high' : 'medium';
    }

    assessExtractionConfidence(evidence) {
        // Confidence in the extraction process itself
        if (evidence.evidence_type === 'automated_pass' && evidence.pass_evidence?.detailed_findings?.length > 0) {
            return 'high';
        }
        if (evidence.evidence_type === 'automated_fail' && evidence.fail_evidence?.violations_found?.length > 0) {
            return 'high';
        }
        return 'medium';
    }
}

module.exports = AutomatedEvidenceService; 
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Professional HTML Report Generator for Multi-Tool Accessibility Testing
 * Generates comprehensive HTML reports from consolidated accessibility data
 */

class HTMLReportGenerator {
    constructor() {
        this.reportsDir = path.join(__dirname, '../reports');
        this.templatePath = path.join(__dirname, 'templates');
        this.timestamp = new Date().toISOString();
    }

    /**
     * Generate HTML report from consolidated data
     */
    async generateHTMLReport(consolidatedData, outputFileName = null) {
        console.log('📄 Generating professional HTML accessibility report...');

        try {
            // Ensure templates directory exists
            if (!fs.existsSync(this.templatePath)) {
                fs.mkdirSync(this.templatePath, { recursive: true });
            }

            // Generate the complete HTML report
            const htmlContent = this.buildHTMLReport(consolidatedData);
            
            // Save the report
            const fileName = outputFileName || `accessibility-report-${this.timestamp.replace(/[:.]/g, '-')}.html`;
            const filePath = path.join(this.reportsDir, fileName);
            
            fs.writeFileSync(filePath, htmlContent, 'utf8');
            
            // Also save as latest report
            const latestPath = path.join(this.reportsDir, 'latest-accessibility-report.html');
            fs.writeFileSync(latestPath, htmlContent, 'utf8');
            
            console.log(`✅ HTML report generated: ${fileName}`);
            console.log(`📊 Report includes ${consolidatedData.summary.totalViolations} violations from ${consolidatedData.metadata.tools.length} tools`);
            
            return filePath;

        } catch (error) {
            console.error('❌ Error generating HTML report:', error.message);
            throw error;
        }
    }

    /**
     * Build complete HTML report content
     */
    buildHTMLReport(data) {
        const { metadata, summary, violations, toolResults } = data;
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Tool Accessibility Assessment Report</title>
    ${this.getReportCSS()}
</head>
<body>
    <div class="container">
        ${this.generateHeader(metadata, summary)}
        ${this.generateExecutiveSummary(metadata, summary)}
        ${this.generateToolCoverage(summary.toolsCoverage)}
        ${this.generateViolationsByCategory(violations)}
        ${this.generateToolSpecificResults(toolResults)}
        ${this.generateRecommendations(violations)}
        ${this.generateAppendix(metadata)}
    </div>
    ${this.getReportJavaScript()}
</body>
</html>`;
    }

    /**
     * Generate report header
     */
    generateHeader(metadata, summary) {
        const testDate = new Date(metadata.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
        <header class="report-header">
            <div class="header-content">
                <h1>Multi-Tool Accessibility Assessment Report</h1>
                <div class="header-meta">
                    <div class="meta-item">
                        <strong>Test Date:</strong> ${testDate}
                    </div>
                    <div class="meta-item">
                        <strong>Testing Tools:</strong> ${metadata.tools.join(', ')}
                    </div>
                    <div class="meta-item">
                        <strong>WCAG Version:</strong> ${metadata.wcagVersion}
                    </div>
                    <div class="meta-item">
                        <strong>Test URL:</strong> <a href="${metadata.testUrl}" target="_blank">${metadata.testUrl}</a>
                    </div>
                </div>
            </div>
            <div class="summary-stats">
                <div class="stat-card critical">
                    <div class="stat-number">${summary.criticalIssues}</div>
                    <div class="stat-label">Critical Issues</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-number">${summary.warnings || 0}</div>
                    <div class="stat-label">Warnings</div>
                </div>
                <div class="stat-card info">
                    <div class="stat-number">${summary.contrastIssues || 0}</div>
                    <div class="stat-label">Contrast Issues</div>
                </div>
                <div class="stat-card total">
                    <div class="stat-number">${summary.totalViolations}</div>
                    <div class="stat-label">Total Violations</div>
                </div>
            </div>
        </header>`;
    }

    /**
     * Generate executive summary section
     */
    generateExecutiveSummary(metadata, summary) {
        const automatedCoverage = 45; // Estimated coverage from all 4 tools
        const manualRequired = 100 - automatedCoverage;

        return `
        <section class="executive-summary">
            <h2>Executive Summary</h2>
            <div class="summary-content">
                <div class="summary-text">
                    <p>This comprehensive accessibility assessment was conducted using ${metadata.tools.length} automated testing tools to evaluate WCAG ${metadata.wcagVersion} Level AA/AAA compliance. The automated testing provides approximately <strong>${automatedCoverage}% coverage</strong> of WCAG success criteria, with the remaining <strong>${manualRequired}%</strong> requiring manual verification.</p>
                    
                    <div class="key-findings">
                        <h3>Key Findings</h3>
                        <ul>
                            <li><strong>${summary.totalViolations} total violations</strong> were detected across all testing tools</li>
                            <li><strong>${summary.criticalIssues} critical issues</strong> require immediate attention</li>
                            <li><strong>${summary.warnings || 0} warnings</strong> indicate potential accessibility barriers</li>
                            <li><strong>${summary.contrastIssues || 0} color contrast failures</strong> affect text readability</li>
                        </ul>
                    </div>
                    
                    <div class="compliance-status">
                        <h3>Compliance Status</h3>
                        <div class="status-indicator ${summary.criticalIssues > 0 ? 'non-compliant' : summary.totalViolations > 0 ? 'partial' : 'compliant'}">
                            ${summary.criticalIssues > 0 ? 'Non-Compliant' : summary.totalViolations > 0 ? 'Partially Compliant' : 'Compliant'}
                        </div>
                        <p class="status-description">
                            ${summary.criticalIssues > 0 
                                ? 'Critical accessibility barriers detected that prevent users with disabilities from accessing content.'
                                : summary.totalViolations > 0 
                                ? 'Some accessibility issues detected that may impact user experience but do not constitute complete barriers.'
                                : 'No automated accessibility violations detected. Manual testing still required for full compliance verification.'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </section>`;
    }

    /**
     * Generate tool coverage analysis
     */
    generateToolCoverage(toolsCoverage) {
        const toolDescriptions = {
            'axe-core': 'Industry-standard accessibility testing engine with comprehensive rule coverage',
            'pa11y': 'Command-line accessibility testing tool based on HTML CodeSniffer',
            'lighthouse': 'Google\'s automated testing tool for web page quality including accessibility',
            'ibm-equal-access': 'Enterprise-grade accessibility checker with advanced rule sets'
        };

        return `
        <section class="tool-coverage">
            <h2>Testing Tool Coverage Analysis</h2>
            <div class="coverage-grid">
                ${Object.entries(toolsCoverage).map(([tool, count]) => `
                    <div class="coverage-card">
                        <h3>${tool}</h3>
                        <div class="coverage-stats">
                            <div class="violations-count">${count}</div>
                            <div class="violations-label">violations detected</div>
                        </div>
                        <p class="tool-description">${toolDescriptions[tool] || 'Accessibility testing tool'}</p>
                    </div>
                `).join('')}
            </div>
            <div class="coverage-explanation">
                <h3>Multi-Tool Approach Benefits</h3>
                <ul>
                    <li><strong>Comprehensive Coverage:</strong> Different tools detect different types of violations</li>
                    <li><strong>Reduced False Positives:</strong> Cross-validation increases confidence in results</li>
                    <li><strong>Rule Set Diversity:</strong> Each tool implements unique accessibility rules and heuristics</li>
                    <li><strong>Enterprise Compliance:</strong> Combination ensures coverage of various accessibility standards</li>
                </ul>
            </div>
        </section>`;
    }

    /**
     * Generate violations by category
     */
    generateViolationsByCategory(violations) {
        if (!violations || violations.length === 0) {
            return `
            <section class="violations-section">
                <h2>Accessibility Violations</h2>
                <div class="no-violations">
                    <div class="success-icon">✅</div>
                    <h3>No Violations Detected</h3>
                    <p>The automated testing tools did not detect any accessibility violations. However, manual testing is still required to ensure complete WCAG compliance.</p>
                </div>
            </section>`;
        }

        // Categorize violations by severity
        const critical = violations.filter(v => 
            v.severity === 'critical' || 
            v.impact === 'critical' || 
            v.impact === 'serious' || 
            v.type === 'error'
        );
        
        const warnings = violations.filter(v => 
            v.severity === 'warning' || 
            v.impact === 'moderate' || 
            v.type === 'warning'
        );
        
        const info = violations.filter(v => 
            v.severity === 'info' || 
            v.impact === 'minor' || 
            v.type === 'notice'
        );

        return `
        <section class="violations-section">
            <h2>Accessibility Violations</h2>
            
            ${critical.length > 0 ? `
            <div class="violation-category critical">
                <h3>🔴 Critical Issues (${critical.length})</h3>
                <p class="category-description">These issues create significant barriers for users with disabilities and must be fixed immediately.</p>
                <div class="violations-list">
                    ${critical.map((violation, index) => this.generateViolationCard(violation, index, 'critical')).join('')}
                </div>
            </div>` : ''}
            
            ${warnings.length > 0 ? `
            <div class="violation-category warning">
                <h3>🟡 Warnings (${warnings.length})</h3>
                <p class="category-description">These issues may impact accessibility and should be reviewed and addressed.</p>
                <div class="violations-list">
                    ${warnings.slice(0, 10).map((violation, index) => this.generateViolationCard(violation, index, 'warning')).join('')}
                    ${warnings.length > 10 ? `<p class="more-items">... and ${warnings.length - 10} more warnings</p>` : ''}
                </div>
            </div>` : ''}
            
            ${info.length > 0 ? `
            <div class="violation-category info">
                <h3>ℹ️ Informational (${info.length})</h3>
                <p class="category-description">These are recommendations for improving accessibility.</p>
                <div class="violations-list">
                    ${info.slice(0, 5).map((violation, index) => this.generateViolationCard(violation, index, 'info')).join('')}
                    ${info.length > 5 ? `<p class="more-items">... and ${info.length - 5} more informational items</p>` : ''}
                </div>
            </div>` : ''}
        </section>`;
    }

    /**
     * Generate individual violation card
     */
    generateViolationCard(violation, index, category) {
        const detectedBy = violation.detectedBy ? violation.detectedBy.join(', ') : violation.tool || 'Unknown';
        const confidence = violation.confidence ? Math.round(violation.confidence * 100) + '%' : 'High';
        
        return `
        <div class="violation-card ${category}">
            <div class="violation-header">
                <h4>${violation.id || violation.message || 'Accessibility Issue'}</h4>
                <div class="violation-meta">
                    <span class="detected-by">Detected by: ${detectedBy}</span>
                    <span class="confidence">Confidence: ${confidence}</span>
                </div>
            </div>
            
            <div class="violation-content">
                <p class="violation-description">${violation.description || violation.message || 'No description available'}</p>
                
                ${violation.xpath ? `
                <div class="xpath-section">
                    <strong>Element Location:</strong>
                    <code class="xpath">${violation.xpath}</code>
                </div>` : ''}
                
                ${violation.wcagCriteria && violation.wcagCriteria.length > 0 ? `
                <div class="wcag-section">
                    <strong>WCAG Criteria:</strong> ${violation.wcagCriteria.join(', ')}
                </div>` : ''}
                
                ${violation.help ? `
                <div class="help-section">
                    <strong>How to Fix:</strong>
                    <p>${violation.help}</p>
                </div>` : ''}
                
                ${violation.helpUrl ? `
                <div class="help-link">
                    <a href="${violation.helpUrl}" target="_blank" rel="noopener">Learn More →</a>
                </div>` : ''}
            </div>
        </div>`;
    }

    /**
     * Generate tool-specific results section
     */
    generateToolSpecificResults(toolResults) {
        return `
        <section class="tool-results">
            <h2>Tool-Specific Results</h2>
            <div class="tool-tabs">
                ${Object.keys(toolResults).map((tool, index) => `
                    <button class="tab-button ${index === 0 ? 'active' : ''}" onclick="showToolTab('${tool}')">${tool}</button>
                `).join('')}
            </div>
            
            ${Object.entries(toolResults).map(([tool, results], index) => `
                <div id="tool-${tool}" class="tool-content ${index === 0 ? 'active' : ''}">
                    <h3>${tool} Results</h3>
                    ${this.generateToolSpecificContent(tool, results)}
                </div>
            `).join('')}
        </section>`;
    }

    /**
     * Generate content for specific tool results
     */
    generateToolSpecificContent(tool, results) {
        // Handle different result structures from different tools
        if (tool === 'axe' && results.violations) {
            return `
                <div class="tool-summary">
                    <p><strong>Violations:</strong> ${results.violations.length}</p>
                    <p><strong>Passes:</strong> ${results.passes ? results.passes.length : 'Unknown'}</p>
                    <p><strong>Incomplete:</strong> ${results.incomplete ? results.incomplete.length : 'Unknown'}</p>
                </div>`;
        } else if (tool === 'pa11y' && results.issues) {
            return `
                <div class="tool-summary">
                    <p><strong>Issues Found:</strong> ${results.issues.length}</p>
                    <p><strong>Standard:</strong> WCAG2AA</p>
                </div>`;
        } else if (tool === 'lighthouse' && results.score !== undefined) {
            return `
                <div class="tool-summary">
                    <p><strong>Accessibility Score:</strong> ${Math.round(results.score * 100)}/100</p>
                    <p><strong>Audits:</strong> ${results.audits ? Object.keys(results.audits).length : 'Unknown'}</p>
                </div>`;
        } else if (tool === 'ibm' && results.results) {
            return `
                <div class="tool-summary">
                    <p><strong>Results:</strong> ${results.results.length}</p>
                    <p><strong>Enterprise Rules:</strong> Applied</p>
                </div>`;
        }
        
        return `<p>Raw results available in JSON format.</p>`;
    }

    /**
     * Generate recommendations section
     */
    generateRecommendations(violations) {
        const criticalCount = violations.filter(v => 
            v.severity === 'critical' || v.impact === 'critical' || v.impact === 'serious' || v.type === 'error'
        ).length;

        return `
        <section class="recommendations">
            <h2>Recommendations & Next Steps</h2>
            
            <div class="priority-actions">
                <h3>Immediate Actions Required</h3>
                <ol>
                    ${criticalCount > 0 ? `<li><strong>Fix ${criticalCount} critical accessibility issues</strong> - These create barriers for users with disabilities</li>` : ''}
                    <li><strong>Conduct manual accessibility testing</strong> - Automated tools cover ~45% of WCAG criteria</li>
                    <li><strong>Test with screen readers</strong> - NVDA, JAWS, and VoiceOver testing required</li>
                    <li><strong>Validate keyboard navigation</strong> - Ensure all functionality is keyboard accessible</li>
                    <li><strong>Test on mobile devices</strong> - Verify accessibility with mobile assistive technologies</li>
                </ol>
            </div>
            
            <div class="testing-strategy">
                <h3>Comprehensive Testing Strategy</h3>
                <div class="strategy-grid">
                    <div class="strategy-card">
                        <h4>🤖 Automated Testing (45% coverage)</h4>
                        <ul>
                            <li>Run all 4 tools regularly</li>
                            <li>Integrate into CI/CD pipeline</li>
                            <li>Monitor for regressions</li>
                        </ul>
                    </div>
                    <div class="strategy-card">
                        <h4>👤 Manual Testing (55% coverage)</h4>
                        <ul>
                            <li>Keyboard navigation testing</li>
                            <li>Screen reader compatibility</li>
                            <li>Mobile accessibility verification</li>
                            <li>Form validation and error handling</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="effort-estimate">
                <h3>Estimated Effort</h3>
                <div class="effort-breakdown">
                    <div class="effort-item">
                        <strong>Critical Issue Fixes:</strong> ${Math.max(criticalCount * 0.5, 1)}-${criticalCount * 2} hours
                    </div>
                    <div class="effort-item">
                        <strong>Manual Testing:</strong> 8-12 hours
                    </div>
                    <div class="effort-item">
                        <strong>Total Estimated Effort:</strong> ${Math.max(criticalCount * 0.5 + 8, 9)}-${criticalCount * 2 + 12} hours
                    </div>
                </div>
            </div>
        </section>`;
    }

    /**
     * Generate appendix section
     */
    generateAppendix(metadata) {
        return `
        <section class="appendix">
            <h2>Appendix</h2>
            
            <div class="appendix-content">
                <h3>Testing Methodology</h3>
                <p>This assessment was conducted using a multi-tool approach combining ${metadata.tools.length} industry-standard accessibility testing tools. Each tool provides unique capabilities and rule sets, ensuring comprehensive coverage of WCAG ${metadata.wcagVersion} success criteria.</p>
                
                <h3>Tool Versions & Configuration</h3>
                <ul>
                    <li><strong>axe-core:</strong> Latest version with WCAG 2.2 AA/AAA rules enabled</li>
                    <li><strong>Pa11y:</strong> WCAG2AA standard with comprehensive rule set</li>
                    <li><strong>Lighthouse:</strong> Accessibility audit with performance correlation</li>
                    <li><strong>IBM Equal Access:</strong> Enterprise-grade rule sets for Section 508 compliance</li>
                </ul>
                
                <h3>Limitations</h3>
                <ul>
                    <li>Automated testing provides approximately 45% coverage of WCAG 2.2 Level AA criteria</li>
                    <li>Manual testing is required for complete accessibility compliance verification</li>
                    <li>Dynamic content and user interactions require specialized testing approaches</li>
                    <li>Screen reader compatibility must be verified with actual assistive technologies</li>
                </ul>
                
                <h3>Standards Reference</h3>
                <ul>
                    <li><a href="https://www.w3.org/WAI/WCAG22/quickref/" target="_blank">WCAG 2.2 Quick Reference</a></li>
                    <li><a href="https://www.section508.gov/" target="_blank">Section 508 Guidelines</a></li>
                    <li><a href="https://www.w3.org/WAI/test-evaluate/" target="_blank">W3C Accessibility Testing Guidelines</a></li>
                </ul>
            </div>
        </section>
        
        <footer class="report-footer">
            <p>Generated on ${new Date(metadata.timestamp).toLocaleString()} by Multi-Tool Accessibility Assessment Platform</p>
            <p>For questions about this report, please contact your accessibility team.</p>
        </footer>`;
    }

    /**
     * Get CSS styles for the report
     */
    getReportCSS() {
        return `
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                background: #f8f9fa;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            
            .report-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 2rem;
            }
            
            .header-content h1 {
                font-size: 2.5rem;
                margin-bottom: 1rem;
            }
            
            .header-meta {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .meta-item {
                background: rgba(255,255,255,0.1);
                padding: 0.5rem 1rem;
                border-radius: 6px;
            }
            
            .meta-item a {
                color: white;
                text-decoration: underline;
            }
            
            .summary-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 1rem;
            }
            
            .stat-card {
                background: rgba(255,255,255,0.9);
                color: #333;
                padding: 1.5rem;
                border-radius: 8px;
                text-align: center;
            }
            
            .stat-number {
                font-size: 2.5rem;
                font-weight: bold;
                margin-bottom: 0.5rem;
            }
            
            .stat-card.critical .stat-number { color: #dc3545; }
            .stat-card.warning .stat-number { color: #ffc107; }
            .stat-card.info .stat-number { color: #17a2b8; }
            .stat-card.total .stat-number { color: #667eea; }
            
            section {
                padding: 2rem;
                border-bottom: 1px solid #eee;
            }
            
            h2 {
                color: #667eea;
                margin-bottom: 1.5rem;
                font-size: 1.8rem;
            }
            
            h3 {
                color: #333;
                margin-bottom: 1rem;
                font-size: 1.3rem;
            }
            
            .compliance-status {
                margin-top: 2rem;
            }
            
            .status-indicator {
                display: inline-block;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-weight: bold;
                margin-bottom: 1rem;
            }
            
            .status-indicator.compliant {
                background: #d4edda;
                color: #155724;
            }
            
            .status-indicator.partial {
                background: #fff3cd;
                color: #856404;
            }
            
            .status-indicator.non-compliant {
                background: #f8d7da;
                color: #721c24;
            }
            
            .coverage-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }
            
            .coverage-card {
                background: #f8f9ff;
                padding: 1.5rem;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }
            
            .violations-count {
                font-size: 2rem;
                font-weight: bold;
                color: #667eea;
            }
            
            .violation-category {
                margin-bottom: 2rem;
            }
            
            .violation-category h3 {
                padding: 1rem;
                border-radius: 8px 8px 0 0;
                margin-bottom: 0;
            }
            
            .violation-category.critical h3 {
                background: #f8d7da;
                color: #721c24;
            }
            
            .violation-category.warning h3 {
                background: #fff3cd;
                color: #856404;
            }
            
            .violation-category.info h3 {
                background: #d1ecf1;
                color: #0c5460;
            }
            
            .category-description {
                background: #f8f9fa;
                padding: 1rem;
                margin: 0;
                border-left: 4px solid #dee2e6;
            }
            
            .violations-list {
                background: white;
                border: 1px solid #dee2e6;
                border-top: none;
            }
            
            .violation-card {
                padding: 1.5rem;
                border-bottom: 1px solid #eee;
            }
            
            .violation-card:last-child {
                border-bottom: none;
            }
            
            .violation-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1rem;
            }
            
            .violation-meta {
                font-size: 0.9rem;
                color: #666;
            }
            
            .violation-meta span {
                display: block;
                margin-bottom: 0.25rem;
            }
            
            .xpath {
                background: #f8f9fa;
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
                word-break: break-all;
            }
            
            .help-section {
                background: #e7f3ff;
                padding: 1rem;
                border-radius: 6px;
                margin-top: 1rem;
            }
            
            .help-link {
                margin-top: 1rem;
            }
            
            .help-link a {
                color: #667eea;
                text-decoration: none;
                font-weight: 600;
            }
            
            .tool-tabs {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 1rem;
            }
            
            .tab-button {
                padding: 0.75rem 1.5rem;
                border: 1px solid #dee2e6;
                background: #f8f9fa;
                cursor: pointer;
                border-radius: 6px 6px 0 0;
            }
            
            .tab-button.active {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            .tool-content {
                display: none;
                background: white;
                border: 1px solid #dee2e6;
                padding: 1.5rem;
                border-radius: 0 6px 6px 6px;
            }
            
            .tool-content.active {
                display: block;
            }
            
            .strategy-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }
            
            .strategy-card {
                background: #f8f9ff;
                padding: 1.5rem;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }
            
            .effort-breakdown {
                background: #f8f9fa;
                padding: 1.5rem;
                border-radius: 8px;
            }
            
            .effort-item {
                margin-bottom: 0.5rem;
            }
            
            .no-violations {
                text-align: center;
                padding: 3rem;
                background: #d4edda;
                border-radius: 8px;
            }
            
            .success-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .report-footer {
                background: #f8f9fa;
                padding: 2rem;
                text-align: center;
                color: #666;
                border-top: 1px solid #dee2e6;
            }
            
            @media print {
                body { background: white; }
                .container { box-shadow: none; }
                .tool-content { display: block !important; }
                .tab-button { display: none; }
            }
        </style>`;
    }

    /**
     * Get JavaScript for interactive features
     */
    getReportJavaScript() {
        return `
        <script>
            function showToolTab(toolName) {
                // Hide all tool content
                document.querySelectorAll('.tool-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Remove active class from all tab buttons
                document.querySelectorAll('.tab-button').forEach(button => {
                    button.classList.remove('active');
                });
                
                // Show selected tool content
                document.getElementById('tool-' + toolName).classList.add('active');
                
                // Add active class to clicked button
                event.target.classList.add('active');
            }
            
            // Print functionality
            function printReport() {
                window.print();
            }
            
            // Add print button if needed
            document.addEventListener('DOMContentLoaded', function() {
                const header = document.querySelector('.report-header');
                if (header) {
                    const printBtn = document.createElement('button');
                    printBtn.textContent = '🖨️ Print Report';
                    printBtn.onclick = printReport;
                    printBtn.style.cssText = 'position: absolute; top: 1rem; right: 2rem; padding: 0.5rem 1rem; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 6px; cursor: pointer;';
                    header.style.position = 'relative';
                    header.appendChild(printBtn);
                }
            });
        </script>`;
    }
}

// Export for use in other modules
module.exports = HTMLReportGenerator;

// Run directly if called from command line
if (require.main === module) {
    const generator = new HTMLReportGenerator();
    
    // Check for consolidated report to generate HTML from
    const reportsDir = path.join(__dirname, '../reports');
    const latestReportPath = path.join(reportsDir, 'latest-consolidated-report.json');
    
    if (fs.existsSync(latestReportPath)) {
        try {
            const consolidatedData = JSON.parse(fs.readFileSync(latestReportPath, 'utf8'));
            generator.generateHTMLReport(consolidatedData);
        } catch (error) {
            console.error('❌ Error reading consolidated report:', error.message);
            console.log('💡 Run "npm run a11y:generate-report" first to create consolidated data');
        }
    } else {
        console.log('ℹ️  No consolidated report found. Run "npm run a11y:generate-report" first.');
        console.log('📝 Creating sample HTML report structure...');
        
        // Create sample data for demonstration
        const sampleData = {
            metadata: {
                timestamp: new Date().toISOString(),
                tools: ['axe-core', 'pa11y', 'lighthouse', 'ibm-equal-access'],
                wcagVersion: '2.2',
                testUrl: 'http://localhost:3000'
            },
            summary: {
                totalViolations: 0,
                criticalIssues: 0,
                warnings: 0,
                contrastIssues: 0,
                toolsCoverage: {
                    'axe-core': 0,
                    'pa11y': 0,
                    'lighthouse': 0,
                    'ibm-equal-access': 0
                }
            },
            violations: [],
            toolResults: {
                axe: { violations: [], passes: [], incomplete: [] },
                pa11y: { issues: [] },
                lighthouse: { audits: {}, score: 1 },
                ibm: { results: [] }
            }
        };
        
        generator.generateHTMLReport(sampleData, 'sample-accessibility-report.html');
    }
}
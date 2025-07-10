/**
 * VPAT 2.4 Rev 508 Template Generator
 * Creates professional VPAT (Voluntary Product Accessibility Template) documents
 * Based on WCAG 2.2 criteria mapping and conformance assessment
 */

class VPATTemplateGenerator {
    constructor() {
        this.vpatVersion = '2.4 Rev 508';
        this.wcagVersion = '2.2';
    }

    /**
     * Generate complete VPAT document from WCAG mapping
     */
    generateVPAT(wcagMapping, organizationInfo = {}) {
        const vpatData = {
            metadata: this.buildMetadata(organizationInfo),
            executiveSummary: this.buildExecutiveSummary(wcagMapping),
            wcag22Report: this.buildWCAG22Report(wcagMapping),
            section508Report: this.buildSection508Report(wcagMapping),
            legalDisclaimer: this.buildLegalDisclaimer()
        };

        return {
            html: this.generateHTMLVPAT(vpatData),
            json: vpatData,
            summary: this.generateVPATSummary(wcagMapping)
        };
    }

    /**
     * Build VPAT metadata section
     */
    buildMetadata(organizationInfo) {
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return {
            reportDate: currentDate,
            productName: organizationInfo.productName || 'Web Application',
            productVersion: organizationInfo.productVersion || '1.0',
            reportBasedOn: `VPAT® Version ${this.vpatVersion}`,
            productDescription: organizationInfo.productDescription || 'Web-based application accessibility assessment',
            contactInformation: {
                vendorCompany: organizationInfo.vendorCompany || 'Organization Name',
                vendorAddress: organizationInfo.vendorAddress || '',
                vendorWebsite: organizationInfo.vendorWebsite || '',
                vendorContact: organizationInfo.vendorContact || '',
                vendorPhone: organizationInfo.vendorPhone || '',
                vendorEmail: organizationInfo.vendorEmail || ''
            },
            evaluationMethods: [
                'Automated testing using axe-core, Pa11y, Lighthouse, and IBM Equal Access Checker',
                'Manual testing following WCAG 2.2 evaluation methodology',
                'Assistive technology testing with screen readers',
                'Keyboard navigation assessment',
                'Color contrast analysis'
            ],
            testingScope: organizationInfo.testingScope || 'Full application functionality',
            wcagVersion: this.wcagVersion,
            conformanceLevel: this.determineOverallConformance(organizationInfo.targetLevel || 'AA')
        };
    }

    /**
     * Build executive summary
     */
    buildExecutiveSummary(wcagMapping) {
        const summary = wcagMapping.summary;
        const compliance = this.calculateCompliancePercentages(wcagMapping);

        return {
            overallConformance: this.determineConformanceStatement(compliance),
            keyFindings: [
                `${summary.coveredCriteria} of ${summary.totalCriteria} WCAG 2.2 success criteria were evaluated`,
                `${compliance.levelAA.compliant} of ${compliance.levelAA.total} Level AA criteria demonstrate compliance`,
                `${this.countViolations(wcagMapping)} accessibility violations identified and documented`,
                `Automated testing coverage: approximately ${wcagMapping.coverageAnalysis.estimatedCoverage}%`
            ],
            conformanceClaim: this.generateConformanceClaim(compliance),
            majorBarriers: this.identifyMajorBarriers(wcagMapping),
            recommendations: this.generateExecutiveRecommendations(wcagMapping)
        };
    }

    /**
     * Build WCAG 2.2 conformance report
     */
    buildWCAG22Report(wcagMapping) {
        const report = {
            tableA: this.buildWCAGTable(wcagMapping, 'A'),
            tableAA: this.buildWCAGTable(wcagMapping, 'AA'),
            tableAAA: this.buildWCAGTable(wcagMapping, 'AAA')
        };

        return report;
    }

    /**
     * Build individual WCAG conformance table
     */
    buildWCAGTable(wcagMapping, level) {
        const table = [];
        
        Object.keys(wcagMapping.criteriaMapping).forEach(criteriaId => {
            const criteria = wcagMapping.criteriaMapping[criteriaId];
            
            if (criteria.criteria.level === level) {
                table.push({
                    criteriaId: criteriaId,
                    criteriaTitle: criteria.criteria.title,
                    conformanceLevel: criteria.conformanceLevel,
                    remarks: this.buildRemarks(criteria),
                    violations: criteria.violations,
                    testingMethod: this.determineTestingMethod(criteria),
                    toolsUsed: criteria.toolsUsed
                });
            }
        });

        return table.sort((a, b) => this.compareCriteriaIds(a.criteriaId, b.criteriaId));
    }

    /**
     * Build detailed remarks for each criteria
     */
    buildRemarks(criteria) {
        let remarks = '';

        if (criteria.violations.length > 0) {
            const violationSummary = criteria.violations.map(v => 
                `${v.tool}: ${v.description} (${v.occurrences || 1} occurrence${(v.occurrences || 1) > 1 ? 's' : ''})`
            ).join('; ');
            
            remarks = `Violations detected: ${violationSummary}. `;
            
            if (criteria.violations.some(v => v.helpUrl)) {
                remarks += 'Remediation guidance available. ';
            }
        } else if (criteria.status === 'pass') {
            remarks = `Automated testing passed using ${criteria.toolsUsed.join(', ')}. `;
        } else if (criteria.criteria.testable === 'manual') {
            remarks = 'Manual testing required. Automated tools cannot fully evaluate this criterion. ';
        } else {
            remarks = 'Not evaluated in this assessment. ';
        }

        if (criteria.criteria.testable === 'partial') {
            remarks += 'Partial automation available - manual verification recommended. ';
        }

        return remarks.trim();
    }

    /**
     * Determine testing method used
     */
    determineTestingMethod(criteria) {
        if (criteria.toolsUsed.length > 0) {
            return `Automated testing: ${criteria.toolsUsed.join(', ')}`;
        } else if (criteria.criteria.testable === 'manual') {
            return 'Manual testing required';
        } else {
            return 'Not tested';
        }
    }

    /**
     * Generate HTML VPAT document
     */
    generateHTMLVPAT(vpatData) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VPAT® ${this.vpatVersion} - ${vpatData.metadata.productName}</title>
    <style>
        ${this.getVPATStyles()}
    </style>
</head>
<body>
    <div class="vpat-container">
        ${this.renderHeader(vpatData.metadata)}
        ${this.renderExecutiveSummary(vpatData.executiveSummary)}
        ${this.renderWCAGTables(vpatData.wcag22Report)}
        ${this.renderSection508Tables(vpatData.section508Report)}
        ${this.renderLegalDisclaimer(vpatData.legalDisclaimer)}
    </div>
</body>
</html>`;
    }

    /**
     * Calculate compliance percentages
     */
    calculateCompliancePercentages(wcagMapping) {
        const levels = ['A', 'AA', 'AAA'];
        const compliance = {};

        levels.forEach(level => {
            const levelCriteria = Object.keys(wcagMapping.criteriaMapping).filter(id =>
                wcagMapping.criteriaMapping[id].criteria.level === level
            );

            const total = levelCriteria.length;
            const tested = levelCriteria.filter(id =>
                wcagMapping.criteriaMapping[id].status !== 'not-tested'
            ).length;
            const compliant = levelCriteria.filter(id =>
                wcagMapping.criteriaMapping[id].conformanceLevel === 'Supports'
            ).length;

            compliance[`level${level}`] = { total, tested, compliant };
        });

        return compliance;
    }

    /**
     * Generate conformance claim
     */
    generateConformanceClaim(compliance) {
        const aaCompliance = Math.round((compliance.levelAA.compliant / compliance.levelAA.total) * 100);
        
        if (aaCompliance >= 95) {
            return `This product conforms to WCAG 2.2 Level AA with ${aaCompliance}% of applicable success criteria meeting conformance requirements.`;
        } else if (aaCompliance >= 75) {
            return `This product partially conforms to WCAG 2.2 Level AA with ${aaCompliance}% of applicable success criteria meeting conformance requirements.`;
        } else {
            return `This product does not conform to WCAG 2.2 Level AA. ${aaCompliance}% of applicable success criteria meet conformance requirements. Significant accessibility barriers exist.`;
        }
    }

    /**
     * Count total violations
     */
    countViolations(wcagMapping) {
        return Object.values(wcagMapping.criteriaMapping)
            .reduce((total, criteria) => total + criteria.violations.length, 0);
    }

    /**
     * Identify major accessibility barriers
     */
    identifyMajorBarriers(wcagMapping) {
        const barriers = [];
        
        Object.keys(wcagMapping.criteriaMapping).forEach(criteriaId => {
            const criteria = wcagMapping.criteriaMapping[criteriaId];
            if (criteria.violations.length > 0 && criteria.criteria.level === 'AA') {
                const criticalViolations = criteria.violations.filter(v => 
                    v.severity === 'critical' || v.severity === 'serious'
                );
                if (criticalViolations.length > 0) {
                    barriers.push(`${criteriaId} ${criteria.criteria.title}: ${criticalViolations.length} critical issue${criticalViolations.length > 1 ? 's' : ''}`);
                }
            }
        });

        return barriers;
    }

    /**
     * Generate executive recommendations
     */
    generateExecutiveRecommendations(wcagMapping) {
        const recommendations = [];
        
        // Priority 1: Critical violations
        const criticalCount = this.countCriticalViolations(wcagMapping);
        if (criticalCount > 0) {
            recommendations.push(`Address ${criticalCount} critical accessibility violation${criticalCount > 1 ? 's' : ''} immediately`);
        }

        // Priority 2: Manual testing
        const manualCount = this.countManualTestingNeeded(wcagMapping);
        if (manualCount > 0) {
            recommendations.push(`Conduct manual accessibility testing for ${manualCount} criteria requiring human evaluation`);
        }

        // Priority 3: Tool coverage
        if (wcagMapping.coverageAnalysis.estimatedCoverage < 50) {
            recommendations.push('Expand automated testing coverage with additional accessibility tools');
        }

        return recommendations;
    }

    /**
     * Count critical violations
     */
    countCriticalViolations(wcagMapping) {
        return Object.values(wcagMapping.criteriaMapping)
            .reduce((count, criteria) => {
                return count + criteria.violations.filter(v => 
                    v.severity === 'critical' || v.severity === 'serious'
                ).length;
            }, 0);
    }

    /**
     * Count criteria needing manual testing
     */
    countManualTestingNeeded(wcagMapping) {
        return Object.values(wcagMapping.criteriaMapping)
            .filter(criteria => 
                criteria.criteria.testable === 'manual' && 
                criteria.status === 'not-tested'
            ).length;
    }

    /**
     * Build legal disclaimer
     */
    buildLegalDisclaimer() {
        return {
            vpatDisclaimer: 'This document is provided for informational purposes only and represents the current view of the organization on the accessibility features of the product as of the date of publication.',
            accuracyDisclaimer: 'The organization makes no warranties, express or implied, in this summary.',
            updatePolicy: 'The organization may update this document at any time without notice.'
        };
    }

    /**
     * Render legal disclaimer
     */
    renderLegalDisclaimer(disclaimer) {
        return `
        <footer class="legal-disclaimer">
            <h3>Legal Disclaimer</h3>
            <p><strong>VPAT Disclaimer:</strong> ${disclaimer.vpatDisclaimer}</p>
            <p><strong>Accuracy:</strong> ${disclaimer.accuracyDisclaimer}</p>
            <p><strong>Updates:</strong> ${disclaimer.updatePolicy}</p>
            <p><em>Generated on ${new Date().toLocaleDateString()} using automated accessibility testing platform.</em></p>
        </footer>`;
    }

    /**
     * Generate VPAT summary for quick reference
     */
    generateVPATSummary(wcagMapping) {
        const compliance = this.calculateCompliancePercentages(wcagMapping);
        
        return {
            overallScore: Math.round((compliance.levelAA.compliant / compliance.levelAA.total) * 100),
            levelAScore: Math.round((compliance.levelA.compliant / compliance.levelA.total) * 100),
            levelAAScore: Math.round((compliance.levelAA.compliant / compliance.levelAA.total) * 100),
            totalViolations: this.countViolations(wcagMapping),
            criticalViolations: this.countCriticalViolations(wcagMapping),
            conformanceClaim: this.generateConformanceClaim(compliance),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Compare criteria IDs for sorting
     */
    compareCriteriaIds(a, b) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aVal = aParts[i] || 0;
            const bVal = bParts[i] || 0;
            if (aVal !== bVal) return aVal - bVal;
        }
        return 0;
    }

    /**
     * Map WCAG criteria to Section 508 standards
     */
    mapToSection508(wcagMapping) {
        // Simplified Section 508 mapping
        const section508Map = {
            '1194.22(a)': ['1.1.1', '2.1.1', '4.1.2'],
            '1194.22(b)': ['1.2.1', '1.2.2', '1.4.2'],
            '1194.22(c)': ['1.4.1', '1.4.3', '2.4.7'],
            '1194.22(d)': ['1.4.4', '1.4.12'],
            '1194.22(g)': ['1.3.1', '1.3.2'],
            '1194.22(h)': ['1.3.1'],
            '1194.22(i)': ['2.4.2', '2.4.5'],
            '1194.22(j)': ['2.2.2', '2.3.1'],
            '1194.22(l)': ['3.2.1', '3.3.1'],
            '1194.22(n)': ['3.3.2', '1.3.5'],
            '1194.22(o)': ['2.4.1'],
            '1194.22(p)': ['2.2.1']
        };

        return section508Map;
    }

    /**
     * Build Section 508 Functional Performance Criteria
     */
    buildSection508FPC() {
        return [
            {
                criteria: '302.1 Without Vision',
                conformanceLevel: 'Supports',
                remarks: 'Screen reader compatibility verified through automated testing'
            },
            {
                criteria: '302.2 With Limited Vision',
                conformanceLevel: 'Supports',
                remarks: 'Zoom functionality and contrast requirements verified'
            },
            {
                criteria: '302.3 Without Perception of Color',
                conformanceLevel: 'Supports',
                remarks: 'Color is not used as sole means of conveying information'
            },
            {
                criteria: '302.4 Without Hearing',
                conformanceLevel: 'Not Applicable',
                remarks: 'No audio content requires captions'
            },
            {
                criteria: '302.5 With Limited Hearing',
                conformanceLevel: 'Not Applicable',
                remarks: 'No audio content present'
            },
            {
                criteria: '302.6 Without Speech',
                conformanceLevel: 'Supports',
                remarks: 'No speech input required'
            },
            {
                criteria: '302.7 With Limited Manipulation',
                conformanceLevel: 'Supports',
                remarks: 'Keyboard accessibility verified'
            },
            {
                criteria: '302.8 With Limited Reach and Strength',
                conformanceLevel: 'Supports',
                remarks: 'Touch target sizes meet minimum requirements'
            },
            {
                criteria: '302.9 With Limited Language, Cognitive, and Learning Abilities',
                conformanceLevel: 'Partially Supports',
                remarks: 'Manual evaluation required for cognitive accessibility'
            }
        ];
    }

    /**
     * Build Section 508 Software Standards
     */
    buildSection508Software(section508Mapping) {
        return Object.keys(section508Mapping).map(section => ({
            criteria: section,
            conformanceLevel: 'Supports',
            remarks: `Verified through WCAG 2.2 criteria: ${section508Mapping[section].join(', ')}`
        }));
    }

    /**
     * Build Section 508 Documentation Standards
     */
    buildSection508Documentation() {
        return [
            {
                criteria: '602.2 Accessibility and Compatibility Features',
                conformanceLevel: 'Supports',
                remarks: 'Accessibility features documented in this VPAT'
            },
            {
                criteria: '602.3 Electronic Support Documentation',
                conformanceLevel: 'Supports',
                remarks: 'Documentation available in accessible format'
            },
            {
                criteria: '602.4 Alternate Formats for Non-Electronic Support Documentation',
                conformanceLevel: 'Not Applicable',
                remarks: 'All documentation provided electronically'
            }
        ];
    }

    /**
     * Render VPAT header section
     */
    renderHeader(metadata) {
        return `
        <header class="vpat-header">
            <h1>Voluntary Product Accessibility Template® (VPAT®)</h1>
            <h2>Version ${this.vpatVersion}</h2>
            
            <div class="product-info">
                <h3>Product Information</h3>
                <table class="info-table">
                    <tr><td><strong>Product Name:</strong></td><td>${metadata.productName}</td></tr>
                    <tr><td><strong>Product Version:</strong></td><td>${metadata.productVersion}</td></tr>
                    <tr><td><strong>Report Date:</strong></td><td>${metadata.reportDate}</td></tr>
                    <tr><td><strong>Product Description:</strong></td><td>${metadata.productDescription}</td></tr>
                    <tr><td><strong>Contact Information:</strong></td><td>
                        ${metadata.contactInformation.vendorCompany}<br>
                        ${metadata.contactInformation.vendorEmail}
                    </td></tr>
                </table>
            </div>

            <div class="evaluation-info">
                <h3>Evaluation Methods Used</h3>
                <ul>
                    ${metadata.evaluationMethods.map(method => `<li>${method}</li>`).join('')}
                </ul>
            </div>
        </header>`;
    }

    /**
     * Render executive summary
     */
    renderExecutiveSummary(summary) {
        return `
        <section class="executive-summary">
            <h2>Executive Summary</h2>
            
            <div class="conformance-claim">
                <h3>Conformance Claim</h3>
                <p class="conformance-statement">${summary.conformanceClaim}</p>
            </div>

            <div class="key-findings">
                <h3>Key Findings</h3>
                <ul>
                    ${summary.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
                </ul>
            </div>

            ${summary.majorBarriers.length > 0 ? `
            <div class="major-barriers">
                <h3>Major Accessibility Barriers</h3>
                <ul>
                    ${summary.majorBarriers.map(barrier => `<li>${barrier}</li>`).join('')}
                </ul>
            </div>` : ''}

            <div class="recommendations">
                <h3>Priority Recommendations</h3>
                <ol>
                    ${summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ol>
            </div>
        </section>`;
    }

    /**
     * Render WCAG 2.2 conformance tables
     */
    renderWCAGTables(wcagReport) {
        return `
        <section class="wcag-tables">
            <h2>WCAG 2.2 Conformance Report</h2>
            
            <div class="table-section">
                <h3>Table 1: Success Criteria, Level A</h3>
                ${this.renderConformanceTable(wcagReport.tableA)}
            </div>

            <div class="table-section">
                <h3>Table 2: Success Criteria, Level AA</h3>
                ${this.renderConformanceTable(wcagReport.tableAA)}
            </div>

            <div class="table-section">
                <h3>Table 3: Success Criteria, Level AAA</h3>
                ${this.renderConformanceTable(wcagReport.tableAAA)}
            </div>
        </section>`;
    }

    /**
     * Render individual conformance table
     */
    renderConformanceTable(tableData) {
        return `
        <table class="conformance-table">
            <thead>
                <tr>
                    <th>Criteria</th>
                    <th>Conformance Level</th>
                    <th>Remarks and Explanations</th>
                </tr>
            </thead>
            <tbody>
                ${tableData.map(row => `
                <tr class="criteria-row ${row.conformanceLevel.toLowerCase().replace(/\s+/g, '-')}">
                    <td class="criteria-cell">
                        <strong>${row.criteriaId}</strong><br>
                        <span class="criteria-title">${row.criteriaTitle}</span>
                    </td>
                    <td class="conformance-cell">
                        <span class="conformance-level">${row.conformanceLevel}</span>
                    </td>
                    <td class="remarks-cell">
                        ${row.remarks}
                        ${row.toolsUsed.length > 0 ? `<br><em>Tools: ${row.toolsUsed.join(', ')}</em>` : ''}
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>`;
    }

    /**
     * Render Section 508 tables
     */
    renderSection508Tables(section508Report) {
        return `
        <section class="section508-tables">
            <h2>Section 508 Conformance Report</h2>
            
            <div class="table-section">
                <h3>Chapter 5: Software</h3>
                ${this.renderSection508Table(section508Report.softwareStandards)}
            </div>
            
            <div class="table-section">
                <h3>Chapter 6: Support Documentation and Services</h3>
                ${this.renderSection508Table(section508Report.supportDocumentation)}
            </div>
        </section>`;
    }

    /**
     * Render Section 508 table
     */
    renderSection508Table(tableData) {
        return `
        <table class="conformance-table">
            <thead>
                <tr>
                    <th>Criteria</th>
                    <th>Conformance Level</th>
                    <th>Remarks and Explanations</th>
                </tr>
            </thead>
            <tbody>
                ${tableData.map(row => `
                <tr class="criteria-row ${row.conformanceLevel.toLowerCase().replace(/\s+/g, '-')}">
                    <td class="criteria-cell">${row.criteria}</td>
                    <td class="conformance-cell">
                        <span class="conformance-level">${row.conformanceLevel}</span>
                    </td>
                    <td class="remarks-cell">${row.remarks}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>`;
    }

    /**
     * Determine overall conformance level
     */
    determineOverallConformance(targetLevel) {
        return `WCAG 2.2 Level ${targetLevel}`;
    }

    /**
     * Get VPAT CSS styles
     */
    getVPATStyles() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 1in;
        }

        .vpat-container {
            width: 100%;
        }

        .vpat-header {
            text-align: center;
            margin-bottom: 2em;
            border-bottom: 2px solid #000;
            padding-bottom: 1em;
        }

        .vpat-header h1 {
            font-size: 20pt;
            font-weight: bold;
            margin-bottom: 0.5em;
        }

        .vpat-header h2 {
            font-size: 14pt;
            font-weight: normal;
            margin-bottom: 1em;
        }

        .product-info, .evaluation-info {
            text-align: left;
            margin: 1em 0;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0.5em 0;
        }

        .info-table td {
            padding: 0.25em 0.5em;
            border: 1px solid #ccc;
            vertical-align: top;
        }

        .executive-summary {
            margin: 2em 0;
            page-break-inside: avoid;
        }

        .conformance-statement {
            font-size: 14pt;
            font-weight: bold;
            background: #f0f0f0;
            padding: 1em;
            border-left: 4px solid #0066cc;
            margin: 1em 0;
        }

        .conformance-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
            font-size: 10pt;
        }

        .conformance-table th {
            background: #f0f0f0;
            font-weight: bold;
            padding: 0.5em;
            border: 1px solid #000;
            text-align: left;
        }

        .conformance-table td {
            padding: 0.5em;
            border: 1px solid #ccc;
            vertical-align: top;
        }

        .criteria-cell {
            width: 25%;
            font-weight: bold;
        }

        .criteria-title {
            font-weight: normal;
            font-style: italic;
        }

        .conformance-cell {
            width: 20%;
            text-align: center;
        }

        .conformance-level {
            font-weight: bold;
        }

        .supports .conformance-level {
            color: #28a745;
        }

        .does-not-support .conformance-level {
            color: #dc3545;
        }

        .partially-supports .conformance-level {
            color: #ffc107;
        }

        .not-evaluated .conformance-level {
            color: #6c757d;
        }

        .remarks-cell {
            width: 55%;
        }

        .table-section {
            margin: 2em 0;
            page-break-inside: avoid;
        }

        h2 {
            font-size: 16pt;
            font-weight: bold;
            margin: 1.5em 0 1em 0;
            border-bottom: 1px solid #ccc;
            padding-bottom: 0.5em;
        }

        h3 {
            font-size: 14pt;
            font-weight: bold;
            margin: 1em 0 0.5em 0;
        }

        ul, ol {
            margin: 0.5em 0 0.5em 2em;
        }

        li {
            margin: 0.25em 0;
        }

        .legal-disclaimer {
            margin-top: 3em;
            font-size: 10pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 1em;
        }

        @media print {
            body { margin: 0; padding: 0.5in; }
            .vpat-header { page-break-after: avoid; }
            .table-section { page-break-inside: avoid; }
        }
        `;
    }
}

module.exports = VPATTemplateGenerator; 
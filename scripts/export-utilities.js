#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Export Utilities for Multi-Tool Accessibility Reports
 * Handles JSON, XML, and CSV export functionality with metadata
 */

class ExportUtilities {
    constructor() {
        this.reportsDir = path.join(__dirname, '../reports');
        this.timestamp = new Date().toISOString();
    }

    /**
     * Export consolidated report to JSON format
     */
    async exportToJSON(consolidatedData, outputFileName = null) {
        console.log('📄 Exporting accessibility report to JSON format...');

        try {
            // Add export metadata
            const exportData = {
                ...consolidatedData,
                exportMetadata: {
                    exportedAt: this.timestamp,
                    exportFormat: 'JSON',
                    exportVersion: '1.0',
                    generator: 'Multi-Tool Accessibility Assessment Platform'
                }
            };

            // Generate filename
            const fileName = outputFileName || `accessibility-export-${this.timestamp.replace(/[:.]/g, '-')}.json`;
            const filePath = path.join(this.reportsDir, fileName);

            // Write JSON file with pretty formatting
            fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');

            // Also save as latest export
            const latestPath = path.join(this.reportsDir, 'latest-accessibility-export.json');
            fs.writeFileSync(latestPath, JSON.stringify(exportData, null, 2), 'utf8');

            console.log(`✅ JSON export completed: ${fileName}`);
            console.log(`📊 Exported ${exportData.summary.totalViolations} violations with full metadata`);

            return filePath;

        } catch (error) {
            console.error('❌ Error exporting to JSON:', error.message);
            throw error;
        }
    }

    /**
     * Export consolidated report to XML format
     */
    async exportToXML(consolidatedData, outputFileName = null) {
        console.log('📄 Exporting accessibility report to XML format...');

        try {
            // Generate XML content
            const xmlContent = this.buildXMLReport(consolidatedData);

            // Generate filename
            const fileName = outputFileName || `accessibility-export-${this.timestamp.replace(/[:.]/g, '-')}.xml`;
            const filePath = path.join(this.reportsDir, fileName);

            // Write XML file
            fs.writeFileSync(filePath, xmlContent, 'utf8');

            // Also save as latest export
            const latestPath = path.join(this.reportsDir, 'latest-accessibility-export.xml');
            fs.writeFileSync(latestPath, xmlContent, 'utf8');

            console.log(`✅ XML export completed: ${fileName}`);
            console.log(`📊 Exported ${consolidatedData.summary.totalViolations} violations in XML format`);

            return filePath;

        } catch (error) {
            console.error('❌ Error exporting to XML:', error.message);
            throw error;
        }
    }

    /**
     * Export consolidated report to CSV format
     */
    async exportToCSV(consolidatedData, outputFileName = null) {
        console.log('📄 Exporting accessibility report to CSV format...');

        try {
            // Generate CSV content
            const csvContent = this.buildCSVReport(consolidatedData);

            // Generate filename
            const fileName = outputFileName || `accessibility-export-${this.timestamp.replace(/[:.]/g, '-')}.csv`;
            const filePath = path.join(this.reportsDir, fileName);

            // Write CSV file
            fs.writeFileSync(filePath, csvContent, 'utf8');

            // Also save as latest export
            const latestPath = path.join(this.reportsDir, 'latest-accessibility-export.csv');
            fs.writeFileSync(latestPath, csvContent, 'utf8');

            console.log(`✅ CSV export completed: ${fileName}`);
            console.log(`📊 Exported ${consolidatedData.violations.length} violations in CSV format`);

            return filePath;

        } catch (error) {
            console.error('❌ Error exporting to CSV:', error.message);
            throw error;
        }
    }

    /**
     * Export all formats simultaneously
     */
    async exportAllFormats(consolidatedData, baseFileName = null) {
        console.log('🚀 Exporting accessibility report to all formats...');

        const baseTimestamp = this.timestamp.replace(/[:.]/g, '-');
        const baseName = baseFileName || `accessibility-export-${baseTimestamp}`;

        try {
            const results = await Promise.all([
                this.exportToJSON(consolidatedData, `${baseName}.json`),
                this.exportToXML(consolidatedData, `${baseName}.xml`),
                this.exportToCSV(consolidatedData, `${baseName}.csv`)
            ]);

            console.log('✅ All format exports completed successfully!');
            console.log(`📁 Files created: ${results.map(path => path.split('/').pop()).join(', ')}`);

            return results;

        } catch (error) {
            console.error('❌ Error during multi-format export:', error.message);
            throw error;
        }
    }

    /**
     * Build XML report content
     */
    buildXMLReport(data) {
        const { metadata, summary, violations, toolResults } = data;

        return `<?xml version="1.0" encoding="UTF-8"?>
<AccessibilityReport>
    <ExportMetadata>
        <ExportedAt>${this.timestamp}</ExportedAt>
        <ExportFormat>XML</ExportFormat>
        <ExportVersion>1.0</ExportVersion>
        <Generator>Multi-Tool Accessibility Assessment Platform</Generator>
    </ExportMetadata>
    
    <TestMetadata>
        <Timestamp>${metadata.timestamp}</Timestamp>
        <TestUrl>${this.escapeXML(metadata.testUrl)}</TestUrl>
        <WCAGVersion>${metadata.wcagVersion}</WCAGVersion>
        <Tools>
            ${metadata.tools.map(tool => `<Tool>${tool}</Tool>`).join('\n            ')}
        </Tools>
    </TestMetadata>
    
    <Summary>
        <TotalViolations>${summary.totalViolations}</TotalViolations>
        <CriticalIssues>${summary.criticalIssues}</CriticalIssues>
        <Warnings>${summary.warnings || 0}</Warnings>
        <ContrastIssues>${summary.contrastIssues || 0}</ContrastIssues>
        <ToolsCoverage>
            ${Object.entries(summary.toolsCoverage || {}).map(([tool, count]) => 
                `<Tool name="${tool}">${count}</Tool>`
            ).join('\n            ')}
        </ToolsCoverage>
    </Summary>
    
    <Violations>
        ${violations.map((violation, index) => this.buildXMLViolation(violation, index)).join('\n        ')}
    </Violations>
    
    <ToolResults>
        ${Object.entries(toolResults).map(([tool, results]) => 
            this.buildXMLToolResults(tool, results)
        ).join('\n        ')}
    </ToolResults>
</AccessibilityReport>`;
    }

    /**
     * Build XML violation element
     */
    buildXMLViolation(violation, index) {
        return `<Violation id="${index + 1}">
            <RuleId>${this.escapeXML(violation.id || 'Unknown')}</RuleId>
            <Tool>${this.escapeXML(violation.tool || 'Unknown')}</Tool>
            <Severity>${this.escapeXML(violation.severity || violation.impact || violation.type || 'Unknown')}</Severity>
            <Description>${this.escapeXML(violation.description || violation.message || 'No description')}</Description>
            <XPath>${this.escapeXML(violation.xpath || violation.selector || 'Unknown')}</XPath>
            ${violation.wcagCriteria && violation.wcagCriteria.length > 0 ? 
                `<WCAGCriteria>${violation.wcagCriteria.map(criteria => `<Criteria>${criteria}</Criteria>`).join('')}</WCAGCriteria>` : 
                '<WCAGCriteria></WCAGCriteria>'
            }
            ${violation.help ? `<Help>${this.escapeXML(violation.help)}</Help>` : ''}
            ${violation.helpUrl ? `<HelpUrl>${this.escapeXML(violation.helpUrl)}</HelpUrl>` : ''}
            ${violation.detectedBy ? `<DetectedBy>${violation.detectedBy.join(', ')}</DetectedBy>` : ''}
            ${violation.confidence ? `<Confidence>${Math.round(violation.confidence * 100)}%</Confidence>` : ''}
        </Violation>`;
    }

    /**
     * Build XML tool results element
     */
    buildXMLToolResults(tool, results) {
        return `<ToolResult name="${tool}">
            ${tool === 'axe' && results.violations ? `
            <ViolationsCount>${results.violations.length}</ViolationsCount>
            <PassesCount>${results.passes ? results.passes.length : 0}</PassesCount>
            <IncompleteCount>${results.incomplete ? results.incomplete.length : 0}</IncompleteCount>` : ''}
            ${tool === 'pa11y' && results.issues ? `
            <IssuesCount>${results.issues.length}</IssuesCount>` : ''}
            ${tool === 'lighthouse' && results.score !== undefined ? `
            <AccessibilityScore>${Math.round(results.score * 100)}</AccessibilityScore>
            <AuditsCount>${results.audits ? Object.keys(results.audits).length : 0}</AuditsCount>` : ''}
            ${tool === 'ibm' && results.results ? `
            <ResultsCount>${results.results.length}</ResultsCount>` : ''}
        </ToolResult>`;
    }

    /**
     * Build CSV report content
     */
    buildCSVReport(data) {
        const { metadata, violations } = data;

        // CSV Headers
        const headers = [
            'ViolationID',
            'Tool',
            'RuleID',
            'Severity',
            'Description',
            'XPath',
            'WCAGCriteria',
            'Help',
            'HelpURL',
            'DetectedBy',
            'Confidence'
        ];

        // CSV Rows
        const rows = violations.map((violation, index) => [
            index + 1,
            this.escapeCSV(violation.tool || 'Unknown'),
            this.escapeCSV(violation.id || 'Unknown'),
            this.escapeCSV(violation.severity || violation.impact || violation.type || 'Unknown'),
            this.escapeCSV(violation.description || violation.message || 'No description'),
            this.escapeCSV(violation.xpath || violation.selector || 'Unknown'),
            this.escapeCSV(violation.wcagCriteria ? violation.wcagCriteria.join('; ') : ''),
            this.escapeCSV(violation.help || ''),
            this.escapeCSV(violation.helpUrl || ''),
            this.escapeCSV(violation.detectedBy ? violation.detectedBy.join('; ') : violation.tool || ''),
            this.escapeCSV(violation.confidence ? Math.round(violation.confidence * 100) + '%' : 'High')
        ]);

        // Build CSV content
        let csvContent = `# Accessibility Report Export\n`;
        csvContent += `# Generated: ${this.timestamp}\n`;
        csvContent += `# Test URL: ${metadata.testUrl}\n`;
        csvContent += `# WCAG Version: ${metadata.wcagVersion}\n`;
        csvContent += `# Tools Used: ${metadata.tools.join(', ')}\n`;
        csvContent += `# Total Violations: ${violations.length}\n`;
        csvContent += `#\n`;
        csvContent += headers.join(',') + '\n';
        csvContent += rows.map(row => row.join(',')).join('\n');

        return csvContent;
    }

    /**
     * Create summary export with key metrics only
     */
    async exportSummary(consolidatedData, format = 'json') {
        console.log(`📊 Exporting accessibility summary in ${format.toUpperCase()} format...`);

        const summaryData = {
            exportMetadata: {
                exportedAt: this.timestamp,
                exportFormat: format.toUpperCase(),
                exportType: 'SUMMARY',
                generator: 'Multi-Tool Accessibility Assessment Platform'
            },
            testMetadata: {
                timestamp: consolidatedData.metadata.timestamp,
                testUrl: consolidatedData.metadata.testUrl,
                wcagVersion: consolidatedData.metadata.wcagVersion,
                tools: consolidatedData.metadata.tools
            },
            summary: consolidatedData.summary,
            complianceStatus: this.determineComplianceStatus(consolidatedData.summary),
            recommendations: this.generateSummaryRecommendations(consolidatedData.summary)
        };

        const fileName = `accessibility-summary-${this.timestamp.replace(/[:.]/g, '-')}.${format}`;
        const filePath = path.join(this.reportsDir, fileName);

        if (format === 'json') {
            fs.writeFileSync(filePath, JSON.stringify(summaryData, null, 2), 'utf8');
        } else if (format === 'xml') {
            const xmlContent = this.buildSummaryXML(summaryData);
            fs.writeFileSync(filePath, xmlContent, 'utf8');
        }

        console.log(`✅ Summary export completed: ${fileName}`);
        return filePath;
    }

    /**
     * Determine compliance status from summary
     */
    determineComplianceStatus(summary) {
        if (summary.criticalIssues > 0) {
            return {
                status: 'NON_COMPLIANT',
                level: 'CRITICAL',
                description: 'Critical accessibility barriers detected that prevent users with disabilities from accessing content.'
            };
        } else if (summary.totalViolations > 0) {
            return {
                status: 'PARTIALLY_COMPLIANT',
                level: 'WARNING',
                description: 'Some accessibility issues detected that may impact user experience but do not constitute complete barriers.'
            };
        } else {
            return {
                status: 'COMPLIANT',
                level: 'PASS',
                description: 'No automated accessibility violations detected. Manual testing still required for full compliance verification.'
            };
        }
    }

    /**
     * Generate summary recommendations
     */
    generateSummaryRecommendations(summary) {
        const recommendations = [];

        if (summary.criticalIssues > 0) {
            recommendations.push(`Fix ${summary.criticalIssues} critical accessibility issues immediately`);
        }

        if (summary.warnings > 0) {
            recommendations.push(`Review and address ${summary.warnings} warning-level issues`);
        }

        if (summary.contrastIssues > 0) {
            recommendations.push(`Improve color contrast for ${summary.contrastIssues} text elements`);
        }

        recommendations.push('Conduct manual accessibility testing for complete WCAG compliance');
        recommendations.push('Test with screen readers (NVDA, JAWS, VoiceOver)');
        recommendations.push('Validate keyboard navigation functionality');

        return recommendations;
    }

    /**
     * Build summary XML content
     */
    buildSummaryXML(summaryData) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<AccessibilitySummary>
    <ExportMetadata>
        <ExportedAt>${summaryData.exportMetadata.exportedAt}</ExportedAt>
        <ExportFormat>${summaryData.exportMetadata.exportFormat}</ExportFormat>
        <ExportType>${summaryData.exportMetadata.exportType}</ExportType>
        <Generator>${summaryData.exportMetadata.generator}</Generator>
    </ExportMetadata>
    
    <TestMetadata>
        <Timestamp>${summaryData.testMetadata.timestamp}</Timestamp>
        <TestUrl>${this.escapeXML(summaryData.testMetadata.testUrl)}</TestUrl>
        <WCAGVersion>${summaryData.testMetadata.wcagVersion}</WCAGVersion>
        <Tools>
            ${summaryData.testMetadata.tools.map(tool => `<Tool>${tool}</Tool>`).join('\n            ')}
        </Tools>
    </TestMetadata>
    
    <Summary>
        <TotalViolations>${summaryData.summary.totalViolations}</TotalViolations>
        <CriticalIssues>${summaryData.summary.criticalIssues}</CriticalIssues>
        <Warnings>${summaryData.summary.warnings || 0}</Warnings>
        <ContrastIssues>${summaryData.summary.contrastIssues || 0}</ContrastIssues>
    </Summary>
    
    <ComplianceStatus>
        <Status>${summaryData.complianceStatus.status}</Status>
        <Level>${summaryData.complianceStatus.level}</Level>
        <Description>${this.escapeXML(summaryData.complianceStatus.description)}</Description>
    </ComplianceStatus>
    
    <Recommendations>
        ${summaryData.recommendations.map(rec => 
            `<Recommendation>${this.escapeXML(rec)}</Recommendation>`
        ).join('\n        ')}
    </Recommendations>
</AccessibilitySummary>`;
    }

    /**
     * Utility functions for escaping content
     */
    escapeXML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    escapeCSV(str) {
        if (!str) return '';
        const stringValue = str.toString();
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    /**
     * Get export statistics
     */
    getExportStats() {
        const files = fs.readdirSync(this.reportsDir).filter(file => 
            file.includes('accessibility-export') || file.includes('accessibility-summary')
        );

        const stats = {
            totalExports: files.length,
            jsonExports: files.filter(f => f.endsWith('.json')).length,
            xmlExports: files.filter(f => f.endsWith('.xml')).length,
            csvExports: files.filter(f => f.endsWith('.csv')).length,
            summaryExports: files.filter(f => f.includes('summary')).length,
            latestExport: files.sort().pop() || 'None'
        };

        return stats;
    }
}

// Export for use in other modules
module.exports = ExportUtilities;

// Run directly if called from command line
if (require.main === module) {
    const exporter = new ExportUtilities();
    
    // Check for consolidated report to export
    const reportsDir = path.join(__dirname, '../reports');
    const latestReportPath = path.join(reportsDir, 'latest-consolidated-report.json');
    
    if (fs.existsSync(latestReportPath)) {
        try {
            const consolidatedData = JSON.parse(fs.readFileSync(latestReportPath, 'utf8'));
            
            // Export to all formats
            exporter.exportAllFormats(consolidatedData).then(() => {
                // Also create summary exports
                return Promise.all([
                    exporter.exportSummary(consolidatedData, 'json'),
                    exporter.exportSummary(consolidatedData, 'xml')
                ]);
            }).then(() => {
                // Display export statistics
                const stats = exporter.getExportStats();
                console.log('\n📈 Export Statistics:');
                console.log(`Total exports: ${stats.totalExports}`);
                console.log(`JSON: ${stats.jsonExports}, XML: ${stats.xmlExports}, CSV: ${stats.csvExports}`);
                console.log(`Summary exports: ${stats.summaryExports}`);
                console.log(`Latest export: ${stats.latestExport}`);
            });
            
        } catch (error) {
            console.error('❌ Error reading consolidated report:', error.message);
            console.log('💡 Run "npm run a11y:generate-report" first to create consolidated data');
        }
    } else {
        console.log('ℹ️  No consolidated report found. Run "npm run a11y:generate-report" first.');
        console.log('📝 Creating sample export files for demonstration...');
        
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
        
        exporter.exportAllFormats(sampleData, 'sample-accessibility-export').then(() => {
            return Promise.all([
                exporter.exportSummary(sampleData, 'json'),
                exporter.exportSummary(sampleData, 'xml')
            ]);
        }).then(() => {
            const stats = exporter.getExportStats();
            console.log('\n📈 Sample Export Statistics:');
            console.log(`Total exports: ${stats.totalExports}`);
            console.log(`JSON: ${stats.jsonExports}, XML: ${stats.xmlExports}, CSV: ${stats.csvExports}`);
        });
    }
}
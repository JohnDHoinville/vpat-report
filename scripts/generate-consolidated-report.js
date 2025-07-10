#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Unified Accessibility Testing Result Aggregation System
 * Consolidates results from axe-core, Pa11y, Lighthouse, and IBM Equal Access Checker
 */

class AccessibilityReportAggregator {
    constructor() {
        this.reportsDir = path.join(__dirname, '../reports');
        this.timestamp = new Date().toISOString();
        this.consolidatedResults = {
            metadata: {
                timestamp: this.timestamp,
                tools: ['axe-core', 'pa11y', 'lighthouse', 'ibm-equal-access'],
                wcagVersion: '2.2',
                testUrl: 'http://localhost:3000'
            },
            summary: {
                totalViolations: 0,
                criticalIssues: 0,
                warnings: 0,
                contrastIssues: 0,
                toolsCoverage: {}
            },
            violations: [],
            toolResults: {}
        };
    }

    async generateConsolidatedReport() {
        console.log('🔍 Starting accessibility report aggregation...');
        
        try {
            const axeResults = await this.parseAxeResults();
            const pa11yResults = await this.parsePa11yResults();
            const lighthouseResults = await this.parseLighthouseResults();
            const ibmResults = await this.parseIBMResults();

            this.consolidatedResults.toolResults = {
                axe: axeResults,
                pa11y: pa11yResults,
                lighthouse: lighthouseResults,
                ibm: ibmResults
            };

            this.aggregateViolations([axeResults, pa11yResults, lighthouseResults, ibmResults]);
            this.generateSummary();
            await this.saveConsolidatedReport();

            console.log('✅ Consolidated accessibility report generated successfully!');
            console.log(`📊 Total violations found: ${this.consolidatedResults.summary.totalViolations}`);

        } catch (error) {
            console.error('❌ Error generating consolidated report:', error.message);
            process.exit(1);
        }
    }

    async parseAxeResults() {
        const filePath = path.join(this.reportsDir, 'axe-results.json');
        if (!fs.existsSync(filePath)) {
            console.warn('⚠️  axe-core results not found, skipping...');
            return { violations: [], passes: [], incomplete: [] };
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    async parsePa11yResults() {
        const filePath = path.join(this.reportsDir, 'pa11y-results.json');
        if (!fs.existsSync(filePath)) {
            console.warn('⚠️  Pa11y results not found, skipping...');
            return { issues: [] };
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    async parseLighthouseResults() {
        const filePath = path.join(this.reportsDir, 'lighthouse-results.json');
        if (!fs.existsSync(filePath)) {
            console.warn('⚠️  Lighthouse results not found, skipping...');
            return { audits: {}, score: 0 };
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    async parseIBMResults() {
        const filePath = path.join(this.reportsDir, 'ibm-results.json');
        if (!fs.existsSync(filePath)) {
            console.warn('⚠️  IBM Equal Access results not found, skipping...');
            return { results: [] };
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    aggregateViolations(toolResults) {
        const allViolations = [];
        toolResults.forEach(result => {
            if (result.violations) allViolations.push(...result.violations);
            if (result.issues) allViolations.push(...result.issues);
            if (result.results) allViolations.push(...result.results);
        });
        this.consolidatedResults.violations = allViolations;
    }

    generateSummary() {
        const violations = this.consolidatedResults.violations;
        this.consolidatedResults.summary.totalViolations = violations.length;
        this.consolidatedResults.summary.criticalIssues = violations.filter(v => 
            v.impact === 'critical' || v.impact === 'serious' || v.type === 'error'
        ).length;
    }

    async saveConsolidatedReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `consolidated-accessibility-report-${timestamp}.json`;
        const filepath = path.join(this.reportsDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(this.consolidatedResults, null, 2));
        
        const latestPath = path.join(this.reportsDir, 'latest-consolidated-report.json');
        fs.writeFileSync(latestPath, JSON.stringify(this.consolidatedResults, null, 2));
        
        console.log(`📄 Report saved: ${filename}`);
    }
}

if (require.main === module) {
    const aggregator = new AccessibilityReportAggregator();
    aggregator.generateConsolidatedReport();
}

module.exports = AccessibilityReportAggregator;

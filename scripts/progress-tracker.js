#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ReportStorage = require('./report-storage');

/**
 * Progress Tracking and Management Reporting System
 * Tracks accessibility improvements over time and generates progress reports
 */
class ProgressTracker {
    constructor() {
        this.reportsDir = path.join(__dirname, '../reports');
        this.progressDir = path.join(this.reportsDir, 'progress');
        this.storage = new ReportStorage();
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.progressDir)) {
            fs.mkdirSync(this.progressDir, { recursive: true });
        }
    }

    /**
     * Create baseline assessment - capture initial state
     */
    async createBaseline(testUrl, description = 'Initial Assessment') {
        console.log('🎯 Creating accessibility baseline assessment...');

        try {
            const timestamp = new Date().toISOString();
            const baselineData = {
                baselineId: this.generateBaselineId(),
                testUrl,
                description,
                timestamp,
                version: '1.0.0',
                assessment: {
                    totalViolations: 0,
                    criticalIssues: 0,
                    warningIssues: 0,
                    contrastIssues: 0,
                    wcagComplianceScore: 0,
                    toolBreakdown: {},
                    categoryBreakdown: {},
                    pagesCovered: 1
                },
                details: {
                    violations: [],
                    passes: [],
                    incomplete: []
                },
                metadata: {
                    reportingPeriod: 'baseline',
                    nextAssessment: this.calculateNextAssessment(timestamp),
                    teamAssigned: 'Development Team',
                    priorityLevel: 'High'
                }
            };

            // Gather current reports for baseline
            const recentReports = await this.storage.listReports({ 
                limit: 10,
                sortBy: 'timestamp',
                sortOrder: 'desc'
            });

            if (recentReports.length > 0) {
                // Aggregate baseline data from recent reports
                baselineData.assessment = await this.aggregateReportsData(recentReports);
            }

            // Save baseline
            const fileName = `baseline-${baselineData.baselineId}-${timestamp.replace(/[:.]/g, '-')}.json`;
            const filePath = path.join(this.progressDir, fileName);
            
            fs.writeFileSync(filePath, JSON.stringify(baselineData, null, 2), 'utf8');

            // Also save as latest baseline
            const latestPath = path.join(this.progressDir, 'latest-baseline.json');
            fs.writeFileSync(latestPath, JSON.stringify(baselineData, null, 2), 'utf8');

            console.log(`✅ Baseline created: ${fileName}`);
            console.log(`📊 Baseline captures ${baselineData.assessment.totalViolations} total violations`);
            console.log(`🎯 Critical Issues: ${baselineData.assessment.criticalIssues}`);

            return baselineData;

        } catch (error) {
            console.error('❌ Error creating baseline:', error.message);
            throw error;
        }
    }

    /**
     * Generate progress report comparing current state to baseline
     */
    async generateProgressReport(baselineId = null, options = {}) {
        console.log('📈 Generating accessibility progress report...');

        try {
            // Get baseline data
            const baseline = await this.getBaseline(baselineId);
            if (!baseline) {
                throw new Error('No baseline found. Please create a baseline first.');
            }

            // Get current state
            const currentAssessment = await this.getCurrentAssessment();

            // Calculate progress metrics
            const progress = this.calculateProgress(baseline.assessment, currentAssessment);

            // Generate report data
            const progressReport = {
                reportId: this.generateReportId(),
                timestamp: new Date().toISOString(),
                baseline: {
                    id: baseline.baselineId,
                    timestamp: baseline.timestamp,
                    description: baseline.description
                },
                current: currentAssessment,
                progress: progress,
                recommendations: this.generateRecommendations(progress),
                managementSummary: this.generateManagementSummary(progress),
                developmentActions: this.generateDevelopmentActions(progress),
                timeline: this.generateTimeline(baseline, currentAssessment),
                compliance: this.assessCompliance(currentAssessment)
            };

            // Save progress report
            const fileName = `progress-report-${progressReport.reportId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            const filePath = path.join(this.progressDir, fileName);
            
            fs.writeFileSync(filePath, JSON.stringify(progressReport, null, 2), 'utf8');

            // Generate HTML report for management
            const htmlReport = await this.generateHTMLProgressReport(progressReport);
            const htmlFileName = `progress-report-${progressReport.reportId}.html`;
            const htmlPath = path.join(this.progressDir, htmlFileName);
            fs.writeFileSync(htmlPath, htmlReport, 'utf8');

            // Generate CSV for development team
            const csvReport = this.generateCSVProgressReport(progressReport);
            const csvFileName = `development-actions-${progressReport.reportId}.csv`;
            const csvPath = path.join(this.progressDir, csvFileName);
            fs.writeFileSync(csvPath, csvReport, 'utf8');

            console.log(`✅ Progress report generated: ${fileName}`);
            console.log(`📊 Management Report: ${htmlFileName}`);
            console.log(`📋 Development Actions: ${csvFileName}`);
            console.log(`📈 Overall Progress: ${progress.overallImprovement.toFixed(1)}%`);

            return {
                json: filePath,
                html: htmlPath,
                csv: csvPath,
                data: progressReport
            };

        } catch (error) {
            console.error('❌ Error generating progress report:', error.message);
            throw error;
        }
    }

    /**
     * Calculate progress metrics between baseline and current
     */
    calculateProgress(baseline, current) {
        const violationChange = {
            baseline: baseline.totalViolations,
            current: current.totalViolations,
            reduction: baseline.totalViolations - current.totalViolations,
            percentageReduction: baseline.totalViolations > 0 ? 
                ((baseline.totalViolations - current.totalViolations) / baseline.totalViolations * 100) : 0
        };

        const criticalChange = {
            baseline: baseline.criticalIssues,
            current: current.criticalIssues,
            reduction: baseline.criticalIssues - current.criticalIssues,
            percentageReduction: baseline.criticalIssues > 0 ? 
                ((baseline.criticalIssues - current.criticalIssues) / baseline.criticalIssues * 100) : 0
        };

        const complianceChange = {
            baseline: baseline.wcagComplianceScore || 0,
            current: current.wcagComplianceScore || 0,
            improvement: (current.wcagComplianceScore || 0) - (baseline.wcagComplianceScore || 0)
        };

        // Overall improvement score (weighted)
        const overallImprovement = (
            (violationChange.percentageReduction * 0.4) +
            (criticalChange.percentageReduction * 0.4) +
            (complianceChange.improvement * 0.2)
        );

        return {
            violations: violationChange,
            critical: criticalChange,
            compliance: complianceChange,
            overallImprovement,
            status: this.determineProgressStatus(overallImprovement),
            milestones: this.checkMilestones(baseline, current)
        };
    }

    /**
     * Generate management summary
     */
    generateManagementSummary(progress) {
        const status = progress.status;
        let summary = {
            executiveSummary: '',
            keyMetrics: [],
            businessImpact: '',
            nextSteps: '',
            resourceRequirements: '',
            timeline: ''
        };

        // Executive summary based on progress
        if (progress.overallImprovement >= 50) {
            summary.executiveSummary = `Excellent progress on accessibility improvements. ${progress.violations.reduction} violations resolved, representing a ${progress.violations.percentageReduction.toFixed(1)}% reduction. The application is on track for full compliance.`;
        } else if (progress.overallImprovement >= 25) {
            summary.executiveSummary = `Good progress on accessibility initiatives. ${progress.violations.reduction} violations addressed with ${progress.critical.reduction} critical issues resolved. Continued effort needed to reach compliance goals.`;
        } else if (progress.overallImprovement >= 0) {
            summary.executiveSummary = `Moderate progress observed. ${progress.violations.reduction} violations resolved. Additional resources and focused effort required to accelerate improvement.`;
        } else {
            summary.executiveSummary = `Action required: New accessibility issues have been identified. Immediate attention needed to address ${Math.abs(progress.violations.reduction)} new violations.`;
        }

        // Key metrics
        summary.keyMetrics = [
            `Total Violations Reduced: ${progress.violations.reduction}`,
            `Critical Issues Resolved: ${progress.critical.reduction}`,
            `Compliance Score: ${progress.compliance.current.toFixed(1)}%`,
            `Overall Improvement: ${progress.overallImprovement.toFixed(1)}%`
        ];

        // Business impact
        if (progress.critical.reduction > 0) {
            summary.businessImpact = `Resolving ${progress.critical.reduction} critical accessibility issues reduces legal risk and improves user experience for ${this.estimateAffectedUsers(progress.critical.reduction)} users with disabilities.`;
        }

        return summary;
    }

    /**
     * Generate development team action items
     */
    generateDevelopmentActions(progress) {
        return {
            immediateActions: [
                'Review and test all critical accessibility violations',
                'Implement ARIA labels for unlabeled form controls',
                'Fix color contrast issues below WCAG AA standards',
                'Ensure all interactive elements are keyboard accessible'
            ],
            upcomingTasks: [
                'Conduct comprehensive screen reader testing',
                'Implement automated accessibility testing in CI/CD',
                'Create accessibility component library',
                'Train development team on WCAG guidelines'
            ],
            codeReviewFocus: [
                'Semantic HTML structure',
                'ARIA attributes and roles',
                'Keyboard navigation patterns',
                'Color contrast compliance',
                'Alternative text for images'
            ],
            toolingRecommendations: [
                'axe-core browser extension for real-time testing',
                'Pa11y for automated CI/CD integration',
                'Lighthouse accessibility audits',
                'Screen reader testing protocols'
            ]
        };
    }

    /**
     * Generate HTML progress report for management
     */
    async generateHTMLProgressReport(progressData) {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Progress Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f7fa;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            text-align: center;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
        }
        .improvement { color: #28a745; }
        .regression { color: #dc3545; }
        .chart-container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        .progress-bar {
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            height: 20px;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        .action-item {
            background: #fff5e6;
            padding: 1rem;
            border-radius: 6px;
            margin: 0.5rem 0;
            border-left: 3px solid #ff9500;
        }
        .executive-summary {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border-left: 4px solid #667eea;
        }
        .milestone {
            background: #e7f3ff;
            padding: 1rem;
            border-radius: 6px;
            margin: 0.5rem 0;
            border-left: 3px solid #0066cc;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        th {
            background: #667eea;
            color: white;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Accessibility Progress Report</h1>
        <p>Generated on ${new Date(progressData.timestamp).toLocaleDateString()}</p>
        <p>Baseline: ${progressData.baseline.description} (${new Date(progressData.baseline.timestamp).toLocaleDateString()})</p>
    </div>

    <div class="executive-summary">
        <h2>Executive Summary</h2>
        <p>${progressData.managementSummary.executiveSummary}</p>
        
        <h3>Business Impact</h3>
        <p>${progressData.managementSummary.businessImpact}</p>
    </div>

    <div class="summary-cards">
        <div class="card">
            <h3>Total Violations</h3>
            <div class="metric-value ${progressData.progress.violations.reduction >= 0 ? 'improvement' : 'regression'}">
                ${progressData.current.totalViolations}
            </div>
            <p>Change: ${progressData.progress.violations.reduction >= 0 ? '-' : '+'}${Math.abs(progressData.progress.violations.reduction)} (${progressData.progress.violations.percentageReduction.toFixed(1)}%)</p>
        </div>
        
        <div class="card">
            <h3>Critical Issues</h3>
            <div class="metric-value ${progressData.progress.critical.reduction >= 0 ? 'improvement' : 'regression'}">
                ${progressData.current.criticalIssues}
            </div>
            <p>Change: ${progressData.progress.critical.reduction >= 0 ? '-' : '+'}${Math.abs(progressData.progress.critical.reduction)} (${progressData.progress.critical.percentageReduction.toFixed(1)}%)</p>
        </div>
        
        <div class="card">
            <h3>Compliance Score</h3>
            <div class="metric-value">
                ${progressData.progress.compliance.current.toFixed(1)}%
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressData.progress.compliance.current}%"></div>
            </div>
        </div>
        
        <div class="card">
            <h3>Overall Progress</h3>
            <div class="metric-value ${progressData.progress.overallImprovement >= 0 ? 'improvement' : 'regression'}">
                ${progressData.progress.overallImprovement.toFixed(1)}%
            </div>
            <p>Status: ${progressData.progress.status}</p>
        </div>
    </div>

    <div class="chart-container">
        <h2>Key Metrics</h2>
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Baseline</th>
                    <th>Current</th>
                    <th>Change</th>
                    <th>Improvement</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Total Violations</td>
                    <td>${progressData.progress.violations.baseline}</td>
                    <td>${progressData.progress.violations.current}</td>
                    <td>${progressData.progress.violations.reduction}</td>
                    <td>${progressData.progress.violations.percentageReduction.toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>Critical Issues</td>
                    <td>${progressData.progress.critical.baseline}</td>
                    <td>${progressData.progress.critical.current}</td>
                    <td>${progressData.progress.critical.reduction}</td>
                    <td>${progressData.progress.critical.percentageReduction.toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>Compliance Score</td>
                    <td>${progressData.progress.compliance.baseline.toFixed(1)}%</td>
                    <td>${progressData.progress.compliance.current.toFixed(1)}%</td>
                    <td>+${progressData.progress.compliance.improvement.toFixed(1)}%</td>
                    <td>${progressData.progress.compliance.improvement >= 0 ? 'Positive' : 'Needs Attention'}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2>Next Steps & Recommendations</h2>
        <div class="action-item">
            <h4>Immediate Actions</h4>
            <ul>
                ${progressData.developmentActions.immediateActions.map(action => `<li>${action}</li>`).join('')}
            </ul>
        </div>
        
        <div class="milestone">
            <h4>Upcoming Milestones</h4>
            <ul>
                ${progressData.developmentActions.upcomingTasks.map(task => `<li>${task}</li>`).join('')}
            </ul>
        </div>
    </div>

    <div class="card">
        <h2>Timeline & Milestones</h2>
        ${progressData.timeline.map(milestone => `
            <div class="milestone">
                <h4>${milestone.title}</h4>
                <p><strong>Target:</strong> ${milestone.target}</p>
                <p><strong>Status:</strong> ${milestone.status}</p>
                <p>${milestone.description}</p>
            </div>
        `).join('')}
    </div>
</body>
</html>
        `;

        return html;
    }

    generateRecommendations(progress) {
        return {
            immediate: [
                'Focus on critical accessibility violations first',
                'Implement automated testing in development workflow',
                'Conduct manual testing with screen readers'
            ],
            longTerm: [
                'Establish accessibility design system',
                'Train team on accessibility best practices',
                'Set up continuous monitoring'
            ]
        };
    }

    assessCompliance(assessment) {
        return {
            wcagLevel: assessment.wcagComplianceScore >= 90 ? 'AA' : 'Partial',
            section508: assessment.wcagComplianceScore >= 85 ? 'Compliant' : 'Non-compliant',
            ada: assessment.criticalIssues === 0 ? 'Low Risk' : 'Medium Risk'
        };
    }

    generateBaselineId() {
        return `baseline-${Date.now()}-${process.hrtime.bigint().toString(36)}`;
    }

    generateReportId() {
        return `progress-${Date.now()}-${process.hrtime.bigint().toString(36)}`;
    }

    calculateNextAssessment(currentDate) {
        const next = new Date(currentDate);
        next.setMonth(next.getMonth() + 1);
        return next.toISOString();
    }

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    formatDateForCSV(date) {
        return date.toISOString().split('T')[0];
    }

    determineProgressStatus(improvement) {
        if (improvement >= 50) return 'Excellent Progress';
        if (improvement >= 25) return 'Good Progress';
        if (improvement >= 0) return 'Moderate Progress';
        return 'Needs Attention';
    }

    estimateAffectedUsers(criticalIssues) {
        const basePercentage = criticalIssues * 7;
        return `${basePercentage}% of`;
    }

    async getBaseline(baselineId = null) {
        try {
            if (baselineId) {
                const files = fs.readdirSync(this.progressDir);
                const baselineFile = files.find(file => file.includes(`baseline-${baselineId}`));
                if (baselineFile) {
                    const content = fs.readFileSync(path.join(this.progressDir, baselineFile), 'utf8');
                    return JSON.parse(content);
                }
            } else {
                const latestPath = path.join(this.progressDir, 'latest-baseline.json');
                if (fs.existsSync(latestPath)) {
                    const content = fs.readFileSync(latestPath, 'utf8');
                    return JSON.parse(content);
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting baseline:', error.message);
            return null;
        }
    }

    async getCurrentAssessment() {
        const recentReports = await this.storage.listReports({ 
            limit: 5,
            sortBy: 'timestamp',
            sortOrder: 'desc'
        });

        return await this.aggregateReportsData(recentReports);
    }

    async aggregateReportsData(reports) {
        let totalViolations = 0;
        let criticalIssues = 0;
        let warningIssues = 0;
        let contrastIssues = 0;
        const toolBreakdown = {};

        for (const report of reports) {
            totalViolations += report.violationCount || 0;
            criticalIssues += report.criticalIssues || 0;
            
            const toolType = report.type || 'unknown';
            toolBreakdown[toolType] = (toolBreakdown[toolType] || 0) + (report.violationCount || 0);
        }

        const wcagComplianceScore = Math.max(0, 100 - (totalViolations * 2));

        return {
            totalViolations,
            criticalIssues,
            warningIssues,
            contrastIssues,
            wcagComplianceScore,
            toolBreakdown,
            assessmentDate: new Date().toISOString()
        };
    }

    checkMilestones(baseline, current) {
        const milestones = [];
        
        if (current.criticalIssues === 0 && baseline.criticalIssues > 0) {
            milestones.push({
                title: '🎯 Zero Critical Issues Achieved',
                description: 'All critical accessibility violations have been resolved',
                achieved: true
            });
        }

        if (current.wcagComplianceScore >= 90) {
            milestones.push({
                title: '🏆 90% WCAG Compliance',
                description: 'Application meets high accessibility standards',
                achieved: true
            });
        }

        return milestones;
    }

    generateTimeline(baseline, current) {
        return [
            {
                title: 'Phase 1: Critical Issues Resolution',
                target: this.formatDateForCSV(this.addDays(new Date(), 30)),
                status: current.criticalIssues === 0 ? 'Complete' : 'In Progress',
                description: 'Address all critical accessibility violations'
            },
            {
                title: 'Phase 2: WCAG AA Compliance',
                target: this.formatDateForCSV(this.addDays(new Date(), 60)),
                status: current.wcagComplianceScore >= 80 ? 'Complete' : 'Planned',
                description: 'Achieve full WCAG 2.2 AA compliance'
            }
        ];
    }

    generateCSVProgressReport(progressData) {
        let csv = 'Action Type,Priority,Description,WCAG Criteria,Estimated Effort,Due Date\n';

        progressData.developmentActions.immediateActions.forEach(action => {
            csv += `Immediate,High,"${action}",Various,2-4 hours,${this.formatDateForCSV(this.addDays(new Date(), 3))}\n`;
        });

        progressData.developmentActions.upcomingTasks.forEach(task => {
            csv += `Upcoming,Medium,"${task}",Various,1-2 days,${this.formatDateForCSV(this.addDays(new Date(), 14))}\n`;
        });

        return csv;
    }
}

module.exports = ProgressTracker;

// Command line interface
if (require.main === module) {
    const tracker = new ProgressTracker();
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('📊 Accessibility Progress Tracker');
        console.log('Usage: node progress-tracker.js <command> [options]');
        console.log('\nCommands:');
        console.log('  baseline <url> [description]     - Create baseline assessment');
        console.log('  progress [baselineId]            - Generate progress report');
        console.log('  dashboard                        - Show progress dashboard');
        console.log('\nExamples:');
        console.log('  node progress-tracker.js baseline "https://myapp.com" "Initial assessment"');
        console.log('  node progress-tracker.js progress');
        return;
    }

    const command = args[0];

    switch (command) {
        case 'baseline':
            const url = args[1];
            const description = args[2] || 'Accessibility Baseline Assessment';
            if (!url) {
                console.log('❌ Please provide a URL for the baseline assessment');
                return;
            }
            tracker.createBaseline(url, description);
            break;

        case 'progress':
            const baselineId = args[1] || null;
            tracker.generateProgressReport(baselineId).then(result => {
                console.log('\n📊 Progress report generated:');
                console.log(`   JSON: ${result.json}`);
                console.log(`   HTML: ${result.html}`);
                console.log(`   CSV: ${result.csv}`);
            });
            break;

        default:
            console.log(`❌ Unknown command: ${command}`);
    }
} 
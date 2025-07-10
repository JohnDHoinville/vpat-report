/**
 * VPAT Generation Engine
 * Automated VPAT generation from accessibility test results
 * Combines WCAG 2.2 criteria mapping with professional VPAT templates
 */

const WCAGCriteriaMapper = require('./wcag-criteria-mapper');
const VPATTemplateGenerator = require('./vpat-template-generator');
const fs = require('fs').promises;
const path = require('path');

class VPATGenerator {
    constructor() {
        this.criteriaMapper = new WCAGCriteriaMapper();
        this.templateGenerator = new VPATTemplateGenerator();
        this.outputDir = path.join(__dirname, '..', 'reports', 'vpat');
        this.initializeOutputDirectory();
    }

    /**
     * Initialize VPAT output directory
     */
    async initializeOutputDirectory() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
        } catch (error) {
            console.warn('VPAT output directory already exists or could not be created:', error.message);
        }
    }

    /**
     * Generate complete VPAT from accessibility test results
     */
    async generateVPAT(testResults, organizationInfo = {}, options = {}) {
        try {
            console.log('🎯 Starting VPAT generation process...');
            
            // Step 1: Map test results to WCAG criteria
            console.log('📊 Mapping test results to WCAG 2.2 criteria...');
            const wcagMapping = this.criteriaMapper.mapResultsToWCAG(testResults);
            
            // Step 2: Generate compliance summary
            console.log('📈 Calculating compliance metrics...');
            const complianceSummary = this.criteriaMapper.generateComplianceSummary(wcagMapping);
            
            // Step 3: Create organization metadata
            const metadata = this.buildOrganizationMetadata(organizationInfo, testResults);
            
            // Step 4: Generate VPAT document
            console.log('📄 Generating VPAT document...');
            const vpatDocument = this.templateGenerator.generateVPAT(wcagMapping, metadata);
            
            // Step 5: Create file outputs
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const baseFilename = `vpat-${organizationInfo.productName || 'accessibility-assessment'}-${timestamp}`;
            
            const outputs = await this.saveVPATOutputs(vpatDocument, baseFilename);
            
            // Step 6: Generate summary report
            const summaryReport = this.generateSummaryReport(wcagMapping, complianceSummary, outputs);
            
            console.log('✅ VPAT generation completed successfully!');
            console.log(`📁 Files saved to: ${this.outputDir}`);
            
            return {
                success: true,
                outputs: outputs,
                summary: summaryReport,
                wcagMapping: wcagMapping,
                complianceSummary: complianceSummary,
                generatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ VPAT generation failed:', error);
            return {
                success: false,
                error: error.message,
                generatedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Build organization metadata with defaults
     */
    buildOrganizationMetadata(organizationInfo, testResults) {
        const defaultMetadata = {
            productName: 'Web Application',
            productVersion: '1.0',
            vendorCompany: 'Organization Name',
            vendorEmail: 'accessibility@organization.com',
            testingScope: 'Full application accessibility assessment',
            targetLevel: 'AA'
        };

        // Extract testing metadata from results
        const testingMetadata = {
            testUrl: testResults.url || testResults.testUrl || 'Not specified',
            testDate: testResults.timestamp || new Date().toISOString(),
            toolsUsed: Object.keys(testResults.tools || {}),
            totalPages: testResults.totalPages || 1,
            testDuration: testResults.duration || 'Unknown'
        };

        return {
            ...defaultMetadata,
            ...organizationInfo,
            testing: testingMetadata
        };
    }

    /**
     * Save VPAT outputs in multiple formats
     */
    async saveVPATOutputs(vpatDocument, baseFilename) {
        const outputs = {};

        try {
            // Save HTML VPAT
            const htmlPath = path.join(this.outputDir, `${baseFilename}.html`);
            await fs.writeFile(htmlPath, vpatDocument.html, 'utf8');
            outputs.html = htmlPath;
            console.log(`💾 HTML VPAT saved: ${htmlPath}`);

            // Save JSON data
            const jsonPath = path.join(this.outputDir, `${baseFilename}.json`);
            await fs.writeFile(jsonPath, JSON.stringify(vpatDocument.json, null, 2), 'utf8');
            outputs.json = jsonPath;
            console.log(`💾 JSON data saved: ${jsonPath}`);

            // Save summary
            const summaryPath = path.join(this.outputDir, `${baseFilename}-summary.json`);
            await fs.writeFile(summaryPath, JSON.stringify(vpatDocument.summary, null, 2), 'utf8');
            outputs.summary = summaryPath;
            console.log(`💾 Summary saved: ${summaryPath}`);

            // Create latest symlinks
            await this.createLatestSymlinks(outputs);

            return outputs;

        } catch (error) {
            console.error('❌ Error saving VPAT outputs:', error);
            throw error;
        }
    }

    /**
     * Create symlinks to latest VPAT files
     */
    async createLatestSymlinks(outputs) {
        try {
            const latestMappings = {
                'latest-vpat.html': outputs.html,
                'latest-vpat.json': outputs.json,
                'latest-vpat-summary.json': outputs.summary
            };

            for (const [latestName, targetPath] of Object.entries(latestMappings)) {
                const latestPath = path.join(this.outputDir, latestName);
                
                try {
                    await fs.unlink(latestPath);
                } catch (error) {
                    // File doesn't exist, which is fine
                }

                try {
                    await fs.symlink(path.basename(targetPath), latestPath);
                } catch (error) {
                    // Symlinks might not be supported, copy instead
                    const content = await fs.readFile(targetPath, 'utf8');
                    await fs.writeFile(latestPath, content, 'utf8');
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not create latest symlinks:', error.message);
        }
    }

    /**
     * Generate summary report for VPAT generation
     */
    generateSummaryReport(wcagMapping, complianceSummary, outputs) {
        return {
            metadata: {
                generatedAt: new Date().toISOString(),
                vpatVersion: '2.4 Rev 508',
                wcagVersion: '2.2'
            },
            coverage: {
                totalCriteria: wcagMapping.summary.totalCriteria,
                evaluatedCriteria: wcagMapping.summary.coveredCriteria,
                coveragePercentage: Math.round((wcagMapping.summary.coveredCriteria / wcagMapping.summary.totalCriteria) * 100),
                automatedCoverage: wcagMapping.coverageAnalysis.estimatedCoverage
            },
            compliance: {
                overallScore: complianceSummary.overallCompliance,
                levelA: complianceSummary.levelCompliance.A,
                levelAA: complianceSummary.levelCompliance.AA,
                levelAAA: complianceSummary.levelCompliance.AAA
            },
            violations: {
                total: this.countTotalViolations(wcagMapping),
                critical: complianceSummary.criticalIssues.length,
                byLevel: this.countViolationsByLevel(wcagMapping)
            },
            recommendations: complianceSummary.recommendations,
            files: outputs,
            nextSteps: this.generateNextSteps(complianceSummary)
        };
    }

    /**
     * Count total violations across all criteria
     */
    countTotalViolations(wcagMapping) {
        return Object.values(wcagMapping.criteriaMapping)
            .reduce((total, criteria) => total + criteria.violations.length, 0);
    }

    /**
     * Count violations by WCAG level
     */
    countViolationsByLevel(wcagMapping) {
        const byLevel = { A: 0, AA: 0, AAA: 0 };
        
        Object.keys(wcagMapping.criteriaMapping).forEach(criteriaId => {
            const criteria = wcagMapping.criteriaMapping[criteriaId];
            if (criteria.violations.length > 0) {
                byLevel[criteria.criteria.level] += criteria.violations.length;
            }
        });

        return byLevel;
    }

    /**
     * Generate actionable next steps
     */
    generateNextSteps(complianceSummary) {
        const steps = [];

        if (complianceSummary.criticalIssues.length > 0) {
            steps.push({
                priority: 'Immediate',
                action: `Fix ${complianceSummary.criticalIssues.length} critical accessibility violation${complianceSummary.criticalIssues.length > 1 ? 's' : ''}`,
                timeframe: '1-2 weeks',
                impact: 'High'
            });
        }

        if (complianceSummary.recommendations.length > 0) {
            complianceSummary.recommendations.forEach(rec => {
                steps.push({
                    priority: rec.priority,
                    action: rec.description,
                    timeframe: rec.priority === 'High' ? '2-4 weeks' : '1-2 months',
                    impact: rec.priority
                });
            });
        }

        // Manual testing recommendations
        steps.push({
            priority: 'Medium',
            action: 'Conduct comprehensive manual accessibility testing',
            timeframe: '2-3 weeks',
            impact: 'Medium',
            details: 'Focus on keyboard navigation, screen reader testing, and cognitive accessibility'
        });

        return steps;
    }

    /**
     * Generate VPAT from consolidated test results file
     */
    async generateVPATFromFile(filePath, organizationInfo = {}) {
        try {
            console.log(`📁 Loading test results from: ${filePath}`);
            const fileContent = await fs.readFile(filePath, 'utf8');
            const testResults = JSON.parse(fileContent);
            
            return await this.generateVPAT(testResults, organizationInfo);
            
        } catch (error) {
            console.error('❌ Error loading test results file:', error);
            throw error;
        }
    }

    /**
     * Batch generate VPATs from multiple test result files
     */
    async batchGenerateVPATs(testResultFiles, organizationInfo = {}) {
        const results = [];
        
        for (const filePath of testResultFiles) {
            try {
                console.log(`\n🔄 Processing: ${path.basename(filePath)}`);
                const result = await this.generateVPATFromFile(filePath, {
                    ...organizationInfo,
                    productName: `${organizationInfo.productName || 'Application'}-${path.basename(filePath, path.extname(filePath))}`
                });
                results.push({
                    file: filePath,
                    result: result
                });
            } catch (error) {
                console.error(`❌ Failed to process ${filePath}:`, error);
                results.push({
                    file: filePath,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Validate organization information
     */
    validateOrganizationInfo(organizationInfo) {
        const required = ['productName', 'vendorCompany', 'vendorEmail'];
        const missing = required.filter(field => !organizationInfo[field]);
        
        if (missing.length > 0) {
            console.warn(`⚠️ Missing organization information: ${missing.join(', ')}`);
            console.warn('Using default values. For professional VPATs, provide complete organization details.');
        }

        return missing.length === 0;
    }

    /**
     * Get VPAT generation status
     */
    async getGenerationHistory() {
        try {
            const files = await fs.readdir(this.outputDir);
            const vpatFiles = files.filter(file => file.endsWith('.html'));
            
            const history = [];
            for (const file of vpatFiles) {
                const filePath = path.join(this.outputDir, file);
                const stats = await fs.stat(filePath);
                
                history.push({
                    filename: file,
                    created: stats.birthtime,
                    size: stats.size,
                    path: filePath
                });
            }

            return history.sort((a, b) => b.created - a.created);
            
        } catch (error) {
            console.error('❌ Error getting generation history:', error);
            return [];
        }
    }

    /**
     * Export VPAT to PDF (requires additional dependencies)
     */
    async exportToPDF(htmlPath, options = {}) {
        try {
            // This would require puppeteer or similar for PDF generation
            console.log('📄 PDF export functionality requires additional setup');
            console.log('Install puppeteer for PDF generation: npm install puppeteer');
            console.log(`HTML VPAT available at: ${htmlPath}`);
            
            return {
                success: false,
                message: 'PDF export requires puppeteer dependency',
                htmlPath: htmlPath
            };
            
        } catch (error) {
            console.error('❌ PDF export error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = VPATGenerator;

// CLI interface for VPAT generation
if (require.main === module) {
    const vpatGenerator = new VPATGenerator();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🎯 VPAT Generator - Automated Accessibility Compliance Documentation

Usage:
  node vpat-generator.js <test-results-file> [options]
  
Examples:
  node vpat-generator.js ../reports/latest-accessibility-export.json
  node vpat-generator.js ../reports/consolidated-report.json --product "My App" --company "My Company"
  
Options:
  --product <name>     Product name for VPAT
  --company <name>     Company/vendor name
  --email <email>      Contact email address
  --version <version>  Product version
  --level <A|AA|AAA>   Target WCAG compliance level
  
Generated files will be saved to: ./reports/vpat/
        `);
        process.exit(0);
    }

    const testResultsFile = args[0];
    const organizationInfo = {};

    // Parse command line options
    for (let i = 1; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];
        
        switch (flag) {
            case '--product':
                organizationInfo.productName = value;
                break;
            case '--company':
                organizationInfo.vendorCompany = value;
                break;
            case '--email':
                organizationInfo.vendorEmail = value;
                break;
            case '--version':
                organizationInfo.productVersion = value;
                break;
            case '--level':
                organizationInfo.targetLevel = value;
                break;
        }
    }

    // Generate VPAT
    vpatGenerator.generateVPATFromFile(testResultsFile, organizationInfo)
        .then(result => {
            if (result.success) {
                console.log('\n✅ VPAT Generation Successful!');
                console.log(`📊 Overall AA Compliance: ${result.summary.compliance.levelAA}%`);
                console.log(`📄 HTML VPAT: ${result.outputs.html}`);
                console.log(`📋 JSON Data: ${result.outputs.json}`);
            } else {
                console.error('\n❌ VPAT Generation Failed:', result.error);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n❌ Unexpected error:', error);
            process.exit(1);
        });
} 
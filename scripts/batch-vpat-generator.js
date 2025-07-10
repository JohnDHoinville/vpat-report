/**
 * Batch VPAT Generator
 * Generate VPATs from multiple test result files
 */

const VPATGenerator = require('./vpat-generator');
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

class BatchVPATGenerator {
    constructor() {
        this.vpatGenerator = new VPATGenerator();
        this.reportsDir = path.join(__dirname, '..', 'reports');
    }

    /**
     * Generate VPATs for all consolidated reports
     */
    async generateBatchVPATs(organizationInfo = {}) {
        try {
            console.log('🎯 Starting batch VPAT generation...');
            
            // Find all consolidated accessibility reports
            const reportFiles = await this.findReportFiles();
            
            if (reportFiles.length === 0) {
                console.log('⚠️ No accessibility report files found.');
                return { success: false, message: 'No report files found' };
            }

            console.log(`📁 Found ${reportFiles.length} report files to process`);
            
            const results = [];
            for (const filePath of reportFiles) {
                try {
                    console.log(`\n🔄 Processing: ${path.basename(filePath)}`);
                    
                    const productName = this.extractProductNameFromFile(filePath);
                    const fileOrganizationInfo = {
                        ...organizationInfo,
                        productName: productName
                    };

                    const result = await this.vpatGenerator.generateVPATFromFile(filePath, fileOrganizationInfo);
                    
                    results.push({
                        sourceFile: filePath,
                        productName: productName,
                        success: result.success,
                        outputs: result.outputs,
                        summary: result.summary
                    });

                    if (result.success) {
                        console.log(`✅ VPAT generated for ${productName}`);
                        console.log(`📊 AA Compliance: ${result.summary.compliance.levelAA}%`);
                    }

                } catch (error) {
                    console.error(`❌ Failed to process ${path.basename(filePath)}:`, error.message);
                    results.push({
                        sourceFile: filePath,
                        success: false,
                        error: error.message
                    });
                }
            }

            // Generate batch summary
            const batchSummary = this.generateBatchSummary(results);
            await this.saveBatchSummary(batchSummary);

            console.log('\n🎉 Batch VPAT generation completed!');
            console.log(`✅ Successful: ${results.filter(r => r.success).length}`);
            console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);

            return {
                success: true,
                results: results,
                summary: batchSummary
            };

        } catch (error) {
            console.error('❌ Batch VPAT generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Find all accessibility report files
     */
    async findReportFiles() {
        const files = [];
        try {
            const reportsContent = await fs.readdir(this.reportsDir);
            for (const file of reportsContent) {
                if (file.endsWith('.json') && (
                    file.includes('accessibility-export') || 
                    file.includes('consolidated') ||
                    file.includes('latest-')
                )) {
                    files.push(path.join(this.reportsDir, file));
                }
            }
        } catch (error) {
            console.warn('Warning: Could not read reports directory:', error.message);
        }
        return files;
    }

    /**
     * Extract product name from file path/name
     */
    extractProductNameFromFile(filePath) {
        const basename = path.basename(filePath, path.extname(filePath));
        
        if (basename.includes('latest-accessibility-export')) {
            return 'Latest Application Assessment';
        } else if (basename.includes('sample-accessibility-export')) {
            return 'Sample Application Assessment';
        } else {
            return basename.charAt(0).toUpperCase() + basename.slice(1).replace(/[-_]/g, ' ');
        }
    }

    /**
     * Generate batch summary report
     */
    generateBatchSummary(results) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        const summary = {
            generatedAt: new Date().toISOString(),
            totalFiles: results.length,
            successfulGenerations: successful.length,
            failedGenerations: failed.length,
            successRate: Math.round((successful.length / results.length) * 100),
            results: results,
            aggregateCompliance: this.calculateAggregateCompliance(successful),
            recommendations: this.generateBatchRecommendations(successful)
        };

        return summary;
    }

    /**
     * Calculate aggregate compliance across all generated VPATs
     */
    calculateAggregateCompliance(successfulResults) {
        if (successfulResults.length === 0) {
            return { levelAA: 0, average: 0 };
        }

        const complianceScores = successfulResults
            .map(r => r.summary?.compliance?.levelAA || 0)
            .filter(score => score > 0);

        if (complianceScores.length === 0) {
            return { levelAA: 0, average: 0 };
        }

        const average = Math.round(complianceScores.reduce((sum, score) => sum + score, 0) / complianceScores.length);
        const min = Math.min(...complianceScores);
        const max = Math.max(...complianceScores);

        return {
            average: average,
            minimum: min,
            maximum: max,
            levelAA: average,
            distribution: this.analyzeComplianceDistribution(complianceScores)
        };
    }

    /**
     * Analyze compliance score distribution
     */
    analyzeComplianceDistribution(scores) {
        const ranges = {
            'excellent': scores.filter(s => s >= 95).length,
            'good': scores.filter(s => s >= 80 && s < 95).length,
            'fair': scores.filter(s => s >= 60 && s < 80).length,
            'poor': scores.filter(s => s < 60).length
        };

        return ranges;
    }

    /**
     * Generate batch-level recommendations
     */
    generateBatchRecommendations(successfulResults) {
        const recommendations = [];

        const avgCompliance = this.calculateAggregateCompliance(successfulResults).average;

        if (avgCompliance < 70) {
            recommendations.push({
                priority: 'High',
                category: 'Overall Compliance',
                description: 'Average compliance is below 70%. Focus on systematic accessibility improvements across all applications.',
                action: 'Implement organization-wide accessibility training and standards'
            });
        }

        if (successfulResults.length > 1) {
            const complianceScores = successfulResults.map(r => r.summary?.compliance?.levelAA || 0);
            const variance = this.calculateVariance(complianceScores);
            
            if (variance > 400) { // High variance in compliance scores
                recommendations.push({
                    priority: 'Medium',
                    category: 'Consistency',
                    description: 'High variance in compliance scores across applications indicates inconsistent accessibility practices.',
                    action: 'Standardize accessibility development practices and testing procedures'
                });
            }
        }

        recommendations.push({
            priority: 'Medium',
            category: 'Continuous Monitoring',
            description: 'Establish regular VPAT generation schedule for ongoing compliance tracking.',
            action: 'Schedule monthly or quarterly accessibility assessments and VPAT updates'
        });

        return recommendations;
    }

    /**
     * Calculate variance for compliance scores
     */
    calculateVariance(scores) {
        if (scores.length <= 1) return 0;
        
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const squaredDifferences = scores.map(score => Math.pow(score - mean, 2));
        return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / scores.length;
    }

    /**
     * Save batch summary to file
     */
    async saveBatchSummary(summary) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const summaryPath = path.join(this.reportsDir, 'vpat', `batch-vpat-summary-${timestamp}.json`);
            
            await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
            
            // Also save as latest
            const latestPath = path.join(this.reportsDir, 'vpat', 'latest-batch-summary.json');
            await fs.writeFile(latestPath, JSON.stringify(summary, null, 2), 'utf8');
            
            console.log(`💾 Batch summary saved: ${summaryPath}`);
            
        } catch (error) {
            console.error('❌ Error saving batch summary:', error);
        }
    }

    /**
     * Generate VPATs for specific file patterns
     */
    async generateVPATsForPattern(pattern, organizationInfo = {}) {
        try {
            const fullPattern = path.join(this.reportsDir, pattern);
            const files = glob.sync(fullPattern);
            
            if (files.length === 0) {
                console.log(`⚠️ No files found matching pattern: ${pattern}`);
                return { success: false, message: 'No matching files found' };
            }

            console.log(`📁 Found ${files.length} files matching pattern: ${pattern}`);
            
            const results = [];
            for (const filePath of files) {
                const result = await this.vpatGenerator.generateVPATFromFile(filePath, organizationInfo);
                results.push({
                    sourceFile: filePath,
                    success: result.success,
                    outputs: result.outputs
                });
            }

            return {
                success: true,
                results: results,
                totalGenerated: results.filter(r => r.success).length
            };

        } catch (error) {
            console.error('❌ Pattern-based VPAT generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = BatchVPATGenerator;

// CLI interface
if (require.main === module) {
    const batchGenerator = new BatchVPATGenerator();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    const organizationInfo = {
        vendorCompany: 'Your Organization',
        vendorEmail: 'accessibility@yourorganization.com',
        productVersion: '1.0',
        targetLevel: 'AA'
    };

    // Parse command line options
    for (let i = 0; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];
        
        switch (flag) {
            case '--company':
                organizationInfo.vendorCompany = value;
                break;
            case '--email':
                organizationInfo.vendorEmail = value;
                break;
            case '--version':
                organizationInfo.productVersion = value;
                break;
            case '--pattern':
                // Generate for specific pattern
                batchGenerator.generateVPATsForPattern(value, organizationInfo)
                    .then(result => {
                        if (result.success) {
                            console.log(`✅ Generated ${result.totalGenerated} VPATs`);
                        } else {
                            console.error('❌ Pattern generation failed:', result.error || result.message);
                        }
                        process.exit(result.success ? 0 : 1);
                    });
                return;
        }
    }

    // Default: Generate VPATs for all found files
    batchGenerator.generateBatchVPATs(organizationInfo)
        .then(result => {
            if (result.success) {
                console.log(`\n✅ Batch generation completed!`);
                console.log(`📊 Success rate: ${result.summary.successRate}%`);
                console.log(`📈 Average AA compliance: ${result.summary.aggregateCompliance.average}%`);
            } else {
                console.error('\n❌ Batch generation failed:', result.error);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n❌ Unexpected error:', error);
            process.exit(1);
        });
} 
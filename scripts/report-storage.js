#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Report Storage and Retrieval System
 * Handles file naming conventions, timestamps, and report history tracking
 */

class ReportStorage {
    constructor() {
        this.reportsDir = path.join(__dirname, '../reports');
        this.archiveDir = path.join(this.reportsDir, 'archive');
        this.metadataFile = path.join(this.reportsDir, 'report-metadata.json');
        this.ensureDirectories();
    }

    /**
     * Ensure required directories exist
     */
    ensureDirectories() {
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
        if (!fs.existsSync(this.archiveDir)) {
            fs.mkdirSync(this.archiveDir, { recursive: true });
        }
    }

    /**
     * Generate standardized filename with timestamp
     */
    generateFileName(type, format, timestamp = null) {
        const ts = timestamp || new Date().toISOString().replace(/[:.]/g, '-');
        const typeMap = {
            'consolidated': 'accessibility-report',
            'html': 'accessibility-report',
            'export': 'accessibility-export',
            'summary': 'accessibility-summary',
            'wave': 'wave-results',
            'axe': 'axe-results',
            'pa11y': 'pa11y-results',
            'lighthouse': 'lighthouse-results',
            'ibm': 'ibm-results'
        };

        const baseType = typeMap[type] || type;
        return `${baseType}-${ts}.${format}`;
    }

    /**
     * Store report with metadata tracking
     */
    async storeReport(reportData, type, format, options = {}) {
        console.log(`💾 Storing ${type} report in ${format} format...`);

        try {
            const timestamp = new Date().toISOString();
            const fileName = this.generateFileName(type, format, timestamp.replace(/[:.]/g, '-'));
            const filePath = path.join(this.reportsDir, fileName);

            // Write report file
            let content;
            if (format === 'json') {
                content = JSON.stringify(reportData, null, 2);
            } else if (format === 'xml') {
                content = reportData; // Assume XML content is already formatted
            } else if (format === 'html') {
                content = reportData; // Assume HTML content is already formatted
            } else if (format === 'csv') {
                content = reportData; // Assume CSV content is already formatted
            } else {
                content = JSON.stringify(reportData, null, 2);
            }

            fs.writeFileSync(filePath, content, 'utf8');

            // Update metadata
            const metadata = {
                fileName,
                filePath,
                type,
                format,
                timestamp,
                size: Buffer.byteLength(content, 'utf8'),
                checksum: this.generateChecksum(content),
                options: options || {},
                testUrl: reportData.metadata?.testUrl || 'Unknown',
                tools: reportData.metadata?.tools || [],
                violationCount: reportData.summary?.totalViolations || 0,
                criticalIssues: reportData.summary?.criticalIssues || 0
            };

            await this.updateMetadata(metadata);

            // Create latest file symlink
            const latestFileName = `latest-${typeMap[type] || type}.${format}`;
            const latestPath = path.join(this.reportsDir, latestFileName);
            
            // Remove existing latest file and create new one
            if (fs.existsSync(latestPath)) {
                fs.unlinkSync(latestPath);
            }
            fs.copyFileSync(filePath, latestPath);

            console.log(`✅ Report stored: ${fileName}`);
            console.log(`📊 Size: ${this.formatFileSize(metadata.size)}, Violations: ${metadata.violationCount}`);

            return {
                fileName,
                filePath,
                metadata
            };

        } catch (error) {
            console.error(`❌ Error storing ${type} report:`, error.message);
            throw error;
        }
    }

    /**
     * Update metadata index
     */
    async updateMetadata(newMetadata) {
        try {
            let metadata = [];
            
            // Read existing metadata
            if (fs.existsSync(this.metadataFile)) {
                const existingData = fs.readFileSync(this.metadataFile, 'utf8');
                metadata = JSON.parse(existingData);
            }

            // Add new metadata
            metadata.push(newMetadata);

            // Sort by timestamp (newest first)
            metadata.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Write updated metadata
            fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2), 'utf8');

        } catch (error) {
            console.error('❌ Error updating metadata:', error.message);
            throw error;
        }
    }

    /**
     * Retrieve report by filename
     */
    async getReport(fileName) {
        try {
            const filePath = path.join(this.reportsDir, fileName);
            
            if (!fs.existsSync(filePath)) {
                throw new Error(`Report not found: ${fileName}`);
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const stats = fs.statSync(filePath);
            
            // Get metadata for this file
            const metadata = await this.getReportMetadata(fileName);

            return {
                fileName,
                filePath,
                content,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                metadata
            };

        } catch (error) {
            console.error(`❌ Error retrieving report ${fileName}:`, error.message);
            throw error;
        }
    }

    /**
     * Get report metadata by filename
     */
    async getReportMetadata(fileName) {
        try {
            if (!fs.existsSync(this.metadataFile)) {
                return null;
            }

            const metadataContent = fs.readFileSync(this.metadataFile, 'utf8');
            const metadata = JSON.parse(metadataContent);
            
            return metadata.find(item => item.fileName === fileName) || null;

        } catch (error) {
            console.error(`❌ Error getting metadata for ${fileName}:`, error.message);
            return null;
        }
    }

    /**
     * List all reports with filtering options
     */
    async listReports(options = {}) {
        try {
            const {
                type = null,
                format = null,
                limit = 50,
                startDate = null,
                endDate = null,
                sortBy = 'timestamp',
                sortOrder = 'desc'
            } = options;

            let metadata = [];
            
            if (fs.existsSync(this.metadataFile)) {
                const metadataContent = fs.readFileSync(this.metadataFile, 'utf8');
                metadata = JSON.parse(metadataContent);
            }

            // Apply filters
            let filteredReports = metadata;

            if (type) {
                filteredReports = filteredReports.filter(report => report.type === type);
            }

            if (format) {
                filteredReports = filteredReports.filter(report => report.format === format);
            }

            if (startDate) {
                const start = new Date(startDate);
                filteredReports = filteredReports.filter(report => 
                    new Date(report.timestamp) >= start
                );
            }

            if (endDate) {
                const end = new Date(endDate);
                filteredReports = filteredReports.filter(report => 
                    new Date(report.timestamp) <= end
                );
            }

            // Sort results
            filteredReports.sort((a, b) => {
                let aValue = a[sortBy];
                let bValue = b[sortBy];

                if (sortBy === 'timestamp') {
                    aValue = new Date(aValue);
                    bValue = new Date(bValue);
                }

                if (sortOrder === 'desc') {
                    return bValue > aValue ? 1 : -1;
                } else {
                    return aValue > bValue ? 1 : -1;
                }
            });

            // Apply limit
            if (limit > 0) {
                filteredReports = filteredReports.slice(0, limit);
            }

            return filteredReports;

        } catch (error) {
            console.error('❌ Error listing reports:', error.message);
            throw error;
        }
    }

    /**
     * Search reports by content or metadata
     */
    async searchReports(query, options = {}) {
        try {
            const {
                searchIn = ['testUrl', 'tools', 'type'],
                caseSensitive = false,
                limit = 20
            } = options;

            const allReports = await this.listReports({ limit: 0 }); // Get all reports
            const searchQuery = caseSensitive ? query : query.toLowerCase();

            const matchingReports = allReports.filter(report => {
                return searchIn.some(field => {
                    let fieldValue = report[field];
                    
                    if (Array.isArray(fieldValue)) {
                        fieldValue = fieldValue.join(' ');
                    }
                    
                    if (fieldValue) {
                        const searchValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
                        return searchValue.includes(searchQuery);
                    }
                    
                    return false;
                });
            });

            return matchingReports.slice(0, limit);

        } catch (error) {
            console.error('❌ Error searching reports:', error.message);
            throw error;
        }
    }

    /**
     * Archive old reports
     */
    async archiveOldReports(daysOld = 30) {
        console.log(`🗂️  Archiving reports older than ${daysOld} days...`);

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const allReports = await this.listReports({ limit: 0 });
            const reportsToArchive = allReports.filter(report => 
                new Date(report.timestamp) < cutoffDate
            );

            let archivedCount = 0;

            for (const report of reportsToArchive) {
                const sourcePath = path.join(this.reportsDir, report.fileName);
                const archivePath = path.join(this.archiveDir, report.fileName);

                if (fs.existsSync(sourcePath)) {
                    fs.renameSync(sourcePath, archivePath);
                    archivedCount++;
                }
            }

            // Update metadata to reflect archived files
            await this.updateArchivedMetadata(reportsToArchive);

            console.log(`✅ Archived ${archivedCount} reports to archive directory`);
            return archivedCount;

        } catch (error) {
            console.error('❌ Error archiving reports:', error.message);
            throw error;
        }
    }

    /**
     * Update metadata for archived files
     */
    async updateArchivedMetadata(archivedReports) {
        try {
            if (!fs.existsSync(this.metadataFile)) {
                return;
            }

            const metadataContent = fs.readFileSync(this.metadataFile, 'utf8');
            let metadata = JSON.parse(metadataContent);

            // Mark archived reports
            const archivedFileNames = archivedReports.map(report => report.fileName);
            metadata = metadata.map(report => {
                if (archivedFileNames.includes(report.fileName)) {
                    return {
                        ...report,
                        archived: true,
                        archivedAt: new Date().toISOString(),
                        filePath: path.join(this.archiveDir, report.fileName)
                    };
                }
                return report;
            });

            fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2), 'utf8');

        } catch (error) {
            console.error('❌ Error updating archived metadata:', error.message);
            throw error;
        }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        try {
            const stats = {
                totalReports: 0,
                totalSize: 0,
                archivedReports: 0,
                archivedSize: 0,
                typeBreakdown: {},
                formatBreakdown: {},
                oldestReport: null,
                newestReport: null,
                averageSize: 0
            };

            if (fs.existsSync(this.metadataFile)) {
                const metadataContent = fs.readFileSync(this.metadataFile, 'utf8');
                const metadata = JSON.parse(metadataContent);

                stats.totalReports = metadata.length;
                stats.totalSize = metadata.reduce((sum, report) => sum + (report.size || 0), 0);

                // Count archived reports
                const archivedReports = metadata.filter(report => report.archived);
                stats.archivedReports = archivedReports.length;
                stats.archivedSize = archivedReports.reduce((sum, report) => sum + (report.size || 0), 0);

                // Type and format breakdown
                metadata.forEach(report => {
                    stats.typeBreakdown[report.type] = (stats.typeBreakdown[report.type] || 0) + 1;
                    stats.formatBreakdown[report.format] = (stats.formatBreakdown[report.format] || 0) + 1;
                });

                // Oldest and newest reports
                const sortedByDate = metadata.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                stats.oldestReport = sortedByDate[0] || null;
                stats.newestReport = sortedByDate[sortedByDate.length - 1] || null;

                // Average size
                stats.averageSize = stats.totalReports > 0 ? stats.totalSize / stats.totalReports : 0;
            }

            return stats;

        } catch (error) {
            console.error('❌ Error getting storage stats:', error.message);
            throw error;
        }
    }

    /**
     * Clean up duplicate reports
     */
    async cleanupDuplicates() {
        console.log('🧹 Cleaning up duplicate reports...');

        try {
            if (!fs.existsSync(this.metadataFile)) {
                console.log('ℹ️  No metadata file found, nothing to clean');
                return 0;
            }

            const metadataContent = fs.readFileSync(this.metadataFile, 'utf8');
            const metadata = JSON.parse(metadataContent);

            // Group by checksum to find duplicates
            const checksumGroups = {};
            metadata.forEach(report => {
                if (report.checksum) {
                    if (!checksumGroups[report.checksum]) {
                        checksumGroups[report.checksum] = [];
                    }
                    checksumGroups[report.checksum].push(report);
                }
            });

            let removedCount = 0;
            const keptReports = [];

            // Keep only the newest report for each checksum
            Object.values(checksumGroups).forEach(group => {
                if (group.length > 1) {
                    // Sort by timestamp, keep the newest
                    group.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    keptReports.push(group[0]);

                    // Remove duplicate files
                    for (let i = 1; i < group.length; i++) {
                        const duplicateReport = group[i];
                        const filePath = path.join(this.reportsDir, duplicateReport.fileName);
                        
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            removedCount++;
                        }
                    }
                } else {
                    keptReports.push(group[0]);
                }
            });

            // Update metadata
            fs.writeFileSync(this.metadataFile, JSON.stringify(keptReports, null, 2), 'utf8');

            console.log(`✅ Removed ${removedCount} duplicate reports`);
            return removedCount;

        } catch (error) {
            console.error('❌ Error cleaning up duplicates:', error.message);
            throw error;
        }
    }

    /**
     * Utility functions
     */
    generateChecksum(content) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(content).digest('hex');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    /**
     * Display storage dashboard
     */
    async displayDashboard() {
        console.log('\n📊 Report Storage Dashboard');
        console.log('=' .repeat(50));

        try {
            const stats = await getStorageStats();
            
            console.log(`📁 Total Reports: ${stats.totalReports}`);
            console.log(`💾 Total Size: ${this.formatFileSize(stats.totalSize)}`);
            console.log(`🗂️  Archived Reports: ${stats.archivedReports}`);
            console.log(`📈 Average Size: ${this.formatFileSize(stats.averageSize)}`);
            
            if (stats.newestReport) {
                console.log(`🆕 Newest Report: ${stats.newestReport.fileName} (${this.formatDate(stats.newestReport.timestamp)})`);
            }
            
            if (stats.oldestReport) {
                console.log(`📅 Oldest Report: ${stats.oldestReport.fileName} (${this.formatDate(stats.oldestReport.timestamp)})`);
            }

            console.log('\n📊 Report Types:');
            Object.entries(stats.typeBreakdown).forEach(([type, count]) => {
                console.log(`  ${type}: ${count}`);
            });

            console.log('\n📄 File Formats:');
            Object.entries(stats.formatBreakdown).forEach(([format, count]) => {
                console.log(`  ${format}: ${count}`);
            });

        } catch (error) {
            console.error('❌ Error displaying dashboard:', error.message);
        }
    }
}

// Export for use in other modules
module.exports = ReportStorage;

// Run directly if called from command line
if (require.main === module) {
    const storage = new ReportStorage();
    
    // Display help if no arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('📚 Report Storage System');
        console.log('Usage: node report-storage.js <command> [options]');
        console.log('\nCommands:');
        console.log('  list [type] [format]     - List reports with optional filters');
        console.log('  search <query>           - Search reports by content');
        console.log('  stats                    - Show storage statistics');
        console.log('  archive [days]           - Archive reports older than N days (default: 30)');
        console.log('  cleanup                  - Remove duplicate reports');
        console.log('  dashboard                - Show storage dashboard');
        console.log('\nExamples:');
        console.log('  node report-storage.js list consolidated json');
        console.log('  node report-storage.js search "localhost"');
        console.log('  node report-storage.js archive 60');
        return;
    }

    const command = args[0];

    switch (command) {
        case 'list':
            const type = args[1] || null;
            const format = args[2] || null;
            storage.listReports({ type, format }).then(reports => {
                console.log(`\n📋 Found ${reports.length} reports:`);
                reports.forEach((report, index) => {
                    console.log(`${index + 1}. ${report.fileName} (${report.type}/${report.format}) - ${storage.formatDate(report.timestamp)}`);
                    console.log(`   Size: ${storage.formatFileSize(report.size)}, Violations: ${report.violationCount}`);
                });
            });
            break;

        case 'search':
            const query = args[1];
            if (!query) {
                console.log('❌ Please provide a search query');
                return;
            }
            storage.searchReports(query).then(reports => {
                console.log(`\n🔍 Found ${reports.length} matching reports:`);
                reports.forEach((report, index) => {
                    console.log(`${index + 1}. ${report.fileName} - ${storage.formatDate(report.timestamp)}`);
                    console.log(`   URL: ${report.testUrl}, Tools: ${report.tools.join(', ')}`);
                });
            });
            break;

        case 'stats':
            storage.getStorageStats().then(stats => {
                console.log('\n📊 Storage Statistics:');
                console.log(`Total Reports: ${stats.totalReports}`);
                console.log(`Total Size: ${storage.formatFileSize(stats.totalSize)}`);
                console.log(`Archived Reports: ${stats.archivedReports}`);
                console.log(`Average Size: ${storage.formatFileSize(stats.averageSize)}`);
            });
            break;

        case 'archive':
            const days = parseInt(args[1]) || 30;
            storage.archiveOldReports(days);
            break;

        case 'cleanup':
            storage.cleanupDuplicates();
            break;

        case 'dashboard':
            storage.displayDashboard();
            break;

        default:
            console.log(`❌ Unknown command: ${command}`);
            console.log('Run without arguments to see available commands');
    }
}
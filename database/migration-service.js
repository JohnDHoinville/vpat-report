// Migration Service: Convert File-Based Data to Database
// Migrates existing accessibility testing data from file system to PostgreSQL

const fs = require('fs').promises;
const path = require('path');
const { db } = require('./config');

/**
 * Migration Service for Accessibility Testing Platform
 * Converts existing JSON files to database records
 */

class MigrationService {
    constructor() {
        this.reportsDir = path.join(__dirname, '..', 'reports');
        this.consolidatedDir = path.join(this.reportsDir, 'consolidated-reports');
        this.individualDir = path.join(this.reportsDir, 'individual-tests');
        this.authStatesDir = path.join(this.reportsDir, 'auth-states');
        
        this.stats = {
            totalFiles: 0,
            processedFiles: 0,
            skippedFiles: 0,
            errors: 0,
            projectsCreated: 0,
            sessionsCreated: 0,
            resultsCreated: 0,
            pagesCreated: 0
        };
    }

    /**
     * Main migration entry point
     */
    async migrateAll() {
        console.log('🚀 Starting Migration of Existing Test Data');
        console.log('==========================================');
        
        try {
            // Create default project for migrated data
            const project = await this.createMigrationProject();
            
            // Migrate consolidated reports
            await this.migrateConsolidatedReports(project.id);
            
            // Migrate individual test files  
            await this.migrateIndividualTests(project.id);
            
            // Print migration summary
            this.printMigrationSummary();
            
            console.log('\n✅ Migration completed successfully!');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    /**
     * Create a default project for migrated historical data
     */
    async createMigrationProject() {
        console.log('📁 Creating migration project for historical data...');
        
        const project = await db.insert('projects', {
            name: 'Historical Test Data (Migrated)',
            client_name: 'Various Clients',
            primary_url: 'https://migrated-data.example.com',
            description: 'Historical accessibility test data migrated from file-based system',
            status: 'archived'
        });

        if (project) {
            console.log(`✅ Created migration project: ${project.id}`);
            this.stats.projectsCreated++;
            return project;
        } else {
            throw new Error('Failed to create migration project');
        }
    }

    /**
     * Migrate consolidated report files
     */
    async migrateConsolidatedReports(projectId) {
        console.log('\n📊 Migrating consolidated reports...');
        
        try {
            const files = await fs.readdir(this.consolidatedDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            console.log(`Found ${jsonFiles.length} consolidated report files`);
            this.stats.totalFiles += jsonFiles.length;
            
            // Process files in batches to avoid overwhelming the database
            const batchSize = 5;
            for (let i = 0; i < jsonFiles.length; i += batchSize) {
                const batch = jsonFiles.slice(i, i + batchSize);
                await Promise.all(
                    batch.map(file => this.processConsolidatedReport(projectId, file))
                );
            }
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('⚠️ No consolidated reports directory found');
            } else {
                throw error;
            }
        }
    }

    /**
     * Process a single consolidated report file
     */
    async processConsolidatedReport(projectId, fileName) {
        try {
            const filePath = path.join(this.consolidatedDir, fileName);
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Extract batch ID and timestamp from filename
            const batchId = this.extractBatchId(fileName);
            const timestamp = this.extractTimestamp(fileName);
            
            // Create test session for this batch
            const session = await db.insert('test_sessions', {
                project_id: projectId,
                name: `Migrated Batch: ${batchId}`,
                description: `Historical test batch migrated from ${fileName}`,
                status: 'completed',
                test_type: 'full',
                started_at: timestamp,
                completed_at: timestamp,
                progress_summary: {
                    migrated: true,
                    original_file: fileName,
                    total_violations: data.totalViolations || 0
                }
            });

            if (session) {
                this.stats.sessionsCreated++;
                
                // Extract and migrate pages and test results
                await this.migrateTestResults(session.id, data);
                
                console.log(`✅ Migrated consolidated report: ${fileName}`);
                this.stats.processedFiles++;
            }
            
        } catch (error) {
            console.error(`❌ Error processing ${fileName}:`, error.message);
            this.stats.errors++;
        }
    }

    /**
     * Extract and migrate test results from consolidated data
     */
    async migrateTestResults(sessionId, data) {
        // Extract URLs from various possible data structures
        const urls = this.extractUrls(data);
        
        if (urls.length === 0) {
            console.log('⚠️ No URLs found in consolidated report');
            return;
        }

        // Create site discovery and pages
        const discovery = await this.createSiteDiscovery(sessionId, urls[0], urls);
        
        // Create test results for each URL
        for (const url of urls) {
            try {
                // Create discovered page
                const page = await this.createDiscoveredPage(discovery.id, url);
                
                if (page) {
                    // Create automated test result entry
                    await this.createAutomatedResult(sessionId, page.id, data, url);
                }
            } catch (error) {
                console.error(`Error processing URL ${url}:`, error.message);
            }
        }
    }

    /**
     * Create site discovery entry
     */
    async createSiteDiscovery(sessionId, primaryUrl, allUrls) {
        try {
            const domain = new URL(primaryUrl).hostname;
            
            const discovery = await db.insert('site_discovery', {
                project_id: await this.getProjectIdFromSession(sessionId),
                primary_url: primaryUrl,
                domain: domain,
                status: 'completed',
                total_pages_found: allUrls.length,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                notes: 'Migrated from historical test data'
            });

            return discovery;
        } catch (error) {
            console.error('Error creating site discovery:', error.message);
            throw error;
        }
    }

    /**
     * Create discovered page entry
     */
    async createDiscoveredPage(discoveryId, url) {
        try {
            const urlObj = new URL(url);
            const title = `Page: ${urlObj.pathname}`;
            
            const page = await db.insert('discovered_pages', {
                discovery_id: discoveryId,
                url: url,
                title: title,
                page_type: this.inferPageType(url),
                discovered_at: new Date().toISOString()
            });

            if (page) {
                this.stats.pagesCreated++;
            }

            return page;
        } catch (error) {
            // Skip invalid URLs
            console.log(`⚠️ Skipping invalid URL: ${url}`);
            return null;
        }
    }

    /**
     * Create automated test result
     */
    async createAutomatedResult(sessionId, pageId, data, url) {
        try {
            const result = await db.insert('automated_test_results', {
                test_session_id: sessionId,
                page_id: pageId,
                tool_name: 'migrated_data',
                tool_version: 'historical',
                raw_results: {
                    migrated: true,
                    url: url,
                    summary: data.summary || {},
                    timestamp: data.timestamp || new Date().toISOString()
                },
                violations_count: this.extractViolationsCount(data, url),
                warnings_count: 0,
                passes_count: 0,
                executed_at: data.timestamp || new Date().toISOString()
            });

            if (result) {
                this.stats.resultsCreated++;
            }

            return result;
        } catch (error) {
            console.error('Error creating automated result:', error.message);
            return null;
        }
    }

    /**
     * Migrate individual test files
     */
    async migrateIndividualTests(projectId) {
        console.log('\n🔬 Migrating individual test files...');
        
        try {
            const files = await fs.readdir(this.individualDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            console.log(`Found ${jsonFiles.length} individual test files`);
            this.stats.totalFiles += jsonFiles.length;
            
            // Group files by test run ID to create sessions
            const groupedFiles = this.groupFilesByTestRun(jsonFiles);
            
            for (const [testRunId, fileGroup] of Object.entries(groupedFiles)) {
                await this.processTestRunGroup(projectId, testRunId, fileGroup);
            }
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('⚠️ No individual tests directory found');
            } else {
                throw error;
            }
        }
    }

    /**
     * Process a group of files from the same test run
     */
    async processTestRunGroup(projectId, testRunId, files) {
        try {
            // Create session for this test run
            const session = await db.insert('test_sessions', {
                project_id: projectId,
                name: `Individual Test Run: ${testRunId}`,
                description: `Historical individual test run migrated from ${files.length} files`,
                status: 'completed',
                test_type: 'automated_only',
                started_at: this.extractTimestamp(files[0]),
                completed_at: this.extractTimestamp(files[0])
            });

            if (session) {
                this.stats.sessionsCreated++;
                
                // Process each file in the group
                for (const file of files) {
                    await this.processIndividualTestFile(session.id, file);
                }
                
                console.log(`✅ Migrated test run group: ${testRunId} (${files.length} files)`);
            }
            
        } catch (error) {
            console.error(`❌ Error processing test run ${testRunId}:`, error.message);
            this.stats.errors++;
        }
    }

    /**
     * Process individual test file
     */
    async processIndividualTestFile(sessionId, fileName) {
        try {
            const filePath = path.join(this.individualDir, fileName);
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Extract tool name from filename
            const toolName = this.extractToolName(fileName);
            
            // Create placeholder page if needed
            const pageUrl = data.url || data.testUrl || 'https://unknown-migrated-page.com';
            const discovery = await this.createSiteDiscovery(sessionId, pageUrl, [pageUrl]);
            const page = await this.createDiscoveredPage(discovery.id, pageUrl);
            
            if (page) {
                // Create test result
                await db.insert('automated_test_results', {
                    test_session_id: sessionId,
                    page_id: page.id,
                    tool_name: toolName,
                    tool_version: data.toolVersion || 'unknown',
                    raw_results: data,
                    violations_count: this.extractViolationsFromIndividual(data),
                    executed_at: data.timestamp || new Date().toISOString()
                });
                
                this.stats.resultsCreated++;
            }
            
            this.stats.processedFiles++;
            
        } catch (error) {
            console.error(`❌ Error processing individual test ${fileName}:`, error.message);
            this.stats.errors++;
        }
    }

    /**
     * Utility methods
     */

    extractBatchId(fileName) {
        // Extract batch ID from filename patterns like "consolidated-report-test-run-1234567890-abc123.json"
        const match = fileName.match(/test-run-(.+?)\.json$/);
        return match ? match[1] : fileName.replace('.json', '');
    }

    extractTimestamp(fileName) {
        // Try to extract timestamp from filename
        const timestampMatch = fileName.match(/(\d{13})/);
        if (timestampMatch) {
            return new Date(parseInt(timestampMatch[1])).toISOString();
        }
        return new Date().toISOString();
    }

    extractUrls(data) {
        const urls = new Set();
        
        // Try different data structures
        if (data.testUrls && Array.isArray(data.testUrls)) {
            data.testUrls.forEach(url => urls.add(url));
        }
        
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach(result => {
                if (result.url) urls.add(result.url);
                if (result.pageUrl) urls.add(result.pageUrl);
            });
        }
        
        if (data.url) urls.add(data.url);
        if (data.testUrl) urls.add(data.testUrl);
        
        return Array.from(urls);
    }

    extractViolationsCount(data, url) {
        if (data.totalViolations) return data.totalViolations;
        if (data.results && Array.isArray(data.results)) {
            const urlResult = data.results.find(r => r.url === url || r.pageUrl === url);
            if (urlResult && urlResult.violations) {
                return Array.isArray(urlResult.violations) ? urlResult.violations.length : urlResult.violations;
            }
        }
        return 0;
    }

    extractViolationsFromIndividual(data) {
        if (data.violations && Array.isArray(data.violations)) {
            return data.violations.length;
        }
        if (data.issues && Array.isArray(data.issues)) {
            return data.issues.length;
        }
        if (data.results && data.results.violations) {
            return Array.isArray(data.results.violations) ? data.results.violations.length : data.results.violations;
        }
        return 0;
    }

    extractToolName(fileName) {
        if (fileName.includes('axe')) return 'axe';
        if (fileName.includes('pa11y')) return 'pa11y';
        if (fileName.includes('lighthouse')) return 'lighthouse';
        return 'unknown';
    }

    groupFilesByTestRun(files) {
        const groups = {};
        
        files.forEach(file => {
            // Extract test run ID from filename
            const match = file.match(/test-run-(.+?)-[a-z0-9]+\.json$/);
            const testRunId = match ? match[1] : 'unknown';
            
            if (!groups[testRunId]) {
                groups[testRunId] = [];
            }
            groups[testRunId].push(file);
        });
        
        return groups;
    }

    inferPageType(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            
            if (pathname === '/' || pathname === '/index.html') return 'homepage';
            if (pathname.includes('form') || pathname.includes('contact')) return 'form';
            if (pathname.includes('media') || pathname.includes('video')) return 'media';
            if (pathname.includes('nav') || pathname.includes('menu')) return 'navigation';
            return 'content';
        } catch {
            return 'content';
        }
    }

    async getProjectIdFromSession(sessionId) {
        const session = await db.findOne('test_sessions', { id: sessionId });
        return session ? session.project_id : null;
    }

    /**
     * Print migration summary
     */
    printMigrationSummary() {
        console.log('\n📊 Migration Summary');
        console.log('===================');
        console.log(`📁 Total files found: ${this.stats.totalFiles}`);
        console.log(`✅ Files processed: ${this.stats.processedFiles}`);
        console.log(`⚠️ Files skipped: ${this.stats.skippedFiles}`);
        console.log(`❌ Errors: ${this.stats.errors}`);
        console.log(`🏗️ Projects created: ${this.stats.projectsCreated}`);
        console.log(`🧪 Test sessions created: ${this.stats.sessionsCreated}`);
        console.log(`📄 Pages created: ${this.stats.pagesCreated}`);
        console.log(`📋 Test results created: ${this.stats.resultsCreated}`);
        
        const successRate = this.stats.totalFiles > 0 
            ? ((this.stats.processedFiles / this.stats.totalFiles) * 100).toFixed(1)
            : 0;
        console.log(`📈 Success rate: ${successRate}%`);
    }
}

module.exports = MigrationService; 
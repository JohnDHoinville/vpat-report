const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config');

class WebCrawlerImportService {
    constructor() {
        this.pool = pool;
        this.reportsDir = path.join(__dirname, '../../reports');
    }

    /**
     * Import web crawler results from JSON files into database
     */
    async importCrawlerResults(projectId) {
        try {
            console.log(`🕷️ Importing web crawler results for project: ${projectId}`);
            
            // Find all site-crawl JSON files
            const files = await fs.readdir(this.reportsDir);
            const crawlerFiles = files.filter(file => 
                file.startsWith('site-crawl-') && file.endsWith('.json')
            );
            
            console.log(`📁 Found ${crawlerFiles.length} crawler result files`);
            
            const importResults = {
                filesProcessed: 0,
                crawlersCreated: 0,
                pagesImported: 0,
                errors: []
            };
            
            // Process each crawler result file
            for (const fileName of crawlerFiles) {
                try {
                    await this.importSingleCrawlerResult(projectId, fileName);
                    importResults.filesProcessed++;
                } catch (error) {
                    console.error(`❌ Error importing ${fileName}:`, error.message);
                    importResults.errors.push({
                        file: fileName,
                        error: error.message
                    });
                }
            }
            
            console.log(`✅ Imported ${importResults.filesProcessed} crawler result files`);
            return importResults;
            
        } catch (error) {
            console.error('❌ Error importing crawler results:', error);
            throw error;
        }
    }

    /**
     * Import a single crawler result file
     */
    async importSingleCrawlerResult(projectId, fileName) {
        const filePath = path.join(this.reportsDir, fileName);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const crawlData = JSON.parse(fileContent);
        
        console.log(`📄 Processing crawler file: ${fileName}`);
        
        // Extract crawler info from filename and data
        const crawlerInfo = this.extractCrawlerInfo(fileName, crawlData);
        
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Create or find existing web crawler
            const crawler = await this.createOrFindCrawler(client, projectId, crawlerInfo);
            
            // Create crawler run
            const crawlerRun = await this.createCrawlerRun(client, crawler.id, crawlData, fileName);
            
            // Import discovered pages
            const pagesImported = await this.importDiscoveredPages(client, crawler.id, crawlerRun.id, crawlData);
            
            // Update crawler statistics
            await this.updateCrawlerStats(client, crawler.id, crawlData);
            
            await client.query('COMMIT');
            
            console.log(`✅ Imported crawler "${crawlerInfo.name}": ${pagesImported} pages`);
            return { crawler, crawlerRun, pagesImported };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Extract crawler information from filename and data
     */
    extractCrawlerInfo(fileName, crawlData) {
        // Parse filename: site-crawl-Discovery-1d3482d6-69cb-4efb-b766-5fa94b9f8c52-2025-07-17T13-29-41-711Z.json
        const parts = fileName.replace('.json', '').split('-');
        let crawlerName = 'Discovery';
        let timestamp = new Date().toISOString();
        
        // Use current timestamp to avoid date parsing issues
        timestamp = new Date().toISOString();
        
        // Extract crawler name if present
        if (parts.length > 2) {
            crawlerName = parts[2] || 'Discovery';
        }
        
        // Get base URL from crawl data
        const baseUrl = crawlData.summary?.primaryUrl || crawlData.baseUrl || 'https://example.com';
        
        return {
            name: crawlerName,
            baseUrl,
            timestamp,
            fileName
        };
    }

    /**
     * Create or find existing web crawler
     */
    async createOrFindCrawler(client, projectId, crawlerInfo) {
        // Try to find existing crawler
        const existingQuery = `
            SELECT * FROM web_crawlers 
            WHERE project_id = $1 AND base_url = $2
            LIMIT 1
        `;
        
        const existing = await client.query(existingQuery, [projectId, crawlerInfo.baseUrl]);
        
        if (existing.rows.length > 0) {
            return existing.rows[0];
        }
        
        // Create new crawler
        const createQuery = `
            INSERT INTO web_crawlers (
                project_id, name, description, base_url,
                status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const result = await client.query(createQuery, [
            projectId,
            crawlerInfo.name,
            `Imported from ${crawlerInfo.fileName}`,
            crawlerInfo.baseUrl,
            'completed',
            new Date().toISOString(), // Use current time instead of crawlerInfo.timestamp
            new Date().toISOString()  // Use current time instead of crawlerInfo.timestamp
        ]);
        
        return result.rows[0];
    }

    /**
     * Create crawler run record
     */
    async createCrawlerRun(client, crawlerId, crawlData, fileName) {
        const query = `
            INSERT INTO crawler_runs (
                crawler_id, status, started_at, completed_at,
                pages_discovered, pages_crawled, pages_failed,
                triggered_by, run_config
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        
        // Use current timestamp to avoid date parsing issues
        const currentTime = new Date().toISOString();
        const startTime = currentTime;
        const endTime = currentTime;
        
        const result = await client.query(query, [
            crawlerId,
            'completed',
            startTime,
            endTime,
            crawlData.summary?.totalPages || crawlData.pages?.length || 0,
            crawlData.summary?.successfulRequests || crawlData.pages?.length || 0,
            crawlData.summary?.totalErrors || 0,
            'import',
            { imported_from: fileName }
        ]);
        
        return result.rows[0];
    }

    /**
     * Import discovered pages
     */
    async importDiscoveredPages(client, crawlerId, crawlerRunId, crawlData) {
        if (!crawlData.pages || !Array.isArray(crawlData.pages)) {
            console.log('⚠️ No pages found in crawl data');
            return 0;
        }
        
        const insertQuery = `
            INSERT INTO crawler_discovered_pages (
                crawler_run_id, crawler_id, url, title, description,
                status_code, depth, discovered_from, page_size_bytes,
                first_discovered_at, last_crawled_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (crawler_run_id, url) DO NOTHING
        `;
        
        let pagesImported = 0;
        
        for (const page of crawlData.pages) {
            try {
                await client.query(insertQuery, [
                    crawlerRunId,
                    crawlerId,
                    page.url,
                    page.title || 'Untitled Page',
                    page.description || '',
                    page.statusCode || 200,
                    page.depth || 0,
                    page.parentUrl || null,
                    page.contentLength || 0,
                    new Date().toISOString(), // Use current timestamp instead of page.discoveredAt
                    new Date().toISOString()  // Use current timestamp instead of page.lastModified
                ]);
                pagesImported++;
            } catch (error) {
                console.error(`❌ Error importing page ${page.url}:`, error.message);
            }
        }
        
        return pagesImported;
    }

    /**
     * Update crawler statistics
     */
    async updateCrawlerStats(client, crawlerId, crawlData) {
        const updateQuery = `
            UPDATE web_crawlers 
            SET 
                status = 'completed',
                last_run_at = CURRENT_TIMESTAMP,
                total_pages_found = $2,
                total_errors = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;
        
        await client.query(updateQuery, [
            crawlerId,
            crawlData.summary?.totalPages || crawlData.pages?.length || 0,
            crawlData.summary?.totalErrors || 0
        ]);
    }

    /**
     * Import crawler results for a specific project by finding the project's base URL
     */
    async importCrawlerResultsForProject(projectId) {
        try {
            // Get project info
            const projectQuery = await this.pool.query(
                'SELECT id, name, primary_url FROM projects WHERE id = $1',
                [projectId]
            );
            
            if (projectQuery.rows.length === 0) {
                throw new Error('Project not found');
            }
            
            const project = projectQuery.rows[0];
            const projectDomain = new URL(project.primary_url).hostname;
            
            console.log(`🕷️ Importing crawler results for project: ${project.name}`);
            
            // Find crawler files that match this project's domain
            const files = await fs.readdir(this.reportsDir);
            const relevantFiles = [];
            
            for (const file of files) {
                if (file.startsWith('site-crawl-') && file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.reportsDir, file);
                        const fileContent = await fs.readFile(filePath, 'utf8');
                        const crawlData = JSON.parse(fileContent);
                        
                        // Check if this crawl data matches the project
                        const crawlDomain = this.extractDomainFromCrawlData(crawlData);
                        if (crawlDomain && crawlDomain.includes(projectDomain)) {
                            relevantFiles.push(file);
                        }
                    } catch (error) {
                        // Skip files that can't be parsed
                        continue;
                    }
                }
            }
            
            console.log(`📁 Found ${relevantFiles.length} relevant crawler files for ${project.name}`);
            
            const importResults = {
                projectId,
                projectName: project.name,
                filesProcessed: 0,
                crawlersCreated: 0,
                pagesImported: 0,
                errors: []
            };
            
            // Import relevant files
            for (const fileName of relevantFiles) {
                try {
                    const result = await this.importSingleCrawlerResult(projectId, fileName);
                    importResults.filesProcessed++;
                    importResults.pagesImported += result.pagesImported;
                } catch (error) {
                    console.error(`❌ Error importing ${fileName}:`, error.message);
                    importResults.errors.push({
                        file: fileName,
                        error: error.message
                    });
                }
            }
            
            return importResults;
            
        } catch (error) {
            console.error('❌ Error importing crawler results for project:', error);
            throw error;
        }
    }

    /**
     * Extract domain from crawl data
     */
    extractDomainFromCrawlData(crawlData) {
        const primaryUrl = crawlData.summary?.primaryUrl || crawlData.baseUrl || crawlData.url;
        if (primaryUrl) {
            try {
                return new URL(primaryUrl).hostname;
            } catch (error) {
                return null;
            }
        }
        
        // Try to extract from first page
        if (crawlData.pages && crawlData.pages.length > 0) {
            try {
                return new URL(crawlData.pages[0].url).hostname;
            } catch (error) {
                return null;
            }
        }
        
        return null;
    }
}

module.exports = WebCrawlerImportService; 
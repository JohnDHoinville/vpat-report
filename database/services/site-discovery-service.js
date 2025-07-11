const { Pool } = require('pg');
const { pool } = require('../config');
const SiteCrawler = require('../../scripts/site-crawler');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

/**
 * Site Discovery Service
 * Integrates the existing SiteCrawler with the database schema
 * Handles site crawling, page discovery, and database persistence
 */
class SiteDiscoveryService {
    constructor(wsService = null) {
        this.pool = pool;
        this.activeCrawlers = new Map(); // Track running crawlers by discovery ID
        this.wsService = wsService; // WebSocket service for real-time updates
        this.authStatesDir = path.join(__dirname, '../../reports/auth-states');
    }

    /**
     * Start a new site discovery for a project
     * @param {string} projectId - Project UUID
     * @param {string} primaryUrl - URL to start crawling from
     * @param {Object} options - Crawler options
     * @returns {Object} Discovery session info
     */
    async startDiscovery(projectId, primaryUrl, options = {}) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Validate project exists
            const projectCheck = await client.query(
                'SELECT id FROM projects WHERE id = $1',
                [projectId]
            );
            
            if (projectCheck.rows.length === 0) {
                throw new Error(`Project not found: ${projectId}`);
            }

            // Extract domain from URL
            const urlObj = new URL(primaryUrl);
            const domain = urlObj.hostname;

            // Check if there's already an active discovery for this project/domain
            const existingCheck = await client.query(
                'SELECT id, status FROM site_discovery WHERE project_id = $1 AND domain = $2 AND status IN ($3, $4)',
                [projectId, domain, 'pending', 'in_progress']
            );

            if (existingCheck.rows.length > 0) {
                throw new Error(`Site discovery already active for ${domain} in this project`);
            }

            // Create discovery session
            const discoverySettings = {
                maxDepth: options.maxDepth || 3,
                maxPages: options.maxPages || 500,
                respectRobots: options.respectRobots !== false,
                rateLimitMs: options.rateLimitMs || 2000,
                timeout: options.timeout || 10000,
                userAgent: options.userAgent || 'AccessibilityTestingBot/1.0'
            };

            const discoveryResult = await client.query(
                `INSERT INTO site_discovery 
                 (project_id, primary_url, domain, crawl_depth, discovery_settings, status) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING *`,
                [projectId, primaryUrl, domain, discoverySettings.maxDepth, discoverySettings, 'pending']
            );

            const discovery = discoveryResult.rows[0];
            
            await client.query('COMMIT');

            // Emit milestone: Discovery started
            if (this.wsService) {
                this.wsService.emitDiscoveryMilestone(projectId, discovery.id, {
                    type: 'discovery_started',
                    message: `Site discovery started for ${domain}`,
                    primaryUrl,
                    settings: discoverySettings
                });
            }

            // Start the crawling process asynchronously
            this.runDiscovery(discovery.id, primaryUrl, discoverySettings)
                .catch(error => {
                    console.error(`Discovery ${discovery.id} failed:`, error);
                    this.updateDiscoveryStatus(discovery.id, 'failed', { error: error.message });
                });

            return {
                id: discovery.id,
                projectId: discovery.project_id,
                primaryUrl: discovery.primary_url,
                domain: discovery.domain,
                status: discovery.status,
                settings: discovery.discovery_settings,
                startedAt: discovery.started_at
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Check for available authentication sessions for a domain
     * @param {string} url - URL to check authentication for
     * @returns {Object|null} Authentication configuration if available
     */
    async checkAuthenticationAvailable(url) {
        try {
            const domain = new URL(url).hostname;
            
            if (!fs.existsSync(this.authStatesDir)) {
                return null;
            }

            const files = fs.readdirSync(this.authStatesDir);
            
            // Look for live session files for this domain
            const liveSessionFiles = files.filter(f => f.startsWith(`live-session-${domain}-`));
            
            if (liveSessionFiles.length > 0) {
                // Use the most recent live session
                liveSessionFiles.sort((a, b) => {
                    const timestampA = parseInt(a.split('-').pop().replace('.json', ''));
                    const timestampB = parseInt(b.split('-').pop().replace('.json', ''));
                    return timestampB - timestampA;
                });
                
                const sessionFile = path.join(this.authStatesDir, liveSessionFiles[0]);
                
                // Verify the session file exists and is valid
                if (fs.existsSync(sessionFile)) {
                    try {
                        const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
                        return {
                            type: 'live_session',
                            sessionPath: sessionFile,
                            domain: domain,
                            sessionFile: liveSessionFiles[0]
                        };
                    } catch (error) {
                        console.warn(`Invalid session file ${sessionFile}:`, error.message);
                    }
                }
            }
            
            // Look for traditional auth config files
            const authConfigFiles = files.filter(f => f.startsWith(`auth-config-${domain}-`));
            
            if (authConfigFiles.length > 0) {
                // Use the most recent config
                authConfigFiles.sort((a, b) => {
                    const timestampA = parseInt(a.split('-').pop().replace('.json', ''));
                    const timestampB = parseInt(b.split('-').pop().replace('.json', ''));
                    return timestampB - timestampA;
                });
                
                const configFile = path.join(this.authStatesDir, authConfigFiles[0]);
                
                if (fs.existsSync(configFile)) {
                    try {
                        const configData = JSON.parse(fs.readFileSync(configFile, 'utf8'));
                        return {
                            type: 'traditional',
                            authConfig: configData,
                            domain: domain,
                            configFile: authConfigFiles[0]
                        };
                    } catch (error) {
                        console.warn(`Invalid config file ${configFile}:`, error.message);
                    }
                }
            }
            
            return null;
            
        } catch (error) {
            console.warn(`Error checking authentication for ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Run the actual discovery process
     * @param {string} discoveryId - Discovery session UUID
     * @param {string} primaryUrl - URL to crawl
     * @param {Object} settings - Crawler settings
     */
    async runDiscovery(discoveryId, primaryUrl, settings) {
        try {
            // Update status to in_progress
            await this.updateDiscoveryStatus(discoveryId, 'in_progress');

            // Check for authentication for this domain
            let authConfig = null;
            try {
                authConfig = await this.checkAuthenticationAvailable(primaryUrl);
            } catch (error) {
                console.warn(`⚠️ Authentication check failed for ${primaryUrl}:`, error.message);
                // Continue without authentication
            }
            
            // Configure crawler settings with authentication if available
            const crawlerSettings = { ...settings };
            
            if (authConfig) {
                try {
                    crawlerSettings.useAuth = true;
                    if (authConfig.type === 'traditional') {
                        // Ensure auth config has proper URLs with protocols
                        const authConfigWithProtocol = { ...authConfig.authConfig };
                        if (authConfigWithProtocol.loginUrl && !authConfigWithProtocol.loginUrl.startsWith('http')) {
                            const urlObj = new URL(primaryUrl);
                            authConfigWithProtocol.loginUrl = `${urlObj.protocol}//${authConfigWithProtocol.loginUrl}`;
                        }
                        crawlerSettings.authConfig = authConfigWithProtocol;
                    }
                    console.log(`🔐 Using ${authConfig.type} authentication for ${authConfig.domain} (${authConfig.sessionFile || authConfig.configFile})`);
                    
                    // Emit authentication info via WebSocket
                    if (this.wsService) {
                        const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                        this.wsService.emitDiscoveryMilestone(projectId, discoveryId, {
                            type: 'authentication_detected',
                            message: `Using ${authConfig.type} authentication for ${authConfig.domain}`,
                            authType: authConfig.type,
                            domain: authConfig.domain
                        });
                    }
                } catch (error) {
                    console.warn(`⚠️ Authentication setup failed, continuing without authentication:`, error.message);
                    crawlerSettings.useAuth = false;
                    
                    // Emit warning via WebSocket
                    if (this.wsService) {
                        const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                        this.wsService.emitDiscoveryMilestone(projectId, discoveryId, {
                            type: 'authentication_warning',
                            message: `Authentication setup failed, continuing as public site`,
                            warning: error.message
                        });
                    }
                }
            } else {
                console.log(`🌐 No authentication found for ${new URL(primaryUrl).hostname}, crawling as public site`);
            }

            // Create and configure crawler
            const crawler = new SiteCrawler(crawlerSettings);
            this.activeCrawlers.set(discoveryId, crawler);

            // Set up progress callback to update database and broadcast real-time updates
            crawler.onProgress(async (progress) => {
                await this.updateDiscoveryProgress(discoveryId, progress);
                
                // Emit real-time progress via WebSocket
                if (this.wsService) {
                    const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                    
                    // Fix undefined values by using correct property names from crawler
                    const pagesFound = progress.discoveredPages || progress.pagesFound || 0;
                    const currentUrl = progress.currentUrl || progress.url || 'Unknown';
                    const maxPages = crawlerSettings.maxPages || 500;
                    
                    this.wsService.emitDiscoveryProgress(projectId, discoveryId, {
                        stage: 'crawling',
                        percentage: Math.round((pagesFound / maxPages) * 100),
                        pagesFound: pagesFound,
                        currentUrl: currentUrl,
                        depth: progress.currentDepth || progress.depth || 0,
                        message: `Discovered ${pagesFound} pages - Currently crawling: ${currentUrl}`
                    });
                }
            });

            // Start crawling
            const results = await crawler.crawl(primaryUrl, `Discovery-${discoveryId}`);
            
            // Save discovered pages to database
            await this.saveDiscoveredPages(discoveryId, results.pages);
            
            // Update final status
            await this.updateDiscoveryStatus(discoveryId, 'completed', {
                totalPages: results.pages.length,
                totalErrors: results.errors.length,
                summary: results.summary
            });

            // Emit completion event via WebSocket
            if (this.wsService) {
                const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                this.wsService.emitDiscoveryComplete(projectId, discoveryId, {
                    total_pages_found: results.pages.length,
                    total_errors: results.errors.length,
                    duration_ms: results.summary?.duration || 0,
                    status: 'completed',
                    message: `Discovery completed! Found ${results.pages.length} pages`
                });
            }

            // Clean up
            this.activeCrawlers.delete(discoveryId);

            return results;

        } catch (error) {
            await this.updateDiscoveryStatus(discoveryId, 'failed', { error: error.message });
            this.activeCrawlers.delete(discoveryId);
            throw error;
        }
    }

    /**
     * Save discovered pages to database
     * @param {string} discoveryId - Discovery session UUID
     * @param {Array} pages - Array of discovered pages
     */
    async saveDiscoveredPages(discoveryId, pages) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            for (const page of pages) {
                const pageType = this.classifyPageType(page);
                
                await client.query(
                    `INSERT INTO discovered_pages 
                     (discovery_id, url, title, page_type, http_status, content_length, page_metadata, discovered_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (discovery_id, url) DO UPDATE SET
                     title = EXCLUDED.title,
                     page_type = EXCLUDED.page_type,
                     http_status = EXCLUDED.http_status,
                     content_length = EXCLUDED.content_length,
                     page_metadata = EXCLUDED.page_metadata`,
                    [
                        discoveryId,
                        page.url,
                        page.title || 'Untitled Page',
                        pageType,
                        page.statusCode || 200,
                        page.wordCount || 0,
                        {
                            depth: page.depth,
                            parentUrl: page.parentUrl,
                            lastModified: page.lastModified,
                            contentType: page.contentType,
                            wordCount: page.wordCount
                        },
                        page.discoveredAt || new Date().toISOString()
                    ]
                );
            }

            await client.query('COMMIT');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update discovery status and metadata
     * @param {string} discoveryId - Discovery session UUID
     * @param {string} status - New status
     * @param {Object} metadata - Additional metadata to store
     */
    async updateDiscoveryStatus(discoveryId, status, metadata = {}) {
        const client = await this.pool.connect();
        
        try {
            const updates = ['status = $2'];
            const values = [discoveryId, status];
            let paramIndex = 3;

            if (status === 'completed' || status === 'failed') {
                updates.push(`completed_at = $${paramIndex++}`);
                values.push(new Date());
            }

            if (metadata.totalPages) {
                updates.push(`total_pages_found = $${paramIndex++}`);
                values.push(metadata.totalPages);
            }

            if (metadata.error || metadata.summary) {
                updates.push(`notes = $${paramIndex++}`);
                values.push(JSON.stringify(metadata));
            }

            const query = `UPDATE site_discovery SET ${updates.join(', ')} WHERE id = $1`;
            await client.query(query, values);
            
        } catch (error) {
            console.error('Error updating discovery status:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Update discovery progress (called during crawling)
     * @param {string} discoveryId - Discovery session UUID  
     * @param {Object} progress - Progress information from crawler
     */
    async updateDiscoveryProgress(discoveryId, progress) {
        // For now, just log progress. Could be extended to update a progress field
        const pagesFound = progress.discoveredPages || progress.pagesFound || 0;
        console.log(`Discovery ${discoveryId}: ${progress.message} (${pagesFound} pages found)`);
    }

    /**
     * Get discovery status and results
     * @param {string} discoveryId - Discovery session UUID
     * @returns {Object} Discovery information with pages
     */
    async getDiscovery(discoveryId) {
        const client = await this.pool.connect();
        
        try {
            // Get discovery info
            const discoveryResult = await client.query(
                'SELECT * FROM site_discovery WHERE id = $1',
                [discoveryId]
            );

            if (discoveryResult.rows.length === 0) {
                throw new Error(`Discovery not found: ${discoveryId}`);
            }

            const discovery = discoveryResult.rows[0];

            // Get discovered pages
            const pagesResult = await client.query(
                'SELECT * FROM discovered_pages WHERE discovery_id = $1 ORDER BY discovered_at',
                [discoveryId]
            );

            return {
                ...discovery,
                pages: pagesResult.rows,
                isActive: this.activeCrawlers.has(discoveryId)
            };
            
        } finally {
            client.release();
        }
    }

    /**
     * List discoveries for a project
     * @param {string} projectId - Project UUID
     * @param {Object} options - Query options (limit, offset, status)
     * @returns {Array} List of discoveries
     */
    async listDiscoveries(projectId, options = {}) {
        const client = await this.pool.connect();
        
        try {
            let query = `
                SELECT d.*, COUNT(p.id) as page_count 
                FROM site_discovery d 
                LEFT JOIN discovered_pages p ON d.id = p.discovery_id 
                WHERE d.project_id = $1
            `;
            const values = [projectId];
            let paramIndex = 2;

            if (options.status) {
                query += ` AND d.status = $${paramIndex++}`;
                values.push(options.status);
            }

            query += ` GROUP BY d.id ORDER BY d.started_at DESC`;

            if (options.limit) {
                query += ` LIMIT $${paramIndex++}`;
                values.push(options.limit);
            }

            if (options.offset) {
                query += ` OFFSET $${paramIndex++}`;
                values.push(options.offset);
            }

            const result = await client.query(query, values);
            
            return result.rows.map(row => ({
                ...row,
                isActive: this.activeCrawlers.has(row.id)
            }));
            
        } finally {
            client.release();
        }
    }

    /**
     * Stop an active discovery
     * @param {string} discoveryId - Discovery session UUID
     */
    async stopDiscovery(discoveryId) {
        const crawler = this.activeCrawlers.get(discoveryId);
        if (crawler) {
            crawler.stop();
            await this.updateDiscoveryStatus(discoveryId, 'cancelled');
            this.activeCrawlers.delete(discoveryId);
            return true;
        }
        return false;
    }

    /**
     * Delete a discovery and all its pages
     * @param {string} discoveryId - Discovery session UUID
     */
    async deleteDiscovery(discoveryId) {
        // Stop if active
        await this.stopDiscovery(discoveryId);
        
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Delete pages first (foreign key constraint)
            await client.query('DELETE FROM discovered_pages WHERE discovery_id = $1', [discoveryId]);
            
            // Delete discovery
            const result = await client.query('DELETE FROM site_discovery WHERE id = $1', [discoveryId]);
            
            await client.query('COMMIT');
            
            return result.rowCount > 0;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Classify page type based on URL and content
     * @param {Object} page - Page information
     * @returns {string} Page type classification
     */
    classifyPageType(page) {
        const url = page.url.toLowerCase();
        const title = (page.title || '').toLowerCase();
        
        // Homepage detection
        if (page.depth === 0 || url.match(/\/(index|home|default)(\.|$)/)) {
            return 'homepage';
        }
        
        // Form pages
        if (url.includes('contact') || url.includes('form') || url.includes('signup') || url.includes('login') || 
            title.includes('contact') || title.includes('form') || title.includes('sign up') || title.includes('register')) {
            return 'form';
        }
        
        // Navigation pages
        if (url.includes('sitemap') || url.includes('menu') || title.includes('sitemap')) {
            return 'navigation';
        }
        
        // Document/download pages
        if (url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/)) {
            return 'document';
        }
        
        // Media pages
        if (url.includes('gallery') || url.includes('media') || url.includes('images') || url.includes('video')) {
            return 'media';
        }
        
        // Application pages (likely have dynamic content)
        if (url.includes('app') || url.includes('dashboard') || url.includes('admin') || url.includes('portal')) {
            return 'application';
        }
        
        // Default to content
        return 'content';
    }

    /**
     * Get discovery statistics for a project
     * @param {string} projectId - Project UUID
     * @returns {Object} Discovery statistics
     */
    async getProjectDiscoveryStats(projectId) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    COUNT(DISTINCT d.id) as total_discoveries,
                    COUNT(DISTINCT CASE WHEN d.status = 'completed' THEN d.id END) as completed_discoveries,
                    COUNT(DISTINCT CASE WHEN d.status = 'in_progress' THEN d.id END) as active_discoveries,
                    COUNT(p.id) as total_pages_discovered,
                    COUNT(DISTINCT d.domain) as unique_domains
                FROM site_discovery d
                LEFT JOIN discovered_pages p ON d.id = p.discovery_id
                WHERE d.project_id = $1
            `, [projectId]);
            
            return result.rows[0];
            
        } finally {
            client.release();
        }
    }

    /**
     * Get project ID from discovery ID
     * @param {string} discoveryId - Discovery UUID
     * @returns {string} Project UUID
     */
    async getProjectIdFromDiscovery(discoveryId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT project_id FROM site_discovery WHERE id = $1',
                [discoveryId]
            );
            return result.rows[0]?.project_id;
        } finally {
            client.release();
        }
    }

    /**
     * Set WebSocket service for real-time updates
     * @param {WebSocketService} wsService - WebSocket service instance
     */
    setWebSocketService(wsService) {
        this.wsService = wsService;
    }
}

module.exports = SiteDiscoveryService; 
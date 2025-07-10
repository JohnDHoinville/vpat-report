// Site Discovery Service
// Separated crawling system that feeds both automated and manual testing

const { db } = require('../config');
const { URL } = require('url');

class SiteDiscoveryService {
    constructor() {
        this.activeCrawls = new Map();
    }

    // ===========================
    // SITE DISCOVERY MANAGEMENT
    // ===========================

    async createSiteDiscovery(projectId, primaryUrl, config = {}) {
        try {
            console.log(`🕷️ Creating site discovery for ${primaryUrl}`);
            
            const domain = new URL(primaryUrl).hostname;
            
            const defaultConfig = {
                maxDepth: 3,
                maxPages: 100,
                respectRobots: true,
                followExternalLinks: false,
                includeMedia: false,
                crawlFrequency: 'on_demand'
            };

            const siteDiscovery = await db.insert('site_discovery', {
                project_id: projectId,
                primary_url: primaryUrl,
                domain: domain,
                crawl_config: { ...defaultConfig, ...config.crawl },
                auth_config: config.auth || { requiresAuth: false, authType: 'none' },
                status: 'pending',
                notes: config.notes || ''
            });

            console.log(`✅ Created site discovery: ${siteDiscovery.id}`);
            return siteDiscovery;

        } catch (error) {
            console.error('❌ Error creating site discovery:', error);
            throw error;
        }
    }

    async startCrawling(discoveryId) {
        try {
            console.log(`🚀 Starting crawl for discovery: ${discoveryId}`);
            
            const discovery = await db.findById('site_discovery', discoveryId);
            if (!discovery) {
                throw new Error('Site discovery not found');
            }

            // Update status to running
            await db.update('site_discovery', discoveryId, {
                status: 'running',
                last_crawled: new Date()
            });

            // Start crawling process (integrate with existing crawler)
            const crawlResults = await this.performCrawl(discovery);
            
            // Store discovered pages
            const pages = await this.storeDiscoveredPages(discoveryId, crawlResults);
            
            // Update discovery with results
            await db.update('site_discovery', discoveryId, {
                status: 'completed',
                total_pages_found: pages.length,
                crawl_duration_ms: crawlResults.duration
            });

            console.log(`✅ Crawl completed: ${pages.length} pages discovered`);
            return { discovery, pages };

        } catch (error) {
            console.error('❌ Error during crawling:', error);
            
            // Update status to failed
            await db.update('site_discovery', discoveryId, {
                status: 'failed',
                notes: error.message
            });
            
            throw error;
        }
    }

    async performCrawl(discovery) {
        // Integration point with your existing site-crawler.js
        const startTime = Date.now();
        
        try {
            // Import and use existing crawler
            const SiteCrawler = require('../../scripts/site-crawler');
            const crawler = new SiteCrawler();
            
            const crawlConfig = {
                startUrl: discovery.primary_url,
                maxDepth: discovery.crawl_config.maxDepth,
                maxPages: discovery.crawl_config.maxPages,
                respectRobots: discovery.crawl_config.respectRobots,
                authConfig: discovery.auth_config
            };

            const results = await crawler.crawl(crawlConfig);
            
            return {
                pages: results.pages || [],
                errors: results.errors || [],
                duration: Date.now() - startTime
            };

        } catch (error) {
            console.error('❌ Crawl execution failed:', error);
            return {
                pages: [{ 
                    url: discovery.primary_url, 
                    title: 'Primary URL',
                    discovered: 'fallback'
                }],
                errors: [error.message],
                duration: Date.now() - startTime
            };
        }
    }

    async storeDiscoveredPages(discoveryId, crawlResults) {
        const pages = [];
        
        for (const pageData of crawlResults.pages) {
            try {
                const url = new URL(pageData.url);
                
                const page = await db.insert('discovered_pages', {
                    discovery_id: discoveryId,
                    url: pageData.url,
                    path: url.pathname,
                    title: pageData.title || `Page: ${url.pathname}`,
                    page_type: this.determinePageType(pageData),
                    discovery_method: 'crawl',
                    parent_url: pageData.parent || null,
                    depth_level: pageData.depth || 0,
                    requires_auth: pageData.requiresAuth || false,
                    has_forms: pageData.hasForms || false,
                    has_media: pageData.hasMedia || false,
                    has_interactive_elements: pageData.hasInteractive || false,
                    estimated_complexity: this.estimateComplexity(pageData),
                    testing_priority: this.determinePriority(pageData),
                    include_in_testing: true,
                    response_status: pageData.statusCode || 200,
                    content_type: pageData.contentType || 'text/html',
                    page_size_bytes: pageData.size || null,
                    load_time_ms: pageData.loadTime || null,
                    page_metadata: {
                        discovered_at: pageData.timestamp || new Date().toISOString(),
                        user_agent: pageData.userAgent,
                        additional_data: pageData.metadata || {}
                    }
                });
                
                pages.push(page);
                
            } catch (error) {
                console.error(`⚠️ Error storing page ${pageData.url}:`, error.message);
            }
        }
        
        return pages;
    }

    // ===========================
    // PAGE ANALYSIS HELPERS
    // ===========================

    determinePageType(pageData) {
        const url = pageData.url.toLowerCase();
        const title = (pageData.title || '').toLowerCase();
        
        if (url.includes('login') || url.includes('signin') || title.includes('login')) {
            return 'authentication';
        }
        if (url.includes('contact') || url.includes('form') || pageData.hasForms) {
            return 'form';
        }
        if (url === '/' || url.endsWith('/') && url.split('/').length <= 3) {
            return 'homepage';
        }
        if (url.includes('about') || url.includes('help') || url.includes('faq')) {
            return 'content';
        }
        if (url.includes('search') || url.includes('results')) {
            return 'search';
        }
        if (pageData.hasMedia || url.includes('media') || url.includes('gallery')) {
            return 'media';
        }
        
        return 'content';
    }

    estimateComplexity(pageData) {
        let complexity = 0;
        
        // Base complexity factors
        if (pageData.hasForms) complexity += 2;
        if (pageData.hasInteractive) complexity += 2;
        if (pageData.hasMedia) complexity += 1;
        if (pageData.requiresAuth) complexity += 1;
        
        // Size-based complexity
        const size = pageData.size || 0;
        if (size > 1000000) complexity += 2; // > 1MB
        else if (size > 500000) complexity += 1; // > 500KB
        
        // URL complexity
        const pathSegments = new URL(pageData.url).pathname.split('/').length;
        if (pathSegments > 5) complexity += 1;
        
        if (complexity >= 4) return 'high';
        if (complexity >= 2) return 'medium';
        return 'low';
    }

    determinePriority(pageData) {
        const url = pageData.url.toLowerCase();
        
        // Critical pages
        if (url === '/' || url.endsWith('/index') || pageData.isHomepage) {
            return 'critical';
        }
        
        // High priority pages
        if (url.includes('login') || url.includes('contact') || 
            url.includes('checkout') || url.includes('payment')) {
            return 'high';
        }
        
        // Low priority pages
        if (url.includes('archive') || url.includes('old') || 
            url.includes('deprecated') || pageData.statusCode === 404) {
            return 'low';
        }
        
        return 'normal';
    }

    // ===========================
    // DISCOVERY QUERYING
    // ===========================

    async getDiscoveredPages(discoveryId, filters = {}) {
        try {
            let conditions = { discovery_id: discoveryId };
            
            // Add filters
            if (filters.pageType) conditions.page_type = filters.pageType;
            if (filters.priority) conditions.testing_priority = filters.priority;
            if (filters.includeInTesting !== undefined) {
                conditions.include_in_testing = filters.includeInTesting;
            }
            
            const pages = await db.findMany('discovered_pages', conditions, 'testing_priority DESC, created_at ASC');
            
            return pages;
            
        } catch (error) {
            console.error('❌ Error getting discovered pages:', error);
            throw error;
        }
    }

    async getPagesByProject(projectId, filters = {}) {
        try {
            const query = `
                SELECT dp.*, sd.domain, sd.primary_url 
                FROM discovered_pages dp
                JOIN site_discovery sd ON dp.discovery_id = sd.id
                WHERE sd.project_id = $1
                ${filters.pageType ? 'AND dp.page_type = $2' : ''}
                ${filters.includeInTesting !== undefined ? 'AND dp.include_in_testing = $3' : ''}
                ORDER BY dp.testing_priority DESC, dp.created_at ASC
            `;
            
            const params = [projectId];
            if (filters.pageType) params.push(filters.pageType);
            if (filters.includeInTesting !== undefined) params.push(filters.includeInTesting);
            
            const result = await db.query(query, params);
            return result.rows;
            
        } catch (error) {
            console.error('❌ Error getting pages by project:', error);
            throw error;
        }
    }

    // ===========================
    // AUTHENTICATION HANDLING
    // ===========================

    async updateAuthConfig(discoveryId, authConfig) {
        try {
            await db.update('site_discovery', discoveryId, {
                auth_config: authConfig
            });
            
            console.log(`✅ Updated auth config for discovery: ${discoveryId}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error updating auth config:', error);
            throw error;
        }
    }

    async testAuthentication(discoveryId) {
        try {
            const discovery = await db.findById('site_discovery', discoveryId);
            
            if (!discovery.auth_config.requiresAuth) {
                return { success: true, message: 'No authentication required' };
            }
            
            // Test authentication (integrate with existing auth testing)
            // This would connect to your auth-helper.js or auth-wizard.js
            
            console.log(`🔐 Testing authentication for ${discovery.domain}`);
            
            // Placeholder for auth testing logic
            const authResult = { success: true, sessionData: {} };
            
            return authResult;
            
        } catch (error) {
            console.error('❌ Error testing authentication:', error);
            throw error;
        }
    }

    // ===========================
    // INTEGRATION WITH TESTING
    // ===========================

    // Get pages ready for automated testing
    async getPagesForAutomatedTesting(discoveryId, filters = {}) {
        const defaultFilters = {
            include_in_testing: true,
            ...filters
        };
        
        const pages = await this.getDiscoveredPages(discoveryId, defaultFilters);
        
        // Format for existing automated testing system
        return pages.map(page => ({
            url: page.url,
            title: page.title,
            pageType: page.page_type,
            priority: page.testing_priority,
            complexity: page.estimated_complexity,
            requiresAuth: page.requires_auth,
            metadata: page.page_metadata
        }));
    }

    // Get pages ready for manual testing assignment
    async getPagesForManualTesting(discoveryId, filters = {}) {
        const pages = await this.getDiscoveredPages(discoveryId, {
            include_in_testing: true,
            ...filters
        });
        
        // Enrich with testing guidance
        return pages.map(page => ({
            ...page,
            testing_guidance: this.generateTestingGuidance(page),
            estimated_test_time: this.estimateTestingTime(page)
        }));
    }

    generateTestingGuidance(page) {
        const guidance = [];
        
        if (page.has_forms) {
            guidance.push('Focus on form accessibility: labels, error handling, keyboard navigation');
        }
        if (page.has_media) {
            guidance.push('Test media alternatives: captions, audio descriptions, transcripts');
        }
        if (page.has_interactive_elements) {
            guidance.push('Verify interactive element accessibility: focus indicators, ARIA labels');
        }
        if (page.requires_auth) {
            guidance.push('Test authenticated state accessibility and error messages');
        }
        
        return guidance;
    }

    estimateTestingTime(page) {
        let minutes = 15; // Base testing time
        
        if (page.estimated_complexity === 'high') minutes += 30;
        else if (page.estimated_complexity === 'medium') minutes += 15;
        
        if (page.has_forms) minutes += 20;
        if (page.has_media) minutes += 15;
        if (page.has_interactive_elements) minutes += 10;
        
        return minutes;
    }
}

module.exports = SiteDiscoveryService; 
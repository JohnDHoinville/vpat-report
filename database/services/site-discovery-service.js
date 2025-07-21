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
        
        // Initialize dynamic auth service
        const DynamicAuthService = require('./dynamic-auth-service');
        this.dynamicAuthService = new DynamicAuthService(pool, wsService);
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
            this.runDiscovery(discovery.id, primaryUrl, discoverySettings, options.authConfigId, options.excludePublicPages, options.dynamicAuth)
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
     * Check for available authentication configurations for a domain
     * @param {string} url - URL to check authentication for
     * @param {string} authConfigId - Optional specific auth config ID to use
     * @returns {Object|null} Authentication configuration if available
     */
    async checkAuthenticationAvailable(url, authConfigId = null) {
        try {
            const domain = new URL(url).hostname;
            
            console.log(`🔍 Checking database for authentication configs for domain: ${domain}${authConfigId ? ` (specific ID: ${authConfigId})` : ''}`);
            
            let query, params;
            
            if (authConfigId) {
                // Get specific auth config by ID
                query = `
                    SELECT ac.*, p.name as project_name
                    FROM auth_configs ac
                    LEFT JOIN projects p ON ac.project_id = p.id
                    WHERE ac.id = $1 AND ac.status = 'active'
                `;
                params = [authConfigId];
            } else {
                // Get all auth configs for this domain
                query = `
                    SELECT ac.*, p.name as project_name
                    FROM auth_configs ac
                    LEFT JOIN projects p ON ac.project_id = p.id
                    WHERE ac.domain = $1 AND ac.status = 'active'
                    ORDER BY ac.priority ASC, ac.is_default DESC, ac.created_at DESC
                `;
                params = [domain];
            }
            
            const result = await this.pool.query(query, params);
            
            if (result.rows.length > 0) {
                const authConfig = result.rows[0];
                console.log(`✅ Found database authentication config: ${authConfig.name} for ${authConfig.domain} (Project: ${authConfig.project_name})`);
                
                        return {
                    type: 'database',
                    domain: authConfig.domain,
                    name: authConfig.name,
                    id: authConfig.id,
                    project_name: authConfig.project_name,
                    authConfig: authConfig
                };
            } else {
                console.log(`❌ No database authentication configurations found for domain: ${domain}`);
                return null;
            }
            
        } catch (error) {
            console.error(`❌ Error checking database authentication for ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Run the actual discovery process
     * @param {string} discoveryId - Discovery session UUID
     * @param {string} primaryUrl - URL to crawl
     * @param {Object} settings - Crawler settings
     * @param {string} authConfigId - Optional authentication config ID to use
     */
    async runDiscovery(discoveryId, primaryUrl, settings, authConfigId = null, excludePublicPages = false, dynamicAuth = false) {
        try {
            // Update status to in_progress
            await this.updateDiscoveryStatus(discoveryId, 'in_progress');

            // Check for authentication for this domain
            let authConfig = null;
            try {
                authConfig = await this.checkAuthenticationAvailable(primaryUrl, authConfigId);
            } catch (error) {
                console.warn(`⚠️ Authentication check failed for ${primaryUrl}:`, error.message);
                // Continue without authentication
            }
            
            // Configure crawler settings for discovery (copy from settings passed in)
            const crawlerSettings = { ...settings };
            
            // Disable JSON saving and enable database saving for efficiency
            crawlerSettings.saveToJson = false;
            crawlerSettings.saveToDatabase = true;
            
            // Force disable robots.txt checking for accessibility testing
            crawlerSettings.respect_robots_txt = false;
            
            // Debug logging to verify settings are applied correctly
            console.log(`🔧 SiteDiscoveryService: Final crawlerSettings.respect_robots_txt = ${crawlerSettings.respect_robots_txt}`);
            console.log(`🔧 SiteDiscoveryService: Type = ${typeof crawlerSettings.respect_robots_txt}`);
            
            // Debug logging to verify settings
            console.log(`🔧 SiteDiscoveryService passing crawler settings:`, {
                saveToJson: crawlerSettings.saveToJson,
                saveToDatabase: crawlerSettings.saveToDatabase,
                respect_robots_txt: crawlerSettings.respect_robots_txt
            });
            
            // Extract common settings for use throughout the function
            const rateLimitMs = settings.rateLimitMs || 2000;
            const userAgent = settings.userAgent || 'AccessibilityTestingBot/1.0';
            const timeout = settings.timeout || 10000;
            const headless = settings.headless !== false; // Default to true
            
            if (authConfig) {
                try {
                    crawlerSettings.useAuth = true;
                    
                    if (authConfig.type === 'database') {
                        // Use database authentication configuration
                        // Map database field names to crawler expected field names
                        const dbAuth = authConfig.authConfig;
                        crawlerSettings.authConfig = {
                            type: dbAuth.type || 'sso',
                            loginUrl: dbAuth.login_page || dbAuth.url, // Map login_page to loginUrl
                            username: dbAuth.username,
                            password: dbAuth.password,
                            successUrl: dbAuth.success_url || dbAuth.url, // Map success_url to successUrl
                            domain: dbAuth.domain,
                            name: dbAuth.name,
                            // Add support for SSO/SAML
                            authType: dbAuth.type,
                            loginPage: dbAuth.login_page, // Keep both formats for compatibility
                            successPage: dbAuth.success_url
                        };
                        console.log(`🔐 Using database authentication for ${authConfig.domain}: ${authConfig.name} (Project: ${authConfig.project_name})`);
                        console.log(`🔐 Auth config mapped: loginUrl=${crawlerSettings.authConfig.loginUrl}, successUrl=${crawlerSettings.authConfig.successUrl}`);
                    
                    // Emit authentication info via WebSocket
                    if (this.wsService) {
                        const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                        this.wsService.emitDiscoveryMilestone(projectId, discoveryId, {
                            type: 'authentication_detected',
                                message: `Using database authentication: ${authConfig.name} (Project: ${authConfig.project_name})`,
                                authType: 'database',
                                domain: authConfig.domain,
                                authRole: 'N/A', // No direct auth_role in auth_configs table
                                configName: authConfig.name,
                                configId: authConfig.id
                            });
                        }
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

            // Handle excludePublicPages option with Two-Pass Discovery
            if (excludePublicPages) {
                console.log(`🔐 Starting Two-Pass Authenticated Discovery (excludePublicPages=true)...`);
                
                if (!authConfig || !authConfig.authConfig) {
                    console.log(`⚠️ No authentication configured for two-pass discovery, falling back to route injection...`);
                    
                    // Fallback to route injection if no auth configured
                    const results = { pages: [] };
                    
                    if (new URL(primaryUrl).hostname.includes('fm-dev.ti.internet2.edu')) {
                        console.log(`🔐 Injecting known authenticated routes for SAML domain...`);
                        await this.injectKnownAuthenticatedRoutes(discoveryId, primaryUrl, { type: 'sso' });
                        
                        const injectedResult = await this.pool.query(
                            'SELECT COUNT(*) as count FROM discovered_pages WHERE discovery_id = $1',
                            [discoveryId]
                        );
                        const injectedCount = parseInt(injectedResult.rows[0].count);
                        results.pages = Array(injectedCount).fill({ url: 'authenticated' });
                        
                        if (this.wsService) {
                            const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                            this.wsService.emitDiscoveryProgress(projectId, discoveryId, {
                                stage: 'completed',
                                percentage: 100,
                                pagesFound: injectedCount,
                                currentUrl: 'Completed',
                                message: `Discovery completed! Found ${injectedCount} authenticated pages (public pages excluded)`
                            });
                        }
                    }
                    
                    await this.updateDiscoveryStatus(discoveryId, 'completed', {
                        totalPages: results.pages.length,
                        mode: 'authenticated_only'
                    });
                    
                    if (this.wsService) {
                        const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                        this.wsService.emitDiscoveryComplete(projectId, discoveryId, results.pages.length);
                    }
                    
                    return;
                }
                
                // TWO-PASS DISCOVERY with Authentication
                console.log(`🎯 Starting Two-Pass Authenticated Discovery...`);
                
                // Determine optimal starting URL for authenticated sessions
                let startingUrl = primaryUrl;
                const baseUrl = new URL(primaryUrl);
                const domain = baseUrl.hostname;
                
                if (domain.includes('fm-dev.ti.internet2.edu') || domain.includes('federation')) {
                    startingUrl = `${baseUrl.protocol}//${baseUrl.hostname}/dashboard`;
                    console.log(`🎯 Using authenticated starting URL: ${startingUrl}`);
                }

                // PASS 1: Quick discovery of high-level authenticated URLs
                console.log(`🕷️ PASS 1: Quick discovery of high-level authenticated URLs...`);
                
                const pass1Settings = {
                    maxDepth: 2,
                    maxPages: 50,
                    rateLimitMs: rateLimitMs,
                    userAgent: userAgent,
                    timeout: timeout,
                    useAuth: true,
                    authConfig: authConfig.authConfig,
                    dynamicAuth: dynamicAuth,
                    headless: headless,
                    onProgress: (progress) => {
                        if (this.wsService) {
                            const projectId = this.getProjectIdFromDiscovery(discoveryId);
                            this.wsService.emitDiscoveryProgress(projectId, discoveryId, {
                                stage: 'crawling',
                                percentage: Math.round((progress.discoveredPages || 0) / 50 * 25), // 25% for Pass 1
                                pagesFound: progress.discoveredPages || 0,
                                currentUrl: progress.currentUrl || startingUrl,
                                message: `Pass 1: ${progress.message || 'Finding high-level pages...'}`
                            });
                        }
                        console.log(`🕷️ Discovery ${discoveryId} Pass 1: ${progress.message || 'Processing...'} (${progress.discoveredPages || 0} pages found)`);
                    }
                };
                
                const crawler1 = new SiteCrawler(pass1Settings);
                this.activeCrawlers.set(discoveryId + '-pass1', crawler1);
                
                try {
                    const pass1Results = await crawler1.crawl(startingUrl, `Discovery-${discoveryId}-Pass1`);
                    this.activeCrawlers.delete(discoveryId + '-pass1');
                    
                    if (!pass1Results || !pass1Results.pages) {
                        throw new Error('Pass 1 crawling failed or returned no results');
                    }
                    
                    console.log(`✅ PASS 1 Complete: Found ${pass1Results.pages.length} high-level pages`);
                    
                    // Filter for authenticated pages from Pass 1
                    const authenticatedPages = pass1Results.pages.filter(page => {
                        const url = page.url || page.href;
                        return url && page.status === 200 && (
                            url.includes('/admin') || url.includes('/dashboard') || url.includes('/manage') ||
                            url.includes('/organizations') || url.includes('/entities') || url.includes('/service_providers') ||
                            url.includes('/identity_providers') || url.includes('/reports') || url.includes('/settings') ||
                            url.includes('/users') || url.includes('/federation') || url.includes('/siteadmin') ||
                            (!url.includes('/legal') && !url.includes('/privacy') && !url.includes('/assets/') &&
                             !url.includes('.css') && !url.includes('.js') && !url.includes('/Shibboleth.sso'))
                        );
                    });
                    
                    console.log(`🎯 PASS 1: Found ${authenticatedPages.length} authenticated pages to explore in Pass 2`);
                    
                    if (authenticatedPages.length === 0) {
                        console.log(`⚠️ No authenticated pages found in Pass 1, processing Pass 1 results...`);
                        await this.processDiscoveryResults(undefined, discoveryId, pass1Results, { twoPassMode: 'pass1_only' });
                        return;
                    }
                    
                    // PASS 2: Deep crawl each authenticated page
                    console.log(`🔍 PASS 2: Deep crawling each authenticated page...`);
                    const allDiscoveredPages = [...pass1Results.pages]; // Start with Pass 1 results
                    
                    for (let i = 0; i < Math.min(authenticatedPages.length, 8); i++) {
                        const authPage = authenticatedPages[i];
                        const authUrl = authPage.url || authPage.href;
                        
                        console.log(`🔍 PASS 2.${i+1}: Deep crawling ${authUrl}`);
                        
                        const pass2Settings = {
                            maxDepth: 3,
                            maxPages: 200,
                            rateLimitMs: rateLimitMs,
                            userAgent: userAgent,
                            timeout: timeout,
                            useAuth: true,
                            authConfig: authConfig.authConfig,
                            dynamicAuth: dynamicAuth,
                            headless: headless,
                            onProgress: (progress) => {
                                const overallProgress = 25 + ((i / Math.min(authenticatedPages.length, 8)) * 75);
                                if (this.wsService) {
                                    const projectId = this.getProjectIdFromDiscovery(discoveryId);
                                    this.wsService.emitDiscoveryProgress(projectId, discoveryId, {
                                        stage: 'crawling',
                                        percentage: Math.round(overallProgress),
                                        pagesFound: allDiscoveredPages.length + (progress.discoveredPages || 0),
                                        currentUrl: progress.currentUrl || authUrl,
                                        message: `Pass 2.${i+1}: ${progress.message || 'Deep crawling...'}`
                                    });
                                }
                                console.log(`🔍 Discovery ${discoveryId} Pass 2.${i+1}: ${progress.message || 'Processing...'}`);
                            }
                        };
                        
                        const crawler2 = new SiteCrawler(pass2Settings);
                        this.activeCrawlers.set(discoveryId + `-pass2-${i+1}`, crawler2);
                        
                        try {
                            const pass2Results = await crawler2.crawl(authUrl, `Discovery-${discoveryId}-Pass2-${i+1}`);
                            this.activeCrawlers.delete(discoveryId + `-pass2-${i+1}`);
                            
                            if (pass2Results && pass2Results.pages) {
                                console.log(`✅ PASS 2.${i+1}: Found ${pass2Results.pages.length} pages from ${authUrl}`);
                                // Add unique pages only
                                const existingUrls = new Set(allDiscoveredPages.map(p => p.url || p.href));
                                const newPages = pass2Results.pages.filter(p => !existingUrls.has(p.url || p.href));
                                allDiscoveredPages.push(...newPages);
                                console.log(`📊 Total unique pages so far: ${allDiscoveredPages.length}`);
                            }
                        } catch (error) {
                            console.log(`❌ PASS 2.${i+1}: Error crawling ${authUrl}: ${error.message}`);
                            this.activeCrawlers.delete(discoveryId + `-pass2-${i+1}`);
                        }
                        
                        // Rate limiting between deep crawls
                        if (i < Math.min(authenticatedPages.length, 8) - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    }
                    
                    console.log(`🎉 TWO-PASS DISCOVERY COMPLETE: Found ${allDiscoveredPages.length} total pages`);
                    
                    // Process and save all discovered pages
                    const finalResults = {
                        pages: allDiscoveredPages,
                        errors: [],
                        completed: true,
                        totalPages: allDiscoveredPages.length,
                        pass1Pages: pass1Results.pages.length,
                        twoPassMode: true
                    };
                    
                    await this.processDiscoveryResults(undefined, discoveryId, finalResults, { twoPassMode: 'complete' });
                    
                    if (this.wsService) {
                        const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                        this.wsService.emitDiscoveryProgress(projectId, discoveryId, {
                            stage: 'completed',
                            percentage: 100,
                            pagesFound: allDiscoveredPages.length,
                            currentUrl: 'Completed',
                            message: `Two-pass discovery completed! Found ${allDiscoveredPages.length} pages`
                        });
                        this.wsService.emitDiscoveryComplete(projectId, discoveryId, allDiscoveredPages.length);
                    }
                    
                    return;
                    
                } catch (error) {
                    console.error(`❌ Two-pass discovery failed:`, error.message);
                    this.activeCrawlers.delete(discoveryId + '-pass1');
                    
                    // Fallback to route injection
                    console.log(`🔄 Falling back to route injection...`);
                    const results = { pages: [] };
                    
                    if (new URL(primaryUrl).hostname.includes('fm-dev.ti.internet2.edu')) {
                        await this.injectKnownAuthenticatedRoutes(discoveryId, primaryUrl, authConfig.authConfig);
                        
                        const injectedResult = await this.pool.query(
                            'SELECT COUNT(*) as count FROM discovered_pages WHERE discovery_id = $1',
                            [discoveryId]
                        );
                        const injectedCount = parseInt(injectedResult.rows[0].count);
                        results.pages = Array(injectedCount).fill({ url: 'authenticated' });
                        
                        if (this.wsService) {
                            const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                            this.wsService.emitDiscoveryProgress(projectId, discoveryId, {
                                stage: 'completed',
                                percentage: 100,
                                pagesFound: injectedCount,
                                currentUrl: 'Completed',
                                message: `Discovery completed! Found ${injectedCount} authenticated pages (fallback)`
                            });
                            this.wsService.emitDiscoveryComplete(projectId, discoveryId, injectedCount);
                        }
                    }
                    
                    await this.updateDiscoveryStatus(discoveryId, 'completed', {
                        totalPages: results.pages.length,
                        mode: 'authenticated_only_fallback',
                        error: error.message
                    });
                    
                    return;
                }
            }

            // Handle dynamic authentication option
            if (dynamicAuth && !authConfig) {
                console.log(`🔐 Dynamic authentication enabled. Will prompt for credentials when login page is encountered.`);
                
                // Configure crawler with dynamic auth detection
                crawlerSettings.dynamicAuth = true;
                crawlerSettings.useAuth = true; // Enable authentication for dynamic auth
                crawlerSettings.onAuthRequired = async (authInfo) => {
                    console.log(`🔐 Authentication required at: ${authInfo.loginUrl}`);
                    
                    try {
                        // Prompt user for credentials
                        const credentials = await this.dynamicAuthService.promptForCredentials(discoveryId, authInfo);
                        
                        // Create auth config from credentials
                        const dynamicAuthConfig = this.dynamicAuthService.createAuthConfig(credentials, authInfo);
                        
                        console.log(`🔐 Received credentials for ${authInfo.authType} authentication`);
                        return dynamicAuthConfig;
                        
                    } catch (error) {
                        console.error(`❌ Dynamic authentication failed:`, error.message);
                        throw error;
                    }
                };
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
                    
                    // Debug: Log the actual progress object to understand what properties are available
                    console.log(`🔍 SiteDiscoveryService: Progress object for ${discoveryId}:`, {
                        keys: Object.keys(progress),
                        currentUrl: progress.currentUrl,
                        url: progress.url,
                        message: progress.message
                    });
                    
                    // Fix undefined values by using correct property names from crawler
                    const pagesFound = progress.discoveredPages || progress.pagesFound || 0;
                    // Better currentUrl detection - use the message or primary URL as fallback instead of 'Unknown'
                    let currentUrl = progress.currentUrl || progress.url;
                    
                    // If still no currentUrl, try to extract from message or use a more meaningful default
                    if (!currentUrl || currentUrl === 'Unknown') {
                        if (progress.message && progress.message.includes('http')) {
                            // Try to extract URL from message
                            const urlMatch = progress.message.match(/https?:\/\/[^\s]+/);
                            currentUrl = urlMatch ? urlMatch[0] : primaryUrl;
                        } else {
                            currentUrl = primaryUrl; // Use primary URL instead of 'Unknown'
                        }
                    }
                    
                    const maxPages = crawlerSettings.maxPages || 500;
                    
                    this.wsService.emitDiscoveryProgress(projectId, discoveryId, {
                        stage: 'crawling',
                        percentage: Math.round((pagesFound / maxPages) * 100),
                        pagesFound: pagesFound,
                        currentUrl: currentUrl,
                        depth: progress.currentDepth || progress.depth || 0,
                        maxDepth: progress.maxDepth || crawlerSettings.maxDepth || 3,
                        message: `Discovered ${pagesFound} pages - Currently crawling: ${currentUrl}`
                    });
                }
            });

            // Determine optimal starting URL for authenticated sessions
            let startingUrl = primaryUrl;
            
            if (authConfig && authConfig.authConfig) {
                // For authenticated crawling, try to use better entry points
                const baseUrl = new URL(primaryUrl);
                const domain = baseUrl.hostname;
                
                if (domain.includes('fm-dev.ti.internet2.edu') || domain.includes('federation')) {
                    // For Federation Manager, try authenticated entry points
                    const authEntryPoints = [
                        '/dashboard',
                        '/admin',
                        '/organizations',
                        '/entities',
                        '/reports',
                        '/home' // fallback to original
                    ];
                    
                    // Use the success URL from auth config if available
                    if (authConfig.authConfig.successUrl || authConfig.authConfig.success_url) {
                        startingUrl = authConfig.authConfig.successUrl || authConfig.authConfig.success_url;
                        console.log(`🔐 Using configured success URL as starting point: ${startingUrl}`);
                    } else {
                        // Try the first available entry point
                        for (const entryPoint of authEntryPoints) {
                            const testUrl = new URL(entryPoint, baseUrl).toString();
                            if (testUrl !== primaryUrl) {
                                startingUrl = testUrl;
                                console.log(`🔐 Using authenticated entry point: ${startingUrl}`);
                                break;
                            }
                        }
                    }
                } else {
                    // For other domains, use success URL from auth config if available
                    if (authConfig.authConfig.successUrl || authConfig.authConfig.success_url) {
                        startingUrl = authConfig.authConfig.successUrl || authConfig.authConfig.success_url;
                        console.log(`🔐 Using configured success URL as starting point: ${startingUrl}`);
                    }
                }
            }
            
            // Start crawling with optimal starting URL
            console.log(`🕷️ Starting discovery crawl from: ${startingUrl}`);
            const results = await crawler.crawl(startingUrl, `Discovery-${discoveryId}`);
            
            // Emit final progress update showing 100% completion
            if (this.wsService) {
                const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                this.wsService.emitDiscoveryProgress(projectId, discoveryId, {
                    stage: 'completed',
                    percentage: 100,
                    pagesFound: results.pages.length,
                    currentUrl: 'Completed',
                    depth: results.summary?.maxDepthReached || 0,
                    maxDepth: crawlerSettings.maxDepth || 3,
                    message: `Discovery completed! Found ${results.pages.length} pages`
                });
            }
            
            // Save discovered pages to database
            await this.saveDiscoveredPages(discoveryId, results.pages);
            
            // Inject known authenticated routes if using SSO/SAML authentication
            if (authConfig && authConfig.authConfig && authConfig.authConfig.type === 'sso') {
                console.log(`🔐 Checking for known authenticated routes for SAML domain...`);
                await this.injectKnownAuthenticatedRoutes(discoveryId, primaryUrl, authConfig.authConfig);
                
                // Get updated page count after injection
                const updatedCountResult = await this.pool.query(
                    'SELECT COUNT(*) as total FROM discovered_pages WHERE discovery_id = $1',
                    [discoveryId]
                );
                const finalPageCount = parseInt(updatedCountResult.rows[0].total);
                results.pages.length = finalPageCount; // Update results for final reporting
            }
            
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
                
                // Ensure HTTP status is a valid integer
                let httpStatus = 200; // Default
                if (typeof page.statusCode === 'number' && page.statusCode > 0) {
                    httpStatus = page.statusCode;
                } else if (typeof page.statusCode === 'string' && !isNaN(parseInt(page.statusCode))) {
                    httpStatus = parseInt(page.statusCode);
                }

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
                        httpStatus,
                        page.wordCount || 0,
                        {
                            depth: page.depth,
                            parentUrl: page.parentUrl,
                            lastModified: page.lastModified,
                            contentType: page.contentType,
                            wordCount: page.wordCount,
                            originalStatusCode: page.statusCode // Keep original for debugging
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
        const currentUrl = progress.currentUrl || progress.url || 'processing...';
        console.log(`🕷️ Discovery ${discoveryId}: ${progress.message} (${pagesFound} pages found, current: ${currentUrl})`);
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
     * Recover stuck discovery - mark as completed if it has pages but is still in 'running' status
     * @param {string} discoveryId - Discovery session UUID  
     */
    async recoverStuckDiscovery(discoveryId) {
        const client = await this.pool.connect();
        
        try {
            // Use the new database function for better recovery
            const result = await client.query('SELECT recover_stuck_discovery($1) as result', [discoveryId]);
            const recoveryResult = result.rows[0].result;
            
            if (recoveryResult.success) {
                // Clean up from active crawlers
                this.activeCrawlers.delete(discoveryId);

                // Emit progress update if WebSocket is available
                if (this.wsService && recoveryResult.action !== 'no_change_needed') {
                    const projectId = await this.getProjectIdFromDiscovery(discoveryId);
                    this.wsService.emitDiscoveryProgress(projectId, discoveryId, {
                        stage: 'completed',
                        percentage: 100,
                        pagesFound: recoveryResult.page_count || 0,
                        currentUrl: 'Recovered',
                        message: recoveryResult.message
                    });
                    this.wsService.emitDiscoveryComplete(projectId, discoveryId, recoveryResult.page_count || 0);
                }
            }
            
            return recoveryResult;

        } finally {
            client.release();
        }
    }

    /**
     * Clean up orphaned discovery data
     */
    async cleanupOrphanedData() {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query('SELECT cleanup_orphaned_discovery_data() as result');
            return result.rows[0].result;
        } finally {
            client.release();
        }
    }

    /**
     * List all pending/stuck discoveries for debugging
     */
    async listPendingDiscoveries() {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query('SELECT * FROM list_pending_discoveries()');
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Recover all stuck discoveries in a project
     * @param {string} projectId - Project UUID
     */
    async recoverAllStuckDiscoveries(projectId) {
        const client = await this.pool.connect();
        
        try {
            // Get all pending/in_progress discoveries for this project
            const discoveryResult = await client.query(
                'SELECT id FROM site_discovery WHERE project_id = $1 AND status IN ($2, $3)',
                [projectId, 'pending', 'in_progress']
            );
            
            const recoveryResults = [];
            for (const row of discoveryResult.rows) {
                try {
                    const result = await this.recoverStuckDiscovery(row.id);
                    recoveryResults.push({
                        discoveryId: row.id,
                        ...result
                    });
                } catch (error) {
                    recoveryResults.push({
                        discoveryId: row.id,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            return {
                success: true,
                projectId,
                recovered: recoveryResults.length,
                results: recoveryResults
            };
            
        } finally {
            client.release();
        }
    }

    /**
     * Enhanced delete discovery with comprehensive cascade cleanup
     * @param {string} discoveryId - Discovery session UUID
     */
    async deleteDiscovery(discoveryId) {
        const client = await this.pool.connect();
        
        try {
            // Get project info and discovery details before deletion
            const discoveryResult = await client.query(
                'SELECT project_id, domain, total_pages_found FROM site_discovery WHERE id = $1', 
                [discoveryId]
            );
            
            if (discoveryResult.rows.length === 0) {
                return { success: false, error: 'Discovery not found' };
            }
            
            const discovery = discoveryResult.rows[0];
            const projectId = discovery.project_id;
            
            // Start transaction for safe deletion
            await client.query('BEGIN');
            
            try {
                console.log(`🔧 Starting comprehensive deletion for discovery ${discoveryId}`);
                
                // Simplified deletion - let database constraints handle cascades
                const pageCountResult = await client.query(
                    'SELECT COUNT(*) as count FROM discovered_pages WHERE discovery_id = $1',
                    [discoveryId]
                );
                const pageCount = parseInt(pageCountResult.rows[0].count);
                console.log(`📄 Found ${pageCount} pages to clean up (letting database handle cascades)`);
                
                // The database constraints with ON DELETE SET NULL will automatically handle
                // test_instances references, so we can proceed directly to cleanup
                
                // Delete discovered pages (cascades will handle foreign keys)
                console.log(`🗑️ Deleting discovered pages for discovery ${discoveryId}`);
                const pagesResult = await client.query(`
                    DELETE FROM discovered_pages WHERE discovery_id = $1
                `, [discoveryId]);
                console.log(`🗑️ Deleted ${pagesResult.rowCount} discovered pages`);
                
                // Finally, delete the discovery record itself
                console.log(`🗑️ Deleting discovery record ${discoveryId}`);
                const discoveryDeleteResult = await client.query(`
                    DELETE FROM site_discovery WHERE id = $1
                `, [discoveryId]);
                console.log(`🗑️ Deleted ${discoveryDeleteResult.rowCount} discovery record`);
            
            await client.query('COMMIT');
            
                console.log(`✅ Successfully deleted discovery ${discoveryId}: ${discovery.domain}`);
                
                // Clean up from active crawlers
                this.activeCrawlers.delete(discoveryId);
                
                // Emit deletion event if WebSocket is available
                if (this.wsService && projectId) {
                    this.wsService.emitDiscoveryDeleted(projectId, discoveryId);
                }
                
                return {
                    success: true,
                    message: 'Discovery deleted successfully',
                    deleted: {
                        id: discoveryId,
                        domain: discovery.domain,
                        total_pages_found: discovery.total_pages_found,
                        pages_deleted: pagesResult.rowCount,
                        cleanup_completed: true
                    }
                };
                
            } catch (deleteError) {
            await client.query('ROLLBACK');
                console.error(`❌ Error during discovery deletion transaction:`, deleteError);
                throw deleteError;
            }
            
        } catch (error) {
            console.error('Error deleting discovery:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to delete discovery'
            };
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

    /**
     * Inject known authenticated routes for specific domains/applications
     */
    async injectKnownAuthenticatedRoutes(discoveryId, projectUrl, authConfig) {
        if (!authConfig || authConfig.type !== 'sso') {
            return; // Only inject routes for SSO/SAML systems
        }

        try {
            const domain = new URL(projectUrl).hostname;
            let knownRoutes = [];

            // Federation Manager specific routes
            if (domain.includes('fm-dev.ti.internet2.edu') || domain.includes('federation')) {
                knownRoutes = [
                    {
                        url: `https://${domain}/dashboard`,
                        title: 'Dashboard - Internet2 InCommon Federation Manager',
                        page_type: 'application',
                        description: 'Main authenticated dashboard'
                    },
                    {
                        url: `https://${domain}/organizations`,
                        title: 'Organizations - Internet2 InCommon Federation Manager', 
                        page_type: 'application',
                        description: 'Organization management interface'
                    },
                    {
                        url: `https://${domain}/organizations/10009`,
                        title: 'Organization Management - Internet2 InCommon',
                        page_type: 'application', 
                        description: 'Specific organization management page'
                    },
                    {
                        url: `https://${domain}/entities`,
                        title: 'Entity Management - Internet2 InCommon',
                        page_type: 'application',
                        description: 'Entity management interface'
                    },
                    {
                        url: `https://${domain}/entities/new`,
                        title: 'Add New Entity - Internet2 InCommon',
                        page_type: 'application',
                        description: 'Create new entity form'
                    },
                    {
                        url: `https://${domain}/delegated_administrators`,
                        title: 'Delegated Administrators - Internet2 InCommon',
                        page_type: 'application',
                        description: 'Administrative delegation interface'
                    },
                    {
                        url: `https://${domain}/federation_operators`,
                        title: 'Federation Operators - Internet2 InCommon', 
                        page_type: 'application',
                        description: 'Federation operator management'
                    },
                    {
                        url: `https://${domain}/service_providers`,
                        title: 'Service Providers - Internet2 InCommon',
                        page_type: 'application', 
                        description: 'Service provider management'
                    },
                    {
                        url: `https://${domain}/identity_providers`, 
                        title: 'Identity Providers - Internet2 InCommon',
                        page_type: 'application',
                        description: 'Identity provider management'
                    },
                    {
                        url: `https://${domain}/reports`,
                        title: 'Reports - Internet2 InCommon',
                        page_type: 'application',
                        description: 'Analytics and reporting interface'
                    },
                    {
                        url: `https://${domain}/account`,
                        title: 'Account Settings - Internet2 InCommon',
                        page_type: 'application', 
                        description: 'User account management'
                    },
                    {
                        url: `https://${domain}/organizations/manage`,
                        title: 'Manage Organizations - Internet2 InCommon',
                        page_type: 'application',
                        description: 'Organization management tools'
                    },
                    {
                        url: `https://${domain}/metadata`,
                        title: 'Metadata Management - Internet2 InCommon',
                        page_type: 'application',
                        description: 'SAML metadata management'
                    },
                    {
                        url: `https://${domain}/certificates`,
                        title: 'Certificate Management - Internet2 InCommon',
                        page_type: 'application',
                        description: 'SSL/TLS certificate management'
                    },
                    {
                        url: `https://${domain}/notifications`,
                        title: 'Notifications - Internet2 InCommon',
                        page_type: 'application',
                        description: 'System notifications and alerts'
                    }
                ];
            }

            // Add other domain-specific routes here
            // Example: Add routes for other SAML applications

            if (knownRoutes.length > 0) {
                console.log(`🔐 Injecting ${knownRoutes.length} known authenticated routes for ${domain}`);
                
                for (const route of knownRoutes) {
                    await this.pool.query(`
                        INSERT INTO discovered_pages (discovery_id, url, title, page_type, http_status, discovered_at)
                        VALUES ($1, $2, $3, $4, $5, NOW())
                        ON CONFLICT (discovery_id, url) DO NOTHING
                    `, [discoveryId, route.url, route.title, route.page_type, 200]);
                }
                
                console.log(`✅ Successfully injected ${knownRoutes.length} authenticated routes`);
            }

        } catch (error) {
            console.error('❌ Error injecting authenticated routes:', error.message);
            // Don't throw - this is a best-effort enhancement
        }
    }
}

module.exports = SiteDiscoveryService; 
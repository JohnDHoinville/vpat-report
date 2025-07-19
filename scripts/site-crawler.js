const https = require('https');
const http = require('http');
const cheerio = require('cheerio');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const AuthHelper = require('./auth-helper');
const AuthenticationWizard = require('./auth-wizard');

/**
 * Core Site Crawling Engine
 * Features: Rate limiting, duplicate detection, progress tracking
 */
class SiteCrawler {
    constructor(options = {}) {
        this.options = {
            maxDepth: options.maxDepth || 3,
            maxPages: options.maxPages || 500,
            rateLimitMs: options.rateLimitMs || 2000, // 2 second delay
            userAgent: options.userAgent || 'AccessibilityTestingBot/1.0',
            timeout: options.timeout || 10000,
            useAuth: options.useAuth || false,
            authConfig: options.authConfig || null,
            headless: options.headless !== false,
            enableInteractiveDiscovery: options.enableInteractiveDiscovery !== false, // Enable button clicking and JavaScript interaction
            ...options
        };
        
        this.visitedUrls = new Set();
        this.discoveredPages = [];
        this.sitemapPages = []; // Separate sitemap pages from crawled pages
        this.progressCallback = null;
        this.isRunning = false;
        this.totalRequests = 0;
        this.successfulRequests = 0;
        this.errors = [];
        this.browser = null;
        this.authContext = null;
        this.authStatesDir = path.join(__dirname, '../reports/auth-states'); // Added for new setup
    }

    /**
     * Set progress callback for real-time updates
     */
    onProgress(callback) {
        this.progressCallback = callback;
    }

    /**
     * Update progress and call callback if set
     */
    updateProgress(message, data = {}) {
        const progress = {
            message,
            totalRequests: this.totalRequests,
            successfulRequests: this.successfulRequests,
            discoveredPages: this.discoveredPages.length,
            visitedUrls: this.visitedUrls.size,
            errors: this.errors.length,
            ...data
        };

        console.log(`[Crawler] ${message}`);
        if (this.progressCallback) {
            this.progressCallback(progress);
        }
    }

    /**
     * Start crawling from root URL
     */
    async crawl(rootUrl, testName = 'Site Crawl') {
        try {
            this.isRunning = true;
            this.visitedUrls.clear();
            this.discoveredPages = [];
            this.sitemapPages = [];
            this.errors = [];
            this.totalRequests = 0;
            this.successfulRequests = 0;

            const startUrl = new URL(rootUrl);
            this.baseHost = startUrl.hostname;
            this.baseProtocol = startUrl.protocol;

            this.updateProgress(`Starting crawl of ${rootUrl}`, { 
                depth: 0, 
                currentUrl: rootUrl,
                currentDepth: 0,
                maxDepth: this.options.maxDepth
            });

            // Setup authentication if needed
            if (this.options.useAuth) {
                try {
                    await this.setupAuthentication(rootUrl);
                } catch (error) {
                    console.warn(`❌ Authentication setup failed, continuing without authentication:`, error.message);
                    this.updateProgress(`❌ Authentication setup failed: ${error.message}`, {
                        currentUrl: rootUrl,
                        authError: true
                    });
                    // For SSO sites, try to continue with authentication context anyway
                    const authType = this.options.authConfig?.type || this.options.authConfig?.authType;
                    if (authType === 'sso' || authType === 'saml') {
                        this.updateProgress('⚠️ SSO authentication partially set up, will try authenticated crawling');
                        // Keep useAuth enabled for SSO even if setup had issues
                    } else {
                        // For traditional auth, disable if setup failed
                        this.options.useAuth = false;
                    }
                }
            }

            // Try to discover pages from sitemap.xml first for better coverage
            await this.discoverFromSitemap(rootUrl);
            
            // Launch browser for interactive discovery even if auth is not used
            if (!this.browser && !this.authContext) {
                try {
                    this.browser = await chromium.launch({ headless: this.options.headless });
                    this.updateProgress('🌐 Browser launched for interactive discovery');
                } catch (error) {
                    this.updateProgress(`⚠️ Failed to launch browser for interactive discovery: ${error.message}`);
                }
            }
            
            this.updateProgress('🚀 **PHASE 1: TRADITIONAL CRAWLING** - Starting static HTML link extraction');
            
            // Start crawling from root - sitemap URLs will be visited as part of normal crawling
            const queue = [{ url: rootUrl, depth: 0, parentUrl: null }];
            
            // Use visited pages count for limiting instead of discovered pages (which includes sitemap)
            while (queue.length > 0 && this.isRunning && this.visitedUrls.size < this.options.maxPages) {
                const { url, depth, parentUrl } = queue.shift();

                // Skip if already visited or depth exceeded
                if (this.visitedUrls.has(url) || depth > this.options.maxDepth) {
                    continue;
                }

                // Rate limiting - wait between requests
                if (this.totalRequests > 0) {
                    await this.sleep(this.options.rateLimitMs);
                }

                try {
                    this.totalRequests++;
                    this.updateProgress(`Fetching: ${url}`, { 
                        depth, 
                        queue: queue.length,
                        currentUrl: url,
                        currentDepth: depth,
                        maxDepth: this.options.maxDepth
                    });

                    const pageData = await this.fetchPage(url);
                    this.successfulRequests++;
                    this.visitedUrls.add(url);

                    // Add to discovered pages
                    this.discoveredPages.push({
                        url,
                        title: pageData.title,
                        depth,
                        parentUrl,
                        statusCode: pageData.statusCode,
                        contentType: pageData.contentType,
                        wordCount: pageData.wordCount,
                        lastModified: pageData.lastModified,
                        discoveredAt: new Date().toISOString()
                    });

                    // Extract links for next depth level
                    if (depth < this.options.maxDepth) {
                        const links = this.extractLinks(pageData.html, url);
                        
                        // Create a set of URLs already in queue to avoid duplicates
                        const queuedUrls = new Set(queue.map(item => item.url));
                        
                        // Filter out visited URLs, queued URLs, and non-same-domain URLs
                        const newLinks = links.filter(link => 
                            !this.visitedUrls.has(link) && 
                            !queuedUrls.has(link) &&
                            this.isSameDomain(link)
                        );
                        
                        // Add new links to queue
                        newLinks.forEach(link => {
                            queue.push({ url: link, depth: depth + 1, parentUrl: url });
                        });

                        this.updateProgress(`Found ${newLinks.length} new links on ${url}`, { 
                            depth, 
                            newLinks: newLinks.length,
                            queueSize: queue.length,
                            currentUrl: url,
                            currentDepth: depth,
                            maxDepth: this.options.maxDepth
                        });
                    }

                } catch (error) {
                    this.errors.push({
                        url,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                    this.updateProgress(`Error fetching ${url}: ${error.message}`, {
                        currentUrl: url,
                        currentDepth: depth,
                        maxDepth: this.options.maxDepth,
                        error: error.message
                    });
                }
            }

            this.isRunning = false;

            this.updateProgress(`✅ **PHASE 1 COMPLETE** - Found ${this.discoveredPages.length} pages through traditional crawling`);

            // PHASE 2: Interactive Discovery - Click buttons and explore JavaScript navigation
            let interactiveRoutes = [];
            if (this.options.enableInteractiveDiscovery && (this.authContext || this.browser)) {
                try {
                    this.updateProgress('🎯 **PHASE 2: INTERACTIVE DISCOVERY** - Starting button clicking and JavaScript navigation exploration');
                    interactiveRoutes = await this.performInteractiveDiscovery(rootUrl);
                    
                    // Process newly discovered interactive routes
                    if (interactiveRoutes.length > 0) {
                        this.updateProgress(`📋 Processing ${interactiveRoutes.length} routes from interactive discovery`);
                        
                        const interactiveQueue = interactiveRoutes.map(url => ({ url, depth: 1, parentUrl: 'interactive-discovery' }));
                        
                        // Process interactive routes (limited to avoid infinite discovery)
                        const maxInteractivePages = Math.min(10, interactiveRoutes.length);
                        for (let i = 0; i < maxInteractivePages && this.isRunning; i++) {
                            const { url, depth, parentUrl } = interactiveQueue[i];
                            
                            if (this.visitedUrls.has(url)) continue;
                            
                            this.updateProgress(`Fetching interactive route: ${url}`, {
                                currentUrl: url,
                                currentDepth: depth,
                                maxDepth: this.options.maxDepth
                            });
                            
                            try {
                                this.visitedUrls.add(url);
                                this.totalRequests++;
                                
                                const pageData = await this.fetchPage(url);
                                this.successfulRequests++;
                                
                                this.discoveredPages.push({
                                    url,
                                    title: pageData.title,
                                    depth,
                                    parentUrl,
                                    statusCode: pageData.statusCode,
                                    contentType: pageData.contentType,
                                    wordCount: pageData.wordCount,
                                    lastModified: pageData.lastModified,
                                    discoveredAt: new Date().toISOString(),
                                    source: 'interactive'
                                });
                                
                                await this.sleep(1000); // Rate limiting for interactive routes
                                
                            } catch (error) {
                                this.errors.push({
                                    url,
                                    error: error.message,
                                    timestamp: new Date().toISOString()
                                });
                            }
                        }
                    }
                    
                    this.updateProgress(`✅ **PHASE 2 COMPLETE** - Found ${interactiveRoutes.length} additional routes through interactive discovery`);
                } catch (error) {
                    this.updateProgress(`❌ **PHASE 2 FAILED** - Interactive discovery error: ${error.message}`);
                }
            } else if (!this.options.enableInteractiveDiscovery) {
                this.updateProgress('ℹ️ **PHASE 2 SKIPPED** - Interactive discovery disabled');
            } else {
                this.updateProgress('⚠️ **PHASE 2 SKIPPED** - No browser context available for interactive discovery');
            }

            // Merge sitemap pages with crawled pages, prioritizing crawled data
            const crawledUrls = new Set(this.discoveredPages.map(p => p.url));
            const additionalSitemapPages = this.sitemapPages.filter(sp => !crawledUrls.has(sp.url));
            const totalPages = [...this.discoveredPages, ...additionalSitemapPages];

            this.updateProgress(`🎉 **DISCOVERY COMPLETE** - Total: ${totalPages.length} pages (Phase 1: ${this.discoveredPages.length} traditional, Sitemap: ${additionalSitemapPages.length}, Phase 2: ${interactiveRoutes.length} interactive)`, {
                completed: true,
                totalPages: totalPages.length,
                crawledPages: this.discoveredPages.length,
                sitemapPages: additionalSitemapPages.length,
                interactivePages: interactiveRoutes.length,
                totalErrors: this.errors.length,
                currentUrl: 'Completed',
                currentDepth: Math.max(...this.discoveredPages.map(p => p.depth), 0),
                maxDepth: this.options.maxDepth,
                uniqueUrls: crawledUrls.size,
                visitedCount: this.visitedUrls.size
            });

            // Update discoveredPages with merged results
            this.discoveredPages = totalPages;

            // Cleanup authentication
            await this.cleanupAuthentication();

            // Save results
            const results = {
                testName,
                rootUrl,
                startTime: new Date().toISOString(),
                options: this.options,
                summary: {
                    totalRequests: this.totalRequests,
                    successfulRequests: this.successfulRequests,
                    discoveredPages: this.discoveredPages.length,
                    errors: this.errors.length,
                    maxDepthReached: Math.max(...this.discoveredPages.map(p => p.depth), 0)
                },
                pages: this.discoveredPages,
                errors: this.errors
            };

            await this.saveResults(results, testName);
            return results;

        } catch (error) {
            this.isRunning = false;
            await this.cleanupAuthentication();
            this.updateProgress(`Crawl failed: ${error.message}`, {
                currentUrl: 'Failed',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Stop the crawling process
     */
    stop() {
        this.isRunning = false;
        this.updateProgress('Crawl stopped by user', {
            currentUrl: 'Stopped',
            stopped: true
        });
    }

    /**
     * Check if a URL requires authentication based on protected paths
     */
    requiresAuthentication(url, authConfig) {
        if (!authConfig || authConfig.type !== 'smart') {
            return true; // Default to requiring auth for legacy configs
        }

        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;

            // Check if URL matches protected paths
            if (authConfig.protectedPaths) {
                return authConfig.protectedPaths.some(protectedPath => 
                    pathname.startsWith(protectedPath)
                );
            }

            // Check if URL matches public paths
            if (authConfig.publicPaths) {
                const isPublic = authConfig.publicPaths.some(publicPath => 
                    pathname.startsWith(publicPath)
                );
                return !isPublic; // Require auth if not explicitly public
            }

            return true; // Default to requiring auth
        } catch (error) {
            console.warn(`⚠️ Error checking authentication requirement for ${url}:`, error.message);
            return true; // Default to requiring auth on error
        }
    }

    /**
     * Load authentication configuration from database for domain
     */
    async loadAuthConfig(domain) {
        try {
            const response = await fetch(`http://localhost:3001/api/auth/configs?domain=${domain}`);
            
            if (!response.ok) {
                console.warn(`⚠️ Failed to load auth config for ${domain}: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            
            if (data.success && data.data && data.data.length > 0) {
                // Find the most relevant config for this domain
                const config = data.data.find(c => c.domain === domain) || data.data[0];
                
                this.updateProgress(`🔐 Found authentication config for ${domain}: ${config.type}`);
                
                return {
                    loginUrl: config.login_page || config.url,
                    username: config.username,
                    password: config.password,
                    successUrl: config.success_url || config.url,
                    type: config.type,
                    domain: config.domain
                };
            }
            
            return null;
        } catch (error) {
            console.warn(`⚠️ Error loading auth config for ${domain}: ${error.message}`);
            return null;
        }
    }

    /**
     * Load smart authentication configuration for domain (legacy support)
     */
    loadSmartAuthConfig(domain, authStatesDir) {
        // This method is kept for backward compatibility but will use database
        // Call the async method and return a promise
        return this.loadAuthConfig(domain);
    }

    /**
     * Setup authentication using browser context
     */
    async setupAuthentication(rootUrl) {
        const domain = new URL(rootUrl).hostname;
        
        // Check for live authentication state first
        let liveSessionPath = null;
        if (this.authStatesDir && fs.existsSync(this.authStatesDir)) {
            const liveSessionFiles = fs.readdirSync(this.authStatesDir)
                .filter(file => file.includes(domain) && file.endsWith('.json'))
                .sort((a, b) => {
                    const timestampA = parseInt(a.match(/(\d+)\.json$/)?.[1] || '0');
                    const timestampB = parseInt(b.match(/(\d+)\.json$/)?.[1] || '0');
                    return timestampB - timestampA;
                });
            if (liveSessionFiles.length > 0) {
                liveSessionPath = path.join(this.authStatesDir, liveSessionFiles[0]);
                this.updateProgress(`🔄 Found existing live session: ${liveSessionFiles[0]}`);
            }
        }

        // Launch browser
        this.browser = await chromium.launch({ headless: this.options.headless });
        
        // Try live session first
        if (liveSessionPath && fs.existsSync(liveSessionPath)) {
            try {
                this.updateProgress('🔐 Loading live authentication session...');
                this.authContext = await this.browser.newContext({ storageState: liveSessionPath });
                this.updateProgress('✅ Live session loaded successfully');
                return;
            } catch (error) {
                this.updateProgress(`⚠️ Live session failed: ${error.message}, trying configured authentication`);
            }
        }

        // Use configured authentication
        if (this.options.authConfig) {
            try {
                const authType = this.options.authConfig.type || this.options.authConfig.authType;
                
                if (authType === 'sso' || authType === 'saml') {
                    this.updateProgress('🔐 Setting up SSO/SAML authentication...');
                    await this.setupSSOAuthentication(rootUrl);
                } else {
                    this.updateProgress('🔐 Setting up traditional authentication...');
                    await this.setupTraditionalAuthentication(rootUrl);
                }
            } catch (error) {
                this.updateProgress(`❌ Authentication setup failed: ${error.message}`);
                throw error;
            }
        } else {
            // No authentication configured
            this.updateProgress('🌐 No authentication configured, crawling as public site');
        }
    }

    /**
     * Setup SSO/SAML authentication by navigating through the login flow
     */
    async setupSSOAuthentication(rootUrl) {
        const authConfig = this.options.authConfig;
        const domain = new URL(rootUrl).hostname;
        
        // Create new browser context
        this.authContext = await this.browser.newContext();
        const page = await this.authContext.newPage();
        
        try {
            // Navigate to the main site first to trigger SSO redirect
            this.updateProgress(`🔐 Navigating to ${rootUrl} to trigger SSO`);
            await page.goto(rootUrl, { waitUntil: 'networkidle', timeout: 30000 });
            
            // Check if we're redirected to login page
            const currentUrl = page.url();
            if (currentUrl.includes('/login') || currentUrl.includes('/signin') || 
                currentUrl.includes('sso') || currentUrl.includes('auth') ||
                currentUrl.includes('shibboleth') || currentUrl.includes('saml')) {
                
                this.updateProgress(`🔐 Detected login redirect to: ${currentUrl}`);
                
                // For SSO, we need to wait for user interaction or use dynamic auth
                if (this.options.dynamicAuth) {
                    // This will trigger dynamic auth prompts
                    this.updateProgress('🔐 SSO detected - dynamic authentication will prompt for credentials');
                } else {
                    // Use institutional login if we have a specific login URL
                    if (authConfig.loginUrl || authConfig.loginPage) {
                        const loginUrl = authConfig.loginUrl || authConfig.loginPage;
                        this.updateProgress(`🔐 Navigating to specific login page: ${loginUrl}`);
                        await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
                    }
                    
                    // For SSO, we typically can't automate the login without credentials
                    // But we can try to detect the success page or save the current context
                    this.updateProgress('⚠️ SSO authentication requires manual intervention or dynamic auth');
                }
            } else {
                // We might already be authenticated or no auth required
                this.updateProgress('✅ No authentication required or already authenticated');
            }
            
            await page.close();
            
        } catch (error) {
            await page.close();
            throw new Error(`SSO authentication failed: ${error.message}`);
        }
    }

    /**
     * Setup traditional username/password authentication
     */
    async setupTraditionalAuthentication(rootUrl) {
        const domain = new URL(rootUrl).hostname;
        const authHelper = new AuthHelper({
            headless: this.options.headless,
            timeout: this.options.timeout
        });
        
        // Ensure URLs have proper protocols
        const normalizeUrl = (url, baseUrl) => {
            if (!url) return url;
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            
            // If URL starts with domain, add protocol
            if (url.includes('.')) {
                const protocol = new URL(baseUrl).protocol;
                return `${protocol}//${url}`;
            }
            
            // If URL is a path, make it relative to base URL
            return new URL(url, baseUrl).toString();
        };
        
        authHelper.registerAuth(domain, {
            loginUrl: normalizeUrl(this.options.authConfig.loginUrl, rootUrl),
            username: this.options.authConfig.username || process.env.TEST_USERNAME,
            password: this.options.authConfig.password || process.env.TEST_PASSWORD,
            usernameSelector: this.options.authConfig.usernameSelector,
            passwordSelector: this.options.authConfig.passwordSelector,
            submitSelector: this.options.authConfig.submitSelector,
            successUrl: normalizeUrl(this.options.authConfig.successUrl, rootUrl),
            additionalSteps: this.options.authConfig.additionalSteps || [],
            customLogin: this.options.authConfig.customLogin || null
        });
        
        const { context } = await authHelper.createAuthenticatedContext(rootUrl, this.browser);
        this.authContext = context;
        this.updateProgress('✅ Traditional authentication completed');
    }

    /**
     * Cleanup authentication resources
     */
    async cleanupAuthentication() {
        try {
            if (this.authContext) {
                await this.authContext.close();
                this.authContext = null;
            }
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
        } catch (error) {
            console.error('Error cleaning up authentication:', error.message);
        }
    }

    /**
     * Discover pages from sitemap.xml
     */
    async discoverFromSitemap(baseUrl) {
        const sitemapUrls = [
            new URL('/sitemap.xml', baseUrl).toString(),
            new URL('/sitemap_index.xml', baseUrl).toString(),
            new URL('/sitemaps/sitemap.xml', baseUrl).toString()
        ];

        for (const sitemapUrl of sitemapUrls) {
            try {
                this.updateProgress(`Checking sitemap: ${sitemapUrl}`);
                
                const urlObj = new URL(sitemapUrl);
                const client = urlObj.protocol === 'https:' ? https : http;
                
                const sitemapData = await new Promise((resolve, reject) => {
                    const req = client.request(sitemapUrl, (res) => {
                        if (res.statusCode !== 200) {
                            reject(new Error(`Sitemap not found: ${res.statusCode}`));
                            return;
                        }
                        
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => resolve(data));
                    });
                    
                    req.on('error', reject);
                    req.setTimeout(5000, () => {
                        req.destroy();
                        reject(new Error('Sitemap request timeout'));
                    });
                    
                    req.end();
                });

                // Parse sitemap XML and extract URLs
                const urlMatches = sitemapData.match(/<loc>(.*?)<\/loc>/g) || [];
                let foundUrls = 0;
                
                urlMatches.forEach(match => {
                    try {
                        const url = match.replace(/<\/?loc>/g, '').trim();
                        if (this.isSameDomain(url) && !this.visitedUrls.has(url)) {
                            // Add to sitemap pages with metadata - these will be merged later
                            this.sitemapPages.push({
                                url,
                                title: 'From Sitemap',
                                depth: 0,
                                parentUrl: 'sitemap.xml',
                                statusCode: 'unknown',
                                contentType: 'unknown',
                                wordCount: 0,
                                lastModified: null,
                                discoveredAt: new Date().toISOString(),
                                source: 'sitemap'
                            });
                            foundUrls++;
                        }
                    } catch (error) {
                        // Skip invalid URLs
                    }
                });

                if (foundUrls > 0) {
                    this.updateProgress(`Found ${foundUrls} URLs in sitemap: ${sitemapUrl}`);
                    break; // Stop after finding a valid sitemap
                }

            } catch (error) {
                this.updateProgress(`Sitemap not available: ${sitemapUrl} - ${error.message}`);
            }
        }
    }

    /**
     * Fetch a single page
     */
    async fetchPage(url) {
        // Use authenticated browser context if available
        if (this.authContext) {
            return await this.fetchPageWithAuth(url);
        }
        
        // Fallback to HTTP request for non-authenticated crawling
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'User-Agent': this.options.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                timeout: this.options.timeout
            };

            const req = client.request(options, (res) => {
                let data = '';
                
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        // Try to parse HTML, but handle malformed HTML gracefully
                        let title = 'No title';
                        let wordCount = 0;
                        
                                                 try {
                             const $ = cheerio.load(data, { 
                                 xml: false,
                                 decodeEntities: false,
                                 normalizeWhitespace: false,
                                 ignoreWhitespace: false
                             });
                             title = $('title').text().trim() || 'No title';
                             wordCount = $('body').text().split(/\s+/).filter(word => word.length > 0).length;
                         } catch (parseError) {
                             console.warn(`HTML parsing error: ${parseError.message}, using fallback extraction`);
                             // If HTML parsing fails, extract title with regex as fallback
                             const titleMatch = data.match(/<title[^>]*>([^<]*)<\/title>/i);
                             if (titleMatch) {
                                 title = titleMatch[1].trim();
                             }
                             // Count words roughly
                             wordCount = data.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(word => word.length > 0).length;
                         }
                        
                        resolve({
                            html: data,
                            title,
                            statusCode: res.statusCode,
                            contentType: res.headers['content-type'] || 'unknown',
                            wordCount,
                            lastModified: res.headers['last-modified'] || null
                        });
                    } catch (error) {
                        reject(new Error(`Failed to parse HTML: ${error.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    /**
     * Fetch a page using authenticated browser context or smart authentication
     */
    async fetchPageWithAuth(url) {
        try {
            // Check if this URL requires authentication (smart auth logic)
            if (this.smartAuthConfig && this.smartAuthConfig.type === 'smart') {
                const needsAuth = this.requiresAuthentication(url, this.smartAuthConfig);
                
                if (!needsAuth) {
                    // URL is public, use regular fetch
                    this.updateProgress(`🌐 Fetching public URL: ${url}`);
                    return await this.fetchPage(url);
                }
                
                // URL needs authentication - ensure we have an authenticated context
                if (!this.authContext) {
                    this.updateProgress(`🔐 Setting up authentication for protected URL: ${url}`);
                    await this.setupAuthenticationForProtectedArea();
                }
            }

            if (!this.authContext) {
                throw new Error('Authentication context not available');
            }
            
            const page = await this.authContext.newPage();
            
            const response = await page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: this.options.timeout 
            });
            
            // Check if we got redirected to login page (authentication failed)
            const currentUrl = page.url();
            if (currentUrl.includes('/login') || currentUrl.includes('/signin') || currentUrl.includes('/auth')) {
                await page.close();
                this.updateProgress(`⚠️ Redirected to login page for ${url} - authentication may have expired`);
                
                // For smart auth, fall back to public access if possible
                if (this.smartAuthConfig && this.smartAuthConfig.type === 'smart') {
                    this.updateProgress(`🔄 Retrying ${url} as public URL`);
                    return await this.fetchPage(url);
                }
                
                throw new Error('Authentication expired or failed - redirected to login page');
            }
            
            // Enhanced wait for SPA applications and dynamic content
            await page.waitForTimeout(5000); // Initial wait for basic content (increased from 3s)
            
            // Try to wait for common dynamic content indicators
            try {
                await page.waitForSelector('body', { timeout: 3000 });
                
                // Enhanced navigation detection for admin interfaces
                const navigationSelectors = [
                    'nav', '.navigation', '.nav', '.menu', '.sidebar', '.admin-nav',
                    '[role="navigation"]', '.navbar', '.topnav', '.main-nav',
                    'header nav', 'footer nav', '.breadcrumb', '.tabs',
                    '.dropdown-menu', '.sub-menu', '.accordion', '.admin-menu',
                    '.dashboard-nav', '.management-nav', '.control-panel',
                    // Federation Manager specific selectors
                    '.fm-navigation', '.entity-nav', '.organization-nav',
                    '.federation-nav', '.admin-panel', '.management-panel'
                ];
                
                let foundNavigation = false;
                for (const selector of navigationSelectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 1500 });
                        foundNavigation = true;
                        this.updateProgress(`📋 Found navigation element: ${selector}`);
                        break; // Found at least one navigation element
                    } catch (e) {
                        // Continue to next selector
                    }
                }
                
                // Enhanced wait for AJAX content, especially for admin interfaces
                if (foundNavigation) {
                    await page.waitForTimeout(3000); // Longer wait if we found navigation
                } else {
                    await page.waitForTimeout(2000); // Standard wait if no navigation
                }
                
                // Wait for common admin interface loading indicators to disappear
                const loadingSelectors = [
                    '.loading', '.spinner', '.loader', '[data-loading]',
                    '.fa-spinner', '.fa-circle-o-notch', '.ajax-loading'
                ];
                
                for (const selector of loadingSelectors) {
                    try {
                        await page.waitForSelector(selector, { state: 'hidden', timeout: 2000 });
                    } catch (e) {
                        // Continue if loading indicator doesn't exist
                    }
                }
                
            } catch (e) {
                // Continue if selectors don't exist
            }
            
            const html = await page.content();
            const title = await page.title();
            
            // Get word count from page text
            const bodyText = await page.evaluate(() => {
                return document.body ? document.body.innerText : '';
            });
            const wordCount = bodyText.split(/\s+/).filter(word => word.length > 0).length;
            
            await page.close();
            
            return {
                html,
                title: title || 'No title',
                statusCode: response ? response.status() : 200,
                contentType: 'text/html',
                wordCount,
                lastModified: null
            };
            
        } catch (error) {
            throw new Error(`Failed to fetch authenticated page ${url}: ${error.message}`);
        }
    }

    /**
     * Setup authentication for protected areas on-demand
     */
    async setupAuthenticationForProtectedArea() {
        if (!this.smartAuthConfig) {
            throw new Error('No smart authentication configuration available');
        }

        try {
            this.updateProgress('🔐 Setting up on-demand authentication for protected area...');
            
            // Launch browser if not already done
            if (!this.browser) {
                this.browser = await chromium.launch({ headless: this.options.headless });
            }

            // Create new context for authentication
            this.authContext = await this.browser.newContext();
            const page = await this.authContext.newPage();

            // Navigate to login page
            const loginPage = this.smartAuthConfig.loginPage;
            this.updateProgress(`🔐 Navigating to login page: ${loginPage}`);
            await page.goto(loginPage, { waitUntil: 'networkidle', timeout: 30000 });

            // Get credentials
            const credentials = this.smartAuthConfig.credentials;
            if (!credentials) {
                throw new Error('No credentials found in smart authentication configuration');
            }

            // Find and fill login form
            const selectors = credentials.selectors || {};
            
            // Username field
            const usernameSelector = selectors.username || 'input[type="email"], input[name="email"], input[name="username"]';
            await page.fill(usernameSelector, credentials.username);
            
            // Password field  
            const passwordSelector = selectors.password || 'input[type="password"], input[name="password"]';
            await page.fill(passwordSelector, credentials.password);
            
            // Submit form
            const submitSelector = selectors.submit || 'button[type="submit"], input[type="submit"], .login-btn';
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
                page.click(submitSelector)
            ]);

            // Verify successful login
            const currentUrl = page.url();
            if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
                throw new Error('Login failed - still on login page');
            }

            await page.close();
            this.updateProgress('✅ On-demand authentication successful');
            
        } catch (error) {
            this.updateProgress(`❌ On-demand authentication failed: ${error.message}`);
            throw error;
        }
    }



    /**
     * Preprocess HTML to fix common malformed attribute issues
     */
    preprocessHtml(html) {
        try {
            return html
                // Fix unterminated attributes
                .replace(/([a-zA-Z-]+)=([^"'\s>]+)(?=[>\s])/g, '$1="$2"')
                // Fix attributes without quotes
                .replace(/=([^"'\s>]+)(\s|>)/g, '="$1"$2')
                // Remove problematic style attributes that cause parsing issues
                .replace(/style\s*=\s*[^"'][^>]*?[^"']\s*(?=[>\s])/gi, '')
                // Fix other common malformed patterns
                .replace(/([a-zA-Z-]+)=\s*$/gm, '')
                // Clean up multiple spaces
                .replace(/\s+/g, ' ');
        } catch (error) {
            return html; // Return original if preprocessing fails
        }
    }

    /**
     * Fallback regex-based link extraction when Cheerio fails
     */
    extractLinksWithRegex(html, baseUrl, links) {
        try {
            // Extract href links
            const hrefMatches = html.match(/href\s*=\s*["']([^"']+)["']/gi) || [];
            hrefMatches.forEach(match => {
                const hrefMatch = match.match(/href\s*=\s*["']([^"']+)["']/i);
                if (hrefMatch && hrefMatch[1]) {
                    try {
                        const absoluteUrl = new URL(hrefMatch[1], baseUrl).toString();
                        if (this.isSameDomain(absoluteUrl) && !hrefMatch[1].startsWith('mailto:') && !hrefMatch[1].startsWith('tel:')) {
                            links.add(absoluteUrl.split('#')[0]);
                        }
                    } catch (e) { /* Skip invalid URLs */ }
                }
            });

            // Extract iframe src
            const srcMatches = html.match(/src\s*=\s*["']([^"']+)["']/gi) || [];
            srcMatches.forEach(match => {
                const srcMatch = match.match(/src\s*=\s*["']([^"']+)["']/i);
                if (srcMatch && srcMatch[1] && srcMatch[1].startsWith('/')) {
                    try {
                        const absoluteUrl = new URL(srcMatch[1], baseUrl).toString();
                        if (this.isSameDomain(absoluteUrl)) {
                            links.add(absoluteUrl);
                        }
                    } catch (e) { /* Skip invalid URLs */ }
                }
            });

            // Extract JavaScript routes
            const routeMatches = html.match(/["']\/[a-zA-Z0-9\-_\/]+["']/g) || [];
            routeMatches.forEach(match => {
                const path = match.replace(/["']/g, '');
                if (this.isValidRoute(path)) {
                    try {
                        const absoluteUrl = new URL(path, baseUrl).toString();
                        if (this.isSameDomain(absoluteUrl)) {
                            links.add(absoluteUrl);
                        }
                    } catch (e) { /* Skip invalid URLs */ }
                }
            });

        } catch (error) {
            // If regex extraction also fails, just continue
        }
    }

    /**
     * Extract links from HTML
     */
    extractLinks(html, baseUrl) {
        try {
            // Pre-process HTML to fix common malformed attribute issues
            const cleanedHtml = this.preprocessHtml(html);
            
            const $ = cheerio.load(cleanedHtml, { 
                xml: false,
                decodeEntities: false,
                normalizeWhitespace: false,
                ignoreWhitespace: false,
                lowerCaseAttributeNames: false
            });
            const links = new Set();
            
            // Extract links from various sources
            this.extractFromHrefAttributes($, baseUrl, links);
            this.extractFromSrcAttributes($, baseUrl, links);
            this.extractFromScriptContent($, baseUrl, links);
            this.extractFromDataAttributes($, baseUrl, links);
            this.extractFromAdminPatterns($, baseUrl, links);
            this.extractCommonSPARoutes(baseUrl, links);
            this.extractFromFormActions($, baseUrl, links);
            
            return Array.from(links);
        } catch (error) {
            // Fallback to regex-based extraction if Cheerio fails
            const links = new Set();
            this.extractLinksWithRegex(html, baseUrl, links);
            this.extractCommonSPARoutes(baseUrl, links);
            return Array.from(links);
        }
    }

    /**
     * Extract links from href attributes
     */
    extractFromHrefAttributes($, baseUrl, links) {
        $('a[href], link[href]').each((i, element) => {
            try {
                const href = $(element).attr('href');
                if (!href) return;
                
                // Skip non-HTTP links
                if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:') || href.startsWith('#')) {
                    return;
                }
                
                // Convert relative URLs to absolute
                const absoluteUrl = new URL(href, baseUrl).toString();
                
                // Only include HTTP/HTTPS links from same domain
                if (this.isSameDomain(absoluteUrl)) {
                    // Remove fragments for navigation links
                    const cleanUrl = absoluteUrl.split('#')[0];
                    if (cleanUrl && cleanUrl !== baseUrl.replace(/\/$/, '')) {
                        links.add(cleanUrl);
                    }
                }
            } catch (error) {
                // Skip invalid URLs
            }
        });
    }

    /**
     * Extract links from src attributes (for resources that might be pages)
     */
    extractFromSrcAttributes($, baseUrl, links) {
        $('iframe[src]').each((i, element) => {
            try {
                const src = $(element).attr('src');
                if (!src) return;
                
                const absoluteUrl = new URL(src, baseUrl).toString();
                if (this.isSameDomain(absoluteUrl)) {
                    links.add(absoluteUrl);
                }
            } catch (error) {
                // Skip invalid URLs
            }
        });
    }

    /**
     * Extract routes from JavaScript content (for SPAs)
     */
    extractFromScriptContent($, baseUrl, links) {
        $('script').each((i, element) => {
            const scriptContent = $(element).html() || '';
            
            // Look for route patterns in JavaScript
            const routePatterns = [
                /["']\/[a-zA-Z0-9\-_\/]+["']/g,  // "/some/path"
                /path\s*:\s*["']\/[^"']+["']/g,   // path: "/route"
                /route\s*:\s*["']\/[^"']+["']/g,  // route: "/route"
                /to\s*:\s*["']\/[^"']+["']/g,     // to: "/route"
                /href\s*:\s*["']\/[^"']+["']/g,   // href: "/route"
                /url\s*:\s*["']\/[^"']+["']/g,    // url: "/route"
                /action\s*:\s*["']\/[^"']+["']/g, // action: "/route"
                /endpoint\s*:\s*["']\/[^"']+["']/g // endpoint: "/route"
            ];
            
            routePatterns.forEach(pattern => {
                const matches = scriptContent.match(pattern) || [];
                matches.forEach(match => {
                    try {
                        // Extract the path from the match
                        const pathMatch = match.match(/["'](\/.+?)["']/);
                        if (pathMatch && pathMatch[1]) {
                            const path = pathMatch[1];
                            // Only include paths that look like real routes
                            if (this.isValidRoute(path)) {
                                const absoluteUrl = new URL(path, baseUrl).toString();
                                if (this.isSameDomain(absoluteUrl)) {
                                    links.add(absoluteUrl);
                                }
                            }
                        }
                    } catch (error) {
                        // Skip invalid URLs
                    }
                });
            });
        });
    }

    /**
     * Extract links from data attributes (Angular, React, Vue patterns)
     */
    extractFromDataAttributes($, baseUrl, links) {
        // Look for data attributes that might contain routes
        const dataAttributes = [
            'data-url', 'data-href', 'data-link', 'data-route', 
            'data-path', 'data-navigation', 'data-target',
            'ng-href', 'v-bind:href', 'react-router-link'
        ];
        
        dataAttributes.forEach(attr => {
            $(`[${attr}]`).each((i, element) => {
                try {
                    const value = $(element).attr(attr);
                    if (value && value.startsWith('/')) {
                        const absoluteUrl = new URL(value, baseUrl).toString();
                        if (this.isSameDomain(absoluteUrl)) {
                            links.add(absoluteUrl);
                        }
                    }
                } catch (error) {
                    // Skip invalid URLs
                }
            });
        });
    }

    /**
     * Extract links from form actions
     */
    extractFromFormActions($, baseUrl, links) {
        $('form[action]').each((i, element) => {
            try {
                const action = $(element).attr('action');
                if (action && action !== '#' && action !== '') {
                    const absoluteUrl = new URL(action, baseUrl).toString();
                    if (this.isSameDomain(absoluteUrl)) {
                        links.add(absoluteUrl);
                    }
                }
            } catch (error) {
                // Skip invalid URLs
            }
        });
    }

    /**
     * Extract admin/management interface patterns
     */
    extractFromAdminPatterns($, baseUrl, links) {
        const domain = new URL(baseUrl).hostname;
        
        // Federation Manager specific patterns - comprehensive admin routes
        if (domain.includes('fm-dev.ti.internet2.edu') || domain.includes('federation')) {
            const federationRoutes = [
                // Core admin areas
                '/dashboard', '/home', '/admin', '/administration',
                // Organizations and entities
                '/organizations', '/organizations/new', '/organizations/edit',
                '/entities', '/entities/new', '/entities/edit', '/entities/import',
                '/service_providers', '/service_providers/new', '/service_providers/edit',
                '/identity_providers', '/identity_providers/new', '/identity_providers/edit',
                // Management interfaces
                '/delegated_administrators', '/federation_operators', '/operators',
                '/metadata', '/metadata/export', '/metadata/import',
                '/certificates', '/certificate_management', '/key_management',
                '/contacts', '/contact_management', '/support', '/helpdesk',
                // Advanced features
                '/entity_attributes', '/attribute_filters', '/attribute_release',
                '/policies', '/access_policies', '/federation_policies',
                '/bulk_operations', '/bulk_import', '/bulk_export',
                '/audit_logs', '/activity_logs', '/system_logs',
                '/system_settings', '/configuration', '/preferences',
                '/user_management', '/role_management', '/access_control',
                '/permissions', '/group_management', '/team_management',
                // Reports and analytics
                '/reports', '/analytics', '/statistics', '/metrics',
                '/compliance', '/monitoring', '/health_check',
                // Tools and utilities
                '/tools', '/utilities', '/diagnostics', '/troubleshooting',
                '/backup', '/restore', '/maintenance', '/updates'
            ];
            
            // Dynamic pattern extraction for Federation Manager
            const htmlContent = $.html();
            
            // Look for organization-specific paths with more comprehensive patterns
            const orgMatches = [
                ...htmlContent.match(/\/organizations\/\d+/g) || [],
                ...htmlContent.match(/\/organizations\/[a-zA-Z0-9\-_]+/g) || [],
                ...htmlContent.match(/\/org\/\d+/g) || [],
                ...htmlContent.match(/\/org\/[a-zA-Z0-9\-_]+/g) || []
            ];
            
            // Look for entity-specific paths with more patterns
            const entityMatches = [
                ...htmlContent.match(/\/entities\/[a-zA-Z0-9\-_\.]+/g) || [],
                ...htmlContent.match(/\/entity\/[a-zA-Z0-9\-_\.]+/g) || [],
                ...htmlContent.match(/\/sp\/[a-zA-Z0-9\-_\.]+/g) || [],
                ...htmlContent.match(/\/idp\/[a-zA-Z0-9\-_\.]+/g) || []
            ];
            
            // Look for provider-specific paths
            const providerMatches = [
                ...htmlContent.match(/\/(service_providers|identity_providers)\/\d+/g) || [],
                ...htmlContent.match(/\/(service_providers|identity_providers)\/[a-zA-Z0-9\-_\.]+/g) || [],
                ...htmlContent.match(/\/providers\/[a-zA-Z0-9\-_\.]+/g) || []
            ];
            
            // Look for navigation links in menus and sidebars
            const navigationLinks = [];
            $('nav a, .nav a, .menu a, .sidebar a, .admin-nav a, .dashboard-nav a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('/') && !href.startsWith('//')) {
                    navigationLinks.push(href);
                }
            });
            
            [...federationRoutes, ...orgMatches, ...entityMatches, ...providerMatches, ...navigationLinks].forEach(route => {
                try {
                    const absoluteUrl = new URL(route, baseUrl).toString();
                    if (this.isSameDomain(absoluteUrl)) {
                        links.add(absoluteUrl);
                    }
                } catch (error) {
                    // Skip invalid URLs
                }
            });
        }
        
        // Look for common admin interface patterns in the HTML
        const adminPatterns = [
            /href=["']([^"']*\/admin[^"']*)/g,
            /href=["']([^"']*\/manage[^"']*)/g,
            /href=["']([^"']*\/dashboard[^"']*)/g,
            /href=["']([^"']*\/settings[^"']*)/g,
            /href=["']([^"']*\/config[^"']*)/g,
            /href=["']([^"']*\/users[^"']*)/g,
            /href=["']([^"']*\/groups[^"']*)/g,
            /href=["']([^"']*\/roles[^"']*)/g,
            /href=["']([^"']*\/permissions[^"']*)/g,
            /href=["']([^"']*\/reports[^"']*)/g,
            /href=["']([^"']*\/analytics[^"']*)/g,
            /href=["']([^"']*\/logs[^"']*)/g,
            /href=["']([^"']*\/audit[^"']*)/g,
            /href=["']([^"']*\/system[^"']*)/g,
            /href=["']([^"']*\/tools[^"']*)/g
        ];
        
        const htmlContent = $.html();
        adminPatterns.forEach(pattern => {
            const matches = htmlContent.match(pattern) || [];
            matches.forEach(match => {
                try {
                    const urlMatch = match.match(/href=["']([^"']+)/);
                    if (urlMatch && urlMatch[1]) {
                        const absoluteUrl = new URL(urlMatch[1], baseUrl).toString();
                        if (this.isSameDomain(absoluteUrl)) {
                            links.add(absoluteUrl);
                        }
                    }
                } catch (error) {
                    // Skip invalid URLs
                }
            });
        });
    }

    /**
     * Add common SPA routes that might not be in the HTML
     */
    extractCommonSPARoutes(baseUrl, links) {
        const domain = new URL(baseUrl).hostname;
        
        // Base common routes
        const commonRoutes = [
            '/app', '/login', '/signup', '/register', '/dashboard', 
            '/profile', '/settings', '/account', '/home', '/about', 
            '/contact', '/help', '/support', '/pricing', '/features', 
            '/blog', '/blogs', '/news', '/docs', '/documentation', 
            '/api', '/terms', '/privacy', '/legal'
        ];
        
        // Add domain-specific routes
        if (domain.includes('fm-dev.ti.internet2.edu') || domain.includes('federation')) {
            commonRoutes.push(
                // Core Federation Manager routes
                '/organizations', '/entities', '/service_providers', 
                '/identity_providers', '/delegated_administrators',
                '/federation_operators', '/reports', '/metadata',
                '/certificates', '/contacts', '/bulk_operations',
                '/audit_logs', '/system_settings', '/user_management',
                // Additional management routes
                '/admin', '/administration', '/manage', '/management',
                '/configuration', '/config', '/preferences', '/settings',
                '/tools', '/utilities', '/diagnostics', '/monitoring',
                '/analytics', '/statistics', '/metrics', '/compliance',
                '/permissions', '/roles', '/groups', '/teams',
                '/import', '/export', '/backup', '/restore',
                '/maintenance', '/updates', '/health', '/status'
            );
        }

        commonRoutes.forEach(route => {
            try {
                const absoluteUrl = new URL(route, baseUrl).toString();
                if (this.isSameDomain(absoluteUrl)) {
                    links.add(absoluteUrl);
                }
            } catch (error) {
                // Skip invalid URLs
            }
        });
    }

    /**
     * Check if a path looks like a valid route
     */
    isValidRoute(path) {
        // Skip very long paths, paths with file extensions (except html), and paths with query strings
        if (path.length > 100) return false;
        if (path.includes('?') && path.includes('&')) return false; // Skip complex query strings
        if (path.includes('.') && !path.endsWith('.html') && !path.endsWith('.htm')) return false;
        if (path.includes('//')) return false;
        if (path.includes('<%') || path.includes('%>')) return false; // Skip template syntax
        
        return true;
    }

    /**
     * Check if URL is from same domain
     */
    isSameDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === this.baseHost && 
                   (urlObj.protocol === 'http:' || urlObj.protocol === 'https:');
        } catch {
            return false;
        }
    }

    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Save crawl results to file
     */
    async saveResults(results, testName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `site-crawl-${testName.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.json`;
        const filepath = path.join('reports', filename);
        
        // Ensure reports directory exists
        if (!fs.existsSync('reports')) {
            fs.mkdirSync('reports', { recursive: true });
        }
        
        fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
        this.updateProgress(`Results saved to ${filepath}`);
        
        return filepath;
    }

    /**
     * Enhanced interactive discovery phase
     * Clicks buttons, navigation elements, and triggers JavaScript to find hidden routes
     */
         async performInteractiveDiscovery(baseUrl) {
         if (!this.authContext && !this.browser) {
             this.updateProgress('⚠️ No browser context available for interactive discovery, skipping');
             return [];
         }

         this.updateProgress('🔍 Interactive discovery: Analyzing pages for clickable buttons, navigation elements, and JavaScript triggers');
         
         const discoveredRoutes = new Set();
         const pagesToExplore = [...this.discoveredPages];
         
         this.updateProgress(`🔍 Found ${pagesToExplore.length} pages to explore interactively`);
         
         // Limit interactive exploration to avoid infinite loops
         const maxPagesToExplore = Math.min(5, pagesToExplore.length);
        
                 this.updateProgress(`🔄 Phase 2: Exploring ${maxPagesToExplore} pages for interactive elements (buttons, menus, JavaScript triggers)`);
         
         for (let i = 0; i < maxPagesToExplore; i++) {
             const pageData = pagesToExplore[i];
             this.updateProgress(`🔍 Processing page ${i+1}/${maxPagesToExplore}: ${pageData.url || 'undefined URL'}`);
             
             if (!pageData.url || this.errors.some(e => e.url === pageData.url)) {
                 this.updateProgress(`⚠️ Skipping ${pageData.url} - no URL or previous error`);
                 continue;
             }
             
             this.updateProgress(`🔍 Interactive exploration ${i+1}/${maxPagesToExplore}: ${pageData.url}`);
             
             try {
                 const routes = await this.explorePageInteractively(pageData.url, baseUrl);
                 this.updateProgress(`📍 Found ${routes.length} routes from ${pageData.url}`);
                 routes.forEach(route => discoveredRoutes.add(route));
                 
                 // Rate limiting for interactive discovery
                 await this.sleep(1000);
                 
             } catch (error) {
                 this.updateProgress(`⚠️ Interactive exploration failed for ${pageData.url}: ${error.message}`);
             }
         }
         
         this.updateProgress(`🏁 Phase 2 exploration complete: Found ${discoveredRoutes.size} unique interactive routes`);
        
        const newRoutes = Array.from(discoveredRoutes).filter(route => 
            !this.visitedUrls.has(route) && 
            this.isSameDomain(route)
        );
        
        this.updateProgress(`🎯 Interactive discovery found ${newRoutes.length} additional routes`);
        return newRoutes;
    }

    /**
     * Explore a single page interactively by clicking elements
     */
         async explorePageInteractively(url, baseUrl) {
         const context = this.authContext || await this.browser.newContext();
         const page = await context.newPage();
         const discoveredRoutes = new Set();
         
         this.updateProgress(`🌐 Creating page context for interactive exploration of ${url}`);
        
        try {
            // Set up network monitoring to catch AJAX routes
            const ajaxRoutes = new Set();
            page.on('request', request => {
                const reqUrl = request.url();
                if (reqUrl.startsWith(baseUrl) && 
                    (request.method() === 'GET' || request.method() === 'POST') &&
                    !reqUrl.includes('favicon') && 
                    !reqUrl.includes('.css') && 
                    !reqUrl.includes('.js') &&
                    !reqUrl.includes('.png') && 
                    !reqUrl.includes('.jpg')) {
                    ajaxRoutes.add(reqUrl);
                }
            });
            
            this.updateProgress(`🔍 Exploring ${url} interactively`);
            await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
            
            // Wait for page to fully load
            await page.waitForTimeout(3000);
            
            // 1. Find and click navigation buttons/links
            const navigationSelectors = [
                // Standard navigation
                'nav button, nav a:not([href])', 
                '.navigation button, .navigation a:not([href])',
                '.menu button, .menu a:not([href])',
                '.navbar button, .navbar a:not([href])',
                
                // Admin interface specific
                '.admin-nav button, .admin-nav a:not([href])',
                '.sidebar button, .sidebar a:not([href])',
                '.dashboard-nav button, .dashboard-nav a:not([href])',
                
                // Dropdown and accordion triggers
                '.dropdown-toggle, .dropdown-trigger',
                '.accordion-toggle, .accordion-trigger',
                '[data-toggle="dropdown"], [data-toggle="collapse"]',
                
                // Federation Manager specific
                '.fm-navigation button, .fm-navigation a:not([href])',
                '.entity-nav button, .organization-nav button',
                '.management-panel button, .admin-panel button',
                
                // Generic interactive elements that might reveal routes
                'button[onclick], button[data-url], button[data-route]',
                '[role="button"]:not(a[href]), [role="menuitem"]:not(a[href])',
                '.btn:not(a[href]), .button:not(a[href])',
                
                // Tab systems
                '.tab-button, .tab-link:not([href]), [role="tab"]:not([href])',
                
                // Common patterns
                'button[type="button"], input[type="button"]'
            ];
            
            for (const selector of navigationSelectors) {
                try {
                    const elements = await page.$$(selector);
                    this.updateProgress(`🔍 Found ${elements.length} interactive elements: ${selector.split(',')[0]}...`);
                    
                    // Click up to 5 elements per selector to avoid overwhelming
                    const elementsToClick = elements.slice(0, 5);
                    
                    for (const element of elementsToClick) {
                        try {
                            // Check if element is visible and enabled
                            const isVisible = await element.isVisible();
                            const isEnabled = await element.isEnabled();
                            
                            if (!isVisible || !isEnabled) continue;
                            
                            // Get element text for logging
                            const text = await element.textContent() || await element.getAttribute('title') || 'Unknown';
                            
                            this.updateProgress(`🖱️ Clicking: ${text.substring(0, 50)}`);
                            
                            // Record current URL before click
                            const beforeUrl = page.url();
                            
                            // Click with safety measures
                            await Promise.race([
                                element.click({ timeout: 3000 }),
                                page.waitForTimeout(3000)
                            ]);
                            
                            // Wait for potential navigation or AJAX
                            await page.waitForTimeout(2000);
                            
                            // Check if URL changed (navigation occurred)
                            const afterUrl = page.url();
                            if (afterUrl !== beforeUrl && this.isSameDomain(afterUrl)) {
                                discoveredRoutes.add(afterUrl);
                                this.updateProgress(`📍 Navigation detected: ${afterUrl}`);
                                
                                // Navigate back to continue exploration
                                await page.goBack({ waitUntil: 'networkidle', timeout: 5000 });
                                await page.waitForTimeout(1000);
                            }
                            
                        } catch (clickError) {
                            // Continue to next element if click fails
                            continue;
                        }
                    }
                } catch (selectorError) {
                    // Continue to next selector if this one fails
                    continue;
                }
            }
            
            // 2. Check for dynamically loaded content/menus
            try {
                // Look for elements that might trigger dynamic content
                const dynamicTriggers = await page.$$('[data-target], [data-bs-target], [aria-expanded="false"]');
                
                for (const trigger of dynamicTriggers.slice(0, 3)) {
                    try {
                        await trigger.click();
                        await page.waitForTimeout(1500);
                        
                        // Look for newly appeared links
                        const newLinks = await page.$$eval('a[href]', links => 
                            links.map(link => link.href).filter(href => 
                                href && !href.startsWith('javascript:') && !href.startsWith('mailto:')
                            )
                        );
                        
                        newLinks.forEach(link => {
                            if (this.isSameDomain(link)) {
                                discoveredRoutes.add(link);
                            }
                        });
                        
                    } catch (e) {
                        continue;
                    }
                }
            } catch (e) {
                // Continue if dynamic content exploration fails
            }
            
            // 3. Add AJAX routes that were discovered
            ajaxRoutes.forEach(route => {
                if (this.isSameDomain(route)) {
                    discoveredRoutes.add(route);
                }
            });
            
            // 4. Execute JavaScript to look for route configuration
            try {
                const jsRoutes = await page.evaluate(() => {
                    const routes = [];
                    
                    // Look for common routing libraries
                    if (window.router || window.Router) {
                        // Extract routes if router object exists
                    }
                    
                    // Look for window variables that might contain routes
                    for (const key of Object.keys(window)) {
                        if (key.toLowerCase().includes('route') || key.toLowerCase().includes('path')) {
                            try {
                                const value = window[key];
                                if (typeof value === 'object' && value !== null) {
                                    JSON.stringify(value).match(/["']\/[a-zA-Z0-9\-_\/]+["']/g)?.forEach(match => {
                                        const path = match.replace(/["']/g, '');
                                        if (path.startsWith('/') && path.length > 1) {
                                            routes.push(path);
                                        }
                                    });
                                }
                            } catch (e) {}
                        }
                    }
                    
                    return routes;
                });
                
                jsRoutes.forEach(route => {
                    try {
                        const fullUrl = new URL(route, baseUrl).toString();
                        if (this.isSameDomain(fullUrl)) {
                            discoveredRoutes.add(fullUrl);
                        }
                    } catch (e) {}
                });
                
            } catch (e) {
                // Continue if JavaScript execution fails
            }
            
        } catch (error) {
            this.updateProgress(`⚠️ Error during interactive exploration of ${url}: ${error.message}`);
        } finally {
            await page.close();
        }
        
        return Array.from(discoveredRoutes);
    }
}

// Export for use in other modules
module.exports = SiteCrawler;

// CLI usage
if (require.main === module) {
    async function main() {
        const args = process.argv.slice(2);
        if (args.length === 0) {
            console.log('Usage: node site-crawler.js <url> [options]');
            console.log('Example: node site-crawler.js http://localhost:3000 --max-depth=2 --max-pages=100');
            console.log('');
            console.log('Options:');
            console.log('  --test-name=<name>     Test name for reports');
            console.log('  --max-depth=<number>   Maximum crawl depth (default: 3)');
            console.log('  --max-pages=<number>   Maximum pages to crawl (default: 500)');
            console.log('  --use-auth             Enable authentication for protected pages');
            console.log('  --headless=false       Run browser in visible mode (useful for auth debugging)');
            console.log('  --auth-config={}       JSON string with authentication configuration');

            console.log('  --no-interactive       Disable interactive discovery (button clicking, JavaScript interaction)');
            console.log('');
            console.log('Authentication examples:');
            console.log('  # Use environment variables (TEST_USERNAME, TEST_PASSWORD)');
            console.log('  node site-crawler.js https://app.com --use-auth');
            console.log('');
            console.log('  # Debug authentication with visible browser');
            console.log('  node site-crawler.js https://app.com --use-auth --headless=false');
            process.exit(1);
        }
        
        const url = args[0];
        
        // Parse command line arguments
        let testName = 'CLI Crawl';
        let maxDepth = 3;
        let maxPages = 500;
        let useAuth = false;
        let headless = true;
        let authConfig = null;
        let enableInteractiveDiscovery = true;
        
        args.slice(1).forEach(arg => {
            if (arg.startsWith('--test-name=')) {
                testName = arg.split('=')[1];
            } else if (arg.startsWith('--max-depth=')) {
                maxDepth = parseInt(arg.split('=')[1]);
            } else if (arg.startsWith('--max-pages=')) {
                maxPages = parseInt(arg.split('=')[1]);
            } else if (arg === '--use-auth') {
                useAuth = true;
            } else if (arg === '--no-interactive') {
                enableInteractiveDiscovery = false;
            } else if (arg.startsWith('--headless=')) {
                headless = arg.split('=')[1] !== 'false';
            } else if (arg.startsWith('--auth-config=')) {
                try {
                    const configJson = arg.split('=', 2)[1];
                    authConfig = JSON.parse(configJson);
                } catch (error) {
                    console.error('❌ Error parsing --auth-config JSON:', error.message);
                    process.exit(1);
                }
            }
        });
        
        // Check for authentication when enabled
        if (useAuth) {
            const domain = new URL(url).hostname;
            const authStatesDir = path.join(__dirname, '../reports/auth-states');
            
            // Check for live session first
            let hasLiveSession = false;
            if (fs.existsSync(authStatesDir)) {
                const files = fs.readdirSync(authStatesDir);
                hasLiveSession = files.some(f => f.startsWith(`live-session-${domain}-`));
            }
            
            // Check for traditional auth config
            const hasEnvAuth = process.env.TEST_USERNAME && process.env.TEST_PASSWORD;
            const hasProvidedAuth = authConfig && authConfig.username && authConfig.password;
            
            if (!hasLiveSession && !hasEnvAuth && !hasProvidedAuth) {
                console.log('🔐 Authentication enabled but no session or credentials found.');
                console.log('');
                console.log('Choose an option:');
                console.log('1. 🧙‍♂️ Run authentication wizard (recommended):');
                console.log(`   npm run auth:wizard ${url}`);
                console.log('');
                console.log('2. 📝 Set environment variables for basic auth:');
                console.log('   export TEST_USERNAME="your-username"');
                console.log('   export TEST_PASSWORD="your-password"');
                console.log('');
                console.log('3. 🔗 Use existing browser session (legacy):');
                console.log(`   npm run auth:login ${url}`);
                process.exit(1);
            }
            
            // Setup default auth config for environment variables
            if (!authConfig && hasEnvAuth) {
                authConfig = {
                    username: process.env.TEST_USERNAME,
                    password: process.env.TEST_PASSWORD
                };
            }
        }
        
        const crawler = new SiteCrawler({
            maxDepth,
            maxPages,
            useAuth,
            authConfig,
            headless,
            enableInteractiveDiscovery,
            rateLimitMs: 1000 // Faster for CLI
        });
        
        try {
            console.log(`Starting crawl of ${url}...`);
            const results = await crawler.crawl(url, testName);
            console.log('\nCrawl Summary:');
            console.log(`- Total pages discovered: ${results.summary.discoveredPages}`);
            console.log(`- Max depth reached: ${results.summary.maxDepthReached}`);
            console.log(`- Errors: ${results.summary.errors}`);
            console.log(`- Success rate: ${(results.summary.successfulRequests / results.summary.totalRequests * 100).toFixed(1)}%`);
            
            if (useAuth) {
                console.log('🔐 Authentication was used for protected pages');
            }
        } catch (error) {
            console.error('Crawl failed:', error.message);
            process.exit(1);
        }
    }
    
    main();
}
const { Pool } = require('pg');
const { chromium, firefox, webkit } = require('playwright');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');
const https = require('https');
const http = require('http');

class PlaywrightCrawlerService {
    constructor(dbConfig, websocketService = null) {
        this.pool = new Pool(dbConfig);
        this.websocketService = websocketService;
        this.activeCrawlers = new Map(); // Track running crawlers
        this.browsers = new Map(); // Browser instances for session persistence
        this.authSessions = new Map(); // Cached authentication sessions
        this.robotsCache = new Map(); // Cache robots.txt files for performance
    }

    /**
     * Create a new web crawler configuration
     */
    async createCrawler(crawlerData) {
        const client = await this.pool.connect();
        try {
            const query = `
                INSERT INTO web_crawlers (
                    project_id, name, description, base_url, auth_type, saml_config,
                    auth_credentials, auth_workflow, max_pages, max_depth, concurrent_requests,
                    request_delay_ms, wait_conditions, custom_selectors, javascript_execution,
                    extraction_rules, content_filters, url_patterns, browser_type,
                    viewport_config, user_agent, headers, enable_caching, cache_duration_hours,
                    session_persistence, respect_robots_txt, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
                ) RETURNING *
            `;

            const values = [
                crawlerData.project_id,
                crawlerData.name,
                crawlerData.description || '',
                crawlerData.base_url,
                crawlerData.auth_type || 'none',
                JSON.stringify(crawlerData.saml_config || {}),
                JSON.stringify(this.encryptCredentials(crawlerData.auth_credentials || {})),
                JSON.stringify(crawlerData.auth_workflow || {}),
                crawlerData.max_pages || 100,
                crawlerData.max_depth || 3,
                crawlerData.concurrent_requests || 5,
                crawlerData.request_delay_ms || 1000,
                JSON.stringify(crawlerData.wait_conditions || []),
                JSON.stringify(crawlerData.custom_selectors || {}),
                JSON.stringify(crawlerData.javascript_execution || {}),
                JSON.stringify(crawlerData.extraction_rules || {}),
                JSON.stringify(crawlerData.content_filters || {}),
                JSON.stringify(crawlerData.url_patterns || []),
                crawlerData.browser_type || 'chromium',
                JSON.stringify(crawlerData.viewport_config || { width: 1920, height: 1080 }),
                crawlerData.user_agent || null,
                JSON.stringify(crawlerData.headers || {}),
                crawlerData.enable_caching !== false,
                crawlerData.cache_duration_hours || 24,
                crawlerData.session_persistence !== false,
                crawlerData.respect_robots_txt || false, // Default to false for accessibility testing
                crawlerData.created_by
            ];

            const result = await client.query(query, values);
            console.log(`🕷️ Created web crawler: ${crawlerData.name} for project ${crawlerData.project_id}`);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Update existing crawler configuration
     */
    async updateCrawler(crawlerId, updateData) {
        const client = await this.pool.connect();
        try {
            // Build dynamic update query
            const updates = [];
            const values = [];
            let paramCount = 1;

            for (const [key, value] of Object.entries(updateData)) {
                if (key === 'id' || key === 'created_at' || key === 'project_id') continue;
                
                if (key === 'auth_credentials' && value) {
                    updates.push(`${key} = $${paramCount++}`);
                    values.push(JSON.stringify(this.encryptCredentials(value)));
                } else if (typeof value === 'object' && value !== null) {
                    updates.push(`${key} = $${paramCount++}`);
                    values.push(JSON.stringify(value));
                } else {
                    updates.push(`${key} = $${paramCount++}`);
                    values.push(value);
                }
            }

            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }

            const query = `
                UPDATE web_crawlers 
                SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount}
                RETURNING *
            `;
            values.push(crawlerId);

            const result = await client.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Crawler not found');
            }

            console.log(`🔄 Updated web crawler: ${crawlerId}`);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Start crawler execution
     */
    async startCrawler(crawlerId, runConfig = {}) {
        const crawler = await this.getCrawlerById(crawlerId);
        if (!crawler) {
            throw new Error('Crawler not found');
        }

        if (this.activeCrawlers.has(crawlerId)) {
            throw new Error('Crawler is already running');
        }

        // Create crawler run record
        const crawlerRun = await this.createCrawlerRun(crawlerId, runConfig);
        
        // Start crawler in background
        this.executeCrawler(crawler, crawlerRun, runConfig).catch(error => {
            console.error(`❌ Crawler execution failed: ${error.message}`);
            this.updateCrawlerRunStatus(crawlerRun.id, 'failed', { errors: [error.message] });
        });

        return crawlerRun;
    }

    /**
     * Verify domain resolution before crawling
     */
    async verifyDomainResolution(url) {
        const dns = require('dns').promises;
        
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            console.log(`🔍 Verifying domain resolution for: ${hostname}`);
            
            // Try DNS lookup
            const addresses = await dns.lookup(hostname, { family: 0 });
            console.log(`✅ Domain resolved: ${hostname} -> ${addresses.address}`);
            
            return true;
        } catch (error) {
            console.warn(`⚠️ DNS resolution failed for ${url}: ${error.message}`);
            console.log(`🔧 Attempting to continue anyway (DNS might work in browser context)`);
            return false; // Don't fail, just warn
        }
    }

    /**
     * Execute crawler with Playwright
     */
    async executeCrawler(crawler, crawlerRun, runConfig = {}) {
        const startTime = Date.now();
        let browser = null;
        let context = null;
        let page = null;

        try {
            console.log(`🚀 Starting crawler: ${crawler.name} (${crawlerRun.id})`);
            this.activeCrawlers.set(crawler.id, crawlerRun.id);
            
            // Test domain resolution before starting
            await this.verifyDomainResolution(crawler.base_url);

            // Update status to running
            await this.updateCrawlerRunStatus(crawlerRun.id, 'running', {
                current_url: crawler.base_url,
                started_at: new Date().toISOString()
            });

            // Initialize browser and context
            const browserType = this.getBrowserType(crawler.browser_type);
            browser = await browserType.launch({
                headless: runConfig.headless !== false,
                args: [
                    '--disable-dev-shm-usage', 
                    '--no-sandbox',
                    '--disable-features=VizDisplayCompositor',
                    '--dns-prefetch-disable',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            });

            // Create context with viewport and headers - ensure proper data types
            const contextOptions = {};
            
            // Parse viewport config if it's a JSON string
            if (crawler.viewport_config) {
                contextOptions.viewport = typeof crawler.viewport_config === 'string' 
                    ? JSON.parse(crawler.viewport_config) 
                    : crawler.viewport_config;
            } else {
                contextOptions.viewport = { width: 1920, height: 1080 }; // Default viewport
            }
            
            // Set user agent as string if provided
            if (crawler.user_agent && typeof crawler.user_agent === 'string') {
                contextOptions.userAgent = crawler.user_agent;
            }
            
            // Parse headers if it's a JSON string
            if (crawler.headers) {
                const headers = typeof crawler.headers === 'string' 
                    ? JSON.parse(crawler.headers) 
                    : crawler.headers;
                if (headers && Object.keys(headers).length > 0) {
                    contextOptions.extraHTTPHeaders = headers;
                }
            }

            // Load persistent session if enabled
            if (crawler.session_persistence) {
                const sessionData = await this.loadAuthSession(crawler.id);
                if (sessionData) {
                    contextOptions.storageState = sessionData;
                }
            }

            context = await browser.newContext(contextOptions);
            page = await context.newPage();

            // Set up request interception for monitoring
            page.on('response', response => {
                console.log(`📄 ${response.status()} ${response.url()}`);
            });

            // Handle authentication if required
            if (crawler.auth_type !== 'none') {
                await this.handleAuthentication(page, crawler, crawlerRun.id);
            }

            // Start crawling process
            const crawlResults = await this.crawlPages(
                page, 
                crawler, 
                crawlerRun.id, 
                runConfig
            );

            // Save session state if persistence is enabled
            if (crawler.session_persistence) {
                const sessionState = await context.storageState();
                await this.saveAuthSession(crawler.id, sessionState);
            }

            // Update final status
            const duration = Date.now() - startTime;
            await this.updateCrawlerRunStatus(crawlerRun.id, 'completed', {
                completed_at: new Date().toISOString(),
                duration_ms: duration,
                pages_discovered: crawlResults.totalPages,
                pages_crawled: crawlResults.crawledPages,
                pages_failed: crawlResults.failedPages
            });

            console.log(`✅ Crawler completed: ${crawler.name} - ${crawlResults.totalPages} pages found`);

        } catch (error) {
            console.error(`❌ Crawler error: ${error.message}`);
            const duration = Date.now() - startTime;
            await this.updateCrawlerRunStatus(crawlerRun.id, 'failed', {
                completed_at: new Date().toISOString(),
                duration_ms: duration,
                errors: [{ message: error.message, stack: error.stack, timestamp: new Date().toISOString() }]
            });
        } finally {
            // Cleanup
            this.activeCrawlers.delete(crawler.id);
            if (page) await page.close();
            if (context) await context.close();
            if (browser) await browser.close();
        }
    }

    /**
     * Handle SAML and other authentication flows
     */
    async handleAuthentication(page, crawler, crawlerRunId) {
        console.log(`🔐 Starting authentication flow: ${crawler.auth_type}`);
        
        try {
            switch (crawler.auth_type) {
                case 'saml':
                    await this.handleSAMLAuthentication(page, crawler);
                    break;
                case 'basic':
                    await this.handleBasicAuthentication(page, crawler);
                    break;
                case 'custom':
                    await this.handleCustomAuthentication(page, crawler);
                    break;
                default:
                    console.log(`⚠️ Unknown auth type: ${crawler.auth_type}`);
            }

            // Mark authentication as successful
            await this.updateCrawlerRunStatus(crawlerRunId, 'running', {
                auth_successful: true,
                authentication_data: { completed_at: new Date().toISOString() }
            });

            console.log(`✅ Authentication completed successfully`);
        } catch (error) {
            console.error(`❌ Authentication failed: ${error.message}`);
            await this.updateCrawlerRunStatus(crawlerRunId, 'running', {
                auth_successful: false,
                authentication_data: { error: error.message, failed_at: new Date().toISOString() }
            });
            throw error;
        }
    }

    /**
     * Handle SAML authentication flow - Check if already authenticated
     */
    async handleSAMLAuthentication(page, crawler) {
        console.log(`🔐 SAML Authentication Check for: ${crawler.base_url}`);
        
        // Navigate to the protected resource to check authentication status
        await page.goto(crawler.base_url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Allow for any redirects to complete
        
        const currentUrl = page.url();
        const pageTitle = await page.title();
        
        console.log(`🔧 Current URL: ${currentUrl}`);
        console.log(`🔧 Page Title: ${pageTitle}`);
        
        // Check if we're redirected to a login page
        if (currentUrl.includes('/login') || pageTitle.toLowerCase().includes('login')) {
            console.log(`⚠️ Redirected to login page - user not authenticated`);
            console.log(`🔧 For federated SSO systems like InCommon, manual authentication required`);
            console.log(`🔧 SOLUTION: Run this command to copy your browser cookies:`);
            console.log(`🔧 1. Open https://fm-dev.ti.internet2.edu in your browser and login`);
            console.log(`🔧 2. Press F12 → Application → Cookies → copy all cookies`);
            console.log(`🔧 3. OR use the browser session sharing feature (coming soon)`);
            
            // Try to inject a known session if available
            try {
                // Check if there's a SAML session we can reuse
                await this.tryInjectSAMLSession(page, crawler);
                
                // Test if injection worked
                await page.goto(crawler.base_url);
                await page.waitForLoadState('networkidle');
                const newUrl = page.url();
                
                if (!newUrl.includes('/login')) {
                    console.log(`✅ Session injection successful! Now authenticated`);
                    return; // Continue with authenticated crawling
                }
            } catch (error) {
                console.log(`⚠️ Session injection failed: ${error.message}`);
            }
            
            // For now, we'll attempt to continue crawling what we can access
            console.log(`🔧 Attempting to crawl accessible pages without authentication...`);
            return;
        }
        
        // Check if we can access protected content
        const hasProtectedContent = await page.evaluate(() => {
            // Look for indicators that we're on an authenticated page
            const body = document.body.textContent || '';
            const hasNavigation = document.querySelector('nav, .navigation, .menu, .sidebar') !== null;
            const hasDashboard = body.toLowerCase().includes('dashboard') || 
                               body.toLowerCase().includes('welcome') ||
                               document.querySelector('.dashboard, #dashboard') !== null;
            const hasUserInfo = document.querySelector('.user, .profile, .logout, [href*="logout"]') !== null;
            
            return {
                hasNavigation,
                hasDashboard, 
                hasUserInfo,
                bodyLength: body.length,
                url: window.location.href
            };
        });
        
        console.log(`🔧 Authentication check results:`, hasProtectedContent);
        
        if (hasProtectedContent.hasNavigation || hasProtectedContent.hasDashboard || hasProtectedContent.hasUserInfo) {
            console.log(`✅ Successfully authenticated! User has access to protected content`);
            console.log(`🎯 Ready to crawl authenticated pages`);
        } else if (hasProtectedContent.bodyLength > 1000) {
            console.log(`✅ Page loaded with substantial content - likely authenticated`);
            console.log(`🎯 Proceeding with crawling`);
        } else {
            console.log(`⚠️ Authentication status unclear - minimal content detected`);
            console.log(`🔧 Proceeding with crawling attempt anyway`);
        }
        
        // No form filling needed for pre-authenticated federated SSO
        console.log(`🔧 SAML authentication check complete`);
    }

    /**
     * Try to inject SAML session cookies for authentication
     */
    async tryInjectSAMLSession(page, crawler) {
        console.log(`🔧 Attempting to inject SAML session for ${crawler.base_url}`);
        
        const fs = require('fs');
        const path = require('path');
        
        // Try to load saved session
        const sessionFile = path.join(process.cwd(), 'fm-session.json');
        
        if (fs.existsSync(sessionFile)) {
            try {
                const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
                console.log(`🔧 Found saved session from ${sessionData.extractedAt}`);
                console.log(`🔧 Session was for URL: ${sessionData.url}`);
                
                // Check if session is recent (within 24 hours)
                const sessionAge = Date.now() - new Date(sessionData.extractedAt).getTime();
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (sessionAge > maxAge) {
                    console.log(`⚠️ Session is ${Math.round(sessionAge / (60 * 60 * 1000))} hours old - may be expired`);
                }
                
                // Inject all cookies
                if (sessionData.cookies && sessionData.cookies.length > 0) {
                    await page.context().addCookies(sessionData.cookies);
                    console.log(`✅ Injected ${sessionData.cookies.length} cookies from saved session`);
                } else {
                    throw new Error('No cookies found in session file');
                }
                
            } catch (error) {
                throw new Error(`Failed to load session file: ${error.message}`);
            }
        } else {
            throw new Error(`No session file found at ${sessionFile}. Run: node extract-browser-session.js`);
        }
    }

    /**
     * Crawl pages using breadth-first search
     */
    async crawlPages(page, crawler, crawlerRunId, runConfig) {
        const visited = new Set();
        const queue = [{ url: crawler.base_url, depth: 0 }];
        const results = {
            totalPages: 0,
            crawledPages: 0,
            failedPages: 0,
            discoveredPages: []
        };

        while (queue.length > 0 && results.totalPages < crawler.max_pages) {
            const batch = queue.splice(0, Math.min(crawler.concurrent_requests, queue.length));
            
            for (const item of batch) {
                if (visited.has(item.url) || item.depth > crawler.max_depth) continue;
                
                // Check robots.txt if enabled - WITH DEBUG LOGGING AND ROBUST BOOLEAN CHECKING
                console.log(`🔧 DEBUG: crawler.respect_robots_txt = ${crawler.respect_robots_txt}`);
                console.log(`🔧 DEBUG: typeof respect_robots_txt = ${typeof crawler.respect_robots_txt}`);
                console.log(`🔧 DEBUG: Boolean conversion = ${Boolean(crawler.respect_robots_txt)}`);
                
                // Robust boolean checking to avoid string "false" being truthy
                const shouldRespectRobots = Boolean(crawler.respect_robots_txt) && 
                                           crawler.respect_robots_txt !== false && 
                                           crawler.respect_robots_txt !== "false" &&
                                           crawler.respect_robots_txt !== 0;
                console.log(`🔧 DEBUG: shouldRespectRobots = ${shouldRespectRobots}`);
                
                if (shouldRespectRobots) {
                    console.log(`🤖 Checking robots.txt for: ${item.url}`);
                    const allowed = await this.isAllowedByRobots(item.url, crawler.respect_robots_txt);
                    console.log(`🤖 Robots.txt result: ${allowed}`);
                    if (!allowed) {
                        console.log(`🚫 Skipped by robots.txt: ${item.url}`);
                        continue;
                    }
                } else {
                    console.log(`✅ Bypassing robots.txt for: ${item.url} (respect_robots_txt = false)`);
                }
                
                visited.add(item.url);
                
                try {
                    console.log(`🔍 Crawling: ${item.url} (depth: ${item.depth})`);
                    
                    const pageData = await this.crawlSinglePage(page, item, crawler);
                    
                    // Store discovered page
                    await this.storeCrawledPage(crawlerRunId, crawler.id, pageData);
                    
                    // Add new links to queue
                    if (pageData.links && item.depth < crawler.max_depth) {
                        for (const link of pageData.links) {
                            if (!visited.has(link) && this.shouldCrawlUrl(link, crawler)) {
                                // Check robots.txt for new links if enabled - ROBUST BOOLEAN CHECKING
                                let allowedByRobots = true;
                                const shouldRespectRobotsForLink = Boolean(crawler.respect_robots_txt) && 
                                                                  crawler.respect_robots_txt !== false && 
                                                                  crawler.respect_robots_txt !== "false" &&
                                                                  crawler.respect_robots_txt !== 0;
                                                                  
                                if (shouldRespectRobotsForLink) {
                                    console.log(`🤖 Checking robots.txt for new link: ${link}`);
                                    allowedByRobots = await this.isAllowedByRobots(link, crawler.respect_robots_txt);
                                } else {
                                    console.log(`✅ Bypassing robots.txt for new link: ${link} (respect_robots_txt = false)`);
                                }
                                
                                if (allowedByRobots) {
                                    queue.push({ url: link, depth: item.depth + 1, parent: item.url });
                                }
                            }
                        }
                    }
                    
                    results.totalPages++;
                    results.crawledPages++;
                    results.discoveredPages.push(pageData);
                    
                } catch (error) {
                    console.error(`❌ Failed to crawl ${item.url}: ${error.message}`);
                    results.failedPages++;
                }
                
                // Update progress
                await this.updateCrawlerRunStatus(crawlerRunId, 'running', {
                    current_url: item.url,
                    current_depth: item.depth,
                    queue_size: queue.length,
                    pages_discovered: results.totalPages
                });
                
                // Respect rate limiting
                if (crawler.request_delay_ms > 0) {
                    await new Promise(resolve => setTimeout(resolve, crawler.request_delay_ms));
                }
            }
        }

        return results;
    }

    /**
     * Crawl a single page and extract information
     */
    async crawlSinglePage(page, item, crawler) {
        const startTime = Date.now();
        
        try {
            // Check if this is a fragment URL (same page, different anchor)
            const currentUrl = page.url();
            const targetUrl = new URL(item.url);
            const currentUrlObj = new URL(currentUrl);
            
            let response = null;
            
            // If it's just a fragment change on the same page, don't navigate
            if (currentUrlObj.origin === targetUrl.origin && 
                currentUrlObj.pathname === targetUrl.pathname && 
                targetUrl.hash) {
                console.log(`🔗 Fragment navigation to ${item.url} - skipping actual navigation`);
                // Just scroll to the fragment if it exists
                try {
                    if (targetUrl.hash) {
                        const elementId = targetUrl.hash.substring(1);
                        await page.evaluate((id) => {
                            const element = document.getElementById(id);
                            if (element) element.scrollIntoView();
                        }, elementId);
                    }
                } catch (scrollError) {
                    console.warn(`⚠️ Could not scroll to fragment: ${scrollError.message}`);
                }
            } else {
                // Navigate to page normally
                response = await page.goto(item.url, { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });
            }

            // Apply custom wait conditions
            if (crawler.wait_conditions && crawler.wait_conditions.length > 0) {
                await this.applyWaitConditions(page, crawler.wait_conditions);
            }

            // Extract page information
            const pageData = await page.evaluate((extractionRules) => {
                const data = {
                    url: window.location.href,
                    title: document.title,
                    description: document.querySelector('meta[name="description"]')?.content || '',
                    contentType: document.contentType,
                    links: []
                };

                // Extract links
                const links = document.querySelectorAll('a[href]');
                data.links = Array.from(links)
                    .map(link => {
                        try {
                            return new URL(link.href, window.location.href).href;
                        } catch {
                            return null;
                        }
                    })
                    .filter(href => href && href.startsWith('http'));

                // Apply custom extraction rules
                if (extractionRules) {
                    data.extracted = {};
                    for (const [key, selector] of Object.entries(extractionRules)) {
                        const element = document.querySelector(selector);
                        data.extracted[key] = element ? element.textContent?.trim() : null;
                    }
                }

                // Analyze page structure
                data.pageAnalysis = {
                    hasLoginForm: !!document.querySelector('form input[type="password"]'),
                    hasSearchForm: !!document.querySelector('form input[type="search"], form input[name*="search"]'),
                    formCount: document.querySelectorAll('form').length,
                    imageCount: document.querySelectorAll('img').length,
                    linkCount: data.links.length
                };

                return data;
            }, crawler.extraction_rules);

            // Add response metadata
            pageData.statusCode = response ? response.status() : 200; // Handle null response for fragment URLs
            pageData.responseTime = Date.now() - startTime;
            pageData.depth = item.depth;
            pageData.parentUrl = item.parent;
            pageData.contentHash = this.generateContentHash(pageData.title + pageData.description);

            // Execute custom JavaScript if configured
            if (crawler.javascript_execution && Object.keys(crawler.javascript_execution).length > 0) {
                pageData.customData = await this.executeCustomJavaScript(page, crawler.javascript_execution);
            }

            return pageData;

        } catch (error) {
            console.error(`❌ Error crawling ${item.url}: ${error.message}`);
            return {
                url: item.url,
                statusCode: 0,
                responseTime: Date.now() - startTime,
                depth: item.depth,
                parentUrl: item.parent,
                error: error.message,
                links: []
            };
        }
    }

    /**
     * Apply custom wait conditions
     */
    async applyWaitConditions(page, waitConditions) {
        for (const condition of waitConditions) {
            try {
                switch (condition.type) {
                    case 'selector':
                        await page.waitForSelector(condition.selector, { 
                            timeout: condition.timeout || 5000,
                            state: condition.state || 'visible'
                        });
                        break;
                    case 'function':
                        await page.waitForFunction(condition.function, { timeout: condition.timeout || 5000 });
                        break;
                    case 'timeout':
                        await page.waitForTimeout(condition.duration || 1000);
                        break;
                }
            } catch (error) {
                console.warn(`⚠️ Wait condition failed: ${error.message}`);
            }
        }
    }

    /**
     * Store crawled page data in database
     */
    async storeCrawledPage(crawlerRunId, crawlerId, pageData) {
        const client = await this.pool.connect();
        try {
            const query = `
                INSERT INTO crawler_discovered_pages (
                    crawler_run_id, crawler_id, url, title, description, content_type,
                    status_code, response_time_ms, depth, parent_url, discovered_from,
                    page_size_bytes, content_hash, has_forms, meta_data, page_elements,
                    links_found, requires_auth
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                ON CONFLICT (crawler_run_id, url) DO UPDATE SET
                    last_crawled_at = CURRENT_TIMESTAMP,
                    status_code = EXCLUDED.status_code,
                    response_time_ms = EXCLUDED.response_time_ms
                RETURNING id
            `;

            const values = [
                crawlerRunId,
                crawlerId,
                pageData.url,
                pageData.title || '',
                pageData.description || '',
                pageData.contentType || 'text/html',
                pageData.statusCode || 0,
                pageData.responseTime || 0,
                pageData.depth || 0,
                pageData.parentUrl || null,
                pageData.parentUrl || null,
                0, // page_size_bytes - would need content length
                pageData.contentHash || '',
                pageData.pageAnalysis?.hasLoginForm || false,
                JSON.stringify(pageData.extracted || {}),
                JSON.stringify(pageData.pageAnalysis || {}),
                JSON.stringify(pageData.links || []),
                pageData.pageAnalysis?.hasLoginForm || false
            ];

            await client.query(query, values);
        } finally {
            client.release();
        }
    }

    /**
     * Helper methods
     */
    getBrowserType(browserType) {
        switch (browserType) {
            case 'firefox': return firefox;
            case 'webkit': return webkit;
            default: return chromium;
        }
    }

    /**
     * Check if a URL is allowed by robots.txt
     */
    async isAllowedByRobots(url, respectRobotsTxt = false) {
        // Robust boolean checking - if robots.txt checking is disabled, always allow
        const shouldRespectRobots = Boolean(respectRobotsTxt) && 
                                   respectRobotsTxt !== false && 
                                   respectRobotsTxt !== "false" &&
                                   respectRobotsTxt !== 0;
        
        if (!shouldRespectRobots) {
            console.log(`🔧 isAllowedByRobots: Bypassing robots.txt (respectRobotsTxt = ${respectRobotsTxt})`);
            return true;
        }
        
        try {
            const urlObj = new URL(url);
            const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
            const robotsUrl = `${baseUrl}/robots.txt`;
            
            // Check cache first
            if (this.robotsCache.has(baseUrl)) {
                const robotsData = this.robotsCache.get(baseUrl);
                return this.checkRobotsRules(robotsData, url, 'AccessibilityTestingBot/1.0');
            }
            
            // Fetch robots.txt
            const robotsData = await this.fetchRobotsTxt(robotsUrl);
            this.robotsCache.set(baseUrl, robotsData);
            
            return this.checkRobotsRules(robotsData, url, 'AccessibilityTestingBot/1.0');
            
        } catch (error) {
            console.log(`⚠️ Error checking robots.txt for ${url}: ${error.message}`);
            return true; // Allow on error
        }
    }

    /**
     * Fetch robots.txt content
     */
    async fetchRobotsTxt(robotsUrl) {
        return new Promise((resolve) => {
            const urlObj = new URL(robotsUrl);
            const protocol = urlObj.protocol === 'https:' ? https : http;
            
            const request = protocol.get(robotsUrl, (response) => {
                if (response.statusCode !== 200) {
                    resolve(null);
                    return;
                }
                
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => resolve(data));
            });
            
            request.on('error', () => resolve(null));
            request.setTimeout(5000, () => {
                request.destroy();
                resolve(null);
            });
        });
    }

    /**
     * Check robots.txt rules
     */
    checkRobotsRules(robotsContent, url, userAgent) {
        if (!robotsContent) {
            return true; // No robots.txt found, allow
        }

        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        
        const lines = robotsContent.split('\n').map(line => line.trim());
        let currentUserAgent = null;
        let applies = false;
        
        for (const line of lines) {
            if (line.startsWith('#') || line === '') continue;
            
            if (line.toLowerCase().startsWith('user-agent:')) {
                currentUserAgent = line.substring(11).trim();
                applies = (currentUserAgent === '*' || currentUserAgent === userAgent);
            } else if (applies && line.toLowerCase().startsWith('disallow:')) {
                const disallowPath = line.substring(9).trim();
                if (disallowPath && path.startsWith(disallowPath)) {
                    return false;
                }
            }
        }
        
        return true;
    }

    shouldCrawlUrl(url, crawler) {
        try {
            const urlObj = new URL(url);
            const baseUrlObj = new URL(crawler.base_url);
            
            // Stay within same domain by default
            if (urlObj.hostname !== baseUrlObj.hostname) {
                return false;
            }

            // Apply URL pattern filters
            if (crawler.url_patterns && crawler.url_patterns.length > 0) {
                return crawler.url_patterns.some(pattern => {
                    if (pattern.type === 'include') {
                        return new RegExp(pattern.regex).test(url);
                    } else if (pattern.type === 'exclude') {
                        return !new RegExp(pattern.regex).test(url);
                    }
                    return true;
                });
            }

            return true;
        } catch {
            return false;
        }
    }

    generateContentHash(content) {
        return crypto.createHash('sha256').update(content || '').digest('hex');
    }

    encryptCredentials(credentials) {
        // Simple encryption - in production, use proper encryption
        if (!credentials || Object.keys(credentials).length === 0) return {};
        return { encrypted: Buffer.from(JSON.stringify(credentials)).toString('base64') };
    }

    decryptCredentials(encryptedCredentials) {
        try {
            if (!encryptedCredentials || !encryptedCredentials.encrypted) return {};
            return JSON.parse(Buffer.from(encryptedCredentials.encrypted, 'base64').toString());
        } catch {
            return {};
        }
    }

    async createCrawlerRun(crawlerId, runConfig) {
        const client = await this.pool.connect();
        try {
            const query = `
                INSERT INTO crawler_runs (crawler_id, triggered_by, run_config, status)
                VALUES ($1, $2, $3, 'pending')
                RETURNING *
            `;
            const result = await client.query(query, [
                crawlerId,
                runConfig.triggered_by || 'manual',
                JSON.stringify(runConfig)
            ]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async updateCrawlerRunStatus(runId, status, updateData = {}) {
        const client = await this.pool.connect();
        try {
            const updates = [];
            const values = [];
            let paramCount = 1;

            updates.push(`status = $${paramCount++}`);
            values.push(status);
            updates.push(`updated_at = NOW()`);

            for (const [key, value] of Object.entries(updateData)) {
                updates.push(`${key} = $${paramCount++}`);
                values.push(typeof value === 'object' ? JSON.stringify(value) : value);
            }

            const query = `
                UPDATE crawler_runs 
                SET ${updates.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *, 
                    (SELECT project_id FROM web_crawlers WHERE id = crawler_runs.crawler_id) as project_id,
                    (SELECT name FROM web_crawlers WHERE id = crawler_runs.crawler_id) as crawler_name
            `;
            values.push(runId);

            const result = await client.query(query, values);
            
            // Broadcast WebSocket update if service is available
            if (this.websocketService && result.rows.length > 0) {
                const crawlerRun = result.rows[0];
                
                // Debug log to see what we're actually getting from the database
                console.log(`📊 Crawler progress: ${crawlerRun.project_id} - ${crawlerRun.status} (${crawlerRun.pages_discovered || 0} pages)`);
                
                this.websocketService.emitCrawlerProgress(crawlerRun.project_id, {
                    id: crawlerRun.id,
                    crawler_id: crawlerRun.crawler_id,
                    crawler_name: crawlerRun.crawler_name,
                    status: crawlerRun.status,
                    pages_crawled: crawlerRun.pages_crawled || 0,
                    pages_found: crawlerRun.pages_discovered || 0,  // Fix: Use pages_discovered instead of pages_found
                    current_url: crawlerRun.current_url,
                    started_at: crawlerRun.started_at,
                    completed_at: crawlerRun.completed_at,
                    errors: crawlerRun.errors
                });
            }
        } finally {
            client.release();
        }
    }

    async getCrawlerById(crawlerId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT * FROM web_crawlers WHERE id = $1', [crawlerId]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async saveAuthSession(crawlerId, sessionState) {
        // Implementation for saving browser session state
        const sessionName = 'default';
        const client = await this.pool.connect();
        try {
            const query = `
                INSERT INTO crawler_auth_sessions (crawler_id, session_name, cookies, local_storage, session_storage)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (crawler_id, session_name) DO UPDATE SET
                    cookies = EXCLUDED.cookies,
                    local_storage = EXCLUDED.local_storage,
                    session_storage = EXCLUDED.session_storage,
                    last_used_at = CURRENT_TIMESTAMP
            `;
            await client.query(query, [
                crawlerId,
                sessionName,
                JSON.stringify(sessionState.cookies || []),
                JSON.stringify(sessionState.localStorage || []),
                JSON.stringify(sessionState.sessionStorage || [])
            ]);
        } finally {
            client.release();
        }
    }

    async loadAuthSession(crawlerId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT * FROM crawler_auth_sessions WHERE crawler_id = $1 AND is_active = true ORDER BY last_used_at DESC LIMIT 1',
                [crawlerId]
            );
            
            if (result.rows.length === 0) return null;
            
            const session = result.rows[0];
            return {
                cookies: session.cookies || [],
                localStorage: session.local_storage || [],
                sessionStorage: session.session_storage || []
            };
        } finally {
            client.release();
        }
    }

    async handleBasicAuthentication(page, crawler) {
        // Parse auth credentials if it's a JSON string
        const authCredentials = typeof crawler.auth_credentials === 'string'
            ? JSON.parse(crawler.auth_credentials)
            : crawler.auth_credentials;
        const credentials = this.decryptCredentials(authCredentials);
        
        // Parse auth workflow if it's a JSON string
        const authWorkflow = typeof crawler.auth_workflow === 'string'
            ? JSON.parse(crawler.auth_workflow)
            : (crawler.auth_workflow || {});
        
        // Use login_url from auth_workflow if available, otherwise fall back to base_url
        const loginUrl = authWorkflow.login_url || crawler.base_url;
        await page.goto(loginUrl);
        
        // Wait for the page to load and for form elements to be available
        await page.waitForLoadState('networkidle');
        
        if (authWorkflow.username_selector && credentials.username) {
            try {
                await page.waitForSelector(authWorkflow.username_selector, { timeout: 10000 });
                await page.fill(authWorkflow.username_selector, credentials.username);
            } catch (error) {
                console.log(`❌ Could not find username field with selector: ${authWorkflow.username_selector}`);
            }
        }
        
        if (authWorkflow.password_selector && credentials.password) {
            try {
                await page.waitForSelector(authWorkflow.password_selector, { timeout: 10000 });
                await page.fill(authWorkflow.password_selector, credentials.password);
            } catch (error) {
                console.log(`❌ Could not find password field with selector: ${authWorkflow.password_selector}`);
            }
        }
        
        if (authWorkflow.submit_selector) {
            try {
                await page.waitForSelector(authWorkflow.submit_selector, { timeout: 10000 });
                await page.click(authWorkflow.submit_selector);
            } catch (error) {
                console.log(`❌ Could not find submit button with selector: ${authWorkflow.submit_selector}`);
            }
        }
        
        await page.waitForLoadState('networkidle');
    }

    async handleCustomAuthentication(page, crawler) {
        // Parse auth workflow if it's a JSON string
        const authWorkflow = typeof crawler.auth_workflow === 'string'
            ? JSON.parse(crawler.auth_workflow)
            : (crawler.auth_workflow || {});
            
        // Parse auth credentials if it's a JSON string
        const authCredentials = typeof crawler.auth_credentials === 'string'
            ? JSON.parse(crawler.auth_credentials)
            : crawler.auth_credentials;
        const credentials = this.decryptCredentials(authCredentials);
        
        // Execute custom authentication steps
        for (const step of authWorkflow.steps || []) {
            switch (step.action) {
                case 'goto':
                    await page.goto(step.url || crawler.base_url);
                    break;
                case 'fill':
                    await page.fill(step.selector, credentials[step.credential] || step.value);
                    break;
                case 'click':
                    await page.click(step.selector);
                    break;
                case 'wait':
                    await page.waitForSelector(step.selector, { timeout: step.timeout || 5000 });
                    break;
            }
        }
    }

    async executeCustomJavaScript(page, jsConfig) {
        const results = {};
        
        for (const [key, jsCode] of Object.entries(jsConfig)) {
            try {
                results[key] = await page.evaluate(jsCode);
            } catch (error) {
                results[key] = { error: error.message };
            }
        }
        
        return results;
    }
}

module.exports = PlaywrightCrawlerService; 
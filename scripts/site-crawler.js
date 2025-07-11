const https = require('https');
const http = require('http');
const cheerio = require('cheerio');
const robotsParser = require('robots-parser');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const AuthHelper = require('./auth-helper');
const AuthenticationWizard = require('./auth-wizard');

/**
 * Core Site Crawling Engine
 * Features: Rate limiting, duplicate detection, robots.txt respect, progress tracking
 */
class SiteCrawler {
    constructor(options = {}) {
        this.options = {
            maxDepth: options.maxDepth || 3,
            maxPages: options.maxPages || 500,
            rateLimitMs: options.rateLimitMs || 2000, // 2 second delay
            userAgent: options.userAgent || 'AccessibilityTestingBot/1.0',
            respectRobots: options.respectRobots !== false,
            timeout: options.timeout || 10000,
            useAuth: options.useAuth || false,
            authConfig: options.authConfig || null,
            headless: options.headless !== false,
            ...options
        };
        
        this.visitedUrls = new Set();
        this.discoveredPages = [];
        this.robotsCache = new Map();
        this.progressCallback = null;
        this.isRunning = false;
        this.totalRequests = 0;
        this.successfulRequests = 0;
        this.errors = [];
        this.browser = null;
        this.authContext = null;
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
                await this.setupAuthentication(rootUrl);
            }

            // Check robots.txt first
            if (this.options.respectRobots) {
                await this.loadRobotsRules(rootUrl);
            }

            // Try to discover pages from sitemap.xml first
            await this.discoverFromSitemap(rootUrl);
            
            // Start crawling from root
            const queue = [{ url: rootUrl, depth: 0, parentUrl: null }];
            
            while (queue.length > 0 && this.isRunning && this.discoveredPages.length < this.options.maxPages) {
                const { url, depth, parentUrl } = queue.shift();

                // Skip if already visited or depth exceeded
                if (this.visitedUrls.has(url) || depth > this.options.maxDepth) {
                    continue;
                }

                // Check robots.txt permission
                if (this.options.respectRobots && !this.isAllowedByRobots(url)) {
                    this.updateProgress(`Skipped by robots.txt: ${url}`, {
                        currentUrl: url,
                        currentDepth: depth,
                        maxDepth: this.options.maxDepth,
                        skipped: true
                    });
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
                        const newLinks = links.filter(link => !this.visitedUrls.has(link) && this.isSameDomain(link));
                        
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
            this.updateProgress(`Crawl completed. Found ${this.discoveredPages.length} pages`, {
                completed: true,
                totalPages: this.discoveredPages.length,
                totalErrors: this.errors.length,
                currentUrl: 'Completed',
                currentDepth: Math.max(...this.discoveredPages.map(p => p.depth), 0),
                maxDepth: this.options.maxDepth
            });

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
     * Setup authentication for the crawling session
     */
    async setupAuthentication(rootUrl) {
        if (!this.options.useAuth) {
            return;
        }

        try {
            this.updateProgress('🔐 Setting up authentication...');
            
            const domain = new URL(rootUrl).hostname;
            const authStatesDir = path.join(__dirname, '../reports/auth-states');
            
            // Look for existing live session first
            let liveSessionPath = null;
            if (fs.existsSync(authStatesDir)) {
                const files = fs.readdirSync(authStatesDir);
                const liveSessionFiles = files.filter(f => f.startsWith(`live-session-${domain}-`));
                
                if (liveSessionFiles.length > 0) {
                    // Use the most recent live session
                    liveSessionFiles.sort((a, b) => {
                        const timestampA = parseInt(a.split('-').pop().replace('.json', ''));
                        const timestampB = parseInt(b.split('-').pop().replace('.json', ''));
                        return timestampB - timestampA;
                    });
                    liveSessionPath = path.join(authStatesDir, liveSessionFiles[0]);
                    this.updateProgress(`🔄 Using existing live session: ${liveSessionFiles[0]}`);
                }
            }

            // Launch browser and setup authentication
            this.browser = await chromium.launch({ headless: this.options.headless });
            
            if (liveSessionPath && fs.existsSync(liveSessionPath)) {
                // Use live session
                this.updateProgress('🔐 Loading live authentication session...');
                this.authContext = await this.browser.newContext({ storageState: liveSessionPath });
                this.updateProgress('✅ Live session loaded successfully');
            } else if (this.options.authConfig) {
                // Use traditional auth helper
                this.updateProgress('🔐 Setting up traditional authentication...');
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
                this.updateProgress('✅ Traditional authentication setup complete');
            } else {
                // No authentication configuration found
                this.updateProgress('⚠️  Authentication enabled but no session or config found');
                this.updateProgress('💡 Run: npm run auth:wizard ' + rootUrl);
                throw new Error('No authentication session or configuration found. Please run the authentication wizard first.');
            }
            
        } catch (error) {
            this.updateProgress(`❌ Authentication setup failed: ${error.message}`);
            throw new Error(`Authentication setup failed: ${error.message}`);
        }
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
                            // Add to discovered pages with sitemap metadata
                            this.discoveredPages.push({
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
     * Load and parse robots.txt
     */
    async loadRobotsRules(baseUrl) {
        try {
            const robotsUrl = new URL('/robots.txt', baseUrl).toString();
            this.updateProgress(`Checking robots.txt: ${robotsUrl}`);
            
            const robotsContent = await this.fetchRobots(robotsUrl);
            const robots = robotsParser(robotsUrl, robotsContent);
            this.robotsCache.set(this.baseHost, robots);
            
            this.updateProgress('Robots.txt loaded successfully');
        } catch (error) {
            this.updateProgress(`No robots.txt found or error loading: ${error.message}`);
            // Continue without robots.txt restrictions
        }
    }

    /**
     * Check if URL is allowed by robots.txt
     */
    isAllowedByRobots(url) {
        const robots = this.robotsCache.get(this.baseHost);
        if (!robots) return true;
        
        return robots.isAllowed(url, this.options.userAgent) !== false;
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
                        const $ = cheerio.load(data);
                        const title = $('title').text().trim() || 'No title';
                        const wordCount = $('body').text().split(/\s+/).length;
                        
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
     * Fetch a page using authenticated browser context
     */
    async fetchPageWithAuth(url) {
        try {
            const page = await this.authContext.newPage();
            
            const response = await page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: this.options.timeout 
            });
            
            // Wait for page to be fully loaded
            await page.waitForTimeout(1000);
            
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
            throw new Error(`Failed to fetch authenticated page: ${error.message}`);
        }
    }

    /**
     * Fetch robots.txt
     */
    async fetchRobots(robotsUrl) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(robotsUrl);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const req = client.request(robotsUrl, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Robots.txt not found: ${res.statusCode}`));
                    return;
                }
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });

            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Robots.txt request timeout'));
            });

            req.end();
        });
    }

    /**
     * Extract links from HTML
     */
    extractLinks(html, baseUrl) {
        const $ = cheerio.load(html);
        const links = new Set();
        
        // Extract links from various sources
        this.extractFromHrefAttributes($, baseUrl, links);
        this.extractFromSrcAttributes($, baseUrl, links);
        this.extractFromScriptContent($, baseUrl, links);
        this.extractCommonSPARoutes(baseUrl, links);
        
        return Array.from(links);
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
                if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
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
                /to\s*:\s*["']\/[^"']+["']/g      // to: "/route"
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
     * Add common SPA routes that might not be in the HTML
     */
    extractCommonSPARoutes(baseUrl, links) {
        const commonRoutes = [
            '/app',
            '/login',
            '/signup',
            '/register',
            '/dashboard',
            '/profile',
            '/settings',
            '/account',
            '/home',
            '/about',
            '/contact',
            '/help',
            '/support',
            '/pricing',
            '/features',
            '/blog',
            '/blogs',
            '/news',
            '/docs',
            '/documentation',
            '/api',
            '/terms',
            '/privacy',
            '/legal'
        ];

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
        if (path.length > 50) return false;
        if (path.includes('?')) return false;
        if (path.includes('.') && !path.endsWith('.html')) return false;
        if (path.includes('//')) return false;
        
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
            console.log('  --no-robots            Ignore robots.txt restrictions (useful for authenticated areas)');
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
        let respectRobots = true;
        
        args.slice(1).forEach(arg => {
            if (arg.startsWith('--test-name=')) {
                testName = arg.split('=')[1];
            } else if (arg.startsWith('--max-depth=')) {
                maxDepth = parseInt(arg.split('=')[1]);
            } else if (arg.startsWith('--max-pages=')) {
                maxPages = parseInt(arg.split('=')[1]);
            } else if (arg === '--use-auth') {
                useAuth = true;
            } else if (arg === '--no-robots') {
                respectRobots = false;
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
            respectRobots,
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
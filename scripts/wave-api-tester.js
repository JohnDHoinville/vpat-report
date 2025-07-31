/**
 * WAVE API Accessibility Tester
 * Integration with WebAIM's WAVE API for comprehensive accessibility analysis
 * 
 * API Key: geTFWXSu5663 (Free Plan - 500 requests/month)
 * Documentation: https://wave.webaim.org/api/docs
 */

const https = require('https');
const fs = require('fs');

class WaveApiTester {
    constructor(apiKey = 'geTFWXSu5663') {
        this.apiKey = apiKey;
        this.baseUrl = 'https://wave.webaim.org/api/request';
        this.requestCount = 0;
        this.monthlyLimit = 500; // Free plan limit
        this.rateLimitDelay = 2000; // 2 seconds between requests
        this.lastRequestTime = 0;
        
        // WAVE API error categories mapped to WCAG
        this.errorCategories = {
            'error': 'critical',
            'contrast': 'moderate', 
            'alert': 'minor',
            'feature': 'info',
            'structure': 'minor',
            'aria': 'moderate'
        };
    }

    /**
     * Perform WAVE analysis on a URL
     */
    async analyzeUrl(url, options = {}) {
        try {
            // Rate limiting check
            await this.enforceRateLimit();
            
            const params = {
                key: this.apiKey,
                url: url,
                format: 'json',
                reporttype: options.reporttype || '4', // Full report with details
                includezerroitems: options.includeZeroItems || 'false',
                userid: options.userId || 'vpat-system'
            };

            console.log(`🌊 Running WAVE analysis for ${url}`);
            
            const response = await this.makeWaveRequest(params);
            
            // Check for API errors
            if (response.status && response.status.error) {
                throw new Error(`WAVE API Error: ${response.status.error.description}`);
            }

            // Process results
            const analysis = this.processWaveResults(response, url);
            
            console.log(`✅ WAVE analysis completed: ${analysis.summary.totalIssues} issues found`);
            
            return analysis;
            
        } catch (error) {
            console.error(`❌ WAVE analysis failed for ${url}:`, error.message);
            
            // Check if we hit rate limits
            if (error.message.includes('rate limit') || error.message.includes('429')) {
                throw new Error('WAVE_RATE_LIMIT_EXCEEDED');
            }
            
            throw error;
        }
    }

    /**
     * Process WAVE API response into standardized format
     */
    processWaveResults(response, url) {
        const categories = response.categories || {};
        const details = response.details || {};
        
        const violations = [];
        let totalIssues = 0;
        let criticalIssues = 0;
        let moderateIssues = 0;
        let minorIssues = 0;

        // Process each category of issues
        Object.keys(categories).forEach(categoryKey => {
            const category = categories[categoryKey];
            
            if (category.items && Object.keys(category.items).length > 0) {
                Object.keys(category.items).forEach(itemKey => {
                    const item = category.items[itemKey];
                    const detail = details[itemKey] || {};
                    
                    const severity = this.errorCategories[categoryKey] || 'minor';
                    const count = item.count || 0;
                    
                    if (count > 0) {
                        violations.push({
                            id: itemKey,
                            description: item.description || detail.description || itemKey,
                            severity: severity,
                            category: categoryKey,
                            count: count,
                            help: detail.guidelines || '',
                            helpUrl: detail.guideline_link || '',
                            wcagReference: this.mapToWcag(itemKey, detail),
                            selectors: this.extractSelectors(detail)
                        });
                        
                        totalIssues += count;
                        if (severity === 'critical') criticalIssues += count;
                        else if (severity === 'moderate') moderateIssues += count;
                        else minorIssues += count;
                    }
                });
            }
        });

        // Extract statistics
        const statistics = response.statistics || {};
        
        return {
            tool: 'wave',
            url: url,
            timestamp: new Date().toISOString(),
            summary: {
                totalIssues: totalIssues,
                criticalIssues: criticalIssues,
                moderateIssues: moderateIssues,
                minorIssues: minorIssues,
                elementsAnalyzed: statistics.pagetitle ? 1 : 0
            },
            violations: violations,
            statistics: {
                pageTitle: statistics.pagetitle || '',
                pageUrl: statistics.pageurl || url,
                creditsRemaining: response.status ? response.status.credits : null,
                processingTime: response.status ? response.status.time : null
            },
            rawResults: response // Keep full response for debugging
        };
    }

    /**
     * Map WAVE issues to WCAG guidelines
     */
    mapToWcag(itemKey, detail) {
        const wcagMappings = {
            // Level AA mappings
            'contrast': ['1.4.3', '1.4.6'],
            'alt_missing': ['1.1.1'],
            'alt_redundant': ['1.1.1'],
            'alt_duplicate': ['1.1.1'],
            'heading_skipped': ['1.3.1', '2.4.6'],
            'heading_missing': ['1.3.1', '2.4.6'],
            'link_empty': ['2.4.4'],
            'link_unclear': ['2.4.4', '2.4.9'],
            'button_empty': ['4.1.2'],
            'label_missing': ['1.3.1', '3.3.2'],
            'fieldset_missing': ['1.3.1', '3.3.2'],
            'aria_label_missing': ['4.1.2'],
            'aria_labelledby_missing': ['4.1.2'],
            'title_invalid': ['2.4.2'],
            'language_missing': ['3.1.1']
        };

        const guidelines = detail.guidelines || '';
        if (guidelines.includes('WCAG')) {
            // Extract WCAG reference from guidelines text
            const wcagMatch = guidelines.match(/WCAG (\d+\.\d+\.\d+)/);
            if (wcagMatch) {
                return [wcagMatch[1]];
            }
        }

        return wcagMappings[itemKey] || [];
    }

    /**
     * Extract CSS selectors from WAVE detail information
     */
    extractSelectors(detail) {
        const selectors = [];
        
        if (detail.selectors && Array.isArray(detail.selectors)) {
            return detail.selectors;
        }
        
        // Try to extract from other fields
        if (detail.xpath) {
            selectors.push(`xpath:${detail.xpath}`);
        }
        
        if (detail.selector) {
            selectors.push(detail.selector);
        }

        return selectors;
    }

    /**
     * Enforce rate limiting (2 seconds between requests) with WebSocket notifications
     */
    async enforceRateLimit(websocketService = null) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - timeSinceLastRequest;
            const waitSeconds = Math.ceil(waitTime / 1000);
            
            console.log(`⏱️ Rate limiting: waiting ${waitTime}ms before next WAVE request`);
            
            // Send WebSocket notification for rate limit delay
            if (websocketService && websocketService.emitRateLimitNotification) {
                websocketService.emitRateLimitNotification('wave', {
                    message: `Rate limiting: waiting ${waitSeconds}s between requests`,
                    creditsRemaining: this.getRemainingCredits(),
                    requestsMade: this.requestCount,
                    waitTime: waitTime
                });
                
                // Send minute-by-minute countdown for longer waits
                if (waitTime > 5000) {
                    await this.sendCountdownNotifications(websocketService, waitTime);
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
        this.requestCount++;
        
        // Check monthly limit
        if (this.requestCount >= this.monthlyLimit) {
            if (websocketService && websocketService.emitRateLimitNotification) {
                websocketService.emitRateLimitNotification('wave', {
                    message: `WAVE API monthly limit exceeded (${this.monthlyLimit} requests)`,
                    creditsRemaining: 0,
                    requestsMade: this.requestCount,
                    action: 'automation_paused'
                });
            }
            throw new Error('WAVE_MONTHLY_LIMIT_EXCEEDED');
        }
    }

    /**
     * Send countdown notifications via WebSocket
     */
    async sendCountdownNotifications(websocketService, totalWaitTime) {
        const intervals = Math.floor(totalWaitTime / 60000); // Number of minutes
        
        for (let i = intervals; i > 0; i--) {
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
            
            const remainingMinutes = i - 1;
            const message = remainingMinutes > 0 
                ? `Rate limit: ${remainingMinutes} minute(s) remaining`
                : 'Rate limit: resuming automation soon';
                
            websocketService.emitRateLimitNotification('wave', {
                message: message,
                creditsRemaining: this.getRemainingCredits(),
                requestsMade: this.requestCount,
                countdown: remainingMinutes
            });
        }
    }

    /**
     * Make HTTP request to WAVE API
     */
    async makeWaveRequest(params) {
        return new Promise((resolve, reject) => {
            const queryString = new URLSearchParams(params).toString();
            const requestUrl = `${this.baseUrl}?${queryString}`;
            
            https.get(requestUrl, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    try {
                        if (response.statusCode !== 200) {
                            reject(new Error(`HTTP ${response.statusCode}: ${data}`));
                            return;
                        }
                        
                        const jsonResponse = JSON.parse(data);
                        resolve(jsonResponse);
                    } catch (error) {
                        reject(new Error(`Failed to parse WAVE response: ${error.message}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`WAVE API request failed: ${error.message}`));
            });
        });
    }

    /**
     * Get remaining API credits
     */
    getRemainingCredits() {
        return Math.max(0, this.monthlyLimit - this.requestCount);
    }

    /**
     * Reset monthly counter (for testing or manual reset)
     */
    resetMonthlyCounter() {
        this.requestCount = 0;
        console.log('🔄 WAVE API monthly counter reset');
    }

    /**
     * Test the WAVE API connection
     */
    async testConnection() {
        try {
            console.log('🧪 Testing WAVE API connection...');
            const testUrl = 'https://wave.webaim.org/'; // WAVE's own site
            const result = await this.analyzeUrl(testUrl, { reporttype: '1' }); // Basic report
            
            console.log('✅ WAVE API connection test successful');
            console.log(`📊 Credits remaining: ${result.statistics.creditsRemaining || 'Unknown'}`);
            
            return {
                success: true,
                creditsRemaining: result.statistics.creditsRemaining,
                responseTime: result.statistics.processingTime
            };
        } catch (error) {
            console.error('❌ WAVE API connection test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = WaveApiTester;

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node wave-api-tester.js <url> [options]');
        console.log('Examples:');
        console.log('  node wave-api-tester.js https://example.com');
        console.log('  node wave-api-tester.js --test-connection');
        process.exit(1);
    }
    
    const tester = new WaveApiTester();
    
    if (args[0] === '--test-connection') {
        tester.testConnection().then(result => {
            console.log('Test result:', result);
        });
    } else {
        const url = args[0];
        tester.analyzeUrl(url).then(result => {
            console.log(JSON.stringify(result, null, 2));
        }).catch(error => {
            console.error('Error:', error.message);
            process.exit(1);
        });
    }
} 
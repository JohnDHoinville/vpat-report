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
                    
                    const wcagReference = this.mapToWcag(itemKey, detail);
                    const severity = this.getViolationSeverity(itemKey, wcagReference);
                    const count = item.count || 0;
                    
                    if (count > 0) {
                        const violation = {
                            id: itemKey,
                            description: item.description || detail.description || itemKey,
                            severity: severity,
                            category: categoryKey,
                            count: count,
                            help: detail.guidelines || detail.summary || '',
                            helpUrl: detail.guideline_link || detail.reference || '',
                            wcagReference: wcagReference,
                            selectors: this.extractSelectors(detail),
                            // WAVE-specific fields
                            wave_type: categoryKey,
                            impact: this.getImpactLevel(itemKey, severity),
                            remediation: this.getRemediationAdvice(itemKey),
                            is_wave_unique: this.isWaveUniqueViolation(itemKey)
                        };
                        
                        violations.push(violation);
                        
                        totalIssues += count;
                        if (severity === 'critical') criticalIssues += count;
                        else if (severity === 'high') moderateIssues += count;
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
     * Enhanced WAVE to WCAG mapping with comprehensive violation detection
     */
    mapToWcag(itemKey, detail) {
        const wcagMappings = {
            // Images and Alternative Text (WCAG 1.1.1)
            'alt_missing': ['1.1.1'],
            'alt_redundant': ['1.1.1'],
            'alt_duplicate': ['1.1.1'], 
            'alt_suspicious': ['1.1.1'],
            'alt_long': ['1.1.1'],
            'image_alt_missing': ['1.1.1'],
            'image_map_missing_alt': ['1.1.1'],
            'image_button_missing_alt': ['1.1.1'],
            'spacer_missing_alt': ['1.1.1'],
            
            // Headings and Structure (WCAG 1.3.1, 2.4.6)
            'heading_skipped': ['1.3.1', '2.4.6'],
            'heading_missing': ['1.3.1', '2.4.6'],
            'heading_empty': ['1.3.1', '2.4.6'],
            'h1_missing': ['1.3.1', '2.4.6'],
            'heading_possible': ['1.3.1', '2.4.6'],
            
            // Color and Contrast (WCAG 1.4.3, 1.4.6, 1.4.11)
            'contrast': ['1.4.3', '1.4.6'],
            'contrast_low': ['1.4.3'],
            'contrast_very_low': ['1.4.3', '1.4.6'],
            'color_contrast': ['1.4.3'],
            'color_alone': ['1.4.1'],
            
            // Links and Navigation (WCAG 2.4.4, 2.4.9)
            'link_empty': ['2.4.4'],
            'link_unclear': ['2.4.4', '2.4.9'],
            'link_redundant': ['2.4.4'],
            'link_suspicious': ['2.4.4'],
            'link_internal_broken': ['2.4.4'],
            'link_skip_missing': ['2.4.1'],
            
            // Forms and Labels (WCAG 1.3.1, 3.3.2, 4.1.2)
            'label_missing': ['1.3.1', '3.3.2'],
            'label_empty': ['1.3.1', '3.3.2'],
            'label_multiple': ['1.3.1', '3.3.2'],
            'fieldset_missing': ['1.3.1', '3.3.2'],
            'legend_missing': ['1.3.1', '3.3.2'],
            'button_empty': ['4.1.2'],
            'select_missing_label': ['1.3.1', '3.3.2'],
            'textarea_missing_label': ['1.3.1', '3.3.2'],
            
            // ARIA and Semantics (WCAG 4.1.2, 1.3.1)
            'aria_label_missing': ['4.1.2'],
            'aria_labelledby_missing': ['4.1.2'],
            'aria_describedby_missing': ['4.1.2'],
            'aria_invalid': ['4.1.2'],
            'aria_reference_broken': ['4.1.2'],
            'role_invalid': ['4.1.2'],
            'landmark_missing': ['1.3.1'],
            'landmark_no_heading': ['1.3.1', '2.4.6'],
            
            // Page Structure and Language (WCAG 2.4.2, 3.1.1, 3.1.2)
            'title_invalid': ['2.4.2'],
            'title_empty': ['2.4.2'],
            'title_redundant': ['2.4.2'],
            'language_missing': ['3.1.1'],
            'language_invalid': ['3.1.1'],
            'lang_missing': ['3.1.2'],
            
            // Tables (WCAG 1.3.1)
            'table_missing_caption': ['1.3.1'],
            'table_missing_headers': ['1.3.1'],
            'th_missing_scope': ['1.3.1'],
            'layout_table': ['1.3.1'],
            
            // Keyboard and Focus (WCAG 2.1.1, 2.4.7)
            'tabindex_invalid': ['2.1.1', '2.4.7'],
            'accesskey_duplicate': ['2.1.1'],
            'focus_indicator_missing': ['2.4.7'],
            
            // Video and Audio (WCAG 1.2.1, 1.2.2, 1.2.3)
            'video_missing_captions': ['1.2.2'],
            'audio_missing_transcript': ['1.2.1'],
            'media_missing_alternative': ['1.2.3'],
            
            // Flashing and Seizures (WCAG 2.3.1)
            'blink': ['2.3.1'],
            'marquee': ['2.3.1'],
            
            // Document Structure (WCAG 1.3.1, 4.1.1)
            'html_validation': ['4.1.1'],
            'doctype_missing': ['4.1.1'],
            'meta_viewport_invalid': ['1.4.10'],
            
            // Error Prevention (WCAG 3.3.1, 3.3.3, 3.3.4)
            'error_empty': ['3.3.1'],
            'error_missing': ['3.3.1'],
            'required_missing': ['3.3.2']
        };

        // Enhanced guidelines parsing for WAVE-specific WCAG references
        const guidelines = detail.guidelines || detail.description || '';
        if (guidelines.includes('WCAG')) {
            const wcagMatches = guidelines.match(/WCAG (\d+\.\d+\.\d+)/g);
            if (wcagMatches) {
                return wcagMatches.map(match => match.replace('WCAG ', ''));
            }
        }

        // Check for Section 508 references and map to equivalent WCAG
        if (guidelines.includes('Section 508')) {
            const section508ToWcag = {
                '1194.22(a)': ['1.1.1'], // Text alternatives
                '1194.22(b)': ['1.2.1', '1.2.2'], // Multimedia alternatives
                '1194.22(c)': ['1.4.1'], // Color not sole means
                '1194.22(d)': ['1.3.1'], // Structure and presentation
                '1194.22(g)': ['2.4.6'], // Headings
                '1194.22(h)': ['1.3.1'], // Data tables
                '1194.22(i)': ['2.4.4'], // Link purpose
                '1194.22(n)': ['3.3.2'], // Form labels
                '1194.22(o)': ['2.1.1'] // Keyboard accessibility
            };
            
            for (const [section, wcagCriteria] of Object.entries(section508ToWcag)) {
                if (guidelines.includes(section)) {
                    return wcagCriteria;
                }
            }
        }

        return wcagMappings[itemKey] || [];
    }

    /**
     * Get violation severity based on WCAG level and impact
     */
    getViolationSeverity(itemKey, wcagCriteria) {
        // Critical issues that prevent access
        const criticalIssues = [
            'alt_missing', 'contrast', 'heading_skipped', 'label_missing',
            'button_empty', 'link_empty', 'language_missing', 'title_empty'
        ];
        
        // High priority issues that significantly impact usability
        const highPriorityIssues = [
            'heading_missing', 'contrast_low', 'aria_label_missing',
            'fieldset_missing', 'link_unclear', 'table_missing_headers'
        ];
        
        if (criticalIssues.includes(itemKey)) {
            return 'critical';
        } else if (highPriorityIssues.includes(itemKey)) {
            return 'high';
        } else if (wcagCriteria.length > 0) {
            // Check if any WCAG criteria are Level A (more critical)
            const levelACriteria = ['1.1.1', '1.3.1', '2.1.1', '2.4.4', '3.1.1', '4.1.1', '4.1.2'];
            if (wcagCriteria.some(criterion => levelACriteria.includes(criterion))) {
                return 'moderate';
            }
        }
        
        return 'minor';
    }

    /**
     * Get impact level based on violation type and severity
     */
    getImpactLevel(itemKey, severity) {
        const highImpactItems = [
            'alt_missing', 'contrast', 'heading_skipped', 'label_missing',
            'link_empty', 'button_empty', 'language_missing'
        ];
        
        const mediumImpactItems = [
            'heading_missing', 'aria_label_missing', 'title_invalid',
            'fieldset_missing', 'link_unclear'
        ];
        
        if (severity === 'critical' || highImpactItems.includes(itemKey)) {
            return 'high';
        } else if (severity === 'high' || mediumImpactItems.includes(itemKey)) {
            return 'medium';
        }
        
        return 'low';
    }

    /**
     * Get WAVE-specific remediation advice
     */
    getRemediationAdvice(itemKey) {
        const remediationAdvice = {
            'alt_missing': 'Add meaningful alternative text that describes the content or function of the image.',
            'contrast': 'Increase color contrast between text and background to meet WCAG AA standards (4.5:1 for normal text).',
            'heading_skipped': 'Use proper heading hierarchy without skipping levels (h1 → h2 → h3).',
            'label_missing': 'Add proper labels to form controls using <label>, aria-label, or aria-labelledby.',
            'link_empty': 'Provide descriptive link text that clearly indicates the destination or purpose.',
            'button_empty': 'Add descriptive text or aria-label to buttons to indicate their function.',
            'language_missing': 'Add lang attribute to <html> element to declare the page language.',
            'title_invalid': 'Provide a unique, descriptive page title that identifies the page content.',
            'fieldset_missing': 'Group related form controls using <fieldset> and <legend> elements.',
            'aria_label_missing': 'Add aria-label or aria-labelledby to provide accessible names for interactive elements.',
            'table_missing_headers': 'Add proper <th> elements and scope attributes to data tables.',
            'video_missing_captions': 'Provide captions for all video content with meaningful audio.',
            'focus_indicator_missing': 'Ensure all interactive elements have visible focus indicators.',
            'landmark_missing': 'Add ARIA landmarks (banner, main, navigation, contentinfo) to page regions.'
        };
        
        return remediationAdvice[itemKey] || 'Review WAVE documentation for specific remediation guidance.';
    }

    /**
     * Determine if this is a WAVE-unique violation not typically caught by other tools
     */
    isWaveUniqueViolation(itemKey) {
        // Violations that WAVE excels at detecting that other tools might miss
        const waveUniqueViolations = [
            'heading_possible',        // Detects text that looks like headings but isn't marked up
            'link_suspicious',         // Identifies potentially problematic link text
            'alt_suspicious',          // Flags potentially inadequate alt text
            'color_alone',            // Detects when color is the only way to convey information
            'layout_table',           // Identifies tables used for layout instead of data
            'spacer_missing_alt',     // Finds spacer images without proper alt attributes
            'aria_reference_broken',  // Detects broken ARIA references
            'landmark_no_heading',    // Identifies landmarks without proper headings
            'title_redundant',        // Finds redundant page titles
            'meta_viewport_invalid',  // Detects problematic viewport settings
            'accesskey_duplicate',    // Finds duplicate access keys
            'lang_missing',           // Detects missing language declarations in content
            'contrast_very_low',      // More sensitive contrast detection
            'table_missing_caption',  // Identifies data tables without captions
            'legend_missing'          // Detects fieldsets without legends
        ];
        
        return waveUniqueViolations.includes(itemKey);
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
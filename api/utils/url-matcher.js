/**
 * URL Matching and Validation Utility
 * Handles URL normalization, matching with database test instances, and validation
 * 
 * @module URLMatcher
 */

const { logger } = require('./logger');
const { createUploadLogger } = require('./pdf-logger');

const urlLogger = createUploadLogger('URLMatcher');

/**
 * URL Matcher Class
 * Provides utilities for normalizing URLs and matching them with database records
 */
class URLMatcher {
    constructor() {
        // URL normalization settings
        this.normalizationOptions = {
            removeTrailingSlash: true,
            convertToHttps: false, // Don't auto-convert HTTP to HTTPS
            removeWWW: false, // Keep www. prefix as it might be significant
            removeFragments: true, // Remove #fragments as they don't affect server requests
            removeDefaultPorts: true, // Remove :80 for HTTP and :443 for HTTPS
            lowercaseHostname: true, // Normalize hostname to lowercase
            sortQueryParams: false // Don't sort query params as order might matter
        };
    }
    
    /**
     * Normalize a URL for consistent matching
     * @param {string} url - The URL to normalize
     * @returns {string} Normalized URL
     */
    normalizeURL(url) {
        try {
            if (!url || typeof url !== 'string') {
                urlLogger.warn('⚠️ Invalid URL provided for normalization', { url });
                return null;
            }
            
            // Trim whitespace
            url = url.trim();
            
            // Add protocol if missing (assume https for modern websites)
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
            
            // Parse the URL
            const urlObj = new URL(url);
            
            // Apply normalization options
            if (this.normalizationOptions.lowercaseHostname) {
                urlObj.hostname = urlObj.hostname.toLowerCase();
            }
            
            if (this.normalizationOptions.removeDefaultPorts) {
                if ((urlObj.protocol === 'http:' && urlObj.port === '80') ||
                    (urlObj.protocol === 'https:' && urlObj.port === '443')) {
                    urlObj.port = '';
                }
            }
            
            if (this.normalizationOptions.removeFragments) {
                urlObj.hash = '';
            }
            
            if (this.normalizationOptions.removeTrailingSlash) {
                urlObj.pathname = urlObj.pathname.replace(/\/+$/, '') || '/';
            }
            
            const normalizedURL = urlObj.toString();
            
            urlLogger.debug('🔧 URL normalized', {
                original: url,
                normalized: normalizedURL
            });
            
            return normalizedURL;
            
        } catch (error) {
            urlLogger.error('❌ URL normalization failed', {
                url,
                error: error.message
            });
            return url; // Return original URL if normalization fails
        }
    }
    
    /**
     * Create URL variations for more flexible matching
     * @param {string} url - The base URL
     * @returns {Array<string>} Array of URL variations
     */
    createURLVariations(url) {
        try {
            const variations = new Set();
            const originalURL = url;
            
            // Add the original URL
            variations.add(originalURL);
            
            // Add normalized version
            const normalized = this.normalizeURL(url);
            if (normalized && normalized !== originalURL) {
                variations.add(normalized);
            }
            
            // Parse URL for creating variations
            const urlObj = new URL(normalized || originalURL);
            
            // Create protocol variations (both HTTP and HTTPS)
            if (urlObj.protocol === 'https:') {
                const httpVersion = url.replace(/^https:/i, 'http:');
                variations.add(httpVersion);
                const httpNormalized = this.normalizeURL(httpVersion);
                if (httpNormalized) variations.add(httpNormalized);
            } else if (urlObj.protocol === 'http:') {
                const httpsVersion = url.replace(/^http:/i, 'https:');
                variations.add(httpsVersion);
                const httpsNormalized = this.normalizeURL(httpsVersion);
                if (httpsNormalized) variations.add(httpsNormalized);
            }
            
            // Create www variations
            if (urlObj.hostname.startsWith('www.')) {
                const noWwwURL = url.replace(/\/\/www\./i, '//');
                variations.add(noWwwURL);
                const noWwwNormalized = this.normalizeURL(noWwwURL);
                if (noWwwNormalized) variations.add(noWwwNormalized);
            } else {
                const wwwURL = url.replace(/\/\/([^\/])/i, '//www.$1');
                variations.add(wwwURL);
                const wwwNormalized = this.normalizeURL(wwwURL);
                if (wwwNormalized) variations.add(wwwNormalized);
            }
            
            // Create trailing slash variations
            const withTrailingSlash = normalized.endsWith('/') ? normalized : normalized + '/';
            const withoutTrailingSlash = normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
            variations.add(withTrailingSlash);
            variations.add(withoutTrailingSlash);
            
            const variationArray = Array.from(variations).filter(v => v && v.length > 0);
            
            urlLogger.debug('🔄 URL variations created', {
                original: originalURL,
                variationCount: variationArray.length,
                variations: variationArray
            });
            
            return variationArray;
            
        } catch (error) {
            urlLogger.error('❌ Failed to create URL variations', {
                url,
                error: error.message
            });
            return [url]; // Return original URL as fallback
        }
    }
    
    /**
     * Match URLs from PDF with test instances in the database
     * @param {Array<string>} pdfURLs - URLs extracted from PDF
     * @param {Array<Object>} testInstances - Test instances from database
     * @param {string} requirementNumber - Requirement number for context
     * @returns {Object} Matching results
     */
    async matchURLsWithTestInstances(pdfURLs, testInstances, requirementNumber) {
        try {
            urlLogger.info('🔍 Starting URL matching process', {
                pdfURLCount: pdfURLs.length,
                testInstanceCount: testInstances.length,
                requirementNumber
            });
            
            const matchResults = {
                matches: [],
                unmatchedPDFURLs: [],
                unmatchedTestInstances: [],
                warnings: [],
                statistics: {
                    totalPDFURLs: pdfURLs.length,
                    totalTestInstances: testInstances.length,
                    matchedURLs: 0,
                    matchedInstances: 0
                }
            };
            
            // Normalize and create variations for all PDF URLs
            const pdfURLVariations = new Map();
            for (const pdfURL of pdfURLs) {
                const variations = this.createURLVariations(pdfURL);
                pdfURLVariations.set(pdfURL, variations);
            }
            
            // Normalize test instance URLs
            const normalizedTestInstances = testInstances.map(instance => ({
                ...instance,
                normalizedURL: this.normalizeURL(instance.url),
                urlVariations: this.createURLVariations(instance.url)
            }));
            
            // Track which test instances have been matched
            const matchedTestInstanceIds = new Set();
            
            // Perform matching
            for (const [originalPDFURL, pdfVariations] of pdfURLVariations) {
                let bestMatch = null;
                let matchType = null;
                
                // Try to find exact matches first
                for (const testInstance of normalizedTestInstances) {
                    if (matchedTestInstanceIds.has(testInstance.id)) {
                        continue; // Skip already matched instances
                    }
                    
                    // Check for exact URL match (any variation)
                    for (const pdfVariation of pdfVariations) {
                        for (const testVariation of testInstance.urlVariations) {
                            if (pdfVariation === testVariation) {
                                bestMatch = testInstance;
                                matchType = 'exact';
                                break;
                            }
                        }
                        if (bestMatch) break;
                    }
                    if (bestMatch) break;
                }
                
                // If no exact match, try fuzzy matching (hostname + path similarity)
                if (!bestMatch) {
                    for (const testInstance of normalizedTestInstances) {
                        if (matchedTestInstanceIds.has(testInstance.id)) {
                            continue;
                        }
                        
                        // Check if hostnames match (for fuzzy matching)
                        try {
                            const pdfURLObj = new URL(this.normalizeURL(originalPDFURL));
                            const testURLObj = new URL(testInstance.normalizedURL);
                            
                            if (pdfURLObj.hostname === testURLObj.hostname) {
                                // Same hostname - this could be a fuzzy match
                                const similarity = this.calculateURLSimilarity(originalPDFURL, testInstance.url);
                                
                                if (similarity > 0.7) { // 70% similarity threshold
                                    bestMatch = testInstance;
                                    matchType = 'fuzzy';
                                    break;
                                }
                            }
                        } catch (urlError) {
                            // Skip invalid URLs
                            continue;
                        }
                    }
                }
                
                if (bestMatch) {
                    matchedTestInstanceIds.add(bestMatch.id);
                    matchResults.matches.push({
                        pdfURL: originalPDFURL,
                        testInstance: bestMatch,
                        matchType,
                        confidence: matchType === 'exact' ? 1.0 : 0.8
                    });
                    
                    urlLogger.info('✅ URL match found', {
                        pdfURL: originalPDFURL,
                        testInstanceId: bestMatch.id,
                        testInstanceURL: bestMatch.url,
                        matchType
                    });
                } else {
                    matchResults.unmatchedPDFURLs.push(originalPDFURL);
                    
                    urlLogger.warn('⚠️ No match found for PDF URL', {
                        pdfURL: originalPDFURL,
                        requirementNumber
                    });
                }
            }
            
            // Find unmatched test instances
            for (const testInstance of normalizedTestInstances) {
                if (!matchedTestInstanceIds.has(testInstance.id)) {
                    matchResults.unmatchedTestInstances.push(testInstance);
                }
            }
            
            // Update statistics
            matchResults.statistics.matchedURLs = matchResults.matches.length;
            matchResults.statistics.matchedInstances = matchResults.matches.length;
            
            // Generate warnings
            if (matchResults.unmatchedPDFURLs.length > 0) {
                matchResults.warnings.push(`${matchResults.unmatchedPDFURLs.length} URLs from PDF could not be matched with test instances`);
            }
            
            if (matchResults.unmatchedTestInstances.length > 0) {
                matchResults.warnings.push(`${matchResults.unmatchedTestInstances.length} test instances have no corresponding URLs in PDF`);
            }
            
            if (matchResults.matches.length === 0 && pdfURLs.length > 0 && testInstances.length > 0) {
                matchResults.warnings.push('No URLs could be matched - there may be a mismatch between PDF and database data');
            }
            
            urlLogger.info('✅ URL matching completed', {
                requirementNumber,
                totalMatches: matchResults.matches.length,
                unmatchedPDFURLs: matchResults.unmatchedPDFURLs.length,
                unmatchedTestInstances: matchResults.unmatchedTestInstances.length,
                warnings: matchResults.warnings.length
            });
            
            return matchResults;
            
        } catch (error) {
            urlLogger.error('❌ URL matching process failed', {
                error: error.message,
                stack: error.stack,
                requirementNumber
            });
            throw new Error(`URL matching failed: ${error.message}`);
        }
    }
    
    /**
     * Calculate similarity between two URLs (0.0 to 1.0)
     * @param {string} url1 - First URL
     * @param {string} url2 - Second URL
     * @returns {number} Similarity score
     * @private
     */
    calculateURLSimilarity(url1, url2) {
        try {
            const normalized1 = this.normalizeURL(url1);
            const normalized2 = this.normalizeURL(url2);
            
            if (normalized1 === normalized2) {
                return 1.0;
            }
            
            // Simple Levenshtein-based similarity
            const distance = this.levenshteinDistance(normalized1, normalized2);
            const maxLength = Math.max(normalized1.length, normalized2.length);
            
            return maxLength === 0 ? 1.0 : (maxLength - distance) / maxLength;
            
        } catch (error) {
            urlLogger.warn('⚠️ Failed to calculate URL similarity', {
                url1,
                url2,
                error: error.message
            });
            return 0.0;
        }
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Edit distance
     * @private
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Validate if a URL is properly formatted and accessible
     * @param {string} url - URL to validate
     * @returns {Object} Validation result
     */
    async validateURL(url) {
        const result = {
            isValid: false,
            normalized: null,
            errors: [],
            warnings: []
        };
        
        try {
            // Basic format validation
            const normalized = this.normalizeURL(url);
            if (!normalized) {
                result.errors.push('URL could not be normalized');
                return result;
            }
            
            result.normalized = normalized;
            
            // Try to parse as URL object
            const urlObj = new URL(normalized);
            
            // Check protocol
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                result.errors.push(`Unsupported protocol: ${urlObj.protocol}`);
                return result;
            }
            
            // Check hostname
            if (!urlObj.hostname || urlObj.hostname.length === 0) {
                result.errors.push('Invalid or missing hostname');
                return result;
            }
            
            // Basic hostname validation
            if (!/^[a-zA-Z0-9.-]+$/.test(urlObj.hostname)) {
                result.warnings.push('Hostname contains unusual characters');
            }
            
            result.isValid = true;
            
            urlLogger.debug('✅ URL validation passed', {
                original: url,
                normalized: normalized,
                warnings: result.warnings.length
            });
            
        } catch (error) {
            result.errors.push(`URL parsing failed: ${error.message}`);
            
            urlLogger.warn('⚠️ URL validation failed', {
                url,
                error: error.message
            });
        }
        
        return result;
    }
    
    /**
     * Batch validate multiple URLs
     * @param {Array<string>} urls - URLs to validate
     * @returns {Array<Object>} Validation results for each URL
     */
    async validateURLs(urls) {
        const results = [];
        
        for (const url of urls) {
            const result = await this.validateURL(url);
            results.push({
                url,
                ...result
            });
        }
        
        urlLogger.info('🔍 Batch URL validation completed', {
            totalURLs: urls.length,
            validURLs: results.filter(r => r.isValid).length,
            invalidURLs: results.filter(r => !r.isValid).length
        });
        
        return results;
    }
}

/**
 * Factory function to create a new URL matcher instance
 * @returns {URLMatcher} New URL matcher instance
 */
function createURLMatcher() {
    return new URLMatcher();
}

module.exports = {
    URLMatcher,
    createURLMatcher
};

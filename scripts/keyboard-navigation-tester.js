#!/usr/bin/env node

/**
 * Standalone Keyboard Navigation Tester
 * Provides keyboard accessibility testing utilities
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class KeyboardNavigationTester {
    constructor(options = {}) {
        this.options = {
            url: options.url || 'http://localhost:3000',
            headless: options.headless !== false,
            timeout: options.timeout || 30000,
            maxTabs: options.maxTabs || 25,
            ...options
        };
        
        this.results = {
            metadata: {
                timestamp: new Date().toISOString(),
                url: this.options.url,
                tool: 'keyboard-navigation-tester'
            },
            summary: {
                focusableElements: 0,
                tabSequenceLength: 0,
                skipLinksFound: 0,
                focusIndicatorsPresent: 0,
                violationsFound: 0
            },
            tabOrder: [],
            skipLinks: [],
            focusIndicators: [],
            violations: []
        };
    }

    /**
     * Run comprehensive keyboard navigation testing
     */
    async runTests() {
        console.log('🎹 Starting keyboard navigation testing...');
        console.log(`🔗 Testing URL: ${this.options.url}`);
        
        const browser = await chromium.launch({ 
            headless: this.options.headless 
        });
        
        try {
            const page = await browser.newPage();
            
            // Set up page
            await page.goto(this.options.url, { 
                waitUntil: 'networkidle',
                timeout: this.options.timeout 
            });
            
            // Inject helper functions
            await this.injectHelpers(page);
            
            // Wait for helpers to be available
            await page.waitForTimeout(100);
            
            // Run tests
            await this.testFocusableElements(page);
            await this.testTabOrder(page);
            await this.testSkipLinks(page);
            await this.testFocusIndicators(page);
            
            // Generate summary
            this.generateSummary();
            
        } catch (error) {
            console.error('❌ Keyboard navigation testing failed:', error.message);
            this.results.violations.push({
                type: 'test-error',
                message: `Testing failed: ${error.message}`,
                severity: 'critical'
            });
        } finally {
            await browser.close();
        }
        
        return this.results;
    }

    /**
     * Inject helper functions into the page
     */
    async injectHelpers(page) {
        await page.addInitScript(() => {
            // Focus indicator checker
            window.hasFocusIndicator = function(element) {
                const styles = window.getComputedStyle(element, ':focus');
                return (
                    styles.outline !== 'none' ||
                    styles.outlineWidth !== '0px' ||
                    styles.boxShadow !== 'none'
                );
            };
        });
    }

    /**
     * Test focusable elements
     */
    async testFocusableElements(page) {
        console.log('🔍 Testing focusable elements...');
        
        const focusableElements = await page.evaluate(() => {
            const selector = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
            const elements = Array.from(document.querySelectorAll(selector));
            
            return elements.map(el => ({
                tagName: el.tagName,
                id: el.id || '',
                className: el.className || '',
                text: el.textContent?.trim().substring(0, 50) || '',
                tabIndex: el.tabIndex,
                role: el.getAttribute('role') || '',
                ariaLabel: el.getAttribute('aria-label') || '',
                href: el.href || '',
                type: el.type || '',
                visible: window.getComputedStyle(el).display !== 'none' &&
                        window.getComputedStyle(el).visibility !== 'hidden'
            }));
        });
        
        this.results.summary.focusableElements = focusableElements.length;
        console.log(`📊 Found ${focusableElements.length} focusable elements`);
        
        return focusableElements;
    }

    /**
     * Test tab order
     */
    async testTabOrder(page) {
        console.log('🔍 Testing tab order...');
        
        // Start from the beginning
        await page.keyboard.press('Home');
        await page.waitForTimeout(100);
        
        const tabSequence = [];
        let tabCount = 0;
        const seenElements = new Set();
        
        while (tabCount < this.options.maxTabs) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(100);
            
            const focusedElement = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) return null;
                
                return {
                    tagName: el.tagName,
                    id: el.id || '',
                    className: el.className || '',
                    text: el.textContent?.trim().substring(0, 50) || '',
                    tabIndex: el.tabIndex,
                    role: el.getAttribute('role') || ''
                };
            });
            
            if (!focusedElement) break;
            
            const elementKey = `${focusedElement.tagName}-${focusedElement.id}-${focusedElement.text}`;
            if (seenElements.has(elementKey)) {
                console.log('✅ Tab order cycles correctly');
                break;
            }
            
            seenElements.add(elementKey);
            tabSequence.push(focusedElement);
            tabCount++;
        }
        
        this.results.tabOrder = tabSequence;
        this.results.summary.tabSequenceLength = tabSequence.length;
        console.log(`📊 Tab sequence: ${tabSequence.length} elements`);
        
        // Validate tab order
        this.validateTabOrder(tabSequence);
    }

    /**
     * Test skip links
     */
    async testSkipLinks(page) {
        console.log('🔍 Testing skip links...');
        
        const skipLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href^="#"]'));
            return links
                .filter(link => link.textContent?.toLowerCase().includes('skip'))
                .map(link => ({
                    text: link.textContent?.trim(),
                    href: link.href,
                    visible: window.getComputedStyle(link).display !== 'none' &&
                            window.getComputedStyle(link).visibility !== 'hidden',
                    className: link.className,
                    id: link.id
                }));
        });
        
        this.results.skipLinks = skipLinks;
        this.results.summary.skipLinksFound = skipLinks.length;
        console.log(`📊 Skip links: ${skipLinks.length} found`);
    }

    /**
     * Test focus indicators
     */
    async testFocusIndicators(page) {
        console.log('🔍 Testing focus indicators...');
        
        const interactiveElements = await page.locator('a, button, input, textarea, select').all();
        const focusIndicators = [];
        
        for (let i = 0; i < Math.min(interactiveElements.length, 8); i++) {
            const element = interactiveElements[i];
            
            try {
                await element.focus();
                await page.waitForTimeout(100);
                
                const focusInfo = await element.evaluate(el => {
                    const hasFocus = window.hasFocusIndicator(el);
                    const styles = window.getComputedStyle(el, ':focus');
                    
                    return {
                        tagName: el.tagName,
                        text: el.textContent?.trim().substring(0, 30),
                        hasFocusIndicator: hasFocus,
                        outline: styles.outline,
                        outlineColor: styles.outlineColor,
                        outlineWidth: styles.outlineWidth,
                        boxShadow: styles.boxShadow
                    };
                });
                
                focusIndicators.push(focusInfo);
                
                if (!focusInfo.hasFocusIndicator) {
                    this.results.violations.push({
                        type: 'missing-focus-indicator',
                        message: `Element "${focusInfo.text}" lacks visible focus indicator`,
                        element: focusInfo,
                        severity: 'serious'
                    });
                }
            } catch (error) {
                // Skip elements that can't be focused
                continue;
            }
        }
        
        this.results.focusIndicators = focusIndicators;
        const withIndicators = focusIndicators.filter(f => f.hasFocusIndicator).length;
        this.results.summary.focusIndicatorsPresent = withIndicators;
        
        console.log(`📊 Focus indicators: ${withIndicators}/${focusIndicators.length} elements have visible indicators`);
    }

    /**
     * Validate tab order logic
     */
    validateTabOrder(tabSequence) {
        // Check for positive tabindex (anti-pattern)
        const positiveTabIndex = tabSequence.filter(el => el.tabIndex > 0);
        if (positiveTabIndex.length > 0) {
            this.results.violations.push({
                type: 'positive-tabindex',
                message: `${positiveTabIndex.length} elements use positive tabindex (anti-pattern)`,
                elements: positiveTabIndex,
                severity: 'moderate'
            });
        }
        
        // Log tab sequence analysis
        const links = tabSequence.filter(el => el.tagName === 'A');
        const buttons = tabSequence.filter(el => el.tagName === 'BUTTON');
        const inputs = tabSequence.filter(el => el.tagName === 'INPUT');
        
        console.log(`📊 Tab sequence: ${links.length} links, ${buttons.length} buttons, ${inputs.length} inputs`);
    }

    /**
     * Generate summary
     */
    generateSummary() {
        this.results.summary.violationsFound = this.results.violations.length;
        
        console.log('\n🎹 Keyboard Navigation Test Summary');
        console.log('=====================================');
        console.log(`📊 Focusable elements: ${this.results.summary.focusableElements}`);
        console.log(`📊 Tab sequence length: ${this.results.summary.tabSequenceLength}`);
        console.log(`📊 Skip links found: ${this.results.summary.skipLinksFound}`);
        console.log(`📊 Focus indicators present: ${this.results.summary.focusIndicatorsPresent}/${this.results.focusIndicators.length}`);
        console.log(`📊 Violations found: ${this.results.summary.violationsFound}`);
        
        if (this.results.violations.length > 0) {
            console.log('\n📋 Violations:');
            this.results.violations.forEach((violation, index) => {
                console.log(`${index + 1}. [${violation.severity.toUpperCase()}] ${violation.message}`);
            });
        }
    }

    /**
     * Save results to file
     */
    saveResults(outputPath) {
        const reportsDir = path.dirname(outputPath);
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
        console.log(`✅ Results saved to: ${outputPath}`);
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const url = args[0] || 'http://localhost:3000';
    
    const tester = new KeyboardNavigationTester({ url });
    
    tester.runTests().then(results => {
        // Save results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputPath = `reports/keyboard-navigation-${timestamp}.json`;
        tester.saveResults(outputPath);
        
        // Exit with appropriate code
        const hasViolations = results.violations.some(v => v.severity === 'critical' || v.severity === 'serious');
        process.exit(hasViolations ? 1 : 0);
    }).catch(error => {
        console.error('❌ Testing failed:', error);
        process.exit(1);
    });
}

module.exports = KeyboardNavigationTester; 
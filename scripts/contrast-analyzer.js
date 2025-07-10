#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright'); // We'll need this for advanced analysis

/**
 * Advanced Color Contrast Analysis Engine
 * Analyzes text size, background images, gradients, and complex contrast scenarios
 */

class ContrastAnalyzer {
    constructor() {
        this.reportsDir = path.join(__dirname, '../reports');
        this.threshold = {
            AA: { normal: 4.5, large: 3.0 },
            AAA: { normal: 7.0, large: 4.5 }
        };
        this.largeTextThreshold = {
            fontSize: 18, // 18px or larger
            fontWeight: 700 // Bold text at 14px or larger
        };
    }

    /**
     * Perform comprehensive contrast analysis on a webpage
     */
    async analyzeContrast(url, options = {}) {
        console.log(`🎨 Starting advanced contrast analysis for: ${url}`);

        const {
            level = 'AA',
            includeAAA = true,
            analyzeBackgroundImages = true,
            analyzeGradients = true,
            captureScreenshots = false
        } = options;

        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            // Navigate to the page
            await page.goto(url, { waitUntil: 'networkidle' });

            // Inject contrast analysis script
            const contrastData = await page.evaluate(this.getContrastAnalysisScript());

            // Process the raw data
            const analysisResults = await this.processContrastData(contrastData, {
                level,
                includeAAA,
                analyzeBackgroundImages,
                analyzeGradients
            });

            // Capture screenshots if requested
            if (captureScreenshots) {
                await this.captureContrastScreenshots(page, analysisResults.violations);
            }

            await browser.close();

            // Generate comprehensive report
            const report = {
                metadata: {
                    url,
                    timestamp: new Date().toISOString(),
                    wcagLevel: level,
                    includeAAA,
                    analysisOptions: options
                },
                summary: {
                    totalElements: analysisResults.totalElements,
                    passedElements: analysisResults.passed.length,
                    failedElements: analysisResults.violations.length,
                    warningElements: analysisResults.warnings.length,
                    aaViolations: analysisResults.violations.filter(v => v.level === 'AA').length,
                    aaaViolations: analysisResults.violations.filter(v => v.level === 'AAA').length
                },
                violations: analysisResults.violations,
                warnings: analysisResults.warnings,
                passed: analysisResults.passed,
                statistics: this.generateContrastStatistics(analysisResults)
            };

            // Save the report
            await this.saveContrastReport(report);

            console.log(`✅ Contrast analysis completed!`);
            console.log(`📊 Found ${report.summary.failedElements} violations out of ${report.summary.totalElements} text elements`);

            return report;

        } catch (error) {
            console.error('❌ Error during contrast analysis:', error.message);
            throw error;
        }
    }

    /**
     * Get the client-side contrast analysis script
     */
    getContrastAnalysisScript() {
        return () => {
            // This script runs in the browser context
            const results = {
                elements: [],
                totalElements: 0
            };

            // Helper function to calculate contrast ratio
            function getContrastRatio(color1, color2) {
                const getLuminance = (color) => {
                    const rgb = color.match(/\d+/g).map(Number);
                    const [r, g, b] = rgb.map(c => {
                        c = c / 255;
                        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
                    });
                    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
                };

                const lum1 = getLuminance(color1);
                const lum2 = getLuminance(color2);
                const brightest = Math.max(lum1, lum2);
                const darkest = Math.min(lum1, lum2);
                
                return (brightest + 0.05) / (darkest + 0.05);
            }

            // Helper function to convert color to RGB
            function colorToRgb(color) {
                const div = document.createElement('div');
                div.style.color = color;
                document.body.appendChild(div);
                const computedColor = window.getComputedStyle(div).color;
                document.body.removeChild(div);
                return computedColor;
            }

            // Helper function to get effective background color
            function getEffectiveBackgroundColor(element) {
                let bgColor = 'rgba(0, 0, 0, 0)';
                let currentElement = element;

                while (currentElement && currentElement !== document.body) {
                    const computedStyle = window.getComputedStyle(currentElement);
                    const currentBgColor = computedStyle.backgroundColor;
                    
                    if (currentBgColor && currentBgColor !== 'rgba(0, 0, 0, 0)' && currentBgColor !== 'transparent') {
                        bgColor = currentBgColor;
                        break;
                    }
                    
                    currentElement = currentElement.parentElement;
                }

                // If still transparent, assume white background
                if (bgColor === 'rgba(0, 0, 0, 0)') {
                    bgColor = 'rgb(255, 255, 255)';
                }

                return bgColor;
            }

            // Helper function to generate XPath
            function getXPath(element) {
                if (element.id) {
                    return `//*[@id="${element.id}"]`;
                }

                let path = '';
                let current = element;

                while (current && current.nodeType === Node.ELEMENT_NODE) {
                    let selector = current.nodeName.toLowerCase();
                    
                    if (current.className) {
                        selector += `[@class="${current.className}"]`;
                    }

                    const siblings = Array.from(current.parentNode?.children || [])
                        .filter(child => child.nodeName === current.nodeName);
                    
                    if (siblings.length > 1) {
                        const index = siblings.indexOf(current) + 1;
                        selector += `[${index}]`;
                    }

                    path = '/' + selector + path;
                    current = current.parentElement;
                }

                return path;
            }

            // Helper function to determine if text is large
            function isLargeText(element) {
                const computedStyle = window.getComputedStyle(element);
                const fontSize = parseFloat(computedStyle.fontSize);
                const fontWeight = computedStyle.fontWeight;

                // 18px+ is large text
                if (fontSize >= 18) return true;
                
                // 14px+ bold text is large text
                if (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700)) {
                    return true;
                }

                return false;
            }

            // Find all text elements
            const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, li, td, th, label, button, input[type="text"], input[type="email"], input[type="password"], textarea');

            results.totalElements = textElements.length;

            textElements.forEach((element, index) => {
                // Skip elements with no visible text
                const text = element.textContent.trim();
                if (!text || text.length === 0) return;

                // Skip hidden elements
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
                    return;
                }

                const textColor = computedStyle.color;
                const backgroundColor = getEffectiveBackgroundColor(element);
                const fontSize = parseFloat(computedStyle.fontSize);
                const fontWeight = computedStyle.fontWeight;
                const isLarge = isLargeText(element);

                // Calculate contrast ratio
                let contrastRatio = 1;
                try {
                    contrastRatio = getContrastRatio(textColor, backgroundColor);
                } catch (error) {
                    console.warn('Could not calculate contrast ratio for element:', element);
                }

                // Get element position and size
                const rect = element.getBoundingClientRect();

                // Check for background images or gradients
                const backgroundImage = computedStyle.backgroundImage;
                const hasBackgroundImage = backgroundImage && backgroundImage !== 'none';
                const hasGradient = backgroundImage && backgroundImage.includes('gradient');

                results.elements.push({
                    index,
                    tagName: element.tagName.toLowerCase(),
                    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                    textColor,
                    backgroundColor,
                    contrastRatio: Math.round(contrastRatio * 100) / 100,
                    fontSize,
                    fontWeight,
                    isLargeText: isLarge,
                    xpath: getXPath(element),
                    position: {
                        x: Math.round(rect.x),
                        y: Math.round(rect.y),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    },
                    backgroundImage: hasBackgroundImage ? backgroundImage : null,
                    hasGradient,
                    className: element.className || null,
                    id: element.id || null
                });
            });

            return results;
        };
    }

    /**
     * Process the raw contrast data and categorize results
     */
    async processContrastData(contrastData, options) {
        const { level, includeAAA } = options;
        const results = {
            totalElements: contrastData.totalElements,
            violations: [],
            warnings: [],
            passed: []
        };

        contrastData.elements.forEach(element => {
            const aaThreshold = element.isLargeText ? this.threshold.AA.large : this.threshold.AA.normal;
            const aaaThreshold = element.isLargeText ? this.threshold.AAA.large : this.threshold.AAA.normal;

            // Determine compliance status
            const passesAA = element.contrastRatio >= aaThreshold;
            const passesAAA = element.contrastRatio >= aaaThreshold;

            const elementResult = {
                ...element,
                aaThreshold,
                aaaThreshold,
                passesAA,
                passesAAA,
                wcagLevel: element.isLargeText ? 'Large Text' : 'Normal Text',
                severity: this.determineSeverity(element.contrastRatio, aaThreshold, aaaThreshold),
                recommendations: this.generateRecommendations(element, aaThreshold, aaaThreshold)
            };

            // Categorize the result
            if (!passesAA) {
                results.violations.push({
                    ...elementResult,
                    level: 'AA',
                    violationType: 'contrast-failure',
                    message: `Contrast ratio ${element.contrastRatio}:1 is below the WCAG ${level} threshold of ${aaThreshold}:1 for ${element.isLargeText ? 'large' : 'normal'} text`
                });
            } else if (includeAAA && !passesAAA) {
                results.warnings.push({
                    ...elementResult,
                    level: 'AAA',
                    violationType: 'contrast-warning',
                    message: `Contrast ratio ${element.contrastRatio}:1 meets AA but not AAA threshold of ${aaaThreshold}:1 for ${element.isLargeText ? 'large' : 'normal'} text`
                });
            } else {
                results.passed.push({
                    ...elementResult,
                    level: passesAAA ? 'AAA' : 'AA',
                    message: `Contrast ratio ${element.contrastRatio}:1 meets WCAG ${passesAAA ? 'AAA' : 'AA'} requirements`
                });
            }

            // Special handling for background images and gradients
            if (element.hasBackgroundImage || element.hasGradient) {
                const warningElement = {
                    ...elementResult,
                    level: 'MANUAL',
                    violationType: 'manual-check-required',
                    message: `Element has background image or gradient - manual verification required for accurate contrast assessment`
                };

                // Add to warnings if not already a violation
                if (passesAA) {
                    results.warnings.push(warningElement);
                }
            }
        });

        return results;
    }

    /**
     * Determine severity level based on contrast ratio
     */
    determineSeverity(ratio, aaThreshold, aaaThreshold) {
        if (ratio < aaThreshold * 0.7) return 'critical';
        if (ratio < aaThreshold) return 'serious';
        if (ratio < aaaThreshold) return 'moderate';
        return 'pass';
    }

    /**
     * Generate recommendations for improving contrast
     */
    generateRecommendations(element, aaThreshold, aaaThreshold) {
        const recommendations = [];
        const currentRatio = element.contrastRatio;

        if (currentRatio < aaThreshold) {
            const improvement = Math.ceil((aaThreshold / currentRatio) * 100);
            recommendations.push(`Increase contrast by approximately ${improvement - 100}% to meet WCAG AA requirements`);
        }

        if (currentRatio < aaaThreshold) {
            const improvement = Math.ceil((aaaThreshold / currentRatio) * 100);
            recommendations.push(`Increase contrast by approximately ${improvement - 100}% to meet WCAG AAA requirements`);
        }

        // Color-specific recommendations
        if (element.textColor.includes('rgb')) {
            recommendations.push('Consider using darker text colors or lighter background colors');
        }

        if (element.hasBackgroundImage) {
            recommendations.push('Add a semi-transparent overlay to background images to improve text contrast');
        }

        if (element.hasGradient) {
            recommendations.push('Ensure gradient backgrounds provide sufficient contrast across all color stops');
        }

        if (element.fontSize < 16) {
            recommendations.push('Consider increasing font size - larger text requires lower contrast ratios');
        }

        return recommendations;
    }

    /**
     * Generate contrast statistics
     */
    generateContrastStatistics(results) {
        const stats = {
            contrastDistribution: {
                excellent: 0,  // > 7:1
                good: 0,       // 4.5-7:1
                poor: 0,       // 3-4.5:1
                fail: 0        // < 3:1
            },
            textSizeDistribution: {
                large: 0,
                normal: 0
            },
            backgroundComplexity: {
                solid: 0,
                gradient: 0,
                image: 0
            },
            averageContrastRatio: 0,
            medianContrastRatio: 0
        };

        const allElements = [...results.violations, ...results.warnings, ...results.passed];
        
        if (allElements.length === 0) return stats;

        // Calculate distributions
        allElements.forEach(element => {
            const ratio = element.contrastRatio;
            
            // Contrast distribution
            if (ratio > 7) stats.contrastDistribution.excellent++;
            else if (ratio >= 4.5) stats.contrastDistribution.good++;
            else if (ratio >= 3) stats.contrastDistribution.poor++;
            else stats.contrastDistribution.fail++;

            // Text size distribution
            if (element.isLargeText) stats.textSizeDistribution.large++;
            else stats.textSizeDistribution.normal++;

            // Background complexity
            if (element.hasGradient) stats.backgroundComplexity.gradient++;
            else if (element.hasBackgroundImage) stats.backgroundComplexity.image++;
            else stats.backgroundComplexity.solid++;
        });

        // Calculate average and median
        const ratios = allElements.map(e => e.contrastRatio).sort((a, b) => a - b);
        stats.averageContrastRatio = Math.round((ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length) * 100) / 100;
        stats.medianContrastRatio = ratios[Math.floor(ratios.length / 2)];

        return stats;
    }

    /**
     * Capture screenshots of contrast violations
     */
    async captureContrastScreenshots(page, violations) {
        const screenshotsDir = path.join(this.reportsDir, 'contrast-screenshots');
        
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        for (let i = 0; i < Math.min(violations.length, 10); i++) {
            const violation = violations[i];
            
            try {
                // Scroll element into view and highlight it
                await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.style.outline = '3px solid red';
                        element.style.outlineOffset = '2px';
                    }
                }, violation.xpath);

                // Wait for scroll to complete
                await page.waitForTimeout(500);

                // Take screenshot
                const filename = `contrast-violation-${i + 1}-${Date.now()}.png`;
                await page.screenshot({
                    path: path.join(screenshotsDir, filename),
                    fullPage: false
                });

                violation.screenshot = filename;

            } catch (error) {
                console.warn(`Could not capture screenshot for violation ${i + 1}:`, error.message);
            }
        }
    }

    /**
     * Save contrast analysis report
     */
    async saveContrastReport(report) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `contrast-analysis-${timestamp}.json`;
        const filepath = path.join(this.reportsDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');

        // Also save as latest
        const latestPath = path.join(this.reportsDir, 'latest-contrast-analysis.json');
        fs.writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf8');

        console.log(`📄 Contrast analysis report saved: ${filename}`);
        return filepath;
    }

    /**
     * Generate contrast analysis summary
     */
    generateSummary(report) {
        const { summary, statistics } = report;
        
        console.log('\n🎨 Contrast Analysis Summary');
        console.log('=' .repeat(40));
        console.log(`📊 Total Elements Analyzed: ${summary.totalElements}`);
        console.log(`✅ Passed: ${summary.passedElements}`);
        console.log(`❌ Failed: ${summary.failedElements}`);
        console.log(`⚠️  Warnings: ${summary.warningElements}`);
        console.log(`🔴 AA Violations: ${summary.aaViolations}`);
        console.log(`🟡 AAA Violations: ${summary.aaaViolations}`);
        console.log(`📈 Average Contrast Ratio: ${statistics.averageContrastRatio}:1`);
        console.log(`📊 Median Contrast Ratio: ${statistics.medianContrastRatio}:1`);
        
        console.log('\n📊 Contrast Distribution:');
        console.log(`  Excellent (>7:1): ${statistics.contrastDistribution.excellent}`);
        console.log(`  Good (4.5-7:1): ${statistics.contrastDistribution.good}`);
        console.log(`  Poor (3-4.5:1): ${statistics.contrastDistribution.poor}`);
        console.log(`  Fail (<3:1): ${statistics.contrastDistribution.fail}`);
    }
}

// Export for use in other modules
module.exports = ContrastAnalyzer;

// Run directly if called from command line
if (require.main === module) {
    const analyzer = new ContrastAnalyzer();
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const url = args[0] || 'http://localhost:3000';
    
    const options = {
        level: 'AA',
        includeAAA: true,
        analyzeBackgroundImages: true,
        analyzeGradients: true,
        captureScreenshots: false
    };

    // Parse additional options
    if (args.includes('--aaa-only')) {
        options.level = 'AAA';
        options.includeAAA = false;
    }
    
    if (args.includes('--screenshots')) {
        options.captureScreenshots = true;
    }

    console.log(`🎨 Starting contrast analysis for: ${url}`);
    console.log(`📋 Options: ${JSON.stringify(options, null, 2)}`);

    analyzer.analyzeContrast(url, options)
        .then(report => {
            analyzer.generateSummary(report);
            
            if (report.summary.failedElements > 0) {
                console.log('\n🔍 Top 5 Contrast Violations:');
                report.violations.slice(0, 5).forEach((violation, index) => {
                    console.log(`${index + 1}. ${violation.tagName} - Ratio: ${violation.contrastRatio}:1 (needs ${violation.aaThreshold}:1)`);
                    console.log(`   Text: "${violation.text}"`);
                    console.log(`   XPath: ${violation.xpath}`);
                });
            }
        })
        .catch(error => {
            console.error('❌ Contrast analysis failed:', error.message);
            process.exit(1);
        });
}
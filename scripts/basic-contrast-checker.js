#!/usr/bin/env node

/**
 * Basic Color Contrast Checker
 * Implements WCAG 2.2 AA/AAA ratio checking for text elements
 * Uses color-contrast-checker package for validation
 */

const ColorContrastChecker = require('color-contrast-checker');
const fs = require('fs');
const path = require('path');

class BasicContrastChecker {
    constructor() {
        this.ccc = new ColorContrastChecker();
        this.results = {
            metadata: {
                timestamp: new Date().toISOString(),
                tool: 'color-contrast-checker',
                version: require('../package.json').devDependencies['color-contrast-checker'],
                wcagVersion: '2.2',
                standards: ['AA', 'AAA']
            },
            summary: {
                totalElements: 0,
                passedAA: 0,
                failedAA: 0,
                passedAAA: 0,
                failedAAA: 0
            },
            violations: []
        };
    }

    /**
     * Check contrast ratio between foreground and background colors
     * @param {string} foreground - Foreground color (hex, rgb, or named)
     * @param {string} background - Background color (hex, rgb, or named)
     * @param {number} fontSize - Font size in pixels
     * @return {Object} Contrast analysis results
     */
    checkContrast(foreground, background, fontSize = 16) {
        try {
            const isLargeText = fontSize >= 18; // 18px+ is considered large text
            
            // Calculate contrast ratio manually using luminance values
            const fgLuminance = this.ccc.hexToLuminance(foreground);
            const bgLuminance = this.ccc.hexToLuminance(background);
            const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);
            
            // Check WCAG compliance
            const passesAA = this.ccc.isLevelAA(foreground, background, fontSize);
            const passesAAA = this.ccc.isLevelAAA(foreground, background, fontSize);
            
            // Determine required ratios based on text size
            const requiredAA = isLargeText ? 3.0 : 4.5;
            const requiredAAA = isLargeText ? 4.5 : 7.0;
            
            return {
                ratio: parseFloat(ratio.toFixed(2)),
                foreground,
                background,
                fontSize,
                isLargeText,
                wcag: {
                    aa: {
                        required: requiredAA,
                        passes: passesAA,
                        status: passesAA ? 'PASS' : 'FAIL'
                    },
                    aaa: {
                        required: requiredAAA,
                        passes: passesAAA,
                        status: passesAAA ? 'PASS' : 'FAIL'
                    }
                }
            };
        } catch (error) {
            return {
                error: error.message,
                foreground,
                background,
                fontSize
            };
        }
    }

    /**
     * Analyze contrast for a set of color combinations
     * @param {Array} colorCombinations - Array of {fg, bg, fontSize, selector} objects
     */
    analyzeColorCombinations(colorCombinations) {
        this.results.summary.totalElements = colorCombinations.length;
        
        colorCombinations.forEach((combo, index) => {
            const analysis = this.checkContrast(combo.fg, combo.bg, combo.fontSize);
            
            if (analysis.error) {
                this.results.violations.push({
                    id: `contrast-error-${index + 1}`,
                    type: 'analysis-error',
                    severity: 'error',
                    selector: combo.selector || `element-${index + 1}`,
                    message: `Failed to analyze contrast: ${analysis.error}`,
                    colors: {
                        foreground: combo.fg,
                        background: combo.bg
                    }
                });
                return;
            }

            // Update summary counts
            if (analysis.wcag.aa.passes) {
                this.results.summary.passedAA++;
            } else {
                this.results.summary.failedAA++;
            }

            if (analysis.wcag.aaa.passes) {
                this.results.summary.passedAAA++;
            } else {
                this.results.summary.failedAAA++;
            }

            // Add violations for failed checks
            if (!analysis.wcag.aa.passes) {
                this.results.violations.push({
                    id: `contrast-aa-${index + 1}`,
                    type: 'color-contrast',
                    severity: 'critical',
                    wcagCriteria: '1.4.3',
                    level: 'AA',
                    selector: combo.selector || `element-${index + 1}`,
                    message: `Insufficient color contrast ratio (${analysis.ratio}:1). WCAG AA requires ${analysis.wcag.aa.required}:1 for ${analysis.isLargeText ? 'large' : 'normal'} text.`,
                    colors: {
                        foreground: analysis.foreground,
                        background: analysis.background,
                        ratio: analysis.ratio,
                        required: analysis.wcag.aa.required
                    },
                    remediation: {
                        suggestion: analysis.ratio < 2 ? 'Consider using completely different colors' : 'Darken the text color or lighten the background color',
                        targetRatio: analysis.wcag.aa.required
                    }
                });
            }

            if (!analysis.wcag.aaa.passes) {
                this.results.violations.push({
                    id: `contrast-aaa-${index + 1}`,
                    type: 'color-contrast',
                    severity: 'warning',
                    wcagCriteria: '1.4.6',
                    level: 'AAA',
                    selector: combo.selector || `element-${index + 1}`,
                    message: `Does not meet WCAG AAA contrast ratio (${analysis.ratio}:1). AAA requires ${analysis.wcag.aaa.required}:1 for ${analysis.isLargeText ? 'large' : 'normal'} text.`,
                    colors: {
                        foreground: analysis.foreground,
                        background: analysis.background,
                        ratio: analysis.ratio,
                        required: analysis.wcag.aaa.required
                    },
                    remediation: {
                        suggestion: 'Further increase contrast for AAA compliance',
                        targetRatio: analysis.wcag.aaa.required
                    }
                });
            }
        });

        return this.results;
    }

    /**
     * Test with sample color combinations
     */
    runSampleTest() {
        const sampleCombinations = [
            { fg: '#000000', bg: '#ffffff', fontSize: 16, selector: 'body' }, // Perfect contrast
            { fg: '#777777', bg: '#ffffff', fontSize: 16, selector: '.text-gray' }, // Borderline
            { fg: '#cccccc', bg: '#ffffff', fontSize: 16, selector: '.text-light' }, // Poor contrast
            { fg: '#ffffff', bg: '#000000', fontSize: 24, selector: '.large-text' }, // Large text
            { fg: '#0066cc', bg: '#ffffff', fontSize: 16, selector: '.link' }, // Link color
            { fg: '#ff0000', bg: '#ffffff', fontSize: 16, selector: '.error' }, // Error text
            { fg: '#008000', bg: '#ffffff', fontSize: 16, selector: '.success' }, // Success text
            { fg: '#ffa500', bg: '#ffffff', fontSize: 16, selector: '.warning' } // Warning text
        ];

        return this.analyzeColorCombinations(sampleCombinations);
    }

    /**
     * Save results to file
     * @param {string} outputPath - Path to save the results
     */
    saveResults(outputPath) {
        const reportsDir = path.dirname(outputPath);
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
        console.log(`✅ Contrast analysis results saved to: ${outputPath}`);
    }

    /**
     * Generate summary report
     */
    generateSummary() {
        const { summary, violations } = this.results;
        const aaComplianceRate = summary.totalElements > 0 ? 
            ((summary.passedAA / summary.totalElements) * 100).toFixed(1) : 0;
        const aaaComplianceRate = summary.totalElements > 0 ? 
            ((summary.passedAAA / summary.totalElements) * 100).toFixed(1) : 0;

        console.log('\n🎨 Basic Color Contrast Analysis Summary');
        console.log('========================================');
        console.log(`📊 Total Elements Analyzed: ${summary.totalElements}`);
        console.log(`✅ WCAG AA Compliance: ${aaComplianceRate}% (${summary.passedAA}/${summary.totalElements})`);
        console.log(`🏆 WCAG AAA Compliance: ${aaaComplianceRate}% (${summary.passedAAA}/${summary.totalElements})`);
        console.log(`❌ AA Violations: ${summary.failedAA}`);
        console.log(`⚠️  AAA Violations: ${summary.failedAAA}`);
        console.log(`🔍 Total Issues Found: ${violations.length}`);

        if (violations.length > 0) {
            console.log('\n📋 Top Contrast Issues:');
            violations.slice(0, 5).forEach((violation, index) => {
                console.log(`${index + 1}. ${violation.message}`);
                console.log(`   Ratio: ${violation.colors.ratio}:1 (Required: ${violation.colors.required}:1)`);
            });
        }
    }
}

// CLI execution
if (require.main === module) {
    const checker = new BasicContrastChecker();
    
    // Run sample test
    console.log('🚀 Running basic color contrast analysis...');
    const results = checker.runSampleTest();
    
    // Generate summary
    checker.generateSummary();
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = `reports/basic-contrast-${timestamp}.json`;
    checker.saveResults(outputPath);
    
    // Exit with appropriate code
    const hasAAViolations = results.summary.failedAA > 0;
    process.exit(hasAAViolations ? 1 : 0);
}

module.exports = BasicContrastChecker; 
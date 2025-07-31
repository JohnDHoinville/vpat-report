const puppeteer = require('puppeteer');

/**
 * Comprehensive heading structure analysis for accessibility compliance
 * Validates heading hierarchy, document structure, and WCAG compliance
 */
class HeadingStructureAnalyzer {
    constructor() {
        this.wcagCriteria = [
            '1.3.1', // Info and Relationships
            '2.4.6', // Headings and Labels
            '2.4.10' // Section Headings
        ];
    }

    /**
     * Analyze a single URL for heading structure issues
     */
    async analyzeUrl(url, options = {}) {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 720 });
            
            console.log(`🔍 Analyzing heading structure for: ${url}`);
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Inject heading analysis script
            await page.addScriptTag({ 
                content: this.getHeadingAnalysisScript() 
            });

            // Execute comprehensive heading analysis
            const analysis = await page.evaluate(() => {
                return window.analyzeHeadingStructure();
            });

            const processedResults = this.processHeadingResults(analysis, url);
            
            console.log(`✅ Heading analysis completed for ${url}: ${processedResults.summary.totalIssues} issues found`);
            return processedResults;

        } catch (error) {
            console.error(`❌ Heading analysis failed for ${url}:`, error.message);
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * Generate the client-side heading analysis script
     */
    getHeadingAnalysisScript() {
        return `
            window.analyzeHeadingStructure = function() {
                const issues = [];
                const headings = [];
                const landmarks = [];
                const documentStructure = {
                    hasMainHeading: false,
                    headingLevels: [],
                    hierarchyViolations: [],
                    missingLevels: [],
                    redundantLevels: [],
                    landmarkIssues: []
                };

                // Collect all headings
                const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
                
                headingElements.forEach((heading, index) => {
                    const level = heading.tagName.toLowerCase().match(/h([1-6])/) ? 
                        parseInt(heading.tagName.toLowerCase().replace('h', '')) :
                        parseInt(heading.getAttribute('aria-level')) || 1;
                    
                    const headingData = {
                        element: heading,
                        level: level,
                        text: heading.textContent.trim(),
                        tagName: heading.tagName.toLowerCase(),
                        ariaLevel: heading.getAttribute('aria-level'),
                        id: heading.id,
                        classes: heading.className,
                        position: index,
                        selector: this.generateSelector(heading),
                        isEmpty: !heading.textContent.trim(),
                        isHidden: this.isElementHidden(heading),
                        hasProperRole: heading.getAttribute('role') === 'heading' || /^h[1-6]$/i.test(heading.tagName)
                    };

                    headings.push(headingData);
                    documentStructure.headingLevels.push(level);
                });

                // Analyze heading hierarchy
                this.analyzeHeadingHierarchy(headings, issues, documentStructure);
                
                // Analyze document structure
                this.analyzeDocumentStructure(headings, issues, documentStructure);
                
                            // Analyze landmarks with enhanced validation
            this.analyzeLandmarks(landmarks, issues);
            
            // Enhanced document structure analysis
            this.analyzeDocumentOutline(headings, landmarks, issues, documentStructure);
            
            // Skip link and navigation analysis
            this.analyzeSkipLinks(issues);
            
            // Section structure validation
            this.analyzeSectionStructure(issues, documentStructure);
            
            // Check for accessibility violations
            this.checkHeadingAccessibility(headings, issues);

                return {
                    headings: headings,
                    landmarks: landmarks,
                    documentStructure: documentStructure,
                    issues: issues,
                    statistics: {
                        totalHeadings: headings.length,
                        headingsWithIssues: new Set(issues.map(issue => issue.headingIndex)).size,
                        totalIssues: issues.length,
                        criticalIssues: issues.filter(issue => issue.severity === 'critical').length,
                        highIssues: issues.filter(issue => issue.severity === 'high').length,
                        mediumIssues: issues.filter(issue => issue.severity === 'medium').length,
                        lowIssues: issues.filter(issue => issue.severity === 'low').length,
                        hierarchyViolations: documentStructure.hierarchyViolations.length,
                        missingLevels: documentStructure.missingLevels.length
                    }
                };
            };

            // Analyze heading hierarchy and nesting
            window.analyzeHeadingHierarchy = function(headings, issues, documentStructure) {
                if (headings.length === 0) {
                    issues.push({
                        type: 'no-headings-found',
                        severity: 'high',
                        message: 'No headings found on the page',
                        wcag: ['2.4.6', '2.4.10'],
                        element: null,
                        context: {
                            recommendation: 'Add appropriate heading structure to organize content'
                        }
                    });
                    return;
                }

                // Check for H1 presence and uniqueness
                const h1Headings = headings.filter(h => h.level === 1);
                if (h1Headings.length === 0) {
                    issues.push({
                        type: 'missing-h1',
                        severity: 'high',
                        message: 'Page lacks a main heading (H1)',
                        wcag: ['1.3.1', '2.4.6'],
                        element: null,
                        context: {
                            recommendation: 'Add a single H1 element that describes the main content of the page'
                        }
                    });
                } else if (h1Headings.length > 1) {
                    h1Headings.slice(1).forEach((heading, index) => {
                        issues.push({
                            type: 'multiple-h1',
                            severity: 'medium',
                            message: 'Multiple H1 headings found (should typically be unique)',
                            wcag: ['1.3.1', '2.4.6'],
                            element: heading.selector,
                            headingIndex: heading.position,
                            context: {
                                text: heading.text,
                                duplicateNumber: index + 2,
                                recommendation: 'Consider using H2-H6 for subsequent headings'
                            }
                        });
                    });
                } else {
                    documentStructure.hasMainHeading = true;
                }

                // Check heading hierarchy and sequence
                for (let i = 1; i < headings.length; i++) {
                    const currentHeading = headings[i];
                    const previousHeading = headings[i - 1];
                    const levelDifference = currentHeading.level - previousHeading.level;

                    // Check for skipped levels (jumping more than 1 level)
                    if (levelDifference > 1) {
                        documentStructure.hierarchyViolations.push({
                            from: previousHeading.level,
                            to: currentHeading.level,
                            position: i
                        });

                        issues.push({
                            type: 'skipped-heading-level',
                            severity: 'medium',
                            message: \`Heading level skipped: jumped from H\${previousHeading.level} to H\${currentHeading.level}\`,
                            wcag: ['1.3.1', '2.4.6'],
                            element: currentHeading.selector,
                            headingIndex: currentHeading.position,
                            context: {
                                currentLevel: currentHeading.level,
                                previousLevel: previousHeading.level,
                                currentText: currentHeading.text,
                                previousText: previousHeading.text,
                                recommendation: \`Use H\${previousHeading.level + 1} instead of H\${currentHeading.level}\`
                            }
                        });
                    }

                    // Check for illogical level increases (should follow outline structure)
                    if (i > 0 && currentHeading.level === 1 && previousHeading.level > 1) {
                        issues.push({
                            type: 'illogical-h1-placement',
                            severity: 'high',
                            message: 'H1 appears after higher-level headings',
                            wcag: ['1.3.1', '2.4.6'],
                            element: currentHeading.selector,
                            headingIndex: currentHeading.position,
                            context: {
                                text: currentHeading.text,
                                previousLevel: previousHeading.level,
                                recommendation: 'H1 should typically appear first or use appropriate heading level for the section'
                            }
                        });
                    }
                }

                // Identify missing levels in the overall structure
                const uniqueLevels = [...new Set(documentStructure.headingLevels)].sort();
                for (let i = 1; i < uniqueLevels.length; i++) {
                    const expectedLevel = uniqueLevels[i - 1] + 1;
                    if (uniqueLevels[i] > expectedLevel) {
                        for (let missingLevel = expectedLevel; missingLevel < uniqueLevels[i]; missingLevel++) {
                            documentStructure.missingLevels.push(missingLevel);
                        }
                    }
                }

                if (documentStructure.missingLevels.length > 0) {
                    issues.push({
                        type: 'missing-heading-levels',
                        severity: 'medium',
                        message: \`Missing heading levels in document structure: H\${documentStructure.missingLevels.join(', H')}\`,
                        wcag: ['1.3.1', '2.4.6'],
                        element: null,
                        context: {
                            missingLevels: documentStructure.missingLevels,
                            presentLevels: uniqueLevels,
                            recommendation: 'Ensure heading levels follow a logical hierarchy without gaps'
                        }
                    });
                }
            };

            // Analyze document structure and organization
            window.analyzeDocumentStructure = function(headings, issues, documentStructure) {
                // Check for empty headings
                headings.forEach(heading => {
                    if (heading.isEmpty) {
                        issues.push({
                            type: 'empty-heading',
                            severity: 'high',
                            message: 'Heading element is empty',
                            wcag: ['2.4.6', '4.1.2'],
                            element: heading.selector,
                            headingIndex: heading.position,
                            context: {
                                level: heading.level,
                                tagName: heading.tagName,
                                recommendation: 'Provide meaningful text content for the heading'
                            }
                        });
                    }
                });

                // Check for hidden headings
                headings.forEach(heading => {
                    if (heading.isHidden) {
                        issues.push({
                            type: 'hidden-heading',
                            severity: 'medium',
                            message: 'Heading is visually hidden but present in DOM',
                            wcag: ['1.3.1'],
                            element: heading.selector,
                            headingIndex: heading.position,
                            context: {
                                text: heading.text,
                                level: heading.level,
                                recommendation: 'Ensure hidden headings are intentional and provide structure for screen readers'
                            }
                        });
                    }
                });

                // Check for very long headings
                headings.forEach(heading => {
                    if (heading.text.length > 120) {
                        issues.push({
                            type: 'overly-long-heading',
                            severity: 'low',
                            message: 'Heading text is very long and may be difficult to understand',
                            wcag: ['2.4.6'],
                            element: heading.selector,
                            headingIndex: heading.position,
                            context: {
                                text: heading.text.substring(0, 100) + '...',
                                length: heading.text.length,
                                recommendation: 'Consider shortening heading to be more concise and scannable'
                            }
                        });
                    }
                });

                // Check for duplicate heading text at the same level
                const headingsByLevel = {};
                headings.forEach(heading => {
                    if (!headingsByLevel[heading.level]) {
                        headingsByLevel[heading.level] = [];
                    }
                    headingsByLevel[heading.level].push(heading);
                });

                Object.keys(headingsByLevel).forEach(level => {
                    const headingsAtLevel = headingsByLevel[level];
                    const textCounts = {};
                    
                    headingsAtLevel.forEach(heading => {
                        const text = heading.text.toLowerCase().trim();
                        if (text && text.length > 0) {
                            if (!textCounts[text]) {
                                textCounts[text] = [];
                            }
                            textCounts[text].push(heading);
                        }
                    });

                    Object.keys(textCounts).forEach(text => {
                        if (textCounts[text].length > 1) {
                            textCounts[text].forEach((heading, index) => {
                                if (index > 0) { // Skip the first occurrence
                                    issues.push({
                                        type: 'duplicate-heading-text',
                                        severity: 'medium',
                                        message: \`Duplicate heading text at H\${level} level\`,
                                        wcag: ['2.4.6'],
                                        element: heading.selector,
                                        headingIndex: heading.position,
                                        context: {
                                            text: heading.text,
                                            level: heading.level,
                                            duplicateCount: textCounts[text].length,
                                            recommendation: 'Use unique, descriptive text for headings at the same level'
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            };

            // Enhanced landmarks and section structure analysis
            window.analyzeLandmarks = function(landmarks, issues) {
                const landmarkElements = document.querySelectorAll('[role="main"], [role="banner"], [role="contentinfo"], [role="navigation"], [role="complementary"], [role="search"], [role="region"], [role="form"], main, header, footer, nav, aside, section, form');
                
                landmarkElements.forEach(element => {
                    const role = element.getAttribute('role') || this.getImplicitRole(element);
                    const hasHeading = element.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
                    const ariaLabel = element.getAttribute('aria-label');
                    const ariaLabelledby = element.getAttribute('aria-labelledby');
                    const hasAccessibleName = !!(ariaLabel || ariaLabelledby || hasHeading);
                    
                    landmarks.push({
                        element: element,
                        role: role,
                        hasHeading: !!hasHeading,
                        hasAccessibleName: hasAccessibleName,
                        ariaLabel: ariaLabel,
                        ariaLabelledby: ariaLabelledby,
                        selector: this.generateSelector(element),
                        tagName: element.tagName.toLowerCase()
                    });

                    // Check if landmark sections have appropriate headings or accessible names
                    if (['main', 'navigation', 'complementary', 'search', 'region'].includes(role)) {
                        if (!hasHeading && !ariaLabel && !ariaLabelledby) {
                            issues.push({
                                type: 'landmark-without-accessible-name',
                                severity: 'high',
                                message: \`\${role.charAt(0).toUpperCase() + role.slice(1)} landmark lacks an accessible name\`,
                                wcag: ['2.4.10', '4.1.2'],
                                element: this.generateSelector(element),
                                context: {
                                    role: role,
                                    recommendation: 'Add a heading, aria-label, or aria-labelledby to provide an accessible name'
                                }
                            });
                        }
                    }

                    // Check for redundant role attributes on semantic HTML elements
                    if (element.tagName.toLowerCase() === 'main' && element.getAttribute('role') === 'main') {
                        issues.push({
                            type: 'redundant-role-attribute',
                            severity: 'low',
                            message: 'Redundant role="main" on <main> element',
                            wcag: ['4.1.1'],
                            element: this.generateSelector(element),
                            context: {
                                recommendation: 'Remove redundant role attribute from semantic HTML elements'
                            }
                        });
                    }

                    // Similar checks for other semantic elements
                    const redundantRoles = {
                        'header': 'banner',
                        'footer': 'contentinfo',
                        'nav': 'navigation',
                        'aside': 'complementary'
                    };

                    const tagName = element.tagName.toLowerCase();
                    if (redundantRoles[tagName] && element.getAttribute('role') === redundantRoles[tagName]) {
                        // Exception: header/footer inside main or article don't have implicit roles
                        if (tagName === 'header' || tagName === 'footer') {
                            const isNested = element.closest('main, article, section, aside, nav');
                            if (!isNested) {
                                issues.push({
                                    type: 'redundant-role-attribute',
                                    severity: 'low',
                                    message: \`Redundant role="\${redundantRoles[tagName]}" on <\${tagName}> element\`,
                                    wcag: ['4.1.1'],
                                    element: this.generateSelector(element),
                                    context: {
                                        recommendation: 'Remove redundant role attribute from semantic HTML elements'
                                    }
                                });
                            }
                        } else {
                            issues.push({
                                type: 'redundant-role-attribute',
                                severity: 'low',
                                message: \`Redundant role="\${redundantRoles[tagName]}" on <\${tagName}> element\`,
                                wcag: ['4.1.1'],
                                element: this.generateSelector(element),
                                context: {
                                    recommendation: 'Remove redundant role attribute from semantic HTML elements'
                                }
                            });
                        }
                    }
                });

                // Enhanced landmark validation
                this.validateLandmarkStructure(landmarks, issues);
            };

            // Validate overall landmark structure
            window.validateLandmarkStructure = function(landmarks, issues) {
                // Check for main landmark
                const mainLandmarks = landmarks.filter(l => l.role === 'main');
                if (mainLandmarks.length === 0) {
                    issues.push({
                        type: 'missing-main-landmark',
                        severity: 'high',
                        message: 'Page lacks a main landmark',
                        wcag: ['1.3.1', '2.4.1'],
                        element: null,
                        context: {
                            recommendation: 'Add a main element or role="main" to identify the primary content'
                        }
                    });
                } else if (mainLandmarks.length > 1) {
                    mainLandmarks.slice(1).forEach(landmark => {
                        issues.push({
                            type: 'multiple-main-landmarks',
                            severity: 'high',
                            message: 'Multiple main landmarks found',
                            wcag: ['1.3.1'],
                            element: landmark.selector,
                            context: {
                                recommendation: 'Use only one main landmark per page'
                            }
                        });
                    });
                }

                // Check for banner landmark
                const bannerLandmarks = landmarks.filter(l => l.role === 'banner');
                if (bannerLandmarks.length === 0) {
                    issues.push({
                        type: 'missing-banner-landmark',
                        severity: 'medium',
                        message: 'Page lacks a banner landmark',
                        wcag: ['1.3.1'],
                        element: null,
                        context: {
                            recommendation: 'Add a header element or role="banner" to identify the page header'
                        }
                    });
                } else if (bannerLandmarks.length > 1) {
                    bannerLandmarks.slice(1).forEach(landmark => {
                        issues.push({
                            type: 'multiple-banner-landmarks',
                            severity: 'medium',
                            message: 'Multiple banner landmarks found',
                            wcag: ['1.3.1'],
                            element: landmark.selector,
                            context: {
                                recommendation: 'Use only one banner landmark per page'
                            }
                        });
                    });
                }

                // Check for contentinfo landmark
                const contentinfoLandmarks = landmarks.filter(l => l.role === 'contentinfo');
                if (contentinfoLandmarks.length > 1) {
                    contentinfoLandmarks.slice(1).forEach(landmark => {
                        issues.push({
                            type: 'multiple-contentinfo-landmarks',
                            severity: 'medium',
                            message: 'Multiple contentinfo landmarks found',
                            wcag: ['1.3.1'],
                            element: landmark.selector,
                            context: {
                                recommendation: 'Use only one contentinfo landmark per page'
                            }
                        });
                    });
                }

                // Check for multiple navigation landmarks without accessible names
                const navLandmarks = landmarks.filter(l => l.role === 'navigation');
                if (navLandmarks.length > 1) {
                    const unnamedNavLandmarks = navLandmarks.filter(l => !l.hasAccessibleName);
                    if (unnamedNavLandmarks.length > 0) {
                        unnamedNavLandmarks.forEach(landmark => {
                            issues.push({
                                type: 'multiple-nav-without-names',
                                severity: 'high',
                                message: 'Multiple navigation landmarks found without accessible names',
                                wcag: ['2.4.1', '4.1.2'],
                                element: landmark.selector,
                                context: {
                                    recommendation: 'Provide unique accessible names for each navigation landmark using aria-label or aria-labelledby'
                                }
                            });
                        });
                    }
                }

                // Check for regions without accessible names
                const regionLandmarks = landmarks.filter(l => l.role === 'region');
                regionLandmarks.forEach(landmark => {
                    if (!landmark.hasAccessibleName) {
                        issues.push({
                            type: 'region-without-name',
                            severity: 'high',
                            message: 'Region landmark lacks an accessible name',
                            wcag: ['4.1.2'],
                            element: landmark.selector,
                            context: {
                                recommendation: 'Provide an accessible name for region landmarks using aria-label or aria-labelledby'
                            }
                        });
                    }
                });
            };

            // Check heading-specific accessibility issues
            window.checkHeadingAccessibility = function(headings, issues) {
                headings.forEach(heading => {
                    // Check for proper role usage
                    if (heading.element.getAttribute('role') === 'heading' && !heading.ariaLevel) {
                        issues.push({
                            type: 'heading-role-without-aria-level',
                            severity: 'high',
                            message: 'Element with role="heading" lacks aria-level attribute',
                            wcag: ['4.1.2'],
                            element: heading.selector,
                            headingIndex: heading.position,
                            context: {
                                text: heading.text,
                                recommendation: 'Add aria-level attribute to specify the heading level'
                            }
                        });
                    }

                    // Check for inconsistent aria-level vs heading tag
                    if (heading.ariaLevel && heading.tagName.match(/h[1-6]/)) {
                        const tagLevel = parseInt(heading.tagName.replace('h', ''));
                        const ariaLevel = parseInt(heading.ariaLevel);
                        
                        if (tagLevel !== ariaLevel) {
                            issues.push({
                                type: 'inconsistent-heading-level',
                                severity: 'medium',
                                message: \`Heading tag level (\${tagLevel}) doesn't match aria-level (\${ariaLevel})\`,
                                wcag: ['4.1.2'],
                                element: heading.selector,
                                headingIndex: heading.position,
                                context: {
                                    text: heading.text,
                                    tagLevel: tagLevel,
                                    ariaLevel: ariaLevel,
                                    recommendation: 'Ensure heading tag level matches aria-level attribute'
                                }
                            });
                        }
                    }

                    // Check for very short headings that might not be descriptive
                    if (heading.text.trim().length > 0 && heading.text.trim().length < 3) {
                        issues.push({
                            type: 'very-short-heading',
                            severity: 'low',
                            message: 'Heading text is very short and may not be descriptive',
                            wcag: ['2.4.6'],
                            element: heading.selector,
                            headingIndex: heading.position,
                            context: {
                                text: heading.text,
                                length: heading.text.length,
                                recommendation: 'Ensure heading text is descriptive enough to understand the section content'
                            }
                        });
                    }
                });
            };

            // Enhanced document outline analysis
            window.analyzeDocumentOutline = function(headings, landmarks, issues, documentStructure) {
                // Create document outline
                const outline = this.createDocumentOutline(headings, landmarks);
                documentStructure.outline = outline;

                // Check for logical content flow
                this.validateContentFlow(outline, issues);

                // Validate section nesting
                this.validateSectionNesting(issues);
            };

            // Create hierarchical document outline
            window.createDocumentOutline = function(headings, landmarks) {
                const outline = {
                    sections: [],
                    depth: 0,
                    hasLogicalFlow: true
                };

                let currentSection = null;
                let sectionStack = [];

                headings.forEach((heading, index) => {
                    const section = {
                        level: heading.level,
                        text: heading.text,
                        element: heading.element,
                        subsections: [],
                        landmark: this.findContainingLandmark(heading.element, landmarks),
                        index: index
                    };

                    if (currentSection === null || heading.level === 1) {
                        // Root level section
                        outline.sections.push(section);
                        currentSection = section;
                        sectionStack = [section];
                    } else if (heading.level > currentSection.level) {
                        // Subsection
                        currentSection.subsections.push(section);
                        sectionStack.push(section);
                        currentSection = section;
                    } else {
                        // Same level or higher - find appropriate parent
                        while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= heading.level) {
                            sectionStack.pop();
                        }
                        
                        if (sectionStack.length === 0) {
                            outline.sections.push(section);
                        } else {
                            sectionStack[sectionStack.length - 1].subsections.push(section);
                        }
                        
                        sectionStack.push(section);
                        currentSection = section;
                    }
                });

                outline.depth = this.calculateOutlineDepth(outline.sections);
                return outline;
            };

            // Find containing landmark for heading
            window.findContainingLandmark = function(headingElement, landmarks) {
                for (const landmark of landmarks) {
                    if (landmark.element.contains(headingElement)) {
                        return landmark.role;
                    }
                }
                return null;
            };

            // Calculate maximum depth of outline
            window.calculateOutlineDepth = function(sections) {
                let maxDepth = 0;
                sections.forEach(section => {
                    const depth = 1 + (section.subsections.length > 0 ? this.calculateOutlineDepth(section.subsections) : 0);
                    maxDepth = Math.max(maxDepth, depth);
                });
                return maxDepth;
            };

            // Validate content flow in outline
            window.validateContentFlow = function(outline, issues) {
                if (outline.sections.length === 0) return;

                // Check for orphaned subsections
                outline.sections.forEach(section => {
                    this.checkOrphanedSubsections(section, issues);
                });

                // Check for balanced structure
                if (outline.depth > 6) {
                    issues.push({
                        type: 'excessive-outline-depth',
                        severity: 'medium',
                        message: \`Document outline is very deep (\${outline.depth} levels)\`,
                        wcag: ['2.4.6'],
                        element: null,
                        context: {
                            depth: outline.depth,
                            recommendation: 'Consider simplifying the document structure for better navigation'
                        }
                    });
                }
            };

            // Check for orphaned subsections
            window.checkOrphanedSubsections = function(section, issues) {
                if (section.subsections.length === 1) {
                    issues.push({
                        type: 'orphaned-subsection',
                        severity: 'low',
                        message: 'Section has only one subsection, consider restructuring',
                        wcag: ['2.4.6'],
                        element: section.subsections[0].element,
                        context: {
                            parentText: section.text,
                            recommendation: 'Consider merging single subsections with parent or adding additional subsections'
                        }
                    });
                }

                // Recursively check subsections
                section.subsections.forEach(subsection => {
                    this.checkOrphanedSubsections(subsection, issues);
                });
            };

            // Analyze skip links and navigation aids
            window.analyzeSkipLinks = function(issues) {
                // Check for skip links
                const skipLinks = document.querySelectorAll('a[href^="#"]');
                let hasSkipToMain = false;
                let hasSkipToNav = false;

                skipLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    const text = link.textContent.toLowerCase().trim();
                    
                    // Check for skip to main content
                    if (text.includes('skip') && (text.includes('main') || text.includes('content'))) {
                        hasSkipToMain = true;
                        
                        // Verify target exists and is accessible
                        const target = document.querySelector(href);
                        if (!target) {
                            issues.push({
                                type: 'broken-skip-link',
                                severity: 'high',
                                message: 'Skip link target does not exist',
                                wcag: ['2.4.1'],
                                element: this.generateSelector(link),
                                context: {
                                    href: href,
                                    text: link.textContent,
                                    recommendation: 'Ensure skip link targets exist and are focusable'
                                }
                            });
                        } else if (!target.hasAttribute('tabindex') && !target.matches('a, button, input, select, textarea, [contenteditable]')) {
                            issues.push({
                                type: 'skip-link-target-not-focusable',
                                severity: 'medium',
                                message: 'Skip link target is not focusable',
                                wcag: ['2.4.1'],
                                element: this.generateSelector(target),
                                context: {
                                    recommendation: 'Add tabindex="-1" to skip link targets to make them focusable'
                                }
                            });
                        }
                    }

                    // Check for skip to navigation
                    if (text.includes('skip') && text.includes('nav')) {
                        hasSkipToNav = true;
                    }
                });

                // Check if skip links are needed
                const hasMainLandmark = document.querySelector('[role="main"], main');
                const hasNavLandmark = document.querySelector('[role="navigation"], nav');
                
                if (hasMainLandmark && !hasSkipToMain) {
                    // Only flag as missing if there's substantial content before main
                    const bodyContent = document.body.children;
                    let contentBeforeMain = 0;
                    
                    for (const child of bodyContent) {
                        if (child.matches('[role="main"], main')) break;
                        if (child.matches('nav, header, [role="navigation"], [role="banner"]')) {
                            contentBeforeMain++;
                        }
                    }

                    if (contentBeforeMain > 0) {
                        issues.push({
                            type: 'missing-skip-to-main',
                            severity: 'medium',
                            message: 'Page lacks skip to main content link',
                            wcag: ['2.4.1'],
                            element: null,
                            context: {
                                recommendation: 'Add a skip link at the beginning of the page to allow keyboard users to bypass navigation'
                            }
                        });
                    }
                }

                // Check skip link positioning
                const firstFocusableElement = document.querySelector('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                const firstSkipLink = Array.from(skipLinks).find(link => 
                    link.textContent.toLowerCase().includes('skip')
                );

                if (firstSkipLink && firstFocusableElement && firstSkipLink !== firstFocusableElement) {
                    issues.push({
                        type: 'skip-link-not-first',
                        severity: 'medium',
                        message: 'Skip link is not the first focusable element',
                        wcag: ['2.4.1'],
                        element: this.generateSelector(firstSkipLink),
                        context: {
                            recommendation: 'Position skip links as the first focusable elements on the page'
                        }
                    });
                }
            };

            // Analyze section structure and semantic markup
            window.analyzeSectionStructure = function(issues, documentStructure) {
                // Check for proper use of section elements
                const sections = document.querySelectorAll('section');
                sections.forEach(section => {
                    const hasHeading = section.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
                    const hasAriaLabel = section.hasAttribute('aria-label');
                    const hasAriaLabelledby = section.hasAttribute('aria-labelledby');

                    if (!hasHeading && !hasAriaLabel && !hasAriaLabelledby) {
                        issues.push({
                            type: 'section-without-heading',
                            severity: 'medium',
                            message: 'Section element lacks a heading or accessible name',
                            wcag: ['1.3.1', '2.4.6'],
                            element: this.generateSelector(section),
                            context: {
                                recommendation: 'Add a heading or use aria-label/aria-labelledby to provide an accessible name for the section'
                            }
                        });
                    }
                });

                // Check for article elements
                const articles = document.querySelectorAll('article');
                articles.forEach(article => {
                    const hasHeading = article.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
                    
                    if (!hasHeading) {
                        issues.push({
                            type: 'article-without-heading',
                            severity: 'medium',
                            message: 'Article element lacks a heading',
                            wcag: ['1.3.1', '2.4.6'],
                            element: this.generateSelector(article),
                            context: {
                                recommendation: 'Add a heading to describe the article content'
                            }
                        });
                    }
                });

                // Check for main content structure
                const main = document.querySelector('main, [role="main"]');
                if (main) {
                    const mainHeadings = main.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
                    if (mainHeadings.length === 0) {
                        issues.push({
                            type: 'main-without-headings',
                            severity: 'high',
                            message: 'Main content area lacks any headings',
                            wcag: ['2.4.6', '2.4.10'],
                            element: this.generateSelector(main),
                            context: {
                                recommendation: 'Add appropriate headings to structure the main content'
                            }
                        });
                    }
                }

                // Validate sectioning content nesting
                this.validateSectioningNesting(issues);
            };

            // Validate sectioning element nesting
            window.validateSectioningNesting = function(issues) {
                const sectioningElements = document.querySelectorAll('article, aside, nav, section');
                
                sectioningElements.forEach(element => {
                    const parent = element.parentElement.closest('article, aside, nav, section');
                    
                    if (parent) {
                        // Check for logical nesting
                        const elementType = element.tagName.toLowerCase();
                        const parentType = parent.tagName.toLowerCase();
                        
                        // Flag potentially confusing nesting
                        if (elementType === 'nav' && parentType === 'nav') {
                            issues.push({
                                type: 'nested-navigation',
                                severity: 'medium',
                                message: 'Navigation element nested inside another navigation',
                                wcag: ['1.3.1'],
                                element: this.generateSelector(element),
                                context: {
                                    recommendation: 'Consider using list elements for nested navigation instead of nested nav elements'
                                }
                            });
                        }

                        if (elementType === 'main' && parent) {
                            issues.push({
                                type: 'nested-main',
                                severity: 'high',
                                message: 'Main element should not be nested inside other sectioning content',
                                wcag: ['1.3.1'],
                                element: this.generateSelector(element),
                                context: {
                                    recommendation: 'Move main element to be a direct child of body'
                                }
                            });
                        }
                    }
                });
            };

            // Enhanced section structure validation
            window.validateSectionNesting = function(issues) {
                // This is called from analyzeDocumentOutline
                // Additional validation beyond validateSectioningNesting
                
                const sectionsWithoutLandmarks = document.querySelectorAll('section:not([role])');
                sectionsWithoutLandmarks.forEach(section => {
                    const isInsideLandmark = section.closest('[role="main"], [role="complementary"], [role="region"], main, aside');
                    
                    if (!isInsideLandmark) {
                        issues.push({
                            type: 'section-outside-landmark',
                            severity: 'low',
                            message: 'Section element outside of landmark regions',
                            wcag: ['1.3.1'],
                            element: this.generateSelector(section),
                            context: {
                                recommendation: 'Consider placing sections within appropriate landmark regions or adding role="region" if the section is significant'
                            }
                        });
                    }
                });
            };

            // Utility functions
            window.generateSelector = function(element) {
                if (element.id) {
                    return '#' + element.id;
                }
                if (element.className) {
                    return element.tagName.toLowerCase() + '.' + element.className.split(' ')[0];
                }
                return element.tagName.toLowerCase();
            };

            window.isElementHidden = function(element) {
                const style = window.getComputedStyle(element);
                return style.display === 'none' || 
                       style.visibility === 'hidden' || 
                       style.opacity === '0' ||
                       element.hidden ||
                       element.getAttribute('aria-hidden') === 'true';
            };

            window.getImplicitRole = function(element) {
                const tagRoles = {
                    'main': 'main',
                    'header': 'banner',
                    'footer': 'contentinfo',
                    'nav': 'navigation',
                    'aside': 'complementary'
                };
                return tagRoles[element.tagName.toLowerCase()] || '';
            };
        `;
    }

    /**
     * Process and normalize heading analysis results
     */
    processHeadingResults(analysis, url) {
        const processedResults = {
            url: url,
            tool: 'heading-structure-analyzer',
            timestamp: new Date().toISOString(),
            summary: {
                totalHeadings: analysis.statistics.totalHeadings,
                headingsWithIssues: analysis.statistics.headingsWithIssues,
                totalIssues: analysis.statistics.totalIssues,
                criticalIssues: 0,
                highIssues: 0,
                mediumIssues: 0,
                lowIssues: 0,
                hierarchyViolations: analysis.statistics.hierarchyViolations,
                missingLevels: analysis.statistics.missingLevels,
                hasMainHeading: analysis.documentStructure.hasMainHeading,
                totalLandmarks: analysis.landmarks.length,
                landmarksWithIssues: 0,
                outlineDepth: analysis.documentStructure.outline?.depth || 0,
                hasSkipLinks: 0,
                structuralViolations: 0
            },
            headings: analysis.headings,
            documentStructure: analysis.documentStructure,
            landmarks: analysis.landmarks,
            violations: [],
            passes: [],
            coverage: {
                wcagCriteria: this.wcagCriteria,
                automatedTests: 0,
                manualReviewRequired: 0
            }
        };

        // Process each issue
        analysis.issues.forEach(issue => {
            // Categorize by severity
            switch (issue.severity) {
                case 'critical':
                    processedResults.summary.criticalIssues++;
                    break;
                case 'high':
                    processedResults.summary.highIssues++;
                    break;
                case 'medium':
                    processedResults.summary.mediumIssues++;
                    break;
                case 'low':
                    processedResults.summary.lowIssues++;
                    break;
            }

            // Categorize by issue type for enhanced statistics
            if (issue.type.includes('landmark') || issue.type.includes('main') || issue.type.includes('banner') || issue.type.includes('contentinfo') || issue.type.includes('nav') || issue.type.includes('region')) {
                processedResults.summary.landmarksWithIssues++;
            }

            if (issue.type.includes('skip')) {
                processedResults.summary.hasSkipLinks++;
            }

            if (issue.type.includes('section') || issue.type.includes('article') || issue.type.includes('nested') || issue.type.includes('outline')) {
                processedResults.summary.structuralViolations++;
            }

            // Convert to violation format
            const violation = {
                id: issue.type,
                impact: this.mapSeverityToImpact(issue.severity),
                tags: issue.wcag,
                description: issue.message,
                help: this.getRemediationAdvice(issue.type),
                helpUrl: this.getHelpUrl(issue.wcag),
                nodes: issue.element ? [{
                    target: [issue.element],
                    html: issue.element,
                    failureSummary: issue.message
                }] : [],
                context: issue.context || {},
                category: this.categorizeIssue(issue.type)
            };

            processedResults.violations.push(violation);
        });

        // Update coverage statistics
        processedResults.coverage.automatedTests = analysis.issues.length;
        processedResults.coverage.manualReviewRequired = this.calculateManualReview(analysis);

        return processedResults;
    }

    /**
     * Map severity levels to impact categories
     */
    mapSeverityToImpact(severity) {
        const severityMap = {
            'critical': 'critical',
            'high': 'serious',
            'medium': 'moderate',
            'low': 'minor'
        };
        return severityMap[severity] || 'moderate';
    }

    /**
     * Categorize issues by type
     */
    categorizeIssue(issueType) {
        if (issueType.includes('heading') || issueType.includes('h1') || issueType.includes('level')) {
            return 'heading-structure';
        }
        if (issueType.includes('landmark') || issueType.includes('main') || issueType.includes('banner') || issueType.includes('contentinfo') || issueType.includes('nav') || issueType.includes('region')) {
            return 'landmark-structure';
        }
        if (issueType.includes('skip') || issueType.includes('navigation')) {
            return 'navigation-aids';
        }
        if (issueType.includes('section') || issueType.includes('article') || issueType.includes('outline') || issueType.includes('nested')) {
            return 'document-structure';
        }
        return 'accessibility-compliance';
    }

    /**
     * Calculate manual review requirements
     */
    calculateManualReview(analysis) {
        let manualReview = 0;
        
        // Content quality assessment
        if (analysis.headings.length > 0) {
            manualReview += analysis.headings.length; // Each heading should be reviewed for context appropriateness
        }
        
        // Landmark structure review
        manualReview += analysis.landmarks.length;
        
        // Document outline review
        if (analysis.documentStructure.outline) {
            manualReview += analysis.documentStructure.outline.sections.length;
        }
        
        return manualReview;
    }

    /**
     * Get help URL for WCAG criteria
     */
    getHelpUrl(wcagCriteria) {
        if (wcagCriteria && wcagCriteria.length > 0) {
            const criterion = wcagCriteria[0].replace('.', '-');
            return `https://www.w3.org/WAI/WCAG21/Understanding/understanding-${criterion}.html`;
        }
        return 'https://www.w3.org/WAI/WCAG21/Understanding/';
    }

    /**
     * Get remediation advice for specific issue types
     */
    getRemediationAdvice(issueType) {
        const remediationMap = {
            // Heading structure issues
            'no-headings-found': 'Add appropriate heading structure to organize content hierarchically. Start with an H1 for the main content and use H2-H6 to create logical sections.',
            'missing-h1': 'Add a single H1 element that clearly describes the main purpose or content of the page. The H1 should be unique and descriptive.',
            'multiple-h1': 'Use only one H1 per page for the main heading. Convert additional H1 elements to appropriate lower-level headings (H2-H6).',
            'skipped-heading-level': 'Ensure heading levels follow a logical sequence without skipping levels. If content requires a subsection, use the next level in the hierarchy.',
            'illogical-h1-placement': 'Place the H1 element at the beginning of the main content area. If multiple H1s are needed for different sections, consider using appropriate landmark roles.',
            'missing-heading-levels': 'Fill in missing heading levels to create a complete hierarchical structure. Each level should represent a logical subdivision of content.',
            'empty-heading': 'Provide meaningful text content for all heading elements. Remove empty headings or add appropriate descriptive text.',
            'hidden-heading': 'Ensure visually hidden headings are intentional and provide structural benefit for screen reader users. Consider if the heading is necessary.',
            'overly-long-heading': 'Shorten heading text to be concise and scannable. Aim for clear, descriptive headings that can be quickly understood.',
            'duplicate-heading-text': 'Make heading text unique and descriptive of the specific section content. Add distinguishing information when necessary.',
            'heading-role-without-aria-level': 'Add aria-level attribute to elements with role="heading" to specify the heading level (1-6).',
            'inconsistent-heading-level': 'Ensure the heading tag level (H1-H6) matches the aria-level attribute value for consistency.',
            'very-short-heading': 'Expand heading text to be more descriptive and informative about the section content.',

            // Enhanced landmark issues
            'landmark-without-accessible-name': 'Provide an accessible name for landmark regions using headings, aria-label, or aria-labelledby attributes.',
            'missing-main-landmark': 'Add a main element or role="main" to identify the primary content area of the page.',
            'multiple-main-landmarks': 'Use only one main landmark per page. Combine content or restructure the page to have a single main content area.',
            'missing-banner-landmark': 'Add a header element or role="banner" to identify the page header and provide consistent site navigation.',
            'multiple-banner-landmarks': 'Use only one banner landmark per page. Consolidate page headers into a single banner region.',
            'multiple-contentinfo-landmarks': 'Use only one contentinfo landmark per page. Consolidate page footers into a single contentinfo region.',
            'multiple-nav-without-names': 'Provide unique accessible names for each navigation landmark using aria-label or aria-labelledby to help users distinguish between different navigation areas.',
            'region-without-name': 'Provide an accessible name for region landmarks using aria-label or aria-labelledby attributes.',
            'redundant-role-attribute': 'Remove redundant role attributes from semantic HTML elements that already have implicit ARIA roles.',

            // Document structure issues
            'excessive-outline-depth': 'Simplify the document structure by reducing nesting levels. Consider reorganizing content to create a flatter, more navigable hierarchy.',
            'orphaned-subsection': 'Either merge single subsections with their parent sections or add additional subsections to create a balanced structure.',
            'section-without-heading': 'Add a heading or provide an accessible name using aria-label or aria-labelledby for section elements.',
            'article-without-heading': 'Add a heading to describe the article content and help users understand its purpose.',
            'main-without-headings': 'Add appropriate headings to structure the main content area and help users navigate the primary content.',
            'nested-navigation': 'Use list elements (ul/ol) for nested navigation instead of nested nav elements to maintain proper semantic structure.',
            'nested-main': 'Move the main element to be a direct child of the body element. Main content should not be nested inside other sectioning elements.',
            'section-outside-landmark': 'Place section elements within appropriate landmark regions or add role="region" if the section represents a significant area of content.',

            // Skip link and navigation issues
            'broken-skip-link': 'Ensure skip link targets exist and are properly identified. Verify that href attributes point to valid page elements.',
            'skip-link-target-not-focusable': 'Add tabindex="-1" to skip link targets to make them focusable for keyboard navigation.',
            'missing-skip-to-main': 'Add a skip link at the beginning of the page to allow keyboard users to bypass repetitive navigation and go directly to main content.',
            'skip-link-not-first': 'Position skip links as the first focusable elements on the page to ensure they are immediately available to keyboard users.'
        };

        return remediationMap[issueType] || 'Review the document structure and ensure it follows WCAG guidelines for heading hierarchy, landmark usage, and document organization.';
    }

    /**
     * Get summary of heading structure analysis
     */
    getAnalysisSummary(results) {
        return {
            totalHeadings: results.summary.totalHeadings,
            totalIssues: results.summary.totalIssues,
            hasMainHeading: results.summary.hasMainHeading,
            hierarchyViolations: results.summary.hierarchyViolations,
            severityBreakdown: {
                critical: results.summary.criticalIssues,
                high: results.summary.highIssues,
                medium: results.summary.mediumIssues,
                low: results.summary.lowIssues
            },
            documentStructure: results.documentStructure,
            landmarks: results.landmarks.length,
            wcagCoverage: results.coverage.wcagCriteria.length
        };
    }
}

module.exports = HeadingStructureAnalyzer; 
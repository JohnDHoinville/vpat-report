/**
 * Populate WCAG Level AAA Requirements Script
 * 
 * This script adds comprehensive WCAG 2.1/2.2 Level AAA requirements to the database
 * with detailed automation mappings, tool capabilities, and confidence levels.
 * 
 * Level AAA requirements are the highest level of accessibility conformance,
 * typically used for specialized applications, critical services, or enhanced accessibility.
 */

const { Pool } = require('pg');

class AAARequirementsPopulator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
        });
    }

    async populateAAARequirements() {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            console.log('🌟 Starting WCAG Level AAA requirements population...');
            
            const aaaRequirements = this.getWCAGAAARequirements();
            console.log(`📋 Adding ${aaaRequirements.length} Level AAA requirements`);
            
            for (const requirement of aaaRequirements) {
                await this.addAAARequirement(client, requirement);
            }
            
            await client.query('COMMIT');
            
            await this.verifyAAARequirements();
            
            console.log('✅ WCAG Level AAA requirements population completed successfully!');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error populating AAA requirements:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    getWCAGAAARequirements() {
        return [
            // Level AAA - Perceivable
            {
                criterion_number: '1.2.6',
                title: 'Sign Language (Prerecorded)',
                description: 'Sign language interpretation is provided for all prerecorded audio content in synchronized media.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Verify presence and quality of sign language interpretation for all audio content',
                principle: 'Perceivable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '1.2.7',
                title: 'Extended Audio Description (Prerecorded)',
                description: 'Where pauses in foreground audio are insufficient for audio descriptions, extended audio description is provided.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Assess audio description timing and completeness for complex visual content',
                principle: 'Perceivable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '1.2.8',
                title: 'Media Alternative (Prerecorded)',
                description: 'An alternative for time-based media is provided for all prerecorded synchronized media.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Verify comprehensive text alternatives for all multimedia content',
                principle: 'Perceivable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '1.2.9',
                title: 'Audio-only (Live)',
                description: 'An alternative that presents equivalent information for live audio-only content is provided.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Test live audio streams for real-time text alternatives',
                principle: 'Perceivable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '1.3.6',
                title: 'Identify Purpose',
                description: 'In content implemented using markup languages, the purpose of user interface components can be programmatically determined.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['axe-core', 'pa11y'],
                automated_rules: ['autocomplete-valid', 'input-purposes'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Verify semantic markup accurately represents component purposes',
                principle: 'Perceivable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '1.4.6',
                title: 'Contrast (Enhanced)',
                description: 'The visual presentation of text and images of text has a contrast ratio of at least 7:1.',
                level: 'AAA',
                test_method: 'automated',
                automated_tools: ['axe-core', 'pa11y', 'lighthouse', 'contrast-analyzer'],
                automated_rules: ['color-contrast-enhanced'],
                automation_confidence: 'high',
                manual_verification_needed: null,
                principle: 'Perceivable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '1.4.7',
                title: 'Low or No Background Audio',
                description: 'For prerecorded audio-only content, background sounds are at least 20 decibels lower than foreground speech.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Audio analysis for background noise levels and speech clarity',
                principle: 'Perceivable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '1.4.8',
                title: 'Visual Presentation',
                description: 'For the visual presentation of blocks of text, mechanisms are available for customization.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['playwright'],
                automated_rules: ['text-customization', 'reading-preferences'],
                automation_confidence: 'low',
                manual_verification_needed: 'Test text customization controls and reading preferences',
                principle: 'Perceivable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '1.4.9',
                title: 'Images of Text (No Exception)',
                description: 'Images of text are only used for pure decoration or where text presentation is essential.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['axe-core', 'lighthouse'],
                automated_rules: ['image-text-alternative'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Evaluate necessity and alternatives for images of text',
                principle: 'Perceivable',
                wcag_version: '2.1'
            },

            // Level AAA - Operable
            {
                criterion_number: '2.1.3',
                title: 'Keyboard (No Exception)',
                description: 'All functionality of the content is operable through a keyboard interface without exception.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['axe-core', 'playwright'],
                automated_rules: ['keyboard-navigation-comprehensive'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Comprehensive keyboard testing including complex interactions',
                principle: 'Operable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '2.2.3',
                title: 'No Timing',
                description: 'Timing is not an essential part of the event or activity presented by the content.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Identify and evaluate all time-dependent functionality',
                principle: 'Operable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '2.2.4',
                title: 'Interruptions',
                description: 'Interruptions can be postponed or suppressed by the user, except for emergencies.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Test notification and interruption management controls',
                principle: 'Operable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '2.2.5',
                title: 'Re-authenticating',
                description: 'When an authenticated session expires, users can continue without data loss.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Test session timeout and data preservation mechanisms',
                principle: 'Operable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '2.2.6',
                title: 'Timeouts',
                description: 'Users are warned of the duration of any user inactivity that could cause data loss.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['playwright'],
                automated_rules: ['timeout-warnings'],
                automation_confidence: 'low',
                manual_verification_needed: 'Test timeout warning systems and user notification timing',
                principle: 'Operable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '2.3.2',
                title: 'Three Flashes',
                description: 'Web pages do not contain anything that flashes more than three times in any one second period.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['lighthouse', 'playwright'],
                automated_rules: ['flash-detection'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Visual inspection for flashing content and seizure triggers',
                principle: 'Operable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '2.3.3',
                title: 'Animation from Interactions',
                description: 'Motion animation triggered by interaction can be disabled unless essential.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['playwright'],
                automated_rules: ['motion-animation-controls'],
                automation_confidence: 'low',
                manual_verification_needed: 'Test animation controls and motion reduction preferences',
                principle: 'Operable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '2.4.8',
                title: 'Location',
                description: 'Information about the user\'s location within a set of web pages is available.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['axe-core'],
                automated_rules: ['breadcrumb-navigation', 'page-location'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Verify breadcrumbs, site maps, and location indicators',
                principle: 'Operable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '2.4.9',
                title: 'Link Purpose (Link Only)',
                description: 'A mechanism is available to allow the purpose of each link to be identified from link text alone.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['axe-core', 'pa11y'],
                automated_rules: ['link-name-descriptive'],
                automation_confidence: 'high',
                manual_verification_needed: 'Evaluate link text clarity and context independence',
                principle: 'Operable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '2.4.10',
                title: 'Section Headings',
                description: 'Section headings are used to organize the content.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['axe-core', 'pa11y', 'lighthouse'],
                automated_rules: ['heading-structure', 'section-organization'],
                automation_confidence: 'high',
                manual_verification_needed: 'Verify heading hierarchy accurately reflects content structure',
                principle: 'Operable',
                wcag_version: '2.1'
            },

            // Level AAA - Understandable
            {
                criterion_number: '3.1.3',
                title: 'Unusual Words',
                description: 'A mechanism is available for identifying specific definitions of words used in an unusual way.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Identify unusual word usage and verify definition mechanisms',
                principle: 'Understandable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '3.1.4',
                title: 'Abbreviations',
                description: 'A mechanism for identifying the expanded form of abbreviations is available.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['axe-core'],
                automated_rules: ['abbreviation-expansion'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Test abbreviation expansion mechanisms and definitions',
                principle: 'Understandable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '3.1.5',
                title: 'Reading Level',
                description: 'When text requires reading ability more advanced than secondary education, supplemental content is available.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Assess content reading level and availability of simplified alternatives',
                principle: 'Understandable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '3.1.6',
                title: 'Pronunciation',
                description: 'A mechanism is available for identifying specific pronunciation of words where meaning is ambiguous.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Identify ambiguous pronunciations and verify pronunciation guides',
                principle: 'Understandable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '3.2.5',
                title: 'Change on Request',
                description: 'Changes of context are initiated only by user request or a mechanism to turn off such changes.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Test for unexpected context changes and user control mechanisms',
                principle: 'Understandable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '3.3.5',
                title: 'Help',
                description: 'Context-sensitive help is available.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Verify availability and accessibility of help systems',
                principle: 'Understandable',
                wcag_version: '2.1'
            },
            {
                criterion_number: '3.3.6',
                title: 'Error Prevention (All)',
                description: 'For web pages requiring user submission, submissions are reversible, checked, or confirmed.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Test error prevention mechanisms for all user submissions',
                principle: 'Understandable',
                wcag_version: '2.1'
            },

            // WCAG 2.2 AAA Requirements
            {
                criterion_number: '2.4.11',
                title: 'Focus Not Obscured (Minimum)',
                description: 'When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['playwright'],
                automated_rules: ['focus-visibility'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Test focus visibility in various layouts and overlays',
                principle: 'Operable',
                wcag_version: '2.2'
            },
            {
                criterion_number: '2.4.12',
                title: 'Focus Not Obscured (Enhanced)',
                description: 'When a user interface component receives keyboard focus, no part of the component is hidden by author-created content.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['playwright'],
                automated_rules: ['focus-complete-visibility'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Ensure complete focus indicator visibility in all contexts',
                principle: 'Operable',
                wcag_version: '2.2'
            },
            {
                criterion_number: '2.4.13',
                title: 'Focus Appearance',
                description: 'When the keyboard focus indicator is visible, it meets minimum area and contrast requirements.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['contrast-analyzer', 'playwright'],
                automated_rules: ['focus-indicator-contrast', 'focus-indicator-size'],
                automation_confidence: 'high',
                manual_verification_needed: 'Verify focus indicator meets enhanced visibility standards',
                principle: 'Operable',
                wcag_version: '2.2'
            },
            {
                criterion_number: '2.5.5',
                title: 'Target Size (Enhanced)',
                description: 'The size of the target for pointer inputs is at least 44 by 44 CSS pixels.',
                level: 'AAA',
                test_method: 'both',
                automated_tools: ['lighthouse', 'playwright'],
                automated_rules: ['target-size-enhanced'],
                automation_confidence: 'high',
                manual_verification_needed: 'Measure and verify enhanced target sizes for all interactive elements',
                principle: 'Operable',
                wcag_version: '2.2'
            },
            {
                criterion_number: '2.5.6',
                title: 'Concurrent Input Mechanisms',
                description: 'Web content does not restrict use of input modalities available on a platform.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Test multiple input methods (touch, keyboard, mouse, voice) work concurrently',
                principle: 'Operable',
                wcag_version: '2.2'
            },
            {
                criterion_number: '3.2.6',
                title: 'Consistent Help',
                description: 'If a web page contains help mechanisms, they are in a consistent relative order.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Verify consistent placement and ordering of help mechanisms across pages',
                principle: 'Understandable',
                wcag_version: '2.2'
            },
            {
                criterion_number: '3.3.7',
                title: 'Redundant Entry',
                description: 'Information previously entered by the user is auto-populated or available for selection.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Test auto-population and data reuse mechanisms in forms',
                principle: 'Understandable',
                wcag_version: '2.2'
            },
            {
                criterion_number: '3.3.8',
                title: 'Accessible Authentication (Minimum)',
                description: 'A cognitive function test is not required for authentication unless alternatives are provided.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Evaluate authentication methods for cognitive accessibility',
                principle: 'Understandable',
                wcag_version: '2.2'
            },
            {
                criterion_number: '3.3.9',
                title: 'Accessible Authentication (Enhanced)',
                description: 'A cognitive function test is not required for authentication.',
                level: 'AAA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Ensure no cognitive function tests in authentication processes',
                principle: 'Understandable',
                wcag_version: '2.2'
            }
        ];
    }

    async addAAARequirement(client, requirement) {
        const manualTestProcedure = {
            overview: requirement.manual_verification_needed || requirement.description,
            steps: this.generateTestSteps(requirement),
            tools_needed: ['screen_reader', 'browser_dev_tools', 'accessibility_tree'],
            expected_results: `No violations of WCAG ${requirement.criterion_number} (Level AAA)`,
            common_failures: [`Implementation does not meet the enhanced AAA standard for ${requirement.title.toLowerCase()}`],
            aaa_considerations: 'Level AAA requirements represent the highest level of accessibility conformance'
        };

        const toolMappings = {
            automated_tools: requirement.automated_tools || [],
            automated_rules: requirement.automated_rules || [],
            automation_confidence: requirement.automation_confidence,
            manual_verification_needed: requirement.manual_verification_needed,
            principle: requirement.principle,
            aaa_level: true,
            specialized_testing: requirement.test_method === 'manual'
        };

        await client.query(`
            INSERT INTO wcag_requirements (
                wcag_version, level, criterion_number, title, description,
                test_method, tool_mappings, manual_test_procedure,
                understanding_url, applies_to_page_types, guideline_title
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (wcag_version, criterion_number) 
            DO UPDATE SET 
                level = $2,
                title = $4,
                description = $5,
                test_method = $6,
                tool_mappings = $7,
                manual_test_procedure = $8,
                guideline_title = $11
        `, [
            requirement.wcag_version,
            requirement.level,
            requirement.criterion_number,
            requirement.title,
            requirement.description,
            requirement.test_method,
            JSON.stringify(toolMappings),
            JSON.stringify(manualTestProcedure),
            `https://www.w3.org/WAI/WCAG21/Understanding/${requirement.criterion_number.replace(/\./g, '-')}.html`,
            ['all'],
            requirement.principle
        ]);

        console.log(`  ✅ Added AAA ${requirement.criterion_number}: ${requirement.title}`);
    }

    generateTestSteps(requirement) {
        const baseSteps = [
            `Review WCAG ${requirement.criterion_number} success criteria and understanding document`,
            'Identify all relevant content and functionality that must meet this AAA requirement'
        ];

        if (requirement.automated_tools.length > 0) {
            baseSteps.push(`Run automated tests with: ${requirement.automated_tools.join(', ')}`);
            baseSteps.push('Review automated findings for accuracy and completeness');
        }

        baseSteps.push(
            requirement.manual_verification_needed || 'Conduct comprehensive manual verification',
            'Test with assistive technologies and diverse user scenarios',
            'Document any violations with detailed descriptions and recommendations',
            'Verify that all AAA-level requirements are met completely'
        );

        return baseSteps;
    }

    async verifyAAARequirements() {
        console.log('\n🔍 Verifying AAA Requirements Population...');
        
        const aaaCount = await this.pool.query(`
            SELECT COUNT(*) as count FROM wcag_requirements WHERE level = 'AAA'
        `);

        const automationStats = await this.pool.query(`
            SELECT 
                test_method,
                COUNT(*) as count
            FROM wcag_requirements 
            WHERE level = 'AAA'
            GROUP BY test_method
            ORDER BY count DESC
        `);

        const versionStats = await this.pool.query(`
            SELECT 
                wcag_version,
                COUNT(*) as count
            FROM wcag_requirements 
            WHERE level = 'AAA'
            GROUP BY wcag_version
            ORDER BY wcag_version
        `);

        console.log(`📊 Total AAA Requirements: ${aaaCount.rows[0].count}`);
        
        console.log('\n🎯 AAA Test Method Distribution:');
        automationStats.rows.forEach(stat => {
            const emoji = stat.test_method === 'automated' ? '🤖' : 
                         stat.test_method === 'both' ? '🔄' : '👤';
            console.log(`   ${emoji} ${stat.test_method.toUpperCase()}: ${stat.count}`);
        });

        console.log('\n📋 AAA Requirements by Version:');
        versionStats.rows.forEach(stat => {
            console.log(`   WCAG ${stat.wcag_version}: ${stat.count} requirements`);
        });

        // Sample AAA requirements with automation
        const automatedAAA = await this.pool.query(`
            SELECT criterion_number, title 
            FROM wcag_requirements 
            WHERE level = 'AAA' AND test_method IN ('automated', 'both')
            ORDER BY criterion_number
            LIMIT 5
        `);

        if (automatedAAA.rows.length > 0) {
            console.log('\n🤖 Sample AAA Requirements with Automation:');
            automatedAAA.rows.forEach(req => {
                console.log(`   ${req.criterion_number}: ${req.title}`);
            });
        }
    }

    async close() {
        await this.pool.end();
    }
}

// Main execution
async function main() {
    const populator = new AAARequirementsPopulator();
    
    try {
        await populator.populateAAARequirements();
        console.log('\n🎉 AAA Requirements population completed successfully!');
        
        console.log('\n📝 Level AAA Information:');
        console.log('• Level AAA represents the highest level of WCAG conformance');
        console.log('• Typically used for specialized applications or critical services');
        console.log('• Includes enhanced contrast, comprehensive keyboard support, and advanced usability');
        console.log('• Many AAA requirements require specialized testing and manual verification');
        console.log('• Consider AAA requirements for applications serving users with disabilities');
        
    } catch (error) {
        console.error('❌ AAA population failed:', error);
        process.exit(1);
    } finally {
        await populator.close();
    }
}

// Execute if called directly
if (require.main === module) {
    main();
}

module.exports = AAARequirementsPopulator; 
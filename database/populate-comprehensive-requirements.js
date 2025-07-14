/**
 * Populate Comprehensive Requirements Script
 * 
 * This script enhances the database with comprehensive WCAG 2.1/2.2 and Section 508 requirements
 * from the RealWCAGRequirementsService, adding detailed automation mappings, tool capabilities,
 * and confidence levels while preserving existing manual test procedures.
 * 
 * Features:
 * - Merges automation data from RealWCAGRequirementsService with existing requirements
 * - Adds missing WCAG 2.2 criteria not currently in database  
 * - Enhances tool mappings with specific rule IDs and confidence levels
 * - Preserves existing manual test procedures and descriptions
 * - Ensures comprehensive Section 508 coverage
 */

const { Pool } = require('pg');
const RealWCAGRequirementsService = require('../scripts/real-wcag-requirements-service.js');

class RequirementsPopulator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
        });
        this.realWCAGService = new RealWCAGRequirementsService();
    }

    async populateComprehensiveRequirements() {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            console.log('🚀 Starting comprehensive requirements population...');
            
            // Step 1: Get current database state
            const currentWCAG = await this.getCurrentWCAGRequirements(client);
            const currentSection508 = await this.getCurrentSection508Requirements(client);
            
            console.log(`📊 Current state: ${currentWCAG.length} WCAG, ${currentSection508.length} Section 508`);
            
            // Step 2: Get enhanced requirements from service
            const serviceRequirements = this.realWCAGService.getRealWCAGRequirements();
            console.log(`🔧 Service provides: ${serviceRequirements.length} enhanced WCAG 2.2 requirements`);
            
            // Step 3: Enhance existing WCAG requirements with automation data
            await this.enhanceExistingWCAGRequirements(client, currentWCAG, serviceRequirements);
            
            // Step 4: Add missing WCAG 2.2 requirements
            await this.addMissingWCAGRequirements(client, currentWCAG, serviceRequirements);
            
            // Step 5: Enhance Section 508 requirements 
            await this.enhanceSection508Requirements(client);
            
            // Step 6: Create comprehensive WCAG 2.1 A/AA coverage
            await this.ensureComprehensiveWCAGCoverage(client);
            
            await client.query('COMMIT');
            
            // Step 7: Verify final state
            await this.verifyFinalState();
            
            console.log('✅ Comprehensive requirements population completed successfully!');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error populating requirements:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getCurrentWCAGRequirements(client) {
        const result = await client.query(`
            SELECT criterion_number, title, description, level, test_method, 
                   tool_mappings, manual_test_procedure, wcag_version
            FROM wcag_requirements 
            ORDER BY criterion_number
        `);
        return result.rows;
    }

    async getCurrentSection508Requirements(client) {
        const result = await client.query(`
            SELECT section_number, title, description, tool_mappings, manual_test_procedure
            FROM section_508_requirements 
            ORDER BY section_number
        `);
        return result.rows;
    }

    async enhanceExistingWCAGRequirements(client, currentRequirements, serviceRequirements) {
        console.log('🔧 Enhancing existing WCAG requirements with automation data...');
        
        for (const currentReq of currentRequirements) {
            const enhancedReq = serviceRequirements.find(
                service => service.criterion_number === currentReq.criterion_number
            );
            
            if (enhancedReq) {
                // Create enhanced tool mappings
                const enhancedToolMappings = {
                    automated_tools: enhancedReq.automated_tools || [],
                    automated_rules: enhancedReq.automated_rules || [],
                    automation_confidence: enhancedReq.automation_confidence || 'medium',
                    manual_verification_needed: enhancedReq.manual_verification_needed,
                    principle: enhancedReq.principle,
                    // Preserve existing tool mappings if they exist
                    ...((currentReq.tool_mappings && typeof currentReq.tool_mappings === 'object') ? currentReq.tool_mappings : {})
                };

                await client.query(`
                    UPDATE wcag_requirements 
                    SET 
                        test_method = $1,
                        tool_mappings = $2,
                        wcag_version = COALESCE(wcag_version, '2.2'),
                        guideline_title = $3
                    WHERE criterion_number = $4
                `, [
                    enhancedReq.test_method,
                    JSON.stringify(enhancedToolMappings),
                    enhancedReq.principle,
                    currentReq.criterion_number
                ]);

                console.log(`  ✅ Enhanced ${currentReq.criterion_number}: ${currentReq.title}`);
            }
        }
    }

    async addMissingWCAGRequirements(client, currentRequirements, serviceRequirements) {
        console.log('📝 Adding missing WCAG 2.2 requirements...');
        
        const currentCriteria = new Set(currentRequirements.map(req => req.criterion_number));
        const missingRequirements = serviceRequirements.filter(
            service => !currentCriteria.has(service.criterion_number)
        );

        for (const missing of missingRequirements) {
            const toolMappings = {
                automated_tools: missing.automated_tools || [],
                automated_rules: missing.automated_rules || [],
                automation_confidence: missing.automation_confidence || 'medium',
                manual_verification_needed: missing.manual_verification_needed,
                principle: missing.principle
            };

            // Create comprehensive manual test procedure template
            const manualTestProcedure = {
                overview: missing.manual_verification_needed || missing.description,
                steps: [
                    'Identify elements that need to be tested for this criterion',
                    'Use automated tools to detect basic violations',
                    missing.manual_verification_needed ? `Manually verify: ${missing.manual_verification_needed}` : 'Manually verify automated findings',
                    'Document any violations with screenshots and descriptions',
                    'Verify fixes resolve the accessibility barriers'
                ],
                tools_needed: ['screen_reader', 'browser_dev_tools'],
                expected_results: 'No violations of this WCAG criterion',
                common_failures: ['Implementation does not meet the success criterion requirements']
            };

            await client.query(`
                INSERT INTO wcag_requirements (
                    wcag_version, level, criterion_number, title, description,
                    test_method, tool_mappings, manual_test_procedure,
                    understanding_url, applies_to_page_types
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (wcag_version, criterion_number) DO NOTHING
            `, [
                '2.2',
                missing.level,
                missing.criterion_number,
                missing.title,
                missing.description,
                missing.test_method,
                JSON.stringify(toolMappings),
                JSON.stringify(manualTestProcedure),
                `https://www.w3.org/WAI/WCAG22/Understanding/${missing.criterion_number.replace(/\./g, '-')}.html`,
                ['all']
            ]);

            console.log(`  ➕ Added ${missing.criterion_number}: ${missing.title} (${missing.level})`);
        }

        console.log(`📝 Added ${missingRequirements.length} missing WCAG 2.2 requirements`);
    }

    async enhanceSection508Requirements(client) {
        console.log('🏛️ Enhancing Section 508 requirements...');
        
        // Enhanced Section 508 requirements with WCAG mappings
        const enhancedSection508 = [
            {
                section_number: '502.2.1',
                title: 'User Controls for Audio',
                description: 'Where audio is played automatically, provide user controls to stop, pause, mute, or adjust volume.',
                wcag_mapping: ['1.4.2'],
                tool_mappings: {
                    automated_tools: ['axe-core', 'pa11y'],
                    manual_verification_needed: 'Audio control functionality and user interface accessibility'
                }
            },
            {
                section_number: '502.3.1',
                title: 'Audio Description or Alternative',
                description: 'Provide audio description or full text alternative for video content.',
                wcag_mapping: ['1.2.3', '1.2.5'],
                tool_mappings: {
                    automated_tools: [],
                    manual_verification_needed: 'Video content analysis and audio description quality'
                }
            },
            {
                section_number: '502.4',
                title: 'User Controls for Captions',
                description: 'Provide user controls for captions that allow users to activate, deactivate, and adjust captions.',
                wcag_mapping: ['1.2.2', '1.2.4'],
                tool_mappings: {
                    automated_tools: [],
                    manual_verification_needed: 'Caption control functionality and quality'
                }
            }
        ];

        for (const section508 of enhancedSection508) {
            await client.query(`
                INSERT INTO section_508_requirements (
                    section_number, title, description, tool_mappings,
                    manual_test_procedure, reference_url, applies_to_page_types
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (section_number) 
                DO UPDATE SET 
                    tool_mappings = $4,
                    manual_test_procedure = $5
            `, [
                section508.section_number,
                section508.title,
                section508.description,
                JSON.stringify(section508.tool_mappings),
                JSON.stringify({
                    overview: section508.description,
                    wcag_mapping: section508.wcag_mapping,
                    manual_verification: section508.tool_mappings.manual_verification_needed
                }),
                `https://www.access-board.gov/ict/#${section508.section_number}`,
                ['all']
            ]);
        }
    }

    async ensureComprehensiveWCAGCoverage(client) {
        console.log('📋 Ensuring comprehensive WCAG 2.1 A/AA coverage...');
        
        // Essential WCAG 2.1 A/AA criteria that must be included
        const essentialCriteria = [
            // Level A essentials
            { criterion_number: '1.2.1', level: 'A', title: 'Audio-only and Video-only (Prerecorded)' },
            { criterion_number: '1.2.2', level: 'A', title: 'Captions (Prerecorded)' },
            { criterion_number: '1.2.3', level: 'A', title: 'Audio Description or Media Alternative (Prerecorded)' },
            { criterion_number: '1.3.2', level: 'A', title: 'Meaningful Sequence' },
            { criterion_number: '1.3.3', level: 'A', title: 'Sensory Characteristics' },
            { criterion_number: '1.4.1', level: 'A', title: 'Use of Color' },
            { criterion_number: '1.4.2', level: 'A', title: 'Audio Control' },
            { criterion_number: '3.2.2', level: 'A', title: 'On Input' },
            { criterion_number: '3.3.1', level: 'A', title: 'Error Identification' },
            { criterion_number: '3.3.2', level: 'A', title: 'Labels or Instructions' },
            { criterion_number: '4.1.1', level: 'A', title: 'Parsing' },
            { criterion_number: '4.1.2', level: 'A', title: 'Name, Role, Value' },
            // Level AA essentials  
            { criterion_number: '1.2.4', level: 'AA', title: 'Captions (Live)' },
            { criterion_number: '1.2.5', level: 'AA', title: 'Audio Description (Prerecorded)' },
            { criterion_number: '1.3.4', level: 'AA', title: 'Orientation' },
            { criterion_number: '1.3.5', level: 'AA', title: 'Identify Input Purpose' },
            { criterion_number: '1.4.3', level: 'AA', title: 'Contrast (Minimum)' },
            { criterion_number: '1.4.4', level: 'AA', title: 'Resize Text' },
            { criterion_number: '1.4.5', level: 'AA', title: 'Images of Text' },
            { criterion_number: '1.4.10', level: 'AA', title: 'Reflow' },
            { criterion_number: '1.4.11', level: 'AA', title: 'Non-text Contrast' },
            { criterion_number: '1.4.12', level: 'AA', title: 'Text Spacing' },
            { criterion_number: '1.4.13', level: 'AA', title: 'Content on Hover or Focus' },
            { criterion_number: '2.4.5', level: 'AA', title: 'Multiple Ways' },
            { criterion_number: '2.4.6', level: 'AA', title: 'Headings and Labels' },
            { criterion_number: '2.4.7', level: 'AA', title: 'Focus Visible' },
            { criterion_number: '3.1.2', level: 'AA', title: 'Language of Parts' },
            { criterion_number: '3.2.3', level: 'AA', title: 'Consistent Navigation' },
            { criterion_number: '3.2.4', level: 'AA', title: 'Consistent Identification' },
            { criterion_number: '3.3.3', level: 'AA', title: 'Error Suggestion' },
            { criterion_number: '3.3.4', level: 'AA', title: 'Error Prevention (Legal, Financial, Data)' },
            { criterion_number: '4.1.3', level: 'AA', title: 'Status Messages' }
        ];

        for (const essential of essentialCriteria) {
            await client.query(`
                INSERT INTO wcag_requirements (
                    wcag_version, level, criterion_number, title, description,
                    test_method, applies_to_page_types, manual_test_procedure
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (wcag_version, criterion_number) DO NOTHING
            `, [
                '2.1',
                essential.level,
                essential.criterion_number,
                essential.title,
                `WCAG 2.1 ${essential.level} criterion: ${essential.title}`,
                'manual', // Default for missing criteria
                ['all'],
                JSON.stringify({
                    overview: `Test for WCAG 2.1 ${essential.level} criterion: ${essential.title}`,
                    steps: ['Review criterion requirements', 'Test with assistive technologies', 'Verify compliance'],
                    tools_needed: ['screen_reader', 'browser_dev_tools']
                })
            ]);
        }
    }

    async verifyFinalState() {
        console.log('🔍 Verifying final requirements state...');
        
        const wcagCount = await this.pool.query('SELECT COUNT(*) as count FROM wcag_requirements');
        const section508Count = await this.pool.query('SELECT COUNT(*) as count FROM section_508_requirements');
        
        const automationStats = await this.pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE test_method = 'automated') as automated,
                COUNT(*) FILTER (WHERE test_method = 'both') as hybrid,
                COUNT(*) FILTER (WHERE test_method = 'manual') as manual
            FROM wcag_requirements
        `);

        const levelStats = await this.pool.query(`
            SELECT level, COUNT(*) as count 
            FROM wcag_requirements 
            GROUP BY level 
            ORDER BY level
        `);

        console.log('\n📊 Final Requirements Statistics:');
        console.log(`   WCAG Requirements: ${wcagCount.rows[0].count}`);
        console.log(`   Section 508 Requirements: ${section508Count.rows[0].count}`);
        console.log('\n🎯 WCAG Levels:');
        levelStats.rows.forEach(stat => {
            console.log(`   Level ${stat.level}: ${stat.count} criteria`);
        });
        console.log('\n🤖 Automation Breakdown:');
        const stats = automationStats.rows[0];
        console.log(`   Fully Automated: ${stats.automated} (${Math.round((stats.automated/stats.total)*100)}%)`);
        console.log(`   Hybrid (Auto+Manual): ${stats.hybrid} (${Math.round((stats.hybrid/stats.total)*100)}%)`);
        console.log(`   Manual Only: ${stats.manual} (${Math.round((stats.manual/stats.total)*100)}%)`);
    }

    async close() {
        await this.pool.end();
    }
}

// Main execution
async function main() {
    const populator = new RequirementsPopulator();
    
    try {
        await populator.populateComprehensiveRequirements();
        console.log('\n🎉 Database population completed successfully!');
        
        console.log('\n📝 Next Steps:');
        console.log('1. Restart the backend server to pick up new requirements');
        console.log('2. Check the Requirements Dashboard for updated automation statistics');
        console.log('3. Test automated testing workflow with enhanced tool mappings');
        console.log('4. Review requirement details for improved automation confidence levels');
        
    } catch (error) {
        console.error('❌ Population failed:', error);
        process.exit(1);
    } finally {
        await populator.close();
    }
}

// Execute if called directly
if (require.main === module) {
    main();
}

module.exports = RequirementsPopulator; 
const { db } = require('./config');

/**
 * Section 508 Requirements Expansion Migration
 * Adds comprehensive Section 508 requirements to the unified structure
 */

async function expandSection508Requirements() {
    console.log('📋 Starting Section 508 requirements expansion...');
    
    try {
        // Step 1: Clear existing minimal Section 508 data
        console.log('🗑️  Clearing existing Section 508 requirements...');
        await db.delete('section_508_requirements', {});
        
        // Step 2: Insert comprehensive Section 508 requirements
        console.log('📥 Inserting comprehensive Section 508 requirements...');
        
        const section508Requirements = [
            {
                section_number: '1194.22(a)',
                title: 'Text Alternatives',
                description: 'A text equivalent for every non-text element shall be provided (e.g., via "alt", "longdesc", or in element content).',
                manual_test_procedure: {
                    overview: 'Verify all images, graphics, charts, and non-text content have appropriate text alternatives that convey the same information or function.',
                    steps: [
                        'Inspect all images for appropriate alt attributes',
                        'Check decorative images have empty alt="" or role="presentation"',
                        'Verify complex images have detailed descriptions via aria-describedby or longdesc',
                        'Test with screen reader to ensure alternatives are meaningful',
                        'Check form inputs with image buttons have alt text',
                        'Verify charts and graphs have text descriptions of data'
                    ],
                    tools_needed: ['screen_reader', 'browser_dev_tools', 'accessibility_inspector'],
                    expected_results: 'All non-text content has appropriate text alternatives',
                    common_failures: [
                        'Missing alt attributes on informative images',
                        'Decorative images with descriptive alt text',
                        'Complex charts without detailed descriptions',
                        'Image buttons without alt text'
                    ]
                },
                tool_mappings: {
                    axe: ['image-alt', 'input-image-alt', 'area-alt'],
                    pa11y: ['Section508.22.A'],
                    lighthouse: ['image-alt'],
                    wave: ['alt_missing', 'alt_spacer_missing']
                },
                reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
                applies_to_page_types: ['all']
            },
            {
                section_number: '1194.22(b)',
                title: 'Multimedia Alternatives',
                description: 'Equivalent alternatives for any multimedia presentation shall be synchronized with the presentation.',
                manual_test_procedure: {
                    overview: 'Ensure multimedia content has synchronized captions, audio descriptions, and transcripts as appropriate.',
                    steps: [
                        'Check video content has accurate closed captions',
                        'Verify captions are synchronized with audio',
                        'Test audio descriptions for visual content',
                        'Ensure transcripts are available when required',
                        'Check caption quality and completeness',
                        'Verify multiple audio tracks work correctly'
                    ],
                    tools_needed: ['video_player', 'caption_viewer', 'screen_reader'],
                    expected_results: 'Multimedia has synchronized alternatives appropriate for content type',
                    common_failures: [
                        'Videos without captions',
                        'Unsynchronized captions',
                        'Missing audio descriptions for visual content',
                        'Incomplete or inaccurate transcripts'
                    ]
                },
                tool_mappings: {
                    manual_tools: ['caption_inspector', 'media_accessibility_checker'],
                    automated_checks: 'limited'
                },
                reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
                applies_to_page_types: ['all']
            },
            {
                section_number: '1194.22(c)',
                title: 'Color Information',
                description: 'Web pages shall be designed so that all information conveyed with color is also available without color.',
                manual_test_procedure: {
                    overview: 'Verify information is not conveyed by color alone and is accessible to users who cannot perceive color differences.',
                    steps: [
                        'Review page in grayscale/high contrast mode',
                        'Check form validation errors use more than color',
                        'Verify links are distinguishable without color',
                        'Test charts and graphs have patterns or labels',
                        'Check status indicators use icons or text',
                        'Verify navigation uses more than color coding'
                    ],
                    tools_needed: ['color_contrast_analyzer', 'grayscale_viewer', 'high_contrast_mode'],
                    expected_results: 'All information available without relying on color perception',
                    common_failures: [
                        'Error messages shown only in red',
                        'Links distinguished only by color',
                        'Charts using only color coding',
                        'Status indicators relying solely on color'
                    ]
                },
                tool_mappings: {
                    manual_tools: ['color_oracle', 'contrast_checker'],
                    automated_checks: 'partial'
                },
                reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
                applies_to_page_types: ['all']
            },
            {
                section_number: '1194.22(d)',
                title: 'Document Organization',
                description: 'Documents shall be organized so they are readable without requiring an associated style sheet.',
                manual_test_procedure: {
                    overview: 'Ensure content remains readable and logically organized when CSS is disabled or unavailable.',
                    steps: [
                        'Disable CSS and verify content order is logical',
                        'Check heading structure provides document outline',
                        'Verify lists and tables remain meaningful',
                        'Test that content flows in reading order',
                        'Check skip links and navigation work without CSS',
                        'Verify form labels remain associated'
                    ],
                    tools_needed: ['browser_dev_tools', 'css_disabler', 'heading_viewer'],
                    expected_results: 'Content remains accessible and logically organized without CSS',
                    common_failures: [
                        'Content order depends on CSS positioning',
                        'Heading structure breaks without styling',
                        'Navigation becomes unusable',
                        'Forms lose label associations'
                    ]
                },
                tool_mappings: {
                    manual_tools: ['web_developer_toolbar', 'headings_map'],
                    automated_checks: 'structural_analysis'
                },
                reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
                applies_to_page_types: ['all']
            },
            {
                section_number: '1194.22(g)',
                title: 'Data Table Headers',
                description: 'Row and column headers shall be identified for data tables.',
                manual_test_procedure: {
                    overview: 'Verify data tables have proper header identification using th elements and scope attributes.',
                    steps: [
                        'Identify all data tables on the page',
                        'Check table headers use th elements',
                        'Verify scope attributes for complex tables',
                        'Test with screen reader for proper associations',
                        'Check headers provide sufficient context',
                        'Verify table caption describes purpose'
                    ],
                    tools_needed: ['screen_reader', 'table_inspector', 'browser_dev_tools'],
                    expected_results: 'Data tables have clearly identified headers with proper associations',
                    common_failures: [
                        'Headers using td instead of th elements',
                        'Missing scope attributes in complex tables',
                        'Headers do not provide sufficient context',
                        'Tables missing captions'
                    ]
                },
                tool_mappings: {
                    axe: ['table-header', 'th-has-data-cells', 'td-headers-attr'],
                    pa11y: ['Section508.22.G'],
                    lighthouse: ['table-header'],
                    wave: ['table_header_missing']
                },
                reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
                applies_to_page_types: ['all']
            },
            {
                section_number: '1194.22(i)',
                title: 'Frame and Iframe Titles',
                description: 'Frames shall be titled with text that facilitates frame identification and navigation.',
                manual_test_procedure: {
                    overview: 'Verify all frame and iframe elements have descriptive title attributes.',
                    steps: [
                        'Identify all frame and iframe elements',
                        'Check each has a descriptive title attribute',
                        'Verify titles clearly describe frame purpose',
                        'Test with screen reader for clear identification',
                        'Check titles are unique when multiple frames exist',
                        'Verify nested frames have appropriate titles'
                    ],
                    tools_needed: ['browser_dev_tools', 'screen_reader', 'frame_inspector'],
                    expected_results: 'All frames have descriptive, unique titles',
                    common_failures: [
                        'Frames missing title attributes',
                        'Generic titles like "frame" or "content"',
                        'Duplicate titles on multiple frames',
                        'Titles do not describe frame purpose'
                    ]
                },
                tool_mappings: {
                    axe: ['frame-title'],
                    pa11y: ['Section508.22.I'],
                    lighthouse: ['frame-title'],
                    wave: ['frame_missing_title']
                },
                reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
                applies_to_page_types: ['all']
            },
            {
                section_number: '1194.22(n)',
                title: 'Online Form Completion',
                description: 'When electronic forms are designed to be completed on-line, the form shall allow people using assistive technology to access the information, field elements, and functionality required for completion and submission of the form, including all directions and cues.',
                manual_test_procedure: {
                    overview: 'Ensure forms are fully accessible including labels, instructions, validation, and error handling.',
                    steps: [
                        'Check all form fields have associated labels',
                        'Verify instructions are programmatically associated',
                        'Test form completion with screen reader',
                        'Check keyboard navigation through form',
                        'Verify error messages are clear and accessible',
                        'Test form submission process'
                    ],
                    tools_needed: ['screen_reader', 'keyboard_testing', 'form_analyzer'],
                    expected_results: 'Forms are completely accessible to assistive technology users',
                    common_failures: [
                        'Form fields missing labels',
                        'Instructions not associated with fields',
                        'Error messages not accessible',
                        'Poor keyboard navigation',
                        'Required fields not clearly indicated'
                    ]
                },
                tool_mappings: {
                    axe: ['label', 'form-field-multiple-labels', 'required-attr'],
                    pa11y: ['Section508.22.N'],
                    lighthouse: ['label', 'form-validation'],
                    wave: ['label_missing', 'fieldset_missing']
                },
                reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
                applies_to_page_types: ['all']
            },
            {
                section_number: '1194.22(o)',
                title: 'Skip Navigation Method',
                description: 'A method shall be provided that permits users to skip repetitive navigation links.',
                manual_test_procedure: {
                    overview: 'Verify skip navigation links or other methods to bypass repetitive content are provided.',
                    steps: [
                        'Check for skip navigation links',
                        'Test skip links with keyboard navigation',
                        'Verify skip links work correctly',
                        'Check skip links are visible when focused',
                        'Test with screen reader for proper announcement',
                        'Verify skip targets are appropriate'
                    ],
                    tools_needed: ['keyboard_testing', 'screen_reader', 'skip_link_tester'],
                    expected_results: 'Working skip navigation method is provided and accessible',
                    common_failures: [
                        'Missing skip navigation links',
                        'Skip links do not work properly',
                        'Skip links not visible when focused',
                        'Skip targets are inappropriate',
                        'Skip links not announced correctly'
                    ]
                },
                tool_mappings: {
                    axe: ['skip-link', 'bypass'],
                    pa11y: ['Section508.22.O'],
                    lighthouse: ['bypass'],
                    manual_testing: 'required'
                },
                reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
                applies_to_page_types: ['all']
            }
        ];

        // Insert each Section 508 requirement
        for (let i = 0; i < section508Requirements.length; i++) {
            const req = section508Requirements[i];
            try {
                await db.insert('section_508_requirements', req);
                console.log(`✅ Added Section 508 ${req.section_number}: ${req.title}`);
            } catch (error) {
                console.error(`❌ Error inserting ${req.section_number}:`, error.message);
            }
        }

        // Step 3: Add Section 508 mapping column to WCAG requirements if not exists
        console.log('🔗 Adding Section 508 mappings to WCAG requirements...');
        
        try {
            await db.query(`
                ALTER TABLE wcag_requirements 
                ADD COLUMN IF NOT EXISTS section_508_mapping JSONB DEFAULT '[]'::jsonb
            `);
            console.log('✅ Added section_508_mapping column');
        } catch (error) {
            console.log('ℹ️  section_508_mapping column already exists');
        }

        // Step 4: Update WCAG requirements with Section 508 mappings
        console.log('🔄 Updating WCAG-Section 508 mappings...');
        
        const mappings = [
            { wcag: '1.1.1', section508: ['1194.22(a)'] },
            { wcag: '1.2.1', section508: ['1194.22(b)'] },
            { wcag: '1.2.2', section508: ['1194.22(b)'] },
            { wcag: '1.2.3', section508: ['1194.22(b)'] },
            { wcag: '1.4.1', section508: ['1194.22(c)'] },
            { wcag: '1.3.1', section508: ['1194.22(d)', '1194.22(g)'] },
            { wcag: '1.3.2', section508: ['1194.22(d)'] },
            { wcag: '4.1.2', section508: ['1194.22(i)', '1194.22(n)'] },
            { wcag: '2.4.1', section508: ['1194.22(o)'] }
        ];

        for (const mapping of mappings) {
            try {
                await db.query(
                    'UPDATE wcag_requirements SET section_508_mapping = $1 WHERE criterion_number = $2',
                    [JSON.stringify(mapping.section508), mapping.wcag]
                );
                console.log(`✅ Mapped WCAG ${mapping.wcag} to Section 508 ${mapping.section508.join(', ')}`);
            } catch (error) {
                console.error(`❌ Error mapping ${mapping.wcag}:`, error.message);
            }
        }

        // Step 5: Recreate unified requirements view
        console.log('🔄 Recreating unified requirements view...');
        
        await db.query('DROP VIEW IF EXISTS unified_requirements');
        
        const createViewSQL = `
        CREATE OR REPLACE VIEW unified_requirements AS
        WITH wcag_enhanced AS (
            SELECT 
                wr.id,
                'wcag' as requirement_type,
                wr.criterion_number,
                wr.title,
                wr.description,
                wr.level,
                wr.test_method,
                wr.understanding_url as wcag_url,
                NULL as section_508_url,
                true as is_active,
                1 as priority,
                30 as estimated_time_minutes,
                COALESCE(wr.manual_test_procedure->>'overview', wr.description) as testing_instructions,
                'Requirement passes all validation checks' as acceptance_criteria,
                'Common failures include missing or incorrect implementation' as failure_examples,
                wr.wcag_version,
                wr.guideline_title,
                wr.applies_to_page_types,
                wr.manual_test_procedure,
                wr.tool_mappings,
                COALESCE(wr.section_508_mapping, '[]'::jsonb) as section_508_mapping,
                wr.created_at,
                wr.created_at as updated_at
            FROM wcag_requirements wr
        ),
        section_508_enhanced AS (
            SELECT 
                gen_random_uuid() as id,
                'section_508' as requirement_type,
                sr.section_number as criterion_number,
                sr.title,
                sr.description,
                'base' as level,
                CASE 
                    WHEN sr.tool_mappings::text LIKE '%axe%' OR sr.tool_mappings::text LIKE '%lighthouse%' THEN 'both'
                    WHEN sr.section_number IN ('1194.22(a)', '1194.22(g)', '1194.22(i)', '1194.22(n)', '1194.22(o)') THEN 'both'
                    ELSE 'manual'
                END as test_method,
                NULL as wcag_url,
                sr.reference_url as section_508_url,
                true as is_active,
                1 as priority,
                45 as estimated_time_minutes,
                sr.manual_test_procedure->>'overview' as testing_instructions,
                'Meets Section 508 compliance requirements' as acceptance_criteria,
                'Non-compliance with federal accessibility standards' as failure_examples,
                NULL as wcag_version,
                NULL as guideline_title,
                sr.applies_to_page_types,
                sr.manual_test_procedure,
                sr.tool_mappings,
                '[]'::jsonb as section_508_mapping,
                sr.created_at,
                sr.created_at as updated_at
            FROM section_508_requirements sr
        )
        SELECT * FROM wcag_enhanced
        UNION ALL
        SELECT * FROM section_508_enhanced
        ORDER BY requirement_type, criterion_number
        `;
        
        await db.query(createViewSQL);
        console.log('✅ Unified requirements view recreated');

        // Step 6: Create indexes for performance
        console.log('📇 Creating performance indexes...');
        
        try {
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_section_508_requirements_section_number 
                ON section_508_requirements(section_number)
            `);
            
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_wcag_requirements_section_508_mapping 
                ON wcag_requirements USING GIN(section_508_mapping)
            `);
            
            console.log('✅ Performance indexes created');
        } catch (error) {
            console.log('ℹ️  Indexes already exist or error creating:', error.message);
        }

        // Step 7: Verification
        console.log('\n📊 Verifying migration results...');
        
        const section508Count = await db.query('SELECT COUNT(*) as count FROM section_508_requirements');
        const wcagCount = await db.query('SELECT COUNT(*) as count FROM wcag_requirements');
        const unifiedCount = await db.query(`
            SELECT 
                requirement_type, 
                COUNT(*) as count,
                COUNT(CASE WHEN test_method = 'both' THEN 1 END) as both_method_count,
                COUNT(CASE WHEN test_method = 'manual' THEN 1 END) as manual_method_count,
                COUNT(CASE WHEN test_method = 'automated' THEN 1 END) as automated_method_count
            FROM unified_requirements 
            GROUP BY requirement_type
        `);
        
        console.log('✅ Migration completed successfully!');
        console.log('==========================================');
        console.log(`📋 Section 508 requirements: ${section508Count.rows[0].count}`);
        console.log(`📋 WCAG requirements: ${wcagCount.rows[0].count}`);
        console.log('\n🔍 Unified view breakdown:');
        
        unifiedCount.rows.forEach(row => {
            console.log(`- ${row.requirement_type}: ${row.count} total`);
            console.log(`  • Both: ${row.both_method_count}`);
            console.log(`  • Manual: ${row.manual_method_count}`);
            console.log(`  • Automated: ${row.automated_method_count}`);
        });
        
        // Test method explanations
        console.log('\n💡 Test method explanation enhancement ready for Section 508');
        console.log('   Section 508 requirements with "both" method will get explanations');
        
        return {
            success: true,
            section508Count: section508Count.rows[0].count,
            wcagCount: wcagCount.rows[0].count,
            unified: unifiedCount.rows
        };
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

module.exports = { expandSection508Requirements };

// Run migration if called directly
if (require.main === module) {
    expandSection508Requirements()
        .then(() => {
            console.log('\n🎉 Section 508 expansion completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Section 508 expansion failed:', error.message);
            process.exit(1);
        });
} 
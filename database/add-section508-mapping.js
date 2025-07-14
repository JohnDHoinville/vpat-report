const { db } = require('./config.js');

/**
 * Migration: Add Section 508 mapping to WCAG requirements
 * This creates the connection between WCAG and Section 508 requirements
 * within the unified view approach.
 */

async function addSection508Mapping() {
    try {
        console.log('🔧 Adding Section 508 mapping to WCAG requirements...');
        
        // Step 1: Add section_508_mapping column
        await db.query(`
            ALTER TABLE wcag_requirements 
            ADD COLUMN IF NOT EXISTS section_508_mapping TEXT;
        `);
        console.log('✅ Added section_508_mapping column');
        
        // Step 2: Create mappings between WCAG and Section 508 requirements
        const mappings = [
            // Text alternatives mapping
            {
                wcag_criterion: '1.1.1',
                section_508: '1194.22(a)',
                reasoning: 'Both require text alternatives for non-text content'
            },
            // Audio/Video content mapping  
            {
                wcag_criterion: '1.2.1',
                section_508: '1194.22(b)',
                reasoning: 'Both address multimedia accessibility requirements'
            },
            {
                wcag_criterion: '1.2.2',
                section_508: '1194.22(b)',
                reasoning: 'Captions for multimedia content'
            },
            {
                wcag_criterion: '1.2.3',
                section_508: '1194.22(b)',
                reasoning: 'Audio description for multimedia'
            },
            // Color and visual presentation
            {
                wcag_criterion: '1.4.1',
                section_508: '1194.22(c)',
                reasoning: 'Information not conveyed by color alone'
            },
            {
                wcag_criterion: '1.4.3',
                section_508: '1194.22(c)',
                reasoning: 'Color contrast requirements'
            },
            {
                wcag_criterion: '1.4.6',
                section_508: '1194.22(c)',
                reasoning: 'Enhanced color contrast'
            },
            // Document structure
            {
                wcag_criterion: '1.3.1',
                section_508: '1194.22(d)',
                reasoning: 'Programmatic structure and organization'
            },
            {
                wcag_criterion: '1.3.2',
                section_508: '1194.22(d)',
                reasoning: 'Meaningful sequence of content'
            },
            {
                wcag_criterion: '2.4.6',
                section_508: '1194.22(d)',
                reasoning: 'Descriptive headings and labels'
            },
            // Data tables
            {
                wcag_criterion: '1.3.1',
                section_508: '1194.22(g)',
                reasoning: 'Table header associations'
            },
            // Frame titles
            {
                wcag_criterion: '2.4.1',
                section_508: '1194.22(i)',
                reasoning: 'Frame identification and titles'
            },
            {
                wcag_criterion: '4.1.2',
                section_508: '1194.22(i)',
                reasoning: 'Programmatic frame identification'
            },
            // Forms
            {
                wcag_criterion: '3.3.1',
                section_508: '1194.22(n)',
                reasoning: 'Error identification in forms'
            },
            {
                wcag_criterion: '3.3.2',
                section_508: '1194.22(n)',
                reasoning: 'Form labels and instructions'
            },
            {
                wcag_criterion: '3.3.3',
                section_508: '1194.22(n)',
                reasoning: 'Error suggestion and correction'
            },
            {
                wcag_criterion: '1.3.5',
                section_508: '1194.22(n)',
                reasoning: 'Input purpose identification'
            },
            // Skip navigation
            {
                wcag_criterion: '2.4.1',
                section_508: '1194.22(o)',
                reasoning: 'Skip repetitive content mechanism'
            }
        ];
        
        // Step 3: Apply mappings
        for (const mapping of mappings) {
            await db.query(`
                UPDATE wcag_requirements 
                SET section_508_mapping = $1
                WHERE criterion_number = $2
            `, [mapping.section_508, mapping.wcag_criterion]);
            
            console.log(`✅ Mapped WCAG ${mapping.wcag_criterion} to Section 508 ${mapping.section_508}`);
        }
        
        // Step 4: Create unified view for requirements including Section 508
        // First drop existing view if it exists
        await db.query(`DROP VIEW IF EXISTS unified_requirements;`);
        console.log('✅ Dropped existing unified_requirements view');
        
        await db.query(`
            CREATE VIEW unified_requirements AS 
            SELECT 
                'wcag' as standard_type,
                id,
                criterion_number as requirement_id,
                wcag_version as version,
                level,
                title,
                description,
                manual_test_procedure,
                tool_mappings,
                understanding_url,
                applies_to_page_types,
                testable_method,
                automation_coverage,
                test_method,
                guideline_title,
                section_508_mapping,
                created_at
            FROM wcag_requirements
            
            UNION ALL
            
            SELECT 
                'section508' as standard_type,
                id,
                section_number as requirement_id,
                '1194.22' as version,
                'Required' as level,
                title,
                description,
                manual_test_procedure,
                tool_mappings,
                reference_url as understanding_url,
                applies_to_page_types,
                'manual' as testable_method,
                'none' as automation_coverage,
                'manual' as test_method,
                'Section 508' as guideline_title,
                NULL as section_508_mapping,
                created_at
            FROM section_508_requirements
            
            ORDER BY standard_type, requirement_id;
        `);
        console.log('✅ Created unified_requirements view');
        
        // Step 5: Get summary statistics
        const stats = await db.query(`
            SELECT 
                standard_type,
                COUNT(*) as total_requirements,
                COUNT(CASE WHEN section_508_mapping IS NOT NULL THEN 1 END) as mapped_to_section508
            FROM unified_requirements 
            GROUP BY standard_type;
        `);
        
        console.log('\n📊 Migration Summary:');
        stats.rows.forEach(row => {
            console.log(`${row.standard_type.toUpperCase()}: ${row.total_requirements} requirements${row.mapped_to_section508 > 0 ? `, ${row.mapped_to_section508} mapped to Section 508` : ''}`);
        });
        
        console.log('\n🎉 Section 508 mapping migration completed successfully!');
        console.log('📝 The unified view now includes both WCAG and Section 508 requirements');
        console.log('🔗 WCAG requirements are cross-referenced with Section 508 where applicable');
        
        await db.end();
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        await db.end();
        process.exit(1);
    }
}

// Run the migration
if (require.main === module) {
    addSection508Mapping();
}

module.exports = { addSection508Mapping }; 
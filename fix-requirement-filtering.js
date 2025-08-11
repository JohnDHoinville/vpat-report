const { Pool } = require('pg');

// WCAG 1.1.1 - Non-text Content maps to these axe-core rules
const WCAG_1_1_1_RULES = [
    'image-alt',           // Images must have alternate text
    'image-redundant-alt', // Alternative text of images should not be repeated as text
    'object-alt',          // <object> elements must have alternate text
    'input-image-alt',     // Image buttons must have alternate text
    'area-alt',            // Active <area> elements must have alternate text
    'svg-img-alt',         // <svg> elements with an img role must have an alternative text
    'role-img-alt'         // [role='img'] elements must have an alternative text
];

// WCAG 1.4.1 - Use of Color maps to these axe-core rules
const WCAG_1_4_1_RULES = [
    'color-contrast',      // Elements must meet minimum color contrast ratio requirements
    'link-in-text-block'   // Links must be distinguished from surrounding text in a way that does not rely on color
];

// WCAG 2.4.2 - Page Titled maps to these axe-core rules
const WCAG_2_4_2_RULES = [
    'document-title'       // Documents must have <title> element to aid in navigation
];

// Map WCAG criteria to axe-core rules
const WCAG_TO_AXE_RULES = {
    '1.1.1': WCAG_1_1_1_RULES,
    '1.4.1': WCAG_1_4_1_RULES,
    '2.4.2': WCAG_2_4_2_RULES
};

async function filterResultsByRequirement(rawResults, requirementId) {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'accessibility_testing',
        user: process.env.DB_USER || process.env.USER,
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        // Get the requirement details
        const requirementQuery = `
            SELECT criterion_number, title 
            FROM test_requirements 
            WHERE id = $1
        `;
        const requirementResult = await pool.query(requirementQuery, [requirementId]);
        
        if (requirementResult.rows.length === 0) {
            console.log('❌ Requirement not found, returning all results');
            return rawResults;
        }

        const requirement = requirementResult.rows[0];
        const criterionNumber = requirement.criterion_number;
        
        console.log(`🔍 Filtering results for WCAG ${criterionNumber}: ${requirement.title}`);
        
        // Get the relevant axe-core rules for this WCAG criterion
        const relevantRules = WCAG_TO_AXE_RULES[criterionNumber] || [];
        
        if (relevantRules.length === 0) {
            console.log(`⚠️ No axe-core rules mapped for WCAG ${criterionNumber}, returning all results`);
            return rawResults;
        }

        console.log(`📋 Relevant axe-core rules: ${relevantRules.join(', ')}`);

        // Parse the raw results
        let results;
        try {
            results = typeof rawResults === 'string' ? JSON.parse(rawResults) : rawResults;
        } catch (error) {
            console.log('❌ Error parsing raw results:', error.message);
            return rawResults;
        }

        // Filter violations to only include relevant rules
        const filteredViolations = results.violations?.filter(violation => 
            relevantRules.includes(violation.id)
        ) || [];

        // Filter passes to only include relevant rules
        const filteredPasses = results.passes?.filter(pass => 
            relevantRules.includes(pass.id)
        ) || [];

        // Filter incomplete to only include relevant rules
        const filteredIncomplete = results.incomplete?.filter(incomplete => 
            relevantRules.includes(incomplete.id)
        ) || [];

        // Create filtered results
        const filteredResults = {
            ...results,
            violations: filteredViolations,
            passes: filteredPasses,
            incomplete: filteredIncomplete
        };

        console.log(`✅ Filtered results: ${filteredViolations.length} violations, ${filteredPasses.length} passes, ${filteredIncomplete.length} incomplete`);
        
        return filteredResults;

    } catch (error) {
        console.error('❌ Error filtering results:', error);
        return rawResults;
    } finally {
        await pool.end();
    }
}

// Test the filtering function
async function testFiltering() {
    console.log('🧪 Testing requirement-specific filtering...');
    
    // Sample axe-core results
    const sampleResults = {
        violations: [
            {
                id: 'document-title',
                impact: 'serious',
                description: 'Ensures each HTML document contains a non-empty <title> element'
            },
            {
                id: 'color-contrast',
                impact: 'serious', 
                description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds'
            }
        ],
        passes: [
            {
                id: 'image-alt',
                description: 'Ensures <img> elements have alternate text'
            },
            {
                id: 'region',
                description: 'Ensures all page content is contained by landmarks'
            }
        ],
        incomplete: [
            {
                id: 'th-has-data-cells',
                description: 'Ensure that <th> elements and elements with role=columnheader/rowheader have data cells they describe'
            }
        ]
    };

    // Test filtering for WCAG 2.4.2 (Page Titled)
    const filtered = await filterResultsByRequirement(sampleResults, '6273947c-3120-40b3-a990-672bf7bedfa8');
    console.log('📊 Filtered results for WCAG 2.4.2:', JSON.stringify(filtered, null, 2));
}

if (require.main === module) {
    testFiltering();
}

module.exports = { filterResultsByRequirement, WCAG_TO_AXE_RULES }; 
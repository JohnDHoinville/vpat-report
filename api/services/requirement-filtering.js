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

// WCAG to axe-core rules mapping
const WCAG_TO_AXE_RULES = {
    '1.1.1': WCAG_1_1_1_RULES,
    '1.4.1': ['color-contrast', 'color-contrast-enhanced'],
    '2.1.1': ['keyboard'],
    '2.4.1': ['bypass', 'page-has-heading-one'],
    '2.4.2': ['page-title'],
    '2.4.3': ['tabindex'],
    '2.4.4': ['link-name'],
    '2.4.6': ['page-has-heading-one', 'page-has-heading-one'],
    '3.1.1': ['html-lang'],
    '3.2.1': ['focus-order'],
    '3.2.2': ['no-focusable-content'],
    '3.3.1': ['error-message'],
    '3.3.2': ['label', 'label-title-only'],
    '4.1.1': ['duplicate-id', 'duplicate-id-aria'],
    '4.1.2': ['aria-allowed-attr', 'aria-allowed-role', 'aria-required-attr', 'aria-required-children', 'aria-required-parent', 'aria-roles', 'aria-valid-attr-value', 'aria-valid-attr']
};

async function filterResultsByRequirement(rawResults, sessionId) {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'accessibility_testing',
        user: process.env.DB_USER || process.env.USER,
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        // Get the requirement details from test instances in this session
        const requirementQuery = `
            SELECT DISTINCT wr.criterion_number, wr.title 
            FROM test_instances ti
            JOIN wcag_requirements wr ON ti.requirement_id = wr.id
            WHERE ti.session_id = $1
            AND ti.test_method_used = 'automated'
            LIMIT 1
        `;
        const requirementResult = await pool.query(requirementQuery, [sessionId]);
        
        if (requirementResult.rows.length === 0) {
            console.log('❌ No automated test instances found for this session, returning all results');
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

module.exports = {
    filterResultsByRequirement
}; 
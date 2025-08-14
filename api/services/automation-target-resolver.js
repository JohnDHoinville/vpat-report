/**
 * Automation Target Resolver
 * 
 * Resolves automation targets for different modes (session, requirements, instances).
 * Handles the logic for determining which test instances should be included
 * in automation runs based on the specified targeting mode.
 * 
 * @author Development Team
 * @date August 12, 2025
 * @version 1.0.0
 */

const { pool } = require('../../database/config');

class AutomationTargetResolver {
    constructor() {
        // Cache frequently used queries for performance
        this.queryCache = new Map();
    }

    /**
     * Resolve targets for session-wide automation
     * Returns all automated/hybrid test instances in the session
     * @param {string} sessionId - Test session ID
     * @returns {Array} Array of resolved targets
     */
    async resolveSessionTargets(sessionId) {
        try {
            console.log(`🎯 Resolving session targets for session: ${sessionId}`);

            const query = `
                SELECT 
                    ti.id as test_instance_id,
                    ti.page_id,
                    ti.requirement_id,
                    ti.status as instance_status,
                    ti.test_method_used,
                    dp.url,
                    dp.title as page_title,
                    ur.requirement_id as criterion_number,
                    ur.title as requirement_title,
                    ur.description as requirement_description,
                    ur.test_method as requirement_test_method,
                    ur.level as conformance_level
                FROM test_instances ti
                JOIN discovered_pages dp ON ti.page_id = dp.id
                JOIN unified_requirements ur ON ti.requirement_id = ur.id
                WHERE ti.session_id = $1 
                AND ti.status IN ('pending', 'not_tested')
                AND ur.test_method IN ('automated', 'both', 'hybrid')
                ORDER BY dp.url, ur.requirement_id
            `;

            const result = await pool.query(query, [sessionId]);
            
            console.log(`✅ Resolved ${result.rows.length} session targets`);
            return result.rows;

        } catch (error) {
            console.error('❌ Error resolving session targets:', error);
            throw new Error(`Failed to resolve session targets: ${error.message}`);
        }
    }

    /**
     * Resolve targets for requirement-specific automation
     * Returns test instances for specified requirements across all pages
     * @param {string} sessionId - Test session ID
     * @param {Array} requirementIds - Array of requirement IDs to target
     * @returns {Array} Array of resolved targets
     */
    async resolveRequirementTargets(sessionId, requirementIds) {
        try {
            console.log(`🎯 Resolving requirement targets for ${requirementIds.length} requirements in session: ${sessionId}`);

            if (!requirementIds || requirementIds.length === 0) {
                throw new Error('Requirement IDs array cannot be empty');
            }

            const query = `
                SELECT 
                    ti.id as test_instance_id,
                    ti.page_id,
                    ti.requirement_id,
                    ti.status as instance_status,
                    ti.test_method_used,
                    dp.url,
                    dp.title as page_title,
                    ur.requirement_id as criterion_number,
                    ur.title as requirement_title,
                    ur.description as requirement_description,
                    ur.test_method as requirement_test_method,
                    ur.level as conformance_level
                FROM test_instances ti
                JOIN discovered_pages dp ON ti.page_id = dp.id
                JOIN unified_requirements ur ON ti.requirement_id = ur.id
                WHERE ti.session_id = $1 
                AND ti.requirement_id = ANY($2)
                AND ti.status IN ('pending', 'not_tested')
                AND ur.test_method IN ('automated', 'both', 'hybrid')
                ORDER BY ur.requirement_id, dp.url
            `;

            // Fixed: Use PostgreSQL array syntax for UUID matching
            const result = await pool.query(query, [sessionId, requirementIds]);
            
            // Validate that we found targets for the requested requirements
            const foundRequirements = new Set(result.rows.map(row => row.requirement_id));
            const missingRequirements = requirementIds.filter(id => !foundRequirements.has(id));
            
            if (missingRequirements.length > 0) {
                console.warn(`⚠️ Some requirements not found or not automated: ${missingRequirements.join(', ')}`);
            }

            console.log(`✅ Resolved ${result.rows.length} requirement targets for ${foundRequirements.size} requirements`);
            return result.rows;

        } catch (error) {
            console.error('❌ Error resolving requirement targets:', error);
            throw new Error(`Failed to resolve requirement targets: ${error.message}`);
        }
    }

    /**
     * Resolve targets for test instance-specific automation
     * Returns specific test instances by their IDs
     * @param {string} sessionId - Test session ID
     * @param {Array} instanceIds - Array of test instance IDs to target
     * @returns {Array} Array of resolved targets
     */
    async resolveInstanceTargets(sessionId, instanceIds) {
        try {
            console.log(`🎯 Resolving instance targets for ${instanceIds.length} instances in session: ${sessionId}`);

            if (!instanceIds || instanceIds.length === 0) {
                throw new Error('Instance IDs array cannot be empty');
            }

            const query = `
                SELECT 
                    ti.id as test_instance_id,
                    ti.page_id,
                    ti.requirement_id,
                    ti.status as instance_status,
                    ti.test_method_used,
                    dp.url,
                    dp.title as page_title,
                    ur.requirement_id as criterion_number,
                    ur.title as requirement_title,
                    ur.description as requirement_description,
                    ur.test_method as requirement_test_method,
                    ur.level as conformance_level
                FROM test_instances ti
                JOIN discovered_pages dp ON ti.page_id = dp.id
                JOIN unified_requirements ur ON ti.requirement_id = ur.id
                WHERE ti.session_id = $1 
                AND ti.id = ANY($2)
                AND ur.test_method IN ('automated', 'both', 'hybrid')
                ORDER BY dp.url, ur.requirement_id
            `;

            const result = await pool.query(query, [sessionId, instanceIds]);
            
            // Validate that we found all requested instances
            const foundInstances = new Set(result.rows.map(row => row.test_instance_id));
            const missingInstances = instanceIds.filter(id => !foundInstances.has(id));
            
            if (missingInstances.length > 0) {
                console.warn(`⚠️ Some test instances not found or not automated: ${missingInstances.join(', ')}`);
            }

            console.log(`✅ Resolved ${result.rows.length} instance targets`);
            return result.rows;

        } catch (error) {
            console.error('❌ Error resolving instance targets:', error);
            throw new Error(`Failed to resolve instance targets: ${error.message}`);
        }
    }

    /**
     * Get unique pages from resolved targets
     * Helper method to extract unique page information from targets
     * @param {Array} targets - Array of resolved targets
     * @returns {Array} Array of unique page objects
     */
    getUniquePages(targets) {
        const pageMap = new Map();
        
        targets.forEach(target => {
            if (!pageMap.has(target.page_id)) {
                pageMap.set(target.page_id, {
                    page_id: target.page_id,
                    url: target.url,
                    title: target.page_title,
                    requirement_count: 0,
                    instance_count: 0
                });
            }
            
            const page = pageMap.get(target.page_id);
            page.instance_count++;
            
            // Count unique requirements per page
            if (!page.requirements) {
                page.requirements = new Set();
            }
            page.requirements.add(target.requirement_id);
        });

        // Convert requirements sets to counts and return array
        return Array.from(pageMap.values()).map(page => ({
            ...page,
            requirement_count: page.requirements ? page.requirements.size : 0,
            requirements: undefined // Remove the Set object for clean JSON
        }));
    }

    /**
     * Get unique requirements from resolved targets
     * Helper method to extract unique requirement information from targets
     * @param {Array} targets - Array of resolved targets
     * @returns {Array} Array of unique requirement objects
     */
    getUniqueRequirements(targets) {
        const requirementMap = new Map();
        
        targets.forEach(target => {
            if (!requirementMap.has(target.requirement_id)) {
                requirementMap.set(target.requirement_id, {
                    requirement_id: target.requirement_id,
                    criterion_number: target.criterion_number,
                    title: target.requirement_title,
                    description: target.requirement_description,
                    test_method: target.requirement_test_method,
                    conformance_level: target.conformance_level,
                    page_count: 0,
                    instance_count: 0
                });
            }
            
            const requirement = requirementMap.get(target.requirement_id);
            requirement.instance_count++;
            
            // Count unique pages per requirement
            if (!requirement.pages) {
                requirement.pages = new Set();
            }
            requirement.pages.add(target.page_id);
        });

        // Convert page sets to counts and return array
        return Array.from(requirementMap.values()).map(requirement => ({
            ...requirement,
            page_count: requirement.pages ? requirement.pages.size : 0,
            pages: undefined // Remove the Set object for clean JSON
        }));
    }

    /**
     * Filter targets by status
     * Helper method to filter targets based on their current status
     * @param {Array} targets - Array of resolved targets
     * @param {Array} statuses - Array of statuses to include (default: ['pending', 'not_tested'])
     * @returns {Array} Filtered array of targets
     */
    filterTargetsByStatus(targets, statuses = ['pending', 'not_tested']) {
        return targets.filter(target => statuses.includes(target.instance_status));
    }

    /**
     * Filter targets by conformance level
     * Helper method to filter targets based on WCAG conformance level
     * @param {Array} targets - Array of resolved targets
     * @param {Array} levels - Array of conformance levels to include (e.g., ['A', 'AA'])
     * @returns {Array} Filtered array of targets
     */
    filterTargetsByConformanceLevel(targets, levels) {
        if (!levels || levels.length === 0) {
            return targets;
        }
        
        return targets.filter(target => levels.includes(target.conformance_level));
    }

    /**
     * Group targets by page
     * Helper method to group targets by their page for organized processing
     * @param {Array} targets - Array of resolved targets
     * @returns {Object} Object with page_id as keys and arrays of targets as values
     */
    groupTargetsByPage(targets) {
        const groups = {};
        
        targets.forEach(target => {
            if (!groups[target.page_id]) {
                groups[target.page_id] = {
                    page_info: {
                        page_id: target.page_id,
                        url: target.url,
                        title: target.page_title
                    },
                    targets: []
                };
            }
            groups[target.page_id].targets.push(target);
        });
        
        return groups;
    }

    /**
     * Group targets by requirement
     * Helper method to group targets by their requirement for organized processing
     * @param {Array} targets - Array of resolved targets
     * @returns {Object} Object with requirement_id as keys and arrays of targets as values
     */
    groupTargetsByRequirement(targets) {
        const groups = {};
        
        targets.forEach(target => {
            if (!groups[target.requirement_id]) {
                groups[target.requirement_id] = {
                    requirement_info: {
                        requirement_id: target.requirement_id,
                        criterion_number: target.criterion_number,
                        title: target.requirement_title,
                        description: target.requirement_description,
                        test_method: target.requirement_test_method,
                        conformance_level: target.conformance_level
                    },
                    targets: []
                };
            }
            groups[target.requirement_id].targets.push(target);
        });
        
        return groups;
    }

    /**
     * Validate that targets exist and are testable
     * @param {Array} targets - Array of resolved targets
     * @returns {Object} Validation result
     */
    validateTargets(targets) {
        const validation = {
            valid: true,
            warnings: [],
            statistics: {
                total_targets: targets.length,
                unique_pages: new Set(targets.map(t => t.page_id)).size,
                unique_requirements: new Set(targets.map(t => t.requirement_id)).size,
                by_status: {},
                by_conformance_level: {},
                by_test_method: {}
            }
        };

        // Count by status
        targets.forEach(target => {
            const status = target.instance_status;
            validation.statistics.by_status[status] = (validation.statistics.by_status[status] || 0) + 1;
        });

        // Count by conformance level
        targets.forEach(target => {
            const level = target.conformance_level;
            validation.statistics.by_conformance_level[level] = (validation.statistics.by_conformance_level[level] || 0) + 1;
        });

        // Count by test method
        targets.forEach(target => {
            const method = target.requirement_test_method;
            validation.statistics.by_test_method[method] = (validation.statistics.by_test_method[method] || 0) + 1;
        });

        // Check for potential issues
        if (targets.length === 0) {
            validation.valid = false;
            validation.warnings.push('No targets resolved for automation');
        }

        const completedTargets = targets.filter(t => ['passed', 'failed', 'completed'].includes(t.instance_status));
        if (completedTargets.length > 0) {
            validation.warnings.push(`${completedTargets.length} targets are already completed and may be retested`);
        }

        return validation;
    }

    /**
     * Clear query cache (useful for testing or memory management)
     */
    clearCache() {
        this.queryCache.clear();
        console.log('🗑️ AutomationTargetResolver cache cleared');
    }
}

module.exports = AutomationTargetResolver;
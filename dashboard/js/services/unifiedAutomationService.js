/**
 * Unified Automation Service
 * 
 * Provides a consistent interface for all automation triggers in the frontend,
 * using the new unified automation endpoint with proper targeting and preview capabilities.
 * 
 * @author Development Team
 * @date August 12, 2025
 * @version 1.0.0
 */

class UnifiedAutomationService {
    constructor(apiCall, showNotification) {
        this.apiCall = apiCall;
        this.showNotification = showNotification;
        this.baseEndpoint = '/automated-testing/unified-run';
    }

    /**
     * Run automation for entire session (all automated requirements)
     * @param {string} sessionId - Test session ID
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Automation result
     */
    async runSessionAutomation(sessionId, options = {}) {
        try {
            console.log(`🚀 Running session-wide automation for session: ${sessionId}`);
            
            const config = {
                target_mode: 'session',
                tools: options.tools || ['axe-core', 'pa11y', 'lighthouse'],
                run_async: true,
                options: {
                    preview_mode: options.preview_mode || false,
                    force_retest: options.force_retest || false
                }
            };

            if (options.preview_mode) {
                this.showNotification('info', 'Generating Preview', 'Creating automation scope preview...');
            } else {
                this.showNotification('info', 'Starting Session Automation', 'Automated testing starting for entire session...');
            }

            const response = await this.apiCall(`${this.baseEndpoint}/${sessionId}`, {
                method: 'POST',
                body: JSON.stringify(config)
            });

            if (response.success) {
                if (options.preview_mode) {
                    this.showNotification('success', 'Preview Generated', 
                        `Found ${response.summary?.total_targets || 0} targets across ${response.summary?.unique_pages || 0} pages`);
                } else {
                    this.showNotification('success', 'Session Automation Started', 
                        `Testing ${response.summary?.targets_resolved || 0} targets across ${response.summary?.pages_affected || 0} pages`);
                }
                return response;
            } else {
                throw new Error(response.error || 'Failed to start session automation');
            }

        } catch (error) {
            console.error('❌ Error in session automation:', error);
            this.showNotification('error', 'Session Automation Failed', error.message);
            throw error;
        }
    }

    /**
     * Run automation for specific requirements
     * @param {string} sessionId - Test session ID
     * @param {Array} requirementIds - Array of requirement IDs to test
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Automation result
     */
    async runRequirementAutomation(sessionId, requirementIds, options = {}) {
        try {
            console.log(`🎯 Running requirement automation for ${requirementIds.length} requirements`);
            
            const config = {
                target_mode: 'requirements',
                target_ids: requirementIds,
                tools: options.tools || ['axe-core', 'pa11y'],
                run_async: true,
                options: {
                    preview_mode: options.preview_mode || false,
                    force_retest: options.force_retest || false
                }
            };

            if (options.preview_mode) {
                this.showNotification('info', 'Generating Preview', 
                    `Creating preview for ${requirementIds.length} requirements...`);
            } else {
                this.showNotification('info', 'Starting Requirement Tests', 
                    `Running automated tests for ${requirementIds.length} requirements...`);
            }

            const response = await this.apiCall(`${this.baseEndpoint}/${sessionId}`, {
                method: 'POST',
                body: JSON.stringify(config)
            });

            if (response.success) {
                if (options.preview_mode) {
                    this.showNotification('success', 'Preview Generated', 
                        `Found ${response.summary?.total_targets || 0} test targets`);
                } else {
                    this.showNotification('success', 'Requirement Tests Started', 
                        `Testing ${response.summary?.targets_resolved || 0} instances`);
                }
                return response;
            } else {
                throw new Error(response.error || 'Failed to start requirement automation');
            }

        } catch (error) {
            console.error('❌ Error in requirement automation:', error);
            this.showNotification('error', 'Requirement Tests Failed', error.message);
            throw error;
        }
    }

    /**
     * Run automation for specific test instances
     * @param {string} sessionId - Test session ID
     * @param {Array} instanceIds - Array of test instance IDs to test
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Automation result
     */
    async runInstanceAutomation(sessionId, instanceIds, options = {}) {
        try {
            console.log(`🔬 Running instance automation for ${instanceIds.length} instances`);
            
            const config = {
                target_mode: 'instances',
                target_ids: instanceIds,
                tools: options.tools || ['axe-core', 'pa11y'],
                run_async: true,
                options: {
                    preview_mode: options.preview_mode || false,
                    force_retest: options.force_retest || false
                }
            };

            if (options.preview_mode) {
                this.showNotification('info', 'Generating Preview', 
                    `Creating preview for ${instanceIds.length} test instances...`);
            } else {
                this.showNotification('info', 'Starting Instance Tests', 
                    `Running automated tests for ${instanceIds.length} instances...`);
            }

            const response = await this.apiCall(`${this.baseEndpoint}/${sessionId}`, {
                method: 'POST',
                body: JSON.stringify(config)
            });

            if (response.success) {
                if (options.preview_mode) {
                    this.showNotification('success', 'Preview Generated', 
                        `Will test ${response.summary?.total_targets || 0} targets`);
                } else {
                    this.showNotification('success', 'Instance Tests Started', 
                        `Testing ${response.summary?.targets_resolved || 0} instances`);
                }
                return response;
            } else {
                throw new Error(response.error || 'Failed to start instance automation');
            }

        } catch (error) {
            console.error('❌ Error in instance automation:', error);
            this.showNotification('error', 'Instance Tests Failed', error.message);
            throw error;
        }
    }

    /**
     * Get automation capabilities and available tools
     * @returns {Promise<Object>} Capabilities information
     */
    async getCapabilities() {
        try {
            const response = await this.apiCall(`${this.baseEndpoint}/capabilities`);
            return response;
        } catch (error) {
            console.error('❌ Error getting automation capabilities:', error);
            throw error;
        }
    }

    /**
     * Get automation run status
     * @param {string} sessionId - Test session ID
     * @param {string} runId - Automation run ID
     * @returns {Promise<Object>} Run status
     */
    async getRunStatus(sessionId, runId) {
        try {
            const response = await this.apiCall(`${this.baseEndpoint}/${sessionId}/status/${runId}`);
            return response;
        } catch (error) {
            console.error('❌ Error getting automation run status:', error);
            throw error;
        }
    }

    /**
     * Cancel automation run
     * @param {string} sessionId - Test session ID
     * @param {string} runId - Automation run ID
     * @returns {Promise<Object>} Cancellation result
     */
    async cancelRun(sessionId, runId) {
        try {
            console.log(`🛑 Cancelling automation run: ${runId}`);
            
            const response = await this.apiCall(`${this.baseEndpoint}/${sessionId}/${runId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.showNotification('success', 'Automation Cancelled', 'Test run cancelled successfully');
                return response;
            } else {
                throw new Error(response.error || 'Failed to cancel automation run');
            }

        } catch (error) {
            console.error('❌ Error cancelling automation run:', error);
            this.showNotification('error', 'Cancellation Failed', error.message);
            throw error;
        }
    }

    /**
     * Generate automation scope preview without executing
     * @param {string} sessionId - Test session ID
     * @param {string} targetMode - 'session' | 'requirements' | 'instances'
     * @param {Array} targetIds - Array of target IDs (for requirements/instances modes)
     * @param {Array} tools - Tools to use for preview
     * @returns {Promise<Object>} Preview result
     */
    async generatePreview(sessionId, targetMode, targetIds = [], tools = ['axe-core', 'pa11y']) {
        try {
            console.log(`🔍 Generating automation preview: ${targetMode} mode`);
            
            const config = {
                target_mode: targetMode,
                target_ids: targetIds,
                tools
            };

            const response = await this.apiCall(`${this.baseEndpoint}/${sessionId}/preview`, {
                method: 'POST',
                body: JSON.stringify(config)
            });

            return response;

        } catch (error) {
            console.error('❌ Error generating automation preview:', error);
            throw error;
        }
    }
}

// Export for ES6 modules
export { UnifiedAutomationService };

// Also make available globally for Alpine.js components
window.UnifiedAutomationService = UnifiedAutomationService;

console.log('✅ Unified Automation Service loaded');
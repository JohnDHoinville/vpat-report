/**
 * Quick Session Fix - Auto-applies session URL fix on page load
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Quick Session Fix loading...');
    
    // Wait for dashboard to be ready
    const checkAndApplyFix = () => {
        if (window.dashboardInstance) {
            console.log('🔧 Applying session URL fix...');
            
            // Override loadSessionPages with fixed version
            window.dashboardInstance.loadSessionPages = async function() {
                try {
                    const sessionId = this.sessionDetailsModal?.sessionId || this.currentSession?.id;
                    console.log('🔧 Fixed loadSessionPages for session:', sessionId);
                    
                    if (!sessionId) {
                        this.sessionDetailsPages = [];
                        return;
                    }
                    
                    const response = await this.apiCall(`/test-instances?session_id=${sessionId}`);
                    
                    if (response.success && response.data?.length > 0) {
                        const uniquePages = new Map();
                        response.data.forEach(instance => {
                            if (instance.page_id && instance.page_url) {
                                uniquePages.set(instance.page_id, {
                                    id: instance.page_id,
                                    url: instance.page_url,
                                    title: instance.page_title || 'Untitled Page',
                                    selected_for_testing: true
                                });
                            }
                        });
                        
                        this.sessionDetailsPages = Array.from(uniquePages.values());
                        console.log('✅ Fixed - Session pages loaded:', this.sessionDetailsPages.length);
                        console.log('📋 Page URLs:', this.sessionDetailsPages.map(p => p.url));
                    } else {
                        this.sessionDetailsPages = [];
                    }
                } catch (error) {
                    console.error('❌ Error in fixed loadSessionPages:', error);
                    this.sessionDetailsPages = [];
                }
            };
            
            // Fix the runAutomatedTestForRequirement function reference
            if (!window.runAutomatedTestForRequirement && window.dashboardInstance.runAutomatedTestForRequirement) {
                window.runAutomatedTestForRequirement = (requirement) => {
                    console.log('🔧 Fixed runAutomatedTestForRequirement called for:', requirement?.criterion_number);
                    return window.dashboardInstance.runAutomatedTestForRequirement(requirement);
                };
            }
            
            console.log('✅ Session fix applied successfully!');
            return true;
        }
        return false;
    };
    
    // Try immediately and then retry
    if (!checkAndApplyFix()) {
        const retryInterval = setInterval(() => {
            if (checkAndApplyFix()) {
                clearInterval(retryInterval);
            }
        }, 500);
        
        // Stop trying after 10 seconds
        setTimeout(() => clearInterval(retryInterval), 10000);
    }
}); 
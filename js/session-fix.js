/**
 * Session Fix Patch
 * Fixes session loading issues for both Alpine.js and React components
 */

// Wait for dashboard to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for dashboard instance
    const checkDashboard = setInterval(() => {
        if (window.dashboardInstance) {
            clearInterval(checkDashboard);
            applySessionFix();
        }
    }, 100);
});

function applySessionFix() {
    console.log('🔧 Applying session fix patch...');
    
    // Override the loadSessionPages function with a fixed version
    if (window.dashboardInstance && window.dashboardInstance.loadSessionPages) {
        const originalFunction = window.dashboardInstance.loadSessionPages;
        
        window.dashboardInstance.loadSessionPages = async function() {
            try {
                // Get session ID from multiple sources
                const sessionId = this.sessionDetailsModal?.sessionId || 
                                this.currentSession?.id ||
                                (this.testingSessions && this.testingSessions.length > 0 ? this.testingSessions[0].id : null);
                                
                console.log('🔧 PATCH: loadSessionPages called for session:', sessionId);
                
                if (!sessionId) {
                    console.log('🔧 PATCH: No session ID available');
                    this.sessionDetailsPages = [];
                    return;
                }
                
                // Get test instances for this session
                const response = await this.apiCall(`/test-instances?session_id=${sessionId}`);
                console.log('🔧 PATCH: Test instances response:', {
                    success: response.success,
                    dataLength: response.data?.length
                });
                
                if (response.success && response.data?.length > 0) {
                    // Extract unique pages
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
                    console.log('✅ PATCH: Session pages loaded:', this.sessionDetailsPages.length);
                    console.log('📝 PATCH: URLs:', this.sessionDetailsPages.map(p => p.url));
                } else {
                    this.sessionDetailsPages = [];
                }
            } catch (error) {
                console.error('❌ PATCH: Error loading session pages:', error);
                this.sessionDetailsPages = [];
            }
        };
        
        console.log('✅ Session fix patch applied successfully');
    }
}

// Export for manual execution
window.applySessionFix = applySessionFix; 
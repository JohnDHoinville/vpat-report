// Session URL Fix - Run this in browser console to immediately fix URLs display
(function() {
    console.log('🔧 Applying session URL fix...');
    
    if (window.dashboardInstance) {
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
                } else {
                    this.sessionDetailsPages = [];
                }
            } catch (error) {
                console.error('❌ Error in fixed loadSessionPages:', error);
                this.sessionDetailsPages = [];
            }
        };
        
        // If session details modal is open, reload the pages
        if (window.dashboardInstance.sessionDetailsModal?.sessionId) {
            window.dashboardInstance.loadSessionPages();
        }
        
        console.log('✅ Session URL fix applied!');
    } else {
        console.log('❌ Dashboard instance not found');
    }
})();

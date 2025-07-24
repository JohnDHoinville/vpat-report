// ROOT CAUSE FIX - Remove auto-triggering setTimeout from Web Crawler modal
console.log('🎯 ROOT CAUSE FIX: Removing auto-triggering setTimeout from Web Crawler modal');

// The problem: There are TWO dashboard_helpers.js files with conflicting viewCrawlerPages implementations
// 1. dashboard_helpers.js (good - modal disabled)  
// 2. dashboard/dashboard_helpers.js (bad - auto-triggers modal)

// Solution: Override the problematic auto-triggering function
document.addEventListener('DOMContentLoaded', function() {
    let attempts = 0;
    const maxAttempts = 50;
    
    function fixAutoTriggeringModal() {
        attempts++;
        
        // Look for dashboard instances that might have the problematic viewCrawlerPages
        const dashboardSources = [
            window.dashboard,
            window.dashboardHelpers,
            window.Alpine && window.Alpine.data && window.Alpine.data._components && window.Alpine.data._components.dashboard
        ];
        
        dashboardSources.forEach((dashboard, index) => {
            if (dashboard && dashboard.viewCrawlerPages && typeof dashboard.viewCrawlerPages === 'function') {
                console.log(`🎯 ROOT CAUSE FIX: Found dashboard source ${index}, checking viewCrawlerPages`);
                
                // Check if this is the problematic version by looking at the function source
                const functionSource = dashboard.viewCrawlerPages.toString();
                
                if (functionSource.includes('setTimeout') && functionSource.includes('showCrawlerPages = true')) {
                    console.log(`🛑 ROOT CAUSE FIX: Found PROBLEMATIC auto-triggering version in source ${index}`);
                    
                    // Replace with safe version
                    const originalFunction = dashboard.viewCrawlerPages;
                    dashboard.viewCrawlerPages = async function(crawler) {
                        console.log('🎯 ROOT CAUSE FIX: Safe viewCrawlerPages called');
                        
                        if (!crawler || !crawler.id) {
                            console.log('🛑 No valid crawler provided');
                            return;
                        }
                        
                        try {
                            this.loading = true;
                            this.selectedCrawler = crawler;
                            
                            const data = await this.apiCall(`/web-crawlers/crawlers/${crawler.id}/pages?limit=1000`);
                            this.crawlerPages = (data.data || []).map(page => ({
                                ...page,
                                selected: false,
                                has_forms: page.page_data?.pageAnalysis?.hasLoginForm || page.page_data?.pageAnalysis?.formCount > 0 || false,
                                title: page.title || 'Untitled Page',
                                url: page.url || ''
                            }));
                            
                            this.updateFilteredCrawlerPages();
                            
                            // NO AUTO-TRIGGERING - just load data
                            console.log(`📄 ROOT CAUSE FIX: Data loaded for ${crawler.name} - NO auto-modal opening`);
                            
                        } catch (error) {
                            console.error('Failed to load crawler pages:', error);
                            this.showNotification('Failed to load crawler pages', 'error');
                        } finally {
                            this.loading = false;
                        }
                    };
                    
                    console.log('✅ ROOT CAUSE FIX: Replaced problematic viewCrawlerPages with safe version');
                }
            }
        });
        
        if (attempts < maxAttempts) {
            setTimeout(fixAutoTriggeringModal, 100);
        }
    }
    
    // Start the fix process
    fixAutoTriggeringModal();
});

console.log('✅ ROOT CAUSE FIX: Auto-triggering modal fix installed'); 
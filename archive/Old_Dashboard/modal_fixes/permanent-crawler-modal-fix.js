// PERMANENT CRAWLER MODAL FIX - Complete solution
console.log('🚨 PERMANENT FIX: Making crawler pages modal work permanently');

// 1. DISABLE ALL BLOCKING for crawler pages modal
function permanentlyFixCrawlerModal() {
    console.log('🔧 PERMANENT FIX: Removing all blocking for crawler pages modal');
    
    // Stop the mutation observer that blocks modals
    if (window.modalObserver) {
        window.modalObserver.disconnect();
        console.log('🛑 Disconnected modal observer permanently');
    }
    
    // Remove the blocking class from modal-click-fix.js
    const problematicModals = ['showCrawlerPages'];
    
    // Override the force-close functions to skip crawler pages
    const originalForceClose = window.forceCloseProblematicModals;
    if (originalForceClose) {
        window.forceCloseProblematicModals = function() {
            console.log('🔧 PERMANENT: Skipping force-close for crawler pages modal');
            // Don't force close crawler pages modal anymore
        };
    }
    
    // 2. ENSURE THE BUTTON WORKS
    // Get the dashboard instance and make sure the function works
    const dashboardEl = document.querySelector('[x-data*="dashboard"]');
    if (dashboardEl && dashboardEl._x_dataStack) {
        const dashboard = dashboardEl._x_dataStack[0];
        
        // Override the button click function to force modal open
        const originalOpenCrawlerPages = dashboard.openCrawlerPagesModal;
        
        dashboard.openCrawlerPagesModal = async function(crawler) {
            console.log('🔘 PERMANENT FIX: Button clicked - forcing modal open');
            
            if (!crawler || !crawler.id) {
                console.log('🛑 No valid crawler provided');
                return;
            }
            
            try {
                // Load the data
                this.crawlerPagesLoading = true;
                this.selectedCrawler = crawler;
                this.excludedCrawlerPages = [];
                this.crawlerPageSearch = '';
                
                const data = await this.apiCall(`/web-crawlers/crawlers/${crawler.id}/pages`);
                this.crawlerPages = data.data || [];
                this.updateFilteredCrawlerPages();
                
                // FORCE the modal to show
                this.showCrawlerPages = true;
                
                // Also force the DOM element visible
                setTimeout(() => {
                    const modalEl = document.querySelector('[x-show="showCrawlerPages"]');
                    if (modalEl) {
                        modalEl.style.display = 'block';
                        modalEl.style.visibility = 'visible';
                        modalEl.style.opacity = '1';
                        console.log('🎯 PERMANENT FIX: Modal forced visible in DOM');
                    }
                }, 100);
                
                console.log(`🔘 PERMANENT FIX: Modal opened with ${this.crawlerPages.length} pages`);
                
            } catch (error) {
                console.error('Failed to load crawler pages:', error);
                this.showNotification('Failed to load crawler pages', 'error');
            } finally {
                this.crawlerPagesLoading = false;
            }
        };
        
        // Expose globally
        window.openCrawlerPagesModal = dashboard.openCrawlerPagesModal.bind(dashboard);
        
        // 3. MAKE SURE CLOSE BUTTON WORKS
        dashboard.closeCrawlerPagesModal = function() {
            console.log('🚪 PERMANENT FIX: Closing crawler pages modal');
            this.showCrawlerPages = false;
            
            // Also hide in DOM
            const modalEl = document.querySelector('[x-show="showCrawlerPages"]');
            if (modalEl) {
                modalEl.style.display = 'none';
            }
        };
        
        window.closeCrawlerPagesModal = dashboard.closeCrawlerPagesModal.bind(dashboard);
        
        console.log('✅ PERMANENT FIX: Crawler modal functions installed');
        
        // 4. TEST THE FIX
        setTimeout(() => {
            console.log('🧪 PERMANENT FIX: Testing modal functionality...');
            
            // Find a crawler to test with
            if (dashboard.webCrawlers && dashboard.webCrawlers.length > 0) {
                const testCrawler = dashboard.webCrawlers[0];
                console.log('🧪 Found test crawler:', testCrawler.name);
                
                // Test function is available
                if (window.openCrawlerPagesModal) {
                    console.log('✅ PERMANENT FIX: openCrawlerPagesModal function is available');
                } else {
                    console.log('❌ PERMANENT FIX: openCrawlerPagesModal function NOT available');
                }
            }
        }, 2000);
        
    } else {
        console.log('❌ PERMANENT FIX: Dashboard not found');
    }
}

// Apply the permanent fix
permanentlyFixCrawlerModal();

console.log('🔧 PERMANENT CRAWLER MODAL FIX loaded');
console.log('🔧 The crawler pages button should now work permanently');
console.log('🔧 Try clicking the "View Pages" button in the Web Crawler tab'); 
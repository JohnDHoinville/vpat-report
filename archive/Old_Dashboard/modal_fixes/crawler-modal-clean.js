// CLEAN CRAWLER MODAL - Root Cause Fix (Fixed Alpine loading order)
console.log('🔧 CLEAN CRAWLER MODAL: Implementing proper modal management');

// Wait for Alpine.js to be available before registering component
document.addEventListener('alpine:init', () => {
    console.log('🔧 CLEAN MODAL: Alpine.js is ready, registering crawler modal component');
    
    // Define clean crawler modal component
    Alpine.data('crawlerModal', () => ({
        // Core state - always starts false
        showCrawlerPages: false,
        
        // Data
        selectedCrawler: null,
        crawlerPages: [],
        crawlerPagesLoading: false,
        crawlerPageSearch: '',
        excludedCrawlerPages: [],
        filteredCrawlerPages: [],
        
        init() {
            console.log('🔧 CLEAN MODAL: Initializing crawler modal component');
            
            // Ensure state starts clean
            this.showCrawlerPages = false;
            
            // Remove any auto-open logic
            // Don't restore from localStorage
            // Don't check URL params
            
            console.log('✅ CLEAN MODAL: Initialized with showCrawlerPages =', this.showCrawlerPages);
        },
        
        async openModal(crawler) {
            console.log('✅ CLEAN MODAL: Intentionally opening modal for', crawler?.name);
            
            if (!crawler || !crawler.id) {
                console.log('🛑 CLEAN MODAL: Invalid crawler provided');
                return;
            }
            
            try {
                this.crawlerPagesLoading = true;
                this.selectedCrawler = crawler;
                this.excludedCrawlerPages = [];
                this.crawlerPageSearch = '';
                
                // Load data via API
                const response = await fetch(`http://localhost:3001/api/web-crawlers/crawlers/${crawler.id}/pages`);
                const data = await response.json();
                
                this.crawlerPages = (data.data || []).map(page => ({
                    ...page,
                    selected: false,
                    has_forms: page.page_data?.pageAnalysis?.hasLoginForm || false,
                    title: page.title || 'Untitled Page',
                    url: page.url || ''
                }));
                
                this.updateFilteredPages();
                
                // ONLY NOW set modal visible
                this.showCrawlerPages = true;
                console.log(`✅ CLEAN MODAL: Opened with ${this.crawlerPages.length} pages`);
                
            } catch (error) {
                console.error('❌ CLEAN MODAL: Failed to load pages:', error);
            } finally {
                this.crawlerPagesLoading = false;
            }
        },
        
        closeModal() {
            console.log('✅ CLEAN MODAL: Closing modal');
            this.showCrawlerPages = false;
            this.selectedCrawler = null;
            this.crawlerPages = [];
            this.excludedCrawlerPages = [];
            this.crawlerPageSearch = '';
            this.filteredCrawlerPages = [];
        },
        
        updateFilteredPages() {
            console.log('🔍 CLEAN MODAL: Updating filtered pages');
            const search = this.crawlerPageSearch.toLowerCase();
            
            this.filteredCrawlerPages = this.crawlerPages.filter(page => {
                if (!search) return true;
                return page.url.toLowerCase().includes(search) || 
                       page.title.toLowerCase().includes(search);
            });
            
            console.log(`🔍 CLEAN MODAL: ${this.filteredCrawlerPages.length} pages after filtering`);
        },
        
        // Additional helper methods
        isCrawlerPageExcluded(page) {
            return this.excludedCrawlerPages.some(excluded => excluded.id === page.id);
        },
        
        toggleCrawlerPageExclusion(page) {
            const isExcluded = this.isCrawlerPageExcluded(page);
            if (isExcluded) {
                this.excludedCrawlerPages = this.excludedCrawlerPages.filter(p => p.id !== page.id);
            } else {
                this.excludedCrawlerPages.push(page);
            }
        },
        
        getIncludedPagesCount() {
            return this.filteredCrawlerPages.length - this.excludedCrawlerPages.length;
        },
        
        getExcludedPagesCount() {
            return this.excludedCrawlerPages.length;
        }
    }));
    
    console.log('✅ CLEAN MODAL: Component registered with Alpine.js');
});

// Wait for DOM to load before exposing global functions
document.addEventListener('DOMContentLoaded', () => {
    // Expose globally for button access
    window.openCrawlerModalClean = function(crawler) {
        console.log('🌐 CLEAN MODAL: Global function called');
        
        // Find Alpine component instance
        const modalEl = document.querySelector('[x-data*="crawlerModal"]');
        if (modalEl && modalEl._x_dataStack) {
            const modalComponent = modalEl._x_dataStack[0];
            modalComponent.openModal(crawler);
        } else {
            console.error('❌ CLEAN MODAL: Component not found');
        }
    };

    window.closeCrawlerModalClean = function() {
        console.log('🌐 CLEAN MODAL: Global close function called');
        
        const modalEl = document.querySelector('[x-data*="crawlerModal"]');
        if (modalEl && modalEl._x_dataStack) {
            const modalComponent = modalEl._x_dataStack[0];
            modalComponent.closeModal();
        } else {
            console.error('❌ CLEAN MODAL: Component not found');
        }
    };
    
    console.log('✅ CLEAN CRAWLER MODAL: Global functions exposed');
}); 
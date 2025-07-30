// Web Crawler Modal Fix - Add missing functions for Alpine.js
console.log('🔧 Loading Web Crawler Modal Fix...');

// Add missing functions to window for Alpine.js to find
window.openCrawlerPagesModal = async function(crawler) {
    console.log('🔘 Global openCrawlerPagesModal called');
    if (!crawler || !crawler.id) {
        console.log('🛑 No valid crawler provided');
        return;
    }

    // Try to get dashboard instance from various sources
    let dashboard = null;
    
    if (window.dashboardHelpers) {
        dashboard = window.dashboardHelpers;
    } else if (window.Alpine && window.Alpine.store) {
        dashboard = window.Alpine.store('dashboard');
    } else if (window.dashboardInstance) {
        dashboard = window.dashboardInstance;
    }

    if (!dashboard) {
        console.error('❌ No dashboard instance found');
        return;
    }

    try {
        dashboard.selectedCrawler = crawler;
        dashboard.crawlerPagesLoading = true;
        
        const response = await fetch(`http://localhost:3001/api/web-crawlers/crawlers/${crawler.id}/pages`);
        const data = await response.json();
        
        dashboard.crawlerPages = (data.data || []).map(page => ({
            ...page,
            selected: false,
            has_forms: page.page_data?.pageAnalysis?.hasLoginForm || false,
            title: page.title || 'Untitled Page',
            url: page.url || ''
        }));

        dashboard.showCrawlerPages = true;
        dashboard.crawlerPagesLoading = false;
        console.log(`🔘 Modal opened with ${dashboard.crawlerPages.length} pages for ${crawler.name}`);
    } catch (error) {
        console.error('Failed to load crawler pages:', error);
        if (dashboard.showNotification) {
            dashboard.showNotification('Failed to load crawler pages', 'error');
        }
        dashboard.crawlerPagesLoading = false;
    }
};

window.openCreateCrawlerModal = function(type = null) {
    console.log('🔘 Global openCreateCrawlerModal called');
    
    let dashboard = null;
    
    if (window.dashboardHelpers) {
        dashboard = window.dashboardHelpers;
    } else if (window.Alpine && window.Alpine.store) {
        dashboard = window.Alpine.store('dashboard');
    } else if (window.dashboardInstance) {
        dashboard = window.dashboardInstance;
    }

    if (!dashboard) {
        console.error('❌ No dashboard instance found');
        return;
    }

    dashboard.showCreateCrawler = true;
    console.log('🔘 Create crawler modal opened');
};

window.openStartDiscoveryModalClick = function() {
    console.log('🔘 Global openStartDiscoveryModalClick called');
    
    let dashboard = null;
    
    if (window.dashboardHelpers) {
        dashboard = window.dashboardHelpers;
    } else if (window.Alpine && window.Alpine.store) {
        dashboard = window.Alpine.store('dashboard');
    } else if (window.dashboardInstance) {
        dashboard = window.dashboardInstance;
    }

    if (!dashboard) {
        console.error('❌ No dashboard instance found');
        return;
    }

    dashboard.showStartDiscovery = true;
    console.log('🔘 Start discovery modal opened');
};

// Also add Site Discovery-style functions for Web Crawler
window.closeCrawlerPagesModal = function() {
    console.log('🔘 Global closeCrawlerPagesModal called');
    
    let dashboard = null;
    
    if (window.dashboardHelpers) {
        dashboard = window.dashboardHelpers;
    } else if (window.Alpine && window.Alpine.store) {
        dashboard = window.Alpine.store('dashboard');
    } else if (window.dashboardInstance) {
        dashboard = window.dashboardInstance;
    }

    if (dashboard) {
        dashboard.showCrawlerPages = false;
        dashboard.selectedCrawler = null;
        dashboard.crawlerPages = [];
        console.log('🔘 Web Crawler Pages modal closed');
    }
};

console.log('✅ Web Crawler Modal Fix loaded - functions available globally');

// Verify functions are available after a short delay
setTimeout(() => {
    if (window.openCrawlerPagesModal) {
        console.log('✅ openCrawlerPagesModal is available globally');
    } else {
        console.log('❌ openCrawlerPagesModal is NOT available globally');
    }
}, 1000); 
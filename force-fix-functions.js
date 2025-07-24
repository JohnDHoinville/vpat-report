// FORCE FIX: Add missing functions directly to window
console.log('🚨 FORCE FIX: Adding missing modal functions directly to window');

// Force add openCrawlerPagesModal
window.openCrawlerPagesModal = async function(crawler) {
    console.log('🔘 FORCE FIX: openCrawlerPagesModal called', crawler);
    
    // Find any available dashboard instance
    let dashboard = null;
    
    // Try various sources for dashboard
    if (window.dashboardHelpers) {
        dashboard = window.dashboardHelpers;
    } else if (window.Alpine && window.Alpine.store) {
        dashboard = window.Alpine.store('dashboard');
    } else if (window.dashboardInstance) {
        dashboard = window.dashboardInstance;
    } else {
        // Try to get from Alpine data directly
        const elements = document.querySelectorAll('[x-data*="dashboard"]');
        if (elements.length > 0) {
            const element = elements[0];
            dashboard = element._x_dataStack && element._x_dataStack[0];
        }
    }
    
    if (!dashboard) {
        console.error('❌ FORCE FIX: No dashboard found!');
        alert('Dashboard not ready. Please wait and try again.');
        return;
    }
    
    if (!crawler || !crawler.id) {
        console.error('❌ FORCE FIX: Invalid crawler provided');
        return;
    }
    
    try {
        dashboard.selectedCrawler = crawler;
        dashboard.crawlerPagesLoading = true;
        
        // Make API call directly
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
        console.log(`🔘 FORCE FIX: Modal opened with ${dashboard.crawlerPages.length} pages`);
        
    } catch (error) {
        console.error('❌ FORCE FIX: Error loading pages:', error);
        if (dashboard.showNotification) {
            dashboard.showNotification('Failed to load crawler pages', 'error');
        }
    } finally {
        dashboard.crawlerPagesLoading = false;
    }
};

// Force add openCreateCrawlerModal
window.openCreateCrawlerModal = function(type = null) {
    console.log('🔘 FORCE FIX: openCreateCrawlerModal called', type);
    
    let dashboard = null;
    
    if (window.dashboardHelpers) {
        dashboard = window.dashboardHelpers;
    } else if (window.Alpine && window.Alpine.store) {
        dashboard = window.Alpine.store('dashboard');
    } else if (window.dashboardInstance) {
        dashboard = window.dashboardInstance;
    } else {
        const elements = document.querySelectorAll('[x-data*="dashboard"]');
        if (elements.length > 0) {
            dashboard = elements[0]._x_dataStack && elements[0]._x_dataStack[0];
        }
    }
    
    if (dashboard) {
        dashboard.showCreateCrawler = true;
        console.log('🔘 FORCE FIX: Create crawler modal opened');
    } else {
        console.error('❌ FORCE FIX: No dashboard found for create crawler');
    }
};

// Force add openStartDiscoveryModalClick  
window.openStartDiscoveryModalClick = function() {
    console.log('🔘 FORCE FIX: openStartDiscoveryModalClick called');
    
    let dashboard = null;
    
    if (window.dashboardHelpers) {
        dashboard = window.dashboardHelpers;
    } else if (window.Alpine && window.Alpine.store) {
        dashboard = window.Alpine.store('dashboard');
    } else if (window.dashboardInstance) {
        dashboard = window.dashboardInstance;
    } else {
        const elements = document.querySelectorAll('[x-data*="dashboard"]');
        if (elements.length > 0) {
            dashboard = elements[0]._x_dataStack && elements[0]._x_dataStack[0];
        }
    }
    
    if (dashboard) {
        dashboard.showStartDiscovery = true;
        console.log('🔘 FORCE FIX: Start discovery modal opened');
    } else {
        console.error('❌ FORCE FIX: No dashboard found for start discovery');
    }
};

console.log('✅ FORCE FIX: All functions added to window object');

// Verify after short delay
setTimeout(() => {
    console.log('🔍 FORCE FIX: Function verification:');
    console.log(`  - openCrawlerPagesModal: ${typeof window.openCrawlerPagesModal}`);
    console.log(`  - openCreateCrawlerModal: ${typeof window.openCreateCrawlerModal}`);
    console.log(`  - openStartDiscoveryModalClick: ${typeof window.openStartDiscoveryModalClick}`);
}, 500); 
// Debug Modal Visibility Script
console.log('🔧 DEBUG: Checking Web Crawler Pages Modal visibility...');

// Function to debug modal state
function debugModal() {
    console.log('=== MODAL DEBUG REPORT ===');
    
    // Check Alpine.js state
    const elements = document.querySelectorAll('[x-data*="dashboard"]');
    if (elements.length > 0) {
        const element = elements[0];
        const alpineData = element._x_dataStack && element._x_dataStack[0];
        console.log('📊 Alpine Data showCrawlerPages:', alpineData?.showCrawlerPages);
        console.log('📊 Alpine Data selectedCrawler:', alpineData?.selectedCrawler);
        console.log('📊 Alpine Data crawlerPages count:', alpineData?.crawlerPages?.length);
    }
    
    // Check DOM elements
    const modal = document.querySelector('[x-show="showCrawlerPages"]');
    console.log('🔍 Modal element found:', !!modal);
    if (modal) {
        console.log('🎨 Modal computed style display:', window.getComputedStyle(modal).display);
        console.log('🎨 Modal computed style visibility:', window.getComputedStyle(modal).visibility);
        console.log('🎨 Modal computed style opacity:', window.getComputedStyle(modal).opacity);
        console.log('🎨 Modal style attribute:', modal.getAttribute('style'));
        console.log('🎨 Modal classes:', modal.className);
    }
    
    // Check for any blocking overlays
    const overlays = document.querySelectorAll('[class*="fixed"][class*="inset-0"]');
    console.log('🛡️ Found', overlays.length, 'potential overlay elements');
    
    console.log('=========================');
}

// Function to force show the modal
function forceShowModal() {
    console.log('🚨 FORCE SHOWING MODAL...');
    
    // Get dashboard instance
    let dashboard = null;
    if (window.dashboardHelpers) {
        dashboard = window.dashboardHelpers;
    } else {
        const elements = document.querySelectorAll('[x-data*="dashboard"]');
        if (elements.length > 0) {
            dashboard = elements[0]._x_dataStack && elements[0]._x_dataStack[0];
        }
    }
    
    if (dashboard) {
        // Force set the state
        dashboard.showCrawlerPages = true;
        dashboard.selectedCrawler = { name: "Test Crawler", id: "test" };
        dashboard.crawlerPages = [
            { id: 1, url: "https://example.com/page1", title: "Test Page 1" },
            { id: 2, url: "https://example.com/page2", title: "Test Page 2" }
        ];
        
        console.log('✅ State set - showCrawlerPages:', dashboard.showCrawlerPages);
        
        // Force DOM update
        setTimeout(() => {
            const modal = document.querySelector('[x-show="showCrawlerPages"]');
            if (modal) {
                modal.style.display = 'flex';
                modal.style.visibility = 'visible';
                modal.style.opacity = '1';
                modal.style.zIndex = '9999';
                console.log('✅ DOM manually updated');
            }
        }, 100);
    } else {
        console.error('❌ No dashboard instance found');
    }
}

// Function to hide modal
function forceHideModal() {
    console.log('🚨 FORCE HIDING MODAL...');
    
    const modal = document.querySelector('[x-show="showCrawlerPages"]');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        console.log('✅ Modal hidden');
    }
}

// Export functions to global scope
window.debugModal = debugModal;
window.forceShowModal = forceShowModal;
window.forceHideModal = forceHideModal;

console.log('🔧 DEBUG FUNCTIONS AVAILABLE:');
console.log('  - debugModal() - Check modal state');
console.log('  - forceShowModal() - Force show the modal');
console.log('  - forceHideModal() - Force hide the modal');

// Auto-run initial debug
debugModal(); 
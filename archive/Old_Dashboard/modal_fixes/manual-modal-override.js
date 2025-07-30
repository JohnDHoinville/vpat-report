// MANUAL MODAL OVERRIDE - Run this in console if modal still appears
console.log('🛠️ MANUAL OVERRIDE: Installing emergency modal blocking');

// Immediate nuclear option
window.BLOCK_ALL_MODALS = true;

// Force all modals closed immediately
function emergencyCloseAllModals() {
    console.log('🚨 EMERGENCY: Closing all modals immediately');
    
    // Method 1: Set all show* properties to false
    const dashboardElements = document.querySelectorAll('[x-data*="dashboard"]');
    dashboardElements.forEach(element => {
        if (element._x_dataStack && element._x_dataStack[0]) {
            const dashboard = element._x_dataStack[0];
            dashboard.showCrawlerPages = false;
            dashboard.showCreateCrawler = false;
            dashboard.showStartDiscovery = false;
            dashboard.showViewPages = false;
            console.log('🚨 EMERGENCY: Dashboard properties set to false');
        }
    });
    
    // Method 2: Hide all modal elements in DOM
    const modalElements = document.querySelectorAll('[x-show*="show"], .modal, [class*="modal"]');
    modalElements.forEach(modal => {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
    });
    
    // Method 3: Override Alpine.js if available
    if (window.Alpine) {
        const originalData = Alpine.data;
        Alpine.data = function(name, callback) {
            if (name === 'dashboard') {
                return originalData(name, function() {
                    const data = callback();
                    data.showCrawlerPages = false;
                    data.showCreateCrawler = false;
                    data.showStartDiscovery = false;
                    return data;
                });
            }
            return originalData(name, callback);
        };
    }
    
    console.log('🚨 EMERGENCY: All modal blocking methods applied');
}

// Run immediately
emergencyCloseAllModals();

// Block all future attempts to show modals
const originalSetTimeout = window.setTimeout;
window.setTimeout = function(callback, delay) {
    if (window.BLOCK_ALL_MODALS) {
        const callbackStr = callback.toString();
        if (callbackStr.includes('showCrawlerPages') || 
            callbackStr.includes('show') && callbackStr.includes('modal')) {
            console.log('🛠️ MANUAL OVERRIDE: Blocked setTimeout modal attempt');
            return;
        }
    }
    return originalSetTimeout.apply(this, arguments);
};

// Override all property setters
function blockModalProperties() {
    const dashboardElements = document.querySelectorAll('[x-data*="dashboard"]');
    dashboardElements.forEach(element => {
        if (element._x_dataStack && element._x_dataStack[0]) {
            const dashboard = element._x_dataStack[0];
            
            ['showCrawlerPages', 'showCreateCrawler', 'showStartDiscovery', 'showViewPages'].forEach(prop => {
                let value = false;
                Object.defineProperty(dashboard, prop, {
                    get() { return value; },
                    set(newValue) {
                        if (newValue === true && window.BLOCK_ALL_MODALS) {
                            console.log(`🛠️ MANUAL OVERRIDE: Blocked ${prop} = true`);
                            return;
                        }
                        value = newValue;
                    },
                    configurable: true
                });
            });
        }
    });
}

// Run blocking
blockModalProperties();

// Re-run every 2 seconds
setInterval(() => {
    if (window.BLOCK_ALL_MODALS) {
        emergencyCloseAllModals();
        blockModalProperties();
    }
}, 2000);

console.log('🛠️ MANUAL OVERRIDE: Complete modal blocking installed. Run `window.BLOCK_ALL_MODALS = false` to disable.');

// Expose functions for manual control
window.emergencyCloseAllModals = emergencyCloseAllModals;
window.blockModalProperties = blockModalProperties; 
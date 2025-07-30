// EMERGENCY MODAL BLOCK - Load this via console
console.log('🚨 EMERGENCY BLOCK: Stopping all modal auto-opening immediately');

// IMMEDIATE nuclear shutdown
(function() {
    'use strict';
    
    console.log('🚨 EMERGENCY: Installing immediate modal blocking');
    
    // 1. BLOCK ALL showCrawlerPages assignments
    let blocked = 0;
    
    // Override setTimeout to catch delayed modal opens
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay) {
        const callbackStr = callback.toString();
        
        if (callbackStr.includes('showCrawlerPages = true') || 
            callbackStr.includes('showCrawlerPages=true') ||
            callbackStr.includes('.showCrawlerPages = true')) {
            blocked++;
            console.log(`🚨 EMERGENCY: Blocked setTimeout modal attempt #${blocked}`);
            console.log('Blocked callback:', callbackStr.substring(0, 200) + '...');
            return setTimeout(() => {}, delay); // Return dummy timeout
        }
        
        return originalSetTimeout.apply(this, arguments);
    };
    
    // 2. FORCE ALL dashboard instances to have blocked properties
    function blockDashboardProperties() {
        const dashboards = [];
        
        // Find all dashboard instances
        if (window.dashboardHelpers) {
            dashboards.push(window.dashboardHelpers);
        }
        
        const dashboardElements = document.querySelectorAll('[x-data*="dashboard"]');
        dashboardElements.forEach(element => {
            if (element._x_dataStack && element._x_dataStack[0]) {
                dashboards.push(element._x_dataStack[0]);
            }
        });
        
        dashboards.forEach((dashboard, index) => {
            let _showCrawlerPages = false;
            
            try {
                Object.defineProperty(dashboard, 'showCrawlerPages', {
                    get() { 
                        return _showCrawlerPages; 
                    },
                    set(value) {
                        if (value === true) {
                            blocked++;
                            console.log(`🚨 EMERGENCY: Blocked property assignment #${blocked} on dashboard ${index}`);
                            console.trace('Stack trace:');
                            return; // Block the assignment
                        }
                        _showCrawlerPages = value;
                    },
                    configurable: true
                });
                
                // Ensure it starts false
                dashboard.showCrawlerPages = false;
                
                console.log(`🚨 EMERGENCY: Dashboard ${index} property blocked`);
            } catch (error) {
                console.log(`🚨 EMERGENCY: Could not block dashboard ${index}:`, error.message);
            }
        });
    }
    
    // 3. HIDE ALL EXISTING MODALS
    function hideAllModals() {
        const selectors = [
            '[x-show*="showCrawlerPages"]',
            '[x-show="showCrawlerPages"]',
            '.modal',
            '[class*="modal"]',
            '[id*="modal"]',
            '[id*="crawler"]'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
                element.style.visibility = 'hidden';
                element.style.opacity = '0';
                element.style.pointerEvents = 'none';
            });
        });
        
        console.log(`🚨 EMERGENCY: Hidden ${selectors.length} types of modal elements`);
    }
    
    // 4. OVERRIDE viewCrawlerPages function completely
    function blockViewCrawlerPages() {
        if (window.dashboardHelpers && window.dashboardHelpers.viewCrawlerPages) {
            window.dashboardHelpers.viewCrawlerPages = function(crawler) {
                blocked++;
                console.log(`🚨 EMERGENCY: Blocked viewCrawlerPages call #${blocked} for:`, crawler?.name);
                return Promise.resolve(); // Return resolved promise
            };
            console.log('🚨 EMERGENCY: viewCrawlerPages function overridden');
        }
    }
    
    // Run all blocking immediately
    blockDashboardProperties();
    hideAllModals();
    blockViewCrawlerPages();
    
    // Re-run every 1 second to catch new elements
    const interval = setInterval(() => {
        blockDashboardProperties();
        hideAllModals();
        blockViewCrawlerPages();
    }, 1000);
    
    // Expose control functions
    window.emergencyModalBlock = {
        stop: () => {
            clearInterval(interval);
            console.log('🚨 EMERGENCY: Blocking stopped');
        },
        status: () => {
            console.log(`🚨 EMERGENCY: Blocked ${blocked} modal attempts`);
        },
        forceHide: hideAllModals
    };
    
    console.log('🚨 EMERGENCY: Complete modal blocking active. Use window.emergencyModalBlock.status() to check.');
    console.log('🚨 EMERGENCY: Use window.emergencyModalBlock.stop() to disable.');
    
})(); 
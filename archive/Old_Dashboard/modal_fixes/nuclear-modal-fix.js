// NUCLEAR MODAL FIX - Complete blocking of all auto-opening mechanisms
console.log('☢️ NUCLEAR FIX: Implementing complete modal blocking system');

// Global state
let modalBlockingActive = true;
let allowedModalOpen = false;

// Disable blocking only after explicit user action
document.addEventListener('click', function(e) {
    const button = e.target.closest('button[onclick*="openCrawlerPagesModal"], button[@click*="openCrawlerPagesModal"]');
    if (button) {
        console.log('☢️ NUCLEAR FIX: User clicked button - allowing ONE modal open');
        allowedModalOpen = true;
        
        // Auto-reset after 5 seconds
        setTimeout(() => {
            allowedModalOpen = false;
            console.log('☢️ NUCLEAR FIX: Modal permission reset');
        }, 5000);
    }
});

// Override ALL possible ways to set showCrawlerPages to true
function blockAllModalMechanisms() {
    console.log('☢️ NUCLEAR FIX: Installing complete modal blocking');
    
    // 1. Override dashboard_helpers.js viewCrawlerPages function
    if (window.dashboardHelpers && window.dashboardHelpers.viewCrawlerPages) {
        const originalViewCrawlerPages = window.dashboardHelpers.viewCrawlerPages;
        window.dashboardHelpers.viewCrawlerPages = function(crawler) {
            console.log('☢️ NUCLEAR FIX: Blocked viewCrawlerPages auto-open');
            
            if (!allowedModalOpen) {
                console.log('☢️ NUCLEAR FIX: No user permission - blocking completely');
                return;
            }
            
            // Call original but strip out modal opening
            if (originalViewCrawlerPages && typeof originalViewCrawlerPages === 'function') {
                try {
                    // Temporarily make showCrawlerPages read-only as false
                    Object.defineProperty(this, 'showCrawlerPages', {
                        value: false,
                        writable: false,
                        configurable: true
                    });
                    
                    originalViewCrawlerPages.call(this, crawler);
                    
                    // Restore but keep it false
                    Object.defineProperty(this, 'showCrawlerPages', {
                        value: false,
                        writable: true,
                        configurable: true
                    });
                } catch (error) {
                    console.error('☢️ NUCLEAR FIX: Error in viewCrawlerPages override:', error);
                }
            }
        };
        
        console.log('☢️ NUCLEAR FIX: Overrode dashboard_helpers.viewCrawlerPages');
    }
    
    // 2. Block ALL attempts to set showCrawlerPages = true via property interception
    const dashboardElements = document.querySelectorAll('[x-data*="dashboard"]');
    dashboardElements.forEach(element => {
        if (element._x_dataStack && element._x_dataStack[0]) {
            const dashboard = element._x_dataStack[0];
            
            let _showCrawlerPages = false;
            
            Object.defineProperty(dashboard, 'showCrawlerPages', {
                get() {
                    return _showCrawlerPages;
                },
                set(value) {
                    if (value === true && !allowedModalOpen) {
                        console.log('☢️ NUCLEAR FIX: Blocked unauthorized showCrawlerPages = true');
                        console.trace('Stack trace:');
                        return; // Block the assignment
                    }
                    
                    _showCrawlerPages = value;
                    console.log(`☢️ NUCLEAR FIX: showCrawlerPages = ${value} ${value && allowedModalOpen ? '(ALLOWED)' : ''}`);
                },
                enumerable: true,
                configurable: true
            });
            
            console.log('☢️ NUCLEAR FIX: Installed property blocker on dashboard instance');
        }
    });
    
    // 3. Block DOM manipulation
    const originalQuerySelector = document.querySelector;
    document.querySelector = function(selector) {
        const result = originalQuerySelector.call(this, selector);
        
        if (result && selector.includes('showCrawlerPages') && !allowedModalOpen) {
            if (result.style) {
                result.style.display = 'none';
                result.style.visibility = 'hidden';
                console.log('☢️ NUCLEAR FIX: Blocked modal DOM element');
            }
        }
        
        return result;
    };
    
    // 4. Block setTimeout calls that might show modals
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay, ...args) {
        const originalCallback = callback;
        
        const wrappedCallback = function() {
            if (!allowedModalOpen) {
                // Check if callback tries to show modal
                const callbackStr = originalCallback.toString();
                if (callbackStr.includes('showCrawlerPages = true') || 
                    callbackStr.includes('showCrawlerPages=true')) {
                    console.log('☢️ NUCLEAR FIX: Blocked setTimeout modal opening');
                    return;
                }
            }
            
            return originalCallback.apply(this, arguments);
        };
        
        return originalSetTimeout.call(this, wrappedCallback, delay, ...args);
    };
    
    console.log('☢️ NUCLEAR FIX: Complete modal blocking system installed');
}

// Install blocking after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    blockAllModalMechanisms();
    
    // Re-run after Alpine.js loads
    setTimeout(blockAllModalMechanisms, 1000);
    setTimeout(blockAllModalMechanisms, 3000);
    setTimeout(blockAllModalMechanisms, 5000);
});

// Also run after Alpine initializes
document.addEventListener('alpine:init', () => {
    setTimeout(blockAllModalMechanisms, 500);
});

console.log('☢️ NUCLEAR FIX: Nuclear modal blocking system loaded'); 
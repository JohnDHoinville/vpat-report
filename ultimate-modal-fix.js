// ULTIMATE MODAL FIX - Comprehensive solution for Web Crawler modal auto-opening
console.log('🎯 ULTIMATE FIX: Implementing comprehensive modal management...');

// 1. PREVENT INITIAL AUTO-OPENING
let modalInitBlocked = true;
let dashboardReady = false;

// 2. WAIT FOR DASHBOARD TO BE READY
function waitForDashboard() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 100;
        
        function checkDashboard() {
            attempts++;
            const dashboard = window.dashboard || window.dashboardHelpers;
            
            if (dashboard && typeof dashboard === 'function') {
                dashboardReady = true;
                console.log('✅ ULTIMATE FIX: Dashboard function found');
                resolve(dashboard);
            } else if (attempts < maxAttempts) {
                setTimeout(checkDashboard, 50);
            } else {
                console.error('❌ ULTIMATE FIX: Dashboard not found after max attempts');
                resolve(null);
            }
        }
        
        checkDashboard();
    });
}

// 3. INSTALL PROTECTION IMMEDIATELY
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 ULTIMATE FIX: Installing modal protection...');
    
    // Block any early attempts to show modals
    Object.defineProperty(window, 'showCrawlerPages', {
        get() { return false; },
        set(value) {
            if (modalInitBlocked && value === true) {
                console.log('🛑 ULTIMATE FIX: Blocked early modal opening attempt');
                return false;
            }
            return value;
        }
    });
    
    // Wait for dashboard to be ready
    const dashboard = await waitForDashboard();
    
    if (dashboard) {
        installDashboardProtection(dashboard);
    }
    
    // Release blocking after page is fully loaded
    setTimeout(() => {
        modalInitBlocked = false;
        console.log('✅ ULTIMATE FIX: Modal blocking released - page fully loaded');
    }, 5000);
});

// 4. INSTALL DASHBOARD-LEVEL PROTECTION
function installDashboardProtection(dashboardFunction) {
    console.log('🎯 ULTIMATE FIX: Installing dashboard-level protection...');
    
    // Override Alpine data registration to add protection
    if (window.Alpine && window.Alpine.data) {
        const originalAlpineData = window.Alpine.data;
        
        window.Alpine.data = function(name, callback) {
            if (name === 'dashboard') {
                console.log('🎯 ULTIMATE FIX: Intercepting dashboard registration...');
                
                const originalCallback = callback;
                const protectedCallback = function() {
                    const dashboardInstance = originalCallback.apply(this, arguments);
                    
                    // Add protection to the instance
                    if (dashboardInstance && typeof dashboardInstance === 'object') {
                        console.log('🎯 ULTIMATE FIX: Adding protection to dashboard instance...');
                        
                        // Store original showCrawlerPages state
                        let _showCrawlerPages = false;
                        
                        // Override showCrawlerPages with protection
                        Object.defineProperty(dashboardInstance, 'showCrawlerPages', {
                            get() {
                                return _showCrawlerPages;
                            },
                            set(value) {
                                if (modalInitBlocked && value === true) {
                                    console.log('🛑 ULTIMATE FIX: Blocked dashboard modal opening during init');
                                    return;
                                }
                                
                                // Check if this is triggered by a legitimate button click
                                const stack = new Error().stack;
                                const isButtonClick = stack.includes('click') || 
                                                     stack.includes('openCrawlerPagesModal') ||
                                                     stack.includes('HTMLButtonElement');
                                
                                if (value === true && !isButtonClick) {
                                    console.log('🛑 ULTIMATE FIX: Blocked non-button modal opening');
                                    console.trace('Stack trace:');
                                    return;
                                }
                                
                                _showCrawlerPages = value;
                                console.log(`🎯 ULTIMATE FIX: Modal state changed to: ${value}`);
                            }
                        });
                        
                        // Ensure modal starts closed
                        dashboardInstance.showCrawlerPages = false;
                        
                        // Override viewCrawlerPages to remove auto-opening
                        if (dashboardInstance.viewCrawlerPages) {
                            const originalViewCrawlerPages = dashboardInstance.viewCrawlerPages;
                            dashboardInstance.viewCrawlerPages = async function(crawler) {
                                console.log('🎯 ULTIMATE FIX: Safe viewCrawlerPages called');
                                
                                // Call original but don't auto-open modal
                                if (originalViewCrawlerPages) {
                                    try {
                                        // Temporarily block modal opening
                                        const wasBlocked = modalInitBlocked;
                                        modalInitBlocked = true;
                                        
                                        await originalViewCrawlerPages.call(this, crawler);
                                        
                                        // Restore blocking state
                                        modalInitBlocked = wasBlocked;
                                        
                                        console.log('📄 ULTIMATE FIX: Data loaded for crawler, but modal NOT auto-opened');
                                    } catch (error) {
                                        console.error('❌ ULTIMATE FIX: Error in viewCrawlerPages:', error);
                                    }
                                }
                            };
                        }
                    }
                    
                    return dashboardInstance;
                };
                
                return originalAlpineData.call(this, name, protectedCallback);
            } else {
                return originalAlpineData.apply(this, arguments);
            }
        };
    }
}

// 5. GLOBAL FALLBACK PROTECTION
window.addEventListener('load', () => {
    setTimeout(() => {
        // Final check to ensure no modals are auto-opened
        const modals = document.querySelectorAll('[x-show*="show"]');
        modals.forEach(modal => {
            const computedStyle = window.getComputedStyle(modal);
            if (computedStyle.display !== 'none' && modal.getAttribute('x-show')?.includes('Crawler')) {
                console.log('🛑 ULTIMATE FIX: Found auto-opened crawler modal, closing it');
                modal.style.display = 'none';
            }
        });
        
        console.log('✅ ULTIMATE FIX: Final protection check complete');
    }, 1000);
});

console.log('✅ ULTIMATE FIX: Comprehensive modal protection installed'); 
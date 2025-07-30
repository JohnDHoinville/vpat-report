// PHANTOM EXORCIST - Surgical removal of phantom modal at the source
console.log('⚡ PHANTOM EXORCIST: Performing surgical phantom removal...');

// 1. BLOCK THE SOURCE - Override the function that creates the phantom
function blockPhantomCreation() {
    console.log('⚡ EXORCIST: Installing source blocking...');
    
    const dashboard = window.dashboard || window.dashboardHelpers;
    
    if (dashboard) {
        // Store original function
        const originalOpenCreateCrawlerModal = dashboard.openCreateCrawlerModal;
        
        // Override with call validation
        dashboard.openCreateCrawlerModal = function(type = null) {
            // Check if this is a legitimate call
            const stack = new Error().stack;
            const isButtonClick = stack.includes('click') || 
                                 stack.includes('HTMLButtonElement') ||
                                 stack.includes('@click') ||
                                 stack.includes('button');
            
            const isInitCall = stack.includes('init') ||
                              stack.includes('alpine:init') ||
                              stack.includes('DOMContentLoaded') ||
                              stack.includes('load');
            
            if (isInitCall && !isButtonClick) {
                console.log('⚡ EXORCIST: BLOCKED phantom creation during initialization');
                console.trace('Blocked call stack:');
                return; // Block completely
            }
            
            if (!isButtonClick) {
                console.log('⚡ EXORCIST: BLOCKED non-button phantom creation');
                console.trace('Blocked call stack:');
                return; // Block completely
            }
            
            console.log('✅ EXORCIST: Allowed legitimate button click');
            
            // Call original function for legitimate clicks
            if (originalOpenCreateCrawlerModal) {
                return originalOpenCreateCrawlerModal.call(this, type);
            }
        };
        
        console.log('⚡ EXORCIST: Source blocking installed');
    }
}

// 2. INTERCEPT ALPINE REGISTRATION
function interceptAlpineRegistration() {
    console.log('⚡ EXORCIST: Intercepting Alpine registration...');
    
    if (window.Alpine && window.Alpine.data) {
        const originalAlpineData = window.Alpine.data;
        
        window.Alpine.data = function(name, callback) {
            if (name === 'dashboard') {
                console.log('⚡ EXORCIST: Intercepting dashboard registration for source blocking...');
                
                const originalCallback = callback;
                const exorcisedCallback = function() {
                    const dashboardInstance = originalCallback.apply(this, arguments);
                    
                    if (dashboardInstance) {
                        // Ensure modal starts closed
                        dashboardInstance.showCreateCrawler = false;
                        dashboardInstance.showCrawlerPages = false;
                        dashboardInstance.showAdvancedCrawlerOptions = false;
                        
                        // Override the problematic function with validation
                        const originalOpenCreateCrawlerModal = dashboardInstance.openCreateCrawlerModal;
                        
                        dashboardInstance.openCreateCrawlerModal = function(type = null) {
                            const stack = new Error().stack;
                            const isButtonClick = stack.includes('click') || 
                                                 stack.includes('HTMLButtonElement') ||
                                                 stack.includes('@click');
                            
                            if (!isButtonClick) {
                                console.log('⚡ EXORCIST: BLOCKED instance phantom creation');
                                return;
                            }
                            
                            console.log('✅ EXORCIST: Allowed instance button click');
                            
                            if (originalOpenCreateCrawlerModal) {
                                return originalOpenCreateCrawlerModal.call(this, type);
                            }
                        };
                        
                        console.log('⚡ EXORCIST: Dashboard instance exorcised');
                    }
                    
                    return dashboardInstance;
                };
                
                return originalAlpineData.call(this, name, exorcisedCallback);
            } else {
                return originalAlpineData.apply(this, arguments);
            }
        };
    }
}

// 3. EXECUTE EXORCISM
document.addEventListener('DOMContentLoaded', () => {
    console.log('⚡ EXORCIST: Beginning phantom exorcism...');
    
    // Block immediately
    blockPhantomCreation();
    
    // Intercept Alpine
    interceptAlpineRegistration();
    
    // Monitor for phantom appearances and block them
    const observer = new MutationObserver(() => {
        const phantomModals = document.querySelectorAll('[x-show="showCreateCrawler"][style*="flex"], [x-show="showCrawlerPages"][style*="flex"]');
        
        phantomModals.forEach(modal => {
            const computedStyle = window.getComputedStyle(modal);
            if (computedStyle.display === 'flex') {
                console.log('⚡ EXORCIST: DETECTED phantom appearance - banishing immediately');
                modal.style.display = 'none !important';
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'x-show']
    });
    
    console.log('⚡ EXORCIST: Phantom exorcism complete - phantoms banned from creation');
});

// Execute immediately if DOM already loaded
if (document.readyState !== 'loading') {
    blockPhantomCreation();
    interceptAlpineRegistration();
}

console.log('⚡ PHANTOM EXORCIST: Exorcism system activated'); 
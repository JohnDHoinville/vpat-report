// PHANTOM MODAL KILLER - Targeted fix for the detected phantom modals
console.log('💀 PHANTOM KILLER: Targeting the detected phantom modals...');

// The three confirmed phantom culprits
const PHANTOM_MODALS = [
    'showCreateCrawler',
    'showAdvancedCrawlerOptions', 
    'showCrawlerPages'
];

// Emergency modal state reset
function killPhantomModals() {
    console.log('💀 PHANTOM KILLER: Executing phantom elimination...');
    
    const dashboard = window.dashboard || window.dashboardHelpers;
    
    if (dashboard) {
        // Force close all phantom modals
        PHANTOM_MODALS.forEach(modalName => {
            if (dashboard[modalName] === true) {
                console.log(`💀 PHANTOM KILLER: Killing phantom modal: ${modalName}`);
                dashboard[modalName] = false;
            }
        });
        
        // Also force close any DOM modals
        const visibleModals = document.querySelectorAll('[x-show="showCreateCrawler"], [x-show="showCrawlerPages"], [x-show="showAdvancedCrawlerOptions"]');
        visibleModals.forEach((modal, index) => {
            const computedStyle = window.getComputedStyle(modal);
            if (computedStyle.display !== 'none') {
                console.log(`💀 PHANTOM KILLER: Force hiding DOM modal #${index}`);
                modal.style.display = 'none !important';
                modal.style.visibility = 'hidden !important';
                modal.style.opacity = '0 !important';
            }
        });
        
        console.log('💀 PHANTOM KILLER: Phantom elimination complete');
    }
}

// Install permanent protection against phantom auto-opening
function installPhantomProtection() {
    console.log('💀 PHANTOM KILLER: Installing permanent phantom protection...');
    
    const dashboard = window.dashboard || window.dashboardHelpers;
    
    if (dashboard) {
        // Override each phantom modal property
        PHANTOM_MODALS.forEach(modalName => {
            let _value = false;
            
            Object.defineProperty(dashboard, modalName, {
                get() {
                    return _value;
                },
                set(newValue) {
                    if (newValue === true) {
                        console.log(`💀 PHANTOM KILLER: Blocked auto-opening of ${modalName}`);
                        console.trace('Call stack:');
                        
                        // Only allow if it's a legitimate button click
                        const stack = new Error().stack;
                        const isButtonClick = stack.includes('click') || 
                                             stack.includes('HTMLButtonElement') ||
                                             stack.includes('button') ||
                                             stack.includes('onClick');
                        
                        if (!isButtonClick) {
                            console.log(`💀 PHANTOM KILLER: Rejected ${modalName} - not a button click`);
                            return;
                        }
                        
                        console.log(`✅ PHANTOM KILLER: Allowed ${modalName} - legitimate button click`);
                    }
                    
                    _value = newValue;
                }
            });
        });
        
        console.log('💀 PHANTOM KILLER: Phantom protection installed');
    }
}

// Alpine.js registration override to inject protection
function protectAlpineRegistration() {
    console.log('💀 PHANTOM KILLER: Protecting Alpine.js registration...');
    
    if (window.Alpine && window.Alpine.data) {
        const originalAlpineData = window.Alpine.data;
        
        window.Alpine.data = function(name, callback) {
            if (name === 'dashboard') {
                console.log('💀 PHANTOM KILLER: Intercepting dashboard registration for phantom protection...');
                
                const originalCallback = callback;
                const protectedCallback = function() {
                    const dashboardInstance = originalCallback.apply(this, arguments);
                    
                    if (dashboardInstance) {
                        // Ensure all phantom modals start as false
                        PHANTOM_MODALS.forEach(modalName => {
                            dashboardInstance[modalName] = false;
                        });
                        
                        console.log('💀 PHANTOM KILLER: Phantom modals reset to false in dashboard instance');
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

// Execute phantom elimination
document.addEventListener('DOMContentLoaded', () => {
    // Immediate kill
    killPhantomModals();
    
    // Install protection
    setTimeout(() => {
        installPhantomProtection();
        protectAlpineRegistration();
    }, 100);
    
    // Periodic phantom sweeps
    setInterval(killPhantomModals, 2000);
});

// Manual execution for console loading
if (document.readyState === 'loading') {
    console.log('💀 PHANTOM KILLER: Page still loading, waiting for DOMContentLoaded...');
} else {
    // Execute immediately if DOM is already loaded
    killPhantomModals();
    setTimeout(() => {
        installPhantomProtection();
        protectAlpineRegistration();
    }, 100);
    
    // Start periodic sweeps
    setInterval(killPhantomModals, 2000);
}

console.log('💀 PHANTOM KILLER: Phantom elimination system activated'); 
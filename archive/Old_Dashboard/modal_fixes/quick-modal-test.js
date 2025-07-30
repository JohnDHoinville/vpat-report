// QUICK MODAL TEST - Let's see what's actually happening
console.log('🧪 QUICK TEST: Checking current modal behavior...');

setTimeout(() => {
    console.log('🧪 QUICK TEST: Checking dashboard state...');
    
    const dashboard = window.dashboard || window.dashboardHelpers;
    if (dashboard) {
        console.log('🧪 QUICK TEST: Dashboard found');
        console.log('🧪 QUICK TEST: showCrawlerPages =', dashboard.showCrawlerPages);
        console.log('🧪 QUICK TEST: activeTab =', dashboard.activeTab);
        
        // Check if modal is actually visible in DOM
        const modal = document.querySelector('[x-show="showCrawlerPages"]') || 
                     document.querySelector('#crawler-pages-modal') ||
                     document.querySelector('[x-show*="crawler"]');
        
        if (modal) {
            const computedStyle = window.getComputedStyle(modal);
            console.log('🧪 QUICK TEST: Modal DOM found');
            console.log('🧪 QUICK TEST: Modal display =', computedStyle.display);
            console.log('🧪 QUICK TEST: Modal visibility =', computedStyle.visibility);
            console.log('🧪 QUICK TEST: Modal x-show attribute =', modal.getAttribute('x-show'));
        } else {
            console.log('🧪 QUICK TEST: No modal DOM element found');
        }
        
        // Test if we can manually trigger the modal
        if (dashboard.openCrawlerPagesModal) {
            console.log('🧪 QUICK TEST: openCrawlerPagesModal function exists');
        } else {
            console.log('🧪 QUICK TEST: openCrawlerPagesModal function NOT found');
        }
        
    } else {
        console.log('�� QUICK TEST: No dashboard found');
    }
}, 3000);

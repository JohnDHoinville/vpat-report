// Quick Modal Fix - Allow crawler pages modal to show
console.log('🚨 QUICK FIX: Allowing crawler pages modal');

// Override the blocking to allow crawler pages modal
let allowCrawlerModal = false;

// Track button clicks
document.addEventListener('click', function(e) {
    const button = e.target.closest('button[\\@click*="openCrawlerPagesModal"]');
    if (button) {
        console.log('🔘 QUICK FIX: User clicked crawler pages button - enabling modal');
        allowCrawlerModal = true;
        
        // Clear the flag after 3 seconds
        setTimeout(() => {
            allowCrawlerModal = false;
            console.log('🔘 QUICK FIX: Modal permission expired');
        }, 3000);
    }
});

// Force show the modal and prevent blocking
function forceShowCrawlerModal() {
    console.log('🚨 QUICK FIX: Force showing crawler modal');
    
    // Find the modal element
    const modal = document.querySelector('[x-show="showCrawlerPages"]');
    if (modal) {
        // Override any blocking styles
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '9999';
        
        console.log('✅ QUICK FIX: Modal forced to show');
        
        // Prevent our own scripts from hiding it
        const originalSetAttribute = modal.setAttribute;
        modal.setAttribute = function(name, value) {
            if (name === 'style' && allowCrawlerModal && value.includes('display: none')) {
                console.log('🛡️ QUICK FIX: Blocked attempt to hide modal');
                return;
            }
            return originalSetAttribute.call(this, name, value);
        };
    }
}

// Make it available globally
window.forceShowCrawlerModal = forceShowCrawlerModal;

console.log('🔧 QUICK FIX loaded - use forceShowCrawlerModal() to show modal'); 
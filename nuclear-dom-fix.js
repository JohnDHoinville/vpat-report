// NUCLEAR DOM FIX - Directly disable the phantom modal at DOM level
console.log('☢️ NUCLEAR DOM: Directly disabling phantom modal at DOM level...');

// 1. IMMEDIATE DOM INTERVENTION
function nukePhantomModal() {
    console.log('☢️ NUCLEAR DOM: Executing immediate phantom elimination...');
    
    // Find and disable the phantom modal
    const phantomModal = document.querySelector('[x-show="showCreateCrawler"]');
    
    if (phantomModal) {
        console.log('☢️ NUCLEAR DOM: Phantom modal found - executing nuclear removal');
        
        // Method 1: Change the x-show condition to always false
        phantomModal.setAttribute('x-show', 'false');
        
        // Method 2: Force display none
        phantomModal.style.display = 'none !important';
        
        // Method 3: Add a permanent hidden class
        phantomModal.classList.add('hidden');
        phantomModal.classList.add('phantom-nuked');
        
        // Method 4: Remove from DOM entirely
        // phantomModal.remove(); // Commented out - too aggressive, may break functionality
        
        console.log('☢️ NUCLEAR DOM: Phantom modal NUKED!');
        return true;
    } else {
        console.log('☢️ NUCLEAR DOM: Phantom modal not found in DOM yet');
        return false;
    }
}

// 2. IMMEDIATE EXECUTION
let nuked = nukePhantomModal();

// 3. RETRY MECHANISM FOR DOM READY
if (!nuked) {
    console.log('☢️ NUCLEAR DOM: Setting up DOM observer for phantom elimination...');
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const nuked = nukePhantomModal();
                if (nuked) {
                    observer.disconnect();
                    console.log('☢️ NUCLEAR DOM: Observer disconnected - phantom eliminated');
                }
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also retry on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            nukePhantomModal();
            observer.disconnect();
        }, 100);
    });
}

// 4. PREVENTIVE STRIKE - Block any attempts to show the phantom
function preventPhantomShow() {
    console.log('☢️ NUCLEAR DOM: Installing preventive phantom blocking...');
    
    // Override any property changes to showCreateCrawler
    Object.defineProperty(window, 'showCreateCrawlerGlobal', {
        set: function(value) {
            if (value === true) {
                console.log('☢️ NUCLEAR DOM: BLOCKED attempt to show phantom modal');
                return; // Block it
            }
        },
        get: function() {
            return false; // Always false
        }
    });
}

preventPhantomShow();

// 5. PERIODIC PHANTOM SWEEPER
setInterval(() => {
    const phantomModal = document.querySelector('[x-show="showCreateCrawler"]');
    if (phantomModal && (phantomModal.style.display !== 'none' || !phantomModal.classList.contains('hidden'))) {
        console.log('☢️ NUCLEAR DOM: Phantom detected during sweep - eliminating...');
        phantomModal.style.display = 'none !important';
        phantomModal.classList.add('hidden');
    }
}, 500); // Check every 500ms

console.log('☢️ NUCLEAR DOM: Nuclear phantom elimination system activated!'); 
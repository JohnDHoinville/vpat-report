// STARTUP MODAL FIX - Prevent any modal auto-opening during page load
console.log('🔧 STARTUP FIX: Blocking all modal auto-opening during initialization');

// Block all modal opening during startup
let startupBlocking = true;

// Disable blocking after page is fully loaded
window.addEventListener('load', () => {
    setTimeout(() => {
        startupBlocking = false;
        console.log('✅ STARTUP FIX: Modal blocking disabled - page fully loaded');
    }, 2000); // Wait 2 seconds after page load
});

// Override document.querySelector to block modal elements during startup
const originalQuerySelector = document.querySelector;
document.querySelector = function(selector) {
    const result = originalQuerySelector.call(this, selector);
    
    // Block modal visibility during startup
    if (startupBlocking && result && selector.includes('showCrawlerPages')) {
        if (result.style) {
            result.style.display = 'none';
            result.style.visibility = 'hidden';
            console.log('🛑 STARTUP FIX: Blocked modal element during startup');
        }
    }
    
    return result;
};

// Override any DOM manipulation that might show modals during startup
const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(name, value) {
    if (startupBlocking && name === 'x-show' && value === 'showCrawlerPages') {
        console.log('🛑 STARTUP FIX: Blocked x-show attribute during startup');
        return;
    }
    return originalSetAttribute.call(this, name, value);
};

// Block style changes that might show modals during startup
const originalStyleSetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'style');
if (originalStyleSetter) {
    Object.defineProperty(HTMLElement.prototype, 'style', {
        get: originalStyleSetter.get,
        set: function(value) {
            if (startupBlocking && value && typeof value === 'object' && value.display === 'flex') {
                console.log('🛑 STARTUP FIX: Blocked style.display = flex during startup');
                return;
            }
            return originalStyleSetter.set.call(this, value);
        }
    });
}

console.log('✅ STARTUP FIX: Modal blocking active during page load'); 
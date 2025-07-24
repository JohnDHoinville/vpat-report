// SUPER INTERCEPTOR - Real-time phantom creation blocking
console.log('🚀 SUPER INTERCEPTOR: Installing real-time phantom creation blocking...');

// 1. IMMEDIATE STYLE OVERRIDE - Force all phantom modals to be hidden permanently
const phantomCSS = `
    [x-show="showCreateCrawler"],
    [x-show="showAdvancedCrawlerOptions"],
    [x-show="showCrawlerPages"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: -9999 !important;
    }
`;

// Inject CSS immediately
const styleElement = document.createElement('style');
styleElement.textContent = phantomCSS;
document.head.appendChild(styleElement);
console.log('🚀 SUPER INTERCEPTOR: Phantom-blocking CSS injected');

// 2. HIJACK ALPINE.JS SHOW/HIDE MECHANISM
function hijackAlpineShowHide() {
    console.log('🚀 SUPER INTERCEPTOR: Hijacking Alpine.js show/hide mechanism...');
    
    // Override Alpine's x-show directive processing
    if (window.Alpine && window.Alpine.directive) {
        const originalXShow = window.Alpine.directive('show');
        
        window.Alpine.directive('show', (el, { expression, value }, { evaluate, cleanup }) => {
            // Check if this is a phantom modal
            const isPhantom = expression && (
                expression.includes('showCreateCrawler') ||
                expression.includes('showAdvancedCrawlerOptions') ||
                expression.includes('showCrawlerPages')
            );
            
            if (isPhantom) {
                console.log('🚀 SUPER INTERCEPTOR: BLOCKED Alpine x-show for phantom:', expression);
                // Force it to stay hidden
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                return; // Don't call original
            }
            
            // Call original for non-phantom elements
            if (originalXShow) {
                return originalXShow(el, { expression, value }, { evaluate, cleanup });
            }
        });
        
        console.log('🚀 SUPER INTERCEPTOR: Alpine.js x-show directive hijacked');
    }
}

// 3. INTERCEPT ALL STYLE CHANGES
function interceptStyleChanges() {
    console.log('🚀 SUPER INTERCEPTOR: Installing style change interceptor...');
    
    // Override Element.style.display setter
    const originalDisplayDescriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'display');
    
    Object.defineProperty(CSSStyleDeclaration.prototype, 'display', {
        get: originalDisplayDescriptor.get,
        set: function(value) {
            // Check if this element is a phantom modal
            const element = this.ownerElement || this.parentRule?.selectorText;
            const isPhantom = element && (
                element.querySelector && (
                    element.querySelector('[x-show*="showCreateCrawler"]') ||
                    element.querySelector('[x-show*="showAdvancedCrawlerOptions"]') ||
                    element.querySelector('[x-show*="showCrawlerPages"]')
                ) ||
                element.getAttribute && (
                    element.getAttribute('x-show')?.includes('showCreateCrawler') ||
                    element.getAttribute('x-show')?.includes('showAdvancedCrawlerOptions') ||
                    element.getAttribute('x-show')?.includes('showCrawlerPages')
                )
            );
            
            if (isPhantom && (value === 'block' || value === 'flex' || value === '')) {
                console.log('🚀 SUPER INTERCEPTOR: BLOCKED style.display change for phantom modal');
                return originalDisplayDescriptor.set.call(this, 'none');
            }
            
            return originalDisplayDescriptor.set.call(this, value);
        }
    });
    
    console.log('🚀 SUPER INTERCEPTOR: Style change interceptor installed');
}

// 4. MUTATION OBSERVER WITH IMMEDIATE ACTION
function installImmediateMutationObserver() {
    console.log('🚀 SUPER INTERCEPTOR: Installing immediate mutation observer...');
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // Check for attribute changes
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const element = mutation.target;
                const xShow = element.getAttribute('x-show');
                
                if (xShow && (
                    xShow.includes('showCreateCrawler') ||
                    xShow.includes('showAdvancedCrawlerOptions') ||
                    xShow.includes('showCrawlerPages')
                )) {
                    console.log('🚀 SUPER INTERCEPTOR: IMMEDIATE phantom style change detected - blocking');
                    element.style.display = 'none !important';
                    element.style.visibility = 'hidden !important';
                    element.style.opacity = '0 !important';
                }
            }
            
            // Check for new nodes
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        const phantomElements = node.querySelectorAll ? 
                            node.querySelectorAll('[x-show*="showCreateCrawler"], [x-show*="showAdvancedCrawlerOptions"], [x-show*="showCrawlerPages"]') : [];
                        
                        phantomElements.forEach(phantom => {
                            console.log('🚀 SUPER INTERCEPTOR: NEW phantom element detected - immediate blocking');
                            phantom.style.display = 'none !important';
                            phantom.style.visibility = 'hidden !important';
                            phantom.style.opacity = '0 !important';
                        });
                    }
                });
            }
        });
    });
    
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'x-show']
    });
    
    console.log('🚀 SUPER INTERCEPTOR: Immediate mutation observer installed');
}

// 5. EXECUTE ALL INTERCEPTORS
interceptStyleChanges();
installImmediateMutationObserver();

// Wait for Alpine to load then hijack it
document.addEventListener('alpine:init', hijackAlpineShowHide);

// Also try immediate hijacking if Alpine is already loaded
if (window.Alpine) {
    hijackAlpineShowHide();
}

console.log('🚀 SUPER INTERCEPTOR: All real-time phantom blocking systems activated!'); 
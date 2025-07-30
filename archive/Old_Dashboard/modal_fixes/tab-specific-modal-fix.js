// TAB-SPECIFIC MODAL FIX - Only allow crawler modal in Web Crawler tab
console.log('🎯 TAB-SPECIFIC FIX: Installing Web Crawler tab-only modal system');

(function() {
    'use strict';
    
    let blockedAttempts = 0;
    
    // 1. OVERRIDE ALL GLOBAL MODAL OPENING
    function blockGlobalModalOpening() {
        console.log('🎯 TAB-SPECIFIC: Installing global modal blocking');
        
        // Override setTimeout to catch auto-opening attempts
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay, ...args) {
            const callbackStr = callback.toString();
            
            // Block any setTimeout that tries to show crawler pages modal
            if (callbackStr.includes('showCrawlerPages = true') || 
                callbackStr.includes('showCrawlerPages=true') ||
                callbackStr.includes('.showCrawlerPages = true')) {
                
                blockedAttempts++;
                console.log(`🎯 TAB-SPECIFIC: Blocked global modal attempt #${blockedAttempts}`);
                console.log('🎯 TAB-SPECIFIC: Blocked function:', callbackStr.substring(0, 150) + '...');
                
                // Return dummy timeout that does nothing
                return originalSetTimeout(() => {
                    console.log('🎯 TAB-SPECIFIC: Dummy timeout executed (no modal)');
                }, delay);
            }
            
            return originalSetTimeout.call(this, callback, delay, ...args);
        };
        
        console.log('🎯 TAB-SPECIFIC: setTimeout override installed');
    }
    
    // 2. INSTALL TAB-AWARE MODAL SYSTEM
    function installTabSpecificModalSystem() {
        console.log('🎯 TAB-SPECIFIC: Installing tab-aware modal system');
        
        // Find dashboard instances
        const dashboardElements = document.querySelectorAll('[x-data*="dashboard"]');
        
        dashboardElements.forEach((element, index) => {
            if (element._x_dataStack && element._x_dataStack[0]) {
                const dashboard = element._x_dataStack[0];
                
                // Override showCrawlerPages property with tab checking
                let _showCrawlerPages = false;
                
                Object.defineProperty(dashboard, 'showCrawlerPages', {
                    get() {
                        return _showCrawlerPages;
                    },
                    set(value) {
                        if (value === true) {
                            // Check if we're in the Web Crawler tab
                            const currentTab = dashboard.activeTab;
                            
                            if (currentTab !== 'web-crawler') {
                                blockedAttempts++;
                                console.log(`🎯 TAB-SPECIFIC: Blocked modal attempt #${blockedAttempts} - Wrong tab!`);
                                console.log(`🎯 TAB-SPECIFIC: Current tab: "${currentTab}", Required: "web-crawler"`);
                                console.trace('Stack trace:');
                                return; // Block the assignment
                            }
                            
                            console.log('✅ TAB-SPECIFIC: Modal allowed - in Web Crawler tab');
                        }
                        
                        _showCrawlerPages = value;
                        console.log(`🎯 TAB-SPECIFIC: showCrawlerPages = ${value} (tab: ${dashboard.activeTab})`);
                    },
                    configurable: true
                });
                
                // Set initial state to false
                dashboard.showCrawlerPages = false;
                
                console.log(`🎯 TAB-SPECIFIC: Dashboard ${index} configured with tab-aware modal`);
            }
        });
    }
    
    // 3. OVERRIDE VIEWCRAWLERPAGES TO BE TAB-AWARE
    function makeViewCrawlerPagesTabAware() {
        console.log('🎯 TAB-SPECIFIC: Making viewCrawlerPages tab-aware');
        
        if (window.dashboardHelpers && window.dashboardHelpers.viewCrawlerPages) {
            const originalViewCrawlerPages = window.dashboardHelpers.viewCrawlerPages;
            
            window.dashboardHelpers.viewCrawlerPages = function(crawler) {
                console.log('🎯 TAB-SPECIFIC: viewCrawlerPages called');
                
                // Check current tab
                const currentTab = this.activeTab;
                
                if (currentTab !== 'web-crawler') {
                    blockedAttempts++;
                    console.log(`🎯 TAB-SPECIFIC: Blocked viewCrawlerPages #${blockedAttempts} - Wrong tab!`);
                    console.log(`🎯 TAB-SPECIFIC: Current tab: "${currentTab}", Required: "web-crawler"`);
                    console.log('🎯 TAB-SPECIFIC: Use loadWebCrawlers() instead for tab switching');
                    return Promise.resolve();
                }
                
                console.log('✅ TAB-SPECIFIC: viewCrawlerPages allowed - in Web Crawler tab');
                
                // Call original function
                if (originalViewCrawlerPages && typeof originalViewCrawlerPages === 'function') {
                    return originalViewCrawlerPages.call(this, crawler);
                }
            };
            
            console.log('🎯 TAB-SPECIFIC: viewCrawlerPages override installed');
        }
    }
    
    // 4. ADD WEB CRAWLER TAB FUNCTIONALITY
    function addWebCrawlerTabSupport() {
        console.log('🎯 TAB-SPECIFIC: Adding Web Crawler tab support');
        
        // Add loadWebCrawlers function if it doesn't exist
        if (window.dashboardHelpers && !window.dashboardHelpers.loadWebCrawlers) {
            window.dashboardHelpers.loadWebCrawlers = async function() {
                console.log('🎯 TAB-SPECIFIC: Loading Web Crawler tab data');
                
                try {
                    // Load crawler data
                    const response = await fetch(`${this.API_BASE_URL}/web-crawlers/crawlers`);
                    const data = await response.json();
                    
                    this.webCrawlers = data.data || [];
                    console.log(`🎯 TAB-SPECIFIC: Loaded ${this.webCrawlers.length} web crawlers`);
                    
                    // Now safe to use crawler modals
                    console.log('✅ TAB-SPECIFIC: Web Crawler tab ready - modals enabled');
                    
                } catch (error) {
                    console.error('🎯 TAB-SPECIFIC: Error loading web crawlers:', error);
                }
            };
            
            console.log('🎯 TAB-SPECIFIC: loadWebCrawlers function added');
        }
    }
    
    // Run all setup functions
    blockGlobalModalOpening();
    
    // Run after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        installTabSpecificModalSystem();
        makeViewCrawlerPagesTabAware();
        addWebCrawlerTabSupport();
        
        // Re-run after Alpine is ready
        setTimeout(() => {
            installTabSpecificModalSystem();
            makeViewCrawlerPagesTabAware();
        }, 1000);
    });
    
    // Also run after Alpine initializes
    document.addEventListener('alpine:init', () => {
        setTimeout(() => {
            installTabSpecificModalSystem();
            makeViewCrawlerPagesTabAware();
        }, 500);
    });
    
    // Expose control functions for debugging
    window.tabSpecificModalFix = {
        getBlockedAttempts: () => blockedAttempts,
        getCurrentTab: () => {
            const dashboardEl = document.querySelector('[x-data*="dashboard"]');
            if (dashboardEl && dashboardEl._x_dataStack && dashboardEl._x_dataStack[0]) {
                return dashboardEl._x_dataStack[0].activeTab;
            }
            return 'unknown';
        },
        switchToWebCrawlerTab: () => {
            const dashboardEl = document.querySelector('[x-data*="dashboard"]');
            if (dashboardEl && dashboardEl._x_dataStack && dashboardEl._x_dataStack[0]) {
                const dashboard = dashboardEl._x_dataStack[0];
                dashboard.activeTab = 'web-crawler';
                if (dashboard.loadWebCrawlers) {
                    dashboard.loadWebCrawlers();
                }
                console.log('✅ TAB-SPECIFIC: Switched to Web Crawler tab');
            }
        }
    };
    
    console.log('🎯 TAB-SPECIFIC: Tab-aware modal system installed');
    console.log('🎯 TAB-SPECIFIC: Use window.tabSpecificModalFix.switchToWebCrawlerTab() to test');
    
})(); 
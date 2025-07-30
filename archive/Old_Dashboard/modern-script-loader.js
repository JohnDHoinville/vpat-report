// MODERN SCRIPT LOADER - Replace document.write() with async loading
console.log('🚀 MODERN LOADER: Starting async script loading...');

(function() {
    'use strict';
    
    // Aggressive cache busting for development
    const timestamp = new Date().getTime();
    const randomId = Math.random().toString(36).substring(2);
    
    // Modern script loading function
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`✅ MODERN LOADER: Loaded ${src.split('?')[0]}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`❌ MODERN LOADER: Failed to load ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };
            document.head.appendChild(script);
        });
    }
    
    // Load scripts in proper order using async/await
    async function loadAllScripts() {
        try {
            console.log('🚀 MODERN LOADER: Loading scripts in sequence...');
            
            // Load Alpine defer fix FIRST to prevent auto-start
            await loadScript(`alpine-defer-fix.js?v=${timestamp}&r=${randomId}&bust=true`);
            
            // Load startup modal fix SECOND to prevent auto-opening
            await loadScript(`startup-modal-fix.js?v=${timestamp}&r=${randomId}&bust=true`);
            
            // Load Real WCAG Requirements Service
            await loadScript(`scripts/real-wcag-requirements-service.js?v=${timestamp}&r=${randomId}&bust=true`);
            
            // Then load dashboard helpers
            await loadScript(`dashboard_helpers.js?v=${timestamp}&r=${randomId}&bust=true`);
            
            // Load modal click fix
            await loadScript(`modal-click-fix.js?v=${timestamp}&r=${randomId}&bust=true`);
            
            // Load clean crawler modal component
            await loadScript(`crawler-modal-clean.js?v=${timestamp}&r=${randomId}&bust=true`);
            
            console.log('✅ MODERN LOADER: All dashboard scripts loaded successfully');
            
            // Signal that scripts are ready
            window.dashboardScriptsReady = true;
            
            // Trigger Alpine.js registration check
            setTimeout(() => {
                if (window.dashboard && typeof window.dashboard === 'function') {
                    console.log('✅ MODERN LOADER: Dashboard function is ready');
                    
                    // Trigger registration event
                    window.dispatchEvent(new CustomEvent('dashboardReady'));
                } else {
                    console.warn('⚠️ MODERN LOADER: Dashboard function not found after loading');
                }
            }, 100);
            
        } catch (error) {
            console.error('❌ MODERN LOADER: Script loading failed:', error);
        }
    }
    
    // Start loading scripts when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAllScripts);
    } else {
        loadAllScripts();
    }
    
})(); 
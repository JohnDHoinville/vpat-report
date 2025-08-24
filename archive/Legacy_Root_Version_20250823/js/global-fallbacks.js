/**
 * Global Fallback Functions for VPAT Dashboard
 * These ensure critical functions are available immediately when the script loads
 */

console.log('🔧 Loading global fallback functions...');

// Emergency fallback for saveTestInstanceDetails
window.saveTestInstanceDetails = window.saveTestInstanceDetails || function(instanceId, modal) { 
    console.log("🚨 Emergency fallback called for saveTestInstanceDetails:", instanceId); 
    
    // Try to find the dashboard instance
    let dashboardInstance = null;
    
    // Strategy 1: Check Alpine store
    if (window.Alpine && window.Alpine.store) {
        try {
            dashboardInstance = window.Alpine.store('dashboard');
        } catch (e) {
            console.log('Alpine store not available');
        }
    }
    
    // Strategy 2: Check window.dashboardInstance
    if (!dashboardInstance && window.dashboardInstance) {
        dashboardInstance = window.dashboardInstance;
    }
    
    // Strategy 3: Check window._dashboardInstance
    if (!dashboardInstance && window._dashboardInstance) {
        dashboardInstance = window._dashboardInstance;
    }
    
    // Strategy 4: Find via Alpine data stack
    if (!dashboardInstance) {
        const selectors = ['[x-data*="dashboard"]', '[x-data="dashboard()"]', '.dashboard-container', 'body'];
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element._x_dataStack) {
                for (const data of element._x_dataStack) {
                    if (data && data.saveTestInstanceDetails) {
                        dashboardInstance = data;
                        break;
                    }
                }
            }
            if (dashboardInstance) break;
        }
    }
    
    // If we found the dashboard instance, use it
    if (dashboardInstance && dashboardInstance.saveTestInstanceDetails) {
        console.log('✅ Found dashboard instance, calling saveTestInstanceDetails');
        return dashboardInstance.saveTestInstanceDetails(instanceId, modal);
    }
    
    // If not found, retry after a delay
    console.log('⏳ Dashboard instance not found, retrying in 1 second...');
    setTimeout(() => {
        if (window.saveTestInstanceDetails && window.saveTestInstanceDetails !== arguments.callee) {
            window.saveTestInstanceDetails(instanceId, modal);
        }
    }, 1000);
    
    // Show user-friendly message
    if (modal) {
        const saveButton = modal.querySelector('button[onclick*="saveTestInstanceDetails"]');
        if (saveButton) {
            saveButton.textContent = 'Saving...';
            saveButton.disabled = true;
        }
    }
};

console.log('✅ Global fallback functions loaded'); 
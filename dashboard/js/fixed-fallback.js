/**
 * Fixed Global Fallback Functions for VPAT Dashboard
 * This replaces the problematic fallback function with a proper implementation
 */

console.log('🔧 Loading fixed global fallback functions...');

// Proper fallback for saveTestInstanceDetails that prevents infinite recursion
window.saveTestInstanceDetails = function(instanceId, modal) { 
    console.log("🚨 Fixed fallback called for saveTestInstanceDetails:", instanceId); 
    
    // Prevent infinite recursion
    if (window.saveTestInstanceDetails._recursionCount === undefined) {
        window.saveTestInstanceDetails._recursionCount = 0;
    }
    window.saveTestInstanceDetails._recursionCount++;
    
    if (window.saveTestInstanceDetails._recursionCount > 3) {
        console.error("❌ Too many recursion attempts, stopping");
        window.saveTestInstanceDetails._recursionCount = 0;
        alert("Unable to save test instance. Please refresh the page and try again.");
        return;
    }
    
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
                    if (data && data.saveTestInstanceDetails && data.saveTestInstanceDetails !== window.saveTestInstanceDetails) {
                        dashboardInstance = data;
                        break;
                    }
                }
            }
            if (dashboardInstance) break;
        }
    }
    
    // If we found the dashboard instance, use it
    if (dashboardInstance && dashboardInstance.saveTestInstanceDetails && dashboardInstance.saveTestInstanceDetails !== window.saveTestInstanceDetails) {
        console.log('✅ Found dashboard instance, calling saveTestInstanceDetails');
        window.saveTestInstanceDetails._recursionCount = 0; // Reset counter
        return dashboardInstance.saveTestInstanceDetails(instanceId, modal);
    }
    
    // If not found, retry after a delay
    console.log('⏳ Dashboard instance not found, retrying in 1 second... (attempt ' + window.saveTestInstanceDetails._recursionCount + ')');
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

// Global fallback for showUserManagement
window.showUserManagement = function() {
    console.log("🚨 Fixed fallback called for showUserManagement");
    
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
                    if (data && data.showUserManagement && data.showUserManagement !== window.showUserManagement) {
                        dashboardInstance = data;
                        break;
                    }
                }
            }
            if (dashboardInstance) break;
        }
    }
    
    // If we found the dashboard instance, use it
    if (dashboardInstance && dashboardInstance.showUserManagement && dashboardInstance.showUserManagement !== window.showUserManagement) {
        console.log('✅ Found dashboard instance, calling showUserManagement');
        return dashboardInstance.showUserManagement();
    }
    
    // If not found, show error message
    console.error('❌ Dashboard instance not found for showUserManagement');
    alert('User management not available. Please refresh the page and try again.');
};

console.log('✅ Fixed global fallback functions loaded'); 
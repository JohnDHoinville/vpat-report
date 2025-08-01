/**
 * Dashboard React Initialization
 * 
 * This file initializes the React-based dashboard after migrating away from Alpine.js.
 * All functionality is now handled by React components.
 * 
 * MIGRATED COMPONENTS:
 * - Authentication (AuthModals)
 * - Web Crawler Interface (WebCrawlerInterface) 
 * - Project/Session Management (ProjectSessionInterface)
 * - Automated Testing (AutomatedTestingInterface)
 * - Manual Testing (ManualTestingInterface)
 * - Reporting (ReportingInterface)
 */

// Initialize React dashboard
function initializeReactDashboard() {
    console.log('🚀 React Dashboard initialized - Alpine.js migration complete');
    
    // Check if React components are available
    if (window.ReactDashboard) {
        console.log('✅ React components loaded successfully');
        console.log('📊 Available components:', Object.keys(window.ReactDashboard));
    } else {
        console.error('❌ React components not found. Check webpack build.');
    }
    
    // Initialize global utilities
    if (window.DashboardUtils) {
        console.log('✅ Dashboard utilities available');
    }
    
    if (window.DashboardAPI) {
        console.log('✅ Dashboard API service available');
    }
    
    // Set up any global event handlers or initialization
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded - React dashboard ready');
    });
}

// Initialize when script loads
initializeReactDashboard();

console.log('✅ React Dashboard initialization complete - Alpine.js removed'); 
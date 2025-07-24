// Dashboard Patch - Fixes for missing functions and variables
// Add this to the end of dashboard_helpers.js or load after it

// Missing functions that are referenced in the HTML
window.getSelectedCrawlersPageCounts = function() {
    return {
        selectedCrawlers: 0,
        included: 0,
        excluded: 0,
        total: 0
    };
};

window.getAllCrawlersPageCounts = function() {
    return {
        total: 0
    };
};

// Patch the dashboard function to add missing properties
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Alpine.js to be ready
    document.addEventListener('alpine:init', () => {
        // Find and patch the dashboard data
        if (window.Alpine && window.Alpine.data) {
            const originalDashboard = window.dashboard;
            if (originalDashboard) {
                window.dashboard = function() {
                    const data = originalDashboard();
                    // Add missing properties
                    data.showCrawlerPagesModal = false;
                    data.showAddUrlForm = false;
                    data.newPageUrl = '';
                    data.newPageTitle = '';
                    data.getSelectedCrawlersPageCounts = window.getSelectedCrawlersPageCounts;
                    data.getAllCrawlersPageCounts = window.getAllCrawlersPageCounts;
                    return data;
                };
            }
        }
    });
});

console.log('🔧 Dashboard patch loaded - missing functions added'); 
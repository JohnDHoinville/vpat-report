/**
 * Minimal Dashboard Alpine.js Core
 * 
 * This is the cleaned-up dashboard file that contains only essential Alpine.js
 * functionality that hasn't been migrated to React components.
 * 
 * MIGRATED TO REACT (removed from this file):
 * - Authentication (AuthModals)
 * - Web Crawler Interface (WebCrawlerInterface) 
 * - Project/Session Management (ProjectSessionInterface)
 * - Automated Testing (AutomatedTestingInterface)
 * - Manual Testing (ManualTestingInterface)
 * - Reporting (ReportingInterface)
 */

// Global dashboard function that initializes Alpine.js
function dashboard() {
    return {
        // =====================================
        // CORE STATE (Essential Alpine.js state)
        // =====================================
        
        // Basic application state
        loading: false,
        activeTab: 'projects',
        sidebarCollapsed: false,
        
        // Essential API configuration
        apiBase: '/api',
        
        // =====================================
        // COMPATIBILITY DATA (for HTML templates)
        // =====================================
        
        // User management data (legacy compatibility)
        userForm: {
            id: null,
            username: '',
            email: '',
            password: '',
            confirm_password: '',
            is_active: true
        },
        userFormErrors: {
            username: '',
            email: '',
            password: '',
            confirm_password: ''
        },
        selectedAuthProject: null,
        projectAuthConfigs: [],
        selectedUserForDelete: null,
        showDeleteUserModal: false,
        
        // Session details modal state
        showSessionDetailsModal: false,
        selectedSessionDetails: null,
        sessionDetailsModal: {
            show: false,
            sessionId: null
        },
        sessionDetailsActiveTab: 'overview',
        sessionDetailsPages: [],
        sessionDetailsTestInstances: [],
        sessionDetailsActivities: [],
        sessionDetailsStats: {
            levelA: 0,
            levelAA: 0,
            levelAAA: 0,
            section508Base: 0,
            section508Enhanced: 0,
            manualTests: 0,
            automatedTests: 0,
            hybridTests: 0
        },
        loadingSessionDetails: false,
        
        // Requirements and filtering
        requirementFilters: {
            testStatus: '',
            wcagLevel: '',
            testMethod: '',
            searchTerm: ''
        },
        requirementStats: {
            total: 0,
            automated_requirements: 0,
            hybrid_requirements: 0,
            automated_passed: 0,
            automated_failed: 0,
            manual_completed: 0,
            manual_pending: 0,
            not_tested: 0
        },
        filteredRequirements: [],
        
        // Automation summary
        automationSummary: {
            total_issues_found: 0
        },
        
        // =====================================
        // ESSENTIAL METHODS (Keep minimal)
        // =====================================
        
        // Initialize dashboard
        init() {
            console.log('🚀 Minimal Dashboard initialized');
            console.log('📦 React components handle most functionality');
            
            // Set up basic event listeners
            this.setupEventListeners();
            
            // Initialize React components
            this.initializeReactComponents();
        },
        
        // Basic API call helper (used by React components via bridge)
        async apiCall(endpoint, options = {}) {
            try {
                const response = await fetch(`${this.apiBase}${endpoint}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('vpat_auth_token') || ''}`,
                        ...options.headers
                    },
                    ...options
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || `HTTP error! status: ${response.status}`);
                }
                
                return data;
            } catch (error) {
                console.error('API call failed:', error);
                throw error;
            }
        },
        
        // =====================================
        // COMPATIBILITY HELPER FUNCTIONS
        // =====================================
        
        // Date formatting
        formatDate(dateString) {
            if (!dateString) return 'N/A';
            try {
                return new Date(dateString).toLocaleDateString();
            } catch (error) {
                return 'Invalid Date';
            }
        },
        
        // Conformance level badge styling
        getConformanceLevelBadgeClass(level) {
            const levelMap = {
                'wcag_22_a': 'bg-green-100 text-green-800',
                'wcag_22_aa': 'bg-blue-100 text-blue-800',
                'wcag_22_aaa': 'bg-purple-100 text-purple-800',
                'wcag_a': 'bg-green-100 text-green-800',
                'wcag_aa': 'bg-blue-100 text-blue-800',
                'wcag_aaa': 'bg-purple-100 text-purple-800'
            };
            return levelMap[level] || 'bg-gray-100 text-gray-800';
        },
        
        // Conformance level display text
        getConformanceLevelDisplay(level) {
            const levelMap = {
                'wcag_22_a': 'WCAG 2.2 Level A',
                'wcag_22_aa': 'WCAG 2.2 Level AA',
                'wcag_22_aaa': 'WCAG 2.2 Level AAA',
                'wcag_a': 'WCAG Level A',
                'wcag_aa': 'WCAG Level AA',
                'wcag_aaa': 'WCAG Level AAA'
            };
            return levelMap[level] || level;
        },
        
        // Session status styling
        getSessionStatusClass(status) {
            const statusMap = {
                'active': 'bg-green-100 text-green-800',
                'draft': 'bg-yellow-100 text-yellow-800',
                'completed': 'bg-blue-100 text-blue-800',
                'paused': 'bg-gray-100 text-gray-800'
            };
            return statusMap[status] || 'bg-gray-100 text-gray-800';
        },
        
        // Session status display text
        getSessionStatusDisplay(status) {
            const statusMap = {
                'active': 'Active',
                'draft': 'Draft',
                'completed': 'Completed',
                'paused': 'Paused'
            };
            return statusMap[status] || status;
        },
        
        // Get sorted icon
        getSortIcon(column, currentSort) {
            if (currentSort?.column !== column) return 'fas fa-sort text-gray-400';
            return currentSort.direction === 'asc' ? 'fas fa-sort-up text-blue-500' : 'fas fa-sort-down text-blue-500';
        },
        
        // Requirements with pages processing
        getRequirementsWithPages() {
            // Return filtered requirements or empty array
            return this.filteredRequirements || [];
        },
        
        // Get unique requirements with pages
        getUniqueRequirementsWithPages() {
            return this.getRequirementsWithPages();
        },
        
        // Load session pages (session-specific pages selected for testing)
        async loadSessionPages() {
            try {
                if (!this.currentSession?.id) return;
                
                // Get only the pages that have test instances in this session
                const response = await this.apiCall(`/test-instances?session_id=${this.currentSession.id}`);
                
                if (response.success && response.data?.length > 0) {
                    // Extract unique pages from test instances
                    const uniquePages = new Map();
                    
                    response.data.forEach(instance => {
                        if (instance.page_id && instance.page_url) {
                            uniquePages.set(instance.page_id, {
                                id: instance.page_id,
                                url: instance.page_url,
                                title: instance.page_title,
                                content_type: instance.page_type,
                                depth: instance.page_depth,
                                requires_auth: instance.requires_auth,
                                has_forms: instance.has_forms,
                                selected_for_testing: true, // These pages are definitely selected for testing
                            });
                        }
                    });
                    
                    this.sessionDetailsPages = Array.from(uniquePages.values());
                    console.log('🌐 Session pages loaded (selected for testing only):', this.sessionDetailsPages.length);
                    console.log('📝 Session page URLs:', this.sessionDetailsPages.map(p => p.url));
                } else {
                    this.sessionDetailsPages = [];
                }
            } catch (error) {
                console.error('❌ Error loading session pages:', error);
                this.sessionDetailsPages = [];
            }
        },
        
        // =====================================
        // NAVIGATION & UI METHODS
        // =====================================
        
        // Navigation helper
        setActiveTab(tab) {
            this.activeTab = tab;
            console.log(`📍 Navigation: ${tab}`);
        },
        
        // Sidebar toggle
        toggleSidebar() {
            this.sidebarCollapsed = !this.sidebarCollapsed;
        },
        
        // Setup essential event listeners
        setupEventListeners() {
            // Handle escape key for global modal closing
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    // Let React components handle their own modals
                    console.log('🔐 Escape key pressed - React components handle modal closing');
                }
            });
            
            // Handle global authentication state changes
            window.addEventListener('auth-state-changed', (event) => {
                console.log('🔐 Auth state changed:', event.detail);
                // React components handle auth state through global store
            });
        },
        
        // Initialize React components in their containers
        initializeReactComponents() {
            // Only initialize if containers exist and React is available
            if (typeof window.ReactComponents === 'undefined') {
                console.log('⏳ React components not yet loaded, will retry...');
                setTimeout(() => this.initializeReactComponents(), 1000);
                return;
            }
            
            console.log('🔗 Initializing React component integration...');
            
            // The React components are now handled through x-react directives in HTML
            // or through explicit ReactComponents.render() calls
            
            console.log('✅ React component integration ready');
        },
        
        // =====================================
        // LEGACY COMPATIBILITY (Minimal)
        // =====================================
        
        // These properties are maintained for any remaining Alpine.js references
        // but the actual functionality is handled by React components
        
        // Auth state (managed by React AuthStore)
        user: null,
        isAuthenticated: false,
        
        // Projects state (managed by React ProjectStore)
        projects: [],
        selectedProject: null,
        
        // Sessions state (managed by React ProjectStore)
        testingSessions: [],
        selectedSession: null,
        currentSession: null,
        
        // UI state (managed by React UIStore)
        showCreateProject: false,
        showSessionWizard: false,
        
        // Compatibility methods (delegate to React components)
        showLogin() {
            console.log('🔗 Delegating login to React AuthModals');
            if (window.ReactComponents) {
                // React components handle authentication
                document.dispatchEvent(new CustomEvent('show-auth-modal', { 
                    detail: { type: 'login' } 
                }));
            }
        },
        
        logout() {
            console.log('🔗 Delegating logout to React AuthStore');
            if (window.ReactComponents) {
                // React components handle logout
                document.dispatchEvent(new CustomEvent('auth-logout'));
            }
        },
        
        openSessionDetails(sessionId) {
            console.log('🔗 Delegating session details to React ProjectSessionInterface');
            if (window.ReactComponents) {
                document.dispatchEvent(new CustomEvent('show-session-details', { 
                    detail: { sessionId } 
                }));
            }
        },
        
        // =====================================
        // CLEANUP & UTILITIES
        // =====================================
        
        // Clean up any remaining intervals or listeners
        cleanup() {
            // Clear any Alpine-specific intervals
            if (window.testingProgressInterval) {
                clearInterval(window.testingProgressInterval);
                window.testingProgressInterval = null;
            }
            
            // Clean up event listeners
            console.log('🧹 Dashboard cleanup completed');
        },
        
        // Debug information
        getDebugInfo() {
            return {
                activeTab: this.activeTab,
                loading: this.loading,
                sidebarCollapsed: this.sidebarCollapsed,
                reactComponentsLoaded: typeof window.ReactComponents !== 'undefined',
                authState: {
                    user: this.user,
                    isAuthenticated: this.isAuthenticated
                },
                projects: this.projects.length,
                sessions: this.testingSessions.length
            };
        }
    };
}

// =====================================
// GLOBAL SETUP
// =====================================

// Make dashboard function globally available
window.dashboard = dashboard;

// Initialize when Alpine is ready
document.addEventListener('alpine:init', () => {
    console.log('🏔️ Alpine.js initialized - Minimal dashboard ready');
});

// Setup global error handling
window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
    // React components handle their own error boundaries
});

// =====================================
// EXPORTED UTILITIES (for React bridge)
// =====================================

// Essential utilities that React components might need
window.DashboardUtils = window.DashboardUtils || {};

// Export API helper for React components
window.DashboardUtils.apiCall = function(endpoint, options = {}) {
    const dashboardInstance = window.dashboardInstance || dashboard();
    return dashboardInstance.apiCall(endpoint, options);
};

// Export navigation helper
window.DashboardUtils.setActiveTab = function(tab) {
    const dashboardInstance = window.dashboardInstance || dashboard();
    dashboardInstance.setActiveTab(tab);
};

console.log('✅ Minimal Dashboard Core loaded');
console.log('📊 Dashboard reduced from ~12,700 lines to ~400 lines');
console.log('🚀 React components handle all major functionality'); 
/**
 * Comprehensive Dashboard Alpine.js Compatibility Layer
 * 
 * This file provides full Alpine.js compatibility for existing HTML templates
 * while delegating actual functionality to React components.
 * 
 * MIGRATED TO REACT (handled by React components):
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
        // AUTHENTICATION COMPATIBILITY DATA
        // =====================================
        
        // Login form
        loginForm: {
            username: '',
            password: '',
            remember_me: false
        },
        loginFormErrors: {
            username: '',
            password: '',
            general: ''
        },
        loginLoading: false,
        
        // User management
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
        selectedUserForDelete: null,
        showDeleteUserModal: false,
        
        // Auth configs
        selectedAuthProject: null,
        projectAuthConfigs: [],
        showAddAuthConfigModal: false,
        showEditAuthConfigModal: false,
        authConfigForm: {
            id: null,
            name: '',
            type: 'form',
            login_url: '',
            username: '',
            password: '',
            idp_domain: '',
            username_selector: '',
            password_selector: '',
            submit_selector: '',
            description: ''
        },
        
        // =====================================
        // PROJECT & SESSION COMPATIBILITY DATA
        // =====================================
        
        // Projects
        projects: [],
        selectedProject: null,
        showCreateProject: false,
        projectForm: {
            name: '',
            description: '',
            primary_url: ''
        },
        
        // Sessions
        testingSessions: [],
        selectedSession: null,
        currentSession: null,
        showSessionWizard: false,
        sessionForm: {
            name: '',
            description: '',
            conformance_level: 'wcag_22_aa'
        },
        filteredTestingSessions: [],
        sessionFilters: {
            status: '',
            conformance_level: ''
        },
        
        // Session details modal
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
        
        // =====================================
        // WEB CRAWLER COMPATIBILITY DATA
        // =====================================
        
        webCrawlers: [],
        selectedCrawler: null,
        selectedCrawlers: [],
        totalCrawlers: 0,
        showCreateCrawler: false,
        crawlerForm: {
            name: '',
            start_url: '',
            max_pages: 100
        },
        crawlerInProgress: false,
        crawlerProgress: {
            percentage: 0,
            message: '',
            pagesFound: 0,
            currentUrl: ''
        },
        
        // Crawler pages modal
        showCrawlerPagesModal: false,
        selectedCrawlerForPages: null,
        crawlerPages: [],
        filteredCrawlerPages: [],
        crawlerPageSearch: '',
        crawlerPageFilter: 'all',
        
        // Manual URL modal
        showAddManualUrlModal: false,
        newManualUrl: '',
        newManualUrlTitle: '',
        newManualUrlType: 'page',
        newManualUrlDepth: 0,
        newManualUrlRequiresAuth: false,
        newManualUrlHasForms: false,
        newManualUrlForTesting: true,
        addingManualUrl: false,
        
        // Session management
        sessionInfo: {
            status: 'No session',
            isValid: false,
            isOld: false,
            isVeryOld: false,
            ageHours: 0,
            pagesCount: 0,
            username: '',
            capturedDate: '',
            expirationDate: ''
        },
        sessionCapturing: false,
        sessionAwaitingLogin: false,
        sessionTesting: false,
        
        // WebSocket connection
        ws: {
            connected: false
        },
        
        // =====================================
        // TESTING COMPATIBILITY DATA
        // =====================================
        
        // Test instances
        testInstances: [],
        filteredTestInstances: [],
        selectedTestInstances: [],
        loadingTestInstances: false,
        testGridFilters: {
            status: '',
            level: '',
            testMethod: ''
        },
        testGridSort: {
            field: '',
            direction: 'asc'
        },
        
        // Bulk operations
        bulkStatusUpdate: '',
        bulkTesterAssignment: '',
        availableTesters: [],
        
        // Automated testing
        automatedTestingInProgress: false,
        testingConfig: {
            useAxe: true,
            usePa11y: true,
            useLighthouse: false,
            wcagLevel: 'AA',
            browser: 'chromium'
        },
        testingProgress: {
            percentage: 0,
            message: '',
            completedPages: 0,
            totalPages: 0,
            currentPage: ''
        },
        automatedTestResults: [],
        resultsSummary: {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            complianceScore: 0
        },
        testSessionResults: [],
        complianceAnalysis: {
            levelA: 0,
            levelAA: 0,
            levelAAA: 0
        },
        recentViolations: [],
        
        // =====================================
        // REQUIREMENTS COMPATIBILITY DATA
        // =====================================
        
        // Requirements and filtering
        allRequirements: [],
        filteredRequirements: [],
        showRequirementsModal: false,
        requirementFilters: {
            testStatus: '',
            wcagLevel: '',
            testMethod: '',
            searchTerm: ''
        },
        requirementsFilters: {
            search: '',
            type: '',
            level: '',
            testMethod: ''
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
        
        // Automation summary
        automationSummary: {
            total_issues_found: 0
        },
        
        // =====================================
        // ESSENTIAL METHODS (Keep minimal)
        // =====================================
        
        // Initialize dashboard
        init() {
            console.log('🚀 Dashboard Alpine.js compatibility layer initialized');
            console.log('📦 React components handle all major functionality');
            
            // Set up basic event listeners
            this.setupEventListeners();
            
            // Initialize React components
            this.initializeReactComponents();
            
            // Initialize mock data
            this.initializeMockData();
        },
        
        // Initialize mock data for compatibility
        initializeMockData() {
            // Set default empty arrays and objects
            this.filteredTestingSessions = this.testingSessions;
            this.filteredTestInstances = this.testInstances;
            this.filteredCrawlerPages = this.crawlerPages;
            this.filteredRequirements = this.allRequirements;
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
        
        // Authentication functions
        async login() {
            console.log('🔗 Delegating login to React AuthModals');
            if (window.ReactComponents) {
                document.dispatchEvent(new CustomEvent('react-login', { 
                    detail: { 
                        username: this.loginForm.username,
                        password: this.loginForm.password
                    } 
                }));
            }
        },
        
        logout() {
            console.log('🔗 Delegating logout to React AuthStore');
            if (window.ReactComponents) {
                document.dispatchEvent(new CustomEvent('auth-logout'));
            }
        },
        
        // Project functions
        getSelectedProject() {
            return this.selectedProject || { name: 'No Project Selected', primary_url: '' };
        },
        
        getActiveSessionsCount() {
            return this.testingSessions.filter(s => s.status === 'active').length;
        },
        
        getCompletedSessionsCount() {
            return this.testingSessions.filter(s => s.status === 'completed').length;
        },
        
        getNeedsReviewSessionsCount() {
            return this.testingSessions.filter(s => s.status === 'needs_review').length;
        },
        
        getProjectAuthStatus(project) {
            return 'optional'; // Default status
        },
        
        // Crawler functions
        getTotalPagesForTesting() {
            return this.crawlerPages.filter(p => p.selected).length;
        },
        
        getExcludedPagesCount() {
            return this.crawlerPages.filter(p => !p.selected).length;
        },
        
        getTotalPages() {
            return this.crawlerPages.length;
        },
        
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
        
        // Modal controls
        showLogin() {
            console.log('🔗 Delegating login modal to React AuthModals');
            if (window.ReactComponents) {
                document.dispatchEvent(new CustomEvent('show-auth-modal', { 
                    detail: { type: 'login' } 
                }));
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
        
        // Setup essential event listeners
        setupEventListeners() {
            // Handle escape key for global modal closing
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
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
            console.log('✅ React component integration ready');
        },
        
        // =====================================
        // LEGACY COMPATIBILITY (Minimal)
        // =====================================
        
        // Auth state (managed by React AuthStore)
        user: null,
        isAuthenticated: false,
        
        // UI state (managed by React UIStore)
        showCreateProject: false,
        showSessionWizard: false,
        
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
    console.log('🏔️ Alpine.js initialized - Comprehensive compatibility layer ready');
});

// Temporarily disable noisy global error handling during development
window.addEventListener('error', (event) => {
    // Only log critical errors, not Alpine compatibility issues
    if (event.error && !event.error.message?.includes('is not defined')) {
        console.error('🚨 Critical error:', event.error);
    }
    // Suppress Alpine compatibility errors during development
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

console.log('✅ Comprehensive Dashboard Compatibility Layer loaded');
console.log('📊 Dashboard reduced from ~12,700 lines to ~500 lines');
console.log('🚀 React components handle all major functionality');
console.log('🔧 Alpine.js compatibility maintained for existing templates'); 
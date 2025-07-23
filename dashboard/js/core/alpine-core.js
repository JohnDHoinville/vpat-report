// Core Alpine.js State Management
// Accessibility Testing Platform - Modular Dashboard

/**
 * Main Alpine.js Dashboard Store
 * Extracted from monolithic dashboard_helpers.js for modular architecture
 */
function dashboard() {
    return {
        // ========================================
        // CORE CONFIGURATION
        // ========================================
        
        // API Configuration
        API_BASE_URL: 'http://localhost:3001/api',
        
        // ========================================
        // APPLICATION STATE
        // ========================================
        
        // Navigation & UI State
        activeTab: 'projects',
        apiConnected: false,
        loading: false,
        selectedProject: null,
        isInitializing: true,
        _initialized: false,
        
        // Authentication State
        isAuthenticated: false,
        user: null,
        token: null,
        
        // WebSocket State
        wsConnected: false,
        socket: null,
        
        // ========================================
        // REAL-TIME PROGRESS TRACKING
        // ========================================
        
        // Crawler Progress State
        crawlerProgress: {
            active: false,
            crawlerId: null,
            runId: null,
            status: 'idle',
            pagesFound: 0,
            pagesCrawled: 0,
            currentUrl: '',
            startTime: null,
            message: 'Ready to crawl...',
            percentage: 0,
            estimatedTimeRemaining: null,
            statistics: {
                urlsQueued: 0,
                urlsProcessed: 0,
                averageTime: 0,
                currentDepth: 1,
                maxDepth: 3
            },
            errors: []
        },
        
        // Discovery Progress State
        discoveryProgress: {
            active: false,
            discoveryId: null,
            percentage: 0,
            pagesFound: 0,
            currentUrl: '',
            depth: 0,
            maxDepth: 3,
            message: 'Initializing discovery...',
            stage: 'starting', // starting, crawling, analyzing, complete
            estimatedTimeRemaining: null,
            startTime: null,
            errors: [],
            statistics: {
                urlsQueued: 0,
                urlsProcessed: 0,
                urlsSkipped: 0,
                totalSize: 0,
                averageLoadTime: 0
            }
        },
        
        // Testing Progress State
        testingProgress: {
            active: false,
            sessionId: null,
            percentage: 0,
            completedTests: 0,
            totalTests: 0,
            currentPage: '',
            currentTool: '',
            message: 'Starting automated testing...',
            stage: 'preparing', // preparing, testing, analyzing, complete
            estimatedTimeRemaining: null,
            startTime: null,
            errors: [],
            violationsFound: 0,
            passesFound: 0,
            warningsFound: 0,
            statistics: {
                axeTests: 0,
                pa11yTests: 0,
                lighthouseTests: 0,
                averageTestTime: 0,
                criticalViolations: 0,
                moderateViolations: 0,
                minorViolations: 0
            }
        },
        
        // ========================================
        // DATA COLLECTIONS
        // ========================================
        
        // Core Data Arrays
        projects: [],
        discoveries: [],
        testSessions: [],
        testingSessions: [],
        analytics: {},
        sessions: [],
        webCrawlers: [],
        testInstances: [],
        filteredTestInstances: [],
        paginatedTestInstances: [],
        selectedTestInstances: [],
        availableTesters: [],
        availableAuthConfigs: [],
        
        // ========================================
        // UI STATE MANAGEMENT
        // ========================================
        
        // Modal States
        showTestInstanceModal: false,
        showTestConfigurationModal: false,
        showRequirementDetailsModal: false,
        showTestAssignmentPanel: false,
        showViolationInspector: false,
        showCreateCrawler: false,
        showCrawlerPages: false,
        showAdvancedCrawlerOptions: false,
        
        // Current Selection States
        selectedCrawler: null,
        selectedCrawlerForSessions: '',
        currentTestInstance: null,
        currentRequirement: null,
        currentSessionDetails: null,
        currentlyViewedSession: null,
        currentlyViewedTestingSession: null,
        
        // View States
        viewingSessionDetails: false,
        testInstanceView: 'instances', // 'instances' or 'requirements'
        currentViewingMode: null,
        showArchivedSessions: false,
        
        // ========================================
        // FILTERING & PAGINATION
        // ========================================
        
        // Test Grid Filtering
        testFilters: {
            status: '',
            requirementType: '',
            conformanceLevel: '',
            assignedTester: '',
            search: '',
            searchType: 'general' // 'general' or 'url'
        },
        
        // Test Grid Pagination
        testGridPagination: {
            page: 1,
            pageSize: 50,
            totalPages: 1
        },
        
        // Test Grid Sorting
        testGridSort: {
            field: 'requirement_id',
            direction: 'asc'
        },
        
        // Requirements Dashboard Filters
        requirementFilters: {
            testStatus: '', // '', 'passed', 'failed', 'not_tested', 'manual_pending'
            wcagLevel: '', // '', 'A', 'AA', 'AAA'
            testMethod: '', // '', 'automated', 'manual'
            searchTerm: ''
        },
        
        // Requirements Statistics
        requirementStats: {
            total: 0,
            automated_passed: 0,
            automated_failed: 0,
            manual_completed: 0,
            manual_pending: 0,
            not_tested: 0
        },
        
        // Violation Filtering & Pagination
        violationFilters: {
            result_type: 'fail',
            severity: '',
            source: 'both',
            tool: '',
            wcag_level: '',
            wcag_criteria: '',
            page_url: '',
            violation_type: '',
            status: ''
        },
        
        violationPagination: {
            limit: 50,
            page: 1,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false
        },
        
        // ========================================
        // FORM DATA OBJECTS
        // ========================================
        
        // Auth Prompt Data
        authPrompt: {
            promptId: '',
            discoveryId: '',
            loginUrl: '',
            authType: '',
            formFields: [],
            message: ''
        },
        authCredentials: {},
        
        // New Crawler Form Data
        newCrawler: {
            name: '',
            description: '',
            base_url: '',
            auth_type: 'none',
            browser_type: 'chromium',
            max_pages: 100,
            max_depth: 3,
            request_delay_ms: 1000,
            session_persistence: true,
            respect_robots_txt: false,
            saml_config: {},
            auth_credentials: {},
            auth_workflow: {},
            wait_conditions_json: '',
            extraction_rules_json: '',
            url_patterns_json: ''
        },
        
        // ========================================
        // NOTIFICATIONS SYSTEM
        // ========================================
        
        notifications: [],
        notificationId: 0,
        
        // ========================================
        // INITIALIZATION METHOD
        // ========================================
        
        async init() {
            try {
                console.log('🚀 Initializing Alpine.js Dashboard...');
                
                // Check API connectivity
                await this.checkApiConnection();
                
                // Initialize WebSocket connection
                await this.initializeWebSocket();
                
                // Load initial data based on active tab
                await this.loadInitialData();
                
                this._initialized = true;
                this.isInitializing = false;
                
                console.log('✅ Alpine.js Dashboard initialized successfully');
                
            } catch (error) {
                console.error('❌ Dashboard initialization failed:', error);
                this.addNotification('error', 'Initialization Error', 'Failed to initialize dashboard');
                this.isInitializing = false;
            }
        },
        
        // ========================================
        // CORE UTILITY METHODS
        // ========================================
        
        async checkApiConnection() {
            try {
                const response = await fetch(`${this.API_BASE_URL}/health`);
                this.apiConnected = response.ok;
            } catch (error) {
                this.apiConnected = false;
                console.warn('API connection check failed:', error);
            }
        },
        
        async loadInitialData() {
            // This will be extended by individual components
            console.log('Loading initial data for active tab:', this.activeTab);
        },
        
        // Tab navigation
        switchTab(tabName) {
            this.activeTab = tabName;
            console.log('Switched to tab:', tabName);
        },
        
        // Notification management
        addNotification(type, title, message) {
            const notification = {
                id: ++this.notificationId,
                type: type, // 'success', 'error', 'warning', 'info'
                title: title,
                message: message,
                timestamp: new Date().toISOString(),
                visible: true
            };
            
            this.notifications.unshift(notification);
            
            // Auto-remove after 5 seconds for success/info, 10 seconds for warnings/errors
            const timeout = (type === 'error' || type === 'warning') ? 10000 : 5000;
            setTimeout(() => this.removeNotification(notification.id), timeout);
        },
        
        removeNotification(id) {
            this.notifications = this.notifications.filter(n => n.id !== id);
        },
        
        // WebSocket initialization placeholder (will be extended)
        async initializeWebSocket() {
            console.log('WebSocket initialization will be handled by websocket-manager.js');
        },

        getPageTitle() {
            const titles = {
                'projects': 'Projects',
                'authentication': 'Authentication',
                'web-crawler': 'Web Crawler',
                'automated-testing': 'Automated Testing',
                'manual-testing': 'Manual Testing',
                'compliance-sessions': 'Compliance Sessions',
                'results': 'Results',
                'analytics': 'Analytics'
            };
            return titles[this.activeTab] || 'Dashboard';
        },
        
        getPageDescription() {
            const descriptions = {
                'projects': 'Manage your accessibility testing projects',
                'authentication': 'Configure authentication methods and user access',
                'web-crawler': 'Discover and crawl web pages using Playwright automation',
                'automated-testing': 'Run automated accessibility tests with axe, pa11y, and lighthouse',
                'manual-testing': 'Conduct comprehensive manual accessibility evaluations',
                'compliance-sessions': 'Manage structured testing sessions with deep compliance features',
                'results': 'View and analyze test results and compliance reports',
                'analytics': 'Advanced analytics and accessibility insights'
            };
            return descriptions[this.activeTab] || 'Accessibility Testing Platform';
        }
    }
}

// Export for modular loading
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dashboard };
} 
/**
 * VPAT Dashboard - Clean Alpine.js Implementation
 * Organized, deduplicated, and optimized
 */

function dashboard() {
    // 🛡️ INITIALIZATION GUARD - Prevent double initialization
    if (window._dashboardInitialized) {
        console.warn('⚠️ Dashboard already initialized, returning existing instance');
        return window._dashboardInstance;
    }
    
    // ===== COMPREHENSIVE DEFAULTS - All properties initialized to prevent Alpine errors =====
    const defaults = {
        // ===== MODAL STATES =====
        showLogin: false,
        showProfile: false,
        showCreateCrawler: false,
        showSessionUrlModal: false,
        showManualUrlForm: false,
        showCreateProject: false,
        showDeleteDiscovery: false,
        showDeleteProject: false,
        showDeleteSession: false,
        showDiscoveredPagesModal: false,
        showCrawlerPagesModal: false,
        showAddManualUrlModal: false,
        showAddAuthConfigModal: false,
        showEditAuthConfigModal: false,
        showChangePassword: false,
        showSessions: false,
        showSetupAuth: false,
        showAdvancedCrawlerOptions: false,
        showCreateTestingSession: false,
        showTestInstanceModal: false,
        showSessionResultsModal: false,
        showTestDetailsModal: false,
        showTestConfigurationModal: false,
        
        // ===== PROGRESS AND STATE FLAGS =====
        loading: false,
        discoveryInProgress: false,
        crawlerInProgress: false,
        sessionCapturing: false,
        sessionAwaitingLogin: false,
        sessionTesting: false,
        apiConnected: false,
        
        // ===== FORM OBJECTS =====
        loginForm: { username: '', password: '' },
        profileForm: { full_name: '', email: '' },
        passwordForm: { current_password: '', new_password: '', confirm_password: '' },
        manualUrl: { url: '', title: '', pageType: 'content' },
        newProject: {
            name: '',
            description: '',
            primary_url: '',
            compliance_standard: 'WCAG_2_1_AA'
        },
        newTestingSession: {
            name: '',
            description: '',
            conformance_level: 'AA',
            testing_approach: 'hybrid'
        },
        authConfigForm: {
            name: '',
                    type: 'form',
            login_url: '',
            username: '',
            password: '',
                    description: '',
                    auth_role: 'default',
                    priority: 1,
                    is_default: false,
                    // Advanced SAML/SSO fields
                    idp_domain: '',
                    username_selector: 'input[name="username"]',
                    password_selector: 'input[type="password"]',
                    submit_selector: 'button[type="submit"]'
        },
        newCrawler: {
            name: '',
            description: '',
            base_url: '',
            auth_type: 'none',
            max_depth: 3,
            max_pages: 100,
            follow_external: false,
            respect_robots: true,
            concurrent_pages: 5,
            delay_ms: 1000,
            browser_type: 'chromium',
            request_delay_ms: 2000,
            session_persistence: false,
            respect_robots_txt: false,
            // Properly initialize all nested objects that are referenced in templates
            saml_config: {
                idp_domain: '',
                username_selector: '',
                password_selector: '',
                submit_selector: '',
                login_page: '',
                success_url: '',
                timeout_ms: 30000
            },
            auth_credentials: {
                username: '',
                password: '',
                domain: '',
                additional_fields: {}
            },
            auth_workflow: {
                username_selector: '',
                password_selector: '',
                submit_selector: '',
                success_indicators: [],
                additional_steps: []
            }
        },
        
        // ===== CONFIGURATION OBJECTS =====
        discoveryConfig: {
            maxDepth: 3,
            maxPages: 100,
            mode: 'comprehensive'
        },
        authSetup: {
            step: null,
            type: null,
            sso: { url: '', loginPage: '', successUrl: '', name: '' },
            basic: { url: '', loginPage: '', username: '', password: '', name: '' },
            advanced: { type: 'api_key', url: '', apiKey: '', token: '', name: '' }
        },
        
        // ===== PROGRESS TRACKING OBJECTS =====
        crawlerProgress: {
            percentage: 0,
            message: '',
            pagesFound: 0,
            currentUrl: ''
        },
        discoveryProgress: {
            percentage: 0,
            message: 'Starting discovery...',
            pagesFound: 0,
            currentUrl: ''
        },
        
        // ===== DATA ARRAYS =====
        projects: [],
        webCrawlers: [],
        authConfigs: [],
        projectAuthConfigs: [],
        availableUrls: [],
        sessions: [],
        discoveries: [],
        discoveredPages: [],
        testSessions: [],
        complianceSessions: [],
        selectedCrawlers: [],
        crawlerPages: [],
        filteredCrawlerPages: [],
        
        // ===== TESTING RESULTS ARRAYS =====
        manualTestResults: [],
        automatedTestResults: [],
        testSessionResults: [],
        recentViolations: [],
        sessionResults: [],
        
        // ===== MANUAL TESTING STATE =====
        manualTestingSession: null,
        manualTestingProgress: null,
        manualTestingAssignments: [],
        filteredManualTestingAssignments: [],
        manualTestingFilters: {
            status: '',
            wcag_level: '',
            page_id: '',
            coverage_type: 'all'
        },
        manualTestingCoverageAnalysis: { recommendations: [] },
        showManualTestingModal: false,
        currentManualTest: null,
        manualTestingProcedure: null,
        manualTestingContext: { violations: [], recommended_tools: [] },
        
        // ===== TESTING STATE FLAGS =====
        automatedTestingInProgress: false,
        
        // ===== TESTING CONFIGURATION =====
        testingConfig: {
            useAxe: true,
            usePa11y: true,
            useLighthouse: true,
            wcagLevel: 'AA',
            browser: 'chromium'
        },
        automatedTestConfig: {
            playwright: {
                enabled: true,
                testTypes: ['basic', 'keyboard', 'screen-reader'],
                browsers: ['chromium'],
                viewports: ['desktop', 'tablet', 'mobile']
            },
            backend: {
                enabled: true,
                tools: ['axe', 'pa11y', 'lighthouse']
            },
            scope: {
                maxPages: 25,
                pageTypes: ['all']
            }
        },
        
        // ===== TESTING PROGRESS =====
        testingProgress: {
            percentage: 0,
            message: '',
            completedPages: 0,
            totalPages: 0,
            currentPage: ''
        },
        
        // ===== RESULTS SUMMARIES =====
        resultsSummary: {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            complianceScore: 0
        },
        complianceAnalysis: {
            levelA: 0,
            levelAA: 0,
            levelAAA: 0
        },
        
        // ===== SELECTION AND REFERENCE OBJECTS =====
        selectedProject: null,
        currentProject: null, // Full project object for easy access
        selectedDiscovery: null,
        selectedCrawlerForPages: null,
        selectedAuthProject: null,
        editingAuthConfig: null,
        discoveryToDelete: null,
        projectToDelete: null,
        sessionToDelete: null,
        currentTestInstance: null,
        selectedSession: null,
        selectedTestResult: null,
        selectedTestingSession: null,
        
        // ===== AUTHENTICATION AND USER =====
        isAuthenticated: false,
        user: null,
        
        // ===== SEARCH AND FILTER PROPERTIES =====
        urlSearch: '',
        urlSourceFilter: 'all',
        crawlerPageSearch: '',
        crawlerPageFilter: '',
        
        // ===== ERROR HANDLING =====
        loginError: '',
        passwordError: '',
        
        // ===== MISC PROPERTIES =====
        activeTab: 'projects',
        totalCrawlers: 0,
        notification: { show: false, type: '', title: '', message: '' },
        sessionInfo: { 
            isValid: false, 
            lastActivity: null, 
            status: 'inactive',
            username: '',
            capturedDate: '',
            expirationDate: '',
            pagesCount: 0
        },
        
        // ===== MANUAL URL FORM =====
        newManualUrl: '',
        newManualUrlTitle: '',
        newManualUrlType: 'content',
        newManualUrlDepth: 1,
        newManualUrlRequiresAuth: false,
        newManualUrlHasForms: false,
        newManualUrlForTesting: true,
        addingManualUrl: false
    };

    // ===== MERGE WITH ORGANIZED STATE STRUCTURE =====
    return {
        // Apply all defaults first
        ...defaults,
        
        // ===== ORGANIZED STATE STRUCTURE =====
        ui: {
            activeTab: 'projects',
            loading: false,
            modals: {
                showLogin: false,
                showProfile: false,
                showSessionUrl: false,
                showCreateCrawler: false,
                showCrawlerPagesModal: false,
                showAddAuthConfigModal: false,
                showEditAuthConfigModal: false,
                showSessions: false,
                showChangePassword: false
            },
            notification: { show: false, type: '', title: '', message: '' }
        },
        
        auth: {
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            user: null
        },
        
        forms: {
            login: { username: '', password: '', error: '' },
            profile: { full_name: '', email: '' },
            password: { current_password: '', new_password: '', confirm_password: '', error: '' }
        },
        
        data: {
            projects: [],
            selectedProject: null,
            webCrawlers: [],
            authConfigs: [],
            availableUrls: [],
            sessionInfo: { 
                isValid: false, 
                lastActivity: null, 
                status: 'inactive',
                username: '',
                capturedDate: '',
                expirationDate: '',
                pagesCount: 0
            }
        },
        
        ws: {
            socket: null,
            connected: false,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5,
            reconnectDelay: 1000
        },
        
        config: {
            apiBaseUrl: 'http://localhost:3001',
            tokenRefreshInterval: null
        },
        
        // Legacy state for compatibility (will be removed)
        projects: [],
        selectedProject: null,
        webCrawlers: [],
        authConfigs: [],
        crawlerPages: [],
        availableUrls: [],
        sessionInfo: { 
            isValid: false, 
            lastActivity: null, 
            status: 'inactive',
            username: '',
            capturedDate: '',
            expirationDate: '',
            pagesCount: 0
        },
        apiConnected: false,
        wsConnected: false,
        wsConnecting: false,
        wsReconnectAttempts: 0,
        notification: { show: false, type: '', title: '', message: '' },
        showAdvancedCrawlerOptions: false,
        
        // Additional legacy properties for template compatibility
                    activeTab: 'projects',  // Always start with Projects tab
        // All properties now initialized via comprehensive defaults object above
        
        // ===== LIFECYCLE METHODS =====
        
        // Alpine.js automatically calls this when the component initializes
        init() {
            // 🛡️ Prevent double initialization
            if (this._initialized) {
                console.warn('⚠️ Dashboard init() called twice, skipping');
                return;
            }
            this._initialized = true;
            
            console.log('✅ Dashboard initialized');
            
            // Immediately ensure nested objects are protected
            this.ensureNestedObjects();
            this.syncLegacyState();
            
            // Set up periodic protection against timing issues
            this.setupNestedObjectProtection();
            
            this.checkAuthentication();
            this.checkApiConnection();
        },
        
        setupNestedObjectProtection() {
            // Protect against timing issues by periodically checking nested objects
            setInterval(() => {
                this.ensureNestedObjects();
            }, 1000); // Check every second
            
            // Also protect against component loading that might reset objects
            const observer = new MutationObserver(() => {
                this.ensureNestedObjects();
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        async initAsync() {
            await this.loadInitialData();
        },

        syncLegacyState() {
            // Keep legacy flat properties in sync with organized state
            // This ensures all Alpine.js template bindings work correctly
            Object.keys(this).forEach(key => {
                if (key in this.ui) this[key] = this.ui[key];
                if (key in this.auth) this[key] = this.auth[key];
                if (key in this.data) this[key] = this.data[key];
                if (key in this.forms) this[key] = this.forms[key];
                if (key in this.ws && key === 'connected') this.apiConnected = this.ws[key];
            });
            
            // Explicitly sync WebSocket state for templates
            this.wsConnected = this.ws.connected || false;
            this.wsConnecting = this.ws.connecting || false;
            
            // Explicitly sync critical auth properties for template compatibility
            this.isAuthenticated = this.auth.isAuthenticated || false;
            this.user = this.auth.user || null;
            this.token = this.auth.token || null;
            this.showLogin = this.ui.modals.showLogin || false;
            this.showProfile = this.ui.modals.showProfile || false;
            this.showChangePassword = this.ui.modals.showChangePassword || false;
            this.showSessions = this.ui.modals.showSessions || false;
            this.showAddAuthConfigModal = this.ui.modals.showAddAuthConfigModal || false;
            this.showEditAuthConfigModal = this.ui.modals.showEditAuthConfigModal || false;
            this.showCreateCrawler = this.ui.modals.showCreateCrawler || false;
            this.showCrawlerPagesModal = this.ui.modals.showCrawlerPagesModal || false;
            
            // Sync authentication data arrays
            this.authConfigs = this.data.authConfigs || [];
            this.projectAuthConfigs = this.data.projectAuthConfigs || [];
            this.selectedAuthProject = this.data.selectedAuthProject || null;
            
            // Sync project selection for application-wide access
            this.selectedProject = this.data.selectedProject || null;
            this.currentProject = this.getSelectedProject(); // Always keep object reference updated
            this.projects = this.data.projects || [];
            
            // Sync project-specific data arrays
            this.discoveries = this.data.discoveries || [];
            this.testSessions = this.data.testSessions || [];
            this.webCrawlers = this.data.webCrawlers || [];
            
            // Sync config object for API calls
            this.config = this.config || { apiBaseUrl: 'http://localhost:3001', tokenRefreshInterval: null };
            
            // Critical: Ensure nested objects remain properly initialized
            this.ensureNestedObjects();
        },
        
        ensureNestedObjects() {
            // Fix for timing issues - ensure critical nested objects are always properly initialized
            if (!this.newCrawler || typeof this.newCrawler !== 'object') {
                this.newCrawler = {};
            }
            
            if (!this.newCrawler.saml_config || typeof this.newCrawler.saml_config !== 'object') {
                this.newCrawler.saml_config = {
                    idp_domain: '',
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    login_page: '',
                    success_url: '',
                    timeout_ms: 30000
                };
            }
            
            if (!this.newCrawler.auth_credentials || typeof this.newCrawler.auth_credentials !== 'object') {
                this.newCrawler.auth_credentials = {
                    username: '',
                    password: '',
                    domain: '',
                    additional_fields: {}
                };
            }
            
            if (!this.newCrawler.auth_workflow || typeof this.newCrawler.auth_workflow !== 'object') {
                this.newCrawler.auth_workflow = {
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    success_indicators: [],
                    additional_steps: []
                };
            }
            
            // Ensure authSetup nested objects are also protected
            if (!this.authSetup || typeof this.authSetup !== 'object') {
                this.authSetup = {
                    step: null,
                    type: null,
                    sso: { url: '', loginPage: '', successUrl: '', name: '' },
                    basic: { url: '', loginPage: '', username: '', password: '', name: '' },
                    advanced: { type: 'api_key', url: '', apiKey: '', token: '', name: '' }
                };
            }
            
            if (!this.authSetup.sso) this.authSetup.sso = { url: '', loginPage: '', successUrl: '', name: '' };
            if (!this.authSetup.basic) this.authSetup.basic = { url: '', loginPage: '', username: '', password: '', name: '' };
            if (!this.authSetup.advanced) this.authSetup.advanced = { type: 'api_key', url: '', apiKey: '', token: '', name: '' };
        },

        destroy() {
            this.disconnectWebSocket();
            this.cleanupTokenRefreshTimer();
        },
        
        // ===== COMPUTED PROPERTIES =====
        
        get filteredUrls() {
            return this.availableUrls.filter(url => 
                url.url.toLowerCase().includes(this.urlSearch.toLowerCase())
            );
        },

        get selectedUrls() {
            return this.availableUrls.filter(url => url.selected);
        },

        get currentProject() {
            return this.projects.find(p => p.id === this.selectedProject);
        },
        
        // ===== MISSING HELPER METHODS =====
        
        getSelectedProjectInfo() {
            const project = this.getSelectedProject();
            return project ? `${project.name} (${project.primary_url})` : 'No project selected';
        },
        
        getSelectedPagesCount() {
            return this.discoveredPages.filter(page => page.selected).length;
        },

        hasWebCrawlerData() {
            // Check if current project has web crawler data available
            return this.data.selectedProject && 
                   this.data.webCrawlers && 
                   this.data.webCrawlers.length > 0 &&
                   this.data.webCrawlers.some(crawler => crawler.status === 'completed');
        },
        
        getProjectAuthConfigs(projectId) {
            return this.authConfigs.filter(config => config.project_id === projectId);
        },
        
        getProjectAuthStatus(projectId) {
            const configs = this.getProjectAuthConfigs(projectId);
            return configs.length > 0 ? 'configured' : 'not-configured';
        },
        
        // REMOVED: Duplicate method - using complete version at line 1887
        
        // ===== SESSION AND CAPTURE METHODS =====
        
        captureNewSession() {
            console.log('🔍 DEBUG: captureNewSession called');
            this.sessionCapturing = true;
            this.syncLegacyState();
            
            // Simulate session capture process
            setTimeout(() => {
                this.sessionCapturing = false;
                this.syncLegacyState();
                this.showNotification('success', 'Session Captured', 'Browser session captured successfully');
            }, 2000);
        },
        
        testSessionAccess() {
            this.sessionTesting = true;
            this.syncLegacyState();
            // Placeholder - implement session testing logic
            setTimeout(() => {
                this.sessionTesting = false;
                this.syncLegacyState();
                this.showNotification('info', 'Session Tested', 'Session access verified');
            }, 1500);
        },
        
        // ===== DISCOVERY METHODS =====
        
        startNewDiscovery() {
            if (!this.selectedProject || this.discoveryInProgress) return;
            
            this.discoveryInProgress = true;
            this.discoveryProgress = {
                percentage: 0,
                message: 'Starting discovery...',
                pagesFound: 0,
                currentUrl: ''
            };
            this.syncLegacyState();
            
            // Placeholder - implement discovery logic
            setTimeout(() => {
                this.discoveryInProgress = false;
                this.syncLegacyState();
                this.showNotification('success', 'Discovery Complete', 'Site discovery completed successfully');
            }, 3000);
        },
        
        // ===== MODAL MANAGEMENT METHODS =====
        
        // REMOVED: Duplicate method - using complete async version at line 1925
        
        closeCrawlerPagesModal() {
            this.ui.modals.showCrawlerPagesModal = false;
            this.selectedCrawlerForPages = null;
            this.crawlerPages = [];
            this.filteredCrawlerPages = [];
            this.crawlerPageSearch = '';
            this.crawlerPageFilter = '';
            this.syncLegacyState();
        },
        
        viewDiscoveredPages(discovery) {
            this.selectedDiscovery = discovery;
            this.showDiscoveredPagesModal = true;
            this.syncLegacyState();
        },
        
        closeDiscoveredPagesModal() {
            this.showDiscoveredPagesModal = false;
            this.selectedDiscovery = null;
            this.syncLegacyState();
        },
        
        toggleManualUrlForm() {
            this.showManualUrlForm = !this.showManualUrlForm;
            this.syncLegacyState();
        },
        
        // ===== PAGE SELECTION METHODS =====
        
        selectAllPages() {
            this.discoveredPages.forEach(page => page.selected = true);
            this.syncLegacyState();
        },
        
        deselectAllPages() {
            this.discoveredPages.forEach(page => page.selected = false);
            this.syncLegacyState();
        },
        
        // ===== AUTHENTICATION METHODS =====
        
        async checkAuthentication() {
            const token = localStorage.getItem('auth_token');
            const refreshToken = localStorage.getItem('refresh_token');
            
            if (!token) {
                this.auth.isAuthenticated = false;
                this.ui.modals.showLogin = true;
                // Set legacy state too
                this.isAuthenticated = false;
                this.showLogin = true;
                return;
            }
            
            this.auth.token = token;
            this.auth.refreshToken = refreshToken;
            this.token = token; // Set legacy property
            
            try {
                // Validate token with the session-info endpoint that requires authentication
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/session-info`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.auth.isAuthenticated = true;
                    this.auth.user = data.user;
                    this.ui.modals.showLogin = false;
                    
                    // Set legacy state
                    this.isAuthenticated = true;
                    this.user = data.user;
                    this.showLogin = false;
                    
                    // Initialize profile form
                    this.profileForm.full_name = data.user.full_name || '';
                    this.profileForm.email = data.user.email || '';
                    
                    this.startTokenRefreshTimer();
                    this.initializeWebSocket();
                    await this.loadInitialData();
                    this.syncLegacyState(); // Sync legacy state
                } else if (response.status === 401 && refreshToken) {
                    // Try to refresh token
                    await this.refreshToken();
                } else {
                    this.clearAuth();
                }
            } catch (error) {
                console.error('Authentication check failed:', error);
                this.clearAuth();
                this.ui.modals.showLogin = true;
                this.showLogin = true;
            }
        },
        
        async refreshToken() {
            if (!this.auth.refreshToken) {
                this.clearAuth();
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        refresh_token: this.auth.refreshToken 
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.auth.token = data.token || data.access_token;
                    this.auth.refreshToken = data.refresh_token;
                    
                    localStorage.setItem('auth_token', data.token || data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    
                    this.auth.isAuthenticated = true;
                    this.startTokenRefreshTimer();
                    
                    console.log('Token refreshed successfully');
                } else {
                    this.clearAuth();
                    this.ui.modals.showLogin = true;
                }
            } catch (error) {
                console.error('Token refresh failed:', error);
                this.clearAuth();
                this.ui.modals.showLogin = true;
            }
        },
        
        startTokenRefreshTimer() {
            this.cleanupTokenRefreshTimer();
            
            // Refresh token every 30 minutes
            this.auth.tokenRefreshTimer = setInterval(() => {
                this.refreshToken();
            }, 30 * 60 * 1000);
        },
        
        cleanupTokenRefreshTimer() {
            if (this.auth.tokenRefreshTimer) {
                clearInterval(this.auth.tokenRefreshTimer);
                this.auth.tokenRefreshTimer = null;
            }
        },
        
        clearAuth() {
            this.cleanupTokenRefreshTimer();
            this.disconnectWebSocket();
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            
            // Clear organized state
            this.auth.isAuthenticated = false;
            this.auth.user = null;
            this.auth.token = null;
            this.auth.refreshToken = null;
            this.ui.modals.showLogin = true;
            
            // Clear legacy state for template compatibility
            this.isAuthenticated = false;
            this.user = null;
            this.token = null;
            this.showLogin = true;
        },
        
        async login() {
            this.loginError = '';
            this.loading = true;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.loginForm)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Set organized state first
                    this.auth.token = data.token;
                    this.auth.user = data.user;
                    this.auth.isAuthenticated = true;
                    this.ui.modals.showLogin = false;
                    
                    // Set legacy state for template compatibility
                    this.token = data.token;
                    this.user = data.user;
                    this.isAuthenticated = true;
                    this.showLogin = false;
                    
                    // Store token in localStorage
                    localStorage.setItem('auth_token', data.token);
                    
                    // Initialize profile form
                    this.profileForm.full_name = data.user.full_name || '';
                    this.profileForm.email = data.user.email || '';
                    
                    // Clear form
                    this.loginForm.username = '';
                    this.loginForm.password = '';
                    
                    this.showNotification('success', 'Welcome Back', `Welcome back, ${data.user.full_name || data.user.username}!`);
                    
                    // ALWAYS GO TO PROJECTS TAB AFTER LOGIN
                    this.activeTab = 'projects';
                    
                    // Initialize WebSocket and load data
                    this.initializeWebSocket();
                    await this.loadInitialData();
                } else {
                    this.loginError = data.error || 'Login failed';
                }
            } catch (error) {
                console.error('Login error:', error);
                this.loginError = 'Network error occurred';
            } finally {
                this.loading = false;
            }
        },
        
        logout() {
            this.clearAuth();
            // clearAuth already sets showLogin = true, but let's be explicit
            this.showNotification('info', 'Logged Out', 'You have been logged out');
        },
        
        getAuthHeaders() {
            const headers = { 'Content-Type': 'application/json' };
            if (this.auth.token) {
                headers['Authorization'] = `Bearer ${this.auth.token}`;
            }
            return headers;
        },

        // API Helper Function (from stable backup)
        async apiCall(endpoint, options = {}) {
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                
                // Add auth token if available
                if (this.token || this.auth.token) {
                    headers['Authorization'] = `Bearer ${this.token || this.auth.token}`;
                }
                
                const finalUrl = `${this.config.apiBaseUrl}/api${endpoint}`;
                
                const response = await fetch(finalUrl, {
                    headers,
                    ...options
                });
                
                // Handle auth errors
                if (response.status === 401) {
                    this.handleAuthError();
                    throw new Error('Authentication required');
                }
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error(`API Call Failed [${endpoint}]:`, error);
                if (error.message !== 'Authentication required') {
                    this.showNotification('error', 'API Error', 'API call failed: ' + error.message);
                }
                throw error;
            }
        },

        handleAuthError() {
            console.log('Authentication error - clearing auth state');
            this.clearAuth();
            this.showLogin = true;
            this.ui.modals.showLogin = true;
        },
        
        // ===== API CONNECTION =====
        
        async checkApiConnection() {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/health`);
                if (response.ok) {
                    this.apiConnected = true;
                    console.log('API connection successful');
                } else {
                    this.apiConnected = false;
                    console.warn('API connection failed');
                }
            } catch (error) {
                this.apiConnected = false;
                console.error('API connection error:', error);
            }
        },
        
        // ===== WEBSOCKET MANAGEMENT =====
        
        initializeWebSocket() {
            if (!this.auth.isAuthenticated || this.ws.socket || this.ws.connecting) {
                return;
            }
            
            this.ws.connecting = true;
            
            try {
                this.ws.socket = io(this.config.apiBaseUrl, {
                    auth: { token: this.auth.token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000
                });
                
                this.setupWebSocketHandlers();
            } catch (error) {
                console.error('WebSocket initialization failed:', error);
                this.ws.connecting = false;
            }
        },
        
        setupWebSocketHandlers() {
            if (!this.ws.socket) return;
            
            this.ws.socket.on('connect', () => {
                console.log('✅ WebSocket connected');
                this.ws.connected = true;
                this.ws.connecting = false;
                this.ws.reconnectAttempts = 0;
                this.syncLegacyState(); // Sync WebSocket state to templates
                
                if (this.data.selectedProject) {
                    // Ensure we pass only the project ID (string) not the object
                    const projectId = typeof this.data.selectedProject === 'string' 
                        ? this.data.selectedProject 
                        : this.data.selectedProject.id || this.data.selectedProject;
                        
                    console.log('🔗 Joining WebSocket room for project:', projectId);
                    this.ws.socket.emit('join_project', { 
                        projectId: projectId
                    });
                }
            });
            
            this.ws.socket.on('disconnect', () => {
                console.log('❌ WebSocket disconnected');
                this.ws.connected = false;
                this.ws.connecting = false;
                this.syncLegacyState(); // Sync WebSocket state to templates
            });
            
            this.ws.socket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error);
                this.ws.connected = false;
                this.ws.connecting = false;
            });
            
            this.ws.socket.on('crawler_progress', (data) => {
                console.log('📡 WebSocket: crawler_progress event received');
                this.handleCrawlerProgress(data);
            });
            
            this.ws.socket.on('crawler_completed', (data) => {
                console.log('📡 WebSocket: crawler_completed event received');
                this.handleCrawlerCompleted(data);
            });
            
            this.ws.socket.on('crawler_error', (data) => {
                console.log('📡 WebSocket: crawler_error event received');
                this.handleCrawlerError(data);
            });
            
            this.ws.socket.on('crawler_stopped', (data) => {
                console.log('📡 WebSocket: crawler_stopped event received');
                this.handleCrawlerStopped(data);
            });
            
            this.ws.socket.on('notification', (data) => {
                console.log('📡 WebSocket: notification event received');
                this.showNotification(data.level, data.title, data.message);
            });
            
            // Add a generic event listener to catch all events for debugging
            this.ws.socket.onAny((eventName, ...args) => {
                console.log(`📡 WebSocket: Event "${eventName}" received with data:`, args);
                
                // For crawler events, show additional debugging
                if (eventName.startsWith('crawler_')) {
                    console.log('🔍 WebSocket DEBUG: Crawler event details:', {
                        event: eventName,
                        selectedProject: this.data.selectedProject,
                        webCrawlersCount: this.data.webCrawlers.length,
                        crawlerInProgress: this.crawlerInProgress,
                        crawlerProgress: this.crawlerProgress
                    });
                }
            });
        },
        
        disconnectWebSocket() {
            if (this.ws.socket) {
                this.ws.socket.disconnect();
                this.ws.socket = null;
                this.ws.connected = false;
                this.wsConnected = false; // Legacy sync
            }
        },
        
        handleCrawlerProgress(data) {
            console.log('🔄 Crawler progress received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            
            console.log('🔍 DEBUG: Processing crawler progress:', {
                crawlerId: crawlerId,
                pagesFound: crawlerRun.pages_found || crawlerRun.pagesFound,
                pagesCrawled: crawlerRun.pages_crawled,
                status: crawlerRun.status,
                currentUrl: crawlerRun.current_url || crawlerRun.currentUrl
            });
            
            // Update crawler status in the list
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = crawlerRun.status || 'running';
                crawler.total_pages_found = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
                crawler.pages_for_testing = crawlerRun.pages_found || crawlerRun.pagesFound || 0; // Default all pages for testing
                
                console.log('✅ Updated crawler in list:', {
                    name: crawler.name,
                    status: crawler.status,
                    totalPages: crawler.total_pages_found
                });
            } else {
                console.warn('❌ Could not find crawler with ID:', crawlerId);
                console.log('Available crawler IDs:', this.data.webCrawlers.map(c => c.id));
            }
            
            // Update progress indicator
            this.crawlerInProgress = true;
            const pagesFound = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
            const currentUrl = crawlerRun.current_url || crawlerRun.currentUrl || '';
            
            this.crawlerProgress = {
                percentage: Math.min(100, (pagesFound / (crawlerRun.maxPages || 50)) * 100),
                message: `Crawling ${crawler?.name || 'site'}... Found ${pagesFound} pages`,
                pagesFound: pagesFound,
                currentUrl: currentUrl
            };
            
            this.syncLegacyState();
            
            console.log('🔍 DEBUG: Updated progress indicator:', {
                crawlerName: crawler?.name,
                pagesFound: pagesFound,
                progressPercentage: this.crawlerProgress.percentage,
                crawlerInProgress: this.crawlerInProgress
            });
        },
        
        handleCrawlerCompleted(data) {
            console.log('✅ Crawler completed received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            const finalPageCount = crawlerRun.pages_found || crawlerRun.totalPages || crawlerRun.pagesFound || 0;
            
            console.log('🔍 DEBUG: Processing crawler completion:', {
                crawlerId: crawlerId,
                finalPageCount: finalPageCount,
                status: crawlerRun.status
            });
            
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = 'completed';
                crawler.total_pages_found = finalPageCount;
                crawler.pages_for_testing = finalPageCount; // Default all pages for testing
                
                console.log('✅ Updated completed crawler:', {
                    name: crawler.name,
                    status: crawler.status,
                    finalPageCount: finalPageCount
                });
            } else {
                console.warn('❌ Could not find crawler with ID for completion:', crawlerId);
                console.log('Available crawler IDs:', this.data.webCrawlers.map(c => c.id));
            }
            
            // Clear progress indicator
            this.crawlerInProgress = false;
            this.crawlerProgress = {
                percentage: 100,
                message: 'Crawling completed',
                pagesFound: finalPageCount,
                currentUrl: ''
            };
            
            this.syncLegacyState();
            this.loadWebCrawlers(); // Refresh the list with force refresh
            this.showNotification('success', 'Crawler Completed', 
                `Found ${finalPageCount} pages`);
                
            console.log('🔍 DEBUG: Crawler completion processed:', {
                crawlerName: crawler?.name,
                finalPageCount: finalPageCount,
                status: crawler?.status,
                progressCleared: !this.crawlerInProgress
            });
        },
        
        handleCrawlerError(data) {
            console.error('❌ Crawler error received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            const pagesFound = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
            
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = 'failed';
                crawler.total_pages_found = pagesFound;
                crawler.pages_for_testing = pagesFound;
                
                console.log('❌ Updated failed crawler:', {
                    name: crawler.name,
                    status: crawler.status,
                    pagesFound: pagesFound
                });
            }
            
            // Clear progress indicator
            this.crawlerInProgress = false;
            this.crawlerProgress = {
                percentage: 0,
                message: 'Crawling failed',
                pagesFound: pagesFound,
                currentUrl: ''
            };
            
            this.syncLegacyState();
            this.showNotification('error', 'Crawler Failed', 
                data.message || crawlerRun.error || 'Crawler encountered an error');
                
            console.log('🔍 DEBUG: Crawler error processed:', {
                crawlerName: crawler?.name,
                error: data.message || crawlerRun.error,
                pagesFound: pagesFound
            });
        },
        
        handleCrawlerStopped(data) {
            console.log('⏹️ Crawler stopped received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            const pagesFound = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
            
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = 'stopped';
                crawler.total_pages_found = pagesFound;
                crawler.pages_for_testing = pagesFound;
                
                console.log('⏹️ Updated stopped crawler:', {
                    name: crawler.name,
                    status: crawler.status,
                    pagesFound: pagesFound
                });
            }
            
            // Clear progress indicator
            this.crawlerInProgress = false;
            this.crawlerProgress = {
                percentage: 0,
                message: 'Crawling stopped',
                pagesFound: pagesFound,
                currentUrl: ''
            };
            
            this.syncLegacyState();
            this.showNotification('warning', 'Crawler Stopped', 
                `Crawling stopped. Found ${pagesFound} pages`);
                
            console.log('🔍 DEBUG: Crawler stopped processed:', {
                crawlerName: crawler?.name,
                pagesFound: pagesFound,
                reason: data.reason || crawlerRun.reason
            });
        },
        
        // ===== DATA LOADING =====
        
        async loadInitialData() {
            await Promise.all([
                this.loadProjects(),
                this.loadAuthConfigs(),
                this.loadSessionInfo()  // Load existing session info
            ]);
            
            // Restore previously selected project from localStorage
            this.restoreSelectedProject();
        },
        
        restoreSelectedProject() {
            const savedProjectId = localStorage.getItem('selectedProjectId');
            if (savedProjectId && this.data.projects.length > 0) {
                const project = this.data.projects.find(p => p.id === savedProjectId);
                if (project) {
                    console.log('🔄 Restoring previously selected project:', project.name);
                    this.selectProject(savedProjectId);
                } else {
                    // Clean up invalid saved project ID
                    localStorage.removeItem('selectedProjectId');
                }
            }
        },
        
        async loadProjects() {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.data.projects = result.data || result;
                    this.projects = this.data.projects; // Legacy sync
                } else {
                    console.error('Failed to load projects:', response.status);
                }
            } catch (error) {
                console.error('Error loading projects:', error);
            }
        },
        

        
        async loadWebCrawlers() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(
                    `${this.config.apiBaseUrl}/api/web-crawlers/projects/${this.data.selectedProject}/crawlers`,
                    { headers: this.getAuthHeaders() }
                );
                
                if (response.ok) {
                    const result = await response.json();
                    this.data.webCrawlers = result.success ? result.data : [];
                    this.webCrawlers = this.data.webCrawlers; // Legacy sync
                    
                    // Force refresh page counts to get accurate data from database
                    this.loadCrawlerPageCounts(true);
                } else {
                    console.error('Failed to load web crawlers:', response.status);
                    this.data.webCrawlers = [];
                    this.webCrawlers = [];
                }
            } catch (error) {
                console.error('Error loading web crawlers:', error);
                this.data.webCrawlers = [];
                this.webCrawlers = [];
            }
        },

        async loadCrawlerPageCounts(forceRefresh = false) {
            console.log('🔍 DEBUG: Loading page counts for crawlers...', forceRefresh ? '(FORCE REFRESH)' : '');
            
            for (const crawler of this.webCrawlers) {
                // Only skip if force refresh is false and page count already exists
                if (!forceRefresh && crawler.total_pages_found && crawler.total_pages_found > 0) {
                    console.log(`🔍 DEBUG: Crawler ${crawler.name} already has ${crawler.total_pages_found} pages (skipping)`);
                    continue;
                }
                
                try {
                    console.log(`🔍 DEBUG: Fetching page count for crawler ${crawler.name}...`);
                    const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/pages?limit=1000`, {
                        headers: this.getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const pages = data.pages || data.data || [];
                        const totalCount = data.pagination?.total || pages.length;
                        
                        // Update the crawler with page counts from pagination (more accurate)
                        crawler.total_pages_found = totalCount;
                        crawler.pages_for_testing = pages.filter(p => 
                            p.selected_for_manual_testing || p.selected_for_automated_testing
                        ).length || totalCount; // Default to all pages if none selected
                        
                        console.log(`🔍 DEBUG: Updated ${crawler.name}: ${crawler.total_pages_found} total, ${crawler.pages_for_testing} for testing`);
                        console.log(`🔍 DEBUG: API returned ${pages.length} pages, pagination says ${totalCount} total`);
                    } else {
                        console.warn(`Failed to load pages for crawler ${crawler.name}:`, response.status);
                    }
                } catch (error) {
                    console.error(`Error loading pages for crawler ${crawler.name}:`, error);
                }
            }
            
            // Sync the updated data
            this.syncLegacyState();
            console.log('🔍 DEBUG: Finished loading page counts');
        },
        
        // ===== PROJECT METHODS =====
        
        getSelectedProject() {
            if (!this.data.selectedProject) return null;
            return this.data.projects.find(p => p.id === this.data.selectedProject) || null;
        },
        
        // PROJECT SELECTION - Unified method for consistent state management
        selectProject(projectOrId) {
            // Handle both project object and project ID
            const projectId = typeof projectOrId === 'string' ? projectOrId : projectOrId?.id;
            const projectObj = typeof projectOrId === 'object' ? projectOrId : this.projects.find(p => p.id === projectId);
            
            if (!projectId || !projectObj) {
                console.warn('Invalid project selection:', projectOrId);
                return;
            }
            
            // Store ID in organized state (consistent approach)
            this.data.selectedProject = projectId;
            
            // Sync to legacy state for template compatibility
            this.selectedProject = projectId;
            this.currentProject = projectObj; // For easy object access
            
            console.log(`📂 Selected project: ${projectObj.name} (${projectId})`);
            
            // Join WebSocket room for this project
            if (this.ws.socket && this.ws.connected) {
                this.ws.socket.emit('join_project', { projectId });
            }
            
            // Load project-specific data for all tabs
            this.loadProjectData();
            
            // Sync legacy state to ensure all tabs can access selected project
            this.syncLegacyState();
            
            // Store selection in localStorage for persistence
            localStorage.setItem('selectedProjectId', projectId);
        },
        
        async createProject() {
            try {
                this.loading = true;
                
                // Normalize the URL by adding protocol if missing
                let normalizedUrl = this.newProject.primary_url.trim();
                if (normalizedUrl && !normalizedUrl.match(/^https?:\/\//)) {
                    // Default to HTTPS for security
                    normalizedUrl = `https://${normalizedUrl}`;
                }
                
                // Create project data with normalized URL
                const projectData = {
                    ...this.newProject,
                    primary_url: normalizedUrl
                };
                
                const data = await this.apiCall('/projects', {
                    method: 'POST',
                    body: JSON.stringify(projectData)
                });
                
                this.projects.push(data.data);
                this.showCreateProject = false;
                this.resetNewProject();
                this.showNotification('success', 'Success', 'Project created successfully!');
            } catch (error) {
                console.error('Failed to create project:', error);
                this.showNotification('error', 'Error', error.message || 'Failed to create project');
            } finally {
                this.loading = false;
            }
        },

        clearProjectSelection() {
            // Clear all project selection state
            this.data.selectedProject = null;
            this.selectedProject = null;
            this.currentProject = null;
            
            // Clear project-specific data
            this.data.webCrawlers = [];
            this.data.discoveries = [];
            this.data.testSessions = [];
            this.data.projectAuthConfigs = [];
            
            // Sync to legacy state
            this.webCrawlers = [];
            this.discoveries = [];
            this.testSessions = [];
            this.projectAuthConfigs = [];
            
            // Clear localStorage
            localStorage.removeItem('selectedProjectId');
            
            // Sync legacy state
            this.syncLegacyState();
            
            console.log('🗑️ Cleared project selection');
        },
        
        // UNIFIED PROJECT DATA LOADING - Called when project is selected
        async loadProjectData() {
            if (!this.data.selectedProject) return;
            
            try {
                // Load all project-specific data in parallel for better performance
                await Promise.all([
                    this.loadWebCrawlers(),           // For Web Crawler tab
                    this.loadProjectDiscoveries(),    // For Discovery tab
                    this.loadProjectTestSessions(),   // For Testing Sessions tab
                    this.loadProjectAuthConfigs()     // For Authentication tab
                ]);
                
                // Load additional data that might depend on the above
            this.loadSelectedDiscoveries();
                
                console.log(`✅ Loaded all data for project: ${this.getSelectedProject()?.name}`);
            } catch (error) {
                console.error('Error loading project data:', error);
                this.showNotification('error', 'Error', 'Failed to load some project data');
            }
        },

        editProject(project) {
            this.showNotification('info', 'Coming Soon', 'Edit project feature coming soon!');
        },

        deleteProject(project) {
            this.projectToDelete = project;
            this.showDeleteProject = true;
        },

        async confirmDeleteProject() {
            if (!this.projectToDelete) return;
            
            try {
                this.loading = true;
                await this.apiCall(`/projects/${this.projectToDelete.id}`, {
                    method: 'DELETE'
                });
                
                // Remove from projects list
                this.data.projects = this.data.projects.filter(p => p.id !== this.projectToDelete.id);
                this.projects = this.data.projects; // Sync legacy state
                
                // Clear selection if the deleted project was selected
                if (this.data.selectedProject === this.projectToDelete.id) {
                    this.clearProjectSelection();
                }
                
                this.showDeleteProject = false;
                this.projectToDelete = null;
                this.showNotification('success', 'Success', 'Project deleted successfully!');
                
            } catch (error) {
                console.error('Failed to delete project:', error);
                this.showNotification('error', 'Error', 'Failed to delete project. Please try again.');
            } finally {
                this.loading = false;
            }
        },

        resetNewProject() {
            this.newProject = {
                name: '',
                description: '',
                primary_url: '',
                compliance_standard: 'wcag_2_1_aa'
            };
        },

        getStatusBadgeClass(status) {
            const classes = {
                'active': 'bg-green-100 text-green-800',
                'planning': 'bg-blue-100 text-blue-800',
                'in_progress': 'bg-yellow-100 text-yellow-800',
                'paused': 'bg-orange-100 text-orange-800',
                'completed': 'bg-green-100 text-green-800',
                'cancelled': 'bg-gray-100 text-gray-800',
                'failed': 'bg-red-100 text-red-800',
                'pending': 'bg-gray-100 text-gray-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        resetProjectForm() {
            this.resetNewProject();
        },

        // ===== CRAWLER METHODS =====
        
        async createCrawler() {
            try {
                const crawlerData = {
                    ...this.newCrawler,
                    project_id: this.data.selectedProject
                };
                
                // Fix base_url format - add https:// if protocol is missing
                if (crawlerData.base_url && !crawlerData.base_url.match(/^https?:\/\//)) {
                    crawlerData.base_url = `https://${crawlerData.base_url}`;
                }
                
                console.log('🔍 DEBUG: Creating crawler with data:', JSON.stringify(crawlerData, null, 2));
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/projects/${this.data.selectedProject}/crawlers`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(crawlerData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Crawler Created', 'New crawler created successfully');
                    this.showCreateCrawler = false;
                    this.resetCrawlerForm();
                    this.loadWebCrawlers();
                } else {
                    const error = await response.json();
                    console.log('🚨 DEBUG: Backend error response:', error);
                    this.showNotification('error', 'Creation Failed', error.message || error.error || 'Failed to create crawler');
                }
            } catch (error) {
                console.error('Error creating crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to create crawler');
            }
        },

        async startCrawler(crawler) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/start`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    crawler.status = 'running';
                    
                    // Set progress tracking
                    this.crawlerInProgress = true;
                    this.crawlerProgress = {
                        percentage: 0,
                        message: `Starting ${crawler.name}...`,
                        pagesFound: 0,
                        currentUrl: crawler.base_url || ''
                    };
                    
                    this.syncLegacyState();
                    this.showNotification('success', 'Crawler Started', `Started crawling ${crawler.name}`);
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Start Failed', error.message || 'Failed to start crawler');
                }
            } catch (error) {
                console.error('Error starting crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to start crawler');
            }
        },

        async deleteCrawler(crawlerId) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawlerId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.loadWebCrawlers();
                    this.showNotification('success', 'Crawler Deleted', 'Crawler deleted successfully');
                } else {
                    this.showNotification('error', 'Delete Failed', 'Failed to delete crawler');
                }
            } catch (error) {
                console.error('Error deleting crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to delete crawler');
            }
        },

        resetCrawlerForm() {
            this.newCrawler = {
                name: '',
                description: '',
                base_url: '',
                auth_type: 'none',
                max_depth: 3,
                max_pages: 100,
                follow_external: false,
                respect_robots: true,
                concurrent_pages: 5,
                delay_ms: 1000,
                browser_type: 'chromium',
                request_delay_ms: 2000,
                session_persistence: false,
                respect_robots_txt: false,
                saml_config: {
                    idp_domain: '',
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    login_page: '',
                    success_url: '',
                    timeout_ms: 30000
                },
                auth_credentials: {
                    username: '',
                    password: '',
                    domain: '',
                    additional_fields: {}
                },
                auth_workflow: {
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    success_indicators: [],
                    additional_steps: []
                }
            };
        },

        getCrawlerStatusColor(status) {
            const colors = {
                'pending': 'bg-gray-100 text-gray-700',
                'running': 'bg-yellow-100 text-yellow-700',
                'completed': 'bg-green-100 text-green-700',
                'failed': 'bg-red-100 text-red-700'
            };
            return colors[status] || 'bg-gray-100 text-gray-700';
        },

        toggleAdvancedCrawlerOptions() {
            this.showAdvancedCrawlerOptions = !this.showAdvancedCrawlerOptions;
        },

        // ===== UI HELPER METHODS =====
        
        setActiveTab(tabName) {
            this.ui.activeTab = tabName;
            this.activeTab = tabName; // Legacy sync
            this.syncLegacyState();
        },

        // Authentication tab loading method (missing method from navigation)
        async loadAuthenticationView() {
            console.log('🔐 Loading Authentication view');
            console.log('🔐 Current selectedProject:', this.data.selectedProject);
            console.log('🔐 Current authConfigs length:', this.authConfigs?.length || 0);
            console.log('🔐 Current projectAuthConfigs length:', this.projectAuthConfigs?.length || 0);
            
            if (this.data.selectedProject) {
                // Auto-select the current project for authentication
                console.log('🔐 Auto-selecting project for auth:', this.data.selectedProject);
                await this.selectAuthProject(this.data.selectedProject);
            } else {
                console.log('🔐 No project selected, cannot load auth configs');
            }
        },

        showNotification(type, title, message) {
            this.notification = {
                show: true,
                type,
                title,
                message
            };
            this.ui.notification = this.notification; // Sync
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideNotification();
            }, 5000);
        },

        hideNotification() {
            this.notification.show = false;
            this.ui.notification.show = false;
        },

        formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        },

        // ===== PROFILE METHODS =====
        
        async updateProfile() {
            this.loading = true;
            
            try {
                const data = await this.apiCall('/auth/profile', {
                    method: 'PUT',
                    body: JSON.stringify(this.profileForm)
                });
                
                this.user = data.user;
                this.auth.user = data.user; // Update organized state too
                this.showProfile = false;
                this.ui.modals.showProfile = false;
                this.showNotification('success', 'Profile Updated', 'Profile updated successfully!');
                
            } catch (error) {
                console.error('Profile update error:', error);
                this.showNotification('error', 'Update Failed', error.message || 'Failed to update profile');
            } finally {
                this.loading = false;
            }
        },

        async changePassword() {
            this.passwordError = '';
            
            if (this.passwordForm.new_password !== this.passwordForm.confirm_password) {
                this.passwordError = 'New passwords do not match';
                return;
            }
            
            if (this.passwordForm.new_password.length < 8) {
                this.passwordError = 'New password must be at least 8 characters long';
                return;
            }
            
            this.loading = true;
            
            try {
                await this.apiCall('/auth/change-password', {
                    method: 'POST',
                    body: JSON.stringify({
                        current_password: this.passwordForm.current_password,
                        new_password: this.passwordForm.new_password
                    })
                });
                
                this.showChangePassword = false;
                this.ui.modals.showChangePassword = false;
                this.passwordForm = { current_password: '', new_password: '', confirm_password: '' };
                this.showNotification('success', 'Password Changed', 'Password changed successfully!');
                
            } catch (error) {
                this.passwordError = error.message || 'Failed to change password';
                console.error('Password change error:', error);
            } finally {
                this.loading = false;
            }
        },

        async loadSessions() {
            try {
                const data = await this.apiCall('/auth/sessions');
                this.sessions = data.sessions || [];
            } catch (error) {
                console.error('Failed to load sessions:', error);
                this.sessions = [];
            }
        },
        
        async revokeSession(sessionId) {
            try {
                await this.apiCall(`/auth/sessions/${sessionId}`, {
                    method: 'DELETE'
                });
                
                this.sessions = this.sessions.filter(s => s.id !== sessionId);
                this.showNotification('success', 'Session Revoked', 'Session revoked successfully');
                
            } catch (error) {
                console.error('Failed to revoke session:', error);
                this.showNotification('error', 'Revoke Failed', 'Failed to revoke session');
            }
        },
        
        async openSessionsModal() {
            this.showSessions = true;
            this.ui.modals.showSessions = true;
            await this.loadSessions();
        },

        refreshSessionInfo() { 
            // Refresh the current session info
            this.checkAuthentication();
        },
        cancelDeleteProject() { this.showDeleteProject = false; this.syncLegacyState(); },
        cancelDeleteDiscovery() { this.showDeleteDiscovery = false; this.syncLegacyState(); },
        cancelDeleteSession() { this.showDeleteSession = false; this.syncLegacyState(); },
        getTotalPagesForTesting() { 
            const selectedCrawlers = this.webCrawlers.filter(c => this.selectedCrawlers.includes(c.id));
            return selectedCrawlers.reduce((total, c) => total + (c.pages_for_testing || 0), 0);
        },
        getExcludedPagesCount() { 
            const selectedCrawlers = this.webCrawlers.filter(c => this.selectedCrawlers.includes(c.id));
            return selectedCrawlers.reduce((total, c) => total + ((c.total_pages_found || 0) - (c.pages_for_testing || 0)), 0);
        },
        getTotalPages() { 
            const selectedCrawlers = this.webCrawlers.filter(c => this.selectedCrawlers.includes(c.id));
            return selectedCrawlers.reduce((total, c) => total + (c.total_pages_found || 0), 0);
        },
        
        // ===== SESSION URL MODAL METHODS =====
        
        openSessionUrlModal() { this.showSessionUrlModal = true; this.syncLegacyState(); },
        closeSessionUrlModal() { this.showSessionUrlModal = false; this.syncLegacyState(); },
        selectAllUrls() { this.availableUrls.forEach(url => url.selected = true); },
        deselectAllUrls() { this.availableUrls.forEach(url => url.selected = false); },
        addManualUrl() { /* TODO: Implement manual URL addition */ },
        saveUrlSelection() { this.closeSessionUrlModal(); },
        
        // ===== CRAWLER SELECTION METHODS =====
        
        selectAllCrawlers() {
            this.selectedCrawlers = this.webCrawlers.map(c => c.id);
            this.syncLegacyState();
        },
        
        deselectAllCrawlers() {
            this.selectedCrawlers = [];
            this.syncLegacyState();
        },
        
        // ===== MODAL METHODS =====
        
        openCreateCrawlerModal(mode = 'basic') {
            console.log('🔍 DEBUG: openCreateCrawlerModal called with mode:', mode);
            this.ui.modals.showCreateCrawler = true;
            this.newCrawler.mode = mode;
            this.syncLegacyState();
            console.log('🔍 DEBUG: After sync - this.showCreateCrawler:', this.showCreateCrawler);
            console.log('🔍 DEBUG: After sync - this.ui.modals.showCreateCrawler:', this.ui.modals.showCreateCrawler);
        },
        
        closeCreateCrawlerModal() {
            this.ui.modals.showCreateCrawler = false;
            this.resetCrawlerForm();
            this.syncLegacyState();
        },

        // ===== DISCOVERY METHODS =====
        
        async startNewDiscovery() {
            if (!this.data.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }
            
            try {
                this.discoveryInProgress = true;
                this.discoveryProgress = {
                    percentage: 0,
                    message: 'Starting discovery...',
                    pagesFound: 0,
                    currentUrl: ''
                };
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/discoveries`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        primary_url: this.getSelectedProject()?.primary_url,
                        max_depth: this.discoveryConfig?.maxDepth || 3,
                        max_pages: this.discoveryConfig?.maxPages || 100,
                        discovery_mode: this.discoveryConfig?.mode || 'standard'
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Discovery Started', 'Site discovery has begun');
                    // Poll for progress updates
                    this.pollDiscoveryProgress(result.discovery_id);
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Discovery Failed', error.message || 'Failed to start discovery');
                    this.discoveryInProgress = false;
                }
            } catch (error) {
                console.error('Error starting discovery:', error);
                this.showNotification('error', 'Network Error', 'Failed to start discovery');
                this.discoveryInProgress = false;
            }
        },

        async pollDiscoveryProgress(discoveryId) {
            const poll = async () => {
                try {
                    const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${discoveryId}/status`, {
                        headers: this.getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const status = await response.json();
                        this.discoveryProgress = {
                            percentage: status.progress || 0,
                            message: status.message || 'Processing...',
                            pagesFound: status.pages_found || 0,
                            currentUrl: status.current_url || ''
                        };
                        
                        if (status.status === 'completed') {
                            this.discoveryInProgress = false;
                            this.showNotification('success', 'Discovery Complete', `Found ${status.pages_found} pages`);
                            this.loadDiscoveries();
                        } else if (status.status === 'failed') {
                            this.discoveryInProgress = false;
                            this.showNotification('error', 'Discovery Failed', status.error || 'Discovery process failed');
                        } else if (status.status === 'running') {
                            setTimeout(poll, 2000); // Poll every 2 seconds
                        }
                    }
                } catch (error) {
                    console.error('Error polling discovery progress:', error);
                    this.discoveryInProgress = false;
                }
            };
            
            poll();
        },

        async loadDiscoveries() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/discoveries`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.discoveries = data.discoveries || [];
                } else {
                    console.error('Failed to load discoveries');
                }
            } catch (error) {
                console.error('Error loading discoveries:', error);
            }
        },

        async viewDiscoveryDetails(discovery) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${discovery.id}/pages`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.discoveredPages = data.pages || [];
                    this.selectedDiscovery = discovery;
                    this.showDiscoveredPagesModal = true;
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load discovery pages');
                }
            } catch (error) {
                console.error('Error loading discovery pages:', error);
                this.showNotification('error', 'Network Error', 'Failed to load discovery pages');
            }
        },

        async deleteDiscovery(discovery) {
            if (!confirm(`Are you sure you want to delete discovery for ${discovery.domain}?`)) {
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${discovery.id}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.discoveries = this.discoveries.filter(d => d.id !== discovery.id);
                    this.showNotification('success', 'Discovery Deleted', 'Discovery has been deleted');
                } else {
                    this.showNotification('error', 'Delete Failed', 'Failed to delete discovery');
                }
            } catch (error) {
                console.error('Error deleting discovery:', error);
                this.showNotification('error', 'Network Error', 'Failed to delete discovery');
            }
        },

        togglePageSelection(page) {
            page.selected = !page.selected;
        },

        selectAllPages() {
            this.discoveredPages.forEach(page => page.selected = true);
        },

        deselectAllPages() {
            this.discoveredPages.forEach(page => page.selected = false);
        },

        async savePageSelections() {
            const selectedPages = this.discoveredPages.filter(page => page.selected);
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${this.selectedDiscovery.id}/pages/selection`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        selected_page_ids: selectedPages.map(p => p.id)
                    })
                });
                
                if (response.ok) {
                    this.showNotification('success', 'Selection Saved', `${selectedPages.length} pages selected for testing`);
                    this.showDiscoveredPagesModal = false;
                } else {
                    this.showNotification('error', 'Save Failed', 'Failed to save page selection');
                }
            } catch (error) {
                console.error('Error saving page selection:', error);
                this.showNotification('error', 'Network Error', 'Failed to save page selection');
            }
        },

        // ===== SESSION MANAGEMENT METHODS =====
        
        async captureNewSession() {
            console.log('🔍 DEBUG: Starting database-based session capture');
            
            // Check for selected project in multiple places due to timing
            let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
            
            if (!projectId) {
                this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }
            
            this.sessionCapturing = true;
            this.sessionAwaitingLogin = false;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/capture`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: projectId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 DEBUG: Session capture started:', result);
                    
                    if (result.needsLogin) {
                        this.sessionAwaitingLogin = true;
                        this.showNotification('info', 'Browser Opened', 
                            `Please log in to the opened browser window for ${result.crawlerName || 'your crawler'}, then click "Successfully Logged In" below`);
                    } else {
                        // Already authenticated, complete capture immediately
                        await this.completeSessionCapture();
                    }
                    
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Capture Failed', error.message || 'Failed to start session capture');
                    this.sessionCapturing = false;
                }
            } catch (error) {
                console.error('Error capturing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to start session capture');
                this.sessionCapturing = false;
            }
        },
        
        async completeSessionCapture() {
            console.log('🔍 DEBUG: Completing database-based session capture');
            
            // Check for selected project in multiple places due to timing
            let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
            
            if (!projectId) {
                this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/complete-capture`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: projectId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Session capture completed:', result);
                    
                    // Reload session info to get the fresh data
                    await this.loadSessionInfo();
                    
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                    
                    this.showNotification('success', 'Session Captured Successfully', 
                        `Session saved to database with ${result.sessionData.cookiesCount} cookies`);
                        
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Capture Failed', error.message || 'Failed to complete session capture');
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                }
            } catch (error) {
                console.error('Error completing session capture:', error);
                this.showNotification('error', 'Network Error', 'Failed to complete session capture');
                this.sessionCapturing = false;
                this.sessionAwaitingLogin = false;
            }
        },
        
        async cancelSessionCapture() {
            console.log('🛑 User cancelled session capture');
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/cancel-capture`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                    this.showNotification('info', 'Session Capture Cancelled', 'Browser window closed and capture process stopped');
                } else {
                    const error = await response.json();
                    console.error('Cancel failed:', error);
                    // Still update UI state even if API call failed
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                    this.showNotification('warning', 'Session Capture Cancelled', 'May need to manually close browser window');
                }
            } catch (error) {
                console.error('Error cancelling session capture:', error);
                // Still update UI state even if API call failed
                this.sessionCapturing = false;
                this.sessionAwaitingLogin = false;
                this.showNotification('warning', 'Session Capture Cancelled', 'May need to manually close browser window');
            }
        },
        
        async loadSessionInfo() {
            try {
                // Check for selected project in multiple places due to timing
                let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
                
                if (!projectId) {
                    console.log('🔍 DEBUG: No project selected (checked all sources), skipping session info load');
                    this.sessionInfo = {
                        isValid: false,
                        status: 'No Project Selected',
                        ageHours: 0,
                        isOld: false,
                        isVeryOld: false,
                        username: '',
                        capturedDate: '',
                        expirationDate: '',
                        pagesCount: 0,
                        lastActivity: null
                    };
                    return;
                }
                
                console.log('🔍 DEBUG: Using project ID for session info:', projectId);
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/info?project_id=${projectId}`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 DEBUG: Session info response from database:', result);
                    
                    if (result.exists && result.metadata) {
                        // Check session age
                        const capturedDate = new Date(result.metadata.capturedDate);
                        const now = new Date();
                        const ageHours = Math.round((now - capturedDate) / (1000 * 60 * 60));
                        const isOld = ageHours > 24; // Sessions older than 24 hours are considered potentially expired
                        const isVeryOld = ageHours > 72; // Sessions older than 72 hours are likely expired
                        
                        let status = 'Session Ready';
                        let isValid = result.metadata.isValid;
                        
                        if (isVeryOld) {
                            status = `⚠️ Session Expired (${ageHours}h old)`;
                            isValid = false;
                        } else if (isOld) {
                            status = `⚠️ Session Old (${ageHours}h old) - May need refresh`;
                            isValid = true; // Still try to use it, but warn user
                        } else if (ageHours < 1) {
                            status = 'Fresh Session - Just Captured';
                        }
                        
                        this.sessionInfo = {
                            isValid: isValid,
                            status: status,
                            ageHours: ageHours,
                            isOld: isOld,
                            isVeryOld: isVeryOld,
                            username: result.metadata.username || 'Unknown',
                            capturedDate: result.metadata.capturedDate || '',
                            expirationDate: result.metadata.expirationDate || 'Unknown',
                            pagesCount: result.metadata.pagesCount || 0,
                            sessionId: result.metadata.sessionId,
                            crawlerName: result.metadata.crawlerName,
                            lastActivity: new Date().toISOString()
                        };
                        
                        // Show warning for old sessions
                        if (isVeryOld) {
                            this.showNotification('warning', 'Session Expired', 
                                `Your browser session is ${ageHours} hours old and likely expired. Please capture a new session.`);
                        } else if (isOld) {
                            this.showNotification('info', 'Session Old', 
                                `Your browser session is ${ageHours} hours old. Consider capturing a fresh session if crawling fails.`);
                        }
                    } else {
                        this.sessionInfo = {
                            isValid: false,
                            status: 'No Session Available',
                            ageHours: 0,
                            isOld: false,
                            isVeryOld: false,
                            username: '',
                            capturedDate: '',
                            expirationDate: '',
                            pagesCount: 0,
                            lastActivity: null
                        };
                    }
                } else {
                    console.error('Failed to load session info from database');
                    const error = await response.json();
                    console.error('Session info error:', error);
                }
            } catch (error) {
                console.error('Error loading session info:', error);
            }
        },

        async testSessionAccess() {
            this.sessionTesting = true;
            
            try {
                // Check for selected project in multiple places due to timing
                let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
                
                if (!projectId) {
                    this.showNotification('error', 'No Project', 'Please select a project first');
                    this.sessionTesting = false;
                    return;
                }
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/test`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: projectId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 DEBUG: Session test response:', result);
                    
                    if (result.success) {
                        this.showNotification('success', 'Session Valid', `Can access ${result.pagesCount} pages`);
                        // Update sessionInfo with fresh data
                        this.sessionInfo.pagesCount = result.pagesCount;
                        this.sessionInfo.isValid = true;
                        this.sessionInfo.status = 'Session Active';
                } else {
                        this.showNotification('error', 'Session Invalid', result.message || 'Session has expired or is invalid');
                    }
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Session Invalid', error.message || 'Session has expired or is invalid');
                }
                
                // Always reload session info after testing to get current state
                await this.loadSessionInfo();
            } catch (error) {
                console.error('Error testing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to test session');
            } finally {
                this.sessionTesting = false;
            }
        },

        async clearSession() {
            try {
                // Check for selected project in multiple places due to timing
                let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
                
                if (!projectId) {
                    this.showNotification('error', 'No Project', 'Please select a project first');
                    return;
                }
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/clear?project_id=${projectId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.sessionInfo = { 
                        isValid: false, 
                        lastActivity: null, 
                        status: 'inactive',
                        username: '',
                        capturedDate: '',
                        expirationDate: '',
                        pagesCount: 0
                    };
                    this.showNotification('success', 'Session Cleared', 'Browser session has been cleared');
                } else {
                    this.showNotification('error', 'Clear Failed', 'Failed to clear session');
                }
            } catch (error) {
                console.error('Error clearing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to clear session');
            }
        },

        // ===== WEB CRAWLER MODAL METHODS =====
        
        async viewCrawlerPages(crawler) {
            try {
                this.loading = true;
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/pages`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.crawlerPages = data.pages || data.data || [];
                    this.selectedCrawlerForPages = crawler;
                    
                    console.log(`📄 Loaded ${this.crawlerPages.length} pages for crawler ${crawler.name}`);
                    console.log('🔍 DEBUG: Raw crawler pages data:', this.crawlerPages.slice(0, 2)); // Show first 2 pages
                    
                    // Load saved page selections for UI checkboxes
                    await this.loadCrawlerPageSelections(crawler.id);
                    
                    this.updateFilteredCrawlerPages();
                    
                    console.log('🔍 DEBUG: Filtered pages count:', this.filteredCrawlerPages.length);
                    console.log('🔍 DEBUG: Opening modal with showCrawlerPagesModal =', true);
                    
                    this.ui.modals.showCrawlerPagesModal = true;
                    this.syncLegacyState();
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load crawler pages');
                }
            } catch (error) {
                console.error('Error loading crawler pages:', error);
                this.showNotification('error', 'Network Error', 'Failed to load crawler pages');
            } finally {
                this.loading = false;
            }
        },

        closeCrawlerPagesModal() {
            this.ui.modals.showCrawlerPagesModal = false;
            this.selectedCrawlerForPages = null;
            this.crawlerPages = [];
            this.filteredCrawlerPages = [];
            this.crawlerPageSearch = '';
            this.crawlerPageFilter = '';
            this.syncLegacyState();
        },

        // Edit an existing crawler
        async editCrawler(crawler) {
            // Populate the form with existing crawler data
            this.newCrawler = {
                ...crawler,
                // Convert JSON objects back to strings for editing
                wait_conditions_json: JSON.stringify(crawler.wait_conditions || [], null, 2),
                extraction_rules_json: JSON.stringify(crawler.extraction_rules || {}, null, 2),
                url_patterns_json: JSON.stringify(crawler.url_patterns || [], null, 2)
            };
            this.showCreateCrawler = true;
        },

        // Update filtered crawler pages based on search and filter
        updateFilteredCrawlerPages() {
            console.log('🔍 DEBUG: updateFilteredCrawlerPages called with crawlerPages.length:', this.crawlerPages.length);
            let filtered = [...this.crawlerPages];

            // Apply search filter
            if (this.crawlerPageSearch) {
                const search = this.crawlerPageSearch.toLowerCase();
                filtered = filtered.filter(page => 
                    page.url.toLowerCase().includes(search) || 
                    (page.title && page.title.toLowerCase().includes(search))
                );
            }

            // Apply category filter
            if (this.crawlerPageFilter) {
                switch (this.crawlerPageFilter) {
                    case 'forms':
                        filtered = filtered.filter(page => page.has_forms);
                        break;
                    case 'auth':
                        filtered = filtered.filter(page => page.requires_auth);
                        break;
                    case 'selected':
                        filtered = filtered.filter(page => 
                            page.selected_for_manual_testing || page.selected_for_automated_testing
                        );
                        break;
                }
            }

            this.filteredCrawlerPages = filtered;
            console.log('🔍 DEBUG: updateFilteredCrawlerPages finished, filteredCrawlerPages.length:', this.filteredCrawlerPages.length);
        },

        // Toggle page inclusion in testing sessions
        async togglePageForTesting(page) {
            const newValue = !page.selected_for_testing;

            try {
                await this.apiCall(`/web-crawlers/crawler-pages/${page.id}/testing`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        selected_for_testing: newValue
                    })
                });

                // Update local data
                page.selected_for_testing = newValue;
                this.updateFilteredCrawlerPages();

                this.showNotification(
                    'success',
                    'Page Selection Updated',
                    `Page ${newValue ? 'included in' : 'excluded from'} testing sessions`
                );

            } catch (error) {
                console.error('Failed to update page testing selection:', error);
                this.showNotification('error', 'Update Failed', 'Failed to update page selection');
            }
        },

        // Bulk include pages in testing sessions
        async bulkIncludePagesInTesting() {
            const selectedPages = this.filteredCrawlerPages.filter(page => page.selected);
            
            if (selectedPages.length === 0) {
                this.showNotification('warning', 'No Pages Selected', 'Please select pages first');
                return;
            }

            try {
                this.loading = true;
                const pageIds = selectedPages.map(page => page.id);

                await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/pages/bulk-testing`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        page_ids: pageIds,
                        selected_for_testing: true
                    })
                });

                // Update local data
                selectedPages.forEach(page => {
                    page.selected_for_testing = true;
                });

                this.showNotification(
                    'success',
                    'Bulk Selection Updated',
                    `${selectedPages.length} pages included in testing sessions`
                );

            } catch (error) {
                console.error('Failed to bulk update page testing selection:', error);
                this.showNotification('error', 'Bulk Update Failed', 'Failed to update page selections');
            } finally {
                this.loading = false;
            }
        },

        // Bulk exclude pages from testing sessions
        async bulkExcludePagesFromTesting() {
            const selectedPages = this.filteredCrawlerPages.filter(page => page.selected);
            
            if (selectedPages.length === 0) {
                this.showNotification('warning', 'No Pages Selected', 'Please select pages first');
                return;
            }

            try {
                this.loading = true;
                const pageIds = selectedPages.map(page => page.id);

                await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/pages/bulk-testing`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        page_ids: pageIds,
                        selected_for_testing: false
                    })
                });

                // Update local data
                selectedPages.forEach(page => {
                    page.selected_for_testing = false;
                });

                this.showNotification(
                    'success',
                    'Bulk Selection Updated',
                    `${selectedPages.length} pages excluded from testing sessions`
                );

            } catch (error) {
                console.error('Failed to bulk update page testing selection:', error);
                this.showNotification('error', 'Bulk Update Failed', 'Failed to update page selections');
            } finally {
                this.loading = false;
            }
        },

        // Toggle page selection in the UI
        togglePageSelection(page) {
            page.selected = !page.selected;
        },

        // Toggle all page selections
        toggleAllPageSelection(selectAll) {
            this.filteredCrawlerPages.forEach(page => {
                page.selected = selectAll;
            });
        },

        // Get auth type badge styling class
        getAuthTypeBadgeClass(authType) {
            switch (authType) {
                case 'saml': return 'bg-blue-100 text-blue-800';
                case 'basic': return 'bg-green-100 text-green-800';
                case 'dynamic_auth': return 'bg-purple-100 text-purple-800';
                case 'none': return 'bg-gray-100 text-gray-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        },

        // Get auth type display name
        getAuthTypeDisplay(authType) {
            switch (authType) {
                case 'saml': return 'SAML/SSO';
                case 'basic': return 'Username/Password';
                case 'dynamic_auth': return 'Dynamic Auth';
                case 'none': return 'No Authentication';
                default: return 'Unknown';
            }
        },

        // ===== TESTING SESSIONS METHODS =====
        
        async startNewComplianceSession() {
            if (!this.data.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: this.data.selectedProject,
                        session_type: 'compliance',
                        wcag_level: 'AA',
                        testing_approach: 'hybrid'
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Session Created', 'New compliance session started');
                    this.loadComplianceSessions();
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Session Failed', error.message || 'Failed to create session');
                }
            } catch (error) {
                console.error('Error creating compliance session:', error);
                this.showNotification('error', 'Network Error', 'Failed to create session');
            }
        },

        async loadComplianceSessions() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/sessions`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.complianceSessions = data.sessions || [];
                } else {
                    console.error('Failed to load compliance sessions');
                }
            } catch (error) {
                console.error('Error loading compliance sessions:', error);
            }
        },

        async pauseSession(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/pause`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    session.status = 'paused';
                    this.showNotification('success', 'Session Paused', 'Testing session has been paused');
                } else {
                    this.showNotification('error', 'Pause Failed', 'Failed to pause session');
                }
            } catch (error) {
                console.error('Error pausing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to pause session');
            }
        },

        async resumeSession(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/resume`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    session.status = 'active';
                    this.showNotification('success', 'Session Resumed', 'Testing session has been resumed');
                } else {
                    this.showNotification('error', 'Resume Failed', 'Failed to resume session');
                }
            } catch (error) {
                console.error('Error resuming session:', error);
                this.showNotification('error', 'Network Error', 'Failed to resume session');
            }
        },

        async viewSessionResults(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Open results in a new modal or navigate to results view
                    this.sessionResults = data.results;
                    this.selectedSession = session;
                    this.showSessionResultsModal = true;
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load session results');
                }
            } catch (error) {
                console.error('Error loading session results:', error);
                this.showNotification('error', 'Network Error', 'Failed to load session results');
            }
        },

        async stopSession(session) {
            if (!confirm(`Are you sure you want to stop the testing session for ${session.name}?`)) {
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/stop`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    session.status = 'completed';
                    this.showNotification('success', 'Session Stopped', 'Testing session has been stopped');
                } else {
                    this.showNotification('error', 'Stop Failed', 'Failed to stop session');
                }
            } catch (error) {
                console.error('Error stopping session:', error);
                this.showNotification('error', 'Network Error', 'Failed to stop session');
            }
        },

        async refreshSessions() {
            await this.loadComplianceSessions();
            this.showNotification('success', 'Sessions Refreshed', 'Session list has been updated');
        },

        // Create a new testing session
        async createTestingSession() {
            if (!this.data.selectedProject || !this.newTestingSession.name.trim() || !this.newTestingSession.conformance_level) {
                this.showNotification('error', 'Missing Information', 'Please fill in all required fields');
                return;
            }

            try {
                this.loading = true;
                
                const sessionData = {
                    name: this.newTestingSession.name.trim(),
                    description: this.newTestingSession.description.trim(),
                    project_id: this.data.selectedProject,
                    conformance_level: this.newTestingSession.conformance_level,
                    testing_approach: this.newTestingSession.testing_approach || 'hybrid'
                };

                const response = await this.apiCall('/sessions', {
                    method: 'POST',
                    body: JSON.stringify(sessionData)
                });

                if (response.success) {
                    this.showNotification('success', 'Session Created', 
                        `Session "${sessionData.name}" created with ${response.data.total_tests_count || 0} test instances`
                    );
                    
                    this.showCreateTestingSession = false;
                    this.resetNewTestingSession();
                    await this.loadComplianceSessions();
                } else {
                    throw new Error(response.error || 'Failed to create testing session');
                }
            } catch (error) {
                console.error('Error creating testing session:', error);
                this.showNotification('error', 'Creation Failed', error.message || 'Failed to create testing session');
            } finally {
                this.loading = false;
            }
        },

        // Delete a testing session with confirmation
        async deleteTestingSession(session) {
            if (!session) {
                this.showNotification('error', 'No Session', 'No session selected for deletion');
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to delete the testing session "${session.name}"?\n\nThis action cannot be undone and will remove:\n• All test results and findings\n• Session progress and configuration\n• Associated accessibility reports\n• Manual testing notes and observations`);
            
            if (!confirmed) {
                return;
            }

            try {
                this.loading = true;
                
                const response = await this.apiCall(`/sessions/${session.id}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    this.showNotification('success', 'Session Deleted', `Session "${session.name}" deleted successfully`);
                    
                    // Refresh all session-related data
                    await this.loadComplianceSessions();
                } else {
                    throw new Error(response.error || 'Failed to delete session');
                }
            } catch (error) {
                console.error('Error deleting session:', error);
                this.showNotification('error', 'Deletion Failed', error.message || 'Failed to delete session');
            } finally {
                this.loading = false;
            }
        },

        // Duplicate an existing testing session
        async duplicateTestingSession(session) {
            if (!session) return;

            try {
                this.loading = true;
                const response = await this.apiCall(`/sessions/${session.id}/duplicate`, {
                    method: 'POST'
                });

                if (response.success) {
                    this.showNotification('success', 'Session Duplicated', 
                        `Created duplicate session with ${response.data.total_tests_count || 0} test instances`
                    );
                    await this.loadComplianceSessions();
                } else {
                    throw new Error(response.error || 'Failed to duplicate session');
                }
            } catch (error) {
                console.error('Error duplicating session:', error);
                this.showNotification('error', 'Duplication Failed', error.message || 'Failed to duplicate session');
            } finally {
                this.loading = false;
            }
        },

        // Edit a testing session (placeholder for future implementation)
        editTestingSession(session) {
            // For now, show coming soon message
            this.showNotification('info', 'Feature Coming Soon', 'Session editing will be available soon');
            console.log('Editing session:', session);
        },

        // View testing session details
        viewTestingSessionDetails(session) {
            // Navigate to session test grid view or show detailed modal
            this.viewSessionResults(session);
        },

        // Reset new testing session form
        resetNewTestingSession() {
            this.newTestingSession = {
                name: '',
                description: '',
                conformance_level: 'AA',
                testing_approach: 'hybrid'
            };
        },

        // Get session status badge styling class
        getSessionStatusBadgeClass(status) {
            const classes = {
                'pending': 'bg-yellow-100 text-yellow-800',
                'active': 'bg-blue-100 text-blue-800',
                'in_progress': 'bg-blue-100 text-blue-800',
                'completed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'cancelled': 'bg-gray-100 text-gray-800',
                'paused': 'bg-orange-100 text-orange-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        // Open test instance modal for detailed view
        async openTestInstanceModal(testInstance) {
            try {
                this.currentTestInstance = testInstance;
                this.showTestInstanceModal = true;
                
                // TODO: Load detailed test information
                // await this.loadTestInstanceDetails(testInstance.id);
                
            } catch (error) {
                console.error('Error opening test instance details:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load test details');
            }
        },

        // Close test instance modal
        closeTestInstanceModal() {
            this.showTestInstanceModal = false;
            this.currentTestInstance = null;
        },

        // ===== AUTHENTICATION METHODS =====
        
        async selectAuthProject(projectId) {
            console.log('🔐 selectAuthProject called with:', projectId);
            this.selectedAuthProject = projectId;
            this.data.selectedAuthProject = projectId; // Organized state
            console.log('🔐 selectedAuthProject set to:', this.selectedAuthProject);
            await this.loadProjectAuthConfigs();
            console.log('🔐 After loadProjectAuthConfigs, projectAuthConfigs length:', this.projectAuthConfigs?.length || 0);
        },

        async loadAuthConfigs() {
            try {
                console.log('🔐 Loading authentication configurations...');
                const response = await this.apiCall('/auth/configs');
                this.authConfigs = response.data || [];
                this.data.authConfigs = this.authConfigs; // Sync organized state
                console.log('🔐 Auth configs loaded:', this.authConfigs.length);
                
                // Filter for current project if one is selected
                if (this.data.selectedAuthProject) {
                    await this.loadProjectAuthConfigs();
                } else {
                    this.data.projectAuthConfigs = this.data.authConfigs;
                    this.projectAuthConfigs = this.data.projectAuthConfigs; // Legacy sync
                }
            } catch (error) {
                console.error('Failed to load auth configs:', error);
                this.authConfigs = [];
                this.projectAuthConfigs = [];
            }
        },

        // REMOVED: Duplicate loadProjectAuthConfigs method - using enhanced version with filtering below

        async loadProjectAuthConfigs() {
            if (!this.data.selectedAuthProject || !this.getSelectedProject()?.primary_url) {
                console.log('🔐 No project or project URL, showing all auth configs');
                this.data.projectAuthConfigs = this.data.authConfigs || [];
                this.projectAuthConfigs = this.data.projectAuthConfigs; // Legacy sync
                return;
            }

            try {
                // Extract domain from project's primary URL
                const projectUrl = new URL(this.getSelectedProject().primary_url);
                const projectDomain = projectUrl.hostname;
                console.log(`🔐 Filtering auth configs for project domain: ${projectDomain}`);
                
                // Filter auth configs that match the project domain
                const matchingConfigs = this.authConfigs.filter(config => {
                    console.log(`🔐 Checking config "${config.name}" - domain: "${config.domain}", url: "${config.url}"`);
                    
                    const domainMatch = config.domain === projectDomain;
                    console.log(`🔐 Domain match (${config.domain} === ${projectDomain}): ${domainMatch}`);
                    
                    let urlMatch = false;
                    if (config.url) {
                        try {
                            const configUrl = new URL(config.url);
                            urlMatch = configUrl.hostname === projectDomain;
                            console.log(`🔐 URL hostname match (${configUrl.hostname} === ${projectDomain}): ${urlMatch}`);
                        } catch (error) {
                            urlMatch = config.url.includes(projectDomain);
                            console.log(`🔐 URL includes match (${config.url}.includes(${projectDomain})): ${urlMatch}`);
                        }
                    }
                    
                    // Also check project_id match for direct association
                    const projectIdMatch = config.project_id === this.data.selectedAuthProject;
                    console.log(`🔐 Project ID match (${config.project_id} === ${this.data.selectedAuthProject}): ${projectIdMatch}`);
                    
                    const finalMatch = domainMatch || urlMatch || projectIdMatch;
                    console.log(`🔐 Final match result for "${config.name}": ${finalMatch}`);
                    
                    return finalMatch;
                });

                // If no project-specific configs found, show all configs for easier management (stable backup pattern)
                if (matchingConfigs.length === 0) {
                    console.log(`🔐 No matching configs for ${projectDomain}, showing all ${this.authConfigs.length} configs for easier management`);
                    this.projectAuthConfigs = this.authConfigs;
                } else {
                    console.log(`🔐 Found ${matchingConfigs.length} matching configs for project domain: ${projectDomain}`);
                    this.projectAuthConfigs = matchingConfigs;
                }
                
                // Sync to organized state
                this.data.projectAuthConfigs = this.projectAuthConfigs;
            } catch (error) {
                console.error('Error filtering auth configs:', error);
                this.projectAuthConfigs = this.authConfigs;
            }
        },

        async testAuthConfig(authConfig) {
            try {
                // Ensure config exists - backup initialization
                if (!this.config || !this.config.apiBaseUrl) {
                    this.config = { apiBaseUrl: 'http://localhost:3001', tokenRefreshInterval: null };
                }
                
                authConfig.status = 'testing';
                this.showNotification('info', 'Testing Authentication', `Testing authentication for ${authConfig.domain || authConfig.name}...`);

                const response = await this.apiCall(`/auth/configs/${authConfig.id}/test`, {
                    method: 'POST'
                });

                if (response.success) {
                    authConfig.status = 'active';
                    authConfig.last_used = new Date().toISOString();
                    this.showNotification('success', 'Test Successful', `Authentication test successful for ${authConfig.domain || authConfig.name}`);
                } else {
                    authConfig.status = 'failed';
                    this.showNotification('error', 'Test Failed', `Authentication test failed for ${authConfig.domain || authConfig.name}`);
                }
            } catch (error) {
                authConfig.status = 'failed';
                this.showNotification('error', 'Test Error', `Authentication test error: ${error.message}`);
            }
        },

        async editAuthConfig(authConfig) {
            // Populate the form with ALL existing data including SAML selectors
            this.authConfigForm = {
                name: authConfig.name || authConfig.domain || '',
                type: authConfig.type || 'form',
                login_url: authConfig.login_url || authConfig.url || '',
                username: authConfig.username || '',
                password: '', // Don't pre-fill password for security
                description: authConfig.description || authConfig.auth_description || '',
                auth_role: authConfig.auth_role || 'default',
                priority: authConfig.priority || 1,
                is_default: authConfig.is_default || false,
                // Advanced SAML/SSO fields (from existing config or defaults)
                idp_domain: authConfig.idp_domain || '',
                username_selector: authConfig.username_selector || 'input[name="username"]',
                password_selector: authConfig.password_selector || 'input[type="password"]',
                submit_selector: authConfig.submit_selector || 'button[type="submit"]'
            };
            
            this.editingAuthConfig = authConfig;
            this.showEditAuthConfigModal = true;
            this.ui.modals.showEditAuthConfigModal = true; // Sync organized state
        },

        async createAuthConfig() {
            try {
                this.loading = true;
                
                if (!this.selectedAuthProject) {
                    this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }
            
                // Create the auth config with advanced SAML fields
                const authConfigData = {
                    name: this.authConfigForm.name,
                    type: this.authConfigForm.type,
                    domain: this.extractDomainFromUrl(this.authConfigForm.login_url),
                    url: this.authConfigForm.login_url,
                    username: this.authConfigForm.username,
                    password: this.authConfigForm.password,
                    login_page: this.authConfigForm.login_url,
                    project_id: this.selectedAuthProject,
                    auth_role: this.authConfigForm.auth_role || 'default',
                    auth_description: this.authConfigForm.description,
                    priority: this.authConfigForm.priority || 1,
                    is_default: this.authConfigForm.is_default || false,
                    // Advanced SAML/SSO configuration
                    idp_domain: this.authConfigForm.idp_domain || '',
                    username_selector: this.authConfigForm.username_selector || 'input[name="username"]',
                    password_selector: this.authConfigForm.password_selector || 'input[type="password"]',
                    submit_selector: this.authConfigForm.submit_selector || 'button[type="submit"]'
                };

                const response = await this.apiCall('/auth/configs', {
                    method: 'POST',
                    body: JSON.stringify(authConfigData)
                });

                if (response.success) {
                    this.closeAuthConfigModal();
                    await this.loadAuthConfigs(); // Refresh configs
                    await this.loadProjectAuthConfigs(); // Refresh project configs
                    this.showNotification('success', 'Config Created', 'Authentication configuration created successfully');
                } else {
                    throw new Error(response.message || 'Failed to create authentication configuration');
                }
            } catch (error) {
                console.error('Failed to create auth config:', error);
                this.showNotification('error', 'Creation Failed', error.message || 'Failed to create authentication configuration');
            } finally {
                this.loading = false;
            }
        },

        async updateAuthConfig() {
            try {
                if (!this.editingAuthConfig) return;

                this.loading = true;
                
                // Prepare the update data with advanced SAML fields
                const updateData = {
                    name: this.authConfigForm.name,
                    domain: this.extractDomainFromUrl(this.authConfigForm.login_url),
                    url: this.authConfigForm.login_url,
                    type: this.authConfigForm.type,
                    username: this.authConfigForm.username,
                    password: this.authConfigForm.password, // Will be empty if not changed
                    login_page: this.authConfigForm.login_url,
                    auth_role: this.authConfigForm.auth_role,
                    auth_description: this.authConfigForm.description,
                    priority: this.authConfigForm.priority,
                    is_default: this.authConfigForm.is_default,
                    // Advanced SAML/SSO configuration
                    idp_domain: this.authConfigForm.idp_domain || '',
                    username_selector: this.authConfigForm.username_selector || 'input[name="username"]',
                    password_selector: this.authConfigForm.password_selector || 'input[type="password"]',
                    submit_selector: this.authConfigForm.submit_selector || 'button[type="submit"]'
                };
                
                const response = await this.apiCall(`/auth/configs/${this.editingAuthConfig.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });

                if (response.success) {
                    // Update the config in the local array
                    const index = this.authConfigs.findIndex(c => c.id === this.editingAuthConfig.id);
                    if (index !== -1) {
                        this.authConfigs[index] = { ...this.authConfigs[index], ...response.data };
                    }

                    this.closeAuthConfigModal();
                    await this.loadAuthConfigs(); // Refresh configs
                    await this.loadProjectAuthConfigs(); // Refresh project configs
                    this.showNotification('success', 'Config Updated', 'Authentication configuration updated successfully');
                } else {
                    throw new Error(response.message || 'Failed to update authentication configuration');
                }
            } catch (error) {
                console.error('Failed to update auth config:', error);
                this.showNotification('error', 'Update Failed', error.message || 'Failed to update authentication configuration');
            } finally {
                this.loading = false;
            }
        },

        async deleteAuthConfig(authConfig) {
            if (!confirm(`Are you sure you want to delete the "${authConfig.name || authConfig.auth_role}" authentication configuration?`)) {
                return;
            }

            try {
                const response = await this.apiCall(`/auth/configs/${authConfig.id}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    // Remove from local arrays
                    this.authConfigs = this.authConfigs.filter(c => c.id !== authConfig.id);
                    this.projectAuthConfigs = this.projectAuthConfigs.filter(c => c.id !== authConfig.id);
                    
                    this.showNotification('success', 'Config Deleted', `Authentication configuration "${authConfig.name || authConfig.auth_role}" deleted successfully`);
                } else {
                    throw new Error(response.message || 'Failed to delete configuration');
                }
            } catch (error) {
                console.error('Failed to delete auth config:', error);
                this.showNotification('error', 'Delete Failed', error.message || 'Failed to delete authentication configuration');
            }
        },

        extractDomainFromUrl(url) {
            try {
                return new URL(url).hostname;
            } catch (error) {
                // If URL parsing fails, try to extract domain manually
                const match = url.match(/^https?:\/\/([^\/]+)/);
                return match ? match[1] : url;
            }
        },

        closeAuthConfigModal() {
            this.showAddAuthConfigModal = false;
            this.showEditAuthConfigModal = false;
            this.ui.modals.showAddAuthConfigModal = false; // Sync organized state
            this.ui.modals.showEditAuthConfigModal = false; // Sync organized state
            this.editingAuthConfig = null;
            this.authConfigForm = {
                name: '',
                type: 'form',
                login_url: '',
                username: '',
                password: '',
                description: '',
                auth_role: 'default',
                priority: 1,
                is_default: false
            };
        },

        // ===== UTILITY METHODS =====
        
        formatDuration(milliseconds) {
            if (!milliseconds) return '';
            const seconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) {
                return `${hours}h ${minutes % 60}m`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            } else {
                return `${seconds}s`;
            }
        },

        // ===== AUTOMATED TESTING METHODS =====
        
        async startAutomatedTesting() {
            if (!this.data.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }
            
            try {
                this.automatedTestingInProgress = true;
                this.testingProgress = {
                    percentage: 0,
                    message: 'Starting automated tests...',
                    completedPages: 0,
                    totalPages: 0,
                    currentPage: ''
                };
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: this.data.selectedProject,
                        session_type: 'automated',
                        testing_config: this.testingConfig || {
                            useAxe: true,
                            usePa11y: true,
                            useLighthouse: true,
                            wcagLevel: 'AA',
                            browser: 'chromium'
                        }
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Testing Started', 'Automated accessibility testing has begun');
                    this.pollTestingProgress(result.session_id);
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Testing Failed', error.message || 'Failed to start testing');
                    this.automatedTestingInProgress = false;
                }
            } catch (error) {
                console.error('Error starting automated testing:', error);
                this.showNotification('error', 'Network Error', 'Failed to start testing');
                this.automatedTestingInProgress = false;
            }
        },

        async pollTestingProgress(sessionId) {
            const poll = async () => {
                try {
                    const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${sessionId}/status`, {
                        headers: this.getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const status = await response.json();
                        this.testingProgress = {
                            percentage: status.progress || 0,
                            message: status.message || 'Running tests...',
                            completedPages: status.completed_pages || 0,
                            totalPages: status.total_pages || 0,
                            currentPage: status.current_page || ''
                        };
                        
                        if (status.status === 'completed') {
                            this.automatedTestingInProgress = false;
                            this.showNotification('success', 'Testing Complete', `Tested ${status.completed_pages} pages`);
                            this.loadAutomatedTestResults();
                        } else if (status.status === 'failed') {
                            this.automatedTestingInProgress = false;
                            this.showNotification('error', 'Testing Failed', status.error || 'Testing process failed');
                        } else if (status.status === 'running') {
                            setTimeout(poll, 3000); // Poll every 3 seconds
                        }
                    }
                } catch (error) {
                    console.error('Error polling testing progress:', error);
                    this.automatedTestingInProgress = false;
                }
            };
            
            poll();
        },

        async loadAutomatedTestResults() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/automated-results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.automatedTestResults = data.results || [];
                } else {
                    console.error('Failed to load automated test results');
                }
            } catch (error) {
                console.error('Error loading automated test results:', error);
            }
        },

        async viewTestDetails(result) {
            // Open detailed test results in a modal or navigate to results view
            this.selectedTestResult = result;
            this.showTestDetailsModal = true;
        },

        async downloadTestReport(result) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${result.session_id}/report`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `accessibility-report-${result.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    this.showNotification('error', 'Download Failed', 'Failed to download test report');
                }
            } catch (error) {
                console.error('Error downloading report:', error);
                this.showNotification('error', 'Network Error', 'Failed to download test report');
            }
        },

        // Get default automated test configuration
        getDefaultAutomatedTestConfig() {
            return {
                playwright: {
                    enabled: true,
                    testTypes: ['basic', 'keyboard', 'screen-reader'],
                    browsers: ['chromium'],
                    viewports: ['desktop', 'tablet', 'mobile']
                },
                backend: {
                    enabled: true,
                    tools: ['axe', 'pa11y', 'lighthouse']
                },
                scope: {
                    maxPages: 25,
                    pageTypes: ['all']
                }
            };
        },

        // Toggle automated testing tools
        toggleAutomatedTool(tool) {
            if (tool === 'playwright') {
                this.automatedTestConfig.playwright.enabled = !this.automatedTestConfig.playwright.enabled;
            } else {
                const tools = this.automatedTestConfig.backend.tools;
                const index = tools.indexOf(tool);
                if (index > -1) {
                    tools.splice(index, 1);
                } else {
                    tools.push(tool);
                }
            }
        },

        // Toggle Playwright test types
        togglePlaywrightTestType(testType) {
            const testTypes = this.automatedTestConfig.playwright.testTypes;
            const index = testTypes.indexOf(testType);
            if (index > -1) {
                testTypes.splice(index, 1);
            } else {
                testTypes.push(testType);
            }
        },

        // Toggle Playwright browsers
        togglePlaywrightBrowser(browser) {
            const browsers = this.automatedTestConfig.playwright.browsers;
            const index = browsers.indexOf(browser);
            if (index > -1) {
                browsers.splice(index, 1);
            } else {
                browsers.push(browser);
            }
        },

        // Toggle Playwright viewports
        togglePlaywrightViewport(viewport) {
            const viewports = this.automatedTestConfig.playwright.viewports;
            const index = viewports.indexOf(viewport);
            if (index > -1) {
                viewports.splice(index, 1);
            } else {
                viewports.push(viewport);
            }
        },

        // Start automated testing with advanced configuration
        async startAutomatedTestingFromConfig() {
            if (!this.data.selectedProject) {
                this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }

            try {
                this.loading = true;
                this.automatedTestingInProgress = true;
                
                const config = this.automatedTestConfig;
                
                // Start comprehensive testing with user configuration
                const response = await this.apiCall(`/projects/${this.data.selectedProject}/comprehensive-testing`, {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionName: `Automated Test - ${new Date().toLocaleDateString()}`,
                        description: 'Automated testing initiated with custom configuration',
                        testingApproach: 'automated',
                        includeFrontend: config.playwright.enabled,
                        includeBackend: config.backend.enabled,
                        includeManual: false,
                        testTypes: config.playwright.testTypes,
                        browsers: config.playwright.browsers,
                        backendTools: config.backend.tools,
                        maxPages: config.scope.maxPages,
                        viewports: config.playwright.viewports
                    })
                });

                if (response.success) {
                    this.showNotification('success', 'Testing Started', 'Advanced automated testing started successfully!');
                    this.showTestConfigurationModal = false;
                    
                    // Start monitoring progress
                    if (response.data.session_id) {
                        this.pollTestingProgress(response.data.session_id);
                    }
                } else {
                    throw new Error(response.error || 'Failed to start testing');
                }
            } catch (error) {
                console.error('Error starting automated testing:', error);
                this.showNotification('error', 'Testing Failed', error.message || 'Failed to start automated testing');
                this.automatedTestingInProgress = false;
            } finally {
                this.loading = false;
            }
        },

        // Start automated testing for specific requirements
        async startAutomatedTestingForRequirements(sessionId, requirements = null) {
            try {
                this.loading = true;
                
                if (!this.data.selectedProject) {
                    throw new Error('No project selected');
                }
                
                console.log(`🚀 Starting automated testing for session: ${sessionId}`);
                
                // Start Playwright testing for the existing session
                const response = await this.apiCall(`/sessions/${sessionId}/start-playwright`, {
                    method: 'POST',
                    body: JSON.stringify({
                        testTypes: ['basic', 'keyboard', 'screen-reader', 'form'],
                        browsers: ['chromium'],
                        viewports: ['desktop'],
                        requirements: requirements
                    })
                });

                if (response.success) {
                    this.showNotification('success', 'Testing Started', 'Automated testing started successfully!');
                } else {
                    throw new Error(response.error || 'Failed to start testing');
                }
                
                return response;
                
            } catch (error) {
                console.error('❌ Error starting automated testing:', error);
                this.showNotification('error', 'Testing Failed', `Failed to start automated testing: ${error.message}`);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        // Close test details modal
        closeTestDetailsModal() {
            this.showTestDetailsModal = false;
            this.selectedTestResult = null;
        },

        // Close test configuration modal
        closeTestConfigurationModal() {
            this.showTestConfigurationModal = false;
        },

        // Show advanced test configuration modal
        showAdvancedTestConfiguration() {
            this.showTestConfigurationModal = true;
        },

        // ===== MANUAL TESTING METHODS =====
        
        async startManualTesting() {
            if (!this.data.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }
            
            try {
                // Create or load a manual testing session for the project
                const response = await this.apiCall(`/sessions`, {
                    method: 'POST',
                    body: JSON.stringify({
                        project_id: this.data.selectedProject,
                        name: `Manual Testing - ${new Date().toLocaleDateString()}`,
                        description: 'Manual accessibility testing session',
                        conformance_level: 'AA',
                        testing_approach: 'manual'
                    })
                });
                
                if (response.success) {
                    this.showNotification('success', 'Manual Testing Started', 'Manual testing session created');
                    await this.selectManualTestingSession(response.data);
                } else {
                    throw new Error(response.error || 'Failed to create manual testing session');
                }
            } catch (error) {
                console.error('Error starting manual testing:', error);
                this.showNotification('error', 'Failed to Start', error.message || 'Failed to start manual testing');
            }
        },

        async editManualTestResult(result) {
            this.currentManualTest = {
                assignment: { requirement_id: result.requirement_id },
                pageGroup: { page_id: result.page_id },
                sessionId: result.session_id,
                existingResult: result
            };
            this.showManualTestingModal = true;
        },

        async loadManualTestingAssignments() {
            if (!this.manualTestingSession) return;
            
            try {
                console.log('📋 Loading manual testing assignments...');
                
                const params = new URLSearchParams({
                    coverage_type: this.manualTestingFilters.coverage_type
                });
                
                if (this.manualTestingFilters.status) {
                    params.append('status', this.manualTestingFilters.status);
                }
                if (this.manualTestingFilters.wcag_level) {
                    params.append('wcag_level', this.manualTestingFilters.wcag_level);
                }
                if (this.manualTestingFilters.page_id) {
                    params.append('page_id', this.manualTestingFilters.page_id);
                }
                
                const response = await this.apiCall(`/manual-testing/session/${this.manualTestingSession.id}/assignments?${params}`);
                
                if (response.success) {
                    this.manualTestingAssignments = response.data.assignments || [];
                    this.applyManualTestingFilters();
                    
                    console.log(`✅ Loaded ${response.data.total_assignments} manual testing assignments`);
                } else {
                    throw new Error(response.error || 'Failed to load manual testing assignments');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing assignments:', error);
                this.showNotification('error', 'Loading Failed', 'Failed to load manual testing assignments');
            }
        },

        async loadManualTestingCoverageAnalysis() {
            if (!this.manualTestingSession) return;
            
            try {
                const response = await this.apiCall(`/manual-testing/session/${this.manualTestingSession.id}/coverage-analysis`);
                
                if (response.success) {
                    this.manualTestingCoverageAnalysis = response.data;
                } else {
                    throw new Error(response.error || 'Failed to load coverage analysis');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing coverage analysis:', error);
                this.showNotification('error', 'Analysis Failed', 'Failed to load coverage analysis');
            }
        },

        async refreshManualTestingTabData() {
            try {
                console.log('🔄 Refreshing manual testing tab data...');
                
                const promises = [];
                
                if (this.manualTestingSession) {
                    promises.push(this.loadManualTestingAssignments());
                }
                
                promises.push(this.loadManualTestingCoverageAnalysis());
                
                await Promise.all(promises);
                
                console.log('✅ Manual testing tab data refreshed');
            } catch (error) {
                console.error('❌ Error refreshing manual testing tab data:', error);
                this.showNotification('error', 'Refresh Failed', 'Failed to refresh manual testing data');
            }
        },

        async selectManualTestingSession(session) {
            try {
                console.log('🎯 Selecting manual testing session:', session.name);
                
                this.manualTestingSession = session;
                
                await Promise.all([
                    this.loadManualTestingAssignments(session.id),
                    this.loadManualTestingProgress(session.id)
                ]);
                
                console.log('✅ Manual testing session selected successfully');
            } catch (error) {
                console.error('❌ Error selecting manual testing session:', error);
                this.showNotification('error', 'Selection Failed', 'Failed to load manual testing session');
            }
        },

        async loadManualTestingProgress(sessionId) {
            try {
                console.log('📊 Loading manual testing progress...');
                
                const response = await this.apiCall(`/manual-testing/session/${sessionId}/progress`);
                
                if (response.success) {
                    this.manualTestingProgress = response.data.progress || null;
                    console.log('✅ Manual testing progress loaded');
                } else {
                    throw new Error(response.error || 'Failed to load progress');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing progress:', error);
            }
        },

        applyManualTestingFilters() {
            this.filterManualTestingAssignments();
        },

        filterManualTestingAssignments() {
            const filters = this.manualTestingFilters;
            
            this.filteredManualTestingAssignments = this.manualTestingAssignments.filter(pageGroup => {
                // Apply status filter
                if (filters.status && !pageGroup.assignments.some(a => a.status === filters.status)) {
                    return false;
                }
                
                // Apply WCAG level filter
                if (filters.wcag_level && !pageGroup.assignments.some(a => a.wcag_level === filters.wcag_level)) {
                    return false;
                }
                
                // Apply page filter
                if (filters.page_id && pageGroup.page_id !== filters.page_id) {
                    return false;
                }
                
                return true;
            });
            
            console.log('🔍 Filtered manual testing assignments:', this.filteredManualTestingAssignments.length, 'page groups');
        },

        async startManualTest(pageGroup, assignment) {
            try {
                console.log('🎯 Starting manual test:', assignment.criterion_number);
                
                this.currentManualTest = {
                    pageGroup: pageGroup,
                    assignment: assignment,
                    sessionId: this.manualTestingSession.id
                };
                
                await this.loadManualTestingProcedure(assignment.requirement_id, pageGroup.page_type);
                
                this.showManualTestingModal = true;
            } catch (error) {
                console.error('❌ Error starting manual test:', error);
                this.showNotification('error', 'Test Failed', 'Failed to start manual test');
            }
        },

        async loadManualTestingProcedure(requirementId, pageType) {
            try {
                const params = new URLSearchParams({ page_type: pageType });
                
                if (this.currentManualTest) {
                    params.append('page_id', this.currentManualTest.pageGroup.page_id);
                    params.append('session_id', this.currentManualTest.sessionId);
                }
                
                const response = await this.apiCall(`/manual-testing/requirement/${requirementId}/procedure?${params}`);
                
                if (response.success) {
                    this.manualTestingProcedure = response.data.requirement || null;
                    this.manualTestingContext = response.data.test_context || null;
                } else {
                    throw new Error(response.error || 'Failed to load procedure');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing procedure:', error);
                this.showNotification('error', 'Loading Failed', 'Failed to load testing procedure');
            }
        },

        async submitManualTestResult(result, confidence = 'medium', notes = '', evidence = {}) {
            try {
                console.log('💾 Submitting manual test result:', result);
                
                const response = await this.apiCall(`/manual-testing/session/${this.currentManualTest.sessionId}/result`, {
                    method: 'POST',
                    body: JSON.stringify({
                        page_id: this.currentManualTest.pageGroup.page_id,
                        requirement_id: this.currentManualTest.assignment.requirement_id,
                        result: result,
                        confidence_level: confidence,
                        notes: notes,
                        evidence: evidence,
                        test_method_used: 'manual'
                    })
                });
                
                if (response.success) {
                    // Refresh data after successful submission
                    await Promise.all([
                        this.loadManualTestingAssignments(this.currentManualTest.sessionId),
                        this.loadManualTestingProgress(this.currentManualTest.sessionId)
                    ]);
                    
                    // Close modal and reset state
                    this.showManualTestingModal = false;
                    this.currentManualTest = null;
                    this.manualTestingProcedure = null;
                    this.manualTestingContext = null;
                    
                    console.log('✅ Manual test result submitted successfully');
                    this.showNotification('success', 'Result Saved', 'Manual test result saved successfully');
                } else {
                    throw new Error(response.error || 'Failed to submit result');
                }
            } catch (error) {
                console.error('❌ Error submitting manual test result:', error);
                this.showNotification('error', 'Submit Failed', 'Failed to submit test result');
            }
        },

        closeManualTestingSession() {
            this.manualTestingSession = null;
            this.manualTestingProgress = null;
            this.manualTestingAssignments = [];
            this.filteredManualTestingAssignments = [];
            this.currentManualTest = null;
            this.manualTestingProcedure = null;
            this.manualTestingContext = null;
        },

        // ===== RESULTS METHODS =====
        
        async refreshResults() {
            if (!this.data.selectedProject) return;
            
            try {
                await Promise.all([
                    this.loadTestSessionResults(),
                    this.loadResultsSummary(),
                    this.loadComplianceAnalysis(),
                    this.loadRecentViolations()
                ]);
                this.showNotification('success', 'Results Refreshed', 'Latest test results loaded');
            } catch (error) {
                console.error('Error refreshing results:', error);
                this.showNotification('error', 'Refresh Failed', 'Failed to refresh results');
            }
        },

        async loadTestSessionResults() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/session-results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.testSessionResults = data.results || [];
                } else {
                    console.error('Failed to load test session results');
                }
            } catch (error) {
                console.error('Error loading test session results:', error);
            }
        },

        async loadResultsSummary() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/results-summary`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.resultsSummary = data.summary || {};
                } else {
                    console.error('Failed to load results summary');
                }
            } catch (error) {
                console.error('Error loading results summary:', error);
            }
        },

        async loadComplianceAnalysis() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/compliance-analysis`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.complianceAnalysis = data.analysis || {};
                } else {
                    console.error('Failed to load compliance analysis');
                }
            } catch (error) {
                console.error('Error loading compliance analysis:', error);
            }
        },

        async loadRecentViolations() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/recent-violations`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.recentViolations = data.violations || [];
                } else {
                    console.error('Failed to load recent violations');
                }
            } catch (error) {
                console.error('Error loading recent violations:', error);
            }
        },

        async viewDetailedResults(session) {
            this.selectedSession = session;
            this.showSessionResultsModal = true;
            // Load detailed results for the session
            await this.loadSessionDetailedResults(session.id);
        },

        async loadSessionDetailedResults(sessionId) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${sessionId}/detailed-results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.sessionDetailedResults = data.results || {};
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load detailed results');
                }
            } catch (error) {
                console.error('Error loading detailed results:', error);
                this.showNotification('error', 'Network Error', 'Failed to load detailed results');
            }
        },

        async exportResults() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/export-results`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        format: 'comprehensive',
                        include_violations: true,
                        include_compliance: true
                    })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `accessibility-results-${this.data.selectedProject}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    this.showNotification('success', 'Export Complete', 'Results report downloaded');
                } else {
                    this.showNotification('error', 'Export Failed', 'Failed to export results');
                }
            } catch (error) {
                console.error('Error exporting results:', error);
                this.showNotification('error', 'Network Error', 'Failed to export results');
            }
        },

        async exportSessionResults(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/export`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `session-results-${session.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    this.showNotification('error', 'Export Failed', 'Failed to export session results');
                }
            } catch (error) {
                console.error('Error exporting session results:', error);
                this.showNotification('error', 'Network Error', 'Failed to export session results');
            }
        },

        async viewViolationDetails(violation) {
            this.selectedViolation = violation;
            this.showViolationDetailsModal = true;
        },

        // Authentication helper methods (from stable backup)
        getAvailableAuthConfigs() {
            return this.data.projectAuthConfigs.filter(config => config.auth_config_id || config.id);
        },

        getAuthConfigDisplayName(config) {
            if (!config) return 'No Authentication';
            return `${config.name || config.auth_config_name} (${config.auth_role || config.type})`;
        },

        getActiveAuthCount() {
            return this.data.projectAuthConfigs.filter(config => config.status === 'active').length;
        },

        getPendingAuthCount() {
            return this.data.projectAuthConfigs.filter(config => config.status === 'pending' || config.status === 'testing').length;
        },

        getFailedAuthCount() {
            return this.data.projectAuthConfigs.filter(config => config.status === 'failed' || config.status === 'error').length;
        },

        async refreshAuthConfigs() {
            // Refresh both global and project-specific auth configs
            await this.loadAuthConfigs(); // This calls loadProjectAuthConfigs internally
            this.showNotification('success', 'Refreshed', 'Authentication configurations refreshed');
        },

        // Project-related loading methods (transferred from stable version)
        async loadProjectDiscoveries() {
            if (!this.data.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/projects/${this.data.selectedProject}/discoveries`);
                this.data.discoveries = data.data || [];
                this.discoveries = this.data.discoveries; // Sync legacy state
                
                // Defensive check to ensure discoveries is always an array
                if (!Array.isArray(this.discoveries)) {
                    this.discoveries = [];
                }
                
                console.log(`🔍 Loaded ${this.discoveries.length} discoveries for project`);
                
                // Check for pending discoveries and offer recovery
                const pendingDiscoveries = this.discoveries.filter(d => d.status === 'pending' || d.status === 'in_progress');
                if (pendingDiscoveries.length > 0) {
                    console.log(`⚠️ Found ${pendingDiscoveries.length} pending discoveries - offering recovery options`);
                }
                
                // Auto-select completed discoveries if none are selected and there's only one completed
                const completedDiscoveries = this.discoveries.filter(d => d.status === 'completed');
                // Defensive check to ensure selectedDiscoveries is always an array
                if (!Array.isArray(this.selectedDiscoveries)) {
                    this.selectedDiscoveries = [];
                }
                if (completedDiscoveries.length === 1 && this.selectedDiscoveries.length === 0) {
                    this.selectedDiscoveries = [completedDiscoveries[0].id];
                    console.log(`🎯 Auto-selected single completed discovery: ${completedDiscoveries[0].domain}`);
                }
            } catch (error) {
                console.error('Failed to load discoveries:', error);
                // Ensure discoveries is always an array even if API fails
                this.data.discoveries = this.data.discoveries || [];
                this.discoveries = this.discoveries || [];
            }
        },

        async loadProjectTestSessions() {
            if (!this.data.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/sessions?project_id=${this.data.selectedProject}`);
                this.data.testSessions = data.data || [];
                this.testSessions = this.data.testSessions; // Sync legacy state
                console.log(`🧪 Loaded ${this.testSessions.length} test sessions for project`);
            } catch (error) {
                console.error('Failed to load test sessions:', error);
            }
        },

        loadSelectedDiscoveries() {
            if (!this.data.selectedProject) return;
            const key = `selectedDiscoveries_${this.data.selectedProject}`;
            const saved = localStorage.getItem(key);
            this.selectedDiscoveries = saved ? JSON.parse(saved) : [];
        },

        // Authentication methods (transferred from stable version)
        async logout() {
            try {
                if (this.token) {
                    await fetch(`${this.config.apiBaseUrl}/auth/logout`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                }
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                this.clearAuth();
                this.showNotification('info', 'Logged Out', 'Logged out successfully');
            }
        },
        
        // Add manual URL to crawler
        async addManualUrl() {
            if (!this.newManualUrl || !this.selectedCrawlerForPages) {
                this.showNotification('error', 'Validation Error', 'URL and crawler selection are required');
                return;
            }

            this.addingManualUrl = true;
            
            try {
                // Ensure URL has protocol
                let url = this.newManualUrl.trim();
                if (!url.match(/^https?:\/\//)) {
                    url = `https://${url}`;
                }

                const pageData = {
                    url: url,
                    title: this.newManualUrlTitle || null,
                    page_type: this.newManualUrlType,
                    depth: this.newManualUrlDepth || 1,
                    requires_auth: this.newManualUrlRequiresAuth,
                    has_forms: this.newManualUrlHasForms,
                    selected_for_testing: this.newManualUrlForTesting,
                    status_code: 200, // Default for manual entry
                    discovered_manually: true
                };

                console.log('🔍 DEBUG: Adding manual URL to crawler:', this.selectedCrawlerForPages.id, pageData);

                const response = await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/pages`, {
                    method: 'POST',
                    body: JSON.stringify(pageData)
                });

                if (response.success) {
                    this.showNotification('success', 'URL Added', 'Manual URL added successfully');
                    
                    // Add the new page to the current list
                    const newPage = {
                        id: response.data.id,
                        ...pageData,
                        selected: false
                    };
                    this.crawlerPages.push(newPage);
                    this.updateFilteredCrawlerPages();
                    
                    // Reset form and close modal
                    this.resetManualUrlForm();
                    this.showAddManualUrlModal = false;
                    
                    // Reload page counts to update display
                    this.loadCrawlerPageCounts(true);
                } else {
                    this.showNotification('error', 'Add Failed', response.message || 'Failed to add manual URL');
                }
            } catch (error) {
                console.error('Error adding manual URL:', error);
                this.showNotification('error', 'Network Error', 'Failed to add manual URL');
            } finally {
                this.addingManualUrl = false;
            }
        },

        // Reset manual URL form
        resetManualUrlForm() {
            this.newManualUrl = '';
            this.newManualUrlTitle = '';
            this.newManualUrlType = 'content';
            this.newManualUrlDepth = 1;
            this.newManualUrlRequiresAuth = false;
            this.newManualUrlHasForms = false;
            this.newManualUrlForTesting = true;
        },

        // Save UI page selections to persist them across modal reopens
        async saveCrawlerPageSelections() {
            if (!this.selectedCrawlerForPages) {
                return;
            }

            const selectedPageIds = this.crawlerPages
                .filter(page => page.selected)
                .map(page => page.id);

            try {
                this.loading = true;
                
                await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/page-selections`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        selected_page_ids: selectedPageIds
                    })
                });

                this.showNotification(
                    'success',
                    'Selections Saved',
                    `${selectedPageIds.length} pages selected for quick access`
                );

            } catch (error) {
                console.error('Failed to save page selections:', error);
                this.showNotification('error', 'Save Failed', 'Failed to save page selections');
            } finally {
                this.loading = false;
            }
        },

        // Load saved UI page selections to restore checkbox state
        async loadCrawlerPageSelections(crawlerId) {
            try {
                const response = await this.apiCall(`/web-crawlers/crawlers/${crawlerId}/page-selections`);
                
                if (response.success && response.data && response.data.selected_page_ids) {
                    const selectedIds = new Set(response.data.selected_page_ids);
                    
                    // Mark pages as selected in the UI
                    this.crawlerPages.forEach(page => {
                        page.selected = selectedIds.has(page.id);
                    });
                    
                    console.log(`🔍 DEBUG: Restored ${selectedIds.size} saved page selections`);
                }
                
            } catch (error) {
                // Don't show error notifications for loading selections - it's optional
                console.log('No saved page selections found (this is normal for new crawlers)');
            }
        },

    };
    
    // 🛡️ Mark as initialized and store instance
    window._dashboardInitialized = true;
    window._dashboardInstance = componentInstance;
    
    return componentInstance;
}
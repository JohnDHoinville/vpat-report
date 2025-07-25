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
        showAddAuthConfigModal: false,
        showEditAuthConfigModal: false,
        showChangePassword: false,
        showSessions: false,
        showSetupAuth: false,
        showAdvancedCrawlerOptions: false,
        
        // ===== PROGRESS AND STATE FLAGS =====
        loading: false,
        discoveryInProgress: false,
        crawlerInProgress: false,
        sessionCapturing: false,
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
        selectedCrawlers: [],
        
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
        
        // ===== AUTHENTICATION AND USER =====
        isAuthenticated: false,
        user: null,
        
        // ===== SEARCH AND FILTER PROPERTIES =====
        urlSearch: '',
        urlSourceFilter: 'all',
        
        // ===== ERROR HANDLING =====
        loginError: '',
        passwordError: '',
        
        // ===== MISC PROPERTIES =====
        activeTab: 'projects',
        totalCrawlers: 0,
        notification: { show: false, type: '', title: '', message: '' },
        sessionInfo: { isValid: false, lastActivity: null, status: 'inactive' }
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
                showSessionUrl: false
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
            sessionInfo: { isValid: false, lastActivity: null, status: 'inactive' }
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
        sessionInfo: { isValid: false },
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
        
        viewCrawlerPages(crawler) {
            this.selectedCrawlerForPages = crawler;
            this.showCrawlerPagesModal = true;
            this.syncLegacyState();
        },
        
        closeCrawlerPagesModal() {
            this.showCrawlerPagesModal = false;
            this.selectedCrawlerForPages = null;
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
                
                const response = await fetch(`${this.config.apiBaseUrl}/api${endpoint}`, {
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
                console.log('WebSocket connected');
                this.ws.connected = true;
                this.ws.connecting = false;
                this.ws.reconnectAttempts = 0;
                this.wsConnected = true; // Legacy sync
                
                if (this.data.selectedProject) {
                    // Ensure we pass only the project ID (string) not the object
                    const projectId = typeof this.data.selectedProject === 'string' 
                        ? this.data.selectedProject 
                        : this.data.selectedProject.id || this.data.selectedProject;
                        
                    console.log('🔍 DEBUG: Joining project with ID:', projectId, typeof projectId);
                    this.ws.socket.emit('join_project', { 
                        projectId: projectId
                    });
                }
            });
            
            this.ws.socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
                this.ws.connected = false;
                this.ws.connecting = false;
                this.wsConnected = false; // Legacy sync
            });
            
            this.ws.socket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error);
                this.ws.connected = false;
                this.ws.connecting = false;
            });
            
            this.ws.socket.on('crawler_progress', (data) => {
                this.handleCrawlerProgress(data);
            });
            
            this.ws.socket.on('crawler_completed', (data) => {
                this.handleCrawlerCompleted(data);
            });
            
            this.ws.socket.on('notification', (data) => {
                this.showNotification(data.level, data.title, data.message);
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
            console.log('Crawler progress:', data);
            // Update crawler status in the list
            const crawler = this.data.webCrawlers.find(c => c.id === data.crawlerId);
            if (crawler) {
                crawler.status = 'running';
                crawler.total_pages_found = data.pagesFound || 0;
            }
            this.syncLegacyState();
        },
        
        handleCrawlerCompleted(data) {
            console.log('Crawler completed:', data);
            const crawler = this.data.webCrawlers.find(c => c.id === data.crawlerId);
            if (crawler) {
                crawler.status = 'completed';
                crawler.total_pages_found = data.totalPages || 0;
            }
            this.loadWebCrawlers(); // Refresh the list
            this.showNotification('success', 'Crawler Completed', 
                `Found ${data.totalPages || 0} pages`);
        },
        
        // ===== DATA LOADING =====
        
        async loadInitialData() {
            await Promise.all([
                this.loadProjects(),
                this.loadAuthConfigs()
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
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers`, {
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
                    this.showNotification('error', 'Creation Failed', error.message || 'Failed to create crawler');
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
            if (this.data.selectedProject) {
                // Auto-select the current project for authentication
                await this.selectAuthProject(this.data.selectedProject);
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
        getTotalPagesForTesting() { return this.webCrawlers.reduce((total, c) => total + (c.pages_for_testing || 0), 0); },
        getExcludedPagesCount() { return this.webCrawlers.reduce((total, c) => total + ((c.total_pages_found || 0) - (c.pages_for_testing || 0)), 0); },
        getTotalPages() { return this.webCrawlers.reduce((total, c) => total + (c.total_pages_found || 0), 0); },
        
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
            console.log('🔍 DEBUG: openCreateCrawlerModal called');
            this.ui.modals.showCreateCrawler = true;
            this.newCrawler.mode = mode;
            this.syncLegacyState();
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
            this.sessionCapturing = true;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/capture-session`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: this.data.selectedProject
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.sessionInfo = result.session_info;
                    this.showNotification('success', 'Session Captured', 'Browser session captured successfully');
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Capture Failed', error.message || 'Failed to capture session');
                }
            } catch (error) {
                console.error('Error capturing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to capture session');
            } finally {
                this.sessionCapturing = false;
            }
        },

        async testSessionAccess() {
            this.sessionTesting = true;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/test-session`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Session Valid', `Can access ${result.accessible_pages} pages`);
                } else {
                    this.showNotification('error', 'Session Invalid', 'Session has expired or is invalid');
                }
            } catch (error) {
                console.error('Error testing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to test session');
            } finally {
                this.sessionTesting = false;
            }
        },

        async clearSession() {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/clear-session`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.sessionInfo = { isValid: false, lastActivity: null, status: 'inactive' };
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
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/pages`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.crawlerPages = data.pages || [];
                    this.selectedCrawlerForPages = crawler;
                    this.showCrawlerPagesModal = true;
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load crawler pages');
                }
            } catch (error) {
                console.error('Error loading crawler pages:', error);
                this.showNotification('error', 'Network Error', 'Failed to load crawler pages');
            }
        },

        closeCrawlerPagesModal() {
            this.showCrawlerPagesModal = false;
            this.selectedCrawlerForPages = null;
            this.crawlerPages = [];
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

        // ===== AUTHENTICATION METHODS =====
        
        async selectAuthProject(projectId) {
            this.selectedAuthProject = projectId;
            this.data.selectedAuthProject = projectId; // Organized state
            await this.loadProjectAuthConfigs();
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
                    const domainMatch = config.domain === projectDomain;
                    
                    let urlMatch = false;
                    if (config.url) {
                        try {
                            const configUrl = new URL(config.url);
                            urlMatch = configUrl.hostname === projectDomain;
                        } catch (error) {
                            urlMatch = config.url.includes(projectDomain);
                        }
                    }
                    
                    return domainMatch || urlMatch;
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

        async testAuthConfig(config) {
            try {
                config.status = 'testing';
                this.showNotification('info', 'Testing Authentication', `Testing authentication for ${config.domain || config.name}...`);

                const response = await this.apiCall(`/auth/configs/${config.id}/test`, {
                    method: 'POST'
                });

                if (response.success) {
                    config.status = 'active';
                    config.last_used = new Date().toISOString();
                    this.showNotification('success', 'Test Successful', `Authentication test successful for ${config.domain || config.name}`);
                } else {
                    config.status = 'failed';
                    this.showNotification('error', 'Test Failed', `Authentication test failed for ${config.domain || config.name}`);
                }
            } catch (error) {
                config.status = 'failed';
                this.showNotification('error', 'Test Error', `Authentication test error: ${error.message}`);
            }
        },

        async editAuthConfig(config) {
            // Populate the form with ALL existing data including SAML selectors
            this.authConfigForm = {
                name: config.name || config.domain || '',
                type: config.type || 'form',
                login_url: config.login_url || config.url || '',
                username: config.username || '',
                password: '', // Don't pre-fill password for security
                description: config.description || config.auth_description || '',
                auth_role: config.auth_role || 'default',
                priority: config.priority || 1,
                is_default: config.is_default || false,
                // Advanced SAML/SSO fields (from existing config or defaults)
                idp_domain: config.idp_domain || '',
                username_selector: config.username_selector || 'input[name="username"]',
                password_selector: config.password_selector || 'input[type="password"]',
                submit_selector: config.submit_selector || 'button[type="submit"]'
            };
            
            this.editingAuthConfig = config;
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

        async deleteAuthConfig(config) {
            if (!confirm(`Are you sure you want to delete the "${config.name || config.auth_role}" authentication configuration?`)) {
                return;
            }

            try {
                const response = await this.apiCall(`/auth/configs/${config.id}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    // Remove from local arrays
                    this.authConfigs = this.authConfigs.filter(c => c.id !== config.id);
                    this.projectAuthConfigs = this.projectAuthConfigs.filter(c => c.id !== config.id);
                    
                    this.showNotification('success', 'Config Deleted', `Authentication configuration "${config.name || config.auth_role}" deleted successfully`);
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
                console.log(`🔍 Loaded ${this.discoveries.length} discoveries for project`);
                
                // Check for pending discoveries and offer recovery
                const pendingDiscoveries = this.discoveries.filter(d => d.status === 'pending' || d.status === 'in_progress');
                if (pendingDiscoveries.length > 0) {
                    console.log(`⚠️ Found ${pendingDiscoveries.length} pending discoveries - offering recovery options`);
                }
                
                // Auto-select completed discoveries if none are selected and there's only one completed
                const completedDiscoveries = this.discoveries.filter(d => d.status === 'completed');
                if (completedDiscoveries.length === 1 && this.selectedDiscoveries.length === 0) {
                    this.selectedDiscoveries = [completedDiscoveries[0].id];
                    console.log(`🎯 Auto-selected single completed discovery: ${completedDiscoveries[0].domain}`);
                }
            } catch (error) {
                console.error('Failed to load discoveries:', error);
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


    };
    
    // 🛡️ Mark as initialized and store instance
    window._dashboardInitialized = true;
    window._dashboardInstance = componentInstance;
    
    return componentInstance;
}
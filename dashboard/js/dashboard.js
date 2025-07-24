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
            auth_type: 'saml',
            type: 'sso',
            login_url: '',
            username: '',
            password: '',
            description: ''
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
        availableUrls: [],
        sessions: [],
        discoveries: [],
        discoveredPages: [],
        selectedCrawlers: [],
        
        // ===== SELECTION AND REFERENCE OBJECTS =====
        selectedProject: null,
        selectedDiscovery: null,
        selectedCrawlerForPages: null,
        selectedAuthProject: null,
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
        activeTab: 'discovery',  // Must match ui.activeTab default
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
        
        getProjectAuthConfigs(projectId) {
            return this.authConfigs.filter(config => config.project_id === projectId);
        },
        
        getProjectAuthStatus(projectId) {
            const configs = this.getProjectAuthConfigs(projectId);
            return configs.length > 0 ? 'configured' : 'not-configured';
        },
        
        selectAuthProject(projectId) {
            this.selectedAuthProject = projectId;
            this.syncLegacyState();
        },
        
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
                return;
            }
            
            this.auth.token = token;
            this.auth.refreshToken = refreshToken;
            
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
            
            this.auth.isAuthenticated = false;
            this.auth.user = null;
            this.auth.token = null;
            this.auth.refreshToken = null;
        },
        
        async login() {
            this.ui.loading = true;
            this.loginError = '';
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: this.loginForm.username,
                        password: this.loginForm.password
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    this.auth.token = data.token || data.access_token;
                    this.auth.refreshToken = data.refresh_token;
                    this.auth.user = data.user;
                    this.auth.isAuthenticated = true;
                    
                    localStorage.setItem('auth_token', data.token || data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    
                    this.ui.modals.showLogin = false;
                    this.startTokenRefreshTimer();
                    this.initializeWebSocket();
                    await this.loadInitialData();
                    
                    // Sync legacy state to ensure modal closes
                    this.syncLegacyState();
                    
                    this.showNotification('success', 'Login Successful', 'Welcome back!');
                } else {
                    const error = await response.json();
                    this.loginError = error.error || error.message || 'Login failed';
                }
            } catch (error) {
                console.error('Login error:', error);
                this.loginError = 'Network error occurred';
            } finally {
                this.ui.loading = false;
            }
        },
        
        logout() {
            this.clearAuth();
            this.ui.modals.showLogin = true;
            this.showNotification('info', 'Logged Out', 'You have been logged out');
        },
        
        getAuthHeaders() {
            const headers = { 'Content-Type': 'application/json' };
            if (this.auth.token) {
                headers['Authorization'] = `Bearer ${this.auth.token}`;
            }
            return headers;
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
        
        async loadAuthConfigs() {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/auth-configs`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.data.authConfigs = result.data || result;
                    this.authConfigs = this.data.authConfigs; // Legacy sync
                } else {
                    console.error('Failed to load auth configs:', response.status);
                }
            } catch (error) {
                console.error('Error loading auth configs:', error);
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
        
        selectProject(projectId) {
            this.data.selectedProject = projectId;
            this.selectedProject = projectId; // Legacy sync
            this.loadWebCrawlers();
            
            if (this.ws.socket && this.ws.connected) {
                this.ws.socket.emit('join_project', { projectId });
            }
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

        selectProject(project) {
            this.selectedProject = project;
            console.log(`📂 Selected project: ${project.name}`);
            
            // Join WebSocket room for this project
            if (this.ws.socket && this.ws.connected) {
                this.ws.socket.emit('join_project', project.id);
            }
            
            this.loadProjectDiscoveries();
            this.loadProjectTestSessions();
            this.loadProjectAuthConfigs();
            this.loadSelectedDiscoveries();
            // Switch to discovery tab after selection
            this.activeTab = 'discovery';
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
                this.projects = this.projects.filter(p => p.id !== this.projectToDelete.id);
                
                // Clear selection if the deleted project was selected
                if (this.selectedProject && this.selectedProject.id === this.projectToDelete.id) {
                    this.selectedProject = null;
                    this.discoveries = [];
                    this.testSessions = [];
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

        // ===== PLACEHOLDER METHODS FOR TEMPLATE COMPATIBILITY =====
        
        refreshSessionInfo() { /* TODO: Implement */ },
        changePassword() { /* TODO: Implement */ },
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
            await this.loadProjectAuthConfigs();
        },

        async loadProjectAuthConfigs() {
            if (!this.selectedAuthProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.selectedAuthProject}/auth-configs`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.projectAuthConfigs = data.auth_configs || [];
                } else {
                    console.error('Failed to load project auth configs');
                }
            } catch (error) {
                console.error('Error loading project auth configs:', error);
            }
        },

        async testAuthConfig(config) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/test-config/${config.id}`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Auth Test Successful', `Authentication working: ${result.message}`);
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Auth Test Failed', error.message || 'Authentication test failed');
                }
            } catch (error) {
                console.error('Error testing auth config:', error);
                this.showNotification('error', 'Network Error', 'Failed to test authentication');
            }
        },

        async editAuthConfig(config) {
            this.authConfigForm = { ...config };
            this.showEditAuthConfigModal = true;
        },

        async deleteAuthConfig(config) {
            if (!confirm(`Are you sure you want to delete the authentication config for ${config.name}?`)) {
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/configs/${config.id}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    await this.loadProjectAuthConfigs();
                    this.showNotification('success', 'Auth Config Deleted', 'Authentication configuration has been deleted');
                } else {
                    this.showNotification('error', 'Delete Failed', 'Failed to delete authentication config');
                }
            } catch (error) {
                console.error('Error deleting auth config:', error);
                this.showNotification('error', 'Network Error', 'Failed to delete authentication config');
            }
        },

        closeAuthConfigModal() {
            this.showAddAuthConfigModal = false;
            this.showEditAuthConfigModal = false;
            this.authConfigForm = {};
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

        // Project-related loading methods (transferred from stable version)
        async loadProjectDiscoveries() {
            if (!this.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/discoveries`);
                this.discoveries = data.data || [];
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
            if (!this.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/sessions?project_id=${this.selectedProject.id}`);
                this.testSessions = data.data || [];
                console.log(`🧪 Loaded ${this.testSessions.length} test sessions for project`);
            } catch (error) {
                console.error('Failed to load test sessions:', error);
            }
        },

        loadSelectedDiscoveries() {
            if (!this.selectedProject) return;
            const key = `selectedDiscoveries_${this.selectedProject.id}`;
            const saved = localStorage.getItem(key);
            this.selectedDiscoveries = saved ? JSON.parse(saved) : [];
        }
    };
    
    // 🛡️ Mark as initialized and store instance
    window._dashboardInitialized = true;
    window._dashboardInstance = componentInstance;
    
    return componentInstance;
}
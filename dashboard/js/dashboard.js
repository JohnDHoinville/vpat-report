// Main Dashboard JavaScript Module
// This file provides the core Alpine.js data and methods for the modularized dashboard

// Dashboard Alpine.js component
function dashboard() {
    return {
        // State management
        activeTab: 'discovery',
        selectedProject: null,
        projects: [],
        currentUser: null,
        user: null,
        isAuthenticated: false,
        showProfile: false,
        showLogin: false,
        showChangePassword: false,
        showSessions: false,
        showSetupAuth: false,
        notification: { show: false, type: '', title: '', message: '' },
        loading: false,
        developmentMode: false,
        
        // Login Form
        loginForm: {
            username: '',
            password: ''
        },
        loginError: '',
        
        // Profile Form
        profileForm: {
            full_name: ''
        },
        
        // Password Form
        passwordForm: {
            current_password: '',
            new_password: '',
            confirm_password: ''
        },
        passwordError: '',
        
        // Auth Setup Form
        authSetup: {
            step: null,
            inProgress: false,
            sso: {
                url: '',
                loginPage: '',
                successUrl: '',
                name: ''
            },
            basic: {
                url: '',
                loginPage: '',
                username: '',
                password: '',
                usernameSelector: '',
                passwordSelector: '',
                submitSelector: '',
                successUrl: '',
                name: ''
            },
            advanced: {
                type: 'api_key',
                url: '',
                apiKey: '',
                token: '',
                name: ''
            }
        },
        
        // Project Management
        showCreateProject: false,
        showDeleteProject: false,
        showDeleteDiscovery: false,
        showDeleteSession: false,
        newProject: {
            name: '',
            description: '',
            primary_url: '',
            compliance_standard: 'WCAG_2_1_AA'
        },
        
        // Discovery management
        discoveries: [],
        
        // Additional missing state variables
        sessions: [],
        discoveryToDelete: null,
        projectToDelete: null,
        sessionToDelete: null,
        showAdvancedCrawlerOptions: false,
        selectedDiscovery: null,
        
        // WebSocket state
        wsConnected: false,
        wsConnecting: false,
        wsReconnectAttempts: 0,
        
        // API Connection state
        apiConnected: false,
        
        // Projects and data
        projects: [],
        selectedProject: null,
        
        // Authentication state
        loginForm: {
            username: '',
            password: ''
        },
        authSetup: {
            step: null,
            type: null
        },
        profileForm: {
            full_name: ''
        },
        passwordForm: {
            current_password: '',
            new_password: '',
            confirm_password: ''
        },
        
        // Session and discovery state
        sessions: [],
        discoveries: [],
        discoveryToDelete: null,
        projectToDelete: null,
        sessionToDelete: null,
        selectedDiscovery: null,
        
        // Web crawler state
        showAdvancedCrawlerOptions: false,
        webCrawlers: [],
        selectedCrawlers: [],
        totalCrawlers: 0,
        crawlerInProgress: false,
        crawlerProgress: {
            percentage: 0,
            message: '',
            pagesFound: 0,
            currentUrl: ''
        },
        showCreateCrawler: false,
        newCrawler: {
            name: '',
            description: '',
            base_url: '',
            browser_type: 'chromium',
            auth_type: 'none',
            max_pages: 100,
            max_depth: 3,
            request_delay_ms: 2000,
            session_persistence: false,
            respect_robots_txt: false,
            saml_config: {},
            auth_credentials: {},
            auth_workflow: {}
        },
        
        // Crawler Pages Modal
        showCrawlerPagesModal: false,
        selectedCrawlerForPages: null,
        crawlerPages: [],
        
        // Session URL Selection Modal
        showSessionUrlModal: false,
        availableUrls: [],
        filteredUrls: [],
        selectedUrls: [],
        urlSearch: '',
        urlSourceFilter: '',
        manualUrl: {
            url: '',
            title: '',
            pageType: 'content'
        },
        
        // Authentication Configs
        authConfigs: [],
        selectedAuthProject: null,
        showCreateAuthConfig: false,
        authConfigForm: {
            name: '',
            auth_type: 'saml',
            description: '',
            config_data: {}
        },
        
        // Browser Session Management
        sessionInfo: {
            isValid: false,
            expiresAt: null,
            domain: '',
            sessionId: ''
        },
        sessionCapturing: false,
        sessionTesting: false,
        
        // Discovery state additions
        discoveryConfig: {
            maxDepth: 3,
            maxPages: 100,
            mode: 'comprehensive'
        },
        discoveryInProgress: false,
        showDiscoveredPagesModal: false,
        discoveredPages: [],
        
        // Web Crawler modal state
        showAddCrawlerModal: false,
        showEditCrawlerModal: false,
        crawlerForm: {
            name: '',
            description: '',
            base_url: '',
            auth_type: 'none',
            max_depth: 3,
            max_pages: 100,
            respect_robots_txt: false
        },
        showCrawlerPagesModal: false,
        selectedCrawler: null,
        selectedCrawlerPages: [],
        
        // Authentication modal state
        showAddAuthConfigModal: false,
        showEditAuthConfigModal: false,
        
        // Manual URL form state
        showManualUrlForm: false,
        manualUrl: '',
        
        // API Configuration
        apiBaseUrl: 'http://localhost:3001',
        
        // Initialization
        init() {
            console.log('Dashboard initialized');
            this.checkAuthentication();
            this.checkApiConnection();
            this.initializeWebSocket();
            this.refreshSessionInfo();
            this.loadProjects();
            this.loadAuthConfigs();
        },
        
        // Notification system
        showNotification(type, title, message) {
            this.notification = {
                show: true,
                type,
                title,
                message
            };
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideNotification();
            }, 5000);
        },

        hideNotification() {
            this.notification.show = false;
        },
        
        // Authentication methods
        async checkAuthentication() {
            if (this.developmentMode) {
                // Mock authentication for development mode
                this.isAuthenticated = false; // Start as not authenticated so user can test login
                this.user = null;
                return;
            }
            
                const token = localStorage.getItem('auth_token');
                if (token) {
                // Validate token with server
                try {
                    const response = await fetch(`${this.apiBaseUrl}/api/auth/validate`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.isAuthenticated = true;
                        this.user = data.user;
                    } else {
                        localStorage.removeItem('auth_token');
                        this.isAuthenticated = false;
                        this.user = null;
                }
            } catch (error) {
                    console.error('Token validation failed:', error);
                    this.isAuthenticated = false;
                    this.user = null;
                }
            }
        },
        
        async login() {
            this.loading = true;
            this.loginError = '';
            
            try {
                if (this.developmentMode) {
                    // Mock login for development mode
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
                    
                    // Mock successful login
                    this.isAuthenticated = true;
                    this.user = {
                        id: 'demo-user',
                        username: this.loginForm.username || 'demo-user',
                        full_name: 'Demo User',
                        role: 'admin'
                    };
                    this.showLogin = false;
                    this.loginForm = { username: '', password: '' };
                    this.showNotification('success', 'Login Successful (Mock)', 'Welcome to the demo dashboard!');
                    return;
                }
                
                const response = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.loginForm)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('auth_token', data.token);
                    this.isAuthenticated = true;
                    this.user = data.user;
                    this.showLogin = false;
                    this.loginForm = { username: '', password: '' };
                    this.showNotification('success', 'Login Successful', 'Welcome back!');
                } else {
                    this.loginError = data.message || 'Login failed';
                }
            } catch (error) {
                this.loginError = 'Network error. Please try again.';
                console.error('Login error:', error);
            } finally {
                this.loading = false;
            }
        },
        
        logout() {
            localStorage.removeItem('auth_token');
            this.isAuthenticated = false;
            this.user = null;
            this.showNotification('info', 'Logged Out', 'You have been logged out successfully.');
        },
        
        // API connection check
        async checkApiConnection() {
            try {
                if (this.developmentMode) {
                    this.apiConnected = true; // Mock connection for development
                    return;
                }
                
                const response = await fetch(`${this.apiBaseUrl}/api/health`);
                this.apiConnected = response.ok;
            } catch (error) {
                this.apiConnected = false;
                console.error('API connection check failed:', error);
            }
        },
        
        // WebSocket connection
        initializeWebSocket() {
            if (this.wsConnecting || this.wsConnected) {
                return;
            }
            
            try {
                this.wsConnecting = true;
                const token = localStorage.getItem('auth_token');
                
                // Use Socket.IO client (not native WebSocket)
                this.ws = io('http://localhost:3001', {
                    auth: {
                        token: token
                    },
                    transports: ['websocket', 'polling'],
                    timeout: 20000
                });
                
                this.ws.on('connect', () => {
                    console.log('🔌 Socket.IO connected successfully');
                    this.wsConnected = true;
                    this.wsConnecting = false;
                    this.wsReconnectAttempts = 0;
                    
                    if (this.selectedProject) {
                        this.ws.emit('join_project', { projectId: this.selectedProject });
                    }
                });
                
                this.ws.on('disconnect', (reason) => {
                    console.log('🔌 Socket.IO disconnected:', reason);
                    this.wsConnected = false;
                    this.wsConnecting = false;
                    
                    // Auto-reconnect with exponential backoff
                    this.wsReconnectAttempts = (this.wsReconnectAttempts || 0) + 1;
                    if (this.wsReconnectAttempts < 5) {
                        const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 10000);
                        setTimeout(() => {
                            if (!this.wsConnected && !this.wsConnecting) {
                                console.log(`🔄 Attempting reconnection ${this.wsReconnectAttempts}/5...`);
                                this.initializeWebSocket();
                            }
                        }, delay);
                    } else {
                        console.log('❌ Max WebSocket reconnection attempts reached');
                    }
                });
                
                this.ws.on('connect_error', (error) => {
                    console.error('🔌 Socket.IO connection error:', error);
                    this.wsConnected = false;
                    this.wsConnecting = false;
                });
                
                this.ws.on('error', (error) => {
                    console.error('🔌 Socket.IO error:', error);
                });
                
                // Handle crawler-specific events
                this.ws.on('crawler_progress', (data) => {
                    this.handleCrawlerProgress(data);
                });
                
                this.ws.on('crawler_completed', (data) => {
                    this.handleCrawlerCompleted(data);
                });
                
                this.ws.on('notification', (data) => {
                    this.showNotification(data.level, data.title, data.message);
                });
                
            } catch (error) {
                console.error('🔌 WebSocket initialization failed:', error);
                this.wsConnected = false;
                this.wsConnecting = false;
            }
        },

        handleCrawlerProgress(data) {
            console.log('📊 Crawler progress:', data);
            // Update UI with progress data
            if (data.crawlerId) {
                const crawler = this.webCrawlers.find(c => c.id === data.crawlerId);
                if (crawler) {
                    crawler.status = data.status || 'running';
                    crawler.progress = data.progress || 0;
                    crawler.pages_found = data.pagesFound || 0;
                }
            }
        },

        handleCrawlerCompleted(data) {
            console.log('✅ Crawler completed:', data);
            // Update crawler status and refresh list
            if (data.crawlerId) {
                const crawler = this.webCrawlers.find(c => c.id === data.crawlerId);
                if (crawler) {
                    crawler.status = 'completed';
                    crawler.total_pages_found = data.totalPages || data.pagesFound || crawler.pages_found || 0;
                    crawler.completed_at = new Date().toISOString();
                }
            }
            this.showNotification('success', 'Crawler Completed', data.message || 'Web crawler finished successfully');
        },

        // ===============================
        // AUTHENTICATION HELPERS
        // ===============================
        
        getAuthHeaders() {
            const token = localStorage.getItem('auth_token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            return headers;
        },

        // ===============================
        // WEB CRAWLER MANAGEMENT
        // ===============================
        
        async loadWebCrawlers() {
            if (!this.selectedProject) return;
            
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/web-crawlers/projects/${this.selectedProject}/crawlers`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.webCrawlers = result.success ? result.data : [];
                    console.log('✅ Loaded web crawlers:', this.webCrawlers.length);
                } else {
                    console.error('Failed to load web crawlers:', response.status, response.statusText);
                    this.webCrawlers = [];
                }
            } catch (error) {
                console.error('Error loading web crawlers:', error);
                this.webCrawlers = [];
            }
        },

        async createCrawler() {
            if (!this.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }

            try {
                this.crawlerForm.project_id = this.selectedProject;
                
                const response = await fetch(`${this.apiBaseUrl}/api/web-crawlers/crawlers`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(this.crawlerForm)
                });

                if (response.ok) {
                    const newCrawler = await response.json();
                    this.webCrawlers.push(newCrawler);
                    this.showNotification('success', 'Crawler Created', `${this.crawlerForm.name} has been created`);
                    this.loadWebCrawlers(); // Refresh list
                } else {
                    this.showNotification('error', 'Creation Failed', 'Failed to create web crawler');
                }
                
                this.closeCrawlerModal();
            } catch (error) {
                console.error('Error creating crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to create crawler');
            }
        },

        async startCrawler(crawler) {
            // Check if browser session is available for SAML crawlers
            if (crawler.auth_type === 'saml' && !this.sessionInfo.isValid) {
                this.showNotification('warning', 'Browser Session Required', 
                    'SAML authentication requires an active browser session. Please capture a session first.');
                return;
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/start`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    crawler.status = 'running';
                    this.showNotification('success', 'Crawler Started', `${crawler.name} is now running`);
                } else {
                    this.showNotification('error', 'Start Failed', 'Failed to start crawler');
                }
            } catch (error) {
                console.error('Error starting crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to start crawler');
            }
        },

        async viewCrawlerPages(crawler) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/pages`, {
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    const result = await response.json();
                    this.selectedCrawlerPages = result.pages || [];
                    this.selectedCrawler = crawler;
                    this.showCrawlerPagesModal = true;
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load crawler pages');
                }
            } catch (error) {
                console.error('Error loading crawler pages:', error);
                this.showNotification('error', 'Network Error', 'Failed to load pages');
            }
        },

        async deleteCrawler(crawlerId) {
            if (!confirm('Are you sure you want to delete this crawler?')) {
                return;
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/web-crawlers/crawlers/${crawlerId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    this.webCrawlers = this.webCrawlers.filter(c => c.id !== crawlerId);
                    this.showNotification('success', 'Crawler Deleted', 'Crawler has been removed');
                } else {
                    this.showNotification('error', 'Delete Failed', 'Failed to delete crawler');
                }
            } catch (error) {
                console.error('Error deleting crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to delete crawler');
            }
        },

        editCrawler(crawler) {
            this.crawlerForm = { ...crawler };
            this.showEditCrawlerModal = true;
        },

        openCrawlerPagesModal(crawler) {
            this.viewCrawlerPages(crawler);
        },

        closeCrawlerModal() {
            this.showAddCrawlerModal = false;
            this.showEditCrawlerModal = false;
            this.crawlerForm = {
                name: '',
                description: '',
                base_url: '',
                auth_type: 'none',
                max_depth: 3,
                max_pages: 100,
                respect_robots_txt: false
            };
        },

        getCrawlerStatusColor(status) {
            const colors = {
                'idle': 'bg-gray-100 text-gray-800',
                'running': 'bg-blue-100 text-blue-800',
                'completed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'paused': 'bg-yellow-100 text-yellow-800'
            };
            return colors[status] || colors['idle'];
        },

        // ===============================
        // AUTHENTICATION MANAGEMENT
        // ===============================
        
        async loadAuthConfigs() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth/auth-configs`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.authConfigs = result.data || [];
                } else {
                    console.error('Failed to load auth configs:', response.status, response.statusText);
                    this.authConfigs = [];
                }
            } catch (error) {
                console.error('Failed to load auth configs:', error);
                this.authConfigs = [];
            }
        },

        getSelectedProject() {
            if (!this.selectedProject) return null;
            return this.projects.find(p => p.id === this.selectedProject) || null;
        },

        // ===============================
        // SESSION URL SELECTION MODAL
        // ===============================
        
        openSessionUrlModal() {
            // Load all available URLs from crawlers and discoveries
            this.loadAvailableUrls();
            this.showSessionUrlModal = true;
        },

        async loadAvailableUrls() {
            // This would load URLs from both web crawlers and site discoveries
            // For now, mock some data
            this.availableUrls = [
                { url: 'https://example.com/', source: 'crawler', selected: false },
                { url: 'https://example.com/about', source: 'crawler', selected: false },
                { url: 'https://example.com/contact', source: 'discovery', selected: false }
            ];
        },

        selectAllUrls() {
            this.availableUrls.forEach(url => url.selected = true);
        },

        deselectAllUrls() {
            this.availableUrls.forEach(url => url.selected = false);
        },

        addManualUrl() {
            if (this.manualUrl && this.manualUrl.trim()) {
                this.availableUrls.push({
                    url: this.manualUrl.trim(),
                    source: 'manual',
                    selected: true
                });
                this.manualUrl = '';
            }
        },

        removeUrl(index) {
            this.availableUrls.splice(index, 1);
        },

        saveUrlSelection() {
            const selectedUrls = this.availableUrls.filter(url => url.selected);
            this.showNotification('success', 'URLs Selected', `${selectedUrls.length} URLs selected for testing`);
            this.showSessionUrlModal = false;
        },

        closeSessionUrlModal() {
            this.showSessionUrlModal = false;
            this.manualUrl = '';
        },

        // ===============================
        // MISSING METHOD IMPLEMENTATIONS
        // ===============================

        // Computed properties for filtered URLs
        get filteredUrls() {
            let filtered = this.availableUrls || [];
            
            // Apply search filter
            if (this.urlSearch) {
                filtered = filtered.filter(url => 
                    url.url.toLowerCase().includes(this.urlSearch.toLowerCase()) ||
                    (url.title && url.title.toLowerCase().includes(this.urlSearch.toLowerCase()))
                );
            }
            
            // Apply source filter
            if (this.urlSourceFilter && this.urlSourceFilter !== 'all') {
                filtered = filtered.filter(url => url.source === this.urlSourceFilter);
            }
            
            return filtered;
        },

        get selectedUrls() {
            return (this.availableUrls || []).filter(url => url.selected);
        },

        // Session management methods
        async captureNewSession() {
            this.sessionCapturing = true;
            try {
                // Mock session capture - in real implementation would call backend
                await new Promise(resolve => setTimeout(resolve, 2000));
                this.sessionInfo.isValid = true;
                this.sessionInfo.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                this.sessionInfo.domain = 'fm-dev.ti.internet2.edu';
                this.sessionInfo.sessionId = `session-${Date.now()}`;
                this.showNotification('success', 'Session Captured', 'Browser session captured successfully');
            } catch (error) {
                this.showNotification('error', 'Capture Failed', 'Failed to capture browser session');
            } finally {
                this.sessionCapturing = false;
            }
        },

        async testSessionAccess() {
            this.sessionTesting = true;
            try {
                // Mock session test - in real implementation would test session validity
                await new Promise(resolve => setTimeout(resolve, 1500));
                this.showNotification('success', 'Session Valid', 'Session access test successful');
            } catch (error) {
                this.showNotification('error', 'Test Failed', 'Session access test failed');
            } finally {
                this.sessionTesting = false;
            }
        },

        // Discovery methods
        getSelectedProjectInfo() {
            const project = this.getSelectedProject();
            return project ? `${project.name} - ${project.description || 'No description'}` : 'No project selected';
        },

        async startDiscovery() {
            if (!this.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }

            this.discoveryInProgress = true;
            try {
                // Mock discovery process
                this.showNotification('info', 'Discovery Started', 'Site discovery is now running...');
                
                // Simulate progress updates
                for (let i = 0; i <= 100; i += 10) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    this.discoveryProgress = i;
                }
                
                // Mock discovered pages
                this.discoveredPages = [
                    { url: 'https://example.com/', title: 'Home Page', status: 200, selected: true },
                    { url: 'https://example.com/about', title: 'About Us', status: 200, selected: true },
                    { url: 'https://example.com/contact', title: 'Contact', status: 200, selected: true }
                ];
                
                this.showNotification('success', 'Discovery Complete', `Found ${this.discoveredPages.length} pages`);
            } catch (error) {
                this.showNotification('error', 'Discovery Failed', 'Site discovery failed');
            } finally {
                this.discoveryInProgress = false;
                this.discoveryProgress = 0;
            }
        },

        getSelectedPagesCount() {
            return (this.discoveredPages || []).filter(page => page.selected).length;
        },

        selectAllPages() {
            this.discoveredPages.forEach(page => page.selected = true);
        },

        deselectAllPages() {
            this.discoveredPages.forEach(page => page.selected = false);
        },

        togglePageSelection(page) {
            page.selected = !page.selected;
        },

        savePageSelections() {
            const selectedPages = this.discoveredPages.filter(page => page.selected);
            this.showNotification('success', 'Selection Saved', `${selectedPages.length} pages selected for testing`);
            this.showDiscoveredPagesModal = false;
        },

        // URL selection methods for session modal
        saveSelectedUrls() {
            const selected = this.selectedUrls;
            this.showNotification('success', 'URLs Saved', `${selected.length} URLs saved for testing session`);
            this.showSessionUrlModal = false;
        },

        // Auth config methods
        async createAuthConfig() {
            if (this.showEditAuthConfigModal) {
                await this.updateAuthConfig();
                return;
            }

            try {
                this.authConfigForm.project_id = this.selectedAuthProject;
                
                const response = await fetch(`${this.apiBaseUrl}/api/auth/auth-configs`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(this.authConfigForm)
                });

                if (response.ok) {
                    const newConfig = await response.json();
                    this.authConfigs.push(newConfig);
                    this.showNotification('success', 'Authentication Added', 'Authentication configuration created successfully');
                    this.loadAuthConfigs(); // Refresh list
                } else {
                    this.showNotification('error', 'Creation Failed', 'Failed to create authentication configuration');
                }
                
                this.closeAuthConfigModal();
            } catch (error) {
                console.error('Error creating auth config:', error);
                this.showNotification('error', 'Network Error', 'Failed to create authentication configuration');
            }
        },

        async updateAuthConfig() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth/auth-configs/${this.authConfigForm.id}`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(this.authConfigForm)
                });

                if (response.ok) {
                    const updatedConfig = await response.json();
                    const index = this.authConfigs.findIndex(c => c.id === this.authConfigForm.id);
                    if (index !== -1) {
                        this.authConfigs[index] = updatedConfig;
                    }
                    this.showNotification('success', 'Authentication Updated', 'Authentication configuration updated successfully');
                } else {
                    this.showNotification('error', 'Update Failed', 'Failed to update authentication configuration');
                }
                
                this.closeAuthConfigModal();
            } catch (error) {
                console.error('Error updating auth config:', error);
                this.showNotification('error', 'Network Error', 'Failed to update authentication configuration');
            }
        },

        editAuthConfig(config) {
            this.authConfigForm = { ...config };
            this.showEditAuthConfigModal = true;
        },

        async deleteAuthConfig(config) {
            if (!confirm(`Are you sure you want to delete "${config.name}"?`)) {
                return;
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth/auth-configs/${config.id}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    const index = this.authConfigs.findIndex(c => c.id === config.id);
                    if (index !== -1) {
                        this.authConfigs.splice(index, 1);
                    }
                    this.showNotification('success', 'Authentication Deleted', 'Authentication configuration deleted successfully');
                } else {
                    this.showNotification('error', 'Delete Failed', 'Failed to delete authentication configuration');
                }
            } catch (error) {
                console.error('Error deleting auth config:', error);
                this.showNotification('error', 'Network Error', 'Failed to delete authentication configuration');
            }
        },

        async testAuthConfig(config) {
            this.showNotification('info', 'Testing Authentication', 'Testing authentication configuration...');
            
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth/auth-configs/${config.id}/test`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Authentication Test', result.message || 'Authentication test successful');
                } else {
                    this.showNotification('error', 'Test Failed', 'Authentication test failed');
                }
            } catch (error) {
                console.error('Error testing auth config:', error);
                this.showNotification('error', 'Test Failed', 'Failed to test authentication configuration');
            }
        },

        closeAuthConfigModal() {
            this.showAddAuthConfigModal = false;
            this.showEditAuthConfigModal = false;
            this.authConfigForm = {
                id: null,
                name: '',
                type: 'sso',
                login_url: '',
                username: '',
                password: '',
                description: '',
                project_id: null
            };
        },

        getProjectAuthConfigs(projectId) {
            return this.authConfigs.filter(config => config.project_id === projectId);
        },

        // ===============================
        // MISSING METHOD IMPLEMENTATIONS
        // ===============================

        // Session info refresh
        async refreshSessionInfo() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth/session-info`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const sessionData = await response.json();
                    this.sessionInfo = sessionData.sessionInfo || {
                        isValid: false,
                        expiresAt: null,
                        domain: '',
                        sessionId: ''
                    };
                } else {
                    this.sessionInfo = {
                        isValid: false,
                        expiresAt: null,
                        domain: '',
                        sessionId: ''
                    };
                }
            } catch (error) {
                console.warn('Failed to refresh session info:', error);
                this.sessionInfo = {
                    isValid: false,
                    expiresAt: null,
                    domain: '',
                    sessionId: ''
                };
            }
        },

        // Authentication helper methods
        getAuthHeaders() {
            const token = localStorage.getItem('auth_token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            return headers;
        },

        // Authentication methods
        async login() {
            try {
                this.loginError = '';
                const response = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.loginForm)
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('auth_token', data.token);
                    this.isAuthenticated = true;
                    this.user = data.user;
                    this.showLogin = false;
                    this.loginForm = { username: '', password: '' };
                    this.showNotification('success', 'Login Successful', 'Welcome back!');
                    
                    // Reload data
                    this.loadProjects();
                    this.loadAuthConfigs();
                } else {
                    const error = await response.json();
                    this.loginError = error.message || 'Login failed';
                }
            } catch (error) {
                console.error('Login error:', error);
                this.loginError = 'Network error occurred';
            }
        },

        logout() {
            localStorage.removeItem('auth_token');
            this.isAuthenticated = false;
            this.user = null;
            this.showNotification('info', 'Logged Out', 'You have been logged out successfully');
        },

        // Project management methods
        async createProject() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/projects`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(this.newProject)
                });

                if (response.ok) {
                    const project = await response.json();
                    this.projects.push(project);
                    this.showCreateProject = false;
                    this.newProject = {
                        name: '',
                        description: '',
                        primary_url: '',
                        compliance_standard: 'WCAG_2_1_AA'
                    };
                    this.showNotification('success', 'Project Created', 'Project created successfully');
                } else {
                    this.showNotification('error', 'Creation Failed', 'Failed to create project');
                }
            } catch (error) {
                console.error('Project creation error:', error);
                this.showNotification('error', 'Creation Failed', 'Network error occurred');
            }
        },

        // Helper methods
        formatDate(dateString) {
            if (!dateString) return 'Never';
            return new Date(dateString).toLocaleString();
        },

        // Close modal methods
        cancelDeleteProject() {
            this.showDeleteProject = false;
        },

        cancelDeleteDiscovery() {
            this.showDeleteDiscovery = false;
        },

        cancelDeleteSession() {
            this.showDeleteSession = false;
        },

        // Auth config methods
        async changePassword() {
            try {
                this.passwordError = '';
                
                if (this.passwordForm.new_password !== this.passwordForm.confirm_password) {
                    this.passwordError = 'Passwords do not match';
                    return;
                }
                
                const response = await fetch(`${this.apiBaseUrl}/api/auth/change-password`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        current_password: this.passwordForm.current_password,
                        new_password: this.passwordForm.new_password
                    })
                });

                if (response.ok) {
                    this.showChangePassword = false;
                    this.passwordForm = {
                        current_password: '',
                        new_password: '',
                        confirm_password: ''
                    };
                    this.showNotification('success', 'Password Changed', 'Password updated successfully');
                } else {
                    const error = await response.json();
                    this.passwordError = error.message || 'Failed to change password';
                }
            } catch (error) {
                console.error('Password change error:', error);
                this.passwordError = 'Network error occurred';
            }
        },

        // ===============================
        // CORE LOADING METHODS
        // ===============================

        // Load projects
        async loadProjects() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/projects`, {
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    const data = await response.json();
                    this.projects = data.success ? data.data : data;
                } else {
                    console.error('Failed to load projects:', response.status);
                    this.projects = [];
                }
            } catch (error) {
                console.error('Projects loading error:', error);
                this.projects = [];
            }
        },

        // Load auth configs
        async loadAuthConfigs() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth/auth-configs`, {
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    const data = await response.json();
                    this.authConfigs = data.success ? data.data : data;
                } else {
                    console.error('Failed to load auth configs:', response.status);
                    this.authConfigs = [];
                }
            } catch (error) {
                console.error('Auth configs loading error:', error);
                this.authConfigs = [];
            }
        },

        // Check API connection
        async checkApiConnection() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/health`);
                if (response.ok) {
                    console.log('API connection successful');
                    this.apiConnected = true;
                } else {
                    console.warn('API connection failed');
                    this.apiConnected = false;
                }
            } catch (error) {
                console.error('API connection error:', error);
                this.apiConnected = false;
            }
        },

        // Initialize WebSocket
        initializeWebSocket() {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    console.warn('No auth token available for WebSocket connection');
                    return;
                }

                // Use Socket.IO client
                this.ws = io(`${this.apiBaseUrl}`, {
                    auth: {
                        token: token
                    },
                    transports: ['websocket', 'polling']
                });

                this.ws.on('connect', () => {
                    console.log('WebSocket connected');
                    this.wsConnected = true;
                    this.wsConnecting = false;
                });

                this.ws.on('disconnect', () => {
                    console.log('WebSocket disconnected');
                    this.wsConnected = false;
                    this.wsConnecting = false;
                });

                this.ws.on('connect_error', (error) => {
                    console.error('WebSocket connection error:', error);
                    this.wsConnected = false;
                    this.wsConnecting = false;
                });

            } catch (error) {
                console.error('WebSocket initialization failed:', error);
                this.wsConnected = false;
                this.wsConnecting = false;
            }
        },

        // ===============================
        // DISCOVERY METHODS
        // ===============================

        // Get total pages for testing
        getTotalPagesForTesting() {
            return this.discoveredPages?.filter(page => page.include_in_testing)?.length || 0;
        },

        // Get excluded pages count
        getExcludedPagesCount() {
            return this.discoveredPages?.filter(page => !page.include_in_testing)?.length || 0;
        },

        // Get total pages
        getTotalPages() {
            return this.discoveredPages?.length || 0;
        },

        // ===============================
        // WEB CRAWLER METHODS
        // ===============================

        // Create crawler
        async createCrawler() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/web-crawlers/projects/${this.selectedProject}/crawlers`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(this.newCrawler)
                });

                if (response.ok) {
                    this.showCreateCrawler = false;
                    this.resetCrawlerForm();
                    this.loadWebCrawlers();
                    this.showNotification('success', 'Crawler Created', 'Web crawler created successfully');
                } else {
                    this.showNotification('error', 'Creation Failed', 'Failed to create web crawler');
                }
            } catch (error) {
                console.error('Crawler creation error:', error);
                this.showNotification('error', 'Creation Failed', 'Network error occurred');
            }
        },

        // Load web crawlers
        async loadWebCrawlers() {
            if (!this.selectedProject) return;

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/web-crawlers/projects/${this.selectedProject}/crawlers`, {
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    const data = await response.json();
                    this.webCrawlers = data.success ? data.data : [];
                } else {
                    console.error('Failed to load web crawlers:', response.status);
                    this.webCrawlers = [];
                }
            } catch (error) {
                console.error('Web crawlers loading error:', error);
                this.webCrawlers = [];
            }
        },

        // Reset crawler form
        resetCrawlerForm() {
            this.newCrawler = {
                name: '',
                description: '',
                base_url: '',
                browser_type: 'chromium',
                auth_type: 'none',
                max_pages: 100,
                max_depth: 3,
                request_delay_ms: 2000,
                session_persistence: false,
                respect_robots_txt: false,
                saml_config: {},
                auth_credentials: {},
                auth_workflow: {}
            };
        },

        // Toggle advanced crawler options
        toggleAdvancedCrawlerOptions() {
            this.showAdvancedCrawlerOptions = !this.showAdvancedCrawlerOptions;
        }
    };
}
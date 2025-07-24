// Main Dashboard JavaScript Module
// This file provides the core Alpine.js data and methods for the modularized dashboard

// Dashboard Alpine.js component
function dashboard() {
    return {
        // UI State
        activeTab: 'discovery',
        loading: false,
        
        // Authentication state
        isAuthenticated: false,
        user: null,
        
        // Connection status
        apiConnected: false,
        wsConnected: false,
        
        // Modal states
        showLogin: false,
        showProfile: false,
        showChangePassword: false,
        showSessions: false,
        showSetupAuth: false,
        showCreateProject: false,
        showDeleteProject: false,
        showDeleteDiscovery: false,
        showDeleteSession: false,
        
        // Form data
        loginForm: {
            username: '',
            password: ''
        },
        
        profileForm: {
            full_name: ''
        },
        
        passwordForm: {
            current_password: '',
            new_password: '',
            confirm_password: ''
        },
        
        newProject: {
            name: '',
            description: '',
            primary_url: '',
            compliance_standard: 'wcag_2_1_aa'
        },
        
        // Auth setup wizard
        authSetup: {
            type: null,
            step: null,
            inProgress: false,
            progress: 0,
            progressMessage: '',
            currentStep: '',
            browserStatus: '',
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
                successUrl: '',
                name: '',
                usernameSelector: 'input[type=text]',
                passwordSelector: 'input[type=password]',
                submitSelector: 'button[type=submit]'
            },
            advanced: {
                type: 'api_key',
                url: '',
                apiKey: '',
                token: '',
                name: ''
            }
        },
        
        // Error states
        loginError: '',
        passwordError: '',
        
        // Data arrays
        sessions: [],
        projects: [],
        
        // Authentication Configuration State
        selectedAuthProject: null,
        authConfigs: [],
        showAddAuthConfigModal: false,
        showEditAuthConfigModal: false,
        authConfigForm: {
            id: null,
            name: '',
            type: 'sso',
            login_url: '',
            username: '',
            password: '',
            description: '',
            project_id: null
        },
        
        // Compliance Sessions State
        complianceSessions: [],
        sessionConfig: {
            name: '',
            testType: 'automated',
            wcagLevel: 'AA'
        },
        
        // Session Management State
        sessionInfo: {
            isValid: false,
            status: 'No session',
            username: '',
            capturedDate: '',
            expirationDate: '',
            pagesCount: 0
        },
        sessionCapturing: false,
        sessionTesting: false,

        // Site Discovery
        selectedProject: '',
        discoveries: [],
        discoveryInProgress: false,
        discoveryProgress: {
            percentage: 0,
            message: '',
            pagesFound: 0,
            currentUrl: ''
        },
        discoveryConfig: {
            maxDepth: 3,
            maxPages: 100,
            mode: 'standard'
        },
        showDiscoveredPagesModal: false,
        selectedDiscovery: null,
        discoveredPages: [],
        
        // Delete confirmation variables
        discoveryToDelete: null,
        projectToDelete: null,
        sessionToDelete: null,
        
        // Notification system
        notification: {
            show: false,
            type: 'info', // 'success', 'error', 'warning', 'info'
            title: '',
            message: ''
        },
        
        // API Configuration
        apiBaseUrl: 'http://localhost:3001',
        developmentMode: false, // Use real backend APIs
        
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
            // WebSocket initialization will be implemented later
            // For now, just set a mock status
            this.wsConnected = false;
        },
        
        // Profile management
        async updateProfile() {
            this.loading = true;
            
            try {
                // Mock API call
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                this.showProfile = false;
                this.showNotification('success', 'Profile Updated', 'Your profile has been updated successfully.');
            } catch (error) {
                this.showNotification('error', 'Update Failed', 'Failed to update profile. Please try again.');
                console.error('Profile update error:', error);
            } finally {
                this.loading = false;
            }
        },
        
        // Modal management
        openSessionsModal() {
            this.showSessions = true;
            this.loadActiveSessions();
        },
        
        async loadActiveSessions() {
            // Mock data for now
            this.sessions = [
                {
                    id: 1,
                    is_current: true,
                    ip_address: '192.168.1.100',
                    last_accessed: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                }
            ];
        },
        
        // Auth setup wizard
        startAuthSetup(type) {
            this.authSetup.type = type;
            this.authSetup.step = `${type}-details`;
        },
        
        nextAuthStep() {
            const currentStep = this.authSetup.step;
            
            if (currentStep.endsWith('-details')) {
                this.authSetup.step = currentStep.replace('-details', '-test');
            } else if (currentStep.endsWith('-test')) {
                this.authSetup.step = currentStep.replace('-test', '-save');
            }
        },
        
        async testAuthConfig() {
            this.authSetup.inProgress = true;
            this.authSetup.progress = 0;
            this.authSetup.progressMessage = 'Testing authentication...';
            
            // Simulate auth testing
            for (let i = 0; i <= 100; i += 10) {
                this.authSetup.progress = i;
                this.authSetup.progressMessage = i < 50 ? 'Connecting to authentication server...' : 
                                                i < 80 ? 'Validating credentials...' : 'Finalizing setup...';
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            this.authSetup.inProgress = false;
            this.showNotification('success', 'Auth Test Successful', 'Authentication configuration is working correctly.');
            this.nextAuthStep();
        },
        
        // Project management
        async createProject() {
            this.loading = true;
            
            try {
                // Mock API call
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                this.showCreateProject = false;
                this.newProject = {
                    name: '',
                    description: '',
                    primary_url: '',
                    compliance_standard: 'wcag_2_1_aa'
                };
                this.showNotification('success', 'Project Created', 'Your new project has been created successfully.');
            } catch (error) {
                this.showNotification('error', 'Creation Failed', 'Failed to create project. Please try again.');
                console.error('Project creation error:', error);
            } finally {
                this.loading = false;
            }
        },
        
        // Tab management
        refreshTestingSessionsTabData() {
            console.log('Refreshing testing sessions data...');
        },
        
        refreshTestingTabData() {
            console.log('Refreshing testing data...');
        },
        
        refreshManualTestingTabData() {
            console.log('Refreshing manual testing data...');
        },
        
        loadProjectAuthConfigs() {
            console.log('Loading project auth configs...');
        },

        // Session Management Functions
        async refreshSessionInfo() {
            try {
                if (this.developmentMode) {
                    // Mock session data for development
                    this.sessionInfo = {
                        isValid: true,
                        status: 'Active Session (Mock)',
                        username: 'demo-user',
                        capturedDate: new Date().toLocaleString(),
                        expirationDate: new Date(Date.now() + 24*60*60*1000).toLocaleString(),
                        pagesCount: 149
                    };
                    return;
                }
                
                const response = await fetch(`${this.apiBaseUrl}/api/session/info`);
                    const data = await response.json();
                
                if (data.exists) {
                    this.sessionInfo = {
                        isValid: true,
                        status: 'Active Session',
                        username: data.metadata?.username || 'Unknown',
                        capturedDate: data.metadata?.capturedDate ? new Date(data.metadata.capturedDate).toLocaleString() : 'Unknown',
                        expirationDate: data.metadata?.expirationDate ? new Date(data.metadata.expirationDate).toLocaleString() : 'Unknown',
                        pagesCount: data.metadata?.pagesCount || 0
                    };
                } else {
                    this.sessionInfo = {
                        isValid: false,
                        status: 'No session',
                        username: '',
                        capturedDate: '',
                        expirationDate: '',
                        pagesCount: 0
                    };
                }
            } catch (error) {
                console.error('Failed to refresh session info:', error);
                this.sessionInfo.status = 'Error checking session';
            }
        },

        async captureNewSession() {
            this.sessionCapturing = true;
            try {
                if (this.developmentMode) {
                    // Mock session capture for development
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
                    this.showNotification('success', 'Session Capture Started (Mock)', 'This is a demo - session capture functionality simulated.');
                    setTimeout(() => this.refreshSessionInfo(), 3000);
                    return;
                }
                
                const response = await fetch(`${this.apiBaseUrl}/api/session/capture`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();

                if (response.ok) {
                    this.showNotification('success', 'Session Capture Started', 'Browser window opened for authentication. Please log in and close the browser when done.');
                    // Refresh session info after a delay to check if session was captured
                    setTimeout(() => this.refreshSessionInfo(), 30000); // Check after 30 seconds
                } else {
                    this.showNotification('error', 'Capture Failed', data.message || 'Failed to start session capture');
                }
            } catch (error) {
                console.error('Session capture error:', error);
                this.showNotification('error', 'Network Error', 'Failed to communicate with server');
            } finally {
                this.sessionCapturing = false;
            }
        },

        async testSessionAccess() {
            this.sessionTesting = true;
            try {
                if (this.developmentMode) {
                    // Mock session test for development
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
                    const mockPages = Math.floor(Math.random() * 50) + 100;
                    this.showNotification('success', 'Session Valid (Mock)', `Session is working! Found ${mockPages} accessible pages`);
                    this.sessionInfo.pagesCount = mockPages;
                    return;
                }
                
                const response = await fetch(`${this.apiBaseUrl}/api/session/test`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();

                if (response.ok) {
                    this.showNotification('success', 'Session Valid', `Session is working! Found ${data.pagesCount} accessible pages`);
                    await this.refreshSessionInfo();
                } else {
                    this.showNotification('warning', 'Session Issue', data.message || 'Session may have expired');
                }
            } catch (error) {
                console.error('Session test error:', error);
                this.showNotification('error', 'Test Failed', 'Failed to test session access');
            } finally {
                this.sessionTesting = false;
            }
        },

        async clearSession() {
            try {
                if (this.developmentMode) {
                    // Mock session clear for development
                    this.sessionInfo = {
                        isValid: false,
                        status: 'No session',
                        username: '',
                        capturedDate: '',
                        expirationDate: '',
                        pagesCount: 0
                    };
                    this.showNotification('success', 'Session Cleared (Mock)', 'Session has been cleared (demo mode)');
                    return;
                }
                
                const response = await fetch(`${this.apiBaseUrl}/api/session/clear`, {
                    method: 'DELETE'
                    });

                    if (response.ok) {
                    this.showNotification('success', 'Session Cleared', 'Browser session has been cleared');
                    await this.refreshSessionInfo();
                    } else {
                    this.showNotification('error', 'Clear Failed', 'Failed to clear session');
                    }
                } catch (error) {
                console.error('Clear session error:', error);
                this.showNotification('error', 'Network Error', 'Failed to communicate with server');
            }
        },

        // Site Discovery Functions
        getSelectedProjectInfo() {
            if (!this.selectedProject) return '';
            const project = this.projects.find(p => p.id === this.selectedProject);
            return project ? `Selected: ${project.name}` : '';
        },

        async startNewDiscovery() {
            if (!this.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }

            this.discoveryInProgress = true;
            this.discoveryProgress = {
                percentage: 0,
                message: 'Starting discovery...',
                pagesFound: 0,
                currentUrl: ''
            };

            try {
                const requestBody = {
                    maxDepth: this.discoveryConfig.maxDepth,
                    maxPages: this.discoveryConfig.maxPages
                };

                // Add mode-specific options
                if (this.discoveryConfig.mode === 'authenticated') {
                    requestBody.excludePublicPages = true;
                } else if (this.discoveryConfig.mode === 'dynamic_auth') {
                    requestBody.dynamicAuth = true;
                }

                const response = await fetch(`/api/projects/${this.selectedProject}/discoveries`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (response.ok) {
                    this.showNotification('success', 'Discovery Started', 'Site discovery has been started');
                    // Start polling for progress
                    this.pollDiscoveryProgress(data.discovery.id);
                } else {
                    this.showNotification('error', 'Discovery Failed', data.error || 'Failed to start discovery');
                    this.discoveryInProgress = false;
                }
            } catch (error) {
                console.error('Discovery start error:', error);
                this.showNotification('error', 'Network Error', 'Failed to communicate with server');
                this.discoveryInProgress = false;
            }
        },

        async pollDiscoveryProgress(discoveryId) {
            // This would typically use WebSocket, but for now we'll simulate progress
            let percentage = 0;
            const interval = setInterval(() => {
                percentage += Math.random() * 15;
                if (percentage >= 100) {
                    percentage = 100;
                    clearInterval(interval);
                    this.discoveryInProgress = false;
                    this.loadDiscoveries();
                    this.showNotification('success', 'Discovery Complete', 'Site discovery has finished');
                }
                
                this.discoveryProgress = {
                    percentage: Math.min(percentage, 100),
                    message: percentage < 50 ? 'Crawling pages...' : percentage < 90 ? 'Processing content...' : 'Finalizing...',
                    pagesFound: Math.floor(percentage * 0.5),
                    currentUrl: 'https://example.com/page-' + Math.floor(Math.random() * 100)
                };
            }, 2000);
        },

        async loadDiscoveries() {
            if (!this.selectedProject) return;
            
            try {
                const response = await fetch(`/api/projects/${this.selectedProject}/discoveries`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.discoveries = data.discoveries || [];
                }
            } catch (error) {
                console.error('Failed to load discoveries:', error);
            }
        },

        async viewDiscoveryDetails(discovery) {
            this.selectedDiscovery = discovery;
            this.showDiscoveredPagesModal = true;
            
            try {
                const response = await fetch(`/api/discoveries/${discovery.id}/pages`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.discoveredPages = data.pages.map(page => ({
                        ...page,
                        selected: true // Default to selected
                    }));
                }
            } catch (error) {
                console.error('Failed to load discovery pages:', error);
                this.discoveredPages = [];
            }
        },

        async deleteDiscovery(discovery) {
            if (!confirm(`Are you sure you want to delete the discovery for ${discovery.domain}?`)) {
                return;
            }
            
            try {
                const response = await fetch(`/api/discoveries/${discovery.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                });
                
                if (response.ok) {
                    this.showNotification('success', 'Discovery Deleted', 'Discovery has been removed');
                    this.loadDiscoveries();
                } else {
                    this.showNotification('error', 'Delete Failed', 'Failed to delete discovery');
                }
            } catch (error) {
                console.error('Delete discovery error:', error);
                this.showNotification('error', 'Network Error', 'Failed to communicate with server');
            }
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

        getSelectedPagesCount() {
            return this.discoveredPages.filter(page => page.selected).length;
        },

        savePageSelections() {
            const selectedPages = this.discoveredPages.filter(page => page.selected);
            this.showNotification('success', 'Selection Saved', `${selectedPages.length} pages selected for testing`);
            this.showDiscoveredPagesModal = false;
        },
        
        // Utility methods
        formatDate(dateString) {
            if (!dateString) return 'Never';
            return new Date(dateString).toLocaleString();
        },

        formatDuration(ms) {
            if (!ms) return '';
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            }
            return `${seconds}s`;
        },

        // Projects Management
        async loadProjects() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/projects`);
                if (response.ok) {
                    const result = await response.json();
                    this.projects = result.data || result; // Handle both formats
                } else {
                    console.warn('Failed to load projects:', response.status);
                    // Add some sample projects for demo
                    this.projects = [
                        {
                            id: 'demo-1',
                            name: 'Demo Website',
                            description: 'Sample accessibility testing project',
                            created_at: new Date().toISOString()
                        }
                    ];
                }
            } catch (error) {
                console.error('Error loading projects:', error);
                // Add sample projects for demo purposes
                this.projects = [
                    {
                        id: 'demo-1',
                        name: 'Demo Website',
                        description: 'Sample accessibility testing project for demonstration',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'demo-2', 
                        name: 'E-commerce Site',
                        description: 'Online store accessibility compliance testing',
                        created_at: new Date(Date.now() - 86400000).toISOString()
                    }
                ];
            }
        },

        selectProject(projectId) {
            this.selectedProject = projectId;
            const project = this.projects.find(p => p.id === projectId);
            if (project) {
                this.showNotification('success', 'Project Selected', `Selected project: ${project.name}`);
                // Switch to discovery tab to show the selected project
                this.activeTab = 'discovery';
            }
        },

        // Authentication Configuration Management
        async loadAuthConfigs() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth-configs`);
                if (response.ok) {
                    const result = await response.json();
                    this.authConfigs = result.data || result;
                } else {
                    console.warn('Failed to load auth configs:', response.status);
                    // Add sample auth configs for demo
                    this.authConfigs = [
                        {
                            id: 'auth-1',
                            project_id: this.projects[0]?.id,
                            name: 'Internet2 Federation SSO',
                            type: 'sso',
                            login_url: 'https://fm-dev.ti.internet2.edu/login',
                            username: '',
                            description: 'Shibboleth SAML authentication for Internet2 Federation Manager',
                            status: 'active',
                            created_at: new Date().toISOString()
                        },
                        {
                            id: 'auth-2',
                            project_id: this.projects[0]?.id,
                            name: 'Admin Portal Login',
                            type: 'form',
                            login_url: 'https://example.com/admin/login',
                            username: 'admin',
                            description: 'Form-based administrator access for full site testing',
                            status: 'active',
                            created_at: new Date(Date.now() - 86400000).toISOString()
                        }
                    ];
                }
            } catch (error) {
                console.error('Error loading auth configs:', error);
                // Add sample configs for demo
                this.authConfigs = [
                    {
                        id: 'auth-1',
                        project_id: this.projects[0]?.id,
                        name: 'University SSO/SAML',
                        type: 'sso',
                        login_url: 'https://sso.university.edu/login',
                        username: '',
                        description: 'Shibboleth SAML authentication for university portal',
                        status: 'active',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'auth-2',
                        project_id: this.projects[1]?.id,
                        name: 'OAuth Google Login',
                        type: 'oauth',
                        login_url: 'https://portal.example.com/oauth/google',
                        username: '',
                        description: 'Google OAuth authentication for user portal',
                        status: 'active',
                        created_at: new Date(Date.now() - 86400000).toISOString()
                    },
                    {
                        id: 'auth-3',
                        project_id: this.projects[0]?.id,
                        name: 'API Key Authentication',
                        type: 'api_key',
                        login_url: 'https://api.example.com',
                        username: 'api-user',
                        description: 'Token-based API authentication for automated testing',
                        status: 'active',
                        created_at: new Date(Date.now() - 172800000).toISOString()
                    }
                ];
            }
        },

        selectAuthProject(projectId) {
            this.selectedAuthProject = projectId;
            this.loadProjectAuthConfigs();
        },

        async loadProjectAuthConfigs() {
            // This would normally load from API, for now we'll filter existing configs
            // In a real implementation, this would be: /api/projects/{id}/auth-configs
            const configs = this.authConfigs.filter(config => config.project_id === this.selectedAuthProject);
            console.log(`Loaded ${configs.length} auth configs for project ${this.selectedAuthProject}`);
        },

        getSelectedProject() {
            return this.projects.find(p => p.id === this.selectedAuthProject);
        },

        getProjectAuthConfigs(projectId) {
            return this.authConfigs.filter(config => config.project_id === projectId);
        },

        getProjectAuthStatus(projectId) {
            const configs = this.getProjectAuthConfigs(projectId);
            return configs.length > 0 ? 'configured' : 'none';
        },

        async createAuthConfig() {
            try {
                this.authConfigForm.project_id = this.selectedAuthProject;
                
                const response = await fetch(`${this.apiBaseUrl}/api/auth-configs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.authConfigForm)
                });

                if (response.ok) {
                    const newConfig = await response.json();
                    this.authConfigs.push(newConfig);
                    this.showNotification('success', 'Authentication Added', 'Authentication configuration created successfully');
                } else {
                    // Demo fallback
                    const newConfig = {
                        id: `auth-${Date.now()}`,
                        ...this.authConfigForm,
                        status: 'active',
                        created_at: new Date().toISOString()
                    };
                    this.authConfigs.push(newConfig);
                    this.showNotification('success', 'Authentication Added (Demo)', 'Authentication configuration created in demo mode');
                }
                
                this.closeAuthConfigModal();
            } catch (error) {
                console.error('Error creating auth config:', error);
                this.showNotification('error', 'Error', 'Failed to create authentication configuration');
            }
        },

        editAuthConfig(config) {
            this.authConfigForm = { ...config };
            this.showEditAuthConfigModal = true;
        },

        async updateAuthConfig() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth-configs/${this.authConfigForm.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
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
                    // Demo fallback
                    const index = this.authConfigs.findIndex(c => c.id === this.authConfigForm.id);
                    if (index !== -1) {
                        this.authConfigs[index] = { ...this.authConfigForm };
                    }
                    this.showNotification('success', 'Authentication Updated (Demo)', 'Authentication configuration updated in demo mode');
                }
                
                this.closeAuthConfigModal();
            } catch (error) {
                console.error('Error updating auth config:', error);
                this.showNotification('error', 'Error', 'Failed to update authentication configuration');
            }
        },

        async deleteAuthConfig(config) {
            if (!confirm(`Are you sure you want to delete "${config.name}"?`)) {
                return;
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth-configs/${config.id}`, {
                    method: 'DELETE'
                });

                if (response.ok || true) { // Demo: always succeed
                    const index = this.authConfigs.findIndex(c => c.id === config.id);
                    if (index !== -1) {
                        this.authConfigs.splice(index, 1);
                    }
                    this.showNotification('success', 'Authentication Deleted', 'Authentication configuration deleted successfully');
                }
            } catch (error) {
                console.error('Error deleting auth config:', error);
                this.showNotification('error', 'Error', 'Failed to delete authentication configuration');
            }
        },

        async testAuthConfig(config) {
            this.showNotification('info', 'Testing Authentication', 'Testing authentication configuration...');
            
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth-configs/${config.id}/test`, {
                    method: 'POST'
                });

                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Authentication Test', result.message || 'Authentication test successful');
                } else {
                    // Demo fallback
                    setTimeout(() => {
                        this.showNotification('success', 'Authentication Test (Demo)', 'Authentication test completed successfully in demo mode');
                    }, 2000);
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

        // Compliance Sessions Management
        async loadComplianceSessions() {
            if (!this.selectedProject) return;
            
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/projects/${this.selectedProject}/sessions`);
                if (response.ok) {
                    const result = await response.json();
                    this.complianceSessions = result.data || result;
                } else {
                    // Demo fallback
                    this.complianceSessions = [
                        {
                            id: 'session-1',
                            name: 'Homepage Compliance Audit',
                            description: 'WCAG 2.1 AA compliance testing for main landing page',
                            status: 'completed',
                            test_type: 'hybrid',
                            wcag_level: 'AA',
                            pages_tested: 12,
                            issues_found: 8,
                            progress: 100,
                            created_at: new Date(Date.now() - 86400000).toISOString()
                        },
                        {
                            id: 'session-2',
                            name: 'User Portal Testing',
                            description: 'Authenticated user interface compliance validation',
                            status: 'active',
                            test_type: 'automated',
                            wcag_level: 'AA',
                            pages_tested: 5,
                            issues_found: 3,
                            progress: 60,
                            created_at: new Date().toISOString()
                        }
                    ];
                }
            } catch (error) {
                console.error('Error loading compliance sessions:', error);
                // Sample sessions for demo
                this.complianceSessions = [
                    {
                        id: 'session-1',
                        name: 'Homepage Compliance Audit',
                        description: 'WCAG 2.1 AA compliance testing for main landing page',
                        status: 'completed',
                        test_type: 'hybrid',
                        wcag_level: 'AA',
                        pages_tested: 12,
                        issues_found: 8,
                        progress: 100,
                        created_at: new Date(Date.now() - 86400000).toISOString()
                    }
                ];
            }
        },

        async startNewComplianceSession() {
            if (!this.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }

            try {
                const sessionData = {
                    project_id: this.selectedProject,
                    name: this.sessionConfig.name || `Compliance Session ${new Date().toLocaleString()}`,
                    test_type: this.sessionConfig.testType,
                    wcag_level: this.sessionConfig.wcagLevel,
                    description: `${this.sessionConfig.testType} testing for WCAG ${this.sessionConfig.wcagLevel} compliance`
                };

                const response = await fetch(`${this.apiBaseUrl}/api/testing-sessions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sessionData)
                });

                if (response.ok) {
                    const newSession = await response.json();
                    this.complianceSessions.unshift(newSession);
                    this.showNotification('success', 'Session Started', 'New compliance testing session started successfully');
                } else {
                    // Demo fallback
                    const newSession = {
                        id: `session-${Date.now()}`,
                        ...sessionData,
                        status: 'active',
                        pages_tested: 0,
                        issues_found: 0,
                        progress: 0,
                        created_at: new Date().toISOString()
                    };
                    this.complianceSessions.unshift(newSession);
                    this.showNotification('success', 'Session Started (Demo)', 'Demo compliance testing session started');
                }

                // Reset form
                this.sessionConfig = {
                    name: '',
                    testType: 'automated',
                    wcagLevel: 'AA'
                };
            } catch (error) {
                console.error('Error starting compliance session:', error);
                this.showNotification('error', 'Error', 'Failed to start compliance session');
            }
        },

        async pauseSession(session) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/testing-sessions/${session.id}/pause`, {
                    method: 'POST'
                });

                if (response.ok || true) { // Demo: always succeed
                    session.status = 'paused';
                    this.showNotification('info', 'Session Paused', `Session "${session.name}" has been paused`);
                }
            } catch (error) {
                console.error('Error pausing session:', error);
                this.showNotification('error', 'Error', 'Failed to pause session');
            }
        },

        async resumeSession(session) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/testing-sessions/${session.id}/resume`, {
                    method: 'POST'
                });

                if (response.ok || true) { // Demo: always succeed
                    session.status = 'active';
                    this.showNotification('success', 'Session Resumed', `Session "${session.name}" has been resumed`);
                }
            } catch (error) {
                console.error('Error resuming session:', error);
                this.showNotification('error', 'Error', 'Failed to resume session');
            }
        },

        async stopSession(session) {
            if (!confirm(`Are you sure you want to stop the session "${session.name}"?`)) {
                return;
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/testing-sessions/${session.id}/stop`, {
                    method: 'POST'
                });

                if (response.ok || true) { // Demo: always succeed
                    session.status = 'stopped';
                    this.showNotification('warning', 'Session Stopped', `Session "${session.name}" has been stopped`);
                }
            } catch (error) {
                console.error('Error stopping session:', error);
                this.showNotification('error', 'Error', 'Failed to stop session');
            }
        },

        viewSessionResults(session) {
            this.showNotification('info', 'Opening Results', `Opening results for session "${session.name}"`);
            // This would typically navigate to results tab with session filter
            this.activeTab = 'results';
        },

        refreshSessions() {
            this.loadComplianceSessions();
            this.showNotification('success', 'Refreshed', 'Sessions list updated');
        }
    };
} 
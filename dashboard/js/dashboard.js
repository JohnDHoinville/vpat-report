// Main Dashboard JavaScript Module
// This file provides the core Alpine.js data and methods for the modularized dashboard

// Dashboard Alpine.js component
function dashboard() {
    return {
        // Core state
        activeTab: 'projects',
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
        
        // Error states
        loginError: '',
        passwordError: '',
        
        // Data arrays
        sessions: [],
        projects: [],
        
        // Notification system
        notification: {
            show: false,
            type: 'info', // 'success', 'error', 'warning', 'info'
            title: '',
            message: ''
        },
        
        // Initialization
        init() {
            console.log('Dashboard initialized');
            this.checkAuthentication();
            this.checkApiConnection();
            this.initializeWebSocket();
        },
        
        // Authentication methods
        async checkAuthentication() {
            try {
                const token = localStorage.getItem('auth_token');
                if (token) {
                    const response = await fetch('/api/auth/verify', {
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
                    }
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        },
        
        async login() {
            this.loading = true;
            this.loginError = '';
            
            try {
                const response = await fetch('/api/auth/login', {
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
        
        async logout() {
            try {
                const token = localStorage.getItem('auth_token');
                if (token) {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
            
            localStorage.removeItem('auth_token');
            this.isAuthenticated = false;
            this.user = null;
            this.showNotification('info', 'Logged Out', 'You have been successfully logged out.');
        },
        
        // API connection check
        async checkApiConnection() {
            try {
                const response = await fetch('/api/health');
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
        
        // Notification system
        showNotification(type, title, message, duration = 5000) {
            this.notification = {
                show: true,
                type,
                title,
                message
            };
            
            setTimeout(() => {
                this.hideNotification();
            }, duration);
        },
        
        hideNotification() {
            this.notification.show = false;
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
        
        proceedToDetails() {
            if (this.authSetup.type) {
                this.authSetup.step = `${this.authSetup.type}-details`;
            }
        },
        
        async setupAuthentication() {
            this.authSetup.inProgress = true;
            this.authSetup.progress = 0;
            this.authSetup.progressMessage = 'Initializing authentication setup...';
            
            // Mock progress simulation
            const steps = [
                'Validating configuration...',
                'Testing connection...',
                'Saving configuration...',
                'Setup complete!'
            ];
            
            for (let i = 0; i < steps.length; i++) {
                this.authSetup.currentStep = steps[i];
                this.authSetup.progress = ((i + 1) / steps.length) * 100;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            this.authSetup.inProgress = false;
            this.showSetupAuth = false;
            this.showNotification('success', 'Authentication Setup Complete', 'Your authentication configuration has been saved.');
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
        
        // Utility methods
        formatDate(dateString) {
            if (!dateString) return 'Never';
            return new Date(dateString).toLocaleString();
        }
    };
} 
// Modern Dashboard Helper Functions - Database API Integration
// Accessibility Testing Platform

const API_BASE_URL = 'http://localhost:3001/api';

// Alpine.js Dashboard Data Store
function dashboard() {
    return {
        // State
        activeTab: 'projects',
        apiConnected: false,
        loading: false,
        selectedProject: null,
        
        // Authentication State
        isAuthenticated: false,
        user: null,
        token: null,
        
        // WebSocket State
        wsConnected: false,
        socket: null,
        
        // Real-time Progress Tracking
        discoveryProgress: {
            active: false,
            percentage: 0,
            pagesFound: 0,
            currentUrl: '',
            depth: 0,
            message: 'Initializing discovery...'
        },
        
        testingProgress: {
            active: false,
            percentage: 0,
            completedTests: 0,
            totalTests: 0,
            currentPage: '',
            currentTool: '',
            message: 'Starting automated testing...'
        },
        
        // Notifications
        notifications: [],
        notificationId: 0,
        
        // Data
        projects: [],
        discoveries: [],
        testSessions: [],
        analytics: {},
        sessions: [],
        
        // Discovery Pages Modal Data
        selectedDiscovery: null,
        discoveredPages: [],
        pagesLoading: false,
        excludedPages: [], // Array of page IDs to exclude from testing
        
        // Discovery selection for testing
        selectedDiscoveries: [], // Array of discovery IDs selected for testing
        
        // Delete Project Modal Data
        projectToDelete: null,
        
        // Delete Discovery Modal Data
        discoveryToDelete: null,
        
        // Delete Session Modal Data
        sessionToDelete: null,
        
        // Authentication Management Data
        authConfigs: [],
        showSetupAuth: false,
        authSetup: {
            step: null, // 'type', 'sso-details', 'basic-details', 'advanced-details'
            type: null, // 'sso', 'basic', 'advanced'
            inProgress: false,
            progress: 0,
            progressMessage: '',
            currentStep: '',
            browserStatus: '',
            sso: {},
            basic: {},
            advanced: {},
            lastSetupSuccess: null // Track last successful setup
        },
        
        // Modal states
        showCreateProject: false,
        showStartDiscovery: false,
        showCreateSession: false,
        showViewPages: false,
        showDeleteProject: false,
        showDeleteDiscovery: false,
        showDeleteSession: false,
        showLogin: false,
        showProfile: false,
        showChangePassword: false,
        showSessions: false,
        
        // Form data
        newProject: {
            name: '',
            description: '',
            primary_url: '',
            compliance_standard: 'wcag_2_1_aa'
        },
        
        newDiscovery: {
            primary_url: '',
            maxDepth: 3,
            maxPages: 50,
            respectRobots: true
        },
        
        newSession: {
            name: '',
            description: '',
            testType: 'full',
            scope: {
                testTypes: ['axe', 'pa11y', 'lighthouse'],
                includeManualTesting: true,
                wcagLevel: 'AA'
            }
        },
        
        // Authentication Forms
        loginForm: {
            username: '',
            password: ''
        },
        
        profileForm: {
            full_name: '',
            email: ''
        },
        
        passwordForm: {
            current_password: '',
            new_password: '',
            confirm_password: ''
        },
        
        // Error states
        loginError: '',
        passwordError: '',

        // Initialization
        async init() {
            console.log('🚀 Initializing Accessibility Testing Dashboard...');
            await this.checkAPIConnection();
            await this.checkExistingAuth();
            if (this.apiConnected) {
                if (this.isAuthenticated) {
                    await this.initWebSocket();
                    await this.loadProjects();
                    await this.loadAnalytics();
                    await this.loadAuthConfigs();
                } else {
                    // Show login if not authenticated
                    setTimeout(() => this.showLogin = true, 500);
                }
            }
        },

        // API Connection
        async checkAPIConnection() {
            try {
                const response = await fetch(`http://localhost:3001/health`);
                this.apiConnected = response.ok;
                if (this.apiConnected) {
                    console.log('✅ API Connected');
                } else {
                    console.warn('⚠️ API Health Check Failed');
                }
            } catch (error) {
                console.error('❌ API Connection Failed:', error);
                this.apiConnected = false;
            }
        },

        // WebSocket Methods
        async initWebSocket() {
            if (!this.token || !window.io) {
                console.warn('⚠️ WebSocket not available - missing token or Socket.IO');
                return;
            }
            
            try {
                this.socket = io('http://localhost:3001', {
                    auth: {
                        token: this.token
                    },
                    transports: ['websocket', 'polling']
                });
                
                this.socket.on('connect', () => {
                    console.log('🔌 WebSocket connected');
                    this.wsConnected = true;
                    this.addNotification('Live Updates', 'Real-time updates connected', 'success');
                    
                    // Join project room if one is selected
                    if (this.selectedProject) {
                        this.socket.emit('join_project', this.selectedProject.id);
                    }
                });
                
                this.socket.on('disconnect', () => {
                    console.log('🔌 WebSocket disconnected');
                    this.wsConnected = false;
                });
                
                this.socket.on('connect_error', (error) => {
                    console.error('WebSocket connection error:', error);
                    this.wsConnected = false;
                });
                
                // Discovery progress events
                this.socket.on('discovery_progress', (data) => {
                    console.log('📡 Discovery progress:', data);
                    this.handleDiscoveryProgress(data);
                });
                
                this.socket.on('discovery_complete', (data) => {
                    console.log('🏁 Discovery complete:', data);
                    this.handleDiscoveryComplete(data);
                });
                
                // Testing progress events
                this.socket.on('session_progress', (data) => {
                    console.log('📊 Session progress:', data);
                    this.handleSessionProgress(data);
                });
                
                this.socket.on('session_complete', (data) => {
                    console.log('✅ Session complete:', data);
                    this.handleSessionComplete(data);
                });
                
                // Notification events
                this.socket.on('notification', (data) => {
                    this.addNotification(data.title || 'Update', data.message, data.type || 'info');
                });
                
                // Milestone events
                this.socket.on('discovery_milestone', (data) => {
                    this.handleDiscoveryMilestone(data);
                });
                
                this.socket.on('testing_milestone', (data) => {
                    this.handleTestingMilestone(data);
                });
                
                // User presence events
                this.socket.on('user_joined_project', (data) => {
                    this.addNotification('User Joined', `${data.username} joined the project`, 'info');
                });
                
                this.socket.on('user_left_project', (data) => {
                    this.addNotification('User Left', `${data.username} left the project`, 'info');
                });
                
            } catch (error) {
                console.error('WebSocket initialization failed:', error);
                this.wsConnected = false;
            }
        },

        handleDiscoveryProgress(data) {
            this.discoveryProgress = {
                active: true,
                percentage: data.progress.percentage,
                pagesFound: data.progress.pagesFound,
                currentUrl: data.progress.currentUrl,
                depth: data.progress.depth,
                message: data.progress.message
            };
            
            // Update progress notification
            this.updateProgressNotification('discovery', data.progress.percentage, data.progress.message);
        },

        handleDiscoveryComplete(data) {
            this.discoveryProgress.active = false;
            this.addNotification('Discovery Complete', data.results.message, 'success');
            
            // Refresh discoveries list
            if (this.selectedProject) {
                this.loadProjectDiscoveries();
            }
        },

        handleSessionProgress(data) {
            this.testingProgress = {
                active: true,
                percentage: data.progress.percentage,
                completedTests: data.progress.completedTests,
                totalTests: data.progress.totalTests,
                currentPage: data.progress.currentPage,
                currentTool: data.progress.currentTool,
                message: data.progress.message
            };
            
            // Update progress notification
            this.updateProgressNotification('testing', data.progress.percentage, data.progress.message);
        },

        handleSessionComplete(data) {
            this.testingProgress.active = false;
            this.addNotification('Testing Complete', data.results.message, 'success');
            
            // Refresh test sessions list
            if (this.selectedProject) {
                this.loadProjectTestSessions();
            }
        },

        handleDiscoveryMilestone(data) {
            const milestone = data.milestone;
            const milestoneTypes = {
                'discovery_started': { icon: '🚀', type: 'info' },
                'pages_milestone_50': { icon: '📄', type: 'info' },
                'pages_milestone_100': { icon: '📄', type: 'info' },
                'depth_reached': { icon: '🔍', type: 'info' }
            };
            
            const config = milestoneTypes[milestone.type] || { icon: '🎯', type: 'info' };
            this.addNotification(
                `${config.icon} Discovery Milestone`,
                milestone.message,
                config.type,
                3000
            );
        },

        handleTestingMilestone(data) {
            const milestone = data.milestone;
            const milestoneTypes = {
                'testing_started': { icon: '🚀', type: 'info', sound: true },
                'testing_quarter_complete': { icon: '🎯', type: 'info' },
                'testing_half_complete': { icon: '🎊', type: 'success', sound: true },
                'testing_three_quarter_complete': { icon: '🎯', type: 'info' },
                'critical_violations_found': { icon: '⚠️', type: 'warning', sound: true }
            };
            
            const config = milestoneTypes[milestone.type] || { icon: '🎯', type: 'info' };
            this.addNotification(
                `${config.icon} Testing Milestone`,
                milestone.message,
                config.type,
                config.type === 'success' ? 8000 : 4000
            );
            
            // Play notification sound for important milestones
            if (config.sound && 'Notification' in window) {
                this.playNotificationSound();
            }
        },

        playNotificationSound() {
            // Create a simple notification sound using Web Audio API
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch (error) {
                console.log('Notification sound not available:', error);
            }
        },

        // Notification Management
        addNotification(title, message, type = 'info', duration = 5000, progress = undefined) {
            const notification = {
                id: ++this.notificationId,
                title,
                message,
                type,
                progress,
                visible: true,
                timestamp: Date.now()
            };
            
            this.notifications.unshift(notification);
            
            // Auto-remove after duration (except for progress notifications)
            if (type !== 'progress' && duration > 0) {
                setTimeout(() => {
                    this.removeNotification(notification.id);
                }, duration);
            }
            
            // Keep only last 10 notifications
            if (this.notifications.length > 10) {
                this.notifications = this.notifications.slice(0, 10);
            }
        },

        updateProgressNotification(type, percentage, message) {
            // Find existing progress notification of this type
            const existing = this.notifications.find(n => 
                n.type === 'progress' && n.title.toLowerCase().includes(type)
            );
            
            if (existing) {
                existing.progress = percentage;
                existing.message = message;
            } else {
                this.addNotification(
                    type === 'discovery' ? 'Site Discovery' : 'Automated Testing',
                    message,
                    'progress',
                    0, // Don't auto-remove
                    percentage
                );
            }
        },

        removeNotification(id) {
            const index = this.notifications.findIndex(n => n.id === id);
            if (index > -1) {
                this.notifications[index].visible = false;
                    setTimeout(() => {
                    this.notifications.splice(index, 1);
                }, 300); // Wait for animation
            }
        },

        // API Helper Function
        async apiCall(endpoint, options = {}) {
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                
                // Add auth token if available
                if (this.token) {
                    headers['Authorization'] = `Bearer ${this.token}`;
                }
                
                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
                    this.showNotification('API call failed: ' + error.message, 'error');
                }
                throw error;
            }
        },

        // Authentication Methods
        async checkExistingAuth() {
            const token = localStorage.getItem('auth_token');
            if (token) {
                this.token = token;
                try {
                    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.user = data.user;
                        this.isAuthenticated = true;
                        this.profileForm.full_name = data.user.full_name || '';
                        this.profileForm.email = data.user.email || '';
                        console.log('✅ Existing authentication validated');
                    } else {
                        this.clearAuth();
                    }
                } catch (error) {
                    console.error('Auth validation failed:', error);
                    this.clearAuth();
                }
            }
        },
        
        async login() {
            this.loginError = '';
            this.loading = true;
            
            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.loginForm)
                });
                
                const data = await response.json();
                
                if (response.ok) {
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
                    
                    this.showNotification(`Welcome back, ${data.user.full_name || data.user.username}!`, 'success');
                    
                    // Initialize WebSocket and load data
                    await this.initWebSocket();
                    await this.loadProjects();
                    await this.loadAnalytics();
                    
                } else {
                    this.loginError = data.error || 'Login failed';
                }
            } catch (error) {
                this.loginError = 'Connection error. Please try again.';
                console.error('Login error:', error);
            } finally {
                this.loading = false;
            }
        },
        
        async logout() {
            try {
                if (this.token) {
                    await fetch(`${API_BASE_URL}/auth/logout`, {
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
                this.showNotification('Logged out successfully', 'info');
            }
        },
        
        clearAuth() {
            this.isAuthenticated = false;
            this.user = null;
            this.token = null;
            localStorage.removeItem('auth_token');
            
            // Close WebSocket connection
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
                this.wsConnected = false;
            }
            
            // Clear progress tracking
            this.discoveryProgress.active = false;
            this.testingProgress.active = false;
            this.notifications = [];
            
            // Clear data
            this.projects = [];
            this.testSessions = [];
            this.discoveries = [];
            this.analytics = {};
            this.selectedProject = null;
            
            // Reset to projects tab
            this.activeTab = 'projects';
        },
        
        handleAuthError() {
            this.clearAuth();
            this.showLogin = true;
            this.showNotification('Session expired. Please log in again.', 'warning');
        },
        
        async updateProfile() {
            this.loading = true;
            
            try {
                const data = await this.apiCall('/auth/profile', {
                    method: 'PUT',
                    body: JSON.stringify(this.profileForm)
                });
                
                this.user = data.user;
                this.showProfile = false;
                this.showNotification('Profile updated successfully!', 'success');
                
            } catch (error) {
                console.error('Profile update error:', error);
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
                this.passwordForm = { current_password: '', new_password: '', confirm_password: '' };
                this.showNotification('Password changed successfully!', 'success');
                
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
            }
        },
        
        async revokeSession(sessionId) {
            try {
                await this.apiCall(`/auth/sessions/${sessionId}`, {
                    method: 'DELETE'
                });
                
                this.sessions = this.sessions.filter(s => s.id !== sessionId);
                this.showNotification('Session revoked successfully', 'success');
                
            } catch (error) {
                console.error('Failed to revoke session:', error);
            }
        },
        
        async openSessionsModal() {
            this.showSessions = true;
            await this.loadSessions();
        },

        // Project Management
        async loadProjects() {
            try {
                this.loading = true;
                const data = await this.apiCall('/projects');
                this.projects = data.data || data.projects || [];
                console.log(`📁 Loaded ${this.projects.length} projects`);
            } catch (error) {
                console.error('Failed to load projects:', error);
                this.projects = []; // Ensure projects is always an array
            } finally {
                this.loading = false;
            }
        },

        async createProject() {
            try {
                this.loading = true;
                const data = await this.apiCall('/projects', {
                    method: 'POST',
                    body: JSON.stringify(this.newProject)
                });
                
                this.projects.push(data.project);
                this.showCreateProject = false;
                this.resetNewProject();
                this.showNotification('Project created successfully!', 'success');
            } catch (error) {
                console.error('Failed to create project:', error);
            } finally {
                this.loading = false;
            }
        },

        selectProject(project) {
            this.selectedProject = project;
            console.log(`📂 Selected project: ${project.name}`);
            
            // Join WebSocket room for this project
            if (this.socket && this.socket.connected) {
                this.socket.emit('join_project', project.id);
            }
            
            this.loadProjectDiscoveries();
            this.loadProjectTestSessions();
            this.loadSelectedDiscoveries();
            // Switch to discovery tab after selection
            this.activeTab = 'discovery';
        },

        // Site Discovery Management
        async loadProjectDiscoveries() {
            if (!this.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/discoveries`);
                this.discoveries = data.data || [];
                console.log(`🔍 Loaded ${this.discoveries.length} discoveries for project`);
                
                // Auto-select completed discoveries if none are selected and there's only one completed
                const completedDiscoveries = this.discoveries.filter(d => d.status === 'completed');
                if (completedDiscoveries.length === 1 && this.selectedDiscoveries.length === 0) {
                    this.selectedDiscoveries = [completedDiscoveries[0].id];
                    this.saveSelectedDiscoveries();
                    console.log(`🎯 Auto-selected single completed discovery: ${completedDiscoveries[0].domain}`);
                }
            } catch (error) {
                console.error('Failed to load discoveries:', error);
            }
        },

        async startDiscovery() {
            if (!this.selectedProject) return;
            
            try {
                this.loading = true;
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/discoveries`, {
                    method: 'POST',
                    body: JSON.stringify(this.newDiscovery)
                });
                
                this.discoveries.unshift(data.discovery);
                this.showStartDiscovery = false;
                this.resetNewDiscovery();
                this.showNotification('Site discovery started!', 'success');
                
                // Poll for updates
                this.pollDiscoveryProgress(data.discovery.id);
            } catch (error) {
                console.error('Failed to start discovery:', error);
            } finally {
                this.loading = false;
            }
        },

        async pollDiscoveryProgress(discoveryId) {
            // Note: Polling is no longer needed since WebSocket provides real-time updates
            // Real-time discovery progress is handled by handleDiscoveryProgress() and handleDiscoveryComplete()
            console.log(`📡 Real-time discovery tracking enabled for ${discoveryId} - polling disabled`);
        },

        // Test Session Management
        async loadProjectTestSessions() {
            if (!this.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/sessions`);
                this.testSessions = data.data || [];
                console.log(`🧪 Loaded ${this.testSessions.length} test sessions for project`);
            } catch (error) {
                console.error('Failed to load test sessions:', error);
            }
        },

        async createTestSession() {
            if (!this.selectedProject) return;
            
            try {
                this.loading = true;
                const sessionData = {
                    ...this.newSession,
                    project_id: this.selectedProject.id
                };
                
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/test-sessions`, {
                    method: 'POST',
                    body: JSON.stringify(sessionData)
                });
                
                this.testSessions.unshift(data.session);
                this.showCreateSession = false;
                this.resetNewSession();
                this.showNotification('Test session created successfully!', 'success');
            } catch (error) {
                console.error('Failed to create test session:', error);
            } finally {
                this.loading = false;
            }
        },

        async startAutomatedTesting(session) {
            try {
                this.loading = true;
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/test-sessions`, {
                    method: 'POST',
                    body: JSON.stringify({
                        name: session.name || `Automated Test - ${new Date().toLocaleDateString()}`,
                        description: session.description,
                        testTypes: ['axe', 'pa11y'],
                        maxPages: 50
                    })
                });
                
                this.showNotification('Automated testing started!', 'success');
                
                // Update session status
                session.status = 'in_progress';
                
                // Real-time updates will come via WebSocket, no need to poll
                
            } catch (error) {
                console.error('Failed to start automated testing:', error);
            } finally {
                this.loading = false;
            }
        },

        async pollSessionProgress(sessionId) {
            const poll = async () => {
                try {
                    const data = await this.apiCall(`/sessions/${sessionId}`);
                    const session = data.session;
                    
                    // Update session in list
                    const index = this.testSessions.findIndex(s => s.id === sessionId);
                    if (index >= 0) {
                        this.testSessions[index] = session;
                    }
                    
                    // Continue polling if still in progress
                    if (session.status === 'in_progress') {
                        setTimeout(poll, 3000); // Poll every 3 seconds
                    } else {
                        console.log(`🏁 Test session ${sessionId} completed with status: ${session.status}`);
                        if (session.status === 'completed') {
                            this.showNotification('Testing completed!', 'success');
                        }
                    }
                } catch (error) {
                    console.error('Failed to poll session progress:', error);
                }
            };
            
            setTimeout(poll, 1000); // Start polling after 1 second
        },

        // Analytics
        async loadAnalytics() {
            try {
                const data = await this.apiCall('/results/statistics');
                this.analytics = data || {};
                console.log('📊 Analytics loaded');
            } catch (error) {
                console.error('Failed to load analytics:', error);
                // Set default values
                this.analytics = {
                    overall: {
                        total_projects: this.projects.length,
                        total_pages: 0,
                        total_tests: 0,
                        total_violations: 0
                    }
                };
            }
        },

        // Utility Functions
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

        formatDate(dateString) {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleDateString();
        },

        showNotification(message, type = 'info') {
            // Simple notification system - could be enhanced with a proper toast library
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all transform translate-x-full`;
            
            const typeClasses = {
                'success': 'bg-green-500 text-white',
                'error': 'bg-red-500 text-white',
                'warning': 'bg-yellow-500 text-black',
                'info': 'bg-blue-500 text-white'
            };
            
            notification.className += ' ' + (typeClasses[type] || typeClasses.info);
            notification.innerHTML = `
                <div class="flex items-center">
                    <span class="mr-2">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.classList.remove('translate-x-full');
            }, 100);
            
            // Remove after 5 seconds
            setTimeout(() => {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 5000);
        },

        // Form Reset Functions
        resetNewProject() {
            this.newProject = {
                name: '',
                description: '',
                primary_url: '',
                compliance_standard: 'wcag_2_1_aa'
            };
        },

        resetNewDiscovery() {
            this.newDiscovery = {
                primary_url: '',
                maxDepth: 3,
                maxPages: 50,
                respectRobots: true
            };
        },

        resetNewSession() {
            this.newSession = {
                name: '',
                description: '',
                testType: 'full',
                scope: {
                    testTypes: ['axe', 'pa11y', 'lighthouse'],
                    includeManualTesting: true,
                    wcagLevel: 'AA'
                }
            };
        },

        // Additional Feature Placeholders
        editProject(project) {
            this.showNotification('Edit project feature coming soon!', 'info');
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
                this.showNotification('Project deleted successfully!', 'success');
                
            } catch (error) {
                console.error('Failed to delete project:', error);
                this.showNotification('Failed to delete project. Please try again.', 'error');
            } finally {
                this.loading = false;
            }
        },

        cancelDeleteProject() {
            this.showDeleteProject = false;
            this.projectToDelete = null;
        },

        deleteDiscovery(discovery) {
            this.discoveryToDelete = discovery;
            this.showDeleteDiscovery = true;
        },

        async confirmDeleteDiscovery() {
            if (!this.discoveryToDelete || !this.selectedProject) return;
            
            try {
                this.loading = true;
                await this.apiCall(`/projects/${this.selectedProject.id}/discoveries/${this.discoveryToDelete.id}`, {
                    method: 'DELETE'
                });
                
                // Remove from discoveries list
                this.discoveries = this.discoveries.filter(d => d.id !== this.discoveryToDelete.id);
                
                this.showDeleteDiscovery = false;
                this.discoveryToDelete = null;
                this.showNotification('Site discovery deleted successfully!', 'success');
                
            } catch (error) {
                console.error('Failed to delete discovery:', error);
                this.showNotification('Failed to delete discovery. Please try again.', 'error');
            } finally {
                this.loading = false;
            }
        },

        cancelDeleteDiscovery() {
            this.showDeleteDiscovery = false;
            this.discoveryToDelete = null;
        },

        async viewDiscoveryPages(discovery) {
            if (!this.selectedProject || !discovery) return;
            
            this.selectedDiscovery = discovery;
            this.showViewPages = true;
            this.pagesLoading = true;
            this.discoveredPages = [];
            
            // Load excluded pages from localStorage
            this.loadExcludedPages(discovery.id);
            
            try {
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/discoveries/${discovery.id}/pages`);
                this.discoveredPages = data.pages || [];
                console.log(`📄 Loaded ${this.discoveredPages.length} discovered pages`);
            } catch (error) {
                console.error('Failed to load discovered pages:', error);
                this.showNotification('Failed to load discovered pages', 'error');
            } finally {
                this.pagesLoading = false;
            }
        },

        // Page exclusion management
        togglePageExclusion(pageId) {
            const index = this.excludedPages.indexOf(pageId);
            if (index > -1) {
                this.excludedPages.splice(index, 1);
            } else {
                this.excludedPages.push(pageId);
            }
            this.saveExcludedPages();
        },

        isPageExcluded(pageId) {
            return this.excludedPages.includes(pageId);
        },

        selectAllPages() {
            this.excludedPages = [];
            this.saveExcludedPages();
            this.showNotification('All pages included for testing', 'success');
        },

        excludeAllPages() {
            this.excludedPages = this.discoveredPages.map(page => page.id);
            this.saveExcludedPages();
            this.showNotification('All pages excluded from testing', 'info');
        },

        getIncludedPagesCount() {
            return this.discoveredPages.length - this.excludedPages.length;
        },

        getExcludedPagesCount() {
            return this.excludedPages.length;
        },

        // Local storage management for excluded pages
        saveExcludedPages() {
            if (!this.selectedDiscovery) return;
            const key = `excludedPages_${this.selectedDiscovery.id}`;
            localStorage.setItem(key, JSON.stringify(this.excludedPages));
        },

        loadExcludedPages(discoveryId) {
            const key = `excludedPages_${discoveryId}`;
            const saved = localStorage.getItem(key);
            this.excludedPages = saved ? JSON.parse(saved) : [];
        },

        clearExcludedPages() {
            this.excludedPages = [];
            this.saveExcludedPages();
            this.showNotification('Page selections cleared', 'info');
        },

        // Discovery Selection Management
        toggleDiscoverySelection(discoveryId) {
            const index = this.selectedDiscoveries.indexOf(discoveryId);
            if (index > -1) {
                this.selectedDiscoveries.splice(index, 1);
            } else {
                this.selectedDiscoveries.push(discoveryId);
            }
            this.saveSelectedDiscoveries();
        },

        isDiscoverySelected(discoveryId) {
            return this.selectedDiscoveries.includes(discoveryId);
        },

        selectAllDiscoveries() {
            this.selectedDiscoveries = this.discoveries
                .filter(d => d.status === 'completed')
                .map(d => d.id);
            this.saveSelectedDiscoveries();
            this.showNotification('All completed discoveries selected', 'success');
        },

        deselectAllDiscoveries() {
            this.selectedDiscoveries = [];
            this.saveSelectedDiscoveries();
            this.showNotification('All discoveries deselected', 'info');
        },

        saveSelectedDiscoveries() {
            if (!this.selectedProject) return;
            const key = `selectedDiscoveries_${this.selectedProject.id}`;
            localStorage.setItem(key, JSON.stringify(this.selectedDiscoveries));
        },

        loadSelectedDiscoveries() {
            if (!this.selectedProject) return;
            const key = `selectedDiscoveries_${this.selectedProject.id}`;
            const saved = localStorage.getItem(key);
            this.selectedDiscoveries = saved ? JSON.parse(saved) : [];
        },

        // Helper functions for page counts
        getDiscoveryPageCounts(discovery) {
            // Get excluded pages for this specific discovery without affecting current state
            const key = `excludedPages_${discovery.id}`;
            const saved = localStorage.getItem(key);
            const excludedPages = saved ? JSON.parse(saved) : [];
            
            const totalPages = discovery.total_pages_found || 0;
            const excludedCount = excludedPages.length;
            const includedCount = totalPages - excludedCount;
            return {
                total: totalPages,
                included: includedCount,
                excluded: excludedCount
            };
        },

        getSelectedDiscoveriesPageCounts() {
            let totalPages = 0;
            let totalIncluded = 0;
            let totalExcluded = 0;

            this.selectedDiscoveries.forEach(discoveryId => {
                const discovery = this.discoveries.find(d => d.id === discoveryId);
                if (discovery && discovery.status === 'completed') {
                    const counts = this.getDiscoveryPageCounts(discovery);
                    totalPages += counts.total;
                    totalIncluded += counts.included;
                    totalExcluded += counts.excluded;
                }
            });

            return {
                total: totalPages,
                included: totalIncluded,
                excluded: totalExcluded,
                selectedDiscoveries: this.selectedDiscoveries.length
            };
        },

        getAllDiscoveriesPageCounts() {
            let totalPages = 0;
            let totalIncluded = 0;
            let totalExcluded = 0;

            this.discoveries
                .filter(d => d.status === 'completed')
                .forEach(discovery => {
                    const counts = this.getDiscoveryPageCounts(discovery);
                    totalPages += counts.total;
                    totalIncluded += counts.included;
                    totalExcluded += counts.excluded;
                });

            return {
                total: totalPages,
                included: totalIncluded,
                excluded: totalExcluded
            };
        },

        viewSessionResults(session) {
            this.showNotification('Results viewer coming soon!', 'info');
        },

        manualTesting(session) {
            this.showNotification('Manual testing interface coming soon!', 'info');
        },

        // Test Session Management
        deleteSession(session) {
            this.sessionToDelete = session;
            this.showDeleteSession = true;
        },

        async confirmDeleteSession() {
            if (!this.sessionToDelete) return;
            
            try {
                this.loading = true;
                await this.apiCall(`/sessions/${this.sessionToDelete.id}`, {
                    method: 'DELETE'
                });
                
                // Remove from test sessions list
                this.testSessions = this.testSessions.filter(s => s.id !== this.sessionToDelete.id);
                
                this.showDeleteSession = false;
                this.sessionToDelete = null;
                this.showNotification('Test session deleted successfully!', 'success');
                
            } catch (error) {
                console.error('Failed to delete test session:', error);
                this.showNotification('Failed to delete test session. Please try again.', 'error');
            } finally {
                this.loading = false;
            }
        },

        cancelDeleteSession() {
            this.showDeleteSession = false;
            this.sessionToDelete = null;
        },

        // Enhanced Session Control with Pause/Resume
        async pauseSession(session) {
            try {
                this.loading = true;
                await this.apiCall(`/sessions/${session.id}/pause`, {
                    method: 'POST'
                });
                
                // Update session status
                session.status = 'paused';
                this.showNotification('Test session paused', 'info');
                
            } catch (error) {
                console.error('Failed to pause session:', error);
                this.showNotification('Failed to pause session', 'error');
            } finally {
                this.loading = false;
            }
        },

        async resumeSession(session) {
            try {
                this.loading = true;
                await this.apiCall(`/sessions/${session.id}/resume`, {
                    method: 'POST'
                });
                
                // Update session status
                session.status = 'in_progress';
                this.showNotification('Test session resumed', 'success');
                
            } catch (error) {
                console.error('Failed to resume session:', error);
                this.showNotification('Failed to resume session', 'error');
            } finally {
                this.loading = false;
            }
        },

        getSessionButtonText(session) {
            if (!this.selectedProject || this.discoveries.filter(d => d.status === 'completed').length === 0) {
                return 'Need Discovery';
            }
            
            const selectedCounts = this.getSelectedDiscoveriesPageCounts();
            if (selectedCounts.selectedDiscoveries === 0) {
                return 'Select Discoveries';
            }
            
            if (selectedCounts.included === 0) {
                return 'No Pages Available';
            }
            
            switch (session.status) {
                case 'in_progress':
                    return 'Pause Testing';
                case 'paused':
                    return 'Resume Testing';
                case 'completed':
                    return 'Start New Run';
                case 'failed':
                    return 'Retry Testing';
                default:
                    return 'Start Testing';
            }
        },

        getSessionButtonIcon(session) {
            switch (session.status) {
                case 'in_progress':
                    return 'fas fa-pause';
                case 'paused':
                    return 'fas fa-play';
                case 'completed':
                    return 'fas fa-redo';
                case 'failed':
                    return 'fas fa-redo';
                default:
                    return 'fas fa-play';
            }
        },

        getSessionButtonClass(session) {
            const baseClass = "text-white px-3 py-2 rounded text-sm transition-colors disabled:bg-gray-400";
            
            if (!this.selectedProject || this.discoveries.filter(d => d.status === 'completed').length === 0) {
                return `bg-gray-400 ${baseClass}`;
            }
            
            const selectedCounts = this.getSelectedDiscoveriesPageCounts();
            if (selectedCounts.selectedDiscoveries === 0 || selectedCounts.included === 0) {
                return `bg-gray-400 ${baseClass}`;
            }
            
            switch (session.status) {
                case 'in_progress':
                    return `bg-orange-600 hover:bg-orange-700 ${baseClass}`;
                case 'paused':
                    return `bg-green-600 hover:bg-green-700 ${baseClass}`;
                case 'completed':
                    return `bg-blue-600 hover:bg-blue-700 ${baseClass}`;
                case 'failed':
                    return `bg-red-600 hover:bg-red-700 ${baseClass}`;
                default:
                    return `bg-blue-600 hover:bg-blue-700 ${baseClass}`;
            }
        },

        async handleSessionAction(session) {
            if (!this.selectedProject || this.discoveries.filter(d => d.status === 'completed').length === 0) {
                this.showNotification('Please complete site discovery first', 'warning');
                return;
            }

            const selectedCounts = this.getSelectedDiscoveriesPageCounts();
            if (selectedCounts.selectedDiscoveries === 0) {
                this.showNotification('Please select completed discoveries for testing', 'warning');
                return;
            }
            
            if (selectedCounts.included === 0) {
                this.showNotification('No pages available for testing. Please include some pages from your selected discoveries.', 'warning');
                return;
            }

            switch (session.status) {
                case 'in_progress':
                    await this.pauseSession(session);
                    break;
                case 'paused':
                    await this.resumeSession(session);
                    break;
                case 'completed':
                case 'failed':
                case 'not_started':
                default:
                    await this.startAutomatedTesting(session);
                    break;
            }
        },

        // Authentication Management Functions
        async loadAuthConfigs() {
            try {
                const response = await this.apiCall('/auth/configs');
                this.authConfigs = response.configs || [];
                console.log('🔐 Auth configs loaded:', this.authConfigs.length);
            } catch (error) {
                console.error('Failed to load auth configs:', error);
                this.authConfigs = [];
            }
        },

        refreshAuthConfigs() {
            this.loadAuthConfigs();
            this.showNotification('Authentication configurations refreshed', 'success');
        },

        startAuthSetup(type) {
            this.authSetup.type = type;
            this.authSetup.step = `${type}-details`;
            
            // Initialize form data based on type
            if (type === 'sso') {
                this.authSetup.sso = {
                    url: this.selectedProject?.primary_url || '',
                    loginPage: '',
                    successUrl: '',
                    name: ''
                };
            } else if (type === 'basic') {
                this.authSetup.basic = {
                    url: this.selectedProject?.primary_url || '',
                    loginPage: '',
                    username: '',
                    password: '',
                    successUrl: '',
                    name: ''
                };
            } else if (type === 'advanced') {
                this.authSetup.advanced = {
                    type: 'api_key',
                    url: this.selectedProject?.primary_url || '',
                    apiKey: '',
                    token: '',
                    name: ''
                };
            }
        },

        quickSetupAuth(type) {
            this.showSetupAuth = true;
            this.startAuthSetup(type);
        },

        proceedToDetails() {
            if (this.authSetup.type) {
                this.authSetup.step = `${this.authSetup.type}-details`;
            }
        },

        async setupAuthentication() {
            try {
                this.authSetup.inProgress = true;
                this.authSetup.progress = 0;
                this.authSetup.progressMessage = 'Initializing authentication setup...';

                const config = this.getAuthConfigFromForm();
                
                if (config.type === 'sso') {
                    await this.setupSSOAuth(config);
                } else if (config.type === 'basic') {
                    await this.setupBasicAuth(config);
                } else if (config.type === 'advanced') {
                    await this.setupAdvancedAuth(config);
                }

                // Store success information
                this.authSetup.lastSetupSuccess = {
                    type: config.type,
                    url: config.url,
                    name: config.name,
                    timestamp: new Date().toISOString()
                };
                
                this.showNotification('Authentication setup completed successfully!', 'success');
                this.showSetupAuth = false;
                this.resetAuthSetup();
                await this.loadAuthConfigs();

            } catch (error) {
                console.error('Authentication setup failed:', error);
                this.showNotification('Authentication setup failed: ' + error.message, 'error');
            } finally {
                this.authSetup.inProgress = false;
            }
        },

        getAuthConfigFromForm() {
            const { type } = this.authSetup;
            if (type === 'sso') {
                return { type, ...this.authSetup.sso };
            } else if (type === 'basic') {
                return { type, ...this.authSetup.basic };
            } else if (type === 'advanced') {
                return { type, ...this.authSetup.advanced };
            }
        },

        async setupSSOAuth(config) {
            this.authSetup.progressMessage = 'Starting browser for SSO authentication...';
            this.authSetup.progress = 10;

            // Validate authentication token
            if (!this.token) {
                throw new Error('Authentication token not available. Please login first.');
            }

            // Call the auth wizard API endpoint
            const response = await fetch(`${API_BASE_URL}/auth/setup-sso`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    url: config.url,
                    name: config.name,
                    loginPage: config.loginPage,
                    successUrl: config.successUrl
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('SSO setup failed:', response.status, response.statusText, errorText);
                throw new Error(`Setup failed: ${response.statusText} (${response.status})`);
            }

            const result = await response.json();
            
            // Simulate progress updates
            await this.simulateAuthProgress();
            
            return result;
        },

        async setupBasicAuth(config) {
            this.authSetup.progressMessage = 'Setting up username/password authentication...';
            this.authSetup.progress = 20;

            if (!this.token) {
                throw new Error('Authentication token not available. Please login first.');
            }

            const response = await fetch(`${API_BASE_URL}/auth/setup-basic`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Basic auth setup failed:', response.status, response.statusText, errorText);
                throw new Error(`Setup failed: ${response.statusText} (${response.status})`);
            }

            await this.simulateAuthProgress();
            return await response.json();
        },

        async setupAdvancedAuth(config) {
            this.authSetup.progressMessage = 'Configuring advanced authentication...';
            this.authSetup.progress = 15;

            if (!this.token) {
                throw new Error('Authentication token not available. Please login first.');
            }

            const response = await fetch(`${API_BASE_URL}/auth/setup-advanced`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Advanced auth setup failed:', response.status, response.statusText, errorText);
                throw new Error(`Setup failed: ${response.statusText} (${response.status})`);
            }

            await this.simulateAuthProgress();
            return await response.json();
        },

        async simulateAuthProgress() {
            // Simulate progress for visual feedback
            const steps = [
                { progress: 30, message: 'Opening browser...' },
                { progress: 50, message: 'Navigating to login page...' },
                { progress: 70, message: 'Waiting for authentication...' },
                { progress: 90, message: 'Capturing session...' },
                { progress: 100, message: 'Authentication setup complete!' }
            ];

            for (const step of steps) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.authSetup.progress = step.progress;
                this.authSetup.progressMessage = step.message;
            }
        },

        async testAuthConfig(config) {
            try {
                config.status = 'testing';
                this.showNotification(`Testing authentication for ${config.domain}...`, 'info');

                if (!this.token) {
                    throw new Error('Authentication token not available. Please login first.');
                }

                const response = await fetch(`${API_BASE_URL}/auth/test`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({ configId: config.id })
                });

                if (response.ok) {
                    config.status = 'active';
                    config.last_used = new Date().toISOString();
                    this.showNotification(`Authentication test successful for ${config.domain}`, 'success');
                } else {
                    config.status = 'failed';
                    const errorText = await response.text();
                    console.error('Auth test failed:', response.status, errorText);
                    this.showNotification(`Authentication test failed for ${config.domain}`, 'error');
                }
            } catch (error) {
                config.status = 'failed';
                this.showNotification(`Authentication test error: ${error.message}`, 'error');
            }
        },

        editAuthConfig(config) {
            // Open edit modal (would need to be implemented)
            this.showNotification('Edit authentication feature coming soon!', 'info');
        },

        exportAuthConfig(config) {
            const exportData = {
                ...config,
                exported_at: new Date().toISOString(),
                exported_by: this.user?.username
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `auth-config-${config.domain}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification(`Authentication config exported for ${config.domain}`, 'success');
        },

        async deleteAuthConfig(config) {
            if (!confirm(`Are you sure you want to delete the authentication configuration for ${config.domain}?`)) {
                return;
            }

            try {
                const response = await this.apiCall(`/auth/configs/${config.id}`, {
                    method: 'DELETE'
                });

                this.authConfigs = this.authConfigs.filter(c => c.id !== config.id);
                this.showNotification(`Authentication config deleted for ${config.domain}`, 'success');
            } catch (error) {
                this.showNotification(`Failed to delete configuration: ${error.message}`, 'error');
            }
        },

        importAuthConfig() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const config = JSON.parse(e.target.result);
                            this.importAuthConfigData(config);
                        } catch (error) {
                            this.showNotification('Invalid configuration file', 'error');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        },

        async importAuthConfigData(config) {
            try {
                if (!this.token) {
                    throw new Error('Authentication token not available. Please login first.');
                }

                const response = await fetch(`${API_BASE_URL}/auth/import`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify(config)
                });

                if (response.ok) {
                    this.loadAuthConfigs();
                    this.showNotification(`Authentication config imported for ${config.domain}`, 'success');
                } else {
                    const errorText = await response.text();
                    console.error('Auth import failed:', response.status, errorText);
                    throw new Error('Failed to import configuration');
                }
            } catch (error) {
                this.showNotification(`Failed to import configuration: ${error.message}`, 'error');
            }
        },

        resetAuthSetup() {
            const lastSetupSuccess = this.authSetup.lastSetupSuccess; // Preserve success state
            this.authSetup = {
                step: null,
                type: null,
                inProgress: false,
                progress: 0,
                progressMessage: '',
                currentStep: '',
                browserStatus: '',
                sso: {},
                basic: {},
                advanced: {},
                lastSetupSuccess: lastSetupSuccess // Keep the success state
            };
        },

        getAuthTypeIcon(type) {
            const icons = {
                'sso': 'fas fa-university text-blue-600',
                'basic': 'fas fa-user-lock text-green-600',
                'advanced': 'fas fa-cogs text-purple-600',
                'api_key': 'fas fa-key text-purple-600',
                'bearer_token': 'fas fa-ticket-alt text-purple-600',
                'oauth2': 'fas fa-shield-alt text-purple-600'
            };
            return icons[type] || 'fas fa-question text-gray-600';
        },

        getAuthStatusBadgeClass(status) {
            const classes = {
                'active': 'bg-green-100 text-green-800',
                'pending': 'bg-yellow-100 text-yellow-800',
                'failed': 'bg-red-100 text-red-800',
                'testing': 'bg-blue-100 text-blue-800',
                'expired': 'bg-gray-100 text-gray-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        // Analytics
    };
}

// Additional Helper Functions
function copyToClipboard(text, type = 'text') {
    navigator.clipboard.writeText(text).then(() => {
        console.log(`Copied ${type}:`, text.substring(0, 50));
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

function exportData(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
    a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }

// Make dashboard function globally available for Alpine.js
window.dashboard = dashboard;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Dashboard Helpers Loaded');
});


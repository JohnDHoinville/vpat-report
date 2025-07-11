// Modern Dashboard Helper Functions - Database API Integration
// Accessibility Testing Platform

// Alpine.js Dashboard Data Store
function dashboard() {
    return {
        // API Configuration
        API_BASE_URL: 'http://localhost:3001/api',
        
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
        
        // Violation Inspector Data
        showViolationInspector: false,
        violationInspectorSession: null,
        violations: [],
        violationSummary: {},
        selectedViolation: null,
        violationFilters: {
            severity: '',
            source: 'both',
            tool: '',
            wcag_level: '',
            wcag_criteria: '',
            page_url: '',
            violation_type: '',
            status: ''
        },
        violationSort: {
            by: 'severity',
            order: 'desc'
        },
        violationPagination: {
            limit: 50,
            offset: 0,
            total: 0,
            has_more: false
        },
        loadingViolations: false,
        
        // Authentication Management Data
        authConfigs: [],
        projectAuthConfigs: [], // Filtered auth configs for selected project
        showSetupAuth: false,
        showEditAuth: false,
        editingConfig: null,
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
        editAuthForm: {
            name: '',
            url: '',
            type: '',
            username: '',
            password: '',
            loginPage: '',
            successUrl: '',
            apiKey: '',
            token: ''
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
                discoveryId: data.discoveryId,
                percentage: data.progress.percentage,
                pagesFound: data.progress.pagesFound,
                currentUrl: data.progress.currentUrl,
                depth: data.progress.depth,
                message: data.progress.message,
                stage: data.progress.stage,
                estimatedTimeRemaining: data.progress.estimatedTimeRemaining,
                startTime: data.progress.startTime,
                errors: data.progress.errors,
                statistics: data.progress.statistics
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
                sessionId: data.sessionId,
                percentage: data.progress.percentage,
                completedTests: data.progress.completedTests,
                totalTests: data.progress.totalTests,
                currentPage: data.progress.currentPage,
                currentTool: data.progress.currentTool,
                message: data.progress.message,
                stage: data.progress.stage,
                estimatedTimeRemaining: data.progress.estimatedTimeRemaining,
                startTime: data.progress.startTime,
                errors: data.progress.errors,
                violationsFound: data.progress.violationsFound,
                passesFound: data.progress.passesFound,
                warningsFound: data.progress.warningsFound,
                statistics: data.progress.statistics
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

        // Enhanced Progress Tracking Methods
        formatProgressTime(seconds) {
            if (!seconds || seconds < 0) return 'calculating...';
            
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
                return `${hours}h ${minutes}m ${secs}s`;
            } else if (minutes > 0) {
                return `${minutes}m ${secs}s`;
            } else {
                return `${secs}s`;
            }
        },

        getProgressETA(progress, startTime) {
            if (!progress || !startTime || progress.percentage <= 0) return null;
            
            const now = new Date();
            const elapsed = (now - new Date(startTime)) / 1000; // seconds
            const rate = progress.percentage / elapsed;
            const remaining = (100 - progress.percentage) / rate;
            
            return remaining > 0 ? remaining : null;
        },

        getProgressStats(progress) {
            if (!progress.active) return null;
            
            const stats = {
                duration: progress.startTime ? Math.floor((new Date() - new Date(progress.startTime)) / 1000) : 0,
                eta: this.getProgressETA(progress, progress.startTime),
                stage: progress.stage,
                items: progress.completedTests || progress.pagesFound || 0,
                total: progress.totalTests || progress.statistics?.urlsQueued || 0
            };
            
            return stats;
        },

        // Real-time Milestone Handlers
        handleDiscoveryMilestone(data) {
            const milestone = data.milestone;
            let message = '';
            let type = 'info';
            
            switch (milestone.type) {
                case 'depth_complete':
                    message = `Completed crawling depth ${milestone.depth} - found ${milestone.pagesFound} pages`;
                    type = 'success';
                    break;
                case 'large_site_detected':
                    message = `Large site detected (${milestone.totalPages}+ pages). Consider adjusting maxPages setting.`;
                    type = 'warning';
                    break;
                case 'robots_blocking':
                    message = `Some pages blocked by robots.txt. ${milestone.blockedCount} URLs skipped.`;
                    type = 'warning';
                    break;
                case 'error_threshold':
                    message = `High error rate detected (${milestone.errorRate}%). Checking connectivity...`;
                    type = 'error';
                    break;
                default:
                    message = milestone.message || 'Discovery milestone reached';
            }
            
            this.addNotification('Discovery Update', message, type, 8000);
        },

        handleTestingMilestone(data) {
            const milestone = data.milestone;
            let message = '';
            let type = 'info';
            
            switch (milestone.type) {
                case 'tool_complete':
                    message = `${milestone.tool} testing completed - ${milestone.violationsFound} violations found`;
                    type = 'success';
                    break;
                case 'high_violations':
                    message = `High number of violations detected (${milestone.count}). Consider reviewing accessibility practices.`;
                    type = 'warning';
                    break;
                case 'critical_violation':
                    message = `Critical accessibility violation found: ${milestone.description}`;
                    type = 'error';
                    break;
                case 'progress_25':
                case 'progress_50':
                case 'progress_75':
                    const percent = milestone.type.split('_')[1];
                    message = `Testing ${percent}% complete - ${milestone.violationsFound} violations found so far`;
                    type = 'info';
                    break;
                default:
                    message = milestone.message || 'Testing milestone reached';
            }
            
            this.addNotification('Testing Update', message, type, 8000);
        },

        // Enhanced Error Handling
        handleProgressError(type, error) {
            console.error(`${type} progress error:`, error);
            
            if (type === 'discovery') {
                this.discoveryProgress.errors.push({
                    timestamp: new Date().toISOString(),
                    message: error.message || 'Unknown error',
                    url: error.url,
                    type: error.type || 'general'
                });
            } else if (type === 'testing') {
                this.testingProgress.errors.push({
                    timestamp: new Date().toISOString(),
                    message: error.message || 'Unknown error',
                    page: error.page,
                    tool: error.tool,
                    type: error.type || 'general'
                });
            }
            
            this.addNotification(`${type} Error`, error.message || 'An error occurred', 'error', 10000);
        },

        // Progress State Management
        resetDiscoveryProgress() {
            this.discoveryProgress = {
                active: false,
                discoveryId: null,
                percentage: 0,
                pagesFound: 0,
                currentUrl: '',
                depth: 0,
                maxDepth: 3,
                message: 'Initializing discovery...',
                stage: 'starting',
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
            };
        },

        resetTestingProgress() {
            this.testingProgress = {
                active: false,
                sessionId: null,
                percentage: 0,
                completedTests: 0,
                totalTests: 0,
                currentPage: '',
                currentTool: '',
                message: 'Starting automated testing...',
                stage: 'preparing',
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
            };
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
                existing.timestamp = new Date().toISOString();
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
                
                const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
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
                    const response = await fetch(`${this.API_BASE_URL}/auth/profile`, {
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
                const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
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
                    await fetch(`${this.API_BASE_URL}/auth/logout`, {
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
                this.showNotification('Project created successfully!', 'success');
            } catch (error) {
                console.error('Failed to create project:', error);
                this.showNotification(error.message || 'Failed to create project', 'error');
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
            this.loadProjectAuthConfigs();
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
                
                // Normalize the URL by adding protocol if missing
                let normalizedUrl = this.newDiscovery.primary_url.trim();
                if (normalizedUrl && !normalizedUrl.match(/^https?:\/\//)) {
                    // Default to HTTPS for security
                    normalizedUrl = `https://${normalizedUrl}`;
                }
                
                // Create discovery data with normalized URL
                const discoveryData = {
                    ...this.newDiscovery,
                    primary_url: normalizedUrl
                };
                
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/discoveries`, {
                    method: 'POST',
                    body: JSON.stringify(discoveryData)
                });
                
                this.discoveries.unshift(data.discovery);
                this.showStartDiscovery = false;
                this.resetNewDiscovery();
                this.showNotification('Site discovery started!', 'success');
                
                // Poll for updates
                this.pollDiscoveryProgress(data.discovery.id);
            } catch (error) {
                console.error('Failed to start discovery:', error);
                this.showNotification(error.message || 'Failed to start discovery', 'error');
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

        openStartDiscoveryModal() {
            this.showStartDiscovery = true;
            // Auto-populate the primary URL from the selected project
            if (this.selectedProject && this.selectedProject.primary_url) {
                this.newDiscovery.primary_url = this.selectedProject.primary_url;
            }
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

        closeViewPagesModal() {
            this.showViewPages = false;
            this.selectedDiscovery = null;
            this.discoveredPages = [];
            this.excludedPages = [];
            
            // Refresh Testing tab data when closing the modal
            this.refreshTestingTabData();
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
            
            // Trigger real-time updates for Testing tab
            this.refreshTestingTabData();
        },

        isPageExcluded(pageId) {
            return this.excludedPages.includes(pageId);
        },

        selectAllPages() {
            this.excludedPages = [];
            this.saveExcludedPages();
            this.refreshTestingTabData();
            this.showNotification('All pages included for testing', 'success');
        },

        excludeAllPages() {
            this.excludedPages = this.discoveredPages.map(page => page.id);
            this.saveExcludedPages();
            this.refreshTestingTabData();
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
            
            // Trigger real-time updates for Testing tab
            this.refreshTestingTabData();
        },

        isDiscoverySelected(discoveryId) {
            return this.selectedDiscoveries.includes(discoveryId);
        },

        selectAllDiscoveries() {
            this.selectedDiscoveries = this.discoveries
                .filter(d => d.status === 'completed')
                .map(d => d.id);
            this.saveSelectedDiscoveries();
            this.refreshTestingTabData();
            this.showNotification('All completed discoveries selected', 'success');
        },

        deselectAllDiscoveries() {
            this.selectedDiscoveries = [];
            this.saveSelectedDiscoveries();
            this.refreshTestingTabData();
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

        // Refresh Testing tab data when selections change
        refreshTestingTabData() {
            // Force reactivity update by creating new objects
            this.selectedDiscoveries = [...this.selectedDiscoveries];
            
            // Reload selected discoveries from localStorage to ensure consistency
            this.loadSelectedDiscoveries();
            
            // Force recalculation of page counts by calling the function
            // This ensures the Testing tab shows up-to-date counts
            const currentCounts = this.getSelectedDiscoveriesPageCounts();
            
            console.log(`🔄 Testing tab data refreshed: ${currentCounts.selectedDiscoveries} discoveries, ${currentCounts.included} pages for testing`);
        },

        viewSessionResults(session) {
            this.openViolationInspector(session);
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
                // Filter for current project if one is selected
                if (this.selectedProject) {
                    this.filterAuthConfigsForProject();
                }
            } catch (error) {
                console.error('Failed to load auth configs:', error);
                this.authConfigs = [];
                this.projectAuthConfigs = [];
            }
        },

        async loadProjectAuthConfigs() {
            if (!this.selectedProject) {
                this.projectAuthConfigs = [];
                return;
            }
            
            // Load all auth configs if not already loaded
            if (this.authConfigs.length === 0) {
                await this.loadAuthConfigs();
            } else {
                // Filter existing configs for the project
                this.filterAuthConfigsForProject();
            }
        },

        filterAuthConfigsForProject() {
            if (!this.selectedProject || !this.selectedProject.primary_url) {
                this.projectAuthConfigs = [];
                return;
            }

            try {
                // Extract domain from project's primary URL
                const projectUrl = new URL(this.selectedProject.primary_url);
                const projectDomain = projectUrl.hostname;
                
                // Filter auth configs that match the project domain
                this.projectAuthConfigs = this.authConfigs.filter(config => {
                    if (config.domain === projectDomain) {
                        return true;
                    }
                    
                    // Also check if the config URL matches the project domain
                    if (config.url) {
                        try {
                            const configUrl = new URL(config.url);
                            return configUrl.hostname === projectDomain;
                        } catch (error) {
                            // If URL parsing fails, fall back to string comparison
                            return config.url.includes(projectDomain);
                        }
                    }
                    
                    return false;
                });
                
                console.log(`🔐 Filtered ${this.projectAuthConfigs.length} auth configs for project domain: ${projectDomain}`);
                
            } catch (error) {
                console.error('Error filtering auth configs for project:', error);
                this.projectAuthConfigs = [];
            }
        },

        // Computed properties for authentication stats
        getActiveAuthCount() {
            return this.projectAuthConfigs.filter(config => config.status === 'active').length;
        },

        getPendingAuthCount() {
            return this.projectAuthConfigs.filter(config => config.status === 'pending' || config.status === 'testing').length;
        },

        getFailedAuthCount() {
            return this.projectAuthConfigs.filter(config => config.status === 'failed' || config.status === 'error').length;
        },

        refreshAuthConfigs() {
            this.loadProjectAuthConfigs();
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
                await this.loadProjectAuthConfigs();

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
            const response = await fetch(`${this.API_BASE_URL}/auth/setup-sso`, {
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

            const response = await fetch(`${this.API_BASE_URL}/auth/setup-basic`, {
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

            const response = await fetch(`${this.API_BASE_URL}/auth/setup-advanced`, {
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

                const response = await fetch(`${this.API_BASE_URL}/auth/test`, {
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

        editAuthConfig(config) {
            this.editingConfig = config;
            
            // Populate the form with ALL existing data
            this.editAuthForm = {
                name: config.name || config.domain || '',
                url: config.url || '',
                type: config.type || 'basic',
                username: config.username || '',
                password: '', // Don't pre-fill password for security
                loginPage: config.loginPage || config.login_page || '',
                successUrl: config.successUrl || config.success_url || '',
                apiKey: '', // Don't pre-fill API key for security
                token: '' // Don't pre-fill token for security
            };
            
            this.showEditAuth = true;
        },

        async updateAuthConfig() {
            try {
                if (!this.editingConfig) return;

                this.loading = true;
                
                // Prepare the update data, including all form fields
                const updateData = {
                    name: this.editAuthForm.name,
                    url: this.editAuthForm.url,
                    type: this.editAuthForm.type,
                    username: this.editAuthForm.username,
                    password: this.editAuthForm.password, // Will be empty if not changed
                    loginPage: this.editAuthForm.loginPage,
                    successUrl: this.editAuthForm.successUrl,
                    apiKey: this.editAuthForm.apiKey, // Will be empty if not changed
                    token: this.editAuthForm.token // Will be empty if not changed
                };
                
                console.log('🔄 Updating auth config with data:', updateData);
                
                const response = await this.apiCall(`/auth/configs/${this.editingConfig.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });

                // Update the config in the local array
                const index = this.authConfigs.findIndex(c => c.id === this.editingConfig.id);
                if (index !== -1) {
                    this.authConfigs[index] = { ...this.authConfigs[index], ...response.config };
                }

                this.showEditAuth = false;
                this.editingConfig = null;
                this.showNotification('Authentication configuration updated successfully!', 'success');
                
                // Reload configs to get the latest data
                await this.loadProjectAuthConfigs();

            } catch (error) {
                console.error('Failed to update auth config:', error);
                this.showNotification(`Failed to update configuration: ${error.message}`, 'error');
            } finally {
                this.loading = false;
            }
        },

        cancelEditAuth() {
            this.showEditAuth = false;
            this.editingConfig = null;
            this.editAuthForm = {
                name: '',
                url: '',
                type: '',
                username: '',
                password: '',
                loginPage: '',
                successUrl: '',
                apiKey: '',
                token: ''
            };
        },

        async deleteAuthConfig(config) {
            if (!confirm(`Are you sure you want to delete the authentication configuration for ${config.domain}?`)) {
                return;
            }

            try {
                const response = await this.apiCall(`/auth/configs/${config.id}`, {
                    method: 'DELETE'
                });

                // Remove from both global and project-specific arrays
                this.authConfigs = this.authConfigs.filter(c => c.id !== config.id);
                this.projectAuthConfigs = this.projectAuthConfigs.filter(c => c.id !== config.id);
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

                const response = await fetch(`${this.API_BASE_URL}/auth/import`, {
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

        // ===========================
        // VIOLATION INSPECTOR FUNCTIONS
        // ===========================

        async openViolationInspector(session) {
            this.violationInspectorSession = session;
            this.showViolationInspector = true;
            
            // Reset pagination and filters
            this.violationPagination.offset = 0;
            this.violations = [];
            
            try {
                await Promise.all([
                    this.loadViolationSummary(session.id),
                    this.loadViolations(session.id)
                ]);
            } catch (error) {
                console.error('Error opening violation inspector:', error);
                this.addNotification('Error', 'Failed to load violation data', 'error');
            }
        },

        closeViolationInspector() {
            this.showViolationInspector = false;
            this.violationInspectorSession = null;
            this.violations = [];
            this.violationSummary = {};
            this.selectedViolation = null;
            this.resetViolationFilters();
        },

        async loadViolationSummary(sessionId) {
            try {
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiBaseUrl}/violations/session/${sessionId}/summary`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                
                if (!response.ok) throw new Error('Failed to load violation summary');
                
                this.violationSummary = await response.json();
            } catch (error) {
                console.error('Error loading violation summary:', error);
                throw error;
            }
        },

        async loadViolations(sessionId) {
            if (this.loadingViolations) return;
            
            this.loadingViolations = true;
            
            try {
                const params = new URLSearchParams({
                    limit: this.violationPagination.limit,
                    offset: this.violationPagination.offset,
                    sort_by: this.violationSort.by,
                    sort_order: this.violationSort.order
                });

                // Add filters
                Object.entries(this.violationFilters).forEach(([key, value]) => {
                    if (value && value !== '' && value !== 'both') {
                        params.append(key, value);
                    }
                });

                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiBaseUrl}/violations/session/${sessionId}?${params}`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                
                if (!response.ok) throw new Error('Failed to load violations');
                
                const data = await response.json();
                
                if (this.violationPagination.offset === 0) {
                    this.violations = data.violations;
                } else {
                    this.violations.push(...data.violations);
                }
                
                this.violationPagination = data.pagination;
            } catch (error) {
                console.error('Error loading violations:', error);
                this.addNotification('Error', 'Failed to load violations', 'error');
            } finally {
                this.loadingViolations = false;
            }
        },

        async loadMoreViolations() {
            if (!this.violationPagination.has_more || this.loadingViolations) return;
            
            this.violationPagination.offset += this.violationPagination.limit;
            await this.loadViolations(this.violationInspectorSession.id);
        },

        async applyViolationFilters() {
            this.violationPagination.offset = 0;
            this.violations = [];
            await this.loadViolations(this.violationInspectorSession.id);
        },

        resetViolationFilters() {
            this.violationFilters = {
                severity: '',
                source: 'both',
                tool: '',
                wcag_level: '',
                wcag_criteria: '',
                page_url: '',
                violation_type: '',
                status: ''
            };
            this.violationSort = {
                by: 'severity',
                order: 'desc'
            };
        },

        async sortViolations(field) {
            if (this.violationSort.by === field) {
                this.violationSort.order = this.violationSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                this.violationSort.by = field;
                this.violationSort.order = 'asc';
            }
            
            this.violationPagination.offset = 0;
            this.violations = [];
            await this.loadViolations(this.violationInspectorSession.id);
        },

        async viewViolationDetails(violation) {
            try {
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiBaseUrl}/violations/${violation.id}`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                
                if (!response.ok) throw new Error('Failed to load violation details');
                
                const data = await response.json();
                this.selectedViolation = data;
            } catch (error) {
                console.error('Error loading violation details:', error);
                this.addNotification('Error', 'Failed to load violation details', 'error');
            }
        },

        closeViolationDetails() {
            this.selectedViolation = null;
        },

        async updateViolationStatus(violationId, status, notes = '') {
            try {
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiBaseUrl}/violations/${violationId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        status: status,
                        resolution_notes: notes
                    })
                });
                
                if (!response.ok) throw new Error('Failed to update violation status');
                
                // Update the violation in our local data
                const updatedViolation = await response.json();
                const index = this.violations.findIndex(v => v.id === violationId);
                if (index !== -1) {
                    this.violations[index] = { ...this.violations[index], ...updatedViolation };
                }
                
                if (this.selectedViolation && this.selectedViolation.violation.id === violationId) {
                    this.selectedViolation.violation = { ...this.selectedViolation.violation, ...updatedViolation };
                }
                
                this.addNotification('Success', 'Violation status updated', 'success');
            } catch (error) {
                console.error('Error updating violation status:', error);
                this.addNotification('Error', 'Failed to update violation status', 'error');
            }
        },

        async exportViolations(format = 'json') {
            try {
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiBaseUrl}/violations/session/${this.violationInspectorSession.id}/export?format=${format}`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                
                if (!response.ok) throw new Error('Failed to export violations');
                
                const filename = `violations-${this.violationInspectorSession.name.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.${format}`;
                
                if (format === 'csv') {
                    const csvData = await response.text();
                    this.downloadFile(csvData, filename, 'text/csv');
                } else {
                    const jsonData = await response.json();
                    this.downloadFile(JSON.stringify(jsonData, null, 2), filename, 'application/json');
                }
                
                this.addNotification('Success', `Violations exported as ${format.toUpperCase()}`, 'success');
            } catch (error) {
                console.error('Error exporting violations:', error);
                this.addNotification('Error', 'Failed to export violations', 'error');
            }
        },

        // Load session results in the Results tab (similar to openViolationInspector but for tab display)
        async loadSessionResultsTab(session) {
            this.violationInspectorSession = session;
            
            // Reset pagination and filters
            this.violationPagination.offset = 0;
            this.violations = [];
            this.resetViolationFilters();
            
            try {
                await Promise.all([
                    this.loadViolationSummary(session.id),
                    this.loadViolations(session.id)
                ]);
                
                this.addNotification('Success', `Loaded results for ${session.name}`, 'success');
            } catch (error) {
                console.error('Error loading session results:', error);
                this.addNotification('Error', 'Failed to load session results', 'error');
            }
        },

        // Close violation inspector from Results tab and return to session selection
        closeViolationInspectorTab() {
            this.violationInspectorSession = null;
            this.violations = [];
            this.violationSummary = {};
            this.selectedViolation = null;
            this.resetViolationFilters();
        },

        downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        },

        getSeverityBadgeClass(severity) {
            const classes = {
                critical: 'bg-red-100 text-red-800 border-red-200',
                serious: 'bg-orange-100 text-orange-800 border-orange-200',
                moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                minor: 'bg-blue-100 text-blue-800 border-blue-200'
            };
            return classes[severity] || 'bg-gray-100 text-gray-800 border-gray-200';
        },

        getSeverityIcon(severity) {
            const icons = {
                critical: 'fas fa-exclamation-circle text-red-600',
                serious: 'fas fa-exclamation-triangle text-orange-600',
                moderate: 'fas fa-info-circle text-yellow-600',
                minor: 'fas fa-minus-circle text-blue-600'
            };
            return icons[severity] || 'fas fa-question-circle text-gray-600';
        },

        getSourceTypeIcon(sourceType) {
            return sourceType === 'automated' 
                ? 'fas fa-robot text-blue-600' 
                : 'fas fa-user text-green-600';
        },

        getViolationStatusBadgeClass(status) {
            const classes = {
                open: 'bg-red-100 text-red-800',
                in_progress: 'bg-yellow-100 text-yellow-800',
                resolved: 'bg-green-100 text-green-800',
                wont_fix: 'bg-gray-100 text-gray-800',
                duplicate: 'bg-purple-100 text-purple-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        formatViolationDate(dateString) {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        truncateText(text, maxLength = 100) {
            if (!text) return '';
            return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
        },

        // Analytics
        // Manual Testing State
        manualTestingSession: null,
        manualTestingProgress: null,
        manualTestingAssignments: [],
        filteredManualTestingAssignments: [],
        manualTestingFilters: {
            status: '',
            wcag_level: '',
            page_id: '',
            coverage_type: 'smart'  // 'smart' or 'legacy'
        },
        manualTestingCoverageAnalysis: null,
        showCoverageAnalysis: false,
        showManualTestingModal: false,
        currentManualTest: null,
        manualTestingProcedure: null,
        manualTestingContext: null,

        // Tester Assignment Properties
        availableTesters: [],
        showTesterAssignmentModal: false,
        selectedAssignmentForTester: null,
        selectedTesterId: '',

        // Current Test State for Modal
        currentTestResult: '',
        currentTestConfidence: 'medium',
        currentTestNotes: '',
        currentTestImages: [],
        isSavingTest: false,

        // ==============================================
        // MANUAL TESTING FUNCTIONS
        // ==============================================

        async loadManualTestingAssignments() {
            if (!this.manualTestingSession) return;
            
            try {
                console.log('📋 Loading manual testing assignments...');
                
                // Build query parameters with smart filtering
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
                
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
            const response = await fetch(`${apiBaseUrl}/manual-testing/session/${this.manualTestingSession.id}/assignments?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    this.manualTestingAssignments = data.assignments || [];
                    this.applyManualTestingFilters();
                    
                    console.log(`✅ Loaded ${data.total_assignments} manual testing assignments`);
                    console.log('📊 Coverage type:', data.coverage_type);
                    console.log('📊 Assignment summary:', data.summary);
                    console.log('📊 Category breakdown:', data.category_breakdown);
                    
                    // Show coverage insights if using smart filtering
                    if (data.coverage_type === 'smart' && data.category_breakdown) {
                        this.showCoverageInsights(data.summary, data.category_breakdown);
                    }
                } else {
                    throw new Error(data.error || 'Failed to load manual testing assignments');
                }
                
            } catch (error) {
                console.error('❌ Error loading manual testing assignments:', error);
                this.showNotification('Failed to load manual testing assignments', 'error');
            }
        },

        showCoverageInsights(summary, categoryBreakdown) {
            // Calculate insights from the smart filtering results
            const totalAssignments = summary.pending + summary.completed;
            const manualPriority = categoryBreakdown.manual_priority || 0;
            const needsVerification = categoryBreakdown.failed_verification || 0;
            const manualRecommended = categoryBreakdown.manual_recommended || 0;
            
            let insightMessage = `📊 Smart Filtering Active: `;
            
            if (manualPriority > 0) {
                insightMessage += `${manualPriority} manual-only criteria prioritized. `;
            }
            
            if (needsVerification > 0) {
                insightMessage += `${needsVerification} failed automated tests need verification. `;
            } else {
                insightMessage += `No failed automated tests found. `;
            }
            
            if (manualRecommended > 0) {
                insightMessage += `${manualRecommended} criteria with low automation coverage included.`;
            }
            
            console.log(insightMessage);
            
            // Show as notification if there are important insights
            if (needsVerification > 0 || manualPriority > 5) {
                this.showNotification(insightMessage, 'info');
            }
        },

        async loadManualTestingCoverageAnalysis() {
            if (!this.manualTestingSession) return;
            
            try {
                console.log('📊 Loading coverage analysis...');
                
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
            const response = await fetch(`${apiBaseUrl}/manual-testing/session/${this.manualTestingSession.id}/coverage-analysis`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    this.manualTestingCoverageAnalysis = data;
                    console.log('✅ Coverage analysis loaded');
                    console.log('📊 Efficiency metrics:', data.efficiency_metrics);
                    console.log('💡 Recommendations:', data.recommendations);
                } else {
                    throw new Error(data.error || 'Failed to load coverage analysis');
                }
                
            } catch (error) {
                console.error('❌ Error loading coverage analysis:', error);
                this.showNotification('Failed to load coverage analysis', 'error');
            }
        },

        toggleCoverageAnalysis() {
            this.showCoverageAnalysis = !this.showCoverageAnalysis;
            
            if (this.showCoverageAnalysis && !this.manualTestingCoverageAnalysis) {
                this.loadManualTestingCoverageAnalysis();
            }
        },

        async refreshManualTestingTabData() {
            if (!this.selectedProject) return;
            
            console.log('🔄 Refreshing manual testing tab data...');
            
            try {
                // Load test sessions (fixed function name)
                await this.loadProjectTestSessions();
                
                // If we have a selected session, load assignments and optionally coverage analysis
                if (this.manualTestingSession) {
                    await this.loadManualTestingAssignments();
                    
                    // Auto-load coverage analysis if it was previously open
                    if (this.showCoverageAnalysis) {
                        await this.loadManualTestingCoverageAnalysis();
                    }
                }
                
                console.log('✅ Manual testing tab data refreshed');
            } catch (error) {
                console.error('❌ Error refreshing manual testing tab data:', error);
                this.showNotification('Failed to refresh manual testing data', 'error');
            }
        },

        async selectManualTestingSession(session) {
            try {
                console.log('🎯 Selecting manual testing session:', session.name);
                
                this.manualTestingSession = session;
                
                // Load testing assignments and progress
                await Promise.all([
                    this.loadManualTestingAssignments(session.id),
                    this.loadManualTestingProgress(session.id)
                ]);
                
                console.log('✅ Manual testing session selected successfully');
                
            } catch (error) {
                console.error('❌ Error selecting manual testing session:', error);
                this.showNotification('Failed to load manual testing session', 'error');
            }
        },

        async loadManualTestingProgress(sessionId) {
            try {
                console.log('📊 Loading manual testing progress...');
                
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
            const response = await fetch(`${apiBaseUrl}/manual-testing/session/${sessionId}/progress`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                
                if (!response.ok) throw new Error('Failed to load progress');
                
                const data = await response.json();
                this.manualTestingProgress = data.progress || null;
                
                console.log('✅ Manual testing progress loaded');
                
            } catch (error) {
                console.error('❌ Error loading manual testing progress:', error);
                throw error;
            }
        },

        applyManualTestingFilters() {
            // Apply current filters to the loaded assignments
            this.filterManualTestingAssignments();
        },

        filterManualTestingAssignments() {
            const filters = this.manualTestingFilters;
            
            this.filteredManualTestingAssignments = this.manualTestingAssignments.filter(pageGroup => {
                // Filter by page if specified
                if (filters.page_id && pageGroup.page_id !== filters.page_id) {
                    return false;
                }
                
                // Filter assignments within the page group
                const filteredAssignments = pageGroup.assignments.filter(assignment => {
                    // Filter by status
                    if (filters.status) {
                        if (filters.status === 'pending' && assignment.assignment_status !== 'pending') {
                            return false;
                        }
                        if (filters.status === 'completed' && assignment.assignment_status !== 'completed') {
                            return false;
                        }
                    }
                    
                    // Filter by WCAG level
                    if (filters.wcag_level && assignment.wcag_level !== filters.wcag_level) {
                        return false;
                    }
                    
                    return true;
                });
                
                // Only include page groups that have matching assignments
                if (filteredAssignments.length > 0) {
                    return {
                        ...pageGroup,
                        assignments: filteredAssignments
                    };
                }
                
                return false;
            }).filter(Boolean).map(pageGroup => {
                // Apply assignment filters to each page group
                const filteredAssignments = pageGroup.assignments.filter(assignment => {
                    // Filter by status
                    if (filters.status) {
                        if (filters.status === 'pending' && assignment.assignment_status !== 'pending') {
                            return false;
                        }
                        if (filters.status === 'completed' && assignment.assignment_status !== 'completed') {
                            return false;
                        }
                    }
                    
                    // Filter by WCAG level
                    if (filters.wcag_level && assignment.wcag_level !== filters.wcag_level) {
                        return false;
                    }
                    
                    return true;
                });
                
                return {
                    ...pageGroup,
                    assignments: filteredAssignments
                };
            });
            
            console.log('🔍 Filtered manual testing assignments:', this.filteredManualTestingAssignments.length, 'page groups');
        },

        async startManualTest(pageGroup, assignment) {
            try {
                console.log('🎯 Starting manual test:', assignment.criterion_number);
                
                this.currentManualTest = {
                    pageGroup,
                    assignment,
                    sessionId: this.manualTestingSession.id
                };
                
                // Reset current test state
                this.currentTestResult = assignment.current_result || '';
                this.currentTestConfidence = assignment.confidence_level || 'medium';
                this.currentTestNotes = assignment.notes || '';
                this.currentTestImages = [];
                this.isSavingTest = false;
                
                // Load the testing procedure
                await this.loadManualTestingProcedure(assignment.requirement_id, pageGroup.page_type);
                
                // Initialize the editor content after the modal is shown
                setTimeout(() => {
                    const editor = document.getElementById('commentEditor');
                    if (editor && this.currentTestNotes) {
                        editor.innerHTML = this.currentTestNotes;
                    }
                }, 100);
                
                this.showManualTestingModal = true;
                
            } catch (error) {
                console.error('❌ Error starting manual test:', error);
                this.showNotification('Failed to start manual test', 'error');
            }
        },

        async loadManualTestingProcedure(requirementId, pageType) {
            try {
                console.log('📖 Loading testing procedure for requirement:', requirementId);
                
                const params = new URLSearchParams();
                if (pageType && pageType !== 'all') {
                    params.append('page_type', pageType);
                }
                
                // Add context parameters if we have current test information
                if (this.currentManualTest) {
                    params.append('page_id', this.currentManualTest.pageGroup.page_id);
                    params.append('session_id', this.currentManualTest.sessionId);
                }
                
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
            const response = await fetch(`${apiBaseUrl}/manual-testing/requirement/${requirementId}/procedure?${params}`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                
                if (!response.ok) throw new Error('Failed to load procedure');
                
                const data = await response.json();
                this.manualTestingProcedure = data.requirement || null;
                this.manualTestingContext = data.test_context || null;
                
                console.log('✅ Testing procedure loaded with context:', data.test_context?.category);
                
            } catch (error) {
                console.error('❌ Error loading testing procedure:', error);
                throw error;
            }
        },

        async submitManualTestResult(result, confidence = 'medium', notes = '', evidence = {}) {
            try {
                console.log('💾 Submitting manual test result:', result);
                
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
            const response = await fetch(`${apiBaseUrl}/manual-testing/session/${this.currentManualTest.sessionId}/result`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        page_id: this.currentManualTest.pageGroup.page_id,
                        requirement_id: this.currentManualTest.assignment.requirement_id,
                        result,
                        confidence_level: confidence,
                        notes,
                        evidence,
                        tester_name: this.user?.name || 'Anonymous'
                    })
                });
                
                if (!response.ok) throw new Error('Failed to submit result');
                
                const data = await response.json();
                
                // Refresh the assignments and progress
                await Promise.all([
                    this.loadManualTestingAssignments(this.currentManualTest.sessionId),
                    this.loadManualTestingProgress(this.currentManualTest.sessionId)
                ]);
                
                // Close modal and clear state
                this.showManualTestingModal = false;
                this.currentManualTest = null;
                this.manualTestingProcedure = null;
                this.manualTestingContext = null;
                
                this.showNotification(`Test result recorded: ${result}`, 'success');
                console.log('✅ Manual test result submitted successfully');
                
            } catch (error) {
                console.error('❌ Error submitting manual test result:', error);
                this.showNotification('Failed to submit test result', 'error');
                throw error;
            }
        },

        closeManualTestingSession() {
            this.manualTestingSession = null;
            this.manualTestingProgress = null;
            this.manualTestingAssignments = [];
            this.filteredManualTestingAssignments = [];
            this.resetManualTestingFilters();
        },

        resetManualTestingFilters() {
            this.manualTestingFilters = {
                status: '',
                wcag_level: '',
                page_id: '',
                coverage_type: 'smart'  // 'smart' or 'legacy'
            };
            this.filteredManualTestingAssignments = [...this.manualTestingAssignments];
        },

        async refreshManualTestingProgress() {
            if (!this.manualTestingSession) return;
            
            try {
                await this.loadManualTestingProgress(this.manualTestingSession.id);
                this.showNotification('Progress refreshed', 'success');
            } catch (error) {
                console.error('❌ Error refreshing progress:', error);
                this.showNotification('Failed to refresh progress', 'error');
            }
        },

        async generateManualTestingReport() {
            if (!this.manualTestingSession) return;
            
            try {
                console.log('📄 Generating manual testing report...');
                
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
            const response = await fetch(`${apiBaseUrl}/../vpat/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        testSessionId: this.manualTestingSession.id,
                        includeManualResults: true,
                        format: 'detailed'
                    })
                });
                
                if (!response.ok) throw new Error('Failed to generate report');
                
                const reportData = await response.json();
                
                // Create and download the report
                const filename = `manual-testing-report-${this.manualTestingSession.name.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.html`;
                this.downloadFile(reportData.html, filename, 'text/html');
                
                this.showNotification('Report generated successfully', 'success');
                
            } catch (error) {
                console.error('❌ Error generating manual testing report:', error);
                this.showNotification('Failed to generate report', 'error');
            }
        },

        // ==============================================
        // WYSIWYG EDITOR FUNCTIONS
        // ==============================================

        formatText(command) {
            try {
                document.execCommand(command, false, null);
                document.getElementById('commentEditor').focus();
            } catch (error) {
                console.error('Error formatting text:', error);
            }
        },

        insertLink() {
            try {
                const url = prompt('Enter URL:');
                if (url) {
                    document.execCommand('createLink', false, url);
                    document.getElementById('commentEditor').focus();
                }
            } catch (error) {
                console.error('Error inserting link:', error);
            }
        },

        // ==============================================
        // IMAGE HANDLING FUNCTIONS
        // ==============================================

        async handleImageUpload(event) {
            const files = Array.from(event.target.files);
            
            for (const file of files) {
                if (file.size > 10 * 1024 * 1024) { // 10MB limit
                    this.showNotification(`File ${file.name} is too large (max 10MB)`, 'error');
                    continue;
                }
                
                if (!file.type.startsWith('image/')) {
                    this.showNotification(`File ${file.name} is not an image`, 'error');
                    continue;
                }
                
                try {
                    // Create preview URL
                    const url = URL.createObjectURL(file);
                    
                    // Upload to server
                    const uploadedImage = await this.uploadImage(file);
                    
                    this.currentTestImages.push({
                        name: file.name,
                        url: url,
                        uploadedUrl: uploadedImage.url,
                        id: uploadedImage.id
                    });
                    
                } catch (error) {
                    console.error('Error uploading image:', error);
                    this.showNotification(`Failed to upload ${file.name}`, 'error');
                }
            }
            
            // Clear the input
            event.target.value = '';
        },

        async uploadImage(file) {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('testSessionId', this.currentManualTest.sessionId);
            formData.append('pageId', this.currentManualTest.pageGroup.page_id);
            formData.append('requirementId', this.currentManualTest.assignment.requirement_id);
            
            const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
            const response = await fetch(`${apiBaseUrl}/manual-testing/upload-image`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`
                },
                body: formData
            });
            
            if (!response.ok) throw new Error('Failed to upload image');
            
            return await response.json();
        },

        removeImage(index) {
            const image = this.currentTestImages[index];
            
            // Revoke the object URL to free memory
            if (image.url.startsWith('blob:')) {
                URL.revokeObjectURL(image.url);
            }
            
            this.currentTestImages.splice(index, 1);
        },

        // ==============================================
        // SAVE TEST RESULT FUNCTIONS
        // ==============================================

        async saveManualTestResult() {
            if (!this.currentTestResult) {
                this.showNotification('Please select a test result', 'error');
                return;
            }
            
            this.isSavingTest = true;
            
            try {
                console.log('💾 Saving manual test result...');
                
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiBaseUrl}/manual-testing/session/${this.currentManualTest.sessionId}/result`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        page_id: this.currentManualTest.pageGroup.page_id,
                        requirement_id: this.currentManualTest.assignment.requirement_id,
                        result: this.currentTestResult,
                        confidence_level: this.currentTestConfidence,
                        notes: this.currentTestNotes,
                        images: this.currentTestImages.map(img => ({
                            id: img.id,
                            name: img.name,
                            url: img.uploadedUrl
                        })),
                        tester_name: this.user?.full_name || this.user?.username || 'Unknown',
                        tested_at: new Date().toISOString()
                    })
                });
                
                if (!response.ok) throw new Error('Failed to save test result');
                
                const result = await response.json();
                
                // Update the assignment in our local data
                const pageGroupIndex = this.manualTestingAssignments.findIndex(pg => pg.page_id === this.currentManualTest.pageGroup.page_id);
                if (pageGroupIndex !== -1) {
                    const assignmentIndex = this.manualTestingAssignments[pageGroupIndex].assignments.findIndex(
                        a => a.requirement_id === this.currentManualTest.assignment.requirement_id
                    );
                    if (assignmentIndex !== -1) {
                        this.manualTestingAssignments[pageGroupIndex].assignments[assignmentIndex] = {
                            ...this.manualTestingAssignments[pageGroupIndex].assignments[assignmentIndex],
                            assignment_status: this.currentTestResult === 'in_progress' ? 'in_progress' : 'completed',
                            current_result: this.currentTestResult,
                            confidence_level: this.currentTestConfidence,
                            notes: this.currentTestNotes,
                            tested_at: new Date().toISOString(),
                            tester_name: this.user?.full_name || this.user?.username || 'Unknown'
                        };
                    }
                }
                
                // Update filtered assignments as well
                this.filterManualTestingAssignments();
                
                // Refresh progress
                await this.loadManualTestingProgress(this.currentManualTest.sessionId);
                
                this.showNotification('Test result saved successfully', 'success');
                this.closeManualTestingModal();
                
            } catch (error) {
                console.error('❌ Error saving test result:', error);
                this.showNotification('Failed to save test result', 'error');
            } finally {
                this.isSavingTest = false;
            }
        },

        closeManualTestingModal() {
            this.showManualTestingModal = false;
            this.currentManualTest = null;
            this.manualTestingProcedure = null;
            this.manualTestingContext = null;
            this.currentTestResult = '';
            this.currentTestConfidence = 'medium';
            this.currentTestNotes = '';
            
            // Clean up image URLs
            this.currentTestImages.forEach(image => {
                if (image.url.startsWith('blob:')) {
                    URL.revokeObjectURL(image.url);
                }
            });
            this.currentTestImages = [];
            
            // Clear the editor
            const editor = document.getElementById('commentEditor');
            if (editor) {
                editor.innerHTML = '';
            }
        },

        // Helper functions for manual testing interface
        getWcagLevelBadgeClass(level) {
            switch (level) {
                case 'A': return 'bg-green-100 text-green-800';
                case 'AA': return 'bg-blue-100 text-blue-800';
                case 'AAA': return 'bg-purple-100 text-purple-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        },

        getTestResultColor(result) {
            switch (result) {
                case 'pass': return 'text-green-600';
                case 'fail': return 'text-red-600';
                case 'in_progress': return 'text-yellow-600';
                case 'assigned': return 'text-purple-600';
                case 'not_applicable': return 'text-gray-600';
                case 'not_tested': return 'text-gray-500';
                default: return 'text-gray-600';
            }
        },

        getTestStatusBadge(result) {
            switch (result) {
                case 'pass': 
                    return {
                        class: 'bg-green-100 text-green-800 border-green-200',
                        icon: 'fas fa-check-circle',
                        text: 'Passed'
                    };
                case 'fail': 
                    return {
                        class: 'bg-red-100 text-red-800 border-red-200',
                        icon: 'fas fa-times-circle',
                        text: 'Failed'
                    };
                case 'in_progress': 
                    return {
                        class: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                        icon: 'fas fa-clock',
                        text: 'In Progress'
                    };
                case 'assigned': 
                    return {
                        class: 'bg-purple-100 text-purple-800 border-purple-200',
                        icon: 'fas fa-user-check',
                        text: 'Assigned'
                    };
                case 'not_applicable': 
                    return {
                        class: 'bg-gray-100 text-gray-800 border-gray-200',
                        icon: 'fas fa-minus-circle',
                        text: 'N/A'
                    };
                case 'not_tested':
                default: 
                    return {
                        class: 'bg-blue-50 text-blue-700 border-blue-200',
                        icon: 'fas fa-circle',
                        text: 'Not Started'
                    };
            }
        },

        // ==============================================
        // TESTER ASSIGNMENT FUNCTIONS
        // ==============================================

        async loadAvailableTesters() {
            try {
                console.log('👥 Loading available testers...');
                
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiBaseUrl}/manual-testing/testers`, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                
                if (!response.ok) throw new Error('Failed to load testers');
                
                const data = await response.json();
                this.availableTesters = data.testers;
                
                console.log('✅ Loaded testers:', this.availableTesters.length);
                return this.availableTesters;
                
            } catch (error) {
                console.error('❌ Error loading testers:', error);
                this.showNotification('Failed to load available testers', 'error');
                return [];
            }
        },

        async assignTesterToRequirements(sessionId, pageId, requirementIds, testerId) {
            try {
                console.log('🎯 Assigning tester to requirements:', { sessionId, pageId, requirementIds, testerId });
                
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiBaseUrl}/manual-testing/assign-tester`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        page_id: pageId,
                        requirement_ids: requirementIds,
                        assigned_tester_id: testerId,
                        assigned_by: this.user?.full_name || this.user?.username || 'Unknown'
                    })
                });
                
                if (!response.ok) throw new Error('Failed to assign tester');
                
                const result = await response.json();
                this.showNotification(result.message, 'success');
                
                // Refresh assignments
                await this.loadManualTestingAssignments();
                
                return result;
                
            } catch (error) {
                console.error('❌ Error assigning tester:', error);
                this.showNotification('Failed to assign tester', 'error');
                throw error;
            }
        },

        async unassignTesterFromRequirements(sessionId, pageId, requirementIds) {
            try {
                console.log('🔄 Unassigning tester from requirements:', { sessionId, pageId, requirementIds });
                
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
                const response = await fetch(`${apiBaseUrl}/manual-testing/unassign-tester`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        page_id: pageId,
                        requirement_ids: requirementIds
                    })
                });
                
                if (!response.ok) throw new Error('Failed to unassign tester');
                
                const result = await response.json();
                this.showNotification(result.message, 'success');
                
                // Refresh assignments
                await this.loadManualTestingAssignments();
                
                return result;
                
            } catch (error) {
                console.error('❌ Error unassigning tester:', error);
                this.showNotification('Failed to unassign tester', 'error');
                throw error;
            }
        },

        openTesterAssignmentModal(pageGroup, assignment) {
            this.selectedAssignmentForTester = { pageGroup, assignment };
            this.showTesterAssignmentModal = true;
            
            // Load testers if not already loaded
            if (!this.availableTesters || this.availableTesters.length === 0) {
                this.loadAvailableTesters();
            }
        },

        closeTesterAssignmentModal() {
            this.showTesterAssignmentModal = false;
            this.selectedAssignmentForTester = null;
            this.selectedTesterId = '';
        }
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


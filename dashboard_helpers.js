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
        testingSessions: [], // New testing sessions data
        analytics: {},
        sessions: [],
        
        // Unified Test Grid Data (Task 2.1.1)
        viewingSessionDetails: false,
        currentSessionDetails: null,
        testInstances: [],
        filteredTestInstances: [],
        paginatedTestInstances: [],
        selectedTestInstances: [],
        availableTesters: [],
        
        // Test Grid Filtering
        testFilters: {
            status: '',
            requirementType: '',
            conformanceLevel: '',
            assignedTester: '',
            search: ''
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
        
        // Test Instance Detail Modal (Task 2.1.2)
        showTestInstanceModal: false,
        currentTestInstance: null,
        testInstanceStatus: '',
        testInstanceConfidenceLevel: '',
        testInstanceNotes: '',
        testInstanceRemediationNotes: '',
        testInstanceEvidence: [],
        testInstanceAssignedTester: '',
        testInstanceHistory: [],
        isLoadingTestInstance: false,
        isSavingTestInstance: false,
        
        // Test Assignment Interface (Task 2.1.3)
        showTestAssignmentPanel: false,
        draggedTest: null,
        dragOverTester: null,
        bulkAssignmentTester: '',
        
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
            result_type: 'fail', // 'fail', 'pass', 'all'
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
            page: 1,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false
        },
        jumpToPageNumber: 1,
        loadingViolations: false,

        // Automated Test Details Modal State
        showAutomatedTestModal: false,
        currentAutomatedTest: null,
        automatedTestDetails: null,
        automatedTestHistory: [],
        automatedTestNotes: '',
        automatedTestStatus: '',
        isSavingAutomatedTest: false,
        
        // Authentication Management Data
        authConfigs: [],
        projectAuthConfigs: [], // Filtered auth configs for selected project
        projectRoles: [], // Available roles for selected project
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
        showCreateTestingSession: false, // New modal state for testing sessions
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
            auth_config_id: null,
            auth_role: null,
            auth_description: '',
            scope: {
                testTypes: ['axe', 'pa11y', 'lighthouse'],
                includeManualTesting: true,
                wcagLevel: 'AA'
            }
        },
        
        newTestingSession: {
            name: '',
            description: '',
            conformance_level: '',
            custom_requirements: ''
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
                
                // Activity feed events
                this.socket.on('activity_update', (data) => {
                    console.log('📢 Activity update:', data);
                    this.handleActivityFeedUpdate(data);
                });
                
                this.socket.on('test_status_changed', (data) => {
                    console.log('🔄 Test status changed:', data);
                    this.handleActivityFeedUpdate({
                        session_id: data.session_id,
                        action_type: 'status_change',
                        change_description: `Status changed from ${data.old_status} to ${data.new_status}`,
                        username: data.username,
                        criterion_number: data.criterion_number,
                        test_instance_id: data.test_instance_id,
                        timestamp: new Date().toISOString()
                    });
                });
                
                this.socket.on('evidence_uploaded', (data) => {
                    console.log('📎 Evidence uploaded:', data);
                    this.handleActivityFeedUpdate({
                        session_id: data.session_id,
                        action_type: 'evidence_uploaded',
                        change_description: `Evidence uploaded: ${data.filename}`,
                        username: data.username,
                        criterion_number: data.criterion_number,
                        test_instance_id: data.test_instance_id,
                        timestamp: new Date().toISOString()
                    });
                });
                
                this.socket.on('test_assigned', (data) => {
                    console.log('👤 Test assigned:', data);
                    this.handleActivityFeedUpdate({
                        session_id: data.session_id,
                        action_type: 'assignment',
                        change_description: `Test assigned to ${data.assigned_to}`,
                        username: data.assigned_by,
                        criterion_number: data.criterion_number,
                        test_instance_id: data.test_instance_id,
                        timestamp: new Date().toISOString()
                    });
                });
                
                this.socket.on('review_requested', (data) => {
                    console.log('👀 Review requested:', data);
                    this.handleActivityFeedUpdate({
                        session_id: data.session_id,
                        action_type: 'review_requested',
                        change_description: `Review requested`,
                        username: data.requested_by,
                        criterion_number: data.criterion_number,
                        test_instance_id: data.test_instance_id,
                        timestamp: new Date().toISOString()
                    });
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
            
            // Refresh analytics to show updated violation counts
            this.loadAnalytics();
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
                // Add cache-busting timestamp to ensure fresh data
                const timestamp = Date.now();
                const data = await this.apiCall(`/results/statistics?_t=${timestamp}`);
                this.analytics = data || {};
                console.log('📊 Analytics loaded:', this.analytics.overall);
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
                auth_config_id: null,
                auth_role: null,
                auth_description: '',
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
            // Switch to Results tab and load session results there
            this.activeTab = 'results';
            this.loadSessionResultsTab(session);
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
                console.log('🗑️ Deleting test session:', this.sessionToDelete.name, this.sessionToDelete.id);
                this.loading = true;
                
                const response = await this.apiCall(`/sessions/${this.sessionToDelete.id}`, {
                    method: 'DELETE'
                });
                
                console.log('🗑️ Delete response:', response);
                
                if (response.success) {
                    this.showNotification(`Session "${this.sessionToDelete.name}" deleted successfully!`, 'success');
                    
                    // Refresh all session-related data
                    await Promise.all([
                        this.loadProjectTestSessions(),
                        this.loadTestingSessions(),
                        this.loadAnalytics()
                    ]);
                    
                    console.log('✅ Session deleted and data refreshed');
                } else {
                    console.error('❌ Failed to delete session:', response.error);
                    this.showNotification(response.error || 'Failed to delete session', 'error');
                }
                
                this.showDeleteSession = false;
                this.sessionToDelete = null;
                
            } catch (error) {
                console.error('❌ Failed to delete test session:', error);
                this.showNotification('Failed to delete test session: ' + (error.message || 'Unknown error'), 'error');
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
                console.log('🔐 Loading authentication configurations...');
                const response = await this.apiCall('/auth/configs');
                this.authConfigs = response.data || [];
                console.log('🔐 Auth configs loaded:', this.authConfigs.length, this.authConfigs);
                
                // Filter for current project if one is selected
                if (this.selectedProject) {
                    console.log('🔐 Filtering auth configs for project:', this.selectedProject.name, this.selectedProject.primary_url);
                    this.filterAuthConfigsForProject();
                } else {
                    console.log('🔐 No project selected, showing all configs');
                    this.projectAuthConfigs = this.authConfigs;
                }
            } catch (error) {
                console.error('Failed to load auth configs:', error);
                this.authConfigs = [];
                this.projectAuthConfigs = [];
            }
        },

        async loadProjectAuthConfigs() {
            if (!this.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/auth-configs`);
                if (data.success) {
                    this.projectAuthConfigs = data.data.auth_configs || [];
                    console.log(`📋 Loaded ${this.projectAuthConfigs.length} auth configs for project`);
                } else {
                    console.error('Failed to load project auth configs:', data.error);
                    this.projectAuthConfigs = [];
                }
            } catch (error) {
                console.error('Error loading project auth configs:', error);
                this.projectAuthConfigs = [];
            }
        },

        async loadProjectRoles() {
            if (!this.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/roles`);
                if (data.success) {
                    this.projectRoles = data.data || [];
                    console.log(`📋 Loaded ${this.projectRoles.length} roles for project`);
                } else {
                    console.error('Failed to load project roles:', data.error);
                    this.projectRoles = [];
                }
            } catch (error) {
                console.error('Error loading project roles:', error);
                this.projectRoles = [];
            }
        },

        getAvailableAuthConfigs() {
            return this.projectAuthConfigs.filter(config => config.auth_config_id);
        },

        getAuthConfigDisplayName(config) {
            if (!config) return 'No Authentication';
            return `${config.auth_config_name} (${config.auth_role})`;
        },

        async selectAuthConfig(configId) {
            const config = this.projectAuthConfigs.find(c => c.auth_config_id === configId);
            if (config) {
                this.newSession.auth_config_id = config.auth_config_id;
                this.newSession.auth_role = config.auth_role;
                this.newSession.auth_description = config.auth_description;
            } else {
                this.newSession.auth_config_id = null;
                this.newSession.auth_role = null;
                this.newSession.auth_description = '';
            }
        },

        filterAuthConfigsForProject() {
            if (!this.selectedProject || !this.selectedProject.primary_url) {
                console.log('🔐 No project or project URL, showing all auth configs');
                this.projectAuthConfigs = this.authConfigs;
                return;
            }

            try {
                // Extract domain from project's primary URL
                const projectUrl = new URL(this.selectedProject.primary_url);
                const projectDomain = projectUrl.hostname;
                console.log(`🔐 Filtering auth configs for project domain: ${projectDomain} from URL: ${this.selectedProject.primary_url}`);
                console.log(`🔐 Available auth configs:`, this.authConfigs.map(c => ({ id: c.id, domain: c.domain, url: c.url })));
                
                // Filter auth configs that match the project domain
                const matchingConfigs = this.authConfigs.filter(config => {
                    const domainMatch = config.domain === projectDomain;
                    
                    let urlMatch = false;
                    if (config.url) {
                        try {
                            const configUrl = new URL(config.url);
                            urlMatch = configUrl.hostname === projectDomain;
                        } catch (error) {
                            // If URL parsing fails, fall back to string comparison
                            urlMatch = config.url.includes(projectDomain);
                        }
                    }
                    
                    const shouldInclude = domainMatch || urlMatch;
                    console.log(`🔐 Config ${config.id}: domain=${config.domain}, url=${config.url}, domainMatch=${domainMatch}, urlMatch=${urlMatch}, include=${shouldInclude}`);
                    
                    return shouldInclude;
                });
                
                // If no project-specific configs found, show all configs for easier management
                if (matchingConfigs.length === 0) {
                    console.log(`🔐 No matching configs for ${projectDomain}, showing all ${this.authConfigs.length} configs for easier management`);
                    this.projectAuthConfigs = this.authConfigs;
                } else {
                    console.log(`🔐 Found ${matchingConfigs.length} matching configs for project domain: ${projectDomain}`, matchingConfigs);
                    this.projectAuthConfigs = matchingConfigs;
                }
                
            } catch (error) {
                console.error('Error filtering auth configs for project:', error);
                this.projectAuthConfigs = this.authConfigs; // Fallback to showing all configs
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
            this.authSetup.progressMessage = 'Configuring basic authentication...';
            this.authSetup.progress = 15;

            if (!this.token) {
                throw new Error('Authentication token not available. Please login first.');
            }

            // Create the auth config in the database with new fields for multiple configs
            const authConfigData = {
                name: config.name,
                type: 'basic',
                domain: this.extractDomainFromUrl(config.url),
                url: config.url,
                username: config.username,
                password: config.password,
                login_page: config.loginPage,
                success_url: config.successUrl,
                project_id: this.selectedProject?.id || null,
                auth_role: config.auth_role || 'default',
                auth_description: config.auth_description || `Basic authentication for ${config.username}`,
                priority: config.priority || 1,
                is_default: config.is_default || false
            };

            const response = await this.apiCall('/auth/configs', {
                method: 'POST',
                body: JSON.stringify(authConfigData)
            });

            if (!response.success) {
                throw new Error(response.message || 'Failed to create authentication configuration');
            }

            await this.simulateAuthProgress();
            return response.data;
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

                const response = await this.apiCall(`/auth/configs/${config.id}/test`, {
                    method: 'POST'
                });

                if (response.success) {
                    config.status = 'active';
                    config.last_used = new Date().toISOString();
                    this.showNotification(`Authentication test successful for ${config.domain}`, 'success');
                } else {
                    config.status = 'failed';
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
            
            // Populate the form with ALL existing data including new fields
            this.editAuthForm = {
                name: config.name || config.domain || '',
                url: config.url || '',
                type: config.type || 'basic',
                username: config.username || '',
                password: '', // Don't pre-fill password for security
                loginPage: config.loginPage || config.login_page || '',
                successUrl: config.successUrl || config.success_url || '',
                apiKey: '', // Don't pre-fill API key for security
                token: '', // Don't pre-fill token for security
                auth_role: config.auth_role || 'default',
                auth_description: config.auth_description || '',
                priority: config.priority || 1,
                is_default: config.is_default || false
            };
            
            this.showEditAuth = true;
        },

        async updateAuthConfig() {
            try {
                if (!this.editingConfig) return;

                this.loading = true;
                
                // Prepare the update data, including all form fields and new fields
                const updateData = {
                    name: this.editAuthForm.name,
                    domain: this.extractDomainFromUrl(this.editAuthForm.url),
                    url: this.editAuthForm.url,
                    type: this.editAuthForm.type,
                    username: this.editAuthForm.username,
                    password: this.editAuthForm.password, // Will be empty if not changed
                    login_page: this.editAuthForm.loginPage,
                    success_url: this.editAuthForm.successUrl,
                    status: 'active',
                    auth_role: this.editAuthForm.auth_role,
                    auth_description: this.editAuthForm.auth_description,
                    priority: this.editAuthForm.priority,
                    is_default: this.editAuthForm.is_default
                };
                
                console.log('🔄 Updating auth config with data:', updateData);
                
                const response = await this.apiCall(`/auth/configs/${this.editingConfig.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });

                // Update the config in the local array
                const index = this.authConfigs.findIndex(c => c.id === this.editingConfig.id);
                if (index !== -1) {
                    this.authConfigs[index] = { ...this.authConfigs[index], ...response.data };
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
            if (!confirm(`Are you sure you want to delete the "${config.auth_role}" authentication configuration?`)) {
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
                    
                    this.showNotification(`${config.auth_role} authentication configuration deleted`, 'success');
                } else {
                    throw new Error(response.message || 'Failed to delete configuration');
                }
            } catch (error) {
                console.error('Failed to delete auth config:', error);
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
            this.violationPagination.page = 1;
            this.jumpToPageNumber = 1;
            this.violations = [];
            
            try {
                await Promise.all([
                    this.loadViolationSummary(session.id),
                    this.loadViolations(session.id, 1)
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
            this.violationPagination.page = 1;
            this.jumpToPageNumber = 1;
            this.resetViolationFilters();
        },

        async loadViolationSummary(sessionId) {
            try {
                const apiBaseUrl = this.API_BASE_URL || 'http://localhost:3001/api';
                
                // Use different endpoint based on result_type filter
                let endpoint;
                if (this.violationFilters.result_type === 'all' || this.violationFilters.result_type === 'pass') {
                    endpoint = `${apiBaseUrl}/violations/session/${sessionId}/all-results/summary`;
                } else {
                    endpoint = `${apiBaseUrl}/violations/session/${sessionId}/summary`;
                }
                
                const response = await fetch(endpoint, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                
                if (!response.ok) throw new Error('Failed to load results summary');
                
                const summaryData = await response.json();
                this.violationSummary = summaryData.summary || summaryData;
            } catch (error) {
                console.error('Error loading results summary:', error);
                throw error;
            }
        },

        async loadViolations(sessionId, page = null) {
            if (this.loadingViolations) return;
            
            this.loadingViolations = true;
            
            try {
                const currentPage = page || this.violationPagination.page;
                
                const params = new URLSearchParams({
                    page: currentPage,
                    limit: this.violationPagination.limit,
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
                
                // Use different endpoint based on result_type filter
                let endpoint;
                if (this.violationFilters.result_type === 'all' || this.violationFilters.result_type === 'pass') {
                    endpoint = `${apiBaseUrl}/violations/session/${sessionId}/all-results?${params}`;
                } else {
                    endpoint = `${apiBaseUrl}/violations/session/${sessionId}?${params}`;
                }
                
                const response = await fetch(endpoint, {
                    headers: { Authorization: `Bearer ${this.token}` }
                });
                
                if (!response.ok) throw new Error('Failed to load test results');
                
                const data = await response.json();
                
                // Replace violations instead of appending for page-based pagination
                this.violations = data.data || data.violations || data.results || [];
                this.violationPagination = data.pagination || {
                    page: currentPage,
                    limit: this.violationPagination.limit,
                    total: data.total || 0,
                    pages: Math.ceil((data.total || 0) / this.violationPagination.limit),
                    hasNext: currentPage < Math.ceil((data.total || 0) / this.violationPagination.limit),
                    hasPrev: currentPage > 1
                };
                
                // Update jump to page number to current page
                this.jumpToPageNumber = currentPage;
                
            } catch (error) {
                console.error('Error loading test results:', error);
                this.addNotification('Error', 'Failed to load test results', 'error');
            } finally {
                this.loadingViolations = false;
            }
        },

        async goToPage(page) {
            if (page < 1 || page > this.violationPagination.pages || this.loadingViolations) return;
            
            await this.loadViolations(this.violationInspectorSession.id, page);
        },

        getVisiblePageNumbers() {
            const current = this.violationPagination.page;
            const total = this.violationPagination.pages;
            const visible = [];
            
            if (total <= 7) {
                // Show all pages if 7 or fewer
                for (let i = 1; i <= total; i++) {
                    visible.push(i);
                }
            } else {
                // Always show first page
                visible.push(1);
                
                if (current <= 4) {
                    // Current page is near the beginning
                    for (let i = 2; i <= 5; i++) {
                        visible.push(i);
                    }
                    visible.push('...');
                    visible.push(total);
                } else if (current >= total - 3) {
                    // Current page is near the end
                    visible.push('...');
                    for (let i = total - 4; i <= total; i++) {
                        visible.push(i);
                    }
                } else {
                    // Current page is in the middle
                    visible.push('...');
                    for (let i = current - 1; i <= current + 1; i++) {
                        visible.push(i);
                    }
                    visible.push('...');
                    visible.push(total);
                }
            }
            
            return visible.filter(page => page !== '...' || visible.indexOf(page) === visible.lastIndexOf(page));
        },

        async applyViolationFilters() {
            this.violationPagination.page = 1;
            this.violations = [];
            await this.loadViolations(this.violationInspectorSession.id, 1);
        },

        resetViolationFilters() {
            this.violationFilters = {
                result_type: 'fail',
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
            this.violationPagination.page = 1;
            this.jumpToPageNumber = 1;
        },

        async sortViolations(field) {
            if (this.violationSort.by === field) {
                this.violationSort.order = this.violationSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                this.violationSort.by = field;
                this.violationSort.order = 'asc';
            }
            
            this.violationPagination.page = 1;
            this.violations = [];
            await this.loadViolations(this.violationInspectorSession.id, 1);
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

        // Automated Test Details Modal Functions
        async openAutomatedTestDetails(violation) {
            try {
                console.log('🔍 Opening automated test details for violation:', violation.id);
                
                this.currentAutomatedTest = {
                    violation,
                    sessionId: this.violationInspectorSession.id
                };
                
                // Reset state
                this.automatedTestNotes = violation.notes || '';
                this.automatedTestStatus = violation.status || 'open';
                this.isSavingAutomatedTest = false;
                
                // Load detailed test information
                await this.loadAutomatedTestDetails(violation.id);
                
                // Load test history for this violation/requirement
                await this.loadAutomatedTestHistory(violation.wcag_criterion, violation.url);
                
                this.showAutomatedTestModal = true;
                
            } catch (error) {
                console.error('❌ Error opening automated test details:', error);
                this.showNotification('Failed to load test details', 'error');
            }
        },

        async loadAutomatedTestDetails(violationId) {
            try {
                console.log('📊 Loading automated test details for violation:', violationId);
                
                // Load violation details (now includes WCAG requirement and history)
                const response = await this.apiCall(`/violations/${violationId}`);
                
                console.log('✅ Violation details loaded:', response);
                
                // Update test details with all the information from the enhanced endpoint
                this.automatedTestDetails = {
                    violation: response.violation,
                    wcagRequirement: response.wcag_requirement,
                    violationHistory: response.violation_history || [],
                    similarViolations: response.similar_violations || []
                };
                
            } catch (error) {
                console.error('Error loading automated test details:', error);
                this.automatedTestDetails = null;
            }
        },

        async loadAutomatedTestHistory(wcagCriterion, pageUrl) {
            // This function is no longer needed since history is loaded with details
            // But keeping it for backward compatibility
            try {
                if (this.automatedTestDetails && this.automatedTestDetails.violationHistory) {
                    this.automatedTestHistory = this.automatedTestDetails.violationHistory;
                } else {
                    this.automatedTestHistory = [];
                }
                
            } catch (error) {
                console.error('Error loading test history:', error);
                this.automatedTestHistory = [];
            }
        },

        async saveAutomatedTestUpdate() {
            try {
                this.isSavingAutomatedTest = true;
                
                const response = await this.apiCall(`/violations/${this.currentAutomatedTest.violation.id}/update`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        notes: this.automatedTestNotes,
                        status: this.automatedTestStatus
                    })
                });
                
                if (response.success) {
                    // Update the violation in the list
                    const violationIndex = this.violations.findIndex(v => v.id === this.currentAutomatedTest.violation.id);
                    if (violationIndex !== -1) {
                        this.violations[violationIndex].notes = this.automatedTestNotes;
                        this.violations[violationIndex].status = this.automatedTestStatus;
                    }
                    
                    this.showNotification('Test details updated successfully', 'success');
                    this.closeAutomatedTestModal();
                } else {
                    throw new Error(response.message || 'Failed to update test details');
                }
                
            } catch (error) {
                console.error('Error saving automated test update:', error);
                this.showNotification('Failed to save test details', 'error');
            } finally {
                this.isSavingAutomatedTest = false;
            }
        },

        closeAutomatedTestModal() {
            this.showAutomatedTestModal = false;
            this.currentAutomatedTest = null;
            this.automatedTestDetails = null;
            this.automatedTestHistory = [];
            this.automatedTestNotes = '';
            this.automatedTestStatus = '';
            this.isSavingAutomatedTest = false;
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
            this.violationPagination.page = 1;
            this.jumpToPageNumber = 1;
            this.violations = [];
            this.resetViolationFilters();
            
            try {
                await Promise.all([
                    this.loadViolationSummary(session.id),
                    this.loadViolations(session.id, 1)
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
            this.violationPagination.page = 1;
            this.jumpToPageNumber = 1;
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

        // Result Type Helper Methods
        getResultTypeDisplayText(resultType) {
            switch (resultType) {
                case 'all': return 'All Tests';
                case 'pass': return 'Passed Tests';
                case 'fail': return 'Failed Tests';
                default: return 'Failed Tests';
            }
        },

        getResultBadgeClass(result) {
            switch (result) {
                case 'pass': return 'bg-green-100 text-green-800 border-green-300';
                case 'fail': return 'bg-red-100 text-red-800 border-red-300';
                case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-300';
                default: return 'bg-gray-100 text-gray-800 border-gray-300';
            }
        },

        getResultDisplayText(result) {
            switch (result) {
                case 'pass': return 'Pass';
                case 'fail': return 'Fail';
                case 'in_progress': return 'In Progress';
                case 'assigned': return 'Assigned';
                default: return result || 'Unknown';
            }
        },

        getResultsDisplayName() {
            const filterType = this.violationFilters.result_type;
            switch (filterType) {
                case 'all': return 'test results';
                case 'pass': return 'passed tests';
                case 'fail': return 'violations';
                default: return 'violations';
            }
        },

        getResultsLoadingMessage() {
            const filterType = this.violationFilters.result_type;
            switch (filterType) {
                case 'all': return 'Loading all test results...';
                case 'pass': return 'Loading passed tests...';
                case 'fail': return 'Loading violations...';
                default: return 'Loading violations...';
            }
        },

        getResultsEmptyMessage() {
            const filterType = this.violationFilters.result_type;
            switch (filterType) {
                case 'all': return 'No test results found for this session.';
                case 'pass': return 'No passed tests found for this session.';
                case 'fail': return 'No violations found for this session.';
                default: return 'No violations found for this session.';
            }
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
        manualTestingCoverageAnalysis: { recommendations: [] },
        showCoverageAnalysis: false,
        showManualTestingModal: false,
        currentManualTest: null,
        manualTestingProcedure: null,
        manualTestingContext: { violations: [], recommended_tools: [] },

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
        },

        // Unified Test Grid Functions (Task 2.1.1)
        async viewSessionTestGrid(session) {
            this.currentSessionDetails = session;
            this.viewingSessionDetails = true;
            this.testInstances = [];
            this.filteredTestInstances = [];
            this.selectedTestInstances = [];
            this.resetTestFilters();
            this.resetTestGridPagination();
            await this.loadTestInstances(session.id);
            
            // Initialize activity feed for this session
            await this.initActivityFeed(session.id, session.name);
        },

        closeSessionTestGrid() {
            this.viewingSessionDetails = false;
            this.currentSessionDetails = null;
            this.testInstances = [];
            this.filteredTestInstances = [];
            this.selectedTestInstances = [];
            
            // Close activity feed when closing session
            this.closeActivityFeed();
        },

        async loadTestInstances(sessionId) {
            try {
                this.loading = true;
                const response = await this.apiCall(`/sessions/${sessionId}/tests?limit=1000&page=1&sort_by=updated_at&sort_order=DESC`);
                
                if (response.success) {
                    this.testInstances = response.data || [];
                    this.applyTestFilters();
                    // Load progress data
                    await this.loadSessionProgressMetrics(sessionId);
                    console.log('Test instances loaded:', this.testInstances.length);
                } else {
                    console.error('Failed to load test instances:', response.error);
                    this.showNotification('Failed to load test instances', 'error');
                }
            } catch (error) {
                console.error('Error loading test instances:', error);
                this.showNotification('Error loading test instances', 'error');
            } finally {
                this.loading = false;
            }
        },

        async loadSessionProgressMetrics(sessionId) {
            try {
                const response = await this.apiCall(`/sessions/${sessionId}/progress`);
                
                if (response.success) {
                    this.sessionProgressMetrics = response.data;
                    this.calculateProgressTrends();
                } else {
                    console.error('Failed to load progress metrics:', response.error);
                }
            } catch (error) {
                console.error('Error loading progress metrics:', error);
            }
        },

        calculateProgressTrends() {
            if (!this.testInstances.length) return;

            // Calculate completion trends over time
            const completedTests = this.testInstances.filter(t => ['passed', 'failed', 'not_applicable'].includes(t.status));
            const dailyProgress = {};
            
            completedTests.forEach(test => {
                if (test.completed_at) {
                    const date = new Date(test.completed_at).toDateString();
                    dailyProgress[date] = (dailyProgress[date] || 0) + 1;
                }
            });

            this.progressTrends = {
                dailyCompletions: dailyProgress,
                completionVelocity: this.calculateCompletionVelocity(dailyProgress),
                estimatedCompletion: this.estimateCompletionDate(),
                productivityMetrics: this.calculateProductivityMetrics()
            };
        },

        calculateCompletionVelocity(dailyProgress) {
            const dates = Object.keys(dailyProgress).sort();
            if (dates.length < 2) return 0;

            const recentDays = dates.slice(-7); // Last 7 days
            const totalCompleted = recentDays.reduce((sum, date) => sum + dailyProgress[date], 0);
            return totalCompleted / recentDays.length; // Average per day
        },

        estimateCompletionDate() {
            const remainingTests = this.testInstances.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
            const velocity = this.progressTrends?.completionVelocity || 1;
            
            if (velocity > 0) {
                const daysRemaining = Math.ceil(remainingTests / velocity);
                const estimatedDate = new Date();
                estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);
                return estimatedDate;
            }
            return null;
        },

        calculateProductivityMetrics() {
            const testerStats = {};
            
            this.testInstances.forEach(test => {
                if (test.assigned_tester && ['passed', 'failed', 'not_applicable'].includes(test.status)) {
                    const tester = test.assigned_tester_name || test.assigned_tester;
                    if (!testerStats[tester]) {
                        testerStats[tester] = { completed: 0, assigned: 0, avgTimeToComplete: 0 };
                    }
                    testerStats[tester].completed++;
                }
                
                if (test.assigned_tester) {
                    const tester = test.assigned_tester_name || test.assigned_tester;
                    if (!testerStats[tester]) {
                        testerStats[tester] = { completed: 0, assigned: 0, avgTimeToComplete: 0 };
                    }
                    testerStats[tester].assigned++;
                }
            });

            return testerStats;
        },

        getProgressPercentage() {
            if (!this.testInstances.length) return 0;
            const completed = this.testInstances.filter(t => ['passed', 'failed', 'not_applicable'].includes(t.status)).length;
            return Math.round((completed / this.testInstances.length) * 100);
        },

        getStatusBreakdown() {
            const breakdown = {
                pending: 0,
                in_progress: 0,
                passed: 0,
                failed: 0,
                untestable: 0,
                not_applicable: 0,
                needs_review: 0
            };

            this.testInstances.forEach(test => {
                if (breakdown.hasOwnProperty(test.status)) {
                    breakdown[test.status]++;
                }
            });

            return breakdown;
        },

        getRequirementLevelBreakdown() {
            const breakdown = { A: { total: 0, completed: 0 }, AA: { total: 0, completed: 0 }, AAA: { total: 0, completed: 0 } };
            
            this.testInstances.forEach(test => {
                const level = test.requirement_level || 'AA';
                if (breakdown[level]) {
                    breakdown[level].total++;
                    if (['passed', 'failed', 'not_applicable'].includes(test.status)) {
                        breakdown[level].completed++;
                    }
                }
            });

            return breakdown;
        },

        getAssignmentStats() {
            const assigned = this.testInstances.filter(t => t.assigned_tester).length;
            const unassigned = this.testInstances.length - assigned;
            
            return {
                assigned,
                unassigned,
                assignmentPercentage: this.testInstances.length > 0 ? Math.round((assigned / this.testInstances.length) * 100) : 0
            };
        },

        getTeamWorkload() {
            const workload = {};
            
            this.testInstances.forEach(test => {
                if (test.assigned_tester) {
                    const tester = test.assigned_tester_name || test.assigned_tester;
                    if (!workload[tester]) {
                        workload[tester] = { total: 0, completed: 0, inProgress: 0, pending: 0 };
                    }
                    
                    workload[tester].total++;
                    
                    if (['passed', 'failed', 'not_applicable'].includes(test.status)) {
                        workload[tester].completed++;
                    } else if (test.status === 'in_progress') {
                        workload[tester].inProgress++;
                    } else if (test.status === 'pending') {
                        workload[tester].pending++;
                    }
                }
            });

            return workload;
        },

        formatDuration(milliseconds) {
            const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
            const hours = Math.floor((milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            
            if (days > 0) {
                return `${days}d ${hours}h`;
            } else if (hours > 0) {
                return `${hours}h`;
            } else {
                return '<1h';
            }
        },

        async refreshTestInstances() {
            if (this.currentSessionDetails) {
                await this.loadTestInstances(this.currentSessionDetails.id);
            }
        },

        applyTestFilters() {
            let filtered = [...this.testInstances].filter(test => test); // Filter out null/undefined tests first

            // Apply status filter
            if (this.testFilters.status) {
                filtered = filtered.filter(test => test && test.status === this.testFilters.status);
            }

            // Apply requirement type filter
            if (this.testFilters.requirementType) {
                filtered = filtered.filter(test => test && test.test_method === this.testFilters.requirementType);
            }

            // Apply conformance level filter
            if (this.testFilters.conformanceLevel) {
                filtered = filtered.filter(test => test && test.requirement_level === this.testFilters.conformanceLevel);
            }

            // Apply assigned tester filter
            if (this.testFilters.assignedTester) {
                if (this.testFilters.assignedTester === 'unassigned') {
                    filtered = filtered.filter(test => test && !test.assigned_tester);
                } else {
                    filtered = filtered.filter(test => test && test.assigned_tester === this.testFilters.assignedTester);
                }
            }

            // Apply search filter
            if (this.testFilters.search) {
                const searchTerm = this.testFilters.search.toLowerCase();
                filtered = filtered.filter(test => test &&
                    ((test.requirement_id && test.requirement_id.toLowerCase().includes(searchTerm)) ||
                    (test.criterion_number && test.criterion_number.toLowerCase().includes(searchTerm)) ||
                    (test.requirement_title && test.requirement_title.toLowerCase().includes(searchTerm)) ||
                    (test.requirement_description && test.requirement_description.toLowerCase().includes(searchTerm)) ||
                    (test.testing_instructions && test.testing_instructions.toLowerCase().includes(searchTerm)))
                );
            }

            // Apply sorting
            if (this.testGridSort.field) {
                filtered.sort((a, b) => {
                    // Add null checks for sorting
                    if (!a || !b) return 0;
                    
                    let aVal = a[this.testGridSort.field] || '';
                    let bVal = b[this.testGridSort.field] || '';
                    
                    // Handle special cases
                    if (this.testGridSort.field === 'updated_at') {
                        aVal = new Date(aVal);
                        bVal = new Date(bVal);
                    } else if (typeof aVal === 'string') {
                        aVal = aVal.toLowerCase();
                        bVal = bVal.toLowerCase();
                    }
                    
                    if (aVal < bVal) return this.testGridSort.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return this.testGridSort.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            this.filteredTestInstances = filtered;
            this.updateTestGridPagination();
        },

        sortTestInstances(field) {
            if (this.testGridSort.field === field) {
                this.testGridSort.direction = this.testGridSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.testGridSort.field = field;
                this.testGridSort.direction = 'asc';
            }
            this.applyTestFilters();
        },

        updateTestGridPagination() {
            this.testGridPagination.totalPages = Math.ceil(this.filteredTestInstances.length / this.testGridPagination.pageSize);
            
            if (this.testGridPagination.page > this.testGridPagination.totalPages) {
                this.testGridPagination.page = Math.max(1, this.testGridPagination.totalPages);
            }

            const startIndex = (this.testGridPagination.page - 1) * this.testGridPagination.pageSize;
            const endIndex = startIndex + this.testGridPagination.pageSize;
            this.paginatedTestInstances = this.filteredTestInstances.slice(startIndex, endIndex);
        },

        updateTestGridPage(page) {
            if (page >= 1 && page <= this.testGridPagination.totalPages) {
                this.testGridPagination.page = page;
                this.updateTestGridPagination();
            }
        },

        resetTestFilters() {
            this.testFilters = {
                status: '',
                requirementType: '',
                conformanceLevel: '',
                assignedTester: '',
                search: ''
            };
        },

        resetTestGridPagination() {
            this.testGridPagination = {
                page: 1,
                pageSize: 50,
                totalPages: 1
            };
        },

        // Bulk Operations
        toggleTestSelection(testId) {
            const index = this.selectedTestInstances.indexOf(testId);
            if (index > -1) {
                this.selectedTestInstances.splice(index, 1);
            } else {
                this.selectedTestInstances.push(testId);
            }
        },

        toggleAllTestSelection(checked) {
            if (checked) {
                this.selectedTestInstances = [...this.paginatedTestInstances.filter(t => t && t.id).map(t => t.id)];
            } else {
                this.selectedTestInstances = [];
            }
        },

        clearTestSelection() {
            this.selectedTestInstances = [];
        },

        async bulkUpdateStatus(status) {
            if (this.selectedTestInstances.length === 0) return;

            try {
                this.loading = true;
                const promises = this.selectedTestInstances.map(testId => 
                    this.apiCall(`/test-instances/${testId}`, 'PUT', { status })
                );

                await Promise.all(promises);
                await this.refreshTestInstances();
                this.clearTestSelection();
                this.showNotification(`Updated ${this.selectedTestInstances.length} tests to ${status}`, 'success');
            } catch (error) {
                console.error('Error in bulk status update:', error);
                this.showNotification('Error updating test statuses', 'error');
            } finally {
                this.loading = false;
            }
        },

        async bulkAssignTester() {
            if (this.selectedTestInstances.length === 0 || !this.bulkAssignmentTester) return;

            try {
                this.loading = true;
                const promises = this.selectedTestInstances.map(testId => 
                    this.apiCall(`/test-instances/${testId}`, 'PUT', { assigned_tester: this.bulkAssignmentTester })
                );

                await Promise.all(promises);
                await this.refreshTestInstances();
                this.clearTestSelection();
                this.bulkAssignmentTester = '';
                
                const tester = this.availableTesters.find(t => t.id === this.bulkAssignmentTester);
                const testerName = tester ? (tester.full_name || tester.username) : 'selected tester';
                this.showNotification(`Assigned ${this.selectedTestInstances.length} tests to ${testerName}`, 'success');
            } catch (error) {
                console.error('Error in bulk assignment:', error);
                this.showNotification('Error assigning tests', 'error');
            } finally {
                this.loading = false;
            }
        },

        showQuickAssignModal(testInstance) {
            this.quickAssignTestInstance = testInstance;
            this.showQuickAssignModal = true;
            
            // Load testers if not already loaded
            if (!this.availableTesters || this.availableTesters.length === 0) {
                this.loadAvailableTesters();
            }
        },

        async unassignTestInstance(testInstanceId) {
            try {
                const response = await this.apiCall(`/test-instances/${testInstanceId}`, 'PUT', { assigned_tester: null });
                
                if (response.success) {
                    this.showNotification('Tester unassigned successfully', 'success');
                    await this.refreshTestInstances();
                } else {
                    this.showNotification(response.error || 'Failed to unassign tester', 'error');
                }
            } catch (error) {
                console.error('Error unassigning tester:', error);
                this.showNotification('Failed to unassign tester', 'error');
            }
        },

        // Helper functions for badges and formatting
        getTestStatusBadgeClass(status) {
            const classes = {
                'pending': 'bg-yellow-100 text-yellow-800',
                'in_progress': 'bg-blue-100 text-blue-800',
                'passed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'not_applicable': 'bg-gray-100 text-gray-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        getTestMethodBadgeClass(method) {
            const classes = {
                'automated': 'bg-purple-100 text-purple-800',
                'manual': 'bg-orange-100 text-orange-800',
                'both': 'bg-indigo-100 text-indigo-800'
            };
            return classes[method] || 'bg-gray-100 text-gray-800';
        },

        getConformanceLevelBadgeClass(level) {
            const classes = {
                'A': 'bg-green-100 text-green-800',
                'AA': 'bg-blue-100 text-blue-800',
                'AAA': 'bg-purple-100 text-purple-800'
            };
            return classes[level] || 'bg-gray-100 text-gray-800';
        },

        formatTestStatus(status) {
            const formatted = {
                'pending': 'Pending',
                'in_progress': 'In Progress',
                'passed': 'Passed',
                'failed': 'Failed',
                'not_applicable': 'Not Applicable'
            };
            return formatted[status] || status;
        },

        getCompletedTestsCount() {
            return this.testInstances.filter(test => 
                test.status === 'passed' || test.status === 'failed' || test.status === 'not_applicable'
            ).length;
        },

        truncateText(text, maxLength) {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        capitalizeFirst(str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        // Testing Sessions Management Functions
        async refreshTestingSessionsTabData() {
            if (!this.selectedProject) return;
            await this.loadTestingSessions();
        },

        async loadTestingSessions() {
            if (!this.selectedProject) return;
            
            try {
                this.loading = true;
                const response = await this.apiCall(`/sessions?project_id=${this.selectedProject.id}`);
                
                if (response.success) {
                    this.testingSessions = response.data || [];
                    console.log('📋 Testing sessions loaded:', this.testingSessions.length);
                } else {
                    console.error('Failed to load testing sessions:', response.error);
                    this.showNotification('Failed to load testing sessions', 'error');
                }
            } catch (error) {
                console.error('Error loading testing sessions:', error);
                this.showNotification('Error loading testing sessions', 'error');
            } finally {
                this.loading = false;
            }
        },

        async loadTestConfiguration(sessionId) {
            try {
                this.loading = true;
                console.log('🔧 Loading test configuration for session:', sessionId);
                
                const response = await this.apiCall(`/sessions/${sessionId}/test-configuration`);
                
                if (response.success) {
                    this.testConfiguration = response.data;
                    console.log('✅ Test configuration loaded:', response.data);
                    return response.data;
                } else {
                    console.error('Failed to load test configuration:', response.error);
                    this.showNotification('Failed to load test configuration', 'error');
                    return null;
                }
            } catch (error) {
                console.error('Error loading test configuration:', error);
                this.showNotification('Error loading test configuration', 'error');
                return null;
            } finally {
                this.loading = false;
            }
        },

        async openTestConfigurationModal(session) {
            this.selectedTestingSession = session;
            this.showTestConfigurationModal = true;
            
            // Load comprehensive test configuration
            await this.loadTestConfiguration(session.id);
        },

        closeTestConfigurationModal() {
            this.showTestConfigurationModal = false;
            this.selectedTestingSession = null;
            this.testConfiguration = null;
            this.automatedTestConfig = this.getDefaultAutomatedTestConfig();
        },

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

        togglePlaywrightTestType(testType) {
            const testTypes = this.automatedTestConfig.playwright.testTypes;
            const index = testTypes.indexOf(testType);
            if (index > -1) {
                testTypes.splice(index, 1);
            } else {
                testTypes.push(testType);
            }
        },

        togglePlaywrightBrowser(browser) {
            const browsers = this.automatedTestConfig.playwright.browsers;
            const index = browsers.indexOf(browser);
            if (index > -1) {
                browsers.splice(index, 1);
            } else {
                browsers.push(browser);
            }
        },

        togglePlaywrightViewport(viewport) {
            const viewports = this.automatedTestConfig.playwright.viewports;
            const index = viewports.indexOf(viewport);
            if (index > -1) {
                viewports.splice(index, 1);
            } else {
                viewports.push(viewport);
            }
        },

        getEstimatedTestTime() {
            if (!this.testConfiguration) return '0 minutes';
            
            const config = this.automatedTestConfig;
            let totalMinutes = 0;
            
            if (config.playwright.enabled && config.playwright.testTypes.length > 0) {
                totalMinutes += this.testConfiguration.testConfiguration.estimates.playwright.estimatedMinutes * 
                    (config.playwright.testTypes.length / 6) * config.playwright.browsers.length;
            }
            
            if (config.backend.enabled && config.backend.tools.length > 0) {
                totalMinutes += this.testConfiguration.testConfiguration.estimates.backend.estimatedMinutes * 
                    (config.backend.tools.length / 3);
            }
            
            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.round(totalMinutes % 60);
            
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            } else {
                return `${minutes} minutes`;
            }
        },

        getTestCoverageCount() {
            if (!this.testConfiguration) return 0;
            
            const requirements = this.testConfiguration.requirements.details;
            const config = this.automatedTestConfig;
            
            let coveredCount = 0;
            requirements.forEach(req => {
                const isAutomated = req.testMethod === 'automated' || req.testMethod === 'hybrid';
                const isManual = req.testMethod === 'manual' || req.testMethod === 'hybrid';
                
                if (isAutomated && (config.playwright.enabled || config.backend.enabled)) {
                    coveredCount++;
                } else if (isManual) {
                    coveredCount++; // Manual tests will be available regardless
                }
            });
            
            return coveredCount;
        },

        async startAutomatedTestingFromConfig() {
            if (!this.selectedTestingSession || !this.testConfiguration) {
                this.showNotification('No session or configuration selected', 'error');
                return;
            }

            try {
                this.loading = true;
                
                const config = this.automatedTestConfig;
                const sessionId = this.selectedTestingSession.id;
                
                // Start comprehensive testing with user configuration
                const response = await this.apiCall(`/projects/${this.selectedProject.id}/comprehensive-testing`, {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionName: this.selectedTestingSession.name,
                        description: `Automated testing initiated from compliance session`,
                        testingApproach: 'hybrid',
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
                    this.showNotification('Automated testing started successfully!', 'success');
                    this.closeTestConfigurationModal();
                    
                    // Start monitoring progress
                    this.startTestingProgressMonitoring(sessionId);
                    
                    // Refresh sessions to show updated status
                    await this.loadTestingSessions();
                } else {
                    this.showNotification(`Failed to start testing: ${response.error}`, 'error');
                }
            } catch (error) {
                console.error('Error starting automated testing:', error);
                this.showNotification('Error starting automated testing', 'error');
            } finally {
                this.loading = false;
            }
        },

        startTestingProgressMonitoring(sessionId) {
            // Reset progress tracking
            this.testingProgress = {
                active: true,
                sessionId: sessionId,
                percentage: 0,
                completedTests: 0,
                totalTests: 0,
                currentPage: '',
                currentTool: '',
                message: 'Starting automated testing...',
                stage: 'preparing',
                estimatedTimeRemaining: null,
                startTime: Date.now(),
                errors: [],
                violationsFound: 0,
                passesFound: 0,
                warningsFound: 0
            };

            // WebSocket will handle real-time updates
            // This is just initialization
        },

        async createTestingSession() {
            if (!this.selectedProject || !this.newTestingSession.name.trim() || !this.newTestingSession.conformance_level) {
                this.showNotification('Please fill in all required fields', 'error');
                return;
            }

            try {
                this.loading = true;
                
                const sessionData = {
                    name: this.newTestingSession.name.trim(),
                    description: this.newTestingSession.description.trim(),
                    project_id: this.selectedProject.id,
                    conformance_level: this.newTestingSession.conformance_level,
                    custom_requirements: this.newTestingSession.custom_requirements || null
                };

                const response = await this.apiCall('/sessions', {
                    method: 'POST',
                    body: JSON.stringify(sessionData)
                });

                if (response.success) {
                    this.addNotification('Testing Session Created', 
                        `Session "${sessionData.name}" created with ${response.data.total_tests_count} test instances`, 
                        'success'
                    );
                    
                    this.showCreateTestingSession = false;
                    this.resetNewTestingSession();
                    await this.loadTestingSessions();
                } else {
                    this.showNotification(response.error || 'Failed to create testing session', 'error');
                }
            } catch (error) {
                console.error('Error creating testing session:', error);
                this.showNotification('Error creating testing session', 'error');
            } finally {
                this.loading = false;
            }
        },

        viewTestingSessionDetails(session) {
            // Navigate to session test grid view
            this.viewSessionTestGrid(session);
        },

        editTestingSession(session) {
            // Edit session functionality
            console.log('Editing session:', session);
            this.addNotification('Feature Coming Soon', 'Session editing will be available soon', 'info');
        },

        async duplicateTestingSession(session) {
            if (!session) return;

            try {
                this.loading = true;
                const response = await this.apiCall(`/sessions/${session.id}/duplicate`, {
                    method: 'POST'
                });

                if (response.success) {
                    this.addNotification('Session Duplicated', 
                        `Created duplicate session with ${response.data.total_tests_count} test instances`, 
                        'success'
                    );
                    await this.loadTestingSessions();
                } else {
                    this.showNotification(response.error || 'Failed to duplicate session', 'error');
                }
            } catch (error) {
                console.error('Error duplicating session:', error);
                this.showNotification('Error duplicating session', 'error');
            } finally {
                this.loading = false;
            }
        },

        async deleteTestingSession(session) {
            if (!session) {
                console.error('❌ No session provided for deletion');
                this.showNotification('Error: No session selected for deletion', 'error');
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to delete the testing session "${session.name}"?\n\nThis action cannot be undone and will remove:\n• All test results and findings\n• Session progress and configuration\n• Associated accessibility reports\n• Manual testing notes and observations`);
            
            if (!confirmed) {
                console.log('🚫 Session deletion cancelled by user');
                return;
            }

            try {
                console.log('🗑️ Deleting testing session:', session.name, session.id);
                this.loading = true;
                
                const response = await this.apiCall(`/sessions/${session.id}`, {
                    method: 'DELETE'
                });

                console.log('🗑️ Delete response:', response);

                if (response.success) {
                    this.showNotification(`Session "${session.name}" deleted successfully`, 'success');
                    
                    // Refresh all session-related data
                    await Promise.all([
                        this.loadTestingSessions(),
                        this.loadProjectTestSessions(),
                        this.loadAnalytics()
                    ]);
                    
                    console.log('✅ Session deleted and data refreshed');
                } else {
                    console.error('❌ Failed to delete session:', response.error);
                    this.showNotification(response.error || 'Failed to delete session', 'error');
                }
            } catch (error) {
                console.error('❌ Error deleting session:', error);
                this.showNotification('Error deleting session: ' + (error.message || 'Unknown error'), 'error');
            } finally {
                this.loading = false;
            }
        },

        resetNewTestingSession() {
            this.newTestingSession = {
                name: '',
                description: '',
                conformance_level: '',
                custom_requirements: ''
            };
        },

        getSessionStatusBadgeClass(status) {
            const classes = {
                'pending': 'bg-yellow-100 text-yellow-800',
                'in_progress': 'bg-blue-100 text-blue-800',
                'completed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'cancelled': 'bg-gray-100 text-gray-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        // Test Instance Detail Modal (Task 2.1.2)
        showTestInstanceModal: false,
        currentTestInstance: null,
        testInstanceStatus: '',
        testInstanceConfidenceLevel: '',
        testInstanceNotes: '',
        testInstanceRemediationNotes: '',
        testInstanceEvidence: [],
        testInstanceAssignedTester: '',
        
        // Test Assignment Interface (Task 2.1.3)
        showTestAssignmentPanel: false,
        draggedTest: null,
        dragOverTester: null,
        bulkAssignmentTester: '',
        
        // Enhanced pagination for test grid
        paginatedTestInstances: [],

        // Test Instance Detail Modal Functions (Task 2.1.2)
        async openTestInstanceModal(testInstance) {
            try {
                console.log('🔍 Opening test instance details for:', testInstance.id);
                
                this.currentTestInstance = testInstance;
                this.isLoadingTestInstance = true;
                
                // Reset form state
                this.testInstanceStatus = testInstance.status || 'pending';
                this.testInstanceNotes = testInstance.notes || '';
                this.testInstanceRemediationNotes = testInstance.remediation_notes || '';
                this.testInstanceConfidenceLevel = testInstance.confidence_level || 'medium';
                this.testInstanceAssignedTester = testInstance.assigned_tester || '';
                this.testInstanceEvidence = testInstance.evidence || [];
                this.isSavingTestInstance = false;
                
                // Load detailed test information
                await this.loadTestInstanceDetails(testInstance.id);
                
                // Load test history for this requirement
                if (testInstance.requirement_id) {
                    await this.loadTestInstanceHistory(testInstance.requirement_id, testInstance.page_id);
                }
                
                this.showTestInstanceModal = true;
                
            } catch (error) {
                console.error('❌ Error opening test instance details:', error);
                this.showNotification('Failed to load test details', 'error');
            } finally {
                this.isLoadingTestInstance = false;
            }
        },

        async loadTestInstanceDetails(testInstanceId) {
            try {
                const response = await this.apiCall(`/test-instances/${testInstanceId}`);
                
                if (response.success) {
                    this.testInstanceDetails = response.data;
                    console.log('Test instance details loaded:', this.testInstanceDetails);
                } else {
                    console.error('Failed to load test instance details:', response.error);
                    this.showNotification('Failed to load test details', 'error');
                }
            } catch (error) {
                console.error('Error loading test instance details:', error);
                this.showNotification('Error loading test details', 'error');
            }
        },

        async loadTestInstanceHistory(requirementId, pageId = null) {
            try {
                let endpoint = `/test-instances?requirement_id=${requirementId}&limit=20&sort=updated_at&order=desc`;
                if (pageId) {
                    endpoint += `&page_id=${pageId}`;
                }

                const response = await this.apiCall(endpoint);
                
                if (response.success) {
                    this.testInstanceHistory = response.data || [];
                    console.log('Test instance history loaded:', this.testInstanceHistory.length);
                } else {
                    console.error('Failed to load test instance history:', response.error);
                    this.testInstanceHistory = [];
                }
            } catch (error) {
                console.error('Error loading test instance history:', error);
                this.testInstanceHistory = [];
            }
        },

        async saveTestInstance() {
            if (!this.currentTestInstance) return;

            try {
                this.isSavingTestInstance = true;

                // Use the enhanced status management endpoint for better validation
                const statusUpdateData = {
                    status: this.testInstanceStatus,
                    confidence_level: this.testInstanceConfidenceLevel,
                    notes: this.testInstanceNotes,
                    remediation_notes: this.testInstanceRemediationNotes,
                    evidence: this.testInstanceEvidence
                };

                // Update status using the enhanced endpoint
                const statusResponse = await this.apiCall(
                    `/test-instances/${this.currentTestInstance.id}/status`, 
                    'PUT', 
                    statusUpdateData
                );

                if (!statusResponse.success) {
                    // Handle validation errors gracefully
                    if (statusResponse.validationErrors) {
                        this.showNotification(
                            `Validation failed: ${statusResponse.validationErrors.join(', ')}`, 
                            'error'
                        );
                        return;
                    }
                    throw new Error(statusResponse.error || 'Failed to update status');
                }

                // Update assignment if changed
                if (this.testInstanceAssignedTester !== this.currentTestInstance.assigned_tester) {
                    const assignmentData = {
                        assigned_tester: this.testInstanceAssignedTester,
                        notes: `Assignment updated via test detail modal`
                    };

                    const assignResponse = await this.apiCall(
                        `/test-instances/${this.currentTestInstance.id}/assign`, 
                        'POST', 
                        assignmentData
                    );

                    if (!assignResponse.success) {
                        console.warn('Failed to update assignment:', assignResponse.error);
                        this.showNotification('Status updated but assignment change failed', 'warning');
                    }
                }

                // Update the test instance in our local data
                const testIndex = this.testInstances.findIndex(t => t && t.id === this.currentTestInstance.id);
                if (testIndex !== -1) {
                    this.testInstances[testIndex] = {
                        ...this.testInstances[testIndex],
                        ...statusResponse.data
                    };
                }

                // Refresh the filtered and paginated views
                this.applyTestFilters();

                this.showNotification(
                    statusResponse.statusChange 
                        ? `Test status updated from ${statusResponse.statusChange.from} to ${statusResponse.statusChange.to}`
                        : 'Test instance updated successfully', 
                    'success'
                );

                this.closeTestInstanceModal();

            } catch (error) {
                console.error('❌ Error saving test instance:', error);
                this.showNotification('Failed to save test instance: ' + error.message, 'error');
            } finally {
                this.isSavingTestInstance = false;
            }
        },

        // Alias for modal compatibility
        async saveTestInstance() {
            return await this.saveTestInstanceUpdate();
        },

        // Evidence handling functions for test instance modal
        async handleEvidenceUpload(event) {
            const files = Array.from(event.target.files);
            if (files.length === 0) return;

            try {
                for (const file of files) {
                    // Validate file size (50MB limit)
                    if (file.size > 50 * 1024 * 1024) {
                        this.showNotification(`File ${file.name} is too large (max 50MB)`, 'error');
                        continue;
                    }

                    // Validate file type
                    const allowedTypes = [
                        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
                        'video/mp4', 'video/webm', 'video/quicktime',
                        'audio/mp3', 'audio/wav', 'audio/ogg',
                        'application/pdf', 'text/plain', 'text/html', 'application/json',
                        'application/zip', 'application/x-zip-compressed'
                    ];

                    if (!allowedTypes.includes(file.type)) {
                        this.showNotification(`File type ${file.type} not allowed`, 'error');
                        continue;
                    }

                    // Determine evidence type based on file type
                    let evidenceType = 'other';
                    if (file.type.startsWith('image/')) {
                        evidenceType = 'screenshot';
                    } else if (file.type.startsWith('video/')) {
                        evidenceType = 'video';
                    } else if (file.type.startsWith('audio/')) {
                        evidenceType = 'audio';
                    } else if (file.type === 'application/pdf') {
                        evidenceType = 'document';
                    }

                    // Create a temporary file path (in real implementation, this would be uploaded to storage)
                    const tempFilePath = `evidence/${Date.now()}_${file.name}`;

                    // Add evidence via API
                    const evidenceData = {
                        evidence_type: evidenceType,
                        file_path: tempFilePath,
                        description: `Uploaded file: ${file.name}`,
                        file_size: file.size,
                        mime_type: file.type,
                        original_filename: file.name,
                        metadata: {
                            upload_method: 'test_detail_modal',
                            file_hash: await this.calculateFileHash(file)
                        }
                    };

                    const response = await this.apiCall(
                        `/test-instances/${this.currentTestInstance.id}/evidence`,
                        'POST',
                        evidenceData
                    );

                    if (response.success) {
                        // Update local evidence array
                        this.testInstanceEvidence = response.data.test_instance.evidence || [];
                        this.showNotification(`Evidence ${file.name} uploaded successfully`, 'success');
                    } else {
                        this.showNotification(`Failed to upload ${file.name}: ${response.error}`, 'error');
                    }
                }

                // Clear the file input
                event.target.value = '';

            } catch (error) {
                console.error('❌ Error uploading evidence:', error);
                this.showNotification('Failed to upload evidence: ' + error.message, 'error');
            }
        },

        async calculateFileHash(file) {
            // Simple hash calculation for file integrity
            try {
                const arrayBuffer = await file.arrayBuffer();
                const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (error) {
                console.warn('Could not calculate file hash:', error);
                return null;
            }
        },

        async removeEvidence(evidenceId) {
            if (!this.currentTestInstance || !evidenceId) return;

            try {
                const response = await this.apiCall(
                    `/test-instances/${this.currentTestInstance.id}/evidence/${evidenceId}`,
                    'DELETE'
                );

                if (response.success) {
                    // Update local evidence array (filter out deleted items)
                    this.testInstanceEvidence = (response.data.test_instance.evidence || [])
                        .filter(ev => ev.status !== 'deleted');
                    this.showNotification('Evidence removed successfully', 'success');
                } else {
                    this.showNotification('Failed to remove evidence: ' + response.error, 'error');
                }

            } catch (error) {
                console.error('❌ Error removing evidence:', error);
                this.showNotification('Failed to remove evidence: ' + error.message, 'error');
            }
        },

        async updateEvidenceDescription(evidenceId, newDescription) {
            if (!this.currentTestInstance || !evidenceId) return;

            try {
                const response = await this.apiCall(
                    `/test-instances/${this.currentTestInstance.id}/evidence/${evidenceId}`,
                    'PUT',
                    { description: newDescription }
                );

                if (response.success) {
                    // Update local evidence array
                    this.testInstanceEvidence = response.data.test_instance.evidence || [];
                    this.showNotification('Evidence description updated', 'success');
                } else {
                    this.showNotification('Failed to update evidence: ' + response.error, 'error');
                }

            } catch (error) {
                console.error('❌ Error updating evidence:', error);
                this.showNotification('Failed to update evidence: ' + error.message, 'error');
            }
        },

        closeTestInstanceModal() {
            this.showTestInstanceModal = false;
            this.currentTestInstance = null;
            this.testInstanceDetails = null;
            this.testInstanceHistory = [];
            this.isLoadingTestInstance = false;
            this.isSavingTestInstance = false;
            
            // Reset form state
            this.testInstanceStatus = '';
            this.testInstanceNotes = '';
            this.testInstanceRemediationNotes = '';
            this.testInstanceConfidenceLevel = 'medium';
            this.testInstanceAssignedTester = '';
            this.testInstanceEvidence = [];
        },

        async assignTesterToTestInstance(testerId) {
            if (!this.currentTestInstance || !testerId) return;

            try {
                const response = await this.apiCall(
                    `/test-instances/${this.currentTestInstance.id}/assign`,
                    'PUT',
                    { assigned_tester: testerId }
                );

                if (response.success) {
                    this.testInstanceAssignedTester = testerId;
                    this.currentTestInstance.assigned_tester = testerId;
                    this.showNotification('Tester assigned successfully', 'success');
                    await this.refreshTestInstances();
                } else {
                    this.showNotification(response.error || 'Failed to assign tester', 'error');
                }
            } catch (error) {
                console.error('Error assigning tester:', error);
                this.showNotification('Failed to assign tester', 'error');
            }
        },

        async unassignTesterFromTestInstance() {
            if (!this.currentTestInstance) return;

            try {
                const response = await this.apiCall(
                    `/test-instances/${this.currentTestInstance.id}/assign`,
                    'PUT',
                    { assigned_tester: null }
                );

                if (response.success) {
                    this.testInstanceAssignedTester = '';
                    this.currentTestInstance.assigned_tester = null;
                    this.showNotification('Tester unassigned successfully', 'success');
                    await this.refreshTestInstances();
                } else {
                    this.showNotification(response.error || 'Failed to unassign tester', 'error');
                }
            } catch (error) {
                console.error('Error unassigning tester:', error);
                this.showNotification('Failed to unassign tester', 'error');
            }
        },

        getTestInstanceStatusDisplayText(status) {
            const statusMap = {
                'pending': 'Pending',
                'in_progress': 'In Progress',
                'passed': 'Passed',
                'failed': 'Failed',
                'untestable': 'Untestable',
                'not_applicable': 'Not Applicable',
                'needs_review': 'Needs Review'
            };
            return statusMap[status] || status;
        },

        // Testing Sessions Tab Functions

        // ==============================================
        // TEST ASSIGNMENT INTERFACE FUNCTIONS (Task 2.1.3)
        // ==============================================

        // Drag and Drop Functions
        handleTestDragStart(event, test) {
            this.draggedTest = test;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/html', event.target.outerHTML);
            event.target.style.opacity = '0.5';
        },

        handleTestDragEnd(event) {
            event.target.style.opacity = '1';
            this.draggedTest = null;
            this.dragOverTester = null;
        },

        async handleTestDrop(event, testerId) {
            event.preventDefault();
            
            if (!this.draggedTest || !this.draggedTest.id) {
                console.warn('⚠️ No valid dragged test found');
                return;
            }
            
            // Store local reference to prevent race conditions
            const draggedTestRef = this.draggedTest;
            
            try {
                // Update test assignment
                const response = await this.apiCall(
                    `/test-instances/${draggedTestRef.id}/assign`,
                    'PUT',
                    { assigned_tester: testerId }
                );

                if (response.success) {
                    // Update local data - filter out null/undefined values and ensure both test and draggedTest have valid ids
                    const testIndex = this.testInstances.findIndex(t => 
                        t && t.id && draggedTestRef && draggedTestRef.id && t.id === draggedTestRef.id
                    );
                    if (testIndex !== -1) {
                        this.testInstances[testIndex].assigned_tester = testerId;
                        this.testInstances[testIndex].assigned_tester_name = testerId ? 
                            (this.availableTesters.find(t => t && t.id === testerId)?.full_name || 
                             this.availableTesters.find(t => t && t.id === testerId)?.username) : null;
                    }
                    
                    this.applyTestFilters();
                    this.showNotification(
                        testerId ? 'Test assigned successfully' : 'Test unassigned successfully', 
                        'success'
                    );
                } else {
                    this.showNotification(response.error || 'Failed to update assignment', 'error');
                }
            } catch (error) {
                console.error('Error in drag assignment:', error);
                this.showNotification('Failed to update assignment', 'error');
            }
            
            // Reset drag state
            this.draggedTest = null;
            this.dragOverTester = null;
        },

        // Workload Distribution Functions
        getTesterWorkload(testerId) {
            return this.testInstances.filter(test => test && test.assigned_tester === testerId).length;
        },

        getOptimalWorkloadPerTester() {
            const totalTests = this.testInstances.filter(test => test).length;
            const totalTesters = this.availableTesters.filter(tester => tester).length;
            return totalTesters > 0 ? Math.ceil(totalTests / totalTesters) : 0;
        },

        getUnassignedTests() {
            return this.testInstances.filter(test => test && !test.assigned_tester).slice(0, 10); // Limit for display
        },

        getAssignedTests(testerId) {
            return this.testInstances.filter(test => test && test.assigned_tester === testerId).slice(0, 10); // Limit for display
        },

        getUnassignedTestCount() {
            return this.testInstances.filter(test => test && !test.assigned_tester).length;
        },

        getAssignedTestCount() {
            return this.testInstances.filter(test => test && test.assigned_tester).length;
        },

        // Enhanced Selection Functions
        toggleAllTestSelection(checked) {
            if (checked) {
                this.selectedTestInstances = [...this.paginatedTestInstances.filter(t => t && t.id).map(t => t.id)];
            } else {
                this.selectedTestInstances = [];
            }
        },

        toggleTestSelection(testId, checked) {
            if (checked) {
                if (!this.selectedTestInstances.includes(testId)) {
                    this.selectedTestInstances.push(testId);
                }
            } else {
                const index = this.selectedTestInstances.indexOf(testId);
                if (index > -1) {
                    this.selectedTestInstances.splice(index, 1);
                }
            }
        },

        clearTestSelection() {
            this.selectedTestInstances = [];
            this.bulkAssignmentTester = '';
        },

        // Enhanced Sorting Functions
        sortTestInstances(field) {
            if (this.testGridSort.field === field) {
                this.testGridSort.direction = this.testGridSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.testGridSort.field = field;
                this.testGridSort.direction = 'asc';
            }
            
            this.applyTestFilters();
        },

        // Enhanced Pagination Functions
        updateTestGridPagination() {
            const totalItems = this.filteredTestInstances.length;
            this.testGridPagination.totalPages = Math.ceil(totalItems / this.testGridPagination.pageSize);
            
            // Ensure current page is valid
            if (this.testGridPagination.page > this.testGridPagination.totalPages) {
                this.testGridPagination.page = Math.max(1, this.testGridPagination.totalPages);
            }
            
            // Calculate paginated results
            const startIndex = (this.testGridPagination.page - 1) * this.testGridPagination.pageSize;
            const endIndex = startIndex + this.testGridPagination.pageSize;
            this.paginatedTestInstances = this.filteredTestInstances.slice(startIndex, endIndex);
        },

        changeTestGridPage(page) {
            if (page >= 1 && page <= this.testGridPagination.totalPages) {
                this.testGridPagination.page = page;
                this.updateTestGridPagination();
            }
        },

        // Quick Assignment Function
        async quickAssignTest(test) {
            if (this.availableTesters.length === 0) {
                this.showNotification('No available testers found', 'warning');
                return;
            }
            
            // Simple assignment to next available tester with lowest workload
            const testerWorkloads = this.availableTesters
                .filter(tester => tester && tester.id) // Filter out null testers
                .map(tester => ({
                    tester,
                    workload: this.getTesterWorkload(tester.id)
                }));
            
            if (testerWorkloads.length === 0) {
                this.showNotification('No valid testers available', 'warning');
                return;
            }
            
            testerWorkloads.sort((a, b) => a.workload - b.workload);
            const selectedTester = testerWorkloads[0].tester;
            
            try {
                const response = await this.apiCall(
                    `/test-instances/${test.id}/assign`,
                    'PUT',
                    { assigned_tester: selectedTester.id }
                );

                if (response.success) {
                    test.assigned_tester = selectedTester.id;
                    test.assigned_tester_name = selectedTester.full_name || selectedTester.username;
                    this.applyTestFilters();
                    this.showNotification(`Test assigned to ${test.assigned_tester_name}`, 'success');
                } else {
                    this.showNotification(response.error || 'Failed to assign test', 'error');
                }
            } catch (error) {
                console.error('Error in quick assignment:', error);
                this.showNotification('Failed to assign test', 'error');
            }
        },

        // Enhanced Badge Functions
        getConformanceLevelBadgeClass(level) {
            const levelMap = {
                'A': 'bg-green-100 text-green-800',
                'AA': 'bg-blue-100 text-blue-800', 
                'AAA': 'bg-purple-100 text-purple-800'
            };
            return levelMap[level?.toUpperCase()] || 'bg-gray-100 text-gray-800';
        },

        getTestStatusBadgeClass(status) {
            const statusMap = {
                'pending': 'bg-gray-100 text-gray-800',
                'in_progress': 'bg-yellow-100 text-yellow-800',
                'passed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'not_applicable': 'bg-blue-100 text-blue-800',
                'untestable': 'bg-orange-100 text-orange-800',
                'needs_review': 'bg-purple-100 text-purple-800'
            };
            return statusMap[status] || 'bg-gray-100 text-gray-800';
        },

        // Enhanced Apply Filters Function (Override existing)
        applyTestFilters() {
            let filtered = [...this.testInstances].filter(test => test); // Filter out null/undefined tests first

            // Apply status filter
            if (this.testFilters.status) {
                filtered = filtered.filter(test => test && test.status === this.testFilters.status);
            }

            // Apply requirement type filter
            if (this.testFilters.requirementType) {
                filtered = filtered.filter(test => test && test.test_method === this.testFilters.requirementType);
            }

            // Apply conformance level filter
            if (this.testFilters.conformanceLevel) {
                filtered = filtered.filter(test => test && test.requirement_level === this.testFilters.conformanceLevel);
            }

            // Apply assigned tester filter
            if (this.testFilters.assignedTester) {
                if (this.testFilters.assignedTester === 'unassigned') {
                    filtered = filtered.filter(test => test && !test.assigned_tester);
                } else {
                    filtered = filtered.filter(test => test && test.assigned_tester === this.testFilters.assignedTester);
                }
            }

            // Apply search filter
            if (this.testFilters.search) {
                const searchTerm = this.testFilters.search.toLowerCase();
                filtered = filtered.filter(test => test &&
                    ((test.requirement_id && test.requirement_id.toLowerCase().includes(searchTerm)) ||
                    (test.criterion_number && test.criterion_number.toLowerCase().includes(searchTerm)) ||
                    (test.requirement_title && test.requirement_title.toLowerCase().includes(searchTerm)) ||
                    (test.requirement_description && test.requirement_description.toLowerCase().includes(searchTerm)) ||
                    (test.testing_instructions && test.testing_instructions.toLowerCase().includes(searchTerm)))
                );
            }

            // Apply sorting
            if (this.testGridSort.field) {
                filtered.sort((a, b) => {
                    // Add null checks for sorting
                    if (!a || !b) return 0;
                    
                    let aVal = a[this.testGridSort.field] || '';
                    let bVal = b[this.testGridSort.field] || '';
                    
                    // Handle special cases
                    if (this.testGridSort.field === 'updated_at') {
                        aVal = new Date(aVal);
                        bVal = new Date(bVal);
                    } else if (typeof aVal === 'string') {
                        aVal = aVal.toLowerCase();
                        bVal = bVal.toLowerCase();
                    }
                    
                    if (aVal < bVal) return this.testGridSort.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return this.testGridSort.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            this.filteredTestInstances = filtered;
            this.updateTestGridPagination();
        },

        // Helper function to extract domain from URL
        extractDomainFromUrl(url) {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname;
            } catch (error) {
                console.error('Error extracting domain from URL:', error);
                return url; // fallback to original URL
            }
        },

        // New method to create additional auth configs for the same domain
        addAuthConfig() {
            if (!this.selectedProject) {
                this.showNotification('Please select a project first', 'error');
                return;
            }
            
            this.showSetupAuth = true;
            this.startAuthSetup('basic'); // Default to basic auth
        },

        // New method to set an auth config as default
        async setAsDefault(config) {
            try {
                const updateData = {
                    ...config,
                    is_default: true
                };
                
                const response = await this.apiCall(`/auth/configs/${config.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });

                if (response.success) {
                    // Update local state
                    this.projectAuthConfigs.forEach(c => {
                        c.is_default = c.id === config.id;
                    });
                    
                    this.showNotification(`${config.auth_role} authentication set as default`, 'success');
                } else {
                    throw new Error(response.message || 'Failed to set as default');
                }
            } catch (error) {
                console.error('Failed to set auth config as default:', error);
                this.showNotification(`Failed to set as default: ${error.message}`, 'error');
            }
        },

        // New method to delete an auth config
        async deleteAuthConfig(config) {
            if (!confirm(`Are you sure you want to delete the "${config.auth_role}" authentication configuration?`)) {
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
                    
                    this.showNotification(`${config.auth_role} authentication configuration deleted`, 'success');
                } else {
                    throw new Error(response.message || 'Failed to delete configuration');
                }
            } catch (error) {
                console.error('Failed to delete auth config:', error);
                this.showNotification(`Failed to delete configuration: ${error.message}`, 'error');
            }
        },

        // Helper method to get auth role display name
        getAuthRoleDisplayName(role) {
            const roleNames = {
                'default': 'Default User',
                'admin': 'Administrator',
                'user': 'Regular User',
                'guest': 'Guest User',
                'editor': 'Editor',
                'viewer': 'Viewer',
                'moderator': 'Moderator'
            };
            return roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1);
        },

        // Helper method to get auth config badge color
        getAuthConfigBadgeColor(config) {
            if (config.is_default) return 'bg-green-100 text-green-800';
            if (config.auth_role === 'admin') return 'bg-red-100 text-red-800';
            if (config.auth_role === 'user') return 'bg-blue-100 text-blue-800';
            if (config.auth_role === 'guest') return 'bg-gray-100 text-gray-800';
            return 'bg-purple-100 text-purple-800';
        },

        // Review Workflow Functions
        async submitTestForReview(testInstanceId, reviewerId = null, reviewNotes = '', priority = 'normal') {
            try {
                const reviewData = {
                    reviewer_id: reviewerId,
                    review_notes: reviewNotes,
                    priority: priority
                };

                const response = await this.apiCall(
                    `/test-instances/${testInstanceId}/review`,
                    'POST',
                    reviewData
                );

                if (response.success) {
                    // Update local test instance
                    const testIndex = this.testInstances.findIndex(t => t && t.id === testInstanceId);
                    if (testIndex !== -1) {
                        this.testInstances[testIndex] = {
                            ...this.testInstances[testIndex],
                            ...response.data
                        };
                    }

                    this.applyTestFilters();
                    this.showNotification('Test submitted for review successfully', 'success');
                    return response.data;
                } else {
                    this.showNotification('Failed to submit test for review: ' + response.error, 'error');
                    return null;
                }

            } catch (error) {
                console.error('❌ Error submitting test for review:', error);
                this.showNotification('Failed to submit test for review: ' + error.message, 'error');
                return null;
            }
        },

        async approveTestReview(testInstanceId, approvedStatus, reviewComments = '', confidenceAdjustment = null, recommendations = '') {
            try {
                const approvalData = {
                    approved_status: approvedStatus,
                    review_comments: reviewComments,
                    confidence_adjustment: confidenceAdjustment,
                    recommendations: recommendations
                };

                const response = await this.apiCall(
                    `/test-instances/${testInstanceId}/review/approve`,
                    'POST',
                    approvalData
                );

                if (response.success) {
                    // Update local test instance
                    const testIndex = this.testInstances.findIndex(t => t && t.id === testInstanceId);
                    if (testIndex !== -1) {
                        this.testInstances[testIndex] = {
                            ...this.testInstances[testIndex],
                            ...response.data
                        };
                    }

                    this.applyTestFilters();
                    this.showNotification(`Test approved as ${approvedStatus}`, 'success');
                    return response.data;
                } else {
                    this.showNotification('Failed to approve test: ' + response.error, 'error');
                    return null;
                }

            } catch (error) {
                console.error('❌ Error approving test review:', error);
                this.showNotification('Failed to approve test: ' + error.message, 'error');
                return null;
            }
        },

        async rejectTestReview(testInstanceId, rejectionReason, requiredChanges = '', returnToStatus = 'in_progress', priority = 'normal') {
            try {
                const rejectionData = {
                    rejection_reason: rejectionReason,
                    required_changes: requiredChanges,
                    return_to_status: returnToStatus,
                    priority: priority
                };

                const response = await this.apiCall(
                    `/test-instances/${testInstanceId}/review/reject`,
                    'POST',
                    rejectionData
                );

                if (response.success) {
                    // Update local test instance
                    const testIndex = this.testInstances.findIndex(t => t && t.id === testInstanceId);
                    if (testIndex !== -1) {
                        this.testInstances[testIndex] = {
                            ...this.testInstances[testIndex],
                            ...response.data
                        };
                    }

                    this.applyTestFilters();
                    this.showNotification('Test review rejected and returned for changes', 'success');
                    return response.data;
                } else {
                    this.showNotification('Failed to reject test: ' + response.error, 'error');
                    return null;
                }

            } catch (error) {
                console.error('❌ Error rejecting test review:', error);
                this.showNotification('Failed to reject test: ' + error.message, 'error');
                return null;
            }
        },

        async loadPendingReviews(sessionId = null, projectId = null) {
            try {
                let endpoint = '/test-instances/reviews/pending';
                const params = new URLSearchParams();

                if (sessionId) params.append('session_id', sessionId);
                if (projectId) params.append('project_id', projectId);
                
                if (params.toString()) {
                    endpoint += '?' + params.toString();
                }

                const response = await this.apiCall(endpoint);

                if (response.success) {
                    this.pendingReviews = response.data || [];
                    this.reviewSummary = response.summary || {};
                    return response.data;
                } else {
                    console.error('Failed to load pending reviews:', response.error);
                    this.pendingReviews = [];
                    return [];
                }

            } catch (error) {
                console.error('❌ Error loading pending reviews:', error);
                this.pendingReviews = [];
                return [];
            }
        },

        // Bulk Operations
        async bulkUpdateTestStatus(testInstanceIds, status, confidenceLevel = null, notes = '', force = false) {
            try {
                const bulkData = {
                    test_instance_ids: testInstanceIds,
                    status: status,
                    confidence_level: confidenceLevel,
                    notes: notes,
                    force: force
                };

                const response = await this.apiCall(
                    '/test-instances/bulk/status',
                    'POST',
                    bulkData
                );

                if (response.success) {
                    // Update local test instances
                    response.results.forEach(result => {
                        if (result.success) {
                            const testIndex = this.testInstances.findIndex(t => t && t.id === result.testId);
                            if (testIndex !== -1) {
                                this.testInstances[testIndex] = {
                                    ...this.testInstances[testIndex],
                                    ...result.data
                                };
                            }
                        }
                    });

                    this.applyTestFilters();
                    this.clearTestSelection();

                    const successCount = response.summary.successful;
                    const totalCount = response.summary.total;
                    
                    if (response.errors.length > 0) {
                        this.showNotification(
                            `Bulk update completed: ${successCount}/${totalCount} successful. ${response.errors.length} errors.`,
                            'warning'
                        );
                    } else {
                        this.showNotification(`Successfully updated ${successCount} test(s) to ${status}`, 'success');
                    }

                    return response;
                } else {
                    this.showNotification('Bulk status update failed: ' + response.error, 'error');
                    return null;
                }

            } catch (error) {
                console.error('❌ Error in bulk status update:', error);
                this.showNotification('Bulk status update failed: ' + error.message, 'error');
                return null;
            }
        },

        async bulkAssignTests(testInstanceIds, assignedTester, notes = '') {
            try {
                const bulkData = {
                    test_instance_ids: testInstanceIds,
                    assigned_tester: assignedTester,
                    notes: notes
                };

                const response = await this.apiCall(
                    '/test-instances/bulk/assign',
                    'POST',
                    bulkData
                );

                if (response.success) {
                    // Update local test instances
                    response.results.forEach(result => {
                        if (result.success) {
                            const testIndex = this.testInstances.findIndex(t => t && t.id === result.testId);
                            if (testIndex !== -1) {
                                this.testInstances[testIndex] = {
                                    ...this.testInstances[testIndex],
                                    ...result.data
                                };
                            }
                        }
                    });

                    this.applyTestFilters();
                    this.clearTestSelection();

                    const successCount = response.summary.successful;
                    const totalCount = response.summary.total;
                    const testerName = response.summary.assignedTo;

                    if (response.errors.length > 0) {
                        this.showNotification(
                            `Bulk assignment completed: ${successCount}/${totalCount} successful. ${response.errors.length} errors.`,
                            'warning'
                        );
                    } else {
                        this.showNotification(`Successfully assigned ${successCount} test(s) to ${testerName}`, 'success');
                    }

                    return response;
                } else {
                    this.showNotification('Bulk assignment failed: ' + response.error, 'error');
                    return null;
                }

            } catch (error) {
                console.error('❌ Error in bulk assignment:', error);
                this.showNotification('Bulk assignment failed: ' + error.message, 'error');
                return null;
            }
        },

        async bulkAddNotes(testInstanceIds, notes, append = true) {
            try {
                const bulkData = {
                    test_instance_ids: testInstanceIds,
                    notes: notes,
                    append: append
                };

                const response = await this.apiCall(
                    '/test-instances/bulk/notes',
                    'POST',
                    bulkData
                );

                if (response.success) {
                    // Update local test instances
                    response.results.forEach(result => {
                        if (result.success) {
                            const testIndex = this.testInstances.findIndex(t => t && t.id === result.testId);
                            if (testIndex !== -1) {
                                this.testInstances[testIndex] = {
                                    ...this.testInstances[testIndex],
                                    ...result.data
                                };
                            }
                        }
                    });

                    this.applyTestFilters();
                    this.clearTestSelection();

                    const successCount = response.summary.successful;
                    const totalCount = response.summary.total;

                    if (response.errors.length > 0) {
                        this.showNotification(
                            `Bulk notes update completed: ${successCount}/${totalCount} successful. ${response.errors.length} errors.`,
                            'warning'
                        );
                    } else {
                        this.showNotification(`Successfully updated notes for ${successCount} test(s)`, 'success');
                    }

                    return response;
                } else {
                    this.showNotification('Bulk notes update failed: ' + response.error, 'error');
                    return null;
                }

            } catch (error) {
                console.error('❌ Error in bulk notes update:', error);
                this.showNotification('Bulk notes update failed: ' + error.message, 'error');
                return null;
            }
        },

        // =============================================================================
        // AUDIT TIMELINE VISUALIZATION
        // =============================================================================

        // Audit Timeline State
        auditTimeline: {
            sessionId: null,
            sessionName: '',
            timeline: [],
            statistics: null,
            filters: {
                start_date: '',
                end_date: '',
                user_id: '',
                action_type: '',
                test_instance_id: ''
            },
            pagination: {
                limit: 50,
                offset: 0,
                has_more: false
            },
            loading: false,
            error: null,
            selectedTimelineItem: null,
            expandedItems: new Set(),
            groupBy: 'day', // 'hour', 'day', 'week'
            viewMode: 'timeline' // 'timeline', 'table', 'chart'
        },

        /**
         * Open audit timeline for a session
         */
        async openAuditTimeline(session) {
            this.auditTimeline.sessionId = session.id;
            this.auditTimeline.sessionName = session.name;
            this.auditTimeline.loading = true;
            this.auditTimeline.error = null;
            
            // Reset filters and pagination
            this.resetAuditTimelineFilters();
            
            // Load initial timeline data
            await this.loadAuditTimeline();
            
            // Show modal
            const modal = document.getElementById('auditTimelineModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        },

        /**
         * Load audit timeline data
         */
        async loadAuditTimeline() {
            if (!this.auditTimeline.sessionId) return;

            this.auditTimeline.loading = true;
            this.auditTimeline.error = null;

            try {
                // Build query parameters
                const params = new URLSearchParams({
                    limit: this.auditTimeline.pagination.limit,
                    offset: this.auditTimeline.pagination.offset
                });

                // Add filters if set
                Object.entries(this.auditTimeline.filters).forEach(([key, value]) => {
                    if (value && value.trim()) {
                        params.append(key, value.trim());
                    }
                });

                const response = await this.apiCall(
                    `/sessions/${this.auditTimeline.sessionId}/audit-timeline?${params}`,
                    { method: 'GET' }
                );

                if (response.success) {
                    this.auditTimeline.timeline = response.data.timeline;
                    this.auditTimeline.statistics = response.data.statistics;
                    this.auditTimeline.pagination = response.data.pagination;
                    this.auditTimeline.sessionName = response.session_name;
                } else {
                    throw new Error(response.message || 'Failed to load audit timeline');
                }

            } catch (error) {
                console.error('Error loading audit timeline:', error);
                this.auditTimeline.error = error.message;
                this.showNotification('Failed to load audit timeline: ' + error.message, 'error');
            } finally {
                this.auditTimeline.loading = false;
            }
        },

        /**
         * Apply audit timeline filters
         */
        async applyAuditTimelineFilters() {
            this.auditTimeline.pagination.offset = 0; // Reset to first page
            await this.loadAuditTimeline();
        },

        /**
         * Reset audit timeline filters
         */
        resetAuditTimelineFilters() {
            this.auditTimeline.filters = {
                start_date: '',
                end_date: '',
                user_id: '',
                action_type: '',
                test_instance_id: ''
            };
            this.auditTimeline.pagination = {
                limit: 50,
                offset: 0,
                has_more: false
            };
        },

        /**
         * Load more timeline items (pagination)
         */
        async loadMoreTimelineItems() {
            if (!this.auditTimeline.pagination.has_more || this.auditTimeline.loading) return;

            this.auditTimeline.pagination.offset += this.auditTimeline.pagination.limit;
            
            const currentTimeline = [...this.auditTimeline.timeline];
            await this.loadAuditTimeline();
            
            // Append new items to existing timeline
            this.auditTimeline.timeline = [...currentTimeline, ...this.auditTimeline.timeline];
        },

        /**
         * Toggle timeline item expansion
         */
        toggleTimelineItem(auditId) {
            if (this.auditTimeline.expandedItems.has(auditId)) {
                this.auditTimeline.expandedItems.delete(auditId);
            } else {
                this.auditTimeline.expandedItems.add(auditId);
            }
        },

        /**
         * Check if timeline item is expanded
         */
        isTimelineItemExpanded(auditId) {
            return this.auditTimeline.expandedItems.has(auditId);
        },

        /**
         * View timeline item details
         */
        viewTimelineItemDetails(timelineItem) {
            this.auditTimeline.selectedTimelineItem = timelineItem;
            
            // Show details modal
            const modal = document.getElementById('timelineItemDetailsModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        },

        /**
         * Close timeline item details
         */
        closeTimelineItemDetails() {
            this.auditTimeline.selectedTimelineItem = null;
            
            const modal = document.getElementById('timelineItemDetailsModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        },

        /**
         * Close audit timeline modal
         */
        closeAuditTimeline() {
            this.auditTimeline.sessionId = null;
            this.auditTimeline.sessionName = '';
            this.auditTimeline.timeline = [];
            this.auditTimeline.statistics = null;
            this.auditTimeline.expandedItems.clear();
            this.auditTimeline.selectedTimelineItem = null;
            
            const modal = document.getElementById('auditTimelineModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        },

        /**
         * Get action type display text
         */
        getActionTypeDisplayText(actionType) {
            const actionTypes = {
                'created': 'Test Created',
                'assignment': 'Assigned',
                'status_change': 'Status Changed',
                'note_updated': 'Notes Updated',
                'note_added': 'Notes Added',
                'evidence_uploaded': 'Evidence Added',
                'evidence_removed': 'Evidence Removed',
                'review_requested': 'Review Requested',
                'reviewed': 'Reviewed',
                'approved': 'Approved',
                'rejected': 'Rejected',
                'remediation_added': 'Remediation Added',
                'automated_update': 'Automated Update'
            };
            return actionTypes[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        },

        /**
         * Get action type icon
         */
        getActionTypeIcon(actionType) {
            const icons = {
                'created': '🆕',
                'assignment': '👤',
                'status_change': '🔄',
                'note_updated': '📝',
                'note_added': '📝',
                'evidence_uploaded': '📎',
                'evidence_removed': '🗑️',
                'review_requested': '👀',
                'reviewed': '✅',
                'approved': '✅',
                'rejected': '❌',
                'remediation_added': '🔧',
                'automated_update': '🤖'
            };
            return icons[actionType] || '📋';
        },

        /**
         * Get action type color class
         */
        getActionTypeColorClass(actionType) {
            const colors = {
                'created': 'text-blue-600 bg-blue-50',
                'assignment': 'text-purple-600 bg-purple-50',
                'status_change': 'text-orange-600 bg-orange-50',
                'note_updated': 'text-gray-600 bg-gray-50',
                'note_added': 'text-gray-600 bg-gray-50',
                'evidence_uploaded': 'text-green-600 bg-green-50',
                'evidence_removed': 'text-red-600 bg-red-50',
                'review_requested': 'text-yellow-600 bg-yellow-50',
                'reviewed': 'text-green-600 bg-green-50',
                'approved': 'text-green-600 bg-green-50',
                'rejected': 'text-red-600 bg-red-50',
                'remediation_added': 'text-indigo-600 bg-indigo-50',
                'automated_update': 'text-cyan-600 bg-cyan-50'
            };
            return colors[actionType] || 'text-gray-600 bg-gray-50';
        },

        /**
         * Format relative time
         */
        formatRelativeTime(timestamp) {
            const now = new Date();
            const time = new Date(timestamp);
            const diffMs = now - time;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffSecs < 60) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
            
            return this.formatDate(timestamp);
        },

        /**
         * Format timeline duration
         */
        formatTimelineDuration(seconds) {
            if (!seconds) return '';
            
            const mins = Math.floor(seconds / 60);
            const hours = Math.floor(mins / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) return `${days}d ${hours % 24}h`;
            if (hours > 0) return `${hours}h ${mins % 60}m`;
            if (mins > 0) return `${mins}m ${seconds % 60}s`;
            return `${seconds}s`;
        },

        /**
         * Group timeline items by date
         */
        getGroupedTimeline() {
            if (!this.auditTimeline.timeline.length) return {};

            const grouped = {};
            
            this.auditTimeline.timeline.forEach(item => {
                const date = new Date(item.timestamp);
                let groupKey;

                switch (this.auditTimeline.groupBy) {
                    case 'hour':
                        groupKey = date.toISOString().substring(0, 13) + ':00:00';
                        break;
                    case 'week':
                        const startOfWeek = new Date(date);
                        startOfWeek.setDate(date.getDate() - date.getDay());
                        groupKey = startOfWeek.toISOString().substring(0, 10);
                        break;
                    case 'day':
                    default:
                        groupKey = date.toISOString().substring(0, 10);
                        break;
                }

                if (!grouped[groupKey]) {
                    grouped[groupKey] = [];
                }
                grouped[groupKey].push(item);
            });

            return grouped;
        },

        /**
         * Format group header
         */
        formatGroupHeader(groupKey) {
            const date = new Date(groupKey);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            const dateStr = date.toISOString().substring(0, 10);
            const todayStr = today.toISOString().substring(0, 10);
            const yesterdayStr = yesterday.toISOString().substring(0, 10);

            if (dateStr === todayStr) return 'Today';
            if (dateStr === yesterdayStr) return 'Yesterday';

            switch (this.auditTimeline.groupBy) {
                case 'hour':
                    return date.toLocaleString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric', 
                        hour: 'numeric',
                        hour12: true
                    });
                case 'week':
                    const endOfWeek = new Date(date);
                    endOfWeek.setDate(date.getDate() + 6);
                    return `Week of ${date.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
                case 'day':
                default:
                    return date.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
            }
        },

        /**
         * Export audit timeline
         */
        async exportAuditTimeline(format = 'csv') {
            if (!this.auditTimeline.timeline.length) {
                this.showNotification('No timeline data to export', 'warning');
                return;
            }

            try {
                let content, filename, mimeType;

                if (format === 'csv') {
                    const headers = [
                        'Timestamp', 'Action Type', 'User', 'Test Criterion', 
                        'Page URL', 'Description', 'Old Value', 'New Value'
                    ];
                    
                    const rows = this.auditTimeline.timeline.map(item => [
                        item.formatted_timestamp,
                        this.getActionTypeDisplayText(item.action_type),
                        item.username || 'System',
                        item.criterion_number || '',
                        item.page_url || '',
                        item.change_description || '',
                        JSON.stringify(item.old_value || ''),
                        JSON.stringify(item.new_value || '')
                    ]);

                    content = [headers, ...rows]
                        .map(row => row.map(cell => `"${cell}"`).join(','))
                        .join('\n');
                    
                    filename = `audit-timeline-${this.auditTimeline.sessionId}-${new Date().toISOString().split('T')[0]}.csv`;
                    mimeType = 'text/csv';

                } else if (format === 'json') {
                    content = JSON.stringify({
                        session_id: this.auditTimeline.sessionId,
                        session_name: this.auditTimeline.sessionName,
                        exported_at: new Date().toISOString(),
                        statistics: this.auditTimeline.statistics,
                        timeline: this.auditTimeline.timeline
                    }, null, 2);
                    
                    filename = `audit-timeline-${this.auditTimeline.sessionId}-${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = 'application/json';
                }

                this.downloadFile(content, filename, mimeType);
                this.showNotification(`Timeline exported as ${format.toUpperCase()}`, 'success');

            } catch (error) {
                console.error('Error exporting timeline:', error);
                this.showNotification('Failed to export timeline', 'error');
            }
        },

        // =============================================================================
        // ACTIVITY FEED INTERFACE
        // =============================================================================

        // Activity Feed State
        activityFeed: {
            sessionId: null,
            sessionName: '',
            activities: [],
            summary: null,
            isOpen: false,
            loading: false,
            error: null,
            autoRefresh: true,
            refreshInterval: 30000, // 30 seconds
            lastUpdate: null,
            unreadCount: 0,
            filters: {
                include_system: true,
                action_types: [],
                users: []
            },
            pagination: {
                limit: 20,
                offset: 0,
                has_more: false
            }
        },

        /**
         * Initialize activity feed for a session
         */
        async initActivityFeed(sessionId, sessionName) {
            this.activityFeed.sessionId = sessionId;
            this.activityFeed.sessionName = sessionName;
            this.activityFeed.activities = [];
            this.activityFeed.unreadCount = 0;
            this.activityFeed.lastUpdate = new Date().toISOString();
            
            // Load initial activities
            await this.loadActivityFeed();
            
            // Start auto-refresh if enabled
            if (this.activityFeed.autoRefresh) {
                this.startActivityFeedAutoRefresh();
            }
        },

        /**
         * Load activity feed data
         */
        async loadActivityFeed(append = false) {
            if (!this.activityFeed.sessionId) return;

            this.activityFeed.loading = true;
            this.activityFeed.error = null;

            try {
                // Build query parameters
                const params = new URLSearchParams({
                    limit: this.activityFeed.pagination.limit,
                    offset: append ? this.activityFeed.pagination.offset : 0,
                    include_system: this.activityFeed.filters.include_system
                });

                // Add since parameter for real-time updates
                if (append && this.activityFeed.lastUpdate) {
                    params.append('since', this.activityFeed.lastUpdate);
                }

                const response = await this.apiCall(
                    `/sessions/${this.activityFeed.sessionId}/activity-feed?${params}`,
                    { method: 'GET' }
                );

                if (response.success) {
                    if (append) {
                        // Add new activities to the beginning
                        const newActivities = response.data.activities.filter(
                            newActivity => !this.activityFeed.activities.some(
                                existing => existing.activity_id === newActivity.activity_id
                            )
                        );
                        this.activityFeed.activities = [...newActivities, ...this.activityFeed.activities];
                        this.activityFeed.unreadCount += newActivities.length;
                    } else {
                        this.activityFeed.activities = response.data.activities;
                        this.activityFeed.unreadCount = 0;
                    }
                    
                    this.activityFeed.summary = response.data.summary;
                    this.activityFeed.pagination = response.data.pagination;
                    this.activityFeed.lastUpdate = response.data.real_time.server_timestamp;
                } else {
                    throw new Error(response.message || 'Failed to load activity feed');
                }

            } catch (error) {
                console.error('Error loading activity feed:', error);
                this.activityFeed.error = error.message;
                this.showNotification('Failed to load activity feed: ' + error.message, 'error');
            } finally {
                this.activityFeed.loading = false;
            }
        },

        /**
         * Start auto-refresh for activity feed
         */
        startActivityFeedAutoRefresh() {
            // Clear existing interval
            if (this.activityFeedInterval) {
                clearInterval(this.activityFeedInterval);
            }

            this.activityFeedInterval = setInterval(async () => {
                if (this.activityFeed.sessionId && this.activityFeed.autoRefresh) {
                    await this.loadActivityFeed(true); // Append new activities
                }
            }, this.activityFeed.refreshInterval);
        },

        /**
         * Stop auto-refresh for activity feed
         */
        stopActivityFeedAutoRefresh() {
            if (this.activityFeedInterval) {
                clearInterval(this.activityFeedInterval);
                this.activityFeedInterval = null;
            }
        },

        /**
         * Toggle activity feed panel
         */
        toggleActivityFeed() {
            this.activityFeed.isOpen = !this.activityFeed.isOpen;
            
            if (this.activityFeed.isOpen) {
                // Mark activities as read when opened
                this.activityFeed.unreadCount = 0;
            }
        },

        /**
         * Close activity feed
         */
        closeActivityFeed() {
            this.activityFeed.isOpen = false;
            this.activityFeed.sessionId = null;
            this.activityFeed.sessionName = '';
            this.activityFeed.activities = [];
            this.activityFeed.summary = null;
            this.activityFeed.unreadCount = 0;
            this.stopActivityFeedAutoRefresh();
        },

        /**
         * Load more activities (pagination)
         */
        async loadMoreActivities() {
            if (!this.activityFeed.pagination.has_more || this.activityFeed.loading) return;

            const currentActivities = [...this.activityFeed.activities];
            this.activityFeed.pagination.offset += this.activityFeed.pagination.limit;
            
            await this.loadActivityFeed();
            
            // Append to existing activities
            this.activityFeed.activities = [...currentActivities, ...this.activityFeed.activities];
        },

        /**
         * Apply activity feed filters
         */
        async applyActivityFeedFilters() {
            this.activityFeed.pagination.offset = 0;
            await this.loadActivityFeed();
        },

        /**
         * Reset activity feed filters
         */
        resetActivityFeedFilters() {
            this.activityFeed.filters = {
                include_system: true,
                action_types: [],
                users: []
            };
            this.applyActivityFeedFilters();
        },

        /**
         * Toggle auto-refresh
         */
        toggleActivityFeedAutoRefresh() {
            this.activityFeed.autoRefresh = !this.activityFeed.autoRefresh;
            
            if (this.activityFeed.autoRefresh) {
                this.startActivityFeedAutoRefresh();
            } else {
                this.stopActivityFeedAutoRefresh();
            }
        },

        /**
         * Get activity feed badge count
         */
        getActivityFeedBadgeCount() {
            return this.activityFeed.unreadCount > 99 ? '99+' : this.activityFeed.unreadCount.toString();
        },

        /**
         * Format activity timestamp
         */
        formatActivityTime(timestamp) {
            const now = new Date();
            const time = new Date(timestamp);
            const diffMs = now - time;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffSecs < 60) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            
            return time.toLocaleDateString();
        },

        /**
         * Get activity icon class
         */
        getActivityIconClass(actionType) {
            const icons = {
                'created': 'fas fa-plus-circle text-blue-600',
                'assignment': 'fas fa-user-tag text-purple-600',
                'status_change': 'fas fa-exchange-alt text-orange-600',
                'note_updated': 'fas fa-sticky-note text-gray-600',
                'evidence_uploaded': 'fas fa-paperclip text-green-600',
                'review_requested': 'fas fa-eye text-yellow-600',
                'reviewed': 'fas fa-check-circle text-green-600',
                'approved': 'fas fa-thumbs-up text-green-600',
                'rejected': 'fas fa-thumbs-down text-red-600'
            };
            return icons[actionType] || 'fas fa-circle text-gray-600';
        },

        /**
         * Get activity description
         */
        getActivityDescription(activity) {
            const user = activity.username || 'System';
            const criterion = activity.criterion_number || 'Unknown';
            
            switch (activity.action_type) {
                case 'created':
                    return `${user} created test for ${criterion}`;
                case 'assignment':
                    return `${user} was assigned to test ${criterion}`;
                case 'status_change':
                    return `${user} changed status of ${criterion}`;
                case 'note_updated':
                    return `${user} updated notes for ${criterion}`;
                case 'evidence_uploaded':
                    return `${user} uploaded evidence for ${criterion}`;
                case 'review_requested':
                    return `${user} requested review for ${criterion}`;
                case 'reviewed':
                    return `${user} reviewed test ${criterion}`;
                default:
                    return activity.change_description || `${user} performed action on ${criterion}`;
            }
        },

        /**
         * Navigate to test from activity
         */
        async navigateToTestFromActivity(activity) {
            if (activity.test_instance_id) {
                // Open the test instance modal
                await this.openTestInstanceModal({ id: activity.test_instance_id });
                this.closeActivityFeed();
            }
        },

        /**
         * Handle WebSocket activity update
         */
        handleActivityFeedUpdate(data) {
            // Handle real-time activity feed updates
            if (data.activity_type === 'test_status_changed' || 
                data.activity_type === 'evidence_uploaded' ||
                data.activity_type === 'test_assigned' ||
                data.activity_type === 'review_requested') {
                
                // Add new activity to the feed
                this.activityFeed.activities.unshift({
                    id: `ws_${Date.now()}`,
                    action_type: data.activity_type,
                    change_description: data.description || 'Real-time update',
                    timestamp: new Date().toISOString(),
                    username: data.username || 'System',
                    full_name: data.full_name || 'System',
                    criterion_number: data.criterion_number,
                    page_url: data.page_url,
                    test_instance_id: data.test_instance_id
                });
                
                // Increment unread count if feed is closed
                if (!this.activityFeed.isOpen) {
                    this.activityFeed.unreadCount++;
                }
                
                // Limit activities to prevent memory issues
                if (this.activityFeed.activities.length > 100) {
                    this.activityFeed.activities = this.activityFeed.activities.slice(0, 100);
                }
            }
        },

        // ===========================
        // CHANGE APPROVAL WORKFLOW
        // ===========================

        changeApproval: {
            isModalOpen: false,
            isLoading: false,
            currentSessionId: null,
            currentSessionName: '',
            
            // Approval requests data
            requests: [],
            pendingCount: 0,
            totalCount: 0,
            pagination: {
                limit: 20,
                offset: 0,
                hasMore: false
            },
            
            // Filters
            filters: {
                status: 'pending',
                urgency: '',
                requester: '',
                change_type: ''
            },
            
            // Current request being viewed/processed
            currentRequest: null,
            approvalDecision: {
                decision: '',
                reason: '',
                conditions: '',
                review_notes: ''
            },
            
            // Statistics
            statistics: {
                overall: {},
                daily_breakdown: []
            }
        },

        async openChangeApprovalWorkflow(sessionId, sessionName) {
            try {
                this.changeApproval.currentSessionId = sessionId;
                this.changeApproval.currentSessionName = sessionName;
                this.changeApproval.isModalOpen = true;
                
                // Load initial data
                await this.loadApprovalRequests();
                await this.loadApprovalStatistics();
                
            } catch (error) {
                console.error('Error opening change approval workflow:', error);
                this.showNotification('Failed to load approval workflow', 'error');
            }
        },

        async loadApprovalRequests(append = false) {
            try {
                this.changeApproval.isLoading = true;
                
                const params = new URLSearchParams({
                    limit: this.changeApproval.pagination.limit,
                    offset: append ? this.changeApproval.pagination.offset : 0,
                    ...this.changeApproval.filters
                });
                
                const response = await this.apiCall(`/sessions/${this.changeApproval.currentSessionId}/approval-requests?${params}`);
                
                if (append) {
                    this.changeApproval.requests.push(...response.requests);
                } else {
                    this.changeApproval.requests = response.requests;
                }
                
                this.changeApproval.pagination = response.pagination;
                this.changeApproval.totalCount = response.pagination.total;
                this.changeApproval.pendingCount = response.requests.filter(r => r.status === 'pending').length;
                
            } catch (error) {
                console.error('Error loading approval requests:', error);
                this.showNotification('Failed to load approval requests', 'error');
            } finally {
                this.changeApproval.isLoading = false;
            }
        },

        async loadApprovalStatistics() {
            try {
                const response = await this.apiCall(`/sessions/${this.changeApproval.currentSessionId}/approval-statistics`);
                this.changeApproval.statistics = response;
            } catch (error) {
                console.error('Error loading approval statistics:', error);
            }
        },

        async applyApprovalFilters() {
            this.changeApproval.pagination.offset = 0;
            await this.loadApprovalRequests();
        },

        resetApprovalFilters() {
            this.changeApproval.filters = {
                status: 'pending',
                urgency: '',
                requester: '',
                change_type: ''
            };
            this.applyApprovalFilters();
        },

        async loadMoreApprovalRequests() {
            if (this.changeApproval.pagination.hasMore && !this.changeApproval.isLoading) {
                this.changeApproval.pagination.offset += this.changeApproval.pagination.limit;
                await this.loadApprovalRequests(true);
            }
        },

        async viewApprovalRequestDetails(request) {
            try {
                this.changeApproval.isLoading = true;
                
                const response = await this.apiCall(`/sessions/${this.changeApproval.currentSessionId}/approval-requests/${request.id}`);
                this.changeApproval.currentRequest = response;
                
                // Reset approval decision form
                this.changeApproval.approvalDecision = {
                    decision: '',
                    reason: '',
                    conditions: '',
                    review_notes: ''
                };
                
            } catch (error) {
                console.error('Error loading approval request details:', error);
                this.showNotification('Failed to load request details', 'error');
            } finally {
                this.changeApproval.isLoading = false;
            }
        },

        async submitApprovalDecision() {
            try {
                this.changeApproval.isLoading = true;
                
                const { decision, reason, conditions, review_notes } = this.changeApproval.approvalDecision;
                
                if (!decision) {
                    this.showNotification('Please select a decision', 'error');
                    return;
                }
                
                if (!reason.trim()) {
                    this.showNotification('Please provide a reason for your decision', 'error');
                    return;
                }
                
                const response = await this.apiCall(
                    `/sessions/${this.changeApproval.currentSessionId}/approval-requests/${this.changeApproval.currentRequest.request.id}/approve`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            decision,
                            reason,
                            conditions,
                            review_notes
                        })
                    }
                );
                
                this.showNotification(response.message, 'success');
                
                // Refresh the requests list
                await this.loadApprovalRequests();
                
                // Close the details view
                this.changeApproval.currentRequest = null;
                
            } catch (error) {
                console.error('Error submitting approval decision:', error);
                this.showNotification('Failed to submit approval decision', 'error');
            } finally {
                this.changeApproval.isLoading = false;
            }
        },

        async createManualApprovalRequest(testInstanceId, changeType, fieldName, oldValue, newValue, reason, urgencyLevel = 'normal') {
            try {
                const response = await this.apiCall(
                    `/sessions/${this.changeApproval.currentSessionId}/approval-requests`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            test_instance_id: testInstanceId,
                            change_type: changeType,
                            field_name: fieldName,
                            old_value: oldValue,
                            new_value: newValue,
                            change_reason: reason,
                            urgency_level: urgencyLevel,
                            business_justification: `Manual approval request for ${changeType}`,
                            impact_assessment: 'Test result change requiring approval'
                        })
                    }
                );
                
                this.showNotification('Approval request created successfully', 'success');
                
                // Refresh approval requests if modal is open
                if (this.changeApproval.isModalOpen) {
                    await this.loadApprovalRequests();
                }
                
                return response;
                
            } catch (error) {
                console.error('Error creating manual approval request:', error);
                this.showNotification('Failed to create approval request', 'error');
                throw error;
            }
        },

        closeChangeApprovalWorkflow() {
            this.changeApproval.isModalOpen = false;
            this.changeApproval.currentRequest = null;
            this.changeApproval.currentSessionId = null;
            this.changeApproval.currentSessionName = '';
            this.changeApproval.requests = [];
            this.changeApproval.statistics = { overall: {}, daily_breakdown: [] };
        },

        getApprovalUrgencyBadgeClass(urgency) {
            const classes = {
                'critical': 'bg-red-500 text-white',
                'high': 'bg-orange-500 text-white',
                'normal': 'bg-blue-500 text-white',
                'low': 'bg-gray-500 text-white'
            };
            return classes[urgency] || classes.normal;
        },

        getApprovalStatusBadgeClass(status) {
            const classes = {
                'pending': 'bg-yellow-500 text-white',
                'approved': 'bg-green-500 text-white',
                'rejected': 'bg-red-500 text-white',
                'auto_approved': 'bg-blue-500 text-white',
                'expired': 'bg-gray-500 text-white',
                'cancelled': 'bg-gray-400 text-white'
            };
            return classes[status] || classes.pending;
        },

        getChangeTypeDisplayText(changeType) {
            const displayTexts = {
                'status_change': 'Status Change',
                'assignment_change': 'Assignment Change',
                'evidence_modification': 'Evidence Modification',
                'notes_modification': 'Notes Modification',
                'remediation_change': 'Remediation Change',
                'confidence_change': 'Confidence Change',
                'bulk_change': 'Bulk Change',
                'critical_finding': 'Critical Finding'
            };
            return displayTexts[changeType] || changeType;
        },

        formatApprovalDeadline(deadline) {
            const deadlineDate = new Date(deadline);
            const now = new Date();
            const diffHours = (deadlineDate - now) / (1000 * 60 * 60);
            
            if (diffHours < 0) {
                return 'Overdue';
            } else if (diffHours < 1) {
                return `${Math.round(diffHours * 60)} minutes remaining`;
            } else if (diffHours < 24) {
                return `${Math.round(diffHours)} hours remaining`;
            } else {
                return `${Math.round(diffHours / 24)} days remaining`;
            }
        },

        getApprovalProgressPercentage(request) {
            if (!request.required_approvers || request.required_approvers === 0) {
                return 0;
            }
            return Math.round((request.approvals_received / request.required_approvers) * 100);
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
// Audit Report Generation System
window.auditReport = {
    isGenerating: false,
    currentReport: null,
    reportOptions: {
        format: 'json',
        includeEvidence: true,
        includeTimeline: true,
        reportType: 'full',
        dateRange: null
    },
    
    // Generate comprehensive audit report
    async generateReport(sessionId, options = {}) {
        if (this.isGenerating) return;
        
        this.isGenerating = true;
        this.reportOptions = { ...this.reportOptions, ...options };
        
        try {
            // Build query parameters
            const params = new URLSearchParams();
            Object.entries(this.reportOptions).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    params.append(key, value.toString());
                }
            });
            
            const response = await fetch(`/api/sessions/${sessionId}/audit-report?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate audit report');
            }
            
            const data = await response.json();
            this.currentReport = data.report;
            
            // Update UI
            this.updateReportDisplay();
            
            return data;
            
        } catch (error) {
            console.error('Error generating audit report:', error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    },
    
    // Update report display in UI
    updateReportDisplay() {
        if (!this.currentReport) return;
        
        const reportContainer = document.getElementById('audit-report-container');
        if (!reportContainer) return;
        
        const report = this.currentReport;
        const metadata = report.metadata;
        const summary = report.executive_summary;
        
        reportContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6">
                <!-- Report Header -->
                <div class="border-b pb-4 mb-6">
                    <div class="flex justify-between items-start">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">Accessibility Audit Report</h2>
                            <p class="text-gray-600 mt-1">${metadata.projectName}</p>
                            <p class="text-sm text-gray-500">Session: ${metadata.sessionName}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm text-gray-500">Generated: ${this.formatDateTime(metadata.generatedAt)}</p>
                            <p class="text-sm text-gray-500">By: ${metadata.generatedBy}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Executive Summary -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                        <h3 class="font-semibold text-blue-900 mb-2">Overall Compliance</h3>
                        <div class="text-3xl font-bold text-blue-700">${summary.overallCompliance}%</div>
                        <div class="text-sm text-blue-600">${summary.complianceLevel}</div>
                    </div>
                    <div class="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                        <h3 class="font-semibold text-green-900 mb-2">Tests Passed</h3>
                        <div class="text-3xl font-bold text-green-700">${summary.passedTests}</div>
                        <div class="text-sm text-green-600">of ${summary.totalTests} total</div>
                    </div>
                    <div class="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
                        <h3 class="font-semibold text-red-900 mb-2">Tests Failed</h3>
                        <div class="text-3xl font-bold text-red-700">${summary.failedTests}</div>
                        <div class="text-sm text-red-600">require attention</div>
                    </div>
                </div>
                
                <!-- WCAG Level Breakdown -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold mb-4">WCAG Level Breakdown</h3>
                    <div class="grid grid-cols-3 gap-4">
                        <div class="bg-gray-50 p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-gray-700">${report.wcag_breakdown.levelA}</div>
                            <div class="text-sm text-gray-600">Level A Tests</div>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-gray-700">${report.wcag_breakdown.levelAA}</div>
                            <div class="text-sm text-gray-600">Level AA Tests</div>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg text-center">
                            <div class="text-2xl font-bold text-gray-700">${report.wcag_breakdown.levelAAA}</div>
                            <div class="text-sm text-gray-600">Level AAA Tests</div>
                        </div>
                    </div>
                </div>
                
                <!-- Testing Statistics -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold mb-4">Testing Coverage</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="text-center">
                            <div class="text-xl font-bold text-gray-700">${summary.pagesTested}</div>
                            <div class="text-sm text-gray-600">Pages Tested</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xl font-bold text-gray-700">${summary.criteriaTested}</div>
                            <div class="text-sm text-gray-600">Criteria Tested</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xl font-bold text-gray-700">${summary.notApplicableTests}</div>
                            <div class="text-sm text-gray-600">Not Applicable</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xl font-bold text-gray-700">${summary.pendingTests}</div>
                            <div class="text-sm text-gray-600">Pending</div>
                        </div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-3 mb-6">
                    <button onclick="auditReport.showComplianceDetails()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-chart-bar mr-2"></i>View Compliance Details
                    </button>
                    <button onclick="auditReport.showRecommendations()" 
                            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        <i class="fas fa-lightbulb mr-2"></i>View Recommendations
                    </button>
                    ${report.timeline_data ? `
                        <button onclick="auditReport.showTimelineData()" 
                                class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                            <i class="fas fa-clock mr-2"></i>View Timeline
                        </button>
                    ` : ''}
                    ${report.evidence_summary ? `
                        <button onclick="auditReport.showEvidenceSummary()" 
                                class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                            <i class="fas fa-paperclip mr-2"></i>View Evidence
                        </button>
                    ` : ''}
                </div>
                
                <!-- Export Options -->
                <div class="border-t pt-4">
                    <h3 class="text-lg font-semibold mb-3">Export Options</h3>
                    <div class="flex flex-wrap gap-3">
                        <button onclick="auditReport.exportReport('json')" 
                                class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                            <i class="fas fa-download mr-2"></i>Export JSON
                        </button>
                        <button onclick="auditReport.exportReport('csv')" 
                                class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                            <i class="fas fa-file-csv mr-2"></i>Export CSV
                        </button>
                        <button onclick="auditReport.generatePDF()" 
                                class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                            <i class="fas fa-file-pdf mr-2"></i>Generate PDF
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Show compliance details modal
    showComplianceDetails() {
        if (!this.currentReport?.compliance_details) return;
        
        const details = this.currentReport.compliance_details;
        const modalContent = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold">WCAG Compliance Details</h3>
                <div class="max-h-96 overflow-y-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left">Level</th>
                                <th class="px-3 py-2 text-left">Criterion</th>
                                <th class="px-3 py-2 text-center">Total</th>
                                <th class="px-3 py-2 text-center">Passed</th>
                                <th class="px-3 py-2 text-center">Failed</th>
                                <th class="px-3 py-2 text-center">N/A</th>
                                <th class="px-3 py-2 text-center">Compliance %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${details.map(detail => `
                                <tr class="border-b">
                                    <td class="px-3 py-2">
                                        <span class="px-2 py-1 text-xs rounded ${this.getLevelBadgeClass(detail.level)}">
                                            ${detail.level}
                                        </span>
                                    </td>
                                    <td class="px-3 py-2 font-mono text-xs">${detail.criterion_id}</td>
                                    <td class="px-3 py-2 text-center">${detail.total_tests}</td>
                                    <td class="px-3 py-2 text-center text-green-600">${detail.passed}</td>
                                    <td class="px-3 py-2 text-center text-red-600">${detail.failed}</td>
                                    <td class="px-3 py-2 text-center text-gray-500">${detail.not_applicable}</td>
                                    <td class="px-3 py-2 text-center">
                                        <span class="font-semibold ${detail.compliance_percentage >= 80 ? 'text-green-600' : detail.compliance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}">
                                            ${detail.compliance_percentage || 'N/A'}%
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        this.showModal('Compliance Details', modalContent);
    },
    
    // Show recommendations modal
    showRecommendations() {
        if (!this.currentReport?.recommendations) return;
        
        const recommendations = this.currentReport.recommendations;
        const modalContent = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold">Recommendations</h3>
                <div class="max-h-96 overflow-y-auto space-y-4">
                    ${recommendations.map(rec => `
                        <div class="border rounded-lg p-4">
                            <div class="flex items-start justify-between mb-2">
                                <h4 class="font-semibold text-gray-900">${rec.title}</h4>
                                <span class="px-2 py-1 text-xs rounded ${this.getPriorityBadgeClass(rec.priority)}">
                                    ${rec.priority.toUpperCase()}
                                </span>
                            </div>
                            <p class="text-gray-600 text-sm mb-3">${rec.description}</p>
                            <div class="space-y-1">
                                <p class="text-sm font-medium text-gray-700">Action Items:</p>
                                <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                                    ${rec.actionItems.map(item => `<li>${item}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.showModal('Recommendations', modalContent);
    },
    
    // Show timeline data modal
    showTimelineData() {
        if (!this.currentReport?.timeline_data) return;
        
        const timeline = this.currentReport.timeline_data;
        const modalContent = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold">Activity Timeline</h3>
                <div class="max-h-96 overflow-y-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left">Date</th>
                                <th class="px-3 py-2 text-center">Total Activities</th>
                                <th class="px-3 py-2 text-center">Status Changes</th>
                                <th class="px-3 py-2 text-center">Evidence Uploads</th>
                                <th class="px-3 py-2 text-center">Comments</th>
                                <th class="px-3 py-2 text-center">Active Users</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${timeline.map(day => `
                                <tr class="border-b">
                                    <td class="px-3 py-2 font-medium">${this.formatDate(day.activity_date)}</td>
                                    <td class="px-3 py-2 text-center">${day.total_activities}</td>
                                    <td class="px-3 py-2 text-center">${day.status_changes}</td>
                                    <td class="px-3 py-2 text-center">${day.evidence_uploads}</td>
                                    <td class="px-3 py-2 text-center">${day.comments_added}</td>
                                    <td class="px-3 py-2 text-center">${day.active_users}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        this.showModal('Activity Timeline', modalContent);
    },
    
    // Show evidence summary modal
    showEvidenceSummary() {
        if (!this.currentReport?.evidence_summary) return;
        
        const evidence = this.currentReport.evidence_summary;
        const modalContent = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold">Evidence Summary</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-700">${evidence.total_evidence}</div>
                        <div class="text-sm text-blue-600">Total Evidence Items</div>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-700">${evidence.uploaded_files}</div>
                        <div class="text-sm text-green-600">Uploaded Files</div>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-yellow-700">${evidence.screenshots}</div>
                        <div class="text-sm text-yellow-600">Screenshots</div>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-purple-700">${evidence.documents}</div>
                        <div class="text-sm text-purple-600">Documents</div>
                    </div>
                </div>
                ${evidence.videos > 0 ? `
                    <div class="bg-red-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-red-700">${evidence.videos}</div>
                        <div class="text-sm text-red-600">Videos</div>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.showModal('Evidence Summary', modalContent);
    },
    
    // Export report in different formats
    async exportReport(format) {
        if (!this.currentReport) return;
        
        try {
            let content, filename, mimeType;
            
            if (format === 'json') {
                content = JSON.stringify(this.currentReport, null, 2);
                filename = `audit-report-${this.currentReport.metadata.sessionId}-${Date.now()}.json`;
                mimeType = 'application/json';
            } else if (format === 'csv') {
                content = this.generateCSVReport();
                filename = `audit-report-${this.currentReport.metadata.sessionId}-${Date.now()}.csv`;
                mimeType = 'text/csv';
            }
            
            // Create and download file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error exporting report:', error);
            alert('Failed to export report');
        }
    },
    
    // Generate CSV format report
    generateCSVReport() {
        const report = this.currentReport;
        const lines = [];
        
        // Header
        lines.push('Accessibility Audit Report');
        lines.push(`Project: ${report.metadata.projectName}`);
        lines.push(`Session: ${report.metadata.sessionName}`);
        lines.push(`Generated: ${this.formatDateTime(report.metadata.generatedAt)}`);
        lines.push('');
        
        // Executive Summary
        lines.push('Executive Summary');
        lines.push('Metric,Value');
        lines.push(`Total Tests,${report.executive_summary.totalTests}`);
        lines.push(`Passed Tests,${report.executive_summary.passedTests}`);
        lines.push(`Failed Tests,${report.executive_summary.failedTests}`);
        lines.push(`Not Applicable Tests,${report.executive_summary.notApplicableTests}`);
        lines.push(`Pending Tests,${report.executive_summary.pendingTests}`);
        lines.push(`Overall Compliance,${report.executive_summary.overallCompliance}%`);
        lines.push(`Compliance Level,${report.executive_summary.complianceLevel}`);
        lines.push('');
        
        // Compliance Details
        if (report.compliance_details?.length > 0) {
            lines.push('Compliance Details');
            lines.push('Level,Criterion,Total Tests,Passed,Failed,Not Applicable,Compliance %');
            report.compliance_details.forEach(detail => {
                lines.push(`${detail.level},${detail.criterion_id},${detail.total_tests},${detail.passed},${detail.failed},${detail.not_applicable},${detail.compliance_percentage || 'N/A'}`);
            });
            lines.push('');
        }
        
        return lines.join('\n');
    },
    
    // Generate PDF report
    async generatePDF() {
        if (!this.currentReport) return;
        
        try {
            // For now, this creates an HTML version that can be printed to PDF
            // In a full implementation, you'd use a PDF library like jsPDF or Puppeteer
            const printWindow = window.open('', '_blank');
            const htmlContent = this.generatePrintableHTML();
            
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            
            // Auto-trigger print dialog
            setTimeout(() => {
                printWindow.print();
            }, 500);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF');
        }
    },
    
    // Generate printable HTML for PDF
    generatePrintableHTML() {
        const report = this.currentReport;
        const metadata = report.metadata;
        const summary = report.executive_summary;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Accessibility Audit Report - ${metadata.projectName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                    .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
                    .summary-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
                    .metric-value { font-size: 24px; font-weight: bold; color: #333; }
                    .metric-label { font-size: 12px; color: #666; }
                    .compliance-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .compliance-table th, .compliance-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .compliance-table th { background-color: #f5f5f5; }
                    .recommendations { margin: 30px 0; }
                    .recommendation { border: 1px solid #ddd; margin: 10px 0; padding: 15px; }
                    .priority-critical { border-left: 4px solid #dc2626; }
                    .priority-high { border-left: 4px solid #ea580c; }
                    .priority-medium { border-left: 4px solid #ca8a04; }
                    @media print { body { margin: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Accessibility Audit Report</h1>
                    <h2>${metadata.projectName}</h2>
                    <p><strong>Session:</strong> ${metadata.sessionName}</p>
                    <p><strong>Generated:</strong> ${this.formatDateTime(metadata.generatedAt)} by ${metadata.generatedBy}</p>
                </div>
                
                <div class="executive-summary">
                    <h2>Executive Summary</h2>
                    <div class="summary-grid">
                        <div class="summary-card">
                            <div class="metric-value">${summary.overallCompliance}%</div>
                            <div class="metric-label">Overall Compliance</div>
                            <div class="metric-label">${summary.complianceLevel}</div>
                        </div>
                        <div class="summary-card">
                            <div class="metric-value">${summary.passedTests}</div>
                            <div class="metric-label">Tests Passed</div>
                        </div>
                        <div class="summary-card">
                            <div class="metric-value">${summary.failedTests}</div>
                            <div class="metric-label">Tests Failed</div>
                        </div>
                    </div>
                </div>
                
                ${report.compliance_details?.length > 0 ? `
                    <div class="compliance-details">
                        <h2>WCAG Compliance Details</h2>
                        <table class="compliance-table">
                            <thead>
                                <tr>
                                    <th>Level</th>
                                    <th>Criterion</th>
                                    <th>Total</th>
                                    <th>Passed</th>
                                    <th>Failed</th>
                                    <th>N/A</th>
                                    <th>Compliance %</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.compliance_details.map(detail => `
                                    <tr>
                                        <td>${detail.level}</td>
                                        <td>${detail.criterion_id}</td>
                                        <td>${detail.total_tests}</td>
                                        <td>${detail.passed}</td>
                                        <td>${detail.failed}</td>
                                        <td>${detail.not_applicable}</td>
                                        <td>${detail.compliance_percentage || 'N/A'}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                
                ${report.recommendations?.length > 0 ? `
                    <div class="recommendations">
                        <h2>Recommendations</h2>
                        ${report.recommendations.map(rec => `
                            <div class="recommendation priority-${rec.priority}">
                                <h3>${rec.title}</h3>
                                <p><strong>Priority:</strong> ${rec.priority.toUpperCase()}</p>
                                <p>${rec.description}</p>
                                <h4>Action Items:</h4>
                                <ul>
                                    ${rec.actionItems.map(item => `<li>${item}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </body>
            </html>
        `;
    },
    
    // Utility functions
    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString();
    },
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    },
    
    getLevelBadgeClass(level) {
        const classes = {
            'A': 'bg-green-100 text-green-800',
            'AA': 'bg-blue-100 text-blue-800',
            'AAA': 'bg-purple-100 text-purple-800'
        };
        return classes[level] || 'bg-gray-100 text-gray-800';
    },
    
    getPriorityBadgeClass(priority) {
        const classes = {
            'critical': 'bg-red-100 text-red-800',
            'high': 'bg-orange-100 text-orange-800',
            'medium': 'bg-yellow-100 text-yellow-800',
            'low': 'bg-green-100 text-green-800'
        };
        return classes[priority] || 'bg-gray-100 text-gray-800';
    },
    
    showModal(title, content) {
        // Use existing modal system
        if (typeof showModal === 'function') {
            showModal(title, content);
        } else {
            alert('Modal system not available');
        }
    }
};

// Function to show audit report interface
function showAuditReport(sessionId) {
    const modalContent = `
        <div class="space-y-6">
            <div class="border-b pb-4">
                <h2 class="text-xl font-semibold flex items-center">
                    <i class="fas fa-file-alt mr-3 text-blue-600"></i>
                    Generate Audit Report
                </h2>
                <p class="text-gray-600 text-sm mt-1">Create comprehensive compliance documentation with PDF export</p>
            </div>
            
            <!-- Report Options -->
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                    <select id="report-type-select" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="full">Full Compliance Report</option>
                        <option value="summary">Executive Summary</option>
                        <option value="technical">Technical Details Only</option>
                        <option value="compliance">Compliance Assessment</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Date Range (Optional)</label>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="date" id="start-date" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <input type="date" id="end-date" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
                
                <div class="space-y-3">
                    <label class="block text-sm font-medium text-gray-700">Include Additional Data</label>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" id="include-evidence" checked class="mr-3 text-blue-600 focus:ring-blue-500">
                            <div>
                                <div class="text-sm font-medium">Evidence Summary</div>
                                <div class="text-xs text-gray-500">Screenshots, documents, videos</div>
                            </div>
                        </label>
                        <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" id="include-timeline" checked class="mr-3 text-blue-600 focus:ring-blue-500">
                            <div>
                                <div class="text-sm font-medium">Activity Timeline</div>
                                <div class="text-xs text-gray-500">Daily activity breakdown</div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
            
            <!-- Generate Button -->
            <div class="flex justify-end space-x-3">
                <button onclick="closeModal()" 
                        class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Cancel
                </button>
                <button id="generate-report-btn" onclick="generateAuditReportFromModal('${sessionId}')" 
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <i class="fas fa-file-alt mr-2"></i>Generate Report
                </button>
            </div>
            
            <!-- Report Container -->
            <div id="audit-report-container" class="mt-6" style="display: none;"></div>
        </div>
    `;
    
    showModal('Audit Report Generator', modalContent);
}

// Function to generate report from modal
async function generateAuditReportFromModal(sessionId) {
    try {
        // Show loading
        const button = document.getElementById('generate-report-btn');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
        button.disabled = true;
        
        // Get options from form
        const reportType = document.getElementById('report-type-select').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const includeEvidence = document.getElementById('include-evidence').checked;
        const includeTimeline = document.getElementById('include-timeline').checked;
        
        const options = {
            reportType,
            includeEvidence,
            includeTimeline
        };
        
        if (startDate && endDate) {
            options.dateRange = `${startDate},${endDate}`;
        }
        
        // Generate report via API
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.append(key, value.toString());
            }
        });
        
        const response = await fetch(`/api/sessions/${sessionId}/audit-report?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate audit report');
        }
        
        const data = await response.json();
        const report = data.report;
        
        // Display the report
        const reportContainer = document.getElementById('audit-report-container');
        if (reportContainer) {
            const metadata = report.metadata;
            const summary = report.executive_summary;
            
            reportContainer.innerHTML = `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                    <!-- Report Header -->
                    <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                        <div class="flex justify-between items-start">
                            <div>
                                <h1 class="text-3xl font-bold">Accessibility Audit Report</h1>
                                <p class="text-blue-100 mt-2 text-lg">${metadata.projectName}</p>
                                <p class="text-blue-200 text-sm">Session: ${metadata.sessionName}</p>
                            </div>
                            <div class="text-right text-blue-100">
                                <p class="text-sm">Generated: ${new Date(metadata.generatedAt).toLocaleString()}</p>
                                <p class="text-sm">By: ${metadata.generatedBy}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-6">
                        <!-- Executive Summary -->
                        <div class="mb-8">
                            <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                <i class="fas fa-chart-line mr-3 text-blue-600"></i>
                                Executive Summary
                            </h2>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                                    <h3 class="font-semibold text-blue-900 mb-2 flex items-center">
                                        <i class="fas fa-percentage mr-2"></i>Overall Compliance
                                    </h3>
                                    <div class="text-4xl font-bold text-blue-700">${summary.overallCompliance}%</div>
                                    <div class="text-sm text-blue-600 mt-1">${summary.complianceLevel}</div>
                                </div>
                                <div class="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                                    <h3 class="font-semibold text-green-900 mb-2 flex items-center">
                                        <i class="fas fa-check-circle mr-2"></i>Tests Passed
                                    </h3>
                                    <div class="text-4xl font-bold text-green-700">${summary.passedTests}</div>
                                    <div class="text-sm text-green-600 mt-1">of ${summary.totalTests} total</div>
                                </div>
                                <div class="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
                                    <h3 class="font-semibold text-red-900 mb-2 flex items-center">
                                        <i class="fas fa-exclamation-triangle mr-2"></i>Tests Failed
                                    </h3>
                                    <div class="text-4xl font-bold text-red-700">${summary.failedTests}</div>
                                    <div class="text-sm text-red-600 mt-1">require attention</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Export Options -->
                        <div class="border-t pt-6">
                            <h3 class="text-lg font-semibold mb-4 flex items-center">
                                <i class="fas fa-download mr-3 text-gray-600"></i>
                                Export Options
                            </h3>
                            <div class="flex flex-wrap gap-3">
                                <button onclick="exportAuditReport('json', '${sessionId}')" 
                                        class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-code mr-2"></i>Export JSON
                                </button>
                                <button onclick="exportAuditReport('csv', '${sessionId}')" 
                                        class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-file-csv mr-2"></i>Export CSV
                                </button>
                                <button onclick="generateAuditReportPDF('${sessionId}')" 
                                        class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                                    <i class="fas fa-file-pdf mr-2"></i>Generate PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            reportContainer.style.display = 'block';
        }
        
        // Restore button
        button.innerHTML = originalText;
        button.disabled = false;
        
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate audit report');
        
        // Restore button
        const button = document.getElementById('generate-report-btn');
        button.innerHTML = '<i class="fas fa-file-alt mr-2"></i>Generate Report';
        button.disabled = false;
    }
}

// Export functions
function exportAuditReport(format, sessionId) {
    // Re-fetch the report data for export
    fetch(`/api/sessions/${sessionId}/audit-report`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        const report = data.report;
        let content, filename, mimeType;
        
        if (format === 'json') {
            content = JSON.stringify(report, null, 2);
            filename = `audit-report-${report.metadata.sessionId}-${Date.now()}.json`;
            mimeType = 'application/json';
        } else if (format === 'csv') {
            content = generateCSVReport(report);
            filename = `audit-report-${report.metadata.sessionId}-${Date.now()}.csv`;
            mimeType = 'text/csv';
        }
        
        // Create and download file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    })
    .catch(error => {
        console.error('Error exporting report:', error);
        alert('Failed to export report');
    });
}

function generateCSVReport(report) {
    const lines = [];
    
    // Header
    lines.push('Accessibility Audit Report');
    lines.push(`Project: ${report.metadata.projectName}`);
    lines.push(`Session: ${report.metadata.sessionName}`);
    lines.push(`Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}`);
    lines.push('');
    
    // Executive Summary
    lines.push('Executive Summary');
    lines.push('Metric,Value');
    lines.push(`Total Tests,${report.executive_summary.totalTests}`);
    lines.push(`Passed Tests,${report.executive_summary.passedTests}`);
    lines.push(`Failed Tests,${report.executive_summary.failedTests}`);
    lines.push(`Not Applicable Tests,${report.executive_summary.notApplicableTests}`);
    lines.push(`Pending Tests,${report.executive_summary.pendingTests}`);
    lines.push(`Overall Compliance,${report.executive_summary.overallCompliance}%`);
    lines.push(`Compliance Level,${report.executive_summary.complianceLevel}`);
    
    return lines.join('\n');
}

function generateAuditReportPDF(sessionId) {
    // Re-fetch the report data for PDF generation
    fetch(`/api/sessions/${sessionId}/audit-report`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        const report = data.report;
        const metadata = report.metadata;
        const summary = report.executive_summary;
        
        // Create a new window with the report content
        const printWindow = window.open('', '_blank');
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Accessibility Audit Report - ${metadata.projectName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
                    .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
                    .summary-card { border: 2px solid #e5e7eb; padding: 20px; text-align: center; border-radius: 8px; }
                    .metric-value { font-size: 32px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
                    .metric-label { font-size: 14px; color: #6b7280; font-weight: 500; }
                    @media print { body { margin: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Accessibility Audit Report</h1>
                    <h2>${metadata.projectName}</h2>
                    <p><strong>Session:</strong> ${metadata.sessionName}</p>
                    <p><strong>Generated:</strong> ${new Date(metadata.generatedAt).toLocaleString()} by ${metadata.generatedBy}</p>
                </div>
                
                <div class="executive-summary">
                    <h2>Executive Summary</h2>
                    <div class="summary-grid">
                        <div class="summary-card">
                            <div class="metric-value">${summary.overallCompliance}%</div>
                            <div class="metric-label">Overall Compliance</div>
                            <div class="metric-label">${summary.complianceLevel}</div>
                        </div>
                        <div class="summary-card">
                            <div class="metric-value">${summary.passedTests}</div>
                            <div class="metric-label">Tests Passed</div>
                        </div>
                        <div class="summary-card">
                            <div class="metric-value">${summary.failedTests}</div>
                            <div class="metric-label">Tests Failed</div>
                        </div>
                    </div>
                    
                    <h3>Testing Coverage</h3>
                    <p><strong>Pages Tested:</strong> ${summary.pagesTested} | <strong>Criteria Tested:</strong> ${summary.criteriaTested} | <strong>Not Applicable:</strong> ${summary.notApplicableTests} | <strong>Pending:</strong> ${summary.pendingTests}</p>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Auto-trigger print dialog
        setTimeout(() => {
            printWindow.print();
        }, 500);
    })
    .catch(error => {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Dashboard Helpers Loaded');
});
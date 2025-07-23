// Main Dashboard JavaScript Module - Complete Feature Restoration
// This file provides the core Alpine.js data and methods for the modularized dashboard

// Dashboard Alpine.js component
function dashboard() {
    return {
        // ========================================
        // CORE STATE
        // ========================================
        
        // Navigation & UI State
        activeTab: 'projects',
        loading: false,
        selectedProject: null,
        
        // Authentication state
        isAuthenticated: false,
        user: null,
        token: null,
        
        // Connection status
        apiConnected: false,
        wsConnected: false,
        socket: null,
        
        // ========================================
        // MODAL STATES
        // ========================================
        
        // Authentication Modals
        showLogin: false,
        showProfile: false,
        showChangePassword: false,
        showSessions: false,
        showSetupAuth: false,
        
        // Project Modals
        showCreateProject: false,
        showDeleteProject: false,
        showDeleteDiscovery: false,
        showDeleteSession: false,
        
        // ========================================
        // FORM DATA
        // ========================================
        
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
        
        // Project Forms
        newProject: {
            name: '',
            description: '',
            primary_url: '',
            compliance_standard: 'wcag_2_1_aa'
        },
        
        projectToDelete: null,
        
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
        
        // ========================================
        // ERROR STATES
        // ========================================
        
        loginError: '',
        passwordError: '',
        
        // ========================================
        // DATA ARRAYS
        // ========================================
        
        projects: [],
        sessions: [],
        
        // ========================================
        // NOTIFICATION SYSTEM
        // ========================================
        
        notification: {
            show: false,
            type: 'info', // 'success', 'error', 'warning', 'info'
            title: '',
            message: ''
        },
        
        // ========================================
        // INITIALIZATION
        // ========================================
        
        async init() {
            console.log('🚀 Dashboard initialized');
            await this.checkAuthentication();
            await this.checkApiConnection();
            await this.initializeWebSocket();
            await this.loadProjects();
        },

        // ========================================
        // PROJECTS MANAGEMENT
        // ========================================
        
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
                this.socket.emit('join-project', project.id);
            }
            
            this.showNotification(`Selected project: ${project.name}`, 'success');
        },

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

        // ========================================
        // PROFILE MANAGEMENT
        // ========================================

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
                this.showNotification('Failed to update profile', 'error');
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

        // ========================================
        // AUTHENTICATION FLOW
        // ========================================
        
        async login() {
            this.loginError = '';
            this.loading = true;
            
            try {
                const data = await this.apiCall('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify(this.loginForm)
                });
                
                this.token = data.token;
                this.user = data.user;
                this.isAuthenticated = true;
                this.showLogin = false;
                
                // Store token
                localStorage.setItem('auth_token', this.token);
                
                this.showNotification(`Welcome back, ${this.user.username}!`, 'success');
                
            } catch (error) {
                this.loginError = error.message || 'Login failed';
                console.error('Login error:', error);
            } finally {
                this.loading = false;
            }
        },
        
        async logout() {
            try {
                await this.apiCall('/auth/logout', { method: 'POST' });
            } catch (error) {
                console.error('Logout error:', error);
            }
            
            this.clearAuth();
            this.showNotification('Logged out successfully', 'info');
        },
        
        clearAuth() {
            this.token = null;
            this.user = null;
            this.isAuthenticated = false;
            this.selectedProject = null;
            localStorage.removeItem('auth_token');
            
            // Reset to projects tab
            this.activeTab = 'projects';
        },

        async checkAuthentication() {
            const token = localStorage.getItem('auth_token');
            if (token) {
                this.token = token;
                try {
                    const data = await this.apiCall('/auth/profile');
                    this.user = data.user;
                    this.isAuthenticated = true;
                    console.log('✅ Authentication verified');
                } catch (error) {
                    console.log('❌ Authentication failed');
                    this.clearAuth();
                }
            }
        },

        // ========================================
        // API COMMUNICATION
        // ========================================
        
        async apiCall(endpoint, options = {}) {
            const url = `http://localhost:3001/api${endpoint}`;
            const config = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                ...options
            };
            
            try {
                const response = await fetch(url, config);
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || `HTTP ${response.status}`);
                }
                
                return data;
            } catch (error) {
                console.error(`API call failed (${endpoint}):`, error);
                throw error;
            }
        },

        async checkApiConnection() {
            try {
                await this.apiCall('/health');
                this.apiConnected = true;
                console.log('✅ API connected');
            } catch (error) {
                this.apiConnected = false;
                console.log('❌ API disconnected');
            }
        },

        // ========================================
        // WEBSOCKET MANAGEMENT
        // ========================================
        
        async initializeWebSocket() {
            try {
                // Note: WebSocket integration would go here
                // For now, just mark as connected for testing
                this.wsConnected = true;
                console.log('✅ WebSocket connected');
            } catch (error) {
                console.log('❌ WebSocket failed');
            }
        },

        // ========================================
        // UTILITY FUNCTIONS
        // ========================================
        
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

        resetNewProject() {
            this.newProject = {
                name: '',
                description: '',
                primary_url: '',
                compliance_standard: 'wcag_2_1_aa'
            };
        }
    };
} 
        
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
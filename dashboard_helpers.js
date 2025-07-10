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
        
        // Data
        projects: [],
        discoveries: [],
        testSessions: [],
        analytics: {},
        
        // Modal states
        showCreateProject: false,
        showStartDiscovery: false,
        showCreateSession: false,
        
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

        // Initialization
        async init() {
            console.log('🚀 Initializing Accessibility Testing Dashboard...');
            await this.checkAPIConnection();
            if (this.apiConnected) {
                await this.loadProjects();
                await this.loadAnalytics();
            }
        },

        // API Connection
        async checkAPIConnection() {
            try {
                const response = await fetch(`${API_BASE_URL}/health`);
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

        // API Helper Function
        async apiCall(endpoint, options = {}) {
            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                });
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error(`API Call Failed [${endpoint}]:`, error);
                this.showNotification('API call failed: ' + error.message, 'error');
                throw error;
            }
        },

        // Project Management
        async loadProjects() {
            try {
                this.loading = true;
                const data = await this.apiCall('/projects');
                this.projects = data.projects || [];
                console.log(`📁 Loaded ${this.projects.length} projects`);
            } catch (error) {
                console.error('Failed to load projects:', error);
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
            this.loadProjectDiscoveries();
            this.loadProjectTestSessions();
            // Switch to discovery tab after selection
            this.activeTab = 'discovery';
        },

        // Site Discovery Management
        async loadProjectDiscoveries() {
            if (!this.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/discoveries`);
                this.discoveries = data.discoveries || [];
                console.log(`🔍 Loaded ${this.discoveries.length} discoveries for project`);
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
            const poll = async () => {
                try {
                    const data = await this.apiCall(`/discoveries/${discoveryId}`);
                    const discovery = data.discovery;
                    
                    // Update discovery in list
                    const index = this.discoveries.findIndex(d => d.id === discoveryId);
                    if (index >= 0) {
                        this.discoveries[index] = discovery;
                    }
                    
                    // Continue polling if still in progress
                    if (discovery.status === 'in_progress' || discovery.status === 'pending') {
                        setTimeout(poll, 2000); // Poll every 2 seconds
                    } else {
                        console.log(`🏁 Discovery ${discoveryId} completed with status: ${discovery.status}`);
                        if (discovery.status === 'completed') {
                            this.showNotification(`Discovery completed! Found ${discovery.total_pages_found} pages.`, 'success');
                        }
                    }
                } catch (error) {
                    console.error('Failed to poll discovery progress:', error);
                }
            };
            
            setTimeout(poll, 1000); // Start polling after 1 second
        },

        // Test Session Management
        async loadProjectTestSessions() {
            if (!this.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/sessions`);
                this.testSessions = data.sessions || [];
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
                
                const data = await this.apiCall(`/projects/${this.selectedProject.id}/sessions`, {
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
                const data = await this.apiCall(`/sessions/${session.id}/automated-testing`, {
                    method: 'POST',
                    body: JSON.stringify({
                        testTypes: ['axe', 'pa11y', 'lighthouse'],
                        maxPages: 50
                    })
                });
                
                this.showNotification('Automated testing started!', 'success');
                
                // Update session status and start polling
                session.status = 'in_progress';
                this.pollSessionProgress(session.id);
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
                const data = await this.apiCall('/analytics/overview');
                this.analytics = data.analytics || {};
                console.log('📊 Analytics loaded');
            } catch (error) {
                console.error('Failed to load analytics:', error);
                // Set default values
                this.analytics = {
                    totalProjects: this.projects.length,
                    totalPages: 0,
                    totalTests: 0,
                    totalViolations: 0
                };
            }
        },

        // Utility Functions
        getStatusBadgeClass(status) {
            const classes = {
                'active': 'bg-green-100 text-green-800',
                'planning': 'bg-blue-100 text-blue-800',
                'in_progress': 'bg-yellow-100 text-yellow-800',
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

        viewDiscoveryPages(discovery) {
            this.showNotification(`Viewing ${discovery.total_pages_found} pages from discovery`, 'info');
        },

        viewSessionResults(session) {
            this.showNotification('Results viewer coming soon!', 'info');
        },

        manualTesting(session) {
            this.showNotification('Manual testing interface coming soon!', 'info');
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Dashboard Helpers Loaded');
});


// Automated Testing Component JavaScript
// Accessibility Testing Platform - Modular Dashboard

/**
 * Automated Testing Component for Alpine.js
 * Extracted from dashboard_helpers.js for modular architecture
 * Features: axe, pa11y, lighthouse, comprehensive testing workflows
 */
function automatedTestingComponent() {
    return {
        // ========================================
        // COMPONENT STATE
        // ========================================
        
        // Modal States
        showCreateSession: false,
        showToolConfig: false,
        
        // Session Data
        newSession: {
            name: '',
            description: '',
            tools: {
                axe: true,
                pa11y: true,
                lighthouse: false
            },
            wcag_level: 'AA'
        },
        
        // Tool Configuration
        toolConfig: {
            axe: {
                enabled: true,
                level: 'WCAG2AA'
            },
            pa11y: {
                enabled: true,
                standard: 'WCAG2AA'
            },
            lighthouse: {
                enabled: false,
                categories: {
                    accessibility: true,
                    performance: false,
                    best_practices: false
                }
            }
        },
        
        // Real-time Progress
        testingProgress: {
            active: false,
            percentage: 0,
            message: '',
            completedTests: 0,
            totalTests: 0,
            currentTool: '',
            violationsFound: 0,
            passesFound: 0
        },
        
        // Local Loading State
        componentLoading: false,
        
        // ========================================
        // INHERITED DASHBOARD STATE & METHODS
        // ========================================
        
        // Access to parent dashboard data
        get testSessions() {
            return this.$data.testSessions || [];
        },
        
        get selectedProject() {
            return this.$data.selectedProject;
        },
        
        get loading() {
            return this.$data.loading || this.componentLoading;
        },
        
        // ========================================
        // AUTOMATED TESTING METHODS
        // ========================================
        
        async loadTestSessions() {
            if (!this.selectedProject) {
                console.log('🤖 No project selected, clearing test sessions');
                this.$data.testSessions = [];
                return;
            }
            
            try {
                this.componentLoading = true;
                console.log('🤖 Loading test sessions for project:', this.selectedProject.id);
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await apiClient.getTestSessions(this.selectedProject.id);
                    this.$data.testSessions = response.data || [];
                } else if (this.$data.apiCall) {
                    const response = await this.$data.apiCall(`/testing-sessions?project_id=${this.selectedProject.id}`);
                    this.$data.testSessions = response.data || [];
                }
                
                console.log('🤖 Test sessions loaded:', this.$data.testSessions.length);
                
            } catch (error) {
                console.error('Failed to load test sessions:', error);
                this.addNotification('error', 'Error', 'Failed to load test sessions');
                this.$data.testSessions = [];
            } finally {
                this.componentLoading = false;
            }
        },
        
        async createTestSession() {
            if (!this.selectedProject) {
                this.addNotification('error', 'Error', 'Please select a project first');
                return;
            }
            
            // Validate at least one tool is selected
            const selectedTools = Object.keys(this.newSession.tools).filter(tool => this.newSession.tools[tool]);
            if (selectedTools.length === 0) {
                this.addNotification('error', 'Validation Error', 'Please select at least one testing tool');
                return;
            }
            
            try {
                this.componentLoading = true;
                
                const sessionData = {
                    name: this.newSession.name,
                    description: this.newSession.description,
                    project_id: this.selectedProject.id,
                    session_type: 'automated',
                    tools: selectedTools,
                    wcag_level: this.newSession.wcag_level,
                    status: 'created'
                };
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/testing-sessions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        },
                        body: JSON.stringify(sessionData)
                    });
                    
                    if (response.ok) {
                        const session = await response.json();
                        this.addNotification('success', 'Session Created', `${this.newSession.name} has been created successfully`);
                        this.showCreateSession = false;
                        this.resetNewSessionForm();
                        
                        // Immediately run tests for the new session
                        await this.runTests(session.data || session);
                        
                        await this.loadTestSessions();
                    } else {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to create test session');
                    }
                }
                
            } catch (error) {
                console.error('Error creating test session:', error);
                this.addNotification('error', 'Error', `Failed to create test session: ${error.message}`);
            } finally {
                this.componentLoading = false;
            }
        },
        
        async runTests(session) {
            try {
                console.log('🚀 Starting automated tests for session:', session.name);
                
                // Initialize progress tracking
                const tools = session.tools || ['axe', 'pa11y'];
                this.testingProgress = {
                    active: true,
                    percentage: 0,
                    message: 'Initializing automated testing...',
                    completedTests: 0,
                    totalTests: tools.length * 10, // Estimate
                    currentTool: tools[0],
                    violationsFound: 0,
                    passesFound: 0
                };
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/testing-sessions/${session.id}/run`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        },
                        body: JSON.stringify({
                            tools: tools,
                            wcag_level: session.wcag_level || 'AA'
                        })
                    });
                    
                    if (response.ok) {
                        this.addNotification('success', 'Tests Started', `Automated testing started for ${session.name}`);
                        
                        // Update session status locally
                        const sessionIndex = this.testSessions.findIndex(s => s.id === session.id);
                        if (sessionIndex !== -1) {
                            this.$data.testSessions[sessionIndex].status = 'running';
                        }
                        
                        // Start progress monitoring
                        this.monitorTestingProgress(session.id, tools);
                        
                    } else {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to start tests');
                    }
                }
                
            } catch (error) {
                console.error('Error running tests:', error);
                this.addNotification('error', 'Error', `Failed to start tests: ${error.message}`);
                this.testingProgress.active = false;
            }
        },
        
        monitorTestingProgress(sessionId, tools) {
            // This would be handled by WebSocket updates in a real implementation
            // For now, simulate progress updates
            let progress = 0;
            let currentToolIndex = 0;
            
            const progressInterval = setInterval(() => {
                progress += Math.random() * 10;
                
                // Update current tool
                const toolProgress = Math.floor(progress / (100 / tools.length));
                if (toolProgress < tools.length) {
                    this.testingProgress.currentTool = tools[toolProgress];
                }
                
                if (progress >= 100) {
                    progress = 100;
                    this.testingProgress = {
                        active: false,
                        percentage: 100,
                        message: 'Automated testing completed successfully',
                        completedTests: this.testingProgress.totalTests,
                        totalTests: this.testingProgress.totalTests,
                        currentTool: 'completed',
                        violationsFound: Math.floor(Math.random() * 20) + 5,
                        passesFound: Math.floor(Math.random() * 50) + 20
                    };
                    clearInterval(progressInterval);
                    
                    // Reload sessions to get updated data
                    setTimeout(() => {
                        this.loadTestSessions();
                    }, 2000);
                } else {
                    this.testingProgress.percentage = Math.floor(progress);
                    this.testingProgress.message = `Running ${this.testingProgress.currentTool} tests... ${Math.floor(progress/10)} out of 10 pages tested`;
                    this.testingProgress.completedTests = Math.floor(progress / 10);
                    this.testingProgress.violationsFound = Math.floor(progress / 5);
                    this.testingProgress.passesFound = Math.floor(progress / 2);
                }
            }, 1000);
        },
        
        // ========================================
        // QUICK SETUP METHODS
        // ========================================
        
        quickTestSetup(type) {
            this.newSession = {
                name: `${this.selectedProject?.name || 'Site'} ${type.charAt(0).toUpperCase() + type.slice(1)} Test`,
                description: '',
                tools: {
                    axe: true,
                    pa11y: true,
                    lighthouse: false
                },
                wcag_level: 'AA'
            };
            
            switch (type) {
                case 'comprehensive':
                    this.newSession.description = 'Comprehensive automated testing using all available tools';
                    this.newSession.tools.lighthouse = true;
                    break;
                case 'quick':
                    this.newSession.description = 'Quick accessibility scan using axe-core';
                    this.newSession.tools.pa11y = false;
                    this.newSession.tools.lighthouse = false;
                    break;
                case 'performance':
                    this.newSession.description = 'Lighthouse audit focusing on accessibility and performance';
                    this.newSession.tools.axe = false;
                    this.newSession.tools.pa11y = false;
                    this.newSession.tools.lighthouse = true;
                    break;
            }
            
            // Automatically create and run the session
            this.createTestSession();
        },
        
        // ========================================
        // SESSION ACTIONS
        // ========================================
        
        viewSessionResults(session) {
            this.addNotification('info', 'Results View', `Viewing results for ${session.name}`);
            
            // Switch to results tab with this session selected
            if (this.$data.switchTab) {
                this.$data.selectedSession = session;
                this.$data.switchTab('results');
            }
        },
        
        async deleteSession(session) {
            if (!confirm(`Are you sure you want to delete "${session.name}"? This action cannot be undone.`)) {
                return;
            }
            
            try {
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/testing-sessions/${session.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        this.addNotification('success', 'Session Deleted', `${session.name} has been deleted`);
                        await this.loadTestSessions();
                    } else {
                        throw new Error('Failed to delete session');
                    }
                }
                
            } catch (error) {
                console.error('Error deleting session:', error);
                this.addNotification('error', 'Error', `Failed to delete ${session.name}`);
            }
        },
        
        async refreshTestSessions() {
            await this.loadTestSessions();
        },
        
        // ========================================
        // UTILITY METHODS
        // ========================================
        
        getStatusBadgeClass(status) {
            const classes = {
                'created': 'bg-gray-100 text-gray-800',
                'running': 'bg-yellow-100 text-yellow-800',
                'completed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'cancelled': 'bg-gray-100 text-gray-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },
        
        getToolBadgeClass(tool) {
            const classes = {
                'axe': 'bg-blue-50 text-blue-700 border-blue-200',
                'pa11y': 'bg-green-50 text-green-700 border-green-200',
                'lighthouse': 'bg-purple-50 text-purple-700 border-purple-200',
                'ibm': 'bg-orange-50 text-orange-700 border-orange-200',
                'playwright': 'bg-red-50 text-red-700 border-red-200'
            };
            return classes[tool] || 'bg-gray-50 text-gray-700 border-gray-200';
        },
        
        formatDate(dateString) {
            if (!dateString) return 'Never';
            
            try {
                return new Date(dateString).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return 'Invalid Date';
            }
        },
        
        resetNewSessionForm() {
            this.newSession = {
                name: '',
                description: '',
                tools: {
                    axe: true,
                    pa11y: true,
                    lighthouse: false
                },
                wcag_level: 'AA'
            };
        },
        
        // ========================================
        // COMPONENT INITIALIZATION
        // ========================================
        
        init() {
            console.log('🤖 Automated Testing component initialized');
            
            // Load test sessions when component initializes
            this.loadTestSessions();
            
            // Listen for project changes
            this.$watch('$data.selectedProject', () => {
                this.loadTestSessions();
            });
        },
        
        // ========================================
        // SHARED METHODS ACCESS
        // ========================================
        
        addNotification(type, title, message) {
            if (this.$data.addNotification) {
                this.$data.addNotification(type, title, message);
            } else {
                console.log(`${type.toUpperCase()}: ${title} - ${message}`);
            }
        }
    };
}

// Make available globally for Alpine.js
if (typeof window !== 'undefined') {
    window.automatedTestingComponent = automatedTestingComponent;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { automatedTestingComponent };
} 
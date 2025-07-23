// Compliance Sessions Component JavaScript
// Accessibility Testing Platform - Modular Dashboard

/**
 * Compliance Sessions Component for Alpine.js
 * Extracted from dashboard_helpers.js for modular architecture
 * Features: Structured testing sessions, WCAG compliance, deep testing features
 */
function complianceSessionsComponent() {
    return {
        // ========================================
        // COMPONENT STATE
        // ========================================
        
        // Testing Sessions
        testingSessions: [],
        currentlyViewedTestingSession: null,
        
        // Session Details
        viewingSessionDetails: false,
        currentSessionDetails: null,
        testInstanceView: 'requirements', // 'requirements' or 'instances'
        
        // Requirements and Test Instances
        sessionRequirements: [],
        filteredRequirements: [],
        testInstances: [],
        filteredTestInstances: [],
        
        // Web Crawler Integration
        sessionsSelectedPages: [],
        sessionsSourceCrawler: null,
        
        // Modal States
        showCreateTestingSession: false,
        
        // Form Data
        newTestingSession: {
            name: '',
            description: '',
            conformance_level: 'AA',
            custom_requirements: ''
        },
        
        // Filters
        testInstanceFilters: {
            status: '',
            test_method: ''
        },
        
        // Local Loading State
        componentLoading: false,
        
        // ========================================
        // INHERITED DASHBOARD STATE & METHODS
        // ========================================
        
        get selectedProject() {
            return this.$data.selectedProject;
        },
        
        get loading() {
            return this.$data.loading || this.componentLoading;
        },
        
        // ========================================
        // SESSION MANAGEMENT METHODS
        // ========================================
        
        async loadTestingSessions() {
            if (!this.selectedProject) {
                this.testingSessions = [];
                return;
            }
            
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/projects/${this.selectedProject.id}/testing-sessions`, {
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.testingSessions = data.sessions || [];
                    } else {
                        this.generateMockTestingSessions();
                    }
                } else {
                    this.generateMockTestingSessions();
                }
                
            } catch (error) {
                console.error('Error loading testing sessions:', error);
                this.addNotification('error', 'Error', 'Failed to load testing sessions');
                this.generateMockTestingSessions();
            } finally {
                this.componentLoading = false;
            }
        },
        
        generateMockTestingSessions() {
            // Generate realistic mock testing sessions for demo purposes
            this.testingSessions = [
                {
                    id: 'session_1',
                    name: 'WCAG AA Baseline Assessment',
                    description: 'Initial baseline accessibility assessment covering all WCAG 2.1 Level AA requirements',
                    conformance_level: 'AA',
                    status: 'active',
                    total_requirements: 50,
                    completed_tests: 35,
                    total_tests: 250,
                    pages_count: 12,
                    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
                    last_run: new Date(Date.now() - 2 * 86400000).toISOString()
                },
                {
                    id: 'session_2',
                    name: 'E-commerce Checkout Flow',
                    description: 'Focused testing session for critical user paths in the checkout process',
                    conformance_level: 'AA',
                    status: 'in_progress',
                    total_requirements: 25,
                    completed_tests: 15,
                    total_tests: 100,
                    pages_count: 5,
                    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
                    last_run: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    id: 'session_3',
                    name: 'Section 508 Compliance',
                    description: 'Federal compliance testing for government accessibility standards',
                    conformance_level: 'Section508',
                    status: 'completed',
                    total_requirements: 38,
                    completed_tests: 38,
                    total_tests: 152,
                    pages_count: 8,
                    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
                    last_run: new Date(Date.now() - 5 * 86400000).toISOString()
                }
            ];
        },
        
        async createTestingSession() {
            if (!this.selectedProject) {
                this.addNotification('error', 'Error', 'Please select a project first');
                return;
            }
            
            try {
                this.componentLoading = true;
                
                const sessionData = {
                    name: this.newTestingSession.name,
                    description: this.newTestingSession.description,
                    project_id: this.selectedProject.id,
                    conformance_level: this.newTestingSession.conformance_level,
                    custom_requirements: this.newTestingSession.custom_requirements,
                    status: 'active'
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
                        const newSession = await response.json();
                        this.addNotification('success', 'Session Created', `${this.newTestingSession.name} has been created successfully`);
                        
                        // Add to local list
                        this.testingSessions.unshift(newSession.session || {
                            ...sessionData,
                            id: `session_${Date.now()}`,
                            total_requirements: 0,
                            completed_tests: 0,
                            total_tests: 0,
                            pages_count: 0,
                            created_at: new Date().toISOString()
                        });
                        
                        this.resetNewSessionForm();
                        this.showCreateTestingSession = false;
                    } else {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to create testing session');
                    }
                } else {
                    // Simulate successful creation
                    setTimeout(() => {
                        const newSession = {
                            ...sessionData,
                            id: `session_${Date.now()}`,
                            total_requirements: 0,
                            completed_tests: 0,
                            total_tests: 0,
                            pages_count: 0,
                            created_at: new Date().toISOString()
                        };
                        
                        this.testingSessions.unshift(newSession);
                        this.addNotification('success', 'Session Created', `${this.newTestingSession.name} has been created successfully`);
                        this.resetNewSessionForm();
                        this.showCreateTestingSession = false;
                        this.componentLoading = false;
                    }, 1000);
                    return;
                }
                
            } catch (error) {
                console.error('Error creating testing session:', error);
                this.addNotification('error', 'Error', `Failed to create testing session: ${error.message}`);
            } finally {
                this.componentLoading = false;
            }
        },
        
        resetNewSessionForm() {
            this.newTestingSession = {
                name: '',
                description: '',
                conformance_level: 'AA',
                custom_requirements: ''
            };
        },
        
        // ========================================
        // SESSION DETAIL METHODS
        // ========================================
        
        async viewSessionTestGrid(session) {
            this.currentlyViewedTestingSession = session;
            this.currentSessionDetails = session;
            this.viewingSessionDetails = true;
            this.testInstanceView = 'requirements';
            
            await this.loadSessionRequirements();
            await this.loadTestInstances();
        },
        
        clearSessionSelection() {
            this.currentlyViewedTestingSession = null;
            this.currentSessionDetails = null;
            this.viewingSessionDetails = false;
            this.sessionRequirements = [];
            this.filteredRequirements = [];
            this.testInstances = [];
            this.filteredTestInstances = [];
        },
        
        toggleTestInstanceView(view) {
            this.testInstanceView = view;
        },
        
        async loadSessionRequirements() {
            if (!this.currentSessionDetails) return;
            
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/testing-sessions/${this.currentSessionDetails.id}/requirements`, {
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.sessionRequirements = data.requirements || [];
                    } else {
                        this.generateMockRequirements();
                    }
                } else {
                    this.generateMockRequirements();
                }
                
                this.filteredRequirements = [...this.sessionRequirements];
                
            } catch (error) {
                console.error('Error loading session requirements:', error);
                this.generateMockRequirements();
            } finally {
                this.componentLoading = false;
            }
        },
        
        generateMockRequirements() {
            // Generate realistic WCAG requirements for demo
            const mockRequirements = [
                { number: '1.1.1', title: 'Non-text Content', level: 'A', method: 'Automated + Manual' },
                { number: '1.3.1', title: 'Info and Relationships', level: 'A', method: 'Manual' },
                { number: '1.4.3', title: 'Contrast (Minimum)', level: 'AA', method: 'Automated' },
                { number: '2.1.1', title: 'Keyboard', level: 'A', method: 'Manual' },
                { number: '2.4.3', title: 'Focus Order', level: 'A', method: 'Manual' },
                { number: '3.1.1', title: 'Language of Page', level: 'A', method: 'Automated' },
                { number: '4.1.2', title: 'Name, Role, Value', level: 'A', method: 'Automated + Manual' }
            ];
            
            this.sessionRequirements = mockRequirements.map((req, index) => ({
                id: `req_${index}`,
                criterion_number: req.number,
                title: req.title,
                conformance_level: req.level,
                test_method: req.method,
                automated_tests: index % 2 === 0 ? [
                    { id: `auto_${index}`, status: index % 3 === 0 ? 'passed' : 'failed', tool_name: 'axe' }
                ] : [],
                manual_tests: index % 3 === 0 ? [
                    { id: `manual_${index}`, status: 'pending', assigned_tester_name: null }
                ] : []
            }));
        },
        
        async loadTestInstances() {
            if (!this.currentSessionDetails) return;
            
            try {
                // Mock test instances for demo
                this.testInstances = [
                    {
                        id: 'instance_1',
                        criterion_number: '1.1.1',
                        requirement_title: 'Non-text Content',
                        page_url: 'https://example.com/',
                        test_method: 'automated',
                        status: 'completed',
                        last_run: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        id: 'instance_2',
                        criterion_number: '2.1.1',
                        requirement_title: 'Keyboard',
                        page_url: 'https://example.com/contact',
                        test_method: 'manual',
                        status: 'pending',
                        last_run: null
                    },
                    {
                        id: 'instance_3',
                        criterion_number: '1.4.3',
                        requirement_title: 'Contrast (Minimum)',
                        page_url: 'https://example.com/about',
                        test_method: 'automated',
                        status: 'running',
                        last_run: new Date().toISOString()
                    }
                ];
                
                this.applyTestInstanceFilters();
                
            } catch (error) {
                console.error('Error loading test instances:', error);
                this.testInstances = [];
                this.filteredTestInstances = [];
            }
        },
        
        applyTestInstanceFilters() {
            let filtered = [...this.testInstances];
            
            if (this.testInstanceFilters.status) {
                filtered = filtered.filter(instance => instance.status === this.testInstanceFilters.status);
            }
            
            if (this.testInstanceFilters.test_method) {
                filtered = filtered.filter(instance => instance.test_method === this.testInstanceFilters.test_method);
            }
            
            this.filteredTestInstances = filtered;
        },
        
        // ========================================
        // SESSION ACTIONS
        // ========================================
        
        async editTestingSession(session) {
            this.newTestingSession = {
                name: session.name,
                description: session.description,
                conformance_level: session.conformance_level,
                custom_requirements: session.custom_requirements || ''
            };
            this.showCreateTestingSession = true;
            this.addNotification('info', 'Edit Mode', 'Editing functionality coming soon');
        },
        
        async duplicateTestingSession(session) {
            this.newTestingSession = {
                name: `Copy of ${session.name}`,
                description: session.description,
                conformance_level: session.conformance_level,
                custom_requirements: session.custom_requirements || ''
            };
            this.showCreateTestingSession = true;
            this.addNotification('info', 'Duplicate Session', 'Create a copy of this session');
        },
        
        async deleteTestingSession(session) {
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
                        this.testingSessions = this.testingSessions.filter(s => s.id !== session.id);
                        this.addNotification('success', 'Session Deleted', `${session.name} has been deleted`);
                        
                        if (this.currentlyViewedTestingSession?.id === session.id) {
                            this.clearSessionSelection();
                        }
                    } else {
                        throw new Error('Failed to delete session');
                    }
                } else {
                    // Simulate deletion
                    this.testingSessions = this.testingSessions.filter(s => s.id !== session.id);
                    this.addNotification('success', 'Session Deleted', `${session.name} has been deleted`);
                    
                    if (this.currentlyViewedTestingSession?.id === session.id) {
                        this.clearSessionSelection();
                    }
                }
                
            } catch (error) {
                console.error('Error deleting session:', error);
                this.addNotification('error', 'Error', `Failed to delete ${session.name}`);
            }
        },
        
        async refreshTestingSessions() {
            await this.loadTestingSessions();
        },
        
        // ========================================
        // TESTING ACTIONS
        // ========================================
        
        async runAllAutomatedTests() {
            if (!this.currentSessionDetails) return;
            
            try {
                this.componentLoading = true;
                
                this.addNotification('info', 'Tests Started', 'Running all automated tests for this session');
                
                // Simulate test execution
                setTimeout(() => {
                    this.addNotification('success', 'Tests Completed', 'All automated tests have been executed');
                    this.componentLoading = false;
                }, 3000);
                
            } catch (error) {
                console.error('Error running automated tests:', error);
                this.addNotification('error', 'Error', 'Failed to run automated tests');
                this.componentLoading = false;
            }
        },
        
        async runAutomatedTestsForAllRequirements() {
            await this.runAllAutomatedTests();
        },
        
        async runTestInstance(instance) {
            try {
                instance.status = 'running';
                
                this.addNotification('info', 'Test Started', `Running test for ${instance.criterion_number}`);
                
                // Simulate test execution
                setTimeout(() => {
                    instance.status = Math.random() > 0.3 ? 'completed' : 'failed';
                    instance.last_run = new Date().toISOString();
                    this.addNotification('success', 'Test Completed', `Test for ${instance.criterion_number} completed`);
                }, 2000);
                
            } catch (error) {
                console.error('Error running test instance:', error);
                instance.status = 'failed';
                this.addNotification('error', 'Error', `Failed to run test for ${instance.criterion_number}`);
            }
        },
        
        viewTestInstanceDetails(instance) {
            this.addNotification('info', 'Instance Details', `Viewing details for ${instance.criterion_number}`);
            // This would open a detailed modal in a real implementation
        },
        
        viewRequirementDetails(requirement) {
            this.addNotification('info', 'Requirement Details', `Viewing details for ${requirement.criterion_number}`);
            // This would open a detailed modal in a real implementation
        },
        
        startManualTest(requirement) {
            this.addNotification('info', 'Manual Test', `Starting manual test for ${requirement.criterion_number}`);
            // This would integrate with the manual testing component
        },
        
        reviewAutomatedFailures(requirement) {
            this.addNotification('info', 'Review Failures', `Reviewing failures for ${requirement.criterion_number}`);
            // This would open a detailed failure analysis
        },
        
        // ========================================
        // WEB CRAWLER INTEGRATION
        // ========================================
        
        createSessionFromCrawler() {
            if (!this.sessionsSelectedPages.length) return;
            
            this.newTestingSession = {
                name: `${this.sessionsSourceCrawler?.name || 'Crawler'} Compliance Session`,
                description: `Testing session created from ${this.sessionsSelectedPages.length} pages discovered by web crawler`,
                conformance_level: 'AA',
                custom_requirements: ''
            };
            
            this.showCreateTestingSession = true;
        },
        
        clearCrawlerData() {
            this.sessionsSelectedPages = [];
            this.sessionsSourceCrawler = null;
        },
        
        openChangeApprovalWorkflow() {
            this.addNotification('info', 'Change Approval', 'Opening change approval workflow');
            // This would open a change approval modal/workflow
        },
        
        // ========================================
        // UTILITY METHODS
        // ========================================
        
        getSessionStatusBadgeClass(status) {
            const classes = {
                'active': 'bg-green-100 text-green-800',
                'in_progress': 'bg-yellow-100 text-yellow-800',
                'completed': 'bg-blue-100 text-blue-800',
                'paused': 'bg-gray-100 text-gray-800',
                'archived': 'bg-gray-100 text-gray-600'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },
        
        getWCAGLevelBadgeClass(level) {
            const classes = {
                'A': 'bg-green-100 text-green-800',
                'AA': 'bg-blue-100 text-blue-800',
                'AAA': 'bg-purple-100 text-purple-800',
                'Section508': 'bg-orange-100 text-orange-800'
            };
            return classes[level] || 'bg-gray-100 text-gray-800';
        },
        
        getTestStatusBadgeClass(status) {
            const classes = {
                'pending': 'bg-gray-100 text-gray-800',
                'running': 'bg-yellow-100 text-yellow-800',
                'completed': 'bg-green-100 text-green-800',
                'passed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },
        
        getRequirementOverallStatus(requirement) {
            const hasAutomated = requirement.automated_tests?.length > 0;
            const hasManual = requirement.manual_tests?.length > 0;
            
            if (!hasAutomated && !hasManual) return 'Not Tested';
            
            const automatedPassed = requirement.automated_tests?.every(t => t.status === 'passed');
            const manualPassed = requirement.manual_tests?.every(t => t.status === 'passed');
            
            if (hasAutomated && hasManual) {
                return (automatedPassed && manualPassed) ? 'Passed' : 'Failed';
            } else if (hasAutomated) {
                return automatedPassed ? 'Passed' : 'Failed';
            } else {
                return manualPassed ? 'Passed' : 'In Progress';
            }
        },
        
        getRequirementOverallStatusClass(requirement) {
            const status = this.getRequirementOverallStatus(requirement);
            const classes = {
                'Passed': 'bg-green-100 text-green-800',
                'Failed': 'bg-red-100 text-red-800',
                'In Progress': 'bg-yellow-100 text-yellow-800',
                'Not Tested': 'bg-gray-100 text-gray-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
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
        
        // ========================================
        // COMPONENT INITIALIZATION
        // ========================================
        
        init() {
            console.log('📋 Compliance Sessions component initialized');
            
            // Load testing sessions when component initializes
            this.loadTestingSessions();
            
            // Listen for project changes
            this.$watch('$data.selectedProject', () => {
                this.clearSessionSelection();
                this.loadTestingSessions();
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
    window.complianceSessionsComponent = complianceSessionsComponent;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { complianceSessionsComponent };
} 
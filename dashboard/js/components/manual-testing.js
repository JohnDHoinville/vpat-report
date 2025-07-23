// Manual Testing Component JavaScript
// Accessibility Testing Platform - Modular Dashboard

/**
 * Manual Testing Component for Alpine.js
 * Extracted from dashboard_helpers.js for modular architecture
 * Features: Coverage analysis, smart filtering, manual test assignments, WCAG compliance
 */
function manualTestingComponent() {
    return {
        // ========================================
        // COMPONENT STATE
        // ========================================
        
        // Coverage Analysis
        showCoverageAnalysis: false,
        manualTestingCoverageAnalysis: null,
        
        // Manual Testing Session
        manualTestingSession: null,
        manualTestingAssignments: [],
        filteredManualTestingAssignments: [],
        
        // Filters
        manualTestingFilters: {
            coverage_type: 'smart',
            status: '',
            wcag_level: '',
            tester: ''
        },
        
        // Modal State
        showManualTestingModal: false,
        currentManualTest: null,
        manualTestingProcedure: null,
        manualTestingContext: null,
        
        // Test Result Form
        testResult: {
            status: '',
            notes: '',
            evidence: []
        },
        
        // Available Testers
        availableTesters: [
            { id: 'current_user', name: 'Me' },
            { id: 'team_lead', name: 'Team Lead' },
            { id: 'qa_specialist', name: 'QA Specialist' }
        ],
        
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
        // COMPUTED PROPERTIES
        // ========================================
        
        get groupedAssignments() {
            if (!this.filteredManualTestingAssignments.length) return [];
            
            const grouped = {};
            this.filteredManualTestingAssignments.forEach(assignment => {
                const pageId = assignment.page_id || 'unknown';
                if (!grouped[pageId]) {
                    grouped[pageId] = {
                        page_id: pageId,
                        page_url: assignment.page_url || 'Unknown URL',
                        page_type: assignment.page_type || 'Standard Page',
                        assignments: []
                    };
                }
                grouped[pageId].assignments.push(assignment);
            });
            
            return Object.values(grouped);
        },
        
        // ========================================
        // COVERAGE ANALYSIS METHODS
        // ========================================
        
        async toggleCoverageAnalysis() {
            this.showCoverageAnalysis = !this.showCoverageAnalysis;
            
            if (this.showCoverageAnalysis && !this.manualTestingCoverageAnalysis) {
                await this.loadCoverageAnalysis();
            }
        },
        
        async loadCoverageAnalysis() {
            if (!this.selectedProject) return;
            
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/projects/${this.selectedProject.id}/coverage-analysis`, {
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        this.manualTestingCoverageAnalysis = await response.json();
                    } else {
                        // Fallback mock data for demonstration
                        this.manualTestingCoverageAnalysis = {
                            efficiency_metrics: {
                                automation_efficiency: 78,
                                manual_efficiency: 45,
                                redundancy_rate: 23,
                                total_automated_tests: 45,
                                total_manual_tests: 28,
                                duplicate_tests: 12
                            },
                            recommendations: [
                                {
                                    title: "Reduce Test Redundancy",
                                    description: "Consider removing manual tests for criteria already covered by automation",
                                    priority: "medium"
                                },
                                {
                                    title: "Focus on Manual-Only Criteria",
                                    description: "Prioritize testing criteria that cannot be automated effectively",
                                    priority: "high"
                                }
                            ]
                        };
                    }
                }
                
            } catch (error) {
                console.error('Error loading coverage analysis:', error);
                this.addNotification('error', 'Error', 'Failed to load coverage analysis');
            } finally {
                this.componentLoading = false;
            }
        },
        
        // ========================================
        // SESSION MANAGEMENT METHODS
        // ========================================
        
        async loadTestSessions() {
            if (!this.selectedProject) {
                this.manualTestingSession = null;
                this.manualTestingAssignments = [];
                return;
            }
            
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await apiClient.getTestSessions(this.selectedProject.id);
                    this.$data.testSessions = response.data || [];
                } else if (this.$data.apiCall) {
                    const response = await this.$data.apiCall(`/testing-sessions?project_id=${this.selectedProject.id}`);
                    this.$data.testSessions = response.data || [];
                }
                
            } catch (error) {
                console.error('Failed to load test sessions:', error);
                this.addNotification('error', 'Error', 'Failed to load test sessions');
            } finally {
                this.componentLoading = false;
            }
        },
        
        async selectManualTestingSession(session) {
            this.manualTestingSession = session;
            await this.loadManualTestingAssignments();
        },
        
        clearManualTestingSession() {
            this.manualTestingSession = null;
            this.manualTestingAssignments = [];
            this.filteredManualTestingAssignments = [];
        },
        
        async loadManualTestingAssignments() {
            if (!this.manualTestingSession) return;
            
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/testing-sessions/${this.manualTestingSession.id}/manual-assignments?coverage_type=${this.manualTestingFilters.coverage_type}`, {
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.manualTestingAssignments = data.assignments || [];
                    } else {
                        // Fallback mock data
                        this.generateMockAssignments();
                    }
                } else {
                    // Fallback mock data
                    this.generateMockAssignments();
                }
                
                this.applyManualTestingFilters();
                
            } catch (error) {
                console.error('Error loading manual testing assignments:', error);
                this.addNotification('error', 'Error', 'Failed to load manual testing assignments');
                this.manualTestingAssignments = [];
            } finally {
                this.componentLoading = false;
            }
        },
        
        generateMockAssignments() {
            // Generate realistic mock assignments for demo purposes
            const mockCriteria = [
                { number: '1.1.1', title: 'Non-text Content', level: 'A', method: 'Manual inspection' },
                { number: '1.3.1', title: 'Info and Relationships', level: 'A', method: 'Screen reader testing' },
                { number: '2.1.1', title: 'Keyboard', level: 'A', method: 'Keyboard navigation' },
                { number: '2.4.3', title: 'Focus Order', level: 'A', method: 'Tab order verification' },
                { number: '3.1.1', title: 'Language of Page', level: 'A', method: 'Document inspection' },
                { number: '4.1.2', title: 'Name, Role, Value', level: 'A', method: 'Screen reader verification' }
            ];
            
            this.manualTestingAssignments = mockCriteria.map((criteria, index) => ({
                id: `assignment_${index}`,
                criterion_number: criteria.number,
                requirement_title: criteria.title,
                requirement_description: `Ensure ${criteria.title.toLowerCase()} meets WCAG requirements`,
                wcag_level: criteria.level,
                test_method: criteria.method,
                current_result: index % 3 === 0 ? 'pending' : index % 3 === 1 ? 'pass' : 'in_progress',
                page_id: index % 2 === 0 ? 'home' : 'about',
                page_url: index % 2 === 0 ? 'https://example.com/' : 'https://example.com/about',
                page_type: index % 2 === 0 ? 'Homepage' : 'Content Page',
                assigned_tester_name: index % 2 === 0 ? 'Current User' : null,
                tested_at: index > 2 ? new Date(Date.now() - index * 86400000).toISOString() : null,
                notes: index === 1 ? 'Previously tested and passed all requirements' : null
            }));
        },
        
        // ========================================
        // FILTERING METHODS
        // ========================================
        
        applyManualTestingFilters() {
            let filtered = [...this.manualTestingAssignments];
            
            // Status filter
            if (this.manualTestingFilters.status) {
                filtered = filtered.filter(assignment => 
                    assignment.current_result === this.manualTestingFilters.status
                );
            }
            
            // WCAG Level filter
            if (this.manualTestingFilters.wcag_level) {
                filtered = filtered.filter(assignment => 
                    assignment.wcag_level === this.manualTestingFilters.wcag_level
                );
            }
            
            // Tester filter
            if (this.manualTestingFilters.tester) {
                if (this.manualTestingFilters.tester === 'unassigned') {
                    filtered = filtered.filter(assignment => !assignment.assigned_tester_name);
                } else {
                    filtered = filtered.filter(assignment => 
                        assignment.assigned_tester_id === this.manualTestingFilters.tester
                    );
                }
            }
            
            this.filteredManualTestingAssignments = filtered;
        },
        
        // ========================================
        // MANUAL TEST EXECUTION METHODS
        // ========================================
        
        async startManualTest(assignment) {
            this.currentManualTest = { assignment };
            this.testResult = {
                status: assignment.current_result === 'pending' ? '' : assignment.current_result,
                notes: assignment.notes || '',
                evidence: []
            };
            
            // Load testing procedure
            await this.loadTestingProcedure(assignment);
            
            this.showManualTestingModal = true;
        },
        
        async loadTestingProcedure(assignment) {
            try {
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/wcag-procedures/${assignment.criterion_number}`, {
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.manualTestingProcedure = data.procedure;
                        this.manualTestingContext = data.context;
                    } else {
                        this.generateMockProcedure(assignment);
                    }
                } else {
                    this.generateMockProcedure(assignment);
                }
                
            } catch (error) {
                console.error('Error loading testing procedure:', error);
                this.generateMockProcedure(assignment);
            }
        },
        
        generateMockProcedure(assignment) {
            const procedures = {
                '1.1.1': {
                    title: 'Non-text Content',
                    description: 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose.',
                    steps: [
                        'Identify all images, graphics, and non-text content on the page',
                        'Check that each image has appropriate alt text',
                        'Verify that decorative images have empty alt attributes',
                        'Test with screen reader to ensure alt text is meaningful'
                    ],
                    understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'
                },
                '2.1.1': {
                    title: 'Keyboard',
                    description: 'All functionality of the content is operable through a keyboard interface.',
                    steps: [
                        'Navigate the page using only the keyboard (Tab, Shift+Tab, Enter, Space, Arrow keys)',
                        'Verify all interactive elements can be reached',
                        'Test that all functionality works with keyboard alone',
                        'Ensure no keyboard traps exist'
                    ],
                    understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html'
                }
            };
            
            this.manualTestingProcedure = procedures[assignment.criterion_number] || {
                title: assignment.requirement_title,
                description: assignment.requirement_description,
                steps: [
                    'Review the specific WCAG requirement',
                    'Identify relevant page elements',
                    'Test according to WCAG guidelines',
                    'Document findings and evidence'
                ],
                understanding_url: `https://www.w3.org/WAI/WCAG21/Understanding/`
            };
            
            this.manualTestingContext = {
                category: 'manual_standard',
                automated_coverage: 'Limited',
                recommended_tools: ['Manual inspection', 'Screen reader', 'Keyboard testing']
            };
        },
        
        async submitManualTestResult() {
            if (!this.testResult.status) {
                this.addNotification('error', 'Validation Error', 'Please select a test result');
                return;
            }
            
            try {
                this.componentLoading = true;
                
                const resultData = {
                    assignment_id: this.currentManualTest.assignment.id,
                    status: this.testResult.status,
                    notes: this.testResult.notes,
                    evidence: this.testResult.evidence,
                    tested_at: new Date().toISOString(),
                    tester_id: 'current_user'
                };
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/manual-test-results`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        },
                        body: JSON.stringify(resultData)
                    });
                    
                    if (response.ok) {
                        this.addNotification('success', 'Test Saved', 'Manual test result has been saved successfully');
                        
                        // Update local assignment
                        const assignment = this.manualTestingAssignments.find(a => a.id === this.currentManualTest.assignment.id);
                        if (assignment) {
                            assignment.current_result = this.testResult.status;
                            assignment.notes = this.testResult.notes;
                            assignment.tested_at = new Date().toISOString();
                            assignment.assigned_tester_name = 'Current User';
                        }
                        
                        this.applyManualTestingFilters();
                        this.closeManualTestingModal();
                    } else {
                        throw new Error('Failed to save test result');
                    }
                } else {
                    // Simulate successful save
                    setTimeout(() => {
                        this.addNotification('success', 'Test Saved', 'Manual test result has been saved successfully');
                        
                        // Update local assignment
                        const assignment = this.manualTestingAssignments.find(a => a.id === this.currentManualTest.assignment.id);
                        if (assignment) {
                            assignment.current_result = this.testResult.status;
                            assignment.notes = this.testResult.notes;
                            assignment.tested_at = new Date().toISOString();
                            assignment.assigned_tester_name = 'Current User';
                        }
                        
                        this.applyManualTestingFilters();
                        this.closeManualTestingModal();
                        this.componentLoading = false;
                    }, 1000);
                    return;
                }
                
            } catch (error) {
                console.error('Error saving test result:', error);
                this.addNotification('error', 'Error', 'Failed to save test result');
            } finally {
                this.componentLoading = false;
            }
        },
        
        closeManualTestingModal() {
            this.showManualTestingModal = false;
            this.currentManualTest = null;
            this.manualTestingProcedure = null;
            this.manualTestingContext = null;
            this.testResult = { status: '', notes: '', evidence: [] };
        },
        
        // ========================================
        // ASSIGNMENT MANAGEMENT METHODS
        // ========================================
        
        async assignToTester(assignment) {
            // Simple assignment to current user for now
            try {
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/manual-assignments/${assignment.id}/assign`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        },
                        body: JSON.stringify({
                            tester_id: 'current_user'
                        })
                    });
                    
                    if (response.ok) {
                        assignment.assigned_tester_name = 'Current User';
                        assignment.assigned_tester_id = 'current_user';
                        this.addNotification('success', 'Assigned', 'Assignment has been assigned to you');
                    }
                } else {
                    // Simulate assignment
                    assignment.assigned_tester_name = 'Current User';
                    assignment.assigned_tester_id = 'current_user';
                    this.addNotification('success', 'Assigned', 'Assignment has been assigned to you');
                }
                
            } catch (error) {
                console.error('Error assigning test:', error);
                this.addNotification('error', 'Error', 'Failed to assign test');
            }
        },
        
        async assignAllToMe() {
            const unassignedTests = this.filteredManualTestingAssignments.filter(a => !a.assigned_tester_name);
            
            try {
                for (const assignment of unassignedTests) {
                    assignment.assigned_tester_name = 'Current User';
                    assignment.assigned_tester_id = 'current_user';
                }
                
                this.addNotification('success', 'Bulk Assignment', `${unassignedTests.length} tests assigned to you`);
                
            } catch (error) {
                console.error('Error bulk assigning tests:', error);
                this.addNotification('error', 'Error', 'Failed to assign tests');
            }
        },
        
        // ========================================
        // FILE HANDLING METHODS
        // ========================================
        
        handleFileUpload(event) {
            const files = Array.from(event.target.files);
            
            files.forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.testResult.evidence.push({
                            name: file.name,
                            url: e.target.result,
                            type: file.type,
                            size: file.size
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
        },
        
        removeEvidence(index) {
            this.testResult.evidence.splice(index, 1);
        },
        
        // ========================================
        // UTILITY METHODS
        // ========================================
        
        getWCAGLevelBadgeClass(level) {
            const classes = {
                'A': 'bg-green-100 text-green-800',
                'AA': 'bg-blue-100 text-blue-800',
                'AAA': 'bg-purple-100 text-purple-800'
            };
            return classes[level] || 'bg-gray-100 text-gray-800';
        },
        
        getTestStatusBadgeClass(status) {
            const classes = {
                'pending': 'bg-gray-100 text-gray-800',
                'assigned': 'bg-blue-100 text-blue-800',
                'in_progress': 'bg-yellow-100 text-yellow-800',
                'pass': 'bg-green-100 text-green-800',
                'fail': 'bg-red-100 text-red-800',
                'not_applicable': 'bg-gray-100 text-gray-800',
                'needs_review': 'bg-orange-100 text-orange-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },
        
        getTestStatusDisplay(status) {
            const displays = {
                'pending': 'Pending',
                'assigned': 'Assigned',
                'in_progress': 'In Progress',
                'pass': 'Pass',
                'fail': 'Fail',
                'not_applicable': 'N/A',
                'needs_review': 'Needs Review'
            };
            return displays[status] || 'Unknown';
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
            console.log('👤 Manual Testing component initialized');
            
            // Load test sessions when component initializes
            this.loadTestSessions();
            
            // Listen for project changes
            this.$watch('$data.selectedProject', () => {
                this.clearManualTestingSession();
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
    window.manualTestingComponent = manualTestingComponent;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { manualTestingComponent };
} 
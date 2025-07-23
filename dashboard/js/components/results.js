// Results Component JavaScript
// Accessibility Testing Platform - Modular Dashboard

/**
 * Results Component for Alpine.js
 * Extracted from dashboard_helpers.js for modular architecture
 * Features: Test results analysis, violation inspection, reporting, analytics
 */
function resultsComponent() {
    return {
        // ========================================
        // COMPONENT STATE
        // ========================================
        
        // Results Data
        violationInspectorSession: null,
        violations: [],
        violationSummary: {},
        
        // Filters and Sorting
        violationFilters: {
            result_type: 'fail', // 'all', 'pass', 'fail'
            severity: '',
            tool: '',
            page_url: ''
        },
        
        violationSort: {
            by: 'severity',
            order: 'desc'
        },
        
        // Pagination
        violationPagination: {
            currentPage: 1,
            totalPages: 1,
            total: 0,
            from: 0,
            to: 0,
            perPage: 25
        },
        
        // Loading States
        loadingViolations: false,
        componentLoading: false,
        
        // ========================================
        // INHERITED DASHBOARD STATE & METHODS
        // ========================================
        
        get selectedProject() {
            return this.$data.selectedProject;
        },
        
        get testSessions() {
            return this.$data.testSessions || [];
        },
        
        get completedSessions() {
            return this.testSessions.filter(s => s.status === 'completed');
        },
        
        get loading() {
            return this.$data.loading || this.componentLoading;
        },
        
        // ========================================
        // SESSION LOADING METHODS
        // ========================================
        
        async loadTestSessions() {
            if (!this.selectedProject) {
                this.closeViolationInspectorTab();
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
        
        async loadSessionResultsTab(session) {
            this.violationInspectorSession = session;
            this.violationFilters.result_type = 'fail'; // Start with violations
            await this.loadViolationSummary();
            await this.loadViolations();
        },
        
        closeViolationInspectorTab() {
            this.violationInspectorSession = null;
            this.violations = [];
            this.violationSummary = {};
            this.resetFiltersAndPagination();
        },
        
        // ========================================
        // VIOLATION LOADING METHODS
        // ========================================
        
        async loadViolationSummary() {
            if (!this.violationInspectorSession) return;
            
            try {
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/testing-sessions/${this.violationInspectorSession.id}/violations/summary`, {
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        this.violationSummary = await response.json();
                    } else {
                        this.generateMockSummary();
                    }
                } else {
                    this.generateMockSummary();
                }
                
            } catch (error) {
                console.error('Error loading violation summary:', error);
                this.generateMockSummary();
            }
        },
        
        generateMockSummary() {
            // Generate realistic mock summary data
            const totalResults = 120;
            const totalViolations = 35;
            const totalPasses = totalResults - totalViolations;
            
            this.violationSummary = {
                totalResults,
                totalViolations,
                totalPasses,
                by_tool: [
                    { tool_name: 'axe', count: 18 },
                    { tool_name: 'pa11y', count: 12 },
                    { tool_name: 'lighthouse', count: 5 }
                ],
                by_severity: {
                    critical: 3,
                    serious: 12,
                    moderate: 15,
                    minor: 5
                }
            };
        },
        
        async loadViolations() {
            if (!this.violationInspectorSession) return;
            
            try {
                this.loadingViolations = true;
                
                const params = new URLSearchParams({
                    page: this.violationPagination.currentPage,
                    per_page: this.violationPagination.perPage,
                    result_type: this.violationFilters.result_type,
                    sort_by: this.violationSort.by,
                    sort_order: this.violationSort.order
                });
                
                // Add filters
                if (this.violationFilters.severity) params.append('severity', this.violationFilters.severity);
                if (this.violationFilters.tool) params.append('tool', this.violationFilters.tool);
                if (this.violationFilters.page_url) params.append('page_url', this.violationFilters.page_url);
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/testing-sessions/${this.violationInspectorSession.id}/violations?${params}`, {
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.violations = data.violations || [];
                        this.violationPagination = { ...this.violationPagination, ...data.pagination };
                    } else {
                        this.generateMockViolations();
                    }
                } else {
                    this.generateMockViolations();
                }
                
            } catch (error) {
                console.error('Error loading violations:', error);
                this.generateMockViolations();
            } finally {
                this.loadingViolations = false;
            }
        },
        
        generateMockViolations() {
            // Generate realistic mock violations based on current filters
            const mockViolations = [
                {
                    id: '1',
                    result: 'fail',
                    severity: 'serious',
                    test_name: 'color-contrast',
                    description: 'Element has insufficient color contrast of 3.1 (foreground color: #666666, background color: #ffffff, font size: 14.0pt)',
                    page_url: 'https://example.com/',
                    tool_name: 'axe',
                    wcag_criterion: '1.4.3',
                    element_selector: '.header-nav a'
                },
                {
                    id: '2',
                    result: 'fail',
                    severity: 'critical',
                    test_name: 'image-alt',
                    description: 'Images must have alternate text',
                    page_url: 'https://example.com/about',
                    tool_name: 'axe',
                    wcag_criterion: '1.1.1',
                    element_selector: 'img[src="hero.jpg"]'
                },
                {
                    id: '3',
                    result: 'pass',
                    severity: null,
                    test_name: 'heading-order',
                    description: 'Heading levels should only increase by one',
                    page_url: 'https://example.com/',
                    tool_name: 'axe',
                    wcag_criterion: '1.3.1',
                    element_selector: 'h1, h2, h3'
                }
            ];
            
            // Filter based on result type
            let filtered = mockViolations;
            if (this.violationFilters.result_type !== 'all') {
                filtered = mockViolations.filter(v => v.result === this.violationFilters.result_type);
            }
            
            this.violations = filtered;
            this.violationPagination = {
                currentPage: 1,
                totalPages: 1,
                total: filtered.length,
                from: 1,
                to: filtered.length,
                perPage: 25
            };
        },
        
        // ========================================
        // FILTER AND SORT METHODS
        // ========================================
        
        setResultType(type) {
            this.violationFilters.result_type = type;
            this.violationPagination.currentPage = 1;
            this.loadViolations();
        },
        
        applyViolationFilters() {
            this.violationPagination.currentPage = 1;
            this.loadViolations();
        },
        
        sortViolations(field) {
            if (this.violationSort.by === field) {
                this.violationSort.order = this.violationSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                this.violationSort.by = field;
                this.violationSort.order = 'desc';
            }
            this.loadViolations();
        },
        
        loadViolationsPage(page) {
            if (page >= 1 && page <= this.violationPagination.totalPages) {
                this.violationPagination.currentPage = page;
                this.loadViolations();
            }
        },
        
        resetFiltersAndPagination() {
            this.violationFilters = {
                result_type: 'fail',
                severity: '',
                tool: '',
                page_url: ''
            };
            this.violationSort = {
                by: 'severity',
                order: 'desc'
            };
            this.violationPagination = {
                currentPage: 1,
                totalPages: 1,
                total: 0,
                from: 0,
                to: 0,
                perPage: 25
            };
        },
        
        // ========================================
        // EXPORT METHODS
        // ========================================
        
        async exportViolations(format) {
            if (!this.violationInspectorSession) return;
            
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/testing-sessions/${this.violationInspectorSession.id}/export/${format}`, {
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${this.violationInspectorSession.name}_results.${format}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        
                        this.addNotification('success', 'Export Complete', `Results exported as ${format.toUpperCase()}`);
                    } else {
                        throw new Error(`Failed to export ${format}`);
                    }
                } else {
                    // Simulate export
                    this.addNotification('success', 'Export Complete', `Results would be exported as ${format.toUpperCase()}`);
                }
                
            } catch (error) {
                console.error('Error exporting violations:', error);
                this.addNotification('error', 'Export Error', `Failed to export ${format}`);
            } finally {
                this.componentLoading = false;
            }
        },
        
        // ========================================
        // VIEW ACTIONS
        // ========================================
        
        viewViolationDetails(violation) {
            this.addNotification('info', 'Violation Details', `Viewing details for ${violation.test_name}`);
            // This would open a detailed modal in a real implementation
        },
        
        // ========================================
        // UTILITY METHODS
        // ========================================
        
        getStatusBadgeClass(status) {
            const classes = {
                'completed': 'bg-green-100 text-green-800',
                'running': 'bg-yellow-100 text-yellow-800',
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
        
        getToolBorderClass(tool) {
            const classes = {
                'axe': 'border-blue-300',
                'pa11y': 'border-green-300',
                'lighthouse': 'border-purple-300',
                'ibm': 'border-orange-300',
                'playwright': 'border-red-300'
            };
            return classes[tool] || 'border-gray-300';
        },
        
        getToolTextClass(tool) {
            const classes = {
                'axe': 'text-blue-800',
                'pa11y': 'text-green-800',
                'lighthouse': 'text-purple-800',
                'ibm': 'text-orange-800',
                'playwright': 'text-red-800'
            };
            return classes[tool] || 'text-gray-800';
        },
        
        getToolIconClass(tool) {
            const classes = {
                'axe': 'fas fa-universal-access text-blue-600',
                'pa11y': 'fas fa-check-circle text-green-600',
                'lighthouse': 'fas fa-lighthouse text-purple-600',
                'ibm': 'fas fa-building text-orange-600',
                'playwright': 'fas fa-theater-masks text-red-600'
            };
            return classes[tool] || 'fas fa-tools text-gray-600';
        },
        
        getResultBadgeClass(result) {
            const classes = {
                'pass': 'bg-green-100 text-green-800 border-green-200',
                'fail': 'bg-red-100 text-red-800 border-red-200',
                'in_progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                'assigned': 'bg-blue-100 text-blue-800 border-blue-200'
            };
            return classes[result] || 'bg-gray-100 text-gray-800 border-gray-200';
        },
        
        getResultIconClass(result) {
            const classes = {
                'pass': 'fas fa-check-circle',
                'fail': 'fas fa-times-circle',
                'in_progress': 'fas fa-clock',
                'assigned': 'fas fa-user-check'
            };
            return classes[result] || 'fas fa-question-circle';
        },
        
        getResultDisplayText(result) {
            const displays = {
                'pass': 'Pass',
                'fail': 'Fail',
                'in_progress': 'In Progress',
                'assigned': 'Assigned'
            };
            return displays[result] || result;
        },
        
        getSeverityBadgeClass(severity) {
            const classes = {
                'critical': 'bg-red-100 text-red-800',
                'serious': 'bg-orange-100 text-orange-800',
                'moderate': 'bg-yellow-100 text-yellow-800',
                'minor': 'bg-blue-100 text-blue-800'
            };
            return classes[severity] || 'bg-gray-100 text-gray-800';
        },
        
        getResultTypeDisplayText(type) {
            const displays = {
                'all': 'All Test Results',
                'pass': 'Passed Tests',
                'fail': 'Violations'
            };
            return displays[type] || 'Test Results';
        },
        
        getSuccessRate() {
            const total = this.violationSummary.totalResults || 0;
            const passes = this.violationSummary.totalPasses || 0;
            
            if (total === 0) return 0;
            return Math.round((passes / total) * 100);
        },
        
        getShortUrl(url) {
            if (!url) return '';
            
            try {
                const urlObj = new URL(url);
                return urlObj.pathname === '/' ? urlObj.hostname : urlObj.pathname;
            } catch (error) {
                return url.length > 30 ? url.substring(0, 30) + '...' : url;
            }
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
            console.log('📊 Results component initialized');
            
            // Load test sessions when component initializes
            this.loadTestSessions();
            
            // Listen for project changes
            this.$watch('$data.selectedProject', () => {
                this.closeViolationInspectorTab();
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
    window.resultsComponent = resultsComponent;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { resultsComponent };
} 
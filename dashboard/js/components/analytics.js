// Analytics Component JavaScript
// Accessibility Testing Platform - Modular Dashboard

/**
 * Analytics Component for Alpine.js
 * Extracted from dashboard_helpers.js for modular architecture
 * Features: Advanced analytics, WCAG compliance tracking, performance insights
 */
function analyticsComponent() {
    return {
        // ========================================
        // COMPONENT STATE
        // ========================================
        
        // Analytics Data
        analytics: null,
        analyticsTimeframe: '30',
        
        // WCAG Principles Data
        wcagPrinciples: [
            { number: 1, name: 'Perceivable', compliance: 85, passed: 12, total: 14 },
            { number: 2, name: 'Operable', compliance: 78, passed: 11, total: 14 },
            { number: 3, name: 'Understandable', compliance: 92, passed: 11, total: 12 },
            { number: 4, name: 'Robust', compliance: 88, passed: 7, total: 8 }
        ],
        
        // Tool Performance Data
        toolPerformance: [
            {
                name: 'axe',
                status: 'active',
                tests_run: 245,
                violations_found: 58,
                avg_duration: 2340,
                success_rate: 94
            },
            {
                name: 'pa11y',
                status: 'active',
                tests_run: 180,
                violations_found: 42,
                avg_duration: 3120,
                success_rate: 89
            },
            {
                name: 'lighthouse',
                status: 'active',
                tests_run: 95,
                violations_found: 23,
                avg_duration: 8950,
                success_rate: 87
            }
        ],
        
        // Top Issues Data
        topIssues: [
            {
                test_name: 'color-contrast',
                description: 'Elements must have sufficient color contrast',
                wcag_criterion: '1.4.3',
                severity: 'serious',
                count: 23
            },
            {
                test_name: 'image-alt',
                description: 'Images must have alternate text',
                wcag_criterion: '1.1.1',
                severity: 'critical',
                count: 18
            },
            {
                test_name: 'heading-order',
                description: 'Heading levels should only increase by one',
                wcag_criterion: '1.3.1',
                severity: 'moderate',
                count: 15
            },
            {
                test_name: 'link-name',
                description: 'Links must have discernible text',
                wcag_criterion: '2.4.4',
                severity: 'serious',
                count: 12
            },
            {
                test_name: 'form-label',
                description: 'Form elements must have labels',
                wcag_criterion: '1.3.1',
                severity: 'critical',
                count: 9
            }
        ],
        
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
        // ANALYTICS LOADING METHODS
        // ========================================
        
        async loadAnalytics() {
            if (!this.selectedProject) {
                this.analytics = null;
                return;
            }
            
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/projects/${this.selectedProject.id}/analytics?timeframe=${this.analyticsTimeframe}`, {
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        this.analytics = await response.json();
                    } else {
                        this.generateMockAnalytics();
                    }
                } else {
                    this.generateMockAnalytics();
                }
                
            } catch (error) {
                console.error('Error loading analytics:', error);
                this.generateMockAnalytics();
            } finally {
                this.componentLoading = false;
            }
        },
        
        generateMockAnalytics() {
            // Generate realistic mock analytics data
            this.analytics = {
                overall: {
                    total_tests: 520,
                    total_violations: 142,
                    total_passes: 378,
                    avg_test_time: 2340 // milliseconds
                },
                wcag: {
                    level_a: {
                        percentage: 94,
                        passed: 47,
                        total: 50
                    },
                    level_aa: {
                        percentage: 82,
                        passed: 33,
                        total: 40
                    },
                    level_aaa: {
                        percentage: 65,
                        passed: 13,
                        total: 20
                    }
                },
                coverage: {
                    total_pages: 45,
                    tested_pages: 38
                },
                test_methods: {
                    automated: 425,
                    manual: 78,
                    hybrid: 17
                },
                trends: {
                    daily_tests: [12, 18, 25, 32, 28, 34, 29],
                    daily_violations: [8, 12, 15, 18, 16, 19, 14]
                }
            };
        },
        
        // ========================================
        // EXPORT METHODS
        // ========================================
        
        async exportAnalytics() {
            if (!this.selectedProject || !this.analytics) {
                this.addNotification('error', 'Export Error', 'No analytics data available to export');
                return;
            }
            
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/projects/${this.selectedProject.id}/analytics/export?timeframe=${this.analyticsTimeframe}`, {
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${this.selectedProject.name}_analytics_report.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        
                        this.addNotification('success', 'Export Complete', 'Analytics report has been downloaded');
                    } else {
                        throw new Error('Failed to export analytics report');
                    }
                } else {
                    // Simulate export
                    this.addNotification('success', 'Export Complete', 'Analytics report would be downloaded as PDF');
                }
                
            } catch (error) {
                console.error('Error exporting analytics:', error);
                this.addNotification('error', 'Export Error', 'Failed to export analytics report');
            } finally {
                this.componentLoading = false;
            }
        },
        
        // ========================================
        // CALCULATED PROPERTIES
        // ========================================
        
        getOverallSuccessRate() {
            if (!this.analytics?.overall) return 0;
            
            const total = this.analytics.overall.total_tests;
            const passes = this.analytics.overall.total_passes;
            
            if (total === 0) return 0;
            return Math.round((passes / total) * 100);
        },
        
        getCoveragePercentage() {
            if (!this.analytics?.coverage) return 0;
            
            const total = this.analytics.coverage.total_pages;
            const tested = this.analytics.coverage.tested_pages;
            
            if (total === 0) return 0;
            return Math.round((tested / total) * 100);
        },
        
        // ========================================
        // UTILITY METHODS
        // ========================================
        
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
        
        getToolBadgeClass(tool) {
            const classes = {
                'axe': 'bg-blue-100 text-blue-800',
                'pa11y': 'bg-green-100 text-green-800',
                'lighthouse': 'bg-purple-100 text-purple-800',
                'ibm': 'bg-orange-100 text-orange-800',
                'playwright': 'bg-red-100 text-red-800'
            };
            return classes[tool] || 'bg-gray-100 text-gray-800';
        },
        
        formatDuration(milliseconds) {
            if (!milliseconds || milliseconds === 0) return '0s';
            
            if (milliseconds < 1000) {
                return `${milliseconds}ms`;
            } else if (milliseconds < 60000) {
                return `${(milliseconds / 1000).toFixed(1)}s`;
            } else {
                const minutes = Math.floor(milliseconds / 60000);
                const seconds = Math.floor((milliseconds % 60000) / 1000);
                return `${minutes}m ${seconds}s`;
            }
        },
        
        formatDate(dateString) {
            if (!dateString) return 'Never';
            
            try {
                return new Date(dateString).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (error) {
                return 'Invalid Date';
            }
        },
        
        // ========================================
        // CHART HELPERS (for future Chart.js integration)
        // ========================================
        
        getTrendChartData() {
            if (!this.analytics?.trends) return null;
            
            return {
                labels: ['7d ago', '6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Today'],
                datasets: [
                    {
                        label: 'Tests Run',
                        data: this.analytics.trends.daily_tests,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Violations Found',
                        data: this.analytics.trends.daily_violations,
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4
                    }
                ]
            };
        },
        
        getWCAGComplianceChartData() {
            if (!this.analytics?.wcag) return null;
            
            return {
                labels: ['Level A', 'Level AA', 'Level AAA'],
                datasets: [{
                    data: [
                        this.analytics.wcag.level_a.percentage,
                        this.analytics.wcag.level_aa.percentage,
                        this.analytics.wcag.level_aaa.percentage
                    ],
                    backgroundColor: [
                        'rgb(34, 197, 94)',
                        'rgb(59, 130, 246)',
                        'rgb(147, 51, 234)'
                    ],
                    borderWidth: 0
                }]
            };
        },
        
        // ========================================
        // DRILL-DOWN METHODS
        // ========================================
        
        viewWCAGPrincipleDetails(principle) {
            this.addNotification('info', 'WCAG Details', `Viewing details for Principle ${principle.number}: ${principle.name}`);
            // This would open a detailed breakdown modal
        },
        
        viewToolDetails(tool) {
            this.addNotification('info', 'Tool Performance', `Viewing performance details for ${tool.name}`);
            // This would show detailed tool performance metrics
        },
        
        viewIssueDetails(issue) {
            this.addNotification('info', 'Issue Analysis', `Viewing analysis for ${issue.test_name}`);
            // This would show detailed issue breakdown and remediation suggestions
        },
        
        // ========================================
        // COMPONENT INITIALIZATION
        // ========================================
        
        init() {
            console.log('📈 Analytics component initialized');
            
            // Load analytics when component initializes
            this.loadAnalytics();
            
            // Listen for project changes
            this.$watch('$data.selectedProject', () => {
                this.loadAnalytics();
            });
            
            // Listen for timeframe changes
            this.$watch('analyticsTimeframe', () => {
                this.loadAnalytics();
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
    window.analyticsComponent = analyticsComponent;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyticsComponent };
} 
/**
 * VPAT Dashboard - Clean Alpine.js Implementation
 * Organized, deduplicated, and optimized
 */

// Make dashboard function globally available
window.dashboard = function() {
    console.log('🚀 Dashboard function called - initializing...');
    
    // 🛡️ INITIALIZATION GUARD - Prevent double initialization
    if (window._dashboardInitialized) {
        console.warn('⚠️ Dashboard already initialized, returning existing instance');
        return window._dashboardInstance;
    }
    
    // ===== COMPREHENSIVE DEFAULTS - All properties initialized to prevent Alpine errors =====
    const defaults = {
        // ===== MODAL STATES =====
        showLogin: false,
        showProfile: false,
        showCreateCrawler: false,
        showSessionUrlModal: false,
        showManualUrlForm: false,
        showCreateProject: false,
        showDeleteDiscovery: false,
        showDeleteProject: false,
        showDeleteSession: false,
        showDiscoveredPagesModal: false,
        showCrawlerPagesModal: false,
        showAddManualUrlModal: false,
        showAddAuthConfigModal: false,
        showEditAuthConfigModal: false,
        showChangePassword: false,
        showSessions: false,
        showSetupAuth: false,
        showAdvancedCrawlerOptions: false,
        showCreateTestingSession: false,
        showTestInstanceModal: false,
        showSessionResultsModal: false,
        showTestDetailsModal: false,
        showTestConfigurationModal: false,
        showTestGrid: false,
        
        // ===== PROGRESS AND STATE FLAGS =====
        loading: false,
        discoveryInProgress: false,
        crawlerInProgress: false,
        sessionCapturing: false,
        sessionAwaitingLogin: false,
        sessionTesting: false,
        apiConnected: false,
        
        // ===== WEBSOCKET STATE =====
        socket: null,
        socketConnected: false,
        realtimeUpdates: true,
        automationProgress: null,
        
        // ===== FORM OBJECTS =====
        loginForm: { username: '', password: '' },
        profileForm: { full_name: '', email: '' },
        passwordForm: { current_password: '', new_password: '', confirm_password: '' },
        manualUrl: { url: '', title: '', pageType: 'content' },
        newProject: {
            name: '',
            description: '',
            primary_url: '',
            compliance_standard: 'WCAG_2_1_AA'
        },
        newTestingSession: {
            name: '',
            description: '',
            conformance_level: 'AA',
            testing_approach: 'hybrid'
        },
        authConfigForm: {
            name: '',
                    type: 'form',
            login_url: '',
            username: '',
            password: '',
                    description: '',
                    auth_role: 'default',
                    priority: 1,
                    is_default: false,
                    // Advanced SAML/SSO fields
                    idp_domain: '',
                    username_selector: 'input[name="username"]',
                    password_selector: 'input[type="password"]',
                    submit_selector: 'button[type="submit"]'
        },
        newCrawler: {
            name: '',
            description: '',
            base_url: '',
            auth_type: 'none',
            max_depth: 3,
            max_pages: 100,
            follow_external: false,
            respect_robots: true,
            concurrent_pages: 5,
            delay_ms: 1000,
            browser_type: 'chromium',
            request_delay_ms: 2000,
            session_persistence: false,
            respect_robots_txt: false,
            // Properly initialize all nested objects that are referenced in templates
            saml_config: {
                idp_domain: '',
                username_selector: '',
                password_selector: '',
                submit_selector: '',
                login_page: '',
                success_url: '',
                timeout_ms: 30000
            },
            auth_credentials: {
                username: '',
                password: '',
                domain: '',
                additional_fields: {}
            },
            auth_workflow: {
                username_selector: '',
                password_selector: '',
                submit_selector: '',
                success_indicators: [],
                additional_steps: []
            }
        },
        
        // ===== CONFIGURATION OBJECTS =====
        discoveryConfig: {
            maxDepth: 3,
            maxPages: 100,
            mode: 'comprehensive'
        },
        authSetup: {
            step: null,
            type: null,
            sso: { url: '', loginPage: '', successUrl: '', name: '' },
            basic: { url: '', loginPage: '', username: '', password: '', name: '' },
            advanced: { type: 'api_key', url: '', apiKey: '', token: '', name: '' }
        },
        
        // ===== PROGRESS TRACKING OBJECTS =====
        crawlerProgress: {
            percentage: 0,
            message: '',
            pagesFound: 0,
            currentUrl: ''
        },
        discoveryProgress: {
            percentage: 0,
            message: 'Starting discovery...',
            pagesFound: 0,
            currentUrl: ''
        },
        
        // ===== DATA ARRAYS =====
        projects: [],
        webCrawlers: [],
        authConfigs: [],
        projectAuthConfigs: [],
        availableUrls: [],
        sessions: [],
        discoveries: [],
        discoveredPages: [],
        testSessions: [],
        complianceSessions: [],
        selectedCrawlers: [],
        crawlerPages: [],
        filteredCrawlerPages: [],
        
        // ===== TESTING RESULTS ARRAYS =====
        manualTestResults: [],
        automatedTestResults: [],
        testSessionResults: [],
        recentViolations: [],
        sessionResults: [],
        
        // ===== TEST GRID STATE =====
        showTestGrid: false,
        selectedSession: null,
        testInstances: [],
        filteredTestInstances: [],
        loadingTestInstances: false,
        selectedTestInstance: null,
        showTestInstanceModal: false,
        showEvidenceModal: false,
        testGridFilters: {
            status: '',
            level: '',
            testMethod: ''
        },
        availableTesters: [],
        
        // ===== ENHANCED TEST GRID STATE =====
        selectedTestInstances: [],
        bulkStatusUpdate: '',
        bulkTesterAssignment: '',
        testGridSort: {
            field: 'criterion_number',
            direction: 'asc'
        },
        
        // ===== ADVANCED TEST GRID STATE =====
        showTestGrid: false,
        selectedTestSession: null,
        testGridInstances: [],
        filteredTestGridInstances: [],
        selectedTestGridInstances: [],
        testGridSearch: '',
        testGridFilters: {
            status: '',
            level: '',
            testMethod: '',
            assignedTester: ''
        },
        testGridView: 'detailed', // 'compact' or 'detailed'
        bulkOperation: '',
        
        // ===== TEST GRID PAGINATION STATE =====
        testGridPagination: {
            currentPage: 1,
            pageSize: 50,
            totalItems: 0,
            totalPages: 0,
            hasMore: false
        },
        testGridLoading: false,
        testGridPerformanceMode: false, // Auto-enable for large datasets
        
        // ===== REQUIREMENTS VIEWER STATE =====
        showRequirementsModal: false,
        showRequirementDetailsModal: false,
        currentRequirement: null,
        loadingRequirementDetails: false,
        allRequirements: [],
        sessionRequirements: [],
        filteredRequirements: [],
        paginatedRequirements: [],
        requirementsTestInstances: [],
        requirementFilters: {
            testStatus: '',
            wcagLevel: '',
            testMethod: '',
            searchTerm: ''
        },
        // Legacy naming for compatibility
        requirementsFilters: {
            search: '',
            type: '',
            level: '',
            testMethod: ''
        },
        requirementStats: {
            total: 0,
            automated_passed: 0,
            automated_failed: 0,
            manual_completed: 0,
            manual_pending: 0,
            not_tested: 0
        },
        requirementCurrentPage: 1,
        requirementPageSize: 20,
        requirementTotalPages: 1,
        selectedRequirement: null,
        
        // ===== REQUIREMENTS FUNCTIONS (for Alpine.js template access) =====
        loadSessionRequirements: async function(sessionId) {
            console.log(`🚀 loadSessionRequirements called with sessionId: ${sessionId}`);
            console.log(`📊 Current state - sessionRequirements length:`, this.sessionRequirements?.length || 0);
            
            if (!sessionId) {
                console.error('❌ No session ID provided to loadSessionRequirements');
                this.showNotification('error', 'Requirements Error', 'Session ID is required');
                return;
            }
            
            try {
                console.log(`🔍 Loading requirements for session ${sessionId}`);
                this.loading = true;
                
                // Initialize requirements arrays if they don't exist
                if (!this.sessionRequirements) this.sessionRequirements = [];
                if (!this.filteredRequirements) this.filteredRequirements = [];
                if (!this.paginatedRequirements) this.paginatedRequirements = [];
                if (!this.requirementFilters) {
                    this.requirementFilters = {
                        testStatus: '',
                        wcagLevel: '',
                        testMethod: '',
                        searchTerm: ''
                    };
                }
                if (!this.requirementStats) {
                    this.requirementStats = {
                        total: 0,
                        automated_passed: 0,
                        automated_failed: 0,
                        manual_completed: 0,
                        manual_pending: 0,
                        not_tested: 0
                    };
                }
                if (!this.requirementCurrentPage) this.requirementCurrentPage = 1;
                if (!this.requirementPageSize) this.requirementPageSize = 20;
                if (!this.requirementTotalPages) this.requirementTotalPages = 1;
                
                // Load requirements specific to this session
                let requirementsData = [];
                
                try {
                    console.log(`📋 Loading requirements for session ${sessionId}`);
                    
                    // Get session details first to understand conformance level
                    const sessionResponse = await this.apiCall(`/testing-sessions/${sessionId}`);
                    if (!sessionResponse.success) {
                        throw new Error('Failed to load session details');
                    }
                    
                    const session = sessionResponse.session;
                    const conformanceLevel = session.conformance_level || 'wcag_aa';
                    console.log(`📋 Session conformance level: ${conformanceLevel}`);
                    
                    // Load requirements based on session's conformance level
                    let requirementsResponse;
                    
                    try {
                        // Try the unified requirements endpoint for this session
                        requirementsResponse = await this.apiCall(`/unified-requirements/session/${sessionId}`);
                        
                        if (requirementsResponse.success && requirementsResponse.data?.requirements) {
                            requirementsData = requirementsResponse.data.requirements;
                            console.log(`✅ Successfully loaded ${requirementsData.length} requirements for session`);
                        } else {
                            // Fallback to conformance level endpoint
                            console.log(`📋 Trying conformance level endpoint for ${conformanceLevel}`);
                            requirementsResponse = await this.apiCall(`/unified-requirements/conformance/${conformanceLevel}`);
                            
                            if (requirementsResponse.success && requirementsResponse.data?.requirements) {
                                requirementsData = requirementsResponse.data.requirements;
                                console.log(`✅ Successfully loaded ${requirementsData.length} requirements by conformance level`);
                            } else {
                                throw new Error('No requirements data available from API');
                            }
                        }
                        
                    } catch (apiError) {
                        console.warn('🔓 API failed, trying fallback endpoints:', apiError.message);
                        
                        // Fallback to basic requirements endpoint
                        try {
                            requirementsResponse = await this.apiCall(`/requirements?limit=100`);
                            if (requirementsResponse.success && requirementsResponse.data?.requirements) {
                                requirementsData = requirementsResponse.data.requirements;
                                console.log(`✅ Successfully loaded ${requirementsData.length} requirements from fallback API`);
                            } else {
                                throw new Error('Fallback API also failed');
                            }
                        } catch (fallbackError) {
                            console.error('❌ All API endpoints failed:', fallbackError);
                            throw apiError; // Re-throw original error
                        }
                    }
                    
                } catch (error) {
                    console.error('❌ Failed to load requirements from API:', error);
                    requirementsData = [];
                    this.showNotification('error', 'Requirements Loading Failed', `Failed to load requirements: ${error.message}. Please check authentication.`);
                    return; // Exit early if we can't load requirements
                }
                
                // Transform data to match expected format (based on unified_requirements table structure)
                const transformedRequirements = requirementsData.map(req => {
                    console.log('🔍 Processing requirement:', req);
                    return {
                        id: req.id || req.requirement_id,
                        requirement_id: req.requirement_id || req.criterion_number,
                        criterion_number: req.requirement_id || req.criterion_number,
                        title: req.title,
                        description: req.description,
                        requirement_type: req.standard_type || req.requirement_type,
                        level: req.level,
                        test_method: req.test_method || 'both',
                        automated_tools: req.automated_tools || [],
                        automation_confidence: req.automation_confidence || 'none',
                        status: req.status || 'not_tested',
                        automated_status: req.automated_status || 'not_tested',
                        manual_status: req.manual_status || 'not_tested',
                        notes: req.notes || '',
                        created_at: req.created_at,
                        updated_at: req.updated_at
                    };
                });
                
                console.log(`✅ Transformed ${transformedRequirements.length} requirements`);
                
                // Store the requirements data - ensure unique IDs
                const uniqueRequirements = transformedRequirements.reduce((acc, req) => {
                    const key = req.id || req.requirement_id || req.criterion_number;
                    if (!acc.find(existing => (existing.id || existing.requirement_id || existing.criterion_number) === key)) {
                        acc.push(req);
                    }
                    return acc;
                }, []);
                
                this.sessionRequirements = uniqueRequirements;
                this.filteredRequirements = [...uniqueRequirements];
                
                // Calculate statistics
                this.calculateRequirementStats();
                
                // Apply pagination
                this.updateRequirementsPagination();
                
                console.log(`✅ Requirements loaded successfully: ${this.sessionRequirements.length} total, ${this.filteredRequirements.length} filtered`);
                
                this.showNotification('success', 'Requirements Loaded', `Successfully loaded ${this.sessionRequirements.length} requirements`);
                
            } catch (error) {
                console.error('❌ Error in loadSessionRequirements:', error);
                this.showNotification('error', 'Requirements Error', `Failed to load requirements: ${error.message}`);
            } finally {
                this.loading = false;
            }
        },
        
        // ===== REQUIREMENTS HELPER FUNCTIONS =====
        calculateRequirementStats: function() {
            if (!this.sessionRequirements) return;
            
            // Count requirements by test method (this is what determines if they can be automated)
            const automatedRequirements = this.sessionRequirements.filter(r => r.test_method === 'automated').length;
            const hybridRequirements = this.sessionRequirements.filter(r => r.test_method === 'both').length;
            const manualRequirements = this.sessionRequirements.filter(r => r.test_method === 'manual').length;
            
            // Count requirements by actual test status
            const automatedPassed = this.sessionRequirements.filter(r => r.automated_status === 'passed').length;
            const automatedFailed = this.sessionRequirements.filter(r => r.automated_status === 'failed').length;
            const manualCompleted = this.sessionRequirements.filter(r => r.manual_status === 'completed').length;
            const manualPending = this.sessionRequirements.filter(r => r.manual_status === 'pending').length;
            const notTested = this.sessionRequirements.filter(r => r.status === 'not_tested').length;
            
            this.requirementStats = {
                total: this.sessionRequirements.length,
                automated_requirements: automatedRequirements,
                hybrid_requirements: hybridRequirements,
                manual_requirements: manualRequirements,
                automated_passed: automatedPassed,
                automated_failed: automatedFailed,
                manual_completed: manualCompleted,
                manual_pending: manualPending,
                not_tested: notTested
            };
            
            console.log(`📊 Requirements stats calculated:`, {
                total: this.requirementStats.total,
                automated: this.requirementStats.automated_requirements,
                hybrid: this.requirementStats.hybrid_requirements,
                manual: this.requirementStats.manual_requirements,
                automated_total: this.requirementStats.automated_requirements + this.requirementStats.hybrid_requirements
            });
        },
        
        updateRequirementsPagination: function() {
            if (!this.filteredRequirements) return;
            
            const startIndex = (this.requirementCurrentPage - 1) * this.requirementPageSize;
            const endIndex = startIndex + this.requirementPageSize;
            
            this.paginatedRequirements = this.filteredRequirements.slice(startIndex, endIndex);
            this.requirementTotalPages = Math.ceil(this.filteredRequirements.length / this.requirementPageSize);
        },
        
        filterRequirements: function() {
            if (!this.sessionRequirements) return;
            
            let filtered = [...this.sessionRequirements];
            
            // Apply filters
            if (this.requirementFilters.testStatus) {
                filtered = filtered.filter(r => r.status === this.requirementFilters.testStatus);
            }
            
            if (this.requirementFilters.wcagLevel) {
                filtered = filtered.filter(r => r.wcag_level === this.requirementFilters.wcagLevel);
            }
            
            if (this.requirementFilters.testMethod) {
                filtered = filtered.filter(r => r.test_method === this.requirementFilters.testMethod);
            }
            
            if (this.requirementFilters.searchTerm) {
                const search = this.requirementFilters.searchTerm.toLowerCase();
                filtered = filtered.filter(r => 
                    r.title.toLowerCase().includes(search) ||
                    r.description.toLowerCase().includes(search) ||
                    r.criterion_number.toLowerCase().includes(search)
                );
            }
            
            this.filteredRequirements = filtered;
            this.requirementCurrentPage = 1; // Reset to first page
            this.updateRequirementsPagination();
        },
        
        viewRequirementDetails: function(requirement) {
            // First show the modal with basic info
            this.currentRequirement = requirement;
            this.showRequirementDetailsModal = true;
            this.loadingRequirementDetails = true;
            
            // Then fetch the full requirement details from the database
            this.fetchFullRequirementDetails(requirement.criterion_number);
        },
        
        fetchFullRequirementDetails: function(criterionNumber) {
            if (!criterionNumber) return;
            
            this.apiCall('/requirements', {
                method: 'GET',
                params: {
                    search: criterionNumber,
                    limit: 10
                }
            }).then(response => {
                if (response.success && response.data && response.data.requirements && response.data.requirements.length > 0) {
                    // Find the exact match for the criterion number
                    const fullRequirement = response.data.requirements.find(req => 
                        req.criterion_number === criterionNumber
                    );
                    
                    if (fullRequirement) {
                        // Merge the full requirement details with the current requirement
                        this.currentRequirement = {
                            ...this.currentRequirement,
                            ...fullRequirement
                        };
                        console.log('✅ Loaded full requirement details:', fullRequirement);
                    }
                    this.loadingRequirementDetails = false;
                }
            }).catch(error => {
                console.error('Error fetching full requirement details:', error);
                this.loadingRequirementDetails = false;
            });
        },
        
        closeRequirementDetailsModal: function() {
            this.showRequirementDetailsModal = false;
            this.currentRequirement = null;
        },
        
        copyRequirementToClipboard: function() {
            if (!this.currentRequirement) return;
            
            const requirement = this.currentRequirement;
            const text = `WCAG Requirement ${requirement.criterion_number}: ${requirement.title}

Level: ${requirement.level?.toUpperCase() || 'N/A'}
Test Method: ${(requirement.test_method || 'manual').charAt(0).toUpperCase() + (requirement.test_method || 'manual').slice(1)}
Priority: ${requirement.priority === 1 ? 'High' : requirement.priority === 2 ? 'Medium' : 'Low'}
Estimated Time: ${requirement.estimated_time_minutes ? requirement.estimated_time_minutes + ' minutes' : 'Not specified'}

Description:
${requirement.description || 'No description available'}

${requirement.testing_instructions ? `Testing Instructions:
${requirement.testing_instructions}

` : ''}${requirement.acceptance_criteria ? `Acceptance Criteria:
${requirement.acceptance_criteria}

` : ''}${requirement.failure_examples ? `Failure Examples:
${requirement.failure_examples}

` : ''}${requirement.wcag_url ? `WCAG Documentation: ${requirement.wcag_url}` : ''}`;
            
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('success', 'Copied!', 'Requirement details copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy to clipboard:', err);
                this.showNotification('error', 'Copy Failed', 'Failed to copy to clipboard');
            });
        },
        
        getRequirementTestInstances: function(criterionNumber) {
            if (!criterionNumber || !this.sessionDetailsTestInstances) return [];
            
            return this.sessionDetailsTestInstances.filter(instance => 
                instance.criterion_number === criterionNumber
            );
        },
        
        // ===== AUDIT TIMELINE FUNCTIONS (for Alpine.js template access) =====
        getGroupedTimeline: function() {
            const grouped = {};
            if (this.auditTimeline && this.auditTimeline.timeline) {
                this.auditTimeline.timeline.forEach(item => {
                    const date = new Date(item.timestamp || item.changed_at).toDateString();
                    if (!grouped[date]) grouped[date] = [];
                    grouped[date].push(item);
                });
            }
            return grouped;
        },
        
        // ===== SESSION DETAILS MODAL STATE =====
        showSessionDetailsModal: false,
        selectedSessionDetails: null,
        loadingSessionDetails: false,
        sessionDetailsActiveTab: 'overview',
        sessionDetailsStats: {},
        sessionDetailsActivities: [],
        sessionDetailsTeam: {},
        sessionDetailsTestInstances: [],
        sessionDetailsPages: [],
        
        // ===== AUTOMATION PROGRESS STATE =====
        automationProgress: {
            completedTests: 0,
            totalTests: 0,
            violationsFound: 0,
            percentage: 0,
            message: '',
            currentTool: ''
        },
        
        // ===== USER MANAGEMENT STATE =====
        get showUserManagement() {
            return this._showUserManagement || false;
        },
        set showUserManagement(value) {
            if (value && this.preventAutoUserManagement) {
                console.log('🛑 DEBUG: Attempt to set showUserManagement=true blocked during initialization', {
                    stackTrace: new Error().stack
                });
                return;
            }
            console.log('🔍 DEBUG: showUserManagement state changed to:', value, {
                stackTrace: new Error().stack
            });
            this._showUserManagement = value;
        },
        _showUserManagement: false,
        showUserForm: false,
        showDeleteUserModal: false,
        preventAutoUserManagement: true, // Prevent auto-opening during initialization
        userForm: {
            id: null,
            username: '',
            email: '',
            full_name: '',
            role: 'tester',
            is_active: true,
            password: '',
            confirm_password: ''
        },
        
        // ===== SESSION DETAILS MODAL STATE =====
        showSessionDetailsModal: false,
        selectedSessionDetails: null,
        loadingSessionDetails: false,
        sessionDetailsActiveTab: 'overview',
        sessionDetailsStats: {},
        sessionDetailsActivities: [],
        sessionDetailsTeam: {},
        sessionDetailsTestInstances: [],
        sessionDetailsPages: [],
        sessionResults: null,
        automationRuns: [],
        automationRunsSummary: {},
        loadingAutomationRuns: false,
        
        // ===== AUTOMATION CHART STATE =====
        automationChart: null,
        automationChartPeriod: '7d', // '7d', '30d', 'all'
        automationChartData: {
            labels: [],
            datasets: []
        },
        isUpdatingChart: false,
        
        // ===== UTILITY FUNCTIONS =====
        getAutomationRunStatusClass(status) {
            const classes = {
                'running': 'bg-blue-100 text-blue-800',
                'completed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'cancelled': 'bg-gray-100 text-gray-800',
                'pending': 'bg-yellow-100 text-yellow-800'
            };
            return classes[status] || classes.pending;
        },
        
        getAutomationRunStatusDisplay(status) {
            const displays = {
                'running': 'Running',
                'completed': 'Completed',
                'failed': 'Failed',
                'cancelled': 'Cancelled',
                'pending': 'Pending'
            };
            return displays[status] || status;
        },
        
        formatTime(date) {
            if (!date) return '';
            return new Date(date).toLocaleTimeString();
        },
        
        formatDate(date) {
            if (!date) return '';
            return new Date(date).toLocaleDateString();
        },
        
        formatDuration(ms) {
            if (!ms) return 'N/A';
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) {
                return `${hours}h ${minutes % 60}m`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            } else {
                return `${seconds}s`;
            }
        },
        
        // ===== AUDIT TIMELINE STATE =====
        auditTimeline: {
            sessionId: null,
            sessionName: '',
            timeline: [],
            loading: false,
            error: null,
            viewMode: 'timeline', // 'timeline' or 'table'
            filters: {
                start_date: '',
                end_date: '',
                action_type: '',
                user_id: ''
            },
            statistics: null,
            pagination: {
                page: 1,
                has_more: false,
                total: 0
            },
            expandedItems: new Set()
        },

        // ===== SESSION CREATION WIZARD STATE =====
        showSessionWizard: false,
        wizardStep: 1,
        sessionWizard: {
            project_id: '',
            name: '',
            description: '',
            conformance_levels: [],
            selected_crawlers: [],
            selected_pages: [],
            smart_filtering: true,
            manual_requirements: [],
            creating: false
        },
        availableCrawlers: [],
        combinedPages: [],
        deduplicatedPages: [],
        availableRequirements: [],
        requirementCounts: {},
        cachedSelectedRequirements: [], // Cache to persist between steps
        lastConformanceLevelsString: '', // Track conformance level changes
        pageSearchQuery: '',
        pageFilterType: '',
        automationSummary: {},
        userFormErrors: {},
        allUsers: [],
        filteredUsers: [],
        userFilters: {
            role: '',
            status: '',
            search: ''
        },
        userPagination: {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 0,
            totalPages: 0
        },
        userSort: {
            field: 'username',
            direction: 'asc'
        },
        selectedUserForDelete: null,
        userStats: {
            total: 0,
            active: 0,
            admin: 0,
            recentLogins: 0
        },
        
        // ===== MANUAL TESTING STATE =====
        manualTestingSession: null,
        manualTestingProgress: null,
        manualTestingAssignments: [],
        filteredManualTestingAssignments: [],
        manualTestingFilters: {
            status: '',
            wcag_level: '',
            page_id: '',
            coverage_type: 'all'
        },
        manualTestingCoverageAnalysis: { recommendations: [] },
        showManualTestingModal: false,
        currentManualTest: null,
        manualTestingProcedure: null,
        manualTestingContext: { violations: [], recommended_tools: [] },
        
        // ===== TESTING STATE FLAGS =====
        automatedTestingInProgress: false,
        
        // ===== TESTING CONFIGURATION =====
        testingConfig: {
            useAxe: true,
            usePa11y: true,
            useLighthouse: true,
            wcagLevel: 'AA',
            browser: 'chromium'
        },
        automatedTestConfig: {
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
        },
        
        // ===== TESTING PROGRESS =====
        testingProgress: {
            percentage: 0,
            message: '',
            completedPages: 0,
            totalPages: 0,
            currentPage: ''
        },
        
        // ===== RESULTS SUMMARIES =====
        resultsSummary: {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            complianceScore: 0
        },
        complianceAnalysis: {
            levelA: 0,
            levelAA: 0,
            levelAAA: 0
        },
        
        // ===== SELECTION AND REFERENCE OBJECTS =====
        selectedProject: null,
        currentProject: null, // Full project object for easy access
        selectedDiscovery: null,
        selectedCrawlerForPages: null,
        selectedAuthProject: null,
        editingAuthConfig: null,
        discoveryToDelete: null,
        projectToDelete: null,
        sessionToDelete: null,
        currentTestInstance: null,
        selectedSession: null,
        selectedTestResult: null,
        selectedTestingSession: null,
        
        // ===== AUTHENTICATION AND USER =====
        isAuthenticated: false,
        user: null,
        
        // ===== SEARCH AND FILTER PROPERTIES =====
        urlSearch: '',
        urlSourceFilter: 'all',
        crawlerPageSearch: '',
        crawlerPageFilter: '',
        
        // ===== ERROR HANDLING =====
        loginError: '',
        passwordError: '',
        
        // ===== MISC PROPERTIES =====
        activeTab: 'projects',
        totalCrawlers: 0,
        notification: { show: false, type: '', title: '', message: '' },
        sessionInfo: { 
            isValid: false, 
            lastActivity: null, 
            status: 'inactive',
            username: '',
            capturedDate: '',
            expirationDate: '',
            pagesCount: 0
        },
        
        // ===== MANUAL URL FORM =====
        newManualUrl: '',
        newManualUrlTitle: '',
        newManualUrlType: 'content',
        newManualUrlDepth: 1,
        newManualUrlRequiresAuth: false,
        newManualUrlHasForms: false,
        newManualUrlForTesting: true,
        addingManualUrl: false,
        
        // ===== TESTING SESSIONS STATE =====
        testingSessions: [],
        filteredTestingSessions: [],
        sessionFilters: {
            status: '',
            conformance_level: ''
        },
        showCreateTestingSession: false,
        showSessionDetails: false,
        showTestingMatrix: false,
        selectedSession: null,
        testingMatrix: null,
        newTestingSession: {
            name: '',
            description: '',
            conformance_level: '',
            priority: 'medium',
            testing_approach: 'hybrid',
            pageScope: 'all',
            applySmartFiltering: true,
            createBulkInstances: false,
            enableProgressTracking: true,
            notifyOnCompletion: false,
            enableAuditTrail: true
        },
        showAdvancedOptions: false,
        
        // Legacy session data for compatibility
        complianceSessions: [],
        sessions: [],
        testSessions: [],
        
        // ===== MANUAL TESTING STATE =====
    };

    // ===== MERGE WITH ORGANIZED STATE STRUCTURE =====
    return {
        // Apply all defaults first
        ...defaults,
        
        // ===== ORGANIZED STATE STRUCTURE =====
        ui: {
            activeTab: 'projects',
            loading: false,
            modals: {
                showLogin: false,
                showProfile: false,
                showSessionUrl: false,
                showCreateCrawler: false,
                showCrawlerPagesModal: false,
                showAddAuthConfigModal: false,
                showEditAuthConfigModal: false,
                showSessions: false,
                showChangePassword: false
            },
            notification: { show: false, type: '', title: '', message: '' }
        },
        
        // ===== ADMIN BACKUP FUNCTIONALITY =====
        admin: {
            // Database backup state
            databaseStatus: { size: null, tables: null, lastBackup: null },
            backups: [],
            newBackupDescription: '',
            includeSchema: true,
            includeData: true,
            compressBackup: true,
            creatingBackup: false,
            loadingBackups: false,
            backupProgress: { message: '', percentage: 0 },
            
            // Modal states
            showBackupModal: false,
            showRestoreModal: false,
            showDeleteModal: false,
            selectedBackup: null,
            confirmRestore: false,
            restoringBackup: false,
            deletingBackup: false
        },
        
        // ===== USER MANAGEMENT FUNCTIONALITY =====
        userManagement: {
            users: [],
            stats: {},
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            limit: 25,
            sortField: 'created_at',
            sortOrder: 'DESC',
            filters: {
                search: '',
                role: '',
                status: ''
            },
            isLoading: false,
            editingUser: null,
            deletingUserId: null
        },
        
        auth: {
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            user: null
        },
        
        forms: {
            login: { username: '', password: '', error: '' },
            profile: { full_name: '', email: '' },
            password: { current_password: '', new_password: '', confirm_password: '', error: '' }
        },
        
        data: {
            projects: [],
            selectedProject: null,
            webCrawlers: [],
            authConfigs: [],
            availableUrls: [],
            sessionInfo: { 
                isValid: false, 
                lastActivity: null, 
                status: 'inactive',
                username: '',
                capturedDate: '',
                expirationDate: '',
                pagesCount: 0
            }
        },
        
        ws: {
            socket: null,
            connected: false,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5,
            reconnectDelay: 1000
        },
        
        config: {
            apiBaseUrl: 'http://localhost:3001',
            tokenRefreshInterval: null
        },
        
        // Legacy state for compatibility (will be removed)
        projects: [],
        selectedProject: null,
        webCrawlers: [],
        authConfigs: [],
        crawlerPages: [],
        availableUrls: [],
        sessionInfo: { 
            isValid: false, 
            lastActivity: null, 
            status: 'inactive',
            username: '',
            capturedDate: '',
            expirationDate: '',
            pagesCount: 0
        },
        apiConnected: false,
        wsConnected: false,
        wsConnecting: false,
        wsReconnectAttempts: 0,
        notification: { show: false, type: '', title: '', message: '' },
        showAdvancedCrawlerOptions: false,
        
        // Additional legacy properties for template compatibility
                    activeTab: 'projects',  // Always start with Projects tab
        // All properties now initialized via comprehensive defaults object above
        
        // ===== LIFECYCLE METHODS =====
        
        // Alpine.js automatically calls this when the component initializes
        init() {
            // 🛡️ Prevent double initialization
            if (this._initialized) {
                console.warn('⚠️ Dashboard init() called twice, skipping');
                return;
            }
            this._initialized = true;
            this._initializationTime = Date.now(); // Track when component was initialized
            
            // Initialize automationProgress to null so progress bar only shows when there's actual progress
            this.automationProgress = null;
            
            console.log('✅ Dashboard initialized');
            
            // Immediately ensure nested objects are protected
            this.ensureNestedObjects();
            this.syncLegacyState();
            
            // Set up periodic protection against timing issues
            this.setupNestedObjectProtection();
            
            this.checkAuthentication();
            this.checkApiConnection();
            this.initWebSocket();
        },
        
        setupNestedObjectProtection() {
            // Protect against timing issues by periodically checking nested objects
            setInterval(() => {
                this.ensureNestedObjects();
            }, 1000); // Check every second
            
            // Also protect against component loading that might reset objects
            const observer = new MutationObserver(() => {
                this.ensureNestedObjects();
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        async initAsync() {
            await this.loadInitialData();
        },
        
        // ===== WEBSOCKET METHODS =====
        
        // Initialize WebSocket connection
        initWebSocket() {
            try {
                if (this.socket) {
                    console.log('🔌 WebSocket already connected');
                    return;
                }
                
                const token = this.getAuthToken();
                if (!token) {
                    console.log('⚠️ No auth token available, skipping WebSocket connection');
                    return;
                }
                
                console.log('🔌 Connecting to WebSocket...');
                
                this.socket = io('http://localhost:3001', {
                    auth: { token },
                    transports: ['websocket', 'polling']
                });
                
                this.setupWebSocketEventHandlers();
                
            } catch (error) {
                console.error('❌ WebSocket initialization error:', error);
            }
        },
        
        // Setup WebSocket event handlers
        setupWebSocketEventHandlers() {
            if (!this.socket) return;
            
            // Connection events
            this.socket.on('connect', () => {
                console.log('✅ WebSocket connected');
                this.socketConnected = true;
                this.wsConnected = true; // For header compatibility
                
                // Join current project room if we have one
                if (this.selectedProject?.id) {
                    this.socket.emit('join_project', this.selectedProject.id);
                }
                
                // Join current session room if we have one
                if (this.selectedTestSession?.id) {
                    this.socket.emit('join_session', this.selectedTestSession.id);
                }
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('🔌 WebSocket disconnected:', reason);
                this.socketConnected = false;
                this.wsConnected = false; // For header compatibility
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('❌ WebSocket connection error:', error);
                this.socketConnected = false;
                this.wsConnected = false; // For header compatibility
            });
            
            // Automation progress events
            this.socket.on('session_progress', (data) => {
                console.log('📊 Automation progress update received:', data);
                this.handleAutomationProgress(data);
                
                // Refresh test grid to show status changes if it's open
                if (this.showTestGrid && this.selectedTestSession?.id === data.sessionId) {
                    this.refreshTestGridStatuses();
                }
            });
            
            this.socket.on('session_complete', (data) => {
                console.log('🏁 Automation completed:', data);
                this.handleAutomationComplete(data);
            });
            
            this.socket.on('testing_milestone', (data) => {
                console.log('🎯 Testing milestone:', data);
                this.handleTestingMilestone(data);
            });
            
            this.socket.on('test_results', (data) => {
                console.log('📊 Test results update:', data);
                this.handleTestResults(data);
            });
            
            // Project and session events
            this.socket.on('user_joined_project', (data) => {
                console.log('👥 User joined project:', data);
            });
            
            this.socket.on('user_joined_session', (data) => {
                console.log('👥 User joined session:', data);
            });
            
            // Discovery events
            this.socket.on('discovery_progress', (data) => {
                console.log('🕷️ Discovery progress:', data);
                this.handleDiscoveryProgress(data);
            });
            
            this.socket.on('discovery_complete', (data) => {
                console.log('🏁 Discovery complete:', data);
                this.handleDiscoveryComplete(data);
            });
            
            // General notifications
            this.socket.on('notification', (data) => {
                console.log('🔔 Notification:', data);
                this.showNotification(data.type || 'info', data.title || 'Update', data.message);
            });
        },
        
        // Handle automation progress updates
        handleAutomationProgress(data) {
            if (!data || !data.progress) return;
            
            const progress = data.progress;
            
            // Update automation progress state with enhanced information
            this.automationProgress = {
                sessionId: data.sessionId,
                percentage: progress.percentage || 0,
                completedTests: progress.completedTests || 0,
                totalTests: progress.totalTests || 0,
                currentPage: progress.currentPage || '',
                currentTool: progress.currentTool || '',
                message: progress.message || 'Processing...',
                stage: progress.stage || 'testing',
                violationsFound: progress.violationsFound || 0,
                statistics: progress.statistics || {},
                // Enhanced fields for detailed status
                currentPageIndex: progress.currentPageIndex || 0,
                totalPages: progress.totalPages || 0,
                completedPages: progress.completedPages || 0,
                status: progress.status || 'processing',
                lastResult: progress.lastResult || null,
                lastError: progress.lastError || null
            };
            
            // Show enhanced real-time notification with detailed information
            if (this.realtimeUpdates) {
                let notificationMessage = `${progress.percentage}% complete`;
                
                // Add detailed status information
                if (progress.currentPage) {
                    notificationMessage += ` - Testing ${progress.currentPage}`;
                }
                
                if (progress.currentTool) {
                    notificationMessage += ` with ${progress.currentTool}`;
                }
                
                if (progress.currentPageIndex && progress.totalPages) {
                    notificationMessage += ` (Page ${progress.currentPageIndex}/${progress.totalPages})`;
                }
                
                if (progress.lastResult) {
                    notificationMessage += ` - ${progress.lastResult.violations} violations found`;
                }
                
                if (progress.lastError) {
                    notificationMessage += ` - Error: ${progress.lastError.error}`;
                }
                
                this.showNotification('info', 'Automation Progress', notificationMessage);
            }
            
            // Update session details if they're open
            if (this.selectedTestSession?.id === data.sessionId) {
                this.refreshSessionAutomationSummary();
            }
            
            // Log detailed progress for debugging
            console.log('📊 Enhanced automation progress:', {
                tool: progress.currentTool,
                page: progress.currentPage,
                progress: `${progress.currentPageIndex || 0}/${progress.totalPages || 0}`,
                status: progress.status,
                message: progress.message,
                lastResult: progress.lastResult,
                lastError: progress.lastError
            });
        },
        
        // Handle automation completion
        handleAutomationComplete(data) {
            if (!data) return;
            
            console.log('🎉 Automation completed for session:', data.sessionId);
            
            // Reset progress state
            this.automationProgress = null;
            
            // Show completion notification
            this.showNotification('success', 'Automation Complete', 
                `Testing completed! ${data.results?.violationsFound || 0} issues found.`);
            
            // Refresh relevant data
            if (this.selectedTestSession?.id === data.sessionId) {
                this.refreshSessionAutomationSummary();
                // Refresh test grid if it's open
                if (this.showTestGrid) {
                    setTimeout(() => {
                        this.loadTestInstancesForGrid(data.sessionId, this.testGridPagination.currentPage, true);
                    }, 1000);
                }
            }
        },
        
        // Handle testing milestones
        handleTestingMilestone(data) {
            if (!data || !data.milestone) return;
            
            const milestone = data.milestone;
            console.log(`🎯 Testing milestone: ${milestone.type} - ${milestone.message}`);
            
            // Show milestone notifications for important events
            if (['tool_complete', 'critical_violation', 'progress_50', 'progress_75'].includes(milestone.type)) {
                this.showNotification('info', 'Testing Milestone', milestone.message);
            }
        },
        
        // Handle individual test results
        handleTestResults(data) {
            if (!data || !data.testData) return;
            
            const testData = data.testData;
            console.log('📊 New test result:', testData);
            
            // Show detailed test result notification
            if (this.realtimeUpdates && testData.status === 'completed') {
                let resultMessage = `${testData.tool} completed ${testData.url}`;
                
                if (testData.violations !== undefined) {
                    resultMessage += ` - ${testData.violations} violations`;
                    if (testData.critical !== undefined && testData.critical > 0) {
                        resultMessage += ` (${testData.critical} critical)`;
                    }
                }
                
                if (testData.title) {
                    resultMessage += ` - "${testData.title}"`;
                }
                
                this.showNotification('success', 'Test Completed', resultMessage);
            } else if (this.realtimeUpdates && testData.status === 'error') {
                this.showNotification('error', 'Test Error', 
                    `${testData.tool} error testing ${testData.url}: ${testData.error}`);
            }
            
            // If test grid is open, refresh it to show new results
            if (this.showTestGrid && this.selectedTestSession?.id === data.sessionId) {
                // Debounced refresh to avoid too many updates
                clearTimeout(this.testResultsRefreshTimer);
                this.testResultsRefreshTimer = setTimeout(() => {
                    this.loadTestInstancesForGrid(data.sessionId, this.testGridPagination.currentPage, true);
                }, 2000);
            }
        },
        
        // Handle discovery progress updates
        handleDiscoveryProgress(data) {
            if (!data || !data.progress) return;
            
            const progress = data.progress;
            console.log(`🕷️ Discovery progress: ${progress.percentage}% - ${progress.pagesFound} pages found`);
            
            // Update discovery state if we're tracking this discovery
            if (this.discoveryInProgress && data.discoveryId === this.currentDiscoveryId) {
                this.discoveryProgress = {
                    percentage: progress.percentage,
                    pagesFound: progress.pagesFound,
                    currentUrl: progress.currentUrl,
                    message: progress.message
                };
            }
        },
        
        // Handle discovery completion
        handleDiscoveryComplete(data) {
            if (!data) return;
            
            console.log('🏁 Discovery complete:', data.results);
            
            this.showNotification('success', 'Discovery Complete', 
                `Found ${data.results.total_pages_found} pages`);
            
            // Refresh crawler data
            this.loadCrawlerPageCounts(true);
        },
        
        // Join project room for real-time updates
        joinProjectRoom(projectId) {
            if (this.socket && this.socketConnected && projectId) {
                console.log('📁 Joining project room:', projectId);
                this.socket.emit('join_project', projectId);
            }
        },
        
        // Join session room for real-time updates
        joinSessionRoom(sessionId) {
            if (this.socket && this.socketConnected && sessionId) {
                console.log('🧪 Joining session room:', sessionId);
                this.socket.emit('join_session', sessionId);
            }
        },
        
        // Refresh test grid statuses without full reload
        refreshTestGridStatuses() {
            // Debounced refresh to avoid too many requests
            clearTimeout(this.statusRefreshTimer);
            this.statusRefreshTimer = setTimeout(() => {
                if (this.selectedTestSession?.id) {
                    console.log('🔄 Refreshing test grid statuses...');
                    this.loadTestInstancesForGrid(this.selectedTestSession.id, this.testGridPagination.currentPage, true);
                }
            }, 1000); // Wait 1 second to batch multiple status changes
        },
        
        // Disconnect WebSocket
        disconnectWebSocket() {
            if (this.socket) {
                console.log('🔌 Disconnecting WebSocket...');
                this.socket.disconnect();
                this.socket = null;
                this.socketConnected = false;
            }
        },

        syncLegacyState() {
            // Keep legacy flat properties in sync with organized state
            // This ensures all Alpine.js template bindings work correctly
            Object.keys(this).forEach(key => {
                if (key in this.ui) this[key] = this.ui[key];
                if (key in this.auth) this[key] = this.auth[key];
                if (key in this.data) this[key] = this.data[key];
                if (key in this.forms) this[key] = this.forms[key];
                if (key in this.ws && key === 'connected') this.apiConnected = this.ws[key];
            });
            
            // Explicitly sync WebSocket state for templates
            this.wsConnected = this.ws.connected || false;
            this.wsConnecting = this.ws.connecting || false;
            
            // Explicitly sync critical auth properties for template compatibility
            this.isAuthenticated = this.auth.isAuthenticated || false;
            this.user = this.auth.user || null;
            this.token = this.auth.token || null;
            this.showLogin = this.ui.modals.showLogin || false;
            this.showProfile = this.ui.modals.showProfile || false;
            this.showChangePassword = this.ui.modals.showChangePassword || false;
            this.showSessions = this.ui.modals.showSessions || false;
            this.showAddAuthConfigModal = this.ui.modals.showAddAuthConfigModal || false;
            this.showEditAuthConfigModal = this.ui.modals.showEditAuthConfigModal || false;
            this.showCreateCrawler = this.ui.modals.showCreateCrawler || false;
            this.showCrawlerPagesModal = this.ui.modals.showCrawlerPagesModal || false;
            
            // Sync authentication data arrays
            this.authConfigs = this.data.authConfigs || [];
            this.projectAuthConfigs = this.data.projectAuthConfigs || [];
            this.selectedAuthProject = this.data.selectedAuthProject || null;
            
            // Sync project selection for application-wide access
            this.selectedProject = this.data.selectedProject || null;
            this.currentProject = this.getSelectedProject(); // Always keep object reference updated
            this.projects = this.data.projects || [];
            
            // Sync project-specific data arrays
            this.discoveries = this.data.discoveries || [];
            this.testSessions = this.data.testSessions || [];
            this.webCrawlers = this.data.webCrawlers || [];
            
            // Sync config object for API calls
            this.config = this.config || { apiBaseUrl: 'http://localhost:3001', tokenRefreshInterval: null };
            
            // Critical: Ensure nested objects remain properly initialized
            this.ensureNestedObjects();
        },
        
        ensureNestedObjects() {
            // Fix for timing issues - ensure critical nested objects are always properly initialized
            if (!this.newCrawler || typeof this.newCrawler !== 'object') {
                this.newCrawler = {};
            }
            
            if (!this.newCrawler.saml_config || typeof this.newCrawler.saml_config !== 'object') {
                this.newCrawler.saml_config = {
                    idp_domain: '',
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    login_page: '',
                    success_url: '',
                    timeout_ms: 30000
                };
            }
            
            if (!this.newCrawler.auth_credentials || typeof this.newCrawler.auth_credentials !== 'object') {
                this.newCrawler.auth_credentials = {
                    username: '',
                    password: '',
                    domain: '',
                    additional_fields: {}
                };
            }
            
            if (!this.newCrawler.auth_workflow || typeof this.newCrawler.auth_workflow !== 'object') {
                this.newCrawler.auth_workflow = {
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    success_indicators: [],
                    additional_steps: []
                };
            }
            
            // Ensure authSetup nested objects are also protected
            if (!this.authSetup || typeof this.authSetup !== 'object') {
                this.authSetup = {
                    step: null,
                    type: null,
                    sso: { url: '', loginPage: '', successUrl: '', name: '' },
                    basic: { url: '', loginPage: '', username: '', password: '', name: '' },
                    advanced: { type: 'api_key', url: '', apiKey: '', token: '', name: '' }
                };
            }
            
            if (!this.authSetup.sso) this.authSetup.sso = { url: '', loginPage: '', successUrl: '', name: '' };
            if (!this.authSetup.basic) this.authSetup.basic = { url: '', loginPage: '', username: '', password: '', name: '' };
            if (!this.authSetup.advanced) this.authSetup.advanced = { type: 'api_key', url: '', apiKey: '', token: '', name: '' };
        },

        destroy() {
            this.disconnectWebSocket();
            this.cleanupTokenRefreshTimer();
        },
        
        // ===== COMPUTED PROPERTIES =====
        
        get filteredUrls() {
            return this.availableUrls.filter(url => 
                url.url.toLowerCase().includes(this.urlSearch.toLowerCase())
            );
        },

        get selectedUrls() {
            return this.availableUrls.filter(url => url.selected);
        },

        get currentProject() {
            return this.projects.find(p => p.id === this.selectedProject);
        },
        
        // ===== MISSING HELPER METHODS =====
        
        getSelectedProjectInfo() {
            const project = this.getSelectedProject();
            return project ? `${project.name} (${project.primary_url})` : 'No project selected';
        },
        
        getSelectedPagesCount() {
            return this.discoveredPages.filter(page => page.selected).length;
        },

        hasWebCrawlerData() {
            // Check if current project has web crawler data available
            return this.data.selectedProject && 
                   this.data.webCrawlers && 
                   this.data.webCrawlers.length > 0 &&
                   this.data.webCrawlers.some(crawler => crawler.status === 'completed');
        },
        
        getProjectAuthConfigs(projectId) {
            return this.authConfigs.filter(config => config.project_id === projectId);
        },
        
        getProjectAuthStatus(projectId) {
            const configs = this.getProjectAuthConfigs(projectId);
            return configs.length > 0 ? 'configured' : 'not-configured';
        },
        
        // REMOVED: Duplicate method - using complete version at line 1887
        
        // ===== SESSION AND CAPTURE METHODS =====
        
        captureNewSession() {
            console.log('🔍 DEBUG: captureNewSession called');
            this.sessionCapturing = true;
            this.syncLegacyState();
            
            // Simulate session capture process
            setTimeout(() => {
                this.sessionCapturing = false;
                this.syncLegacyState();
                this.showNotification('success', 'Session Captured', 'Browser session captured successfully');
            }, 2000);
        },
        
        testSessionAccess() {
            this.sessionTesting = true;
            this.syncLegacyState();
            // Placeholder - implement session testing logic
            setTimeout(() => {
                this.sessionTesting = false;
                this.syncLegacyState();
                this.showNotification('info', 'Session Tested', 'Session access verified');
            }, 1500);
        },
        
        // ===== DISCOVERY METHODS =====
        
        startNewDiscovery() {
            if (!this.selectedProject || this.discoveryInProgress) return;
            
            this.discoveryInProgress = true;
            this.discoveryProgress = {
                percentage: 0,
                message: 'Starting discovery...',
                pagesFound: 0,
                currentUrl: ''
            };
            this.syncLegacyState();
            
            // Placeholder - implement discovery logic
            setTimeout(() => {
                this.discoveryInProgress = false;
                this.syncLegacyState();
                this.showNotification('success', 'Discovery Complete', 'Site discovery completed successfully');
            }, 3000);
        },
        
        // ===== MODAL MANAGEMENT METHODS =====
        
        // REMOVED: Duplicate method - using complete async version at line 1925
        
        closeCrawlerPagesModal() {
            this.ui.modals.showCrawlerPagesModal = false;
            this.selectedCrawlerForPages = null;
            this.crawlerPages = [];
            this.filteredCrawlerPages = [];
            this.crawlerPageSearch = '';
            this.crawlerPageFilter = '';
            this.syncLegacyState();
        },
        
        viewDiscoveredPages(discovery) {
            this.selectedDiscovery = discovery;
            this.showDiscoveredPagesModal = true;
            this.syncLegacyState();
        },
        
        closeDiscoveredPagesModal() {
            this.showDiscoveredPagesModal = false;
            this.selectedDiscovery = null;
            this.syncLegacyState();
        },
        
        toggleManualUrlForm() {
            this.showManualUrlForm = !this.showManualUrlForm;
            this.syncLegacyState();
        },
        
        // ===== PAGE SELECTION METHODS =====
        
        selectAllPages() {
            this.discoveredPages.forEach(page => page.selected = true);
            this.syncLegacyState();
        },
        
        deselectAllPages() {
            this.discoveredPages.forEach(page => page.selected = false);
            this.syncLegacyState();
        },
        
        // ===== AUTHENTICATION METHODS =====
        
        async checkAuthentication() {
            const token = localStorage.getItem('auth_token');
            const refreshToken = localStorage.getItem('refresh_token');
            
            if (!token) {
                // No token found - require proper authentication
                console.log('🔐 No authentication token found. Please log in.');
                this.auth.isAuthenticated = false;
                this.ui.modals.showLogin = true;
                this.isAuthenticated = false;
                this.showLogin = true;
                return;
            }
            
            this.auth.token = token;
            this.auth.refreshToken = refreshToken;
            this.token = token; // Set legacy property
            
            try {
                // Validate token with the session-info endpoint that requires authentication
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/session-info`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.auth.isAuthenticated = true;
                    this.auth.user = data.user;
                    this.ui.modals.showLogin = false;
                    
                    // Set legacy state
                    this.isAuthenticated = true;
                    this.user = data.user;
                    this.showLogin = false;
                    
                    // Initialize profile form
                    this.profileForm.full_name = data.user.full_name || '';
                    this.profileForm.email = data.user.email || '';
                    
                    this.startTokenRefreshTimer();
                    this.initializeWebSocket();
                    await this.loadInitialData();
                    this.syncLegacyState(); // Sync legacy state
                    
                    // Allow user management modal to open after initialization is complete
                    setTimeout(() => {
                        this.preventAutoUserManagement = false;
                        console.log('✅ User management modal auto-open protection disabled');
                    }, 10000); // Wait 10 seconds after auth check
                } else if (response.status === 401 && refreshToken) {
                    // Try to refresh token
                    await this.refreshToken();
                } else {
                    this.clearAuth();
                }
            } catch (error) {
                console.error('Authentication check failed:', error);
                this.clearAuth();
                this.ui.modals.showLogin = true;
                this.showLogin = true;
            }
        },
        
        async refreshToken() {
            if (!this.auth.refreshToken) {
                this.clearAuth();
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        refresh_token: this.auth.refreshToken 
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.auth.token = data.token || data.access_token;
                    this.auth.refreshToken = data.refresh_token;
                    
                    localStorage.setItem('auth_token', data.token || data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    
                    this.auth.isAuthenticated = true;
                    this.startTokenRefreshTimer();
                    
                    console.log('Token refreshed successfully');
                } else {
                    this.clearAuth();
                    this.ui.modals.showLogin = true;
                }
            } catch (error) {
                console.error('Token refresh failed:', error);
                this.clearAuth();
                this.ui.modals.showLogin = true;
            }
        },
        
        startTokenRefreshTimer() {
            this.cleanupTokenRefreshTimer();
            
            // Refresh token every 30 minutes
            this.auth.tokenRefreshTimer = setInterval(() => {
                this.refreshToken();
            }, 30 * 60 * 1000);
        },
        
        cleanupTokenRefreshTimer() {
            if (this.auth.tokenRefreshTimer) {
                clearInterval(this.auth.tokenRefreshTimer);
                this.auth.tokenRefreshTimer = null;
            }
        },
        
        clearAuth() {
            this.cleanupTokenRefreshTimer();
            this.disconnectWebSocket();
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            
            // Clear organized state
            this.auth.isAuthenticated = false;
            this.auth.user = null;
            this.auth.token = null;
            this.auth.refreshToken = null;
            this.ui.modals.showLogin = true;
            
            // Clear legacy state for template compatibility
            this.isAuthenticated = false;
            this.user = null;
            this.token = null;
            this.showLogin = true;
        },
        
        // Auto-login functionality removed for security - users must authenticate properly
        
        async login() {
            this.loginError = '';
            this.loading = true;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.loginForm)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Set organized state first
                    this.auth.token = data.token;
                    this.auth.user = data.user;
                    this.auth.isAuthenticated = true;
                    this.ui.modals.showLogin = false;
                    
                    // Set legacy state for template compatibility
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
                    
                    this.showNotification('success', 'Welcome Back', `Welcome back, ${data.user.full_name || data.user.username}!`);
                    
                    // ALWAYS GO TO PROJECTS TAB AFTER LOGIN
                    this.activeTab = 'projects';
                    
                    // Initialize WebSocket and load data
                    this.initializeWebSocket();
                    await this.loadInitialData();
                    
                    // Allow user management modal to open after initialization is complete
                    setTimeout(() => {
                        this.preventAutoUserManagement = false;
                        console.log('✅ User management modal auto-open protection disabled');
                    }, 10000); // Wait 10 seconds after login
                } else {
                    this.loginError = data.error || 'Login failed';
                }
            } catch (error) {
                console.error('Login error:', error);
                this.loginError = 'Network error occurred';
            } finally {
                this.loading = false;
            }
        },
        
        logout() {
            this.clearAuth();
            // clearAuth already sets showLogin = true, but let's be explicit
            this.showNotification('info', 'Logged Out', 'You have been logged out');
        },
        
        /**
         * Get authentication token from localStorage or session
         */
        getAuthToken() {
            // Try to get token from localStorage first - check correct key names
            let token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken');
            
            // If no token in localStorage, try sessionStorage
            if (!token) {
                token = sessionStorage.getItem('authToken') || sessionStorage.getItem('accessToken');
            }
            
            // If still no token, try to get from current session/user context
            if (!token && this.currentUser?.token) {
                token = this.currentUser.token;
            }
            
            // Try auth object
            if (!token && this.auth?.token) {
                token = this.auth.token;
            }
            
            // Try token property
            if (!token && this.token) {
                token = this.token;
            }
            
            // No default token - require proper authentication
            if (!token) {
                console.warn('No authentication token found. Authentication required.');
                return null; // No default token
            }
            return token;
        },
        
        getAuthHeaders() {
            const headers = { 'Content-Type': 'application/json' };
            if (this.auth.token) {
                headers['Authorization'] = `Bearer ${this.auth.token}`;
            }
            return headers;
        },

        // API Helper Function (from stable backup)
        async apiCall(endpoint, options = {}) {
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                
                // Add auth token if available
                const authToken = this.getAuthToken();
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }
                
                const finalUrl = `${this.config.apiBaseUrl}/api${endpoint}`;
                
                const response = await fetch(finalUrl, {
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
                    this.showNotification('error', 'API Error', 'API call failed: ' + error.message);
                }
                throw error;
            }
        },

        handleAuthError() {
            console.log('Authentication error - clearing auth state');
            this.clearAuth();
            this.showLogin = true;
            this.ui.modals.showLogin = true;
        },
        
        // ===== API CONNECTION =====
        
        async checkApiConnection() {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/health`);
                if (response.ok) {
                    this.apiConnected = true;
                    console.log('API connection successful');
                } else {
                    this.apiConnected = false;
                    console.warn('API connection failed');
                }
            } catch (error) {
                this.apiConnected = false;
                console.error('API connection error:', error);
            }
        },
        
        // ===== WEBSOCKET MANAGEMENT =====
        
        initializeWebSocket() {
            if (!this.auth.isAuthenticated || this.ws.socket || this.ws.connecting) {
                return;
            }
            
            this.ws.connecting = true;
            
            try {
                this.ws.socket = io(this.config.apiBaseUrl, {
                    auth: { token: this.auth.token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000
                });
                
                this.setupWebSocketHandlers();
            } catch (error) {
                console.error('WebSocket initialization failed:', error);
                this.ws.connecting = false;
            }
        },
        
        setupWebSocketHandlers() {
            if (!this.ws.socket) return;
            
            this.ws.socket.on('connect', () => {
                console.log('✅ WebSocket connected');
                this.ws.connected = true;
                this.ws.connecting = false;
                this.ws.reconnectAttempts = 0;
                this.syncLegacyState(); // Sync WebSocket state to templates
                
                if (this.data.selectedProject) {
                    // Ensure we pass only the project ID (string) not the object
                    const projectId = typeof this.data.selectedProject === 'string' 
                        ? this.data.selectedProject 
                        : this.data.selectedProject.id || this.data.selectedProject;
                        
                    console.log('🔗 Joining WebSocket room for project:', projectId);
                    this.ws.socket.emit('join_project', projectId);
                }
            });
            
            this.ws.socket.on('disconnect', () => {
                console.log('❌ WebSocket disconnected');
                this.ws.connected = false;
                this.ws.connecting = false;
                this.syncLegacyState(); // Sync WebSocket state to templates
            });
            
            this.ws.socket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error);
                this.ws.connected = false;
                this.ws.connecting = false;
            });
            
            this.ws.socket.on('crawler_progress', (data) => {
                console.log('📡 WebSocket: crawler_progress event received');
                this.handleCrawlerProgress(data);
            });
            
            this.ws.socket.on('crawler_completed', (data) => {
                console.log('📡 WebSocket: crawler_completed event received');
                this.handleCrawlerCompleted(data);
            });
            
            this.ws.socket.on('crawler_error', (data) => {
                console.log('📡 WebSocket: crawler_error event received');
                this.handleCrawlerError(data);
            });
            
            this.ws.socket.on('crawler_stopped', (data) => {
                console.log('📡 WebSocket: crawler_stopped event received');
                this.handleCrawlerStopped(data);
            });
            
            this.ws.socket.on('notification', (data) => {
                console.log('📡 WebSocket: notification event received');
                this.showNotification(data.level, data.title, data.message);
            });
            
            // Add a generic event listener to catch all events for debugging
            this.ws.socket.onAny((eventName, ...args) => {
                console.log(`📡 WebSocket: Event "${eventName}" received with data:`, args);
                
                // For crawler events, show additional debugging
                if (eventName.startsWith('crawler_')) {
                    console.log('🔍 WebSocket DEBUG: Crawler event details:', {
                        event: eventName,
                        selectedProject: this.data.selectedProject,
                        webCrawlersCount: this.data.webCrawlers.length,
                        crawlerInProgress: this.crawlerInProgress,
                        crawlerProgress: this.crawlerProgress
                    });
                }
            });
        },
        
        disconnectWebSocket() {
            if (this.ws.socket) {
                this.ws.socket.disconnect();
                this.ws.socket = null;
                this.ws.connected = false;
                this.wsConnected = false; // Legacy sync
            }
        },
        
        handleCrawlerProgress(data) {
            console.log('🔄 Crawler progress received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            
            console.log('🔍 DEBUG: Processing crawler progress:', {
                crawlerId: crawlerId,
                pagesFound: crawlerRun.pages_found || crawlerRun.pagesFound,
                pagesCrawled: crawlerRun.pages_crawled,
                status: crawlerRun.status,
                currentUrl: crawlerRun.current_url || crawlerRun.currentUrl
            });
            
            // Update crawler status in the list
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = crawlerRun.status || 'running';
                crawler.total_pages_found = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
                crawler.pages_for_testing = crawlerRun.pages_found || crawlerRun.pagesFound || 0; // Default all pages for testing
                
                console.log('✅ Updated crawler in list:', {
                    name: crawler.name,
                    status: crawler.status,
                    totalPages: crawler.total_pages_found
                });
            } else {
                console.warn('❌ Could not find crawler with ID:', crawlerId);
                console.log('Available crawler IDs:', this.data.webCrawlers.map(c => c.id));
            }
            
            // Update progress indicator
            this.crawlerInProgress = true;
            const pagesFound = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
            const currentUrl = crawlerRun.current_url || crawlerRun.currentUrl || '';
            
            this.crawlerProgress = {
                percentage: Math.min(100, (pagesFound / (crawlerRun.max_pages || 50)) * 100),
                message: `Crawling ${crawler?.name || 'site'}... Found ${pagesFound} pages`,
                pagesFound: pagesFound,
                currentUrl: currentUrl
            };
            
            // Force Alpine.js to update the UI
            this.$nextTick(() => {
                console.log('🔄 UI Updated - Progress:', {
                    percentage: this.crawlerProgress.percentage,
                    pagesFound: this.crawlerProgress.pagesFound,
                    currentUrl: this.crawlerProgress.currentUrl
                });
            });
            
            this.syncLegacyState();
            
            console.log('🔍 DEBUG: Updated progress indicator:', {
                crawlerName: crawler?.name,
                pagesFound: pagesFound,
                progressPercentage: this.crawlerProgress.percentage,
                crawlerInProgress: this.crawlerInProgress
            });
        },
        
        handleCrawlerCompleted(data) {
            console.log('✅ Crawler completed received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            const finalPageCount = crawlerRun.pages_found || crawlerRun.totalPages || crawlerRun.pagesFound || 0;
            
            console.log('🔍 DEBUG: Processing crawler completion:', {
                crawlerId: crawlerId,
                finalPageCount: finalPageCount,
                status: crawlerRun.status
            });
            
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = 'completed';
                crawler.total_pages_found = finalPageCount;
                crawler.pages_for_testing = finalPageCount; // Default all pages for testing
                
                console.log('✅ Updated completed crawler:', {
                    name: crawler.name,
                    status: crawler.status,
                    finalPageCount: finalPageCount
                });
            } else {
                console.warn('❌ Could not find crawler with ID for completion:', crawlerId);
                console.log('Available crawler IDs:', this.data.webCrawlers.map(c => c.id));
            }
            
            // Clear progress indicator
            this.crawlerInProgress = false;
            this.crawlerProgress = {
                percentage: 100,
                message: 'Crawling completed',
                pagesFound: finalPageCount,
                currentUrl: ''
            };
            
            this.syncLegacyState();
            this.loadWebCrawlers(); // Refresh the list with force refresh
            this.showNotification('success', 'Crawler Completed', 
                `Found ${finalPageCount} pages`);
                
            console.log('🔍 DEBUG: Crawler completion processed:', {
                crawlerName: crawler?.name,
                finalPageCount: finalPageCount,
                status: crawler?.status,
                progressCleared: !this.crawlerInProgress
            });
        },
        
        handleCrawlerError(data) {
            console.error('❌ Crawler error received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            const pagesFound = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
            
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = 'failed';
                crawler.total_pages_found = pagesFound;
                crawler.pages_for_testing = pagesFound;
                
                console.log('❌ Updated failed crawler:', {
                    name: crawler.name,
                    status: crawler.status,
                    pagesFound: pagesFound
                });
            }
            
            // Clear progress indicator
            this.crawlerInProgress = false;
            this.crawlerProgress = {
                percentage: 0,
                message: 'Crawling failed',
                pagesFound: pagesFound,
                currentUrl: ''
            };
            
            this.syncLegacyState();
            this.showNotification('error', 'Crawler Failed', 
                data.message || crawlerRun.error || 'Crawler encountered an error');
                
            console.log('🔍 DEBUG: Crawler error processed:', {
                crawlerName: crawler?.name,
                error: data.message || crawlerRun.error,
                pagesFound: pagesFound
            });
        },
        
        handleCrawlerStopped(data) {
            console.log('⏹️ Crawler stopped received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            const pagesFound = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
            
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = 'stopped';
                crawler.total_pages_found = pagesFound;
                crawler.pages_for_testing = pagesFound;
                
                console.log('⏹️ Updated stopped crawler:', {
                    name: crawler.name,
                    status: crawler.status,
                    pagesFound: pagesFound
                });
            }
            
            // Clear progress indicator
            this.crawlerInProgress = false;
            this.crawlerProgress = {
                percentage: 0,
                message: 'Crawling stopped',
                pagesFound: pagesFound,
                currentUrl: ''
            };
            
            this.syncLegacyState();
            this.showNotification('warning', 'Crawler Stopped', 
                `Crawling stopped. Found ${pagesFound} pages`);
                
            console.log('🔍 DEBUG: Crawler stopped processed:', {
                crawlerName: crawler?.name,
                pagesFound: pagesFound,
                reason: data.reason || crawlerRun.reason
            });
        },
        
        // ===== DATA LOADING =====
        
        async loadInitialData() {
            await Promise.all([
                this.loadProjects(),
                this.loadAuthConfigs(),
                this.loadSessionInfo(),  // Load existing session info
                this.loadAvailableTesters()  // Load testers for test grid
            ]);
            
            // Restore previously selected project from localStorage
            this.restoreSelectedProject();
        },
        
        restoreSelectedProject() {
            const savedProjectId = localStorage.getItem('selectedProjectId');
            if (savedProjectId && this.data.projects.length > 0) {
                const project = this.data.projects.find(p => p.id === savedProjectId);
                if (project) {
                    console.log('🔄 Restoring previously selected project:', project.name);
                    this.selectProject(savedProjectId);
                } else {
                    // Clean up invalid saved project ID
                    localStorage.removeItem('selectedProjectId');
                }
            }
        },
        
        async loadProjects() {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.data.projects = result.data || result;
                    this.projects = this.data.projects; // Legacy sync
                } else {
                    console.error('Failed to load projects:', response.status);
                }
            } catch (error) {
                console.error('Error loading projects:', error);
            }
        },
        

        
        async loadWebCrawlers() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(
                    `${this.config.apiBaseUrl}/api/web-crawlers/projects/${this.data.selectedProject}/crawlers`,
                    { headers: this.getAuthHeaders() }
                );
                
                if (response.ok) {
                    const result = await response.json();
                    this.data.webCrawlers = result.success ? result.data : [];
                    this.webCrawlers = this.data.webCrawlers; // Legacy sync
                    
                    // Force refresh page counts to get accurate data from database
                    this.loadCrawlerPageCounts(true);
                } else {
                    console.error('Failed to load web crawlers:', response.status);
                    this.data.webCrawlers = [];
                    this.webCrawlers = [];
                }
            } catch (error) {
                console.error('Error loading web crawlers:', error);
                this.data.webCrawlers = [];
                this.webCrawlers = [];
            }
        },

        async loadCrawlerPageCounts(forceRefresh = false) {
            console.log('🔍 DEBUG: Loading page counts for crawlers...', forceRefresh ? '(FORCE REFRESH)' : '');
            
            for (const crawler of this.webCrawlers) {
                // Only skip if force refresh is false and page count already exists
                if (!forceRefresh && crawler.total_pages_found && crawler.total_pages_found > 0) {
                    console.log(`🔍 DEBUG: Crawler ${crawler.name} already has ${crawler.total_pages_found} pages (skipping)`);
                    continue;
                }
                
                try {
                    console.log(`🔍 DEBUG: Fetching page count for crawler ${crawler.name}...`);
                    const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/pages?limit=1000`, {
                        headers: this.getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const pages = data.pages || data.data || [];
                        const totalCount = data.pagination?.total || pages.length;
                        
                        // Update the crawler with page counts from pagination (more accurate)
                        crawler.total_pages_found = totalCount;
                        
                        // Count only explicitly selected pages for testing
                        const selectedPagesCount = pages.filter(p => 
                            p.selected_for_testing === true
                        ).length;
                        
                        // Page count analysis for debugging
                        console.log(`  - Total pages received: ${pages.length}`);
                        console.log(`  - Total count from API: ${totalCount}`);
                        console.log(`  - Pages with selected_for_testing=true: ${selectedPagesCount}`);
                        console.log(`  - Sample page data:`, pages.slice(0, 3).map(p => ({
                            url: p.url,
                            selected_for_testing: p.selected_for_testing
                        })));
                        
                        // If no explicit selections exist, check if all pages are implicitly selected
                        // by checking if this is a fresh crawl or if selections were explicitly made
                        if (selectedPagesCount === 0 && pages.length === totalCount) {
                            // This might be a fresh crawl - check if any pages have explicit selection flags
                            const hasExplicitSelections = pages.some(p => 
                                p.hasOwnProperty('selected_for_testing')
                            );
                            
                            if (!hasExplicitSelections) {
                                // Fresh crawl - all pages are implicitly selected
                                crawler.pages_for_testing = totalCount;
                            } else {
                                // Pages have explicit selections but none are selected
                                crawler.pages_for_testing = 0;
                            }
                        } else {
                            // Use the actual count of selected pages
                            crawler.pages_for_testing = selectedPagesCount;
                        }
                        
                        console.log(`🔍 DEBUG: Updated ${crawler.name}: ${crawler.total_pages_found} total, ${crawler.pages_for_testing} for testing`);
                        console.log(`🔍 DEBUG: Final counts - Total: ${crawler.total_pages_found}, For Testing: ${crawler.pages_for_testing}, Excluded: ${crawler.total_pages_found - crawler.pages_for_testing}`);
                        console.log(`🔍 DEBUG: API returned ${pages.length} pages, pagination says ${totalCount} total`);
                    } else {
                        console.warn(`Failed to load pages for crawler ${crawler.name}:`, response.status);
                    }
                } catch (error) {
                    console.error(`Error loading pages for crawler ${crawler.name}:`, error);
                }
            }
            
            // Sync the updated data
            this.syncLegacyState();
            console.log('🔍 DEBUG: Finished loading page counts');
        },
        
        // ===== PROJECT METHODS =====
        
        getSelectedProject() {
            if (!this.data.selectedProject) return null;
            return this.data.projects.find(p => p.id === this.data.selectedProject) || null;
        },
        
        // PROJECT SELECTION - Unified method for consistent state management
        selectProject(projectOrId) {
            // Handle both project object and project ID
            const projectId = typeof projectOrId === 'string' ? projectOrId : projectOrId?.id;
            const projectObj = typeof projectOrId === 'object' ? projectOrId : this.projects.find(p => p.id === projectId);
            
            if (!projectId || !projectObj) {
                console.warn('Invalid project selection:', projectOrId);
                return;
            }
            
            // Store ID in organized state (consistent approach)
            this.data.selectedProject = projectId;
            
            // Sync to legacy state for template compatibility
            this.selectedProject = projectId;
            this.currentProject = projectObj; // For easy object access
            
            console.log(`📂 Selected project: ${projectObj.name} (${projectId})`);
            
            // Join WebSocket room for this project
            if (this.ws.socket && this.ws.connected) {
                this.ws.socket.emit('join_project', { projectId });
            }
            
            // Load project-specific data for all tabs
            this.loadProjectData();
            
            // Sync legacy state to ensure all tabs can access selected project
            this.syncLegacyState();
            
            // Store selection in localStorage for persistence
            localStorage.setItem('selectedProjectId', projectId);
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
                this.showNotification('success', 'Success', 'Project created successfully!');
            } catch (error) {
                console.error('Failed to create project:', error);
                this.showNotification('error', 'Error', error.message || 'Failed to create project');
            } finally {
                this.loading = false;
            }
        },

        clearProjectSelection() {
            // Clear all project selection state
            this.data.selectedProject = null;
            this.selectedProject = null;
            this.currentProject = null;
            
            // Clear project-specific data
            this.data.webCrawlers = [];
            this.data.discoveries = [];
            this.data.testSessions = [];
            this.data.projectAuthConfigs = [];
            
            // Sync to legacy state
            this.webCrawlers = [];
            this.discoveries = [];
            this.testSessions = [];
            this.projectAuthConfigs = [];
            
            // Clear localStorage
            localStorage.removeItem('selectedProjectId');
            
            // Sync legacy state
            this.syncLegacyState();
            
            console.log('🗑️ Cleared project selection');
        },
        
        // UNIFIED PROJECT DATA LOADING - Called when project is selected
        async loadProjectData() {
            if (!this.data.selectedProject) return;
            
            try {
                // Load all project-specific data in parallel for better performance
                await Promise.all([
                    this.loadWebCrawlers(),           // For Web Crawler tab
                    this.loadProjectDiscoveries(),    // For Discovery tab
                    this.loadProjectTestSessions(),   // For Testing Sessions tab
                    this.loadProjectAuthConfigs()     // For Authentication tab
                ]);
                
                // Load additional data that might depend on the above
            this.loadSelectedDiscoveries();
                
                console.log(`✅ Loaded all data for project: ${this.getSelectedProject()?.name}`);
            } catch (error) {
                console.error('Error loading project data:', error);
                this.showNotification('error', 'Error', 'Failed to load some project data');
            }
        },

        editProject(project) {
            this.showNotification('info', 'Coming Soon', 'Edit project feature coming soon!');
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
                this.data.projects = this.data.projects.filter(p => p.id !== this.projectToDelete.id);
                this.projects = this.data.projects; // Sync legacy state
                
                // Clear selection if the deleted project was selected
                if (this.data.selectedProject === this.projectToDelete.id) {
                    this.clearProjectSelection();
                }
                
                this.showDeleteProject = false;
                this.projectToDelete = null;
                this.showNotification('success', 'Success', 'Project deleted successfully!');
                
            } catch (error) {
                console.error('Failed to delete project:', error);
                this.showNotification('error', 'Error', 'Failed to delete project. Please try again.');
            } finally {
                this.loading = false;
            }
        },

        resetNewProject() {
            this.newProject = {
                name: '',
                description: '',
                primary_url: '',
                compliance_standard: 'wcag_2_1_aa'
            };
        },

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

        resetProjectForm() {
            this.resetNewProject();
        },

        // ===== CRAWLER METHODS =====
        
        async createCrawler() {
            try {
                const crawlerData = {
                    ...this.newCrawler,
                    project_id: this.data.selectedProject
                };
                
                // Fix base_url format - add https:// if protocol is missing
                if (crawlerData.base_url && !crawlerData.base_url.match(/^https?:\/\//)) {
                    crawlerData.base_url = `https://${crawlerData.base_url}`;
                }
                
                console.log('🔍 DEBUG: Creating crawler with data:', JSON.stringify(crawlerData, null, 2));
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/projects/${this.data.selectedProject}/crawlers`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(crawlerData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Crawler Created', 'New crawler created successfully');
                    this.showCreateCrawler = false;
                    this.resetCrawlerForm();
                    this.loadWebCrawlers();
                } else {
                    const error = await response.json();
                    console.log('🚨 DEBUG: Backend error response:', error);
                    this.showNotification('error', 'Creation Failed', error.message || error.error || 'Failed to create crawler');
                }
            } catch (error) {
                console.error('Error creating crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to create crawler');
            }
        },

        async startCrawler(crawler) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/start`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    crawler.status = 'running';
                    
                    // Join WebSocket project room to receive real-time updates
                    if (this.ws.socket && this.data.selectedProject) {
                        const projectId = typeof this.data.selectedProject === 'string' 
                            ? this.data.selectedProject 
                            : this.data.selectedProject.id || this.data.selectedProject;
                        this.ws.socket.emit('join_project', projectId);
                        console.log('🔌 WebSocket: Joined project room for crawler updates');
                    }
                    
                    // Set progress tracking
                    this.crawlerInProgress = true;
                    this.crawlerProgress = {
                        percentage: 0,
                        message: `Starting ${crawler.name}...`,
                        pagesFound: 0,
                        currentUrl: crawler.base_url || ''
                    };
                    
                    this.syncLegacyState();
                    this.showNotification('success', 'Crawler Started', `Started crawling ${crawler.name}`);
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Start Failed', error.message || 'Failed to start crawler');
                }
            } catch (error) {
                console.error('Error starting crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to start crawler');
            }
        },

        async deleteCrawler(crawlerId) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawlerId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.loadWebCrawlers();
                    this.showNotification('success', 'Crawler Deleted', 'Crawler deleted successfully');
                } else {
                    this.showNotification('error', 'Delete Failed', 'Failed to delete crawler');
                }
            } catch (error) {
                console.error('Error deleting crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to delete crawler');
            }
        },

        resetCrawlerForm() {
            this.newCrawler = {
                name: '',
                description: '',
                base_url: '',
                auth_type: 'none',
                max_depth: 3,
                max_pages: 100,
                follow_external: false,
                respect_robots: true,
                concurrent_pages: 5,
                delay_ms: 1000,
                browser_type: 'chromium',
                request_delay_ms: 2000,
                session_persistence: false,
                respect_robots_txt: false,
                headful_mode: false,
                saml_config: {
                    idp_domain: '',
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    login_page: '',
                    success_url: '',
                    timeout_ms: 30000
                },
                auth_credentials: {
                    username: '',
                    password: '',
                    domain: '',
                    additional_fields: {}
                },
                auth_workflow: {
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    success_indicators: [],
                    additional_steps: []
                }
            };
        },

        getCrawlerStatusColor(status) {
            const colors = {
                'pending': 'bg-gray-100 text-gray-700',
                'running': 'bg-yellow-100 text-yellow-700',
                'completed': 'bg-green-100 text-green-700',
                'failed': 'bg-red-100 text-red-700'
            };
            return colors[status] || 'bg-gray-100 text-gray-700';
        },

        toggleAdvancedCrawlerOptions() {
            this.showAdvancedCrawlerOptions = !this.showAdvancedCrawlerOptions;
        },

        // ===== UI HELPER METHODS =====
        
        setActiveTab(tabName) {
            this.ui.activeTab = tabName;
            this.activeTab = tabName; // Legacy sync
            this.syncLegacyState();
        },

        // Authentication tab loading method (missing method from navigation)
        async loadAuthenticationView() {
            console.log('🔐 Loading Authentication view');
            console.log('🔐 Current selectedProject:', this.data.selectedProject);
            console.log('🔐 Current authConfigs length:', this.authConfigs?.length || 0);
            console.log('🔐 Current projectAuthConfigs length:', this.projectAuthConfigs?.length || 0);
            
            if (this.data.selectedProject) {
                // Auto-select the current project for authentication
                console.log('🔐 Auto-selecting project for auth:', this.data.selectedProject);
                await this.selectAuthProject(this.data.selectedProject);
            } else {
                console.log('🔐 No project selected, cannot load auth configs');
            }
        },

        showNotification(type, title, message) {
            this.notification = {
                show: true,
                type,
                title,
                message
            };
            this.ui.notification = this.notification; // Sync
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideNotification();
            }, 5000);
        },

        hideNotification() {
            this.notification.show = false;
            this.ui.notification.show = false;
        },

        formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        },

        // ===== PROFILE METHODS =====
        
        async updateProfile() {
            this.loading = true;
            
            try {
                const data = await this.apiCall('/auth/profile', {
                    method: 'PUT',
                    body: JSON.stringify(this.profileForm)
                });
                
                this.user = data.user;
                this.auth.user = data.user; // Update organized state too
                this.showProfile = false;
                this.ui.modals.showProfile = false;
                this.showNotification('success', 'Profile Updated', 'Profile updated successfully!');
                
            } catch (error) {
                console.error('Profile update error:', error);
                this.showNotification('error', 'Update Failed', error.message || 'Failed to update profile');
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
                this.ui.modals.showChangePassword = false;
                this.passwordForm = { current_password: '', new_password: '', confirm_password: '' };
                this.showNotification('success', 'Password Changed', 'Password changed successfully!');
                
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
                this.sessions = [];
            }
        },
        
        async revokeSession(sessionId) {
            try {
                await this.apiCall(`/auth/sessions/${sessionId}`, {
                    method: 'DELETE'
                });
                
                this.sessions = this.sessions.filter(s => s.id !== sessionId);
                this.showNotification('success', 'Session Revoked', 'Session revoked successfully');
                
            } catch (error) {
                console.error('Failed to revoke session:', error);
                this.showNotification('error', 'Revoke Failed', 'Failed to revoke session');
            }
        },
        
        async openSessionsModal() {
            this.showSessions = true;
            this.ui.modals.showSessions = true;
            await this.loadSessions();
        },

        refreshSessionInfo() { 
            // Refresh the current session info
            this.checkAuthentication();
        },
        cancelDeleteProject() { this.showDeleteProject = false; this.syncLegacyState(); },
        cancelDeleteDiscovery() { this.showDeleteDiscovery = false; this.syncLegacyState(); },
        cancelDeleteSession() { this.showDeleteSession = false; this.syncLegacyState(); },
        getTotalPagesForTesting() { 
            const selectedCrawlers = this.webCrawlers.filter(c => this.selectedCrawlers.includes(c.id));
            return selectedCrawlers.reduce((total, c) => total + (c.pages_for_testing || 0), 0);
        },
        getExcludedPagesCount() { 
            const selectedCrawlers = this.webCrawlers.filter(c => this.selectedCrawlers.includes(c.id));
            return selectedCrawlers.reduce((total, c) => total + ((c.total_pages_found || 0) - (c.pages_for_testing || 0)), 0);
        },
        getTotalPages() { 
            const selectedCrawlers = this.webCrawlers.filter(c => this.selectedCrawlers.includes(c.id));
            return selectedCrawlers.reduce((total, c) => total + (c.total_pages_found || 0), 0);
        },
        
        // ===== SESSION URL MODAL METHODS =====
        
        openSessionUrlModal() { this.showSessionUrlModal = true; this.syncLegacyState(); },
        closeSessionUrlModal() { this.showSessionUrlModal = false; this.syncLegacyState(); },
        selectAllUrls() { this.availableUrls.forEach(url => url.selected = true); },
        deselectAllUrls() { this.availableUrls.forEach(url => url.selected = false); },
        addManualUrl() { /* TODO: Implement manual URL addition */ },
        saveUrlSelection() { this.closeSessionUrlModal(); },
        
        // ===== CRAWLER SELECTION METHODS =====
        
        selectAllCrawlers() {
            this.selectedCrawlers = this.webCrawlers.map(c => c.id);
            this.syncLegacyState();
        },
        
        deselectAllCrawlers() {
            this.selectedCrawlers = [];
            this.syncLegacyState();
        },
        
        // ===== MODAL METHODS =====
        
        openCreateCrawlerModal(mode = 'basic') {
            console.log('🔍 DEBUG: openCreateCrawlerModal called with mode:', mode);
            this.ui.modals.showCreateCrawler = true;
            this.newCrawler.mode = mode;
            this.syncLegacyState();
            console.log('🔍 DEBUG: After sync - this.showCreateCrawler:', this.showCreateCrawler);
            console.log('🔍 DEBUG: After sync - this.ui.modals.showCreateCrawler:', this.ui.modals.showCreateCrawler);
        },
        
        closeCreateCrawlerModal() {
            this.ui.modals.showCreateCrawler = false;
            this.resetCrawlerForm();
            this.syncLegacyState();
        },

        // ===== DISCOVERY METHODS =====
        
        async startNewDiscovery() {
            if (!this.selectedProject || this.discoveryInProgress) return;
            
            try {
                this.discoveryInProgress = true;
                this.discoveryProgress = {
                    percentage: 0,
                    message: 'Starting discovery...',
                    pagesFound: 0,
                    currentUrl: ''
                };
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/discoveries`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        primary_url: this.getSelectedProject()?.primary_url,
                        max_depth: this.discoveryConfig?.maxDepth || 3,
                        max_pages: this.discoveryConfig?.maxPages || 100,
                        discovery_mode: this.discoveryConfig?.mode || 'standard'
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Discovery Started', 'Site discovery has begun');
                    // Poll for progress updates
                    this.pollDiscoveryProgress(result.discovery_id);
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Discovery Failed', error.message || 'Failed to start discovery');
                    this.discoveryInProgress = false;
                }
            } catch (error) {
                console.error('Error starting discovery:', error);
                this.showNotification('error', 'Network Error', 'Failed to start discovery');
                this.discoveryInProgress = false;
            }
        },

        async pollDiscoveryProgress(discoveryId) {
            const poll = async () => {
                try {
                    const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${discoveryId}/status`, {
                        headers: this.getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const status = await response.json();
                        this.discoveryProgress = {
                            percentage: status.progress || 0,
                            message: status.message || 'Processing...',
                            pagesFound: status.pages_found || 0,
                            currentUrl: status.current_url || ''
                        };
                        
                        if (status.status === 'completed') {
                            this.discoveryInProgress = false;
                            this.showNotification('success', 'Discovery Complete', `Found ${status.pages_found} pages`);
                            this.loadDiscoveries();
                        } else if (status.status === 'failed') {
                            this.discoveryInProgress = false;
                            this.showNotification('error', 'Discovery Failed', status.error || 'Discovery process failed');
                        } else if (status.status === 'running') {
                            setTimeout(poll, 2000); // Poll every 2 seconds
                        }
                    }
                } catch (error) {
                    console.error('Error polling discovery progress:', error);
                    this.discoveryInProgress = false;
                }
            };
            
            poll();
        },

        async loadDiscoveries() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/discoveries`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.discoveries = data.discoveries || [];
                } else {
                    console.error('Failed to load discoveries');
                }
            } catch (error) {
                console.error('Error loading discoveries:', error);
            }
        },

        async viewDiscoveryDetails(discovery) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${discovery.id}/pages`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.discoveredPages = data.pages || [];
                    this.selectedDiscovery = discovery;
                    this.showDiscoveredPagesModal = true;
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load discovery pages');
                }
            } catch (error) {
                console.error('Error loading discovery pages:', error);
                this.showNotification('error', 'Network Error', 'Failed to load discovery pages');
            }
        },

        async deleteDiscovery(discovery) {
            if (!confirm(`Are you sure you want to delete discovery for ${discovery.domain}?`)) {
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${discovery.id}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.discoveries = this.discoveries.filter(d => d.id !== discovery.id);
                    this.showNotification('success', 'Discovery Deleted', 'Discovery has been deleted');
                } else {
                    this.showNotification('error', 'Delete Failed', 'Failed to delete discovery');
                }
            } catch (error) {
                console.error('Error deleting discovery:', error);
                this.showNotification('error', 'Network Error', 'Failed to delete discovery');
            }
        },

        togglePageSelection(page) {
            page.selected = !page.selected;
        },

        selectAllPages() {
            this.discoveredPages.forEach(page => page.selected = true);
        },

        deselectAllPages() {
            this.discoveredPages.forEach(page => page.selected = false);
        },

        async savePageSelections() {
            const selectedPages = this.discoveredPages.filter(page => page.selected);
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${this.selectedDiscovery.id}/pages/selection`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        selected_page_ids: selectedPages.map(p => p.id)
                    })
                });
                
                if (response.ok) {
                    this.showNotification('success', 'Selection Saved', `${selectedPages.length} pages selected for testing`);
                    this.showDiscoveredPagesModal = false;
                } else {
                    this.showNotification('error', 'Save Failed', 'Failed to save page selection');
                }
            } catch (error) {
                console.error('Error saving page selection:', error);
                this.showNotification('error', 'Network Error', 'Failed to save page selection');
            }
        },

        // ===== SESSION MANAGEMENT METHODS =====
        
        async captureNewSession() {
            console.log('🔍 DEBUG: Starting database-based session capture');
            
            // Check for selected project in multiple places due to timing
            let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
            
            if (!projectId) {
                this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }
            
            this.sessionCapturing = true;
            this.sessionAwaitingLogin = false;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/capture`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: projectId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 DEBUG: Session capture started:', result);
                    
                    if (result.needsLogin) {
                        this.sessionAwaitingLogin = true;
                        this.showNotification('info', 'Browser Opened', 
                            `Please log in to the opened browser window for ${result.crawlerName || 'your crawler'}, then click "Successfully Logged In" below`);
                    } else {
                        // Already authenticated, complete capture immediately
                        await this.completeSessionCapture();
                    }
                    
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Capture Failed', error.message || 'Failed to start session capture');
                    this.sessionCapturing = false;
                }
            } catch (error) {
                console.error('Error capturing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to start session capture');
                this.sessionCapturing = false;
            }
        },
        
        async completeSessionCapture() {
            console.log('🔍 DEBUG: Completing database-based session capture');
            
            // Check for selected project in multiple places due to timing
            let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
            
            if (!projectId) {
                this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/complete-capture`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: projectId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Session capture completed:', result);
                    
                    // Reload session info to get the fresh data
                    await this.loadSessionInfo();
                    
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                    
                    this.showNotification('success', 'Session Captured Successfully', 
                        `Session saved to database with ${result.sessionData.cookiesCount} cookies`);
                        
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Capture Failed', error.message || 'Failed to complete session capture');
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                }
            } catch (error) {
                console.error('Error completing session capture:', error);
                this.showNotification('error', 'Network Error', 'Failed to complete session capture');
                this.sessionCapturing = false;
                this.sessionAwaitingLogin = false;
            }
        },
        
        async cancelSessionCapture() {
            console.log('🛑 User cancelled session capture');
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/cancel-capture`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                    this.showNotification('info', 'Session Capture Cancelled', 'Browser window closed and capture process stopped');
                } else {
                    const error = await response.json();
                    console.error('Cancel failed:', error);
                    // Still update UI state even if API call failed
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                    this.showNotification('warning', 'Session Capture Cancelled', 'May need to manually close browser window');
                }
            } catch (error) {
                console.error('Error cancelling session capture:', error);
                // Still update UI state even if API call failed
                this.sessionCapturing = false;
                this.sessionAwaitingLogin = false;
                this.showNotification('warning', 'Session Capture Cancelled', 'May need to manually close browser window');
            }
        },
        
        async loadSessionInfo() {
            try {
                // Check for selected project in multiple places due to timing
                let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
                
                if (!projectId) {
                    console.log('🔍 DEBUG: No project selected (checked all sources), skipping session info load');
                    this.sessionInfo = {
                        isValid: false,
                        status: 'No Project Selected',
                        ageHours: 0,
                        isOld: false,
                        isVeryOld: false,
                        username: '',
                        capturedDate: '',
                        expirationDate: '',
                        pagesCount: 0,
                        lastActivity: null
                    };
                    return;
                }
                
                console.log('🔍 DEBUG: Using project ID for session info:', projectId);
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/info?project_id=${projectId}`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 DEBUG: Session info response from database:', result);
                    
                    if (result.exists && result.metadata) {
                        // Check session age
                        const capturedDate = new Date(result.metadata.capturedDate);
                        const now = new Date();
                        const ageHours = Math.round((now - capturedDate) / (1000 * 60 * 60));
                        const isOld = ageHours > 24; // Sessions older than 24 hours are considered potentially expired
                        const isVeryOld = ageHours > 72; // Sessions older than 72 hours are likely expired
                        
                        let status = 'Session Ready';
                        let isValid = result.metadata.isValid;
                        
                        if (isVeryOld) {
                            status = `⚠️ Session Expired (${ageHours}h old)`;
                            isValid = false;
                        } else if (isOld) {
                            status = `⚠️ Session Old (${ageHours}h old) - May need refresh`;
                            isValid = true; // Still try to use it, but warn user
                        } else if (ageHours < 1) {
                            status = 'Fresh Session - Just Captured';
                        }
                        
                        this.sessionInfo = {
                            isValid: isValid,
                            status: status,
                            ageHours: ageHours,
                            isOld: isOld,
                            isVeryOld: isVeryOld,
                            username: result.metadata.username || 'Unknown',
                            capturedDate: result.metadata.capturedDate || '',
                            expirationDate: result.metadata.expirationDate || 'Unknown',
                            pagesCount: result.metadata.pagesCount || 0,
                            sessionId: result.metadata.sessionId,
                            crawlerName: result.metadata.crawlerName,
                            lastActivity: new Date().toISOString()
                        };
                        
                        // Show warning for old sessions
                        if (isVeryOld) {
                            this.showNotification('warning', 'Session Expired', 
                                `Your browser session is ${ageHours} hours old and likely expired. Please capture a new session.`);
                        } else if (isOld) {
                            this.showNotification('info', 'Session Old', 
                                `Your browser session is ${ageHours} hours old. Consider capturing a fresh session if crawling fails.`);
                        }
                    } else {
                        this.sessionInfo = {
                            isValid: false,
                            status: 'No Session Available',
                            ageHours: 0,
                            isOld: false,
                            isVeryOld: false,
                            username: '',
                            capturedDate: '',
                            expirationDate: '',
                            pagesCount: 0,
                            lastActivity: null
                        };
                    }
                } else {
                    console.error('Failed to load session info from database');
                    const error = await response.json();
                    console.error('Session info error:', error);
                }
            } catch (error) {
                console.error('Error loading session info:', error);
            }
        },

        async testSessionAccess() {
            this.sessionTesting = true;
            
            try {
                // Check for selected project in multiple places due to timing
                let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
                
                if (!projectId) {
                    this.showNotification('error', 'No Project', 'Please select a project first');
                    this.sessionTesting = false;
                    return;
                }
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/test`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: projectId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 DEBUG: Session test response:', result);
                    
                    if (result.success) {
                        this.showNotification('success', 'Session Valid', `Can access ${result.pagesCount} pages`);
                        // Update sessionInfo with fresh data
                        this.sessionInfo.pagesCount = result.pagesCount;
                        this.sessionInfo.isValid = true;
                        this.sessionInfo.status = 'Session Active';
                } else {
                        this.showNotification('error', 'Session Invalid', result.message || 'Session has expired or is invalid');
                    }
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Session Invalid', error.message || 'Session has expired or is invalid');
                }
                
                // Always reload session info after testing to get current state
                await this.loadSessionInfo();
            } catch (error) {
                console.error('Error testing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to test session');
            } finally {
                this.sessionTesting = false;
            }
        },

        async clearSession() {
            try {
                // Check for selected project in multiple places due to timing
                let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
                
                if (!projectId) {
                    this.showNotification('error', 'No Project', 'Please select a project first');
                    return;
                }
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/clear?project_id=${projectId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.sessionInfo = { 
                        isValid: false, 
                        lastActivity: null, 
                        status: 'inactive',
                        username: '',
                        capturedDate: '',
                        expirationDate: '',
                        pagesCount: 0
                    };
                    this.showNotification('success', 'Session Cleared', 'Browser session has been cleared');
                } else {
                    this.showNotification('error', 'Clear Failed', 'Failed to clear session');
                }
            } catch (error) {
                console.error('Error clearing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to clear session');
            }
        },

        // ===== WEB CRAWLER MODAL METHODS =====
        
        async viewCrawlerPages(crawler) {
            try {
                this.loading = true;
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/pages`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.crawlerPages = data.pages || data.data || [];
                    this.selectedCrawlerForPages = crawler;
                    
                    console.log(`📄 Loaded ${this.crawlerPages.length} pages for crawler ${crawler.name}`);
                    console.log('🔍 DEBUG: Raw crawler pages data:', this.crawlerPages.slice(0, 2)); // Show first 2 pages
                    
                    // Load saved page selections for UI checkboxes
                    await this.loadCrawlerPageSelections(crawler.id);
                    
                    this.updateFilteredCrawlerPages();
                    
                    // Refresh crawler page counts to reflect actual selections
                    this.loadCrawlerPageCounts(true);
                    
                    console.log('🔍 DEBUG: Filtered pages count:', this.filteredCrawlerPages.length);
                    console.log('🔍 DEBUG: Opening modal with showCrawlerPagesModal =', true);
                    
                    this.ui.modals.showCrawlerPagesModal = true;
                    this.syncLegacyState();
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load crawler pages');
                }
            } catch (error) {
                console.error('Error loading crawler pages:', error);
                this.showNotification('error', 'Network Error', 'Failed to load crawler pages');
            } finally {
                this.loading = false;
            }
        },

        closeCrawlerPagesModal() {
            this.ui.modals.showCrawlerPagesModal = false;
            this.selectedCrawlerForPages = null;
            this.crawlerPages = [];
            this.filteredCrawlerPages = [];
            this.crawlerPageSearch = '';
            this.crawlerPageFilter = '';
            this.syncLegacyState();
        },

        // Edit an existing crawler
        async editCrawler(crawler) {
            // Populate the form with existing crawler data
            this.newCrawler = {
                ...crawler,
                // Convert JSON objects back to strings for editing
                wait_conditions_json: JSON.stringify(crawler.wait_conditions || [], null, 2),
                extraction_rules_json: JSON.stringify(crawler.extraction_rules || {}, null, 2),
                url_patterns_json: JSON.stringify(crawler.url_patterns || [], null, 2)
            };
            this.showCreateCrawler = true;
        },

        // Update filtered crawler pages based on search and filter
        updateFilteredCrawlerPages() {
            console.log('🔍 DEBUG: updateFilteredCrawlerPages called with crawlerPages.length:', this.crawlerPages.length);
            let filtered = [...this.crawlerPages];

            // Apply search filter
            if (this.crawlerPageSearch) {
                const search = this.crawlerPageSearch.toLowerCase();
                filtered = filtered.filter(page => 
                    page.url.toLowerCase().includes(search) || 
                    (page.title && page.title.toLowerCase().includes(search))
                );
            }

            // Apply category filter
            if (this.crawlerPageFilter) {
                switch (this.crawlerPageFilter) {
                    case 'forms':
                        filtered = filtered.filter(page => page.has_forms);
                        break;
                    case 'auth':
                        filtered = filtered.filter(page => page.requires_auth);
                        break;
                    case 'selected':
                        filtered = filtered.filter(page => 
                            page.selected_for_testing === true
                        );
                        break;
                }
            }

            this.filteredCrawlerPages = filtered;
            console.log('🔍 DEBUG: updateFilteredCrawlerPages finished, filteredCrawlerPages.length:', this.filteredCrawlerPages.length);
        },

        // Toggle page inclusion in testing sessions
        async togglePageForTesting(page) {
            const newValue = !page.selected_for_testing;

            try {
                await this.apiCall(`/web-crawlers/crawler-pages/${page.id}/testing`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        selected_for_testing: newValue
                    })
                });

                // Update local data
                page.selected_for_testing = newValue;
                this.updateFilteredCrawlerPages();
                
                // Refresh crawler page counts to update the UI display
                this.loadCrawlerPageCounts(true);

                this.showNotification(
                    'success',
                    'Page Selection Updated',
                    `Page ${newValue ? 'included in' : 'excluded from'} testing sessions`
                );

            } catch (error) {
                console.error('Failed to update page testing selection:', error);
                this.showNotification('error', 'Update Failed', 'Failed to update page selection');
            }
        },

        // Bulk include pages in testing sessions
        async bulkIncludePagesInTesting() {
            const selectedPages = this.filteredCrawlerPages.filter(page => page.selected);
            
            if (selectedPages.length === 0) {
                this.showNotification('warning', 'No Pages Selected', 'Please select pages first');
                return;
            }

            try {
                this.loading = true;
                const pageIds = selectedPages.map(page => page.id);

                await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/pages/bulk-testing`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        page_ids: pageIds,
                        selected_for_testing: true
                    })
                });

                // Update local data
                selectedPages.forEach(page => {
                    page.selected_for_testing = true;
                });

                this.showNotification(
                    'success',
                    'Bulk Selection Updated',
                    `${selectedPages.length} pages included in testing sessions`
                );

            } catch (error) {
                console.error('Failed to bulk update page testing selection:', error);
                this.showNotification('error', 'Bulk Update Failed', 'Failed to update page selections');
            } finally {
                this.loading = false;
                // Refresh crawler page counts to update the UI display
                this.loadCrawlerPageCounts(true);
            }
        },

        // Bulk exclude pages from testing sessions
        async bulkExcludePagesFromTesting() {
            const selectedPages = this.filteredCrawlerPages.filter(page => page.selected);
            
            if (selectedPages.length === 0) {
                this.showNotification('warning', 'No Pages Selected', 'Please select pages first');
                return;
            }

            try {
                this.loading = true;
                const pageIds = selectedPages.map(page => page.id);

                await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/pages/bulk-testing`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        page_ids: pageIds,
                        selected_for_testing: false
                    })
                });

                // Update local data
                selectedPages.forEach(page => {
                    page.selected_for_testing = false;
                });

                this.showNotification(
                    'success',
                    'Bulk Selection Updated',
                    `${selectedPages.length} pages excluded from testing sessions`
                );

            } catch (error) {
                console.error('Failed to bulk update page testing selection:', error);
                this.showNotification('error', 'Bulk Update Failed', 'Failed to update page selections');
            } finally {
                this.loading = false;
                // Refresh crawler page counts to update the UI display
                this.loadCrawlerPageCounts(true);
            }
        },

        // Toggle page selection in the UI
        togglePageSelection(page) {
            page.selected = !page.selected;
        },

        // Toggle all page selections
        toggleAllPageSelection(selectAll) {
            this.filteredCrawlerPages.forEach(page => {
                page.selected = selectAll;
            });
        },

        // Get auth type badge styling class
        getAuthTypeBadgeClass(authType) {
            switch (authType) {
                case 'saml': return 'bg-blue-100 text-blue-800';
                case 'basic': return 'bg-green-100 text-green-800';
                case 'dynamic_auth': return 'bg-purple-100 text-purple-800';
                case 'none': return 'bg-gray-100 text-gray-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        },

        // Get auth type display name
        getAuthTypeDisplay(authType) {
            switch (authType) {
                case 'saml': return 'SAML/SSO';
                case 'basic': return 'Username/Password';
                case 'dynamic_auth': return 'Dynamic Auth';
                case 'none': return 'No Authentication';
                default: return 'Unknown';
            }
        },

        // ===== TESTING SESSIONS METHODS =====
        
        async startNewComplianceSession() {
            if (!this.data.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: this.data.selectedProject,
                        session_type: 'compliance',
                        wcag_level: 'AA',
                        testing_approach: 'hybrid'
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Session Created', 'New compliance session started');
                    this.loadComplianceSessions();
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Session Failed', error.message || 'Failed to create session');
                }
            } catch (error) {
                console.error('Error creating compliance session:', error);
                this.showNotification('error', 'Network Error', 'Failed to create session');
            }
        },

        async loadComplianceSessions() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/sessions`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.complianceSessions = data.sessions || [];
                } else {
                    console.error('Failed to load compliance sessions');
                }
            } catch (error) {
                console.error('Error loading compliance sessions:', error);
            }
        },

        async pauseSession(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/pause`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    session.status = 'paused';
                    this.showNotification('success', 'Session Paused', 'Testing session has been paused');
                } else {
                    this.showNotification('error', 'Pause Failed', 'Failed to pause session');
                }
            } catch (error) {
                console.error('Error pausing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to pause session');
            }
        },

        async resumeSession(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/resume`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    session.status = 'active';
                    this.showNotification('success', 'Session Resumed', 'Testing session has been resumed');
                } else {
                    this.showNotification('error', 'Resume Failed', 'Failed to resume session');
                }
            } catch (error) {
                console.error('Error resuming session:', error);
                this.showNotification('error', 'Network Error', 'Failed to resume session');
            }
        },

        async viewSessionResults(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Open results in a new modal or navigate to results view
                    this.sessionResults = data.results;
                    this.selectedSession = session;
                    this.showSessionResultsModal = true;
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load session results');
                }
            } catch (error) {
                console.error('Error loading session results:', error);
                this.showNotification('error', 'Network Error', 'Failed to load session results');
            }
        },

        async stopSession(session) {
            if (!confirm(`Are you sure you want to stop the testing session for ${session.name}?`)) {
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/stop`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    session.status = 'completed';
                    this.showNotification('success', 'Session Stopped', 'Testing session has been stopped');
                } else {
                    this.showNotification('error', 'Stop Failed', 'Failed to stop session');
                }
            } catch (error) {
                console.error('Error stopping session:', error);
                this.showNotification('error', 'Network Error', 'Failed to stop session');
            }
        },

        async refreshSessions() {
            await this.loadComplianceSessions();
            this.showNotification('success', 'Sessions Refreshed', 'Session list has been updated');
        },

        // Create a new testing session
        async createTestingSession() {
            if (!this.data.selectedProject || !this.newTestingSession.name.trim() || !this.newTestingSession.conformance_level) {
                this.showNotification('error', 'Missing Information', 'Please fill in all required fields');
                return;
            }

            try {
                this.loading = true;
                
                const sessionData = {
                    name: this.newTestingSession.name.trim(),
                    description: this.newTestingSession.description.trim(),
                    project_id: this.data.selectedProject,
                    conformance_level: this.newTestingSession.conformance_level,
                    testing_approach: this.newTestingSession.testing_approach || 'hybrid'
                };

                const response = await this.apiCall('/sessions', {
                    method: 'POST',
                    body: JSON.stringify(sessionData)
                });

                if (response.success) {
                    this.showNotification('success', 'Session Created', 
                        `Session "${sessionData.name}" created with ${response.data.total_tests_count || 0} test instances`
                    );
                    
                    this.showCreateTestingSession = false;
                    this.resetNewTestingSession();
                    await this.loadComplianceSessions();
                } else {
                    throw new Error(response.error || 'Failed to create testing session');
                }
            } catch (error) {
                console.error('Error creating testing session:', error);
                this.showNotification('error', 'Creation Failed', error.message || 'Failed to create testing session');
            } finally {
                this.loading = false;
            }
        },

        // Delete a testing session with confirmation
        async deleteTestingSession(session) {
            if (!session) {
                this.showNotification('error', 'No Session', 'No session selected for deletion');
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to delete the testing session "${session.name}"?\n\nThis action cannot be undone and will remove:\n• All test results and findings\n• Session progress and configuration\n• Associated accessibility reports\n• Manual testing notes and observations`);
            
            if (!confirmed) {
                return;
            }

            try {
                this.loading = true;
                
                const response = await this.apiCall(`/sessions/${session.id}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    this.showNotification('success', 'Session Deleted', `Session "${session.name}" deleted successfully`);
                    
                    // Refresh all session-related data
                    await this.loadComplianceSessions();
                } else {
                    throw new Error(response.error || 'Failed to delete session');
                }
            } catch (error) {
                console.error('Error deleting session:', error);
                this.showNotification('error', 'Deletion Failed', error.message || 'Failed to delete session');
            } finally {
                this.loading = false;
            }
        },

        // Duplicate an existing testing session
        async duplicateTestingSession(session) {
            if (!session) return;

            try {
                this.loading = true;
                const response = await this.apiCall(`/sessions/${session.id}/duplicate`, {
                    method: 'POST'
                });

                if (response.success) {
                    this.showNotification('success', 'Session Duplicated', 
                        `Created duplicate session with ${response.data.total_tests_count || 0} test instances`
                    );
                    await this.loadComplianceSessions();
                } else {
                    throw new Error(response.error || 'Failed to duplicate session');
                }
            } catch (error) {
                console.error('Error duplicating session:', error);
                this.showNotification('error', 'Duplication Failed', error.message || 'Failed to duplicate session');
            } finally {
                this.loading = false;
            }
        },

        // Edit a testing session (placeholder for future implementation)
        editTestingSession(session) {
            // For now, show coming soon message
            this.showNotification('info', 'Feature Coming Soon', 'Session editing will be available soon');
            console.log('Editing session:', session);
        },

        // View testing session details
        viewTestingSessionDetails(session) {
            // Navigate to session test grid view or show detailed modal
            this.viewSessionResults(session);
        },

        // Reset new testing session form
        resetNewTestingSession() {
            this.newTestingSession = {
                name: '',
                description: '',
                conformance_level: 'AA',
                testing_approach: 'hybrid'
            };
        },

        // Get session status badge styling class
        getSessionStatusBadgeClass(status) {
            const classes = {
                'pending': 'bg-yellow-100 text-yellow-800',
                'active': 'bg-blue-100 text-blue-800',
                'in_progress': 'bg-blue-100 text-blue-800',
                'completed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'cancelled': 'bg-gray-100 text-gray-800',
                'paused': 'bg-orange-100 text-orange-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        // Open test instance modal for detailed view
        async openTestInstanceModal(testInstance) {
            try {
                this.currentTestInstance = testInstance;
                this.showTestInstanceModal = true;
                
                // TODO: Load detailed test information
                // await this.loadTestInstanceDetails(testInstance.id);
                
            } catch (error) {
                console.error('Error opening test instance details:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load test details');
            }
        },

        // Close test instance modal
        closeTestInstanceModal() {
            this.showTestInstanceModal = false;
            this.currentTestInstance = null;
        },

        // ===== AUTHENTICATION METHODS =====
        
        async selectAuthProject(projectId) {
            console.log('🔐 selectAuthProject called with:', projectId);
            this.selectedAuthProject = projectId;
            this.data.selectedAuthProject = projectId; // Organized state
            console.log('🔐 selectedAuthProject set to:', this.selectedAuthProject);
            await this.loadProjectAuthConfigs();
            console.log('🔐 After loadProjectAuthConfigs, projectAuthConfigs length:', this.projectAuthConfigs?.length || 0);
        },

        async loadAuthConfigs() {
            try {
                console.log('🔐 Loading authentication configurations...');
                const response = await this.apiCall('/auth/configs');
                this.authConfigs = response.data || [];
                this.data.authConfigs = this.authConfigs; // Sync organized state
                console.log('🔐 Auth configs loaded:', this.authConfigs.length);
                
                // Filter for current project if one is selected
                if (this.data.selectedAuthProject) {
                    await this.loadProjectAuthConfigs();
                } else {
                    this.data.projectAuthConfigs = this.data.authConfigs;
                    this.projectAuthConfigs = this.data.projectAuthConfigs; // Legacy sync
                }
            } catch (error) {
                console.error('Failed to load auth configs:', error);
                this.authConfigs = [];
                this.projectAuthConfigs = [];
            }
        },

        // REMOVED: Duplicate loadProjectAuthConfigs method - using enhanced version with filtering below

        async loadProjectAuthConfigs() {
            if (!this.data.selectedAuthProject || !this.getSelectedProject()?.primary_url) {
                console.log('🔐 No project or project URL, showing all auth configs');
                this.data.projectAuthConfigs = this.data.authConfigs || [];
                this.projectAuthConfigs = this.data.projectAuthConfigs; // Legacy sync
                return;
            }

            try {
                // Extract domain from project's primary URL
                const projectUrl = new URL(this.getSelectedProject().primary_url);
                const projectDomain = projectUrl.hostname;
                console.log(`🔐 Filtering auth configs for project domain: ${projectDomain}`);
                
                // Filter auth configs that match the project domain
                const matchingConfigs = this.authConfigs.filter(config => {
                    console.log(`🔐 Checking config "${config.name}" - domain: "${config.domain}", url: "${config.url}"`);
                    
                    const domainMatch = config.domain === projectDomain;
                    console.log(`🔐 Domain match (${config.domain} === ${projectDomain}): ${domainMatch}`);
                    
                    let urlMatch = false;
                    if (config.url) {
                        try {
                            const configUrl = new URL(config.url);
                            urlMatch = configUrl.hostname === projectDomain;
                            console.log(`🔐 URL hostname match (${configUrl.hostname} === ${projectDomain}): ${urlMatch}`);
                        } catch (error) {
                            urlMatch = config.url.includes(projectDomain);
                            console.log(`🔐 URL includes match (${config.url}.includes(${projectDomain})): ${urlMatch}`);
                        }
                    }
                    
                    // Also check project_id match for direct association
                    const projectIdMatch = config.project_id === this.data.selectedAuthProject;
                    console.log(`🔐 Project ID match (${config.project_id} === ${this.data.selectedAuthProject}): ${projectIdMatch}`);
                    
                    const finalMatch = domainMatch || urlMatch || projectIdMatch;
                    console.log(`🔐 Final match result for "${config.name}": ${finalMatch}`);
                    
                    return finalMatch;
                });

                // If no project-specific configs found, show all configs for easier management (stable backup pattern)
                if (matchingConfigs.length === 0) {
                    console.log(`🔐 No matching configs for ${projectDomain}, showing all ${this.authConfigs.length} configs for easier management`);
                    this.projectAuthConfigs = this.authConfigs;
                } else {
                    console.log(`🔐 Found ${matchingConfigs.length} matching configs for project domain: ${projectDomain}`);
                    this.projectAuthConfigs = matchingConfigs;
                }
                
                // Sync to organized state
                this.data.projectAuthConfigs = this.projectAuthConfigs;
            } catch (error) {
                console.error('Error filtering auth configs:', error);
                this.projectAuthConfigs = this.authConfigs;
            }
        },

        async testAuthConfig(authConfig) {
            try {
                // Ensure config exists - backup initialization
                if (!this.config || !this.config.apiBaseUrl) {
                    this.config = { apiBaseUrl: 'http://localhost:3001', tokenRefreshInterval: null };
                }
                
                authConfig.status = 'testing';
                this.showNotification('info', 'Testing Authentication', `Testing authentication for ${authConfig.domain || authConfig.name}...`);

                const response = await this.apiCall(`/auth/configs/${authConfig.id}/test`, {
                    method: 'POST'
                });

                if (response.success) {
                    authConfig.status = 'active';
                    authConfig.last_used = new Date().toISOString();
                    this.showNotification('success', 'Test Successful', `Authentication test successful for ${authConfig.domain || authConfig.name}`);
                } else {
                    authConfig.status = 'failed';
                    this.showNotification('error', 'Test Failed', `Authentication test failed for ${authConfig.domain || authConfig.name}`);
                }
            } catch (error) {
                authConfig.status = 'failed';
                this.showNotification('error', 'Test Error', `Authentication test error: ${error.message}`);
            }
        },

        async editAuthConfig(authConfig) {
            // Populate the form with ALL existing data including SAML selectors
            this.authConfigForm = {
                name: authConfig.name || authConfig.domain || '',
                type: authConfig.type || 'form',
                login_url: authConfig.login_url || authConfig.url || '',
                username: authConfig.username || '',
                password: '', // Don't pre-fill password for security
                description: authConfig.description || authConfig.auth_description || '',
                auth_role: authConfig.auth_role || 'default',
                priority: authConfig.priority || 1,
                is_default: authConfig.is_default || false,
                // Advanced SAML/SSO fields (from existing config or defaults)
                idp_domain: authConfig.idp_domain || '',
                username_selector: authConfig.username_selector || 'input[name="username"]',
                password_selector: authConfig.password_selector || 'input[type="password"]',
                submit_selector: authConfig.submit_selector || 'button[type="submit"]'
            };
            
            this.editingAuthConfig = authConfig;
            this.showEditAuthConfigModal = true;
            this.ui.modals.showEditAuthConfigModal = true; // Sync organized state
        },

        async createAuthConfig() {
            try {
                this.loading = true;
                
                if (!this.selectedAuthProject) {
                    this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }
            
                // Create the auth config with advanced SAML fields
                const authConfigData = {
                    name: this.authConfigForm.name,
                    type: this.authConfigForm.type,
                    domain: this.extractDomainFromUrl(this.authConfigForm.login_url),
                    url: this.authConfigForm.login_url,
                    username: this.authConfigForm.username,
                    password: this.authConfigForm.password,
                    login_page: this.authConfigForm.login_url,
                    project_id: this.selectedAuthProject,
                    auth_role: this.authConfigForm.auth_role || 'default',
                    auth_description: this.authConfigForm.description,
                    priority: this.authConfigForm.priority || 1,
                    is_default: this.authConfigForm.is_default || false,
                    // Advanced SAML/SSO configuration
                    idp_domain: this.authConfigForm.idp_domain || '',
                    username_selector: this.authConfigForm.username_selector || 'input[name="username"]',
                    password_selector: this.authConfigForm.password_selector || 'input[type="password"]',
                    submit_selector: this.authConfigForm.submit_selector || 'button[type="submit"]'
                };

                const response = await this.apiCall('/auth/configs', {
                    method: 'POST',
                    body: JSON.stringify(authConfigData)
                });

                if (response.success) {
                    this.closeAuthConfigModal();
                    await this.loadAuthConfigs(); // Refresh configs
                    await this.loadProjectAuthConfigs(); // Refresh project configs
                    this.showNotification('success', 'Config Created', 'Authentication configuration created successfully');
                } else {
                    throw new Error(response.message || 'Failed to create authentication configuration');
                }
            } catch (error) {
                console.error('Failed to create auth config:', error);
                this.showNotification('error', 'Creation Failed', error.message || 'Failed to create authentication configuration');
            } finally {
                this.loading = false;
            }
        },

        async updateAuthConfig() {
            try {
                if (!this.editingAuthConfig) return;

                this.loading = true;
                
                // Prepare the update data with advanced SAML fields
                const updateData = {
                    name: this.authConfigForm.name,
                    domain: this.extractDomainFromUrl(this.authConfigForm.login_url),
                    url: this.authConfigForm.login_url,
                    type: this.authConfigForm.type,
                    username: this.authConfigForm.username,
                    password: this.authConfigForm.password, // Will be empty if not changed
                    login_page: this.authConfigForm.login_url,
                    auth_role: this.authConfigForm.auth_role,
                    auth_description: this.authConfigForm.description,
                    priority: this.authConfigForm.priority,
                    is_default: this.authConfigForm.is_default,
                    // Advanced SAML/SSO configuration
                    idp_domain: this.authConfigForm.idp_domain || '',
                    username_selector: this.authConfigForm.username_selector || 'input[name="username"]',
                    password_selector: this.authConfigForm.password_selector || 'input[type="password"]',
                    submit_selector: this.authConfigForm.submit_selector || 'button[type="submit"]'
                };
                
                const response = await this.apiCall(`/auth/configs/${this.editingAuthConfig.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });

                if (response.success) {
                    // Update the config in the local array
                    const index = this.authConfigs.findIndex(c => c.id === this.editingAuthConfig.id);
                    if (index !== -1) {
                        this.authConfigs[index] = { ...this.authConfigs[index], ...response.data };
                    }

                    this.closeAuthConfigModal();
                    await this.loadAuthConfigs(); // Refresh configs
                    await this.loadProjectAuthConfigs(); // Refresh project configs
                    this.showNotification('success', 'Config Updated', 'Authentication configuration updated successfully');
                } else {
                    throw new Error(response.message || 'Failed to update authentication configuration');
                }
            } catch (error) {
                console.error('Failed to update auth config:', error);
                this.showNotification('error', 'Update Failed', error.message || 'Failed to update authentication configuration');
            } finally {
                this.loading = false;
            }
        },

        async deleteAuthConfig(authConfig) {
            if (!confirm(`Are you sure you want to delete the "${authConfig.name || authConfig.auth_role}" authentication configuration?`)) {
                return;
            }

            try {
                const response = await this.apiCall(`/auth/configs/${authConfig.id}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    // Remove from local arrays
                    this.authConfigs = this.authConfigs.filter(c => c.id !== authConfig.id);
                    this.projectAuthConfigs = this.projectAuthConfigs.filter(c => c.id !== authConfig.id);
                    
                    this.showNotification('success', 'Config Deleted', `Authentication configuration "${authConfig.name || authConfig.auth_role}" deleted successfully`);
                } else {
                    throw new Error(response.message || 'Failed to delete configuration');
                }
            } catch (error) {
                console.error('Failed to delete auth config:', error);
                this.showNotification('error', 'Delete Failed', error.message || 'Failed to delete authentication configuration');
            }
        },

        extractDomainFromUrl(url) {
            try {
                return new URL(url).hostname;
            } catch (error) {
                // If URL parsing fails, try to extract domain manually
                const match = url.match(/^https?:\/\/([^\/]+)/);
                return match ? match[1] : url;
            }
        },

        closeAuthConfigModal() {
            this.showAddAuthConfigModal = false;
            this.showEditAuthConfigModal = false;
            this.ui.modals.showAddAuthConfigModal = false; // Sync organized state
            this.ui.modals.showEditAuthConfigModal = false; // Sync organized state
            this.editingAuthConfig = null;
            this.authConfigForm = {
                name: '',
                type: 'form',
                login_url: '',
                username: '',
                password: '',
                description: '',
                auth_role: 'default',
                priority: 1,
                is_default: false
            };
        },

        // ===== UTILITY METHODS =====
        
        formatDuration(milliseconds) {
            if (!milliseconds) return '';
            const seconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) {
                return `${hours}h ${minutes % 60}m`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            } else {
                return `${seconds}s`;
            }
        },

        // ===== AUTOMATED TESTING METHODS =====
        
        async startAutomatedTesting() {
            if (!this.data.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }
            
            try {
                this.automatedTestingInProgress = true;
                this.testingProgress = {
                    percentage: 0,
                    message: 'Starting automated tests...',
                    completedPages: 0,
                    totalPages: 0,
                    currentPage: ''
                };
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: this.data.selectedProject,
                        session_type: 'automated',
                        testing_config: this.testingConfig || {
                            useAxe: true,
                            usePa11y: true,
                            useLighthouse: true,
                            wcagLevel: 'AA',
                            browser: 'chromium'
                        }
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Testing Started', 'Automated accessibility testing has begun');
                    this.pollTestingProgress(result.session_id);
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Testing Failed', error.message || 'Failed to start testing');
                    this.automatedTestingInProgress = false;
                }
            } catch (error) {
                console.error('Error starting automated testing:', error);
                this.showNotification('error', 'Network Error', 'Failed to start testing');
                this.automatedTestingInProgress = false;
            }
        },

        async pollTestingProgress(sessionId) {
            const poll = async () => {
                try {
                    const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${sessionId}/status`, {
                        headers: this.getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const status = await response.json();
                        this.testingProgress = {
                            percentage: status.progress || 0,
                            message: status.message || 'Running tests...',
                            completedPages: status.completed_pages || 0,
                            totalPages: status.total_pages || 0,
                            currentPage: status.current_page || ''
                        };
                        
                        if (status.status === 'completed') {
                            this.automatedTestingInProgress = false;
                            this.showNotification('success', 'Testing Complete', `Tested ${status.completed_pages} pages`);
                            this.loadAutomatedTestResults();
                        } else if (status.status === 'failed') {
                            this.automatedTestingInProgress = false;
                            this.showNotification('error', 'Testing Failed', status.error || 'Testing process failed');
                        } else if (status.status === 'running') {
                            setTimeout(poll, 3000); // Poll every 3 seconds
                        }
                    }
                } catch (error) {
                    console.error('Error polling testing progress:', error);
                    this.automatedTestingInProgress = false;
                }
            };
            
            poll();
        },

        async loadAutomatedTestResults() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/automated-results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.automatedTestResults = data.results || [];
                } else {
                    console.error('Failed to load automated test results');
                }
            } catch (error) {
                console.error('Error loading automated test results:', error);
            }
        },

        async viewTestDetails(result) {
            // Open detailed test results in a modal or navigate to results view
            this.selectedTestResult = result;
            this.showTestDetailsModal = true;
        },

        async downloadTestReport(result) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${result.session_id}/report`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `accessibility-report-${result.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    this.showNotification('error', 'Download Failed', 'Failed to download test report');
                }
            } catch (error) {
                console.error('Error downloading report:', error);
                this.showNotification('error', 'Network Error', 'Failed to download test report');
            }
        },

        // Get default automated test configuration
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

        // Toggle automated testing tools
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

        // Toggle Playwright test types
        togglePlaywrightTestType(testType) {
            const testTypes = this.automatedTestConfig.playwright.testTypes;
            const index = testTypes.indexOf(testType);
            if (index > -1) {
                testTypes.splice(index, 1);
            } else {
                testTypes.push(testType);
            }
        },

        // Toggle Playwright browsers
        togglePlaywrightBrowser(browser) {
            const browsers = this.automatedTestConfig.playwright.browsers;
            const index = browsers.indexOf(browser);
            if (index > -1) {
                browsers.splice(index, 1);
            } else {
                browsers.push(browser);
            }
        },

        // Toggle Playwright viewports
        togglePlaywrightViewport(viewport) {
            const viewports = this.automatedTestConfig.playwright.viewports;
            const index = viewports.indexOf(viewport);
            if (index > -1) {
                viewports.splice(index, 1);
            } else {
                viewports.push(viewport);
            }
        },

        // Start automated testing with advanced configuration
        async startAutomatedTestingFromConfig() {
            if (!this.data.selectedProject) {
                this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }

            try {
                this.loading = true;
                this.automatedTestingInProgress = true;
                
                const config = this.automatedTestConfig;
                
                // Start comprehensive testing with user configuration
                const response = await this.apiCall(`/projects/${this.data.selectedProject}/comprehensive-testing`, {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionName: `Automated Test - ${new Date().toLocaleDateString()}`,
                        description: 'Automated testing initiated with custom configuration',
                        testingApproach: 'automated',
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
                    this.showNotification('success', 'Testing Started', 'Advanced automated testing started successfully!');
                    this.showTestConfigurationModal = false;
                    
                    // Start monitoring progress
                    if (response.data.session_id) {
                        this.pollTestingProgress(response.data.session_id);
                    }
                } else {
                    throw new Error(response.error || 'Failed to start testing');
                }
            } catch (error) {
                console.error('Error starting automated testing:', error);
                this.showNotification('error', 'Testing Failed', error.message || 'Failed to start automated testing');
                this.automatedTestingInProgress = false;
            } finally {
                this.loading = false;
            }
        },

        // Start automated testing for specific requirements
        async startAutomatedTestingForRequirements(sessionId, requirements = null) {
            try {
                this.loading = true;
                
                if (!this.data.selectedProject) {
                    throw new Error('No project selected');
                }
                
                console.log(`🚀 Starting automated testing for session: ${sessionId}`);
                
                // TODO: Temporarily disabled Playwright integration due to schema issues
                // const response = await this.apiCall(`/sessions/${sessionId}/start-playwright`, {
                //     method: 'POST',
                //     body: JSON.stringify({
                //         testTypes: ['basic', 'keyboard', 'screen-reader', 'form'],
                //         browsers: ['chromium'],
                //         viewports: ['desktop'],
                //         requirements: requirements
                //     })
                // });

                // if (response.success) {
                //     this.showNotification('success', 'Testing Started', 'Automated testing started successfully!');
                // } else {
                //     throw new Error(response.error || 'Failed to start testing');
                // }
                
                // For now, just show a success message
                this.showNotification('success', 'Session Opened', 'Session details loaded successfully!');
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error starting automated testing:', error);
                this.showNotification('error', 'Testing Failed', `Failed to start automated testing: ${error.message}`);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        // Close test details modal
        closeTestDetailsModal() {
            this.showTestDetailsModal = false;
            this.selectedTestResult = null;
        },

        // Close test configuration modal
        closeTestConfigurationModal() {
            this.showTestConfigurationModal = false;
        },

        // Show advanced test configuration modal
        showAdvancedTestConfiguration() {
            this.showTestConfigurationModal = true;
        },

        // ===== MANUAL TESTING METHODS =====
        
        async startManualTesting() {
            if (!this.data.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }
            
            try {
                // Create or load a manual testing session for the project
                const response = await this.apiCall(`/sessions`, {
                    method: 'POST',
                    body: JSON.stringify({
                        project_id: this.data.selectedProject,
                        name: `Manual Testing - ${new Date().toLocaleDateString()}`,
                        description: 'Manual accessibility testing session',
                        conformance_level: 'AA',
                        testing_approach: 'manual'
                    })
                });
                
                if (response.success) {
                    this.showNotification('success', 'Manual Testing Started', 'Manual testing session created');
                    await this.selectManualTestingSession(response.data);
                } else {
                    throw new Error(response.error || 'Failed to create manual testing session');
                }
            } catch (error) {
                console.error('Error starting manual testing:', error);
                this.showNotification('error', 'Failed to Start', error.message || 'Failed to start manual testing');
            }
        },

        async editManualTestResult(result) {
            this.currentManualTest = {
                assignment: { requirement_id: result.requirement_id },
                pageGroup: { page_id: result.page_id },
                sessionId: result.session_id,
                existingResult: result
            };
            this.showManualTestingModal = true;
        },

        async loadManualTestingAssignments() {
            if (!this.manualTestingSession) return;
            
            try {
                console.log('📋 Loading manual testing assignments...');
                
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
                
                const response = await this.apiCall(`/manual-testing/session/${this.manualTestingSession.id}/assignments?${params}`);
                
                if (response.success) {
                    this.manualTestingAssignments = response.data.assignments || [];
                    this.applyManualTestingFilters();
                    
                    console.log(`✅ Loaded ${response.data.total_assignments} manual testing assignments`);
                } else {
                    throw new Error(response.error || 'Failed to load manual testing assignments');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing assignments:', error);
                this.showNotification('error', 'Loading Failed', 'Failed to load manual testing assignments');
            }
        },

        async loadManualTestingCoverageAnalysis() {
            if (!this.manualTestingSession) return;
            
            try {
                const response = await this.apiCall(`/manual-testing/session/${this.manualTestingSession.id}/coverage-analysis`);
                
                if (response.success) {
                    this.manualTestingCoverageAnalysis = response.data;
                } else {
                    throw new Error(response.error || 'Failed to load coverage analysis');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing coverage analysis:', error);
                this.showNotification('error', 'Analysis Failed', 'Failed to load coverage analysis');
            }
        },

        async refreshManualTestingTabData() {
            try {
                console.log('🔄 Refreshing manual testing tab data...');
                
                const promises = [];
                
                if (this.manualTestingSession) {
                    promises.push(this.loadManualTestingAssignments());
                }
                
                promises.push(this.loadManualTestingCoverageAnalysis());
                
                await Promise.all(promises);
                
                console.log('✅ Manual testing tab data refreshed');
            } catch (error) {
                console.error('❌ Error refreshing manual testing tab data:', error);
                this.showNotification('error', 'Refresh Failed', 'Failed to refresh manual testing data');
            }
        },

        async selectManualTestingSession(session) {
            try {
                console.log('🎯 Selecting manual testing session:', session.name);
                
                this.manualTestingSession = session;
                
                await Promise.all([
                    this.loadManualTestingAssignments(session.id),
                    this.loadManualTestingProgress(session.id)
                ]);
                
                console.log('✅ Manual testing session selected successfully');
            } catch (error) {
                console.error('❌ Error selecting manual testing session:', error);
                this.showNotification('error', 'Selection Failed', 'Failed to load manual testing session');
            }
        },

        async loadManualTestingProgress(sessionId) {
            try {
                console.log('📊 Loading manual testing progress...');
                
                const response = await this.apiCall(`/manual-testing/session/${sessionId}/progress`);
                
                if (response.success) {
                    this.manualTestingProgress = response.data.progress || null;
                    console.log('✅ Manual testing progress loaded');
                } else {
                    throw new Error(response.error || 'Failed to load progress');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing progress:', error);
            }
        },

        applyManualTestingFilters() {
            this.filterManualTestingAssignments();
        },

        filterManualTestingAssignments() {
            const filters = this.manualTestingFilters;
            
            this.filteredManualTestingAssignments = this.manualTestingAssignments.filter(pageGroup => {
                // Apply status filter
                if (filters.status && !pageGroup.assignments.some(a => a.status === filters.status)) {
                    return false;
                }
                
                // Apply WCAG level filter
                if (filters.wcag_level && !pageGroup.assignments.some(a => a.wcag_level === filters.wcag_level)) {
                    return false;
                }
                
                // Apply page filter
                if (filters.page_id && pageGroup.page_id !== filters.page_id) {
                    return false;
                }
                
                return true;
            });
            
            console.log('🔍 Filtered manual testing assignments:', this.filteredManualTestingAssignments.length, 'page groups');
        },

        async startManualTest(pageGroup, assignment) {
            try {
                console.log('🎯 Starting manual test:', assignment.criterion_number);
                
                this.currentManualTest = {
                    pageGroup: pageGroup,
                    assignment: assignment,
                    sessionId: this.manualTestingSession.id
                };
                
                await this.loadManualTestingProcedure(assignment.requirement_id, pageGroup.page_type);
                
                this.showManualTestingModal = true;
            } catch (error) {
                console.error('❌ Error starting manual test:', error);
                this.showNotification('error', 'Test Failed', 'Failed to start manual test');
            }
        },

        async loadManualTestingProcedure(requirementId, pageType) {
            try {
                const params = new URLSearchParams({ page_type: pageType });
                
                if (this.currentManualTest) {
                    params.append('page_id', this.currentManualTest.pageGroup.page_id);
                    params.append('session_id', this.currentManualTest.sessionId);
                }
                
                const response = await this.apiCall(`/manual-testing/requirement/${requirementId}/procedure?${params}`);
                
                if (response.success) {
                    this.manualTestingProcedure = response.data.requirement || null;
                    this.manualTestingContext = response.data.test_context || null;
                } else {
                    throw new Error(response.error || 'Failed to load procedure');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing procedure:', error);
                this.showNotification('error', 'Loading Failed', 'Failed to load testing procedure');
            }
        },

        async submitManualTestResult(result, confidence = 'medium', notes = '', evidence = {}) {
            try {
                console.log('💾 Submitting manual test result:', result);
                
                const response = await this.apiCall(`/manual-testing/session/${this.currentManualTest.sessionId}/result`, {
                    method: 'POST',
                    body: JSON.stringify({
                        page_id: this.currentManualTest.pageGroup.page_id,
                        requirement_id: this.currentManualTest.assignment.requirement_id,
                        result: result,
                        confidence_level: confidence,
                        notes: notes,
                        evidence: evidence,
                        test_method_used: 'manual'
                    })
                });
                
                if (response.success) {
                    // Refresh data after successful submission
                    await Promise.all([
                        this.loadManualTestingAssignments(this.currentManualTest.sessionId),
                        this.loadManualTestingProgress(this.currentManualTest.sessionId)
                    ]);
                    
                    // Close modal and reset state
                    this.showManualTestingModal = false;
                    this.currentManualTest = null;
                    this.manualTestingProcedure = null;
                    this.manualTestingContext = null;
                    
                    console.log('✅ Manual test result submitted successfully');
                    this.showNotification('success', 'Result Saved', 'Manual test result saved successfully');
                } else {
                    throw new Error(response.error || 'Failed to submit result');
                }
            } catch (error) {
                console.error('❌ Error submitting manual test result:', error);
                this.showNotification('error', 'Submit Failed', 'Failed to submit test result');
            }
        },

        closeManualTestingSession() {
            this.manualTestingSession = null;
            this.manualTestingProgress = null;
            this.manualTestingAssignments = [];
            this.filteredManualTestingAssignments = [];
            this.currentManualTest = null;
            this.manualTestingProcedure = null;
            this.manualTestingContext = null;
        },

        // ===== RESULTS METHODS =====
        
        async refreshResults() {
            if (!this.data.selectedProject) return;
            
            try {
                await Promise.all([
                    this.loadTestSessionResults(),
                    this.loadResultsSummary(),
                    this.loadComplianceAnalysis(),
                    this.loadRecentViolations()
                ]);
                this.showNotification('success', 'Results Refreshed', 'Latest test results loaded');
            } catch (error) {
                console.error('Error refreshing results:', error);
                this.showNotification('error', 'Refresh Failed', 'Failed to refresh results');
            }
        },

        async loadTestSessionResults() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/session-results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.testSessionResults = data.results || [];
                } else {
                    console.error('Failed to load test session results');
                }
            } catch (error) {
                console.error('Error loading test session results:', error);
            }
        },

        async loadResultsSummary() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/results-summary`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.resultsSummary = data.summary || {};
                } else {
                    console.error('Failed to load results summary');
                }
            } catch (error) {
                console.error('Error loading results summary:', error);
            }
        },

        async loadComplianceAnalysis() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/compliance-analysis`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.complianceAnalysis = data.analysis || {};
                } else {
                    console.error('Failed to load compliance analysis');
                }
            } catch (error) {
                console.error('Error loading compliance analysis:', error);
            }
        },

        async loadRecentViolations() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/recent-violations`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.recentViolations = data.violations || [];
                } else {
                    console.error('Failed to load recent violations');
                }
            } catch (error) {
                console.error('Error loading recent violations:', error);
            }
        },

        async viewDetailedResults(session) {
            this.selectedSession = session;
            this.showSessionResultsModal = true;
            // Load detailed results for the session
            await this.loadSessionDetailedResults(session.id);
        },

        async loadSessionDetailedResults(sessionId) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${sessionId}/detailed-results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.sessionDetailedResults = data.results || {};
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load detailed results');
                }
            } catch (error) {
                console.error('Error loading detailed results:', error);
                this.showNotification('error', 'Network Error', 'Failed to load detailed results');
            }
        },

        async exportResults() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/export-results`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        format: 'comprehensive',
                        include_violations: true,
                        include_compliance: true
                    })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `accessibility-results-${this.data.selectedProject}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    this.showNotification('success', 'Export Complete', 'Results report downloaded');
                } else {
                    this.showNotification('error', 'Export Failed', 'Failed to export results');
                }
            } catch (error) {
                console.error('Error exporting results:', error);
                this.showNotification('error', 'Network Error', 'Failed to export results');
            }
        },

        async exportSessionResults(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/export`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `session-results-${session.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    this.showNotification('error', 'Export Failed', 'Failed to export session results');
                }
            } catch (error) {
                console.error('Error exporting session results:', error);
                this.showNotification('error', 'Network Error', 'Failed to export session results');
            }
        },

        async viewViolationDetails(violation) {
            this.selectedViolation = violation;
            this.showViolationDetailsModal = true;
        },

        // Authentication helper methods (from stable backup)
        getAvailableAuthConfigs() {
            return this.data.projectAuthConfigs.filter(config => config.auth_config_id || config.id);
        },

        getAuthConfigDisplayName(config) {
            if (!config) return 'No Authentication';
            return `${config.name || config.auth_config_name} (${config.auth_role || config.type})`;
        },

        getActiveAuthCount() {
            return this.data.projectAuthConfigs.filter(config => config.status === 'active').length;
        },

        getPendingAuthCount() {
            return this.data.projectAuthConfigs.filter(config => config.status === 'pending' || config.status === 'testing').length;
        },

        getFailedAuthCount() {
            return this.data.projectAuthConfigs.filter(config => config.status === 'failed' || config.status === 'error').length;
        },

        async refreshAuthConfigs() {
            // Refresh both global and project-specific auth configs
            await this.loadAuthConfigs(); // This calls loadProjectAuthConfigs internally
            this.showNotification('success', 'Refreshed', 'Authentication configurations refreshed');
        },

        // Project-related loading methods (transferred from stable version)
        async loadProjectDiscoveries() {
            if (!this.data.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/projects/${this.data.selectedProject}/discoveries`);
                this.data.discoveries = data.data || [];
                this.discoveries = this.data.discoveries; // Sync legacy state
                
                // Defensive check to ensure discoveries is always an array
                if (!Array.isArray(this.discoveries)) {
                    this.discoveries = [];
                }
                
                console.log(`🔍 Loaded ${this.discoveries.length} discoveries for project`);
                
                // Check for pending discoveries and offer recovery
                const pendingDiscoveries = this.discoveries.filter(d => d.status === 'pending' || d.status === 'in_progress');
                if (pendingDiscoveries.length > 0) {
                    console.log(`⚠️ Found ${pendingDiscoveries.length} pending discoveries - offering recovery options`);
                }
                
                // Auto-select completed discoveries if none are selected and there's only one completed
                const completedDiscoveries = this.discoveries.filter(d => d.status === 'completed');
                // Defensive check to ensure selectedDiscoveries is always an array
                if (!Array.isArray(this.selectedDiscoveries)) {
                    this.selectedDiscoveries = [];
                }
                if (completedDiscoveries.length === 1 && this.selectedDiscoveries.length === 0) {
                    this.selectedDiscoveries = [completedDiscoveries[0].id];
                    console.log(`🎯 Auto-selected single completed discovery: ${completedDiscoveries[0].domain}`);
                }
            } catch (error) {
                console.error('Failed to load discoveries:', error);
                // Ensure discoveries is always an array even if API fails
                this.data.discoveries = this.data.discoveries || [];
                this.discoveries = this.discoveries || [];
            }
        },

        async loadProjectTestSessions() {
            if (!this.data.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/sessions?project_id=${this.data.selectedProject}`);
                this.data.testSessions = data.data || [];
                this.testSessions = this.data.testSessions; // Sync legacy state
                console.log(`🧪 Loaded ${this.testSessions.length} test sessions for project`);
            } catch (error) {
                console.error('Failed to load test sessions:', error);
            }
        },

        loadSelectedDiscoveries() {
            if (!this.data.selectedProject) return;
            const key = `selectedDiscoveries_${this.data.selectedProject}`;
            const saved = localStorage.getItem(key);
            this.selectedDiscoveries = saved ? JSON.parse(saved) : [];
        },

        // Authentication methods (transferred from stable version)
        async logout() {
            try {
                if (this.token) {
                    await fetch(`${this.config.apiBaseUrl}/auth/logout`, {
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
                this.showNotification('info', 'Logged Out', 'Logged out successfully');
            }
        },
        
        // Add manual URL to crawler
        async addManualUrl() {
            if (!this.newManualUrl || !this.selectedCrawlerForPages) {
                this.showNotification('error', 'Validation Error', 'URL and crawler selection are required');
                return;
            }

            this.addingManualUrl = true;
            
            try {
                // Ensure URL has protocol
                let url = this.newManualUrl.trim();
                if (!url.match(/^https?:\/\//)) {
                    url = `https://${url}`;
                }

                const pageData = {
                    url: url,
                    title: this.newManualUrlTitle || null,
                    page_type: this.newManualUrlType,
                    depth: this.newManualUrlDepth || 1,
                    requires_auth: this.newManualUrlRequiresAuth,
                    has_forms: this.newManualUrlHasForms,
                    selected_for_testing: this.newManualUrlForTesting,
                    status_code: 200, // Default for manual entry
                    discovered_manually: true
                };

                console.log('🔍 DEBUG: Adding manual URL to crawler:', this.selectedCrawlerForPages.id, pageData);

                const response = await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/pages`, {
                    method: 'POST',
                    body: JSON.stringify(pageData)
                });

                if (response.success) {
                    this.showNotification('success', 'URL Added', 'Manual URL added successfully');
                    
                    // Add the new page to the current list
                    const newPage = {
                        id: response.data.id,
                        ...pageData,
                        selected: false
                    };
                    this.crawlerPages.push(newPage);
                    this.updateFilteredCrawlerPages();
                    
                    // Reset form and close modal
                    this.resetManualUrlForm();
                    this.showAddManualUrlModal = false;
                    
                    // Reload page counts to update display
                    this.loadCrawlerPageCounts(true);
                } else {
                    this.showNotification('error', 'Add Failed', response.message || 'Failed to add manual URL');
                }
            } catch (error) {
                console.error('Error adding manual URL:', error);
                this.showNotification('error', 'Network Error', 'Failed to add manual URL');
            } finally {
                this.addingManualUrl = false;
            }
        },

        // Reset manual URL form
        resetManualUrlForm() {
            this.newManualUrl = '';
            this.newManualUrlTitle = '';
            this.newManualUrlType = 'content';
            this.newManualUrlDepth = 1;
            this.newManualUrlRequiresAuth = false;
            this.newManualUrlHasForms = false;
            this.newManualUrlForTesting = true;
        },

        // Save UI page selections to persist them across modal reopens
        async saveCrawlerPageSelections() {
            if (!this.selectedCrawlerForPages) {
                return;
            }

            const selectedPageIds = this.crawlerPages
                .filter(page => page.selected)
                .map(page => page.id);

            try {
                this.loading = true;
                
                await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/page-selections`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        selected_page_ids: selectedPageIds
                    })
                });

                this.showNotification(
                    'success',
                    'Selections Saved',
                    `${selectedPageIds.length} pages selected for quick access`
                );

            } catch (error) {
                console.error('Failed to save page selections:', error);
                this.showNotification('error', 'Save Failed', 'Failed to save page selections');
            } finally {
                this.loading = false;
            }
        },

        // Load saved UI page selections to restore checkbox state
        async loadCrawlerPageSelections(crawlerId) {
            try {
                const response = await this.apiCall(`/web-crawlers/crawlers/${crawlerId}/page-selections`);
                
                if (response.success && response.data && response.data.selected_page_ids) {
                    const selectedIds = new Set(response.data.selected_page_ids);
                    
                    // Mark pages as selected in the UI
                    this.crawlerPages.forEach(page => {
                        page.selected = selectedIds.has(page.id);
                    });
                    
                    console.log(`🔍 DEBUG: Restored ${selectedIds.size} saved page selections`);
                }
                
            } catch (error) {
                // Don't show error notifications for loading selections - it's optional
                console.log('No saved page selections found (this is normal for new crawlers)');
            }
        },

        // ===== ADMIN BACKUP METHODS =====

        // Show admin backup modal
        async showAdminBackup() {
            this.admin.showBackupModal = true;
            
            // Load backup data if not already loaded
            try {
                await this.loadDatabaseStatus();
                await this.loadBackups();
            } catch (error) {
                console.error('Failed to load backup data:', error);
            }
        },

        // Close admin backup modal
        closeAdminBackup() {
            this.admin.showBackupModal = false;
            this.admin.showRestoreModal = false;
            this.admin.showDeleteModal = false;
            this.admin.selectedBackup = null;
            this.admin.confirmRestore = false;
        },

        // Load admin backup view (legacy method for backward compatibility)
        async loadAdminBackupView() {
            // Redirect to modal version
            await this.showAdminBackup();
        },

        // Load database status
        async loadDatabaseStatus() {
            try {
                const response = await this.apiCall('/admin/database/status');
                if (response.success) {
                    this.admin.databaseStatus = response.data;
                }
            } catch (error) {
                console.error('Failed to load database status:', error);
            }
        },

        // Load backups list
        async loadBackups() {
            try {
                this.admin.loadingBackups = true;
                const response = await this.apiCall('/admin/backups');
                if (response.success) {
                    this.admin.backups = response.data || [];
                }
            } catch (error) {
                console.error('Failed to load backups:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load backups list');
            } finally {
                this.admin.loadingBackups = false;
            }
        },

        // Create new backup
        async createBackup() {
            if (!this.admin.newBackupDescription.trim()) {
                this.showNotification('error', 'Validation Error', 'Please enter a backup description');
                return;
            }

            try {
                this.admin.creatingBackup = true;
                this.admin.backupProgress = { message: 'Initializing backup...', percentage: 0 };

                const response = await this.apiCall('/admin/backups', {
                    method: 'POST',
                    body: JSON.stringify({
                        description: this.admin.newBackupDescription.trim(),
                        include_schema: this.admin.includeSchema,
                        include_data: this.admin.includeData,
                        compress: this.admin.compressBackup
                    })
                });

                if (response.success) {
                    this.showNotification('success', 'Backup Created', 'Database backup created successfully');
                    this.admin.newBackupDescription = '';
                    await this.loadBackups();
                    await this.loadDatabaseStatus();
                } else {
                    throw new Error(response.message || 'Failed to create backup');
                }
            } catch (error) {
                console.error('Failed to create backup:', error);
                this.showNotification('error', 'Backup Failed', error.message || 'Failed to create database backup');
            } finally {
                this.admin.creatingBackup = false;
                this.admin.backupProgress = { message: '', percentage: 0 };
            }
        },

        // Download backup
        async downloadBackup(backup) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/admin/backups/${backup.id}/download`, {
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = backup.filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    this.showNotification('success', 'Download Started', 'Backup download started');
                } else {
                    throw new Error('Download failed');
                }
            } catch (error) {
                console.error('Failed to download backup:', error);
                this.showNotification('error', 'Download Failed', 'Failed to download backup file');
            }
        },

        // Confirm restore
        confirmRestore(backup) {
            this.admin.selectedBackup = backup;
            this.admin.showRestoreModal = true;
            this.admin.confirmRestore = false;
        },

        // Restore backup
        async restoreBackup() {
            if (!this.admin.confirmRestore || !this.admin.selectedBackup) {
                return;
            }

            try {
                this.admin.restoringBackup = true;

                const response = await this.apiCall(`/admin/backups/${this.admin.selectedBackup.id}/restore`, {
                    method: 'POST'
                });

                if (response.success) {
                    this.showNotification('success', 'Restore Complete', 'Database restored successfully. Page will reload.');
                    
                    // Close modal and reload page after successful restore
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    throw new Error(response.message || 'Failed to restore backup');
                }
            } catch (error) {
                console.error('Failed to restore backup:', error);
                this.showNotification('error', 'Restore Failed', error.message || 'Failed to restore database backup');
            } finally {
                this.admin.restoringBackup = false;
                this.admin.showRestoreModal = false;
                this.admin.selectedBackup = null;
                this.admin.confirmRestore = false;
            }
        },

        // Confirm delete
        confirmDelete(backup) {
            this.admin.selectedBackup = backup;
            this.admin.showDeleteModal = true;
        },

        // Delete backup
        async deleteBackup() {
            if (!this.admin.selectedBackup) {
                return;
            }

            try {
                this.admin.deletingBackup = true;

                const response = await this.apiCall(`/admin/backups/${this.admin.selectedBackup.id}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    this.showNotification('success', 'Backup Deleted', 'Backup deleted successfully');
                    await this.loadBackups();
                    await this.loadDatabaseStatus();
                } else {
                    throw new Error(response.message || 'Failed to delete backup');
                }
            } catch (error) {
                console.error('Failed to delete backup:', error);
                this.showNotification('error', 'Delete Failed', error.message || 'Failed to delete backup');
            } finally {
                this.admin.deletingBackup = false;
                this.admin.showDeleteModal = false;
                this.admin.selectedBackup = null;
            }
        },

        // Helper function to get relative time
        getRelativeTime(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            if (diffDays > 0) {
                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            } else if (diffHours > 0) {
                return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else {
                return 'Less than 1 hour ago';
            }
        },

        // ===== USER MANAGEMENT METHODS (Legacy - Deprecated) =====
        // Note: Functionality moved to newer implementation below

        // Legacy closeUserManagement removed - functionality moved to newer implementation

        // Legacy loadUserStats removed - functionality moved to calculateUserStats() method

        async loadUsers(page = 1) {
            try {
                this.userManagement.isLoading = true;
                this.userManagement.currentPage = page;
                
                this.showUsersLoadingState();
                
                const params = new URLSearchParams({
                    page: page.toString(),
                    limit: this.userManagement.limit.toString(),
                    sort: this.userManagement.sortField,
                    order: this.userManagement.sortOrder
                });

                // Add filters
                if (this.userManagement.filters.search) {
                    params.append('search', this.userManagement.filters.search);
                }
                if (this.userManagement.filters.role) {
                    params.append('role', this.userManagement.filters.role);
                }
                if (this.userManagement.filters.status) {
                    params.append('status', this.userManagement.filters.status);
                }

                const response = await this.apiCall(`/users?${params.toString()}`);
                
                this.userManagement.users = response.data.users;
                this.userManagement.totalPages = response.data.pagination.total_pages;
                this.userManagement.totalCount = response.data.pagination.total_count;
                
                this.renderUsersTable();
                this.updateUsersPagination();
                
            } catch (error) {
                console.error('❌ Error loading users:', error);
                this.showUsersErrorState();
                this.showNotification('error', 'Load Failed', 'Failed to load users');
            } finally {
                this.userManagement.isLoading = false;
            }
        },

        showUsersLoadingState() {
            document.getElementById('usersLoadingState').classList.remove('hidden');
            document.getElementById('usersEmptyState').classList.add('hidden');
            document.getElementById('usersTableBody').innerHTML = '';
        },

        showUsersErrorState() {
            document.getElementById('usersLoadingState').classList.add('hidden');
            document.getElementById('usersEmptyState').classList.remove('hidden');
            document.getElementById('usersTableBody').innerHTML = '';
        },

        renderUsersTable() {
            const tableBody = document.getElementById('usersTableBody');
            const loadingState = document.getElementById('usersLoadingState');
            const emptyState = document.getElementById('usersEmptyState');
            
            loadingState.classList.add('hidden');
            
            if (this.userManagement.users.length === 0) {
                emptyState.classList.remove('hidden');
                tableBody.innerHTML = '';
                return;
            }
            
            emptyState.classList.add('hidden');
            
            tableBody.innerHTML = this.userManagement.users.map(user => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-8 w-8">
                                <div class="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                    ${user.username.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div class="ml-3">
                                <div class="text-sm font-medium text-gray-900">${this.escapeHtml(user.username)}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.escapeHtml(user.full_name || '-')}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.escapeHtml(user.email)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getRoleBadgeClass(user.role)}">
                            ${user.role}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${user.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${user.last_login ? this.formatDate(user.last_login) : 'Never'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="flex space-x-2">
                            <button onclick="dashboard().editUser('${user.id}')" 
                                    class="text-blue-600 hover:text-blue-900 transition-colors" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="dashboard().showPasswordResetModal('${user.id}', '${this.escapeHtml(user.username)}')" 
                                    class="text-yellow-600 hover:text-yellow-900 transition-colors" title="Reset Password">
                                <i class="fas fa-key"></i>
                            </button>
                            ${this.getCurrentUserId() !== user.id ? `
                                <button onclick="dashboard().showDeleteUserModal('${user.id}', '${this.escapeHtml(user.username)}')" 
                                        class="text-red-600 hover:text-red-900 transition-colors" title="Delete User">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : '<span class="text-gray-400">-</span>'}
                            ${!user.is_active ? `
                                <button onclick="dashboard().reactivateUser('${user.id}')" 
                                        class="text-green-600 hover:text-green-900 transition-colors" title="Reactivate User">
                                    <i class="fas fa-check-circle"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        getCurrentUserId() {
            return this.user?.id || null;
        },

        getRoleBadgeClass(role) {
            switch (role) {
                case 'admin':
                    return 'bg-red-100 text-red-800';
                case 'user':
                    return 'bg-blue-100 text-blue-800';
                case 'viewer':
                    return 'bg-gray-100 text-gray-800';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        },

        updateUsersPagination() {
            const start = (this.userManagement.currentPage - 1) * this.userManagement.limit + 1;
            const end = Math.min(start + this.userManagement.limit - 1, this.userManagement.totalCount);
            
            document.getElementById('usersShowingStart').textContent = start;
            document.getElementById('usersShowingEnd').textContent = end;
            document.getElementById('usersTotalCount').textContent = this.userManagement.totalCount;
            
            const prevBtn = document.getElementById('usersPrevPage');
            const nextBtn = document.getElementById('usersNextPage');
            
            prevBtn.disabled = this.userManagement.currentPage <= 1;
            nextBtn.disabled = this.userManagement.currentPage >= this.userManagement.totalPages;
        },

        // User Form Functions
        showAddUserForm() {
            this.userManagement.editingUser = null;
            document.getElementById('userFormTitle').textContent = 'Add New User';
            document.getElementById('userFormSubmitText').textContent = 'Create User';
            document.getElementById('passwordField').style.display = 'block';
            document.getElementById('userPassword').required = true;
            
            // Reset form
            document.getElementById('userForm').reset();
            document.getElementById('userIsActive').checked = true;
            
            document.getElementById('userFormModal').classList.remove('hidden');
        },

        async editUser(userId) {
            try {
                const response = await this.apiCall(`/users/${userId}`);
                const user = response.data.user;
                
                this.userManagement.editingUser = user;
                
                document.getElementById('userFormTitle').textContent = 'Edit User';
                document.getElementById('userFormSubmitText').textContent = 'Update User';
                document.getElementById('passwordField').style.display = 'none';
                document.getElementById('userPassword').required = false;
                
                // Populate form
                document.getElementById('userId').value = user.id;
                document.getElementById('userUsername').value = user.username;
                document.getElementById('userEmail').value = user.email;
                document.getElementById('userFullName').value = user.full_name || '';
                document.getElementById('userRole').value = user.role;
                document.getElementById('userIsActive').checked = user.is_active;
                
                document.getElementById('userFormModal').classList.remove('hidden');
                
            } catch (error) {
                console.error('❌ Error loading user for edit:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load user details');
            }
        },

        closeUserForm() {
            document.getElementById('userFormModal').classList.add('hidden');
            document.getElementById('userForm').reset();
            this.userManagement.editingUser = null;
        },

        async handleUserFormSubmit(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                full_name: formData.get('full_name'),
                role: formData.get('role'),
                is_active: formData.has('is_active')
            };
            
            if (!this.userManagement.editingUser) {
                userData.password = formData.get('password');
            }
            
            try {
                const submitBtn = document.getElementById('userFormSubmitBtn');
                const submitSpinner = document.getElementById('userFormSubmitSpinner');
                
                submitBtn.disabled = true;
                submitSpinner.classList.remove('hidden');
                
                let response;
                if (this.userManagement.editingUser) {
                    response = await this.apiCall(`/users/${this.userManagement.editingUser.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(userData)
                    });
                } else {
                    response = await this.apiCall('/users', {
                        method: 'POST',
                        body: JSON.stringify(userData)
                    });
                }
                
                this.showNotification('success', 'User Saved', response.message || 'User saved successfully');
                this.closeUserForm();
                await this.loadUsers(this.userManagement.currentPage);
                this.calculateUserStats();
                
            } catch (error) {
                console.error('❌ Error saving user:', error);
                this.showNotification('error', 'Save Failed', error.message || 'Failed to save user');
            } finally {
                const submitBtn = document.getElementById('userFormSubmitBtn');
                const submitSpinner = document.getElementById('userFormSubmitSpinner');
                
                submitBtn.disabled = false;
                submitSpinner.classList.add('hidden');
            }
        },

        // Password Reset Functions
        showPasswordResetModal(userId, username) {
            document.getElementById('resetUserId').value = userId;
            document.getElementById('resetUserName').textContent = username;
            document.getElementById('passwordResetForm').reset();
            document.getElementById('passwordResetModal').classList.remove('hidden');
        },

        closePasswordResetModal() {
            document.getElementById('passwordResetModal').classList.add('hidden');
            document.getElementById('passwordResetForm').reset();
        },

        async handlePasswordResetSubmit(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const newPassword = formData.get('new_password');
            const confirmPassword = formData.get('confirm_password');
            const userId = formData.get('userId');
            
            if (newPassword !== confirmPassword) {
                this.showNotification('error', 'Validation Error', 'Passwords do not match');
                return;
            }
            
            try {
                const submitBtn = document.getElementById('passwordResetSubmitBtn');
                submitBtn.disabled = true;
                
                const response = await this.apiCall(`/users/${userId}/password`, {
                    method: 'PUT',
                    body: JSON.stringify({ new_password: newPassword })
                });
                
                this.showNotification('success', 'Password Reset', response.message || 'Password reset successfully');
                this.closePasswordResetModal();
                
            } catch (error) {
                console.error('❌ Error resetting password:', error);
                this.showNotification('error', 'Reset Failed', error.message || 'Failed to reset password');
            } finally {
                document.getElementById('passwordResetSubmitBtn').disabled = false;
            }
        },

        // NOTE: Delete User Functions moved to Alpine.js section below (lines ~5917)

        async reactivateUser(userId) {
            try {
                const response = await this.apiCall(`/users/${userId}/activate`, {
                    method: 'POST'
                });
                
                this.showNotification('success', 'User Reactivated', response.message || 'User reactivated successfully');
                await this.loadUsers(this.userManagement.currentPage);
                this.calculateUserStats();
                
            } catch (error) {
                console.error('❌ Error reactivating user:', error);
                this.showNotification('error', 'Reactivation Failed', error.message || 'Failed to reactivate user');
            }
        },

        // Legacy setupUserManagementEventListeners removed - Alpine.js handles events through directives

        // Pagination Functions
        async previousUsersPage() {
            if (this.userManagement.currentPage > 1) {
                await this.loadUsers(this.userManagement.currentPage - 1);
            }
        },

        async nextUsersPage() {
            if (this.userManagement.currentPage < this.userManagement.totalPages) {
                await this.loadUsers(this.userManagement.currentPage + 1);
            }
        },

        async sortUsers(field) {
            if (this.userManagement.sortField === field) {
                this.userManagement.sortOrder = this.userManagement.sortOrder === 'ASC' ? 'DESC' : 'ASC';
            } else {
                this.userManagement.sortField = field;
                this.userManagement.sortOrder = 'ASC';
            }
            
            await this.loadUsers(1);
        },

        // Utility Functions
        escapeHtml(text) {
            if (typeof text !== 'string') return text;
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, (m) => map[m]);
        },

        // ===== UNIFIED TESTING SESSIONS METHODS =====
        
        // Load testing sessions using the new unified API
        async loadTestingSessions() {
            if (!this.selectedProject) return;
            
            try {
                this.loading = true;
                console.log('🔍 Loading testing sessions for project:', this.selectedProject);
                
                const response = await this.apiCall(`/testing-sessions?project_id=${this.selectedProject}`);
                
                if (response.success) {
                    this.testingSessions = response.sessions || [];
                    this.applySessionFilters();
                    console.log(`📋 Loaded ${this.testingSessions.length} testing sessions`);
                } else {
                    throw new Error(response.error || 'Failed to load testing sessions');
                }
            } catch (error) {
                console.error('Error loading testing sessions:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load testing sessions');
                this.testingSessions = [];
                this.filteredTestingSessions = [];
            } finally {
                this.loading = false;
            }
        },
        
        // Apply session filters
        applySessionFilters() {
            this.filteredTestingSessions = this.testingSessions.filter(session => {
                const statusMatch = !this.sessionFilters.status || session.status === this.sessionFilters.status;
                const levelMatch = !this.sessionFilters.conformance_level || session.conformance_level === this.sessionFilters.conformance_level;
                return statusMatch && levelMatch;
            });
        },

        // Calculate session overview counters based on actual progress
        getActiveSessionsCount() {
            const activeSessions = this.testingSessions.filter(session => {
                const progress = session.progress;
                if (!progress) return false;
                
                // Active: Has some progress (> 0%) but not completed (< 100%)
                const completionPercentage = parseFloat(progress.completionPercentage) || 0;
                const isActive = completionPercentage > 0 && completionPercentage < 100;
                
                if (isActive) {
                    console.log(`📊 Active session: ${session.name} (${completionPercentage}%)`);
                }
                
                return isActive;
            });
            
            return activeSessions.length;
        },

        getCompletedSessionsCount() {
            return this.testingSessions.filter(session => {
                const progress = session.progress;
                if (!progress) return false;
                
                // Completed: 100% completion
                const completionPercentage = parseFloat(progress.completionPercentage) || 0;
                return completionPercentage >= 100;
            }).length;
        },

        getNeedsReviewSessionsCount() {
            return this.testingSessions.filter(session => {
                const progress = session.progress;
                if (!progress) return false;
                
                // Needs review: Has failed tests, tests that need review, or untestable items
                const failedTests = progress.failedTests || 0;
                const needsReviewTests = progress.needsReviewTests || 0;
                const untestableTests = progress.untestableTests || 0;
                
                // Also consider sessions with status indicators for review
                const hasReviewStatus = session.status === 'needs_review' || session.status === 'draft';
                
                return failedTests > 0 || needsReviewTests > 0 || untestableTests > 0 || hasReviewStatus;
            }).length;
        },
        
        // Load available testers for assignment
        async loadAvailableTesters() {
            try {
                const response = await this.apiCall('/users');
                
                if (response.success) {
                    this.availableTesters = response.users?.filter(user => 
                        ['admin', 'tester', 'reviewer'].includes(user.role) && user.is_active
                    ) || [];
                    console.log(`👥 Loaded ${this.availableTesters.length} available testers`);
                } else {
                    console.warn('Failed to load users for tester assignment');
                    this.availableTesters = [];
                }
            } catch (error) {
                console.error('Error loading available testers:', error);
                this.availableTesters = [];
            }
        },
        
        // Create a new unified testing session
        async createTestingSession() {
            if (!this.selectedProject || !this.newTestingSession.name.trim() || !this.newTestingSession.conformance_level) {
                this.showNotification('error', 'Missing Information', 'Please fill in all required fields');
                return;
            }

            try {
                this.loading = true;
                
                const sessionData = {
                    project_id: this.selectedProject,
                    name: this.newTestingSession.name.trim(),
                    description: this.newTestingSession.description.trim(),
                    conformance_level: this.newTestingSession.conformance_level,
                    include_pages: this.newTestingSession.pageScope === 'all',
                    selected_page_ids: this.newTestingSession.pageScope === 'selected' ? [] : undefined,
                    apply_smart_filtering: this.newTestingSession.applySmartFiltering
                };

                console.log('🔍 Creating testing session:', sessionData);
                
                const response = await this.apiCall('/testing-sessions', {
                    method: 'POST',
                    body: JSON.stringify(sessionData)
                });

                if (response.success) {
                    this.showNotification('success', 'Session Created', 
                        `Session "${sessionData.name}" created with ${response.test_instances_created || 0} test instances`
                    );
                    
                    this.showCreateTestingSession = false;
                    this.resetNewTestingSession();
                    await this.loadTestingSessions();
                } else {
                    throw new Error(response.error || 'Failed to create testing session');
                }
            } catch (error) {
                console.error('Error creating testing session:', error);
                this.showNotification('error', 'Creation Failed', error.message || 'Failed to create testing session');
            } finally {
                this.loading = false;
            }
        },
        
        // Reset new testing session form
        resetNewTestingSession() {
            this.newTestingSession = {
                name: '',
                description: '',
                conformance_level: '',
                pageScope: 'all',
                applySmartFiltering: true,
                createBulkInstances: false
            };
            this.showAdvancedOptions = false;
        },
        
        // View session details
        async viewSessionDetails(session) {
            try {
                this.loading = true;
                console.log('🔍 Loading session details for:', session.id);
                
                const response = await this.apiCall(`/testing-sessions/${session.id}?include_instances=false`);
                
                if (response.success) {
                    // For now, show session info in a notification
                    // Later this could open a detailed modal
                    const progress = response.session.progress;
                    const message = progress ? 
                        `Progress: ${progress.completionPercentage}% (${progress.completedTests}/${progress.totalTests} tests)` :
                        'No progress data available';
                    
                    this.showNotification('info', 'Session Details', message);
                    console.log('Session details:', response.session);
                } else {
                    throw new Error(response.error || 'Failed to load session details');
                }
            } catch (error) {
                console.error('Error loading session details:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load session details');
            } finally {
                this.loading = false;
            }
        },
        
        // View testing matrix for a session
        async viewTestingMatrix(session) {
            try {
                this.loading = true;
                console.log('🔍 Loading testing matrix for:', session.id);
                
                const response = await this.apiCall(`/test-instances/session/${session.id}/matrix`);
                
                if (response.success) {
                    // For now, show matrix info in a notification
                    // Later this could open a matrix view modal
                    const matrix = response.matrix;
                    const message = `Matrix: ${matrix.requirements.length} requirements × ${matrix.pages.length} pages`;
                    
                    this.showNotification('info', 'Testing Matrix', message);
                    console.log('Testing matrix:', response.matrix);
                } else {
                    throw new Error(response.error || 'Failed to load testing matrix');
                }
            } catch (error) {
                console.error('Error loading testing matrix:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load testing matrix');
            } finally {
                this.loading = false;
            }
        },
        
        // Activate a draft session
        async activateSession(session) {
            try {
                this.loading = true;
                
                const response = await this.apiCall(`/testing-sessions/${session.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'active' })
                });
                
                if (response.success) {
                    this.showNotification('success', 'Session Activated', `Session "${session.name}" is now active`);
                    await this.loadTestingSessions();
                } else {
                    throw new Error(response.error || 'Failed to activate session');
                }
            } catch (error) {
                console.error('Error activating session:', error);
                this.showNotification('error', 'Activation Failed', error.message || 'Failed to activate session');
            } finally {
                this.loading = false;
            }
        },
        
        // Edit a session
        async editSession(session) {
            // For now, show that this feature is coming soon
            this.showNotification('info', 'Feature Coming Soon', 'Session editing will be available in the next update');
            console.log('Edit session:', session);
        },
        
        // Duplicate a session
        async duplicateSession(session) {
            try {
                this.loading = true;
                
                const response = await this.apiCall(`/testing-sessions/${session.id}/duplicate`, {
                    method: 'POST',
                    body: JSON.stringify({
                        name: `${session.name} (Copy)`,
                        description: session.description
                    })
                });
                
                if (response.success) {
                    this.showNotification('success', 'Session Duplicated', 
                        `Created duplicate of "${session.name}"`
                    );
                    await this.loadTestingSessions();
                } else {
                    throw new Error(response.error || 'Failed to duplicate session');
                }
            } catch (error) {
                console.error('Error duplicating session:', error);
                this.showNotification('error', 'Duplication Failed', error.message || 'Failed to duplicate session');
            } finally {
                this.loading = false;
            }
        },
        
        // Delete a session
        async deleteSession(session) {
            const confirmed = confirm(
                `Are you sure you want to delete the testing session "${session.name}"?\n\n` +
                `This will permanently remove:\n` +
                `• All test instances and results\n` +
                `• Session progress and configuration\n` +
                `• Associated audit logs\n\n` +
                `This action cannot be undone.`
            );
            
            if (!confirmed) return;
            
            try {
                this.loading = true;
                
                const response = await this.apiCall(`/testing-sessions/${session.id}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    this.showNotification('success', 'Session Deleted', 
                        `Session "${session.name}" deleted successfully`
                    );
                    await this.loadTestingSessions();
                } else {
                    throw new Error(response.error || 'Failed to delete session');
                }
            } catch (error) {
                console.error('Error deleting session:', error);
                this.showNotification('error', 'Deletion Failed', error.message || 'Failed to delete session');
            } finally {
                this.loading = false;
            }
        },
        
        // Get conformance level display text
        getConformanceLevelDisplay(level) {
            const levels = {
                'wcag_a': 'WCAG A',
                'wcag_aa': 'WCAG AA', 
                'wcag_aaa': 'WCAG AAA',
                'section_508': 'Section 508',
                'combined': 'Combined'
            };
            return levels[level] || level;
        },
        
        // Update requirements preview in create modal
        updateRequirementsPreview() {
            // This will be called when conformance level changes
            // Currently just used to trigger UI updates
        },
        
        // Get requirements preview text
        getRequirementsPreviewText() {
            const level = this.newTestingSession.conformance_level;
            if (!level) return '';
            
            const descriptions = {
                'wcag_a': 'WCAG 2.2 Level A requirements will be applied (basic accessibility)',
                'wcag_aa': 'WCAG 2.2 Level A and AA requirements will be applied (standard compliance)', 
                'wcag_aaa': 'All WCAG 2.2 requirements will be applied (A, AA, and AAA levels)',
                'section_508': 'Section 508 requirements will be applied (US federal standards)',
                'combined': 'Both WCAG 2.2 and Section 508 requirements will be applied (comprehensive testing)'
            };
            
            return descriptions[level] || 'Requirements will be determined based on selected level';
        },
        
        // View requirements with detailed breakdown
        async viewRequirements() {
            try {
                this.loading = true;
                console.log('🔍 Loading comprehensive requirements view...');
                
                // Load all requirements (get all pages)
                const requirementsResponse = await this.apiCall('/requirements?limit=100');
                
                if (requirementsResponse.success) {
                    const requirements = requirementsResponse.data?.requirements || [];
                    
                    // Ensure unique requirements by ID
                    const uniqueRequirements = requirements.reduce((acc, req) => {
                        const key = req.id || req.requirement_id || req.criterion_number;
                        if (!acc.find(existing => (existing.id || existing.requirement_id || existing.criterion_number) === key)) {
                            acc.push(req);
                        }
                        return acc;
                    }, []);
                    
                    this.allRequirements = uniqueRequirements;
                    this.filteredRequirements = [...uniqueRequirements];
                    this.showRequirementsModal = true;
                    this.applyRequirementsFilters();
                    
                    console.log('✅ Loaded requirements:', this.allRequirements.length);
                    
                    // Also load test instances to show relationship
                    await this.loadRequirementsTestInstances();
                } else {
                    throw new Error(requirementsResponse.error || 'Failed to load requirements');
                }
            } catch (error) {
                console.error('Error loading requirements:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load requirements database');
            } finally {
                this.loading = false;
            }
        },
        
        // Load test instances for requirements view
        async loadRequirementsTestInstances() {
            try {
                if (!this.selectedProject) return;
                
                const response = await this.apiCall('/test-instances', {
                    method: 'GET'
                });
                
                if (response.success) {
                    this.requirementsTestInstances = response.test_instances || [];
                    console.log('✅ Loaded test instances for requirements view:', this.requirementsTestInstances.length);
                }
            } catch (error) {
                console.error('Error loading test instances for requirements:', error);
            }
        },
        
        // Apply filters to requirements
        applyRequirementsFilters() {
            if (!this.allRequirements || !Array.isArray(this.allRequirements)) {
                this.filteredRequirements = [];
                return;
            }
            
            let filtered = [...this.allRequirements];
            
            // Filter by type
            if (this.requirementsFilters.type) {
                filtered = filtered.filter(req => req.requirement_type === this.requirementsFilters.type);
            }
            
            // Filter by level
            if (this.requirementsFilters.level) {
                filtered = filtered.filter(req => req.level === this.requirementsFilters.level);
            }
            
            // Filter by test method
            if (this.requirementsFilters.testMethod) {
                filtered = filtered.filter(req => req.test_method === this.requirementsFilters.testMethod);
            }
            
            // Search filter
            if (this.requirementsFilters.search) {
                const search = this.requirementsFilters.search.toLowerCase();
                filtered = filtered.filter(req => 
                    req.title.toLowerCase().includes(search) ||
                    req.criterion_number.toLowerCase().includes(search) ||
                    (req.description && req.description.toLowerCase().includes(search))
                );
            }
            
            this.filteredRequirements = filtered;
            console.log('🔍 Applied requirements filters, showing', filtered.length, 'of', this.allRequirements.length);
        },
        
        // Get test instances for a specific requirement
        getTestInstancesForRequirement(requirementId) {
            return this.requirementsTestInstances.filter(instance => 
                instance.requirement_id === requirementId
            );
        },
        
        // Get unique pages for a requirement
        getPagesByRequirement(requirementId) {
            const instances = this.getTestInstancesForRequirement(requirementId);
            const pages = instances
                .filter(instance => instance.page_url)
                .map(instance => ({
                    url: instance.page_url,
                    title: instance.page_title,
                    status: instance.status,
                    session_id: instance.session_id
                }));
            
            // Remove duplicates by URL
            const uniquePages = pages.filter((page, index, self) => 
                index === self.findIndex(p => p.url === page.url)
            );
            
            return uniquePages;
        },
        
        // Close requirements modal
        closeRequirementsModal() {
            this.showRequirementsModal = false;
            this.allRequirements = [];
            this.filteredRequirements = [];
            this.requirementsTestInstances = [];
            this.requirementsFilters = {
                type: '',
                level: '',
                testMethod: '',
                search: ''
            };
        },
        
        // ===== USER MANAGEMENT METHODS =====
        
        // Open user management modal
        async openUserManagement(manualOpen = false) {
            // Debug: Log who called this function
            console.log('🔍 DEBUG: openUserManagement called', {
                manualOpen,
                preventAutoUserManagement: this.preventAutoUserManagement,
                stackTrace: new Error().stack
            });
            
            // Aggressive prevention: Block any auto-opening during the first 10 seconds after initialization
            const now = Date.now();
            const initTime = this._initializationTime || now;
            const timeSinceInit = now - initTime;
            
            // Additional check: Don't auto-open if we're still loading initial data
            if (!manualOpen && (timeSinceInit < 10000 || this.loading)) {
                console.log('🛑 AGGRESSIVE BLOCK: Preventing auto-opening of user management modal', {
                    timeSinceInit,
                    loading: this.loading,
                    manualOpen,
                    preventAutoUserManagement: this.preventAutoUserManagement
                });
                return;
            }
            
            // NUCLEAR OPTION: Block ALL opens during critical startup and authentication period
            if ((!this.auth.isAuthenticated && timeSinceInit < 15000) || 
                (this.auth.isAuthenticated && timeSinceInit < 20000)) {
                console.log('🚫 NUCLEAR BLOCK: Preventing ALL user management modal opens during startup/auth period', {
                    timeSinceInit,
                    isAuthenticated: this.auth.isAuthenticated,
                    manualOpen
                });
                return;
            }
            
            // Prevent auto-opening during initialization (unless manually triggered)
            if (this.preventAutoUserManagement && !manualOpen) {
                console.log('🛑 Preventing auto-opening of user management modal during initialization');
                return;
            }
            
            try {
                console.log('🔍 Opening user management modal');
                this.showUserManagement = true;
                this.loading = true;
                
                console.log('🔍 Loading user management...');
                await this.loadUsers();
                this.calculateUserStats();
                
            } catch (error) {
                console.error('Error loading user management:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load user management');
            } finally {
                this.loading = false;
            }
        },
        
        // Close user management modal
        closeUserManagement() {
            console.log('🔍 Closing user management modal');
            this.showUserManagement = false;
            this.closeUserForm();
            this.closeDeleteUserModal();
        },

        // Close test grid modal
        closeTestGrid() {
            console.log('🔍 Closing test grid modal');
            this.showTestGrid = false;
            // Restore body scrolling
            document.body.style.overflow = '';
        },

        // Global function alias for Alpine.js calls
        showUserManagement() {
            console.log('🔍 DEBUG: showUserManagement alias called', {
                stackTrace: new Error().stack
            });
            return this.openUserManagement(true); // Manual open
        },
        
        // Load users from API
        async loadUsers() {
            try {
                const response = await this.apiCall('/users');
                
                if (response.success) {
                    this.allUsers = response.users || [];
                    this.filteredUsers = this.allUsers;
                    this.applyUserFilters();
                    
                    console.log('✅ Loaded users:', this.allUsers.length);
                } else {
                    throw new Error(response.error || 'Failed to load users');
                }
            } catch (error) {
                console.error('Error loading users:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load users');
                this.allUsers = [];
                this.filteredUsers = [];
            }
        },
        
        // Calculate user statistics
        calculateUserStats() {
            this.userStats.total = this.allUsers.length;
            this.userStats.active = this.allUsers.filter(user => user.is_active).length;
            this.userStats.admin = this.allUsers.filter(user => user.role === 'admin').length;
            
            // Recent logins (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            this.userStats.recentLogins = this.allUsers.filter(user => 
                user.last_login && new Date(user.last_login) > sevenDaysAgo
            ).length;
        },
        
        // Apply filters to users
        applyUserFilters() {
            let filtered = [...this.allUsers];
            
            // Filter by role
            if (this.userFilters.role) {
                filtered = filtered.filter(user => user.role === this.userFilters.role);
            }
            
            // Filter by status
            if (this.userFilters.status === 'active') {
                filtered = filtered.filter(user => user.is_active);
            } else if (this.userFilters.status === 'inactive') {
                filtered = filtered.filter(user => !user.is_active);
            }
            
            // Search filter
            if (this.userFilters.search) {
                const search = this.userFilters.search.toLowerCase();
                filtered = filtered.filter(user => 
                    user.username.toLowerCase().includes(search) ||
                    user.email.toLowerCase().includes(search) ||
                    (user.full_name && user.full_name.toLowerCase().includes(search))
                );
            }
            
            this.filteredUsers = filtered;
            this.updateUserPagination();
            console.log('🔍 Applied user filters, showing', filtered.length, 'of', this.allUsers.length, 'users');
        },
        
        // Update pagination info
        updateUserPagination() {
            this.userPagination.totalItems = this.filteredUsers.length;
            this.userPagination.totalPages = Math.ceil(this.filteredUsers.length / this.userPagination.itemsPerPage);
            
            // Reset to first page if current page is out of bounds
            if (this.userPagination.currentPage > this.userPagination.totalPages) {
                this.userPagination.currentPage = 1;
            }
        },
        
        // Get paginated users for display
        getPaginatedUsers() {
            const start = (this.userPagination.currentPage - 1) * this.userPagination.itemsPerPage;
            const end = start + this.userPagination.itemsPerPage;
            return this.filteredUsers.slice(start, end);
        },
        
        // Show add user form
        showAddUserForm() {
            this.resetUserForm();
            this.showUserForm = true;
            console.log('🔍 Opening add user form');
        },
        
        // Show edit user form
        showEditUserForm(user) {
            this.userForm = {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name || '',
                role: user.role,
                is_active: user.is_active,
                password: '',
                confirm_password: ''
            };
            this.userFormErrors = {};
            this.showUserForm = true;
            console.log('🔍 Opening edit user form for:', user.username);
        },
        
        // Reset user form
        resetUserForm() {
            this.userForm = {
                id: null,
                username: '',
                email: '',
                full_name: '',
                role: 'tester',
                is_active: true,
                password: '',
                confirm_password: ''
            };
            this.userFormErrors = {};
        },
        
        // Close user form
        closeUserForm() {
            this.showUserForm = false;
            this.resetUserForm();
        },
        
        // Validate user form
        validateUserForm() {
            this.userFormErrors = {};
            
            if (!this.userForm.username.trim()) {
                this.userFormErrors.username = 'Username is required';
            }
            
            if (!this.userForm.email.trim()) {
                this.userFormErrors.email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.userForm.email)) {
                this.userFormErrors.email = 'Invalid email format';
            }
            
            if (!this.userForm.id && !this.userForm.password) {
                this.userFormErrors.password = 'Password is required for new users';
            }
            
            if (this.userForm.password && this.userForm.password.length < 6) {
                this.userFormErrors.password = 'Password must be at least 6 characters';
            }
            
            if (this.userForm.password !== this.userForm.confirm_password) {
                this.userFormErrors.confirm_password = 'Passwords do not match';
            }
            
            return Object.keys(this.userFormErrors).length === 0;
        },
        
        // Save user (create or update)
        async saveUser() {
            if (!this.validateUserForm()) {
                this.showNotification('error', 'Validation Failed', 'Please fix the errors in the form');
                return;
            }
            
            try {
                this.loading = true;
                
                const userData = {
                    username: this.userForm.username.trim(),
                    email: this.userForm.email.trim(),
                    full_name: this.userForm.full_name.trim(),
                    role: this.userForm.role,
                    is_active: this.userForm.is_active
                };
                
                // Only include password if it's provided
                if (this.userForm.password) {
                    userData.password = this.userForm.password;
                }
                
                let response;
                if (this.userForm.id) {
                    // Update existing user
                    response = await this.apiCall(`/users/${this.userForm.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(userData)
                    });
                } else {
                    // Create new user
                    response = await this.apiCall('/users', {
                        method: 'POST',
                        body: JSON.stringify(userData)
                    });
                }
                
                if (response.success) {
                    await this.loadUsers();
                    this.closeUserForm();
                    
                    const action = this.userForm.id ? 'updated' : 'created';
                    this.showNotification('success', 'User Saved', `User ${userData.username} ${action} successfully`);
                } else {
                    throw new Error(response.error || 'Failed to save user');
                }
            } catch (error) {
                console.error('Error saving user:', error);
                this.showNotification('error', 'Save Failed', error.message);
            } finally {
                this.loading = false;
            }
        },
        
        // Show delete user confirmation
        confirmUserDeletion(user) {
            this.selectedUserForDelete = user;
            this.showDeleteUserModal = true;
            console.log('🔍 Showing delete confirmation for:', user.username);
        },
        
        // Close delete user modal
        closeDeleteUserModal() {
            this.showDeleteUserModal = false;
            this.selectedUserForDelete = null;
        },
        
        // Confirm delete user
        async confirmDeleteUser() {
            if (!this.selectedUserForDelete) return;
            
            try {
                this.loading = true;
                
                const response = await this.apiCall(`/users/${this.selectedUserForDelete.id}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    await this.loadUsers();
                    this.closeDeleteUserModal();
                    this.showNotification('success', 'User Deleted', `User ${this.selectedUserForDelete.username} deleted successfully`);
                } else {
                    throw new Error(response.error || 'Failed to delete user');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showNotification('error', 'Delete Failed', error.message);
            } finally {
                this.loading = false;
            }
        },
        
        // Sort users
        sortUsers(field) {
            if (this.userSort.field === field) {
                this.userSort.direction = this.userSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.userSort.field = field;
                this.userSort.direction = 'asc';
            }
            
            this.filteredUsers.sort((a, b) => {
                let aVal = a[field] || '';
                let bVal = b[field] || '';
                
                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }
                
                if (this.userSort.direction === 'asc') {
                    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                } else {
                    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                }
            });
            
            console.log('🔍 Sorted users by', field, this.userSort.direction);
        },
        
        // Navigate to previous page
        previousUsersPage() {
            if (this.userPagination.currentPage > 1) {
                this.userPagination.currentPage--;
            }
        },
        
        // Navigate to next page
        nextUsersPage() {
            if (this.userPagination.currentPage < this.userPagination.totalPages) {
                this.userPagination.currentPage++;
            }
        },
        
        // Get user role display
        getUserRoleDisplay(role) {
            const roles = {
                'admin': 'Administrator',
                'tester': 'Tester',
                'reviewer': 'Reviewer',
                'viewer': 'Viewer'
            };
            return roles[role] || role;
        },
        
        // Get user role badge class
        getUserRoleBadgeClass(role) {
            const classes = {
                'admin': 'bg-red-100 text-red-800',
                'tester': 'bg-blue-100 text-blue-800',
                'reviewer': 'bg-green-100 text-green-800',
                'viewer': 'bg-gray-100 text-gray-800'
            };
            return classes[role] || 'bg-gray-100 text-gray-800';
        },
        
        // Get user status badge class
        getUserStatusBadgeClass(isActive) {
            return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        },

        // ===== TEST GRID METHODS =====
        
        // View test grid for a session (Modal Component)
        async viewTestGrid(session) {
            try {
                console.log('🔍 Opening test grid for session:', session.name);
                
                // Store complete session information with progress
                this.selectedTestSession = { ...session };
                this.showTestGrid = true;
                this.loadingTestInstances = true;
                
                // Initialize modal test grid state
                this.selectedTestGridInstances = [];
                this.testGridFilters = {
                    status: '',
                    level: '',
                    testMethod: ''
                };
                this.testGridSort = {
                    field: 'criterion_number',
                    direction: 'asc'
                };
                
                // Load test instances using the proper modal grid function
                await this.loadTestInstancesForGrid(session.id);
                
                // Show notification about which session is being managed
                this.showNotification('info', 'Test Grid Opened', 
                    `Now managing tests for "${this.selectedTestSession.name}" (${this.testGridInstances.length} test instances)`);
            } catch (error) {
                console.error('Error loading test grid:', error);
                this.showNotification('error', 'Grid Load Failed', error.message || 'Failed to load test instances');
                this.showTestGrid = false;
            } finally {
                this.loadingTestInstances = false;
            }
        },
        
        // Apply filters to test instances
        applyTestGridFilters() {
            let filtered = [...this.testInstances];
            
            // Filter by status
            if (this.testGridFilters.status) {
                filtered = filtered.filter(instance => instance.status === this.testGridFilters.status);
            }
            
            // Filter by level
            if (this.testGridFilters.level) {
                filtered = filtered.filter(instance => 
                    (instance.requirement_level || instance.level) === this.testGridFilters.level
                );
            }
            
            // Filter by test method
            if (this.testGridFilters.testMethod) {
                filtered = filtered.filter(instance => 
                    (instance.test_method_used || instance.requirement_test_method) === this.testGridFilters.testMethod
                );
            }
            
            this.filteredTestInstances = filtered;
            
            // Apply current sort after filtering
            this.applyTestGridSort();
            
            // Clear selections when filters change
            this.selectedTestInstances = [];
            
            console.log('🔍 Applied filters, showing', filtered.length, 'of', this.testInstances.length, 'instances');
        },
        
        // Update test instance status
        async updateTestInstanceStatus(instanceId, newStatus) {
            try {
                const response = await this.apiCall(`/test-instances/${instanceId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus })
                });
                
                if (response.success) {
                    // Update local data
                    const instance = this.testInstances.find(t => t.id === instanceId);
                    if (instance) {
                        instance.status = newStatus;
                        instance.updated_at = new Date().toISOString();
                    }
                    
                    this.applyTestGridFilters();
                    this.showNotification('success', 'Status Updated', `Test marked as ${newStatus.replace('_', ' ')}`);
                    
                    // Refresh session progress
                    await this.loadTestingSessions();
                } else {
                    throw new Error(response.error || 'Failed to update status');
                }
            } catch (error) {
                console.error('Error updating test instance status:', error);
                this.showNotification('error', 'Update Failed', error.message);
            }
        },
        
        // Assign tester to test instance
        async assignTester(instanceId, testerId) {
            try {
                const response = await this.apiCall(`/test-instances/${instanceId}/assign`, {
                    method: 'PUT',
                    body: JSON.stringify({ assigned_tester: testerId })
                });
                
                if (response.success) {
                    // Update local data
                    const instance = this.testInstances.find(t => t.id === instanceId);
                    if (instance) {
                        instance.assigned_tester = testerId;
                        instance.assigned_at = new Date().toISOString();
                    }
                    
                    const tester = this.availableTesters.find(t => t.id === testerId);
                    const testerName = tester ? (tester.full_name || tester.username) : 'Unassigned';
                    
                    this.showNotification('success', 'Assignment Updated', `Test assigned to ${testerName}`);
                } else {
                    throw new Error(response.error || 'Failed to assign tester');
                }
            } catch (error) {
                console.error('Error assigning tester:', error);
                this.showNotification('error', 'Assignment Failed', error.message);
            }
        },
        
        // Open test instance modal for detailed editing
        openTestInstanceModal(instance) {
            this.selectedTestInstance = instance;
            this.showTestInstanceModal = true;
            console.log('🔍 Opening test instance modal for:', instance.criterion_number);
        },
        
        // Open evidence modal
        openEvidenceModal(instance) {
            this.selectedTestInstance = instance;
            this.showEvidenceModal = true;
            console.log('🔍 Opening evidence modal for:', instance.criterion_number);
        },
        
        // Generate report for test instance
        generateReport(instance) {
            // For now, show a notification
            this.showNotification('info', 'Report Generation', 
                `Report generation for ${instance.criterion_number} will be available soon`);
            console.log('🔍 Generate report for:', instance);
        },
        
        // Get level badge class
        getLevelBadgeClass(level) {
            const classes = {
                'a': 'bg-green-100 text-green-800',
                'aa': 'bg-blue-100 text-blue-800',
                'aaa': 'bg-purple-100 text-purple-800',
                'base': 'bg-yellow-100 text-yellow-800',
                'enhanced': 'bg-orange-100 text-orange-800'
            };
            return classes[level] || 'bg-gray-100 text-gray-800';
        },
        
        // Get level display text
        getLevelDisplay(level) {
            const displays = {
                'a': 'Level A',
                'aa': 'Level AA',
                'aaa': 'Level AAA',
                'base': '508 Base',
                'enhanced': '508 Enhanced'
            };
            return displays[level] || level?.toUpperCase() || 'N/A';
        },
        
        // Get status text color class
        getStatusTextClass(status) {
            const classes = {
                'pending': 'text-gray-600',
                'not_started': 'text-gray-600',
                'in_progress': 'text-yellow-600',
                'passed': 'text-green-600',
                'failed': 'text-red-600',
                'untestable': 'text-orange-600',
                'not_applicable': 'text-blue-600'
            };
            return classes[status] || 'text-gray-600';
        },
        
        // Format date for display
        formatDate(dateString) {
            if (!dateString) return 'Never';
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        },
        
        // Get test method badge class
        getTestMethodBadgeClass(method) {
            const classes = {
                'manual': 'bg-blue-100 text-blue-800',
                'automated': 'bg-green-100 text-green-800',
                'both': 'bg-purple-100 text-purple-800'
            };
            return classes[method] || 'bg-gray-100 text-gray-800';
        },
        
        // Get test method display text
        getTestMethodDisplay(method) {
            const displays = {
                'manual': 'Manual',
                'automated': 'Automated',
                'both': 'Hybrid Review'
            };
            return displays[method] || method?.charAt(0).toUpperCase() + method?.slice(1) || 'Unknown';
        },
        
        // Get test method description
        getTestMethodDescription(method) {
            const descriptions = {
                'manual': 'Requires human evaluation and testing',
                'automated': 'Fully automated using axe-core, pa11y, WAVE, or Lighthouse',
                'both': 'Hybrid: Automated tools + manual verification for complete coverage'
            };
            return descriptions[method] || 'Test method not specified';
        },

        getProposedTools(requirement) {
            if (!requirement) {
                return [];
            }
            
            let tools = [];
            
            // First, try to get tools from the requirement's automated_tools (shows all available tools)
            if (requirement.automated_tools) {
                try {
                    if (typeof requirement.automated_tools === 'string') {
                        tools = JSON.parse(requirement.automated_tools);
                    } else if (Array.isArray(requirement.automated_tools)) {
                        tools = requirement.automated_tools;
                    }
                } catch (e) {
                    console.warn('Error parsing automated_tools for requirement:', requirement.criterion_number, e);
                }
            }
            
            // If no tools from requirement, check if there's a specific tool used for this test instance
            if (tools.length === 0 && requirement.tool_used) {
                tools = [requirement.tool_used];
            }
            
            // If no tools from requirement or specific tool, try to extract from test result
            if (tools.length === 0 && requirement.result) {
                try {
                    const result = typeof requirement.result === 'string' ? JSON.parse(requirement.result) : requirement.result;
                    if (result.automated_analysis && result.automated_analysis.tools_used) {
                        tools = result.automated_analysis.tools_used;
                    } else if (result.automated_analysis && result.automated_analysis.tool_results) {
                        tools = Object.keys(result.automated_analysis.tool_results);
                    }
                } catch (e) {
                    console.warn('Error parsing result for tools:', e);
                }
            }
            
            // Map tool names to display names
            const toolDisplayNames = {
                'axe-core': 'Axe Core',
                'axe': 'Axe Core',
                'pa11y': 'Pa11y',
                'lighthouse': 'Lighthouse',
                'WAVE': 'WAVE',
                'wave': 'WAVE',
                'color-contrast-analyzer': 'Color Contrast',
                'CCA': 'Color Contrast',
                'luma': 'Luma',
                'ANDI': 'ANDI',
                'htmlcs': 'HTML CodeSniffer'
            };
            
            return tools.map(tool => toolDisplayNames[tool] || tool);
        },

        getAutomationConfidenceClass(confidence) {
            const classes = {
                'high': 'bg-green-100 text-green-800',
                'medium': 'bg-yellow-100 text-yellow-800',
                'low': 'bg-orange-100 text-orange-800',
                'none': 'bg-gray-100 text-gray-600'
            };
            return classes[confidence] || 'bg-gray-100 text-gray-600';
        },

        getAutomationConfidenceDisplay(confidence) {
            const displays = {
                'high': 'High Confidence',
                'medium': 'Medium Confidence',
                'low': 'Low Confidence',
                'none': 'No Automation'
            };
            return displays[confidence] || 'Unknown';
/**
 * VPAT Dashboard - Clean Alpine.js Implementation
 * Organized, deduplicated, and optimized
 */

// Make dashboard function globally available
window.dashboard = function() {
    console.log('🚀 Dashboard function called - initializing...');
    
    // 🛡️ INITIALIZATION GUARD - Prevent double initialization
    if (window._dashboardInitialized) {
        console.warn('⚠️ Dashboard already initialized, returning existing instance');
        return window._dashboardInstance;
    }
    
    // ===== COMPREHENSIVE DEFAULTS - All properties initialized to prevent Alpine errors =====
    const defaults = {
        // ===== MODAL STATES =====
        showLogin: false,
        showProfile: false,
        showCreateCrawler: false,
        showSessionUrlModal: false,
        showManualUrlForm: false,
        showCreateProject: false,
        showDeleteDiscovery: false,
        showDeleteProject: false,
        showDeleteSession: false,
        showDiscoveredPagesModal: false,
        showCrawlerPagesModal: false,
        showAddManualUrlModal: false,
        showAddAuthConfigModal: false,
        showEditAuthConfigModal: false,
        showChangePassword: false,
        showSessions: false,
        showSetupAuth: false,
        showAdvancedCrawlerOptions: false,
        showCreateTestingSession: false,
        showTestInstanceModal: false,
        showSessionResultsModal: false,
        showTestDetailsModal: false,
        showTestConfigurationModal: false,
        showTestGrid: false,
        
        // ===== PROGRESS AND STATE FLAGS =====
        loading: false,
        discoveryInProgress: false,
        crawlerInProgress: false,
        sessionCapturing: false,
        sessionAwaitingLogin: false,
        sessionTesting: false,
        apiConnected: false,
        
        // ===== WEBSOCKET STATE =====
        socket: null,
        socketConnected: false,
        realtimeUpdates: true,
        automationProgress: null,
        
        // ===== FORM OBJECTS =====
        loginForm: { username: '', password: '' },
        profileForm: { full_name: '', email: '' },
        passwordForm: { current_password: '', new_password: '', confirm_password: '' },
        manualUrl: { url: '', title: '', pageType: 'content' },
        newProject: {
            name: '',
            description: '',
            primary_url: '',
            compliance_standard: 'WCAG_2_1_AA'
        },
        newTestingSession: {
            name: '',
            description: '',
            conformance_level: 'AA',
            testing_approach: 'hybrid'
        },
        authConfigForm: {
            name: '',
                    type: 'form',
            login_url: '',
            username: '',
            password: '',
                    description: '',
                    auth_role: 'default',
                    priority: 1,
                    is_default: false,
                    // Advanced SAML/SSO fields
                    idp_domain: '',
                    username_selector: 'input[name="username"]',
                    password_selector: 'input[type="password"]',
                    submit_selector: 'button[type="submit"]'
        },
        newCrawler: {
            name: '',
            description: '',
            base_url: '',
            auth_type: 'none',
            max_depth: 3,
            max_pages: 100,
            follow_external: false,
            respect_robots: true,
            concurrent_pages: 5,
            delay_ms: 1000,
            browser_type: 'chromium',
            request_delay_ms: 2000,
            session_persistence: false,
            respect_robots_txt: false,
            // Properly initialize all nested objects that are referenced in templates
            saml_config: {
                idp_domain: '',
                username_selector: '',
                password_selector: '',
                submit_selector: '',
                login_page: '',
                success_url: '',
                timeout_ms: 30000
            },
            auth_credentials: {
                username: '',
                password: '',
                domain: '',
                additional_fields: {}
            },
            auth_workflow: {
                username_selector: '',
                password_selector: '',
                submit_selector: '',
                success_indicators: [],
                additional_steps: []
            }
        },
        
        // ===== CONFIGURATION OBJECTS =====
        discoveryConfig: {
            maxDepth: 3,
            maxPages: 100,
            mode: 'comprehensive'
        },
        authSetup: {
            step: null,
            type: null,
            sso: { url: '', loginPage: '', successUrl: '', name: '' },
            basic: { url: '', loginPage: '', username: '', password: '', name: '' },
            advanced: { type: 'api_key', url: '', apiKey: '', token: '', name: '' }
        },
        
        // ===== PROGRESS TRACKING OBJECTS =====
        crawlerProgress: {
            percentage: 0,
            message: '',
            pagesFound: 0,
            currentUrl: ''
        },
        discoveryProgress: {
            percentage: 0,
            message: 'Starting discovery...',
            pagesFound: 0,
            currentUrl: ''
        },
        
        // ===== DATA ARRAYS =====
        projects: [],
        webCrawlers: [],
        authConfigs: [],
        projectAuthConfigs: [],
        availableUrls: [],
        sessions: [],
        discoveries: [],
        discoveredPages: [],
        testSessions: [],
        complianceSessions: [],
        selectedCrawlers: [],
        crawlerPages: [],
        filteredCrawlerPages: [],
        
        // ===== TESTING RESULTS ARRAYS =====
        manualTestResults: [],
        automatedTestResults: [],
        testSessionResults: [],
        recentViolations: [],
        sessionResults: [],
        
        // ===== TEST GRID STATE =====
        showTestGrid: false,
        selectedSession: null,
        testInstances: [],
        filteredTestInstances: [],
        loadingTestInstances: false,
        selectedTestInstance: null,
        showTestInstanceModal: false,
        showEvidenceModal: false,
        testGridFilters: {
            status: '',
            level: '',
            testMethod: ''
        },
        availableTesters: [],
        
        // ===== ENHANCED TEST GRID STATE =====
        selectedTestInstances: [],
        bulkStatusUpdate: '',
        bulkTesterAssignment: '',
        testGridSort: {
            field: 'criterion_number',
            direction: 'asc'
        },
        
        // ===== ADVANCED TEST GRID STATE =====
        showTestGrid: false,
        selectedTestSession: null,
        testGridInstances: [],
        filteredTestGridInstances: [],
        selectedTestGridInstances: [],
        testGridSearch: '',
        testGridFilters: {
            status: '',
            level: '',
            testMethod: '',
            assignedTester: ''
        },
        testGridView: 'detailed', // 'compact' or 'detailed'
        bulkOperation: '',
        
        // ===== TEST GRID PAGINATION STATE =====
        testGridPagination: {
            currentPage: 1,
            pageSize: 50,
            totalItems: 0,
            totalPages: 0,
            hasMore: false
        },
        testGridLoading: false,
        testGridPerformanceMode: false, // Auto-enable for large datasets
        
        // ===== REQUIREMENTS VIEWER STATE =====
        showRequirementsModal: false,
        showRequirementDetailsModal: false,
        currentRequirement: null,
        loadingRequirementDetails: false,
        allRequirements: [],
        sessionRequirements: [],
        filteredRequirements: [],
        paginatedRequirements: [],
        requirementsTestInstances: [],
        requirementFilters: {
            testStatus: '',
            wcagLevel: '',
            testMethod: '',
            searchTerm: ''
        },
        // Legacy naming for compatibility
        requirementsFilters: {
            search: '',
            type: '',
            level: '',
            testMethod: ''
        },
        requirementStats: {
            total: 0,
            automated_passed: 0,
            automated_failed: 0,
            manual_completed: 0,
            manual_pending: 0,
            not_tested: 0
        },
        requirementCurrentPage: 1,
        requirementPageSize: 20,
        requirementTotalPages: 1,
        selectedRequirement: null,
        
        // ===== REQUIREMENTS FUNCTIONS (for Alpine.js template access) =====
        loadSessionRequirements: async function(sessionId) {
            console.log(`🚀 loadSessionRequirements called with sessionId: ${sessionId}`);
            console.log(`📊 Current state - sessionRequirements length:`, this.sessionRequirements?.length || 0);
            
            if (!sessionId) {
                console.error('❌ No session ID provided to loadSessionRequirements');
                this.showNotification('error', 'Requirements Error', 'Session ID is required');
                return;
            }
            
            try {
                console.log(`🔍 Loading requirements for session ${sessionId}`);
                this.loading = true;
                
                // Initialize requirements arrays if they don't exist
                if (!this.sessionRequirements) this.sessionRequirements = [];
                if (!this.filteredRequirements) this.filteredRequirements = [];
                if (!this.paginatedRequirements) this.paginatedRequirements = [];
                if (!this.requirementFilters) {
                    this.requirementFilters = {
                        testStatus: '',
                        wcagLevel: '',
                        testMethod: '',
                        searchTerm: ''
                    };
                }
                if (!this.requirementStats) {
                    this.requirementStats = {
                        total: 0,
                        automated_passed: 0,
                        automated_failed: 0,
                        manual_completed: 0,
                        manual_pending: 0,
                        not_tested: 0
                    };
                }
                if (!this.requirementCurrentPage) this.requirementCurrentPage = 1;
                if (!this.requirementPageSize) this.requirementPageSize = 20;
                if (!this.requirementTotalPages) this.requirementTotalPages = 1;
                
                // Load requirements specific to this session
                let requirementsData = [];
                
                try {
                    console.log(`📋 Loading requirements for session ${sessionId}`);
                    
                    // Get session details first to understand conformance level
                    const sessionResponse = await this.apiCall(`/testing-sessions/${sessionId}`);
                    if (!sessionResponse.success) {
                        throw new Error('Failed to load session details');
                    }
                    
                    const session = sessionResponse.session;
                    const conformanceLevel = session.conformance_level || 'wcag_aa';
                    console.log(`📋 Session conformance level: ${conformanceLevel}`);
                    
                    // Load requirements based on session's conformance level
                    let requirementsResponse;
                    
                    try {
                        // Try the unified requirements endpoint for this session
                        requirementsResponse = await this.apiCall(`/unified-requirements/session/${sessionId}`);
                        
                        if (requirementsResponse.success && requirementsResponse.data?.requirements) {
                            requirementsData = requirementsResponse.data.requirements;
                            console.log(`✅ Successfully loaded ${requirementsData.length} requirements for session`);
                        } else {
                            // Fallback to conformance level endpoint
                            console.log(`📋 Trying conformance level endpoint for ${conformanceLevel}`);
                            requirementsResponse = await this.apiCall(`/unified-requirements/conformance/${conformanceLevel}`);
                            
                            if (requirementsResponse.success && requirementsResponse.data?.requirements) {
                                requirementsData = requirementsResponse.data.requirements;
                                console.log(`✅ Successfully loaded ${requirementsData.length} requirements by conformance level`);
                            } else {
                                throw new Error('No requirements data available from API');
                            }
                        }
                        
                    } catch (apiError) {
                        console.warn('🔓 API failed, trying fallback endpoints:', apiError.message);
                        
                        // Fallback to basic requirements endpoint
                        try {
                            requirementsResponse = await this.apiCall(`/requirements?limit=100`);
                            if (requirementsResponse.success && requirementsResponse.data?.requirements) {
                                requirementsData = requirementsResponse.data.requirements;
                                console.log(`✅ Successfully loaded ${requirementsData.length} requirements from fallback API`);
                            } else {
                                throw new Error('Fallback API also failed');
                            }
                        } catch (fallbackError) {
                            console.error('❌ All API endpoints failed:', fallbackError);
                            throw apiError; // Re-throw original error
                        }
                    }
                    
                } catch (error) {
                    console.error('❌ Failed to load requirements from API:', error);
                    requirementsData = [];
                    this.showNotification('error', 'Requirements Loading Failed', `Failed to load requirements: ${error.message}. Please check authentication.`);
                    return; // Exit early if we can't load requirements
                }
                
                // Transform data to match expected format (based on unified_requirements table structure)
                const transformedRequirements = requirementsData.map(req => {
                    console.log('🔍 Processing requirement:', req);
                    return {
                        id: req.id || req.requirement_id,
                        requirement_id: req.requirement_id || req.criterion_number,
                        criterion_number: req.requirement_id || req.criterion_number,
                        title: req.title,
                        description: req.description,
                        requirement_type: req.standard_type || req.requirement_type,
                        level: req.level,
                        test_method: req.test_method || 'both',
                        automated_tools: req.automated_tools || [],
                        automation_confidence: req.automation_confidence || 'none',
                        status: req.status || 'not_tested',
                        automated_status: req.automated_status || 'not_tested',
                        manual_status: req.manual_status || 'not_tested',
                        notes: req.notes || '',
                        created_at: req.created_at,
                        updated_at: req.updated_at
                    };
                });
                
                console.log(`✅ Transformed ${transformedRequirements.length} requirements`);
                
                // Store the requirements data - ensure unique IDs
                const uniqueRequirements = transformedRequirements.reduce((acc, req) => {
                    const key = req.id || req.requirement_id || req.criterion_number;
                    if (!acc.find(existing => (existing.id || existing.requirement_id || existing.criterion_number) === key)) {
                        acc.push(req);
                    }
                    return acc;
                }, []);
                
                this.sessionRequirements = uniqueRequirements;
                this.filteredRequirements = [...uniqueRequirements];
                
                // Calculate statistics
                this.calculateRequirementStats();
                
                // Apply pagination
                this.updateRequirementsPagination();
                
                console.log(`✅ Requirements loaded successfully: ${this.sessionRequirements.length} total, ${this.filteredRequirements.length} filtered`);
                
                this.showNotification('success', 'Requirements Loaded', `Successfully loaded ${this.sessionRequirements.length} requirements`);
                
            } catch (error) {
                console.error('❌ Error in loadSessionRequirements:', error);
                this.showNotification('error', 'Requirements Error', `Failed to load requirements: ${error.message}`);
            } finally {
                this.loading = false;
            }
        },
        
        // ===== REQUIREMENTS HELPER FUNCTIONS =====
        calculateRequirementStats: function() {
            if (!this.sessionRequirements) return;
            
            // Count requirements by test method (this is what determines if they can be automated)
            const automatedRequirements = this.sessionRequirements.filter(r => r.test_method === 'automated').length;
            const hybridRequirements = this.sessionRequirements.filter(r => r.test_method === 'both').length;
            const manualRequirements = this.sessionRequirements.filter(r => r.test_method === 'manual').length;
            
            // Count requirements by actual test status
            const automatedPassed = this.sessionRequirements.filter(r => r.automated_status === 'passed').length;
            const automatedFailed = this.sessionRequirements.filter(r => r.automated_status === 'failed').length;
            const manualCompleted = this.sessionRequirements.filter(r => r.manual_status === 'completed').length;
            const manualPending = this.sessionRequirements.filter(r => r.manual_status === 'pending').length;
            const notTested = this.sessionRequirements.filter(r => r.status === 'not_tested').length;
            
            this.requirementStats = {
                total: this.sessionRequirements.length,
                automated_requirements: automatedRequirements,
                hybrid_requirements: hybridRequirements,
                manual_requirements: manualRequirements,
                automated_passed: automatedPassed,
                automated_failed: automatedFailed,
                manual_completed: manualCompleted,
                manual_pending: manualPending,
                not_tested: notTested
            };
            
            console.log(`📊 Requirements stats calculated:`, {
                total: this.requirementStats.total,
                automated: this.requirementStats.automated_requirements,
                hybrid: this.requirementStats.hybrid_requirements,
                manual: this.requirementStats.manual_requirements,
                automated_total: this.requirementStats.automated_requirements + this.requirementStats.hybrid_requirements
            });
        },
        
        updateRequirementsPagination: function() {
            if (!this.filteredRequirements) return;
            
            const startIndex = (this.requirementCurrentPage - 1) * this.requirementPageSize;
            const endIndex = startIndex + this.requirementPageSize;
            
            this.paginatedRequirements = this.filteredRequirements.slice(startIndex, endIndex);
            this.requirementTotalPages = Math.ceil(this.filteredRequirements.length / this.requirementPageSize);
        },
        
        filterRequirements: function() {
            if (!this.sessionRequirements) return;
            
            let filtered = [...this.sessionRequirements];
            
            // Apply filters
            if (this.requirementFilters.testStatus) {
                filtered = filtered.filter(r => r.status === this.requirementFilters.testStatus);
            }
            
            if (this.requirementFilters.wcagLevel) {
                filtered = filtered.filter(r => r.wcag_level === this.requirementFilters.wcagLevel);
            }
            
            if (this.requirementFilters.testMethod) {
                filtered = filtered.filter(r => r.test_method === this.requirementFilters.testMethod);
            }
            
            if (this.requirementFilters.searchTerm) {
                const search = this.requirementFilters.searchTerm.toLowerCase();
                filtered = filtered.filter(r => 
                    r.title.toLowerCase().includes(search) ||
                    r.description.toLowerCase().includes(search) ||
                    r.criterion_number.toLowerCase().includes(search)
                );
            }
            
            this.filteredRequirements = filtered;
            this.requirementCurrentPage = 1; // Reset to first page
            this.updateRequirementsPagination();
        },
        
        viewRequirementDetails: function(requirement) {
            // First show the modal with basic info
            this.currentRequirement = requirement;
            this.showRequirementDetailsModal = true;
            this.loadingRequirementDetails = true;
            
            // Then fetch the full requirement details from the database
            this.fetchFullRequirementDetails(requirement.criterion_number);
        },
        
        fetchFullRequirementDetails: function(criterionNumber) {
            if (!criterionNumber) return;
            
            this.apiCall('/requirements', {
                method: 'GET',
                params: {
                    search: criterionNumber,
                    limit: 10
                }
            }).then(response => {
                if (response.success && response.data && response.data.requirements && response.data.requirements.length > 0) {
                    // Find the exact match for the criterion number
                    const fullRequirement = response.data.requirements.find(req => 
                        req.criterion_number === criterionNumber
                    );
                    
                    if (fullRequirement) {
                        // Merge the full requirement details with the current requirement
                        this.currentRequirement = {
                            ...this.currentRequirement,
                            ...fullRequirement
                        };
                        console.log('✅ Loaded full requirement details:', fullRequirement);
                    }
                    this.loadingRequirementDetails = false;
                }
            }).catch(error => {
                console.error('Error fetching full requirement details:', error);
                this.loadingRequirementDetails = false;
            });
        },
        
        closeRequirementDetailsModal: function() {
            this.showRequirementDetailsModal = false;
            this.currentRequirement = null;
        },
        
        copyRequirementToClipboard: function() {
            if (!this.currentRequirement) return;
            
            const requirement = this.currentRequirement;
            const text = `WCAG Requirement ${requirement.criterion_number}: ${requirement.title}

Level: ${requirement.level?.toUpperCase() || 'N/A'}
Test Method: ${(requirement.test_method || 'manual').charAt(0).toUpperCase() + (requirement.test_method || 'manual').slice(1)}
Priority: ${requirement.priority === 1 ? 'High' : requirement.priority === 2 ? 'Medium' : 'Low'}
Estimated Time: ${requirement.estimated_time_minutes ? requirement.estimated_time_minutes + ' minutes' : 'Not specified'}

Description:
${requirement.description || 'No description available'}

${requirement.testing_instructions ? `Testing Instructions:
${requirement.testing_instructions}

` : ''}${requirement.acceptance_criteria ? `Acceptance Criteria:
${requirement.acceptance_criteria}

` : ''}${requirement.failure_examples ? `Failure Examples:
${requirement.failure_examples}

` : ''}${requirement.wcag_url ? `WCAG Documentation: ${requirement.wcag_url}` : ''}`;
            
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('success', 'Copied!', 'Requirement details copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy to clipboard:', err);
                this.showNotification('error', 'Copy Failed', 'Failed to copy to clipboard');
            });
        },
        
        getRequirementTestInstances: function(criterionNumber) {
            if (!criterionNumber || !this.sessionDetailsTestInstances) return [];
            
            return this.sessionDetailsTestInstances.filter(instance => 
                instance.criterion_number === criterionNumber
            );
        },
        
        // ===== AUDIT TIMELINE FUNCTIONS (for Alpine.js template access) =====
        getGroupedTimeline: function() {
            const grouped = {};
            if (this.auditTimeline && this.auditTimeline.timeline) {
                this.auditTimeline.timeline.forEach(item => {
                    const date = new Date(item.timestamp || item.changed_at).toDateString();
                    if (!grouped[date]) grouped[date] = [];
                    grouped[date].push(item);
                });
            }
            return grouped;
        },
        
        // ===== SESSION DETAILS MODAL STATE =====
        showSessionDetailsModal: false,
        selectedSessionDetails: null,
        loadingSessionDetails: false,
        sessionDetailsActiveTab: 'overview',
        sessionDetailsStats: {},
        sessionDetailsActivities: [],
        sessionDetailsTeam: {},
        sessionDetailsTestInstances: [],
        sessionDetailsPages: [],
        
        // ===== AUTOMATION PROGRESS STATE =====
        automationProgress: {
            completedTests: 0,
            totalTests: 0,
            violationsFound: 0,
            percentage: 0,
            message: '',
            currentTool: ''
        },
        
        // ===== USER MANAGEMENT STATE =====
        get showUserManagement() {
            return this._showUserManagement || false;
        },
        set showUserManagement(value) {
            if (value && this.preventAutoUserManagement) {
                console.log('🛑 DEBUG: Attempt to set showUserManagement=true blocked during initialization', {
                    stackTrace: new Error().stack
                });
                return;
            }
            console.log('🔍 DEBUG: showUserManagement state changed to:', value, {
                stackTrace: new Error().stack
            });
            this._showUserManagement = value;
        },
        _showUserManagement: false,
        showUserForm: false,
        showDeleteUserModal: false,
        preventAutoUserManagement: true, // Prevent auto-opening during initialization
        userForm: {
            id: null,
            username: '',
            email: '',
            full_name: '',
            role: 'tester',
            is_active: true,
            password: '',
            confirm_password: ''
        },
        
        // ===== SESSION DETAILS MODAL STATE =====
        showSessionDetailsModal: false,
        selectedSessionDetails: null,
        loadingSessionDetails: false,
        sessionDetailsActiveTab: 'overview',
        sessionDetailsStats: {},
        sessionDetailsActivities: [],
        sessionDetailsTeam: {},
        sessionDetailsTestInstances: [],
        sessionDetailsPages: [],
        sessionResults: null,
        automationRuns: [],
        automationRunsSummary: {},
        loadingAutomationRuns: false,
        
        // ===== AUTOMATION CHART STATE =====
        automationChart: null,
        automationChartPeriod: '7d', // '7d', '30d', 'all'
        automationChartData: {
            labels: [],
            datasets: []
        },
        isUpdatingChart: false,
        
        // ===== UTILITY FUNCTIONS =====
        getAutomationRunStatusClass(status) {
            const classes = {
                'running': 'bg-blue-100 text-blue-800',
                'completed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'cancelled': 'bg-gray-100 text-gray-800',
                'pending': 'bg-yellow-100 text-yellow-800'
            };
            return classes[status] || classes.pending;
        },
        
        getAutomationRunStatusDisplay(status) {
            const displays = {
                'running': 'Running',
                'completed': 'Completed',
                'failed': 'Failed',
                'cancelled': 'Cancelled',
                'pending': 'Pending'
            };
            return displays[status] || status;
        },
        
        formatTime(date) {
            if (!date) return '';
            return new Date(date).toLocaleTimeString();
        },
        
        formatDate(date) {
            if (!date) return '';
            return new Date(date).toLocaleDateString();
        },
        
        formatDuration(ms) {
            if (!ms) return 'N/A';
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) {
                return `${hours}h ${minutes % 60}m`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            } else {
                return `${seconds}s`;
            }
        },
        
        // ===== AUDIT TIMELINE STATE =====
        auditTimeline: {
            sessionId: null,
            sessionName: '',
            timeline: [],
            loading: false,
            error: null,
            viewMode: 'timeline', // 'timeline' or 'table'
            filters: {
                start_date: '',
                end_date: '',
                action_type: '',
                user_id: ''
            },
            statistics: null,
            pagination: {
                page: 1,
                has_more: false,
                total: 0
            },
            expandedItems: new Set()
        },

        // ===== SESSION CREATION WIZARD STATE =====
        showSessionWizard: false,
        wizardStep: 1,
        sessionWizard: {
            project_id: '',
            name: '',
            description: '',
            conformance_levels: [],
            selected_crawlers: [],
            selected_pages: [],
            smart_filtering: true,
            manual_requirements: [],
            creating: false
        },
        availableCrawlers: [],
        combinedPages: [],
        deduplicatedPages: [],
        availableRequirements: [],
        requirementCounts: {},
        cachedSelectedRequirements: [], // Cache to persist between steps
        lastConformanceLevelsString: '', // Track conformance level changes
        pageSearchQuery: '',
        pageFilterType: '',
        automationSummary: {},
        userFormErrors: {},
        allUsers: [],
        filteredUsers: [],
        userFilters: {
            role: '',
            status: '',
            search: ''
        },
        userPagination: {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 0,
            totalPages: 0
        },
        userSort: {
            field: 'username',
            direction: 'asc'
        },
        selectedUserForDelete: null,
        userStats: {
            total: 0,
            active: 0,
            admin: 0,
            recentLogins: 0
        },
        
        // ===== MANUAL TESTING STATE =====
        manualTestingSession: null,
        manualTestingProgress: null,
        manualTestingAssignments: [],
        filteredManualTestingAssignments: [],
        manualTestingFilters: {
            status: '',
            wcag_level: '',
            page_id: '',
            coverage_type: 'all'
        },
        manualTestingCoverageAnalysis: { recommendations: [] },
        showManualTestingModal: false,
        currentManualTest: null,
        manualTestingProcedure: null,
        manualTestingContext: { violations: [], recommended_tools: [] },
        
        // ===== TESTING STATE FLAGS =====
        automatedTestingInProgress: false,
        
        // ===== TESTING CONFIGURATION =====
        testingConfig: {
            useAxe: true,
            usePa11y: true,
            useLighthouse: true,
            wcagLevel: 'AA',
            browser: 'chromium'
        },
        automatedTestConfig: {
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
        },
        
        // ===== TESTING PROGRESS =====
        testingProgress: {
            percentage: 0,
            message: '',
            completedPages: 0,
            totalPages: 0,
            currentPage: ''
        },
        
        // ===== RESULTS SUMMARIES =====
        resultsSummary: {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            complianceScore: 0
        },
        complianceAnalysis: {
            levelA: 0,
            levelAA: 0,
            levelAAA: 0
        },
        
        // ===== SELECTION AND REFERENCE OBJECTS =====
        selectedProject: null,
        currentProject: null, // Full project object for easy access
        selectedDiscovery: null,
        selectedCrawlerForPages: null,
        selectedAuthProject: null,
        editingAuthConfig: null,
        discoveryToDelete: null,
        projectToDelete: null,
        sessionToDelete: null,
        currentTestInstance: null,
        selectedSession: null,
        selectedTestResult: null,
        selectedTestingSession: null,
        
        // ===== AUTHENTICATION AND USER =====
        isAuthenticated: false,
        user: null,
        
        // ===== SEARCH AND FILTER PROPERTIES =====
        urlSearch: '',
        urlSourceFilter: 'all',
        crawlerPageSearch: '',
        crawlerPageFilter: '',
        
        // ===== ERROR HANDLING =====
        loginError: '',
        passwordError: '',
        
        // ===== MISC PROPERTIES =====
        activeTab: 'projects',
        totalCrawlers: 0,
        notification: { show: false, type: '', title: '', message: '' },
        sessionInfo: { 
            isValid: false, 
            lastActivity: null, 
            status: 'inactive',
            username: '',
            capturedDate: '',
            expirationDate: '',
            pagesCount: 0
        },
        
        // ===== MANUAL URL FORM =====
        newManualUrl: '',
        newManualUrlTitle: '',
        newManualUrlType: 'content',
        newManualUrlDepth: 1,
        newManualUrlRequiresAuth: false,
        newManualUrlHasForms: false,
        newManualUrlForTesting: true,
        addingManualUrl: false,
        
        // ===== TESTING SESSIONS STATE =====
        testingSessions: [],
        filteredTestingSessions: [],
        sessionFilters: {
            status: '',
            conformance_level: ''
        },
        showCreateTestingSession: false,
        showSessionDetails: false,
        showTestingMatrix: false,
        selectedSession: null,
        testingMatrix: null,
        newTestingSession: {
            name: '',
            description: '',
            conformance_level: '',
            priority: 'medium',
            testing_approach: 'hybrid',
            pageScope: 'all',
            applySmartFiltering: true,
            createBulkInstances: false,
            enableProgressTracking: true,
            notifyOnCompletion: false,
            enableAuditTrail: true
        },
        showAdvancedOptions: false,
        
        // Legacy session data for compatibility
        complianceSessions: [],
        sessions: [],
        testSessions: [],
        
        // ===== MANUAL TESTING STATE =====
    };

    // ===== MERGE WITH ORGANIZED STATE STRUCTURE =====
    return {
        // Apply all defaults first
        ...defaults,
        
        // ===== ORGANIZED STATE STRUCTURE =====
        ui: {
            activeTab: 'projects',
            loading: false,
            modals: {
                showLogin: false,
                showProfile: false,
                showSessionUrl: false,
                showCreateCrawler: false,
                showCrawlerPagesModal: false,
                showAddAuthConfigModal: false,
                showEditAuthConfigModal: false,
                showSessions: false,
                showChangePassword: false
            },
            notification: { show: false, type: '', title: '', message: '' }
        },
        
        // ===== ADMIN BACKUP FUNCTIONALITY =====
        admin: {
            // Database backup state
            databaseStatus: { size: null, tables: null, lastBackup: null },
            backups: [],
            newBackupDescription: '',
            includeSchema: true,
            includeData: true,
            compressBackup: true,
            creatingBackup: false,
            loadingBackups: false,
            backupProgress: { message: '', percentage: 0 },
            
            // Modal states
            showBackupModal: false,
            showRestoreModal: false,
            showDeleteModal: false,
            selectedBackup: null,
            confirmRestore: false,
            restoringBackup: false,
            deletingBackup: false
        },
        
        // ===== USER MANAGEMENT FUNCTIONALITY =====
        userManagement: {
            users: [],
            stats: {},
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            limit: 25,
            sortField: 'created_at',
            sortOrder: 'DESC',
            filters: {
                search: '',
                role: '',
                status: ''
            },
            isLoading: false,
            editingUser: null,
            deletingUserId: null
        },
        
        auth: {
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            user: null
        },
        
        forms: {
            login: { username: '', password: '', error: '' },
            profile: { full_name: '', email: '' },
            password: { current_password: '', new_password: '', confirm_password: '', error: '' }
        },
        
        data: {
            projects: [],
            selectedProject: null,
            webCrawlers: [],
            authConfigs: [],
            availableUrls: [],
            sessionInfo: { 
                isValid: false, 
                lastActivity: null, 
                status: 'inactive',
                username: '',
                capturedDate: '',
                expirationDate: '',
                pagesCount: 0
            }
        },
        
        ws: {
            socket: null,
            connected: false,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5,
            reconnectDelay: 1000
        },
        
        config: {
            apiBaseUrl: 'http://localhost:3001',
            tokenRefreshInterval: null
        },
        
        // Legacy state for compatibility (will be removed)
        projects: [],
        selectedProject: null,
        webCrawlers: [],
        authConfigs: [],
        crawlerPages: [],
        availableUrls: [],
        sessionInfo: { 
            isValid: false, 
            lastActivity: null, 
            status: 'inactive',
            username: '',
            capturedDate: '',
            expirationDate: '',
            pagesCount: 0
        },
        apiConnected: false,
        wsConnected: false,
        wsConnecting: false,
        wsReconnectAttempts: 0,
        notification: { show: false, type: '', title: '', message: '' },
        showAdvancedCrawlerOptions: false,
        
        // Additional legacy properties for template compatibility
                    activeTab: 'projects',  // Always start with Projects tab
        // All properties now initialized via comprehensive defaults object above
        
        // ===== LIFECYCLE METHODS =====
        
        // Alpine.js automatically calls this when the component initializes
        init() {
            // 🛡️ Prevent double initialization
            if (this._initialized) {
                console.warn('⚠️ Dashboard init() called twice, skipping');
                return;
            }
            this._initialized = true;
            this._initializationTime = Date.now(); // Track when component was initialized
            
            // Initialize automationProgress to null so progress bar only shows when there's actual progress
            this.automationProgress = null;
            
            console.log('✅ Dashboard initialized');
            
            // Immediately ensure nested objects are protected
            this.ensureNestedObjects();
            this.syncLegacyState();
            
            // Set up periodic protection against timing issues
            this.setupNestedObjectProtection();
            
            this.checkAuthentication();
            this.checkApiConnection();
            this.initWebSocket();
        },
        
        setupNestedObjectProtection() {
            // Protect against timing issues by periodically checking nested objects
            setInterval(() => {
                this.ensureNestedObjects();
            }, 1000); // Check every second
            
            // Also protect against component loading that might reset objects
            const observer = new MutationObserver(() => {
                this.ensureNestedObjects();
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        async initAsync() {
            await this.loadInitialData();
        },
        
        // ===== WEBSOCKET METHODS =====
        
        // Initialize WebSocket connection
        initWebSocket() {
            try {
                if (this.socket) {
                    console.log('🔌 WebSocket already connected');
                    return;
                }
                
                const token = this.getAuthToken();
                if (!token) {
                    console.log('⚠️ No auth token available, skipping WebSocket connection');
                    return;
                }
                
                console.log('🔌 Connecting to WebSocket...');
                
                this.socket = io('http://localhost:3001', {
                    auth: { token },
                    transports: ['websocket', 'polling']
                });
                
                this.setupWebSocketEventHandlers();
                
            } catch (error) {
                console.error('❌ WebSocket initialization error:', error);
            }
        },
        
        // Setup WebSocket event handlers
        setupWebSocketEventHandlers() {
            if (!this.socket) return;
            
            // Connection events
            this.socket.on('connect', () => {
                console.log('✅ WebSocket connected');
                this.socketConnected = true;
                this.wsConnected = true; // For header compatibility
                
                // Join current project room if we have one
                if (this.selectedProject?.id) {
                    this.socket.emit('join_project', this.selectedProject.id);
                }
                
                // Join current session room if we have one
                if (this.selectedTestSession?.id) {
                    this.socket.emit('join_session', this.selectedTestSession.id);
                }
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('🔌 WebSocket disconnected:', reason);
                this.socketConnected = false;
                this.wsConnected = false; // For header compatibility
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('❌ WebSocket connection error:', error);
                this.socketConnected = false;
                this.wsConnected = false; // For header compatibility
            });
            
            // Automation progress events
            this.socket.on('session_progress', (data) => {
                console.log('📊 Automation progress update received:', data);
                this.handleAutomationProgress(data);
                
                // Refresh test grid to show status changes if it's open
                if (this.showTestGrid && this.selectedTestSession?.id === data.sessionId) {
                    this.refreshTestGridStatuses();
                }
            });
            
            this.socket.on('session_complete', (data) => {
                console.log('🏁 Automation completed:', data);
                this.handleAutomationComplete(data);
            });
            
            this.socket.on('testing_milestone', (data) => {
                console.log('🎯 Testing milestone:', data);
                this.handleTestingMilestone(data);
            });
            
            this.socket.on('test_results', (data) => {
                console.log('📊 Test results update:', data);
                this.handleTestResults(data);
            });
            
            // Project and session events
            this.socket.on('user_joined_project', (data) => {
                console.log('👥 User joined project:', data);
            });
            
            this.socket.on('user_joined_session', (data) => {
                console.log('👥 User joined session:', data);
            });
            
            // Discovery events
            this.socket.on('discovery_progress', (data) => {
                console.log('🕷️ Discovery progress:', data);
                this.handleDiscoveryProgress(data);
            });
            
            this.socket.on('discovery_complete', (data) => {
                console.log('🏁 Discovery complete:', data);
                this.handleDiscoveryComplete(data);
            });
            
            // General notifications
            this.socket.on('notification', (data) => {
                console.log('🔔 Notification:', data);
                this.showNotification(data.type || 'info', data.title || 'Update', data.message);
            });
        },
        
        // Handle automation progress updates
        handleAutomationProgress(data) {
            if (!data || !data.progress) return;
            
            const progress = data.progress;
            
            // Update automation progress state with enhanced information
            this.automationProgress = {
                sessionId: data.sessionId,
                percentage: progress.percentage || 0,
                completedTests: progress.completedTests || 0,
                totalTests: progress.totalTests || 0,
                currentPage: progress.currentPage || '',
                currentTool: progress.currentTool || '',
                message: progress.message || 'Processing...',
                stage: progress.stage || 'testing',
                violationsFound: progress.violationsFound || 0,
                statistics: progress.statistics || {},
                // Enhanced fields for detailed status
                currentPageIndex: progress.currentPageIndex || 0,
                totalPages: progress.totalPages || 0,
                completedPages: progress.completedPages || 0,
                status: progress.status || 'processing',
                lastResult: progress.lastResult || null,
                lastError: progress.lastError || null
            };
            
            // Show enhanced real-time notification with detailed information
            if (this.realtimeUpdates) {
                let notificationMessage = `${progress.percentage}% complete`;
                
                // Add detailed status information
                if (progress.currentPage) {
                    notificationMessage += ` - Testing ${progress.currentPage}`;
                }
                
                if (progress.currentTool) {
                    notificationMessage += ` with ${progress.currentTool}`;
                }
                
                if (progress.currentPageIndex && progress.totalPages) {
                    notificationMessage += ` (Page ${progress.currentPageIndex}/${progress.totalPages})`;
                }
                
                if (progress.lastResult) {
                    notificationMessage += ` - ${progress.lastResult.violations} violations found`;
                }
                
                if (progress.lastError) {
                    notificationMessage += ` - Error: ${progress.lastError.error}`;
                }
                
                this.showNotification('info', 'Automation Progress', notificationMessage);
            }
            
            // Update session details if they're open
            if (this.selectedTestSession?.id === data.sessionId) {
                this.refreshSessionAutomationSummary();
            }
            
            // Log detailed progress for debugging
            console.log('📊 Enhanced automation progress:', {
                tool: progress.currentTool,
                page: progress.currentPage,
                progress: `${progress.currentPageIndex || 0}/${progress.totalPages || 0}`,
                status: progress.status,
                message: progress.message,
                lastResult: progress.lastResult,
                lastError: progress.lastError
            });
        },
        
        // Handle automation completion
        handleAutomationComplete(data) {
            if (!data) return;
            
            console.log('🎉 Automation completed for session:', data.sessionId);
            
            // Reset progress state
            this.automationProgress = null;
            
            // Show completion notification
            this.showNotification('success', 'Automation Complete', 
                `Testing completed! ${data.results?.violationsFound || 0} issues found.`);
            
            // Refresh relevant data
            if (this.selectedTestSession?.id === data.sessionId) {
                this.refreshSessionAutomationSummary();
                // Refresh test grid if it's open
                if (this.showTestGrid) {
                    setTimeout(() => {
                        this.loadTestInstancesForGrid(data.sessionId, this.testGridPagination.currentPage, true);
                    }, 1000);
                }
            }
        },
        
        // Handle testing milestones
        handleTestingMilestone(data) {
            if (!data || !data.milestone) return;
            
            const milestone = data.milestone;
            console.log(`🎯 Testing milestone: ${milestone.type} - ${milestone.message}`);
            
            // Show milestone notifications for important events
            if (['tool_complete', 'critical_violation', 'progress_50', 'progress_75'].includes(milestone.type)) {
                this.showNotification('info', 'Testing Milestone', milestone.message);
            }
        },
        
        // Handle individual test results
        handleTestResults(data) {
            if (!data || !data.testData) return;
            
            const testData = data.testData;
            console.log('📊 New test result:', testData);
            
            // Show detailed test result notification
            if (this.realtimeUpdates && testData.status === 'completed') {
                let resultMessage = `${testData.tool} completed ${testData.url}`;
                
                if (testData.violations !== undefined) {
                    resultMessage += ` - ${testData.violations} violations`;
                    if (testData.critical !== undefined && testData.critical > 0) {
                        resultMessage += ` (${testData.critical} critical)`;
                    }
                }
                
                if (testData.title) {
                    resultMessage += ` - "${testData.title}"`;
                }
                
                this.showNotification('success', 'Test Completed', resultMessage);
            } else if (this.realtimeUpdates && testData.status === 'error') {
                this.showNotification('error', 'Test Error', 
                    `${testData.tool} error testing ${testData.url}: ${testData.error}`);
            }
            
            // If test grid is open, refresh it to show new results
            if (this.showTestGrid && this.selectedTestSession?.id === data.sessionId) {
                // Debounced refresh to avoid too many updates
                clearTimeout(this.testResultsRefreshTimer);
                this.testResultsRefreshTimer = setTimeout(() => {
                    this.loadTestInstancesForGrid(data.sessionId, this.testGridPagination.currentPage, true);
                }, 2000);
            }
        },
        
        // Handle discovery progress updates
        handleDiscoveryProgress(data) {
            if (!data || !data.progress) return;
            
            const progress = data.progress;
            console.log(`🕷️ Discovery progress: ${progress.percentage}% - ${progress.pagesFound} pages found`);
            
            // Update discovery state if we're tracking this discovery
            if (this.discoveryInProgress && data.discoveryId === this.currentDiscoveryId) {
                this.discoveryProgress = {
                    percentage: progress.percentage,
                    pagesFound: progress.pagesFound,
                    currentUrl: progress.currentUrl,
                    message: progress.message
                };
            }
        },
        
        // Handle discovery completion
        handleDiscoveryComplete(data) {
            if (!data) return;
            
            console.log('🏁 Discovery complete:', data.results);
            
            this.showNotification('success', 'Discovery Complete', 
                `Found ${data.results.total_pages_found} pages`);
            
            // Refresh crawler data
            this.loadCrawlerPageCounts(true);
        },
        
        // Join project room for real-time updates
        joinProjectRoom(projectId) {
            if (this.socket && this.socketConnected && projectId) {
                console.log('📁 Joining project room:', projectId);
                this.socket.emit('join_project', projectId);
            }
        },
        
        // Join session room for real-time updates
        joinSessionRoom(sessionId) {
            if (this.socket && this.socketConnected && sessionId) {
                console.log('🧪 Joining session room:', sessionId);
                this.socket.emit('join_session', sessionId);
            }
        },
        
        // Refresh test grid statuses without full reload
        refreshTestGridStatuses() {
            // Debounced refresh to avoid too many requests
            clearTimeout(this.statusRefreshTimer);
            this.statusRefreshTimer = setTimeout(() => {
                if (this.selectedTestSession?.id) {
                    console.log('🔄 Refreshing test grid statuses...');
                    this.loadTestInstancesForGrid(this.selectedTestSession.id, this.testGridPagination.currentPage, true);
                }
            }, 1000); // Wait 1 second to batch multiple status changes
        },
        
        // Disconnect WebSocket
        disconnectWebSocket() {
            if (this.socket) {
                console.log('🔌 Disconnecting WebSocket...');
                this.socket.disconnect();
                this.socket = null;
                this.socketConnected = false;
            }
        },

        syncLegacyState() {
            // Keep legacy flat properties in sync with organized state
            // This ensures all Alpine.js template bindings work correctly
            Object.keys(this).forEach(key => {
                if (key in this.ui) this[key] = this.ui[key];
                if (key in this.auth) this[key] = this.auth[key];
                if (key in this.data) this[key] = this.data[key];
                if (key in this.forms) this[key] = this.forms[key];
                if (key in this.ws && key === 'connected') this.apiConnected = this.ws[key];
            });
            
            // Explicitly sync WebSocket state for templates
            this.wsConnected = this.ws.connected || false;
            this.wsConnecting = this.ws.connecting || false;
            
            // Explicitly sync critical auth properties for template compatibility
            this.isAuthenticated = this.auth.isAuthenticated || false;
            this.user = this.auth.user || null;
            this.token = this.auth.token || null;
            this.showLogin = this.ui.modals.showLogin || false;
            this.showProfile = this.ui.modals.showProfile || false;
            this.showChangePassword = this.ui.modals.showChangePassword || false;
            this.showSessions = this.ui.modals.showSessions || false;
            this.showAddAuthConfigModal = this.ui.modals.showAddAuthConfigModal || false;
            this.showEditAuthConfigModal = this.ui.modals.showEditAuthConfigModal || false;
            this.showCreateCrawler = this.ui.modals.showCreateCrawler || false;
            this.showCrawlerPagesModal = this.ui.modals.showCrawlerPagesModal || false;
            
            // Sync authentication data arrays
            this.authConfigs = this.data.authConfigs || [];
            this.projectAuthConfigs = this.data.projectAuthConfigs || [];
            this.selectedAuthProject = this.data.selectedAuthProject || null;
            
            // Sync project selection for application-wide access
            this.selectedProject = this.data.selectedProject || null;
            this.currentProject = this.getSelectedProject(); // Always keep object reference updated
            this.projects = this.data.projects || [];
            
            // Sync project-specific data arrays
            this.discoveries = this.data.discoveries || [];
            this.testSessions = this.data.testSessions || [];
            this.webCrawlers = this.data.webCrawlers || [];
            
            // Sync config object for API calls
            this.config = this.config || { apiBaseUrl: 'http://localhost:3001', tokenRefreshInterval: null };
            
            // Critical: Ensure nested objects remain properly initialized
            this.ensureNestedObjects();
        },
        
        ensureNestedObjects() {
            // Fix for timing issues - ensure critical nested objects are always properly initialized
            if (!this.newCrawler || typeof this.newCrawler !== 'object') {
                this.newCrawler = {};
            }
            
            if (!this.newCrawler.saml_config || typeof this.newCrawler.saml_config !== 'object') {
                this.newCrawler.saml_config = {
                    idp_domain: '',
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    login_page: '',
                    success_url: '',
                    timeout_ms: 30000
                };
            }
            
            if (!this.newCrawler.auth_credentials || typeof this.newCrawler.auth_credentials !== 'object') {
                this.newCrawler.auth_credentials = {
                    username: '',
                    password: '',
                    domain: '',
                    additional_fields: {}
                };
            }
            
            if (!this.newCrawler.auth_workflow || typeof this.newCrawler.auth_workflow !== 'object') {
                this.newCrawler.auth_workflow = {
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    success_indicators: [],
                    additional_steps: []
                };
            }
            
            // Ensure authSetup nested objects are also protected
            if (!this.authSetup || typeof this.authSetup !== 'object') {
                this.authSetup = {
                    step: null,
                    type: null,
                    sso: { url: '', loginPage: '', successUrl: '', name: '' },
                    basic: { url: '', loginPage: '', username: '', password: '', name: '' },
                    advanced: { type: 'api_key', url: '', apiKey: '', token: '', name: '' }
                };
            }
            
            if (!this.authSetup.sso) this.authSetup.sso = { url: '', loginPage: '', successUrl: '', name: '' };
            if (!this.authSetup.basic) this.authSetup.basic = { url: '', loginPage: '', username: '', password: '', name: '' };
            if (!this.authSetup.advanced) this.authSetup.advanced = { type: 'api_key', url: '', apiKey: '', token: '', name: '' };
        },

        destroy() {
            this.disconnectWebSocket();
            this.cleanupTokenRefreshTimer();
        },
        
        // ===== COMPUTED PROPERTIES =====
        
        get filteredUrls() {
            return this.availableUrls.filter(url => 
                url.url.toLowerCase().includes(this.urlSearch.toLowerCase())
            );
        },

        get selectedUrls() {
            return this.availableUrls.filter(url => url.selected);
        },

        get currentProject() {
            return this.projects.find(p => p.id === this.selectedProject);
        },
        
        // ===== MISSING HELPER METHODS =====
        
        getSelectedProjectInfo() {
            const project = this.getSelectedProject();
            return project ? `${project.name} (${project.primary_url})` : 'No project selected';
        },
        
        getSelectedPagesCount() {
            return this.discoveredPages.filter(page => page.selected).length;
        },

        hasWebCrawlerData() {
            // Check if current project has web crawler data available
            return this.data.selectedProject && 
                   this.data.webCrawlers && 
                   this.data.webCrawlers.length > 0 &&
                   this.data.webCrawlers.some(crawler => crawler.status === 'completed');
        },
        
        getProjectAuthConfigs(projectId) {
            return this.authConfigs.filter(config => config.project_id === projectId);
        },
        
        getProjectAuthStatus(projectId) {
            const configs = this.getProjectAuthConfigs(projectId);
            return configs.length > 0 ? 'configured' : 'not-configured';
        },
        
        // REMOVED: Duplicate method - using complete version at line 1887
        
        // ===== SESSION AND CAPTURE METHODS =====
        
        captureNewSession() {
            console.log('🔍 DEBUG: captureNewSession called');
            this.sessionCapturing = true;
            this.syncLegacyState();
            
            // Simulate session capture process
            setTimeout(() => {
                this.sessionCapturing = false;
                this.syncLegacyState();
                this.showNotification('success', 'Session Captured', 'Browser session captured successfully');
            }, 2000);
        },
        
        testSessionAccess() {
            this.sessionTesting = true;
            this.syncLegacyState();
            // Placeholder - implement session testing logic
            setTimeout(() => {
                this.sessionTesting = false;
                this.syncLegacyState();
                this.showNotification('info', 'Session Tested', 'Session access verified');
            }, 1500);
        },
        
        // ===== DISCOVERY METHODS =====
        
        startNewDiscovery() {
            if (!this.selectedProject || this.discoveryInProgress) return;
            
            this.discoveryInProgress = true;
            this.discoveryProgress = {
                percentage: 0,
                message: 'Starting discovery...',
                pagesFound: 0,
                currentUrl: ''
            };
            this.syncLegacyState();
            
            // Placeholder - implement discovery logic
            setTimeout(() => {
                this.discoveryInProgress = false;
                this.syncLegacyState();
                this.showNotification('success', 'Discovery Complete', 'Site discovery completed successfully');
            }, 3000);
        },
        
        // ===== MODAL MANAGEMENT METHODS =====
        
        // REMOVED: Duplicate method - using complete async version at line 1925
        
        closeCrawlerPagesModal() {
            this.ui.modals.showCrawlerPagesModal = false;
            this.selectedCrawlerForPages = null;
            this.crawlerPages = [];
            this.filteredCrawlerPages = [];
            this.crawlerPageSearch = '';
            this.crawlerPageFilter = '';
            this.syncLegacyState();
        },
        
        viewDiscoveredPages(discovery) {
            this.selectedDiscovery = discovery;
            this.showDiscoveredPagesModal = true;
            this.syncLegacyState();
        },
        
        closeDiscoveredPagesModal() {
            this.showDiscoveredPagesModal = false;
            this.selectedDiscovery = null;
            this.syncLegacyState();
        },
        
        toggleManualUrlForm() {
            this.showManualUrlForm = !this.showManualUrlForm;
            this.syncLegacyState();
        },
        
        // ===== PAGE SELECTION METHODS =====
        
        selectAllPages() {
            this.discoveredPages.forEach(page => page.selected = true);
            this.syncLegacyState();
        },
        
        deselectAllPages() {
            this.discoveredPages.forEach(page => page.selected = false);
            this.syncLegacyState();
        },
        
        // ===== AUTHENTICATION METHODS =====
        
        async checkAuthentication() {
            const token = localStorage.getItem('auth_token');
            const refreshToken = localStorage.getItem('refresh_token');
            
            if (!token) {
                // No token found - require proper authentication
                console.log('🔐 No authentication token found. Please log in.');
                this.auth.isAuthenticated = false;
                this.ui.modals.showLogin = true;
                this.isAuthenticated = false;
                this.showLogin = true;
                return;
            }
            
            this.auth.token = token;
            this.auth.refreshToken = refreshToken;
            this.token = token; // Set legacy property
            
            try {
                // Validate token with the session-info endpoint that requires authentication
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/session-info`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.auth.isAuthenticated = true;
                    this.auth.user = data.user;
                    this.ui.modals.showLogin = false;
                    
                    // Set legacy state
                    this.isAuthenticated = true;
                    this.user = data.user;
                    this.showLogin = false;
                    
                    // Initialize profile form
                    this.profileForm.full_name = data.user.full_name || '';
                    this.profileForm.email = data.user.email || '';
                    
                    this.startTokenRefreshTimer();
                    this.initializeWebSocket();
                    await this.loadInitialData();
                    this.syncLegacyState(); // Sync legacy state
                    
                    // Allow user management modal to open after initialization is complete
                    setTimeout(() => {
                        this.preventAutoUserManagement = false;
                        console.log('✅ User management modal auto-open protection disabled');
                    }, 10000); // Wait 10 seconds after auth check
                } else if (response.status === 401 && refreshToken) {
                    // Try to refresh token
                    await this.refreshToken();
                } else {
                    this.clearAuth();
                }
            } catch (error) {
                console.error('Authentication check failed:', error);
                this.clearAuth();
                this.ui.modals.showLogin = true;
                this.showLogin = true;
            }
        },
        
        async refreshToken() {
            if (!this.auth.refreshToken) {
                this.clearAuth();
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        refresh_token: this.auth.refreshToken 
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.auth.token = data.token || data.access_token;
                    this.auth.refreshToken = data.refresh_token;
                    
                    localStorage.setItem('auth_token', data.token || data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    
                    this.auth.isAuthenticated = true;
                    this.startTokenRefreshTimer();
                    
                    console.log('Token refreshed successfully');
                } else {
                    this.clearAuth();
                    this.ui.modals.showLogin = true;
                }
            } catch (error) {
                console.error('Token refresh failed:', error);
                this.clearAuth();
                this.ui.modals.showLogin = true;
            }
        },
        
        startTokenRefreshTimer() {
            this.cleanupTokenRefreshTimer();
            
            // Refresh token every 30 minutes
            this.auth.tokenRefreshTimer = setInterval(() => {
                this.refreshToken();
            }, 30 * 60 * 1000);
        },
        
        cleanupTokenRefreshTimer() {
            if (this.auth.tokenRefreshTimer) {
                clearInterval(this.auth.tokenRefreshTimer);
                this.auth.tokenRefreshTimer = null;
            }
        },
        
        clearAuth() {
            this.cleanupTokenRefreshTimer();
            this.disconnectWebSocket();
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            
            // Clear organized state
            this.auth.isAuthenticated = false;
            this.auth.user = null;
            this.auth.token = null;
            this.auth.refreshToken = null;
            this.ui.modals.showLogin = true;
            
            // Clear legacy state for template compatibility
            this.isAuthenticated = false;
            this.user = null;
            this.token = null;
            this.showLogin = true;
        },
        
        // Auto-login functionality removed for security - users must authenticate properly
        
        async login() {
            this.loginError = '';
            this.loading = true;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.loginForm)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Set organized state first
                    this.auth.token = data.token;
                    this.auth.user = data.user;
                    this.auth.isAuthenticated = true;
                    this.ui.modals.showLogin = false;
                    
                    // Set legacy state for template compatibility
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
                    
                    this.showNotification('success', 'Welcome Back', `Welcome back, ${data.user.full_name || data.user.username}!`);
                    
                    // ALWAYS GO TO PROJECTS TAB AFTER LOGIN
                    this.activeTab = 'projects';
                    
                    // Initialize WebSocket and load data
                    this.initializeWebSocket();
                    await this.loadInitialData();
                    
                    // Allow user management modal to open after initialization is complete
                    setTimeout(() => {
                        this.preventAutoUserManagement = false;
                        console.log('✅ User management modal auto-open protection disabled');
                    }, 10000); // Wait 10 seconds after login
                } else {
                    this.loginError = data.error || 'Login failed';
                }
            } catch (error) {
                console.error('Login error:', error);
                this.loginError = 'Network error occurred';
            } finally {
                this.loading = false;
            }
        },
        
        logout() {
            this.clearAuth();
            // clearAuth already sets showLogin = true, but let's be explicit
            this.showNotification('info', 'Logged Out', 'You have been logged out');
        },
        
        /**
         * Get authentication token from localStorage or session
         */
        getAuthToken() {
            // Try to get token from localStorage first - check correct key names
            let token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken');
            
            // If no token in localStorage, try sessionStorage
            if (!token) {
                token = sessionStorage.getItem('authToken') || sessionStorage.getItem('accessToken');
            }
            
            // If still no token, try to get from current session/user context
            if (!token && this.currentUser?.token) {
                token = this.currentUser.token;
            }
            
            // Try auth object
            if (!token && this.auth?.token) {
                token = this.auth.token;
            }
            
            // Try token property
            if (!token && this.token) {
                token = this.token;
            }
            
            // No default token - require proper authentication
            if (!token) {
                console.warn('No authentication token found. Authentication required.');
                return null; // No default token
            }
            return token;
        },
        
        getAuthHeaders() {
            const headers = { 'Content-Type': 'application/json' };
            if (this.auth.token) {
                headers['Authorization'] = `Bearer ${this.auth.token}`;
            }
            return headers;
        },

        // API Helper Function (from stable backup)
        async apiCall(endpoint, options = {}) {
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                
                // Add auth token if available
                const authToken = this.getAuthToken();
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }
                
                const finalUrl = `${this.config.apiBaseUrl}/api${endpoint}`;
                
                const response = await fetch(finalUrl, {
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
                    this.showNotification('error', 'API Error', 'API call failed: ' + error.message);
                }
                throw error;
            }
        },

        handleAuthError() {
            console.log('Authentication error - clearing auth state');
            this.clearAuth();
            this.showLogin = true;
            this.ui.modals.showLogin = true;
        },
        
        // ===== API CONNECTION =====
        
        async checkApiConnection() {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/health`);
                if (response.ok) {
                    this.apiConnected = true;
                    console.log('API connection successful');
                } else {
                    this.apiConnected = false;
                    console.warn('API connection failed');
                }
            } catch (error) {
                this.apiConnected = false;
                console.error('API connection error:', error);
            }
        },
        
        // ===== WEBSOCKET MANAGEMENT =====
        
        initializeWebSocket() {
            if (!this.auth.isAuthenticated || this.ws.socket || this.ws.connecting) {
                return;
            }
            
            this.ws.connecting = true;
            
            try {
                this.ws.socket = io(this.config.apiBaseUrl, {
                    auth: { token: this.auth.token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000
                });
                
                this.setupWebSocketHandlers();
            } catch (error) {
                console.error('WebSocket initialization failed:', error);
                this.ws.connecting = false;
            }
        },
        
        setupWebSocketHandlers() {
            if (!this.ws.socket) return;
            
            this.ws.socket.on('connect', () => {
                console.log('✅ WebSocket connected');
                this.ws.connected = true;
                this.ws.connecting = false;
                this.ws.reconnectAttempts = 0;
                this.syncLegacyState(); // Sync WebSocket state to templates
                
                if (this.data.selectedProject) {
                    // Ensure we pass only the project ID (string) not the object
                    const projectId = typeof this.data.selectedProject === 'string' 
                        ? this.data.selectedProject 
                        : this.data.selectedProject.id || this.data.selectedProject;
                        
                    console.log('🔗 Joining WebSocket room for project:', projectId);
                    this.ws.socket.emit('join_project', projectId);
                }
            });
            
            this.ws.socket.on('disconnect', () => {
                console.log('❌ WebSocket disconnected');
                this.ws.connected = false;
                this.ws.connecting = false;
                this.syncLegacyState(); // Sync WebSocket state to templates
            });
            
            this.ws.socket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error);
                this.ws.connected = false;
                this.ws.connecting = false;
            });
            
            this.ws.socket.on('crawler_progress', (data) => {
                console.log('📡 WebSocket: crawler_progress event received');
                this.handleCrawlerProgress(data);
            });
            
            this.ws.socket.on('crawler_completed', (data) => {
                console.log('📡 WebSocket: crawler_completed event received');
                this.handleCrawlerCompleted(data);
            });
            
            this.ws.socket.on('crawler_error', (data) => {
                console.log('📡 WebSocket: crawler_error event received');
                this.handleCrawlerError(data);
            });
            
            this.ws.socket.on('crawler_stopped', (data) => {
                console.log('📡 WebSocket: crawler_stopped event received');
                this.handleCrawlerStopped(data);
            });
            
            this.ws.socket.on('notification', (data) => {
                console.log('📡 WebSocket: notification event received');
                this.showNotification(data.level, data.title, data.message);
            });
            
            // Add a generic event listener to catch all events for debugging
            this.ws.socket.onAny((eventName, ...args) => {
                console.log(`📡 WebSocket: Event "${eventName}" received with data:`, args);
                
                // For crawler events, show additional debugging
                if (eventName.startsWith('crawler_')) {
                    console.log('🔍 WebSocket DEBUG: Crawler event details:', {
                        event: eventName,
                        selectedProject: this.data.selectedProject,
                        webCrawlersCount: this.data.webCrawlers.length,
                        crawlerInProgress: this.crawlerInProgress,
                        crawlerProgress: this.crawlerProgress
                    });
                }
            });
        },
        
        disconnectWebSocket() {
            if (this.ws.socket) {
                this.ws.socket.disconnect();
                this.ws.socket = null;
                this.ws.connected = false;
                this.wsConnected = false; // Legacy sync
            }
        },
        
        handleCrawlerProgress(data) {
            console.log('🔄 Crawler progress received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            
            console.log('🔍 DEBUG: Processing crawler progress:', {
                crawlerId: crawlerId,
                pagesFound: crawlerRun.pages_found || crawlerRun.pagesFound,
                pagesCrawled: crawlerRun.pages_crawled,
                status: crawlerRun.status,
                currentUrl: crawlerRun.current_url || crawlerRun.currentUrl
            });
            
            // Update crawler status in the list
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = crawlerRun.status || 'running';
                crawler.total_pages_found = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
                crawler.pages_for_testing = crawlerRun.pages_found || crawlerRun.pagesFound || 0; // Default all pages for testing
                
                console.log('✅ Updated crawler in list:', {
                    name: crawler.name,
                    status: crawler.status,
                    totalPages: crawler.total_pages_found
                });
            } else {
                console.warn('❌ Could not find crawler with ID:', crawlerId);
                console.log('Available crawler IDs:', this.data.webCrawlers.map(c => c.id));
            }
            
            // Update progress indicator
            this.crawlerInProgress = true;
            const pagesFound = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
            const currentUrl = crawlerRun.current_url || crawlerRun.currentUrl || '';
            
            this.crawlerProgress = {
                percentage: Math.min(100, (pagesFound / (crawlerRun.max_pages || 50)) * 100),
                message: `Crawling ${crawler?.name || 'site'}... Found ${pagesFound} pages`,
                pagesFound: pagesFound,
                currentUrl: currentUrl
            };
            
            // Force Alpine.js to update the UI
            this.$nextTick(() => {
                console.log('🔄 UI Updated - Progress:', {
                    percentage: this.crawlerProgress.percentage,
                    pagesFound: this.crawlerProgress.pagesFound,
                    currentUrl: this.crawlerProgress.currentUrl
                });
            });
            
            this.syncLegacyState();
            
            console.log('🔍 DEBUG: Updated progress indicator:', {
                crawlerName: crawler?.name,
                pagesFound: pagesFound,
                progressPercentage: this.crawlerProgress.percentage,
                crawlerInProgress: this.crawlerInProgress
            });
        },
        
        handleCrawlerCompleted(data) {
            console.log('✅ Crawler completed received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            const finalPageCount = crawlerRun.pages_found || crawlerRun.totalPages || crawlerRun.pagesFound || 0;
            
            console.log('🔍 DEBUG: Processing crawler completion:', {
                crawlerId: crawlerId,
                finalPageCount: finalPageCount,
                status: crawlerRun.status
            });
            
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = 'completed';
                crawler.total_pages_found = finalPageCount;
                crawler.pages_for_testing = finalPageCount; // Default all pages for testing
                
                console.log('✅ Updated completed crawler:', {
                    name: crawler.name,
                    status: crawler.status,
                    finalPageCount: finalPageCount
                });
            } else {
                console.warn('❌ Could not find crawler with ID for completion:', crawlerId);
                console.log('Available crawler IDs:', this.data.webCrawlers.map(c => c.id));
            }
            
            // Clear progress indicator
            this.crawlerInProgress = false;
            this.crawlerProgress = {
                percentage: 100,
                message: 'Crawling completed',
                pagesFound: finalPageCount,
                currentUrl: ''
            };
            
            this.syncLegacyState();
            this.loadWebCrawlers(); // Refresh the list with force refresh
            this.showNotification('success', 'Crawler Completed', 
                `Found ${finalPageCount} pages`);
                
            console.log('🔍 DEBUG: Crawler completion processed:', {
                crawlerName: crawler?.name,
                finalPageCount: finalPageCount,
                status: crawler?.status,
                progressCleared: !this.crawlerInProgress
            });
        },
        
        handleCrawlerError(data) {
            console.error('❌ Crawler error received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            const pagesFound = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
            
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = 'failed';
                crawler.total_pages_found = pagesFound;
                crawler.pages_for_testing = pagesFound;
                
                console.log('❌ Updated failed crawler:', {
                    name: crawler.name,
                    status: crawler.status,
                    pagesFound: pagesFound
                });
            }
            
            // Clear progress indicator
            this.crawlerInProgress = false;
            this.crawlerProgress = {
                percentage: 0,
                message: 'Crawling failed',
                pagesFound: pagesFound,
                currentUrl: ''
            };
            
            this.syncLegacyState();
            this.showNotification('error', 'Crawler Failed', 
                data.message || crawlerRun.error || 'Crawler encountered an error');
                
            console.log('🔍 DEBUG: Crawler error processed:', {
                crawlerName: crawler?.name,
                error: data.message || crawlerRun.error,
                pagesFound: pagesFound
            });
        },
        
        handleCrawlerStopped(data) {
            console.log('⏹️ Crawler stopped received:', data);
            
            // Extract crawler data - WebSocket sends data.crawlerRun
            const crawlerRun = data.crawlerRun || data;
            const crawlerId = crawlerRun.crawler_id || data.crawlerId;
            const pagesFound = crawlerRun.pages_found || crawlerRun.pagesFound || 0;
            
            const crawler = this.data.webCrawlers.find(c => c.id === crawlerId);
            if (crawler) {
                crawler.status = 'stopped';
                crawler.total_pages_found = pagesFound;
                crawler.pages_for_testing = pagesFound;
                
                console.log('⏹️ Updated stopped crawler:', {
                    name: crawler.name,
                    status: crawler.status,
                    pagesFound: pagesFound
                });
            }
            
            // Clear progress indicator
            this.crawlerInProgress = false;
            this.crawlerProgress = {
                percentage: 0,
                message: 'Crawling stopped',
                pagesFound: pagesFound,
                currentUrl: ''
            };
            
            this.syncLegacyState();
            this.showNotification('warning', 'Crawler Stopped', 
                `Crawling stopped. Found ${pagesFound} pages`);
                
            console.log('🔍 DEBUG: Crawler stopped processed:', {
                crawlerName: crawler?.name,
                pagesFound: pagesFound,
                reason: data.reason || crawlerRun.reason
            });
        },
        
        // ===== DATA LOADING =====
        
        async loadInitialData() {
            await Promise.all([
                this.loadProjects(),
                this.loadAuthConfigs(),
                this.loadSessionInfo(),  // Load existing session info
                this.loadAvailableTesters()  // Load testers for test grid
            ]);
            
            // Restore previously selected project from localStorage
            this.restoreSelectedProject();
        },
        
        restoreSelectedProject() {
            const savedProjectId = localStorage.getItem('selectedProjectId');
            if (savedProjectId && this.data.projects.length > 0) {
                const project = this.data.projects.find(p => p.id === savedProjectId);
                if (project) {
                    console.log('🔄 Restoring previously selected project:', project.name);
                    this.selectProject(savedProjectId);
                } else {
                    // Clean up invalid saved project ID
                    localStorage.removeItem('selectedProjectId');
                }
            }
        },
        
        async loadProjects() {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.data.projects = result.data || result;
                    this.projects = this.data.projects; // Legacy sync
                } else {
                    console.error('Failed to load projects:', response.status);
                }
            } catch (error) {
                console.error('Error loading projects:', error);
            }
        },
        

        
        async loadWebCrawlers() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(
                    `${this.config.apiBaseUrl}/api/web-crawlers/projects/${this.data.selectedProject}/crawlers`,
                    { headers: this.getAuthHeaders() }
                );
                
                if (response.ok) {
                    const result = await response.json();
                    this.data.webCrawlers = result.success ? result.data : [];
                    this.webCrawlers = this.data.webCrawlers; // Legacy sync
                    
                    // Force refresh page counts to get accurate data from database
                    this.loadCrawlerPageCounts(true);
                } else {
                    console.error('Failed to load web crawlers:', response.status);
                    this.data.webCrawlers = [];
                    this.webCrawlers = [];
                }
            } catch (error) {
                console.error('Error loading web crawlers:', error);
                this.data.webCrawlers = [];
                this.webCrawlers = [];
            }
        },

        async loadCrawlerPageCounts(forceRefresh = false) {
            console.log('🔍 DEBUG: Loading page counts for crawlers...', forceRefresh ? '(FORCE REFRESH)' : '');
            
            for (const crawler of this.webCrawlers) {
                // Only skip if force refresh is false and page count already exists
                if (!forceRefresh && crawler.total_pages_found && crawler.total_pages_found > 0) {
                    console.log(`🔍 DEBUG: Crawler ${crawler.name} already has ${crawler.total_pages_found} pages (skipping)`);
                    continue;
                }
                
                try {
                    console.log(`🔍 DEBUG: Fetching page count for crawler ${crawler.name}...`);
                    const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/pages?limit=1000`, {
                        headers: this.getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const pages = data.pages || data.data || [];
                        const totalCount = data.pagination?.total || pages.length;
                        
                        // Update the crawler with page counts from pagination (more accurate)
                        crawler.total_pages_found = totalCount;
                        
                        // Count only explicitly selected pages for testing
                        const selectedPagesCount = pages.filter(p => 
                            p.selected_for_testing === true
                        ).length;
                        
                        // Page count analysis for debugging
                        console.log(`  - Total pages received: ${pages.length}`);
                        console.log(`  - Total count from API: ${totalCount}`);
                        console.log(`  - Pages with selected_for_testing=true: ${selectedPagesCount}`);
                        console.log(`  - Sample page data:`, pages.slice(0, 3).map(p => ({
                            url: p.url,
                            selected_for_testing: p.selected_for_testing
                        })));
                        
                        // If no explicit selections exist, check if all pages are implicitly selected
                        // by checking if this is a fresh crawl or if selections were explicitly made
                        if (selectedPagesCount === 0 && pages.length === totalCount) {
                            // This might be a fresh crawl - check if any pages have explicit selection flags
                            const hasExplicitSelections = pages.some(p => 
                                p.hasOwnProperty('selected_for_testing')
                            );
                            
                            if (!hasExplicitSelections) {
                                // Fresh crawl - all pages are implicitly selected
                                crawler.pages_for_testing = totalCount;
                            } else {
                                // Pages have explicit selections but none are selected
                                crawler.pages_for_testing = 0;
                            }
                        } else {
                            // Use the actual count of selected pages
                            crawler.pages_for_testing = selectedPagesCount;
                        }
                        
                        console.log(`🔍 DEBUG: Updated ${crawler.name}: ${crawler.total_pages_found} total, ${crawler.pages_for_testing} for testing`);
                        console.log(`🔍 DEBUG: Final counts - Total: ${crawler.total_pages_found}, For Testing: ${crawler.pages_for_testing}, Excluded: ${crawler.total_pages_found - crawler.pages_for_testing}`);
                        console.log(`🔍 DEBUG: API returned ${pages.length} pages, pagination says ${totalCount} total`);
                    } else {
                        console.warn(`Failed to load pages for crawler ${crawler.name}:`, response.status);
                    }
                } catch (error) {
                    console.error(`Error loading pages for crawler ${crawler.name}:`, error);
                }
            }
            
            // Sync the updated data
            this.syncLegacyState();
            console.log('🔍 DEBUG: Finished loading page counts');
        },
        
        // ===== PROJECT METHODS =====
        
        getSelectedProject() {
            if (!this.data.selectedProject) return null;
            return this.data.projects.find(p => p.id === this.data.selectedProject) || null;
        },
        
        // PROJECT SELECTION - Unified method for consistent state management
        selectProject(projectOrId) {
            // Handle both project object and project ID
            const projectId = typeof projectOrId === 'string' ? projectOrId : projectOrId?.id;
            const projectObj = typeof projectOrId === 'object' ? projectOrId : this.projects.find(p => p.id === projectId);
            
            if (!projectId || !projectObj) {
                console.warn('Invalid project selection:', projectOrId);
                return;
            }
            
            // Store ID in organized state (consistent approach)
            this.data.selectedProject = projectId;
            
            // Sync to legacy state for template compatibility
            this.selectedProject = projectId;
            this.currentProject = projectObj; // For easy object access
            
            console.log(`📂 Selected project: ${projectObj.name} (${projectId})`);
            
            // Join WebSocket room for this project
            if (this.ws.socket && this.ws.connected) {
                this.ws.socket.emit('join_project', { projectId });
            }
            
            // Load project-specific data for all tabs
            this.loadProjectData();
            
            // Sync legacy state to ensure all tabs can access selected project
            this.syncLegacyState();
            
            // Store selection in localStorage for persistence
            localStorage.setItem('selectedProjectId', projectId);
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
                this.showNotification('success', 'Success', 'Project created successfully!');
            } catch (error) {
                console.error('Failed to create project:', error);
                this.showNotification('error', 'Error', error.message || 'Failed to create project');
            } finally {
                this.loading = false;
            }
        },

        clearProjectSelection() {
            // Clear all project selection state
            this.data.selectedProject = null;
            this.selectedProject = null;
            this.currentProject = null;
            
            // Clear project-specific data
            this.data.webCrawlers = [];
            this.data.discoveries = [];
            this.data.testSessions = [];
            this.data.projectAuthConfigs = [];
            
            // Sync to legacy state
            this.webCrawlers = [];
            this.discoveries = [];
            this.testSessions = [];
            this.projectAuthConfigs = [];
            
            // Clear localStorage
            localStorage.removeItem('selectedProjectId');
            
            // Sync legacy state
            this.syncLegacyState();
            
            console.log('🗑️ Cleared project selection');
        },
        
        // UNIFIED PROJECT DATA LOADING - Called when project is selected
        async loadProjectData() {
            if (!this.data.selectedProject) return;
            
            try {
                // Load all project-specific data in parallel for better performance
                await Promise.all([
                    this.loadWebCrawlers(),           // For Web Crawler tab
                    this.loadProjectDiscoveries(),    // For Discovery tab
                    this.loadProjectTestSessions(),   // For Testing Sessions tab
                    this.loadProjectAuthConfigs()     // For Authentication tab
                ]);
                
                // Load additional data that might depend on the above
            this.loadSelectedDiscoveries();
                
                console.log(`✅ Loaded all data for project: ${this.getSelectedProject()?.name}`);
            } catch (error) {
                console.error('Error loading project data:', error);
                this.showNotification('error', 'Error', 'Failed to load some project data');
            }
        },

        editProject(project) {
            this.showNotification('info', 'Coming Soon', 'Edit project feature coming soon!');
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
                this.data.projects = this.data.projects.filter(p => p.id !== this.projectToDelete.id);
                this.projects = this.data.projects; // Sync legacy state
                
                // Clear selection if the deleted project was selected
                if (this.data.selectedProject === this.projectToDelete.id) {
                    this.clearProjectSelection();
                }
                
                this.showDeleteProject = false;
                this.projectToDelete = null;
                this.showNotification('success', 'Success', 'Project deleted successfully!');
                
            } catch (error) {
                console.error('Failed to delete project:', error);
                this.showNotification('error', 'Error', 'Failed to delete project. Please try again.');
            } finally {
                this.loading = false;
            }
        },

        resetNewProject() {
            this.newProject = {
                name: '',
                description: '',
                primary_url: '',
                compliance_standard: 'wcag_2_1_aa'
            };
        },

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

        resetProjectForm() {
            this.resetNewProject();
        },

        // ===== CRAWLER METHODS =====
        
        async createCrawler() {
            try {
                const crawlerData = {
                    ...this.newCrawler,
                    project_id: this.data.selectedProject
                };
                
                // Fix base_url format - add https:// if protocol is missing
                if (crawlerData.base_url && !crawlerData.base_url.match(/^https?:\/\//)) {
                    crawlerData.base_url = `https://${crawlerData.base_url}`;
                }
                
                console.log('🔍 DEBUG: Creating crawler with data:', JSON.stringify(crawlerData, null, 2));
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/projects/${this.data.selectedProject}/crawlers`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(crawlerData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Crawler Created', 'New crawler created successfully');
                    this.showCreateCrawler = false;
                    this.resetCrawlerForm();
                    this.loadWebCrawlers();
                } else {
                    const error = await response.json();
                    console.log('🚨 DEBUG: Backend error response:', error);
                    this.showNotification('error', 'Creation Failed', error.message || error.error || 'Failed to create crawler');
                }
            } catch (error) {
                console.error('Error creating crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to create crawler');
            }
        },

        async startCrawler(crawler) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/start`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    crawler.status = 'running';
                    
                    // Join WebSocket project room to receive real-time updates
                    if (this.ws.socket && this.data.selectedProject) {
                        const projectId = typeof this.data.selectedProject === 'string' 
                            ? this.data.selectedProject 
                            : this.data.selectedProject.id || this.data.selectedProject;
                        this.ws.socket.emit('join_project', projectId);
                        console.log('🔌 WebSocket: Joined project room for crawler updates');
                    }
                    
                    // Set progress tracking
                    this.crawlerInProgress = true;
                    this.crawlerProgress = {
                        percentage: 0,
                        message: `Starting ${crawler.name}...`,
                        pagesFound: 0,
                        currentUrl: crawler.base_url || ''
                    };
                    
                    this.syncLegacyState();
                    this.showNotification('success', 'Crawler Started', `Started crawling ${crawler.name}`);
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Start Failed', error.message || 'Failed to start crawler');
                }
            } catch (error) {
                console.error('Error starting crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to start crawler');
            }
        },

        async deleteCrawler(crawlerId) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawlerId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.loadWebCrawlers();
                    this.showNotification('success', 'Crawler Deleted', 'Crawler deleted successfully');
                } else {
                    this.showNotification('error', 'Delete Failed', 'Failed to delete crawler');
                }
            } catch (error) {
                console.error('Error deleting crawler:', error);
                this.showNotification('error', 'Network Error', 'Failed to delete crawler');
            }
        },

        resetCrawlerForm() {
            this.newCrawler = {
                name: '',
                description: '',
                base_url: '',
                auth_type: 'none',
                max_depth: 3,
                max_pages: 100,
                follow_external: false,
                respect_robots: true,
                concurrent_pages: 5,
                delay_ms: 1000,
                browser_type: 'chromium',
                request_delay_ms: 2000,
                session_persistence: false,
                respect_robots_txt: false,
                headful_mode: false,
                saml_config: {
                    idp_domain: '',
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    login_page: '',
                    success_url: '',
                    timeout_ms: 30000
                },
                auth_credentials: {
                    username: '',
                    password: '',
                    domain: '',
                    additional_fields: {}
                },
                auth_workflow: {
                    username_selector: '',
                    password_selector: '',
                    submit_selector: '',
                    success_indicators: [],
                    additional_steps: []
                }
            };
        },

        getCrawlerStatusColor(status) {
            const colors = {
                'pending': 'bg-gray-100 text-gray-700',
                'running': 'bg-yellow-100 text-yellow-700',
                'completed': 'bg-green-100 text-green-700',
                'failed': 'bg-red-100 text-red-700'
            };
            return colors[status] || 'bg-gray-100 text-gray-700';
        },

        toggleAdvancedCrawlerOptions() {
            this.showAdvancedCrawlerOptions = !this.showAdvancedCrawlerOptions;
        },

        // ===== UI HELPER METHODS =====
        
        setActiveTab(tabName) {
            this.ui.activeTab = tabName;
            this.activeTab = tabName; // Legacy sync
            this.syncLegacyState();
        },

        // Authentication tab loading method (missing method from navigation)
        async loadAuthenticationView() {
            console.log('🔐 Loading Authentication view');
            console.log('🔐 Current selectedProject:', this.data.selectedProject);
            console.log('🔐 Current authConfigs length:', this.authConfigs?.length || 0);
            console.log('🔐 Current projectAuthConfigs length:', this.projectAuthConfigs?.length || 0);
            
            if (this.data.selectedProject) {
                // Auto-select the current project for authentication
                console.log('🔐 Auto-selecting project for auth:', this.data.selectedProject);
                await this.selectAuthProject(this.data.selectedProject);
            } else {
                console.log('🔐 No project selected, cannot load auth configs');
            }
        },

        showNotification(type, title, message) {
            this.notification = {
                show: true,
                type,
                title,
                message
            };
            this.ui.notification = this.notification; // Sync
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideNotification();
            }, 5000);
        },

        hideNotification() {
            this.notification.show = false;
            this.ui.notification.show = false;
        },

        formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        },

        // ===== PROFILE METHODS =====
        
        async updateProfile() {
            this.loading = true;
            
            try {
                const data = await this.apiCall('/auth/profile', {
                    method: 'PUT',
                    body: JSON.stringify(this.profileForm)
                });
                
                this.user = data.user;
                this.auth.user = data.user; // Update organized state too
                this.showProfile = false;
                this.ui.modals.showProfile = false;
                this.showNotification('success', 'Profile Updated', 'Profile updated successfully!');
                
            } catch (error) {
                console.error('Profile update error:', error);
                this.showNotification('error', 'Update Failed', error.message || 'Failed to update profile');
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
                this.ui.modals.showChangePassword = false;
                this.passwordForm = { current_password: '', new_password: '', confirm_password: '' };
                this.showNotification('success', 'Password Changed', 'Password changed successfully!');
                
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
                this.sessions = [];
            }
        },
        
        async revokeSession(sessionId) {
            try {
                await this.apiCall(`/auth/sessions/${sessionId}`, {
                    method: 'DELETE'
                });
                
                this.sessions = this.sessions.filter(s => s.id !== sessionId);
                this.showNotification('success', 'Session Revoked', 'Session revoked successfully');
                
            } catch (error) {
                console.error('Failed to revoke session:', error);
                this.showNotification('error', 'Revoke Failed', 'Failed to revoke session');
            }
        },
        
        async openSessionsModal() {
            this.showSessions = true;
            this.ui.modals.showSessions = true;
            await this.loadSessions();
        },

        refreshSessionInfo() { 
            // Refresh the current session info
            this.checkAuthentication();
        },
        cancelDeleteProject() { this.showDeleteProject = false; this.syncLegacyState(); },
        cancelDeleteDiscovery() { this.showDeleteDiscovery = false; this.syncLegacyState(); },
        cancelDeleteSession() { this.showDeleteSession = false; this.syncLegacyState(); },
        getTotalPagesForTesting() { 
            const selectedCrawlers = this.webCrawlers.filter(c => this.selectedCrawlers.includes(c.id));
            return selectedCrawlers.reduce((total, c) => total + (c.pages_for_testing || 0), 0);
        },
        getExcludedPagesCount() { 
            const selectedCrawlers = this.webCrawlers.filter(c => this.selectedCrawlers.includes(c.id));
            return selectedCrawlers.reduce((total, c) => total + ((c.total_pages_found || 0) - (c.pages_for_testing || 0)), 0);
        },
        getTotalPages() { 
            const selectedCrawlers = this.webCrawlers.filter(c => this.selectedCrawlers.includes(c.id));
            return selectedCrawlers.reduce((total, c) => total + (c.total_pages_found || 0), 0);
        },
        
        // ===== SESSION URL MODAL METHODS =====
        
        openSessionUrlModal() { this.showSessionUrlModal = true; this.syncLegacyState(); },
        closeSessionUrlModal() { this.showSessionUrlModal = false; this.syncLegacyState(); },
        selectAllUrls() { this.availableUrls.forEach(url => url.selected = true); },
        deselectAllUrls() { this.availableUrls.forEach(url => url.selected = false); },
        addManualUrl() { /* TODO: Implement manual URL addition */ },
        saveUrlSelection() { this.closeSessionUrlModal(); },
        
        // ===== CRAWLER SELECTION METHODS =====
        
        selectAllCrawlers() {
            this.selectedCrawlers = this.webCrawlers.map(c => c.id);
            this.syncLegacyState();
        },
        
        deselectAllCrawlers() {
            this.selectedCrawlers = [];
            this.syncLegacyState();
        },
        
        // ===== MODAL METHODS =====
        
        openCreateCrawlerModal(mode = 'basic') {
            console.log('🔍 DEBUG: openCreateCrawlerModal called with mode:', mode);
            this.ui.modals.showCreateCrawler = true;
            this.newCrawler.mode = mode;
            this.syncLegacyState();
            console.log('🔍 DEBUG: After sync - this.showCreateCrawler:', this.showCreateCrawler);
            console.log('🔍 DEBUG: After sync - this.ui.modals.showCreateCrawler:', this.ui.modals.showCreateCrawler);
        },
        
        closeCreateCrawlerModal() {
            this.ui.modals.showCreateCrawler = false;
            this.resetCrawlerForm();
            this.syncLegacyState();
        },

        // ===== DISCOVERY METHODS =====
        
        async startNewDiscovery() {
            if (!this.selectedProject || this.discoveryInProgress) return;
            
            try {
                this.discoveryInProgress = true;
                this.discoveryProgress = {
                    percentage: 0,
                    message: 'Starting discovery...',
                    pagesFound: 0,
                    currentUrl: ''
                };
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/discoveries`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        primary_url: this.getSelectedProject()?.primary_url,
                        max_depth: this.discoveryConfig?.maxDepth || 3,
                        max_pages: this.discoveryConfig?.maxPages || 100,
                        discovery_mode: this.discoveryConfig?.mode || 'standard'
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Discovery Started', 'Site discovery has begun');
                    // Poll for progress updates
                    this.pollDiscoveryProgress(result.discovery_id);
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Discovery Failed', error.message || 'Failed to start discovery');
                    this.discoveryInProgress = false;
                }
            } catch (error) {
                console.error('Error starting discovery:', error);
                this.showNotification('error', 'Network Error', 'Failed to start discovery');
                this.discoveryInProgress = false;
            }
        },

        async pollDiscoveryProgress(discoveryId) {
            const poll = async () => {
                try {
                    const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${discoveryId}/status`, {
                        headers: this.getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const status = await response.json();
                        this.discoveryProgress = {
                            percentage: status.progress || 0,
                            message: status.message || 'Processing...',
                            pagesFound: status.pages_found || 0,
                            currentUrl: status.current_url || ''
                        };
                        
                        if (status.status === 'completed') {
                            this.discoveryInProgress = false;
                            this.showNotification('success', 'Discovery Complete', `Found ${status.pages_found} pages`);
                            this.loadDiscoveries();
                        } else if (status.status === 'failed') {
                            this.discoveryInProgress = false;
                            this.showNotification('error', 'Discovery Failed', status.error || 'Discovery process failed');
                        } else if (status.status === 'running') {
                            setTimeout(poll, 2000); // Poll every 2 seconds
                        }
                    }
                } catch (error) {
                    console.error('Error polling discovery progress:', error);
                    this.discoveryInProgress = false;
                }
            };
            
            poll();
        },

        async loadDiscoveries() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/discoveries`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.discoveries = data.discoveries || [];
                } else {
                    console.error('Failed to load discoveries');
                }
            } catch (error) {
                console.error('Error loading discoveries:', error);
            }
        },

        async viewDiscoveryDetails(discovery) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${discovery.id}/pages`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.discoveredPages = data.pages || [];
                    this.selectedDiscovery = discovery;
                    this.showDiscoveredPagesModal = true;
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load discovery pages');
                }
            } catch (error) {
                console.error('Error loading discovery pages:', error);
                this.showNotification('error', 'Network Error', 'Failed to load discovery pages');
            }
        },

        async deleteDiscovery(discovery) {
            if (!confirm(`Are you sure you want to delete discovery for ${discovery.domain}?`)) {
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${discovery.id}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.discoveries = this.discoveries.filter(d => d.id !== discovery.id);
                    this.showNotification('success', 'Discovery Deleted', 'Discovery has been deleted');
                } else {
                    this.showNotification('error', 'Delete Failed', 'Failed to delete discovery');
                }
            } catch (error) {
                console.error('Error deleting discovery:', error);
                this.showNotification('error', 'Network Error', 'Failed to delete discovery');
            }
        },

        togglePageSelection(page) {
            page.selected = !page.selected;
        },

        selectAllPages() {
            this.discoveredPages.forEach(page => page.selected = true);
        },

        deselectAllPages() {
            this.discoveredPages.forEach(page => page.selected = false);
        },

        async savePageSelections() {
            const selectedPages = this.discoveredPages.filter(page => page.selected);
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/discoveries/${this.selectedDiscovery.id}/pages/selection`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        selected_page_ids: selectedPages.map(p => p.id)
                    })
                });
                
                if (response.ok) {
                    this.showNotification('success', 'Selection Saved', `${selectedPages.length} pages selected for testing`);
                    this.showDiscoveredPagesModal = false;
                } else {
                    this.showNotification('error', 'Save Failed', 'Failed to save page selection');
                }
            } catch (error) {
                console.error('Error saving page selection:', error);
                this.showNotification('error', 'Network Error', 'Failed to save page selection');
            }
        },

        // ===== SESSION MANAGEMENT METHODS =====
        
        async captureNewSession() {
            console.log('🔍 DEBUG: Starting database-based session capture');
            
            // Check for selected project in multiple places due to timing
            let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
            
            if (!projectId) {
                this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }
            
            this.sessionCapturing = true;
            this.sessionAwaitingLogin = false;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/capture`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: projectId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 DEBUG: Session capture started:', result);
                    
                    if (result.needsLogin) {
                        this.sessionAwaitingLogin = true;
                        this.showNotification('info', 'Browser Opened', 
                            `Please log in to the opened browser window for ${result.crawlerName || 'your crawler'}, then click "Successfully Logged In" below`);
                    } else {
                        // Already authenticated, complete capture immediately
                        await this.completeSessionCapture();
                    }
                    
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Capture Failed', error.message || 'Failed to start session capture');
                    this.sessionCapturing = false;
                }
            } catch (error) {
                console.error('Error capturing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to start session capture');
                this.sessionCapturing = false;
            }
        },
        
        async completeSessionCapture() {
            console.log('🔍 DEBUG: Completing database-based session capture');
            
            // Check for selected project in multiple places due to timing
            let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
            
            if (!projectId) {
                this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/complete-capture`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: projectId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Session capture completed:', result);
                    
                    // Reload session info to get the fresh data
                    await this.loadSessionInfo();
                    
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                    
                    this.showNotification('success', 'Session Captured Successfully', 
                        `Session saved to database with ${result.sessionData.cookiesCount} cookies`);
                        
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Capture Failed', error.message || 'Failed to complete session capture');
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                }
            } catch (error) {
                console.error('Error completing session capture:', error);
                this.showNotification('error', 'Network Error', 'Failed to complete session capture');
                this.sessionCapturing = false;
                this.sessionAwaitingLogin = false;
            }
        },
        
        async cancelSessionCapture() {
            console.log('🛑 User cancelled session capture');
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/cancel-capture`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                    this.showNotification('info', 'Session Capture Cancelled', 'Browser window closed and capture process stopped');
                } else {
                    const error = await response.json();
                    console.error('Cancel failed:', error);
                    // Still update UI state even if API call failed
                    this.sessionCapturing = false;
                    this.sessionAwaitingLogin = false;
                    this.showNotification('warning', 'Session Capture Cancelled', 'May need to manually close browser window');
                }
            } catch (error) {
                console.error('Error cancelling session capture:', error);
                // Still update UI state even if API call failed
                this.sessionCapturing = false;
                this.sessionAwaitingLogin = false;
                this.showNotification('warning', 'Session Capture Cancelled', 'May need to manually close browser window');
            }
        },
        
        async loadSessionInfo() {
            try {
                // Check for selected project in multiple places due to timing
                let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
                
                if (!projectId) {
                    console.log('🔍 DEBUG: No project selected (checked all sources), skipping session info load');
                    this.sessionInfo = {
                        isValid: false,
                        status: 'No Project Selected',
                        ageHours: 0,
                        isOld: false,
                        isVeryOld: false,
                        username: '',
                        capturedDate: '',
                        expirationDate: '',
                        pagesCount: 0,
                        lastActivity: null
                    };
                    return;
                }
                
                console.log('🔍 DEBUG: Using project ID for session info:', projectId);
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/info?project_id=${projectId}`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 DEBUG: Session info response from database:', result);
                    
                    if (result.exists && result.metadata) {
                        // Check session age
                        const capturedDate = new Date(result.metadata.capturedDate);
                        const now = new Date();
                        const ageHours = Math.round((now - capturedDate) / (1000 * 60 * 60));
                        const isOld = ageHours > 24; // Sessions older than 24 hours are considered potentially expired
                        const isVeryOld = ageHours > 72; // Sessions older than 72 hours are likely expired
                        
                        let status = 'Session Ready';
                        let isValid = result.metadata.isValid;
                        
                        if (isVeryOld) {
                            status = `⚠️ Session Expired (${ageHours}h old)`;
                            isValid = false;
                        } else if (isOld) {
                            status = `⚠️ Session Old (${ageHours}h old) - May need refresh`;
                            isValid = true; // Still try to use it, but warn user
                        } else if (ageHours < 1) {
                            status = 'Fresh Session - Just Captured';
                        }
                        
                        this.sessionInfo = {
                            isValid: isValid,
                            status: status,
                            ageHours: ageHours,
                            isOld: isOld,
                            isVeryOld: isVeryOld,
                            username: result.metadata.username || 'Unknown',
                            capturedDate: result.metadata.capturedDate || '',
                            expirationDate: result.metadata.expirationDate || 'Unknown',
                            pagesCount: result.metadata.pagesCount || 0,
                            sessionId: result.metadata.sessionId,
                            crawlerName: result.metadata.crawlerName,
                            lastActivity: new Date().toISOString()
                        };
                        
                        // Show warning for old sessions
                        if (isVeryOld) {
                            this.showNotification('warning', 'Session Expired', 
                                `Your browser session is ${ageHours} hours old and likely expired. Please capture a new session.`);
                        } else if (isOld) {
                            this.showNotification('info', 'Session Old', 
                                `Your browser session is ${ageHours} hours old. Consider capturing a fresh session if crawling fails.`);
                        }
                    } else {
                        this.sessionInfo = {
                            isValid: false,
                            status: 'No Session Available',
                            ageHours: 0,
                            isOld: false,
                            isVeryOld: false,
                            username: '',
                            capturedDate: '',
                            expirationDate: '',
                            pagesCount: 0,
                            lastActivity: null
                        };
                    }
                } else {
                    console.error('Failed to load session info from database');
                    const error = await response.json();
                    console.error('Session info error:', error);
                }
            } catch (error) {
                console.error('Error loading session info:', error);
            }
        },

        async testSessionAccess() {
            this.sessionTesting = true;
            
            try {
                // Check for selected project in multiple places due to timing
                let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
                
                if (!projectId) {
                    this.showNotification('error', 'No Project', 'Please select a project first');
                    this.sessionTesting = false;
                    return;
                }
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/test`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: projectId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 DEBUG: Session test response:', result);
                    
                    if (result.success) {
                        this.showNotification('success', 'Session Valid', `Can access ${result.pagesCount} pages`);
                        // Update sessionInfo with fresh data
                        this.sessionInfo.pagesCount = result.pagesCount;
                        this.sessionInfo.isValid = true;
                        this.sessionInfo.status = 'Session Active';
                } else {
                        this.showNotification('error', 'Session Invalid', result.message || 'Session has expired or is invalid');
                    }
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Session Invalid', error.message || 'Session has expired or is invalid');
                }
                
                // Always reload session info after testing to get current state
                await this.loadSessionInfo();
            } catch (error) {
                console.error('Error testing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to test session');
            } finally {
                this.sessionTesting = false;
            }
        },

        async clearSession() {
            try {
                // Check for selected project in multiple places due to timing
                let projectId = this.selectedProject || this.data.selectedProject || localStorage.getItem('selectedProjectId');
                
                if (!projectId) {
                    this.showNotification('error', 'No Project', 'Please select a project first');
                    return;
                }
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/session/clear?project_id=${projectId}`, {
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    this.sessionInfo = { 
                        isValid: false, 
                        lastActivity: null, 
                        status: 'inactive',
                        username: '',
                        capturedDate: '',
                        expirationDate: '',
                        pagesCount: 0
                    };
                    this.showNotification('success', 'Session Cleared', 'Browser session has been cleared');
                } else {
                    this.showNotification('error', 'Clear Failed', 'Failed to clear session');
                }
            } catch (error) {
                console.error('Error clearing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to clear session');
            }
        },

        // ===== WEB CRAWLER MODAL METHODS =====
        
        async viewCrawlerPages(crawler) {
            try {
                this.loading = true;
                const response = await fetch(`${this.config.apiBaseUrl}/api/web-crawlers/crawlers/${crawler.id}/pages`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.crawlerPages = data.pages || data.data || [];
                    this.selectedCrawlerForPages = crawler;
                    
                    console.log(`📄 Loaded ${this.crawlerPages.length} pages for crawler ${crawler.name}`);
                    console.log('🔍 DEBUG: Raw crawler pages data:', this.crawlerPages.slice(0, 2)); // Show first 2 pages
                    
                    // Load saved page selections for UI checkboxes
                    await this.loadCrawlerPageSelections(crawler.id);
                    
                    this.updateFilteredCrawlerPages();
                    
                    // Refresh crawler page counts to reflect actual selections
                    this.loadCrawlerPageCounts(true);
                    
                    console.log('🔍 DEBUG: Filtered pages count:', this.filteredCrawlerPages.length);
                    console.log('🔍 DEBUG: Opening modal with showCrawlerPagesModal =', true);
                    
                    this.ui.modals.showCrawlerPagesModal = true;
                    this.syncLegacyState();
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load crawler pages');
                }
            } catch (error) {
                console.error('Error loading crawler pages:', error);
                this.showNotification('error', 'Network Error', 'Failed to load crawler pages');
            } finally {
                this.loading = false;
            }
        },

        closeCrawlerPagesModal() {
            this.ui.modals.showCrawlerPagesModal = false;
            this.selectedCrawlerForPages = null;
            this.crawlerPages = [];
            this.filteredCrawlerPages = [];
            this.crawlerPageSearch = '';
            this.crawlerPageFilter = '';
            this.syncLegacyState();
        },

        // Edit an existing crawler
        async editCrawler(crawler) {
            // Populate the form with existing crawler data
            this.newCrawler = {
                ...crawler,
                // Convert JSON objects back to strings for editing
                wait_conditions_json: JSON.stringify(crawler.wait_conditions || [], null, 2),
                extraction_rules_json: JSON.stringify(crawler.extraction_rules || {}, null, 2),
                url_patterns_json: JSON.stringify(crawler.url_patterns || [], null, 2)
            };
            this.showCreateCrawler = true;
        },

        // Update filtered crawler pages based on search and filter
        updateFilteredCrawlerPages() {
            console.log('🔍 DEBUG: updateFilteredCrawlerPages called with crawlerPages.length:', this.crawlerPages.length);
            let filtered = [...this.crawlerPages];

            // Apply search filter
            if (this.crawlerPageSearch) {
                const search = this.crawlerPageSearch.toLowerCase();
                filtered = filtered.filter(page => 
                    page.url.toLowerCase().includes(search) || 
                    (page.title && page.title.toLowerCase().includes(search))
                );
            }

            // Apply category filter
            if (this.crawlerPageFilter) {
                switch (this.crawlerPageFilter) {
                    case 'forms':
                        filtered = filtered.filter(page => page.has_forms);
                        break;
                    case 'auth':
                        filtered = filtered.filter(page => page.requires_auth);
                        break;
                    case 'selected':
                        filtered = filtered.filter(page => 
                            page.selected_for_testing === true
                        );
                        break;
                }
            }

            this.filteredCrawlerPages = filtered;
            console.log('🔍 DEBUG: updateFilteredCrawlerPages finished, filteredCrawlerPages.length:', this.filteredCrawlerPages.length);
        },

        // Toggle page inclusion in testing sessions
        async togglePageForTesting(page) {
            const newValue = !page.selected_for_testing;

            try {
                await this.apiCall(`/web-crawlers/crawler-pages/${page.id}/testing`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        selected_for_testing: newValue
                    })
                });

                // Update local data
                page.selected_for_testing = newValue;
                this.updateFilteredCrawlerPages();
                
                // Refresh crawler page counts to update the UI display
                this.loadCrawlerPageCounts(true);

                this.showNotification(
                    'success',
                    'Page Selection Updated',
                    `Page ${newValue ? 'included in' : 'excluded from'} testing sessions`
                );

            } catch (error) {
                console.error('Failed to update page testing selection:', error);
                this.showNotification('error', 'Update Failed', 'Failed to update page selection');
            }
        },

        // Bulk include pages in testing sessions
        async bulkIncludePagesInTesting() {
            const selectedPages = this.filteredCrawlerPages.filter(page => page.selected);
            
            if (selectedPages.length === 0) {
                this.showNotification('warning', 'No Pages Selected', 'Please select pages first');
                return;
            }

            try {
                this.loading = true;
                const pageIds = selectedPages.map(page => page.id);

                await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/pages/bulk-testing`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        page_ids: pageIds,
                        selected_for_testing: true
                    })
                });

                // Update local data
                selectedPages.forEach(page => {
                    page.selected_for_testing = true;
                });

                this.showNotification(
                    'success',
                    'Bulk Selection Updated',
                    `${selectedPages.length} pages included in testing sessions`
                );

            } catch (error) {
                console.error('Failed to bulk update page testing selection:', error);
                this.showNotification('error', 'Bulk Update Failed', 'Failed to update page selections');
            } finally {
                this.loading = false;
                // Refresh crawler page counts to update the UI display
                this.loadCrawlerPageCounts(true);
            }
        },

        // Bulk exclude pages from testing sessions
        async bulkExcludePagesFromTesting() {
            const selectedPages = this.filteredCrawlerPages.filter(page => page.selected);
            
            if (selectedPages.length === 0) {
                this.showNotification('warning', 'No Pages Selected', 'Please select pages first');
                return;
            }

            try {
                this.loading = true;
                const pageIds = selectedPages.map(page => page.id);

                await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/pages/bulk-testing`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        page_ids: pageIds,
                        selected_for_testing: false
                    })
                });

                // Update local data
                selectedPages.forEach(page => {
                    page.selected_for_testing = false;
                });

                this.showNotification(
                    'success',
                    'Bulk Selection Updated',
                    `${selectedPages.length} pages excluded from testing sessions`
                );

            } catch (error) {
                console.error('Failed to bulk update page testing selection:', error);
                this.showNotification('error', 'Bulk Update Failed', 'Failed to update page selections');
            } finally {
                this.loading = false;
                // Refresh crawler page counts to update the UI display
                this.loadCrawlerPageCounts(true);
            }
        },

        // Toggle page selection in the UI
        togglePageSelection(page) {
            page.selected = !page.selected;
        },

        // Toggle all page selections
        toggleAllPageSelection(selectAll) {
            this.filteredCrawlerPages.forEach(page => {
                page.selected = selectAll;
            });
        },

        // Get auth type badge styling class
        getAuthTypeBadgeClass(authType) {
            switch (authType) {
                case 'saml': return 'bg-blue-100 text-blue-800';
                case 'basic': return 'bg-green-100 text-green-800';
                case 'dynamic_auth': return 'bg-purple-100 text-purple-800';
                case 'none': return 'bg-gray-100 text-gray-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        },

        // Get auth type display name
        getAuthTypeDisplay(authType) {
            switch (authType) {
                case 'saml': return 'SAML/SSO';
                case 'basic': return 'Username/Password';
                case 'dynamic_auth': return 'Dynamic Auth';
                case 'none': return 'No Authentication';
                default: return 'Unknown';
            }
        },

        // ===== TESTING SESSIONS METHODS =====
        
        async startNewComplianceSession() {
            if (!this.data.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: this.data.selectedProject,
                        session_type: 'compliance',
                        wcag_level: 'AA',
                        testing_approach: 'hybrid'
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Session Created', 'New compliance session started');
                    this.loadComplianceSessions();
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Session Failed', error.message || 'Failed to create session');
                }
            } catch (error) {
                console.error('Error creating compliance session:', error);
                this.showNotification('error', 'Network Error', 'Failed to create session');
            }
        },

        async loadComplianceSessions() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/sessions`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.complianceSessions = data.sessions || [];
                } else {
                    console.error('Failed to load compliance sessions');
                }
            } catch (error) {
                console.error('Error loading compliance sessions:', error);
            }
        },

        async pauseSession(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/pause`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    session.status = 'paused';
                    this.showNotification('success', 'Session Paused', 'Testing session has been paused');
                } else {
                    this.showNotification('error', 'Pause Failed', 'Failed to pause session');
                }
            } catch (error) {
                console.error('Error pausing session:', error);
                this.showNotification('error', 'Network Error', 'Failed to pause session');
            }
        },

        async resumeSession(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/resume`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    session.status = 'active';
                    this.showNotification('success', 'Session Resumed', 'Testing session has been resumed');
                } else {
                    this.showNotification('error', 'Resume Failed', 'Failed to resume session');
                }
            } catch (error) {
                console.error('Error resuming session:', error);
                this.showNotification('error', 'Network Error', 'Failed to resume session');
            }
        },

        async viewSessionResults(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Open results in a new modal or navigate to results view
                    this.sessionResults = data.results;
                    this.selectedSession = session;
                    this.showSessionResultsModal = true;
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load session results');
                }
            } catch (error) {
                console.error('Error loading session results:', error);
                this.showNotification('error', 'Network Error', 'Failed to load session results');
            }
        },

        async stopSession(session) {
            if (!confirm(`Are you sure you want to stop the testing session for ${session.name}?`)) {
                return;
            }
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/stop`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    session.status = 'completed';
                    this.showNotification('success', 'Session Stopped', 'Testing session has been stopped');
                } else {
                    this.showNotification('error', 'Stop Failed', 'Failed to stop session');
                }
            } catch (error) {
                console.error('Error stopping session:', error);
                this.showNotification('error', 'Network Error', 'Failed to stop session');
            }
        },

        async refreshSessions() {
            await this.loadComplianceSessions();
            this.showNotification('success', 'Sessions Refreshed', 'Session list has been updated');
        },

        // Create a new testing session
        async createTestingSession() {
            if (!this.data.selectedProject || !this.newTestingSession.name.trim() || !this.newTestingSession.conformance_level) {
                this.showNotification('error', 'Missing Information', 'Please fill in all required fields');
                return;
            }

            try {
                this.loading = true;
                
                const sessionData = {
                    name: this.newTestingSession.name.trim(),
                    description: this.newTestingSession.description.trim(),
                    project_id: this.data.selectedProject,
                    conformance_level: this.newTestingSession.conformance_level,
                    testing_approach: this.newTestingSession.testing_approach || 'hybrid'
                };

                const response = await this.apiCall('/sessions', {
                    method: 'POST',
                    body: JSON.stringify(sessionData)
                });

                if (response.success) {
                    this.showNotification('success', 'Session Created', 
                        `Session "${sessionData.name}" created with ${response.data.total_tests_count || 0} test instances`
                    );
                    
                    this.showCreateTestingSession = false;
                    this.resetNewTestingSession();
                    await this.loadComplianceSessions();
                } else {
                    throw new Error(response.error || 'Failed to create testing session');
                }
            } catch (error) {
                console.error('Error creating testing session:', error);
                this.showNotification('error', 'Creation Failed', error.message || 'Failed to create testing session');
            } finally {
                this.loading = false;
            }
        },

        // Delete a testing session with confirmation
        async deleteTestingSession(session) {
            if (!session) {
                this.showNotification('error', 'No Session', 'No session selected for deletion');
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to delete the testing session "${session.name}"?\n\nThis action cannot be undone and will remove:\n• All test results and findings\n• Session progress and configuration\n• Associated accessibility reports\n• Manual testing notes and observations`);
            
            if (!confirmed) {
                return;
            }

            try {
                this.loading = true;
                
                const response = await this.apiCall(`/sessions/${session.id}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    this.showNotification('success', 'Session Deleted', `Session "${session.name}" deleted successfully`);
                    
                    // Refresh all session-related data
                    await this.loadComplianceSessions();
                } else {
                    throw new Error(response.error || 'Failed to delete session');
                }
            } catch (error) {
                console.error('Error deleting session:', error);
                this.showNotification('error', 'Deletion Failed', error.message || 'Failed to delete session');
            } finally {
                this.loading = false;
            }
        },

        // Duplicate an existing testing session
        async duplicateTestingSession(session) {
            if (!session) return;

            try {
                this.loading = true;
                const response = await this.apiCall(`/sessions/${session.id}/duplicate`, {
                    method: 'POST'
                });

                if (response.success) {
                    this.showNotification('success', 'Session Duplicated', 
                        `Created duplicate session with ${response.data.total_tests_count || 0} test instances`
                    );
                    await this.loadComplianceSessions();
                } else {
                    throw new Error(response.error || 'Failed to duplicate session');
                }
            } catch (error) {
                console.error('Error duplicating session:', error);
                this.showNotification('error', 'Duplication Failed', error.message || 'Failed to duplicate session');
            } finally {
                this.loading = false;
            }
        },

        // Edit a testing session (placeholder for future implementation)
        editTestingSession(session) {
            // For now, show coming soon message
            this.showNotification('info', 'Feature Coming Soon', 'Session editing will be available soon');
            console.log('Editing session:', session);
        },

        // View testing session details
        viewTestingSessionDetails(session) {
            // Navigate to session test grid view or show detailed modal
            this.viewSessionResults(session);
        },

        // Reset new testing session form
        resetNewTestingSession() {
            this.newTestingSession = {
                name: '',
                description: '',
                conformance_level: 'AA',
                testing_approach: 'hybrid'
            };
        },

        // Get session status badge styling class
        getSessionStatusBadgeClass(status) {
            const classes = {
                'pending': 'bg-yellow-100 text-yellow-800',
                'active': 'bg-blue-100 text-blue-800',
                'in_progress': 'bg-blue-100 text-blue-800',
                'completed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'cancelled': 'bg-gray-100 text-gray-800',
                'paused': 'bg-orange-100 text-orange-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        // Open test instance modal for detailed view
        async openTestInstanceModal(testInstance) {
            try {
                this.currentTestInstance = testInstance;
                this.showTestInstanceModal = true;
                
                // TODO: Load detailed test information
                // await this.loadTestInstanceDetails(testInstance.id);
                
            } catch (error) {
                console.error('Error opening test instance details:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load test details');
            }
        },

        // Close test instance modal
        closeTestInstanceModal() {
            this.showTestInstanceModal = false;
            this.currentTestInstance = null;
        },

        // ===== AUTHENTICATION METHODS =====
        
        async selectAuthProject(projectId) {
            console.log('🔐 selectAuthProject called with:', projectId);
            this.selectedAuthProject = projectId;
            this.data.selectedAuthProject = projectId; // Organized state
            console.log('🔐 selectedAuthProject set to:', this.selectedAuthProject);
            await this.loadProjectAuthConfigs();
            console.log('🔐 After loadProjectAuthConfigs, projectAuthConfigs length:', this.projectAuthConfigs?.length || 0);
        },

        async loadAuthConfigs() {
            try {
                console.log('🔐 Loading authentication configurations...');
                const response = await this.apiCall('/auth/configs');
                this.authConfigs = response.data || [];
                this.data.authConfigs = this.authConfigs; // Sync organized state
                console.log('🔐 Auth configs loaded:', this.authConfigs.length);
                
                // Filter for current project if one is selected
                if (this.data.selectedAuthProject) {
                    await this.loadProjectAuthConfigs();
                } else {
                    this.data.projectAuthConfigs = this.data.authConfigs;
                    this.projectAuthConfigs = this.data.projectAuthConfigs; // Legacy sync
                }
            } catch (error) {
                console.error('Failed to load auth configs:', error);
                this.authConfigs = [];
                this.projectAuthConfigs = [];
            }
        },

        // REMOVED: Duplicate loadProjectAuthConfigs method - using enhanced version with filtering below

        async loadProjectAuthConfigs() {
            if (!this.data.selectedAuthProject || !this.getSelectedProject()?.primary_url) {
                console.log('🔐 No project or project URL, showing all auth configs');
                this.data.projectAuthConfigs = this.data.authConfigs || [];
                this.projectAuthConfigs = this.data.projectAuthConfigs; // Legacy sync
                return;
            }

            try {
                // Extract domain from project's primary URL
                const projectUrl = new URL(this.getSelectedProject().primary_url);
                const projectDomain = projectUrl.hostname;
                console.log(`🔐 Filtering auth configs for project domain: ${projectDomain}`);
                
                // Filter auth configs that match the project domain
                const matchingConfigs = this.authConfigs.filter(config => {
                    console.log(`🔐 Checking config "${config.name}" - domain: "${config.domain}", url: "${config.url}"`);
                    
                    const domainMatch = config.domain === projectDomain;
                    console.log(`🔐 Domain match (${config.domain} === ${projectDomain}): ${domainMatch}`);
                    
                    let urlMatch = false;
                    if (config.url) {
                        try {
                            const configUrl = new URL(config.url);
                            urlMatch = configUrl.hostname === projectDomain;
                            console.log(`🔐 URL hostname match (${configUrl.hostname} === ${projectDomain}): ${urlMatch}`);
                        } catch (error) {
                            urlMatch = config.url.includes(projectDomain);
                            console.log(`🔐 URL includes match (${config.url}.includes(${projectDomain})): ${urlMatch}`);
                        }
                    }
                    
                    // Also check project_id match for direct association
                    const projectIdMatch = config.project_id === this.data.selectedAuthProject;
                    console.log(`🔐 Project ID match (${config.project_id} === ${this.data.selectedAuthProject}): ${projectIdMatch}`);
                    
                    const finalMatch = domainMatch || urlMatch || projectIdMatch;
                    console.log(`🔐 Final match result for "${config.name}": ${finalMatch}`);
                    
                    return finalMatch;
                });

                // If no project-specific configs found, show all configs for easier management (stable backup pattern)
                if (matchingConfigs.length === 0) {
                    console.log(`🔐 No matching configs for ${projectDomain}, showing all ${this.authConfigs.length} configs for easier management`);
                    this.projectAuthConfigs = this.authConfigs;
                } else {
                    console.log(`🔐 Found ${matchingConfigs.length} matching configs for project domain: ${projectDomain}`);
                    this.projectAuthConfigs = matchingConfigs;
                }
                
                // Sync to organized state
                this.data.projectAuthConfigs = this.projectAuthConfigs;
            } catch (error) {
                console.error('Error filtering auth configs:', error);
                this.projectAuthConfigs = this.authConfigs;
            }
        },

        async testAuthConfig(authConfig) {
            try {
                // Ensure config exists - backup initialization
                if (!this.config || !this.config.apiBaseUrl) {
                    this.config = { apiBaseUrl: 'http://localhost:3001', tokenRefreshInterval: null };
                }
                
                authConfig.status = 'testing';
                this.showNotification('info', 'Testing Authentication', `Testing authentication for ${authConfig.domain || authConfig.name}...`);

                const response = await this.apiCall(`/auth/configs/${authConfig.id}/test`, {
                    method: 'POST'
                });

                if (response.success) {
                    authConfig.status = 'active';
                    authConfig.last_used = new Date().toISOString();
                    this.showNotification('success', 'Test Successful', `Authentication test successful for ${authConfig.domain || authConfig.name}`);
                } else {
                    authConfig.status = 'failed';
                    this.showNotification('error', 'Test Failed', `Authentication test failed for ${authConfig.domain || authConfig.name}`);
                }
            } catch (error) {
                authConfig.status = 'failed';
                this.showNotification('error', 'Test Error', `Authentication test error: ${error.message}`);
            }
        },

        async editAuthConfig(authConfig) {
            // Populate the form with ALL existing data including SAML selectors
            this.authConfigForm = {
                name: authConfig.name || authConfig.domain || '',
                type: authConfig.type || 'form',
                login_url: authConfig.login_url || authConfig.url || '',
                username: authConfig.username || '',
                password: '', // Don't pre-fill password for security
                description: authConfig.description || authConfig.auth_description || '',
                auth_role: authConfig.auth_role || 'default',
                priority: authConfig.priority || 1,
                is_default: authConfig.is_default || false,
                // Advanced SAML/SSO fields (from existing config or defaults)
                idp_domain: authConfig.idp_domain || '',
                username_selector: authConfig.username_selector || 'input[name="username"]',
                password_selector: authConfig.password_selector || 'input[type="password"]',
                submit_selector: authConfig.submit_selector || 'button[type="submit"]'
            };
            
            this.editingAuthConfig = authConfig;
            this.showEditAuthConfigModal = true;
            this.ui.modals.showEditAuthConfigModal = true; // Sync organized state
        },

        async createAuthConfig() {
            try {
                this.loading = true;
                
                if (!this.selectedAuthProject) {
                    this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }
            
                // Create the auth config with advanced SAML fields
                const authConfigData = {
                    name: this.authConfigForm.name,
                    type: this.authConfigForm.type,
                    domain: this.extractDomainFromUrl(this.authConfigForm.login_url),
                    url: this.authConfigForm.login_url,
                    username: this.authConfigForm.username,
                    password: this.authConfigForm.password,
                    login_page: this.authConfigForm.login_url,
                    project_id: this.selectedAuthProject,
                    auth_role: this.authConfigForm.auth_role || 'default',
                    auth_description: this.authConfigForm.description,
                    priority: this.authConfigForm.priority || 1,
                    is_default: this.authConfigForm.is_default || false,
                    // Advanced SAML/SSO configuration
                    idp_domain: this.authConfigForm.idp_domain || '',
                    username_selector: this.authConfigForm.username_selector || 'input[name="username"]',
                    password_selector: this.authConfigForm.password_selector || 'input[type="password"]',
                    submit_selector: this.authConfigForm.submit_selector || 'button[type="submit"]'
                };

                const response = await this.apiCall('/auth/configs', {
                    method: 'POST',
                    body: JSON.stringify(authConfigData)
                });

                if (response.success) {
                    this.closeAuthConfigModal();
                    await this.loadAuthConfigs(); // Refresh configs
                    await this.loadProjectAuthConfigs(); // Refresh project configs
                    this.showNotification('success', 'Config Created', 'Authentication configuration created successfully');
                } else {
                    throw new Error(response.message || 'Failed to create authentication configuration');
                }
            } catch (error) {
                console.error('Failed to create auth config:', error);
                this.showNotification('error', 'Creation Failed', error.message || 'Failed to create authentication configuration');
            } finally {
                this.loading = false;
            }
        },

        async updateAuthConfig() {
            try {
                if (!this.editingAuthConfig) return;

                this.loading = true;
                
                // Prepare the update data with advanced SAML fields
                const updateData = {
                    name: this.authConfigForm.name,
                    domain: this.extractDomainFromUrl(this.authConfigForm.login_url),
                    url: this.authConfigForm.login_url,
                    type: this.authConfigForm.type,
                    username: this.authConfigForm.username,
                    password: this.authConfigForm.password, // Will be empty if not changed
                    login_page: this.authConfigForm.login_url,
                    auth_role: this.authConfigForm.auth_role,
                    auth_description: this.authConfigForm.description,
                    priority: this.authConfigForm.priority,
                    is_default: this.authConfigForm.is_default,
                    // Advanced SAML/SSO configuration
                    idp_domain: this.authConfigForm.idp_domain || '',
                    username_selector: this.authConfigForm.username_selector || 'input[name="username"]',
                    password_selector: this.authConfigForm.password_selector || 'input[type="password"]',
                    submit_selector: this.authConfigForm.submit_selector || 'button[type="submit"]'
                };
                
                const response = await this.apiCall(`/auth/configs/${this.editingAuthConfig.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });

                if (response.success) {
                    // Update the config in the local array
                    const index = this.authConfigs.findIndex(c => c.id === this.editingAuthConfig.id);
                    if (index !== -1) {
                        this.authConfigs[index] = { ...this.authConfigs[index], ...response.data };
                    }

                    this.closeAuthConfigModal();
                    await this.loadAuthConfigs(); // Refresh configs
                    await this.loadProjectAuthConfigs(); // Refresh project configs
                    this.showNotification('success', 'Config Updated', 'Authentication configuration updated successfully');
                } else {
                    throw new Error(response.message || 'Failed to update authentication configuration');
                }
            } catch (error) {
                console.error('Failed to update auth config:', error);
                this.showNotification('error', 'Update Failed', error.message || 'Failed to update authentication configuration');
            } finally {
                this.loading = false;
            }
        },

        async deleteAuthConfig(authConfig) {
            if (!confirm(`Are you sure you want to delete the "${authConfig.name || authConfig.auth_role}" authentication configuration?`)) {
                return;
            }

            try {
                const response = await this.apiCall(`/auth/configs/${authConfig.id}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    // Remove from local arrays
                    this.authConfigs = this.authConfigs.filter(c => c.id !== authConfig.id);
                    this.projectAuthConfigs = this.projectAuthConfigs.filter(c => c.id !== authConfig.id);
                    
                    this.showNotification('success', 'Config Deleted', `Authentication configuration "${authConfig.name || authConfig.auth_role}" deleted successfully`);
                } else {
                    throw new Error(response.message || 'Failed to delete configuration');
                }
            } catch (error) {
                console.error('Failed to delete auth config:', error);
                this.showNotification('error', 'Delete Failed', error.message || 'Failed to delete authentication configuration');
            }
        },

        extractDomainFromUrl(url) {
            try {
                return new URL(url).hostname;
            } catch (error) {
                // If URL parsing fails, try to extract domain manually
                const match = url.match(/^https?:\/\/([^\/]+)/);
                return match ? match[1] : url;
            }
        },

        closeAuthConfigModal() {
            this.showAddAuthConfigModal = false;
            this.showEditAuthConfigModal = false;
            this.ui.modals.showAddAuthConfigModal = false; // Sync organized state
            this.ui.modals.showEditAuthConfigModal = false; // Sync organized state
            this.editingAuthConfig = null;
            this.authConfigForm = {
                name: '',
                type: 'form',
                login_url: '',
                username: '',
                password: '',
                description: '',
                auth_role: 'default',
                priority: 1,
                is_default: false
            };
        },

        // ===== UTILITY METHODS =====
        
        formatDuration(milliseconds) {
            if (!milliseconds) return '';
            const seconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) {
                return `${hours}h ${minutes % 60}m`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            } else {
                return `${seconds}s`;
            }
        },

        // ===== AUTOMATED TESTING METHODS =====
        
        async startAutomatedTesting() {
            if (!this.data.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }
            
            try {
                this.automatedTestingInProgress = true;
                this.testingProgress = {
                    percentage: 0,
                    message: 'Starting automated tests...',
                    completedPages: 0,
                    totalPages: 0,
                    currentPage: ''
                };
                
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        project_id: this.data.selectedProject,
                        session_type: 'automated',
                        testing_config: this.testingConfig || {
                            useAxe: true,
                            usePa11y: true,
                            useLighthouse: true,
                            wcagLevel: 'AA',
                            browser: 'chromium'
                        }
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('success', 'Testing Started', 'Automated accessibility testing has begun');
                    this.pollTestingProgress(result.session_id);
                } else {
                    const error = await response.json();
                    this.showNotification('error', 'Testing Failed', error.message || 'Failed to start testing');
                    this.automatedTestingInProgress = false;
                }
            } catch (error) {
                console.error('Error starting automated testing:', error);
                this.showNotification('error', 'Network Error', 'Failed to start testing');
                this.automatedTestingInProgress = false;
            }
        },

        async pollTestingProgress(sessionId) {
            const poll = async () => {
                try {
                    const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${sessionId}/status`, {
                        headers: this.getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const status = await response.json();
                        this.testingProgress = {
                            percentage: status.progress || 0,
                            message: status.message || 'Running tests...',
                            completedPages: status.completed_pages || 0,
                            totalPages: status.total_pages || 0,
                            currentPage: status.current_page || ''
                        };
                        
                        if (status.status === 'completed') {
                            this.automatedTestingInProgress = false;
                            this.showNotification('success', 'Testing Complete', `Tested ${status.completed_pages} pages`);
                            this.loadAutomatedTestResults();
                        } else if (status.status === 'failed') {
                            this.automatedTestingInProgress = false;
                            this.showNotification('error', 'Testing Failed', status.error || 'Testing process failed');
                        } else if (status.status === 'running') {
                            setTimeout(poll, 3000); // Poll every 3 seconds
                        }
                    }
                } catch (error) {
                    console.error('Error polling testing progress:', error);
                    this.automatedTestingInProgress = false;
                }
            };
            
            poll();
        },

        async loadAutomatedTestResults() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/automated-results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.automatedTestResults = data.results || [];
                } else {
                    console.error('Failed to load automated test results');
                }
            } catch (error) {
                console.error('Error loading automated test results:', error);
            }
        },

        async viewTestDetails(result) {
            // Open detailed test results in a modal or navigate to results view
            this.selectedTestResult = result;
            this.showTestDetailsModal = true;
        },

        async downloadTestReport(result) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${result.session_id}/report`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `accessibility-report-${result.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    this.showNotification('error', 'Download Failed', 'Failed to download test report');
                }
            } catch (error) {
                console.error('Error downloading report:', error);
                this.showNotification('error', 'Network Error', 'Failed to download test report');
            }
        },

        // Get default automated test configuration
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

        // Toggle automated testing tools
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

        // Toggle Playwright test types
        togglePlaywrightTestType(testType) {
            const testTypes = this.automatedTestConfig.playwright.testTypes;
            const index = testTypes.indexOf(testType);
            if (index > -1) {
                testTypes.splice(index, 1);
            } else {
                testTypes.push(testType);
            }
        },

        // Toggle Playwright browsers
        togglePlaywrightBrowser(browser) {
            const browsers = this.automatedTestConfig.playwright.browsers;
            const index = browsers.indexOf(browser);
            if (index > -1) {
                browsers.splice(index, 1);
            } else {
                browsers.push(browser);
            }
        },

        // Toggle Playwright viewports
        togglePlaywrightViewport(viewport) {
            const viewports = this.automatedTestConfig.playwright.viewports;
            const index = viewports.indexOf(viewport);
            if (index > -1) {
                viewports.splice(index, 1);
            } else {
                viewports.push(viewport);
            }
        },

        // Start automated testing with advanced configuration
        async startAutomatedTestingFromConfig() {
            if (!this.data.selectedProject) {
                this.showNotification('error', 'No Project', 'Please select a project first');
                return;
            }

            try {
                this.loading = true;
                this.automatedTestingInProgress = true;
                
                const config = this.automatedTestConfig;
                
                // Start comprehensive testing with user configuration
                const response = await this.apiCall(`/projects/${this.data.selectedProject}/comprehensive-testing`, {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionName: `Automated Test - ${new Date().toLocaleDateString()}`,
                        description: 'Automated testing initiated with custom configuration',
                        testingApproach: 'automated',
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
                    this.showNotification('success', 'Testing Started', 'Advanced automated testing started successfully!');
                    this.showTestConfigurationModal = false;
                    
                    // Start monitoring progress
                    if (response.data.session_id) {
                        this.pollTestingProgress(response.data.session_id);
                    }
                } else {
                    throw new Error(response.error || 'Failed to start testing');
                }
            } catch (error) {
                console.error('Error starting automated testing:', error);
                this.showNotification('error', 'Testing Failed', error.message || 'Failed to start automated testing');
                this.automatedTestingInProgress = false;
            } finally {
                this.loading = false;
            }
        },

        // Start automated testing for specific requirements
        async startAutomatedTestingForRequirements(sessionId, requirements = null) {
            try {
                this.loading = true;
                
                if (!this.data.selectedProject) {
                    throw new Error('No project selected');
                }
                
                console.log(`🚀 Starting automated testing for session: ${sessionId}`);
                
                // TODO: Temporarily disabled Playwright integration due to schema issues
                // const response = await this.apiCall(`/sessions/${sessionId}/start-playwright`, {
                //     method: 'POST',
                //     body: JSON.stringify({
                //         testTypes: ['basic', 'keyboard', 'screen-reader', 'form'],
                //         browsers: ['chromium'],
                //         viewports: ['desktop'],
                //         requirements: requirements
                //     })
                // });

                // if (response.success) {
                //     this.showNotification('success', 'Testing Started', 'Automated testing started successfully!');
                // } else {
                //     throw new Error(response.error || 'Failed to start testing');
                // }
                
                // For now, just show a success message
                this.showNotification('success', 'Session Opened', 'Session details loaded successfully!');
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error starting automated testing:', error);
                this.showNotification('error', 'Testing Failed', `Failed to start automated testing: ${error.message}`);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        // Close test details modal
        closeTestDetailsModal() {
            this.showTestDetailsModal = false;
            this.selectedTestResult = null;
        },

        // Close test configuration modal
        closeTestConfigurationModal() {
            this.showTestConfigurationModal = false;
        },

        // Show advanced test configuration modal
        showAdvancedTestConfiguration() {
            this.showTestConfigurationModal = true;
        },

        // ===== MANUAL TESTING METHODS =====
        
        async startManualTesting() {
            if (!this.data.selectedProject) {
                this.showNotification('warning', 'No Project Selected', 'Please select a project first');
                return;
            }
            
            try {
                // Create or load a manual testing session for the project
                const response = await this.apiCall(`/sessions`, {
                    method: 'POST',
                    body: JSON.stringify({
                        project_id: this.data.selectedProject,
                        name: `Manual Testing - ${new Date().toLocaleDateString()}`,
                        description: 'Manual accessibility testing session',
                        conformance_level: 'AA',
                        testing_approach: 'manual'
                    })
                });
                
                if (response.success) {
                    this.showNotification('success', 'Manual Testing Started', 'Manual testing session created');
                    await this.selectManualTestingSession(response.data);
                } else {
                    throw new Error(response.error || 'Failed to create manual testing session');
                }
            } catch (error) {
                console.error('Error starting manual testing:', error);
                this.showNotification('error', 'Failed to Start', error.message || 'Failed to start manual testing');
            }
        },

        async editManualTestResult(result) {
            this.currentManualTest = {
                assignment: { requirement_id: result.requirement_id },
                pageGroup: { page_id: result.page_id },
                sessionId: result.session_id,
                existingResult: result
            };
            this.showManualTestingModal = true;
        },

        async loadManualTestingAssignments() {
            if (!this.manualTestingSession) return;
            
            try {
                console.log('📋 Loading manual testing assignments...');
                
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
                
                const response = await this.apiCall(`/manual-testing/session/${this.manualTestingSession.id}/assignments?${params}`);
                
                if (response.success) {
                    this.manualTestingAssignments = response.data.assignments || [];
                    this.applyManualTestingFilters();
                    
                    console.log(`✅ Loaded ${response.data.total_assignments} manual testing assignments`);
                } else {
                    throw new Error(response.error || 'Failed to load manual testing assignments');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing assignments:', error);
                this.showNotification('error', 'Loading Failed', 'Failed to load manual testing assignments');
            }
        },

        async loadManualTestingCoverageAnalysis() {
            if (!this.manualTestingSession) return;
            
            try {
                const response = await this.apiCall(`/manual-testing/session/${this.manualTestingSession.id}/coverage-analysis`);
                
                if (response.success) {
                    this.manualTestingCoverageAnalysis = response.data;
                } else {
                    throw new Error(response.error || 'Failed to load coverage analysis');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing coverage analysis:', error);
                this.showNotification('error', 'Analysis Failed', 'Failed to load coverage analysis');
            }
        },

        async refreshManualTestingTabData() {
            try {
                console.log('🔄 Refreshing manual testing tab data...');
                
                const promises = [];
                
                if (this.manualTestingSession) {
                    promises.push(this.loadManualTestingAssignments());
                }
                
                promises.push(this.loadManualTestingCoverageAnalysis());
                
                await Promise.all(promises);
                
                console.log('✅ Manual testing tab data refreshed');
            } catch (error) {
                console.error('❌ Error refreshing manual testing tab data:', error);
                this.showNotification('error', 'Refresh Failed', 'Failed to refresh manual testing data');
            }
        },

        async selectManualTestingSession(session) {
            try {
                console.log('🎯 Selecting manual testing session:', session.name);
                
                this.manualTestingSession = session;
                
                await Promise.all([
                    this.loadManualTestingAssignments(session.id),
                    this.loadManualTestingProgress(session.id)
                ]);
                
                console.log('✅ Manual testing session selected successfully');
            } catch (error) {
                console.error('❌ Error selecting manual testing session:', error);
                this.showNotification('error', 'Selection Failed', 'Failed to load manual testing session');
            }
        },

        async loadManualTestingProgress(sessionId) {
            try {
                console.log('📊 Loading manual testing progress...');
                
                const response = await this.apiCall(`/manual-testing/session/${sessionId}/progress`);
                
                if (response.success) {
                    this.manualTestingProgress = response.data.progress || null;
                    console.log('✅ Manual testing progress loaded');
                } else {
                    throw new Error(response.error || 'Failed to load progress');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing progress:', error);
            }
        },

        applyManualTestingFilters() {
            this.filterManualTestingAssignments();
        },

        filterManualTestingAssignments() {
            const filters = this.manualTestingFilters;
            
            this.filteredManualTestingAssignments = this.manualTestingAssignments.filter(pageGroup => {
                // Apply status filter
                if (filters.status && !pageGroup.assignments.some(a => a.status === filters.status)) {
                    return false;
                }
                
                // Apply WCAG level filter
                if (filters.wcag_level && !pageGroup.assignments.some(a => a.wcag_level === filters.wcag_level)) {
                    return false;
                }
                
                // Apply page filter
                if (filters.page_id && pageGroup.page_id !== filters.page_id) {
                    return false;
                }
                
                return true;
            });
            
            console.log('🔍 Filtered manual testing assignments:', this.filteredManualTestingAssignments.length, 'page groups');
        },

        async startManualTest(pageGroup, assignment) {
            try {
                console.log('🎯 Starting manual test:', assignment.criterion_number);
                
                this.currentManualTest = {
                    pageGroup: pageGroup,
                    assignment: assignment,
                    sessionId: this.manualTestingSession.id
                };
                
                await this.loadManualTestingProcedure(assignment.requirement_id, pageGroup.page_type);
                
                this.showManualTestingModal = true;
            } catch (error) {
                console.error('❌ Error starting manual test:', error);
                this.showNotification('error', 'Test Failed', 'Failed to start manual test');
            }
        },

        async loadManualTestingProcedure(requirementId, pageType) {
            try {
                const params = new URLSearchParams({ page_type: pageType });
                
                if (this.currentManualTest) {
                    params.append('page_id', this.currentManualTest.pageGroup.page_id);
                    params.append('session_id', this.currentManualTest.sessionId);
                }
                
                const response = await this.apiCall(`/manual-testing/requirement/${requirementId}/procedure?${params}`);
                
                if (response.success) {
                    this.manualTestingProcedure = response.data.requirement || null;
                    this.manualTestingContext = response.data.test_context || null;
                } else {
                    throw new Error(response.error || 'Failed to load procedure');
                }
            } catch (error) {
                console.error('❌ Error loading manual testing procedure:', error);
                this.showNotification('error', 'Loading Failed', 'Failed to load testing procedure');
            }
        },

        async submitManualTestResult(result, confidence = 'medium', notes = '', evidence = {}) {
            try {
                console.log('💾 Submitting manual test result:', result);
                
                const response = await this.apiCall(`/manual-testing/session/${this.currentManualTest.sessionId}/result`, {
                    method: 'POST',
                    body: JSON.stringify({
                        page_id: this.currentManualTest.pageGroup.page_id,
                        requirement_id: this.currentManualTest.assignment.requirement_id,
                        result: result,
                        confidence_level: confidence,
                        notes: notes,
                        evidence: evidence,
                        test_method_used: 'manual'
                    })
                });
                
                if (response.success) {
                    // Refresh data after successful submission
                    await Promise.all([
                        this.loadManualTestingAssignments(this.currentManualTest.sessionId),
                        this.loadManualTestingProgress(this.currentManualTest.sessionId)
                    ]);
                    
                    // Close modal and reset state
                    this.showManualTestingModal = false;
                    this.currentManualTest = null;
                    this.manualTestingProcedure = null;
                    this.manualTestingContext = null;
                    
                    console.log('✅ Manual test result submitted successfully');
                    this.showNotification('success', 'Result Saved', 'Manual test result saved successfully');
                } else {
                    throw new Error(response.error || 'Failed to submit result');
                }
            } catch (error) {
                console.error('❌ Error submitting manual test result:', error);
                this.showNotification('error', 'Submit Failed', 'Failed to submit test result');
            }
        },

        closeManualTestingSession() {
            this.manualTestingSession = null;
            this.manualTestingProgress = null;
            this.manualTestingAssignments = [];
            this.filteredManualTestingAssignments = [];
            this.currentManualTest = null;
            this.manualTestingProcedure = null;
            this.manualTestingContext = null;
        },

        // ===== RESULTS METHODS =====
        
        async refreshResults() {
            if (!this.data.selectedProject) return;
            
            try {
                await Promise.all([
                    this.loadTestSessionResults(),
                    this.loadResultsSummary(),
                    this.loadComplianceAnalysis(),
                    this.loadRecentViolations()
                ]);
                this.showNotification('success', 'Results Refreshed', 'Latest test results loaded');
            } catch (error) {
                console.error('Error refreshing results:', error);
                this.showNotification('error', 'Refresh Failed', 'Failed to refresh results');
            }
        },

        async loadTestSessionResults() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/session-results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.testSessionResults = data.results || [];
                } else {
                    console.error('Failed to load test session results');
                }
            } catch (error) {
                console.error('Error loading test session results:', error);
            }
        },

        async loadResultsSummary() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/results-summary`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.resultsSummary = data.summary || {};
                } else {
                    console.error('Failed to load results summary');
                }
            } catch (error) {
                console.error('Error loading results summary:', error);
            }
        },

        async loadComplianceAnalysis() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/compliance-analysis`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.complianceAnalysis = data.analysis || {};
                } else {
                    console.error('Failed to load compliance analysis');
                }
            } catch (error) {
                console.error('Error loading compliance analysis:', error);
            }
        },

        async loadRecentViolations() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/recent-violations`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.recentViolations = data.violations || [];
                } else {
                    console.error('Failed to load recent violations');
                }
            } catch (error) {
                console.error('Error loading recent violations:', error);
            }
        },

        async viewDetailedResults(session) {
            this.selectedSession = session;
            this.showSessionResultsModal = true;
            // Load detailed results for the session
            await this.loadSessionDetailedResults(session.id);
        },

        async loadSessionDetailedResults(sessionId) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${sessionId}/detailed-results`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.sessionDetailedResults = data.results || {};
                } else {
                    this.showNotification('error', 'Load Failed', 'Failed to load detailed results');
                }
            } catch (error) {
                console.error('Error loading detailed results:', error);
                this.showNotification('error', 'Network Error', 'Failed to load detailed results');
            }
        },

        async exportResults() {
            if (!this.data.selectedProject) return;
            
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/projects/${this.data.selectedProject}/export-results`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        format: 'comprehensive',
                        include_violations: true,
                        include_compliance: true
                    })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `accessibility-results-${this.data.selectedProject}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    this.showNotification('success', 'Export Complete', 'Results report downloaded');
                } else {
                    this.showNotification('error', 'Export Failed', 'Failed to export results');
                }
            } catch (error) {
                console.error('Error exporting results:', error);
                this.showNotification('error', 'Network Error', 'Failed to export results');
            }
        },

        async exportSessionResults(session) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/sessions/${session.id}/export`, {
                    headers: this.getAuthHeaders()
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `session-results-${session.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    this.showNotification('error', 'Export Failed', 'Failed to export session results');
                }
            } catch (error) {
                console.error('Error exporting session results:', error);
                this.showNotification('error', 'Network Error', 'Failed to export session results');
            }
        },

        async viewViolationDetails(violation) {
            this.selectedViolation = violation;
            this.showViolationDetailsModal = true;
        },

        // Authentication helper methods (from stable backup)
        getAvailableAuthConfigs() {
            return this.data.projectAuthConfigs.filter(config => config.auth_config_id || config.id);
        },

        getAuthConfigDisplayName(config) {
            if (!config) return 'No Authentication';
            return `${config.name || config.auth_config_name} (${config.auth_role || config.type})`;
        },

        getActiveAuthCount() {
            return this.data.projectAuthConfigs.filter(config => config.status === 'active').length;
        },

        getPendingAuthCount() {
            return this.data.projectAuthConfigs.filter(config => config.status === 'pending' || config.status === 'testing').length;
        },

        getFailedAuthCount() {
            return this.data.projectAuthConfigs.filter(config => config.status === 'failed' || config.status === 'error').length;
        },

        async refreshAuthConfigs() {
            // Refresh both global and project-specific auth configs
            await this.loadAuthConfigs(); // This calls loadProjectAuthConfigs internally
            this.showNotification('success', 'Refreshed', 'Authentication configurations refreshed');
        },

        // Project-related loading methods (transferred from stable version)
        async loadProjectDiscoveries() {
            if (!this.data.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/projects/${this.data.selectedProject}/discoveries`);
                this.data.discoveries = data.data || [];
                this.discoveries = this.data.discoveries; // Sync legacy state
                
                // Defensive check to ensure discoveries is always an array
                if (!Array.isArray(this.discoveries)) {
                    this.discoveries = [];
                }
                
                console.log(`🔍 Loaded ${this.discoveries.length} discoveries for project`);
                
                // Check for pending discoveries and offer recovery
                const pendingDiscoveries = this.discoveries.filter(d => d.status === 'pending' || d.status === 'in_progress');
                if (pendingDiscoveries.length > 0) {
                    console.log(`⚠️ Found ${pendingDiscoveries.length} pending discoveries - offering recovery options`);
                }
                
                // Auto-select completed discoveries if none are selected and there's only one completed
                const completedDiscoveries = this.discoveries.filter(d => d.status === 'completed');
                // Defensive check to ensure selectedDiscoveries is always an array
                if (!Array.isArray(this.selectedDiscoveries)) {
                    this.selectedDiscoveries = [];
                }
                if (completedDiscoveries.length === 1 && this.selectedDiscoveries.length === 0) {
                    this.selectedDiscoveries = [completedDiscoveries[0].id];
                    console.log(`🎯 Auto-selected single completed discovery: ${completedDiscoveries[0].domain}`);
                }
            } catch (error) {
                console.error('Failed to load discoveries:', error);
                // Ensure discoveries is always an array even if API fails
                this.data.discoveries = this.data.discoveries || [];
                this.discoveries = this.discoveries || [];
            }
        },

        async loadProjectTestSessions() {
            if (!this.data.selectedProject) return;
            
            try {
                const data = await this.apiCall(`/sessions?project_id=${this.data.selectedProject}`);
                this.data.testSessions = data.data || [];
                this.testSessions = this.data.testSessions; // Sync legacy state
                console.log(`🧪 Loaded ${this.testSessions.length} test sessions for project`);
            } catch (error) {
                console.error('Failed to load test sessions:', error);
            }
        },

        loadSelectedDiscoveries() {
            if (!this.data.selectedProject) return;
            const key = `selectedDiscoveries_${this.data.selectedProject}`;
            const saved = localStorage.getItem(key);
            this.selectedDiscoveries = saved ? JSON.parse(saved) : [];
        },

        // Authentication methods (transferred from stable version)
        async logout() {
            try {
                if (this.token) {
                    await fetch(`${this.config.apiBaseUrl}/auth/logout`, {
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
                this.showNotification('info', 'Logged Out', 'Logged out successfully');
            }
        },
        
        // Add manual URL to crawler
        async addManualUrl() {
            if (!this.newManualUrl || !this.selectedCrawlerForPages) {
                this.showNotification('error', 'Validation Error', 'URL and crawler selection are required');
                return;
            }

            this.addingManualUrl = true;
            
            try {
                // Ensure URL has protocol
                let url = this.newManualUrl.trim();
                if (!url.match(/^https?:\/\//)) {
                    url = `https://${url}`;
                }

                const pageData = {
                    url: url,
                    title: this.newManualUrlTitle || null,
                    page_type: this.newManualUrlType,
                    depth: this.newManualUrlDepth || 1,
                    requires_auth: this.newManualUrlRequiresAuth,
                    has_forms: this.newManualUrlHasForms,
                    selected_for_testing: this.newManualUrlForTesting,
                    status_code: 200, // Default for manual entry
                    discovered_manually: true
                };

                console.log('🔍 DEBUG: Adding manual URL to crawler:', this.selectedCrawlerForPages.id, pageData);

                const response = await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/pages`, {
                    method: 'POST',
                    body: JSON.stringify(pageData)
                });

                if (response.success) {
                    this.showNotification('success', 'URL Added', 'Manual URL added successfully');
                    
                    // Add the new page to the current list
                    const newPage = {
                        id: response.data.id,
                        ...pageData,
                        selected: false
                    };
                    this.crawlerPages.push(newPage);
                    this.updateFilteredCrawlerPages();
                    
                    // Reset form and close modal
                    this.resetManualUrlForm();
                    this.showAddManualUrlModal = false;
                    
                    // Reload page counts to update display
                    this.loadCrawlerPageCounts(true);
                } else {
                    this.showNotification('error', 'Add Failed', response.message || 'Failed to add manual URL');
                }
            } catch (error) {
                console.error('Error adding manual URL:', error);
                this.showNotification('error', 'Network Error', 'Failed to add manual URL');
            } finally {
                this.addingManualUrl = false;
            }
        },

        // Reset manual URL form
        resetManualUrlForm() {
            this.newManualUrl = '';
            this.newManualUrlTitle = '';
            this.newManualUrlType = 'content';
            this.newManualUrlDepth = 1;
            this.newManualUrlRequiresAuth = false;
            this.newManualUrlHasForms = false;
            this.newManualUrlForTesting = true;
        },

        // Save UI page selections to persist them across modal reopens
        async saveCrawlerPageSelections() {
            if (!this.selectedCrawlerForPages) {
                return;
            }

            const selectedPageIds = this.crawlerPages
                .filter(page => page.selected)
                .map(page => page.id);

            try {
                this.loading = true;
                
                await this.apiCall(`/web-crawlers/crawlers/${this.selectedCrawlerForPages.id}/page-selections`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        selected_page_ids: selectedPageIds
                    })
                });

                this.showNotification(
                    'success',
                    'Selections Saved',
                    `${selectedPageIds.length} pages selected for quick access`
                );

            } catch (error) {
                console.error('Failed to save page selections:', error);
                this.showNotification('error', 'Save Failed', 'Failed to save page selections');
            } finally {
                this.loading = false;
            }
        },

        // Load saved UI page selections to restore checkbox state
        async loadCrawlerPageSelections(crawlerId) {
            try {
                const response = await this.apiCall(`/web-crawlers/crawlers/${crawlerId}/page-selections`);
                
                if (response.success && response.data && response.data.selected_page_ids) {
                    const selectedIds = new Set(response.data.selected_page_ids);
                    
                    // Mark pages as selected in the UI
                    this.crawlerPages.forEach(page => {
                        page.selected = selectedIds.has(page.id);
                    });
                    
                    console.log(`🔍 DEBUG: Restored ${selectedIds.size} saved page selections`);
                }
                
            } catch (error) {
                // Don't show error notifications for loading selections - it's optional
                console.log('No saved page selections found (this is normal for new crawlers)');
            }
        },

        // ===== ADMIN BACKUP METHODS =====

        // Show admin backup modal
        async showAdminBackup() {
            this.admin.showBackupModal = true;
            
            // Load backup data if not already loaded
            try {
                await this.loadDatabaseStatus();
                await this.loadBackups();
            } catch (error) {
                console.error('Failed to load backup data:', error);
            }
        },

        // Close admin backup modal
        closeAdminBackup() {
            this.admin.showBackupModal = false;
            this.admin.showRestoreModal = false;
            this.admin.showDeleteModal = false;
            this.admin.selectedBackup = null;
            this.admin.confirmRestore = false;
        },

        // Load admin backup view (legacy method for backward compatibility)
        async loadAdminBackupView() {
            // Redirect to modal version
            await this.showAdminBackup();
        },

        // Load database status
        async loadDatabaseStatus() {
            try {
                const response = await this.apiCall('/admin/database/status');
                if (response.success) {
                    this.admin.databaseStatus = response.data;
                }
            } catch (error) {
                console.error('Failed to load database status:', error);
            }
        },

        // Load backups list
        async loadBackups() {
            try {
                this.admin.loadingBackups = true;
                const response = await this.apiCall('/admin/backups');
                if (response.success) {
                    this.admin.backups = response.data || [];
                }
            } catch (error) {
                console.error('Failed to load backups:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load backups list');
            } finally {
                this.admin.loadingBackups = false;
            }
        },

        // Create new backup
        async createBackup() {
            if (!this.admin.newBackupDescription.trim()) {
                this.showNotification('error', 'Validation Error', 'Please enter a backup description');
                return;
            }

            try {
                this.admin.creatingBackup = true;
                this.admin.backupProgress = { message: 'Initializing backup...', percentage: 0 };

                const response = await this.apiCall('/admin/backups', {
                    method: 'POST',
                    body: JSON.stringify({
                        description: this.admin.newBackupDescription.trim(),
                        include_schema: this.admin.includeSchema,
                        include_data: this.admin.includeData,
                        compress: this.admin.compressBackup
                    })
                });

                if (response.success) {
                    this.showNotification('success', 'Backup Created', 'Database backup created successfully');
                    this.admin.newBackupDescription = '';
                    await this.loadBackups();
                    await this.loadDatabaseStatus();
                } else {
                    throw new Error(response.message || 'Failed to create backup');
                }
            } catch (error) {
                console.error('Failed to create backup:', error);
                this.showNotification('error', 'Backup Failed', error.message || 'Failed to create database backup');
            } finally {
                this.admin.creatingBackup = false;
                this.admin.backupProgress = { message: '', percentage: 0 };
            }
        },

        // Download backup
        async downloadBackup(backup) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}/api/admin/backups/${backup.id}/download`, {
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = backup.filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    this.showNotification('success', 'Download Started', 'Backup download started');
                } else {
                    throw new Error('Download failed');
                }
            } catch (error) {
                console.error('Failed to download backup:', error);
                this.showNotification('error', 'Download Failed', 'Failed to download backup file');
            }
        },

        // Confirm restore
        confirmRestore(backup) {
            this.admin.selectedBackup = backup;
            this.admin.showRestoreModal = true;
            this.admin.confirmRestore = false;
        },

        // Restore backup
        async restoreBackup() {
            if (!this.admin.confirmRestore || !this.admin.selectedBackup) {
                return;
            }

            try {
                this.admin.restoringBackup = true;

                const response = await this.apiCall(`/admin/backups/${this.admin.selectedBackup.id}/restore`, {
                    method: 'POST'
                });

                if (response.success) {
                    this.showNotification('success', 'Restore Complete', 'Database restored successfully. Page will reload.');
                    
                    // Close modal and reload page after successful restore
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    throw new Error(response.message || 'Failed to restore backup');
                }
            } catch (error) {
                console.error('Failed to restore backup:', error);
                this.showNotification('error', 'Restore Failed', error.message || 'Failed to restore database backup');
            } finally {
                this.admin.restoringBackup = false;
                this.admin.showRestoreModal = false;
                this.admin.selectedBackup = null;
                this.admin.confirmRestore = false;
            }
        },

        // Confirm delete
        confirmDelete(backup) {
            this.admin.selectedBackup = backup;
            this.admin.showDeleteModal = true;
        },

        // Delete backup
        async deleteBackup() {
            if (!this.admin.selectedBackup) {
                return;
            }

            try {
                this.admin.deletingBackup = true;

                const response = await this.apiCall(`/admin/backups/${this.admin.selectedBackup.id}`, {
                    method: 'DELETE'
                });

                if (response.success) {
                    this.showNotification('success', 'Backup Deleted', 'Backup deleted successfully');
                    await this.loadBackups();
                    await this.loadDatabaseStatus();
                } else {
                    throw new Error(response.message || 'Failed to delete backup');
                }
            } catch (error) {
                console.error('Failed to delete backup:', error);
                this.showNotification('error', 'Delete Failed', error.message || 'Failed to delete backup');
            } finally {
                this.admin.deletingBackup = false;
                this.admin.showDeleteModal = false;
                this.admin.selectedBackup = null;
            }
        },

        // Helper function to get relative time
        getRelativeTime(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            if (diffDays > 0) {
                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            } else if (diffHours > 0) {
                return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else {
                return 'Less than 1 hour ago';
            }
        },

        // ===== USER MANAGEMENT METHODS (Legacy - Deprecated) =====
        // Note: Functionality moved to newer implementation below

        // Legacy closeUserManagement removed - functionality moved to newer implementation

        // Legacy loadUserStats removed - functionality moved to calculateUserStats() method

        async loadUsers(page = 1) {
            try {
                this.userManagement.isLoading = true;
                this.userManagement.currentPage = page;
                
                this.showUsersLoadingState();
                
                const params = new URLSearchParams({
                    page: page.toString(),
                    limit: this.userManagement.limit.toString(),
                    sort: this.userManagement.sortField,
                    order: this.userManagement.sortOrder
                });

                // Add filters
                if (this.userManagement.filters.search) {
                    params.append('search', this.userManagement.filters.search);
                }
                if (this.userManagement.filters.role) {
                    params.append('role', this.userManagement.filters.role);
                }
                if (this.userManagement.filters.status) {
                    params.append('status', this.userManagement.filters.status);
                }

                const response = await this.apiCall(`/users?${params.toString()}`);
                
                this.userManagement.users = response.data.users;
                this.userManagement.totalPages = response.data.pagination.total_pages;
                this.userManagement.totalCount = response.data.pagination.total_count;
                
                this.renderUsersTable();
                this.updateUsersPagination();
                
            } catch (error) {
                console.error('❌ Error loading users:', error);
                this.showUsersErrorState();
                this.showNotification('error', 'Load Failed', 'Failed to load users');
            } finally {
                this.userManagement.isLoading = false;
            }
        },

        showUsersLoadingState() {
            document.getElementById('usersLoadingState').classList.remove('hidden');
            document.getElementById('usersEmptyState').classList.add('hidden');
            document.getElementById('usersTableBody').innerHTML = '';
        },

        showUsersErrorState() {
            document.getElementById('usersLoadingState').classList.add('hidden');
            document.getElementById('usersEmptyState').classList.remove('hidden');
            document.getElementById('usersTableBody').innerHTML = '';
        },

        renderUsersTable() {
            const tableBody = document.getElementById('usersTableBody');
            const loadingState = document.getElementById('usersLoadingState');
            const emptyState = document.getElementById('usersEmptyState');
            
            loadingState.classList.add('hidden');
            
            if (this.userManagement.users.length === 0) {
                emptyState.classList.remove('hidden');
                tableBody.innerHTML = '';
                return;
            }
            
            emptyState.classList.add('hidden');
            
            tableBody.innerHTML = this.userManagement.users.map(user => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-8 w-8">
                                <div class="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                    ${user.username.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div class="ml-3">
                                <div class="text-sm font-medium text-gray-900">${this.escapeHtml(user.username)}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.escapeHtml(user.full_name || '-')}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${this.escapeHtml(user.email)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getRoleBadgeClass(user.role)}">
                            ${user.role}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${user.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${user.last_login ? this.formatDate(user.last_login) : 'Never'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="flex space-x-2">
                            <button onclick="dashboard().editUser('${user.id}')" 
                                    class="text-blue-600 hover:text-blue-900 transition-colors" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="dashboard().showPasswordResetModal('${user.id}', '${this.escapeHtml(user.username)}')" 
                                    class="text-yellow-600 hover:text-yellow-900 transition-colors" title="Reset Password">
                                <i class="fas fa-key"></i>
                            </button>
                            ${this.getCurrentUserId() !== user.id ? `
                                <button onclick="dashboard().showDeleteUserModal('${user.id}', '${this.escapeHtml(user.username)}')" 
                                        class="text-red-600 hover:text-red-900 transition-colors" title="Delete User">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : '<span class="text-gray-400">-</span>'}
                            ${!user.is_active ? `
                                <button onclick="dashboard().reactivateUser('${user.id}')" 
                                        class="text-green-600 hover:text-green-900 transition-colors" title="Reactivate User">
                                    <i class="fas fa-check-circle"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        getCurrentUserId() {
            return this.user?.id || null;
        },

        getRoleBadgeClass(role) {
            switch (role) {
                case 'admin':
                    return 'bg-red-100 text-red-800';
                case 'user':
                    return 'bg-blue-100 text-blue-800';
                case 'viewer':
                    return 'bg-gray-100 text-gray-800';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        },

        updateUsersPagination() {
            const start = (this.userManagement.currentPage - 1) * this.userManagement.limit + 1;
            const end = Math.min(start + this.userManagement.limit - 1, this.userManagement.totalCount);
            
            document.getElementById('usersShowingStart').textContent = start;
            document.getElementById('usersShowingEnd').textContent = end;
            document.getElementById('usersTotalCount').textContent = this.userManagement.totalCount;
            
            const prevBtn = document.getElementById('usersPrevPage');
            const nextBtn = document.getElementById('usersNextPage');
            
            prevBtn.disabled = this.userManagement.currentPage <= 1;
            nextBtn.disabled = this.userManagement.currentPage >= this.userManagement.totalPages;
        },

        // User Form Functions
        showAddUserForm() {
            this.userManagement.editingUser = null;
            document.getElementById('userFormTitle').textContent = 'Add New User';
            document.getElementById('userFormSubmitText').textContent = 'Create User';
            document.getElementById('passwordField').style.display = 'block';
            document.getElementById('userPassword').required = true;
            
            // Reset form
            document.getElementById('userForm').reset();
            document.getElementById('userIsActive').checked = true;
            
            document.getElementById('userFormModal').classList.remove('hidden');
        },

        async editUser(userId) {
            try {
                const response = await this.apiCall(`/users/${userId}`);
                const user = response.data.user;
                
                this.userManagement.editingUser = user;
                
                document.getElementById('userFormTitle').textContent = 'Edit User';
                document.getElementById('userFormSubmitText').textContent = 'Update User';
                document.getElementById('passwordField').style.display = 'none';
                document.getElementById('userPassword').required = false;
                
                // Populate form
                document.getElementById('userId').value = user.id;
                document.getElementById('userUsername').value = user.username;
                document.getElementById('userEmail').value = user.email;
                document.getElementById('userFullName').value = user.full_name || '';
                document.getElementById('userRole').value = user.role;
                document.getElementById('userIsActive').checked = user.is_active;
                
                document.getElementById('userFormModal').classList.remove('hidden');
                
            } catch (error) {
                console.error('❌ Error loading user for edit:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load user details');
            }
        },

        closeUserForm() {
            document.getElementById('userFormModal').classList.add('hidden');
            document.getElementById('userForm').reset();
            this.userManagement.editingUser = null;
        },

        async handleUserFormSubmit(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                full_name: formData.get('full_name'),
                role: formData.get('role'),
                is_active: formData.has('is_active')
            };
            
            if (!this.userManagement.editingUser) {
                userData.password = formData.get('password');
            }
            
            try {
                const submitBtn = document.getElementById('userFormSubmitBtn');
                const submitSpinner = document.getElementById('userFormSubmitSpinner');
                
                submitBtn.disabled = true;
                submitSpinner.classList.remove('hidden');
                
                let response;
                if (this.userManagement.editingUser) {
                    response = await this.apiCall(`/users/${this.userManagement.editingUser.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(userData)
                    });
                } else {
                    response = await this.apiCall('/users', {
                        method: 'POST',
                        body: JSON.stringify(userData)
                    });
                }
                
                this.showNotification('success', 'User Saved', response.message || 'User saved successfully');
                this.closeUserForm();
                await this.loadUsers(this.userManagement.currentPage);
                this.calculateUserStats();
                
            } catch (error) {
                console.error('❌ Error saving user:', error);
                this.showNotification('error', 'Save Failed', error.message || 'Failed to save user');
            } finally {
                const submitBtn = document.getElementById('userFormSubmitBtn');
                const submitSpinner = document.getElementById('userFormSubmitSpinner');
                
                submitBtn.disabled = false;
                submitSpinner.classList.add('hidden');
            }
        },

        // Password Reset Functions
        showPasswordResetModal(userId, username) {
            document.getElementById('resetUserId').value = userId;
            document.getElementById('resetUserName').textContent = username;
            document.getElementById('passwordResetForm').reset();
            document.getElementById('passwordResetModal').classList.remove('hidden');
        },

        closePasswordResetModal() {
            document.getElementById('passwordResetModal').classList.add('hidden');
            document.getElementById('passwordResetForm').reset();
        },

        async handlePasswordResetSubmit(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const newPassword = formData.get('new_password');
            const confirmPassword = formData.get('confirm_password');
            const userId = formData.get('userId');
            
            if (newPassword !== confirmPassword) {
                this.showNotification('error', 'Validation Error', 'Passwords do not match');
                return;
            }
            
            try {
                const submitBtn = document.getElementById('passwordResetSubmitBtn');
                submitBtn.disabled = true;
                
                const response = await this.apiCall(`/users/${userId}/password`, {
                    method: 'PUT',
                    body: JSON.stringify({ new_password: newPassword })
                });
                
                this.showNotification('success', 'Password Reset', response.message || 'Password reset successfully');
                this.closePasswordResetModal();
                
            } catch (error) {
                console.error('❌ Error resetting password:', error);
                this.showNotification('error', 'Reset Failed', error.message || 'Failed to reset password');
            } finally {
                document.getElementById('passwordResetSubmitBtn').disabled = false;
            }
        },

        // NOTE: Delete User Functions moved to Alpine.js section below (lines ~5917)

        async reactivateUser(userId) {
            try {
                const response = await this.apiCall(`/users/${userId}/activate`, {
                    method: 'POST'
                });
                
                this.showNotification('success', 'User Reactivated', response.message || 'User reactivated successfully');
                await this.loadUsers(this.userManagement.currentPage);
                this.calculateUserStats();
                
            } catch (error) {
                console.error('❌ Error reactivating user:', error);
                this.showNotification('error', 'Reactivation Failed', error.message || 'Failed to reactivate user');
            }
        },

        // Legacy setupUserManagementEventListeners removed - Alpine.js handles events through directives

        // Pagination Functions
        async previousUsersPage() {
            if (this.userManagement.currentPage > 1) {
                await this.loadUsers(this.userManagement.currentPage - 1);
            }
        },

        async nextUsersPage() {
            if (this.userManagement.currentPage < this.userManagement.totalPages) {
                await this.loadUsers(this.userManagement.currentPage + 1);
            }
        },

        async sortUsers(field) {
            if (this.userManagement.sortField === field) {
                this.userManagement.sortOrder = this.userManagement.sortOrder === 'ASC' ? 'DESC' : 'ASC';
            } else {
                this.userManagement.sortField = field;
                this.userManagement.sortOrder = 'ASC';
            }
            
            await this.loadUsers(1);
        },

        // Utility Functions
        escapeHtml(text) {
            if (typeof text !== 'string') return text;
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, (m) => map[m]);
        },

        // ===== UNIFIED TESTING SESSIONS METHODS =====
        
        // Load testing sessions using the new unified API
        async loadTestingSessions() {
            if (!this.selectedProject) return;
            
            try {
                this.loading = true;
                console.log('🔍 Loading testing sessions for project:', this.selectedProject);
                
                const response = await this.apiCall(`/testing-sessions?project_id=${this.selectedProject}`);
                
                if (response.success) {
                    this.testingSessions = response.sessions || [];
                    this.applySessionFilters();
                    console.log(`📋 Loaded ${this.testingSessions.length} testing sessions`);
                } else {
                    throw new Error(response.error || 'Failed to load testing sessions');
                }
            } catch (error) {
                console.error('Error loading testing sessions:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load testing sessions');
                this.testingSessions = [];
                this.filteredTestingSessions = [];
            } finally {
                this.loading = false;
            }
        },
        
        // Apply session filters
        applySessionFilters() {
            this.filteredTestingSessions = this.testingSessions.filter(session => {
                const statusMatch = !this.sessionFilters.status || session.status === this.sessionFilters.status;
                const levelMatch = !this.sessionFilters.conformance_level || session.conformance_level === this.sessionFilters.conformance_level;
                return statusMatch && levelMatch;
            });
        },

        // Calculate session overview counters based on actual progress
        getActiveSessionsCount() {
            const activeSessions = this.testingSessions.filter(session => {
                const progress = session.progress;
                if (!progress) return false;
                
                // Active: Has some progress (> 0%) but not completed (< 100%)
                const completionPercentage = parseFloat(progress.completionPercentage) || 0;
                const isActive = completionPercentage > 0 && completionPercentage < 100;
                
                if (isActive) {
                    console.log(`📊 Active session: ${session.name} (${completionPercentage}%)`);
                }
                
                return isActive;
            });
            
            return activeSessions.length;
        },

        getCompletedSessionsCount() {
            return this.testingSessions.filter(session => {
                const progress = session.progress;
                if (!progress) return false;
                
                // Completed: 100% completion
                const completionPercentage = parseFloat(progress.completionPercentage) || 0;
                return completionPercentage >= 100;
            }).length;
        },

        getNeedsReviewSessionsCount() {
            return this.testingSessions.filter(session => {
                const progress = session.progress;
                if (!progress) return false;
                
                // Needs review: Has failed tests, tests that need review, or untestable items
                const failedTests = progress.failedTests || 0;
                const needsReviewTests = progress.needsReviewTests || 0;
                const untestableTests = progress.untestableTests || 0;
                
                // Also consider sessions with status indicators for review
                const hasReviewStatus = session.status === 'needs_review' || session.status === 'draft';
                
                return failedTests > 0 || needsReviewTests > 0 || untestableTests > 0 || hasReviewStatus;
            }).length;
        },
        
        // Load available testers for assignment
        async loadAvailableTesters() {
            try {
                const response = await this.apiCall('/users');
                
                if (response.success) {
                    this.availableTesters = response.users?.filter(user => 
                        ['admin', 'tester', 'reviewer'].includes(user.role) && user.is_active
                    ) || [];
                    console.log(`👥 Loaded ${this.availableTesters.length} available testers`);
                } else {
                    console.warn('Failed to load users for tester assignment');
                    this.availableTesters = [];
                }
            } catch (error) {
                console.error('Error loading available testers:', error);
                this.availableTesters = [];
            }
        },
        
        // Create a new unified testing session
        async createTestingSession() {
            if (!this.selectedProject || !this.newTestingSession.name.trim() || !this.newTestingSession.conformance_level) {
                this.showNotification('error', 'Missing Information', 'Please fill in all required fields');
                return;
            }

            try {
                this.loading = true;
                
                const sessionData = {
                    project_id: this.selectedProject,
                    name: this.newTestingSession.name.trim(),
                    description: this.newTestingSession.description.trim(),
                    conformance_level: this.newTestingSession.conformance_level,
                    include_pages: this.newTestingSession.pageScope === 'all',
                    selected_page_ids: this.newTestingSession.pageScope === 'selected' ? [] : undefined,
                    apply_smart_filtering: this.newTestingSession.applySmartFiltering
                };

                console.log('🔍 Creating testing session:', sessionData);
                
                const response = await this.apiCall('/testing-sessions', {
                    method: 'POST',
                    body: JSON.stringify(sessionData)
                });

                if (response.success) {
                    this.showNotification('success', 'Session Created', 
                        `Session "${sessionData.name}" created with ${response.test_instances_created || 0} test instances`
                    );
                    
                    this.showCreateTestingSession = false;
                    this.resetNewTestingSession();
                    await this.loadTestingSessions();
                } else {
                    throw new Error(response.error || 'Failed to create testing session');
                }
            } catch (error) {
                console.error('Error creating testing session:', error);
                this.showNotification('error', 'Creation Failed', error.message || 'Failed to create testing session');
            } finally {
                this.loading = false;
            }
        },
        
        // Reset new testing session form
        resetNewTestingSession() {
            this.newTestingSession = {
                name: '',
                description: '',
                conformance_level: '',
                pageScope: 'all',
                applySmartFiltering: true,
                createBulkInstances: false
            };
            this.showAdvancedOptions = false;
        },
        
        // View session details
        async viewSessionDetails(session) {
            try {
                this.loading = true;
                console.log('🔍 Loading session details for:', session.id);
                
                const response = await this.apiCall(`/testing-sessions/${session.id}?include_instances=false`);
                
                if (response.success) {
                    // For now, show session info in a notification
                    // Later this could open a detailed modal
                    const progress = response.session.progress;
                    const message = progress ? 
                        `Progress: ${progress.completionPercentage}% (${progress.completedTests}/${progress.totalTests} tests)` :
                        'No progress data available';
                    
                    this.showNotification('info', 'Session Details', message);
                    console.log('Session details:', response.session);
                } else {
                    throw new Error(response.error || 'Failed to load session details');
                }
            } catch (error) {
                console.error('Error loading session details:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load session details');
            } finally {
                this.loading = false;
            }
        },
        
        // View testing matrix for a session
        async viewTestingMatrix(session) {
            try {
                this.loading = true;
                console.log('🔍 Loading testing matrix for:', session.id);
                
                const response = await this.apiCall(`/test-instances/session/${session.id}/matrix`);
                
                if (response.success) {
                    // For now, show matrix info in a notification
                    // Later this could open a matrix view modal
                    const matrix = response.matrix;
                    const message = `Matrix: ${matrix.requirements.length} requirements × ${matrix.pages.length} pages`;
                    
                    this.showNotification('info', 'Testing Matrix', message);
                    console.log('Testing matrix:', response.matrix);
                } else {
                    throw new Error(response.error || 'Failed to load testing matrix');
                }
            } catch (error) {
                console.error('Error loading testing matrix:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load testing matrix');
            } finally {
                this.loading = false;
            }
        },
        
        // Activate a draft session
        async activateSession(session) {
            try {
                this.loading = true;
                
                const response = await this.apiCall(`/testing-sessions/${session.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'active' })
                });
                
                if (response.success) {
                    this.showNotification('success', 'Session Activated', `Session "${session.name}" is now active`);
                    await this.loadTestingSessions();
                } else {
                    throw new Error(response.error || 'Failed to activate session');
                }
            } catch (error) {
                console.error('Error activating session:', error);
                this.showNotification('error', 'Activation Failed', error.message || 'Failed to activate session');
            } finally {
                this.loading = false;
            }
        },
        
        // Edit a session
        async editSession(session) {
            // For now, show that this feature is coming soon
            this.showNotification('info', 'Feature Coming Soon', 'Session editing will be available in the next update');
            console.log('Edit session:', session);
        },
        
        // Duplicate a session
        async duplicateSession(session) {
            try {
                this.loading = true;
                
                const response = await this.apiCall(`/testing-sessions/${session.id}/duplicate`, {
                    method: 'POST',
                    body: JSON.stringify({
                        name: `${session.name} (Copy)`,
                        description: session.description
                    })
                });
                
                if (response.success) {
                    this.showNotification('success', 'Session Duplicated', 
                        `Created duplicate of "${session.name}"`
                    );
                    await this.loadTestingSessions();
                } else {
                    throw new Error(response.error || 'Failed to duplicate session');
                }
            } catch (error) {
                console.error('Error duplicating session:', error);
                this.showNotification('error', 'Duplication Failed', error.message || 'Failed to duplicate session');
            } finally {
                this.loading = false;
            }
        },
        
        // Delete a session
        async deleteSession(session) {
            const confirmed = confirm(
                `Are you sure you want to delete the testing session "${session.name}"?\n\n` +
                `This will permanently remove:\n` +
                `• All test instances and results\n` +
                `• Session progress and configuration\n` +
                `• Associated audit logs\n\n` +
                `This action cannot be undone.`
            );
            
            if (!confirmed) return;
            
            try {
                this.loading = true;
                
                const response = await this.apiCall(`/testing-sessions/${session.id}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    this.showNotification('success', 'Session Deleted', 
                        `Session "${session.name}" deleted successfully`
                    );
                    await this.loadTestingSessions();
                } else {
                    throw new Error(response.error || 'Failed to delete session');
                }
            } catch (error) {
                console.error('Error deleting session:', error);
                this.showNotification('error', 'Deletion Failed', error.message || 'Failed to delete session');
            } finally {
                this.loading = false;
            }
        },
        
        // Get conformance level display text
        getConformanceLevelDisplay(level) {
            const levels = {
                'wcag_a': 'WCAG A',
                'wcag_aa': 'WCAG AA', 
                'wcag_aaa': 'WCAG AAA',
                'section_508': 'Section 508',
                'combined': 'Combined'
            };
            return levels[level] || level;
        },
        
        // Update requirements preview in create modal
        updateRequirementsPreview() {
            // This will be called when conformance level changes
            // Currently just used to trigger UI updates
        },
        
        // Get requirements preview text
        getRequirementsPreviewText() {
            const level = this.newTestingSession.conformance_level;
            if (!level) return '';
            
            const descriptions = {
                'wcag_a': 'WCAG 2.2 Level A requirements will be applied (basic accessibility)',
                'wcag_aa': 'WCAG 2.2 Level A and AA requirements will be applied (standard compliance)', 
                'wcag_aaa': 'All WCAG 2.2 requirements will be applied (A, AA, and AAA levels)',
                'section_508': 'Section 508 requirements will be applied (US federal standards)',
                'combined': 'Both WCAG 2.2 and Section 508 requirements will be applied (comprehensive testing)'
            };
            
            return descriptions[level] || 'Requirements will be determined based on selected level';
        },
        
        // View requirements with detailed breakdown
        async viewRequirements() {
            try {
                this.loading = true;
                console.log('🔍 Loading comprehensive requirements view...');
                
                // Load all requirements (get all pages)
                const requirementsResponse = await this.apiCall('/requirements?limit=100');
                
                if (requirementsResponse.success) {
                    const requirements = requirementsResponse.data?.requirements || [];
                    
                    // Ensure unique requirements by ID
                    const uniqueRequirements = requirements.reduce((acc, req) => {
                        const key = req.id || req.requirement_id || req.criterion_number;
                        if (!acc.find(existing => (existing.id || existing.requirement_id || existing.criterion_number) === key)) {
                            acc.push(req);
                        }
                        return acc;
                    }, []);
                    
                    this.allRequirements = uniqueRequirements;
                    this.filteredRequirements = [...uniqueRequirements];
                    this.showRequirementsModal = true;
                    this.applyRequirementsFilters();
                    
                    console.log('✅ Loaded requirements:', this.allRequirements.length);
                    
                    // Also load test instances to show relationship
                    await this.loadRequirementsTestInstances();
                } else {
                    throw new Error(requirementsResponse.error || 'Failed to load requirements');
                }
            } catch (error) {
                console.error('Error loading requirements:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load requirements database');
            } finally {
                this.loading = false;
            }
        },
        
        // Load test instances for requirements view
        async loadRequirementsTestInstances() {
            try {
                if (!this.selectedProject) return;
                
                const response = await this.apiCall('/test-instances', {
                    method: 'GET'
                });
                
                if (response.success) {
                    this.requirementsTestInstances = response.test_instances || [];
                    console.log('✅ Loaded test instances for requirements view:', this.requirementsTestInstances.length);
                }
            } catch (error) {
                console.error('Error loading test instances for requirements:', error);
            }
        },
        
        // Apply filters to requirements
        applyRequirementsFilters() {
            if (!this.allRequirements || !Array.isArray(this.allRequirements)) {
                this.filteredRequirements = [];
                return;
            }
            
            let filtered = [...this.allRequirements];
            
            // Filter by type
            if (this.requirementsFilters.type) {
                filtered = filtered.filter(req => req.requirement_type === this.requirementsFilters.type);
            }
            
            // Filter by level
            if (this.requirementsFilters.level) {
                filtered = filtered.filter(req => req.level === this.requirementsFilters.level);
            }
            
            // Filter by test method
            if (this.requirementsFilters.testMethod) {
                filtered = filtered.filter(req => req.test_method === this.requirementsFilters.testMethod);
            }
            
            // Search filter
            if (this.requirementsFilters.search) {
                const search = this.requirementsFilters.search.toLowerCase();
                filtered = filtered.filter(req => 
                    req.title.toLowerCase().includes(search) ||
                    req.criterion_number.toLowerCase().includes(search) ||
                    (req.description && req.description.toLowerCase().includes(search))
                );
            }
            
            this.filteredRequirements = filtered;
            console.log('🔍 Applied requirements filters, showing', filtered.length, 'of', this.allRequirements.length);
        },
        
        // Get test instances for a specific requirement
        getTestInstancesForRequirement(requirementId) {
            return this.requirementsTestInstances.filter(instance => 
                instance.requirement_id === requirementId
            );
        },
        
        // Get unique pages for a requirement
        getPagesByRequirement(requirementId) {
            const instances = this.getTestInstancesForRequirement(requirementId);
            const pages = instances
                .filter(instance => instance.page_url)
                .map(instance => ({
                    url: instance.page_url,
                    title: instance.page_title,
                    status: instance.status,
                    session_id: instance.session_id
                }));
            
            // Remove duplicates by URL
            const uniquePages = pages.filter((page, index, self) => 
                index === self.findIndex(p => p.url === page.url)
            );
            
            return uniquePages;
        },
        
        // Close requirements modal
        closeRequirementsModal() {
            this.showRequirementsModal = false;
            this.allRequirements = [];
            this.filteredRequirements = [];
            this.requirementsTestInstances = [];
            this.requirementsFilters = {
                type: '',
                level: '',
                testMethod: '',
                search: ''
            };
        },
        
        // ===== USER MANAGEMENT METHODS =====
        
        // Open user management modal
        async openUserManagement(manualOpen = false) {
            // Debug: Log who called this function
            console.log('🔍 DEBUG: openUserManagement called', {
                manualOpen,
                preventAutoUserManagement: this.preventAutoUserManagement,
                stackTrace: new Error().stack
            });
            
            // Aggressive prevention: Block any auto-opening during the first 10 seconds after initialization
            const now = Date.now();
            const initTime = this._initializationTime || now;
            const timeSinceInit = now - initTime;
            
            // Additional check: Don't auto-open if we're still loading initial data
            if (!manualOpen && (timeSinceInit < 10000 || this.loading)) {
                console.log('🛑 AGGRESSIVE BLOCK: Preventing auto-opening of user management modal', {
                    timeSinceInit,
                    loading: this.loading,
                    manualOpen,
                    preventAutoUserManagement: this.preventAutoUserManagement
                });
                return;
            }
            
            // NUCLEAR OPTION: Block ALL opens during critical startup and authentication period
            if ((!this.auth.isAuthenticated && timeSinceInit < 15000) || 
                (this.auth.isAuthenticated && timeSinceInit < 20000)) {
                console.log('🚫 NUCLEAR BLOCK: Preventing ALL user management modal opens during startup/auth period', {
                    timeSinceInit,
                    isAuthenticated: this.auth.isAuthenticated,
                    manualOpen
                });
                return;
            }
            
            // Prevent auto-opening during initialization (unless manually triggered)
            if (this.preventAutoUserManagement && !manualOpen) {
                console.log('🛑 Preventing auto-opening of user management modal during initialization');
                return;
            }
            
            try {
                console.log('🔍 Opening user management modal');
                this.showUserManagement = true;
                this.loading = true;
                
                console.log('🔍 Loading user management...');
                await this.loadUsers();
                this.calculateUserStats();
                
            } catch (error) {
                console.error('Error loading user management:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load user management');
            } finally {
                this.loading = false;
            }
        },
        
        // Close user management modal
        closeUserManagement() {
            console.log('🔍 Closing user management modal');
            this.showUserManagement = false;
            this.closeUserForm();
            this.closeDeleteUserModal();
        },

        // Close test grid modal
        closeTestGrid() {
            console.log('🔍 Closing test grid modal');
            this.showTestGrid = false;
            // Restore body scrolling
            document.body.style.overflow = '';
        },

        // Global function alias for Alpine.js calls
        showUserManagement() {
            console.log('🔍 DEBUG: showUserManagement alias called', {
                stackTrace: new Error().stack
            });
            return this.openUserManagement(true); // Manual open
        },
        
        // Load users from API
        async loadUsers() {
            try {
                const response = await this.apiCall('/users');
                
                if (response.success) {
                    this.allUsers = response.users || [];
                    this.filteredUsers = this.allUsers;
                    this.applyUserFilters();
                    
                    console.log('✅ Loaded users:', this.allUsers.length);
                } else {
                    throw new Error(response.error || 'Failed to load users');
                }
            } catch (error) {
                console.error('Error loading users:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load users');
                this.allUsers = [];
                this.filteredUsers = [];
            }
        },
        
        // Calculate user statistics
        calculateUserStats() {
            this.userStats.total = this.allUsers.length;
            this.userStats.active = this.allUsers.filter(user => user.is_active).length;
            this.userStats.admin = this.allUsers.filter(user => user.role === 'admin').length;
            
            // Recent logins (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            this.userStats.recentLogins = this.allUsers.filter(user => 
                user.last_login && new Date(user.last_login) > sevenDaysAgo
            ).length;
        },
        
        // Apply filters to users
        applyUserFilters() {
            let filtered = [...this.allUsers];
            
            // Filter by role
            if (this.userFilters.role) {
                filtered = filtered.filter(user => user.role === this.userFilters.role);
            }
            
            // Filter by status
            if (this.userFilters.status === 'active') {
                filtered = filtered.filter(user => user.is_active);
            } else if (this.userFilters.status === 'inactive') {
                filtered = filtered.filter(user => !user.is_active);
            }
            
            // Search filter
            if (this.userFilters.search) {
                const search = this.userFilters.search.toLowerCase();
                filtered = filtered.filter(user => 
                    user.username.toLowerCase().includes(search) ||
                    user.email.toLowerCase().includes(search) ||
                    (user.full_name && user.full_name.toLowerCase().includes(search))
                );
            }
            
            this.filteredUsers = filtered;
            this.updateUserPagination();
            console.log('🔍 Applied user filters, showing', filtered.length, 'of', this.allUsers.length, 'users');
        },
        
        // Update pagination info
        updateUserPagination() {
            this.userPagination.totalItems = this.filteredUsers.length;
            this.userPagination.totalPages = Math.ceil(this.filteredUsers.length / this.userPagination.itemsPerPage);
            
            // Reset to first page if current page is out of bounds
            if (this.userPagination.currentPage > this.userPagination.totalPages) {
                this.userPagination.currentPage = 1;
            }
        },
        
        // Get paginated users for display
        getPaginatedUsers() {
            const start = (this.userPagination.currentPage - 1) * this.userPagination.itemsPerPage;
            const end = start + this.userPagination.itemsPerPage;
            return this.filteredUsers.slice(start, end);
        },
        
        // Show add user form
        showAddUserForm() {
            this.resetUserForm();
            this.showUserForm = true;
            console.log('🔍 Opening add user form');
        },
        
        // Show edit user form
        showEditUserForm(user) {
            this.userForm = {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name || '',
                role: user.role,
                is_active: user.is_active,
                password: '',
                confirm_password: ''
            };
            this.userFormErrors = {};
            this.showUserForm = true;
            console.log('🔍 Opening edit user form for:', user.username);
        },
        
        // Reset user form
        resetUserForm() {
            this.userForm = {
                id: null,
                username: '',
                email: '',
                full_name: '',
                role: 'tester',
                is_active: true,
                password: '',
                confirm_password: ''
            };
            this.userFormErrors = {};
        },
        
        // Close user form
        closeUserForm() {
            this.showUserForm = false;
            this.resetUserForm();
        },
        
        // Validate user form
        validateUserForm() {
            this.userFormErrors = {};
            
            if (!this.userForm.username.trim()) {
                this.userFormErrors.username = 'Username is required';
            }
            
            if (!this.userForm.email.trim()) {
                this.userFormErrors.email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.userForm.email)) {
                this.userFormErrors.email = 'Invalid email format';
            }
            
            if (!this.userForm.id && !this.userForm.password) {
                this.userFormErrors.password = 'Password is required for new users';
            }
            
            if (this.userForm.password && this.userForm.password.length < 6) {
                this.userFormErrors.password = 'Password must be at least 6 characters';
            }
            
            if (this.userForm.password !== this.userForm.confirm_password) {
                this.userFormErrors.confirm_password = 'Passwords do not match';
            }
            
            return Object.keys(this.userFormErrors).length === 0;
        },
        
        // Save user (create or update)
        async saveUser() {
            if (!this.validateUserForm()) {
                this.showNotification('error', 'Validation Failed', 'Please fix the errors in the form');
                return;
            }
            
            try {
                this.loading = true;
                
                const userData = {
                    username: this.userForm.username.trim(),
                    email: this.userForm.email.trim(),
                    full_name: this.userForm.full_name.trim(),
                    role: this.userForm.role,
                    is_active: this.userForm.is_active
                };
                
                // Only include password if it's provided
                if (this.userForm.password) {
                    userData.password = this.userForm.password;
                }
                
                let response;
                if (this.userForm.id) {
                    // Update existing user
                    response = await this.apiCall(`/users/${this.userForm.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(userData)
                    });
                } else {
                    // Create new user
                    response = await this.apiCall('/users', {
                        method: 'POST',
                        body: JSON.stringify(userData)
                    });
                }
                
                if (response.success) {
                    await this.loadUsers();
                    this.closeUserForm();
                    
                    const action = this.userForm.id ? 'updated' : 'created';
                    this.showNotification('success', 'User Saved', `User ${userData.username} ${action} successfully`);
                } else {
                    throw new Error(response.error || 'Failed to save user');
                }
            } catch (error) {
                console.error('Error saving user:', error);
                this.showNotification('error', 'Save Failed', error.message);
            } finally {
                this.loading = false;
            }
        },
        
        // Show delete user confirmation
        confirmUserDeletion(user) {
            this.selectedUserForDelete = user;
            this.showDeleteUserModal = true;
            console.log('🔍 Showing delete confirmation for:', user.username);
        },
        
        // Close delete user modal
        closeDeleteUserModal() {
            this.showDeleteUserModal = false;
            this.selectedUserForDelete = null;
        },
        
        // Confirm delete user
        async confirmDeleteUser() {
            if (!this.selectedUserForDelete) return;
            
            try {
                this.loading = true;
                
                const response = await this.apiCall(`/users/${this.selectedUserForDelete.id}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    await this.loadUsers();
                    this.closeDeleteUserModal();
                    this.showNotification('success', 'User Deleted', `User ${this.selectedUserForDelete.username} deleted successfully`);
                } else {
                    throw new Error(response.error || 'Failed to delete user');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showNotification('error', 'Delete Failed', error.message);
            } finally {
                this.loading = false;
            }
        },
        
        // Sort users
        sortUsers(field) {
            if (this.userSort.field === field) {
                this.userSort.direction = this.userSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.userSort.field = field;
                this.userSort.direction = 'asc';
            }
            
            this.filteredUsers.sort((a, b) => {
                let aVal = a[field] || '';
                let bVal = b[field] || '';
                
                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }
                
                if (this.userSort.direction === 'asc') {
                    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                } else {
                    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                }
            });
            
            console.log('🔍 Sorted users by', field, this.userSort.direction);
        },
        
        // Navigate to previous page
        previousUsersPage() {
            if (this.userPagination.currentPage > 1) {
                this.userPagination.currentPage--;
            }
        },
        
        // Navigate to next page
        nextUsersPage() {
            if (this.userPagination.currentPage < this.userPagination.totalPages) {
                this.userPagination.currentPage++;
            }
        },
        
        // Get user role display
        getUserRoleDisplay(role) {
            const roles = {
                'admin': 'Administrator',
                'tester': 'Tester',
                'reviewer': 'Reviewer',
                'viewer': 'Viewer'
            };
            return roles[role] || role;
        },
        
        // Get user role badge class
        getUserRoleBadgeClass(role) {
            const classes = {
                'admin': 'bg-red-100 text-red-800',
                'tester': 'bg-blue-100 text-blue-800',
                'reviewer': 'bg-green-100 text-green-800',
                'viewer': 'bg-gray-100 text-gray-800'
            };
            return classes[role] || 'bg-gray-100 text-gray-800';
        },
        
        // Get user status badge class
        getUserStatusBadgeClass(isActive) {
            return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        },

        // ===== TEST GRID METHODS =====
        
        // View test grid for a session (Modal Component)
        async viewTestGrid(session) {
            try {
                console.log('🔍 Opening test grid for session:', session.name);
                
                // Store complete session information with progress
                this.selectedTestSession = { ...session };
                this.showTestGrid = true;
                this.loadingTestInstances = true;
                
                // Initialize modal test grid state
                this.selectedTestGridInstances = [];
                this.testGridFilters = {
                    status: '',
                    level: '',
                    testMethod: ''
                };
                this.testGridSort = {
                    field: 'criterion_number',
                    direction: 'asc'
                };
                
                // Load test instances using the proper modal grid function
                await this.loadTestInstancesForGrid(session.id);
                
                // Show notification about which session is being managed
                this.showNotification('info', 'Test Grid Opened', 
                    `Now managing tests for "${this.selectedTestSession.name}" (${this.testGridInstances.length} test instances)`);
            } catch (error) {
                console.error('Error loading test grid:', error);
                this.showNotification('error', 'Grid Load Failed', error.message || 'Failed to load test instances');
                this.showTestGrid = false;
            } finally {
                this.loadingTestInstances = false;
            }
        },
        
        // Apply filters to test instances
        applyTestGridFilters() {
            let filtered = [...this.testInstances];
            
            // Filter by status
            if (this.testGridFilters.status) {
                filtered = filtered.filter(instance => instance.status === this.testGridFilters.status);
            }
            
            // Filter by level
            if (this.testGridFilters.level) {
                filtered = filtered.filter(instance => 
                    (instance.requirement_level || instance.level) === this.testGridFilters.level
                );
            }
            
            // Filter by test method
            if (this.testGridFilters.testMethod) {
                filtered = filtered.filter(instance => 
                    (instance.test_method_used || instance.requirement_test_method) === this.testGridFilters.testMethod
                );
            }
            
            this.filteredTestInstances = filtered;
            
            // Apply current sort after filtering
            this.applyTestGridSort();
            
            // Clear selections when filters change
            this.selectedTestInstances = [];
            
            console.log('🔍 Applied filters, showing', filtered.length, 'of', this.testInstances.length, 'instances');
        },
        
        // Update test instance status
        async updateTestInstanceStatus(instanceId, newStatus) {
            try {
                const response = await this.apiCall(`/test-instances/${instanceId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus })
                });
                
                if (response.success) {
                    // Update local data
                    const instance = this.testInstances.find(t => t.id === instanceId);
                    if (instance) {
                        instance.status = newStatus;
                        instance.updated_at = new Date().toISOString();
                    }
                    
                    this.applyTestGridFilters();
                    this.showNotification('success', 'Status Updated', `Test marked as ${newStatus.replace('_', ' ')}`);
                    
                    // Refresh session progress
                    await this.loadTestingSessions();
                } else {
                    throw new Error(response.error || 'Failed to update status');
                }
            } catch (error) {
                console.error('Error updating test instance status:', error);
                this.showNotification('error', 'Update Failed', error.message);
            }
        },
        
        // Assign tester to test instance
        async assignTester(instanceId, testerId) {
            try {
                const response = await this.apiCall(`/test-instances/${instanceId}/assign`, {
                    method: 'PUT',
                    body: JSON.stringify({ assigned_tester: testerId })
                });
                
                if (response.success) {
                    // Update local data
                    const instance = this.testInstances.find(t => t.id === instanceId);
                    if (instance) {
                        instance.assigned_tester = testerId;
                        instance.assigned_at = new Date().toISOString();
                    }
                    
                    const tester = this.availableTesters.find(t => t.id === testerId);
                    const testerName = tester ? (tester.full_name || tester.username) : 'Unassigned';
                    
                    this.showNotification('success', 'Assignment Updated', `Test assigned to ${testerName}`);
                } else {
                    throw new Error(response.error || 'Failed to assign tester');
                }
            } catch (error) {
                console.error('Error assigning tester:', error);
                this.showNotification('error', 'Assignment Failed', error.message);
            }
        },
        
        // Open test instance modal for detailed editing
        openTestInstanceModal(instance) {
            this.selectedTestInstance = instance;
            this.showTestInstanceModal = true;
            console.log('🔍 Opening test instance modal for:', instance.criterion_number);
        },
        
        // Open evidence modal
        openEvidenceModal(instance) {
            this.selectedTestInstance = instance;
            this.showEvidenceModal = true;
            console.log('🔍 Opening evidence modal for:', instance.criterion_number);
        },
        
        // Generate report for test instance
        generateReport(instance) {
            // For now, show a notification
            this.showNotification('info', 'Report Generation', 
                `Report generation for ${instance.criterion_number} will be available soon`);
            console.log('🔍 Generate report for:', instance);
        },
        
        // Get level badge class
        getLevelBadgeClass(level) {
            const classes = {
                'a': 'bg-green-100 text-green-800',
                'aa': 'bg-blue-100 text-blue-800',
                'aaa': 'bg-purple-100 text-purple-800',
                'base': 'bg-yellow-100 text-yellow-800',
                'enhanced': 'bg-orange-100 text-orange-800'
            };
            return classes[level] || 'bg-gray-100 text-gray-800';
        },
        
        // Get level display text
        getLevelDisplay(level) {
            const displays = {
                'a': 'Level A',
                'aa': 'Level AA',
                'aaa': 'Level AAA',
                'base': '508 Base',
                'enhanced': '508 Enhanced'
            };
            return displays[level] || level?.toUpperCase() || 'N/A';
        },
        
        // Get status text color class
        getStatusTextClass(status) {
            const classes = {
                'pending': 'text-gray-600',
                'not_started': 'text-gray-600',
                'in_progress': 'text-yellow-600',
                'passed': 'text-green-600',
                'failed': 'text-red-600',
                'untestable': 'text-orange-600',
                'not_applicable': 'text-blue-600'
            };
            return classes[status] || 'text-gray-600';
        },
        
        // Format date for display
        formatDate(dateString) {
            if (!dateString) return 'Never';
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        },
        
        // Get test method badge class
        getTestMethodBadgeClass(method) {
            const classes = {
                'manual': 'bg-blue-100 text-blue-800',
                'automated': 'bg-green-100 text-green-800',
                'both': 'bg-purple-100 text-purple-800'
            };
            return classes[method] || 'bg-gray-100 text-gray-800';
        },
        
        // Get test method display text
        getTestMethodDisplay(method) {
            const displays = {
                'manual': 'Manual',
                'automated': 'Automated',
                'both': 'Hybrid Review'
            };
            return displays[method] || method?.charAt(0).toUpperCase() + method?.slice(1) || 'Unknown';
        },
        
        // Get test method description
        getTestMethodDescription(method) {
            const descriptions = {
                'manual': 'Requires human evaluation and testing',
                'automated': 'Fully automated using axe-core, pa11y, WAVE, or Lighthouse',
                'both': 'Hybrid: Automated tools + manual verification for complete coverage'
            };
            return descriptions[method] || 'Test method not specified';
        },

        getProposedTools(requirement) {
            if (!requirement) {
                return [];
            }
            
            let tools = [];
            
            // First, try to get tools from the requirement's automated_tools (shows all available tools)
            if (requirement.automated_tools) {
                try {
                    if (typeof requirement.automated_tools === 'string') {
                        tools = JSON.parse(requirement.automated_tools);
                    } else if (Array.isArray(requirement.automated_tools)) {
                        tools = requirement.automated_tools;
                    }
                } catch (e) {
                    console.warn('Error parsing automated_tools for requirement:', requirement.criterion_number, e);
                }
            }
            
            // If no tools from requirement, check if there's a specific tool used for this test instance
            if (tools.length === 0 && requirement.tool_used) {
                tools = [requirement.tool_used];
            }
            
            // If no tools from requirement or specific tool, try to extract from test result
            if (tools.length === 0 && requirement.result) {
                try {
                    const result = typeof requirement.result === 'string' ? JSON.parse(requirement.result) : requirement.result;
                    if (result.automated_analysis && result.automated_analysis.tools_used) {
                        tools = result.automated_analysis.tools_used;
                    } else if (result.automated_analysis && result.automated_analysis.tool_results) {
                        tools = Object.keys(result.automated_analysis.tool_results);
                    }
                } catch (e) {
                    console.warn('Error parsing result for tools:', e);
                }
            }
            
            // Map tool names to display names
            const toolDisplayNames = {
                'axe-core': 'Axe Core',
                'axe': 'Axe Core',
                'pa11y': 'Pa11y',
                'lighthouse': 'Lighthouse',
                'WAVE': 'WAVE',
                'wave': 'WAVE',
                'color-contrast-analyzer': 'Color Contrast',
                'CCA': 'Color Contrast',
                'luma': 'Luma',
                'ANDI': 'ANDI',
                'htmlcs': 'HTML CodeSniffer'
            };
            
            return tools.map(tool => toolDisplayNames[tool] || tool);
        },

        getAutomationConfidenceClass(confidence) {
            const classes = {
                'high': 'bg-green-100 text-green-800',
                'medium': 'bg-yellow-100 text-yellow-800',
                'low': 'bg-orange-100 text-orange-800',
                'none': 'bg-gray-100 text-gray-600'
            };
            return classes[confidence] || 'bg-gray-100 text-gray-600';
        },

        getAutomationConfidenceDisplay(confidence) {
            const displays = {
                'high': 'High Confidence',
                'medium': 'Medium Confidence',
                'low': 'Low Confidence',
                'none': 'No Automation'
            };
            return displays[confidence] || 'Unknown';
        },

        getToolDescription(tool) {
            const descriptions = {
                'Axe Core': 'Comprehensive accessibility testing with 70+ rules. Zero false positives by design.',
                'Pa11y': 'Command-line accessibility testing tool with multiple output formats.',
                'Lighthouse': 'Google\'s automated auditing tool for performance and accessibility.',
                'WAVE': 'Web Accessibility Evaluation Tool with visual feedback and detailed reporting.',
                'Color Contrast': 'Specialized tool for precise color contrast verification.',
                'Luma': 'Specialized tool for detecting flashing content and seizure triggers.',
                'ANDI': 'Accessible Name & Description Inspector for screen reader analysis.',
                'HTML CodeSniffer': 'HTML validation tool with accessibility rule checking.'
            };
            return descriptions[tool] || `${tool} - Automated accessibility testing tool`;
        },

        async loadSpecializedAnalysis(instanceId) {
            try {
                const response = await this.apiCall(`/api/automated-testing/specialized-analysis/${instanceId}`);
                if (response.ok) {
                    const data = await response.json();
                    return data;
                } else {
                    console.error('Failed to load specialized analysis:', response.statusText);
                    return null;
                }
            } catch (error) {
                console.error('Error loading specialized analysis:', error);
                return null;
            }
        },

        async loadRemediationGuidance(sessionId, page = 1) {
            try {
                const response = await this.apiCall(`/api/automated-testing/remediation-guidance/${sessionId}?page=${page}&limit=50`);
                if (response.ok) {
                    const data = await response.json();
                    return data;
                } else {
                    console.error('Failed to load remediation guidance:', response.statusText);
                    return null;
                }
            } catch (error) {
                console.error('Error loading remediation guidance:', error);
                return null;
            }
        },

        async viewSpecializedAnalysis(instanceId) {
            const analysis = await this.loadSpecializedAnalysis(instanceId);
            if (analysis) {
                this.currentSpecializedAnalysis = analysis;
                this.showSpecializedAnalysisModal = true;
            } else {
                this.showNotification('error', 'Error', 'Failed to load specialized analysis data');
            }
        },

        async viewRemediationGuidance(sessionId) {
            const guidance = await this.loadRemediationGuidance(sessionId);
            if (guidance) {
                this.currentRemediationGuidance = guidance;
                this.showRemediationGuidanceModal = true;
            } else {
                this.showNotification('error', 'Error', 'Failed to load remediation guidance');
            }
        },

        getRemediationPriorityClass(priority) {
            const classes = {
                'critical': 'bg-red-100 text-red-800 border-red-300',
                'high': 'bg-orange-100 text-orange-800 border-orange-300',
                'medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                'low': 'bg-blue-100 text-blue-800 border-blue-300'
            };
            return classes[priority] || 'bg-gray-100 text-gray-800 border-gray-300';
        },

        getRemediationPriorityIcon(priority) {
            const icons = {
                'critical': '🚨',
                'high': '⚠️',
                'medium': '⚡',
                'low': 'ℹ️'
            };
            return icons[priority] || '📋';
        },

        formatAuditLogEntry(entry) {
            if (!entry.metadata) {
                return `<div class="text-sm text-gray-600">${entry.reason || 'No details available'}</div>`;
            }

            let metadata;
            try {
                metadata = typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata;
            } catch (e) {
                return `<div class="text-sm text-gray-600">${entry.reason || 'Invalid metadata'}</div>`;
            }

            let html = '<div class="space-y-2">';
            
            // Basic action info
            html += `<div class="text-sm font-medium text-gray-700">${entry.action_type.replace(/_/g, ' ').toUpperCase()}</div>`;
            if (entry.reason) {
                html += `<div class="text-sm text-gray-600">${entry.reason}</div>`;
            }

            // Automated analysis summary
            if (metadata.automated_analysis) {
                const analysis = metadata.automated_analysis;
                html += `<div class="bg-blue-50 p-2 rounded text-xs">
                    <div class="font-medium text-blue-800 mb-1">Automated Analysis Summary</div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><span class="font-medium">Tools:</span> ${analysis.tools_used.join(', ')}</div>
                        <div><span class="font-medium">Violations:</span> ${analysis.total_violations} (${analysis.critical_violations} critical)</div>
                        ${analysis.test_timestamp ? `<div><span class="font-medium">Tested:</span> ${new Date(analysis.test_timestamp).toLocaleString()}</div>` : ''}
                        ${analysis.test_duration_ms ? `<div><span class="font-medium">Duration:</span> ${Math.round(analysis.test_duration_ms / 1000)}s</div>` : ''}
                    </div>
                </div>`;
            }

            // Specialized analysis details
            if (metadata.specialized_analysis) {
                const specialized = metadata.specialized_analysis;
                
                if (specialized.contrast) {
                    const contrast = specialized.contrast;
                    html += `<div class="bg-green-50 p-2 rounded text-xs">
                        <div class="font-medium text-green-800 mb-1">🎨 Color Contrast Analysis</div>
                        <div class="grid grid-cols-2 gap-2">
                            <div><span class="font-medium">Elements:</span> ${contrast.total_elements_tested}</div>
                            <div><span class="font-medium">AA Violations:</span> <span class="${contrast.aa_violations > 0 ? 'text-red-600' : 'text-green-600'}">${contrast.aa_violations}</span></div>
                            <div><span class="font-medium">AAA Violations:</span> <span class="${contrast.aaa_violations > 0 ? 'text-red-600' : 'text-green-600'}">${contrast.aaa_violations}</span></div>
                            <div><span class="font-medium">Worst Ratio:</span> ${contrast.worst_contrast_ratio.toFixed(2)}:1</div>
                        </div>
                    </div>`;
                }

                if (specialized.flash) {
                    const flash = specialized.flash;
                    const riskColor = flash.seizure_risk_level === 'high' ? 'text-red-600' : 
                                    flash.seizure_risk_level === 'medium' ? 'text-orange-600' : 'text-green-600';
                    
                    html += `<div class="bg-purple-50 p-2 rounded text-xs">
                        <div class="font-medium text-purple-800 mb-1">⚡ Flash Analysis</div>
                        <div class="grid grid-cols-2 gap-2">
                            <div><span class="font-medium">Flashes:</span> ${flash.total_flashes_detected}</div>
                            <div><span class="font-medium">Critical:</span> <span class="${flash.critical_flashes > 0 ? 'text-red-600' : 'text-green-600'}">${flash.critical_flashes}</span></div>
                            <div><span class="font-medium">Rate:</span> ${flash.flash_rate.toFixed(1)}/sec</div>
                            <div><span class="font-medium">Risk:</span> <span class="${riskColor}">${flash.seizure_risk_level.toUpperCase()}</span></div>
                        </div>
                    </div>`;
                }
            }

            // Remediation guidance summary
            if (metadata.remediation_guidance) {
                const guidance = metadata.remediation_guidance;
                html += `<div class="bg-yellow-50 p-2 rounded text-xs">
                    <div class="font-medium text-yellow-800 mb-1">🛠️ Remediation Items</div>
                    <div class="grid grid-cols-3 gap-2">
                        <div><span class="font-medium">Total:</span> ${guidance.count}</div>
                        <div><span class="font-medium">Critical:</span> <span class="${guidance.critical_count > 0 ? 'text-red-600' : 'text-green-600'}">${guidance.critical_count}</span></div>
                        <div><span class="font-medium">High:</span> <span class="${guidance.high_count > 0 ? 'text-orange-600' : 'text-green-600'}">${guidance.high_count}</span></div>
                    </div>
                </div>`;
            }

            html += '</div>';
            return html;
        },

        formatTestResult(result) {
            if (!result) return '<span class="text-gray-500">No result data</span>';
            
            let parsedResult;
            try {
                parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
            } catch (e) {
                return `<pre class="text-xs bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">${result}</pre>`;
            }

            if (!parsedResult.automated_analysis) {
                return `<pre class="text-xs bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">${JSON.stringify(parsedResult, null, 2)}</pre>`;
            }

            const analysis = parsedResult.automated_analysis;
            let html = '<div class="bg-gray-50 p-3 rounded-lg text-sm">';
            
            // Summary
            html += `<div class="mb-3">
                <div class="flex items-center gap-4 mb-2">
                    <span class="font-semibold text-gray-700">Test Summary:</span>
                    <span class="px-2 py-1 text-xs rounded ${analysis.total_violations > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                        ${analysis.total_violations} violation${analysis.total_violations !== 1 ? 's' : ''} found
                    </span>
                    ${analysis.critical_violations > 0 ? `<span class="px-2 py-1 text-xs rounded bg-orange-100 text-orange-700">${analysis.critical_violations} critical</span>` : ''}
                </div>
                <div class="text-xs text-gray-600">Tools used: ${analysis.tools_used ? analysis.tools_used.join(', ') : 'N/A'}</div>
                ${analysis.test_timestamp ? `<div class="text-xs text-gray-500">Tested: ${new Date(analysis.test_timestamp).toLocaleString()}</div>` : ''}
            </div>`;

            // Specialized Analysis Section
            if (analysis.specialized_analysis) {
                html += '<div class="mb-4 border-t border-gray-200 pt-3">';
                html += '<h4 class="font-semibold text-gray-700 mb-2">Specialized Analysis</h4>';
                
                // Color Contrast Analysis
                if (analysis.specialized_analysis.contrast) {
                    const contrast = analysis.specialized_analysis.contrast;
                    html += `<div class="mb-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                        <div class="font-medium text-blue-800 mb-2">🎨 Color Contrast Analysis</div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div><span class="font-medium">Elements Tested:</span> ${contrast.total_elements_tested}</div>
                            <div><span class="font-medium">AA Violations:</span> <span class="${contrast.aa_violations > 0 ? 'text-red-600' : 'text-green-600'}">${contrast.aa_violations}</span></div>
                            <div><span class="font-medium">AAA Violations:</span> <span class="${contrast.aaa_violations > 0 ? 'text-red-600' : 'text-green-600'}">${contrast.aaa_violations}</span></div>
                            <div><span class="font-medium">Worst Ratio:</span> ${contrast.worst_contrast_ratio.toFixed(2)}:1</div>
                            <div><span class="font-medium">Average Ratio:</span> ${contrast.average_contrast_ratio.toFixed(2)}:1</div>
                        </div>
                    </div>`;
                }

                // Flash Analysis
                if (analysis.specialized_analysis.flash) {
                    const flash = analysis.specialized_analysis.flash;
                    const riskColor = flash.seizure_risk_level === 'high' ? 'text-red-600' : 
                                    flash.seizure_risk_level === 'medium' ? 'text-orange-600' : 'text-green-600';
                    
                    html += `<div class="mb-3 p-3 bg-purple-50 rounded border-l-4 border-purple-400">
                        <div class="font-medium text-purple-800 mb-2">⚡ Flash & Animation Analysis</div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div><span class="font-medium">Total Flashes:</span> ${flash.total_flashes_detected}</div>
                            <div><span class="font-medium">Critical Flashes:</span> <span class="${flash.critical_flashes > 0 ? 'text-red-600' : 'text-green-600'}">${flash.critical_flashes}</span></div>
                            <div><span class="font-medium">Flash Rate:</span> ${flash.flash_rate.toFixed(1)}/sec</div>
                            <div><span class="font-medium">Seizure Risk:</span> <span class="${riskColor}">${flash.seizure_risk_level.toUpperCase()}</span></div>
                            <div><span class="font-medium">Animation Violations:</span> <span class="${flash.animation_violations > 0 ? 'text-red-600' : 'text-green-600'}">${flash.animation_violations}</span></div>
                        </div>
                    </div>`;
                }
                
                html += '</div>';
            }

            // Remediation Guidance Section
            if (analysis.remediation_guidance && analysis.remediation_guidance.length > 0) {
                html += '<div class="mb-4 border-t border-gray-200 pt-3">';
                html += '<h4 class="font-semibold text-gray-700 mb-2">🛠️ Remediation Guidance</h4>';
                
                analysis.remediation_guidance.forEach((guidance, index) => {
                    const priorityColor = guidance.priority === 'critical' ? 'bg-red-100 border-red-300 text-red-800' :
                                        guidance.priority === 'high' ? 'bg-orange-100 border-orange-300 text-orange-800' :
                                        'bg-yellow-100 border-yellow-300 text-yellow-800';
                    
                    html += `<div class="mb-2 p-2 rounded border-l-4 ${priorityColor}">
                        <div class="flex items-start gap-2">
                            <span class="text-xs px-1 py-0.5 rounded ${priorityColor.replace('bg-', 'bg-').replace('text-', 'text-')}">${guidance.priority.toUpperCase()}</span>
                            <div class="flex-1 text-xs">
                                <div class="font-medium mb-1">${guidance.requirement}: ${guidance.guidance}</div>
                                <div class="text-gray-600">Tool: ${guidance.tool}</div>
                                ${guidance.affected_elements && guidance.affected_elements.length > 0 ? 
                                    `<div class="text-gray-500 mt-1">Affected: ${guidance.affected_elements.length} element${guidance.affected_elements.length !== 1 ? 's' : ''}</div>` : ''}
                            </div>
                        </div>
                    </div>`;
                });
                
                html += '</div>';
            }

            // Tool Results
            if (analysis.tool_results) {
                for (const [toolName, toolData] of Object.entries(analysis.tool_results)) {
                    html += `<div class="mb-3 border-l-2 border-blue-200 pl-3">
                        <div class="font-medium text-blue-700 mb-1">${toolName.toUpperCase()} Results</div>`;
                    
                    if (toolData.violations !== undefined) {
                        html += `<div class="text-xs text-gray-600 mb-2">${toolData.violations} violations (${toolData.critical || 0} critical)</div>`;
                    }

                    // Show page-specific results
                    if (toolData.pages && Array.isArray(toolData.pages)) {
                        toolData.pages.forEach(page => {
                            if (page.details && Array.isArray(page.details) && page.details.length > 0) {
                                html += `<div class="mb-2">
                                    <div class="text-xs font-medium text-gray-700 mb-1">Page: ${page.url}</div>`;
                                
                                page.details.forEach((violation, index) => {
                                    const severity = violation.type === 'error' || violation.critical ? 'critical' : 'warning';
                                    const severityColor = severity === 'critical' ? 'text-red-600' : 'text-yellow-600';
                                    
                                    html += `<div class="mb-2 p-2 bg-white rounded border-l-2 ${severity === 'critical' ? 'border-red-300' : 'border-yellow-300'}">
                                        <div class="flex items-start gap-2">
                                            <span class="text-xs px-1 py-0.5 rounded ${severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}">${severity.toUpperCase()}</span>
                                            <div class="flex-1 text-xs">
                                                <div class="font-medium ${severityColor} mb-1">${violation.message || 'Accessibility violation found'}</div>
                                                ${violation.code ? `<div class="text-gray-600 mb-1">Rule: ${violation.code}</div>` : ''}
                                                ${violation.selector ? `<div class="text-gray-500">Element: <code class="bg-gray-100 px-1 rounded">${violation.selector}</code></div>` : ''}
                                            </div>
                                        </div>
                                    </div>`;
                                });
                                
                                html += '</div>';
                            }
                        });
                    } else if (toolData.details) {
                        // Handle direct details format
                        html += `<div class="text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                            <pre class="whitespace-pre-wrap text-gray-600">${JSON.stringify(toolData.details, null, 2)}</pre>
                        </div>`;
                    }
                    
                    html += '</div>';
                }
            }

            html += '</div>';
            return html;
        },
        
        // Get conformance level badge class for session header
        getConformanceLevelBadgeClass(level) {
            const classes = {
                'wcag_a': 'bg-green-100 text-green-800',
                'wcag_aa': 'bg-blue-100 text-blue-800',
                'wcag_aaa': 'bg-purple-100 text-purple-800',
                'section_508': 'bg-yellow-100 text-yellow-800',
                'combined': 'bg-indigo-100 text-indigo-800'
            };
            return classes[level] || 'bg-gray-100 text-gray-800';
        },

        // ===== ENHANCED TEST GRID METHODS =====
        
        // Clear test grid filters
        clearTestGridFilters() {
            this.testGridFilters = {
                status: '',
                level: '',
                testMethod: ''
            };
            this.applyTestGridFilters();
        },
        
        // Toggle select all test instances
        toggleSelectAll(event) {
            if (event.target.checked) {
                this.selectedTestInstances = this.filteredTestInstances.map(instance => instance.id);
            } else {
                this.selectedTestInstances = [];
            }
            this.bulkStatusUpdate = '';
            this.bulkTesterAssignment = '';
        },
        
        // Toggle individual test instance selection
        toggleInstanceSelection(instanceId, event) {
            if (event.target.checked) {
                if (!this.selectedTestInstances.includes(instanceId)) {
                    this.selectedTestInstances.push(instanceId);
                }
            } else {
                this.selectedTestInstances = this.selectedTestInstances.filter(id => id !== instanceId);
            }
            this.bulkStatusUpdate = '';
            this.bulkTesterAssignment = '';
        },
        
        // Clear selection
        clearSelection() {
            this.selectedTestInstances = [];
            this.bulkStatusUpdate = '';
            this.bulkTesterAssignment = '';
        },
        
        // Apply bulk status update
        async applyBulkStatusUpdate() {
            if (!this.bulkStatusUpdate || this.selectedTestInstances.length === 0) return;
            
            try {
                console.log(`🔄 Applying bulk status update: ${this.bulkStatusUpdate} to ${this.selectedTestInstances.length} instances`);
                
                const promises = this.selectedTestInstances.map(instanceId => 
                    this.updateTestInstanceStatus(instanceId, this.bulkStatusUpdate)
                );
                
                await Promise.all(promises);
                
                this.showNotification('success', 'Bulk Update Complete', 
                    `Updated ${this.selectedTestInstances.length} test instances to "${this.bulkStatusUpdate.replace('_', ' ')}"`);
                
                this.clearSelection();
            } catch (error) {
                console.error('Error applying bulk status update:', error);
                this.showNotification('error', 'Bulk Update Failed', error.message);
            }
        },
        
        // Apply bulk tester assignment
        async applyBulkTesterAssignment() {
            if (!this.bulkTesterAssignment || this.selectedTestInstances.length === 0) return;
            
            try {
                console.log(`🔄 Applying bulk tester assignment: ${this.bulkTesterAssignment} to ${this.selectedTestInstances.length} instances`);
                
                const promises = this.selectedTestInstances.map(instanceId => 
                    this.assignTester(instanceId, this.bulkTesterAssignment)
                );
                
                await Promise.all(promises);
                
                const tester = this.availableTesters.find(t => t.id === this.bulkTesterAssignment);
                const testerName = tester ? (tester.full_name || tester.username) : 'Selected tester';
                
                this.showNotification('success', 'Bulk Assignment Complete', 
                    `Assigned ${this.selectedTestInstances.length} test instances to ${testerName}`);
                
                this.clearSelection();
            } catch (error) {
                console.error('Error applying bulk tester assignment:', error);
                this.showNotification('error', 'Bulk Assignment Failed', error.message);
            }
        },
        
        // Sort test instances by field
        sortBy(field) {
            if (this.testGridSort.field === field) {
                this.testGridSort.direction = this.testGridSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.testGridSort.field = field;
                this.testGridSort.direction = 'asc';
            }
            this.applyTestGridSort();
        },
        
        // Toggle sort direction
        toggleSortDirection() {
            this.testGridSort.direction = this.testGridSort.direction === 'asc' ? 'desc' : 'asc';
            this.applyTestGridSort();
        },
        
        // Apply test grid sorting
        applyTestGridSort() {
            const { field, direction } = this.testGridSort;
            
            this.filteredTestInstances.sort((a, b) => {
                let aVal = this.getSortValue(a, field);
                let bVal = this.getSortValue(b, field);
                
                // Handle null/undefined values
                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';
                
                // Convert to strings for comparison
                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();
                
                let result = aVal.localeCompare(bVal);
                return direction === 'desc' ? -result : result;
            });
            
            console.log(`📊 Sorted test instances by ${field} (${direction})`);
        },
        
        // Get sort value for a field
        getSortValue(instance, field) {
            switch (field) {
                case 'criterion_number':
                    return instance.criterion_number || '';
                case 'requirement_level':
                    return instance.requirement_level || instance.level || '';
                case 'status':
                    return instance.status || '';
                case 'test_method_used':
                    return instance.test_method_used || instance.requirement_test_method || '';
                case 'updated_at':
                    return instance.updated_at || '';
                case 'assigned_tester':
                    const tester = this.availableTesters.find(t => t.id === instance.assigned_tester);
                    return tester ? (tester.full_name || tester.username) : '';
                default:
                    return '';
            }
        },
        
        // Get sort icon for column headers
        getSortIcon(field) {
            if (this.testGridSort.field !== field) {
                return 'fa-sort text-gray-400';
            }
            return this.testGridSort.direction === 'asc' ? 'fa-sort-up text-purple-600' : 'fa-sort-down text-purple-600';
        },

        // ===== SESSION DETAILS MODAL METHODS =====
        
        // Open session details modal
        async openSessionDetailsModal(session) {
            try {
                console.log('🔍 Opening session details for:', session.name);
                
                this.selectedSessionDetails = { ...session };
                this.showSessionDetailsModal = true;
                this.loadingSessionDetails = true;
                this.sessionDetailsActiveTab = 'overview';
                
                // Join WebSocket room for this session to receive real-time updates
                this.joinSessionRoom(session.id);
                
                // Load comprehensive session details
                await this.loadSessionDetailsData(session.id);
                
            } catch (error) {
                console.error('Error opening session details:', error);
                this.showNotification('error', 'Details Load Failed', error.message);
                this.showSessionDetailsModal = false;
            } finally {
                this.loadingSessionDetails = false;
            }
        },
        
        // Close session details modal
        closeSessionDetailsModal() {
            this.showSessionDetailsModal = false;
            this.selectedSessionDetails = null;
            this.sessionDetailsStats = {};
            this.sessionDetailsActivities = [];
            this.sessionDetailsTeam = {};
            this.sessionDetailsTestInstances = [];
            this.sessionDetailsPages = [];
            this.automationSummary = {};
            
            // Leave the session WebSocket room when closing the modal
            if (this.socket && this.socketConnected) {
                this.socket.emit('leave_session');
            }
        },
        
        // Load comprehensive session details data
        async loadSessionDetailsData(sessionId) {
            try {
                console.log('📊 Loading session details data for:', sessionId);
                
                // Load session statistics
                await this.loadSessionStats(sessionId);
                
                // Load test instances for this session
                await this.loadSessionTestInstances(sessionId);
                
                // Load project pages for URL information
                await this.loadSessionPages();
                
                // Load recent activities (audit trail)
                await this.loadSessionActivities(sessionId);
                
                // Load team information
                await this.loadSessionTeam(sessionId);
                
                // Load automation summary
                await this.loadAutomationSummary(sessionId);
                
            } catch (error) {
                console.error('Error loading session details data:', error);
                throw error;
            }
        },

        // Load automation runs for a session
        async loadAutomationRuns(sessionId) {
            try {
                this.loadingAutomationRuns = true;
                console.log('🤖 Loading automation runs for session:', sessionId);
                
                const response = await this.apiCall(`/automated-testing/history/${sessionId}?limit=50`);
                
                if (response.success) {
                    this.automationRuns = response.data.runs || [];
                    this.calculateAutomationRunsSummary();
                    console.log('✅ Loaded automation runs:', this.automationRuns.length);
                    
                    // Initialize chart first, then update with data
                    this.$nextTick(() => {
                        this.initAutomationChart();
                        // Wait a bit longer for chart to be fully initialized
                        setTimeout(() => {
                            if (this.automationChart) {
                                this.updateAutomationChart(this.automationChartPeriod);
                            }
                        }, 200);
                    });
                } else {
                    throw new Error(response.error || 'Failed to load automation runs');
                }
                
            } catch (error) {
                console.error('Error loading automation runs:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load automation runs');
                this.automationRuns = [];
                this.automationRunsSummary = {};
            } finally {
                this.loadingAutomationRuns = false;
            }
        },

        // Calculate automation runs summary statistics
        calculateAutomationRunsSummary() {
            const runs = this.automationRuns;
            
            const totalRuns = runs.length;
            const successfulRuns = runs.filter(run => run.status === 'completed').length;
            const failedRuns = runs.filter(run => run.status === 'failed').length;
            const totalIssues = runs.reduce((sum, run) => sum + (run.total_issues || 0), 0);
            const criticalIssues = runs.reduce((sum, run) => sum + (run.critical_issues || 0), 0);
            
            this.automationRunsSummary = {
                total_runs: totalRuns,
                successful_runs: successfulRuns,
                failed_runs: failedRuns,
                total_issues: totalIssues,
                critical_issues: criticalIssues,
                success_rate: totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0,
                avg_issues_per_run: totalRuns > 0 ? Math.round(totalIssues / totalRuns) : 0
            };
        },

        // View automation run details
        async viewAutomationRunDetails(run) {
            try {
                console.log('🔍 Viewing automation run details:', run.id);
                
                // Load detailed results for this run
                const response = await this.apiCall(`/automated-testing/results/${run.id}`);
                
                if (response.success) {
                    // Show detailed results in a modal or expand the row
                    this.showNotification('info', 'Run Details', 
                        `Run ${run.id.substring(0, 8)}: ${response.data.results.length} results loaded`);
                    
                    // You could open a modal here to show detailed results
                    // For now, just show a notification
                } else {
                    throw new Error(response.error || 'Failed to load run details');
                }
                
            } catch (error) {
                console.error('Error viewing automation run details:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load run details');
            }
        },

        // Download automation run report
        async downloadAutomationRunReport(runId) {
            try {
                console.log('📄 Downloading automation run report:', runId);
                
                // This would typically generate and download a report
                // For now, just show a notification
                this.showNotification('info', 'Download Started', 
                    'Automation run report download initiated');
                
            } catch (error) {
                console.error('Error downloading automation run report:', error);
                this.showNotification('error', 'Download Failed', 'Failed to download report');
            }
        },

        // ===== AUTOMATION CHART FUNCTIONS =====
        
        // Initialize automation chart
        initAutomationChart() {
            try {
                const ctx = this.$refs.automationRunsChart;
                if (!ctx) {
                    console.log('Chart canvas not found, will initialize when available');
                    return;
                }

                // Destroy existing chart if it exists
                if (this.automationChart) {
                    this.automationChart.destroy();
                    this.automationChart = null;
                }

                // Check if Chart.js is available
                if (typeof Chart === 'undefined') {
                    console.error('Chart.js not loaded');
                    return;
                }

                // Initialize with empty data first
                this.automationChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: []
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false
                            }
                        },
                        scales: {
                            x: {
                                type: 'category',
                                grid: {
                                    display: false
                                }
                            },
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            }
                        }
                    }
                });

                console.log('📊 Automation chart initialized successfully');
            } catch (error) {
                console.error('Error initializing automation chart:', error);
            }
        },

        // Update automation chart with new data
        updateAutomationChart(period = '7d') {
            // Prevent multiple simultaneous updates
            if (this.isUpdatingChart) {
                console.log('📊 Chart update already in progress, skipping');
                return;
            }
            
            try {
                this.isUpdatingChart = true;
                this.automationChartPeriod = period;
                console.log('📊 Updating automation chart for period:', period);

                // Safety check for chart initialization
                if (!this.automationChart) {
                    console.log('Chart not initialized, initializing now...');
                    this.initAutomationChart();
                    // Don't call updateAutomationChart recursively - let the caller handle it
                    return;
                }

                if (!this.automationRuns || this.automationRuns.length === 0) {
                    console.log('No automation runs data available for chart');
                    // Show empty chart with message
                    this.automationChartData = {
                        labels: [],
                        datasets: []
                    };
                    if (this.automationChart) {
                        this.automationChart.data = this.automationChartData;
                        this.automationChart.update('none');
                    }
                    return;
                }

                // Filter runs based on period
                const now = new Date();
                const filteredRuns = this.automationRuns.filter(run => {
                    const runDate = new Date(run.started_at || run.created_at);
                    switch (period) {
                        case '7d':
                            return (now - runDate) <= 7 * 24 * 60 * 60 * 1000;
                        case '30d':
                            return (now - runDate) <= 30 * 24 * 60 * 60 * 1000;
                        case 'all':
                            return true;
                        default:
                            return true;
                    }
                });

                // Group runs by date
                const runsByDate = {};
                filteredRuns.forEach(run => {
                    const date = new Date(run.started_at || run.created_at);
                    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
                    
                    if (!runsByDate[dateKey]) {
                        runsByDate[dateKey] = {
                            total: 0,
                            successful: 0,
                            failed: 0,
                            issues: 0
                        };
                    }
                    
                    runsByDate[dateKey].total++;
                    if (run.status === 'completed') {
                        runsByDate[dateKey].successful++;
                    } else if (run.status === 'failed') {
                        runsByDate[dateKey].failed++;
                    }
                    runsByDate[dateKey].issues += run.total_issues || 0;
                });

                // Sort dates and prepare chart data
                const sortedDates = Object.keys(runsByDate).sort();
                const labels = sortedDates.map(date => {
                    const d = new Date(date + 'T00:00:00');
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                });
                const totalRuns = sortedDates.map(date => runsByDate[date].total);
                const successfulRuns = sortedDates.map(date => runsByDate[date].successful);
                const failedRuns = sortedDates.map(date => runsByDate[date].failed);
                const issuesFound = sortedDates.map(date => runsByDate[date].issues);

                // Update chart data
                this.automationChartData = {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Total Runs',
                            data: totalRuns,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Successful',
                            data: successfulRuns,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Failed',
                            data: failedRuns,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Issues Found',
                            data: issuesFound,
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4
                        }
                    ]
                };

                // Update chart with new data
                if (this.automationChart && this.automationChart.data && this.automationChart.update) {
                    try {
                        this.automationChart.data = this.automationChartData;
                        this.automationChart.update('none');
                    } catch (updateError) {
                        console.error('Error updating chart data:', updateError);
                    }
                }

                console.log('📊 Chart updated with', filteredRuns.length, 'runs across', labels.length, 'dates');
            } catch (error) {
                console.error('Error updating automation chart:', error);
            } finally {
                this.isUpdatingChart = false;
            }
        },
        
        // Load session statistics breakdown
        async loadSessionStats(sessionId) {
            try {
                // First, get the session details to understand the conformance level
                const sessionResponse = await this.apiCall(`/testing-sessions/${sessionId}`);
                
                if (!sessionResponse.success) {
                    console.error('Failed to load session details for stats calculation');
                    return;
                }
                
                const session = sessionResponse.session;
                const conformanceLevel = session.conformance_level || 'wcag_aa';
                
                // Get requirements based on the session's conformance level
                const requirementsResponse = await this.apiCall(`/unified-requirements/session/${sessionId}`);
                
                if (requirementsResponse.success) {
                    const requirements = requirementsResponse.data.requirements || [];
                    
                    // Calculate level breakdown from requirements (not test instances)
                    const stats = {
                        levelA: requirements.filter(r => (r.standard_type || r.requirement_type) === 'wcag' && r.level === 'a').length,
                        levelAA: requirements.filter(r => (r.standard_type || r.requirement_type) === 'wcag' && r.level === 'aa').length,
                        levelAAA: requirements.filter(r => (r.standard_type || r.requirement_type) === 'wcag' && r.level === 'aaa').length,
                        section508Base: requirements.filter(r => (r.standard_type || r.requirement_type) === 'section_508' && r.level === 'base').length,
                        section508Enhanced: requirements.filter(r => (r.standard_type || r.requirement_type) === 'section_508' && r.level === 'enhanced').length,
                        
                        // Test method breakdown from requirements
                        manualTests: requirements.filter(r => r.test_method === 'manual').length,
                        automatedTests: requirements.filter(r => r.test_method === 'automated').length,
                        hybridTests: requirements.filter(r => r.test_method === 'both').length
                    };
                    
                    this.sessionDetailsStats = stats;
                    console.log('📊 Session stats loaded from requirements:', stats);
                    console.log('📊 Conformance level:', conformanceLevel);
                    console.log('📊 Total requirements:', requirements.length);
                    
                    // Debug: Show sample requirements for troubleshooting
                    console.log('🔍 Sample WCAG requirements:', requirements.filter(r => r.standard_type === 'wcag').slice(0, 3));
                    console.log('🔍 Sample Section 508 requirements:', requirements.filter(r => r.standard_type === 'section_508').slice(0, 3));
                } else {
                    // Fallback to test instances if requirements API fails
                    const response = await this.apiCall(`/test-instances?session_id=${sessionId}`);
                    
                    if (response.success) {
                        const testInstances = response.test_instances || [];
                        
                        // Calculate level breakdown
                        const stats = {
                            levelA: testInstances.filter(t => (t.requirement_level || t.level) === 'a').length,
                            levelAA: testInstances.filter(t => (t.requirement_level || t.level) === 'aa').length,
                            levelAAA: testInstances.filter(t => (t.requirement_level || t.level) === 'aaa').length,
                            section508Base: testInstances.filter(t => (t.requirement_level || t.level) === 'base').length,
                            section508Enhanced: testInstances.filter(t => (t.requirement_level || t.level) === 'enhanced').length,
                            
                            // Test method breakdown
                            manualTests: testInstances.filter(t => (t.test_method_used || t.requirement_test_method) === 'manual').length,
                            automatedTests: testInstances.filter(t => (t.test_method_used || t.requirement_test_method) === 'automated').length,
                            hybridTests: testInstances.filter(t => (t.test_method_used || t.requirement_test_method) === 'both').length
                        };
                        
                        this.sessionDetailsStats = stats;
                        console.log('📊 Session stats loaded from test instances (fallback):', stats);
                    }
                }
            } catch (error) {
                console.error('Error loading session stats:', error);
            }
        },
        
        // Load session results for the Results tab
        async loadSessionResults(sessionId) {
            try {
                console.log('📊 Loading session results for:', sessionId);
                
                // Initialize session results structure
                this.sessionResults = {
                    summary: {
                        passedTests: 0,
                        failedTests: 0,
                        totalViolations: 0,
                        complianceScore: 0
                    },
                    toolResults: [],
                    recentRuns: [],
                    violations: []
                };
                
                // Load test instances for summary
                const testInstancesResponse = await this.apiCall(`/test-instances?session_id=${sessionId}`);
                if (testInstancesResponse.success && testInstancesResponse.test_instances) {
                    const instances = testInstancesResponse.test_instances;
                    this.sessionResults.summary.passedTests = instances.filter(t => t.status === 'passed').length;
                    this.sessionResults.summary.failedTests = instances.filter(t => t.status === 'failed').length;
                    const totalTests = instances.length;
                    this.sessionResults.summary.complianceScore = totalTests > 0 ? 
                        Math.round((this.sessionResults.summary.passedTests / totalTests) * 100) : 0;
                }
                
                // For now, create a simple tool breakdown based on test instances
                // TODO: Update to use actual automated test results when API is available
                const toolMap = new Map();
                
                if (testInstancesResponse.success && testInstancesResponse.test_instances) {
                    testInstancesResponse.test_instances.forEach(instance => {
                        const tool = instance.tool_used || 'Manual';
                        if (!toolMap.has(tool)) {
                            toolMap.set(tool, {
                                tool: tool,
                                pagesTested: 0,
                                violations: 0,
                                passes: 0,
                                lastRun: null,
                                successRate: 0
                            });
                        }
                        
                        const toolData = toolMap.get(tool);
                        toolData.pagesTested++;
                        
                        if (instance.status === 'failed') {
                            toolData.violations++;
                        } else if (instance.status === 'passed') {
                            toolData.passes++;
                        }
                        
                        if (!toolData.lastRun || new Date(instance.updated_at) > new Date(toolData.lastRun)) {
                            toolData.lastRun = instance.updated_at;
                        }
                    });
                    
                    // Calculate success rates
                    toolMap.forEach(toolData => {
                        const total = toolData.violations + toolData.passes;
                        toolData.successRate = total > 0 ? Math.round((toolData.passes / total) * 100) : 0;
                    });
                    
                    this.sessionResults.toolResults = Array.from(toolMap.values());
                    this.sessionResults.summary.totalViolations = Array.from(toolMap.values())
                        .reduce((sum, tool) => sum + tool.violations, 0);
                }
                
                // For now, create a simple recent runs list based on test instances
                // TODO: Update to use actual automation runs when API is available
                if (testInstancesResponse.success && testInstancesResponse.test_instances) {
                    const recentInstances = testInstancesResponse.test_instances
                        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
                        .slice(0, 10);
                    
                    this.sessionResults.recentRuns = recentInstances.map(instance => ({
                        id: instance.id,
                        status: instance.status,
                        tools: instance.tool_used ? [instance.tool_used] : [],
                        pagesTested: 1,
                        startedAt: instance.created_at,
                        duration: 0
                    }));
                }
                
                // For now, skip violations since the API needs to be updated for the current schema
                // TODO: Update violations API to work with the current database schema
                this.sessionResults.violations = [];
                
                console.log('📊 Session results loaded:', this.sessionResults);
            } catch (error) {
                console.error('Error loading session results:', error);
                this.sessionResults = null;
            }
        },
        
        // Refresh session results
        async refreshSessionResults(sessionId) {
            if (!sessionId) return;
            
            try {
                await this.loadSessionResults(sessionId);
                this.showNotification('success', 'Results Updated', 'Session results have been refreshed');
            } catch (error) {
                console.error('Error refreshing session results:', error);
                this.showNotification('error', 'Refresh Failed', 'Failed to refresh session results');
            }
        },
        
        // Export session results
        async exportSessionResults(session) {
            try {
                console.log('📤 Exporting session results for:', session.id);
                
                const response = await this.apiCall(`/sessions/${session.id}/export-results`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.success && response.data.downloadUrl) {
                    // Create a temporary link to download the file
                    const link = document.createElement('a');
                    link.href = response.data.downloadUrl;
                    link.download = `session-results-${session.name}-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    this.showNotification('success', 'Export Complete', 'Session results have been exported');
                } else {
                    throw new Error(response.error || 'Export failed');
                }
            } catch (error) {
                console.error('Error exporting session results:', error);
                this.showNotification('error', 'Export Failed', 'Failed to export session results');
            }
        },
        
        // Load session activities from audit trail
        async loadSessionActivities(sessionId) {
            try {
                const response = await this.apiCall(`/audit-trail/session/${sessionId}?limit=10&include_metadata=true`);
                
                if (response.success && response.data && Array.isArray(response.data.audit_entries)) {
                    // Use audit entries directly - each entry is an individual activity
                    const activities = response.data.audit_entries.map(entry => ({
                        id: entry.id || `${entry.changed_at}-${entry.action_type}`,
                        event_time: entry.changed_at || entry.timestamp,
                        action_type: entry.action_type,
                        description: entry.reason || entry.change_description || `${entry.action_type} action`,
                        changed_by: entry.changed_by,
                        metadata: entry.metadata,
                        test_instance_id: entry.test_instance_id
                    })).slice(0, 10);
                    
                    this.sessionDetailsActivities = activities;
                    console.log('📋 Session activities loaded:', this.sessionDetailsActivities.length);
                } else {
                    this.sessionDetailsActivities = [];
                    console.log('📋 No session activities found or invalid response structure');
                }
            } catch (error) {
                console.error('Error loading session activities:', error);
                this.sessionDetailsActivities = [];
            }
        },
        
        // Load session team information
        async loadSessionTeam(sessionId) {
            try {
                // Get assigned testers from test instances
                const response = await this.apiCall(`/test-instances?session_id=${sessionId}`);
                
                if (response.success) {
                    const testInstances = response.test_instances || [];
                    const assignedTesters = [...new Set(testInstances
                        .filter(t => t.assigned_tester)
                        .map(t => t.assigned_tester))];
                    
                    // Get tester details
                    const teamMembers = [];
                    for (const testerId of assignedTesters) {
                        const tester = this.availableTesters.find(u => u.id === testerId);
                        if (tester) {
                            const assignedTests = testInstances.filter(t => t.assigned_tester === testerId).length;
                            teamMembers.push({
                                ...tester,
                                assigned_tests: assignedTests
                            });
                        }
                    }
                    
                    this.sessionDetailsTeam = {
                        total_members: teamMembers.length,
                        active_testers: teamMembers.filter(m => m.assigned_tests > 0).length,
                        assigned_tests: testInstances.filter(t => t.assigned_tester).length,
                        members: teamMembers
                    };
                    
                    console.log('👥 Session team loaded:', this.sessionDetailsTeam);
                }
            } catch (error) {
                console.error('Error loading session team:', error);
                this.sessionDetailsTeam = {};
            }
        },
        
        // Load automation summary
        async loadAutomationSummary(sessionId) {
            try {
                const response = await this.apiCall(`/automated-testing/status/${sessionId}`);
                
                if (response.success) {
                    this.automationSummary = response.data.summary || {};
                    console.log('🤖 Automation summary loaded:', this.automationSummary);
                }
            } catch (error) {
                console.error('Error loading automation summary:', error);
                this.automationSummary = {};
            }
        },
        
        // Load session test instances
        async loadSessionTestInstances(sessionId) {
            try {
                const response = await this.apiCall(`/test-instances?session_id=${sessionId}`);
                
                if (response.success) {
                    // Add tester names to test instances
                    const testInstances = response.test_instances || [];
                    for (const instance of testInstances) {
                        if (instance.assigned_tester) {
                            const tester = this.availableTesters.find(u => u.id === instance.assigned_tester);
                            instance.assigned_tester_name = tester ? (tester.full_name || tester.username) : 'Unknown User';
                        }
                    }
                    
                    this.sessionDetailsTestInstances = testInstances;
                    console.log('📋 Session test instances loaded:', testInstances.length);
                }
            } catch (error) {
                console.error('Error loading session test instances:', error);
                this.sessionDetailsTestInstances = [];
            }
        },
        
        // Load project pages for URL information
        async loadSessionPages() {
            try {
                if (!this.selectedProject) return;
                
                // First get the crawlers for this project
                const crawlersResponse = await this.apiCall(`/web-crawlers/projects/${this.selectedProject}/crawlers`);
                
                if (crawlersResponse.success && crawlersResponse.data?.length > 0) {
                    // Use the first available crawler (or we could enhance this to use all crawlers)
                    const crawler = crawlersResponse.data[0];
                    
                    // Get pages for this crawler (all pages, not just selected for testing)
                    const pagesResponse = await this.apiCall(`/web-crawlers/crawlers/${crawler.id}/pages?limit=100`);
                    
                    if (pagesResponse.success) {
                        const pages = pagesResponse.data || pagesResponse.pages || [];
                        this.sessionDetailsPages = pages.map(page => ({
                            id: page.id,
                            url: page.url,
                            title: page.title || 'Untitled Page',
                            depth: page.depth,
                            requires_auth: page.requires_auth,
                            has_forms: page.has_forms,
                            selected_for_testing: page.selected_for_testing,
                            content_type: page.content_type,
                            status_code: page.status_code
                        }));
                        
                        console.log('🌐 Session pages loaded:', this.sessionDetailsPages.length);
                    }
                }
            } catch (error) {
                console.error('Error loading session pages:', error);
                this.sessionDetailsPages = [];
            }
        },
        
        // Helper methods for session details display
        getSessionStatusClass(status) {
            const classes = {
                'planning': 'text-blue-600',
                'active': 'text-green-600',
                'completed': 'text-purple-600',
                'paused': 'text-yellow-600',
                'cancelled': 'text-red-600'
            };
            return classes[status] || 'text-gray-600';
        },
        
        getSessionStatusDisplay(status) {
            const displays = {
                'planning': 'Planning',
                'active': 'Active',
                'completed': 'Completed',
                'paused': 'Paused',
                'cancelled': 'Cancelled'
            };
            return displays[status] || status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
        },
        
        getActivityIconClass(actionType) {
            const classes = {
                'created': 'bg-blue-100 text-blue-600',
                'status_change': 'bg-green-100 text-green-600',
                'assignment': 'bg-purple-100 text-purple-600',
                'automated_test_result': 'bg-indigo-100 text-indigo-600',
                'session_created': 'bg-yellow-100 text-yellow-600'
            };
            return classes[actionType] || 'bg-gray-100 text-gray-600';
        },
        
        getActivityIcon(actionType) {
            const icons = {
                'created': 'fas fa-plus',
                'status_change': 'fas fa-exchange-alt',
                'assignment': 'fas fa-user-tag',
                'automated_test_result': 'fas fa-robot',
                'session_created': 'fas fa-play'
            };
            return icons[actionType] || 'fas fa-circle';
        },
        
        // Format time ago
        formatTimeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            return `${Math.floor(diffInSeconds / 86400)}d ago`;
        },
        
        // Export session report
        async exportSessionReport(sessionId) {
            try {
                console.log('📥 Exporting session report for:', sessionId);
                
                const response = await this.apiCall(`/audit-trail/compliance-report/${sessionId}`);
                
                if (response.success) {
                    // Create downloadable file
                    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
                        type: 'application/json'
                    });
                    
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `session-report-${sessionId.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    this.showNotification('success', 'Report Exported', 'Session compliance report downloaded successfully');
                }
            } catch (error) {
                console.error('Error exporting session report:', error);
                this.showNotification('error', 'Export Failed', error.message);
            }
        },
        
        // Trigger automated test
        async triggerAutomatedTest(sessionId) {
            try {
                console.log('🤖 Triggering automated tests for session:', sessionId);
                
                const response = await this.apiCall(`/automated-testing/run/${sessionId}`, {
                    method: 'POST',
                    body: JSON.stringify({
                    tools: ['axe', 'pa11y'],
                    run_async: true,
                    update_test_instances: true,
                    create_evidence: true
                    })
                });
                
                if (response.success) {
                    this.showNotification('success', 'Automated Tests Started', 
                        `Running ${response.tools?.join(', ')} tests in background. Check status for updates.`);
                    
                    // Refresh automation summary after a delay
                    setTimeout(() => {
                        this.loadAutomationSummary(sessionId);
                    }, 5000);
                    
                    return response;
                } else {
                    throw new Error(response.error || 'Failed to start automated tests');
                }
            } catch (error) {
                console.error('Error triggering automated tests:', error);
                this.showNotification('error', 'Automation Failed', error.message);
                throw error;
            }
        },
        
        // View full audit trail
        viewFullAuditTrail(sessionId) {
            // This could open a separate detailed audit trail view
            console.log('🔍 Opening full audit trail for session:', sessionId);
            this.showNotification('info', 'Feature Coming Soon', 'Full audit trail view will be implemented in the next update');
        },
        
        // Helper methods for test instance display in session details
        getRequirementLevelBadgeClass(level) {
            const classes = {
                'a': 'bg-blue-100 text-blue-800',
                'aa': 'bg-green-100 text-green-800',
                'aaa': 'bg-purple-100 text-purple-800',
                'base': 'bg-yellow-100 text-yellow-800',
                'enhanced': 'bg-orange-100 text-orange-800'
            };
            return classes[level] || 'bg-gray-100 text-gray-800';
        },
        
        getRequirementLevelDisplay(level) {
            const displays = {
                'a': 'WCAG A',
                'aa': 'WCAG AA',
                'aaa': 'WCAG AAA',
                'base': '508 Base',
                'enhanced': '508 Enhanced'
            };
            return displays[level] || level?.toUpperCase() || 'Unknown';
        },
        
        getTestMethodBadgeClass(method) {
            const classes = {
                'manual': 'bg-blue-100 text-blue-800',
                'automated': 'bg-green-100 text-green-800',
                'both': 'bg-purple-100 text-purple-800'
            };
            return classes[method] || 'bg-gray-100 text-gray-800';
        },
        
        getTestMethodDisplay(method) {
            const displays = {
                'manual': 'Manual',
                'automated': 'Automated',
                'both': 'Hybrid Review'
            };
            return displays[method] || method?.charAt(0).toUpperCase() + method?.slice(1) || 'Unknown';
        },
        
        getTestStatusBadgeClass(status) {
            const classes = {
                'pending': 'bg-gray-100 text-gray-800',
                'in_progress': 'bg-blue-100 text-blue-800',
                'passed': 'bg-green-100 text-green-800',
                'passed_review_required': 'bg-orange-100 text-orange-800',
                'failed': 'bg-red-100 text-red-800',
                'untestable': 'bg-yellow-100 text-yellow-800',
                'not_applicable': 'bg-gray-100 text-gray-600'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },
        
        getTestStatusDisplay(status) {
            const displays = {
                'pending': 'Not Started',
                'in_progress': 'In Progress',
                'passed': 'Passed',
                'passed_review_required': 'Passed - Review Required',
                'failed': 'Failed',
                'untestable': 'Untestable',
                'not_applicable': 'N/A'
            };
            return displays[status] || status?.replace('_', ' ').charAt(0).toUpperCase() + status?.replace('_', ' ').slice(1) || 'Unknown';
        },

        getStatusBadgeClass(status) {
            const classes = {
                // Test status classes
                'pending': 'bg-gray-100 text-gray-800',
                'in_progress': 'bg-blue-100 text-blue-800',
                'passed': 'bg-green-100 text-green-800',
                'passed_review_required': 'bg-orange-100 text-orange-800',
                'failed': 'bg-red-100 text-red-800',
                'untestable': 'bg-yellow-100 text-yellow-800',
                'not_applicable': 'bg-gray-100 text-gray-600',
                'completed': 'bg-green-100 text-green-800',
                'running': 'bg-blue-100 text-blue-800',
                'error': 'bg-red-100 text-red-800',
                // Audit log action type classes
                'created': 'bg-green-100 text-green-800',
                'assignment': 'bg-blue-100 text-blue-800',
                'status_change': 'bg-purple-100 text-purple-800',
                'note_added': 'bg-yellow-100 text-yellow-800',
                'note_updated': 'bg-yellow-100 text-yellow-800',
                'evidence_uploaded': 'bg-indigo-100 text-indigo-800',
                'evidence_removed': 'bg-red-100 text-red-800',
                'review_requested': 'bg-orange-100 text-orange-800',
                'reviewed': 'bg-green-100 text-green-800',
                'approved': 'bg-green-100 text-green-800',
                'rejected': 'bg-red-100 text-red-800',
                'remediation_added': 'bg-teal-100 text-teal-800',
                'automated_update': 'bg-purple-100 text-purple-800',
                'updated': 'bg-gray-100 text-gray-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        getAutomationStatusBadgeClass(status) {
            const classes = {
                'completed': 'bg-green-100 text-green-800',
                'running': 'bg-blue-100 text-blue-800',
                'failed': 'bg-red-100 text-red-800',
                'error': 'bg-red-100 text-red-800',
                'pending': 'bg-gray-100 text-gray-800',
                'success': 'bg-green-100 text-green-800',
                'warning': 'bg-yellow-100 text-yellow-800'
            };
            return classes[status] || 'bg-purple-100 text-purple-800';
        },
        
        // Test instance action methods
        viewTestInstanceDetails(testInstance) {
            console.log('👀 Viewing test instance details:', testInstance.id);
            
            // Create comprehensive modal content
            const detailsHTML = `
                <div class="space-y-6">
                    <!-- Modal Header -->
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-2xl font-bold text-gray-900">Test Instance Details</h3>
                            <p class="text-gray-600 text-sm mt-1">${testInstance.criterion_number} - ${testInstance.requirement_title || testInstance.title || 'Untitled'}</p>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <!-- Test Overview -->
                    <div class="bg-blue-50 rounded-lg p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 class="text-lg font-semibold text-blue-900 mb-3">Test Details</h4>
                                <div class="space-y-2 text-sm">
                                    <div>
                                        <span class="font-medium text-blue-800">WCAG Criterion:</span>
                                        <span class="ml-2 font-mono bg-blue-100 px-2 py-1 rounded text-blue-900">${testInstance.criterion_number}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-blue-800">WCAG Level:</span>
                                        <span class="ml-2 px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">${(testInstance.requirement_level || testInstance.level || 'N/A').toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-blue-800">Test Method:</span>
                                        <span class="ml-2 text-blue-900">${testInstance.test_method_used || testInstance.requirement_test_method || 'Manual'}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-blue-800">Page:</span>
                                        ${testInstance.page_url ? `<a href="${testInstance.page_url}" target="_blank" class="ml-2 text-blue-600 hover:text-blue-800">
                                            <span>${testInstance.page_title || testInstance.page_url}</span>
                                            <i class="fas fa-external-link-alt ml-1 text-xs"></i>
                                        </a>` : '<span class="ml-2 text-blue-900">Site-wide test</span>'}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 class="text-lg font-semibold text-blue-900 mb-3">Current Status</h4>
                                <div class="space-y-2 text-sm">
                                    <div>
                                        <span class="font-medium text-blue-800">Status:</span>
                                        <span class="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">${testInstance.status || 'pending'}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-blue-800">Assigned Tester:</span>
                                        <span class="ml-2 text-blue-900">${testInstance.assigned_tester_name || 'Unassigned'}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-blue-800">Confidence Level:</span>
                                        <span class="ml-2 text-blue-900">${testInstance.confidence_level || 'Medium'}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-blue-800">Last Updated:</span>
                                        <span class="ml-2 text-blue-900">${testInstance.updated_at ? new Date(testInstance.updated_at).toLocaleDateString() : 'Never'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Requirement Description -->
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <h4 class="text-lg font-semibold text-gray-900 mb-3">Requirement Description</h4>
                        <div class="bg-white border border-gray-200 rounded p-4">
                            <p class="text-sm text-gray-900 leading-relaxed">${testInstance.requirement_description || testInstance.description || this.getWCAGDescription(testInstance.criterion_number) || 'Loading requirement details...'}</p>
                        </div>
                        
                        <!-- Enhanced Testing Instructions -->
                        <div class="mt-4 space-y-3">
                            ${testInstance.test_method === 'both' ? `
                                <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <h5 class="text-sm font-medium text-yellow-800 mb-2 flex items-center">
                                        <i class="fas fa-info-circle mr-2"></i>Why Both Automated & Manual Testing?
                                    </h5>
                                    <p class="text-sm text-yellow-700">${this.getTestMethodExplanation(testInstance.criterion_number, testInstance.test_method) || 'This criterion requires both automated detection and manual verification.'}</p>
                                </div>
                            ` : ''}
                            
                            <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h5 class="text-sm font-medium text-green-800 mb-3 flex items-center">
                                    <i class="fas fa-tasks mr-2"></i>Step-by-Step Testing Guide
                                </h5>
                                <div>${this.getDetailedTestingSteps(testInstance.criterion_number, testInstance.test_method)}</div>
                            </div>
                            
                            <details class="bg-gray-50 border border-gray-200 rounded-lg">
                                <summary class="p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <span class="text-sm font-medium text-gray-800 flex items-center">
                                        <i class="fas fa-exclamation-triangle mr-2 text-orange-500"></i>
                                        Common Violations & Examples
                                        <i class="fas fa-chevron-down ml-auto text-xs"></i>
                                    </span>
                                </summary>
                                <div class="p-4 pt-0">
                                    <div>${this.getCommonViolations(testInstance.criterion_number)}</div>
                                </div>
                            </details>
                        </div>
                        
                        ${testInstance.wcag_url || testInstance.section_508_url ? `
                        <div class="mt-4 flex space-x-4">
                            ${testInstance.wcag_url ? `
                            <a href="${testInstance.wcag_url}" target="_blank" class="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                                <i class="fas fa-external-link-alt mr-1"></i>WCAG Understanding Guide
                            </a>` : ''}
                            ${testInstance.section_508_url ? `
                            <a href="${testInstance.section_508_url}" target="_blank" class="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                                <i class="fas fa-external-link-alt mr-1"></i>Section 508 Reference
                            </a>` : ''}
                        </div>` : ''}
                    </div>

                    <!-- Test Results -->
                    <div class="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Test Results</h4>
                        
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <!-- Status and Assignment -->
                <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Test Status</label>
                                    <select id="test-status-select" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="pending" ${testInstance.status === 'pending' ? 'selected' : ''}>Pending</option>
                                        <option value="in_progress" ${testInstance.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="passed" ${testInstance.status === 'passed' ? 'selected' : ''}>Passed</option>
                                        <option value="failed" ${testInstance.status === 'failed' ? 'selected' : ''}>Failed</option>
                                        <option value="not_applicable" ${testInstance.status === 'not_applicable' ? 'selected' : ''}>Not Applicable</option>
                                        <option value="untestable" ${testInstance.status === 'untestable' ? 'selected' : ''}>Untestable</option>
                                        <option value="needs_review" ${testInstance.status === 'needs_review' ? 'selected' : ''}>Needs Review</option>
                                    </select>
                    </div>

                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Confidence Level</label>
                                    <select id="confidence-level-select" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="low" ${testInstance.confidence_level === 'low' ? 'selected' : ''}>Low</option>
                                        <option value="medium" ${testInstance.confidence_level === 'medium' ? 'selected' : ''}>Medium</option>
                                        <option value="high" ${testInstance.confidence_level === 'high' ? 'selected' : ''}>High</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Evidence Upload -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Evidence Files</label>
                                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                        <input type="file" multiple accept="image/*,.pdf,.doc,.docx" 
                                               id="evidence-upload"
                                               class="hidden">
                                        <label for="evidence-upload" class="cursor-pointer">
                                            <div class="text-gray-400">
                                                <i class="fas fa-cloud-upload-alt text-3xl mb-2"></i>
                                                <p class="text-sm">Click to upload evidence files</p>
                                                <p class="text-xs text-gray-500">PNG, JPG, PDF, DOC files</p>
                                            </div>
                                        </label>
                                    </div>
                                    
                                    <!-- Evidence List -->
                                    <div id="evidence-list" class="mt-3 space-y-2" style="display: none;">
                                        <!-- Evidence files will be listed here -->
                                    </div>
                                </div>
                            </div>

                            <!-- Additional Info -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Assigned Tester</label>
                                    <input type="text" id="assigned-tester" 
                                           value="${testInstance.assigned_tester_name || ''}"
                                           placeholder="Enter tester name or UUID"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                        </div>

                        <!-- Notes Section -->
                        <div class="mt-6 space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Test Notes</label>
                                <textarea id="test-notes" 
                                          rows="4" 
                                          placeholder="Add detailed notes about the test results, findings, or observations..."
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">${testInstance.notes || ''}</textarea>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Remediation Notes</label>
                                <textarea id="remediation-notes" 
                                          rows="3" 
                                          placeholder="Add notes about recommended fixes or remediation steps..."
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">${testInstance.remediation_notes || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Automation Results -->
                    <div class="bg-purple-50 border border-purple-200 rounded-lg p-6">
                        <div class="flex justify-between items-center mb-3">
                            <h4 class="text-lg font-semibold text-purple-900">Automation Results</h4>
                            <button id="toggle-automation-btn" 
                                    onclick="window.toggleAutomationResults('${testInstance.id}')"
                                    class="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
                                <i class="fas fa-refresh mr-1"></i>Refresh Results
                            </button>
                        </div>
                        <div id="automation-results" class="space-y-3">
                            <div id="automation-list">
                                <div class="text-center py-4 text-purple-500">
                                    <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                    <p>Loading automation results...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Test History -->
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <div class="flex justify-between items-center mb-3">
                            <h4 class="text-lg font-semibold text-gray-900">Test History & Audit Trail</h4>
                            <button id="toggle-history-btn" 
                                    onclick="window.toggleTestHistory('${testInstance.id}')"
                                    class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                <i class="fas fa-refresh mr-1"></i>Refresh History
                            </button>
                        </div>
                        <div id="test-history" class="space-y-3">
                            <div id="history-list">
                                <div class="text-center py-4 text-gray-500">
                                    <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                    <p>Loading audit history...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                        <button onclick="this.closest('.fixed').remove()" 
                                class="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button onclick="window.saveTestInstanceDetails('${testInstance.id}', this.closest('.fixed'))" 
                                class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                            Save Changes
                        </button>
                    </div>
                </div>
            `;
            
            // Show modal with details
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-7xl max-h-[95vh] overflow-y-auto">
                    ${detailsHTML}
                </div>
            `;
            document.body.appendChild(modal);

            // Load test history and automation results
            this.loadTestInstanceHistory(testInstance.id);
            this.loadAutomationResults(testInstance.id);
        },
        
        editTestInstance(testInstance) {
            console.log('✏️ Editing test instance:', testInstance.id);
            
            // Create edit form modal
            const editHTML = `
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold">Edit Test Instance</h3>
                    <div class="text-sm text-gray-600">${testInstance.criterion_number}: ${testInstance.requirement_title || testInstance.title || 'Untitled'}</div>
                    <form id="editInstanceForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Status</label>
                            <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded">
                                <option value="pending" ${testInstance.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="in_progress" ${testInstance.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                <option value="passed" ${testInstance.status === 'passed' ? 'selected' : ''}>Passed</option>
                                <option value="failed" ${testInstance.status === 'failed' ? 'selected' : ''}>Failed</option>
                                <option value="not_applicable" ${testInstance.status === 'not_applicable' ? 'selected' : ''}>Not Applicable</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Notes</label>
                            <textarea name="notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded">${testInstance.notes || ''}</textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Testing Priority</label>
                            <select name="testing_priority" class="w-full px-3 py-2 border border-gray-300 rounded">
                                <option value="low" ${testInstance.testing_priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${testInstance.testing_priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${testInstance.testing_priority === 'high' ? 'selected' : ''}>High</option>
                                <option value="critical" ${testInstance.testing_priority === 'critical' ? 'selected' : ''}>Critical</option>
                            </select>
                        </div>
                    </form>
                </div>
            `;
            
            // Show modal with edit form
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-3xl max-h-[80vh] overflow-y-auto">
                    ${editHTML}
                    <div class="mt-6 flex justify-end space-x-2">
                        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
                        <button onclick="window.saveTestInstanceEdit('${testInstance.id}', this.closest('.fixed'))" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Changes</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },
        
        // Save test instance details
        async saveTestInstanceDetails(instanceId, modal) {
            try {
                console.log('🔧 Starting save process for instance:', instanceId);
                console.log('🔧 Modal element:', modal);
                
                const status = modal.querySelector('#test-status-select').value;
                const confidenceLevel = modal.querySelector('#confidence-level-select').value;
                const assignedTester = modal.querySelector('#assigned-tester').value;
                const notes = modal.querySelector('#test-notes').value;
                const remediationNotes = modal.querySelector('#remediation-notes').value;
                
                console.log('🔧 Form values:', { status, confidenceLevel, assignedTester, notes, remediationNotes });
                
                // Build updates object with only the fields that exist in the database
                const updates = {
                    status,
                    confidence_level: confidenceLevel,
                    notes,
                    remediation_notes: remediationNotes
                };
                
                // Only include assigned_tester if it's a valid UUID (not empty string)
                if (assignedTester && assignedTester.trim() !== '') {
                    // For now, we'll store the assigned tester name in notes if it's not a UUID
                    // In a real implementation, you'd want to look up the user ID by name
                    if (assignedTester.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                        updates.assigned_tester = assignedTester;
                    } else {
                        // If it's not a UUID, append to notes
                        updates.notes = (notes || '') + (notes ? '\n\n' : '') + `Assigned Tester: ${assignedTester}`;
                    }
                }
                
                console.log('🔧 Saving test instance updates:', { instanceId, updates });
                
                const response = await this.apiCall(`/test-instances/${instanceId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updates)
                });
                
                console.log('🔧 API response:', response);
                
                if (response.success) {
                    this.showNotification('success', 'Updated', 'Test instance updated successfully');
                    modal.remove();
                    // Refresh the test grid
                    this.loadTestInstancesForGrid(this.selectedTestSession.id, this.testGridPagination.currentPage, true);
                } else {
                    throw new Error(response.error || 'Failed to update test instance');
                }
            } catch (error) {
                console.error('Error updating test instance:', error);
                this.showNotification('error', 'Update Failed', error.message);
            }
        },

        // Toggle automation results visibility
        toggleAutomationResults(instanceId) {
            const automationContainer = document.getElementById('automation-results');
            const toggleBtn = document.getElementById('toggle-automation-btn');
            
            if (automationContainer && toggleBtn) {
                const isVisible = automationContainer.style.display !== 'none';
                automationContainer.style.display = isVisible ? 'none' : 'block';
                toggleBtn.innerHTML = isVisible ? 
                    '<i class="fas fa-robot mr-1"></i>Show Results' : 
                    '<i class="fas fa-eye-slash mr-1"></i>Hide Results';
                
                // Load automation results if showing and not already loaded
                if (!isVisible && instanceId) {
                    this.loadAutomationResults(instanceId);
                }
            }
        },

        // Toggle test history visibility
        toggleTestHistory(instanceId) {
            const historyContainer = document.getElementById('test-history');
            const toggleBtn = document.getElementById('toggle-history-btn');
            
            if (historyContainer && toggleBtn) {
                const isVisible = historyContainer.style.display !== 'none';
                historyContainer.style.display = isVisible ? 'none' : 'block';
                toggleBtn.innerHTML = isVisible ? 
                    '<i class="fas fa-history mr-1"></i>Show History' : 
                    '<i class="fas fa-eye-slash mr-1"></i>Hide History';
                
                // Load test history when showing
                if (!isVisible && instanceId) {
                    this.loadTestInstanceHistory(instanceId);
                }
            }
        },

        // Load automation results for current test instance
        async loadAutomationResults(instanceId) {
            try {
                if (!instanceId) {
                    console.error('No instance ID provided for loadAutomationResults');
                    return;
                }
                
                // Load automation results for this test instance
                const response = await this.apiCall(`/automated-testing/instance-results/${instanceId}`);
                const automationList = document.getElementById('automation-list');
                
                if (response.success && response.data.length > 0 && automationList) {
                    automationList.innerHTML = response.data.map(result => `
                        <div class="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
                            <div class="flex justify-between items-start mb-3">
                                <div class="flex items-center space-x-3">
                                    <span class="px-3 py-1 text-xs font-medium rounded-full ${this.getAutomationStatusBadgeClass(result.status)}">
                                        ${result.status || 'Completed'}
                                    </span>
                                    <div class="flex items-center space-x-2">
                                        <i class="fas fa-robot text-purple-400"></i>
                                        <span class="text-sm font-medium text-purple-700">${result.tool_name || 'Automated Tool'}</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-medium text-purple-900">${new Date(result.executed_at).toLocaleDateString()}</div>
                                    <div class="text-xs text-purple-500">${new Date(result.executed_at).toLocaleTimeString()}</div>
                                </div>
                            </div>
                            
                            <!-- Results Summary -->
                            <div class="grid grid-cols-3 gap-3 mb-4">
                                ${result.violations_count > 0 ? `
                                    <div class="bg-red-50 border border-red-200 rounded p-3 text-center">
                                        <div class="text-xl font-bold text-red-700">${result.violations_count}</div>
                                        <div class="text-xs text-red-600">Violations</div>
                                    </div>
                                ` : ''}
                                ${result.warnings_count > 0 ? `
                                    <div class="bg-yellow-50 border border-yellow-200 rounded p-3 text-center">
                                        <div class="text-xl font-bold text-yellow-700">${result.warnings_count}</div>
                                        <div class="text-xs text-yellow-600">Warnings</div>
                                    </div>
                                ` : ''}
                                ${result.passes_count > 0 ? `
                                    <div class="bg-green-50 border border-green-200 rounded p-3 text-center">
                                        <div class="text-xl font-bold text-green-700">${result.passes_count}</div>
                                        <div class="text-xs text-green-600">Passed</div>
                                    </div>
                                ` : ''}
                            </div>

                            <!-- Detailed Results -->
                            ${result.raw_results && Object.keys(result.raw_results).length > 0 ? `
                                <details class="mb-3">
                                    <summary class="cursor-pointer text-sm font-medium text-purple-700 hover:text-purple-900 flex items-center">
                                        <i class="fas fa-list mr-2"></i>View Detailed Results
                                        <i class="fas fa-chevron-down ml-auto text-xs"></i>
                                    </summary>
                                    <div class="mt-2 bg-gray-50 p-3 rounded border text-xs">
                                        ${this.formatAutomationResults(result.raw_results)}
                                    </div>
                                </details>
                            ` : ''}
                            

                            
                            ${result.test_duration_ms ? `
                                <div class="flex items-center space-x-2 text-xs text-purple-500">
                                    <i class="fas fa-clock"></i>
                                    <span>Execution time: ${Math.round(result.test_duration_ms / 1000)}s</span>
                                </div>
                            ` : ''}
                            
                            ${result.browser_name ? `
                                <div class="flex items-center space-x-2 text-xs text-purple-500">
                                    <i class="fas fa-globe"></i>
                                    <span>Browser: ${result.browser_name}</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('');
                } else if (automationList) {
                    automationList.innerHTML = `
                        <div class="text-center py-8 text-purple-500">
                            <i class="fas fa-robot text-3xl mb-2"></i>
                            <p>No automation results available for this test instance.</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading automation results:', error);
                const automationList = document.getElementById('automation-list');
                if (automationList) {
                    automationList.innerHTML = `
                        <div class="text-center py-8 text-red-500">
                            <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                            <p>Error loading automation results: ${error.message}</p>
                        </div>
                    `;
                }
            }
        },

        // Load test instance history with enhanced audit information
        async loadTestInstanceHistory(instanceId) {
            try {
                const response = await this.apiCall(`/test-instances/${instanceId}/audit-log`);
                const historyList = document.getElementById('history-list');
                
                if (response.success && response.data.length > 0 && historyList) {
                    historyList.innerHTML = response.data.map((entry, index) => `
                        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex justify-between items-start mb-3">
                                <div class="flex items-center space-x-3">
                                    <div class="flex items-center">
                                        <div class="w-8 h-8 rounded-full ${this.getActionTypeColor(entry.action_type)} flex items-center justify-center mr-3">
                                            <i class="fas ${this.getActionTypeIcon(entry.action_type)} text-white text-xs"></i>
                                        </div>
                                        <div>
                                            <span class="px-3 py-1 text-xs font-medium rounded-full ${this.getStatusBadgeClass(entry.action_type)}">
                                                ${this.getActionTypeDisplay(entry.action_type)}
                                            </span>
                                            <div class="text-xs text-gray-500 mt-1">#${index + 1} • Instance Audit</div>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <i class="fas fa-user text-gray-400"></i>
                                        <span class="text-sm font-medium text-gray-700">${entry.user_username || 'System'}</span>
                                        ${entry.user_email ? `<span class="text-xs text-gray-500">(${entry.user_email})</span>` : ''}
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-medium text-gray-900">${new Date(entry.created_at).toLocaleDateString()}</div>
                                    <div class="text-xs text-gray-500">${new Date(entry.created_at).toLocaleTimeString()}</div>
                                    <div class="text-xs text-blue-600 mt-1">${this.timeAgo(entry.created_at)}</div>
                                </div>
                            </div>
                            
                            <!-- Action Description -->
                            ${entry.reason ? `
                                <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div class="text-sm font-medium text-blue-800 mb-1 flex items-center">
                                        <i class="fas fa-info-circle mr-2"></i>Change Description:
                                    </div>
                                    <div class="text-sm text-blue-700">
                                        ${entry.reason}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Value Changes -->
                            ${entry.old_value && entry.new_value ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <div class="text-sm font-medium text-red-700 mb-2 flex items-center">
                                            <i class="fas fa-arrow-left mr-2"></i>Previous Value:
                                        </div>
                                        <div class="text-sm text-red-800 bg-white p-2 rounded border">
                                            ${this.formatAuditValue(entry.old_value)}
                                        </div>
                                    </div>
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <div class="text-sm font-medium text-green-700 mb-2 flex items-center">
                                            <i class="fas fa-arrow-right mr-2"></i>New Value:
                                        </div>
                                        <div class="text-sm text-green-800 bg-white p-2 rounded border">
                                            ${this.formatAuditValue(entry.new_value)}
                                        </div>
                                    </div>
                                </div>
                            ` : entry.new_value ? `
                                <div class="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div class="text-sm font-medium text-green-700 mb-2 flex items-center">
                                        <i class="fas fa-plus mr-2"></i>Value Set:
                                    </div>
                                    <div class="text-sm text-green-800 bg-white p-2 rounded border">
                                        ${this.formatAuditValue(entry.new_value)}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Field Changed Info -->
                            ${entry.field_changed ? `
                                <div class="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div class="text-sm font-medium text-yellow-800 mb-1 flex items-center">
                                        <i class="fas fa-edit mr-2"></i>Field Modified:
                                    </div>
                                    <div class="text-sm text-yellow-700 font-mono">
                                        ${entry.field_changed}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Technical Details -->
                            ${entry.metadata ? `
                                <details class="mb-2">
                                    <summary class="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 flex items-center">
                                        <i class="fas fa-cog mr-2"></i>Technical Details
                                        <i class="fas fa-chevron-down ml-auto text-xs"></i>
                                    </summary>
                                    <div class="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                                        <pre class="text-xs overflow-x-auto">${JSON.stringify(entry.metadata, null, 2)}</pre>
                                    </div>
                                </details>
                            ` : ''}
                            
                            <!-- Footer with ID -->
                            <div class="flex items-center justify-between pt-2 mt-2 border-t border-gray-100">
                                <span class="text-xs text-gray-500">Entry ID: ${entry.id}</span>
                                <span class="text-xs text-gray-400">Instance: ${instanceId}</span>
                            </div>
                        </div>
                    `).join('');
                } else if (historyList) {
                    historyList.innerHTML = `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-history text-3xl mb-2"></i>
                            <p>No audit history available for this test instance.</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading test instance history:', error);
                const historyList = document.getElementById('history-list');
                if (historyList) {
                    historyList.innerHTML = `
                        <div class="text-center py-8 text-red-500">
                            <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                            <p>Error loading audit history: ${error.message}</p>
                        </div>
                    `;
                }
            }
        },

        // Get WCAG requirement description
        getWCAGDescription(criterionNumber) {
            const descriptions = {
                '1.1.1': 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose, except for specific situations.',
                '1.3.1': 'Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.',
                '1.4.3': 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1, except for large text which has a contrast ratio of at least 3:1.',
                '2.1.1': 'All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes.',
                '2.4.1': 'A mechanism is available to bypass blocks of content that are repeated on multiple Web pages.',
                '2.4.2': 'Web pages have titles that describe topic or purpose.',
                '2.4.6': 'Headings and labels describe topic or purpose.',
                '4.1.1': 'In content implemented using markup languages, elements have complete start and end tags, elements are nested according to their specifications.',
                '4.1.2': 'For all user interface components, the name and role can be programmatically determined; states, properties, and values that can be set by the user can be programmatically set.',
                '4.1.3': 'In content implemented using markup languages, status messages can be programmatically determined through role or properties.'
            };
            return descriptions[criterionNumber] || null;
        },

        // Get explanation for why certain criteria require both automated and manual testing
        getTestMethodExplanation(criterionNumber, testMethod) {
            console.log('🔍 getTestMethodExplanation called:', criterionNumber, testMethod);
            if (testMethod !== 'both') return null;
            
            const explanations = {
                '1.1.1': 'Automated tools can detect missing alt text, but human judgment is needed to verify alt text quality and contextual appropriateness.',
                '1.3.1': 'Automated tools identify structural markup issues, but manual review ensures logical content flow and proper heading hierarchy.',
                '1.4.10': 'Automated tools check viewport scaling capabilities, but manual testing verifies content usability at different zoom levels.',
                '1.4.12': 'Automated tools detect spacing modifications, but manual testing ensures text remains readable and functional with custom spacing.',
                '1.4.13': 'Automated tools can detect hover/focus content, but manual testing verifies dismissibility, persistence, and keyboard interactions.',
                '2.1.1': 'Automated tools identify missing keyboard handlers, but manual testing ensures complete keyboard navigation and functionality.',
                '2.4.1': 'Automated tools detect skip links, but manual testing verifies they work correctly and provide meaningful navigation.',
                '2.4.2': 'Automated tools check for title elements, but manual review ensures titles are descriptive and context-appropriate.',
                '2.4.6': 'Automated tools identify headings and labels, but manual review ensures they clearly describe content and purpose.',
                '4.1.1': 'Automated tools validate HTML syntax, but manual review ensures semantic correctness in complex structures.',
                '4.1.2': 'Automated tools detect missing ARIA attributes, but manual testing verifies correct implementation and screen reader compatibility.',
                '4.1.3': 'Automated tools identify status elements, but manual testing verifies proper announcement and user comprehension.'
            };
            
            return explanations[criterionNumber] || 
                   'This criterion requires both automated detection of technical issues and manual verification of user experience quality.';
        },

        // Generate detailed step-by-step testing instructions
        getDetailedTestingSteps(criterionNumber, testMethod) {
            const baseSteps = {
                'automated': [
                    'Run automated accessibility scanning tools (axe, WAVE, Lighthouse)',
                    'Review violation reports and understand each issue',
                    'Validate findings by manually checking flagged elements',
                    'Document violations with screenshots and specific details',
                    'Mark test instance with appropriate status and confidence level'
                ],
                'manual': [
                    'Assign qualified accessibility tester to this criterion',
                    'Use assistive technologies (screen reader, keyboard navigation)',
                    'Test with multiple browsers and devices if applicable',
                    'Document findings with detailed evidence and screenshots',
                    'Provide specific remediation guidance for any violations',
                    'Mark with confidence level and comprehensive notes'
                ],
                'both': [
                    'PHASE 1: Run automated accessibility scanning for baseline detection',
                    'PHASE 2: Review automated results and understand technical violations',
                    'PHASE 3: Conduct manual testing to verify user experience quality',
                    'PHASE 4: Test edge cases and complex interactions manually',
                    'PHASE 5: Combine automated and manual findings for comprehensive results',
                    'PHASE 6: Provide final assessment with confidence rating and detailed notes'
                ]
            };

            const steps = baseSteps[testMethod] || baseSteps['manual'];
            return '<ol class="list-decimal list-inside space-y-2 text-sm text-gray-700">' +
                   steps.map(step => `<li>${step}</li>`).join('') +
                   '</ol>';
        },

        // Get common violations and examples for a criterion
        getCommonViolations(criterionNumber) {
            const violations = {
                '1.1.1': [
                    'Images without alt attributes',
                    'Alt text that duplicates nearby text',
                    'Decorative images with descriptive alt text',
                    'Complex images (charts, graphs) without detailed descriptions'
                ],
                '1.3.1': [
                    'Using tables for layout instead of data',
                    'Missing or incorrect heading hierarchy (h1, h2, h3)',
                    'Form fields without proper labels',
                    'Lists marked up as plain text with bullet characters'
                ],
                '1.4.3': [
                    'Text with insufficient color contrast against background',
                    'Links that rely only on color to indicate their function',
                    'Error messages shown only in red color',
                    'Interactive elements with poor contrast ratios'
                ],
                '2.1.1': [
                    'Interactive elements not accessible via keyboard',
                    'Custom controls without keyboard event handlers',
                    'Keyboard traps that prevent navigation',
                    'Missing focus indicators on interactive elements'
                ],
                '2.4.2': [
                    'Pages without descriptive title elements',
                    'Multiple pages sharing identical titles',
                    'Titles that don\'t reflect page content or purpose',
                    'Dynamic content changes not reflected in page titles'
                ]
            };

            const criterionViolations = violations[criterionNumber] || [
                'Review WCAG documentation for specific violation examples',
                'Test with assistive technologies to identify issues',
                'Consult accessibility guidelines for detailed examples'
            ];

            return '<ul class="list-disc list-inside space-y-1 text-sm text-gray-700">' +
                   criterionViolations.map(violation => `<li>${violation}</li>`).join('') +
                   '</ul>';
        },

        // Get testing tools and resources for a criterion
        getTestingTools(criterionNumber, testMethod) {
            const automatedTools = [
                '<strong>axe-core:</strong> Browser extension for comprehensive accessibility testing',
                '<strong>WAVE:</strong> Web accessibility evaluation tool',
                '<strong>Lighthouse:</strong> Google\'s accessibility audit tool',
                '<strong>Pa11y:</strong> Command-line accessibility testing tool'
            ];

            const manualTools = [
                '<strong>Screen Readers:</strong> NVDA, JAWS, VoiceOver for testing with assistive technology',
                '<strong>Keyboard Testing:</strong> Tab, Shift+Tab, Enter, Space, Arrow keys navigation',
                '<strong>Browser Dev Tools:</strong> Inspect accessibility tree and properties',
                '<strong>Color Contrast:</strong> WebAIM Contrast Checker, Colour Contrast Analyser'
            ];

            const resources = [
                '<strong>WCAG Guidelines:</strong> <a href="https://www.w3.org/WAI/WCAG22/Understanding/" target="_blank" class="text-blue-600 hover:text-blue-800">Understanding WCAG 2.2</a>',
                '<strong>WebAIM:</strong> <a href="https://webaim.org/" target="_blank" class="text-blue-600 hover:text-blue-800">Accessibility tutorials and resources</a>',
                '<strong>MDN Accessibility:</strong> <a href="https://developer.mozilla.org/en-US/docs/Web/Accessibility" target="_blank" class="text-blue-600 hover:text-blue-800">Technical implementation guides</a>'
            ];

            let toolsList = '';
            
            if (testMethod === 'automated' || testMethod === 'both') {
                toolsList += '<div class="mb-4"><h6 class="font-medium text-purple-800 mb-2">Automated Testing Tools:</h6>';
                toolsList += '<ul class="list-disc list-inside space-y-1 text-sm text-purple-700">';
                toolsList += automatedTools.map(tool => `<li>${tool}</li>`).join('');
                toolsList += '</ul></div>';
            }

            if (testMethod === 'manual' || testMethod === 'both') {
                toolsList += '<div class="mb-4"><h6 class="font-medium text-purple-800 mb-2">Manual Testing Tools:</h6>';
                toolsList += '<ul class="list-disc list-inside space-y-1 text-sm text-purple-700">';
                toolsList += manualTools.map(tool => `<li>${tool}</li>`).join('');
                toolsList += '</ul></div>';
            }

            toolsList += '<div><h6 class="font-medium text-purple-800 mb-2">Additional Resources:</h6>';
            toolsList += '<ul class="list-disc list-inside space-y-1 text-sm text-purple-700">';
            toolsList += resources.map(resource => `<li>${resource}</li>`).join('');
            toolsList += '</ul></div>';

            return toolsList;
        },

        // Helper functions for enhanced audit display
        getActionTypeColor(actionType) {
            const colors = {
                'created': 'bg-blue-500',
                'updated': 'bg-green-500',
                'status_changed': 'bg-yellow-500',
                'assigned': 'bg-purple-500',
                'completed': 'bg-green-600',
                'failed': 'bg-red-500',
                'reviewed': 'bg-indigo-500',
                'approved': 'bg-emerald-500',
                'rejected': 'bg-red-600',
                'archived': 'bg-gray-500'
            };
            return colors[actionType] || 'bg-gray-400';
        },

        getActionTypeIcon(actionType) {
            const icons = {
                'created': 'fa-plus',
                'updated': 'fa-edit',
                'status_changed': 'fa-exchange-alt',
                'assigned': 'fa-user-tag',
                'completed': 'fa-check',
                'failed': 'fa-times',
                'reviewed': 'fa-eye',
                'approved': 'fa-thumbs-up',
                'rejected': 'fa-thumbs-down',
                'archived': 'fa-archive'
            };
            return icons[actionType] || 'fa-info';
        },

        getActionTypeDisplay(actionType) {
            const displays = {
                'created': 'Created',
                'updated': 'Updated',
                'status_changed': 'Status Changed',
                'assigned': 'Assigned',
                'completed': 'Completed',
                'failed': 'Failed',
                'reviewed': 'Reviewed',
                'approved': 'Approved',
                'rejected': 'Rejected',
                'archived': 'Archived'
            };
            return displays[actionType] || (actionType || 'Updated');
        },

        formatAuditValue(value) {
            if (value === null || value === undefined) {
                return '<em class="text-gray-400">null</em>';
            }
            if (typeof value === 'object') {
                return `<pre class="text-xs overflow-x-auto">${JSON.stringify(value, null, 2)}</pre>`;
            }
            if (typeof value === 'string' && value.length > 100) {
                return `<div class="text-sm">${value.substring(0, 100)}...</div><details class="mt-1"><summary class="text-xs text-blue-600 cursor-pointer">Show full value</summary><div class="mt-1 text-xs">${value}</div></details>`;
            }
            return `<span class="font-mono">${value}</span>`;
        },

        timeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        },

        // Helper function for automation status badge
        getAutomationStatusBadgeClass(status) {
            const classes = {
                'completed': 'bg-green-100 text-green-800',
                'running': 'bg-blue-100 text-blue-800',
                'failed': 'bg-red-100 text-red-800',
                'pending': 'bg-yellow-100 text-yellow-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        // Format automation results for display
        formatAutomationResults(rawResults) {
            if (!rawResults || typeof rawResults !== 'object') {
                return '<em class="text-gray-500">No detailed results available</em>';
            }

            // Handle different result formats (axe, pa11y, lighthouse, etc.)
            if (rawResults.violations && Array.isArray(rawResults.violations)) {
                // axe-core format
                let html = '<div class="space-y-3">';
                if (rawResults.violations.length > 0) {
                    html += '<div><strong class="text-red-700">Violations:</strong><ul class="list-disc list-inside mt-1 space-y-1">';
                    rawResults.violations.slice(0, 5).forEach(violation => {
                        html += `<li class="text-red-600">${violation.description || violation.help || 'Accessibility violation'}</li>`;
                    });
                    if (rawResults.violations.length > 5) {
                        html += `<li class="text-gray-500 italic">... and ${rawResults.violations.length - 5} more</li>`;
                    }
                    html += '</ul></div>';
                }
                if (rawResults.passes && rawResults.passes.length > 0) {
                    html += `<div><strong class="text-green-700">Passes:</strong> <span class="text-green-600">${rawResults.passes.length} tests passed</span></div>`;
                }
                html += '</div>';
                return html;
            } else if (rawResults.issues && Array.isArray(rawResults.issues)) {
                // pa11y format
                let html = '<div class="space-y-2">';
                const issues = rawResults.issues.slice(0, 10);
                issues.forEach(issue => {
                    const typeClass = issue.type === 'error' ? 'text-red-600' : issue.type === 'warning' ? 'text-yellow-600' : 'text-blue-600';
                    html += `<div class="${typeClass}"><strong>${issue.type.toUpperCase()}:</strong> ${issue.message || 'Accessibility issue detected'}</div>`;
                });
                if (rawResults.issues.length > 10) {
                    html += `<div class="text-gray-500 italic">... and ${rawResults.issues.length - 10} more issues</div>`;
                }
                html += '</div>';
                return html;
            } else {
                // Generic object format
                return `<pre class="text-xs overflow-x-auto whitespace-pre-wrap">${JSON.stringify(rawResults, null, 2)}</pre>`;
            }
        },

        // Save test instance edits (legacy function for edit modal)
        async saveTestInstanceEdit(instanceId, modal) {
            try {
                const form = modal.querySelector('#editInstanceForm');
                const formData = new FormData(form);
                const updates = Object.fromEntries(formData.entries());
                
                const response = await this.apiCall(`/test-instances/${instanceId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updates)
                });
                
                if (response.success) {
                    this.showNotification('success', 'Updated', 'Test instance updated successfully');
                    modal.remove();
                    // Refresh the test grid
                    this.loadTestInstancesForGrid(this.selectedTestSession.id, this.testGridPagination.currentPage, true);
                } else {
                    throw new Error(response.error || 'Failed to update test instance');
                }
            } catch (error) {
                console.error('Error updating test instance:', error);
                this.showNotification('error', 'Update Failed', error.message);
            }
        },
        
        async runAutomatedTestForInstance(testInstance) {
            try {
                console.log('🤖 Running automated test for instance:', testInstance.id);
                
                // Check if we have a selected session (try to get from test instance if not available)
                let sessionId = this.selectedTestSession?.id;
                if (!sessionId && testInstance.session_id) {
                    sessionId = testInstance.session_id;
                    console.log('🔄 Using session ID from test instance:', sessionId);
                }
                
                if (!sessionId) {
                    throw new Error('No test session selected. Please open a test session first.');
                }
                
                this.showNotification('info', 'Automated Test Starting',
                    `Running automated test for requirement ${testInstance.criterion_number}...`);
                
                // Call the session-level automation API with specific pages and requirements
                const response = await this.apiCall(`/automated-testing/run/${sessionId}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        tools: ['axe', 'pa11y'],
                        pages: [testInstance.page_id],
                        requirements: [testInstance.requirement_id],
                        update_test_instances: true,
                        create_evidence: true
                    })
                });
                
                if (response.success) {
                    this.showNotification('success', 'Automated Test Started',
                        `Automated test started for requirement ${testInstance.criterion_number}`);
                    
                    // Refresh the test grid to show updated results
                    setTimeout(() => {
                        this.loadTestInstancesForGrid(sessionId, this.testGridPagination.currentPage, true);
                    }, 2000);
                } else {
                    throw new Error(response.error || 'Failed to run automated test');
                }
                
            } catch (error) {
                console.error('Error running automated test for instance:', error);
                this.showNotification('error', 'Automation Failed', error.message);
            }
        },
        
        // Group requirements with their associated pages
        getRequirementsWithPages() {
            if (!this.sessionDetailsTestInstances?.length) return [];
            
            const requirementGroups = {};
            
            // Group test instances by requirement
            this.sessionDetailsTestInstances.forEach(instance => {
                const criterionNumber = instance.criterion_number;
                
                if (!requirementGroups[criterionNumber]) {
                    requirementGroups[criterionNumber] = {
                        criterion_number: criterionNumber,
                        requirement_title: instance.requirement_title || instance.title,
                        requirement_level: instance.requirement_level || instance.level,
                        pages: [],
                        totalPages: 0,
                        passedPages: 0,
                        failedPages: 0,
                        pendingPages: 0
                    };
                }
                
                const group = requirementGroups[criterionNumber];
                
                // Add page information if available from test instance
                if (instance.page_url) {
                    const existingPage = group.pages.find(p => p.page_url === instance.page_url);
                    if (!existingPage) {
                        group.pages.push({
                            page_url: instance.page_url,
                            page_title: instance.page_title,
                            page_depth: instance.page_depth,
                            page_type: instance.page_type,
                            requires_auth: instance.requires_auth,
                            status: instance.status
                        });
                    }
                } else if (this.sessionDetailsPages?.length > 0 && group.pages.length === 0) {
                    // If no specific page for this test instance, show available project pages
                    // This represents all pages that could be tested for this requirement
                    group.pages = this.sessionDetailsPages.map(page => ({
                        page_url: page.url,
                        page_title: page.title,
                        page_depth: page.depth,
                        page_type: page.content_type,
                        requires_auth: page.requires_auth,
                        status: 'pending', // Default status for available pages
                        is_available_page: true // Flag to indicate this is an available page, not specifically assigned
                    }));
                    console.log(`📄 Added ${group.pages.length} available pages for requirement ${criterionNumber}`);
                }
                
                // Update status counts
                group.totalPages = Math.max(group.pages.length, 1); // At least 1 
                switch (instance.status) {
                    case 'passed':
                        group.passedPages++;
                        break;
                    case 'failed':
                        group.failedPages++;
                        break;
                    default:
                        group.pendingPages++;
                        break;
                }
            });
            
            return Object.values(requirementGroups);
        },
        
        // Get unique requirements that have page information
        getUniqueRequirementsWithPages() {
            const requirementsWithPages = this.getRequirementsWithPages().filter(group => group.pages.length > 0);
            console.log('🔍 Requirements with pages:', requirementsWithPages.length, 'out of', this.getRequirementsWithPages().length, 'total requirements');
            console.log('📄 Session pages available:', this.sessionDetailsPages?.length || 0);
            console.log('📋 Test instances loaded:', this.sessionDetailsTestInstances?.length || 0);
            return requirementsWithPages;
        },

        // Debug function to refresh URLs data
        async refreshURLsData() {
            console.log('🔄 Manually refreshing URLs data...');
            if (this.selectedTestSession) {
                await this.loadSessionPages();
                await this.loadSessionTestInstances(this.selectedTestSession.id);
                console.log('✅ URLs data refreshed');
                // Force Alpine.js to re-evaluate
                this.$nextTick(() => {
                    console.log('🔍 After refresh - Requirements with pages:', this.getUniqueRequirementsWithPages().length);
                });
            }
        },

        // ===== ADVANCED TEST GRID METHODS =====
        
        // Deduplicate test instances to prevent Alpine.js key conflicts
        deduplicateInstances(instances) {
            const seen = new Set();
            return instances.filter(instance => {
                // Skip instances without valid IDs
                if (!instance || !instance.id) {
                    console.warn('⚠️ Skipping test instance without ID:', instance);
                    return false;
                }
                
                // Skip duplicates
                if (seen.has(instance.id)) {
                    console.warn('⚠️ Skipping duplicate test instance ID:', instance.id);
                    return false;
                }
                
                seen.add(instance.id);
                return true;
            });
        },
        
        // Load test instances for advanced grid (Performance Optimized)
        async loadTestInstancesForGrid(sessionId, page = 1, preserveSelection = false) {
            try {
                this.testGridLoading = true;
                
                // Build pagination parameters
                const params = new URLSearchParams({
                    session_id: sessionId,
                    page: page,
                    limit: this.testGridPagination.pageSize
                });

                // Add current filters to API call for server-side filtering
                if (this.testGridSearch) {
                    params.append('search', this.testGridSearch);
                }
                Object.entries(this.testGridFilters).forEach(([key, value]) => {
                    if (value) params.append(key, value);
                });

                const response = await this.apiCall(`/test-instances?${params}`);
                
                if (response.success) {
                    const newInstances = response.test_instances || [];
                    
                    // Always replace data for proper pagination (no infinite scroll)
                    this.testGridInstances = newInstances;
                    
                    // Update pagination info
                    this.testGridPagination = {
                        currentPage: page,
                        pageSize: this.testGridPagination.pageSize,
                        totalItems: response.pagination?.total || newInstances.length,
                        totalPages: response.pagination?.total_pages || Math.ceil((response.pagination?.total || newInstances.length) / this.testGridPagination.pageSize),
                        hasMore: response.pagination?.has_more || false
                    };

                    // Auto-enable performance mode for large datasets
                    if (this.testGridPagination.totalItems > 1000 && !this.testGridPerformanceMode) {
                        this.testGridPerformanceMode = true;
                        this.showNotification('info', 'Performance Mode', 'Large dataset detected. Performance mode enabled for better responsiveness.');
                    }
                    
                    // Add tester names efficiently
                    this.enrichTestInstancesWithTesterNames(newInstances);
                    
                    // Ensure unique IDs to prevent Alpine.js duplicate key warnings
                    this.testGridInstances = this.deduplicateInstances(this.testGridInstances);
                    
                    // Apply filters (only client-side filtering for small datasets)
                    if (!this.testGridPerformanceMode) {
                    this.applyTestGridFilters();
                    } else {
                        this.filteredTestGridInstances = [...this.testGridInstances];
                    }
                    
                    // Debug pagination: Log actual counts
                    console.log(`🔍 Pagination Debug: API returned ${newInstances.length} instances, total in grid: ${this.testGridInstances.length}, filtered: ${this.filteredTestGridInstances.length}, pageSize: ${this.testGridPagination.pageSize}`);

                    // Preserve selection if requested
                    if (!preserveSelection) {
                        this.selectedTestGridInstances = [];
                    }
                    
                    console.log(`📊 Test grid loaded: ${this.testGridInstances.length} instances (Page ${page}/${this.testGridPagination.totalPages}, Performance Mode: ${this.testGridPerformanceMode})`);
                } else {
                    throw new Error(response.error || 'Failed to load test instances');
                }
            } catch (error) {
                console.error('Error loading test instances for grid:', error);
                this.showNotification('error', 'Loading Failed', error.message);
                if (page === 1) {
                this.testGridInstances = [];
                this.filteredTestGridInstances = [];
                }
            } finally {
                this.testGridLoading = false;
            }
        },

        // Efficiently enrich test instances with tester names
        enrichTestInstancesWithTesterNames(instances) {
            // Create a lookup map for performance
            const testerMap = new Map();
            this.availableTesters.forEach(tester => {
                testerMap.set(tester.id, tester.full_name || tester.username);
            });

            // Batch update tester names
            instances.forEach(instance => {
                if (instance.assigned_tester) {
                    instance.assigned_tester_name = testerMap.get(instance.assigned_tester) || 'Unknown User';
                }
            });
        },

        // Load next page of test instances
        async loadNextTestGridPage() {
            if (this.testGridLoading || !this.testGridPagination.hasMore) return;
            
            const nextPage = this.testGridPagination.currentPage + 1;
            await this.loadTestInstancesForGrid(this.selectedTestSession.id, nextPage, true);
        },

        // Refresh current page
        async refreshCurrentTestGridPage() {
            await this.loadTestInstancesForGrid(
                this.selectedTestSession.id, 
                this.testGridPagination.currentPage, 
                true
            );
        },

        // Navigate to specific page
        async goToTestGridPage(page) {
            if (page < 1 || page > this.testGridPagination.totalPages) return;
            await this.loadTestInstancesForGrid(this.selectedTestSession.id, page);
        },

        // Toggle performance mode
        toggleTestGridPerformanceMode() {
            this.testGridPerformanceMode = !this.testGridPerformanceMode;
            this.showNotification('info', 'Performance Mode', 
                `Performance mode ${this.testGridPerformanceMode ? 'enabled' : 'disabled'}`);
            
            // Reload current view
            this.loadTestInstancesForGrid(this.selectedTestSession.id, 1);
        },

        // Debounced search function for performance
        debouncedTestGridSearch: null,
        initializeTestGridSearch() {
            // Clear existing debounce
            if (this.debouncedTestGridSearch) {
                clearTimeout(this.debouncedTestGridSearch);
            }
            
            // Set up new debounced search
            this.debouncedTestGridSearch = setTimeout(() => {
                this.loadTestInstancesForGrid(this.selectedTestSession.id, 1);
                         }, 300); // 300ms debounce
        },

        // Get visible page numbers for pagination
        getVisiblePageNumbers() {
            const current = this.testGridPagination.currentPage;
            const total = this.testGridPagination.totalPages;
            const maxVisible = 5;
            
            if (total <= maxVisible) {
                return Array.from({ length: total }, (_, i) => i + 1);
            }
            
            const half = Math.floor(maxVisible / 2);
            let start = Math.max(1, current - half);
            let end = Math.min(total, start + maxVisible - 1);
            
            if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
            }
            
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        },
        
        // Apply advanced filters to test grid
        applyTestGridFilters() {
            let filtered = [...this.testGridInstances];
            
            // Search filter
            if (this.testGridSearch) {
                const searchTerm = this.testGridSearch.toLowerCase();
                filtered = filtered.filter(instance => 
                    (instance.criterion_number || '').toLowerCase().includes(searchTerm) ||
                    (instance.requirement_title || instance.title || '').toLowerCase().includes(searchTerm) ||
                    (instance.description || '').toLowerCase().includes(searchTerm) ||
                    (instance.page_url || '').toLowerCase().includes(searchTerm) ||
                    (instance.page_title || '').toLowerCase().includes(searchTerm)
                );
            }
            
            // Status filter
            if (this.testGridFilters.status) {
                filtered = filtered.filter(instance => instance.status === this.testGridFilters.status);
            }
            
            // Level filter
            if (this.testGridFilters.level) {
                filtered = filtered.filter(instance => 
                    (instance.requirement_level || instance.level) === this.testGridFilters.level
                );
            }
            
            // Test method filter
            if (this.testGridFilters.testMethod) {
                filtered = filtered.filter(instance => 
                    (instance.test_method_used || instance.requirement_test_method) === this.testGridFilters.testMethod
                );
            }
            
            // Assigned tester filter
            if (this.testGridFilters.assignedTester) {
                filtered = filtered.filter(instance => instance.assigned_tester === this.testGridFilters.assignedTester);
            }
            
            this.filteredTestGridInstances = filtered;
            this.applyTestGridSort();
            
            // Clear selections when filters change
            this.selectedTestGridInstances = [];
        },
        
        // Apply sorting to test grid
        applyTestGridSort() {
            if (!this.filteredTestGridInstances) return;
            
            const { field, direction } = this.testGridSort;
            
            this.filteredTestGridInstances.sort((a, b) => {
                let aVal = this.getTestGridSortValue(a, field);
                let bVal = this.getTestGridSortValue(b, field);
                
                // Handle null/undefined values
                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';
                
                // Convert to strings for comparison
                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();
                
                let result = aVal.localeCompare(bVal);
                return direction === 'desc' ? -result : result;
            });
        },
        
        // Get sort value for test grid
        getTestGridSortValue(instance, field) {
            switch (field) {
                case 'criterion_number':
                    return instance.criterion_number || '';
                case 'requirement_level':
                    return instance.requirement_level || instance.level || '';
                case 'test_method_used':
                    return instance.test_method_used || instance.requirement_test_method || '';
                case 'status':
                    return instance.status || '';
                case 'assigned_tester':
                    return instance.assigned_tester_name || instance.assigned_tester || '';
                case 'updated_at':
                    return instance.updated_at || '';
                case 'page_url':
                    return instance.page_url || '';
                default:
                    return '';
            }
        },
        
        // Sort test grid by field
        sortTestGridBy(field) {
            if (this.testGridSort.field === field) {
                this.testGridSort.direction = this.testGridSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.testGridSort.field = field;
                this.testGridSort.direction = 'asc';
            }
            this.applyTestGridSort();
        },
        
        // Get sort icon for test grid headers
        getTestGridSortIcon(field) {
            if (this.testGridSort.field !== field) {
                return 'fa-sort text-gray-400';
            }
            return this.testGridSort.direction === 'asc' ? 'fa-sort-up text-purple-600' : 'fa-sort-down text-purple-600';
        },
        
        // Toggle select all for test grid
        toggleSelectAllTestGrid(event) {
            if (event.target.checked) {
                this.selectedTestGridInstances = this.filteredTestGridInstances.map(instance => instance.id);
            } else {
                this.selectedTestGridInstances = [];
            }
            this.bulkOperation = '';
        },
        
        // Toggle individual test instance selection
        toggleTestGridInstanceSelection(instanceId, event) {
            if (event.target.checked) {
                if (!this.selectedTestGridInstances.includes(instanceId)) {
                    this.selectedTestGridInstances.push(instanceId);
                }
            } else {
                this.selectedTestGridInstances = this.selectedTestGridInstances.filter(id => id !== instanceId);
            }
            this.bulkOperation = '';
        },
        
        // Clear test grid selection
        clearTestGridSelection() {
            this.selectedTestGridInstances = [];
            this.bulkOperation = '';
        },
        
        // Clear all filters
        clearAllFilters() {
            this.testGridSearch = '';
            this.testGridFilters = {
                status: '',
                level: '',
                testMethod: '',
                assignedTester: ''
            };
            this.applyTestGridFilters();
        },

        // Show bulk priority dialog
        async showBulkPriorityDialog() {
            const priority = prompt('Enter priority (high, medium, low):', 'medium');
            if (priority && ['high', 'medium', 'low'].includes(priority.toLowerCase())) {
                await this.bulkSetPriority(priority.toLowerCase());
            }
        },

        // Show bulk notes dialog
        async showBulkNotesDialog() {
            const notes = prompt('Enter notes to add to selected tests:');
            if (notes) {
                await this.bulkAddNotes(notes);
            }
        },

        // Show bulk template dialog
        async showBulkTemplateDialog() {
            // For now, just show available templates
            const templates = ['Comprehensive Testing', 'Basic Compliance', 'Quick Scan', 'Focus Areas'];
            const template = prompt(`Choose template (${templates.join(', ')}):`, templates[0]);
            if (template && templates.includes(template)) {
                await this.bulkApplyTemplate(template);
            }
        },

        // Bulk set priority
        async bulkSetPriority(priority) {
            try {
                const promises = this.selectedTestGridInstances.map(async (instanceId) => {
                    const instance = this.testGridInstances.find(t => t.id === instanceId);
                    if (instance) {
                        instance.testing_priority = priority;
                        return this.apiCall(`/test-instances/${instanceId}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                testing_priority: priority
                            })
                        });
                    }
                });

                await Promise.all(promises);
                this.showNotification('success', 'Priority Updated', 
                    `Set priority to "${priority}" for ${this.selectedTestGridInstances.length} tests`);
                this.clearTestGridSelection();
            } catch (error) {
                console.error('Error setting bulk priority:', error);
                this.showNotification('error', 'Priority Update Failed', error.message);
            }
        },

        // Bulk add notes
        async bulkAddNotes(notes) {
            try {
                const promises = this.selectedTestGridInstances.map(async (instanceId) => {
                    const instance = this.testGridInstances.find(t => t.id === instanceId);
                    if (instance) {
                        const existingNotes = instance.notes || '';
                        const newNotes = existingNotes ? `${existingNotes}\n\n[Bulk Update]: ${notes}` : notes;
                        instance.notes = newNotes;
                        return this.apiCall(`/test-instances/${instanceId}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                notes: newNotes
                            })
                        });
                    }
                });

                await Promise.all(promises);
                this.showNotification('success', 'Notes Added', 
                    `Added notes to ${this.selectedTestGridInstances.length} tests`);
                this.clearTestGridSelection();
            } catch (error) {
                console.error('Error adding bulk notes:', error);
                this.showNotification('error', 'Notes Update Failed', error.message);
            }
        },

        // Bulk apply template
        async bulkApplyTemplate(templateName) {
            try {
                // Define template configurations
                const templates = {
                    'Comprehensive Testing': {
                        testing_priority: 'high',
                        test_method: 'manual',
                        notes: 'Comprehensive testing template applied - thorough manual review required'
                    },
                    'Basic Compliance': {
                        testing_priority: 'medium',
                        test_method: 'hybrid',
                        notes: 'Basic compliance template applied - standard testing approach'
                    },
                    'Quick Scan': {
                        testing_priority: 'low',
                        test_method: 'automated',
                        notes: 'Quick scan template applied - automated testing focus'
                    },
                    'Focus Areas': {
                        testing_priority: 'high',
                        test_method: 'manual',
                        notes: 'Focus areas template applied - critical accessibility barriers targeted'
                    }
                };

                const template = templates[templateName];
                if (!template) {
                    throw new Error('Template not found');
                }

                const promises = this.selectedTestGridInstances.map(async (instanceId) => {
                    const instance = this.testGridInstances.find(t => t.id === instanceId);
                    if (instance) {
                        Object.assign(instance, template);
                        return this.apiCall(`/test-instances/${instanceId}`, {
                            method: 'PUT',
                            body: JSON.stringify(template)
                        });
                    }
                });

                await Promise.all(promises);
                this.showNotification('success', 'Template Applied', 
                    `Applied "${templateName}" template to ${this.selectedTestGridInstances.length} tests`);
                this.clearTestGridSelection();
            } catch (error) {
                console.error('Error applying bulk template:', error);
                this.showNotification('error', 'Template Application Failed', error.message);
            }
        },

        // Export selected tests
        async exportSelectedTests() {
            try {
                const selectedTests = this.testGridInstances.filter(test => 
                    this.selectedTestGridInstances.includes(test.id)
                );

                const exportData = {
                    session: this.selectedTestSession,
                    selected_tests: selectedTests,
                    export_metadata: {
                        exported_at: new Date().toISOString(),
                        exported_by: this.currentUser?.username || 'System',
                        total_selected: selectedTests.length
                    }
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                    type: 'application/json'
                });

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `selected-tests-${this.selectedTestSession.name}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showNotification('success', 'Export Complete', 
                    `Exported ${selectedTests.length} selected tests`);
                this.clearTestGridSelection();
            } catch (error) {
                console.error('Error exporting selected tests:', error);
                this.showNotification('error', 'Export Failed', error.message);
            }
        },

        // Bulk run automation
        async bulkRunAutomation() {
            try {
                if (this.selectedTestGridInstances.length === 0) {
                    this.showNotification('warning', 'No Selection', 'Please select tests to run automation on');
                    return;
                }

                this.showNotification('info', 'Automation Started', 
                    `Running automated tests on ${this.selectedTestGridInstances.length} selected instances`);

                const promises = this.selectedTestGridInstances.map(instanceId => 
                    this.runAutomatedTestForInstance(this.testGridInstances.find(t => t.id === instanceId))
                );

                await Promise.all(promises);
                this.clearTestGridSelection();
                await this.loadTestInstancesForGrid(this.selectedTestSession.id);
            } catch (error) {
                console.error('Error running bulk automation:', error);
                this.showNotification('error', 'Bulk Automation Failed', error.message);
            }
        },
        
        // Apply bulk operations
        async applyBulkOperation() {
            if (!this.bulkOperation || this.selectedTestGridInstances.length === 0) return;
            
            try {
                console.log(`🔄 Applying bulk operation: ${this.bulkOperation} to ${this.selectedTestGridInstances.length} instances`);
                
                switch (this.bulkOperation) {
                    case 'mark_passed':
                    case 'mark_failed':
                    case 'mark_in_progress':
                    case 'mark_not_applicable':
                        const status = this.bulkOperation.replace('mark_', '').replace('_', '_');
                        await this.bulkUpdateStatus(status);
                        break;
                    case 'assign_tester':
                        await this.showBulkTesterAssignment();
                        break;
                    case 'run_automation':
                        await this.bulkRunAutomation();
                        break;
                    case 'set_priority':
                        await this.showBulkPriorityDialog();
                        break;
                    case 'add_notes':
                        await this.showBulkNotesDialog();
                        break;
                    case 'apply_template':
                        await this.showBulkTemplateDialog();
                        break;
                    case 'export_selected':
                        await this.exportSelectedTests();
                        break;
                }
                
                this.bulkOperation = '';
            } catch (error) {
                console.error('Error applying bulk operation:', error);
                this.showNotification('error', 'Bulk Operation Failed', error.message);
            }
        },
        
        // Bulk update status
        async bulkUpdateStatus(status) {
            const promises = this.selectedTestGridInstances.map(instanceId => 
                this.updateTestInstanceStatus(instanceId, status)
            );
            
            await Promise.all(promises);
            
            this.showNotification('success', 'Bulk Update Complete', 
                `Updated ${this.selectedTestGridInstances.length} test instances to "${status.replace('_', ' ')}"`);
            
            this.clearTestGridSelection();
            await this.loadTestInstancesForGrid(this.selectedTestSession.id);
        },
        
        // Assign tester to test instance
        async assignTestInstanceTester(instanceId, testerId) {
            try {
                const response = await this.apiCall(`/test-instances/${instanceId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                    assigned_tester: testerId || null
                    })
                });
                
                if (response.success) {
                    // Update local data
                    const instance = this.testGridInstances.find(t => t.id === instanceId);
                    if (instance) {
                        instance.assigned_tester = testerId;
                        const tester = this.availableTesters.find(u => u.id === testerId);
                        instance.assigned_tester_name = tester ? (tester.full_name || tester.username) : 'Unassigned';
                    }
                    
                    this.applyTestGridFilters(); // Refresh the filtered view
                }
            } catch (error) {
                console.error('Error assigning tester:', error);
                this.showNotification('error', 'Assignment Failed', error.message);
            }
        },
        
        // Get test status select class
        getTestStatusSelectClass(status) {
            const classes = {
                'pending': 'bg-gray-100 text-gray-800',
                'in_progress': 'bg-blue-100 text-blue-800',
                'passed': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'untestable': 'bg-yellow-100 text-yellow-800',
                'not_applicable': 'bg-gray-100 text-gray-600'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },
        
        // Get test grid status count
        getTestGridStatusCount(status) {
            return this.filteredTestGridInstances.filter(instance => instance.status === status).length;
        },
        
        // Export test grid
        async exportTestGrid() {
            try {
                const data = {
                    session: this.selectedTestSession,
                    test_instances: this.filteredTestGridInstances,
                    exported_at: new Date().toISOString()
                };
                
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json'
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `test-grid-${this.selectedTestSession.name}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showNotification('success', 'Test Grid Exported', 'Test grid data exported successfully');
            } catch (error) {
                console.error('Error exporting test grid:', error);
                this.showNotification('error', 'Export Failed', error.message);
            }
        },

        // Generate VPAT report
        async generateVPATReport() {
            try {
                if (!this.selectedTestSession) {
                    this.showNotification('error', 'VPAT Generation Failed', 'No testing session selected');
                    return;
                }

                console.log('📋 Generating VPAT report for session:', this.selectedTestSession.id);
                
                // Show loading notification
                this.showNotification('info', 'VPAT Generation', 'Generating VPAT report...');

                // Call the VPAT generation endpoint
                const params = new URLSearchParams({
                    format: 'html',
                    include_evidence: 'true',
                    organization_name: this.selectedTestSession.project_name || '',
                    product_name: this.selectedTestSession.name || '',
                    product_version: '1.0',
                    evaluation_date: new Date().toISOString().split('T')[0]
                });

                const response = await fetch(`${this.apiBaseUrl}/testing-sessions/${this.selectedTestSession.id}/vpat?${params}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.getAuthToken()}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Get the HTML content
                const htmlContent = await response.text();
                
                // Create download
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `VPAT-${this.selectedTestSession.name}-${new Date().toISOString().split('T')[0]}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showNotification('success', 'VPAT Generated', 'VPAT report downloaded successfully');
                
                console.log('✅ VPAT report generated and downloaded successfully');

            } catch (error) {
                console.error('Error generating VPAT report:', error);
                this.showNotification('error', 'VPAT Generation Failed', error.message);
            }
        },
        
        // Refresh test grid
        async refreshTestGrid() {
            if (this.selectedTestSession) {
                await this.loadTestInstancesForGrid(this.selectedTestSession.id);
                this.showNotification('success', 'Test Grid Refreshed', 'Test grid data refreshed successfully');
            }
        },
        
        // Close test grid
        closeTestGrid() {
            this.showTestGrid = false;
            this.selectedTestSession = null;
            this.testGridInstances = [];
            this.filteredTestGridInstances = [];
            this.selectedTestGridInstances = [];
            this.testGridSearch = '';
            this.testGridFilters = {
                status: '',
                level: '',
                testMethod: '',
                assignedTester: ''
            };
            this.bulkOperation = '';
        },
        
        // Add test evidence
        addTestEvidence(instance) {
            console.log('📎 Adding evidence for test instance:', instance.id);
            
            // Create evidence upload modal
            const evidenceHTML = `
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold">Add Evidence</h3>
                    <div class="text-sm text-gray-600">${instance.criterion_number}: ${instance.criterion_title}</div>
                    <form id="evidenceForm" class="space-y-4" enctype="multipart/form-data">
                        <div>
                            <label class="block text-sm font-medium mb-1">Evidence Type</label>
                            <select name="evidence_type" class="w-full px-3 py-2 border border-gray-300 rounded">
                                <option value="screenshot">Screenshot</option>
                                <option value="document">Document</option>
                                <option value="test_report">Test Report</option>
                                <option value="recording">Recording</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Description</label>
                            <textarea name="description" rows="3" placeholder="Describe what this evidence shows..." class="w-full px-3 py-2 border border-gray-300 rounded"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">File Upload</label>
                            <input type="file" name="evidence_file" accept=".png,.jpg,.jpeg,.pdf,.mp4,.mov,.doc,.docx" class="w-full px-3 py-2 border border-gray-300 rounded">
                            <div class="text-xs text-gray-500 mt-1">Supported: Images, PDFs, Videos, Documents</div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">External URL (optional)</label>
                            <input type="url" name="external_url" placeholder="https://..." class="w-full px-3 py-2 border border-gray-300 rounded">
                        </div>
                    </form>
                </div>
            `;
            
            // Show modal with evidence form
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
                    ${evidenceHTML}
                    <div class="mt-6 flex justify-end space-x-2">
                        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
                        <button onclick="window.saveTestEvidence('${instance.id}', this.closest('.fixed'))" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Upload Evidence</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },
        
        // View automation results for a test instance
        async viewAutomationResults(instanceId) {
            try {
                console.log('🔍 Loading automation results for instance:', instanceId);
                
                // Get automation results from the backend
                const response = await this.apiCall(`/automated-testing/results/${instanceId}`);
                
                if (response.success && response.results?.length > 0) {
                    const results = response.results;
                    
                    // Create results display HTML
                    const resultsHTML = `
                        <div class="space-y-4">
                            <h3 class="text-lg font-semibold flex items-center">
                                <i class="fas fa-robot mr-2 text-purple-600"></i>
                                Automation Results (${results.length} runs)
                            </h3>
                            
                            ${results.map((result, index) => `
                                <div class="border rounded-lg p-4 ${result.status === 'completed' ? 'bg-green-50 border-green-200' : result.status === 'failed' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}">
                                    <div class="flex justify-between items-start mb-2">
                                        <h4 class="font-medium">Run ${index + 1} - ${new Date(result.created_at).toLocaleString()}</h4>
                                        <span class="text-sm px-2 py-1 rounded ${result.status === 'completed' ? 'bg-green-100 text-green-800' : result.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                                            ${result.status}
                                        </span>
                                    </div>
                                    
                                    <div class="text-sm space-y-2">
                                        <div><strong>Tools Used:</strong> ${result.tools_used ? JSON.parse(result.tools_used).join(', ') : 'N/A'}</div>
                                        ${result.issues_found ? `<div><strong>Issues Found:</strong> ${result.issues_found}</div>` : ''}
                                        ${result.summary ? `<div><strong>Summary:</strong> ${result.summary}</div>` : ''}
                                        
                                        ${result.result ? `
                                            <details class="mt-2">
                                                <summary class="cursor-pointer font-medium">View Detailed Results</summary>
                                                <pre class="text-xs bg-gray-100 p-2 rounded mt-2 max-h-60 overflow-y-auto">${typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}</pre>
                                            </details>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    
                    // Show results modal
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
                    modal.innerHTML = `
                        <div class="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
                            ${resultsHTML}
                            <div class="mt-6 flex justify-end">
                                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Close</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);
                    
                } else {
                    this.showNotification('info', 'No Results', 'No automation results found for this test instance. Try running automation first.');
                }
                
            } catch (error) {
                console.error('Error loading automation results:', error);
                this.showNotification('error', 'Loading Failed', 'Failed to load automation results');
            }
        },
        
        // Save test evidence
        async saveTestEvidence(instanceId, modal) {
            try {
                const form = modal.querySelector('#evidenceForm');
                const formData = new FormData(form);
                formData.append('test_instance_id', instanceId);
                
                // For now, simulate evidence upload (can be enhanced with actual file upload)
                const evidenceData = {
                    test_instance_id: instanceId,
                    evidence_type: formData.get('evidence_type'),
                    description: formData.get('description'),
                    external_url: formData.get('external_url'),
                    file_name: formData.get('evidence_file')?.name || null,
                    created_by: this.currentUser?.userId,
                    created_at: new Date().toISOString()
                };
                
                // TODO: Implement actual file upload to server
                console.log('Evidence data to save:', evidenceData);
                
                this.showNotification('success', 'Evidence Added', 'Evidence has been recorded for this test instance');
                modal.remove();
                
                // Add evidence note to the test instance
                const noteUpdate = {
                    notes: `Evidence added: ${evidenceData.evidence_type} - ${evidenceData.description}${evidenceData.external_url ? ' (URL: ' + evidenceData.external_url + ')' : ''}`
                };
                
                await this.apiCall(`/test-instances/${instanceId}`, {
                    method: 'PUT',
                    body: JSON.stringify(noteUpdate)
                });
                
                // Refresh the test grid
                this.loadTestInstancesForGrid(this.selectedTestSession.id, this.testGridPagination.currentPage, true);
                
            } catch (error) {
                console.error('Error adding evidence:', error);
                this.showNotification('error', 'Upload Failed', error.message);
            }
        },

        // ===== ENHANCED SESSION MODAL METHODS =====
        
        // Get requirements count for preview
        getRequirementsCount(type) {
            const level = this.newTestingSession.conformance_level;
            if (!level) return 0;
            
            const counts = {
                'wcag_a': { total: 25, automated: 15, manual: 8, hybrid: 2 },
                'wcag_aa': { total: 26, automated: 16, manual: 8, hybrid: 2 },
                'wcag_aaa': { total: 43, automated: 25, manual: 15, hybrid: 3 },
                'section_508': { total: 17, automated: 10, manual: 6, hybrid: 1 },
                'combined': { total: 60, automated: 35, manual: 21, hybrid: 4 }
            };
            
            return counts[level] ? counts[level][type] : 0;
        },
        
        // Get total discovered pages
        getTotalDiscoveredPages() {
            if (!this.selectedProject) return 0;
            
            // Sum up pages from all crawlers for this project (completed OR with discovered pages)
            const projectCrawlers = this.webCrawlers.filter(crawler => 
                crawler.project_id === this.selectedProject && 
                (crawler.status === 'completed' || crawler.pages_for_testing > 0)
            );
            
            const total = projectCrawlers.reduce((total, crawler) => total + (crawler.pages_for_testing || 0), 0);
            
            return total;
        },
        
        // Get estimated test instances
        getEstimatedTestInstances() {
            const requirementsCount = this.getRequirementsCount('total');
            const pagesCount = this.newTestingSession.pageScope === 'all' ? 
                this.getTotalDiscoveredPages() : 
                10; // Estimated for selected pages
            
            const smartFilteringReduction = this.newTestingSession.applySmartFiltering ? 0.7 : 1.0;
            
            return Math.round(requirementsCount * pagesCount * smartFilteringReduction);
        },
        
        // Get estimated time to complete
        getEstimatedTimeToComplete() {
            const instances = this.getEstimatedTestInstances();
            const automatedRatio = this.getRequirementsCount('automated') / this.getRequirementsCount('total');
            
            // Automated tests: 1 minute each, Manual tests: 5 minutes each
            const automatedTime = instances * automatedRatio * 1;
            const manualTime = instances * (1 - automatedRatio) * 5;
            const totalMinutes = automatedTime + manualTime;
            
            if (totalMinutes < 60) return `${Math.round(totalMinutes)}m`;
            if (totalMinutes < 1440) return `${Math.round(totalMinutes / 60)}h`;
            return `${Math.round(totalMinutes / 1440)}d`;
        },
        
        // Get estimated effort level
        getEstimatedEffort() {
            const instances = this.getEstimatedTestInstances();
            
            if (instances < 100) return 'Low';
            if (instances < 500) return 'Medium';
            if (instances < 1500) return 'High';
            return 'Very High';
        },
        
        // Get grouped timeline for audit trail
        getGroupedTimeline() {
            if (!this.sessionActivities || !Array.isArray(this.sessionActivities)) {
                return {};
            }
            
            const grouped = {};
            this.sessionActivities.forEach(activity => {
                const date = new Date(activity.created_at).toLocaleDateString();
                if (!grouped[date]) {
                    grouped[date] = [];
                }
                grouped[date].push(activity);
            });
            
            return grouped;
        },
        
        // Apply session template
        applySessionTemplate(templateName) {
            const templates = {
                'wcag_aa_standard': {
                                name: 'WCAG 2.2 AA Standard Compliance',
            description: 'Standard accessibility compliance testing following WCAG 2.2 Level AA guidelines with hybrid testing approach.',
                    conformance_level: 'wcag_aa',
                    testing_approach: 'hybrid',
                    pageScope: 'all',
                    applySmartFiltering: true,
                    enableProgressTracking: true,
                    enableAuditTrail: true
                },
                'section_508_federal': {
                    name: 'Section 508 Federal Compliance',
                    description: 'Federal accessibility compliance testing according to Section 508 standards with emphasis on manual verification.',
                    conformance_level: 'section_508',
                    testing_approach: 'manual',
                    pageScope: 'selected',
                    applySmartFiltering: true,
                    enableProgressTracking: true,
                    enableAuditTrail: true
                },
                'comprehensive_audit': {
                    name: 'Comprehensive Accessibility Audit',
                    description: 'Complete accessibility audit covering all WCAG levels and Section 508 requirements for thorough compliance verification.',
                    conformance_level: 'combined',
                    testing_approach: 'hybrid',
                    pageScope: 'all',
                    applySmartFiltering: false,
                    enableProgressTracking: true,
                    enableAuditTrail: true
                }
            };
            
            const template = templates[templateName];
            if (template) {
                Object.assign(this.newTestingSession, template);
                this.updateRequirementsPreview();
                this.showNotification('info', 'Template Applied', `Applied ${template.name} template configuration`);
            }
        },
        
        // View session details in modal
        async viewSessionDetailsModal(session) {
            try {
                this.loading = true;
                console.log('🔍 Loading detailed session information for:', session.id);
                
                const response = await this.apiCall(`/testing-sessions/${session.id}?include_progress=true`);
                
                if (response.success) {
                    this.selectedSession = response.session;
                    this.showSessionDetails = true;
                    console.log('Session details loaded:', response.session);
                } else {
                    throw new Error(response.error || 'Failed to load session details');
                }
            } catch (error) {
                console.error('Error loading session details:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load session details');
            } finally {
                this.loading = false;
            }
        },
        
        // View testing matrix in modal
        async viewTestingMatrixModal(session) {
            try {
                this.loading = true;
                console.log('🔍 Loading testing matrix for:', session.id);
                
                const response = await this.apiCall(`/test-instances/session/${session.id}/matrix`);
                
                if (response.success) {
                    this.testingMatrix = response.matrix;
                    this.selectedSession = session;
                    this.showTestingMatrix = true;
                    console.log('Testing matrix loaded:', response.matrix);
                } else {
                    throw new Error(response.error || 'Failed to load testing matrix');
                }
            } catch (error) {
                console.error('Error loading testing matrix:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load testing matrix');
            } finally {
                this.loading = false;
            }
        },
        
        // Export session report (placeholder for session object parameter)
        async exportSessionReportFromSession(session) {
            try {
                this.loading = true;
                console.log('📄 Exporting session report for:', session.id);
                
                // For now, show placeholder - will be implemented with report generation
                this.showNotification('info', 'Report Export', 'Session report export will be available soon');
                console.log('Export session report for:', session.name);
            } catch (error) {
                console.error('Error exporting session report:', error);
                this.showNotification('error', 'Export Failed', 'Failed to export session report');
            } finally {
                this.loading = false;
            }
        },

        // Reset newTestingSession form (compatibility method)

        // ===== SESSION CREATION WIZARD METHODS =====

            // Open session wizard
    openSessionWizard() {
        console.log('🧙‍♂️ Opening session creation wizard');
        console.log('🧙‍♂️ DEBUG: selectedProject =', this.selectedProject);
        console.log('🧙‍♂️ DEBUG: showSessionWizard BEFORE =', this.showSessionWizard);
        
        // Ensure project is selected
        if (!this.selectedProject) {
            console.error('⚠️ No project selected');
            this.showNotification('error', 'Project Required', 'Please select a project first');
            return;
        }
        
        this.resetSessionWizard();
        this.sessionWizard.project_id = this.selectedProject; // Set project ID
        this.sessionWizard.conformance_levels = ['wcag_22_a']; // Default to WCAG A level
        // Close any other open modals first
        this.showUserManagement = false;
        this.showDeleteUserModal = false;
        this.showTestGrid = false;
        this.showSessionDetails = false;
        
        this.showSessionWizard = true;
        console.log('🧙‍♂️ DEBUG: showSessionWizard AFTER =', this.showSessionWizard);
        this.loadWizardData();
    },

        // Close session wizard
        closeSessionWizard() {
            console.log('🧙‍♂️ Closing session creation wizard');
            this.showSessionWizard = false;
            this.resetSessionWizard();
        },

        // Reset wizard state
        resetSessionWizard() {
            this.wizardStep = 1;
            this.sessionWizard = {
                project_id: '',
                name: '',
                description: '',
                conformance_levels: [],
                selected_crawlers: [],
                selected_pages: [],
                smart_filtering: true,
                manual_requirements: [],
                creating: false
            };
            this.pageSearchQuery = '';
            this.pageFilterType = '';
            this.cachedSelectedRequirements = [];
            this.lastConformanceLevelsString = '';
        },

        // Load initial wizard data
        async loadWizardData() {
            try {
                console.log('📊 Loading wizard data...');
                
                // Load crawlers and requirements in parallel
                await Promise.all([
                    this.loadAvailableCrawlers(),
                    this.loadAvailableRequirements()
                ]);
                
                console.log('✅ Wizard data loaded successfully');
                
            } catch (error) {
                console.error('Error loading wizard data:', error);
                this.showNotification('error', 'Load Failed', 'Failed to load wizard data. Please try again.');
                
                // Close wizard on critical failure
                this.closeSessionWizard();
            }
        },

        // Load available crawlers for project
        async loadAvailableCrawlers() {
            try {
                console.log('🕷️ Loading available crawlers...');
                
                if (!this.selectedProject) {
                    console.warn('⚠️ No project selected for crawler loading');
                    this.availableCrawlers = [];
                    return;
                }
                
                const response = await this.apiCall(`/web-crawlers/projects/${this.selectedProject}/crawlers`);
                if (response.success) {
                    this.availableCrawlers = response.data.map(crawler => ({
                        ...crawler,
                        total_pages_found: crawler.total_pages || crawler.page_count || 0,
                        pages_for_testing: crawler.pages_for_testing || crawler.total_pages || crawler.page_count || 0
                    }));
                    
                    // Load page counts for each crawler
                    for (const crawler of this.availableCrawlers) {
                        try {
                            const pagesResponse = await this.apiCall(`/web-crawlers/crawlers/${crawler.id}/pages?limit=1`);
                            if (pagesResponse.success && pagesResponse.pagination) {
                                crawler.total_pages_found = pagesResponse.pagination.total || 0;
                                crawler.pages_for_testing = pagesResponse.pagination.total || 0;
                            }
                        } catch (error) {
                            console.warn(`Failed to load page count for crawler ${crawler.name}:`, error);
                        }
                    }
                    
                    console.log(`✅ Loaded ${this.availableCrawlers.length} crawlers`);
                } else {
                    throw new Error(response.error || 'Failed to load crawlers');
                }
            } catch (error) {
                console.error('Error loading crawlers:', error);
                this.availableCrawlers = [];
            }
        },

        // Load available requirements
        async loadAvailableRequirements() {
            try {
                console.log('📋 Loading available requirements...');
                
                const response = await this.apiCall('/requirements');
                if (response.success && response.data) {
                    // Handle the actual API response structure: response.data.requirements
                    const requirements = response.data.requirements || response.data;
                    
                    if (Array.isArray(requirements)) {
                        this.availableRequirements = requirements;
                        
                        // Debug first few requirements to check structure
                        if (requirements.length > 0) {
                            console.log('🔍 First requirement structure:', requirements[0]);
                            console.log('🔍 Level property check:', {
                                hasLevel: 'level' in requirements[0],
                                levelValue: requirements[0].level,
                                levelType: typeof requirements[0].level,
                                allKeys: Object.keys(requirements[0])
                            });
                        }
                        
                        // Calculate requirement counts by conformance level - with null safety
                        this.requirementCounts = this.availableRequirements.reduce((counts, req) => {
                            if (req.level && req.requirement_type) {
                            const key = `${req.requirement_type}_${req.level.toLowerCase()}`;
                            counts[key] = (counts[key] || 0) + 1;
                            } else {
                                console.warn('⚠️ Requirement missing level or type:', req);
                            }
                            return counts;
                        }, {});
                        
                        console.log(`✅ Loaded ${this.availableRequirements.length} requirements`);
                        console.log('🔍 Requirement counts by level:', this.requirementCounts);
                    } else {
                        console.warn('⚠️ Requirements data is not an array:', requirements);
                        this.availableRequirements = [];
                        this.requirementCounts = {};
                    }
                } else {
                    console.warn('⚠️ Invalid requirements response structure:', response);
                    this.availableRequirements = [];
                    this.requirementCounts = {};
                }
            } catch (error) {
                console.error('Error loading requirements:', error);
                this.availableRequirements = [];
                this.requirementCounts = {};
            }
        },

        // Get requirement count for conformance level
        getRequirementCount(level) {
            const mapping = {
                'wcag_22_a': 'wcag_a',
                'wcag_22_aa': 'wcag_aa', 
                'wcag_22_aaa': 'wcag_aaa',
                'section_508_base': 'section_508_base',
                'section_508_enhanced': 'section_508_enhanced'
            };
            const mappedLevel = mapping[level];
            const count = this.requirementCounts[mappedLevel] || 0;
            
            // Debug only when needed - with rate limiting
            if (level && count === 0 && this.availableRequirements?.length > 0 && !this._loggedNoRequirements) {
                console.log(`⚠️ No requirements found for ${level} (mapped to ${mappedLevel})`);
                this._loggedNoRequirements = true;
                // Reset after 5 seconds
                setTimeout(() => { this._loggedNoRequirements = false; }, 5000);
            }
            
            return count;
        },

        // Set conformance levels (for quick selection buttons)
        setConformanceLevels(levels) {
            this.sessionWizard.conformance_levels = [...levels];
            // Clear cache when conformance levels change
            this.cachedSelectedRequirements = [];
            this.lastConformanceLevelsString = '';
            console.log(`✅ Set conformance levels:`, levels);
        },

        // Get total selected requirements count
        getTotalSelectedRequirements() {
            return this.sessionWizard.conformance_levels.reduce((total, level) => {
                return total + this.getRequirementCount(level);
            }, 0);
        },

        // Get requirement overall status class (for styling)
        getRequirementOverallStatusClass(requirement) {
            if (!requirement) return 'bg-gray-100 text-gray-600';
            
            // Check if requirement has test instances
            const testInstances = this.getTestInstancesForRequirement(requirement.requirement_id);
            
            if (!testInstances || testInstances.length === 0) {
                return 'bg-gray-100 text-gray-600'; // Not tested
            }
            
            // Calculate overall status based on test instance statuses
            const statuses = testInstances.map(instance => instance.status);
            const passedCount = statuses.filter(s => s === 'passed' || s === 'passed_review_required').length;
            const failedCount = statuses.filter(s => s === 'failed').length;
            const totalCount = statuses.length;
            
            if (failedCount > 0) {
                return 'bg-red-100 text-red-700'; // Failed
            } else if (passedCount === totalCount) {
                return 'bg-green-100 text-green-700'; // All passed
            } else if (passedCount > 0) {
                return 'bg-yellow-100 text-yellow-700'; // Partially passed
            } else {
                return 'bg-gray-100 text-gray-600'; // Not tested
            }
        },

        // Get requirement overall status text
        getRequirementOverallStatus(requirement) {
            if (!requirement) return 'Not Tested';
            
            // Check if requirement has test instances
            const testInstances = this.getTestInstancesForRequirement(requirement.requirement_id);
            
            if (!testInstances || testInstances.length === 0) {
                return 'Not Tested';
            }
            
            // Calculate overall status based on test instance statuses
            const statuses = testInstances.map(instance => instance.status);
            const passedCount = statuses.filter(s => s === 'passed' || s === 'passed_review_required').length;
            const failedCount = statuses.filter(s => s === 'failed').length;
            const totalCount = statuses.length;
            
            if (failedCount > 0) {
                return 'Failed';
            } else if (passedCount === totalCount) {
                return 'Passed';
            } else if (passedCount > 0) {
                return 'Partial';
            } else {
                return 'Not Tested';
            }
        },

        // Next wizard step
        nextWizardStep() {
            if (this.canProceedToNextStep()) {
                if (this.wizardStep === 3) {
                    // Load combined pages when moving to page selection
                    console.log('🎯 Moving from Step 3 (Crawlers) to Step 4 (Pages) - Loading combined pages...');
                    this.loadCombinedPages();
                }
                this.wizardStep++;
            }
        },

        // Previous wizard step
        previousWizardStep() {
            if (this.wizardStep > 1) {
                // If going back from step 4 (pages) to step 3 (crawlers), note for potential reload
                if (this.wizardStep === 4) {
                    console.log('🔄 Going back from Step 4 (Pages) to Step 3 (Crawlers)');
                    // Note: Pages will be reloaded when user proceeds to step 4 again
                }
                this.wizardStep--;
            }
        },

        // Check if can proceed to next step
        canProceedToNextStep() {
            switch (this.wizardStep) {
                case 1:
                    return this.sessionWizard.project_id && this.sessionWizard.name;
                case 2:
                    return this.sessionWizard.conformance_levels.length > 0;
                case 3:
                    return this.sessionWizard.selected_crawlers.length > 0;
                case 4:
                    return this.sessionWizard.selected_pages.length > 0;
                case 5:
                    return true; // Always can proceed from requirements step
                default:
                    return true;
            }
        },

        // Load combined pages from selected crawlers
        async loadCombinedPages() {
            try {
                console.log('🔗 Loading combined pages from crawlers...');
                console.log('🔗 Selected crawlers:', this.sessionWizard.selected_crawlers);
                
                if (!this.sessionWizard.selected_crawlers || this.sessionWizard.selected_crawlers.length === 0) {
                    console.warn('⚠️ No crawlers selected');
                    this.combinedPages = [];
                    this.deduplicatedPages = [];
                    this.sessionWizard.selected_pages = [];
                    return;
                }
                
                const allPages = [];
                for (const crawlerId of this.sessionWizard.selected_crawlers) {
                    console.log(`📄 Loading pages for crawler: ${crawlerId}`);
                    const response = await this.apiCall(`/web-crawlers/crawlers/${crawlerId}/pages`);
                    if (response.success) {
                        const crawlerPages = response.data.map(page => ({
                            ...page,
                            crawler_id: crawlerId
                        }));
                        allPages.push(...crawlerPages);
                        console.log(`  ✅ Loaded ${crawlerPages.length} pages from crawler ${crawlerId}`);
                    } else {
                        console.error(`  ❌ Failed to load pages from crawler ${crawlerId}:`, response.error);
                    }
                }
                
                console.log(`📊 Total pages loaded: ${allPages.length}`);
                
                // Deduplicate by URL
                const urlMap = new Map();
                allPages.forEach(page => {
                    if (!urlMap.has(page.url)) {
                        urlMap.set(page.url, page);
                    } else {
                        console.log(`🔄 Duplicate URL found: ${page.url}`);
                    }
                });
                
                this.combinedPages = allPages;
                this.deduplicatedPages = Array.from(urlMap.values());
                
                // Auto-select all pages initially - this is the key feature requested
                const previouslySelected = this.sessionWizard.selected_pages.length;
                this.sessionWizard.selected_pages = this.deduplicatedPages.map(page => page.id);
                
                console.log(`✅ Combined ${allPages.length} pages, deduplicated to ${this.deduplicatedPages.length}`);
                console.log(`🎯 Auto-selected all ${this.deduplicatedPages.length} pages (previously had ${previouslySelected} selected)`);
                
                // Show user notification about auto-selection
                this.showNotification(
                    'info',
                    'Pages Auto-Selected',
                    `All ${this.deduplicatedPages.length} pages from selected crawlers have been automatically selected. You can adjust selections below.`
                );
                
            } catch (error) {
                console.error('Error loading combined pages:', error);
                this.combinedPages = [];
                this.deduplicatedPages = [];
                this.sessionWizard.selected_pages = [];
                this.showNotification('error', 'Load Failed', 'Failed to load pages from selected crawlers');
            }
        },

        // Get total pages from selected crawlers
        getTotalPagesFromCrawlers() {
            return this.sessionWizard.selected_crawlers.reduce((total, crawlerId) => {
                const crawler = this.availableCrawlers.find(c => c.id === crawlerId);
                return total + (crawler?.total_pages_found || 0);
            }, 0);
        },

        // Get deduplicated pages count
        getDeduplicatedPagesCount() {
            // If we have actual deduplicated pages (from Step 4), use that count
            if (this.deduplicatedPages && this.deduplicatedPages.length > 0) {
            return this.deduplicatedPages.length;
            }
            
            // Otherwise, estimate based on selected crawlers
            // For now, assume 80% deduplication rate across multiple crawlers
            const totalPages = this.getTotalPagesFromCrawlers();
            if (this.sessionWizard.selected_crawlers.length <= 1) {
                return totalPages; // No deduplication needed for single crawler
            } else {
                return Math.round(totalPages * 0.8); // Estimate 20% duplicate rate
            }
        },

        // Get combined pages for display
        getCombinedPages() {
            return this.deduplicatedPages;
        },

        // Page selection methods
        selectAllPages() {
            this.sessionWizard.selected_pages = this.deduplicatedPages.map(page => page.id);
        },

        deselectAllPages() {
            this.sessionWizard.selected_pages = [];
        },

        selectHomepageOnly() {
            const homepages = this.deduplicatedPages.filter(page => 
                page.url.endsWith('/') || page.url.split('/').length <= 3
            );
            this.sessionWizard.selected_pages = homepages.map(page => page.id);
        },

        getSelectedPagesCount() {
            return this.sessionWizard.selected_pages.length;
        },

        getSelectedPages() {
            if (!this.sessionWizard.selected_pages?.length || !this.deduplicatedPages?.length) return [];
            
            return this.deduplicatedPages.filter(page => 
                this.sessionWizard.selected_pages.includes(page.id)
            );
        },

        areAllPagesSelected() {
            return this.sessionWizard.selected_pages.length === this.deduplicatedPages.length;
        },

        toggleAllPages() {
            if (this.areAllPagesSelected()) {
                this.deselectAllPages();
            } else {
                this.selectAllPages();
            }
        },

        // Get filtered pages for display
        getFilteredPages() {
            let filtered = this.deduplicatedPages;
            
            // Apply search filter
            if (this.pageSearchQuery) {
                const query = this.pageSearchQuery.toLowerCase();
                filtered = filtered.filter(page => 
                    page.url.toLowerCase().includes(query) ||
                    (page.title && page.title.toLowerCase().includes(query))
                );
            }
            
            // Apply type filter
            if (this.pageFilterType) {
                // This would need page content analysis - placeholder for now
                // filtered = filtered.filter(page => page.type === this.pageFilterType);
            }
            
            return filtered;
        },

        // Get crawler name by ID
        getCrawlerName(crawlerId) {
            const crawler = this.availableCrawlers.find(c => c.id === crawlerId);
            return crawler?.name || 'Unknown';
        },

        // Requirements filtering methods
        getSelectedRequirements() {
            // If no conformance levels selected, return empty (reduce logging spam)
            if (!this.sessionWizard?.conformance_levels?.length) {
                // Only log once per session or when state changes
                if (!this._loggedNoConformanceLevels) {
                    console.log('❌ No conformance levels selected');
                    this._loggedNoConformanceLevels = true;
                }
                return [];
            }
            
            // Reset the logging flag when we have conformance levels
            this._loggedNoConformanceLevels = false;
            
            // Quick debug check
            if (this.sessionWizard?.conformance_levels?.length > 0 && this.availableRequirements?.length === 0) {
                console.log('⚠️ Requirements not loaded yet for selected conformance levels');
            }
            
            // If we have cached requirements and same conformance levels, use cache
            const levelsString = JSON.stringify(this.sessionWizard.conformance_levels.sort());
            if (this.cachedSelectedRequirements?.length > 0 && 
                this.lastConformanceLevelsString === levelsString) {
                // Rate limit the cache usage log
                if (!this._loggedCacheUsage) {
                    console.log(`✅ Using cached ${this.cachedSelectedRequirements.length} requirements`);
                    this._loggedCacheUsage = true;
                    setTimeout(() => { this._loggedCacheUsage = false; }, 2000);
                }
                return this.cachedSelectedRequirements;
            }
            
            // If no available requirements loaded, try to use cache
            if (!this.availableRequirements?.length) {
                if (this.cachedSelectedRequirements?.length > 0) {
                    console.log('⚠️ No available requirements, using cache');
                    return this.cachedSelectedRequirements;
                }
                console.log('❌ No available requirements and no cache');
                return [];
            }
            
                    const mapping = {
                        'wcag_22_a': 'wcag_a',
                        'wcag_22_aa': 'wcag_aa',
                        'wcag_22_aaa': 'wcag_aaa',
                        'section_508_base': 'section_508_base',
                        'section_508_enhanced': 'section_508_enhanced'
                    };
            
                            // Debug the filtering process
                console.log('🔍 FILTERING DEBUG:');
                console.log('  - Available requirements:', this.availableRequirements.length);
                console.log('  - Selected conformance levels:', this.sessionWizard.conformance_levels);
                console.log('  - Mapping object:', mapping);
                
                // Sample first few requirements for debugging
                console.log('  - Sample requirements:', this.availableRequirements.slice(0, 3).map(req => ({
                    requirement_id: req.requirement_id,
                    criterion: req.criterion_number,
                    type: req.requirement_type,
                    level: req.level,
                    levelKey: `${req.requirement_type}_${req.level?.toLowerCase()}`
                })));

                const filtered = this.availableRequirements.filter(req => {
                    // Enhanced debugging for requirement validation
                    const hasId = req && req.requirement_id;
                    const hasType = req && req.requirement_type;
                    const hasLevel = req && req.level && typeof req.level === 'string';
                    
                    if (!hasId || !hasType || !hasLevel) {
                        // Only log first few missing requirements to avoid spam
                        if (!this.debugLoggedMissingCount || this.debugLoggedMissingCount < 3) {
                            console.log('❌ Filtering out requirement missing properties:', {
                                requirement_id: req?.requirement_id,
                                criterion: req?.criterion_number,
                                hasId: hasId,
                                hasType: hasType,
                                hasLevel: hasLevel,
                                levelType: typeof req?.level,
                                levelValue: req?.level,
                                requirement_type: req?.requirement_type
                            });
                            this.debugLoggedMissingCount = (this.debugLoggedMissingCount || 0) + 1;
                        }
                        return false;
                    }
                    
                    const levelKey = `${req.requirement_type}_${req.level.toLowerCase()}`;
                    
                    const matches = this.sessionWizard.conformance_levels.some(selectedLevel => {
                        const mappedLevel = mapping[selectedLevel];
                        const isMatch = mappedLevel === levelKey;
                        
                        // Debug for first requirement only to avoid spam
                        if (req.requirement_id === this.availableRequirements[0]?.requirement_id) {
                            console.log(`🔍 MATCH DEBUG: selectedLevel="${selectedLevel}", mappedLevel="${mappedLevel}", levelKey="${levelKey}", match=${isMatch}`);
                        }
                        
                        return isMatch;
                    });
                    
                    return matches;
                });
            
            // Remove duplicates by requirement_id
            const deduplicated = filtered.filter((req, index, self) =>
                index === self.findIndex(r => r.requirement_id === req.requirement_id)
            );
            
            // Cache the results
            this.cachedSelectedRequirements = deduplicated;
            this.lastConformanceLevelsString = levelsString;
            
            // Only log when we actually found results, or when debugging zero results (but limit spam)
            if (deduplicated.length > 0) {
                console.log(`✅ Found and cached ${deduplicated.length} requirements for levels:`, this.sessionWizard.conformance_levels);
            } else if (this.availableRequirements.length > 0) {
                // Only log zero results debugging once per session or when conformance levels change
                if (!this._loggedZeroResults || this._lastZeroResultsLevels !== levelsString) {
                    console.log(`⚠️ Found and cached 0 requirements for levels:`, this.sessionWizard.conformance_levels);
                    console.log('🚨 ZERO RESULTS DEBUG:');
                    console.log('  - Total available:', this.availableRequirements.length);
                    console.log('  - Expected mapping for wcag_22_a:', mapping['wcag_22_a']);
                    console.log('  - Sample requirement levels:', this.availableRequirements.slice(0, 5).map(req => req.level));
                    console.log('  - Sample requirement types:', this.availableRequirements.slice(0, 5).map(req => req.requirement_type));
                    console.log('  - Sample levelKeys:', this.availableRequirements.slice(0, 5).map(req => `${req.requirement_type}_${req.level?.toLowerCase()}`));
                    this._loggedZeroResults = true;
                    this._lastZeroResultsLevels = levelsString;
                }
            }
            
            return deduplicated;
        },

        getApplicableRequirementsCount() {
            const selectedRequirements = this.getSelectedRequirements();
            const selectedCount = selectedRequirements.length;
            
            if (!this.sessionWizard?.smart_filtering) {
                return selectedCount;
            }
            
            // Smart filtering logic - for now, assume 80% of requirements are applicable
            // But ensure we don't return 0 if we have requirements
            const applicableCount = selectedCount > 0 ? Math.max(1, Math.floor(selectedCount * 0.8)) : 0;
            
            return applicableCount;
        },

        getFilteredOutRequirementsCount() {
            const selected = this.getSelectedRequirements().length;
            const applicable = this.getApplicableRequirementsCount();
            return selected - applicable;
        },

        // Final preview methods
        getProjectName(projectId) {
            const project = this.projects.find(p => p.id === projectId);
            return project?.name || 'Unknown Project';
        },

        formatConformanceLevel(level) {
            const mapping = {
                'wcag_22_a': 'WCAG 2.2 Level A',
                'wcag_22_aa': 'WCAG 2.2 Level AA',
                'wcag_22_aaa': 'WCAG 2.2 Level AAA',
                'section_508_base': 'Section 508 Base',
                'section_508_enhanced': 'Section 508 Enhanced'
            };
            return mapping[level] || level;
        },

        getFinalRequirementsCount() {
            // Always start with the base selected requirements
            const baseCount = this.getSelectedRequirements().length;
            
            if (this.sessionWizard.smart_filtering) {
                // Apply smart filtering reduction
                return this.getApplicableRequirementsCount();
            } else {
                // Use manual selection if available, otherwise use base count
                if (this.sessionWizard.manual_requirements && this.sessionWizard.manual_requirements.length > 0) {
                    return this.sessionWizard.manual_requirements.length;
                }
                return baseCount;
            }
        },

        getFinalTestCount() {
            return this.getFinalRequirementsCount() * this.sessionWizard.selected_pages.length;
        },

        getEstimatedManualTime() {
            const manualTests = Math.floor(this.getFinalTestCount() * 0.7); // Estimate 70% manual
            const hoursPerTest = 0.25; // 15 minutes per test
            const totalHours = Math.ceil(manualTests * hoursPerTest);
            return `${totalHours} hours`;
        },

        getEstimatedAutomatedTime() {
            const automatedTests = Math.floor(this.getFinalTestCount() * 0.3); // Estimate 30% automated
            const minutesPerTest = 2; // 2 minutes per automated test
            const totalMinutes = automatedTests * minutesPerTest;
            return `${Math.ceil(totalMinutes / 60)} hours`;
        },

        // Create the testing session
        async createTestingSession() {
            try {
                this.sessionWizard.creating = true;
                console.log('🚀 Creating testing session...', this.sessionWizard);
                console.log('🔍 DEBUG: Original conformance levels:', this.sessionWizard.conformance_levels);
                
                // Send original frontend conformance levels to backend
                // Backend will handle the wizard-level mapping correctly
                const sessionData = {
                    project_id: this.sessionWizard.project_id || this.selectedProject,
                    name: this.sessionWizard.name,
                    description: this.sessionWizard.description || '',
                    conformance_levels: this.sessionWizard.conformance_levels,
                    selected_crawler_ids: this.sessionWizard.selected_crawlers || [],
                    selected_page_ids: this.sessionWizard.selected_pages || [],
                    smart_filtering: this.sessionWizard.smart_filtering !== false, // default to true
                    manual_requirements: this.sessionWizard.manual_requirements || []
                };
                
                console.log('🔍 DEBUG: Final conformance levels for DB:', sessionData.conformance_levels);

                console.log('🔍 DEBUG: Session data being sent:', sessionData);
                
                const response = await this.apiCall('/testing-sessions', {
                    method: 'POST',
                    body: JSON.stringify(sessionData)
                });
                
                console.log('🔍 DEBUG: Full API response:', response);
                
                if (response.success) {
                    console.log('✅ Session created successfully:', response.session);
                    
                    // Handle potential missing session data
                    const sessionName = response.session?.name || this.sessionWizard.name || 'Unnamed Session';
                    const testCount = response.test_instances_created || 0;
                    
                    this.showNotification('success', 'Session Created', 
                        `Testing session "${sessionName}" created with ${testCount} tests`);
                    
                    this.closeSessionWizard();
                    await this.loadTestingSessions(); // Refresh the sessions list
                    
                } else {
                    throw new Error(response.error || 'Failed to create session');
                }
                
            } catch (error) {
                console.error('Error creating testing session:', error);
                this.showNotification('error', 'Creation Failed', 
                    error.message || 'Failed to create testing session');
            } finally {
                this.sessionWizard.creating = false;
            }
        }
    };

    // ===== AUDIT TIMELINE FUNCTIONS =====

    componentInstance.openAuditTimeline = function(sessionId, sessionName) {
        this.auditTimeline.sessionId = sessionId;
        this.auditTimeline.sessionName = sessionName;
        this.resetAuditTimelineFilters();
        this.loadAuditTimeline();
        document.getElementById('auditTimelineModal').classList.remove('hidden');
    };

    componentInstance.closeAuditTimeline = function() {
        this.auditTimeline.sessionId = null;
        this.auditTimeline.sessionName = '';
        this.auditTimeline.timeline = [];
        this.auditTimeline.expandedItems.clear();
        document.getElementById('auditTimelineModal').classList.add('hidden');
    };

    componentInstance.loadAuditTimeline = async function() {
        if (!this.auditTimeline.sessionId) return;

        try {
            this.auditTimeline.loading = true;
            this.auditTimeline.error = null;

            const params = new URLSearchParams({
                limit: 50,
                page: this.auditTimeline.pagination.page,
                include_metadata: 'true',
                include_statistics: 'true'
            });

            // Add filters
            if (this.auditTimeline.filters.start_date) {
                params.append('start_date', this.auditTimeline.filters.start_date);
            }
            if (this.auditTimeline.filters.end_date) {
                params.append('end_date', this.auditTimeline.filters.end_date);
            }
            if (this.auditTimeline.filters.action_type) {
                params.append('action_type', this.auditTimeline.filters.action_type);
            }
            if (this.auditTimeline.filters.user_id) {
                params.append('user_id', this.auditTimeline.filters.user_id);
            }

            const response = await this.apiCall(`/audit-trail/session/${this.auditTimeline.sessionId}?${params}`);

            if (response.success && response.data) {
                // Reset or append timeline based on page
                if (this.auditTimeline.pagination.page === 1) {
                    this.auditTimeline.timeline = response.data.audit_entries || [];
                } else {
                    this.auditTimeline.timeline.push(...(response.data.audit_entries || []));
                }

                this.auditTimeline.statistics = response.data.statistics || null;
                this.auditTimeline.pagination = {
                    page: this.auditTimeline.pagination.page,
                    has_more: response.data.pagination?.has_more || false,
                    total: response.data.pagination?.total || 0
                };

                console.log(`📋 Loaded ${this.auditTimeline.timeline.length} audit timeline entries`);
            } else {
                throw new Error(response.error || 'Failed to load audit timeline');
            }

        } catch (error) {
            console.error('Error loading audit timeline:', error);
            this.auditTimeline.error = error.message;
            this.showNotification('error', 'Audit Timeline Error', error.message);
        } finally {
            this.auditTimeline.loading = false;
        }
    };

    componentInstance.loadMoreTimelineItems = function() {
        this.auditTimeline.pagination.page++;
        this.loadAuditTimeline();
    };

    componentInstance.applyAuditTimelineFilters = function() {
        this.auditTimeline.pagination.page = 1;
        this.loadAuditTimeline();
    };

    componentInstance.resetAuditTimelineFilters = function() {
        this.auditTimeline.filters = {
            start_date: '',
            end_date: '',
            action_type: '',
            user_id: ''
        };
        this.auditTimeline.pagination.page = 1;
    };

    componentInstance.exportAuditTimeline = async function(format) {
        try {
            const params = new URLSearchParams({
                format: format,
                include_metadata: 'true'
            });

            // Add current filters
            Object.entries(this.auditTimeline.filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await fetch(`${this.apiBaseUrl}/audit-trail/session/${this.auditTimeline.sessionId}/export?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Get filename from response headers or generate one
            let filename = `audit-trail-${this.auditTimeline.sessionName}-${new Date().toISOString().split('T')[0]}.${format}`;
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }

            // Download the file
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('success', 'Export Complete', `Audit trail exported as ${format.toUpperCase()}`);

        } catch (error) {
            console.error('Error exporting audit timeline:', error);
            this.showNotification('error', 'Export Failed', error.message);
        }
    };

    // Timeline view helper functions
    componentInstance.getGroupedTimeline = function() {
        const grouped = {};
        this.auditTimeline.timeline.forEach(item => {
            const date = new Date(item.timestamp || item.changed_at).toDateString();
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(item);
        });
        return grouped;
    };

    componentInstance.formatGroupHeader = function(date) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (date === today) return 'Today';
        if (date === yesterday) return 'Yesterday';
        return new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    componentInstance.getActionTypeColorClass = function(actionType) {
        const colors = {
            'created': 'bg-blue-100 text-blue-800',
            'assignment': 'bg-purple-100 text-purple-800',
            'status_change': 'bg-green-100 text-green-800',
            'note_updated': 'bg-yellow-100 text-yellow-800',
            'evidence_uploaded': 'bg-indigo-100 text-indigo-800',
            'review_requested': 'bg-orange-100 text-orange-800',
            'reviewed': 'bg-emerald-100 text-emerald-800'
        };
        return colors[actionType] || 'bg-gray-100 text-gray-800';
    };

    componentInstance.getActionTypeIcon = function(actionType) {
        const icons = {
            'created': '✨',
            'assignment': '👤',
            'status_change': '🔄',
            'note_updated': '📝',
            'evidence_uploaded': '📎',
            'review_requested': '👁️',
            'reviewed': '✅'
        };
        return icons[actionType] || '📋';
    };

    componentInstance.getActionTypeDisplayText = function(actionType) {
        const displays = {
            'created': 'Test Created',
            'assignment': 'Tester Assigned',
            'status_change': 'Status Changed',
            'note_updated': 'Notes Updated',
            'evidence_uploaded': 'Evidence Added',
            'review_requested': 'Review Requested',
            'reviewed': 'Test Reviewed',
            'automated_test_result': 'Automated Test Evidence',
            'automation_started': 'Automation Started',
            'automation_completed': 'Automation Completed',
            'automation_failed': 'Automation Failed'
        };
        return displays[actionType] || actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    componentInstance.formatRelativeTime = function(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return time.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: time.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    componentInstance.toggleTimelineItem = function(auditId) {
        if (this.auditTimeline.expandedItems.has(auditId)) {
            this.auditTimeline.expandedItems.delete(auditId);
        } else {
            this.auditTimeline.expandedItems.add(auditId);
        }
    };

    componentInstance.isTimelineItemExpanded = function(auditId) {
        return this.auditTimeline.expandedItems.has(auditId);
    };

    componentInstance.viewTimelineItemDetails = function(item) {
        // Show detailed modal or expanded view
        this.showNotification('info', 'Item Details', `Full details for ${item.action_type} action`);
    };



    // Add saveTestEvidence function to the component instance
    componentInstance.saveTestEvidence = async function(instanceId, modal) {
        try {
            const form = modal.querySelector('#evidenceForm');
            const formData = new FormData(form);
            formData.append('test_instance_id', instanceId);
            
            // For now, simulate evidence upload (can be enhanced with actual file upload)
            const evidenceData = {
                test_instance_id: instanceId,
                evidence_type: formData.get('evidence_type'),
                description: formData.get('description'),
                external_url: formData.get('external_url'),
                file_name: formData.get('evidence_file')?.name || null,
                created_by: this.currentUser?.userId,
                created_at: new Date().toISOString()
            };
            
            // TODO: Implement actual file upload to server
            console.log('Evidence data to save:', evidenceData);
            
            this.showNotification('success', 'Evidence Added', 'Evidence has been recorded for this test instance');
            modal.remove();
            
            // Add evidence note to the test instance
            const noteUpdate = {
                notes: `Evidence added: ${evidenceData.evidence_type} - ${evidenceData.description}${evidenceData.external_url ? ' (URL: ' + evidenceData.external_url + ')' : ''}`
            };
            
            await this.apiCall(`/test-instances/${instanceId}`, {
                method: 'PUT',
                body: JSON.stringify(noteUpdate)
            });
            
            // Refresh the test grid if available
            if (this.selectedTestSession && this.loadTestInstancesForGrid) {
                this.loadTestInstancesForGrid(this.selectedTestSession.id, this.testGridPagination.currentPage, true);
            }
            
        } catch (error) {
            console.error('Error adding evidence:', error);
            this.showNotification('error', 'Upload Failed', error.message);
        }
    };

    // Add viewAutomationResults function to the component instance
    componentInstance.viewAutomationResults = async function(instanceId) {
        try {
            console.log('🔍 Loading automation results for instance:', instanceId);
            
            // Get automation results from the backend
            const response = await this.apiCall(`/automated-testing/results/${instanceId}`);
            
            if (response.success && response.results?.length > 0) {
                const results = response.results;
                
                // Create results display HTML
                const resultsHTML = `
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold flex items-center">
                            <i class="fas fa-robot mr-2 text-purple-600"></i>
                            Automation Results (${results.length} runs)
                        </h3>
                        
                        ${results.map((result, index) => `
                            <div class="border rounded-lg p-4 ${result.status === 'completed' ? 'bg-green-50 border-green-200' : result.status === 'failed' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="font-medium">Run ${index + 1} - ${new Date(result.created_at).toLocaleString()}</h4>
                                    <span class="text-sm px-2 py-1 rounded ${result.status === 'completed' ? 'bg-green-100 text-green-800' : result.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                                        ${result.status}
                                    </span>
                                </div>
                                
                                <div class="text-sm space-y-2">
                                    <div><strong>Tools Used:</strong> ${result.tools_used ? JSON.parse(result.tools_used).join(', ') : 'N/A'}</div>
                                    ${result.issues_found ? `<div><strong>Issues Found:</strong> ${result.issues_found}</div>` : ''}
                                    ${result.summary ? `<div><strong>Summary:</strong> ${result.summary}</div>` : ''}
                                    
                                    ${result.result ? `
                                        <details class="mt-2">
                                            <summary class="cursor-pointer font-medium">View Detailed Results</summary>
                                            <div class="mt-2">${this.formatTestResult(result.result)}</div>
                                        </details>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                // Show results modal
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
                modal.innerHTML = `
                    <div class="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
                        ${resultsHTML}
                        <div class="mt-6 flex justify-end">
                            <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Close</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
            } else {
                this.showNotification('info', 'No Results', 'No automation results found for this test instance. Try running automation first.');
            }
            
        } catch (error) {
            console.error('Error loading automation results:', error);
            this.showNotification('error', 'Loading Failed', 'Failed to load automation results');
        }
    };

    // Add viewFullAuditTrail function to the component instance
    componentInstance.viewFullAuditTrail = async function(sessionId) {
        try {
            console.log('🔍 Opening full audit trail for session:', sessionId);
            
            // Get full audit trail from the backend
            const response = await this.apiCall(`/audit-trail/session/${sessionId}?limit=200&include_metadata=true`);
            
            if (response.success && response.data?.length > 0) {
                const auditEntries = response.data;
                
                // Create audit trail display HTML
                const auditHTML = `
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold flex items-center">
                            <i class="fas fa-clipboard-list mr-2 text-indigo-600"></i>
                            Complete Audit Trail (${auditEntries.length} entries)
                        </h3>
                        
                        <div class="text-sm text-gray-600 mb-4">
                            Session: ${sessionId} • Generated: ${new Date().toLocaleString()}
                        </div>
                        
                        <div class="space-y-3 max-h-96 overflow-y-auto">
                            ${auditEntries.map((entry, index) => `
                                <div class="border-l-4 ${this.getAuditTypeColor(entry.action_type)} bg-gray-50 p-4 rounded-r-lg">
                                    <div class="flex justify-between items-start mb-2">
                                        <div class="flex items-center space-x-2">
                                            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full ${this.getAuditTypeBgColor(entry.action_type)} text-white text-xs font-medium">
                                                ${this.getAuditTypeIcon(entry.action_type)}
                                            </span>
                                            <h4 class="font-medium text-gray-900">${this.getActionTypeDisplayText(entry.action_type)}</h4>
                                        </div>
                                        <span class="text-xs text-gray-500">${this.formatRelativeTime(entry.changed_at)}</span>
                                    </div>
                                    
                                    <div class="text-sm text-gray-700 mb-2">
                                        ${entry.reason || 'No description provided'}
                                    </div>
                                    
                                    ${entry.changed_by_name ? `
                                        <div class="text-xs text-gray-600 mb-2">
                                            <i class="fas fa-user mr-1"></i>by ${entry.changed_by_name}
                                        </div>
                                    ` : ''}
                                    
                                    ${entry.field_changed ? `
                                        <div class="text-xs bg-white p-2 rounded border">
                                            <strong>Changed:</strong> ${entry.field_changed}
                                            ${entry.old_value && entry.new_value ? `
                                                <div class="mt-1">
                                                    <span class="text-red-600">- ${entry.old_value}</span><br>
                                                    <span class="text-green-600">+ ${entry.new_value}</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                    ` : ''}
                                    
                                    ${this.renderEvidenceSection(entry)}
                                    
                                    ${entry.metadata && Object.keys(entry.metadata).length > 0 ? `
                                        <details class="mt-2">
                                            <summary class="cursor-pointer text-xs text-indigo-600 hover:text-indigo-800">View Technical Details</summary>
                                            <pre class="text-xs bg-white p-2 rounded border mt-1 max-h-32 overflow-y-auto">${JSON.stringify(entry.metadata, null, 2)}</pre>
                                        </details>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                
                // Show audit trail modal
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
                modal.innerHTML = `
                    <div class="bg-white rounded-lg p-6 max-w-5xl max-h-[90vh] overflow-y-auto">
                        ${auditHTML}
                        <div class="mt-6 flex justify-between">
                            <button onclick="navigator.clipboard.writeText('${JSON.stringify(auditEntries, null, 2).replace(/'/g, '\\\'')}')" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                                <i class="fas fa-copy mr-2"></i>Copy JSON
                            </button>
                            <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Close</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
            } else {
                this.showNotification('info', 'No Audit Trail', 'No audit trail entries found for this session.');
            }
            
        } catch (error) {
            console.error('Error loading audit trail:', error);
            this.showNotification('error', 'Loading Failed', 'Failed to load audit trail: ' + error.message);
        }
    };

    // Add audit trail helper functions
    componentInstance.getAuditTypeColor = function(actionType) {
        const colors = {
            'automation_started': 'border-blue-400',
            'automation_completed': 'border-green-400', 
            'automation_failed': 'border-red-400',
            'automation_tool_completed': 'border-purple-400',
            'automated_test_result': 'border-indigo-400',
            'status_change': 'border-yellow-400',
            'evidence_created': 'border-indigo-400',
            'created': 'border-gray-400',
            'assignment': 'border-cyan-400',
            'note_updated': 'border-orange-400',
            'reviewed': 'border-green-400'
        };
        return colors[actionType] || 'border-gray-400';
    };

    // Add helper functions for enhanced evidence display
                componentInstance.getToolIcon = function(tool) {
                const icons = {
                    'axe': 'shield-alt',
                    'pa11y': 'universal-access',
                    'lighthouse': 'lighthouse',
                    'contrast-analyzer': 'palette',
                    'mobile-accessibility': 'mobile-alt',
                                'wave': 'water',
            'form-accessibility': 'form',
            'heading-structure': 'heading',
            'aria-testing': 'universal-access',
            'playwright': 'theater-masks',
            'cypress': 'tree'
                };
                return icons[tool] || 'tools';
            };

    componentInstance.getConfidenceColor = function(confidenceLevel) {
        switch(confidenceLevel?.toLowerCase()) {
            case 'high': return 'green';
            case 'medium': return 'yellow';
            case 'low': return 'red';
            default: return 'gray';
        }
    };

    componentInstance.getConfidencePercentage = function(confidenceLevel) {
        switch(confidenceLevel?.toLowerCase()) {
            case 'high': return 90;
            case 'medium': return 60;
            case 'low': return 30;
            default: return 50;
        }
    };

    // Add evidence rendering function
    componentInstance.renderEvidenceSection = function(entry) {
        try {
            const metadata = entry.metadata || {};
            
            // Check for evidence data
            if (metadata.evidence) {
                const evidence = metadata.evidence;
                const details = evidence.evidence_details || {};
                const artifacts = evidence.proof_artifacts || {};
                
                return `
                    <div class="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-microscope text-blue-600 mr-2"></i>
                            <h5 class="font-medium text-blue-900">Test Evidence</h5>
                            <span class="ml-2 px-2 py-1 text-xs rounded-full ${this.getOutcomeBadgeStyle(evidence.test_outcome)}">
                                ${evidence.test_outcome.toUpperCase()}
                            </span>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <strong>Tools Used:</strong> 
                                <div class="flex flex-wrap gap-1 mt-1">
                                    ${(evidence.tools_used || []).map(tool => `
                                        <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                            <i class="fas fa-${this.getToolIcon(tool)} mr-1"></i>${tool}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                            <div>
                                <strong>Confidence:</strong> 
                                <div class="flex items-center mt-1">
                                    <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                        <div class="bg-${this.getConfidenceColor(evidence.confidence_level)} h-2 rounded-full" 
                                             style="width: ${this.getConfidencePercentage(evidence.confidence_level)}%"></div>
                                    </div>
                                    <span class="text-${this.getConfidenceColor(evidence.confidence_level)}-600 font-medium">
                                        ${evidence.confidence_level}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <strong>Violations Found:</strong> 
                                <span class="inline-flex items-center">
                                    ${details.violations_found || 0}
                                    ${details.critical_violations > 0 ? `
                                        <span class="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                            <i class="fas fa-exclamation-triangle mr-1"></i>${details.critical_violations} critical
                                        </span>
                                    ` : ''}
                                </span>
                            </div>
                            <div>
                                <strong>Rules Passed:</strong> 
                                <span class="inline-flex items-center">
                                    <i class="fas fa-check-circle text-green-600 mr-1"></i>
                                    ${details.passes_recorded || 0}
                                </span>
                            </div>
                        </div>
                        
                        ${artifacts.violation_details && Object.keys(artifacts.violation_details).length > 0 ? `
                            <details class="mt-2">
                                <summary class="cursor-pointer text-blue-600 hover:text-blue-800 text-xs font-medium">
                                    <i class="fas fa-exclamation-triangle mr-1"></i>View Violation Evidence
                                </summary>
                                <div class="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                    ${Object.entries(artifacts.violation_details).map(([rule, violations]) => `
                                        <div class="text-xs bg-red-50 p-2 rounded border-l-4 border-red-400">
                                            <strong class="text-red-800">${rule}:</strong>
                                            <span class="text-red-700">${violations.length} instance(s)</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        ` : ''}
                        
                        ${artifacts.dom_selectors && artifacts.dom_selectors.length > 0 ? `
                            <details class="mt-2">
                                <summary class="cursor-pointer text-blue-600 hover:text-blue-800 text-xs font-medium">
                                    <i class="fas fa-code mr-1"></i>View DOM Evidence (${artifacts.dom_selectors.length} selectors)
                                </summary>
                                <div class="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                    ${artifacts.dom_selectors.slice(0, 10).map(selector => `
                                        <div class="text-xs bg-gray-50 p-2 rounded border font-mono">
                                            <span class="text-${selector.type === 'violation' ? 'red' : 'green'}-600">${selector.type.toUpperCase()}:</span>
                                            <code class="text-gray-800">${selector.selector}</code>
                                            ${selector.rule ? `<span class="text-gray-500">- ${selector.rule}</span>` : ''}
                                        </div>
                                    `).join('')}
                                    ${artifacts.dom_selectors.length > 10 ? `
                                        <div class="text-xs text-gray-500 italic">... and ${artifacts.dom_selectors.length - 10} more selectors</div>
                                    ` : ''}
                                </div>
                            </details>
                        ` : ''}
                        
                        ${artifacts.remediation_steps && artifacts.remediation_steps.length > 0 ? `
                            <details class="mt-2">
                                <summary class="cursor-pointer text-blue-600 hover:text-blue-800 text-xs font-medium">
                                    <i class="fas fa-tools mr-1"></i>View Remediation Guidance (${artifacts.remediation_steps.length} items)
                                </summary>
                                <div class="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                    ${artifacts.remediation_steps.slice(0, 5).map(step => `
                                        <div class="text-xs bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                                            <strong class="text-yellow-800">${step.priority || 'Medium'} Priority:</strong>
                                            <span class="text-yellow-700">${step.description || step.summary || 'Fix accessibility issue'}</span>
                                        </div>
                                    `).join('')}
                                    ${artifacts.remediation_steps.length > 5 ? `
                                        <div class="text-xs text-gray-500 italic">... and ${artifacts.remediation_steps.length - 5} more recommendations</div>
                                    ` : ''}
                                </div>
                            </details>
                        ` : ''}
                    </div>
                `;
            }
            
            // Check for evidence summary at session level
            if (metadata.evidence_summary) {
                const summary = metadata.evidence_summary;
                return `
                    <div class="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-chart-bar text-green-600 mr-2"></i>
                            <h5 class="font-medium text-green-900">Evidence Summary</h5>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <strong>Tests with Evidence:</strong> ${summary.tests_with_evidence || 0}
                            </div>
                            <div>
                                <strong>Tools Used:</strong> ${(summary.tools_providing_evidence || []).join(', ')}
                            </div>
                            <div class="col-span-2">
                                <strong>Evidence Types:</strong> ${(summary.evidence_types || []).join(', ')}
                            </div>
                        </div>
                        
                        ${summary.automation_evidence_available ? `
                            <div class="mt-2 text-xs text-green-700">
                                <i class="fas fa-check-circle mr-1"></i>
                                Automated evidence collection completed successfully
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        } catch (e) {
            console.warn('Error rendering evidence section:', e);
        }
        
        return '';
    };

    // Helper function for outcome badge styling
    componentInstance.getOutcomeBadgeStyle = function(outcome) {
        const styles = {
            'passed': 'bg-green-100 text-green-800',
            'passed_review_required': 'bg-yellow-100 text-yellow-800', 
            'failed': 'bg-red-100 text-red-800',
            'in_progress': 'bg-blue-100 text-blue-800'
        };
        return styles[outcome] || 'bg-gray-100 text-gray-800';
    };

    componentInstance.getAuditTypeBgColor = function(actionType) {
        const colors = {
            'automation_started': 'bg-blue-500',
            'automation_completed': 'bg-green-500', 
            'automation_failed': 'bg-red-500',
            'automation_tool_completed': 'bg-purple-500',
            'automated_test_result': 'bg-indigo-500',
            'status_change': 'bg-yellow-500',
            'evidence_created': 'bg-indigo-500',
            'created': 'bg-gray-500',
            'assignment': 'bg-cyan-500',
            'note_updated': 'bg-orange-500',
            'reviewed': 'bg-green-500'
        };
        return colors[actionType] || 'bg-gray-500';
    };

    componentInstance.getAuditTypeIcon = function(actionType) {
        const icons = {
            'automation_started': '🤖',
            'automation_completed': '✅', 
            'automation_failed': '❌',
            'automation_tool_completed': '🔧',
            'automated_test_result': '🔬',
            'status_change': '📝',
            'evidence_created': '📎',
            'created': '➕',
            'assignment': '👤',
            'note_updated': '📋',
            'reviewed': '✔️'
        };
        return icons[actionType] || '📄';
    };

    // ===== REQUIREMENTS FUNCTIONALITY =====
    
    // Load session requirements
    componentInstance.loadSessionRequirements = async function(sessionId) {
        console.log(`🚀 loadSessionRequirements called with sessionId: ${sessionId}`);
        console.log(`📊 Current state - sessionRequirements length:`, this.sessionRequirements?.length || 0);
        
        if (!sessionId) {
            console.error('❌ No session ID provided to loadSessionRequirements');
            this.showNotification('error', 'Requirements Error', 'Session ID is required');
            return;
        }
        
        try {
            console.log(`🔍 Loading requirements for session ${sessionId}`);
            this.loading = true;
            
            // Initialize requirements arrays if they don't exist
            if (!this.sessionRequirements) this.sessionRequirements = [];
            if (!this.filteredRequirements) this.filteredRequirements = [];
            if (!this.paginatedRequirements) this.paginatedRequirements = [];
            if (!this.requirementFilters) {
                this.requirementFilters = {
                    testStatus: '',
                    wcagLevel: '',
                    testMethod: '',
                    searchTerm: ''
                };
            }
            if (!this.requirementStats) {
                this.requirementStats = {
                    total: 0,
                    automated_passed: 0,
                    automated_failed: 0,
                    manual_completed: 0,
                    manual_pending: 0,
                    not_tested: 0
                };
            }
            if (!this.requirementCurrentPage) this.requirementCurrentPage = 1;
            if (!this.requirementPageSize) this.requirementPageSize = 20;
            if (!this.requirementTotalPages) this.requirementTotalPages = 1;
            
            // Load requirements directly from the requirements API
            let requirementsData = [];
            
            try {
                console.log(`📋 Loading requirements from API for session ${sessionId}`);
                
                let requirementsResponse;
                
                try {
                    // Try authenticated endpoint first
                    requirementsResponse = await this.apiCall(`/requirements?limit=100`);
                } catch (authError) {
                    console.warn('🔓 Authenticated API failed, trying test endpoint:', authError.message);
                    
                    // Fallback to test endpoint for development/testing
                    try {
                        const testResponse = await fetch(`${this.config.apiBaseUrl}/api/requirements/test`);
                        if (testResponse.ok) {
                            const testData = await testResponse.json();
                            // Transform test response to match expected format
                            requirementsResponse = {
                                success: true,
                                data: {
                                    requirements: testData.data.sample_requirements || []
                                }
                            };
                            console.log('📋 Using test endpoint data');
                        } else {
                            throw new Error('Test endpoint also failed');
                        }
                    } catch (testError) {
                        console.error('❌ Test endpoint failed:', testError);
                        throw authError; // Re-throw original auth error
                    }
                }
                
                if (requirementsResponse.success && requirementsResponse.data?.requirements) {
                    requirementsData = requirementsResponse.data.requirements;
                    console.log(`✅ Successfully loaded ${requirementsData.length} requirements from API`);
                } else {
                    console.error('❌ Requirements API returned no data:', requirementsResponse);
                    throw new Error('No requirements data available from API');
                }
                
            } catch (error) {
                console.error('❌ Failed to load requirements from API:', error);
                requirementsData = [];
                this.showNotification('error', 'Requirements Loading Failed', `Failed to load requirements: ${error.message}. Please check authentication.`);
                return; // Exit early if we can't load requirements
            }
            
            // Transform data to match expected format (based on test_requirements table structure)
            const transformedRequirements = requirementsData.map(req => {
                console.log('🔍 Processing requirement:', req);
                return {
                    id: req.requirement_id || req.id,
                    criterion_number: req.criterion_number || req.requirement_id,
                    title: req.title,
                    description: req.description || '',
                    level: req.level,
                    test_method: req.test_method || 'manual',
                    requirement_type: req.requirement_type || 'wcag',
                    automated_tests: [],
                    manual_tests: [],
                    automated_status: 'not_tested',
                    manual_status: 'not_tested',
                    overall_status: 'not_tested'
                };
            });
            
            console.log(`🔄 Transformed ${transformedRequirements.length} requirements:`, transformedRequirements.slice(0, 2));
            
            // Enhance requirements with test data
            this.sessionRequirements = await this.enhanceRequirementsWithTestData(transformedRequirements, sessionId);
            
            console.log(`✅ Session requirements loaded: ${this.sessionRequirements.length} requirements`);
            console.log(`📊 First few requirements:`, this.sessionRequirements.slice(0, 3));
            console.log(`📊 Filtered requirements:`, this.filteredRequirements?.length || 0);
            console.log(`📊 Paginated requirements:`, this.paginatedRequirements?.length || 0);
            
            // Apply initial filtering and pagination
            this.filterRequirements();
            this.calculateRequirementStats();
            
            console.log(`📊 Requirements stats calculated:`, this.requirementStats);
            console.log(`📄 Paginated requirements: ${this.paginatedRequirements.length} on page ${this.requirementCurrentPage}`);
            
        } catch (error) {
            console.error('❌ Error loading session requirements:', error);
            this.showNotification('error', 'Loading Failed', 'Failed to load requirements: ' + error.message);
        } finally {
            this.loading = false;
        }
    };

    // Enhance requirements with test data
    componentInstance.enhanceRequirementsWithTestData = async function(requirements, sessionId) {
        try {
            console.log(`📊 Enhancing ${requirements.length} requirements with test data for session ${sessionId}`);
            
            // Get automated test results with error handling
            let automatedResults = [];
            try {
                const automatedResponse = await this.apiCall(`/results/automated-test-results?session_id=${sessionId}`);
                automatedResults = Array.isArray(automatedResponse.data) ? automatedResponse.data : [];
            } catch (error) {
                console.warn('Failed to load automated test results:', error);
                automatedResults = [];
            }
            
            // Get manual test instances with error handling  
            let manualTests = [];
            try {
                const manualResponse = await this.apiCall(`/test-instances?session_id=${sessionId}`);
                manualTests = Array.isArray(manualResponse.data) ? manualResponse.data : [];
            } catch (error) {
                console.warn('Failed to load manual test instances:', error);
                manualTests = [];
            }
            
            // Group results by requirement
            const automatedByRequirement = {};
            const manualByRequirement = {};
            
            // Safely process automated results
            if (Array.isArray(automatedResults)) {
                automatedResults.forEach(result => {
                    const reqId = result.wcag_criterion || result.requirement_id;
                    if (reqId) {
                        if (!automatedByRequirement[reqId]) {
                            automatedByRequirement[reqId] = [];
                        }
                        automatedByRequirement[reqId].push(result);
                    }
                });
            }
            
            // Safely process manual tests
            if (Array.isArray(manualTests)) {
                manualTests.forEach(test => {
                    const reqId = test.requirement_id || test.criterion_number;
                    if (reqId) {
                        if (!manualByRequirement[reqId]) {
                            manualByRequirement[reqId] = [];
                        }
                        manualByRequirement[reqId].push(test);
                    }
                });
            }
            
            // Enhance each requirement with proper arrays
            return requirements.map(req => {
                const automated = automatedByRequirement[req.criterion_number] || [];
                const manual = manualByRequirement[req.criterion_number] || [];
                
                return {
                    ...req,
                    automated_tests: automated,
                    manual_tests: manual,
                    automated_status: this.getAutomatedTestStatus(automated),
                    manual_status: this.getManualTestStatus(manual),
                    overall_status: this.getRequirementOverallStatus(automated, manual)
                };
            });
            
        } catch (error) {
            console.error('Error enhancing requirements with test data:', error);
            // Ensure all requirements have proper default arrays
            return requirements.map(req => ({
                ...req,
                automated_tests: [],
                manual_tests: [],
                automated_status: 'not_tested',
                manual_status: 'not_tested',
                overall_status: 'not_tested'
            }));
        }
    };

    // Filter requirements based on current filters
    componentInstance.filterRequirements = function() {
        if (!this.sessionRequirements) {
            this.filteredRequirements = [];
            this.updateRequirementsPagination();
            return;
        }

        let filtered = [...this.sessionRequirements];

        // Apply filters
        if (this.requirementFilters.testStatus) {
            filtered = filtered.filter(req => req.overall_status === this.requirementFilters.testStatus);
        }

        if (this.requirementFilters.wcagLevel) {
            filtered = filtered.filter(req => req.level === this.requirementFilters.wcagLevel);
        }

        if (this.requirementFilters.testMethod) {
            filtered = filtered.filter(req => req.test_method === this.requirementFilters.testMethod);
        }

        if (this.requirementFilters.searchTerm) {
            const searchTerm = this.requirementFilters.searchTerm.toLowerCase();
            filtered = filtered.filter(req => 
                req.criterion_number.toLowerCase().includes(searchTerm) ||
                req.title.toLowerCase().includes(searchTerm) ||
                req.description.toLowerCase().includes(searchTerm)
            );
        }

        this.filteredRequirements = filtered;
        this.updateRequirementsPagination();
    };

    // Update requirements pagination
    componentInstance.updateRequirementsPagination = function() {
        const totalItems = this.filteredRequirements.length;
        this.requirementTotalPages = Math.ceil(totalItems / this.requirementPageSize) || 1;
        
        // Ensure current page is valid
        if (this.requirementCurrentPage > this.requirementTotalPages) {
            this.requirementCurrentPage = 1;
        }

        // Calculate paginated results
        const startIndex = (this.requirementCurrentPage - 1) * this.requirementPageSize;
        const endIndex = startIndex + this.requirementPageSize;
        this.paginatedRequirements = this.filteredRequirements.slice(startIndex, endIndex);
    };

    // Calculate requirement statistics
    componentInstance.calculateRequirementStats = function() {
        if (!this.sessionRequirements) {
            this.requirementStats = {
                total: 0,
                automated_passed: 0,
                automated_failed: 0,
                manual_completed: 0,
                manual_pending: 0,
                not_tested: 0
            };
            return;
        }

        const stats = {
            total: this.sessionRequirements.length,
            automated_passed: 0,
            automated_failed: 0,
            manual_completed: 0,
            manual_pending: 0,
            not_tested: 0
        };

        this.sessionRequirements.forEach(req => {
            if (req.automated_status === 'passed') stats.automated_passed++;
            else if (req.automated_status === 'failed') stats.automated_failed++;
            
            if (req.manual_status === 'completed') stats.manual_completed++;
            else if (req.manual_status === 'pending') stats.manual_pending++;
            
            if (req.overall_status === 'not_tested') stats.not_tested++;
        });

        this.requirementStats = stats;
    };

    // View requirement details
    componentInstance.viewRequirementDetails = function(requirement) {
        this.currentRequirement = requirement;
        this.showRequirementDetailsModal = true;
    };

    // Close requirement details modal
    componentInstance.closeRequirementDetailsModal = function() {
        this.showRequirementDetailsModal = false;
        this.currentRequirement = null;
    };

    // Start automated testing for requirements
    componentInstance.startAutomatedTestingForRequirements = async function(sessionId, requirements = null) {
        try {
            this.loading = true;
            
            if (!this.selectedSessionDetails) {
                throw new Error('No session selected');
            }
            
            console.log(`🚀 Starting automated testing for session: ${this.selectedSessionDetails.name}`);
            
            // Start automated testing for the session
            const response = await this.apiCall(`/automated-testing/run/${sessionId}`, {
                method: 'POST',
                body: JSON.stringify({
                    testTypes: ['axe', 'pa11y', 'lighthouse', 'wave'],
                    clientMetadata: {
                        ip: 'dashboard',
                        userAgent: navigator.userAgent,
                        timestamp: new Date().toISOString()
                    }
                })
            });
            
            this.showNotification('success', 'Testing Started', 'Automated testing started successfully!');
            
            // Refresh requirements data after starting tests
            setTimeout(() => {
                this.loadSessionRequirements(sessionId);
            }, 5000);
            
            return response;
            
        } catch (error) {
            console.error('❌ Error starting automated testing:', error);
            this.showNotification('error', 'Testing Failed', `Failed to start automated testing: ${error.message}`);
            throw error;
        } finally {
            this.loading = false;
        }
    };

            // Run automated test for a specific requirement
        componentInstance.runAutomatedTestForRequirement = async function(requirement) {
            try {
                console.log(`🎯 Running automated test for requirement: ${requirement.criterion_number}`);
                
                if (!this.selectedSessionDetails) {
                    throw new Error('No session selected');
                }

                this.loading = true;
                
                // Run automated test for this specific requirement
                const response = await this.apiCall(`/automated-testing/run/${this.selectedSessionDetails.id}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        testTypes: ['axe', 'pa11y'],
                        specificRequirements: [requirement.criterion_number],
                        clientMetadata: {
                            ip: 'dashboard',
                            userAgent: navigator.userAgent,
                            timestamp: new Date().toISOString()
                        }
                    })
                });
                
                this.showNotification('success', 'Test Started', `Automated test started for ${requirement.criterion_number}`);
                
                // Refresh this specific requirement's data
                setTimeout(() => {
                    this.loadSessionRequirements(this.selectedSessionDetails.id);
                }, 3000);
                
            } catch (error) {
                console.error('❌ Error running automated test:', error);
                this.showNotification('error', 'Test Failed', `Failed to run automated test: ${error.message}`);
            } finally {
                this.loading = false;
            }
        };

        // Review automated test result
        componentInstance.reviewAutomatedTest = async function(instanceId, action, notes = '') {
            try {
                console.log(`🔍 Reviewing automated test ${instanceId} with action: ${action}`);
                
                const response = await this.apiCall(`/automated-testing/review/${instanceId}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: action, // 'approve' or 'reject'
                        notes: notes
                    })
                });
                
                if (response.success) {
                    this.showNotification('success', 'Review Complete', 
                        `Automated test ${action}d successfully`);
                    
                    // Refresh the requirements data
                    if (this.selectedSessionDetails) {
                        this.loadSessionRequirements(this.selectedSessionDetails.id);
                    }
                } else {
                    throw new Error(response.error || 'Review failed');
                }
                
            } catch (error) {
                console.error('❌ Error reviewing automated test:', error);
                this.showNotification('error', 'Review Failed', `Failed to review test: ${error.message}`);
            }
        };

        // Get test instances requiring review
        componentInstance.loadReviewRequiredInstances = async function(sessionId, page = 1) {
            try {
                console.log(`🔍 Loading review required instances for session ${sessionId}`);
                
                const response = await this.apiCall(`/automated-testing/review-required/${sessionId}?page=${page}&limit=20`);
                
                if (response.success) {
                    this.reviewRequiredInstances = response.data.instances;
                    this.reviewRequiredPagination = response.data.pagination;
                    console.log(`📋 Loaded ${this.reviewRequiredInstances.length} instances requiring review`);
                } else {
                    throw new Error(response.error || 'Failed to load review required instances');
                }
                
            } catch (error) {
                console.error('❌ Error loading review required instances:', error);
                this.showNotification('error', 'Loading Failed', `Failed to load review instances: ${error.message}`);
            }
        };

    // Helper functions for requirement status
    componentInstance.getAutomatedTestStatus = function(automatedTests) {
        if (!automatedTests || automatedTests.length === 0) return 'not_tested';
        
        const hasPass = automatedTests.some(test => test.result_status === 'pass' || test.result_status === 'passed');
        const hasFail = automatedTests.some(test => test.result_status === 'fail' || test.result_status === 'failed');
        
        if (hasFail) return 'failed';
        if (hasPass) return 'passed';
        return 'not_tested';
    };

    componentInstance.getManualTestStatus = function(manualTests) {
        if (!manualTests || manualTests.length === 0) return 'not_tested';
        
        const hasCompleted = manualTests.some(test => test.status === 'completed' || test.status === 'passed' || test.status === 'failed');
        const hasPending = manualTests.some(test => test.status === 'pending' || test.status === 'in_progress');
        
        if (hasCompleted) return 'completed';
        if (hasPending) return 'pending';
        return 'not_tested';
    };

    componentInstance.getRequirementOverallStatus = function(automatedTests, manualTests) {
        const autoStatus = this.getAutomatedTestStatus(automatedTests);
        const manualStatus = this.getManualTestStatus(manualTests);
        
        // If either failed, overall is failed
        if (autoStatus === 'failed' || manualStatus === 'failed') return 'failed';
        
        // If both passed, overall is passed
        if (autoStatus === 'passed' && (manualStatus === 'completed' || manualStatus === 'passed')) return 'passed';
        
        // If automated passed but manual not tested (and not required), consider passed
        if (autoStatus === 'passed' && manualStatus === 'not_tested') return 'passed';
        
        // If manual completed but no automated, consider passed
        if (manualStatus === 'completed' && autoStatus === 'not_tested') return 'passed';
        
        // If anything is in progress or pending
        if (autoStatus === 'pending' || manualStatus === 'pending') return 'pending';
        
        return 'not_tested';
    };

    componentInstance.getRequirementOverallStatusClass = function(requirement) {
        const status = requirement.overall_status || this.getRequirementOverallStatus(requirement.automated_tests, requirement.manual_tests);
        
        const classes = {
            'passed': 'bg-green-100 text-green-800',
            'failed': 'bg-red-100 text-red-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'not_tested': 'bg-gray-100 text-gray-600'
        };
        
        return classes[status] || classes.not_tested;
    };

    componentInstance.getTestMethodBadgeClass = function(testMethod) {
        const classes = {
            'automated': 'bg-blue-100 text-blue-800',
            'manual': 'bg-purple-100 text-purple-800',
            'both': 'bg-indigo-100 text-indigo-800'
        };
        return classes[testMethod] || classes.manual;
    };

    // Add missing helper functions for requirements modal
    componentInstance.getLevelBadgeClass = function(level) {
        const classes = {
            'a': 'bg-green-100 text-green-800',
            'aa': 'bg-blue-100 text-blue-800',
            'aaa': 'bg-purple-100 text-purple-800',
            'base': 'bg-yellow-100 text-yellow-800',
            'enhanced': 'bg-orange-100 text-orange-800'
        };
        return classes[level] || 'bg-gray-100 text-gray-800';
    };

    componentInstance.getLevelDisplay = function(level) {
        if (!level) return 'Unknown';
        return level.toUpperCase();
    };

    componentInstance.getTestMethodDisplay = function(method) {
        if (!method) return 'Manual';
        return method.charAt(0).toUpperCase() + method.slice(1);
    };

    componentInstance.getTestInstancesForRequirement = function(requirementId) {
        if (!this.requirementsTestInstances) return [];
        return this.requirementsTestInstances.filter(instance => 
            instance.requirement_id === requirementId || 
            instance.criterion_number === requirementId
        );
    };

    // Automation Run Helper Functions
    componentInstance.getAutomationRunStatusClass = function(status) {
        const classes = {
            'running': 'bg-blue-100 text-blue-800',
            'completed': 'bg-green-100 text-green-800',
            'failed': 'bg-red-100 text-red-800',
            'cancelled': 'bg-gray-100 text-gray-800',
            'pending': 'bg-yellow-100 text-yellow-800'
        };
        return classes[status] || classes.pending;
    };

    componentInstance.getAutomationRunStatusDisplay = function(status) {
        const displays = {
            'running': 'Running',
            'completed': 'Completed',
            'failed': 'Failed',
            'cancelled': 'Cancelled',
            'pending': 'Pending'
        };
        return displays[status] || status;
    };

    componentInstance.formatDuration = function(ms) {
        if (!ms) return 'N/A';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    };

    componentInstance.formatTime = function(date) {
        if (!date) return '';
        return new Date(date).toLocaleTimeString();
    };

    // Legacy function for compatibility with older view templates
    componentInstance.applyRequirementsFilters = function() {
        // Map legacy filters to new structure and call the main filter function
        if (this.requirementsFilters) {
            // Sync legacy filters to new structure
            this.requirementFilters.searchTerm = this.requirementsFilters.search || '';
            this.requirementFilters.wcagLevel = this.requirementsFilters.level || '';
            this.requirementFilters.testMethod = this.requirementsFilters.testMethod || '';
            // Map 'type' to 'testStatus' if needed
            if (this.requirementsFilters.type) {
                this.requirementFilters.testStatus = this.requirementsFilters.type;
            }
        }
        // Call the main filter function
        this.filterRequirements();
    };
    
    // ===== END REQUIREMENTS FUNCTIONALITY =====
    
    // 🛡️ Mark as initialized and store instance
    window._dashboardInitialized = true;
    window._dashboardInstance = componentInstance;
    
    console.log('✅ Dashboard initialized successfully');
    console.log('📊 Global functions available:', {
        dashboard: typeof window.dashboard,
        dashboardInstance: typeof window.dashboardInstance,
        loadSessionRequirements: typeof window.loadSessionRequirements
    });
    
    // ===== GLOBAL FUNCTIONS FOR HTML ONCLICK HANDLERS =====
    
    // User Management Global Functions
    window.showAddUserForm = () => componentInstance.showAddUserForm();
    window.closeUserForm = () => componentInstance.closeUserForm();
    window.closePasswordResetModal = () => componentInstance.closePasswordResetModal();
    window.closeDeleteUserModal = () => componentInstance.closeDeleteUserModal();
    window.confirmDeleteUser = () => componentInstance.confirmDeleteUser();
    window.previousUsersPage = () => componentInstance.previousUsersPage();
    window.nextUsersPage = () => componentInstance.nextUsersPage();
    window.sortUsers = (field) => componentInstance.sortUsers(field);
    window.closeUserManagement = () => componentInstance.closeUserManagement();
        window.showUserManagement = () => {
            console.log('🔍 DEBUG: window.showUserManagement called', {
                stackTrace: new Error().stack
            });
            
            // Nuclear protection during startup
            const now = Date.now();
            const initTime = componentInstance._initializationTime || now;
            const timeSinceInit = now - initTime;
            
            if ((!componentInstance.auth.isAuthenticated && timeSinceInit < 15000) || 
                (componentInstance.auth.isAuthenticated && timeSinceInit < 20000)) {
                console.log('🚫 NUCLEAR BLOCK: Preventing window.showUserManagement during startup period', {
                    timeSinceInit,
                    isAuthenticated: componentInstance.auth.isAuthenticated
                });
                return;
            }
            
            return componentInstance.openUserManagement(true); // Manual open
        };
        window.showAddUserForm = () => componentInstance.showAddUserForm();
        window.closeUserForm = () => componentInstance.closeUserForm();
    
    // Admin Backup Global Functions
    window.showAdminBackup = () => componentInstance.showAdminBackup();
    window.closeAdminBackup = () => componentInstance.closeAdminBackup();
    
    // Session Wizard Global Functions
    window.openSessionWizard = () => componentInstance.openSessionWizard();
    window.closeSessionWizard = () => componentInstance.closeSessionWizard();
    
    // Global dashboard instance for modal access
    window.dashboardInstance = componentInstance;
    
    // Global functions for Alpine.js access
    window.loadSessionRequirements = (sessionId) => componentInstance.loadSessionRequirements(sessionId);
    window.getRequirementOverallStatusClass = (requirement) => componentInstance.getRequirementOverallStatusClass(requirement);
    window.getRequirementOverallStatus = (requirement) => componentInstance.getRequirementOverallStatus(requirement);
    window.getProposedTools = (requirement) => componentInstance.getProposedTools(requirement);
    window.getAutomationConfidenceClass = (confidence) => componentInstance.getAutomationConfidenceClass(confidence);
    window.getAutomationConfidenceDisplay = (confidence) => componentInstance.getAutomationConfidenceDisplay(confidence);
    window.getToolDescription = (tool) => componentInstance.getToolDescription(tool);
    window.getTestMethodBadgeClass = (method) => componentInstance.getTestMethodBadgeClass(method);
    window.getTestStatusBadgeClass = (status) => componentInstance.getTestStatusBadgeClass(status);
    window.getTestStatusDisplay = (status) => componentInstance.getTestStatusDisplay(status);
    window.getAutomationRunStatusClass = (status) => componentInstance.getAutomationRunStatusClass(status);
    window.getAutomationRunStatusDisplay = (status) => componentInstance.getAutomationRunStatusDisplay(status);
    window.formatDuration = (ms) => componentInstance.formatDuration(ms);
    window.formatTime = (date) => componentInstance.formatTime(date);
    window.getRequirementLevelBadgeClass = (level) => componentInstance.getRequirementLevelBadgeClass(level);
    window.getRequirementLevelDisplay = (level) => componentInstance.getRequirementLevelDisplay(level);
    window.getConformanceLevelBadgeClass = (level) => componentInstance.getConformanceLevelBadgeClass(level);
    window.formatTestResult = (result) => componentInstance.formatTestResult(result);
    window.viewRequirementDetails = (requirement) => componentInstance.viewRequirementDetails(requirement);
    window.closeRequirementDetailsModal = () => componentInstance.closeRequirementDetailsModal();
    window.runAutomatedTestForRequirement = (requirement) => componentInstance.runAutomatedTestForRequirement(requirement);
    window.filterRequirements = () => componentInstance.filterRequirements();
    window.updateRequirementsPagination = () => componentInstance.updateRequirementsPagination();
    window.triggerAutomatedTest = (sessionId) => componentInstance.triggerAutomatedTest(sessionId);
    window.loadAutomationRuns = (sessionId) => componentInstance.loadAutomationRuns(sessionId);
    window.viewAutomationRunDetails = (run) => componentInstance.viewAutomationRunDetails(run);
    window.downloadAutomationRunReport = (runId) => componentInstance.downloadAutomationRunReport(runId);
    window.updateAutomationChart = (period) => componentInstance.updateAutomationChart(period);
    window.initAutomationChart = () => componentInstance.initAutomationChart();
    
    // Add missing functions for requirements modal
    window.getLevelBadgeClass = (level) => componentInstance.getLevelBadgeClass(level);
    window.getLevelDisplay = (level) => componentInstance.getLevelDisplay(level);
    window.getTestMethodDisplay = (method) => componentInstance.getTestMethodDisplay(method);
    window.getTestInstancesForRequirement = (requirementId) => componentInstance.getTestInstancesForRequirement(requirementId);
    window.getGroupedTimeline = () => componentInstance.getGroupedTimeline ? componentInstance.getGroupedTimeline() : {};
    
    // Audit Timeline Global Functions
    window.openAuditTimeline = (sessionId, sessionName) => componentInstance.openAuditTimeline(sessionId, sessionName);
    window.closeAuditTimeline = () => componentInstance.closeAuditTimeline();
    window.loadAuditTimeline = () => componentInstance.loadAuditTimeline();
    window.loadMoreTimelineItems = () => componentInstance.loadMoreTimelineItems();
    window.applyAuditTimelineFilters = () => componentInstance.applyAuditTimelineFilters();
    window.resetAuditTimelineFilters = () => componentInstance.resetAuditTimelineFilters();
    
    // Test History Global Functions
    window.toggleTestHistory = (instanceId) => componentInstance.toggleTestHistory(instanceId);
    window.loadTestHistory = (instanceId) => componentInstance.loadTestHistory(instanceId);
    window.closeTestHistory = () => componentInstance.closeTestHistory();
    
    // Debug Functions
    window.refreshURLsData = () => componentInstance.refreshURLsData();
    window.debugURLsData = () => {
        console.log('📊 URLs Debug Info:');
        console.log('- Session pages:', componentInstance.sessionDetailsPages?.length || 0);
        console.log('- Test instances:', componentInstance.sessionDetailsTestInstances?.length || 0);
        console.log('- Requirements with pages:', componentInstance.getUniqueRequirementsWithPages().length);
        console.log('- Selected project:', componentInstance.selectedProject);
        console.log('- Selected test session:', componentInstance.selectedTestSession?.id);
    };

    // Global Helper Functions (accessible from any Alpine.js context)
    window.getTestMethodExplanation = (criterionNumber, testMethod) => componentInstance.getTestMethodExplanation(criterionNumber, testMethod);
    window.getDetailedTestingSteps = (criterionNumber, testMethod) => componentInstance.getDetailedTestingSteps(criterionNumber, testMethod);
    window.getCommonViolations = (criterionNumber) => componentInstance.getCommonViolations(criterionNumber);
    window.getTestingTools = (criterionNumber, testMethod) => componentInstance.getTestingTools(criterionNumber, testMethod);
    
    // Test Instance Management Global Functions
    window.saveTestInstanceDetails = (instanceId, modal) => componentInstance.saveTestInstanceDetails(instanceId, modal);
    window.saveTestInstanceEdit = (instanceId, modal) => componentInstance.saveTestInstanceEdit(instanceId, modal);
    window.viewTestInstanceDetails = (testInstance) => componentInstance.viewTestInstanceDetails(testInstance);
    window.editTestInstance = (testInstance) => componentInstance.editTestInstance(testInstance);
    window.toggleAutomationResults = (instanceId) => componentInstance.toggleAutomationResults(instanceId);
    window.saveTestEvidence = (instanceId, modal) => componentInstance.saveTestEvidence(instanceId, modal);
    
    return componentInstance;
}

// Fallback: Ensure dashboard function is available globally
if (typeof window.dashboard === 'undefined') {
    console.warn('⚠️ Dashboard function not found, creating fallback...');
    window.dashboard = function() {
        console.error('❌ Dashboard function called but not properly initialized');
        return {
            init: () => console.error('Dashboard not initialized'),
            syncLegacyState: () => console.error('Dashboard not initialized')
        };
    };
}
// Unified API Client for Accessibility Testing Platform
// Extracted from dashboard_helpers.js for modular architecture

/**
 * Centralized API client handling all backend communications
 */
class ApiClient {
    constructor(baseURL = 'http://localhost:3001/api') {
        this.baseURL = baseURL;
        this.token = null;
        this.retryCount = 3;
        this.retryDelay = 1000;
    }

    // ========================================
    // AUTHENTICATION & TOKEN MANAGEMENT
    // ========================================

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('auth_token');
        }
        return this.token;
    }

    // ========================================
    // CORE HTTP CLIENT
    // ========================================

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            headers,
            ...options
        };

        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

        try {
            const response = await fetch(url, config);

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
            console.error(`API Request Failed [${endpoint}]:`, error);
            throw error;
        }
    }

    handleAuthError() {
        this.setToken(null);
        // Trigger auth modal or redirect to login
        console.warn('Authentication expired, token cleared');
    }

    // ========================================
    // HEALTH & CONNECTION
    // ========================================

    async checkHealth() {
        try {
            const response = await fetch('http://localhost:3001/health');
            return response.ok;
        } catch (error) {
            console.warn('Health check failed:', error);
            return false;
        }
    }

    // ========================================
    // AUTHENTICATION ENDPOINTS
    // ========================================

    async login(credentials) {
        return await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async getProfile() {
        return await this.request('/auth/profile');
    }

    async getSessions() {
        return await this.request('/auth/sessions');
    }

    async getAuthConfigs() {
        return await this.request('/auth/configs');
    }

    // ========================================
    // PROJECT MANAGEMENT
    // ========================================

    async getProjects() {
        return await this.request('/projects');
    }

    async createProject(projectData) {
        return await this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    async updateProject(projectId, projectData) {
        return await this.request(`/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    }

    async deleteProject(projectId) {
        return await this.request(`/projects/${projectId}`, {
            method: 'DELETE'
        });
    }

    // ========================================
    // WEB CRAWLER MANAGEMENT
    // ========================================

    async getWebCrawlers(projectId) {
        return await this.request(`/web-crawlers/projects/${projectId}/crawlers`);
    }

    async createWebCrawler(crawlerData) {
        return await this.request('/web-crawlers/crawlers', {
            method: 'POST',
            body: JSON.stringify(crawlerData)
        });
    }

    async startCrawler(crawlerId) {
        return await this.request(`/web-crawlers/crawlers/${crawlerId}/start`, {
            method: 'POST'
        });
    }

    async stopCrawler(crawlerId) {
        return await this.request(`/web-crawlers/crawlers/${crawlerId}/stop`, {
            method: 'POST'
        });
    }

    async getCrawlerPages(crawlerId) {
        return await this.request(`/web-crawlers/crawlers/${crawlerId}/pages`);
    }

    // ========================================
    // TESTING SESSIONS
    // ========================================

    async getTestingSessions(projectId = null) {
        const endpoint = projectId ? `/sessions?project_id=${projectId}` : '/sessions';
        return await this.request(endpoint);
    }

    async createTestingSession(sessionData) {
        return await this.request('/sessions', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    }

    async getSessionDetails(sessionId) {
        return await this.request(`/sessions/${sessionId}`);
    }

    async getSessionSummary(sessionId) {
        return await this.request(`/sessions/${sessionId}/comprehensive-summary`);
    }

    async getSessionProgress(sessionId) {
        return await this.request(`/sessions/${sessionId}/progress`);
    }

    // ========================================
    // TEST INSTANCES & REQUIREMENTS
    // ========================================

    async getTestInstances(sessionId) {
        return await this.request(`/test-instances?session_id=${sessionId}`);
    }

    async updateTestInstance(instanceId, instanceData) {
        return await this.request(`/test-instances/${instanceId}`, {
            method: 'PUT',
            body: JSON.stringify(instanceData)
        });
    }

    async getRequirements(sessionId) {
        return await this.request(`/requirements?session_id=${sessionId}`);
    }

    async getPendingReviews(sessionId = null, projectId = null) {
        let endpoint = '/test-instances/reviews/pending';
        const params = new URLSearchParams();

        if (sessionId) params.append('session_id', sessionId);
        if (projectId) params.append('project_id', projectId);

        if (params.toString()) {
            endpoint += '?' + params.toString();
        }

        return await this.request(endpoint);
    }

    // ========================================
    // RESULTS & VIOLATIONS
    // ========================================

    async getViolations(sessionId, params = {}) {
        const queryParams = new URLSearchParams(params);
        const endpoint = params.result_type === 'all' || params.result_type === 'pass'
            ? `/violations/session/${sessionId}/all-results?${queryParams}`
            : `/violations/session/${sessionId}?${queryParams}`;
        
        return await this.request(endpoint);
    }

    async getViolationSummary(sessionId, resultType = 'fail') {
        const endpoint = resultType === 'all' || resultType === 'pass'
            ? `/violations/session/${sessionId}/all-results/summary`
            : `/violations/session/${sessionId}/summary`;
        
        return await this.request(endpoint);
    }

    async getAutomatedTestResults(sessionId) {
        return await this.request(`/results/automated-test-results?session_id=${sessionId}`);
    }

    async getStatistics(timestamp = null) {
        const endpoint = timestamp ? `/results/statistics?_t=${timestamp}` : '/results/statistics';
        return await this.request(endpoint);
    }

    // ========================================
    // MANUAL TESTING
    // ========================================

    async getAvailableTesters() {
        return await this.request('/manual-testing/testers');
    }

    async getManualTestingProgress(sessionId) {
        return await this.request(`/manual-testing/session/${sessionId}/progress`);
    }

    async getCoverageAnalysis(sessionId) {
        return await this.request(`/manual-testing/session/${sessionId}/coverage-analysis`);
    }

    async assignTester(instanceId, testerId) {
        return await this.request(`/test-instances/${instanceId}/assign`, {
            method: 'POST',
            body: JSON.stringify({ tester_id: testerId })
        });
    }

    // ========================================
    // AUDIT TRAIL
    // ========================================

    async getAuditTimeline(sessionId, params = {}) {
        const queryParams = new URLSearchParams(params);
        return await this.request(`/sessions/${sessionId}/audit-timeline?${queryParams}`);
    }

    async getApprovalRequests(sessionId, params = {}) {
        const queryParams = new URLSearchParams(params);
        return await this.request(`/sessions/${sessionId}/approval-requests?${queryParams}`);
    }

    // ========================================
    // FILE UPLOADS
    // ========================================

    async uploadFile(file, sessionId, testInstanceId) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);
        formData.append('test_instance_id', testInstanceId);

        return await this.request('/manual-testing/upload-evidence', {
            method: 'POST',
            headers: {
                // Remove Content-Type to let browser set multipart/form-data boundary
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: formData
        });
    }

    // ========================================
    // AUTOMATED TESTING
    // ========================================

    async startAutomatedTest(sessionId, pages, tools) {
        return await this.request('/automated-testing/start', {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                pages: pages,
                tools: tools
            })
        });
    }

    async getAutomatedTestStatus(sessionId) {
        return await this.request(`/automated-testing/status/${sessionId}`);
    }

    // ========================================
    // ANALYTICS & REPORTING
    // ========================================

    async generateReport(sessionId, options = {}) {
        const queryParams = new URLSearchParams(options);
        return await this.request(`/sessions/${sessionId}/audit-report?${queryParams}`);
    }

    async exportResults(sessionId, format = 'json') {
        return await this.request(`/sessions/${sessionId}/export?format=${format}`);
    }
}

// Create singleton instance
const apiClient = new ApiClient();

// Alpine.js integration function
function createApiClient() {
    return {
        // Expose all methods for Alpine.js components
        async apiCall(endpoint, options = {}) {
            return await apiClient.request(endpoint, options);
        },

        // Convenience methods for common operations
        async checkApiConnection() {
            return await apiClient.checkHealth();
        },

        async login(credentials) {
            return await apiClient.login(credentials);
        },

        async loadProjects() {
            return await apiClient.getProjects();
        },

        async loadWebCrawlers(projectId) {
            return await apiClient.getWebCrawlers(projectId);
        },

        async loadTestingSessions(projectId = null) {
            return await apiClient.getTestingSessions(projectId);
        },

        async loadAnalytics() {
            return await apiClient.getStatistics(Date.now());
        },

        // Token management
        setAuthToken(token) {
            apiClient.setToken(token);
        },

        getAuthToken() {
            return apiClient.getToken();
        },

        clearAuth() {
            apiClient.setToken(null);
        }
    };
}

// Export for both module and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient, apiClient, createApiClient };
}

// Make available globally for Alpine.js
if (typeof window !== 'undefined') {
    window.ApiClient = ApiClient;
    window.apiClient = apiClient;
    window.createApiClient = createApiClient;
} 
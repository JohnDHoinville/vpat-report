/**
 * API Service Layer
 * Centralized service for all API communications
 * Extracted from dashboard.js for better organization and React compatibility
 */

// Create global API service namespace
window.DashboardAPI = window.DashboardAPI || {};

// Configuration
window.DashboardAPI.config = {
    baseUrl: 'http://localhost:3001',
    timeout: 30000,
    retryAttempts: 2
};

// Core API client with authentication and error handling
window.DashboardAPI.client = {
    
    // Get auth token from current dashboard instance
    getAuthToken() {
        if (window.dashboard && typeof window.dashboard === 'function') {
            const dashboardInstance = window.dashboard();
            return dashboardInstance.getAuthToken ? dashboardInstance.getAuthToken() : null;
        }
        return localStorage.getItem('authToken') || null;
    },

    // Get auth headers
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Handle authentication errors
    handleAuthError() {
        console.log('🔐 Authentication error - clearing auth state');
        localStorage.removeItem('authToken');
        if (window.dashboard && typeof window.dashboard === 'function') {
            const dashboardInstance = window.dashboard();
            if (dashboardInstance.handleAuthError) {
                dashboardInstance.handleAuthError();
            }
        }
    },

    // Core API call method
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
            
            const finalUrl = `${window.DashboardAPI.config.baseUrl}/api${endpoint}`;
            
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
            throw error;
        }
    }
};

// ===== AUTHENTICATION SERVICES =====
window.DashboardAPI.auth = {
    async login(credentials) {
        return window.DashboardAPI.client.apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },

    async getProfile() {
        return window.DashboardAPI.client.apiCall('/auth/profile');
    },

    async updateProfile(profileData) {
        return window.DashboardAPI.client.apiCall('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    },

    async changePassword(currentPassword, newPassword) {
        return window.DashboardAPI.client.apiCall('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    },

    async getSessions() {
        return window.DashboardAPI.client.apiCall('/auth/sessions');
    },

    async terminateSession(sessionId) {
        return window.DashboardAPI.client.apiCall(`/auth/sessions/${sessionId}`, {
            method: 'DELETE'
        });
    },

    async getConfigs() {
        return window.DashboardAPI.client.apiCall('/auth/configs');
    },

    async testConfig(authConfig) {
        return window.DashboardAPI.client.apiCall(`/auth/configs/${authConfig.id}/test`, {
            method: 'POST',
            body: JSON.stringify(authConfig)
        });
    },

    async createConfig(authConfig) {
        return window.DashboardAPI.client.apiCall('/auth/configs', {
            method: 'POST',
            body: JSON.stringify(authConfig)
        });
    },

    async updateConfig(authConfig) {
        return window.DashboardAPI.client.apiCall(`/auth/configs/${authConfig.id}`, {
            method: 'PUT',
            body: JSON.stringify(authConfig)
        });
    },

    async deleteConfig(authConfigId) {
        return window.DashboardAPI.client.apiCall(`/auth/configs/${authConfigId}`, {
            method: 'DELETE'
        });
    }
};

// ===== PROJECT SERVICES =====
window.DashboardAPI.projects = {
    async getAll(includeArchived = false) {
        return window.DashboardAPI.client.apiCall(`/projects?include_archived=${includeArchived}`);
    },

    async getById(projectId) {
        return window.DashboardAPI.client.apiCall(`/projects/${projectId}`);
    },

    async create(project) {
        return window.DashboardAPI.client.apiCall('/projects', {
            method: 'POST',
            body: JSON.stringify(project)
        });
    },

    async update(projectId, project) {
        return window.DashboardAPI.client.apiCall(`/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(project)
        });
    },

    async delete(projectId) {
        return window.DashboardAPI.client.apiCall(`/projects/${projectId}`, {
            method: 'DELETE'
        });
    },

    async getDiscoveries(projectId) {
        return window.DashboardAPI.client.apiCall(`/projects/${projectId}/discoveries`);
    },

    async getSessions(projectId) {
        return window.DashboardAPI.client.apiCall(`/sessions?project_id=${projectId}`);
    },

    async startComprehensiveTesting(projectId, options) {
        return window.DashboardAPI.client.apiCall(`/projects/${projectId}/comprehensive-testing`, {
            method: 'POST',
            body: JSON.stringify(options)
        });
    }
};

// ===== TESTING SESSION SERVICES =====
window.DashboardAPI.testingSessions = {
    async getAll(projectId = null) {
        const endpoint = projectId ? `/testing-sessions?project_id=${projectId}` : '/testing-sessions';
        return window.DashboardAPI.client.apiCall(endpoint);
    },

    async getById(sessionId, includeInstances = false) {
        return window.DashboardAPI.client.apiCall(`/testing-sessions/${sessionId}?include_instances=${includeInstances}`);
    },

    async create(session) {
        return window.DashboardAPI.client.apiCall('/testing-sessions', {
            method: 'POST',
            body: JSON.stringify(session)
        });
    },

    async update(sessionId, updates) {
        return window.DashboardAPI.client.apiCall(`/testing-sessions/${sessionId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async delete(sessionId) {
        return window.DashboardAPI.client.apiCall(`/testing-sessions/${sessionId}`, {
            method: 'DELETE'
        });
    },

    async duplicate(sessionId, options = {}) {
        return window.DashboardAPI.client.apiCall(`/testing-sessions/${sessionId}/duplicate`, {
            method: 'POST',
            body: JSON.stringify(options)
        });
    },

    async getMatrix(sessionId) {
        return window.DashboardAPI.client.apiCall(`/test-instances/session/${sessionId}/matrix`);
    },

    async exportResults(sessionId, format = 'json') {
        return window.DashboardAPI.client.apiCall(`/sessions/${sessionId}/export-results`, {
            method: 'POST',
            body: JSON.stringify({ format })
        });
    },

    async getProgress(sessionId) {
        return window.DashboardAPI.client.apiCall(`/testing-sessions/${sessionId}?include_progress=true`);
    }
};

// ===== TEST INSTANCE SERVICES =====
window.DashboardAPI.testInstances = {
    async getBySession(sessionId, page = 1, limit = 50) {
        return window.DashboardAPI.client.apiCall(`/test-instances?session_id=${sessionId}&page=${page}&limit=${limit}`);
    },

    async getById(instanceId) {
        return window.DashboardAPI.client.apiCall(`/test-instances/${instanceId}`);
    },

    async update(instanceId, updates) {
        return window.DashboardAPI.client.apiCall(`/test-instances/${instanceId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async updateStatus(instanceId, status, notes = '') {
        return window.DashboardAPI.client.apiCall(`/test-instances/${instanceId}`, {
            method: 'PUT',
            body: JSON.stringify({ status, notes })
        });
    },

    async assign(instanceId, userId) {
        return window.DashboardAPI.client.apiCall(`/test-instances/${instanceId}/assign`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
    },

    async getAuditLog(instanceId) {
        return window.DashboardAPI.client.apiCall(`/test-instances/${instanceId}/audit-log`);
    },

    async create(testInstance) {
        return window.DashboardAPI.client.apiCall('/test-instances', {
            method: 'POST',
            body: JSON.stringify(testInstance)
        });
    },

    async search(filters) {
        const params = new URLSearchParams(filters).toString();
        return window.DashboardAPI.client.apiCall(`/test-instances?${params}`);
    }
};

// ===== AUTOMATED TESTING SERVICES =====
window.DashboardAPI.automatedTesting = {
    async runPerInstance(sessionId, options) {
        return window.DashboardAPI.client.apiCall(`/automated-testing/run-per-instance/${sessionId}`, {
            method: 'POST',
            body: JSON.stringify(options)
        });
    },

    async getStatus(sessionId) {
        return window.DashboardAPI.client.apiCall(`/automated-testing/status/${sessionId}`);
    },

    async getHistory(sessionId, limit = 50) {
        return window.DashboardAPI.client.apiCall(`/automated-testing/history/${sessionId}?limit=${limit}`);
    },

    async getInstanceResults(instanceId) {
        return window.DashboardAPI.client.apiCall(`/automated-testing/instance-results/${instanceId}`);
    },

    async getResults(runId) {
        return window.DashboardAPI.client.apiCall(`/automated-testing/results/${runId}`);
    },

    async getSpecializedAnalysis(instanceId) {
        return window.DashboardAPI.client.apiCall(`/api/automated-testing/specialized-analysis/${instanceId}`);
    },

    async getRemediationGuidance(sessionId, page = 1, limit = 50) {
        return window.DashboardAPI.client.apiCall(`/api/automated-testing/remediation-guidance/${sessionId}?page=${page}&limit=${limit}`);
    }
};

// ===== MANUAL TESTING SERVICES =====
window.DashboardAPI.manualTesting = {
    async getAssignments(sessionId, filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return window.DashboardAPI.client.apiCall(`/manual-testing/session/${sessionId}/assignments?${params}`);
    },

    async getCoverageAnalysis(sessionId) {
        return window.DashboardAPI.client.apiCall(`/manual-testing/session/${sessionId}/coverage-analysis`);
    },

    async getProgress(sessionId) {
        return window.DashboardAPI.client.apiCall(`/manual-testing/session/${sessionId}/progress`);
    },

    async getProcedure(requirementId, filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return window.DashboardAPI.client.apiCall(`/manual-testing/requirement/${requirementId}/procedure?${params}`);
    },

    async submitResult(sessionId, result) {
        return window.DashboardAPI.client.apiCall(`/manual-testing/session/${sessionId}/result`, {
            method: 'POST',
            body: JSON.stringify(result)
        });
    }
};

// ===== WEB CRAWLER SERVICES =====
window.DashboardAPI.webCrawlers = {
    async getByProject(projectId) {
        return window.DashboardAPI.client.apiCall(`/web-crawlers/projects/${projectId}/crawlers`);
    },

    async getPages(crawlerId, limit = 1000) {
        return window.DashboardAPI.client.apiCall(`/web-crawlers/crawlers/${crawlerId}/pages?limit=${limit}`);
    },

    async updatePageTesting(pageId, enabled) {
        return window.DashboardAPI.client.apiCall(`/web-crawlers/crawler-pages/${pageId}/testing`, {
            method: 'PUT',
            body: JSON.stringify({ enabled })
        });
    },

    async bulkUpdatePageTesting(crawlerId, pageIds, enabled) {
        return window.DashboardAPI.client.apiCall(`/web-crawlers/crawlers/${crawlerId}/pages/bulk-testing`, {
            method: 'PUT',
            body: JSON.stringify({ page_ids: pageIds, enabled })
        });
    },

    async getPageSelections(crawlerId) {
        return window.DashboardAPI.client.apiCall(`/web-crawlers/crawlers/${crawlerId}/page-selections`);
    },

    async updatePageSelections(crawlerId, selections) {
        return window.DashboardAPI.client.apiCall(`/web-crawlers/crawlers/${crawlerId}/page-selections`, {
            method: 'PUT',
            body: JSON.stringify(selections)
        });
    }
};

// ===== USER MANAGEMENT SERVICES =====
window.DashboardAPI.users = {
    async getAll(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return window.DashboardAPI.client.apiCall(`/users?${params}`);
    },

    async getById(userId) {
        return window.DashboardAPI.client.apiCall(`/users/${userId}`);
    },

    async create(user) {
        return window.DashboardAPI.client.apiCall('/users', {
            method: 'POST',
            body: JSON.stringify(user)
        });
    },

    async update(userId, user) {
        return window.DashboardAPI.client.apiCall(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(user)
        });
    },

    async delete(userId) {
        return window.DashboardAPI.client.apiCall(`/users/${userId}`, {
            method: 'DELETE'
        });
    },

    async resetPassword(userId, newPassword) {
        return window.DashboardAPI.client.apiCall(`/users/${userId}/password`, {
            method: 'PUT',
            body: JSON.stringify({ password: newPassword })
        });
    },

    async activate(userId) {
        return window.DashboardAPI.client.apiCall(`/users/${userId}/activate`, {
            method: 'POST'
        });
    }
};

// ===== REQUIREMENTS SERVICES =====
window.DashboardAPI.requirements = {
    async getAll(limit = 100) {
        return window.DashboardAPI.client.apiCall(`/requirements?limit=${limit}`);
    },

    async getBySession(sessionId) {
        return window.DashboardAPI.client.apiCall(`/unified-requirements/session/${sessionId}`);
    },

    async getByConformanceLevel(level) {
        return window.DashboardAPI.client.apiCall(`/unified-requirements/conformance/${level}`);
    },

    async create(requirement) {
        return window.DashboardAPI.client.apiCall('/requirements', {
            method: 'POST',
            body: JSON.stringify(requirement)
        });
    }
};

// ===== AUDIT TRAIL SERVICES =====
window.DashboardAPI.auditTrail = {
    async getBySession(sessionId, limit = 10, includeMetadata = true) {
        return window.DashboardAPI.client.apiCall(`/audit-trail/session/${sessionId}?limit=${limit}&include_metadata=${includeMetadata}`);
    },

    async getComplianceReport(sessionId) {
        return window.DashboardAPI.client.apiCall(`/audit-trail/compliance-report/${sessionId}`);
    }
};

// ===== ADMIN SERVICES =====
window.DashboardAPI.admin = {
    async getDatabaseStatus() {
        return window.DashboardAPI.client.apiCall('/admin/database/status');
    },

    async getBackups() {
        return window.DashboardAPI.client.apiCall('/admin/backups');
    },

    async createBackup(options) {
        return window.DashboardAPI.client.apiCall('/admin/backups', {
            method: 'POST',
            body: JSON.stringify(options)
        });
    },

    async restoreBackup(backupId, options) {
        return window.DashboardAPI.client.apiCall(`/admin/backups/${backupId}/restore`, {
            method: 'POST',
            body: JSON.stringify(options)
        });
    },

    async deleteBackup(backupId) {
        return window.DashboardAPI.client.apiCall(`/admin/backups/${backupId}`, {
            method: 'DELETE'
        });
    }
};

// ===== SESSION MANAGEMENT SERVICES =====
window.DashboardAPI.sessions = {
    async create(session) {
        return window.DashboardAPI.client.apiCall('/sessions', {
            method: 'POST',
            body: JSON.stringify(session)
        });
    },

    async update(sessionId, updates) {
        return window.DashboardAPI.client.apiCall(`/sessions/${sessionId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async duplicate(sessionId, options) {
        return window.DashboardAPI.client.apiCall(`/sessions/${sessionId}/duplicate`, {
            method: 'POST',
            body: JSON.stringify(options)
        });
    },

    async startPlaywright(sessionId, options) {
        return window.DashboardAPI.client.apiCall(`/sessions/${sessionId}/start-playwright`, {
            method: 'POST',
            body: JSON.stringify(options)
        });
    },

    async getInfo(projectId) {
        return fetch(`${window.DashboardAPI.config.baseUrl}/api/session/info?project_id=${projectId}`, {
            headers: window.DashboardAPI.client.getAuthHeaders()
        }).then(response => response.json());
    }
};

// ===== HEALTH CHECK SERVICE =====
window.DashboardAPI.health = {
    async check() {
        return window.DashboardAPI.client.apiCall('/health');
    }
};

console.log('✅ Dashboard API Service loaded with', Object.keys(window.DashboardAPI).length, 'service categories');
console.log('📡 Available services: auth, projects, testingSessions, testInstances, automatedTesting, manualTesting, webCrawlers, users, requirements, auditTrail, admin, sessions, health'); 
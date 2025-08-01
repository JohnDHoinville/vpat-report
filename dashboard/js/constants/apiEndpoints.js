/**
 * API Endpoints Constants
 * Extracted from dashboard.js for better organization and maintenance
 */

export const API_ENDPOINTS = {
    // Authentication endpoints
    AUTH: {
        SESSION_INFO: '/api/auth/session-info',
        REFRESH: '/api/auth/refresh',
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout'
    },

    // Health and system endpoints
    HEALTH: '/api/health',

    // Project endpoints
    PROJECTS: {
        LIST: '/api/projects',
        BY_ID: (id) => `/api/projects/${id}`,
        DISCOVERIES: (id) => `/api/projects/${id}/discoveries`,
        SESSIONS: (id) => `/api/projects/${id}/sessions`,
        AUTOMATED_RESULTS: (id) => `/api/projects/${id}/automated-results`,
        SESSION_RESULTS: (id) => `/api/projects/${id}/session-results`,
        RESULTS_SUMMARY: (id) => `/api/projects/${id}/results-summary`,
        COMPLIANCE_ANALYSIS: (id) => `/api/projects/${id}/compliance-analysis`,
        RECENT_VIOLATIONS: (id) => `/api/projects/${id}/recent-violations`,
        EXPORT_RESULTS: (id) => `/api/projects/${id}/export-results`
    },

    // Web Crawler endpoints
    WEB_CRAWLERS: {
        BY_PROJECT: (projectId) => `/api/web-crawlers/projects/${projectId}/crawlers`,
        BY_ID: (id) => `/api/web-crawlers/crawlers/${id}`,
        PAGES: (id, limit = 1000) => `/api/web-crawlers/crawlers/${id}/pages?limit=${limit}`,
        START: (id) => `/api/web-crawlers/crawlers/${id}/start`,
        DELETE: (id) => `/api/web-crawlers/crawlers/${id}`
    },

    // Discovery endpoints
    DISCOVERIES: {
        BY_ID: (id) => `/api/discoveries/${id}`,
        STATUS: (id) => `/api/discoveries/${id}/status`,
        PAGES: (id) => `/api/discoveries/${id}/pages`,
        PAGES_SELECTION: (id) => `/api/discoveries/${id}/pages/selection`
    },

    // Session endpoints
    SESSIONS: {
        LIST: '/api/sessions',
        BY_ID: (id) => `/api/sessions/${id}`,
        STATUS: (id) => `/api/sessions/${id}/status`,
        PAUSE: (id) => `/api/sessions/${id}/pause`,
        RESUME: (id) => `/api/sessions/${id}/resume`,
        RESULTS: (id) => `/api/sessions/${id}/results`,
        STOP: (id) => `/api/sessions/${id}/stop`,
        REPORT: (id) => `/api/sessions/${id}/report`,
        DETAILED_RESULTS: (id) => `/api/sessions/${id}/detailed-results`,
        EXPORT: (id) => `/api/sessions/${id}/export`,
        CAPTURE: '/api/session/capture',
        COMPLETE_CAPTURE: '/api/session/complete-capture',
        CANCEL_CAPTURE: '/api/session/cancel-capture',
        INFO: (projectId) => `/api/session/info?project_id=${projectId}`,
        TEST: '/api/session/test',
        CLEAR: (projectId) => `/api/session/clear?project_id=${projectId}`
    },

    // Testing endpoints
    TESTING: {
        AUTOMATED: {
            SPECIALIZED_ANALYSIS: (instanceId) => `/api/automated-testing/specialized-analysis/${instanceId}`,
            REMEDIATION_GUIDANCE: (sessionId, page = 1, limit = 50) => 
                `/api/automated-testing/remediation-guidance/${sessionId}?page=${page}&limit=${limit}`,
            RUN_PER_INSTANCE: (sessionId) => `/api/automated-testing/run-per-instance/${sessionId}`,
            STATUS: (sessionId) => `/api/automated-testing/status/${sessionId}`,
            HISTORY: (sessionId, limit = 50) => `/api/automated-testing/history/${sessionId}?limit=${limit}`,
            INSTANCE_RESULTS: (instanceId) => `/api/automated-testing/instance-results/${instanceId}`
        },
        MANUAL: {
            SUBMIT_RESULT: '/api/manual-testing/submit-result',
            UPDATE_STATUS: '/api/manual-testing/update-status',
            UPLOAD_EVIDENCE: '/api/manual-testing/upload-evidence'
        },
        TEST_INSTANCES: '/api/test-instances',
        TEST_INSTANCES_BY_SESSION: (sessionId, page = 1, limit = 50) => 
            `/api/test-instances?session_id=${sessionId}&page=${page}&limit=${limit}`,
        TEST_INSTANCE_BY_ID: (id) => `/api/test-instances/${id}`,
        TEST_INSTANCE_AUDIT_LOG: (id) => `/api/test-instances/${id}/audit-log`
    },

    // Requirements endpoints
    REQUIREMENTS: {
        TEST: '/api/requirements/test',
        BY_SESSION: (sessionId) => `/api/unified-requirements/session/${sessionId}`
    },

    // Admin endpoints
    ADMIN: {
        BACKUPS: {
            LIST: '/api/admin/backups',
            DOWNLOAD: (id) => `/api/admin/backups/${id}/download`,
            CREATE: '/api/admin/backups/create',
            DELETE: (id) => `/api/admin/backups/${id}`
        },
        DATABASE: {
            STATUS: '/api/admin/database/status'
        },
        USERS: {
            LIST: '/api/admin/users',
            CREATE: '/api/admin/users',
            UPDATE: (id) => `/api/admin/users/${id}`,
            DELETE: (id) => `/api/admin/users/${id}`,
            RESET_PASSWORD: (id) => `/api/admin/users/${id}/reset-password`
        }
    },

    // Audit trail endpoints
    AUDIT_TRAIL: {
        BY_SESSION: (sessionId, limit = 10, includeMetadata = true) => 
            `/api/audit-trail/session/${sessionId}?limit=${limit}&include_metadata=${includeMetadata}`
    },

    // Testing sessions endpoints
    TESTING_SESSIONS: {
        BY_ID: (id) => `/api/testing-sessions/${id}`,
        CREATE: '/api/testing-sessions',
        UPDATE: (id) => `/api/testing-sessions/${id}`,
        DELETE: (id) => `/api/testing-sessions/${id}`
    }
};

// Base configuration
export const API_CONFIG = {
    DEFAULT_BASE_URL: 'http://localhost:3001',
    DEFAULT_TIMEOUT: 30000,
    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Helper function to build full API URL
export function buildApiUrl(endpoint, baseUrl = API_CONFIG.DEFAULT_BASE_URL) {
    return `${baseUrl}${endpoint}`;
}

// Helper function to build API endpoint with parameters
export function buildEndpoint(endpointFunction, ...params) {
    if (typeof endpointFunction === 'function') {
        return endpointFunction(...params);
    }
    return endpointFunction;
} 
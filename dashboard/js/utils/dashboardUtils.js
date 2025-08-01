/**
 * Dashboard Utilities - Consolidated
 * All extracted utility functions in one file for easy integration with dashboard.js
 * This approach avoids ES6 module complexity while still organizing code
 */

// Create global utilities namespace
window.DashboardUtils = window.DashboardUtils || {};

// ===== DATE HELPERS =====
window.DashboardUtils.formatTime = function(date) {
    if (!date) return '';
    return new Date(date).toLocaleTimeString();
};

window.DashboardUtils.formatDate = function(date) {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString();
};

window.DashboardUtils.formatDateTime = function(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

window.DashboardUtils.formatDateTimeShort = function(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
};

window.DashboardUtils.formatDuration = function(ms) {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

window.DashboardUtils.timeAgo = function(dateString) {
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
};

window.DashboardUtils.formatGroupHeader = function(date) {
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

// ===== STRING HELPERS =====
window.DashboardUtils.escapeHtml = function(text) {
    if (typeof text !== 'string') return text;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
};

window.DashboardUtils.capitalize = function(str) {
    if (!str || typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
};

window.DashboardUtils.toTitleCase = function(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

window.DashboardUtils.truncateText = function(text, maxLength = 50) {
    if (!text || typeof text !== 'string') return text;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
};

// ===== VALIDATORS =====
window.DashboardUtils.isValidEmail = function(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

window.DashboardUtils.validateUserForm = function(userForm) {
    const errors = {};
    
    if (!userForm.username || !userForm.username.trim()) {
        errors.username = 'Username is required';
    }
    
    if (!userForm.email || !userForm.email.trim()) {
        errors.email = 'Email is required';
    } else if (!window.DashboardUtils.isValidEmail(userForm.email)) {
        errors.email = 'Invalid email format';
    }
    
    if (!userForm.id && !userForm.password) {
        errors.password = 'Password is required for new users';
    }
    
    if (userForm.password && userForm.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
    }
    
    if (userForm.password !== userForm.confirm_password) {
        errors.confirm_password = 'Passwords do not match';
    }
    
    return {
        errors,
        isValid: Object.keys(errors).length === 0
    };
};

// ===== UI CONSTANTS =====
window.DashboardUtils.TEST_STATUS = {
    PENDING: 'pending',
    NOT_STARTED: 'not_started', 
    IN_PROGRESS: 'in_progress',
    PASSED: 'passed',
    PASSED_REVIEW_REQUIRED: 'passed_review_required',
    FAILED: 'failed',
    UNTESTABLE: 'untestable',
    NOT_APPLICABLE: 'not_applicable',
    COMPLETED: 'completed',
    RUNNING: 'running',
    ERROR: 'error'
};

window.DashboardUtils.STATUS_BADGE_CLASSES = {
    'pending': 'bg-gray-100 text-gray-800',
    'not_started': 'bg-gray-100 text-gray-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'passed': 'bg-green-100 text-green-800',
    'passed_review_required': 'bg-orange-100 text-orange-800',
    'failed': 'bg-red-100 text-red-800',
    'untestable': 'bg-yellow-100 text-yellow-800',
    'not_applicable': 'bg-gray-100 text-gray-600',
    'completed': 'bg-green-100 text-green-800',
    'running': 'bg-blue-100 text-blue-800',
    'error': 'bg-red-100 text-red-800',
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

window.DashboardUtils.STATUS_DISPLAY_TEXT = {
    'pending': 'Not Started',
    'not_started': 'Not Started',
    'in_progress': 'In Progress',
    'passed': 'Passed',
    'passed_review_required': 'Passed - Review Required',
    'failed': 'Failed',
    'untestable': 'Untestable',
    'not_applicable': 'N/A',
    'completed': 'Completed',
    'running': 'Running',
    'error': 'Error'
};

// ===== UI HELPER FUNCTIONS =====
window.DashboardUtils.getStatusBadgeClass = function(status) {
    return window.DashboardUtils.STATUS_BADGE_CLASSES[status] || 'bg-gray-100 text-gray-800';
};

window.DashboardUtils.getStatusDisplayText = function(status) {
    return window.DashboardUtils.STATUS_DISPLAY_TEXT[status] || 
           (status ? status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1) : 'Unknown');
};

window.DashboardUtils.getTestMethodBadgeClass = function(method) {
    const classes = {
        'manual': 'bg-blue-100 text-blue-800',
        'automated': 'bg-green-100 text-green-800',
        'hybrid': 'bg-purple-100 text-purple-800',
        'both': 'bg-purple-100 text-purple-800'
    };
    return classes[method] || 'bg-gray-100 text-gray-800';
};

window.DashboardUtils.getLevelDisplay = function(level) {
    const displays = {
        'A': 'Level A',
        'AA': 'Level AA', 
        'AAA': 'Level AAA'
    };
    return displays[level] || level?.toUpperCase() || 'N/A';
};

// ===== DATA TRANSFORMERS =====
window.DashboardUtils.transformRequirements = function(requirementsData) {
    if (!Array.isArray(requirementsData)) {
        console.warn('Expected requirements data to be an array, got:', typeof requirementsData);
        return [];
    }

    return requirementsData.map(req => ({
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
    }));
};

window.DashboardUtils.transformStatusForDisplay = function(status) {
    if (!status) return 'Unknown';
    
    return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// ===== API ENDPOINTS =====
window.DashboardUtils.API_ENDPOINTS = {
    AUTH: {
        SESSION_INFO: '/api/auth/session-info',
        REFRESH: '/api/auth/refresh',
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout'
    },
    HEALTH: '/api/health',
    PROJECTS: {
        LIST: '/api/projects',
        BY_ID: (id) => `/api/projects/${id}`,
        DISCOVERIES: (id) => `/api/projects/${id}/discoveries`,
        SESSIONS: (id) => `/api/projects/${id}/sessions`
    },
    TESTING: {
        AUTOMATED: {
            RUN_PER_INSTANCE: (sessionId) => `/api/automated-testing/run-per-instance/${sessionId}`,
            STATUS: (sessionId) => `/api/automated-testing/status/${sessionId}`,
            HISTORY: (sessionId, limit = 50) => `/api/automated-testing/history/${sessionId}?limit=${limit}`,
            INSTANCE_RESULTS: (instanceId) => `/api/automated-testing/instance-results/${instanceId}`
        },
        TEST_INSTANCES: '/api/test-instances',
        TEST_INSTANCES_BY_SESSION: (sessionId, page = 1, limit = 50) => 
            `/api/test-instances?session_id=${sessionId}&page=${page}&limit=${limit}`,
        TEST_INSTANCE_BY_ID: (id) => `/api/test-instances/${id}`,
        TEST_INSTANCE_AUDIT_LOG: (id) => `/api/test-instances/${id}/audit-log`
    }
};

console.log('✅ Dashboard utilities loaded and available globally as window.DashboardUtils'); 
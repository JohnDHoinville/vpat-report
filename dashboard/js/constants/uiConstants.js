/**
 * UI Constants
 * Extracted from dashboard.js for better organization and consistency
 */

// Test Status Mappings
export const TEST_STATUS = {
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

// Automation Run Status
export const AUTOMATION_STATUS = {
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    PENDING: 'pending'
};

// WCAG Levels
export const WCAG_LEVELS = {
    A: 'A',
    AA: 'AA',
    AAA: 'AAA'
};

// User Roles
export const USER_ROLES = {
    ADMIN: 'admin',
    TESTER: 'tester',
    REVIEWER: 'reviewer',
    VIEW_ONLY: 'view_only'
};

// Audit Log Action Types
export const AUDIT_ACTIONS = {
    CREATED: 'created',
    ASSIGNMENT: 'assignment',
    STATUS_CHANGE: 'status_change',
    NOTE_ADDED: 'note_added',
    NOTE_UPDATED: 'note_updated',
    EVIDENCE_UPLOADED: 'evidence_uploaded',
    EVIDENCE_REMOVED: 'evidence_removed',
    REVIEW_REQUESTED: 'review_requested',
    REVIEWED: 'reviewed',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    REMEDIATION_ADDED: 'remediation_added',
    AUTOMATED_UPDATE: 'automated_update',
    UPDATED: 'updated'
};

// Status Badge Classes
export const STATUS_BADGE_CLASSES = {
    // Test status classes
    [TEST_STATUS.PENDING]: 'bg-gray-100 text-gray-800',
    [TEST_STATUS.NOT_STARTED]: 'bg-gray-100 text-gray-800',
    [TEST_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
    [TEST_STATUS.PASSED]: 'bg-green-100 text-green-800',
    [TEST_STATUS.PASSED_REVIEW_REQUIRED]: 'bg-orange-100 text-orange-800',
    [TEST_STATUS.FAILED]: 'bg-red-100 text-red-800',
    [TEST_STATUS.UNTESTABLE]: 'bg-yellow-100 text-yellow-800',
    [TEST_STATUS.NOT_APPLICABLE]: 'bg-gray-100 text-gray-600',
    [TEST_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
    [TEST_STATUS.RUNNING]: 'bg-blue-100 text-blue-800',
    [TEST_STATUS.ERROR]: 'bg-red-100 text-red-800',

    // Automation status classes
    [AUTOMATION_STATUS.RUNNING]: 'bg-blue-100 text-blue-800',
    [AUTOMATION_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
    [AUTOMATION_STATUS.FAILED]: 'bg-red-100 text-red-800',
    [AUTOMATION_STATUS.CANCELLED]: 'bg-gray-100 text-gray-800',
    [AUTOMATION_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',

    // Audit log action type classes
    [AUDIT_ACTIONS.CREATED]: 'bg-green-100 text-green-800',
    [AUDIT_ACTIONS.ASSIGNMENT]: 'bg-blue-100 text-blue-800',
    [AUDIT_ACTIONS.STATUS_CHANGE]: 'bg-purple-100 text-purple-800',
    [AUDIT_ACTIONS.NOTE_ADDED]: 'bg-yellow-100 text-yellow-800',
    [AUDIT_ACTIONS.NOTE_UPDATED]: 'bg-yellow-100 text-yellow-800',
    [AUDIT_ACTIONS.EVIDENCE_UPLOADED]: 'bg-indigo-100 text-indigo-800',
    [AUDIT_ACTIONS.EVIDENCE_REMOVED]: 'bg-red-100 text-red-800',
    [AUDIT_ACTIONS.REVIEW_REQUESTED]: 'bg-orange-100 text-orange-800',
    [AUDIT_ACTIONS.REVIEWED]: 'bg-green-100 text-green-800',
    [AUDIT_ACTIONS.APPROVED]: 'bg-green-100 text-green-800',
    [AUDIT_ACTIONS.REJECTED]: 'bg-red-100 text-red-800',
    [AUDIT_ACTIONS.REMEDIATION_ADDED]: 'bg-teal-100 text-teal-800',
    [AUDIT_ACTIONS.AUTOMATED_UPDATE]: 'bg-purple-100 text-purple-800',
    [AUDIT_ACTIONS.UPDATED]: 'bg-gray-100 text-gray-800'
};

// Status Text Classes (for text color only)
export const STATUS_TEXT_CLASSES = {
    [TEST_STATUS.PENDING]: 'text-gray-600',
    [TEST_STATUS.NOT_STARTED]: 'text-gray-600',
    [TEST_STATUS.IN_PROGRESS]: 'text-yellow-600',
    [TEST_STATUS.PASSED]: 'text-green-600',
    [TEST_STATUS.FAILED]: 'text-red-600',
    [TEST_STATUS.UNTESTABLE]: 'text-orange-600',
    [TEST_STATUS.NOT_APPLICABLE]: 'text-blue-600'
};

// Display Text Mappings
export const STATUS_DISPLAY_TEXT = {
    // Test status displays
    [TEST_STATUS.PENDING]: 'Not Started',
    [TEST_STATUS.NOT_STARTED]: 'Not Started',
    [TEST_STATUS.IN_PROGRESS]: 'In Progress',
    [TEST_STATUS.PASSED]: 'Passed',
    [TEST_STATUS.PASSED_REVIEW_REQUIRED]: 'Passed - Review Required',
    [TEST_STATUS.FAILED]: 'Failed',
    [TEST_STATUS.UNTESTABLE]: 'Untestable',
    [TEST_STATUS.NOT_APPLICABLE]: 'N/A',
    [TEST_STATUS.COMPLETED]: 'Completed',
    [TEST_STATUS.RUNNING]: 'Running',
    [TEST_STATUS.ERROR]: 'Error',

    // Automation status displays
    [AUTOMATION_STATUS.RUNNING]: 'Running',
    [AUTOMATION_STATUS.COMPLETED]: 'Completed',
    [AUTOMATION_STATUS.FAILED]: 'Failed',
    [AUTOMATION_STATUS.CANCELLED]: 'Cancelled',
    [AUTOMATION_STATUS.PENDING]: 'Pending'
};

// WCAG Level Display Text
export const WCAG_LEVEL_DISPLAY = {
    [WCAG_LEVELS.A]: 'Level A',
    [WCAG_LEVELS.AA]: 'Level AA',
    [WCAG_LEVELS.AAA]: 'Level AAA'
};

// Test Method Badge Classes
export const TEST_METHOD_BADGE_CLASSES = {
    'manual': 'bg-blue-100 text-blue-800',
    'automated': 'bg-green-100 text-green-800',
    'hybrid': 'bg-purple-100 text-purple-800',
    'both': 'bg-purple-100 text-purple-800'
};

// Action Type Icons for audit log
export const ACTION_TYPE_ICONS = {
    [AUDIT_ACTIONS.CREATED]: '✨',
    [AUDIT_ACTIONS.ASSIGNMENT]: '👤',
    [AUDIT_ACTIONS.STATUS_CHANGE]: '🔄',
    [AUDIT_ACTIONS.NOTE_ADDED]: '📝',
    [AUDIT_ACTIONS.NOTE_UPDATED]: '📝',
    [AUDIT_ACTIONS.EVIDENCE_UPLOADED]: '📎',
    [AUDIT_ACTIONS.EVIDENCE_REMOVED]: '🗑️',
    [AUDIT_ACTIONS.REVIEW_REQUESTED]: '👁️',
    [AUDIT_ACTIONS.REVIEWED]: '✅',
    [AUDIT_ACTIONS.APPROVED]: '✅',
    [AUDIT_ACTIONS.REJECTED]: '❌',
    [AUDIT_ACTIONS.REMEDIATION_ADDED]: '🔧',
    [AUDIT_ACTIONS.AUTOMATED_UPDATE]: '🤖',
    [AUDIT_ACTIONS.UPDATED]: '📋'
};

// Chart periods for automation analytics
export const CHART_PERIODS = {
    SEVEN_DAYS: '7d',
    THIRTY_DAYS: '30d',
    ALL_TIME: 'all'
};

// Modal types/states
export const MODAL_TYPES = {
    LOGIN: 'showLogin',
    PROFILE: 'showProfile',
    CREATE_CRAWLER: 'showCreateCrawler',
    SESSION_URL: 'showSessionUrlModal',
    MANUAL_URL_FORM: 'showManualUrlForm',
    CREATE_PROJECT: 'showCreateProject',
    DELETE_DISCOVERY: 'showDeleteDiscovery',
    DELETE_PROJECT: 'showDeleteProject',
    DELETE_SESSION: 'showDeleteSession',
    DISCOVERED_PAGES: 'showDiscoveredPagesModal',
    CRAWLER_PAGES: 'showCrawlerPagesModal',
    ADD_MANUAL_URL: 'showAddManualUrlModal',
    ADD_AUTH_CONFIG: 'showAddAuthConfigModal',
    EDIT_AUTH_CONFIG: 'showEditAuthConfigModal',
    CHANGE_PASSWORD: 'showChangePassword',
    SESSIONS: 'showSessions',
    SETUP_AUTH: 'showSetupAuth',
    CREATE_TESTING_SESSION: 'showCreateTestingSession',
    TEST_INSTANCE: 'showTestInstanceModal',
    SESSION_RESULTS: 'showSessionResultsModal',
    TEST_DETAILS: 'showTestDetailsModal',
    TEST_CONFIGURATION: 'showTestConfigurationModal',
    TEST_GRID: 'showTestGrid',
    USER_MANAGEMENT: 'showUserManagement',
    SESSION_DETAILS: 'showSessionDetailsModal'
};

// Default form values
export const DEFAULT_USER_FORM = {
    id: null,
    username: '',
    email: '',
    full_name: '',
    role: USER_ROLES.TESTER,
    is_active: true,
    password: '',
    confirm_password: ''
};

// Notification types
export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Tab names for session details
export const SESSION_DETAIL_TABS = {
    OVERVIEW: 'overview',
    ACTIVITIES: 'activities',
    TEAM: 'team',
    TESTS: 'tests',
    RESULTS: 'results'
};

// Common pagination defaults
export const PAGINATION_DEFAULTS = {
    PAGE_SIZE: 50,
    FIRST_PAGE: 1
};

// WebSocket connection states
export const WS_STATES = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    RECONNECTING: 'reconnecting'
};

// Helper functions for getting UI values
export function getStatusBadgeClass(status) {
    return STATUS_BADGE_CLASSES[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusTextClass(status) {
    return STATUS_TEXT_CLASSES[status] || 'text-gray-600';
}

export function getStatusDisplayText(status) {
    return STATUS_DISPLAY_TEXT[status] || 
           status?.replace('_', ' ').charAt(0).toUpperCase() + status?.replace('_', ' ').slice(1) || 
           'Unknown';
}

export function getTestMethodBadgeClass(method) {
    return TEST_METHOD_BADGE_CLASSES[method] || 'bg-gray-100 text-gray-800';
}

export function getActionTypeIcon(actionType) {
    return ACTION_TYPE_ICONS[actionType] || '📋';
}

export function getLevelDisplay(level) {
    return WCAG_LEVEL_DISPLAY[level] || level?.toUpperCase() || 'N/A';
} 
/**
 * Utilities Loader
 * Loads all utility modules and makes them available globally for dashboard.js
 * This bridges ES6 modules with the current non-module browser environment
 */

// Import all utility modules
import * as dateHelpers from './dateHelpers.js';
import * as stringHelpers from './stringHelpers.js';
import * as validators from './validators.js';
import * as dataTransformers from '../helpers/dataTransformers.js';
import { API_ENDPOINTS, API_CONFIG, buildApiUrl, buildEndpoint } from '../constants/apiEndpoints.js';
import { 
    TEST_STATUS, 
    AUTOMATION_STATUS, 
    WCAG_LEVELS, 
    USER_ROLES, 
    AUDIT_ACTIONS,
    STATUS_BADGE_CLASSES,
    STATUS_TEXT_CLASSES,
    STATUS_DISPLAY_TEXT,
    WCAG_LEVEL_DISPLAY,
    TEST_METHOD_BADGE_CLASSES,
    ACTION_TYPE_ICONS,
    CHART_PERIODS,
    MODAL_TYPES,
    DEFAULT_USER_FORM,
    NOTIFICATION_TYPES,
    SESSION_DETAIL_TABS,
    PAGINATION_DEFAULTS,
    WS_STATES,
    getStatusBadgeClass,
    getStatusTextClass,
    getStatusDisplayText,
    getTestMethodBadgeClass,
    getActionTypeIcon,
    getLevelDisplay
} from '../constants/uiConstants.js';

// Create global utilities object
window.DashboardUtils = {
    // Date helpers
    ...dateHelpers,
    
    // String helpers
    ...stringHelpers,
    
    // Validators
    ...validators,
    
    // Data transformers
    ...dataTransformers,
    
    // API endpoints and config
    API_ENDPOINTS,
    API_CONFIG,
    buildApiUrl,
    buildEndpoint,
    
    // UI constants
    TEST_STATUS,
    AUTOMATION_STATUS,
    WCAG_LEVELS,
    USER_ROLES,
    AUDIT_ACTIONS,
    STATUS_BADGE_CLASSES,
    STATUS_TEXT_CLASSES,
    STATUS_DISPLAY_TEXT,
    WCAG_LEVEL_DISPLAY,
    TEST_METHOD_BADGE_CLASSES,
    ACTION_TYPE_ICONS,
    CHART_PERIODS,
    MODAL_TYPES,
    DEFAULT_USER_FORM,
    NOTIFICATION_TYPES,
    SESSION_DETAIL_TABS,
    PAGINATION_DEFAULTS,
    WS_STATES,
    
    // UI helper functions
    getStatusBadgeClass,
    getStatusTextClass,
    getStatusDisplayText,
    getTestMethodBadgeClass,
    getActionTypeIcon,
    getLevelDisplay
};

console.log('✅ Dashboard utilities loaded and available globally as window.DashboardUtils'); 
/**
 * Date Helper Utilities
 * Extracted from dashboard.js for better organization and reusability
 */

/**
 * Format time in locale-specific format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleTimeString();
}

/**
 * Format date in locale-specific format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString();
}

/**
 * Format date and time together
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Format date and time with short time format
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date and time string with short time
 */
export function formatDateTimeShort(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

/**
 * Format duration from milliseconds to human readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Human readable duration
 */
export function formatDuration(ms) {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * Get relative time (time ago) from a date
 * @param {string|Date} dateString - Date to calculate time ago from
 * @returns {string} Relative time string (e.g., "2h ago", "Just now")
 */
export function timeAgo(dateString) {
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
}

/**
 * Format group header for timeline views
 * @param {string} date - Date string
 * @returns {string} Formatted group header (Today, Yesterday, or full date)
 */
export function formatGroupHeader(date) {
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
}

/**
 * Group timeline items by date
 * @param {Array} timeline - Array of timeline items with timestamp/changed_at
 * @returns {Object} Grouped timeline items by date
 */
export function getGroupedTimeline(timeline) {
    const grouped = {};
    timeline.forEach(item => {
        const date = new Date(item.timestamp || item.changed_at).toDateString();
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(item);
    });
    return grouped;
} 
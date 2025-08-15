/**
 * String Helper Utilities
 * Extracted from dashboard.js for better organization and reusability
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} String with first letter capitalized
 */
export function capitalize(str) {
    if (!str || typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} String in title case
 */
export function toTitleCase(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

/**
 * Convert camelCase or snake_case to readable title
 * @param {string} str - String to convert
 * @returns {string} Readable title string
 */
export function toReadableTitle(str) {
    if (!str || typeof str !== 'string') return str;
    
    // Handle camelCase
    let result = str.replace(/([A-Z])/g, ' $1');
    // Handle snake_case
    result = result.replace(/_/g, ' ');
    // Handle kebab-case
    result = result.replace(/-/g, ' ');
    
    return toTitleCase(result.trim());
}

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
export function truncateText(text, maxLength = 50) {
    if (!text || typeof text !== 'string') return text;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate a slug from a string (URL-friendly)
 * @param {string} str - String to convert to slug
 * @returns {string} URL-friendly slug
 */
export function toSlug(str) {
    if (!str || typeof str !== 'string') return str;
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extract initials from a name
 * @param {string} name - Full name
 * @param {number} maxInitials - Maximum number of initials to return
 * @returns {string} Initials
 */
export function getInitials(name, maxInitials = 2) {
    if (!name || typeof name !== 'string') return '';
    return name
        .split(' ')
        .filter(part => part.length > 0)
        .slice(0, maxInitials)
        .map(part => part.charAt(0).toUpperCase())
        .join('');
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted bytes string
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Remove extra whitespace and normalize spaces
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
export function normalizeWhitespace(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\s+/g, ' ').trim();
}

/**
 * Check if string is empty or only whitespace
 * @param {string} str - String to check
 * @returns {boolean} True if empty or only whitespace
 */
export function isEmpty(str) {
    return !str || typeof str !== 'string' || str.trim().length === 0;
} 
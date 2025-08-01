/**
 * Data Transformers
 * Extracted from dashboard.js for better organization and reusability
 */

/**
 * Transform requirements data to match expected format
 * @param {Array} requirementsData - Raw requirements data from API
 * @returns {Array} Transformed requirements data
 */
export function transformRequirements(requirementsData) {
    if (!Array.isArray(requirementsData)) {
        console.warn('Expected requirements data to be an array, got:', typeof requirementsData);
        return [];
    }

    return requirementsData.map(req => {
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
}

/**
 * Ensure unique requirements by ID
 * @param {Array} requirements - Array of requirements
 * @returns {Array} Array with unique requirements
 */
export function ensureUniqueRequirements(requirements) {
    return requirements.reduce((acc, req) => {
        const key = req.id || req.requirement_id || req.criterion_number;
        if (!acc.find(existing => (existing.id || existing.requirement_id || existing.criterion_number) === key)) {
            acc.push(req);
        }
        return acc;
    }, []);
}

/**
 * Transform project data for display
 * @param {Object} project - Raw project data
 * @returns {Object} Transformed project data
 */
export function transformProject(project) {
    if (!project) return null;
    
    return {
        ...project,
        displayName: project.name || 'Unnamed Project',
        displayUrl: project.primary_url || 'No URL',
        info: `${project.name || 'Unnamed'} (${project.primary_url || 'No URL'})`
    };
}

/**
 * Transform session data for display
 * @param {Object} session - Raw session data
 * @returns {Object} Transformed session data
 */
export function transformSession(session) {
    if (!session) return null;
    
    return {
        ...session,
        displayName: session.name || `Session ${session.id}`,
        formattedCreatedAt: session.created_at ? new Date(session.created_at).toLocaleDateString() : 'Unknown',
        statusDisplay: transformStatusForDisplay(session.status)
    };
}

/**
 * Transform status for human-readable display
 * @param {string} status - Raw status value
 * @returns {string} Human-readable status
 */
export function transformStatusForDisplay(status) {
    if (!status) return 'Unknown';
    
    // Convert snake_case to Title Case
    return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Transform user data for display
 * @param {Object} user - Raw user data
 * @returns {Object} Transformed user data
 */
export function transformUser(user) {
    if (!user) return null;
    
    return {
        ...user,
        displayName: user.full_name || user.username || 'Unknown User',
        roleDisplay: transformStatusForDisplay(user.role),
        statusDisplay: user.is_active ? 'Active' : 'Inactive'
    };
}

/**
 * Transform test instance data for display
 * @param {Object} instance - Raw test instance data
 * @returns {Object} Transformed test instance data
 */
export function transformTestInstance(instance) {
    if (!instance) return null;
    
    return {
        ...instance,
        statusDisplay: transformStatusForDisplay(instance.status),
        methodDisplay: transformStatusForDisplay(instance.test_method_used || instance.test_method),
        pageDisplay: instance.page_title || instance.url || 'Unknown Page',
        requirementDisplay: instance.requirement_title || instance.criterion_number || 'Unknown Requirement'
    };
}

/**
 * Transform automation run data for display
 * @param {Object} run - Raw automation run data
 * @returns {Object} Transformed automation run data
 */
export function transformAutomationRun(run) {
    if (!run) return null;
    
    return {
        ...run,
        statusDisplay: transformStatusForDisplay(run.status),
        toolsDisplay: Array.isArray(run.tools) ? run.tools.join(', ') : (run.tools || 'Unknown'),
        durationDisplay: run.duration ? formatDuration(run.duration) : 'N/A',
        formattedStartTime: run.started_at ? new Date(run.started_at).toLocaleString() : 'Unknown'
    };
}

/**
 * Transform audit log entry for display
 * @param {Object} entry - Raw audit log entry
 * @returns {Object} Transformed audit log entry
 */
export function transformAuditLogEntry(entry) {
    if (!entry) return null;
    
    return {
        ...entry,
        actionDisplay: transformStatusForDisplay(entry.action_type),
        userDisplay: entry.user_name || entry.user_id || 'System',
        formattedTimestamp: entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown'
    };
}

/**
 * Transform form data by removing empty values
 * @param {Object} formData - Raw form data
 * @returns {Object} Cleaned form data
 */
export function cleanFormData(formData) {
    if (!formData || typeof formData !== 'object') return {};
    
    const cleaned = {};
    Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value !== null && value !== undefined && value !== '') {
            cleaned[key] = value;
        }
    });
    return cleaned;
}

/**
 * Transform API error response for display
 * @param {Error|Object} error - Error object or API response
 * @returns {Object} Standardized error object
 */
export function transformError(error) {
    if (!error) return { message: 'Unknown error occurred' };
    
    // If it's already a structured error
    if (error.message) {
        return {
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR',
            details: error.details || null
        };
    }
    
    // If it's a string
    if (typeof error === 'string') {
        return {
            message: error,
            code: 'STRING_ERROR',
            details: null
        };
    }
    
    // If it's an API response object
    if (error.error) {
        return {
            message: error.error,
            code: error.code || 'API_ERROR',
            details: error.details || null
        };
    }
    
    return {
        message: 'An unexpected error occurred',
        code: 'UNEXPECTED_ERROR',
        details: error
    };
}

/**
 * Format duration from milliseconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
    if (!ms || ms < 0) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * Paginate an array of data
 * @param {Array} data - Data to paginate
 * @param {number} page - Current page (1-based)
 * @param {number} pageSize - Items per page
 * @returns {Object} Paginated result with data, pagination info
 */
export function paginateData(data, page = 1, pageSize = 50) {
    if (!Array.isArray(data)) return { data: [], pagination: {} };
    
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);
    
    return {
        data: paginatedData,
        pagination: {
            currentPage: page,
            pageSize,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            startIndex: startIndex + 1,
            endIndex: Math.min(endIndex, totalItems)
        }
    };
}

/**
 * Sort data by a specific field
 * @param {Array} data - Data to sort
 * @param {string} field - Field to sort by
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array} Sorted data
 */
export function sortData(data, field, direction = 'asc') {
    if (!Array.isArray(data)) return [];
    
    return [...data].sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return direction === 'asc' ? 1 : -1;
        if (bVal == null) return direction === 'asc' ? -1 : 1;
        
        // Handle dates
        if (aVal instanceof Date || bVal instanceof Date || 
            (typeof aVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(aVal))) {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }
        
        // Handle strings (case insensitive)
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
} 
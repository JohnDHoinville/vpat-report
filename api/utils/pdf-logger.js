const { logger } = require('./logger');

/**
 * Enhanced logging utilities for PDF upload operations
 * Provides structured logging with context and performance metrics
 */

/**
 * Log levels for PDF operations
 */
const LOG_LEVELS = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    DEBUG: 'debug'
};

/**
 * PDF operation categories for logging
 */
const OPERATION_CATEGORIES = {
    UPLOAD: 'pdf_upload',
    VALIDATION: 'pdf_validation',
    PARSING: 'pdf_parsing',
    STORAGE: 'pdf_storage',
    AUTH: 'pdf_auth',
    CLEANUP: 'pdf_cleanup'
};

/**
 * Enhanced PDF Logger class
 */
class PDFLogger {
    /**
     * Create a new PDF logger instance
     * @param {string} category - Operation category
     * @param {object} baseContext - Base context for all logs
     */
    constructor(category = OPERATION_CATEGORIES.UPLOAD, baseContext = {}) {
        this.category = category;
        this.baseContext = baseContext;
        this.startTime = Date.now();
        this.operationId = this.generateOperationId();
    }

    /**
     * Generate unique operation ID
     */
    generateOperationId() {
        return `${this.category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create log entry with enhanced context
     */
    createLogEntry(level, message, additionalContext = {}) {
        const timestamp = new Date().toISOString();
        const duration = Date.now() - this.startTime;
        
        return {
            level,
            message,
            timestamp,
            category: this.category,
            operationId: this.operationId,
            duration: `${duration}ms`,
            context: {
                ...this.baseContext,
                ...additionalContext
            }
        };
    }

    /**
     * Log upload start
     */
    logUploadStart(filename, fileSize, userId) {
        const entry = this.createLogEntry(LOG_LEVELS.INFO, 
            `📤 PDF upload started: ${filename}`, {
            filename,
            fileSize,
            userId,
            stage: 'upload_start'
        });
        
        logger.info(entry.message, entry);
        return this;
    }

    /**
     * Log validation step
     */
    logValidation(filename, validationResult) {
        const level = validationResult.isValid ? LOG_LEVELS.INFO : LOG_LEVELS.WARN;
        const emoji = validationResult.isValid ? '✅' : '⚠️';
        
        const entry = this.createLogEntry(level,
            `${emoji} PDF validation: ${filename}`, {
            filename,
            validationResult,
            stage: 'validation'
        });
        
        logger[level](entry.message, entry);
        return this;
    }

    /**
     * Log parsing step
     */
    logParsing(filename, parsingResult) {
        const level = parsingResult.success ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR;
        const emoji = parsingResult.success ? '📋' : '❌';
        
        const entry = this.createLogEntry(level,
            `${emoji} PDF parsing: ${filename}`, {
            filename,
            parsingResult,
            stage: 'parsing'
        });
        
        logger[level](entry.message, entry);
        return this;
    }

    /**
     * Log storage operation
     */
    logStorage(operation, result) {
        const entry = this.createLogEntry(LOG_LEVELS.INFO,
            `💾 Storage ${operation} completed`, {
            operation,
            result,
            stage: 'storage'
        });
        
        logger.info(entry.message, entry);
        return this;
    }

    /**
     * Log authentication events
     */
    logAuth(userId, username, role, rateLimitInfo) {
        const entry = this.createLogEntry(LOG_LEVELS.INFO,
            `🔐 PDF upload authentication: ${username} (${role})`, {
            userId,
            username,
            role,
            rateLimitInfo,
            stage: 'authentication'
        });
        
        logger.info(entry.message, entry);
        return this;
    }

    /**
     * Log rate limit events
     */
    logRateLimit(userId, action, rateLimitData) {
        const level = action === 'exceeded' ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;
        const emoji = action === 'exceeded' ? '🚫' : '📊';
        
        const entry = this.createLogEntry(level,
            `${emoji} Rate limit ${action}: ${userId}`, {
            userId,
            action,
            rateLimitData,
            stage: 'rate_limiting'
        });
        
        logger[level](entry.message, entry);
        return this;
    }

    /**
     * Log processing step
     */
    logProcessingStep(step, status, details = {}) {
        const emoji = {
            started: '🚀',
            completed: '✅',
            failed: '❌',
            skipped: '⏭️'
        }[status] || '📝';
        
        const entry = this.createLogEntry(LOG_LEVELS.INFO,
            `${emoji} Processing step: ${step} - ${status}`, {
            step,
            status,
            details,
            stage: 'processing'
        });
        
        logger.info(entry.message, entry);
        return this;
    }

    /**
     * Log performance metrics
     */
    logPerformance(metrics) {
        const entry = this.createLogEntry(LOG_LEVELS.INFO,
            `⚡ Performance metrics recorded`, {
            metrics,
            stage: 'performance'
        });
        
        logger.info(entry.message, entry);
        return this;
    }

    /**
     * Log operation completion
     */
    logCompletion(success, summary = {}) {
        const level = success ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR;
        const emoji = success ? '🎉' : '💥';
        const duration = Date.now() - this.startTime;
        
        const entry = this.createLogEntry(level,
            `${emoji} PDF operation ${success ? 'completed' : 'failed'} (${duration}ms)`, {
            success,
            summary,
            totalDuration: `${duration}ms`,
            stage: 'completion'
        });
        
        logger[level](entry.message, entry);
        return this;
    }

    /**
     * Log error with context
     */
    logError(error, context = {}) {
        const entry = this.createLogEntry(LOG_LEVELS.ERROR,
            `💥 PDF operation error: ${error.message}`, {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            context,
            stage: 'error'
        });
        
        logger.error(entry.message, entry);
        return this;
    }

    /**
     * Log warning with context
     */
    logWarning(message, context = {}) {
        const entry = this.createLogEntry(LOG_LEVELS.WARN,
            `⚠️ PDF operation warning: ${message}`, {
            context,
            stage: 'warning'
        });
        
        logger.warn(entry.message, entry);
        return this;
    }

    /**
     * Log cleanup operation
     */
    logCleanup(action, result) {
        const entry = this.createLogEntry(LOG_LEVELS.INFO,
            `🧹 Cleanup ${action}: ${result.message || 'completed'}`, {
            action,
            result,
            stage: 'cleanup'
        });
        
        logger.info(entry.message, entry);
        return this;
    }

    /**
     * Log URL matching results
     */
    logUrlMatching(urls) {
        const entry = this.createLogEntry(LOG_LEVELS.INFO,
            `🔗 URL matching completed`, {
            urlStats: {
                extracted: urls.extracted?.length || 0,
                matched: urls.matched?.length || 0,
                unmatched: urls.unmatched?.length || 0,
                invalid: urls.invalid?.length || 0
            },
            urls,
            stage: 'url_matching'
        });
        
        logger.info(entry.message, entry);
        return this;
    }

    /**
     * Log requirement matching
     */
    logRequirementMatching(requirement, matched) {
        const emoji = matched ? '✅' : '❌';
        
        const entry = this.createLogEntry(matched ? LOG_LEVELS.INFO : LOG_LEVELS.WARN,
            `${emoji} Requirement matching: ${requirement.number || 'unknown'}`, {
            requirement,
            matched,
            stage: 'requirement_matching'
        });
        
        logger[matched ? 'info' : 'warn'](entry.message, entry);
        return this;
    }
}

/**
 * Create a new PDF logger instance
 */
function createPDFLogger(category, baseContext = {}) {
    return new PDFLogger(category, baseContext);
}

/**
 * Create logger for upload operations
 */
function createUploadLogger(userId, filename, fileSize) {
    return new PDFLogger(OPERATION_CATEGORIES.UPLOAD, {
        userId,
        filename,
        fileSize
    });
}

/**
 * Create logger for validation operations
 */
function createValidationLogger(filename) {
    return new PDFLogger(OPERATION_CATEGORIES.VALIDATION, {
        filename
    });
}

/**
 * Create logger for parsing operations
 */
function createParsingLogger(filename, requirementId = null) {
    return new PDFLogger(OPERATION_CATEGORIES.PARSING, {
        filename,
        requirementId
    });
}

/**
 * Create logger for storage operations
 */
function createStorageLogger(operation) {
    return new PDFLogger(OPERATION_CATEGORIES.STORAGE, {
        operation
    });
}

/**
 * Create logger for authentication operations
 */
function createAuthLogger(userId) {
    return new PDFLogger(OPERATION_CATEGORIES.AUTH, {
        userId
    });
}

/**
 * Log API request/response
 */
function logAPIRequest(method, url, statusCode, duration, userId = 'anonymous') {
    const emoji = statusCode < 400 ? '✅' : statusCode < 500 ? '⚠️' : '❌';
    
    logger.info(`${emoji} PDF API Request: ${method} ${url}`, {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        userId,
        category: 'pdf_api_request'
    });
}

/**
 * Get operation statistics
 */
function getOperationStats() {
    // This would typically query a metrics store
    // For now, return placeholder stats
    return {
        totalUploads: 0,
        successfulUploads: 0,
        failedUploads: 0,
        averageProcessingTime: 0,
        totalStorageUsed: 0
    };
}

module.exports = {
    PDFLogger,
    createPDFLogger,
    createUploadLogger,
    createValidationLogger,
    createParsingLogger,
    createStorageLogger,
    createAuthLogger,
    logAPIRequest,
    getOperationStats,
    LOG_LEVELS,
    OPERATION_CATEGORIES
};

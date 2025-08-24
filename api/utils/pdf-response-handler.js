const { logger } = require('./logger');

/**
 * PDF Upload Response Handler
 * Standardized response structures for PDF upload and parsing operations
 */

/**
 * Response status codes for PDF operations
 */
const PDF_RESPONSE_CODES = {
    // Success codes
    UPLOAD_SUCCESS: 'UPLOAD_SUCCESS',
    PARSING_SUCCESS: 'PARSING_SUCCESS',
    VALIDATION_SUCCESS: 'VALIDATION_SUCCESS',
    
    // Client error codes
    NO_FILE: 'NO_FILE',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_PDF_FORMAT: 'INVALID_PDF_FORMAT',
    INVALID_REQUIREMENT_ID: 'INVALID_REQUIREMENT_ID',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    
    // Parsing error codes
    PARSING_FAILED: 'PARSING_FAILED',
    FORM_FIELDS_NOT_FOUND: 'FORM_FIELDS_NOT_FOUND',
    URL_EXTRACTION_FAILED: 'URL_EXTRACTION_FAILED',
    REQUIREMENT_MISMATCH: 'REQUIREMENT_MISMATCH',
    PARTIAL_PARSING_SUCCESS: 'PARTIAL_PARSING_SUCCESS',
    
    // Server error codes
    PROCESSING_ERROR: 'PROCESSING_ERROR',
    STORAGE_ERROR: 'STORAGE_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    
    // Authentication error codes
    NO_TOKEN: 'NO_TOKEN',
    INVALID_TOKEN: 'INVALID_TOKEN',
    INVALID_SESSION: 'INVALID_SESSION',
    AUTH_PROCESSING_ERROR: 'AUTH_PROCESSING_ERROR'
};

/**
 * Standard response structure for PDF operations
 */
class PDFResponse {
    constructor(success = false, code = null, message = '', data = null) {
        this.success = success;
        this.code = code;
        this.message = message;
        this.timestamp = new Date().toISOString();
        
        if (data !== null) {
            this.data = data;
        }
    }

    /**
     * Add metadata to the response
     */
    addMetadata(metadata) {
        this.metadata = {
            ...this.metadata,
            ...metadata
        };
        return this;
    }

    /**
     * Add error details to the response
     */
    addErrorDetails(details) {
        this.errorDetails = {
            ...this.errorDetails,
            ...details
        };
        return this;
    }

    /**
     * Add warnings to the response
     */
    addWarnings(warnings) {
        if (!this.warnings) {
            this.warnings = [];
        }
        this.warnings = this.warnings.concat(Array.isArray(warnings) ? warnings : [warnings]);
        return this;
    }

    /**
     * Convert to JSON response
     */
    toJSON() {
        return {
            success: this.success,
            code: this.code,
            message: this.message,
            timestamp: this.timestamp,
            ...(this.data && { data: this.data }),
            ...(this.metadata && { metadata: this.metadata }),
            ...(this.errorDetails && { errorDetails: this.errorDetails }),
            ...(this.warnings && { warnings: this.warnings })
        };
    }
}

/**
 * Response factory for different PDF operation outcomes
 */
class PDFResponseFactory {
    /**
     * Create successful upload response
     */
    static uploadSuccess(parsedData, metadata = {}) {
        return new PDFResponse(
            true,
            PDF_RESPONSE_CODES.UPLOAD_SUCCESS,
            'PDF uploaded and processed successfully',
            parsedData
        ).addMetadata({
            operation: 'pdf_upload',
            stage: 'completed',
            ...metadata
        });
    }

    /**
     * Create partial parsing success response
     */
    static partialParsingSuccess(parsedData, warnings = [], metadata = {}) {
        return new PDFResponse(
            true,
            PDF_RESPONSE_CODES.PARTIAL_PARSING_SUCCESS,
            'PDF processed with some parsing issues',
            parsedData
        ).addWarnings(warnings).addMetadata({
            operation: 'pdf_parsing',
            stage: 'partial_success',
            ...metadata
        });
    }

    /**
     * Create file validation error response
     */
    static fileValidationError(errorCode, message, details = {}) {
        return new PDFResponse(
            false,
            errorCode,
            message
        ).addErrorDetails({
            category: 'file_validation',
            ...details
        });
    }

    /**
     * Create authentication error response
     */
    static authenticationError(errorCode, message, details = {}) {
        return new PDFResponse(
            false,
            errorCode,
            message
        ).addErrorDetails({
            category: 'authentication',
            ...details
        });
    }

    /**
     * Create parsing error response
     */
    static parsingError(errorCode, message, details = {}) {
        return new PDFResponse(
            false,
            errorCode,
            message
        ).addErrorDetails({
            category: 'parsing',
            ...details
        });
    }

    /**
     * Create server error response
     */
    static serverError(errorCode, message, details = {}) {
        return new PDFResponse(
            false,
            errorCode,
            message
        ).addErrorDetails({
            category: 'server',
            ...details
        });
    }
}

/**
 * Standardized parsed data structure
 */
class ParsedPDFData {
    constructor(metadata = {}) {
        this.metadata = {
            filename: null,
            fileSize: 0,
            uploadedAt: new Date().toISOString(),
            uploadedBy: null,
            processingDuration: 0,
            ...metadata
        };
        
        this.authentication = {
            userId: null,
            username: null,
            role: null,
            sessionId: null,
            uploadContext: null,
            rateLimitRemaining: 0
        };
        
        this.validation = {
            isValid: false,
            pdfVersion: null,
            fileSize: 0,
            structureScore: 0,
            hasProperTrailer: false,
            hasXrefTable: false
        };
        
        this.storage = {
            tempFiles: 0,
            totalStorageUsed: 0,
            tempStorageSize: 0
        };
        
        this.parsing = {
            success: false,
            message: 'Parsing not attempted',
            fieldsFound: 0,
            fieldsProcessed: 0,
            fieldsWithErrors: 0,
            parsingDuration: 0,
            warnings: []
        };
        
        this.requirement = {
            number: null,
            title: null,
            overallStatus: null,
            extracted: false,
            matched: false
        };
        
        this.testInstances = [];
        
        this.urls = {
            extracted: [],
            matched: [],
            unmatched: [],
            invalid: []
        };
        
        this.processing = {
            startTime: new Date().toISOString(),
            endTime: null,
            duration: 0,
            steps: []
        };
    }

    /**
     * Add processing step
     */
    addProcessingStep(step, status, details = {}) {
        this.processing.steps.push({
            step,
            status, // 'started', 'completed', 'failed', 'skipped'
            timestamp: new Date().toISOString(),
            details
        });
        return this;
    }

    /**
     * Complete processing
     */
    completeProcessing() {
        this.processing.endTime = new Date().toISOString();
        this.processing.duration = Date.now() - new Date(this.processing.startTime).getTime();
        this.metadata.processingDuration = this.processing.duration;
        return this;
    }

    /**
     * Add test instance data
     */
    addTestInstance(instanceData) {
        const standardizedInstance = {
            index: instanceData.index || this.testInstances.length,
            url: instanceData.url || null,
            urlMatched: instanceData.urlMatched || false,
            status: instanceData.status || null,
            notes: instanceData.notes || null,
            results: instanceData.results || null,
            recommendations: instanceData.recommendations || null,
            extracted: instanceData.extracted || false,
            hasErrors: instanceData.hasErrors || false,
            errors: instanceData.errors || []
        };
        
        this.testInstances.push(standardizedInstance);
        return this;
    }

    /**
     * Set requirement data
     */
    setRequirement(requirementData) {
        this.requirement = {
            ...this.requirement,
            ...requirementData
        };
        return this;
    }

    /**
     * Add URL data
     */
    addURLs(urlData) {
        this.urls = {
            ...this.urls,
            ...urlData
        };
        return this;
    }

    /**
     * Update parsing status
     */
    updateParsingStatus(status) {
        this.parsing = {
            ...this.parsing,
            ...status
        };
        return this;
    }

    /**
     * Get summary statistics
     */
    getSummary() {
        return {
            totalTestInstances: this.testInstances.length,
            successfulExtractions: this.testInstances.filter(t => t.extracted).length,
            matchedUrls: this.urls.matched.length,
            unmatchedUrls: this.urls.unmatched.length,
            parsingSuccess: this.parsing.success,
            processingDuration: this.processing.duration,
            hasWarnings: this.parsing.warnings.length > 0
        };
    }
}

/**
 * Error categorization helper
 */
class PDFErrorHandler {
    /**
     * Categorize and standardize errors
     */
    static categorizeError(error, context = {}) {
        const errorInfo = {
            originalError: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        };

        // File-related errors
        if (error.code === 'LIMIT_FILE_SIZE') {
            return PDFResponseFactory.fileValidationError(
                PDF_RESPONSE_CODES.FILE_TOO_LARGE,
                'File size exceeds the maximum limit of 10MB',
                { ...errorInfo, maxSize: '10MB' }
            );
        }

        if (error.message.includes('Only PDF files are allowed')) {
            return PDFResponseFactory.fileValidationError(
                PDF_RESPONSE_CODES.INVALID_FILE_TYPE,
                'Only PDF files are allowed for upload',
                errorInfo
            );
        }

        // PDF validation errors
        if (error.message.includes('PDF header') || error.message.includes('%PDF-')) {
            return PDFResponseFactory.fileValidationError(
                PDF_RESPONSE_CODES.INVALID_PDF_FORMAT,
                'Invalid PDF format - missing or corrupted PDF header',
                errorInfo
            );
        }

        // Authentication errors
        if (error.message.includes('token') || error.message.includes('auth')) {
            return PDFResponseFactory.authenticationError(
                PDF_RESPONSE_CODES.INVALID_TOKEN,
                'Authentication failed - invalid or expired token',
                errorInfo
            );
        }

        // Parsing errors
        if (error.message.includes('parsing') || error.message.includes('form field')) {
            return PDFResponseFactory.parsingError(
                PDF_RESPONSE_CODES.PARSING_FAILED,
                'PDF parsing failed - unable to extract form field data',
                errorInfo
            );
        }

        // Default server error
        return PDFResponseFactory.serverError(
            PDF_RESPONSE_CODES.PROCESSING_ERROR,
            'An unexpected error occurred during PDF processing',
            errorInfo
        );
    }

    /**
     * Log error with context
     */
    static logError(error, context = {}) {
        logger.error('PDF processing error:', {
            error: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Response validation helper
 */
class ResponseValidator {
    /**
     * Validate response structure
     */
    static validateResponse(response) {
        const errors = [];

        if (typeof response.success !== 'boolean') {
            errors.push('Response must have a boolean success field');
        }

        if (!response.code || typeof response.code !== 'string') {
            errors.push('Response must have a valid code field');
        }

        if (!response.message || typeof response.message !== 'string') {
            errors.push('Response must have a valid message field');
        }

        if (!response.timestamp) {
            errors.push('Response must have a timestamp field');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = {
    PDFResponse,
    PDFResponseFactory,
    ParsedPDFData,
    PDFErrorHandler,
    ResponseValidator,
    PDF_RESPONSE_CODES
};

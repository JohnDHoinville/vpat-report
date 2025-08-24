const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { handlePDFUpload } = require('../middleware/file-upload');
const { authenticateToken } = require('../middleware/auth');
const { 
    authenticatePDFUpload, 
    addUploadRateLimitHeaders,
    validateUploadContext,
    auditPDFUpload,
    getUploadRateLimitStats 
} = require('../middleware/pdf-auth');
const { logger } = require('../utils/logger');
const { tempStorage } = require('../utils/temp-storage');
const { 
    PDFResponseFactory,
    ParsedPDFData,
    PDFErrorHandler,
    PDF_RESPONSE_CODES 
} = require('../utils/pdf-response-handler');
const { 
    createUploadLogger,
    createStorageLogger,
    createAuthLogger,
    logAPIRequest 
} = require('../utils/pdf-logger');
const { createPDFParser } = require('../utils/pdf-parser');
const { createURLMatcher } = require('../utils/url-matcher');
const router = express.Router();

/**
 * Get test instances for a specific requirement from the database
 * @param {string} requirementNumber - WCAG requirement number (e.g., "1.1.1")
 * @returns {Promise<Array>} Array of test instances
 */
async function getTestInstancesForRequirement(requirementNumber) {
    try {
        const uploadLogger = createUploadLogger('DatabaseQuery');
        
        uploadLogger.info('🔍 Querying test instances for requirement', {
            requirementNumber
        });
        
        // For now, return a placeholder array
        // This should be replaced with actual database query
        // Example query would be something like:
        // SELECT ti.* FROM test_instances ti 
        // JOIN requirements r ON ti.requirement_id = r.id 
        // WHERE r.criterion_number = $1
        
        const placeholderTestInstances = [
            {
                id: 'placeholder-1',
                url: 'https://example.com/page1',
                requirement_id: 'req-1',
                status: 'passed',
                notes: 'Placeholder test instance 1'
            },
            {
                id: 'placeholder-2', 
                url: 'https://example.com/page2',
                requirement_id: 'req-1',
                status: 'failed',
                notes: 'Placeholder test instance 2'
            }
        ];
        
        uploadLogger.info('✅ Test instances retrieved', {
            requirementNumber,
            instanceCount: placeholderTestInstances.length
        });
        
        return placeholderTestInstances;
        
    } catch (error) {
        const uploadLogger = createUploadLogger('DatabaseQuery');
        uploadLogger.error('❌ Failed to query test instances', {
            requirementNumber,
            error: error.message
        });
        throw error;
    }
}

/**
 * @route POST /api/pdf-upload
 * @desc Upload and parse a PDF test results file
 * @access Private (requires authentication)
 * @body {File} pdf - PDF file to upload and parse
 * @query {string} requirementId - ID of the requirement context (optional)
 */
router.post('/', 
    authenticatePDFUpload, 
    validateUploadContext,
    addUploadRateLimitHeaders,
    auditPDFUpload,
    handlePDFUpload, 
    async (req, res) => {
    let tempFilePath = null;
    const startTime = Date.now();
    let pdfLogger = null;
    
    try {
        // Check if file was uploaded
        if (!req.file) {
            const response = PDFResponseFactory.fileValidationError(
                PDF_RESPONSE_CODES.NO_FILE,
                'No PDF file uploaded',
                { expectedField: 'pdf' }
            );
            logAPIRequest('POST', req.originalUrl, 400, Date.now() - startTime, req.user?.id);
            return res.status(400).json(response.toJSON());
        }

        tempFilePath = req.file.path;
        const originalFilename = req.file.originalname;
        const requirementId = req.query.requirementId;

        // Initialize enhanced logger
        pdfLogger = createUploadLogger(req.user.id, originalFilename, req.file.size);
        pdfLogger.logUploadStart(originalFilename, req.file.size, req.user.id);

        // Log authentication details
        const authLogger = createAuthLogger(req.user.id);
        authLogger.logAuth(req.user.id, req.user.username, req.user.role, req.uploadRateLimit);

        // Initialize parsed data structure
        const parsedData = new ParsedPDFData({
            filename: originalFilename,
            fileSize: req.file.size,
            uploadedBy: req.user.id,
            tempPath: tempFilePath
        });

        // Add processing step
        parsedData.addProcessingStep('file_upload', 'completed', {
            filename: originalFilename,
            size: req.file.size
        });
        pdfLogger.logProcessingStep('file_upload', 'completed', {
            filename: originalFilename,
            size: req.file.size
        });

        // Set authentication context
        parsedData.authentication = {
            userId: req.user.id,
            username: req.user.username,
            role: req.user.role,
            sessionId: req.user.sessionId,
            uploadContext: req.uploadContext,
            rateLimitRemaining: req.uploadRateLimit?.remaining || 0
        };

        // Set validation details
        const validationDetails = req.pdfValidation || {};
        parsedData.validation = {
            isValid: true,
            pdfVersion: validationDetails.version,
            fileSize: validationDetails.fileSize,
            structureScore: validationDetails.structureScore,
            hasProperTrailer: validationDetails.hasProperTrailer,
            hasXrefTable: validationDetails.hasXrefTable
        };
        
        parsedData.addProcessingStep('pdf_validation', 'completed', validationDetails);
        pdfLogger.logValidation(originalFilename, { isValid: true, ...validationDetails });

        // Set storage statistics
        const storageStats = await req.tempStorage.getStats();
        parsedData.storage = {
            tempFiles: storageStats?.temp?.count || 0,
            totalStorageUsed: storageStats?.totalSize || 0,
            tempStorageSize: storageStats?.temp?.size || 0
        };

        // Add storage step
        parsedData.addProcessingStep('storage_stats', 'completed', {
            tempFiles: parsedData.storage.tempFiles,
            totalSize: parsedData.storage.totalStorageUsed
        });
        
        const storageLogger = createStorageLogger('stats_collection');
        storageLogger.logStorage('stats_collection', {
            tempFiles: parsedData.storage.tempFiles,
            totalSize: parsedData.storage.totalStorageUsed
        });

        // Parse PDF using pdf-lib
        pdfLogger.logProcessingStep('pdf_parsing', 'started', {
            filePath: req.file.path,
            fileSize: req.file.size
        });
        
        let parsingResult = null;
        try {
            const parser = createPDFParser();
            await parser.loadPDF(req.file.path);
            parsingResult = await parser.parsePDF();
            parser.cleanup();
            
            parsedData.addProcessingStep('pdf_parsing', 'completed', {
                requirementNumber: parsingResult.requirement.number,
                overallStatus: parsingResult.requirement.overallStatus,
                testInstanceCount: parsingResult.testInstances.length,
                urlCount: parsingResult.urls.length,
                hasWYSIWYGFields: parsingResult.metadata.hasWYSIWYGFields
            });
            
            pdfLogger.logProcessingStep('pdf_parsing', 'completed', {
                parseTime: Date.now() - processingStartTime,
                requirementNumber: parsingResult.requirement.number,
                testInstanceCount: parsingResult.testInstances.length
            });
            
        } catch (parseError) {
            parsedData.addProcessingStep('pdf_parsing', 'failed', {
                error: parseError.message,
                stage: 'pdf_lib_parsing'
            });
            
            pdfLogger.logProcessingStep('pdf_parsing', 'failed', {
                error: parseError.message,
                stack: parseError.stack
            });
            
            // Continue with upload process but flag parsing failure
            parsingResult = {
                requirement: { number: null, overallStatus: null },
                testInstances: [],
                urls: [],
                metadata: { 
                    pageCount: 0, 
                    formFieldCount: 0, 
                    hasWYSIWYGFields: false,
                    parsingError: parseError.message 
                }
            };
        }

        const parsingStatus = {
            success: !parsingResult.metadata.parsingError,
            message: parsingResult.metadata.parsingError 
                ? `PDF parsing failed: ${parsingResult.metadata.parsingError}`
                : 'PDF parsing completed successfully',
            fieldsFound: parsingResult.metadata.formFieldCount,
            fieldsProcessed: parsingResult.metadata.formFieldCount,
            fieldsWithErrors: parsingResult.metadata.parsingError ? 1 : 0,
            parsingDuration: Date.now() - processingStartTime,
            warnings: parsingResult.metadata.parsingError 
                ? [`PDF parsing error: ${parsingResult.metadata.parsingError}`]
                : []
        };
        
        parsedData.updateParsingStatus(parsingStatus);
        pdfLogger.logParsing(originalFilename, parsingStatus);

        // Set extracted requirement data
        parsedData.setRequirement({
            number: parsingResult.requirement.number,
            title: null, // Title will be resolved from database lookup
            overallStatus: parsingResult.requirement.overallStatus,
            extracted: !!parsingResult.requirement.number,
            matched: false // Will be determined during URL matching
        });

        // Complete processing
        parsedData.completeProcessing();
        
        parsedData.addProcessingStep('response_generation', 'completed', {
            duration: parsedData.processing.duration
        });

        // Clean up temp file
        try {
            await fs.unlink(tempFilePath);
            parsedData.addProcessingStep('file_cleanup', 'completed');
            pdfLogger.logCleanup('temp_file_removal', { status: 'success', file: tempFilePath });
        } catch (unlinkError) {
            parsedData.addProcessingStep('file_cleanup', 'failed', {
                error: unlinkError.message
            });
            pdfLogger.logWarning(`Failed to clean up temp file: ${tempFilePath}`, {
                error: unlinkError.message
            });
        }

        // Add parsed test instances to response data
        if (parsingResult.testInstances && parsingResult.testInstances.length > 0) {
            parsedData.setTestInstances(parsingResult.testInstances);
        }
        
        // Add extracted URLs to response data
        if (parsingResult.urls && parsingResult.urls.length > 0) {
            parsedData.setURLs(parsingResult.urls);
        }

        // Perform URL matching with test instances if requirement number is available
        let urlMatchingResult = null;
        if (parsingResult.requirement.number && parsingResult.urls.length > 0) {
            try {
                pdfLogger.logProcessingStep('url_matching', 'started', {
                    requirementNumber: parsingResult.requirement.number,
                    urlCount: parsingResult.urls.length
                });

                // Query test instances for this requirement
                // Note: This would typically query the database for test instances
                // For now, we'll create a placeholder that can be integrated with the database layer
                const testInstances = await getTestInstancesForRequirement(parsingResult.requirement.number);
                
                // Perform URL matching
                const urlMatcher = createURLMatcher();
                urlMatchingResult = await urlMatcher.matchURLsWithTestInstances(
                    parsingResult.urls,
                    testInstances,
                    parsingResult.requirement.number
                );

                parsedData.addProcessingStep('url_matching', 'completed', {
                    matchCount: urlMatchingResult.matches.length,
                    unmatchedURLs: urlMatchingResult.unmatchedPDFURLs.length,
                    unmatchedInstances: urlMatchingResult.unmatchedTestInstances.length
                });

                pdfLogger.logProcessingStep('url_matching', 'completed', {
                    requirementNumber: parsingResult.requirement.number,
                    matchCount: urlMatchingResult.matches.length,
                    warnings: urlMatchingResult.warnings.length
                });

            } catch (urlMatchError) {
                parsedData.addProcessingStep('url_matching', 'failed', {
                    error: urlMatchError.message
                });

                pdfLogger.logProcessingStep('url_matching', 'failed', {
                    error: urlMatchError.message,
                    requirementNumber: parsingResult.requirement.number
                });

                // Continue processing even if URL matching fails
                urlMatchingResult = {
                    matches: [],
                    unmatchedPDFURLs: parsingResult.urls,
                    unmatchedTestInstances: [],
                    warnings: [`URL matching failed: ${urlMatchError.message}`],
                    statistics: {
                        totalPDFURLs: parsingResult.urls.length,
                        totalTestInstances: 0,
                        matchedURLs: 0,
                        matchedInstances: 0
                    }
                };
            }
        } else {
            // Skip URL matching if no requirement number or URLs
            const skipReason = !parsingResult.requirement.number 
                ? 'No requirement number found' 
                : 'No URLs extracted from PDF';
                
            parsedData.addProcessingStep('url_matching', 'skipped', {
                reason: skipReason
            });

            pdfLogger.logProcessingStep('url_matching', 'skipped', {
                reason: skipReason
            });
        }

        // Create success response
        const response = PDFResponseFactory.uploadSuccess(parsedData, {
            processingTime: Date.now() - startTime,
            requirementId: requirementId
        });

        // Add warnings if parsing had issues
        const warnings = [];
        if (parsingResult.metadata.parsingError) {
            warnings.push(`PDF parsing encountered an error: ${parsingResult.metadata.parsingError}`);
        }
        if (!parsingResult.requirement.number) {
            warnings.push('No requirement number found in PDF - manual verification needed');
        }
        if (parsingResult.testInstances.length === 0) {
            warnings.push('No test instances found in PDF form fields');
        }
        if (parsingResult.urls.length === 0) {
            warnings.push('No URLs extracted from PDF content');
        }
        if (!parsingResult.metadata.hasWYSIWYGFields) {
            warnings.push('PDF appears to be in legacy format - missing WYSIWYG fields');
        }
        
        // Add URL matching warnings
        if (urlMatchingResult) {
            warnings.push(...urlMatchingResult.warnings);
            
            if (urlMatchingResult.matches.length === 0 && parsingResult.urls.length > 0) {
                warnings.push('No URLs from PDF could be matched with existing test instances');
            }
        }
        
        if (warnings.length > 0) {
            response.addWarnings(warnings);
        }

        // Log successful completion
        const duration = Date.now() - startTime;
        pdfLogger.logCompletion(true, {
            filename: originalFilename,
            fileSize: req.file.size,
            processingTime: duration
        });
        
        logAPIRequest('POST', req.originalUrl, 200, duration, req.user.id);
        
        res.json(response.toJSON());

    } catch (error) {
        const duration = Date.now() - startTime;
        
        // Enhanced error logging
        if (pdfLogger) {
            pdfLogger.logError(error, {
                filename: req.file?.originalname,
                processingTime: duration
            });
            pdfLogger.logCompletion(false, {
                filename: req.file?.originalname,
                error: error.message,
                processingTime: duration
            });
        }
        
        PDFErrorHandler.logError(error, {
            userId: req.user?.id,
            filename: req.file?.originalname,
            tempPath: tempFilePath
        });

        // Clean up temp file on error
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
                if (pdfLogger) {
                    pdfLogger.logCleanup('error_cleanup', { status: 'success', file: tempFilePath });
                }
            } catch (unlinkError) {
                if (pdfLogger) {
                    pdfLogger.logWarning(`Failed to clean up temp file after error: ${tempFilePath}`, {
                        error: unlinkError.message
                    });
                }
            }
        }

        // Create standardized error response
        const errorResponse = PDFErrorHandler.categorizeError(error, {
            operation: 'pdf_upload',
            userId: req.user?.id,
            filename: req.file?.originalname,
            processingTime: duration
        });

        // Determine appropriate HTTP status code
        let statusCode = 500;
        if (errorResponse.code === PDF_RESPONSE_CODES.INVALID_FILE_TYPE ||
            errorResponse.code === PDF_RESPONSE_CODES.FILE_TOO_LARGE ||
            errorResponse.code === PDF_RESPONSE_CODES.INVALID_PDF_FORMAT) {
            statusCode = 400;
        } else if (errorResponse.code === PDF_RESPONSE_CODES.INSUFFICIENT_PERMISSIONS ||
                   errorResponse.code === PDF_RESPONSE_CODES.RATE_LIMIT_EXCEEDED) {
            statusCode = 403;
        } else if (errorResponse.code === PDF_RESPONSE_CODES.NO_TOKEN ||
                   errorResponse.code === PDF_RESPONSE_CODES.INVALID_TOKEN) {
            statusCode = 401;
        }

        logAPIRequest('POST', req.originalUrl, statusCode, duration, req.user?.id);
        
        res.status(statusCode).json(errorResponse.toJSON());
    }
});

/**
 * @route GET /api/pdf-upload/status
 * @desc Get PDF upload and parsing status/capabilities
 * @access Private (requires authentication)
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const storageHealth = await tempStorage.getHealthStatus();
        
        const statusData = {
            status: 'available',
            capabilities: {
                maxFileSize: '10MB',
                supportedFormats: ['application/pdf'],
                validation: {
                    mimeTypeCheck: true,
                    fileExtensionCheck: true,
                    pdfHeaderValidation: true,
                    structuralValidation: true,
                    fileSizeLimits: true,
                    filenameValidation: true
                },
                storage: {
                    temporaryFileManagement: true,
                    automaticCleanup: true,
                    storageMonitoring: true,
                    fileArchiving: true
                },
                authentication: {
                    jwtTokenRequired: true,
                    sessionValidation: true,
                    roleBasedAccess: true,
                    uploadRateLimiting: true,
                    contextValidation: true,
                    auditLogging: true
                },
                features: {
                    formFieldExtraction: false, // Will be true when implemented
                    urlMatching: false, // Will be true when implemented
                    requirementValidation: false // Will be true when implemented
                }
            },
            validation: {
                minFileSize: '100 bytes',
                maxFileSize: '10MB',
                allowedExtensions: ['.pdf'],
                filenamePattern: 'alphanumeric, spaces, hyphens, underscores, periods',
                maxFilenameLength: 255
            },
            authentication: {
                required: true,
                allowedRoles: ['admin', 'tester', 'manager'],
                rateLimits: {
                    maxUploads: 10,
                    windowMs: 3600000,
                    windowDescription: '1 hour'
                },
                currentUser: {
                    id: req.user.id,
                    username: req.user.username,
                    role: req.user.role
                }
            },
            storage: storageHealth,
            version: '1.0.0'
        };

        const response = PDFResponseFactory.uploadSuccess(statusData, {
            operation: 'status_check',
            userId: req.user.id
        });

        res.json(response.toJSON());
        
    } catch (error) {
        PDFErrorHandler.logError(error, {
            operation: 'status_check',
            userId: req.user.id
        });

        const errorResponse = PDFResponseFactory.serverError(
            PDF_RESPONSE_CODES.PROCESSING_ERROR,
            'Failed to retrieve service status',
            { operation: 'status_check' }
        );

        res.status(500).json(errorResponse.toJSON());
    }
});

/**
 * @route GET /api/pdf-upload/storage
 * @desc Get detailed storage statistics and health
 * @access Private (requires authentication)
 */
router.get('/storage', authenticateToken, async (req, res) => {
    try {
        const [stats, health] = await Promise.all([
            tempStorage.getStorageStats(),
            tempStorage.getHealthStatus()
        ]);

        const storageData = {
            statistics: stats,
            health: health,
            requestedBy: {
                userId: req.user.id,
                username: req.user.username,
                role: req.user.role
            }
        };

        const response = PDFResponseFactory.uploadSuccess(storageData, {
            operation: 'storage_stats',
            userId: req.user.id
        });

        res.json(response.toJSON());

    } catch (error) {
        PDFErrorHandler.logError(error, {
            operation: 'storage_stats',
            userId: req.user.id
        });

        const errorResponse = PDFResponseFactory.serverError(
            PDF_RESPONSE_CODES.STORAGE_ERROR,
            'Failed to retrieve storage statistics',
            { operation: 'storage_stats' }
        );

        res.status(500).json(errorResponse.toJSON());
    }
});

/**
 * @route POST /api/pdf-upload/cleanup
 * @desc Manually trigger storage cleanup
 * @access Private (requires authentication)
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
    try {
        logger.info(`🧹 Manual cleanup triggered by user: ${req.user.id}`);
        
        const cleanupResult = await tempStorage.cleanup();
        
        res.json({
            success: true,
            message: 'Storage cleanup completed',
            result: cleanupResult,
            triggeredBy: req.user.id,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Manual cleanup failed:', error);
        res.status(500).json({
            success: false,
            error: 'Storage cleanup failed',
            code: 'CLEANUP_ERROR',
            message: error.message
        });
    }
});

/**
 * @route GET /api/pdf-upload/auth-stats
 * @desc Get authentication and rate limiting statistics
 * @access Private (requires admin role)
 */
router.get('/auth-stats', authenticateToken, async (req, res) => {
    try {
        // Check if user has admin role for viewing stats
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin role required to view authentication statistics',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }
        
        const rateLimitStats = getUploadRateLimitStats();
        
        res.json({
            success: true,
            authentication: {
                currentUser: {
                    id: req.user.id,
                    username: req.user.username,
                    role: req.user.role
                },
                rateLimiting: rateLimitStats,
                security: {
                    requiresAuthentication: true,
                    allowedRoles: ['admin', 'tester', 'manager'],
                    uploadRateLimit: {
                        maxUploads: 10,
                        windowMs: 3600000, // 1 hour
                        enabled: true
                    }
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Failed to get auth stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve authentication statistics',
            code: 'AUTH_STATS_ERROR'
        });
    }
});

module.exports = router;

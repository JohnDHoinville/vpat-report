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
const router = express.Router();

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
    
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file uploaded',
                code: 'NO_FILE'
            });
        }

        tempFilePath = req.file.path;
        const originalFilename = req.file.originalname;
        const requirementId = req.query.requirementId;

        logger.info(`📄 PDF upload received: ${originalFilename} (${req.file.size} bytes)`, {
            userId: req.user.id,
            filename: originalFilename,
            fileSize: req.file.size,
            requirementId,
            tempPath: tempFilePath
        });

        // Include PDF validation details in the response
        const validationDetails = req.pdfValidation || {};
        
        // Get storage statistics
        const storageStats = await req.tempStorage.getStats();
        
        // Include authentication and context information
        const authContext = {
            userId: req.user.id,
            username: req.user.username,
            role: req.user.role,
            sessionId: req.user.sessionId,
            uploadContext: req.uploadContext,
            rateLimitRemaining: req.uploadRateLimit?.remaining || 0
        };

        // TODO: Implement PDF parsing logic here
        // For now, return a placeholder response with validation info
        const parsedData = {
            metadata: {
                filename: originalFilename,
                fileSize: req.file.size,
                uploadedAt: new Date().toISOString(),
                uploadedBy: req.user.id,
                tempPath: tempFilePath
            },
            authentication: authContext,
            validation: {
                isValid: true,
                pdfVersion: validationDetails.version,
                fileSize: validationDetails.fileSize,
                structureScore: validationDetails.structureScore,
                hasProperTrailer: validationDetails.hasProperTrailer,
                hasXrefTable: validationDetails.hasXrefTable
            },
            storage: {
                tempFiles: storageStats?.temp?.count || 0,
                totalStorageUsed: storageStats?.totalSize || 0,
                tempStorageSize: storageStats?.temp?.size || 0
            },
            requirement: {
                number: null, // Will be extracted from PDF
                overallStatus: null // Will be extracted from PDF
            },
            testInstances: [], // Will be populated from PDF form fields
            urls: [], // Will be extracted from PDF content
            parsing: {
                success: false,
                message: 'PDF parsing not yet implemented',
                fieldsFound: 0,
                fieldsProcessed: 0
            }
        };

        // Clean up temp file
        try {
            await fs.unlink(tempFilePath);
        } catch (unlinkError) {
            logger.warn(`Failed to clean up temp file: ${tempFilePath}`, unlinkError);
        }

        res.json({
            success: true,
            message: 'PDF uploaded successfully (parsing placeholder)',
            data: parsedData
        });

    } catch (error) {
        logger.error('PDF upload processing failed:', error);

        // Clean up temp file on error
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (unlinkError) {
                logger.warn(`Failed to clean up temp file after error: ${tempFilePath}`, unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            error: 'Failed to process PDF upload',
            message: error.message,
            code: 'PROCESSING_ERROR'
        });
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
        
        res.json({
            success: true,
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
        });
    } catch (error) {
        logger.error('Failed to get storage status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve storage status',
            code: 'STORAGE_STATUS_ERROR'
        });
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

        res.json({
            success: true,
            statistics: stats,
            health: health,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Failed to get storage details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve storage details',
            code: 'STORAGE_DETAILS_ERROR'
        });
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

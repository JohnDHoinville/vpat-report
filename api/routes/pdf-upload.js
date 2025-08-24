const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { handlePDFUpload } = require('../middleware/file-upload');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const router = express.Router();

/**
 * @route POST /api/pdf-upload
 * @desc Upload and parse a PDF test results file
 * @access Private (requires authentication)
 * @body {File} pdf - PDF file to upload and parse
 * @query {string} requirementId - ID of the requirement context (optional)
 */
router.post('/', authenticateToken, handlePDFUpload, async (req, res) => {
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
            requirementId
        });

        // TODO: Implement PDF parsing logic here
        // For now, return a placeholder response
        const parsedData = {
            metadata: {
                filename: originalFilename,
                fileSize: req.file.size,
                uploadedAt: new Date().toISOString(),
                uploadedBy: req.user.id
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
router.get('/status', authenticateToken, (req, res) => {
    res.json({
        success: true,
        status: 'available',
        capabilities: {
            maxFileSize: '10MB',
            supportedFormats: ['application/pdf'],
            features: {
                formFieldExtraction: false, // Will be true when implemented
                urlMatching: false, // Will be true when implemented
                requirementValidation: false // Will be true when implemented
            }
        },
        version: '1.0.0'
    });
});

module.exports = router;

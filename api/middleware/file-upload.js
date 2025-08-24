const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Validate PDF file by checking magic bytes and structure
 * @param {string} filePath - Path to the uploaded file
 * @returns {Promise<{isValid: boolean, error?: string, details?: object}>}
 */
async function validatePDFFile(filePath) {
    try {
        const fileBuffer = await fs.promises.readFile(filePath);
        
        // Check minimum file size (PDFs should be at least a few hundred bytes)
        if (fileBuffer.length < 100) {
            return {
                isValid: false,
                error: 'File too small to be a valid PDF',
                details: { fileSize: fileBuffer.length }
            };
        }

        // Check PDF magic bytes - PDF files start with "%PDF-"
        const pdfHeader = fileBuffer.subarray(0, 5).toString('ascii');
        if (pdfHeader !== '%PDF-') {
            return {
                isValid: false,
                error: 'Invalid PDF file format - missing PDF header',
                details: { header: pdfHeader }
            };
        }

        // Extract PDF version from header (e.g., %PDF-1.4)
        const versionMatch = fileBuffer.subarray(0, 20).toString('ascii').match(/%PDF-(\d+\.\d+)/);
        const pdfVersion = versionMatch ? versionMatch[1] : 'unknown';

        // Check for PDF trailer (PDFs should end with "%%EOF" or similar)
        const lastBytes = fileBuffer.subarray(-50).toString('ascii');
        const hasEOF = lastBytes.includes('%%EOF') || lastBytes.includes('endobj') || lastBytes.includes('xref');
        
        if (!hasEOF) {
            logger.warn('PDF file may be corrupted - missing proper trailer', { filePath });
        }

        // Basic structure validation - look for essential PDF objects
        const fileContent = fileBuffer.toString('ascii', 0, Math.min(fileBuffer.length, 10000)); // Check first 10KB
        const hasXref = fileContent.includes('xref');
        const hasStartxref = fileContent.includes('startxref');
        
        return {
            isValid: true,
            details: {
                fileSize: fileBuffer.length,
                version: pdfVersion,
                hasProperTrailer: hasEOF,
                hasXrefTable: hasXref,
                hasStartxref: hasStartxref,
                structureScore: [hasEOF, hasXref, hasStartxref].filter(Boolean).length
            }
        };

    } catch (error) {
        return {
            isValid: false,
            error: 'Failed to validate PDF file: ' + error.message,
            details: { validationError: error.message }
        };
    }
}

// Configure multer for PDF file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp and random suffix
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `pdf-upload-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// Enhanced file filter with comprehensive validation
const fileFilter = (req, file, cb) => {
    // Check MIME type
    if (file.mimetype !== 'application/pdf') {
        return cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF files are allowed.`), false);
    }

    // Check file extension
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (fileExt !== '.pdf') {
        return cb(new Error(`Invalid file extension: ${fileExt}. Only .pdf files are allowed.`), false);
    }

    // Check filename length and characters
    if (file.originalname.length > 255) {
        return cb(new Error('Filename too long. Maximum 255 characters allowed.'), false);
    }

    // Basic filename validation (allow alphanumeric, spaces, hyphens, underscores, periods)
    const validFilenamePattern = /^[a-zA-Z0-9\s\-_.()]+\.pdf$/i;
    if (!validFilenamePattern.test(file.originalname)) {
        return cb(new Error('Invalid filename. Only alphanumeric characters, spaces, hyphens, underscores, and periods are allowed.'), false);
    }

    logger.info(`📄 File filter passed for: ${file.originalname}`, {
        mimetype: file.mimetype,
        size: file.size,
        extension: fileExt
    });

    cb(null, true);
};

// Configure multer with file size limits and filters
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Only allow single file upload
    }
});

// Middleware for single PDF file upload
const uploadPDF = upload.single('pdf');

// Enhanced middleware with comprehensive validation
const handlePDFUpload = (req, res, next) => {
    uploadPDF(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: 'File too large. Maximum size is 10MB.',
                    code: 'FILE_TOO_LARGE',
                    details: { maxSize: '10MB' }
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    error: 'Too many files. Only one file is allowed.',
                    code: 'TOO_MANY_FILES',
                    details: { maxFiles: 1 }
                });
            }
            logger.error('Multer upload error:', err);
            return res.status(400).json({
                success: false,
                error: 'File upload error: ' + err.message,
                code: 'UPLOAD_ERROR'
            });
        } else if (err) {
            logger.error('File validation error:', err);
            return res.status(400).json({
                success: false,
                error: err.message,
                code: 'INVALID_FILE_TYPE'
            });
        }
        
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                code: 'NO_FILE'
            });
        }

        // Perform comprehensive PDF validation
        try {
            logger.info(`📄 Starting PDF validation for: ${req.file.originalname}`, {
                path: req.file.path,
                size: req.file.size
            });

            const validation = await validatePDFFile(req.file.path);
            
            if (!validation.isValid) {
                // Clean up invalid file
                try {
                    await fs.promises.unlink(req.file.path);
                } catch (unlinkError) {
                    logger.warn('Failed to clean up invalid file:', unlinkError);
                }

                logger.warn('PDF validation failed:', validation);
                return res.status(400).json({
                    success: false,
                    error: validation.error,
                    code: 'INVALID_PDF_FORMAT',
                    details: validation.details
                });
            }

            // Add validation details to request for use in route handlers
            req.pdfValidation = validation.details;
            
            logger.info('PDF validation successful:', {
                filename: req.file.originalname,
                validation: validation.details
            });

            next();

        } catch (validationError) {
            // Clean up file on validation error
            try {
                await fs.promises.unlink(req.file.path);
            } catch (unlinkError) {
                logger.warn('Failed to clean up file after validation error:', unlinkError);
            }

            logger.error('PDF validation process failed:', validationError);
            return res.status(500).json({
                success: false,
                error: 'Failed to validate PDF file',
                code: 'VALIDATION_ERROR',
                message: validationError.message
            });
        }
    });
};

module.exports = {
    handlePDFUpload,
    validatePDFFile,
    uploadsDir
};

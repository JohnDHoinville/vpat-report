const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
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

// File filter to only allow PDF files
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
    }
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

// Enhanced middleware with error handling
const handlePDFUpload = (req, res, next) => {
    uploadPDF(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: 'File too large. Maximum size is 10MB.',
                    code: 'FILE_TOO_LARGE'
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    error: 'Too many files. Only one file is allowed.',
                    code: 'TOO_MANY_FILES'
                });
            }
            return res.status(400).json({
                success: false,
                error: 'File upload error: ' + err.message,
                code: 'UPLOAD_ERROR'
            });
        } else if (err) {
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
        
        next();
    });
};

module.exports = {
    handlePDFUpload,
    uploadsDir
};

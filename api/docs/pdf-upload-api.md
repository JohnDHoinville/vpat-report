# PDF Upload API Documentation

## Overview

The PDF Upload API provides secure endpoints for uploading, parsing, and processing PDF test result files. This API integrates with the accessibility testing platform to extract test data from completed PDF forms and populate the dashboard for review.

## Base URL

```
http://localhost:3001/api/pdf-upload
```

## Authentication

All endpoints require authentication via JWT Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Required Roles
- `admin` - Full access to all endpoints
- `tester` - Can upload PDFs and view own upload statistics  
- `manager` - Can upload PDFs and view team statistics

## Rate Limiting

- **Upload Limit**: 10 uploads per hour per user
- **Window**: 1 hour (3600000ms)
- **Headers**: Rate limit information included in response headers
  - `X-Upload-RateLimit-Limit`: Maximum uploads allowed
  - `X-Upload-RateLimit-Remaining`: Remaining uploads in current window
  - `X-Upload-RateLimit-Window`: Window duration in milliseconds

## Endpoints

### 1. Upload PDF File

Upload and parse a PDF test results file.

```http
POST /api/pdf-upload
```

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body:**
- `pdf` (File, required): PDF file to upload (max 10MB)

**Query Parameters:**
- `requirementId` (string, optional): UUID of the requirement context

#### Response

**Success (200):**
```json
{
  "success": true,
  "code": "UPLOAD_SUCCESS",
  "message": "PDF uploaded and processed successfully",
  "timestamp": "2025-08-24T13:18:08.028Z",
  "data": {
    "metadata": {
      "filename": "test-report.pdf",
      "fileSize": 1024576,
      "uploadedAt": "2025-08-24T13:18:08.028Z",
      "uploadedBy": "user-123",
      "processingDuration": 1250
    },
    "authentication": {
      "userId": "user-123",
      "username": "testuser",
      "role": "tester",
      "sessionId": "session-456",
      "uploadContext": {
        "requirementId": "req-789",
        "validated": true
      },
      "rateLimitRemaining": 9
    },
    "validation": {
      "isValid": true,
      "pdfVersion": "1.4",
      "fileSize": 1024576,
      "structureScore": 3,
      "hasProperTrailer": true,
      "hasXrefTable": true
    },
    "storage": {
      "tempFiles": 2,
      "totalStorageUsed": 5242880,
      "tempStorageSize": 1024576
    },
    "parsing": {
      "success": true,
      "message": "PDF parsed successfully",
      "fieldsFound": 15,
      "fieldsProcessed": 14,
      "fieldsWithErrors": 1,
      "parsingDuration": 850,
      "warnings": ["One form field could not be read"]
    },
    "requirement": {
      "number": "1.1.1",
      "title": "Images of Text",
      "overallStatus": "passed",
      "extracted": true,
      "matched": true
    },
    "testInstances": [
      {
        "index": 0,
        "url": "https://example.com/page1",
        "urlMatched": true,
        "status": "passed",
        "notes": "All images have proper alt text",
        "results": "No issues found",
        "recommendations": "Continue current practices",
        "extracted": true,
        "hasErrors": false,
        "errors": []
      }
    ],
    "urls": {
      "extracted": ["https://example.com/page1", "https://example.com/page2"],
      "matched": ["https://example.com/page1"],
      "unmatched": ["https://example.com/page2"],
      "invalid": []
    },
    "processing": {
      "startTime": "2025-08-24T13:18:08.028Z",
      "endTime": "2025-08-24T13:18:09.278Z",
      "duration": 1250,
      "steps": [
        {
          "step": "file_upload",
          "status": "completed",
          "timestamp": "2025-08-24T13:18:08.028Z",
          "details": {}
        },
        {
          "step": "pdf_validation",
          "status": "completed",
          "timestamp": "2025-08-24T13:18:08.150Z",
          "details": {}
        },
        {
          "step": "pdf_parsing",
          "status": "completed",
          "timestamp": "2025-08-24T13:18:09.000Z",
          "details": {}
        },
        {
          "step": "file_cleanup",
          "status": "completed",
          "timestamp": "2025-08-24T13:18:09.278Z",
          "details": {}
        }
      ]
    }
  },
  "metadata": {
    "operation": "pdf_upload",
    "stage": "completed",
    "processingTime": 1250,
    "requirementId": "req-789"
  },
  "warnings": [
    "One form field could not be parsed completely"
  ]
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `NO_FILE` | No PDF file uploaded |
| 400 | `INVALID_FILE_TYPE` | File is not a PDF |
| 400 | `FILE_TOO_LARGE` | File exceeds 10MB limit |
| 400 | `INVALID_PDF_FORMAT` | PDF format is invalid or corrupted |
| 400 | `INVALID_REQUIREMENT_ID` | Requirement ID format is invalid |
| 401 | `NO_TOKEN` | No authentication token provided |
| 401 | `INVALID_TOKEN` | Authentication token is invalid |
| 403 | `INSUFFICIENT_PERMISSIONS` | User role not authorized for uploads |
| 429 | `RATE_LIMIT_EXCEEDED` | Upload rate limit exceeded |
| 500 | `PROCESSING_ERROR` | Server error during processing |

**Example Error Response:**
```json
{
  "success": false,
  "code": "FILE_TOO_LARGE",
  "message": "File size exceeds the maximum limit of 10MB",
  "timestamp": "2025-08-24T13:18:08.030Z",
  "errorDetails": {
    "category": "file_validation",
    "maxSize": "10MB",
    "actualSize": "15MB",
    "originalError": "File too large",
    "context": {
      "operation": "pdf_upload",
      "userId": "user-123",
      "filename": "large-file.pdf"
    }
  }
}
```

### 2. Get Service Status

Get PDF upload service status and capabilities.

```http
GET /api/pdf-upload/status
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "code": "UPLOAD_SUCCESS",
  "message": "PDF uploaded and processed successfully",
  "timestamp": "2025-08-24T13:18:08.028Z",
  "data": {
    "status": "available",
    "capabilities": {
      "maxFileSize": "10MB",
      "supportedFormats": ["application/pdf"],
      "validation": {
        "mimeTypeCheck": true,
        "fileExtensionCheck": true,
        "pdfHeaderValidation": true,
        "structuralValidation": true,
        "fileSizeLimits": true,
        "filenameValidation": true
      },
      "storage": {
        "temporaryFileManagement": true,
        "automaticCleanup": true,
        "storageMonitoring": true,
        "fileArchiving": true
      },
      "authentication": {
        "jwtTokenRequired": true,
        "sessionValidation": true,
        "roleBasedAccess": true,
        "uploadRateLimiting": true,
        "contextValidation": true,
        "auditLogging": true
      },
      "features": {
        "formFieldExtraction": true,
        "urlMatching": true,
        "requirementValidation": true
      }
    },
    "authentication": {
      "required": true,
      "allowedRoles": ["admin", "tester", "manager"],
      "rateLimits": {
        "maxUploads": 10,
        "windowMs": 3600000,
        "windowDescription": "1 hour"
      },
      "currentUser": {
        "id": "user-123",
        "username": "testuser",
        "role": "tester"
      }
    },
    "storage": {
      "status": "healthy",
      "usage": {
        "total": "15.2 MB",
        "limit": "100 MB",
        "percent": 15
      }
    },
    "version": "1.0.0"
  }
}
```

### 3. Get Storage Statistics

Get detailed storage statistics and health information.

```http
GET /api/pdf-upload/storage
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "code": "UPLOAD_SUCCESS",
  "message": "PDF uploaded and processed successfully",
  "timestamp": "2025-08-24T13:18:08.028Z",
  "data": {
    "statistics": {
      "temp": { "size": 5242880, "count": 3 },
      "processed": { "size": 10485760, "count": 7 },
      "archived": { "size": 20971520, "count": 15 },
      "totalSize": 36700160,
      "totalFiles": 25
    },
    "health": {
      "status": "healthy",
      "usage": {
        "total": "35.0 MB",
        "limit": "100 MB",
        "percent": 35
      },
      "directories": {
        "temp": "5.0 MB",
        "processed": "10.0 MB",
        "archived": "20.0 MB"
      },
      "fileCount": 25
    },
    "requestedBy": {
      "userId": "user-123",
      "username": "testuser",
      "role": "admin"
    }
  }
}
```

### 4. Manual Storage Cleanup

Manually trigger storage cleanup process.

```http
POST /api/pdf-upload/cleanup
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Storage cleanup completed",
  "result": {
    "temp": { "count": 2, "size": 1048576 },
    "processed": { "count": 1, "size": 2097152 },
    "archived": { "count": 0, "size": 0 }
  },
  "triggeredBy": "user-123",
  "timestamp": "2025-08-24T13:18:08.028Z"
}
```

### 5. Get Authentication Statistics

Get authentication and rate limiting statistics (Admin only).

```http
GET /api/pdf-upload/auth-stats
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "authentication": {
    "currentUser": {
      "id": "user-123",
      "username": "admin",
      "role": "admin"
    },
    "rateLimiting": {
      "configuration": {
        "maxUploads": 10,
        "windowMs": 3600000,
        "cleanupInterval": 900000
      },
      "activeUsers": 3,
      "userDetails": [
        {
          "userId": "user-123",
          "uploads": 5,
          "firstUpload": "2025-08-24T12:18:08.028Z",
          "lastUpload": "2025-08-24T13:10:08.028Z",
          "remaining": 5
        }
      ]
    },
    "security": {
      "requiresAuthentication": true,
      "allowedRoles": ["admin", "tester", "manager"],
      "uploadRateLimit": {
        "maxUploads": 10,
        "windowMs": 3600000,
        "enabled": true
      }
    }
  },
  "timestamp": "2025-08-24T13:18:08.028Z"
}
```

## Response Structure

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "code": "SUCCESS_CODE",
  "message": "Human readable success message",
  "timestamp": "ISO 8601 timestamp",
  "data": { /* Response data */ },
  "metadata": { /* Optional metadata */ },
  "warnings": [ /* Optional warnings array */ ]
}
```

### Error Response
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human readable error message",
  "timestamp": "ISO 8601 timestamp",
  "errorDetails": {
    "category": "error_category",
    "originalError": "Original error message",
    "context": { /* Error context */ }
  }
}
```

## Error Codes

### Success Codes
- `UPLOAD_SUCCESS` - PDF uploaded and processed successfully
- `PARSING_SUCCESS` - PDF parsing completed successfully
- `VALIDATION_SUCCESS` - PDF validation passed

### Client Error Codes
- `NO_FILE` - No PDF file uploaded
- `INVALID_FILE_TYPE` - File is not a PDF
- `FILE_TOO_LARGE` - File exceeds size limit
- `INVALID_PDF_FORMAT` - PDF format is invalid
- `INVALID_REQUIREMENT_ID` - Requirement ID format invalid
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RATE_LIMIT_EXCEEDED` - Upload rate limit exceeded

### Parsing Error Codes
- `PARSING_FAILED` - PDF parsing failed
- `FORM_FIELDS_NOT_FOUND` - No form fields found in PDF
- `URL_EXTRACTION_FAILED` - URL extraction failed
- `REQUIREMENT_MISMATCH` - Requirement number mismatch
- `PARTIAL_PARSING_SUCCESS` - Partial parsing with issues

### Server Error Codes
- `PROCESSING_ERROR` - General processing error
- `STORAGE_ERROR` - Storage system error
- `DATABASE_ERROR` - Database operation error
- `VALIDATION_ERROR` - Server-side validation error

### Authentication Error Codes
- `NO_TOKEN` - No authentication token provided
- `INVALID_TOKEN` - Invalid or expired token
- `INVALID_SESSION` - Invalid session
- `AUTH_PROCESSING_ERROR` - Authentication processing error

## Usage Examples

### cURL Examples

**Upload PDF with requirement context:**
```bash
curl -X POST \
  -H "Authorization: Bearer <jwt_token>" \
  -F "pdf=@test-report.pdf" \
  "http://localhost:3001/api/pdf-upload?requirementId=req-123"
```

**Get service status:**
```bash
curl -H "Authorization: Bearer <jwt_token>" \
  "http://localhost:3001/api/pdf-upload/status"
```

**Trigger cleanup:**
```bash
curl -X POST \
  -H "Authorization: Bearer <jwt_token>" \
  "http://localhost:3001/api/pdf-upload/cleanup"
```

### JavaScript Examples

**Upload PDF using Fetch API:**
```javascript
const formData = new FormData();
formData.append('pdf', pdfFile);

const response = await fetch('/api/pdf-upload?requirementId=req-123', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('Upload successful:', result.data);
} else {
  console.error('Upload failed:', result.message);
}
```

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT tokens
2. **Role-Based Access**: Different roles have different permissions
3. **Rate Limiting**: Upload limits prevent abuse
4. **File Validation**: Comprehensive PDF validation before processing
5. **Audit Logging**: All operations are logged for security monitoring
6. **Temporary Storage**: Files are automatically cleaned up
7. **Error Handling**: Detailed error information without exposing sensitive data

## Integration Notes

1. **File Size Limits**: Maximum 10MB per PDF file
2. **Supported Formats**: Only PDF files are accepted
3. **Processing Time**: Large files may take several seconds to process
4. **Rate Limits**: Monitor remaining uploads via response headers
5. **Error Handling**: Implement proper error handling for all response codes
6. **Progress Tracking**: Use processing steps to show upload progress
7. **Context Validation**: Always provide requirement context when available

## Changelog

### Version 1.0.0
- Initial API implementation
- File upload and validation
- PDF parsing (placeholder)
- Authentication and rate limiting
- Storage management
- Comprehensive error handling

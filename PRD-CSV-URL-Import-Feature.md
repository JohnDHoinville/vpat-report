# Product Requirements Document: CSV URL Import Feature

## Overview

### Product Name
CSV URL Bulk Import for Web Crawler

### Product Version
1.0.0

### Document Version
1.0 - Initial Requirements

### Date
August 22, 2025

### Authors
Development Team

---

## Executive Summary

The CSV URL Import feature enables users to bulk import multiple URLs into web crawlers through CSV file upload, dramatically improving efficiency for large-scale accessibility testing projects. This feature extends the existing manual URL addition functionality to support batch operations.

### Problem Statement
Currently, users must manually add URLs one-by-one to web crawlers, which is time-consuming and inefficient for projects with large numbers of pages. Testing teams often receive URL lists from clients in CSV format or need to import sitemaps, but the current system requires manual entry of each URL individually.

### Solution Overview
A CSV upload interface that allows users to bulk import URLs with metadata, including validation, duplicate detection, and comprehensive error reporting. The feature integrates seamlessly with the existing web crawler system and maintains data integrity.

---

## Business Objectives

### Primary Goals
1. **Efficiency Improvement**: Reduce URL import time from minutes/hours to seconds
2. **User Experience**: Streamline workflow for accessibility testing teams
3. **Scalability**: Support large-scale testing projects with hundreds of URLs
4. **Data Quality**: Ensure accurate and validated URL imports

### Success Metrics
- **Time Reduction**: 95% reduction in URL import time for bulk operations
- **User Adoption**: 80% of users with >20 URLs use CSV import instead of manual entry
- **Error Rate**: <2% of imported URLs require manual correction
- **User Satisfaction**: 90% user satisfaction score for import workflow

---

## User Stories

### Primary User: Accessibility Testing Engineer

**As an accessibility testing engineer, I want to:**

1. **Bulk Import URLs**
   - Import 50-500 URLs from a CSV file in under 30 seconds
   - See progress updates during large imports
   - Receive detailed success/error reports after import

2. **Validate Import Data**
   - Preview URLs before importing to verify format and content
   - Identify and resolve duplicate URLs before they're added
   - Receive clear error messages for invalid URLs or data

3. **Manage Import Results**
   - Download error reports for failed URLs to fix externally
   - See imported URLs immediately in the crawler interface
   - Distinguish between manually added and imported URLs

### Secondary User: Project Manager

**As a project manager, I want to:**

1. **Receive Client URL Lists**
   - Import URL lists provided by clients in standard CSV format
   - Ensure all client-specified URLs are included in testing scope
   - Generate reports on import success rates for client communication

---

## Functional Requirements

### Core Features

#### 1. CSV File Upload Interface

**1.1 Upload Modal**
- Modal dialog accessible from "View Crawled Pages" interface
- Drag-and-drop file upload area with browse button fallback
- Support for .csv and .txt file extensions
- Maximum file size: 5MB (approximately 10,000 URLs)
- Visual upload progress indicator

**1.2 File Validation**
- CSV format validation (headers, structure)
- File size limits enforcement
- Empty file detection and rejection
- Non-CSV file type rejection with clear error messages

#### 2. CSV Data Processing

**2.1 Supported CSV Formats**

**Basic Format (Required columns):**
```csv
url
https://example.com/page1
https://example.com/page2
```

**Standard Format (Recommended):**
```csv
url,title,page_type,requires_auth,has_forms,selected_for_testing
https://example.com/page1,Home Page,homepage,false,false,true
https://example.com/login,Login Page,form,false,true,true
```

**Advanced Format (All supported columns):**
```csv
url,title,page_type,depth,requires_auth,has_forms,selected_for_testing,testing_priority,testing_notes
https://example.com/page1,Home Page,homepage,1,false,false,true,2,Critical homepage
https://example.com/dashboard,User Dashboard,content,2,true,false,true,1,Authenticated area
```

**2.2 Data Validation Rules**
- **URL (Required)**: Valid HTTP/HTTPS URL format
- **Title (Optional)**: Text, max 500 characters
- **Page Type (Optional)**: Enum [homepage, content, form, navigation, media, document, application]
- **Depth (Optional)**: Integer 0-10, default 1
- **Requires Auth (Optional)**: Boolean (true/false/1/0), default false
- **Has Forms (Optional)**: Boolean (true/false/1/0), default false
- **Selected for Testing (Optional)**: Boolean (true/false/1/0), default false
- **Testing Priority (Optional)**: Integer 0-2 (0=low, 1=medium, 2=high), default 0
- **Testing Notes (Optional)**: Text, max 1000 characters

#### 3. Import Preview and Validation

**3.1 Preview Interface**
- Display first 10 rows of parsed CSV data in table format
- Show column mapping and detected data types
- Highlight validation errors in red with specific error messages
- Display import summary: Total rows, Valid rows, Error rows

**3.2 Validation Results**
- Real-time validation as CSV is parsed
- Error categorization:
  - **Critical**: Invalid URL format, missing required data
  - **Warning**: Duplicate URLs, questionable data values
  - **Info**: Optional fields using default values
- Option to proceed with valid rows only or cancel to fix errors

#### 4. Duplicate Detection and Handling

**4.1 Duplicate Detection**
- Check against existing URLs in the same crawler
- Check for duplicates within the CSV file itself
- Case-insensitive URL comparison
- Protocol normalization (http vs https)

**4.2 Duplicate Handling Options**
- **Skip Duplicates** (Default): Don't import existing URLs
- **Update Existing**: Update metadata for existing URLs
- **Force Import**: Import as duplicate (with warning)

#### 5. Bulk Import Processing

**5.1 Import Execution**
- Batch processing in chunks of 50 URLs for performance
- Database transaction support for atomic operations
- Progress tracking with percentage complete and ETA
- Ability to cancel import during processing

**5.2 Error Handling**
- Continue processing after individual URL failures
- Collect all errors for comprehensive reporting
- Rollback capability for critical failures
- Automatic retry for transient database errors

#### 6. Results Reporting

**6.1 Import Summary**
- Total URLs processed
- Successfully imported count
- Skipped (duplicates) count
- Failed (errors) count
- Processing time and performance metrics

**6.2 Error Reporting**
- Detailed error list with row numbers and specific issues
- Downloadable error report in CSV format for external fixing
- Error categorization and suggested solutions
- Links to help documentation for common issues

---

## Technical Requirements

### Backend Implementation

#### 1. API Endpoints

**1.1 Bulk Import Endpoint**
```
POST /api/web-crawlers/crawlers/:crawlerId/pages/bulk-import
```

**Request:**
- Content-Type: multipart/form-data
- File: CSV file (key: 'csvFile')
- Body: Import options (duplicate handling, validation level)

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalRows": 150,
    "imported": 142,
    "skipped": 5,
    "failed": 3,
    "processingTimeMs": 2340
  },
  "errors": [
    {
      "row": 15,
      "url": "invalid-url",
      "error": "Invalid URL format",
      "severity": "critical"
    }
  ],
  "duplicates": [
    {
      "row": 45,
      "url": "https://example.com/existing",
      "action": "skipped"
    }
  ]
}
```

**1.2 Import Validation Endpoint**
```
POST /api/web-crawlers/crawlers/:crawlerId/pages/validate-csv
```

**Purpose:** Preview and validate CSV without importing

#### 2. Database Considerations

**2.1 Performance Requirements**
- Batch inserts using parameterized queries
- Database connection pooling for concurrent imports
- Transaction support for atomicity
- Indexing on URL columns for duplicate detection

**2.2 Data Integrity**
- Foreign key constraints maintained
- Existing crawler_run_id logic preserved
- discovered_manually flag set to true for all imports
- Audit trail for bulk operations

#### 3. File Processing

**3.1 CSV Parsing**
- Library: csv-parser (Node.js) for streaming large files
- Memory-efficient processing for files up to 5MB
- Support for different CSV dialects (comma, semicolon, tab)
- Encoding detection and UTF-8 normalization

**3.2 Security Considerations**
- File type validation beyond extension checking
- Virus scanning for uploaded files (future consideration)
- Rate limiting on import endpoints
- Authentication and authorization enforcement

### Frontend Implementation

#### 1. User Interface Components

**1.1 Import Button**
- Location: Next to "Add Manual URL" button in crawler pages view
- Style: Purple theme to distinguish from single URL addition
- Icon: Upload icon (fas fa-upload)
- Text: "Import CSV"

**1.2 Import Modal**
- Modal title: "Import URLs from CSV"
- Drag-and-drop upload area with file browser fallback
- Format documentation section with examples
- Preview table for CSV data validation
- Progress bar during import processing
- Results summary section

**1.3 Integration Points**
- Refresh crawler pages list after successful import
- Update page counts and statistics
- Highlight newly imported URLs with "Imported" badge
- Integrate with existing notification system

#### 2. State Management

**2.1 Alpine.js Integration**
- New modal state: showBulkImportModal
- Import progress tracking: importProgress
- File validation state: csvValidationResults
- Import results: importSummary

**2.2 Error Handling**
- User-friendly error messages for common issues
- Network error handling with retry options
- File size and format error prevention
- Graceful degradation for browser compatibility

---

## Non-Functional Requirements

### Performance Requirements

1. **Import Speed**
   - 100 URLs imported in <5 seconds
   - 1000 URLs imported in <30 seconds
   - Linear scaling with minimal overhead

2. **File Processing**
   - 5MB CSV file parsed in <10 seconds
   - Memory usage <100MB during processing
   - Support for 10,000+ URL imports

3. **User Interface**
   - Modal opens in <1 second
   - Real-time progress updates (every 100ms)
   - Responsive feedback for all user actions

### Reliability Requirements

1. **Data Integrity**
   - 99.9% data accuracy for valid imports
   - Atomic transactions prevent partial imports
   - Automatic rollback on critical failures

2. **Error Recovery**
   - Graceful handling of network interruptions
   - Resume capability for large imports (future)
   - Comprehensive error logging and reporting

### Usability Requirements

1. **Learning Curve**
   - Users can successfully import CSV within 2 minutes of first use
   - Intuitive error messages guide users to solutions
   - Consistent with existing application patterns

2. **Accessibility**
   - WCAG 2.1 AA compliance for all UI components
   - Keyboard navigation support
   - Screen reader compatibility

---

## Dependencies and Integrations

### External Dependencies

#### Backend Dependencies
```json
{
  "csv-parser": "^3.0.0",
  "multer": "^1.4.5-lts.1"
}
```

#### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Internal Integrations

1. **Authentication System**
   - Existing JWT token authentication
   - User permission validation
   - Rate limiting integration

2. **Database Layer**
   - PostgreSQL connection pooling
   - Existing crawler_discovered_pages table
   - Transaction management

3. **Frontend Framework**
   - Alpine.js modal system
   - Existing notification system
   - Current styling and theme system

---

## Implementation Phases

### Phase 1: Core Backend (Week 1)
- [ ] CSV parsing and validation logic
- [ ] Bulk import API endpoint
- [ ] Database transaction handling
- [ ] Basic error reporting
- [ ] Unit tests for core functionality

### Phase 2: Frontend Interface (Week 2)
- [ ] Import modal UI components
- [ ] File upload and validation
- [ ] Progress tracking interface
- [ ] Results display and reporting
- [ ] Integration with existing system

### Phase 3: Advanced Features (Week 3)
- [ ] Preview and validation endpoint
- [ ] Duplicate detection and handling
- [ ] Error report download functionality
- [ ] Performance optimization
- [ ] Comprehensive testing

### Phase 4: Polish and Documentation (Week 4)
- [ ] User experience refinements
- [ ] Error message improvements
- [ ] Documentation and help content
- [ ] End-to-end testing
- [ ] Performance testing and optimization

---

## Risk Assessment

### Technical Risks

1. **Large File Processing**
   - **Risk**: Memory issues with very large CSV files
   - **Mitigation**: Streaming processing, file size limits
   - **Probability**: Medium
   - **Impact**: Medium

2. **Database Performance**
   - **Risk**: Bulk inserts affecting system performance
   - **Mitigation**: Batch processing, off-peak processing option
   - **Probability**: Low
   - **Impact**: High

3. **Data Validation Complexity**
   - **Risk**: Edge cases in URL validation causing failures
   - **Mitigation**: Comprehensive validation rules, extensive testing
   - **Probability**: Medium
   - **Impact**: Low

### User Experience Risks

1. **Learning Curve**
   - **Risk**: Users struggle with CSV format requirements
   - **Mitigation**: Clear documentation, examples, validation feedback
   - **Probability**: Medium
   - **Impact**: Medium

2. **Error Handling**
   - **Risk**: Poor error messages frustrate users
   - **Mitigation**: User-friendly error messages, help documentation
   - **Probability**: Low
   - **Impact**: Medium

---

## Success Criteria

### Acceptance Criteria

1. **Functional Requirements**
   - [ ] Users can upload CSV files with URLs
   - [ ] System validates CSV format and URL data
   - [ ] Bulk import processes 100+ URLs successfully
   - [ ] Duplicate detection prevents data corruption
   - [ ] Error reporting provides actionable feedback
   - [ ] Import results integrate with existing crawler interface

2. **Performance Requirements**
   - [ ] 100 URLs import in <5 seconds
   - [ ] UI remains responsive during import
   - [ ] Memory usage stays under 100MB
   - [ ] Error rate <2% for valid CSV files

3. **User Experience Requirements**
   - [ ] Users complete first import within 2 minutes
   - [ ] Error messages are clear and actionable
   - [ ] Interface follows existing design patterns
   - [ ] Feature works across supported browsers

### Launch Criteria

1. **Quality Assurance**
   - [ ] All unit tests passing
   - [ ] End-to-end testing complete
   - [ ] Performance testing validates requirements
   - [ ] Security review completed

2. **Documentation**
   - [ ] User documentation written and reviewed
   - [ ] API documentation updated
   - [ ] Help system integration complete
   - [ ] CSV format examples provided

---

## Future Enhancements

### Version 1.1 Considerations

1. **Advanced Import Options**
   - Excel file support (.xlsx)
   - XML sitemap import
   - URL validation with head requests
   - Automatic page metadata detection

2. **Bulk Operations**
   - Bulk edit imported URLs
   - Bulk delete with filters
   - Export current URLs to CSV
   - Import settings templates

3. **Integration Features**
   - Sitemap.xml URL discovery
   - Google Analytics integration
   - Third-party URL list services
   - Automated periodic imports

### Version 2.0 Vision

1. **Advanced Workflow**
   - Import job scheduling
   - Background processing queue
   - Import history and versioning
   - Team collaboration features

2. **Intelligence Features**
   - Smart duplicate detection
   - URL pattern recognition
   - Import quality scoring
   - Predictive error detection

---

## Appendices

### Appendix A: CSV Format Examples

**Basic Import CSV:**
```csv
url
https://example.com/
https://example.com/about
https://example.com/contact
https://example.com/products
```

**Standard Import CSV:**
```csv
url,title,page_type,requires_auth,has_forms,selected_for_testing
https://example.com/,Homepage,homepage,false,false,true
https://example.com/about,About Us,content,false,false,true
https://example.com/contact,Contact Form,form,false,true,true
https://example.com/login,User Login,form,false,true,true
https://example.com/dashboard,User Dashboard,content,true,false,true
```

**Advanced Import CSV:**
```csv
url,title,page_type,depth,requires_auth,has_forms,selected_for_testing,testing_priority,testing_notes
https://example.com/,Homepage,homepage,0,false,false,true,2,Critical landing page
https://example.com/products,Product Catalog,content,1,false,false,true,1,Main product listing
https://example.com/product/123,Product Detail,content,2,false,false,false,0,Sample product page
https://example.com/checkout,Checkout Process,form,2,true,true,true,2,Critical transaction flow
```

### Appendix B: Error Codes and Messages

| Error Code | Message | Resolution |
|------------|---------|------------|
| CSV_001 | Invalid CSV format | Check file has proper CSV structure with headers |
| CSV_002 | Missing required URL column | Ensure 'url' column exists in CSV |
| URL_001 | Invalid URL format | Use full HTTP/HTTPS URLs (e.g., https://example.com) |
| URL_002 | Duplicate URL in file | Remove duplicate entries within CSV |
| URL_003 | URL already exists in crawler | URL already added to this crawler |
| DATA_001 | Invalid page_type value | Use: homepage, content, form, navigation, media, document, application |
| DATA_002 | Invalid boolean value | Use: true, false, 1, or 0 |
| FILE_001 | File too large | Maximum file size is 5MB |
| FILE_002 | Empty file | CSV file contains no data |

### Appendix C: API Reference

**Bulk Import Request:**
```bash
curl -X POST \
  http://localhost:3001/api/web-crawlers/crawlers/CRAWLER_ID/pages/bulk-import \
  -H 'Authorization: Bearer JWT_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'csvFile=@urls.csv' \
  -F 'options={"duplicateHandling":"skip","validationLevel":"strict"}'
```

**Validation Request:**
```bash
curl -X POST \
  http://localhost:3001/api/web-crawlers/crawlers/CRAWLER_ID/pages/validate-csv \
  -H 'Authorization: Bearer JWT_TOKEN' \
  -H 'Content-Type: multipart/form-data' \
  -F 'csvFile=@urls.csv'
```

---

**Document Status**: Draft v1.0  
**Next Review**: Implementation Planning Meeting  
**Approval Required**: Product Owner, Technical Lead

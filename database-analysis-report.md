# Database Analysis Report: Accessibility Testing System

## Executive Summary

The accessibility testing system has a complex data flow involving multiple tables and relationships. This analysis reveals several critical issues that are causing data inconsistencies and incorrect test instance creation.

## Current Database Schema Overview

### Core Tables

1. **test_sessions** - Main testing sessions (46 total)
2. **wcag_requirements** - WCAG 2.1 requirements with test methods
3. **section_508_requirements** - Section 508 requirements (manual only)
4. **unified_requirements** - View combining WCAG and Section 508 requirements
5. **discovered_pages** - Pages from site discovery (137 total)
6. **crawler_discovered_pages** - Pages from web crawler (642 total)
7. **test_instances** - Individual test instances (1,092 for current session)
8. **automated_test_results** - Results from automated testing tools
9. **manual_test_results** - Results from manual testing

## Data Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Projects      │    │  Web Crawlers    │    │ Site Discovery  │
│                 │    │                  │    │                 │
│ - id            │    │ - id             │    │ - id            │
│ - name          │    │ - url_patterns   │    │ - project_id    │
│ - description   │    │ - auth_config    │    │ - primary_url   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Test Sessions   │    │Crawler Discovered│    │ Discovered Pages│
│                 │    │     Pages        │    │                 │
│ - id            │    │ - crawler_run_id │    │ - discovery_id  │
│ - project_id    │    │ - url            │    │ - url           │
│ - conformance   │    │ - selected_for_* │    │ - page_type     │
│ - status        │    │ - testing_notes  │    └─────────────────┘
└─────────────────┘    └──────────────────┘             │
         │                       │                      │
         │                       │                      │
         ▼                       ▼                      ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Requirements    │    │   Test Instances │    │ Automated Test  │
│                 │    │                  │    │    Results      │
│ - wcag_requirements│ │ - session_id     │    │                 │
│ - section_508_  │    │ - requirement_id │    │ - page_id       │
│ - unified_requirements│ - page_id       │    │ - test_session_id│
│ - test_method   │    │ - test_method_used│   │ - tool_name     │
└─────────────────┘    └──────────────────┘    │ - violations_count│
         │                       │              └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Manual Test     │    │ Test Evidence    │    │ Audit Logs      │
│    Results      │    │                  │    │                 │
│                 │    │ - test_instance_id│   │ - test_audit_log│
│ - test_instance_id│  │ - evidence_type  │    │ - test_instance_audit_log│
│ - evidence      │    │ - content        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Critical Issues Identified

### 1. **Test Method Mapping Issue** ⚠️ CRITICAL

**Problem**: Requirements with `test_method = 'both'` are only creating `automated` test instances, not both `automated` AND `manual`.

**Evidence**:
```sql
-- Requirements with 'both' test method
SELECT ur.requirement_id, ur.test_method, ti.test_method_used, COUNT(*) as count 
FROM unified_requirements ur 
JOIN test_instances ti ON ur.id = ti.requirement_id 
WHERE ti.session_id = 'b591df2b-fd0c-47a9-bfad-468474c29101' 
AND ur.test_method = 'both' 
GROUP BY ur.requirement_id, ur.test_method, ti.test_method_used;

-- Result: All 'both' requirements only have 'automated' test instances
requirement_id | test_method | test_method_used | count 
1.1.1          | both        | automated        |    42
1.3.1          | both        | automated        |    42
2.1.1          | both        | automated        |    42
...
```

**Impact**: Missing manual test instances for hybrid requirements, incomplete test coverage.

### 2. **Page Selection Discrepancy** ⚠️ CRITICAL

**Problem**: `crawler_discovered_pages` shows 642 pages, but `discovered_pages` only has 137 pages. Most crawled pages are not selected for testing.

**Evidence**:
```sql
-- Crawler pages not selected
SELECT COUNT(*) FROM crawler_discovered_pages WHERE selected_for_testing = false;
-- Result: Most pages are not selected

-- Discovered pages count
SELECT COUNT(*) FROM discovered_pages; -- 137
SELECT COUNT(*) FROM crawler_discovered_pages; -- 642
```

**Impact**: Limited test coverage, many pages not being tested.

### 3. **Data Synchronization Issue** ⚠️ HIGH

**Problem**: `crawler_discovered_pages` and `discovered_pages` are separate tables with different purposes but should be synchronized.

**Current Flow**:
- Web crawler → `crawler_discovered_pages` (642 pages)
- Site discovery → `discovered_pages` (137 pages)
- Test instances reference `discovered_pages` only

**Impact**: Test instances can only test pages in `discovered_pages`, missing many crawled pages.

### 4. **Requirement Assignment Logic** ⚠️ MEDIUM

**Problem**: Test instances are created for all requirements on all pages, regardless of page type or requirement applicability.

**Evidence**:
```sql
-- Each page has 26 test instances (all requirements)
SELECT ti.page_id, COUNT(*) as test_count 
FROM test_instances ti 
WHERE ti.session_id = 'b591df2b-fd0c-47a9-bfad-468474c29101' 
GROUP BY ti.page_id 
ORDER BY test_count DESC LIMIT 5;

-- Result: Every page has exactly 26 test instances
page_id | test_count 
002a8d0d-255e-4023-9a05-27c5c6a7420e | 26
1e6bd12d-7c2f-4eae-8a39-f84e341dd239 | 26
...
```

**Impact**: Inefficient testing, many irrelevant test instances.

## Recommended Fixes

### 1. **Fix Test Method Mapping**

**Action**: Update test instance creation logic to properly handle `test_method = 'both'` requirements.

**Implementation**:
```sql
-- For each 'both' requirement, create both automated AND manual test instances
-- Current: 1 test instance per requirement per page
-- Should be: 2 test instances per 'both' requirement per page (automated + manual)
```

### 2. **Synchronize Page Data**

**Action**: Create a unified page selection process that populates `discovered_pages` from selected `crawler_discovered_pages`.

**Implementation**:
```sql
-- Create missing discovered_pages entries for selected crawler pages
INSERT INTO discovered_pages (discovery_id, url, title, page_type)
SELECT 
    (SELECT id FROM site_discovery WHERE project_id = '73e05c7d-6f2c-4c0c-b385-3030224c0de4' LIMIT 1),
    cdp.url,
    cdp.title,
    'content'
FROM crawler_discovered_pages cdp
WHERE cdp.selected_for_testing = true
AND NOT EXISTS (
    SELECT 1 FROM discovered_pages dp WHERE dp.url = cdp.url
);
```

### 3. **Implement Smart Requirement Assignment**

**Action**: Only create test instances for requirements that apply to specific page types.

**Implementation**:
```sql
-- Use applies_to_page_types field from requirements
-- Match page_type with requirement applicability
-- Create test instances only for applicable requirements
```

### 4. **Add Data Validation**

**Action**: Implement database constraints and triggers to ensure data consistency.

**Implementation**:
```sql
-- Add constraints to ensure test_method_used matches requirement test_method
-- Add triggers to validate page selection consistency
-- Add checks to ensure proper test instance counts
```

## Current Session Analysis

**Session ID**: `b591df2b-fd0c-47a9-bfad-468474c29101`
- **Project**: 73e05c7d-6f2c-4c0c-b385-3030224c0de4
- **Test Instances**: 1,092 total
- **Pages**: 137 discovered pages
- **Requirements**: 26 requirements (all WCAG)
- **Test Methods**: 714 automated, 378 manual (missing hybrid tests)

## Conclusion

The system has fundamental data flow issues that need to be addressed:

1. **Immediate**: Fix test method mapping for 'both' requirements
2. **Short-term**: Synchronize page selection between crawler and discovery
3. **Long-term**: Implement smart requirement assignment based on page types

These fixes will ensure proper test coverage, accurate reporting, and efficient testing workflows. 
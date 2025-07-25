# Product Requirements Document: Unified Testing Session Architecture

**Document Version:** 1.1
**Date:** July 25, 2025
**Author:** John Hoinville
**Status:** Draft

---

## Executive Summary

### Vision Statement

Transform the VPAT reporting system into an enterprise-grade accessibility compliance management platform that provides complete audit trails, standardized testing workflows, and professional VPAT generation capabilities.

### Current State vs. Future State

- **Future**: Unified testing sessions with pre-defined compliance tests, comprehensive audit logging, professional progress tracking

### Business Impact

- **Compliance**: Meet enterprise audit requirements with complete testing documentation
- **Efficiency**: Streamlined testing workflows with clear progress tracking
- **Quality**: Standardized testing approach ensuring comprehensive coverage
- **Scalability**: Professional platform capable of handling multiple concurrent audits

---

## Problem Statement

### Current Architecture Issues

1. **Complex Data Model**: Three separate tables (`violations`, `automated_test_results`, `manual_test_results`) require error-prone UNION queries
2. **Incomplete Audit Trail**: No comprehensive tracking of who did what when during testing process
3. **Poor User Experience**: Users can't easily see complete testing progress or results
4. **Limited Compliance**: Current approach doesn't meet enterprise audit requirements

### Business Problems

- **Auditor Confusion**: External auditors can't verify testing methodology completeness
- **Team Coordination**: Manual testers don't have clear task assignments or progress visibility
- **Quality Assurance**: No way to verify testing thoroughness or reviewer oversight
- **Client Reporting**: Cannot demonstrate systematic compliance testing approach

---

## Solution Overview

### Unified Testing Session Architecture

Replace current ad-hoc testing with structured testing sessions that:

- Requirement:

  - Pre-create all required tests based on selected compliance level (WCAG A/AA/AAA, Section 508 or any combination of all levels)
  - Maintain comprehensive audit trail of all testing activities over time (changes to record, status changes, testing runs, etc)
  - Requirement have detailed overview of what they require to pass, links to the wcag or Section 508 webpage for clear understanding, short explantion for what the task requires to pass.
  - Listing of all urls and a link to the test that fall under the requirement.
- Provide unified data model for all test results (one table for automated, manual, and hybrid)
- Tests:

  - Detailed testing information for status tracking (not started, in-process,failed, passed, re-test. etc )
  - Enable professional progress tracking Requirements and tests and reporting (easy to use filters for status, process, type of test, etc)
  - Capability to provide evidence from text / images / screenshots / etc.  Ability to save each update as an audit item with date.

### Key Innovation: Pre-Defined Test Matrix

Instead of discovering issues and creating records, create complete test matrix upfront:

- **Session Creation**: User selects conformance level(s)) → System creates all applicable tests
- **Test Execution**: Automated tools and manual testers update pre-existing test records in the same table
- **Dynamic Discovery**: Based on the crawled Urls, the system will maps the urls to each of the test requirements and create record for each. for instance all urls may need to map to requirement WCAG 1.3.1.  So there would be a testing record for each url.
- **Audit Trail**: Every change tracked with full context and timeline at the test level

---

## Preservation Strategy: What We Keep

### 🎨 **UI/UX Components to Preserve**

- **Overall Dashboard Design**: Current layout, navigation patterns, and visual hierarchy
- **Color Scheme & Branding**: Existing CSS styling and visual identity
- **Alpine.js Framework**: Current reactive framework - works well for our needs
- **Responsive Design**: Mobile-friendly layouts and breakpoints
- **Component Library**: Existing buttons, modals, forms, and UI patterns

### 🔐 **Authentication & Security**

- **Login System**: Current authentication flow and session management
- **User Management**: Existing user roles and permission structure
- **WebSocket Integration**: Real-time updates and collaboration features
- **Security Middleware**: Helmet, CORS, rate limiting already implemented
- **Auth Configuration**: Project-based authentication configurations

### 🛠️ **Technical Infrastructure**

- **Node.js/Express Backend**: Proven, performant, well-structured
- **PostgreSQL Database**: Robust, supports our complex queries
- **Project Management**: Current project structure and organization (hierarchy- bottom up: audit records-> Test -> requirement -> session -> crawled / selected urls -> projects )
- **File Management**: Existing report storage and export systems
- **API Patterns**: RESTful conventions and error handling
- **Automated Testing Tools:** Axe-core, Playwright + Axe-core, Lighthouse

### 📊 **Features That Work Well**

- **Project Selection & Management**: Current project workflow
- **Page Discovery & Management**: Site crawling and page organization
- **Tool Integrations**: Axe, Pa11y, Lighthouse integration patterns
- **WebSocket Communications**: Real-time collaboration features
- **Error Handling & Logging**: Current debugging and monitoring

### 🔄 **What Gets Enhanced (Not Replaced)**

- **Results Display**: Keep pagination/filtering UI, enhance data source
- **Modal System**: Keep existing modals, enhance with audit timeline
- **Navigation**: Keep tab structure, add new "Testing Session" tab
- **Search & Filtering**: Keep current patterns, extend for test management
- **Progress Tracking**: Keep visual indicators, enhance with compliance metrics

## User Stories & Requirements

### Epic 1: Testing Session Management

**As a** compliance manager
**I want to** create testing sessions with pre-defined compliance requirements
**So that** I can ensure comprehensive coverage and track progress systematically

#### User Stories:

1. **Session Creation**: Create testing session with conformance level selection (WCAG A/AA/AAA, Section 508, any combination all them)
2. **Test Pre-Population**: System automatically creates all required tests based on selected level
3. **Progress Tracking**: View completion percentage and remaining work
4. **Session Comparison**: Compare compliance across different testing sessions

### Epic 2: Unified Test Management

**As a** manual tester
**I want to** see all my assigned tests in one place with clear status and requirements
**So that** I can efficiently complete my testing assignments

#### User Stories:

1. **Test Assignment**: Assign specific tests to team members
2. **Test Execution**: Update test status, add notes, upload evidence
3. **Test Review**: Review and approve test results from other testers
4. **Bulk Operations**: Mass-assign tests or update multiple test statuses

### Epic 3: Comprehensive Audit Trail

**As a** compliance auditor
**I want to** see complete history of every test decision and change
**So that** I can verify the testing methodology and results

#### User Stories:

1. **Activity Timeline**: View chronological history of all test changes
2. **Change Documentation**: See who made what changes when with full context
3. **Evidence Trail**: Track all evidence uploads and modifications

### Epic 4: Dynamic Discovery Integration

**As a** test automation engineer
**I want to** map automated tool findings to pre-defined test requirements
**So that** tool results integrate seamlessly with manual testing workflow

#### User Stories:

1. **Finding Mapping**: Automated mapping of tool findings to existing tests
2. **Automated Test Results:** detailed results are maintained from the automated tool (why ot passed or failed, evidence, links)
3. **Unmapped Handling**: Process for handling findings that don't map to existing tests
4. **Tool Integration**: Support for multiple testing tools (Axe, Pa11y, Lighthouse)
5. **Result Reconciliation**: Handle conflicts between automated and manual results by creating hybrid test type

---

## Frontend Components

- **Testing Session Dashboard**: Main interface showing all active sessions
- **Test Grid View**: Spreadsheet-like view of all requirements in session tab and tests in Testing Tabs (automated - has ability to initiate and manage automated testing and maual tests tab)
- **Test Detail Modal**: Detailed view with audit timeline
- **Requirements Detail Modal**: Detailed view with audit timeline
- **Progress Widgets**: Visual progress indicators and statistics
- **Audit Timeline**: Chronological activity view


## Development Cadance

**Preparation:**

* Review tables in database for Sessions, requirements, tests to understand the depth of their data and needs
* Review all SQL that is available
* Review any old code in dahboard backup to get an ideas for implementation and improvement (not just a copy of the exiting features)
* Ensure you understand how the requirements were mapped to manual, automated, or hybrid AND how the automaed tools were mapped to the automated tests

**Create Sessions:**

* Determine if any data is existing in the table, if not, go to the WCAG and Section 508 page and populate each requirement with the rich data that is already in the structure (requirement details, can it be autmated, if so, what tools, links back to the WCAG and Section 508 requirments)
* Ensure the requirements tables are populated and ready for creation into a session
  * Based on section of requirement levels (A, AA, AAA, Section508, or any combination of them) populate the session's requirements (seperate from the template requirements table)
* create CRUD for sessions
  * When a seesion is created, all of the requirements are copied to the session and appears with detailed information in a table format (based on the WCAG and Section 508 select for the session)  There will be actions for the test in the record view like View Details, abilityt o change status (both in the table view of all requirements and in the detail view)
* Create filters
* Create status's and their opration
* Create details page for Requirements including the test matrix (for all urls that apply to the test)
* Create all of the tests (based on url, requirements, automated, hybrid, or manual)

Automated Testing and Manual Testing Tabs

* Create views for each tab / Hybrid can be viewed in both Tabs.
* Automated Testing Tab will have an addition feature to start run test on selected tests or all tests.  All test will be updated as they progress
* Each rest will maintain an audit trail for all changes to the record.

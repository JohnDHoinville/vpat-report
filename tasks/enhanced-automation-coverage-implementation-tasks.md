# Enhanced Automation Coverage Implementation - Phases 1 & 2
## Task List for PRD-EAC-001

**Based on**: PRD: Enhanced Automation Coverage - Phases 1 & 2 Implementation  
**Document**: PRD-EAC-001  
**Total Estimated Time**: 4-6 weeks  
**Priority**: High  

## **Relevant Files**
- **api/routes/testing-sessions.js**: Fixed JOIN to use `assigned_tester` instead of `tested_by`
- **database/services/manual-testing-service.js**: Fixed INSERT to use `assigned_tester` column mapping
- **api/services/test-automation-service.js**: Fixed createAutomationRun to create entries for all tools with unique IDs, proper UPSERT handling, enhanced page_id fallback logic, added complete runContrastAnalyzer() method integration, added comprehensive runMobileAccessibility() method with multi-viewport testing, and enhanced WebSocket progress updates with detailed tool completion milestones
- **api/routes/automated-testing.js**: Added contrast-analyzer and mobile-accessibility to validTools array
- **dashboard/js/dashboard.js**: Enhanced evidence display with visual indicators, tool icons, confidence progress bars, and improved violation/pass display
- **scripts/wave-api-tester.js**: New WAVE API integration service with free plan API key, rate limiting, and comprehensive accessibility analysis
- **api/services/test-automation-service.js**: Added runWaveApi() method with rate limiting, WebSocket notifications, and WAVE tool integration
- **api/services/websocket-service.js**: Added emitRateLimitNotification() method for real-time rate limit updates
- **api/routes/automated-testing.js**: Added 'wave' to validTools array
- **Enhanced WAVE Rate Limiting**: Implemented comprehensive rate limiting strategy with WebSocket notifications, minute-by-minute countdown updates, audit trail logging, and automation pause/resume functionality
- **Form Accessibility Analysis**: Created scripts/form-accessibility-tester.js with comprehensive form accessibility detection including label association checking (explicit via 'for' attribute, implicit via nesting, ARIA labelling), error message association validation (aria-invalid + aria-describedby), fieldset/legend usage for grouped controls, radio button/checkbox grouping, required field indication, autocomplete attributes, and form instruction validation. Enhanced with workflow testing capabilities including form validation accessibility testing (required field validation, custom pattern validation, format guidance), form submission flow analysis (submit button accessibility, submission feedback, loading indicators), and error handling workflow testing (error message association, announcement verification, error summaries). Integrated into automation pipeline via api/services/test-automation-service.js with 22+ violation types mapped to WCAG 1.3.1, 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 4.1.2, 4.1.3, and other relevant criteria. Added to validTools array in api/routes/automated-testing.js and updated dashboard/js/dashboard.js with form icon support.
- **Heading Structure Analysis**: Created scripts/heading-structure-analyzer.js with comprehensive heading hierarchy validation including H1 uniqueness checking, heading level sequence validation, missing level detection, hierarchy violation analysis, empty and hidden heading detection, duplicate heading text analysis, landmark structure validation, and heading accessibility compliance (aria-level consistency, role validation). Enhanced with comprehensive landmark and document structure analysis including landmark accessible name validation, redundant role attribute detection, document outline creation with hierarchical analysis, skip link validation and positioning analysis, section/article structure validation, and document nesting validation. Implements 30+ violation types covering heading structure issues, landmark structure problems, navigation aids, document organization, and accessibility violations mapped to WCAG 1.3.1, 2.4.1, 2.4.6, 2.4.10, and 4.1.2. Features categorized violation reporting (heading-structure, landmark-structure, navigation-aids, document-structure, accessibility-compliance) with enhanced statistics including landmark analysis, outline depth tracking, skip link detection, and structural violation counts. Integrated into automation pipeline via api/services/test-automation-service.js with comprehensive reporting. Added to validTools array in api/routes/automated-testing.js and updated dashboard/js/dashboard.js with heading icon support.
- **ARIA Testing Analysis**: Created scripts/aria-testing-analyzer.js with comprehensive ARIA attribute validation and complex widget state analysis including ARIA attribute validation (boolean, enumerated, numeric values), role validation and conflict detection, complex widget pattern validation for combobox, listbox, tree, tab, and other interactive components, live region and dynamic content validation with politeness level checking, ARIA relationship validation (describedby, labelledby, owns, controls, activedescendant), accessible name computation and validation, widget state consistency checking, and circular reference detection. Implements 20+ specialized violation types covering ARIA roles, attributes, widget patterns, live regions, relationships, and accessible names mapped to WCAG 1.3.1, 2.1.1, 2.1.2, 2.4.3, 2.4.6, 2.4.7, 3.2.2, 4.1.2, and 4.1.3. Features categorized violation reporting (aria-roles, aria-attributes, widget-patterns, live-regions, aria-relationships, accessible-names, aria-compliance) with detailed statistics including ARIA element counts, widget analysis, live region tracking, and relationship validation. Integrated into automation pipeline via api/services/test-automation-service.js with comprehensive ARIA statistics reporting. Added to validTools array in api/routes/automated-testing.js and updated dashboard/js/dashboard.js with universal-access icon support.
- **WAVE Violation Detection**: Enhanced scripts/wave-api-tester.js with comprehensive WCAG mapping (60+ error types), violation severity calculation, impact assessment, remediation advice, and detection of 15+ WAVE-unique violation patterns not found by other tools
- **WAVE Audit Trail Integration**: Enhanced api/services/test-automation-service.js with comprehensive evidence generation including WAVE-specific descriptions, WCAG/Section 508 cross-references, violation categorization, remediation priority assessment, and intelligent result deduplication system preventing overlap between tools while preserving WAVE-unique insights
- **scripts/mobile-accessibility-tester.js**: Existing comprehensive mobile testing tool integrated into automation pipeline
- **Database**: Removed NOT NULL constraint from test_audit_log.test_instance_id to allow session-level audit entries
- **Server Management**: Resolved multiple Node.js server processes issue that was causing old code to persist

---

## **Pre-Implementation: Critical Database Schema Fixes**

### P0.1 Fix Automation Database Schema Issues
**Priority: P0 | Estimate: 1 day** ⚠️ **CRITICAL - BLOCKING**

**Current Issues** (from server logs):
- `column "started_at" of relation "automated_test_results" does not exist`
- `column "error" of relation "automated_test_results" does not exist` 
- `column "tested_by" of relation "test_instances" does not exist`
- `null value in column "test_instance_id" of relation "test_audit_log" violates not-null constraint`
- `duplicate key value violates unique constraint "automated_test_results_test_session_id_page_id_tool_name_key"`

**Tasks**:
- [x] **Task P0.1.1**: Fix `test_instances` table schema mismatch
  - [x] Update all references from `tested_by` to `assigned_tester`
  - [x] Update all references from `tested_at` to `completed_at`
  - [x] Verify column existence in database schema
  - **Acceptance**: All automation service queries use correct column names

- [x] **Task P0.1.2**: Fix `automated_test_results` table queries
  - [x] Remove attempts to update non-existent `started_at` and `error` columns
  - [x] Ensure `updateRunStatus()` only logs status changes without database updates
  - [x] Fix UPSERT operations for multiple tools to prevent duplicate key violations
  - **Acceptance**: No more column existence errors in automation runs

- [x] **Task P0.1.3**: Fix audit log constraints
  - [x] Modify `createSessionAuditLogEntry()` to handle null `test_instance_id` properly
  - [x] Remove NOT NULL constraint from test_audit_log.test_instance_id column
  - [x] Fix remaining `tested_by` column references causing automation failures
  - **Acceptance**: Audit trail entries created successfully for automation events

- [x] **Task P0.1.4**: Fix `null page_id` errors in `automated_test_results`
  - [x] Ensure `page_id` is always retrieved and used in `automated_test_results` inserts
  - [x] Add fallback logic if no pages are discovered for a session
  - [x] Verify `createAutomationRun` handles missing pages gracefully
  - **Acceptance**: No more `null page_id` errors in automation runs

**Dependencies**: None  
**Blockers**: Current automation system is non-functional  

---

## **Phase 1: Enhanced Foundation (Weeks 1-3)**

### 1.1 Google Lighthouse Integration
**Priority: P1 | Estimate: 1 week**

- [x] **Task 1.1.1**: Enable Lighthouse in automation pipeline
  - [x] Add `lighthouse` to default tools array in `dashboard/js/dashboard.js` (lines 8476, 9625)
  - [x] Update `validTools` in `api/routes/automated-testing.js` to include lighthouse by default
  - [x] Test Lighthouse tool validation
  - **Acceptance**: Lighthouse appears as available tool in frontend UI

- [x] **Task 1.1.2**: Enhance Lighthouse execution method
  - [x] Complete implementation of `runLighthouse()` in `api/services/test-automation-service.js`
  - [x] Add accessibility-only audit configuration
  - [x] Implement proper error handling and timeout management
  - **Acceptance**: Lighthouse audits execute successfully and return structured results

- [x] **Task 1.1.3**: Add Lighthouse-specific evidence capture
  - [x] Extend `extractSelectors()` to handle Lighthouse audit results
  - [x] Update `generateEvidenceDescription()` to include Lighthouse findings
  - [x] Add Performance-Accessibility correlation metrics
  - **Acceptance**: Lighthouse results appear in audit trail with detailed evidence

- [ ] **Task 1.1.4**: Implement Core Web Vitals accessibility correlation
  - Add CWV metrics to evidence metadata
  - Correlate slow loading with accessibility timeouts
  - Document performance impact on accessibility features
  - **Acceptance**: Evidence includes performance-accessibility relationship data

**Coverage Impact**: +3-5% automated coverage  
**Dependencies**: P0.1 (Database fixes)

### 1.2 Enhanced Color Analysis
**Priority: P1 | Estimate: 3 days**

- [x] **Task 1.2.1**: Extend axe-core color analysis rules
  - [x] Add custom color contrast rules beyond basic WCAG AA
  - [x] Configure enhanced contrast calculations for AAA compliance
  - [x] Add focus indicator contrast analysis
  - **Acceptance**: Enhanced color violations detected beyond standard axe rules

- [x] **Task 1.2.2**: Implement advanced color dependency detection
  - [x] Add detection for color-only information dependencies
  - [x] Identify areas where color is the sole means of conveying information
  - **Acceptance**: Color dependency violations flagged in automation results

- [x] **Task 1.2.3**: Add color analysis to evidence system
  - [x] Update evidence capture to include detailed color analysis
  - [x] Add contrast ratio details to violation descriptions
  - [x] Include color accessibility remediation guidance
  - **Acceptance**: Audit trail shows comprehensive color analysis evidence

**Coverage Impact**: +1-2% automated coverage  
**Dependencies**: 1.1 (Lighthouse integration)

### 1.3 Mobile Accessibility Detection  
**Priority: P1 | Estimate: 4 days**

- [x] **Task 1.3.1**: Add touch target size analysis
  - [x] Implement automated touch target measurement
  - [x] Check minimum 44px touch target requirements
  - [x] Detect overlapping interactive elements
  - **Acceptance**: Touch target violations automatically detected

- [x] **Task 1.3.2**: Viewport and responsive accessibility checks
  - [x] Add viewport configuration analysis
  - [x] Check zoom compatibility up to 200%
  - [x] Verify content reflow at different viewport sizes
  - **Acceptance**: Responsive accessibility issues automatically flagged

- [x] **Task 1.3.3**: Mobile-specific WCAG criteria automation
  - [x] Automate detection of mobile-specific success criteria
  - [x] Add orientation lock detection
  - [x] Check for mobile accessibility barriers
  - **Acceptance**: Mobile-specific requirements automated in test results

**Coverage Impact**: +1-2% automated coverage  
**Dependencies**: 1.2 (Color analysis)

### 1.4 Enhanced WebSocket and Evidence Integration
**Priority: P1 | Estimate: 2 days**

- [x] **Task 1.4.1**: Complete WebSocket automation progress
  - [x] Fix WebSocket progress updates during tool execution
  - [x] Add real-time status updates for each tool completion
  - [x] Include evidence generation progress
  - **Acceptance**: Real-time automation progress visible in UI

- [x] **Task 1.4.2**: Enhance evidence display in audit trail UI
  - [x] Complete implementation of `renderEvidenceSection()` in dashboard
  - [x] Add visual indicators for evidence quality and completeness
  - **Acceptance**: Rich evidence display in audit trail interface

**Dependencies**: P0.1 (Database fixes), 1.1-1.3 (Evidence generation)

---

## **Phase 2: Specialized Coverage (Weeks 4-6)**

### 2.1 WAVE API Integration
**Priority: P2 | Estimate: 1 week**

**WAVE API Configuration** ✅:
- **API Key**: `geTFWXSu5663` (Free Plan - 500 requests/month)
- **Current Usage Projection**: ~100-200 monthly calls (well within limit)
- **Rate Limiting Strategy**: Pause automation with WebSocket user notifications

- [x] **Task 2.1.1**: Set up WAVE API integration
  - [x] API credentials obtained: `geTFWXSu5663`
  - [x] Created WAVE API service with rate limiting
  - [x] Integrated into automation pipeline
  - [x] Added WebSocket rate limit notifications
  - Implement WAVE API client in automation service with rate limiting
  - Add WAVE to supported tools list
  - Implement pause/resume functionality for rate limits
  - **Acceptance**: WAVE API successfully called and returns results

- [x] **Task 2.1.2**: Add WAVE-specific violation detection
  - [x] Map WAVE error types to WCAG criteria with comprehensive 60+ error mappings
  - [x] Implement WAVE result parsing and normalization with enhanced severity detection
  - [x] Add WAVE-unique violation types to evidence system with 15+ unique detection patterns
  - [x] Enhanced WCAG mapping including Section 508 cross-references
  - [x] Added violation severity calculation and impact assessment
  - [x] Implemented WAVE-specific remediation advice system
  - **Acceptance**: WAVE detects violations not found by other tools

- [x] **Task 2.1.3**: Implement WAVE rate limiting with user notifications
  - [x] Create WebSocket pause/resume notifications via emitRateLimitNotification()
  - [x] Add audit trail logging for rate limit events in runWaveApi()
  - [x] Implement minute-by-minute progress updates during pauses via sendCountdownNotifications()
  - [x] Enhanced enforceRateLimit() method with WebSocket integration
  - [x] Comprehensive rate limit handling with automation pause/resume
  - **Acceptance**: Users are properly notified when WAVE API limits are reached

- [x] **Task 2.1.4**: Integrate WAVE results into audit trail
  - [x] Add WAVE evidence descriptions with comprehensive WCAG mapping and cross-references
  - [x] Include WAVE-specific remediation guidance with actionable steps and priority assessment
  - [x] Ensure proper result deduplication with existing tools using fingerprint-based matching
  - [x] Enhanced audit trail with WAVE-specific metadata including compliance mapping
  - [x] Implemented comprehensive violation categorization and impact assessment
  - [x] Added cross-tool validation confidence scoring for overlapping violations
  - **Acceptance**: WAVE results appear in comprehensive audit evidence

**Coverage Impact**: +5-8% automated coverage  
**Dependencies**: Phase 1 completion

### 2.2 Advanced Form Analysis
**Priority: P2 | Estimate: 4 days**

- [x] **Task 2.2.1**: Implement comprehensive form accessibility analysis
  - [x] Add advanced label association detection with explicit/implicit label checking
  - [x] Check for proper error message association using aria-invalid and aria-describedby
  - [x] Verify fieldset and legend usage for related form controls
  - [x] Implement radio button and checkbox grouping validation
  - [x] Add form instructions and required field indication checking
  - [x] Integrate form accessibility tester into automation pipeline
  - [x] Created comprehensive FormAccessibilityTester with 12+ violation types
  - [x] Added WCAG criteria mapping for form-specific accessibility requirements
  - **Acceptance**: Complex form accessibility issues automatically detected

- [x] **Task 2.2.2**: Add form submission flow analysis
  - [x] Test form validation accessibility with required field validation testing
  - [x] Check error handling and user feedback with comprehensive error message analysis
  - [x] Verify accessible form completion workflows with submit button and feedback testing
  - [x] Enhanced form accessibility tester with workflow testing capabilities
  - [x] Added validation feedback detection and accessibility verification
  - [x] Implemented error message association and announcement testing
  - [x] Added form submission feedback and loading indicator analysis
  - [x] Created comprehensive workflow issue detection with 10+ new violation types
  - **Acceptance**: Form workflow accessibility automated

**Coverage Impact**: +1-2% automated coverage  
**Dependencies**: 2.1 (WAVE integration)

### 2.3 Comprehensive Heading Structure Analysis
**Priority: P2 | Estimate: 3 days**

- [x] **Task 2.3.1**: Advanced heading hierarchy analysis
  - [x] Implement comprehensive heading structure validation with detailed hierarchy checking
  - [x] Check for proper nesting and logical flow including H1 uniqueness and sequence validation
  - [x] Detect missing or redundant heading levels with gap analysis and structure validation
  - [x] Created comprehensive HeadingStructureAnalyzer with 15+ violation types
  - [x] Added document structure analysis including landmark integration
  - [x] Implemented heading accessibility validation (aria-level, role consistency)
  - [x] Added empty heading, hidden heading, and duplicate text detection
  - [x] Enhanced automation pipeline with heading structure analysis capability
  - [x] Integrated into valid tools with comprehensive reporting and statistics
  - **Acceptance**: Complex heading structure issues automatically flagged

- [x] **Task 2.3.2**: Add landmark and document structure analysis
  - [x] Verify proper use of landmark roles with enhanced validation
  - [x] Check document outline and structure with hierarchical analysis
  - [x] Ensure logical reading order with skip link validation
  - [x] Enhanced landmark detection including region, form, and semantic HTML elements
  - [x] Added redundant role attribute detection and semantic HTML validation
  - [x] Implemented document structure nesting validation (section, article, nav elements)
  - [x] Added skip link target validation and positioning analysis
  - [x] Created comprehensive document outline with depth analysis and orphaned subsection detection
  - [x] Enhanced violation categorization (heading-structure, landmark-structure, navigation-aids, document-structure)
  - [x] Added 15+ new violation types for comprehensive document structure analysis
  - **Acceptance**: Document structure accessibility automated

**Coverage Impact**: +1-2% automated coverage  
**Dependencies**: 2.2 (Form analysis)

### 2.4 Specialized ARIA Testing
**Priority: P2 | Estimate: 5 days**

- [x] **Task 2.4.1**: Advanced ARIA relationship testing
  - [x] Implement comprehensive aria-describedby validation with target existence checking
  - [x] Check complex aria-controls relationships and circular reference detection
  - [x] Verify dynamic ARIA state management and live region validation
  - [x] Added ARIA relationship validation for labelledby, owns, activedescendant, errormessage
  - [x] Comprehensive widget pattern validation for complex interactive components
  - [x] Live region politeness level validation and conflict detection
  - **Acceptance**: Complex ARIA patterns automatically validated

- [x] **Task 2.4.2**: Custom component accessibility analysis
  - [x] Add detection for common custom component patterns (combobox, tree, tablist)
  - [x] Verify accessible widget implementations with required/optional state checking
  - [x] Check for proper keyboard navigation patterns and widget role validation
  - [x] Comprehensive ARIA attribute validation (boolean, enumerated, numeric)
  - [x] Accessible name computation and validation across all widget types
  - [x] Created AriaTestingAnalyzer with 20+ specialized violation types
  - **Acceptance**: Custom component accessibility issues detected

- [ ] **Task 2.4.3**: Dynamic content accessibility testing
  - Implement testing for dynamically updated content
  - Check live regions and status announcements
  - Verify accessible loading states and transitions
  - **Acceptance**: Dynamic content accessibility automated

**Coverage Impact**: +2-3% automated coverage  
**Dependencies**: 2.3 (Heading analysis)

---

## **Final Integration and Testing (Week 6)**

### 3.1 Coverage Validation and Optimization
**Priority: P1 | Estimate: 3 days**

- [ ] **Task 3.1.1**: Validate final coverage metrics
  - Run comprehensive coverage analysis
  - Verify 48-55% automated coverage achievement
  - Document remaining manual testing requirements
  - **Acceptance**: Coverage metrics meet target goals

- [ ] **Task 3.1.2**: Performance optimization
  - Optimize tool execution order and parallelization
  - Implement intelligent test prioritization
  - Add caching for repeated analysis
  - **Acceptance**: Automation execution time optimized

- [ ] **Task 3.1.3**: Comprehensive integration testing
  - Test all tools working together
  - Verify evidence quality and completeness
  - Validate audit trail functionality
  - **Acceptance**: Full system integration validated

**Dependencies**: Phase 1 & 2 completion

### 3.2 Documentation and Training
**Priority: P2 | Estimate: 2 days**

- [ ] **Task 3.2.1**: Update system documentation
  - Document new tools and capabilities
  - Update user guides and training materials
  - Create troubleshooting guides
  - **Acceptance**: Complete documentation for new features

- [ ] **Task 3.2.2**: Create coverage comparison reports
  - Generate before/after coverage analysis
  - Document manual testing reduction achieved
  - Create ROI and efficiency reports
  - **Acceptance**: Clear demonstration of improvements achieved

**Dependencies**: 3.1 (Coverage validation)

---

## **Summary**

**Total Tasks**: 34 tasks  
**Total Estimate**: 4-6 weeks  
**Expected Coverage Increase**: From 35% to 48-55%  
**Manual Testing Reduction**: 45-50%  

**Critical Path**: P0.1 → 1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 2.4 → 3.1 → 3.2

**Risk Mitigation**:
- Database schema fixes must be completed first (P0.1)
- Each phase builds incrementally on previous work
- Regular integration testing throughout implementation
- Fallback to current system if critical issues arise 
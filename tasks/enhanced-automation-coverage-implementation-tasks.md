# Enhanced Automation Coverage Implementation - Phases 1 & 2
## Task List for PRD-EAC-001

**Based on**: PRD: Enhanced Automation Coverage - Phases 1 & 2 Implementation  
**Document**: PRD-EAC-001  
**Total Estimated Time**: 4-6 weeks  
**Priority**: High  

## **Relevant Files**
- **api/routes/testing-sessions.js**: Fixed JOIN to use `assigned_tester` instead of `tested_by`
- **database/services/manual-testing-service.js**: Fixed INSERT to use `assigned_tester` column mapping
- **api/services/test-automation-service.js**: Fixed createAutomationRun to create entries for all tools with unique IDs and proper UPSERT handling

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

- [ ] **Task P0.1.3**: Fix audit log constraints
  - Modify `createSessionAuditLogEntry()` to handle null `test_instance_id` properly
  - Add fallback logic for session-level audit entries vs instance-level entries
  - **Acceptance**: Audit trail entries created successfully for automation events

- [ ] **Task P0.1.4**: Fix duplicate key violations in automated_test_results
  - Ensure UPSERT logic is working correctly in `createAutomationRun()`
  - Add proper conflict resolution for re-runs
  - **Acceptance**: Automation can be re-run without duplicate key errors

**Dependencies**: None  
**Blockers**: Current automation system is non-functional  

---

## **Phase 1: Enhanced Foundation (Weeks 1-3)**

### 1.1 Google Lighthouse Integration
**Priority: P1 | Estimate: 1 week**

- [ ] **Task 1.1.1**: Enable Lighthouse in automation pipeline
  - Add `lighthouse` to default tools array in `dashboard/js/dashboard.js` (lines 8476, 9625)
  - Update `validTools` in `api/routes/automated-testing.js` to include lighthouse by default
  - Test Lighthouse tool validation
  - **Acceptance**: Lighthouse appears as available tool in frontend UI

- [ ] **Task 1.1.2**: Enhance Lighthouse execution method
  - Complete implementation of `runLighthouse()` in `api/services/test-automation-service.js`
  - Add accessibility-only audit configuration
  - Implement proper error handling and timeout management
  - **Acceptance**: Lighthouse audits execute successfully and return structured results

- [ ] **Task 1.1.3**: Add Lighthouse-specific evidence capture
  - Extend `extractSelectors()` to handle Lighthouse audit results
  - Update `generateEvidenceDescription()` to include Lighthouse findings
  - Add Performance-Accessibility correlation metrics
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

- [ ] **Task 1.2.1**: Extend axe-core color analysis rules
  - Add custom color contrast rules beyond basic WCAG AA
  - Configure enhanced contrast calculations for AAA compliance
  - Add focus indicator contrast analysis
  - **Acceptance**: Enhanced color violations detected beyond standard axe rules

- [ ] **Task 1.2.2**: Implement advanced color dependency detection
  - Add detection for color-only information dependencies
  - Identify areas where color is the sole means of conveying information
  - **Acceptance**: Color dependency violations flagged in automation results

- [ ] **Task 1.2.3**: Add color analysis to evidence system
  - Update evidence capture to include detailed color analysis
  - Add contrast ratio details to violation descriptions
  - Include color accessibility remediation guidance
  - **Acceptance**: Audit trail shows comprehensive color analysis evidence

**Coverage Impact**: +1-2% automated coverage  
**Dependencies**: 1.1 (Lighthouse integration)

### 1.3 Mobile Accessibility Detection  
**Priority: P1 | Estimate: 4 days**

- [ ] **Task 1.3.1**: Add touch target size analysis
  - Implement automated touch target measurement
  - Check minimum 44px touch target requirements
  - Detect overlapping interactive elements
  - **Acceptance**: Touch target violations automatically detected

- [ ] **Task 1.3.2**: Viewport and responsive accessibility checks
  - Add viewport configuration analysis
  - Check zoom compatibility up to 200%
  - Verify content reflow at different viewport sizes
  - **Acceptance**: Responsive accessibility issues automatically flagged

- [ ] **Task 1.3.3**: Mobile-specific WCAG criteria automation
  - Automate detection of mobile-specific success criteria
  - Add orientation lock detection
  - Check for mobile accessibility barriers
  - **Acceptance**: Mobile-specific requirements automated in test results

**Coverage Impact**: +1-2% automated coverage  
**Dependencies**: 1.2 (Color analysis)

### 1.4 Enhanced WebSocket and Evidence Integration
**Priority: P1 | Estimate: 2 days**

- [ ] **Task 1.4.1**: Complete WebSocket automation progress
  - Fix WebSocket progress updates during tool execution
  - Add real-time status updates for each tool completion
  - Include evidence generation progress
  - **Acceptance**: Real-time automation progress visible in UI

- [ ] **Task 1.4.2**: Enhance evidence display in audit trail UI
  - Complete implementation of `renderEvidenceSection()` in dashboard
  - Add visual indicators for evidence quality and completeness
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

- [ ] **Task 2.1.1**: Set up WAVE API integration
  - ✅ API credentials obtained: `geTFWXSu5663`
  - Implement WAVE API client in automation service with rate limiting
  - Add WAVE to supported tools list
  - Implement pause/resume functionality for rate limits
  - **Acceptance**: WAVE API successfully called and returns results

- [ ] **Task 2.1.2**: Add WAVE-specific violation detection
  - Map WAVE error types to WCAG criteria
  - Implement WAVE result parsing and normalization
  - Add WAVE-unique violation types to evidence system
  - **Acceptance**: WAVE detects violations not found by other tools

- [ ] **Task 2.1.3**: Implement WAVE rate limiting with user notifications
  - Create WebSocket pause/resume notifications
  - Add audit trail logging for rate limit events
  - Implement minute-by-minute progress updates during pauses
  - Add fallback messaging when API unavailable
  - **Acceptance**: Users are properly notified when WAVE API limits are reached

- [ ] **Task 2.1.4**: Integrate WAVE results into audit trail
  - Add WAVE evidence descriptions
  - Include WAVE-specific remediation guidance
  - Ensure proper result deduplication with existing tools
  - **Acceptance**: WAVE results appear in comprehensive audit evidence

**Coverage Impact**: +5-8% automated coverage  
**Dependencies**: Phase 1 completion

### 2.2 Advanced Form Analysis
**Priority: P2 | Estimate: 4 days**

- [ ] **Task 2.2.1**: Implement comprehensive form accessibility analysis
  - Add advanced label association detection
  - Check for proper error message association
  - Verify fieldset and legend usage
  - **Acceptance**: Complex form accessibility issues automatically detected

- [ ] **Task 2.2.2**: Add form submission flow analysis
  - Test form validation accessibility
  - Check error handling and user feedback
  - Verify accessible form completion workflows
  - **Acceptance**: Form workflow accessibility automated

**Coverage Impact**: +1-2% automated coverage  
**Dependencies**: 2.1 (WAVE integration)

### 2.3 Comprehensive Heading Structure Analysis
**Priority: P2 | Estimate: 3 days**

- [ ] **Task 2.3.1**: Advanced heading hierarchy analysis
  - Implement comprehensive heading structure validation
  - Check for proper nesting and logical flow
  - Detect missing or redundant heading levels
  - **Acceptance**: Complex heading structure issues automatically flagged

- [ ] **Task 2.3.2**: Add landmark and document structure analysis
  - Verify proper use of landmark roles
  - Check document outline and structure
  - Ensure logical reading order
  - **Acceptance**: Document structure accessibility automated

**Coverage Impact**: +1-2% automated coverage  
**Dependencies**: 2.2 (Form analysis)

### 2.4 Specialized ARIA Testing
**Priority: P2 | Estimate: 5 days**

- [ ] **Task 2.4.1**: Advanced ARIA relationship testing
  - Implement comprehensive aria-describedby validation
  - Check complex aria-controls relationships
  - Verify dynamic ARIA state management
  - **Acceptance**: Complex ARIA patterns automatically validated

- [ ] **Task 2.4.2**: Custom component accessibility analysis
  - Add detection for common custom component patterns
  - Verify accessible widget implementations
  - Check for proper keyboard navigation patterns
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
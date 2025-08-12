# Product Requirements Document: Automation System Overhaul

## Executive Summary

**Project**: Unified Automation Testing Architecture  
**Version**: 1.0  
**Date**: August 12, 2025  
**Author**: Development Team  
**Status**: Specification Phase

### Problem Statement

The current accessibility testing automation system has multiple inconsistent entry points that create confusion and potential data integrity issues. Users can trigger automation from 5+ different locations in the UI, each with different behaviors and targeting mechanisms, leading to:

- **Inconsistent user experience** across different automation triggers
- **Risk of unintended full-session testing** when users expect targeted testing  
- **Complex debugging** due to scattered automation logic
- **Maintenance burden** from duplicate/similar code paths

### Solution Overview

Implement a unified, requirement-aware automation architecture that provides consistent behavior across all automation entry points while supporting granular targeting from session-wide to single-requirement testing.

## Current State Analysis

### Existing Automation Entry Points

| Entry Point | Location | Current Behavior | Issues |
|-------------|----------|------------------|---------|
| **General Automation** | Session → Automation Tab → "Start Automation" | Tests ALL automated requirements | ⚠️ No targeting options |
| **Requirements Tab** | Session → Requirements → "Start Automation" | Tests ALL automated requirements | ⚠️ Ignores selected requirements |
| **Automated Runs** | Session → Automated Runs → "Run New Test" | Tests ALL automated requirements | ⚠️ No filtering capability |
| **Requirement Details** | Requirement Modal → "Run Automation" | **BROKEN**: Tests ALL requirements | 🚨 **Critical Issue** |
| **Test Instance Grid** | Test Grid → Instance → "Run Test" | Tests single instance | ✅ Works correctly |

### Technical Architecture Issues

1. **Inconsistent API Usage**: 
   - Some functions call `/automated-testing/run-per-instance/`
   - Others call `/automated-testing/run/` 
   - Different parameter structures across calls

2. **Backend Logic Fragmentation**:
   - `createAutomatedTestResultsForSession()` creates results for ALL pages
   - `getTestInstancesToRun()` can filter but results creation ignores filtering
   - No requirement-level filtering in automation service

3. **Frontend Code Duplication**:
   - 5+ similar functions with slight variations
   - Inconsistent error handling and user feedback
   - Mixed parameter patterns

## Goals & Objectives

### Primary Goals

1. **Unified User Experience**: All automation entry points behave predictably
2. **Flexible Targeting**: Support automation at session, requirement, and instance levels
3. **Data Integrity**: Ensure automation only affects intended test instances
4. **Maintainable Architecture**: Single source of truth for automation logic

### Success Metrics

- **Consistency**: 100% of automation entry points use unified backend API
- **Accuracy**: 0% unintended automation (verified through integration tests)
- **User Satisfaction**: Clear feedback on what will be tested before execution
- **Code Quality**: 50% reduction in automation-related code duplication

## Detailed Requirements

### Functional Requirements

#### FR-1: Unified Automation API

**Description**: Create a single, comprehensive API endpoint for all automation needs

**Acceptance Criteria**:
- Single endpoint `/api/automated-testing/unified-run/:sessionId`
- Supports multiple targeting modes: `session`, `requirements`, `instances`
- Validates targeting parameters before execution
- Returns clear confirmation of what will be tested

**API Specification**:
```javascript
POST /api/automated-testing/unified-run/:sessionId
{
  "target_mode": "session|requirements|instances",
  "target_ids": ["req-id-1", "req-id-2"] | ["instance-id-1"],
  "tools": ["axe-core", "pa11y", "lighthouse"],
  "run_async": true,
  "options": {
    "preview_mode": false,  // If true, returns what would be tested without executing
    "force_retest": false   // If true, retests even completed instances
  }
}
```

#### FR-2: Smart Targeting Logic

**Description**: Backend automatically determines optimal testing scope based on targets

**Acceptance Criteria**:
- **Session Mode**: Tests all automated/hybrid requirements in session
- **Requirements Mode**: Tests only specified requirements across all pages
- **Instances Mode**: Tests only specified test instances
- Validates all targets exist and are testable before starting
- Returns preview of testing scope before execution

#### FR-3: Unified Frontend Interface

**Description**: All UI automation triggers use the same underlying service

**Acceptance Criteria**:
- Single `AutomationService` class handles all automation requests
- Consistent parameter validation across all entry points
- Uniform error handling and user feedback
- Preview mode: "This will test X requirements across Y pages"

#### FR-4: Requirement-Level Automation

**Description**: Users can trigger automation for specific requirements only

**Acceptance Criteria**:
- Requirement details modal shows accurate preview: "Test WCAG 2.4.2 across 3 pages"
- Requirements tab allows multi-select + "Test Selected" 
- Only creates `automated_test_results` for pages with targeted requirements
- Results mapping only affects targeted requirements

### Non-Functional Requirements

#### NFR-1: Performance
- Automation startup time < 3 seconds for any target mode
- Preview generation < 1 second for up to 100 requirements
- Memory usage scales linearly with test instance count

#### NFR-2: Reliability  
- 99.9% automation success rate for valid targets
- Comprehensive error handling with user-friendly messages
- Automatic retry for transient failures

#### NFR-3: Scalability
- Support up to 1000 test instances per session
- Concurrent automation runs (different sessions)
- Efficient database queries for large datasets

## Technical Design

### Backend Architecture

#### New Components

1. **UnifiedAutomationController**
   ```javascript
   class UnifiedAutomationController {
     async validateTargets(sessionId, targetMode, targetIds)
     async previewAutomationScope(sessionId, targetMode, targetIds)
     async executeAutomation(sessionId, config)
   }
   ```

2. **AutomationTargetResolver**
   ```javascript
   class AutomationTargetResolver {
     async resolveSessionTargets(sessionId)
     async resolveRequirementTargets(sessionId, requirementIds)
     async resolveInstanceTargets(sessionId, instanceIds)
   }
   ```

3. **ScopedTestResultsCreator**
   ```javascript
   class ScopedTestResultsCreator {
     async createForTargets(sessionId, tools, targets)
     async getUniquePages(targets)
     async filterToolsByRequirement(requirement, tools)
   }
   ```

#### Modified Components

1. **TestAutomationService**: Refactored to use new unified controller
2. **AutomatedTestingRouter**: Simplified to single endpoint + legacy compatibility
3. **WebSocket Events**: Enhanced to include targeting information

### Frontend Architecture

#### New Components

1. **AutomationService** (Singleton)
   ```javascript
   class AutomationService {
     async previewAutomation(sessionId, targetMode, targetIds)
     async startAutomation(sessionId, config)
     async getAutomationStatus(sessionId, runId)
   }
   ```

2. **AutomationTargetPicker** (Component)
   ```javascript
   // Reusable component for selecting automation targets
   <AutomationTargetPicker 
     mode="requirements" 
     sessionId={sessionId}
     onConfirm={handleAutomationStart}
   />
   ```

#### Refactored Functions

All existing automation functions will be refactored to use `AutomationService`:
- `startAutomatedTesting()` → `AutomationService.startAutomation(sessionId, {target_mode: 'session'})`
- `runAutomatedTestForRequirement()` → `AutomationService.startAutomation(sessionId, {target_mode: 'requirements', target_ids: [reqId]})`
- `triggerAutomatedTest()` → Unified with `startAutomatedTesting()`

### Database Changes

#### New Tables

```sql
-- Track automation runs with targeting information
CREATE TABLE automation_runs_v2 (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES test_sessions(id),
  target_mode VARCHAR(50) NOT NULL, -- 'session', 'requirements', 'instances'
  target_metadata JSONB, -- Store target IDs and resolved scope
  tools_used TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending'
);
```

#### Enhanced Tables

```sql
-- Add targeting metadata to automated_test_results
ALTER TABLE automated_test_results 
ADD COLUMN automation_run_id UUID REFERENCES automation_runs_v2(id),
ADD COLUMN target_requirement_id UUID REFERENCES unified_requirements(id);
```

## Implementation Plan

### Phase 1: Backend Foundation (Week 1)

1. **Day 1-2**: Create new controller and resolver classes
2. **Day 3-4**: Implement unified API endpoint with validation
3. **Day 5**: Add comprehensive tests for targeting logic

### Phase 2: Frontend Integration (Week 2)

1. **Day 1-2**: Create AutomationService and TargetPicker components  
2. **Day 3-4**: Refactor existing automation functions
3. **Day 5**: Update all UI entry points to use new service

### Phase 3: Testing & Migration (Week 3)

1. **Day 1-2**: Integration testing across all entry points
2. **Day 3**: Performance testing with large datasets
3. **Day 4**: User acceptance testing
4. **Day 5**: Deploy with feature flags + monitor

### Phase 4: Cleanup (Week 4)

1. **Day 1-2**: Remove legacy automation endpoints
2. **Day 3**: Clean up deprecated frontend functions
3. **Day 4-5**: Documentation and training materials

## Risk Assessment

### High-Risk Items

1. **Data Migration**: Existing automation runs need careful migration
   - **Mitigation**: Phase rollout with fallback to legacy system
   
2. **User Workflow Disruption**: Changes to familiar UI flows
   - **Mitigation**: Maintain UI consistency, add clear previews

3. **Performance Regression**: New targeting logic complexity
   - **Mitigation**: Comprehensive performance testing, database indexing

### Medium-Risk Items

1. **WebSocket Integration**: Real-time updates for targeted automation
2. **Browser Compatibility**: Frontend service worker patterns
3. **Concurrent Testing**: Multiple users running automation simultaneously

## Testing Strategy

### Unit Tests
- All new controller and service methods
- Targeting resolution logic for edge cases
- API parameter validation

### Integration Tests  
- End-to-end automation flows for each target mode
- Cross-browser testing for frontend components
- Database transaction integrity

### Performance Tests
- Large session automation (500+ test instances)
- Concurrent automation runs
- Memory usage under sustained load

### User Acceptance Tests
- Automation targeting accuracy
- UI consistency across entry points
- Error handling and recovery

## Success Criteria

### Technical Criteria
- [ ] 100% of automation entry points use unified API
- [ ] Zero unintended automation in testing
- [ ] < 3 second automation startup for any targeting mode
- [ ] 50% reduction in automation-related code

### User Experience Criteria  
- [ ] Clear preview of automation scope before execution
- [ ] Consistent behavior across all entry points
- [ ] Informative error messages and recovery options
- [ ] Preserved workflow efficiency for common use cases

### Business Criteria
- [ ] Reduced support tickets related to automation confusion
- [ ] Faster development of new automation features
- [ ] Improved testing accuracy and user confidence

## Appendix

### Legacy API Compatibility

During transition period, maintain these endpoints with deprecation warnings:
- `/automated-testing/run/:sessionId` → Redirect to unified endpoint
- `/automated-testing/run-per-instance/:sessionId` → Map to instances mode

### Performance Benchmarks

Current baseline measurements:
- Session automation startup: ~8 seconds (28 requirements)
- Single requirement: ~5 seconds (unfiltered session testing)
- Database queries: ~200ms average

Target improvements:
- Session automation startup: < 3 seconds
- Single requirement: < 2 seconds  
- Database queries: < 100ms average

### Rollback Plan

1. **Feature flags** control new vs legacy automation system
2. **Database migration** can be reverted via rollback scripts
3. **Frontend changes** deployed incrementally with A/B testing
4. **Monitoring dashboards** track automation success rates and performance
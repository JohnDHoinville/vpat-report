# Web Crawler Site Discovery Unification - Implementation Tasks

## Enterprise-Grade Web Crawler & Site Discovery Integration Platform

**Based on**: PRD - Web Crawler Tab Unification with Site Discovery Architecture  
**Project Duration**: 7 weeks (4 sprints)  
**Strategic Goal**: Unify Web Crawler and Site Discovery into consistent UI/UX with unified downstream testing integration  

**CURRENT STATUS**: **Planning Phase**  
**SYSTEM STATUS**: 🟡 **READY FOR IMPLEMENTATION** - Requirements defined, PRD approved

---

## Sprint 1: UI/UX Unification (Week 1-2)

### 1.1 Web Crawler Tab Redesign

**Priority: P0 | Estimate: 1.5 weeks**

- [ ] **Task 1.1**: Redesign Web Crawler Tab HTML structure

  - Replace existing Web Crawler tab layout with Site Discovery pattern
  - Update panel title to "Web Crawler Sessions for [Project Name] (X/Y Testing)"
  - Remove "Recover All" and "Cleanup" buttons from header
  - Add consistent "New Crawler" button (green styling)
  - Implement Testing Selection panel with blue background
  - **Acceptance**: Web Crawler tab visually matches Site Discovery tab exactly

- [ ] **Task 1.2**: Implement consistent CSS styling

  - Apply Site Discovery CSS classes to Web Crawler elements
  - Ensure session cards match Discovery Sessions card design
  - Update button styling for consistency across tabs
  - Implement responsive design matching Site Discovery
  - Add hover states and animations matching Site Discovery
  - **Acceptance**: All styling elements consistent between tabs with no visual differences

- [ ] **Task 1.3**: Update JavaScript event handlers

  - Refactor Web Crawler JavaScript to match Site Discovery patterns
  - Update event listeners for new UI elements
  - Implement consistent state management between tabs
  - Add error handling matching Site Discovery implementation
  - **Acceptance**: All interactive elements work identically to Site Discovery tab

- [ ] **Task 1.4**: Create unified "View Pages" modal

  - Replace existing Web Crawler pages modal with Site Discovery modal structure
  - Implement identical layout, styling, and functionality
  - Add filtering and selection capabilities matching Site Discovery
  - Include pagination and search functionality
  - **Acceptance**: View Pages modal indistinguishable from Site Discovery modal

- [ ] **Task 1.5**: Testing Selection panel implementation

  - Add blue Testing Selection panel to Web Crawler tab
  - Implement "Select crawlers to include in testing sessions" functionality
  - Add metrics display: Selected Crawlers | Pages for Testing | Excluded Pages | Total Pages
  - Include Select All / Deselect All functionality
  - **Acceptance**: Testing Selection panel fully functional and visually consistent

- [ ] **Task 1.6**: Session URL Selection Modal UI implementation

  - Create session URL selection panel for testing sessions
  - Implement lock/unlock mechanism UI components
  - Add manual URL addition form interface
  - Include real-time URL count displays
  - Design unified URL table with source tracking
  - **Acceptance**: Complete URL selection interface ready for data integration

### 1.2 Frontend Testing Integration

**Priority: P0 | Estimate: 0.5 weeks**

- [ ] **Task 1.7**: Integrate Web Crawler data with existing testing workflows

  - Update frontend JavaScript to consume Web Crawler pages
  - Ensure testing workflows can access both Site Discovery and Web Crawler data
  - Implement unified page selection across both sources
  - **Acceptance**: Testing workflows seamlessly use both data sources

---

## Sprint 2: New Crawler Process + URL Selection (Week 3-4)

### 2.1 New Crawler Process Implementation

**Priority: P0 | Estimate: 1.5 weeks**

- [ ] **Task 2.1**: Complete `openCreateCrawlerModal()` implementation

  - Fix existing incomplete crawler creation modal
  - Implement modal form for crawler configuration
  - Add validation for required fields
  - Include error handling and user feedback
  - **Acceptance**: New Crawler button opens functional configuration modal

- [ ] **Task 2.2**: Crawler configuration form development

  - Create form fields for crawler settings (URL, depth, authentication, etc.)
  - Implement SAML/Basic/Custom authentication setup options
  - Add crawling parameters configuration (max pages, depth, delay)
  - Include advanced settings (user agent, headers, selectors)
  - **Acceptance**: Complete crawler configuration form with all required options

- [ ] **Task 2.3**: Authentication setup workflow

  - Implement SAML authentication configuration
  - Add basic authentication credential management
  - Create custom authentication workflow setup
  - Include session persistence and credential encryption
  - **Acceptance**: All authentication methods configurable and functional

- [ ] **Task 2.4**: Database integration for crawler creation

  - Connect crawler creation form to web_crawlers table
  - Implement crawler configuration persistence
  - Add validation for unique crawler names per project
  - Include crawler status tracking
  - **Acceptance**: Crawler configurations saved and retrievable from database

- [ ] **Task 2.5**: Background crawler execution

  - Implement crawler run initiation from UI
  - Add real-time progress tracking via WebSocket
  - Create crawler run status updates
  - Include error handling and retry logic
  - **Acceptance**: Crawlers execute in background with real-time UI updates

### 2.2 Session URL Selection System

**Priority: P0 | Estimate: 1.5 weeks**

- [ ] **Task 2.6**: `session_selected_urls` and `session_url_locks` table creation

  - Create database tables for session URL selection
  - Implement table relationships and constraints
  - Add indexes for performance optimization
  - Include audit fields for tracking changes
  - **Acceptance**: Database tables created and properly indexed

- [ ] **Task 2.7**: URL deduplication service and view implementation

  - Create `deduplicated_discovered_urls` database view
  - Implement URL deduplication logic across sources
  - Add source priority handling (Site Discovery vs Web Crawler)
  - Include metadata aggregation for deduplicated URLs
  - **Acceptance**: Unified deduplicated URL view combining all sources

- [ ] **Task 2.8**: Session URL selection panel in session interface

  - Implement URL Selection panel at top of testing sessions
  - Add real-time selected URL count display
  - Include lock/unlock status indicators
  - Create "Select URLs" and "Lock Selection" buttons
  - **Acceptance**: URL selection panel functional in testing session interface

- [ ] **Task 2.9**: Lock/unlock mechanism for URL selection

  - Implement URL selection locking functionality
  - Add lock status persistence in database
  - Create unlock capability with proper permissions
  - Include visual indicators for locked state
  - **Acceptance**: URL selection can be locked/unlocked with proper state management

- [ ] **Task 2.10**: Manual URL addition form and validation

  - Create manual URL addition form with validation
  - Implement URL format checking and duplicate prevention
  - Add form fields for URL, title, page type, and notes
  - Include domain validation and security checks
  - **Acceptance**: Manual URLs can be added with proper validation

- [ ] **Task 2.11**: Manual URL management (edit/delete functionality)

  - Implement edit capability for manual URLs
  - Add delete functionality with confirmation
  - Create audit trail for manual URL changes
  - Include session isolation for manual URLs
  - **Acceptance**: Manual URLs fully manageable with proper audit trail

---

## Sprint 3: Data Integration + Session Management (Week 5-6)

### 3.1 Unified Page Service Development

**Priority: P0 | Estimate: 1.5 weeks**

- [ ] **Task 3.1**: Develop `UnifiedPageService`

  - Create service class to unify page access from both sources
  - Implement methods for getting pages by project, source, and filters
  - Add caching for performance optimization
  - Include error handling and fallback mechanisms
  - **Acceptance**: Single service interface for accessing all discovered pages

- [ ] **Task 3.2**: Update Automated Testing integration

  - Modify automated testing service to use unified page service
  - Update page queries to include both Site Discovery and Web Crawler sources
  - Implement session-specific URL filtering for automated tests
  - Add support for manual URLs in automated testing
  - **Acceptance**: Automated testing uses pages from all sources including manual URLs

- [ ] **Task 3.3**: Update Manual Testing integration

  - Update manual testing service to use unified page service
  - Implement session URL selection filtering for manual test assignments
  - Add support for manual URLs in manual testing workflows
  - Include proper page metadata handling across sources
  - **Acceptance**: Manual testing assignments include pages from all sources

- [ ] **Task 3.4**: Update Compliance Session integration

  - Modify compliance session endpoints to use unified page service
  - Update test configuration to include pages from all sources
  - Implement session URL selection filtering for compliance sessions
  - Add support for locked URL selections in compliance workflows
  - **Acceptance**: Compliance sessions work with unified page data

### 3.2 Advanced URL Selection Features

**Priority: P1 | Estimate: 1.5 weeks**

- [ ] **Task 3.5**: Session-specific URL filtering for testing workflows

  - Implement filtering logic to use only selected URLs per session
  - Add validation to prevent testing with empty URL selection
  - Create fallback behavior for sessions without URL selection
  - Include performance optimization for URL filtering
  - **Acceptance**: All testing workflows respect session URL selection

- [ ] **Task 3.6**: Performance optimization and testing

  - Optimize database queries for large datasets
  - Implement caching strategies for frequently accessed data
  - Add performance monitoring and logging
  - Create automated performance tests
  - **Acceptance**: System performs well with 1000+ URLs and 100+ sessions

---

## Sprint 4: Testing & Validation (Week 7)

### 4.1 End-to-End Testing

**Priority: P0 | Estimate: 0.5 weeks**

- [ ] **Task 4.1**: End-to-end workflow testing

  - Test complete crawler creation and execution workflow
  - Verify Site Discovery and Web Crawler UI consistency
  - Test session URL selection across all testing workflows
  - Validate lock/unlock functionality in real scenarios
  - **Acceptance**: All workflows work end-to-end without issues

- [ ] **Task 4.2**: Data integrity validation

  - Verify URL deduplication works correctly
  - Test session isolation for URL selections
  - Validate manual URL persistence and management
  - Check audit trail completeness and accuracy
  - **Acceptance**: All data operations maintain integrity and audit trails

- [ ] **Task 4.3**: Session URL selection workflow testing

  - Test URL selection modal with large datasets
  - Verify filtering and search functionality
  - Test manual URL addition and management
  - Validate lock/unlock state transitions
  - **Acceptance**: URL selection workflow handles all scenarios correctly

### 4.2 Performance & User Acceptance

**Priority: P1 | Estimate: 0.5 weeks**

- [ ] **Task 4.4**: Performance benchmarking

  - Benchmark URL deduplication performance with large datasets
  - Test session creation time with many URLs
  - Measure modal loading time with 1000+ URLs
  - Validate database query performance
  - **Acceptance**: All operations complete within performance targets

- [ ] **Task 4.5**: User acceptance testing

  - Conduct UI/UX consistency verification
  - Test user workflows with stakeholders
  - Gather feedback on new URL selection features
  - Validate accessibility compliance of new interfaces
  - **Acceptance**: User acceptance criteria met with stakeholder approval

- [ ] **Task 4.6**: Documentation updates

  - Update user documentation for new crawler creation workflow
  - Document URL selection process and lock mechanism
  - Create technical documentation for unified page service
  - Update API documentation for new endpoints
  - **Acceptance**: Complete documentation package ready for users

---

## Database Schema Changes

### New Tables Required
- `session_selected_urls` - Store session-specific URL selections
- `session_url_locks` - Track URL selection lock status per session

### Enhanced Tables
- `crawler_discovered_pages` - Add manual entry fields and testing integration
- `web_crawlers` - Ensure proper project relationships

### New Database Views
- `deduplicated_discovered_urls` - Unified view of all discovered URLs
- `unified_discovered_pages` - Performance-optimized unified page access

---

## API Endpoints Required

### Session URL Selection
- `GET /api/sessions/:id/available-urls` - Get deduplicated URLs for selection
- `POST /api/sessions/:id/select-urls` - Save URL selection for session
- `PUT /api/sessions/:id/url-selection/lock` - Lock/unlock URL selection
- `POST /api/sessions/:id/manual-urls` - Add manual URL to session

### Web Crawler Management
- `POST /api/projects/:id/crawlers` - Create new crawler configuration
- `GET /api/projects/:id/crawlers` - List project crawlers
- `POST /api/crawlers/:id/run` - Execute crawler run
- `GET /api/crawlers/:id/pages` - Get crawler discovered pages

---

## Success Metrics

### Functional Requirements ✅
- [ ] Web Crawler Tab visually identical to Site Discovery Tab
- [ ] Complete "New Crawler" workflow functional
- [ ] Web Crawler pages available in ALL testing workflows
- [ ] No regression in Site Discovery functionality
- [ ] Session URL selection workflow complete
- [ ] Manual URL addition fully functional

### Performance Requirements ⚡
- [ ] Page load times under 2 seconds
- [ ] Combined page queries under 500ms
- [ ] URL selection modal loads in under 1 second
- [ ] Database operations scale to 10,000+ URLs

### User Experience Requirements 🎨
- [ ] Consistent navigation patterns across tabs
- [ ] Intuitive crawler creation process
- [ ] Unified page selection experience
- [ ] Clear testing integration indicators
- [ ] Responsive URL selection interface

---

## Risk Mitigation

### High Risk Items
- **Data Migration**: Ensure existing crawler data compatibility
- **Performance**: Validate combined queries work with large datasets
- **UI Consistency**: Maintain exact visual matching between tabs

### Mitigation Strategies
- **Incremental Development**: Build features incrementally with testing
- **Performance Testing**: Benchmark each component before integration
- **User Feedback**: Regular stakeholder reviews of UI changes
- **Rollback Plan**: Maintain ability to revert to current implementation

---

**Document Status**: Ready for Implementation  
**Created**: 2025-01-24  
**Sprint Planning**: Complete  
**Resource Allocation**: 1 Full-Stack Developer for 7 weeks 
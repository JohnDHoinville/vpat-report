# Product Requirements Document: Database Conversion for Accessibility Testing Platform

## Introduction/Overview

The current file-based accessibility testing system has become too cumbersome for Git management and indexing, with hundreds of JSON files creating performance and organization issues. This project will convert the existing platform to a PostgreSQL-based system to improve data organization, enable better reporting capabilities, and streamline the accessibility testing workflow for consultants.

The goal is to create a database-driven platform that maintains all existing functionality while providing better structure for manual testing processes, clearer reporting, and improved data management without Git performance issues.

## Goals

1. **Eliminate Git Performance Issues**: Move testing data from file-based storage to PostgreSQL database to reduce repository size and improve Git operations
2. **Improve Data Organization**: Structure all accessibility testing data in relational database tables for better querying and reporting
3. **Enhance Manual Testing Workflow**: Provide structured process for testing WCAG/508 requirements with evidence capture and retesting capabilities
4. **Better Reporting**: Generate three distinct report types:
   - Management reports (pass/fail status overview)
   - Followup reports (post-remediation compliance status)
   - Developer reports (specific failures with detailed remediation instructions)
5. **Maintain Single-User Efficiency**: Ensure all improvements maintain focus on single consultant workflow without enterprise complexity

## User Stories

**As an accessibility consultant, I want to:**

1. **Project Setup**: Select a website/application to test and have the system organize all related testing data in one place
2. **Automated Testing**: Run automated accessibility tools (axe, pa11y, lighthouse) and have results automatically stored in the database for easy review
3. **Manual Testing Workflow**: Access structured WCAG/508 requirements with step-by-step testing procedures, record pass/fail results with evidence, and retest specific failed requirements
4. **Progress Tracking**: See clear overview of testing progress showing which requirements have been tested, passed, failed, or need retesting
5. **Management Reporting**: Generate executive-level reports showing overall compliance status and improvement areas for client presentations
6. **Developer Reporting**: Create detailed technical reports with specific page elements, failure descriptions, and exact remediation steps for development teams
7. **Compliance Verification**: Rerun tests after remediation to verify fixes and generate followup compliance reports
8. **Data Persistence**: Have all testing data permanently stored and easily accessible without dealing with hundreds of JSON files

## Functional Requirements

### Database Infrastructure

1. The system must use PostgreSQL database with 10 core tables: projects, site_discovery, discovered_pages, wcag_requirements, section_508_requirements, test_sessions, automated_test_results, manual_test_results, violations, vpat_reports
2. The system must provide complete migration script to convert existing JSON files in reports/consolidated-reports and reports/individual-tests directories
3. The system must maintain all existing automated testing data during migration process

### Project Management

4. The system must allow users to create new accessibility testing projects with client information and primary URL
5. The system must support site discovery process to identify all pages requiring testing
6. The system must track testing progress at project level with clear status indicators

### Automated Testing Integration

7. The system must store results from axe, pa11y, and lighthouse automated testing tools
8. The system must eliminate WAVE testing integration (removed per requirements)
9. The system must aggregate automated test results across all discovered pages
10. The system must identify which WCAG/508 requirements still need manual testing after automated tests

### Manual Testing Workflow

11. The system must provide comprehensive WCAG 2.1 Level AA & AAA and Section 508 requirements database with step-by-step testing procedures
12. The system must allow users to record manual test results (pass/fail/not-applicable) with supporting evidence/notes
13. The system must enable retesting of previously failed requirements
14. The system must track which requirements have been manually tested vs. automated-only
15. The system must support evidence capture (screenshots, descriptions, specific element identification)

### Dashboard Interface

16. The system must provide clear dashboard showing current project status and next actions
17. The system must display testing progress with visual indicators for completed vs. remaining requirements
18. The system must show priority items requiring immediate attention
19. The system must provide easy navigation between automated results review and manual testing tasks

### Reporting Capabilities

20. The system must generate management reports showing overall pass/fail status and compliance percentage
21. The system must create developer reports with specific page locations, element selectors, failure descriptions, and remediation instructions
22. The system must produce followup reports comparing before/after remediation status
23. The system must support VPAT (Voluntary Product Accessibility Template) generation combining automated and manual results
24. The system must allow report regeneration at any time with current data

### Data Management

25. The system must provide API endpoints for all data operations (create, read, update, delete)
26. The system must ensure data persistence across system restarts and updates
27. The system must support backup and restoration procedures
28. The system must maintain data integrity with proper foreign key relationships

## Non-Goals (Out of Scope)

1. **Multi-user/Team Features**: No user management, role-based access, or collaboration features
2. **Enterprise Capabilities**: No advanced workflow management, approval processes, or enterprise reporting
3. **WAVE Integration**: Remove existing WAVE testing capabilities to simplify tool stack
4. **Real-time Collaboration**: No simultaneous multi-user editing or real-time updates
5. **Advanced Analytics**: No trend analysis, benchmarking, or comparative analytics across projects
6. **Client Portal**: No external client access or self-service capabilities
7. **Mobile App**: Web-based dashboard only, no native mobile applications
8. **Third-party Integrations**: No JIRA, Slack, or other external tool integrations beyond existing testing tools

## Design Considerations

- **Dashboard Interface**: Use existing dashboard.html as foundation, enhance with database-driven content
- **Responsive Design**: Maintain Tailwind CSS for styling consistency
- **User Experience**: Preserve existing workflow patterns while improving data organization
- **Performance**: Database queries should load faster than current file-based JSON parsing
- **Browser Compatibility**: Support same browsers as current system (Chrome, Firefox, Safari)

## Technical Considerations

- **Database**: PostgreSQL 12+ required for JSON column support and performance
- **Backend**: Node.js with Express for API layer, using pg (node-postgres) driver
- **Migration**: Existing consolidated-reports and individual-tests JSON files must be preserved during migration
- **Environment**: Support both development (local) and production environments
- **Dependencies**: Add pg and dotenv to existing package.json
- **File Structure**: Maintain existing scripts/ directory organization while adding database/ directory

## Success Metrics

1. **Migration Success**: 100% of existing testing data successfully migrated to database without data loss
2. **Performance Improvement**: Dashboard loads in <2 seconds (compared to current file-parsing delays)
3. **Git Repository Size**: Reduce repository size by removing reports/individual-tests directory (400+ JSON files)
4. **Data Organization**: All test results queryable through structured database rather than file parsing
5. **Workflow Efficiency**: Complete accessibility audit cycle (setup → automated testing → manual testing → reporting) in same or less time than current process
6. **Report Generation**: All three report types (management, developer, followup) generated from single database source

## Open Questions

1. **Data Retention**: How long should historical testing data be retained in the database?
2. **Backup Strategy**: What backup frequency and retention policy is needed for the PostgreSQL database?
3. **Performance Monitoring**: Should database performance monitoring be included in initial implementation?
4. **Migration Validation**: What specific validation steps are needed to ensure migration accuracy?
5. **Error Handling**: How should the system handle partial test failures or incomplete data scenarios?

---

**Implementation Timeline**: ~3.5 hours total

- Database setup: 30 minutes
- Data migration: 1 hour
- API integration: 2 hours

**Target Audience**: Single accessibility consultant with existing file-based testing workflow
**Primary Outcome**: Database-driven accessibility testing platform with improved reporting and data organization

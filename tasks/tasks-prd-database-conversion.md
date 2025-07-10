# Task List: Database Conversion for Accessibility Testing Platform

Generated from: `prd-database-conversion.md`

## Relevant Files

- `database/simplified-schema.sql` - PostgreSQL schema with 10 core tables for accessibility testing data ✅
- `database/config.js` - Database connection configuration and helper methods ✅
- `database/migration-service.js` - Service to convert existing JSON files to database records ✅
- `database/services/simple-testing-service.js` - Core business logic for testing workflows
- `database/services/site-discovery-service.js` - Site crawling and page discovery functionality
- `database/seed-requirements.js` - Script to populate WCAG 2.1 AA/AAA and Section 508 requirements ✅
- `scripts/dashboard-backend-db.js` - Database-enabled Express.js API server
- `dashboard.html` - Updated dashboard interface with database integration
- `dashboard_helpers.js` - Updated helper functions for database operations
- `.env` - Environment configuration for database credentials ✅
- `package.json` - Updated dependencies (pg, dotenv) ✅
- `test-db-connection.js` - Database connection testing script ✅
- `database/simple-migration.js` - Simplified migration script for existing data

### Notes

- Database files should be placed in new `database/` directory structure
- Existing JSON files in `reports/` directories will be preserved but migrated to database
- Use `node test-db-connection.js` to verify database setup
- Use `psql accessibility_testing` to interact with database directly

## Tasks

- [x] 1.0 Database Setup & Schema Creation
  - [x] 1.1 Install PostgreSQL 12+ and verify installation
  - [x] 1.2 Create `accessibility_testing` database
  - [x] 1.3 Create `database/simplified-schema.sql` with 10 core tables
  - [x] 1.4 Apply schema to database using psql
  - [x] 1.5 Add `pg` and `dotenv` dependencies to package.json
  - [x] 1.6 Create `.env` file with database configuration
  - [x] 1.7 Create `database/config.js` with connection helpers
  - [x] 1.8 Create `test-db-connection.js` to verify setup

- [ ] 2.0 Data Migration from Files to Database
  - [x] 2.1 Create `database/seed-requirements.js` to populate WCAG 2.1 AA/AAA and Section 508 requirements
  - [x] 2.2 Run requirements seeding script
  - [x] 2.3 Create `database/migration-service.js` for JSON file migration
  - [ ] 2.4 Create `database/simple-migration.js` for existing test data
  - [ ] 2.5 Migrate existing JSON files from `reports/consolidated-reports/`
  - [ ] 2.6 Migrate existing JSON files from `reports/individual-tests/`
  - [ ] 2.7 Validate migration accuracy and data integrity
  - [ ] 2.8 Create backup of migrated data

- [ ] 3.0 API Backend Development
  - [ ] 3.1 Create `database/services/simple-testing-service.js` with core business logic
  - [ ] 3.2 Create `database/services/site-discovery-service.js` for site crawling
  - [ ] 3.3 Create `scripts/dashboard-backend-db.js` with Express.js API endpoints
  - [ ] 3.4 Implement project management endpoints (GET/POST /api/projects)
  - [ ] 3.5 Implement test session endpoints (GET/POST /api/projects/:id/sessions)
  - [ ] 3.6 Implement manual testing endpoints (GET/POST /api/sessions/:id/test-results)
  - [ ] 3.7 Implement VPAT generation endpoint (POST /api/sessions/:id/vpat)
  - [ ] 3.8 Implement health check endpoint (GET /api/health)
  - [ ] 3.9 Add CORS support and error handling middleware

- [ ] 4.0 Dashboard Interface Updates
  - [ ] 4.1 Update `dashboard.html` to use database API endpoints
  - [ ] 4.2 Update `dashboard_helpers.js` to replace file-based operations with API calls
  - [ ] 4.3 Add project selection and creation interface
  - [ ] 4.4 Add test session management interface
  - [ ] 4.5 Add manual testing workflow interface with WCAG/508 requirements
  - [ ] 4.6 Add progress tracking visualizations
  - [ ] 4.7 Update report generation to use database data
  - [ ] 4.8 Remove WAVE testing integration per requirements
  - [ ] 4.9 Test responsive design with Tailwind CSS

- [ ] 5.0 Testing & Validation
  - [ ] 5.1 Test database connection and schema integrity
  - [ ] 5.2 Validate complete data migration without loss
  - [ ] 5.3 Test all API endpoints with sample data
  - [ ] 5.4 Test complete accessibility testing workflow end-to-end
  - [ ] 5.5 Verify VPAT generation with combined automated/manual results
  - [ ] 5.6 Test dashboard performance (target <2 seconds load time)
  - [ ] 5.7 Verify Git repository size reduction
  - [ ] 5.8 Test backup and restore procedures
  - [ ] 5.9 Document any issues and create resolution plan 
## System Design: Backup and Restore

### Database

- PostgreSQL database name: `accessibility_testing`
- Default connection user: `johnhoinville`
- Connection defined via environment in `database/config.js` and `.env`.

### Backups

- Location: `database/backups/`
- Naming: `backup-YYYY-MM-DDTHH-MM-SS-SSSZ-<shortid>.sql.gz`
- Create backup:
  ```bash
  pg_dump -h localhost -U johnhoinville -d "$DB_NAME" --verbose | gzip \
    > database/backups/backup-$(date +%Y-%m-%dT%H-%M-%S-%3NZ)-$(openssl rand -hex 4).sql.gz
  ```

### Restore

- Non-destructive approach: restore into a new DB and point the backend using `DB_NAME`.
- In-place approach: take pre-restore snapshot, reset `public` schema, restore.

Example in-place steps:
```bash
# 1) Pre-restore snapshot
pg_dump -h localhost -U johnhoinville -d accessibility_testing --verbose | gzip \
  > database/backups/backup-pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz

# 2) Reset schema
psql -h localhost -U johnhoinville -d accessibility_testing -v ON_ERROR_STOP=1 -c \
  "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; \
   GRANT ALL ON SCHEMA public TO johnhoinville; GRANT USAGE ON SCHEMA public TO public;"

# 3) Restore backup (remap owners if needed)
gunzip -c database/backups/<file>.sql.gz \
  | sed 's/OWNER TO postgres/OWNER TO johnhoinville/g' \
  | psql -h localhost -U johnhoinville -d accessibility_testing --set ON_ERROR_STOP=1 --echo-errors
```

### Backend Visibility

- When starting backend on port 3001, run with env for verbose logs:
```bash
STRICT_AUTOMATION=true PLAYWRIGHT_HEADLESS=true NODE_ENV=development \
DB_HOST=localhost DB_PORT=5432 DB_NAME=accessibility_testing \
node api/server.js | cat
```

### UI Layout Notes

- Requirement Details modal uses Tailwind grids.
- Layout updated to single-column by removing responsive two-column classes in:
  - `components/components/session-details-modal.html`
  - `components/session-details-modal.html`
  - `dashboard/components/session-details-modal.html`

### Interactive Status Updates

- Test Instance & URLs panel has interactive radio button groups for status updates
- Status options: Passed, Failed, Review, N/A (clean text labels, 1x4 horizontal layout)
- Real-time API calls via existing `updateTestInstanceStatus()` function
- Visual feedback: loading spinners, color-coded statuses, success notifications
- Single-selection enforcement via radio button groups (one status per instance)
- Modal width set to 80% viewport width for optimal content display
- External Resources panel moved directly under WCAG Details for better information flow
- WCAG Documentation shows full URL as clickable link for direct access
- Test notes textarea added under each status selection for detailed comments
- Real-time notes updating with database persistence on blur/field exit

### Print Feature

- Print button added to Requirements Details modal header for tester documentation
- Generates professional print-optimized document with all requirement details
- Includes test instances table with checkboxes for manual status tracking
- Contains testing checklist and notes sections for comprehensive documentation
- Opens in new window with automatic print dialog trigger
- Supports PDF save functionality for offline testing documentation
- Uses Times New Roman typography with proper page margins and breaks
- All test instances loaded (fixed 50-item pagination limit issue)

### Interactive PDF Generation

- "Print PDF" button added alongside print button using jsPDF library
- Generates interactive PDF with fillable form fields for status and notes
- Active links for URLs and WCAG documentation that open in browser
- Fillable checkboxes for Pass/Fail/Review/N/A status selection per URL
- Multi-line text areas for notes on each test instance and general observations
- Interactive testing checklist with workflow checkboxes
- Pre-populates existing notes from database into PDF form fields
- Professional formatting with proper page breaks and typography
- Saves progress directly in PDF when saved - no data loss
- Client-side generation for security and performance

### Session System Migration

- Archived legacy /sessions endpoint, redirecting to /api/testing-sessions
- Frontend legacy session creation functions now direct to wizard
- Database validation updated to prioritize unified_requirements
- Standardized on wizard-based session creation for consistency and better UX

### Testing Instructions Display Fix

- Fixed Requirements Details modal to display testing instructions properly
- Issue: Frontend was looking for `testing_instructions` field but database uses `manual_test_procedure` (JSON)
- Solution: Updated Alpine.js templates to parse and display JSON testing procedure data
- Enhanced display with structured format: Overview, Testing Steps, Tools Needed, Expected Results, Common Failures
- Applied to all three modal implementations for consistency
- Example: Requirement 3.3.4 now shows comprehensive testing instructions instead of "not available"
- Maintains backward compatibility with legacy `testing_instructions` field

### WCAG External Resources Links Fix

- Fixed External Resources section to display WCAG documentation links properly
- Issue: Frontend templates looking for `wcag_url` but database uses `understanding_url` field
- Solution: Updated Alpine.js templates to use correct `understanding_url` field reference
- All 96 requirements now show clickable WCAG documentation links with full URLs
- Links open in new tabs pointing to official W3C WAI understanding documents
- Example: Requirement 3.3.4 shows https://www.w3.org/WAI/WCAG21/Understanding/error-prevention-legal-financial-data.html
- Applied to all three modal implementations for consistency

### Manual Testing Sections Enhancement

- Added Step-by-Step Testing Guide and Common Violations & Examples sections to Requirements Details Modal
- Issue: Critical testing guidance was only available in individual test instance modals, not main requirement modal
- Solution: Integrated existing `getDetailedTestingSteps()` and `getCommonViolations()` functions into Requirements Details Modal
- Enhanced visual design with emerald gradient for testing guide and orange collapsible section for violations
- Updated PDF generation to include new sections with proper formatting and coloring
- Updated print functionality to include comprehensive testing guidance in offline documentation
- Applied to all three modal implementations and both PDF generation methods
- All 96 requirements now provide complete manual testing guidance in one location

### PDF Formatting Enhancement

- Enhanced PDF generation formatting for improved readability and professional appearance
- Issue: PDF output displayed testing content as plain text without proper list formatting, included redundant Testing Instructions section
- Solution: Removed Testing Instructions section completely, enhanced Step-by-Step Testing Guide with numbered formatting (1., 2., 3.), enhanced Common Violations with bulleted formatting (• bullets)
- Technical: Added HTML parsing with regex `/<li>(.*?)<\/li>/g` to preserve list structure in PDF output
- Formatting: Bold numbers/bullets with indented content, orange color theme for violations, proper text wrapping
- Applied to both `js/dashboard.js` and `dashboard/js/dashboard.js` for consistency
- Result: Professional PDF documents with properly formatted numbered testing steps and bulleted violation examples

### Manual URL Database Fix

- Fixed database schema issue preventing manual URL addition to crawlers
- Issue: `POST .../pages` returning 500 error "column 'discovered_manually' does not exist"
- Root Cause: Frontend sending `discovered_manually: true`, API attempting INSERT, but database missing column
- Solution: Added `discovered_manually BOOLEAN DEFAULT false` column to `crawler_discovered_pages` table
- Migration: Created safe migration script `database/migrations/add-discovered-manually-column.sql` with existence check
- Files: `MANUAL_URL_DATABASE_FIX.md` documents complete fix process and testing procedures
- Result: Manual URL addition fully functional, users can add URLs to crawlers without database errors
- Impact: Restored critical crawler functionality, enables manual page discovery workflow

### Common Failures Pagination Fix

- Fixed PDF pagination issue where Common Failure Examples section was getting cut off and lost in fold
- Issue: Common Failures content appearing incomplete or missing from second page in PDF output
- Root Cause: No page break detection before Common Failures section, content getting cut at page boundary
- Solution: Added smart page break logic with 150px height estimation to ensure complete section appears on page 2
- Technical: Conditional `pdfDoc.addPage()` with proper page variable updates and position reset
- Files: Applied to both `js/dashboard.js` and `dashboard/js/dashboard.js` with `COMMON_FAILURES_PAGINATION_FIX.md` documentation
- Result: Common Failure Examples section now displays completely on appropriate page without cutoff
- Impact: Improved PDF quality and completeness, ensures users receive full testing guidance documentation

### Crawler Runs Column Fix

- Fixed database column mismatch preventing manual URL addition to crawlers
- Issue: `POST .../pages` returning 500 error "column 'pages_found' does not exist" when adding manual URLs
- Root Cause: API code trying to INSERT into non-existent `pages_found` column in `crawler_runs` table
- Solution: Updated API code to use correct existing column `pages_discovered` instead of `pages_found`
- Technical: Changed INSERT statement in `api/routes/web-crawlers.js` line 947 to use proper database schema
- Files: `CRAWLER_RUNS_COLUMN_FIX.md` documents complete analysis and fix process
- Result: Manual URL addition functionality fully restored without database errors
- Impact: Users can seamlessly add manual URLs to crawlers, maintaining proper data relationships and workflow

### User Management Modal Definitive Fix

- Permanently resolved persistent auto-opening issue of user management modal across all scenarios
- Issue: Modal auto-opening at inappropriate times, especially after login, despite multiple previous fix attempts
- Root Cause: Missing `showUserManagement` sync in `syncLegacyState()` + auto-protection disabling timers
- Solution: Nuclear auto-open prevention (blocks ALL auto-opens), manual-only state tracking, protected state sync
- Technical: Added `_userManagementManuallyOpened` flag, removed problematic `setTimeout` protection disablers
- Critical Fix: `syncLegacyState()` now only syncs modal state if `_userManagementManuallyOpened = true`
- Files: `USER_MANAGEMENT_MODAL_DEFINITIVE_FIX.md` provides comprehensive analysis and implementation details
- Result: Modal ONLY opens when explicitly requested by user action, eliminates all random popup scenarios
- Impact: Stable, predictable user experience with no unwanted modal interruptions during normal system use




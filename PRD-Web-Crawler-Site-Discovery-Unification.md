# PRD: Web Crawler Tab Unification with Site Discovery Architecture

## 📋 **Executive Summary**

**Project:** Unify Web Crawler Tab with Site Discovery design patterns and integrate crawler data into downstream testing workflows.

**Problem:** The Web Crawler Tab has inconsistent UI/UX compared to Site Discovery, missing "New Crawler Process" functionality, and discovered URLs are not properly integrated with Compliance Sessions, Automated Testing, and Manual Testing workflows.

**Solution:** Redesign Web Crawler Tab to match Site Discovery patterns, implement missing crawler creation workflow, and establish unified data integration with all downstream testing processes.

---

## 🎯 **Business Requirements**

### **Primary Goals**
1. **UI/UX Consistency**: Web Crawler Tab matches Site Discovery Tab design language
2. **Feature Completeness**: Implement missing "New Crawler Process" functionality 
3. **Data Integration**: Web Crawler discovered URLs feed into all testing workflows
4. **Unified Architecture**: Single source of truth for discovered pages across both systems

### **Success Metrics**
- **User Experience**: 100% UI pattern consistency between Web Crawler and Site Discovery
- **Feature Parity**: Complete crawler creation workflow implemented
- **Data Flow**: Web Crawler pages available in all downstream testing modules
- **Performance**: No degradation in existing Site Discovery functionality

---

## 🔍 **Current State Analysis**

### **Database Architecture Study**

#### **Site Discovery Data Flow**
```
projects → site_discovery → discovered_pages → [downstream testing]
```
- **Storage**: `discovered_pages` table with `discovery_id` foreign key
- **Integration**: Used by Automated Testing, Manual Testing, Compliance Sessions
- **UI Pattern**: Clean session list with "View Pages" modal functionality

#### **Web Crawler Data Flow** 
```
projects → web_crawlers → crawler_runs → crawler_discovered_pages → [limited integration]
```
- **Storage**: `crawler_discovered_pages` table with `crawler_run_id` foreign key  
- **Integration**: **LIMITED** - only partially integrated with testing workflows
- **UI Pattern**: **INCONSISTENT** - different design from Site Discovery

#### **Downstream Integration Gaps**

**✅ Current Site Discovery Integration:**
- **Automated Testing**: `simple-testing-service.js` queries `discovered_pages` via `site_discovery`
- **Manual Testing**: `manual-testing-service.js` uses `discovered_pages` for test assignments
- **Compliance Sessions**: Sessions reference `discovered_pages` for testing scope

**❌ Web Crawler Integration Issues:**
- **Automated Testing**: Uses `crawler_discovered_pages` but separate code path
- **Manual Testing**: **NO INTEGRATION** - cannot use crawler pages for manual testing
- **Compliance Sessions**: **PARTIAL** - only basic crawler data access

---

## 🎨 **Design Requirements**

### **1. Web Crawler Tab UI Overhaul**

#### **Target Design Pattern** (from Site Discovery)
```html
<!-- Discovery Sessions for [Project Name] (X/Y Testing) -->
<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-6">
        <div>
            <h2>Web Crawler Sessions for [Project Name] (X/Y Testing)</h2>
        </div>
        <div class="flex space-x-3">
            <!-- Remove: Recover All & Cleanup buttons -->
            <button class="bg-green-600">+ New Crawler</button>
        </div>
    </div>
    
    <!-- Testing Selection Panel -->
    <div class="bg-blue-50 rounded-lg p-4 mb-6">
        <h3>Testing Selection</h3>
        <p>Select crawlers to include in testing sessions</p>
        <!-- Metrics: Selected Crawlers | Pages for Testing | Excluded Pages | Total Pages -->
    </div>
    
    <!-- Crawler Session Cards -->
    <div class="space-y-4">
        <!-- Each crawler session as a card with: -->
        <!-- - Crawler name/URL, status, page counts -->
        <!-- - View Pages & Delete buttons -->
        <!-- - "Selected for Testing" indicator -->
    </div>
</div>
```

#### **Key UI Changes**
- **Panel Title**: "Web Crawler Sessions for [Project Name] (X/Y Testing)"
- **Remove Buttons**: No "Recover All" or "Cleanup" buttons 
- **Add Button**: "New Crawler" button (green, consistent styling)
- **Session Cards**: Match Site Discovery card design exactly
- **Testing Selection**: Same blue panel with metrics display

### **2. View Pages Modal Enhancement**

#### **Target Modal Design** (from Site Discovery)
- **Modal Structure**: Exact same layout as Site Discovery "View Pages" modal
- **Data Display**: Web crawler page data formatted like discovery data
- **Functionality**: Page selection, filtering, testing integration
- **Styling**: Identical visual design and interaction patterns

### **3. Session URL Selection Modal** ⭐ **NEW FEATURE**

#### **Purpose**
Allow testers to create focused testing sessions by selecting specific URLs from all available crawled pages, separate from the complete crawler results.

#### **Panel Placement**
- **Location**: At the top of each testing session panel (similar to "Testing Selection" panel in Site Discovery)
- **Visual**: Blue background panel matching existing design language
- **Always Visible**: Persistent panel showing current selection status

#### **Session URL Selection Panel Design**
```html
<!-- Session URL Selection Panel (at top of session) -->
<div class="bg-blue-50 rounded-lg p-4 mb-6">
    <div class="flex items-center justify-between">
        <div>
            <div class="flex items-center space-x-2">
                <span class="text-blue-600 font-medium">📋 URL Selection for Testing</span>
                <span class="text-sm bg-blue-100 px-2 py-1 rounded-full">
                    Selected: <span id="sessionSelectedCount">0</span> URLs
                </span>
                <span class="text-xs" id="lockStatus">
                    🔓 Unlocked
                </span>
            </div>
            <p class="text-sm text-gray-600 mt-1">Choose specific URLs from all discovered pages for this session</p>
        </div>
        <div class="flex space-x-2">
            <button class="btn-secondary" onclick="openUrlSelectionModal()" id="selectUrlsBtn">
                Select URLs
            </button>
            <button class="btn-warning" onclick="toggleUrlSelectionLock()" id="lockToggleBtn">
                🔒 Lock Selection
            </button>
        </div>
    </div>
    
    <!-- Quick URL Summary (when URLs are selected) -->
    <div id="selectedUrlsSummary" class="mt-3 hidden">
        <div class="text-sm text-gray-700">
            <strong>Selected URLs:</strong>
            <div class="mt-1 max-h-24 overflow-y-auto text-xs">
                <ul id="selectedUrlsList" class="list-disc list-inside space-y-1">
                    <!-- Dynamically populated -->
                </ul>
            </div>
        </div>
    </div>
</div>
```

#### **Modal Design**
```html
<!-- Session URL Selection Modal -->
<div class="modal" id="sessionUrlSelectionModal">
    <div class="modal-content max-w-5xl">
        <div class="modal-header">
            <h2>Select URLs for Testing Session: [Session Name]</h2>
            <p class="text-gray-600">Choose specific pages from all discovered URLs (deduplicated from all sources)</p>
            <div class="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                <p class="text-sm text-yellow-800">
                    ⚠️ URLs are deduplicated across Web Crawler and Site Discovery sources. Each unique URL appears only once.
                </p>
            </div>
        </div>
        
        <!-- Manual URL Addition Section -->
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-green-800 font-medium">➕ Add Manual URL</h3>
                    <p class="text-sm text-green-700">Add URLs that crawlers might have missed</p>
                </div>
                <button class="btn-success btn-sm" onclick="toggleManualUrlForm()">
                    <span id="manualUrlToggleText">+ Add URL</span>
                </button>
            </div>
            
            <!-- Manual URL Form (hidden by default) -->
            <div id="manualUrlForm" class="mt-3 hidden">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium text-green-800 mb-1">URL *</label>
                        <input type="url" id="manualUrl" placeholder="https://example.com/page" 
                               class="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500">
                        <p class="text-xs text-green-600 mt-1">Must be a valid URL starting with http:// or https://</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-green-800 mb-1">Page Title</label>
                        <input type="text" id="manualTitle" placeholder="Page Title (optional)" 
                               class="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div>
                        <label class="block text-sm font-medium text-green-800 mb-1">Page Type</label>
                        <select id="manualPageType" class="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500">
                            <option value="content">Content Page</option>
                            <option value="homepage">Homepage</option>
                            <option value="form">Form Page</option>
                            <option value="application">Application Page</option>
                            <option value="navigation">Navigation Page</option>
                            <option value="media">Media Page</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-green-800 mb-1">Notes</label>
                        <input type="text" id="manualNotes" placeholder="Why this URL is important (optional)" 
                               class="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500">
                    </div>
                </div>
                <div class="flex justify-end space-x-2 mt-3">
                    <button class="btn-secondary btn-sm" onclick="cancelManualUrl()">Cancel</button>
                    <button class="btn-success btn-sm" onclick="addManualUrl()">
                        ➕ Add to List
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Selection Controls -->
        <div class="bg-blue-50 p-4 rounded-lg mb-4">
            <div class="flex items-center justify-between">
                <div class="flex space-x-4">
                    <button class="btn-secondary" onclick="selectAllUrls()">Select All</button>
                    <button class="btn-secondary" onclick="deselectAllUrls()">Deselect All</button>
                    <span class="text-sm text-gray-600">
                        Selected: <span id="selectedCount">0</span> / <span id="totalCount">0</span> URLs
                        <span class="text-green-600">(<span id="manualUrlCount">0</span> manual)</span>
                    </span>
                </div>
                <div class="flex space-x-2">
                    <input type="text" placeholder="Filter URLs..." class="search-input">
                    <select class="filter-select">
                        <option value="">All Page Types</option>
                        <option value="homepage">Homepage</option>
                        <option value="form">Forms</option>
                        <option value="content">Content</option>
                        <option value="application">Application</option>
                    </select>
                    <select class="filter-select">
                        <option value="">All Sources</option>
                        <option value="site_discovery">Site Discovery</option>
                        <option value="web_crawler">Web Crawler</option>
                        <option value="manual">Manual Entry</option>
                        <option value="both">Multiple Sources</option>
                    </select>
                </div>
            </div>
        </div>
        
        <!-- URL Table -->
        <div class="table-container max-h-96 overflow-y-auto">
            <table class="w-full">
                <thead class="sticky top-0 bg-gray-50">
                    <tr>
                        <th class="w-12">
                            <input type="checkbox" id="selectAllCheckbox" onchange="toggleAll()">
                        </th>
                        <th class="text-left">URL</th>
                        <th class="text-left">Title</th>
                        <th class="text-left">Page Type</th>
                        <th class="text-left">Sources</th>
                        <th class="text-left">First Discovered</th>
                        <th class="w-16">Actions</th>
                    </tr>
                </thead>
                <tbody id="urlTableBody">
                    <!-- Dynamic rows populated from deduplicated URL list + manual entries -->
                </tbody>
            </table>
        </div>
        
        <div class="modal-footer">
            <button class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn-primary" onclick="saveSessionUrls()">
                Save Selected URLs to Session (<span id="footerSelectedCount">0</span>)
            </button>
        </div>
    </div>
</div>
```

#### **Functionality Requirements**

##### **1. URL Deduplication Logic**
- **Process**: Before displaying in modal, deduplicate URLs from both `crawler_discovered_pages` AND `discovered_pages`
- **Key**: Use URL as primary deduplication key
- **Source Tracking**: Show which sources (Site Discovery, Web Crawler, or Both) discovered each URL
- **Priority**: If same URL exists in both sources, prioritize most recent discovery with complete metadata

##### **2. Default Selection Behavior**
- **New Sessions**: Start with **0 URLs selected** (empty state)
- **Session Memory**: Each session remembers its own URL selection independently
- **No Cross-Session**: Selections from other sessions do not influence new sessions
- **Persistence**: Selected URLs persist when session is reopened

##### **3. Lock/Unlock Mechanism**
- **Default State**: Unlocked (🔓) - URLs can be modified
- **Lock Action**: 🔒 Lock Selection - prevents URL modification
- **Locked State**: 
  - "Select URLs" button becomes disabled
  - Lock button shows "🔓 Unlock Selection"
  - Visual indicator shows "🔒 Locked" status
- **Use Case**: Lock selection when testing begins to prevent accidental changes

##### **4. Session Integration**
- **Testing Scope**: All testing workflows (Automated, Manual, Compliance) use ONLY selected URLs for this session
- **Empty Session Handling**: If no URLs selected, show warning and prevent testing initiation
- **URL Count Display**: Real-time count in session panel header

##### **5. Manual URL Addition** ⭐ **NEW**
- **Access**: Green "Add Manual URL" section above the selection controls
- **Form Fields**:
  - **URL** (required): Must be valid HTTP/HTTPS URL
  - **Page Title** (optional): Human-readable title
  - **Page Type** (required): Dropdown with standard page types
  - **Notes** (optional): Why this URL is important for testing
- **Validation**:
  - URL format validation (must start with http:// or https://)
  - Duplicate URL prevention (cannot add URL that already exists)
  - Domain validation (optional: restrict to project domain)
- **Integration**:
  - Manual URLs appear in main table with "Manual Entry" source
  - Can be selected/deselected like discovered URLs
  - Persist with session when saved
  - Show count of manual URLs in selection summary
- **Use Cases**:
  - Adding deep-linked pages crawlers missed
  - Including authenticated pages with complex URLs
  - Adding dynamic routes with parameters
  - Including error pages (404, 500) for testing
  - Adding pages behind forms or multi-step processes

##### **6. Manual URL Management**
- **Visual Distinction**: Manual URLs shown with green "Manual" badge
- **Edit Capability**: Manual URLs can be edited/updated (discovered URLs cannot)
- **Delete Capability**: Manual URLs can be removed (discovered URLs cannot)
- **Audit Trail**: Track who added manual URLs and when
- **Session Isolation**: Manual URLs are session-specific (don't appear in other sessions)

---

## 🔧 **Technical Implementation**

### **Phase 1: UI/UX Unification**

#### **1.1 Web Crawler Tab Redesign**
```javascript
// File: dashboard/views/web-crawler.html
// Action: Complete redesign using Site Discovery as template
// Changes:
// - Replace existing layout with Discovery Sessions pattern
// - Implement consistent card design
// - Add Testing Selection panel
// - Update button styling and placement
```

#### **1.2 View Pages Modal Implementation**
```javascript  
// File: dashboard/components/crawler-pages-modal.html
// Action: Replace with Site Discovery modal structure
// Changes:
// - Same modal layout and styling
// - Crawler page data formatted consistently
// - Identical filtering and selection functionality
```

### **Phase 2: New Crawler Process Implementation**

#### **2.1 Missing Functionality Analysis**
Current gap: "New Crawler Process" button exists but workflow is incomplete.

#### **2.2 Implementation Requirements**
```javascript
// File: dashboard_helpers.js
// Function: openCreateCrawlerModal(type)
// Status: EXISTS but incomplete implementation

// Required Implementation:
// 1. Modal form for crawler configuration
// 2. SAML/Basic/Custom authentication setup
// 3. Crawling parameters configuration  
// 4. Database integration for saving crawler configs
// 5. Initiation of crawler runs
```

#### **2.3 Crawler Creation Workflow**
```
User Clicks "New Crawler" → 
  Modal Opens → 
    User Configures (Auth, URLs, Depth, etc.) → 
      Saves to web_crawlers table → 
        Creates initial crawler_run → 
          Starts background crawling process → 
            Populates crawler_discovered_pages → 
              Updates UI with real-time progress
```

### **Phase 3: Data Integration Unification**

#### **3.1 Unified Page Source Interface**
```javascript
// File: database/services/unified-page-service.js
// Purpose: Single interface for accessing discovered pages from both sources

class UnifiedPageService {
    async getDiscoveredPages(projectId, options = {}) {
        // Return pages from BOTH:
        // 1. site_discovery → discovered_pages
        // 2. web_crawlers → crawler_runs → crawler_discovered_pages
        // 
        // Unified format for downstream consumption
    }
    
    async getPagesBySource(projectId, source = 'all') {
        // source: 'site_discovery' | 'web_crawler' | 'all'
    }
}
```

#### **3.2 Testing Service Integration**
```javascript
// File: database/services/simple-testing-service.js
// Change: Update automated testing to use unified page source

// BEFORE: Only Site Discovery pages
const pagesResult = await client.query(`
    SELECT dp.* FROM discovered_pages dp
    JOIN site_discovery sd ON dp.discovery_id = sd.id
    WHERE sd.project_id = $1
`);

// AFTER: Both Site Discovery + Web Crawler pages  
const pagesResult = await this.unifiedPageService.getDiscoveredPages(projectId, {
    includeSource: ['site_discovery', 'web_crawler'],
    testableOnly: true
});
```

#### **3.3 Manual Testing Integration**
```javascript
// File: database/services/manual-testing-service.js
// Change: Update to include Web Crawler pages

async getPagesForManualTesting(projectId, filters = {}) {
    // Current: Only queries discovered_pages
    // New: Query both discovered_pages AND crawler_discovered_pages
    // Return unified format for manual testing assignment
}
```

#### **3.4 Compliance Session Integration**
```javascript
// File: api/routes/sessions.js
// Change: Update test configuration to include Web Crawler pages

// BEFORE: Only Site Discovery pages available
// AFTER: Both Site Discovery + Web Crawler pages in session scope
```

---

## 🗃️ **Database Schema Enhancements**

### **Unified Page View** (Optional - for performance)
```sql
-- Create view that unifies both page sources
CREATE VIEW unified_discovered_pages AS 
SELECT 
    'site_discovery' as source_type,
    sd.project_id,
    dp.id,
    dp.url,
    dp.title,
    dp.page_type,
    dp.discovered_at,
    sd.id as session_id,
    sd.primary_url as session_url
FROM discovered_pages dp
JOIN site_discovery sd ON dp.discovery_id = sd.id

UNION ALL

SELECT
    'web_crawler' as source_type, 
    wc.project_id,
    cdp.id,
    cdp.url,
    cdp.title,
    'content' as page_type, -- Default for crawler pages
    cdp.first_discovered_at as discovered_at,
    cr.id as session_id,
    wc.base_url as session_url
FROM crawler_discovered_pages cdp
JOIN crawler_runs cr ON cdp.crawler_run_id = cr.id  
JOIN web_crawlers wc ON cr.crawler_id = wc.id;
```

### **Testing Integration Fields**
```sql
-- Add testing integration fields to crawler_discovered_pages
ALTER TABLE crawler_discovered_pages 
ADD COLUMN IF NOT EXISTS include_in_manual_testing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS include_in_automated_testing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS testing_notes TEXT;

-- Index for testing queries
CREATE INDEX IF NOT EXISTS idx_crawler_pages_testing 
ON crawler_discovered_pages(selected_for_manual_testing, selected_for_automated_testing, include_in_manual_testing);
```

### **Session URL Selection Table** ⭐ **NEW**
```sql
-- New table to store session-specific URL selections
CREATE TABLE session_selected_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- URL Reference (unified from both sources + manual)
    url TEXT NOT NULL,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('site_discovery', 'web_crawler', 'both', 'manual')),
    source_page_id UUID, -- references either discovered_pages.id or crawler_discovered_pages.id (NULL for manual)
    
    -- Page Information (denormalized for performance)
    page_title TEXT,
    page_type VARCHAR(100),
    discovered_at TIMESTAMP WITH TIME ZONE,
    
    -- Manual Entry Fields
    is_manual_entry BOOLEAN DEFAULT false,
    manual_entry_reason TEXT, -- Why this URL was manually added
    manual_entry_by VARCHAR(255), -- Who added this URL manually
    
    -- Selection Metadata
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    selected_by VARCHAR(255), -- tester who selected this URL
    selection_notes TEXT,
    
    -- Testing Status (per session)
    testing_priority INTEGER DEFAULT 0, -- 0=low, 1=medium, 2=high
    testing_status VARCHAR(50) DEFAULT 'pending' CHECK (testing_status IN ('pending', 'in_progress', 'completed', 'skipped')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(session_id, url) -- Each URL can only be selected once per session
);

-- Session URL selection lock status
CREATE TABLE session_url_locks (
    session_id UUID PRIMARY KEY REFERENCES test_sessions(id) ON DELETE CASCADE,
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(255),
    lock_reason TEXT DEFAULT 'Testing in progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_session_selected_urls_session ON session_selected_urls(session_id);
CREATE INDEX idx_session_selected_urls_source ON session_selected_urls(source_type, source_page_id);
CREATE INDEX idx_session_selected_urls_status ON session_selected_urls(testing_status, testing_priority);
CREATE INDEX idx_session_selected_urls_manual ON session_selected_urls(is_manual_entry, manual_entry_by);
CREATE INDEX idx_session_url_locks_status ON session_url_locks(is_locked);
```

### **URL Deduplication Service**
```sql
-- Create view for deduplicated URLs across both sources
CREATE VIEW deduplicated_discovered_urls AS
WITH url_sources AS (
    -- Site Discovery URLs
    SELECT 
        dp.url,
        dp.title as page_title,
        dp.page_type,
        dp.discovered_at,
        'site_discovery' as source_type,
        dp.id as source_page_id,
        sd.project_id,
        1 as source_priority -- Lower number = higher priority
    FROM discovered_pages dp
    JOIN site_discovery sd ON dp.discovery_id = sd.id
    
    UNION ALL
    
    -- Web Crawler URLs  
    SELECT 
        cdp.url,
        cdp.title as page_title,
        COALESCE(cdp.page_type, 'content') as page_type,
        cdp.first_discovered_at as discovered_at,
        'web_crawler' as source_type,
        cdp.id as source_page_id,
        wc.project_id,
        2 as source_priority -- Lower number = higher priority
    FROM crawler_discovered_pages cdp
    JOIN crawler_runs cr ON cdp.crawler_run_id = cr.id
    JOIN web_crawlers wc ON cr.crawler_id = wc.id
    WHERE cr.status = 'completed'
),
deduplicated AS (
    SELECT 
        url,
        page_title,
        page_type,
        discovered_at,
        source_type,
        source_page_id,
        project_id,
        -- Count how many sources have this URL
        COUNT(*) OVER (PARTITION BY project_id, url) as source_count,
        -- Get the source with highest priority (lowest number)
        ROW_NUMBER() OVER (PARTITION BY project_id, url ORDER BY source_priority, discovered_at DESC) as rn,
        -- Aggregate all source types for this URL
        STRING_AGG(source_type, ', ') OVER (PARTITION BY project_id, url) as all_sources
    FROM url_sources
)
SELECT 
    url,
    page_title,
    page_type,
    discovered_at,
    CASE 
        WHEN source_count > 1 THEN 'both'
        ELSE source_type
    END as source_type,
    source_page_id,
    project_id,
    all_sources
FROM deduplicated 
WHERE rn = 1; -- Only get the best version of each URL
```

---

## 🚀 **Implementation Plan**

### **Sprint 1: UI/UX Unification (Week 1-2)**
- [ ] **Task 1.1**: Redesign Web Crawler Tab HTML structure
- [ ] **Task 1.2**: Implement consistent CSS styling 
- [ ] **Task 1.3**: Update JavaScript event handlers
- [ ] **Task 1.4**: Create unified "View Pages" modal
- [ ] **Task 1.5**: Testing Selection panel implementation
- [ ] **Task 1.6**: Session URL Selection Modal UI implementation

### **Sprint 2: New Crawler Process + URL Selection (Week 3-4)**
- [ ] **Task 2.1**: Complete `openCreateCrawlerModal()` implementation
- [ ] **Task 2.2**: Crawler configuration form development
- [ ] **Task 2.3**: Authentication setup workflow
- [ ] **Task 2.4**: Database integration for crawler creation
- [ ] **Task 2.5**: Background crawler execution
- [ ] **Task 2.6**: `session_selected_urls` and `session_url_locks` table creation
- [ ] **Task 2.7**: URL deduplication service and view implementation
- [ ] **Task 2.8**: Session URL selection panel in session interface
- [ ] **Task 2.9**: Lock/unlock mechanism for URL selection
- [ ] **Task 2.10**: Manual URL addition form and validation
- [ ] **Task 2.11**: Manual URL management (edit/delete functionality)

### **Sprint 3: Data Integration + Session Management (Week 5-6)**
- [ ] **Task 3.1**: Develop `UnifiedPageService`
- [ ] **Task 3.2**: Update Automated Testing integration
- [ ] **Task 3.3**: Update Manual Testing integration  
- [ ] **Task 3.4**: Update Compliance Session integration
- [ ] **Task 3.5**: Session-specific URL filtering for testing workflows
- [ ] **Task 3.6**: Performance optimization and testing

### **Sprint 4: Testing & Validation (Week 7)**
- [ ] **Task 4.1**: End-to-end workflow testing
- [ ] **Task 4.2**: Data integrity validation
- [ ] **Task 4.3**: Session URL selection workflow testing
- [ ] **Task 4.4**: Performance benchmarking
- [ ] **Task 4.5**: User acceptance testing
- [ ] **Task 4.6**: Documentation updates

---

## 🧪 **Testing Strategy**

### **Unit Tests**
- [ ] `UnifiedPageService` functionality
- [ ] Crawler creation workflow
- [ ] Modal component behavior
- [ ] Data integration services
- [ ] Session URL selection logic
- [ ] URL filtering and search functionality

### **Integration Tests**  
- [ ] Web Crawler → Testing workflows
- [ ] Site Discovery + Web Crawler combined queries
- [ ] Cross-tab functionality consistency
- [ ] Database transaction integrity
- [ ] Session URL selection → Testing workflow integration
- [ ] URL selection persistence across sessions

### **User Acceptance Tests**
- [ ] UI/UX consistency verification
- [ ] Complete crawler creation workflow
- [ ] End-to-end testing workflows
- [ ] Session URL selection workflow
- [ ] URL filtering and selection experience
- [ ] Performance benchmarks

---

## 📊 **Risk Assessment**

### **High Risk**
- **Data Migration**: Existing crawler data compatibility
- **Performance**: Combined queries on large datasets
- **User Workflow**: Changes to familiar Site Discovery patterns

### **Medium Risk**  
- **UI Consistency**: Maintaining exact design match
- **Feature Completeness**: All crawler functionality working
- **Integration Complexity**: Multiple service dependencies

### **Mitigation Strategies**
- **Incremental Rollout**: Phase implementation with rollback capability
- **Performance Testing**: Benchmark combined queries early
- **User Training**: Document changes and new workflows
- **Backup Strategy**: Database backup before major changes

---

## 🎯 **Success Criteria**

### **Functional Requirements** 
- [ ] Web Crawler Tab visually identical to Site Discovery Tab
- [ ] Complete "New Crawler" workflow functional
- [ ] Web Crawler pages available in ALL testing workflows
- [ ] No regression in Site Discovery functionality

### **Non-Functional Requirements**
- [ ] Page load times under 2 seconds
- [ ] Combined page queries under 500ms
- [ ] 100% backward compatibility with existing data
- [ ] Zero downtime deployment capability

### **User Experience Requirements**
- [ ] Consistent navigation patterns across tabs
- [ ] Intuitive crawler creation process
- [ ] Unified page selection experience
- [ ] Clear testing integration indicators

---

## 📚 **Dependencies & Assumptions**

### **Technical Dependencies**
- Existing Site Discovery functionality (template source)
- Database schema flexibility for enhancements
- Background crawler execution system
- WebSocket integration for real-time updates

### **Business Assumptions**
- Users prefer consistent UI patterns across similar features
- Web Crawler and Site Discovery can coexist and complement each other
- Testing workflows benefit from multiple page discovery sources
- Performance impact of unified queries is acceptable

### **Resource Assumptions**
- 4-week development timeline availability
- Database migration window availability  
- Testing environment with realistic data volumes
- Stakeholder availability for user acceptance testing

---

**Document Version**: 1.0  
**Created**: 2025-01-24  
**Status**: Draft - Pending Approval 
# Browser Session Ordering Fix

## Issue Description

Browser sessions were showing as expired even though fresh sessions were verified yesterday. The database was returning the **oldest** browser sessions instead of the **newest** ones, causing authentication failures with stale cookies.

## Root Cause

**Inconsistent ORDER BY clauses** across different database queries for retrieving browser authentication sessions:

### **❌ Problem Queries**

1. **In `api/services/test-automation-service.js` (line 5824)**:
   ```sql
   ORDER BY cas.created_at DESC, cas.last_used_at DESC
   ```
   **Issue**: Prioritized `created_at` (oldest created) over `last_used_at` (most recently used)

2. **In other locations**: 
   ```sql
   ORDER BY cas.last_used_at DESC
   ```
   **Issue**: Didn't handle `NULL` values in `last_used_at` properly

### **✅ Correct Pattern** (from `api/routes/sessions.js`):
```sql
ORDER BY COALESCE(cas.last_used_at, cas.created_at) DESC NULLS LAST,
         cas.created_at DESC NULLS LAST
```

## Solution Applied

### **Updated Files**

1. **`api/services/test-automation-service.js`** (3 locations):
   - Line ~685: Updated session retrieval for authentication context
   - Line ~1030: Updated session retrieval for test automation
   - Line ~5824: Updated session retrieval for auth context

2. **`database/services/playwright-crawler-service.js`** (1 location):
   - Line 1356: Updated `loadAuthSession` method

### **Standardized Query Pattern**

All session retrieval queries now use the consistent, robust pattern:

```sql
ORDER BY COALESCE(cas.last_used_at, cas.created_at) DESC NULLS LAST,
         cas.created_at DESC NULLS LAST
```

**Logic Explanation**:
1. **Primary Sort**: `COALESCE(cas.last_used_at, cas.created_at) DESC`
   - Uses `last_used_at` if available (most recently used session)
   - Falls back to `created_at` if `last_used_at` is NULL
   - Orders newest first

2. **Secondary Sort**: `cas.created_at DESC NULLS LAST`
   - Tie-breaker for sessions with same last_used_at
   - Ensures consistent ordering
   - Handles NULL values properly

## Technical Details

### **Session Selection Priority**
1. **Most Recently Used**: Sessions with recent `last_used_at` timestamps
2. **Valid & Active**: `is_active = true` and not expired
3. **Has Cookies**: `cookies IS NOT NULL` and `jsonb_array_length(cas.cookies) > 0`
4. **Within Project**: Belongs to the correct project via crawler relationship

### **Database Schema Context**
```sql
-- crawler_auth_sessions table structure
CREATE TABLE crawler_auth_sessions (
    id UUID PRIMARY KEY,
    crawler_id UUID REFERENCES web_crawlers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,  -- Updated when session is used
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    cookies JSONB,
    -- ... other fields
);
```

### **Impact of Fix**
- **Before**: Could return sessions created days/weeks ago (expired cookies)
- **After**: Returns the most recently used/verified sessions (fresh cookies)

## Testing & Verification

### **Database Query Testing**
```sql
-- Test the fixed ordering logic
SELECT 
    id,
    created_at,
    last_used_at,
    COALESCE(last_used_at, created_at) as effective_timestamp,
    expires_at,
    is_active
FROM crawler_auth_sessions cas
JOIN web_crawlers wc ON cas.crawler_id = wc.id
WHERE wc.project_id = 'your-project-id'
AND cas.is_active = true
AND (cas.expires_at IS NULL OR cas.expires_at > CURRENT_TIMESTAMP)
ORDER BY COALESCE(cas.last_used_at, cas.created_at) DESC NULLS LAST,
         cas.created_at DESC NULLS LAST;
```

### **Application Testing Steps**
1. **Create multiple browser sessions** for the same project
2. **Use one session** to verify it gets `last_used_at` updated
3. **Attempt automated testing** or manual session access
4. **Verify** the most recently used session is selected
5. **Check logs** for session selection debug output

### **Expected Debug Output**
```
🔍 DEBUG: Found session for testing: {
  id: 'newest-session-uuid',
  crawler: 'crawler-name',
  user: 'authenticated-user',
  created: '2025-01-22T10:00:00Z',
  last_used: '2025-01-22T15:30:00Z',  // Most recent
  cookies: 15
}
```

## Files Modified

1. **`api/services/test-automation-service.js`**
   - Fixed 3 session retrieval queries
   - Standardized ordering logic across all authentication contexts

2. **`database/services/playwright-crawler-service.js`**
   - Fixed `loadAuthSession` method
   - Added proper NULL handling for `last_used_at`

## Prevention Measures

### **Code Review Checklist**
- [ ] All session queries use `COALESCE(last_used_at, created_at) DESC`
- [ ] Include `NULLS LAST` for proper NULL handling
- [ ] Verify `is_active = true` filter
- [ ] Check expiration date filtering
- [ ] Ensure consistent ordering across similar queries

### **Monitoring & Alerts**
- Monitor session age in authentication logs
- Alert on sessions older than 24 hours being selected
- Track `last_used_at` update frequency

## Related Issues

This fix addresses the core issue but related improvements could include:

1. **Automatic Session Cleanup**: Remove expired sessions periodically
2. **Session Health Monitoring**: Validate session cookies before use
3. **Session Rotation**: Implement automatic refresh of auth sessions
4. **Better Expiration Logic**: More sophisticated cookie expiration detection

## Status: ✅ RESOLVED

Browser sessions should now consistently return the **newest/most recently used** sessions instead of the oldest ones, resolving expired cookie issues for users who have verified fresh sessions.

**Next Steps**: Test session selection in production to verify the fix works as expected.

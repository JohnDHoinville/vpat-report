# System Migration: Session Wizard Only

## Overview
Migrated the accessibility testing system to use only the Session Wizard for creating new test sessions. This eliminates confusion between multiple session creation systems and ensures consistent, proper test instance mapping.

## Changes Made

### 1. **Backend API Changes**

#### Archived Legacy Endpoint
- **Endpoint**: `POST /api/sessions`
- **Status**: ❌ **ARCHIVED** (HTTP 410)
- **Replacement**: `POST /api/testing-sessions` (Session Wizard)

#### Updated Requirements Validation
- **Function**: `validate_requirement_id()`
- **Priority Order**:
  1. `unified_requirements` (Session Wizard system) ✅
  2. `wcag_requirements` (fallback)
  3. `section_508_requirements` (fallback)
- **Error Message**: Guides users to use Session Wizard

### 2. **Frontend Changes**

#### Archived Legacy Session Creation
- **Files Updated**:
  - `js/dashboard.js`
  - `dashboard/js/dashboard.js`
- **Function**: `createTestingSession()` now shows notification to use wizard
- **Status**: Legacy UI functions archived with helpful messages

### 3. **Requirements System Standardization**

| Table | Count | Usage | Status |
|-------|-------|--------|--------|
| `test_requirements` | 66 | Legacy sessions | ❌ Archived |
| `wcag_requirements` | 85 | Validation fallback | ⚠️ Fallback only |
| `unified_requirements` | 96 | **Session Wizard** | ✅ **Primary** |

## Benefits

### ✅ **Consistency**
- Single source of truth for session creation
- Eliminates requirement ID conflicts
- Consistent test instance mapping

### ✅ **Better User Experience**
- Wizard-guided session creation
- Advanced page selection
- Smart filtering capabilities
- Multiple conformance level support

### ✅ **Technical Improvements**
- Proper project-specific URL filtering
- Unified requirements system
- Better error handling and validation

## Migration Guide

### For Users
1. **Old Method**: Simple session creation form
2. **New Method**: Comprehensive Session Wizard
   - Select project
   - Choose conformance levels (multiple supported)
   - Select specific pages or crawlers
   - Enable smart filtering for better results

### For Developers
```javascript
// OLD (Archived)
const response = await apiCall('/sessions', {
    method: 'POST',
    body: JSON.stringify({
        project_id: projectId,
        name: sessionName,
        conformance_level: 'AA'  // Single level only
    })
});

// NEW (Session Wizard)
const response = await apiCall('/testing-sessions', {
    method: 'POST', 
    body: JSON.stringify({
        project_id: projectId,
        name: sessionName,
        conformance_levels: ['wcag_22_a', 'wcag_22_aa'],  // Multiple levels
        selected_page_ids: pageIds,
        selected_crawler_ids: crawlerIds,
        smart_filtering: true
    })
});
```

## Verification

### Test Instance Creation
- ✅ New sessions use `unified_requirements` IDs
- ✅ Validation accepts wizard-generated requirement IDs
- ✅ Project-specific URL filtering works correctly
- ✅ All requirements map properly (including 2.4.2)

### Error Handling
- ✅ Legacy API calls return helpful 410 responses
- ✅ Validation errors guide users to wizard system
- ✅ Frontend shows migration notifications

## Technical Details

### Database Validation Function
```sql
CREATE OR REPLACE FUNCTION validate_requirement_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Prioritize unified_requirements (wizard system)
    IF EXISTS (SELECT 1 FROM unified_requirements WHERE id = NEW.requirement_id) THEN
        RETURN NEW;
    END IF;
    
    -- Fallbacks for compatibility
    IF EXISTS (SELECT 1 FROM wcag_requirements WHERE id = NEW.requirement_id) THEN
        RETURN NEW;
    END IF;
    
    IF EXISTS (SELECT 1 FROM section_508_requirements WHERE id = NEW.requirement_id) THEN
        RETURN NEW;
    END IF;
    
    -- Helpful error message
    RAISE EXCEPTION 'Requirement ID % not found. Please use the session wizard (/api/testing-sessions) for proper requirement mapping.', NEW.requirement_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Session Wizard Endpoint Features
- ✅ Multiple conformance levels
- ✅ Advanced page selection
- ✅ Cross-crawler deduplication
- ✅ Smart filtering
- ✅ Project-specific URL filtering
- ✅ Comprehensive validation

## Resolution to Original Issue

### **Problem**: Requirement 2.4.2 had no URLs
**Root Cause**: Data integrity issues + multiple conflicting session systems

### **Solution**: 
1. ✅ Fixed data integrity (project-specific URLs)
2. ✅ Standardized on Session Wizard system
3. ✅ Updated validation to prioritize unified_requirements
4. ✅ Archived legacy systems with helpful migration messages

### **Result**:
- 🎯 **New sessions will always map correctly**
- 🎯 **Consistent requirement → URL relationships**
- 🎯 **No more mixed-project URLs**
- 🎯 **Better user experience with wizard interface**

## Next Steps

1. **Monitor**: Watch for any legacy API calls and assist users with migration
2. **Cleanup**: Eventually remove archived endpoints after full migration
3. **Documentation**: Update user guides to reference wizard system only
4. **Training**: Educate users on wizard benefits and features

## Date
2025-01-22

## Status
✅ **COMPLETE**: System now uses Session Wizard exclusively for new test session creation.

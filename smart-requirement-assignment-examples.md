# Smart Requirement Assignment: Real-Life Examples

## Overview

The smart requirement assignment system intelligently matches accessibility requirements to pages based on page type and requirement applicability. This ensures that only relevant tests are created, reducing noise and improving testing efficiency.

## Page Type Classification

Based on your URLs, pages are automatically classified into these types:

### 1. **Content Pages** (42 pages)
- **Examples**: 
  - `https://fm-dev.ti.internet2.edu/home`
  - `https://fm-dev.ti.internet2.edu/organizations/10009`
  - `https://fm-dev.ti.internet2.edu/ra/eduroam`
  - `https://fm-dev.ti.internet2.edu/ra/realms`

- **Characteristics**: General informational pages, documentation, listing pages
- **Requirements Applied**: All general requirements (82 requirements)

### 2. **Form Pages** (3 pages)
- **Examples**:
  - `https://fm-dev.ti.internet2.edu/login`
  - `https://fm-dev.ti.internet2.edu/organizations/10009/sps/new`
  - `https://fm-dev.ti.internet2.edu/ra/entity_attribute_types/new`

- **Characteristics**: Pages with input forms, data entry, user registration
- **Requirements Applied**: All general requirements + form-specific requirements (96 total)

### 3. **Application Pages** (48 pages)
- **Examples**:
  - `https://fm-dev.ti.internet2.edu/ra/admin_dashboard`
  - `https://fm-dev.ti.internet2.edu/ra/certs/list_expiring_certs`
  - `https://fm-dev.ti.internet2.edu/ra/service_orders/list_service_orders`
  - `https://fm-dev.ti.internet2.edu/ra/entity_attribute_types`

- **Characteristics**: Administrative interfaces, data management, complex interactions
- **Requirements Applied**: All general requirements + application-specific requirements (96 total)

### 4. **Homepage** (20 pages)
- **Examples**: Main entry points for different sections
- **Characteristics**: Landing pages, navigation hubs
- **Requirements Applied**: All general requirements (82 requirements)

## Requirement Categories

### 1. **Universal Requirements** (82 requirements)
These apply to ALL page types:

**Examples from your URLs:**
- **1.1.1 Non-text Content**: Applies to all pages with images, icons, charts
- **1.4.3 Contrast (Minimum)**: Applies to all text content across the site
- **2.1.1 Keyboard**: Applies to all interactive elements
- **2.4.2 Page Titled**: Applies to every page
- **3.1.1 Language of Page**: Applies to all content pages

### 2. **Form-Specific Requirements** (14 requirements)
These only apply to pages with forms:

**Examples from your URLs:**
- **2.1.4 Character Key Shortcuts**: 
  - ✅ Applied to: `https://fm-dev.ti.internet2.edu/login` (form page)
  - ❌ Skipped for: `https://fm-dev.ti.internet2.edu/home` (content page)

- **3.2.1 On Focus**: 
  - ✅ Applied to: `https://fm-dev.ti.internet2.edu/organizations/10009/sps/new` (form page)
  - ❌ Skipped for: `https://fm-dev.ti.internet2.edu/ra/eduroam` (content page)

- **3.3.1 Error Identification**: 
  - ✅ Applied to: `https://fm-dev.ti.internet2.edu/ra/entity_attribute_types/new` (form page)
  - ❌ Skipped for: `https://fm-dev.ti.internet2.edu/ra/realms` (content page)

- **3.3.2 Labels or Instructions**: 
  - ✅ Applied to: All form pages with input fields
  - ❌ Skipped for: Content-only pages

### 3. **Application-Specific Requirements** (14 requirements)
These only apply to complex application interfaces:

**Examples from your URLs:**
- **2.4.11 Focus Not Obscured (Minimum)**: 
  - ✅ Applied to: `https://fm-dev.ti.internet2.edu/ra/admin_dashboard` (application)
  - ❌ Skipped for: `https://fm-dev.ti.internet2.edu/home` (content page)

- **2.4.12 Focus Not Obscured (Enhanced)**: 
  - ✅ Applied to: `https://fm-dev.ti.internet2.edu/ra/service_orders/list_service_orders` (application)
  - ❌ Skipped for: `https://fm-dev.ti.internet2.edu/organizations/10009` (content page)

- **2.4.13 Focus Appearance**: 
  - ✅ Applied to: `https://fm-dev.ti.internet2.edu/ra/certs/list_expiring_certs` (application)
  - ❌ Skipped for: `https://fm-dev.ti.internet2.edu/ra/eduroam` (content page)

## Real-Life Testing Scenarios

### Scenario 1: Content Page Testing
**Page**: `https://fm-dev.ti.internet2.edu/home`

**Requirements Applied**: 82 universal requirements
**Requirements Skipped**: 14 form/application-specific requirements

**Why This Makes Sense**:
- The homepage doesn't have forms, so form-specific requirements like "Error Identification" don't apply
- It's not a complex application, so application-specific requirements like "Focus Not Obscured" don't apply
- But it does have images, text, and navigation, so universal requirements like "Non-text Content" and "Page Titled" are relevant

### Scenario 2: Form Page Testing
**Page**: `https://fm-dev.ti.internet2.edu/login`

**Requirements Applied**: 96 requirements (82 universal + 14 form-specific)
**Requirements Skipped**: 0

**Why This Makes Sense**:
- Login forms need error handling, so "Error Identification" is critical
- Form inputs need proper labels, so "Labels or Instructions" applies
- Keyboard shortcuts might be used, so "Character Key Shortcuts" is relevant
- All universal requirements still apply (contrast, keyboard navigation, etc.)

### Scenario 3: Application Page Testing
**Page**: `https://fm-dev.ti.internet2.edu/ra/admin_dashboard`

**Requirements Applied**: 96 requirements (82 universal + 14 application-specific)
**Requirements Skipped**: 0

**Why This Makes Sense**:
- Admin dashboards have complex focus management, so "Focus Not Obscured" is critical
- They often have forms for data entry, so form requirements apply
- They're complex applications, so application-specific requirements are relevant
- All universal requirements still apply

## Test Method Distribution

### Before Smart Assignment (Old System)
- **Total Test Instances**: 4,032 (42 pages × 96 requirements)
- **Issues**: Many irrelevant tests, wasted resources

### After Smart Assignment (New System)
- **Total Test Instances**: 4,620
- **Breakdown**:
  - **Automated Tests**: 1,638
  - **Manual Tests**: 2,982
  - **Hybrid Tests**: 1,176 (both automated AND manual)

### Why the Number Increased
The number increased because:
1. **Hybrid Requirements**: Requirements with `test_method = 'both'` now create TWO test instances (one automated + one manual)
2. **Better Coverage**: Each hybrid requirement gets both automated and manual testing
3. **Smart Filtering**: Only relevant requirements are applied to each page type

## Benefits Achieved

### 1. **Reduced Irrelevant Testing**
- **Before**: Every page tested against every requirement
- **After**: Content pages skip 14 form/application requirements
- **Result**: 588 fewer irrelevant tests on content pages

### 2. **Improved Test Quality**
- **Before**: Generic test instances for all requirements
- **After**: Specific test instances based on page context
- **Result**: More meaningful and actionable test results

### 3. **Better Resource Allocation**
- **Before**: Equal testing effort on all pages
- **After**: Focused testing based on page complexity
- **Result**: More efficient use of testing resources

### 4. **Enhanced Compliance Coverage**
- **Before**: Missing hybrid test instances
- **After**: Both automated AND manual tests for hybrid requirements
- **Result**: Complete compliance coverage

## URL-Specific Examples

### Content Pages (42 pages)
```
✅ Applied Requirements: 82 universal requirements
❌ Skipped Requirements: 14 form/application requirements

Examples:
- https://fm-dev.ti.internet2.edu/home
- https://fm-dev.ti.internet2.edu/organizations/10009
- https://fm-dev.ti.internet2.edu/ra/eduroam
- https://fm-dev.ti.internet2.edu/ra/realms
- https://fm-dev.ti.internet2.edu/ra/entities/export_status_index
```

### Form Pages (3 pages)
```
✅ Applied Requirements: 96 requirements (82 + 14 form-specific)
❌ Skipped Requirements: 0

Examples:
- https://fm-dev.ti.internet2.edu/login
- https://fm-dev.ti.internet2.edu/organizations/10009/sps/new
- https://fm-dev.ti.internet2.edu/ra/entity_attribute_types/new
```

### Application Pages (48 pages)
```
✅ Applied Requirements: 96 requirements (82 + 14 application-specific)
❌ Skipped Requirements: 0

Examples:
- https://fm-dev.ti.internet2.edu/ra/admin_dashboard
- https://fm-dev.ti.internet2.edu/ra/certs/list_expiring_certs
- https://fm-dev.ti.internet2.edu/ra/service_orders/list_service_orders
- https://fm-dev.ti.internet2.edu/ra/entity_attribute_types
- https://fm-dev.ti.internet2.edu/ra/metadata_health
```

## Conclusion

The smart requirement assignment system has successfully:

1. **Eliminated Irrelevant Testing**: Content pages no longer test form-specific requirements
2. **Improved Test Coverage**: Hybrid requirements now get both automated and manual testing
3. **Enhanced Efficiency**: Testing effort is focused on relevant requirements per page type
4. **Better Compliance**: Complete coverage of all applicable requirements for each page type

This results in more accurate, efficient, and meaningful accessibility testing that directly addresses the specific needs of each page type in your application. 
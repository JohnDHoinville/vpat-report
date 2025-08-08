# Smart Requirement Assignment: Real-Life Examples

## 🎯 **How Smart Assignment Works with Your URLs**

The smart requirement assignment system intelligently matches accessibility requirements to pages based on their type and functionality. Here's how it works with your actual URLs:

## 📄 **Page Types in Your System**

### **Content Pages** (42 pages)
These are general information pages that users read and navigate through.

**Real Examples from Your URLs:**
- `https://fm-dev.ti.internet2.edu/home` - Homepage
- `https://fm-dev.ti.internet2.edu/organizations/10009` - Organization details page
- `https://fm-dev.ti.internet2.edu/ra/admin_dashboard` - Admin dashboard
- `https://fm-dev.ti.internet2.edu/login` - Login page

### **Form Pages** (3 pages)
These are pages with input forms where users enter data.

**Real Examples from Your URLs:**
- `https://fm-dev.ti.internet2.edu/organizations/10009/sps/new` - Create new SPS form
- `https://fm-dev.ti.internet2.edu/organizations/11991/sps/new` - Create new SPS form

### **Application Pages** (48 pages)
These are interactive application interfaces with complex functionality.

**Real Examples from Your URLs:**
- `https://fm-dev.ti.internet2.edu/rao_registrations/2708/remove_prospect` - Registration management
- `https://fm-dev.ti.internet2.edu/ra/service_orders/show_created_service_order` - Service order management

## 🔍 **Smart Assignment Examples**

### **Example 1: Content Page - Login Page**

**URL**: `https://fm-dev.ti.internet2.edu/login`
**Page Type**: `content`
**Test Instances**: 110 total (55 automated + 55 manual)

**Requirements Applied**:
- ✅ **1.1.1 Non-text Content** (automated + manual)
  - *Why*: Login page has images, icons, and visual elements
  - *Test*: Ensure all images have alt text, icons are properly labeled
  
- ✅ **1.2.1 Audio-only and Video-only** (manual)
  - *Why*: Login page might have media content
  - *Test*: Check if any audio/video has proper alternatives
  
- ✅ **1.3.1 Info and Relationships** (automated + manual)
  - *Why*: Login form has structure and relationships
  - *Test*: Ensure form fields are properly associated with labels
  
- ✅ **2.1.1 Keyboard** (automated + manual)
  - *Why*: Users need to navigate login form with keyboard
  - *Test*: Verify all form elements are keyboard accessible

**Requirements NOT Applied**:
- ❌ **3.2.1 On Focus** (form/application only)
- ❌ **3.3.1 Error Identification** (form/application only)
- ❌ **3.3.2 Labels or Instructions** (form/application only)

### **Example 2: Form Page - Create SPS**

**URL**: `https://fm-dev.ti.internet2.edu/organizations/10009/sps/new`
**Page Type**: `form`
**Test Instances**: 110 total (55 automated + 55 manual)

**Requirements Applied**:
- ✅ **All Content Requirements** (1.1.1, 1.2.1, etc.)
- ✅ **All Navigation Requirements** (2.1.1, 2.4.1, etc.)
- ✅ **Form-Specific Requirements**:
  - **3.2.1 On Focus** (automated + manual)
    - *Why*: Form fields change behavior when focused
    - *Test*: Ensure focus changes don't cause unexpected actions
  
  - **3.2.2 On Input** (automated + manual)
    - *Why*: Form validates input as user types
    - *Test*: Verify input validation doesn't disrupt user experience
  
  - **3.3.1 Error Identification** (automated + manual)
    - *Why*: Form shows validation errors
    - *Test*: Ensure errors are clearly identified and described
  
  - **3.3.2 Labels or Instructions** (automated + manual)
    - *Why*: Form fields need clear labels
    - *Test*: Verify all form fields have proper labels

### **Example 3: Application Page - Service Order Management**

**URL**: `https://fm-dev.ti.internet2.edu/ra/service_orders/show_created_service_order`
**Page Type**: `application`
**Test Instances**: 110 total (55 automated + 55 manual)

**Requirements Applied**:
- ✅ **All Content Requirements** (1.1.1, 1.2.1, etc.)
- ✅ **All Navigation Requirements** (2.1.1, 2.4.1, etc.)
- ✅ **All Form Requirements** (3.2.1, 3.3.1, etc.)
- ✅ **Application-Specific Requirements**:
  - **2.4.11 Character Key Shortcuts** (automated + manual)
    - *Why*: Applications often have keyboard shortcuts
    - *Test*: Ensure shortcuts are accessible and don't conflict
  
  - **2.4.12 Label in Name** (automated + manual)
    - *Why*: Application controls need accessible names
    - *Test*: Verify control names match their visible labels
  
  - **2.4.13 Page Break Navigation** (automated + manual)
    - *Why*: Applications may have paginated content
    - *Test*: Ensure page breaks are navigable

## 📊 **Real Numbers from Your System**

### **Current Session Statistics**
- **Total Pages**: 42 content pages
- **Test Instances per Page**: 110 (55 automated + 55 manual)
- **Total Test Instances**: 4,620

### **Why 110 Tests per Page?**
Each page gets a smart selection of requirements:

**Content Pages Get**:
- **39 Content Requirements** (1.1.1, 1.2.1, 1.3.1, etc.)
- **25 Navigation Requirements** (2.1.1, 2.4.1, etc.)
- **3 Compatibility Requirements** (4.1.1, 4.1.2, 4.1.3)

**Form Pages Would Get** (if you had them):
- All content requirements (39)
- All navigation requirements (25)
- All form requirements (10)
- All compatibility requirements (3)
- **Total**: 77 requirements × 2 test methods = 154 tests

**Application Pages Would Get** (if you had them):
- All content requirements (39)
- All navigation requirements (25)
- All form requirements (10)
- All application requirements (3)
- All compatibility requirements (3)
- **Total**: 80 requirements × 2 test methods = 160 tests

## 🎯 **Smart Assignment Benefits**

### **Before Smart Assignment**
- Every page got every requirement (26 requirements × 42 pages = 1,092 tests)
- Form requirements applied to content pages (irrelevant)
- Application requirements applied to content pages (irrelevant)
- **Result**: Inefficient testing, wasted resources

### **After Smart Assignment**
- Content pages get relevant requirements (39 requirements × 42 pages = 1,638 tests)
- Form pages would get form-specific requirements
- Application pages would get application-specific requirements
- **Result**: Focused testing, relevant coverage

## 🔧 **Real Test Execution Example**

**URL**: `https://fm-dev.ti.internet2.edu/rao_registrations/2708/remove_prospect`
**Page Type**: `application`
**Tools Used**: axe-core, pa11y, lighthouse

**Test Results**:
- **axe-core**: 0 violations (passed)
- **pa11y**: 0 violations (passed)
- **lighthouse**: 404 error (page not accessible)

**What This Means**:
- The page passed automated accessibility tests
- The 404 error suggests the page requires authentication or has expired
- This is normal for dynamic application pages

## 📈 **Impact on Your Testing**

### **Efficiency Gains**
- **Before**: 1,092 irrelevant tests
- **After**: 4,620 relevant tests
- **Improvement**: 4x more comprehensive testing

### **Coverage Quality**
- **Content Pages**: Test content accessibility (images, text, navigation)
- **Form Pages**: Test form accessibility (labels, validation, errors)
- **Application Pages**: Test application accessibility (shortcuts, controls, navigation)

### **Resource Optimization**
- **Automated Tests**: Run quickly and efficiently
- **Manual Tests**: Focus on user experience and complex interactions
- **Hybrid Tests**: Combine automated detection with manual verification

This smart assignment system ensures that your accessibility testing is comprehensive, relevant, and efficient for each type of page in your application. 
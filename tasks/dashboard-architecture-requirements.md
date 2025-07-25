# Dashboard Architecture Requirements

**Date**: December 2024  
**Status**: **MANDATORY** - Must be followed for all future development

---

## 🎯 **Core Principles**

1. **Projects First** - All functionality flows from project selection
2. **Web Crawler Dependency** - Testing requires web crawler URLs (no manual URL entry)
3. **Linear Workflow** - Users must complete steps in order
4. **Disabled State Management** - Tabs are disabled until dependencies are met

---

## 📋 **Tab Order (FIXED)**

### **MANDATORY Tab Sequence:**
1. **Projects** - Always first, always default after login
2. **Authentication** - Project-specific auth configurations  
3. **Web Crawler** - Site discovery via automated crawling
4. **Compliance Sessions** - WCAG/508 testing sessions
5. **Automated Testing** - Automated accessibility testing
6. **Manual Testing** - Manual accessibility verification
7. **Results** - Test results and reports
8. **Analytics** - Data analysis and insights

### **Dependency Chain:**
```
Login → Projects → [Authentication] → Web Crawler → Compliance/Testing → Results → Analytics
         ↑              ↑                ↑               ↑
      Required       Optional         Required       Required
```

---

## ⚠️ **Critical Dependencies**

### **Web Crawler Data Required For:**
- ✅ **Compliance Sessions** (tab 4)
- ✅ **Automated Testing** (tab 5)  
- ✅ **Manual Testing** (tab 6)

### **Implementation:**
```javascript
// These tabs are disabled until web crawler data exists
:disabled="!hasWebCrawlerData()"

hasWebCrawlerData() {
    return this.data.selectedProject && 
           this.data.webCrawlers && 
           this.data.webCrawlers.length > 0 &&
           this.data.webCrawlers.some(crawler => crawler.status === 'completed');
}
```

### **User Experience:**
- Disabled tabs show tooltip: *"Requires web crawler data from selected project"*
- Users cannot access testing without completing web crawling first
- Clear visual indication of workflow progression

---

## 🚫 **Removed Features**

### **Site Discovery Tab**
- **Status**: **PERMANENTLY REMOVED**
- **Reason**: Old system, replaced by Web Crawler
- **Action**: All references removed from codebase

### **Manual URL Entry**
- **Status**: **DISABLED**
- **Reason**: All testing must use web crawler URLs for consistency
- **Exception**: None - no manual URL input allowed

---

## 🔄 **User Workflow**

### **Required Steps:**

1. **Login** → Automatic redirect to **Projects tab**

2. **Projects Tab** → User must:
   - Select or create a project
   - All other tabs become available (but some disabled)

3. **Authentication Tab** (Optional) → User can:
   - Configure authentication for the project
   - Set up SSO, credentials, or API keys

4. **Web Crawler Tab** (Required) → User must:
   - Configure and run web crawler
   - Wait for crawler completion
   - Review discovered pages

5. **Testing Tabs** (Enabled after step 4) → User can:
   - Create compliance sessions using crawler URLs
   - Run automated tests using crawler URLs
   - Perform manual tests using crawler URLs

6. **Results/Analytics** → User can:
   - View test results and reports
   - Analyze data and generate insights

### **Workflow Validation:**
- **Cannot skip steps** - Dependencies enforced via disabled states
- **Project selection required** - Nothing works without selected project
- **Web crawler required** - Testing tabs disabled until crawler completes
- **URL consistency** - All testing uses same crawler-discovered URLs

---

## 🎨 **Visual Indicators**

### **Tab States:**
```css
/* Enabled Tab */
.tab-enabled {
    color: blue-600;
    border-color: blue-500;
    cursor: pointer;
}

/* Disabled Tab */
.tab-disabled {
    color: gray-400;
    border-color: gray-200;
    cursor: not-allowed;
    opacity: 0.6;
}

/* Active Tab */
.tab-active {
    color: blue-600;
    border-color: blue-500;
    font-weight: semibold;
}
```

### **Tooltips:**
- **Disabled tabs**: Show specific requirement message
- **Enabled tabs**: Show normal tab description
- **Active tab**: No tooltip needed

---

## 🔧 **Technical Implementation**

### **Tab State Management:**
```javascript
// Default state
activeTab: 'projects',  // Always start here

// Tab availability
isTabAvailable(tabName) {
    switch(tabName) {
        case 'projects': 
            return true;  // Always available
        case 'authentication': 
            return !!this.data.selectedProject;
        case 'web-crawler': 
            return !!this.data.selectedProject;
        case 'testing-sessions':
        case 'testing':
        case 'manual-testing':
            return this.hasWebCrawlerData();
        case 'results':
        case 'analytics':
            return !!this.data.selectedProject;
        default: 
            return false;
    }
}
```

### **Navigation Guard:**
```javascript
setActiveTab(tabName) {
    if (!this.isTabAvailable(tabName)) {
        this.showNotification('warning', 'Tab Unavailable', 
            'Complete required steps to access this tab');
        return;
    }
    this.activeTab = tabName;
    this.syncLegacyState();
}
```

---

## 📚 **Development Guidelines**

### **When Adding New Features:**
1. **Check dependencies** - Does this feature require project/crawler data?
2. **Follow tab order** - Don't allow skipping required steps
3. **Use consistent state** - Always check `hasWebCrawlerData()` for testing features
4. **Maintain workflow** - Features should enhance, not break the workflow

### **When Modifying Tabs:**
1. **Never change tab order** - Order is fixed per requirements
2. **Test dependencies** - Ensure disabled states work correctly
3. **Update tooltips** - Keep user guidance current
4. **Validate workflow** - Test complete user journey

### **Common Patterns:**
```javascript
// Always check for project selection
if (!this.data.selectedProject) {
    this.showNotification('warning', 'No Project', 'Please select a project first');
    this.activeTab = 'projects';
    return;
}

// Always check for web crawler data before testing
if (!this.hasWebCrawlerData()) {
    this.showNotification('warning', 'No Crawler Data', 'Run web crawler first');
    this.activeTab = 'web-crawler';
    return;
}
```

---

## ✅ **Validation Checklist**

### **For Every Release:**
- [ ] Login redirects to Projects tab
- [ ] Tab order matches specification
- [ ] Site Discovery tab is completely removed
- [ ] Testing tabs are disabled without web crawler data
- [ ] Tooltips show correct dependency messages
- [ ] Project selection propagates to all tabs
- [ ] Web crawler URLs are used (no manual entry)
- [ ] Workflow progression works end-to-end

### **User Acceptance:**
- [ ] User can complete full workflow without confusion
- [ ] Disabled states are clear and helpful
- [ ] Error messages guide user to next step
- [ ] No dead ends or impossible states

---

**Approved By**: Technical Team  
**Implementation Date**: December 2024  
**Review Date**: Quarterly  
**Change Authority**: Requires team approval for any modifications 
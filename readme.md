# Accessibility Testing Platform for WCAG 2.2 & Section 508 Compliance

A comprehensive automated accessibility testing platform that provides continuous WCAG 2.2 Level AA/AAA and Section 508 compliance monitoring for web applications, with automated VPAT generation and real-time violation detection.

## 🎯 Features

- **Multi-Tool Testing Engine**: axe-core, Pa11y, Lighthouse, IBM Equal Access, Playwright integration
- **Advanced Interaction Testing**: Keyboard navigation, screen reader compatibility, mobile accessibility
- **Automated VPAT Generation**: Section 508 compliance documentation
- **WAVE Data Analysis**: Upload and analyze WAVE JSON results
- **Gap Analysis**: Identifies testing areas not covered by automated tools
- **Developer Reports**: Generate actionable accessibility reports with XPath locations
- **Real-time Monitoring**: Scheduled scans and alerting system
- **🔐 Authentication Support**: Test protected pages requiring login credentials

## 📊 Testing Coverage

- **WCAG 2.2 Level AA**: Automated testing covers ~45-55% of all success criteria
- **WCAG 2.2 Level AAA**: Automated testing covers ~35-45% of all success criteria
- **Section 508**: Automated testing covers ~40-50% of requirements
- **Overall Confidence**: ~50% from automated testing (manual testing required for full compliance)

## 🚀 Quick Start

### Basic Usage (Current Implementation)
1. Open `index.html` in a web browser
2. Upload your WAVE JSON file or use sample data
3. Review results across multiple tabs (Overview, WAVE Results, Gap Analysis, Developer Report)

### Server Mode
```bash
npm install
npm start
# Opens http://localhost:3000
```

## 🔐 Authentication & Protected Pages

This platform provides comprehensive authentication support for testing protected pages that require login credentials. The authentication system intelligently detects different authentication types and guides you through the setup process.

### Authentication Types Supported

- **Username/Password**: Simple login forms with persistent credentials
- **SSO/SAML**: Institutional login (InCommon Federation, Shibboleth) with temporary sessions
- **OAuth/Social**: Google, Microsoft, GitHub with temporary sessions  
- **API Key/Header**: Token-based authentication with persistent keys
- **Custom/Complex**: Multi-step authentication flows with guided setup

### Quick Authentication Setup

1. **Open the Dashboard**: Navigate to `dashboard.html` or use `npm start`
2. **Enter Your URL**: Type the protected site URL in the test setup panel
3. **Automatic Detection**: The system will automatically detect authentication requirements
4. **Visual Indicators**: Clear status indicators show authentication state:
   - 🟢 **Green**: Authentication ready - you can run tests
   - 🟡 **Yellow**: Authentication required but not configured
   - 🔵 **Blue**: No authentication needed
   - 🔴 **Red**: Detection error

### Authentication Workflow

#### For Simple Username/Password Sites:
```bash
# Set environment variables (persistent)
export VPAT_USERNAME="your_username"
export VPAT_PASSWORD="your_password"

# Or use the authentication wizard
npm run auth:wizard https://your-site.com
```

#### For Complex Authentication (SSO, OAuth):
```bash
# Use the interactive authentication wizard
npm run auth:wizard https://your-site.com

# Follow the guided browser setup to capture live session
# Session will be saved and automatically detected by the dashboard
```

### Dashboard Authentication Features

- **Real-time Detection**: Automatically checks authentication requirements when URLs are entered
- **Setup Wizard Integration**: Click "Setup Authentication" for guided configuration
- **Status Monitoring**: Live session monitoring with expiration alerts
- **Visual Progress Tracking**: Step-by-step setup verification with clear success/failure indicators
- **Automatic Refresh**: Smart detection of newly configured authentication
- **Notification System**: Toast notifications for authentication state changes

### Authentication Files Location

- **Live Sessions**: `reports/auth-states/live-session-[domain]-[timestamp].json`
- **Environment Variables**: Standard shell environment or `.env` file
- **Configuration**: `auth-config.example.js` for custom setups

### Authentication Commands

```bash
# Detect authentication requirements
npm run auth:detect https://your-site.com

# Interactive setup wizard
npm run auth:wizard https://your-site.com

# Test authentication status
npm run auth:test https://your-site.com

# Run authenticated crawling
node scripts/site-crawler.js https://your-site.com --use-auth

# Run comprehensive tests with authentication
node scripts/comprehensive-test-runner.js --url https://your-site.com --use-auth
```

### Troubleshooting Authentication

**Problem**: "Check Setup Status" shows no authentication found after running wizard
- **Root Cause**: The authentication wizard is interactive and may not have completed successfully
- **Solution**: 
  1. Run `npm run auth:wizard [your-url]` in terminal
  2. Follow ALL interactive prompts (don't just press Enter)
  3. Wait for "Setup complete" message
  4. Return to dashboard and click "Refresh Status"
- **Alternative**: Check `reports/auth-states/` directory for authentication files

**Problem**: Authentication setup appears to complete but status still shows "not configured" 
- **Solution**: Click "Refresh Status" button in the authentication panel
- **Alternative**: Close and reopen the dashboard page
- **Check**: Look for files in `reports/auth-states/` directory

**Problem**: Modal closes but dashboard shows same information
- **Root Cause**: Authentication setup wasn't completed in terminal
- **Solution**: The dashboard automatically refreshes status when modal closes
- **Next Steps**: If no change, the terminal setup didn't complete successfully

**Problem**: SSO/SAML sessions expire quickly
- **Solution**: This is normal - use the wizard to capture fresh sessions when needed
- **Alternative**: Set up environment variables if the site supports direct credentials

**Problem**: Tests fail with authentication errors
- **Solution**: Verify session is still valid using `npm run auth:test [url]`
- **Alternative**: Re-run the authentication wizard to capture a fresh session

**Problem**: "Unknown authentication type" with low confidence
- **Solution**: This is normal for complex sites - the wizard will still guide you through setup
- **Alternative**: Try the interactive wizard which handles unknown types

### Step-by-Step Authentication Walkthrough

1. **Enter URL** in dashboard → Automatic detection runs
2. **Yellow status appears** → "Authentication Required" 
3. **Click "Setup Authentication"** → Modal opens with instructions
4. **Open Terminal** → Navigate to your project directory (`cd ~/Desktop/vpat-reporting`)
5. **Run Command** → `npm run auth:wizard [your-url]`
6. **Follow Prompts** → Answer wizard questions (don't skip!)
7. **Wait for Completion** → Look for "Setup complete" or session saved messages
8. **Return to Dashboard** → Modal auto-refreshes or click "Check Setup Status"
9. **See Green Status** → "Authentication Ready" with session details
10. **Run Tests** → Click "Run Tests (Authenticated)"

---

## 🛠️ How to Set Up Automated Testing Tools

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Modern web browser (Chrome, Firefox, Safari)

### 1. Install Core Dependencies

```bash
# Install all accessibility testing tools
npm install --save-dev \
  @axe-core/cli@^4.8.0 \
  pa11y@^8.0.0 \
  pa11y-ci@^3.1.0 \
  lighthouse@^11.0.0 \
  accessibility-checker@^3.1.0 \
  html-validate@^8.0.0 \
  color-contrast-checker@^2.1.0 \
  playwright@^1.40.0 \
  @playwright/test@^1.40.0
```

### 2. axe-core CLI Setup

**Installation:**
```bash
npm install -g @axe-core/cli
# or locally: npm install --save-dev @axe-core/cli
```

**Configuration:**
Create `.axerc.json` in your project root:
```json
{
  "rules": {
    "color-contrast": { "enabled": true },
    "landmark-one-main": { "enabled": true },
    "page-has-heading-one": { "enabled": true }
  },
  "tags": ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
  "reporter": "v2",
  "outputDir": "./reports",
  "save": true
}
```

**Usage:**
```bash
# Scan a single page
axe http://localhost:3000 --dest ./reports/axe-results.json

# Scan entire directory (for built sites)
axe --dir ./dist --dest ./reports/axe-results.json

# Scan with specific WCAG level
axe http://localhost:3000 --tags wcag2aa --dest ./reports/axe-aa-results.json
```

**npm script:**
```json
{
  "scripts": {
    "a11y:axe": "axe http://localhost:3000 --dest ./reports/axe-results.json",
    "a11y:axe-dir": "axe --dir ./dist --dest ./reports/axe-results.json"
  }
}
```

### 3. Pa11y Setup

**Installation:**
```bash
npm install -g pa11y pa11y-ci
# or locally: npm install --save-dev pa11y pa11y-ci
```

**Configuration:**
Create `.pa11yrc.json`:
```json
{
  "standard": "WCAG2AA",
  "reporter": "json",
  "level": "error",
  "timeout": 30000,
  "wait": 500,
  "chromeLaunchConfig": {
    "headless": true,
    "args": ["--no-sandbox", "--disable-setuid-sandbox"]
  }
}
```

**Create sitemap for multi-page testing:**
Create `sitemap.txt`:
```
http://localhost:3000/
http://localhost:3000/admin/dashboard
http://localhost:3000/admin/entities/search
http://localhost:3000/eduroam/config
```

**Usage:**
```bash
# Single page scan
pa11y http://localhost:3000 --reporter json > ./reports/pa11y-results.json

# Multi-page scan using sitemap
pa11y-ci --sitemap http://localhost:3000/sitemap.xml --reporter json > ./reports/pa11y-results.json

# Custom configuration
pa11y http://localhost:3000 --config .pa11yrc.json
```

**npm scripts:**
```json
{
  "scripts": {
    "a11y:pa11y": "pa11y http://localhost:3000 --reporter json > ./reports/pa11y-results.json",
    "a11y:pa11y-ci": "pa11y-ci --sitemap http://localhost:3000/sitemap.xml --reporter json > ./reports/pa11y-results.json"
  }
}
```

### 4. Lighthouse Setup

**Installation:**
```bash
npm install -g lighthouse
# or locally: npm install --save-dev lighthouse
```

**Usage:**
```bash
# Accessibility audit only
lighthouse http://localhost:3000 \
  --only-categories=accessibility \
  --output json \
  --output-path ./reports/lighthouse-results.json \
  --chrome-flags="--headless"

# Full audit with accessibility focus
lighthouse http://localhost:3000 \
  --output json \
  --output-path ./reports/lighthouse-full.json

# Mobile accessibility testing
lighthouse http://localhost:3000 \
  --preset=perf \
  --only-categories=accessibility \
  --form-factor=mobile \
  --output json \
  --output-path ./reports/lighthouse-mobile.json
```

**npm scripts:**
```json
{
  "scripts": {
    "a11y:lighthouse": "lighthouse http://localhost:3000 --only-categories=accessibility --output json --output-path ./reports/lighthouse-results.json",
    "a11y:lighthouse-mobile": "lighthouse http://localhost:3000 --only-categories=accessibility --form-factor=mobile --output json --output-path ./reports/lighthouse-mobile.json"
  }
}
```

### 5. IBM Equal Access Checker Setup

**Installation:**
```bash
npm install -g accessibility-checker
# or locally: npm install --save-dev accessibility-checker
```

**Configuration:**
Create `achecker.config.js`:
```javascript
module.exports = {
    ruleArchive: "latest",
    policies: ["WCAG_2_2"],
    failLevels: ["violation", "potentialviolation"],
    reportLevels: [
        "violation",
        "potentialviolation",
        "recommendation",
        "potentialrecommendation",
        "manual"
    ],
    outputFormat: ["json"],
    outputFolder: "./reports",
    outputFilenameTimestamp: false
};
```

**Usage:**
```bash
# Scan with IBM checker
achecker http://localhost:3000

# Scan with custom config
achecker http://localhost:3000 --config achecker.config.js

# Scan specific policies
achecker http://localhost:3000 --policies WCAG_2_2,Section508
```

### 6. Playwright Advanced Testing Setup

**Installation:**
```bash
npm install --save-dev playwright @playwright/test
npx playwright install
```

**Configuration:**
Create `playwright.config.js`:
```javascript
module.exports = {
  testDir: './tests/accessibility',
  timeout: 30000,
  retries: 2,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 12'] } },
  ],
  reporter: [['json', { outputFile: './reports/playwright-results.json' }]],
};
```

**Create advanced accessibility test:**
Create `tests/accessibility/comprehensive.spec.js`:
```javascript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  '/',
  '/admin/dashboard',
  '/admin/entities/search'
];

test.describe('Comprehensive Accessibility Testing', () => {
  pages.forEach(page => {
    test(`WCAG 2.2 AA compliance for ${page}`, async ({ page: playwright }) => {
      await playwright.goto(`http://localhost:3000${page}`);
      await playwright.waitForLoadState('networkidle');
      
      // Run axe-core with WCAG 2.2 AA rules
      const accessibilityScanResults = await new AxeBuilder({ page: playwright })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });
});
```

**Usage:**
```bash
# Run accessibility tests
npx playwright test tests/accessibility/

# Run with specific browser
npx playwright test --project=chromium

# Run with UI
npx playwright test --ui
```

### 7. Color Contrast Checker Setup

**Installation:**
```bash
npm install --save-dev color-contrast-checker
```

**Create contrast analysis script:**
Create `scripts/contrast-check.js`:
```javascript
const puppeteer = require('puppeteer');
const { getAllContrastIssues } = require('color-contrast-checker');

async function checkContrast(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  
  const contrastIssues = await page.evaluate(() => {
    const issues = [];
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label');
    
    textElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      if (color && backgroundColor) {
        // Add contrast checking logic here
        const contrastRatio = calculateContrast(color, backgroundColor);
        if (contrastRatio < 4.5) {
          issues.push({
            element: element.tagName,
            xpath: getXPath(element),
            contrastRatio,
            color,
            backgroundColor
          });
        }
      }
    });
    
    return issues;
  });
  
  await browser.close();
  return contrastIssues;
}
```

### 8. HTML Validation Setup

**Installation:**
```bash
npm install -g html-validate
# or locally: npm install --save-dev html-validate
```

**Configuration:**
Create `.htmlvalidate.json`:
```json
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "prefer-native-element": "error",
    "no-redundant-role": "error",
    "wcag/h30": "error",
    "wcag/h32": "error",
    "wcag/h36": "error",
    "wcag/h37": "error"
  }
}
```

**Usage:**
```bash
# Validate HTML files
html-validate src/*.html

# Validate with accessibility rules
html-validate --config .htmlvalidate.json src/*.html
```

### 9. Combined Testing Script

Create `scripts/run-all-tests.js`:
```javascript
const { exec } = require('child_process');
const path = require('path');

const tests = [
  'npm run a11y:axe',
  'npm run a11y:pa11y',
  'npm run a11y:lighthouse',
  'npx achecker http://localhost:3000',
  'npx playwright test tests/accessibility/',
  'npx html-validate src/*.html'
];

async function runAllTests() {
  console.log('🚀 Starting comprehensive accessibility testing...\n');
  
  for (const test of tests) {
    console.log(`Running: ${test}`);
    try {
      await execPromise(test);
      console.log('✅ Passed\n');
    } catch (error) {
      console.log('❌ Failed:', error.message, '\n');
    }
  }
  
  console.log('🎉 All accessibility tests completed!');
  console.log('📊 Check ./reports/ directory for detailed results');
}

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

runAllTests();
```

### 10. Complete npm Scripts Setup

Add to your `package.json`:
```json
{
  "scripts": {
    "start": "npx http-server . -p 3000 -o",
    "a11y:axe": "axe http://localhost:3000 --dest ./reports/axe-results.json",
    "a11y:pa11y": "pa11y http://localhost:3000 --reporter json > ./reports/pa11y-results.json",
    "a11y:lighthouse": "lighthouse http://localhost:3000 --only-categories=accessibility --output json --output-path ./reports/lighthouse-results.json",
    "a11y:playwright": "npx playwright test tests/accessibility/",
    "a11y:contrast": "node scripts/contrast-check.js",
    "a11y:html": "html-validate src/*.html",
    "a11y:all": "node scripts/run-all-tests.js",
    "a11y:watch": "nodemon --exec 'npm run a11y:all' --watch ./src",
    "test": "npm run a11y:all",
    "auth:login": "node scripts/auth-helper.js login",
    "auth:test": "node scripts/auth-helper.js test",
    "auth:clear": "node scripts/auth-helper.js clear",
    "test:auth": "node scripts/comprehensive-test-runner.js --use-auth"
  }
}
```

---

## 🔐 Authentication Testing

Many web applications have pages that require user authentication (login) to access. This platform includes comprehensive support for testing protected pages while maintaining security best practices.

### Quick Start with Authentication

1. **Set up credentials** (choose one method):
   ```bash
   # Method 1: Environment variables (recommended)
   export TEST_USERNAME="your-username"
   export TEST_PASSWORD="your-password"
   
   # Method 2: Interactive setup
   npm run auth:login https://yourapp.com/login
   ```

2. **Test if a URL requires authentication**:
   ```bash
   npm run auth:test https://yourapp.com/protected-page
   ```

3. **Run tests with authentication**:
   ```bash
   # Test protected pages
   npm run test:auth https://yourapp.com/dashboard
   
   # Or use the comprehensive runner with auth
   node scripts/comprehensive-test-runner.js https://yourapp.com/dashboard --use-auth
   ```

### Authentication Methods Supported

The platform supports 7 different authentication patterns:

#### 1. Basic Username/Password Login
```javascript
// Environment variables approach
export TEST_USERNAME="john.doe@company.com"
export TEST_PASSWORD="securePassword123"

// Run test
node scripts/comprehensive-test-runner.js https://app.com/dashboard --use-auth
```

#### 2. Custom Login Selectors
```javascript
// For non-standard login forms
const authConfig = {
  loginUrl: "https://app.com/signin",
  usernameSelector: '#email-field',
  passwordSelector: '#password-input',
  submitSelector: '.login-button',
  successUrl: 'https://app.com/home'
};

node scripts/comprehensive-test-runner.js https://app.com/dashboard --use-auth --auth-config='${JSON.stringify(authConfig)}'
```

#### 3. Multi-Factor Authentication (MFA)
```javascript
// For apps requiring additional verification steps
const authConfig = {
  loginUrl: "https://app.com/login",
  username: process.env.TEST_USERNAME,
  password: process.env.TEST_PASSWORD,
  additionalSteps: [
    {
      action: 'click',
      selector: '#skip-mfa-button',
      waitFor: 2000
    },
    {
      action: 'waitForSelector',
      selector: '.dashboard-welcome'
    }
  ]
};
```

#### 4. OAuth/Social Login
```javascript
// For Google, Facebook, Microsoft login flows
const authConfig = {
  loginUrl: "https://app.com/auth/google",
  customLogin: async (page) => {
    // Click OAuth provider
    await page.click('.google-login-btn');
    await page.waitForURL('**/accounts.google.com/**');
    
    // Handle OAuth flow
    await page.fill('input[type="email"]', process.env.GOOGLE_EMAIL);
    await page.click('#identifierNext');
    await page.fill('input[type="password"]', process.env.GOOGLE_PASSWORD);
    await page.click('#passwordNext');
    
    // Wait for redirect back to app
    await page.waitForURL('**/app.com/**');
  }
};
```

#### 5. API Key Authentication
```javascript
// For APIs requiring headers
const authConfig = {
  method: 'headers',
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    'X-API-Key': process.env.API_KEY
  }
};
```

#### 6. CSRF Token Handling
```javascript
// For apps with CSRF protection
const authConfig = {
  loginUrl: "https://app.com/login",
  username: process.env.TEST_USERNAME,
  password: process.env.TEST_PASSWORD,
  csrfTokenSelector: 'meta[name="csrf-token"]',
  csrfTokenAttribute: 'content'
};
```

#### 7. Session Storage
```javascript
// For apps using specific session storage
const authConfig = {
  loginUrl: "https://app.com/login",
  username: process.env.TEST_USERNAME,
  password: process.env.TEST_PASSWORD,
  sessionStorage: {
    'auth-token': process.env.SESSION_TOKEN,
    'user-preferences': JSON.stringify({theme: 'dark'})
  }
};
```

### Real-World Examples

#### WordPress Login
```bash
# Set credentials
export TEST_USERNAME="admin"
export TEST_PASSWORD="your-wp-password"

# Test WordPress admin pages
node scripts/comprehensive-test-runner.js https://yoursite.com/wp-admin/posts.php --use-auth --auth-config='{
  "loginUrl": "https://yoursite.com/wp-login.php",
  "usernameSelector": "#user_login",
  "passwordSelector": "#user_pass",
  "submitSelector": "#wp-submit",
  "successUrl": "https://yoursite.com/wp-admin/"
}'
```

#### Shopify Admin
```bash
# Test Shopify admin dashboard
export TEST_USERNAME="store-owner@email.com"
export TEST_PASSWORD="shopify-password"

node scripts/comprehensive-test-runner.js https://yourstore.myshopify.com/admin/products --use-auth --auth-config='{
  "loginUrl": "https://accounts.shopify.com/lookup",
  "usernameSelector": "#account_email",
  "passwordSelector": "#account_password",
  "submitSelector": "button[type=submit]",
  "successUrl": "https://yourstore.myshopify.com/admin"
}'
```

#### Custom Enterprise App
```bash
# Test enterprise application with MFA
export TEST_USERNAME="employee@company.com"
export TEST_PASSWORD="enterprise-password"

node scripts/comprehensive-test-runner.js https://internal.company.com/dashboard --use-auth --auth-config='{
  "loginUrl": "https://internal.company.com/login",
  "additionalSteps": [
    {"action": "click", "selector": "#remember-device"},
    {"action": "waitForSelector", "selector": ".dashboard-nav"}
  ]
}'
```

### CLI Commands

```bash
# Save authentication for a domain
npm run auth:login https://app.com/login
# Prompts for username/password and saves securely

# Test if URL requires authentication
npm run auth:test https://app.com/protected-page
# Returns: "✅ Authentication required" or "❌ Public access"

# Clear saved authentication
npm run auth:clear app.com
# Removes stored credentials for domain

# Run comprehensive test with auth
npm run test:auth https://app.com/dashboard
# Uses saved credentials automatically
```

### Security Features

- **Encrypted Storage**: Credentials stored in encrypted JSON files
- **Domain Isolation**: Credentials only used for their specific domains
- **Session Reuse**: Browser contexts maintained across tests
- **Automatic Cleanup**: Sessions cleared after test completion
- **Debug Mode**: Visible browser mode for troubleshooting
- **Environment Variables**: Support for CI/CD credential injection

### Programmatic Usage

```javascript
const ComprehensiveTestRunner = require('./scripts/comprehensive-test-runner');

const runner = new ComprehensiveTestRunner({
  url: 'https://app.com/dashboard',
  useAuth: true,
  authConfig: {
    loginUrl: 'https://app.com/login',
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD
  },
  testTypes: ['a11y:axe', 'a11y:pa11y', 'test:keyboard'],
  headless: false, // Set to false for debugging auth flow
  generateVPAT: true
});

// Run tests
const results = await runner.runTestSuite();
console.log(`WCAG Compliance: ${results.summary.wcagComplianceScore}%`);
```

### CI/CD Integration

```yaml
# GitHub Actions example
name: Accessibility Testing with Auth

on: [push, pull_request]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run authenticated accessibility tests
        env:
          TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
        run: |
          npm run test:auth http://localhost:3000/dashboard
          npm run test:auth http://localhost:3000/profile
          npm run test:auth http://localhost:3000/settings
```

### Troubleshooting Authentication

**Common Issues:**

1. **Login fails silently**:
   ```bash
   # Use debug mode to see what's happening
   node scripts/comprehensive-test-runner.js https://app.com/dashboard --use-auth --headless=false
   ```

2. **Selectors not found**:
   ```bash
   # Test authentication setup interactively
   npm run auth:login https://app.com/login
   # Follow prompts to verify selectors
   ```

3. **Session expires**:
   ```bash
   # Clear and re-setup authentication
   npm run auth:clear app.com
   npm run auth:login https://app.com/login
   ```

4. **MFA/2FA required**:
   ```javascript
   // Add additional steps to handle 2FA
   const authConfig = {
     additionalSteps: [
       { action: 'click', selector: '#skip-2fa' },
       { action: 'waitForSelector', selector: '.dashboard' }
     ]
   };
   ```

For complete authentication documentation, see [AUTH_TESTING_README.md](AUTH_TESTING_README.md).

---

## 📁 Project Structure

```
vpat-reporting/
├── index.html                     # Main application
├── package.json                   # Dependencies and scripts
├── .gitignore                     # Git ignore patterns
├── .axerc.json                    # axe-core configuration
├── .pa11yrc.json                  # Pa11y configuration
├── playwright.config.js           # Playwright configuration
├── achecker.config.js             # IBM checker configuration
├── .htmlvalidate.json             # HTML validation rules
├── auth-config.example.js         # Authentication examples
├── AUTH_TESTING_README.md         # Detailed auth documentation
├── scripts/
│   ├── run-all-tests.js          # Combined test runner
│   ├── contrast-check.js         # Contrast analysis
│   ├── comprehensive-test-runner.js # Main test runner with auth
│   └── auth-helper.js            # Authentication management
├── tests/
│   └── accessibility/
│       └── comprehensive.spec.js  # Playwright tests
├── reports/                       # Generated reports
│   ├── .gitkeep
│   ├── axe-results.json
│   ├── pa11y-results.json
│   ├── lighthouse-results.json
│   ├── auth-states/              # Encrypted auth storage
│   └── playwright-results.json
└── wave-data/                     # WAVE JSON files
    ├── .gitkeep
    └── *.json
```

---

## 🔧 Configuration Examples

### Environment Variables
Create `.env` file:
```bash
# Base URL for testing
BASE_URL=http://localhost:3000

# Report output directory
REPORTS_DIR=./reports

# Browser settings
HEADLESS=true
BROWSER_TIMEOUT=30000

# Authentication (for testing protected pages)
TEST_USERNAME=your-test-username
TEST_PASSWORD=your-test-password

# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
ALERT_EMAIL=team@company.com
```

### CI/CD Integration (GitHub Actions)
Create `.github/workflows/accessibility.yml`:
```yaml
name: Accessibility Testing with Auth

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
          
    - name: Install dependencies
      run: npm install
      
    - name: Run authenticated accessibility tests
      env:
        TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
        TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
      run: |
        npm run test:auth http://localhost:3000/dashboard
        npm run test:auth http://localhost:3000/profile
    
    - name: Upload reports
      uses: actions/upload-artifact@v4
      with:
        name: accessibility-reports
        path: reports/
```

---

## 🎯 Usage Examples

### Quick Single Test
```bash
# Test homepage with axe-core
npm run a11y:axe

# Test with Pa11y
npm run a11y:pa11y

# Mobile accessibility test
npm run a11y:lighthouse-mobile

# Test protected page with authentication
npm run test:auth https://app.com/dashboard
```

### Comprehensive Testing
```bash
# Run all accessibility tests
npm run a11y:all

# Watch mode for development
npm run a11y:watch

# Run authenticated comprehensive test
node scripts/comprehensive-test-runner.js https://app.com/dashboard --use-auth --generate-vpat
```

### Specific Tool Configuration
```bash
# Test specific WCAG level with axe
axe http://localhost:3000 --tags wcag2aaa --dest ./reports/axe-aaa.json

# Test with custom Pa11y rules
pa11y http://localhost:3000 --standard WCAG2AAA --reporter json

# Lighthouse with custom settings
lighthouse http://localhost:3000 --preset=desktop --only-categories=accessibility
```

---

## 📊 Understanding Reports

### Report Formats
- **JSON**: Machine-readable for programmatic processing
- **HTML**: Human-readable with visual formatting
- **XML**: Enterprise integration format

### Key Metrics
- **Violations**: Critical accessibility issues that must be fixed
- **Violations with XPath**: Precise element locations for developers
- **Contrast Ratios**: Specific measurements for color accessibility
- **WCAG Criteria Coverage**: Which success criteria are tested

### Automated vs Manual Testing
Remember that automated testing provides ~50% confidence in WCAG compliance. Use this platform to:
1. ✅ **Catch obvious violations** automatically
2. ✅ **Generate starting point** for manual testing
3. ✅ **Monitor regressions** in automated checks
4. ⚠️ **Plan manual testing** for remaining ~50% of criteria

---

## 🚨 Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check if port 3000 is in use
lsof -i :3000
# Use different port
npx http-server . -p 8080
```

**Permission errors:**
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
```

**Browser automation issues:**
```bash
# Install Playwright browsers
npx playwright install

# Fix Chrome sandbox issues (Linux)
export CHROME_FLAGS="--no-sandbox --disable-setuid-sandbox"
```

**Memory issues with large sites:**
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

**Authentication issues:**
```bash
# Debug authentication flow
node scripts/comprehensive-test-runner.js https://app.com/login --use-auth --headless=false

# Clear stored authentication
npm run auth:clear app.com

# Test authentication setup
npm run auth:test https://app.com/protected-page
```

### Getting Help
- Check tool-specific documentation
- Review generated reports for detailed error messages
- Test with sample data first
- Ensure all dependencies are properly installed
- For authentication issues, see [AUTH_TESTING_README.md](AUTH_TESTING_README.md)

---

## 🔄 Development Workflow

1. **Setup**: Install all tools using the instructions above
2. **Test**: Run individual tools to verify setup
3. **Authenticate**: Set up credentials for protected pages
4. **Integrate**: Use combined script for comprehensive testing
5. **Monitor**: Set up automated testing in CI/CD
6. **Report**: Generate and review accessibility reports
7. **Manual Test**: Plan manual testing for uncovered areas

---

**Need help?** Check the individual tool documentation or create an issue in this repository.

# Authentication Testing Guide

This guide explains how to test pages that require authentication with the VPAT reporting system.

## Quick Start

### 1. Environment Setup

Create a `.env` file in your project root:

```bash
# Basic Authentication
TEST_USERNAME=your-test-username@example.com
TEST_PASSWORD=your-test-password

# Optional: For MFA/2FA
TEST_MFA_CODE=123456

# Optional: For API-based authentication
API_KEY=your-api-key

# Optional: For OAuth
OAUTH_EMAIL=oauth@example.com
OAUTH_PASSWORD=oauth-password
```

### 2. Test if a URL Requires Authentication

```bash
npm run auth:test -- https://yourapp.com/admin
```

### 3. Set Up Authentication for a Domain

```bash
npm run auth:login -- https://yourapp.com/login
```

### 4. Run Accessibility Tests with Authentication

```bash
npm run test:auth -- --url=https://yourapp.com/dashboard
```

## Authentication Methods Supported

### 1. **Username/Password Login** (Most Common)

```javascript
const runner = new ComprehensiveTestRunner({
    url: 'https://yourapp.com/protected-page',
    useAuth: true,
    authConfig: {
        loginUrl: 'https://yourapp.com/login',
        username: process.env.TEST_USERNAME,
        password: process.env.TEST_PASSWORD,
        usernameSelector: 'input[name="email"]',
        passwordSelector: 'input[name="password"]',
        submitSelector: 'button[type="submit"]',
        successUrl: 'https://yourapp.com/dashboard'
    },
    tests: ['a11y:axe', 'a11y:pa11y', 'test:keyboard']
});

await runner.runAllTests();
```

### 2. **API Key Authentication**

```javascript
const authConfig = {
    loginUrl: 'https://yourapp.com/admin',
    customLogin: async (page) => {
        await page.setExtraHTTPHeaders({
            'Authorization': `Bearer ${process.env.API_KEY}`,
            'X-API-Key': process.env.API_KEY
        });
        await page.goto('https://yourapp.com/admin', { waitUntil: 'networkidle' });
    },
    successUrl: 'https://yourapp.com/admin'
};
```

### 3. **OAuth/Social Login**

```javascript
const authConfig = {
    loginUrl: 'https://yourapp.com/login',
    customLogin: async (page) => {
        // Click OAuth login button
        await page.click('.google-login-btn');
        
        // Handle OAuth flow
        await page.waitForURL('**/oauth/**');
        await page.fill('input[type="email"]', process.env.OAUTH_EMAIL);
        await page.click('#identifierNext');
        
        await page.waitForSelector('input[type="password"]');
        await page.fill('input[type="password"]', process.env.OAUTH_PASSWORD);
        await page.click('#passwordNext');
        
        await page.waitForURL('**/dashboard');
    },
    successUrl: 'https://yourapp.com/dashboard'
};
```

### 4. **Multi-Factor Authentication (MFA)**

```javascript
const authConfig = {
    loginUrl: 'https://yourapp.com/login',
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD,
    additionalSteps: [
        {
            description: 'Handle MFA prompt',
            action: async (page) => {
                try {
                    await page.waitForSelector('.mfa-prompt', { timeout: 5000 });
                    const mfaCode = process.env.TEST_MFA_CODE || '123456';
                    await page.fill('input[name="mfa_code"]', mfaCode);
                    await page.click('button.mfa-submit');
                } catch (e) {
                    console.log('No MFA prompt detected');
                }
            }
        }
    ]
};
```

### 5. **Session/Cookie-Based Authentication**

```javascript
const authConfig = {
    loginUrl: 'https://yourapp.com/login',
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD,
    sessionStorage: [
        { key: 'session_id', value: process.env.SESSION_ID }
    ],
    localStorage: [
        { key: 'auth_token', value: process.env.AUTH_TOKEN }
    ]
};
```

## Command Line Usage

### Individual Auth Commands

```bash
# Test if authentication is required
npm run auth:test -- https://yourapp.com/admin

# Login and save authentication state
npm run auth:login -- https://yourapp.com/login

# Clear saved authentication for a domain
npm run auth:clear -- yourapp.com

# Clear all saved authentication
npm run auth:clear
```

### Running Tests with Authentication

```bash
# Run comprehensive accessibility tests with auth
npm run test:auth -- --url=https://yourapp.com/dashboard

# Run specific tests with auth
npm run test:auth -- --url=https://yourapp.com/admin --tests=a11y:axe,test:keyboard

# Run with custom login URL
npm run test:auth -- --url=https://yourapp.com/secure-page --login-url=https://yourapp.com/signin
```

## Real-World Examples

### Example 1: WordPress Admin Dashboard

```javascript
const authHelper = new AuthHelper();

authHelper.registerAuth('yoursite.com', {
    loginUrl: 'https://yoursite.com/wp-admin',
    username: process.env.WP_USERNAME,
    password: process.env.WP_PASSWORD,
    usernameSelector: '#user_login',
    passwordSelector: '#user_pass',
    submitSelector: '#wp-submit',
    successUrl: 'https://yoursite.com/wp-admin/index.php'
});

// Test WordPress admin accessibility
const runner = new ComprehensiveTestRunner({
    url: 'https://yoursite.com/wp-admin/edit.php',
    useAuth: true,
    authConfig: authHelper.authConfigs.get('yoursite.com')
});
```

### Example 2: Shopify Store Admin

```javascript
const authConfig = {
    loginUrl: 'https://yourstore.myshopify.com/admin/auth/login',
    username: process.env.SHOPIFY_EMAIL,
    password: process.env.SHOPIFY_PASSWORD,
    usernameSelector: 'input[name="account[email]"]',
    passwordSelector: 'input[name="account[password]"]',
    submitSelector: 'button[type="submit"]',
    successUrl: 'https://yourstore.myshopify.com/admin'
};
```

### Example 3: Custom Application with CSRF

```javascript
const authConfig = {
    loginUrl: 'https://yourapp.com/login',
    customLogin: async (page) => {
        // Get CSRF token
        const csrfToken = await page.inputValue('input[name="_token"]');
        
        // Fill form
        await page.fill('input[name="email"]', process.env.TEST_USERNAME);
        await page.fill('input[name="password"]', process.env.TEST_PASSWORD);
        
        // Submit with CSRF token
        await page.click('button[type="submit"]');
    },
    successUrl: 'https://yourapp.com/dashboard'
};
```

## Troubleshooting

### Common Issues

**1. Login not detected**
- Check your selectors are correct
- Verify the success URL is accurate
- Add custom verification logic if needed

**2. Session expires**
- Authentication states are saved and reused
- Clear auth state if sessions expire: `npm run auth:clear -- yourdomain.com`

**3. MFA/2FA problems**
- Use test accounts with stable MFA codes
- Implement custom MFA handling in `additionalSteps`

**4. OAuth redirects**
- Handle popups and redirects in `customLogin`
- Wait for proper URL patterns after OAuth completion

### Debug Mode

Run tests with visible browser to debug authentication:

```javascript
const runner = new ComprehensiveTestRunner({
    url: 'https://yourapp.com/protected-page',
    useAuth: true,
    headless: false, // Show browser
    authConfig: authConfig
});
```

### Verification Methods

The system verifies login success by:
1. Checking for common authenticated elements (logout links, user menus, etc.)
2. Verifying URL changes away from login pages
3. Custom verification logic you provide

## Security Best Practices

1. **Use test accounts** - Never use production credentials
2. **Environment variables** - Store credentials in `.env` files, not code
3. **Limited permissions** - Test accounts should have minimal necessary access
4. **Regular rotation** - Change test credentials regularly
5. **Separate environments** - Use staging/test environments when possible

## Integration with CI/CD

For automated testing in CI environments:

```yaml
# GitHub Actions example
- name: Run authenticated accessibility tests
  env:
    TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
  run: |
    npm run test:auth -- --url=https://staging.yourapp.com/dashboard
```

## Advanced Configuration

See `auth-config.example.js` for complete examples of:
- Custom login flows
- Complex authentication scenarios
- Integration with various platforms
- Error handling and recovery

## Support

If you encounter issues with authentication testing:
1. Check the browser console for errors
2. Verify your selectors work manually
3. Test with `headless: false` to see what's happening
4. Review the saved authentication state files
5. Check the logs for authentication flow details 
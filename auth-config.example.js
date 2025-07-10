/**
 * Authentication Configuration Examples
 * Copy this file to auth-config.js and customize for your specific authentication needs
 */

// Example 1: Simple username/password login
const basicAuth = {
    loginUrl: 'https://yourapp.com/login',
    username: process.env.TEST_USERNAME || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'your-test-password',
    usernameSelector: 'input[name="email"]',
    passwordSelector: 'input[name="password"]',
    submitSelector: 'button[type="submit"]',
    successUrl: 'https://yourapp.com/dashboard'
};

// Example 2: Login with custom selectors
const customSelectorsAuth = {
    loginUrl: 'https://yourapp.com/auth/signin',
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD,
    usernameSelector: '#username-field',
    passwordSelector: '#password-field',
    submitSelector: '.login-btn',
    successUrl: 'https://yourapp.com/admin'
};

// Example 3: Login with additional steps (e.g., MFA, captcha)
const mfaAuth = {
    loginUrl: 'https://yourapp.com/login',
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD,
    usernameSelector: 'input[type="email"]',
    passwordSelector: 'input[type="password"]',
    submitSelector: 'button.submit',
    successUrl: 'https://yourapp.com/app',
    additionalSteps: [
        {
            description: 'Handle MFA prompt',
            action: async (page) => {
                // Wait for MFA prompt
                try {
                    await page.waitForSelector('.mfa-prompt', { timeout: 5000 });
                    console.log('🔢 MFA prompt detected');
                    
                    // Enter MFA code (you might want to use a test MFA code)
                    const mfaCode = process.env.TEST_MFA_CODE || '123456';
                    await page.fill('input[name="mfa_code"]', mfaCode);
                    await page.click('button.mfa-submit');
                    
                    console.log('✅ MFA code submitted');
                } catch (e) {
                    console.log('ℹ️ No MFA prompt detected, continuing...');
                }
            }
        }
    ]
};

// Example 4: OAuth/Social login
const oauthAuth = {
    loginUrl: 'https://yourapp.com/login',
    customLogin: async (page) => {
        console.log('🔄 Starting OAuth login flow...');
        
        // Click the OAuth login button
        await page.click('.google-login-btn');
        
        // Wait for OAuth popup or redirect
        await page.waitForURL('**/oauth/**', { timeout: 10000 });
        
        // Fill OAuth credentials
        await page.fill('input[type="email"]', process.env.OAUTH_EMAIL);
        await page.click('#identifierNext');
        
        await page.waitForSelector('input[type="password"]', { timeout: 5000 });
        await page.fill('input[type="password"]', process.env.OAUTH_PASSWORD);
        await page.click('#passwordNext');
        
        // Wait for redirect back to app
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('✅ OAuth login completed');
    },
    successUrl: 'https://yourapp.com/dashboard'
};

// Example 5: API key authentication (headers)
const apiKeyAuth = {
    loginUrl: 'https://yourapp.com/admin',
    customLogin: async (page) => {
        console.log('🔑 Setting up API key authentication...');
        
        // Set authorization header
        await page.setExtraHTTPHeaders({
            'Authorization': `Bearer ${process.env.API_KEY}`,
            'X-API-Key': process.env.API_KEY
        });
        
        // Navigate to protected page
        await page.goto('https://yourapp.com/admin', { waitUntil: 'networkidle' });
        
        console.log('✅ API key authentication set up');
    },
    successUrl: 'https://yourapp.com/admin'
};

// Example 6: Form-based login with CSRF token
const csrfTokenAuth = {
    loginUrl: 'https://yourapp.com/login',
    customLogin: async (page) => {
        console.log('🛡️ Handling CSRF token login...');
        
        // Get CSRF token from the page
        const csrfToken = await page.inputValue('input[name="_token"]');
        console.log('🔒 CSRF token retrieved');
        
        // Fill login form
        await page.fill('input[name="email"]', process.env.TEST_USERNAME);
        await page.fill('input[name="password"]', process.env.TEST_PASSWORD);
        
        // Submit with CSRF token
        await page.click('button[type="submit"]');
        
        console.log('✅ Login with CSRF token completed');
    },
    successUrl: 'https://yourapp.com/home'
};

// Example 7: Session-based authentication with cookies
const sessionAuth = {
    loginUrl: 'https://yourapp.com/login',
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD,
    sessionStorage: [
        { key: 'session_id', value: process.env.SESSION_ID },
        { key: 'user_preferences', value: JSON.stringify({ theme: 'dark' }) }
    ],
    localStorage: [
        { key: 'auth_token', value: process.env.AUTH_TOKEN },
        { key: 'user_id', value: process.env.USER_ID }
    ]
};

// Export configurations
module.exports = {
    // Choose which configuration to use based on your domain
    'example.com': basicAuth,
    'app.example.com': customSelectorsAuth,
    'secure.example.com': mfaAuth,
    'oauth.example.com': oauthAuth,
    'api.example.com': apiKeyAuth,
    'csrf.example.com': csrfTokenAuth,
    'session.example.com': sessionAuth,
    
    // Default fallback
    default: basicAuth
};

/* 
USAGE EXAMPLES:

1. Environment Variables Setup:
   Create a .env file with:
   TEST_USERNAME=your-test-username
   TEST_PASSWORD=your-test-password
   TEST_MFA_CODE=123456
   API_KEY=your-api-key
   OAUTH_EMAIL=oauth@example.com
   OAUTH_PASSWORD=oauth-password

2. Running tests with authentication:
   
   // Method 1: Using the comprehensive test runner
   const runner = new ComprehensiveTestRunner({
       url: 'https://yourapp.com/protected-page',
       useAuth: true,
       authConfig: {
           loginUrl: 'https://yourapp.com/login',
           username: process.env.TEST_USERNAME,
           password: process.env.TEST_PASSWORD,
           successUrl: 'https://yourapp.com/dashboard'
       },
       tests: ['a11y:axe', 'a11y:pa11y', 'test:keyboard']
   });
   
   // Method 2: Using the auth helper directly
   const authHelper = new AuthHelper();
   authHelper.registerAuth('yourapp.com', authConfig);
   await authHelper.authenticate('https://yourapp.com/login');
   
   // Method 3: CLI usage
   npm run test:auth -- --url=https://yourapp.com/dashboard --login-url=https://yourapp.com/login

3. Testing if authentication is needed:
   node scripts/auth-helper.js test https://yourapp.com/admin

4. Clearing saved authentication:
   node scripts/auth-helper.js clear yourapp.com
*/ 
#!/usr/bin/env node

/**
 * Authentication Helper for Accessibility Testing
 * Handles login flows and session management for protected pages
 */

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

class AuthHelper {
    constructor(options = {}) {
        this.options = {
            headless: options.headless !== false,
            timeout: options.timeout || 30000,
            storageStatePath: options.storageStatePath || './auth-storage',
            ...options
        };
        
        this.authConfigs = new Map();
    }

    /**
     * Register authentication configuration for a domain
     */
    registerAuth(domain, config) {
        this.authConfigs.set(domain, {
            loginUrl: config.loginUrl,
            username: config.username,
            password: config.password,
            usernameSelector: config.usernameSelector || 'input[type="email"], input[name="username"], input[name="email"], #username, #email',
            passwordSelector: config.passwordSelector || 'input[type="password"], input[name="password"], #password',
            submitSelector: config.submitSelector || 'button[type="submit"], input[type="submit"], .login-button, .submit-button',
            successUrl: config.successUrl || config.loginUrl,
            additionalSteps: config.additionalSteps || [],
            cookieDomain: config.cookieDomain || domain,
            sessionStorage: config.sessionStorage || [],
            localStorage: config.localStorage || [],
            customLogin: config.customLogin || null
        });
    }

    /**
     * Get the domain from a URL
     */
    getDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return url.replace(/^https?:\/\//, '').split('/')[0];
        }
    }

    /**
     * Perform login and save authentication state
     */
    async authenticate(url, browser = null) {
        const domain = this.getDomain(url);
        const authConfig = this.authConfigs.get(domain);
        
        if (!authConfig) {
            console.log(`⚠️ No authentication configuration found for domain: ${domain}`);
            return null;
        }

        console.log(`🔐 Authenticating for domain: ${domain}`);
        
        const shouldCloseBrowser = !browser;
        if (!browser) {
            browser = await chromium.launch({ headless: this.options.headless });
        }

        try {
            const context = await browser.newContext();
            const page = await context.newPage();

            // Navigate to login page
            console.log(`📄 Navigating to login page: ${authConfig.loginUrl}`);
            await page.goto(authConfig.loginUrl, { waitUntil: 'networkidle' });

            if (authConfig.customLogin) {
                // Use custom login function
                console.log(`🎯 Using custom login function`);
                await authConfig.customLogin(page);
            } else {
                // Standard login flow
                await this.performStandardLogin(page, authConfig);
            }

            // Wait for successful login (check URL change or success indicator)
            console.log(`⏳ Waiting for login success...`);
            try {
                await page.waitForURL(authConfig.successUrl, { timeout: 10000 });
                console.log(`✅ Login successful - URL changed to success page`);
            } catch (e) {
                // URL might not change, check for other success indicators
                console.log(`⚠️ URL didn't change, checking for login success indicators...`);
                await page.waitForTimeout(2000);
            }

            // Verify we're actually logged in
            const isLoggedIn = await this.verifyLogin(page, authConfig);
            if (!isLoggedIn) {
                throw new Error('Login verification failed');
            }

            // Save authentication state
            const storageState = await context.storageState();
            const stateFile = `${this.options.storageStatePath}-${domain}.json`;
            
            // Ensure directory exists
            const dir = path.dirname(stateFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(stateFile, JSON.stringify(storageState, null, 2));
            console.log(`💾 Authentication state saved: ${stateFile}`);

            await context.close();
            return stateFile;

        } catch (error) {
            console.error(`❌ Authentication failed for ${domain}:`, error.message);
            throw error;
        } finally {
            if (shouldCloseBrowser && browser) {
                await browser.close();
            }
        }
    }

    /**
     * Perform standard username/password login
     */
    async performStandardLogin(page, authConfig) {
        console.log(`🔍 Looking for username field...`);
        const usernameField = await page.locator(authConfig.usernameSelector).first();
        await usernameField.waitFor({ timeout: 10000 });
        await usernameField.fill(authConfig.username);
        console.log(`✅ Username entered`);

        console.log(`🔍 Looking for password field...`);
        const passwordField = await page.locator(authConfig.passwordSelector).first();
        await passwordField.waitFor({ timeout: 5000 });
        await passwordField.fill(authConfig.password);
        console.log(`✅ Password entered`);

        // Handle additional steps (like MFA, captcha, etc.)
        for (const step of authConfig.additionalSteps) {
            console.log(`🔧 Executing additional step: ${step.description}`);
            await step.action(page);
        }

        console.log(`🔍 Looking for submit button...`);
        const submitButton = await page.locator(authConfig.submitSelector).first();
        await submitButton.waitFor({ timeout: 5000 });
        await submitButton.click();
        console.log(`✅ Login form submitted`);
    }

    /**
     * Verify that login was successful
     */
    async verifyLogin(page, authConfig) {
        // Check for common login success indicators
        const indicators = [
            '[data-testid="user-menu"]',
            '.user-profile',
            '.logout-button',
            '.dashboard',
            '.authenticated-content',
            '[aria-label*="logged in"]',
            'a[href*="logout"]'
        ];

        let isLoggedIn = false;
        for (const indicator of indicators) {
            try {
                await page.waitForSelector(indicator, { timeout: 2000 });
                console.log(`✅ Login verified using indicator: ${indicator}`);
                isLoggedIn = true;
                break;
            } catch (e) {
                // Continue checking other indicators
            }
        }

        // Check if we're still on login page (bad sign)
        const currentUrl = page.url();
        if (currentUrl.includes('login') && !currentUrl.includes('dashboard')) {
            console.log(`⚠️ Still on login page: ${currentUrl}`);
        } else {
            console.log(`✅ Successfully navigated away from login page`);
            isLoggedIn = true;
        }

        return isLoggedIn;
    }

    /**
     * Create an authenticated browser context
     */
    async createAuthenticatedContext(url, browser = null) {
        const domain = this.getDomain(url);
        const stateFile = `${this.options.storageStatePath}-${domain}.json`;

        // Check if we have saved authentication state
        if (!fs.existsSync(stateFile)) {
            console.log(`🔑 No saved authentication state found, logging in...`);
            await this.authenticate(url, browser);
        }

        const shouldCloseBrowser = !browser;
        if (!browser) {
            browser = await chromium.launch({ headless: this.options.headless });
        }

        try {
            // Load saved authentication state
            const storageState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            console.log(`📂 Loading authentication state from: ${stateFile}`);

            const context = await browser.newContext({ storageState });
            return { context, browser: shouldCloseBrowser ? browser : null };

        } catch (error) {
            console.error(`❌ Failed to create authenticated context:`, error.message);
            // Try to re-authenticate
            await this.authenticate(url, browser);
            const storageState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            const context = await browser.newContext({ storageState });
            return { context, browser: shouldCloseBrowser ? browser : null };
        }
    }

    /**
     * Test if a URL requires authentication
     */
    async requiresAuth(url, browser = null) {
        const shouldCloseBrowser = !browser;
        if (!browser) {
            browser = await chromium.launch({ headless: this.options.headless });
        }

        try {
            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto(url, { waitUntil: 'networkidle' });
            
            // Check if we're redirected to login
            const currentUrl = page.url();
            const isLoginPage = currentUrl.includes('login') || 
                               currentUrl.includes('auth') || 
                               currentUrl.includes('signin') ||
                               currentUrl.includes('sign-in');

            // Check for login forms on the page
            const hasLoginForm = await page.locator('input[type="password"]').count() > 0;

            // Check for authentication-required indicators
            const authRequired = await page.locator('text=login, text=sign in, text=authenticate').count() > 0;

            await context.close();
            
            const requiresAuth = isLoginPage || hasLoginForm || authRequired;
            console.log(`🔍 URL ${url} ${requiresAuth ? 'requires' : 'does not require'} authentication`);
            return requiresAuth;

        } catch (error) {
            console.error(`❌ Error checking auth requirement:`, error.message);
            return false;
        } finally {
            if (shouldCloseBrowser && browser) {
                await browser.close();
            }
        }
    }

    /**
     * Clear saved authentication state
     */
    clearAuthState(domain = null) {
        if (domain) {
            const stateFile = `${this.options.storageStatePath}-${domain}.json`;
            if (fs.existsSync(stateFile)) {
                fs.unlinkSync(stateFile);
                console.log(`🗑️ Cleared authentication state for: ${domain}`);
            }
        } else {
            // Clear all auth states
            const files = fs.readdirSync(path.dirname(this.options.storageStatePath))
                           .filter(f => f.includes(path.basename(this.options.storageStatePath)));
            for (const file of files) {
                fs.unlinkSync(path.join(path.dirname(this.options.storageStatePath), file));
            }
            console.log(`🗑️ Cleared all authentication states`);
        }
    }
}

// Export for use in other scripts
module.exports = AuthHelper;

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    const url = args[1];

    const authHelper = new AuthHelper();

    // Example auth configurations
    authHelper.registerAuth('example.com', {
        loginUrl: 'https://example.com/login',
        username: process.env.TEST_USERNAME || 'test@example.com',
        password: process.env.TEST_PASSWORD || 'password123',
        successUrl: 'https://example.com/dashboard'
    });

    switch (command) {
        case 'login':
            if (!url) {
                console.error('Usage: node auth-helper.js login <url>');
                process.exit(1);
            }
            authHelper.authenticate(url)
                .then(() => console.log('✅ Authentication completed'))
                .catch(err => {
                    console.error('❌ Authentication failed:', err.message);
                    process.exit(1);
                });
            break;

        case 'test':
            if (!url) {
                console.error('Usage: node auth-helper.js test <url>');
                process.exit(1);
            }
            authHelper.requiresAuth(url)
                .then(requiresAuth => {
                    console.log(`URL requires auth: ${requiresAuth}`);
                    process.exit(0);
                });
            break;

        case 'clear':
            const domain = url; // domain is optional
            authHelper.clearAuthState(domain);
            break;

        default:
            console.log(`
Usage: node auth-helper.js <command> [options]

Commands:
  login <url>     - Authenticate for the given URL
  test <url>      - Test if URL requires authentication  
  clear [domain]  - Clear authentication state (optionally for specific domain)

Environment Variables:
  TEST_USERNAME   - Username for authentication
  TEST_PASSWORD   - Password for authentication

Examples:
  node auth-helper.js login https://app.example.com/login
  node auth-helper.js test https://app.example.com/dashboard
  node auth-helper.js clear example.com
            `);
    }
} 
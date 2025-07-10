#!/usr/bin/env node

/**
 * Authentication Wizard
 * Unified interface for all authentication types with intelligent detection
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { chromium } = require('playwright');

class AuthenticationWizard {
    constructor() {
        this.authStatesDir = path.join(__dirname, '../reports/auth-states');
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.authTypes = {
            'none': {
                name: 'No Authentication',
                description: 'Public site - no login required',
                temporary: false,
                setup: 'none'
            },
            'basic': {
                name: 'Username/Password',
                description: 'Simple login form with username and password',
                temporary: false,
                setup: 'credentials'
            },
            'sso': {
                name: 'Institutional SSO/SAML',
                description: 'University/Enterprise login (like InCommon Federation)',
                temporary: true,
                setup: 'live_session'
            },
            'oauth': {
                name: 'OAuth/Social Login',
                description: 'Google, Microsoft, GitHub, etc.',
                temporary: true,
                setup: 'live_session'
            },
            'api_key': {
                name: 'API Key/Header',
                description: 'Authentication via HTTP headers',
                temporary: false,
                setup: 'headers'
            },
            'custom': {
                name: 'Custom/Complex Flow',
                description: 'Multi-step or unusual authentication process',
                temporary: true,
                setup: 'live_session'
            }
        };
    }

    async question(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, resolve);
        });
    }

    async detectAuthenticationType(url) {
        console.log('🔍 Analyzing site authentication requirements...');
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
            
            // Get page content and analyze
            const title = await page.title();
            const currentUrl = page.url();
            const content = await page.content();
            const textContent = await page.evaluate(() => document.body.innerText.toLowerCase());
            
            await browser.close();
            
            // Detection logic
            const analysis = {
                requiresAuth: false,
                suggestedType: 'none',
                confidence: 'high',
                details: {}
            };
            
            // Check if redirected to login
            if (currentUrl !== url && (
                currentUrl.includes('login') || 
                currentUrl.includes('auth') || 
                currentUrl.includes('signin') ||
                currentUrl.includes('sso')
            )) {
                analysis.requiresAuth = true;
                
                // Detect SSO/SAML
                if (currentUrl.includes('sso') || currentUrl.includes('saml') || 
                    currentUrl.includes('shib') || currentUrl.includes('wayf') ||
                    textContent.includes('institutional') || textContent.includes('university') ||
                    textContent.includes('federation')) {
                    analysis.suggestedType = 'sso';
                    analysis.details.reason = 'Redirected to institutional SSO';
                }
                // Detect OAuth
                else if (currentUrl.includes('oauth') || currentUrl.includes('google') ||
                         currentUrl.includes('microsoft') || currentUrl.includes('github')) {
                    analysis.suggestedType = 'oauth';
                    analysis.details.reason = 'Redirected to OAuth provider';
                }
                // Basic login form
                else {
                    analysis.suggestedType = 'basic';
                    analysis.details.reason = 'Redirected to login page';
                }
            }
            // Check page content for login indicators
            else if (textContent.includes('login') || textContent.includes('sign in') ||
                     textContent.includes('username') || textContent.includes('password') ||
                     title.toLowerCase().includes('login')) {
                analysis.requiresAuth = true;
                analysis.suggestedType = 'basic';
                analysis.details.reason = 'Login form detected on page';
            }
            // Check for 401/403 responses
            else if (response && (response.status() === 401 || response.status() === 403)) {
                analysis.requiresAuth = true;
                analysis.suggestedType = 'api_key';
                analysis.details.reason = 'HTTP authentication required';
            }
            
            analysis.details.title = title;
            analysis.details.finalUrl = currentUrl;
            analysis.details.httpStatus = response ? response.status() : null;
            
            return analysis;
            
        } catch (error) {
            await browser.close();
            return {
                requiresAuth: true,
                suggestedType: 'custom',
                confidence: 'low',
                details: { error: error.message }
            };
        }
    }

    async setupAuthentication(url) {
        console.log('🧙‍♂️ Authentication Setup Wizard');
        console.log('================================');
        console.log(`Target URL: ${url}`);
        console.log('');
        
        // Step 1: Detect authentication type
        const analysis = await this.detectAuthenticationType(url);
        
        console.log('📊 Analysis Results:');
        console.log(`   Requires Authentication: ${analysis.requiresAuth ? 'Yes' : 'No'}`);
        if (analysis.requiresAuth) {
            console.log(`   Suggested Type: ${this.authTypes[analysis.suggestedType].name}`);
            console.log(`   Reason: ${analysis.details.reason}`);
            console.log(`   Confidence: ${analysis.confidence}`);
        }
        console.log('');
        
        if (!analysis.requiresAuth) {
            console.log('✅ No authentication required for this site.');
            return { type: 'none', config: null };
        }
        
        // Step 2: Present authentication options
        console.log('🔐 Available Authentication Methods:');
        Object.entries(this.authTypes).forEach(([key, type], index) => {
            const indicator = key === analysis.suggestedType ? '👈 DETECTED' : '';
            const tempNote = type.temporary ? '(Session-based)' : '(Persistent)';
            console.log(`   ${index + 1}. ${type.name} ${tempNote} - ${type.description} ${indicator}`);
        });
        console.log('');
        
        // Step 3: Get user choice
        const choice = await this.question(`Select authentication method (1-${Object.keys(this.authTypes).length}) [default: suggested]: `);
        const selectedIndex = choice.trim() ? parseInt(choice) - 1 : Object.keys(this.authTypes).indexOf(analysis.suggestedType);
        const selectedType = Object.keys(this.authTypes)[selectedIndex];
        
        if (!selectedType) {
            throw new Error('Invalid selection');
        }
        
        console.log(`\n🔑 Setting up: ${this.authTypes[selectedType].name}`);
        console.log('');
        
        // Step 4: Setup based on type
        const authConfig = await this.setupByType(selectedType, url, analysis);
        
        return {
            type: selectedType,
            config: authConfig,
            temporary: this.authTypes[selectedType].temporary
        };
    }

    async setupByType(type, url, analysis) {
        switch (type) {
            case 'none':
                return null;
                
            case 'basic':
                return await this.setupBasicAuth(url);
                
            case 'sso':
            case 'oauth':
            case 'custom':
                return await this.setupLiveSession(url, type);
                
            case 'api_key':
                return await this.setupApiKey(url);
                
            default:
                throw new Error(`Unknown authentication type: ${type}`);
        }
    }

    async setupBasicAuth(url) {
        console.log('📝 Username/Password Setup');
        console.log('--------------------------');
        
        const username = await this.question('Username: ');
        const password = await this.question('Password: ');
        
        const loginUrl = await this.question(`Login URL [default: ${url}]: `);
        const usernameSelector = await this.question('Username field selector [default: auto-detect]: ');
        const passwordSelector = await this.question('Password field selector [default: auto-detect]: ');
        const submitSelector = await this.question('Submit button selector [default: auto-detect]: ');
        
        // Save the authentication configuration for this domain
        const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        const timestamp = Date.now();
        
        // Ensure directory exists
        if (!fs.existsSync(this.authStatesDir)) {
            fs.mkdirSync(this.authStatesDir, { recursive: true });
        }
        
        const authConfig = {
            method: 'form',
            loginUrl: loginUrl.trim() || url,
            username,
            password,
            selectors: {
                username: usernameSelector.trim() || null,
                password: passwordSelector.trim() || null,
                submit: submitSelector.trim() || null
            },
            domain,
            savedAt: timestamp,
            type: 'basic'
        };
        
        // Save authentication configuration to file
        const configPath = path.join(this.authStatesDir, `auth-config-${domain}-${timestamp}.json`);
        fs.writeFileSync(configPath, JSON.stringify(authConfig, null, 2));
        
        console.log(`💾 Authentication configuration saved to: ${configPath}`);
        console.log('');
        console.log('💡 Note: Credentials are saved locally for this domain.');
        console.log('   The dashboard will now detect this authentication setup.');
        
        return authConfig;
    }

    async setupLiveSession(url, type) {
        console.log(`🌐 ${this.authTypes[type].name} Setup`);
        console.log('-----------------------------');
        console.log('This will open a browser where you can log in manually.');
        console.log('Your session will be captured and used during testing.');
        console.log('⚠️  Sessions are temporary and only valid during test runs.');
        console.log('');
        
        const proceed = await this.question('Proceed with live session capture? (y/n): ');
        if (proceed.toLowerCase() !== 'y') {
            throw new Error('Live session setup cancelled');
        }
        
        console.log('🚀 Opening browser for authentication...');
        
        const browser = await chromium.launch({ 
            headless: false,
            args: ['--start-maximized']
        });
        
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            await page.goto(url, { waitUntil: 'networkidle' });
            
            console.log('');
            console.log('✋ Please complete your login in the browser window.');
            console.log('💡 Navigate through any required authentication steps.');
            console.log('🎯 Once you\'re successfully logged in, press Enter here...');
            
            await this.question('Press Enter when authentication is complete: ');
            
            // Test authentication success
            console.log('🔍 Verifying authentication...');
            await page.reload({ waitUntil: 'networkidle' });
            
            const finalUrl = page.url();
            const title = await page.title();
            
            console.log(`📄 Final URL: ${finalUrl}`);
            console.log(`📋 Page Title: ${title}`);
            
            // Save session data
            const domain = new URL(url).hostname;
            const timestamp = Date.now();
            
            // Ensure directory exists
            if (!fs.existsSync(this.authStatesDir)) {
                fs.mkdirSync(this.authStatesDir, { recursive: true });
            }
            
            // Save storage state for current session
            const sessionPath = path.join(this.authStatesDir, `live-session-${domain}-${timestamp}.json`);
            await context.storageState({ path: sessionPath });
            
            await browser.close();
            
            console.log('✅ Live session captured successfully!');
            console.log(`💾 Session saved to: ${sessionPath}`);
            
            return {
                method: 'live_session',
                sessionPath,
                domain,
                timestamp,
                finalUrl,
                title
            };
            
        } catch (error) {
            await browser.close();
            throw error;
        }
    }

    async setupApiKey(url) {
        console.log('🔑 API Key/Header Setup');
        console.log('-----------------------');
        
        const headerName = await this.question('Header name (e.g., "Authorization", "X-API-Key"): ');
        const headerValue = await this.question('Header value: ');
        
        const additionalHeaders = {};
        
        console.log('\nAdd additional headers? (press Enter to skip)');
        while (true) {
            const name = await this.question('Header name: ');
            if (!name.trim()) break;
            
            const value = await this.question('Header value: ');
            additionalHeaders[name.trim()] = value;
        }
        
        return {
            method: 'headers',
            headers: {
                [headerName]: headerValue,
                ...additionalHeaders
            }
        };
    }

    async listConfigurations() {
        if (!fs.existsSync(this.authStatesDir)) {
            console.log('❌ No authentication configurations found.');
            return;
        }
        
        const files = fs.readdirSync(this.authStatesDir);
        const authFiles = files.filter(f => 
            f.startsWith('auth-config-') || 
            f.startsWith('live-session-') ||
            f.startsWith('auth-info-')
        );
        
        if (authFiles.length === 0) {
            console.log('❌ No authentication configurations found.');
            return;
        }
        
        console.log('🔐 Saved Authentication Configurations:');
        console.log('======================================');
        
        const configs = new Map();
        
        authFiles.forEach(file => {
            try {
                const filePath = path.join(this.authStatesDir, file);
                const data = JSON.parse(fs.readFileSync(filePath));
                
                const domain = file.includes('live-session-') ? 
                    file.split('-')[2] : 
                    (data.domain || 'unknown');
                
                if (!configs.has(domain)) {
                    configs.set(domain, []);
                }
                
                configs.get(domain).push({
                    file,
                    data,
                    type: file.startsWith('live-session-') ? 'Live Session' :
                          file.startsWith('auth-config-') ? 'Persistent Config' : 'Auth Info'
                });
                
            } catch (error) {
                console.log(`❌ Error reading ${file}: ${error.message}`);
            }
        });
        
        configs.forEach((domainConfigs, domain) => {
            console.log(`\n📍 Domain: ${domain}`);
            domainConfigs.forEach(config => {
                console.log(`   ${config.type}: ${config.file}`);
                if (config.data.savedAt || config.data.timestamp) {
                    const date = new Date(config.data.savedAt || config.data.timestamp);
                    console.log(`   📅 Created: ${date.toLocaleString()}`);
                }
                if (config.data.title) {
                    console.log(`   📄 Title: ${config.data.title}`);
                }
            });
        });
    }

    async clearConfiguration(domain) {
        if (!fs.existsSync(this.authStatesDir)) {
            console.log('❌ No authentication configurations found.');
            return;
        }
        
        const files = fs.readdirSync(this.authStatesDir);
        const domainFiles = files.filter(f => f.includes(domain));
        
        if (domainFiles.length === 0) {
            console.log(`❌ No configurations found for domain: ${domain}`);
            return;
        }
        
        console.log(`🗑️  Found ${domainFiles.length} file(s) for domain ${domain}:`);
        domainFiles.forEach(file => console.log(`   - ${file}`));
        
        const confirm = await this.question('\nDelete all configurations for this domain? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('❌ Cancelled.');
            return;
        }
        
        let deleted = 0;
        domainFiles.forEach(file => {
            try {
                fs.unlinkSync(path.join(this.authStatesDir, file));
                deleted++;
            } catch (error) {
                console.log(`❌ Error deleting ${file}: ${error.message}`);
            }
        });
        
        console.log(`✅ Deleted ${deleted} configuration file(s) for ${domain}`);
    }

    close() {
        this.rl.close();
    }
}

// CLI Interface
if (require.main === module) {
    async function main() {
        const args = process.argv.slice(2);
        const wizard = new AuthenticationWizard();
        
        try {
            if (args.length === 0) {
                console.log('Authentication Wizard - Unified Login Setup');
                console.log('==========================================');
                console.log('');
                console.log('Commands:');
                console.log('  setup <url>           Setup authentication for a URL');
                console.log('  detect <url>          Analyze authentication requirements');
                console.log('');
                console.log('Examples:');
                console.log('  node auth-wizard.js setup https://fm-dev.ti.internet2.edu');
                console.log('  node auth-wizard.js detect https://app.example.com');
                process.exit(1);
            }
            
            const command = args[0];
            
            switch (command) {
                case 'setup':
                    if (!args[1]) {
                        console.error('❌ URL required for setup command');
                        process.exit(1);
                    }
                    const config = await wizard.setupAuthentication(args[1]);
                    console.log('\n✅ Authentication setup complete!');
                    console.log(`📊 Type: ${config.type}`);
                    console.log(`⏰ Temporary: ${config.temporary ? 'Yes (session-based)' : 'No (persistent)'}`);
                    break;
                    
                case 'detect':
                    if (!args[1]) {
                        console.error('❌ URL required for detect command');
                        process.exit(1);
                    }
                    const analysis = await wizard.detectAuthenticationType(args[1]);
                    console.log('\n🔍 Authentication Analysis:');
                    console.log('===========================');
                    console.log(`URL: ${args[1]}`);
                    console.log(`Requires Auth: ${analysis.requiresAuth}`);
                    if (analysis.requiresAuth) {
                        console.log(`Suggested Type: ${wizard.authTypes[analysis.suggestedType].name}`);
                        console.log(`Confidence: ${analysis.confidence}`);
                        console.log(`Reason: ${analysis.details.reason}`);
                    }
                    console.log(`Final URL: ${analysis.details.finalUrl}`);
                    console.log(`Page Title: ${analysis.details.title}`);
                    break;
                    
                default:
                    console.error(`❌ Unknown command: ${command}`);
                    process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        } finally {
            wizard.close();
        }
    }
    
    main();
}

module.exports = AuthenticationWizard; 
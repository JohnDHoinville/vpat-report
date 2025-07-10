#!/usr/bin/env node

/**
 * Copy Browser Session Helper
 * Helps transfer authentication from your browser to the testing tools
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

class BrowserSessionCopier {
    constructor() {
        this.authStatesDir = path.join(__dirname, '../reports/auth-states');
    }

    async copyFromBrowser(url, domain = null) {
        const targetDomain = domain || new URL(url).hostname;
        
        console.log('🔐 Browser Session Copier');
        console.log('========================');
        console.log(`Target URL: ${url}`);
        console.log(`Domain: ${targetDomain}`);
        console.log('');
        console.log('Instructions:');
        console.log('1. A browser window will open');
        console.log('2. Navigate to your target site and log in if not already logged in');
        console.log('3. Once you\'re successfully logged in, press Enter in this terminal');
        console.log('4. We\'ll save the authentication state for future use');
        console.log('');
        
        // Launch browser in non-headless mode
        const browser = await chromium.launch({ 
            headless: false,
            args: ['--start-maximized'] 
        });
        
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            // Navigate to the target URL
            console.log('📂 Opening browser and navigating to site...');
            await page.goto(url, { waitUntil: 'networkidle' });
            
            // Wait for user to authenticate manually
            console.log('');
            console.log('✋ Please log in to the site in the browser window that opened.');
            console.log('💾 Once you\'re logged in, press Enter here to save the session...');
            
            // Wait for user input
            await this.waitForEnter();
            
            // Test if authentication worked
            console.log('🔍 Testing authentication...');
            await page.reload({ waitUntil: 'networkidle' });
            
            const title = await page.title();
            const url_after_auth = page.url();
            
            console.log(`📄 Page title: ${title}`);
            console.log(`🔗 Current URL: ${url_after_auth}`);
            
            // Check if we're still on a login page
            const isLoginPage = await page.evaluate(() => {
                const text = document.body.innerText.toLowerCase();
                return text.includes('login') || text.includes('sign in') || text.includes('authenticate');
            });
            
            if (isLoginPage && !title.toLowerCase().includes('dashboard') && !title.toLowerCase().includes('federation')) {
                console.log('⚠️  It looks like you might still be on a login page.');
                console.log('   Please make sure you\'re fully logged in before continuing.');
                console.log('   Press Enter when ready, or Ctrl+C to cancel...');
                await this.waitForEnter();
            }
            
            // Save the authentication state
            console.log('💾 Saving authentication state...');
            
            // Ensure auth-states directory exists
            if (!fs.existsSync(this.authStatesDir)) {
                fs.mkdirSync(this.authStatesDir, { recursive: true });
            }
            
            // Save storage state with cookies and session data
            const storageStatePath = path.join(this.authStatesDir, `auth-storage-${targetDomain}.json`);
            await context.storageState({ path: storageStatePath });
            
            // Also save domain-specific auth info
            const authInfo = {
                domain: targetDomain,
                url: url,
                savedAt: new Date().toISOString(),
                finalUrl: url_after_auth,
                title: title,
                storageStatePath: storageStatePath
            };
            
            const authInfoPath = path.join(this.authStatesDir, `auth-info-${targetDomain}.json`);
            fs.writeFileSync(authInfoPath, JSON.stringify(authInfo, null, 2));
            
            console.log('✅ Authentication state saved successfully!');
            console.log(`📁 Storage state: ${storageStatePath}`);
            console.log(`📋 Auth info: ${authInfoPath}`);
            console.log('');
            console.log('🎯 You can now use the site crawler with authentication:');
            console.log(`   node scripts/site-crawler.js ${url} --use-auth`);
            
        } finally {
            await browser.close();
        }
    }
    
    async waitForEnter() {
        return new Promise((resolve) => {
            process.stdin.once('data', () => {
                resolve();
            });
        });
    }
    
    async listSavedSessions() {
        if (!fs.existsSync(this.authStatesDir)) {
            console.log('❌ No saved authentication sessions found.');
            return;
        }
        
        const files = fs.readdirSync(this.authStatesDir);
        const authInfoFiles = files.filter(f => f.startsWith('auth-info-'));
        
        if (authInfoFiles.length === 0) {
            console.log('❌ No saved authentication sessions found.');
            return;
        }
        
        console.log('🔐 Saved Authentication Sessions:');
        console.log('================================');
        
        authInfoFiles.forEach(file => {
            try {
                const authInfo = JSON.parse(fs.readFileSync(path.join(this.authStatesDir, file)));
                console.log(`📍 Domain: ${authInfo.domain}`);
                console.log(`🔗 URL: ${authInfo.url}`);
                console.log(`📅 Saved: ${new Date(authInfo.savedAt).toLocaleString()}`);
                console.log(`📄 Title: ${authInfo.title}`);
                console.log('---');
            } catch (error) {
                console.log(`❌ Error reading ${file}: ${error.message}`);
            }
        });
    }
    
    async clearSession(domain) {
        const authInfoPath = path.join(this.authStatesDir, `auth-info-${domain}.json`);
        const storageStatePath = path.join(this.authStatesDir, `auth-storage-${domain}.json`);
        
        let cleared = false;
        
        if (fs.existsSync(authInfoPath)) {
            fs.unlinkSync(authInfoPath);
            console.log(`✅ Cleared auth info for ${domain}`);
            cleared = true;
        }
        
        if (fs.existsSync(storageStatePath)) {
            fs.unlinkSync(storageStatePath);
            console.log(`✅ Cleared storage state for ${domain}`);
            cleared = true;
        }
        
        if (!cleared) {
            console.log(`❌ No saved session found for domain: ${domain}`);
        }
    }
}

// CLI usage
if (require.main === module) {
    async function main() {
        const args = process.argv.slice(2);
        const copier = new BrowserSessionCopier();
        
        if (args.length === 0) {
            console.log('Usage: node copy-browser-session.js <command> [options]');
            console.log('');
            console.log('Commands:');
            console.log('  copy <url>           Copy authentication from browser session');
            console.log('  list                 List saved authentication sessions');
            console.log('  clear <domain>       Clear saved session for domain');
            console.log('');
            console.log('Examples:');
            console.log('  node copy-browser-session.js copy https://fm-dev.ti.internet2.edu');
            console.log('  node copy-browser-session.js list');
            console.log('  node copy-browser-session.js clear fm-dev.ti.internet2.edu');
            process.exit(1);
        }
        
        const command = args[0];
        
        try {
            switch (command) {
                case 'copy':
                    if (!args[1]) {
                        console.error('❌ URL required for copy command');
                        process.exit(1);
                    }
                    await copier.copyFromBrowser(args[1], args[2]);
                    break;
                    
                case 'list':
                    await copier.listSavedSessions();
                    break;
                    
                case 'clear':
                    if (!args[1]) {
                        console.error('❌ Domain required for clear command');
                        process.exit(1);
                    }
                    await copier.clearSession(args[1]);
                    break;
                    
                default:
                    console.error(`❌ Unknown command: ${command}`);
                    process.exit(1);
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    }
    
    main();
}

module.exports = BrowserSessionCopier; 
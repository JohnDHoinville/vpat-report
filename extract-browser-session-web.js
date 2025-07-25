const { chromium } = require('playwright');
const fs = require('fs');

let browserInstance = null;
let pageInstance = null;

async function startBrowserSession() {
    console.log('🔧 Starting browser session for web-based capture...');
    
    try {
        browserInstance = await chromium.launch({ 
            headless: false,
            args: [
                '--disable-web-security', 
                '--disable-features=VizDisplayCompositor',
                '--start-maximized'
            ]
        });
        
        const context = await browserInstance.newContext();
        pageInstance = await context.newPage();
        
        console.log('🔧 Opening Federation Manager...');
        await pageInstance.goto('https://fm-dev.ti.internet2.edu');
        await pageInstance.waitForLoadState('networkidle');
        
        const currentUrl = pageInstance.url();
        console.log(`🔧 Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('/login')) {
            console.log('⚠️  Browser opened to login page');
            console.log('🔧 User should log in manually, then click "Successfully Logged In" on web interface');
        } else {
            console.log('✅ Already authenticated!');
        }
        
        return {
            success: true,
            message: 'Browser session started successfully',
            needsLogin: currentUrl.includes('/login'),
            currentUrl: currentUrl
        };
        
    } catch (error) {
        console.error('❌ Error starting browser session:', error.message);
        return {
            success: false,
            message: error.message
        };
    }
}

async function completeBrowserCapture() {
    if (!browserInstance || !pageInstance) {
        throw new Error('No active browser session. Please start capture first.');
    }
    
    try {
        console.log('🔧 Completing session capture...');
        
        // Navigate to ensure we have the latest state
        await pageInstance.goto('https://fm-dev.ti.internet2.edu');
        await pageInstance.waitForLoadState('networkidle');
        const finalUrl = pageInstance.url();
        
        if (finalUrl.includes('/login')) {
            throw new Error('User is still not authenticated. Please log in first.');
        }
        
        console.log('✅ User is authenticated! Extracting session...');
        
        // Get all cookies
        const context = pageInstance.context();
        const cookies = await context.cookies();
        const relevantCookies = cookies.filter(cookie => 
            cookie.domain.includes('ti.internet2.edu') || 
            cookie.domain.includes('internet2.edu')
        );
        
        console.log(`🔧 Found ${relevantCookies.length} relevant cookies`);
        
        // Save cookies to file
        const sessionData = {
            cookies: relevantCookies,
            extractedAt: new Date().toISOString(),
            url: finalUrl,
            userAgent: await pageInstance.evaluate(() => navigator.userAgent),
            extractedBy: 'extract-browser-session-web.js'
        };
        
        const sessionFile = 'fm-session.json';
        
        fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
        console.log(`💾 Session saved to ${sessionFile}`);
        console.log(`📅 Extracted at: ${sessionData.extractedAt}`);
        console.log(`🔗 URL: ${sessionData.url}`);
        console.log(`🍪 Cookies: ${relevantCookies.length}`);
        
        // Verify the file was written correctly
        const verifyData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        console.log(`✅ Verification: File contains ${verifyData.cookies.length} cookies, extracted at ${verifyData.extractedAt}`);
        
        // Analyze available pages
        const pageAnalysis = await pageInstance.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href]'));
            const internalLinks = links.filter(link => {
                const href = link.getAttribute('href');
                return href && (href.startsWith('/') || href.includes('fm-dev.ti.internet2.edu'));
            });
            
            return {
                totalLinks: links.length,
                internalLinks: internalLinks.length,
                sampleLinks: internalLinks.slice(0, 10).map(link => ({
                    href: link.getAttribute('href'),
                    text: link.textContent.trim().substring(0, 40)
                }))
            };
        });
        
        console.log(`📊 Found ${pageAnalysis.totalLinks} total links, ${pageAnalysis.internalLinks} internal links`);
        
        // Close browser
        await browserInstance.close();
        browserInstance = null;
        pageInstance = null;
        
        return {
            success: true,
            message: 'Session captured successfully',
            sessionData: {
                extractedAt: sessionData.extractedAt,
                url: sessionData.url,
                cookies: relevantCookies,  // ← ADD THE ACTUAL COOKIES!
                cookieCount: relevantCookies.length,
                accessiblePages: pageAnalysis.internalLinks,
                username: 'SAML User'  // ← ADD USERNAME TOO
            }
        };
        
    } catch (error) {
        console.error('❌ Error completing capture:', error.message);
        
        // Clean up browser on error
        if (browserInstance) {
            await browserInstance.close();
            browserInstance = null;
            pageInstance = null;
        }
        
        throw error;
    }
}

async function cancelBrowserCapture() {
    if (browserInstance) {
        console.log('🛑 Cancelling browser capture...');
        await browserInstance.close();
        browserInstance = null;
        pageInstance = null;
        return { success: true, message: 'Browser capture cancelled' };
    }
    return { success: true, message: 'No active capture to cancel' };
}

// Export functions for API use
module.exports = {
    startBrowserSession,
    completeBrowserCapture,
    cancelBrowserCapture
};

// CLI support
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            startBrowserSession().then(result => {
                console.log('Result:', result);
                if (!result.success) process.exit(1);
            }).catch(error => {
                console.error('Error:', error.message);
                process.exit(1);
            });
            break;
            
        case 'complete':
            completeBrowserCapture().then(result => {
                console.log('Result:', result);
                process.exit(0);
            }).catch(error => {
                console.error('Error:', error.message);
                process.exit(1);
            });
            break;
            
        case 'cancel':
            cancelBrowserCapture().then(result => {
                console.log('Result:', result);
                process.exit(0);
            }).catch(error => {
                console.error('Error:', error.message);
                process.exit(1);
            });
            break;
            
        default:
            console.log('Usage: node extract-browser-session-web.js [start|complete|cancel]');
            process.exit(1);
    }
} 
const { chromium } = require('playwright');
const fs = require('fs');

async function extractBrowserSession() {
    console.log('🔧 Browser Session Extractor for Federation Manager');
    console.log('🔧 This will help you share your authenticated session with the crawler');
    console.log('');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        console.log('🔧 Opening Federation Manager...');
        await page.goto('https://fm-dev.ti.internet2.edu');
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        console.log(`🔧 Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('/login')) {
            console.log('⚠️  You are not logged in yet.');
            console.log('🔧 Please log in manually in the browser window that opened.');
            console.log('🔧 After logging in, press Enter to continue...');
            
            // Wait for user to press Enter
            await new Promise(resolve => {
                process.stdin.once('data', () => resolve());
            });
        }
        
        // Check again after potential login
        await page.goto('https://fm-dev.ti.internet2.edu');
        await page.waitForLoadState('networkidle');
        const finalUrl = page.url();
        
        if (finalUrl.includes('/login')) {
            console.log('❌ Still not authenticated. Please try logging in manually first.');
            return;
        }
        
        console.log('✅ Authenticated! Extracting session...');
        
        // Get all cookies
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
            userAgent: await page.evaluate(() => navigator.userAgent),
            extractedBy: 'extract-browser-session.js'
        };
        
        const sessionFile = 'fm-session.json';
        
        try {
            fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
            console.log(`💾 Session saved to ${sessionFile}`);
            console.log(`📅 Extracted at: ${sessionData.extractedAt}`);
            console.log(`🔗 URL: ${sessionData.url}`);
            console.log(`🍪 Cookies: ${relevantCookies.length}`);
            
            // Verify the file was written correctly
            const verifyData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
            console.log(`✅ Verification: File contains ${verifyData.cookies.length} cookies, extracted at ${verifyData.extractedAt}`);
        } catch (error) {
            console.error('❌ Error saving session file:', error.message);
            throw error;
        }
        
        // Show how to use it
        console.log('');
        console.log('🎯 To use this session with your crawler:');
        console.log('1. The session file has been saved as fm-session.json');
        console.log('2. Your crawler will automatically try to use this session');
        console.log('3. Run your crawler again - it should now access authenticated pages!');
        
        // Analyze what pages are available
        console.log('');
        console.log('🔍 Analyzing available authenticated pages...');
        
        const pageAnalysis = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href]'));
            const internalLinks = links.filter(link => {
                const href = link.getAttribute('href');
                return href && (href.startsWith('/') || href.includes('fm-dev.ti.internet2.edu'));
            });
            
            return {
                totalLinks: links.length,
                internalLinks: internalLinks.length,
                sampleLinks: internalLinks.slice(0, 15).map(link => ({
                    href: link.getAttribute('href'),
                    text: link.textContent.trim().substring(0, 40)
                }))
            };
        });
        
        console.log(`📊 Found ${pageAnalysis.totalLinks} total links, ${pageAnalysis.internalLinks} internal links`);
        console.log('📋 Sample internal links:');
        pageAnalysis.sampleLinks.forEach(link => {
            console.log(`   ${link.href} - "${link.text}"`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

extractBrowserSession().catch(console.error); 
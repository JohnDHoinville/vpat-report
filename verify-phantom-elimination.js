// VERIFY PHANTOM ELIMINATION - Confirm the phantom is completely gone
console.log('✅ VERIFICATION: Checking phantom elimination...');

setTimeout(() => {
    console.log('🔍 VERIFICATION: Scanning for phantom modals...');
    
    // Check for all possible phantom modals
    const phantomSelectors = [
        '[x-show="showCreateCrawler"]',
        '[x-show="showAdvancedCrawlerOptions"]', 
        '[x-show="showCrawlerPages"]'
    ];
    
    let phantomsFound = 0;
    
    phantomSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            const isVisible = element.offsetParent !== null && 
                            !element.classList.contains('hidden') &&
                            element.style.display !== 'none';
            
            console.log(`🔍 VERIFICATION: ${selector}:`);
            console.log(`  - Found: ${elements.length} elements`);
            console.log(`  - Visible: ${isVisible}`);
            console.log(`  - Display: ${element.style.display}`);
            console.log(`  - Classes: ${element.className}`);
            
            if (isVisible) {
                phantomsFound++;
                console.log(`🚨 VERIFICATION: PHANTOM STILL VISIBLE!`);
            }
        });
    });
    
    if (phantomsFound === 0) {
        console.log('🎉 VERIFICATION: SUCCESS! No phantom modals detected!');
        console.log('✅ VERIFICATION: Nuclear DOM fix has completely eliminated all phantoms');
    } else {
        console.log(`❌ VERIFICATION: ${phantomsFound} phantom(s) still detected`);
    }
    
}, 3000); // Wait 3 seconds for full page load

console.log('⏳ VERIFICATION: Will check phantom status in 3 seconds...');

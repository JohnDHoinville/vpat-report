// TEST SUPER INTERCEPTOR - Load the new interceptor via console
console.log('🚀 TESTING: Loading Super Interceptor via console...');

let script = document.createElement('script');
script.src = 'super-interceptor.js?' + new Date().getTime();
script.onload = () => {
    console.log('✅ Super Interceptor loaded successfully via console');
    
    // Test results after 2 seconds
    setTimeout(() => {
        console.log('🧪 SUPER INTERCEPTOR TEST RESULTS:');
        
        // Check if CSS was injected
        const styles = Array.from(document.head.querySelectorAll('style'));
        const phantomBlockingCSS = styles.find(style => 
            style.textContent.includes('showCreateCrawler') && 
            style.textContent.includes('display: none !important')
        );
        
        console.log('- Phantom-blocking CSS injected:', !!phantomBlockingCSS);
        
        // Check phantom modals
        const phantomModals = document.querySelectorAll('[x-show*="showCreateCrawler"], [x-show*="showAdvancedCrawlerOptions"], [x-show*="showCrawlerPages"]');
        console.log('- Phantom modals found:', phantomModals.length);
        
        phantomModals.forEach((modal, index) => {
            console.log(`- Phantom ${index + 1}: display = ${modal.style.display}, visible = ${modal.offsetParent !== null}`);
        });
        
    }, 2000);
};
script.onerror = () => console.error('❌ Failed to load Super Interceptor');
document.head.appendChild(script);

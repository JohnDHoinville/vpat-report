// PHANTOM SOURCE DETECTOR - Find exactly what's calling the phantom creator
console.log('🔍 PHANTOM SOURCE DETECTOR: Hunting for the auto-caller...');

// Override console.log to track all calls
const originalConsoleLog = console.log;

// Install call tracker for openCreateCrawlerModal
function installCallTracker() {
    console.log('🔍 DETECTOR: Installing call tracker...');
    
    const dashboard = window.dashboard || window.dashboardHelpers;
    
    if (dashboard && dashboard.openCreateCrawlerModal) {
        const originalFunction = dashboard.openCreateCrawlerModal;
        
        dashboard.openCreateCrawlerModal = function(type) {
            console.log('🚨 PHANTOM SOURCE: openCreateCrawlerModal called!');
            console.log('🚨 PHANTOM SOURCE: Call type:', type);
            console.log('🚨 PHANTOM SOURCE: Full stack trace:');
            
            // Get detailed stack trace
            const error = new Error();
            const stackLines = error.stack.split('\n');
            
            stackLines.forEach((line, index) => {
                console.log(`🚨 STACK ${index}:`, line.trim());
            });
            
            // Check if this is a legitimate button click
            const stack = error.stack;
            const isButtonClick = stack.includes('click') || 
                                 stack.includes('HTMLElement') ||
                                 stack.includes('event') ||
                                 stack.includes('@click');
            
            console.log('🚨 PHANTOM SOURCE: Is legitimate button click?', isButtonClick);
            
            if (!isButtonClick) {
                console.log('🛑 PHANTOM SOURCE: BLOCKING UNAUTHORIZED CALL!');
                console.log('🛑 PHANTOM SOURCE: This call is NOT from a button click - blocking phantom creation');
                return; // Block the call
            }
            
            console.log('✅ PHANTOM SOURCE: Legitimate button click detected - allowing modal');
            return originalFunction.call(this, type);
        };
        
        console.log('✅ DETECTOR: Call tracker installed for openCreateCrawlerModal');
    } else {
        console.log('⏳ DETECTOR: Dashboard not ready, retrying...');
        setTimeout(installCallTracker, 100);
    }
}

// Also track property setters
function installPropertyTracker() {
    console.log('🔍 DETECTOR: Installing property tracker...');
    
    const dashboard = window.dashboard || window.dashboardHelpers;
    
    if (dashboard) {
        let _showCreateCrawler = false;
        
        Object.defineProperty(dashboard, 'showCreateCrawler', {
            get() {
                return _showCreateCrawler;
            },
            set(value) {
                if (value === true) {
                    console.log('🚨 PROPERTY SOURCE: showCreateCrawler being set to TRUE!');
                    console.log('🚨 PROPERTY SOURCE: Stack trace:');
                    
                    const error = new Error();
                    const stackLines = error.stack.split('\n');
                    
                    stackLines.forEach((line, index) => {
                        console.log(`🚨 PROP STACK ${index}:`, line.trim());
                    });
                }
                
                _showCreateCrawler = value;
            }
        });
        
        console.log('✅ DETECTOR: Property tracker installed for showCreateCrawler');
    } else {
        console.log('⏳ DETECTOR: Dashboard not ready for property tracking, retrying...');
        setTimeout(installPropertyTracker, 100);
    }
}

// Start detection
installCallTracker();
installPropertyTracker();

console.log('🔍 PHANTOM SOURCE DETECTOR: Detection system active!'); 
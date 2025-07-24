// PHANTOM MODAL DETECTOR - Find the real culprit behind the auto-opening modal
console.log('👻 PHANTOM DETECTOR: Hunting for the mysterious auto-opening modal...');

// List of all possible modal suspects
const MODAL_SUSPECTS = [
    'showCrawlerPages',
    'showViewPages', 
    'showCreateCrawler',
    'showStartDiscovery',
    'showAutomatedTestModal',
    'showManualTestingModal',
    'showRequirementDetailsModal',
    'showTestInstanceModal',
    'showTesterAssignmentModal',
    'showTestConfigurationModal',
    'showDiscoveredPagesModal',
    'showAddAuthConfigModal',
    'showEditAuthConfigModal'
];

function detectPhantomModal() {
    console.log('👻 PHANTOM DETECTOR: Starting comprehensive modal scan...');
    
    const dashboard = window.dashboard || window.dashboardHelpers;
    
    if (dashboard) {
        console.log('👻 PHANTOM DETECTOR: Dashboard found, checking all modal states...');
        
        MODAL_SUSPECTS.forEach(modalName => {
            const value = dashboard[modalName];
            if (value === true) {
                console.log(`🚨 PHANTOM DETECTOR: FOUND ACTIVE MODAL - ${modalName} = ${value}`);
                
                // Check DOM for this modal
                const modalElement = document.querySelector(`[x-show="${modalName}"]`) ||
                                   document.querySelector(`[x-show*="${modalName}"]`);
                
                if (modalElement) {
                    const computedStyle = window.getComputedStyle(modalElement);
                    const isVisible = computedStyle.display !== 'none' && 
                                     computedStyle.visibility !== 'hidden' &&
                                     computedStyle.opacity !== '0';
                    
                    console.log(`👻 PHANTOM DETECTOR: Modal DOM for ${modalName}:`, {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        opacity: computedStyle.opacity,
                        isVisible: isVisible,
                        element: modalElement
                    });
                }
            } else if (value !== undefined) {
                console.log(`✅ PHANTOM DETECTOR: ${modalName} = ${value}`);
            }
        });
        
        // Check for any visible modals in DOM
        console.log('👻 PHANTOM DETECTOR: Scanning DOM for visible modals...');
        
        const allModals = document.querySelectorAll('[x-show*="show"]');
        allModals.forEach((modal, index) => {
            const computedStyle = window.getComputedStyle(modal);
            const isVisible = computedStyle.display !== 'none' && 
                             computedStyle.visibility !== 'hidden' &&
                             computedStyle.opacity !== '0';
            
            if (isVisible) {
                console.log(`🚨 PHANTOM DETECTOR: VISIBLE MODAL FOUND #${index}:`, {
                    xShow: modal.getAttribute('x-show'),
                    display: computedStyle.display,
                    zIndex: computedStyle.zIndex,
                    element: modal
                });
            }
        });
        
    } else {
        console.log('❌ PHANTOM DETECTOR: No dashboard found');
    }
}

// Run detection immediately and then periodically
detectPhantomModal();

// Run again after a delay to catch late-loading modals
setTimeout(detectPhantomModal, 2000);
setTimeout(detectPhantomModal, 5000);

console.log('👻 PHANTOM DETECTOR: Detection complete. Check results above.');

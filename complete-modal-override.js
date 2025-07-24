// COMPLETE MODAL OVERRIDE - Bypass everything and create working modal
console.log('🚨 COMPLETE OVERRIDE: Taking full control of crawler modal');

// Disable all existing blocking first
const originalConsoleLog = console.log;
let blockingDisabled = false;

function disableAllBlocking() {
    if (blockingDisabled) return;
    blockingDisabled = true;
    
    console.log('🛑 DISABLING ALL MODAL BLOCKING');
    
    // Stop MutationObserver if it exists
    if (window.modalObserver) {
        window.modalObserver.disconnect();
        console.log('🛑 Disconnected modal observer');
    }
    
    // Clear any intervals that might be force-closing
    for (let i = 1; i < 99999; i++) {
        clearInterval(i);
        clearTimeout(i);
    }
    
    console.log('🛑 Cleared all intervals and timeouts');
}

// Get dashboard data and create working modal
function createWorkingModal() {
    console.log('🔧 CREATING WORKING MODAL...');
    
    // Get the dashboard instance and data
    const dashboardEl = document.querySelector('[x-data*="dashboard"]');
    if (!dashboardEl || !dashboardEl._x_dataStack) {
        console.error('❌ No dashboard data found');
        return;
    }
    
    const dashboard = dashboardEl._x_dataStack[0];
    console.log('✅ Got dashboard data:', dashboard);
    
    // Get the crawler data (we know it has 14 pages)
    const crawlerPages = dashboard.crawlerPages || [];
    const selectedCrawler = dashboard.selectedCrawler;
    
    console.log('📊 Crawler Pages:', crawlerPages.length);
    console.log('🕷️ Selected Crawler:', selectedCrawler?.name);
    
    // Create our own modal HTML with real data
    const modalHTML = `
        <div id="override-crawler-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        ">
            <div style="
                background: white;
                border-radius: 8px;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                max-width: 1152px;
                width: 100%;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
            ">
                <!-- Header -->
                <div style="
                    padding: 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                ">
                    <div>
                        <h3 style="
                            font-size: 1.125rem;
                            font-weight: 600;
                            color: #111827;
                            margin: 0;
                        ">Discovered Pages</h3>
                        <p style="
                            font-size: 0.875rem;
                            color: #6b7280;
                            margin: 0.25rem 0 0 0;
                        ">
                            ${selectedCrawler?.name || 'Unknown Crawler'} - ${crawlerPages.length} pages found
                        </p>
                    </div>
                    <button onclick="closeOverrideModal()" style="
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        color: #6b7280;
                        cursor: pointer;
                        padding: 0.5rem;
                    ">×</button>
                </div>
                
                <!-- Content -->
                <div style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem;
                ">
                    ${crawlerPages.length > 0 ? `
                        <div style="
                            border: 1px solid #e5e7eb;
                            border-radius: 6px;
                            overflow: hidden;
                        ">
                            <table style="
                                width: 100%;
                                border-collapse: collapse;
                            ">
                                <thead style="background: #f9fafb;">
                                    <tr>
                                        <th style="
                                            padding: 0.75rem;
                                            text-align: left;
                                            font-weight: 500;
                                            color: #374151;
                                            border-bottom: 1px solid #e5e7eb;
                                        ">URL</th>
                                        <th style="
                                            padding: 0.75rem;
                                            text-align: left;
                                            font-weight: 500;
                                            color: #374151;
                                            border-bottom: 1px solid #e5e7eb;
                                        ">Title</th>
                                        <th style="
                                            padding: 0.75rem;
                                            text-align: left;
                                            font-weight: 500;
                                            color: #374151;
                                            border-bottom: 1px solid #e5e7eb;
                                        ">Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${crawlerPages.map((page, index) => `
                                        <tr style="${index % 2 === 0 ? 'background: #f9fafb;' : 'background: white;'}">
                                            <td style="
                                                padding: 0.75rem;
                                                border-bottom: 1px solid #e5e7eb;
                                                font-family: monospace;
                                                font-size: 0.875rem;
                                            ">
                                                <a href="${page.url}" target="_blank" style="
                                                    color: #2563eb;
                                                    text-decoration: none;
                                                ">
                                                    ${page.url}
                                                </a>
                                            </td>
                                            <td style="
                                                padding: 0.75rem;
                                                border-bottom: 1px solid #e5e7eb;
                                            ">
                                                ${page.title || 'No title'}
                                            </td>
                                            <td style="
                                                padding: 0.75rem;
                                                border-bottom: 1px solid #e5e7eb;
                                            ">
                                                ${page.page_type || 'Unknown'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div style="
                            text-align: center;
                            padding: 3rem;
                            color: #6b7280;
                        ">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                            <h3 style="font-size: 1.125rem; margin: 0 0 0.5rem 0;">No Pages Found</h3>
                            <p style="margin: 0;">This crawler hasn't found any pages yet.</p>
                        </div>
                    `}
                </div>
                
                <!-- Footer -->
                <div style="
                    padding: 1.5rem;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div style="color: #6b7280; font-size: 0.875rem;">
                        Total: ${crawlerPages.length} pages
                    </div>
                    <button onclick="closeOverrideModal()" style="
                        background: #6b7280;
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing override modal
    const existing = document.getElementById('override-crawler-modal');
    if (existing) {
        existing.remove();
    }
    
    // Insert the modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    console.log('✅ WORKING MODAL CREATED with', crawlerPages.length, 'pages');
}

// Close function
function closeOverrideModal() {
    console.log('🚪 Closing override modal');
    const modal = document.getElementById('override-crawler-modal');
    if (modal) {
        modal.remove();
        console.log('✅ Modal closed');
    }
}

// Make functions global
window.disableAllBlocking = disableAllBlocking;
window.createWorkingModal = createWorkingModal;
window.closeOverrideModal = closeOverrideModal;

// Auto-disable blocking and show modal
setTimeout(() => {
    disableAllBlocking();
    createWorkingModal();
}, 100);

console.log('🔧 COMPLETE OVERRIDE loaded');
console.log('🔧 Available functions:');
console.log('  - disableAllBlocking() - Stop all modal blocking');
console.log('  - createWorkingModal() - Show working modal with data');
console.log('  - closeOverrideModal() - Close the modal'); 
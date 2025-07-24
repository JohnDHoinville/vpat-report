// FIXED DATA MODAL - Proper data extraction and deduplication
console.log('🔧 FIXED DATA MODAL: Extracting real crawler data');

// Get dashboard data and process correctly
function createFixedModal() {
    console.log('🔧 CREATING FIXED MODAL with proper data...');
    
    // Get the dashboard instance
    const dashboardEl = document.querySelector('[x-data*="dashboard"]');
    if (!dashboardEl || !dashboardEl._x_dataStack) {
        console.error('❌ No dashboard data found');
        return;
    }
    
    const dashboard = dashboardEl._x_dataStack[0];
    console.log('✅ Got dashboard data');
    
    // Get raw crawler data
    const rawCrawlerPages = dashboard.crawlerPages || [];
    const selectedCrawler = dashboard.selectedCrawler;
    
    console.log('📊 Raw Crawler Pages:', rawCrawlerPages);
    console.log('🕷️ Selected Crawler:', selectedCrawler?.name);
    
    // Process and deduplicate pages
    const seenUrls = new Set();
    const uniquePages = [];
    
    rawCrawlerPages.forEach((page, index) => {
        const url = page.url || page.page_url || page.discovered_url;
        if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            uniquePages.push({
                id: page.id || index,
                url: url,
                title: page.title || page.page_title || 'No title',
                type: page.page_type || page.type || 'Unknown',
                status_code: page.status_code || 'Unknown'
            });
        }
    });
    
    console.log('✅ Processed', uniquePages.length, 'unique pages from', rawCrawlerPages.length, 'raw entries');
    
    // Log the actual URLs found
    uniquePages.forEach((page, i) => {
        console.log(`  ${i + 1}. ${page.url} (${page.type}) - ${page.title}`);
    });
    
    // Create modal with fixed data
    const modalHTML = `
        <div id="fixed-crawler-modal" style="
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
                            ${selectedCrawler?.name || 'Unknown Crawler'} - ${uniquePages.length} unique pages found
                        </p>
                    </div>
                    <button onclick="closeFixedModal()" style="
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
                    ${uniquePages.length > 0 ? `
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
                                            width: 50%;
                                        ">URL</th>
                                        <th style="
                                            padding: 0.75rem;
                                            text-align: left;
                                            font-weight: 500;
                                            color: #374151;
                                            border-bottom: 1px solid #e5e7eb;
                                            width: 30%;
                                        ">Title</th>
                                        <th style="
                                            padding: 0.75rem;
                                            text-align: left;
                                            font-weight: 500;
                                            color: #374151;
                                            border-bottom: 1px solid #e5e7eb;
                                            width: 10%;
                                        ">Type</th>
                                        <th style="
                                            padding: 0.75rem;
                                            text-align: left;
                                            font-weight: 500;
                                            color: #374151;
                                            border-bottom: 1px solid #e5e7eb;
                                            width: 10%;
                                        ">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${uniquePages.map((page, index) => `
                                        <tr style="${index % 2 === 0 ? 'background: #f9fafb;' : 'background: white;'}">
                                            <td style="
                                                padding: 0.75rem;
                                                border-bottom: 1px solid #e5e7eb;
                                                font-family: monospace;
                                                font-size: 0.875rem;
                                                word-break: break-all;
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
                                                font-size: 0.875rem;
                                            ">
                                                ${page.title || 'No title'}
                                            </td>
                                            <td style="
                                                padding: 0.75rem;
                                                border-bottom: 1px solid #e5e7eb;
                                                font-size: 0.875rem;
                                            ">
                                                <span style="
                                                    padding: 0.25rem 0.5rem;
                                                    background: #f3f4f6;
                                                    border-radius: 4px;
                                                    font-size: 0.75rem;
                                                ">
                                                    ${page.type}
                                                </span>
                                            </td>
                                            <td style="
                                                padding: 0.75rem;
                                                border-bottom: 1px solid #e5e7eb;
                                                font-size: 0.875rem;
                                            ">
                                                <span style="
                                                    padding: 0.25rem 0.5rem;
                                                    background: ${page.status_code && page.status_code.toString().startsWith('2') ? '#dcfce7' : '#fef3c7'};
                                                    color: ${page.status_code && page.status_code.toString().startsWith('2') ? '#166534' : '#92400e'};
                                                    border-radius: 4px;
                                                    font-size: 0.75rem;
                                                ">
                                                    ${page.status_code}
                                                </span>
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
                        Total: ${uniquePages.length} unique pages (filtered from ${rawCrawlerPages.length} raw entries)
                    </div>
                    <button onclick="closeFixedModal()" style="
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
    
    // Remove existing modals
    const existing1 = document.getElementById('override-crawler-modal');
    const existing2 = document.getElementById('fixed-crawler-modal');
    if (existing1) existing1.remove();
    if (existing2) existing2.remove();
    
    // Insert the modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    console.log('✅ FIXED MODAL CREATED with', uniquePages.length, 'unique pages');
    return uniquePages;
}

// Close function
function closeFixedModal() {
    console.log('🚪 Closing fixed modal');
    const modal = document.getElementById('fixed-crawler-modal');
    if (modal) {
        modal.remove();
        console.log('✅ Fixed modal closed');
    }
}

// Make functions global
window.createFixedModal = createFixedModal;
window.closeFixedModal = closeFixedModal;

// Auto-show the fixed modal
setTimeout(() => {
    createFixedModal();
}, 100);

console.log('🔧 FIXED DATA MODAL loaded');
console.log('🔧 Available functions:');
console.log('  - createFixedModal() - Show modal with deduplicated data');
console.log('  - closeFixedModal() - Close the modal'); 

        // Enhanced violation analysis support functions
        function copyToClipboard(text, type) {
            navigator.clipboard.writeText(text).then(() => {
                console.log('Copied', type, ':', text.substring(0, 50));
                const event = window.event;
                if (event && event.target) {
                    const originalText = event.target.textContent;
                    event.target.textContent = '✓ Copied';
                    event.target.style.background = '#10b981';
                    setTimeout(() => {
                        event.target.textContent = originalText;
                        event.target.style.background = '#e5e7eb';
                    }, 1000);
                }
            }).catch(() => {
                console.error('Failed to copy', type);
            });
        }

        function viewScreenshot(screenshotPath) {
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
            const img = document.createElement('img');
            img.src = '/reports/contrast-screenshots/' + screenshotPath;
            img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);';
            modal.appendChild(img);
            document.body.appendChild(modal);
            modal.onclick = () => document.body.removeChild(modal);
        }

        function inspectElement(pageUrl, selector, xpath, elementText, elementHtml) {
            alert('Element Inspector
Page: ' + pageUrl + '
Selector: ' + selector + '
XPath: ' + xpath + '
Text: ' + elementText);
        }

        function generateViolationReport(resultId, violationIndex) {
            const reportText = 'ACCESSIBILITY VIOLATION REPORT
Generated: ' + new Date().toLocaleString() + '
Test Result ID: ' + resultId + '
Violation Index: ' + (violationIndex + 1);
            const blob = new Blob([reportText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'violation-report-' + resultId + '-' + (violationIndex + 1) + '-' + Date.now() + '.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }

        function exportViolations(resultId, testType) {
            alert('Export feature: ' + testType + ' violations for ' + resultId);
        }

        function captureScreenshots(resultId, testType) {
            alert('Screenshot capture feature: ' + testType + ' for ' + resultId);
        }


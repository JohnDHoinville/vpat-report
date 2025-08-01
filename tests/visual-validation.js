/**
 * Simplified Visual Validation for Manual Testing UI
 * 
 * This script performs basic visual validation of the manual testing components
 * without the complexity of full Playwright visual regression testing.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class VisualValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Initializing visual validation...');
    this.browser = await puppeteer.launch({ 
      headless: false, // Show browser for visual confirmation
      defaultViewport: { width: 1366, height: 768 }
    });
    this.page = await this.browser.newPage();
    
    // Set up console logging
    this.page.on('console', msg => {
      if (msg.text().includes('✅') || msg.text().includes('❌')) {
        console.log(`🖥️  ${msg.text()}`);
      }
    });
  }

  async validateComponent(testName, setupFunction, screenshotName) {
    console.log(`\n🔍 Testing: ${testName}`);
    
    try {
      // Navigate to dashboard
      await this.page.goto('http://localhost:8080/dashboard.html', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for essential scripts to load
      await this.page.waitForFunction(() => {
        return window.ReactComponents && window.manualTestingTest;
      }, { timeout: 15000 });

      // Execute setup function
      if (setupFunction) {
        await this.page.evaluate(setupFunction);
      }

      // Wait for rendering
      await this.page.waitForTimeout(2000);

      // Take screenshot
      const screenshotPath = path.join(__dirname, 'screenshots', `${screenshotName}.png`);
      await this.page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });

      this.results.push({
        test: testName,
        status: 'passed',
        screenshot: screenshotPath
      });

      console.log(`✅ ${testName} - Screenshot saved to ${screenshotName}.png`);

    } catch (error) {
      console.error(`❌ ${testName} - Failed: ${error.message}`);
      this.results.push({
        test: testName,
        status: 'failed',
        error: error.message
      });
    }
  }

  async runAllTests() {
    // Create screenshots directory
    await fs.mkdir(path.join(__dirname, 'screenshots'), { recursive: true });

    // Test 1: No Session State
    await this.validateComponent(
      'Manual Testing Interface - No Session',
      () => {
        window.alpineReactBridge.setState('selectedProject', {
          id: 'test-project',
          name: 'Visual Test Project'
        });
        window.alpineReactBridge.setState('manualTestingSession', null);
        return window.manualTestingTest.renderInterface();
      },
      'no-session'
    );

    // Test 2: Active Session with Assignments
    await this.validateComponent(
      'Manual Testing Interface - Active Session',
      () => {
        return window.manualTestingTest.runDemo();
      },
      'active-session'
    );

    // Wait for demo to complete
    await this.page.waitForTimeout(3000);

    // Test 3: Test Review Modal
    await this.validateComponent(
      'Test Review Modal',
      () => {
        return window.manualTestingTest.openTestReview();
      },
      'test-review-modal'
    );

    // Test 4: Mobile Viewport
    await this.page.setViewport({ width: 375, height: 667 });
    await this.validateComponent(
      'Mobile Responsive Design',
      () => {
        window.manualTestingTest.cleanup();
        return window.manualTestingTest.runDemo();
      },
      'mobile-responsive'
    );

    // Test 5: Tablet Viewport
    await this.page.setViewport({ width: 768, height: 1024 });
    await this.validateComponent(
      'Tablet Responsive Design',
      () => {
        window.manualTestingTest.cleanup();
        return window.manualTestingTest.runDemo();
      },
      'tablet-responsive'
    );

    // Reset viewport
    await this.page.setViewport({ width: 1366, height: 768 });

    // Test 6: Component State Variations
    await this.validateComponent(
      'Loading State',
      () => {
        window.alpineReactBridge.setState('loading', true);
        return window.manualTestingTest.renderInterface();
      },
      'loading-state'
    );

    await this.validateComponent(
      'Empty State',
      () => {
        window.alpineReactBridge.setState('loading', false);
        window.alpineReactBridge.setState('selectedProject', {
          id: 'empty-project',
          name: 'Empty Project'
        });
        window.alpineReactBridge.setState('manualTestingSession', {
          id: 'empty-session',
          name: 'Empty Session'
        });
        window.alpineReactBridge.setState('manualTestingAssignments', []);
        return window.manualTestingTest.renderInterface();
      },
      'empty-state'
    );
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      results: this.results
    };

    const reportPath = path.join(__dirname, 'visual-validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 Visual Validation Report:');
    console.log(`   Total Tests: ${report.total}`);
    console.log(`   Passed: ${report.passed}`);
    console.log(`   Failed: ${report.failed}`);
    console.log(`   Report saved to: ${reportPath}`);

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function runVisualValidation() {
  const validator = new VisualValidator();
  
  try {
    await validator.init();
    await validator.runAllTests();
    const report = await validator.generateReport();
    
    // Exit with proper code
    process.exit(report.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Visual validation failed:', error);
    process.exit(1);
  } finally {
    await validator.cleanup();
  }
}

// Check if running directly
if (require.main === module) {
  runVisualValidation();
}

module.exports = VisualValidator; 
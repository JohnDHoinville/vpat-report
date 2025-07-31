#!/usr/bin/env node

/**
 * React-Alpine Integration Test Script
 * 
 * This script tests the React portal system and Alpine.js coexistence
 * by running automated tests on the bridge functionality.
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

class ReactAlpineIntegrationTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.serverProcess = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async startServer() {
    console.log('🚀 Starting HTTP server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npx', ['http-server', '.', '-p', '8080', '--silent'], {
        stdio: 'pipe'
      });

      this.serverProcess.on('error', reject);
      
      // Wait for server to be ready
      const checkServer = () => {
        http.get('http://localhost:8080', (res) => {
          console.log('✅ HTTP server is ready');
          resolve();
        }).on('error', () => {
          setTimeout(checkServer, 500);
        });
      };
      
      setTimeout(checkServer, 1000);
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      console.log('🛑 HTTP server stopped');
    }
  }

  async initBrowser() {
    console.log('🌐 Starting browser...');
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI
      devtools: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        console.log(`❌ Browser Error: ${text}`);
      } else if (text.includes('React') || text.includes('Alpine') || text.includes('Bridge')) {
        console.log(`📋 Browser Log: ${text}`);
      }
    });

    // Handle page errors
    this.page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
      this.testResults.errors.push(`Page Error: ${error.message}`);
    });

    console.log('✅ Browser initialized');
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }

  async loadTestPage() {
    console.log('📄 Loading test page...');
    
    try {
      await this.page.goto('http://localhost:8080/test-react-alpine-bridge.html', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      console.log('✅ Test page loaded');
      return true;
    } catch (error) {
      console.error('❌ Failed to load test page:', error.message);
      this.testResults.errors.push(`Page Load Error: ${error.message}`);
      return false;
    }
  }

  async waitForFrameworks() {
    console.log('⏳ Waiting for frameworks to initialize...');
    
    try {
      // Wait for Alpine.js
      await this.page.waitForFunction(() => window.Alpine, { timeout: 10000 });
      console.log('✅ Alpine.js loaded');

      // Wait for React components
      await this.page.waitForFunction(() => window.ReactComponents, { timeout: 10000 });
      console.log('✅ React components loaded');

      // Wait for bridge
      await this.page.waitForFunction(() => window.alpineReactBridge, { timeout: 10000 });
      console.log('✅ Alpine-React bridge loaded');

      return true;
    } catch (error) {
      console.error('❌ Framework initialization timeout:', error.message);
      this.testResults.errors.push(`Framework Timeout: ${error.message}`);
      return false;
    }
  }

  async test(name, testFunction) {
    console.log(`\n🧪 Testing: ${name}`);
    
    try {
      const result = await testFunction();
      if (result) {
        console.log(`✅ ${name} - PASSED`);
        this.testResults.passed++;
      } else {
        console.log(`❌ ${name} - FAILED`);
        this.testResults.failed++;
      }
      return result;
    } catch (error) {
      console.error(`❌ ${name} - ERROR:`, error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`${name}: ${error.message}`);
      return false;
    }
  }

  async testReactComponentRegistration() {
    return await this.test('React Component Registration', async () => {
      const result = await this.page.evaluate(() => {
        return window.ReactComponents && 
               window.ReactComponents.bridge && 
               window.ReactComponents.bridge.componentRegistry.has('TestComponent');
      });
      
      return result;
    });
  }

  async testStaticComponentRendering() {
    return await this.test('Static Component Rendering', async () => {
      // Wait a bit for static component to render
      await this.page.waitForTimeout(2000);
      
      const result = await this.page.evaluate(() => {
        const container = document.getElementById('static-react-component');
        return container && container.children.length > 0;
      });
      
      return result;
    });
  }

  async testDynamicComponentRendering() {
    return await this.test('Dynamic Component Rendering', async () => {
      // Click the mount button for portal 1
      await this.page.click('button:has-text("Mount")');
      
      // Wait for component to render
      await this.page.waitForTimeout(1000);
      
      const result = await this.page.evaluate(() => {
        const portal = document.getElementById('react-portal-1');
        return portal && portal.children.length > 0;
      });
      
      return result;
    });
  }

  async testStateSync() {
    return await this.test('State Synchronization', async () => {
      // Set a value in Alpine
      await this.page.evaluate(() => {
        window.bridgeState.set('testValue', 'Hello from test!');
      });

      // Check if it's available
      const result = await this.page.evaluate(() => {
        return window.bridgeState.get('testValue') === 'Hello from test!';
      });
      
      return result;
    });
  }

  async testAlpineReactCommunication() {
    return await this.test('Alpine-React Communication', async () => {
      // Increment Alpine counter
      await this.page.click('button:has-text("+1")');
      
      // Send to bridge
      await this.page.click('button:has-text("Send to Bridge")');
      
      // Wait for state update
      await this.page.waitForTimeout(500);
      
      const result = await this.page.evaluate(() => {
        const alpineCounter = window.bridgeState.get('alpineCounter');
        return alpineCounter >= 1;
      });
      
      return result;
    });
  }

  async testComponentUnmounting() {
    return await this.test('Component Unmounting', async () => {
      // First mount a component
      await this.page.click('button:has-text("Mount")');
      await this.page.waitForTimeout(500);
      
      // Then unmount it
      await this.page.click('button:has-text("Unmount")');
      await this.page.waitForTimeout(500);
      
      const result = await this.page.evaluate(() => {
        const portal = document.getElementById('react-portal-1');
        return portal && portal.children.length === 0;
      });
      
      return result;
    });
  }

  async testErrorHandling() {
    return await this.test('Error Handling', async () => {
      const result = await this.page.evaluate(() => {
        try {
          // Try to render non-existent component
          window.ReactComponents.render('NonExistentComponent', {}, 'static-react-component');
          return false; // Should not reach here
        } catch (error) {
          return error.message.includes('NonExistentComponent');
        }
      });
      
      return result;
    });
  }

  async testDebugInfo() {
    return await this.test('Debug Information', async () => {
      const debugInfo = await this.page.evaluate(() => {
        return window.ReactComponents.debug();
      });
      
      const hasRequiredProps = debugInfo && 
                              Array.isArray(debugInfo.registeredComponents) &&
                              Array.isArray(debugInfo.stateKeys) &&
                              typeof debugInfo.activeRoots === 'number';
      
      console.log('📊 Debug Info:', debugInfo);
      return hasRequiredProps;
    });
  }

  async runAllTests() {
    console.log('🚀 Starting React-Alpine Integration Tests...\n');
    
    try {
      // Setup
      await this.startServer();
      await this.initBrowser();
      
      const pageLoaded = await this.loadTestPage();
      if (!pageLoaded) {
        throw new Error('Failed to load test page');
      }
      
      const frameworksReady = await this.waitForFrameworks();
      if (!frameworksReady) {
        throw new Error('Frameworks failed to initialize');
      }

      // Run tests
      await this.testReactComponentRegistration();
      await this.testStaticComponentRendering();
      await this.testDynamicComponentRendering();
      await this.testStateSync();
      await this.testAlpineReactCommunication();
      await this.testComponentUnmounting();
      await this.testErrorHandling();
      await this.testDebugInfo();

      // Results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.errors.push(`Suite Error: ${error.message}`);
    } finally {
      // Cleanup
      await this.closeBrowser();
      await this.stopServer();
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📝 Total: ${this.testResults.passed + this.testResults.failed}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n🚨 Errors:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    const success = this.testResults.failed === 0;
    console.log(`\n${success ? '🎉' : '💥'} Test suite ${success ? 'PASSED' : 'FAILED'}`);
    
    if (success) {
      console.log('✅ React-Alpine integration is working correctly!');
    } else {
      console.log('❌ React-Alpine integration has issues that need to be addressed.');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ReactAlpineIntegrationTester();
  tester.runAllTests()
    .then(() => {
      process.exit(tester.testResults.failed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test runner error:', error);
      process.exit(1);
    });
}

module.exports = ReactAlpineIntegrationTester; 
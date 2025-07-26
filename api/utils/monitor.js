#!/usr/bin/env node

const http = require('http');
const { logger } = require('./logger');

class SystemMonitor {
    constructor(host = 'localhost', port = 3001) {
        this.host = host;
        this.port = port;
        this.baseUrl = `http://${host}:${port}`;
        this.isMonitoring = false;
    }

    async checkHealth(endpoint = '/health') {
        return new Promise((resolve, reject) => {
            const req = http.get(`${this.baseUrl}${endpoint}`, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const healthData = JSON.parse(data);
                        resolve({
                            statusCode: res.statusCode,
                            data: healthData,
                            responseTime: Date.now() - startTime
                        });
                    } catch (error) {
                        reject(new Error(`Failed to parse health check response: ${error.message}`));
                    }
                });
            });

            const startTime = Date.now();
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Health check timeout'));
            });
        });
    }

    async performHealthCheck() {
        console.log(`🔍 Performing health check on ${this.baseUrl}...`);
        
        try {
            // Basic health check
            const basicHealth = await this.checkHealth('/health');
            console.log(`✅ Basic health check: ${basicHealth.data.status} (${basicHealth.responseTime}ms)`);
            
            // Detailed health check
            const detailedHealth = await this.checkHealth('/health/detailed');
            console.log(`✅ Detailed health check: ${detailedHealth.data.status} (${detailedHealth.responseTime}ms)`);
            
            // Check specific components
            if (detailedHealth.data.components) {
                console.log('\n📊 Component Status:');
                Object.entries(detailedHealth.data.components).forEach(([component, status]) => {
                    const statusIcon = status.status === 'healthy' ? '✅' : 
                                     status.status === 'degraded' ? '⚠️' : '❌';
                    console.log(`  ${statusIcon} ${component}: ${status.status}`);
                    
                    if (status.error) {
                        console.log(`    ❌ Error: ${status.error}`);
                    }
                    
                    if (status.responseTime) {
                        console.log(`    ⏱️  Response Time: ${status.responseTime}`);
                    }
                });
            }
            
            // Readiness check
            const readiness = await this.checkHealth('/health/ready');
            console.log(`\n🚀 Readiness check: ${readiness.data.status}`);
            
            // Liveness check
            const liveness = await this.checkHealth('/health/live');
            console.log(`💓 Liveness check: ${liveness.data.status}`);
            
            return true;
            
        } catch (error) {
            console.error(`❌ Health check failed: ${error.message}`);
            return false;
        }
    }

    async startContinuousMonitoring(interval = 30000) {
        console.log(`🔄 Starting continuous monitoring (every ${interval/1000}s)...`);
        this.isMonitoring = true;
        
        while (this.isMonitoring) {
            const timestamp = new Date().toISOString();
            console.log(`\n⏰ Health Check at ${timestamp}`);
            
            const isHealthy = await this.performHealthCheck();
            
            if (!isHealthy) {
                console.log('🚨 ALERT: System is unhealthy!');
                // In a real monitoring system, this would send alerts
            }
            
            // Wait for next check
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    stopMonitoring() {
        this.isMonitoring = false;
        console.log('🛑 Monitoring stopped');
    }

    async testErrorScenarios() {
        console.log('\n🧪 Testing error scenarios...');
        
        // Test invalid endpoint
        try {
            await this.checkHealth('/health/invalid');
        } catch (error) {
            console.log(`✅ Invalid endpoint correctly returns error: ${error.message}`);
        }
        
        // Test when server is down (this will fail, which is expected)
        const downMonitor = new SystemMonitor('localhost', 9999);
        try {
            await downMonitor.checkHealth();
        } catch (error) {
            console.log(`✅ Correctly detects when server is down: ${error.message}`);
        }
    }

    async runDiagnostics() {
        console.log('🔧 Running system diagnostics...\n');
        
        // System information
        console.log('💻 System Information:');
        console.log(`  Node.js: ${process.version}`);
        console.log(`  Platform: ${process.platform}`);
        console.log(`  Architecture: ${process.arch}`);
        console.log(`  Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`);
        console.log(`  Uptime: ${Math.round(process.uptime())}s`);
        
        // Network connectivity test
        console.log('\n🌐 Network Connectivity:');
        try {
            await this.performHealthCheck();
            console.log('  ✅ Can reach application server');
        } catch (error) {
            console.log(`  ❌ Cannot reach application server: ${error.message}`);
        }
        
        // Test error scenarios
        await this.testErrorScenarios();
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'check';
    
    const monitor = new SystemMonitor();
    
    switch (command) {
        case 'check':
            monitor.performHealthCheck()
                .then(success => process.exit(success ? 0 : 1))
                .catch(error => {
                    console.error('Monitor error:', error);
                    process.exit(1);
                });
            break;
            
        case 'monitor':
            const interval = parseInt(args[1]) || 30000;
            monitor.startContinuousMonitoring(interval)
                .catch(error => {
                    console.error('Monitoring error:', error);
                    process.exit(1);
                });
            
            // Graceful shutdown
            process.on('SIGINT', () => {
                monitor.stopMonitoring();
                process.exit(0);
            });
            break;
            
        case 'diagnose':
            monitor.runDiagnostics()
                .catch(error => {
                    console.error('Diagnostics error:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log(`
🔍 System Monitor for Accessibility Testing Platform

Usage:
  node monitor.js check              - Run single health check
  node monitor.js monitor [interval] - Start continuous monitoring (default: 30s)
  node monitor.js diagnose           - Run full system diagnostics

Examples:
  node monitor.js check
  node monitor.js monitor 60000      - Monitor every 60 seconds
  node monitor.js diagnose

Health Endpoints:
  GET /health          - Basic health status
  GET /health/detailed - Comprehensive component status
  GET /health/ready    - Kubernetes readiness probe
  GET /health/live     - Kubernetes liveness probe
            `);
            break;
    }
}

module.exports = SystemMonitor; 
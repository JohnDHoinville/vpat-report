/**
 * Coverage Metrics Collector
 * Automated system for collecting, tracking, and monitoring coverage metrics
 * 
 * Features:
 * - Continuous coverage monitoring across all testing sessions
 * - Historical trending and performance tracking
 * - Automated alerting for coverage degradation
 * - Tool performance metrics and efficiency analysis
 * - WCAG compliance tracking and reporting
 * - Coverage goal monitoring and achievement tracking
 */

const { Pool } = require('pg');
const EventEmitter = require('events');

class CoverageMetricsCollector extends EventEmitter {
    constructor(dbConfig = null) {
        super();
        this.dbPool = dbConfig ? new Pool(dbConfig) : require('../database/config.js').pool;
        this.isRunning = false;
        this.collectionInterval = null;
        this.metricsCache = new Map();
        this.alertThresholds = {
            coverage_degradation: 0.05,    // 5% drop triggers alert
            tool_failure_rate: 0.10,       // 10% failure rate triggers alert
            performance_degradation: 0.20, // 20% performance drop triggers alert
            coverage_below_target: 0.80     // Alert if coverage falls below 80%
        };
        this.lastAlerts = new Map();
        this.alertCooldown = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Start automated coverage metrics collection
     */
    async startCollection(intervalMinutes = 15) {
        if (this.isRunning) {
            console.log('⚠️ Coverage metrics collection is already running');
            return;
        }

        try {
            console.log(`📊 Starting automated coverage metrics collection (every ${intervalMinutes} minutes)`);
            
            // Initial collection
            await this.collectCurrentMetrics();
            
            // Set up periodic collection
            this.collectionInterval = setInterval(async () => {
                try {
                    await this.collectCurrentMetrics();
                } catch (error) {
                    console.error('❌ Error in periodic metrics collection:', error.message);
                    this.emit('collection_error', error);
                }
            }, intervalMinutes * 60 * 1000);

            this.isRunning = true;
            this.emit('collection_started', { interval_minutes: intervalMinutes });
            
            console.log('✅ Coverage metrics collection started successfully');
            
        } catch (error) {
            console.error('❌ Failed to start coverage metrics collection:', error.message);
            throw error;
        }
    }

    /**
     * Stop automated coverage metrics collection
     */
    stopCollection() {
        if (!this.isRunning) {
            console.log('⚠️ Coverage metrics collection is not running');
            return;
        }

        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }

        this.isRunning = false;
        this.emit('collection_stopped');
        console.log('🛑 Coverage metrics collection stopped');
    }

    /**
     * Collect current coverage metrics from all active sessions
     */
    async collectCurrentMetrics() {
        const timestamp = new Date();
        
        try {
            console.log(`📈 Collecting coverage metrics at ${timestamp.toISOString()}`);
            
            const metrics = {
                timestamp: timestamp,
                overall_coverage: await this.calculateOverallCoverage(),
                tool_performance: await this.analyzeToolPerformance(),
                session_statistics: await this.getSessionStatistics(),
                wcag_compliance: await this.analyzeWcagCompliance(),
                violation_trends: await this.analyzeViolationTrends(),
                coverage_goals: await this.trackCoverageGoals()
            };

            // Store metrics in database
            await this.storeMetrics(metrics);
            
            // Cache for quick access
            this.metricsCache.set('latest', metrics);
            
            // Check for alerts
            await this.checkAlerts(metrics);
            
            // Emit metrics event
            this.emit('metrics_collected', metrics);
            
            console.log(`✅ Metrics collection completed: ${metrics.overall_coverage.total_sessions} sessions analyzed`);
            
            return metrics;
            
        } catch (error) {
            console.error('❌ Error collecting coverage metrics:', error.message);
            throw error;
        }
    }

    /**
     * Calculate overall coverage across all sessions
     */
    async calculateOverallCoverage() {
        const query = `
            SELECT 
                COUNT(DISTINCT ts.id) as total_sessions,
                COUNT(DISTINCT ts.project_id) as total_projects,
                COUNT(DISTINCT ti.id) as total_test_instances,
                COUNT(DISTINCT ti.id) FILTER (WHERE ti.status = 'pass') as passed_instances,
                COUNT(DISTINCT ti.id) FILTER (WHERE ti.status = 'fail') as failed_instances,
                COUNT(DISTINCT ti.id) FILTER (WHERE ti.status = 'pending') as pending_instances,
                COUNT(DISTINCT atr.id) as total_automated_tests,
                AVG(CASE WHEN atr.violations_count > 0 THEN atr.violations_count ELSE 0 END) as avg_violations_per_test,
                COUNT(DISTINCT tr.wcag_criterion) as unique_wcag_criteria_tested
            FROM test_sessions ts
            LEFT JOIN test_instances ti ON ts.id = ti.test_session_id
            LEFT JOIN automated_test_results atr ON ti.id = atr.test_instance_id
            LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
            WHERE ts.created_at >= NOW() - INTERVAL '7 days'
        `;

        const result = await this.dbPool.query(query);
        const data = result.rows[0];

        return {
            total_sessions: parseInt(data.total_sessions) || 0,
            total_projects: parseInt(data.total_projects) || 0,
            total_test_instances: parseInt(data.total_test_instances) || 0,
            passed_instances: parseInt(data.passed_instances) || 0,
            failed_instances: parseInt(data.failed_instances) || 0,
            pending_instances: parseInt(data.pending_instances) || 0,
            pass_rate: data.total_test_instances > 0 ? 
                (parseInt(data.passed_instances) / parseInt(data.total_test_instances)) * 100 : 0,
            total_automated_tests: parseInt(data.total_automated_tests) || 0,
            avg_violations_per_test: parseFloat(data.avg_violations_per_test) || 0,
            unique_wcag_criteria_tested: parseInt(data.unique_wcag_criteria_tested) || 0,
            coverage_percentage: this.calculateCoveragePercentage(parseInt(data.unique_wcag_criteria_tested))
        };
    }

    /**
     * Analyze tool performance metrics
     */
    async analyzeToolPerformance() {
        const query = `
            SELECT 
                atr.tool_name,
                COUNT(*) as total_runs,
                COUNT(*) FILTER (WHERE atr.status = 'completed') as successful_runs,
                COUNT(*) FILTER (WHERE atr.status = 'failed') as failed_runs,
                AVG(atr.execution_time_ms) as avg_execution_time,
                AVG(atr.violations_count) as avg_violations_found,
                MAX(atr.created_at) as last_run
            FROM automated_test_results atr
            WHERE atr.created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY atr.tool_name
            ORDER BY total_runs DESC
        `;

        const result = await this.dbPool.query(query);
        
        return result.rows.map(row => ({
            tool_name: row.tool_name,
            total_runs: parseInt(row.total_runs),
            successful_runs: parseInt(row.successful_runs),
            failed_runs: parseInt(row.failed_runs),
            success_rate: row.total_runs > 0 ? 
                (parseInt(row.successful_runs) / parseInt(row.total_runs)) * 100 : 0,
            avg_execution_time: parseFloat(row.avg_execution_time) || 0,
            avg_violations_found: parseFloat(row.avg_violations_found) || 0,
            last_run: row.last_run,
            performance_score: this.calculateToolPerformanceScore(row)
        }));
    }

    /**
     * Get session statistics and trends
     */
    async getSessionStatistics() {
        const query = `
            SELECT 
                DATE(ts.created_at) as test_date,
                COUNT(DISTINCT ts.id) as sessions_created,
                COUNT(DISTINCT ti.id) as test_instances_created,
                AVG(EXTRACT(EPOCH FROM (ts.completed_at - ts.created_at))/60) as avg_session_duration_minutes
            FROM test_sessions ts
            LEFT JOIN test_instances ti ON ts.id = ti.test_session_id
            WHERE ts.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(ts.created_at)
            ORDER BY test_date DESC
        `;

        const result = await this.dbPool.query(query);
        
        return {
            daily_trends: result.rows.map(row => ({
                date: row.test_date,
                sessions_created: parseInt(row.sessions_created),
                test_instances_created: parseInt(row.test_instances_created),
                avg_session_duration_minutes: parseFloat(row.avg_session_duration_minutes) || 0
            })),
            summary: this.calculateSessionSummary(result.rows)
        };
    }

    /**
     * Analyze WCAG compliance across all criteria
     */
    async analyzeWcagCompliance() {
        // This would be expanded to analyze actual WCAG criteria coverage
        // For now, we'll provide the structure
        
        const totalWcagAACriteria = 50; // WCAG 2.1 AA criteria count
        const totalWcagAAACriteria = 78; // WCAG 2.1 AAA criteria count

        const query = `
            SELECT 
                tr.wcag_criterion,
                tr.wcag_level,
                COUNT(DISTINCT ti.id) as test_instances,
                COUNT(DISTINCT ti.id) FILTER (WHERE ti.status = 'pass') as passed_tests,
                COUNT(DISTINCT ti.id) FILTER (WHERE ti.status = 'fail') as failed_tests
            FROM test_requirements tr
            LEFT JOIN test_instances ti ON tr.id = ti.requirement_id
            WHERE tr.wcag_criterion IS NOT NULL
            AND ti.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY tr.wcag_criterion, tr.wcag_level
        `;

        const result = await this.dbPool.query(query);
        
        const coverageByLevel = {
            'A': { tested: 0, passed: 0, total: 25 },
            'AA': { tested: 0, passed: 0, total: 25 }, 
            'AAA': { tested: 0, passed: 0, total: 28 }
        };

        result.rows.forEach(row => {
            const level = row.wcag_level || 'AA';
            if (coverageByLevel[level]) {
                coverageByLevel[level].tested++;
                if (parseInt(row.passed_tests) > 0) {
                    coverageByLevel[level].passed++;
                }
            }
        });

        return {
            criteria_tested: result.rows.length,
            coverage_by_level: coverageByLevel,
            aa_compliance_percentage: (coverageByLevel.AA.passed / coverageByLevel.AA.total) * 100,
            aaa_compliance_percentage: (coverageByLevel.AAA.passed / coverageByLevel.AAA.total) * 100,
            detailed_criteria: result.rows
        };
    }

    /**
     * Analyze violation trends over time
     */
    async analyzeViolationTrends() {
        const query = `
            SELECT 
                DATE(atr.created_at) as test_date,
                atr.tool_name,
                SUM(atr.violations_count) as total_violations,
                AVG(atr.violations_count) as avg_violations_per_run,
                COUNT(*) as total_runs
            FROM automated_test_results atr
            WHERE atr.created_at >= NOW() - INTERVAL '14 days'
            AND atr.violations_count IS NOT NULL
            GROUP BY DATE(atr.created_at), atr.tool_name
            ORDER BY test_date DESC, total_violations DESC
        `;

        const result = await this.dbPool.query(query);
        
        return {
            daily_trends: result.rows.map(row => ({
                date: row.test_date,
                tool_name: row.tool_name,
                total_violations: parseInt(row.total_violations),
                avg_violations_per_run: parseFloat(row.avg_violations_per_run),
                total_runs: parseInt(row.total_runs)
            })),
            trend_analysis: this.analyzeTrendDirection(result.rows)
        };
    }

    /**
     * Track coverage goals and targets
     */
    async trackCoverageGoals() {
        const goals = {
            wcag_aa_target: 85,
            wcag_aaa_target: 70,
            automation_target: 75,
            pass_rate_target: 90
        };

        // Get current metrics
        const currentCoverage = await this.calculateOverallCoverage();
        const wcagCompliance = await this.analyzeWcagCompliance();
        
        return {
            targets: goals,
            current_achievement: {
                wcag_aa_coverage: wcagCompliance.aa_compliance_percentage,
                wcag_aaa_coverage: wcagCompliance.aaa_compliance_percentage,
                automation_coverage: (currentCoverage.total_automated_tests / Math.max(currentCoverage.total_test_instances, 1)) * 100,
                pass_rate: currentCoverage.pass_rate
            },
            goal_status: {
                wcag_aa_met: wcagCompliance.aa_compliance_percentage >= goals.wcag_aa_target,
                wcag_aaa_met: wcagCompliance.aaa_compliance_percentage >= goals.wcag_aaa_target,
                automation_met: ((currentCoverage.total_automated_tests / Math.max(currentCoverage.total_test_instances, 1)) * 100) >= goals.automation_target,
                pass_rate_met: currentCoverage.pass_rate >= goals.pass_rate_target
            }
        };
    }

    /**
     * Store metrics in database
     */
    async storeMetrics(metrics) {
        const query = `
            INSERT INTO coverage_metrics (
                timestamp, 
                overall_coverage, 
                tool_performance, 
                session_statistics, 
                wcag_compliance, 
                violation_trends, 
                coverage_goals
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (timestamp) DO UPDATE SET
                overall_coverage = EXCLUDED.overall_coverage,
                tool_performance = EXCLUDED.tool_performance,
                session_statistics = EXCLUDED.session_statistics,
                wcag_compliance = EXCLUDED.wcag_compliance,
                violation_trends = EXCLUDED.violation_trends,
                coverage_goals = EXCLUDED.coverage_goals
        `;

        try {
            await this.dbPool.query(query, [
                metrics.timestamp,
                JSON.stringify(metrics.overall_coverage),
                JSON.stringify(metrics.tool_performance),
                JSON.stringify(metrics.session_statistics),
                JSON.stringify(metrics.wcag_compliance),
                JSON.stringify(metrics.violation_trends),
                JSON.stringify(metrics.coverage_goals)
            ]);
        } catch (error) {
            // If table doesn't exist, create it
            if (error.code === '42P01') {
                await this.createMetricsTable();
                await this.dbPool.query(query, [
                    metrics.timestamp,
                    JSON.stringify(metrics.overall_coverage),
                    JSON.stringify(metrics.tool_performance),
                    JSON.stringify(metrics.session_statistics),
                    JSON.stringify(metrics.wcag_compliance),
                    JSON.stringify(metrics.violation_trends),
                    JSON.stringify(metrics.coverage_goals)
                ]);
            } else {
                throw error;
            }
        }
    }

    /**
     * Create coverage metrics table if it doesn't exist
     */
    async createMetricsTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS coverage_metrics (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE UNIQUE NOT NULL,
                overall_coverage JSONB,
                tool_performance JSONB,
                session_statistics JSONB,
                wcag_compliance JSONB,
                violation_trends JSONB,
                coverage_goals JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_coverage_metrics_timestamp 
            ON coverage_metrics(timestamp);
            
            CREATE INDEX IF NOT EXISTS idx_coverage_metrics_created_at 
            ON coverage_metrics(created_at);
        `;

        await this.dbPool.query(createTableQuery);
        console.log('📊 Created coverage_metrics table');
    }

    /**
     * Check for alert conditions
     */
    async checkAlerts(currentMetrics) {
        const alerts = [];
        const now = Date.now();

        try {
            // Get previous metrics for comparison
            const previousMetrics = await this.getPreviousMetrics();
            
            if (previousMetrics) {
                // Check for coverage degradation
                const coverageDrop = previousMetrics.overall_coverage.coverage_percentage - 
                                   currentMetrics.overall_coverage.coverage_percentage;
                
                if (coverageDrop > this.alertThresholds.coverage_degradation * 100) {
                    alerts.push({
                        type: 'coverage_degradation',
                        severity: 'high',
                        message: `Coverage dropped by ${coverageDrop.toFixed(1)}% since last measurement`,
                        current_value: currentMetrics.overall_coverage.coverage_percentage,
                        previous_value: previousMetrics.overall_coverage.coverage_percentage
                    });
                }

                // Check tool failure rates
                for (const tool of currentMetrics.tool_performance) {
                    const failureRate = (tool.failed_runs / tool.total_runs) * 100;
                    if (failureRate > this.alertThresholds.tool_failure_rate * 100) {
                        alerts.push({
                            type: 'tool_failure_rate',
                            severity: 'medium',
                            message: `${tool.tool_name} has high failure rate: ${failureRate.toFixed(1)}%`,
                            tool: tool.tool_name,
                            failure_rate: failureRate
                        });
                    }
                }
            }

            // Check absolute thresholds
            if (currentMetrics.overall_coverage.coverage_percentage < this.alertThresholds.coverage_below_target * 100) {
                alerts.push({
                    type: 'coverage_below_target',
                    severity: 'high',
                    message: `Overall coverage below target: ${currentMetrics.overall_coverage.coverage_percentage.toFixed(1)}%`,
                    current_value: currentMetrics.overall_coverage.coverage_percentage,
                    target_value: this.alertThresholds.coverage_below_target * 100
                });
            }

            // Process alerts (with cooldown)
            for (const alert of alerts) {
                const alertKey = `${alert.type}_${alert.tool || 'global'}`;
                const lastAlert = this.lastAlerts.get(alertKey);
                
                if (!lastAlert || (now - lastAlert) > this.alertCooldown) {
                    this.emit('coverage_alert', alert);
                    this.lastAlerts.set(alertKey, now);
                    console.log(`🚨 Coverage Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
                }
            }

        } catch (error) {
            console.error('❌ Error checking alerts:', error.message);
        }
    }

    /**
     * Get previous metrics for comparison
     */
    async getPreviousMetrics() {
        try {
            const query = `
                SELECT overall_coverage, tool_performance, wcag_compliance
                FROM coverage_metrics
                WHERE timestamp < NOW()
                ORDER BY timestamp DESC
                LIMIT 1
            `;

            const result = await this.dbPool.query(query);
            
            if (result.rows.length > 0) {
                return {
                    overall_coverage: result.rows[0].overall_coverage,
                    tool_performance: result.rows[0].tool_performance,
                    wcag_compliance: result.rows[0].wcag_compliance
                };
            }

            return null;
        } catch (error) {
            console.error('Error getting previous metrics:', error.message);
            return null;
        }
    }

    /**
     * Get historical metrics for trending
     */
    async getHistoricalMetrics(days = 30) {
        const query = `
            SELECT timestamp, overall_coverage, wcag_compliance, coverage_goals
            FROM coverage_metrics
            WHERE timestamp >= NOW() - INTERVAL '${days} days'
            ORDER BY timestamp ASC
        `;

        const result = await this.dbPool.query(query);
        
        return result.rows.map(row => ({
            timestamp: row.timestamp,
            overall_coverage: row.overall_coverage,
            wcag_compliance: row.wcag_compliance,
            coverage_goals: row.coverage_goals
        }));
    }

    /**
     * Helper methods
     */
    calculateCoveragePercentage(testedCriteria) {
        const totalWcagAACriteria = 50; // WCAG 2.1 AA criteria
        return (testedCriteria / totalWcagAACriteria) * 100;
    }

    calculateToolPerformanceScore(toolData) {
        const successRate = toolData.total_runs > 0 ? 
            (parseInt(toolData.successful_runs) / parseInt(toolData.total_runs)) : 0;
        const avgTime = parseFloat(toolData.avg_execution_time) || 0;
        const avgViolations = parseFloat(toolData.avg_violations_found) || 0;

        // Normalize execution time (assuming 30 seconds is baseline)
        const timeScore = Math.max(0, 1 - (avgTime - 30000) / 60000);
        
        // Combine metrics (weighted)
        return (successRate * 0.5) + (timeScore * 0.3) + (Math.min(avgViolations / 10, 1) * 0.2);
    }

    calculateSessionSummary(dailyData) {
        const totalSessions = dailyData.reduce((sum, day) => 
            sum + parseInt(day.sessions_created), 0);
        const totalInstances = dailyData.reduce((sum, day) => 
            sum + parseInt(day.test_instances_created), 0);
        const avgDuration = dailyData.reduce((sum, day) => 
            sum + parseFloat(day.avg_session_duration_minutes || 0), 0) / dailyData.length;

        return {
            total_sessions: totalSessions,
            total_instances: totalInstances,
            avg_duration_minutes: avgDuration,
            days_analyzed: dailyData.length
        };
    }

    analyzeTrendDirection(trendData) {
        if (trendData.length < 2) return { direction: 'insufficient_data' };

        const recent = trendData.slice(0, 3);
        const older = trendData.slice(-3);

        const recentAvg = recent.reduce((sum, item) => 
            sum + parseInt(item.total_violations), 0) / recent.length;
        const olderAvg = older.reduce((sum, item) => 
            sum + parseInt(item.total_violations), 0) / older.length;

        const change = ((recentAvg - olderAvg) / olderAvg) * 100;

        return {
            direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
            change_percentage: change,
            recent_average: recentAvg,
            historical_average: olderAvg
        };
    }
}

module.exports = CoverageMetricsCollector; 
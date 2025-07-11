/**
 * Audit Logging Middleware for Unified Testing Session Architecture
 * Tracks all API changes with comprehensive context
 * Created: December 11, 2024
 */

const pool = require('../../database/config');

/**
 * Enhanced audit logging middleware for API endpoints
 * Captures user actions, request context, and detailed change information
 */
class AuditLogger {
    
    /**
     * Middleware to capture and log test instance changes
     * @param {Object} options - Configuration options for audit logging
     */
    static auditMiddleware(options = {}) {
        return async (req, res, next) => {
            // Store original res.json to capture response data
            const originalJson = res.json;
            
            // Capture request start time
            req.auditContext = {
                startTime: Date.now(),
                method: req.method,
                originalUrl: req.originalUrl,
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip || req.connection.remoteAddress,
                sessionId: req.sessionID,
                userId: req.user?.id || null,
                requestBody: this.sanitizeRequestData(req.body),
                requestParams: req.params,
                requestQuery: req.query
            };

            // Override res.json to capture response
            res.json = function(data) {
                req.auditContext.responseData = AuditLogger.sanitizeResponseData(data);
                req.auditContext.statusCode = res.statusCode;
                req.auditContext.duration = Date.now() - req.auditContext.startTime;
                
                // Log the audit entry if this was a successful test instance change
                if (AuditLogger.shouldLogRequest(req, res)) {
                    AuditLogger.logApiAction(req.auditContext);
                }
                
                return originalJson.call(this, data);
            };

            next();
        };
    }

    /**
     * Determine if this request should be audited
     */
    static shouldLogRequest(req, res) {
        // Log successful requests to test instance endpoints
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const testInstancePaths = [
                '/api/sessions',
                '/api/tests', 
                '/sessions/',
                '/tests/'
            ];
            
            return testInstancePaths.some(path => req.originalUrl.includes(path));
        }
        
        // Also log failed requests for security monitoring
        if (res.statusCode >= 400) {
            return true;
        }
        
        return false;
    }

    /**
     * Log API action to audit trail
     */
    static async logApiAction(auditContext) {
        try {
            const actionType = this.determineActionType(auditContext);
            
            // Extract test instance ID if available
            const testInstanceId = this.extractTestInstanceId(auditContext);
            
            if (!testInstanceId) {
                // Log as general API activity instead of test instance specific
                return this.logGeneralApiActivity(auditContext);
            }

            const auditEntry = {
                test_instance_id: testInstanceId,
                user_id: auditContext.userId,
                action_type: actionType,
                old_value: null, // Will be set by database triggers for actual data changes
                new_value: null, // Will be set by database triggers for actual data changes
                change_description: this.generateChangeDescription(auditContext),
                ip_address: auditContext.ipAddress,
                user_agent: auditContext.userAgent,
                session_id: auditContext.sessionId,
                details: {
                    method: auditContext.method,
                    url: auditContext.originalUrl,
                    duration_ms: auditContext.duration,
                    status_code: auditContext.statusCode,
                    request_params: auditContext.requestParams,
                    request_query: auditContext.requestQuery
                }
            };

            await this.insertAuditLog(auditEntry);
            
        } catch (error) {
            console.error('Audit logging error:', error);
            // Don't fail the request if audit logging fails
        }
    }

    /**
     * Log general API activity for non-test-specific actions
     */
    static async logGeneralApiActivity(auditContext) {
        try {
            const query = `
                INSERT INTO api_activity_log (
                    user_id, action_type, ip_address, user_agent, session_id,
                    request_method, request_url, status_code, duration_ms, details
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `;
            
            const values = [
                auditContext.userId,
                this.determineActionType(auditContext),
                auditContext.ipAddress,
                auditContext.userAgent,
                auditContext.sessionId,
                auditContext.method,
                auditContext.originalUrl,
                auditContext.statusCode,
                auditContext.duration,
                JSON.stringify({
                    request_params: auditContext.requestParams,
                    request_query: auditContext.requestQuery
                })
            ];

            await pool.query(query, values);
            
        } catch (error) {
            // Create table if it doesn't exist
            if (error.code === '42P01') {
                await this.createApiActivityTable();
                // Retry the insert
                await this.logGeneralApiActivity(auditContext);
            } else {
                console.error('General API activity logging error:', error);
            }
        }
    }

    /**
     * Create API activity log table if it doesn't exist
     */
    static async createApiActivityTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS api_activity_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES auth_users(id),
                action_type VARCHAR(50) NOT NULL,
                ip_address INET,
                user_agent TEXT,
                session_id VARCHAR(255),
                request_method VARCHAR(10),
                request_url TEXT,
                status_code INTEGER,
                duration_ms INTEGER,
                details JSONB DEFAULT '{}'::jsonb,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_api_activity_log_user_id ON api_activity_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_api_activity_log_timestamp ON api_activity_log(timestamp);
            CREATE INDEX IF NOT EXISTS idx_api_activity_log_action_type ON api_activity_log(action_type);
        `;
        
        await pool.query(query);
    }

    /**
     * Insert audit log entry
     */
    static async insertAuditLog(auditEntry) {
        const query = `
            INSERT INTO test_audit_log (
                test_instance_id, user_id, action_type, old_value, new_value,
                change_description, ip_address, user_agent, session_id, details
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        const values = [
            auditEntry.test_instance_id,
            auditEntry.user_id,
            auditEntry.action_type,
            auditEntry.old_value,
            auditEntry.new_value,
            auditEntry.change_description,
            auditEntry.ip_address,
            auditEntry.user_agent,
            auditEntry.session_id,
            JSON.stringify(auditEntry.details)
        ];

        await pool.query(query, values);
    }

    /**
     * Extract test instance ID from request context
     */
    static extractTestInstanceId(auditContext) {
        // Try to extract from URL path
        const pathSegments = auditContext.originalUrl.split('/');
        
        // Pattern: /api/sessions/:sessionId/tests/:testId
        if (pathSegments.includes('tests')) {
            const testIndex = pathSegments.indexOf('tests');
            if (testIndex < pathSegments.length - 1) {
                const testId = pathSegments[testIndex + 1];
                // Validate UUID format
                if (this.isValidUUID(testId)) {
                    return testId;
                }
            }
        }
        
        // Try to extract from request parameters
        if (auditContext.requestParams.testId && this.isValidUUID(auditContext.requestParams.testId)) {
            return auditContext.requestParams.testId;
        }
        
        // Try to extract from response data
        if (auditContext.responseData?.id && this.isValidUUID(auditContext.responseData.id)) {
            return auditContext.responseData.id;
        }
        
        return null;
    }

    /**
     * Determine action type from request context
     */
    static determineActionType(auditContext) {
        const method = auditContext.method;
        const url = auditContext.originalUrl;
        
        if (method === 'POST') {
            if (url.includes('/sessions')) return 'session_created';
            if (url.includes('/assign')) return 'assignment';
            if (url.includes('/tests')) return 'test_created';
            return 'created';
        }
        
        if (method === 'PUT' || method === 'PATCH') {
            if (url.includes('/status')) return 'status_change';
            if (url.includes('/assign')) return 'assignment';
            if (url.includes('/evidence')) return 'evidence_uploaded';
            if (url.includes('/notes')) return 'note_updated';
            return 'updated';
        }
        
        if (method === 'DELETE') {
            return 'deleted';
        }
        
        if (method === 'GET') {
            return 'accessed';
        }
        
        return 'api_action';
    }

    /**
     * Generate human-readable change description
     */
    static generateChangeDescription(auditContext) {
        const method = auditContext.method;
        const url = auditContext.originalUrl;
        const statusCode = auditContext.statusCode;
        
        if (statusCode >= 400) {
            return `Failed ${method} request to ${url} (${statusCode})`;
        }
        
        if (method === 'POST') {
            if (url.includes('/sessions')) return 'Testing session created';
            if (url.includes('/assign')) return 'Test assigned to user';
            if (url.includes('/tests')) return 'Test instance created';
            return 'Resource created via API';
        }
        
        if (method === 'PUT' || method === 'PATCH') {
            if (url.includes('/status')) return 'Test status updated via API';
            if (url.includes('/assign')) return 'Test assignment updated via API';
            if (url.includes('/evidence')) return 'Evidence uploaded via API';
            if (url.includes('/notes')) return 'Notes updated via API';
            return 'Resource updated via API';
        }
        
        if (method === 'DELETE') {
            return 'Resource deleted via API';
        }
        
        return `API ${method} request to ${url}`;
    }

    /**
     * Sanitize request data for logging (remove sensitive information)
     */
    static sanitizeRequestData(data) {
        if (!data) return null;
        
        const sanitized = { ...data };
        
        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }

    /**
     * Sanitize response data for logging
     */
    static sanitizeResponseData(data) {
        if (!data) return null;
        
        // Only log relevant response data, not full payloads
        if (typeof data === 'object') {
            return {
                id: data.id || null,
                status: data.status || null,
                success: data.success || null,
                message: data.message || null,
                count: data.count || null
            };
        }
        
        return null;
    }

    /**
     * Validate UUID format
     */
    static isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Create audit trail summary for a test instance
     */
    static async getAuditTrail(testInstanceId, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                actionType = null,
                userId = null,
                startDate = null,
                endDate = null
            } = options;

            let whereConditions = ['tal.test_instance_id = $1'];
            const queryParams = [testInstanceId];
            let paramIndex = 2;

            if (actionType) {
                whereConditions.push(`tal.action_type = $${paramIndex}`);
                queryParams.push(actionType);
                paramIndex++;
            }

            if (userId) {
                whereConditions.push(`tal.user_id = $${paramIndex}`);
                queryParams.push(userId);
                paramIndex++;
            }

            if (startDate) {
                whereConditions.push(`tal.timestamp >= $${paramIndex}`);
                queryParams.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                whereConditions.push(`tal.timestamp <= $${paramIndex}`);
                queryParams.push(endDate);
                paramIndex++;
            }

            const query = `
                SELECT 
                    tal.id,
                    tal.action_type,
                    tal.change_description,
                    tal.timestamp,
                    tal.ip_address,
                    tal.details,
                    au.username as user_name,
                    au.email as user_email
                FROM test_audit_log tal
                LEFT JOIN auth_users au ON tal.user_id = au.id
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY tal.timestamp DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);

            const result = await pool.query(query, queryParams);
            
            return {
                auditTrail: result.rows,
                pagination: {
                    limit,
                    offset,
                    hasMore: result.rows.length === limit
                }
            };
            
        } catch (error) {
            console.error('Error fetching audit trail:', error);
            throw error;
        }
    }

    /**
     * Get audit statistics for a test instance
     */
    static async getAuditStatistics(testInstanceId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_changes,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(*) FILTER (WHERE action_type = 'status_change') as status_changes,
                    COUNT(*) FILTER (WHERE action_type = 'assignment') as assignments,
                    COUNT(*) FILTER (WHERE action_type = 'note_updated') as note_updates,
                    COUNT(*) FILTER (WHERE action_type = 'evidence_uploaded') as evidence_uploads,
                    MIN(timestamp) as first_change,
                    MAX(timestamp) as last_change
                FROM test_audit_log
                WHERE test_instance_id = $1
            `;

            const result = await pool.query(query, [testInstanceId]);
            return result.rows[0];
            
        } catch (error) {
            console.error('Error fetching audit statistics:', error);
            throw error;
        }
    }
}

module.exports = AuditLogger; 
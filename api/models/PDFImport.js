/**
 * PDF Import Model
 * Handles database operations for PDF imports with parsed data
 */

const { pool } = require('../../database/config');
const { logger } = require('../utils/logger');

class PDFImport {
    constructor(data = {}) {
        this.id = data.id;
        this.filename = data.filename;
        this.file_size = data.file_size;
        this.requirement_id = data.requirement_id;
        this.uploaded_by = data.uploaded_by;
        this.uploaded_at = data.uploaded_at;
        this.status = data.status || 'pending';
        this.parsed_data = data.parsed_data;
        this.reviewed_by = data.reviewed_by;
        this.reviewed_at = data.reviewed_at;
        this.review_notes = data.review_notes;
        this.approved_by = data.approved_by;
        this.approved_at = data.approved_at;
        this.applied_by = data.applied_by;
        this.applied_at = data.applied_at;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * Create a new PDF import record
     */
    static async create(data) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO pdf_imports (
                    filename, file_size, requirement_id, uploaded_by, 
                    parsed_data, status
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            
            const values = [
                data.filename,
                data.file_size,
                data.requirement_id,
                data.uploaded_by,
                JSON.stringify(data.parsed_data),
                data.status || 'pending'
            ];

            const result = await client.query(query, values);
            logger.info('✅ PDF import record created', { 
                id: result.rows[0].id,
                filename: data.filename,
                requirement_id: data.requirement_id 
            });
            
            return new PDFImport(result.rows[0]);
        } catch (error) {
            logger.error('❌ Failed to create PDF import record', { error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Find PDF import by ID
     */
    static async findById(id) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT pi.*, 
                       r.criterion_number,
                       u1.username as uploaded_by_username,
                       u2.username as reviewed_by_username,
                       u3.username as approved_by_username
                FROM pdf_imports pi
                LEFT JOIN requirements r ON pi.requirement_id = r.id
                LEFT JOIN users u1 ON pi.uploaded_by = u1.id
                LEFT JOIN users u2 ON pi.reviewed_by = u2.id
                LEFT JOIN users u3 ON pi.approved_by = u3.id
                WHERE pi.id = $1
            `;

            const result = await client.query(query, [id]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return new PDFImport(result.rows[0]);
        } catch (error) {
            logger.error('❌ Failed to find PDF import', { id, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Find PDF imports by requirement ID
     */
    static async findByRequirementId(requirementId, options = {}) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT pi.*, 
                       r.criterion_number,
                       u1.username as uploaded_by_username,
                       u2.username as reviewed_by_username,
                       u3.username as approved_by_username
                FROM pdf_imports pi
                LEFT JOIN requirements r ON pi.requirement_id = r.id
                LEFT JOIN users u1 ON pi.uploaded_by = u1.id
                LEFT JOIN users u2 ON pi.reviewed_by = u2.id
                LEFT JOIN users u3 ON pi.approved_by = u3.id
                WHERE pi.requirement_id = $1
            `;

            const params = [requirementId];

            // Add status filter if provided
            if (options.status) {
                query += ` AND pi.status = $2`;
                params.push(options.status);
            }

            // Add ordering
            query += ` ORDER BY pi.uploaded_at DESC`;

            // Add limit if provided
            if (options.limit) {
                query += ` LIMIT $${params.length + 1}`;
                params.push(options.limit);
            }

            const result = await client.query(query, params);
            
            return result.rows.map(row => new PDFImport(row));
        } catch (error) {
            logger.error('❌ Failed to find PDF imports by requirement', { 
                requirementId, 
                error: error.message 
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update PDF import status and related fields
     */
    async updateStatus(status, userId, notes = null) {
        const client = await pool.connect();
        try {
            let query = `
                UPDATE pdf_imports 
                SET status = $1, updated_at = NOW()
            `;
            let params = [status];
            let paramIndex = 2;

            // Set appropriate fields based on status
            if (status === 'reviewing') {
                query += `, reviewed_by = $${paramIndex}, reviewed_at = NOW()`;
                params.push(userId);
                paramIndex++;
            } else if (status === 'approved') {
                query += `, approved_by = $${paramIndex}, approved_at = NOW()`;
                params.push(userId);
                paramIndex++;
            } else if (status === 'applied') {
                query += `, applied_by = $${paramIndex}, applied_at = NOW()`;
                params.push(userId);
                paramIndex++;
            }

            // Add review notes if provided
            if (notes) {
                query += `, review_notes = $${paramIndex}`;
                params.push(notes);
                paramIndex++;
            }

            query += ` WHERE id = $${paramIndex} RETURNING *`;
            params.push(this.id);

            const result = await client.query(query, params);
            
            if (result.rows.length === 0) {
                throw new Error(`PDF import not found: ${this.id}`);
            }

            // Update this instance with new data
            Object.assign(this, result.rows[0]);

            logger.info('✅ PDF import status updated', { 
                id: this.id,
                status: status,
                updatedBy: userId 
            });
            
            return this;
        } catch (error) {
            logger.error('❌ Failed to update PDF import status', { 
                id: this.id,
                status,
                error: error.message 
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get all pending PDF imports for a user/project
     */
    static async getPending(options = {}) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT pi.*, 
                       r.criterion_number,
                       u1.username as uploaded_by_username
                FROM pdf_imports pi
                LEFT JOIN requirements r ON pi.requirement_id = r.id
                LEFT JOIN users u1 ON pi.uploaded_by = u1.id
                WHERE pi.status = 'pending'
            `;

            const params = [];

            // Add user filter if provided
            if (options.userId) {
                query += ` AND pi.uploaded_by = $1`;
                params.push(options.userId);
            }

            query += ` ORDER BY pi.uploaded_at DESC`;

            const result = await client.query(query, params);
            
            return result.rows.map(row => new PDFImport(row));
        } catch (error) {
            logger.error('❌ Failed to get pending PDF imports', { error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Delete PDF import (with cascading considerations)
     */
    async delete() {
        const client = await pool.connect();
        try {
            const query = `DELETE FROM pdf_imports WHERE id = $1 RETURNING *`;
            const result = await client.query(query, [this.id]);
            
            if (result.rows.length === 0) {
                throw new Error(`PDF import not found: ${this.id}`);
            }

            logger.info('✅ PDF import deleted', { 
                id: this.id,
                filename: this.filename 
            });
            
            return true;
        } catch (error) {
            logger.error('❌ Failed to delete PDF import', { 
                id: this.id,
                error: error.message 
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get parsed data with type safety
     */
    getParsedData() {
        if (typeof this.parsed_data === 'string') {
            return JSON.parse(this.parsed_data);
        }
        return this.parsed_data;
    }

    /**
     * Validate parsed data structure
     */
    validateParsedData() {
        const data = this.getParsedData();
        
        if (!data.requirementNumber) {
            throw new Error('Missing requirement number in parsed data');
        }
        
        if (!Array.isArray(data.testInstances)) {
            throw new Error('Missing or invalid test instances in parsed data');
        }
        
        if (!Array.isArray(data.urls)) {
            throw new Error('Missing or invalid URLs in parsed data');
        }
        
        return true;
    }
}

module.exports = PDFImport;

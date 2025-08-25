/**
 * PDF Import Management Routes
 * Handles review, approval, and application of imported PDF data
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const PDFImport = require('../models/PDFImport');
const { pool } = require('../../database/config');
const router = express.Router();

/**
 * Get all pending PDF imports for the current user
 */
router.get('/pending', authenticateToken, async (req, res) => {
    try {
        const pendingImports = await PDFImport.getPending({
            userId: req.user.id
        });

        res.json({
            success: true,
            data: pendingImports,
            count: pendingImports.length
        });
    } catch (error) {
        logger.error('❌ Failed to get pending PDF imports', { 
            userId: req.user.id,
            error: error.message 
        });
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve pending imports',
            error: error.message
        });
    }
});

/**
 * Get PDF imports for a specific requirement
 */
router.get('/requirement/:requirementId', authenticateToken, async (req, res) => {
    try {
        const { requirementId } = req.params;
        const { status, limit } = req.query;

        const imports = await PDFImport.findByRequirementId(requirementId, {
            status: status,
            limit: limit ? parseInt(limit) : undefined
        });

        res.json({
            success: true,
            data: imports,
            count: imports.length
        });
    } catch (error) {
        logger.error('❌ Failed to get PDF imports for requirement', { 
            requirementId: req.params.requirementId,
            error: error.message 
        });
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve imports for requirement',
            error: error.message
        });
    }
});

/**
 * Get specific PDF import by ID
 */
router.get('/:importId', authenticateToken, async (req, res) => {
    try {
        const { importId } = req.params;
        const pdfImport = await PDFImport.findById(importId);

        if (!pdfImport) {
            return res.status(404).json({
                success: false,
                message: 'PDF import not found'
            });
        }

        res.json({
            success: true,
            data: pdfImport
        });
    } catch (error) {
        logger.error('❌ Failed to get PDF import', { 
            importId: req.params.importId,
            error: error.message 
        });
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve PDF import',
            error: error.message
        });
    }
});

/**
 * Update PDF import status (review, approve, reject)
 */
router.patch('/:importId/status', authenticateToken, async (req, res) => {
    try {
        const { importId } = req.params;
        const { status, notes } = req.body;

        // Validate status
        const validStatuses = ['pending', 'reviewing', 'approved', 'rejected', 'applied'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const pdfImport = await PDFImport.findById(importId);
        if (!pdfImport) {
            return res.status(404).json({
                success: false,
                message: 'PDF import not found'
            });
        }

        await pdfImport.updateStatus(status, req.user.id, notes);

        logger.info('✅ PDF import status updated', { 
            importId,
            status,
            updatedBy: req.user.id 
        });

        res.json({
            success: true,
            message: `PDF import status updated to ${status}`,
            data: pdfImport
        });
    } catch (error) {
        logger.error('❌ Failed to update PDF import status', { 
            importId: req.params.importId,
            error: error.message 
        });
        res.status(500).json({
            success: false,
            message: 'Failed to update PDF import status',
            error: error.message
        });
    }
});

/**
 * Apply approved PDF import data to test instances
 */
router.post('/:importId/apply', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { importId } = req.params;
        const pdfImport = await PDFImport.findById(importId);

        if (!pdfImport) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'PDF import not found'
            });
        }

        if (pdfImport.status !== 'approved') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Only approved imports can be applied'
            });
        }

        const parsedData = pdfImport.getParsedData();
        let updatedInstances = 0;

        // Apply data to test instances
        if (parsedData.testInstances && parsedData.testInstances.length > 0) {
            // Get existing test instances for the requirement
            const testInstancesQuery = `
                SELECT ti.*, r.criterion_number
                FROM test_instances ti
                JOIN requirements r ON ti.requirement_id = r.id
                WHERE ti.requirement_id = $1
                ORDER BY ti.created_at
            `;
            
            const testInstancesResult = await client.query(testInstancesQuery, [pdfImport.requirement_id]);
            const existingInstances = testInstancesResult.rows;

            // Apply parsed data to existing instances
            for (const [index, pdfInstance] of parsedData.testInstances.entries()) {
                let targetInstance = null;

                // Try to match by URL first
                if (pdfInstance.url) {
                    targetInstance = existingInstances.find(inst => 
                        inst.page_url && normalizeURL(inst.page_url) === normalizeURL(pdfInstance.url)
                    );
                }

                // Fall back to positional matching
                if (!targetInstance && index < existingInstances.length) {
                    targetInstance = existingInstances[index];
                }

                if (targetInstance) {
                    const updateFields = [];
                    const updateValues = [];
                    let valueIndex = 1;

                    // Update status if valid
                    if (pdfInstance.status && ['pass', 'fail', 'not_applicable'].includes(pdfInstance.status)) {
                        updateFields.push(`status = $${valueIndex++}`);
                        updateValues.push(pdfInstance.status);
                    }

                    // Update notes
                    if (pdfInstance.notes) {
                        updateFields.push(`notes = $${valueIndex++}`);
                        updateValues.push(pdfInstance.notes);
                    }

                    // Update results (WYSIWYG)
                    if (pdfInstance.results) {
                        updateFields.push(`results = $${valueIndex++}`);
                        updateValues.push(pdfInstance.results);
                    }

                    // Update recommendations (WYSIWYG)
                    if (pdfInstance.recommendations) {
                        updateFields.push(`recommendations = $${valueIndex++}`);
                        updateValues.push(pdfInstance.recommendations);
                    }

                    // Update page URL
                    if (pdfInstance.url && pdfInstance.url !== targetInstance.page_url) {
                        updateFields.push(`page_url = $${valueIndex++}`);
                        updateValues.push(pdfInstance.url);
                    }

                    // Update updated timestamp
                    updateFields.push(`updated_at = NOW()`);

                    if (updateFields.length > 1) { // More than just updated_at
                        updateValues.push(targetInstance.id);
                        
                        const updateQuery = `
                            UPDATE test_instances 
                            SET ${updateFields.join(', ')}
                            WHERE id = $${valueIndex}
                        `;

                        await client.query(updateQuery, updateValues);
                        updatedInstances++;

                        logger.info('✅ Test instance updated from PDF data', {
                            instanceId: targetInstance.id,
                            pdfImportId: importId,
                            updatedFields: updateFields.length - 1 // Exclude updated_at
                        });
                    }
                }
            }
        }

        // Update overall requirement status if provided
        if (parsedData.overallStatus && ['pass', 'fail', 'not_applicable'].includes(parsedData.overallStatus)) {
            const updateRequirementQuery = `
                UPDATE requirements 
                SET overall_status = $1, updated_at = NOW()
                WHERE id = $2
            `;
            await client.query(updateRequirementQuery, [parsedData.overallStatus, pdfImport.requirement_id]);
            
            logger.info('✅ Requirement overall status updated from PDF data', {
                requirementId: pdfImport.requirement_id,
                overallStatus: parsedData.overallStatus,
                pdfImportId: importId
            });
        }

        // Mark import as applied
        await pdfImport.updateStatus('applied', req.user.id, `Applied to ${updatedInstances} test instances`);

        await client.query('COMMIT');

        logger.info('✅ PDF import data applied successfully', { 
            importId,
            updatedInstances,
            appliedBy: req.user.id 
        });

        res.json({
            success: true,
            message: `PDF import applied successfully. Updated ${updatedInstances} test instances.`,
            data: {
                importId,
                updatedInstances,
                appliedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('❌ Failed to apply PDF import data', { 
            importId: req.params.importId,
            error: error.message 
        });
        res.status(500).json({
            success: false,
            message: 'Failed to apply PDF import data',
            error: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * Delete PDF import
 */
router.delete('/:importId', authenticateToken, async (req, res) => {
    try {
        const { importId } = req.params;
        const pdfImport = await PDFImport.findById(importId);

        if (!pdfImport) {
            return res.status(404).json({
                success: false,
                message: 'PDF import not found'
            });
        }

        // Only allow deletion of pending or rejected imports
        if (!['pending', 'rejected'].includes(pdfImport.status)) {
            return res.status(400).json({
                success: false,
                message: 'Only pending or rejected imports can be deleted'
            });
        }

        await pdfImport.delete();

        logger.info('✅ PDF import deleted', { 
            importId,
            deletedBy: req.user.id 
        });

        res.json({
            success: true,
            message: 'PDF import deleted successfully'
        });
    } catch (error) {
        logger.error('❌ Failed to delete PDF import', { 
            importId: req.params.importId,
            error: error.message 
        });
        res.status(500).json({
            success: false,
            message: 'Failed to delete PDF import',
            error: error.message
        });
    }
});

/**
 * Helper function to normalize URLs for comparison
 */
function normalizeURL(url) {
    if (!url) return '';
    return url.trim().toLowerCase().replace(/\/$/, '');
}

module.exports = router;

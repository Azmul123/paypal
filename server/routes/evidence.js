/**
 * FlowPilot — Module 2: Evidence Management
 * Express Router: /api/evidence (v2.1)
 * 
 * Provides all 6 required endpoints:
 * 1. POST   /api/evidence/upload           - Multipart binary file upload
 * 2. GET    /api/evidence/dispute/:disputeId - List all documents for dispute
 * 3. GET    /api/evidence/:id              - Get metadata for single document
 * 4. GET    /api/evidence/:id/file         - Secure binary file stream for preview/download
 * 5. PUT    /api/evidence/:id              - Update document metadata
 * 6. DELETE /api/evidence/:id              - Remove document from storage & catalog
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const evidenceService = require('../services/evidenceService');
const storageService = require('../services/storageService');

// Multer memory storage configuration with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB strict limit
  }
});

// Middleware to handle Multer errors cleanly
function handleMulterUpload(req, res, next) {
  const uploadSingle = upload.single('file');
  uploadSingle(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: 'File exceeds 10MB limit. Please upload a smaller file.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Upload processing error: ${err.message}`
      });
    }
    next();
  });
}

/**
 * 1. POST /api/evidence/upload
 * Ingests evidence binary with metadata
 */
router.post('/upload', handleMulterUpload, async (req, res) => {
  try {
    const { disputeId, documentType, carrierName, trackingNumber, merchantNotes, content } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Binary file is required (field name: "file").'
      });
    }

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        error: 'disputeId is required.'
      });
    }

    const document = await evidenceService.uploadDocument({
      disputeId,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      documentType: documentType || 'OTHER',
      carrierName,
      trackingNumber,
      merchantNotes,
      content
    });

    res.status(201).json({
      success: true,
      message: 'Evidence document uploaded successfully.',
      document
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      code: err.code,
      error: err.message,
      existingDocumentId: err.existingDocumentId,
      existingFileName: err.existingFileName
    });
  }
});

/**
 * 2. GET /api/evidence/dispute/:disputeId
 * Retrieves all evidence documents associated with a dispute
 */
router.get('/dispute/:disputeId', (req, res) => {
  const { disputeId } = req.params;
  const docs = evidenceService.getDocumentsForDispute(disputeId);

  res.json({
    success: true,
    disputeId,
    count: docs.length,
    documents: docs
  });
});

/**
 * 3. GET /api/evidence/:id
 * Retrieves metadata for a single evidence document
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const doc = evidenceService.getDocumentById(id);

  if (!doc) {
    return res.status(404).json({
      success: false,
      error: `Evidence document "${id}" not found.`
    });
  }

  // Cross-dispute authorization guard
  const disputeScope = req.query.disputeId;
  if (disputeScope && doc.disputeId !== disputeScope) {
    return res.status(403).json({
      success: false,
      error: `Access Denied: Document "${id}" does not belong to dispute "${disputeScope}".`
    });
  }

  res.json({
    success: true,
    document: doc
  });
});

/**
 * 4. GET /api/evidence/:id/file
 * Secure binary file stream with security headers
 */
router.get('/:id/file', (req, res) => {
  const { id } = req.params;
  const doc = evidenceService.getDocumentById(id);

  if (!doc) {
    return res.status(404).json({
      success: false,
      error: `Evidence document "${id}" not found.`
    });
  }

  // Cross-dispute access guard
  const disputeScope = req.query.disputeId;
  if (disputeScope && doc.disputeId !== disputeScope) {
    return res.status(403).json({
      success: false,
      error: `Access Denied: Document "${id}" does not belong to dispute "${disputeScope}".`
    });
  }

  const filePath = storageService.resolveFilePath(doc.storagePath);
  if (!filePath) {
    return res.status(404).json({
      success: false,
      error: `Binary file for document "${id}" is missing from storage.`
    });
  }

  // Security Headers: prevent script execution in PDFs or SVGs
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Content-Disposition', `inline; filename="${doc.fileName || 'evidence'}"`);

  res.sendFile(filePath);
});

/**
 * 5. PUT /api/evidence/:id
 * Updates document metadata (category, carrier, tracking #, notes)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { disputeId, documentType, carrierName, trackingNumber, merchantNotes, content } = req.body;

    const updated = await evidenceService.updateDocument(id, {
      documentType,
      carrierName,
      trackingNumber,
      merchantNotes,
      content
    }, disputeId);

    res.json({
      success: true,
      message: 'Evidence document metadata updated.',
      document: updated
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * 6. DELETE /api/evidence/:id
 * Removes document from storage and metadata catalog
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const disputeIdContext = req.query.disputeId || req.body?.disputeId;

    const result = await evidenceService.deleteDocument(id, disputeIdContext);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;

/**
 * FlowPilot — Module 4: Dispute Response & Resolution
 * Express Router: /api/response
 * 
 * Endpoints:
 * 1. GET  /api/response/:disputeId        - Fetch response package & draft status
 * 2. POST /api/response/generate          - Generate/regenerate defense narrative
 * 3. PUT  /api/response/:disputeId        - Edit narrative text & merchant notes
 * 4. POST /api/response/approve           - Approve response package (internal review)
 * 5. POST /api/response/unapprove         - Revert approval back to draft
 * 6. GET  /api/response/export/:disputeId - Export validated JSON Defense Dossier
 * 7. POST /api/response/bundle/:disputeId - Compile and inspect raw evidence bundle
 */

const express = require('express');
const router = express.Router();
const responseService = require('../services/responseService');

/**
 * 1. GET /api/response/:disputeId
 * Retrieves the compiled response package and status for a dispute
 */
router.get('/:disputeId', (req, res) => {
  const { disputeId } = req.params;
  const pkg = responseService.getResponsePackage(disputeId);

  if (!pkg) {
    return res.status(404).json({
      success: false,
      error: `No response package found for dispute "${disputeId}". Generate a response draft first.`
    });
  }

  res.json({
    success: true,
    responsePackage: pkg
  });
});

/**
 * 2. POST /api/response/generate
 * Generates an evidence-backed merchant defense narrative from the Evidence Matrix
 */
router.post('/generate', async (req, res) => {
  try {
    const { disputeId, force, useAI } = req.body;

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        error: 'disputeId is required in request body.'
      });
    }

    const pkg = await responseService.generateDefenseNarrative(disputeId, {
      force: Boolean(force),
      useAI: useAI !== false
    });

    res.status(201).json({
      success: true,
      message: 'Defense narrative generated successfully.',
      responsePackage: pkg
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      code: err.code || 'GENERATION_FAILED',
      error: err.message,
      existingPackage: err.existingPackage || undefined
    });
  }
});

/**
 * 3. PUT /api/response/:disputeId
 * Allows merchants to edit the generated narrative text and add custom notes
 */
router.put('/:disputeId', async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { narrative, merchantNotes } = req.body;

    if (narrative === undefined && merchantNotes === undefined) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (narrative or merchantNotes) is required to update.'
      });
    }

    const updated = await responseService.updateResponseDraft(disputeId, {
      narrative,
      merchantNotes
    });

    res.json({
      success: true,
      message: 'Response draft updated successfully.',
      responsePackage: updated
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
 * 4. POST /api/response/approve
 * Marks the response package as reviewed and approved by merchant
 */
router.post('/approve', async (req, res) => {
  try {
    const { disputeId, approvedBy, notes } = req.body;

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        error: 'disputeId is required.'
      });
    }

    const approved = await responseService.approveResponsePackage(disputeId, {
      approvedBy,
      notes
    });

    res.json({
      success: true,
      message: 'Response package approved by merchant.',
      responsePackage: approved
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
 * 5. POST /api/response/unapprove
 * Reverts approval status back to DRAFT for further editing
 */
router.post('/unapprove', async (req, res) => {
  try {
    const { disputeId } = req.body;

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        error: 'disputeId is required.'
      });
    }

    const unapproved = await responseService.unapproveResponsePackage(disputeId);

    res.json({
      success: true,
      message: 'Response package reverted to editable draft.',
      responsePackage: unapproved
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
 * 6. GET /api/response/export/:disputeId
 * Downloads or exports the full validated Defense Dossier as JSON
 */
router.get('/export/:disputeId', async (req, res) => {
  try {
    const { disputeId } = req.params;
    const download = req.query.download === 'true';

    const dossier = await responseService.exportDefenseDossier(disputeId);

    if (download) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="flowpilot-defense-dossier-${disputeId}.json"`
      );
    }

    res.json({
      success: true,
      dossier
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
 * 7. POST /api/response/bundle/:disputeId
 * Compiles and inspects the raw evidence bundle without generating text
 */
router.post('/bundle/:disputeId', async (req, res) => {
  try {
    const { disputeId } = req.params;
    const bundle = await responseService.compileEvidenceBundle(disputeId);

    res.json({
      success: true,
      bundle
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
 * 8. POST /api/response/submit
 * Submits evidence package to PayPal Customer Disputes API (Sandbox only)
 * or performs pre-flight validation in dry-run mode
 */
router.post('/submit', async (req, res) => {
  try {
    const { disputeId, dryRun, attachmentDocId } = req.body;
    if (!disputeId) {
      return res.status(400).json({
        success: false,
        error: 'disputeId is required in request body.'
      });
    }

    const paypalService = require('../services/paypalService');
    const result = await paypalService.submitEvidence(disputeId, {
      dryRun: Boolean(dryRun),
      attachmentDocId
    });

    const statusCode = result.success ? 200 : (
      result.status === 'PRE_FLIGHT_FAILED' ||
      result.status === 'DEMO_DISPUTE_REJECTED' ||
      result.status === 'PACKAGE_NOT_APPROVED' ||
      result.status === 'DUPLICATE_SUBMISSION' ||
      result.status === 'NOT_SANDBOX_MODE' ||
      result.status === 'ATTACHMENT_OVERSIZED' ||
      result.status === 'ATTACHMENT_UNSUPPORTED_TYPE' ||
      result.status === 'ATTACHMENT_FILE_MISSING' ? 400 :
      result.status === 'INSUFFICIENT_SCOPE' ? 403 :
      result.status === 'INVALID_LIFECYCLE_STAGE' ||
      result.status === 'HATEOAS_LINK_MISSING' ? 422 :
      result.status === 'SUBMISSION_UNKNOWN' ? 504 : 502
    );

    res.status(statusCode).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;

/**
 * FlowPilot — Module 3: AI Evidence Intelligence
 * Express Router: /api/intelligence
 * 
 * Provides:
 * - POST /api/intelligence/analyze: Runs AI evidence intelligence analysis on a dispute
 * - GET /api/intelligence/analysis/:disputeId: Retrieves analysis for a dispute
 * - GET /api/intelligence/evidence/:disputeId: Retrieves associated evidence documents
 * - GET /api/intelligence/requirements/:reason: Returns requirements for dispute reason
 * - POST /api/intelligence/extract: Direct document fact extraction endpoint
 */

const express = require('express');
const router = express.Router();
const evidenceIntelligenceService = require('../services/evidenceIntelligenceService');
const geminiService = require('../services/geminiService');
const supabaseService = require('../services/supabaseService');
const { getSyntheticEvidenceForDispute } = require('../services/mockEvidence');

// In-memory cache for computed analyses
const analysisCache = new Map();

/**
 * POST /api/intelligence/analyze
 * Analyzes evidence against dispute requirements
 */
router.post('/analyze', async (req, res) => {
  try {
    const { disputeId, dispute: inputDispute, evidence } = req.body;

    if (!disputeId && !inputDispute) {
      return res.status(400).json({
        success: false,
        error: 'Either disputeId or dispute payload must be provided for AI analysis.'
      });
    }

    // Resolve dispute object
    let dispute = inputDispute;
    if (!dispute && disputeId) {
      dispute = await supabaseService.getDisputeById(disputeId);
      if (!dispute) {
        return res.status(404).json({
          success: false,
          error: `Dispute with identifier "${disputeId}" was not found.`
        });
      }
    }

    // Run AI Evidence Intelligence Analysis
    const analysisResult = await evidenceIntelligenceService.analyzeDisputeEvidence(
      dispute,
      evidence
    );

    // Cache the result
    const targetId = dispute.id || disputeId;
    analysisCache.set(targetId, {
      ...analysisResult,
      analyzedAt: new Date().toISOString(),
      disputeId: targetId
    });

    // Update dispute evidence handoff state if in store
    try {
      const anyContradicted = analysisResult.evidenceMatrix.some((m) => m.status === 'CONTRADICTED');
      const anyMissing = analysisResult.missingEvidence.length > 0;
      const statusToSet = anyContradicted ? 'NEEDS_REVIEW' : (anyMissing ? 'PENDING_INPUT' : 'SUPPORTED');

      dispute.evidenceHandoff = {
        ...dispute.evidenceHandoff,
        evidenceCount: analysisResult.sourceReferences.length,
        aiAnalysisStatus: statusToSet
      };
      await supabaseService.upsertDisputes([dispute]);
    } catch (err) {
      // Non-blocking update failure
      console.warn('[Intelligence] Could not update dispute evidence handoff state:', err.message);
    }

    res.json({
      success: true,
      disputeId: targetId,
      analysis: analysisResult,
      geminiConfigured: geminiService.isConfigured()
    });
  } catch (err) {
    console.error('[Intelligence Error] Analysis execution failed:', err);
    res.status(500).json({
      success: false,
      error: 'AI Evidence Intelligence analysis failed',
      details: err.message
    });
  }
});

/**
 * GET /api/intelligence/analysis/:disputeId
 * Retrieves cached or pre-computed analysis for a dispute
 */
router.get('/analysis/:disputeId', async (req, res) => {
  try {
    const { disputeId } = req.params;

    if (analysisCache.has(disputeId)) {
      return res.json({
        success: true,
        disputeId,
        analysis: analysisCache.get(disputeId),
        cached: true
      });
    }

    // If not cached, dynamically generate it
    const dispute = await supabaseService.getDisputeById(disputeId);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: `Dispute "${disputeId}" not found.`
      });
    }

    const analysis = await evidenceIntelligenceService.analyzeDisputeEvidence(dispute);
    analysisCache.set(disputeId, {
      ...analysis,
      analyzedAt: new Date().toISOString(),
      disputeId
    });

    res.json({
      success: true,
      disputeId,
      analysis,
      cached: false
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence analysis',
      details: err.message
    });
  }
});

/**
 * GET /api/intelligence/evidence/:disputeId
 * Retrieves evidence documents associated with a dispute
 */
router.get('/evidence/:disputeId', (req, res) => {
  const { disputeId } = req.params;
  const docs = getSyntheticEvidenceForDispute(disputeId);
  res.json({
    success: true,
    disputeId,
    count: docs.length,
    documents: docs
  });
});

/**
 * GET /api/intelligence/requirements/:reason
 * Returns applicable category requirements for a given PayPal dispute reason
 */
router.get('/requirements/:reason', (req, res) => {
  const { reason } = req.params;
  const reqs = evidenceIntelligenceService.getRequirementsForReason(reason);
  res.json({
    success: true,
    reason,
    requirements: reqs,
    approvedStatuses: ['SUPPORTED', 'MISSING', 'CONTRADICTED', 'NEEDS_REVIEW']
  });
});

/**
 * POST /api/intelligence/extract
 * Direct extraction endpoint for a single document
 */
router.post('/extract', async (req, res) => {
  try {
    const { text, documentType } = req.body;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Document text is required for fact extraction.'
      });
    }

    const facts = await geminiService.extractDocumentFacts(text, documentType || 'OTHER');
    res.json({
      success: true,
      facts,
      geminiConfigured: geminiService.isConfigured()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Document extraction failed',
      details: err.message
    });
  }
});

module.exports = router;

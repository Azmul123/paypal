/**
 * FlowPilot — Module 1: Dispute Management
 * Express Router: /api/disputes
 */

const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const paypalService = require('../services/paypalService');

/**
 * GET /api/disputes/stats/overview
 * Overview metrics for Dashboard KPI cards
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const disputes = await supabaseService.getDisputes();

    const totalDisputes = disputes.length;
    const openDisputes = disputes.filter(
      (d) => d.status === 'OPEN' || d.status === 'WAITING_FOR_SELLER_RESPONSE' || d.status === 'UNDER_REVIEW'
    ).length;
    const resolvedDisputes = disputes.filter(
      (d) => d.status === 'RESOLVED' || d.status === 'CANCELLED'
    ).length;

    const now = Date.now();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    const attentionRequired = disputes.filter((d) => {
      if (d.status === 'RESOLVED' || d.status === 'CANCELLED') return false;
      if (d.status === 'WAITING_FOR_SELLER_RESPONSE') return true;
      if (d.responseDeadline) {
        const diff = new Date(d.responseDeadline).getTime() - now;
        return diff <= fiveDaysMs; // Attention required if within 5 days OR overdue
      }
      return false;
    }).length;

    const totalDisputedAmount = disputes
      .filter((d) => d.status !== 'RESOLVED' && d.status !== 'CANCELLED')
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const recentActivity = disputes.slice(0, 5);

    res.json({
      success: true,
      stats: {
        totalDisputes,
        openDisputes,
        resolvedDisputes,
        attentionRequired,
        totalDisputedAmount: Math.round(totalDisputedAmount * 100) / 100,
        currency: 'USD'
      },
      recentActivity,
      dataSource: paypalService.isConfigured() ? 'paypal_sandbox' : 'demo',
      supabaseConnected: supabaseService.isConfigured()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to compute dispute statistics',
      details: err.message
    });
  }
});

/**
 * GET /api/disputes
 * Search, filter, and sort disputes
 */
router.get('/', async (req, res) => {
  try {
    const { status, search, sortBy, order } = req.query;

    const disputes = await supabaseService.getDisputes({
      status,
      search,
      sortBy,
      order
    });

    res.json({
      success: true,
      count: disputes.length,
      data: disputes,
      dataSource: paypalService.isConfigured() ? 'paypal_sandbox' : 'demo'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve disputes',
      details: err.message
    });
  }
});

/**
 * GET /api/disputes/:id
 * Retrieve a single dispute by ID or PayPal Dispute ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dispute = await supabaseService.getDisputeById(id);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: `Dispute with identifier "${id}" was not found.`
      });
    }

    res.json({
      success: true,
      data: dispute
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dispute detail',
      details: err.message
    });
  }
});

/**
 * POST /api/disputes/sync
 * Sync latest disputes from PayPal Sandbox (or reload demo seed)
 */
router.post('/sync', async (req, res) => {
  try {
    if (paypalService.isConfigured()) {
      const liveDisputes = await paypalService.fetchPayPalDisputes();
      await supabaseService.upsertDisputes(liveDisputes);

      return res.json({
        success: true,
        syncedCount: liveDisputes.length,
        source: 'paypal_sandbox',
        message: `Successfully synced ${liveDisputes.length} disputes from PayPal Sandbox.`
      });
    } else {
      // In demo mode: reload demo records into memory store
      const refreshed = supabaseService.resetToMockSeed();
      return res.json({
        success: true,
        syncedCount: refreshed.length,
        source: 'demo',
        message: 'Refreshed demo dataset (PayPal credentials not configured).'
      });
    }
  } catch (err) {
    res.status(502).json({
      success: false,
      error: 'Dispute synchronization failed',
      details: err.message
    });
  }
});

module.exports = router;

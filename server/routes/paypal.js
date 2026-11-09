/**
 * FlowPilot — Module 1: Dispute Management
 * Express Router: /api/paypal
 * Handles PayPal account connection, mode toggling, and credential verification
 */

const express = require('express');
const router = express.Router();
const paypalService = require('../services/paypalService');
const supabaseService = require('../services/supabaseService');

/**
 * GET /api/paypal/status
 * Returns connection status and active operational mode
 */
router.get('/status', async (req, res) => {
  const isConfigured = paypalService.isConfigured();
  const rawClientId = process.env.PAYPAL_CLIENT_ID || '';
  const maskedClientId = rawClientId.length > 8
    ? `${rawClientId.substring(0, 4)}...${rawClientId.substring(rawClientId.length - 4)}`
    : (rawClientId ? 'Configured' : null);

  const supabaseHealth = await supabaseService.testConnection();

  res.json({
    success: true,
    connected: isConfigured,
    mode: isConfigured ? (process.env.PAYPAL_MODE || 'sandbox') : 'demo',
    isSandbox: (process.env.PAYPAL_MODE || 'demo') === 'sandbox',
    maskedClientId: maskedClientId,
    hasSecret: Boolean(process.env.PAYPAL_CLIENT_SECRET),
    environment: {
      paypalApiBase: paypalService.getBaseUrl(),
      supabaseProvider: supabaseHealth.provider,
      supabaseConnected: supabaseHealth.connected
    }
  });
});

/**
 * POST /api/paypal/test
 * Test credentials without committing them
 */
router.post('/test', async (req, res) => {
  const { clientId, clientSecret } = req.body;

  if (!clientId || !clientSecret) {
    return res.status(400).json({
      success: false,
      error: 'Both Client ID and Client Secret are required to test the connection.'
    });
  }

  const result = await paypalService.testConnection(clientId, clientSecret);
  if (result.success) {
    return res.json({
      success: true,
      message: 'PayPal Sandbox OAuth 2.0 authentication succeeded.',
      details: result
    });
  } else {
    return res.status(401).json({
      success: false,
      error: 'PayPal authentication failed. Please verify your Sandbox Client ID and Secret in developer.paypal.com.',
      details: result.error
    });
  }
});

/**
 * POST /api/paypal/connect
 * Connect PayPal Sandbox credentials in runtime
 */
router.post('/connect', async (req, res) => {
  const { clientId, clientSecret } = req.body;

  if (!clientId || !clientSecret) {
    return res.status(400).json({
      success: false,
      error: 'Both Client ID and Client Secret are required.'
    });
  }

  // Verify credentials first
  const testResult = await paypalService.testConnection(clientId, clientSecret);
  if (!testResult.success) {
    return res.status(401).json({
      success: false,
      error: 'PayPal authentication failed. Invalid Sandbox Client ID or Secret.',
      details: testResult.error
    });
  }

  // Set in runtime environment
  process.env.PAYPAL_CLIENT_ID = clientId.trim();
  process.env.PAYPAL_CLIENT_SECRET = clientSecret.trim();
  process.env.PAYPAL_MODE = 'sandbox';

  // Fetch disputes from Sandbox if available
  let syncedCount = 0;
  try {
    const sandboxDisputes = await paypalService.fetchPayPalDisputes();
    if (sandboxDisputes.length > 0) {
      await supabaseService.upsertDisputes(sandboxDisputes);
      syncedCount = sandboxDisputes.length;
    }
  } catch (err) {
    console.warn('[PayPal Connect] Connected, but initial disputes fetch encountered:', err.message);
  }

  res.json({
    success: true,
    message: 'Successfully connected to PayPal Sandbox!',
    mode: 'sandbox',
    syncedCount: syncedCount
  });
});

/**
 * POST /api/paypal/disconnect
 * Disconnects PayPal and restores Demo mode
 */
router.post('/disconnect', (req, res) => {
  process.env.PAYPAL_CLIENT_ID = '';
  process.env.PAYPAL_CLIENT_SECRET = '';
  process.env.PAYPAL_MODE = 'demo';
  paypalService.token = null;
  paypalService.tokenExpiresAt = 0;

  // Restore demo seed
  supabaseService.resetToMockSeed();

  res.json({
    success: true,
    message: 'Disconnected PayPal Sandbox. Switched to FlowPilot Demo Mode with sample disputes.',
    mode: 'demo'
  });
});

module.exports = router;

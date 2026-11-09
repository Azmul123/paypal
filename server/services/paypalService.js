/**
 * FlowPilot — Module 1: Dispute Management
 * Official PayPal REST API Service (Sandbox / Live)
 * 
 * Implements:
 * 1. OAuth 2.0 Client Credentials Token Generation
 * 2. GET /v1/customer-disputes (Disputes listing)
 * 3. GET /v1/customer-disputes/{dispute_id} (Dispute details)
 * 4. Data normalizer to FlowPilot standard schema
 * 
 * Docs: https://developer.paypal.com/docs/api/customer-disputes/v1/
 */

const axios = require('axios');

class PayPalService {
  constructor() {
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  getBaseUrl(mode = null) {
    const activeMode = mode || process.env.PAYPAL_MODE || 'demo';
    if (activeMode === 'live') {
      return 'https://api-m.paypal.com';
    }
    return 'https://api-m.sandbox.paypal.com';
  }

  getClientCredentials() {
    return {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      mode: process.env.PAYPAL_MODE || 'demo'
    };
  }

  isConfigured() {
    const { clientId, clientSecret, mode } = this.getClientCredentials();
    return (
      (mode === 'sandbox' || mode === 'live') &&
      Boolean(clientId && clientId.trim() && clientSecret && clientSecret.trim())
    );
  }

  /**
   * Generates or returns a cached OAuth 2.0 access token using client_credentials grant
   */
  async getAccessToken(customClientId = null, customClientSecret = null) {
    const clientId = customClientId || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = customClientSecret || process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        'PayPal Client ID and Secret are not configured in environment variables.'
      );
    }

    // Check cached token if not using custom credentials
    const now = Date.now();
    if (!customClientId && this.token && this.tokenExpiresAt > now + 60000) {
      return this.token;
    }

    const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
    const baseUrl = this.getBaseUrl();

    try {
      const response = await axios.post(
        `${baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authHeader}`,
            'Accept': 'application/json',
            'Accept-Language': 'en_US'
          },
          timeout: 10000
        }
      );

      const { access_token, expires_in } = response.data;

      // Cache if using default credentials
      if (!customClientId) {
        this.token = access_token;
        this.tokenExpiresAt = now + ((expires_in || 3600) * 1000);
      }

      return access_token;
    } catch (err) {
      const errorDetail = err.response?.data?.error_description || err.response?.data?.message || err.message;
      throw new Error(`PayPal OAuth Authentication Failed: ${errorDetail}`);
    }
  }

  /**
   * Tests the connection with provided or saved credentials
   */
  async testConnection(clientId = null, clientSecret = null) {
    try {
      const token = await this.getAccessToken(clientId, clientSecret);
      return {
        success: true,
        authenticated: true,
        mode: process.env.PAYPAL_MODE || 'sandbox',
        message: 'Successfully authenticated with PayPal Sandbox REST API.',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return {
        success: false,
        authenticated: false,
        mode: process.env.PAYPAL_MODE || 'demo',
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Fetches disputes from the official PayPal REST Customer Disputes API
   */
  async fetchPayPalDisputes(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('PAYPAL_NOT_CONFIGURED');
    }

    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    try {
      const response = await axios.get(`${baseUrl}/v1/customer-disputes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page_size: params.pageSize || 20,
          dispute_state: params.disputeState || undefined
        },
        timeout: 10000
      });

      const items = response.data.items || [];
      return items.map((raw) => this.normalizeDispute(raw, 'paypal_sandbox'));
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      throw new Error(`Failed to retrieve customer disputes from PayPal: ${errorMsg}`);
    }
  }

  /**
   * Fetches single dispute details from PayPal Customer Disputes API
   */
  async fetchPayPalDisputeById(disputeId) {
    if (!this.isConfigured()) {
      throw new Error('PAYPAL_NOT_CONFIGURED');
    }

    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    try {
      const response = await axios.get(`${baseUrl}/v1/customer-disputes/${disputeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return this.normalizeDispute(response.data, 'paypal_sandbox');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      throw new Error(`Failed to fetch dispute ${disputeId} from PayPal: ${errorMsg}`);
    }
  }

  /**
   * Maps PayPal's raw REST dispute format to FlowPilot's clean standard schema
   */
  normalizeDispute(raw, source = 'paypal_sandbox') {
    const disputeId = raw.dispute_id || raw.id;
    const tx = (raw.disputed_transactions && raw.disputed_transactions[0]) || {};
    const amountVal = raw.dispute_amount?.value || tx.disputed_amount?.value || tx.gross_amount?.value || 0;
    const currencyVal = raw.dispute_amount?.currency_code || tx.disputed_amount?.currency_code || 'USD';

    // Format human readable reason
    const reasonRaw = raw.reason || 'OTHER';
    const reasonFormatted = this.formatReason(reasonRaw);

    // Format messages
    const messages = (raw.messages || []).map((m) => ({
      postedBy: m.posted_by || 'UNKNOWN',
      senderName: m.posted_by === 'BUYER' ? 'Buyer' : (m.posted_by === 'SELLER' ? 'Merchant' : 'PayPal Support'),
      content: m.content || '',
      createdAt: m.time_posted || raw.create_time || new Date().toISOString()
    }));

    return {
      id: `disp_${disputeId}`,
      paypalDisputeId: disputeId,
      transactionId: tx.seller_transaction_id || tx.buyer_transaction_id || tx.id || 'TXN_UNAVAILABLE',
      reason: reasonRaw,
      reasonFormatted: reasonFormatted,
      amount: parseFloat(amountVal),
      currency: currencyVal,
      status: this.normalizeStatus(raw.status),
      lifecycleStage: raw.dispute_life_cycle_stage || 'INQUIRY',
      responseDeadline: raw.seller_response_due_date || null,
      transactionDate: tx.create_time || raw.create_time || null,
      createdAt: raw.create_time || new Date().toISOString(),
      updatedAt: raw.update_time || raw.create_time || new Date().toISOString(),
      source: source,
      customer: {
        name: raw.buyer?.name || 'Customer (PayPal Account)',
        email: raw.buyer?.email || 'N/A'
      },
      disputeChannel: raw.dispute_channel || 'INTERNAL',
      itemDetails: (tx.items || []).map((i) => ({
        name: i.item_name || 'Standard Disputed Goods/Service',
        quantity: parseInt(i.quantity, 10) || 1,
        unitPrice: parseFloat(i.unit_price?.value || 0)
      })),
      messages: messages,
      sellerActionsNeeded: this.inferActionsNeeded(reasonRaw, raw.status),
      rawPayload: raw,
      evidenceHandoff: {
        evidenceCount: 0,
        aiAnalysisStatus: 'PENDING_INPUT',
        responseStatus: 'NOT_STARTED'
      }
    };
  }

  normalizeStatus(status) {
    if (!status) return 'OPEN';
    const s = status.toUpperCase();
    if (s.includes('RESOLVED') || s === 'CLOSED') return 'RESOLVED';
    if (s.includes('WAITING_FOR_SELLER')) return 'WAITING_FOR_SELLER_RESPONSE';
    if (s.includes('WAITING_FOR_BUYER')) return 'WAITING_FOR_BUYER_RESPONSE';
    if (s.includes('UNDER_REVIEW')) return 'UNDER_REVIEW';
    if (s.includes('CANCEL')) return 'CANCELLED';
    return s;
  }

  formatReason(reason) {
    const reasonsMap = {
      'MERCHANDISE_OR_SERVICE_NOT_RECEIVED': 'Item Not Received (INR)',
      'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED': 'Significantly Not As Described (SNAD)',
      'UNAUTHORISED': 'Unauthorized Transaction / Fraud',
      'CANCELED_RECURRING_BILLING': 'Canceled Recurring Subscription',
      'INCORRECT_AMOUNT': 'Incorrect Transaction Amount',
      'CREDIT_NOT_PROCESSED': 'Credit or Refund Not Processed',
      'DUPLICATE_TRANSACTION': 'Duplicate Transaction',
      'OTHER': 'Other Payment Dispute'
    };
    return reasonsMap[reason] || reason.replace(/_/g, ' ');
  }

  inferActionsNeeded(reason, status) {
    if (status === 'RESOLVED' || status === 'CANCELLED') {
      return [];
    }
    switch (reason) {
      case 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED':
        return [
          'Upload carrier tracking number showing delivery',
          'Confirm recipient delivery address matches PayPal transaction',
          'Provide signature confirmation if order total is >= $750'
        ];
      case 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED':
        return [
          'Provide clear product specification & catalog proof',
          'Upload return policy accepted by customer at checkout',
          'Provide records of customer communications'
        ];
      case 'UNAUTHORISED':
        return [
          'Submit customer login IP log matching cardholder billing address',
          'Provide proof of multi-factor authentication (MFA)',
          'Provide active SaaS/digital service usage logs'
        ];
      default:
        return [
          'Review dispute claim details',
          'Upload relevant merchant transaction receipts',
          'Submit evidence before the deadline'
        ];
    }
  }
}

module.exports = new PayPalService();

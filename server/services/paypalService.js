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
const fs = require('fs');
const path = require('path');

/**
 * Official PayPal Customer Disputes API v1 Supported Evidence Types
 * Reference: https://developer.paypal.com/docs/api/customer-disputes/v1/#disputes_provide_evidence
 */
const KNOWN_PAYPAL_EVIDENCE_TYPES = new Set([
  // Core fulfillment & delivery proofs
  'PROOF_OF_FULFILLMENT',
  'PROOF_OF_DELIVERY_SIGNATURE',
  'PROOF_OF_RECEIPT_COPY',
  'PROOF_OF_RETURN',
  'PROOF_OF_REFUND',
  'PROOF_OF_RESHIPMENT',
  'PROOF_OF_RESIPMENT_OR_REPLACEMENT', // Official PayPal API legacy alias
  'ONLINE_TRACKING_INFORMATION',
  'CREATE_SHIPPING_LABEL',
  'CUSTOMS_DOCUMENT',
  'RECEIPT_OF_MERCHANDISE',

  // Policies, contracts & agreements
  'RETURN_POLICY',
  'COPY_OF_CONTRACT',
  'BILLING_AGREEMENT',
  'TERMINATION_AGREEMENT',

  // Item condition, descriptions & damage evaluations
  'ADDITIONAL_INFORMATION_OF_ITEM',
  'PROOF_OF_DAMAGE',
  'DAMAGE_OR_REPLACEMENT_ESTIMATE',
  'PROOF_OF_MISSING_ITEMS',
  'PROOF_OF_EMPTY_PACKAGE_OR_DIFFERENT_ITEM',
  'PROOF_OF_ITEM_NOT_RECEIVED',
  'THIRDPARTY_PROOF_FOR_DAMAGE_OR_SIGNIFICANT_DIFFERENCE',

  // Official declarations, affidavits & reports
  'DECLARATION',
  'POLICE_REPORT',
  'BUYER_CONFIRMATION',
  'APPEAL_AFFIDAVIT',
  'VALID_SUPPORTING_DOCUMENT',

  // General catch-all supported by PayPal Disputes API
  'OTHER'
]);

/**
 * Official PayPal Customer Disputes API v1 evidence types that accept tracking_info in evidence_info
 * In PayPal official schema, evidence_info.tracking_info is strictly supported ONLY for:
 * - PROOF_OF_FULFILLMENT
 * - PROOF_OF_RETURN
 * PROOF_OF_REFUND accepts evidence_info.refund_ids.
 * Other evidence types (including PROOF_OF_DELIVERY_SIGNATURE, ONLINE_TRACKING_INFORMATION,
 * RETURN_POLICY, etc.) do NOT accept tracking_info in evidence_info.
 */
const EVIDENCE_TYPES_ACCEPTING_TRACKING = new Set([
  'PROOF_OF_FULFILLMENT',
  'PROOF_OF_RETURN'
]);

const EVIDENCE_TYPES_ACCEPTING_REFUND_IDS = new Set([
  'PROOF_OF_REFUND'
]);

/**
 * Evaluates whether an evidence request matches the PROVIDE_EVIDENCE action workflow.
 * 
 * Strict Phase 4.3 Rules:
 * 1. Confirm action_info.action is read from the individual evidence object.
 *    - If entry-level action_info.action or action is specified:
 *      * Must equal 'PROVIDE_EVIDENCE'.
 *      * Exclude other actions (e.g. 'APPEAL', 'ACKNOWLEDGE_RETURN_ITEM').
 * 2. If action metadata is missing on the individual evidence object:
 *    - Require an eligible live dispute status ('WAITING_FOR_SELLER_RESPONSE')
 *      AND the actual 'provide-evidence' HATEOAS link in the dispute's links array.
 *    - Do NOT rely on undocumented dispute-level action metadata.
 * 3. Mandatory source condition:
 *    - Caller must verify ev.source === 'REQUESTED_FROM_SELLER'.
 */
function isEvidenceRequestActionValid(ev, liveDispute = null, dispute = null) {
  if (!ev) return { valid: false, reason: 'ENTRY_NULL' };

  // 1. Confirm action_info.action is read from the individual evidence object
  const entryAction = ev.action_info?.action || ev.action;
  if (entryAction) {
    const isProvideEvidence = entryAction === 'PROVIDE_EVIDENCE';
    return {
      valid: isProvideEvidence,
      action: entryAction,
      provenance: 'ENTRY_ACTION_INFO',
      reason: isProvideEvidence ? null : `ACTION_MISMATCH_${entryAction}`
    };
  }

  // 2. If action metadata is missing on the individual evidence object:
  // Require an eligible live dispute status ('WAITING_FOR_SELLER_RESPONSE')
  // AND the actual 'provide-evidence' HATEOAS link in the dispute's links array.
  // Do NOT rely on undocumented dispute-level action metadata.
  const disputeStatus = (liveDispute?.status || dispute?.status || '').toUpperCase();
  const isEligibleStatus = disputeStatus === 'WAITING_FOR_SELLER_RESPONSE';

  const links = liveDispute?.links || liveDispute?.rawPayload?.links || dispute?.links || dispute?.rawPayload?.links || [];
  const hasProvideEvidenceLink = Array.isArray(links) && links.some((l) => l && l.rel === 'provide-evidence');

  if (isEligibleStatus && hasProvideEvidenceLink) {
    return {
      valid: true,
      action: 'PROVIDE_EVIDENCE_INFERRED_FROM_STAGE_AND_HATEOAS',
      provenance: 'CONSERVATIVE_WAITING_FOR_SELLER_RESPONSE_WITH_HATEOAS',
      reason: null
    };
  }

  return {
    valid: false,
    action: null,
    provenance: 'MISSING_ACTION_INELIGIBLE_DISPUTE',
    reason: !isEligibleStatus
      ? `Dispute status "${disputeStatus}" is not eligible for evidence submission (requires WAITING_FOR_SELLER_RESPONSE).`
      : 'Dispute lacks documented "provide-evidence" HATEOAS link.'
  };
}

/**
 * Extracts item ID from a document or evidence item.
 */
function getDocumentItemId(doc) {
  if (!doc) return null;
  return (
    doc.itemId ||
    doc.disputeItemId ||
    doc.item_id ||
    doc.metadata?.itemId ||
    doc.metadata?.item_id ||
    doc.metadata?.disputeItemId ||
    null
  );
}

/**
 * Maps carrier string to PayPal carrier schema.
 * PayPal enum carriers: FEDEX, UPS, USPS, DHL.
 * If unknown carrier is provided, use OTHER and supply actual name in carrier_name_other.
 * If carrier is missing, empty, or literally 'OTHER' with no name, do NOT create tracking_info.
 */
function mapCarrierName(rawCarrier) {
  if (!rawCarrier || typeof rawCarrier !== 'string' || rawCarrier.trim().length === 0) {
    return { isCarrierProvided: false, carrierName: null, carrierNameOther: null };
  }
  const trimmed = rawCarrier.trim();
  const upper = trimmed.toUpperCase();

  const validEnums = ['FEDEX', 'UPS', 'USPS', 'DHL'];
  for (const c of validEnums) {
    if (upper.includes(c)) {
      return { isCarrierProvided: true, carrierName: c, carrierNameOther: null };
    }
  }

  // If upper is literally 'OTHER' and no other name was provided:
  if (upper === 'OTHER') {
    return { isCarrierProvided: false, carrierName: null, carrierNameOther: null };
  }

  // Unknown carrier: map to OTHER and provide raw string in carrierNameOther
  return { isCarrierProvided: true, carrierName: 'OTHER', carrierNameOther: trimmed };
}

/**
 * Collects refund IDs from dispute, responsePackage, or documents for PROOF_OF_REFUND.
 */
function getRefundIds(dispute, responsePackage, documents = []) {
  const ids = new Set();
  if (dispute?.refund_ids && Array.isArray(dispute.refund_ids)) {
    dispute.refund_ids.forEach((id) => id && ids.add(String(id).trim()));
  }
  if (responsePackage?.refundIds && Array.isArray(responsePackage.refundIds)) {
    responsePackage.refundIds.forEach((id) => id && ids.add(String(id).trim()));
  }
  documents.forEach((doc) => {
    if (doc.refundId) ids.add(String(doc.refundId).trim());
    if (doc.refund_id) ids.add(String(doc.refund_id).trim());
  });
  return Array.from(ids).filter(Boolean);
}

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
      const response = await axios.get(`${baseUrl}/v1/customer/disputes`, {
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
   * Official Endpoint: GET /v1/customer/disputes/{dispute_id}
   */
  async fetchPayPalDisputeById(disputeId) {
    if (!this.isConfigured()) {
      throw new Error('PAYPAL_NOT_CONFIGURED');
    }

    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();

    try {
      const response = await axios.get(`${baseUrl}/v1/customer/disputes/${encodeURIComponent(disputeId)}`, {
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
      links: raw.links || [],
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
          'Upload carrier proof of delivery with tracking number',
          'Confirm recipient delivery address and delivery status with carrier',
          'Review transaction details to determine if signature confirmation is applicable under PayPal policy (NEEDS_REVIEW)'
        ];
      case 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED':
        return [
          'Provide item specification and product listing documentation',
          'Upload proof of return/refund policy accepted at checkout (NEEDS_REVIEW)',
          'Provide customer communication history regarding the alleged discrepancy'
        ];
      case 'UNAUTHORISED':
        return [
          'Provide valid proof of delivery or proof of service fulfillment',
          'Submit customer authentication or account activity logs (NEEDS_REVIEW)',
          'Provide verified billing and transaction correspondence'
        ];
      default:
        return [
          'Review specific dispute reason and PayPal guidance documentation',
          'Compile merchant transaction receipts and customer agreements',
          'Verify all evidence requirements prior to submission deadline (NEEDS_REVIEW)'
        ];
    }
  }

  /**
   * Pre-flight validation before any submission attempt
   */
  validatePreFlightSubmission({ dispute, responsePackage, documents = [] }) {
    const errors = [];

    // 1. Must be in Sandbox mode
    const mode = process.env.PAYPAL_MODE || 'demo';
    if (mode !== 'sandbox') {
      errors.push({
        code: 'NOT_SANDBOX_MODE',
        message: `Current operational mode is "${mode}". Evidence submission is strictly permitted only in "sandbox" mode.`
      });
    }

    // 2. Reject synthetic demo disputes
    const disputeId = dispute?.id || '';
    if (disputeId.startsWith('disp_fp_') || dispute?.source === 'demo') {
      errors.push({
        code: 'DEMO_DISPUTE_REJECTED',
        message: `Dispute "${disputeId}" is a synthetic demo case and cannot be submitted to PayPal Sandbox. Connect a real PayPal Sandbox account with test disputes.`
      });
    }

    // 3. Approval state verification
    if (!responsePackage || responsePackage.status !== 'APPROVED' || !responsePackage.approval?.isApproved) {
      errors.push({
        code: 'PACKAGE_NOT_APPROVED',
        message: 'Response package must be reviewed and approved by merchant prior to PayPal submission.'
      });
    }

    // 4. Duplicate submission protection
    if (responsePackage?.submission?.status === 'SUBMITTED') {
      errors.push({
        code: 'DUPLICATE_SUBMISSION',
        message: `Response package was already submitted to PayPal on ${responsePackage.submission.timestamp} (Ack ID: ${responsePackage.submission.paypalAcknowledgementId}). Resubmission is blocked.`
      });
    }

    // 5. Document existence & attachment validation
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    for (const doc of documents) {
      // Check file on disk if storagePath or storageUrl is local
      if (doc.storagePath && !fs.existsSync(doc.storagePath)) {
        errors.push({
          code: 'ATTACHMENT_FILE_MISSING',
          message: `Referenced document "${doc.id}" (${doc.fileName}) was not found in storage at ${doc.storagePath}.`
        });
      }
      if (doc.fileSizeBytes && doc.fileSizeBytes > maxSizeBytes) {
        errors.push({
          code: 'ATTACHMENT_OVERSIZED',
          message: `Document "${doc.id}" (${doc.fileSizeBytes} bytes) exceeds PayPal's 10MB limit.`
        });
      }
      if (doc.mimeType && !allowedMimeTypes.includes(doc.mimeType.toLowerCase())) {
        errors.push({
          code: 'ATTACHMENT_UNSUPPORTED_TYPE',
          message: `Document "${doc.id}" has unsupported MIME type "${doc.mimeType}". PayPal only accepts PDF, JPEG, and PNG.`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Pre-flight checks on live PayPal dispute details
   */
  validateLivePayPalDisputePreFlight(paypalDispute) {
    const errors = [];

    // 1. Check status: Must be WAITING_FOR_SELLER_RESPONSE
    const status = (paypalDispute.status || '').toUpperCase();
    if (status !== 'WAITING_FOR_SELLER_RESPONSE') {
      errors.push({
        code: 'INVALID_LIFECYCLE_STAGE',
        message: `PayPal dispute status is "${status}". Evidence can only be submitted when status is "WAITING_FOR_SELLER_RESPONSE".`
      });
    }

    // 2. Check HATEOAS links for rel="provide-evidence"
    const links = paypalDispute.links || paypalDispute.rawPayload?.links || [];
    const hasProvideEvidenceLink = links.some((l) => l.rel === 'provide-evidence');
    if (!hasProvideEvidenceLink) {
      errors.push({
        code: 'HATEOAS_LINK_MISSING',
        message: 'Dispute details response does not contain a "provide-evidence" HATEOAS link. PayPal is not currently accepting evidence for this claim.'
      });
    }

    // 3. Check for evidence entries requested from seller (REQUESTED_FROM_SELLER)
    // AND matching action "PROVIDE_EVIDENCE" (or conservative fallback in WAITING_FOR_SELLER_RESPONSE)
    const rawEvidences = paypalDispute.rawPayload?.evidences || paypalDispute.evidences || [];
    const sellerRequests = rawEvidences.filter((e) => {
      if (!e || e.source !== 'REQUESTED_FROM_SELLER') return false;
      const actionResult = isEvidenceRequestActionValid(e, paypalDispute, null);
      return actionResult.valid;
    });

    if (sellerRequests.length === 0) {
      errors.push({
        code: 'NO_SELLER_EVIDENCE_REQUESTED',
        message: 'PayPal dispute does not have any pending evidence requests for the seller matching action "PROVIDE_EVIDENCE" (source: REQUESTED_FROM_SELLER).'
      });
    }

    // 4. Check for unknown evidence types in seller requests
    for (const req of sellerRequests) {
      if (req.evidence_type && !KNOWN_PAYPAL_EVIDENCE_TYPES.has(req.evidence_type)) {
        errors.push({
          code: 'UNKNOWN_EVIDENCE_TYPE',
          message: `PayPal dispute requested evidence type "${req.evidence_type}" is unknown or unsupported by PayPal Disputes schema.`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Maps evidence documents and narrative to PayPal's official API schema.
   * 
   * STRICT PHASE 4.2 RULES:
   * 1. Strictly selects evidence entries whose source is exactly 'REQUESTED_FROM_SELLER'.
   * 2. Matches evidence requests to the correct PayPal action (PROVIDE_EVIDENCE).
   *    - Excludes requests associated with other actions (e.g. APPEAL, ACKNOWLEDGE_RETURN_ITEM).
   *    - Handles missing action metadata conservatively (allowed in WAITING_FOR_SELLER_RESPONSE).
   * 3. Prevents invalid OTHER carrier payloads:
   *    - Known carrier -> mapped to PayPal carrier enum (FEDEX, UPS, USPS, DHL).
   *    - Unknown carrier -> carrier_name: 'OTHER' with actual name in carrier_name_other.
   *    - Missing carrier -> do NOT create tracking_info entry. Never submit OTHER with missing/empty carrier_name_other.
   *    - Preserves tracking number as unverified merchant-provided entry in metadata.
   * 4. Prevents unrelated tracking information from being attached:
   *    - Associates tracking records with correct PayPal items using reliable item_id.
   *    - If association cannot be established, does not automatically attach the tracking record.
   *    - Records exclusion reasons (UNASSOCIATED_ITEM_ID, MISMATCHED_ITEM_ID) in tracking metadata.
   * 5. Enforces evidence_info schema restrictions:
   *    - evidence_info.tracking_info is strictly supported ONLY for PROOF_OF_FULFILLMENT and PROOF_OF_RETURN.
   *    - evidence_info.refund_ids is supported for PROOF_OF_REFUND.
   *    - Never attaches tracking_info to PROOF_OF_DELIVERY_SIGNATURE, ONLINE_TRACKING_INFORMATION, etc.
   * 6. Preserves separation between internal Verification Matrix and official PayPal requirements.
   * 7. Rejects false external verification claims: marks merchant entries as unverified by carrier API.
   */
  mapEvidenceToPayPalSchema({ dispute, responsePackage, documents = [], liveDispute = null }) {
    const narrative = responsePackage?.narrative || '';

    // 1. Retrieve all raw evidence records from live dispute or dispute payload
    const liveEvidences = liveDispute?.rawPayload?.evidences || 
                          liveDispute?.evidences || 
                          dispute?.rawPayload?.evidences || 
                          dispute?.evidences || [];

    // 2. Filter strictly for evidence entries whose source is EXACTLY 'REQUESTED_FROM_SELLER'
    // AND whose action is explicitly 'PROVIDE_EVIDENCE' (or conservative fallback in WAITING_FOR_SELLER_RESPONSE)
    // Exclude REQUESTED_FROM_BUYER, SUBMITTED_BY_BUYER, SUBMITTED_BY_SELLER, SUBMITTED_BY_PARTNER,
    // and exclude non-PROVIDE_EVIDENCE actions (e.g. APPEAL, ACKNOWLEDGE_RETURN_ITEM)
    const sellerRequestedEntries = liveEvidences.filter((ev) => {
      if (!ev || ev.source !== 'REQUESTED_FROM_SELLER') return false;
      const actionResult = isEvidenceRequestActionValid(ev, liveDispute, dispute);
      return actionResult.valid;
    });

    // 3. Block submission immediately if no matching seller-requested evidence exists
    // Do NOT invent an evidence type based on dispute.reason
    // Do NOT silently substitute another evidence type
    // FlowPilot's internal Evidence Verification Matrix does NOT override PayPal's requirements
    if (sellerRequestedEntries.length === 0) {
      const error = new Error(
        'No evidence is currently requested from seller (source: REQUESTED_FROM_SELLER) matching action "PROVIDE_EVIDENCE" on this PayPal dispute. Submission blocked.'
      );
      error.code = 'NO_SELLER_EVIDENCE_REQUESTED';
      error.statusCode = 422;
      throw error;
    }

    // 4. Validate evidence_type of each seller request against official PayPal schema
    for (const req of sellerRequestedEntries) {
      if (!req.evidence_type || !KNOWN_PAYPAL_EVIDENCE_TYPES.has(req.evidence_type)) {
        const error = new Error(
          `PayPal requested evidence type "${req.evidence_type}" is unknown or unsupported by the PayPal Customer Disputes API schema.`
        );
        error.code = 'UNKNOWN_EVIDENCE_TYPE';
        error.statusCode = 422;
        throw error;
      }
    }

    // 5. Tracking Information Processing & Safeguards
    // Rules:
    // - If known carrier: map to PayPal carrier enum (FEDEX, UPS, USPS, DHL)
    // - If unknown carrier: use OTHER and provide actual name in carrier_name_other
    // - If carrier name is missing: do NOT create a tracking_info entry! Never submit OTHER without carrier_name_other.
    // - Preserve tracking number as unverified merchant-provided information in metadata
    // - Associate tracking records with correct PayPal items using reliable item_id
    // - If association cannot be established, do not automatically attach the tracking record
    // - Record exclusion reasons in tracking metadata
    // - Do not claim carrier verification
    const trackingInfoItems = [];
    const trackingMetadataList = [];

    documents.forEach((doc) => {
      const rawTracking = doc.trackingNumber ? String(doc.trackingNumber).trim() : '';
      const fieldPresent = Boolean(rawTracking);
      const docItemId = getDocumentItemId(doc);

      if (!fieldPresent) {
        trackingMetadataList.push({
          documentId: doc.id,
          itemId: docItemId,
          trackingNumber: null,
          fieldPresent: false,
          validStructure: false,
          hasCarrierSpecified: false,
          exclusionReason: 'MISSING_TRACKING_NUMBER',
          externallyVerified: false,
          verificationStatus: 'NOT_APPLICABLE',
          verificationNote: 'Tracking number not present on document.'
        });
        return;
      }

      // Tracking number is present - validate carrier
      const carrierMapping = mapCarrierName(doc.carrierName);

      if (!carrierMapping.isCarrierProvided) {
        // Missing carrier name or empty 'OTHER' — do NOT create tracking_info entry
        trackingMetadataList.push({
          documentId: doc.id,
          itemId: docItemId,
          trackingNumber: rawTracking,
          fieldPresent: true,
          validStructure: false,
          hasCarrierSpecified: false,
          carrierName: null,
          carrierNameOther: null,
          exclusionReason: 'MISSING_CARRIER_NAME',
          externallyVerified: false,
          verificationStatus: 'UNVERIFIED_MERCHANT_ENTRY',
          verificationNote: 'Tracking number present but carrier name is missing. PayPal requires carrier_name_other when carrier is OTHER; tracking_info omitted to prevent invalid payload.'
        });
        return;
      }

      // Carrier is valid (either standard enum or OTHER with non-empty carrier_name_other)
      const trackingEntry = {
        carrier_name: carrierMapping.carrierName,
        tracking_number: rawTracking
      };
      if (carrierMapping.carrierNameOther) {
        trackingEntry.carrier_name_other = carrierMapping.carrierNameOther;
      }

      trackingInfoItems.push({
        ...trackingEntry,
        _docId: doc.id,
        _itemId: docItemId,
        _applicableItemIds: Array.isArray(doc.applicableItemIds) ? doc.applicableItemIds : null
      });

      trackingMetadataList.push({
        documentId: doc.id,
        itemId: docItemId,
        trackingNumber: rawTracking,
        fieldPresent: true,
        validStructure: true,
        hasCarrierSpecified: true,
        carrierName: carrierMapping.carrierName,
        carrierNameOther: carrierMapping.carrierNameOther,
        exclusionReason: null,
        externallyVerified: false, // Strict: Do NOT claim external verification unless a real carrier verification integration exists
        verificationStatus: 'UNVERIFIED_MERCHANT_ENTRY',
        verificationNote: 'Structure validated against PayPal schema; not externally verified with carrier tracking API.'
      });
    });

    // 6. Map each seller-requested evidence type to an entry in the PayPal evidences array
    // Rules:
    // - evidence_info.tracking_info is strictly supported ONLY for PROOF_OF_FULFILLMENT and PROOF_OF_RETURN
    // - evidence_info.refund_ids is supported for PROOF_OF_REFUND
    // - Other evidence types (including PROOF_OF_DELIVERY_SIGNATURE and ONLINE_TRACKING_INFORMATION) do NOT accept tracking_info
    // - Associate tracking records with correct item_id; if item-specific, only matching tracking items attach
    const evidenceEntries = sellerRequestedEntries.map((req) => {
      const entry = {
        evidence_type: req.evidence_type,
        notes: narrative.slice(0, 2000)
      };

      if (req.item_id) {
        entry.item_id = req.item_id;
      }

      // 6a. Check if this evidence type accepts tracking_info
      if (EVIDENCE_TYPES_ACCEPTING_TRACKING.has(req.evidence_type)) {
        const matchingTracking = trackingInfoItems.filter((trk) => {
          if (req.item_id) {
            // Request is for a specific item: only attach tracking associated with that item_id
            if (trk._itemId && trk._itemId === req.item_id) return true;
            if (trk._applicableItemIds && trk._applicableItemIds.includes(req.item_id)) return true;
            return false;
          } else {
            // Dispute-level request: attach tracking records that are not tied to a different specific item
            return !trk._itemId;
          }
        });

        if (matchingTracking.length > 0) {
          entry.evidence_info = {
            tracking_info: matchingTracking.map(({ _docId, _itemId, _applicableItemIds, ...cleanTrk }) => cleanTrk)
          };
        }
      } else if (EVIDENCE_TYPES_ACCEPTING_REFUND_IDS.has(req.evidence_type)) {
        const refundIds = getRefundIds(dispute, responsePackage, documents);
        if (refundIds.length > 0) {
          entry.evidence_info = {
            refund_ids: refundIds
          };
        }
      }

      return entry;
    });

    // 7. Post-process tracking metadata to flag item-association exclusions
    trackingMetadataList.forEach((meta) => {
      if (meta.validStructure && !meta.exclusionReason) {
        const isAttached = evidenceEntries.some((e) => 
          e.evidence_info?.tracking_info?.some((t) => t.tracking_number === meta.trackingNumber)
        );
        if (!isAttached) {
          meta.exclusionReason = meta.itemId ? 'MISMATCHED_ITEM_ID' : 'UNASSOCIATED_ITEM_ID';
          meta.verificationNote = `Tracking number valid, but omitted from submission because ${
            meta.itemId ? `item_id "${meta.itemId}" did not match any requested evidence item.` : 'it lacks an item_id association for item-specific evidence requests.'
          }`;
        }
      }
    });

    return {
      evidences: evidenceEntries,
      _mappingProvenance: 'PAYPAL_REQUESTED_FROM_SELLER',
      _selectedEvidenceTypes: sellerRequestedEntries.map((e) => e.evidence_type),
      _trackingMetadata: trackingMetadataList
    };
  }

  /**
   * Builds multipart request payload:
   * Part 1: "input" (JSON evidence metadata)
   * Part 2: "file" (actual document binary)
   */
  buildMultipartPayload({ inputData, fileBuffer = null, fileName = null, mimeType = null }) {
    const boundary = `----FlowPilotBoundary${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    const parts = [];

    // Part 1: "input" (JSON evidence metadata)
    const jsonString = JSON.stringify(inputData);
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="input"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${jsonString}\r\n`
    ));

    // Part 2: file attachment (if binary provided)
    if (fileBuffer && fileName) {
      const safeMime = mimeType || 'application/pdf';
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: ${safeMime}\r\n\r\n`
      ));
      parts.push(Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer));
      parts.push(Buffer.from('\r\n'));
    }

    // Closing boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    return {
      payloadBuffer: Buffer.concat(parts),
      boundary,
      contentType: `multipart/form-data; boundary=${boundary}`
    };
  }

  /**
   * Submits evidence to official PayPal Customer Disputes API (Sandbox only)
   */
  async submitEvidence(disputeId, options = {}) {
    const { dryRun = false, attachmentDocId = null } = options;

    const supabaseService = require('./supabaseService');
    const responseService = require('./responseService');
    const storageService = require('./storageService');

    // 1. Resolve Dispute
    let dispute = await supabaseService.getDisputeById(disputeId);
    if (!dispute) {
      const allDisputes = await supabaseService.getDisputes();
      dispute = allDisputes.find((d) => d.paypalDisputeId === disputeId || d.id === disputeId);
    }

    if (!dispute) {
      return {
        success: false,
        status: 'DISPUTE_NOT_FOUND',
        error: `Dispute "${disputeId}" was not found.`
      };
    }

    // 2. Resolve Response Package
    const responsePackage = responseService.getResponsePackage(dispute.id);

    // 3. Resolve Attachment Document
    const allDocs = responsePackage?.evidenceBundle?.evidenceDocuments || [];
    let attachmentDoc = null;
    let fileBuffer = null;

    if (attachmentDocId) {
      attachmentDoc = allDocs.find((d) => d.id === attachmentDocId);
    } else if (allDocs.length > 0) {
      // Pick first relevant document (prefer POD, then invoice)
      attachmentDoc = allDocs.find((d) => d.documentType === 'PROOF_OF_DELIVERY') || allDocs[0];
    }

    if (attachmentDoc) {
      try {
        const filePath = path.join(storageService.baseDir, dispute.id, `${attachmentDoc.id}_${attachmentDoc.fileName}`);
        if (fs.existsSync(filePath)) {
          fileBuffer = await fs.promises.readFile(filePath);
          attachmentDoc.storagePath = filePath;
        } else {
          attachmentDoc.storagePath = filePath; // Will be caught in preflight if missing
        }
      } catch (e) {
        // Handled in preflight
      }
    }

    // 4. Pre-Flight Validation
    const docsToValidate = attachmentDoc ? [attachmentDoc] : [];
    const preFlight = this.validatePreFlightSubmission({
      dispute,
      responsePackage,
      documents: docsToValidate
    });

    if (!preFlight.valid) {
      return {
        success: false,
        status: preFlight.errors[0]?.code || 'PRE_FLIGHT_FAILED',
        error: preFlight.errors[0]?.message,
        errors: preFlight.errors
      };
    }

    // 5. Build official request payload
    const paypalDisputeId = dispute.paypalDisputeId || dispute.id.replace('disp_', '');
    let inputData;
    try {
      inputData = this.mapEvidenceToPayPalSchema({
        dispute,
        responsePackage,
        documents: docsToValidate,
        liveDispute: dispute
      });
    } catch (mapErr) {
      if (mapErr.code === 'NO_SELLER_EVIDENCE_REQUESTED' || mapErr.code === 'UNKNOWN_EVIDENCE_TYPE') {
        return {
          success: false,
          status: mapErr.code,
          error: mapErr.message,
          guidance: mapErr.code === 'NO_SELLER_EVIDENCE_REQUESTED'
            ? 'PayPal Customer Disputes API only accepts seller evidence when evidence is explicitly REQUESTED_FROM_SELLER. You can export the Defense Dossier JSON for manual review.'
            : 'Review the evidence requirements in the PayPal Resolution Center.'
        };
      }
      throw mapErr;
    }

    const { payloadBuffer, contentType } = this.buildMultipartPayload({
      inputData,
      fileBuffer,
      fileName: attachmentDoc?.fileName,
      mimeType: attachmentDoc?.mimeType
    });

    const endpointUrl = `https://api-m.sandbox.paypal.com/v1/customer/disputes/${encodeURIComponent(paypalDisputeId)}/provide-evidence`;

    // 6. Dry Run Return (Verification Mode)
    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        status: 'PRE_FLIGHT_PASSED',
        endpoint: endpointUrl,
        payloadPreview: inputData,
        attachment: attachmentDoc ? {
          id: attachmentDoc.id,
          fileName: attachmentDoc.fileName,
          mimeType: attachmentDoc.mimeType,
          fileSizeBytes: fileBuffer ? fileBuffer.length : 0
        } : null
      };
    }

    // 7. Live Sandbox API Execution
    let token;
    try {
      token = await this.getAccessToken();
    } catch (authErr) {
      return {
        success: false,
        status: 'OAUTH_AUTHENTICATION_FAILED',
        error: authErr.message
      };
    }

    // Retrieve live dispute details to verify stage and HATEOAS link
    let liveDispute;
    try {
      liveDispute = await this.fetchPayPalDisputeById(paypalDisputeId);
    } catch (fetchErr) {
      return {
        success: false,
        status: 'DISPUTE_NOT_FOUND_ON_PAYPAL',
        error: `Could not retrieve live dispute from PayPal: ${fetchErr.message}`
      };
    }

    const livePreflight = this.validateLivePayPalDisputePreFlight(liveDispute);
    if (!livePreflight.valid) {
      return {
        success: false,
        status: livePreflight.errors[0].code,
        error: livePreflight.errors[0].message,
        errors: livePreflight.errors
      };
    }

    // Map with live dispute requested evidence types
    let liveInputData;
    try {
      liveInputData = this.mapEvidenceToPayPalSchema({
        dispute,
        responsePackage,
        documents: docsToValidate,
        liveDispute
      });
    } catch (mapErr) {
      if (mapErr.code === 'NO_SELLER_EVIDENCE_REQUESTED' || mapErr.code === 'UNKNOWN_EVIDENCE_TYPE') {
        return {
          success: false,
          status: mapErr.code,
          error: mapErr.message,
          guidance: 'PayPal Customer Disputes API only accepts seller evidence when evidence is explicitly REQUESTED_FROM_SELLER.'
        };
      }
      throw mapErr;
    }

    const liveMultipart = this.buildMultipartPayload({
      inputData: liveInputData,
      fileBuffer,
      fileName: attachmentDoc?.fileName,
      mimeType: attachmentDoc?.mimeType
    });

    // Dispatch official multipart request to Sandbox endpoint
    try {
      const response = await axios.post(endpointUrl, liveMultipart.payloadBuffer, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': liveMultipart.contentType,
          'Content-Length': liveMultipart.payloadBuffer.length
        },
        timeout: 15000
      });

      const ackId = response.headers?.['paypal-debug-id'] || response.data?.id || `ack_${Date.now()}`;
      const now = new Date().toISOString();

      await responseService.recordSubmissionOutcome(dispute.id, {
        status: 'SUBMITTED',
        timestamp: now,
        acknowledgementId: ackId,
        details: response.data
      });

      return {
        success: true,
        status: 'SUBMITTED',
        acknowledgementId: ackId,
        timestamp: now,
        details: response.data
      };
    } catch (err) {
      const status = err.response?.status;
      const errorData = err.response?.data;

      // Timeout / Uncertain outcome
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        // Attempt follow-up status check
        let followUpStatus = 'UNKNOWN';
        try {
          const recheck = await this.fetchPayPalDisputeById(paypalDisputeId);
          followUpStatus = recheck.status;
        } catch (e) {
          // ignore
        }

        await responseService.recordSubmissionOutcome(dispute.id, {
          status: 'SUBMISSION_UNKNOWN',
          timestamp: new Date().toISOString(),
          errorMessage: 'Request timed out after dispatch. State check: ' + followUpStatus
        });

        return {
          success: false,
          status: 'SUBMISSION_UNKNOWN',
          error: 'Network timeout during PayPal submission. Re-check dispute details before retrying.',
          disputeState: followUpStatus
        };
      }

      if (status === 403) {
        return {
          success: false,
          status: 'INSUFFICIENT_SCOPE',
          error: 'PayPal Sandbox app lacks permission to provide evidence (disputes/update-seller). Retain Defense Dossier export for manual submission.',
          details: errorData
        };
      }

      if (status === 400 || status === 422) {
        return {
          success: false,
          status: 'INVALID_STAGE',
          error: errorData?.message || 'PayPal rejected evidence for current dispute lifecycle stage.',
          details: errorData
        };
      }

      await responseService.recordSubmissionOutcome(dispute.id, {
        status: 'SUBMISSION_FAILED',
        timestamp: new Date().toISOString(),
        errorMessage: errorData?.message || err.message
      });

      return {
        success: false,
        status: 'SUBMISSION_FAILED',
        error: errorData?.message || err.message,
        details: errorData
      };
    }
  }
}

const instance = new PayPalService();
instance.KNOWN_PAYPAL_EVIDENCE_TYPES = KNOWN_PAYPAL_EVIDENCE_TYPES;
instance.EVIDENCE_TYPES_ACCEPTING_TRACKING = EVIDENCE_TYPES_ACCEPTING_TRACKING;
instance.EVIDENCE_TYPES_ACCEPTING_REFUND_IDS = EVIDENCE_TYPES_ACCEPTING_REFUND_IDS;
instance.isEvidenceRequestActionValid = isEvidenceRequestActionValid;
instance.mapCarrierName = mapCarrierName;
instance.getDocumentItemId = getDocumentItemId;
module.exports = instance;

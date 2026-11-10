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

    // Check status: Must be WAITING_FOR_SELLER_RESPONSE
    const status = (paypalDispute.status || '').toUpperCase();
    if (status !== 'WAITING_FOR_SELLER_RESPONSE') {
      errors.push({
        code: 'INVALID_LIFECYCLE_STAGE',
        message: `PayPal dispute status is "${status}". Evidence can only be submitted when status is "WAITING_FOR_SELLER_RESPONSE".`
      });
    }

    // Check HATEOAS links for rel="provide-evidence"
    const links = paypalDispute.links || paypalDispute.rawPayload?.links || [];
    const hasProvideEvidenceLink = links.some((l) => l.rel === 'provide-evidence');
    if (!hasProvideEvidenceLink) {
      errors.push({
        code: 'HATEOAS_LINK_MISSING',
        message: 'Dispute details response does not contain a "provide-evidence" HATEOAS link. PayPal is not currently accepting evidence for this claim.'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Maps evidence documents and narrative to PayPal's official API schema.
   * Dynamically inspects the live dispute's requested evidence types (evidences[].evidence_type, source).
   * Does NOT rely on hardcoded dispute-reason mappings when live dispute requests specific evidence types.
   * Keeps FlowPilot's Evidence Verification Matrix separate from PayPal's official requirements.
   * Never classifies a document as sufficient merely because its filename or type matches.
   */
  mapEvidenceToPayPalSchema({ dispute, responsePackage, documents = [], liveDispute = null }) {
    const narrative = responsePackage?.narrative || '';

    // 1. Inspect live dispute requested evidence types if present
    const liveEvidences = liveDispute?.rawPayload?.evidences || liveDispute?.evidences || dispute?.rawPayload?.evidences || [];
    const requestedTypes = [];

    liveEvidences.forEach((ev) => {
      // Look for evidence requested from SELLER or listed in dispute record
      if (ev.evidence_type && (ev.source === 'PAYPAL' || ev.source === 'BUYER' || !ev.source)) {
        requestedTypes.push(ev.evidence_type);
      }
    });

    // 2. Select applicable evidence type: Check if available documents genuinely substantiate a requested type
    let primaryEvidenceType = null;
    let mappingProvenance = 'DEFAULT_CATEGORY_FALLBACK';

    if (requestedTypes.length > 0) {
      for (const reqType of requestedTypes) {
        const canSubstantiate = documents.some((doc) => {
          // Never classify as sufficient merely from filename: require genuine verified fields
          if (reqType === 'PROOF_OF_FULFILLMENT' && doc.trackingNumber && doc.trackingNumber.trim().length > 3) return true;
          if (reqType === 'PROOF_OF_DELIVERY_SIGNATURE' && doc.documentType === 'PROOF_OF_DELIVERY' && doc.trackingNumber) return true;
          if (reqType === 'PROOF_OF_RECEIPT_COPY' && doc.documentType === 'INVOICE') return true;
          if (reqType === 'RETURN_POLICY' && (doc.documentType === 'TERMS_AND_CONDITIONS' || doc.documentType === 'RETURN_POLICY')) return true;
          if (reqType === 'PROOF_OF_REFUND' && doc.documentType === 'REFUND_CONFIRMATION') return true;
          return false;
        });

        if (canSubstantiate) {
          primaryEvidenceType = reqType;
          mappingProvenance = 'LIVE_PAYPAL_REQUESTED_TYPE';
          break;
        }
      }

      if (!primaryEvidenceType) {
        primaryEvidenceType = requestedTypes[0];
        mappingProvenance = 'LIVE_PAYPAL_REQUESTED_UNSUBSTANTIATED';
      }
    }

    if (!primaryEvidenceType) {
      // Fallback only if live dispute did not specify requested evidence types
      if (dispute.reason === 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED') {
        primaryEvidenceType = 'PROOF_OF_FULFILLMENT';
      } else if (dispute.reason === 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED') {
        primaryEvidenceType = 'RETURN_POLICY';
      } else if (dispute.reason === 'UNAUTHORISED') {
        primaryEvidenceType = 'PROOF_OF_FULFILLMENT';
      } else {
        primaryEvidenceType = 'OTHER';
      }
      mappingProvenance = 'REASON_CATEGORY_FALLBACK';
    }

    // 3. Extract verified tracking info from documents ONLY when tracking number is genuinely present
    const trackingInfoList = [];
    const validCarriers = ['FEDEX', 'UPS', 'USPS', 'DHL'];

    documents.forEach((doc) => {
      if (doc.trackingNumber && typeof doc.trackingNumber === 'string' && doc.trackingNumber.trim().length > 3) {
        const rawCarrier = (doc.carrierName || '').toUpperCase().trim();
        let matchedCarrier = 'OTHER';
        let otherCarrier = doc.carrierName ? doc.carrierName.trim() : null;

        for (const c of validCarriers) {
          if (rawCarrier.includes(c)) {
            matchedCarrier = c;
            otherCarrier = null;
            break;
          }
        }

        trackingInfoList.push({
          carrier_name: matchedCarrier,
          carrier_name_other: otherCarrier,
          tracking_number: doc.trackingNumber.trim()
        });
      }
    });

    const evidenceEntry = {
      evidence_type: primaryEvidenceType,
      notes: narrative.slice(0, 2000)
    };

    if (trackingInfoList.length > 0 && (primaryEvidenceType === 'PROOF_OF_FULFILLMENT' || primaryEvidenceType === 'PROOF_OF_DELIVERY_SIGNATURE' || primaryEvidenceType === 'OTHER')) {
      evidenceEntry.evidence_info = {
        tracking_info: trackingInfoList
      };
    }

    return {
      evidences: [evidenceEntry],
      _mappingProvenance: mappingProvenance
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
    const inputData = this.mapEvidenceToPayPalSchema({
      dispute,
      responsePackage,
      documents: docsToValidate
    });

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
    const liveInputData = this.mapEvidenceToPayPalSchema({
      dispute,
      responsePackage,
      documents: docsToValidate,
      liveDispute
    });

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

module.exports = new PayPalService();

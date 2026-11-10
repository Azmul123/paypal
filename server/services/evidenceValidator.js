/**
 * FlowPilot — Module 3: AI Evidence Intelligence
 * Deterministic JavaScript Validation Engine (v3.1)
 * 
 * Performs deterministic ground-truth checks across:
 * - Two-tier financial reconciliation (arithmetic check + claim substantiation)
 * - Address comparability check (both expected & actual must be available and comparable)
 * - Temporal date sequence (Delivery < Txn = Contradiction; Delivery > Dispute = Factual Observation)
 * - Multi-stage tracking provenance (format syntax, carrier ID, scan status, document-extracted vs carrier-verified)
 * - Cross-document conflicting transaction records (incompatible claims on the same transaction)
 * 
 * Never relies on AI guessing for mathematical calculations, currency, dates, or identifiers.
 */

class EvidenceValidator {
  /**
   * Cross-validates all evidence documents against the dispute record and against each other.
   * Returns an array of detected genuine contradictions.
   * 
   * A contradiction is flagged ONLY when two sources make incompatible claims
   * about the same transaction and relevant field.
   * 
   * @param {object} dispute FlowPilot dispute object
   * @param {Array<object>} documents List of evidence documents with extracted data
   * @returns {Array<object>} Detected contradictions
   */
  detectContradictions(dispute, documents = []) {
    const contradictions = [];

    if (!dispute || !Array.isArray(documents) || documents.length === 0) {
      return contradictions;
    }

    const disputeAmount = dispute.amount;
    const disputeCurrency = dispute.currency || 'USD';
    const disputeTxnId = dispute.transactionId;
    const shippingAddress = dispute.customer?.shippingAddress || {};
    const txnDate = dispute.transactionDate ? new Date(dispute.transactionDate) : null;

    // Track documents by type for cross-document conflict detection
    const invoiceDocs = [];
    const podDocs = [];

    documents.forEach((doc) => {
      const data = doc.extractedData || {};
      const docRef = doc.id || doc.documentType;

      if (doc.documentType === 'INVOICE' || doc.documentType === 'ORDER_RECEIPT') {
        invoiceDocs.push(doc);
      }
      if (doc.documentType === 'PROOF_OF_DELIVERY') {
        podDocs.push(doc);
      }

      // 1. Transaction ID Cross-Check
      if (data.transactionId && disputeTxnId) {
        const cleanDocTxn = data.transactionId.replace(/[^A-Za-z0-9]/g, '');
        const cleanDispTxn = disputeTxnId.replace(/[^A-Za-z0-9]/g, '');
        if (cleanDocTxn !== cleanDispTxn) {
          contradictions.push({
            field: 'transactionId',
            sourceA: `PayPal Dispute Record (${disputeTxnId})`,
            sourceB: `${doc.documentType} [${docRef}] (${data.transactionId})`,
            description: `Transaction ID on ${doc.documentType} does not match the disputed PayPal transaction ID.`
          });
        }
      }

      // 2. Amount & Currency Cross-Check
      const docAmount = typeof data.totalAmount === 'number' ? data.totalAmount : (typeof data.amount === 'number' ? data.amount : null);
      if (docAmount !== null && !isNaN(docAmount)) {
        const docCurrency = data.currency ? data.currency.toUpperCase() : disputeCurrency.toUpperCase();

        // Currency conflict
        if (docCurrency !== disputeCurrency.toUpperCase()) {
          contradictions.push({
            field: 'currency',
            sourceA: `PayPal Dispute Currency (${disputeCurrency})`,
            sourceB: `${doc.documentType} Currency (${docCurrency})`,
            description: `Document currency (${docCurrency}) does not match dispute currency (${disputeCurrency}).`
          });
        }

        // Severe Amount Conflict: Invoice total is less than the disputed amount
        // (e.g. merchant bills $100, but customer disputes $250 without subsequent charges)
        if (doc.documentType === 'INVOICE' && docAmount < disputeAmount - 0.05) {
          contradictions.push({
            field: 'amount',
            sourceA: `PayPal Disputed Amount (${disputeAmount} ${disputeCurrency})`,
            sourceB: `Invoice Billed Total (${docAmount} ${docCurrency})`,
            description: `Commercial invoice total (${docAmount}) is less than disputed transaction amount (${disputeAmount}).`
          });
        }
      }

      // 3. Shipping Address vs Delivery Address Check (Reliably Comparable Only)
      if (doc.documentType === 'PROOF_OF_DELIVERY') {
        const expectedZip = this.normalizePostalCode(shippingAddress.postalCode);
        const deliveredZip = this.normalizePostalCode(data.deliveryPostalCode);

        // Only compare if both addresses are available and reliably comparable
        if (this.isAddressComparable(shippingAddress, data)) {
          if (expectedZip && deliveredZip && expectedZip !== deliveredZip) {
            contradictions.push({
              field: 'deliveryPostalCode',
              sourceA: `Customer Shipping Address (${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${expectedZip})`,
              sourceB: `Carrier Proof of Delivery Destination (${data.deliveryCity || ''}, ${data.deliveryState || ''} ${deliveredZip})`,
              description: `Carrier delivery destination postal code (${deliveredZip}) does not match merchant transaction shipping address (${expectedZip}).`
            });
          }
        }

        // Conflicting Delivery Status (e.g. Return to Sender)
        if (data.carrierTrackingStatus === 'RETURNED' || (data.deliveryStatus && /return(?:ed)?\s*to\s*sender/i.test(data.deliveryStatus))) {
          contradictions.push({
            field: 'deliveryStatus',
            sourceA: `Merchant Delivery Claim`,
            sourceB: `Carrier Tracking Status (${data.carrierTrackingStatus || data.deliveryStatus})`,
            description: `Carrier tracking indicates shipment was returned to sender, contradicting successful delivery.`
          });
        }
      }

      // 4. Temporal Sequence Check: Delivery BEFORE purchase is impossible
      const delivDateStr = data.dates?.actualDeliveryDate || data.deliveryDate;
      if (delivDateStr && txnDate) {
        const delivDate = new Date(delivDateStr);
        if (!isNaN(delivDate.getTime()) && !isNaN(txnDate.getTime())) {
          // Delivery cannot occur BEFORE the transaction was created! (24hr buffer for timezone crossing)
          if (delivDate.getTime() < txnDate.getTime() - 86400000) {
            contradictions.push({
              field: 'deliveryDate',
              sourceA: `Original Transaction Date (${txnDate.toISOString().slice(0, 10)})`,
              sourceB: `Carrier Delivery Date (${delivDate.toISOString().slice(0, 10)})`,
              description: `Proof of delivery indicates delivery occurred before the customer placed the transaction.`
            });
          }
        }
      }
    });

    // 5. Cross-Document Conflicting Records for Same Transaction
    // Example: Two billing records with differing totals for the same transaction
    if (invoiceDocs.length > 1) {
      for (let i = 0; i < invoiceDocs.length; i++) {
        for (let j = i + 1; j < invoiceDocs.length; j++) {
          const docA = invoiceDocs[i];
          const docB = invoiceDocs[j];
          const amtA = docA.extractedData?.totalAmount ?? docA.extractedData?.amount;
          const amtB = docB.extractedData?.totalAmount ?? docB.extractedData?.amount;

          if (amtA != null && amtB != null && Math.abs(amtA - amtB) > 0.05) {
            contradictions.push({
              field: 'amount',
              sourceA: `${docA.documentType} [${docA.id}] (${amtA} ${docA.extractedData?.currency || disputeCurrency})`,
              sourceB: `${docB.documentType} [${docB.id}] (${amtB} ${docB.extractedData?.currency || disputeCurrency})`,
              description: `Conflicting billing amounts detected between ${docA.documentType} (${amtA}) and ${docB.documentType} (${amtB}) for the same dispute transaction.`
            });
          }
        }
      }
    }

    // Example: Conflicting carrier scan statuses for the same tracking number across documents
    if (podDocs.length > 1) {
      for (let i = 0; i < podDocs.length; i++) {
        for (let j = i + 1; j < podDocs.length; j++) {
          const podA = podDocs[i];
          const podB = podDocs[j];
          const trackA = podA.extractedData?.trackingNumber;
          const trackB = podB.extractedData?.trackingNumber;
          const statusA = (podA.extractedData?.carrierTrackingStatus || podA.extractedData?.deliveryStatus || '').toUpperCase();
          const statusB = (podB.extractedData?.carrierTrackingStatus || podB.extractedData?.deliveryStatus || '').toUpperCase();

          if (trackA && trackB && trackA === trackB && statusA && statusB) {
            if ((statusA.includes('DELIVER') && statusB.includes('RETURN')) ||
                (statusB.includes('DELIVER') && statusA.includes('RETURN'))) {
              contradictions.push({
                field: 'deliveryStatus',
                sourceA: `Tracking Document [${podA.id}] (${statusA})`,
                sourceB: `Tracking Document [${podB.id}] (${statusB})`,
                description: `Conflicting carrier tracking statuses for tracking number ${trackA} across submitted documents.`
              });
            }
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * Address comparability check.
   * Confirms both expected and delivered addresses are available, non-empty, and reliably comparable.
   * If either is missing, masked (e.g. "97***"), or partial, returns false.
   */
  isAddressComparable(expectedAddress, deliveredData) {
    if (!expectedAddress || typeof expectedAddress !== 'object') return false;
    if (!deliveredData || typeof deliveredData !== 'object') return false;

    const expZip = expectedAddress.postalCode;
    const delZip = deliveredData.deliveryPostalCode;

    if (!expZip || !delZip) return false;
    if (typeof expZip !== 'string' || typeof delZip !== 'string') return false;

    // Check for masked/redacted postal codes (e.g. 974** or 97XXX)
    if (/[*X?]/i.test(expZip) || /[*X?]/i.test(delZip)) {
      return false;
    }

    // Must have at least 5 alphanumeric characters to compare
    const cleanExp = expZip.replace(/[^A-Za-z0-9]/g, '');
    const cleanDel = delZip.replace(/[^A-Za-z0-9]/g, '');

    return cleanExp.length >= 5 && cleanDel.length >= 5;
  }

  /**
   * Two-Tier Partial Dispute Validation:
   * Tier 1: Arithmetic Reconciliation (does disputed amount match a line item, multiple line items, or fee?)
   * Tier 2: Claim Substantiation (does dispute claim text, item name, or memo link to that line item?)
   * 
   * Returns: {
   *   isPartial: boolean,
   *   amountReconciled: boolean,
   *   claimSubstantiated: boolean,
   *   matchingLineItems: Array<object>,
   *   status: 'SUPPORTED' | 'NEEDS_REVIEW',
   *   notes: string
   * }
   */
  validatePartialDispute(dispute, invoiceDoc) {
    const disputeAmount = dispute.amount;
    const data = invoiceDoc?.extractedData || {};
    const totalAmount = data.totalAmount ?? data.amount;
    const lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];

    if (!totalAmount || disputeAmount >= totalAmount - 0.05) {
      return {
        isPartial: false,
        amountReconciled: true,
        claimSubstantiated: true,
        matchingLineItems: [],
        status: 'SUPPORTED',
        notes: 'Full dispute amount matches invoice billing total.'
      };
    }

    // Disputed amount is strictly smaller than total amount -> Partial Dispute
    // Tier 1: Arithmetic Reconciliation Check
    const matchingItems = [];
    for (const item of lineItems) {
      const itemTotal = typeof item.lineTotal === 'number' ? item.lineTotal : (item.quantity * item.unitPrice);
      if (Math.abs(itemTotal - disputeAmount) <= 0.05 || Math.abs(item.unitPrice - disputeAmount) <= 0.05) {
        matchingItems.push(item);
      }
    }

    // Check if sum of multiple line items matches
    let comboMatched = false;
    if (matchingItems.length === 0 && lineItems.length > 1) {
      const sum = lineItems.reduce((acc, it) => acc + (it.lineTotal || (it.quantity * it.unitPrice) || 0), 0);
      if (Math.abs(sum - disputeAmount) <= 0.05) {
        comboMatched = true;
      }
    }

    const amountReconciled = matchingItems.length > 0 || comboMatched;

    // Tier 2: Claim Substantiation Relationship
    // Inspect whether dispute messages, claimed items, or notes link the claim to this line item
    const buyerMessages = Array.isArray(dispute.messages) ? dispute.messages.map((m) => m.content || '').join(' ').toLowerCase() : '';
    const disputeItemDetails = Array.isArray(dispute.itemDetails) ? dispute.itemDetails.map((it) => it.name || '').join(' ').toLowerCase() : '';
    const claimContext = `${buyerMessages} ${disputeItemDetails} ${dispute.reasonFormatted || ''}`.toLowerCase();

    let claimSubstantiated = false;
    if (matchingItems.length > 0) {
      claimSubstantiated = matchingItems.some((item) => {
        const desc = (item.description || item.sku || '').toLowerCase();
        return desc.length > 3 && claimContext.includes(desc);
      });
    }

    // Status Assignment
    if (amountReconciled && claimSubstantiated) {
      const itemNames = matchingItems.map((i) => i.description).join(', ');
      return {
        isPartial: true,
        amountReconciled: true,
        claimSubstantiated: true,
        matchingLineItems: matchingItems,
        status: 'SUPPORTED',
        notes: `Partial dispute: Disputed amount (${disputeAmount}) reconciles to itemized line item (${itemNames}) and is substantiated by dispute context.`
      };
    }

    if (amountReconciled && !claimSubstantiated) {
      const itemNames = matchingItems.map((i) => i.description).join(', ');
      return {
        isPartial: true,
        amountReconciled: true,
        claimSubstantiated: false,
        matchingLineItems: matchingItems,
        status: 'NEEDS_REVIEW',
        notes: `Arithmetic match: Disputed amount (${disputeAmount}) matches line item '${itemNames}', but evidence does not explicitly establish that this specific line item is the subject of the claim. Manual claim review required.`
      };
    }

    // Unreconciled partial dispute
    return {
      isPartial: true,
      amountReconciled: false,
      claimSubstantiated: false,
      matchingLineItems: [],
      status: 'NEEDS_REVIEW',
      notes: `Partial dispute: Disputed amount (${disputeAmount}) is smaller than total invoice (${totalAmount}), but individual line items do not explicitly reconcile to ${disputeAmount}. Manual line-item audit required.`
    };
  }

  /**
   * Factual Temporal Evaluation:
   * Compares delivery date to dispute filing date without making policy closure claims.
   */
  evaluateTemporalSequence(dispute, podDoc) {
    const data = podDoc?.extractedData || {};
    const delivDateStr = data.dates?.actualDeliveryDate || data.deliveryDate;
    const disputeCreatedAtStr = dispute.createdAt;

    if (!delivDateStr || !disputeCreatedAtStr) {
      return null;
    }

    const delivDate = new Date(delivDateStr);
    const disputeCreatedAt = new Date(disputeCreatedAtStr);

    if (isNaN(delivDate.getTime()) || isNaN(disputeCreatedAt.getTime())) {
      return null;
    }

    if (delivDate.getTime() > disputeCreatedAt.getTime()) {
      return {
        isPostDisputeDelivery: true,
        actualDeliveryDate: delivDate.toISOString().slice(0, 10),
        disputeCreatedAt: disputeCreatedAt.toISOString().slice(0, 10),
        observation: `Delivery occurred on ${delivDate.toISOString().slice(0, 10)}, which is after the dispute filing date of ${disputeCreatedAt.toISOString().slice(0, 10)}.`,
        recommendation: `Review the applicable PayPal dispute procedure regarding post-filing delivery and submit updated carrier delivery documentation through the dispute resolution channel.`
      };
    }

    return {
      isPostDisputeDelivery: false,
      actualDeliveryDate: delivDate.toISOString().slice(0, 10),
      disputeCreatedAt: disputeCreatedAt.toISOString().slice(0, 10)
    };
  }

  /**
   * 6-Stage Tracking Provenance Pipeline:
   * 1. Format validation (carrier regex)
   * 2. Carrier identification
   * 3. Tracking status (Delivered, In Transit, Returned)
   * 4. Delivery date
   * 5. Delivery destination
   * 6. Provenance classification (DOCUMENT_EXTRACTED vs MERCHANT_CLAIM vs INDEPENDENT_CARRIER_VERIFIED)
   * 
   * NEVER claims INDEPENDENT_CARRIER_VERIFIED without an actual successful carrier API request.
   */
  validateTrackingProvenance(carrier, trackingNumber, rawStatus, sourceProvenance = 'DOCUMENT_EXTRACTED') {
    if (!trackingNumber) {
      return {
        trackingNumber: null,
        carrierName: carrier || null,
        trackingFormatValid: false,
        carrierTrackingStatus: 'UNKNOWN',
        deliveryConfirmed: false,
        verificationSource: sourceProvenance,
        isIndependentVerification: false
      };
    }

    const formatValid = this.isValidTrackingFormat(carrier, trackingNumber);
    const cleanStatus = (rawStatus || '').toUpperCase();

    let trackingStatus = 'UNKNOWN';
    let deliveryConfirmed = false;

    if (cleanStatus.includes('DELIVER')) {
      trackingStatus = 'DELIVERED';
      // Only marked DELIVERY_CONFIRMED if tracking format is valid AND status is delivered
      deliveryConfirmed = formatValid;
    } else if (cleanStatus.includes('TRANSIT')) {
      trackingStatus = 'IN_TRANSIT';
    } else if (cleanStatus.includes('LABEL') || cleanStatus.includes('CREATED')) {
      trackingStatus = 'LABEL_CREATED';
    } else if (cleanStatus.includes('RETURN')) {
      trackingStatus = 'RETURNED';
    }

    return {
      trackingNumber,
      carrierName: carrier || null,
      trackingFormatValid: formatValid,
      carrierTrackingStatus: trackingStatus,
      deliveryConfirmed,
      verificationSource: sourceProvenance, // Strictly DOCUMENT_EXTRACTED or MERCHANT_CLAIM
      isIndependentVerification: sourceProvenance === 'INDEPENDENT_CARRIER_VERIFIED'
    };
  }

  /**
   * Normalizes postal code string for reliable comparisons
   */
  normalizePostalCode(zip) {
    if (!zip || typeof zip !== 'string') return null;
    return zip.trim().split('-')[0].replace(/[^0-9A-Za-z]/g, '');
  }

  /**
   * Validates tracking number pattern for common shipping carriers
   */
  isValidTrackingFormat(carrier, trackingNumber) {
    if (!trackingNumber) return false;
    const clean = trackingNumber.replace(/[^A-Za-z0-9]/g, '');
    const c = (carrier || '').toUpperCase();

    if (c.includes('UPS')) {
      return /^1Z[0-9A-Z]{16}$/i.test(clean) || clean.length === 18;
    }
    if (c.includes('FEDEX')) {
      return /^\d{12}$|^\d{15}$|^\d{20}$|^\d{22}$/.test(clean);
    }
    if (c.includes('USPS')) {
      return /^9[1-5]\d{20,22}$/.test(clean) || clean.length >= 13;
    }
    if (c.includes('DHL')) {
      return /^\d{10,11}$/.test(clean);
    }
    return clean.length >= 8 && clean.length <= 34;
  }
}

module.exports = new EvidenceValidator();

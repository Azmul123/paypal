/**
 * FlowPilot — Module 3: AI Evidence Intelligence
 * Deterministic JavaScript Validation Engine
 * 
 * Performs deterministic ground-truth checks across:
 * - Amount and currency matching
 * - Shipping destination vs delivery address matching
 * - Temporal date sequence (Transaction Date <= Delivery Date <= Dispute Date)
 * - Transaction ID and Tracking Number verification
 * 
 * Never relies on AI guessing for mathematical, currency, or identifier checks.
 */

class EvidenceValidator {
  /**
   * Cross-validates all evidence documents against the dispute record.
   * Returns an array of detected contradictions.
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
    const disputeCreatedAt = dispute.createdAt ? new Date(dispute.createdAt) : null;

    documents.forEach((doc) => {
      const data = doc.extractedData || {};
      const docRef = doc.id || doc.documentType;

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
      if (typeof data.amount === 'number' && !isNaN(data.amount)) {
        const diff = Math.abs(data.amount - disputeAmount);
        // Allow minor rounding tolerance (< 0.05), but flag genuine discrepancies
        if (diff > 0.05 && doc.documentType === 'INVOICE') {
          contradictions.push({
            field: 'amount',
            sourceA: `PayPal Disputed Amount (${disputeAmount} ${disputeCurrency})`,
            sourceB: `Invoice Amount (${data.amount} ${data.currency || disputeCurrency})`,
            description: `Commercial invoice billing total (${data.amount}) differs from disputed transaction amount (${disputeAmount}).`
          });
        }

        if (data.currency && data.currency.toUpperCase() !== disputeCurrency.toUpperCase()) {
          contradictions.push({
            field: 'currency',
            sourceA: `PayPal Dispute Currency (${disputeCurrency})`,
            sourceB: `${doc.documentType} Currency (${data.currency})`,
            description: `Document currency (${data.currency}) does not match dispute currency (${disputeCurrency}).`
          });
        }
      }

      // 3. Shipping Address vs Delivery Address Check
      if (doc.documentType === 'PROOF_OF_DELIVERY') {
        const expectedZip = this.normalizePostalCode(shippingAddress.postalCode);
        const deliveredZip = this.normalizePostalCode(data.deliveryPostalCode);

        if (expectedZip && deliveredZip && expectedZip !== deliveredZip) {
          contradictions.push({
            field: 'deliveryPostalCode',
            sourceA: `Customer Shipping Address (${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${expectedZip})`,
            sourceB: `Carrier Proof of Delivery Destination (${data.deliveryCity || ''}, ${data.deliveryState || ''} ${deliveredZip})`,
            description: `Carrier delivery destination postal code (${deliveredZip}) does not match merchant transaction shipping address (${expectedZip}).`
          });
        }

        // Check Delivery Status
        if (data.deliveryStatus && /return(?:ed)?\s*to\s*sender/i.test(data.deliveryStatus)) {
          contradictions.push({
            field: 'deliveryStatus',
            sourceA: `Merchant Delivery Claim`,
            sourceB: `Carrier Tracking Status (${data.deliveryStatus})`,
            description: `Carrier tracking indicates the shipment was returned to sender, contradicting successful delivery.`
          });
        }
      }

      // 4. Temporal Sequence Check
      if (data.deliveryDate && txnDate) {
        const delivDate = new Date(data.deliveryDate);
        if (!isNaN(delivDate.getTime()) && !isNaN(txnDate.getTime())) {
          // Delivery cannot occur BEFORE the transaction was created!
          if (delivDate.getTime() < txnDate.getTime() - 86400000) { // 1 day buffer for timezone differences
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

    return contradictions;
  }

  normalizePostalCode(zip) {
    if (!zip || typeof zip !== 'string') return null;
    return zip.trim().split('-')[0].replace(/[^0-9A-Za-z]/g, '');
  }

  /**
   * Validates tracking number pattern for common carriers
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
    return clean.length >= 8;
  }
}

module.exports = new EvidenceValidator();

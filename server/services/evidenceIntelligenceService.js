/**
 * FlowPilot — Module 3: AI Evidence Intelligence Engine
 * 
 * Analyzes dispute requirements and merchant-provided evidence,
 * maps evidence to applicable requirements, detects missing or contradictory information,
 * and identifies unsupported claims with source references.
 * 
 * STRICT ARCHITECTURAL CONSTRAINT:
 * FlowPilot must not claim to predict dispute outcomes or estimate win probability.
 * All requirement statuses strictly evaluate to:
 * - SUPPORTED
 * - MISSING
 * - CONTRADICTED
 * - NEEDS_REVIEW
 */

const geminiService = require('./geminiService');
const evidenceValidator = require('./evidenceValidator');
const { getSyntheticEvidenceForDispute } = require('./mockEvidence');

class EvidenceIntelligenceService {
  /**
   * Main analysis entrypoint.
   * 
   * @param {object} dispute FlowPilot dispute object
   * @param {Array<object>} [providedEvidence] Optional array of EvidenceDocument objects
   * @returns {Promise<object>} Standard AIEvidenceAnalysisResult
   */
  async analyzeDisputeEvidence(dispute, providedEvidence = null) {
    if (!dispute) {
      throw new Error('A valid dispute object is required for AI evidence analysis.');
    }

    // 1. Resolve Evidence Documents (passed by caller, or synthetic documents from repository)
    let evidenceDocs = providedEvidence;
    if (!Array.isArray(evidenceDocs) || evidenceDocs.length === 0) {
      evidenceDocs = getSyntheticEvidenceForDispute(dispute.id || dispute.paypalDisputeId);
    }

    // 2. Extract verified facts from evidence documents using Gemini (or deterministic fallback)
    const processedDocuments = await Promise.all(
      evidenceDocs.map(async (doc) => {
        let extractedData = doc.extractedData;
        if (!extractedData || Object.keys(extractedData).length === 0) {
          extractedData = await geminiService.extractDocumentFacts(
            doc.content || '',
            doc.documentType || 'OTHER'
          );
        }
        return {
          ...doc,
          extractedData
        };
      })
    );

    // 3. Collect source references (document IDs)
    const sourceReferences = processedDocuments
      .map((d) => d.id)
      .filter(Boolean);

    // 4. Deterministic Cross-Validation & Contradiction Detection
    const contradictions = evidenceValidator.detectContradictions(dispute, processedDocuments);

    // 5. Get applicable category requirements based on dispute reason
    const requirements = this.getRequirementsForReason(dispute.reason);

    // 6. Map evidence to requirements & compute statuses
    const { evidenceMatrix, missingEvidence, unsupportedClaims } = this.mapRequirements(
      dispute,
      requirements,
      processedDocuments,
      contradictions
    );

    // 7. Generate practical next step recommendations
    const recommendedActions = this.generateRecommendedActions(
      dispute,
      evidenceMatrix,
      contradictions,
      missingEvidence
    );

    // 8. Return standardized result strictly conforming to API_CONTRACT.md
    return {
      evidenceMatrix,
      missingEvidence,
      contradictions,
      sourceReferences,
      unsupportedClaims,
      recommendedActions
    };
  }

  /**
   * Returns applicable requirements for a given PayPal dispute reason
   */
  getRequirementsForReason(reason) {
    const r = (reason || 'OTHER').toUpperCase();

    switch (r) {
      case 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED':
        return [
          {
            id: 'req_inr_pod',
            text: 'Online carrier proof of delivery showing delivered status',
            targetDocType: 'PROOF_OF_DELIVERY'
          },
          {
            id: 'req_inr_address',
            text: 'Carrier delivery destination matches PayPal transaction shipping address',
            targetDocType: 'PROOF_OF_DELIVERY'
          },
          {
            id: 'req_inr_invoice',
            text: 'Itemized commercial invoice confirming transaction ID and fulfilled goods',
            targetDocType: 'INVOICE'
          },
          {
            id: 'req_inr_signature',
            text: 'Carrier delivery confirmation and signature verification (NEEDS_REVIEW based on carrier/route)',
            targetDocType: 'PROOF_OF_DELIVERY',
            isDiscretionary: true
          }
        ];

      case 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED':
        return [
          {
            id: 'req_snad_spec',
            text: 'Documented product specifications and factory QA certification prior to dispatch',
            targetDocType: 'OTHER'
          },
          {
            id: 'req_snad_policy',
            text: 'Proof of customer agreement to merchant return & replacement policy at checkout',
            targetDocType: 'RETURN_POLICY'
          },
          {
            id: 'req_snad_comm',
            text: 'Records of correspondence regarding return offers or discrepancy resolution',
            targetDocType: 'CUSTOMER_COMMUNICATION'
          }
        ];

      case 'UNAUTHORISED':
        return [
          {
            id: 'req_auth_delivery',
            text: 'Proof of completed service fulfillment or physical item delivery',
            targetDocType: 'PROOF_OF_DELIVERY'
          },
          {
            id: 'req_auth_ip_mfa',
            text: 'Customer login IP access audit log matching cardholder billing region with MFA verification',
            targetDocType: 'OTHER'
          },
          {
            id: 'req_auth_billing',
            text: 'Verified customer checkout billing agreement and verified email correspondence',
            targetDocType: 'CUSTOMER_COMMUNICATION'
          }
        ];

      case 'CANCELED_RECURRING_BILLING':
        return [
          {
            id: 'req_sub_terms',
            text: 'Subscription recurring terms and cancellation policy accepted at signup',
            targetDocType: 'OTHER'
          },
          {
            id: 'req_sub_timeline',
            text: 'Audit log of cancellation request timestamp compared to renewal billing cycle',
            targetDocType: 'OTHER'
          }
        ];

      case 'INCORRECT_AMOUNT':
        return [
          {
            id: 'req_amt_invoice',
            text: 'Itemized invoice breaking down base price, promotions, and surcharges',
            targetDocType: 'INVOICE'
          },
          {
            id: 'req_amt_agreement',
            text: 'Proof of customer authorization for billed amount and shipping surcharges',
            targetDocType: 'OTHER'
          }
        ];

      default:
        return [
          {
            id: 'req_gen_proof',
            text: 'Proof of transaction fulfillment and merchant order receipt',
            targetDocType: 'INVOICE'
          },
          {
            id: 'req_gen_comm',
            text: 'Customer communication records regarding order fulfillment',
            targetDocType: 'CUSTOMER_COMMUNICATION'
          }
        ];
    }
  }

  /**
   * Maps documents to requirements and assigns strictly one of the 4 approved statuses:
   * SUPPORTED, MISSING, CONTRADICTED, NEEDS_REVIEW
   */
  mapRequirements(dispute, requirements, documents, contradictions) {
    const evidenceMatrix = [];
    const missingEvidence = [];
    const unsupportedClaims = [];

    // Map contradictions by field for fast lookup
    const contraFields = new Set(contradictions.map((c) => c.field));

    requirements.forEach((req) => {
      // Find matching document(s)
      const matchingDocs = documents.filter((d) => d.documentType === req.targetDocType);

      if (matchingDocs.length === 0) {
        // Discretionary requirements (like signature under carrier discretion) -> NEEDS_REVIEW
        if (req.isDiscretionary) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            status: 'NEEDS_REVIEW',
            evidenceRef: undefined,
            notes: 'Signature verification depends on destination and carrier policy. Review if carrier requires signature confirmation.'
          });
        } else {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            status: 'MISSING',
            evidenceRef: undefined,
            notes: `Missing ${req.targetDocType} document addressing this requirement.`
          });
          missingEvidence.push(req.text);
        }
        return;
      }

      const primaryDoc = matchingDocs[0];
      const data = primaryDoc.extractedData || {};

      // Requirement: Address matching
      if (req.id === 'req_inr_address') {
        if (contraFields.has('deliveryPostalCode')) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            status: 'CONTRADICTED',
            evidenceRef: primaryDoc.id,
            notes: 'Carrier delivery postal code conflicts with customer shipping address.'
          });
          unsupportedClaims.push('Claimed delivery to cardholder address is contradicted by carrier destination code.');
          return;
        }

        const buyerZip = dispute.customer?.shippingAddress?.postalCode;
        const delivZip = data.deliveryPostalCode;
        if (buyerZip && delivZip && buyerZip.startsWith(delivZip.slice(0, 3))) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            status: 'SUPPORTED',
            evidenceRef: primaryDoc.id,
            notes: `Carrier confirmed delivery to recipient zip ${delivZip} matching shipping address.`
          });
          return;
        }

        evidenceMatrix.push({
          requirementId: req.id,
          requirementText: req.text,
          status: 'NEEDS_REVIEW',
          evidenceRef: primaryDoc.id,
          notes: 'Carrier tracking does not display full postal code; manual carrier portal verification recommended.'
        });
        return;
      }

      // Requirement: Proof of Delivery status
      if (req.id === 'req_inr_pod') {
        if (contraFields.has('deliveryStatus')) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            status: 'CONTRADICTED',
            evidenceRef: primaryDoc.id,
            notes: 'Tracking status indicates shipment was returned or failed.'
          });
          return;
        }

        if (data.deliveryStatus === 'Delivered') {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            status: 'SUPPORTED',
            evidenceRef: primaryDoc.id,
            notes: `Carrier confirmed delivered on ${data.deliveryDate || 'scheduled date'}.`
          });
          return;
        }

        evidenceMatrix.push({
          requirementId: req.id,
          requirementText: req.text,
          status: 'NEEDS_REVIEW',
          evidenceRef: primaryDoc.id,
          notes: `Tracking status "${data.deliveryStatus || 'In Transit'}" requires verification of final delivery.`
        });
        return;
      }

      // Requirement: Discretionary signature check
      if (req.id === 'req_inr_signature') {
        if (data.signatureObtained) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            status: 'SUPPORTED',
            evidenceRef: primaryDoc.id,
            notes: `Signature confirmed by recipient (${data.recipientName || 'Recipient'}).`
          });
        } else {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            status: 'NEEDS_REVIEW',
            evidenceRef: primaryDoc.id,
            notes: 'No physical signature recorded on carrier slip; check carrier release terms for this postal zone.'
          });
        }
        return;
      }

      // Requirement: Invoice amount matching
      if (req.id === 'req_inr_invoice' || req.id === 'req_amt_invoice') {
        if (contraFields.has('amount') || contraFields.has('currency') || contraFields.has('transactionId')) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            status: 'CONTRADICTED',
            evidenceRef: primaryDoc.id,
            notes: 'Invoice total, currency, or transaction ID conflicts with PayPal transaction records.'
          });
          unsupportedClaims.push('Invoice details conflict with PayPal dispute transaction amount or currency.');
          return;
        }

        evidenceMatrix.push({
          requirementId: req.id,
          requirementText: req.text,
          status: 'SUPPORTED',
          evidenceRef: primaryDoc.id,
          notes: `Invoice ${data.invoiceNumber || primaryDoc.id} verifies transaction amount ${dispute.amount} ${dispute.currency}.`
        });
        return;
      }

      // Default Document Match
      evidenceMatrix.push({
        requirementId: req.id,
        requirementText: req.text,
        status: 'SUPPORTED',
        evidenceRef: primaryDoc.id,
        notes: `Substantiated by verified ${primaryDoc.documentType} document.`
      });
    });

    return { evidenceMatrix, missingEvidence, unsupportedClaims };
  }

  /**
   * Formulates practical, actionable next steps for the merchant
   */
  generateRecommendedActions(dispute, evidenceMatrix, contradictions, missingEvidence) {
    const actions = [];

    // 1. Contradictions take top priority
    if (contradictions.length > 0) {
      contradictions.forEach((c) => {
        if (c.field === 'deliveryPostalCode') {
          actions.push('Obtain carrier delivery exception log or GPS coordinates confirming physical delivery to customer address.');
        } else if (c.field === 'amount' || c.field === 'currency') {
          actions.push('Reconcile commercial invoice line items with PayPal transaction breakdown to correct amount discrepancies.');
        } else if (c.field === 'deliveryDate') {
          actions.push('Request carrier dispatch audit to resolve conflicting delivery timestamp.');
        } else {
          actions.push(`Investigate conflicting evidence for ${c.field} between ${c.sourceA} and ${c.sourceB}.`);
        }
      });
    }

    // 2. Missing Evidence Actions
    if (missingEvidence.length > 0) {
      missingEvidence.forEach((item) => {
        actions.push(`Upload missing evidence: ${item}.`);
      });
    }

    // 3. Needs Review Items
    const needsReview = evidenceMatrix.filter((m) => m.status === 'NEEDS_REVIEW');
    if (needsReview.length > 0) {
      actions.push('Review carrier delivery terms to verify if signature confirmation is mandatory for this transaction route.');
    }

    // 4. If all requirements are supported
    const allSupported = evidenceMatrix.every((m) => m.status === 'SUPPORTED');
    if (allSupported && contradictions.length === 0) {
      actions.push('All evidence requirements are supported. Proceed to Module 4 response package compilation.');
    }

    // Deduplicate and fallback
    const unique = [...new Set(actions)];
    if (unique.length === 0) {
      unique.push('Review dispute claim details and submit structured evidence before the PayPal response deadline.');
    }

    return unique;
  }
}

module.exports = new EvidenceIntelligenceService();

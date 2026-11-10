/**
 * FlowPilot — Module 3: AI Evidence Intelligence Engine (v3.1)
 * 
 * Analyzes dispute requirements and merchant-provided evidence,
 * maps evidence to applicable requirements, detects missing or contradictory information,
 * and identifies unsupported claims with source references.
 * 
 * STRICT ARCHITECTURAL CONSTRAINTS:
 * 1. FlowPilot must not claim to predict dispute outcomes or estimate win probability.
 * 2. All requirement statuses strictly evaluate to:
 *    - SUPPORTED
 *    - MISSING
 *    - CONTRADICTED
 *    - NEEDS_REVIEW
 * 3. Preserve exactly the six top-level contract keys:
 *    - evidenceMatrix
 *    - missingEvidence
 *    - contradictions
 *    - sourceReferences
 *    - unsupportedClaims
 *    - recommendedActions
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

    // 1. Resolve Evidence Documents (passed by caller, or retrieved from evidence repository)
    let evidenceDocs = providedEvidence;
    if (evidenceDocs === null || evidenceDocs === undefined) {
      const evidenceService = require('./evidenceService');
      evidenceDocs = evidenceService.getDocumentsForDispute(dispute.id || dispute.paypalDisputeId);
    }

    // 2. Extract verified facts from evidence documents using Gemini (or deterministic fallback)
    const processedDocuments = await Promise.all(
      evidenceDocs.map(async (doc) => {
        let extractedData = doc.extractedData;
        if (!extractedData || Object.keys(extractedData).length === 0) {
          extractedData = await geminiService.extractDocumentFacts(
            doc.content || '',
            doc.documentType || 'OTHER',
            doc.id || 'doc_unspecified'
          );
        }
        return {
          ...doc,
          extractedData
        };
      })
    );

    // 3. Collect source references (document IDs strictly from input documents)
    const sourceReferences = processedDocuments
      .map((d) => d.id)
      .filter((id) => typeof id === 'string' && id.trim().length > 0);

    // 4. Deterministic Cross-Validation & Contradiction Detection
    const contradictions = evidenceValidator.detectContradictions(dispute, processedDocuments);

    // 5. Get applicable category requirements with verified PayPal citations
    const requirements = this.getRequirementsForReason(dispute.reason);

    // 6. Map evidence to requirements & compute statuses
    const { evidenceMatrix, missingEvidence, unsupportedClaims, postDisputeObservations } = this.mapRequirements(
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
      missingEvidence,
      postDisputeObservations
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
   * Returns applicable requirements for a given PayPal dispute reason with verified policy citations.
   * Labeled OFFICIAL_PAYPAL only when backed by documented active PayPal policies.
   * Otherwise labeled FLOWPILOT_RECOMMENDED.
   */
  getRequirementsForReason(reason) {
    const r = (reason || 'OTHER').toUpperCase();

    switch (r) {
      case 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED':
        return [
          {
            id: 'req_inr_pod',
            text: 'Online carrier proof of delivery showing delivered status and delivery date',
            targetDocType: 'PROOF_OF_DELIVERY',
            requirementType: 'OFFICIAL_PAYPAL',
            sourceCitation: {
              documentTitle: 'PayPal Seller Protection Program (PayPal User Agreement for US Accounts)',
              sourceUrl: 'https://www.paypal.com/us/legalhub/seller-protection-full',
              section: 'Proof of Delivery',
              applicableDisputeType: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
              retrievalDate: '2026-11-10'
            }
          },
          {
            id: 'req_inr_address',
            text: 'Carrier delivery destination matches city/state or postal code on Transaction Details',
            targetDocType: 'PROOF_OF_DELIVERY',
            requirementType: 'OFFICIAL_PAYPAL',
            sourceCitation: {
              documentTitle: 'PayPal Seller Protection Program (PayPal User Agreement for US Accounts)',
              sourceUrl: 'https://www.paypal.com/us/legalhub/seller-protection-full',
              section: 'Proof of Delivery',
              applicableDisputeType: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
              retrievalDate: '2026-11-10'
            }
          },
          {
            id: 'req_inr_invoice',
            text: 'Itemized commercial invoice confirming transaction ID and fulfilled line items',
            targetDocType: 'INVOICE',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'Recommended merchant best practice to document order breakdown and pricing.'
          },
          {
            id: 'req_inr_signature',
            text: 'Carrier delivery confirmation and signature verification (NEEDS_REVIEW based on destination/carrier)',
            targetDocType: 'PROOF_OF_DELIVERY',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            isDiscretionary: true,
            notes: 'Signature confirmation depends on destination zone, carrier service level, and regional policy.'
          }
        ];

      case 'UNAUTHORISED':
        return [
          {
            id: 'req_auth_delivery',
            text: 'Proof of completed shipment or delivery to shipping address on Transaction Details',
            targetDocType: 'PROOF_OF_DELIVERY',
            requirementType: 'OFFICIAL_PAYPAL',
            sourceCitation: {
              documentTitle: 'PayPal Seller Protection Program (PayPal User Agreement for US Accounts)',
              sourceUrl: 'https://www.paypal.com/us/legalhub/seller-protection-full',
              section: 'Basic Requirements',
              applicableDisputeType: 'UNAUTHORISED',
              retrievalDate: '2026-11-10'
            }
          },
          {
            id: 'req_auth_ip_mfa',
            text: 'Customer login IP audit log matching cardholder billing region with MFA verification',
            targetDocType: 'OTHER',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'Technical authorization telemetry submitted as supplemental merchant defense.'
          },
          {
            id: 'req_auth_billing',
            text: 'Verified customer checkout billing agreement and customer communications',
            targetDocType: 'CUSTOMER_COMMUNICATION',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'Correspondence proving authorized customer engagement.'
          }
        ];

      case 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED':
        // PayPal Seller Protection explicitly DOES NOT cover SNAD claims.
        // Handled through PayPal Buyer Protection and dispute resolution; all items are FLOWPILOT_RECOMMENDED.
        return [
          {
            id: 'req_snad_spec',
            text: 'Documented product specifications and factory QA certification prior to dispatch',
            targetDocType: 'OTHER',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'PayPal Seller Protection does not cover SNAD. Merchants must provide product condition documentation for review.'
          },
          {
            id: 'req_snad_policy',
            text: 'Proof of customer agreement to merchant return & replacement policy at checkout',
            targetDocType: 'RETURN_POLICY',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'Establishes agreed terms of replacement, return deadlines, and restocking conditions.'
          },
          {
            id: 'req_snad_comm',
            text: 'Records of correspondence regarding return offers or discrepancy resolution',
            targetDocType: 'CUSTOMER_COMMUNICATION',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'Documents bilateral attempt to resolve buyer dissatisfaction.'
          }
        ];

      case 'CANCELED_RECURRING_BILLING':
        return [
          {
            id: 'req_sub_terms',
            text: 'Subscription recurring terms and cancellation policy accepted at signup',
            targetDocType: 'OTHER',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'Demonstrates clear notice of recurring frequency, billing dates, and cancellation procedures.'
          },
          {
            id: 'req_sub_timeline',
            text: 'Audit log of cancellation request timestamp compared to renewal billing cycle',
            targetDocType: 'OTHER',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'Proves billing occurred prior to customer cancellation notice.'
          }
        ];

      case 'INCORRECT_AMOUNT':
        return [
          {
            id: 'req_amt_invoice',
            text: 'Itemized invoice breaking down base price, promotions, and surcharges',
            targetDocType: 'INVOICE',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'Reconciles disputed billing amount with authorized line items and taxes.'
          },
          {
            id: 'req_amt_agreement',
            text: 'Proof of customer authorization for billed amount and shipping surcharges',
            targetDocType: 'OTHER',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'Provides order confirmation demonstrating agreed checkout total.'
          }
        ];

      default:
        return [
          {
            id: 'req_gen_proof',
            text: 'Proof of transaction fulfillment and merchant order receipt',
            targetDocType: 'INVOICE',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'General evidence establishing legitimate order completion.'
          },
          {
            id: 'req_gen_comm',
            text: 'Customer communication records regarding order fulfillment',
            targetDocType: 'CUSTOMER_COMMUNICATION',
            requirementType: 'FLOWPILOT_RECOMMENDED',
            notes: 'Direct correspondence regarding fulfillment and customer satisfaction.'
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
    const postDisputeObservations = [];

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
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
            status: 'NEEDS_REVIEW',
            evidenceRef: undefined,
            notes: 'Signature verification depends on destination and carrier policy. Review if carrier requires signature confirmation.'
          });
        } else {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
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

      // 1. Requirement: Address Matching
      if (req.id === 'req_inr_address') {
        if (contraFields.has('deliveryPostalCode')) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
            status: 'CONTRADICTED',
            evidenceRef: primaryDoc.id,
            notes: 'Carrier delivery postal code conflicts with customer transaction shipping address.'
          });
          unsupportedClaims.push('Claimed delivery to cardholder address is contradicted by carrier destination code.');
          return;
        }

        const buyerAddress = dispute.customer?.shippingAddress || {};
        if (!evidenceValidator.isAddressComparable(buyerAddress, data)) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
            status: 'NEEDS_REVIEW',
            evidenceRef: primaryDoc.id,
            notes: 'Transaction shipping address or carrier tracking postal code is incomplete/masked. Independent postal verification recommended.'
          });
          return;
        }

        const expZip = evidenceValidator.normalizePostalCode(buyerAddress.postalCode);
        const delZip = evidenceValidator.normalizePostalCode(data.deliveryPostalCode);
        if (expZip && delZip && expZip === delZip) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
            status: 'SUPPORTED',
            evidenceRef: primaryDoc.id,
            notes: `Carrier confirmed delivery to recipient zip ${delZip} matching shipping address on Transaction Details.`
          });
          return;
        }

        evidenceMatrix.push({
          requirementId: req.id,
          requirementText: req.text,
          requirementType: req.requirementType,
          sourceCitation: req.sourceCitation,
          status: 'NEEDS_REVIEW',
          evidenceRef: primaryDoc.id,
          notes: 'Address comparison inconclusive; verify full destination in carrier portal.'
        });
        return;
      }

      // 2. Requirement: Proof of Delivery status
      if (req.id === 'req_inr_pod' || req.id === 'req_auth_delivery') {
        if (contraFields.has('deliveryStatus')) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
            status: 'CONTRADICTED',
            evidenceRef: primaryDoc.id,
            notes: 'Carrier tracking records conflicting or returned status, contradicting delivery claim.'
          });
          unsupportedClaims.push('Delivery claim is contradicted by carrier return or exception status.');
          return;
        }

        // Check for post-dispute delivery timeline observation
        const temporalEval = evidenceValidator.evaluateTemporalSequence(dispute, primaryDoc);
        if (temporalEval && temporalEval.isPostDisputeDelivery) {
          postDisputeObservations.push(temporalEval);
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
            status: 'NEEDS_REVIEW',
            evidenceRef: primaryDoc.id,
            notes: `${temporalEval.observation} Carrier tracking shows delivered status, but post-filing delivery requires procedure review.`
          });
          return;
        }

        const trackingProv = evidenceValidator.validateTrackingProvenance(
          data.carrierName,
          data.trackingNumber,
          data.carrierTrackingStatus || data.deliveryStatus,
          data.verificationSource || 'DOCUMENT_EXTRACTED'
        );

        if (trackingProv.deliveryConfirmed) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
            status: 'SUPPORTED',
            evidenceRef: primaryDoc.id,
            notes: `Carrier (${trackingProv.carrierName || 'Carrier'}) confirmed delivered on ${data.dates?.actualDeliveryDate || data.deliveryDate || 'recorded date'} with tracking number ${trackingProv.trackingNumber}.`
          });
          return;
        }

        evidenceMatrix.push({
          requirementId: req.id,
          requirementText: req.text,
          requirementType: req.requirementType,
          sourceCitation: req.sourceCitation,
          status: 'NEEDS_REVIEW',
          evidenceRef: primaryDoc.id,
          notes: `Tracking status is "${trackingProv.carrierTrackingStatus || data.deliveryStatus || 'In Transit'}"; actual final delivery confirmation is not yet established.`
        });
        return;
      }

      // 3. Requirement: Invoice Amount & Two-Tier Partial Dispute Validation
      if (req.id === 'req_inr_invoice' || req.id === 'req_amt_invoice' || req.id === 'req_gen_proof') {
        if (contraFields.has('amount') || contraFields.has('currency') || contraFields.has('transactionId')) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
            status: 'CONTRADICTED',
            evidenceRef: primaryDoc.id,
            notes: 'Invoice total, currency, or transaction ID conflicts with PayPal transaction records.'
          });
          unsupportedClaims.push('Invoice details conflict with PayPal dispute transaction amount or currency.');
          return;
        }

        // Two-Tier Partial Dispute Validation
        const partialResult = evidenceValidator.validatePartialDispute(dispute, primaryDoc);
        evidenceMatrix.push({
          requirementId: req.id,
          requirementText: req.text,
          requirementType: req.requirementType,
          sourceCitation: req.sourceCitation,
          status: partialResult.status,
          evidenceRef: primaryDoc.id,
          notes: partialResult.notes
        });
        return;
      }

      // 4. Requirement: Signature verification
      if (req.id === 'req_inr_signature') {
        if (data.signatureObtained) {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
            status: 'SUPPORTED',
            evidenceRef: primaryDoc.id,
            notes: `Carrier recorded signature confirmation for recipient (${data.recipientName || 'Recipient'}).`
          });
        } else {
          evidenceMatrix.push({
            requirementId: req.id,
            requirementText: req.text,
            requirementType: req.requirementType,
            sourceCitation: req.sourceCitation,
            status: 'NEEDS_REVIEW',
            evidenceRef: primaryDoc.id,
            notes: 'No physical signature recorded on carrier slip; review destination route terms to determine if signature confirmation is required.'
          });
        }
        return;
      }

      // Default Document Match
      evidenceMatrix.push({
        requirementId: req.id,
        requirementText: req.text,
        requirementType: req.requirementType,
        sourceCitation: req.sourceCitation,
        status: 'SUPPORTED',
        evidenceRef: primaryDoc.id,
        notes: `Substantiated by verified ${primaryDoc.documentType} document [${primaryDoc.id}].`
      });
    });

    return { evidenceMatrix, missingEvidence, unsupportedClaims, postDisputeObservations };
  }

  /**
   * Formulates practical, actionable next steps for the merchant.
   * Adheres strictly to factual neutral procedures; avoids speculative legal promises.
   */
  generateRecommendedActions(dispute, evidenceMatrix, contradictions, missingEvidence, postDisputeObservations = []) {
    const actions = [];

    // 1. Contradictions take top priority
    if (contradictions.length > 0) {
      contradictions.forEach((c) => {
        if (c.field === 'deliveryPostalCode') {
          actions.push('Obtain carrier delivery exception log or GPS coordinates confirming physical delivery to customer address.');
        } else if (c.field === 'amount' || c.field === 'currency') {
          actions.push('Reconcile commercial invoice line items with PayPal transaction breakdown to correct conflicting billing amounts.');
        } else if (c.field === 'deliveryDate') {
          actions.push('Request carrier dispatch audit to resolve conflicting delivery timestamp.');
        } else {
          actions.push(`Investigate conflicting evidence for ${c.field} between ${c.sourceA} and ${c.sourceB}.`);
        }
      });
    }

    // 2. Post-Dispute Delivery Actions (Neutral & Procedural)
    if (postDisputeObservations.length > 0) {
      postDisputeObservations.forEach((obs) => {
        actions.push(obs.recommendation);
      });
    }

    // 3. Missing Evidence Actions
    if (missingEvidence.length > 0) {
      missingEvidence.forEach((item) => {
        actions.push(`Upload missing evidence: ${item}.`);
      });
    }

    // 4. Needs Review Items (Partial disputes, signature, tracking status)
    const needsReviewItems = evidenceMatrix.filter((m) => m.status === 'NEEDS_REVIEW');
    needsReviewItems.forEach((item) => {
      if (item.requirementId === 'req_inr_invoice' || item.requirementId === 'req_amt_invoice') {
        if (item.notes && item.notes.includes('Partial dispute')) {
          actions.push('Review dispute claim notes and itemized invoice line items to substantiate the partial disputed amount.');
        }
      } else if (item.requirementId === 'req_inr_signature') {
        actions.push('Review carrier delivery terms to determine if signature confirmation is mandatory for this destination zone.');
      } else if (item.requirementId === 'req_inr_pod' && !postDisputeObservations.length) {
        actions.push('Check carrier tracking portal for final delivery scan confirmation.');
      }
    });

    // 5. If all requirements are supported
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

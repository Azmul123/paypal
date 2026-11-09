/**
 * FlowPilot — Module 1: Dispute Management
 * Shared Architecture & Integration Contract Specification
 * 
 * Provides runtime interfaces and documentation for:
 * - Module 2: Evidence Management
 * - Module 3: AI Evidence Intelligence
 * - Module 4: Dispute Response and Resolution
 */

const express = require('express');
const router = express.Router();

router.get('/contracts', (req, res) => {
  res.json({
    version: '1.1.0',
    module: 'Module 1 — Dispute Management',
    status: 'ACTIVE_SPECIFICATION',
    owner: 'Member 1 (Lead Full-Stack Engineer)',
    tagline: 'Turn scattered payment records into structured, verifiable dispute evidence.',
    sharedDisputeSchema: {
      id: { type: 'string', description: 'Internal FlowPilot identifier (e.g. disp_fp_101 or disp_PP-D-12345)' },
      paypalDisputeId: { type: 'string', description: 'Official PayPal dispute ID (e.g. PP-D-94821)' },
      transactionId: { type: 'string', description: 'PayPal seller transaction ID' },
      reason: {
        type: 'string',
        enum: [
          'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
          'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED',
          'UNAUTHORISED',
          'CANCELED_RECURRING_BILLING',
          'INCORRECT_AMOUNT',
          'OTHER'
        ]
      },
      amount: { type: 'number', description: 'Disputed amount in floating currency units' },
      currency: { type: 'string', description: '3-letter ISO currency code (e.g. USD, EUR, GBP)' },
      status: {
        type: 'string',
        enum: [
          'OPEN',
          'WAITING_FOR_SELLER_RESPONSE',
          'WAITING_FOR_BUYER_RESPONSE',
          'UNDER_REVIEW',
          'RESOLVED',
          'CANCELLED'
        ]
      },
      lifecycleStage: {
        type: 'string',
        enum: ['INQUIRY', 'CHARGEBACK', 'PRE_ARBITRATION', 'ARBITRATION']
      },
      responseDeadline: { type: 'ISO8601 string or null', description: 'Deadline for merchant response' },
      createdAt: { type: 'ISO8601 string' },
      updatedAt: { type: 'ISO8601 string' },
      source: {
        type: 'string',
        enum: ['demo', 'paypal_sandbox', 'paypal_live'],
        description: 'Identifies provenance. "demo" indicates synthetic sample data for development only.'
      },
      customer: {
        name: { type: 'string' },
        email: { type: 'string' },
        shippingAddress: { type: 'object' }
      },
      messages: {
        type: 'array of objects',
        items: '{ postedBy: BUYER|SELLER|PAYPAL, senderName: string, content: string, createdAt: string }'
      }
    },
    approvedEvidenceStatuses: [
      'SUPPORTED',
      'MISSING',
      'CONTRADICTED',
      'NEEDS_REVIEW'
    ],
    interfacesForOtherModules: {
      module2_EvidenceManagement: {
        responsibility: 'Manage, upload, and verify documents associated with a dispute',
        requiredInput: 'disputeId: string',
        expectedOutputs: [
          'evidenceDocuments: Array<{ id, documentType, storageUrl, mimeType, uploadedAt }>'
        ],
        availableEndpoints: {
          getDispute: 'GET /api/disputes/:id',
          hookUrl: '/api/evidence/upload (Module 2 to implement)'
        }
      },
      module3_AIEvidenceIntelligence: {
        responsibility: 'Analyze dispute requirements and merchant-provided evidence, map evidence to applicable requirements, detect missing or contradictory information, and identify unsupported claims with source references.',
        requiredInput: 'dispute: FlowPilotDisputeSchema, evidence: Array<EvidenceDocument>',
        approvedStatuses: [
          'SUPPORTED',
          'MISSING',
          'CONTRADICTED',
          'NEEDS_REVIEW'
        ],
        expectedOutputs: {
          evidenceMatrix: 'Array<{ requirementId: string, requirementText: string, status: "SUPPORTED"|"MISSING"|"CONTRADICTED"|"NEEDS_REVIEW", evidenceRef?: string, notes?: string }>',
          missingEvidence: 'Array<string>',
          contradictions: 'Array<{ field: string, sourceA: string, sourceB: string, description: string }>',
          sourceReferences: 'Array<string>',
          unsupportedClaims: 'Array<string>',
          recommendedActions: 'Array<string>'
        },
        constraints: 'FlowPilot must not predict dispute outcomes, estimate probability of winning, or calculate win-probability scores.',
        availableEndpoints: {
          getDispute: 'GET /api/disputes/:id'
        }
      },
      module4_DisputeResponseResolution: {
        responsibility: 'Format final PayPal evidence package and submit to PayPal REST API',
        requiredInput: 'disputeId: string, evidenceBundle: object, narrative: string',
        expectedOutputs: {
          submissionStatus: 'SUBMITTED | PENDING_REVIEW',
          submissionTimestamp: 'ISO8601 string',
          paypalAcknowledgementId: 'string'
        },
        availableEndpoints: {
          getDispute: 'GET /api/disputes/:id',
          paypalTokenProvider: 'Use server/services/paypalService.js getAccessToken()'
        }
      }
    }
  });
});

module.exports = router;

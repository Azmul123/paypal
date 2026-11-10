# FlowPilot Master API Contract & Integration Specification
> **Module 1 (Dispute Management) • Member 1**  
> **Target Audience:** FlowPilot Lead Engineers (Module 2, Module 3, Module 4)  
> **Status:** ACTIVE SPECIFICATION (v1.1.0)

---

## 1. System Overview & Ingestion Flow

FlowPilot assists merchants in structuring verifiable PayPal dispute defense packages.

```
[PayPal REST API / Demo Ingestion]
                │
                ▼
      ┌──────────────────┐
      │     Module 1     │  Dispute Management (Ingestion, Registry, Dashboard)
      └─────────┬────────┘
                │ provides FlowPilotDisputeSchema
                ▼
      ┌──────────────────┐
      │     Module 2     │  Evidence Management (Carrier POD, Invoices, Chat Logs)
      └─────────┬────────┘
                │ provides EvidenceDocument[]
                ▼
      ┌──────────────────┐
      │     Module 3     │  AI Evidence Intelligence (Matrix Mapping, Contradictions)
      └─────────┬────────┘
                │ provides EvidenceMatrix & Verification Findings
                ▼
      ┌──────────────────┐
      │     Module 4     │  Dispute Response & Resolution (Package Submission)
      └──────────────────┘
```

---

## 2. Standard Dispute Schema (`FlowPilotDisputeSchema`)

Every dispute provided by Module 1 conforms to the following JSON structure:

```json
{
  "id": "disp_fp_101",
  "paypalDisputeId": "PP-D-94821",
  "transactionId": "9TX4829104821034A",
  "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
  "reasonFormatted": "Item Not Received (INR)",
  "amount": 249.99,
  "currency": "USD",
  "status": "WAITING_FOR_SELLER_RESPONSE",
  "lifecycleStage": "CHARGEBACK",
  "responseDeadline": "2026-11-12T23:59:59Z",
  "transactionDate": "2026-10-24T14:32:00Z",
  "createdAt": "2026-11-02T09:14:22Z",
  "updatedAt": "2026-11-04T11:00:00Z",
  "source": "demo",
  "customer": {
    "name": "Marcus Vance",
    "email": "m.vance@crestlinecorp.com",
    "shippingAddress": {
      "street": "742 Evergreen Terrace",
      "city": "Springfield",
      "state": "OR",
      "postalCode": "97477",
      "country": "US"
    }
  },
  "disputeChannel": "INTERNAL",
  "itemDetails": [
    {
      "name": "Enterprise Noise-Canceling Wireless Headset",
      "quantity": 1,
      "unitPrice": 249.99
    }
  ],
  "messages": [
    {
      "postedBy": "BUYER",
      "senderName": "Marcus Vance",
      "content": "Tracking shows delivered at front porch, but cameras show no driver.",
      "createdAt": "2026-11-02T09:14:22Z"
    }
  ],
  "sellerActionsNeeded": [
    "Provide proof of delivery with carrier tracking number",
    "Verify online tracking shows delivery to recipient address (NEEDS_REVIEW: determine if carrier signature confirmation is required for this destination)",
    "Submit correspondence history with buyer"
  ],
  "evidenceHandoff": {
    "evidenceCount": 0,
    "aiAnalysisStatus": "PENDING_INPUT",
    "responseStatus": "NOT_STARTED"
  }
}
```

### Data Provenance (`source` attribute)
- `"demo"`: Identifies **synthetic sample data** created for development and automated testing. It must never be represented as actual PayPal disputes or real customer identities.
- `"paypal_sandbox"`: Official test records pulled from PayPal Developer Sandbox (`api-m.sandbox.paypal.com`).
- `"paypal_live"`: Live production records (disabled during development).

---

## 3. Module 1 Available Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health and active mode check. |
| `GET` | `/api/disputes` | List disputes with search (`?search=`), status filter (`?status=`), and sorting (`?sortBy=`). |
| `GET` | `/api/disputes/:id` | Fetch full dispute details by internal ID or PayPal Dispute ID. |
| `GET` | `/api/disputes/stats/overview` | KPI overview stats (total, open, resolved, attention required, disputed volume). |
| `POST` | `/api/disputes/sync` | Sync disputes from PayPal Sandbox or reload synthetic demo dataset. |
| `GET` | `/api/paypal/status` | Current PayPal connection status and environment metadata. |
| `POST` | `/api/paypal/test` | Test PayPal credentials without committing. |
| `POST` | `/api/paypal/connect` | Connect PayPal credentials in runtime. |
| `POST` | `/api/paypal/disconnect` | Disconnect and revert to demo mode. |
| `GET` | `/api/integration/contracts` | Programmatic schema and interface definitions. |

---

## 4. Module 2: Evidence Management Contract

- **Owner:** Team Member 2
- **Responsibility:** Manage, upload, and verify documents associated with a dispute (carrier tracking receipts, shipping confirmations, delivery signatures, invoices, customer correspondence).
- **Required Input:** `disputeId: string` (from `GET /api/disputes/:id`)
- **Expected Output:**
  ```typescript
  interface EvidenceDocument {
    id: string;
    disputeId: string;
    documentType: 'PROOF_OF_DELIVERY' | 'CUSTOMER_COMMUNICATION' | 'INVOICE' | 'RETURN_POLICY' | 'OTHER';
    carrierName?: string;
    trackingNumber?: string;
    storageUrl: string;
    mimeType: string;
    uploadedAt: string;
  }
  ```

---

## 5. Module 3: AI Evidence Intelligence Contract

- **Owner:** Team Member 3
- **Responsibility:**
  > "Analyze dispute requirements and merchant-provided evidence, map evidence to applicable requirements, detect missing or contradictory information, and identify unsupported claims with source references."
- **Strict Architecture Constraint:**
  > **FlowPilot must not claim to predict whether a merchant will win a PayPal dispute.**  
  > Module 3 must **NOT** calculate or output `winProbabilityScore`, win probability percentages, or predictions of dispute outcomes. Evidence coverage must never be interpreted as probability of winning.

### Approved Evidence Requirement Statuses
Every requirement in the evidence matrix must have exactly one of these four statuses:
1. `SUPPORTED` — Requirement is substantiated by verified merchant evidence.
2. `MISSING` — Required evidence has not been uploaded or provided.
3. `CONTRADICTED` — Conflicting values detected between evidence records (e.g. delivery zip mismatch).
4. `NEEDS_REVIEW` — Requirement or evidence applicability requires manual review.

### Module 3 Input Contract
- `dispute: FlowPilotDisputeSchema`
- `evidence: EvidenceDocument[]`

### Module 3 Output Contract
```typescript
interface AIEvidenceAnalysisResult {
  /**
   * Array of requirement-to-evidence mappings with verified policy citations
   */
  evidenceMatrix: Array<{
    requirementId: string;
    requirementText: string;
    requirementType?: 'OFFICIAL_PAYPAL' | 'FLOWPILOT_RECOMMENDED';
    sourceCitation?: {
      documentTitle: string;
      sourceUrl: string;
      section: string;
      applicableDisputeType: string;
      retrievalDate: string;
    };
    status: 'SUPPORTED' | 'MISSING' | 'CONTRADICTED' | 'NEEDS_REVIEW';
    evidenceRef?: string;
    notes?: string;
  }>;

  /**
   * Array of unsupported evidence requirements
   */
  missingEvidence: string[];

  /**
   * Array of conflicting values found in records (genuine transaction discrepancies)
   */
  contradictions: Array<{
    field: string;
    sourceA: string;
    sourceB: string;
    description: string;
  }>;

  /**
   * References to original evidence documents (strictly valid IDs)
   */
  sourceReferences: string[];

  /**
   * Claims that lack sufficient evidence
   */
  unsupportedClaims: string[];

  /**
   * Practical next steps for the merchant (neutral, factual next actions)
   */
  recommendedActions: string[];
}
```

### Module 3 Available Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/intelligence/analyze` | Executes complete AI analysis on dispute & evidence documents. |
| `GET` | `/api/intelligence/analysis/:disputeId` | Retrieves cached or computed evidence analysis. |
| `GET` | `/api/intelligence/evidence/:disputeId` | Retrieves associated evidence documents. |
| `GET` | `/api/intelligence/requirements/:reason` | Returns applicable category requirements for a PayPal dispute reason. |
| `POST` | `/api/intelligence/extract` | Direct fact extraction endpoint for a single document. |

---

## 6. Module 4: Dispute Response & Resolution Contract

- **Owner:** Team Member 4
- **Responsibility:** Compile the final evidence bundle, generate the merchant defense narrative, and submit the response package to PayPal's official Customer Disputes API.
- **Input:**
  - `disputeId: string`
  - `evidenceBundle: { evidenceMatrix: Array<...>, documents: EvidenceDocument[] }`
  - `narrative: string`
- **PayPal Authentication:** Obtain the access token via `paypalService.getAccessToken()`.
- **Expected Output:**
  ```typescript
  interface DisputeSubmissionResult {
    submissionStatus: 'SUBMITTED' | 'PENDING_REVIEW' | 'FAILED';
    submissionTimestamp: string;
    paypalAcknowledgementId?: string;
    errorMessage?: string;
  }
  ```

---

## 7. Evidence Requirement Rules & Guidelines

- **No Universal Threshold Rules:** Universal rules (such as assuming signature confirmation is universally mandatory above $750) are removed.
- Evidence requirements must be inferred from the **actual dispute reason** (INR, SNAD, Unauthorized, Canceled Recurring) and applicable PayPal documentation.
- When requirements depend on carrier terms, international routes, or specific seller protection conditions, mark the requirement as **`NEEDS_REVIEW`**.

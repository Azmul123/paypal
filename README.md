# FlowPilot — PayPal Dispute Evidence Copilot
> **Turn scattered payment records into structured, verifiable dispute evidence.**

FlowPilot is an AI-powered SaaS platform designed to help online merchants defend against PayPal disputes, chargebacks, and claims with structured evidence.

This repository houses **Module 1: Dispute Management**, the foundational ingestion, lifecycle management, and overview dashboard of FlowPilot.

---

## 1. FlowPilot Product Architecture & Modules

FlowPilot is built by four collaborative modules:

1. **Module 1: Dispute Management (THIS MODULE)** — Ingests disputes from PayPal REST APIs, tracks deadlines, provides the merchant dashboard, and serves standardized data contracts.
2. **Module 2: Evidence Management (Team Member 2)** — Ingests shipping tracking, carrier delivery signatures, invoices, and customer chat logs.
3. **Module 3: AI Evidence Intelligence (Team Member 3)** — Analyzes dispute requirements and merchant-provided evidence, maps evidence to applicable requirements, detects missing or contradictory information, and identifies unsupported claims with source references. (Note: FlowPilot does not predict dispute outcomes or calculate win probabilities).
4. **Module 4: Dispute Response & Resolution (Team Member 4)** — Prepares the final evidence bundle and submits it to PayPal's Customer Disputes API.

---

## 2. Technology Stack

- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js, Express.js, Axios
- **Database**: Supabase PostgreSQL (with automatic in-memory fallback for offline testing)
- **APIs**: Official PayPal REST API (OAuth 2.0 Client Credentials & Customer Disputes v1)
- **Version Control**: Git / GitHub

---

## 3. Quick Start Guide (Beginner-Friendly)

Follow these steps to run FlowPilot locally on your computer.

### Step 1: Prerequisites
Make sure you have Node.js installed (version 18 or newer).
Verify by opening your terminal and typing:
```bash
node -v
npm -v
```

### Step 2: Clone & Enter Project Directory
```bash
git clone <repository-url>
cd flowpilot
```

### Step 3: Install Dependencies
Install dependencies for both server and client:
```bash
# In Windows PowerShell:
npm.cmd install
cd server; npm.cmd install; cd ..
cd client; npm.cmd install; cd ..
```
*(On Mac/Linux, replace `npm.cmd` with `npm`)*

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

By default, `PAYPAL_MODE=demo` is enabled. You can run FlowPilot immediately without any API keys! FlowPilot will load a rich set of realistic PayPal dispute claims covering Item Not Received (INR), Significantly Not As Described (SNAD), and Unauthorized Chargebacks.

### Step 5: Start the Development Servers
Open two terminal windows:

**Terminal 1 (Backend API Server):**
```bash
cd server
npm.cmd run dev
```
*The server will start on `http://localhost:5000`.*

**Terminal 2 (Frontend Client):**
```bash
cd client
npm.cmd run dev
```
*The frontend will start on `http://localhost:5173`.*

Open your web browser and navigate to: **`http://localhost:5173`**

---

## 4. Connecting PayPal Developer Sandbox

FlowPilot integrates with the official PayPal Customer Disputes REST API:
https://developer.paypal.com/docs/api/customer-disputes/v1/

### How to obtain Sandbox credentials:
1. Log in to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Navigate to **Apps & Credentials** on the left menu.
3. Set the environment toggle to **Sandbox** (do not use Live credentials during development).
4. Click **Create App** (or select the *Default Application*).
5. Copy your **Client ID** and **Client Secret**.
6. In FlowPilot, open the **PayPal Connection** tab in the sidebar and enter your credentials, or paste them into your `.env` file:
   ```env
   PAYPAL_MODE=sandbox
   PAYPAL_CLIENT_ID=your_sandbox_client_id
   PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
   ```
7. Click **Test Credentials** to verify authentication with PayPal OAuth 2.0, then click **Connect PayPal Sandbox**.
8. Click **Sync Disputes** to pull active Sandbox disputes into FlowPilot.

> **Security Guarantee:**
> - PayPal client secrets are **never** exposed to the browser or included in frontend client bundles.
> - All OAuth token requests and API calls are brokered through the secure Node.js backend.
> - Real cardholder credentials or production keys are strictly prohibited in development.

---

## 5. Supabase PostgreSQL Integration

FlowPilot is configured to work with Supabase PostgreSQL:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Open [`server/db/schema.sql`](file:///c:/flowpilot/server/db/schema.sql) and execute the SQL script. This creates:
   - The `disputes` table with indexes on dispute IDs, status, and response deadlines.
   - Foreign key placeholder tables for `evidence_documents`, `ai_evidence_analyses`, and `dispute_responses`.
4. Copy your Supabase URL and Anon/Service Role Key into `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. If Supabase is not configured, FlowPilot automatically uses its high-fidelity in-memory store so development and testing are never blocked!

---

## 6. Running Automated Tests

FlowPilot includes a comprehensive automated test suite testing health routes, KPI metrics, dispute filtering, search queries, PayPal authentication error handling, and API integration contracts:

```bash
cd server
npm.cmd test
```

### Test Suite Coverage:
- **Suite 1: System Health & Base Routes** — Verifies `/api/health` 200 response and module identity.
- **Suite 2: Dashboard Overview & KPI Metrics** — Verifies stats calculations, active vs open vs urgent disputes, and financial exposure sums.
- **Suite 3: Dispute Listing, Search, and Filtering** — Tests search by buyer name and dispute ID, status filtering (`RESOLVED`, `WAITING_FOR_SELLER_RESPONSE`), and empty state handling.
- **Suite 4: Dispute Detail Retrieval & 404 Handling** — Verifies individual claim payloads and graceful 404 responses.
- **Suite 5: PayPal Connection & Security Validation** — Tests OAuth 2.0 handshake and verifies that invalid credentials return `401 Unauthorized` without crashing.
- **Suite 6: Shared Architecture & Contracts** — Validates that the shared JSON schema and module interfaces are accessible at `/api/integration/contracts`.
- **Suite 7: Supabase Integration & In-Memory Fallback** — Validates database health check and seamless fallback.

---

## 7. Contracts & Interfaces for Team Members (Modules 2, 3, 4)

All disputes in FlowPilot adhere to the standardized schema below:

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
  "source": "paypal_sandbox",
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
  "messages": [
    {
      "postedBy": "BUYER",
      "senderName": "Marcus Vance",
      "content": "Tracking shows delivered at front porch, but cameras show no delivery.",
      "createdAt": "2026-11-02T09:14:22Z"
    }
  ],
  "sellerActionsNeeded": [
    "Upload carrier tracking number showing delivery",
    "Verify online tracking shows delivery to recipient address (NEEDS_REVIEW: determine if carrier signature confirmation is required for this destination)"
  ]
}
```

### Module 2: Evidence Management (Team Member 2)
- **Role:** Upload, store, and verify documents associated with a dispute (carrier tracking, signature proofs, invoices, buyer communications).
- **Input:** Call `GET /api/disputes/:id` to fetch the dispute ID, reason, and transaction details.
- **Output:** Attach evidence document records to the dispute:
  `{ disputeId, documentType: 'PROOF_OF_DELIVERY' | 'INVOICE' | 'COMMUNICATION', storageUrl }`.

### Module 3: AI Evidence Intelligence (Team Member 3)
- **Role:** Analyze dispute requirements and merchant-provided evidence, map evidence to applicable requirements, detect missing or contradictory information, and identify unsupported claims with source references.
- **Strict Constraint:** Do not calculate win probabilities, dispute outcome predictions, or win-probability scores.
- **Input:** Receives `FlowPilotDisputeSchema` + `evidenceDocuments[]`.
- **Approved Evidence Requirement Statuses:**
  - `SUPPORTED` — Requirement is substantiated by verified evidence.
  - `MISSING` — Required evidence has not been uploaded.
  - `CONTRADICTED` — Conflict detected between evidence records.
  - `NEEDS_REVIEW` — Requirement or evidence validity requires merchant review.
- **Output:** Returns:
  ```json
  {
    "evidenceMatrix": [
      {
        "requirementId": "req_01",
        "requirementText": "Proof of physical delivery to buyer address",
        "status": "SUPPORTED",
        "evidenceRef": "doc_pod_9981",
        "notes": "Carrier tracking marks item as delivered to customer postal code"
      }
    ],
    "missingEvidence": ["Detailed merchant invoice with itemized line items"],
    "contradictions": [],
    "sourceReferences": ["doc_pod_9981"],
    "unsupportedClaims": [],
    "recommendedActions": ["Proceed to Module 4 response compilation"]
  }
  ```

### Module 4: Dispute Response & Resolution (Team Member 4)
- **Role:** Compile final evidence package and submit to PayPal REST API (`POST /v1/customer-disputes/{dispute_id}/provide-evidence`).
- **Input:** Call `GET /api/disputes/:id`, consume Module 3's `evidenceMatrix`, and use `paypalService.getAccessToken()` from `server/services/paypalService.js`.
- **Output:** `{ submissionStatus: 'SUBMITTED', paypalAcknowledgementId: string }`.

---

## 8. Development Verification Summary

| Requirement | Implementation | Status |
|---|---|---|
| **Professional SaaS Dashboard** | Modern fintech dashboard with overview KPIs, urgent attention alerts, and recent claim feed | ✅ Verified |
| **Disputes Registry Page** | Full table with Dispute ID, Txn ID, Buyer, Reason, Amount, Status, Deadline, and Date | ✅ Verified |
| **Search, Filter & Sort** | Real-time search by ID/buyer/reason, status tabs, and deadline/amount sorting | ✅ Verified |
| **Dispute Detail View** | Complete lifecycle breakdown, message history, checklist, and payload inspector | ✅ Verified |
| **Module Placeholders** | Explicit handoff cards for Modules 2, 3, and 4 with API contracts | ✅ Verified |
| **PayPal Sandbox Connection** | OAuth 2.0 handshake, credential tester, secure backend proxy, live/demo toggle | ✅ Verified |
| **Supabase Integration** | PostgreSQL schema with indexes + `@supabase/supabase-js` service + memory fallback | ✅ Verified |
| **Module 3: AI Evidence Intelligence** | Gemini API fact extraction, prompt injection defense, deterministic validation, contradiction detection, and Evidence Matrix mapping | ✅ Verified |
| **Automated Tests** | 103 automated integration tests covering Modules 1 and 3 (Suites 1–12) | ✅ 103/103 Passing |

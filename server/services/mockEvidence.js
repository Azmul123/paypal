/**
 * FlowPilot — Module 3: AI Evidence Intelligence
 * Synthetic Evidence Documents Dataset for Testing & Development (v3.1)
 * 
 * NOTE: All documents here are strictly synthetic sample data.
 * They represent realistic carrier delivery confirmations, invoices, 
 * customer communications, and terms of service for testing.
 */

const mockEvidenceByDispute = {
  // Dispute 1: Item Not Received (INR) — Marcus Vance ($249.99, Springfield OR 97477)
  disp_fp_101: [
    {
      id: "doc_pod_101",
      disputeId: "disp_fp_101",
      documentType: "PROOF_OF_DELIVERY",
      carrierName: "FedEx Express",
      trackingNumber: "781294819201",
      storageUrl: "/mock-storage/evidence/disp_fp_101/fedex_pod_781294819201.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-11-03T10:30:00Z",
      content: `FEDEX PROOF OF DELIVERY
Tracking Number: 781294819201
Service: FedEx Priority Overnight
Status: Delivered
Delivery Date: November 02, 2026 13:45:00 UTC
Delivered To: Front Porch / Residential
Destination Address:
Marcus Vance
742 Evergreen Terrace
Springfield, OR 97477
United States
Recipient Signed By: Left at front door (No signature required for standard residential under $750 carrier threshold)
Gross Weight: 1.8 lbs`,
      extractedData: {
        documentId: "doc_pod_101",
        documentType: "PROOF_OF_DELIVERY",
        extractionMethod: "DETERMINISTIC_FALLBACK",
        verificationSource: "DOCUMENT_EXTRACTED",
        isIndependentVerification: false,
        carrierName: "FedEx Express",
        trackingNumber: "781294819201",
        trackingFormatValid: true,
        carrierTrackingStatus: "DELIVERED",
        deliveryStatus: "Delivered",
        dates: {
          purchaseDate: "2026-10-24T14:32:00Z",
          shipmentDate: "2026-10-25T10:00:00Z",
          estimatedDeliveryDate: "2026-11-02T18:00:00Z",
          actualDeliveryDate: "2026-11-02T13:45:00Z"
        },
        deliveryDate: "2026-11-02T13:45:00Z",
        deliveryAddress: "742 Evergreen Terrace",
        deliveryCity: "Springfield",
        deliveryState: "OR",
        deliveryPostalCode: "97477",
        recipientName: "Marcus Vance",
        signatureObtained: false,
        summary: "FedEx Priority Overnight delivered to Springfield, OR 97477 on Nov 02, 2026."
      }
    },
    {
      id: "doc_inv_101",
      disputeId: "disp_fp_101",
      documentType: "INVOICE",
      storageUrl: "/mock-storage/evidence/disp_fp_101/invoice_INV-2026-8812.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-11-03T10:32:00Z",
      content: `COMMERCIAL INVOICE
Invoice Number: INV-2026-8812
Date: October 24, 2026
PayPal Transaction ID: 9TX4829104821034A
Bill To / Ship To:
Marcus Vance
742 Evergreen Terrace, Springfield, OR 97477
Items:
1x Enterprise Noise-Canceling Wireless Headset — $249.99
Subtotal: $249.99
Shipping: $0.00
Tax: $0.00
Total: $249.99 USD
Payment Method: PayPal Checkout`,
      extractedData: {
        documentId: "doc_inv_101",
        documentType: "INVOICE",
        extractionMethod: "DETERMINISTIC_FALLBACK",
        verificationSource: "DOCUMENT_EXTRACTED",
        isIndependentVerification: false,
        invoiceNumber: "INV-2026-8812",
        lineItems: [
          {
            description: "Enterprise Noise-Canceling Wireless Headset",
            quantity: 1,
            unitPrice: 249.99,
            lineTotal: 249.99,
            sku: "FP-HEADSET-PRO"
          }
        ],
        subtotal: 249.99,
        shippingHandling: 0.00,
        tax: 0.00,
        totalAmount: 249.99,
        amount: 249.99,
        currency: "USD",
        transactionId: "9TX4829104821034A",
        customerName: "Marcus Vance",
        shippingAddress: "742 Evergreen Terrace, Springfield, OR 97477",
        summary: "Commercial invoice INV-2026-8812 for $249.99 USD matching transaction 9TX4829104821034A."
      }
    },
    {
      id: "doc_comm_101",
      disputeId: "disp_fp_101",
      documentType: "CUSTOMER_COMMUNICATION",
      storageUrl: "/mock-storage/evidence/disp_fp_101/email_thread_101.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-11-03T10:35:00Z",
      content: `EMAIL CORRESPONDENCE LOG
From: support@crestline.com
To: m.vance@crestlinecorp.com
Date: October 25, 2026
Subject: Order Confirmation & Tracking Details
"Hello Marcus, your order has shipped via FedEx tracking # 781294819201. Expected arrival Monday Nov 2."`,
      extractedData: {
        documentId: "doc_comm_101",
        documentType: "CUSTOMER_COMMUNICATION",
        extractionMethod: "DETERMINISTIC_FALLBACK",
        verificationSource: "DOCUMENT_EXTRACTED",
        isIndependentVerification: false,
        communications: [
          {
            sender: "MERCHANT",
            timestamp: "2026-10-25T10:00:00Z",
            summary: "Order shipment confirmation email sent with FedEx tracking 781294819201."
          }
        ],
        trackingReferenced: "781294819201"
      }
    }
  ],

  // Dispute 2: Significantly Not As Described (SNAD) — Elena Rostova ($1450.00)
  disp_fp_102: [
    {
      id: "doc_spec_102",
      disputeId: "disp_fp_102",
      documentType: "OTHER",
      storageUrl: "/mock-storage/evidence/disp_fp_102/spec_sheet_console.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-10-30T11:00:00Z",
      content: `PRODUCT SPECIFICATION SHEET
Product: Custom 4K Video Editing Console (Aluminum Frame)
Model: FP-CONSOLE-4K
Factory QA Diagnostic: Certified Passed QA-9921 on 2026-10-15
Rotary Encoders: Bourns Optical Precision Encoders (Channels 1-4 Tested)
Operating Firmware: v2.4.1 Production Release`,
      extractedData: {
        documentId: "doc_spec_102",
        documentType: "OTHER",
        extractionMethod: "DETERMINISTIC_FALLBACK",
        verificationSource: "DOCUMENT_EXTRACTED",
        isIndependentVerification: false,
        productName: "Custom 4K Video Editing Console (Aluminum Frame)",
        qaCertification: "Passed QA-9921",
        qaDate: "2026-10-15",
        summary: "Pre-dispatch QA inspection certification passed on Oct 15, 2026."
      }
    },
    {
      id: "doc_ret_102",
      disputeId: "disp_fp_102",
      documentType: "RETURN_POLICY",
      storageUrl: "/mock-storage/evidence/disp_fp_102/terms_accepted.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-10-30T11:05:00Z",
      content: `MERCHANT RETURN & REPLACEMENT TERMS
Accepted by customer elena.design@studioworks.io at checkout on Oct 18, 2026.
Clause 4.2: In the event of hardware defects, merchant provides prepaid return label for full inspection and replacement unit within 3 business days. Full refunds require physical return of original equipment.`,
      extractedData: {
        documentId: "doc_ret_102",
        documentType: "RETURN_POLICY",
        extractionMethod: "DETERMINISTIC_FALLBACK",
        verificationSource: "DOCUMENT_EXTRACTED",
        isIndependentVerification: false,
        acceptedBy: "elena.design@studioworks.io",
        acceptedDate: "2026-10-18",
        clause: "Prepaid return label required for full refund or replacement",
        summary: "Terms accepted at checkout requiring return of hardware for replacement."
      }
    }
  ],

  // Dispute 3: Unauthorized Transaction — Arthur Pendelton ($89.00)
  disp_fp_103: [
    {
      id: "doc_auth_103",
      disputeId: "disp_fp_103",
      documentType: "OTHER",
      storageUrl: "/mock-storage/evidence/disp_fp_103/security_ip_log.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-11-02T08:00:00Z",
      content: `SECURITY AUDIT & LOGIN ACCESS LOG
User Account: a.pendelton44@gmail.com
Customer Name: Arthur Pendelton
Session Timestamp: 2026-10-28 03:10:12 UTC
IP Address: 72.181.99.14 (ISP: Spectrum / Austin, Texas, USA)
Geo-IP City: Austin, TX (Matches PayPal cardholder billing postal code 78701)
Multi-Factor Authentication (MFA): Verified via SMS to registered device ending in *4412
Active SaaS Sessions: 14 hours active usage recorded between Oct 28 and Nov 01`,
      extractedData: {
        documentId: "doc_auth_103",
        documentType: "OTHER",
        extractionMethod: "DETERMINISTIC_FALLBACK",
        verificationSource: "DOCUMENT_EXTRACTED",
        isIndependentVerification: false,
        userEmail: "a.pendelton44@gmail.com",
        loginIp: "72.181.99.14",
        geoCity: "Austin",
        geoState: "TX",
        mfaVerified: true,
        serviceUsageLogged: true,
        summary: "Security audit confirms SMS MFA verification and IP matching Austin, TX."
      }
    }
  ],

  // Dispute 4: Canceled Recurring Billing ($199.00)
  disp_fp_104: [
    {
      id: "doc_sub_104",
      disputeId: "disp_fp_104",
      documentType: "OTHER",
      storageUrl: "/mock-storage/evidence/disp_fp_104/subscription_audit.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-09-22T09:00:00Z",
      content: `SUBSCRIPTION BILLING TIMELINE AUDIT
Customer: David Kim (david.kim@seoultech.kr)
Plan: Annual Cloud Workspace License ($199.00/yr)
Renewal Date: September 15, 2026
Cancellation Request Received: September 13, 2026 14:22:00 UTC (2 days prior to renewal)
Refund Audit: Merchant issued voluntary refund of $199.00 on Sept 28, 2026.`,
      extractedData: {
        documentId: "doc_sub_104",
        documentType: "OTHER",
        extractionMethod: "DETERMINISTIC_FALLBACK",
        verificationSource: "DOCUMENT_EXTRACTED",
        isIndependentVerification: false,
        customerEmail: "david.kim@seoultech.kr",
        totalAmount: 199.00,
        amount: 199.00,
        cancellationDate: "2026-09-13T14:22:00Z",
        renewalDate: "2026-09-15T00:00:00Z",
        summary: "Subscription cancellation logged prior to billing renewal; voluntary refund processed."
      }
    }
  ],

  // Dispute 5: Incorrect Amount ($54.20) — Chloe Martin
  disp_fp_105: [
    {
      id: "doc_inv_105",
      disputeId: "disp_fp_105",
      documentType: "INVOICE",
      storageUrl: "/mock-storage/evidence/disp_fp_105/checkout_receipt_105.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-11-05T09:00:00Z",
      content: `CHECKOUT RECEIPT & COUPON AUDIT
Customer: Chloe Martin (chloe.m@creatives.co.uk)
Invoice: INV-2026-9042
Transaction ID: 3QQ9482019384812E
Base Order: Digital Design Assets — $0.00
Expedited International Shipping Surcharge: $54.20
Coupon Code Applied: FALL2026 (Valid only for domestic shipments; excluded from international freight per checkout terms)
Total Charged: $54.20 USD`,
      extractedData: {
        documentId: "doc_inv_105",
        documentType: "INVOICE",
        extractionMethod: "DETERMINISTIC_FALLBACK",
        verificationSource: "DOCUMENT_EXTRACTED",
        isIndependentVerification: false,
        invoiceNumber: "INV-2026-9042",
        lineItems: [
          {
            description: "Digital Design Assets",
            quantity: 1,
            unitPrice: 0.00,
            lineTotal: 0.00
          },
          {
            description: "Expedited International Shipping Surcharge",
            quantity: 1,
            unitPrice: 54.20,
            lineTotal: 54.20
          }
        ],
        subtotal: 0.00,
        shippingHandling: 54.20,
        tax: 0.00,
        totalAmount: 54.20,
        amount: 54.20,
        currency: "USD",
        transactionId: "3QQ9482019384812E",
        customerName: "Chloe Martin",
        summary: "Invoice confirms $54.20 international freight fee authorization."
      }
    },
    {
      id: "doc_terms_105",
      disputeId: "disp_fp_105",
      documentType: "OTHER",
      storageUrl: "/mock-storage/evidence/disp_fp_105/shipping_terms_accepted.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-11-05T09:05:00Z",
      content: `SHIPPING PROMOTIONS POLICY
Accepted by customer at checkout on Oct 29, 2026.
Clause 2.1: Free shipping coupons apply strictly to mainland domestic deliveries. International orders incur standard carrier destination surcharges as displayed prior to final payment authorization.`,
      extractedData: {
        documentId: "doc_terms_105",
        documentType: "OTHER",
        extractionMethod: "DETERMINISTIC_FALLBACK",
        verificationSource: "DOCUMENT_EXTRACTED",
        isIndependentVerification: false,
        acceptedDate: "2026-10-29",
        clause: "Promotions exclude international shipments",
        summary: "Accepted shipping terms excluding international freight from coupons."
      }
    }
  ],

  // Dispute 6: Item Not Received ($680.00) — Liam O'Connor
  disp_fp_106: [
    {
      id: "doc_pod_106",
      disputeId: "disp_fp_106",
      documentType: "PROOF_OF_DELIVERY",
      carrierName: "DHL Express",
      trackingNumber: "948291048210",
      storageUrl: "/mock-storage/evidence/disp_fp_106/dhl_pod_948291048210.pdf",
      mimeType: "application/pdf",
      uploadedAt: "2026-09-14T10:00:00Z",
      content: `DHL EXPRESS ELECTRONIC PROOF OF DELIVERY
Waybill: 948291048210
Status: Delivered
Date: September 15, 2026 09:00:00 GMT
Destination: 14 Grafton Street, Dublin, Dublin D02 XY82, IE
Signed By: Concierge Desk / GPS Match
Product: Ergonomic Pneumatic Standing Desk`,
      extractedData: {
        documentId: "doc_pod_106",
        documentType: "PROOF_OF_DELIVERY",
        extractionMethod: "DETERMINISTIC_FALLBACK",
        verificationSource: "DOCUMENT_EXTRACTED",
        isIndependentVerification: false,
        carrierName: "DHL Express",
        trackingNumber: "948291048210",
        trackingFormatValid: true,
        carrierTrackingStatus: "DELIVERED",
        deliveryStatus: "Delivered",
        dates: {
          purchaseDate: "2026-09-10T11:00:00Z",
          shipmentDate: "2026-09-12T14:00:00Z",
          actualDeliveryDate: "2026-09-15T09:00:00Z"
        },
        deliveryDate: "2026-09-15T09:00:00Z",
        deliveryAddress: "14 Grafton Street",
        deliveryCity: "Dublin",
        deliveryState: "Dublin",
        deliveryPostalCode: "D02 XY82",
        recipientName: "Liam O'Connor",
        signatureObtained: true,
        summary: "DHL Express confirmed delivered to Dublin, IE with signature on Sept 15, 2026."
      }
    }
  ]
};

/**
 * Returns synthetic evidence documents for a given dispute ID
 */
function getSyntheticEvidenceForDispute(disputeId) {
  return mockEvidenceByDispute[disputeId] || [];
}

/**
 * Returns all synthetic evidence documents indexed by dispute ID
 */
function getAllSyntheticEvidence() {
  return mockEvidenceByDispute;
}

module.exports = {
  mockEvidenceByDispute,
  getSyntheticEvidenceForDispute,
  getAllSyntheticEvidence
};

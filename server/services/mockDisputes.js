/**
 * FlowPilot — Module 1: Dispute Management
 * Synthetic Sample Dataset for Development & Testing
 * 
 * NOTE: All records here are strictly synthetic sample data flagged with `source: 'demo'`.
 * They do NOT represent actual PayPal disputes, live transactions, or real customers.
 * They are provided to enable testing and UI integration without live credentials.
 */

const mockDisputes = [
  {
    id: "disp_fp_101",
    paypalDisputeId: "PP-D-94821",
    transactionId: "9TX4829104821034A",
    reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    reasonFormatted: "Item Not Received (INR)",
    amount: 249.99,
    currency: "USD",
    status: "WAITING_FOR_SELLER_RESPONSE",
    lifecycleStage: "CHARGEBACK",
    responseDeadline: "2026-11-12T23:59:59Z", // Urgent: ~3 days
    transactionDate: "2026-10-24T14:32:00Z",
    createdAt: "2026-11-02T09:14:22Z",
    updatedAt: "2026-11-04T11:00:00Z",
    source: "demo",
    customer: {
      name: "Marcus Vance",
      email: "m.vance@crestlinecorp.com",
      shippingAddress: {
        street: "742 Evergreen Terrace",
        city: "Springfield",
        state: "OR",
        postalCode: "97477",
        country: "US"
      }
    },
    disputeChannel: "INTERNAL",
    itemDetails: [
      {
        name: "Enterprise Noise-Canceling Wireless Headset",
        quantity: 1,
        unitPrice: 249.99
      }
    ],
    messages: [
      {
        postedBy: "BUYER",
        senderName: "Marcus Vance",
        content: "Tracking shows delivered at front porch, but security cameras show no delivery driver arrived that day. Need refund or replacement.",
        createdAt: "2026-11-02T09:14:22Z"
      }
    ],
    sellerActionsNeeded: [
      "Provide proof of delivery with carrier tracking number",
      "Verify online tracking shows delivery to recipient address (NEEDS_REVIEW: determine if carrier signature confirmation is required for this destination)",
      "Submit correspondence history with buyer"
    ],
    evidenceHandoff: {
      evidenceCount: 0,
      aiAnalysisStatus: "PENDING_INPUT",
      responseStatus: "NOT_STARTED"
    }
  },
  {
    id: "disp_fp_102",
    paypalDisputeId: "PP-D-83910",
    transactionId: "4AK9821401923841B",
    reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
    reasonFormatted: "Significantly Not As Described (SNAD)",
    amount: 1450.00,
    currency: "USD",
    status: "UNDER_REVIEW",
    lifecycleStage: "INQUIRY",
    responseDeadline: "2026-11-18T18:00:00Z",
    transactionDate: "2026-10-18T10:15:30Z",
    createdAt: "2026-10-29T16:45:00Z",
    updatedAt: "2026-11-06T15:20:10Z",
    source: "demo",
    customer: {
      name: "Elena Rostova",
      email: "elena.design@studioworks.io",
      shippingAddress: {
        street: "450 Sutter Street, Suite 900",
        city: "San Francisco",
        state: "CA",
        postalCode: "94108",
        country: "US"
      }
    },
    disputeChannel: "INTERNAL",
    itemDetails: [
      {
        name: "Custom 4K Video Editing Console (Aluminum Frame)",
        quantity: 1,
        unitPrice: 1450.00
      }
    ],
    messages: [
      {
        postedBy: "BUYER",
        senderName: "Elena Rostova",
        content: "The console arrived with defective rotary encoders on channel 2 and 3. The device fails hardware diagnostic tests.",
        createdAt: "2026-10-29T16:45:00Z"
      },
      {
        postedBy: "SELLER",
        senderName: "Merchant Support",
        content: "We offered a free return label and an immediate replacement unit, but buyer requested a full refund without returning the console.",
        createdAt: "2026-10-31T08:12:00Z"
      }
    ],
    sellerActionsNeeded: [
      "Review technician diagnostic spec",
      "Provide proof of return policy agreement",
      "Submit prepaid return shipping label confirmation"
    ],
    evidenceHandoff: {
      evidenceCount: 2,
      aiAnalysisStatus: "READY_FOR_REVIEW",
      responseStatus: "DRAFT_READY"
    }
  },
  {
    id: "disp_fp_103",
    paypalDisputeId: "PP-D-72849",
    transactionId: "8PL2948192840192C",
    reason: "UNAUTHORISED",
    reasonFormatted: "Unauthorized Account Activity / Fraud",
    amount: 89.00,
    currency: "USD",
    status: "WAITING_FOR_SELLER_RESPONSE",
    lifecycleStage: "CHARGEBACK",
    responseDeadline: "2026-11-11T12:00:00Z", // Very Urgent: ~1.5 days
    transactionDate: "2026-10-28T03:12:44Z",
    createdAt: "2026-11-01T11:20:00Z",
    updatedAt: "2026-11-03T09:00:00Z",
    source: "demo",
    customer: {
      name: "Arthur Pendelton",
      email: "a.pendelton44@gmail.com",
      shippingAddress: {
        street: "12 Kingfisher Lane",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "US"
      }
    },
    disputeChannel: "EXTERNAL",
    itemDetails: [
      {
        name: "SaaS Monthly Subscription — Pro Tier",
        quantity: 1,
        unitPrice: 89.00
      }
    ],
    messages: [
      {
        postedBy: "BUYER",
        senderName: "Cardholder via Bank",
        content: "Cardholder did not recognize charge from FlowPilot / Merchant. Claims account credentials compromised.",
        createdAt: "2026-11-01T11:20:00Z"
      }
    ],
    sellerActionsNeeded: [
      "Submit customer login IP log matching cardholder billing address",
      "Provide proof of active service usage and multi-factor authentication",
      "Provide terms of service acceptance timestamp"
    ],
    evidenceHandoff: {
      evidenceCount: 1,
      aiAnalysisStatus: "PENDING_INPUT",
      responseStatus: "NOT_STARTED"
    }
  },
  {
    id: "disp_fp_104",
    paypalDisputeId: "PP-D-61928",
    transactionId: "1ZZ8392019384729D",
    reason: "CANCELED_RECURRING_BILLING",
    reasonFormatted: "Subscription Canceled Prior to Charge",
    amount: 199.00,
    currency: "USD",
    status: "RESOLVED",
    lifecycleStage: "INQUIRY",
    responseDeadline: null,
    transactionDate: "2026-09-15T18:00:00Z",
    createdAt: "2026-09-20T10:11:00Z",
    updatedAt: "2026-09-28T14:30:00Z",
    source: "demo",
    customer: {
      name: "David Kim",
      email: "david.kim@seoultech.kr",
      shippingAddress: {
        street: "88 Teheran-ro, Gangnam-gu",
        city: "Seoul",
        state: "Seoul",
        postalCode: "06236",
        country: "KR"
      }
    },
    disputeChannel: "INTERNAL",
    itemDetails: [
      {
        name: "Annual Cloud Workspace License",
        quantity: 1,
        unitPrice: 199.00
      }
    ],
    messages: [
      {
        postedBy: "BUYER",
        senderName: "David Kim",
        content: "I requested cancellation 2 days before the auto-renewal date.",
        createdAt: "2026-09-20T10:11:00Z"
      },
      {
        postedBy: "PAYPAL",
        senderName: "PayPal Dispute Support",
        content: "Merchant verified cancellation timestamp and issued voluntary full refund. Dispute closed in favor of buyer.",
        createdAt: "2026-09-28T14:30:00Z"
      }
    ],
    sellerActionsNeeded: [],
    evidenceHandoff: {
      evidenceCount: 3,
      aiAnalysisStatus: "RESOLVED_ARCHIVED",
      responseStatus: "SUBMITTED"
    }
  },
  {
    id: "disp_fp_105",
    paypalDisputeId: "PP-D-50392",
    transactionId: "3QQ9482019384812E",
    reason: "INCORRECT_AMOUNT",
    reasonFormatted: "Incorrect Transaction Amount Charged",
    amount: 54.20,
    currency: "USD",
    status: "OPEN",
    lifecycleStage: "INQUIRY",
    responseDeadline: "2026-11-22T23:59:59Z",
    transactionDate: "2026-10-29T19:40:00Z",
    createdAt: "2026-11-04T08:33:10Z",
    updatedAt: "2026-11-07T12:00:00Z",
    source: "demo",
    customer: {
      name: "Chloe Martin",
      email: "chloe.m@creatives.co.uk",
      shippingAddress: {
        street: "24 Picadilly Circus",
        city: "London",
        state: "London",
        postalCode: "W1J 9HP",
        country: "GB"
      }
    },
    disputeChannel: "INTERNAL",
    itemDetails: [
      {
        name: "Expedited International Shipping Surcharge",
        quantity: 1,
        unitPrice: 54.20
      }
    ],
    messages: [
      {
        postedBy: "BUYER",
        senderName: "Chloe Martin",
        content: "Promo code 'FALL2026' was supposed to give free international shipping, but invoice shows $54.20 shipping surcharge charged.",
        createdAt: "2026-11-04T08:33:10Z"
      }
    ],
    sellerActionsNeeded: [
      "Review checkout coupon audit log",
      "Authorize partial refund or provide terms of promotion"
    ],
    evidenceHandoff: {
      evidenceCount: 1,
      aiAnalysisStatus: "PENDING_INPUT",
      responseStatus: "NOT_STARTED"
    }
  },
  {
    id: "disp_fp_106",
    paypalDisputeId: "PP-D-49102",
    transactionId: "7MM4920194820192F",
    reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
    reasonFormatted: "Item Not Received (INR)",
    amount: 680.00,
    currency: "USD",
    status: "RESOLVED",
    lifecycleStage: "CHARGEBACK",
    responseDeadline: null,
    transactionDate: "2026-09-01T12:00:00Z",
    createdAt: "2026-09-12T14:15:00Z",
    updatedAt: "2026-09-25T16:00:00Z",
    source: "demo",
    customer: {
      name: "Liam O'Connor",
      email: "liam.oconnor@dublinconsult.ie",
      shippingAddress: {
        street: "14 Grafton Street",
        city: "Dublin",
        state: "Dublin",
        postalCode: "D02 XY82",
        country: "IE"
      }
    },
    disputeChannel: "EXTERNAL",
    itemDetails: [
      {
        name: "Ergonomic Pneumatic Standing Desk",
        quantity: 1,
        unitPrice: 680.00
      }
    ],
    messages: [
      {
        postedBy: "BUYER",
        senderName: "Liam O'Connor",
        content: "Freight shipment did not arrive on scheduled Tuesday.",
        createdAt: "2026-09-12T14:15:00Z"
      },
      {
        postedBy: "SELLER",
        senderName: "Merchant Logistics",
        content: "Submitted DHL Express signature confirmation signed by concierge with GPS coordinates.",
        createdAt: "2026-09-15T09:00:00Z"
      },
      {
        postedBy: "PAYPAL",
        senderName: "PayPal Resolution Center",
        content: "Valid seller protection proof provided. Dispute resolved in favor of merchant.",
        createdAt: "2026-09-25T16:00:00Z"
      }
    ],
    sellerActionsNeeded: [],
    evidenceHandoff: {
      evidenceCount: 4,
      aiAnalysisStatus: "SUPPORTED",
      responseStatus: "ACCEPTED_BY_PAYPAL"
    }
  }
];

module.exports = {
  mockDisputes
};

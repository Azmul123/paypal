/**
 * FlowPilot API Client
 * Communicates with backend endpoints (/api/*)
 * with graceful fallback to synthetic demo data when deployed standalone (e.g. Vercel preview).
 */

import { 
  DEMO_DISPUTES, 
  DEMO_EVIDENCE, 
  DEMO_REQUIREMENTS, 
  getDemoDisputeStats, 
  getDemoAnalysis 
} from './demoData';

const BASE_URL = import.meta.env.VITE_API_URL || '';

// Client-side in-memory cache for standalone demo uploads
const clientSessionUploads = [];

function getDemoFallback(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const cleanUrl = url.split('?')[0];

  // 1. Overview stats
  if (cleanUrl === '/api/disputes/stats/overview') {
    return { success: true, stats: getDemoDisputeStats() };
  }

  // 2. Disputes listing & search
  if (cleanUrl === '/api/disputes') {
    let list = [...DEMO_DISPUTES];
    const urlObj = new URL(url, 'http://localhost');
    const search = (urlObj.searchParams.get('search') || '').toLowerCase().trim();
    const status = urlObj.searchParams.get('status');

    if (status && status !== 'ALL') {
      list = list.filter(d => d.status === status);
    }
    if (search) {
      list = list.filter(d => 
        (d.paypalDisputeId || '').toLowerCase().includes(search) ||
        (d.customer?.name || '').toLowerCase().includes(search) ||
        (d.transactionId || '').toLowerCase().includes(search)
      );
    }

    return {
      success: true,
      count: list.length,
      data: list,
      mode: 'demo',
      isStandaloneFallback: true
    };
  }

  // 3. Single dispute detail
  if (cleanUrl.startsWith('/api/disputes/')) {
    const id = decodeURIComponent(cleanUrl.replace('/api/disputes/', ''));
    const dispute = DEMO_DISPUTES.find(d => d.id === id || d.paypalDisputeId === id);
    if (dispute) {
      return { success: true, dispute, isStandaloneFallback: true };
    }
  }

  // 4. PayPal Status
  if (cleanUrl === '/api/paypal/status') {
    return {
      connected: false,
      mode: 'demo',
      environment: 'demo',
      merchantId: null,
      scope: ['disputes.read', 'disputes.write'],
      isStandaloneFallback: true
    };
  }

  // 5. Intelligence Analysis
  if (cleanUrl.startsWith('/api/intelligence/analysis/')) {
    const id = decodeURIComponent(cleanUrl.replace('/api/intelligence/analysis/', ''));
    return { success: true, disputeId: id, analysis: getDemoAnalysis(id) };
  }
  if (cleanUrl === '/api/intelligence/analyze') {
    const body = options.body ? JSON.parse(options.body) : {};
    const id = body.disputeId || 'disp_fp_101';
    return { success: true, disputeId: id, analysis: getDemoAnalysis(id) };
  }

  // 6. Evidence Docs for Dispute
  if (cleanUrl.startsWith('/api/evidence/dispute/') || cleanUrl.startsWith('/api/intelligence/evidence/')) {
    const disputeId = decodeURIComponent(cleanUrl.split('/').pop());
    const userDocs = clientSessionUploads.filter(d => d.disputeId === disputeId);
    const demoDocs = userDocs.length > 0 ? [] : (DEMO_EVIDENCE[disputeId] || DEMO_EVIDENCE.disp_fp_101 || []);
    const combined = [...userDocs, ...demoDocs];
    return { success: true, disputeId, count: combined.length, documents: combined };
  }

  // 7. Single Evidence Document
  if (cleanUrl.startsWith('/api/evidence/')) {
    const docId = decodeURIComponent(cleanUrl.replace('/api/evidence/', '').split('/')[0]);
    const found = clientSessionUploads.find(d => d.id === docId) ||
      Object.values(DEMO_EVIDENCE).flat().find(d => d.id === docId);
    if (found) {
      return { success: true, document: found };
    }
  }

  // 8. Reason Requirements
  if (cleanUrl.startsWith('/api/intelligence/requirements/')) {
    const reason = decodeURIComponent(cleanUrl.replace('/api/intelligence/requirements/', ''));
    const reqs = DEMO_REQUIREMENTS[reason] || DEMO_REQUIREMENTS.MERCHANDISE_OR_SERVICE_NOT_RECEIVED;
    return {
      success: true,
      reason,
      approvedStatuses: reqs.approvedStatuses,
      requirements: reqs.requirements
    };
  }

  return null;
}

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    if (res.ok) {
      return await res.json();
    }

    // Try demo fallback if endpoint not found on Vercel
    const fallback = getDemoFallback(url, options);
    if (fallback !== null) {
      return fallback;
    }

    const data = await res.json().catch(() => null);
    const errorMsg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  } catch (err) {
    // If network error (backend offline or static preview on Vercel), use fallback
    const fallback = getDemoFallback(url, options);
    if (fallback !== null) {
      return fallback;
    }
    console.warn(`[API Client] Network call failed on ${url}, fallback not available:`, err);
    throw err;
  }
}

export const api = {
  // Dispute statistics
  getDisputeStats: () => fetchJson('/api/disputes/stats/overview'),

  // Disputes list
  getDisputes: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.order) query.set('order', params.order);
    
    const qs = query.toString();
    return fetchJson(`/api/disputes${qs ? `?${qs}` : ''}`);
  },

  // Single dispute
  getDisputeById: (id) => fetchJson(`/api/disputes/${encodeURIComponent(id)}`),

  // Trigger sync
  syncDisputes: () => fetchJson('/api/disputes/sync', { method: 'POST' }),

  // PayPal status and credentials
  getPayPalStatus: () => fetchJson('/api/paypal/status'),
  
  testPayPalConnection: (clientId, clientSecret) =>
    fetchJson('/api/paypal/test', {
      method: 'POST',
      body: JSON.stringify({ clientId, clientSecret })
    }),

  connectPayPal: (clientId, clientSecret) =>
    fetchJson('/api/paypal/connect', {
      method: 'POST',
      body: JSON.stringify({ clientId, clientSecret })
    }),

  disconnectPayPal: () =>
    fetchJson('/api/paypal/disconnect', {
      method: 'POST'
    }),

  // Integration contracts
  getIntegrationContracts: () => fetchJson('/api/integration/contracts'),

  // Module 3: AI Evidence Intelligence
  analyzeEvidence: (disputeId, evidence = null) =>
    fetchJson('/api/intelligence/analyze', {
      method: 'POST',
      body: JSON.stringify({ disputeId, evidence })
    }),

  getEvidenceAnalysis: (disputeId) =>
    fetchJson(`/api/intelligence/analysis/${encodeURIComponent(disputeId)}`),

  getDisputeEvidenceDocs: (disputeId) =>
    fetchJson(`/api/intelligence/evidence/${encodeURIComponent(disputeId)}`),

  getReasonRequirements: (reason) =>
    fetchJson(`/api/intelligence/requirements/${encodeURIComponent(reason)}`),

  // Module 2: Evidence Management (Evidence Vault)
  uploadEvidenceDoc: async (formData) => {
    try {
      const res = await fetch(`${BASE_URL}/api/evidence/upload`, {
        method: 'POST',
        body: formData // Let browser set multipart boundary
      });

      if (res.ok) {
        return await res.json();
      }

      // If backend returned duplicate error or invalid file
      const data = await res.json().catch(() => null);
      if (res.status === 409 || res.status === 400 || res.status === 413) {
        const err = new Error(data?.error || `HTTP ${res.status}`);
        err.status = res.status;
        err.code = data?.code;
        err.existingDocumentId = data?.existingDocumentId;
        err.existingFileName = data?.existingFileName;
        throw err;
      }
      throw new Error(`Upload returned ${res.status}`);
    } catch (err) {
      if (err.status === 409 || err.status === 400 || err.status === 413) {
        throw err;
      }

      // Standalone browser demo upload fallback
      const file = formData.get('file');
      const disputeId = formData.get('disputeId') || 'disp_fp_101';
      const docId = `doc_demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const docRecord = {
        id: docId,
        disputeId,
        fileName: file?.name || 'uploaded_document.pdf',
        documentType: formData.get('documentType') || 'OTHER',
        mimeType: file?.type || 'application/pdf',
        fileSizeBytes: file?.size || 1024,
        storageUrl: file ? URL.createObjectURL(file) : '',
        uploadedAt: new Date().toISOString(),
        source: 'merchant_upload',
        provenance: {
          hasBinary: Boolean(file),
          contentExtractionMethod: 'MERCHANT_SUPPLIED',
          extractionStatus: 'SUCCESS',
          isIndependentVerification: false
        },
        carrierName: formData.get('carrierName') || undefined,
        trackingNumber: formData.get('trackingNumber') || undefined,
        merchantNotes: formData.get('merchantNotes') || undefined
      };

      clientSessionUploads.unshift(docRecord);
      return {
        success: true,
        message: 'Evidence document saved in browser session (Demo mode).',
        document: docRecord,
        isStandaloneFallback: true
      };
    }
  },

  getDisputeEvidence: (disputeId) =>
    fetchJson(`/api/evidence/dispute/${encodeURIComponent(disputeId)}`),

  getEvidenceDoc: (docId, disputeId = null) =>
    fetchJson(`/api/evidence/${encodeURIComponent(docId)}${disputeId ? `?disputeId=${encodeURIComponent(disputeId)}` : ''}`),

  updateEvidenceDoc: async (docId, updates) => {
    try {
      return await fetchJson(`/api/evidence/${encodeURIComponent(docId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (err) {
      const idx = clientSessionUploads.findIndex(d => d.id === docId);
      if (idx !== -1) {
        clientSessionUploads[idx] = { ...clientSessionUploads[idx], ...updates };
        return { success: true, document: clientSessionUploads[idx] };
      }
      throw err;
    }
  },

  deleteEvidenceDoc: async (docId, disputeId = null) => {
    try {
      return await fetchJson(`/api/evidence/${encodeURIComponent(docId)}${disputeId ? `?disputeId=${encodeURIComponent(disputeId)}` : ''}`, {
        method: 'DELETE'
      });
    } catch (err) {
      const idx = clientSessionUploads.findIndex(d => d.id === docId);
      if (idx !== -1) {
        clientSessionUploads.splice(idx, 1);
        return { success: true, documentId: docId };
      }
      throw err;
    }
  },

  getEvidenceFileUrl: (docId, disputeId = null) => {
    const sessionDoc = clientSessionUploads.find(d => d.id === docId);
    if (sessionDoc?.storageUrl) {
      return sessionDoc.storageUrl;
    }
    return `/api/evidence/${encodeURIComponent(docId)}/file${disputeId ? `?disputeId=${encodeURIComponent(disputeId)}` : ''}`;
  }
};

/**
 * FlowPilot API Client
 * Communicates with backend endpoints (/api/*)
 */

const BASE_URL = '';

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.details = data?.details;
      throw err;
    }

    return data;
  } catch (err) {
    console.error(`[API Client] Error on ${url}:`, err);
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
        body: formData // Let browser set multipart boundary header
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errorMsg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`;
        const err = new Error(errorMsg);
        err.status = res.status;
        err.code = data?.code;
        err.existingDocumentId = data?.existingDocumentId;
        err.existingFileName = data?.existingFileName;
        throw err;
      }
      return data;
    } catch (err) {
      console.error('[API Client] Error uploading evidence:', err);
      throw err;
    }
  },

  getDisputeEvidence: (disputeId) =>
    fetchJson(`/api/evidence/dispute/${encodeURIComponent(disputeId)}`),

  getEvidenceDoc: (docId, disputeId = null) =>
    fetchJson(`/api/evidence/${encodeURIComponent(docId)}${disputeId ? `?disputeId=${encodeURIComponent(disputeId)}` : ''}`),

  updateEvidenceDoc: (docId, updates) =>
    fetchJson(`/api/evidence/${encodeURIComponent(docId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),

  deleteEvidenceDoc: (docId, disputeId = null) =>
    fetchJson(`/api/evidence/${encodeURIComponent(docId)}${disputeId ? `?disputeId=${encodeURIComponent(disputeId)}` : ''}`, {
      method: 'DELETE'
    }),

  getEvidenceFileUrl: (docId, disputeId = null) =>
    `/api/evidence/${encodeURIComponent(docId)}/file${disputeId ? `?disputeId=${encodeURIComponent(disputeId)}` : ''}`
};

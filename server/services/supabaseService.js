/**
 * FlowPilot — Module 1: Dispute Management
 * Supabase PostgreSQL Integration Service
 * 
 * Supports:
 * - Direct connection to Supabase PostgreSQL using @supabase/supabase-js
 * - Upserting disputes retrieved from PayPal Sandbox or Demo
 * - Querying disputes with filters, search, and ordering
 * - Graceful fallback to memory store if Supabase credentials are not yet configured
 */

const { createClient } = require('@supabase/supabase-js');
const { mockDisputes } = require('./mockDisputes');

class SupabaseService {
  constructor() {
    this.client = null;
    this.memoryStore = [...mockDisputes];
    this.initClient();
  }

  initClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (url && key && url.startsWith('http')) {
      try {
        this.client = createClient(url, key, {
          auth: { persistSession: false }
        });
        console.log('[Supabase] Initialized Supabase client with URL:', url);
      } catch (err) {
        console.warn('[Supabase] Failed to initialize Supabase client:', err.message);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    return Boolean(this.client);
  }

  async testConnection() {
    if (!this.client) {
      return {
        configured: false,
        connected: false,
        message: 'Supabase credentials are not configured in environment variables. Using in-memory demo data store.',
        provider: 'in_memory'
      };
    }

    try {
      const { data, error } = await this.client.from('disputes').select('count', { count: 'exact', head: true });
      if (error) {
        return {
          configured: true,
          connected: false,
          error: error.message,
          message: 'Connected to Supabase project, but could not query "disputes" table. Did you run server/db/schema.sql?',
          provider: 'supabase'
        };
      }
      return {
        configured: true,
        connected: true,
        message: 'Successfully connected to Supabase PostgreSQL database.',
        provider: 'supabase'
      };
    } catch (err) {
      return {
        configured: true,
        connected: false,
        error: err.message,
        provider: 'supabase'
      };
    }
  }

  /**
   * Retrieves all disputes with optional search, status filtering, and sorting
   */
  async getDisputes(filters = {}) {
    if (this.client) {
      try {
        let query = this.client.from('disputes').select('*');

        if (filters.status && filters.status !== 'ALL') {
          query = query.eq('status', filters.status);
        }

        if (filters.search) {
          const s = `%${filters.search}%`;
          query = query.or(`paypal_dispute_id.ilike.${s},transaction_id.ilike.${s},reason.ilike.${s},customer_name.ilike.${s}`);
        }

        if (filters.sortBy === 'deadline') {
          query = query.order('response_deadline', { ascending: true, nullsFirst: false });
        } else if (filters.sortBy === 'amount') {
          query = query.order('amount', { ascending: filters.order === 'asc' });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map(this.mapFromDbRecord);
        }
      } catch (err) {
        console.warn('[Supabase] Error querying database, falling back to memory store:', err.message);
      }
    }

    // Fallback in-memory query
    return this.queryMemoryStore(filters);
  }

  queryMemoryStore(filters = {}) {
    let list = [...this.memoryStore];

    if (filters.status && filters.status !== 'ALL') {
      list = list.filter((d) => d.status === filters.status);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((d) =>
        (d.id && d.id.toLowerCase().includes(q)) ||
        (d.paypalDisputeId && d.paypalDisputeId.toLowerCase().includes(q)) ||
        (d.transactionId && d.transactionId.toLowerCase().includes(q)) ||
        (d.reason && d.reason.toLowerCase().includes(q)) ||
        (d.reasonFormatted && d.reasonFormatted.toLowerCase().includes(q)) ||
        (d.customer?.name && d.customer.name.toLowerCase().includes(q)) ||
        (d.customer?.email && d.customer.email.toLowerCase().includes(q)) ||
        (Array.isArray(d.itemDetails) && d.itemDetails.some((i) => i.name && i.name.toLowerCase().includes(q))) ||
        (Array.isArray(d.messages) && d.messages.some((m) => m.content && m.content.toLowerCase().includes(q)))
      );
    }

    if (filters.sortBy === 'deadline') {
      list.sort((a, b) => {
        if (!a.responseDeadline) return 1;
        if (!b.responseDeadline) return -1;
        return new Date(a.responseDeadline) - new Date(b.responseDeadline);
      });
    } else if (filters.sortBy === 'amount') {
      list.sort((a, b) => (filters.order === 'asc' ? a.amount - b.amount : b.amount - a.amount));
    } else {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  }

  /**
   * Retrieves single dispute by ID or PayPal Dispute ID
   */
  async getDisputeById(id) {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('disputes')
          .select('*')
          .or(`id.eq.${id},paypal_dispute_id.eq.${id}`)
          .single();

        if (!error && data) {
          return this.mapFromDbRecord(data);
        }
      } catch (err) {
        console.warn('[Supabase] Error getting dispute by ID:', err.message);
      }
    }

    // Fallback in-memory
    return this.memoryStore.find((d) => d.id === id || d.paypalDisputeId === id) || null;
  }

  /**
   * Upsert disputes into Supabase or memory store
   */
  async upsertDisputes(disputesList) {
    if (!Array.isArray(disputesList) || disputesList.length === 0) return [];

    // Always update memory store
    for (const d of disputesList) {
      const idx = this.memoryStore.findIndex((m) => m.paypalDisputeId === d.paypalDisputeId || m.id === d.id);
      if (idx >= 0) {
        this.memoryStore[idx] = { ...this.memoryStore[idx], ...d };
      } else {
        this.memoryStore.unshift(d);
      }
    }

    if (this.client) {
      try {
        const dbRecords = disputesList.map(this.mapToDbRecord);
        const { data, error } = await this.client
          .from('disputes')
          .upsert(dbRecords, { onConflict: 'paypal_dispute_id' })
          .select();

        if (error) {
          console.warn('[Supabase] Upsert error:', error.message);
        } else {
          return (data || []).map(this.mapFromDbRecord);
        }
      } catch (err) {
        console.warn('[Supabase] Upsert exception:', err.message);
      }
    }

    return disputesList;
  }

  /**
   * Resets memory store to original mock seed
   */
  resetToMockSeed() {
    this.memoryStore = [...mockDisputes];
    return this.memoryStore;
  }

  mapFromDbRecord(row) {
    return {
      id: row.id,
      paypalDisputeId: row.paypal_dispute_id,
      transactionId: row.transaction_id,
      reason: row.reason,
      reasonFormatted: row.reason?.replace(/_/g, ' ') || 'Dispute',
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      lifecycleStage: row.lifecycle_stage,
      responseDeadline: row.response_deadline,
      transactionDate: row.transaction_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      source: row.source,
      customer: {
        name: row.customer_name || 'Customer',
        email: row.customer_email || 'N/A'
      },
      disputeChannel: row.dispute_channel,
      messages: row.messages || [],
      rawPayload: row.raw_payload || {},
      sellerActionsNeeded: [],
      evidenceHandoff: {
        evidenceCount: 0,
        aiAnalysisStatus: 'PENDING_INPUT',
        responseStatus: 'NOT_STARTED'
      }
    };
  }

  mapToDbRecord(d) {
    return {
      id: d.id,
      paypal_dispute_id: d.paypalDisputeId,
      transaction_id: d.transactionId,
      reason: d.reason,
      amount: d.amount,
      currency: d.currency,
      status: d.status,
      lifecycle_stage: d.lifecycleStage,
      response_deadline: d.responseDeadline,
      transaction_date: d.transactionDate,
      customer_name: d.customer?.name,
      customer_email: d.customer?.email,
      dispute_channel: d.disputeChannel || 'INTERNAL',
      source: d.source || 'demo',
      messages: d.messages || [],
      raw_payload: d.rawPayload || {}
    };
  }
}

module.exports = new SupabaseService();

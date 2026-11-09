import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Layers, 
  Cpu, 
  Send, 
  Database, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { api } from '../api/client';

export default function IntegrationDocsPage() {
  const [contracts, setContracts] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    api.getIntegrationContracts()
      .then((res) => setContracts(res))
      .catch((err) => console.error('Failed to load contracts:', err));
  }, []);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sampleSchemaJson = JSON.stringify(
    {
      id: "disp_fp_101",
      paypalDisputeId: "PP-D-94821",
      transactionId: "9TX4829104821034A",
      reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
      amount: 249.99,
      currency: "USD",
      status: "WAITING_FOR_SELLER_RESPONSE",
      lifecycleStage: "CHARGEBACK",
      responseDeadline: "2026-11-12T23:59:59Z",
      createdAt: "2026-11-02T09:14:22Z",
      source: "demo",
      customer: {
        name: "Marcus Vance",
        email: "m.vance@crestlinecorp.com"
      },
      messages: [
        {
          postedBy: "BUYER",
          content: "Tracking shows delivered but package was not found.",
          createdAt: "2026-11-02T09:14:22Z"
        }
      ],
      evidenceHandoff: {
        evidenceCount: 0,
        aiAnalysisStatus: "PENDING_INPUT",
        responseStatus: "NOT_STARTED"
      }
    },
    null,
    2
  );

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
          <span>FlowPilot Master Specification</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Module Integration Contracts & Data Schema
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Standardized contracts and consumption interfaces for Module 2 (Evidence Management), Module 3 (AI Intelligence), and Module 4 (Dispute Response).
        </p>
      </div>

      {/* Module Responsibilities Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Module 2 Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                Module 2
              </span>
              <span className="text-xs text-slate-400 font-medium">Evidence Team</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Evidence Management</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Consumes dispute IDs from Module 1. Collects shipping tracking numbers, carrier proof of delivery, order invoices, and chat logs.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Endpoints to call:</span>
            <code className="text-[11px] text-blue-600 font-mono block">GET /api/disputes/:id</code>
          </div>
        </div>

        {/* Module 3 Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                Module 3
              </span>
              <span className="text-xs text-slate-400 font-medium">AI Intelligence Team</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">AI Evidence Intelligence</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Analyzes dispute reason and evidence documents. Computes merchant win-probability score, highlights evidence gaps, and recommends defense strategies.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Contract:</span>
            <code className="text-[11px] text-purple-600 font-mono block">FlowPilotDisputeSchema + Evidence[]</code>
          </div>
        </div>

        {/* Module 4 Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                Module 4
              </span>
              <span className="text-xs text-slate-400 font-medium">Resolution Team</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Response & Resolution</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Prepares structured merchant response package. Formats defense narrative and executes official PayPal API response submission.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Authentication:</span>
            <code className="text-[11px] text-emerald-600 font-mono block">Use paypalService.getAccessToken()</code>
          </div>
        </div>
      </div>

      {/* Shared Dispute Data Model */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Shared Standard Dispute JSON Contract
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Every dispute returned by Module 1 conforms to this standardized payload:
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(sampleSchemaJson, 'schema')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {copiedKey === 'schema' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'schema' ? 'Copied' : 'Copy JSON Schema'}</span>
          </button>
        </div>

        <div className="bg-slate-950 text-slate-300 font-mono text-[11px] rounded-xl p-4 overflow-x-auto max-h-96">
          <pre>{sampleSchemaJson}</pre>
        </div>
      </div>

      {/* Supabase Schema Reference */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Supabase PostgreSQL Integration
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The PostgreSQL schema is located in <code className="bg-slate-100 font-mono text-slate-800 px-1 py-0.5 rounded">server/db/schema.sql</code>. It includes indexes on dispute IDs, response deadlines, and status, with dedicated foreign key placeholders for evidence documents and AI intelligence outputs.
        </p>
      </div>
    </div>
  );
}

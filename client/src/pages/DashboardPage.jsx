import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ShieldAlert, 
  ArrowRight, 
  Key, 
  ExternalLink,
  Layers,
  Cpu,
  Send,
  Sparkles
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { StatusBadge, SourceBadge, DeadlineBadge } from '../components/StatusBadge';

export default function DashboardPage({ stats, recentActivity, onSelectDispute, onNavigate, payPalStatus }) {
  const isSandbox = payPalStatus?.connected;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome & Context Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Dispute Evidence Copilot — Module 1 Active</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome to FlowPilot
          </h2>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Turn scattered payment records into structured, verifiable evidence. Monitor open claims, track response deadlines, and connect your PayPal Sandbox account for automated evidence preparation.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('disputes')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm"
            >
              <span>Manage All Disputes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('paypal-connection')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              <Key className="w-3.5 h-3.5 text-blue-400" />
              <span>{isSandbox ? 'PayPal Sandbox Settings' : 'Connect PayPal Sandbox'}</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-600/10 blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Disputes"
          value={stats?.totalDisputes ?? 0}
          subtitle="All recorded claims"
          icon={AlertTriangle}
          badgeText={isSandbox ? 'Sandbox Live' : 'Demo Dataset'}
          badgeColor="blue"
        />

        <StatCard
          title="Open Disputes"
          value={stats?.openDisputes ?? 0}
          subtitle="Awaiting resolution or action"
          icon={Clock}
          badgeText="Active"
          badgeColor="amber"
        />

        <StatCard
          title="Attention Required"
          value={stats?.attentionRequired ?? 0}
          subtitle="Seller response or urgent deadline"
          icon={ShieldAlert}
          badgeText="Urgent Action"
          badgeColor="rose"
        />

        <StatCard
          title="Resolved Disputes"
          value={stats?.resolvedDisputes ?? 0}
          subtitle="Closed claims"
          icon={CheckCircle2}
          badgeText="Settled"
          badgeColor="emerald"
        />
      </div>

      {/* Secondary Disputed Amount Metric */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disputed Volume At Risk</span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">
              ${(stats?.totalDisputedAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {stats?.currency || 'USD'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Across {stats?.openDisputes ?? 0} active claims requiring merchant evidence.
          </span>
          <button
            onClick={() => onNavigate('disputes')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            Review Claims
          </button>
        </div>
      </div>

      {/* Recent Dispute Activity Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Dispute Activity</h3>
            <p className="text-xs text-slate-500">Latest PayPal disputes requiring review or evidence submission</p>
          </div>

          <button
            onClick={() => onNavigate('disputes')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All ({stats?.totalDisputes ?? 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Dispute ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => onSelectDispute(d)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 font-mono">
                      {d.paypalDisputeId}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      {d.customer?.name || 'Customer'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-[200px]">
                      {d.reasonFormatted || d.reason}
                    </td>
                    <td className="py-3.5 px-4 font-semibold font-mono text-slate-900">
                      ${d.amount.toFixed(2)} {d.currency}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <DeadlineBadge deadline={d.responseDeadline} />
                    </td>
                    <td className="py-3.5 px-4">
                      <SourceBadge source={d.source} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDispute(d);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No recent disputes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Architecture Overview for Team Collaboration */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
          FlowPilot 4-Module Product Pipeline
        </h4>
        <p className="text-xs text-slate-600 mb-5 leading-relaxed">
          FlowPilot connects 4 specialized modules to automate the entire dispute defense cycle. Module 1 serves as the foundational ingestion and dispute management hub.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-white p-4 rounded-lg border-2 border-blue-500 shadow-2xs">
            <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">
              Active • Module 1
            </span>
            <h5 className="font-bold text-slate-900 mt-2">Dispute Management</h5>
            <p className="text-slate-500 text-[11px] mt-1">
              PayPal REST API ingestion, live webhook listener, dashboard, dispute lifecycle tracking.
            </p>
          </div>

          <div className="bg-white/80 p-4 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
              Handoff • Module 2
            </span>
            <h5 className="font-bold text-slate-800 mt-2">Evidence Management</h5>
            <p className="text-slate-500 text-[11px] mt-1">
              Carrier tracking extraction, delivery confirmation, customer chat archives, invoice OCR.
            </p>
          </div>

          <div className="bg-white/80 p-4 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
              Handoff • Module 3
            </span>
            <h5 className="font-bold text-slate-800 mt-2">AI Evidence Intelligence</h5>
            <p className="text-slate-500 text-[11px] mt-1">
              Requirement-to-evidence mapping, contradiction detection, missing evidence identification, and source auditing.
            </p>
          </div>

          <div className="bg-white/80 p-4 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
              Handoff • Module 4
            </span>
            <h5 className="font-bold text-slate-800 mt-2">Response Resolution</h5>
            <p className="text-slate-500 text-[11px] mt-1">
              Evidence package generation, cover letter drafting, automated submission to PayPal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

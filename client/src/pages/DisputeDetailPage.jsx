import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  DollarSign, 
  Calendar, 
  User, 
  MapPin, 
  Mail, 
  FileText, 
  ShieldCheck, 
  AlertCircle, 
  MessageSquare, 
  CheckCircle2, 
  Code, 
  ChevronDown, 
  ChevronUp,
  Layers,
  Cpu,
  Send,
  ExternalLink
} from 'lucide-react';
import { StatusBadge, SourceBadge, DeadlineBadge } from '../components/StatusBadge';
import ModuleHandoffCard from '../components/ModuleHandoffCard';

export default function DisputeDetailPage({ dispute, onBack, onNavigateToPayPal }) {
  const [showRawPayload, setShowRawPayload] = useState(false);

  if (!dispute) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-20">
        <h3 className="text-base font-bold text-slate-900">No Dispute Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Please select a dispute from the registry to inspect details.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          Return to Disputes
        </button>
      </div>
    );
  }

  const isUrgent = dispute.status === 'WAITING_FOR_SELLER_RESPONSE';

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Disputes Registry</span>
        </button>

        <div className="flex items-center gap-2">
          <SourceBadge source={dispute.source} />
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
                {dispute.paypalDisputeId}
              </h2>
              <StatusBadge status={dispute.status} />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Stage: {dispute.lifecycleStage || 'INQUIRY'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              FlowPilot Internal ID: {dispute.id}
            </p>
          </div>

          {/* Amount Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Disputed Amount
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              ${dispute.amount.toFixed(2)} <span className="text-sm font-normal text-slate-500">{dispute.currency}</span>
            </div>
          </div>
        </div>

        {/* Deadline Warning Banner if Urgent */}
        {isUrgent && dispute.responseDeadline && (
          <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Merchant Action Required — Response Deadline Approaching
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                PayPal requires evidence submission before{' '}
                <strong>{new Date(dispute.responseDeadline).toLocaleString()}</strong>.
                Failure to respond will cause PayPal to automatically settle this claim in favor of the buyer.
              </p>
            </div>
          </div>
        )}

        {/* Meta Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              PayPal Transaction ID
            </span>
            <span className="font-mono font-semibold text-slate-800 break-all">
              {dispute.transactionId || 'N/A'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Dispute Reason
            </span>
            <span className="font-semibold text-slate-800">
              {dispute.reasonFormatted || dispute.reason}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Transaction Date
            </span>
            <span className="font-medium text-slate-700">
              {dispute.transactionDate ? new Date(dispute.transactionDate).toLocaleDateString() : 'Unavailable'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Dispute Channel
            </span>
            <span className="font-medium text-slate-700">
              {dispute.disputeChannel || 'INTERNAL'}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Customer Details & Claim Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Transaction Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Customer Information
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Name</span>
                <span className="font-semibold text-slate-800">{dispute.customer?.name || 'Customer Name Unavailable'}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Email</span>
                <span className="text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {dispute.customer?.email || 'N/A'}
                </span>
              </div>

              {dispute.customer?.shippingAddress && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Shipping Destination</span>
                  <div className="text-slate-600 flex items-start gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>
                      {dispute.customer.shippingAddress.street}, {dispute.customer.shippingAddress.city}, {dispute.customer.shippingAddress.state} {dispute.customer.shippingAddress.postalCode}, {dispute.customer.shippingAddress.country}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Checklist for Reason */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Required Evidence Checklist
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              PayPal requires these items for this dispute category:
            </p>

            <ul className="space-y-2 text-xs">
              {dispute.sellerActionsNeeded && dispute.sellerActionsNeeded.length > 0 ? (
                dispute.sellerActionsNeeded.map((act, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                    <span>{act}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-400 italic">No further merchant actions pending for this dispute.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Right Column: Dispute Communications Thread */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Dispute History & Messages
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {dispute.messages?.length || 0} communications recorded
              </span>
            </div>

            <div className="space-y-3">
              {dispute.messages && dispute.messages.length > 0 ? (
                dispute.messages.map((msg, idx) => {
                  const isBuyer = msg.postedBy === 'BUYER';
                  const isSeller = msg.postedBy === 'SELLER';

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs ${
                        isBuyer
                          ? 'bg-rose-50/50 border-rose-100'
                          : isSeller
                          ? 'bg-blue-50/50 border-blue-100'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900">
                          {msg.senderName || msg.postedBy}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{msg.content}</p>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                  No communication messages found on this PayPal dispute record.
                </div>
              )}
            </div>
          </div>

          {/* Raw PayPal Payload Viewer (Collapsible) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              onClick={() => setShowRawPayload(!showRawPayload)}
              className="w-full px-5 py-3.5 bg-slate-50/60 hover:bg-slate-100/60 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Code className="w-4 h-4 text-slate-500" />
                <span>Raw PayPal REST API Payload Inspector</span>
              </span>
              {showRawPayload ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRawPayload && (
              <div className="p-4 bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-72">
                <pre>{JSON.stringify(dispute.rawPayload || dispute, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module 2, 3, 4 Integration Placeholders */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Downstream FlowPilot Modules Integration
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            These placeholders establish the exact contract handoff points for Module 2, Module 3, and Module 4.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <ModuleHandoffCard
            moduleNumber={2}
            title="Evidence Management"
            responsibleMember="Team Member 2"
            description="Responsible for ingesting shipping carriers, signature proofs, and invoice attachments for this dispute."
            inputContract={`disputeId: "${dispute.id}", paypalDisputeId: "${dispute.paypalDisputeId}"`}
            outputContract="evidenceDocuments: Array<{ id, type, url }>"
            statusText="Awaiting Module 2"
          />

          <ModuleHandoffCard
            moduleNumber={3}
            title="AI Evidence Intelligence"
            responsibleMember="Team Member 3"
            description="Analyze dispute requirements and merchant-provided evidence, map evidence to applicable requirements, detect missing or contradictory information, and identify unsupported claims with source references."
            inputContract={`dispute: FlowPilotDisputeSchema, evidence: Array<Doc>`}
            outputContract="{ evidenceMatrix, missingEvidence, contradictions, sourceReferences, unsupportedClaims, recommendedActions }"
            statusText="Awaiting Module 3"
          />

          <ModuleHandoffCard
            moduleNumber={4}
            title="Dispute Response & Resolution"
            responsibleMember="Team Member 4"
            description="Responsible for compiling the evidence bundle and executing the official PayPal response submission API."
            inputContract={`disputeId: "${dispute.id}", package: FinalEvidenceBundle`}
            outputContract="{ submissionStatus: 'SUBMITTED', ackId: string }"
            statusText="Awaiting Module 4"
          />
        </div>
      </div>
    </div>
  );
}

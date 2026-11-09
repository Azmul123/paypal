import React from 'react';
import { AlertCircle, Clock, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';

export function StatusBadge({ status }) {
  const normalized = (status || 'OPEN').toUpperCase();

  switch (normalized) {
    case 'WAITING_FOR_SELLER_RESPONSE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Action Required</span>
        </span>
      );
    case 'WAITING_FOR_BUYER_RESPONSE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          <span>Buyer Response Pending</span>
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
          <span>Under PayPal Review</span>
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Resolved</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <XCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>Cancelled</span>
        </span>
      );
    case 'OPEN':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>Open</span>
        </span>
      );
  }
}

export function SourceBadge({ source }) {
  if (source === 'paypal_sandbox') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Sandbox
      </span>
    );
  }

  if (source === 'paypal_live') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
        Live
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200" title="This is realistic sample data. Connect PayPal Sandbox to load live disputes.">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
      Demo
    </span>
  );
}

export function DeadlineBadge({ deadline }) {
  if (!deadline) {
    return <span className="text-xs text-slate-400">None</span>;
  }

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
        <Clock className="w-3 h-3" /> Overdue
      </span>
    );
  }

  if (diffDays <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 animate-pulse">
        <Clock className="w-3 h-3" /> {diffDays} {diffDays === 1 ? 'day' : 'days'} left
      </span>
    );
  }

  if (diffDays <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
        <Clock className="w-3 h-3" /> {diffDays} days left
      </span>
    );
  }

  return (
    <span className="text-xs text-slate-600">
      {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
    </span>
  );
}

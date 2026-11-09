import React from 'react';
import { RefreshCw, Database, Menu } from 'lucide-react';

export default function Header({ title, subtitle, onSync, isSyncing, payPalStatus, onToggleMobileMenu }) {
  const isSandbox = payPalStatus?.connected;

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 shadow-xs">
      <div className="flex items-start gap-3">
        {/* Mobile menu toggle button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden mt-0.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
            {isSandbox ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                PayPal Sandbox Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" title="Running in synthetic demo mode with sample records.">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Demo Mode Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            {subtitle || "Turn scattered payment records into structured, verifiable dispute evidence."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end md:self-auto">
        {/* Supabase Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span>PostgreSQL: {payPalStatus?.environment?.supabaseConnected ? 'Supabase Cloud' : 'In-Memory Store'}</span>
        </div>

        {/* Sync Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all disabled:opacity-60"
          title="Sync disputes from PayPal or refresh demo state"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Disputes'}</span>
        </button>
      </div>
    </header>
  );
}

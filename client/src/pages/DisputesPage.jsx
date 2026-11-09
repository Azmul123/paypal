import React from 'react';
import DisputeTable from '../components/DisputeTable';
import { AlertCircle, RefreshCw, Filter, Layers } from 'lucide-react';

export default function DisputesPage({
  disputes,
  isLoading,
  error,
  onSelectDispute,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onResetFilters,
  onSync,
  isSyncing,
  payPalStatus
}) {
  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Disputes & Claims Registry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time feed of PayPal disputes across inquiry, chargeback, and arbitration lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync with PayPal'}</span>
          </button>
        </div>
      </div>

      {/* Main Dispute Table with Controls */}
      <DisputeTable
        disputes={disputes}
        isLoading={isLoading}
        error={error}
        onSelectDispute={onSelectDispute}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onResetFilters={onResetFilters}
      />
    </div>
  );
}

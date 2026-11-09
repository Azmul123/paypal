import React from 'react';
import { 
  ArrowUpDown, 
  ExternalLink, 
  Search, 
  Calendar, 
  User, 
  AlertCircle,
  FileQuestion,
  ChevronRight
} from 'lucide-react';
import { StatusBadge, SourceBadge, DeadlineBadge } from './StatusBadge';

export default function DisputeTable({ 
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
  onResetFilters
}) {
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const statusOptions = [
    { label: 'All Disputes', value: 'ALL' },
    { label: 'Action Required', value: 'WAITING_FOR_SELLER_RESPONSE' },
    { label: 'Under Review', value: 'UNDER_REVIEW' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Resolved', value: 'RESOLVED' }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
      {/* Table Toolbar / Controls */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Dispute ID, Transaction ID, Buyer or Reason..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Dispute & Claim ID</th>
              <th className="py-3 px-4">Customer Details</th>
              <th className="py-3 px-4">Dispute Reason</th>
              <th 
                className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                onClick={() => toggleSort('amount')}
              >
                <div className="flex items-center gap-1">
                  <span>Amount</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Status</th>
              <th 
                className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                onClick={() => toggleSort('deadline')}
              >
                <div className="flex items-center gap-1">
                  <span>Response Deadline</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isLoading ? (
              // Loading Skeleton State
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-medium text-slate-500">Loading dispute records...</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              // Error State
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800">Failed to Load Disputes</h4>
                    <p className="text-xs text-slate-500">{error}</p>
                    <button
                      onClick={onResetFilters}
                      className="mt-2 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                    >
                      Reset filters & retry
                    </button>
                  </div>
                </td>
              </tr>
            ) : disputes.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={8} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                      <FileQuestion className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800">No Disputes Found</h4>
                    <p className="text-xs text-slate-500">
                      No records matched your search query or filter selection.
                    </p>
                    {(searchTerm || statusFilter !== 'ALL') && (
                      <button
                        onClick={onResetFilters}
                        className="mt-2 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Render Table Rows
              disputes.map((dispute) => (
                <tr
                  key={dispute.id}
                  onClick={() => onSelectDispute(dispute)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  {/* Dispute ID & Transaction */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {dispute.paypalDisputeId}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[130px]">
                      {dispute.transactionId}
                    </div>
                  </td>

                  {/* Customer Information */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">
                      {dispute.customer?.name || 'Customer'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                      {dispute.customer?.email || 'No email provided'}
                    </div>
                  </td>

                  {/* Dispute Reason */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-700">
                      {dispute.reasonFormatted || dispute.reason}
                    </div>
                    <div className="text-[11px] text-slate-400 capitalize">
                      Stage: {dispute.lifecycleStage?.toLowerCase() || 'inquiry'}
                    </div>
                  </td>

                  {/* Transaction Amount */}
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 font-mono">
                      ${dispute.amount.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1">
                      {dispute.currency}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    <StatusBadge status={dispute.status} />
                  </td>

                  {/* Response Deadline */}
                  <td className="py-3.5 px-4">
                    <DeadlineBadge deadline={dispute.responseDeadline} />
                  </td>

                  {/* Data Source Badge */}
                  <td className="py-3.5 px-4">
                    <SourceBadge source={dispute.source} />
                  </td>

                  {/* View Details Link */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDispute(dispute);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/60 hover:bg-blue-100/60 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {!isLoading && !error && disputes.length > 0 && (
        <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing <strong>{disputes.length}</strong> dispute records</span>
          <span className="text-[11px]">Click any row to open dispute evidence details</span>
        </div>
      )}
    </div>
  );
}

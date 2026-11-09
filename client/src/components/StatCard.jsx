import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, badgeText, badgeColor = 'blue' }) {
  const badgeClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200'
  }[badgeColor] || 'bg-blue-50 text-blue-700 border-blue-200';

  const iconClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600'
  }[badgeColor] || 'bg-blue-50 text-blue-600';

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconClasses}`}>
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-normal truncate">{subtitle}</span>
        {badgeText && (
          <span className={`px-2 py-0.5 rounded-full font-medium border text-[11px] ${badgeClasses}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
}

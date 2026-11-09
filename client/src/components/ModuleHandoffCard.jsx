import React from 'react';
import { 
  FileText, 
  Cpu, 
  Send, 
  ArrowRight, 
  Lock, 
  Info,
  Layers
} from 'lucide-react';

export default function ModuleHandoffCard({ moduleNumber, title, description, responsibleMember, inputContract, outputContract, statusText }) {
  const icons = {
    2: Layers,
    3: Cpu,
    4: Send
  };

  const Icon = icons[moduleNumber] || FileText;

  return (
    <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-xl p-5 relative overflow-hidden transition-all hover:bg-slate-50 hover:border-slate-400">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center">
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                Module {moduleNumber} Handoff
              </span>
              <span className="text-xs text-slate-500 font-medium">Owner: {responsibleMember}</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-0.5">{title}</h4>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs">
          <Lock className="w-3 h-3 text-slate-400" />
          {statusText || 'Pending Integration'}
        </span>
      </div>

      <p className="text-xs text-slate-600 mt-3 leading-relaxed">
        {description}
      </p>

      {/* Contract Interface Spec */}
      <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Input Provided by Module 1:
          </span>
          <code className="text-[11px] text-blue-600 font-mono block break-all">
            {inputContract}
          </code>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Expected Return by Module {moduleNumber}:
          </span>
          <code className="text-[11px] text-emerald-600 font-mono block break-all">
            {outputContract}
          </code>
        </div>
      </div>
    </div>
  );
}

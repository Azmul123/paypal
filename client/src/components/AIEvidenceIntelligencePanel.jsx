import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle, 
  FileText, 
  RefreshCw, 
  ArrowRight,
  ShieldAlert,
  Layers,
  FileCheck,
  Check,
  XCircle,
  Clock
} from 'lucide-react';
import { api } from '../api/client';

export default function AIEvidenceIntelligencePanel({ dispute }) {
  const [analysis, setAnalysis] = useState(null);
  const [evidenceDocs, setEvidenceDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    if (dispute?.id) {
      // Load evidence documents associated with dispute
      api.getDisputeEvidenceDocs(dispute.id)
        .then((res) => setEvidenceDocs(res.documents || []))
        .catch(() => setEvidenceDocs([]));

      // Check if existing analysis is cached
      api.getEvidenceAnalysis(dispute.id)
        .then((res) => {
          if (res.analysis) {
            setAnalysis(res.analysis);
            setHasRun(true);
          }
        })
        .catch(() => {
          setAnalysis(null);
          setHasRun(false);
        });
    }
  }, [dispute?.id]);

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.analyzeEvidence(dispute.id);
      setAnalysis(res.analysis);
      setHasRun(true);
    } catch (err) {
      setError(err.message || 'AI Evidence Intelligence analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>SUPPORTED</span>
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>MISSING</span>
          </span>
        );
      case 'CONTRADICTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>CONTRADICTED</span>
          </span>
        );
      case 'NEEDS_REVIEW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
            <span>NEEDS_REVIEW</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Panel Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-50/40 via-white to-blue-50/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              Active Module 3
            </span>
            <span className="text-xs text-slate-500 font-medium">AI Evidence Intelligence Engine</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Evidence Verification & Requirement Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-references documents against PayPal dispute requirements and detects contradictions with source tracking.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-xs transition-all disabled:opacity-60 flex-shrink-0"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing Documents...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{hasRun ? 'Re-run AI Analysis' : 'Run AI Evidence Analysis'}</span>
            </>
          )}
        </button>
      </div>

      {/* Available Evidence Documents Bar */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Associated Evidence Documents ({evidenceDocs.length}):</span>
          {evidenceDocs.map((doc) => (
            <span 
              key={doc.id}
              className="font-mono text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700"
              title={`${doc.documentType} - ${doc.id}`}
            >
              {doc.id} ({doc.documentType})
            </span>
          ))}
        </div>

        <span className="text-[11px] text-slate-400 italic">
          Input source: Module 2 Evidence Vault
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 mx-6 mt-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Panel Body */}
      <div className="p-6 space-y-6">
        {!hasRun && !isLoading ? (
          /* Empty / Initial State */
          <div className="py-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Cpu className="w-6 h-6 stroke-[2]" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Ready to Analyze Evidence</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click <strong>Run AI Evidence Analysis</strong> above. FlowPilot will extract facts from {evidenceDocs.length} associated documents, cross-validate shipping and invoice details, and map findings to applicable PayPal dispute rules.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              FlowPilot evaluates evidence strictly into <strong>SUPPORTED</strong>, <strong>MISSING</strong>, <strong>CONTRADICTED</strong>, and <strong>NEEDS_REVIEW</strong>. It does not predict dispute outcomes.
            </div>
          </div>
        ) : isLoading ? (
          /* Loading State */
          <div className="py-14 text-center space-y-3">
            <div className="w-9 h-9 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h4 className="text-sm font-semibold text-slate-800">Processing Documents with AI Engine</h4>
            <p className="text-xs text-slate-500">
              Extracting facts via Gemini API and executing deterministic cross-validation...
            </p>
          </div>
        ) : analysis ? (
          /* Analysis Results View */
          <div className="space-y-6">
            {/* Contradictions Alert (if any) */}
            {analysis.contradictions && analysis.contradictions.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/90 space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Conflicting Information Detected ({analysis.contradictions.length})</span>
                </div>
                <div className="space-y-2">
                  {analysis.contradictions.map((contra, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-rose-200 text-xs text-rose-900">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-rose-700 mb-1">
                        <span>Discrepancy: {contra.field}</span>
                      </div>
                      <p className="font-normal text-slate-800">{contra.description}</p>
                      <div className="mt-2 text-[11px] text-slate-500 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div><strong className="text-slate-700">Source A:</strong> {contra.sourceA}</div>
                        <div><strong className="text-slate-700">Source B:</strong> {contra.sourceB}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Matrix Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Evidence Requirement Matrix ({analysis.evidenceMatrix?.length || 0})
                </h4>
                <span className="text-[11px] text-slate-400">
                  Statuses: SUPPORTED • MISSING • CONTRADICTED • NEEDS_REVIEW
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Requirement</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Evidence Reference</th>
                      <th className="py-3 px-4">Verification Findings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.evidenceMatrix?.map((req) => (
                      <tr key={req.requirementId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800 max-w-xs">
                          {req.requirementText}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderStatusBadge(req.status)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {req.evidenceRef ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {req.evidenceRef}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None attached</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {req.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2-Column Section: Missing Evidence & Unsupported Claims */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Missing Evidence Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Missing Evidence ({analysis.missingEvidence?.length || 0})</span>
                </div>
                {analysis.missingEvidence && analysis.missingEvidence.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {analysis.missingEvidence.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 bg-white p-2 rounded border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No critical evidence requirements missing.
                  </p>
                )}
              </div>

              {/* Unsupported Claims Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Unsupported Claims ({analysis.unsupportedClaims?.length || 0})</span>
                </div>
                {analysis.unsupportedClaims && analysis.unsupportedClaims.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {analysis.unsupportedClaims.map((claim, i) => (
                      <li key={i} className="flex items-start gap-2 bg-white p-2 rounded border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
                        <span>{claim}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No unsupported claims detected.
                  </p>
                )}
              </div>
            </div>

            {/* Recommended Next Actions */}
            <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                <Check className="w-4 h-4 text-blue-600" />
                <span>Recommended Next Actions for Merchant</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-800">
                {analysis.recommendedActions?.map((act, i) => (
                  <li key={i} className="flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="font-bold text-blue-600 font-mono text-[11px] mt-0.5">{i + 1}.</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Source References Footer */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Source References Tracked:</span>
                {analysis.sourceReferences?.map((ref) => (
                  <span key={ref} className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {ref}
                  </span>
                ))}
              </div>
              <span>Status verified via Module 3 Engine</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Send, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Sparkles, 
  Shield, 
  Cpu, 
  Edit3, 
  Download, 
  Play, 
  Check, 
  X, 
  RefreshCw, 
  Eye, 
  Paperclip, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Unlock, 
  ArrowRight, 
  ShieldCheck, 
  XCircle, 
  Info,
  ExternalLink,
  Save,
  RotateCcw,
  Clock,
  HelpCircle
} from 'lucide-react';
import { api } from '../api/client';

export default function ResponseGenerationPanel({ dispute, refreshTrigger }) {
  const [responsePackage, setResponsePackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preflighting, setPreflighting] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Editable fields
  const [narrativeText, setNarrativeText] = useState('');
  const [merchantNotesText, setMerchantNotesText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Approval acknowledgment state
  const [acknowledged, setAcknowledged] = useState(false);
  const [reviewerName, setReviewerName] = useState('Merchant Operations Reviewer');

  // Pre-flight check results
  const [preflightResult, setPreflightResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);

  // Load existing package on mount or when dispute changes
  useEffect(() => {
    if (!dispute?.id) return;
    loadResponsePackage();
  }, [dispute?.id, refreshTrigger]);

  const loadResponsePackage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getResponsePackage(dispute.id);
      if (res?.responsePackage) {
        setResponsePackage(res.responsePackage);
        setNarrativeText(res.responsePackage.narrative || '');
        setMerchantNotesText(res.responsePackage.merchantNotes || '');
        setHasUnsavedChanges(false);
      } else {
        setResponsePackage(null);
      }
    } catch (err) {
      // 404 is expected when no draft has been generated yet
      setResponsePackage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (force = false) => {
    setGenerating(true);
    setError(null);
    setActionSuccess(null);
    setShowRegenModal(false);
    try {
      const res = await api.generateResponseDraft(dispute.id, { force });
      if (res.responsePackage) {
        setResponsePackage(res.responsePackage);
        setNarrativeText(res.responsePackage.narrative || '');
        setMerchantNotesText(res.responsePackage.merchantNotes || '');
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setActionSuccess('Response draft generated successfully.');
        setPreflightResult(null);
        setSubmissionResult(null);
      }
    } catch (err) {
      if (err.status === 409 || err.code === 'DRAFT_EXISTS') {
        setShowRegenModal(true);
      } else {
        setError(err.message || 'Failed to generate response draft.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!responsePackage) return;
    setSaving(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await api.updateResponseDraft(dispute.id, {
        narrative: narrativeText,
        merchantNotes: merchantNotesText
      });
      if (res.responsePackage) {
        setResponsePackage(res.responsePackage);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setActionSuccess('Edits saved. Draft status reset to DRAFT for review.');
        setPreflightResult(null);
        setSubmissionResult(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to save narrative edits.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!acknowledged) {
      setError('You must confirm that the defense narrative has been reviewed against records.');
      return;
    }
    setApproving(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await api.approveResponsePackage(dispute.id, {
        approvedBy: reviewerName,
        notes: merchantNotesText
      });
      if (res.responsePackage) {
        setResponsePackage(res.responsePackage);
        setActionSuccess('Response package approved for submission.');
      }
    } catch (err) {
      setError(err.message || 'Failed to approve response package.');
    } finally {
      setApproving(false);
    }
  };

  const handleUnapprove = async () => {
    setApproving(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await api.unapproveResponsePackage(dispute.id);
      if (res.responsePackage) {
        setResponsePackage(res.responsePackage);
        setAcknowledged(false);
        setActionSuccess('Approval revoked. Response package returned to editable DRAFT.');
      }
    } catch (err) {
      setError(err.message || 'Failed to revert approval.');
    } finally {
      setApproving(false);
    }
  };

  const handleExportDossier = async () => {
    setError(null);
    try {
      // Direct browser download
      const res = await api.exportDefenseDossier(dispute.id);
      if (res?.dossier) {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.dossier, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `flowpilot-defense-dossier-${dispute.paypalDisputeId || dispute.id}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setActionSuccess('Defense Dossier JSON downloaded.');
      }
    } catch (err) {
      setError(err.message || 'Failed to export Defense Dossier.');
    }
  };

  const handlePreflightCheck = async () => {
    setPreflighting(true);
    setError(null);
    setPreflightResult(null);
    try {
      const res = await api.submitDisputeEvidence(dispute.id, { dryRun: true });
      setPreflightResult(res);
      if (res.success) {
        setActionSuccess('Pre-flight validation passed: Ready for submission.');
      } else {
        setError(`Pre-flight check rejected: ${res.message || res.error || res.status}`);
      }
    } catch (err) {
      setPreflightResult({
        success: false,
        status: err.status || 'PRE_FLIGHT_ERROR',
        error: err.message
      });
      setError(err.message || 'Pre-flight validation failed.');
    } finally {
      setPreflighting(false);
    }
  };

  const handleSubmitEvidence = async () => {
    setSubmitting(true);
    setError(null);
    setSubmissionResult(null);
    setShowSubmitModal(false);
    try {
      const res = await api.submitDisputeEvidence(dispute.id, { dryRun: false });
      setSubmissionResult(res);
      if (res.success) {
        setActionSuccess(`Evidence successfully submitted to PayPal! Ack ID: ${res.paypalAcknowledgementId}`);
        await loadResponsePackage();
      } else {
        setError(res.message || res.error || 'PayPal Sandbox submission rejected.');
      }
    } catch (err) {
      setSubmissionResult({
        success: false,
        status: err.status || 'SUBMISSION_ERROR',
        error: err.message,
        guidance: err.guidance || 'Export the Defense Dossier JSON for manual submission or review.'
      });
      setError(err.message || 'Evidence submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderProvenanceBadge = (prov) => {
    switch (prov) {
      case 'GEMINI_AI_SYNTHESIZED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Gemini AI Synthesized</span>
          </span>
        );
      case 'MERCHANT_EDITED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            <span>Merchant Edited</span>
          </span>
        );
      case 'DETERMINISTIC_FALLBACK':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <Cpu className="w-3.5 h-3.5 text-slate-600" />
            <span>Deterministic Fallback</span>
          </span>
        );
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>{dispute?.source === 'demo' ? 'SIMULATED DEMO (NOT SENT TO PAYPAL)' : 'SUBMITTED TO PAYPAL SANDBOX'}</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>APPROVED</span>
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>DRAFT (IN REVIEW)</span>
          </span>
        );
    }
  };

  const renderMatrixBadge = (status) => {
    switch (status) {
      case 'SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>SUPPORTED</span>
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>MISSING</span>
          </span>
        );
      case 'CONTRADICTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>CONTRADICTED</span>
          </span>
        );
      case 'NEEDS_REVIEW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <HelpCircle className="w-3 h-3 text-purple-600" />
            <span>NEEDS_REVIEW</span>
          </span>
        );
    }
  };

  const isApproved = responsePackage?.status === 'APPROVED' || responsePackage?.approval?.isApproved;
  const isSubmitted = responsePackage?.status === 'SUBMITTED' || responsePackage?.submission?.status === 'SUBMITTED';
  const provenance = responsePackage?.provenance || responsePackage?.narrativeSource;
  const matrix = responsePackage?.evidenceMatrix || responsePackage?.evidenceBundle?.analysis?.evidenceMatrix || [];
  const missing = responsePackage?.missingEvidence || responsePackage?.evidenceBundle?.analysis?.missingEvidence || [];
  const contradictions = responsePackage?.contradictions || responsePackage?.evidenceBundle?.analysis?.contradictions || [];
  const documents = responsePackage?.evidenceDocuments || responsePackage?.evidenceBundle?.evidenceDocuments || [];
  const approvalMeta = responsePackage?.approvalMetadata || responsePackage?.approval;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/70 via-white to-blue-50/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Module 4: Dispute Response & Resolution
              </h3>
              {responsePackage && renderStatusBadge(responsePackage.status)}
              {responsePackage && renderProvenanceBadge(provenance)}
              {responsePackage?.version && (
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  v{responsePackage.version}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Evidence-backed merchant response generation, internal review governance, and PayPal Sandbox submission.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {responsePackage && (
            <button
              onClick={handleExportDossier}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors"
              title="Download full JSON Defense Dossier conforming to API schema"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Dossier (.json)</span>
            </button>
          )}

          {!responsePackage ? (
            <button
              onClick={() => handleGenerate(false)}
              disabled={generating || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-xs transition-colors"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Response...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Response Draft</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                if (responsePackage.provenance === 'MERCHANT_EDITED') {
                  setShowRegenModal(true);
                } else {
                  handleGenerate(true);
                }
              }}
              disabled={generating || isSubmitted}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors disabled:opacity-50"
              title="Regenerate defense narrative using latest evidence analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : 'text-slate-500'}`} />
              <span>Regenerate Draft</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="m-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Error:</span> {error}
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="m-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Success:</span> {actionSuccess}
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Body */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span>Loading response package status...</span>
        </div>
      ) : !responsePackage ? (
        /* Empty State */
        <div className="p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">No Response Package Compiled</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Synthesize a merchant defense narrative based on the verified evidence documents in Module 2 and the Module 3 Evidence Verification Matrix.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => handleGenerate(false)}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Response Draft...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Defense Narrative Draft</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Response Active Panel */
        <div className="p-6 space-y-6">

          {/* Section 1: Contradictions & Missing Evidence Callout (Mandatory Safeguards) */}
          {(contradictions?.length > 0 || missing?.length > 0) && (
            <div className="space-y-3">
              {contradictions?.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200/90 text-xs text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Evidence Contradiction Alert ({contradictions.length})</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    The following contradictions were detected between merchant documents and dispute records. Submitting contradictory evidence will harm your claim.
                  </p>
                  <ul className="space-y-1.5 pl-5 list-disc text-[11px]">
                    {contradictions.map((c, i) => (
                      <li key={i}>
                        <span className="font-semibold">{c.field || 'Discrepancy'}:</span> {c.explanation || c.message}
                        {c.expectedValue && c.actualValue && (
                          <span className="text-slate-600 font-mono ml-1">
                            (Claimed: "{String(c.expectedValue)}" vs Document: "{String(c.actualValue)}")
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {missing?.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Missing Required Evidence ({missing.length})</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    PayPal typically expects these documents for this dispute reason. If not provided, claims may be resolved in buyer favor.
                  </p>
                  <ul className="space-y-1 pl-5 list-disc text-[11px]">
                    {missing.map((m, i) => (
                      <li key={i}>
                        <span className="font-semibold">{m.requirementTitle || m.requirementId}:</span> {m.description || m.guidance}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Narrative Editor & Provenance */}
          <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Merchant Defense Narrative</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Factual, evidence-backed statement submitted to PayPal. Fact fabrication is prohibited.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isApproved && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>Approved & Locked</span>
                  </span>
                )}
                {!isEditing && !isSubmitted && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                  >
                    <Edit3 className="w-3 h-3 text-slate-500" />
                    <span>Edit Narrative</span>
                  </button>
                )}
              </div>
            </div>

            {/* Editing Warning if approved */}
            {isApproved && isEditing && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Note:</strong> Saving changes to an approved narrative will automatically revoke approval and reset the package status to <strong>DRAFT</strong>.
                </span>
              </div>
            )}

            {/* Textarea / Display */}
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={narrativeText}
                  onChange={(e) => {
                    setNarrativeText(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  rows={8}
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
                  placeholder="Draft your factual dispute defense narrative here..."
                />
                
                {/* Word & Char Counter */}
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {narrativeText.trim().split(/\s+/).filter(Boolean).length} words &bull; {narrativeText.length} characters
                  </span>
                  <span className="text-slate-400">
                    PayPal recommended maximum: 2,000 characters
                  </span>
                </div>

                {/* Merchant Internal Notes */}
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Merchant Internal Audit Notes (Not submitted to PayPal):
                  </label>
                  <input
                    type="text"
                    value={merchantNotesText}
                    onChange={(e) => {
                      setMerchantNotesText(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Verified by Marcus Vance on 2026-11-10 via carrier tracking portal."
                  />
                </div>

                {/* Save / Cancel Controls */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setNarrativeText(responsePackage.narrative || '');
                      setMerchantNotesText(responsePackage.merchantNotes || '');
                      setIsEditing(false);
                      setHasUnsavedChanges(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdits}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Narrative</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-lg border border-slate-200/90 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans shadow-2xs">
                  {narrativeText || (
                    <span className="italic text-slate-400">No defense narrative text available.</span>
                  )}
                </div>

                {merchantNotesText && (
                  <div className="p-2.5 bg-slate-100/80 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">Internal Audit Note:</span> {merchantNotesText}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Evidence Verification Matrix Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Evidence Verification Matrix</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                {matrix.length} requirements evaluated
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matrix && matrix.length > 0 ? (
                matrix.map((item, idx) => {
                  const docRefs = item.applicableDocuments || (item.evidenceRef ? [item.evidenceRef] : []);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900 leading-snug">
                          {item.requirementTitle || item.requirementText || item.requirementId}
                        </span>
                        {renderMatrixBadge(item.status)}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {item.explanation || item.notes || 'Requirement evaluated against attached evidence.'}
                      </p>
                      {docRefs.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/50">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Substantiated by:</span>
                          {docRefs.map((docId, dIdx) => (
                            <span
                              key={dIdx}
                              className="font-mono text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded shadow-2xs"
                            >
                              {docId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 col-span-2 bg-slate-50 rounded-lg">
                  No evidence requirements matrix available.
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Attached Document Catalog */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-500" />
                <span>Attached Evidence Documents ({documents.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                PayPal limit: 10MB per document
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Document ID</th>
                    <th className="px-4 py-2.5">File Name</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Tracking / Details</th>
                    <th className="px-4 py-2.5">Size</th>
                    <th className="px-4 py-2.5 text-right">Storage Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents && documents.length > 0 ? (
                    documents.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-blue-600 font-semibold">
                          {doc.id}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {doc.fileName || (doc.storageUrl ? doc.storageUrl.split('/').pop() : 'document.pdf')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {doc.documentType || 'PROOF_OF_FULFILLMENT'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-600 font-mono">
                          {doc.trackingNumber ? (
                            <div>
                              <span className="font-semibold text-slate-800">{doc.carrierName || 'Other'}: {doc.trackingNumber}</span>
                              <span className="text-[10px] text-slate-400 block font-sans">
                                (Format valid &bull; Unverified by carrier API)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No tracking #</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-500 font-mono">
                          {doc.fileSizeBytes ? `${Math.round(doc.fileSizeBytes / 1024)} KB` : 'N/A'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                            <CheckCircle2 className="w-3 h-3 text-slate-500" />
                            <span>File Stored</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">
                        No evidence documents currently attached to this dispute. Upload documents in Module 2.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Merchant Review & Approval Gate (Mandatory Governance) */}
          <div className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Merchant Internal Review & Approval Gate</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Approval verifies that the defense narrative reconciles with factual merchant records.
                </p>
              </div>

              {isApproved && (
                <button
                  onClick={handleUnapprove}
                  disabled={approving || isSubmitted}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Revoke Approval / Edit Draft</span>
                </button>
              )}
            </div>

            {isApproved ? (
              <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Package Approved for PayPal Submission</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-800 pt-1">
                  <div>
                    <span className="font-semibold">Reviewer:</span> {approvalMeta?.approvedBy || 'Merchant Admin'}
                  </div>
                  <div>
                    <span className="font-semibold">Approved At:</span> {approvalMeta?.approvedAt ? new Date(approvalMeta.approvedAt).toLocaleString() : 'N/A'}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-semibold">Review Scope:</span> {approvalMeta?.reviewType || 'MERCHANT_INTERNAL_REVIEW'}
                  </div>
                </div>
                <p className="text-[10px] text-emerald-700 italic border-t border-emerald-200/60 pt-2">
                  {approvalMeta?.legalDisclaimer || 
                    'Notice: This record confirms internal merchant review and authorization. It does not constitute a legally binding cryptographic digital signature.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="approval-ack"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-0.5"
                  />
                  <label htmlFor="approval-ack" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                    <strong>Merchant Verification Affirmation:</strong> I confirm that I have reviewed the defense narrative and attached evidence against our order fulfillment records, and affirm that all claims are accurate and substantiated.
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">Reviewer Name:</span>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Reviewer Name"
                    />
                  </div>

                  <button
                    onClick={handleApprove}
                    disabled={!acknowledged || approving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                  >
                    {approving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Response Package</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  Notice: This record constitutes an internal merchant review record and does not represent an unauthenticated or cryptographic digital signature.
                </p>
              </div>
            )}
          </div>

          {/* Section 6: PayPal Pre-flight Dry Run & Submission */}
          <div className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>PayPal Customer Disputes API Submission (Sandbox)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  Target: POST /v1/customer/disputes/{'{dispute_id}'}/provide-evidence (api-m.sandbox.paypal.com)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreflightCheck}
                  disabled={preflighting || isSubmitted}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors disabled:opacity-50"
                  title="Validate all 10 pre-flight submission requirements without sending data"
                >
                  <Play className={`w-3.5 h-3.5 ${preflighting ? 'animate-spin' : 'text-blue-600'}`} />
                  <span>Pre-Flight Dry Run</span>
                </button>

                <button
                  onClick={() => setShowSubmitModal(true)}
                  disabled={!isApproved || isSubmitted || submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit to PayPal Sandbox</span>
                </button>
              </div>
            </div>

            {/* Synthetic Demo Guard Notice */}
            {dispute?.source === 'demo' && (
              <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-lg text-[11px] text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Demo Mode Guard:</strong> This dispute is a synthetic demo case. The official PayPal Sandbox API requires an actual dispute created in your Sandbox merchant account. Use <strong>Pre-Flight Dry Run</strong> or <strong>Export Dossier (.json)</strong> for review.
                </span>
              </div>
            )}

            {/* Pre-flight Checklist Display */}
            {preflightResult && (
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Pre-Flight Validation Results</span>
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                    preflightResult.success 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {preflightResult.status}
                  </span>
                </div>

                {preflightResult.validationChecklist ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {Object.entries(preflightResult.validationChecklist).map(([check, passed], i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-700">
                        {passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                        )}
                        <span className="font-mono">{check}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">{preflightResult.message || preflightResult.error}</p>
                )}

                {preflightResult.guidance && (
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/60 text-[11px] text-blue-800">
                    <span className="font-bold">Next Step:</span> {preflightResult.guidance}
                  </div>
                )}
              </div>
            )}

            {/* Submission Result Outcome */}
            {submissionResult && (
              <div className={`p-4 rounded-xl border space-y-2 ${
                submissionResult.success 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/80 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    {submissionResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      {submissionResult.success ? 'Evidence Submission Accepted' : 'Submission Blocked / Failed'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold">
                    {submissionResult.status}
                  </span>
                </div>

                <p className="text-xs leading-relaxed">
                  {submissionResult.message || submissionResult.error}
                </p>

                {submissionResult.paypalAcknowledgementId && (
                  <div className="text-xs font-mono bg-white/70 p-2 rounded border border-emerald-300">
                    PayPal Ack ID: <strong>{submissionResult.paypalAcknowledgementId}</strong>
                  </div>
                )}

                {submissionResult.guidance && (
                  <div className="text-[11px] p-2.5 rounded bg-white/80 border border-slate-200 text-slate-700">
                    <strong>Recommended Action:</strong> {submissionResult.guidance}
                  </div>
                )}
              </div>
            )}

            {/* Status Information Callouts */}
            {!isApproved && (
              <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Submission is locked. You must complete the <strong>Merchant Internal Review & Approval Gate</strong> above before submitting to PayPal Sandbox.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Live PayPal Submission */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Confirm PayPal Sandbox Submission
                </h3>
                <p className="text-xs text-slate-500">
                  Case: {dispute.paypalDisputeId || dispute.id}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2 text-slate-700">
              <p>
                You are about to transmit this evidence package to the official PayPal Customer Disputes API endpoint:
              </p>
              <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-800 break-all">
                POST /v1/customer/disputes/{dispute.paypalDisputeId || dispute.id}/provide-evidence
              </div>
              <ul className="text-[11px] space-y-1 pl-4 list-disc text-slate-600">
                <li>Multipart payload: JSON metadata + binary evidence attachments</li>
                <li>Defense narrative statement ({narrativeText.length} characters)</li>
                <li>{responsePackage?.evidenceDocuments?.length || 0} attached documentation records</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEvidence}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Transmit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Regenerating an Edited Draft */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Overwrite Custom Edits?
                </h3>
                <p className="text-xs text-slate-500">
                  This narrative was previously edited by merchant.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Regenerating will synthesize a fresh narrative based on the latest evidence analysis and overwrite your custom edits. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRegenModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
              >
                Keep Current Draft
              </button>
              <button
                onClick={() => handleGenerate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700"
              >
                <span>Overwrite & Regenerate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

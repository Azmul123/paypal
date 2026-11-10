import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderLock, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Eye, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Hash, 
  X, 
  RefreshCw, 
  Sparkles,
  Info,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../api/client';
import DocumentPreviewModal from './DocumentPreviewModal';

const DOCUMENT_TYPES = [
  { value: 'PROOF_OF_DELIVERY', label: 'Proof of Delivery / Carrier Slip' },
  { value: 'INVOICE', label: 'Order Invoice / Billing Receipt' },
  { value: 'CUSTOMER_COMMUNICATION', label: 'Customer Communication Log' },
  { value: 'TERMS_AND_CONDITIONS', label: 'Terms of Service / Return Policy' },
  { value: 'REFUND_CONFIRMATION', label: 'Refund or Credit Note' },
  { value: 'OTHER', label: 'Other Supporting Evidence' }
];

export default function EvidenceVaultPanel({ dispute, onEvidenceChanged }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Upload Form State
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState('PROOF_OF_DELIVERY');
  const [carrierName, setCarrierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [merchantNotes, setMerchantNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);

  // Edit Metadata Modal State
  const [editingDoc, setEditingDoc] = useState(null);
  const [editDocType, setEditDocType] = useState('OTHER');
  const [editCarrierName, setEditCarrierName] = useState('');
  const [editTrackingNumber, setEditTrackingNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Deletion State
  const [deletingId, setDeletingId] = useState(null);

  const fileInputRef = useRef(null);

  // Load documents on mount or dispute change
  const loadDocuments = async () => {
    if (!dispute?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDisputeEvidence(dispute.id);
      setDocuments(res.documents || []);
    } catch (err) {
      setError(err.message || 'Failed to load evidence documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [dispute?.id]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB limit. Please select a smaller PDF or image.');
      setSelectedFile(null);
      return;
    }

    // Validate extension
    const validExts = ['.pdf', '.png', '.jpg', '.jpeg'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExts.some(ext => lowerName.endsWith(ext));
    if (!hasValidExt) {
      setUploadError('Invalid format. FlowPilot supports PDF, PNG, and JPEG documents.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('disputeId', dispute.id);
      formData.append('documentType', docType);
      if (carrierName.trim()) formData.append('carrierName', carrierName.trim());
      if (trackingNumber.trim()) formData.append('trackingNumber', trackingNumber.trim());
      if (merchantNotes.trim()) formData.append('merchantNotes', merchantNotes.trim());

      await api.uploadEvidenceDoc(formData);

      // Reset form
      setSelectedFile(null);
      setCarrierName('');
      setTrackingNumber('');
      setMerchantNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUploadForm(false);
      setSuccessMessage('Document securely uploaded to Evidence Vault.');
      setTimeout(() => setSuccessMessage(null), 4000);

      // Reload
      await loadDocuments();
      if (onEvidenceChanged) onEvidenceChanged();
    } catch (err) {
      if (err.code === 'DUPLICATE_DOCUMENT') {
        setUploadError(`Duplicate Document: This exact file has already been uploaded for this dispute (${err.existingFileName || err.existingDocumentId}).`);
      } else {
        setUploadError(err.message || 'Upload failed. Please check file and try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId, fileName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}" from the Evidence Vault?`)) {
      return;
    }

    setDeletingId(docId);
    try {
      await api.deleteEvidenceDoc(docId, dispute.id);
      setSuccessMessage(`Document "${fileName}" deleted successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDocuments();
      if (onEvidenceChanged) onEvidenceChanged();
    } catch (err) {
      alert(`Failed to delete document: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenEdit = (doc) => {
    setEditingDoc(doc);
    setEditDocType(doc.documentType || 'OTHER');
    setEditCarrierName(doc.carrierName || '');
    setEditTrackingNumber(doc.trackingNumber || '');
    setEditNotes(doc.merchantNotes || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;

    setIsSavingEdit(true);
    try {
      await api.updateEvidenceDoc(editingDoc.id, {
        documentType: editDocType,
        carrierName: editCarrierName.trim() || undefined,
        trackingNumber: editTrackingNumber.trim() || undefined,
        merchantNotes: editNotes.trim() || undefined
      });

      setEditingDoc(null);
      setSuccessMessage(`Metadata for "${editingDoc.fileName}" updated successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDocuments();
      if (onEvidenceChanged) onEvidenceChanged();
    } catch (err) {
      alert(`Failed to update metadata: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const hasMerchantUploads = documents.some(d => d.source === 'merchant_upload');
  const isDemoDispute = dispute?.source === 'demo';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Panel Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  Evidence Vault
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  Module 2 Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Secure binary evidence repository with magic-byte verification, tamper checks, and anti-contamination isolation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{showUploadForm ? 'Close Upload' : 'Upload Evidence'}</span>
            </button>
            <button
              onClick={loadDocuments}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Refresh evidence catalog"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Isolation Banner */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Evidence Isolation: {hasMerchantUploads ? (
                <strong className="text-emerald-300">Active Merchant Vault (Demo fixtures excluded from AI analysis)</strong>
              ) : isDemoDispute ? (
                <strong className="text-amber-300">Isolated Demo Mode (Upload merchant files above to replace fixtures)</strong>
              ) : (
                <strong className="text-slate-300">Empty Evidence Vault (Awaiting merchant documentation)</strong>
              )}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {documents.length} {documents.length === 1 ? 'Document' : 'Documents'} Registered
          </span>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Upload Drawer / Form */}
      {showUploadForm && (
        <div className="p-6 bg-slate-50/80 border-b border-slate-200 animate-in slide-in-from-top-4 duration-200">
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <UploadCloud className="w-4 h-4 text-blue-600" />
                <span>Upload New Evidence Document</span>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Document File (PDF, PNG, JPG — Max 10MB) <span className="text-rose-500">*</span>
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    selectedFile 
                      ? 'border-emerald-400 bg-emerald-50/30' 
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-6 h-6 text-emerald-600" />
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-900 block truncate max-w-sm">
                          {selectedFile.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {formatFileSize(selectedFile.size)} • {selectedFile.type || 'binary'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <span className="text-xs font-semibold text-slate-700 block">
                        Click or drag to attach document file
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Magic-byte signature verification will enforce authentic binary format
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Evidence Classification Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Carrier & Tracking if POD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shipping Carrier (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FedEx, UPS, USPS, DHL"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tracking Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 781294819201"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Context Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Merchant Context & Evidence Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide context on package delivery, signed recipient, order items, or dispute defense..."
                  value={merchantNotes}
                  onChange={(e) => setMerchantNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Note: Merchant notes are preserved for merchant context and will not be falsely tagged as OCR-verified text.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying & Ingesting...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Save to Evidence Vault</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Catalog Grid / List */}
      <div className="p-6">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <span className="text-xs">Loading evidence catalog...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <FolderLock className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <h4 className="text-sm font-bold text-slate-800">No Evidence Documents Attached</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Attach proof of delivery, itemized invoices, or customer communication logs to substantiate your merchant defense.
            </p>
            <button
              onClick={() => setShowUploadForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload First Document</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => {
                const isPdf = doc.mimeType === 'application/pdf' || doc.fileName?.toLowerCase().endsWith('.pdf');
                const isDemo = doc.source === 'demo';

                return (
                  <div
                    key={doc.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between transition-all hover:shadow-md ${
                      isDemo 
                        ? 'bg-amber-50/30 border-amber-200/80 hover:border-amber-300' 
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div>
                      {/* Top Row: Type & Source Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {doc.documentType?.replace(/_/g, ' ') || 'OTHER'}
                        </span>
                        {isDemo ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Synthetic Demo</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Merchant Upload</span>
                          </span>
                        )}
                      </div>

                      {/* File Icon & Name */}
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                          {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={doc.fileName}>
                            {doc.fileName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {doc.id}
                          </span>
                        </div>
                      </div>

                      {/* Metadata Details */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Size:</span>
                          <span className="font-mono text-slate-700">{formatFileSize(doc.fileSizeBytes)}</span>
                        </div>
                        {doc.carrierName && (
                          <div className="flex items-center justify-between">
                            <span>Carrier:</span>
                            <span className="font-semibold text-slate-700">{doc.carrierName}</span>
                          </div>
                        )}
                        {doc.trackingNumber && (
                          <div className="flex items-center justify-between">
                            <span>Tracking:</span>
                            <span className="font-mono text-slate-700 truncate max-w-[140px]" title={doc.trackingNumber}>
                              {doc.trackingNumber}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Uploaded:</span>
                          <span className="text-slate-600">
                            {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Initial Setup'}
                          </span>
                        </div>
                      </div>

                      {/* Merchant Notes excerpt if present */}
                      {doc.merchantNotes && (
                        <div className="mt-2.5 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 line-clamp-2" title={doc.merchantNotes}>
                          <span className="font-semibold text-slate-800">Note: </span>
                          {doc.merchantNotes}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        title="View binary preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {!isDemo && (
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit metadata"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!isDemo && (
                          <button
                            onClick={() => handleDelete(doc.id, doc.fileName)}
                            disabled={deletingId === doc.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete document"
                          >
                            {deletingId === doc.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Edit Evidence Metadata</h3>
              </div>
              <button onClick={() => setEditingDoc(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Filename (Read-Only)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingDoc.fileName}
                  className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Type
                </label>
                <select
                  value={editDocType}
                  onChange={(e) => setEditDocType(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Carrier Name
                </label>
                <input
                  type="text"
                  value={editCarrierName}
                  onChange={(e) => setEditCarrierName(e.target.value)}
                  placeholder="e.g. FedEx Express"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={editTrackingNumber}
                  onChange={(e) => setEditTrackingNumber(e.target.value)}
                  placeholder="e.g. 781294819201"
                  className="w-full text-xs px-3 py-2 font-mono bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Merchant Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Additional merchant context..."
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {isSavingEdit ? 'Saving...' : 'Update Metadata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Binary Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          disputeId={dispute?.id}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}

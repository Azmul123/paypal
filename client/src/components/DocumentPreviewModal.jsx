import React, { useEffect } from 'react';
import { X, FileText, Image as ImageIcon, Download, ShieldCheck, AlertCircle, Calendar, Hash, Truck } from 'lucide-react';
import { api } from '../api/client';

export default function DocumentPreviewModal({ document: doc, disputeId, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!doc) return null;

  const fileUrl = doc.storageUrl || api.getEvidenceFileUrl(doc.id, disputeId);
  const isPdf = doc.mimeType === 'application/pdf' || doc.fileName?.toLowerCase().endsWith('.pdf');
  const isImage = doc.mimeType?.startsWith('image/') || /\.(png|jpe?g)$/i.test(doc.fileName || '');

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl ${isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
              {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate" title={doc.fileName}>
                {doc.fileName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                <span>{doc.id}</span>
                <span>•</span>
                <span>{formatFileSize(doc.fileSizeBytes)}</span>
                <span>•</span>
                <span className="uppercase text-slate-600 font-semibold">{doc.documentType || 'OTHER'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={doc.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
              title="Open or download original file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Provenance & Security Information Bar */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 text-xs text-slate-600 flex flex-wrap items-center gap-x-6 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px]">
              Signature: <strong className="text-slate-800">Verified Magic Bytes ({doc.mimeType || 'binary'})</strong>
            </span>
          </div>

          {doc.provenance && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">
                Extraction: <strong className="text-slate-800">{doc.provenance.contentExtractionMethod || 'NONE'}</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-[11px]">
                Verification: <strong className={doc.provenance.isIndependentVerification ? 'text-emerald-700' : 'text-slate-700'}>
                  {doc.provenance.isIndependentVerification ? 'Independent' : 'Merchant-Supplied'}
                </strong>
              </span>
            </div>
          )}

          {doc.carrierName && (
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px]">
                {doc.carrierName} {doc.trackingNumber ? `(${doc.trackingNumber})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Document Preview Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900/5 flex items-center justify-center min-h-[400px]">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={doc.fileName}
              className="w-full h-[520px] bg-white rounded-xl shadow-xs border border-slate-200"
            />
          ) : isImage ? (
            <div className="max-h-[520px] flex items-center justify-center p-2">
              <img
                src={fileUrl}
                alt={doc.fileName}
                className="max-h-[500px] max-w-full object-contain rounded-xl shadow-md border border-slate-200 bg-white"
              />
            </div>
          ) : (
            <div className="text-center p-10 bg-white rounded-xl border border-slate-200 max-w-md">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">Preview Not Available Inline</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                This document format cannot be rendered directly in the embedded canvas.
              </p>
              <a
                href={fileUrl}
                download={doc.fileName}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Document File</span>
              </a>
            </div>
          )}
        </div>

        {/* Merchant Notes & Footer */}
        {doc.merchantNotes && (
          <div className="px-6 py-3 bg-amber-50/70 border-t border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-[11px] uppercase tracking-wider text-amber-800">
                Merchant Evidence Context Note:
              </strong>
              <p className="mt-0.5 text-xs text-amber-950 whitespace-pre-wrap">{doc.merchantNotes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

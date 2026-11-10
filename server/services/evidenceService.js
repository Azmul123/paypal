/**
 * FlowPilot — Module 2: Evidence Management
 * Evidence Service (v2.1)
 * 
 * Responsibilities:
 * - Concurrency-safe atomic disk catalog persistence (`server/data/evidence_metadata.json`)
 * - Serialized write queue preventing race conditions
 * - Atomic check-and-register duplicate detection (enforcing uniqueness of disputeId + fileHash)
 * - Strict evidence isolation: real merchant uploads are never contaminated with demo fixtures
 * - Extraction provenance tracking (distinguishing binary, auto-parsed text, and merchant notes)
 * - Integration with Module 1 (dispute existence check) and Module 3 (EvidenceDocument contract)
 */

const fs = require('fs');
const path = require('path');
const storageService = require('./storageService');
const supabaseService = require('./supabaseService');
const { getSyntheticEvidenceForDispute } = require('./mockEvidence');

class EvidenceService {
  constructor(metadataPath) {
    this.metadataPath = path.resolve(metadataPath || path.join(__dirname, '../data/evidence_metadata.json'));
    this.catalog = new Map(); // id -> EvidenceDocument
    this.writeQueue = Promise.resolve(); // Mutex queue for serializing writes
    this.initCatalog();
  }

  /**
   * Initializes catalog from disk or recovers safely from corruption
   */
  initCatalog() {
    this.catalog = new Map();
    try {
      const dir = path.dirname(this.metadataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.metadataPath)) {
        const raw = fs.readFileSync(this.metadataPath, 'utf8');
        if (raw.trim()) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((doc) => {
              if (doc && doc.id) {
                this.catalog.set(doc.id, doc);
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[EvidenceService] Warning: Failed to parse metadata catalog (${err.message}). Safely creating backup and starting fresh.`);
      try {
        if (fs.existsSync(this.metadataPath)) {
          fs.renameSync(this.metadataPath, `${this.metadataPath}.corrupted.${Date.now()}`);
        }
      } catch (backupErr) {
        // Ignore backup failure
      }
      this.catalog = new Map();
    }
  }

  /**
   * Serialized atomic disk write
   */
  enqueuePersist() {
    const task = this.writeQueue
      .catch(() => {})
      .then(async () => {
        try {
          const list = Array.from(this.catalog.values());
          const jsonContent = JSON.stringify(list, null, 2);
          const tempPath = `${this.metadataPath}.tmp.${process.pid}.${Date.now()}`;
          
          await fs.promises.writeFile(tempPath, jsonContent, 'utf8');
          await fs.promises.rename(tempPath, this.metadataPath);
        } catch (err) {
          console.error('[EvidenceService] Error persisting metadata catalog to disk:', err.message);
        }
      });
    this.writeQueue = task.catch(() => {});
    return task;
  }

  /**
   * Upload and register a new evidence document.
   * Atomic duplicate check and registration inside write queue.
   */
  async uploadDocument({
    disputeId,
    fileBuffer,
    fileName,
    mimeType,
    documentType,
    carrierName,
    trackingNumber,
    merchantNotes,
    content
  }) {
    if (!disputeId || typeof disputeId !== 'string') {
      const err = new Error('A valid disputeId is required to upload evidence.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Verify that dispute exists in Module 1
    const dispute = await supabaseService.getDisputeById(disputeId);
    if (!dispute) {
      const err = new Error(`Dispute "${disputeId}" was not found. Cannot attach evidence to a non-existent dispute.`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Validate binary magic bytes signature
    const magicCheck = storageService.validateMagicBytes(fileBuffer, mimeType);
    if (!magicCheck.valid) {
      const err = new Error(magicCheck.error);
      err.statusCode = 400;
      throw err;
    }

    // 3. Compute SHA-256 hash
    const fileHash = storageService.computeFileHash(fileBuffer);

    // 4. Atomic check-and-register inside queue
    let registeredDoc = null;

    const task = this.writeQueue
      .catch(() => {})
      .then(async () => {
        // Check for duplicate in this dispute
        for (const existing of this.catalog.values()) {
          if (existing.disputeId === disputeId && existing.fileHash === fileHash) {
            const err = new Error(`Duplicate document detected. This exact file has already been uploaded for this dispute.`);
            err.statusCode = 409;
            err.code = 'DUPLICATE_DOCUMENT';
            err.existingDocumentId = existing.id;
            err.existingFileName = existing.fileName;
            throw err;
          }
        }

        // Generate ID and safe filename
        const docId = storageService.generateDocumentId();
        const safeName = storageService.sanitizeFilename(fileName);

        // Save file atomically to disk
        const saveResult = await storageService.saveFile(disputeId, docId, safeName, fileBuffer);

        // Provenance tagging
        const extractionMethod = content ? 'MERCHANT_SUPPLIED' : 'NONE';
        const extractionStatus = content ? 'SUCCESS' : 'NOT_APPLICABLE';

        const docRecord = {
          id: docId,
          disputeId: disputeId,
          documentType: documentType || 'OTHER',
          fileName: safeName,
          storageUrl: `/api/evidence/${docId}/file`,
          storagePath: saveResult.relativePath,
          mimeType: magicCheck.detectedType || mimeType,
          fileSizeBytes: saveResult.fileSizeBytes,
          fileHash: fileHash,
          carrierName: carrierName ? carrierName.trim() : undefined,
          trackingNumber: trackingNumber ? trackingNumber.trim() : undefined,
          uploadedAt: new Date().toISOString(),
          source: 'merchant_upload',
          provenance: {
            hasBinary: true,
            contentExtractionMethod: extractionMethod,
            extractionStatus: extractionStatus,
            isIndependentVerification: false // Strictly false for merchant uploads
          },
          content: content ? content.trim() : undefined,
          merchantNotes: merchantNotes ? merchantNotes.trim() : undefined
        };

        this.catalog.set(docId, docRecord);
        registeredDoc = docRecord;

        // Persist catalog to disk atomically
        const list = Array.from(this.catalog.values());
        const tempPath = `${this.metadataPath}.tmp.${process.pid}.${Date.now()}`;
        await fs.promises.writeFile(tempPath, JSON.stringify(list, null, 2), 'utf8');
        await fs.promises.rename(tempPath, this.metadataPath);
      });

    this.writeQueue = task.catch(() => {});
    await task;

    return registeredDoc;
  }

  /**
   * Retrieves all documents for a dispute with strict anti-contamination isolation.
   * If merchant has uploaded documents, returns strictly those uploads.
   * If zero uploads exist AND dispute is demo mode, returns isolated demo fixtures.
   */
  getDocumentsForDispute(disputeId) {
    if (!disputeId) return [];

    const merchantUploads = Array.from(this.catalog.values())
      .filter((d) => d.disputeId === disputeId);

    // If real merchant uploads exist, NEVER return demo fixtures
    if (merchantUploads.length > 0) {
      return merchantUploads;
    }

    // Only if 0 merchant uploads exist, check if this is a known synthetic demo dispute
    const demoDocs = getSyntheticEvidenceForDispute(disputeId);
    if (demoDocs.length > 0) {
      return demoDocs.map((doc) => ({
        ...doc,
        source: 'demo'
      }));
    }

    return [];
  }

  /**
   * Gets a single document by ID
   */
  getDocumentById(docId) {
    if (!docId) return null;
    return this.catalog.get(docId) || null;
  }

  /**
   * Updates document metadata (category, tracking #, carrier, notes)
   */
  async updateDocument(docId, updates = {}, disputeIdContext = null) {
    const doc = this.catalog.get(docId);
    if (!doc) {
      const err = new Error(`Document "${docId}" not found.`);
      err.statusCode = 404;
      throw err;
    }

    // Cross-dispute authorization guard
    if (disputeIdContext && doc.disputeId !== disputeIdContext) {
      const err = new Error(`Access Denied: Document "${docId}" does not belong to dispute "${disputeIdContext}".`);
      err.statusCode = 403;
      throw err;
    }

    // Allowed updatable fields
    if (updates.documentType) {
      const validTypes = ['PROOF_OF_DELIVERY', 'CUSTOMER_COMMUNICATION', 'INVOICE', 'RETURN_POLICY', 'OTHER'];
      if (!validTypes.includes(updates.documentType)) {
        const err = new Error(`Invalid documentType "${updates.documentType}". Allowed: ${validTypes.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
      doc.documentType = updates.documentType;
    }

    if (updates.carrierName !== undefined) doc.carrierName = updates.carrierName ? updates.carrierName.trim() : undefined;
    if (updates.trackingNumber !== undefined) doc.trackingNumber = updates.trackingNumber ? updates.trackingNumber.trim() : undefined;
    if (updates.merchantNotes !== undefined) doc.merchantNotes = updates.merchantNotes ? updates.merchantNotes.trim() : undefined;
    if (updates.content !== undefined) {
      doc.content = updates.content ? updates.content.trim() : undefined;
      doc.provenance.contentExtractionMethod = 'MERCHANT_SUPPLIED';
      doc.provenance.extractionStatus = 'SUCCESS';
    }

    doc.updatedAt = new Date().toISOString();
    this.catalog.set(docId, doc);

    await this.enqueuePersist();
    return doc;
  }

  /**
   * Deletes a document from disk storage and metadata catalog
   */
  async deleteDocument(docId, disputeIdContext = null) {
    const doc = this.catalog.get(docId);
    if (!doc) {
      const err = new Error(`Document "${docId}" not found.`);
      err.statusCode = 404;
      throw err;
    }

    // Cross-dispute authorization guard
    if (disputeIdContext && doc.disputeId !== disputeIdContext) {
      const err = new Error(`Access Denied: Document "${docId}" does not belong to dispute "${disputeIdContext}".`);
      err.statusCode = 403;
      throw err;
    }

    // Remove file from disk
    if (doc.storagePath) {
      await storageService.deleteFile(doc.storagePath);
    }

    // Remove from catalog
    this.catalog.delete(docId);
    await this.enqueuePersist();

    return {
      success: true,
      documentId: docId,
      disputeId: doc.disputeId,
      message: `Document "${doc.fileName}" (${docId}) was successfully deleted.`
    };
  }
}

module.exports = new EvidenceService();

/**
 * FlowPilot — Module 2: Evidence Management
 * Storage & Security Engine (v2.1)
 * 
 * Responsibilities:
 * - Binary magic bytes verification (PDF, PNG, JPEG) to block MIME spoofing
 * - Path traversal defense (strict base directory containment)
 * - Safe filename generation & sanitization
 * - SHA-256 binary hash computation
 * - Concurrency-safe atomic file writes & deletions
 * - Protected binary streaming
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class StorageService {
  constructor(baseDir) {
    this.baseDir = path.resolve(baseDir || path.join(__dirname, '../uploads/evidence'));
    this.ensureBaseDir();
  }

  ensureBaseDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Validates binary file signatures (magic bytes) against declared MIME types.
   * Prevents MIME spoofing and disguised executables.
   * 
   * @param {Buffer} buffer File binary buffer
   * @param {string} mimeType Declared MIME type
   * @returns {{ valid: boolean, detectedType?: string, error?: string }}
   */
  validateMagicBytes(buffer, mimeType) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
      return { valid: false, error: 'File is empty or corrupted (under 4 bytes).' };
    }

    const cleanMime = (mimeType || '').toLowerCase().trim();

    // PDF Magic Bytes: %PDF- (0x25 0x50 0x44 0x46)
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;

    // PNG Magic Bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    const isPng = buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;

    // JPEG Magic Bytes: 0xFF 0xD8 0xFF
    const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

    if (cleanMime === 'application/pdf') {
      if (!isPdf) {
        return { valid: false, error: 'Invalid file signature: File contents do not match declared PDF format (%PDF header missing).' };
      }
      return { valid: true, detectedType: 'application/pdf' };
    }

    if (cleanMime === 'image/png') {
      if (!isPng) {
        return { valid: false, error: 'Invalid file signature: File contents do not match declared PNG image format.' };
      }
      return { valid: true, detectedType: 'image/png' };
    }

    if (cleanMime === 'image/jpeg' || cleanMime === 'image/jpg') {
      if (!isJpg) {
        return { valid: false, error: 'Invalid file signature: File contents do not match declared JPEG image format.' };
      }
      return { valid: true, detectedType: 'image/jpeg' };
    }

    return {
      valid: false,
      error: `Unsupported MIME type "${mimeType}". Allowed types: application/pdf, image/png, image/jpeg.`
    };
  }

  /**
   * Strips directory traversal sequences, slashes, null bytes, and non-ASCII characters.
   */
  sanitizeFilename(originalName) {
    if (!originalName || typeof originalName !== 'string') {
      return 'unnamed_document';
    }
    // Remove paths
    const base = path.basename(originalName);
    // Replace traversal sequences and unsafe characters
    const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
    return safe.slice(0, 100) || 'unnamed_document';
  }

  /**
   * Generates a stable unique document ID and safe storage filename
   */
  generateDocumentId() {
    const timestamp = Date.now();
    const rand = crypto.randomBytes(4).toString('hex');
    return `doc_ev_${timestamp}_${rand}`;
  }

  /**
   * Computes SHA-256 hash of a file buffer
   */
  computeFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Validates that target path resides strictly within the allowed base directory.
   */
  assertPathContainment(targetPath, allowedBase = this.baseDir) {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedBase = path.resolve(allowedBase);

    if (!resolvedTarget.startsWith(resolvedBase)) {
      throw new Error(`Security Exception: Path traversal attempt detected outside base storage directory.`);
    }
    return resolvedTarget;
  }

  /**
   * Saves a file buffer atomically into the dispute directory
   */
  async saveFile(disputeId, docId, sanitizedFilename, buffer) {
    // Sanitize disputeId
    const safeDisputeId = disputeId.replace(/[^a-zA-Z0-9_-]/g, '');
    const disputeDir = path.join(this.baseDir, safeDisputeId);
    this.assertPathContainment(disputeDir);

    if (!fs.existsSync(disputeDir)) {
      await fs.promises.mkdir(disputeDir, { recursive: true });
    }

    const storageFilename = `${docId}_${sanitizedFilename}`;
    const targetFilePath = path.join(disputeDir, storageFilename);
    this.assertPathContainment(targetFilePath, disputeDir);

    // Atomic write via temporary file
    const tempFilePath = `${targetFilePath}.tmp.${process.pid}.${Date.now()}`;
    await fs.promises.writeFile(tempFilePath, buffer);
    await fs.promises.rename(tempFilePath, targetFilePath);

    const relativePath = path.join(safeDisputeId, storageFilename).replace(/\\/g, '/');

    return {
      absolutePath: targetFilePath,
      relativePath: relativePath,
      fileSizeBytes: buffer.length
    };
  }

  /**
   * Resolves safe absolute path for streaming/retrieval
   */
  resolveFilePath(relativePath) {
    if (!relativePath || typeof relativePath !== 'string') return null;
    const cleanRel = relativePath.replace(/\\/g, '/');
    const target = path.join(this.baseDir, cleanRel);
    this.assertPathContainment(target);

    if (fs.existsSync(target)) {
      return target;
    }
    return null;
  }

  /**
   * Safely deletes a file from disk
   */
  async deleteFile(relativePath) {
    const fullPath = this.resolveFilePath(relativePath);
    if (fullPath && fs.existsSync(fullPath)) {
      try {
        await fs.promises.unlink(fullPath);
        return true;
      } catch (err) {
        console.warn(`[StorageService] Failed to delete file ${fullPath}:`, err.message);
        return false;
      }
    }
    return false;
  }
}

module.exports = new StorageService();

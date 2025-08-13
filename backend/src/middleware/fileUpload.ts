import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { Request } from 'express';
import { fileTypeFromBuffer } from 'file-type';

// File upload configuration
const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 5,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'application/pdf'
  ] as const,
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'] as const,
  UPLOAD_DIRS: {
    documents: 'uploads/documents',
    avatars: 'uploads/avatars',
    temp: 'uploads/temp'
  }
};

// Create upload directories if they don't exist
const ensureUploadDirs = async (): Promise<void> => {
  try {
    for (const dir of Object.values(UPLOAD_CONFIG.UPLOAD_DIRS)) {
      await fs.mkdir(dir, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

// Initialize directories
ensureUploadDirs();

// Sanitize filename to prevent directory traversal and other attacks
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^[.-]+|[.-]+$/g, '') // Remove leading/trailing dots and dashes
    .substring(0, 100); // Limit length
};

// Generate secure filename
const generateSecureFilename = (originalname: string): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const sanitizedName = sanitizeFilename(path.parse(originalname).name);
  const ext = path.extname(originalname).toLowerCase();
  
  return `${timestamp}-${randomBytes}-${sanitizedName}${ext}`;
};

// Get upload destination based on file type
const getUploadDestination = (fieldname: string): string => {
  switch (fieldname) {
    case 'avatar':
    case 'profilePicture':
      return UPLOAD_CONFIG.UPLOAD_DIRS.avatars;
    case 'document':
    case 'passport':
    case 'birthCertificate':
    case 'policeRecord':
    case 'identityDocument':
    case 'proofOfFamily':
    case 'humanitarianProof':
      return UPLOAD_CONFIG.UPLOAD_DIRS.documents;
    default:
      return UPLOAD_CONFIG.UPLOAD_DIRS.temp;
  }
};

// Enhanced storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = getUploadDestination(file.fieldname);
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      const secureFilename = generateSecureFilename(file.originalname);
      cb(null, secureFilename);
    } catch (error) {
      cb(error as Error, '');
    }
  }
});

// Enhanced file filter with security checks
const fileFilter: multer.Options['fileFilter'] = async (req, file, cb) => {
  try {
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(ext as any)) {
      return cb(new Error(`Invalid file extension. Allowed: ${UPLOAD_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`));
    }

    // Check MIME type
    if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      return cb(new Error(`Invalid MIME type. Allowed: ${UPLOAD_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`));
    }

    // Additional filename security checks
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return cb(new Error('Invalid filename: path traversal attempt detected'));
    }

    // Check for null bytes
    if (file.originalname.includes('\0')) {
      return cb(new Error('Invalid filename: null byte detected'));
    }

    // Filename length check
    if (file.originalname.length > 255) {
      return cb(new Error('Filename too long (max 255 characters)'));
    }

    cb(null, true);
  } catch (error) {
    cb(error as Error);
  }
};

// Additional file validation after upload
export const validateUploadedFile = async (file: Express.Multer.File): Promise<boolean> => {
  try {
    // Read first few bytes to verify file type
    const buffer = await fs.readFile(file.path);
    const fileTypeResult = await fileTypeFromBuffer(buffer.slice(0, 4100));
    
    if (!fileTypeResult) {
      throw new Error('Could not determine file type');
    }

    // Verify MIME type matches file content
    if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(fileTypeResult.mime as any)) {
      throw new Error(`File content does not match allowed types: ${fileTypeResult.mime}`);
    }

    // Additional checks for PDF files
    if (fileTypeResult.mime === 'application/pdf') {
      // Basic PDF header check
      const pdfHeader = buffer.slice(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        throw new Error('Invalid PDF file');
      }
    }

    // Additional checks for image files
    if (fileTypeResult.mime.startsWith('image/')) {
      // Basic image dimension check (optional)
      // Could add image dimension validation here
    }

    return true;
  } catch (error) {
    console.error('File validation error:', error);
    // Clean up invalid file
    try {
      await fs.unlink(file.path);
    } catch (unlinkError) {
      console.error('Error deleting invalid file:', unlinkError);
    }
    throw error;
  }
};

// Clean up temporary files older than 24 hours
export const cleanupTempFiles = async (): Promise<void> => {
  try {
    const tempDir = UPLOAD_CONFIG.UPLOAD_DIRS.temp;
    const files = await fs.readdir(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filePath);
        console.log(`Cleaned up old temp file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error during temp file cleanup:', error);
  }
};

// Schedule cleanup every hour
setInterval(cleanupTempFiles, 60 * 60 * 1000);

// Base multer configuration
const baseUploadConfig: multer.Options = {
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
    files: UPLOAD_CONFIG.MAX_FILES,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 1024
  }
};

// Export different upload configurations
export const upload = multer(baseUploadConfig);

export const uploadSingle = (fieldName: string) => 
  multer(baseUploadConfig).single(fieldName);

export const uploadMultiple = (fieldName: string, maxCount: number = UPLOAD_CONFIG.MAX_FILES) => 
  multer(baseUploadConfig).array(fieldName, maxCount);

export const uploadFields = (fields: { name: string; maxCount: number }[]) => 
  multer(baseUploadConfig).fields(fields);

// Export configuration for reference
export { UPLOAD_CONFIG };
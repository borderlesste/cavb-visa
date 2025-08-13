"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_CONFIG = exports.uploadFields = exports.uploadMultiple = exports.uploadSingle = exports.upload = exports.cleanupTempFiles = exports.validateUploadedFile = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const crypto_1 = __importDefault(require("crypto"));
const file_type_1 = require("file-type");
// File upload configuration
const UPLOAD_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES: 5,
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
    UPLOAD_DIRS: {
        documents: 'uploads/documents',
        avatars: 'uploads/avatars',
        temp: 'uploads/temp'
    }
};
exports.UPLOAD_CONFIG = UPLOAD_CONFIG;
// Create upload directories if they don't exist
const ensureUploadDirs = async () => {
    try {
        for (const dir of Object.values(UPLOAD_CONFIG.UPLOAD_DIRS)) {
            await promises_1.default.mkdir(dir, { recursive: true });
        }
    }
    catch (error) {
        console.error('Error creating upload directories:', error);
    }
};
// Initialize directories
ensureUploadDirs();
// Sanitize filename to prevent directory traversal and other attacks
const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
        .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
        .replace(/^[.-]+|[.-]+$/g, '') // Remove leading/trailing dots and dashes
        .substring(0, 100); // Limit length
};
// Generate secure filename
const generateSecureFilename = (originalname) => {
    const timestamp = Date.now();
    const randomBytes = crypto_1.default.randomBytes(8).toString('hex');
    const sanitizedName = sanitizeFilename(path_1.default.parse(originalname).name);
    const ext = path_1.default.extname(originalname).toLowerCase();
    return `${timestamp}-${randomBytes}-${sanitizedName}${ext}`;
};
// Get upload destination based on file type
const getUploadDestination = (fieldname) => {
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
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const uploadDir = getUploadDestination(file.fieldname);
            await promises_1.default.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        }
        catch (error) {
            cb(error, '');
        }
    },
    filename: (req, file, cb) => {
        try {
            const secureFilename = generateSecureFilename(file.originalname);
            cb(null, secureFilename);
        }
        catch (error) {
            cb(error, '');
        }
    }
});
// Enhanced file filter with security checks
const fileFilter = async (req, file, cb) => {
    try {
        // Check file extension
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (!UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
            return cb(new Error(`Invalid file extension. Allowed: ${UPLOAD_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`));
        }
        // Check MIME type
        if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
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
    }
    catch (error) {
        cb(error);
    }
};
// Additional file validation after upload
const validateUploadedFile = async (file) => {
    try {
        // Read first few bytes to verify file type
        const buffer = await promises_1.default.readFile(file.path);
        const fileTypeResult = await (0, file_type_1.fileTypeFromBuffer)(buffer.slice(0, 4100));
        if (!fileTypeResult) {
            throw new Error('Could not determine file type');
        }
        // Verify MIME type matches file content
        if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(fileTypeResult.mime)) {
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
    }
    catch (error) {
        console.error('File validation error:', error);
        // Clean up invalid file
        try {
            await promises_1.default.unlink(file.path);
        }
        catch (unlinkError) {
            console.error('Error deleting invalid file:', unlinkError);
        }
        throw error;
    }
};
exports.validateUploadedFile = validateUploadedFile;
// Clean up temporary files older than 24 hours
const cleanupTempFiles = async () => {
    try {
        const tempDir = UPLOAD_CONFIG.UPLOAD_DIRS.temp;
        const files = await promises_1.default.readdir(tempDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        for (const file of files) {
            const filePath = path_1.default.join(tempDir, file);
            const stats = await promises_1.default.stat(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
                await promises_1.default.unlink(filePath);
                console.log(`Cleaned up old temp file: ${file}`);
            }
        }
    }
    catch (error) {
        console.error('Error during temp file cleanup:', error);
    }
};
exports.cleanupTempFiles = cleanupTempFiles;
// Schedule cleanup every hour
setInterval(exports.cleanupTempFiles, 60 * 60 * 1000);
// Base multer configuration
const baseUploadConfig = {
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
exports.upload = (0, multer_1.default)(baseUploadConfig);
const uploadSingle = (fieldName) => (0, multer_1.default)(baseUploadConfig).single(fieldName);
exports.uploadSingle = uploadSingle;
const uploadMultiple = (fieldName, maxCount = UPLOAD_CONFIG.MAX_FILES) => (0, multer_1.default)(baseUploadConfig).array(fieldName, maxCount);
exports.uploadMultiple = uploadMultiple;
const uploadFields = (fields) => (0, multer_1.default)(baseUploadConfig).fields(fields);
exports.uploadFields = uploadFields;

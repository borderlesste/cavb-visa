"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAsyncUpload = exports.handleUploadError = void 0;
const multer_1 = __importDefault(require("multer"));
const handleUploadError = (error, req, res, next) => {
    console.error('File upload error:', {
        message: error.message,
        code: error.code,
        field: error.field,
        stack: error.stack
    });
    // Handle specific multer errors
    if (error instanceof multer_1.default.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                res.status(400).json({
                    success: false,
                    message: 'File too large. Maximum size is 10MB.',
                    code: 'FILE_TOO_LARGE'
                });
                return;
            case 'LIMIT_FILE_COUNT':
                res.status(400).json({
                    success: false,
                    message: 'Too many files. Maximum 5 files allowed.',
                    code: 'TOO_MANY_FILES'
                });
                return;
            case 'LIMIT_UNEXPECTED_FILE':
                res.status(400).json({
                    success: false,
                    message: `Unexpected field: ${error.field}`,
                    code: 'UNEXPECTED_FIELD'
                });
                return;
            case 'LIMIT_PART_COUNT':
                res.status(400).json({
                    success: false,
                    message: 'Too many form parts.',
                    code: 'TOO_MANY_PARTS'
                });
                return;
            case 'LIMIT_FIELD_KEY':
                res.status(400).json({
                    success: false,
                    message: 'Field name too long.',
                    code: 'FIELD_NAME_TOO_LONG'
                });
                return;
            case 'LIMIT_FIELD_VALUE':
                res.status(400).json({
                    success: false,
                    message: 'Field value too long.',
                    code: 'FIELD_VALUE_TOO_LONG'
                });
                return;
            case 'LIMIT_FIELD_COUNT':
                res.status(400).json({
                    success: false,
                    message: 'Too many fields.',
                    code: 'TOO_MANY_FIELDS'
                });
                return;
            default:
                res.status(400).json({
                    success: false,
                    message: 'File upload failed.',
                    code: 'UPLOAD_FAILED'
                });
                return;
        }
    }
    // Handle custom validation errors
    if (error.message.includes('Invalid file type') ||
        error.message.includes('Invalid file extension') ||
        error.message.includes('Invalid MIME type')) {
        res.status(400).json({
            success: false,
            message: error.message,
            code: 'INVALID_FILE_TYPE'
        });
        return;
    }
    if (error.message.includes('path traversal') ||
        error.message.includes('null byte') ||
        error.message.includes('Invalid filename')) {
        res.status(400).json({
            success: false,
            message: 'Invalid filename detected.',
            code: 'INVALID_FILENAME'
        });
        return;
    }
    if (error.message.includes('File content does not match')) {
        res.status(400).json({
            success: false,
            message: 'File content validation failed.',
            code: 'CONTENT_VALIDATION_FAILED'
        });
        return;
    }
    // Generic server error
    res.status(500).json({
        success: false,
        message: 'Internal server error during file upload.',
        code: 'INTERNAL_ERROR'
    });
};
exports.handleUploadError = handleUploadError;
// Wrapper to handle async upload validation
const handleAsyncUpload = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (error) => {
            if (error) {
                return (0, exports.handleUploadError)(error, req, res, next);
            }
            next();
        });
    };
};
exports.handleAsyncUpload = handleAsyncUpload;

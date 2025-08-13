# File Upload Security Implementation

This document outlines the secure file upload implementation following security best practices.

## Features Implemented

### 🔒 Security Features

1. **File Type Validation**
   - MIME type verification
   - File extension validation  
   - Magic number/file signature verification using `file-type` library
   - Content validation for PDF and image files

2. **Filename Security**
   - Path traversal prevention (`../`, `./`, `\`)
   - Null byte injection protection
   - Special character sanitization
   - Filename length limits (255 characters)
   - Secure random filename generation

3. **File Size & Limits**
   - Maximum file size: 10MB per file
   - Maximum files per upload: 5
   - Field name and value size limits
   - Total form fields limit

4. **Storage Security**
   - Organized directory structure:
     - `uploads/documents/` - Official documents
     - `uploads/avatars/` - Profile pictures  
     - `uploads/temp/` - Temporary files
   - Automatic directory creation
   - File permissions control

### 🧹 File Management

1. **Automatic Cleanup**
   - Temporary files cleaned every hour
   - Files older than 24 hours removed
   - Invalid files immediately deleted

2. **Error Handling**
   - Comprehensive error messages
   - Specific error codes for different failure types
   - Proper HTTP status codes
   - Logging for security incidents

### 📁 Allowed File Types

- **Images**: JPEG, PNG, WebP
- **Documents**: PDF
- **MIME Types**: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

## Usage Examples

### Single File Upload
```typescript
import { uploadSingle, handleAsyncUpload } from '../middleware/fileUpload';

router.post('/upload', 
  handleAsyncUpload(uploadSingle('document')),
  validateFileMiddleware,
  controller
);
```

### Multiple File Upload
```typescript
import { uploadMultiple } from '../middleware/fileUpload';

router.post('/upload-multiple', 
  handleAsyncUpload(uploadMultiple('documents', 3)),
  controller
);
```

### Field-specific Upload
```typescript
import { uploadFields } from '../middleware/fileUpload';

const uploadConfig = uploadFields([
  { name: 'avatar', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]);

router.post('/upload-mixed', handleAsyncUpload(uploadConfig), controller);
```

## Error Handling

The implementation provides detailed error responses:

```json
{
  "success": false,
  "message": "File too large. Maximum size is 10MB.",
  "code": "FILE_TOO_LARGE"
}
```

### Error Codes

- `FILE_TOO_LARGE` - File exceeds size limit
- `TOO_MANY_FILES` - Too many files in upload
- `INVALID_FILE_TYPE` - Unsupported file type
- `INVALID_FILENAME` - Security issue with filename
- `CONTENT_VALIDATION_FAILED` - File content doesn't match type
- `VALIDATION_FAILED` - General validation error

## Security Considerations

1. **Never trust client-side validation** - All validation happens server-side
2. **File content verification** - Checks magic numbers, not just extensions
3. **Secure storage** - Files stored outside web root when possible
4. **Access control** - Uploaded files served through authenticated endpoints
5. **Regular cleanup** - Prevents disk space exhaustion
6. **Logging** - Security events logged for monitoring

## Configuration

The upload configuration can be modified in `fileUpload.ts`:

```typescript
const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 5,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  // ... more options
};
```

## File Validation Workflow

1. **Pre-upload validation**
   - File extension check
   - MIME type verification
   - Filename security check
   - Size limits

2. **Post-upload validation** 
   - File signature verification
   - Content type matching
   - Additional format-specific checks

3. **Error handling**
   - Invalid files automatically deleted
   - Detailed error responses
   - Security incident logging

## Dependencies

- `multer` - File upload handling
- `file-type` - File signature detection
- `crypto` - Secure random generation
- `fs/promises` - Async file operations

This implementation provides enterprise-grade security for file uploads while maintaining ease of use and clear error handling.
import { Router } from 'express';
import { getApplication, createApplication, uploadDocument, scheduleAppointment, getAllUserApplications, getApplicationById, deleteApplication, editApplication, getAppointmentAvailability } from '../controllers/applicationController';
import { protect } from '../middleware/authMiddleware';
import { applicationLimiter, uploadLimiter } from '../middleware/rateLimiter';
import { uploadSingle, validateUploadedFile } from '../middleware/fileUpload';
import { handleAsyncUpload } from '../middleware/uploadErrorHandler';

const router = Router();

// All routes in this file are protected
router.use(protect);

router.route('/')
    .get(getApplication)
    .post(applicationLimiter, createApplication);

// Get all user applications
router.get('/all', getAllUserApplications);

// Get specific application by ID
router.get('/:applicationId', getApplicationById);

// Delete specific application by ID
router.delete('/:applicationId', deleteApplication);

// Edit specific application by ID
router.put('/:applicationId', editApplication);

// Route to handle document uploads with strict rate limiting and validation
router.post('/documents/:docId', 
  uploadLimiter, 
  handleAsyncUpload(uploadSingle('document')),
  async (req, res, next) => {
    try {
      if (req.file) {
        await validateUploadedFile(req.file);
      }
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'File validation failed',
        code: 'VALIDATION_FAILED'
      });
    }
  },
  uploadDocument
);

// Route to handle appointment scheduling
router.post('/appointment', scheduleAppointment);

// Route to get appointment availability
router.get('/appointments/availability', getAppointmentAvailability);

export default router;
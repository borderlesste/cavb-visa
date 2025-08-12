
import { Router } from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware';
import { getAllApplications, updateDocumentStatus, updateApplicationStatus, getAnalytics, getAppointments } from '../controllers/adminController';

const router = Router();

// Protect all routes in this file and require admin role
router.use(protect, isAdmin);

router.get('/applications', getAllApplications);
router.put('/applications/:applicationId/documents/:docId', updateDocumentStatus);
router.put('/applications/:applicationId/status', updateApplicationStatus);
router.get('/analytics', getAnalytics);
router.get('/appointments', getAppointments);

export default router;

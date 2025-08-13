"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const applicationController_1 = require("../controllers/applicationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const fileUpload_1 = require("../middleware/fileUpload");
const uploadErrorHandler_1 = require("../middleware/uploadErrorHandler");
const router = (0, express_1.Router)();
// All routes in this file are protected
router.use(authMiddleware_1.protect);
router.route('/')
    .get(applicationController_1.getApplication)
    .post(rateLimiter_1.applicationLimiter, applicationController_1.createApplication);
// Get all user applications
router.get('/all', applicationController_1.getAllUserApplications);
// Get specific application by ID
router.get('/:applicationId', applicationController_1.getApplicationById);
// Delete specific application by ID
router.delete('/:applicationId', applicationController_1.deleteApplication);
// Edit specific application by ID
router.put('/:applicationId', applicationController_1.editApplication);
// Route to handle document uploads with strict rate limiting and validation
router.post('/documents/:docId', rateLimiter_1.uploadLimiter, (0, uploadErrorHandler_1.handleAsyncUpload)((0, fileUpload_1.uploadSingle)('document')), async (req, res, next) => {
    try {
        if (req.file) {
            await (0, fileUpload_1.validateUploadedFile)(req.file);
        }
        next();
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'File validation failed',
            code: 'VALIDATION_FAILED'
        });
    }
}, applicationController_1.uploadDocument);
// Route to handle appointment scheduling
router.post('/appointment', applicationController_1.scheduleAppointment);
// Route to get appointment availability
router.get('/appointments/availability', applicationController_1.getAppointmentAvailability);
exports.default = router;

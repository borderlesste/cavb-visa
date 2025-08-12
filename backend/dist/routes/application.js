"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const applicationController_1 = require("../controllers/applicationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const multer_1 = __importDefault(require("multer"));
// Configure multer for file uploads. It will save files to an 'uploads' directory.
const upload = (0, multer_1.default)({ dest: 'uploads/' });
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
// Route to handle document uploads with strict rate limiting
router.post('/documents/:docId', rateLimiter_1.uploadLimiter, upload.single('document'), applicationController_1.uploadDocument);
// Route to handle appointment scheduling
router.post('/appointment', applicationController_1.scheduleAppointment);
exports.default = router;

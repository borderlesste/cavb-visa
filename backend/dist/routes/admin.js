"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
// Protect all routes in this file and require admin role
router.use(authMiddleware_1.protect, authMiddleware_1.isAdmin);
router.get('/applications', adminController_1.getAllApplications);
router.put('/applications/:applicationId/documents/:docId', adminController_1.updateDocumentStatus);
router.put('/applications/:applicationId/status', adminController_1.updateApplicationStatus);
router.get('/analytics', adminController_1.getAnalytics);
router.get('/appointments', adminController_1.getAppointments);
exports.default = router;

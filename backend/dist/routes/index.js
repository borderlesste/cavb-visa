"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const application_1 = __importDefault(require("./application"));
const admin_1 = __importDefault(require("./admin"));
const notifications_1 = __importDefault(require("./notifications"));
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
// Apply API-specific rate limiting to all API routes
router.use(rateLimiter_1.apiLimiter);
router.use('/auth', auth_1.default);
router.use('/applications', application_1.default);
router.use('/admin', admin_1.default);
router.use('/notifications', notifications_1.default);
exports.default = router;

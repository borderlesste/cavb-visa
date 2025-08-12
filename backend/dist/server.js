"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const routes_1 = __importDefault(require("./routes"));
const websocket_1 = require("./websocket");
const corsConfig_1 = require("./middleware/corsConfig");
const rateLimiter_1 = require("./middleware/rateLimiter");
const authMiddleware_1 = require("./middleware/authMiddleware");
// Load environment variables from .env file
dotenv_1.default.config();
// Test the database connection on startup
(0, db_1.testConnection)();
(0, db_1.runMigrations)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Security Middlewares
// Apply global rate limiting
app.use(rateLimiter_1.globalLimiter);
// Enable CORS with secure configuration
app.use((0, cors_1.default)(corsConfig_1.corsOptions));
// To parse incoming requests with JSON payloads
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Serve uploaded files with authentication
app.use('/uploads', authMiddleware_1.protect, express_1.default.static('uploads', {
    maxAge: '1d',
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
    }
}));
// API Routes
app.use('/api', routes_1.default);
// Basic health-check route
app.get('/api/health', (req, res) => {
    res.status(200).send({ status: 'ok', message: 'IOM Visa Application Backend is running!' });
});
// Root health for container checks
app.get('/health', (_req, res) => {
    res.status(200).send('ok');
});
// Start the server
const server = app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
// Initialize WebSocket Server
(0, websocket_1.initializeWebSocket)(server);

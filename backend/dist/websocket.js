"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebSocket = void 0;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const url_1 = require("url");
const webSocketService_1 = require("./services/webSocketService");
const initializeWebSocket = (server) => {
    const wss = new ws_1.WebSocketServer({ server });
    wss.on('connection', (ws, req) => {
        try {
            // Build a safe base URL even if some headers are missing (e.g., behind proxies)
            const host = req.headers.host || 'localhost:4000';
            const reqUrl = req.url || '/';
            const url = new url_1.URL(reqUrl, `ws://${host}`);
            const token = url.searchParams.get('token');
            if (!token) {
                console.error('[WebSocket] Connection attempt without token.');
                return ws.close(1008, 'Token required');
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'averysecretkey');
            const userId = typeof decoded === 'object' && decoded && 'id' in decoded ? String(decoded.id) : null;
            if (!userId) {
                console.error('[WebSocket] Token missing user id');
                return ws.close(1008, 'Invalid token payload');
            }
            (0, webSocketService_1.addClient)(userId, ws);
            console.log(`[WebSocket] Client connected: ${userId}`);
            ws.on('close', () => {
                (0, webSocketService_1.removeClient)(userId);
                console.log(`[WebSocket] Client disconnected: ${userId}`);
            });
            ws.on('error', (error) => {
                console.error(`[WebSocket] Error for client ${userId}:`, error);
            });
            ws.send(JSON.stringify({ type: 'CONNECTION_ESTABLISHED' }));
        }
        catch (error) {
            console.error('[WebSocket] Authentication error:', error);
            ws.close(1008, 'Invalid token');
        }
    });
    console.log('WebSocket server initialized');
};
exports.initializeWebSocket = initializeWebSocket;

import { Server, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import { addClient, removeClient } from './services/webSocketService';

export const initializeWebSocket = (server: Server) => {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        try {
            // Build a safe base URL even if some headers are missing (e.g., behind proxies)
            const host = req.headers.host || 'localhost:4000';
            const reqUrl = req.url || '/';
            const url = new URL(reqUrl, `ws://${host}`);
            const token = url.searchParams.get('token');
            
            if (!token) {
                console.error('[WebSocket] Connection attempt without token.');
                return ws.close(1008, 'Token required');
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'averysecretkey') as jwt.JwtPayload | string;
            const userId = typeof decoded === 'object' && decoded && 'id' in decoded ? String((decoded as any).id) : null;

            if (!userId) {
                console.error('[WebSocket] Token missing user id');
                return ws.close(1008, 'Invalid token payload');
            }

            addClient(userId, ws);
            console.log(`[WebSocket] Client connected: ${userId}`);

            ws.on('close', () => {
                removeClient(userId);
                console.log(`[WebSocket] Client disconnected: ${userId}`);
            });

            ws.on('error', (error) => {
                console.error(`[WebSocket] Error for client ${userId}:`, error);
            });
            
            ws.send(JSON.stringify({ type: 'CONNECTION_ESTABLISHED' }));

        } catch (error) {
            console.error('[WebSocket] Authentication error:', error);
            ws.close(1008, 'Invalid token');
        }
    });

    console.log('WebSocket server initialized');
};

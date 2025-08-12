"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageToUser = exports.removeClient = exports.addClient = void 0;
const ws_1 = require("ws");
// Map to store connections, userId -> WebSocket
const clients = new Map();
const addClient = (userId, ws) => {
    // If there's an existing connection for the user, close it first.
    if (clients.has(userId)) {
        clients.get(userId)?.close();
    }
    clients.set(userId, ws);
};
exports.addClient = addClient;
const removeClient = (userId) => {
    clients.delete(userId);
};
exports.removeClient = removeClient;
const sendMessageToUser = (userId, message) => {
    const client = clients.get(userId);
    if (client && client.readyState === ws_1.WebSocket.OPEN) {
        try {
            client.send(JSON.stringify(message));
            console.log(`[WebSocket] Sent message to ${userId}:`, message.type);
        }
        catch (error) {
            console.error(`[WebSocket] Failed to send message to ${userId}:`, error);
        }
    }
    else {
        console.log(`[WebSocket] Client ${userId} not connected or not open. Message not sent.`);
    }
};
exports.sendMessageToUser = sendMessageToUser;

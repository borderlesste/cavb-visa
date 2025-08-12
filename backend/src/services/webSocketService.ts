
import { WebSocket } from 'ws';

// Map to store connections, userId -> WebSocket
const clients = new Map<string, WebSocket>();

export const addClient = (userId: string, ws: WebSocket) => {
    // If there's an existing connection for the user, close it first.
    if (clients.has(userId)) {
        clients.get(userId)?.close();
    }
    clients.set(userId, ws);
};

export const removeClient = (userId: string) => {
    clients.delete(userId);
};

export const sendMessageToUser = (userId: string, message: { type: string; [key: string]: any; }) => {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
        try {
             client.send(JSON.stringify(message));
             console.log(`[WebSocket] Sent message to ${userId}:`, message.type);
        } catch (error) {
            console.error(`[WebSocket] Failed to send message to ${userId}:`, error);
        }
    } else {
        console.log(`[WebSocket] Client ${userId} not connected or not open. Message not sent.`);
    }
};

export const sendNotificationToUser = (userId: string, notification: any) => {
    sendMessageToUser(userId, { type: 'NEW_NOTIFICATION', payload: { notification } });
};

export const sendNotificationUpdateToUser = (userId: string, notification: any) => {
    sendMessageToUser(userId, { type: 'NOTIFICATION_UPDATED', payload: { notification } });
};

export const sendNotificationDeletedToUser = (userId: string, id: string) => {
    sendMessageToUser(userId, { type: 'NOTIFICATION_DELETED', payload: { id } });
};
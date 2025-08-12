import { enhancedApi } from './apiInterceptors';
import { API_ROUTES } from '../constants';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: 'APPLICANT' | 'ADMIN';
  timestamp: string;
  isRead: boolean;
  applicationId?: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: 'APPLICANT' | 'ADMIN';
  lastMessage?: Message;
  unreadCount: number;
  applicationId?: string;
}

export interface CreateMessageRequest {
  content: string;
  recipientId: string;
  applicationId?: string;
}

class MessageService {
  private baseUrl = `${API_ROUTES.BASE_URL}/messages`;

  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await enhancedApi.request(`${this.baseUrl}/conversations`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<{
    messages: Message[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await enhancedApi.request(
        `${this.baseUrl}/conversations/${conversationId}?page=${page}&limit=${limit}`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async sendMessage(request: CreateMessageRequest): Promise<Message> {
    try {
      const response = await enhancedApi.request(`${this.baseUrl}`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await enhancedApi.request(`${this.baseUrl}/${messageId}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      await enhancedApi.request(`${this.baseUrl}/conversations/${conversationId}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await enhancedApi.request(`${this.baseUrl}/${messageId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  async searchMessages(query: string, applicationId?: string): Promise<Message[]> {
    try {
      const params = new URLSearchParams({ q: query });
      if (applicationId) {
        params.append('applicationId', applicationId);
      }

      const response = await enhancedApi.request(`${this.baseUrl}/search?${params.toString()}`);
      return await response.json();
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  // Real-time message handling
  setupRealTimeMessages(
    onNewMessage: (message: Message) => void,
    onMessageUpdated: (message: Message) => void,
    onMessageDeleted: (messageId: string) => void
  ): WebSocket | null {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;

      const wsUrl = `${API_ROUTES.WEBSOCKET}?token=${token}&type=messages`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Messages WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'NEW_MESSAGE':
              onNewMessage(data.payload.message);
              break;
            case 'MESSAGE_UPDATED':
              onMessageUpdated(data.payload.message);
              break;
            case 'MESSAGE_DELETED':
              onMessageDeleted(data.payload.messageId);
              break;
            case 'CONNECTION_ESTABLISHED':
              // Optional handshake event from server; ignore safely
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Messages WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('Messages WebSocket disconnected:', event.code, event.reason);
        
        // Attempt to reconnect after 3 seconds
        if (event.code !== 1000) { // Not a normal closure
          setTimeout(() => {
            console.log('Attempting to reconnect messages WebSocket...');
            this.setupRealTimeMessages(onNewMessage, onMessageUpdated, onMessageDeleted);
          }, 3000);
        }
      };

      return ws;
    } catch (error) {
      console.error('Error setting up real-time messages:', error);
      return null;
    }
  }
}

export const messageService = new MessageService();
import express from 'express';
import { pool } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { sendMessageToUser } from '../services/webSocketService';

interface ConversationResponse {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    timestamp: string;
    isRead: boolean;
    applicationId?: string;
  } | null;
  unreadCount: number;
  applicationId?: string;
}

// Ensure consistent participant ordering (lexicographically) so the UNIQUE index (participant_a, participant_b) works reliably.
function canonicalPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

const ENFORCE_APP_ID = process.env.ENFORCE_CONVERSATION_APPLICATION_ID === 'true';

// Helper to fetch conversation summary for a user
async function buildConversationResponse(conversation: any, userId: string, connection: any): Promise<ConversationResponse> {
  // Last message
  const [lastMsgRows]: any = await connection.execute(
    'SELECT id, sender_id as senderId, recipient_id as recipientId, content, is_read as isRead, created_at as createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
    [conversation.id]
  );
  const lastMessage = lastMsgRows[0] || null;

  // Unread count
  const [unreadRows]: any = await connection.execute(
    'SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND recipient_id = ? AND is_read = 0',
    [conversation.id, userId]
  );

  const participantId = conversation.participant_a === userId ? conversation.participant_b : conversation.participant_a;
  const [userRows]: any = await connection.execute('SELECT fullName, role FROM users WHERE id = ?', [participantId]);
  const participantName = userRows[0]?.fullName || 'User';
  const participantRole = (userRows[0]?.role || 'applicant').toUpperCase();

  return {
    id: conversation.id,
    participantId,
    participantName,
    participantRole,
    lastMessage: lastMessage && {
      id: lastMessage.id,
      content: lastMessage.content,
      senderId: lastMessage.senderId,
      senderName: lastMessage.senderId === participantId ? participantName : 'You',
      senderRole: lastMessage.senderId === participantId ? participantRole : 'APPLICANT',
      timestamp: lastMessage.createdAt,
      isRead: !!lastMessage.isRead,
      applicationId: conversation.application_id || undefined
    },
    unreadCount: unreadRows[0].cnt,
    applicationId: conversation.application_id || undefined
  };
}

export const getConversations = async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user?.id;
  const userRole = (req as any).user?.role;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  let connection;
  try {
    connection = await pool.getConnection();

    let conversationsResult: ConversationResponse[] = [];

    if (userRole === 'admin') {
      // Admins can see all users to start a conversation
      const [users]: any = await connection.execute('SELECT id, fullName FROM users WHERE id != ? AND role != "admin"', [userId]);
      
      for (const user of users) {
        // Check for an existing conversation with this user
        const [pairA, pairB] = canonicalPair(userId, user.id);
        const [existingConv]: any = await connection.execute(
          'SELECT * FROM conversations WHERE participant_a = ? AND participant_b = ?',
          [pairA, pairB]
        );

        if (existingConv.length > 0) {
          // If conversation exists, build the full response
          conversationsResult.push(await buildConversationResponse(existingConv[0], userId, connection));
        } else {
          // If no conversation, create a placeholder
          conversationsResult.push({
            id: `new-${user.id}`, // Temporary ID for the frontend
            participantId: user.id,
            participantName: user.fullName,
            participantRole: 'APPLICANT',
            lastMessage: null,
            unreadCount: 0,
            applicationId: undefined, // No application context yet
          });
        }
      }
    } else {
      // Applicants only see their existing conversations
      const [rows]: any = await connection.execute(
        'SELECT * FROM conversations WHERE participant_a = ? OR participant_b = ? ORDER BY updated_at DESC',
        [userId, userId]
      );

      for (const conv of rows) {
        conversationsResult.push(await buildConversationResponse(conv, userId, connection));
      }
    }
    
    // Sort results to have conversations with messages first, then by name
    conversationsResult.sort((a, b) => {
        if (a.lastMessage && !b.lastMessage) return -1;
        if (!a.lastMessage && b.lastMessage) return 1;
        return a.participantName.localeCompare(b.participantName);
    });

    res.json(conversationsResult);
  } catch (e) {
    console.error('getConversations error', e);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};

export const getMessages = async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { conversationId } = req.params;
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '50'), 10);
  const offset = (page - 1) * limit;

  let connection;
  try {
    connection = await pool.getConnection();
    // Verify access
    const [convRows]: any = await connection.execute(
      'SELECT * FROM conversations WHERE id = ? AND (participant_a = ? OR participant_b = ?)',
      [conversationId, userId, userId]
    );
    if (convRows.length === 0) return res.status(404).json({ message: 'Conversation not found' });
    if (ENFORCE_APP_ID && !convRows[0].application_id) {
      return res.status(400).json({ message: 'Conversation missing applicationId (enforcement active)' });
    }

    const [countRows]: any = await connection.execute(
      'SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ?',
      [conversationId]
    );
    const total = countRows[0].cnt;

    const [msgRows]: any = await connection.execute(
      'SELECT id, sender_id as senderId, recipient_id as recipientId, content, is_read as isRead, application_id as applicationId, created_at as createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
      [conversationId, limit, offset]
    );

    const messages = msgRows.map((m: any) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      senderName: '', // Filled on client if needed
      senderRole: 'APPLICANT',
      timestamp: m.createdAt,
      isRead: !!m.isRead,
      applicationId: m.applicationId || undefined
    }));

    res.json({
      messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (e) {
    console.error('getMessages error', e);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};

export const sendMessage = async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { content, recipientId, applicationId } = req.body;
  if (!content || !recipientId) return res.status(400).json({ message: 'Missing content or recipientId' });
  if (ENFORCE_APP_ID && !applicationId) {
    return res.status(400).json({ message: 'applicationId is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Normalize pair for deterministic storage
    const [pA, pB] = canonicalPair(userId, recipientId);

    // Find existing conversation (support legacy rows stored without ordering by checking both orders)
    const [convRows]: any = await connection.execute(
      'SELECT * FROM conversations WHERE ((participant_a = ? AND participant_b = ?) OR (participant_a = ? AND participant_b = ?)) AND (application_id <=> ?)',
      [pA, pB, pB, pA, applicationId || null]
    );

    let conversationId: string;
    if (convRows.length > 0) {
      conversationId = convRows[0].id;
      await connection.execute('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);
    } else {
      conversationId = uuidv4();
      await connection.execute(
        'INSERT INTO conversations (id, participant_a, participant_b, application_id) VALUES (?, ?, ?, ?)',
        [conversationId, pA, pB, applicationId || null]
      );
    }

    const messageId = uuidv4();
    await connection.execute(
      'INSERT INTO messages (id, conversation_id, sender_id, recipient_id, content, application_id) VALUES (?, ?, ?, ?, ?, ?)',
      [messageId, conversationId, userId, recipientId, content, applicationId || null]
    );

    await connection.commit();

    const createdMessage = {
      id: messageId,
      content,
      senderId: userId,
      senderName: 'You',
      senderRole: 'APPLICANT',
      timestamp: new Date().toISOString(),
      isRead: false,
      applicationId: applicationId || undefined
    };

    // Push to recipient via websocket
    sendMessageToUser(recipientId, { type: 'NEW_MESSAGE', payload: { message: createdMessage } });

    res.status(201).json(createdMessage);
  } catch (e) {
    if (connection) await connection.rollback();
    console.error('sendMessage error', e);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};

export const markMessageRead = async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { messageId } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows]: any = await connection.execute(
      'UPDATE messages SET is_read = 1 WHERE id = ? AND recipient_id = ?',
      [messageId, userId]
    );
    res.json({ success: rows.affectedRows > 0 });
  } catch (e) {
    console.error('markMessageRead error', e);
    res.status(500).json({ message: 'Internal server error' });
  } finally { if (connection) connection.release(); }
};

export const markConversationRead = async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { conversationId } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(
      'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND recipient_id = ?',
      [conversationId, userId]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('markConversationRead error', e);
    res.status(500).json({ message: 'Internal server error' });
  } finally { if (connection) connection.release(); }
};

export const deleteMessage = async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { messageId } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows]: any = await connection.execute(
      'DELETE FROM messages WHERE id = ? AND sender_id = ?',
      [messageId, userId]
    );
    if (rows.affectedRows === 0) return res.status(404).json({ message: 'Message not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('deleteMessage error', e);
    res.status(500).json({ message: 'Internal server error' });
  } finally { if (connection) connection.release(); }
};

export const searchMessages = async (req: express.Request, res: express.Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const q = String(req.query.q || '').trim();
  const applicationId = req.query.applicationId ? String(req.query.applicationId) : null;
  if (!q) return res.json([]);
  if (ENFORCE_APP_ID && !applicationId) {
    return res.status(400).json({ message: 'applicationId is required for search (enforcement active)' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const params: any[] = [userId, userId, `%${q}%`];
    let sql = 'SELECT m.id, m.content, m.sender_id as senderId, m.recipient_id as recipientId, m.created_at as createdAt, m.is_read as isRead, m.application_id as applicationId, m.conversation_id as conversationId FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE (c.participant_a = ? OR c.participant_b = ?) AND m.content LIKE ?';
    if (applicationId) { sql += ' AND m.application_id = ?'; params.push(applicationId); }
    sql += ' ORDER BY m.created_at DESC LIMIT 50';
    const [rows]: any = await connection.execute(sql, params);
    res.json(rows.map((m: any) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      senderName: '',
      senderRole: 'APPLICANT',
      timestamp: m.createdAt,
      isRead: !!m.isRead,
      applicationId: m.applicationId || undefined
    })));
  } catch (e) {
    console.error('searchMessages error', e);
    res.status(500).json({ message: 'Internal server error' });
  } finally { if (connection) connection.release(); }
};

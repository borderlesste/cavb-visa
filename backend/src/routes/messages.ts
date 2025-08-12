import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { getConversations, getMessages, sendMessage, markMessageRead, markConversationRead, deleteMessage, searchMessages } from '../controllers/messagesController';

const router = Router();
router.use(protect);

router.get('/conversations', getConversations);
router.get('/conversations/:conversationId', getMessages);
router.post('/', sendMessage);
router.put('/:messageId/read', markMessageRead);
router.put('/conversations/:conversationId/read', markConversationRead);
router.delete('/:messageId', deleteMessage);
router.get('/search', searchMessages);

export default router;

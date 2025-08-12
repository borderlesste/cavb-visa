import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../hooks/useApp';
// import { UserRole } from '../types'; // Unused import
import { UserIcon, CloseIcon, CheckCircleIcon } from './Icons';
import { messageService, Message, Conversation } from '../services/messageService';

interface MessagingSystemProps {
    isOpen: boolean;
    onClose: () => void;
    applicationId?: string;
    recipientId?: string;
}

const MessageBubble: React.FC<{ message: Message; isOwnMessage: boolean }> = ({ message, isOwnMessage }) => {
    
    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwnMessage 
                    ? 'bg-iom-blue text-white' 
                    : 'bg-gray-200 text-gray-800'
            }`}>
                <div className="text-sm">
                    {message.content}
                </div>
                <div className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                }`}>
                    <span>{message.senderName}</span>
                    <span className="mx-1">•</span>
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    {isOwnMessage && (
                        <span className="ml-1">
                            {message.isRead ? (
                                <CheckCircleIcon className="w-3 h-3 inline" />
                            ) : (
                                <div className="w-3 h-3 bg-blue-300 rounded-full inline-block" />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const ConversationItem: React.FC<{ 
    conversation: Conversation; 
    isSelected: boolean; 
    onClick: () => void 
}> = ({ conversation, isSelected, onClick }) => {
    const { t } = useApp();
    
    return (
        <div 
            onClick={onClick}
            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                isSelected ? 'bg-blue-50 border-l-4 border-l-iom-blue' : ''
            }`}
        >
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {conversation.participantName}
                        </p>
                        <p className="text-xs text-gray-500">
                            {conversation.lastMessage ? new Date(conversation.lastMessage.timestamp).toLocaleDateString() : ''}
                        </p>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 truncate">
                            {conversation.lastMessage?.content || ''}
                        </p>
                        {conversation.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                {conversation.unreadCount}
                            </span>
                        )}
                    </div>
                    {conversation.applicationId && (
                        <p className="text-xs text-iom-blue">
                            {t('applicationId')}: {conversation.applicationId}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

const MessagingSystem: React.FC<MessagingSystemProps> = ({ 
    isOpen, 
    onClose, 
    applicationId, 
    // recipientId (unused currently)
}) => {
    const { t, user, addNotification } = useApp();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    // const [isInitializing, setIsInitializing] = useState(false); // removed unused state
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        initialize();
        return () => {
            wsRef.current?.close();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (selectedConversationId) {
            fetchMessages(selectedConversationId, true);
        }
    }, [selectedConversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const initialize = async () => {
    // setIsInitializing(true);
        await fetchConversations();
        setupRealtime();
    // setIsInitializing(false);
    };

    const fetchConversations = async () => {
        setIsLoading(true);
        try {
            const data = await messageService.getConversations();
            setConversations(data);

            // Auto-select based on applicationId or provided recipient
            if (applicationId) {
                const byApp = data.find(c => c.applicationId === applicationId);
                if (byApp) setSelectedConversationId(byApp.id);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
            addNotification(t('errorLoadingMessages'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMessages = async (conversationId: string, markRead = false) => {
        try {
            const { messages: msgs } = await messageService.getMessages(conversationId);
            setMessages(msgs);
            if (markRead) {
                try {
                    await messageService.markConversationAsRead(conversationId);
                    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
                } catch (e) {
                    console.warn('Failed to mark conversation read', e);
                }
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            addNotification(t('errorLoadingMessages'), 'error');
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversationId || isSending) return;
        const conversation = conversations.find(c => c.id === selectedConversationId);
        if (!conversation) return;

        setIsSending(true);
        try {
            const request = {
                content: newMessage.trim(),
                recipientId: conversation.participantId,
                applicationId: conversation.applicationId
            };
            const created = await messageService.sendMessage(request);
            setMessages(prev => [...prev, created]);
            setNewMessage('');
            addNotification(t('messageSent'), 'success');
            setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, lastMessage: created, unreadCount: 0 } : c));
        } catch (error) {
            console.error('Error sending message:', error);
            addNotification(t('errorSendingMessage'), 'error');
        } finally {
            setIsSending(false);
        }
    };

    const setupRealtime = () => {
        wsRef.current?.close();
        wsRef.current = messageService.setupRealTimeMessages(
            (message) => {
                // New message belongs to current conversation?
                setConversations(prev => prev.map(c => {
                    if (c.id === message.applicationId || c.id === (message as any).conversationId) {
                        return { ...c, lastMessage: message, unreadCount: c.id === selectedConversationId ? 0 : c.unreadCount + 1 };
                    }
                    return c;
                }));
                if (selectedConversationId) {
                    setMessages(prev => [...prev, message]);
                    scrollToBottom();
                }
            },
            (updated) => {
                setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
            },
            (deletedId) => {
                setMessages(prev => prev.filter(m => m.id !== deletedId));
            }
        );
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 bg-white shadow-lg transition-transform transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex h-full">
                {/* Left Panel: Conversations */}
                <div className="w-1/3 border-r overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">{t('loading')}</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">{t('noConversationsFound')}</div>
                    ) : (
                        conversations.map(conversation => (
                            <ConversationItem
                                key={conversation.id}
                                conversation={conversation}
                                isSelected={conversation.id === selectedConversationId}
                                onClick={() => setSelectedConversationId(conversation.id)}
                            />
                        ))
                    )}
                </div>

                {/* Right Panel: Messages */}
                <div className="w-2/3 flex flex-col">
                    <div className="flex-shrink-0 p-4 border-b">
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800" title={t('closeMessagingSystem')}>
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-500">{t('selectConversationToStartMessaging')}</div>
                        ) : (
                            messages.map(message => (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    isOwnMessage={user ? message.senderId === user.id : false}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="flex-shrink-0 p-4 border-t">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={t('typeMessage')}
                            className="w-full border rounded-lg px-4 py-2"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isSending}
                            className="mt-2 w-full bg-iom-blue text-white rounded-lg px-4 py-2 hover:bg-blue-700"
                        >
                            {t('sendMessage')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessagingSystem;
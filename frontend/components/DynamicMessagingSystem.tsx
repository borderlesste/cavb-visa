import { useState, useEffect } from "react";
import { Send, UserCircle } from "lucide-react";
import { messageService } from "../services/messageService";
import { Conversation, Message } from "../types";

export default function DynamicMessagingSystem({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    // Fetch conversations when the modal opens
    const fetchConversations = async () => {
      try {
        const data: Conversation[] = await messageService.getConversations();
        setConversations(data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    fetchConversations();
  }, [isOpen]);

  const fetchMessages = async (conversationId: string) => {
    try {
      const { messages: msgs }: { messages: Message[] } = await messageService.getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;

    try {
      const request = {
        content: newMessage.trim(),
        recipientId: activeChat.participantId,
        applicationId: activeChat.applicationId,
      };
      const created: Message = await messageService.sendMessage(request);
      setMessages((prev) => [...prev, created]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="w-[80vw] h-[80vh] bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex h-full">
          {/* Lista de usuarios */}
          <aside className="w-1/3 border-r border-gray-200 bg-gray-50">
            <h2 className="px-4 py-3 font-semibold text-lg border-b">Conversaciones</h2>
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No hay conversaciones</div>
            ) : (
              conversations.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChat(chat);
                    fetchMessages(chat.id);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 ${
                    activeChat?.id === chat.id ? "bg-gray-200" : ""
                  }`}
                >
                  <UserCircle className="text-gray-500" size={36} />
                  <div className="flex-1">
                    <p className="font-medium">{chat.participantName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {chat.lastMessage?.content || "Sin mensajes"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </aside>

          {/* Conversación activa */}
          <main className="flex flex-col flex-1">
            {activeChat ? (
              <>
                {/* Encabezado */}
                <header className="px-4 py-3 border-b font-semibold flex justify-between items-center">
                  <span>{activeChat.participantName}</span>
                  <button
                    onClick={onClose}
                    title="Cerrar"
                    className="text-gray-500 hover:text-gray-800"
                  >
                    ✖
                  </button>
                </header>

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[70%] px-4 py-2 rounded-lg shadow-md ${
                        msg.senderId === activeChat.participantId
                          ? "bg-gray-200 text-gray-800"
                          : "bg-blue-600 text-white ml-auto"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>

                {/* Caja de texto */}
                <footer className="p-3 border-t flex gap-2 items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                  />
                  <button
                    onClick={sendMessage}
                    title="Enviar mensaje"
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                  >
                    <Send size={20} />
                  </button>
                </footer>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="mt-2 text-sm">Selecciona un usuario para ver la conversación</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

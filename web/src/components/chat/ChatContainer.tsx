import React, { useState, useRef, useEffect } from 'react';
import ChatBubble from './ChatBubble';
import { Send, Loader2, MessageSquare, Plus, ChevronLeft, Trash2, Paperclip, Mic, MicOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@store/chatStore';
import { useConversations, useMessages, useCreateConversation, useSendMessage } from '@hooks/useChat';

const ChatContainer = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // === INTEGRACIÓN CON EL BACKEND ===
  const { activeConversationId, messages, isLoading, setActiveConversation } = useChatStore();
  const { data: conversations } = useConversations();
  useMessages(activeConversationId); // fetch messages when active conversation changes
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();

  // Crear una conversación por defecto si no hay ninguna
  useEffect(() => {
    if (!activeConversationId && conversations && conversations.length > 0) {
      setActiveConversation(conversations[0].id);
    } else if (!activeConversationId && conversations && conversations.length === 0) {
      // Create initial chat
      createConversation.mutate("Nuevo chat", {
        onSuccess: (conv) => setActiveConversation(conv.id)
      });
    }
  }, [activeConversationId, conversations, setActiveConversation, createConversation]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleNewChat = () => {
    createConversation.mutate("Nuevo chat", {
      onSuccess: (conv) => {
        setActiveConversation(conv.id);
        setSidebarOpen(false);
      }
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversationId) return;

    sendMessage.mutate({ conversationId: activeConversationId, content: input });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-transparent relative overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-center relative shrink-0 bg-white dark:bg-gray-900/50 dark:backdrop-blur-sm transition-colors duration-300">
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="absolute left-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <img src="/logo.png" alt="Pegasus Mechanics Logo" className="h-12 md:h-16 object-contain drop-shadow-md" />
        <div className="absolute right-4 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>

      {/* Sliding sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 dark:bg-black/50 z-10"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-gray-950 shadow-2xl z-20 flex flex-col border-r border-gray-100 dark:border-gray-800 transition-colors duration-300"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wider">Chats guardados</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <button
                onClick={handleNewChat}
                className="mx-4 mt-4 flex items-center gap-2 bg-auteco-red text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-auteco-red/90 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Nuevo chat
              </button>

              <div className="flex-1 overflow-y-auto mt-3 px-3 pb-4 space-y-1">
                {conversations?.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => { setActiveConversation(chat.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all group ${
                      chat.id === activeConversationId
                        ? 'bg-auteco-blue/10 text-auteco-blue dark:bg-auteco-red/20 dark:text-auteco-red font-semibold'
                        : 'hover:bg-gray-100 text-gray-600 dark:hover:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="text-sm truncate">{chat.title || 'Chat'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
            <MessageSquare className="w-12 h-12 mb-2" />
            <p>Comienza a escribir para consultar el manual</p>
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble key={msg.id} sender={msg.role === 'user' ? 'User' : 'IA'} text={msg.content} timestamp={new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-xs italic ml-4">
            <Loader2 className="w-3 h-3 animate-spin" />
            Pegasus está buscando en los manuales...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 dark:backdrop-blur-sm shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-2">
          {/* Text input + send */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={'¿Qué deseas preguntar el día de hoy?'}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-xl py-3 pl-4 pr-12 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 shadow-inner focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || !activeConversationId}
            />
            <button
              type="submit"
              disabled={isLoading || !activeConversationId}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-auteco-red text-white p-2 rounded-lg hover:opacity-90 transition-all active:scale-90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatContainer;

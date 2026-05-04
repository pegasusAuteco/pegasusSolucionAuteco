import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatBubble from './ChatBubble';
import { Send, Loader2, MessageSquare, Plus, ChevronLeft, Trash2, Paperclip, Mic, MicOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_MSG = {
  id: 1,
  sender: 'IA',
  text: 'Hola, soy tu asistente Pegasus. ¿En qué puedo ayudarte hoy?',
  timestamp: '09:00 AM',
};

let chatIdCounter = 2;

const ChatContainer = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const [chats, setChats] = useState([
    { id: 1, title: 'Nuevo chat', messages: [INITIAL_MSG] },
  ]);
  const [activeChatId, setActiveChatId] = useState(1);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const createNewChat = () => {
    const newId = ++chatIdCounter;
    const newChat = {
      id: newId,
      title: 'Nuevo chat',
      messages: [{ ...INITIAL_MSG, id: Date.now() }],
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newId);
    setSidebarOpen(false);
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    setChats(prev => {
      const remaining = prev.filter(c => c.id !== id);
      if (remaining.length === 0) {
        const newId = ++chatIdCounter;
        const fresh = { id: newId, title: 'Nuevo chat', messages: [{ ...INITIAL_MSG, id: Date.now() }] };
        setActiveChatId(newId);
        return [fresh];
      }
      if (id === activeChatId) setActiveChatId(remaining[0].id);
      return remaining;
    });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'User',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update title of chat with first user message
    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const newTitle = c.title === 'Nuevo chat' ? input.slice(0, 30) : c.title;
      return { ...c, title: newTitle, messages: [...c.messages, userMsg] };
    }));

    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const iaMsg = {
        id: Date.now() + 1,
        sender: 'IA',
        text: `Entendido. He analizado tu consulta sobre "${userMsg.text}". Para proceder con el diagnóstico técnico, necesitaré el modelo específico o el código de error si está disponible.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChats(prev => prev.map(c =>
        c.id === activeChatId ? { ...c, messages: [...c.messages, iaMsg] } : c
      ));
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">

      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-center relative shrink-0">
        {/* Hamburger button top-left */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="absolute left-4 p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          title="Historial de chats"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <img src="/logo.png" alt="Pegasus Mechanics Logo" className="h-20 object-contain" />

        <div className="absolute right-4 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>

      {/* Sliding sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 z-10"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl z-20 flex flex-col"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Chats guardados</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* New chat button */}
              <button
                onClick={createNewChat}
                className="mx-4 mt-4 flex items-center gap-2 bg-auteco-red text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-auteco-red/90 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Nuevo chat
              </button>

              {/* Chat list */}
              <div className="flex-1 overflow-y-auto mt-3 px-3 pb-4 space-y-1">
                {chats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => { setActiveChatId(chat.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all group ${
                      chat.id === activeChatId
                        ? 'bg-auteco-blue/10 text-auteco-blue font-semibold'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="text-sm truncate">{chat.title}</span>
                    </div>
                    <span
                      onClick={(e) => deleteChat(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth"
      >
        {messages.map(msg => (
          <ChatBubble key={msg.id} {...msg} />
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-gray-400 text-xs italic ml-4">
            <Loader2 className="w-3 h-3 animate-spin" />
            Pegasus está escribiendo...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white shrink-0">
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <img src={imagePreview} alt="preview" className="h-16 rounded-lg object-cover border border-gray-200" />
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="absolute -top-1.5 -right-1.5 bg-white border border-gray-200 rounded-full p-0.5 shadow hover:bg-red-50 transition-colors"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => setImagePreview(ev.target.result);
                reader.readAsDataURL(file);
              }
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Subir imagen"
            className="p-2 rounded-xl text-gray-400 hover:text-auteco-red hover:bg-red-50 transition-all"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Voice button */}
          <button
            type="button"
            title={isRecording ? 'Detener grabación' : 'Hablar por voz'}
            onClick={() => {
              if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                alert('Tu navegador no soporta reconocimiento de voz.');
                return;
              }
              if (isRecording) {
                recognitionRef.current?.stop();
                setIsRecording(false);
                return;
              }
              const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
              const recognition = new SR();
              recognition.lang = 'es-CO';
              recognition.continuous = false;
              recognition.interimResults = false;
              recognition.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                setInput(prev => prev ? prev + ' ' + transcript : transcript);
              };
              recognition.onerror = () => setIsRecording(false);
              recognition.onend = () => setIsRecording(false);
              recognitionRef.current = recognition;
              recognition.start();
              setIsRecording(true);
            }}
            className={`p-2 rounded-xl transition-all ${
              isRecording
                ? 'text-white bg-auteco-red animate-pulse'
                : 'text-gray-400 hover:text-auteco-red hover:bg-red-50'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text input + send */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={isRecording ? '🎙 Escuchando...' : '¿Qué deseas preguntar el día de hoy?'}
              className="w-full bg-gray-50 border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-auteco-red transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-auteco-red text-white p-2 rounded-lg hover:opacity-90 transition-all active:scale-90"
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

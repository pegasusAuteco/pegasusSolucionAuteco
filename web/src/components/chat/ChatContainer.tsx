import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatBubble from './ChatBubble';
import { Send, Loader2 } from 'lucide-react';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import { useMessages, useSendMessage } from '@hooks/useChat';
import type { Message } from '@types';

const STREAM_INTERVAL_MS = 16;

const ChatContainer = () => {
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = useAuthStore((s) => s.user);
  const userName = user?.name || user?.email || 'Mecánico';

  const {
    activeConversationId,
    messages,
    isLoading,
    pendingChatInput,
    setPendingChatInput,
    addMessage,
  } = useChatStore();

  useMessages(activeConversationId);
  const sendMessage = useSendMessage();

  // Reset streaming when switching conversations
  useEffect(() => {
    if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
    setIsStreaming(false);
    setStreamingText('');
  }, [activeConversationId]);

  useEffect(() => {
    return () => { if (streamTimerRef.current) clearTimeout(streamTimerRef.current); };
  }, []);

  useEffect(() => {
    if (pendingChatInput) {
      setInput(pendingChatInput);
      setPendingChatInput(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [pendingChatInput, setPendingChatInput]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, streamingText]);

  const startStreaming = useCallback((message: Message) => {
    setIsStreaming(true);
    setStreamingText('');
    let i = 0;
    const fullText = message.content;

    const typeNext = () => {
      i++;
      if (i <= fullText.length) {
        setStreamingText(fullText.slice(0, i));
        streamTimerRef.current = setTimeout(typeNext, STREAM_INTERVAL_MS);
      } else {
        setIsStreaming(false);
        setStreamingText('');
        addMessage(message);
      }
    };

    typeNext();
  }, [addMessage]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !activeConversationId || isLoading || isStreaming) return;
    setInput('');
    sendMessage.mutate(
      { conversationId: activeConversationId, content: trimmed },
      { onSuccess: (data) => startStreaming(data) },
    );
  };

  const isBusy = isLoading || isStreaming;
  const showWelcome = messages.length === 0 && !isStreaming;

  const chatInput = (formClass: string, inputClass: string) => (
    <form onSubmit={handleSend} className={formClass}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          placeholder="¿Qué deseas preguntar el día de hoy?"
          className={inputClass}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isBusy || !activeConversationId}
        />
        <button
          type="submit"
          disabled={isBusy || !activeConversationId || !input.trim()}
          className="absolute right-3 bg-auteco-red text-white p-2 rounded-xl hover:opacity-90 transition-all active:scale-90 disabled:opacity-40"
        >
          {isBusy
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-gray-950">
      {showWelcome ? (
        /* ── WELCOME: logo + suggestions + input, all centered ── */
        <div className="flex flex-col items-center justify-center h-full px-6 pb-8 text-center">
          <img
            src="/logo.png"
            alt="Pegasus Mechanics"
            className="h-20 object-contain mb-6 drop-shadow-md"
          />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Hola, {userName}
          </p>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            ¿En qué puedo ayudarte hoy, {userName}?
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-md">
            Consulta manuales técnicos, fichas de motos o información de clientes
          </p>

          {chatInput(
            'w-full max-w-[900px]',
            'w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 pl-5 pr-14 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all outline-none disabled:opacity-50',
          )}
        </div>
      ) : (
        /* ── CHAT MODE: messages + bottom input ── */
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
            <div className="p-4 space-y-2 max-w-3xl mx-auto w-full">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  sender={msg.role === 'user' ? 'User' : 'IA'}
                  text={msg.content}
                  timestamp={new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
              ))}

              {isLoading && !isStreaming && (
                <div className="flex items-center gap-2 text-gray-400 text-xs italic ml-4">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Pegasus está buscando en los manuales...
                </div>
              )}

              {isStreaming && (
                <ChatBubble
                  sender="IA"
                  text={streamingText + '▋'}
                  timestamp=""
                />
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4 shrink-0">
            {chatInput(
              'max-w-3xl mx-auto',
              'w-full bg-[#f8f9fa] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-4 pr-12 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all outline-none disabled:opacity-50',
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatContainer;

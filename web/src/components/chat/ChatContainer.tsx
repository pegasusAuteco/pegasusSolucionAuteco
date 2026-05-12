import React, { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import ChatBubble from './ChatBubble';
import { Send, Loader2, Mic, MicOff, ImagePlus, X } from 'lucide-react';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import { useMessages, useSendMessage } from '@hooks/useChat';
import type { Message } from '@types';

const STREAM_INTERVAL_MS = 16;

const ChatContainer = () => {
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── Audio handlers ────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      // Fallo silencioso si el usuario no otorga permisos de micrófono
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const clearAudio = useCallback(() => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }, [audioUrl]);

  // ── Image handlers ────────────────────────────────────────────────
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearImage = () => { setImagePreview(null); setImageName(null); };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed && !audioBlob && !imagePreview) return;
    if (!activeConversationId || isLoading || isStreaming) return;
    let message = trimmed;
    if (imageName) message += message ? ` [Imagen: ${imageName}]` : `[Imagen: ${imageName}]`;
    if (audioBlob) message += message ? ' [Audio adjunto]' : '[Audio adjunto]';
    setInput('');
    clearAudio();
    clearImage();
    sendMessage.mutate(
      { conversationId: activeConversationId, content: message },
      { onSuccess: (data) => startStreaming(data) },
    );
  };

  const isBusy = isLoading || isStreaming;
  const showWelcome = messages.length === 0 && !isStreaming;

  const canSend = (!!input.trim() || !!audioBlob || !!imagePreview) && !isBusy && !!activeConversationId;

  const chatInput = (formClass: string, inputClass: string) => (
    <div className={formClass}>
      {/* Previews */}
      {(imagePreview || audioUrl) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {imagePreview && (
            <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 pr-2">
              <img src={imagePreview} alt="preview" className="h-9 w-9 rounded object-cover" />
              <span className="max-w-[120px] truncate text-xs text-gray-600">{imageName}</span>
              <button type="button" onClick={clearImage} className="ml-1 text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {audioUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
              <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
              <button type="button" onClick={clearAudio} className="text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2">
        {/* Image upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy || !activeConversationId}
          title="Adjuntar imagen"
          className={`rounded-xl p-2 transition-colors shrink-0 ${
            imagePreview ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } disabled:opacity-40`}
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

        {/* Audio record */}
        <button
          type="button"
          onClick={() => isRecording ? stopRecording() : startRecording()}
          disabled={isBusy || !activeConversationId}
          title={isRecording ? 'Detener grabación' : 'Grabar audio'}
          className={`rounded-xl p-2 transition-colors shrink-0 ${
            isRecording ? 'animate-pulse bg-red-100 text-red-600 hover:bg-red-200'
            : audioBlob ? 'bg-green-100 text-green-600 hover:bg-green-200'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } disabled:opacity-40`}
        >
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {/* Text input */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={isRecording ? '🔴 Grabando...' : '¿Qué deseas preguntar el día de hoy?'}
            className={inputClass}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isBusy || !activeConversationId}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-auteco-red text-white p-2 rounded-xl hover:opacity-90 transition-all active:scale-90 disabled:opacity-40"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
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

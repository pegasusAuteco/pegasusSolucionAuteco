import { useState, useRef, useEffect, useCallback } from 'react';
import ChatBubble from './ChatBubble';
import { Send, Loader2, Mic, MicOff, ImagePlus, X } from 'lucide-react';
import { useChatUI } from '@hooks/useChatUI';
import { useAuthStore } from '@store/authStore';
import { useToastStore } from '@store/toastStore';
import { useMessages, useSendMessage, useCreateConversation } from '@hooks/useChat';
import { useChatWebSocket } from '@hooks/useChatWebSocket';
import { useQueryClient } from '@tanstack/react-query';

const ChatContainer = () => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageName, setImageName] = useState(null);
  const [usePostFallback, setUsePostFallback] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const cancellingRef = useRef(false);
  const isTouchRef = useRef(false);
  const btnRef = useRef(null);
  const releaseHandlerRef = useRef(null);

  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const userName = user?.name || user?.email || 'Mecánico';

  const { activeConversationId, setActiveConversation, pendingChatInput, setPendingChatInput, initError, setInitError } = useChatUI();
  const { data: messages = [], isLoading: isLoadingMessages } = useMessages(activeConversationId);
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();
  const isLoading = isLoadingMessages || sendMessage.isPending || createConversation.isPending;
  const queryClient = useQueryClient();
  const { streamingText, isStreaming, isConnected, sendMessage: wsSend } = useChatWebSocket(
    activeConversationId,
    {
      onError: (msg) => addToast('error', msg),
      onConversationNotFound: () => setActiveConversation(null),
    },
  );

  // Reinicia fallback al cambiar de conversación
  useEffect(() => {
    setUsePostFallback(false);
  }, [activeConversationId]);

  // Si WebSocket no conecta en 3s, cae al POST
  useEffect(() => {
    if (!activeConversationId || isConnected) return;
    const timer = setTimeout(() => setUsePostFallback(true), 3000);
    return () => clearTimeout(timer);
  }, [activeConversationId, isConnected]);

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


  const pickMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/webm',
      'audio/mp4',
    ];
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        if (cancellingRef.current) {
          cancellingRef.current = false;
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
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

  // Limpia el listener global si el componente se desmonta mientras graba
  useEffect(() => {
    return () => {
      if (releaseHandlerRef.current) {
        window.removeEventListener('mouseup', releaseHandlerRef.current);
        window.removeEventListener('touchend', releaseHandlerRef.current);
        window.removeEventListener('touchcancel', releaseHandlerRef.current);
        releaseHandlerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        cancellingRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleMicPress = (e) => {
    if (e.type === 'touchstart') {
      e.preventDefault();
      isTouchRef.current = true;
    } else if (isTouchRef.current) {
      return; // descarta el mousedown sintético que el browser emite tras touchstart
    }

    const handleRelease = (ev) => {
      window.removeEventListener('mouseup', handleRelease);
      window.removeEventListener('touchend', handleRelease);
      window.removeEventListener('touchcancel', handleRelease);
      releaseHandlerRef.current = null;

      if (ev.type === 'touchcancel') {
        cancellingRef.current = true;
      } else {
        const x = ev.type.startsWith('touch') ? ev.changedTouches[0].clientX : ev.clientX;
        const y = ev.type.startsWith('touch') ? ev.changedTouches[0].clientY : ev.clientY;
        if (btnRef.current) {
          const r = btnRef.current.getBoundingClientRect();
          if (x < r.left || x > r.right || y < r.top || y > r.bottom) {
            cancellingRef.current = true;
          }
        }
      }

      stopRecording();
    };

    releaseHandlerRef.current = handleRelease;
    window.addEventListener('mouseup', handleRelease);
    window.addEventListener('touchend', handleRelease);
    window.addEventListener('touchcancel', handleRelease);

    startRecording();
  };

  const clearAudio = useCallback(() => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }, [audioUrl]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearImage = () => { setImagePreview(null); setImageName(null); };

  const doSend = useCallback((convId, message) => {
    if (isConnected && !usePostFallback) {
      wsSend(message);
    } else {
      sendMessage.mutate(
        { conversationId: convId, content: message },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', convId] }) },
      );
    }
  }, [isConnected, usePostFallback, wsSend, sendMessage, queryClient]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed && !audioBlob && !imagePreview) return;
    if (isLoading || isStreaming) return;
    let message = trimmed;
    if (imageName) message += message ? ` [Imagen: ${imageName}]` : `[Imagen: ${imageName}]`;
    if (audioBlob) message += message ? ' [Audio adjunto]' : '[Audio adjunto]';
    setInput('');
    clearAudio();
    clearImage();
    if (activeConversationId) {
      doSend(activeConversationId, message);
    } else {
      createConversation.mutate(undefined, {
        onSuccess: (conv) => {
          setActiveConversation(conv.id);
          doSend(conv.id, message);
        },
      });
    }
  };

  const isBusy = isLoading || isStreaming;
  const showWelcome = messages.length === 0 && !isStreaming;
  const canSend = (!!input.trim() || !!audioBlob || !!imagePreview) && !isBusy;

  if (!activeConversationId) {
    if (initError) {
      return (
        <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-gray-950 items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
          <span className="text-sm font-medium text-red-500 dark:text-red-400">No se pudo iniciar el chat</span>
          <button
            disabled={createConversation.isPending}
            onClick={() => {
              setInitError(false);
              createConversation.mutate('Nuevo chat', {
                onSuccess: (conv) => setActiveConversation(conv.id),
                onError: () => setInitError(true),
              });
            }}
            className="px-4 py-2 bg-auteco-red text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createConversation.isPending ? 'Reintentando...' : 'Reintentar'}
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-gray-950 items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin text-auteco-red" />
        <span className="text-sm font-medium">Cargando conversaciones...</span>
      </div>
    );
  }

  const chatInput = (formClass, inputClass) => (
    <div className={formClass}>
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          title="Adjuntar imagen"
          className={`rounded-xl p-2 transition-colors shrink-0 ${
            imagePreview ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } disabled:opacity-40`}
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

        <button
          ref={btnRef}
          type="button"
          onMouseDown={handleMicPress}
          onTouchStart={handleMicPress}
          disabled={isBusy}
          title={isRecording ? 'Suelta para enviar' : 'Mantén presionado para grabar'}
          className={`rounded-xl p-2 transition-colors shrink-0 ${
            isRecording ? 'animate-pulse bg-red-100 text-red-600 hover:bg-red-200'
            : audioBlob ? 'bg-green-100 text-green-600 hover:bg-green-200'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } disabled:opacity-40`}
        >
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={isRecording ? '🔴 Grabando...' : '¿Qué deseas preguntar el día de hoy?'}
            className={inputClass}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isBusy}
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
                <ChatBubble sender="IA" text={streamingText + '▋'} timestamp="" />
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

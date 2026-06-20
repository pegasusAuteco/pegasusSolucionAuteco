import { useState, useRef, useEffect, useCallback } from 'react';
import ChatBubble from './ChatBubble';
import { Send, Loader2, Mic, MicOff, ImagePlus, X, Lock, Unlock, ChevronUp, Trash2 } from 'lucide-react';
import { useChatUI } from '@hooks/useChatUI';
import { useAuthStore } from '@store/authStore';
import { useToastStore } from '@store/toastStore';
import { useMessages, useSendMessage, useCreateConversation } from '@hooks/useChat';
import { chatService } from '@services/api';
import { useChatWebSocket } from '@hooks/useChatWebSocket';
import { useQueryClient } from '@tanstack/react-query';

const LOCK_THRESHOLD = 60;
const CANCEL_HORIZ = 40;

const ChatContainer = () => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelZone, setIsCancelZone] = useState(false);
  const [isVoiceBusy, setIsVoiceBusy] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageName, setImageName] = useState(null);
  const [usePostFallback, setUsePostFallback] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isFingerDown, setIsFingerDown] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const cancellingRef = useRef(false);
  const isTouchRef = useRef(false);
  const btnRef = useRef(null);
  const releaseHandlerRef = useRef(null);
  const moveHandlerRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasAnimRef = useRef(null);
  const waveHistoryRef = useRef([]);
  const smoothedHistoryRef = useRef([]);
  const stoppingRef = useRef(false);
  const stopTimeRef = useRef(0);
  const startTimeRef = useRef(0);
  const conversationIdRef = useRef(null);
  const pendingBlobRef = useRef(null);
  const enviarAudioRef = useRef(null);
  const pausedAudioRef = useRef(null);
  const isLockedRef = useRef(false);

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

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);


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

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;
      audioContextRef.current = audioContext;

      startTimeRef.current = Date.now();
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 250);

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
        stream.getTracks().forEach(t => t.stop());
        const convId = conversationIdRef.current;
        if (convId) {
          enviarAudioRef.current?.(blob, convId);
        } else {
          pendingBlobRef.current = blob;
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      // Fallo silencioso si el usuario no otorga permisos de micrófono
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    audioContextRef.current?.close(); audioContextRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsLocked(false);
    isLockedRef.current = false;
  }, []);

  useEffect(() => {
    const BAR_W = 2;
    const BAR_GAP = 1;
    const FADE_OUT_MS = 600;

    const drawBars = (ctx, W, H, scale = 1) => {
      ctx.clearRect(0, 0, W, H);
      const history = smoothedHistoryRef.current;
      const now = performance.now();
      const maxBars = Math.floor(W / (BAR_W + BAR_GAP));
      const canvasDuration = maxBars * 80;
      for (let i = 0; i < history.length; i++) {
        const bar = history[i];
        const age = now - bar.t;
        const barAge = history[history.length - 1].t - bar.t;
        const tailFade = barAge > canvasDuration
          ? 0
          : barAge > canvasDuration - 400
          ? (canvasDuration - barAge) / 400
          : 1;
        const barScale = Math.min(1, age / 300) * scale * tailFade;
        const barH = Math.max(2 * barScale, bar.level * H * 0.9 * barScale);
        const x = W - (history.length - i) * (BAR_W + BAR_GAP);
        const y = (H - barH) / 2;
        const r = BAR_W / 2;
        const progress = history.length > 1 ? i / (history.length - 1) : 1;
        ctx.fillStyle = `rgba(225,6,0,${(0.3 + progress * 0.7) * barScale})`;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, BAR_W, barH, r);
        } else {
          ctx.rect(x, y, BAR_W, barH);
        }
        ctx.fill();
      }
    };

    const syncCanvas = (canvas, ctx) => {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const targetW = Math.round(W * dpr);
      const targetH = Math.round(H * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { W, H };
    };

    if (!isRecording) {
      stoppingRef.current = true;
      stopTimeRef.current = performance.now();
      if (smoothedHistoryRef.current.length === 0) {
        if (canvasAnimRef.current) { cancelAnimationFrame(canvasAnimRef.current); canvasAnimRef.current = null; }
        stoppingRef.current = false;
        return;
      }
      let fadeAnimId;
      const drawFadeOut = () => {
        const timeSinceStop = performance.now() - stopTimeRef.current;
        const canvas = canvasRef.current;
        if (!canvas || timeSinceStop >= FADE_OUT_MS) {
          waveHistoryRef.current = [];
          smoothedHistoryRef.current = [];
          stoppingRef.current = false;
          canvasAnimRef.current = null;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const dpr = window.devicePixelRatio || 1;
              ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
              ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
            }
          }
          return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const { W, H } = syncCanvas(canvas, ctx);
        const fadeOut = Math.max(0, 1 - timeSinceStop / FADE_OUT_MS);
        drawBars(ctx, W, H, fadeOut);
        fadeAnimId = requestAnimationFrame(drawFadeOut);
        canvasAnimRef.current = fadeAnimId;
      };
      if (canvasAnimRef.current) cancelAnimationFrame(canvasAnimRef.current);
      fadeAnimId = requestAnimationFrame(drawFadeOut);
      canvasAnimRef.current = fadeAnimId;
      return () => {
        cancelAnimationFrame(fadeAnimId);
        canvasAnimRef.current = null;
        stoppingRef.current = false;
      };
    }

    stoppingRef.current = false;
    waveHistoryRef.current = [];
    smoothedHistoryRef.current = [];
    let animId;
    let lastSampleTime = 0;
    const SAMPLE_INTERVAL = 80;

    const draw = (timestamp) => {
      const canvas = canvasRef.current;
      if (!canvas) { animId = requestAnimationFrame(draw); canvasAnimRef.current = animId; return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { W, H } = syncCanvas(canvas, ctx);
      const maxBars = Math.floor(W / (BAR_W + BAR_GAP));
      if (timestamp - lastSampleTime >= SAMPLE_INTERVAL) {
        lastSampleTime = timestamp;
        let level = 0;
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          level = data.reduce((a, b) => a + b, 0) / data.length / 128;
        }
        waveHistoryRef.current.push({ level, t: performance.now() });
        if (waveHistoryRef.current.length > maxBars) waveHistoryRef.current.shift();
        const SMOOTHING = 0.6;
        const prev = smoothedHistoryRef.current[smoothedHistoryRef.current.length - 1]?.level ?? 0;
        smoothedHistoryRef.current.push({ level: prev + SMOOTHING * (level - prev), t: performance.now() });
        if (smoothedHistoryRef.current.length > maxBars) smoothedHistoryRef.current.shift();
      }
      drawBars(ctx, W, H);
      animId = requestAnimationFrame(draw);
      canvasAnimRef.current = animId;
    };

    animId = requestAnimationFrame(draw);
    canvasAnimRef.current = animId;
    return () => {
      cancelAnimationFrame(animId);
      canvasAnimRef.current = null;
    };
  }, [isRecording]);

  // Limpia los listeners globales si el componente se desmonta mientras graba
  useEffect(() => {
    return () => {
      if (releaseHandlerRef.current) {
        window.removeEventListener('mouseup', releaseHandlerRef.current);
        window.removeEventListener('touchend', releaseHandlerRef.current);
        window.removeEventListener('touchcancel', releaseHandlerRef.current);
        releaseHandlerRef.current = null;
      }
      if (moveHandlerRef.current) {
        window.removeEventListener('mousemove', moveHandlerRef.current);
        window.removeEventListener('touchmove', moveHandlerRef.current);
        moveHandlerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        cancellingRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => { conversationIdRef.current = activeConversationId; }, [activeConversationId]);

  const enviarAudio = useCallback(async (blob, convId) => {
    setIsVoiceBusy(true);
    let result = null;
    try {
      result = await chatService.sendVoice(blob, convId);
    } catch (err) {
      const detail = err?.detail || err?.message || 'Error al procesar el audio';
      addToast('error', detail);
    } finally {
      if (result) {
        // El backend siempre guarda la respuesta del asistente (incluso en silencio),
        // así que recargamos el historial para mostrar la burbuja con texto y audio.
        queryClient.invalidateQueries({ queryKey: ['messages', convId] });
      }
      setIsVoiceBusy(false);
    }
  }, [addToast, queryClient]);


  useEffect(() => { enviarAudioRef.current = enviarAudio; }, [enviarAudio]);

  useEffect(() => {
    if (activeConversationId && pendingBlobRef.current) {
      const blob = pendingBlobRef.current;
      pendingBlobRef.current = null;
      enviarAudio(blob, activeConversationId);
    }
  }, [activeConversationId, enviarAudio]);

  const handleMicPress = (e) => {
    if (isLockedRef.current) return;
    if (e.type === 'touchstart') {
      e.preventDefault();
      isTouchRef.current = true;
    } else if (isTouchRef.current) {
      return; // descarta el mousedown sintético que el browser emite tras touchstart
    }

    const handleRelease = (ev) => {
      if (isLockedRef.current) {
        // manos libres confirmado: soltó estando trabado.
        // NO enviar ni cancelar — los botones Enviar/Cancelar mandan.
        window.removeEventListener('mouseup', releaseHandlerRef.current);
        window.removeEventListener('touchend', releaseHandlerRef.current);
        window.removeEventListener('touchcancel', releaseHandlerRef.current);
        window.removeEventListener('mousemove', moveHandlerRef.current);
        window.removeEventListener('touchmove', moveHandlerRef.current);
        releaseHandlerRef.current = null;
        moveHandlerRef.current = null;
        setIsCancelZone(false);
        setIsFingerDown(false);
        return;
      }
      window.removeEventListener('mouseup', handleRelease);
      window.removeEventListener('touchend', handleRelease);
      window.removeEventListener('touchcancel', handleRelease);
      releaseHandlerRef.current = null;

      window.removeEventListener('mousemove', moveHandlerRef.current);
      window.removeEventListener('touchmove', moveHandlerRef.current);
      moveHandlerRef.current = null;
      setIsCancelZone(false);

      if (ev.type === 'touchcancel') {
        cancellingRef.current = true;
      } else {
        const x = ev.type.startsWith('touch') ? ev.changedTouches[0].clientX : ev.clientX;
        const y = ev.type.startsWith('touch') ? ev.changedTouches[0].clientY : ev.clientY;
        if (btnRef.current) {
          const r = btnRef.current.getBoundingClientRect();
          const centerX = r.left + r.width / 2;
          const dentroCorredor = Math.abs(x - centerX) < r.width / 2 + CANCEL_HORIZ;
          const arriba = y < r.top;
          const fueraRect = x < r.left || x > r.right || y < r.top || y > r.bottom;
          const subiendoRectoSinTrabar = arriba && dentroCorredor;
          if (fueraRect && !subiendoRectoSinTrabar) {
            cancellingRef.current = true;
          }
        }
      }

      stopRecording();
      setIsFingerDown(false);

      if (cancellingRef.current && pausedAudioRef.current) {
        const { el, time } = pausedAudioRef.current;
        el.currentTime = time;
        el.play().catch(() => {});
      }
      pausedAudioRef.current = null;
    };

    const handleMove = (ev) => {
      if (!btnRef.current) return;
      const p = ev.touches ? ev.touches[0] : ev;
      const r = btnRef.current.getBoundingClientRect();
      const centerX = r.left + r.width / 2;
      const dentroCorredor = Math.abs(p.clientX - centerX) < r.width / 2 + CANCEL_HORIZ;
      const arriba = p.clientY < r.top;

      // DESTRABAR: ya estaba trabado — evaluar si el dedo bajó de vuelta
      if (isLockedRef.current) {
        const yaNoArriba = !arriba || !dentroCorredor || p.clientY >= r.top - LOCK_THRESHOLD;
        if (yaNoArriba) {
          setIsLocked(false);
          isLockedRef.current = false;
          // cae a la clasificación normal de zonas
        } else {
          return; // sigue trabado y arriba, nada que hacer
        }
      }

      // TRABAR: subió recto más allá del umbral
      if (arriba && dentroCorredor && p.clientY < r.top - LOCK_THRESHOLD) {
        setIsLocked(true);
        isLockedRef.current = true;
        setIsCancelZone(false);
        return;
      }

      // CANCELAR: fuera del rect, pero NO en el corredor recto hacia arriba
      const fueraRect = p.clientX < r.left || p.clientX > r.right || p.clientY < r.top || p.clientY > r.bottom;
      const subiendoRectoSinTrabar = arriba && dentroCorredor;
      setIsCancelZone(fueraRect && !subiendoRectoSinTrabar);
    };
    moveHandlerRef.current = handleMove;

    releaseHandlerRef.current = handleRelease;
    window.addEventListener('mouseup', handleRelease);
    window.addEventListener('touchend', handleRelease);
    window.addEventListener('touchcancel', handleRelease);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: true });

    const playingAudio = [...document.querySelectorAll('audio')].find(a => !a.paused);
    pausedAudioRef.current = playingAudio
      ? { el: playingAudio, time: playingAudio.currentTime }
      : null;
    if (playingAudio) playingAudio.pause();

    setIsFingerDown(true);
    startRecording();
  };

  const enviarGrabacionTrabada = () => {
    setIsFingerDown(false);
    setIsLocked(false);
    isLockedRef.current = false;
    pausedAudioRef.current = null;
    stopRecording();
  };

  const cancelarGrabacionTrabada = () => {
    cancellingRef.current = true;
    setIsFingerDown(false);
    setIsLocked(false);
    isLockedRef.current = false;
    if (pausedAudioRef.current) {
      const { el, time } = pausedAudioRef.current;
      el.currentTime = time;
      el.play().catch(() => {});
      pausedAudioRef.current = null;
    }
    stopRecording();
  };

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
    if (!trimmed && !imagePreview) return;
    if (isLoading || isStreaming) return;
    let message = trimmed;
    if (imageName) message += message ? ` [Imagen: ${imageName}]` : `[Imagen: ${imageName}]`;
    setInput('');
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

  const isBusy = isLoading || isStreaming || isVoiceBusy;
  const showWelcome = messages.length === 0 && !isStreaming;
  const canSend = (!!input.trim() || !!imagePreview) && !isBusy;

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

  const chatInput = (formClass, containerClass) => (
    <div className={formClass}>
      {imagePreview && (
        <div className="mb-2 flex flex-wrap gap-2 px-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 pr-2">
            <img src={imagePreview} alt="preview" className="h-9 w-9 rounded object-cover" />
            <span className="max-w-[120px] truncate text-xs text-gray-600">{imageName}</span>
            <button type="button" onClick={clearImage} className="ml-1 text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className={`flex items-end gap-2 relative px-2 py-2 ${containerClass}`}>
        {/* IZQUIERDA: botón de imagen */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          title="Adjuntar imagen"
          className={`rounded-full p-2.5 shrink-0 self-end transition-colors ${
            imagePreview ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          } disabled:opacity-40`}
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

        {/* CENTRO: textarea u onda/timer */}
        <div className="flex-1 min-w-0 overflow-hidden flex items-center min-h-[40px]">
          {isRecording ? (
            isLocked ? (
              <div className="w-full min-w-0 flex items-center gap-2">
                <canvas ref={canvasRef} className="flex-1 min-w-0 h-10" />
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-auteco-red select-none">
                  {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={cancelarGrabacionTrabada}
                  className="shrink-0 rounded-full p-[7px] bg-transparent border border-gray-400 hover:bg-gray-500/10 transition-colors"
                  title="Cancelar grabación"
                  aria-label="Cancelar grabación"
                >
                  <span className="block w-4 h-4 border border-red-500 rounded-[2px]" />
                </button>
                <button
                  type="button"
                  onClick={enviarGrabacionTrabada}
                  className="shrink-0 rounded-full p-2 bg-auteco-red text-white hover:opacity-90 transition-colors"
                  title="Enviar"
                  aria-label="Enviar"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : isCancelZone ? (
              <span className="w-full h-10 flex items-center justify-center gap-2 text-sm font-medium text-red-500 animate-pulse select-none">
                <Trash2 className="h-4 w-4" />
                Cancelar
              </span>
            ) : (
              <div className="w-full min-w-0 flex items-center gap-2">
                <canvas ref={canvasRef} className="flex-1 min-w-0 h-10" />
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-auteco-red select-none">
                  {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                </span>
              </div>
            )
          ) : (
            <textarea
              ref={inputRef}
              placeholder="¿Qué deseas preguntar el día de hoy?"
              className="w-full bg-transparent resize-none overflow-y-auto block max-h-[200px] leading-6 m-0 px-2 py-2 outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) handleSend(e);
                }
              }}
              rows={1}
              disabled={isBusy}
            />
          )}
        </div>

        {/* DERECHA: slot único que alterna MIC ↔ ENVIAR (oculto en modo trabado) */}
        {((isRecording && !isLocked) || (!isRecording && !canSend)) ? (
          <div className="relative shrink-0 self-end">
            <button
              ref={btnRef}
              type="button"
              onMouseDown={handleMicPress}
              onTouchStart={handleMicPress}
              disabled={isBusy}
              title={isRecording ? 'Suelta para enviar' : 'Mantén presionado para grabar'}
              className={`rounded-full p-2.5 transition-colors ${
                isRecording && isCancelZone ? 'bg-red-500 text-white'
                : isRecording              ? 'animate-pulse bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : isVoiceBusy              ? 'animate-pulse bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                :                            'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              } disabled:opacity-40`}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {isRecording && !isCancelZone && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6
                              flex flex-col items-center gap-1 select-none pointer-events-none">
                {!isLocked ? (
                  <>
                    <Unlock className="h-4 w-4 text-gray-400" />
                    <ChevronUp className="h-4 w-4 text-gray-400 animate-bounce" />
                    <ChevronUp className="h-3 w-3 text-gray-400 opacity-60 -mt-2" />
                    <ChevronUp className="h-2.5 w-2.5 text-gray-400 opacity-30 -mt-2" />
                  </>
                ) : isFingerDown ? (
                  <Lock className="h-5 w-5 text-red-500" />
                ) : (
                  <Lock className="h-5 w-5 text-red-500 animate-pulse" />
                )}
              </div>
            )}
          </div>
        ) : (!isRecording && canSend) ? (
          <button
            type="submit"
            disabled={!canSend}
            className="bg-auteco-red text-white p-2.5 rounded-full shrink-0 self-end hover:opacity-90 transition-all active:scale-90 disabled:opacity-40 z-10"
          >
            {isBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M3 3 L21 12 L3 21 L9 12 Z" />
              </svg>
            )}
          </button>
        ) : null}
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
            'w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm transition-all',
          )}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
            <div className="p-4 space-y-2 max-w-3xl mx-auto w-full">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                />
              ))}
              {(isLoading || isStreaming) && (
                <div className="flex items-center gap-2 text-gray-400 text-xs italic ml-4 mb-4">
                  <Loader2 className="w-4 h-4 animate-spin text-auteco-red" />
                  Pegasus está procesando la respuesta...
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-1 pb-2 sm:p-3 sm:pb-4 shrink-0">
            {chatInput(
              'max-w-3xl mx-auto',
              'w-full bg-[#f8f9fa] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm transition-all',
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatContainer;

import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'

function fmt(sec) {
  if (!isFinite(sec) || isNaN(sec)) return '--:--'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function pauseOtherAudio(except) {
  document.querySelectorAll('audio').forEach(a => { if (a !== except) a.pause() })
}

export default function VoiceMessagePlayer({ src, autoPlay = false, accent = '#6b7280' }) {
  const audioRef = useRef(null)
  const barRef = useRef(null)
  const hasPlayedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoadedMetadata = () => {
      setDuration(isFinite(audio.duration) ? audio.duration : null)
      setLoading(false)
    }
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setCurrentTime(0)
      audio.currentTime = 0
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [autoPlay])

  useEffect(() => {
    const audio = audioRef.current
    if (!autoPlay || !audio) return

    const handleCanPlay = () => {
      if (hasPlayedRef.current) return
      hasPlayedRef.current = true
      pauseOtherAudio(audio)
      audio.play().catch(err => console.warn('[voice] autoplay bloqueado:', err))
    }

    audio.addEventListener('canplay', handleCanPlay)
    if (audio.readyState >= 3) handleCanPlay()

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
      hasPlayedRef.current = false
    }
  }, [autoPlay])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      pauseOtherAudio(audio)
      audio.play().catch(err => console.warn('[voice] play error:', err))
    }
  }, [playing])

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current
    const bar = barRef.current
    if (!audio || !bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
    setCurrentTime(audio.currentTime)
  }, [duration])

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0
  const timeLabel = duration !== null
    ? `${fmt(currentTime)} / ${fmt(duration)}`
    : '--:--'

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 mt-2 w-full min-w-[220px] max-w-[280px] bg-black/[0.04] dark:bg-white/[0.04] rounded-2xl border border-black/[0.04] dark:border-white/[0.04] backdrop-blur-sm transition-all duration-300">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={togglePlay}
        disabled={loading}
        className="group flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white/60 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.06)] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/10 dark:focus:ring-white/10 active:scale-95"
        style={{ color: accent }}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
      >
        {playing
          ? <Pause className="w-4 h-4 transition-transform group-hover:scale-105" fill="currentColor" strokeWidth={1.5} />
          : <Play className="w-4 h-4 ml-0.5 transition-transform group-hover:scale-105" fill="currentColor" strokeWidth={1.5} />
        }
      </button>

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div
          ref={barRef}
          onClick={handleSeek}
          className="group/bar relative h-5 flex items-center cursor-pointer w-full"
          role="slider"
          aria-label="Progreso del audio"
        >
          {/* Fondo semi-transparente de la barra */}
          <div className="absolute w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full transition-colors group-hover/bar:bg-black/15 dark:group-hover/bar:bg-white/15" />
          
          {/* Progreso activo con degradado sutil */}
          <div
            className="absolute h-1.5 left-0 rounded-full transition-all"
            style={{ 
              width: `${progress}%`, 
              background: `linear-gradient(90deg, ${accent}88, ${accent})`,
              boxShadow: `0 0 6px ${accent}40`
            }}
          />

          {/* Indicador de posición (Thumb) minimalista */}
          <div
            className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] opacity-0 group-hover/bar:opacity-100 transition-all duration-200 transform -translate-x-1/2 hover:scale-125"
            style={{ left: `${progress}%`, backgroundColor: accent }}
          >
            <div className="absolute inset-0 bg-white rounded-full m-[2px]" />
          </div>
        </div>
      </div>

      <span className="flex-shrink-0 text-[10px] font-mono font-medium tracking-wide text-gray-500/80 dark:text-gray-400/80 min-w-[50px] text-right select-none">
        {timeLabel}
      </span>
    </div>
  )
}

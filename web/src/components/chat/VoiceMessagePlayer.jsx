import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'

function fmt(sec) {
  if (!isFinite(sec) || isNaN(sec)) return '--:--'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VoiceMessagePlayer({ src, autoPlay = false, accent = '#6b7280' }) {
  const audioRef = useRef(null)
  const barRef = useRef(null)
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

    if (autoPlay) {
      audio.play().catch(err => {
        console.warn('[voice] autoplay bloqueado:', err)
      })
    }

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [autoPlay])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
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
    <div className="flex items-center gap-2 py-1 w-full min-w-[180px] max-w-[260px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={togglePlay}
        disabled={loading}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-opacity disabled:opacity-40 focus:outline-none"
        style={{ color: accent }}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
      >
        {playing
          ? <Pause className="w-4 h-4" fill="currentColor" />
          : <Play className="w-4 h-4" fill="currentColor" />
        }
      </button>

      <div
        ref={barRef}
        onClick={handleSeek}
        className="flex-1 relative h-1.5 rounded-full cursor-pointer bg-black/10 dark:bg-white/20"
        role="slider"
        aria-label="Progreso del audio"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${progress}%`, backgroundColor: accent }}
        />
      </div>

      <span className="flex-shrink-0 text-[10px] tabular-nums opacity-60 min-w-[44px] text-right">
        {timeLabel}
      </span>
    </div>
  )
}

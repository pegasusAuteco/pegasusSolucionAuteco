import { useState, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react'
import { Send, Mic, MicOff, ImagePlus, X } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Audio ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }, [])

  const toggleRecording = () => isRecording ? stopRecording() : startRecording()

  const clearAudio = () => {
    setAudioBlob(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
  }

  // ── Image ──────────────────────────────────────────────────────────
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const clearImage = () => {
    setImagePreview(null)
    setImageName(null)
  }

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !audioBlob && !imagePreview) || disabled) return
    let message = input.trim()
    if (imageName) message += message ? ` [Imagen: ${imageName}]` : `[Imagen: ${imageName}]`
    if (audioBlob) message += message ? ' [Audio adjunto]' : '[Audio adjunto]'
    onSend(message)
    setInput('')
    clearAudio()
    clearImage()
  }

  const canSend = (!!input.trim() || !!audioBlob || !!imagePreview) && !disabled

  return (
    <div className="border-t bg-white px-4 pt-2 pb-4">
      {/* Previews */}
      {(imagePreview || audioUrl) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {imagePreview && (
            <div className="relative inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 pr-2">
              <img src={imagePreview} alt="preview" className="h-10 w-10 rounded object-cover" />
              <span className="max-w-[120px] truncate text-xs text-gray-600">{imageName}</span>
              <button type="button" onClick={clearImage} className="ml-1 text-gray-400 hover:text-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {audioUrl && (
            <div className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
              <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
              <button type="button" onClick={clearAudio} className="text-gray-400 hover:text-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input Row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Image upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Adjuntar imagen"
          className={`rounded-xl p-2 transition-colors ${
            imagePreview
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } disabled:opacity-40`}
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        {/* Audio record */}
        <button
          type="button"
          onClick={toggleRecording}
          disabled={disabled}
          title={isRecording ? 'Detener grabación' : 'Grabar audio'}
          className={`rounded-xl p-2 transition-colors ${
            isRecording
              ? 'animate-pulse bg-red-100 text-red-600 hover:bg-red-200'
              : audioBlob
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } disabled:opacity-40`}
        >
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {/* Text input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isRecording ? '🔴 Grabando...' : 'Escribe tu mensaje...'}
          disabled={disabled}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
        />

        {/* Send */}
        <button
          type="submit"
          disabled={!canSend}
          className="rounded-xl bg-primary-500 p-2 text-white hover:bg-primary-600 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t bg-white p-4">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escribe tu mensaje..."
        disabled={disabled}
        className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className="rounded-xl bg-primary-500 p-2 text-white hover:bg-primary-600 disabled:opacity-50"
      >
        <Send className="h-5 w-5" />
      </button>
    </form>
  )
}

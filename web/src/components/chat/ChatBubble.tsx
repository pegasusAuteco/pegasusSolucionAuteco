import { cn } from '@utils/cn'
import type { Message } from '@types'

interface ChatBubbleProps {
  message: Message
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isUser
            ? 'bg-primary-500 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm',
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <span className="mt-1 block text-xs opacity-70">
          {new Date(message.created_at).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}

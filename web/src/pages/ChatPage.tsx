import { useEffect, useRef } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import { useConversations, useMessages, useCreateConversation, useSendMessage } from '@hooks/useChat'
import { useChatStore } from '@store/chatStore'
import ChatBubble from '@components/chat/ChatBubble'
import ChatInput from '@components/chat/ChatInput'
import EmptyState from '@components/shared/EmptyState'
import CompactMechanicQueue from '@components/workshop/CompactMechanicQueue'

export default function ChatPage() {
  const { activeConversationId, messages, isLoading, setActiveConversation } = useChatStore()
  const { data: conversations } = useConversations()
  const { refetch: refetchMessages } = useMessages(activeConversationId)
  const createConversation = useCreateConversation()
  const sendMessage = useSendMessage()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewChat = () => {
    createConversation.mutate(undefined, {
      onSuccess: (conv) => setActiveConversation(conv.id),
    })
  }

  const handleSend = (content: string) => {
    if (!activeConversationId) return
    sendMessage.mutate({ conversationId: activeConversationId, content })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen">
      {/* Left Sidebar: Conversations */}
      <aside className="hidden w-72 flex-col border-r bg-gray-50 dark:bg-gray-900 md:flex">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">Conversaciones</h2>
          <button
            onClick={handleNewChat}
            className="rounded-lg bg-auteco-red p-1.5 text-white hover:bg-red-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations?.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-200 dark:hover:bg-gray-800 ${
                activeConversationId === conv.id ? 'bg-gray-200 dark:bg-gray-800 font-medium' : ''
              }`}
            >
              <p className="truncate dark:text-white">{conv.title || 'Nueva conversación'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(conv.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* Center: Chat View */}
      <div className="flex flex-1 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        {!activeConversationId ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="Selecciona o crea una conversación"
              description="Elige una conversación existente o inicia una nueva para consultar al asistente"
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-gray-800 px-4 py-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Escribiendo...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </>
        )}
      </div>

      {/* Right Sidebar: Mechanic Queue */}
      <aside className="hidden w-80 flex-col bg-gray-50 dark:bg-gray-900 md:flex border-l border-gray-200 dark:border-gray-800">
        <CompactMechanicQueue />
      </aside>
    </div>
  )
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatService } from '@services/api'
import { useChatStore } from '@store/chatStore'

export function useConversations() {
  const setConversations = useChatStore((s) => s.setConversations)

  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.list().then((data) => {
      setConversations(data)
      return data
    }),
  })
}

export function useMessages(conversationId: string | null) {
  const setMessages = useChatStore((s) => s.setMessages)

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatService.getMessages(conversationId!).then((data) => {
      setMessages(data)
      return data
    }),
    enabled: !!conversationId,
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  const addConversation = useChatStore((s) => s.addConversation)

  return useMutation({
    mutationFn: (title?: string) => chatService.create(title),
    onSuccess: (data) => {
      addConversation(data)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useSendMessage() {
  const addMessage = useChatStore((s) => s.addMessage)
  const setIsLoading = useChatStore((s) => s.setIsLoading)

  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      chatService.sendMessage(conversationId, content),
    onMutate: () => setIsLoading(true),
    onSuccess: (data) => {
      addMessage(data)
      setIsLoading(false)
    },
    onError: () => setIsLoading(false),
  })
}

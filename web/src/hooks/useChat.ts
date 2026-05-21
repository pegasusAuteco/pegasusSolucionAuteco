import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@services/api';
import { useChatUI } from './useChatUI';
import type { Message } from '@types';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.list(),
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatService.getMessages(conversationId!),
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => chatService.create(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      chatService.rename(conversationId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { activeConversationId, setActiveConversation } = useChatUI();

  return useMutation({
    mutationFn: (conversationId: string) => chatService.remove(conversationId),
    onSuccess: (_, conversationId) => {
      if (activeConversationId === conversationId) {
        setActiveConversation(null);
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteAllConversations() {
  const queryClient = useQueryClient();
  const { setActiveConversation } = useChatUI();

  return useMutation({
    mutationFn: () => chatService.removeAll(),
    onSuccess: (data) => {
      console.log(`🗑️ ${data.deleted} conversaciones eliminadas`);
      setActiveConversation(null);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      chatService.sendMessage(conversationId, content),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['messages', variables.conversationId] });

      const previousMessages = queryClient.getQueryData<Message[]>(['messages', variables.conversationId]);

      const optimisticMessage: Message = {
        id: Date.now().toString(),
        conversation_id: variables.conversationId,
        role: 'user',
        content: variables.content,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(['messages', variables.conversationId], (old) => {
        return old ? [...old, optimisticMessage] : [optimisticMessage];
      });

      return { previousMessages };
    },
    onError: (_err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', variables.conversationId], context.previousMessages);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
    },
  });
}

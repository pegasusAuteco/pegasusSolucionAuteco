import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@services/api';
import { useChatUI } from './useChatUI';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.list(),
  });
}

export function useMessages(conversationId) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatService.getMessages(conversationId),
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title) => chatService.create(title),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, title }) =>
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
    mutationFn: (conversationId) => chatService.remove(conversationId),
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
    mutationFn: ({ conversationId, content }) =>
      chatService.sendMessage(conversationId, content),
    retry: 0,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['messages', variables.conversationId] });

      const previousMessages = queryClient.getQueryData(['messages', variables.conversationId]);

      const optimisticMessage = {
        id: Date.now().toString(),
        conversation_id: variables.conversationId,
        role: 'user',
        content: variables.content,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['messages', variables.conversationId], (old) => {
        return old ? [...old, optimisticMessage] : [optimisticMessage];
      });

      return { previousMessages };
    },
    onError: (_err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', variables.conversationId], context.previousMessages);
      }
    },
    onSettled: (data, _error, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      }
    },
  });
}

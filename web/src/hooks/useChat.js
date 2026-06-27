/**
 * Chat hooks for conversation and message management.
 *
 * Provides React Query hooks for CRUD operations on conversations,
 * message fetching, and optimistic message sending.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@services/api';
import { useChatUI } from './useChatUI';

/**
 * Fetches the list of all conversations for the current user.
 *
 * Caches results for 30 seconds (staleTime) to avoid redundant fetches.
 *
 * @returns {UseQueryReturn} Query object with `data` as an array of conversation objects
 *   ({ id, title, created_at, ... }) and standard loading/error states.
 */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.list(),
    staleTime: 30_000,
  });
}

/**
 * Fetches messages for a specific conversation.
 *
 * The query is disabled until a valid conversationId is provided.
 *
 * @param {string|null} conversationId - The conversation to fetch messages for.
 *   Pass null or undefined to disable the query.
 * @returns {UseQueryReturn} Query object with `data` as an array of message objects
 *   ({ id, role, content, created_at, ... }) and standard loading/error states.
 */
export function useMessages(conversationId) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatService.getMessages(conversationId),
    enabled: !!conversationId,
  });
}

/**
 * Hook for creating a new conversation.
 *
 * Invalidates the conversations query on success so the sidebar updates.
 * Does not retry on failure.
 *
 * @returns {UseMutationReturn} React Query mutation object.
 *   Call .mutate(title) where title is the conversation name (e.g. 'Nuevo chat').
 */
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

/**
 * Hook for renaming an existing conversation.
 *
 * Invalidates the conversations query on success so the sidebar updates.
 *
 * @returns {UseMutationReturn} React Query mutation object.
 *   Call .mutate({ conversationId, title }) to rename.
 */
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

/**
 * Hook for deleting a single conversation.
 *
 * If the deleted conversation was the active one, clears the active selection.
 * Invalidates the conversations query on success.
 *
 * @returns {UseMutationReturn} React Query mutation object.
 *   Call .mutate(conversationId) to delete.
 */
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

/**
 * Hook for deleting all conversations at once.
 *
 * Clears the active conversation selection and invalidates the cache.
 *
 * @returns {UseMutationReturn} React Query mutation object.
 *   Call .mutate() with no arguments to delete all.
 */
export function useDeleteAllConversations() {
  const queryClient = useQueryClient();
  const { setActiveConversation } = useChatUI();

  return useMutation({
    mutationFn: () => chatService.removeAll(),
    onSuccess: (data) => {
      setActiveConversation(null);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Hook for sending a message with optimistic UI updates.
 *
 * Immediately appends the user message to the local cache before the server
 * responds. On error, rolls back to the previous messages. On success,
 * invalidates the messages query to sync with the server response.
 *
 * @returns {UseMutationReturn} React Query mutation object.
 *   Call .mutate({ conversationId, content }) to send.
 */
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

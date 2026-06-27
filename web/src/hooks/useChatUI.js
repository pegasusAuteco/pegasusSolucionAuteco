/**
 * Hook for accessing Chat UI context state.
 *
 * Provides activeConversationId, pending input, and error state
 * from the ChatProvider context.
 */
import { useContext } from 'react';
import { ChatContext } from '../contexts/ChatContext';

/**
 * Access the chat UI context from any child component.
 *
 * Must be used inside a ChatProvider. Throws if used outside the provider.
 *
 * @returns {{ activeConversationId: string|null, setActiveConversation: Function,
 *   pendingChatInput: string|null, setPendingChatInput: Function,
 *   initError: boolean, setInitError: Function }}
 *   The chat UI context value.
 */
export function useChatUI() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatUI must be used within a ChatProvider');
  }
  return context;
}

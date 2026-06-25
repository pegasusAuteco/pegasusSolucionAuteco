/**
 * Hook for accessing Chat UI context state.
 *
 * Provides activeConversationId, pending input, and error state
 * from the ChatProvider context.
 */
import { useContext } from 'react';
import { ChatContext } from '../contexts/ChatContext';

export function useChatUI() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatUI must be used within a ChatProvider');
  }
  return context;
}

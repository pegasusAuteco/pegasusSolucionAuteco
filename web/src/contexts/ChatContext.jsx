/**
 * Chat context provider for managing conversation UI state.
 *
 * Maintains the active conversation ID, pending chat input from external
 * sources (e.g. inventory clicks), and initialization error state.
 */
import { createContext, useState } from 'react';

export const ChatContext = createContext(undefined);

export function ChatProvider({ children }) {
  const [activeConversationId, setActiveConversation] = useState(null);
  const [pendingChatInput, setPendingChatInput] = useState(null);
  const [initError, setInitError] = useState(false);

  return (
    <ChatContext.Provider value={{ activeConversationId, setActiveConversation, pendingChatInput, setPendingChatInput, initError, setInitError }}>
      {children}
    </ChatContext.Provider>
  );
}

import { createContext, useState } from 'react';

export const ChatContext = createContext(undefined);

export function ChatProvider({ children }) {
  const [activeConversationId, setActiveConversation] = useState(null);
  const [pendingChatInput, setPendingChatInput] = useState(null);

  return (
    <ChatContext.Provider value={{ activeConversationId, setActiveConversation, pendingChatInput, setPendingChatInput }}>
      {children}
    </ChatContext.Provider>
  );
}

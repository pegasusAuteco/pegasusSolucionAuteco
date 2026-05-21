import { createContext, useState, ReactNode } from 'react';

export interface ChatContextType {
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
  pendingChatInput: string | null;
  setPendingChatInput: (text: string | null) => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeConversationId, setActiveConversation] = useState<string | null>(null);
  const [pendingChatInput, setPendingChatInput] = useState<string | null>(null);

  return (
    <ChatContext.Provider value={{ activeConversationId, setActiveConversation, pendingChatInput, setPendingChatInput }}>
      {children}
    </ChatContext.Provider>
  );
}

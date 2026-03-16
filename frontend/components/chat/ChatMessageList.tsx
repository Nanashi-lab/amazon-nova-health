'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/lib/context';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import styles from './ChatMessageList.module.css';

interface ChatMessageListProps {
  isTyping: boolean;
}

export default function ChatMessageList({ isTyping }: ChatMessageListProps) {
  const { state } = useApp();
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeSession = state.chatSessions.find((s) => s.id === state.activeChatId);
  const messages = activeSession?.messages ?? [];

  // Get the last message content length to detect streaming updates
  const lastMessageContent = messages.length > 0 ? messages[messages.length - 1].content : '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping, lastMessageContent]);

  return (
    <div className={styles.container}>
      {messages.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Start a conversation with NovaHealth AI</p>
        </div>
      ) : (
        messages
          .filter((msg) => msg.role === 'user' || msg.content)
          .map((msg) => <ChatMessage key={msg.id} message={msg} />)
      )}
      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

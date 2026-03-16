'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/lib/context';
import { formatTime } from '@/lib/utils';
import styles from './ChatSessionList.module.css';

export default function ChatSessionList() {
  const { state, actions } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [isOpen]);

  const sortedSessions = [...state.chatSessions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleSelect = (id: string) => {
    actions.setActiveChatId(id);
    setIsOpen(false);
  };

  const handleNewChat = () => {
    actions.createNewChatSession();
    setIsOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={styles.toggleBtn}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle session list"
      >
        {/* List icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <button className={styles.newChatBtn} onClick={handleNewChat}>
              + New Chat
            </button>

            <div className={styles.list}>
              {sortedSessions.map((session) => (
                <button
                  key={session.id}
                  className={`${styles.sessionRow} ${
                    session.id === state.activeChatId ? styles.active : ''
                  }`}
                  onClick={() => handleSelect(session.id)}
                >
                  <span className={styles.sessionTitle}>{session.title}</span>
                  <span className={styles.sessionSnippet}>{session.lastMessage}</span>
                  <span className={styles.sessionTime}>{formatTime(session.timestamp)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { ReactNode } from 'react';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  children?: ReactNode;
}

export default function ChatPanel({ children }: ChatPanelProps) {
  return <section className={styles.chatPanel}>{children}</section>;
}

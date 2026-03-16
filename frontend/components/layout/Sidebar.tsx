'use client';

import { ReactNode } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  children?: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  return <aside className={styles.sidebar}>{children}</aside>;
}

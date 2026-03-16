'use client';

import { ReactNode } from 'react';
import styles from './MainArea.module.css';

interface MainAreaProps {
  children?: ReactNode;
}

export default function MainArea({ children }: MainAreaProps) {
  return <main className={styles.mainArea}>{children}</main>;
}

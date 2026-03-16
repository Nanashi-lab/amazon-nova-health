'use client';

import { useState } from 'react';
import styles from './AlertBanner.module.css';

interface AlertBannerProps {
  message: string;
  severity: 'critical' | 'warning' | 'info';
  onDismiss?: () => void;
}

const severityIcons: Record<string, string> = {
  critical: '\u26A0\uFE0F',
  warning: '\u26A0\uFE0F',
  info: '\u2139\uFE0F',
};

export default function AlertBanner({ message, severity, onDismiss }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`${styles.banner} ${styles[severity]}`} role="alert">
      <span className={styles.icon}>{severityIcons[severity]}</span>
      <span className={styles.message}>{message}</span>
      {onDismiss && (
        <button
          className={styles.dismiss}
          onClick={handleDismiss}
          aria-label="Dismiss alert"
        >
          \u2715
        </button>
      )}
    </div>
  );
}

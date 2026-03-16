'use client';

import styles from './VitalsChip.module.css';

interface VitalsChipProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  status?: 'normal' | 'warning' | 'critical';
}

const defaultIcons: Record<string, string> = {
  'Heart Rate': '\u2764\uFE0F',
  'Blood Pressure': '\uD83E\uDE78',
  'O2 Saturation': '\uD83E\uDEC1',
  'Temperature': '\uD83C\uDF21\uFE0F',
};

export default function VitalsChip({
  label,
  value,
  unit,
  icon,
  status = 'normal',
}: VitalsChipProps) {
  const displayIcon = icon ?? defaultIcons[label] ?? '\uD83D\uDCCA';

  return (
    <div className={`${styles.chip} ${styles[status]}`}>
      <span className={styles.icon}>{displayIcon}</span>
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>
          {value}
          {unit && <span className={styles.unit}>{unit}</span>}
        </span>
      </div>
    </div>
  );
}

'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import { Patient } from '@/lib/types';
import styles from './PatientItem.module.css';

interface PatientItemProps {
  patient: Patient;
  isSelected: boolean;
  onClick: () => void;
}

const STATUS_BADGE: Record<Patient['status'], { label: string; className: string }> = {
  critical: { label: '!', className: styles.badgeCritical },
  caution: { label: '~', className: styles.badgeCaution },
  stable: { label: '\u2713', className: styles.badgeStable },
  monitoring: { label: '\u2022', className: styles.badgeMonitoring },
};

function PatientItem({ patient, isSelected, onClick }: PatientItemProps) {
  const badge = STATUS_BADGE[patient.status];
  const isCritical = patient.status === 'critical';

  return (
    <motion.button
      className={`${styles.item} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      type="button"
      whileHover={{ x: 4 }}
      transition={{ duration: 0.15 }}
    >
      {isCritical ? (
        <motion.span
          className={`${styles.dot} ${styles[patient.status]}`}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      ) : (
        <span className={`${styles.dot} ${styles[patient.status]}`} />
      )}
      <div className={styles.info}>
        <span className={styles.name}>{patient.name}</span>
        <span className={styles.room}>Room {patient.room}</span>
        <span className={styles.condition}>{patient.condition}</span>
      </div>
      <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
    </motion.button>
  );
}

export default memo(PatientItem);

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import styles from './ToolCallCard.module.css';

interface ToolCallCardProps {
  name: string;
  content?: string;
  isLoading?: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  get_patient: 'Get Patient',
  list_patients: 'List Patients',
  admit_patient: 'Admit Patient',
  update_patient: 'Update Patient',
  prescribe_medication: 'Prescribe Medication',
  administer_medication: 'Administer Medication',
  get_patient_documents: 'Patient Documents',
  search_records: 'Search Records',
};

export default function ToolCallCard({ name, content, isLoading }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const label = TOOL_LABELS[name] || name;
  const preview = content ? content.slice(0, 80) + (content.length > 80 ? '...' : '') : '';

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>
          <span className={styles.spinner} />
          <span className={styles.toolBadge}>
            <span className={styles.toolIcon}>&#9881;</span>
            {label}
          </span>
          <span>Running...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div
        className={styles.header}
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
      >
        <span className={styles.toolBadge}>
          <span className={styles.toolIcon}>&#9881;</span>
          {label}
        </span>
        {!isExpanded && preview && (
          <span className={styles.preview}>{preview}</span>
        )}
        <span className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}>
          &#9660;
        </span>
      </div>

      <AnimatePresence>
        {isExpanded && content && (
          <motion.div
            className={styles.content}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

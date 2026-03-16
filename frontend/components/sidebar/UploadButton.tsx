'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/lib/context';
import UploadModal from './UploadModal';
import styles from './UploadButton.module.css';

export default function UploadButton() {
  const { state } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const disabled = !state.selectedPatientId;

  const handleClick = () => {
    if (disabled) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <div className={styles.wrapper}>
      <motion.button
        type="button"
        className={styles.button}
        onClick={handleClick}
        whileHover={disabled ? {} : { scale: 1.02 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        transition={{ duration: 0.15 }}
        style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload Document
      </motion.button>
      <AnimatePresence>
        {showTooltip && disabled && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            Select a patient first to upload documents
          </motion.div>
        )}
      </AnimatePresence>
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patientId={state.selectedPatientId || ''}
      />
    </div>
  );
}

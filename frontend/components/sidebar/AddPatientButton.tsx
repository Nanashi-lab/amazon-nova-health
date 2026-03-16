'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import AddPatientModal from './AddPatientModal';
import styles from './UploadButton.module.css';

export default function AddPatientButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <motion.button
        type="button"
        className={styles.button}
        onClick={() => setIsModalOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
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
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add New Patient
      </motion.button>
      <AddPatientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

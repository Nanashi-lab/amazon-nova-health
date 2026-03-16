'use client';

import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '@/lib/context';
import { formatDate } from '@/lib/utils';
import styles from './DocumentViewer.module.css';

export default function DocumentViewer() {
  const { state, actions } = useApp();
  const { selectedDocument, patients } = state;

  if (!selectedDocument) return null;

  const patient = patients.find((p) => p.id === selectedDocument.patientId);

  const handleBack = () => {
    if (state.searchResults) {
      actions.clearSearch();
      actions.submitSearch(state.searchQuery);
    } else if (selectedDocument.patientId) {
      actions.selectPatient(selectedDocument.patientId);
    } else {
      actions.goHome();
    }
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <button className={styles.backButton} onClick={handleBack}>
        {'\u2190'} {state.searchResults ? 'Back to Search Results' : 'Back to Patient'}
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>{selectedDocument.filename}</h1>
        <div className={styles.meta}>
          {patient && <span className={styles.metaItem}>{patient.name}</span>}
          {patient && <span className={styles.metaDivider}>|</span>}
          <span className={styles.metaItem}>{selectedDocument.fileType.toUpperCase()}</span>
          <span className={styles.metaDivider}>|</span>
          <span className={styles.metaItem}>{formatDate(selectedDocument.uploadedAt)}</span>
        </div>
      </div>

      <div className={styles.content}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {selectedDocument.extractedText}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}

'use client';

import { motion } from 'motion/react';
import { useApp } from '@/lib/context';
import { formatDate } from '@/lib/utils';
import styles from './SearchResults.module.css';

const typeBadgeLabels: Record<string, string> = {
  patient: 'Patient',
  document: 'Document',
  note: 'Note',
};

const gridVariants = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

export default function SearchResults() {
  const { state, actions } = useApp();
  const { searchResults, searchQuery, searchMode, patients } = state;

  const results = searchResults ?? [];

  const handleResultClick = (result: typeof results[number]) => {
    if (result.type === 'document') {
      actions.viewDocument(parseInt(result.id));
      return;
    }
    if (result.patientName) {
      const patient = patients.find(
        (p) => p.name.toLowerCase() === result.patientName!.toLowerCase()
      );
      if (patient) {
        actions.selectPatient(patient.id);
      }
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={actions.clearSearch}>
        {'\u2190'} Back to Dashboard
      </button>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Search Results</h1>
          <span className={styles.count}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className={`${styles.modeBadge} ${styles[searchMode]}`}>
          {searchMode === 'simple' ? 'Simple' : 'Semantic'}
        </span>
      </div>

      {searchQuery && (
        <p className={styles.queryText}>
          Showing results for &ldquo;<strong>{searchQuery}</strong>&rdquo;
        </p>
      )}

      {results.length === 0 ? (
        <div className={styles.empty}>
          <p>No results found for &ldquo;{searchQuery}&rdquo;</p>
          <p className={styles.emptyHint}>Try adjusting your search terms or switching to semantic mode.</p>
        </div>
      ) : (
        <motion.div
          className={styles.grid}
          variants={gridVariants}
          initial="initial"
          animate="animate"
        >
          {results.map((result) => (
            <motion.div
              key={result.id}
              className={styles.card}
              variants={cardVariants}
              whileHover={{
                y: -2,
                boxShadow: '0 4px 12px rgba(13,148,136,0.12)',
                transition: { duration: 0.2 },
              }}
              onClick={() => handleResultClick(result)}
            >
              <div className={styles.cardHeader}>
                <span className={`${styles.typeBadge} ${styles[result.type]}`}>
                  {typeBadgeLabels[result.type]}
                </span>
                {searchMode === 'semantic' && result.relevanceScore != null && (
                  <div className={styles.relevance}>
                    <div className={styles.relevanceBar}>
                      <div
                        className={styles.relevanceFill}
                        style={{ width: `${Math.round(result.relevanceScore * 100)}%` }}
                      />
                    </div>
                    <span className={styles.relevanceScore}>
                      {Math.round(result.relevanceScore * 100)}%
                    </span>
                  </div>
                )}
              </div>
              <h3 className={styles.cardTitle}>{result.title}</h3>
              <p className={styles.cardSnippet}>{result.snippet}</p>
              <div className={styles.cardFooter}>
                {result.patientName && (
                  <span className={styles.patientName}>{result.patientName}</span>
                )}
                <span className={styles.date}>{formatDate(result.date)}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '@/lib/context';
import { SearchMode } from '@/lib/types';
import styles from './SearchBar.module.css';

export default function SearchBar() {
  const { state, actions } = useApp();
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed) {
      actions.submitSearch(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleModeChange = (mode: SearchMode) => {
    actions.setSearchMode(mode);
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={handleSubmit}
          aria-label="Search"
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
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <input
          className={styles.input}
          type="text"
          placeholder="Search patients, records..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className={styles.toggle}>
        <button
          type="button"
          className={`${styles.segment} ${state.searchMode === 'simple' ? styles.active : ''}`}
          onClick={() => handleModeChange('simple')}
        >
          {state.searchMode === 'simple' && (
            <motion.span
              className={styles.activeIndicator}
              layoutId="search-mode"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className={styles.segmentLabel}>Simple</span>
        </button>
        <button
          type="button"
          className={`${styles.segment} ${state.searchMode === 'semantic' ? styles.active : ''}`}
          onClick={() => handleModeChange('semantic')}
        >
          {state.searchMode === 'semantic' && (
            <motion.span
              className={styles.activeIndicator}
              layoutId="search-mode"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className={styles.segmentLabel}>Semantic</span>
        </button>
      </div>
    </div>
  );
}

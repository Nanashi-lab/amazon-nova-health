'use client';

import { motion } from 'motion/react';
import styles from './TypingIndicator.module.css';

export default function TypingIndicator() {
  return (
    <div className={styles.wrapper}>
      <span className={styles.meta}>NovaHealth AI</span>
      <div className={styles.bubble}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={styles.dot}
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </div>
  );
}

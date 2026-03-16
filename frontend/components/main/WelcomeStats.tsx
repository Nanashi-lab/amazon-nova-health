'use client';

import { motion } from 'motion/react';
import { useApp } from '@/lib/context';
import styles from './WelcomeStats.module.css';

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 16, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
};

const activityVariants = {
  initial: { opacity: 0, x: -8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

const quickActionVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

export default function WelcomeStats() {
  const { state, actions } = useApp();
  const { patients } = state;

  const totalPatients = patients.length;
  const criticalCount = patients.filter((p) => p.status === 'critical').length;
  const cautionCount = patients.filter((p) => p.status === 'caution').length;
  const stableCount = patients.filter((p) => p.status === 'stable').length;
  const monitoringCount = patients.filter((p) => p.status === 'monitoring').length;

  const stats = [
    { label: 'Total Patients', value: totalPatients, color: 'primary' as const },
    { label: 'Critical', value: criticalCount, color: 'critical' as const },
    { label: 'Caution', value: cautionCount, color: 'warning' as const },
    { label: 'Stable', value: stableCount, color: 'success' as const },
    { label: 'Monitoring', value: monitoringCount, color: 'info' as const },
  ];

  const recentActivity = [
    { time: '07:15 AM', text: 'Margaret Chen — O2 saturation dropped to 89%', type: 'critical' as const },
    { time: '06:30 AM', text: 'David Thompson — Medication schedule updated by Dr. Rodriguez', type: 'info' as const },
    { time: '05:45 AM', text: 'Maria Santos — New admission to Room 145', type: 'info' as const },
    { time: '05:00 AM', text: 'Robert Williams — Albuterol nebulizer administered', type: 'info' as const },
  ];

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h1 className={styles.greeting}>Good morning, Sarah</h1>
        <p className={styles.subtitle}>Here&apos;s your ward overview</p>
      </motion.div>

      <motion.div
        className={styles.statsGrid}
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            className={styles.statCard}
            variants={cardVariants}
            whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(13,148,136,0.12)', transition: { duration: 0.2 } }}
          >
            <span className={`${styles.statValue} ${styles[stat.color]}`}>
              {stat.value}
            </span>
            <span className={styles.statLabel}>{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className={styles.quickActions}
        variants={{ animate: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } } }}
        initial="initial"
        animate="animate"
      >
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <motion.button
            className={styles.actionCard}
            variants={quickActionVariants}
            whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(13,148,136,0.12)' }}
            onClick={actions.showAllPatients}
          >
            <span className={styles.actionIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span className={styles.actionLabel}>View All Patients</span>
          </motion.button>
          <motion.button
            className={`${styles.actionCard} ${styles.actionCritical}`}
            variants={quickActionVariants}
            whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(225,29,72,0.12)' }}
            onClick={() => actions.submitSearch('critical')}
          >
            <span className={styles.actionIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span className={styles.actionLabel}>View Critical Patients</span>
          </motion.button>
          <motion.button
            className={styles.actionCard}
            variants={quickActionVariants}
            whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(13,148,136,0.12)' }}
            onClick={() => actions.submitSearch('')}
          >
            <span className={styles.actionIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <span className={styles.actionLabel}>Search Records</span>
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        className={styles.activitySection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        <motion.div
          className={styles.activityList}
          variants={{ animate: { transition: { staggerChildren: 0.06, delayChildren: 0.5 } } }}
          initial="initial"
          animate="animate"
        >
          {recentActivity.map((item, idx) => (
            <motion.div key={idx} className={styles.activityItem} variants={activityVariants}>
              <span className={`${styles.activityDot} ${styles[item.type]}`} />
              <span className={styles.activityTime}>{item.time}</span>
              <span className={styles.activityText}>{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

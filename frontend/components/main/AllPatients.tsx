'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '@/lib/context';
import { statusLabels, STATUS_ORDER } from '@/lib/constants';
import styles from './AllPatients.module.css';

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

export default function AllPatients() {
  const { state, actions } = useApp();

  const sorted = useMemo(
    () =>
      [...state.patients].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      ),
    [state.patients]
  );

  const criticalCount = state.patients.filter((p) => p.status === 'critical').length;
  const cautionCount = state.patients.filter((p) => p.status === 'caution').length;
  const stableCount = state.patients.filter((p) => p.status === 'stable').length;
  const monitoringCount = state.patients.filter((p) => p.status === 'monitoring').length;

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className={styles.title}>All Patients</h1>
        <div className={styles.badges}>
          <span className={`${styles.countBadge} ${styles.critical}`}>{criticalCount} Critical</span>
          <span className={`${styles.countBadge} ${styles.caution}`}>{cautionCount} Caution</span>
          <span className={`${styles.countBadge} ${styles.monitoring}`}>{monitoringCount} Monitoring</span>
          <span className={`${styles.countBadge} ${styles.stable}`}>{stableCount} Stable</span>
        </div>
      </motion.div>

      <motion.div
        className={styles.grid}
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {sorted.map((patient) => (
          <motion.div
            key={patient.id}
            className={styles.card}
            variants={cardVariants}
            whileHover={{
              y: -3,
              boxShadow: '0 6px 20px rgba(13, 148, 136, 0.12)',
              transition: { duration: 0.2 },
            }}
            onClick={() => actions.selectPatient(patient.id)}
          >
            <div className={styles.cardTop}>
              <div className={styles.cardInfo}>
                <h3 className={styles.patientName}>{patient.name}</h3>
                <span className={styles.patientMeta}>
                  Room {patient.room} &middot; {patient.age}y {patient.gender === 'M' ? 'Male' : 'Female'}
                </span>
              </div>
              <span className={`${styles.statusBadge} ${styles[patient.status]}`}>
                {statusLabels[patient.status]}
              </span>
            </div>

            <p className={styles.condition}>{patient.condition}</p>

            <div className={styles.vitalsRow}>
              <span className={styles.vital}>
                <span className={styles.vitalLabel}>HR</span>
                <span className={styles.vitalValue}>{patient.vitals.heartRate}</span>
              </span>
              <span className={styles.vital}>
                <span className={styles.vitalLabel}>BP</span>
                <span className={styles.vitalValue}>{patient.vitals.bloodPressure}</span>
              </span>
              <span className={styles.vital}>
                <span className={styles.vitalLabel}>SpO2</span>
                <span className={styles.vitalValue}>{patient.vitals.oxygenSat}%</span>
              </span>
              <span className={styles.vital}>
                <span className={styles.vitalLabel}>Temp</span>
                <span className={styles.vitalValue}>{patient.vitals.temperature}&deg;F</span>
              </span>
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.physician}>{patient.attendingPhysician}</span>
              <span className={styles.medCount}>
                {patient.medications.length} medication{patient.medications.length !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

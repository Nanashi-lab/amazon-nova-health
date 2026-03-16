'use client';

import { memo, useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '@/lib/context';
import { STATUS_ORDER } from '@/lib/constants';
import PatientItem from './PatientItem';
import styles from './PatientList.module.css';

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
};

function PatientList() {
  const { state, actions } = useApp();

  const sorted = useMemo(
    () =>
      [...state.patients].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      ),
    [state.patients]
  );

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.title}>Patients</span>
        <span className={styles.count}>{state.patients.length}</span>
      </div>
      <motion.div
        className={styles.list}
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {sorted.map((patient) => (
          <motion.div key={patient.id} variants={itemVariants} transition={{ duration: 0.25, ease: 'easeOut' }}>
            <PatientItem
              patient={patient}
              isSelected={patient.id === state.selectedPatientId}
              onClick={() => actions.selectPatient(patient.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default memo(PatientList);

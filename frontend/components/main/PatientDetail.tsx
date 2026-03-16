'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '@/lib/context';
import { apiJson } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import { statusLabels } from '@/lib/constants';
import VitalsChip from './VitalsChip';
import EditPatientModal from './EditPatientModal';
import UploadModal from '@/components/sidebar/UploadModal';
import styles from './PatientDetail.module.css';

interface PatientDocument {
  id: number;
  filename: string;
  patient_id: string;
  file_type: string;
  uploaded_at: string | null;
}

function getVitalStatus(
  label: string,
  value: number
): 'normal' | 'warning' | 'critical' {
  switch (label) {
    case 'Heart Rate':
      if (value > 120 || value < 50) return 'critical';
      if (value > 100 || value < 60) return 'warning';
      return 'normal';
    case 'O2 Saturation':
      if (value < 90) return 'critical';
      if (value < 95) return 'warning';
      return 'normal';
    case 'Temperature':
      if (value > 101 || value < 96) return 'critical';
      if (value > 99.5 || value < 97) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
}

const sectionVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const vitalsStagger = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const chipVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
};

export default function PatientDetail() {
  const { state, actions } = useApp();
  const { patients, selectedPatientId } = state;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);

  const patient = patients.find((p) => p.id === selectedPatientId);

  // Fetch documents when patient changes or upload modal closes
  useEffect(() => {
    if (!patient) return;
    let cancelled = false;
    apiJson<PatientDocument[]>(`/api/documents/patient/${patient.id}`)
      .then((docs) => { if (!cancelled) setDocuments(docs); })
      .catch(() => { if (!cancelled) setDocuments([]); });
    return () => { cancelled = true; };
  }, [patient?.id, isUploadOpen]);

  if (!patient) {
    return (
      <div className={styles.empty}>
        <p>No patient selected.</p>
        <button className={styles.emptyAction} onClick={actions.showAllPatients}>
          View All Patients
        </button>
      </div>
    );
  }

  const vitals = [
    {
      label: 'Heart Rate',
      value: patient.vitals.heartRate,
      unit: 'bpm',
      status: getVitalStatus('Heart Rate', patient.vitals.heartRate),
    },
    {
      label: 'Blood Pressure',
      value: patient.vitals.bloodPressure,
      unit: 'mmHg',
      status: 'normal' as const,
    },
    {
      label: 'O2 Saturation',
      value: patient.vitals.oxygenSat,
      unit: '%',
      status: getVitalStatus('O2 Saturation', patient.vitals.oxygenSat),
    },
    {
      label: 'Temperature',
      value: patient.vitals.temperature,
      unit: '\u00B0F',
      status: getVitalStatus('Temperature', patient.vitals.temperature),
    },
  ];

  return (
    <motion.div
      className={styles.container}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <button className={styles.backButton} onClick={actions.goHome}>
        {'\u2190'} Back to Dashboard
      </button>

      {/* Header */}
      <motion.div
        className={styles.header}
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <h1 className={styles.name}>{patient.name}</h1>
            <span className={`${styles.statusBadge} ${styles[patient.status]}`}>
              {statusLabels[patient.status]}
            </span>
          </div>
          <div className={styles.headerActions}>
            <motion.button
              className={styles.actionBtn}
              onClick={() => setIsUploadOpen(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Document
            </motion.button>
            <motion.button
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={() => setIsEditOpen(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Patient
            </motion.button>
          </div>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.metaItem}>Room {patient.room}</span>
          <span className={styles.metaDivider}>{'\u00B7'}</span>
          <span className={styles.metaItem}>
            {patient.age} y/o {patient.gender === 'M' ? 'Male' : 'Female'}
          </span>
          <span className={styles.metaDivider}>{'\u00B7'}</span>
          <span className={styles.metaItem}>{patient.condition}</span>
        </div>
        <p className={styles.admitDate}>
          Admitted {formatDate(patient.admittedDate)}
        </p>
      </motion.div>

      {/* Vitals Section */}
      <motion.section
        className={styles.section}
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Vitals</h2>
          <span className={styles.timestamp}>Last updated: Today, 07:00 AM</span>
        </div>
        <motion.div
          className={styles.vitalsGrid}
          variants={vitalsStagger}
          initial="initial"
          animate="animate"
        >
          {vitals.map((v) => (
            <motion.div key={v.label} variants={chipVariants} transition={{ duration: 0.25 }}>
              <VitalsChip
                label={v.label}
                value={v.value}
                unit={v.unit}
                status={v.status}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Medications Section */}
      <motion.section
        className={styles.section}
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <h2 className={styles.sectionTitle}>Current Medications</h2>
        <div className={styles.medList}>
          {patient.medications.map((med, idx) => (
            <div key={idx} className={styles.medCard}>
              <div className={styles.medName}>{med.name}</div>
              <div className={styles.medDetails}>
                <span>{med.dosage}</span>
                <span className={styles.medDivider}>{'\u00B7'}</span>
                <span>{med.frequency}</span>
              </div>
              <div className={styles.medTime}>
                Last given: {formatTime(med.lastAdministered)}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Allergies Section */}
      <motion.section
        className={styles.section}
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <h2 className={styles.sectionTitle}>Allergies</h2>
        {patient.allergies.length > 0 ? (
          <div className={styles.allergyTags}>
            {patient.allergies.map((allergy) => (
              <span key={allergy} className={styles.allergyTag}>
                {allergy}
              </span>
            ))}
          </div>
        ) : (
          <p className={styles.noAllergies}>No known allergies (NKA)</p>
        )}
      </motion.section>

      {/* Documents & Notes */}
      <motion.section
        className={styles.section}
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Documents &amp; Notes</h2>
          <button
            className={styles.uploadLinkBtn}
            onClick={() => setIsUploadOpen(true)}
          >
            + Upload
          </button>
        </div>
        {documents.length > 0 ? (
          <div className={styles.medList}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={styles.medCard}
                style={{ cursor: 'pointer' }}
                onClick={() => actions.viewDocument(doc.id)}
              >
                <div className={styles.medName}>{doc.filename}</div>
                <div className={styles.medDetails}>
                  <span>{doc.file_type}</span>
                  {doc.uploaded_at && (
                    <>
                      <span className={styles.medDivider}>{'\u00B7'}</span>
                      <span>{formatDate(doc.uploaded_at)}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noAllergies}>No documents uploaded yet.</p>
        )}
      </motion.section>

      {/* Attending Physician */}
      <motion.div
        className={styles.physician}
        variants={sectionVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <span className={styles.physicianLabel}>Attending Physician</span>
        <span className={styles.physicianName}>{patient.attendingPhysician}</span>
      </motion.div>

      <EditPatientModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        patient={patient}
      />
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        patientId={patient.id}
      />
    </motion.div>
  );
}

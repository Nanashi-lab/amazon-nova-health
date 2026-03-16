'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/lib/context';
import { usePatientForm } from '@/lib/usePatientForm';
import styles from './AddPatientModal.module.css';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPatientModal({ isOpen, onClose }: AddPatientModalProps) {
  const { actions: appActions } = useApp();
  const { state, actions, canSubmit } = usePatientForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      actions.resetForm();
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, actions.resetForm]);

  const handleClose = useCallback(() => {
    actions.resetForm();
    setError(null);
    setSubmitting(false);
    onClose();
  }, [onClose, actions.resetForm]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    const validMeds = actions.getValidMeds();
    setSubmitting(true);
    setError(null);

    try {
      await appActions.addPatient({
        name: state.name.trim(),
        age: parseInt(state.age, 10),
        gender: state.gender,
        room: state.room.trim(),
        status: state.status,
        condition: state.condition.trim(),
        admittedDate: new Date().toISOString().split('T')[0],
        vitals: {
          heartRate: 75,
          bloodPressure: '120/80',
          oxygenSat: 98,
          temperature: 98.6,
        },
        medications: validMeds,
        allergies: state.allergies,
        attendingPhysician: state.physician.trim(),
      });
      actions.setIsDone(true);
    } catch {
      setError('Failed to admit patient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClose}
      >
        <motion.div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Add New Patient"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>Add New Patient</h2>
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
              &times;
            </button>
          </div>

          <div className={styles.body}>
            {!state.isDone ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Basic Info */}
                <div className={styles.sectionLabel}>Patient Information</div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>Full Name *</label>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="e.g. Maria Santos"
                      value={state.name}
                      onChange={(e) => actions.setName(e.target.value)}
                    />
                  </div>
                  <div className={styles.fieldSmall}>
                    <label className={styles.label}>Age *</label>
                    <input
                      className={styles.input}
                      type="number"
                      placeholder="45"
                      value={state.age}
                      onChange={(e) => actions.setAge(e.target.value)}
                    />
                  </div>
                  <div className={styles.fieldSmall}>
                    <label className={styles.label}>Gender</label>
                    <select
                      className={styles.input}
                      value={state.gender}
                      onChange={(e) => actions.setGender(e.target.value as 'M' | 'F')}
                    >
                      <option value="F">Female</option>
                      <option value="M">Male</option>
                    </select>
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.fieldSmall}>
                    <label className={styles.label}>Room *</label>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="145"
                      value={state.room}
                      onChange={(e) => actions.setRoom(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Condition *</label>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="e.g. Acute Cholecystitis"
                      value={state.condition}
                      onChange={(e) => actions.setCondition(e.target.value)}
                    />
                  </div>
                  <div className={styles.fieldSmall}>
                    <label className={styles.label}>Status</label>
                    <select
                      className={styles.input}
                      value={state.status}
                      onChange={(e) => actions.setStatus(e.target.value as typeof state.status)}
                    >
                      <option value="stable">Stable</option>
                      <option value="monitoring">Monitoring</option>
                      <option value="caution">Caution</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>Attending Physician *</label>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="e.g. Dr. Michael Okafor"
                      value={state.physician}
                      onChange={(e) => actions.setPhysician(e.target.value)}
                    />
                  </div>
                </div>

                {/* Medications */}
                <div className={styles.sectionLabel}>
                  Medications
                  <button type="button" className={styles.addBtn} onClick={actions.addMedication}>
                    + Add
                  </button>
                </div>
                {state.medications.length === 0 && (
                  <p className={styles.emptyHint}>No medications added yet.</p>
                )}
                {state.medications.map((med, idx) => (
                  <div key={idx} className={styles.medRow}>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="Medication name"
                      value={med.name}
                      onChange={(e) => actions.updateMedication(idx, 'name', e.target.value)}
                    />
                    <input
                      className={styles.inputSmall}
                      type="text"
                      placeholder="Dosage"
                      value={med.dosage}
                      onChange={(e) => actions.updateMedication(idx, 'dosage', e.target.value)}
                    />
                    <input
                      className={styles.inputSmall}
                      type="text"
                      placeholder="Frequency"
                      value={med.frequency}
                      onChange={(e) => actions.updateMedication(idx, 'frequency', e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => actions.removeMedication(idx)}
                      aria-label="Remove medication"
                    >
                      &times;
                    </button>
                  </div>
                ))}

                {/* Allergies */}
                <div className={styles.sectionLabel}>Allergies</div>
                <div className={styles.allergyInputRow}>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Type allergy and press Enter"
                    value={state.allergyInput}
                    onChange={(e) => actions.setAllergyInput(e.target.value)}
                    onKeyDown={actions.handleAllergyKeyDown}
                  />
                  <button type="button" className={styles.addBtn} onClick={actions.addAllergy}>
                    Add
                  </button>
                </div>
                {state.allergies.length > 0 && (
                  <div className={styles.allergyTags}>
                    {state.allergies.map((a) => (
                      <span key={a} className={styles.allergyTag}>
                        {a}
                        <button
                          type="button"
                          className={styles.allergyRemove}
                          onClick={() => actions.removeAllergy(a)}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Submit */}
                {error && <p className={styles.errorMsg}>{error}</p>}
                <motion.button
                  className={styles.submitBtn}
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  whileHover={canSubmit && !submitting ? { scale: 1.02 } : {}}
                  whileTap={canSubmit && !submitting ? { scale: 0.98 } : {}}
                >
                  {submitting ? 'Saving...' : 'Admit Patient'}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                className={styles.completion}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <motion.div
                  className={styles.checkmark}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>
                <p className={styles.completionText}>Patient admitted successfully!</p>
                <p className={styles.completionSub}>{state.name} has been added to the ward.</p>
                <motion.button
                  className={styles.doneBtn}
                  onClick={handleClose}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Done
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

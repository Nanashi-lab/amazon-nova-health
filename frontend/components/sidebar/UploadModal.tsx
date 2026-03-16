'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/lib/context';
import styles from './UploadModal.module.css';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
}

type PipelineStage = 'idle' | 'uploading' | 'extracting' | 'embedding' | 'indexing' | 'done' | 'error';

const PIPELINE_STEPS = [
  { id: 'uploading' as const, label: 'Uploading document...' },
  { id: 'extracting' as const, label: 'Extracting text...' },
  { id: 'embedding' as const, label: 'Generating embeddings (Nova Multimodal)...' },
  { id: 'indexing' as const, label: 'Indexing for semantic search...' },
];

function getStepStatus(
  stepId: PipelineStage,
  currentStage: PipelineStage
): 'pending' | 'active' | 'done' {
  const order: PipelineStage[] = ['uploading', 'extracting', 'embedding', 'indexing', 'done'];
  const stepIdx = order.indexOf(stepId);
  const currentIdx = order.indexOf(currentStage);
  if (currentStage === 'error') {
    // On error, show steps up to where we got as done, rest pending
    return stepIdx === 0 ? 'done' : 'pending';
  }
  if (currentIdx > stepIdx) return 'done';
  if (currentIdx === stepIdx) return 'active';
  return 'pending';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function UploadModal({ isOpen, onClose, patientId }: UploadModalProps) {
  const { actions } = useApp();
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const resetState = useCallback(() => {
    abortRef.current = true;
    setStage('idle');
    setSelectedFile(null);
    setProgress(0);
    setIsDragging(false);
    setErrorMessage(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const startPipeline = useCallback(async (file: File) => {
    abortRef.current = false;
    setSelectedFile(file.name);
    setStage('uploading');
    setProgress(10);
    setErrorMessage(null);

    try {
      await actions.uploadDocument(file, patientId);

      // Backend did real work synchronously. Animate visual stages quickly.
      if (abortRef.current) return;
      setStage('extracting');
      setProgress(35);
      await sleep(300);

      if (abortRef.current) return;
      setStage('embedding');
      setProgress(60);
      await sleep(300);

      if (abortRef.current) return;
      setStage('indexing');
      setProgress(85);
      await sleep(300);

      if (abortRef.current) return;
      setStage('done');
      setProgress(100);
    } catch (err) {
      if (abortRef.current) return;
      setStage('error');
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [actions, patientId]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      startPipeline(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      startPipeline(e.dataTransfer.files[0]);
    }
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

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
          aria-label="Upload Document"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>Upload Document</h2>
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
              &times;
            </button>
          </div>

          <div className={styles.body}>
            {stage === 'idle' && (
              <motion.div
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className={styles.dropzoneIcon}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className={styles.dropzoneText}>
                  Drop file here or click to browse
                </p>
                <p className={styles.dropzoneHint}>
                  Text and Markdown documents supported
                </p>
              </motion.div>
            )}

            {stage !== 'idle' && stage !== 'done' && stage !== 'error' && (
              <motion.div
                className={styles.pipeline}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <p className={styles.fileName}>{selectedFile}</p>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {PIPELINE_STEPS.map((step) => {
                  const status = getStepStatus(step.id, stage);
                  return (
                    <motion.div
                      key={step.id}
                      className={styles.step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span
                        className={`${styles.stepIcon} ${
                          status === 'done'
                            ? styles.stepDone
                            : status === 'active'
                            ? styles.stepActive
                            : styles.stepPending
                        }`}
                      >
                        {status === 'done' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : status === 'active' ? (
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            style={{ display: 'inline-block', width: 14, height: 14 }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                              <path d="M21 12a9 9 0 11-6.219-8.56" />
                            </svg>
                          </motion.span>
                        ) : (
                          <span style={{ width: 14, height: 14 }} />
                        )}
                      </span>
                      <span
                        className={`${styles.stepLabel} ${
                          status === 'done'
                            ? styles.stepLabelDone
                            : status === 'active'
                            ? styles.stepLabelActive
                            : ''
                        }`}
                      >
                        {step.label}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {stage === 'error' && (
              <motion.div
                className={styles.completion}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className={styles.errorIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <p className={styles.completionText}>Upload failed</p>
                <p className={styles.completionSub}>{errorMessage}</p>
                <motion.button
                  className={styles.doneBtn}
                  onClick={resetState}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Try Again
                </motion.button>
              </motion.div>
            )}

            {stage === 'done' && (
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
                  <svg className={styles.checkmarkIcon} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>
                <p className={styles.completionText}>Document indexed successfully!</p>
                <p className={styles.completionSub}>{selectedFile} is now searchable</p>
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

          <input
            ref={fileInputRef}
            type="file"
            className={styles.hiddenInput}
            onChange={handleFileSelect}
            accept=".txt,.md"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/lib/context';
import WelcomeStats from '@/components/main/WelcomeStats';
import PatientDetail from '@/components/main/PatientDetail';
import SearchResults from '@/components/main/SearchResults';
import AllPatients from '@/components/main/AllPatients';
import DocumentViewer from '@/components/main/DocumentViewer';

const viewVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function DashboardPage() {
  const { state } = useApp();
  const { mainView } = state;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mainView}
        variants={viewVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ height: '100%' }}
      >
        {mainView === 'welcome' && <WelcomeStats />}
        {mainView === 'patient' && <PatientDetail />}
        {mainView === 'search' && <SearchResults />}
        {mainView === 'patients' && <AllPatients />}
        {mainView === 'document' && <DocumentViewer />}
      </motion.div>
    </AnimatePresence>
  );
}

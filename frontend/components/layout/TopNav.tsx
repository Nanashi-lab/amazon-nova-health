'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import styles from './TopNav.module.css';

export default function TopNav() {
  const router = useRouter();
  const { state, actions } = useApp();

  const handleLogout = () => {
    actions.logout();
    router.push('/');
  };

  const isDashboard = state.mainView === 'welcome';
  const isPatients = state.mainView === 'patients';

  return (
    <nav className={styles.topnav}>
      <div className={styles.left}>
        <span className={styles.logoDot} />
        <span className={styles.logo}>NovaHealth</span>
      </div>

      <div className={styles.center}>
        <button
          className={`${styles.navLink} ${isDashboard ? styles.active : ''}`}
          onClick={actions.goHome}
          type="button"
        >
          Dashboard
        </button>
        <button
          className={`${styles.navLink} ${isPatients ? styles.active : ''}`}
          onClick={actions.showAllPatients}
          type="button"
        >
          Patients
        </button>
      </div>

      <div className={styles.right}>
        <div className={styles.shiftInfo}>
          <span className={styles.shiftLabel}>Day Shift</span>
          <span className={styles.shiftTime}>7:00 AM &ndash; 7:00 PM</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.nurseInfo}>
          <span className={styles.statusDot} />
          <span className={styles.nurseName}>Sarah Chen, RN</span>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

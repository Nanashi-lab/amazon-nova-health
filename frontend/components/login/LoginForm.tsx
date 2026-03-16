'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/lib/context';
import styles from './LoginForm.module.css';

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

const cardTransition = {
  duration: 0.2,
  ease: 'easeOut' as const,
};

export default function LoginForm() {
  const router = useRouter();
  const { actions } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await actions.login(email, password);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Invalid credentials. Try nurse@novahealth.ai / nova2026');
      }
    } catch {
      setError('Connection error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <motion.div
        className={styles.card}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        transition={cardTransition}
      >
        <h1 className={styles.heading}>NovaHealth</h1>
        <p className={styles.subtitle}>AI Nursing Assistant</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              placeholder="nurse@novahealth.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <motion.button
            className={styles.submitBtn}
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>

          <AnimatePresence>
            {error && (
              <motion.p
                className={styles.error}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>

        <p className={styles.hint}>Demo: nurse@novahealth.ai / nova2026</p>
      </motion.div>
    </div>
  );
}

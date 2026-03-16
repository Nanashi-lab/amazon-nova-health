'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import LoginForm from '@/components/login/LoginForm';

export default function Home() {
  const router = useRouter();
  const { state } = useApp();

  useEffect(() => {
    if (state.isAuthenticated) {
      router.push('/dashboard');
    }
  }, [state.isAuthenticated, router]);

  if (state.isAuthenticated) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)' }} />
    );
  }

  return <LoginForm />;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getJwt } from '@/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (getJwt()) {
      router.replace('/dashboard');
    } else {
      router.replace('/sign-in');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

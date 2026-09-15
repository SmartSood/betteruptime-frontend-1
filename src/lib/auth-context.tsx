'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, setJwt, clearJwt, getJwt } from '@/lib/api';

interface AuthUser {
  email: string;
}

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  email: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const EMAIL_KEY = 'sentinel_email';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = getJwt();
    if (token) {
      setAuthenticated(true);
      setEmail(localStorage.getItem(EMAIL_KEY));
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (userEmail: string, password: string) => {
    const res = await api.signIn({ email: userEmail, password });
    setJwt(res.jwt);
    localStorage.setItem(EMAIL_KEY, userEmail);
    setAuthenticated(true);
    setEmail(userEmail);
  }, []);

  const signUp = useCallback(async (userEmail: string, password: string) => {
    await api.signUp({ email: userEmail, password });
    // After sign-up, sign in to get JWT
    const res = await api.signIn({ email: userEmail, password });
    setJwt(res.jwt);
    localStorage.setItem(EMAIL_KEY, userEmail);
    setAuthenticated(true);
    setEmail(userEmail);
  }, []);

  const signOut = useCallback(() => {
    clearJwt();
    localStorage.removeItem(EMAIL_KEY);
    setAuthenticated(false);
    setEmail(null);
    router.push('/sign-in');
  }, [router]);

  return (
    <AuthContext.Provider value={{ authenticated, loading, email, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

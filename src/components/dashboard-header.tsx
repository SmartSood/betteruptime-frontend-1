'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export function DashboardHeader() {
  const { email, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-semibold tracking-tight">Sentinel</span>
          </button>
          <span className="hidden rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">
            Uptime Monitoring
          </span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="hidden max-w-[180px] truncate sm:inline">
              {email || 'Account'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-border bg-popover p-1.5 shadow-xl shadow-black/30 animate-fade-in">
              <div className="px-2.5 py-2 border-b border-border mb-1">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="truncate text-sm font-medium">{email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

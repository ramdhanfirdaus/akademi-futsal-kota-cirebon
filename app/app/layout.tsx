'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';

import { MobileNav, Sidebar, useSidebarCollapsed } from '@/components/Sidebar';
import AppFooter from '@/components/AppFooter';
import type { AppDispatch, RootState } from '@/store';
import { fetchMe } from '@/store/slices/authSlice';
import { publicFonts } from '@/lib/fonts';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  useEffect(() => {
    if (auth.status === 'idle') dispatch(fetchMe());
  }, [auth.status, dispatch]);

  useEffect(() => {
    if (auth.status === 'ready' && !auth.user) router.replace('/login');
  }, [auth.status, auth.user, router]);

  if (auth.status !== 'ready' || !auth.user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-laut-muda border-t-laut" />
        <p className="text-sm font-medium text-slate-500">Memeriksa sesi…</p>
      </div>
    );
  }

  return (
    <div className={`${publicFonts} min-h-screen bg-slate-50`}>
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <MobileNav />
      {/* Column layout so the footer always sits at the bottom, even on short pages. */}
      <div className={`flex min-h-[calc(100vh-3.5rem)] flex-col transition-[padding] duration-200 md:min-h-screen ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-6 pt-4 md:px-8 md:pb-8 md:pt-8">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}

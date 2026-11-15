
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from "react-redux";
import { Menu } from 'lucide-react';

import Sidebar from '../../components/Sidebar.tsx';
import { APP_NAME } from '../../constants.tsx';
import { RootState } from "@/store";
import AppFooter from "@/components/AppFooter.tsx";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const auth = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.push('/login');
    }
  }, [auth.isAuthenticated, router]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarCollapsed(true);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!auth.isAuthenticated) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse text-sm">Sedang memvalidasi sesi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {isMobile && (
        <div className="bg-slate-900 p-4 flex items-center justify-between sticky top-0 z-40 h-[65px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">AF</div>
            <h1 className="text-lg font-bold text-white uppercase tracking-wider">{APP_NAME}</h1>
          </div>
          <button onClick={() => setIsSidebarCollapsed(false)} className="p-2 text-white hover:bg-slate-800 rounded-lg">
            <Menu size={24} />
          </button>
        </div>
      )}

      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobile={isMobile}
      />
      
      <main className={`flex-1 ${!isMobile ? (isSidebarCollapsed ? 'ml-20' : 'ml-64') : ''} p-4 md:p-8 transition-all duration-300 min-h-screen`}>
        <div className="max-w-6xl mx-auto">
          {children}
          <AppFooter />
        </div>
      </main>
    </div>
  );
}

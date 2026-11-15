'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

import { NAVIGATION_ITEMS, APP_NAME } from '@/constants';
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {logout} from "@/store/slices/authSlice.ts";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobile
}) => {
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const pathname = usePathname() ?? '';
  const role = auth.user?.role;
  const filteredItems = NAVIGATION_ITEMS.filter(item => role !== undefined && item.roles.includes(role));
  const router = useRouter();

  const handleLogout = async () => {
    await dispatch(logout());
    router.replace('/login');
  };

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64';
  const mobileTranslate = (isMobile && isCollapsed) ? '-translate-x-full' : 'translate-x-0';

  const isItemActive = (id: string) => {
    return pathname.includes(id);
  };

  const navigate = (id: string) => {
    const path = `/app/${id}`;
    router.push(path);
    if (isMobile) setIsCollapsed(true);
  };

  return (
      <>
        {isMobile && !isCollapsed && (
            <div
                className="fixed inset-0 bg-black/50 z-[45] transition-opacity"
                onClick={() => setIsCollapsed(true)}
            />
        )}
        <div className={`fixed left-0 top-0 h-full bg-slate-900 text-slate-300 flex flex-col z-50 transition-all duration-300 ease-in-out border-r border-slate-800 ${sidebarWidth} ${mobileTranslate}`}>
          {/* Toggle Button at the Top */}
          <div className="p-4 flex items-center justify-between border-b border-slate-800/50 min-h-[65px]">
            {!isCollapsed && (
                <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shrink-0 text-xs">AF</div>
                  <h1 className="text-lg font-bold text-white tracking-tight">{APP_NAME}</h1>
                </div>
            )}
            {/* logo A removed in collapsed state as requested */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`p-2 hover:bg-slate-800 rounded-lg transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1 mt-4 overflow-x-hidden">
            {filteredItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    title={isCollapsed ? item.label : ""}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
                        isItemActive(item.id)
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <span className={`${isCollapsed ? 'mx-auto' : ''}`}>{item.icon}</span>
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-2">
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut size={20} className={isCollapsed ? 'mx-auto' : ''} />
              {!isCollapsed && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </>
  );
};

export default Sidebar;

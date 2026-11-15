'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, LogOut, Menu, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';

import { NAVIGATION_ITEMS } from '@/constants';
import type { AppDispatch, RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', COACH: 'Pelatih', STUDENT: 'Siswa' };
const COLLAPSE_KEY = 'afkc.sidebar.collapsed';

function useNav() {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const items = NAVIGATION_ITEMS.filter((item) => user && item.roles.includes(user.role));
  const isActive = (id: string) => pathname === `/app/${id}` || pathname.startsWith(`/app/${id}/`);
  const signOut = async () => {
    await dispatch(logout());
    router.replace('/login');
  };
  return { user, items, isActive, signOut, pathname };
}

/** Laptop/desktop: collapsible side navigation. Hidden on phones. */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, items, isActive, signOut } = useNav();
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-laut-dalam text-white/80 transition-[width] duration-200 md:flex ${collapsed ? 'w-20' : 'w-64'}`}
    >
      <div className={`flex h-16 items-center gap-3 border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <img src="/logo.png" alt="" className="h-9 w-9 shrink-0" />
        {!collapsed && <span className="font-display text-2xl font-black tracking-wide text-white">AFKC</span>}
      </div>

      <nav aria-label="Menu utama" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = isActive(item.id);
          return (
            <Link
              key={item.id}
              href={`/app/${item.id}`}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-pantai ${
                collapsed ? 'justify-center' : ''
              } ${active ? 'bg-pantai text-laut-dalam' : 'hover:bg-white/10 hover:text-white'}`}
            >
              <span aria-hidden>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        {!collapsed && user && (
          <div className="px-3 pb-2">
            <p className="truncate text-sm font-bold text-white">{user.username}</p>
            <p className="text-xs text-white/60">{ROLE_LABEL[user.role]}</p>
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          title={collapsed ? 'Keluar' : undefined}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={20} aria-hidden />
          {!collapsed && 'Keluar'}
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Lebarkan menu' : 'Ciutkan menu'}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronsRight size={20} aria-hidden /> : <ChevronsLeft size={20} aria-hidden />}
          {!collapsed && 'Ciutkan menu'}
        </button>
      </div>
    </aside>
  );
}

/** Remembers the desktop sidebar width per browser. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* storage unavailable: keep default */
    }
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  return [collapsed, toggle];
}

/** Phones: top bar with the page title, bottom tab bar, and a sheet for the remaining items. */
export function MobileNav() {
  const { user, items, isActive, signOut, pathname } = useNav();
  const [open, setOpen] = useState(false);
  const title = items.find((i) => isActive(i.id))?.label ?? 'AFKC';
  // Few items (students): show them all as tabs; otherwise the primary ones.
  const tabs = items.length <= 4 ? items : items.filter((i) => i.primary).slice(0, 4);
  const rest = items.filter((i) => !tabs.includes(i));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-laut-dalam px-4 text-white md:hidden">
        <img src="/logo.png" alt="" className="h-8 w-8" />
        <h1 className="flex-1 truncate font-display text-xl font-black uppercase tracking-wide">{title}</h1>
      </header>

      <nav
        aria-label="Menu utama"
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
      >
        {tabs.map((item) => {
          const active = isActive(item.id);
          return (
            <Link
              key={item.id}
              href={`/app/${item.id}`}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${active ? 'text-laut' : 'text-slate-500'}`}
            >
              <span aria-hidden className={`rounded-full px-4 py-1 ${active ? 'bg-laut-muda' : ''}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="menu-lainnya"
          className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
            rest.some((i) => isActive(i.id)) ? 'text-laut' : 'text-slate-500'
          }`}
        >
          <span aria-hidden className={`rounded-full px-4 py-1 ${rest.some((i) => isActive(i.id)) ? 'bg-laut-muda' : ''}`}>
            <Menu size={20} />
          </span>
          Menu
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu lainnya">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-laut-dalam/50" onClick={() => setOpen(false)} />
          <div
            id="menu-lainnya"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] motion-safe:animate-[sheet-up_180ms_ease-out]"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-laut-dalam">{user?.username}</p>
                <p className="text-xs text-slate-500">{user ? ROLE_LABEL[user.role] : ''}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup menu" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {rest.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/app/${item.id}`}
                    aria-current={isActive(item.id) ? 'page' : undefined}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-bold ${
                      isActive(item.id) ? 'bg-laut-muda text-laut' : 'bg-slate-50 text-laut-dalam'
                    }`}
                  >
                    <span aria-hidden>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full flex-col items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-3 text-xs font-bold text-laut-dalam"
                >
                  <LogOut size={20} aria-hidden />
                  Keluar
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;

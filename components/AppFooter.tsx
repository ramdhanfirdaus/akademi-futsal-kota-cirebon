import React from 'react';
import { CONTRIBUTED_NAME } from '@/constants';

/** Sits at the very bottom of every app page; extra bottom padding on phones clears the tab bar. */
export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 px-4 pb-24 pt-5 text-center text-sm text-slate-500 md:px-8 md:pb-5">
      © {new Date().getFullYear()} Akademi Futsal Kota Cirebon • {CONTRIBUTED_NAME}
    </footer>
  );
}

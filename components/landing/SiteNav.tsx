'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogIn, Menu, X } from 'lucide-react';

const LINKS = [
  { id: 'jadwal', label: 'Jadwal' },
  { id: 'tentang', label: 'Tentang' },
  { id: 'pelatih', label: 'Pelatih' },
  { id: 'galeri', label: 'Galeri' },
];

/**
 * Floating pill navbar: transparent over the hero, frosted white once the page scrolls,
 * highlights the section in view, and folds into a menu on phones.
 */
export default function SiteNav({ short }: { short: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // The active section is the last one whose top has passed 40% of the screen; none while on the hero.
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      let current: string | null = null;
      for (const l of LINKS) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) current = l.id;
      }
      // At the very bottom the last section may never reach that line.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom && current) current = LINKS[LINKS.length - 1].id;
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav
        aria-label="Navigasi utama"
        className={`pointer-events-auto mx-auto flex max-w-6xl items-center gap-2 rounded-full border px-2 py-2 transition-[background-color,box-shadow,border-color] duration-300 sm:px-3 ${
          scrolled || open
            ? 'border-white/60 bg-white/85 shadow-[0_8px_30px_-12px_rgba(8,58,99,0.35)] backdrop-blur-md'
            : 'border-laut-dalam/10 bg-white/35 backdrop-blur-sm'
        }`}
      >
        <Link href="/" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-laut-dalam">
          <img src="/logo.png" alt="" className="h-9 w-9" />
          <span className="font-display text-2xl font-black tracking-wide text-laut-dalam">{short}</span>
        </Link>

        <ul className="mx-auto hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                aria-current={active === l.id ? 'true' : undefined}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  active === l.id ? 'bg-laut-dalam text-white' : 'text-laut-dalam hover:bg-laut-dalam/10'
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <Link
          href="/login"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-laut-dalam px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-laut focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laut-dalam md:ml-0"
        >
          <LogIn size={16} aria-hidden /> Masuk
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="menu-situs"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          className="rounded-full p-2.5 text-laut-dalam hover:bg-laut-dalam/10 md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <ul
          id="menu-situs"
          className="pointer-events-auto mx-auto mt-2 grid max-w-6xl grid-cols-2 gap-2 rounded-3xl border border-white/60 bg-white/95 p-3 shadow-lg backdrop-blur-md motion-safe:animate-[menu-drop_160ms_ease-out] md:hidden"
        >
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                onClick={() => setOpen(false)}
                className={`block rounded-2xl px-4 py-3 text-center font-bold ${active === l.id ? 'bg-laut-dalam text-white' : 'bg-laut-muda text-laut-dalam'}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export type Slide = { src: string; alt: string; caption: string | null };

/**
 * Swipeable photo slider (scroll-snap): 1 photo per view on phones, 2 on tablets, 3 on laptops.
 * Arrows and dots for mouse/keyboard; click a photo to view it large.
 */
export default function GallerySlider({ slides }: { slides: Slide[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [pages, setPages] = useState(1);
  const [zoom, setZoom] = useState<Slide | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const step = first.offsetWidth + 16; // slide width + gap-4
      const perView = Math.max(1, Math.round((el.clientWidth + 16) / step));
      const total = Math.max(1, slides.length - perView + 1);
      setPages((p) => (p === total ? p : total));
      const i = Math.min(total - 1, Math.round(el.scrollLeft / step));
      setIndex((prev) => (prev === i ? prev : i));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [slides.length]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const goTo = (i: number) => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    el.scrollTo({ left: Math.max(0, Math.min(pages - 1, i)) * (first.offsetWidth + 16), behavior: 'smooth' });
  };

  return (
    <div className="mt-10">
      <div className="relative">
        <ul
          ref={track}
          aria-label="Foto galeri"
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        >
          {slides.map((s, i) => (
            <li key={s.src} className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]">
              <figure className="group relative overflow-hidden rounded-2xl bg-laut-dalam shadow-[0_10px_30px_-18px_rgba(8,58,99,0.45)]">
                <button type="button" onClick={() => setZoom(s)} className="block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laut-dalam" aria-label={`Perbesar foto ${i + 1}`}>
                  <img src={s.src} alt={s.alt} loading={i < 3 ? 'eager' : 'lazy'} className="aspect-[4/3] w-full object-cover" />
                </button>
                {s.caption && (
                  <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-laut-dalam/90 to-transparent px-4 pb-3 pt-10 text-sm font-bold text-white">
                    {s.caption}
                  </figcaption>
                )}
              </figure>
            </li>
          ))}
        </ul>

        {pages > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Foto sebelumnya"
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-3 text-laut-dalam shadow-lg backdrop-blur hover:bg-white disabled:opacity-0 sm:block"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index >= pages - 1}
              aria-label="Foto berikutnya"
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-3 text-laut-dalam shadow-lg backdrop-blur hover:bg-white disabled:opacity-0 sm:block"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-5 flex justify-center gap-2" role="group" aria-label="Pilih foto">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ke foto ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              className={`h-2.5 rounded-full transition-all ${i === index ? 'w-8 bg-laut-dalam' : 'w-2.5 bg-laut-dalam/25 hover:bg-laut-dalam/50'}`}
            />
          ))}
        </div>
      )}

      {zoom && (
        <div role="dialog" aria-modal="true" aria-label={zoom.caption ?? 'Foto'} className="fixed inset-0 z-[70] flex items-center justify-center bg-laut-dalam/90 p-4" onClick={() => setZoom(null)}>
          <button type="button" aria-label="Tutup" className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" onClick={() => setZoom(null)}>
            <X size={24} />
          </button>
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img src={zoom.src} alt={zoom.alt} className="max-h-[80vh] w-auto rounded-xl" />
            {zoom.caption && <figcaption className="mt-3 text-center font-bold text-white">{zoom.caption}</figcaption>}
          </figure>
        </div>
      )}
    </div>
  );
}

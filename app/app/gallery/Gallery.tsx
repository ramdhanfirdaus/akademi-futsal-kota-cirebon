'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ImagePlus, Trash2 } from 'lucide-react';

import { GalleryService } from '@/services';
import type { GalleryItem } from '@/services/GalleryService';
import { apiErrorMessage } from '@/services/errors';
import { AppHeader, ConfirmModal, LoadingSpinner, useNotification } from '@/components';
import { resizeImage } from '@/lib/image';

export default function Gallery() {
  const { showNotification } = useNotification();
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    GalleryService.list()
      .then((res) => setItems(res.data))
      .catch((e) => {
        setItems([]);
        showNotification({ type: 'error', message: apiErrorMessage(e) });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Resizes each photo in the browser, then uploads them one by one. */
  const upload = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (fileInput.current) fileInput.current.value = '';
    if (!list.length) return;
    setProgress({ done: 0, total: list.length });
    let ok = 0;
    for (const [i, file] of list.entries()) {
      try {
        const data = await resizeImage(file, 1600, 0.82);
        const res = await GalleryService.add(data);
        setItems((prev) => [res.data, ...(prev ?? [])]);
        ok += 1;
      } catch (e) {
        showNotification({ type: 'error', message: `${file.name}: ${apiErrorMessage(e, 'gagal diunggah')}` });
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (ok) showNotification({ type: 'success', message: `${ok} foto ditambahkan ke galeri` });
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await GalleryService.remove(deleteTarget.id);
      setItems((prev) => (prev ?? []).filter((p) => p.id !== deleteTarget.id));
      showNotification({ type: 'success', message: 'Foto dihapus dari galeri' });
      setDeleteTarget(null);
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <AppHeader
        title="Galeri"
        subtitle={
          <>
            Foto di sini tampil di bagian Galeri pada{' '}
            <Link href="/#galeri" target="_blank" className="font-bold text-laut hover:underline">
              halaman depan
            </Link>
            . Foto otomatis diperkecil sebelum diunggah.
          </>
        }
        actions={[{ label: progress ? `Mengunggah ${progress.done} dari ${progress.total}…` : 'Tambah foto', icon: ImagePlus, onClick: () => fileInput.current?.click(), disabled: !!progress }]}
      />
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => upload(e.target.files)} />

      {items === null ? (
        <LoadingSpinner text="Memuat galeri..." />
      ) : items.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center hover:border-laut"
        >
          <ImagePlus size={32} className="text-laut" aria-hidden />
          <span className="font-bold text-laut-dalam">Belum ada foto</span>
          <span className="text-sm text-slate-500">Klik untuk memilih foto latihan atau pertandingan. Bisa memilih beberapa sekaligus.</span>
        </button>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img src={item.url} alt={item.caption ?? 'Foto galeri'} loading="lazy" className="aspect-[4/3] w-full bg-slate-100 object-cover" />
              <div className="flex items-start gap-2 p-3">
                <CaptionField item={item} onSaved={(next) => setItems((prev) => (prev ?? []).map((p) => (p.id === next.id ? next : p)))} />
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  aria-label="Hapus foto"
                  title="Hapus foto"
                  className="mt-1 rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        variant="danger"
        title="Hapus foto ini?"
        description="Foto akan hilang dari galeri di halaman depan."
        confirmText="Hapus foto"
        isLoading={deleting}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/** Caption saved when the field loses focus or Enter is pressed. */
function CaptionField({ item, onSaved }: { item: GalleryItem; onSaved: (next: GalleryItem) => void }) {
  const { showNotification } = useNotification();
  const [value, setValue] = useState(item.caption ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const save = async () => {
    if (value.trim() === (item.caption ?? '')) return;
    setState('saving');
    try {
      const res = await GalleryService.updateCaption(item.id, value);
      onSaved(res.data);
      setState('saved');
      setTimeout(() => setState('idle'), 1500);
    } catch (e) {
      setState('idle');
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    }
  };

  return (
    <label className="flex-1">
      <span className="sr-only">Keterangan foto</span>
      <input
        value={value}
        maxLength={255}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder="Tambah keterangan, mis. Latihan kelas B1"
        className="w-full rounded-lg border-2 border-transparent px-2 py-1.5 text-sm text-laut-dalam placeholder:text-slate-400 hover:border-slate-200 focus:border-laut focus:outline-none"
      />
      <span className="flex h-4 items-center gap-1 px-2 text-xs text-slate-500" aria-live="polite">
        {state === 'saving' && 'Menyimpan…'}
        {state === 'saved' && (
          <>
            <Check size={12} aria-hidden /> Tersimpan
          </>
        )}
      </span>
    </label>
  );
}

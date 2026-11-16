'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from 'lucide-react';

import { ConfirmModal, useNotification } from '@/components';
import SaveBar from '@/components/SaveBar';
import AssessmentService, { type SemesterDTO } from '@/services/AssessmentService';
import { apiErrorMessage } from '@/services/errors';
import { TRACKS, TRACK_LABEL, type Track } from '@/lib/assessment';

type Draft = { id?: number; name: string; key: string };
let keySeq = 0;
const toDraft = (s: SemesterDTO, t: Track): Draft[] => s.aspects[t].map((a) => ({ id: a.id, name: a.name, key: `a${a.id}` }));

export default function AspectsTab({ semester, onChange }: { semester: SemesterDTO; onChange: (s: SemesterDTO) => void }) {
  const locked = semester.status === 'PUBLISHED';
  return (
    <div className="space-y-4">
      {locked && (
        <p className="flex items-center gap-2 rounded-xl border border-pantai bg-pantai/20 p-3 text-sm text-laut-dalam">
          <Lock size={16} aria-hidden /> Semester sudah diterbitkan. Batalkan terbit di tab Hasil untuk mengubah aspek.
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        {TRACKS.map((t) => (
          <TrackAspects key={t} semester={semester} track={t} locked={locked} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

function TrackAspects({ semester, track, locked, onChange }: { semester: SemesterDTO; track: Track; locked: boolean; onChange: (s: SemesterDTO) => void }) {
  const { showNotification } = useNotification();
  const [list, setList] = useState<Draft[]>(() => toDraft(semester, track));
  const [saving, setSaving] = useState(false);
  const [confirmRemoved, setConfirmRemoved] = useState<string[] | null>(null);

  useEffect(() => setList(toDraft(semester, track)), [semester, track]);

  const original = semester.aspects[track];
  const dirty = JSON.stringify(list.map((a) => [a.id ?? null, a.name.trim()])) !== JSON.stringify(original.map((a) => [a.id, a.name]));

  const move = (i: number, by: number) =>
    setList((prev) => {
      const next = [...prev];
      const [item] = next.splice(i, 1);
      next.splice(i + by, 0, item);
      return next;
    });

  const doSave = async () => {
    setConfirmRemoved(null);
    setSaving(true);
    try {
      const res = await AssessmentService.saveAspects(
        semester.id,
        track,
        list.filter((a) => a.name.trim()).map((a) => ({ id: a.id, name: a.name.trim() })),
      );
      onChange(res.data);
      showNotification({ type: 'success', message: `Aspek ${TRACK_LABEL[track].toLowerCase()} disimpan` });
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    const kept = new Set(list.map((a) => a.id));
    const removed = original.filter((a) => !kept.has(a.id)).map((a) => a.name);
    if (removed.length) setConfirmRemoved(removed);
    else doSave();
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
      <h2 className="font-display text-2xl font-black uppercase text-laut-dalam">Aspek {TRACK_LABEL[track]}</h2>
      {!locked && (
        <SaveBar onSave={save} disabled={!dirty} saving={saving}>
          <span className="text-sm text-slate-600">Urutan di sini = urutan di tabel nilai.</span>
        </SaveBar>
      )}
      {list.length === 0 && <p className="text-sm text-slate-500">Belum ada aspek.</p>}
      <ol className="space-y-2">
        {list.map((a, i) => (
          <li key={a.key} className="flex items-center gap-2">
            <span className="w-6 text-right text-sm font-bold text-slate-400">{i + 1}.</span>
            <input
              value={a.name}
              disabled={locked}
              maxLength={255}
              aria-label={`Nama aspek ${i + 1}`}
              onChange={(e) => setList((prev) => prev.map((x) => (x.key === a.key ? { ...x, name: e.target.value } : x)))}
              placeholder="Mis. Passing"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-laut focus:bg-white disabled:text-slate-500"
            />
            {!locked && (
              <>
                <IconButton label="Naikkan" disabled={i === 0} onClick={() => move(i, -1)} icon={<ArrowUp size={16} />} />
                <IconButton label="Turunkan" disabled={i === list.length - 1} onClick={() => move(i, 1)} icon={<ArrowDown size={16} />} />
                <IconButton label="Hapus aspek" danger onClick={() => setList((prev) => prev.filter((x) => x.key !== a.key))} icon={<Trash2 size={16} />} />
              </>
            )}
          </li>
        ))}
      </ol>
      {!locked && (
        <button
          type="button"
          onClick={() => setList((prev) => [...prev, { name: '', key: `n${++keySeq}` }])}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-bold text-laut-dalam hover:border-laut"
        >
          <Plus size={16} aria-hidden /> Tambah aspek
        </button>
      )}
      <ConfirmModal
        open={!!confirmRemoved}
        variant="danger"
        title="Hapus aspek?"
        description={`Nilai aspek ini akan ikut terhapus: ${confirmRemoved?.join(', ') ?? ''}.`}
        confirmText="Hapus dan simpan"
        isLoading={saving}
        onConfirm={doSave}
        onCancel={() => setConfirmRemoved(null)}
      />
    </section>
  );
}

export function IconButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 text-slate-500 disabled:opacity-30 ${danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-laut-muda hover:text-laut-dalam'}`}
    >
      {icon}
    </button>
  );
}

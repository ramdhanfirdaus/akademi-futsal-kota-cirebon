'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { ChevronRight, ClipboardCheck, Plus } from 'lucide-react';

import { AppHeader, BaseModal, FormInput, LoadingSpinner, useNotification } from '@/components';
import AssessmentService, { type SemesterDTO } from '@/services/AssessmentService';
import { apiErrorMessage } from '@/services/errors';
import { RootState } from '@/store';
import { UserRole } from '@/types.ts';
import { formatDate } from '@/lib/date';

export function StatusBadge({ status }: { status: SemesterDTO['status'] }) {
  return status === 'PUBLISHED' ? (
    <span className="rounded-full bg-daun/10 px-2.5 py-0.5 text-xs font-bold text-daun">Terbit</span>
  ) : (
    <span className="rounded-full bg-pantai/30 px-2.5 py-0.5 text-xs font-bold text-laut-dalam">Draf</span>
  );
}

export const useIsAdmin = () => useSelector((s: RootState) => s.auth.user?.role) === UserRole.ADMIN;

export default function Assessments() {
  const { showNotification } = useNotification();
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<SemesterDTO[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    AssessmentService.listSemesters()
      .then((res) => setItems(res.data))
      .catch((e) => {
        setItems([]);
        showNotification({ type: 'error', message: apiErrorMessage(e) });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <AppHeader
        title="Penilaian"
        subtitle="Nilai semester siswa (Cukup, Baik, Sangat Baik) dan sertifikatnya."
        actions={isAdmin ? [{ label: 'Buat semester', icon: Plus, onClick: () => setCreating(true) }] : []}
      />

      {items === null ? (
        <LoadingSpinner text="Memuat semester..." />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <ClipboardCheck size={32} className="text-laut" aria-hidden />
          <span className="font-bold text-laut-dalam">Belum ada semester penilaian</span>
          <span className="text-sm text-slate-500">{isAdmin ? 'Klik "Buat semester" untuk mulai.' : 'Admin belum membuat semester penilaian.'}</span>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((s) => (
            <li key={s.id}>
              <Link
                href={`/app/assessments/${s.id}`}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-laut"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-2xl font-black uppercase leading-none text-laut-dalam">{s.name}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {s.aspects.PLAYER.length} aspek pemain · {s.aspects.GOALKEEPER.length} aspek kiper
                    {s.status === 'PUBLISHED' && s.certificate_date && <> · terbit {formatDate(s.certificate_date)}</>}
                  </p>
                </div>
                <ChevronRight className="shrink-0 text-slate-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateSemesterModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(s) => {
          setItems((prev) => [s, ...(prev ?? [])]);
          setCreating(false);
          showNotification({ type: 'success', message: 'Semester dibuat. Aspek disalin dari semester sebelumnya.' });
        }}
      />
    </div>
  );
}

function CreateSemesterModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (s: SemesterDTO) => void }) {
  const { showNotification } = useNotification();
  const [name, setName] = useState('');
  const [format, setFormat] = useState('{urut}/S.FKC/');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await AssessmentService.createSemester({ name, number_format: format });
      setName('');
      onCreated(res.data);
    } catch (err) {
      const fieldErrors = (err as { response?: { data?: { errors?: Record<string, string[]> } } }).response?.data?.errors;
      if (fieldErrors) setErrors(fieldErrors);
      else showNotification({ type: 'error', message: apiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Buat semester" subtitle="Penilaian baru" maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <FormInput label="Nama semester" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Mis. 2026 Semester 1" maxLength={255} />
          {errors.name && <p className="mt-1 px-2 text-sm text-rose-600">{errors.name[0]}</p>}
        </div>
        <div>
          <FormInput
            label="Format nomor sertifikat"
            required
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            placeholder="{urut}/S.FKC/XII/2025"
            maxLength={255}
          />
          <p className="mt-1 px-2 text-xs text-slate-500">
            <code className="rounded bg-slate-100 px-1">{'{urut}'}</code> diganti nomor urut 001, 002, … Contoh: {'{urut}'}/S.FKC/XII/2025 → 004/S.FKC/XII/2025.
            Bisa diubah sampai pertama kali diterbitkan.
          </p>
          {errors.number_format && <p className="mt-1 px-2 text-sm text-rose-600">{errors.number_format[0]}</p>}
        </div>
        <button type="submit" disabled={saving} className="w-full rounded-xl bg-laut-dalam px-5 py-3 font-bold text-white hover:bg-laut disabled:bg-slate-300">
          {saving ? 'Menyimpan…' : 'Buat semester'}
        </button>
      </form>
    </BaseModal>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { AppHeader, BaseModal, ConfirmModal, FormInput, LoadingSpinner, useNotification } from '@/components';
import AssessmentService, { type SemesterDTO } from '@/services/AssessmentService';
import { apiErrorMessage } from '@/services/errors';
import { StatusBadge, useIsAdmin } from '../Assessments';
import AspectsTab from './AspectsTab';
import GradesTab from './GradesTab';
import ResultsTab from './ResultsTab';
import TemplateTab from './TemplateTab';

type Tab = 'grades' | 'aspects' | 'template' | 'results';

export default function SemesterDetail({ id }: { id: number }) {
  const { showNotification } = useNotification();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [semester, setSemester] = useState<SemesterDTO | null>(null);
  const [tab, setTab] = useState<Tab>('grades');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    AssessmentService.getSemester(id)
      .then((res) => setSemester(res.data))
      .catch((e) => showNotification({ type: 'error', message: apiErrorMessage(e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!semester) return <LoadingSpinner text="Memuat semester..." />;

  const tabs: { id: Tab; label: string; admin?: boolean }[] = [
    { id: 'grades', label: 'Nilai' },
    { id: 'aspects', label: 'Aspek', admin: true },
    { id: 'template', label: 'Template', admin: true },
    { id: 'results', label: 'Hasil & Terbitkan' },
  ];

  const remove = async () => {
    try {
      await AssessmentService.deleteSemester(semester.id);
      showNotification({ type: 'success', message: 'Semester dihapus' });
      router.push('/app/assessments');
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link href="/app/assessments" className="inline-flex items-center gap-1 text-sm font-bold text-laut hover:underline">
        <ArrowLeft size={16} aria-hidden /> Semua semester
      </Link>
      <AppHeader
        title={semester.name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={semester.status} />
            Format nomor: <code className="rounded bg-slate-100 px-1.5 text-laut-dalam">{semester.number_format}</code>
          </span>
        }
        actions={
          isAdmin
            ? [
                { label: 'Ubah', icon: Pencil, variant: 'secondary', onClick: () => setEditing(true) },
                ...(semester.first_published_at ? [] : [{ label: 'Hapus', icon: Trash2, variant: 'secondary' as const, onClick: () => setDeleting(true) }]),
              ]
            : []
        }
      />

      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Bagian semester">
        <div className="flex w-max gap-2">
          {tabs
            .filter((t) => isAdmin || !t.admin)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  tab === t.id ? 'bg-laut-dalam text-white' : 'border-2 border-slate-200 bg-white text-laut-dalam hover:border-laut'
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>
      </div>

      {tab === 'grades' && <GradesTab semester={semester} />}
      {tab === 'aspects' && isAdmin && <AspectsTab semester={semester} onChange={setSemester} />}
      {tab === 'template' && isAdmin && <TemplateTab semester={semester} onChange={setSemester} />}
      {tab === 'results' && <ResultsTab semester={semester} onChange={setSemester} />}

      <EditSemesterModal open={editing} semester={semester} onClose={() => setEditing(false)} onSaved={(s) => (setSemester(s), setEditing(false))} />
      <ConfirmModal
        open={deleting}
        variant="danger"
        title="Hapus semester?"
        description="Semua nilai, aspek, dan template semester ini ikut hilang."
        confirmText="Hapus semester"
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}

function EditSemesterModal({
  open,
  semester,
  onClose,
  onSaved,
}: {
  open: boolean;
  semester: SemesterDTO;
  onClose: () => void;
  onSaved: (s: SemesterDTO) => void;
}) {
  const { showNotification } = useNotification();
  const [name, setName] = useState(semester.name);
  const [format, setFormat] = useState(semester.number_format);
  const [saving, setSaving] = useState(false);
  const locked = !!semester.first_published_at;

  useEffect(() => {
    setName(semester.name);
    setFormat(semester.number_format);
  }, [semester, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await AssessmentService.updateSemester(semester.id, locked ? { name } : { name, number_format: format });
      showNotification({ type: 'success', message: 'Semester disimpan' });
      onSaved(res.data);
    } catch (err) {
      showNotification({ type: 'error', message: apiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Ubah semester" subtitle={semester.name} maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <FormInput label="Nama semester" required value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
        <div>
          <FormInput label="Format nomor sertifikat" required value={format} disabled={locked} onChange={(e) => setFormat(e.target.value)} maxLength={255} />
          <p className="mt-1 px-2 text-xs text-slate-500">
            {locked ? 'Terkunci karena sertifikat sudah pernah diterbitkan.' : 'Harus memuat {urut}, mis. {urut}/S.FKC/XII/2025.'}
          </p>
        </div>
        <button type="submit" disabled={saving} className="w-full rounded-xl bg-laut-dalam px-5 py-3 font-bold text-white hover:bg-laut disabled:bg-slate-300">
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </BaseModal>
  );
}

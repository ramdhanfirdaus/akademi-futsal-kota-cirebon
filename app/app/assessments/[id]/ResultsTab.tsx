'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Download, Send, Trash2, Undo2 } from 'lucide-react';

import { BaseModal, ConfirmModal, LoadingSpinner, SearchInput, useNotification } from '@/components';
import AssessmentService, { type PublishSummary, type ResultRow, type SemesterDTO } from '@/services/AssessmentService';
import { apiErrorMessage } from '@/services/errors';
import { TRACK_LABEL } from '@/lib/assessment';
import { buildCertificatePdf, fromJsonInput } from '@/lib/certificate';
import { useIsAdmin } from '../Assessments';

const STATUS: Record<ResultRow['status'], { label: string; cls: string }> = {
  BELUM_DINILAI: { label: 'Belum dinilai', cls: 'bg-slate-100 text-slate-600' },
  BELUM_LENGKAP: { label: 'Belum lengkap', cls: 'bg-pantai/30 text-laut-dalam' },
  LENGKAP: { label: 'Lengkap', cls: 'bg-laut-muda text-laut' },
  BERNOMOR: { label: 'Bernomor', cls: 'bg-daun/10 text-daun' },
  NONAKTIF: { label: 'Akun nonaktif', cls: 'bg-rose-50 text-rose-700' },
};

const btn =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:bg-slate-300 disabled:text-white';
const primary = `${btn} bg-laut-dalam text-white hover:bg-laut`;
const secondary = `${btn} border-2 border-slate-200 bg-white text-laut-dalam hover:border-laut`;

export default function ResultsTab({ semester, onChange }: { semester: SemesterDTO; onChange: (s: SemesterDTO) => void }) {
  const { showNotification } = useNotification();
  const isAdmin = useIsAdmin();
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState<PublishSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResultRow | null>(null);
  const [zip, setZip] = useState<{ done: number; total: number } | null>(null);
  const [date, setDate] = useState(semester.certificate_date ?? '');

  const load = () =>
    AssessmentService.results(semester.id)
      .then((res) => setRows(res.data))
      .catch((e) => {
        setRows([]);
        showNotification({ type: 'error', message: apiErrorMessage(e) });
      });

  useEffect(() => {
    load();
    setDate(semester.certificate_date ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester.id, semester.status, semester.certificate_date]);

  const shown = useMemo(() => (rows ?? []).filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase())), [rows, search]);
  const numbered = (rows ?? []).filter((r) => r.assessment_id && r.certificate_no && r.status === 'BERNOMOR');

  const openPublish = async () => {
    setBusy(true);
    try {
      setSummary((await AssessmentService.publishSummary(semester.id)).data);
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const run = async (fn: () => Promise<SemesterDTO>, message: string) => {
    setBusy(true);
    try {
      onChange(await fn());
      showNotification({ type: 'success', message });
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setBusy(false);
      setSummary(null);
      setConfirmUnpublish(false);
    }
  };

  const saveDate = () => {
    if ((semester.certificate_date ?? '') === date) return;
    run(async () => (await AssessmentService.updateSemester(semester.id, { certificate_date: date || null })).data, 'Tanggal sertifikat disimpan');
  };

  const removeAssessment = async () => {
    if (!deleteTarget?.assessment_id) return;
    setBusy(true);
    try {
      await AssessmentService.deleteAssessment(deleteTarget.assessment_id);
      showNotification({ type: 'success', message: 'Penilaian dihapus' });
      setDeleteTarget(null);
      load();
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  /** Builds every numbered certificate in this browser (avoids server time limits), then zips them. */
  const downloadZip = async () => {
    const { zipSync } = await import('fflate');
    const files: Record<string, Uint8Array> = {};
    setZip({ done: 0, total: numbered.length });
    try {
      for (const [i, r] of numbered.entries()) {
        const input = fromJsonInput((await AssessmentService.certificateInput(r.assessment_id!)).data);
        let name = input.fileName;
        for (let n = 2; files[name]; n++) name = input.fileName.replace(/\.pdf$/, `-${n}.pdf`);
        files[name] = await buildCertificatePdf(input);
        setZip({ done: i + 1, total: numbered.length });
      }
      const blob = new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sertifikat-${semester.name.replace(/[^A-Za-z0-9-]+/g, '-')}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e, 'Gagal membuat ZIP') });
    } finally {
      setZip(null);
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex flex-col gap-3 rounded-2xl border border-laut/10 bg-laut-muda/50 p-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block">
            <span className="block px-1 text-xs font-black uppercase text-laut-dalam">Tanggal sertifikat</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={saveDate}
              className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-laut"
            />
            <span className="block px-1 pt-1 text-xs text-slate-500">Kosong = tanggal pertama kali diterbitkan.</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            {semester.status === 'DRAFT' ? (
              <button type="button" className={primary} disabled={busy} onClick={openPublish}>
                <Send size={16} aria-hidden /> Terbitkan
              </button>
            ) : (
              <button type="button" className={secondary} disabled={busy} onClick={() => setConfirmUnpublish(true)}>
                <Undo2 size={16} aria-hidden /> Batalkan terbit
              </button>
            )}
            <button type="button" className={secondary} disabled={!!zip || !numbered.length} onClick={downloadZip}>
              <Archive size={16} aria-hidden />
              {zip ? `Membuat ${zip.done} dari ${zip.total}…` : `Unduh semua (ZIP, ${numbered.length})`}
            </button>
          </div>
        </div>
      )}

      <SearchInput value={search} onChange={setSearch} placeholder="Cari nama siswa" />

      {rows === null ? (
        <LoadingSpinner text="Memuat hasil..." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3">Jalur</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Nomor</th>
                <th className="px-4 py-3 text-right">Sertifikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((r) => (
                <tr key={`${r.student_id}-${r.track}`}>
                  <td className="px-4 py-3 font-bold text-laut-dalam">{r.name}</td>
                  <td className="px-4 py-3">{r.class}</td>
                  <td className="px-4 py-3">{TRACK_LABEL[r.track]}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                    {r.status === 'BERNOMOR' && !r.visible && <span className="ml-2 text-xs text-slate-500">(belum terbit)</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.certificate_no ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {r.assessment_id && r.status !== 'BELUM_DINILAI' && (
                        <a
                          href={AssessmentService.certificateUrl(r.assessment_id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-bold text-laut hover:bg-laut-muda"
                          title={r.certificate_no ? 'Unduh sertifikat' : 'Pratinjau (belum bernomor)'}
                        >
                          <Download size={16} aria-hidden /> {r.certificate_no ? 'Unduh' : 'Pratinjau'}
                        </a>
                      )}
                      {isAdmin && r.status === 'NONAKTIF' && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Hapus penilaian"
                          title="Hapus penilaian"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Tidak ada siswa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BaseModal open={!!summary} onClose={() => setSummary(null)} title="Terbitkan nilai?" subtitle={semester.name} maxWidth="max-w-xl">
        {summary && (
          <div className="space-y-4 text-sm">
            {(['PLAYER', 'GOALKEEPER'] as const).map((t) => (
              <div key={t}>
                <p className="font-bold text-laut-dalam">
                  {TRACK_LABEL[t]}: {summary.tracks[t].complete} lengkap, {summary.tracks[t].incomplete.length} belum lengkap
                </p>
                {summary.tracks[t].incomplete.length > 0 && (
                  <ul className="mt-1 max-h-32 overflow-y-auto rounded-xl bg-slate-50 p-2 text-slate-600">
                    {summary.tracks[t].incomplete.map((s) => (
                      <li key={s.student_id}>
                        {s.name} <span className="text-slate-400">· {s.class}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {summary.missing_templates.length > 0 ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
                Template sertifikat {summary.missing_templates.map((t) => TRACK_LABEL[t]).join(' dan ')} belum diunggah. Unggah di tab Template dulu.
              </p>
            ) : (
              <p className="text-slate-600">
                Yang lengkap mendapat nomor sertifikat dan bisa dilihat siswa. Yang belum lengkap tidak diberi nomor dan tetap tersembunyi. Nilai terkunci
                sampai penerbitan dibatalkan.
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={secondary} onClick={() => setSummary(null)}>
                Batal
              </button>
              <button
                type="button"
                className={primary}
                disabled={busy || !summary.can_publish}
                onClick={() => run(async () => (await AssessmentService.publish(semester.id)).data, 'Nilai diterbitkan')}
              >
                <Send size={16} aria-hidden /> {busy ? 'Menerbitkan…' : 'Terbitkan'}
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      <ConfirmModal
        open={confirmUnpublish}
        title="Batalkan terbit?"
        description="Siswa tidak bisa melihat nilai dan sertifikat sampai diterbitkan lagi. Nomor sertifikat yang sudah ada tidak berubah."
        confirmText="Batalkan terbit"
        isLoading={busy}
        onConfirm={() => run(async () => (await AssessmentService.unpublish(semester.id)).data, 'Penerbitan dibatalkan')}
        onCancel={() => setConfirmUnpublish(false)}
      />
      <ConfirmModal
        open={!!deleteTarget}
        variant="danger"
        title="Hapus penilaian?"
        description={`Penilaian ${deleteTarget ? TRACK_LABEL[deleteTarget.track].toLowerCase() : ''} milik ${deleteTarget?.name ?? ''} (akun nonaktif) akan dihapus.`}
        confirmText="Hapus"
        isLoading={busy}
        onConfirm={removeAssessment}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

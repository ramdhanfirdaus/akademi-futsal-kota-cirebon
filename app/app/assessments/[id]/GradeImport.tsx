'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Upload } from 'lucide-react';

import { BaseModal } from '@/components';
import AssessmentService, { type GradeGrid, type SemesterDTO } from '@/services/AssessmentService';
import { apiErrorMessage } from '@/services/errors';
import { gradeSheetToRows, gradeTemplateSheets, type GradeSheetRow } from '@/lib/gradeSheet';
import { parseGrade, GRADE_LABEL, TRACK_LABEL, type Track } from '@/lib/assessment';
import { classLabel } from '@/lib/format';

type Step = 'pick' | 'preview' | 'done';

export default function GradeImport({
  open,
  onClose,
  onImported,
  semester,
  classId,
  className,
  track,
  grid,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  semester: SemesterDTO;
  classId: number;
  className: string;
  track: Track;
  grid: GradeGrid;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('pick');
  const [rows, setRows] = useState<GradeSheetRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});
  const [general, setGeneral] = useState<string[]>([]);
  const [warning, setWarning] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(0);

  const aspectName = Object.fromEntries(grid.aspects.map((a) => [String(a.id), a.name]));

  const reset = () => {
    setStep('pick');
    setRows([]);
    setRowErrors({});
    setGeneral([]);
    setWarning('');
    setSaved(0);
    if (fileInput.current) fileInput.current.value = '';
  };
  const close = () => {
    if (saved) onImported();
    reset();
    onClose();
  };

  const downloadTemplate = async () => {
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    const sheets = gradeTemplateSheets(grid.aspects, grid.rows, { semester: semester.name, className: classLabel(className), track });
    const safe = `${semester.name}-${className}-${TRACK_LABEL[track]}`.replace(/[^A-Za-z0-9-]+/g, '-');
    await writeExcelFile(sheets as never).toFile(`nilai-${safe}.xlsx`);
  };

  const body = (data: GradeSheetRow[], dry_run: boolean) => ({ class_id: classId, track, dry_run, rows: data });

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    reset();
    setBusy(true);
    try {
      const { readSheet } = await import('read-excel-file/browser');
      const parsed = gradeSheetToRows((await readSheet(file)) as unknown[][], grid.aspects);
      if (parsed.missing.includes('Username')) {
        setGeneral(['Kolom Username tidak ditemukan. Gunakan template dari tombol "Unduh template nilai".']);
        setStep('preview');
        return;
      }
      if (parsed.missing.length) setWarning(`Kolom aspek tidak ditemukan (nilainya tidak diubah): ${parsed.missing.join(', ')}`);
      if (!parsed.rows.length) {
        setGeneral(['File tidak berisi data nilai.']);
        setStep('preview');
        return;
      }
      setRows(parsed.rows);
      try {
        await AssessmentService.importGrades(semester.id, body(parsed.rows, true));
      } catch (e) {
        const res = (e as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } }).response;
        if (res?.status !== 422 || !res.data?.errors) throw e;
        const byRow: Record<number, string[]> = {};
        const other: string[] = [];
        for (const [key, msgs] of Object.entries(res.data.errors)) {
          const m = /^rows\.(\d+)\.(?:aspect:)?(.+)$/.exec(key);
          if (!m) other.push(...msgs);
          else (byRow[Number(m[1])] ??= []).push(...msgs.map((msg) => `${m[2] === 'username' ? 'Username' : (aspectName[m[2]] ?? m[2])}: ${msg}`));
        }
        setRowErrors(byRow);
        setGeneral(other);
      }
      setStep('preview');
    } catch (e) {
      setGeneral([e instanceof Error && !('response' in e) ? 'File tidak bisa dibaca. Pastikan formatnya .xlsx.' : apiErrorMessage(e)]);
      setStep('preview');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await AssessmentService.importGrades(semester.id, body(rows, false));
      setSaved(res.data.count);
      setStep('done');
    } catch (e) {
      setGeneral([apiErrorMessage(e)]);
    } finally {
      setBusy(false);
    }
  };

  const errorCount = Object.keys(rowErrors).length + general.length;
  const shown = (v: unknown) => {
    const g = parseGrade(v);
    return g ? GRADE_LABEL[g] : g === null ? String(v) : '';
  };

  return (
    <BaseModal open={open} onClose={close} title="Impor nilai dari Excel" subtitle={`${classLabel(className)} · ${TRACK_LABEL[track]}`} maxWidth="max-w-4xl">
      <div className="space-y-4 text-sm">
        {step === 'pick' && (
          <>
            <ol className="list-decimal space-y-1 pl-5 text-slate-600">
              <li>Unduh template — sudah berisi siswa kelas ini dan nilai yang ada.</li>
              <li>Isi Cukup / Baik / Sangat Baik (atau C / B / SB). Sel kosong = tidak diubah.</li>
              <li>Unggah. Jika ada baris yang salah, tidak ada yang disimpan.</li>
            </ol>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 font-bold text-laut-dalam hover:border-laut"
              >
                <Download size={16} aria-hidden /> Unduh template nilai
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-laut-dalam px-4 py-2.5 font-bold text-white hover:bg-laut disabled:bg-slate-300"
              >
                <Upload size={16} aria-hidden /> {busy ? 'Membaca…' : 'Unggah file'}
              </button>
            </div>
          </>
        )}
        <input ref={fileInput} type="file" accept=".xlsx" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />

        {step === 'preview' && (
          <>
            {errorCount > 0 ? (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                <p className="flex items-center gap-2 font-bold">
                  <AlertCircle size={16} aria-hidden /> Ada yang perlu diperbaiki. Belum ada nilai yang disimpan.
                </p>
                {general.map((g) => (
                  <p key={g} className="mt-1">
                    {g}
                  </p>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-xl border border-daun/30 bg-daun/10 p-3 font-bold text-daun">
                <CheckCircle2 size={16} aria-hidden /> {rows.length} baris siap disimpan.
              </p>
            )}
            {warning && <p className="rounded-xl border border-pantai bg-pantai/20 p-3 text-laut-dalam">{warning}</p>}
            {rows.length > 0 && (
              <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50 text-xs font-black uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Baris</th>
                      <th className="px-3 py-2">Username</th>
                      {grid.aspects.map((a) => (
                        <th key={a.id} className="px-3 py-2">
                          {a.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <React.Fragment key={r._row}>
                        <tr className={rowErrors[r._row] ? 'bg-rose-50' : ''}>
                          <td className="px-3 py-2 text-slate-400">{r._row}</td>
                          <td className="px-3 py-2 font-bold">{r.username}</td>
                          {grid.aspects.map((a) => (
                            <td key={a.id} className="px-3 py-2">
                              {shown(r.scores[String(a.id)])}
                            </td>
                          ))}
                        </tr>
                        {rowErrors[r._row] && (
                          <tr className="bg-rose-50">
                            <td />
                            <td colSpan={grid.aspects.length + 1} className="px-3 pb-2 text-xs text-rose-700">
                              {rowErrors[r._row].join(' · ')}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 font-bold text-laut-dalam hover:border-laut"
              >
                Pilih file lain
              </button>
              <button
                type="button"
                disabled={busy || errorCount > 0 || !rows.length}
                onClick={save}
                className="rounded-xl bg-laut-dalam px-4 py-2.5 font-bold text-white hover:bg-laut disabled:bg-slate-300"
              >
                {busy ? 'Menyimpan…' : `Simpan ${rows.length} baris`}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 rounded-xl border border-daun/30 bg-daun/10 p-3 font-bold text-daun">
              <CheckCircle2 size={16} aria-hidden /> Nilai {saved} siswa disimpan.
            </p>
            <button type="button" onClick={close} className="w-full rounded-xl bg-laut-dalam px-4 py-2.5 font-bold text-white hover:bg-laut">
              Selesai
            </button>
          </div>
        )}
      </div>
    </BaseModal>
  );
}

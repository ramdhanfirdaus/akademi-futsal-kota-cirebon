'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';

import { BaseModal } from '@/components';
import { StudentService } from '@/services';
import type { ImportResult } from '@/services/StudentService';
import { apiErrorMessage } from '@/services/errors';
import { STUDENT_COLUMNS, sheetToRows, templateSheets, type SheetRow } from '@/lib/studentSheet';
import { classLabel } from '@/lib/format';

type Step = 'pick' | 'preview' | 'done';
type RowErrors = Record<number, string[]>;

const LABEL = Object.fromEntries(STUDENT_COLUMNS.map((c) => [c.key, c.header]));

/** `errors` keys look like `rows.<line>.<field>`; group them per spreadsheet line with readable field names. */
function groupErrors(errors: Record<string, string[]>): { byRow: RowErrors; general: string[] } {
  const byRow: RowErrors = {};
  const general: string[] = [];
  for (const [key, msgs] of Object.entries(errors)) {
    const m = /^rows\.(\d+)\.(.+)$/.exec(key);
    if (!m) {
      general.push(...msgs);
      continue;
    }
    const line = Number(m[1]);
    const field = m[2] === 'class_id' ? 'class' : m[2];
    (byRow[line] ??= []).push(...msgs.map((msg) => `${LABEL[field] ?? field}: ${msg}`));
  }
  return { byRow, general };
}

export default function StudentImport({
  open,
  onClose,
  onImported,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  classes: { id?: number; name: string }[];
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('pick');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [rowErrors, setRowErrors] = useState<RowErrors>({});
  const [general, setGeneral] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setStep('pick');
    setFileName('');
    setRows([]);
    setRowErrors({});
    setGeneral([]);
    setResult(null);
    if (fileInput.current) fileInput.current.value = '';
  };
  const close = () => {
    if (result) onImported();
    reset();
    onClose();
  };

  const downloadTemplate = async () => {
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    await writeExcelFile(templateSheets(classes.map((c) => c.name)) as never).toFile('template-siswa-afkc.xlsx');
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    setBusy(true);
    try {
      const { readSheet } = await import('read-excel-file/browser');
      const parsed = sheetToRows((await readSheet(file)) as unknown[][]);
      if (parsed.missing.length) {
        setGeneral([`Kolom wajib tidak ditemukan: ${parsed.missing.join(', ')}. Gunakan template terbaru.`]);
        setStep('preview');
        return;
      }
      setRows(parsed.rows);
      await validate(parsed.rows);
    } catch (e) {
      setGeneral([e instanceof Error && !('response' in e) ? 'File tidak bisa dibaca. Pastikan formatnya .xlsx.' : apiErrorMessage(e)]);
      setStep('preview');
    } finally {
      setBusy(false);
    }
  };

  /** Server-side dry run, so the preview shows exactly what saving would reject. */
  const validate = async (data: SheetRow[]) => {
    try {
      await StudentService.importStudents(data, true);
      setRowErrors({});
      setGeneral([]);
    } catch (e) {
      const errors = (e as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } }).response;
      if (errors?.status === 422 && errors.data?.errors) {
        const g = groupErrors(errors.data.errors);
        setRowErrors(g.byRow);
        setGeneral(g.general);
      } else throw e;
    } finally {
      setStep('preview');
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      setResult(await StudentService.importStudents(rows, false));
      setStep('done');
    } catch (e) {
      setGeneral([apiErrorMessage(e)]);
    } finally {
      setBusy(false);
    }
  };

  const downloadAccounts = async () => {
    if (!result) return;
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    const pw = new Map(rows.map((r) => [r._row, String(r.password ?? 'afkc2026')]));
    const bold = (v: string) => ({ value: v, fontWeight: 'bold' as const });
    await writeExcelFile(
      [
        [bold('Nama'), bold('Kelas'), bold('Username'), bold('Password awal')],
        ...result.created.map((c) => [{ value: c.name }, { value: classLabel(c.class) }, { value: c.username }, { value: pw.get(c.row) ?? 'afkc2026' }]),
      ] as never,
      { columns: [{ width: 26 }, { width: 14 }, { width: 16 }, { width: 16 }] } as never,
    ).toFile('akun-siswa-baru.xlsx');
  };

  const errorCount = Object.keys(rowErrors).length;
  const canSave = step === 'preview' && rows.length > 0 && errorCount === 0 && general.length === 0;

  return (
    <BaseModal open={open} onClose={close} title="Impor Siswa dari Excel" subtitle="Tambah banyak siswa sekaligus" maxWidth="max-w-4xl">
      <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
        {step !== 'done' && (
          <ol className="grid gap-3 sm:grid-cols-2">
            <li className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-800">1. Unduh dan isi template</p>
              <p className="mt-1 text-sm text-slate-500">Wajib: Nama Lengkap, Nama Panggilan, Kelas. Kolom lain boleh kosong.</p>
              <button type="button" onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-400">
                <Download size={16} aria-hidden /> Unduh template
              </button>
            </li>
            <li className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-800">2. Unggah file yang sudah diisi</p>
              <p className="mt-1 truncate text-sm text-slate-500">{fileName || 'Format .xlsx'}</p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                <Upload size={16} aria-hidden /> {busy ? 'Memeriksa…' : fileName ? 'Pilih file lain' : 'Pilih file'}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => readFile(e.target.files?.[0])}
              />
            </li>
          </ol>
        )}

        {general.length > 0 && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {general.map((g) => (
              <p key={g}>{g}</p>
            ))}
          </div>
        )}

        {step === 'preview' && rows.length > 0 && (
          <section>
            <div className={`mb-3 flex items-center gap-2 rounded-xl p-3 text-sm font-bold ${errorCount ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {errorCount ? <AlertCircle size={18} aria-hidden /> : <CheckCircle2 size={18} aria-hidden />}
              {errorCount
                ? `${errorCount} dari ${rows.length} baris perlu diperbaiki. Perbaiki di Excel lalu unggah ulang; belum ada yang disimpan.`
                : `${rows.length} siswa siap disimpan.`}
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Baris</th>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Panggilan</th>
                    <th className="px-3 py-2">Kelas</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...rows]
                    .sort((a, b) => Number(!!rowErrors[b._row]) - Number(!!rowErrors[a._row]) || a._row - b._row)
                    .map((r) => (
                      <tr key={r._row} className={rowErrors[r._row] ? 'bg-rose-50/50' : ''}>
                        <td className="px-3 py-2 tabular-nums text-slate-500">{r._row}</td>
                        <td className="px-3 py-2 font-bold text-slate-800">{String(r.name ?? '–')}</td>
                        <td className="px-3 py-2">{String(r.nickname ?? '–')}</td>
                        <td className="px-3 py-2">{r.class ? classLabel(String(r.class)) : '–'}</td>
                        <td className="px-3 py-2">
                          {rowErrors[r._row] ? (
                            <ul className="space-y-0.5 text-rose-700">
                              {rowErrors[r._row].map((m) => (
                                <li key={m}>{m}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                              <CheckCircle2 size={15} aria-hidden /> Siap
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {step === 'done' && result && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 size={24} aria-hidden />
              <div>
                <p className="font-bold">{result.count} siswa berhasil ditambahkan</p>
                <p className="text-sm">Bagikan username dan password awal ke siswa, lalu minta mereka menggantinya di menu Profil Saya.</p>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Kelas</th>
                    <th className="px-3 py-2">Username</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.created.map((c) => (
                    <tr key={c.row}>
                      <td className="px-3 py-2 font-bold text-slate-800">{c.name}</td>
                      <td className="px-3 py-2">{classLabel(c.class)}</td>
                      <td className="px-3 py-2 font-mono">{c.username}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-4">
        {step === 'done' ? (
          <>
            <button type="button" onClick={downloadAccounts} className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2 font-bold text-slate-700 hover:border-blue-400">
              <FileSpreadsheet size={18} aria-hidden /> Unduh daftar akun
            </button>
            <button type="button" onClick={close} className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700">
              Selesai
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={close} className="rounded-xl px-4 py-2 font-bold text-slate-600 hover:bg-slate-100">
              Batal
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave || busy}
              className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              {busy && step === 'preview' ? 'Menyimpan…' : `Simpan ${rows.length && !errorCount ? rows.length : ''} siswa`}
            </button>
          </>
        )}
      </div>
    </BaseModal>
  );
}

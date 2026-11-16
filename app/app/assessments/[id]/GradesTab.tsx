'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Lock } from 'lucide-react';

import { LoadingSpinner, useNotification } from '@/components';
import SaveBar from '@/components/SaveBar';
import { ClassService } from '@/services';
import AssessmentService, { type GradeGrid, type SemesterDTO } from '@/services/AssessmentService';
import { apiErrorMessage } from '@/services/errors';
import { GRADES, GRADE_LABEL, TRACKS, TRACK_LABEL, type Grade, type Track } from '@/lib/assessment';
import { classLabel } from '@/lib/format';
import GradeImport from './GradeImport';

type Edits = Record<number, Record<string, Grade | null>>;
const SHORT: Record<Grade, string> = { CUKUP: 'C', BAIK: 'B', SANGAT_BAIK: 'SB' };
const ACTIVE: Record<Grade, string> = { CUKUP: 'bg-slate-600 text-white', BAIK: 'bg-laut text-white', SANGAT_BAIK: 'bg-daun text-white' };

export default function GradesTab({ semester }: { semester: SemesterDTO }) {
  const { showNotification } = useNotification();
  const [classes, setClasses] = useState<{ id: number; name: string }[] | null>(null);
  const [classId, setClassId] = useState<number | null>(null);
  const [track, setTrack] = useState<Track>('PLAYER');
  const [grid, setGrid] = useState<GradeGrid | null>(null);
  const [edits, setEdits] = useState<Edits>({});
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const locked = semester.status === 'PUBLISHED';

  useEffect(() => {
    ClassService.getClasses()
      .then((res) => {
        const list = res.data.filter((c) => c.id).map((c) => ({ id: c.id!, name: c.name }));
        setClasses(list);
        setClassId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch((e) => {
        setClasses([]);
        showNotification({ type: 'error', message: apiErrorMessage(e) });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = () => {
    if (!classId) return;
    setGrid(null);
    setEdits({});
    AssessmentService.getGrid(semester.id, classId, track)
      .then((res) => setGrid(res.data))
      .catch((e) => {
        setGrid({ aspects: [], rows: [] });
        showNotification({ type: 'error', message: apiErrorMessage(e) });
      });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [semester.id, semester.status, semester.aspects, classId, track]);

  const value = (studentId: number, aspectId: number): Grade | null => {
    const key = String(aspectId);
    const e = edits[studentId];
    if (e && key in e) return e[key];
    return grid?.rows.find((r) => r.student_id === studentId)?.scores[key] ?? null;
  };

  const setCell = (studentId: number, aspectId: number, grade: Grade | null) => {
    const key = String(aspectId);
    const original = grid?.rows.find((r) => r.student_id === studentId)?.scores[key] ?? null;
    setEdits((prev) => {
      const row = { ...(prev[studentId] ?? {}) };
      if (grade === original) delete row[key];
      else row[key] = grade;
      const next = { ...prev, [studentId]: row };
      if (!Object.keys(row).length) delete next[studentId];
      return next;
    });
  };

  const fillColumn = (aspectId: number, grade: Grade) => grid?.rows.forEach((r) => setCell(r.student_id, aspectId, grade));

  const changed = Object.keys(edits).length;
  const save = async () => {
    if (!classId) return;
    setSaving(true);
    try {
      const rows = Object.entries(edits).map(([sid, scores]) => ({ student_id: Number(sid), scores }));
      await AssessmentService.saveGrades(semester.id, { class_id: classId, track, rows });
      showNotification({ type: 'success', message: `Nilai ${rows.length} siswa disimpan` });
      load();
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const className = useMemo(() => classes?.find((c) => c.id === classId)?.name ?? '', [classes, classId]);

  if (classes === null) return <LoadingSpinner text="Memuat kelas..." />;
  if (!classes.length) return <p className="text-slate-500">Belum ada kelas.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Pilih kelas">
          <div className="flex w-max gap-2">
            {classes.map((c) => (
              <Chip key={c.id} active={c.id === classId} onClick={() => setClassId(c.id)}>
                {classLabel(c.name)}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex gap-2" role="group" aria-label="Pilih jalur">
          {TRACKS.map((t) => (
            <Chip key={t} active={t === track} onClick={() => setTrack(t)}>
              {TRACK_LABEL[t]}
            </Chip>
          ))}
        </div>
      </div>

      {locked ? (
        <p className="flex items-center gap-2 rounded-xl border border-pantai bg-pantai/20 p-3 text-sm text-laut-dalam">
          <Lock size={16} aria-hidden /> Nilai terkunci karena semester sudah diterbitkan. Batalkan terbit di tab Hasil untuk mengubah.
        </p>
      ) : (
        <SaveBar onSave={save} disabled={!changed} saving={saving}>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>{changed ? `${changed} siswa diubah` : 'C = Cukup, B = Baik, SB = Sangat Baik, – = kosong'}</span>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 font-bold text-laut-dalam hover:border-laut"
            >
              <FileSpreadsheet size={16} aria-hidden /> Excel
            </button>
          </div>
        </SaveBar>
      )}

      {grid === null ? (
        <LoadingSpinner text="Memuat nilai..." />
      ) : !grid.aspects.length ? (
        <p className="rounded-xl bg-white p-6 text-center text-slate-500">
          Belum ada aspek {TRACK_LABEL[track].toLowerCase()}. Admin bisa menambahkannya di tab Aspek.
        </p>
      ) : !grid.rows.length ? (
        <p className="rounded-xl bg-white p-6 text-center text-slate-500">Tidak ada siswa aktif {TRACK_LABEL[track].toLowerCase()} di kelas ini.</p>
      ) : (
        <>
          {/* Laptop: table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left">Nama</th>
                  {grid.aspects.map((a) => (
                    <th key={a.id} className="px-3 py-3 text-center">
                      <div>{a.name}</div>
                      {!locked && (
                        <select
                          aria-label={`Isi semua ${a.name}`}
                          value=""
                          onChange={(e) => e.target.value && fillColumn(a.id, e.target.value as Grade)}
                          className="mt-1 rounded-lg border border-slate-200 bg-white px-1 py-0.5 text-[11px] font-bold normal-case text-slate-500"
                        >
                          <option value="">isi semua…</option>
                          {GRADES.map((g) => (
                            <option key={g} value={g}>
                              {GRADE_LABEL[g]}
                            </option>
                          ))}
                        </select>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left">Nomor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grid.rows.map((r) => (
                  <tr key={r.student_id} className={edits[r.student_id] ? 'bg-pantai/10' : ''}>
                    <td className="sticky left-0 bg-inherit px-4 py-2 font-bold text-laut-dalam">{r.name}</td>
                    {grid.aspects.map((a) => (
                      <td key={a.id} className="px-3 py-2 text-center">
                        <GradePicker
                          value={value(r.student_id, a.id)}
                          disabled={locked}
                          label={`${a.name} ${r.name}`}
                          onChange={(g) => setCell(r.student_id, a.id, g)}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{r.certificate_no ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: one card per student */}
          <ul className="space-y-3 md:hidden">
            {grid.rows.map((r) => (
              <li key={r.student_id} className={`rounded-2xl border bg-white p-4 ${edits[r.student_id] ? 'border-pantai' : 'border-slate-200'}`}>
                <p className="font-bold text-laut-dalam">{r.name}</p>
                <dl className="mt-2 space-y-2">
                  {grid.aspects.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2">
                      <dt className="text-sm text-slate-600">{a.name}</dt>
                      <dd>
                        <GradePicker
                          value={value(r.student_id, a.id)}
                          disabled={locked}
                          label={`${a.name} ${r.name}`}
                          onChange={(g) => setCell(r.student_id, a.id, g)}
                        />
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      {classId && grid && (
        <GradeImport
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={load}
          semester={semester}
          classId={classId}
          className={className}
          track={track}
          grid={grid}
        />
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
        active ? 'bg-laut text-white' : 'border border-slate-200 bg-white text-laut-dalam hover:border-laut'
      }`}
    >
      {children}
    </button>
  );
}

/** Four-way choice: –, C, B, SB. */
function GradePicker({ value, onChange, disabled, label }: { value: Grade | null; onChange: (g: Grade | null) => void; disabled?: boolean; label: string }) {
  const options: (Grade | null)[] = [null, ...GRADES];
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-slate-200">
      {options.map((g) => {
        const on = value === g;
        return (
          <button
            key={g ?? 'none'}
            type="button"
            role="radio"
            aria-checked={on}
            title={g ? GRADE_LABEL[g] : 'Kosongkan'}
            disabled={disabled}
            onClick={() => onChange(g)}
            className={`min-w-[2.25rem] px-2 py-1.5 text-xs font-black transition-colors disabled:cursor-not-allowed ${
              on ? (g ? ACTIVE[g] : 'bg-slate-200 text-slate-600') : 'bg-white text-slate-400 hover:bg-laut-muda'
            }`}
          >
            {g ? SHORT[g] : '–'}
          </button>
        );
      })}
    </div>
  );
}

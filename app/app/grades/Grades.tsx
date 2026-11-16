'use client';

import React, { useEffect, useState } from 'react';
import { Award, Download } from 'lucide-react';

import { AppHeader, LoadingSpinner, useNotification } from '@/components';
import AssessmentService, { type MyGradesSemester } from '@/services/AssessmentService';
import { apiErrorMessage } from '@/services/errors';
import { GRADE_LABEL, TRACK_LABEL, type Grade } from '@/lib/assessment';
import { formatDate } from '@/lib/date';

export const GRADE_CHIP: Record<Grade, string> = {
  CUKUP: 'bg-slate-100 text-slate-700',
  BAIK: 'bg-laut-muda text-laut',
  SANGAT_BAIK: 'bg-daun/10 text-daun',
};

export default function Grades() {
  const { showNotification } = useNotification();
  const [items, setItems] = useState<MyGradesSemester[] | null>(null);

  useEffect(() => {
    AssessmentService.myGrades()
      .then((res) => setItems(res.data))
      .catch((e) => {
        setItems([]);
        showNotification({ type: 'error', message: apiErrorMessage(e) });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <AppHeader title="Nilai" subtitle="Hasil penilaian semester dan sertifikatmu." />
      {items === null ? (
        <LoadingSpinner text="Memuat nilai..." />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Award size={32} className="text-laut" aria-hidden />
          <span className="font-bold text-laut-dalam">Belum ada nilai</span>
          <span className="text-sm text-slate-500">Nilai akan tampil di sini setelah diterbitkan oleh admin.</span>
        </div>
      ) : (
        items.map((sem) => (
          <section key={sem.semester_id} className="space-y-3">
            <div>
              <h2 className="font-display text-3xl font-black uppercase leading-none text-laut-dalam">{sem.semester}</h2>
              {sem.published_date && <p className="mt-1 text-sm text-slate-500">Diterbitkan {formatDate(sem.published_date)}</p>}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {sem.items.map((it) => (
                <article key={it.assessment_id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-laut">Penilaian {TRACK_LABEL[it.track]}</p>
                      <p className="text-sm text-slate-500">
                        {it.class} · No. <span className="font-mono">{it.certificate_no}</span>
                      </p>
                    </div>
                  </div>
                  <ul className="mt-4 divide-y divide-slate-100">
                    {it.aspects.map((a) => (
                      <li key={a.name} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-laut-dalam">{a.name}</span>
                        <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${GRADE_CHIP[a.grade]}`}>{GRADE_LABEL[a.grade]}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={AssessmentService.certificateUrl(it.assessment_id)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-laut-dalam px-5 py-2.5 font-bold text-white hover:bg-laut sm:w-auto"
                  >
                    <Download size={18} aria-hidden /> Unduh sertifikat (PDF)
                  </a>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

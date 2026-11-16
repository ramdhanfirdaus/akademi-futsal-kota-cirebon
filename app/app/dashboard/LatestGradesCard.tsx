'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, ChevronRight } from 'lucide-react';

import AssessmentService, { type MyGradesSemester } from '@/services/AssessmentService';
import { TRACK_LABEL } from '@/lib/assessment';

/** Shown only when the student has a published semester result. */
export default function LatestGradesCard() {
  const [latest, setLatest] = useState<MyGradesSemester | null>(null);

  useEffect(() => {
    AssessmentService.myGrades()
      .then((res) => setLatest(res.data[0] ?? null))
      .catch(() => setLatest(null));
  }, []);

  if (!latest) return null;
  return (
    <Link href="/app/grades" className="flex items-center gap-4 rounded-xl border border-daun/30 bg-white p-5 transition-colors hover:border-daun">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-daun/10 text-daun">
        <Award size={24} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-slate-600">Nilai semester terbaru</span>
        <span className="block font-bold text-laut-dalam">{latest.semester}</span>
        <span className="block text-sm text-slate-500">{latest.items.map((i) => TRACK_LABEL[i.track]).join(' & ')} · sertifikat siap diunduh</span>
      </span>
      <ChevronRight className="shrink-0 text-slate-400" aria-hidden />
    </Link>
  );
}

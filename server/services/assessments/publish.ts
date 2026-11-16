import 'server-only';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { academyStudents, assessmentSemesters, assessments, classes, students, users } from '../../db/schema';
import type { Db } from '../../db';
import { conflict } from '../../errors';
import { nowIso } from '../../validation';
import { eligibleTracks, formatCertificateNo, isComplete, SEQ_TOKEN, TRACKS, type Track } from '@/lib/assessment';
import { classLabel } from '@/lib/format';
import { todayWIB } from '@/lib/date';
import type { Tx } from '../users';
import { getSemester, semesterAspects, semesterRow, type SemesterDTO } from './semesters';

const TRACK_ORDER: Record<Track, number> = { PLAYER: 0, GOALKEEPER: 1 };

/** Every assessment of a semester with what publishing needs to know about it. */
async function assessmentInfo(db: Db | Tx, semesterId: number) {
  const aspects = (await semesterAspects(db, [semesterId])).get(semesterId)!;
  const aspectIds: Record<Track, number[]> = { PLAYER: aspects.PLAYER.map((a) => a.id), GOALKEEPER: aspects.GOALKEEPER.map((a) => a.id) };
  const rows = await db
    .select({
      id: assessments.id,
      track: assessments.track,
      scores: assessments.scores,
      seq: assessments.certificateSeq,
      studentId: students.id,
      name: students.name,
      active: sql<boolean>`${users.status} = 'ACTIVE'`,
      className: classes.name,
    })
    .from(assessments)
    .innerJoin(students, eq(students.id, assessments.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(classes, eq(classes.id, assessments.classId))
    .where(eq(assessments.semesterId, semesterId))
    .orderBy(asc(sql`lower(${students.name})`), asc(students.id), asc(assessments.track));
  return rows
    .map((r) => ({ ...r, complete: isComplete(r.scores, aspectIds[r.track]) }))
    .sort((a, b) => (a.studentId === b.studentId ? TRACK_ORDER[a.track] - TRACK_ORDER[b.track] : 0));
}

export type PublishSummary = {
  tracks: Record<Track, { complete: number; incomplete: { student_id: number; name: string; class: string }[] }>;
  missing_templates: Track[];
  can_publish: boolean;
};

export async function publishSummary(db: Db | Tx, semesterId: number): Promise<PublishSummary> {
  const semester = await getSemester(db, semesterId);
  const info = (await assessmentInfo(db, semesterId)).filter((a) => a.active);
  const tracks = Object.fromEntries(
    TRACKS.map((t) => [
      t,
      {
        complete: info.filter((a) => a.track === t && a.complete).length,
        incomplete: info.filter((a) => a.track === t && !a.complete).map((a) => ({ student_id: a.studentId, name: a.name, class: classLabel(a.className) })),
      },
    ]),
  ) as PublishSummary['tracks'];
  const missing_templates = TRACKS.filter((t) => tracks[t].complete > 0 && !semester.has_template[t]);
  return { tracks, missing_templates, can_publish: !missing_templates.length && semester.number_format.includes(SEQ_TOKEN) };
}

/**
 * Publishes a semester: complete assessments of active students without a number get the next
 * numbers (one sequence for both tracks; name A–Z, Pemain before Kiper). Existing numbers never change.
 */
export async function publishSemester(db: Db, semesterId: number): Promise<SemesterDTO> {
  await db.transaction(async (tx) => {
    const row = await semesterRow(tx, semesterId);
    const summary = await publishSummary(tx, semesterId);
    if (summary.missing_templates.length) {
      throw conflict(`Unggah template sertifikat ${summary.missing_templates.map((t) => (t === 'PLAYER' ? 'Pemain' : 'Kiper')).join(' dan ')} dulu`);
    }
    if (!summary.can_publish) throw conflict(`Format nomor harus memuat ${SEQ_TOKEN}`);

    const info = await assessmentInfo(tx, semesterId);
    let seq = Math.max(0, ...info.map((a) => a.seq ?? 0));
    for (const a of info) {
      if (a.seq !== null || !a.complete || !a.active) continue;
      seq += 1;
      await tx.update(assessments).set({ certificateSeq: seq }).where(eq(assessments.id, a.id));
    }
    const now = nowIso();
    await tx
      .update(assessmentSemesters)
      .set({
        status: 'PUBLISHED',
        publishedAt: now,
        firstPublishedAt: row.firstPublishedAt ?? now,
        certificateDate: row.certificateDate ?? todayWIB(),
        updatedAt: now,
      })
      .where(eq(assessmentSemesters.id, semesterId));
  });
  return getSemester(db, semesterId);
}

/** Back to draft so grades can be fixed; numbers stay. */
export async function unpublishSemester(db: Db, semesterId: number): Promise<SemesterDTO> {
  await semesterRow(db, semesterId);
  await db.update(assessmentSemesters).set({ status: 'DRAFT', updatedAt: nowIso() }).where(eq(assessmentSemesters.id, semesterId));
  return getSemester(db, semesterId);
}

export type ResultStatus = 'BELUM_DINILAI' | 'BELUM_LENGKAP' | 'LENGKAP' | 'BERNOMOR' | 'NONAKTIF';
export type ResultRow = {
  student_id: number;
  name: string;
  class: string;
  track: Track;
  status: ResultStatus;
  assessment_id: number | null;
  certificate_no: string | null;
  /** What the student sees: published, numbered, complete, active. */
  visible: boolean;
};

/**
 * Staff overview: every assessment of the semester, plus active students who still have
 * no assessment on a track they are eligible for ("belum dinilai"). Sorted by name, then track.
 */
export async function semesterResults(db: Db, semesterId: number): Promise<ResultRow[]> {
  const semester = await semesterRow(db, semesterId);
  const published = semester.status === 'PUBLISHED';
  const info = await assessmentInfo(db, semesterId);
  const out: ResultRow[] = info.map((a) => ({
    student_id: a.studentId,
    name: a.name,
    class: classLabel(a.className),
    track: a.track,
    status: !a.active ? 'NONAKTIF' : !a.complete ? 'BELUM_LENGKAP' : a.seq !== null ? 'BERNOMOR' : 'LENGKAP',
    assessment_id: a.id,
    certificate_no: a.seq !== null ? formatCertificateNo(semester.numberFormat, a.seq) : null,
    visible: published && a.seq !== null && a.complete && a.active,
  }));

  const graded = new Set(info.map((a) => `${a.studentId}:${a.track}`));
  const people = await db
    .select({ id: students.id, name: students.name, position: academyStudents.position, isGoalkeeper: academyStudents.isGoalkeeper, className: classes.name })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(academyStudents, eq(academyStudents.studentId, students.id))
    .innerJoin(classes, eq(classes.id, academyStudents.classId))
    .where(and(eq(users.status, 'ACTIVE'), isNull(classes.deletedAt)));
  for (const p of people) {
    for (const track of eligibleTracks(p)) {
      if (graded.has(`${p.id}:${track}`)) continue;
      out.push({
        student_id: p.id,
        name: p.name,
        class: classLabel(p.className),
        track,
        status: 'BELUM_DINILAI',
        assessment_id: null,
        certificate_no: null,
        visible: false,
      });
    }
  }
  return out.sort(
    (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.student_id - b.student_id || TRACK_ORDER[a.track] - TRACK_ORDER[b.track],
  );
}

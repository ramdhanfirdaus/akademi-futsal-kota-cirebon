import 'server-only';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { assessmentSemesters, assessments, classes, students, users } from '../../db/schema';
import type { Db } from '../../db';
import type { Actor } from '../../auth';
import { conflict, notFound } from '../../errors';
import { formatCertificateNo, GRADE_LABEL, isComplete, TRACK_LABEL, type Grade, type Track } from '@/lib/assessment';
import { certificateFileName, type CertificateInput, type CertificateInputJson } from '@/lib/certificate';
import { classLabel } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { semesterAspects } from './semesters';
import { getTemplate } from './templates';

export type { CertificateInputJson } from '@/lib/certificate';

/**
 * Everything needed to draw one certificate. Students only get their own assessment of a
 * published semester that is numbered, complete and active — anything else is a 404, so the
 * existence of other certificates is never confirmed. Staff may preview any assessment.
 */
export async function certificateInput(db: Db, actor: Actor, assessmentId: number): Promise<CertificateInput & { fileName: string; imageUrl: string }> {
  const [row] = await db
    .select({
      track: assessments.track,
      scores: assessments.scores,
      seq: assessments.certificateSeq,
      semesterId: assessmentSemesters.id,
      semester: assessmentSemesters.name,
      status: assessmentSemesters.status,
      numberFormat: assessmentSemesters.numberFormat,
      certificateDate: assessmentSemesters.certificateDate,
      firstPublishedAt: assessmentSemesters.firstPublishedAt,
      name: students.name,
      nickname: students.nickname,
      userId: students.userId,
      userStatus: users.status,
      className: classes.name,
    })
    .from(assessments)
    .innerJoin(assessmentSemesters, and(eq(assessmentSemesters.id, assessments.semesterId), isNull(assessmentSemesters.deletedAt)))
    .innerJoin(students, eq(students.id, assessments.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(classes, eq(classes.id, assessments.classId))
    .where(eq(assessments.id, assessmentId));
  if (!row) throw notFound();

  const aspects = (await semesterAspects(db, [row.semesterId])).get(row.semesterId)![row.track];
  const complete = isComplete(
    row.scores,
    aspects.map((a) => a.id),
  );
  if (actor.role === 'STUDENT') {
    const visible = row.userId === actor.userId && row.status === 'PUBLISHED' && row.seq !== null && complete && row.userStatus === 'ACTIVE';
    if (!visible) throw notFound();
  }

  const template = await getTemplate(db, row.semesterId, row.track);
  if (!template) throw conflict(`Template sertifikat ${TRACK_LABEL[row.track]} belum diunggah`);

  const values: Record<string, string> = {
    name: row.name,
    nickname: row.nickname ?? '',
    class: classLabel(row.className),
    semester: row.semester,
    number: row.seq !== null ? formatCertificateNo(row.numberFormat, row.seq) : '—',
    published_date: formatDate(row.certificateDate ?? row.firstPublishedAt?.slice(0, 10) ?? null).replace(/^-$/, ''),
  };
  for (const a of aspects) {
    const g = row.scores[String(a.id)];
    if (g) values[`aspect:${a.id}`] = GRADE_LABEL[g].toUpperCase();
  }
  return {
    image: template.image,
    imageType: template.image_type,
    widthPx: template.width_px,
    heightPx: template.height_px,
    fields: template.fields,
    values,
    title: `Sertifikat ${row.name} - ${row.semester}`,
    fileName: certificateFileName(row.name, row.semester, row.track),
    imageUrl: `/api/assessments/semesters/${row.semesterId}/templates/${row.track}/image?v=${encodeURIComponent(template.updated_at)}`,
  };
}

/** `withImage: false` leaves the template bytes out; the browser fetches `image_url` once per track instead. */
export function toJsonInput(input: CertificateInput & { fileName: string; imageUrl: string }, opts: { withImage?: boolean } = {}): CertificateInputJson {
  const { imageUrl, ...rest } = input;
  return { ...rest, image: opts.withImage === false ? '' : Buffer.from(input.image).toString('base64'), image_url: imageUrl };
}

export type MyGradesSemester = {
  semester_id: number;
  semester: string;
  published_date: string | null;
  items: { assessment_id: number; track: Track; certificate_no: string; class: string; aspects: { name: string; grade: Grade }[] }[];
};

/** The signed-in student's published results, newest semester first. */
export async function myGrades(db: Db, actor: Actor): Promise<MyGradesSemester[]> {
  const rows = await db
    .select({
      id: assessments.id,
      track: assessments.track,
      scores: assessments.scores,
      seq: assessments.certificateSeq,
      semesterId: assessmentSemesters.id,
      semester: assessmentSemesters.name,
      numberFormat: assessmentSemesters.numberFormat,
      certificateDate: assessmentSemesters.certificateDate,
      className: classes.name,
    })
    .from(assessments)
    .innerJoin(assessmentSemesters, eq(assessmentSemesters.id, assessments.semesterId))
    .innerJoin(students, eq(students.id, assessments.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(classes, eq(classes.id, assessments.classId))
    .where(
      and(
        eq(students.userId, actor.userId),
        eq(users.status, 'ACTIVE'),
        eq(assessmentSemesters.status, 'PUBLISHED'),
        isNull(assessmentSemesters.deletedAt),
        isNotNull(assessments.certificateSeq),
      ),
    )
    .orderBy(desc(assessmentSemesters.createdAt), desc(assessmentSemesters.id), assessments.track);
  const aspects = await semesterAspects(db, [...new Set(rows.map((r) => r.semesterId))]);

  const out: MyGradesSemester[] = [];
  for (const r of rows) {
    const list = aspects.get(r.semesterId)![r.track];
    if (
      !isComplete(
        r.scores,
        list.map((a) => a.id),
      )
    )
      continue;
    let sem = out.find((s) => s.semester_id === r.semesterId);
    if (!sem) out.push((sem = { semester_id: r.semesterId, semester: r.semester, published_date: r.certificateDate, items: [] }));
    sem.items.push({
      assessment_id: r.id,
      track: r.track,
      certificate_no: formatCertificateNo(r.numberFormat, r.seq!),
      class: classLabel(r.className),
      aspects: list.map((a) => ({ name: a.name, grade: r.scores[String(a.id)] })),
    });
  }
  for (const s of out) s.items.sort((a, b) => (a.track === b.track ? 0 : a.track === 'PLAYER' ? -1 : 1));
  return out;
}

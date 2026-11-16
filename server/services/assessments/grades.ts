import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  academyStudents,
  assessmentAspects,
  assessments,
  students,
  users,
} from "../../db/schema";
import type { Db } from "../../db";
import type { Actor } from "../../auth";
import { conflict, invalid, notFound } from "../../errors";
import { chunks, id, nowIso } from "../../validation";
import {
  eligibleTracks,
  formatCertificateNo,
  GRADES,
  type Grade,
  type Track,
} from "@/lib/assessment";
import type { Tx } from "../users";
import { PUBLISHED_LOCK, semesterRow, trackSchema } from "./semesters";

export { isComplete } from "@/lib/assessment";

export type GridRow = {
  student_id: number;
  name: string;
  username: string;
  scores: Record<string, Grade>;
  assessment_id: number | null;
  certificate_no: string | null;
};

/** Active students of a class who get an assessment on this track, sorted by name. */
export async function eligibleStudents(
  db: Db | Tx,
  classId: number,
  track: Track,
) {
  const rows = await db
    .select({
      student_id: students.id,
      name: students.name,
      nickname: students.nickname,
      username: users.username,
      position: academyStudents.position,
      isGoalkeeper: academyStudents.isGoalkeeper,
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(academyStudents, eq(academyStudents.studentId, students.id))
    .where(
      and(eq(academyStudents.classId, classId), eq(users.status, "ACTIVE")),
    )
    .orderBy(asc(sql`lower(${students.name})`), asc(students.id));
  return rows.filter((r) => eligibleTracks(r).includes(track));
}

/** Aspect ids of a semester+track, in order. */
export async function trackAspects(
  db: Db | Tx,
  semesterId: number,
  track: Track,
) {
  return db
    .select({ id: assessmentAspects.id, name: assessmentAspects.name })
    .from(assessmentAspects)
    .where(
      and(
        eq(assessmentAspects.semesterId, semesterId),
        eq(assessmentAspects.track, track),
      ),
    )
    .orderBy(asc(assessmentAspects.sortOrder), asc(assessmentAspects.id));
}

export async function getGradeGrid(
  db: Db,
  semesterId: number,
  classIdInput: unknown,
  trackInput: unknown,
) {
  const classId = id.parse(classIdInput);
  const track = trackSchema.parse(trackInput);
  const semester = await semesterRow(db, semesterId);
  const aspects = await trackAspects(db, semesterId, track);
  const people = await eligibleStudents(db, classId, track);
  const existing = people.length
    ? await db
        .select()
        .from(assessments)
        .where(
          and(
            eq(assessments.semesterId, semesterId),
            eq(assessments.track, track),
            inArray(
              assessments.studentId,
              people.map((p) => p.student_id),
            ),
          ),
        )
    : [];
  const byStudent = new Map(existing.map((a) => [a.studentId, a]));
  const rows: GridRow[] = people.map((p) => {
    const a = byStudent.get(p.student_id);
    return {
      student_id: p.student_id,
      name: p.name,
      username: p.username,
      scores: a?.scores ?? {},
      assessment_id: a?.id ?? null,
      certificate_no: a?.certificateSeq
        ? formatCertificateNo(semester.numberFormat, a.certificateSeq)
        : null,
    };
  });
  return { aspects, rows };
}

export type GradeChange = {
  student_id: number;
  scores: Record<string, Grade | null>;
};

/**
 * Merges score changes into the semester+track assessments of the given students
 * (a grade sets a key, null removes it, absent keys stay). Callers validate first.
 */
export async function writeGrades(
  tx: Tx,
  semesterId: number,
  classId: number,
  track: Track,
  changes: GradeChange[],
  actorId: number,
): Promise<number> {
  if (!changes.length) return 0;
  const existing = await tx
    .select()
    .from(assessments)
    .where(
      and(
        eq(assessments.semesterId, semesterId),
        eq(assessments.track, track),
        inArray(
          assessments.studentId,
          changes.map((c) => c.student_id),
        ),
      ),
    );
  const byStudent = new Map(existing.map((a) => [a.studentId, a]));
  const upserts: (typeof assessments.$inferInsert)[] = [];
  const removable: number[] = [];
  for (const c of changes) {
    const prev = byStudent.get(c.student_id);
    const scores: Record<string, Grade> = { ...(prev?.scores ?? {}) };
    for (const [key, grade] of Object.entries(c.scores)) {
      if (grade === null) delete scores[key];
      else scores[key] = grade;
    }
    if (!Object.keys(scores).length) {
      // Nothing graded: don't create a row; drop an un-numbered one that became empty.
      if (prev && prev.certificateSeq === null) removable.push(prev.id);
      if (!prev || prev.certificateSeq === null) continue;
    }
    upserts.push({
      semesterId,
      studentId: c.student_id,
      track,
      classId,
      scores,
      gradedBy: actorId,
      updatedAt: nowIso(),
    });
  }
  if (removable.length)
    await tx.delete(assessments).where(inArray(assessments.id, removable));
  for (const batch of chunks(upserts, 500)) {
    await tx
      .insert(assessments)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          assessments.semesterId,
          assessments.studentId,
          assessments.track,
        ],
        set: {
          scores: sql`excluded.scores`,
          classId: sql`excluded.class_id`,
          gradedBy: sql`excluded.graded_by`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }
  return upserts.length;
}

/** Throws 409 unless the semester is a draft. */
export async function draftSemester(db: Db | Tx, semesterId: number) {
  const semester = await semesterRow(db, semesterId);
  if (semester.status !== "DRAFT") throw conflict(PUBLISHED_LOCK);
  return semester;
}

const gradeOrNull = z.union([
  z.enum(GRADES, "Isi Cukup, Baik, atau Sangat Baik"),
  z.null(),
]);
const saveSchema = z.object({
  semester_id: id,
  class_id: id,
  track: trackSchema,
  rows: z
    .array(
      z.object({ student_id: id, scores: z.record(z.string(), gradeOrNull) }),
    )
    .min(1)
    .max(500),
});

export async function saveGrades(
  db: Db,
  actor: Actor,
  input: unknown,
): Promise<{ saved: number }> {
  const d = saveSchema.parse(input);
  await draftSemester(db, d.semester_id);
  const aspectIds = new Set(
    (await trackAspects(db, d.semester_id, d.track)).map((a) => String(a.id)),
  );
  const eligible = new Set(
    (await eligibleStudents(db, d.class_id, d.track)).map((s) => s.student_id),
  );

  const errors: Record<string, string[]> = {};
  d.rows.forEach((r, i) => {
    if (!eligible.has(r.student_id))
      errors[`rows.${i}.student_id`] = [
        "Siswa tidak aktif, bukan anggota kelas ini, atau tidak dinilai di jalur ini",
      ];
    for (const key of Object.keys(r.scores)) {
      if (!aspectIds.has(key))
        errors[`rows.${i}.scores.${key}`] = ["Aspek tidak ditemukan"];
    }
  });
  if (Object.keys(errors).length) throw invalid(errors);

  const saved = await db.transaction((tx) =>
    writeGrades(tx, d.semester_id, d.class_id, d.track, d.rows, actor.userId),
  );
  return { saved };
}

export async function deleteAssessment(
  db: Db,
  assessmentId: number,
): Promise<void> {
  const rows = await db
    .delete(assessments)
    .where(eq(assessments.id, assessmentId))
    .returning({ id: assessments.id });
  if (!rows.length) throw notFound();
}

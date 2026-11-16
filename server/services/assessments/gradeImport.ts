import "server-only";
import { z } from "zod";
import type { Db } from "../../db";
import type { Actor } from "../../auth";
import { invalid } from "../../errors";
import { id } from "../../validation";
import { parseGrade, type Grade } from "@/lib/assessment";
import { trackSchema } from "./semesters";
import {
  draftSemester,
  eligibleStudents,
  trackAspects,
  writeGrades,
  type GradeChange,
} from "./grades";

export const MAX_GRADE_ROWS = 500;

const bodySchema = z.object({
  semester_id: id,
  class_id: id,
  track: trackSchema,
  dry_run: z.boolean().optional(),
  rows: z
    .array(
      z.object({
        _row: z.number().int().optional(),
        username: z.unknown(),
        scores: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1, "File tidak berisi data nilai")
    .max(MAX_GRADE_ROWS, `Maksimal ${MAX_GRADE_ROWS} baris sekali impor`),
});

/**
 * Imports grades read from the spreadsheet in the browser. All or nothing: every row is checked
 * first and problems are reported as `rows.<spreadsheet line>.<username | aspect:<id>>`.
 * Empty cells leave the existing grade unchanged.
 */
export async function importGrades(
  db: Db,
  actor: Actor,
  input: unknown,
): Promise<{ dry_run: boolean; count: number }> {
  const d = bodySchema.parse(input);
  await draftSemester(db, d.semester_id);
  const aspectIds = new Set(
    (await trackAspects(db, d.semester_id, d.track)).map((a) => String(a.id)),
  );
  const byUsername = new Map(
    (await eligibleStudents(db, d.class_id, d.track)).map((s) => [
      s.username.toLowerCase(),
      s.student_id,
    ]),
  );

  const errors: Record<string, string[]> = {};
  const changes: GradeChange[] = [];
  const seen = new Set<number>();
  d.rows.forEach((raw, i) => {
    const line = raw._row ?? i + 2;
    const username = String(raw.username ?? "").trim();
    const studentId = byUsername.get(username.toLowerCase());
    if (!username) errors[`rows.${line}.username`] = ["Username wajib diisi"];
    else if (!studentId)
      errors[`rows.${line}.username`] = [
        `"${username}" bukan siswa aktif kelas ini yang dinilai di jalur ini`,
      ];
    else if (seen.has(studentId))
      errors[`rows.${line}.username`] = [
        `"${username}" muncul lebih dari sekali`,
      ];

    const scores: Record<string, Grade> = {};
    for (const [key, value] of Object.entries(raw.scores)) {
      if (!aspectIds.has(key)) {
        errors[`rows.${line}.aspect:${key}`] = ["Aspek tidak ditemukan"];
        continue;
      }
      const grade = parseGrade(value);
      if (grade === null)
        errors[`rows.${line}.aspect:${key}`] = [
          "Isi Cukup, Baik, atau Sangat Baik",
        ];
      else if (grade) scores[key] = grade;
    }
    if (studentId && !seen.has(studentId)) {
      seen.add(studentId);
      changes.push({ student_id: studentId, scores });
    }
  });
  if (Object.keys(errors).length) throw invalid(errors);
  if (d.dry_run) return { dry_run: true, count: changes.length };

  await db.transaction((tx) =>
    writeGrades(tx, d.semester_id, d.class_id, d.track, changes, actor.userId),
  );
  return { dry_run: false, count: changes.length };
}

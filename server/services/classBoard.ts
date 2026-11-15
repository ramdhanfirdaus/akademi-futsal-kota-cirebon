import 'server-only';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { academyStudents, classes, students, users } from '../db/schema';
import type { Db } from '../db';
import { invalid } from '../errors';
import { chunks, id } from '../validation';

export type BoardColumn = { id: number; name: string; students: { id: number; name: string; nickname: string | null }[] };

/** Every active class with its active students, both sorted by name (case-insensitive). */
export async function classBoard(db: Db): Promise<BoardColumn[]> {
  const cols = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(isNull(classes.deletedAt))
    .orderBy(asc(classes.name), asc(classes.id));
  const rows = await db
    .select({ id: students.id, name: students.name, nickname: students.nickname, classId: academyStudents.classId })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(academyStudents, eq(academyStudents.studentId, students.id))
    .where(eq(users.status, 'ACTIVE'))
    .orderBy(sql`lower(${students.name})`, asc(students.id));
  return cols.map((c) => ({
    ...c,
    students: rows.filter((r) => r.classId === c.id).map(({ id, name, nickname }) => ({ id, name, nickname })),
  }));
}

const moveSchema = z.object({
  moves: z
    .array(z.object({ student_id: id, class_id: id }))
    .min(1, 'Tidak ada perpindahan untuk disimpan')
    .max(1000, 'Maksimal 1000 perpindahan sekali simpan'),
});

/** Applies all moves in one transaction; if any move is invalid nothing is changed. */
export async function moveStudents(db: Db, input: unknown): Promise<{ moved: number }> {
  const { moves } = moveSchema.parse(input);

  const errors: Record<string, string[]> = {};
  const seen = new Set<number>();
  moves.forEach((m, i) => {
    if (seen.has(m.student_id)) errors[`moves.${i}.student_id`] = ['Siswa yang sama dipindahkan dua kali'];
    seen.add(m.student_id);
  });

  const classIds = [...new Set(moves.map((m) => m.class_id))];
  const okClasses = new Set(
    (await db.select({ id: classes.id }).from(classes).where(and(inArray(classes.id, classIds), isNull(classes.deletedAt)))).map((c) => c.id),
  );
  const okStudents = new Set(
    (
      await db
        .select({ id: students.id })
        .from(students)
        .innerJoin(users, eq(users.id, students.userId))
        .innerJoin(academyStudents, eq(academyStudents.studentId, students.id))
        .where(and(inArray(students.id, [...seen]), eq(users.status, 'ACTIVE')))
    ).map((s) => s.id),
  );
  moves.forEach((m, i) => {
    if (!okStudents.has(m.student_id)) errors[`moves.${i}.student_id`] = ['Siswa tidak ditemukan atau sudah tidak aktif'];
    else if (!okClasses.has(m.class_id)) errors[`moves.${i}.class_id`] = ['Kelas tujuan tidak ditemukan'];
  });
  if (Object.keys(errors).length) throw invalid(errors);

  await db.transaction(async (tx) => {
    for (const part of chunks(moves)) {
      const values = sql.join(
        part.map((m) => sql`(${m.student_id}::int, ${m.class_id}::int)`),
        sql`, `,
      );
      await tx.execute(sql`
        update ${academyStudents}
        set class_id = v.class_id, updated_at = now()
        from (values ${values}) as v(student_id, class_id)
        where ${academyStudents.studentId} = v.student_id`);
    }
  });
  return { moved: moves.length };
}

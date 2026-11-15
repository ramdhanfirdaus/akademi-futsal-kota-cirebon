import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { academyStudents, classes, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import { classBoard, moveStudents } from '@/server/services/classBoard';
import { fail } from '@/server/http';

let db: Db;
let a: number, b: number, gone: number;
let budi: number, rizky: number, dimas: number, inactive: number;

beforeEach(async () => {
  db = await createTestDb();
  const { coachId } = await makeCoach(db);
  ({ classId: a } = await makeClass(db, { coachId, name: 'A' }));
  ({ classId: b } = await makeClass(db, { coachId, name: 'B' }));
  ({ classId: gone } = await makeClass(db, { coachId, name: 'Hapus' }));
  await db.update(classes).set({ deletedAt: new Date().toISOString() }).where(eq(classes.id, gone));
  ({ studentId: rizky } = await makeStudent(db, { classId: a, name: 'Rizky' }));
  ({ studentId: budi } = await makeStudent(db, { classId: a, name: 'budi' }));
  ({ studentId: dimas } = await makeStudent(db, { classId: b, name: 'Dimas' }));
  const s = await makeStudent(db, { classId: a, name: 'Lama' });
  inactive = s.studentId;
  await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, s.userId));
});

const classOf = async (studentId: number) =>
  (await db.select({ c: academyStudents.classId }).from(academyStudents).where(eq(academyStudents.studentId, studentId)))[0].c;
const statusOf = async (p: Promise<unknown>) => fail(await p.then(() => null, (e) => e)).status;

describe('class board', () => {
  it('lists active classes with active students sorted by name', async () => {
    const board = await classBoard(db);
    expect(board.map((c) => c.name)).toEqual(['A', 'B']);
    expect(board[0].students.map((s) => s.name)).toEqual(['budi', 'Rizky']); // case-insensitive
    expect(board[1].students.map((s) => s.name)).toEqual(['Dimas']);
  });

  it('moves many students in one save', async () => {
    const res = await moveStudents(db, { moves: [{ student_id: budi, class_id: b }, { student_id: dimas, class_id: a }] });
    expect(res).toEqual({ moved: 2 });
    expect(await classOf(budi)).toBe(b);
    expect(await classOf(dimas)).toBe(a);
    expect(await classOf(rizky)).toBe(a);
  });

  it('changes nothing when any move is invalid', async () => {
    const bad = [
      [{ student_id: budi, class_id: b }, { student_id: 99999, class_id: b }],
      [{ student_id: budi, class_id: b }, { student_id: inactive, class_id: b }],
      [{ student_id: budi, class_id: gone }],
      [{ student_id: budi, class_id: b }, { student_id: budi, class_id: a }],
      [],
    ];
    for (const moves of bad) expect(await statusOf(moveStudents(db, { moves }))).toBe(422);
    expect(await classOf(budi)).toBe(a);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach } from './helpers/fixtures';
import { academyStudents, classes, students, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import { verifyPassword } from '@/server/auth';
import { createStudent } from '@/server/services/students';
import { importStudents } from '@/server/services/studentImport';
import { fail } from '@/server/http';
import { monthKey, todayWIB } from '@/lib/date';

let db: Db;
let classA: number;
let kiper: number;

beforeEach(async () => {
  db = await createTestDb();
  const { coachId } = await makeCoach(db);
  ({ classId: classA } = await makeClass(db, { coachId, name: 'A' }));
  ({ classId: kiper } = await makeClass(db, { coachId, name: 'Kelas Kiper' }));
  const { classId: gone } = await makeClass(db, { coachId, name: 'Lama' });
  await db.update(classes).set({ deletedAt: new Date().toISOString() }).where(eq(classes.id, gone));
});

const errorsOf = async (p: Promise<unknown>) => {
  const res = fail(await p.then(() => null, (e) => e));
  return { status: res.status, errors: ((await res.json()) as { errors?: Record<string, string[]> }).errors ?? {} };
};

describe('createStudent optional fields', () => {
  it('only needs name, nickname and class; the rest get defaults', async () => {
    const s = await createStudent(db, { name: 'Budi Santoso', nickname: 'Budi', class_id: classA });
    expect(s).toMatchObject({ position: null, year_join: Number(todayWIB().slice(0, 4)), fee_start: monthKey(todayWIB()) });
    const [u] = await db.select().from(users).where(eq(users.id, s.user_id));
    expect(await verifyPassword('afkc2026', u.password)).toBe(true);
  });

  it('still requires name, nickname and class', async () => {
    const { status, errors } = await errorsOf(createStudent(db, {}));
    expect(status).toBe(422);
    expect(Object.keys(errors).sort()).toEqual(['class_id', 'name', 'nickname']);
  });
});

describe('importStudents', () => {
  const row = (over: Record<string, unknown> = {}) => ({ name: 'Budi Santoso', nickname: 'Budi', class: 'A', ...over });

  it('dry run validates without saving', async () => {
    const res = await importStudents(db, { dry_run: true, rows: [row(), row({ name: 'Rizky', nickname: 'Rizky' })] });
    expect(res).toEqual({ dry_run: true, count: 2, created: [] });
    expect(await db.select().from(students)).toHaveLength(0);
  });

  it('saves every row and generates unique usernames within the batch', async () => {
    const res = await importStudents(db, { rows: [row(), row({ name: 'Budi Hartono' }), row({ name: 'Andi', nickname: 'Andi', class: 'kelas kiper' })] });
    expect(res.count).toBe(3);
    expect(res.created.map((c) => [c.row, c.name, c.username, c.class])).toEqual([
      [2, 'Budi Santoso', 'budi01', 'A'],
      [3, 'Budi Hartono', 'budi02', 'A'],
      [4, 'Andi', 'andi01', 'Kelas Kiper'],
    ]);
    const [andi] = await db.select().from(academyStudents).where(eq(academyStudents.classId, kiper));
    expect(andi).toBeTruthy();
  });

  it('matches classes with or without the word "Kelas" and maps friendly values', async () => {
    const res = await importStudents(db, {
      rows: [
        row({
          class: 'Kelas a',
          position: 'kiper',
          gender: 'P',
          blood_type: 'ab',
          is_goalkeeper: 'Ya',
          birth_date: '2014-05-02',
          fee_start: '2026-03',
          year_join: 2025,
          parent_phone: 81234567890,
        }),
        row({ name: 'Rizky', nickname: 'Rizky', class: 'Kiper', gender: 'Laki-laki' }),
      ],
    });
    const [s] = await db.select().from(students).where(eq(students.name, 'Budi Santoso'));
    const [a] = await db.select().from(academyStudents).where(eq(academyStudents.studentId, s.id));
    expect(s).toMatchObject({ gender: 'FEMALE', bloodType: 'AB', birthDate: '2014-05-02', parentPhone: '81234567890' });
    expect(a).toMatchObject({ classId: classA, position: 'KIPER', isGoalkeeper: true, feeStart: '2026-03-01', yearJoin: 2025 });
    expect(res.created[1].class).toBe('Kelas Kiper');
  });

  it('saves nothing when any row is invalid, and reports each problem by spreadsheet row', async () => {
    const { status, errors } = await errorsOf(
      importStudents(db, {
        rows: [row(), row({ class: 'B3' }), row({ class: 'Lama' }), row({ name: '' }), row({ position: 'striker', gender: 'x' })],
      }),
    );
    expect(status).toBe(422);
    expect(errors['rows.3.class']).toEqual(['Kelas "B3" tidak ditemukan']);
    expect(errors['rows.4.class']).toEqual(['Kelas "Lama" tidak ditemukan']);
    expect(errors['rows.5.name']).toBeTruthy();
    expect(errors['rows.6.position']).toBeTruthy();
    expect(errors['rows.6.gender']).toBeTruthy();
    expect(errors['rows.2.name']).toBeUndefined();
    expect(await db.select().from(students)).toHaveLength(0);
  });

  it('uses the spreadsheet line sent by the browser when blank lines were skipped', async () => {
    const { errors } = await errorsOf(importStudents(db, { rows: [{ ...row(), _row: 2 }, { ...row({ class: 'B3' }), _row: 7 }] }));
    expect(Object.keys(errors)).toEqual(['rows.7.class']);
  });

  it('rejects empty files and files over 500 rows', async () => {
    expect((await errorsOf(importStudents(db, { rows: [] }))).status).toBe(422);
    expect((await errorsOf(importStudents(db, { rows: Array.from({ length: 501 }, () => row()) }))).status).toBe(422);
  });
});

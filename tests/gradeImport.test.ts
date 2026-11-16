import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { academyStudents, assessmentSemesters, assessments, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import type { Actor } from '@/server/auth';
import { fail } from '@/server/http';
import { createSemester, saveAspects } from '@/server/services/assessments/semesters';
import { getGradeGrid, saveGrades } from '@/server/services/assessments/grades';
import { importGrades } from '@/server/services/assessments/gradeImport';

let db: Db;
let actor: Actor;
let classId: number;
let semId: number;
let p1: number;
let p2: number;
let andi: number;
let budi: number;

beforeEach(async () => {
  db = await createTestDb();
  const coach = await makeCoach(db);
  actor = { userId: coach.userId, role: 'COACH', username: 'coach' };
  ({ classId } = await makeClass(db, { coachId: coach.coachId }));
  ({ studentId: andi } = await makeStudent(db, {
    classId,
    name: 'Andi',
    username: 'andi01',
  }));
  ({ studentId: budi } = await makeStudent(db, {
    classId,
    name: 'Budi',
    username: 'budi02',
  }));
  semId = (await createSemester(db, { name: 'S1', number_format: '{urut}' })).id;
  [p1, p2] = (await saveAspects(db, semId, 'PLAYER', [{ name: 'Passing' }, { name: 'Dribbling' }])).aspects.PLAYER.map((a) => a.id);
});

const run = (rows: { _row?: number; username: string; scores: Record<string, unknown> }[], dry_run = false) =>
  importGrades(db, actor, {
    semester_id: semId,
    class_id: classId,
    track: 'PLAYER',
    dry_run,
    rows,
  });
const scoresOf = async (studentId: number) => (await getGradeGrid(db, semId, classId, 'PLAYER')).rows.find((r) => r.student_id === studentId)!.scores;

describe('importGrades', () => {
  it('dry run validates and writes nothing', async () => {
    const res = await run([{ _row: 2, username: 'andi01', scores: { [p1]: 'Baik' } }], true);
    expect(res).toEqual({ dry_run: true, count: 1 });
    expect(await db.select().from(assessments)).toHaveLength(0);
  });

  it('parses SB / c / Baik and leaves empty cells unchanged', async () => {
    await saveGrades(db, actor, {
      semester_id: semId,
      class_id: classId,
      track: 'PLAYER',
      rows: [{ student_id: andi, scores: { [p2]: 'CUKUP' } }],
    });
    const res = await run([
      { _row: 2, username: 'ANDI01 ', scores: { [p1]: 'SB', [p2]: '' } },
      { _row: 3, username: 'budi02', scores: { [p1]: 'c', [p2]: 'Baik' } },
    ]);
    expect(res).toEqual({ dry_run: false, count: 2 });
    expect(await scoresOf(andi)).toEqual({
      [p1]: 'SANGAT_BAIK',
      [p2]: 'CUKUP',
    });
    expect(await scoresOf(budi)).toEqual({ [p1]: 'CUKUP', [p2]: 'BAIK' });
  });

  it('one bad row saves nothing and reports spreadsheet lines', async () => {
    const err = await run([
      { _row: 2, username: 'andi01', scores: { [p1]: 'Baik' } },
      { _row: 5, username: 'budi02', scores: { [p1]: 'bagus' } },
      { _row: 6, username: 'nobody', scores: { [p1]: 'Baik' } },
    ]).catch((e) => e);
    expect(fail(err).status).toBe(422);
    expect(err.errors[`rows.5.aspect:${p1}`]).toEqual(['Isi Cukup, Baik, atau Sangat Baik']);
    expect(err.errors).toHaveProperty('rows.6.username');
    expect(await db.select().from(assessments)).toHaveLength(0);
  });

  it('rejects inactive, other-class and ineligible students, and duplicates', async () => {
    const { userId } = await makeStudent(db, {
      classId,
      name: 'Cici',
      username: 'cici03',
    });
    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, userId));
    await db.update(academyStudents).set({ position: 'KIPER' }).where(eq(academyStudents.studentId, budi));
    const err = await run([
      { _row: 2, username: 'cici03', scores: { [p1]: 'Baik' } },
      { _row: 3, username: 'budi02', scores: { [p1]: 'Baik' } },
      { _row: 4, username: 'andi01', scores: { [p1]: 'Baik' } },
      { _row: 5, username: 'andi01', scores: { [p1]: 'Baik' } },
    ]).catch((e) => e);
    expect(Object.keys(err.errors).sort()).toEqual(['rows.2.username', 'rows.3.username', 'rows.5.username']);
  });

  it('is refused for a published semester', async () => {
    await db.update(assessmentSemesters).set({ status: 'PUBLISHED' }).where(eq(assessmentSemesters.id, semId));
    expect(fail(await run([{ username: 'andi01', scores: { [p1]: 'Baik' } }]).catch((e) => e)).status).toBe(409);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { academyStudents, assessmentSemesters, assessments, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import type { Actor } from '@/server/auth';
import { fail } from '@/server/http';
import { createSemester, saveAspects } from '@/server/services/assessments/semesters';
import { deleteAssessment, getGradeGrid, saveGrades } from '@/server/services/assessments/grades';

let db: Db;
let actor: Actor;
let classId: number;
let semId: number;
let p1: number; // player aspect ids
let p2: number;
let k1: number; // goalkeeper aspect id
let andi: number; // ANCHOR
let budi: number; // KIPER
let caca: number; // ANCHOR + trains as goalkeeper

const setPos = (studentId: number, position: 'KIPER' | 'ANCHOR' | null, isGoalkeeper = false) =>
  db.update(academyStudents).set({ position, isGoalkeeper }).where(eq(academyStudents.studentId, studentId));

beforeEach(async () => {
  db = await createTestDb();
  const coach = await makeCoach(db);
  actor = { userId: coach.userId, role: 'COACH', username: 'coach' };
  ({ classId } = await makeClass(db, { coachId: coach.coachId }));
  ({ studentId: caca } = await makeStudent(db, { classId, name: 'Caca' }));
  ({ studentId: andi } = await makeStudent(db, { classId, name: 'andi' }));
  ({ studentId: budi } = await makeStudent(db, { classId, name: 'Budi' }));
  await setPos(budi, 'KIPER');
  await setPos(caca, 'ANCHOR', true);
  const s = await createSemester(db, { name: 'S1', number_format: '{urut}' });
  semId = s.id;
  [p1, p2] = (await saveAspects(db, semId, 'PLAYER', [{ name: 'Passing' }, { name: 'Dribbling' }])).aspects.PLAYER.map((a) => a.id);
  [k1] = (await saveAspects(db, semId, 'GOALKEEPER', [{ name: 'Positioning' }])).aspects.GOALKEEPER.map((a) => a.id);
});

const save = (rows: { student_id: number; scores: Record<string, string | null> }[], track = 'PLAYER', cls = classId) =>
  saveGrades(db, actor, { semester_id: semId, class_id: cls, track, rows });
const status = async (p: Promise<unknown>) =>
  fail(
    await p.then(
      () => null,
      (e) => e,
    ),
  ).status;

describe('grade grid', () => {
  it('lists only students eligible for the track, sorted by name', async () => {
    const { userId } = await makeStudent(db, { classId, name: 'Dodi' });
    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, userId));
    const player = await getGradeGrid(db, semId, classId, 'PLAYER');
    expect(player.aspects.map((a) => a.name)).toEqual(['Passing', 'Dribbling']);
    expect(player.rows.map((r) => r.name)).toEqual(['andi', 'Caca']);
    const keeper = await getGradeGrid(db, semId, classId, 'GOALKEEPER');
    expect(keeper.rows.map((r) => r.name)).toEqual(['Budi', 'Caca']);
    expect(keeper.rows[0]).toMatchObject({
      scores: {},
      assessment_id: null,
      certificate_no: null,
    });
  });
});

describe('saveGrades', () => {
  it('merges scores and null clears one', async () => {
    await save([{ student_id: andi, scores: { [p1]: 'BAIK', [p2]: 'CUKUP' } }]);
    await save([{ student_id: andi, scores: { [p1]: 'SANGAT_BAIK' } }]);
    let grid = await getGradeGrid(db, semId, classId, 'PLAYER');
    expect(grid.rows.find((r) => r.student_id === andi)!.scores).toEqual({
      [p1]: 'SANGAT_BAIK',
      [p2]: 'CUKUP',
    });
    await save([{ student_id: andi, scores: { [p2]: null } }]);
    grid = await getGradeGrid(db, semId, classId, 'PLAYER');
    expect(grid.rows.find((r) => r.student_id === andi)!.scores).toEqual({
      [p1]: 'SANGAT_BAIK',
    });
    const [row] = await db.select().from(assessments);
    expect(row.gradedBy).toBe(actor.userId);
  });

  it('rejects an ineligible student and writes nothing', async () => {
    const err = await save([
      { student_id: andi, scores: { [p1]: 'BAIK' } },
      { student_id: budi, scores: { [p1]: 'BAIK' } },
    ]).catch((e) => e);
    expect(fail(err).status).toBe(422);
    expect(err.errors).toHaveProperty('rows.1.student_id');
    expect(await db.select().from(assessments)).toHaveLength(0);
  });

  it('rejects an aspect of the other track and an unknown grade', async () => {
    expect(await status(save([{ student_id: andi, scores: { [k1]: 'BAIK' } }]))).toBe(422);
    expect(await status(save([{ student_id: andi, scores: { [p1]: 'BAGUS' } }]))).toBe(422);
    expect(await db.select().from(assessments)).toHaveLength(0);
  });

  it('rejects a student of another class', async () => {
    const { classId: other } = await makeClass(db, {
      coachId: (await makeCoach(db)).coachId,
    });
    expect(await status(save([{ student_id: andi, scores: { [p1]: 'BAIK' } }], 'PLAYER', other))).toBe(422);
  });

  it('is refused once the semester is published', async () => {
    await db.update(assessmentSemesters).set({ status: 'PUBLISHED' }).where(eq(assessmentSemesters.id, semId));
    expect(await status(save([{ student_id: andi, scores: { [p1]: 'BAIK' } }]))).toBe(409);
    expect(await db.select().from(assessments)).toHaveLength(0);
  });

  it('regrading from another class updates class_id', async () => {
    await save([{ student_id: andi, scores: { [p1]: 'BAIK' } }]);
    const { classId: other } = await makeClass(db, {
      coachId: (await makeCoach(db)).coachId,
    });
    await db.update(academyStudents).set({ classId: other }).where(eq(academyStudents.studentId, andi));
    await save([{ student_id: andi, scores: { [p2]: 'BAIK' } }], 'PLAYER', other);
    const [row] = await db.select().from(assessments);
    expect(row.classId).toBe(other);
    expect(row.scores).toEqual({ [p1]: 'BAIK', [p2]: 'BAIK' });
  });

  it('does not create a row without any grade', async () => {
    const res = await save([
      { student_id: andi, scores: { [p1]: null } },
      { student_id: caca, scores: {} },
    ]);
    expect(res.saved).toBe(0);
    expect(await db.select().from(assessments)).toHaveLength(0);
  });

  it('a dual-track student gets one assessment per track', async () => {
    await save([{ student_id: caca, scores: { [p1]: 'BAIK' } }]);
    await save([{ student_id: caca, scores: { [k1]: 'SANGAT_BAIK' } }], 'GOALKEEPER');
    expect(await db.select().from(assessments)).toHaveLength(2);
  });

  it('deleteAssessment removes the row; 404 for unknown', async () => {
    await save([{ student_id: andi, scores: { [p1]: 'BAIK' } }]);
    const [row] = await db.select().from(assessments);
    await deleteAssessment(db, row.id);
    expect(await db.select().from(assessments)).toHaveLength(0);
    expect(await status(deleteAssessment(db, row.id))).toBe(404);
  });
});

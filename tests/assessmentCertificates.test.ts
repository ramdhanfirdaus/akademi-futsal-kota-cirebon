import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { PNG_1X1 } from './helpers/images';
import { assessments } from '@/server/db/schema';
import type { Db } from '@/server/db';
import type { Actor } from '@/server/auth';
import { fail } from '@/server/http';
import { createSemester, saveAspects, updateSemester } from '@/server/services/assessments/semesters';
import { saveGrades } from '@/server/services/assessments/grades';
import { saveTemplateImage } from '@/server/services/assessments/templates';
import { publishSemester } from '@/server/services/assessments/publish';
import { certificateInput, myGrades } from '@/server/services/assessments/certificates';

let db: Db;
let staff: Actor;
let andiActor: Actor;
let budiActor: Actor;
let classId: number;
let semId: number;
let p1: number;
let p2: number;
let andi: number;
let budi: number;

const idOf = async (studentId: number) => (await db.select().from(assessments).where(eq(assessments.studentId, studentId)))[0].id;
const status = async (p: Promise<unknown>) =>
  fail(
    await p.then(
      () => null,
      (e) => e,
    ),
  ).status;

beforeEach(async () => {
  db = await createTestDb();
  const coach = await makeCoach(db);
  staff = { userId: coach.userId, role: 'COACH', username: 'coach' };
  ({ classId } = await makeClass(db, { coachId: coach.coachId, name: 'B1' }));
  const a = await makeStudent(db, { classId, name: 'Andi Wijaya', nickname: 'Andi' });
  const b = await makeStudent(db, { classId, name: 'Budi' });
  andi = a.studentId;
  budi = b.studentId;
  andiActor = { userId: a.userId, role: 'STUDENT', username: 'andi' };
  budiActor = { userId: b.userId, role: 'STUDENT', username: 'budi' };
  semId = (await createSemester(db, { name: '2025 Semester 2', number_format: '{urut}/S.FKC/XII/2025' })).id;
  [p1, p2] = (await saveAspects(db, semId, 'PLAYER', [{ name: 'Passing' }, { name: 'Dribbling' }])).aspects.PLAYER.map((x) => x.id);
  await saveTemplateImage(db, semId, 'PLAYER', { image: PNG_1X1, width_px: 10, height_px: 14 });
  await saveGrades(db, staff, {
    semester_id: semId,
    class_id: classId,
    track: 'PLAYER',
    rows: [
      { student_id: andi, scores: { [p1]: 'SANGAT_BAIK', [p2]: 'BAIK' } },
      { student_id: budi, scores: { [p1]: 'CUKUP' } },
    ],
  });
});

describe('certificate access', () => {
  it('a student cannot see a certificate of a draft semester (404)', async () => {
    expect(await status(certificateInput(db, andiActor, await idOf(andi)))).toBe(404);
  });

  it("a student cannot download another student's certificate (404)", async () => {
    await publishSemester(db, semId);
    expect(await status(certificateInput(db, budiActor, await idOf(andi)))).toBe(404);
    expect(await status(certificateInput(db, andiActor, 999999))).toBe(404);
  });

  it('a student gets their own published, numbered certificate', async () => {
    await publishSemester(db, semId);
    await updateSemester(db, semId, { certificate_date: '2025-12-31' });
    const input = await certificateInput(db, andiActor, await idOf(andi));
    expect(input.values).toMatchObject({
      name: 'Andi Wijaya',
      nickname: 'Andi',
      class: 'Kelas B1',
      semester: '2025 Semester 2',
      number: '001/S.FKC/XII/2025',
      published_date: '31 Desember 2025',
      [`aspect:${p1}`]: 'SANGAT BAIK',
      [`aspect:${p2}`]: 'BAIK',
    });
    expect(input.imageType).toBe('image/png');
    expect(input.fileName).toBe('Sertifikat-Andi-Wijaya-2025-Semester-2-Pemain.pdf');
  });

  it('an incomplete (unnumbered) assessment stays hidden from the student but staff can preview it', async () => {
    await publishSemester(db, semId);
    expect(await status(certificateInput(db, budiActor, await idOf(budi)))).toBe(404);
    const preview = await certificateInput(db, staff, await idOf(budi));
    expect(preview.values.number).toBe('—');
  });

  it('409 when the track has no template', async () => {
    const other = await createSemester(db, { name: 'S2', number_format: '{urut}' });
    const [a] = other.aspects.PLAYER;
    await saveGrades(db, staff, { semester_id: other.id, class_id: classId, track: 'PLAYER', rows: [{ student_id: budi, scores: { [a.id]: 'BAIK' } }] });
    const [row] = await db.select().from(assessments).where(eq(assessments.semesterId, other.id));
    expect(await status(certificateInput(db, staff, row.id))).toBe(409);
  });
});

describe('myGrades', () => {
  it('shows only own, published, complete, numbered assessments', async () => {
    expect(await myGrades(db, andiActor)).toEqual([]);
    await publishSemester(db, semId);
    const mine = await myGrades(db, andiActor);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ semester_id: semId, semester: '2025 Semester 2' });
    expect(mine[0].items).toEqual([
      {
        assessment_id: await idOf(andi),
        track: 'PLAYER',
        certificate_no: '001/S.FKC/XII/2025',
        class: 'Kelas B1',
        aspects: [
          { name: 'Passing', grade: 'SANGAT_BAIK' },
          { name: 'Dribbling', grade: 'BAIK' },
        ],
      },
    ]);
    expect(await myGrades(db, budiActor)).toEqual([]);
  });
});

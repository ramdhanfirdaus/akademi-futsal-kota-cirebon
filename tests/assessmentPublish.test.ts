import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { PNG_1X1 } from './helpers/images';
import { academyStudents, assessments, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import type { Actor } from '@/server/auth';
import { fail } from '@/server/http';
import { createSemester, saveAspects, updateSemester } from '@/server/services/assessments/semesters';
import { saveGrades } from '@/server/services/assessments/grades';
import { saveTemplateImage } from '@/server/services/assessments/templates';
import { publishSemester, publishSummary, semesterResults, unpublishSemester } from '@/server/services/assessments/publish';
import type { Track } from '@/lib/assessment';

let db: Db;
let actor: Actor;
let classId: number;
let semId: number;
let p1: number;
let k1: number;
const ids: Record<string, number> = {};

beforeEach(async () => {
  db = await createTestDb();
  const coach = await makeCoach(db);
  actor = { userId: coach.userId, role: 'ADMIN', username: 'admin' };
  ({ classId } = await makeClass(db, { coachId: coach.coachId, name: 'A' }));
  for (const name of ['budi', 'Andi', 'Caca']) {
    const { studentId, userId } = await makeStudent(db, { classId, name });
    ids[name] = studentId;
    ids[`${name}User`] = userId;
  }
  // Andi plays and trains as goalkeeper.
  await db.update(academyStudents).set({ isGoalkeeper: true }).where(eq(academyStudents.studentId, ids.Andi));
  semId = (await createSemester(db, { name: 'S1', number_format: '{urut}/S.FKC/XII/2025' })).id;
  [p1] = (await saveAspects(db, semId, 'PLAYER', [{ name: 'Passing' }])).aspects.PLAYER.map((a) => a.id);
  [k1] = (await saveAspects(db, semId, 'GOALKEEPER', [{ name: 'Positioning' }])).aspects.GOALKEEPER.map((a) => a.id);
  for (const track of ['PLAYER', 'GOALKEEPER'] as Track[]) {
    await saveTemplateImage(db, semId, track, { image: PNG_1X1, width_px: 10, height_px: 14 });
  }
});

const grade = (studentId: number, track: Track, scores: Record<string, 'BAIK' | null>) =>
  saveGrades(db, actor, { semester_id: semId, class_id: classId, track, rows: [{ student_id: studentId, scores }] });
const numbers = async () =>
  Object.fromEntries((await semesterResults(db, semId)).filter((r) => r.certificate_no).map((r) => [`${r.name}-${r.track}`, r.certificate_no]));

describe('publish', () => {
  it('numbers complete assessments A–Z with one shared sequence, Pemain before Kiper', async () => {
    await grade(ids.budi, 'PLAYER', { [p1]: 'BAIK' });
    await grade(ids.Andi, 'GOALKEEPER', { [k1]: 'BAIK' });
    await grade(ids.Andi, 'PLAYER', { [p1]: 'BAIK' });
    const sem = await publishSemester(db, semId);
    expect(sem.status).toBe('PUBLISHED');
    expect(sem.first_published_at).not.toBeNull();
    expect(sem.certificate_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await numbers()).toEqual({
      'Andi-PLAYER': '001/S.FKC/XII/2025',
      'Andi-GOALKEEPER': '002/S.FKC/XII/2025',
      'budi-PLAYER': '003/S.FKC/XII/2025',
    });
  });

  it('summary lists incomplete students and leaves them unnumbered', async () => {
    await saveAspects(db, semId, 'PLAYER', [{ id: p1, name: 'Passing' }, { name: 'Dribbling' }]);
    await grade(ids.Caca, 'PLAYER', { [p1]: 'BAIK' });
    const summary = await publishSummary(db, semId);
    expect(summary.tracks.PLAYER).toEqual({ complete: 0, incomplete: [{ student_id: ids.Caca, name: 'Caca', class: 'Kelas A' }] });
    expect(summary.can_publish).toBe(true);
    await publishSemester(db, semId);
    expect(await numbers()).toEqual({});
    const caca = (await semesterResults(db, semId)).find((r) => r.name === 'Caca')!;
    expect(caca).toMatchObject({ status: 'BELUM_LENGKAP', visible: false });
  });

  it('refuses to publish when a track with complete grades has no template', async () => {
    const other = await createSemester(db, { name: 'S2', number_format: '{urut}' });
    const [a] = other.aspects.PLAYER;
    await saveGrades(db, actor, { semester_id: other.id, class_id: classId, track: 'PLAYER', rows: [{ student_id: ids.Caca, scores: { [a.id]: 'BAIK' } }] });
    expect((await publishSummary(db, other.id)).missing_templates).toEqual(['PLAYER']);
    expect(fail(await publishSemester(db, other.id).catch((e) => e)).status).toBe(409);
  });

  it('unpublish → add aspect → republish keeps numbers; the now-incomplete one is hidden; new completes get max+1', async () => {
    await grade(ids.Andi, 'PLAYER', { [p1]: 'BAIK' });
    await grade(ids.budi, 'PLAYER', { [p1]: 'BAIK' });
    await publishSemester(db, semId);
    expect(await numbers()).toEqual({ 'Andi-PLAYER': '001/S.FKC/XII/2025', 'budi-PLAYER': '002/S.FKC/XII/2025' });
    const firstDate = (await updateSemester(db, semId, {})).certificate_date;

    expect((await unpublishSemester(db, semId)).status).toBe('DRAFT');
    const p2 = (await saveAspects(db, semId, 'PLAYER', [{ id: p1, name: 'Passing' }, { name: 'Dribbling' }])).aspects.PLAYER[1].id;
    await grade(ids.budi, 'PLAYER', { [p2]: 'BAIK' });
    await grade(ids.Caca, 'PLAYER', { [p1]: 'BAIK', [p2]: 'BAIK' });
    const sem = await publishSemester(db, semId);
    expect(sem.certificate_date).toBe(firstDate);

    const results = await semesterResults(db, semId);
    const by = (name: string) => results.find((r) => r.name === name && r.track === 'PLAYER')!;
    expect(by('Andi')).toMatchObject({ certificate_no: '001/S.FKC/XII/2025', status: 'BELUM_LENGKAP', visible: false });
    expect(by('budi')).toMatchObject({ certificate_no: '002/S.FKC/XII/2025', status: 'BERNOMOR', visible: true });
    expect(by('Caca')).toMatchObject({ certificate_no: '003/S.FKC/XII/2025', status: 'BERNOMOR', visible: true });
  });

  it('never numbers a deactivated student', async () => {
    await grade(ids.Caca, 'PLAYER', { [p1]: 'BAIK' });
    await grade(ids.budi, 'PLAYER', { [p1]: 'BAIK' });
    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, ids.CacaUser));
    await publishSemester(db, semId);
    expect(await numbers()).toEqual({ 'budi-PLAYER': '001/S.FKC/XII/2025' });
    const caca = (await semesterResults(db, semId)).find((r) => r.name === 'Caca')!;
    expect(caca).toMatchObject({ status: 'NONAKTIF', visible: false });
    expect(await db.select().from(assessments)).toHaveLength(2);
  });
});

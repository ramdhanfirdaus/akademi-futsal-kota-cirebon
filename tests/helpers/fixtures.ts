import { academyStudents, classSchedules, classes, coaches, students, users } from '@/server/db/schema';
import type { Db } from '@/server/db';

let seq = 0;
const next = () => ++seq;

type Status = 'ACTIVE' | 'INACTIVE';

export async function makeUser(db: Db, role: 'ADMIN' | 'COACH' | 'STUDENT', opts: { username?: string; status?: Status; password?: string } = {}) {
  const [u] = await db
    .insert(users)
    .values({ username: opts.username ?? `${role.toLowerCase()}${next()}`, password: opts.password ?? 'x', role, status: opts.status ?? 'ACTIVE' })
    .returning();
  return u;
}

export async function makeAdmin(db: Db, opts: { username?: string; password?: string } = {}) {
  const u = await makeUser(db, 'ADMIN', opts);
  return { userId: u.id };
}

export async function makeCoach(db: Db, opts: { name?: string; nickname?: string; status?: Status; username?: string; password?: string } = {}) {
  const u = await makeUser(db, 'COACH', opts);
  const [c] = await db
    .insert(coaches)
    .values({ userId: u.id, name: opts.name ?? `Coach ${u.id}`, nickname: opts.nickname ?? null })
    .returning();
  return { coachId: c.id, userId: u.id };
}

export async function makeClass(
  db: Db,
  opts: { coachId: number; name?: string; schedules?: { day_of_week: number; start_time: string; end_time: string }[] },
) {
  const [cls] = await db.insert(classes).values({ name: opts.name ?? `Kelas ${next()}`, coachId: opts.coachId }).returning();
  const scheduleIds: number[] = [];
  for (const s of opts.schedules ?? []) {
    const [row] = await db
      .insert(classSchedules)
      .values({ classId: cls.id, dayOfWeek: s.day_of_week, startTime: s.start_time, endTime: s.end_time })
      .returning();
    scheduleIds.push(row.id);
  }
  return { classId: cls.id, scheduleIds };
}

export async function makeStudent(
  db: Db,
  opts: { classId: number; name?: string; nickname?: string; status?: Status; username?: string; password?: string },
) {
  const u = await makeUser(db, 'STUDENT', opts);
  const [s] = await db
    .insert(students)
    .values({ userId: u.id, name: opts.name ?? `Siswa ${u.id}`, nickname: opts.nickname ?? `s${u.id}` })
    .returning();
  await db.insert(academyStudents).values({ studentId: s.id, classId: opts.classId, position: 'ANCHOR', yearJoin: 2024 });
  return { studentId: s.id, userId: u.id };
}

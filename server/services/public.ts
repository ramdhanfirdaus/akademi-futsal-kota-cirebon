import 'server-only';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { classSchedules, classes, coaches, users } from '../db/schema';
import type { Db } from '../db';
import { coachPhotoUrl } from './coaches';

export type PublicClass = {
  name: string;
  coach: string;
  schedules: { day_of_week: number; start_time: string; end_time: string }[];
};
export type PublicCoach = {
  name: string;
  nickname: string | null;
  classes: string[];
  experience: string | null;
  certifications: string[];
  photo_url: string | null;
};

/** What the public landing page may show: no usernames, ids or student data. */
export async function publicOverview(db: Db): Promise<{ classes: PublicClass[]; coaches: PublicCoach[] }> {
  const coachRows = await db
    .select({
      id: coaches.id,
      name: coaches.name,
      nickname: coaches.nickname,
      experience: coaches.experience,
      certifications: coaches.certifications,
      updatedAt: coaches.updatedAt,
      hasPhoto: sql<boolean>`${coaches.photo} is not null`,
    })
    .from(coaches)
    .innerJoin(users, eq(users.id, coaches.userId))
    .where(eq(users.status, 'ACTIVE'))
    .orderBy(asc(coaches.name));
  const classRows = await db
    .select({ id: classes.id, name: classes.name, coachId: classes.coachId })
    .from(classes)
    .where(isNull(classes.deletedAt))
    .orderBy(asc(classes.name));
  const scheduleRows = await db
    .select({ classId: classSchedules.classId, day: classSchedules.dayOfWeek, start: classSchedules.startTime, end: classSchedules.endTime })
    .from(classSchedules)
    .innerJoin(classes, eq(classes.id, classSchedules.classId))
    .where(and(isNull(classSchedules.deletedAt), isNull(classes.deletedAt)))
    .orderBy(asc(classSchedules.dayOfWeek), asc(classSchedules.startTime));

  const coachById = new Map(coachRows.map((c) => [c.id, c]));
  const hhmm = (t: string) => t.slice(0, 5);
  return {
    classes: classRows.map((c) => {
      const coach = coachById.get(c.coachId);
      return {
        name: c.name,
        coach: coach ? coach.nickname || coach.name : '',
        schedules: scheduleRows
          .filter((s) => s.classId === c.id)
          .map((s) => ({ day_of_week: s.day, start_time: hhmm(s.start), end_time: hhmm(s.end) })),
      };
    }),
    coaches: coachRows.map((c) => ({
      name: c.name,
      nickname: c.nickname,
      classes: classRows.filter((k) => k.coachId === c.id).map((k) => k.name),
      experience: c.experience,
      certifications: c.certifications,
      photo_url: c.hasPhoto ? coachPhotoUrl(c.id, c.updatedAt) : null,
    })),
  };
}

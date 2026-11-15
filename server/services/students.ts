import 'server-only';
import { and, asc, count, eq, ilike, isNull, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { academyStudents, classes, students, users } from '../db/schema';
import type { Db } from '../db';
import type { Actor } from '../auth';
import { forbidden, invalid, notFound } from '../errors';
import { id, nowIso, optDate, optEnum, optText, pageMeta, pageQuery, yearJoin } from '../validation';
import { createUser, deactivateUser, generateUsername, slugBase, updateUser, type Tx } from './users';

const GENDERS = ['MALE', 'FEMALE'] as const;
const BLOOD = ['A', 'B', 'AB', 'O'] as const;
const POSITIONS = ['ANCHOR', 'FLANK', 'PIVOT', 'KIPER'] as const;

const bio = {
  birth_place: optText,
  birth_date: optDate,
  gender: optEnum(GENDERS),
  address: optText,
  parent_name: optText,
  parent_phone: optText,
  blood_type: optEnum(BLOOD),
  disease_history: optText,
};

const academy = {
  class_id: id,
  position: z.enum(POSITIONS),
  year_join: yearJoin,
  is_goalkeeper: z.boolean().optional(),
};

const createSchema = z.object({
  password: z.string().min(1),
  name: z.string().trim().min(1),
  nickname: z.string().trim().min(1),
  ...bio,
  ...academy,
});

const staffUpdateSchema = z.object({
  username: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().regex(/^[a-z0-9._]{3,64}$/).optional()),
  password: z.string().nullable().optional(),
  name: z.string().trim().min(1),
  nickname: optText,
  ...bio,
  ...academy,
});

/** Fields a student may change on their own record. */
const selfUpdateSchema = z.object({
  birth_place: bio.birth_place,
  birth_date: bio.birth_date,
  address: bio.address,
  parent_name: bio.parent_name,
  parent_phone: bio.parent_phone,
  blood_type: bio.blood_type,
  disease_history: bio.disease_history,
});

export type StudentDTO = Awaited<ReturnType<typeof loadStudents>>[number];

const activeUser = eq(users.status, 'ACTIVE');

async function loadStudents(db: Tx, where: SQL | undefined, page?: { limit: number; offset: number }) {
  let q = db
    .select({ s: students, u: users, a: academyStudents, c: { id: classes.id, name: classes.name } })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .leftJoin(academyStudents, eq(academyStudents.studentId, students.id))
    .leftJoin(classes, eq(classes.id, academyStudents.classId))
    .where(where)
    .orderBy(asc(students.name), asc(students.id))
    .$dynamic();
  if (page) q = q.limit(page.limit).offset(page.offset);
  const rows = await q;
  return rows.map(({ s, u, a, c }) => ({
    id: s.id,
    user_id: s.userId,
    name: s.name,
    nickname: s.nickname,
    birth_place: s.birthPlace,
    birth_date: s.birthDate,
    gender: s.gender,
    address: s.address,
    parent_name: s.parentName,
    parent_phone: s.parentPhone,
    blood_type: s.bloodType,
    disease_history: s.diseaseHistory,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
    username: u.username,
    status: u.status,
    class_id: a?.classId ?? null,
    position: a?.position ?? null,
    year_join: a?.yearJoin ?? null,
    is_goalkeeper: a?.isGoalkeeper ?? false,
    academy_students: a
      ? {
          id: a.id,
          student_id: a.studentId,
          class_id: a.classId,
          position: a.position,
          year_join: a.yearJoin,
          is_goalkeeper: a.isGoalkeeper,
          photo: a.photo,
          created_at: a.createdAt,
          updated_at: a.updatedAt,
          class: c && c.id !== null ? { id: c.id, name: c.name } : null,
        }
      : null,
  }));
}

async function findStudent(db: Tx, studentId: number): Promise<StudentDTO> {
  const [s] = await loadStudents(db, eq(students.id, studentId));
  if (!s) throw notFound();
  return s;
}

async function assertClassExists(db: Tx, classId: number) {
  const [c] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), isNull(classes.deletedAt)));
  if (!c) throw invalid({ class_id: ['Kelas tidak ditemukan'] });
}

function bioColumns(d: Partial<z.infer<typeof selfUpdateSchema> & { gender: string | null }>) {
  const out: Partial<typeof students.$inferInsert> = {};
  if (d.birth_place !== undefined) out.birthPlace = d.birth_place;
  if (d.birth_date !== undefined) out.birthDate = d.birth_date;
  if (d.gender !== undefined) out.gender = d.gender as 'MALE' | 'FEMALE' | null;
  if (d.address !== undefined) out.address = d.address;
  if (d.parent_name !== undefined) out.parentName = d.parent_name;
  if (d.parent_phone !== undefined) out.parentPhone = d.parent_phone;
  if (d.blood_type !== undefined) out.bloodType = d.blood_type;
  if (d.disease_history !== undefined) out.diseaseHistory = d.disease_history;
  return out;
}

export async function listStudents(db: Db, q: Record<string, string | undefined>) {
  const page = pageQuery.parse(q);
  const filters: SQL[] = [activeUser];
  if (q.name) filters.push(ilike(students.name, `%${q.name}%`));
  if (q.nickname) filters.push(ilike(students.nickname, `%${q.nickname}%`));
  if (q.class && Number(q.class)) filters.push(eq(academyStudents.classId, Number(q.class)));
  const where = and(...filters);

  const [{ total }] = await db
    .select({ total: count() })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .leftJoin(academyStudents, eq(academyStudents.studentId, students.id))
    .where(where);
  const items = await loadStudents(db, where, { limit: page.limit, offset: (page.page - 1) * page.limit });
  return { items, meta: pageMeta(page, total) };
}

export async function getStudent(db: Db, actor: Actor, studentId: number): Promise<StudentDTO> {
  const s = await findStudent(db, studentId);
  if (actor.role === 'STUDENT' && s.user_id !== actor.userId) throw forbidden();
  return s;
}

export async function createStudent(db: Db, input: unknown): Promise<StudentDTO> {
  const d = createSchema.parse(input);
  return db.transaction(async (tx) => {
    await assertClassExists(tx, d.class_id);
    const username = await generateUsername(tx, slugBase(d.nickname, 'siswa'));
    const user = await createUser(tx, { username, password: d.password, role: 'STUDENT' });
    const [s] = await tx
      .insert(students)
      .values({ userId: user.id, name: d.name, nickname: d.nickname, ...bioColumns(d) })
      .returning();
    await tx.insert(academyStudents).values({
      studentId: s.id,
      classId: d.class_id,
      position: d.position,
      yearJoin: d.year_join,
      isGoalkeeper: d.is_goalkeeper ?? false,
    });
    return findStudent(tx, s.id);
  });
}

export async function updateStudent(db: Db, actor: Actor, studentId: number, input: unknown): Promise<StudentDTO> {
  const current = await getStudent(db, actor, studentId);

  if (actor.role === 'STUDENT') {
    const d = selfUpdateSchema.parse(input);
    await db.update(students).set({ ...bioColumns(d), updatedAt: nowIso() }).where(eq(students.id, studentId));
    return findStudent(db, studentId);
  }

  const d = staffUpdateSchema.parse(input);
  return db.transaction(async (tx) => {
    await assertClassExists(tx, d.class_id);
    await updateUser(tx, current.user_id, { username: d.username, password: d.password });
    await tx
      .update(students)
      .set({ name: d.name, nickname: d.nickname ?? null, ...bioColumns(d), updatedAt: nowIso() })
      .where(eq(students.id, studentId));
    const academyValues = {
      classId: d.class_id,
      position: d.position,
      yearJoin: d.year_join,
      ...(d.is_goalkeeper !== undefined ? { isGoalkeeper: d.is_goalkeeper } : {}),
    };
    if (current.academy_students) {
      await tx.update(academyStudents).set({ ...academyValues, updatedAt: nowIso() }).where(eq(academyStudents.studentId, studentId));
    } else {
      await tx.insert(academyStudents).values({ studentId, ...academyValues });
    }
    return findStudent(tx, studentId);
  });
}

export async function deleteStudent(db: Db, studentId: number): Promise<void> {
  const [s] = await db.select({ userId: students.userId }).from(students).where(eq(students.id, studentId));
  if (!s) throw notFound();
  await deactivateUser(db, s.userId);
}

/** Active students currently assigned to a class, ordered by name. */
export async function activeStudentsInClass(db: Tx, classId: number): Promise<{ id: number; name: string }[]> {
  return db
    .select({ id: students.id, name: students.name })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(academyStudents, eq(academyStudents.studentId, students.id))
    .where(and(activeUser, eq(academyStudents.classId, classId)))
    .orderBy(asc(students.name), asc(students.id));
}

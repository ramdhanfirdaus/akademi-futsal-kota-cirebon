import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeAdmin, makeClass, makeCoach } from './helpers/fixtures';
import { users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import type { Actor } from '@/server/auth';
import { createStudent, deleteStudent, getStudent, listStudents, updateStudent } from '@/server/services/students';
import { slugBase } from '@/server/services/users';
import { fail } from '@/server/http';

let db: Db;
let classId: number;
let admin: Actor;

const base = (over: Record<string, unknown> = {}) => ({
  password: 'afkc2026',
  name: 'Budi Santoso',
  nickname: 'Budi',
  class_id: classId,
  position: 'ANCHOR',
  year_join: '2025',
  ...over,
});

async function statusOf(userId: number) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u.status;
}

function studentActor(s: { user_id: number; username: string }): Actor {
  return { userId: s.user_id, role: 'STUDENT', username: s.username };
}

beforeEach(async () => {
  db = await createTestDb();
  const { coachId } = await makeCoach(db);
  ({ classId } = await makeClass(db, { coachId }));
  const { userId } = await makeAdmin(db, { username: 'admin' });
  admin = { userId, role: 'ADMIN', username: 'admin' };
});

describe('students', () => {
  it('deleteStudent deactivates the right user', async () => {
    const a = await createStudent(db, base({ name: 'A', nickname: 'Aa' }));
    const b = await createStudent(db, base({ name: 'B', nickname: 'Bb' }));
    await deleteStudent(db, b.id);
    expect(await statusOf(b.user_id)).toBe('INACTIVE');
    expect(await statusOf(a.user_id)).toBe('ACTIVE');
  });

  it('listStudents hides inactive students', async () => {
    await createStudent(db, base({ name: 'A', nickname: 'Aa' }));
    const b = await createStudent(db, base({ name: 'B', nickname: 'Bb' }));
    await deleteStudent(db, b.id);
    const { items, meta } = await listStudents(db, {});
    expect(meta.total).toBe(1);
    expect(items.map((s) => s.name)).toEqual(['A']);
  });

  it('listStudents filters and paginates', async () => {
    for (const n of ['Andi', 'Bayu', 'Cahya']) await createStudent(db, base({ name: n, nickname: n }));
    const page = await listStudents(db, { limit: '2', page: '2' });
    expect(page.meta).toEqual({ page: 2, limit: 2, total: 3, last_page: 2 });
    expect(page.items.map((s) => s.name)).toEqual(['Cahya']);
    expect((await listStudents(db, { name: 'Y' })).items.map((s) => s.name)).toEqual(['Bayu', 'Cahya']);
    expect((await listStudents(db, { class: String(classId) })).meta.total).toBe(3);
  });

  it('returns the Laravel-compatible DTO', async () => {
    const s = await createStudent(db, base({ is_goalkeeper: true }));
    expect(s).toMatchObject({
      name: 'Budi Santoso',
      username: 'budi01',
      class_id: classId,
      position: 'ANCHOR',
      year_join: 2025,
      is_goalkeeper: true,
      academy_students: { class_id: classId, class: { id: classId } },
    });
    expect(s).not.toHaveProperty('password');
  });

  it('student cannot read or edit another student', async () => {
    const a = await createStudent(db, base({ nickname: 'Aa' }));
    const b = await createStudent(db, base({ nickname: 'Bb' }));
    const actorA = studentActor(a);
    await expect(getStudent(db, actorA, b.id)).rejects.toMatchObject({ status: 403 });
    await expect(updateStudent(db, actorA, b.id, { address: 'x' })).rejects.toMatchObject({ status: 403 });
    await expect(getStudent(db, actorA, a.id)).resolves.toMatchObject({ id: a.id });
  });

  it('student edit ignores class and username', async () => {
    const { classId: other } = await makeClass(db, { coachId: (await makeCoach(db)).coachId });
    const a = await createStudent(db, base());
    const updated = await updateStudent(db, studentActor(a), a.id, {
      class_id: other,
      username: 'hacker',
      name: 'Diganti',
      address: 'Jl. Baru',
    });
    expect(updated).toMatchObject({ class_id: classId, username: a.username, name: a.name, address: 'Jl. Baru' });
  });

  it('updateStudent saves is_goalkeeper', async () => {
    const s = await createStudent(db, base());
    const updated = await updateStudent(db, admin, s.id, { ...base(), is_goalkeeper: true, password: '' });
    expect(updated.is_goalkeeper).toBe(true);
  });

  it('generated usernames are unique', async () => {
    const a = await createStudent(db, base());
    const b = await createStudent(db, base());
    expect([a.username, b.username]).toEqual(['budi01', 'budi02']);
  });

  it('slugBase handles odd nicknames', () => {
    expect(slugBase('M. Rizky', 'siswa')).toBe('mrizky');
    expect(slugBase('Ádi', 'siswa')).toBe('adi');
    expect(slugBase('', 'siswa')).toBe('siswa');
    expect(slugBase(undefined, 'pelatih')).toBe('pelatih');
    expect(slugBase('!!!', 'siswa')).toBe('siswa');
    expect(slugBase('Abcdefghijklmnopqrstuvwxyz', 'siswa')).toBe('abcdefghijklmnopqrst');
  });

  it('duplicate username maps to 409', async () => {
    const a = await createStudent(db, base({ nickname: 'Aa' }));
    const b = await createStudent(db, base({ nickname: 'Bb' }));
    const err = await updateStudent(db, admin, b.id, { ...base(), username: a.username }).catch((e) => e);
    expect(fail(err).status).toBe(409);
  });

  it('createStudent rejects unknown class', async () => {
    const err = await createStudent(db, base({ class_id: 9999 })).catch((e) => e);
    expect(fail(err).status).toBe(422);
    expect(err.errors).toHaveProperty('class_id');
  });

  it('createStudent validates required fields', async () => {
    const res = fail(await createStudent(db, { class_id: classId }).catch((e) => e));
    expect(res.status).toBe(422);
    const body = await res.json();
    // Only name and nickname (and class) are required; password, position, year and fee start have defaults.
    expect(Object.keys(body.errors).sort()).toEqual(['name', 'nickname']);
  });
});

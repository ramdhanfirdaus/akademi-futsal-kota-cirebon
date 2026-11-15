/**
 * Seed the database.
 *   npm run db:seed            → admin account from SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD
 *   npm run db:seed -- --demo  → also a demo coach, classes and students (development only)
 *
 * Standalone on purpose: it must not import `server/*` (those modules are `server-only`).
 */
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../server/db/schema';

try {
  process.loadEnvFile();
} catch {}

const { users, coaches, classes, classSchedules, students, academyStudents } = schema;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum diisi');
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema });

  const adminUsername = process.env.SEED_ADMIN_USERNAME;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword) throw new Error('SEED_ADMIN_USERNAME dan SEED_ADMIN_PASSWORD wajib diisi');

  const [existing] = await db.select().from(users).where(eq(users.username, adminUsername));
  if (existing) {
    console.log(`Admin "${adminUsername}" sudah ada`);
  } else {
    await db.insert(users).values({ username: adminUsername, password: await bcrypt.hash(adminPassword, 10), role: 'ADMIN' });
    console.log(`Admin "${adminUsername}" dibuat`);
  }

  if (process.argv.includes('--demo')) await seedDemo(db);
  await pool.end();
}

async function seedDemo(db: ReturnType<typeof drizzle<typeof schema>>) {
  const [already] = await db.select().from(users).where(eq(users.username, 'fathur01'));
  if (already) {
    console.log('Data demo sudah ada');
    return;
  }
  const pw = await bcrypt.hash('afkc2026', 10);
  await db.transaction(async (tx) => {
    const [cu] = await tx.insert(users).values({ username: 'fathur01', password: pw, role: 'COACH' }).returning();
    const [coach] = await tx.insert(coaches).values({ userId: cu.id, name: 'Fathur Rizki', nickname: 'Fathur' }).returning();

    let classA = 0;
    for (const name of ['A', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'KIPER']) {
      const [c] = await tx.insert(classes).values({ name, coachId: coach.id }).returning();
      await tx.insert(classSchedules).values({ classId: c.id, dayOfWeek: 6, startTime: '08:00:00', endTime: '10:00:00' });
      if (name === 'A') classA = c.id;
    }

    const demo = [
      { username: 'budi01', name: 'Budi Santoso', nickname: 'Budi', position: 'ANCHOR' as const },
      { username: 'rizky01', name: 'Rizky Pratama', nickname: 'Rizky', position: 'FLANK' as const },
      { username: 'dimas01', name: 'Dimas Saputra', nickname: 'Dimas', position: 'KIPER' as const },
    ];
    for (const d of demo) {
      const [u] = await tx.insert(users).values({ username: d.username, password: pw, role: 'STUDENT' }).returning();
      const [s] = await tx.insert(students).values({ userId: u.id, name: d.name, nickname: d.nickname }).returning();
      await tx.insert(academyStudents).values({ studentId: s.id, classId: classA, position: d.position, yearJoin: 2025 });
    }
  });
  console.log('Data demo dibuat (password semua akun demo: afkc2026)');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

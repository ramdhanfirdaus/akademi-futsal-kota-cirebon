import {
  boolean,
  customType,
  jsonb,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  time,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/** Raw bytes (coach photos). node-postgres returns a Buffer, PGlite a Uint8Array. */
const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
});

export const roleEnum = pgEnum('role', ['ADMIN', 'COACH', 'STUDENT']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE']);
export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE']);
export const bloodTypeEnum = pgEnum('blood_type', ['A', 'B', 'AB', 'O']);
export const positionEnum = pgEnum('position', ['ANCHOR', 'FLANK', 'PIVOT', 'KIPER']);

const timestamps = {
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
};

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 64 }).notNull().unique(),
  password: text('password').notNull(),
  role: roleEnum('role').notNull(),
  status: userStatusEnum('status').notNull().default('ACTIVE'),
  /** Bumped on password change/reset; sessions signed with an older value stop working. */
  sessionVersion: integer('session_version').notNull().default(0),
  ...timestamps,
});

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 255 }),
  birthPlace: varchar('birth_place', { length: 255 }),
  birthDate: date('birth_date', { mode: 'string' }),
  gender: genderEnum('gender'),
  address: text('address'),
  parentName: varchar('parent_name', { length: 255 }),
  parentPhone: varchar('parent_phone', { length: 64 }),
  bloodType: bloodTypeEnum('blood_type'),
  diseaseHistory: text('disease_history'),
  ...timestamps,
});

export const coaches = pgTable('coaches', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 255 }),
  experience: text('experience'),
  certifications: jsonb('certifications').$type<string[]>().notNull().default([]),
  /** Small, client-resized photo shown on the public page; kept in Postgres so no extra storage service is needed. */
  photo: bytea('photo'),
  photoType: varchar('photo_type', { length: 32 }),
  ...timestamps,
});

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  coachId: integer('coach_id')
    .notNull()
    .references(() => coaches.id, { onDelete: 'restrict' }),
  deletedAt: timestamp('deleted_at', { mode: 'string' }),
  ...timestamps,
});

export const classSchedules = pgTable('class_schedules', {
  id: serial('id').primaryKey(),
  classId: integer('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  dayOfWeek: smallint('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'string' }),
  ...timestamps,
});

export const academyStudents = pgTable('academy_students', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .notNull()
    .unique()
    .references(() => students.id, { onDelete: 'cascade' }),
  classId: integer('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'restrict' }),
  position: positionEnum('position').notNull(),
  yearJoin: integer('year_join').notNull(),
  /** First month (YYYY-MM-01) the monthly fee is owed. Defaults to the month the student is added (WIB). */
  feeStart: date('fee_start', { mode: 'string' })
    .notNull()
    .default(sql`(date_trunc('month', now() at time zone 'Asia/Jakarta'))::date`),
  isGoalkeeper: boolean('is_goalkeeper').notNull().default(false),
  photo: text('photo'),
  ...timestamps,
});

export const attendances = pgTable(
  'attendances',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    classScheduleId: integer('class_schedule_id')
      .notNull()
      .references(() => classSchedules.id, { onDelete: 'restrict' }),
    date: date('date', { mode: 'string' }).notNull(),
    ...timestamps,
  },
  (t) => [unique('attendances_student_schedule_date').on(t.studentId, t.classScheduleId, t.date)],
);

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    period: date('period', { mode: 'string' }).notNull(),
    ...timestamps,
  },
  (t) => [unique('payments_student_period').on(t.studentId, t.period)],
);

export const holidayPeriods = pgTable('holiday_periods', {
  id: serial('id').primaryKey(),
  period: date('period', { mode: 'string' }).notNull().unique(),
  ...timestamps,
});

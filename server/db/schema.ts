import {
  boolean,
  customType,
  jsonb,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { TRACKS, type Grade, type TemplateField } from '@/lib/assessment';

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
  /** null = not decided yet */
  position: positionEnum('position'),
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

/** Photos for the public landing page's gallery, uploaded by admins (resized in the browser). */
export const galleryPhotos = pgTable('gallery_photos', {
  id: serial('id').primaryKey(),
  caption: varchar('caption', { length: 255 }),
  photo: bytea('photo').notNull(),
  photoType: varchar('photo_type', { length: 32 }).notNull(),
  ...timestamps,
});

export const assessmentTrackEnum = pgEnum('assessment_track', TRACKS);
export const semesterStatusEnum = pgEnum('semester_status', ['DRAFT', 'PUBLISHED']);

/** A grading period ("2026 Semester 1") with its own aspects, templates and certificate numbers. */
export const assessmentSemesters = pgTable(
  'assessment_semesters',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    /** Must contain `{urut}`, e.g. `{urut}/S.FKC/XII/2025`. Locked after the first publish. */
    numberFormat: varchar('number_format', { length: 255 }).notNull(),
    certificateDate: date('certificate_date', { mode: 'string' }),
    status: semesterStatusEnum('status').notNull().default('DRAFT'),
    firstPublishedAt: timestamp('first_published_at', { mode: 'string' }),
    publishedAt: timestamp('published_at', { mode: 'string' }),
    deletedAt: timestamp('deleted_at', { mode: 'string' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('assessment_semesters_name')
      .on(t.name)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const assessmentAspects = pgTable(
  'assessment_aspects',
  {
    id: serial('id').primaryKey(),
    semesterId: integer('semester_id')
      .notNull()
      .references(() => assessmentSemesters.id, { onDelete: 'cascade' }),
    track: assessmentTrackEnum('track').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [unique('assessment_aspects_order').on(t.semesterId, t.track, t.sortOrder)],
);

/** Certificate design image (with blank spots) and where each per-student text goes. */
export const assessmentTemplates = pgTable(
  'assessment_templates',
  {
    semesterId: integer('semester_id')
      .notNull()
      .references(() => assessmentSemesters.id, { onDelete: 'cascade' }),
    track: assessmentTrackEnum('track').notNull(),
    image: bytea('image').notNull(),
    imageType: varchar('image_type', { length: 32 }).notNull(),
    widthPx: integer('width_px').notNull(),
    heightPx: integer('height_px').notNull(),
    fields: jsonb('fields').$type<TemplateField[]>().notNull().default([]),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.semesterId, t.track] })],
);

export const assessments = pgTable(
  'assessments',
  {
    id: serial('id').primaryKey(),
    semesterId: integer('semester_id')
      .notNull()
      .references(() => assessmentSemesters.id, { onDelete: 'cascade' }),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    track: assessmentTrackEnum('track').notNull(),
    /** The student's class when graded. */
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    /** `{ "<aspect id>": grade }` */
    scores: jsonb('scores').$type<Record<string, Grade>>().notNull().default({}),
    /** Assigned at publish, never changed or reused. */
    certificateSeq: integer('certificate_seq'),
    gradedBy: integer('graded_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    unique('assessments_semester_student_track').on(t.semesterId, t.studentId, t.track),
    unique('assessments_semester_seq').on(t.semesterId, t.certificateSeq),
  ],
);

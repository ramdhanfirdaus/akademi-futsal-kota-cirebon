export interface Meta {
  page: number;
  last_page: number;
  total: number;
  limit?: number;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  COACH = 'COACH',
  STUDENT = 'STUDENT'
}

export interface User {
  id: number;
  username: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  student_id: number | null;
  coach_id: number | null;
}

export interface Class {
  id: number;
  name: string;
  coach_id: number;
  coach: Coach;
  schedules: Schedule[];
  created_at: string;
  updated_at: string;
}

export interface StudentAttendance {
  student_id: number;
  name: string;
  attendance: Record<string, boolean>; // key is date string YYYY-MM-DD
}

export interface DateAttendance {
  class_schedule_id: number;
  date: string;
  start_time: string;
  end_time: string;
}

export interface Attendance {
  class_id: number | string;
  dates: DateAttendance[];
  students: StudentAttendance[];
}

export interface Schedule {
  id?: number;
  class_id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at?: string;
  updated_at?: string | null;
}

export interface AcademyStudent {
  id: number;
  student_id: number;
  class_id: number;
  position: string;
  is_goalkeeper: boolean;
  year_join: number;
  photo: string | null;
  created_at: string;
  updated_at: string;
  class: Class;
}

export interface Student {
  id: number;
  user_id: number;
  username: string;

  name: string;
  nickname: string;

  birth_place?: string;
  birth_date?: string;

  gender?: 'MALE' | 'FEMALE';
  address?: string;

  parent_name?: string;
  parent_phone?: string;

  blood_type?: 'A' | 'B' | 'AB' | 'O';
  disease_history?: string;

  created_at: string;
  updated_at: string;

  academy_students: AcademyStudent;
}

export interface StudentFilters {
  name?: string;
  nickname?: string;
  class?: string;
  limit?: number;
  page?: number;
}

export interface Coach {
  id: number;
  user_id: number;
  name: string;
  nickname?: string;
  created_at: string;
  updated_at: string;

  classes: Class[];
}

export interface CoachFilters {
  name?: string;
  nickname?: string;
  limit?: number;
  page?: number;
}

export interface ScheduleSlot {
  day: string;
  startTime: string;
  endTime: string;
}

export interface ClassSchedule {
  id: string;
  title: string;
  coachId: string;
  coachName: string;
  slots: ScheduleSlot[];
  capacity: number;
  category: string;
  enrolled: number;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  method: string;
}

export interface AuthState {
  user: User | null;
  /** 'ready' once the session check (or login/logout) has completed. */
  status: 'idle' | 'loading' | 'ready';
  error: string | null;
}

export const POSITIONS = [
  { name: 'ANCHOR' },
  { name: 'FLANK' },
  { name: 'PIVOT' },
  { name: 'KIPER' }
];

export const GENDERS = [
  { name: 'MALE' },
  { name: 'FEMALE' }
];

export const BLOOD_TYPES = [
  { name: 'A' },
  { name: 'B' },
  { name: 'AB' },
  { name: 'O' }
];

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
  meta?: Meta & { limit: number };
}

export interface PaymentMonth {
  period: string;
  is_paid: boolean;
}

export interface PaymentStudent {
  student_id: number;
  name: string;
  months: PaymentMonth[];
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type ModalVariant = 'danger' | 'primary' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

export interface NotificationContextType {
  notifications: Notification[];
  showNotification: (params: OcallNotificationParams) => void;
  removeNotification: (id: string) => void;
}

export interface OcallNotificationParams {
  type: NotificationType;
  message: string;
  duration?: number;
}

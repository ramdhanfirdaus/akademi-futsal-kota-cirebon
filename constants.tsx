import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  CalendarCheck, 
  CalendarDays, 
  CreditCard, 
  School,
  UserCircle,
  CalendarOff,
  ArrowLeftRight
} from 'lucide-react';
import {NotificationType} from "@/types.ts";

export const APP_NAME = "AFKC";
export const CONTRIBUTED_NAME = "Universitas Indonesia";

/**
 * App navigation. `primary` items sit in the phone's bottom bar; the rest live under "Menu".
 * Labels are what users call things, in Indonesian.
 */
export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'COACH', 'STUDENT'], primary: true },
  { id: 'students', label: 'Siswa', icon: <Users size={20} />, roles: ['ADMIN', 'COACH'], primary: true },
  { id: 'attendance', label: 'Absensi', icon: <CalendarCheck size={20} />, roles: ['ADMIN', 'COACH'], primary: true },
  { id: 'payments', label: 'Iuran', icon: <CreditCard size={20} />, roles: ['ADMIN', 'COACH'], primary: true },
  { id: 'classes', label: 'Kelas', icon: <School size={20} />, roles: ['ADMIN', 'COACH'], primary: false },
  { id: 'class-board', label: 'Pindah Kelas', icon: <ArrowLeftRight size={20} />, roles: ['ADMIN', 'COACH'], primary: false },
  { id: 'coaches', label: 'Pelatih', icon: <UserSquare2 size={20} />, roles: ['ADMIN'], primary: false },
  { id: 'holidays', label: 'Bulan Libur', icon: <CalendarOff size={20} />, roles: ['ADMIN', 'COACH'], primary: false },
  { id: 'profile', label: 'Profil Saya', icon: <UserCircle size={20} />, roles: ['ADMIN', 'COACH', 'STUDENT'], primary: false },
];

export const DAYS: Record<number, string> = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};

export const MONTH_NAMES: string[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MONTH_KEYS: Record<number, string> = {
  0: 'Januari',
  1: 'Februari',
  2: 'Maret',
  3: 'April',
  4: 'Mei',
  5: 'Juni',
  6: 'Juli',
  7: 'Agustus',
  8: 'September',
  9: 'Oktober',
  10: 'November',
  11: 'Desember',
};

export const DAY_OPTIONS = Object.entries(DAYS).map(([value, label]) => ({
  value: parseInt(value),
  label,
}));

export const MONTH_OPTIONS = Object.entries(MONTH_KEYS).map(([value, label]) => ({
  value: parseInt(value),
  label,
}));

export const getYearOptions = () => {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - 2 + i;
    return {
      value: year,
      label: year.toString(),
    };
  });
};

export const DEFAULT_TITLES: Record<NotificationType, string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Information'
};

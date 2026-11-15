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
  CalendarOff
} from 'lucide-react';
import {NotificationType} from "@/types.ts";

export const APP_NAME = "AFKC";
export const CONTRIBUTED_NAME = "Universitas Indonesia";

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'COACH', 'STUDENT'] },
  { id: 'students', label: 'Students', icon: <Users size={20} />, roles: ['ADMIN', 'COACH'] },
  { id: 'coaches', label: 'Coaches', icon: <UserSquare2 size={20} />, roles: ['ADMIN'] },
  { id: 'classes', label: 'Class', icon: <School size={20} />, roles: ['ADMIN', 'COACH'] },
  { id: 'attendance', label: 'Attendance', icon: <CalendarCheck size={20} />, roles: ['ADMIN', 'COACH'] },
  { id: 'payments', label: 'Payments', icon: <CreditCard size={20} />, roles: ['ADMIN', 'COACH'] },
  { id: 'holidays', label: 'Bulan Libur', icon: <CalendarOff size={20} />, roles: ['ADMIN', 'COACH'] },
  { id: 'profile', label: 'My Profile', icon: <UserCircle size={20} />, roles: ['ADMIN', 'COACH', 'STUDENT'] },
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

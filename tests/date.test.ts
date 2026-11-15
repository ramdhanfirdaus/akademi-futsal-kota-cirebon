import { describe, expect, it } from 'vitest';
import {
  addDays, dayOfWeek, daysBetween, eachDate, getAge, isValidDate, monthKey, monthKeysBetween, monthStart, resolveRange, todayWIB,
} from '@/lib/date';

describe('date helpers', () => {
  it('todayWIB uses Asia/Jakarta', () => {
    expect(todayWIB(new Date('2026-11-14T18:30:00Z'))).toBe('2026-11-15');
    expect(todayWIB(new Date('2026-11-14T16:59:00Z'))).toBe('2026-11-14');
  });
  it('dayOfWeek: 0 = Sunday', () => {
    expect(dayOfWeek('2026-11-15')).toBe(0);
    expect(dayOfWeek('2026-11-16')).toBe(1);
  });
  it('eachDate crosses month boundaries', () => {
    expect(eachDate('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
  });
  it('daysBetween is inclusive', () => {
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(31);
  });
  it('addDays', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('monthStart accepts YYYY-MM or full date', () => {
    expect(monthStart('2026-07')).toBe('2026-07-01');
    expect(monthStart('2026-07-19')).toBe('2026-07-01');
    expect(monthKey('2026-07-19')).toBe('2026-07');
  });
  it('resolveRange', () => {
    expect(resolveRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(resolveRange(2026)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
  it('monthKeysBetween', () => {
    expect(monthKeysBetween('2026-11-01', '2027-01-31')).toEqual(['2026-11', '2026-12', '2027-01']);
  });
  it('getAge without the old +1', () => {
    expect(getAge('2010-05-01', '2026-04-30')).toBe(15);
    expect(getAge('2010-05-01', '2026-05-01')).toBe(16);
  });
  it('isValidDate', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('28-02-2026')).toBe(false);
  });
});

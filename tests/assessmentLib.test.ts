import { describe, expect, it } from 'vitest';
import { eligibleTracks, formatCertificateNo, parseGrade } from '@/lib/assessment';

describe('assessment constants', () => {
  it('eligibleTracks', () => {
    expect(eligibleTracks({ position: 'KIPER', isGoalkeeper: false })).toEqual(['GOALKEEPER']);
    expect(eligibleTracks({ position: 'KIPER', isGoalkeeper: true })).toEqual(['GOALKEEPER']);
    expect(eligibleTracks({ position: null, isGoalkeeper: false })).toEqual(['PLAYER']);
    expect(eligibleTracks({ position: 'ANCHOR', isGoalkeeper: true })).toEqual(['PLAYER', 'GOALKEEPER']);
  });
  it('parseGrade', () => {
    expect(['Cukup', 'c', 'CUKUP'].map(parseGrade)).toEqual(['CUKUP', 'CUKUP', 'CUKUP']);
    expect(['sangat baik', 'SB', 'Sangat  Baik', 'SANGAT_BAIK'].map(parseGrade)).toEqual(['SANGAT_BAIK', 'SANGAT_BAIK', 'SANGAT_BAIK', 'SANGAT_BAIK']);
    expect(['Baik', 'b'].map(parseGrade)).toEqual(['BAIK', 'BAIK']);
    expect(parseGrade('')).toBeUndefined();
    expect(parseGrade('  ')).toBeUndefined();
    expect(parseGrade(null)).toBeUndefined();
    expect(parseGrade(undefined)).toBeUndefined();
    expect(parseGrade('bagus')).toBeNull();
  });
  it('formatCertificateNo', () => {
    expect(formatCertificateNo('{urut}/S.FKC/XII/2025', 4)).toBe('004/S.FKC/XII/2025');
    expect(formatCertificateNo('{urut}', 1234)).toBe('1234');
  });
});

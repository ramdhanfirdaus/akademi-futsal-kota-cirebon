import { describe, expect, it } from 'vitest';
import { classLabel } from '@/lib/format';

describe('classLabel', () => {
  it('adds "Kelas" only when the name does not already start with it', () => {
    expect(classLabel('A')).toBe('Kelas A');
    expect(classLabel('Kelas A')).toBe('Kelas A');
    expect(classLabel('kelas kiper')).toBe('kelas kiper');
    expect(classLabel('Kelasik')).toBe('Kelas Kelasik');
    expect(classLabel(null)).toBe('-');
  });
});

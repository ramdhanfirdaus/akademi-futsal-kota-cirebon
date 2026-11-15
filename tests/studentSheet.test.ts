import { describe, expect, it } from 'vitest';
import { sheetToRows } from '@/lib/studentSheet';

describe('sheetToRows', () => {
  it('maps headers (any order, with * and hints) and keeps the spreadsheet line number', () => {
    const { rows, missing } = sheetToRows([
      ['Kelas *', 'Nama Lengkap *', 'Nama Panggilan *', 'Tanggal Lahir', 'Mulai Iuran', 'Telepon Orang Tua', 'Kolom Lain'],
      ['A', 'Budi Santoso', 'Budi', new Date(Date.UTC(2014, 4, 2)), new Date(Date.UTC(2026, 6, 1)), 81234, 'x'],
      [null, '', '   ', null, null, null, null],
      ['B1', '  Rizky ', 'Rizky', '2013-01-09', '2026-08', '0812', null],
    ]);
    expect(missing).toEqual([]);
    expect(rows).toEqual([
      { _row: 2, class: 'A', name: 'Budi Santoso', nickname: 'Budi', birth_date: '2014-05-02', fee_start: '2026-07', parent_phone: 81234 },
      { _row: 4, class: 'B1', name: 'Rizky', nickname: 'Rizky', birth_date: '2013-01-09', fee_start: '2026-08', parent_phone: '0812' },
    ]);
  });

  it('reports required columns that are missing from the header', () => {
    expect(sheetToRows([['Nama Lengkap']]).missing).toEqual(['Nama Panggilan', 'Kelas']);
  });
});

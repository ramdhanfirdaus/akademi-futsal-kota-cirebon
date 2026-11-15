import { describe, expect, it } from 'vitest';
import writeExcelFile from 'write-excel-file/node';
import { readSheet } from 'read-excel-file/node';
import { sheetToRows, templateSheets } from '@/lib/studentSheet';

describe('student template round trip', () => {
  it('a downloaded template, read back, yields the example row', async () => {
    const buffer = await writeExcelFile(templateSheets(['A', 'B1']) as never).toBuffer();
    const sheet = (await readSheet(buffer)) as unknown[][];
    const { rows, missing } = sheetToRows(sheet);
    expect(missing).toEqual([]);
    expect(rows).toEqual([
      expect.objectContaining({ _row: 2, name: 'Budi Santoso', nickname: 'Budi', class: 'A', year_join: 2026, fee_start: '2026-07', gender: 'L' }),
    ]);
    const guide = (await readSheet(buffer, 'Petunjuk')) as unknown[][];
    expect(guide.flat()).toEqual(expect.arrayContaining(['Kelas yang tersedia', 'A', 'B1']));
  });
});

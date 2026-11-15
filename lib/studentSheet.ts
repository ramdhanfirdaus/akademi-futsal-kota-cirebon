/**
 * The student import spreadsheet: its columns, and turning a read sheet into API rows.
 * Pure functions (no browser APIs), so they are unit-tested.
 */

export type SheetColumn = { key: string; header: string; required?: boolean; width: number; hint: string; example: string | number };

export const STUDENT_COLUMNS: SheetColumn[] = [
  { key: 'name', header: 'Nama Lengkap', required: true, width: 26, hint: 'Nama lengkap siswa', example: 'Budi Santoso' },
  { key: 'nickname', header: 'Nama Panggilan', required: true, width: 16, hint: 'Dipakai untuk membuat username, mis. budi01', example: 'Budi' },
  { key: 'class', header: 'Kelas', required: true, width: 14, hint: 'Nama kelas persis seperti di menu Kelas (lihat sheet Petunjuk)', example: 'A' },
  { key: 'position', header: 'Posisi', width: 12, hint: 'Anchor, Flank, Pivot, atau Kiper. Boleh kosong', example: 'Anchor' },
  { key: 'year_join', header: 'Tahun Gabung', width: 14, hint: 'Mis. 2026. Kosong = tahun ini', example: 2026 },
  { key: 'fee_start', header: 'Mulai Iuran', width: 14, hint: 'Bulan pertama iuran, format YYYY-MM (mis. 2026-07). Kosong = bulan ini', example: '2026-07' },
  { key: 'password', header: 'Password', width: 14, hint: 'Kosong = afkc2026', example: '' },
  { key: 'gender', header: 'Jenis Kelamin', width: 14, hint: 'L atau P', example: 'L' },
  { key: 'birth_place', header: 'Tempat Lahir', width: 16, hint: '', example: 'Cirebon' },
  { key: 'birth_date', header: 'Tanggal Lahir', width: 14, hint: 'Format YYYY-MM-DD (mis. 2014-05-02), atau kolom tanggal Excel', example: '2014-05-02' },
  { key: 'blood_type', header: 'Golongan Darah', width: 14, hint: 'A, B, AB, atau O', example: 'O' },
  { key: 'parent_name', header: 'Nama Orang Tua', width: 22, hint: '', example: 'Sutrisno' },
  { key: 'parent_phone', header: 'Telepon Orang Tua', width: 18, hint: 'Tulis sebagai teks agar angka 0 di depan tidak hilang', example: '081234567890' },
  { key: 'address', header: 'Alamat', width: 30, hint: '', example: 'Jl. Kesambi No. 1, Cirebon' },
  { key: 'disease_history', header: 'Riwayat Penyakit', width: 22, hint: 'Boleh kosong', example: '' },
  { key: 'is_goalkeeper', header: 'Ikut Latihan Kiper', width: 18, hint: 'Ya atau Tidak (untuk pemain non-kiper yang juga latihan kiper)', example: 'Tidak' },
];

/** Header text in the template, e.g. "Nama Lengkap *". */
export const headerText = (c: SheetColumn) => (c.required ? `${c.header} *` : c.header);

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const pad = (n: number) => String(n).padStart(2, '0');
/** Excel dates arrive as Date objects at UTC midnight. */
const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export type SheetRow = Record<string, string | number | boolean> & { _row: number };

/**
 * Sheet rows (row 1 = header) → objects keyed by column, with `_row` = spreadsheet line.
 * Columns are matched by header text, so their order may change; blank lines are skipped.
 */
export function sheetToRows(sheet: unknown[][]): { rows: SheetRow[]; missing: string[] } {
  const [header = [], ...body] = sheet;
  const keyAt = header.map((h) => STUDENT_COLUMNS.find((c) => norm(c.header) === norm(String(h ?? '')))?.key);
  const missing = STUDENT_COLUMNS.filter((c) => c.required && !keyAt.includes(c.key)).map((c) => c.header);

  const rows: SheetRow[] = [];
  body.forEach((cells, i) => {
    const row: SheetRow = { _row: i + 2 };
    let filled = false;
    cells.forEach((v, j) => {
      const key = keyAt[j];
      if (!key || v === null || v === undefined || v === '') return;
      let value: string | number | boolean;
      if (v instanceof Date) value = key === 'fee_start' ? isoDate(v).slice(0, 7) : isoDate(v);
      else if (typeof v === 'number' || typeof v === 'boolean') value = v;
      else value = String(v).trim();
      if (value === '') return;
      row[key] = value;
      filled = true;
    });
    if (filled) rows.push(row);
  });
  return { rows, missing };
}

type Cell = { value: string | number; fontWeight?: 'bold'; backgroundColor?: string; type?: typeof String | typeof Number } | null;

/** The two sheets of the downloadable template: the form to fill ("Siswa") and the instructions ("Petunjuk"). */
export function templateSheets(classNames: string[]) {
  const bold = (value: string, backgroundColor?: string): Cell => ({ value, fontWeight: 'bold', ...(backgroundColor ? { backgroundColor } : {}) });
  const head: Cell[] = STUDENT_COLUMNS.map((c) => bold(headerText(c), c.required ? '#F9CF00' : '#E6F2FA'));
  const example: Cell[] = STUDENT_COLUMNS.map((c) =>
    c.example === '' ? null : { value: c.example, type: typeof c.example === 'number' ? Number : String },
  );
  const guide: Cell[][] = [
    [bold('Kolom'), bold('Wajib'), bold('Cara mengisi')],
    ...STUDENT_COLUMNS.map((c) => [{ value: c.header }, { value: c.required ? 'Ya' : 'Tidak' }, c.hint ? { value: c.hint } : null]),
    [],
    [bold('Kelas yang tersedia')],
    ...classNames.map((n) => [{ value: n }] as Cell[]),
    [],
    [{ value: 'Hapus baris contoh (Budi Santoso) sebelum mengunggah.' }],
  ];
  return [
    { sheet: 'Siswa', data: [head, example], columns: STUDENT_COLUMNS.map((c) => ({ width: c.width })), stickyRowsCount: 1 },
    { sheet: 'Petunjuk', data: guide, columns: [{ width: 22 }, { width: 8 }, { width: 70 }] },
  ];
}

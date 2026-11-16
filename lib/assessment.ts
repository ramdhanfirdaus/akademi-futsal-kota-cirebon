/** Shared (server + browser) constants and helpers for semester assessments. */

export const TRACKS = ['PLAYER', 'GOALKEEPER'] as const;
export type Track = (typeof TRACKS)[number];

export const GRADES = ['CUKUP', 'BAIK', 'SANGAT_BAIK'] as const;
export type Grade = (typeof GRADES)[number];

export const TRACK_LABEL: Record<Track, string> = { PLAYER: 'Pemain', GOALKEEPER: 'Kiper' };
export const GRADE_LABEL: Record<Grade, string> = { CUKUP: 'Cukup', BAIK: 'Baik', SANGAT_BAIK: 'Sangat Baik' };

const GRADE_ALIASES: Record<string, Grade> = {
  cukup: 'CUKUP',
  c: 'CUKUP',
  baik: 'BAIK',
  b: 'BAIK',
  'sangat baik': 'SANGAT_BAIK',
  sangat_baik: 'SANGAT_BAIK',
  sb: 'SANGAT_BAIK',
};

/** Spreadsheet/user value → grade. `undefined` = empty cell, `null` = not a grade. */
export function parseGrade(v: unknown): Grade | null | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return undefined;
  return GRADE_ALIASES[s] ?? null;
}

/** Which assessments a student gets: kiper → Kiper only; others → Pemain, plus Kiper if they train as goalkeeper. */
export function eligibleTracks(s: { position: string | null; isGoalkeeper: boolean }): Track[] {
  if (s.position === 'KIPER') return ['GOALKEEPER'];
  return s.isGoalkeeper ? ['PLAYER', 'GOALKEEPER'] : ['PLAYER'];
}

export const SEQ_TOKEN = '{urut}';

/** `{urut}/S.FKC/XII/2025` + 4 → `004/S.FKC/XII/2025`. */
export function formatCertificateNo(format: string, seq: number): string {
  return format.split(SEQ_TOKEN).join(String(seq).padStart(3, '0'));
}

export const FONTS = ['TimesRoman', 'TimesRomanBold', 'Helvetica', 'HelveticaBold', 'Courier', 'CourierBold'] as const;
export type FontName = (typeof FONTS)[number];

export const ALIGNS = ['left', 'center', 'right'] as const;
export type Align = (typeof ALIGNS)[number];

/** A text spot on the certificate image. x, y, width are fractions of the page; y is the baseline from the top. */
export type TemplateField = { key: string; x: number; y: number; width: number; fontSize: number; font: FontName; align: Align; color: string };

/** Field keys other than `aspect:<id>`. */
export const BASE_FIELD_KEYS = ['name', 'nickname', 'class', 'semester', 'number', 'published_date'] as const;
export const FIELD_LABEL: Record<(typeof BASE_FIELD_KEYS)[number], string> = {
  name: 'Nama lengkap',
  nickname: 'Panggilan',
  class: 'Kelas',
  semester: 'Semester',
  number: 'Nomor sertifikat',
  published_date: 'Tanggal',
};

/** Complete = a score for every aspect of the semester+track. */
export function isComplete(scores: Record<string, unknown>, aspectIds: number[]): boolean {
  return aspectIds.length > 0 && aspectIds.every((id) => GRADES.includes(scores[String(id)] as Grade));
}

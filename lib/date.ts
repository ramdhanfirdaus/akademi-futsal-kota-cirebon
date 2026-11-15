/**
 * Date helpers shared by server and browser.
 * Business dates are plain `YYYY-MM-DD` strings interpreted as calendar days in WIB (Asia/Jakarta).
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function toUtcMs(date: string): number {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today's date in Asia/Jakarta as YYYY-MM-DD. */
export function todayWIB(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isValidDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  return fromUtcMs(toUtcMs(s)) === s;
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: string): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Inclusive number of calendar days from start to end. */
export function daysBetween(start: string, end: string): number {
  return Math.round((toUtcMs(end) - toUtcMs(start)) / DAY_MS) + 1;
}

export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  for (let ms = toUtcMs(start), last = toUtcMs(end); ms <= last; ms += DAY_MS) out.push(fromUtcMs(ms));
  return out;
}

/** `YYYY-MM` of a date (or of a `YYYY-MM` string). */
export function monthKey(input: string): string {
  return input.slice(0, 7);
}

/** Accepts `YYYY-MM` or `YYYY-MM-DD`; returns the first day of that month. */
export function monthStart(input: string): string {
  const key = monthKey(input);
  if (!/^\d{4}-\d{2}$/.test(key) || !isValidDate(`${key}-01`)) throw new Error(`Invalid month: ${input}`);
  return `${key}-01`;
}

function monthEnd(year: number, month: number): string {
  return fromUtcMs(Date.UTC(year, month, 0));
}

/** Whole month when `month` (1-12) is given, otherwise the whole year. */
export function resolveRange(year: number, month?: number | null): { start: string; end: string } {
  const y = String(year).padStart(4, '0');
  if (month) {
    const m = String(month).padStart(2, '0');
    return { start: `${y}-${m}-01`, end: monthEnd(year, month) };
  }
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

export function monthKeysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7));
  const last = monthKey(end);
  for (;;) {
    const key = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
    if (key > last) break;
    out.push(key);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Indonesian long date, e.g. "01 Mei 2010". */
export function formatDate(date?: string | null): string {
  if (!date) return '-';
  const safe = date.slice(0, 10);
  if (!isValidDate(safe)) return '-';
  return new Date(`${safe}T00:00:00Z`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Age in whole years on `today` (defaults to today in WIB). */
export function getAge(birthDate?: string | null, today: string = todayWIB()): number {
  if (!birthDate) return 0;
  const b = birthDate.slice(0, 10);
  if (!isValidDate(b)) return 0;
  let age = Number(today.slice(0, 4)) - Number(b.slice(0, 4));
  if (today.slice(5) < b.slice(5)) age -= 1;
  return age;
}

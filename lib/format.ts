/** "A" → "Kelas A", but "Kelas A" stays "Kelas A" (admins often type the word themselves). */
export function classLabel(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  if (!n) return '-';
  return /^kelas\b/i.test(n) ? n : `Kelas ${n}`;
}

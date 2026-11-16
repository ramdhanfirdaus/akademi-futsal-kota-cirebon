import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { pngBytes } from './helpers/images';
import { buildCertificatePdf, certificateFileName, layoutCertificate, pageSize, toWinAnsi } from '@/lib/certificate';
import type { TemplateField } from '@/lib/assessment';

const field = (key: string, extra: Partial<TemplateField> = {}): TemplateField => ({
  key,
  x: 0.1,
  y: 0.25,
  width: 0.8,
  fontSize: 20,
  font: 'Helvetica',
  align: 'center',
  color: '#000000',
  ...extra,
});
/** Every character is 0.5 × size wide. */
const measure = (text: string, _font: string, size: number) => text.length * size * 0.5;
const page = { width: 600, height: 800 };

describe('certificate layout', () => {
  it('A4 width, height from the image aspect ratio', () => {
    const p = pageSize(2480, 3508);
    expect(p.width).toBeCloseTo(595.28, 2);
    expect(Math.abs(p.height - 842)).toBeLessThan(1);
    expect(pageSize(3508, 2480).height).toBeCloseTo(595.28 * (2480 / 3508), 2);
  });

  it('positions by align inside the box; y from the top', () => {
    const [c] = layoutCertificate([field('name')], { name: 'ABCD' }, page, measure);
    // box 60..540, text width 4*20*0.5 = 40 → centered at 300
    expect(c).toMatchObject({ text: 'ABCD', x: 280, y: 600, size: 20, font: 'Helvetica' });
    const [l] = layoutCertificate([field('name', { align: 'left' })], { name: 'ABCD' }, page, measure);
    expect(l.x).toBe(60);
    const [r] = layoutCertificate([field('name', { align: 'right' })], { name: 'ABCD' }, page, measure);
    expect(r.x).toBe(500);
  });

  it('skips fields without a value', () => {
    expect(layoutCertificate([field('name'), field('class')], { name: 'A', class: '' }, page, measure).map((d) => d.text)).toEqual(['A']);
  });

  it('shrinks long text down to 60 % then truncates with …', () => {
    // box 480 wide. 60 chars at 20pt = 600 → shrinks to 16pt (480).
    const [fit] = layoutCertificate([field('name')], { name: 'x'.repeat(60) }, page, measure);
    expect(fit.size).toBe(16);
    expect(fit.text).toBe('x'.repeat(60));
    // 200 chars: even 12pt (60 %) gives 1200 → truncate.
    const [cut] = layoutCertificate([field('name')], { name: 'y'.repeat(200) }, page, measure);
    expect(cut.size).toBe(12);
    expect(cut.text.endsWith('…')).toBe(true);
    expect(measure(cut.text, 'Helvetica', 12)).toBeLessThanOrEqual(480);
  });

  it('toWinAnsi strips accents and replaces what the standard fonts cannot draw', () => {
    const t = toWinAnsi('Nguyễn Ánh 😀 “ok”');
    expect([...t].every((ch) => ch.charCodeAt(0) <= 0xff || '“”…'.includes(ch))).toBe(true);
    expect(t.startsWith('Nguyen Anh ')).toBe(true);
  });

  it('builds a one-page PDF of the template size, even with non-WinAnsi names', async () => {
    const bytes = await buildCertificatePdf({
      image: pngBytes(),
      imageType: 'image/png',
      widthPx: 2480,
      heightPx: 3508,
      fields: [field('name', { font: 'TimesRomanBold' }), field('aspect:1', { y: 0.5, font: 'CourierBold', color: '#0a72b8' })],
      values: { name: 'Nguyễn 😀 ' + 'Panjang'.repeat(30), 'aspect:1': 'SANGAT BAIK' },
      title: 'Sertifikat',
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28, 1);
    expect(Math.abs(height - 842)).toBeLessThan(1);
    expect(doc.getTitle()).toBe('Sertifikat');
  });

  it('file name', () => {
    expect(certificateFileName('Budi Santoso', '2026 Semester 1', 'PLAYER')).toBe('Sertifikat-Budi-Santoso-2026-Semester-1-Pemain.pdf');
    expect(certificateFileName("Nguyễn  O'Neil", 'S1/2026', 'GOALKEEPER')).toBe('Sertifikat-Nguyen-O-Neil-S1-2026-Kiper.pdf');
  });
});

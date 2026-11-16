/**
 * Builds a certificate PDF from the template image and per-student values. Runs in the route
 * handler (single download) and in the admin's browser (ZIP of all), so no Node-only APIs.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { TRACK_LABEL, type FontName, type TemplateField, type Track } from './assessment';

export type { FontName, TemplateField } from './assessment';

/** Field key → text already formatted for printing. */
export type CertificateValues = Record<string, string>;

export const A4_WIDTH = 595.28;
const MIN_SCALE = 0.6;
const ELLIPSIS = '…';

/** A4 width; height follows the image's aspect ratio (portrait or landscape). */
export function pageSize(widthPx: number, heightPx: number): { width: number; height: number } {
  return { width: A4_WIDTH, height: (A4_WIDTH * heightPx) / widthPx };
}

/** Characters the standard PDF fonts (WinAnsi) can draw beyond Latin-1. */
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

/** Strips accents ("Nguyễn" → "Nguyen") and replaces anything else the standard fonts can't draw with "?". */
export function toWinAnsi(text: string): string {
  let out = '';
  for (const ch of text.normalize('NFD').replace(/\p{M}/gu, '')) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(ch)) out += ch;
    else if (code === 0x09 || code === 0x0a || code === 0x0d) out += ' ';
    else out += '?';
  }
  return out;
}

export type Measure = (text: string, font: FontName, size: number) => number;
export type DrawText = { text: string; x: number; y: number; size: number; font: FontName; color: string };

/**
 * Where each value goes on the page (pdf-lib coordinates: origin bottom-left). Text wider than its
 * box shrinks down to 60 % of the field's size, then is cut and ends with "…".
 */
export function layoutCertificate(fields: TemplateField[], values: CertificateValues, page: { width: number; height: number }, measure: Measure): DrawText[] {
  const out: DrawText[] = [];
  for (const f of fields) {
    let text = toWinAnsi(values[f.key] ?? '').trim();
    if (!text) continue;
    const boxLeft = f.x * page.width;
    const boxWidth = f.width * page.width;
    let size = f.fontSize;
    const full = measure(text, f.font, size);
    if (full > boxWidth) {
      size = Math.max(f.fontSize * MIN_SCALE, (f.fontSize * boxWidth) / full);
      if (measure(text, f.font, size) > boxWidth) {
        while (text.length > 1 && measure(text + ELLIPSIS, f.font, size) > boxWidth) text = text.slice(0, -1).trimEnd();
        text += ELLIPSIS;
      }
    }
    const width = measure(text, f.font, size);
    const x = f.align === 'center' ? boxLeft + (boxWidth - width) / 2 : f.align === 'right' ? boxLeft + boxWidth - width : boxLeft;
    out.push({ text, x, y: page.height - f.y * page.height, size, font: f.font, color: f.color });
  }
  return out;
}

const STANDARD: Record<FontName, StandardFonts> = {
  TimesRoman: StandardFonts.TimesRoman,
  TimesRomanBold: StandardFonts.TimesRomanBold,
  Helvetica: StandardFonts.Helvetica,
  HelveticaBold: StandardFonts.HelveticaBold,
  Courier: StandardFonts.Courier,
  CourierBold: StandardFonts.CourierBold,
};

function hexColor(hex: string) {
  const n = /^#[0-9a-f]{6}$/i.test(hex) ? parseInt(hex.slice(1), 16) : 0;
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export type CertificateInput = {
  image: Uint8Array;
  imageType: 'image/png' | 'image/jpeg';
  widthPx: number;
  heightPx: number;
  fields: TemplateField[];
  values: CertificateValues;
  title: string;
};

/** One-page PDF: the template image full-page, the values drawn on top. */
export async function buildCertificatePdf(input: CertificateInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(input.title);
  doc.setCreator('AFKC');
  const size = pageSize(input.widthPx, input.heightPx);
  const page = doc.addPage([size.width, size.height]);
  const image = input.imageType === 'image/png' ? await doc.embedPng(input.image) : await doc.embedJpg(input.image);
  page.drawImage(image, { x: 0, y: 0, width: size.width, height: size.height });

  const fonts = new Map<FontName, PDFFont>();
  for (const f of input.fields) if (!fonts.has(f.font)) fonts.set(f.font, await doc.embedFont(STANDARD[f.font]));
  const measure: Measure = (text, font, s) => fonts.get(font)!.widthOfTextAtSize(text, s);
  for (const d of layoutCertificate(input.fields, input.values, size, measure)) {
    page.drawText(d.text, { x: d.x, y: d.y, size: d.size, font: fonts.get(d.font)!, color: hexColor(d.color) });
  }
  return doc.save();
}

/** `Sertifikat-<Nama>-<Semester>-<Pemain|Kiper>.pdf`, safe for any file system. */
export function certificateFileName(name: string, semester: string, track: Track): string {
  const safe = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^A-Za-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  return `Sertifikat-${safe(name)}-${safe(semester)}-${TRACK_LABEL[track]}.pdf`;
}

/** JSON-safe form (image as base64) for sending certificate input to the browser. */
export type CertificateInputJson = Omit<CertificateInput, 'image'> & { image: string; fileName: string };

export function fromJsonInput(json: CertificateInputJson): CertificateInput & { fileName: string } {
  const bin = atob(json.image);
  const image = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) image[i] = bin.charCodeAt(i);
  return { ...json, image };
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Eye, ImagePlus, Trash2 } from 'lucide-react';

import { LoadingSpinner, useNotification } from '@/components';
import SaveBar from '@/components/SaveBar';
import AssessmentService, { type SemesterDTO, type TemplateMeta } from '@/services/AssessmentService';
import { apiErrorMessage } from '@/services/errors';
import { ALIGNS, BASE_FIELD_KEYS, FIELD_LABEL, FONTS, TRACKS, TRACK_LABEL, formatCertificateNo, type TemplateField, type Track } from '@/lib/assessment';
import { A4_WIDTH, buildCertificatePdf, fromJsonInput, type CertificateValues } from '@/lib/certificate';
import { formatDate, todayWIB } from '@/lib/date';

const MAX_BYTES = 4 * 1024 * 1024;
const FONT_LABEL: Record<(typeof FONTS)[number], string> = {
  TimesRoman: 'Times',
  TimesRomanBold: 'Times Tebal',
  Helvetica: 'Helvetica',
  HelveticaBold: 'Helvetica Tebal',
  Courier: 'Courier',
  CourierBold: 'Courier Tebal',
};
const CSS_FONT: Record<(typeof FONTS)[number], React.CSSProperties> = {
  TimesRoman: { fontFamily: 'Times New Roman, serif' },
  TimesRomanBold: { fontFamily: 'Times New Roman, serif', fontWeight: 700 },
  Helvetica: { fontFamily: 'Helvetica, Arial, sans-serif' },
  HelveticaBold: { fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 700 },
  Courier: { fontFamily: 'Courier New, monospace' },
  CourierBold: { fontFamily: 'Courier New, monospace', fontWeight: 700 },
};

export default function TemplateTab({ semester, onChange }: { semester: SemesterDTO; onChange: (s: SemesterDTO) => void }) {
  const [track, setTrack] = useState<Track>('PLAYER');
  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="Pilih jalur">
        {TRACKS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === track}
            onClick={() => setTrack(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${t === track ? 'bg-laut text-white' : 'border border-slate-200 bg-white text-laut-dalam hover:border-laut'}`}
          >
            Sertifikat {TRACK_LABEL[t]}
          </button>
        ))}
      </div>
      <TrackTemplate key={track} semester={semester} track={track} onChange={onChange} />
    </div>
  );
}

/** Reads an image file as a data URL; shrinks it to a JPEG only when it is over the upload limit. */
async function prepareImage(file: File): Promise<{ image: string; width_px: number; height_px: number }> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Template harus PNG atau JPG');
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (file.size <= MAX_BYTES) {
    bitmap.close();
    const image = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('File tidak bisa dibaca'));
      r.readAsDataURL(file);
    });
    return { image, width_px: width, height_px: height };
  }
  const scale = Math.min(1, 3508 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const q of [0.9, 0.8, 0.7, 0.6]) {
    const image = canvas.toDataURL('image/jpeg', q);
    if ((image.length * 3) / 4 <= MAX_BYTES) return { image, width_px: canvas.width, height_px: canvas.height };
  }
  throw new Error('Gambar terlalu besar. Simpan ulang dengan ukuran lebih kecil.');
}

function TrackTemplate({ semester, track, onChange }: { semester: SemesterDTO; track: Track; onChange: (s: SemesterDTO) => void }) {
  const { showNotification } = useNotification();
  const [meta, setMeta] = useState<TemplateMeta | null | undefined>(undefined);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'' | 'upload' | 'save' | 'preview'>('');
  const fileInput = useRef<HTMLInputElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);

  const aspects = semester.aspects[track];
  const keys: { key: string; label: string; sample: string }[] = [
    ...BASE_FIELD_KEYS.map((k) => ({
      key: k,
      label: FIELD_LABEL[k],
      sample: {
        name: 'NAMA LENGKAP',
        nickname: 'Panggilan',
        class: 'Kelas A',
        semester: semester.name,
        number: formatCertificateNo(semester.number_format, 1),
        published_date: formatDate(semester.certificate_date ?? todayWIB()),
      }[k],
    })),
    ...aspects.map((a) => ({ key: `aspect:${a.id}`, label: `Nilai: ${a.name}`, sample: 'SANGAT BAIK' })),
  ];
  const sampleValues: CertificateValues = Object.fromEntries(keys.map((k) => [k.key, k.sample]));
  const labelOf = (key: string) => keys.find((k) => k.key === key)?.label ?? key;

  useEffect(() => {
    AssessmentService.getTemplate(semester.id, track)
      .then((res) => {
        setMeta(res.data);
        setFields(res.data?.fields ?? []);
      })
      .catch((e) => {
        setMeta(null);
        showNotification({ type: 'error', message: apiErrorMessage(e) });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester.id, track]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageWidth(el.clientWidth));
    ro.observe(el);
    setStageWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [meta]);

  const upload = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    setBusy('upload');
    try {
      const body = await prepareImage(file);
      const res = await AssessmentService.uploadTemplateImage(semester.id, track, body);
      setMeta(res.data);
      setFields(res.data.fields);
      onChange({ ...semester, has_template: { ...semester.has_template, [track]: true } });
      showNotification({ type: 'success', message: 'Template diunggah' });
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setBusy('');
    }
  };

  const dirty = JSON.stringify(fields) !== JSON.stringify(meta?.fields ?? []);
  const save = async () => {
    setBusy('save');
    try {
      const res = await AssessmentService.saveTemplateFields(semester.id, track, fields);
      setMeta(res.data);
      setFields(res.data.fields);
      showNotification({ type: 'success', message: 'Posisi isian disimpan' });
    } catch (e) {
      showNotification({ type: 'error', message: apiErrorMessage(e) });
    } finally {
      setBusy('');
    }
  };

  /** Real PDF with the current (unsaved) positions: the first graded student, or sample text. */
  const preview = async () => {
    if (!meta) return;
    const win = window.open('', '_blank');
    setBusy('preview');
    try {
      const results = (await AssessmentService.results(semester.id)).data;
      const first = results.find((r) => r.track === track && r.assessment_id && r.status !== 'BELUM_DINILAI');
      let input;
      if (first) {
        input = { ...fromJsonInput((await AssessmentService.certificateInput(first.assessment_id!)).data), fields };
      } else {
        const image = new Uint8Array(await (await fetch(meta.image_url)).arrayBuffer());
        input = {
          image,
          imageType: meta.image_type as 'image/png' | 'image/jpeg',
          widthPx: meta.width_px,
          heightPx: meta.height_px,
          fields,
          values: sampleValues,
          title: 'Pratinjau sertifikat',
        };
      }
      const pdf = await buildCertificatePdf(input);
      const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: 'application/pdf' }));
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch (e) {
      win?.close();
      showNotification({ type: 'error', message: apiErrorMessage(e, 'Gagal membuat pratinjau') });
    } finally {
      setBusy('');
    }
  };

  const toggleKey = (key: string) => {
    if (fields.some((f) => f.key === key)) {
      setFields((prev) => prev.filter((f) => f.key !== key));
      if (selected === key) setSelected(null);
    } else {
      const isAspect = key.startsWith('aspect:');
      setFields((prev) => [
        ...prev,
        {
          key,
          x: isAspect ? 0.55 : 0.2,
          y: 0.3 + prev.length * 0.04,
          width: isAspect ? 0.3 : 0.6,
          fontSize: isAspect ? 12 : 20,
          font: 'TimesRomanBold',
          align: isAspect ? 'left' : 'center',
          color: '#000000',
        },
      ]);
      setSelected(key);
    }
  };
  const update = (key: string, patch: Partial<TemplateField>) => setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  /** Pointer drag (mouse + touch) to move a field, or to resize its width from the right edge. */
  const startDrag = (e: React.PointerEvent, f: TemplateField, mode: 'move' | 'width') => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(f.key);
    const el = stage.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, fx: f.x, fy: f.y, fw: f.width };
    const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - start.x) / rect.width;
      const dy = (ev.clientY - start.y) / rect.height;
      if (mode === 'move') update(f.key, { x: clamp(start.fx + dx, 0, 1 - start.fw), y: clamp(start.fy + dy) });
      else update(f.key, { width: clamp(start.fw + dx, 0.03, 1 - start.fx) });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (meta === undefined) return <LoadingSpinner text="Memuat template..." />;

  const sel = fields.find((f) => f.key === selected) ?? null;
  const ptToPx = stageWidth / A4_WIDTH;

  return (
    <div className="space-y-4">
      <input ref={fileInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      {!meta ? (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={!!busy}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center hover:border-laut"
        >
          <ImagePlus size={32} className="text-laut" aria-hidden />
          <span className="font-bold text-laut-dalam">{busy ? 'Mengunggah…' : `Unggah desain sertifikat ${TRACK_LABEL[track]}`}</span>
          <span className="max-w-lg text-sm text-slate-500">
            PNG atau JPG (maks. 4 MB), mis. diekspor dari Word atau Canva ukuran A4 150–300 DPI. Kosongkan tempat nama, nomor, dan nilai — isian itu ditempatkan
            di sini.
          </span>
        </button>
      ) : (
        <>
          <SaveBar onSave={save} disabled={!dirty} saving={busy === 'save'}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={preview}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-laut-dalam hover:border-laut"
              >
                <Eye size={16} aria-hidden /> {busy === 'preview' ? 'Membuat…' : 'Pratinjau PDF'}
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-laut-dalam hover:border-laut"
              >
                <ImagePlus size={16} aria-hidden /> {busy === 'upload' ? 'Mengunggah…' : 'Ganti gambar'}
              </button>
            </div>
          </SaveBar>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div
              ref={stage}
              className="relative w-full touch-none select-none overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              onPointerDown={() => setSelected(null)}
            >
              <img src={meta.image_url} alt={`Template sertifikat ${TRACK_LABEL[track]}`} className="block w-full" draggable={false} />
              {fields.map((f) => {
                const size = f.fontSize * ptToPx;
                const active = f.key === selected;
                return (
                  <div
                    key={f.key}
                    onPointerDown={(e) => startDrag(e, f, 'move')}
                    className={`absolute cursor-move whitespace-nowrap ${active ? 'outline outline-2 outline-laut' : 'outline-dashed outline-1 outline-laut/60'}`}
                    style={{
                      left: `${f.x * 100}%`,
                      width: `${f.width * 100}%`,
                      top: `calc(${f.y * 100}% - ${size * 0.85}px)`,
                      height: size * 1.1,
                      fontSize: size,
                      lineHeight: `${size * 1.1}px`,
                      textAlign: f.align,
                      color: f.color,
                      background: active ? 'rgba(10,114,184,0.08)' : 'rgba(249,207,0,0.12)',
                      ...CSS_FONT[f.font],
                    }}
                    title={labelOf(f.key)}
                  >
                    <span className="block overflow-hidden text-ellipsis">{sampleValues[f.key]}</span>
                    <span
                      onPointerDown={(e) => startDrag(e, f, 'width')}
                      className="absolute -right-1.5 top-0 h-full w-3 cursor-ew-resize rounded bg-laut/70"
                      aria-hidden
                    />
                  </div>
                );
              })}
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-bold text-laut-dalam">Isian</h3>
                <p className="mb-2 text-xs text-slate-500">Centang untuk menaruh di sertifikat, lalu geser kotaknya. Tarik sisi kanan untuk lebar.</p>
                <ul className="space-y-1">
                  {keys.map((k) => {
                    const on = fields.some((f) => f.key === k.key);
                    return (
                      <li key={k.key} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${selected === k.key ? 'bg-laut-muda' : ''}`}>
                        <input id={`f-${k.key}`} type="checkbox" checked={on} onChange={() => toggleKey(k.key)} className="h-4 w-4 accent-laut" />
                        <label htmlFor={`f-${k.key}`} className="flex-1 cursor-pointer text-sm">
                          {k.label}
                        </label>
                        {on && (
                          <button type="button" className="text-xs font-bold text-laut hover:underline" onClick={() => setSelected(k.key)}>
                            atur
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              {sel && (
                <section className="space-y-3 rounded-2xl border border-laut/30 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-laut-dalam">{labelOf(sel.key)}</h3>
                    <button
                      type="button"
                      onClick={() => toggleKey(sel.key)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Lepas isian"
                      title="Lepas isian"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <label className="block text-sm">
                    <span className="text-xs font-black uppercase text-slate-500">Huruf</span>
                    <select
                      value={sel.font}
                      onChange={(e) => update(sel.key, { font: e.target.value as TemplateField['font'] })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                    >
                      {FONTS.map((f) => (
                        <option key={f} value={f}>
                          {FONT_LABEL[f]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="text-xs font-black uppercase text-slate-500">Ukuran (pt)</span>
                      <input
                        type="number"
                        min={4}
                        max={120}
                        value={sel.fontSize}
                        onChange={(e) => update(sel.key, { fontSize: Math.min(120, Math.max(4, Number(e.target.value) || 4)) })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-xs font-black uppercase text-slate-500">Warna</span>
                      <input
                        type="color"
                        value={sel.color}
                        onChange={(e) => update(sel.key, { color: e.target.value })}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-300"
                      />
                    </label>
                  </div>
                  <div className="flex gap-1" role="group" aria-label="Rata teks">
                    {ALIGNS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        aria-pressed={sel.align === a}
                        onClick={() => update(sel.key, { align: a })}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold ${sel.align === a ? 'bg-laut text-white' : 'border border-slate-200 text-laut-dalam'}`}
                      >
                        {{ left: 'Kiri', center: 'Tengah', right: 'Kanan' }[a]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Teks yang terlalu panjang otomatis diperkecil, lalu dipotong dengan "…".</p>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

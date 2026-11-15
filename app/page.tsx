import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, CalendarCheck, CalendarClock, Clock, Smartphone, Trophy, Users } from 'lucide-react';
import { getDb } from '@/server/db';
import { publicOverview, type PublicClass, type PublicCoach } from '@/server/services/public';
import { listGallery } from '@/server/services/gallery';
import { site } from '@/content/site';
import { publicFonts } from '@/lib/fonts';
import Waves from '@/components/landing/Waves';
import SiteNav from '@/components/landing/SiteNav';
import GallerySlider from '@/components/landing/GallerySlider';
import { classLabel } from '@/lib/format';

export const metadata: Metadata = {
  title: `${site.name} (${site.short})`,
  description: site.intro,
};

// Served from cache; refreshed immediately when classes, coaches or gallery change, else every 10 minutes.
export const revalidate = 600;

const DAYS = [
  { dow: 1, name: 'Senin' },
  { dow: 2, name: 'Selasa' },
  { dow: 3, name: 'Rabu' },
  { dow: 4, name: 'Kamis' },
  { dow: 5, name: 'Jumat' },
  { dow: 6, name: 'Sabtu' },
  { dow: 0, name: 'Minggu' },
];

type Photo = { src: string; alt: string; caption: string | null };

async function loadOverview(): Promise<{ classes: PublicClass[]; coaches: PublicCoach[]; photos: Photo[] }> {
  try {
    const db = getDb();
    const [overview, gallery] = await Promise.all([publicOverview(db), listGallery(db)]);
    return { ...overview, photos: gallery.map((g) => ({ src: g.url, alt: g.caption ?? 'Kegiatan AFKC', caption: g.caption })) };
  } catch (err) {
    // The landing page must render even when the database is unreachable (e.g. during a build).
    console.error('landing: could not load overview', err);
    return { classes: [], coaches: [], photos: [] };
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const DISC = ['bg-laut', 'bg-daun', 'bg-laut-dalam'];

const FEATURES = [
  {
    icon: CalendarCheck,
    tone: 'bg-laut text-white',
    title: 'Latihan terjadwal',
    text: 'Setiap kelas berlatih di hari dan jam yang tetap, jadi anak dan orang tua mudah mengatur waktu.',
  },
  {
    icon: Users,
    tone: 'bg-daun text-white',
    title: 'Pelatih berkualitas',
    text: 'Dibimbing pelatih berpengalaman yang mengajarkan teknik, kerja sama tim, dan sportivitas.',
  },
  {
    icon: Smartphone,
    tone: 'bg-pantai text-laut-dalam',
    title: 'Pantau dari HP',
    text: 'Siswa dan orang tua bisa melihat kehadiran latihan dan status iuran bulanan kapan saja.',
  },
];

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laut-dalam';

export default async function Home() {
  const { classes, coaches, photos: uploaded } = await loadOverview();
  // Uploaded photos (Admin → Galeri) first, then any listed in content/site.ts.
  const photos: Photo[] = [...uploaded, ...site.gallery.map((g) => ({ src: g.src, alt: g.alt, caption: g.alt }))];
  const sessions = DAYS.map((d) => ({
    ...d,
    items: classes
      .flatMap((c) => c.schedules.filter((s) => s.day_of_week === d.dow).map((s) => ({ ...s, cls: c.name, coach: c.coach })))
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));
  const trainingDays = sessions.filter((d) => d.items.length).map((d) => d.name);
  const { contact } = site;

  return (
    <div className={`${publicFonts} font-body bg-white text-laut-dalam`}>
      <a href="#jadwal" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-20 focus:z-[60] focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Lewati ke jadwal
      </a>
      <SiteNav short={site.short} hide={photos.length > 0 ? [] : ['galeri']} />

      {/* Hero: the crest's yellow sky running into its sea. */}
      <header className="relative overflow-hidden bg-pantai">
        <div aria-hidden className="bg-titik absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div aria-hidden className="absolute -right-24 top-10 h-[34rem] w-[34rem] rounded-full bg-white/25 blur-3xl" />

        <div className="wrap relative grid items-center gap-10 pb-8 pt-28 md:grid-cols-[1.4fr_1fr] md:pt-36">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-laut-dalam/10 px-4 py-1.5 text-sm font-bold">
              <Trophy size={16} aria-hidden /> Kota Cirebon
            </p>
            <h1 className="mt-5 font-display text-[length:clamp(2.75rem,6vw,6.5rem)] font-black uppercase leading-[0.85] tracking-tight">
              Akademi Futsal Kota Cirebon
            </h1>
            <p className="mt-6 max-w-[38rem] text-lg leading-relaxed lg:text-xl">{site.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#jadwal" className={`rounded-full bg-laut-dalam px-6 py-3 font-bold text-white shadow-lg shadow-laut-dalam/20 transition-colors hover:bg-laut ${focusRing}`}>
                Lihat jadwal latihan
              </a>
              <Link href="/login" className={`rounded-full border-2 border-laut-dalam bg-white/40 px-6 py-3 font-bold transition-colors hover:bg-laut-dalam hover:text-white ${focusRing}`}>
                Masuk ke akun
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-60 sm:w-80 md:w-full md:max-w-lg">
            <img
              src="/logo.png"
              alt="Lambang Futsal Kota Cirebon: dua udang di atas ombak dengan bola bermotif mega mendung"
              className="relative w-full drop-shadow-[0_16px_0_rgba(8,58,99,0.16)]"
            />
            {trainingDays.length > 0 && (
              <div className="absolute -bottom-2 left-0 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl shadow-laut-dalam/15 sm:-left-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-laut text-white">
                  <CalendarClock size={20} aria-hidden />
                </span>
                <span>
                  <span className="block text-xs text-laut-dalam/70">Latihan rutin</span>
                  <span className="block font-bold">{trainingDays.join(', ')}</span>
                </span>
              </div>
            )}
          </div>
        </div>
        <Waves />
      </header>

      <main>
        {/* Timetable: a week strip for the rhythm, then one card per training day. */}
        <section id="jadwal" className="scroll-mt-24 bg-laut-dalam pb-20 pt-10 text-white">
          <div className="wrap">
            <h2 className="font-display text-5xl font-black uppercase sm:text-6xl">Jadwal latihan</h2>
            <p className="mt-3 max-w-[40rem] text-white/80">Hari dan jam latihan setiap kelas dalam seminggu.</p>

            {classes.length === 0 ? (
              <div className="mt-10 flex flex-col items-start gap-5 rounded-2xl bg-white/[0.06] p-6 sm:flex-row sm:items-center sm:p-8">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-pantai text-laut-dalam">
                  <CalendarClock size={30} aria-hidden />
                </span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">Jadwal latihan sedang disusun</h3>
                  <p className="mt-1 text-white/75">Untuk informasi kelas dan pendaftaran, hubungi pengurus AFKC.</p>
                </div>
                {contact.whatsapp && (
                  <a href={`https://wa.me/${contact.whatsapp}`} className={`rounded-full bg-pantai px-5 py-2.5 font-bold text-laut-dalam ${focusRing}`}>
                    Hubungi lewat WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <>
                <ol className="mt-10 grid grid-cols-7 gap-1.5 sm:gap-3" aria-label="Hari latihan dalam seminggu">
                  {sessions.map((d) => (
                    <li
                      key={d.dow}
                      className={`rounded-xl py-3 text-center font-display text-base font-bold uppercase sm:text-2xl ${
                        d.items.length ? 'bg-pantai text-laut-dalam' : 'bg-white/[0.06] text-white/35'
                      }`}
                    >
                      <span className="sm:hidden">{d.name.slice(0, 3)}</span>
                      <span className="hidden sm:inline">{d.name}</span>
                      <span className="sr-only">{d.items.length ? `: ${d.items.length} sesi` : ': tidak ada latihan'}</span>
                    </li>
                  ))}
                </ol>

                <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sessions
                    .filter((d) => d.items.length)
                    .map((d) => (
                      <li key={d.dow} className="rounded-2xl bg-white p-5 text-laut-dalam shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]">
                        <h3 className="flex items-center justify-between font-display text-3xl font-black uppercase">
                          {d.name}
                          <span className="rounded-full bg-laut-muda px-3 py-1 font-body text-xs font-bold normal-case text-laut">{d.items.length} sesi</span>
                        </h3>
                        <ul className="mt-4 divide-y divide-slate-100">
                          {d.items.map((s) => (
                            <li key={`${s.cls}-${s.start_time}`} className="flex items-center gap-4 py-3">
                              <span className="flex w-24 shrink-0 items-center gap-1.5 text-sm font-bold tabular-nums text-laut">
                                <Clock size={15} aria-hidden /> {s.start_time}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-bold">{classLabel(s.cls)}</span>
                                <span className="block text-sm text-laut-dalam/65">
                                  s.d. {s.end_time}
                                  {s.coach ? ` · Coach ${s.coach}` : ''}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </div>
        </section>

        {/* What the academy offers, as three short cards. */}
        <section id="tentang" className="scroll-mt-24 bg-white">
          <div>
            <div className="wrap py-20">
              <h2 className="font-display text-5xl font-black uppercase sm:text-6xl">Tentang AFKC</h2>
              <p className="mt-3 max-w-[40rem] text-laut-dalam/75">{site.about[0]}</p>
              <ul className="mt-10 grid gap-5 md:grid-cols-3">
                {FEATURES.map((f) => (
                  <li key={f.title} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_-18px_rgba(8,58,99,0.35)]">
                    <div aria-hidden className="bg-ombak absolute inset-x-0 bottom-0 h-16" />
                    <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.tone}`}>
                      <f.icon size={24} aria-hidden />
                    </span>
                    <h3 className="mt-5 text-xl font-bold">{f.title}</h3>
                    <p className="mt-2 leading-relaxed text-laut-dalam/75">{f.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="pelatih" className="relative scroll-mt-24 bg-[#FFF8DC] py-20">
          <div className="wrap">
            <h2 className="font-display text-5xl font-black uppercase sm:text-6xl">Pelatih</h2>
            <p className="mt-3 max-w-[40rem] text-laut-dalam/75">Siswa AFKC dibimbing pelatih berpengalaman yang peduli pada perkembangan setiap anak.</p>
            {coaches.length === 0 ? (
              <div className="mt-10 flex flex-col items-start gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_-18px_rgba(8,58,99,0.35)] sm:flex-row sm:items-center sm:p-8">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-laut-muda text-laut">
                  <Users size={30} aria-hidden />
                </span>
                <div>
                  <h3 className="text-xl font-bold">Profil pelatih segera hadir</h3>
                  <p className="mt-1 text-laut-dalam/75">Kenali pelatih AFKC, pengalaman, dan sertifikasinya di sini.</p>
                </div>
              </div>
            ) : (
              <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {coaches.map((c, i) => (
                  <li key={`${c.name}-${i}`}>
                    <article className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_-18px_rgba(8,58,99,0.35)]">
                      <div className="relative aspect-[4/5] overflow-hidden bg-laut-muda">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={`Foto ${c.name}`} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span
                            aria-hidden
                            className={`flex h-full w-full items-center justify-center font-display text-8xl font-black text-white ${DISC[i % DISC.length]}`}
                          >
                            {initials(c.name)}
                          </span>
                        )}
                        {c.classes.length > 0 && (
                          <p className="absolute bottom-3 left-3 right-3 rounded-lg bg-pantai px-3 py-2 text-sm font-bold">{c.classes.map(classLabel).join(', ')}</p>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-display text-3xl font-black uppercase leading-none">{c.name}</h3>
                        {c.nickname && c.nickname !== c.name && <p className="mt-1 text-laut-dalam/70">Coach {c.nickname}</p>}
                        {c.experience && (
                          <div className="mt-4">
                            <h4 className="text-sm font-bold">Pengalaman</h4>
                            <p className="mt-1 whitespace-pre-line leading-relaxed text-laut-dalam/80">{c.experience}</p>
                          </div>
                        )}
                        {c.certifications.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-bold">Sertifikasi</h4>
                            <ul className="mt-2 space-y-1.5">
                              {c.certifications.map((cert) => (
                                <li key={cert} className="flex items-start gap-2 text-laut-dalam/80">
                                  <Award size={18} aria-hidden className="mt-0.5 shrink-0 text-daun" />
                                  <span>{cert}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {photos.length > 0 && (
          <section id="galeri" className="scroll-mt-24 bg-laut-muda py-20">
            <div className="wrap">
              <h2 className="font-display text-5xl font-black uppercase sm:text-6xl">Galeri</h2>
              <p className="mt-3 max-w-[40rem] text-laut-dalam/75">Momen latihan dan pertandingan siswa AFKC.</p>
              <GallerySlider slides={photos} />
            </div>
          </section>
        )}

        {/* Call to action for families already enrolled. */}
        <section className={`pb-20 ${photos.length > 0 ? 'bg-laut-muda' : 'bg-[#FFF8DC]'}`}>
          <div className="wrap">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-laut-dalam to-laut px-6 py-10 text-white sm:px-10 md:py-14">
              <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <h2 className="font-display text-4xl font-black uppercase sm:text-5xl">Sudah jadi siswa AFKC?</h2>
                  <p className="mt-2 max-w-[36rem] text-white/80">{site.about[1]}</p>
                </div>
                <Link href="/login" className={`shrink-0 rounded-full bg-pantai px-8 py-4 font-bold text-laut-dalam transition-colors hover:bg-white ${focusRing}`}>
                  Masuk ke akun
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-laut-dalam py-10 text-white/80">
        <div className="wrap flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-12 w-12" />
            <div>
              <p className="font-display text-xl font-bold text-white">{site.name}</p>
              <p className="text-sm">© {new Date().getFullYear()} {site.short}</p>
            </div>
          </div>
          {(contact.address || contact.whatsapp || contact.instagram) && (
            <address className="space-y-1 text-sm not-italic">
              {contact.address && <p>{contact.address}</p>}
              {contact.whatsapp && (
                <p>
                  <a className="underline hover:text-white" href={`https://wa.me/${contact.whatsapp}`}>WhatsApp +{contact.whatsapp}</a>
                </p>
              )}
              {contact.instagram && (
                <p>
                  <a className="underline hover:text-white" href={`https://instagram.com/${contact.instagram}`}>Instagram @{contact.instagram}</a>
                </p>
              )}
            </address>
          )}
        </div>
      </footer>
    </div>
  );
}

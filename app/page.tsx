import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/server/db';
import { publicOverview, type PublicClass, type PublicCoach } from '@/server/services/public';
import { site } from '@/content/site';
import { publicFonts } from '@/lib/fonts';
import Waves from '@/components/landing/Waves';

export const metadata: Metadata = {
  title: `${site.name} (${site.short})`,
  description: site.intro,
};

// Re-read classes and coaches at most every 10 minutes; the page itself is served from cache.
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

async function loadOverview(): Promise<{ classes: PublicClass[]; coaches: PublicCoach[] }> {
  try {
    return await publicOverview(getDb());
  } catch (err) {
    // The landing page must render even when the database is unreachable (e.g. during a build).
    console.error('landing: could not load overview', err);
    return { classes: [], coaches: [] };
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const DISC = ['bg-udang', 'bg-daun', 'bg-laut'];

export default async function Home() {
  const { classes, coaches } = await loadOverview();
  const sessions = DAYS.map((d) => ({
    ...d,
    items: classes
      .flatMap((c) => c.schedules.filter((s) => s.day_of_week === d.dow).map((s) => ({ ...s, cls: c.name, coach: c.coach })))
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));
  const { contact } = site;

  return (
    <div className={`${publicFonts} font-body bg-white text-laut-dalam`}>
      <a href="#jadwal" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Lewati ke jadwal
      </a>

      {/* Hero: the crest's yellow sky running into its sea. */}
      <header className="bg-pantai">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-10 w-10" />
            <span className="font-display text-2xl font-black tracking-wide">{site.short}</span>
          </Link>
          <div className="flex items-center gap-1 text-sm font-medium sm:gap-6">
            <a href="#jadwal" className="hidden rounded px-2 py-1 hover:underline sm:inline">Jadwal</a>
            <a href="#pelatih" className="hidden rounded px-2 py-1 hover:underline sm:inline">Pelatih</a>
            <a href="#galeri" className="hidden rounded px-2 py-1 hover:underline sm:inline">Galeri</a>
            <Link
              href="/login"
              className="rounded-full bg-laut-dalam px-5 py-2 font-bold text-white transition-colors hover:bg-laut focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laut-dalam"
            >
              Masuk
            </Link>
          </div>
        </nav>

        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-6 pt-6 sm:px-6 md:grid-cols-[1.3fr_1fr] md:pt-12">
          <div>
            <h1 className="font-display text-[clamp(3.5rem,11vw,8.5rem)] font-black uppercase leading-[0.85] tracking-tight">
              Akademi Futsal Kota Cirebon
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed">{site.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#jadwal"
                className="rounded-full bg-udang px-6 py-3 font-bold text-white transition-colors hover:bg-udang-tua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laut-dalam"
              >
                Lihat jadwal latihan
              </a>
              <Link
                href="/login"
                className="rounded-full border-2 border-laut-dalam px-6 py-3 font-bold transition-colors hover:bg-laut-dalam hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laut-dalam"
              >
                Masuk ke akun siswa
              </Link>
            </div>
          </div>
          <img
            src="/logo.png"
            alt="Lambang Futsal Kota Cirebon: dua udang di atas ombak dengan bola bermotif mega mendung"
            className="mx-auto w-56 drop-shadow-[0_12px_0_rgba(8,58,99,0.18)] sm:w-72 md:w-full md:max-w-md"
          />
        </div>
        <Waves />
      </header>

      <main>
        {/* Timetable: the information parents look for first. */}
        <section id="jadwal" className="scroll-mt-4 bg-laut-dalam pb-20 pt-6 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-5xl font-black uppercase sm:text-6xl">Jadwal latihan</h2>
            <p className="mt-3 max-w-[40rem] text-white/80">{site.about[0]}</p>

            {classes.length === 0 ? (
              <p className="mt-10 rounded-lg border border-white/20 p-6 text-white/80">
                Jadwal latihan sedang disusun. Hubungi pengurus AFKC untuk informasi kelas.
              </p>
            ) : (
              <ol className="mt-10 grid gap-px overflow-hidden rounded-lg bg-white/15 sm:grid-cols-2 lg:grid-cols-7">
                {sessions.map((d) => (
                  <li key={d.dow} className="bg-laut-dalam p-4 lg:min-h-[13rem]">
                    <h3 className={`font-display text-2xl font-bold uppercase ${d.items.length ? 'text-pantai' : 'text-white/40'}`}>{d.name}</h3>
                    {d.items.length === 0 ? (
                      <p className="mt-2 text-sm text-white/40">Tidak ada latihan</p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {d.items.map((s) => (
                          <li key={`${s.cls}-${s.start_time}`} className="border-l-4 border-laut pl-3">
                            <p className="text-sm tabular-nums text-white/70">
                              {s.start_time}–{s.end_time}
                            </p>
                            <p className="font-bold">Kelas {s.cls}</p>
                            {s.coach && <p className="text-sm text-white/70">Pelatih {s.coach}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section id="pelatih" className="scroll-mt-4 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-5xl font-black uppercase sm:text-6xl">Pelatih</h2>
            <p className="mt-3 max-w-[40rem] text-laut-dalam/75">Setiap kelas punya pelatih tetap yang mendampingi siswanya sepanjang musim.</p>
            {coaches.length === 0 ? (
              <p className="mt-10 text-laut-dalam/75">Daftar pelatih akan segera ditampilkan.</p>
            ) : (
              <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {coaches.map((c, i) => (
                  <li key={`${c.name}-${i}`} className="flex items-start gap-4">
                    <span
                      aria-hidden
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-display text-2xl font-black text-white ${DISC[i % DISC.length]}`}
                    >
                      {initials(c.name)}
                    </span>
                    <div>
                      <p className="text-lg font-bold leading-tight">{c.name}</p>
                      {c.nickname && c.nickname !== c.name && <p className="text-laut-dalam/70">Coach {c.nickname}</p>}
                      <p className="mt-1 text-sm text-laut-dalam/70">
                        {c.classes.length ? `Melatih kelas ${c.classes.join(', ')}` : 'Pelatih pendamping'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section id="galeri" className="scroll-mt-4 bg-laut-muda py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-5xl font-black uppercase sm:text-6xl">Galeri</h2>
            {site.gallery.length === 0 ? (
              <p className="mt-3 max-w-[40rem] text-laut-dalam/75">Foto latihan dan pertandingan AFKC akan ditampilkan di sini.</p>
            ) : (
              <ul className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
                {site.gallery.map((g) => (
                  <li key={g.src} className="mb-4 break-inside-avoid">
                    <figure>
                      <img src={g.src} alt={g.alt} loading="lazy" className="w-full rounded-lg" />
                      <figcaption className="mt-2 text-sm text-laut-dalam/75">{g.alt}</figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="bg-pantai py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-4xl font-black uppercase sm:text-5xl">Sudah jadi siswa AFKC?</h2>
              <p className="mt-2 max-w-[36rem]">{site.about[1]}</p>
            </div>
            <Link
              href="/login"
              className="shrink-0 rounded-full bg-udang px-8 py-4 font-bold text-white transition-colors hover:bg-udang-tua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laut-dalam"
            >
              Masuk ke akun
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-laut-dalam py-10 text-white/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-start md:justify-between">
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

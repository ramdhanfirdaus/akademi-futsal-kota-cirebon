# AFKC — Sistem Akademi Futsal Kota Cirebon

Aplikasi manajemen siswa, pelatih, kelas & jadwal, absensi, iuran bulanan, dan bulan libur.
Satu project **Next.js** (tampilan + API sekaligus) dengan database **PostgreSQL**.

- Tampilan: `app/app/*` (halaman), `components/`, `services/` (pemanggil API)
- API: `app/api/**/route.ts` → logika di `server/services/*.ts`
- Skema database: `server/db/schema.ts`, migrasi di `drizzle/`
- Test: `tests/` (berjalan dengan Postgres in-memory, tidak butuh database)

## Prasyarat

- Node.js 22
- PostgreSQL (lokal) atau akun [Neon](https://neon.tech) (gratis)

## Menjalankan di komputer sendiri

```bash
npm install
cp .env.example .env        # lalu isi DATABASE_URL, JWT_SECRET, SEED_ADMIN_*
npm run db:migrate          # membuat tabel
npm run db:seed -- --demo   # akun admin + data contoh (pelatih fathur01, kelas, 3 siswa)
npm run dev                 # buka http://localhost:3000
```

Password semua akun contoh (`--demo`): `afkc2026`. Tanpa `--demo`, hanya akun admin yang dibuat.

Membuat `JWT_SECRET` acak:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Perintah lain: `npm test` (semua test), `npm run typecheck`, `npm run build`.

## Deploy gratis: Netlify + Neon

Ikuti **[DEPLOY.md](DEPLOY.md)**: langkah lengkap deploy dengan Netlify CLI (tanpa GitHub) dan database Neon,
termasuk cara rilis versi baru, membatalkan rilis, batas paket gratis, dan solusi masalah umum.

Alternatif lewat GitHub: push folder ini ke repository **private**, lalu di Netlify pilih **Add new project →
Import an existing project**. Isi `DATABASE_URL` (pooled) dan `JWT_SECRET` di **Site configuration →
Environment variables**. Setiap push ke branch utama menjadi deploy production (15 kredit). Sebelum push,
pastikan `.env.example` tidak berisi password asli.

## Pindah hosting
Kode tidak memakai fitur khusus Netlify. Untuk pindah (mis. ke Vercel atau Cloudflare), cukup set
`DATABASE_URL` dan `JWT_SECRET` di host baru. Catatan: paket gratis Vercel (Hobby) hanya untuk pemakaian
non-komersial.

## Peran pengguna
| Peran | Akses |
|---|---|
| ADMIN | semua menu, termasuk kelola pelatih |
| COACH | siswa, kelas, absensi, pembayaran, bulan libur; hanya bisa mengubah akun pelatihnya sendiri |
| STUDENT | dashboard pribadi (kelas, kehadiran & status iuran bulan ini), nilai semester + sertifikat, dan profil |

Semua pengguna bisa mengganti password sendiri di menu **My Profile**. Setelah password diganti (atau di-reset
oleh admin/pelatih), semua sesi login di perangkat lain otomatis keluar.
Menghapus siswa/pelatih menonaktifkan akunnya (data riwayat absensi & pembayaran tetap tersimpan).

## Penilaian semester & sertifikat
Menu **Penilaian** (admin & pelatih) untuk raport semester. Nilai per aspek hanya **Cukup / Baik / Sangat Baik**
(tanpa nilai akhir atau rata-rata). Ada dua jalur: **Pemain** dan **Kiper**. Siswa berposisi Kiper hanya
dinilai sebagai kiper; posisi lain (termasuk belum ditentukan) sebagai pemain; pemain yang "ikut latihan kiper"
mendapat keduanya (dua sertifikat).

Alur tiap semester:
1. **Admin: Buat semester** — nama bebas (mis. "2026 Semester 1") dan format nomor yang memuat `{urut}`,
   mis. `{urut}/S.FKC/XII/2025` → `004/S.FKC/XII/2025`. Aspek disalin dari semester sebelumnya.
2. **Admin: tab Aspek** — tambah/ubah/urutkan aspek Pemain dan Kiper.
3. **Admin: tab Template** — unggah desain sertifikat (PNG/JPG, maks. 4 MB, ekspor A4 dari Word/Canva dengan
   tempat kosong untuk nama/nomor/nilai), centang isian lalu geser kotaknya ke posisinya, **Pratinjau PDF**.
4. **Admin & pelatih: tab Nilai** — pilih kelas dan jalur, isi nilai di tabel, atau lewat Excel (unduh template
   nilai → isi → unggah; satu baris salah = tidak ada yang disimpan; sel kosong = tidak diubah).
5. **Admin: tab Hasil & Terbitkan** — lihat siapa yang belum lengkap, lalu **Terbitkan**. Penilaian lengkap
   mendapat nomor urut (nama A–Z, satu urutan untuk Pemain & Kiper, Pemain dulu). Nomor tidak pernah berubah.
   **Unduh semua (ZIP)** membuat semua PDF di browser admin.

Setelah terbit, siswa melihat nilainya di menu **Nilai** dan bisa mengunduh sertifikat PDF. Nilai terkunci
sampai admin **Batalkan terbit**; setelah diperbaiki dan diterbitkan lagi, nomor lama tetap dan yang baru lengkap
mendapat nomor berikutnya. PDF dibuat saat diunduh (tidak disimpan), jadi hanya gambar template yang memakai
penyimpanan database.

## Halaman depan (landing page)
Halaman `/` menampilkan profil AFKC, jadwal latihan, dan daftar pelatih. Jadwal dan pelatih diambil otomatis
dari database (hanya nama, kelas, dan jam latihan, tanpa username atau data siswa) dan diperbarui paling lambat
10 menit setelah ada perubahan.

**Profil pelatih** (foto, pengalaman, sertifikasi) diisi admin di menu **Coaches → Edit**. Foto otomatis
diperkecil di browser (±600 px, maks. 500 KB) dan disimpan di database, jadi tidak perlu layanan penyimpanan
file terpisah.

Teks, kontak, dan galeri diatur di `content/site.ts`:
- **Galeri:** cara termudah lewat menu admin **Galeri** (unggah beberapa foto sekaligus, beri keterangan,
  hapus). Foto diperkecil otomatis (±1600 px, maks. 1 MB) dan langsung tampil di halaman depan. Alternatif untuk
  foto tetap: taruh di `public/gallery/` lalu daftarkan di `gallery`, mis.
  `{ src: '/gallery/latihan-sabtu.jpg', alt: 'Latihan kelas B1 hari Sabtu' }`.
- **Kontak:** isi `address`, `whatsapp` (format `62812...`), dan `instagram`; yang kosong tidak ditampilkan.

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

### 1. Database (Neon)
1. Daftar di <https://neon.tech>, buat project baru (region **Singapore** paling dekat).
2. Di *Connection Details*, pilih **Pooled connection** dan salin connection string-nya
   (host-nya mengandung `-pooler`, diakhiri `?sslmode=require`).

### 2. Buat tabel & akun admin (dari komputer sendiri, sekali saja)
Isi `.env` sementara dengan `DATABASE_URL` dari Neon, lalu:

```bash
npm run db:migrate
npm run db:seed             # tanpa --demo untuk production
```

### 3. Aplikasi (Netlify)
1. Push folder ini ke repository GitHub.
2. Di <https://app.netlify.com> → **Add new project → Import an existing project** → pilih repo.
   Netlify mendeteksi Next.js otomatis (build `npm run build`, publish `.next`, sudah diatur di `netlify.toml`).
3. **Site configuration → Environment variables**, tambahkan:
   - `DATABASE_URL` = connection string pooled dari Neon
   - `JWT_SECRET` = string acak panjang (jangan sama dengan yang di lokal)
4. **Deploy**. Setelah selesai, buka URL Netlify dan login dengan akun admin dari langkah 2.

### Batas paket gratis Netlify (perlu diperhatikan)
- Kuota **300 kredit/bulan**. Setiap **deploy production memakai 15 kredit**; deploy preview/branch gratis.
  Pemakaian harian akademi kira-kira 50–80 kredit/bulan, jadi masih cukup untuk ±15 kali deploy per bulan.
- Jika kredit habis, situs **di-pause** sampai bulan berikutnya (tidak ada tagihan).
- Cek sisa kredit di dashboard Netlify → **Usage**.
- Tips: kumpulkan perubahan, lalu deploy sekaligus; uji coba lewat deploy preview.

### Neon (gratis)
- Database "tidur" saat tidak dipakai; permintaan pertama setelah lama tidak dipakai bisa ±1 detik lebih lambat.

## Pindah hosting
Kode tidak memakai fitur khusus Netlify. Untuk pindah (mis. ke Vercel atau Cloudflare), cukup set
`DATABASE_URL` dan `JWT_SECRET` di host baru. Catatan: paket gratis Vercel (Hobby) hanya untuk pemakaian
non-komersial.

## Peran pengguna
| Peran | Akses |
|---|---|
| ADMIN | semua menu, termasuk kelola pelatih |
| COACH | siswa, kelas, absensi, pembayaran, bulan libur; hanya bisa mengubah akun pelatihnya sendiri |
| STUDENT | dashboard pribadi (kelas, kehadiran & status iuran bulan ini) dan profil |

Semua pengguna bisa mengganti password sendiri di menu **My Profile**.
Menghapus siswa/pelatih menonaktifkan akunnya (data riwayat absensi & pembayaran tetap tersimpan).

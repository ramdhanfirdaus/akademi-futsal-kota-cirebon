# Panduan deploy: Netlify CLI + Neon

Panduan ini men-deploy AFKC **tanpa GitHub**. Aplikasi dibangun di komputer Anda lalu diunggah ke Netlify
dengan Netlify CLI. Database-nya PostgreSQL di Neon. Keduanya gratis.

Perintah ditulis untuk **PowerShell di Windows** dan dijalankan dari folder `afkc`.

| Yang dibutuhkan | Keterangan |
|---|---|
| Node.js 22 | sudah terpasang kalau `npm run dev` jalan |
| Akun Neon | daftar gratis di <https://neon.tech> |
| Akun Netlify | daftar gratis di <https://app.netlify.com> |

Ada dua alamat database dari Neon yang dipakai di panduan ini:

- **Direct connection**: host **tanpa** `-pooler`. Dipakai dari komputer Anda untuk membuat tabel
  (migrasi) dan akun admin (seed).
- **Pooled connection**: host **dengan** `-pooler`. Dipakai aplikasi di Netlify.

---

## Bagian A: Persiapan (sekali saja)

### A1. Buat database di Neon

1. Masuk ke <https://console.neon.tech> lalu klik **New Project**.
2. Isi nama, misalnya `afkc`, dan pilih Postgres versi terbaru.
3. **Region: pilih AWS US East 2 (Ohio).** Fungsi Netlify berjalan di US East (Ohio) secara default.
   Server dan database yang berdekatan membuat aplikasi lebih cepat, walaupun pengguna ada di Cirebon.
4. Klik **Create project**.
5. Buka **Dashboard → Connect**, lalu salin dua connection string:
   - Matikan **Connection pooling** dan salin hasilnya. Ini **direct URL** (host tanpa `-pooler`).
   - Nyalakan **Connection pooling** dan salin hasilnya. Ini **pooled URL** (host mengandung `-pooler`).

   Keduanya diakhiri `?sslmode=require`. Simpan sementara di tempat aman, misalnya password manager.
   **Jangan** simpan di file yang masuk git.

### A2. Buat tabel dan akun admin di Neon

Jalankan dari folder `afkc`. Variabel yang diset di terminal **mengalahkan** isi `.env`, jadi file `.env`
lokal Anda tidak perlu diubah.

```powershell
$env:DATABASE_URL = "postgresql://...DIRECT-URL...?sslmode=require"
npm run db:migrate
```

Hasil yang diharapkan: `migrations applied successfully!`

Sekarang buat akun admin production. Pakai password yang kuat dan **berbeda** dari password lokal:

```powershell
$env:SEED_ADMIN_USERNAME = "admin"
$env:SEED_ADMIN_PASSWORD = "isi-password-admin-yang-kuat"
npm run db:seed
```

> Jangan memakai `--demo` di production. Opsi itu membuat akun contoh dengan password `afkc2026`.

Setelah selesai, hapus variabel tadi dari terminal:

```powershell
Remove-Item Env:DATABASE_URL, Env:SEED_ADMIN_USERNAME, Env:SEED_ADMIN_PASSWORD
```

### A3. Pasang Netlify CLI dan login

```powershell
npm install -g netlify-cli
netlify login
```

`netlify login` membuka browser. Klik **Authorize**, lalu kembali ke terminal.

### A4. Buat site di Netlify dan hubungkan ke folder ini

```powershell
netlify sites:create --name afkc-cirebon
```

- Nama menjadi alamat situs, misalnya `https://afkc-cirebon.netlify.app`. Kalau nama sudah dipakai orang
  lain, pilih nama lain.
- Perintah ini membuat folder `.netlify` yang menghubungkan folder ini ke site tersebut. Folder itu sudah
  diabaikan git.
- Cek hasilnya dengan `netlify status`.

### A5. Isi variabel environment di Netlify

Buat `JWT_SECRET` baru khusus production (minimal 32 karakter, aplikasi menolak yang lebih pendek):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Masukkan ke Netlify bersama **pooled URL** dari Neon:

```powershell
netlify env:set DATABASE_URL "postgresql://...POOLED-URL-dengan--pooler...?sslmode=require" --secret
netlify env:set JWT_SECRET "hasil-perintah-di-atas" --secret
netlify env:list
```

`--secret` membuat nilainya tidak bisa dibaca lagi di dashboard. Kalau perlu mengganti nilainya, jalankan
ulang `env:set`.

---

## Bagian B: Deploy

### B1. Coba dulu sebagai draft (tidak memakai kredit production)

```powershell
netlify deploy
```

CLI membangun aplikasi di komputer Anda, lalu mengunggahnya ke **URL draft**, misalnya
`https://abc123--afkc-cirebon.netlify.app`. Buka URL itu dan periksa:

- [ ] Halaman depan tampil, termasuk jadwal dan pelatih (masih kosong kalau belum ada data).
- [ ] `/login` bisa dipakai login dengan akun admin dari langkah A2.
- [ ] Menu admin terbuka tanpa pesan error.

### B2. Rilis ke production

Kalau draft sudah benar:

```powershell
netlify deploy --prod
```

Situs aktif di `https://afkc-cirebon.netlify.app`.

> **Kalau build di komputer gagal** (biasanya karena masalah khusus Windows), bangun di server Netlify saja:
> `netlify deploy --remote --prod`. Hasilnya sama, hanya proses build-nya berjalan di Netlify.

### B3. Setelah rilis pertama

1. Login sebagai admin dan buat **akun pelatih** di menu Pelatih.
2. Buat **kelas dan jadwal** di menu Kelas.
3. Tambahkan **siswa** di menu Siswa. Atur **Mulai Iuran** bila perlu.
4. Isi **foto pelatih** (Pelatih → Edit) dan **Galeri**.
5. Isi teks kontak dan alamat di `content/site.ts`, lalu deploy ulang (lihat Bagian C).

---

## Bagian C: Rilis versi baru

Setiap kali ada perubahan kode:

1. **Kalau ada file migrasi baru** di folder `drizzle/`, jalankan dulu migrasinya ke Neon. Selalu
   lakukan **sebelum** deploy, karena versi baru aplikasi membutuhkan tabel atau kolom barunya:

   ```powershell
   $env:DATABASE_URL = "postgresql://...DIRECT-URL..."
   npm run db:migrate
   Remove-Item Env:DATABASE_URL
   ```

   Menjalankan `db:migrate` saat tidak ada migrasi baru tidak apa-apa. Perintah itu tidak mengubah
   apa pun.

2. Pastikan test lolos: `npm test`
3. Coba dulu sebagai draft dengan `netlify deploy`, lalu rilis dengan `netlify deploy --prod`.

**Membatalkan rilis:** buka <https://app.netlify.com> → site **afkc-cirebon** → **Deploys**, pilih deploy
lama yang masih baik, lalu klik **Publish deploy**. Database tidak ikut dikembalikan. Itu sebabnya
migrasi di AFKC selalu dibuat aman untuk versi lama, yaitu hanya menambah tabel atau kolom.

---

## Batas paket gratis

**Netlify:**
- 300 kredit per bulan. Satu deploy **production** memakai 15 kredit. Deploy draft (`netlify deploy` tanpa
  `--prod`) tidak memakai kredit production.
- Pemakaian harian akademi kecil, tapi tetap **kumpulkan beberapa perubahan, lalu rilis sekaligus**.
- Kalau kredit habis, situs **di-pause** sampai bulan berikutnya. Tidak ada tagihan otomatis.
- Sisa kredit bisa dilihat di dashboard Netlify → **Usage**.

**Neon:**
- Penyimpanan 0,5 GB. Foto pelatih dan galeri disimpan di database, jadi unggah foto pilihan saja.
- Database "tidur" kalau tidak dipakai beberapa menit. Akses pertama setelahnya bisa ±1 detik lebih lambat.

---

## Masalah yang sering terjadi

| Gejala | Penyebab dan solusi |
|---|---|
| Halaman error 500 setelah deploy | `DATABASE_URL` atau `JWT_SECRET` belum diset. Cek dengan `netlify env:list`, lalu deploy ulang. |
| `JWT_SECRET must be at least 32 characters` | Secret terlalu pendek. Buat ulang dengan perintah di A5. |
| Login gagal terus | Akun admin belum dibuat di Neon (ulangi A2), atau passwordnya lupa. Seed **tidak** mengganti password admin yang sudah ada. Kalau lupa, jalankan A2 lagi dengan `SEED_ADMIN_USERNAME` yang baru (misalnya `admin2`) untuk membuat admin baru. |
| Error tabel/kolom tidak ada (`relation ... does not exist`) | Migrasi belum dijalankan ke Neon. Ulangi langkah C1. |
| Aplikasi lambat | Region Neon tidak sama dengan region fungsi Netlify. Cek di Netlify: **Project configuration → Build & deploy → Functions region**. |
| `netlify: command not found` | Netlify CLI belum terpasang. Ulangi A3, lalu buka terminal baru. |

---

## Keamanan

- Jangan commit `.env`, connection string Neon, `JWT_SECRET`, atau password admin. Simpan di password
  manager.
- `JWT_SECRET` production harus berbeda dari yang lokal. Menggantinya membuat semua pengguna harus login
  ulang.
- Begitu situs aktif, minta semua pelatih dan siswa mengganti password default lewat **Profil Saya**.

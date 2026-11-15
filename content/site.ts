/**
 * Editable content for the public landing page.
 * Contact fields left as null are simply not shown.
 */
export const site = {
  name: 'Akademi Futsal Kota Cirebon',
  short: 'AFKC',
  intro:
    'Tempat anak dan remaja Cirebon belajar futsal lewat latihan rutin setiap minggu, dari kelas dasar sampai kelas kiper.',
  about: [
    'Setiap siswa masuk ke satu kelas sesuai usia dan kemampuannya, lalu berlatih di hari dan jam yang tetap bersama pelatih kelasnya.',
    'Orang tua dan siswa bisa masuk ke akun AFKC untuk melihat kehadiran latihan dan status iuran bulanan.',
  ],
  contact: {
    address: null as string | null, // contoh: 'GOR ..., Jl. ..., Kota Cirebon'
    whatsapp: null as string | null, // contoh: '6281234567890'
    instagram: null as string | null, // contoh: 'afkc.cirebon'
  },
  /**
   * Gallery photos: put the files in `public/gallery/` and list them here, e.g.
   * { src: '/gallery/latihan-sabtu.jpg', alt: 'Latihan kelas B1 hari Sabtu' }
   */
  gallery: [] as { src: string; alt: string }[],
};

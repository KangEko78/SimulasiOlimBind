# Ruang Bahasa — Simulasi CBT Olimpiade

Aplikasi latihan CBT Bahasa Indonesia untuk siswa SMP/MTs. Materi disusun hanya dari empat cakupan pada bagian Olimpiade Bahasa di Juknis Bulan Bahasa 2026: ejaan, tata kalimat, tanda baca, dan kata baku/tidak baku.

`index.html` adalah berkas mandiri dengan CSS dan JavaScript tertanam. Berkas ini dapat dibuka langsung di browser atau dipasang sebagai proyek statis. `src/` menyimpan salinan sumber untuk pengembangan.

## Menjalankan secara lokal

1. Pasang Node.js LTS.
2. Buka terminal di folder proyek ini.
3. Jalankan `npm install`, lalu `npm run dev`.
4. Buka alamat lokal yang ditampilkan Vite.

## Deploy ke Vercel

1. Unggah folder proyek ke repositori Git atau impor proyek dari repositori tersebut di Vercel.
2. Gunakan framework preset **Vite**. Build command: `npm run build`; output directory: `dist`.
3. Deploy. Tidak diperlukan environment variable atau layanan backend.

## Fitur

- Dua tingkat latihan pada halaman yang sama: Level 1 berisi 30 soal; Level 2 berisi 30 soal berbasis konteks literasi yang lebih panjang dan penyuntingan kontekstual. Masing-masing level memiliki timer, sesi tersimpan, skor, analisis, dan ulasan tersendiri.
- Distribusi Level 1: 7 ejaan, 7 tata kalimat, 8 tanda baca, dan 8 kata baku/tidak baku. Distribusi Level 2: 8 ejaan, 7 tata kalimat, 8 tanda baca, dan 7 kata baku/tidak baku.
- Ilustrasi papan pengumuman hasil generate AI tersedia lokal dan dipakai pada soal visual. Teks pengumuman ditumpangkan sebagai HTML agar ejaan pada stimulus tetap akurat; tidak ada layanan gambar eksternal.
- Lambang SMP Negeri 2 Kalibaru pada halaman awal, dengan ukuran responsif dan teks alternatif; aset berada di `assets/` untuk HTML mandiri serta `public/assets/` untuk Vercel.
- Timer simulasi 45 menit (Level 1) dan 60 menit (Level 2), navigasi nomor, serta simpan otomatis jawaban dan waktu per level di `localStorage`.
- Skor, jumlah terjawab/tepat/perlu ditinjau, peta penguasaan empat kategori, kesimpulan latihan, rekomendasi belajar per kategori, dan ulasan setiap soal yang menampilkan pilihan peserta, kunci, serta alasan.
- Layout responsif untuk ponsel dan desktop.

Kaidah tanda baca ditinjau mengacu pada [EYD V](https://ejaan.kemendikdasmen.go.id/eyd/), termasuk penggunaan koma, titik dua, titik koma, dan tanda petik. Bentuk kata baku mengacu pada [KBBI Daring](https://kbbi.kemdikbud.go.id/).

Jawaban tersimpan di browser/perangkat yang digunakan dan tidak dikirim ke server. Hasil tiap level dinilai secara terpisah. Penilaian kesiapan adalah interpretasi latihan mandiri, bukan sertifikasi, hasil resmi, atau jaminan lolos babak lomba.

## Struktur

```
ruang-bahasa-cbt/
├── index.html
├── package.json
├── vercel.json
├── assets/
│   ├── school-notice.png
│   └── logo-smpn2-kalibaru.png
├── public/assets/
│   ├── school-notice.png
│   └── logo-smpn2-kalibaru.png
└── src/
    ├── main.js
    └── style.css
```

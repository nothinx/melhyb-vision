# Perombakan MELHYB-VISION

Perubahan diterapkan pada 4 Oktober 2026 berdasarkan arahan modern,
minimalis, glass style, rapi, dan bahasa Indonesia yang lebih natural.

## Hasil

- Navigasi kaca buram dengan tujuan utama Ringkasan, Analisis, Riwayat, dan
  Katalog. Halaman rujukan tetap tersedia dalam menu Referensi. Menu ponsel
  mendukung Escape dan menutup saat pengguna memilih halaman.
- Judul halaman memakai komponen bersama; rute dipisahkan dari berkas masuk
  aplikasi. Status koneksi memakai langganan bersama sehingga perubahan mode
  tercermin pada komponen yang membutuhkannya.
- Ringkasan memakai contoh kontur citra sintetis yang berlabel. Pustaka 3D
  dimuat pada halaman Studi benih melon, bukan pada kunjungan ke beranda.
- Formulir analisis memisahkan pemilihan komoditas dan penambahan foto.
  Pratinjau memiliki batas tinggi. Pemilihan ulang berkas yang sama didukung,
  dan URL foto sementara dibersihkan ketika diganti atau halaman ditutup.
- Mode demo menjelaskan bahwa foto unggahan belum dianalisis. Tombol pada
  pratinjau demo berbunyi Lihat contoh hasil.
- Riwayat memiliki pencarian nomor lot atau komoditas, filter komoditas,
  serta akses rincian lewat alamat `#/riwayat?lot=17`. Kelas mutu tetap
  tersedia pada tampilan ponsel.
- Kalibrasi memiliki pilihan komoditas. Syarat minimum dibaca dari API metode;
  metrik dan kesiapan model ditampilkan terpisah dari hasil estimasi.
- Standar, Katalog, dan Metode memakai pengantar yang berfokus pada pengguna.
  Konfigurasi server serta struktur basis data tersedia dalam rincian teknis.
- Bahasa hasil, penjelasan indeks, pesan penolakan foto, serta catatan ambang
  diperbaiki pada frontend, backend, dan data demo.
- Angka memakai format Indonesia dan langsung menampilkan nilai akhirnya.
  Meter fisik memiliki label aksesibel dan lebar yang tidak bergantung animasi.
  Warna lencana kelas mengikuti kelas yang diterima dari API.
- Efek kaca dipakai pada navigasi dan panel pembuka. Panel data memakai
  permukaan lebih padat. Tema terang dan gelap mengikuti token bersama.
- Batas waktu pemeriksaan server selalu dibersihkan; pesan galat JSON dari
  API dibaca sebagai pesan, bukan ditampilkan sebagai JSON mentah.

## Verifikasi otomatis

| Pemeriksaan | Hasil |
|---|---|
| Lint frontend | Lolos tanpa peringatan |
| Kontras terang, gelap, dan kaca | 60 pasangan lolos WCAG AA |
| Pemeriksaan lapisan API frontend | 4 uji lolos |
| Render halaman dan batas informasi | 17 uji lolos |
| Backend, dari direktori backend | 48 uji lolos |
| Build produksi | Lolos |
| Build HTML tunggal | Lolos |

Pemeriksaan render mencakup delapan halaman, kerangka navigasi, rincian lot,
kondisi kosong/muat/galat, penandaan demo, label meter dan rentang estimasi,
serta peringatan ekstrapolasi. Uji backend memakai citra sintetis dan memeriksa
aturan kalibrasi, ambang edar, serta pipeline yang sudah ada.

## Batas verifikasi

Browser otomatis tidak tersedia pada sesi ini. Pembukaan melalui penyedia
in-app browser dan Chrome sama-sama mengembalikan Browser is not available.
Karena itu tidak ada klaim bahwa tampilan telah diperiksa melalui screenshot
atau seluruh kontrol telah diklik di browser.

| Interaksi | Pemeriksaan yang dilakukan |
|---|---|
| Navigasi utama dan Referensi | Render tujuan tautan, pemeriksaan kode penutup menu |
| Menu ponsel dan tema | Pemeriksaan CSS breakpoint, event Escape, state tema, dan kontras kedua tema |
| Pilih foto, seret foto, ganti foto | Pemeriksaan kode validasi, reset input, dan pembersihan URL |
| Kamera | Pemeriksaan kode izin, penghentian stream, serta penanganan kegagalan; kamera fisik belum diuji |
| Pencarian dan filter riwayat | Pemeriksaan kode penyaringan, serta render keadaan kosong dan rincian lot |
| Pilihan komoditas kalibrasi | Pemeriksaan kode pilihan dan render metrik/status, termasuk model kosong |
| Grafik/tabel, rincian teknis, dan 3D | Pemeriksaan kode kontrol; render halaman diuji, interaksi visual belum diuji |

Backend mengeluarkan dua peringatan deprecation dari dependensi pengujian.
Build produksi memberi peringatan bundel halaman melon yang memuat Three.js.
Halaman tersebut dimuat terpisah dari beranda. Tidak ada dependensi baru.

## Aturan ilmiah

Bobot, ambang numerik, urutan fitur, dan kelayakan prediksi tidak diubah.
Estimasi fisiologis tetap memerlukan minimal 30 sampel dan R² ≥ 0,30 sesuai
konfigurasi bawaan. Ekstrapolasi tetap tidak digunakan untuk menentukan kelas.
Ambang dari isian operator tetap berstatus diisi operator. Kolom contoh pada
katalog tidak dijadikan sumber ambang.

Hasil build tersedia di `frontend/dist/` dan
`frontend/dist-tunggal/index.html`. Pratinjau pengembangan dijalankan pada
`http://127.0.0.1:5173/`.

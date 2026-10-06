# Rencana perombakan SIGMA Benih

## Cakupan

Permintaan: refactor dan redesign seluruh website, termasuk bahasa antarmuka
yang lebih natural. Audit awal dilakukan pada 4 Oktober 2026. Dokumen ini
berisi temuan dan usulan pada tahap audit awal. Implementasi telah diterapkan
dengan arahan modern, minimalis, glass style, dan bahasa yang lebih natural.
Hasil serta batas verifikasi tercatat di `LAPORAN-PEROMBAKAN.md`.

## Temuan awal

1. **Bahasa belum konsisten dengan kebutuhan pengguna.** Beberapa halaman
   memakai nada proposal atau catatan pengembang. Contohnya, Kalibrasi meminta
   pengguna menyelesaikan sorgum lebih dulu, Standar membahas cara menghadapi
   penguji, dan Metodologi menampilkan alamat endpoint di pengantar utama.
   Petunjuk pengguna perlu berfokus pada tindakan, hasil, dan keterbatasan.
2. **Istilah teknis muncul sebelum dijelaskan.** IMF, UKDdP, morfometrik,
   pasangan berlabel, dan watershed memerlukan penjelasan singkat. Istilah
   teknis tetap tersedia pada rincian yang relevan.
3. **Hierarki halaman berulang tetapi belum dipusatkan.** Judul, pengantar,
   status muat, dan galat ditulis terpisah pada setiap rute. Komponen judul
   halaman bersama akan membantu menjaga konsistensi tanpa memaksakan satu
   tata letak untuk semua isi.
4. **Katalog mencampur informasi komoditas dan struktur basis data.** Daftar
   komoditas perlu menjadi isi utama. Struktur tabel dapat ditempatkan dalam
   rincian teknis agar pengguna cepat menemukan informasi benih.
5. **Navigasi menempatkan delapan tujuan pada tingkat yang sama.** Analisis
   dan Riwayat merupakan kegiatan utama. Kalibrasi, Standar, Katalog, Metode,
   dan Studi melon memerlukan pengelompokan yang lebih mudah dipindai.
6. **Kalibrasi berfokus pada sorgum.** Ringkasan menampilkan metrik sorgum
   meskipun ada model beberapa komoditas. Status per komoditas perlu lebih
   jelas tanpa menganggap model tertentu sudah layak.
7. **Teks dari API juga tampil pada layar.** Revisi bahasa perlu mencakup
   penjelasan indeks, alasan putusan, pesan penolakan foto, dan data demo.
   Perubahan JSX saja tidak cukup untuk menyamakan pengalaman.
8. **Beberapa klaim UI perlu dibuat lebih hati-hati.** Halaman galat
   menyatakan data tetap tersimpan meskipun komponen tidak memeriksa status
   penyimpanan. Label model "Dipakai" juga lebih kuat daripada informasi
   `siap_pakai` yang diterima.
9. **Animasi angka menampilkan nilai sementara.** Angka hasil pengujian perlu
   mudah dibaca sejak awal; gerakan sebaiknya membantu perpindahan dan umpan
   balik, bukan mengubah angka yang sedang dibaca.

## Usulan bahasa

| Lokasi | Teks saat ini | Usulan |
|---|---|---|
| Ringkasan | Mutu benih, berawal dari satu foto. | Analisis mutu fisik benih dari foto |
| Ringkasan | Setiap lot punya jejak pengukuran. | Ringkasan analisis |
| Analisis | Satu foto berisi satu lot | Analisis lot benih |
| Analisis | Yang diukur adalah sebaran antar benih di dalam lot… | Unggah foto satu lot berisi minimal 15 benih. SIGMA akan mengukur mutu fisik dan keseragaman benih dalam foto. |
| Analisis | Kamera / Berkas | Ambil foto / Pilih foto |
| Analisis | Konsistensi cara memotret adalah syarat agar morfometrik antar lot bisa dibandingkan sama sekali. | Gunakan pencahayaan dan posisi kamera yang sama agar hasil antar lot lebih mudah dibandingkan. |
| Hasil | Citra beranotasi | Foto dengan penanda benih |
| Hasil | Dibuang karena tepi | Benih terpotong di tepi foto |
| Hasil | Dipisah watershed | Benih berdempetan yang berhasil dipisahkan |
| Hasil | Parameter fisiologis | Estimasi perkecambahan dan vigor |
| Hasil | Angka fisiologis sengaja dikosongkan daripada ditebak. | Estimasi belum tersedia karena model belum tersedia atau belum lolos validasi. Lihat statusnya di halaman Kalibrasi. |
| Kalibrasi | Sebuah foto tidak memuat daya berkecambah | Status model kalibrasi |
| Kalibrasi | Minimal 30 pasangan berlabel | Minimal 30 lot dengan foto dan hasil uji perkecambahan |
| Kalibrasi | Dipakai / Belum | Siap digunakan / Belum siap |
| Kalibrasi | Selesaikan sorgum lebih dulu. | Kesiapan model diperiksa untuk setiap komoditas dan jenis estimasi. |
| Standar | Setiap angka membawa asal-usulnya | Ambang mutu dan sumber acuan |
| Standar | Gerbang aktif / Gerbang mati | Ambang digunakan / Ambang belum digunakan |
| Standar | rezim | Kelompok regulasi |
| Standar | Yang harus kalian ambil sendiri… | Dokumen acuan untuk memeriksa sumber dan nilai ambang. |
| Metodologi | Tidak ada angka tersembunyi | Cara penilaian mutu benih |
| Metodologi | Penguji tidak perlu percaya begitu saja… | Periksa bobot, ambang, dan syarat yang digunakan untuk menghitung hasil analisis. |
| Riwayat | Punya skor akhir | Lot dengan skor akhir |
| Galat | Ada yang gagal dimuat di halaman ini | Halaman tidak dapat dimuat |

Usulan ini merupakan draf penyuntingan, bukan penggantian istilah pada skema
API atau perubahan makna ilmiah. Kata "lot" tetap digunakan dan dijelaskan
saat pertama muncul. Angka fisiologis selalu disebut estimasi; nilai IMF
tidak boleh disebut daya berkecambah atau kelulusan sertifikasi.

## Urutan implementasi

1. Tetapkan arah visual dan waktu penerapan pemeriksaan antislop.
2. Rapikan kerangka aplikasi, navigasi, judul halaman, dan token desain.
3. Redesign Ringkasan, alur unggah, dan hasil analisis.
4. Terapkan sistem yang sama pada Riwayat, Kalibrasi, Standar, Katalog,
   Metodologi, Studi melon, dan halaman galat.
5. Revisi bahasa pada komponen bersama dan pesan API yang tampil pada UI.
6. Periksa mode demo, mode langsung, tema terang/gelap, ponsel, papan ketik,
   serta kondisi kosong, muat, dan galat.
7. Jalankan lint, pemeriksaan API, build biasa, build tunggal, dan pengujian
   backend dari direktori `backend/` jika backend ikut diubah.

## Batas perubahan

- Estimasi fisiologis tetap memerlukan minimal 30 sampel dan R² ≥ 0,30.
- Hasil ekstrapolasi tetap tidak ikut menentukan kelas mutu.
- Ambang hanya berasal dari sumber yang digunakan `standar.py`; status
  verifikasi dan isian operator tetap terlihat.
- Urutan `LotFeatures.vector()` dan format model tersimpan dipertahankan.
- Setiap fitur yang memakai endpoint memiliki penanganan mode demo.
- Bahasa identifier, komentar baru, dan antarmuka mengikuti `AGENTS.md`.
- Font tetap tersedia tanpa jaringan untuk build satu berkas.
- Gerakan mengikuti `prefers-reduced-motion` dan isi tetap terlihat tanpa
  menunggu animasi.

## Pemeriksaan kondisi awal

- `npm.cmd run lint`: lolos, dengan 11 peringatan React yang sudah ada.
- Pemeriksaan kontras: 52 pasangan lolos WCAG AA.
- `npm.cmd run periksa:api`: 4 pengujian lolos.
- `npm.cmd run build`: lolos setelah dijalankan dengan izin di luar sandbox;
  percobaan awal tertolak saat Vite membersihkan berkas dalam `dist/`.
- Build masih memberi peringatan ukuran bundel ilustrasi 3D (555 kB).
- Pengujian backend dan pemeriksaan visual browser belum dijalankan pada
  tahap audit awal ini.

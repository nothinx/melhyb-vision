# SIGMA: meja inspeksi benih

Untuk operator pengujian benih: memulai analisis lot, membaca mutu fisik,
dan mengetahui kapan estimasi belum dapat digunakan.

## Acuan penghargaan 2026

- [100 Lost Species](https://www.cssdesignawards.com/wotm/100-lost-species/49386/),
  CSS Design Awards Website of the Month Juli 2026. Acuan: spesimen menjadi
  pusat perhatian, nama objek dan informasi pendamping mendapat ruang sendiri.
- [The State of the Gallery](https://www.cssdesignawards.com/sites/the-state-of-the-gallery/50016/),
  CSS Design Awards Website of the Day 9 September 2026. Acuan: objek WebGL
  terhubung dengan informasi yang sedang dibaca.

Tanggal dan kategori diperiksa pada 11 September 2026. Gambar presentasi pada
halaman penghargaan diperiksa secara visual. Ini acuan komposisi, bukan aset
untuk disalin. Referensi sebelum 2026 tidak digunakan.

## Keputusan visual

- ENERGY 2 / RHYTHM 3 / MOTION 2.
- Warna: kertas blotter dan hijau laboratorium meneruskan identitas README;
  amber hanya untuk spesimen dan status estimasi.
- Tipografi: Fraunces untuk identitas botani, Archivo untuk kerja operator,
  IBM Plex Mono untuk angka. Font lokal tetap berfungsi tanpa jaringan.
- Pembuka: judul pendek, tindakan analisis, dan satu area spesimen. Grafik
  lengkap berada di Riwayat sehingga pembuka tidak menjadi tumpukan dashboard.
- Informasi: daftar lot dan kesiapan kalibrasi berbentuk baris yang dapat
  dipindai; kartu dipakai untuk mengelompokkan formulir atau hasil pengukuran.
- Permukaan: garis tipis membagi bagian, radius kecil, tanpa kilau pada setiap
  kartu. Ruang besar di pembuka, lebih padat pada tabel kerja.
- Three.js: ilustrasi benih melon, jelas berlabel ilustrasi, bukan rekonstruksi
  foto. Susunan dapat diubah untuk menjelaskan pemisahan objek per benih.
- anime.js: perpindahan susunan dan transisi singkat mengikuti tindakan pengguna;
  tidak ada putaran tanpa henti. Pengurangan gerak langsung ke keadaan akhir.
- Semua kontrol dapat dijangkau dengan papan ketik; area 3D memiliki alternatif
  statis jika WebGL tidak tersedia. Tema terang dan gelap memakai token bersama.

## Kejujuran informasi

Data contoh tidak menyamar sebagai hasil nyata. Nilai kosong tidak berubah
menjadi nol. Ambang edar berasal dari API Standar, bukan kolom contoh Katalog.
Estimasi tetap tunduk pada kalibrasi backend; tidak ada perubahan bobot,
ambang, atau urutan fitur model dalam pekerjaan desain ini.

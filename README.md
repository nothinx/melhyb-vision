# SIGMA

Penilaian mutu benih dari citra, dibangun ulang dengan satu aturan yang tidak
bisa ditawar: **angka yang tidak bisa dipertanggungjawabkan tidak ditampilkan.**

Aplikasi lama merata-ratakan tujuh parameter dengan bobot sama, dan melaporkan
daya berkecambah dari sebuah foto diam seolah-olah itu hasil pengukuran.
Versi ini memisahkan dua hal yang berbeda secara mendasar:

| | Terukur | Terestimasi |
|---|---|---|
| Asal | dihitung langsung dari piksel | diprediksi model dari morfologi |
| Contoh | keseragaman ukuran, keutuhan fisik, bebas cacat, keseragaman warna, tekstur | daya berkecambah, kecepatan tumbuh, keserempakan tumbuh |
| Bisa diverifikasi | ya, dari foto yang sama | hanya lewat uji perkecambahan |
| Ditampilkan saat belum ada model | ya | **tidak** |

Selama belum ada model yang lolos validasi terhadap hasil UKDdP untuk sebuah
komoditas, aplikasi ini menolak mengeluarkan angka daya berkecambah. Yang
dilaporkan hanya Indeks Mutu Fisik, beserta alasan mengapa sisanya kosong.

## Tumpukan teknologi

| Lapis | Pilihan | Alasan |
|---|---|---|
| Backend | FastAPI + Pydantic v2 | tipe ketat, dokumentasi API otomatis di `/docs` |
| Visi komputer | OpenCV + scikit-image | segmentasi instance, GLCM, deteksi penanda ArUco |
| Model | scikit-learn (RidgeCV) | cukup untuk puluhan sampel, dan bisa dipertanggungjawabkan |
| Basis data | SQLModel + SQLite / PostgreSQL | satu definisi untuk tabel dan skema API |
| Frontend | React 19 + TypeScript + Vite | dasar yang stabil, build cepat |
| Gaya | Tailwind CSS v4 | token semantik, mode terang & gelap dari satu sumber |
| Rute | React Router (hash) | hasil build bisa dibuka dari mana saja tanpa konfigurasi server |
| Data | TanStack Query | cache, status muat, dan mode demo di satu lapisan |
| Gerak halaman | Motion | transisi rute dan indikator tab |
| Gerak elemen | anime.js v4 | kanvas pembuka, angka yang naik dari nol, bar yang tumbuh, reveal berurutan |
| Grafik | Recharts | grafik paritas, tren, dan sebaran kelas |
| Ikon | Lucide | satu keluarga ikon di seluruh aplikasi |

### Identitas visual

Rujukannya dua benda nyata di meja pengujian benih, bukan aplikasi pertanian
generik: **kertas blotter** tempat benih dikecambahkan (hangat, sedikit
kehijauan, berbutir) untuk mode terang, dan **panel instrumen laboratorium**
(gelap, presisi, angka monospasi) untuk mode gelap. Aksennya viridian dengan
tunas sebagai warna kedua dan amber benih untuk besaran terestimasi.

Tipografi memakai tiga peran: **Fraunces** untuk judul (sumbu `opsz` tinggi
dan sedikit `WONK`, memberi kesan huruf cetak bungkus benih), **Archivo**
untuk antarmuka dan teks, **IBM Plex Mono** untuk angka dan label data.

Kanvas pembuka di halaman Ringkasan bukan hiasan: benih tersebar acak lalu
tertata rapi dan sebagian dilingkari kontur pengukuran — persis yang
dikerjakan aplikasi pada setiap foto. Seluruh gerakan hormat pada
`prefers-reduced-motion`, dan tidak ada satu pun elemen yang disembunyikan
lewat CSS: animasi hanya boleh menambah, sehingga isi halaman tetap terbaca
kalau JavaScript-nya gagal.

Palet grafiknya bukan pilihan selera: tiga warna deret divalidasi terhadap
simulasi buta warna (ΔE CVD terburuk 9,2 terang / 9,4 gelap) pada kedua latar,
setiap grafik punya legenda, label langsung, dan tampilan tabel sebagai
alternatif.

## Menjalankan

### Cara tercepat (Docker)

```bash
cd frontend && npm install && npm run build && cd ..
docker compose up --build
# buka http://localhost:8000
```

### Pengembangan lokal

```bash
./jalankan.sh          # Linux / macOS
.\jalankan.ps1         # Windows PowerShell
```

Backend di `http://localhost:8000` (dokumentasi API otomatis di `/docs`),
frontend di `http://localhost:5173`.

### Versi laporan: satu berkas HTML

```bash
cd frontend
npm run build:tunggal      # menghasilkan dist-tunggal/index.html
```

Berkas itu berisi seluruh aplikasi — kirim satu berkas, bisa dibuka langsung
dari disk tanpa server. Karena tidak ada backend yang bisa dihubungi, aplikasi
otomatis masuk **mode demo** dan mengatakannya lewat spanduk di atas layar,
memakai data contoh bawaan. Berguna untuk lampiran proposal, presentasi, atau
demo di komputer yang tidak menjalankan apa pun.

### Uji

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q                     # 43 uji, tanpa perlu foto asli
```

Berkas uji memakai citra benih sintetis yang dibangkitkan
`tests/make_fixture.py`, sehingga seluruh pipeline bisa diuji tanpa data
lapangan.

## Alur kerja yang sebenarnya

```
   foto lot                          lot yang sama ditanam
       │                                      │
       ▼                                      ▼
 gerbang kualitas citra              uji UKDdP 1-3 minggu
   (tolak buram / gelap /                     │
    kontras rendah / <15 benih)               │
       │                                      │
       ▼                                      ▼
 segmentasi tiap benih                DB = (A+B)/N x 100
 (watershed, buang tepi)              kecepatan & keserempakan
       │                                      │
       ▼                                      │
 morfometrik per benih                        │
 + agregasi lot (15 ciri)                     │
       │                                      │
       ├──────────────┬───────────────────────┘
       ▼              ▼
 indeks terukur   pasangan (ciri, hasil UKDdP)
 (5 indeks,             │
  bobot eksplisit)      ▼
       │          RidgeCV + validasi silang 5-lipat
       │                │
       │        n >= 30 dan R2 >= 0,30 ?
       │           ya │        │ tidak
       │              ▼        ▼
       │        estimasi   tidak ada estimasi
       │        + selang        │
       ▼              ▼         ▼
       └──────► putusan mutu ◄──┘
                     │
        gerbang ambang edar: batas bawah daya
        berkecambah di bawah ambang komoditas
        -> kelas terendah, apa pun nilai fisiknya
```

## Yang berubah dari prototipe lama

| Temuan | Perubahan |
|---|---|
| W-01 skor = rata-rata tak berbobot | Bobot eksplisit di `scoring/indices.py` dan `scoring/grading.py`, dapat dibaca lewat `GET /api/metodologi`. Daya berkecambah berbobot 0,55. |
| W-01 parameter kosmetik menolong lot buruk | Gerbang ambang edar: kalau batas bawah estimasi daya berkecambah di bawah ambang komoditas, kelas langsung "Tidak memenuhi ambang edar". |
| W-02 tiga nama merek | Satu nama, satu logo, satu palet di seluruh layar. |
| W-03 database varietas tidak ada | Tabel `Komoditas`, `Varietas`, `Batch`, `Analisis`, `UjiUKDdP`, `ModelKalibrasi` dengan relasi nyata; tab Katalog untuk mengelolanya. |
| W-04 badge platform | Tanpa ketergantungan platform; deploy sendiri lewat Docker. |
| W-05 cold start menutupi CTA | Satu proses, tanpa server tidur. |
| W-06 layout mobile rusak | Mobile-first, target sentuh 46px, navigasi bawah, nol luapan horizontal di lebar 360px. |
| W-07 tidak ada kamera | `getUserMedia` dengan kamera belakang, plus fallback `<input capture>`. |
| W-08 hasil tidak bisa ditelusuri | Citra beranotasi per benih, jumlah benih terdeteksi, selang prediksi, penjelasan tiap indeks, data mentah lot. |
| W-09/W-10 warna | Palet token tunggal, mode terang dan gelap, kontras terjaga. |
| W-11 bar Google Translate | `<html lang="id">`. |
| W-12 tidak ada penanganan kasus tepi | Gerbang kualitas citra dengan pesan yang bisa ditindaklanjuti; penolakan foto buram, gelap, kontras rendah, benih terlalu sedikit atau terlalu banyak. |
| W-13 dashboard kosong | Agregasi lebih dulu, empty state, konfirmasi hapus, ekspor CSV. |
| P-03/P-04 metodologi tidak ada | Modul kalibrasi lengkap dengan validasi silang dan pelaporan metrik. |
| P-06 unit analisis kabur | Ditetapkan: satu foto = satu lot; keseragaman dihitung dari sebaran antar benih. |
| P-08 klaim SNI tanpa nomor | Ambang per komoditas disimpan bersama regulasi dan status verifikasinya. Bawaannya tidak ada ambang yang dipakai; angka yang meragukan dicatat sebagai klaim beserta keberatannya, bukan dijadikan ambang. |
| P-10 tidak ada ERD | `backend/app/models.py` adalah skemanya; ERD dokumen tinggal diturunkan dari sana, dan tab Katalog menampilkan entitas beserta relasinya. |
| W-15 klaim akurasi 95% | Tidak ada satu pun klaim akurasi tanpa metrik. Halaman Kalibrasi menampilkan MAE, RMSE, R², jumlah sampel, dan grafik prediksi vs hasil UKDdP. |
| W-16 contoh gambar bukan benih | Panduan memotret berupa teks yang bisa diikuti, bukan foto sayuran. |
| W-17 data contoh yang tak pernah berubah | Mode demo ditandai spanduk permanen di atas layar; tidak ada data contoh yang menyamar sebagai data nyata. |

## Soal ambang mutu resmi

Penelusuran (31 Agustus 2026) menemukan hal yang perlu kalian ketahui sebelum
menulis apa pun di proposal: **tidak ada SNI khusus untuk sorgum, melon, maupun
edamame.** Yang terkonfirmasi hanya SNI 6233:2015 untuk benih padi. Rujukan yang
berlaku untuk ketiga komoditas SIGMA adalah Kepmentan dan Permentan, bukan SNI.

| Komoditas | Rezim | Ambang yang dipakai | Status |
|---|---|---|---|
| Sorgum | tanaman pangan | — | tidak dipakai (gerbang mati) |
| Melon | hortikultura | — | tidak dipakai (gerbang mati) |
| Edamame | belum diputuskan | — | tidak dipakai (gerbang mati) |

**Bawaan sistem: tidak satu pun ambang dipakai.** Angka 95% untuk sorgum yang
sempat ditemukan di ringkasan laman Ditjen Tanaman Pangan sengaja TIDAK
dijadikan ambang operatif — terlalu tinggi untuk ambang edar (komoditas pangan
lain umumnya di kisaran 80%; ambang 95% berarti hampir setiap lot komersial
gagal), dan kemungkinan besar tertukar dengan angka kemurnian benih yang
memang biasanya 95–98%. Angka itu tetap dicatat sebagai **klaim beserta
keberatannya** di `standar.py` dan tampil di tab Standar, supaya jejak
penelusurannya tidak hilang — tanpa ikut mempengaruhi satu pun penilaian.

### Menyalakan gerbang ambang edar

Ada satu jalan, dan jalan itu lewat manusia yang sudah membaca dokumennya:

```bash
SIGMA_AMBANG_OVERRIDE="sorgum:80,melon:75"
```

Angka yang diisi begini berstatus `diisi_operator`: dipakai sistem, tetapi
setiap putusan menyebut bahwa angkanya diketik manusia, bukan dibaca dari
dokumen. Ia tidak pernah tertukar dengan status `terverifikasi`, yang hanya
boleh diberikan setelah seseorang benar-benar membaca tabelnya.

Dokumen kuncinya:

- **Kepmentan No. 966/TP.010/C/04/2022** — Juknis Sertifikasi Benih Tanaman
  Pangan. Ini yang memuat tabel ambang untuk sorgum; menggantikan Kepmentan
  991/HK.150/C/05/2018.
- **Permentan No. 12/Permentan/TP.020/4/2018** — payung Produksi, Sertifikasi,
  dan Peredaran Benih Bina.
- **Permentan No. 23 Tahun 2021** + **Kepmentan No. 42/Kpts/SR.130/D/10/2019** —
  rezim hortikultura, berlaku untuk melon.
- **Kepmentan No. 993/HK.150/C/05/2018** memuat METODE pengujian, bukan
  ambangnya. Sering tertukar; jangan dikutip sebagai sumber ambang.

Dua hal yang harus kalian kerjakan sendiri:

1. **Baca tabel ambang di dokumen aslinya**, lalu isi lewat
   `SIGMA_AMBANG_OVERRIDE` dan ubah statusnya menjadi `terverifikasi` di
   `standar.py` sambil mencantumkan halaman dokumennya.
2. **Edamame masuk rezim mana?** Secara botani ia Glycine max — kedelai, jadi
   tanaman pangan. Tetapi di Indonesia diperlakukan sebagai sayuran. Rezim mana
   yang berlaku untuk benihnya menentukan tabel ambang mana yang dipakai. Tanya
   BPSBTPH provinsi; jawabannya layak ditulis sebagai temuan.

Seluruh angka beserta statusnya ada di `backend/app/standar.py` dan tampil di
tab **Standar**.

## Yang masih harus kalian kerjakan

1. **Isi ambang edar** setelah membaca tabel di Kepmentan 966/2022 dan
   Permentan 23/2021 langsung, lalu ubah statusnya menjadi `terverifikasi`.
   Sebelum itu, gerbang ambang edar sengaja mati. Lihat bagian di atas.
2. **Kumpulkan data kalibrasi.** Minimal 30 pasangan (foto lot, hasil UKDdP)
   per komoditas sebelum estimasi apa pun muncul. Satu komoditas yang
   tervalidasi penuh jauh lebih meyakinkan daripada tiga yang setengah jadi.
3. **Cetak penanda ArUco 4x4 (DICT_4X4_50, id 0)** ukuran 20 mm dan sertakan
   di setiap foto kalau ukuran milimeter dibutuhkan.
4. **Ganti RidgeCV** dengan model yang lebih kuat setelah data cukup - tetapi
   hanya kalau validasi silang membuktikan hasilnya lebih baik, bukan karena
   namanya terdengar lebih canggih.
5. **Autentikasi** belum ada. Tambahkan sebelum dipakai banyak orang.

## Peta berkas

```
backend/app/
  config.py                semua ambang di satu tempat
  models.py                skema basis data (sumber ERD)
  vision/preprocess.py     gerbang kualitas citra, koreksi warna, skala ArUco
  vision/segment.py        segmentasi instance benih (Otsu adaptif + watershed)
  vision/features.py       morfometrik per benih dan agregasi lot
  scoring/indices.py       lima indeks terukur + bobot mutu fisik
  scoring/grading.py       kelas mutu, ambang edar, gerbang keputusan
  scoring/calibration.py   pelatihan, validasi, prediksi + penjaga ekstrapolasi
  services/ukddp.py        rumus daya berkecambah, kecepatan, keserempakan
  services/pipeline.py     orkestrasi satu analisis
  standar.py               ambang mutu resmi + status verifikasinya
  routers/                 endpoint HTTP
frontend/src/
  lib/api.ts               lapisan data + mode demo otomatis
  lib/demo.ts              data contoh agar situs berdiri sendiri
  lib/types.ts             tipe bersama, cermin skema backend
  routes/                  Ringkasan, Analisis, Riwayat, Standar,
                           Kalibrasi, Katalog, Metodologi
  components/charts/       SebaranKelas, TrenIMF, Paritas + bingkai bersama
  components/              Shell, HasilPanel, primitif UI
```

## Batasan yang harus ikut disebut di setiap laporan

- Daya berkecambah, kecepatan tumbuh, dan keserempakan tumbuh adalah
  **estimasi** dari morfologi, bukan hasil pengukuran.
- Hasil aplikasi **bukan pengganti sertifikasi benih resmi**. Pengawasan mutu
  dan sertifikasi benih di Indonesia berada di bawah BPSB.
- Ukuran dalam milimeter hanya tersedia bila penanda skala ikut terfoto.

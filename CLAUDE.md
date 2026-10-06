# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Bahasa

Seluruh kode ini berbahasa Indonesia: nama variabel, komentar, docstring,
field API (`daya_berkecambah`, `putusan`, `gerbang_citra`), rute frontend, dan
teks antarmuka. Ikuti itu — jangan menambahkan identifier atau komentar
berbahasa Inggris ke dalam berkas yang sudah berbahasa Indonesia. Pengecualian
yang memang sudah ada: modul visi/scoring backend memakai istilah teknis
Inggris untuk nama fungsi internal (`compute_indices`, `segment_seeds`).

## Perintah

```bash
# Pengembangan lokal (backend :8000 + frontend :5173, Vite proxy /api)
./jalankan.sh            # Linux/macOS
.\jalankan.ps1           # Windows PowerShell

# Uji backend — HARUS dari dalam backend/ (conftest.py meng-set SIGMA_* ke tmpdir)
cd backend && pytest -q
pytest tests/test_vision.py -q              # satu berkas
pytest tests/test_scoring.py::test_nama -q  # satu uji
pytest -q -k "gerbang"                      # per kata kunci

cd frontend
npm run lint             # oxlint
npm run build            # tsc -b && vite build -> dist/ (dilayani FastAPI)
npm run build:tunggal    # satu berkas HTML -> dist-tunggal/index.html

docker compose up --build   # frontend ikut di-build di dalam image
```

Uji tidak memerlukan foto asli: `tests/make_fixture.py` membangkitkan lot benih
sintetis dengan parameter cacat/keseragaman yang bisa diatur.

## Aturan yang tidak bisa ditawar

**Terukur vs terestimasi.** Indeks fisik dihitung dari piksel dan selalu boleh
ditampilkan. Parameter fisiologis (daya berkecambah, kecepatan tumbuh,
keserempakan tumbuh) adalah prediksi model dan **tidak boleh keluar sama
sekali** sebelum model lolos `min_calibration_samples` (30) dan
`min_calibration_r2` (0,30). Kalau sebuah perubahan membuat angka fisiologis
muncul lebih mudah, perubahan itu salah.

**Setiap angka membawa asal-usulnya.** Ambang mutu resmi di
`backend/app/standar.py` punya `StatusVerifikasi`; `TERVERIFIKASI` hanya untuk
angka yang dibaca dari dokumen primer. Bawaannya tidak ada ambang yang dipakai,
jadi gerbang ambang edar mati. Operator menyalakannya lewat
`SIGMA_AMBANG_OVERRIDE="sorgum:80,melon:75"` dan angkanya berstatus
`diisi_operator`. `db.py` menyemai `Komoditas.min_daya_berkecambah` dengan
angka contoh — kolom itu bukan sumber ambang; `grading.ambang_edar()`
membacanya dari `standar.py`.

## Arsitektur

**Backend (FastAPI + SQLModel).** Satu proses melayani API dan — kalau
`frontend/dist` ada — juga frontend statis (`main.py` mount `/` paling akhir).

Alur satu analisis, `services/pipeline.py:run()`, urutannya sengaja:

1. `vision/preprocess.check_image` — gerbang kualitas. Menolak lebih dulu,
   sebelum menilai apa pun. Ketajaman dipakai rerata 0,5% respons Laplacian
   terkuat (bukan varians global), kelebihan cahaya dari fraksi piksel jenuh +
   rentang dinamis (bukan batas atas luminans) — keduanya untuk latar putih.
2. `gray_world_balance` + `detect_scale` (ArUco DICT_4X4_50 id 0, 20 mm);
   tanpa penanda, ukuran mm tidak tersedia dan `absolute_scale` = False.
3. `vision/segment.segment_seeds` — Otsu adaptif + watershed, objek tepi
   dibuang. Di luar 15–2000 benih → `AnalysisRejected`.
4. `vision/features` — morfometrik per benih → `LotFeatures` (agregat lot).
5. `scoring/indices` — 5 indeks terukur 0–100 + IMF berbobot.
6. `scoring/calibration.predict` — estimasi, hanya kalau model layak.
7. `scoring/grading.decide` — putusan. Estimasi hasil ekstrapolasi
   (`usable=False`, jarak baku > `MAX_Z_EXTRAPOLATION`) ditampilkan tetapi
   tidak boleh ikut menentukan kelas.

**Satu foto = satu lot.** Keseragaman didefinisikan sebagai sebaran antar benih
di dalam foto, jadi tidak ada mode "satu benih".

**Titik sentuh saat mengubah angka:**

- Ambang & bobot ada di `config.py`, `scoring/indices.PHYSICAL_WEIGHTS`,
  `scoring/grading.FINAL_WEIGHTS` dan `GRADE_BANDS`. Endpoint
  `GET /api/metodologi` (di `main.py`) menyalin semuanya untuk diaudit —
  perbarui bersamaan, kalau tidak sistem melaporkan angka yang tidak dipakai.
- `LotFeatures.vector()` — **urutannya tetap**. Model `.joblib` yang sudah
  dilatih memakai urutan ini; menambah/menggeser fitur membatalkan model lama
  di `SIGMA_MODEL_DIR` tanpa error yang terlihat.
- Model dan laporannya disimpan sebagai berkas (`{komoditas}__{target}.joblib`
  / `.json`) di `model_dir`, bukan di DB; tabel `ModelKalibrasi` hanya cermin
  metriknya untuk UI.

**Frontend (React 19 + Vite + Tailwind v4, hash router).**
`lib/api.ts` menyelidiki `/api/kesehatan` sekali; gagal → seluruh aplikasi
masuk **mode demo** dan menampilkan spanduk permanen. Konsekuensinya: setiap
endpoint baru yang dipakai UI butuh data contoh di `lib/demo.ts`, kalau tidak
build satu-berkas (`build:tunggal`) akan kosong di layar itu. `lib/types.ts`
adalah cermin manual skema backend — perbarui bersama perubahan API.

Tampilan khusus benih melon. Gerak memakai Motion (`motion/react`), anime.js
(`PanggungIndeks`, `GridLot`), dan three.js (`RonggaBiji`, hero Beranda).
Mode tanpa server sengaja kosong: tidak ada riwayat atau contoh hasil di
`lib/demo.ts`, hanya data rujukan (varietas, metode, standar).

Animasi (`lib/animasi.ts`, anime.js) hanya boleh menambah: tidak ada elemen
yang disembunyikan lewat CSS lalu ditampilkan oleh JS, dan semuanya hormat pada
`prefers-reduced-motion`.

## Catatan

- `_to_delete/` berisi berkas frontend versi lama yang sudah digantikan; jangan
  dijadikan rujukan dan jangan diimpor.
- Belum ada autentikasi sama sekali.
- Konteks proyek dan daftar temuan (W-xx / P-xx) yang dirujuk komentar kode ada
  di `README.md` dan `CATATAN-PEROMBAKAN-PROPOSAL.md`.

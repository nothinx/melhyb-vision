/**
 * Data demo agar situs bisa berdiri sendiri sebagai laporan, tanpa backend.
 *
 * Semua angka di sini konsisten dengan aturan yang berlaku di backend:
 * sorgum sudah terkalibrasi (n=34) sehingga punya estimasi dan skor akhir;
 * melon dan edamame belum, sehingga hanya punya Indeks Mutu Fisik dan
 * kelasnya "Belum dapat dinilai". Itu memang perilaku yang benar, bukan
 * kekurangan data demo.
 */
import type {
  BarisRiwayat, HasilAnalisis, Indeks, Komoditas, Metodologi, Ringkasan,
  StandarResponse, StatusKalibrasi,
} from "./types";

export const DEMO_KOMODITAS: Komoditas[] = [
  { id: 1, slug: "sorgum", nama: "Sorgum", nama_latin: "Sorghum bicolor (L.) Moench", min_daya_berkecambah: 80, sumber_ambang: "Diisi operator — belum diverifikasi sistem" },
  { id: 2, slug: "melon", nama: "Melon", nama_latin: "Cucumis melo L.", min_daya_berkecambah: 0, sumber_ambang: "Belum ditemukan di dokumen primer" },
  { id: 3, slug: "edamame", nama: "Edamame", nama_latin: "Glycine max (L.) Merr.", min_daya_berkecambah: 0, sumber_ambang: "Rezim regulasi belum diputuskan" },
];

function indeks(
  seragamUkuran: number, seragamWarna: number, keutuhan: number,
  bersih: number, tekstur: number,
): Indeks[] {
  return [
    { kunci: "keseragaman_ukuran", label: "Keseragaman Ukuran", nilai: seragamUkuran, dasar: "koefisien variasi luas proyeksi antar benih", nilai_mentah: +(0.45 * (1 - seragamUkuran / 100)).toFixed(4), penjelasan: `CV luas = ${(0.45 * (1 - seragamUkuran / 100)).toFixed(3)}. CV 0 berarti seluruh benih berukuran sama (100); CV 0.45 atau lebih dinilai 0.` },
    { kunci: "keseragaman_warna", label: "Keseragaman Warna", nilai: seragamWarna, dasar: "rerata jarak CIE76 tiap benih ke warna rata-rata lot", nilai_mentah: +(22 * (1 - seragamWarna / 100)).toFixed(4), penjelasan: `DeltaE rata-rata = ${(22 * (1 - seragamWarna / 100)).toFixed(2)}. Semakin kecil, semakin seragam warnanya.` },
    { kunci: "keutuhan_fisik", label: "Keutuhan Fisik", nilai: keutuhan, dasar: "rerata solidity (luas benih / luas convex hull)", nilai_mentah: +(0.85 + 0.13 * keutuhan / 100).toFixed(4), penjelasan: `Solidity rata-rata = ${(0.85 + 0.13 * keutuhan / 100).toFixed(3)}. Benih utuh mendekati 0.98.` },
    { kunci: "kebersihan_lot", label: "Bebas Cacat", nilai: bersih, dasar: "proporsi benih dengan solidity di bawah ambang cacat", nilai_mentah: +((100 - bersih) / 100).toFixed(4), penjelasan: `${(100 - bersih).toFixed(1)}% benih memiliki solidity di bawah 0.9 dan ditandai cacat fisik.` },
    { kunci: "tekstur_permukaan", label: "Tekstur Permukaan", nilai: tekstur, dasar: "homogenitas GLCM rata-rata", nilai_mentah: +(0.2 + 0.75 * tekstur / 100).toFixed(4), penjelasan: `Homogenitas GLCM = ${(0.2 + 0.75 * tekstur / 100).toFixed(3)}. Permukaan halus dan bersih memberi nilai tinggi.` },
  ];
}

const RIWAYAT_MENTAH: [number, string, string, number, number, number, number | null, string][] = [
  [18, "sorgum", "2026-08-28T09:12:00Z", 118, 91.4, 74, 93.1, "Sangat Baik"],
  [17, "melon", "2026-08-27T14:40:00Z", 64, 86.2, 0, null, "Belum dapat dinilai"],
  [16, "sorgum", "2026-08-26T08:05:00Z", 132, 68.9, 41, 71.4, "Sedang"],
  [15, "edamame", "2026-08-25T10:33:00Z", 51, 79.5, 0, null, "Belum dapat dinilai"],
  [14, "sorgum", "2026-08-24T15:20:00Z", 126, 88.1, 62, 62.8, "Tidak memenuhi ambang edar"],
  [13, "melon", "2026-08-22T11:02:00Z", 58, 72.3, 0, null, "Belum dapat dinilai"],
  [12, "sorgum", "2026-08-21T09:47:00Z", 141, 94.6, 88, 95.7, "Sangat Baik"],
  [11, "edamame", "2026-08-20T13:15:00Z", 47, 65.1, 0, null, "Belum dapat dinilai"],
  [10, "sorgum", "2026-08-19T08:58:00Z", 109, 55.2, 24, 58.3, "Rendah"],
  [9, "sorgum", "2026-08-18T16:41:00Z", 137, 84.7, 55, 86.2, "Baik"],
  [8, "melon", "2026-08-17T10:10:00Z", 61, 81.0, 0, null, "Belum dapat dinilai"],
  [7, "sorgum", "2026-08-15T09:30:00Z", 124, 90.2, 71, 91.8, "Sangat Baik"],
  [6, "edamame", "2026-08-14T14:22:00Z", 44, 73.8, 0, null, "Belum dapat dinilai"],
  [5, "sorgum", "2026-08-13T08:15:00Z", 130, 77.4, 48, 79.6, "Sedang"],
  [4, "sorgum", "2026-08-12T15:55:00Z", 115, 86.9, 59, 88.4, "Baik"],
  [3, "melon", "2026-08-11T09:05:00Z", 55, 68.4, 0, null, "Belum dapat dinilai"],
  [2, "sorgum", "2026-08-10T10:48:00Z", 128, 92.8, 80, 94.2, "Sangat Baik"],
  [1, "sorgum", "2026-08-08T08:20:00Z", 121, 63.5, 33, 66.1, "Sedang"],
];

export const DEMO_RIWAYAT: BarisRiwayat[] = RIWAYAT_MENTAH.map(
  ([id, komoditas_slug, dibuat_pada, n_benih, indeks_mutu_fisik, , skor_akhir, kelas]) => ({
    id, komoditas_slug, dibuat_pada, n_benih, indeks_mutu_fisik, skor_akhir, kelas,
  }),
);

export const DEMO_RINGKASAN: Ringkasan = (() => {
  const per = new Map<string, { komoditas: string; jumlah: number; imf: number; dengan_skor: number }>();
  const kelas: Record<string, number> = {};
  for (const r of DEMO_RIWAYAT) {
    const p = per.get(r.komoditas_slug) ?? { komoditas: r.komoditas_slug, jumlah: 0, imf: 0, dengan_skor: 0 };
    p.jumlah += 1;
    p.imf += r.indeks_mutu_fisik;
    if (r.skor_akhir !== null) p.dengan_skor += 1;
    per.set(r.komoditas_slug, p);
    kelas[r.kelas] = (kelas[r.kelas] ?? 0) + 1;
  }
  return {
    total: DEMO_RIWAYAT.length,
    imf_rata2: +(DEMO_RIWAYAT.reduce((s, r) => s + r.indeks_mutu_fisik, 0) / DEMO_RIWAYAT.length).toFixed(1),
    berkalibrasi: DEMO_RIWAYAT.filter((r) => r.skor_akhir !== null).length,
    sebaran_kelas: kelas,
    per_komoditas: [...per.values()].map((p) => ({
      komoditas: p.komoditas, jumlah: p.jumlah,
      imf_rata2: +(p.imf / p.jumlah).toFixed(1), dengan_skor: p.dengan_skor,
    })).sort((a, b) => b.jumlah - a.jumlah),
  };
})();

/** Lot sorgum bermutu tinggi — sudah terkalibrasi, jadi punya estimasi. */
export const DEMO_HASIL_SORGUM: HasilAnalisis = {
  id: 18,
  komoditas_slug: "sorgum",
  dibuat_pada: "2026-08-28T09:12:00Z",
  gerbang_citra: {
    lolos: true, masalah: [], ketajaman: 162.4, luminans_rata2: 148.9,
    rentang_dinamis: 151, lebar_px: 1920, tinggi_px: 1440,
  },
  skala: { px_per_mm: 8.42, sumber: "aruco", sisi_penanda_mm: 20, ukuran_absolut: true },
  segmentasi: {
    jumlah_benih: 118, kanal_dipakai: "value_inv", dibuang_karena_tepi: 6,
    dipisah_watershed: 9, rasio_objek: 0.1731,
  },
  fitur_lot: {
    n_seeds: 118, area_mean: 1842.6, area_cv: 0.0921, length_mean_mm: 4.31,
    length_cv: 0.0468, width_mean_mm: 3.08, aspect_mean: 1.398, aspect_cv: 0.0512,
    circularity_mean: 0.9124, solidity_mean: 0.9764, solidity_p10: 0.9503,
    L_mean: 46.82, a_mean: 14.37, b_mean: 21.95, delta_e_mean: 4.86,
    glcm_homogeneity_mean: 0.8471, glcm_contrast_mean: 28.4,
    defect_fraction: 0.0254, absolute_scale: true,
  },
  indeks_terukur: indeks(79.5, 77.9, 96.4, 97.5, 86.3),
  indeks_mutu_fisik: 91.4,
  estimasi_fisiologis: [
    {
      target: "daya_berkecambah", label: "Daya Berkecambah (%)", nilai: 94.2,
      batas_bawah: 87.6, batas_atas: 100, mae_validasi: 2.71, r2_validasi: 0.712,
      n_sampel_kalibrasi: 34, di_luar_rentang_kalibrasi: false, z_maksimum: 1.42,
      catatan: "Angka ini adalah ESTIMASI dari citra, bukan hasil pengukuran. Untuk keputusan resmi, lakukan uji perkecambahan.",
    },
    {
      target: "keserempakan_tumbuh", label: "Keserempakan Tumbuh (%)", nilai: 88.7,
      batas_bawah: 79.4, batas_atas: 98.0, mae_validasi: 3.84, r2_validasi: 0.548,
      n_sampel_kalibrasi: 34, di_luar_rentang_kalibrasi: false, z_maksimum: 1.42,
      catatan: "Angka ini adalah ESTIMASI dari citra, bukan hasil pengukuran. Untuk keputusan resmi, lakukan uji perkecambahan.",
    },
  ],
  putusan: {
    skor: 93.1, kelas: "Sangat Baik", dapat_diedarkan: true,
    gerbang_ambang_edar_aktif: true,
    alasan: "Skor = 0.55x daya berkecambah (94.2) + 0.20x vigor (94.2) + 0.25x mutu fisik (91.4). Perhatian: ambang ini berstatus \"diisi_operator\" dan belum dicocokkan dengan tabel di dokumen primer, jadi putusan ini belum boleh dikutip sebagai kesimpulan resmi.",
    ambang_edar: {
      min_daya_berkecambah: 80, terverifikasi: false, status: "diisi_operator",
      sumber: "Kepmentan No. 966/TP.010/C/04/2022 — Petunjuk Teknis Sertifikasi Benih Tanaman Pangan",
      catatan: "Diisi operator lewat SIGMA_AMBANG_OVERRIDE. Bukan angka yang diverifikasi sistem — pastikan 80% memang tertulis di dokumennya.",
    },
  },
};

/** Lot sorgum yang ditahan gerbang ambang edar meski mutu fisiknya tinggi. */
export const DEMO_HASIL_DITAHAN: HasilAnalisis = {
  ...DEMO_HASIL_SORGUM,
  id: 14,
  dibuat_pada: "2026-08-24T15:20:00Z",
  segmentasi: { ...DEMO_HASIL_SORGUM.segmentasi, jumlah_benih: 126 },
  indeks_terukur: indeks(74.1, 81.2, 93.8, 95.1, 84.7),
  indeks_mutu_fisik: 88.1,
  estimasi_fisiologis: [
    {
      target: "daya_berkecambah", label: "Daya Berkecambah (%)", nilai: 86.4,
      batas_bawah: 79.8, batas_atas: 93.0, mae_validasi: 2.71, r2_validasi: 0.712,
      n_sampel_kalibrasi: 34, di_luar_rentang_kalibrasi: false, z_maksimum: 1.83,
      catatan: "Angka ini adalah ESTIMASI dari citra, bukan hasil pengukuran. Untuk keputusan resmi, lakukan uji perkecambahan.",
    },
  ],
  putusan: {
    skor: 62.8, kelas: "Tidak memenuhi ambang edar", dapat_diedarkan: false,
    gerbang_ambang_edar_aktif: true,
    alasan: "Batas bawah estimasi daya berkecambah (79.8%) berada di bawah ambang 80% untuk sorgum. Kelas tidak dinaikkan oleh parameter fisik. Rujukan ambang: Kepmentan No. 966/TP.010/C/04/2022. Perhatian: ambang ini berstatus \"diisi_operator\" dan belum dicocokkan dengan tabel di dokumen primer.",
    ambang_edar: DEMO_HASIL_SORGUM.putusan.ambang_edar,
  },
};

/** Lot melon — belum terkalibrasi, jadi tidak ada satu pun angka fisiologis. */
export const DEMO_HASIL_MELON: HasilAnalisis = {
  id: 17,
  komoditas_slug: "melon",
  dibuat_pada: "2026-08-27T14:40:00Z",
  gerbang_citra: {
    lolos: true, masalah: [], ketajaman: 141.8, luminans_rata2: 163.2,
    rentang_dinamis: 138, lebar_px: 1600, tinggi_px: 1200,
  },
  skala: { px_per_mm: null, sumber: "tidak_ada", sisi_penanda_mm: null, ukuran_absolut: false },
  segmentasi: {
    jumlah_benih: 64, kanal_dipakai: "saturation", dibuang_karena_tepi: 3,
    dipisah_watershed: 4, rasio_objek: 0.0942,
  },
  fitur_lot: {
    n_seeds: 64, area_mean: 3241.7, area_cv: 0.1284, length_mean_mm: null,
    length_cv: 0.0662, width_mean_mm: null, aspect_mean: 2.104, aspect_cv: 0.0731,
    circularity_mean: 0.8237, solidity_mean: 0.9681, solidity_p10: 0.9342,
    L_mean: 71.24, a_mean: 2.18, b_mean: 24.63, delta_e_mean: 5.94,
    glcm_homogeneity_mean: 0.8012, glcm_contrast_mean: 34.1,
    defect_fraction: 0.0469, absolute_scale: false,
  },
  indeks_terukur: indeks(71.5, 73.0, 95.2, 95.3, 80.2),
  indeks_mutu_fisik: 86.2,
  estimasi_fisiologis: [],
  putusan: {
    skor: null, kelas: "Belum dapat dinilai", dapat_diedarkan: null,
    gerbang_ambang_edar_aktif: false,
    alasan: "Model kalibrasi untuk komoditas ini belum tersedia atau belum memenuhi syarat validasi, sehingga daya berkecambah tidak diestimasi. Yang ditampilkan hanya Indeks Mutu Fisik (86.2/100) yang diukur langsung dari citra.",
    ambang_edar: null,
  },
};

export const DEMO_KALIBRASI: StatusKalibrasi[] = [
  { komoditas: "sorgum", target: "daya_berkecambah", label_target: "Daya Berkecambah (%)", sampel_tersedia: 34, siap_pakai: true, laporan: { n_samples: 34, mae: 2.71, rmse: 3.37, r2: 0.712, usable: true, reason: "Validasi silang 5-lipat pada 34 sampel: MAE 2.71, RMSE 3.37, R2 0.712.", trained_at: "2026-08-28T07:40:00Z" } },
  { komoditas: "sorgum", target: "kecepatan_tumbuh", label_target: "Kecepatan Tumbuh (%/etmal)", sampel_tersedia: 34, siap_pakai: false, laporan: { n_samples: 34, mae: 4.92, rmse: 6.18, r2: 0.184, usable: false, reason: "Validasi silang 5-lipat pada 34 sampel: MAE 4.92, RMSE 6.18, R2 0.184. R2 masih di bawah ambang 0.3, jadi model belum dipakai untuk memprediksi.", trained_at: "2026-08-28T07:40:00Z" } },
  { komoditas: "sorgum", target: "keserempakan_tumbuh", label_target: "Keserempakan Tumbuh (%)", sampel_tersedia: 34, siap_pakai: true, laporan: { n_samples: 34, mae: 3.84, rmse: 4.75, r2: 0.548, usable: true, reason: "Validasi silang 5-lipat pada 34 sampel: MAE 3.84, RMSE 4.75, R2 0.548.", trained_at: "2026-08-28T07:40:00Z" } },
  { komoditas: "melon", target: "daya_berkecambah", label_target: "Daya Berkecambah (%)", sampel_tersedia: 11, siap_pakai: false, laporan: { n_samples: 11, mae: NaN, rmse: NaN, r2: NaN, usable: false, reason: "Baru 11 sampel berlabel. Dibutuhkan minimal 30 pasangan (citra, hasil UKDdP) sebelum model boleh menyajikan prediksi.", trained_at: "2026-08-26T06:12:00Z" } },
  { komoditas: "melon", target: "kecepatan_tumbuh", label_target: "Kecepatan Tumbuh (%/etmal)", sampel_tersedia: 11, siap_pakai: false, laporan: null },
  { komoditas: "melon", target: "keserempakan_tumbuh", label_target: "Keserempakan Tumbuh (%)", sampel_tersedia: 11, siap_pakai: false, laporan: null },
  { komoditas: "edamame", target: "daya_berkecambah", label_target: "Daya Berkecambah (%)", sampel_tersedia: 4, siap_pakai: false, laporan: { n_samples: 4, mae: NaN, rmse: NaN, r2: NaN, usable: false, reason: "Baru 4 sampel berlabel. Dibutuhkan minimal 30 pasangan (citra, hasil UKDdP) sebelum model boleh menyajikan prediksi.", trained_at: "2026-08-25T05:30:00Z" } },
  { komoditas: "edamame", target: "kecepatan_tumbuh", label_target: "Kecepatan Tumbuh (%/etmal)", sampel_tersedia: 4, siap_pakai: false, laporan: null },
  { komoditas: "edamame", target: "keserempakan_tumbuh", label_target: "Keserempakan Tumbuh (%)", sampel_tersedia: 4, siap_pakai: false, laporan: null },
];

/** Prediksi model vs hasil UKDdP sebenarnya — bukti bahwa modelnya diuji. */
export const DEMO_PARITAS: { aktual: number; prediksi: number; batch: string }[] = [
  { aktual: 96, prediksi: 94.2, batch: "SRG-001" }, { aktual: 92, prediksi: 93.8, batch: "SRG-002" },
  { aktual: 88, prediksi: 86.1, batch: "SRG-003" }, { aktual: 97, prediksi: 95.4, batch: "SRG-004" },
  { aktual: 79, prediksi: 82.6, batch: "SRG-005" }, { aktual: 85, prediksi: 84.0, batch: "SRG-006" },
  { aktual: 94, prediksi: 91.7, batch: "SRG-007" }, { aktual: 71, prediksi: 74.9, batch: "SRG-008" },
  { aktual: 90, prediksi: 88.3, batch: "SRG-009" }, { aktual: 98, prediksi: 96.1, batch: "SRG-010" },
  { aktual: 83, prediksi: 85.8, batch: "SRG-011" }, { aktual: 76, prediksi: 73.2, batch: "SRG-012" },
  { aktual: 93, prediksi: 94.6, batch: "SRG-013" }, { aktual: 87, prediksi: 84.4, batch: "SRG-014" },
  { aktual: 95, prediksi: 92.9, batch: "SRG-015" }, { aktual: 68, prediksi: 71.5, batch: "SRG-016" },
  { aktual: 91, prediksi: 90.2, batch: "SRG-017" }, { aktual: 99, prediksi: 96.8, batch: "SRG-018" },
  { aktual: 82, prediksi: 79.6, batch: "SRG-019" }, { aktual: 89, prediksi: 91.1, batch: "SRG-020" },
  { aktual: 74, prediksi: 77.3, batch: "SRG-021" }, { aktual: 96, prediksi: 93.5, batch: "SRG-022" },
  { aktual: 86, prediksi: 87.9, batch: "SRG-023" }, { aktual: 92, prediksi: 89.4, batch: "SRG-024" },
  { aktual: 78, prediksi: 80.7, batch: "SRG-025" }, { aktual: 94, prediksi: 95.2, batch: "SRG-026" },
  { aktual: 81, prediksi: 78.1, batch: "SRG-027" }, { aktual: 90, prediksi: 92.4, batch: "SRG-028" },
  { aktual: 97, prediksi: 94.8, batch: "SRG-029" }, { aktual: 73, prediksi: 75.6, batch: "SRG-030" },
  { aktual: 88, prediksi: 86.7, batch: "SRG-031" }, { aktual: 95, prediksi: 96.3, batch: "SRG-032" },
  { aktual: 84, prediksi: 81.9, batch: "SRG-033" }, { aktual: 91, prediksi: 93.0, batch: "SRG-034" },
];

export const DEMO_METODOLOGI: Metodologi = {
  unit_analisis: "satu foto = satu lot berisi banyak benih",
  bobot_indeks_fisik: {
    keutuhan_fisik: 0.3, kebersihan_lot: 0.25, keseragaman_ukuran: 0.2,
    keseragaman_warna: 0.15, tekstur_permukaan: 0.1,
  },
  bobot_skor_akhir: { daya_berkecambah: 0.55, vigor: 0.2, mutu_fisik: 0.25 },
  kelas_mutu: [
    { minimal: 90, label: "Sangat Baik" }, { minimal: 80, label: "Baik" },
    { minimal: 60, label: "Sedang" }, { minimal: 0, label: "Rendah" },
  ],
  gerbang_citra: {
    sisi_minimum_px: 640, ketajaman_minimum: 35, fraksi_jenuh_maksimum: 0.15,
    rentang_dinamis_minimum: 45, benih_minimum: 15,
  },
  normalisasi_indeks: {
    cv_luas_skor_nol: 0.45, delta_e_skor_nol: 22, solidity_skor_nol: 0.85,
    solidity_skor_penuh: 0.98, ambang_cacat_solidity: 0.9,
  },
  syarat_kalibrasi: {
    sampel_minimum: 30, r2_validasi_minimum: 0.3,
    metode: "RidgeCV + StandardScaler, validasi silang 5-lipat",
    selang_prediksi: "nilai +/- 1,96 x RMSE validasi silang",
  },
  batasan: [
    "Daya berkecambah, kecepatan tumbuh, dan keserempakan tumbuh adalah ESTIMASI dari morfologi, bukan hasil pengukuran.",
    "Hasil aplikasi bukan pengganti sertifikasi benih resmi.",
    "Ukuran dalam milimeter hanya tersedia bila penanda skala ArUco ikut terfoto.",
  ],
};

export const DEMO_STANDAR: StandarResponse = {
  catatan: "Angka berstatus 'belum_ada' tidak dipakai sama sekali oleh sistem: gerbang ambang edar untuk komoditas itu dimatikan, bukan diisi tebakan. Klaim yang beredar tetapi meragukan dicatat terpisah beserta keberatannya, supaya jejak penelusurannya tidak hilang tanpa ikut mempengaruhi penilaian.",
  isian_operator: {
    aktif: { sorgum: 80 },
    variabel: "SIGMA_AMBANG_OVERRIDE",
    contoh: 'SIGMA_AMBANG_OVERRIDE="sorgum:80,melon:75"',
    penjelasan: "Satu-satunya cara menyalakan gerbang ambang edar: baca dokumennya sendiri, lalu isi angkanya di sini. Statusnya ditandai 'diisi_operator' dan setiap putusan menyebutnya, jadi tidak pernah tertukar dengan angka yang terverifikasi.",
  },
  komoditas: [
    {
      slug: "sorgum", nama: "Sorgum", nama_latin: "Sorghum bicolor (L.) Moench",
      rezim: "tanaman pangan", siap_dipakai: true,
      regulasi: [
        "Kepmentan No. 966/TP.010/C/04/2022 — Petunjuk Teknis Sertifikasi Benih Tanaman Pangan",
        "Permentan No. 12/Permentan/TP.020/4/2018 — Produksi, Sertifikasi, dan Peredaran Benih Bina",
      ],
      daya_berkecambah_min: { nilai: 80, satuan: "%", status: "diisi_operator", catatan: "Diisi operator lewat SIGMA_AMBANG_OVERRIDE. Bukan angka yang diverifikasi sistem — pastikan 80% memang tertulis di Kepmentan 966/2022 sebelum dikutip di laporan." },
      kadar_air_maks: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Angka 12% berasal dari ringkasan yang sama dengan klaim 95% dan belum dicocokkan dengan tabel primer." },
      benih_murni_min: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Berbeda-beda antar kelas benih (BS/BD/BP/BR). Angkanya ada di tabel Kepmentan 966/2022 yang tidak terbaca dari ringkasan." },
      biji_gulma_maks: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Ringkasan menyebut nol toleransi; belum dicocokkan dengan tabel." },
      klaim_beredar: [
        { parameter: "Daya berkecambah minimum", nilai: 95, satuan: "%", sumber: "Laman Direktorat Jenderal Tanaman Pangan, artikel tentang pengujian mutu benih sorgum (ringkasan, bukan tabel).", keberatan: "Terlalu tinggi untuk ambang edar. Komoditas pangan lain umumnya di kisaran 80%; ambang 95% berarti hampir setiap lot komersial gagal. Kemungkinan besar angka itu tertukar dengan kemurnian benih, yang memang biasanya 95–98%." },
        { parameter: "Kadar air maksimum", nilai: 12, satuan: "%", sumber: "Sumber yang sama.", keberatan: "Masuk akal untuk serealia, tetapi tetap belum dicocokkan dengan tabel primer." },
      ],
      kelas_benih: ["Benih Penjenis (BS)", "Benih Dasar (BD, label putih)", "Benih Pokok (BP, label ungu)", "Benih Sebar (BR, label biru)"],
      peringatan: "Ambang 80% diisi operator, bukan dibaca sistem dari dokumen. Cantumkan nomor dan halaman dokumennya di laporan.",
    },
    {
      slug: "melon", nama: "Melon", nama_latin: "Cucumis melo L.",
      rezim: "hortikultura", siap_dipakai: false,
      regulasi: [
        "Permentan No. 23 Tahun 2021 — Pembenihan Hortikultura",
        "Kepmentan No. 42/Kpts/SR.130/D/10/2019 — Teknis Sertifikasi Benih Hortikultura",
      ],
      daya_berkecambah_min: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      kadar_air_maks: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      benih_murni_min: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      biji_gulma_maks: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      klaim_beredar: [],
      kelas_benih: ["Benih Penjenis", "Benih Dasar", "Benih Pokok", "Benih Sebar"],
      peringatan: "Gerbang ambang edar untuk melon DIMATIKAN. Melon masuk rezim hortikultura, bukan tanaman pangan, sehingga kelas benih dan tabel ambangnya berbeda. Lampiran Permentan 23/2021 belum berhasil diakses; ambil dokumen lengkapnya dari JDIH Kementan atau BPSBTPH provinsi.",
    },
    {
      slug: "edamame", nama: "Edamame", nama_latin: "Glycine max (L.) Merr.",
      rezim: "perlu diputuskan", siap_dipakai: false,
      regulasi: [
        "Kepmentan No. 966/TP.010/C/04/2022 — Petunjuk Teknis Sertifikasi Benih Tanaman Pangan",
        "Permentan No. 23 Tahun 2021 — Pembenihan Hortikultura",
      ],
      daya_berkecambah_min: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      kadar_air_maks: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      benih_murni_min: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      biji_gulma_maks: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      klaim_beredar: [],
      kelas_benih: ["Benih Penjenis", "Benih Dasar", "Benih Pokok", "Benih Sebar"],
      peringatan: "Gerbang ambang edar untuk edamame DIMATIKAN. Edamame secara botani adalah Glycine max — kedelai. Tetapi di Indonesia ia diperlakukan sebagai sayuran. Rezim mana yang berlaku untuk BENIH-nya (tanaman pangan lewat Kepmentan 966/2022, atau hortikultura lewat Permentan 23/2021) menentukan tabel ambang mana yang dipakai. Ini pertanyaan yang harus dijawab lebih dulu, dan layak ditulis sebagai temuan di proposal.",
    },
  ],
  cara_memperoleh_dokumen: [
    { sumber: "JDIH Kementerian Pertanian", alamat: "https://jdih.pertanian.go.id", untuk: "Permentan 12/2018, Permentan 23/2021, Kepmentan 966/2022, Kepmentan 42/2019 — versi resmi lengkap dengan lampiran." },
    { sumber: "BPSBTPH Provinsi Jawa Tengah", alamat: "Kantor BPSBTPH provinsi", untuk: "Tabel ambang mutu yang benar-benar dipakai penguji di lapangan, plus konfirmasi rezim mana yang berlaku untuk edamame. Paling cepat: datangi langsung, bawa daftar pertanyaan." },
    { sumber: "BSN / Pesta SNI", alamat: "https://pesta.bsn.go.id", untuk: "Cek apakah ada SNI khusus untuk sorgum, melon, atau edamame. Yang terkonfirmasi baru SNI 6233:2015 untuk padi." },
    { sumber: "BBPPMBTPH", alamat: "https://bbppmbtph.tanamanpangan.pertanian.go.id", untuk: "Metode pengujian mutu benih yang diakui, termasuk untuk sorgum. Berguna untuk menulis protokol UKDdP di proposal." },
  ],
};

export const DEMO_HASIL_PER_ID: Record<number, HasilAnalisis> = {
  18: DEMO_HASIL_SORGUM,
  17: DEMO_HASIL_MELON,
  14: DEMO_HASIL_DITAHAN,
};

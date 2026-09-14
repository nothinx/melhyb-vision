export type StatusVerifikasi =
  | "terverifikasi"
  | "diisi_operator"
  | "belum_ada";

/** Angka yang beredar tetapi tidak dipakai sistem, beserta keberatannya. */
export interface Klaim {
  parameter: string;
  nilai: number;
  satuan: string;
  sumber: string;
  keberatan: string;
}

export interface Ambang {
  nilai: number | null;
  satuan: string;
  status: StatusVerifikasi;
  catatan: string;
}

export interface StandarKomoditas {
  slug: string;
  nama: string;
  nama_latin: string;
  rezim: string;
  regulasi: string[];
  daya_berkecambah_min: Ambang;
  kadar_air_maks: Ambang;
  benih_murni_min: Ambang;
  biji_gulma_maks: Ambang;
  klaim_beredar: Klaim[];
  kelas_benih: string[];
  peringatan: string;
  siap_dipakai: boolean;
}

export interface SumberDokumen {
  sumber: string;
  alamat: string;
  untuk: string;
}

export interface IsianOperator {
  aktif: Record<string, number>;
  variabel: string;
  contoh: string;
  penjelasan: string;
}

export interface StandarResponse {
  komoditas: StandarKomoditas[];
  cara_memperoleh_dokumen: SumberDokumen[];
  isian_operator: IsianOperator;
  catatan: string;
}

export interface Komoditas {
  id: number;
  slug: string;
  nama: string;
  nama_latin: string;
  min_daya_berkecambah: number;
  sumber_ambang: string;
}

export interface Indeks {
  kunci: string;
  label: string;
  nilai: number;
  dasar: string;
  nilai_mentah: number;
  penjelasan: string;
}

export interface Estimasi {
  target: string;
  label: string;
  nilai: number;
  batas_bawah: number;
  batas_atas: number;
  mae_validasi: number;
  r2_validasi: number;
  n_sampel_kalibrasi: number;
  di_luar_rentang_kalibrasi: boolean;
  z_maksimum: number;
  catatan: string;
}

export interface Putusan {
  skor: number | null;
  kelas: string;
  dapat_diedarkan: boolean | null;
  alasan: string;
  gerbang_ambang_edar_aktif: boolean;
  ambang_edar: {
    min_daya_berkecambah: number;
    sumber: string;
    terverifikasi: boolean;
    status: string;
    catatan: string;
  } | null;
}

/**
 * `POST /api/analisis` mengembalikan seluruh metadata segmentasi, tetapi
 * tabel `Analisis` hanya menyimpan `n_benih` — cacah yang dibuang karena
 * tepi dan yang dipisah watershed tidak pernah masuk basis data. Jadi untuk
 * analisis yang dibaca ulang dari riwayat, semuanya kecuali `jumlah_benih`
 * memang tidak ada. Opsional di sini supaya ketiadaannya jadi urusan yang
 * ditangani, bukan TypeError saat render.
 */
export interface Segmentasi {
  jumlah_benih: number;
  kanal_dipakai?: string;
  dibuang_karena_tepi?: number;
  dipisah_watershed?: number;
  rasio_objek?: number;
}

export interface Skala {
  px_per_mm: number | null;
  sumber: string;
  sisi_penanda_mm: number | null;
  ukuran_absolut: boolean;
}

export interface MasalahGerbang {
  kode: string;
  pesan: string;
  nilai: number;
  ambang: number;
}

export interface GerbangCitra {
  lolos: boolean;
  masalah: MasalahGerbang[];
  ketajaman: number;
  luminans_rata2: number;
  rentang_dinamis: number;
  lebar_px: number;
  tinggi_px: number;
}

export interface HasilAnalisis {
  id: number;
  /** Kosong untuk analisis lama: gerbang disimpan, dimensi piksel tidak. */
  gerbang_citra?: GerbangCitra;
  skala: Skala;
  segmentasi: Segmentasi;
  fitur_lot: Record<string, number | boolean | null>;
  indeks_terukur: Indeks[];
  indeks_mutu_fisik: number;
  estimasi_fisiologis: Estimasi[];
  putusan: Putusan;
  berkas_citra?: string;
  berkas_anotasi?: string;
  komoditas_slug?: string;
  dibuat_pada?: string;
}

export interface BarisRiwayat {
  id: number;
  komoditas_slug: string;
  n_benih: number;
  indeks_mutu_fisik: number;
  skor_akhir: number | null;
  kelas: string;
  dibuat_pada: string;
}

export interface Ringkasan {
  total: number;
  imf_rata2: number | null;
  berkalibrasi: number;
  per_komoditas: {
    komoditas: string;
    jumlah: number;
    imf_rata2: number;
    dengan_skor: number;
  }[];
  sebaran_kelas: Record<string, number>;
}

export interface StatusKalibrasi {
  komoditas: string;
  target: string;
  label_target: string;
  sampel_tersedia: number;
  siap_pakai: boolean;
  laporan: {
    n_samples: number;
    mae: number;
    rmse: number;
    r2: number;
    usable: boolean;
    reason: string;
    trained_at: string;
  } | null;
}

export interface Metodologi {
  unit_analisis: string;
  bobot_indeks_fisik: Record<string, number>;
  bobot_skor_akhir: Record<string, number>;
  kelas_mutu: { minimal: number; label: string }[];
  gerbang_citra: Record<string, number>;
  normalisasi_indeks: Record<string, number>;
  syarat_kalibrasi: Record<string, string | number>;
  batasan: string[];
}

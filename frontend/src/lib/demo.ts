/**
 * Data untuk mode tanpa server (build satu berkas, versi Hugging Face).
 *
 * Belum ada satu pun lot melon yang dianalisis, jadi riwayat, ringkasan,
 * dan kalibrasi sengaja kosong. Yang diisi hanya data rujukan yang memang
 * tidak bergantung pada pengukuran: komoditas, varietas, metode, standar.
 */
import type {
  BarisRiwayat, HasilAnalisis, Komoditas, Metodologi, Ringkasan,
  StandarResponse, StatusKalibrasi, Varietas,
} from "./types";

export const DEMO_KOMODITAS: Komoditas[] = [
  { id: 1, slug: "melon", nama: "Melon", nama_latin: "Cucumis melo L.", min_daya_berkecambah: 0, sumber_ambang: "Belum ditemukan di dokumen primer" },
];

export const DEMO_VARIETAS: Varietas[] = [
  { id: 1, komoditas_id: 1, nama: "Golden Aroma", deskripsi: "Tipe Hami.", pemulia: "", no_pendaftaran: "" },
  { id: 2, komoditas_id: 1, nama: "Honey Globe", deskripsi: "Tipe Juicy.", pemulia: "", no_pendaftaran: "" },
  { id: 3, komoditas_id: 1, nama: "Apollo", deskripsi: "Tipe Crunchy.", pemulia: "", no_pendaftaran: "" },
  { id: 4, komoditas_id: 1, nama: "Benih petani", deskripsi: "Pembanding: benih dari petani, tidak bersertifikat.", pemulia: "", no_pendaftaran: "" },
];

export const DEMO_RIWAYAT: BarisRiwayat[] = [];

export const DEMO_RINGKASAN: Ringkasan = {
  total: 0, imf_rata2: null, berkalibrasi: 0, sebaran_kelas: {}, per_komoditas: [],
};

const TARGET = [
  ["daya_berkecambah", "Daya Berkecambah (%)"],
  ["kecepatan_tumbuh", "Kecepatan Tumbuh (%/etmal)"],
  ["keserempakan_tumbuh", "Keserempakan Tumbuh (%)"],
] as const;

export const DEMO_KALIBRASI: StatusKalibrasi[] = TARGET.map(([target, label_target]) => ({
  komoditas: "melon", target, label_target, sampel_tersedia: 0, siap_pakai: false, laporan: null,
}));

export const DEMO_HASIL_PER_ID: Record<number, HasilAnalisis> = {};

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
    rentang_dinamis_minimum: 45, benih_minimum: 10,
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
    "Daya berkecambah, kecepatan tumbuh, dan keserempakan tumbuh merupakan estimasi model dari ciri fisik, bukan hasil uji perkecambahan.",
    "Hasil aplikasi bukan pengganti sertifikasi benih resmi.",
    "Ukuran dalam milimeter hanya tersedia bila penanda skala ArUco ikut terfoto.",
  ],
};

export const DEMO_STANDAR: StandarResponse = {
  catatan: "Ambang yang belum tersedia tidak digunakan untuk menilai kelayakan edar. Angka dari sumber yang belum terverifikasi dicatat sebagai informasi dan tidak ikut menentukan hasil.",
  isian_operator: {
    aktif: {},
    variabel: "MELHYB_AMBANG_OVERRIDE",
    contoh: 'MELHYB_AMBANG_OVERRIDE="melon:75"',
    penjelasan: "Pengelola server dapat mengisi ambang melalui MELHYB_AMBANG_OVERRIDE setelah memeriksa dokumen acuan. Nilainya akan berstatus diisi operator dan status tersebut dicantumkan pada hasil analisis.",
  },
  komoditas: [
    {
      slug: "melon", nama: "Melon", nama_latin: "Cucumis melo L.",
      rezim: "hortikultura", siap_dipakai: false,
      regulasi: [
        "Permentan No. 23 Tahun 2021: Pembenihan Hortikultura",
        "Kepmentan No. 42/Kpts/SR.130/D/10/2019: Teknis Sertifikasi Benih Hortikultura",
      ],
      daya_berkecambah_min: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      kadar_air_maks: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      benih_murni_min: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      biji_gulma_maks: { nilai: null, satuan: "%", status: "belum_ada", catatan: "Belum ditemukan di dokumen primer; jangan dipakai sampai diisi." },
      klaim_beredar: [],
      kelas_benih: ["Benih Penjenis", "Benih Dasar", "Benih Pokok", "Benih Sebar"],
      peringatan: "Ambang edar melon belum digunakan karena nilainya belum diverifikasi pada dokumen acuan. Periksa dokumen lengkap beserta lampirannya melalui JDIH Kementan atau BPSBTPH provinsi.",
    },
  ],
  cara_memperoleh_dokumen: [
    { sumber: "JDIH Kementerian Pertanian", alamat: "https://jdih.pertanian.go.id", untuk: "Permentan 12/2018, Permentan 23/2021, Kepmentan 966/2022, Kepmentan 42/2019: versi resmi lengkap dengan lampiran." },
    { sumber: "BPSBTPH Provinsi Jawa Tengah", alamat: "Kantor BPSBTPH provinsi", untuk: "Konfirmasi tabel ambang mutu dan kelompok regulasi yang menjadi acuan pengujian." },
    { sumber: "BSN / Pesta SNI", alamat: "https://pesta.bsn.go.id", untuk: "Pencarian standar SNI berdasarkan komoditas dan nomor dokumen." },
    { sumber: "BBPPMBTPH", alamat: "https://bbppmbtph.tanamanpangan.pertanian.go.id", untuk: "Informasi metode dan prosedur pengujian mutu benih." },
  ],
};


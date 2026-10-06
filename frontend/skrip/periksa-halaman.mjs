import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";

// Memeriksa render dan batas informasi; tidak menggantikan pengujian visual browser.
const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
const contoh = await server.ssrLoadModule("/src/lib/demo.ts");
const dataApi = await server.ssrLoadModule("/src/lib/api.ts");
const ambilAsli = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("Server uji luring"); };
await dataApi.periksaBackend();
globalThis.fetch = ambilAsli;
after(async () => { await server.close(); });

function penyimpanData(isian = {}) {
  const penyimpan = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } });
  for (const [kunci, nilai] of Object.entries({
    ringkasan: contoh.DEMO_RINGKASAN, riwayat: contoh.DEMO_RIWAYAT,
    komoditas: contoh.DEMO_KOMODITAS, varietas: contoh.DEMO_VARIETAS, kalibrasi: contoh.DEMO_KALIBRASI,
    metodologi: contoh.DEMO_METODOLOGI, standar: contoh.DEMO_STANDAR, ...isian,
  })) {
    const m = /^analisis-(\d+)$/.exec(kunci);
    penyimpan.setQueryData(m ? ["analisis", Number(m[1])] : [kunci], nilai);
    if (kunci === "riwayat") penyimpan.setQueryData([kunci, ""], nilai);
  }
  for (const hasil of Object.values(contoh.DEMO_HASIL_PER_ID)) penyimpan.setQueryData(["analisis", hasil.id], hasil);
  return penyimpan;
}

function render(Komponen, { alamat = "/", isian, properti } = {}) {
  const penyimpan = penyimpanData(isian);
  try {
    return renderToStaticMarkup(createElement(QueryClientProvider, { client: penyimpan },
      createElement(MemoryRouter, { initialEntries: [alamat] }, createElement(Komponen, properti))));
  } finally { penyimpan.clear(); }
}

// Contoh hasil hanya untuk uji render; aplikasi sendiri tidak membawa contoh hasil.
function indeks(n) {
  const kunci = ["keseragaman_ukuran", "keseragaman_warna", "keutuhan_fisik", "kebersihan_lot", "tekstur_permukaan"];
  const label = ["Keseragaman ukuran", "Keseragaman warna", "Keutuhan fisik", "Bebas cacat fisik", "Tekstur permukaan"];
  return kunci.map((k, i) => ({ kunci: k, label: label[i], nilai: n - i, dasar: "uji", nilai_mentah: 0.1, penjelasan: `Penjelasan ${k}.` }));
}
const HASIL = {
  id: 5, komoditas_slug: "melon", varietas_id: 1, dibuat_pada: "2026-10-01T08:00:00Z",
  gerbang_citra: { lolos: true, masalah: [], ketajaman: 120, luminans_rata2: 150, rentang_dinamis: 140, lebar_px: 1600, tinggi_px: 1200 },
  skala: { px_per_mm: null, sumber: "tidak_ada", sisi_penanda_mm: null, ukuran_absolut: false },
  segmentasi: { jumlah_benih: 64, kanal_dipakai: "value_inv", dibuang_karena_tepi: 2, dipisah_watershed: 3, rasio_objek: 0.1 },
  fitur_lot: { n_seeds: 64, area_cv: 0.09, length_mean_mm: null },
  indeks_terukur: indeks(90), indeks_mutu_fisik: 86.2, estimasi_fisiologis: [],
  putusan: { skor: null, kelas: "Belum dapat dinilai", dapat_diedarkan: null, gerbang_ambang_edar_aktif: false, alasan: "Estimasi belum tersedia.", ambang_edar: null },
};
const ESTIMASI = {
  target: "daya_berkecambah", label: "Daya Berkecambah (%)", nilai: 94.2, batas_bawah: 87.6, batas_atas: 100,
  mae_validasi: 2.71, r2_validasi: 0.712, n_sampel_kalibrasi: 34, di_luar_rentang_kalibrasi: false, z_maksimum: 1.4, catatan: "Estimasi model.",
};
const HASIL_KALIBRASI = {
  ...HASIL, estimasi_fisiologis: [ESTIMASI],
  putusan: {
    skor: 93.1, kelas: "Sangat Baik", dapat_diedarkan: true, gerbang_ambang_edar_aktif: true, alasan: "Skor berbobot.",
    ambang_edar: { min_daya_berkecambah: 75, terverifikasi: false, status: "diisi_operator", sumber: "Kepmentan 42/2019", catatan: "Belum diverifikasi." },
  },
};

for (const nama of ["Beranda", "Analisis", "Riwayat", "Kalibrasi", "Standar", "Varietas", "Metodologi"]) {
  test(`${nama}: halaman dengan data demo dapat dirender tanpa angka tidak valid`, async () => {
    const { default: Komponen } = await server.ssrLoadModule(`/src/routes/${nama}.tsx`);
    const isi = render(Komponen);
    assert.equal((isi.match(/<h1(?:\s|>)/g) ?? []).length, 1);
    assert.doesNotMatch(isi, /\b(?:undefined|NaN|Infinity)\b/);
    assert.ok(isi.length > 300);
  });
}

test("Lot tanpa kalibrasi: estimasi terkunci, tidak ada meter estimasi", async () => {
  const { default: HasilPanel } = await server.ssrLoadModule("/src/components/HasilPanel.tsx");
  const isi = render(HasilPanel, { properti: { hasil: HASIL, adaCitra: false } });
  assert.match(isi, /model belum lolos validasi/);
  assert.equal((isi.match(/role="meter"/g) ?? []).length, 0);
  assert.match(isi, /86,2/);
});

test("Hasil kalibrasi: estimasi memakai label, rentang, dan asal ambang operator", async () => {
  const { default: HasilPanel } = await server.ssrLoadModule("/src/components/HasilPanel.tsx");
  const isi = render(HasilPanel, { properti: { hasil: HASIL_KALIBRASI, adaCitra: false } });
  assert.equal((isi.match(/role="meter"/g) ?? []).length, 1);
  assert.match(isi, /estimasi 94,2, rentang 87,6 sampai 100,0/);
  assert.match(isi, /diisi operator/);
});

test("Ekstrapolasi: peringatan terlihat tanpa mengubah putusan dari API", async () => {
  const { default: HasilPanel } = await server.ssrLoadModule("/src/components/HasilPanel.tsx");
  const hasil = { ...HASIL_KALIBRASI, estimasi_fisiologis: [{ ...ESTIMASI, di_luar_rentang_kalibrasi: true }] };
  const isi = render(HasilPanel, { properti: { hasil, adaCitra: false } });
  assert.match(isi, /Di luar rentang kalibrasi/);
  assert.match(isi, /tidak digunakan untuk menentukan kelas mutu/);
});

test("Analisis tanpa server: varietas bisa dipilih, tanpa contoh hasil", async () => {
  const { default: Komponen } = await server.ssrLoadModule("/src/routes/Analisis.tsx");
  const isi = render(Komponen);
  for (const v of ["Golden Aroma", "Honey Globe", "Apollo", "Benih petani"]) assert.match(isi, new RegExp(v));
  assert.match(isi, /type="radio"/);
  assert.match(isi, /accept="image\/jpeg,image\/png"/);
});

test("Kalibrasi kosong: kemajuan 0 dari syarat, tanpa angka model", async () => {
  const { default: Komponen } = await server.ssrLoadModule("/src/routes/Kalibrasi.tsx");
  const isi = render(Komponen);
  assert.match(isi, /0 dari 30 lot/);
  assert.doesNotMatch(isi, /NaN|Infinity/);
});

test("Riwayat: hasil rincian dapat dibuka lewat alamat lot", async () => {
  const { default: Komponen } = await server.ssrLoadModule("/src/routes/Riwayat.tsx");
  const isi = render(Komponen, { alamat: "/riwayat?lot=5", isian: { "analisis-5": HASIL } });
  assert.match(isi, /Lot #5/);
  assert.match(isi, /Kembali ke riwayat/);
});

test("Kerangka: label tanpa server dan semua tujuan navigasi tersedia", async () => {
  const { default: Komponen } = await server.ssrLoadModule("/src/components/Shell.tsx");
  const isi = render(Komponen);
  assert.match(isi, /Mode tanpa server/);
  assert.match(isi, /id="isi"/);
  for (const tujuan of ["analisis", "riwayat", "varietas"]) assert.ok(isi.includes(`href="/${tujuan}"`), tujuan);
});

test("Riwayat dan varietas kosong: petunjuk langkah berikutnya tetap tersedia", async () => {
  const { default: Riwayat } = await server.ssrLoadModule("/src/routes/Riwayat.tsx");
  const { default: Varietas } = await server.ssrLoadModule("/src/routes/Varietas.tsx");
  assert.match(render(Riwayat, { isian: { riwayat: [] } }), /Belum ada lot/);
  assert.match(render(Varietas, { isian: { varietas: [] } }), /Belum ada varietas terdaftar/);
});

test("Status galat: tidak menampilkan data contoh sebagai hasil server", async () => {
  const { default: Riwayat } = await server.ssrLoadModule("/src/routes/Riwayat.tsx");
  const penyimpan = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false, gcTime: Infinity } } });
  penyimpan.getQueryCache().build(penyimpan, { queryKey: ["riwayat"] }).setState({ status: "error", error: new Error("Server tidak tersedia"), errorUpdatedAt: Date.now() });
  const isi = renderToStaticMarkup(createElement(QueryClientProvider, { client: penyimpan }, createElement(MemoryRouter, null, createElement(Riwayat))));
  assert.match(isi, /Data tidak dapat dimuat/);
  penyimpan.clear();
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

// Muat modul asli tanpa Vite agar pergantian data nyata ke demo dapat diuji.
function muat(nama, ambil) {
  const sumber = readFileSync(new URL(`../src/lib/${nama}.ts`, import.meta.url), "utf8");
  const kode = ts.transpileModule(sumber.replace("import.meta.env.VITE_API_BASE", '""'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const keluaran = {};
  runInNewContext(kode, {
    exports: keluaran,
    require: (alamat) => muat(alamat.slice(2), ambil),
    fetch: ambil, AbortController, setTimeout, clearTimeout, FormData,
  });
  return keluaran;
}

test("Server tidak tersedia: kosong dan jujur, analisis ditolak", async () => {
  const modul = muat("api", async () => { throw new Error("Luring"); });
  const ringkasan = await modul.api.ringkasan();
  assert.equal(modul.modeSekarang(), "demo");
  assert.equal(ringkasan.total, 0);
  assert.equal((await modul.api.riwayat()).length, 0);
  assert.ok((await modul.api.kalibrasi()).every((m) => m.sampel_tersedia === 0 && !m.siap_pakai));
  assert.equal((await modul.api.varietas()).length, 4);
  await assert.rejects(modul.api.detail(1), { status: 404 });
  await assert.rejects(modul.api.analisis(null, "melon", 1), { status: 503 });
});

test("Galat data server tidak diganti dengan angka contoh", async () => {
  const modul = muat("api", async (alamat) => new Response(
    alamat.endsWith("kesehatan") ? "{}" : "Server gagal", {
      status: alamat.endsWith("kesehatan") ? 200 : 500,
    },
  ));
  await assert.rejects(modul.api.ringkasan(), { status: 500 });
  assert.equal(modul.modeSekarang(), "langsung");
});

test("Rincian historis memakai identitas dan jumlah benih dari server", async () => {
  const modul = muat("api", async (alamat) => new Response(JSON.stringify(
    alamat.endsWith("kesehatan") ? {} : {
      id: 91, n_benih: 23, indeks: [], estimasi: [], gerbang: { lolos: true },
    },
  )));
  const hasil = await modul.api.detail(91);
  assert.equal(hasil.id, 91);
  assert.equal(hasil.segmentasi.jumlah_benih, 23);
  assert.equal(hasil.gerbang_citra.lolos, true);
  assert.equal(hasil.estimasi_fisiologis.length, 0);
});

test("Mode tanpa server tidak membawa satu pun hasil contoh", () => {
  const contoh = muat("demo");
  assert.equal(Object.keys(contoh.DEMO_HASIL_PER_ID).length, 0);
  assert.equal(contoh.DEMO_RIWAYAT.length, 0);
});

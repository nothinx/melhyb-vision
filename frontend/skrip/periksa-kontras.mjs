/**
 * Penjaga kontras token warna.
 *
 * Enam pasangan warna di styles.css pernah berada di bawah ambang WCAG AA,
 * termasuk lencana yang membawa putusan lolos/tidak lolos edar. Nilainya
 * sudah diperbaiki, tetapi token warna gampang digeser sedikit demi sedikit
 * dan tidak ada yang memberi tahu — kegagalan kontras tidak memunculkan
 * galat apa pun, cuma teks yang makin sulit dibaca.
 *
 * Skrip ini membaca styles.css apa adanya, jadi tidak ada daftar warna kedua
 * yang bisa ikut basi. Tanpa dependensi: `node skrip/periksa-kontras.mjs`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = dirname(dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(join(AKAR, "src/styles.css"), "utf8");

/** Ambil satu blok deklarasi token, dari `pembuka` sampai `}` terdekat. */
function blok(pembuka) {
  const i = css.indexOf(pembuka);
  if (i < 0) throw new Error(`Blok tidak ditemukan di styles.css: ${pembuka}`);
  const isi = css.slice(i + pembuka.length, css.indexOf("}", i));
  const token = {};
  for (const [, nama, nilai] of isi.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    token[nama] = nilai;
  }
  return token;
}

const TERANG = blok(":root {");
const GELAP = { ...TERANG, ...blok(':root[data-theme="dark"] {') };

const kanal = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const luminans = (h) => {
  const [r, g, b] = rgb(h).map(kanal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const rasio = (a, b) => {
  const [x, y] = [luminans(a), luminans(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** Warna semitransparan di atas latar, seperti `bg-good/12` milik Tailwind. */
const lapis = (depan, alfa, latar) =>
  "#" +
  rgb(depan)
    .map((v, i) => Math.round(v * alfa + rgb(latar)[i] * (1 - alfa)))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");

/**
 * Ambang: 4,5 untuk teks kecil (lencana `.eyebrow` 10,5px termasuk),
 * 3,0 untuk teks besar seperti judul `.display`.
 */
const PERIKSA = [
  ["muted / ground", (t) => [t.muted, t.ground], 4.5],
  ["muted / surface", (t) => [t.muted, t.surface], 4.5],
  ["muted / surface-2", (t) => [t.muted, t["surface-2"]], 4.5],
  ["ink-2 / surface", (t) => [t["ink-2"], t.surface], 4.5],
  ["ink-2 / plane (label spesimen)", (t) => [t["ink-2"], t.plane], 4.5],
  ["ink / plane (kontrol spesimen)", (t) => [t.ink, t.plane], 4.5],
  ["ground / ink (susunan aktif)", (t) => [t.ground, t.ink], 4.5],
  ["garis-kontrol / plane", (t) => [t["garis-kontrol"], t.plane], 3.0],
  ["accent / surface", (t) => [t.accent, t.surface], 4.5],
  ["accent-ink / accent", (t) => [t["accent-ink"], t.accent], 4.5],
  ["accent / accent-soft", (t) => [t.accent, t["accent-soft"]], 4.5],
  ["muted / kaca navigasi", (t) => [t.muted, lapis(t.surface, 0.88, t.ground)], 4.5],
  ["muted / kaca kontur", (t) => [t.muted, lapis(t.surface, 0.74, t["accent-soft"])], 4.5],
  ["ink-2 / kaca kontur", (t) => [t["ink-2"], lapis(t.surface, 0.74, t["accent-soft"])], 4.5],
  ["garis-kontrol / kaca navigasi", (t) => [t["garis-kontrol"], lapis(t.surface, 0.88, t.ground)], 3.0],
  ["estimasi / estimasi-soft", (t) => [t.estimasi, t["estimasi-soft"]], 4.5],
  ["accent / ground (judul aksen)", (t) => [t.accent, t.ground], 3.0],
  ["accent-deep / accent-soft (lencana aksen)", (t) => [t["accent-deep"], t["accent-soft"]], 4.5],
  ["ukur / ukur-soft (lencana terukur)", (t) => [t.ukur, t["ukur-soft"]], 4.5],
  ["ink-2 / ukur-soft (kartu terukur)", (t) => [t["ink-2"], t["ukur-soft"]], 4.5],
  ["ink-2 / estimasi-soft (kartu estimasi)", (t) => [t["ink-2"], t["estimasi-soft"]], 4.5],
  ["estimasi / surface (tautan estimasi)", (t) => [t.estimasi, t.surface], 4.5],
  // Batas kontrol: ambang 3,0 (WCAG 1.4.11, komponen antarmuka). Bukan
  // --line, yang memang sengaja nyaris tak terlihat sebagai tepi kartu.
  ["garis-kontrol / ground", (t) => [t["garis-kontrol"], t.ground], 3.0],
  ["garis-kontrol / surface", (t) => [t["garis-kontrol"], t.surface], 3.0],
  ["garis-kontrol / surface-2", (t) => [t["garis-kontrol"], t["surface-2"]], 3.0],
  ["accent / ground (batas tombol garis)", (t) => [t.accent, t.ground], 3.0],
  ["status-critical / ground (batas tombol bahaya)",
    (t) => [t["status-critical"], t.ground], 3.0],
  // Lencana putusan: latarnya warna status semitransparan, dan kartu bisa
  // berdiri di atas ground maupun surface — keduanya harus lolos.
  ...["ground", "surface"].flatMap((alas) => [
    [`good-ink / good@12% di ${alas}`,
      (t) => [t["good-ink"], lapis(t["status-good"], 0.12, t[alas])], 4.5],
    [`critical-ink / critical@12% di ${alas}`,
      (t) => [t["critical-ink"], lapis(t["status-critical"], 0.12, t[alas])], 4.5],
    [`warning-ink / warning@15% di ${alas}`,
      (t) => [t["warning-ink"], lapis(t["status-warning"], 0.15, t[alas])], 4.5],
    [`serious-ink / serious@15% di ${alas}`,
      (t) => [t["serious-ink"], lapis(t["status-serious"], 0.15, t[alas])], 4.5],
  ]),
];

let gagal = 0;
for (const [nama, tema] of [["terang", TERANG], ["gelap", GELAP]]) {
  for (const [label, ambil, minimum] of PERIKSA) {
    const [depan, latar] = ambil(tema);
    if (!depan || !latar) {
      console.error(`GAGAL  ${nama}: token hilang untuk "${label}"`);
      gagal++;
      continue;
    }
    const r = rasio(depan, latar);
    if (r < minimum) {
      console.error(
        `GAGAL  ${nama}  ${r.toFixed(2)}:1 < ${minimum}  ${label}  [${depan} / ${latar}]`,
      );
      gagal++;
    }
  }
}

if (gagal) {
  console.error(`\n${gagal} pasangan warna di bawah ambang WCAG AA.`);
  process.exit(1);
}
console.log(`Kontras: ${PERIKSA.length * 2} pasangan lolos WCAG AA.`);

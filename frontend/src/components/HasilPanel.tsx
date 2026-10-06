import { AlertTriangle, ChevronDown, Lock, Ruler, ShieldAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { KELAS_STATUS, angka, judulKunci } from "../lib/format";
import type { HasilAnalisis, Indeks } from "../lib/types";
import { PEGAS } from "../lib/animasi";
import { Badge, Notice, TableWrap, Td, Th } from "./ui";

/** Cincin skor: busur = nilai/100. */
function Cincin({ nilai, warna }: { nilai: number; warna: string }) {
  const kurangi = useReducedMotion();
  const r = 70, k = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 160 160" className="size-40 shrink-0 -rotate-90 sm:size-48" aria-hidden>
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
      <motion.circle cx="80" cy="80" r={r} fill="none" stroke={warna} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={k} initial={{ strokeDashoffset: kurangi ? k * (1 - nilai / 100) : k }}
        animate={{ strokeDashoffset: k * (1 - Math.max(0, Math.min(100, nilai)) / 100) }}
        transition={{ duration: 1.4, ease: PEGAS, delay: 0.15 }} />
    </svg>
  );
}

/** Jaring laba-laba lima indeks terukur. */
function Radar({ indeks }: { indeks: Indeks[] }) {
  const kurangi = useReducedMotion();
  const n = indeks.length, c = 150, R = 100;
  const titik = (i: number, v: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v] as const;
  };
  const poli = (v: (i: number) => number) => indeks.map((_, i) => titik(i, v(i)).join(",")).join(" ");
  return (
    <svg viewBox="-40 -10 380 320" className="mx-auto h-auto w-full max-w-[380px] overflow-visible" role="img"
      aria-label={`Profil indeks terukur: ${indeks.map((i) => `${i.label} ${angka(i.nilai)}`).join(", ")}`}>
      {[0.25, 0.5, 0.75, 1].map((t) => <polygon key={t} points={poli(() => t)} fill="none" stroke="var(--line)" strokeWidth="1" />)}
      {indeks.map((_, i) => { const [x, y] = titik(i, 1); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line-soft)" />; })}
      <motion.polygon points={poli((i) => indeks[i].nilai / 100)} fill="color-mix(in oklab, var(--ukur) 22%, transparent)" stroke="var(--ukur)" strokeWidth="2" strokeLinejoin="round"
        style={{ transformOrigin: "150px 150px" }} initial={kurangi ? false : { scale: 0.2, opacity: 0.3 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1, ease: PEGAS }} />
      {indeks.map((d, i) => {
        const [x, y] = titik(i, d.nilai / 100);
        const [lx, ly] = titik(i, 1.18);
        return <g key={d.kunci}>
          <circle cx={x} cy={y} r="3.5" fill="var(--ukur)" />
          <text x={lx} y={ly} textAnchor={lx < c - 10 ? "end" : lx > c + 10 ? "start" : "middle"} dominantBaseline="middle" className="mono" fontSize="10" fill="var(--muted)">
            {d.label.replace("Keseragaman ", "Seragam ").replace("Bebas cacat fisik", "Bebas cacat").replace("Tekstur permukaan", "Tekstur").replace("Keutuhan fisik", "Keutuhan")}
          </text>
        </g>;
      })}
    </svg>
  );
}

/** Estimasi digambar sebagai selang: pita = rentang, garis tegak = nilai titik. */
function MeterSelang({ nilai, bawah, atas, label }: { nilai: number; bawah: number; atas: number; label: string }) {
  const b = Math.max(0, Math.min(100, bawah)), a = Math.max(0, Math.min(100, atas)), n = Math.max(0, Math.min(100, nilai));
  return (
    <div className="relative h-4" role="meter" aria-valuenow={Math.round(nilai)} aria-valuemin={0} aria-valuemax={100}
      aria-label={`${label}: estimasi ${angka(nilai)}, rentang ${angka(bawah)} sampai ${angka(atas)}`}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
      <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-estimasi/30" style={{ left: `${b}%`, width: `${Math.max(a - b, 0.6)}%` }} />
      <div className="absolute top-0 h-full w-[3px] -translate-x-1/2 rounded-full bg-estimasi" style={{ left: `${n}%` }} />
    </div>
  );
}

export default function HasilPanel({ hasil, adaCitra = true }: { hasil: HasilAnalisis; adaCitra?: boolean }) {
  const { putusan, skala, segmentasi, gerbang_citra } = hasil;
  const [citraGagal, setCitraGagal] = useState(false);
  const [buka, setBuka] = useState<string | null>(null);
  const belum = putusan.skor === null;
  const ditahan = putusan.dapat_diedarkan === false;
  const nada = ditahan ? "critical" : belum ? "netral" : KELAS_STATUS[putusan.kelas]?.nada ?? "netral";
  const warnaCincin = ditahan ? "var(--status-critical)" : belum ? "var(--ukur)" : KELAS_STATUS[putusan.kelas]?.warna ?? "var(--ukur)";
  const nilaiUtama = belum ? hasil.indeks_mutu_fisik : (putusan.skor ?? 0);

  return (
    <div className="grid min-w-0 gap-5">
      {/* Putusan */}
      <section className={`kartu flex flex-col gap-8 p-6 sm:flex-row sm:items-center sm:p-9 ${ditahan ? "border-critical/50" : ""}`}>
        <div className="relative grid place-items-center">
          <Cincin nilai={nilaiUtama} warna={warnaCincin} />
          <div className="absolute grid place-items-center text-center">
            <span className="display tnum text-[2.6rem] text-ink sm:text-[3rem]">{angka(nilaiUtama)}</span>
            <span className="mono text-mikro text-muted">{belum ? "mutu fisik /100" : "skor /100"}</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge nada={nada} ikon={ditahan ? <ShieldAlert size={13} /> : undefined}>{putusan.kelas}</Badge>
            <Badge nada="ukur">{segmentasi.jumlah_benih} benih terdeteksi</Badge>
            {skala.ukuran_absolut && <Badge nada="netral" ikon={<Ruler size={13} />}>Ukuran dalam mm</Badge>}
          </div>
          <p className="mt-4 mb-0 max-w-[68ch] text-sedang text-ink-2">{putusan.alasan}</p>
        </div>
      </section>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-5">
          {/* Indeks terukur */}
          <section className="kartu p-6 sm:p-8" aria-labelledby="judul-terukur">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 id="judul-terukur" className="display-kecil m-0 text-judul-kecil text-ink">Indeks terukur</h2>
                <p className="mt-1 mb-0 text-dasar text-muted">Dihitung dari piksel tiap benih. Pilih indeks untuk melihat dasarnya.</p>
              </div>
              <Badge nada="ukur">Terukur</Badge>
            </div>
            <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <Radar indeks={hasil.indeks_terukur} />
              <ul className="m-0 grid list-none gap-1 p-0">
                {hasil.indeks_terukur.map((i) => (
                  <li key={i.kunci}>
                    <button type="button" aria-expanded={buka === i.kunci} onClick={() => setBuka(buka === i.kunci ? null : i.kunci)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2">
                      <span className="min-w-0 flex-1 text-dasar text-ink">{i.label}</span>
                      <span className="mono tnum text-sedang text-ink">{angka(i.nilai)}</span>
                      <ChevronDown size={15} className={`text-muted transition-transform ${buka === i.kunci ? "rotate-180" : ""}`} />
                    </button>
                    {buka === i.kunci && <p className="masuk-lembut mx-3 mt-0 mb-3 text-kecil text-muted">{i.penjelasan}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Estimasi */}
          <section className="kartu p-6 sm:p-8" aria-labelledby="judul-estimasi">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 id="judul-estimasi" className="display-kecil m-0 text-judul-kecil text-ink">Estimasi perkecambahan</h2>
                <p className="mt-1 mb-0 text-dasar text-muted">Prediksi dari ciri fisik, hanya setelah model lolos validasi terhadap uji UKDdP.</p>
              </div>
              <Badge nada="estimasi">Estimasi</Badge>
            </div>
            {hasil.estimasi_fisiologis.length === 0 ? (
              <div className="flex items-start gap-4 rounded-2xl border border-dashed border-estimasi/40 p-5">
                <Lock size={20} className="mt-0.5 shrink-0 text-estimasi" />
                <p className="m-0 text-dasar text-ink-2">
                  Belum tersedia karena model belum lolos validasi. Angka yang tidak bisa dipertanggungjawabkan tidak ditampilkan. <Link className="text-estimasi underline underline-offset-4" to="/kalibrasi">Lihat kesiapan model</Link>
                </p>
              </div>
            ) : (
              <ul className="m-0 grid list-none gap-7 p-0">
                {hasil.estimasi_fisiologis.map((e) => (
                  <li key={e.target}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="text-dasar font-semibold text-ink">{e.label}</span>
                      <span className="mono tnum text-sedang text-ink">{angka(e.nilai)} <span className="text-kecil text-muted">({angka(e.batas_bawah)} sampai {angka(e.batas_atas)})</span></span>
                    </div>
                    <MeterSelang label={e.label} nilai={e.nilai} bawah={e.batas_bawah} atas={e.batas_atas} />
                    <p className="mt-2 mb-0 text-kecil text-muted">{e.catatan} Validasi silang: MAE {angka(e.mae_validasi, 2)}, R² {angka(e.r2_validasi, 3)}, dari {e.n_sampel_kalibrasi} lot.</p>
                    {e.di_luar_rentang_kalibrasi && <div className="mt-3"><Notice nada="warning" judul="Di luar rentang kalibrasi">Ciri lot ini berada di luar rentang data pelatihan. Estimasi ditampilkan sebagai informasi dan tidak digunakan untuk menentukan kelas mutu.</Notice></div>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid min-w-0 content-start gap-5">
          {adaCitra && (
            <section className="kartu overflow-hidden p-3" aria-label="Foto dengan kontur benih">
              {citraGagal ? (
                <p className="m-0 rounded-2xl border border-dashed border-line px-4 py-10 text-center text-kecil text-muted">Foto tidak dapat dimuat. Angka hasil analisis tetap tersedia di halaman ini.</p>
              ) : (
                <img src={api.citraUrl(hasil.id, true)} alt={`Foto lot benih dengan ${segmentasi.jumlah_benih} kontur benih ditandai`}
                  width={gerbang_citra?.lebar_px} height={gerbang_citra?.tinggi_px} loading="lazy"
                  className="h-auto w-full rounded-2xl bg-surface-2" onError={() => setCitraGagal(true)} />
              )}
              <dl className="m-0 grid gap-2 px-3 pt-4 pb-2 text-kecil">
                <div className="flex justify-between gap-3"><dt className="text-muted">Benih terdeteksi</dt><dd className="mono m-0 text-ink">{segmentasi.jumlah_benih}</dd></div>
                {segmentasi.dibuang_karena_tepi !== undefined && <div className="flex justify-between gap-3"><dt className="text-muted">Terpotong tepi foto</dt><dd className="mono m-0 text-ink">{segmentasi.dibuang_karena_tepi}</dd></div>}
                {segmentasi.dipisah_watershed !== undefined && <div className="flex justify-between gap-3"><dt className="text-muted">Benih berdempetan dipisah</dt><dd className="mono m-0 text-ink">{segmentasi.dipisah_watershed}</dd></div>}
              </dl>
            </section>
          )}

          <section className="kartu p-6">
            <h2 className="display-kecil m-0 mb-3 text-judul-kecil text-ink">Skala</h2>
            <p className="m-0 text-dasar text-ink-2">
              {skala.ukuran_absolut
                ? <>Penanda ArUco terdeteksi, <span className="mono">{angka(skala.px_per_mm, 2)} px/mm</span>. Ukuran dalam milimeter bisa dibandingkan antar foto.</>
                : "Penanda skala tidak ditemukan. Ukuran dinilai relatif; milimeter belum tersedia. Sertakan penanda ArUco 20 mm bila diperlukan."}
            </p>
          </section>

          {putusan.ambang_edar && !putusan.ambang_edar.terverifikasi && (
            <Notice nada="warning" ikon={<AlertTriangle size={16} />} judul="Status ambang">
              Ambang {putusan.ambang_edar.min_daya_berkecambah}% berstatus <strong>{putusan.ambang_edar.status === "diisi_operator" ? "diisi operator" : putusan.ambang_edar.status.replaceAll("_", " ")}</strong>. {putusan.ambang_edar.catatan}
              <span className="mt-2 block text-kecil text-muted">Rujukan: {putusan.ambang_edar.sumber}</span>
            </Notice>
          )}

          <details className="rincian-teknis kartu px-6 py-2">
            <summary>Data mentah lot</summary>
            <div className="pb-4">
              <TableWrap>
                <thead><tr><Th>Ciri</Th><Th align="right">Nilai</Th></tr></thead>
                <tbody>
                  {Object.entries(hasil.fitur_lot).map(([k, v]) => (
                    <tr key={k}><Td className="text-kecil">{judulKunci(k)}</Td><Td num>{v === null ? "-" : typeof v === "number" ? angka(v, 4) : String(v)}</Td></tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

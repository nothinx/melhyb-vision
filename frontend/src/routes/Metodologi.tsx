import { useQuery } from "@tanstack/react-query";
import { AlertOctagon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Muncul } from "../components/Gerak";
import { PEGAS } from "../lib/animasi";
import { GalatData, Notice, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { judulKunci } from "../lib/format";

const WARNA = ["var(--ukur)", "var(--accent)", "var(--estimasi)", "#b9892a", "var(--garis-kontrol)"];

/** Bobot sebagai satu batang bertumpuk: bagian dari keseluruhan terlihat sekilas. */
function BatangBobot({ data }: { data: Record<string, number> }) {
  const kurangi = useReducedMotion();
  const urut = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full" role="img"
        aria-label={urut.map(([k, v]) => `${judulKunci(k)} ${Math.round(v * 100)}%`).join(", ")}>
        {urut.map(([k, v], i) => (
          <motion.span key={k} className="h-full origin-left" style={{ width: `${v * 100}%`, background: WARNA[i % WARNA.length] }}
            initial={kurangi ? false : { scaleX: 0.15 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.9, delay: i * 0.08, ease: PEGAS }} />
        ))}
      </div>
      <ul className="mt-5 grid list-none gap-2.5 p-0">
        {urut.map(([k, v], i) => (
          <li key={k} className="flex items-center gap-3 text-dasar">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: WARNA[i % WARNA.length] }} aria-hidden />
            <span className="flex-1 text-ink-2">{judulKunci(k)}</span>
            <span className="mono tnum text-ink">{Math.round(v * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Daftar({ data }: { data: Record<string, string | number> }) {
  return (
    <dl className="m-0 grid gap-px overflow-hidden rounded-2xl border border-line bg-line">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 bg-surface px-5 py-3.5">
          <dt className="text-dasar text-ink-2">{judulKunci(k)}</dt>
          <dd className="mono m-0 text-right text-dasar text-ink">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Metodologi() {
  const q = useQuery({ queryKey: ["metodologi"], queryFn: api.metodologi });
  if (q.isError) return <GalatData ulang={() => q.refetch()} />;
  if (q.isLoading || !q.data) return <Skeleton tinggi={420} />;
  const m = q.data;
  const kelas = [...m.kelas_mutu].sort((a, b) => a.minimal - b.minimal);

  return (
    <div className="grid gap-20">
      <Muncul as="header" className="max-w-[900px]">
        <h1 className="display m-0 text-[clamp(2.4rem,5.2vw,4.2rem)] text-ink">Cara SIGMA menilai.</h1>
        <p className="mt-5 mb-0 max-w-[58ch] text-sedang text-ink-2">Semua bobot dan ambang di halaman ini dibaca langsung dari sistem yang berjalan, bukan disalin ulang.</p>
        <p className="display-kecil mt-10 mb-0 rounded-[28px] border border-line bg-surface p-7 text-[clamp(1.2rem,2.2vw,1.6rem)] text-ink">
          Unit analisis: {m.unit_analisis}.
        </p>
      </Muncul>

      <section className="grid gap-5 lg:grid-cols-2">
        <Muncul className="kartu p-7 sm:p-8">
          <h2 className="display-kecil m-0 text-judul-kecil text-ink">Indeks Mutu Fisik</h2>
          <p className="mt-1 mb-6 text-dasar text-muted">Gabungan berbobot lima indeks terukur.</p>
          <BatangBobot data={m.bobot_indeks_fisik} />
        </Muncul>
        <Muncul jeda={0.08} className="kartu p-7 sm:p-8">
          <h2 className="display-kecil m-0 text-judul-kecil text-ink">Skor akhir</h2>
          <p className="mt-1 mb-6 text-dasar text-muted">Hanya dihitung bila estimasi daya berkecambah layak dipakai.</p>
          <BatangBobot data={m.bobot_skor_akhir} />
        </Muncul>
      </section>

      <Muncul as="section" className="grid gap-6">
        <h2 className="display m-0 text-[clamp(1.8rem,3.2vw,2.4rem)] text-ink">Kelas mutu, dari skor 0 sampai 100.</h2>
        <div className="relative">
          <div className="flex h-14 overflow-hidden rounded-2xl border border-line">
            {kelas.map((k, i) => {
              const atas = kelas[i + 1]?.minimal ?? 100;
              return (
                <div key={k.label} className="flex items-center justify-center border-r border-line bg-surface px-2 text-center text-kecil font-medium text-ink last:border-r-0"
                  style={{ width: `${atas - k.minimal}%`, background: `color-mix(in oklab, var(--ukur) ${8 + i * 14}%, var(--surface))` }}>
                  {k.label}
                </div>
              );
            })}
          </div>
          <div className="relative mt-2 h-5">
            {[...kelas.map((k) => k.minimal), 100].map((n) => (
              <span key={n} className="mono absolute -translate-x-1/2 text-mikro text-muted first:translate-x-0 last:-translate-x-full" style={{ left: `${n}%` }}>{n}</span>
            ))}
          </div>
        </div>
      </Muncul>

      <section className="grid gap-5 lg:grid-cols-3">
        <Muncul><h2 className="display-kecil m-0 mb-4 text-judul-kecil text-ink">Syarat kalibrasi</h2><Daftar data={m.syarat_kalibrasi} /></Muncul>
        <Muncul jeda={0.06}><h2 className="display-kecil m-0 mb-4 text-judul-kecil text-ink">Gerbang kualitas foto</h2><Daftar data={m.gerbang_citra} /></Muncul>
        <Muncul jeda={0.12}><h2 className="display-kecil m-0 mb-4 text-judul-kecil text-ink">Normalisasi indeks</h2><Daftar data={m.normalisasi_indeks} /></Muncul>
      </section>

      <Notice nada="warning" judul="Batasan hasil analisis" ikon={<AlertOctagon size={16} />}>
        <ul className="mt-1 mb-0 grid gap-1.5 pl-4">{m.batasan.map((b) => <li key={b}>{b}</li>)}</ul>
      </Notice>
      <p className="m-0 text-kecil text-muted">Sumber: <code className="mono">GET /api/metodologi</code>. Tanpa server, halaman ini memakai salinan konfigurasi bawaan.</p>
    </div>
  );
}

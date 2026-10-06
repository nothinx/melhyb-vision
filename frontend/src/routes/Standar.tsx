import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileWarning } from "lucide-react";
import { Muncul } from "../components/Gerak";
import { Badge, GalatData, Notice, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import type { Ambang, StandarKomoditas, StatusVerifikasi } from "../lib/types";

const LABEL: Record<StatusVerifikasi, { teks: string; nada: "good" | "warning" | "netral"; arti: string }> = {
  terverifikasi: { teks: "Terverifikasi", nada: "good", arti: "Diperiksa langsung pada dokumen acuan." },
  diisi_operator: { teks: "Diisi operator", nada: "warning", arti: "Dipakai sistem, tetapi belum dicocokkan dengan dokumen." },
  belum_ada: { teks: "Tidak dipakai", nada: "netral", arti: "Belum tersedia, jadi kelayakan edar tidak dinilai." },
};

function Ubin({ label, a }: { label: string; a: Ambang }) {
  return (
    <div className="flex flex-col gap-4 bg-surface p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="text-dasar font-semibold text-ink">{label}</span>
        <Badge nada={LABEL[a.status].nada}>{LABEL[a.status].teks}</Badge>
      </div>
      <span className={`display tnum text-[2.4rem] ${a.nilai === null ? "text-surface-3" : "text-ink"}`}>{a.nilai === null ? "Kosong" : `${a.nilai}${a.satuan}`}</span>
      <p className="m-0 text-kecil text-muted">{a.catatan}</p>
    </div>
  );
}

function Komoditas({ k }: { k: StandarKomoditas }) {
  return (
    <section className="grid gap-10" aria-label={`Standar ${k.nama}`}>
      <div className="grid gap-px overflow-hidden rounded-[28px] border border-line bg-line md:grid-cols-2">
        <Ubin label="Daya berkecambah minimum" a={k.daya_berkecambah_min} />
        <Ubin label="Kadar air maksimum" a={k.kadar_air_maks} />
        <Ubin label="Benih murni minimum" a={k.benih_murni_min} />
        <Ubin label="Biji gulma maksimum" a={k.biji_gulma_maks} />
      </div>
      {k.peringatan && <Notice nada="warning" ikon={<FileWarning size={16} />}>{k.peringatan}</Notice>}
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="display-kecil m-0 mb-4 text-judul-kecil text-ink">Dasar hukum</h2>
          <ul className="m-0 grid list-none gap-3 p-0">
            {k.regulasi.map((r) => <li key={r} className="rounded-2xl border border-line bg-surface p-4 text-dasar text-ink-2">{r}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="display-kecil m-0 mb-4 text-judul-kecil text-ink">Kelas benih</h2>
          <ol className="m-0 grid list-none gap-2 p-0">
            {k.kelas_benih.map((c, i) => (
              <li key={c} className="flex items-center gap-3 text-dasar text-ink-2">
                <span className="mono grid size-8 place-items-center rounded-full border border-line text-mikro">{i + 1}</span>{c}
              </li>
            ))}
          </ol>
          <p className="mt-4 mb-0 text-kecil text-muted">Kelompok regulasi: {k.rezim}. <em>{k.nama_latin}</em>.</p>
        </div>
      </div>
      {k.klaim_beredar.length > 0 && (
        <div>
          <h2 className="display-kecil m-0 mb-4 text-judul-kecil text-ink">Angka beredar yang belum dipakai</h2>
          <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
            {k.klaim_beredar.map((c) => (
              <li key={c.parameter} className="rounded-2xl border border-line bg-surface p-5">
                <span className="text-dasar font-semibold text-ink">{c.parameter}</span>{" "}
                <span className="mono text-muted line-through">{c.nilai}{c.satuan}</span>
                <p className="mt-2 mb-0 text-kecil text-ink-2">{c.keberatan}</p>
                <p className="mt-1 mb-0 text-kecil text-muted">Sumber: {c.sumber}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function Standar() {
  const q = useQuery({ queryKey: ["standar"], queryFn: api.standar });
  if (q.isError) return <GalatData ulang={() => q.refetch()} />;
  const melon = q.data?.komoditas.filter((k) => k.slug === "melon") ?? [];

  return (
    <div className="grid gap-16">
      <Muncul as="header" className="max-w-[860px]">
        <h1 className="display m-0 text-[clamp(2.4rem,5.2vw,4.2rem)] text-ink">Standar mutu benih melon.</h1>
        <p className="mt-5 mb-0 max-w-[58ch] text-sedang text-ink-2">Setiap ambang membawa asal-usulnya. Hanya ambang yang aktif yang ikut menentukan kelayakan edar.</p>
        <ul className="mt-8 grid list-none gap-3 p-0 sm:grid-cols-3">
          {(Object.keys(LABEL) as StatusVerifikasi[]).map((s) => (
            <li key={s} className="rounded-2xl border border-line p-4">
              <Badge nada={LABEL[s].nada}>{LABEL[s].teks}</Badge>
              <p className="mt-2 mb-0 text-kecil text-muted">{LABEL[s].arti}</p>
            </li>
          ))}
        </ul>
      </Muncul>

      {q.isLoading ? <Skeleton tinggi={320} /> : melon.map((k) => <Komoditas key={k.slug} k={k} />)}

      <section className="grid gap-5">
        <h2 className="display m-0 text-[clamp(1.8rem,3.2vw,2.4rem)] text-ink">Tempat memeriksa dokumen asli.</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {q.data?.cara_memperoleh_dokumen.map((d) => (
            <div key={d.sumber} className="rounded-2xl border border-line bg-surface p-5">
              <div className="text-dasar font-semibold text-ink">{d.sumber}</div>
              {d.alamat.startsWith("http")
                ? <a href={d.alamat} target="_blank" rel="noreferrer" className="mono mt-1 inline-flex items-center gap-1 text-kecil break-all text-accent hover:underline">{d.alamat.replace("https://", "")}<ExternalLink size={12} /></a>
                : <div className="mt-1 text-kecil text-muted">{d.alamat}</div>}
              <p className="mt-2 mb-0 text-kecil text-muted">{d.untuk}</p>
            </div>
          ))}
        </div>
      </section>

      {q.data?.isian_operator && (
        <details className="rincian-teknis kartu px-6 py-2">
          <summary>Pengaturan ambang oleh pengelola server</summary>
          <div className="pb-5">
            <p className="mt-2 text-kecil text-muted">{q.data.isian_operator.penjelasan}</p>
            <pre className="mono m-0 overflow-x-auto rounded-xl bg-surface-2 px-4 py-3 text-kecil text-ink-2">{q.data.isian_operator.contoh}</pre>
            {Object.keys(q.data.isian_operator.aktif).length > 0 && (
              <p className="mt-3 mb-0 text-dasar text-ink-2">Sedang aktif: {Object.entries(q.data.isian_operator.aktif).map(([s, n]) => `${s} ${n}%`).join(", ")}.</p>
            )}
          </div>
        </details>
      )}
      {q.data && <p className="m-0 max-w-[70ch] text-kecil text-muted">{q.data.catatan}</p>}
    </div>
  );
}

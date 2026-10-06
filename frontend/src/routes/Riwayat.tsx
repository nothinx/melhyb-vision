import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Download, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import SebaranKelas from "../components/charts/SebaranKelas";
import TrenIMF from "../components/charts/TrenIMF";
import { Muncul } from "../components/Gerak";
import HasilPanel from "../components/HasilPanel";
import { BenihKosong } from "../components/Lambang";
import { Badge, Button, GalatData, Notice, Skeleton } from "../components/ui";
import { useMode } from "../hooks/useMode";
import { api } from "../lib/api";
import { useFokusJudul } from "../lib/fokus";
import { KELAS_STATUS, angka, waktu } from "../lib/format";
import { penanda } from "../lib/varietas";

export default function Riwayat() {
  const mode = useMode();
  const [pencarian, setPencarian] = useState("");
  const [filter, setFilter] = useState("");
  const [parameter, setParameter] = useSearchParams();
  const nomorLot = Number(parameter.get("lot"));
  const terbuka = Number.isSafeInteger(nomorLot) && nomorLot > 0 ? nomorLot : null;
  const setTerbuka = (id: number | null) => setParameter(id === null ? {} : { lot: String(id) });
  const judulDetail = useFokusJudul<HTMLHeadingElement>(terbuka);

  const varietas = useQuery({ queryKey: ["varietas"], queryFn: api.varietas });
  const riwayat = useQuery({ queryKey: ["riwayat"], queryFn: () => api.riwayat() });
  const ringkasan = useQuery({ queryKey: ["ringkasan"], queryFn: api.ringkasan });
  const detail = useQuery({ queryKey: ["analisis", terbuka], queryFn: () => api.detail(terbuka!), enabled: terbuka !== null });
  const cariVarietas = (id: number | null) => varietas.data?.find((v) => v.id === id);

  if (terbuka !== null) {
    return (
      <div className="grid min-w-0 gap-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mono m-0 text-kecil text-muted">Rincian lot</p>
            <h1 ref={judulDetail} tabIndex={-1} className="display mt-3 mb-0 text-[clamp(2.2rem,4.6vw,3.8rem)] text-ink outline-none">Lot #{terbuka}</h1>
          </div>
          <Button variant="hantu" onClick={() => setTerbuka(null)}><ArrowLeft size={16} />Kembali ke riwayat</Button>
        </header>
        {detail.isError ? (
          <Notice nada="critical" judul="Rincian lot tidak dapat dibuka">
            <p className="mt-0 mb-3">{detail.error.message}</p>
            <Button variant="hantu" onClick={() => detail.refetch()}>Coba lagi</Button>
          </Notice>
        ) : detail.isLoading || !detail.data ? <Skeleton tinggi={420} /> : <HasilPanel hasil={detail.data} adaCitra={mode === "langsung"} />}
      </div>
    );
  }

  if (riwayat.isError || ringkasan.isError) return <GalatData ulang={() => { void riwayat.refetch(); void ringkasan.refetch(); }} />;

  const semua = riwayat.data ?? [];
  const q = pencarian.trim().toLowerCase();
  const terlihat = semua.filter((r) =>
    (!filter || String(r.varietas_id) === filter)
    && `${r.id} ${cariVarietas(r.varietas_id)?.nama ?? r.komoditas_slug}`.toLowerCase().includes(q));
  const tercatat = new Set(semua.map((r) => r.varietas_id).filter(Boolean)).size;

  return (
    <div className="grid gap-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[760px]">
          <h1 className="display m-0 text-[clamp(2.4rem,5.2vw,4.2rem)] text-ink">Riwayat lot.</h1>
          <p className="mt-5 mb-0 max-w-[54ch] text-sedang text-ink-2">Setiap foto yang dianalisis tersimpan di sini bersama varietasnya, untuk dibuka ulang dan dibandingkan.</p>
        </div>
        {mode === "langsung" && semua.length > 0 && (
          <a href={api.eksporUrl()} className="inline-flex h-12 items-center gap-2 rounded-full border border-garis-kontrol px-5 text-dasar font-medium text-ink hover:bg-surface-2">
            <Download size={16} />Unduh CSV
          </a>
        )}
      </header>

      {riwayat.isLoading ? <Skeleton tinggi={320} /> : semua.length === 0 ? (
        <Muncul className="relative isolate grid gap-10 overflow-hidden rounded-[36px] border border-line bg-surface p-8 sm:p-14 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-[560px]">
            <h2 className="display m-0 text-[clamp(1.8rem,3.4vw,2.6rem)] text-ink">Belum ada lot.</h2>
            <p className="mt-4 mb-0 text-sedang text-ink-2">
              Setelah foto pertama dianalisis, di sini akan muncul daftar lot, sebaran kelas mutu, dan tren mutu fisik per varietas.
            </p>
            <Link to="/analisis" className="group mt-8 inline-flex h-13 items-center gap-2 rounded-full bg-accent px-7 text-sedang font-semibold text-accent-ink transition-[filter] hover:brightness-110">
              Mulai analisis <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="justify-self-center opacity-90"><BenihKosong ukuran={260} /></div>
        </Muncul>
      ) : (
        <>
          <section aria-label="Ringkasan" className="grid gap-px overflow-hidden rounded-[28px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Lot dianalisis", String(ringkasan.data?.total ?? semua.length)],
              ["Rerata mutu fisik", ringkasan.data?.imf_rata2 == null ? "-" : `${angka(ringkasan.data.imf_rata2)}`],
              ["Lot dengan skor akhir", String(ringkasan.data?.berkalibrasi ?? 0)],
              ["Varietas tercatat", String(tercatat)],
            ].map(([k, n]) => (
              <div key={k} className="bg-surface px-7 py-6">
                <div className="eyebrow text-muted">{k}</div>
                <div className="display tnum mt-3 text-[2.4rem] text-ink">{n}</div>
              </div>
            ))}
          </section>

          <div className="grid min-w-0 gap-5 lg:grid-cols-2">
            <div className="kartu p-6 sm:p-7"><SebaranKelas sebaran={ringkasan.data?.sebaran_kelas ?? {}} /></div>
            <div className="kartu p-6 sm:p-7"><TrenIMF riwayat={semua} /></div>
          </div>

          <section aria-labelledby="judul-daftar" className="grid gap-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="judul-daftar" className="display-kecil m-0 text-judul text-ink">Daftar lot</h2>
              <div className="relative w-full sm:w-80">
                <label htmlFor="cari-lot" className="sr-only">Cari nomor lot atau varietas</label>
                <Search size={17} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" aria-hidden />
                <input id="cari-lot" type="search" className="medan rounded-full pl-11" value={pencarian} onChange={(e) => setPencarian(e.target.value)} placeholder="Nomor lot atau varietas" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Saring menurut varietas">
              {[{ id: "", nama: "Semua", warna: "" }, ...(varietas.data ?? []).map((v) => ({ id: String(v.id), nama: v.nama, warna: penanda(v).daging }))].map((k) => (
                <button key={k.id || "semua"} type="button" onClick={() => setFilter(k.id)} aria-pressed={filter === k.id}
                  className={`relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-kecil font-medium transition-colors ${filter === k.id ? "text-accent-ink" : "text-ink-2 hover:bg-surface-2"}`}>
                  {filter === k.id && <motion.span layoutId="saring-aktif" className="absolute inset-0 -z-10 rounded-full bg-accent" />}
                  {k.warna && <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: k.warna }} aria-hidden />}
                  {k.nama}
                </button>
              ))}
            </div>

            {!terlihat.length ? (
              <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-dasar text-muted">Tidak ada lot yang cocok. Ubah pencarian atau pilih Semua.</p>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0">
                <AnimatePresence initial={false}>
                  {terlihat.map((r) => {
                    const v = cariVarietas(r.varietas_id);
                    const p = v ? penanda(v) : null;
                    return (
                      <motion.li key={r.id} layout initial={{ opacity: 0.3, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <button type="button" onClick={() => setTerbuka(r.id)}
                          className="group grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-4 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-garis-kontrol sm:grid-cols-[auto_1fr_auto_auto] sm:px-6">
                          <span aria-hidden className="size-11 rounded-full ring-4 ring-surface-2" style={{ background: p ? `radial-gradient(circle, ${p.daging} 45%, ${p.kulit} 47%)` : "var(--surface-3)" }} />
                          <span className="min-w-0">
                            <span className="block truncate text-sedang font-semibold text-ink">{v?.nama ?? "Varietas tidak dicatat"} <span className="mono text-kecil font-normal text-muted">#{r.id}</span></span>
                            <span className="block truncate text-kecil text-muted">{waktu(r.dibuat_pada)} · {r.n_benih} benih</span>
                          </span>
                          <span className="hidden sm:block"><Badge nada={KELAS_STATUS[r.kelas]?.nada ?? "netral"}>{r.kelas}</Badge></span>
                          <span className="text-right">
                            <span className="display tnum block text-[1.6rem] text-ink">{angka(r.skor_akhir ?? r.indeks_mutu_fisik)}</span>
                            <span className="mono block text-mikro text-muted">{r.skor_akhir === null ? "mutu fisik" : "skor"}</span>
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

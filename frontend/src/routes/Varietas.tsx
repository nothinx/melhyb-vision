import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, ShieldOff } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Muncul } from "../components/Gerak";
import IrisanVarietas from "../components/IrisanVarietas";
import { Empty, GalatData, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { angka } from "../lib/format";
import { penanda, tanpaTitik } from "../lib/varietas";

const ENTITAS = [
  { nama: "Komoditas", isi: "nama, nama latin" },
  { nama: "Varietas", isi: "nama, tipe, pemulia, nomor pendaftaran, ciri acuan" },
  { nama: "Lot (batch)", isi: "kode, varietas, produsen, nomor lot, tanggal panen" },
  { nama: "Analisis", isi: "foto, indeks, estimasi, putusan" },
  { nama: "Uji UKDdP", isi: "jumlah benih, hitungan pertama dan akhir, hasil" },
];

export default function Varietas() {
  const varietas = useQuery({ queryKey: ["varietas"], queryFn: api.varietas });
  const riwayat = useQuery({ queryKey: ["riwayat"], queryFn: () => api.riwayat() });
  const kurangi = useReducedMotion();
  const lokasi = useLocation();
  const [aktif, setAktif] = useState(0);
  const butir = useRef<(HTMLElement | null)[]>([]);

  // Panel kiri mengikuti varietas yang sedang berada di tengah layar.
  useEffect(() => {
    const io = new IntersectionObserver((m) => {
      m.forEach((e) => { if (e.isIntersecting) setAktif(Number((e.target as HTMLElement).dataset.urut)); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    butir.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [varietas.data]);

  useEffect(() => {
    const id = lokasi.hash.slice(1);
    if (id && varietas.data) document.getElementById(id)?.scrollIntoView({ block: "center" });
  }, [lokasi.hash, varietas.data]);

  if (varietas.isError) return <GalatData ulang={() => varietas.refetch()} />;
  const daftar = varietas.data ?? [];
  const statistik = (id: number) => {
    const lot = riwayat.data?.filter((r) => r.varietas_id === id) ?? [];
    return { n: lot.length, imf: lot.length ? lot.reduce((s, r) => s + r.indeks_mutu_fisik, 0) / lot.length : null };
  };

  return (
    <div>
      <Muncul as="header" className="max-w-[860px]">
        <h1 className="display m-0 text-[clamp(2.4rem,5.4vw,4.4rem)] text-ink">Varietas melon yang diuji.</h1>
        <p className="mt-6 mb-0 max-w-[58ch] text-sedang text-ink-2">
          Setiap foto lot dicatat bersama varietasnya. Dengan begitu mutu fisik antar varietas, dan terhadap benih petani yang tidak bersertifikat, bisa dibandingkan dengan cara memotret yang sama.
        </p>
      </Muncul>

      {varietas.isPending ? <div className="mt-14"><Skeleton tinggi={420} /></div> : daftar.length === 0 ? (
        <div className="mt-14"><Empty>Belum ada varietas terdaftar. Pengelola data dapat menambahkannya lewat <code className="mono">POST /api/katalog/varietas</code>.</Empty></div>
      ) : (
        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="sticky top-28 hidden h-[calc(100dvh-9rem)] max-h-[720px] lg:block">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={aktif} className="absolute inset-0"
                initial={kurangi ? false : { opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                <IrisanVarietas p={penanda(daftar[aktif] ?? daftar[0])} className="size-full rounded-[36px]" />
              </motion.div>
            </AnimatePresence>
          </div>

          <ol className="m-0 grid list-none gap-6 p-0 lg:gap-0">
            {daftar.map((v, i) => {
              const p = penanda(v);
              const st = statistik(v.id);
              return (
                <li key={v.id} id={p.slug} data-urut={i} ref={(el) => { butir.current[i] = el; }}
                  className="scroll-mt-28 lg:flex lg:min-h-[78dvh] lg:items-center">
                  <article className="w-full">
                    <IrisanVarietas p={p} className="mb-6 aspect-[4/3] rounded-[28px] lg:hidden" />
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-kecil font-medium ${p.bersertifikat ? "bg-ukur-soft text-ukur" : "bg-warning/18 text-warning-ink"}`}>
                      {p.bersertifikat ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                      {p.bersertifikat ? "Benih bersertifikat" : "Pembanding, tanpa sertifikat"}
                    </span>
                    <h2 className="display mt-5 mb-0 text-[clamp(2.2rem,4.6vw,3.8rem)] text-ink">{v.nama}</h2>
                    <p className="mt-3 mb-0 text-judul-kecil text-ink-2">{tanpaTitik(v.deskripsi || "Belum ada deskripsi")}</p>

                    <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
                      {[
                        ["Lot dianalisis", st.n === 0 ? "Belum ada" : String(st.n)],
                        ["Rerata mutu fisik", st.imf === null ? "Belum ada" : `${angka(st.imf)} /100`],
                        ["Pemulia", v.pemulia || "Belum diisi"],
                        ["No. pendaftaran", v.no_pendaftaran || "Belum diisi"],
                      ].map(([k, n]) => (
                        <div key={k} className="bg-surface px-5 py-4">
                          <dt className="eyebrow text-muted">{k}</dt>
                          <dd className={`mt-1.5 mb-0 text-sedang ${n.startsWith("Belum") ? "text-muted" : "mono tnum text-ink"}`}>{n}</dd>
                        </div>
                      ))}
                    </dl>
                    {!p.bersertifikat && (
                      <p className="mt-5 mb-0 max-w-[52ch] text-dasar text-ink-2">
                        Dipakai sebagai garis pembanding: apakah lot tanpa sertifikat berbeda nyata dalam keseragaman dan keutuhan dibanding benih bersertifikat.
                      </p>
                    )}
                    <Link to={`/analisis?varietas=${v.id}`} className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full border border-garis-kontrol px-5 text-dasar font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
                      Analisis lot {v.nama} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <Muncul className="mt-24 border-t border-line pt-10">
        <details className="rincian-teknis">
          <summary>Bagaimana data varietas, lot, dan uji perkecambahan saling terhubung</summary>
          <ul className="mt-5 mb-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5">
            {ENTITAS.map((e) => (
              <li key={e.nama} className="rounded-2xl border border-line bg-surface p-4">
                <span className="block text-dasar font-semibold text-ink">{e.nama}</span>
                <span className="mt-1 block text-kecil text-muted">{e.isi}</span>
              </li>
            ))}
          </ul>
        </details>
      </Muncul>
    </div>
  );
}

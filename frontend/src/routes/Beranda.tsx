import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, Grid3x3, Lock, Ruler, ScanLine } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { lazy, Suspense, useRef, useState } from "react";
import { Link } from "react-router";
import GridLot from "../components/GridLot";
import { Muncul } from "../components/Gerak";
import { PEGAS } from "../lib/animasi";
import KartuVarietas from "../components/KartuVarietas";
import PanggungIndeks, { type KunciIndeks } from "../components/PanggungIndeks";
import { api } from "../lib/api";

const RonggaBiji = lazy(() => import("../components/RonggaBiji"));

const INDEKS: { kunci: KunciIndeks; nama: string; inti: string }[] = [
  { kunci: "keutuhan_fisik", nama: "Keutuhan fisik", inti: "Seberapa utuh bentuk tiap benih: luasnya dibanding cangkang cembungnya." },
  { kunci: "kebersihan_lot", nama: "Bebas cacat fisik", inti: "Proporsi benih yang bentuknya tergerus atau patah di bawah ambang." },
  { kunci: "keseragaman_ukuran", nama: "Keseragaman ukuran", inti: "Sebaran luas antar benih dalam satu lot, sebagai koefisien variasi." },
  { kunci: "keseragaman_warna", nama: "Keseragaman warna", inti: "Jarak warna tiap benih ke warna rerata lot dalam ruang CIELAB." },
  { kunci: "tekstur_permukaan", nama: "Tekstur permukaan", inti: "Homogenitas pola piksel di permukaan benih (GLCM)." },
];

/** Cuplikan teks yang muncul di tahap tertentu dari gulir hero. */
function Tahap({ p, masuk, keluar, children, className }: {
  p: MotionValue<number>; masuk?: [number, number]; keluar?: [number, number]; children: React.ReactNode; className?: string;
}) {
  // Tanpa `masuk`: sudah tampil sejak awal. Titik offset harus naik, 0..1.
  const titik = [...(masuk ?? [0]), ...(keluar ?? [])];
  const nilai = [...(masuk ? [0, 1] : [1]), ...(keluar ? [1, 0] : [])];
  const geser = [...(masuk ? [40, 0] : [0]), ...(keluar ? [0, -40] : [])];
  const opacity = useTransform(p, titik, nilai);
  const y = useTransform(p, titik, geser);
  const pointerEvents = useTransform(opacity, (o) => (o > 0.5 ? "auto" : "none"));
  return <motion.div style={{ opacity, y, pointerEvents }} className={className}>{children}</motion.div>;
}

function Hero() {
  const kurangi = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Gerak dikurangi: adegan diam di rongga buah, tidak terikat gulir.
  const diam = useMotionValue(0);
  const p = kurangi ? diam : scrollYProgress;

  // Irisan buah membesar dan memudar saat benih turun ke nampan.
  const skalaIrisan = useTransform(p, [0, 0.55], [1, 1.9]);
  const opIrisan = useTransform(p, [0, 0.12, 0.5], [1, 1, 0]);
  const opNampan = useTransform(p, [0.3, 0.6], [0, 1]);
  const rel = p;

  const judul = (
    <>
      <h1 className="display m-0 text-[clamp(2.3rem,4.25vw,4.4rem)] text-ink">
        Mutu benih melon<br /><span className="text-accent">dari satu foto.</span>
      </h1>
      <p className="mt-6 mb-0 max-w-[40ch] text-sedang text-ink-2">
        Unggah foto satu lot. MELHYB-VISION mengukur ukuran, warna, keutuhan, dan tekstur setiap benih di dalamnya.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/analisis" className="group inline-flex h-13 items-center gap-2 rounded-full bg-accent px-7 text-sedang font-semibold text-accent-ink shadow-[0_18px_40px_-16px_var(--accent)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97]">
          Mulai analisis <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
        <a href="#varietas" className="inline-flex h-13 items-center rounded-full border border-garis-kontrol bg-[var(--kaca)] px-6 text-sedang font-medium text-ink backdrop-blur-md transition-colors hover:bg-surface-2">
          Kenali varietas
        </a>
      </div>
    </>
  );

  return (
    <section ref={ref} className={kurangi ? "relative h-dvh min-h-[640px]" : "relative h-[340vh]"} aria-label="Pembuka">
      <div className="sticky top-0 h-dvh min-h-[640px] overflow-hidden">
        {/* Irisan melon: rongga pucat, daging jingga, lapis hijau tipis, kulit. */}
        <motion.div aria-hidden style={{ scale: skalaIrisan, opacity: opIrisan }}
          className="absolute top-[23%] left-1/2 size-[58vh] -translate-x-1/2 -translate-y-1/2 rounded-full md:top-1/2 md:left-[calc(100%-27vh)] md:size-[112vh]">
          <div className="size-full rounded-full [transform:scaleY(0.82)]"
            style={{ background: "radial-gradient(circle closest-side, #f7d3ad 0%, #f5c294 38%, #f3a25a 50%, #ee8a3e 72%, #e57a32 86%, #dfe6b0 89.5%, #6f8f4f 91%, #2f4a33 94%, #1a2a1e 99%, transparent 99.6%)" }} />
        </motion.div>
        <motion.div aria-hidden style={{ opacity: opNampan }} className="absolute inset-0"
          >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,var(--surface-3),var(--ground)_70%)]" />
          <div className="absolute inset-[8%] rounded-[48px] border border-line [background-image:linear-gradient(var(--line-soft)_1px,transparent_1px),linear-gradient(90deg,var(--line-soft)_1px,transparent_1px)] [background-size:44px_44px]" />
        </motion.div>
        <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ground to-transparent" />

        <Suspense fallback={null}><RonggaBiji progres={p} className="absolute inset-0" /></Suspense>

        <div className="bingkai pointer-events-none relative flex h-full flex-col justify-end pb-20 md:justify-center md:pb-0">
          {kurangi ? <div className="pointer-events-auto max-w-[800px]">{judul}</div> : (
            <Tahap p={rel} keluar={[0.09, 0.15]} className="max-w-[800px]">{judul}</Tahap>
          )}
        </div>

        {!kurangi && <>
          <Tahap p={rel} masuk={[0.2, 0.27]} keluar={[0.47, 0.53]} className="absolute inset-x-4 bottom-10 sm:right-auto sm:bottom-14 sm:left-[max(1rem,calc((100vw-1320px)/2+3rem))] sm:w-[420px]">
            <div className="rounded-[28px] border border-line bg-[var(--kaca)] p-6 shadow-[var(--bayang-naik)] backdrop-blur-xl">
              <span className="mono text-kecil text-accent">Satu foto, satu lot</span>
              <h2 className="display-kecil mt-2 mb-2 text-[1.6rem] text-ink">Benih disebar di atas alas polos.</h2>
              <p className="m-0 text-dasar text-ink-2">Keseragaman dihitung dari sebaran antar benih di dalam foto, jadi satu foto selalu mewakili satu lot. Minimal 10 benih.</p>
            </div>
          </Tahap>
          <Tahap p={rel} masuk={[0.6, 0.67]} className="absolute inset-x-4 bottom-10 sm:right-auto sm:bottom-14 sm:left-[max(1rem,calc((100vw-1320px)/2+3rem))] sm:w-[440px]">
            <div className="rounded-[28px] border border-line bg-[var(--kaca)] p-6 shadow-[var(--bayang-naik)] backdrop-blur-xl">
              <span className="mono text-kecil text-ukur">Pindai</span>
              <h2 className="display-kecil mt-2 mb-2 text-[1.6rem] text-ink">Setiap benih diukur, tidak ditebak.</h2>
              <p className="m-0 text-dasar text-ink-2">Kontur tiap benih dipisahkan, lalu lima indeks dihitung dari pikselnya.</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-kecil text-ink-2">
                <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#7fcf9d]" />Kontur terukur</span>
                <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#f2944c]" />Dugaan cacat</span>
              </div>
              <p className="mono mt-3 mb-0 text-mikro text-muted">Ilustrasi cara kerja, bukan hasil analisis.</p>
            </div>
          </Tahap>
          {/* Rel kemajuan cerita. */}
          <div aria-hidden className="absolute top-28 left-[max(1rem,calc((100vw-1320px)/2+3rem))] hidden w-[300px] lg:block">
            <div className="relative h-px bg-line"><motion.div style={{ scaleX: rel }} className="absolute inset-0 origin-left bg-accent" /></div>
            <div className="mt-2 flex justify-between">
              {["Rongga buah", "Lot di nampan", "Pindai"].map((t) => <span key={t} className="mono text-mikro text-muted">{t}</span>)}
            </div>
          </div>
        </>}
      </div>
    </section>
  );
}

export default function Beranda() {
  const varietas = useQuery({ queryKey: ["varietas"], queryFn: api.varietas });
  const riwayat = useQuery({ queryKey: ["riwayat"], queryFn: () => api.riwayat() });
  const ringkasan = useQuery({ queryKey: ["ringkasan"], queryFn: api.ringkasan });
  const kalibrasi = useQuery({ queryKey: ["kalibrasi"], queryFn: api.kalibrasi });
  const metodologi = useQuery({ queryKey: ["metodologi"], queryFn: api.metodologi });
  const [indeks, setIndeks] = useState<KunciIndeks>("keutuhan_fisik");

  const melon = varietas.data ?? [];
  const lotPer = (id: number) => riwayat.data?.filter((r) => r.varietas_id === id).length ?? 0;
  const syarat = Number(metodologi.data?.syarat_kalibrasi.sampel_minimum ?? 30);
  const r2 = Number(metodologi.data?.syarat_kalibrasi.r2_validasi_minimum ?? 0.3);
  const target = (k: string) => kalibrasi.data?.find((m) => m.komoditas === "melon" && m.target === k);
  const bobot = metodologi.data?.bobot_indeks_fisik ?? {};
  const total = ringkasan.data?.total ?? 0;
  const terpilih = INDEKS.find((i) => i.kunci === indeks)!;

  return (
    <div className="overflow-x-clip">
      <Hero />

      {/* Varietas */}
      <section id="varietas" className="bingkai scroll-mt-24 py-24 sm:py-32">
        <Muncul as="header" className="mb-12 max-w-[760px]">
          <h2 className="display m-0 text-[clamp(2rem,3.8vw,3.2rem)] text-ink">Empat lot yang akan diuji.</h2>
          <p className="mt-5 mb-0 max-w-[56ch] text-sedang text-ink-2">
            Tiga varietas bersertifikat dan satu benih petani sebagai pembanding. Pilih varietasnya saat mengunggah foto, supaya hasilnya bisa dibandingkan.
          </p>
        </Muncul>
        {melon.length === 0 ? (
          <p className="text-muted">{varietas.isPending ? "Memuat varietas…" : "Belum ada varietas terdaftar."}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr] lg:grid-rows-[repeat(2,minmax(260px,auto))]">
            {melon.map((v, i) => (
              <Muncul key={v.id} jeda={i * 0.08}
                className={i === 0 ? "md:col-span-2 lg:col-span-1 lg:row-span-2" : i === 3 ? "md:col-span-2" : ""}>
                <KartuVarietas v={v} jumlahLot={lotPer(v.id)} besar={i === 0} />
              </Muncul>
            ))}
          </div>
        )}
        <p className="mono mt-4 mb-0 text-mikro text-muted">Warna kartu adalah penanda pembeda, bukan foto varietas.</p>
      </section>

      {/* Lima indeks */}
      <section className="border-y border-line bg-plane">
        <div className="bingkai grid gap-12 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
          <div>
            <Muncul as="header">
              <span className="eyebrow text-ukur">Indeks Mutu Fisik</span>
              <h2 className="display mt-4 mb-0 text-[clamp(2rem,3.6vw,3rem)] text-ink">Lima angka yang dihitung dari piksel.</h2>
              <p className="mt-5 mb-0 max-w-[50ch] text-sedang text-ink-2">Kelimanya selalu tampil karena terukur langsung dari foto. Pilih salah satu untuk melihat cara menghitungnya.</p>
            </Muncul>
            <ul className="mt-10 grid list-none gap-1 p-0" role="list">
              {INDEKS.map((i) => {
                const aktif = i.kunci === indeks;
                return (
                  <li key={i.kunci}>
                    <button type="button" aria-pressed={aktif} onClick={() => setIndeks(i.kunci)} onMouseEnter={() => setIndeks(i.kunci)}
                      className={`relative flex w-full cursor-pointer items-center gap-4 rounded-2xl px-5 py-4 text-left transition-colors ${aktif ? "text-ink" : "text-ink-2 hover:text-ink"}`}>
                      {aktif && <motion.span layoutId="indeks-aktif" className="absolute inset-0 -z-0 rounded-2xl border border-line bg-surface shadow-[var(--bayang)]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                      <span className="relative min-w-0 flex-1">
                        <span className="block text-sedang font-semibold">{i.nama}</span>
                        {aktif && <motion.span initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} className="mt-1 block text-dasar text-muted">{i.inti}</motion.span>}
                      </span>
                      <span className="mono tnum relative text-kecil text-muted">{bobot[i.kunci] !== undefined ? `${Math.round(bobot[i.kunci] * 100)}%` : ""}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 mb-0 px-5 text-kecil text-muted">Persen = bobot dalam Indeks Mutu Fisik. <Link to="/metodologi" className="text-accent hover:underline">Lihat metode</Link></p>
          </div>
          <Muncul jeda={0.1} className="kartu overflow-hidden p-3 sm:p-5">
            <PanggungIndeks aktif={indeks} />
            <p className="m-0 px-2 pt-2 text-kecil text-muted" aria-live="polite">{terpilih.nama}: {terpilih.inti}</p>
          </Muncul>
        </div>
      </section>

      {/* Terukur vs terestimasi */}
      <section className="bingkai py-24 sm:py-32">
        <Muncul as="header" className="mb-12 max-w-[820px]">
          <h2 className="display m-0 text-[clamp(2rem,3.8vw,3.2rem)] text-ink">Angka perkecambahan tidak keluar sebelum layak.</h2>
          <p className="mt-5 mb-0 max-w-[60ch] text-sedang text-ink-2">
            Daya berkecambah tidak terlihat di foto. MELHYB-VISION hanya memperkirakannya setelah model belajar dari {syarat} lot yang difoto dan diuji perkecambahan, dengan R² validasi minimal {r2.toLocaleString("id-ID")}.
          </p>
        </Muncul>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Muncul className="relative overflow-hidden rounded-[28px] border border-ukur/30 bg-ukur-soft p-7 sm:p-9">
            <ScanLine className="text-ukur" size={28} strokeWidth={1.5} />
            <h3 className="display-kecil mt-6 mb-2 text-[1.6rem] text-ink">Terukur</h3>
            <p className="m-0 text-dasar text-ink-2">Dihitung dari piksel. Selalu ditampilkan, dengan dasar perhitungannya.</p>
            <ul className="mt-6 grid list-none gap-2.5 p-0">
              {INDEKS.map((i) => <li key={i.kunci} className="flex items-center gap-3 text-dasar text-ink"><span className="h-px w-5 bg-ukur" />{i.nama}</li>)}
              <li className="flex items-center gap-3 text-dasar text-ink"><span className="h-px w-5 bg-ukur" />Ukuran dalam mm, bila penanda ArUco ikut terfoto</li>
            </ul>
          </Muncul>
          <Muncul jeda={0.08} className="relative overflow-hidden rounded-[28px] border border-estimasi/30 bg-estimasi-soft p-7 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <Lock className="text-estimasi" size={28} strokeWidth={1.5} />
              <span className="rounded-full border border-estimasi/40 px-3 py-1 text-kecil text-estimasi">
                {target("daya_berkecambah")?.siap_pakai ? "Model siap" : "Terkunci"}
              </span>
            </div>
            <h3 className="display-kecil mt-6 mb-2 text-[1.6rem] text-ink">Terestimasi</h3>
            <p className="m-0 text-dasar text-ink-2">Daya berkecambah, kecepatan tumbuh, dan keserempakan tumbuh. Muncul hanya setelah model melon lolos validasi.</p>
            <div className="mt-7 grid gap-6 sm:grid-cols-[1.4fr_1fr] sm:items-end">
              <GridLot terisi={target("daya_berkecambah")?.sampel_tersedia ?? 0} syarat={syarat} label="Lot berpasangan untuk daya berkecambah" />
              <ul className="m-0 grid list-none gap-2 p-0 text-kecil">
                {(["daya_berkecambah", "kecepatan_tumbuh", "keserempakan_tumbuh"] as const).map((k) => {
                  const m = target(k);
                  return (
                    <li key={k} className="flex items-center justify-between gap-3 border-b border-estimasi/20 pb-2">
                      <span className="text-ink-2">{m?.label_target.replace(/ \(.*\)/, "") ?? k}</span>
                      <span className={m?.siap_pakai ? "text-good-ink" : "text-muted"}>{m?.siap_pakai ? "siap" : "belum"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <Link to="/kalibrasi" className="tautan-teks mt-4 !text-estimasi">Lihat syarat kalibrasi <ArrowRight size={15} /></Link>
          </Muncul>
        </div>
      </section>

      {/* Mulai */}
      <section className="bingkai pb-28">
        <Muncul className="relative isolate overflow-hidden rounded-[36px] border border-line bg-surface p-8 sm:p-14">
          <div aria-hidden className="absolute -top-40 -right-40 -z-10 size-[520px] rounded-full opacity-90"
            style={{ background: "radial-gradient(circle closest-side, #f7d3ad 0%, #f3a25a 40%, #e57a32 82%, #dfe6b0 88%, #2f4a33 93%, transparent 100%)" }} />
          <div className="max-w-[640px]">
            <h2 className="display m-0 text-[clamp(2rem,3.8vw,3.2rem)] text-ink">
              {total === 0 ? "Belum ada lot yang dianalisis." : `${total} lot sudah dianalisis.`}
            </h2>
            <p className="mt-5 mb-0 max-w-[48ch] text-sedang text-ink-2">
              {total === 0 ? "Mulai dari satu lot. Siapkan tiga hal ini, lalu unggah fotonya." : "Tambahkan lot berikutnya dengan cara memotret yang sama."}
            </p>
            <ul className="mt-8 grid list-none gap-3 p-0 sm:grid-cols-3">
              {[
                { ikon: Grid3x3, t: "Alas polos yang kontras dengan warna benih" },
                { ikon: Camera, t: "Minimal 10 benih, tidak bertumpuk" },
                { ikon: Ruler, t: "Penanda ArUco 20 mm untuk ukuran mm" },
              ].map(({ ikon: Ikon, t }) => (
                <li key={t} className="rounded-2xl border border-line bg-[var(--kaca)] p-4 text-dasar text-ink-2 backdrop-blur-md">
                  <Ikon size={20} className="mb-3 text-accent" strokeWidth={1.75} />{t}
                </li>
              ))}
            </ul>
            <motion.div whileHover={{ x: 4 }} transition={{ ease: PEGAS }} className="mt-9 inline-block">
              <Link to="/analisis" className="inline-flex h-13 items-center gap-2 rounded-full bg-accent px-7 text-sedang font-semibold text-accent-ink transition-[filter] hover:brightness-110">
                Mulai analisis <ArrowRight size={18} />
              </Link>
            </motion.div>
          </div>
        </Muncul>
      </section>
    </div>
  );
}

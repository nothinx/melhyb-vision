import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Camera, CircleX, Focus, ImageUp, Layers, Loader2, RotateCcw, Ruler, ServerOff, SunMedium,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { PEGAS } from "../lib/animasi";
import HasilPanel from "../components/HasilPanel";
import JaringKulit from "../components/JaringKulit";
import { BenihKosong } from "../components/Lambang";
import { Button, GalatData, Notice } from "../components/ui";
import { useMode } from "../hooks/useMode";
import { ApiError, api } from "../lib/api";
import { useFokusJudul } from "../lib/fokus";
import type { HasilAnalisis, MasalahGerbang } from "../lib/types";
import { penanda, tanpaTitik } from "../lib/varietas";

const BATAS_BERKAS = 15_000_000;
// Server di Vercel menolak badan permintaan > 4,5 MB. Foto besar dikompres
// ulang ke JPEG pada resolusi ASLI: ukuran benih dalam piksel adalah ciri
// cacat bagi model, jadi foto tidak boleh diperkecil.
const BATAS_KIRIM = 4_000_000;
async function muatKirim(f: File): Promise<File> {
  if (f.size <= BATAS_KIRIM) return f;
  const bmp = await createImageBitmap(f);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  for (const q of [0.9, 0.8, 0.7, 0.6]) {
    const b = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", q));
    if (b && b.size <= BATAS_KIRIM) return new File([b], f.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  }
  throw new Error("Foto masih di atas 4 MB setelah dikompres. Kurangi resolusi kamera ke 12 MP atau kurang.");
}
const TAHAP_PROSES = ["Memeriksa ketajaman dan cahaya", "Mencari penanda skala", "Memisahkan tiap benih", "Menghitung lima indeks"];

function Kamera({ onAmbil, onBatal }: { onAmbil: (f: File) => void; onBatal: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false,
        });
        if (batal) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setSiap(true); }
      } catch {
        setGalat("Kamera tidak dapat dibuka. Periksa izin kamera di browser, atau pilih foto dari perangkat Anda.");
      }
    })();
    return () => { batal = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  if (galat) {
    return <div className="grid gap-3"><Notice nada="critical" ikon={<CircleX size={15} />}>{galat}</Notice><Button variant="hantu" onClick={onBatal}>Kembali</Button></div>;
  }
  return (
    <div className="grid gap-4">
      <div className="relative overflow-hidden rounded-3xl bg-black">
        <video ref={videoRef} playsInline muted className="w-full" />
        <Bidik />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="hantu" onClick={onBatal}>Batal</Button>
        <Button disabled={!siap} onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          const c = document.createElement("canvas");
          c.width = v.videoWidth; c.height = v.videoHeight;
          c.getContext("2d")!.drawImage(v, 0, 0);
          c.toBlob((b) => b && onAmbil(new File([b], `benih-${Date.now()}.jpg`, { type: "image/jpeg" })), "image/jpeg", 0.92);
        }}>{siap ? "Ambil foto" : "Menyiapkan…"}</Button>
      </div>
    </div>
  );
}

/** Tanda bidik di empat sudut, seperti jendela bidik kamera. */
function Bidik({ warna = "rgb(255 255 255 / 0.85)" }: { warna?: string }) {
  const s = { borderColor: warna };
  return (
    <span aria-hidden className="pointer-events-none absolute inset-4 sm:inset-5">
      <span className="absolute top-0 left-0 size-7 rounded-tl-xl border-t-2 border-l-2" style={s} />
      <span className="absolute top-0 right-0 size-7 rounded-tr-xl border-t-2 border-r-2" style={s} />
      <span className="absolute bottom-0 left-0 size-7 rounded-bl-xl border-b-2 border-l-2" style={s} />
      <span className="absolute right-0 bottom-0 size-7 rounded-br-xl border-r-2 border-b-2" style={s} />
    </span>
  );
}

export default function Analisis() {
  const mode = useMode();
  const kurangi = useReducedMotion();
  const penyimpan = useQueryClient();
  const [parameter] = useSearchParams();
  const komoditas = useQuery({ queryKey: ["komoditas"], queryFn: api.komoditas });
  const varietas = useQuery({ queryKey: ["varietas"], queryFn: api.varietas });
  const metodologi = useQuery({ queryKey: ["metodologi"], queryFn: api.metodologi });
  const [pilihanKomoditas, setPilihanKomoditas] = useState("");
  const slug = pilihanKomoditas || komoditas.data?.find((k) => k.slug === "melon")?.slug || komoditas.data?.[0]?.slug || "";
  const idKomoditas = komoditas.data?.find((k) => k.slug === slug)?.id;
  const daftarVarietas = varietas.data?.filter((v) => v.komoditas_id === idKomoditas) ?? [];
  const [pilihanVarietas, setPilihanVarietas] = useState(() => parameter.get("varietas") ?? "");
  const varietasTerpilih = daftarVarietas.find((v) => String(v.id) === pilihanVarietas) ?? null;
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [kamera, setKamera] = useState(false);
  const [proses, setProses] = useState(false);
  const [tahap, setTahap] = useState(0);
  const [seret, setSeret] = useState(false);
  const [hasil, setHasil] = useState<HasilAnalisis | null>(null);
  const [galat, setGalat] = useState<{ pesan: string; butir: MasalahGerbang[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlFoto = useRef<string | null>(null);
  const judulHasil = useFokusJudul<HTMLHeadingElement>(hasil?.id);
  const tanpaServer = mode === "demo";

  useEffect(() => () => { if (urlFoto.current) URL.revokeObjectURL(urlFoto.current); }, []);
  // Pesan tahap berganti selama server bekerja: umpan balik, bukan kemajuan sungguhan.
  useEffect(() => {
    if (!proses) return;
    const t = setInterval(() => setTahap((n) => Math.min(n + 1, TAHAP_PROSES.length - 1)), 1400);
    return () => clearInterval(t);
  }, [proses]);

  function pilih(f: File | null) {
    setHasil(null);
    setKamera(false);
    if (urlFoto.current) URL.revokeObjectURL(urlFoto.current);
    urlFoto.current = null;
    setPratinjau(null);
    // Batas yang sama dengan yang tertulis di layar, supaya foto besar dari
    // ponsel tidak terunggah utuh dulu baru ditolak.
    if (f && f.size > BATAS_BERKAS) {
      setBerkas(null);
      setGalat({ pesan: `Berkas ${(f.size / 1e6).toFixed(1)} MB melebihi batas ${BATAS_BERKAS / 1e6} MB. Perkecil resolusi kamera atau kompres fotonya.`, butir: [] });
      return;
    }
    if (f && (!f.size || !["image/jpeg", "image/png"].includes(f.type))) {
      setBerkas(null);
      setGalat({ pesan: "Pilih foto JPG atau PNG yang tidak kosong. Konversikan HEIC ke JPG terlebih dahulu.", butir: [] });
      return;
    }
    setBerkas(f);
    if (f) { urlFoto.current = URL.createObjectURL(f); setPratinjau(urlFoto.current); }
    setGalat(null);
  }

  async function kirim() {
    if (!berkas || !slug || proses) return;
    setProses(true);
    setTahap(0);
    setGalat(null);
    try {
      setHasil(await api.analisis(await muatKirim(berkas), slug, varietasTerpilih?.id ?? null));
      window.scrollTo({ top: 0, behavior: "instant" });
      void penyimpan.invalidateQueries({ queryKey: ["ringkasan"] });
      void penyimpan.invalidateQueries({ queryKey: ["riwayat"] });
      void penyimpan.invalidateQueries({ queryKey: ["kalibrasi"] });
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const d = (e.detail ?? {}) as { pesan?: string; gerbang_citra?: { masalah?: MasalahGerbang[] } };
        setGalat({ pesan: d.pesan ?? e.message, butir: d.gerbang_citra?.masalah ?? [] });
      } else {
        setGalat({ pesan: e instanceof Error ? e.message : "Analisis gagal.", butir: [] });
      }
    } finally {
      setProses(false);
    }
  }

  if (hasil) {
    const nama = varietasTerpilih?.nama ?? komoditas.data?.find((k) => k.slug === slug)?.nama ?? slug;
    return (
      <div className="grid gap-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mono m-0 text-kecil text-muted">Lot #{hasil.id}</p>
            <h1 ref={judulHasil} tabIndex={-1} className="display mt-3 mb-0 text-[clamp(2.2rem,4.6vw,3.8rem)] text-ink outline-none">{nama}</h1>
          </div>
          <Button variant="hantu" onClick={() => pilih(null)}><RotateCcw size={16} />Analisis lot lain</Button>
        </header>
        <HasilPanel hasil={hasil} adaCitra={mode === "langsung"} />
      </div>
    );
  }

  const gerbang = metodologi.data?.gerbang_citra;
  const panduan = [
    { ikon: Layers, judul: "Alas polos", isi: "Kertas gelap untuk benih melon yang terang. Hindari motif dan serat kertas." },
    { ikon: BenihIkon, judul: `Minimal ${gerbang?.benih_minimum ?? 15} benih`, isi: "Dari satu lot yang sama, tidak bertumpuk, tidak terpotong tepi foto." },
    { ikon: SunMedium, judul: "Cahaya merata", isi: "Tanpa bayangan tajam dan pantulan. Jangan di bawah matahari langsung." },
    { ikon: Focus, judul: "Tegak lurus dan tajam", isi: `Kamera sejajar alas. Sisi foto minimal ${gerbang?.sisi_minimum_px ?? 640} px.` },
    { ikon: Ruler, judul: "Penanda ArUco 20 mm", isi: "Pilihan. Tanpa penanda, ukuran hanya relatif, tidak dalam milimeter." },
  ];

  return (
    <div className="grid gap-12">
      <header className="max-w-[820px]">
        <h1 className="display m-0 text-[clamp(2.4rem,5.2vw,4.2rem)] text-ink">Analisis satu lot.</h1>
        <p className="mt-5 mb-0 max-w-[56ch] text-sedang text-ink-2">Pilih varietasnya, lalu unggah satu foto berisi benih dari lot itu. MELHYB-VISION mengukur mutu fisik dan keseragamannya.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid min-w-0 gap-5">
          <p role="status" className="sr-only">{proses ? `Sedang menganalisis: ${TAHAP_PROSES[tahap]}.` : ""}</p>

          {(komoditas.isError || varietas.isError) && <GalatData ulang={() => { void komoditas.refetch(); void varietas.refetch(); }} />}

          <section className="kartu p-5 sm:p-7" aria-labelledby="judul-varietas">
            <h2 id="judul-varietas" className="display-kecil m-0 text-judul-kecil text-ink">Varietas lot ini</h2>
            <p className="mt-1 mb-5 text-dasar text-muted">Dicatat bersama hasil, supaya lot bisa dibandingkan antar varietas.</p>
            {(komoditas.data?.length ?? 0) > 1 && (
              <div className="mb-5">
                <label htmlFor="komoditas" className="mb-2 block text-dasar font-semibold text-ink">Komoditas</label>
                <select id="komoditas" className="medan" disabled={proses} value={slug}
                  onChange={(e) => { setPilihanKomoditas(e.target.value); setPilihanVarietas(""); }}>
                  {komoditas.data?.map((k) => <option key={k.slug} value={k.slug}>{k.nama} ({k.nama_latin})</option>)}
                </select>
              </div>
            )}
            <fieldset className="m-0 min-w-0 border-0 p-0" disabled={proses}>
              <legend className="sr-only">Varietas</legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {daftarVarietas.map((v) => {
                  const p = penanda(v);
                  const aktif = String(v.id) === pilihanVarietas;
                  return (
                    <label key={v.id} className={`relative flex min-h-[72px] cursor-pointer items-center gap-4 rounded-2xl border p-3 pr-4 transition-colors ${aktif ? "border-accent bg-accent-soft/50" : "border-line hover:border-garis-kontrol"}`}>
                      <input type="radio" name="varietas" value={v.id} checked={aktif} onChange={() => setPilihanVarietas(String(v.id))} className="peer sr-only" />
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-full" style={{ background: p.kulit }}>
                        <JaringKulit warna={p.jaring} kerapatan={p.kerapatan * 1.6} benih={p.benih} tebal={0.3} />
                        <span className="absolute inset-[30%] rounded-full" style={{ background: p.daging }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-dasar font-semibold text-ink">{v.nama}</span>
                        <span className="block truncate text-kecil text-muted">{tanpaTitik(v.deskripsi)}</span>
                      </span>
                      {aktif && <motion.span layoutId="varietas-centang" className="absolute top-3 right-3 size-2.5 rounded-full bg-accent" />}
                      <span className="pointer-events-none absolute inset-0 rounded-2xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
                    </label>
                  );
                })}
              </div>
              <button type="button" onClick={() => setPilihanVarietas("")}
                className={`mt-3 min-h-11 cursor-pointer text-kecil underline-offset-4 hover:underline ${pilihanVarietas === "" ? "text-ink" : "text-muted"}`}>
                {pilihanVarietas === "" ? "Varietas belum dipilih (lot tetap bisa dianalisis)" : "Kosongkan pilihan varietas"}
              </button>
            </fieldset>
          </section>

          <section className="kartu overflow-hidden p-5 sm:p-7" aria-labelledby="judul-foto">
            <h2 id="judul-foto" className="display-kecil m-0 mb-5 text-judul-kecil text-ink">{pratinjau ? "Periksa fotonya" : "Foto lot"}</h2>

            <AnimatePresence mode="wait" initial={false}>
              {kamera ? (
                <motion.div key="kamera" initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Kamera onAmbil={pilih} onBatal={() => setKamera(false)} />
                </motion.div>
              ) : pratinjau ? (
                <motion.div key="pratinjau" initial={kurangi ? false : { opacity: 0.3, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ ease: PEGAS, duration: 0.5 }} className="grid gap-4">
                  <div className="relative overflow-hidden rounded-3xl border border-line bg-surface-2">
                    <img src={pratinjau} alt="Pratinjau foto lot benih" className="max-h-[480px] w-full object-contain" />
                    <Bidik />
                    {proses && !kurangi && (
                      <motion.span aria-hidden className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-accent/35 to-transparent"
                        initial={{ top: "-15%" }} animate={{ top: ["-15%", "100%"] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
                    )}
                    {proses && (
                      <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-full bg-black/60 px-4 py-2.5 text-kecil text-white backdrop-blur-md">
                        <Loader2 size={15} className="animate-spin" />
                        <AnimatePresence mode="wait"><motion.span key={tahap} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{TAHAP_PROSES[tahap]}…</motion.span></AnimatePresence>
                      </div>
                    )}
                  </div>
                  {tanpaServer && (
                    <Notice nada="warning" ikon={<ServerOff size={16} />} judul="Server belum terhubung">
                      Foto belum bisa dianalisis di mode ini. Jalankan <code className="mono">jalankan.bat</code>, lalu buka <code className="mono">http://localhost:8001</code>.
                    </Notice>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="hantu" disabled={proses} onClick={() => pilih(null)}>Ganti foto</Button>
                    <Button onClick={kirim} disabled={proses || !slug || tanpaServer || komoditas.isError}>
                      {proses ? <><Loader2 size={16} className="animate-spin" />Menganalisis</> : "Analisis foto"}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="unggah" initial={false} exit={{ opacity: 0 }}>
                  <motion.div
                    onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
                    onDragLeave={() => setSeret(false)}
                    onDrop={(e) => { e.preventDefault(); setSeret(false); const f = e.dataTransfer.files?.[0]; if (f) pilih(f); }}
                    animate={{ scale: seret && !kurangi ? 1.015 : 1 }}
                    className={`relative grid min-h-[340px] place-content-center justify-items-center rounded-3xl px-6 py-12 text-center transition-colors ${seret ? "bg-accent-soft" : "bg-surface-2"}`}>
                    <Bidik warna={seret ? "var(--accent)" : "var(--garis-kontrol)"} />
                    <span className="mb-5 opacity-80"><BenihKosong ukuran={120} /></span>
                    <p className="m-0 text-sedang font-semibold text-ink">Seret foto lot ke sini</p>
                    <p className="mt-1 mb-6 text-dasar text-ink-2">atau ambil langsung dengan kamera.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button variant="hantu" onClick={() => setKamera(true)}><Camera size={17} />Ambil foto</Button>
                      <Button onClick={() => inputRef.current?.click()}><ImageUp size={17} />Pilih foto</Button>
                    </div>
                    <p className="mono mt-5 mb-0 text-mikro text-muted">JPG atau PNG, maksimal 15 MB</p>
                  </motion.div>
                  <input ref={inputRef} type="file" accept="image/jpeg,image/png" hidden
                    onChange={(e) => { pilih(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                </motion.div>
              )}
            </AnimatePresence>

            {galat && (
              <div className="masuk-lembut mt-5">
                <Notice nada="critical" judul={galat.pesan} ikon={<AlertTriangle size={16} />}>
                  {galat.butir.length > 0 && (
                    <ul className="mt-1 mb-0 grid gap-1.5 pl-4">
                      {galat.butir.map((b) => <li key={b.kode}>{b.pesan} <span className="mono text-kecil text-muted">(terukur {b.nilai}, ambang {b.ambang})</span></li>)}
                    </ul>
                  )}
                </Notice>
              </div>
            )}
          </section>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-28">
          <div className="kartu p-6 sm:p-7">
            <h2 className="display-kecil m-0 text-judul-kecil text-ink">Cara memotret</h2>
            <p className="mt-1 mb-6 text-dasar text-muted">Foto yang tidak memenuhi syarat ditolak sebelum dinilai, lengkap dengan alasannya.</p>
            <ol className="m-0 grid list-none gap-5 p-0">
              {panduan.map(({ ikon: Ikon, judul, isi }) => (
                <li key={judul} className="grid grid-cols-[40px_1fr] gap-3.5">
                  <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-accent"><Ikon size={19} strokeWidth={1.75} /></span>
                  <span><span className="block text-dasar font-semibold text-ink">{judul}</span><span className="mt-0.5 block text-kecil text-muted">{isi}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BenihIkon({ size = 19 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M2 12C2 7.6 6.4 5 11.5 5C16.4 5 20.6 8.2 22 12C20.6 15.8 16.4 19 11.5 19C6.4 19 2 16.4 2 12Z" />
    </svg>
  );
}

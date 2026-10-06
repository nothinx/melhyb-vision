import { ArrowUpRight, ChevronDown, Menu, Monitor, Moon, Sun, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { periksaBackend } from "../lib/api";
import { useMode } from "../hooks/useMode";
import { PEGAS } from "../lib/animasi";
import { Lambang } from "./Lambang";

const UTAMA = [
  { ke: "/", label: "Beranda" },
  { ke: "/analisis", label: "Analisis" },
  { ke: "/riwayat", label: "Riwayat" },
  { ke: "/varietas", label: "Varietas" },
];
const REFERENSI = [
  { ke: "/kalibrasi", label: "Kalibrasi", ket: "Kesiapan model estimasi" },
  { ke: "/standar", label: "Standar mutu", ket: "Ambang dan sumber acuan" },
  { ke: "/metodologi", label: "Metode", ket: "Bobot, ambang, dan batasan" },
];
type Tema = "sistem" | "terang" | "gelap";

function TombolTema() {
  const [tema, setTema] = useState<Tema>(() => {
    try {
      const t = localStorage.getItem("sigma-tema");
      return t === "terang" || t === "gelap" ? t : "sistem";
    } catch { return "sistem"; }
  });
  useEffect(() => {
    const h = document.documentElement;
    if (tema === "sistem") h.removeAttribute("data-theme");
    else h.setAttribute("data-theme", tema === "gelap" ? "dark" : "light");
    try { localStorage.setItem("sigma-tema", tema); } catch { /* Penyimpanan dibatasi. */ }
  }, [tema]);
  const urutan: Tema[] = ["sistem", "terang", "gelap"];
  const Ikon = { sistem: Monitor, terang: Sun, gelap: Moon }[tema];
  return (
    <button type="button"
      className="grid size-11 cursor-pointer place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      onClick={() => setTema(urutan[(urutan.indexOf(tema) + 1) % urutan.length])}
      aria-label={`Ganti tema, sekarang ${tema}`} title={`Tema: ${tema}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={tema} initial={{ rotate: -90, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }}
          exit={{ rotate: 90, scale: 0.6 }} transition={{ duration: 0.25 }}>
          <Ikon size={18} strokeWidth={1.75} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function StatusKoneksi() {
  const mode = useMode();
  const teks = mode === "langsung" ? "Server terhubung" : mode === "demo" ? "Tanpa server" : "Memeriksa";
  const warna = mode === "langsung" ? "bg-good" : mode === "demo" ? "bg-warning" : "bg-garis-kontrol";
  return (
    <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-mikro text-muted xl:inline-flex">
      <span className={`size-1.5 rounded-full ${warna}`} aria-hidden />{teks}
    </span>
  );
}

export default function Shell() {
  const lokasi = useLocation();
  const mode = useMode();
  const kurangi = useReducedMotion();
  const [menu, setMenu] = useState(false);
  const [rujukan, setRujukan] = useState(false);
  const [tergulir, setTergulir] = useState(false);
  const rujukanRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => { if ((y > 24) !== tergulir) setTergulir(y > 24); });

  useEffect(() => { void periksaBackend(); }, []);
  useEffect(() => {
    const label = [...UTAMA, ...REFERENSI].find(({ ke }) => lokasi.pathname === ke)?.label;
    document.title = label && label !== "Beranda" ? `${label} | SIGMA Melon` : "SIGMA | Mutu benih melon dari satu foto";
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [lokasi.pathname]);
  // Menu ditutup saat pindah halaman: dilacak lewat state turunan, bukan effect.
  const [rutePrev, setRutePrev] = useState(lokasi.pathname);
  if (rutePrev !== lokasi.pathname) { setRutePrev(lokasi.pathname); setMenu(false); setRujukan(false); }
  useEffect(() => {
    const tutup = (e: PointerEvent) => {
      if (e.target instanceof Node && !rujukanRef.current?.contains(e.target)) setRujukan(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setRujukan(false); setMenu(false); } };
    document.addEventListener("pointerdown", tutup);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", tutup); document.removeEventListener("keydown", esc); };
  }, []);

  const diBeranda = lokasi.pathname === "/";
  const rujukanAktif = REFERENSI.some(({ ke }) => ke === lokasi.pathname);

  return (
    <div className="butiran min-h-dvh">
      <a href="#isi" className="lompat-isi" onClick={(e) => { e.preventDefault(); document.getElementById("isi")?.focus(); }}>
        Lompat ke isi halaman
      </a>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 pt-3 sm:pt-4">
        <div className="bingkai">
          <div className={`pointer-events-auto flex h-16 items-center gap-3 rounded-full border pr-2 pl-4 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${
            tergulir || !diBeranda || menu
              ? "border-line bg-[var(--kaca)] shadow-[var(--bayang)] backdrop-blur-xl backdrop-saturate-150"
              : "border-transparent bg-transparent"}`}>
            <Link to="/" className="flex shrink-0 items-center gap-2.5 text-accent" aria-label="SIGMA, beranda">
              <Lambang ukuran={30} />
              <span className="display-kecil text-[1.05rem] tracking-tight text-ink">SIGMA<span className="text-muted"> melon</span></span>
            </Link>

            <nav className="mx-auto hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
              {UTAMA.map(({ ke, label }) => (
                <NavLink key={ke} to={ke} end className="relative rounded-full px-4 py-2.5 text-[0.875rem] font-medium text-ink-2 transition-colors hover:text-ink aria-[current=page]:text-ink">
                  {({ isActive }) => <>
                    {isActive && <motion.span layoutId="nav-aktif" className="absolute inset-0 -z-10 rounded-full bg-surface-2 ring-1 ring-line"
                      transition={kurangi ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} />}
                    {label}
                  </>}
                </NavLink>
              ))}
              <div ref={rujukanRef} className="relative">
                <button type="button" aria-expanded={rujukan} aria-haspopup="true" onClick={() => setRujukan((v) => !v)}
                  className={`relative flex cursor-pointer items-center gap-1 rounded-full px-4 py-2.5 text-[0.875rem] font-medium transition-colors hover:text-ink ${rujukanAktif ? "text-ink" : "text-ink-2"}`}>
                  {rujukanAktif && <motion.span layoutId="nav-aktif" className="absolute inset-0 -z-10 rounded-full bg-surface-2 ring-1 ring-line" />}
                  Rujukan
                  <ChevronDown size={14} className={`transition-transform ${rujukan ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {rujukan && (
                    <motion.div role="menu"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.2, ease: PEGAS }}
                      className="absolute top-[calc(100%+14px)] right-0 w-72 origin-top-right rounded-3xl border border-line bg-surface p-2 shadow-[var(--bayang-naik)]">
                      {REFERENSI.map(({ ke, label, ket }) => (
                        <NavLink key={ke} to={ke} role="menuitem"
                          className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 hover:bg-surface-2 aria-[current=page]:bg-surface-2">
                          <span><span className="block text-dasar font-semibold text-ink">{label}</span><span className="block text-kecil text-muted">{ket}</span></span>
                          <ArrowUpRight size={16} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            <div className="ml-auto flex items-center gap-1 md:ml-0">
              <StatusKoneksi />
              <TombolTema />
              <Link to="/analisis" className="hidden h-11 items-center rounded-full bg-accent px-5 text-[0.875rem] font-semibold text-accent-ink transition-[filter] hover:brightness-110 lg:inline-flex">
                Mulai analisis
              </Link>
              <button type="button" className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-surface-2 md:hidden"
                aria-expanded={menu} aria-label={menu ? "Tutup menu" : "Buka menu"} onClick={() => setMenu((v) => !v)}>
                {menu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {menu && (
              <motion.nav aria-label="Navigasi ponsel"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: PEGAS }}
                className="pointer-events-auto mt-2 grid gap-1 rounded-[28px] border border-line bg-surface p-3 shadow-[var(--bayang-naik)] md:hidden">
                {[...UTAMA, ...REFERENSI].map(({ ke, label }, i) => (
                  <motion.div key={ke} initial={{ opacity: 0.3, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <NavLink to={ke} end className="flex min-h-12 items-center rounded-2xl px-4 text-sedang font-medium text-ink-2 aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink">
                      {label}
                    </NavLink>
                  </motion.div>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      {mode === "demo" && (
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <p className="pointer-events-auto m-0 inline-flex flex-wrap items-center justify-center gap-x-2 rounded-full border border-warning/40 bg-[var(--kaca)] px-4 py-2 text-center text-kecil text-ink-2 shadow-[var(--bayang)] backdrop-blur-xl">
            <strong className="text-warning-ink">Mode tanpa server.</strong>
            <span className="hidden sm:inline">Belum ada data yang ditampilkan.</span>
            <span>Jalankan <code className="mono">jalankan.bat</code><span className="hidden sm:inline"> untuk menganalisis foto</span>.</span>
          </p>
        </div>
      )}

      <motion.main id="isi" tabIndex={-1} key={lokasi.pathname}
        initial={kurangi ? false : { opacity: 0.35, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: PEGAS }}
        className={diBeranda ? "outline-none" : "bingkai pt-28 pb-28 outline-none sm:pt-32"}>
        <Outlet />
      </motion.main>

      <footer className="relative overflow-hidden border-t border-line">
        <div className="bingkai grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3 text-accent"><Lambang ukuran={36} /><span className="display text-[1.6rem] text-ink">SIGMA</span></div>
            <p className="mt-4 mb-0 max-w-[38ch] text-dasar text-muted">
              Penilaian mutu fisik benih melon dari citra. Hasil analisis bukan pengganti sertifikasi benih resmi.
            </p>
          </div>
          <div className="grid content-start gap-1">
            <span className="eyebrow mb-2 text-muted">Kerja</span>
            {UTAMA.slice(1).map(({ ke, label }) => <Link key={ke} to={ke} className="py-1.5 text-dasar text-ink-2 hover:text-accent">{label}</Link>)}
          </div>
          <div className="grid content-start gap-1">
            <span className="eyebrow mb-2 text-muted">Rujukan</span>
            {REFERENSI.map(({ ke, label }) => <Link key={ke} to={ke} className="py-1.5 text-dasar text-ink-2 hover:text-accent">{label}</Link>)}
          </div>
        </div>
        <div aria-hidden className="display pointer-events-none -mb-[0.18em] text-center text-[clamp(5rem,22vw,20rem)] leading-none text-surface-2 select-none">
          melon
        </div>
      </footer>
    </div>
  );
}

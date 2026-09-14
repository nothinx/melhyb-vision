import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router";
import { dengarkanMode, modeSekarang, periksaBackend } from "../lib/api";
import { Lambang } from "./Lambang";

const RUTE = [
  { ke: "/", label: "Ringkasan" },
  { ke: "/analisis", label: "Analisis" },
  { ke: "/riwayat", label: "Riwayat" },
  { ke: "/kalibrasi", label: "Kalibrasi" },
  { ke: "/standar", label: "Standar" },
  { ke: "/katalog", label: "Katalog" },
  { ke: "/metodologi", label: "Metode" },
  { ke: "/melon", label: "Studi melon" },
];
type Tema = "sistem" | "terang" | "gelap";

function TombolTema() {
  const [tema, setTema] = useState<Tema>(() => {
    try {
      const simpan = localStorage.getItem("sigma-tema");
      return simpan === "terang" || simpan === "gelap" ? simpan : "sistem";
    } catch { return "sistem"; }
  });
  useEffect(() => {
    const halaman = document.documentElement;
    if (tema === "sistem") halaman.removeAttribute("data-theme");
    else halaman.setAttribute("data-theme", tema === "gelap" ? "dark" : "light");
    try { localStorage.setItem("sigma-tema", tema); } catch { /* Penyimpanan peramban dibatasi. */ }
  }, [tema]);
  const urutan: Tema[] = ["sistem", "terang", "gelap"];
  const Ikon = { sistem: Monitor, terang: Sun, gelap: Moon }[tema];
  return <button type="button"
    onClick={() => setTema(urutan[(urutan.indexOf(tema) + 1) % urutan.length])}
    aria-label={`Ganti tema, sekarang ${tema}`} title={`Tema: ${tema}`}
    className="grid size-11 shrink-0 cursor-pointer place-items-center rounded border border-garis-kontrol text-muted hover:bg-surface-2">
    <Ikon size={18} />
  </button>;
}

function SpandukMode() {
  const [mode, setMode] = useState(modeSekarang());
  useEffect(() => {
    const berhenti = dengarkanMode(setMode);
    periksaBackend();
    return berhenti;
  }, []);
  if (mode !== "demo") return null;
  return <div className="border-b border-estimasi/50 bg-estimasi-soft px-4 py-2 text-center text-kecil text-ink">
    <strong>Mode demo.</strong> Data contoh, bukan hasil analisis sungguhan. Jalankan server untuk memakai data nyata.
  </div>;
}

export default function Shell() {
  const lokasi = useLocation();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const label = RUTE.find(({ ke }) => lokasi.pathname === ke)?.label;
    document.title = label ? `${label} | SIGMA` : "SIGMA | Penilaian mutu benih";
    if (menu.current) menu.current.open = false;
  }, [lokasi.pathname]);

  const tautan = RUTE.map(({ ke, label }) => <NavLink key={ke} to={ke} end>{label}</NavLink>);
  return (
    <div className="min-h-dvh bg-ground">
      <button type="button" onClick={() => document.getElementById("isi")?.focus()}
        className="sr-only rounded border border-accent bg-accent px-4 py-2 text-accent-ink focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
        Lompat ke isi halaman
      </button>
      <SpandukMode />
      <header className="kepala-aplikasi">
        <div className="bingkai baris-merek">
          <Link to="/" className="merek" aria-label="SIGMA, halaman ringkasan"><Lambang ukuran={34} /><strong>SIGMA</strong></Link>
          <span className="keterangan-merek">Penilaian mutu benih<br />berbasis citra</span>
          <span className="hidden flex-1 sm:block" />
          <details className="menu-ponsel" ref={menu} onKeyDown={(kejadian) => {
            if (kejadian.key === "Escape" && menu.current) {
              menu.current.open = false;
              menu.current.querySelector("summary")?.focus();
            }
          }}>
            <summary>Menu</summary>
            <nav aria-label="Navigasi ponsel">{tautan}</nav>
          </details>
          <TombolTema />
        </div>
        <nav className="bingkai navigasi-meja" aria-label="Navigasi utama">{tautan}</nav>
      </header>
      <main id="isi" tabIndex={-1} key={lokasi.pathname} className="bingkai isi-aplikasi relative z-1">
        <Outlet />
      </main>
      <footer className="bingkai kaki-aplikasi"><span>SIGMA / Penilaian mutu benih berbasis citra</span><span>Hasil analisis bukan pengganti sertifikasi benih resmi.</span></footer>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { gerakanDikurangi } from "../lib/animasi";

type Aksi = "tersebar" | "tertata" | "kiri" | "kanan";
const JUMLAH = 24;

export default function SeedScatter3DMelon() {
  const wadah = useRef<HTMLDivElement>(null);
  const kendalikan = useRef<((aksi: Aksi) => void) | null>(null);
  const [tertata, setTertata] = useState(false);
  const [tersedia, setTersedia] = useState(false);

  useEffect(() => {
    const tempat = wadah.current;
    if (!tempat) return;
    let perender: THREE.WebGLRenderer;
    try {
      perender = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    perender.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    perender.setClearColor(0x000000, 0);
    tempat.appendChild(perender.domElement);
    const adegan = new THREE.Scene();
    const kamera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
    kamera.position.set(0, 8.5, 6.5);
    const kontrol = new OrbitControls(kamera, perender.domElement);
    kontrol.enableZoom = false;
    kontrol.enablePan = false;
    kontrol.minPolarAngle = 0.2;
    kontrol.maxPolarAngle = Math.PI / 2.5;
    kontrol.update();
    adegan.add(new THREE.HemisphereLight(0xfff9e8, 0x574b30, 2.6));
    const cahaya = new THREE.DirectionalLight(0xffffff, 3);
    cahaya.position.set(-3, 7, 4);
    adegan.add(cahaya);
    const kelompok = new THREE.Group();
    kelompok.scale.setScalar(0.88);
    adegan.add(kelompok);

    const geometri = new THREE.SphereGeometry(1, 32, 20);
    const titik = geometri.attributes.position;
    for (let i = 0; i < titik.count; i++) {
      const x = titik.getX(i);
      const lancip = 1 - x * 0.45;
      titik.setXYZ(i, x * 0.53, titik.getY(i) * 0.11 * lancip,
        titik.getZ(i) * 0.25 * lancip);
    }
    geometri.computeVertexNormals();
    const bahan = [0xd8ad68, 0xe4c48b, 0xc89751].map((warna) =>
      new THREE.MeshStandardMaterial({ color: warna, roughness: 0.72 }),
    );
    const benih = Array.from({ length: JUMLAH }, (_, i) => {
      const benda = new THREE.Mesh(geometri, bahan[i % bahan.length]);
      benda.scale.setScalar(0.85 + (i % 5) * 0.06);
      kelompok.add(benda);
      return benda;
    });
    const gambar = () => perender.render(adegan, kamera);
    const berjalan: ReturnType<typeof animate>[] = [];
    function hentikan() {
      berjalan.forEach((gerak) => gerak.cancel());
      berjalan.length = 0;
    }
    function susun(rapi: boolean, langsung = false) {
      hentikan();
      benih.forEach((benda, i) => {
        const sudut = i * 2.39996;
        const radius = Math.sqrt((i + 0.5) / JUMLAH) * 2.55;
        const tujuan = {
          x: rapi ? (i % 6 - 2.5) * 1.02 : Math.cos(sudut) * radius,
          z: rapi ? (Math.floor(i / 6) - 1.5) * 0.9 : Math.sin(sudut) * radius,
        };
        const rotasi = rapi ? -0.25 : sudut;
        if (langsung || gerakanDikurangi()) {
          benda.position.set(tujuan.x, 0, tujuan.z);
          benda.rotation.y = rotasi;
        } else {
          berjalan.push(animate(benda.position, {
            ...tujuan, duration: 700, delay: i * 12, ease: "inOut(3)", onUpdate: gambar,
          }));
          berjalan.push(animate(benda.rotation, {
            y: rotasi, duration: 700, delay: i * 12, ease: "inOut(3)",
          }));
        }
      });
      gambar();
    }
    susun(false, true);
    kendalikan.current = (aksi) => {
      if (aksi === "tersebar" || aksi === "tertata") susun(aksi === "tertata");
      else {
        kelompok.rotation.y += aksi === "kiri" ? -Math.PI / 6 : Math.PI / 6;
        gambar();
      }
    };
    const ukuran = new ResizeObserver(() => {
      const lebar = tempat.clientWidth;
      const tinggi = tempat.clientHeight;
      if (!lebar || !tinggi) return;
      kamera.aspect = lebar / tinggi;
      kamera.updateProjectionMatrix();
      perender.setSize(lebar, tinggi);
      gambar();
      setTersedia(!perender.getContext().isContextLost());
    });
    ukuran.observe(tempat);
    kontrol.addEventListener("change", gambar);
    const preferensi = window.matchMedia("(prefers-reduced-motion: reduce)");
    const kurangi = () => {
      if (preferensi.matches) berjalan.forEach((gerak) => gerak.complete());
      gambar();
    };
    preferensi.addEventListener("change", kurangi);
    const hilang = (kejadian: Event) => {
      kejadian.preventDefault();
      hentikan();
      setTersedia(false);
    };
    const pulih = () => { gambar(); setTersedia(true); };
    perender.domElement.addEventListener("webglcontextlost", hilang);
    perender.domElement.addEventListener("webglcontextrestored", pulih);
    return () => {
      hentikan();
      kendalikan.current = null;
      ukuran.disconnect();
      preferensi.removeEventListener("change", kurangi);
      kontrol.removeEventListener("change", gambar);
      kontrol.dispose();
      geometri.dispose();
      bahan.forEach((materi) => materi.dispose());
      perender.domElement.removeEventListener("webglcontextlost", hilang);
      perender.domElement.removeEventListener("webglcontextrestored", pulih);
      perender.dispose();
      perender.domElement.remove();
    };
  }, []);

  return (
    <figure className="spesimen">
      <div className="spesimen-label"><span>Studi bentuk / Melon</span><em>Cucumis melo L.</em></div>
      <div className="spesimen-panggung">
        <div className="spesimen-cawan" aria-hidden="true" />
        <div ref={wadah} className="spesimen-kanvas" aria-hidden="true" />
        {!tersedia && <div className="spesimen-statis" aria-hidden="true">
          {Array.from({ length: JUMLAH }, (_, i) => <i key={i} />)}
        </div>}
      </div>
      <div className="spesimen-kontrol">
        <div className="pilihan-susunan" aria-label="Susunan ilustrasi" role="group">
          <button type="button" disabled={!tersedia} aria-pressed={!tertata} onClick={() => {
            setTertata(false); kendalikan.current?.("tersebar");
          }}>Tersebar</button>
          <button type="button" disabled={!tersedia} aria-pressed={tertata} onClick={() => {
            setTertata(true); kendalikan.current?.("tertata");
          }}>Tertata</button>
        </div>
        <div className="flex gap-1">
          <button type="button" className="putar-spesimen" disabled={!tersedia}
            aria-label="Putar spesimen ke kiri" onClick={() => kendalikan.current?.("kiri")}>↶</button>
          <button type="button" className="putar-spesimen" disabled={!tersedia}
            aria-label="Putar spesimen ke kanan" onClick={() => kendalikan.current?.("kanan")}>↷</button>
        </div>
      </div>
      <figcaption>Ilustrasi bentuk benih, bukan hasil analisis foto.
        {!tersedia && " Tampilan statis; 3D tidak tersedia."}
      </figcaption>
    </figure>
  );
}

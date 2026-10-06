import type { MotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gerakanDikurangi } from "../lib/animasi";

/**
 * Adegan pembuka: benih melon di rongga buah yang dibelah, lalu turun ke
 * nampan sebagai satu lot dan dipindai.
 *
 * `progres` (0..1) datang dari posisi gulir; dibaca di dalam loop render,
 * tidak pernah lewat state React. Tahapan:
 *   0.00-0.12  rongga buah, berputar pelan
 *   0.12-0.58  tiap benih terbang ke nampan (bergiliran, kiri ke kanan)
 *   0.60-0.92  garis pindai menyapu; benih yang terlewati diberi kontur
 * Ini ilustrasi metode, bukan data. Benih "cacat" dipilih acak tetap.
 */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Pembangkit acak dengan benih tetap, supaya susunan sama di tiap muat. */
function acak(benih: number) {
  let s = benih >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bola satuan dibentuk menjadi benih melon: pipih, satu ujung lancip. */
function geometriBenih() {
  const g = new THREE.SphereGeometry(1, 48, 24);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = (v.x + 1) / 2; // 0 ujung tumpul, 1 ujung lancip
    const lebar = 0.46 * (1 - 0.66 * Math.pow(t, 2.3)) * (0.9 + 0.1 * Math.sin(Math.PI * t));
    const tebal = 0.13 * (1 - 0.55 * Math.pow(t, 2)) * (0.75 + 0.25 * (1 - Math.abs(v.y)));
    p.setXYZ(i, v.x, v.y * lebar, v.z * tebal);
  }
  g.computeVertexNormals();
  return g;
}

interface Benih {
  rongga: THREE.Matrix4;
  nampan: { x: number; y: number; r: number };
  jeda: number;
  cacat: boolean;
  warna: THREE.Color;
}

function susunan(n: number): Benih[] {
  const r = acak(7);
  const kolom = Math.ceil(Math.sqrt(n * 1.75));
  const baris = Math.ceil(n / kolom);
  const lebarNampan = 7.2, tinggiNampan = 3.6;
  const out: Benih[] = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) {
    // Rongga: tiga lobus plasenta, benih menempel dengan ujung lancip ke pusat.
    const lobus = i % 3;
    const sudut = lobus * (Math.PI * 2 / 3) + (r() - 0.5) * 1.55 + 0.4;
    const jari = 0.62 + Math.pow(r(), 0.8) * 0.95;
    const pos = new THREE.Vector3(Math.cos(sudut) * jari, Math.sin(sudut) * jari * 0.92, (r() - 0.5) * 0.9);
    e.set((r() - 0.5) * 1.1, (r() - 0.5) * 0.9, sudut + Math.PI + (r() - 0.5) * 0.5);
    q.setFromEuler(e);
    const m = new THREE.Matrix4().compose(pos, q, s);

    const k = i % kolom, b = Math.floor(i / kolom);
    const x = (k / (kolom - 1) - 0.5) * lebarNampan + (r() - 0.5) * 0.28;
    const y = (0.5 - b / Math.max(1, baris - 1)) * tinggiNampan + (r() - 0.5) * 0.24;
    const nada = 0.92 + r() * 0.1;
    out.push({
      rongga: m,
      nampan: { x, y, r: (r() - 0.5) * Math.PI * 2 },
      jeda: (x / lebarNampan + 0.5) * 0.7 + r() * 0.3,
      cacat: r() < 0.06,
      warna: new THREE.Color("#ead6a8").multiplyScalar(nada),
    });
  }
  return out;
}

export default function RonggaBiji({ progres, className }: { progres: MotionValue<number>; className?: string }) {
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // Tanpa WebGL: latar CSS tetap tampil, adegan dilewati.
    }
    const kurangi = gerakanDikurangi();
    const kecil = window.innerWidth < 768;
    const N = kecil ? 96 : 168;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 11.5);

    scene.add(new THREE.HemisphereLight("#fff4e6", "#3a2a18", 0.9));
    const kunci = new THREE.DirectionalLight("#fff1dc", 2.4);
    kunci.position.set(-4, 5, 7);
    scene.add(kunci);
    const tepi = new THREE.DirectionalLight("#ff9a4d", 1.6);
    tepi.position.set(5, -3, -4);
    scene.add(tepi);

    const grup = new THREE.Group();
    scene.add(grup);

    const geo = geometriBenih();
    const bahan = new THREE.MeshPhysicalMaterial({
      color: "#ffffff", roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.35,
      sheen: 0.6, sheenColor: new THREE.Color("#fff6df"), sheenRoughness: 0.5,
    });
    const benih = new THREE.InstancedMesh(geo, bahan, N);
    benih.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    grup.add(benih);

    // Kontur hasil pindai: salinan benih sedikit lebih besar, di belakangnya.
    const bahanKontur = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.95 });
    const kontur = new THREE.InstancedMesh(geo, bahanKontur, N);
    kontur.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    grup.add(kontur);

    const garisPindai = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 0.018),
      new THREE.MeshBasicMaterial({ color: "#ffb47a", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const cahayaPindai = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 0.9),
      new THREE.MeshBasicMaterial({
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
        map: (() => {
          const c = document.createElement("canvas");
          c.width = 4; c.height = 128;
          const x = c.getContext("2d")!;
          const g = x.createLinearGradient(0, 0, 0, 128);
          g.addColorStop(0, "rgba(255,170,100,0)");
          g.addColorStop(0.5, "rgba(255,170,100,0.55)");
          g.addColorStop(1, "rgba(255,170,100,0)");
          x.fillStyle = g; x.fillRect(0, 0, 4, 128);
          return new THREE.CanvasTexture(c);
        })(),
      }),
    );
    grup.add(garisPindai, cahayaPindai);

    const data = susunan(N);
    const warnaUkur = new THREE.Color("#7fcf9d");
    const warnaCacat = new THREE.Color("#f2944c");
    data.forEach((d, i) => {
      benih.setColorAt(i, d.warna);
      kontur.setColorAt(i, d.cacat ? warnaCacat : warnaUkur);
    });

    const ukuran = kecil ? 0.2 : 0.185;
    const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tP = new THREE.Vector3();
    const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qP = new THREE.Quaternion();
    const sA = new THREE.Vector3(), sP = new THREE.Vector3();
    const mat = new THREE.Matrix4(), matK = new THREE.Matrix4();
    const sumbuZ = new THREE.Vector3(0, 0, 1);
    const penunjuk = { x: 0, y: 0, tx: 0, ty: 0 };
    let putar = 0;
    // Pusat rongga di layar, dalam satuan adegan (diisi saat ukuran berubah).
    const pusat = { x: 0, y: 0 };

    function susun(p: number, dt: number) {
      const ke = smooth(0.12, 0.58, p);
      putar += dt * 0.09 * (1 - ke);
      const pindai = smooth(0.6, 0.92, p);
      const yPindai = lerp(2.5, -2.5, pindai);

      grup.rotation.x = lerp(-0.62, 0, ke) + penunjuk.y * 0.12;
      grup.rotation.y = penunjuk.x * 0.16 * (1 - ke * 0.6);
      grup.rotation.z = lerp(putar, 0, ke);
      grup.position.x = lerp(pusat.x, 0, ke);
      grup.position.y = lerp(pusat.y, kecil ? 1.1 : -0.3, ke);
      const skalaGrup = lerp(1, kecil ? 0.62 : 1, ke);
      grup.scale.setScalar(skalaGrup);

      for (let i = 0; i < N; i++) {
        const d = data[i];
        const lokal = smooth(0, 1, (ke * 1.6 - d.jeda * 0.6));
        d.rongga.decompose(tA, qA, sA);
        tB.set(d.nampan.x, d.nampan.y, 0);
        qB.setFromAxisAngle(sumbuZ, d.nampan.r);
        // Berlawanan dengan putaran grup, supaya nampan tetap tegak.
        tP.lerpVectors(tA, tB, lokal);
        tP.z += Math.sin(lokal * Math.PI) * 1.4;
        qP.slerpQuaternions(qA, qB, lokal);
        sP.setScalar(ukuran);
        mat.compose(tP, qP, sP);
        benih.setMatrixAt(i, mat);

        // Kontur muncul setelah garis pindai melewati benih.
        const terlewat = pindai > 0 && d.nampan.y > yPindai ? smooth(0, 0.35, d.nampan.y - yPindai) : 0;
        const sk = ukuran * (1 + 0.2 * terlewat) * (terlewat > 0 ? 1 : 0.0001);
        sP.set(sk, sk * (1 + 0.25 * terlewat), sk * 0.2);
        tP.z -= 0.06;
        matK.compose(tP, qP, sP);
        kontur.setMatrixAt(i, matK);
      }
      benih.instanceMatrix.needsUpdate = true;
      kontur.instanceMatrix.needsUpdate = true;

      const nyala = pindai > 0 && pindai < 1 ? Math.sin(pindai * Math.PI) : 0;
      garisPindai.position.set(0, yPindai, 0.3);
      cahayaPindai.position.set(0, yPindai, 0.29);
      (garisPindai.material as THREE.MeshBasicMaterial).opacity = nyala;
      (cahayaPindai.material as THREE.MeshBasicMaterial).opacity = nyala * 0.8;
    }

    function ubahUkuran() {
      const w = el!.clientWidth, h = el!.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / Math.max(1, h);
      // Layar sempit: mundurkan kamera supaya nampan tetap muat.
      camera.position.z = camera.aspect < 1 ? 11.5 / Math.max(camera.aspect, 0.55) : 11.5;
      camera.updateProjectionMatrix();
      // Samakan dengan irisan CSS: desktop di (100% - 27vh, 50%), ponsel di (50%, 23%).
      const setengah = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const satuan = setengah / (h / 2);
      pusat.x = w >= 768 ? (w / 2 - 0.27 * h) * satuan : 0;
      pusat.y = w >= 768 ? 0 : 0.27 * h * satuan;
    }
    const ro = new ResizeObserver(() => { ubahUkuran(); if (kurangi) gambar(0); });
    ro.observe(el);
    ubahUkuran();

    function gambar(dt: number) {
      penunjuk.x += (penunjuk.tx - penunjuk.x) * 0.06;
      penunjuk.y += (penunjuk.ty - penunjuk.y) * 0.06;
      susun(progres.get(), dt);
      renderer.render(scene, camera);
    }

    let terlihat = true, bingkai = 0, sebelum = performance.now();
    const io = new IntersectionObserver(([m]) => { terlihat = m.isIntersecting; });
    io.observe(el);

    function loop(t: number) {
      bingkai = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - sebelum) / 1000);
      sebelum = t;
      if (terlihat && !document.hidden) gambar(dt);
    }

    const gerakPenunjuk = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      penunjuk.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      penunjuk.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    // Frame pertama langsung, dan tiap perubahan gulir ikut menggambar:
    // adegan tidak pernah kosong walau rAF ditahan peramban (tab latar).
    gambar(0);
    const lepas = progres.on("change", () => gambar(0));
    if (!kurangi) {
      window.addEventListener("pointermove", gerakPenunjuk, { passive: true });
      bingkai = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(bingkai);
      lepas();
      window.removeEventListener("pointermove", gerakPenunjuk);
      ro.disconnect();
      io.disconnect();
      geo.dispose();
      bahan.dispose();
      bahanKontur.dispose();
      garisPindai.geometry.dispose();
      cahayaPindai.geometry.dispose();
      ((cahayaPindai.material as THREE.MeshBasicMaterial).map)?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [progres]);

  return <div ref={wadah} className={className} />;
}

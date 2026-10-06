import { useEffect, useState } from "react";

/**
 * Jaring kulit melon (netting) dari noise seluler (Worley).
 *
 * Jaring melon pada dasarnya batas antar sel: garis muncul di tempat jarak
 * ke titik sel terdekat pertama dan kedua hampir sama (F2 - F1 kecil).
 * Titik dililit (wrap) di tepi ubin, jadi ubin bisa diulang tanpa jahitan.
 * Dihitung sekali per kombinasi parameter di kanvas, lalu disimpan sebagai
 * PNG. Halaman hanya memakai gambar latar, tanpa filter yang mahal.
 */
const UBIN = 384;
const simpanan = new Map<string, Promise<string>>();

function acak(benih: number) {
  let s = benih * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function buatUbin(warna: string, kerapatan: number, benih: number, tebal: number): Promise<string> {
  const kunci = `${warna}|${kerapatan}|${benih}|${tebal}`;
  const ada = simpanan.get(kunci);
  if (ada) return ada;
  const janji = new Promise<string>((selesai) => {
    const r = acak(benih);
    const n = Math.max(8, Math.round(kerapatan * 1400));
    const titik: [number, number][] = Array.from({ length: n }, () => [r() * UBIN, r() * UBIN]);
    const c = document.createElement("canvas");
    c.width = UBIN; c.height = UBIN;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(UBIN, UBIN);
    const tmp = document.createElement("canvas").getContext("2d")!;
    tmp.fillStyle = warna; tmp.fillRect(0, 0, 1, 1);
    const [cr, cg, cb] = tmp.getImageData(0, 0, 1, 1).data;
    const lebar = 1.2 + tebal * 2.4;
    for (let y = 0; y < UBIN; y++) {
      for (let x = 0; x < UBIN; x++) {
        // Liukan kecil supaya batas sel tidak lurus seperti diagram Voronoi.
        const wx = x + Math.sin(y * 0.045 + benih) * 3.2;
        const wy = y + Math.cos(x * 0.05 + benih) * 3.2;
        let f1 = 1e9, f2 = 1e9;
        for (const [px, py] of titik) {
          let dx = Math.abs(wx - px); if (dx > UBIN / 2) dx = UBIN - dx;
          let dy = Math.abs(wy - py); if (dy > UBIN / 2) dy = UBIN - dy;
          const d = dx * dx + dy * dy;
          if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
        }
        const tepi = Math.sqrt(f2) - Math.sqrt(f1);
        const a = Math.max(0, 1 - tepi / lebar);
        const i = (y * UBIN + x) * 4;
        img.data[i] = cr; img.data[i + 1] = cg; img.data[i + 2] = cb;
        img.data[i + 3] = Math.round(255 * a * a);
      }
    }
    ctx.putImageData(img, 0, 0);
    selesai(c.toDataURL("image/png"));
  });
  simpanan.set(kunci, janji);
  return janji;
}

export default function JaringKulit({
  warna = "#ffffff", kerapatan = 0.022, benih = 3, tebal = 0.5, className = "jaring",
}: {
  warna?: string;
  kerapatan?: number;
  benih?: number;
  tebal?: number;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let hidup = true;
    // Ditunda sedikit supaya tidak bersaing dengan render pertama halaman.
    const t = setTimeout(() => buatUbin(warna, kerapatan, benih, tebal).then((u) => { if (hidup) setUrl(u); }), 120);
    return () => { hidup = false; clearTimeout(t); };
  }, [warna, kerapatan, benih, tebal]);
  // Hiasan murni: sebelum ubin siap, latar polos sudah cukup.
  return <span aria-hidden className={className}
    style={url ? { backgroundImage: `url(${url})`, backgroundSize: `${UBIN}px ${UBIN}px` } : undefined} />;
}

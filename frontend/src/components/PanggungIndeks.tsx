import { animate, stagger, svg } from "animejs";
import { useEffect, useRef } from "react";
import { gerakanDikurangi } from "../lib/animasi";
import { JALUR_BENIH } from "./Lambang";

/**
 * Peraga lima indeks terukur. Tiap adegan menggambarkan apa yang benar-benar
 * dihitung dari piksel; anime.js menggambar garisnya saat adegan dipilih.
 * Angka di sini contoh peraga, bukan hasil pengukuran.
 */

export type KunciIndeks = "keseragaman_ukuran" | "keseragaman_warna" | "keutuhan_fisik" | "kebersihan_lot" | "tekstur_permukaan";

function Benih({ x, y, s = 1, r = 0, isi = "var(--benih)", garis = "var(--benih-tepi)", kelas = "" }: {
  x: number; y: number; s?: number; r?: number; isi?: string; garis?: string; kelas?: string;
}) {
  // JALUR_BENIH berpusat di (12,12) pada kotak 24.
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s}) translate(-12 -12)`}>
      <path className={kelas} d={JALUR_BENIH} fill={isi} stroke={garis} strokeWidth={1.2 / s} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

const UKURAN = [0.78, 1.12, 0.95, 1.2, 0.86, 1.04];
const WARNA = ["#efe3c4", "#e8d5a8", "#f3e8cc", "#d9bf86", "#ece0bd", "#e2cb98"];

export default function PanggungIndeks({ aktif }: { aktif: KunciIndeks }) {
  const akar = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const g = akar.current?.querySelector<SVGGElement>(`[data-adegan="${aktif}"]`);
    if (!g || gerakanDikurangi()) return;
    const anim: { revert: () => void }[] = [];
    const garis = g.querySelectorAll<SVGGeometryElement>(".gambar");
    if (garis.length) {
      anim.push(animate(svg.createDrawable(garis), { draw: ["0 0", "0 1"], duration: 1100, delay: stagger(70), ease: "inOutQuint" }));
    }
    const muncul = g.querySelectorAll(".muncul");
    if (muncul.length) {
      anim.push(animate(muncul, { opacity: [0.15, 1], scale: [0.7, 1], duration: 700, delay: stagger(55, { start: 150 }), ease: "outBack(1.6)" }));
    }
    const kedip = g.querySelectorAll(".kedip");
    if (kedip.length) {
      anim.push(animate(kedip, { opacity: { from: 0 }, duration: 500, delay: stagger(8, { from: "random" }), ease: "outQuad" }));
    }
    return () => anim.forEach((a) => a.revert());
  }, [aktif]);

  const label = "mono text-[11px]";
  return (
    <svg ref={akar} viewBox="0 0 520 360" className="h-auto w-full" role="img"
      aria-label="Peraga cara indeks dihitung dari foto. Angka pada peraga adalah contoh.">
      <defs>
        <pattern id="kisi-panggung" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="var(--line-soft)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="520" height="360" rx="20" fill="url(#kisi-panggung)" />

      {/* Keseragaman ukuran: luas tiap benih, lalu sebarannya. */}
      <g data-adegan="keseragaman_ukuran" display={aktif === "keseragaman_ukuran" ? undefined : "none"}>
        {UKURAN.map((s, i) => (
          <g key={i} className="muncul" style={{ transformOrigin: `${70 + i * 76}px 130px`, transformBox: "view-box" }}>
            <Benih x={70 + i * 76} y={130} s={s * 2.6} r={-90} />
          </g>
        ))}
        {UKURAN.map((s, i) => (
          <path key={i} className="gambar" d={`M${46 + i * 76} ${250 - s * 70}H${94 + i * 76}`} stroke="var(--ukur)" strokeWidth="3" strokeLinecap="round" />
        ))}
        <path className="gambar" d="M40 262H480" stroke="var(--garis-kontrol)" strokeWidth="1" />
        <path className="gambar" d="M40 176V262" stroke="var(--garis-kontrol)" strokeWidth="1" strokeDasharray="3 4" />
        <text x="40" y="296" className={label} fill="var(--muted)">luas proyeksi tiap benih (px²)</text>
        <text x="480" y="296" textAnchor="end" className={label} fill="var(--ukur)">CV antar benih, makin kecil makin seragam</text>
      </g>

      {/* Keseragaman warna: jarak warna tiap benih ke rerata lot (CIE76). */}
      <g data-adegan="keseragaman_warna" display={aktif === "keseragaman_warna" ? undefined : "none"}>
        {WARNA.map((w, i) => {
          const a = (i / WARNA.length) * Math.PI * 2 - Math.PI / 2;
          const x = 260 + Math.cos(a) * 128, y = 172 + Math.sin(a) * 112;
          return (
            <g key={w}>
              <path className="gambar" d={`M${x} ${y}L260 172`} stroke="var(--ukur)" strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" />
              <g className="muncul" style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}>
                <Benih x={x} y={y} s={2.3} r={(a * 180) / Math.PI} isi={w} />
              </g>
            </g>
          );
        })}
        <circle className="muncul" cx="260" cy="172" r="26" fill="#e9d6a9" stroke="var(--ink)" strokeWidth="1.5" style={{ transformOrigin: "260px 172px", transformBox: "view-box" }} />
        <text x="260" y="176" textAnchor="middle" className={label} fill="#3d2f12">rerata</text>
        <text x="40" y="336" className={label} fill="var(--ukur)">ΔE rata-rata ke warna rerata lot, makin kecil makin seragam</text>
      </g>

      {/* Keutuhan: luas benih dibagi luas cangkang cembungnya (solidity). */}
      <g data-adegan="keutuhan_fisik" display={aktif === "keutuhan_fisik" ? undefined : "none"}>
        <g transform="translate(260 170) scale(11) translate(-12 -12)">
          <path d="M2 12C2 7.6 6.4 5 11.5 5C14.2 5 15.6 6.4 15.2 8.2C14.9 9.6 16.9 9.8 18.6 9.4C20.4 10.2 21.4 11 22 12C20.6 15.8 16.4 19 11.5 19C6.4 19 2 16.4 2 12Z"
            fill="var(--benih)" stroke="var(--benih-tepi)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <path className="gambar" d="M2 12C2 7.6 6.4 5 11.5 5C16.4 5 20.6 8.2 22 12C20.6 15.8 16.4 19 11.5 19C6.4 19 2 16.4 2 12Z"
            fill="none" stroke="var(--ukur)" strokeWidth="2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
        </g>
        <circle className="muncul" cx="300" cy="124" r="6" fill="var(--accent)" style={{ transformOrigin: "300px 124px", transformBox: "view-box" }} />
        <path className="gambar" d="M305 119L380 60H470" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
        <text x="470" y="52" textAnchor="end" className={label} fill="var(--accent)">bagian yang hilang</text>
        <text x="40" y="336" className={label} fill="var(--ukur)">solidity = luas benih ÷ luas cangkang cembung (garis putus)</text>
      </g>

      {/* Bebas cacat: proporsi benih dengan solidity di bawah ambang. */}
      <g data-adegan="kebersihan_lot" display={aktif === "kebersihan_lot" ? undefined : "none"}>
        {Array.from({ length: 24 }, (_, i) => {
          const x = 72 + (i % 8) * 54, y = 92 + Math.floor(i / 8) * 76;
          const cacat = i === 5 || i === 14;
          return (
            <g key={i}>
              <g className="muncul" style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}>
                <Benih x={x} y={y} s={1.75} r={(i * 47) % 180} isi={cacat ? "#e2c99a" : "var(--benih)"} />
              </g>
              {cacat && <circle className="gambar" cx={x} cy={y} r="27" fill="none" stroke="var(--accent)" strokeWidth="2" />}
            </g>
          );
        })}
        <text x="40" y="336" className={label} fill="var(--accent)">2 dari 24 benih di bawah ambang solidity 0,9</text>
      </g>

      {/* Tekstur: homogenitas GLCM di dalam kontur tiap benih. */}
      <g data-adegan="tekstur_permukaan" display={aktif === "tekstur_permukaan" ? undefined : "none"}>
        <clipPath id="klip-tekstur"><path transform="translate(260 170) scale(11) translate(-12 -12)" d={JALUR_BENIH} /></clipPath>
        <Benih x={260} y={170} s={11} />
        <g clipPath="url(#klip-tekstur)">
          {Array.from({ length: 21 * 12 }, (_, i) => (
            <rect key={i} className="kedip" x={140 + (i % 21) * 11.6} y={92 + Math.floor(i / 21) * 13.4} width="10.6" height="12.4" fill="var(--benih-tepi)" opacity={0.12 + ((i * 37) % 50) / 100} />
          ))}
        </g>
        <path className="gambar" d="M402 120h56M402 120v-24" stroke="var(--ukur)" strokeWidth="1.5" fill="none" />
        <text x="462" y="124" className={label} fill="var(--ukur)">piksel</text>
        <text x="40" y="336" className={label} fill="var(--ukur)">homogenitas GLCM, tidak memastikan ada atau tidaknya jamur</text>
      </g>
    </svg>
  );
}

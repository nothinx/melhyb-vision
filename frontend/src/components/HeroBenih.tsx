import { animate, stagger, utils } from "animejs";
import { useEffect, useRef } from "react";
import { KONTUR_LOT } from "../data/kontur-lot";
import { gerakanDikurangi } from "../lib/animasi";

/**
 * Pembuka halaman: kontur benih sungguhan, digambar satu per satu.
 *
 * Bentuk-bentuk ini bukan ilustrasi. Semuanya keluaran `segment_seeds` atas
 * satu lot benih — 46 kontur, 7 di antaranya ditandai cacat karena
 * solidity-nya di bawah ambang, persis kriteria yang dipakai saat menilai
 * foto operator. Lihat `skrip/buat-kontur.py`.
 *
 * Gerakannya karena itu bukan hiasan: urutan kiri-ke-kanan adalah urutan
 * aplikasi memeriksa benih, dan warna jingga muncul tepat pada benih yang
 * memang gagal uji keutuhan. Sebuah pembuka sebaiknya memperlihatkan
 * pekerjaan yang dilakukan halaman itu, bukan sekadar bergerak.
 *
 * Keadaan diamnya lengkap: semua kontur tergambar penuh. Animasi hanya
 * menghapus lalu menggambarnya kembali — kalau JS tidak jalan, yang terlihat
 * tetap lot yang sudah selesai diukur.
 */
export default function HeroBenih() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || gerakanDikurangi()) return;

    const garis = el.querySelectorAll<SVGPathElement>("[data-garis]");
    const isian = el.querySelectorAll<SVGPathElement>("[data-isi]");
    if (!garis.length) return;

    utils.set(garis, { strokeDashoffset: 1 });
    utils.set(isian, { opacity: 0 });

    const gambar = animate(garis, {
      strokeDashoffset: 0,
      duration: 620,
      delay: stagger(38),
      ease: "out(2)",
    });
    const isi = animate(isian, {
      opacity: 1,
      duration: 520,
      delay: stagger(38, { start: 180 }),
      ease: "out(2)",
    });

    return () => {
      gambar.pause();
      isi.pause();
    };
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="-60 120 1120 700"
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      aria-hidden
    >
      {KONTUR_LOT.map(({ d, cacat }, i) => {
        const warna = cacat ? "var(--estimasi)" : "var(--accent)";
        return (
          <g key={i}>
            <path d={d} fill={warna} opacity={cacat ? 0.4 : 0.22} data-isi />
            <path
              d={d}
              fill="none"
              stroke={warna}
              strokeWidth={cacat ? 4.2 : 2.8}
              opacity={cacat ? 1 : 0.72}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={0}
              strokeLinejoin="round"
              data-garis
            />
          </g>
        );
      })}
    </svg>
  );
}

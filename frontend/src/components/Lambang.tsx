import { KONTUR_LOT } from "../data/kontur-lot";

/**
 * Aset gambar bawaan aplikasi — SVG sebaris, bukan berkas atau pustaka ikon.
 *
 * Dua alasan. Pertama, CSP-nya `default-src 'self'`: tidak ada CDN gambar,
 * dan menjadikannya SVG sebaris berarti warnanya ikut token tema lewat
 * `currentColor` — satu berkas PNG tidak bisa berganti warna saat tema
 * berganti. Kedua, bentuknya memang milik aplikasi ini: benih dan lingkaran
 * ukur, bukan metafora umum yang ditempelkan.
 */

/** Lambang aplikasi: satu benih di dalam lingkaran ukur. */
export function Lambang({ ukuran = 28 }: { ukuran?: number }) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={ukuran}
      height={ukuran}
      fill="none"
      aria-hidden
    >
      <circle
        cx="14" cy="14" r="9.5"
        stroke="currentColor" strokeWidth="1.4" opacity=".55"
      />
      <ellipse
        cx="14" cy="14" rx="6.2" ry="4.1"
        transform="rotate(-24 14 14)" fill="currentColor"
      />
      <path
        d="M11.6 15.4c1.6-2 3.4-3.1 5.6-3.6"
        stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Ilustrasi keadaan kosong: potongan lot yang sama dengan pembuka halaman —
 * kontur benih sungguhan dari `segment_seeds`, bukan elips karangan.
 *
 * Yang diperlihatkan persis keadaan yang sedang dijelaskan: benihnya ada dan
 * sudah terukur, yang belum ada hanya datanya. Sepuluh kontur cukup untuk
 * terbaca pada ukuran kecil; memakai keempat puluh enam akan jadi bubur.
 */
export function BenihKosong({ ukuran = 104 }: { ukuran?: number }) {
  const potongan = KONTUR_LOT.slice(8, 18);
  return (
    <svg
      viewBox="150 250 620 500"
      width={ukuran}
      height={(ukuran * 500) / 620}
      aria-hidden
      className="text-muted"
    >
      {potongan.map(({ d, cacat }, i) => (
        <g key={i}>
          <path
            d={d}
            fill={cacat ? "var(--estimasi)" : "currentColor"}
            opacity={cacat ? 0.28 : 0.2}
          />
          <path
            d={d}
            fill="none"
            stroke={cacat ? "var(--estimasi)" : "var(--accent)"}
            strokeWidth={cacat ? 5 : 3.6}
            opacity={cacat ? 0.9 : 0.55}
            strokeLinejoin="round"
          />
        </g>
      ))}
    </svg>
  );
}

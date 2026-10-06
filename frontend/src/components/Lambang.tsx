/** Bentuk benih melon: tumpul di satu ujung, lancip di ujung lain. */
export const JALUR_BENIH = "M2 12C2 7.6 6.4 5 11.5 5C16.4 5 20.6 8.2 22 12C20.6 15.8 16.4 19 11.5 19C6.4 19 2 16.4 2 12Z";

/** Lambang aplikasi: satu benih di dalam cincin ukur. */
export function Lambang({ ukuran = 28 }: { ukuran?: number }) {
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 32 32" aria-hidden fill="none">
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeOpacity="0.35" />
      <path d="M16 1.5v3M16 27.5v3M1.5 16h3M27.5 16h3" stroke="currentColor" strokeLinecap="round" />
      <g transform="translate(4 4) rotate(-28 12 12)">
        <path d={JALUR_BENIH} fill="var(--benih)" stroke="var(--benih-tepi)" strokeWidth="1" />
        <path d="M5 12h12" stroke="var(--benih-tepi)" strokeOpacity="0.6" strokeWidth="0.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Ilustrasi keadaan kosong: nampan dengan lubang benih yang belum terisi. */
export function BenihKosong({ ukuran = 104 }: { ukuran?: number }) {
  const posisi = [
    [20, 30, -20], [46, 24, 12], [72, 32, -8], [30, 56, 25], [58, 52, -30], [84, 58, 10], [44, 78, -14], [70, 80, 22],
  ];
  return (
    <svg width={ukuran} height={ukuran * 0.85} viewBox="0 0 104 92" aria-hidden fill="none">
      <rect x="4" y="6" width="96" height="82" rx="16" stroke="var(--line)" strokeWidth="1.5" />
      {posisi.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x - 9} ${y - 6}) rotate(${r} 9 6) scale(0.75)`}>
          <path d={JALUR_BENIH} stroke="var(--garis-kontrol)" strokeDasharray="2.5 2.5" strokeWidth="1.3" />
        </g>
      ))}
    </svg>
  );
}

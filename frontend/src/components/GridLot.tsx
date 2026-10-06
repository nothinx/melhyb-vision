import { animate, stagger } from "animejs";
import { useEffect, useRef } from "react";
import { gerakanDikurangi } from "../lib/animasi";

/**
 * Satu sel = satu lot berpasangan (foto + hasil uji perkecambahan).
 * Sel terisi menunjukkan lot yang sudah ada; sisanya menunggu. Kemajuan
 * menuju syarat kalibrasi terbaca tanpa grafik.
 */
export default function GridLot({ terisi, syarat, label }: { terisi: number; syarat: number; label: string }) {
  const akar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = akar.current;
    if (!el || gerakanDikurangi()) return;
    let a: { revert: () => void } | undefined;
    const io = new IntersectionObserver(([m]) => {
      if (!m.isIntersecting) return;
      io.disconnect();
      a = animate(el.querySelectorAll("[data-sel]"), {
        scale: [0.4, 1], opacity: [0.3, 1], duration: 600,
        delay: stagger(22, { grid: [10, Math.ceil(syarat / 10)], from: "first" }), ease: "outBack(1.4)",
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); a?.revert(); };
  }, [syarat]);

  const isi = Math.min(terisi, syarat);
  return (
    <div>
      <div ref={akar} role="img" aria-label={`${label}: ${terisi} dari ${syarat} lot`}
        className="grid grid-cols-10 gap-1.5 sm:gap-2">
        {Array.from({ length: syarat }, (_, i) => (
          <span key={i} data-sel
            className={`aspect-square rounded-[6px] ${i < isi ? "bg-estimasi" : "border border-dashed border-garis-kontrol/70"}`} />
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3 text-kecil">
        <span className="text-ink-2">{label}</span>
        <span className="mono tnum text-ink">{terisi}<span className="text-muted">/{syarat} lot</span></span>
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { gerakanDikurangi } from "../lib/animasi";

interface ProgressBarProps {
  current: number;
  target: number;
  warna?: string;
  tinggi?: number;
  label?: string;
  satuan?: string;
}

export default function ProgressBar({
  current,
  target,
  warna = "var(--tunas)",
  tinggi = 6,
  label,
  satuan,
}: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || gerakanDikurangi()) {
      if (ref.current) ref.current.style.width = "100%";
      return;
    }
    const el = ref.current;
    el.style.width = "0%";
    const durasi = Math.max(400, target * 12);
    animate(el, {
      width: `${(current / target) * 100}%`,
      duration: durasi,
      easing: "easeOutQuad",
      begin: () => {
        el.style.transition = "none";
      },
    });
  }, [current, target, warna]);

  return (
    <div className="grid gap-1.5">
      {label && (
        <div className="flex items-center justify-between text-kecil">
          <span className="text-muted">{label}</span>
          <span className="tnum font-semibold" style={{ color: warna }}>
            {current}{satuan && <>{satuan} / </>}{target}
          </span>
        </div>
      )}
      <div
        ref={ref}
        className="h-full rounded-full bg-surface-2 overflow-hidden"
        style={{ height: tinggi }}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={label ? `${label}: ${current} dari ${target}` : "Progress"}
      >
        <div
          className="h-full rounded-full"
          style={{ background: warna, transition: "none" }}
        />
      </div>
    </div>
  );
}

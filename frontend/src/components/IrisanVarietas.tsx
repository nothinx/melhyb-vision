import type { Penanda } from "../lib/varietas";
import JaringKulit from "./JaringKulit";

/** Panel ilustrasi varietas: kulit berjaring dengan irisan daging buah. */
export default function IrisanVarietas({ p, className = "" }: { p: Penanda; className?: string }) {
  return (
    <div aria-hidden className={`relative isolate overflow-hidden ${className}`}
      style={{ background: `linear-gradient(150deg, ${p.kulit}, color-mix(in oklab, ${p.kulit} 50%, #0a100c))` }}>
      <span className="absolute inset-0 opacity-45">
        <JaringKulit warna={p.jaring} kerapatan={p.kerapatan} benih={p.benih} tebal={p.bersertifikat ? 0.6 : 0.4} />
      </span>
      <span className="absolute top-1/2 left-1/2 aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle closest-side, color-mix(in oklab, ${p.daging} 45%, white) 0 26%, ${p.daging} 40%, ${p.daging} 84%, color-mix(in oklab, ${p.daging} 35%, #eef3cf) 89%, ${p.kulit} 93%, color-mix(in oklab, ${p.kulit} 60%, black) 100%)`,
          boxShadow: "0 40px 80px -30px rgb(0 0 0 / 0.55)",
        }} />
      {/* Benih di rongga: tiga lobus. */}
      <svg viewBox="-50 -50 100 100" className="absolute top-1/2 left-1/2 w-[34%] -translate-x-1/2 -translate-y-1/2">
        {Array.from({ length: 27 }, (_, i) => {
          const lobus = i % 3, k = Math.floor(i / 3);
          const a = lobus * 120 + (k - 4) * 9 + 20;
          const r = 16 + (k % 3) * 9;
          return (
            <ellipse key={i} cx={Math.cos((a * Math.PI) / 180) * r} cy={Math.sin((a * Math.PI) / 180) * r}
              rx="5.6" ry="2.4" transform={`rotate(${a} ${Math.cos((a * Math.PI) / 180) * r} ${Math.sin((a * Math.PI) / 180) * r})`}
              fill="#efe3c4" stroke="#a98c58" strokeWidth="0.5" />
          );
        })}
      </svg>
      {!p.bersertifikat && <span className="absolute inset-4 rounded-[inherit] border-2 border-dashed border-white/35" />}
    </div>
  );
}

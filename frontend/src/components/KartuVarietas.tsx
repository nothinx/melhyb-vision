import { ArrowUpRight, ShieldCheck, ShieldOff } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent } from "react";
import { Link } from "react-router";
import { penanda, tanpaTitik } from "../lib/varietas";
import type { Varietas } from "../lib/types";
import JaringKulit from "./JaringKulit";

/**
 * Kartu varietas: irisan buah yang miring mengikuti penunjuk.
 * Kemiringan memakai motion value, bukan state, jadi tidak memicu render.
 */
export default function KartuVarietas({ v, jumlahLot, besar = false }: { v: Varietas; jumlahLot: number; besar?: boolean }) {
  const p = penanda(v);
  const kurangi = useReducedMotion();
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 180, damping: 18 });
  const sorot = useMotionTemplate`radial-gradient(420px circle at ${useTransform(mx, (x) => x * 100)}% ${useTransform(my, (y) => y * 100)}%, rgb(255 255 255 / 0.16), transparent 60%)`;

  function gerak(e: PointerEvent<HTMLAnchorElement>) {
    if (kurangi) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  }

  return (
    <motion.div style={kurangi ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }} className="h-full">
      <Link to={`/varietas#${p.slug}`} onPointerMove={gerak} onPointerLeave={() => { mx.set(0.5); my.set(0.5); }}
        className={`group relative isolate flex h-full flex-col justify-between overflow-hidden rounded-[28px] p-6 text-white sm:p-7 ${besar ? "min-h-[440px]" : "min-h-[260px]"} ${p.bersertifikat ? "" : "outline-2 -outline-offset-8 outline-white/40 outline-dashed"}`}
        style={{ background: `linear-gradient(160deg, ${p.kulit}, color-mix(in oklab, ${p.kulit} 55%, #0a100c))` }}>
        <span className="absolute inset-0 -z-10 opacity-45 transition-transform duration-700 group-hover:scale-110">
          <JaringKulit warna={p.jaring} kerapatan={p.kerapatan} benih={p.benih} tebal={p.bersertifikat ? 0.6 : 0.4} />
        </span>
        {/* Irisan daging buah dengan rongga benih, menyembul di pojok. */}
        <span aria-hidden className={`absolute -z-10 rounded-full transition-transform duration-700 group-hover:-translate-x-3 group-hover:-translate-y-3 ${besar ? "-right-24 -bottom-24 size-[380px]" : "-right-20 -bottom-24 size-[240px]"}`}
          style={{ background: `radial-gradient(circle, color-mix(in oklab, ${p.daging} 60%, white) 0 18%, ${p.daging} 34%, ${p.daging} 62%, color-mix(in oklab, ${p.daging} 40%, #e8f0c8) 70%, ${p.kulit} 74%)`, boxShadow: "inset 0 0 0 10px rgb(0 0 0 / 0.12)" }} />
        <motion.span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: sorot }} />

        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-mikro font-medium backdrop-blur-md">
            {p.bersertifikat ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
            {p.bersertifikat ? "Bersertifikat" : "Pembanding, tanpa sertifikat"}
          </span>
          <ArrowUpRight size={20} className="opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
        </div>
        <div className="[text-shadow:0_1px_18px_rgb(0_0_0/0.35)]">
          <h3 className={`display m-0 ${besar ? "text-[clamp(2.2rem,4vw,3.4rem)]" : "text-[1.75rem]"}`}>{v.nama}</h3>
          <p className="mt-2 mb-0 max-w-[30ch] text-dasar text-white/85">{tanpaTitik(v.deskripsi || "Belum ada deskripsi")}</p>
          <p className="mono mt-4 mb-0 text-kecil text-white/75">{jumlahLot === 0 ? "Belum ada lot dianalisis" : `${jumlahLot} lot dianalisis`}</p>
        </div>
      </Link>
    </motion.div>
  );
}

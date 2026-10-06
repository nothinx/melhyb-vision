import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

import { PEGAS } from "../lib/animasi";

/**
 * Muncul saat masuk layar.
 *
 * Aturan proyek: animasi hanya boleh MENAMBAH. Karena itu titik awalnya
 * tidak pernah opacity 0. Kalau IntersectionObserver tidak pernah memicu
 * (cetak, tangkapan layar penuh, peramban lama), isinya tetap terbaca.
 */
export function Muncul({
  children, jeda = 0, jarak = 28, className, as = "div", ...sisa
}: {
  children: ReactNode;
  jeda?: number;
  jarak?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header";
} & Omit<HTMLMotionProps<"div">, "children">) {
  const kurangi = useReducedMotion();
  const Komponen = motion[as] as typeof motion.div;
  return (
    <Komponen
      className={className}
      initial={kurangi ? false : { opacity: 0.25, y: jarak }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay: jeda, ease: PEGAS }}
      {...sisa}
    >
      {children}
    </Komponen>
  );
}

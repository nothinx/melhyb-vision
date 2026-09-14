import { useEffect, useRef } from "react";
import { gerakanDikurangi } from "../lib/animasi";

interface UsePageTransitionOptions {
  delay?: number;
  duration?: number;
  easing?: string;
  direction?: "up" | "down" | "left" | "right" | "fade";
}

export function usePageTransition({
  delay = 0,
  duration = 400,
  easing = "easeOutQuint",
  direction = "up",
}: UsePageTransitionOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || gerakanDikurangi()) return;

    let hDir = 0;
    let vDir = 0;
    if (direction === "up") { hDir = 0; vDir = 16; }
    else if (direction === "down") { hDir = 0; vDir = -16; }
    else if (direction === "left") { hDir = 18; vDir = 0; }
    else if (direction === "right") { hDir = -18; vDir = 0; }

    el.style.opacity = "0";
    el.style.transform = `translateY(${vDir}px) translateX(${hDir}px)`;
    el.style.transition = "none";

    requestAnimationFrame(() => {
      el.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
      el.style.opacity = "1";
      el.style.transform = "translate(0, 0)";
    });

    const t = setTimeout(() => {
      el.style.transition = "";
    }, duration + 50);

    return () => {
      clearTimeout(t);
    };
  }, [delay, duration, easing, direction]);

  return ref;
}

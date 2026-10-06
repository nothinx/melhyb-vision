export function gerakanDikurangi(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Kurva bersama: cepat di awal, mendarat pelan. */
export const PEGAS = [0.16, 1, 0.3, 1] as const;

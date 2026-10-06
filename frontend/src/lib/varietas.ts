import type { Varietas } from "./types";

/**
 * Penanda visual per varietas. Warnanya penanda pembeda di antarmuka, bukan
 * klaim tentang rupa buah varietas itu. Dicocokkan lewat nama dari basis
 * data; varietas baru yang belum dikenal memakai penanda netral.
 */
export interface Penanda {
  slug: string;
  kulit: string;
  jaring: string;
  daging: string;
  kerapatan: number;
  benih: number;
  bersertifikat: boolean;
}

const PENANDA: Record<string, Penanda> = {
  "golden aroma": { slug: "golden-aroma", kulit: "#b9892a", jaring: "#f3dc9b", daging: "#f39a4c", kerapatan: 0.045, benih: 4, bersertifikat: true },
  "honey globe": { slug: "honey-globe", kulit: "#a7b48a", jaring: "#e9eed6", daging: "#d9e7a6", kerapatan: 0.02, benih: 9, bersertifikat: true },
  apollo: { slug: "apollo", kulit: "#4f6b45", jaring: "#c9d8b4", daging: "#f2a05a", kerapatan: 0.034, benih: 15, bersertifikat: true },
  "benih petani": { slug: "benih-petani", kulit: "#6f6a5c", jaring: "#cfc8b4", daging: "#e8b98a", kerapatan: 0.028, benih: 21, bersertifikat: false },
};

export function penanda(v: Pick<Varietas, "nama">): Penanda {
  return PENANDA[v.nama.toLowerCase()] ?? {
    slug: v.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    kulit: "#5c6b60", jaring: "#cdd6cc", daging: "#e7c49e", kerapatan: 0.03, benih: 30, bersertifikat: true,
  };
}

/** "Tipe Hami." -> "Tipe Hami" */
export const tanpaTitik = (s: string) => s.replace(/\.$/, "");

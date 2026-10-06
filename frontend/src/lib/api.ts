/**
 * Lapisan data dengan mode demo.
 *
 * Pemeriksaan kesehatan pertama menentukan mode demo atau data langsung.
 * Setelah server terhubung, kegagalan permintaan tetap dilaporkan sebagai
 * galat, bukan diganti dengan angka contoh.
 */
import {
  DEMO_HASIL_PER_ID, DEMO_KALIBRASI, DEMO_KOMODITAS, DEMO_METODOLOGI, DEMO_RINGKASAN, DEMO_RIWAYAT, DEMO_STANDAR,
  DEMO_VARIETAS,
} from "./demo";
import type {
  BarisRiwayat, HasilAnalisis, Komoditas, Metodologi, Ringkasan,
  StandarResponse, StatusKalibrasi, Varietas,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "";

type Mode = "memeriksa" | "langsung" | "demo";

let mode: Mode = "memeriksa";
const pendengar = new Set<(m: Mode) => void>();

export function modeSekarang(): Mode {
  return mode;
}

export function dengarkanMode(fn: (m: Mode) => void): () => void {
  pendengar.add(fn);
  return () => pendengar.delete(fn);
}

function setMode(m: Mode) {
  if (mode === m) return;
  mode = m;
  pendengar.forEach((fn) => fn(m));
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(
      typeof detail === "string"
        ? detail
        : ((detail as { pesan?: string })?.pesan ?? "Permintaan tidak dapat diproses. Coba lagi."),
    );
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Backend hidup? Diperiksa sekali, hasilnya dipakai seterusnya. */
let probe: Promise<boolean> | null = null;

export function periksaBackend(): Promise<boolean> {
  probe ??= (async () => {
    const pengendali = new AbortController();
    const batasWaktu = setTimeout(() => pengendali.abort(), 2500);
    try {
      const res = await fetch(`${BASE}/api/kesehatan`, { signal: pengendali.signal });
      const ok = res.ok;
      setMode(ok ? "langsung" : "demo");
      return ok;
    } catch {
      setMode("demo");
      return false;
    } finally {
      clearTimeout(batasWaktu);
    }
  })();
  return probe;
}

async function json<T>(path: string, contoh: T): Promise<T> {
  if (!(await periksaBackend())) return contoh;
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const isi = await res.text();
    let rincian: unknown = isi;
    try { rincian = JSON.parse(isi)?.detail ?? isi; } catch { /* Respons server dapat berupa teks biasa. */ }
    throw new ApiError(res.status, rincian);
  }
  return (await res.json()) as T;
}

/**
 * `GET /api/analisis/{id}` mengembalikan baris basis data apa adanya, bukan
 * bentuk yang dikembalikan `POST /api/analisis`. Namanya berbeda untuk objek
 * yang sama — `gerbang`/`indeks`/`estimasi` lawan
 * `gerbang_citra`/`indeks_terukur`/`estimasi_fisiologis` — dan `segmentasi`
 * tidak ada sama sekali karena hanya `n_benih` yang tersimpan.
 *
 * Diseragamkan di sini, di satu batas, supaya komponen tidak perlu tahu
 * sebuah hasil datang dari unggahan baru atau dari riwayat. Kalau nanti
 * backend menyamakan bentuknya, fungsi ini tinggal dihapus.
 */
function seragamkanHasil(mentah: Record<string, unknown>): HasilAnalisis {
  const ambil = <T,>(...kunci: string[]): T | undefined => {
    for (const k of kunci) if (mentah[k] !== undefined) return mentah[k] as T;
    return undefined;
  };
  return {
    ...(mentah as unknown as HasilAnalisis),
    gerbang_citra: ambil<HasilAnalisis["gerbang_citra"]>(
      "gerbang_citra", "gerbang",
    ),
    indeks_terukur: ambil<HasilAnalisis["indeks_terukur"]>(
      "indeks_terukur", "indeks",
    ) ?? [],
    estimasi_fisiologis: ambil<HasilAnalisis["estimasi_fisiologis"]>(
      "estimasi_fisiologis", "estimasi",
    ) ?? [],
    segmentasi: ambil<HasilAnalisis["segmentasi"]>("segmentasi") ?? {
      jumlah_benih: ambil<number>("n_benih") ?? 0,
    },
  };
}

export const api = {
  komoditas: () => json<Komoditas[]>("/api/katalog/komoditas", DEMO_KOMODITAS),
  varietas: () => json<Varietas[]>("/api/katalog/varietas", DEMO_VARIETAS),
  riwayat: (komoditas?: string) =>
    json<BarisRiwayat[]>(
      `/api/analisis${komoditas ? `?komoditas=${encodeURIComponent(komoditas)}` : ""}`,
      komoditas
        ? DEMO_RIWAYAT.filter((r) => r.komoditas_slug === komoditas)
        : DEMO_RIWAYAT,
    ),
  ringkasan: () => json<Ringkasan>("/api/analisis/ringkasan", DEMO_RINGKASAN),
  metodologi: () => json<Metodologi>("/api/metodologi", DEMO_METODOLOGI),
  standar: () => json<StandarResponse>("/api/standar", DEMO_STANDAR),
  kalibrasi: () => json<StatusKalibrasi[]>("/api/kalibrasi/status", DEMO_KALIBRASI),
  detail: async (id: number) => {
    if (!(await periksaBackend()) && !DEMO_HASIL_PER_ID[id]) {
      throw new ApiError(404, "Rincian lot hanya tersedia saat server terhubung.");
    }
    return seragamkanHasil(
      await json<Record<string, unknown>>(
        `/api/analisis/${id}`,
        DEMO_HASIL_PER_ID[id] as unknown as Record<string, unknown>,
      ),
    );
  },

  /** Unggah citra. Di mode demo, kembalikan contoh hasil setelah jeda. */
  async analisis(berkas: File, komoditas: string, varietasId: number | null): Promise<HasilAnalisis> {
    if (!(await periksaBackend())) {
      // Tanpa server tidak ada yang bisa diukur, dan contoh hasil buatan
      // sengaja tidak ditampilkan.
      void komoditas; void varietasId;
      throw new ApiError(503, "Server belum terhubung. Jalankan jalankan.bat di komputer ini, lalu buka http://localhost:8001 untuk menganalisis foto.");
    }
    const form = new FormData();
    form.append("berkas", berkas);
    form.append("komoditas", komoditas);
    if (varietasId !== null) form.append("varietas_id", String(varietasId));
    const res = await fetch(`${BASE}/api/analisis`, {
      method: "POST",
      body: form,
    });
    const body = await res.json();
    if (!res.ok) throw new ApiError(res.status, body?.detail ?? body);
    return body as HasilAnalisis;
  },

  citraUrl: (id: number, anotasi = true) =>
    `${BASE}/api/analisis/${id}/citra?anotasi=${anotasi}`,
  eksporUrl: () => `${BASE}/api/analisis/ekspor/csv`,
};

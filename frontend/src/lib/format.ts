export const KELAS_STATUS: Record<
  string,
  { warna: string; label: string; nada: "good" | "warning" | "serious" | "critical" | "netral" }
> = {
  "Sangat Baik": { warna: "var(--status-good)", label: "Sangat Baik", nada: "good" },
  Baik: { warna: "var(--status-good)", label: "Baik", nada: "good" },
  Sedang: { warna: "var(--status-warning)", label: "Sedang", nada: "warning" },
  Rendah: { warna: "var(--status-serious)", label: "Rendah", nada: "serious" },
  "Tidak memenuhi ambang edar": {
    warna: "var(--status-critical)",
    label: "Tidak memenuhi ambang edar",
    nada: "critical",
  },
  "Belum dapat dinilai": {
    warna: "var(--muted)",
    label: "Belum dapat dinilai",
    nada: "netral",
  },
};

export const WARNA_KOMODITAS: Record<string, string> = {
  sorgum: "var(--series-1)",
  melon: "var(--series-2)",
  edamame: "var(--series-3)",
};

export function tanggal(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function waktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function angka(n: number | null | undefined, desimal = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(desimal);
}

export function judulKunci(k: string): string {
  return k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

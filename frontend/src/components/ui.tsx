import clsx from "clsx";
import type { ReactNode } from "react";
import { angka } from "../lib/format";
import { BenihKosong } from "./Lambang";

/* Sistem sudut: panel 22px, kontrol 12px, tombol & lencana pil penuh. */

export function Card({
  children, className, as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return <As className={clsx("kartu min-w-0 p-5 sm:p-7", className)}>{children}</As>;
}

export function CardTitle({
  children, aksi, keterangan,
}: {
  children: ReactNode;
  aksi?: ReactNode;
  keterangan?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="display-kecil m-0 text-judul-kecil text-ink">{children}</h2>
        {keterangan && <p className="ukuran-baca mt-1.5 mb-0 text-dasar text-muted">{keterangan}</p>}
      </div>
      {aksi && <div className="shrink-0">{aksi}</div>}
    </div>
  );
}

export function StatTile({
  label, nilai, satuan, catatan, desimal = 0, urutan = 0,
}: {
  label: string;
  nilai: ReactNode;
  satuan?: string;
  catatan?: string;
  desimal?: number;
  urutan?: number;
}) {
  return (
    <div data-urutan={urutan} className="kartu overflow-hidden px-6 py-5">
      <div className="eyebrow text-muted">{label}</div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="display tnum text-angka text-ink">
          {typeof nilai === "number" ? angka(nilai, desimal) : nilai}
        </span>
        {satuan && <span className="mono text-kecil text-muted">{satuan}</span>}
      </div>
      {catatan && <div className="mt-2 text-kecil text-muted">{catatan}</div>}
    </div>
  );
}

type Nada = "ukur" | "estimasi" | "good" | "warning" | "serious" | "critical" | "netral" | "aksen";

const NADA: Record<Nada, string> = {
  ukur: "bg-ukur-soft text-ukur",
  estimasi: "bg-estimasi-soft text-estimasi",
  good: "bg-good/14 text-good-ink",
  warning: "bg-warning/18 text-warning-ink",
  serious: "bg-serious/16 text-serious-ink",
  critical: "bg-critical/14 text-critical-ink",
  netral: "bg-surface-2 text-ink-2",
  aksen: "bg-accent-soft text-accent-deep",
};

export function Badge({ children, nada = "netral", ikon }: { children: ReactNode; nada?: Nada; ikon?: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-kecil font-medium whitespace-nowrap", NADA[nada])}>
      {ikon}
      {children}
    </span>
  );
}

/**
 * Notice bernada `critical` selalu jawaban atas tindakan pengguna, jadi
 * membawa role="alert". Lewatkan `peran={null}` untuk notice kritis yang
 * sudah ada sejak render pertama.
 */
export function Notice({
  children, nada = "netral", judul, ikon, peran,
}: {
  children: ReactNode;
  nada?: "info" | "warning" | "critical" | "netral";
  judul?: string;
  ikon?: ReactNode;
  peran?: "alert" | "status" | null;
}) {
  const gaya = {
    info: "border-ukur/35 bg-ukur-soft/60",
    warning: "border-warning/45 bg-warning/10",
    critical: "border-critical/45 bg-critical/8",
    netral: "border-line bg-surface-2/70",
  }[nada];
  const garis = { info: "bg-ukur", warning: "bg-warning", critical: "bg-critical", netral: "bg-garis-kontrol" }[nada];
  const roleAkhir = peran === undefined ? (nada === "critical" ? "alert" : undefined) : peran;
  return (
    <div role={roleAkhir ?? undefined} className={clsx("relative overflow-hidden rounded-2xl border py-4 pr-4 pl-5 text-dasar text-ink", gaya)}>
      <span aria-hidden className={clsx("absolute inset-y-3 left-0 w-[3px] rounded-full", garis)} />
      {judul && <div className="mb-1 flex items-center gap-2 font-semibold">{ikon}{judul}</div>}
      <div className={judul ? "text-ink-2" : "flex items-start gap-2.5 text-ink-2"}>
        {!judul && ikon && <span className="mt-0.5 shrink-0">{ikon}</span>}
        <div className="ukuran-baca">{children}</div>
      </div>
    </div>
  );
}

export function Button({
  children, onClick, variant = "utama", disabled, type = "button", className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "utama" | "garis" | "hantu" | "bahaya";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const gaya = {
    utama: "bg-accent text-accent-ink border-accent shadow-[0_10px_30px_-12px_var(--accent)] hover:brightness-110",
    garis: "bg-transparent text-accent border-accent hover:bg-accent-soft",
    hantu: "bg-surface text-ink border-garis-kontrol hover:bg-surface-2",
    bahaya: "bg-transparent text-critical-ink border-critical hover:bg-critical/8",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-2 text-dasar font-semibold whitespace-nowrap transition-[filter,background-color,transform,box-shadow] duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
        gaya, className,
      )}
    >
      {children}
    </button>
  );
}

export function Empty({ children, aksi }: { children: ReactNode; aksi?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-4 rounded-2xl border border-dashed border-line px-6 py-12 text-center text-dasar text-muted">
      <BenihKosong ukuran={104} />
      <div className="m-0 max-w-[30rem]">{children}</div>
      {aksi}
    </div>
  );
}

export function Skeleton({ tinggi = 80 }: { tinggi?: number }) {
  return <div role="status" aria-label="Memuat data" className="kilau rounded-2xl bg-surface-2" style={{ height: tinggi }} />;
}

export function GalatData({ ulang }: { ulang: () => void }) {
  return (
    <Notice nada="critical" judul="Data tidak dapat dimuat">
      <p className="mt-0 mb-3">Periksa sambungan ke server lalu coba lagi.</p>
      <Button variant="hantu" onClick={ulang}>Coba lagi</Button>
    </Notice>
  );
}

/** Tabel yang selalu bisa digulir sendiri, tidak pernah menggeser halaman. */
export function TableWrap({
  children, lebarMin = 460, label = "Tabel, bisa digulir mendatar",
}: {
  children: ReactNode;
  lebarMin?: number;
  label?: string;
}) {
  return (
    <div tabIndex={0} role="region" aria-label={label} className="w-full max-w-full overflow-x-auto overscroll-x-contain">
      <table className="w-full border-collapse text-dasar" style={{ minWidth: lebarMin }}>{children}</table>
    </div>
  );
}

export function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th scope="col" className={clsx("eyebrow border-b border-line px-3 font-medium text-muted", align === "right" ? "text-right" : "text-left")}>
      {children}
    </th>
  );
}

export function Td({ children, num, className }: { children: ReactNode; num?: boolean; className?: string }) {
  return (
    <td className={clsx("border-b border-line-soft px-3 align-top text-ink-2", num && "mono tnum text-right", className)}>
      {children}
    </td>
  );
}

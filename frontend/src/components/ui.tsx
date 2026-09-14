import clsx from "clsx";
import type { ReactNode } from "react";
import { useHitung, useMasuk } from "../lib/animasi";
import { BenihKosong } from "./Lambang";

export function Card({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <As
      className={clsx("kartu min-w-0 p-4 sm:p-5", className)}
    >
      {children}
    </As>
  );
}

export function CardTitle({
  children,
  aksi,
  keterangan,
}: {
  children: ReactNode;
  aksi?: ReactNode;
  keterangan?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="display-kecil text-judul-kecil leading-snug text-ink">
          {children}
        </h2>
        {keterangan && (
          <p className="ukuran-baca mt-1 text-dasar leading-relaxed text-muted">
            {keterangan}
          </p>
        )}
      </div>
      {aksi && <div className="shrink-0">{aksi}</div>}
    </div>
  );
}

function AngkaHidup({ nilai, desimal }: { nilai: number; desimal: number }) {
  return <>{useHitung(nilai, desimal)}</>;
}

export function StatTile({
  label,
  nilai,
  satuan,
  catatan,
  desimal = 0,
  urutan = 0,
}: {
  label: string;
  nilai: ReactNode;
  satuan?: string;
  catatan?: string;
  desimal?: number;
  urutan?: number;
}) {
  const ref = useMasuk<HTMLDivElement>(urutan * 70);
  return (
    <div ref={ref} className="kartu overflow-hidden px-4 py-3.5">
      <div className="eyebrow text-muted">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="display tnum text-angka text-ink">
          {typeof nilai === "number" ? (
            <AngkaHidup nilai={nilai} desimal={desimal} />
          ) : (
            nilai
          )}
        </span>
        {satuan && <span className="text-dasar text-muted">{satuan}</span>}
      </div>
      {catatan && (
        <div className="mt-1.5 text-kecil leading-snug text-muted">
          {catatan}
        </div>
      )}
    </div>
  );
}

type Nada = "ukur" | "estimasi" | "good" | "warning" | "serious" | "critical" | "netral";

const NADA: Record<Nada, string> = {
  ukur: "bg-accent-soft text-ukur ring-1 ring-accent/20",
  estimasi: "bg-estimasi-soft text-estimasi ring-1 ring-estimasi/25",
  good: "bg-good/12 text-good-ink",
  warning: "bg-warning/15 text-warning-ink",
  serious: "bg-serious/15 text-serious-ink",
  critical: "bg-critical/12 text-critical-ink",
  netral: "bg-surface-2 text-muted",
};

export function Badge({
  children,
  nada = "netral",
  ikon,
}: {
  children: ReactNode;
  nada?: Nada;
  ikon?: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded px-2.5 py-1 text-kecil font-medium",
        NADA[nada],
      )}
    >
      {ikon}
      {children}
    </span>
  );
}

/**
 * Notice bernada `critical` selalu muncul sebagai jawaban atas tindakan
 * pengguna — gerbang citra menolak, kamera gagal dibuka. Karena itu ia
 * membawa `role="alert"` secara bawaan: tanpa itu, penolakan analisis sama
 * sekali tidak terdengar oleh pembaca layar. Lewatkan `peran={null}` untuk
 * notice kritis yang sudah ada sejak render pertama, supaya tidak
 * mengumumkan sesuatu yang tidak baru.
 */
export function Notice({
  children,
  nada = "netral",
  judul,
  ikon,
  peran,
}: {
  children: ReactNode;
  nada?: "info" | "warning" | "critical" | "netral";
  judul?: string;
  ikon?: ReactNode;
  peran?: "alert" | "status" | null;
}) {
  const gaya = {
    info: "border-accent/45 bg-accent-soft text-ink",
    warning: "border-estimasi/50 bg-estimasi-soft text-ink",
    critical: "border-critical/50 bg-critical/8 text-ink",
    netral: "border-line bg-surface-2 text-ink-2",
  }[nada];
  const roleAkhir =
    peran === undefined ? (nada === "critical" ? "alert" : undefined) : peran;
  return (
    <div
      role={roleAkhir ?? undefined}
      className={clsx(
        "rounded-xl border p-3.5 text-dasar leading-relaxed",
        gaya,
      )}
    >
      {judul && (
        <div className="mb-1 flex items-center gap-1.5 font-semibold">
          {ikon}
          {judul}
        </div>
      )}
      <div className={judul ? "" : "flex items-start gap-2"}>
        {!judul && ikon}
        <div className="ukuran-baca">{children}</div>
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "utama",
  disabled,
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "utama" | "garis" | "hantu" | "bahaya";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const gaya = {
    utama:
      "bg-accent text-accent-ink border-accent shadow-kartu hover:brightness-110",
    garis: "bg-transparent text-accent border-accent hover:bg-accent-soft",
    hantu: "bg-transparent text-ink-2 border-garis-kontrol hover:bg-surface-2",
    bahaya: "bg-transparent text-critical border-critical hover:bg-critical/8",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-dasar font-semibold transition-[filter,background-color,transform] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45",
        gaya,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-line px-4 py-10 text-center text-dasar text-muted">
      <BenihKosong ukuran={96} />
      <p className="m-0 max-w-[26rem]">{children}</p>
    </div>
  );
}

export function Skeleton({ tinggi = 80 }: { tinggi?: number }) {
  return (
    <div
      role="status"
      aria-label="Memuat data"
      className="kilau rounded-xl bg-surface-2"
      style={{ height: tinggi }}
    />
  );
}

export function GalatData({ ulang }: { ulang: () => void }) {
  return <Notice nada="critical" judul="Data tidak dapat dimuat">
    <p className="mb-3">Periksa sambungan ke server lalu coba lagi.</p>
    <Button variant="hantu" onClick={ulang}>Coba lagi</Button>
  </Notice>;
}

/** Tabel yang selalu bisa digulir sendiri, tidak pernah menggeser halaman. */
export function TableWrap({
  children,
  lebarMin = 460,
  label = "Tabel, bisa digulir mendatar",
}: {
  children: ReactNode;
  lebarMin?: number;
  label?: string;
}) {
  return (
    // tabIndex: wilayah bergulir yang tidak bisa difokus mengunci kolom
    // terpotong dari pengguna papan ketik tanpa tetikus.
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className="w-full max-w-full overflow-x-auto overscroll-x-contain"
    >
      <table
        className="w-full border-collapse text-dasar"
        style={{ minWidth: lebarMin }}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={clsx(
        "eyebrow border-b border-line px-2 py-2 font-semibold text-muted",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  num,
  className,
}: {
  children: ReactNode;
  num?: boolean;
  className?: string;
}) {
  return (
    <td
      className={clsx(
        "border-b border-line-soft px-2 py-2 align-top text-ink-2",
        num && "tnum text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}

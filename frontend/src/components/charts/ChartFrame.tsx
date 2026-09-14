import { Table2, BarChart3 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BenihKosong } from "../Lambang";

/**
 * Bingkai bersama untuk setiap grafik.
 *
 * Menyediakan tampilan tabel sebagai alternatif — bukan hiasan: sebagian
 * warna deret berada di bawah kontras 3:1 pada latar terang, dan aturan
 * aksesibilitasnya adalah menyediakan label terlihat atau tampilan tabel.
 */
export default function ChartFrame({
  judul,
  keterangan,
  legenda,
  children,
  tabel,
  kosong,
}: {
  judul: string;
  keterangan?: string;
  legenda?: ReactNode;
  children: ReactNode;
  tabel: ReactNode;
  kosong?: string;
}) {
  const [lihatTabel, setLihatTabel] = useState(false);
  if (kosong) {
    return (
      <figure className="m-0">
        <figcaption className="mb-3">
          <h3 className="display-kecil text-judul-kecil leading-snug text-ink">
            {judul}
          </h3>
        </figcaption>
        <div className="grid min-h-[180px] justify-items-center content-center gap-3 rounded-md border border-dashed border-line px-4 py-6 text-center text-dasar text-muted">
          <BenihKosong ukuran={88} />
          <p className="m-0 max-w-[24rem]">{kosong}</p>
        </div>
      </figure>
    );
  }
  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="display-kecil text-judul-kecil leading-snug text-ink">
            {judul}
          </h3>
          {keterangan && (
            <p className="mt-1 text-dasar leading-relaxed text-muted">
              {keterangan}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setLihatTabel((v) => !v)}
          aria-pressed={lihatTabel}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded border border-garis-kontrol px-2.5 py-1.5 text-kecil font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink-2"
        >
          {lihatTabel ? <BarChart3 size={13} /> : <Table2 size={13} />}
          {lihatTabel ? "Grafik" : "Tabel"}
        </button>
      </figcaption>
      {legenda && !lihatTabel && <div className="mb-2">{legenda}</div>}
      {lihatTabel ? tabel : children}
    </figure>
  );
}

export function Legenda({
  butir,
}: {
  butir: { label: string; warna: string }[];
}) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
      {butir.map((b) => (
        <li key={b.label} className="flex items-center gap-1.5 text-kecil text-ink-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{ background: b.warna }}
          />
          {b.label}
        </li>
      ))}
    </ul>
  );
}

export function Tooltip({
  aktif,
  baris,
}: {
  aktif?: boolean;
  baris: { label: string; nilai: string; warna?: string }[];
}) {
  if (!aktif) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-kecil shadow-lg">
      {baris.map((b) => (
        <div key={b.label} className="flex items-center gap-2 whitespace-nowrap">
          {b.warna && (
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: b.warna }}
            />
          )}
          <span className="text-muted">{b.label}</span>
          <span className="tnum ml-auto font-semibold text-ink">{b.nilai}</span>
        </div>
      ))}
    </div>
  );
}

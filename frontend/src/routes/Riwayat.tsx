import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Filter } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import SebaranKelas from "../components/charts/SebaranKelas";
import TrenIMF from "../components/charts/TrenIMF";
import HasilPanel from "../components/HasilPanel";
import {
  Badge, Button, Card, CardTitle, Empty, GalatData, Notice, Skeleton, StatTile,
} from "../components/ui";
import { api, modeSekarang } from "../lib/api";
import { useReveal } from "../lib/animasi";
import { useFokusJudul } from "../lib/fokus";
import { KELAS_STATUS, WARNA_KOMODITAS, angka, waktu } from "../lib/format";

export default function Riwayat() {
  const wadah = useReveal<HTMLDivElement>();
  const [filter, setFilter] = useState("");
  const [parameter, setParameter] = useSearchParams();
  const nomorLot = Number(parameter.get("lot"));
  const terbuka = Number.isSafeInteger(nomorLot) && nomorLot > 0 ? nomorLot : null;
  const setTerbuka = (id: number | null) => setParameter(id === null ? {} : { lot: String(id) });
  const judulDetail = useFokusJudul<HTMLHeadingElement>(terbuka);

  const komoditas = useQuery({ queryKey: ["komoditas"], queryFn: api.komoditas });
  const riwayat = useQuery({
    queryKey: ["riwayat", filter],
    queryFn: () => api.riwayat(filter || undefined),
  });
  const ringkasan = useQuery({ queryKey: ["ringkasan"], queryFn: api.ringkasan });
  const detail = useQuery({
    queryKey: ["analisis", terbuka],
    queryFn: () => api.detail(terbuka!),
    enabled: terbuka !== null,
  });

  if (terbuka !== null) {
    return (
      <div ref={wadah} className="grid min-w-0 gap-5">
        <div className="flex items-center gap-3">
          <Button variant="hantu" onClick={() => setTerbuka(null)}>
            <ArrowLeft size={15} />
            Riwayat
          </Button>
          <h1
            ref={judulDetail}
            tabIndex={-1}
            className="m-0 text-judul font-bold tracking-tight text-ink outline-none"
          >
            Analisis #{terbuka}
          </h1>
        </div>
        {detail.isError ? (
          <Notice nada="critical" judul="Rincian lot tidak dapat dibuka">
            <p className="mb-3">{detail.error.message}</p>
            <Button variant="hantu" onClick={() => detail.refetch()}>Coba lagi</Button>
          </Notice>
        ) : detail.isLoading || !detail.data ? (
          <Skeleton tinggi={320} />
        ) : (
          <HasilPanel
            hasil={detail.data}
            adaCitra={modeSekarang() === "langsung"}
          />
        )}
      </div>
    );
  }

  if (riwayat.isError || ringkasan.isError || komoditas.isError) {
    return <GalatData ulang={() => { riwayat.refetch(); ringkasan.refetch(); komoditas.refetch(); }} />;
  }

  return (
    <div className="grid min-w-0 gap-5">
      <header className="reveal max-w-[42rem]">
        <p className="eyebrow mb-2 text-accent">Riwayat</p>
        <h1 className="display m-0 judul-halaman text-ink">
          Riwayat pengujian lot
        </h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ringkasan.isLoading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} tinggi={92} />)
        ) : (
          <>
            <StatTile
              urutan={0}
              label="Total analisis"
              nilai={ringkasan.data?.total ?? 0}
            />
            <StatTile
              urutan={1}
              label="IMF rata-rata"
              nilai={ringkasan.data?.imf_rata2 ?? "Belum ada"}
              desimal={1}
              satuan="/100"
            />
            <StatTile
              urutan={2}
              label="Punya skor akhir"
              nilai={ringkasan.data?.berkalibrasi ?? 0}
              catatan={`dari ${ringkasan.data?.total ?? 0} analisis`}
            />
            <StatTile
              urutan={3}
              label="Komoditas"
              nilai={ringkasan.data?.per_komoditas.length ?? 0}
            />
          </>
        )}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card>
          {ringkasan.isLoading ? (
            <Skeleton tinggi={200} />
          ) : (
            <SebaranKelas sebaran={ringkasan.data?.sebaran_kelas ?? {}} />
          )}
        </Card>
        <Card>
          {riwayat.isLoading ? (
            <Skeleton tinggi={200} />
          ) : (
            <TrenIMF riwayat={riwayat.data ?? []} />
          )}
        </Card>
      </div>

      <Card>
        <CardTitle
          aksi={
            modeSekarang() === "langsung" ? <a
              href={api.eksporUrl()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-garis-kontrol px-3 text-kecil font-medium text-ink-2 hover:bg-surface-2"
            >
              <Download size={14} />
              CSV
            </a> : <span className="text-kecil text-muted">Ekspor tersedia saat server terhubung</span>
          }
          keterangan="Klik satu baris untuk membuka hasil lengkapnya."
        >
          Daftar analisis
        </CardTitle>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-muted" />
          {[{ slug: "", nama: "Semua" }, ...(komoditas.data ?? [])].map((k) => (
            <button
              key={k.slug || "semua"}
              type="button"
              onClick={() => setFilter(k.slug)}
              aria-pressed={filter === k.slug}
              className={`min-h-11 cursor-pointer rounded border px-3 text-kecil font-medium ${
                filter === k.slug
                  ? "border-accent bg-accent-soft text-ukur"
                  : "border-garis-kontrol text-muted hover:bg-surface-2"
              }`}
            >
              {k.nama}
            </button>
          ))}
        </div>

        {riwayat.isLoading ? (
          <Skeleton tinggi={200} />
        ) : !riwayat.data?.length ? (
          <Empty>
            Belum ada analisis{filter ? " untuk komoditas ini" : ""}.
          </Empty>
        ) : (
          <ul className="m-0 list-none divide-y divide-line-soft p-0">
            {riwayat.data.map((r) => {
              const st = KELAS_STATUS[r.kelas];
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setTerbuka(r.id)}
                    className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-surface-2"
                  >
                    <span
                      aria-hidden
                      className="h-9 w-1.5 shrink-0 rounded-full"
                      style={{
                        background:
                          WARNA_KOMODITAS[r.komoditas_slug] ?? "var(--muted)",
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-dasar font-semibold text-ink">
                        #{r.id} · {r.komoditas_slug}
                      </span>
                      <span className="block truncate text-kecil text-muted">
                        {waktu(r.dibuat_pada)} · {r.n_benih} benih
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <Badge
                        nada={
                          st?.nada === "netral"
                            ? "netral"
                            : (st?.nada ?? "netral")
                        }
                      >
                        {r.kelas}
                      </Badge>
                    </span>
                    <span className="tnum w-20 shrink-0 text-right text-judul text-ink">
                      {angka(r.indeks_mutu_fisik)}
                      <span className="block text-kecil text-muted">IMF /100</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

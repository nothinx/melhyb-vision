import { useQuery } from "@tanstack/react-query";
import {
  CircleHelp, CircleSlash, ExternalLink, FileWarning,
  PencilLine, ShieldQuestion,
} from "lucide-react";
import {
  Badge, Card, CardTitle, GalatData, Notice, Skeleton, TableWrap, Td, Th,
} from "../components/ui";
import { api } from "../lib/api";
import { useReveal } from "../lib/animasi";
import type { Ambang, StandarKomoditas, StatusVerifikasi } from "../lib/types";

const LABEL: Record<
  StatusVerifikasi,
  { teks: string; nada: "good" | "warning" | "netral" }
> = {
  terverifikasi: { teks: "Terverifikasi", nada: "good" },
  diisi_operator: { teks: "Diisi operator", nada: "warning" },
  belum_ada: { teks: "Tidak dipakai", nada: "netral" },
};

function SelAmbang({ a }: { a: Ambang }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="tnum font-semibold text-ink">
        {a.nilai === null ? "—" : `${a.nilai}${a.satuan}`}
      </span>
      <Badge nada={LABEL[a.status].nada}>{LABEL[a.status].teks}</Badge>
    </div>
  );
}

function KartuKomoditas({ k }: { k: StandarKomoditas }) {
  const baris: [string, Ambang][] = [
    ["Daya berkecambah minimum", k.daya_berkecambah_min],
    ["Kadar air maksimum", k.kadar_air_maks],
    ["Benih murni minimum", k.benih_murni_min],
    ["Biji gulma maksimum", k.biji_gulma_maks],
  ];
  return (
    <Card>
      <CardTitle
        aksi={
          k.siap_dipakai ? (
            <Badge nada="warning" ikon={<PencilLine size={12} />}>
              Gerbang aktif
            </Badge>
          ) : (
            <Badge nada="netral" ikon={<CircleSlash size={12} />}>
              Gerbang mati
            </Badge>
          )
        }
        keterangan={
          <>
            <em>{k.nama_latin}</em> · rezim {k.rezim}
          </>
        }
      >
        {k.nama}
      </CardTitle>

      <TableWrap>
        <thead>
          <tr>
            <Th>Parameter</Th>
            <Th align="right">Nilai &amp; status</Th>
          </tr>
        </thead>
        <tbody>
          {baris.map(([label, a]) => (
            <tr key={label}>
              <Td>
                <div className="font-medium text-ink">{label}</div>
                <p className="mt-1 max-w-[52ch] text-kecil leading-relaxed text-muted">
                  {a.catatan}
                </p>
              </Td>
              <Td className="whitespace-nowrap">
                <SelAmbang a={a} />
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <div className="mt-4">
        <div className="eyebrow mb-1.5 text-muted">Dasar hukum</div>
        <ul className="m-0 grid list-none gap-1.5 p-0">
          {k.regulasi.map((r) => (
            <li key={r} className="text-kecil leading-relaxed text-ink-2">
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <div className="eyebrow mb-1.5 text-muted">Kelas benih</div>
        <div className="flex flex-wrap gap-1.5">
          {k.kelas_benih.map((c) => (
            <span
              key={c}
              className="rounded border border-line-soft bg-surface-2 px-2 py-0.5 text-mikro text-ink-2"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {k.klaim_beredar.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow mb-1.5 text-muted">
            Klaim yang beredar — tidak dipakai sistem
          </div>
          <ul className="m-0 grid list-none gap-2 p-0">
            {k.klaim_beredar.map((c) => (
              <li
                key={c.parameter}
                className="rounded-xl border border-line-soft bg-surface-2 p-3.5"
              >
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-dasar font-semibold text-ink">
                    {c.parameter}
                  </span>
                  <span className="tnum text-dasar font-semibold text-muted line-through">
                    {c.nilai}
                    {c.satuan}
                  </span>
                </div>
                <p className="m-0 text-kecil leading-relaxed text-ink-2">
                  {c.keberatan}
                </p>
                <p className="mt-1.5 mb-0 text-kecil leading-relaxed text-muted">
                  Sumber: {c.sumber}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {k.peringatan && (
        <div className="mt-3">
          <Notice nada="warning" ikon={<FileWarning size={15} />}>
            {k.peringatan}
          </Notice>
        </div>
      )}
    </Card>
  );
}

export default function Standar() {
  const wadah = useReveal<HTMLDivElement>();
  const q = useQuery({ queryKey: ["standar"], queryFn: api.standar });

  if (q.isError) return <GalatData ulang={() => q.refetch()} />;

  return (
    <div ref={wadah} className="grid min-w-0 gap-5">
      <header className="reveal max-w-[42rem]">
        <p className="eyebrow mb-2 text-accent">Ambang mutu resmi</p>
        <h1 className="display m-0 judul-halaman text-ink">
          Setiap angka membawa asal-usulnya
        </h1>
        <p className="mt-3 text-sedang leading-relaxed text-ink-2">
          Periksa ambang yang digunakan, status verifikasi, dan dokumen
          sumbernya. Nilai yang belum dipakai tidak ikut menentukan putusan.
        </p>
      </header>

      <Notice nada="info" ikon={<ShieldQuestion size={16} />} judul="Cara membaca status">
        <ul className="mt-1 mb-0 grid gap-1.5 pl-4">
          <li>
            <strong>Terverifikasi</strong> — dibaca langsung dari tabel di
            dokumen aslinya. Hanya status ini yang boleh dikutip di laporan.
          </li>
          <li>
            <strong>Diisi operator</strong> — seseorang membaca dokumennya lalu
            mengetikkan angkanya. Dipakai sistem, tetapi setiap putusan
            menyebutkan bahwa angkanya diketik manusia, bukan dibaca dari
            dokumen.
          </li>
          <li>
            <strong>Tidak dipakai</strong> — belum ditemukan, atau ditemukan
            tetapi meragukan. Gerbang ambang edar untuk komoditas itu{" "}
            <em>dimatikan</em>, bukan diisi tebakan.
          </li>
        </ul>
      </Notice>

      <Notice nada="warning" ikon={<CircleHelp size={16} />} judul="Temuan penting: SNI mungkin bukan rujukan yang tepat">
        Penelusuran ini tidak menemukan SNI khusus untuk sorgum, melon, maupun
        edamame. Yang terkonfirmasi hanya <strong>SNI 6233:2015</strong> untuk
        benih padi. Untuk ketiga komoditas SIGMA, rujukan yang berlaku adalah{" "}
        <strong>Kepmentan dan Permentan</strong>, bukan SNI. Menulis “sesuai
        SNI” di proposal tanpa nomor SNI yang benar-benar ada adalah klaim yang
        mudah dipatahkan penguji.
      </Notice>

      {q.data?.isian_operator && (
        <Card>
          <CardTitle
            aksi={<Badge nada="warning" ikon={<PencilLine size={12} />}>Konfigurasi</Badge>}
            keterangan={q.data.isian_operator.penjelasan}
          >
            Mengisi ambang sendiri
          </CardTitle>
          <pre className="m-0 overflow-x-auto rounded-lg border border-line-soft bg-surface-2 px-3.5 py-3 font-mono text-kecil text-ink-2">
            {q.data.isian_operator.contoh}
          </pre>
          {Object.keys(q.data.isian_operator.aktif).length > 0 && (
            <p className="mt-3 mb-0 text-dasar leading-relaxed text-ink-2">
              Sedang aktif:{" "}
              {Object.entries(q.data.isian_operator.aktif)
                .map(([slug, nilai]) => `${slug} ${nilai}%`)
                .join(", ")}
              .
            </p>
          )}
        </Card>
      )}

      {q.isLoading ? (
        <Skeleton tinggi={280} />
      ) : (
        <div className="grid min-w-0 gap-4">
          {q.data?.komoditas.map((k) => (
            <KartuKomoditas key={k.slug} k={k} />
          ))}
        </div>
      )}

      <Card>
        <CardTitle keterangan="Yang harus kalian ambil sendiri untuk mengubah status menjadi terverifikasi.">
          Dari mana dokumen primernya
        </CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {q.data?.cara_memperoleh_dokumen.map((d) => (
            <div
              key={d.sumber}
              className="rounded-md border border-line-soft bg-surface-2 p-3.5"
            >
              <div className="mb-1 text-dasar font-semibold text-ink">
                {d.sumber}
              </div>
              {d.alamat.startsWith("http") ? (
                <a
                  href={d.alamat}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-kecil font-medium text-accent hover:underline"
                >
                  {d.alamat.replace("https://", "")}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <div className="text-kecil text-muted">{d.alamat}</div>
              )}
              <p className="mt-1.5 mb-0 text-kecil leading-relaxed text-muted">
                {d.untuk}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {q.data && (
        <p className="max-w-[70ch] text-kecil leading-relaxed text-muted">
          {q.data.catatan}
        </p>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { AlertOctagon } from "lucide-react";
import {
  Card, CardTitle, GalatData, Notice, Skeleton, TableWrap, Td, Th,
} from "../components/ui";
import { api } from "../lib/api";
import { judulKunci } from "../lib/format";

function Bobot({ data }: { data: Record<string, number> }) {
  const urut = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <ul className="m-0 grid list-none gap-2.5 p-0">
      {urut.map(([k, v]) => (
        <li key={k}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="text-dasar text-ink">{judulKunci(k)}</span>
            <span className="tnum text-dasar font-semibold text-ink">
              {(v * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${v * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TabelAngka({ data }: { data: Record<string, string | number> }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <Th>Parameter</Th>
          <Th align="right">Nilai</Th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(data).map(([k, v]) => (
          <tr key={k}>
            <Td>{judulKunci(k)}</Td>
            <Td num>{String(v)}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

export default function Metodologi() {
  const q = useQuery({ queryKey: ["metodologi"], queryFn: api.metodologi });
  if (q.isError) return <GalatData ulang={() => q.refetch()} />;
  if (q.isLoading || !q.data) return <Skeleton tinggi={400} />;
  const m = q.data;

  return (
    <div className="grid min-w-0 gap-5">
      <header className="reveal max-w-[42rem]">
        <p className="eyebrow mb-2 text-accent">Metodologi</p>
        <h1 className="display m-0 judul-halaman text-ink">
          Tidak ada angka tersembunyi
        </h1>
        <p className="mt-3 text-sedang leading-relaxed text-ink-2">
          Seluruh bobot dan ambang yang mempengaruhi penilaian dibaca langsung
          dari sistem yang sedang berjalan, lewat endpoint{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-dasar">
            /api/metodologi
          </code>
          . Penguji tidak perlu percaya begitu saja — dan tidak perlu membuka
          kode.
        </p>
      </header>

      <Card>
        <CardTitle>Unit analisis</CardTitle>
        <p className="m-0 text-dasar text-ink-2">{m.unit_analisis}</p>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle keterangan="Menyusun Indeks Mutu Fisik dari lima besaran yang benar-benar terukur.">
            Bobot indeks mutu fisik
          </CardTitle>
          <Bobot data={m.bobot_indeks_fisik} />
        </Card>
        <Card>
          <CardTitle keterangan="Daya berkecambah mendominasi karena ia penentu mutu benih; parameter fisik hanya pendukung. Skor akhir bukan rata-rata sederhana.">
            Bobot skor akhir
          </CardTitle>
          <Bobot data={m.bobot_skor_akhir} />
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Kelas mutu</CardTitle>
          <TableWrap>
            <thead>
              <tr>
                <Th>Kelas</Th>
                <Th align="right">Skor minimum</Th>
              </tr>
            </thead>
            <tbody>
              {m.kelas_mutu.map((k) => (
                <tr key={k.label}>
                  <Td className="font-medium text-ink">{k.label}</Td>
                  <Td num>≥ {k.minimal}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
        <Card>
          <CardTitle>Syarat kalibrasi</CardTitle>
          <TabelAngka data={m.syarat_kalibrasi} />
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle keterangan="Foto yang gagal di sini ditolak sebelum satu angka pun dihitung.">
            Gerbang kualitas citra
          </CardTitle>
          <TabelAngka data={m.gerbang_citra} />
        </Card>
        <Card>
          <CardTitle keterangan="Titik nol dan titik penuh tiap indeks terukur.">
            Normalisasi indeks
          </CardTitle>
          <TabelAngka data={m.normalisasi_indeks} />
        </Card>
      </div>

      <Notice
        nada="warning"
        judul="Batasan yang harus ikut disebut di setiap laporan"
        ikon={<AlertOctagon size={16} />}
      >
        <ul className="mt-1.5 mb-0 grid gap-1.5 pl-4">
          {m.batasan.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Notice>
    </div>
  );
}

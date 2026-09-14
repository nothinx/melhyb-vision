import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import SeedScatter3DMelon from "../components/SeedScatter3DMelon";
import { Badge, Card, CardTitle, GalatData, Skeleton } from "../components/ui";

export default function MelonSpotlight() {
  const kalibrasi = useQuery({ queryKey: ["kalibrasi"], queryFn: api.kalibrasi });
  const model = kalibrasi.data?.find((k) => k.komoditas === "melon" && k.target === "daya_berkecambah");
  return <div className="grid gap-8">
    <header className="max-w-[42rem]">
      <p className="nomor-bagian">Studi komoditas / Hortikultura</p>
      <h1 className="display judul-halaman">Mengenali bentuk benih melon</h1>
      <p className="mt-4 text-sedang text-ink-2">Ilustrasi ini membantu mengenali bentuk memanjang benih melon dan membandingkan susunannya. Untuk mengukur lot Anda, unggah foto di halaman Analisis.</p>
    </header>
    <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
      <SeedScatter3DMelon />
      <div className="grid gap-5">
        <Card>
          <CardTitle keterangan="Dibaca dari status kalibrasi saat ini.">Kesiapan estimasi melon</CardTitle>
          {kalibrasi.isError ? <GalatData ulang={() => kalibrasi.refetch()} /> :
            kalibrasi.isPending ? <Skeleton tinggi={100} /> : model ? <>
              <Badge nada={model.siap_pakai ? "ukur" : "estimasi"}>{model.siap_pakai ? "Model siap dipakai" : "Model belum siap"}</Badge>
              <p className="mt-4 text-dasar">{model.sampel_tersedia} pasangan berlabel tersedia. Estimasi memerlukan minimal 30 pasangan dan R² validasi silang ≥ 0,30.</p>
            </> : <p>Belum ada informasi model melon. Periksa halaman Kalibrasi untuk persyaratannya.</p>}
          <Link className="tautan-teks" to="/kalibrasi">Buka kalibrasi</Link>
        </Card>
        <Card>
          <CardTitle>Yang bisa dibaca dari foto</CardTitle>
          <p className="text-dasar text-ink-2">Ukuran relatif, keutuhan, cacat fisik, warna, dan tekstur. Bentuk yang tampak utuh tidak membuktikan benih akan berkecambah.</p>
          <p className="mt-3 text-dasar text-muted">Ambang edar dan status sumbernya dapat diperiksa di halaman Standar.</p>
          <Link className="tautan-teks" to="/standar">Periksa standar melon</Link>
        </Card>
        <Link className="tombol-analisis" to="/analisis">Analisis foto lot benih</Link>
      </div>
    </div>
  </div>;
}

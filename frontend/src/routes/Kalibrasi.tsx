import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router";
import { Muncul } from "../components/Gerak";
import GridLot from "../components/GridLot";
import { Badge, GalatData, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { angka } from "../lib/format";

const LANGKAH = [
  ["Beri kode lot", "Tempel kode pada kemasan supaya foto dan hasil ujinya bisa dipasangkan."],
  ["Foto lot", "Unggah lewat halaman Analisis dengan varietas yang benar."],
  ["Uji perkecambahan", "Lakukan UKDdP pada benih dari lot yang sama, sesuai prosedur pengujian."],
  ["Catat hasil", "Masukkan jumlah kecambah normal pada hitungan pertama dan akhir."],
  ["Latih model", "Setelah syarat jumlah lot terpenuhi, pengelola data melatih dan memvalidasi model."],
] as const;

export default function Kalibrasi() {
  const status = useQuery({ queryKey: ["kalibrasi"], queryFn: api.kalibrasi });
  const metodologi = useQuery({ queryKey: ["metodologi"], queryFn: api.metodologi });

  if (status.isError || metodologi.isError) return <GalatData ulang={() => { void status.refetch(); void metodologi.refetch(); }} />;
  if (status.isPending || metodologi.isPending) return <Skeleton tinggi={420} />;
  const syarat = Number(metodologi.data.syarat_kalibrasi.sampel_minimum);
  const r2Min = Number(metodologi.data.syarat_kalibrasi.r2_validasi_minimum);
  const melon = status.data.filter((m) => m.komoditas === "melon");

  return (
    <div className="grid gap-20">
      <Muncul as="header" className="max-w-[860px]">
        <h1 className="display m-0 text-[clamp(2.4rem,5.4vw,4.4rem)] text-ink">Kalibrasi model melon.</h1>
        <p className="mt-6 mb-0 max-w-[60ch] text-sedang text-ink-2">
          Model menghubungkan ciri fisik dari foto dengan hasil uji perkecambahan lot yang sama. Selama syaratnya belum terpenuhi, estimasi tidak ditampilkan sama sekali.
        </p>
      </Muncul>

      <section aria-label="Status model per estimasi" className="grid gap-4 lg:grid-cols-3">
        {melon.map((m, i) => {
          const kurang = Math.max(0, syarat - m.sampel_tersedia);
          return (
            <Muncul key={m.target} jeda={i * 0.08} className="kartu flex flex-col gap-6 p-7">
              <div className="flex items-start justify-between gap-3">
                <h2 className="display-kecil m-0 text-judul-kecil text-ink">{m.label_target.replace(/ \(.*\)/, "")}</h2>
                <Badge nada={m.siap_pakai ? "good" : "netral"} ikon={m.siap_pakai ? <CheckCircle2 size={13} /> : <Clock size={13} />}>
                  {m.siap_pakai ? "Siap" : "Belum siap"}
                </Badge>
              </div>
              <GridLot terisi={m.sampel_tersedia} syarat={syarat} label="Lot berpasangan" />
              <dl className="m-0 grid grid-cols-2 gap-4 border-t border-line pt-5">
                <div><dt className="eyebrow text-muted">MAE validasi</dt><dd className="mono tnum mt-1 mb-0 text-sedang text-ink">{angka(m.laporan?.mae, 2)}</dd></div>
                <div><dt className="eyebrow text-muted">R² validasi</dt><dd className="mono tnum mt-1 mb-0 text-sedang text-ink">{angka(m.laporan?.r2, 3)}</dd></div>
              </dl>
              <p className="m-0 text-kecil text-muted">
                {m.laporan?.reason ?? (kurang > 0 ? `Kurang ${kurang} lot berpasangan sebelum model bisa dilatih.` : "Siap dilatih oleh pengelola data.")}
              </p>
            </Muncul>
          );
        })}
      </section>

      <section className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <Muncul>
          <h2 className="display m-0 text-[clamp(1.8rem,3.4vw,2.6rem)] text-ink">Kapan estimasi boleh tampil.</h2>
          <dl className="daftar-penjelasan mt-8">
            <div><dt>Minimal {syarat} lot berpasangan</dt><dd>Setiap lot punya foto dan hasil uji perkecambahan (UKDdP).</dd></div>
            <div><dt>R² validasi silang ≥ {angka(r2Min, 2)}</dt><dd>Diuji dengan validasi silang 5 lipatan. Model yang lebih lemah tidak dipakai.</dd></div>
            <div><dt>Rentang selalu ikut tampil</dt><dd>Estimasi disertai selang nilai, bukan satu angka pasti.</dd></div>
            <div><dt>Lot di luar rentang ditandai</dt><dd>Kalau ciri lot jauh dari data pelatihan, estimasinya tidak ikut menentukan kelas mutu.</dd></div>
          </dl>
          <Link to="/metodologi" className="tautan-teks mt-4">Rincian metode</Link>
        </Muncul>
        <Muncul jeda={0.08}>
          <ol className="relative m-0 grid list-none gap-0 p-0">
            {LANGKAH.map(([judul, isi], i) => (
              <li key={judul} className="relative grid grid-cols-[48px_1fr] gap-4 pb-8 last:pb-0">
                {i < LANGKAH.length - 1 && <span aria-hidden className="absolute top-12 bottom-0 left-[23px] w-px bg-line" />}
                <span className="mono grid size-12 place-items-center rounded-full border border-line bg-surface text-kecil text-ink">{String(i + 1).padStart(2, "0")}</span>
                <div className="pt-2.5">
                  <h3 className="m-0 text-sedang font-semibold text-ink">{judul}</h3>
                  <p className="mt-1 mb-0 text-dasar text-muted">{isi}</p>
                </div>
              </li>
            ))}
          </ol>
        </Muncul>
      </section>
    </div>
  );
}

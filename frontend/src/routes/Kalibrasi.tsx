import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, TrendingUp } from "lucide-react";
import Paritas from "../components/charts/Paritas";
import {
  Badge, Card, CardTitle, GalatData, Notice, Skeleton, StatTile, TableWrap, Td, Th,
} from "../components/ui";
import { api, modeSekarang } from "../lib/api";
import { useReveal } from "../lib/animasi";
import { DEMO_PARITAS } from "../lib/demo";
import { angka } from "../lib/format";

const MIN_SAMPEL = 30;

export default function Kalibrasi() {
  const wadah = useReveal<HTMLDivElement>();
  const q = useQuery({ queryKey: ["kalibrasi"], queryFn: api.kalibrasi });

  const utama = q.data?.find(
    (k) => k.komoditas === "sorgum" && k.target === "daya_berkecambah",
  );
  const siap = q.data?.filter((k) => k.siap_pakai).length ?? 0;

  if (q.isError) return <GalatData ulang={() => q.refetch()} />;
  if (q.isPending) return <Skeleton tinggi={400} />;

  return (
    <div ref={wadah} className="grid min-w-0 gap-5">
      <header className="reveal max-w-[42rem]">
        <p className="eyebrow mb-2 text-accent">Kalibrasi</p>
        <h1 className="display m-0 judul-halaman text-ink">
          Sebuah foto tidak memuat daya berkecambah
        </h1>
        <p className="mt-3 text-sedang leading-relaxed text-ink-2">
          Yang bisa dibangun adalah model yang memetakan morfologi ke hasil
          UKDdP, lalu melaporkan seberapa jauh model itu meleset. Halaman ini
          mencatat hasil validasi serta model yang belum layak dipakai.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          urutan={0}
          label="Model siap pakai"
          nilai={`${siap}/${q.data?.length ?? 0}`}
          catatan="lolos ambang sampel dan R²"
        />
        <StatTile
          urutan={1}
          label="Sampel sorgum"
          nilai={utama?.sampel_tersedia ?? "Belum ada"}
          catatan={`ambang minimum ${MIN_SAMPEL} pasangan`}
        />
        <StatTile
          urutan={2}
          label="MAE daya berkecambah"
          nilai={angka(utama?.laporan?.mae ?? null, 2)}
          satuan="%"
          catatan={`R² ${angka(utama?.laporan?.r2 ?? null, 3)}`}
        />
      </div>

      <Card>
        {q.isLoading ? (
          <Skeleton tinggi={280} />
        ) : modeSekarang() !== "demo" ? (
          <Notice>Pasangan prediksi dan hasil UKDdP belum tersedia untuk grafik. Metrik model yang tersedia ditampilkan di tabel status.</Notice>
        ) : (
          <Paritas
            data={utama?.siap_pakai ? DEMO_PARITAS : []}
            mae={utama?.laporan?.mae ?? 0}
            r2={utama?.laporan?.r2 ?? 0}
          />
        )}
      </Card>

      <Card>
        <CardTitle keterangan="Satu baris per pasangan komoditas dan target. Yang belum siap tetap ditampilkan — justru itu informasinya.">
          Status model
        </CardTitle>
        {q.isLoading ? (
          <Skeleton tinggi={200} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Komoditas</Th>
                <Th>Target</Th>
                <Th align="right">Sampel</Th>
                <Th align="right">MAE</Th>
                <Th align="right">R²</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {q.data?.map((k) => {
                const kurang = Math.max(0, MIN_SAMPEL - k.sampel_tersedia);
                return (
                  <tr key={`${k.komoditas}-${k.target}`}>
                    <Td className="font-medium text-ink">{k.komoditas}</Td>
                    <Td>{k.label_target}</Td>
                    <Td num>
                      {k.sampel_tersedia}
                      {kurang > 0 && (
                        <span className="ml-1 text-mikro text-muted">
                          (−{kurang})
                        </span>
                      )}
                    </Td>
                    <Td num>
                      {k.laporan && Number.isFinite(k.laporan.mae)
                        ? k.laporan.mae.toFixed(2)
                        : "—"}
                    </Td>
                    <Td num>
                      {k.laporan && Number.isFinite(k.laporan.r2)
                        ? k.laporan.r2.toFixed(3)
                        : "—"}
                    </Td>
                    <Td>
                      {k.siap_pakai ? (
                        <Badge nada="good" ikon={<CheckCircle2 size={12} />}>
                          Dipakai
                        </Badge>
                      ) : (
                        <Badge nada="warning" ikon={<Clock size={12} />}>
                          Belum
                        </Badge>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Syarat sebelum sebuah model boleh dipakai</CardTitle>
          <ul className="m-0 grid list-none gap-3 p-0">
            {[
              ["Minimal 30 pasangan berlabel", "Satu pasangan = satu lot yang difoto lalu ditanam dan diuji UKDdP. Di bawah 30, model tidak menyajikan prediksi sama sekali."],
              ["R² validasi silang ≥ 0,30", "Diukur dengan validasi silang 5-lipat, bukan pada data latihnya sendiri. Model tanpa hubungan nyata otomatis ditolak."],
              ["Selang prediksi wajib", "Setiap estimasi keluar bersama nilai ± 1,96 × RMSE, jadi ketidakpastiannya ikut terlihat."],
              ["Penjaga ekstrapolasi", "Lot yang cirinya jauh di luar rentang data latih ditandai dan dikeluarkan dari putusan kelas."],
            ].map(([judul, isi]) => (
              <li key={judul} className="rounded-md bg-surface-2 p-3.5">
                <div className="mb-1 text-dasar font-semibold text-ink">
                  {judul}
                </div>
                <p className="m-0 text-kecil leading-relaxed text-muted">
                  {isi}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>Alur mengumpulkan data kalibrasi</CardTitle>
          <ol className="m-0 grid list-none gap-2.5 p-0">
            {[
              "Siapkan kode lot untuk menghubungkan foto dan hasil uji.",
              "Foto lot itu di tab Analisis. Pencatatan batch saat ini dilakukan melalui pengelola data.",
              "Tanam lot yang sama, jalankan UKDdP 1–3 minggu.",
              "Catat hasilnya; daya berkecambah dihitung sistem dengan rumus DB = (A + B) / N × 100.",
              "Setelah 30 pasangan terkumpul, latih modelnya dan baca metrik validasinya di sini.",
            ].map((t, i) => (
              <li key={t} className="flex gap-2.5">
                <span className="tnum mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-mikro font-bold text-ukur">
                  {i + 1}
                </span>
                <span className="text-dasar leading-relaxed text-ink-2">{t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <Notice nada="info" ikon={<TrendingUp size={15} />}>
              Satu komoditas yang tervalidasi penuh jauh lebih meyakinkan
              daripada tiga yang setengah jadi. Selesaikan sorgum lebih dulu.
            </Notice>
          </div>
        </Card>
      </div>
    </div>
  );
}

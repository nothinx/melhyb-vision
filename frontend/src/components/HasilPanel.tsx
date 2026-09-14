import {
  AlertTriangle, CheckCircle2, Info, Ruler, ShieldAlert, Sprout,
} from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { useReveal, useTumbuh } from "../lib/animasi";
import { angka } from "../lib/format";
import type { HasilAnalisis } from "../lib/types";
import { Badge, Card, CardTitle, Notice, TableWrap, Td, Th } from "./ui";

function Meter({ nilai, warna }: { nilai: number; warna: string }) {
  const bar = useTumbuh(nilai);
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-surface-2"
      role="meter"
      aria-valuenow={Math.round(nilai)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div ref={bar} className="h-full rounded-full" style={{ background: warna }} />
    </div>
  );
}

/** Estimasi digambar sebagai selang, bukan sebagai satu angka pasti.
 *  Pita = rentang yang mungkin; garis tegak = nilai titik. */
function MeterSelang({
  nilai,
  bawah,
  atas,
}: {
  nilai: number;
  bawah: number;
  atas: number;
}) {
  const b = Math.max(0, Math.min(100, bawah));
  const a = Math.max(0, Math.min(100, atas));
  const n = Math.max(0, Math.min(100, nilai));
  return (
    <div
      className="relative h-3.5"
      role="meter"
      aria-valuenow={Math.round(nilai)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Estimasi ${nilai}, rentang ${bawah} sampai ${atas}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-surface-2" />
      <div
        className="absolute top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-estimasi/35"
        style={{ left: `${b}%`, width: `${Math.max(a - b, 0.6)}%` }}
      />
      <div
        className="absolute top-0 h-full w-[3px] -translate-x-1/2 rounded-full bg-estimasi"
        style={{ left: `${n}%` }}
      />
    </div>
  );
}

export default function HasilPanel({
  hasil,
  adaCitra = true,
}: {
  hasil: HasilAnalisis;
  adaCitra?: boolean;
}) {
  const wadah = useReveal<HTMLDivElement>();
  const { putusan, skala, segmentasi, gerbang_citra } = hasil;
  const [citraGagal, setCitraGagal] = useState(false);
  const belum = putusan.skor === null;
  const ditahan = putusan.dapat_diedarkan === false;

  return (
    <div
      ref={wadah}
      className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"
    >
      <div className="grid min-w-0 gap-4">
        {/* --- putusan --- */}
        <Card
          className={
            ditahan
              ? "border-critical bg-critical/6"
              : belum
                ? "border-line bg-surface-2"
                : "border-good/40"
          }
        >
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <div className="eyebrow mb-1 text-muted">
                {belum ? "Indeks Mutu Fisik" : "Skor mutu"}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="display tnum text-[52px] text-ink">
                  {belum ? angka(hasil.indeks_mutu_fisik) : angka(putusan.skor)}
                </span>
                <span className="text-sedang text-muted">/100</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ditahan ? (
                <Badge nada="critical" ikon={<ShieldAlert size={12} />}>
                  {putusan.kelas}
                </Badge>
              ) : belum ? (
                <Badge nada="netral" ikon={<Info size={12} />}>
                  {putusan.kelas}
                </Badge>
              ) : (
                <Badge nada="good" ikon={<CheckCircle2 size={12} />}>
                  {putusan.kelas}
                </Badge>
              )}
              {!belum && (
                <Badge nada="ukur">
                  {segmentasi.jumlah_benih} benih terdeteksi
                </Badge>
              )}
            </div>
          </div>
          <p className="mt-3 max-w-[68ch] text-dasar leading-relaxed text-ink-2">
            {putusan.alasan}
          </p>
        </Card>

        {/* --- indeks terukur --- */}
        <Card>
          <CardTitle
            aksi={<Badge nada="ukur">Terukur</Badge>}
            keterangan="Dihitung langsung dari piksel. Siapa pun bisa menghitung ulang dari foto yang sama dan mendapat angka yang sama."
          >
            Indeks mutu fisik
          </CardTitle>
          <ul className="m-0 list-none divide-y divide-line-soft p-0">
            {hasil.indeks_terukur.map((i) => (
              <li key={i.kunci} className="py-3 first:pt-0 last:pb-0">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-dasar font-semibold text-ink">
                    {i.label}
                  </span>
                  <span className="tnum text-sedang font-semibold text-ink">
                    {angka(i.nilai)}
                  </span>
                </div>
                <Meter nilai={i.nilai} warna="var(--ukur)" />
                <p className="mt-1.5 text-kecil leading-relaxed text-muted">
                  {i.penjelasan}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        {/* --- estimasi fisiologis --- */}
        <Card>
          <CardTitle
            aksi={<Badge nada="estimasi">Estimasi</Badge>}
            keterangan="Diprediksi model dari morfologi, bukan diukur. Hanya muncul setelah model lolos validasi terhadap hasil UKDdP."
          >
            Parameter fisiologis
          </CardTitle>
          {hasil.estimasi_fisiologis.length === 0 ? (
            <Notice nada="warning" ikon={<AlertTriangle size={15} />}>
              Belum ada estimasi daya berkecambah untuk komoditas ini — model
              kalibrasinya belum tersedia atau belum lolos validasi. Angka
              fisiologis sengaja dikosongkan daripada ditebak. Buka tab{" "}
              <strong>Kalibrasi</strong> untuk melihat berapa sampel yang masih
              kurang.
            </Notice>
          ) : (
            <ul className="m-0 list-none divide-y divide-line-soft p-0">
              {hasil.estimasi_fisiologis.map((e) => (
                <li key={e.target} className="py-3 first:pt-0 last:pb-0">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-dasar font-semibold text-ink">
                      {e.label}
                    </span>
                    <span className="tnum text-sedang font-semibold text-ink">
                      {angka(e.nilai)}
                      <span className="ml-1 text-kecil font-normal text-muted">
                        ({angka(e.batas_bawah)}–{angka(e.batas_atas)})
                      </span>
                    </span>
                  </div>
                  <MeterSelang
                    nilai={e.nilai}
                    bawah={e.batas_bawah}
                    atas={e.batas_atas}
                  />
                  <p className="mt-1.5 text-kecil leading-relaxed text-muted">
                    {e.catatan} Validasi silang: MAE {e.mae_validasi}, R²{" "}
                    {e.r2_validasi}, dari {e.n_sampel_kalibrasi} sampel berlabel.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* --- kolom kanan --- */}
      <div className="grid min-w-0 gap-4">
        {adaCitra && (
          <Card>
            <CardTitle keterangan="Kontur hijau = benih utuh, jingga = ditandai cacat fisik.">
              Citra beranotasi
            </CardTitle>
            {/* Dimensi asli dikirim ikut hasil analisis, dan citra beranotasi
                digambar di atas array yang sama — jadi rasio ini persis,
                bukan perkiraan. Tanpa keduanya kartu melonjak saat citra
                tiba beberapa detik kemudian. */}
            {citraGagal ? (
              // Dulu citra yang gagal dimuat hanya di-display:none — kartunya
              // tinggal judul tanpa penjelasan, dan angka segmentasi di
              // bawahnya jadi terlihat seperti mengacu pada sesuatu yang
              // tidak ada. Lebih baik dikatakan.
              <p className="m-0 rounded-md border border-dashed border-line bg-surface-2 px-3 py-6 text-center text-kecil text-muted">
                Citra beranotasi tidak bisa dimuat. Angka di bawah tetap
                berasal dari analisis yang sama.
              </p>
            ) : (
              <img
                src={api.citraUrl(hasil.id, true)}
                alt={`Foto lot benih dengan ${segmentasi.jumlah_benih} kontur benih ditandai`}
                width={gerbang_citra?.lebar_px}
                height={gerbang_citra?.tinggi_px}
                loading="lazy"
                className="h-auto w-full rounded-md border border-line bg-surface-2"
                onError={() => setCitraGagal(true)}
              />
            )}
            {/* Hanya `jumlah_benih` yang tersimpan di basis data. Untuk hasil
                yang dibaca ulang dari riwayat, dua baris sisanya memang tidak
                pernah direkam — lebih baik hilang daripada menampilkan nol
                yang terbaca seolah benar-benar terukur. */}
            <dl className="mt-3 grid gap-1.5 text-kecil">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Benih terdeteksi</dt>
                <dd className="tnum m-0 font-semibold text-ink">
                  {segmentasi.jumlah_benih}
                </dd>
              </div>
              {segmentasi.dibuang_karena_tepi !== undefined && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Dibuang karena tepi</dt>
                  <dd className="tnum m-0 font-semibold text-ink">
                    {segmentasi.dibuang_karena_tepi}
                  </dd>
                </div>
              )}
              {segmentasi.dipisah_watershed !== undefined && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Dipisah watershed</dt>
                  <dd className="tnum m-0 font-semibold text-ink">
                    {segmentasi.dipisah_watershed}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        )}

        <Card>
          <CardTitle>Skala</CardTitle>
          {skala.ukuran_absolut ? (
            <Notice nada="info" ikon={<Ruler size={15} />}>
              Penanda ArUco terdeteksi: <strong>{skala.px_per_mm} px/mm</strong>.
              Ukuran benih dilaporkan dalam milimeter dan bisa dibandingkan
              antar foto.
            </Notice>
          ) : (
            <Notice nada="netral" ikon={<Ruler size={15} />}>
              Tidak ada penanda skala di foto, jadi ukuran hanya relatif —
              panjang dan lebar dalam milimeter tidak dilaporkan. Sertakan
              penanda ArUco 20 mm kalau ukuran absolut dibutuhkan.
            </Notice>
          )}
        </Card>

        {putusan.ambang_edar && !putusan.ambang_edar.terverifikasi && (
          <Card className="border-estimasi/50">
            <CardTitle>Status ambang</CardTitle>
            <Notice nada="warning" ikon={<AlertTriangle size={15} />}>
              Ambang {putusan.ambang_edar.min_daya_berkecambah}% berstatus{" "}
              <strong>{putusan.ambang_edar.status.replace("_", " ")}</strong>.{" "}
              {putusan.ambang_edar.catatan}
            </Notice>
            <p className="mt-2 text-kecil leading-relaxed text-muted">
              Rujukan: {putusan.ambang_edar.sumber}
            </p>
          </Card>
        )}

        <details className="rounded-lg border border-line bg-surface">
          <summary className="cursor-pointer list-none px-4 py-3 text-dasar font-semibold text-ink">
            <span className="inline-flex items-center gap-2">
              <Sprout size={15} className="text-muted" />
              Data mentah lot
            </span>
          </summary>
          <div className="px-4 pb-4">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Ciri</Th>
                  <Th align="right">Nilai</Th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(hasil.fitur_lot).map(([k, v]) => (
                  <tr key={k}>
                    <Td className="font-mono text-kecil">{k}</Td>
                    <Td num>
                      {v === null
                        ? "—"
                        : typeof v === "number"
                          ? v.toFixed(4)
                          : String(v)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </details>
      </div>
    </div>
  );
}

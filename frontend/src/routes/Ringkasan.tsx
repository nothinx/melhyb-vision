import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera } from "lucide-react";
import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { useReveal } from "../lib/animasi";
import { Badge, Empty, GalatData, Skeleton, TableWrap, Td, Th } from "../components/ui";
import { api } from "../lib/api";
import { angka, waktu } from "../lib/format";

const Spesimen = lazy(() => import("../components/SeedScatter3DMelon"));

export default function Ringkasan() {
  const wadah = useReveal<HTMLDivElement>();
  const ringkasan = useQuery({ queryKey: ["ringkasan"], queryFn: api.ringkasan });
  const riwayat = useQuery({ queryKey: ["riwayat"], queryFn: () => api.riwayat() });
  const kalibrasi = useQuery({ queryKey: ["kalibrasi"], queryFn: api.kalibrasi });
  const model = kalibrasi.data?.filter((k) => k.target === "daya_berkecambah") ?? [];

  return (
    <div ref={wadah} className="beranda">
      <header className="pembuka">
        <div className="pembuka-teks">
          <p className="nomor-bagian">SIGMA / Pengamatan lot benih</p>
          <h1 className="display judul-spesimen">Mutu benih,<br />berawal dari<br /><em>satu foto.</em></h1>
          <p className="pengantar">Ukur mutu fisik satu lot. Telusuri tiap hasilnya.
            Ketahui apa yang sudah terukur dan apa yang masih menunggu kalibrasi.</p>
          <Link to="/analisis" className="tombol-analisis"><Camera size={18} />Analisis lot benih<ArrowRight size={18} /></Link>
          <p className="catatan-pembuka">Satu foto = satu lot. Minimal 15 benih.</p>
        </div>
        <Suspense fallback={<Skeleton tinggi={420} />}><Spesimen /></Suspense>
      </header>

      <section className="pita-pengukuran" aria-label="Ringkasan pengukuran">
        <div><span className="nomor-bagian">Catatan pengujian</span><p>Setiap lot punya<br />jejak pengukuran.</p></div>
        {ringkasan.isError ? <GalatData ulang={() => ringkasan.refetch()} /> :
          ringkasan.isPending ? <Skeleton tinggi={70} /> : <>
            <div><span className="angka-ringkas">{ringkasan.data.total}</span><span>Lot dianalisis</span></div>
            <div><span className="angka-ringkas">{angka(ringkasan.data.imf_rata2)}<small>/100</small></span><span>Rerata mutu fisik</span></div>
            <div><span className="angka-ringkas">{ringkasan.data.berkalibrasi}</span><span>Lot dengan skor akhir</span></div>
          </>}
      </section>

      <section className="ruang-kerja">
        <div className="min-w-0">
          <div className="judul-bagian"><div><p className="nomor-bagian">01 / Catatan lot</p><h2>Pengamatan terbaru</h2></div><Link to="/riwayat">Buka riwayat <ArrowRight size={15} /></Link></div>
          {riwayat.isError ? <GalatData ulang={() => riwayat.refetch()} /> :
            riwayat.isPending ? <Skeleton tinggi={250} /> :
            !riwayat.data.length ? <Empty>Belum ada lot yang dianalisis. Mulai dari tombol Analisis lot benih di atas.</Empty> :
            <TableWrap label="Pengamatan lot terbaru" lebarMin={480}>
              <thead><tr><Th>Lot / komoditas</Th><Th>Waktu</Th><Th align="right">Benih</Th><Th align="right">IMF /100</Th></tr></thead>
              <tbody>{riwayat.data.slice(0, 5).map((r) => <tr key={r.id}>
                <Td><Link className="tautan-lot" to={`/riwayat?lot=${r.id}`}>#{r.id}<span>{r.komoditas_slug}</span></Link></Td>
                <Td>{waktu(r.dibuat_pada)}</Td><Td num>{r.n_benih}</Td><Td num><strong>{angka(r.indeks_mutu_fisik)}</strong></Td>
              </tr>)}</tbody>
            </TableWrap>}
          <p className="mt-3 text-kecil text-muted">IMF adalah indeks mutu fisik dari citra. Nilainya bukan daya berkecambah.</p>
        </div>

        <aside className="panel-kalibrasi">
          <p className="nomor-bagian">02 / Kesiapan estimasi</p><h2>Status kalibrasi</h2>
          <p className="text-dasar text-muted">Estimasi daya berkecambah hanya tersedia ketika model lolos validasi.</p>
          {kalibrasi.isError ? <GalatData ulang={() => kalibrasi.refetch()} /> :
            kalibrasi.isPending ? <Skeleton tinggi={160} /> :
            !model.length ? <p className="text-dasar">Belum ada model kalibrasi. Lihat syaratnya di halaman Kalibrasi.</p> :
            <ul className="daftar-model">{model.map((k) => <li key={k.komoditas}>
              <div><strong className="capitalize">{k.komoditas}</strong><span>{k.sampel_tersedia} pasangan berlabel</span></div>
              <Badge nada={k.siap_pakai ? "ukur" : "estimasi"}>{k.siap_pakai ? "Siap" : "Belum siap"}</Badge>
            </li>)}</ul>}
          <Link to="/kalibrasi" className="tautan-teks">Periksa model kalibrasi <ArrowRight size={15} /></Link>
        </aside>
      </section>

      <section className="catatan-metode reveal">
        <div><p className="nomor-bagian">03 / Membaca hasil</p><h2 className="display">Batas yang jelas.<br /><em>Hasil yang bisa ditelusuri.</em></h2><Link to="/metodologi" className="tautan-teks">Baca metode pengukuran <ArrowRight size={15} /></Link></div>
        <dl>
          <div><dt>Terukur dari citra</dt><dd>Ukuran, keutuhan, cacat, warna, dan tekstur dihitung dari piksel tiap benih.</dd></div>
          <div><dt>Diestimasi setelah validasi</dt><dd>Daya berkecambah dan vigor memerlukan minimal 30 pasangan berlabel dan R² validasi silang ≥ 0,30.</dd></div>
          <div><dt>Ambang dengan sumber</dt><dd>Gerbang ambang edar hanya digunakan saat ambang diaktifkan. Status sumbernya dapat diperiksa di <Link to="/standar">Standar mutu</Link>.</dd></div>
        </dl>
      </section>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { Database, GitBranch, Table2 } from "lucide-react";
import {
  Badge, Card, CardTitle, Empty, GalatData, Notice, Skeleton, TableWrap, Td, Th,
} from "../components/ui";
import { api } from "../lib/api";
import { useReveal } from "../lib/animasi";
import { WARNA_KOMODITAS } from "../lib/format";

/** Relasi tabel — jawaban langsung atas temuan P-10 (ERD tidak pernah digambar). */
const ENTITAS = [
  {
    nama: "Komoditas",
    isi: "slug, nama, nama latin, ambang daya berkecambah, sumber ambang",
    relasi: "1 → banyak Varietas, 1 → banyak Batch",
  },
  {
    nama: "Varietas",
    isi: "nama, pemulia, nomor pendaftaran, deskriptor morfologi acuan (panjang, lebar, L*a*b*)",
    relasi: "milik 1 Komoditas",
  },
  {
    nama: "Batch",
    isi: "kode lot, produsen, nomor lot produsen, tanggal panen",
    relasi: "milik 1 Komoditas dan 1 Varietas; 1 → banyak Analisis dan UjiUKDdP",
  },
  {
    nama: "Analisis",
    isi: "berkas citra, citra beranotasi, 15 ciri lot, 5 indeks terukur, estimasi, putusan",
    relasi: "milik 1 Batch",
  },
  {
    nama: "UjiUKDdP",
    isi: "tanggal tanam & hitungan, N, normal I & II, abnormal, tidak tumbuh, DB, kecepatan, keserempakan",
    relasi: "milik 1 Batch, boleh menunjuk 1 Analisis",
  },
  {
    nama: "ModelKalibrasi",
    isi: "komoditas, target, n sampel, MAE, RMSE, R², layak pakai",
    relasi: "satu per pasangan komoditas × target",
  },
];

export default function Katalog() {
  const wadah = useReveal<HTMLDivElement>();
  const komoditas = useQuery({ queryKey: ["komoditas"], queryFn: api.komoditas });
  const standar = useQuery({ queryKey: ["standar"], queryFn: api.standar });

  if (komoditas.isError || standar.isError) {
    return <GalatData ulang={() => { komoditas.refetch(); standar.refetch(); }} />;
  }

  return (
    <div ref={wadah} className="grid min-w-0 gap-5">
      <header className="reveal max-w-[42rem]">
        <p className="eyebrow mb-2 text-accent">Katalog</p>
        <h1 className="display m-0 judul-halaman text-ink">
          Komoditas dan sumber ambangnya
        </h1>
        <p className="mt-3 text-sedang leading-relaxed text-ink-2">
          Periksa komoditas yang tersedia untuk analisis. Ambang edar di bawah
          mengikuti sumber yang sama dengan halaman Standar.
        </p>
      </header>

      <Card>
        <CardTitle
          aksi={komoditas.data && <Badge nada="ukur" ikon={<Database size={12} />}>{komoditas.data.length} komoditas</Badge>}
        >
          Komoditas terdaftar
        </CardTitle>
        {komoditas.isLoading || standar.isLoading ? (
          <Skeleton tinggi={160} />
        ) : !komoditas.data?.length ? (
          <Empty>Belum ada komoditas terdaftar. Hubungi pengelola data untuk mendaftarkan komoditas.</Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Nama latin</Th>
                <Th align="right">Ambang DB</Th>
                <Th>Sumber ambang</Th>
              </tr>
            </thead>
            <tbody>
              {komoditas.data?.map((k) => {
                const acuan = standar.data?.komoditas.find((s) => s.slug === k.slug);
                const ambang = acuan?.daya_berkecambah_min;
                return (
                <tr key={k.id}>
                  <Td>
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <span
                        aria-hidden
                        className="inline-block size-2.5 rounded-[2px]"
                        style={{
                          background: WARNA_KOMODITAS[k.slug] ?? "var(--muted)",
                        }}
                      />
                      {k.nama}
                    </span>
                  </Td>
                  <Td>
                    <em>{k.nama_latin}</em>
                  </Td>
                  <Td num>
                    {ambang?.nilai != null && ambang.status !== "belum_ada"
                      ? `${ambang.nilai}${ambang.satuan}` : "Tidak dipakai"}
                  </Td>
                  <Td className="text-kecil">{ambang?.status === "terverifikasi" ? "Terverifikasi" : ambang?.status === "diisi_operator" ? "Diisi operator" : "Belum ada ambang aktif"}<br />{acuan?.regulasi.join("; ")}</Td>
                </tr>
              ); })}
            </tbody>
          </TableWrap>
        )}
        <div className="mt-4">
          <Notice nada="warning">
            Ambang daya berkecambah belum seluruhnya terverifikasi dari dokumen
            primer. Halaman <strong>Standar</strong> memuat status tiap angka
            beserta cara memperoleh dokumen aslinya.
          </Notice>
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle
            aksi={<Badge nada="netral" ikon={<GitBranch size={12} />}>Skema</Badge>}
            keterangan="Relasi data yang mendukung penelusuran lot."
          >
            Entitas basis data
          </CardTitle>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {ENTITAS.map((e) => (
              <li key={e.nama} className="rounded-md bg-surface-2 p-3.5">
                <div className="mb-1 font-mono text-dasar font-semibold text-accent">
                  {e.nama}
                </div>
                <p className="m-0 text-kecil leading-relaxed text-ink-2">
                  {e.isi}
                </p>
                <p className="mt-1.5 mb-0 text-kecil leading-relaxed text-muted">
                  {e.relasi}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle
            aksi={<Badge nada="netral" ikon={<Table2 size={12} />}>Varietas</Badge>}
            keterangan="Deskriptor morfologi acuan per varietas dipakai membandingkan lot terhadap varietas yang diklaim di kemasan."
          >
            Varietas
          </CardTitle>
          <Empty>
            Daftar varietas belum ditampilkan di halaman ini. Pencatatan
            varietas saat ini dilakukan melalui pengelola data.
          </Empty>
          <div className="mt-4">
            <Notice nada="info">
              Tanpa deskriptor acuan, aplikasi hanya bisa menilai mutu, tidak
              bisa memverifikasi bahwa isi kemasan sesuai varietas yang tertulis.
            </Notice>
          </div>
          <Link to="/standar" className="tautan-teks">Periksa sumber ambang</Link>
        </Card>
      </div>
    </div>
  );
}

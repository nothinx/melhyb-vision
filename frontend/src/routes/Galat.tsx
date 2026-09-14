import { AlertTriangle, Compass } from "lucide-react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router";
import { Button, Card, Notice } from "../components/ui";

/**
 * Satu halaman untuk dua keadaan yang sama-sama berakhir buntu: alamat yang
 * tidak ada, dan komponen yang melempar saat render.
 *
 * Yang kedua bukan kemungkinan teoretis. Sampai baru-baru ini, membuka satu
 * baris di Riwayat dengan backend hidup melempar TypeError — dan karena
 * tidak ada `errorElement`, seluruh aplikasi copot jadi layar putih tanpa
 * satu kata pun. Halaman ini memastikan kegagalan berikutnya setidaknya bisa
 * dibaca dan ada jalan pulang.
 */
export default function Galat({ takAda = false }: { takAda?: boolean }) {
  // Rute tangkap-semua merender komponen ini sebagai elemen biasa, bukan
  // sebagai errorElement — di situ useRouteError() kosong. Tanpa penanda
  // eksplisit, alamat yang salah ketik akan dilaporkan sebagai kerusakan.
  const galat = useRouteError();
  const tidakDitemukan =
    takAda || (isRouteErrorResponse(galat) && galat.status === 404);

  return (
    <div className="grid min-h-[52vh] place-items-center px-4 py-10">
      <Card className="max-w-[34rem] text-center">
        <div
          aria-hidden
          className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted"
        >
          {tidakDitemukan ? <Compass size={22} /> : <AlertTriangle size={22} />}
        </div>

        <h1 className="display m-0 judul-halaman text-ink">
          {tidakDitemukan
            ? "Halaman ini tidak ada"
            : "Ada yang gagal dimuat di halaman ini"}
        </h1>

        <p className="mx-auto mt-3 mb-0 max-w-[26rem] text-dasar leading-relaxed text-ink-2">
          {tidakDitemukan
            ? "Alamatnya mungkin salah ketik, atau halamannya sudah dipindahkan. Semua yang ada bisa dicapai lewat navigasi di atas."
            : "Data analisis tetap tersimpan — yang gagal hanya tampilan ini. Muat ulang halaman, atau kembali ke ringkasan."}
        </p>

        {!tidakDitemukan && galat instanceof Error && (
          <Notice
            nada="netral"
            peran={null}
            ikon={<AlertTriangle size={14} />}
          >
            <span className="font-mono text-kecil break-words">
              {galat.message}
            </span>
          </Notice>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent bg-accent px-4 text-dasar font-semibold text-accent-ink shadow-kartu transition-[filter,transform] hover:brightness-110 active:scale-[0.99]"
          >
            Kembali ke ringkasan
          </Link>
          {!tidakDitemukan && (
            <Button variant="hantu" onClick={() => location.reload()}>
              Muat ulang
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

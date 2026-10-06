import { AlertTriangle } from "lucide-react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router";
import { BenihKosong } from "../components/Lambang";
import { Button, Notice } from "../components/ui";

/**
 * Satu halaman untuk dua jalan buntu: alamat yang tidak ada, dan komponen
 * yang melempar saat render. Tanpa ini, satu galat render membuat seluruh
 * aplikasi menjadi layar putih tanpa penjelasan.
 */
export default function Galat({ takAda = false }: { takAda?: boolean }) {
  // Rute tangkap-semua merender ini sebagai elemen biasa, jadi
  // useRouteError() kosong di sana; penanda eksplisit membedakannya.
  const galat = useRouteError();
  const tidakDitemukan = takAda || (isRouteErrorResponse(galat) && galat.status === 404);

  return (
    <div className="bingkai grid min-h-[70dvh] place-items-center py-16">
      <div className="grid max-w-[36rem] justify-items-center gap-5 text-center">
        <BenihKosong ukuran={150} />
        <h1 className="display m-0 text-[clamp(2rem,4.4vw,3.2rem)] text-ink">
          {tidakDitemukan ? "Halaman tidak ditemukan." : "Halaman tidak dapat dimuat."}
        </h1>
        <p className="m-0 text-sedang text-ink-2">
          {tidakDitemukan
            ? "Periksa kembali alamatnya, atau kembali ke beranda."
            : "Coba muat ulang. Jika masih terjadi, kembali ke beranda dan periksa sambungan ke server."}
        </p>
        {!tidakDitemukan && galat instanceof Error && (
          <div className="w-full text-left">
            <Notice nada="netral" peran={null} ikon={<AlertTriangle size={14} />}>
              <span className="mono text-kecil break-words">{galat.message}</span>
            </Notice>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2.5">
          <Link to="/" className="inline-flex h-12 items-center rounded-full bg-accent px-6 text-dasar font-semibold text-accent-ink hover:brightness-110">Kembali ke beranda</Link>
          {!tidakDitemukan && <Button variant="hantu" onClick={() => location.reload()}>Muat ulang</Button>}
        </div>
      </div>
    </div>
  );
}

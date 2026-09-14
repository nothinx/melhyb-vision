import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, Camera, CircleX, ImageUp, Loader2, RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import HasilPanel from "../components/HasilPanel";
import { Button, Card, CardTitle, GalatData, Notice } from "../components/ui";
import { ApiError, api, modeSekarang } from "../lib/api";
import { useFokusJudul } from "../lib/fokus";
import type { HasilAnalisis, MasalahGerbang } from "../lib/types";

const BATAS_BERKAS = 15_000_000;

const PANDUAN = [
  "Alas polos satu warna yang jelas berbeda dari warna benih — kertas putih untuk benih gelap, kertas gelap untuk benih terang.",
  "Sebarkan minimal 15 benih, tidak saling menumpuk. Benih yang terpotong tepi foto otomatis dibuang dari perhitungan.",
  "Cahaya merata, tanpa bayangan keras dan tanpa sinar matahari langsung.",
  "Kamera tegak lurus ke alas, jarak tetap, fokus terkunci pada benih.",
  "Untuk ukuran dalam milimeter, letakkan penanda ArUco 4×4 berukuran 20 mm di dalam bingkai.",
];

function Kamera({
  onAmbil,
  onBatal,
}: {
  onAmbil: (f: File) => void;
  onBatal: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
        if (batal) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setSiap(true);
        }
      } catch {
        setGalat(
          "Kamera tidak bisa dibuka. Periksa izin kamera di peramban, atau pilih berkas dari galeri.",
        );
      }
    })();
    return () => {
      batal = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (galat) {
    return (
      <div className="grid gap-3">
        <Notice nada="critical" ikon={<CircleX size={15} />}>
          {galat}
        </Notice>
        <Button variant="hantu" onClick={onBatal}>
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <video
        ref={videoRef}
        playsInline
        muted
        className="w-full rounded-md bg-black"
      />
      <p className="m-0 text-kecil leading-relaxed text-muted">
        Sebarkan benih pada alas polos yang kontras, jangan bertumpuk.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="hantu" onClick={onBatal}>
          Batal
        </Button>
        <Button
          disabled={!siap}
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d")!.drawImage(video, 0, 0);
            canvas.toBlob(
              (blob) =>
                blob &&
                onAmbil(
                  new File([blob], `benih-${Date.now()}.jpg`, {
                    type: "image/jpeg",
                  }),
                ),
              "image/jpeg",
              0.92,
            );
          }}
        >
          {siap ? "Ambil foto" : "Menyiapkan…"}
        </Button>
      </div>
    </div>
  );
}

export default function Analisis() {
  const komoditas = useQuery({ queryKey: ["komoditas"], queryFn: api.komoditas });
  const [slug, setSlug] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [kamera, setKamera] = useState(false);
  const [proses, setProses] = useState(false);
  const [seret, setSeret] = useState(false);
  const [hasil, setHasil] = useState<HasilAnalisis | null>(null);
  const [galat, setGalat] = useState<{ pesan: string; butir: MasalahGerbang[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const judulHasil = useFokusJudul<HTMLHeadingElement>(hasil?.id);

  useEffect(() => {
    if (!slug && komoditas.data?.length) setSlug(komoditas.data[0].slug);
  }, [komoditas.data, slug]);

  useEffect(() => {
    if (!berkas) return setPratinjau(null);
    const url = URL.createObjectURL(berkas);
    setPratinjau(url);
    return () => URL.revokeObjectURL(url);
  }, [berkas]);

  function pilih(f: File | null) {
    setHasil(null);
    setKamera(false);
    // Batas yang sama dengan yang tertulis di layar. Tanpa ini, foto 60 MB
    // dari ponsel terunggah utuh dulu baru ditolak backend — di jaringan
    // lapangan itu menit yang hilang percuma.
    if (f && f.size > BATAS_BERKAS) {
      setBerkas(null);
      setGalat({
        pesan: `Berkas ${(f.size / 1e6).toFixed(1)} MB melebihi batas ${
          BATAS_BERKAS / 1e6
        } MB. Perkecil resolusi kamera atau kompres fotonya.`,
        butir: [],
      });
      return;
    }
    if (f && (!f.size || !["image/jpeg", "image/png"].includes(f.type))) {
      setBerkas(null);
      setGalat({ pesan: "Pilih foto JPG atau PNG yang tidak kosong. Konversikan HEIC ke JPG terlebih dahulu.", butir: [] });
      return;
    }
    setBerkas(f);
    setGalat(null);
  }

  async function kirim() {
    if (!berkas || !slug || proses) return;
    setProses(true);
    setGalat(null);
    try {
      setHasil(await api.analisis(berkas, slug));
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const d = (e.detail ?? {}) as {
          pesan?: string;
          gerbang_citra?: { masalah?: MasalahGerbang[] };
        };
        setGalat({
          pesan: d.pesan ?? e.message,
          butir: d.gerbang_citra?.masalah ?? [],
        });
      } else {
        setGalat({
          pesan: e instanceof Error ? e.message : "Analisis gagal.",
          butir: [],
        });
      }
    } finally {
      setProses(false);
    }
  }

  if (hasil) {
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-1 text-accent">Hasil analisis</p>
            <h1
              ref={judulHasil}
              tabIndex={-1}
              className="display m-0 judul-halaman text-ink outline-none"
            >
              {komoditas.data?.find((k) => k.slug === slug)?.nama ?? slug}
            </h1>
          </div>
          <Button
            variant="hantu"
            onClick={() => {
              setHasil(null);
              setBerkas(null);
            }}
          >
            <RotateCcw size={15} />
            Analisis lot lain
          </Button>
        </div>
        <HasilPanel hasil={hasil} adaCitra={modeSekarang() === "langsung"} />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="grid gap-4">
        <header className="reveal max-w-[42rem]">
          <p className="eyebrow mb-2 text-accent">Analisis</p>
          <h1 className="display m-0 judul-halaman text-ink">
            Satu foto berisi satu lot
          </h1>
          <p className="mt-3 text-sedang leading-relaxed text-ink-2">
            Yang diukur adalah sebaran antar benih di dalam lot, bukan satu
            benih tunggal. Karena itu keseragaman menjadi angka yang
            benar-benar dihitung, bukan ditebak.
          </p>
        </header>

        {/* Ada sejak render pertama supaya perubahan isinya benar-benar
            diumumkan; kalau daerahnya baru muncul bersama teksnya, sebagian
            pembaca layar melewatkannya. */}
        <p role="status" className="sr-only">
          {proses ? "Sedang menganalisis foto lot benih." : ""}
        </p>

        {galat && (
          <div className="masuk-lembut">
            <Notice nada="critical" judul={galat.pesan} ikon={<AlertTriangle size={15} />}>
              {galat.butir.length > 0 && (
                <ul className="mt-1 mb-0 grid gap-1.5 pl-4">
                  {galat.butir.map((b) => (
                    <li key={b.kode}>
                      {b.pesan}{" "}
                      <span className="tnum text-muted">
                        (terukur {b.nilai}, ambang {b.ambang})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Notice>
          </div>
        )}

        {komoditas.isError && <GalatData ulang={() => komoditas.refetch()} />}
        <Card>
          <div className="mb-4">
            <label
              htmlFor="komoditas"
              className="mb-1.5 block text-dasar font-semibold text-ink"
            >
              Komoditas
            </label>
            <select
              id="komoditas"
              disabled={proses || komoditas.isPending || komoditas.isError}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="min-h-11 w-full rounded-md border border-garis-kontrol bg-surface px-3 text-dasar text-ink"
            >
              {!komoditas.data?.length && <option value="">{komoditas.isPending ? "Memuat komoditas…" : "Komoditas belum tersedia"}</option>}
              {komoditas.data?.map((k) => (
                <option key={k.slug} value={k.slug}>
                  {k.nama} — {k.nama_latin}
                </option>
              ))}
            </select>
          </div>

          {kamera ? (
            <Kamera onAmbil={pilih} onBatal={() => setKamera(false)} />
          ) : pratinjau ? (
            <div className="grid gap-3">
              <img
                src={pratinjau}
                alt="Pratinjau foto lot benih"
                className="w-full rounded-md border border-line"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="hantu" disabled={proses} onClick={() => pilih(null)}>
                  Ganti foto
                </Button>
                <Button onClick={kirim} disabled={proses || !slug || komoditas.isError}>
                  {proses ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Menganalisis…
                    </>
                  ) : (
                    "Analisis"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Kotak bergaris putus-putus ini sudah terlihat seperti area
                  seret-dan-lepas sejak awal, tetapi dulu tidak menerima
                  apa pun yang dijatuhkan ke atasnya. Menjanjikan afordansi
                  lalu mengabaikannya lebih buruk daripada tidak
                  menawarkannya sama sekali. */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setSeret(true);
                }}
                onDragLeave={() => setSeret(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setSeret(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) pilih(f);
                }}
                className={`grid place-content-center rounded-xl border-2 border-dashed px-4 py-12 text-center transition-colors sm:py-16 ${
                  seret
                    ? "border-accent bg-accent-soft"
                    : "border-garis-kontrol bg-surface-2"
                }`}
              >
                <span
                  aria-hidden
                  className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-surface text-muted shadow-kartu"
                >
                  <ImageUp size={22} />
                </span>
                <p className="mt-0 mb-1 text-sedang font-semibold text-ink">
                  Seret foto lot benih ke sini
                </p>
                <p className="mt-0 mb-5 text-dasar text-ink-2">
                  atau ambil langsung dengan kamera, atau pilih dari berkas.
                </p>
                <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-2">
                  <Button onClick={() => setKamera(true)}>
                    <Camera size={16} />
                    Kamera
                  </Button>
                  <Button variant="garis" onClick={() => inputRef.current?.click()}>
                    <ImageUp size={16} />
                    Berkas
                  </Button>
                </div>
                <p className="mt-4 mb-0 text-kecil text-muted">
                  JPG atau PNG. Maksimal 15 MB.
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                onChange={(e) => pilih(e.target.files?.[0] ?? null)}
              />
            </>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle keterangan="Konsistensi cara memotret adalah syarat agar morfometrik antar lot bisa dibandingkan sama sekali.">
          Panduan memotret
        </CardTitle>
        <ol className="m-0 grid list-none gap-3 p-0">
          {PANDUAN.map((p, i) => (
            <li key={p} className="flex gap-2.5">
              <span className="tnum mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-mikro font-bold text-ukur">
                {i + 1}
              </span>
              <span className="text-dasar leading-relaxed text-ink-2">{p}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

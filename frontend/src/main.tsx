import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router";
import Shell from "./components/Shell";
import Galat from "./routes/Galat";
import { Skeleton } from "./components/ui";
import "./styles.css";

// Setiap rute dimuat terpisah supaya pustaka grafik tidak ikut terunduh
// pada kunjungan pertama.
const Ringkasan = lazy(() => import("./routes/Ringkasan"));
const Analisis = lazy(() => import("./routes/Analisis"));
const Riwayat = lazy(() => import("./routes/Riwayat"));
const Standar = lazy(() => import("./routes/Standar"));
const Kalibrasi = lazy(() => import("./routes/Kalibrasi"));
const Katalog = lazy(() => import("./routes/Katalog"));
const Metodologi = lazy(() => import("./routes/Metodologi"));
const MelonSpotlight = lazy(() => import("./routes/MelonSpotlight"));

const tunggu = (el: React.ReactNode) => (
  <Suspense fallback={<Skeleton tinggi={360} />}>{el}</Suspense>
);

// Hash router: berkas hasil build bisa dibuka langsung dari mana saja
// (file://, hosting statis apa pun) tanpa konfigurasi rewrite di server.
const router = createHashRouter([
  {
    path: "/",
    element: <Shell />,
    // errorElement menangkap dua hal sekaligus: alamat yang tidak cocok
    // rute mana pun, dan komponen yang melempar saat render. Tanpa ini,
    // yang kedua meruntuhkan seluruh aplikasi jadi layar putih kosong.
    errorElement: <Galat />,
    children: [
      { index: true, element: tunggu(<Ringkasan />) },
      { path: "analisis", element: tunggu(<Analisis />) },
      { path: "riwayat", element: tunggu(<Riwayat />) },
      { path: "standar", element: tunggu(<Standar />) },
      { path: "kalibrasi", element: tunggu(<Kalibrasi />) },
      { path: "katalog", element: tunggu(<Katalog />) },
      { path: "metodologi", element: tunggu(<Metodologi />) },
      { path: "melon", element: tunggu(<MelonSpotlight />) },
      { path: "*", element: <Galat takAda /> },
    ],
  },
]);

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 0, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

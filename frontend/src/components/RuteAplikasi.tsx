import { lazy, Suspense, type ReactNode } from "react";
import { createHashRouter, Navigate, RouterProvider } from "react-router";
import Shell from "./Shell";
import Galat from "../routes/Galat";
import { Skeleton } from "./ui";

const Beranda = lazy(() => import("../routes/Beranda"));
const Analisis = lazy(() => import("../routes/Analisis"));
const Riwayat = lazy(() => import("../routes/Riwayat"));
const Varietas = lazy(() => import("../routes/Varietas"));
const Standar = lazy(() => import("../routes/Standar"));
const Kalibrasi = lazy(() => import("../routes/Kalibrasi"));
const Metodologi = lazy(() => import("../routes/Metodologi"));

function tunggu(halaman: ReactNode) {
  return <Suspense fallback={<div className="bingkai pt-32"><Skeleton tinggi={360} /></div>}>{halaman}</Suspense>;
}

// Rute hash mempertahankan dukungan laporan HTML yang dibuka dari disk.
const rute = createHashRouter([{
  path: "/", element: <Shell />, errorElement: <Galat />,
  children: [
    { index: true, element: tunggu(<Beranda />) },
    { path: "analisis", element: tunggu(<Analisis />) },
    { path: "riwayat", element: tunggu(<Riwayat />) },
    { path: "varietas", element: tunggu(<Varietas />) },
    { path: "standar", element: tunggu(<Standar />) },
    { path: "kalibrasi", element: tunggu(<Kalibrasi />) },
    { path: "metodologi", element: tunggu(<Metodologi />) },
    // Alamat lama tetap bekerja.
    { path: "katalog", element: <Navigate to="/varietas" replace /> },
    { path: "melon", element: <Navigate to="/varietas" replace /> },
    { path: "*", element: <Galat takAda /> },
  ],
}]);

export default function RuteAplikasi() {
  return <RouterProvider router={rute} />;
}

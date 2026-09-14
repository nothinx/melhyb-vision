import { useEffect, useRef } from "react";

/**
 * Beberapa tampilan mengganti seluruh isi <main> tanpa pindah rute: hasil
 * analisis menggantikan formulir unggah, rincian riwayat menggantikan
 * daftarnya. Tombol yang barusan ditekan ikut hilang, jadi fokus papan ketik
 * jatuh ke <body> dan pembaca layar tidak diberi tahu apa-apa — pengguna
 * kembali ke pucuk halaman tanpa penjelasan.
 *
 * Pasang ref ini pada judul tampilan baru, bersama `tabIndex={-1}` supaya
 * judul bisa menerima fokus terprogram tanpa masuk urutan Tab.
 */
export function useFokusJudul<T extends HTMLElement = HTMLHeadingElement>(
  kunci: unknown,
): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    // preventScroll: judulnya sudah di puncak tampilan baru; membiarkan
    // peramban menggulir sendiri malah melompat pada tata letak dua kolom.
    ref.current?.focus({ preventScroll: true });
  }, [kunci]);
  return ref;
}

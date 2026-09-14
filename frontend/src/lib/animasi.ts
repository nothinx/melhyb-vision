import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";

export function gerakanDikurangi(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Munculkan elemen ber-kelas `.reveal` di dalam wadah, berurutan, saat
 * wadahnya masuk layar. Dipakai anime.js karena stagger-nya lebih halus
 * daripada menumpuk transition CSS satu per satu.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  jeda = 0,
): React.RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const wadah = ref.current;
    if (!wadah) return;
    const target = wadah.querySelectorAll<HTMLElement>(".reveal");
    if (!target.length) return;

    if (gerakanDikurangi()) return;
    const berjalan: ReturnType<typeof animate>[] = [];
    const pengamat = new IntersectionObserver(
      (entri) => {
        entri.forEach((entri) => {
          if (!entri.isIntersecting) return;
          if (!gerakanDikurangi()) berjalan.push(animate(entri.target, {
            translateY: [8, 0],
            duration: 420,
            delay: jeda,
            ease: "out(3)",
          }));
          pengamat.unobserve(entri.target);
        });
      },
      { threshold: 0.1 },
    );
    target.forEach((elemen) => pengamat.observe(elemen));
    return () => {
      pengamat.disconnect();
      berjalan.forEach((gerak) => gerak.revert());
    };
  }, [jeda]);

  return ref;
}

/**
 * Animasi masuk untuk satu elemen, dijalankan saat elemen itu benar-benar
 * ada di DOM. Dipakai pada komponen yang muncul belakangan — setelah data
 * selesai dimuat — yang tidak akan tertangkap pengamat wadah.
 */
export function useMasuk<T extends HTMLElement = HTMLDivElement>(
  jeda = 0,
): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || gerakanDikurangi()) return;
    const anim = animate(el, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 560,
      delay: jeda,
      ease: "out(3)",
    });
    return () => {
      anim.pause();
    };
  }, [jeda]);
  return ref;
}

/** Angka yang naik dari nol saat pertama terlihat. */
export function useHitung(nilai: number, desimal = 0): string {
  const [tampil, setTampil] = useState(() =>
    gerakanDikurangi() ? nilai : 0,
  );
  const acuan = useRef(nilai);

  useEffect(() => {
    if (gerakanDikurangi() || !Number.isFinite(nilai)) {
      setTampil(nilai);
      return;
    }
    const dari = { n: acuan.current === nilai ? 0 : acuan.current };
    acuan.current = nilai;
    const anim = animate(dari, {
      n: nilai,
      duration: 950,
      ease: "out(4)",
      onUpdate: () => setTampil(dari.n),
    });
    return () => {
      anim.pause();
    };
  }, [nilai]);

  return Number.isFinite(tampil) ? tampil.toFixed(desimal) : "—";
}

/** Lebar bar yang tumbuh dari nol, dipakai pada indeks dan meter. */
export function useTumbuh(persen: number): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lebar = `${Math.max(0, Math.min(100, persen))}%`;
    if (gerakanDikurangi()) {
      el.style.width = lebar;
      return;
    }
    const anim = animate(el, {
      width: ["0%", lebar],
      duration: 900,
      ease: "out(4)",
    });
    return () => {
      anim.pause();
    };
  }, [persen]);
  return ref;
}

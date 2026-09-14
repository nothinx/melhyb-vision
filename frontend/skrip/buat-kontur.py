"""Ambil kontur benih sungguhan dari pipeline, simpan sebagai path SVG.

Aset visual aplikasi ini tidak digambar tangan dan tidak diambil dari pustaka
ilustrasi. Semuanya keluaran `vision.segment.segment_seeds` yang sama persis
dengan yang dipakai saat menganalisis foto operator: satu lot benih
disegmentasi, tiap benih diambil konturnya, dan yang solidity-nya di bawah
ambang ditandai cacat.

Alasan memilih path SVG dan bukan berkas JPG hasil anotasi:

- Ukurannya kecil. Satu foto beranotasi ~250 kB; seluruh kontur di berkas ini
  beberapa puluh kB, dan build satu-berkas menyandikannya jadi base64.
- Skalanya bebas dan warnanya ikut token tema lewat `currentColor` — sebuah
  JPG terkunci pada satu tema.
- Bisa dianimasikan sebagai gambar yang ditarik (`stroke-dasharray`), jadi
  gerakannya menjelaskan sesuatu: itulah urutan aplikasi mengukur benih.

Dijalankan ulang bila parameter segmentasi berubah:

    backend/.venv/Scripts/python.exe frontend/skrip/buat-kontur.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

AKAR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(AKAR / "backend"))
sys.path.insert(0, str(AKAR / "backend" / "tests"))

from app.config import settings                     # noqa: E402
from app.vision.features import defect_flags, extract_seed_features  # noqa: E402
from app.vision.preprocess import ScaleInfo, gray_world_balance  # noqa: E402
from app.vision.segment import segment_seeds        # noqa: E402
from make_fixture import synthetic_lot              # noqa: E402

KELUARAN = AKAR / "frontend" / "src" / "data" / "kontur-lot.ts"

# Cukup untuk terbaca sebagai lot, tidak sampai membuat berkasnya berat.
MAKS_BENIH = 46
# Toleransi penyederhanaan poligon, relatif terhadap keliling kontur. Tanpa
# ini satu benih bisa jadi 200+ titik; 1,2% memangkasnya ke belasan titik
# tanpa mengubah bentuk yang terlihat.
EPS_RELATIF = 0.012


def kontur_lot() -> tuple[list[dict], int, int]:
    img = synthetic_lot(n=70, defect_ratio=0.22, size_cv=0.13, seed=42)
    balanced = gray_world_balance(img)
    seg = segment_seeds(balanced)
    feats = extract_seed_features(balanced, seg,
                                  ScaleInfo(px_per_mm=None, source="tidak_ada"))
    cacat = defect_flags(feats, settings.defect_solidity_threshold)
    tinggi, lebar = seg.labels.shape

    hasil = []
    for f in feats:
        mask = (seg.labels == f.label).astype(np.uint8)
        cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not cs:
            continue
        c = max(cs, key=cv2.contourArea)
        c = cv2.approxPolyDP(c, EPS_RELATIF * cv2.arcLength(c, True), True)
        titik = c.reshape(-1, 2)
        if len(titik) < 3:
            continue
        # Dinormalkan ke viewBox 0..1000 supaya SVG-nya bebas ukuran.
        sx, sy = 1000 / lebar, 1000 / tinggi
        d = "M" + "L".join(
            f"{x * sx:.1f} {y * sy:.1f}" for x, y in titik
        ) + "Z"
        m = cv2.moments(mask, binaryImage=True)
        cx = m["m10"] / m["m00"] * sx if m["m00"] else 0
        hasil.append({"d": d, "cacat": bool(cacat.get(f.label)), "cx": cx,
                      "luas": float(f.area_px)})

    # Diurutkan kiri ke kanan: saat digambar berurutan, gerakannya terbaca
    # sebagai sapuan memindai, bukan kedipan acak.
    hasil.sort(key=lambda h: h["cx"])
    if len(hasil) > MAKS_BENIH:
        # Ambil yang terbesar supaya bentuknya tetap jelas di ukuran kecil,
        # lalu urutkan lagi kiri-ke-kanan.
        hasil = sorted(hasil, key=lambda h: -h["luas"])[:MAKS_BENIH]
        hasil.sort(key=lambda h: h["cx"])
    return hasil, seg.count, sum(1 for h in hasil if h["cacat"])


def main() -> None:
    kontur, jumlah_asli, jumlah_cacat = kontur_lot()
    baris = ",\n".join(
        f'  {{ d: "{k["d"]}", cacat: {str(k["cacat"]).lower()} }}' for k in kontur
    )
    isi = f'''// DIBANGKITKAN — jangan disunting tangan.
// Sumber: frontend/skrip/buat-kontur.py, dijalankan ulang bila parameter
// segmentasi di backend berubah.
//
// Ini kontur sungguhan hasil `segment_seeds` atas satu lot benih sintetis:
// {jumlah_asli} benih terdeteksi, {len(kontur)} terbesar dipakai di sini,
// {jumlah_cacat} di antaranya ditandai cacat karena solidity-nya di bawah
// ambang. Koordinatnya dinormalkan ke viewBox 1000x1000.

export type Kontur = {{ d: string; cacat: boolean }};

export const KONTUR_LOT: Kontur[] = [
{baris},
];
'''
    KELUARAN.parent.mkdir(parents=True, exist_ok=True)
    KELUARAN.write_text(isi, encoding="utf-8")
    kb = len(isi.encode()) / 1024
    print(f"  {KELUARAN.relative_to(AKAR)}")
    print(f"  {len(kontur)} kontur ({jumlah_cacat} cacat) dari {jumlah_asli} "
          f"benih terdeteksi — {kb:.1f} kB")


if __name__ == "__main__":
    main()

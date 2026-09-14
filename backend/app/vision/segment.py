"""Segmentasi instance benih.

Menetapkan unit analisis secara eksplisit (temuan P-06): satu foto berisi
SATU LOT berisi banyak benih. Setiap benih dipisahkan sebagai objek
tersendiri, lalu statistik lot dihitung dari sebaran antar-benih. Dengan
begitu "keseragaman" menjadi angka yang benar-benar diukur, bukan ditebak.
"""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class Segmentation:
    labels: np.ndarray          # peta label int32, 0 = latar
    count: int
    foreground_ratio: float
    channel_used: str
    border_removed: int
    watershed_splits: int


def _otsu_score(channel: np.ndarray) -> tuple[float, np.ndarray]:
    """Otsu pada satu kanal; kembalikan seberapa bimodal kanal itu."""
    blur = cv2.GaussianBlur(channel, (5, 5), 0)
    thr, mask = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    fg = blur[mask > 0]
    bg = blur[mask == 0]
    if fg.size < 50 or bg.size < 50:
        return -1.0, mask
    # Varians antar-kelas ternormalisasi: makin besar makin tegas pemisahannya.
    w0, w1 = bg.size / blur.size, fg.size / blur.size
    between = w0 * w1 * (float(fg.mean()) - float(bg.mean())) ** 2
    total_var = float(blur.var()) + 1e-6
    return between / total_var, mask


def segment_seeds(
    img: np.ndarray,
    min_area_ratio: float = 2e-5,
    max_area_ratio: float = 0.08,
) -> Segmentation:
    """Pisahkan benih dari latar, lalu pisahkan benih yang saling menempel.

    Protokol memotret mensyaratkan latar polos yang kontras. Alih-alih
    mengunci satu ruang warna, kanal dengan pemisahan Otsu paling tegas
    dipilih otomatis - supaya benih terang di latar gelap dan benih gelap di
    latar terang sama-sama tertangani.
    """
    h, w = img.shape[:2]
    total = h * w

    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    candidates = {
        "saturation": hsv[:, :, 1],
        "value_inv": 255 - hsv[:, :, 2],
        "value": hsv[:, :, 2],
        "lab_a": lab[:, :, 1],
        "lab_b": lab[:, :, 2],
    }

    best_name, best_score, best_mask = "saturation", -2.0, None
    for name, ch in candidates.items():
        score, mask = _otsu_score(ch)
        # Buang kanal yang menandai hampir seluruh gambar sebagai objek.
        ratio = float((mask > 0).mean())
        if ratio > 0.75 or ratio < 0.005:
            continue
        if score > best_score:
            best_name, best_score, best_mask = name, score, mask
    if best_mask is None:
        _, best_mask = _otsu_score(candidates["saturation"])
        best_name = "saturation"

    mask = best_mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    # --- pisahkan benih yang bersentuhan: distance transform + watershed ---
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    if dist.max() > 0:
        _, sure_fg = cv2.threshold(dist, 0.45 * dist.max(), 255, 0)
    else:
        sure_fg = np.zeros_like(mask)
    sure_fg = sure_fg.astype(np.uint8)
    sure_bg = cv2.dilate(mask, kernel, iterations=3)
    unknown = cv2.subtract(sure_bg, sure_fg)

    n_markers, markers = cv2.connectedComponents(sure_fg)
    markers = markers + 1
    markers[unknown > 0] = 0
    markers = cv2.watershed(img.copy(), markers)

    naive_count = cv2.connectedComponents(mask)[0] - 1

    # --- saring komponen berdasarkan luas dan sentuhan tepi ----------------
    out = np.zeros((h, w), dtype=np.int32)
    min_area, max_area = min_area_ratio * total, max_area_ratio * total
    border_removed = 0
    next_label = 1
    for lbl in range(2, n_markers + 2):
        comp = (markers == lbl)
        area = int(comp.sum())
        if area < min_area or area > max_area:
            continue
        ys, xs = np.nonzero(comp)
        if ys.size == 0:
            continue
        # Benih yang terpotong tepi foto tidak boleh ikut menghitung ukuran.
        if ys.min() == 0 or xs.min() == 0 or ys.max() == h - 1 or xs.max() == w - 1:
            border_removed += 1
            continue
        out[comp] = next_label
        next_label += 1

    count = next_label - 1
    return Segmentation(
        labels=out,
        count=count,
        foreground_ratio=float((out > 0).mean()),
        channel_used=best_name,
        border_removed=border_removed,
        watershed_splits=max(0, count - naive_count),
    )


def annotate(img: np.ndarray, seg: Segmentation,
             flags: dict[int, bool] | None = None) -> np.ndarray:
    """Gambar kontur tiap benih di atas foto asli (temuan W-08).

    Hijau = benih normal, jingga = ditandai cacat. Penilaian yang tidak bisa
    ditunjukkan dasarnya tidak bisa dibantah, dan karena itu tidak bisa
    dipercaya.
    """
    flags = flags or {}
    canvas = img.copy()
    for lbl in range(1, seg.count + 1):
        comp = (seg.labels == lbl).astype(np.uint8)
        contours, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL,
                                       cv2.CHAIN_APPROX_SIMPLE)
        color = (0, 140, 255) if flags.get(lbl) else (60, 200, 90)
        cv2.drawContours(canvas, contours, -1, color, 2)
    return canvas

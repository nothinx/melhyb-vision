"""Pra-pemrosesan citra dan gerbang kualitas.

Dua tanggung jawab:
1. Menolak citra yang tidak layak dianalisis, dengan alasan yang bisa
   ditindaklanjuti pengguna (temuan W-12).
2. Menetapkan skala piksel->milimeter lewat penanda ArUco, sehingga ukuran
   benih dilaporkan dalam satuan nyata dan bukan piksel yang tak berarti.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import cv2
import numpy as np

from ..config import settings


@dataclass
class GateIssue:
    code: str
    message: str
    value: float
    threshold: float


@dataclass
class ImageGate:
    passed: bool
    issues: list[GateIssue] = field(default_factory=list)
    sharpness: float = 0.0
    mean_luma: float = 0.0
    clipped_fraction: float = 0.0
    blown: float = 0.0
    dynamic_range: float = 0.0
    width: int = 0
    height: int = 0

    def as_dict(self) -> dict:
        return {
            "lolos": self.passed,
            "masalah": [
                {"kode": i.code, "pesan": i.message, "nilai": round(i.value, 2),
                 "ambang": i.threshold}
                for i in self.issues
            ],
            "ketajaman": round(self.sharpness, 2),
            "luminans_rata2": round(self.mean_luma, 2),
            "fraksi_terpotong": round(self.clipped_fraction, 4),
            "fraksi_jenuh": round(self.blown, 4),
            "rentang_dinamis": round(self.dynamic_range, 2),
            "lebar_px": self.width,
            "tinggi_px": self.height,
        }


def decode_image(data: bytes) -> np.ndarray:
    buf = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Berkas tidak dapat dibaca sebagai citra.")
    return img


def check_image(img: np.ndarray) -> ImageGate:
    """Gerbang kualitas citra. Menolak sebelum, bukan sesudah, menghitung skor."""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    lap = np.abs(cv2.Laplacian(gray, cv2.CV_64F))
    k = max(1, int(lap.size * 0.005))
    sharpness = float(np.partition(lap.ravel(), -k)[-k:].mean())
    mean_luma = float(gray.mean())
    clipped = float(((gray < 5) | (gray > 250)).mean())
    blown = float((gray > 250).mean())
    p1, p99 = np.percentile(gray, [1, 99])
    dyn = float(p99 - p1)

    issues: list[GateIssue] = []
    if min(h, w) < settings.min_side_px:
        issues.append(GateIssue(
            "resolusi_rendah",
            f"Resolusi terlalu kecil ({w}x{h}). Foto ulang dengan sisi terpendek "
            f"minimal {settings.min_side_px} piksel.",
            float(min(h, w)), settings.min_side_px))
    if sharpness < settings.min_sharpness:
        issues.append(GateIssue(
            "buram",
            "Foto buram. Tahan kamera lebih stabil, ketuk layar untuk mengunci "
            "fokus pada benih, lalu foto ulang.",
            sharpness, settings.min_sharpness))
    if mean_luma < settings.min_mean_luma:
        issues.append(GateIssue(
            "terlalu_gelap",
            "Foto terlalu gelap. Tambah cahaya atau pindah ke tempat lebih terang.",
            mean_luma, settings.min_mean_luma))
    if blown > settings.max_blown_fraction:
        issues.append(GateIssue(
            "terlalu_terang",
            "Terlalu banyak bagian foto yang putih jenuh sehingga detail benih "
            "hilang. Hindari cahaya matahari langsung dan pantulan.",
            blown, settings.max_blown_fraction))
    if dyn < settings.min_dynamic_range:
        issues.append(GateIssue(
            "kontras_rendah",
            "Benih kurang kontras terhadap latar. Gunakan alas polos yang "
            "warnanya jelas berbeda dari warna benih.",
            dyn, settings.min_dynamic_range))

    return ImageGate(
        passed=not issues, issues=issues, sharpness=sharpness,
        mean_luma=mean_luma, clipped_fraction=clipped, blown=blown,
        dynamic_range=dyn, width=w, height=h,
    )


def gray_world_balance(img: np.ndarray) -> np.ndarray:
    """Koreksi warna gray-world sederhana.

    Tanpa ini, warna benih yang sama akan terbaca berbeda di bawah lampu
    neon dan cahaya matahari, dan indeks warna menjadi tidak berarti.
    """
    result = img.astype(np.float32)
    means = result.reshape(-1, 3).mean(axis=0)
    target = means.mean()
    scale = np.where(means > 1e-6, target / np.maximum(means, 1e-6), 1.0)
    result *= scale
    return np.clip(result, 0, 255).astype(np.uint8)


ARUCO_DICT = cv2.aruco.DICT_4X4_50


@dataclass
class ScaleInfo:
    px_per_mm: float | None
    source: str          # "aruco" | "tidak_ada"
    marker_mm: float | None = None

    @property
    def absolute(self) -> bool:
        return self.px_per_mm is not None

    def as_dict(self) -> dict:
        return {
            "px_per_mm": round(self.px_per_mm, 4) if self.px_per_mm else None,
            "sumber": self.source,
            "sisi_penanda_mm": self.marker_mm,
            "ukuran_absolut": self.absolute,
        }


def detect_scale(img: np.ndarray, marker_mm: float = 20.0) -> ScaleInfo:
    """Cari penanda ArUco 4x4 untuk menetapkan skala px->mm.

    Kalau penanda tidak ada, ukuran hanya dilaporkan relatif dan seluruh
    parameter yang bergantung ukuran absolut ditandai tidak tersedia. Itu
    disengaja: lebih baik kosong daripada angka yang tidak bisa dibandingkan
    antar foto.
    """
    try:
        aruco_dict = cv2.aruco.getPredefinedDictionary(ARUCO_DICT)
        params = cv2.aruco.DetectorParameters()
        detector = cv2.aruco.ArucoDetector(aruco_dict, params)
        corners, ids, _ = detector.detectMarkers(img)
    except Exception:
        return ScaleInfo(None, "tidak_ada")

    if ids is None or len(corners) == 0:
        return ScaleInfo(None, "tidak_ada")

    sides: list[float] = []
    for c in corners:
        pts = c.reshape(4, 2)
        for i in range(4):
            sides.append(float(np.linalg.norm(pts[i] - pts[(i + 1) % 4])))
    px = float(np.median(sides))
    if px <= 1:
        return ScaleInfo(None, "tidak_ada")
    return ScaleInfo(px / marker_mm, "aruco", marker_mm)

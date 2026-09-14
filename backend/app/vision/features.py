"""Morfometrik per benih dan agregasi statistik lot.

Semua yang keluar dari modul ini adalah besaran yang BENAR-BENAR TERUKUR
dari citra. Tidak ada satu pun angka di sini yang merupakan tebakan tentang
perilaku benih setelah ditanam - itu urusan modul kalibrasi.
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass

import cv2
import numpy as np
from skimage.feature import graycomatrix, graycoprops

from .preprocess import ScaleInfo
from .segment import Segmentation


@dataclass
class SeedFeature:
    label: int
    area_px: float
    perimeter_px: float
    major_px: float
    minor_px: float
    aspect_ratio: float          # panjang / lebar
    circularity: float           # 4*pi*A / P^2  (1.0 = lingkaran sempurna)
    solidity: float              # A / A_convex_hull (1.0 = tanpa lekuk/pecah)
    extent: float                # A / A_bounding_box
    eq_diameter_px: float
    L: float
    a: float
    b: float
    color_std: float
    glcm_homogeneity: float
    glcm_contrast: float
    length_mm: float | None = None
    width_mm: float | None = None
    area_mm2: float | None = None


def _glcm(patch_gray: np.ndarray) -> tuple[float, float]:
    if patch_gray.size < 25:
        return 0.0, 0.0
    q = (patch_gray // 8).astype(np.uint8)  # 32 level, cukup untuk tekstur benih
    m = graycomatrix(q, distances=[1], angles=[0, np.pi / 4, np.pi / 2,
                                              3 * np.pi / 4],
                     levels=32, symmetric=True, normed=True)
    return (float(graycoprops(m, "homogeneity").mean()),
            float(graycoprops(m, "contrast").mean()))


def extract_seed_features(img: np.ndarray, seg: Segmentation,
                          scale: ScaleInfo) -> list[SeedFeature]:
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    # OpenCV menyimpan Lab 8-bit terskala; kembalikan ke rentang CIE.
    lab[:, :, 0] *= 100.0 / 255.0
    lab[:, :, 1] -= 128.0
    lab[:, :, 2] -= 128.0
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    feats: list[SeedFeature] = []
    for lbl in range(1, seg.count + 1):
        comp = (seg.labels == lbl).astype(np.uint8)
        area = float(comp.sum())
        if area < 8:
            continue
        contours, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL,
                                       cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        cnt = max(contours, key=cv2.contourArea)
        perim = float(cv2.arcLength(cnt, True)) or 1.0
        hull_area = float(cv2.contourArea(cv2.convexHull(cnt))) or area
        x, y, bw, bh = cv2.boundingRect(cnt)

        if len(cnt) >= 5:
            (_, _), (d1, d2), _ = cv2.fitEllipse(cnt)
            major, minor = max(d1, d2), max(min(d1, d2), 1e-6)
        else:
            major, minor = float(max(bw, bh)), float(max(min(bw, bh), 1))

        ys, xs = np.nonzero(comp)
        pix = lab[ys, xs]
        gpatch = gray[y:y + bh, x:x + bw]
        homo, contrast = _glcm(gpatch)

        f = SeedFeature(
            label=lbl,
            area_px=area,
            perimeter_px=perim,
            major_px=float(major),
            minor_px=float(minor),
            aspect_ratio=float(major / minor),
            circularity=float(min(4 * math.pi * area / (perim ** 2), 1.0)),
            solidity=float(min(area / hull_area, 1.0)),
            extent=float(area / max(bw * bh, 1)),
            eq_diameter_px=float(math.sqrt(4 * area / math.pi)),
            L=float(pix[:, 0].mean()),
            a=float(pix[:, 1].mean()),
            b=float(pix[:, 2].mean()),
            color_std=float(pix[:, 0].std()),
            glcm_homogeneity=homo,
            glcm_contrast=contrast,
        )
        if scale.absolute and scale.px_per_mm:
            k = scale.px_per_mm
            f.length_mm = round(major / k, 3)
            f.width_mm = round(minor / k, 3)
            f.area_mm2 = round(area / (k * k), 3)
        feats.append(f)
    return feats


@dataclass
class LotFeatures:
    n_seeds: int
    area_mean: float
    area_cv: float               # koefisien variasi luas -> dasar keseragaman
    length_mean_mm: float | None
    length_cv: float
    width_mean_mm: float | None
    aspect_mean: float
    aspect_cv: float
    circularity_mean: float
    solidity_mean: float
    solidity_p10: float          # persentil 10: seberapa buruk benih terburuk
    L_mean: float
    a_mean: float
    b_mean: float
    delta_e_mean: float          # sebaran warna antar benih terhadap sentroid
    glcm_homogeneity_mean: float
    glcm_contrast_mean: float
    defect_fraction: float
    absolute_scale: bool

    def vector(self) -> list[float]:
        """Vektor fitur untuk model kalibrasi. Urutan dijaga tetap."""
        return [
            self.area_mean, self.area_cv, self.length_cv, self.aspect_mean,
            self.aspect_cv, self.circularity_mean, self.solidity_mean,
            self.solidity_p10, self.L_mean, self.a_mean, self.b_mean,
            self.delta_e_mean, self.glcm_homogeneity_mean,
            self.glcm_contrast_mean, self.defect_fraction,
        ]

    @staticmethod
    def vector_names() -> list[str]:
        return [
            "area_mean", "area_cv", "length_cv", "aspect_mean", "aspect_cv",
            "circularity_mean", "solidity_mean", "solidity_p10", "L_mean",
            "a_mean", "b_mean", "delta_e_mean", "glcm_homogeneity_mean",
            "glcm_contrast_mean", "defect_fraction",
        ]

    def as_dict(self) -> dict:
        return asdict(self)


def _cv(values: np.ndarray) -> float:
    m = float(values.mean())
    return float(values.std() / m) if m > 1e-9 else 0.0


def aggregate_lot(feats: list[SeedFeature], defect_solidity: float,
                  scale: ScaleInfo) -> LotFeatures:
    if not feats:
        raise ValueError("Tidak ada benih terdeteksi untuk diagregasi.")

    area = np.array([f.area_px for f in feats])
    major = np.array([f.major_px for f in feats])
    minor = np.array([f.minor_px for f in feats])
    aspect = np.array([f.aspect_ratio for f in feats])
    circ = np.array([f.circularity for f in feats])
    sol = np.array([f.solidity for f in feats])
    Ls = np.array([f.L for f in feats])
    as_ = np.array([f.a for f in feats])
    bs = np.array([f.b for f in feats])
    homo = np.array([f.glcm_homogeneity for f in feats])
    contr = np.array([f.glcm_contrast for f in feats])

    centroid = np.array([Ls.mean(), as_.mean(), bs.mean()])
    stack = np.stack([Ls, as_, bs], axis=1)
    delta_e = float(np.linalg.norm(stack - centroid, axis=1).mean())

    k = scale.px_per_mm if scale.absolute else None
    return LotFeatures(
        n_seeds=len(feats),
        area_mean=float(area.mean()),
        area_cv=_cv(area),
        length_mean_mm=round(float(major.mean()) / k, 3) if k else None,
        length_cv=_cv(major),
        width_mean_mm=round(float(minor.mean()) / k, 3) if k else None,
        aspect_mean=float(aspect.mean()),
        aspect_cv=_cv(aspect),
        circularity_mean=float(circ.mean()),
        solidity_mean=float(sol.mean()),
        solidity_p10=float(np.percentile(sol, 10)),
        L_mean=float(Ls.mean()),
        a_mean=float(as_.mean()),
        b_mean=float(bs.mean()),
        delta_e_mean=delta_e,
        glcm_homogeneity_mean=float(homo.mean()),
        glcm_contrast_mean=float(contr.mean()),
        defect_fraction=float((sol < defect_solidity).mean()),
        absolute_scale=scale.absolute,
    )


def defect_flags(feats: list[SeedFeature], threshold: float) -> dict[int, bool]:
    return {f.label: f.solidity < threshold for f in feats}

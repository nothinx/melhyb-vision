"""Indeks mutu fisik: besaran terukur yang dipetakan ke skala 0-100.

Setiap indeks di sini punya definisi tertutup dan dapat dihitung ulang oleh
siapa pun dari citra yang sama. Pemetaan ke 0-100 memakai ambang eksplisit
dari `config.py`, dan setiap indeks membawa penjelasan asal-usulnya supaya
bisa ditampilkan di antarmuka (temuan W-08) dan dilampirkan di proposal.
"""
from __future__ import annotations

from dataclasses import dataclass

from ..config import settings
from ..vision.features import LotFeatures


@dataclass
class Index:
    key: str
    label: str
    value: float                 # 0-100
    basis: str                   # besaran mentah yang mendasarinya
    raw: float
    explanation: str

    def as_dict(self) -> dict:
        return {
            "kunci": self.key, "label": self.label, "nilai": round(self.value, 1),
            "dasar": self.basis, "nilai_mentah": round(self.raw, 4),
            "penjelasan": self.explanation,
        }


def _linmap(x: float, worst: float, best: float) -> float:
    """Petakan x ke 0-100 secara linier, dijepit di kedua ujung."""
    if abs(best - worst) < 1e-12:
        return 0.0
    t = (x - worst) / (best - worst)
    return float(max(0.0, min(1.0, t)) * 100.0)


def compute_indices(lot: LotFeatures) -> list[Index]:
    s = settings
    idx: list[Index] = []

    idx.append(Index(
        "keseragaman_ukuran", "Keseragaman Ukuran",
        _linmap(lot.area_cv, s.cv_area_worst, 0.0),
        "koefisien variasi luas proyeksi antar benih", lot.area_cv,
        f"CV luas = {lot.area_cv:.3f} dari {lot.n_seeds} benih. CV 0 berarti "
        f"seluruh benih berukuran sama (100); CV {s.cv_area_worst} atau lebih "
        f"dinilai 0.",
    ))

    idx.append(Index(
        "keseragaman_warna", "Keseragaman Warna",
        _linmap(lot.delta_e_mean, s.delta_e_worst, 0.0),
        "rerata jarak CIE76 tiap benih ke warna rata-rata lot",
        lot.delta_e_mean,
        f"DeltaE rata-rata = {lot.delta_e_mean:.2f}. Semakin kecil, semakin "
        f"seragam warnanya. DeltaE {s.delta_e_worst} atau lebih dinilai 0.",
    ))

    idx.append(Index(
        "keutuhan_fisik", "Keutuhan Fisik",
        _linmap(lot.solidity_mean, s.solidity_worst, s.solidity_best),
        "rerata solidity (luas benih / luas convex hull)", lot.solidity_mean,
        f"Solidity rata-rata = {lot.solidity_mean:.3f}. Benih utuh mendekati "
        f"{s.solidity_best}; benih pecah atau keriput turun karena lekukannya "
        f"memperbesar convex hull.",
    ))

    idx.append(Index(
        "kebersihan_lot", "Bebas Cacat",
        (1.0 - lot.defect_fraction) * 100.0,
        "proporsi benih dengan solidity di bawah ambang cacat",
        lot.defect_fraction,
        f"{lot.defect_fraction * 100:.1f}% benih memiliki solidity di bawah "
        f"{s.defect_solidity_threshold} dan ditandai cacat fisik.",
    ))

    idx.append(Index(
        "tekstur_permukaan", "Tekstur Permukaan",
        _linmap(lot.glcm_homogeneity_mean, 0.20, 0.95),
        "homogenitas GLCM rata-rata", lot.glcm_homogeneity_mean,
        f"Homogenitas GLCM = {lot.glcm_homogeneity_mean:.3f}. Permukaan halus "
        f"dan bersih memberi nilai tinggi; permukaan berkerut atau berjamur "
        f"menurunkannya.",
    ))
    return idx


# Bobot indeks fisik. Dijadikan konstanta bernama - bukan rata-rata diam-diam
# seperti pada prototipe lama (temuan W-01).
PHYSICAL_WEIGHTS: dict[str, float] = {
    "keutuhan_fisik": 0.30,
    "kebersihan_lot": 0.25,
    "keseragaman_ukuran": 0.20,
    "keseragaman_warna": 0.15,
    "tekstur_permukaan": 0.10,
}


def physical_quality_index(indices: list[Index]) -> float:
    """Indeks Mutu Fisik (IMF): ringkasan berbobot dari indeks terukur saja."""
    by_key = {i.key: i.value for i in indices}
    total_w = sum(w for k, w in PHYSICAL_WEIGHTS.items() if k in by_key)
    if total_w <= 0:
        return 0.0
    return sum(by_key[k] * w for k, w in PHYSICAL_WEIGHTS.items()
               if k in by_key) / total_w

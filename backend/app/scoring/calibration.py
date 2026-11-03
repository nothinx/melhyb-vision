"""Kalibrasi citra -> hasil UKDdP.

Inilah jembatan yang hilang di proposal lama (temuan P-03 dan P-04): sebuah
foto tidak mengandung daya berkecambah. Yang bisa dilakukan adalah melatih
model regresi dari pasangan (morfometrik citra, hasil UKDdP terukur), lalu
melaporkan seberapa jauh model itu meleset.

Aturan main modul ini:
- Model hanya boleh dipakai kalau jumlah sampel >= ambang DAN R^2 hasil
  validasi silang >= ambang. Kalau tidak, tidak ada prediksi yang keluar.
- Setiap prediksi selalu disertai selang, dihitung dari RMSE validasi silang.
- Metrik validasi ikut disimpan supaya bisa ditampilkan di antarmuka dan
  disalin langsung ke dalam laporan.
"""
from __future__ import annotations

import io
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.linear_model import RidgeCV
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .. import berkas
from ..config import settings
from ..vision.features import LotFeatures

# Batas jarak baku terhadap data latih sebelum sebuah prediksi dianggap
# ekstrapolasi dan dikeluarkan dari putusan.
MAX_Z_EXTRAPOLATION = 4.0

TARGETS = {
    "daya_berkecambah": "Daya Berkecambah (%)",
    "kecepatan_tumbuh": "Kecepatan Tumbuh (%/etmal)",
    "keserempakan_tumbuh": "Keserempakan Tumbuh (%)",
}


@dataclass
class CalibrationReport:
    komoditas: str
    target: str
    n_samples: int
    n_features: int
    cv_folds: int
    mae: float
    rmse: float
    r2: float
    usable: bool
    reason: str
    trained_at: str

    def as_dict(self) -> dict:
        d = asdict(self)
        d["label_target"] = TARGETS.get(self.target, self.target)
        return d


def _model_path(komoditas: str, target: str) -> str:
    return f"kalibrasi/{komoditas.lower()}__{target}.joblib"


def _report_path(komoditas: str, target: str) -> str:
    return f"kalibrasi/{komoditas.lower()}__{target}.json"


def _simpan_laporan(report: CalibrationReport) -> None:
    berkas.simpan(_report_path(report.komoditas, report.target),
                  json.dumps(report.as_dict(), indent=2).encode("utf-8"), "application/json")


def train(komoditas: str, target: str, X: list[list[float]],
          y: list[float]) -> CalibrationReport:
    """Latih dan validasi silang satu model, lalu simpan bila layak."""
    Xa, ya = np.asarray(X, dtype=float), np.asarray(y, dtype=float)
    n = len(ya)
    now = datetime.now(timezone.utc).isoformat()

    if n < settings.min_calibration_samples:
        report = CalibrationReport(
            komoditas, target, n, Xa.shape[1] if n else 0, 0,
            float("nan"), float("nan"), float("nan"), False,
            (f"Tersedia {n} lot dengan foto dan hasil uji perkecambahan. "
             f"Model memerlukan minimal {settings.min_calibration_samples} "
             f"lot sebelum dapat memberikan estimasi."),
            now)
        _simpan_laporan(report)
        return report

    folds = min(5, n)
    pipe = Pipeline([
        ("scale", StandardScaler()),
        ("ridge", RidgeCV(alphas=np.logspace(-3, 3, 25))),
    ])
    cv = KFold(n_splits=folds, shuffle=True, random_state=42)
    pred = cross_val_predict(pipe, Xa, ya, cv=cv)

    mae = float(mean_absolute_error(ya, pred))
    rmse = float(np.sqrt(np.mean((ya - pred) ** 2)))
    r2 = float(r2_score(ya, pred))
    usable = r2 >= settings.min_calibration_r2

    reason = (
        f"Validasi silang {folds}-lipat pada {n} sampel: MAE {mae:.2f}, "
        f"RMSE {rmse:.2f}, R2 {r2:.3f}."
    )
    if not usable:
        reason += (f" R2 masih di bawah ambang {settings.min_calibration_r2}, "
                   f"jadi model belum dipakai untuk memprediksi.")

    pipe.fit(Xa, ya)
    report = CalibrationReport(komoditas, target, n, Xa.shape[1], folds,
                               mae, rmse, r2, usable, reason, now)
    buf = io.BytesIO()
    joblib.dump({
        "pipeline": pipe, "rmse": rmse,
        "feature_mean": Xa.mean(axis=0), "feature_std": Xa.std(axis=0),
    }, buf)
    berkas.simpan(_model_path(komoditas, target), buf.getvalue())
    _simpan_laporan(report)
    return report


def load_report(komoditas: str, target: str) -> dict | None:
    b = berkas.baca(_report_path(komoditas, target))
    return json.loads(b.isi) if b else None


@dataclass
class Estimate:
    target: str
    label: str
    value: float
    lower: float
    upper: float
    mae: float
    r2: float
    n_samples: int
    out_of_domain: bool = False
    max_z: float = 0.0

    @property
    def usable(self) -> bool:
        """Estimasi di luar rentang data latih tidak boleh ikut menentukan
        putusan - itu ekstrapolasi, bukan prediksi."""
        return not self.out_of_domain

    def as_dict(self) -> dict:
        catatan = ("Nilai ini merupakan estimasi model dari foto, bukan hasil "
                   "uji perkecambahan. Keputusan resmi tetap memerlukan "
                   "pengujian benih.")
        if self.out_of_domain:
            catatan = (
                f"Ciri lot ini berada di luar rentang data kalibrasi "
                f"(z maksimum {self.max_z:.1f}). Estimasi tidak dipakai untuk "
                f"menentukan kelas mutu. Tambahkan lot serupa ke data "
                f"kalibrasi, atau lakukan uji perkecambahan.")
        return {
            "target": self.target, "label": self.label,
            "nilai": round(self.value, 1),
            "batas_bawah": round(self.lower, 1),
            "batas_atas": round(self.upper, 1),
            "mae_validasi": round(self.mae, 2),
            "r2_validasi": round(self.r2, 3),
            "n_sampel_kalibrasi": self.n_samples,
            "jenis": "estimasi",
            "di_luar_rentang_kalibrasi": self.out_of_domain,
            "z_maksimum": round(self.max_z, 2),
            "catatan": catatan,
        }


def predict(komoditas: str, target: str, lot: LotFeatures) -> Estimate | None:
    """Kembalikan estimasi, atau None kalau model belum layak pakai."""
    report = load_report(komoditas, target)
    if not report or not report.get("usable"):
        return None
    b = berkas.baca(_model_path(komoditas, target))
    if b is None:
        return None
    # joblib = pickle: hanya pernah dimuat dari berkas yang ditulis train().
    bundle = joblib.load(io.BytesIO(b.isi))
    pipe, rmse = bundle["pipeline"], bundle["rmse"]
    x = np.asarray([lot.vector()], dtype=float)

    # Penjaga ekstrapolasi: seberapa jauh lot ini dari data yang pernah
    # dipakai melatih model.
    mean, std = bundle["feature_mean"], bundle["feature_std"]
    z = np.abs((x[0] - mean) / np.where(std > 1e-9, std, 1.0))
    max_z = float(z.max())

    raw = float(pipe.predict(x)[0])
    value = max(0.0, min(100.0, raw))          # jepit dulu, baru bentuk selang
    half = 1.96 * float(rmse)
    return Estimate(
        target=target, label=TARGETS.get(target, target),
        value=value,
        lower=max(0.0, value - half), upper=min(100.0, value + half),
        mae=report["mae"], r2=report["r2"], n_samples=report["n_samples"],
        out_of_domain=max_z > MAX_Z_EXTRAPOLATION, max_z=max_z,
    )

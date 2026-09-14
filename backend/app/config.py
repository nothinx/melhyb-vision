"""Konfigurasi terpusat.

Semua ambang batas yang mempengaruhi hasil penilaian dikumpulkan di sini,
bukan tersebar di dalam kode, supaya bisa dilaporkan apa adanya di dalam
proposal dan bisa diaudit ulang oleh penguji.
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "SIGMA"
    database_url: str = f"sqlite:///{BASE_DIR / 'sigma.db'}"
    storage_dir: Path = BASE_DIR / "storage"
    model_dir: Path = BASE_DIR / "models"

    # --- Gerbang kualitas citra (W-12) -------------------------------------
    min_side_px: int = 640
    # Ketajaman diukur dari rerata 0,5% respons Laplacian terkuat, bukan dari
    # varians seluruh citra: foto dengan sedikit benih di atas latar polos
    # punya varians rendah walaupun fokusnya tajam.
    min_sharpness: float = 35.0
    max_clipped_fraction: float = 0.08   # piksel <5 atau >250
    min_mean_luma: float = 40.0
    # Bidang putih (kertas, nampan) wajar membuat luminans rata-rata tinggi,
    # jadi kelebihan cahaya dideteksi lewat fraksi piksel jenuh dan rentang
    # dinamis, bukan lewat batas atas rata-rata.
    max_blown_fraction: float = 0.15     # piksel >250 saja
    min_dynamic_range: float = 45.0      # persentil 99 dikurangi persentil 1
    min_seeds_detected: int = 15         # lot terlalu sedikit -> statistik tidak stabil
    max_seeds_detected: int = 2000

    # --- Normalisasi indeks terukur ----------------------------------------
    # CV luas proyeksi yang dianggap "sangat tidak seragam" (skor 0).
    cv_area_worst: float = 0.45
    # Delta-E CIE76 rata-rata terhadap sentroid lot yang dianggap skor 0.
    delta_e_worst: float = 22.0
    # Solidity: 0.98 dianggap utuh sempurna, 0.85 dianggap rusak berat.
    solidity_best: float = 0.98
    solidity_worst: float = 0.85
    # Ambang solidity untuk menandai satu benih sebagai cacat fisik.
    defect_solidity_threshold: float = 0.90

    # --- Ambang edar yang diisi operator -----------------------------------
    # Selama tabel resmi belum dibaca dari dokumen primer, sistem TIDAK memakai
    # angka apa pun. Kalau kalian sudah membuka Kepmentan/Permentan yang benar,
    # isi di sini dan angkanya langsung dipakai - dengan label "diisi operator",
    # bukan menyamar sebagai angka yang terverifikasi.
    #
    #   SIGMA_AMBANG_OVERRIDE="sorgum:80,melon:75"
    ambang_override: str = ""

    def ambang_operator(self) -> dict[str, float]:
        hasil: dict[str, float] = {}
        for bagian in self.ambang_override.split(","):
            bagian = bagian.strip()
            if not bagian or ":" not in bagian:
                continue
            slug, _, nilai = bagian.partition(":")
            try:
                hasil[slug.strip().lower()] = float(nilai)
            except ValueError:
                continue
        return hasil

    # --- Kalibrasi (Jalur A) -----------------------------------------------
    # Jumlah minimum pasangan (citra, hasil UKDdP) sebelum model boleh dipakai.
    min_calibration_samples: int = 30
    # R^2 hasil validasi silang minimum sebelum model boleh menyajikan prediksi.
    min_calibration_r2: float = 0.30

    model_config = SettingsConfigDict(env_prefix="SIGMA_", env_file=".env",
                                      extra="ignore")


settings = Settings()
settings.storage_dir.mkdir(parents=True, exist_ok=True)
settings.model_dir.mkdir(parents=True, exist_ok=True)

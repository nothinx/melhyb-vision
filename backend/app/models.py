"""Skema basis data.

Bab 3.3 proposal menyebut tabel batch, hasil uji, histori, dan pengguna yang
"saling terhubung melalui relasi" - tetapi tidak pernah menggambarkannya
(temuan P-10). Berkas ini adalah wujud nyata skema itu; diagram ERD di
dokumen bisa diturunkan langsung dari sini.
"""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlmodel import JSON, Column, Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Komoditas(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    nama: str
    nama_latin: str = ""
    min_daya_berkecambah: float = 80.0
    sumber_ambang: str = "PLACEHOLDER - isi nomor SNI/Permentan"


class Varietas(SQLModel, table=True):
    """Basis data varietas yang dijanjikan proposal tapi absen di prototipe
    lama (temuan W-03)."""
    id: int | None = Field(default=None, primary_key=True)
    komoditas_id: int = Field(foreign_key="komoditas.id", index=True)
    nama: str = Field(index=True)
    pemulia: str = ""
    no_pendaftaran: str = ""
    deskripsi: str = ""
    # Referensi morfologi untuk pembanding; diisi dari pengukuran sendiri.
    ref_panjang_mm: float | None = None
    ref_lebar_mm: float | None = None
    ref_L: float | None = None
    ref_a: float | None = None
    ref_b: float | None = None
    dibuat_pada: datetime = Field(default_factory=_now)


class Batch(SQLModel, table=True):
    """Satu lot benih yang bisa ditelusuri dari foto sampai hasil UKDdP."""
    id: int | None = Field(default=None, primary_key=True)
    kode: str = Field(index=True, unique=True)
    komoditas_id: int = Field(foreign_key="komoditas.id", index=True)
    varietas_id: int | None = Field(default=None, foreign_key="varietas.id")
    produsen: str = ""
    no_lot_produsen: str = ""
    tanggal_panen: date | None = None
    catatan: str = ""
    dibuat_pada: datetime = Field(default_factory=_now)


class Analisis(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    batch_id: int | None = Field(default=None, foreign_key="batch.id", index=True)
    komoditas_slug: str = Field(index=True)
    varietas_id: int | None = Field(default=None, foreign_key="varietas.id")
    berkas_citra: str
    berkas_anotasi: str
    n_benih: int = 0
    indeks_mutu_fisik: float = 0.0
    skor_akhir: float | None = None
    kelas: str = ""
    gerbang: dict = Field(default_factory=dict, sa_column=Column(JSON))
    skala: dict = Field(default_factory=dict, sa_column=Column(JSON))
    fitur_lot: dict = Field(default_factory=dict, sa_column=Column(JSON))
    indeks: list = Field(default_factory=list, sa_column=Column(JSON))
    estimasi: list = Field(default_factory=list, sa_column=Column(JSON))
    putusan: dict = Field(default_factory=dict, sa_column=Column(JSON))
    dibuat_pada: datetime = Field(default_factory=_now, index=True)


class UjiUKDdP(SQLModel, table=True):
    """Hasil uji kertas digulung dalam plastik - satu-satunya sumber
    kebenaran untuk daya berkecambah. Inilah label yang melatih model."""
    id: int | None = Field(default=None, primary_key=True)
    batch_id: int = Field(foreign_key="batch.id", index=True)
    analisis_id: int | None = Field(default=None, foreign_key="analisis.id")
    tanggal_tanam: date
    tanggal_hitung_1: date | None = None
    tanggal_hitung_2: date | None = None
    jumlah_benih: int
    normal_hitungan_1: int = 0
    normal_hitungan_2: int = 0
    abnormal: int = 0
    tidak_tumbuh: int = 0
    # Diturunkan otomatis, tidak diketik manual.
    daya_berkecambah: float = 0.0
    kecepatan_tumbuh: float | None = None
    keserempakan_tumbuh: float | None = None
    operator: str = ""
    catatan: str = ""
    dibuat_pada: datetime = Field(default_factory=_now)


class ModelKalibrasi(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    komoditas_slug: str = Field(index=True)
    target: str = Field(index=True)
    n_sampel: int = 0
    mae: float | None = None
    rmse: float | None = None
    r2: float | None = None
    layak_pakai: bool = False
    keterangan: str = ""
    dilatih_pada: datetime = Field(default_factory=_now)

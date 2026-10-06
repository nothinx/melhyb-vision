"""Uji UKDdP dan pelatihan model kalibrasi.

Inilah loop yang membuat klaim "AI" bisa dipertanggungjawabkan:
foto lot -> tanam lot yang sama -> catat hasil UKDdP -> latih -> laporkan
seberapa meleset. Selama loop ini belum berjalan, aplikasi tidak mengeluarkan
angka daya berkecambah sama sekali.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..models import Analisis, Batch, ModelKalibrasi, UjiUKDdP
from ..db import get_session
from ..scoring import calibration
from ..services.ukddp import hitung

router = APIRouter(prefix="/api/kalibrasi", tags=["kalibrasi"])


class UKDdPInput(BaseModel):
    batch_id: int
    analisis_id: int | None = None
    tanggal_tanam: date
    tanggal_hitung_1: date | None = None
    tanggal_hitung_2: date | None = None
    jumlah_benih: int = Field(gt=0)
    normal_hitungan_1: int = Field(ge=0, default=0)
    normal_hitungan_2: int = Field(ge=0, default=0)
    abnormal: int = Field(ge=0, default=0)
    tidak_tumbuh: int = Field(ge=0, default=0)
    hitungan_harian: list[dict] | None = None
    operator: str = ""
    catatan: str = ""


@router.post("/ukddp", status_code=201)
def catat_ukddp(payload: UKDdPInput, s: Session = Depends(get_session)):
    if not s.get(Batch, payload.batch_id):
        raise HTTPException(404, "Batch tidak ditemukan.")
    try:
        hasil = hitung(
            payload.jumlah_benih, payload.normal_hitungan_1,
            payload.normal_hitungan_2, payload.abnormal, payload.tidak_tumbuh,
            payload.tanggal_tanam, payload.tanggal_hitung_1,
            payload.tanggal_hitung_2, payload.hitungan_harian,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    row = UjiUKDdP(
        batch_id=payload.batch_id, analisis_id=payload.analisis_id,
        tanggal_tanam=payload.tanggal_tanam,
        tanggal_hitung_1=payload.tanggal_hitung_1,
        tanggal_hitung_2=payload.tanggal_hitung_2,
        jumlah_benih=payload.jumlah_benih,
        normal_hitungan_1=payload.normal_hitungan_1,
        normal_hitungan_2=payload.normal_hitungan_2,
        abnormal=payload.abnormal, tidak_tumbuh=payload.tidak_tumbuh,
        daya_berkecambah=hasil.daya_berkecambah,
        kecepatan_tumbuh=hasil.kecepatan_tumbuh,
        keserempakan_tumbuh=hasil.keserempakan_tumbuh,
        operator=payload.operator, catatan=payload.catatan,
    )
    s.add(row); s.commit(); s.refresh(row)
    return {"uji": row, "metode_kecepatan": hasil.metode_kecepatan,
            "peringatan": hasil.peringatan}


def _pairs(s: Session, komoditas: str, target: str):
    """Kumpulkan pasangan (fitur citra, hasil UKDdP) untuk satu komoditas."""
    X, y = [], []
    uji_rows = s.exec(select(UjiUKDdP)).all()
    by_analisis = {u.analisis_id: u for u in uji_rows if u.analisis_id}
    by_batch: dict[int, UjiUKDdP] = {}
    for u in uji_rows:
        by_batch.setdefault(u.batch_id, u)

    from ..vision.features import LotFeatures
    names = LotFeatures.vector_names()

    for a in s.exec(select(Analisis)
                    .where(Analisis.komoditas_slug == komoditas.lower())).all():
        u = by_analisis.get(a.id) or (by_batch.get(a.batch_id)
                                      if a.batch_id else None)
        if not u:
            continue
        value = getattr(u, target, None)
        if value is None:
            continue
        f = a.fitur_lot or {}
        if not all(n in f and f[n] is not None for n in names):
            continue
        X.append([float(f[n]) for n in names])
        y.append(float(value))
    return X, y


@router.get("/status")
def status(s: Session = Depends(get_session)):
    """Apa yang sudah dan belum terkalibrasi - ditampilkan terbuka di UI."""
    out = []
    komoditas = {a.komoditas_slug for a in s.exec(select(Analisis)).all()}
    for slug in sorted(komoditas | {"melon"}):
        for target in calibration.TARGETS:
            X, _ = _pairs(s, slug, target)
            report = calibration.load_report(slug, target)
            out.append({
                "komoditas": slug, "target": target,
                "label_target": calibration.TARGETS[target],
                "sampel_tersedia": len(X),
                "laporan": report,
                "siap_pakai": bool(report and report.get("usable")),
            })
    return out


@router.post("/latih")
def latih(komoditas: str, target: str = "daya_berkecambah",
          s: Session = Depends(get_session)):
    if target not in calibration.TARGETS:
        raise HTTPException(400, f"Target tidak dikenal: {target}")
    X, y = _pairs(s, komoditas, target)
    if not X:
        raise HTTPException(
            400, "Belum ada pasangan (analisis citra, hasil UKDdP) untuk "
                 "komoditas ini. Catat hasil UKDdP pada batch yang fotonya "
                 "sudah dianalisis.")
    report = calibration.train(komoditas.lower(), target, X, y)

    row = s.exec(select(ModelKalibrasi)
                 .where(ModelKalibrasi.komoditas_slug == komoditas.lower())
                 .where(ModelKalibrasi.target == target)).first() \
        or ModelKalibrasi(komoditas_slug=komoditas.lower(), target=target)
    row.n_sampel = report.n_samples
    row.mae = None if report.mae != report.mae else report.mae   # NaN -> None
    row.rmse = None if report.rmse != report.rmse else report.rmse
    row.r2 = None if report.r2 != report.r2 else report.r2
    row.layak_pakai = report.usable
    row.keterangan = report.reason
    s.add(row); s.commit()
    return report.as_dict()

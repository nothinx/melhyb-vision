"""Batch benih: unit yang bisa ditelusuri dari foto sampai hasil UKDdP."""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..models import Analisis, Batch, Komoditas, UjiUKDdP

router = APIRouter(prefix="/api/batch", tags=["batch"])


@router.get("")
def daftar(s: Session = Depends(get_session)):
    return s.exec(select(Batch).order_by(Batch.dibuat_pada.desc())).all()


@router.post("", status_code=201)
def buat(payload: Batch, s: Session = Depends(get_session)):
    if not s.get(Komoditas, payload.komoditas_id):
        raise HTTPException(404, "Komoditas tidak ditemukan.")
    if s.exec(select(Batch).where(Batch.kode == payload.kode)).first():
        raise HTTPException(409, f"Kode batch '{payload.kode}' sudah dipakai.")
    payload.id = None
    s.add(payload); s.commit(); s.refresh(payload)
    return payload


@router.get("/{batch_id}")
def detail(batch_id: int, s: Session = Depends(get_session)):
    b = s.get(Batch, batch_id)
    if not b:
        raise HTTPException(404, "Batch tidak ditemukan.")
    return {
        "batch": b,
        "analisis": s.exec(select(Analisis)
                           .where(Analisis.batch_id == batch_id)
                           .order_by(Analisis.dibuat_pada.desc())).all(),
        "uji_ukddp": s.exec(select(UjiUKDdP)
                            .where(UjiUKDdP.batch_id == batch_id)).all(),
    }

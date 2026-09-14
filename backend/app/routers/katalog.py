"""Katalog komoditas dan varietas - basis data yang dijanjikan proposal."""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..models import Komoditas, Varietas

router = APIRouter(prefix="/api/katalog", tags=["katalog"])


@router.get("/komoditas")
def daftar_komoditas(s: Session = Depends(get_session)):
    return s.exec(select(Komoditas).order_by(Komoditas.nama)).all()


@router.post("/komoditas", status_code=201)
def tambah_komoditas(payload: Komoditas, s: Session = Depends(get_session)):
    if s.exec(select(Komoditas).where(Komoditas.slug == payload.slug)).first():
        raise HTTPException(409, f"Komoditas '{payload.slug}' sudah ada.")
    payload.id = None
    s.add(payload); s.commit(); s.refresh(payload)
    return payload


@router.get("/varietas")
def daftar_varietas(komoditas_id: int | None = None,
                    s: Session = Depends(get_session)):
    q = select(Varietas)
    if komoditas_id:
        q = q.where(Varietas.komoditas_id == komoditas_id)
    return s.exec(q.order_by(Varietas.nama)).all()


@router.post("/varietas", status_code=201)
def tambah_varietas(payload: Varietas, s: Session = Depends(get_session)):
    if not s.get(Komoditas, payload.komoditas_id):
        raise HTTPException(404, "Komoditas tidak ditemukan.")
    payload.id = None
    s.add(payload); s.commit(); s.refresh(payload)
    return payload


@router.delete("/varietas/{varietas_id}", status_code=204)
def hapus_varietas(varietas_id: int, s: Session = Depends(get_session)):
    v = s.get(Varietas, varietas_id)
    if not v:
        raise HTTPException(404, "Varietas tidak ditemukan.")
    s.delete(v); s.commit()

"""Endpoint analisis citra dan riwayat."""
import csv
import io

from fastapi import (APIRouter, Depends, File, Form, HTTPException, UploadFile)
from fastapi.responses import FileResponse, StreamingResponse
from sqlmodel import Session, select

from ..config import settings
from ..db import get_session
from ..models import Analisis, Komoditas, Varietas
from ..services.pipeline import AnalysisRejected, run

router = APIRouter(prefix="/api/analisis", tags=["analisis"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024


@router.post("", status_code=201)
async def analisis_baru(
    berkas: UploadFile = File(...),
    komoditas: str = Form(...),
    batch_id: int | None = Form(None),
    varietas_id: int | None = Form(None),
    penanda_mm: float = Form(20.0),
    s: Session = Depends(get_session),
):
    data = await berkas.read()
    if not data:
        raise HTTPException(400, "Berkas kosong.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Ukuran berkas melebihi 15 MB.")

    km = s.exec(select(Komoditas)
                .where(Komoditas.slug == komoditas.lower())).first()
    if not km:
        raise HTTPException(404, f"Komoditas '{komoditas}' belum terdaftar.")
    if varietas_id is not None:
        v = s.get(Varietas, varietas_id)
        if not v or v.komoditas_id != km.id:
            raise HTTPException(404, "Varietas tidak terdaftar untuk komoditas ini.")

    try:
        out = run(data, km.slug, marker_mm=penanda_mm)
    except AnalysisRejected as e:
        # 422: citra terbaca, tetapi tidak layak dianalisis. Alasannya
        # dikembalikan utuh supaya antarmuka bisa memandu pengguna.
        raise HTTPException(422, e.payload)
    except ValueError as e:
        raise HTTPException(400, str(e))

    row = Analisis(
        batch_id=batch_id, komoditas_slug=km.slug, varietas_id=varietas_id,
        berkas_citra=out.image_path.name, berkas_anotasi=out.annotated_path.name,
        n_benih=out.lot.n_seeds, indeks_mutu_fisik=round(out.imf, 1),
        skor_akhir=out.verdict.skor, kelas=out.verdict.kelas,
        gerbang=out.gate.as_dict(), skala=out.scale.as_dict(),
        fitur_lot=out.lot.as_dict(),
        indeks=[i.as_dict() for i in out.indices],
        estimasi=[e.as_dict() for e in out.estimates],
        putusan=out.verdict.as_dict(),
    )
    s.add(row); s.commit(); s.refresh(row)
    return {"id": row.id, "varietas_id": row.varietas_id, **out.as_dict()}


@router.get("")
def riwayat(komoditas: str | None = None, batas: int = 50,
            s: Session = Depends(get_session)):
    q = select(Analisis).order_by(Analisis.dibuat_pada.desc())
    if komoditas:
        q = q.where(Analisis.komoditas_slug == komoditas.lower())
    return s.exec(q.limit(min(batas, 500))).all()


@router.get("/ringkasan")
def ringkasan(s: Session = Depends(get_session)):
    """Agregasi untuk dashboard - bukan sekadar daftar (temuan W-13)."""
    rows = s.exec(select(Analisis)).all()
    if not rows:
        return {"total": 0, "per_komoditas": [], "sebaran_kelas": {},
                "imf_rata2": None, "berkalibrasi": 0}
    per: dict[str, dict] = {}
    kelas: dict[str, int] = {}
    for r in rows:
        p = per.setdefault(r.komoditas_slug,
                           {"komoditas": r.komoditas_slug, "jumlah": 0,
                            "imf_total": 0.0, "dengan_skor": 0})
        p["jumlah"] += 1
        p["imf_total"] += r.indeks_mutu_fisik
        if r.skor_akhir is not None:
            p["dengan_skor"] += 1
        kelas[r.kelas] = kelas.get(r.kelas, 0) + 1
    for p in per.values():
        p["imf_rata2"] = round(p.pop("imf_total") / p["jumlah"], 1)
    return {
        "total": len(rows),
        "per_komoditas": sorted(per.values(), key=lambda x: -x["jumlah"]),
        "sebaran_kelas": kelas,
        "imf_rata2": round(sum(r.indeks_mutu_fisik for r in rows) / len(rows), 1),
        "berkalibrasi": sum(1 for r in rows if r.skor_akhir is not None),
    }


@router.get("/{analisis_id}")
def detail(analisis_id: int, s: Session = Depends(get_session)):
    row = s.get(Analisis, analisis_id)
    if not row:
        raise HTTPException(404, "Analisis tidak ditemukan.")
    return row


@router.delete("/{analisis_id}", status_code=204)
def hapus(analisis_id: int, s: Session = Depends(get_session)):
    row = s.get(Analisis, analisis_id)
    if not row:
        raise HTTPException(404, "Analisis tidak ditemukan.")
    s.delete(row); s.commit()


@router.get("/{analisis_id}/citra")
def citra(analisis_id: int, anotasi: bool = True,
          s: Session = Depends(get_session)):
    row = s.get(Analisis, analisis_id)
    if not row:
        raise HTTPException(404, "Analisis tidak ditemukan.")
    name = row.berkas_anotasi if anotasi else row.berkas_citra
    path = settings.storage_dir / name
    if not path.exists():
        raise HTTPException(404, "Berkas citra tidak ada di penyimpanan.")
    return FileResponse(path, media_type="image/jpeg")


@router.get("/ekspor/csv")
def ekspor_csv(s: Session = Depends(get_session)):
    """Ekspor untuk dilampirkan ke laporan (temuan W-13)."""
    rows = s.exec(select(Analisis).order_by(Analisis.dibuat_pada)).all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "waktu", "komoditas", "batch_id", "n_benih",
                "indeks_mutu_fisik", "skor_akhir", "kelas", "skala_absolut",
                "cv_luas", "fraksi_cacat", "solidity_rata2", "delta_e_rata2"])
    for r in rows:
        f = r.fitur_lot or {}
        w.writerow([r.id, r.dibuat_pada.isoformat(), r.komoditas_slug,
                    r.batch_id or "", r.n_benih, r.indeks_mutu_fisik,
                    r.skor_akhir if r.skor_akhir is not None else "", r.kelas,
                    f.get("absolute_scale"), round(f.get("area_cv", 0), 4),
                    round(f.get("defect_fraction", 0), 4),
                    round(f.get("solidity_mean", 0), 4),
                    round(f.get("delta_e_mean", 0), 3)])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition":
                 "attachment; filename=sigma_analisis.csv"})

"""Penyimpanan berkas (foto, anotasi, model kalibrasi) di tabel database.

Disk container Vercel tidak permanen, jadi berkas ikut database yang sama
(Postgres di produksi, SQLite lokal). Satu tempat, satu cadangan.
"""
from __future__ import annotations

from sqlmodel import Session

from .db import engine
from .models import Berkas


def simpan(nama: str, isi: bytes, jenis: str = "application/octet-stream") -> None:
    with Session(engine) as s:
        s.merge(Berkas(nama=nama, isi=isi, jenis=jenis))
        s.commit()


def baca(nama: str) -> Berkas | None:
    with Session(engine) as s:
        return s.get(Berkas, nama)


def hapus(*nama: str) -> None:
    with Session(engine) as s:
        for n in nama:
            if (b := s.get(Berkas, n)) is not None:
                s.delete(b)
        s.commit()

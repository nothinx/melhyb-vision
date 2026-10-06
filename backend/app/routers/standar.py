"""Ambang mutu resmi beserta asal-usulnya, terbuka untuk diperiksa."""
from fastapi import APIRouter

from ..config import settings
from ..standar import CARA_MEMPEROLEH_DOKUMEN, STANDAR

router = APIRouter(prefix="/api/standar", tags=["standar"])


@router.get("")
def daftar_standar():
    return {
        "komoditas": [s.as_dict() for s in STANDAR.values()],
        "cara_memperoleh_dokumen": CARA_MEMPEROLEH_DOKUMEN,
        "isian_operator": {
            "aktif": settings.ambang_operator(),
            "variabel": "SIGMA_AMBANG_OVERRIDE",
            "contoh": "SIGMA_AMBANG_OVERRIDE=\"sorgum:80,melon:75\"",
            "penjelasan": (
                "Pengelola server dapat mengisi ambang melalui "
                "SIGMA_AMBANG_OVERRIDE setelah memeriksa dokumen acuan. "
                "Nilainya akan berstatus diisi operator dan status tersebut "
                "dicantumkan pada hasil analisis."
            ),
        },
        "catatan": (
            "Ambang yang belum tersedia tidak digunakan untuk menilai "
            "kelayakan edar. Angka dari sumber yang belum terverifikasi "
            "dicatat sebagai informasi dan tidak ikut menentukan hasil."
        ),
    }

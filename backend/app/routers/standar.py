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
                "Satu-satunya cara menyalakan gerbang ambang edar: baca "
                "dokumennya sendiri, lalu isi angkanya di sini. Statusnya "
                "ditandai 'diisi_operator' dan setiap putusan menyebutnya, "
                "jadi tidak pernah tertukar dengan angka yang terverifikasi."
            ),
        },
        "catatan": (
            "Angka berstatus 'belum_ada' tidak dipakai sama sekali oleh "
            "sistem: gerbang ambang edar untuk komoditas itu dimatikan, "
            "bukan diisi tebakan. Klaim yang beredar tetapi meragukan "
            "dicatat terpisah beserta keberatannya, supaya jejak "
            "penelusurannya tidak hilang tanpa ikut mempengaruhi penilaian."
        ),
    }

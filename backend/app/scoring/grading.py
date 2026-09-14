"""Kelas mutu, ambang edar, dan gerbang keputusan.

Perbedaan terpenting dari prototipe lama: skor akhir TIDAK boleh naik karena
parameter kosmetik. Kalau batas bawah estimasi daya berkecambah berada di
bawah ambang edar komoditas, lot langsung diberi kelas terendah - berapa pun
nilai warna dan keseragamannya (temuan W-01).
"""
from __future__ import annotations

from dataclasses import dataclass

from ..standar import STANDAR, StatusVerifikasi


def ambang_edar(komoditas: str) -> dict | None:
    """Ambang daya berkecambah beserta asal-usulnya, dari `standar.py`.

    Mengembalikan None kalau ambang untuk komoditas itu belum ditemukan di
    dokumen primer - dalam hal itu gerbang ambang edar tidak aktif dan
    aplikasi mengatakannya terang-terangan, bukan memakai angka karangan.
    """
    st = STANDAR.get(komoditas.lower())
    if not st or st.daya_berkecambah_min.nilai is None:
        return None
    return {
        "min_daya_berkecambah": st.daya_berkecambah_min.nilai,
        "sumber": "; ".join(st.regulasi),
        "terverifikasi": (st.daya_berkecambah_min.status
                          == StatusVerifikasi.TERVERIFIKASI),
        "status": st.daya_berkecambah_min.status.value,
        "catatan": st.daya_berkecambah_min.catatan,
    }

GRADE_BANDS = [
    (90.0, "Sangat Baik"),
    (80.0, "Baik"),
    (60.0, "Sedang"),
    (0.0,  "Rendah"),
]

# Bobot skor akhir. Daya berkecambah mendominasi karena ia adalah penentu
# mutu; mutu fisik hanya pendukung.
FINAL_WEIGHTS = {
    "daya_berkecambah": 0.55,
    "vigor": 0.20,
    "mutu_fisik": 0.25,
}


def grade_of(score: float) -> str:
    for threshold, label in GRADE_BANDS:
        if score >= threshold:
            return label
    return "Rendah"


@dataclass
class Verdict:
    skor: float | None
    kelas: str
    dapat_diedarkan: bool | None
    alasan: str
    gerbang_aktif: bool
    ambang: dict | None = None

    def as_dict(self) -> dict:
        return {
            "skor": round(self.skor, 1) if self.skor is not None else None,
            "kelas": self.kelas,
            "dapat_diedarkan": self.dapat_diedarkan,
            "alasan": self.alasan,
            "gerbang_ambang_edar_aktif": self.gerbang_aktif,
            "ambang_edar": self.ambang,
        }


def decide(
    komoditas: str,
    imf: float,
    db_pred: float | None,
    db_low: float | None,
    vigor_pred: float | None,
) -> Verdict:
    """Gabungkan indeks fisik dan estimasi fisiologis menjadi satu putusan.

    Selama model kalibrasi untuk komoditas ini belum ada, aplikasi menolak
    mengeluarkan skor mutu total. Yang dilaporkan hanya Indeks Mutu Fisik,
    dengan penjelasan mengapa. Ini konsekuensi langsung dari temuan P-03:
    daya berkecambah bukan sesuatu yang terlihat di dalam foto.
    """
    if db_pred is None:
        return Verdict(
            skor=None,
            kelas="Belum dapat dinilai",
            dapat_diedarkan=None,
            alasan=(
                "Model kalibrasi untuk komoditas ini belum tersedia atau belum "
                "memenuhi syarat validasi, sehingga daya berkecambah tidak "
                "diestimasi. Yang ditampilkan hanya Indeks Mutu Fisik "
                f"({imf:.1f}/100) yang diukur langsung dari citra."
            ),
            gerbang_aktif=False,
        )

    vigor = vigor_pred if vigor_pred is not None else db_pred
    skor = (FINAL_WEIGHTS["daya_berkecambah"] * db_pred
            + FINAL_WEIGHTS["vigor"] * vigor
            + FINAL_WEIGHTS["mutu_fisik"] * imf)

    ambang = ambang_edar(komoditas)
    catatan_ambang = ""
    if ambang and not ambang["terverifikasi"]:
        catatan_ambang = (
            " Perhatian: ambang ini berstatus "
            f"\"{ambang['status']}\" dan belum dicocokkan dengan tabel di "
            "dokumen primer, jadi putusan ini belum boleh dikutip sebagai "
            "kesimpulan resmi.")

    if ambang and db_low is not None and db_low < ambang["min_daya_berkecambah"]:
        return Verdict(
            skor=round(skor, 1),
            kelas="Tidak memenuhi ambang edar",
            dapat_diedarkan=False,
            alasan=(
                f"Batas bawah estimasi daya berkecambah ({db_low:.1f}%) berada "
                f"di bawah ambang {ambang['min_daya_berkecambah']:.0f}% untuk "
                f"{komoditas}. Kelas tidak dinaikkan oleh parameter fisik. "
                f"Rujukan ambang: {ambang['sumber']}.{catatan_ambang}"
            ),
            gerbang_aktif=True, ambang=ambang,
        )

    dasar = (
        f"Skor = {FINAL_WEIGHTS['daya_berkecambah']:.2f}x daya berkecambah "
        f"({db_pred:.1f}) + {FINAL_WEIGHTS['vigor']:.2f}x vigor "
        f"({vigor:.1f}) + {FINAL_WEIGHTS['mutu_fisik']:.2f}x mutu fisik "
        f"({imf:.1f})."
    )
    if not ambang:
        dasar += (
            f" Gerbang ambang edar tidak aktif: ambang daya berkecambah resmi "
            f"untuk {komoditas} belum ditemukan di dokumen primer, sehingga "
            f"kelayakan edar tidak dinilai.")

    return Verdict(
        skor=round(skor, 1), kelas=grade_of(skor),
        dapat_diedarkan=True if ambang else None,
        alasan=dasar + catatan_ambang,
        gerbang_aktif=bool(ambang), ambang=ambang,
    )

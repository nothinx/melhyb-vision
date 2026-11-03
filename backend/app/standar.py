"""Ambang mutu benih resmi, beserta asal-usulnya.

Berkas ini menjawab temuan P-08: proposal mengklaim "menyesuaikan terhadap
standar mutu nasional (SNI dan Permentan)" tanpa satu pun nomor standar.

Aturan berkas ini: **setiap angka wajib membawa sumbernya, dan angka yang
belum diverifikasi dari dokumen primer tidak boleh berpura-pura sudah.**
Status `TERVERIFIKASI` hanya boleh diberikan setelah seseorang membaca tabel
di dokumen aslinya, bukan ringkasan atau artikel tentang dokumen itu.

Ringkasan penelusuran (31 Agustus 2026):

- Payung hukum benih tanaman pangan: Permentan No. 12/Permentan/TP.020/4/2018
  tentang Produksi, Sertifikasi, dan Peredaran Benih Bina.
- Juknis sertifikasi tanaman pangan yang berlaku: Kepmentan No.
  966/TP.010/C/04/2022, menggantikan Kepmentan No. 991/HK.150/C/05/2018.
  Tabel ambang mutu laboratorium ada di sini.
- Kepmentan No. 993/HK.150/C/05/2018 berisi METODE pengambilan contoh dan
  pengujian mutu - bukan ambangnya. Sering tertukar; jangan dikutip sebagai
  sumber ambang.
- Hortikultura: Permentan No. 23 Tahun 2021 tentang Pembenihan Hortikultura,
  dengan Kepmentan No. 42/Kpts/SR.130/D/10/2019 tentang Teknis Sertifikasi
  Benih Hortikultura.
- SNI benih memang ada, tetapi bernomor per komoditas dan tidak seluruh
  komoditas punya. Yang terkonfirmasi dalam penelusuran ini: SNI 6233:2015
  untuk benih padi. Tidak ditemukan nomor SNI untuk sorgum, melon, maupun
  edamame - jadi rujukan utama ketiganya adalah Kepmentan, bukan SNI.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum

from .config import settings


class StatusVerifikasi(str, Enum):
    TERVERIFIKASI = "terverifikasi"
    """Dibaca langsung dari tabel dokumen primer."""

    DIISI_OPERATOR = "diisi_operator"
    """Diisi manusia lewat konfigurasi setelah membaca dokumennya sendiri.
    Dipakai sistem, tetapi setiap putusan menyebut siapa yang mengisinya."""

    BELUM_ADA = "belum_ada"
    """Belum ditemukan, atau ditemukan tetapi belum terverifikasi. Aplikasi
    TIDAK memakai ambang ini sama sekali; gerbang ambang edar untuk komoditas
    itu dimatikan, bukan diisi angka yang meragukan."""


@dataclass
class Ambang:
    nilai: float | None
    satuan: str
    status: StatusVerifikasi
    catatan: str = ""

    def as_dict(self) -> dict:
        d = asdict(self)
        d["status"] = self.status.value
        return d


@dataclass
class Klaim:
    """Angka yang beredar tetapi belum terverifikasi.

    Disimpan supaya jejak penelusuran tidak hilang - TETAPI tidak pernah
    dipakai sistem untuk memutuskan apa pun.
    """
    parameter: str
    nilai: float
    satuan: str
    sumber: str
    keberatan: str

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass
class StandarKomoditas:
    slug: str
    nama: str
    nama_latin: str
    rezim: str                    # "tanaman pangan" | "hortikultura"
    regulasi: list[str]
    daya_berkecambah_min: Ambang
    kadar_air_maks: Ambang
    benih_murni_min: Ambang
    biji_gulma_maks: Ambang
    klaim_beredar: list[Klaim] = field(default_factory=list)
    kelas_benih: list[str] = field(default_factory=lambda: [
        "Benih Penjenis (BS)", "Benih Dasar (BD, label putih)",
        "Benih Pokok (BP, label ungu)", "Benih Sebar (BR, label biru)",
    ])
    peringatan: str = ""

    @property
    def siap_dipakai(self) -> bool:
        """Ambang boleh dipakai kalau ada nilainya DAN asal-usulnya jelas:
        terbaca dari dokumen, atau diisi manusia yang sudah membacanya."""
        return self.daya_berkecambah_min.nilai is not None and (
            self.daya_berkecambah_min.status
            in (StatusVerifikasi.TERVERIFIKASI, StatusVerifikasi.DIISI_OPERATOR)
        )

    def as_dict(self) -> dict:
        return {
            "slug": self.slug, "nama": self.nama, "nama_latin": self.nama_latin,
            "rezim": self.rezim, "regulasi": self.regulasi,
            "daya_berkecambah_min": self.daya_berkecambah_min.as_dict(),
            "kadar_air_maks": self.kadar_air_maks.as_dict(),
            "benih_murni_min": self.benih_murni_min.as_dict(),
            "biji_gulma_maks": self.biji_gulma_maks.as_dict(),
            "klaim_beredar": [k.as_dict() for k in self.klaim_beredar],
            "kelas_benih": self.kelas_benih,
            "peringatan": self.peringatan,
            "siap_dipakai": self.siap_dipakai,
        }


_KEPMENTAN_966 = ("Kepmentan No. 966/TP.010/C/04/2022 — Petunjuk Teknis "
                  "Sertifikasi Benih Tanaman Pangan")
_PERMENTAN_12 = ("Permentan No. 12/Permentan/TP.020/4/2018 — Produksi, "
                 "Sertifikasi, dan Peredaran Benih Bina")
_PERMENTAN_23 = ("Permentan No. 23 Tahun 2021 — Pembenihan Hortikultura")
_KEPMENTAN_42 = ("Kepmentan No. 42/Kpts/SR.130/D/10/2019 — Teknis "
                 "Sertifikasi Benih Hortikultura")

_BELUM = "Nilai belum tersedia dari dokumen acuan dan belum digunakan dalam penilaian."


STANDAR: dict[str, StandarKomoditas] = {
    "sorgum": StandarKomoditas(
        slug="sorgum", nama="Sorgum", nama_latin="Sorghum bicolor (L.) Moench",
        rezim="tanaman pangan",
        regulasi=[_KEPMENTAN_966, _PERMENTAN_12],
        daya_berkecambah_min=Ambang(
            None, "%", StatusVerifikasi.BELUM_ADA,
            "Ambang belum digunakan. Angka 95% dari ringkasan belum "
            "dicocokkan dengan tabel pada dokumen acuan. Pengelola dapat "
            "mengisi ambang melalui MELHYB_AMBANG_OVERRIDE setelah "
            "memeriksa dokumennya."),
        kadar_air_maks=Ambang(
            None, "%", StatusVerifikasi.BELUM_ADA,
            "Angka 12% berasal dari ringkasan yang sama dan belum "
            "dicocokkan dengan tabel primer."),
        benih_murni_min=Ambang(
            None, "%", StatusVerifikasi.BELUM_ADA,
            "Berbeda-beda antar kelas benih (BS/BD/BP/BR). Angkanya ada di "
            "tabel Kepmentan 966/2022 yang tidak terbaca dari ringkasan."),
        biji_gulma_maks=Ambang(
            None, "%", StatusVerifikasi.BELUM_ADA,
            "Ringkasan menyebut nol toleransi; belum dicocokkan dengan tabel."),
        klaim_beredar=[
            Klaim(
                "Daya berkecambah minimum", 95.0, "%",
                "Laman Direktorat Jenderal Tanaman Pangan, artikel tentang "
                "pengujian mutu benih sorgum (ringkasan, bukan tabel).",
                "Angka pada ringkasan belum dicocokkan dengan tabel dokumen "
                "acuan. Parameter dan kelas benih yang dimaksud perlu "
                "dipastikan sebelum angka ini digunakan.",
            ),
            Klaim(
                "Kadar air maksimum", 12.0, "%",
                "Sumber yang sama.",
                "Nilai ini belum dicocokkan dengan tabel pada dokumen acuan.",
            ),
        ],
        peringatan=(
            "Ambang edar sorgum belum digunakan. Nilai dari ringkasan belum "
            "terverifikasi pada dokumen acuan. Rinciannya tersedia pada "
            "daftar angka yang belum digunakan."),
    ),
    "melon": StandarKomoditas(
        slug="melon", nama="Melon", nama_latin="Cucumis melo L.",
        rezim="hortikultura",
        regulasi=[_PERMENTAN_23, _KEPMENTAN_42],
        daya_berkecambah_min=Ambang(None, "%", StatusVerifikasi.BELUM_ADA, _BELUM),
        kadar_air_maks=Ambang(None, "%", StatusVerifikasi.BELUM_ADA, _BELUM),
        benih_murni_min=Ambang(None, "%", StatusVerifikasi.BELUM_ADA, _BELUM),
        biji_gulma_maks=Ambang(None, "%", StatusVerifikasi.BELUM_ADA, _BELUM),
        kelas_benih=["Benih Penjenis", "Benih Dasar", "Benih Pokok",
                     "Benih Sebar"],
        peringatan=(
            "Ambang edar melon belum digunakan karena nilainya belum "
            "diverifikasi pada dokumen acuan. Periksa dokumen lengkap "
            "beserta lampirannya melalui JDIH Kementan atau BPSBTPH provinsi."),
    ),
    "edamame": StandarKomoditas(
        slug="edamame", nama="Edamame", nama_latin="Glycine max (L.) Merr.",
        rezim="perlu diputuskan",
        regulasi=[_KEPMENTAN_966, _PERMENTAN_23],
        daya_berkecambah_min=Ambang(None, "%", StatusVerifikasi.BELUM_ADA, _BELUM),
        kadar_air_maks=Ambang(None, "%", StatusVerifikasi.BELUM_ADA, _BELUM),
        benih_murni_min=Ambang(None, "%", StatusVerifikasi.BELUM_ADA, _BELUM),
        biji_gulma_maks=Ambang(None, "%", StatusVerifikasi.BELUM_ADA, _BELUM),
        peringatan=(
            "Ambang edar edamame belum digunakan. Kelompok regulasi yang "
            "menjadi acuan perlu dipastikan sebelum memilih tabel ambang. "
            "Mintalah konfirmasi kepada pengelola pengujian benih."),
    ),
}


def terapkan_isian_operator() -> None:
    """Timpa ambang dengan angka yang diisi operator lewat konfigurasi.

    Ini satu-satunya jalan agar gerbang ambang edar menyala: seseorang membaca
    dokumennya, lalu mengetikkan angkanya. Statusnya ditandai `diisi_operator`
    supaya tidak pernah tertukar dengan angka yang benar-benar terverifikasi.
    """
    for slug, nilai in settings.ambang_operator().items():
        st = STANDAR.get(slug)
        if not st:
            continue
        st.daya_berkecambah_min = Ambang(
            nilai, "%", StatusVerifikasi.DIISI_OPERATOR,
            f"Nilai {nilai:.0f}% diisi oleh operator melalui "
            f"MELHYB_AMBANG_OVERRIDE dan belum diverifikasi. Periksa nilai ini "
            f"pada dokumen acuan {st.regulasi[0]} sebelum menggunakan "
            f"hasilnya dalam laporan resmi.")
        st.peringatan = (
            f"Ambang {nilai:.0f}% diisi operator dan belum diverifikasi. "
            f"Cantumkan sumber serta halaman dokumen acuan pada laporan.")


terapkan_isian_operator()


CARA_MEMPEROLEH_DOKUMEN = [
    {
        "sumber": "JDIH Kementerian Pertanian",
        "alamat": "https://jdih.pertanian.go.id",
        "untuk": "Permentan 12/2018, Permentan 23/2021, Kepmentan 966/2022, "
                 "Kepmentan 42/2019 - versi resmi lengkap dengan lampiran.",
    },
    {
        "sumber": "BPSBTPH Provinsi Jawa Tengah",
        "alamat": "Kantor BPSBTPH provinsi",
        "untuk": "Konfirmasi tabel ambang mutu dan kelompok regulasi yang "
                 "menjadi acuan pengujian.",
    },
    {
        "sumber": "BSN / Pesta SNI",
        "alamat": "https://pesta.bsn.go.id",
        "untuk": "Pencarian standar SNI berdasarkan komoditas dan nomor dokumen.",
    },
    {
        "sumber": "BBPPMBTPH",
        "alamat": "https://bbppmbtph.tanamanpangan.pertanian.go.id",
        "untuk": "Informasi metode dan prosedur pengujian mutu benih.",
    },
]

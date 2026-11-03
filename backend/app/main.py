from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import init_db
from .routers import analisis, batch, kalibrasi, katalog, standar
from .scoring.grading import FINAL_WEIGHTS, GRADE_BANDS
from .scoring.indices import PHYSICAL_WEIGHTS
from .vision import yolo

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="SIGMA API",
    version="1.0.0",
    description=(
        "Penilaian mutu fisik benih dari citra, dengan pemisahan tegas antara "
        "besaran TERUKUR dan besaran TERESTIMASI. Parameter fisiologis "
        "(daya berkecambah, kecepatan tumbuh, keserempakan tumbuh) tidak "
        "pernah dilaporkan tanpa model yang lolos validasi terhadap hasil "
        "UKDdP."
    ),
)

# allow_credentials=False karena memang tidak ada yang dikirim: frontend
# memakai fetch biasa, dan saat pengembangan lewat proxy Vite sehingga
# permintaannya satu asal. Menyalakannya sekarang cuma menyisakan jebakan
# untuk hari saat autentikasi ditambahkan - kredensial akan ikut terkirim
# lintas asal tanpa ada yang sengaja memutuskan begitu.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False, allow_methods=["*"], allow_headers=["*"],
)

app.include_router(katalog.router)
app.include_router(batch.router)
app.include_router(analisis.router)
app.include_router(kalibrasi.router)
app.include_router(standar.router)


# Kalau frontend sudah di-build, satu proses ini cukup untuk melayani
# seluruh aplikasi - tidak perlu dua layanan terpisah saat deploy.
_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@app.get("/api/kesehatan")
def kesehatan():
    return {"status": "ok", "aplikasi": settings.app_name}


@app.get("/api/metodologi")
def metodologi():
    """Seluruh angka yang mempengaruhi penilaian, terbuka untuk diaudit.

    Endpoint ini ada supaya penguji tidak perlu percaya begitu saja: bobot,
    ambang, dan definisi kelas bisa dibaca langsung dari sistem yang berjalan.
    """
    return {
        "unit_analisis": "satu foto = satu lot berisi banyak benih",
        "bobot_indeks_fisik": PHYSICAL_WEIGHTS,
        "bobot_skor_akhir": FINAL_WEIGHTS,
        "kelas_mutu": [{"minimal": t, "label": l} for t, l in GRADE_BANDS],
        "gerbang_citra": {
            "sisi_minimum_px": settings.min_side_px,
            "ketajaman_minimum": settings.min_sharpness,
            "fraksi_jenuh_maksimum": settings.max_blown_fraction,
            "rentang_dinamis_minimum": settings.min_dynamic_range,
            "benih_minimum": settings.min_seeds_detected,
        },
        "model_segmentasi": {
            "aktif": yolo.tersedia(settings.yolo_model),
            "nama": yolo.NAMA,
            "conf": settings.yolo_conf,
            "masukan": f"ubin {yolo.SISI} px skala asli, tumpang {yolo.TUMPANG} px",
            "uji": "wadah test S01-S03: akurasi per benih 0,995, cacat 658/665",
            "batasan": "cacat pada lot VB/VC = benih VA jelek yang tercampur; "
                       "foto light box dari tim yang sama",
            "cadangan": "Otsu + watershed dan ambang solidity bila model tidak ada",
            "lisensi": "AGPL-3.0 (Ultralytics); kode sumber SIGMA: "
                       "https://github.com/nothinx/sigma-benih",
        },
        "normalisasi_indeks": {
            "cv_luas_skor_nol": settings.cv_area_worst,
            "delta_e_skor_nol": settings.delta_e_worst,
            "solidity_skor_nol": settings.solidity_worst,
            "solidity_skor_penuh": settings.solidity_best,
            "ambang_cacat_solidity": settings.defect_solidity_threshold,
        },
        "syarat_kalibrasi": {
            "sampel_minimum": settings.min_calibration_samples,
            "r2_validasi_minimum": settings.min_calibration_r2,
            "metode": "RidgeCV + StandardScaler, validasi silang 5-lipat",
            "selang_prediksi": "nilai +/- 1,96 x RMSE validasi silang",
        },
        "batasan": [
            "Daya berkecambah, kecepatan tumbuh, dan keserempakan tumbuh "
            "merupakan estimasi model dari ciri fisik, bukan hasil uji perkecambahan.",
            "Hasil aplikasi bukan pengganti sertifikasi benih resmi.",
            "Ukuran dalam milimeter hanya tersedia bila penanda skala ArUco "
            "ikut terfoto.",
        ],
    }


# Semua sumber daya kini satu asal - font ikut diswakelola - jadi kebijakan
# yang ketat memang bisa dipasang. Yang longgar hanya style-src: React dan
# Recharts menulis lewat atribut `style`, dan itu jatuh ke style-src-attr.
# `data:` untuk favicon SVG dan tekstur butiran kertas, `blob:` untuk
# pratinjau foto dari URL.createObjectURL.
CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
])


# Vite menamai setiap aset di /assets/ dengan hash isinya, jadi isi sebuah
# nama berkas tidak pernah berubah - itu persis definisi `immutable`. Bawaan
# StaticFiles cuma mengirim ETag, sehingga peramban tetap menanyakan ulang
# tiap aset pada setiap kunjungan. index.html tidak ikut: namanya tetap
# sementara isinya berganti tiap build, jadi biar divalidasi seperti biasa.
@app.middleware("http")
async def kepala_respons(request, call_next):
    resp = await call_next(request)
    if request.url.path.startswith("/assets/"):
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "same-origin"
    # /docs dan /redoc memuat Swagger UI dari cdn.jsdelivr.net; CSP di atas
    # akan memblokirnya. Halaman itu bukan bagian dari aplikasi operator.
    if not request.url.path.startswith(("/docs", "/redoc")):
        resp.headers["Content-Security-Policy"] = CSP
    return resp


if _DIST.is_dir():
    app.mount("/", StaticFiles(directory=_DIST, html=True), name="frontend")

"""Pengukuran harus membedakan lot bagus dari lot buruk, dan menolak yang
tidak layak diukur."""
import cv2
import numpy as np

from app.config import settings
from app.services.pipeline import AnalysisRejected, run
from app.vision.preprocess import check_image, decode_image
from tests.make_fixture import synthetic_lot


def test_gerbang_menolak_foto_buram(lot_buram):
    gate = check_image(decode_image(lot_buram))
    assert not gate.passed
    assert any(i.code == "buram" for i in gate.issues)
    # Pesan harus bisa ditindaklanjuti, bukan sekadar kode galat.
    assert "fokus" in " ".join(i.message for i in gate.issues).lower()


def test_gerbang_meloloskan_foto_layak(lot_bagus):
    assert check_image(decode_image(lot_bagus)).passed


def test_menolak_benih_terlalu_sedikit(lot_kosong):
    try:
        run(lot_kosong, "sorgum")
    except AnalysisRejected as e:
        assert "benih terdeteksi" in e.payload["pesan"]
    else:
        raise AssertionError("Seharusnya ditolak karena benih terlalu sedikit.")


def test_lot_bagus_menang_di_semua_indeks_fisik(lot_bagus, lot_buruk):
    a = run(lot_bagus, "sorgum")
    b = run(lot_buruk, "sorgum")
    assert a.lot.n_seeds >= settings.min_seeds_detected
    assert a.imf > b.imf + 15, (a.imf, b.imf)

    ia = {i.key: i.value for i in a.indices}
    ib = {i.key: i.value for i in b.indices}
    assert ia["keseragaman_ukuran"] > ib["keseragaman_ukuran"]
    assert ia["keutuhan_fisik"] > ib["keutuhan_fisik"]
    assert ia["kebersihan_lot"] > ib["kebersihan_lot"]


def test_keseragaman_naik_saat_sebaran_ukuran_mengecil():
    seragam = cv2.imencode(".jpg", synthetic_lot(size_cv=0.03, defect_ratio=0.0,
                                                 seed=21))[1].tobytes()
    beragam = cv2.imencode(".jpg", synthetic_lot(size_cv=0.30, defect_ratio=0.0,
                                                 seed=21))[1].tobytes()
    s = {i.key: i.value for i in run(seragam, "sorgum").indices}
    b = {i.key: i.value for i in run(beragam, "sorgum").indices}
    assert s["keseragaman_ukuran"] > b["keseragaman_ukuran"] + 20


def test_tanpa_penanda_ukuran_mm_tidak_dilaporkan(lot_bagus):
    out = run(lot_bagus, "sorgum")
    assert out.scale.source == "tidak_ada"
    assert out.lot.length_mean_mm is None
    assert out.lot.absolute_scale is False


def test_anotasi_berbeda_dari_citra_asli(lot_buruk):
    out = run(lot_buruk, "sorgum")
    asli = cv2.imread(str(out.image_path))
    anot = cv2.imread(str(out.annotated_path))
    assert asli is not None and anot is not None
    assert np.abs(asli.astype(int) - anot.astype(int)).sum() > 0

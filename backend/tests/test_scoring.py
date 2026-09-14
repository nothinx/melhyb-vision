"""Aturan penilaian: pembobotan eksplisit, gerbang ambang edar, dan
penolakan menyajikan estimasi yang belum terkalibrasi."""
import numpy as np
import pytest

from app.scoring import calibration
from app.scoring.grading import (FINAL_WEIGHTS, ambang_edar, decide,
                                 grade_of)
from app.standar import STANDAR, Ambang, StatusVerifikasi
from app.scoring.indices import PHYSICAL_WEIGHTS, physical_quality_index
from app.vision.features import LotFeatures


def test_bobot_fisik_berjumlah_satu():
    assert abs(sum(PHYSICAL_WEIGHTS.values()) - 1.0) < 1e-9


def test_bobot_akhir_berjumlah_satu():
    assert abs(sum(FINAL_WEIGHTS.values()) - 1.0) < 1e-9


def test_daya_berkecambah_berbobot_terbesar():
    """Inti temuan W-01: warna tidak boleh setara daya berkecambah."""
    assert FINAL_WEIGHTS["daya_berkecambah"] > FINAL_WEIGHTS["mutu_fisik"]
    assert FINAL_WEIGHTS["daya_berkecambah"] > 0.5


def test_bukan_rata_rata_tak_berbobot():
    """Prototipe lama merata-ratakan tujuh parameter. Skor di sini harus
    berbeda dari rata-rata sederhana."""
    imf, db, vigor = 90.0, 60.0, 60.0
    v = decide("sorgum", imf, db, db, vigor)
    rata_rata = (imf + db + vigor) / 3
    assert v.skor is not None and abs(v.skor - rata_rata) > 1.0


def test_tanpa_kalibrasi_tidak_ada_skor():
    v = decide("sorgum", 95.0, None, None, None)
    assert v.skor is None
    assert v.kelas == "Belum dapat dinilai"
    assert "kalibrasi" in v.alasan.lower()


@pytest.fixture
def ambang_sorgum_diisi():
    """Simulasikan operator yang sudah membaca dokumennya dan mengisi ambang."""
    st = STANDAR["sorgum"]
    asli = st.daya_berkecambah_min
    st.daya_berkecambah_min = Ambang(
        80.0, "%", StatusVerifikasi.DIISI_OPERATOR, "Diisi operator untuk uji.")
    yield 80.0
    st.daya_berkecambah_min = asli


def test_gerbang_ambang_edar_menahan_parameter_kosmetik(ambang_sorgum_diisi):
    """Mutu fisik nyaris sempurna tidak boleh menyelamatkan lot yang batas
    bawah daya berkecambahnya di bawah ambang."""
    ambang = ambang_sorgum_diisi
    v = decide("sorgum", imf=99.0, db_pred=ambang - 2, db_low=ambang - 10,
               vigor_pred=95.0)
    assert v.kelas == "Tidak memenuhi ambang edar"
    assert v.dapat_diedarkan is False
    assert str(int(ambang)) in v.alasan
    # Rujukan regulasinya wajib ikut disebut, bukan sekadar angka telanjang.
    assert "Kepmentan" in v.alasan


def test_lot_baik_lolos_gerbang(ambang_sorgum_diisi):
    v = decide("sorgum", imf=92.0, db_pred=99.0, db_low=ambang_sorgum_diisi + 2,
               vigor_pred=97.0)
    assert v.dapat_diedarkan is True
    assert v.kelas == "Sangat Baik"


def test_ambang_isian_operator_selalu_diberi_peringatan(ambang_sorgum_diisi):
    """Angka yang diketik manusia dipakai, tetapi tidak pernah menyamar
    sebagai angka yang terverifikasi."""
    v = decide("sorgum", imf=90.0, db_pred=99.0, db_low=98.0, vigor_pred=98.0)
    assert v.ambang is not None
    assert v.ambang["terverifikasi"] is False
    assert v.ambang["status"] == "diisi_operator"
    assert "belum dicocokkan" in v.alasan


def test_semua_komoditas_default_tanpa_ambang():
    """Bawaan sistem: tidak satu pun komoditas punya ambang yang boleh
    dipakai. Gerbangnya mati, bukan diisi tebakan."""
    for slug in ("sorgum", "melon", "edamame"):
        assert not STANDAR[slug].siap_dipakai, slug
        assert ambang_edar(slug) is None, slug
        v = decide(slug, imf=90.0, db_pred=85.0, db_low=80.0, vigor_pred=84.0)
        assert v.dapat_diedarkan is None
        assert v.gerbang_aktif is False
        assert "belum ditemukan di dokumen primer" in v.alasan


def test_klaim_yang_meragukan_tidak_pernah_jadi_ambang():
    """Angka 95% untuk sorgum tercatat sebagai klaim beserta keberatannya,
    tetapi tidak boleh bocor menjadi ambang operatif."""
    st = STANDAR["sorgum"]
    klaim = {k.parameter: k for k in st.klaim_beredar}
    assert "Daya berkecambah minimum" in klaim
    assert klaim["Daya berkecambah minimum"].nilai == 95.0
    assert klaim["Daya berkecambah minimum"].keberatan
    # Klaimnya ada, ambangnya tidak.
    assert st.daya_berkecambah_min.nilai is None
    assert st.daya_berkecambah_min.status is StatusVerifikasi.BELUM_ADA


def test_setiap_standar_membawa_regulasinya():
    """Tidak boleh ada angka tanpa asal-usul (temuan P-08)."""
    for st in STANDAR.values():
        assert st.regulasi, st.slug
        for ambang in (st.daya_berkecambah_min, st.kadar_air_maks,
                       st.benih_murni_min, st.biji_gulma_maks):
            if ambang.nilai is not None:
                assert ambang.status is not StatusVerifikasi.BELUM_ADA
            assert ambang.catatan, (st.slug, ambang)


@pytest.mark.parametrize("skor,kelas", [
    (95.0, "Sangat Baik"), (90.0, "Sangat Baik"), (85.0, "Baik"),
    (80.0, "Baik"), (70.0, "Sedang"), (60.0, "Sedang"), (40.0, "Rendah"),
])
def test_batas_kelas(skor, kelas):
    assert grade_of(skor) == kelas


def _lot(**kw) -> LotFeatures:
    base = dict(n_seeds=100, area_mean=1000.0, area_cv=0.1,
                length_mean_mm=None, length_cv=0.05, width_mean_mm=None,
                aspect_mean=1.5, aspect_cv=0.05, circularity_mean=0.9,
                solidity_mean=0.97, solidity_p10=0.93, L_mean=50.0,
                a_mean=10.0, b_mean=20.0, delta_e_mean=4.0,
                glcm_homogeneity_mean=0.8, glcm_contrast_mean=30.0,
                defect_fraction=0.05, absolute_scale=False)
    base.update(kw)
    return LotFeatures(**base)


def test_indeks_fisik_naik_saat_lot_membaik():
    from app.scoring.indices import compute_indices
    buruk = physical_quality_index(compute_indices(
        _lot(area_cv=0.40, solidity_mean=0.88, defect_fraction=0.40)))
    bagus = physical_quality_index(compute_indices(
        _lot(area_cv=0.05, solidity_mean=0.98, defect_fraction=0.01)))
    assert bagus > buruk + 30


def test_model_ditolak_saat_sampel_kurang():
    rng = np.random.default_rng(1)
    X = rng.normal(size=(12, 15)).tolist()
    y = rng.normal(80, 5, 12).tolist()
    r = calibration.train("uji_kurang", "daya_berkecambah", X, y)
    assert not r.usable
    assert "30" in r.reason
    assert calibration.predict("uji_kurang", "daya_berkecambah", _lot()) is None


def test_model_ditolak_saat_r2_rendah():
    """Sampel cukup tapi tanpa hubungan nyata -> tetap tidak boleh dipakai."""
    rng = np.random.default_rng(2)
    X = rng.normal(size=(60, 15)).tolist()
    y = rng.normal(80, 5, 60).tolist()          # murni derau
    r = calibration.train("uji_derau", "daya_berkecambah", X, y)
    assert not r.usable
    assert calibration.predict("uji_derau", "daya_berkecambah", _lot()) is None


def _train_layak(nama="uji_layak"):
    """Latih model pada data yang bentuknya menyerupai fitur lot nyata."""
    rng = np.random.default_rng(3)
    template = np.asarray(_lot().vector(), dtype=float)
    X = template + rng.normal(0, np.abs(template) * 0.15 + 0.01, (80, 15))
    y = 78 + 40 * (0.12 - X[:, 1]) - 60 * (X[:, 14] - 0.05) + rng.normal(0, 1.5, 80)
    return calibration.train(nama, "daya_berkecambah", X.tolist(), y.tolist()), X


def test_model_layak_menghasilkan_estimasi_bersama_selangnya():
    r, _ = _train_layak()
    assert r.usable and r.r2 > 0.4
    est = calibration.predict("uji_layak", "daya_berkecambah", _lot())
    assert est is not None
    assert est.usable, est.as_dict()
    assert est.lower <= est.value <= est.upper
    assert 0.0 <= est.lower and est.upper <= 100.0
    d = est.as_dict()
    assert d["jenis"] == "estimasi"
    assert "bukan hasil" in d["catatan"].lower()


def test_selang_selalu_di_dalam_batas_wajar():
    """Regresi: sebelumnya selang dihitung dari nilai sebelum dijepit,
    sehingga batas atas bisa jatuh di bawah batas bawah."""
    _train_layak("uji_jepit")
    ekstrem = _lot(area_cv=8.0, defect_fraction=5.0, solidity_mean=-3.0)
    est = calibration.predict("uji_jepit", "daya_berkecambah", ekstrem)
    assert est is not None
    assert est.lower <= est.upper
    assert 0.0 <= est.value <= 100.0


def test_ekstrapolasi_ditandai_dan_tidak_dipakai():
    _train_layak("uji_ekstrap")
    jauh = _lot(area_cv=3.0, delta_e_mean=90.0, L_mean=5.0)
    est = calibration.predict("uji_ekstrap", "daya_berkecambah", jauh)
    assert est is not None
    assert est.out_of_domain and not est.usable
    assert "di luar rentang" in est.as_dict()["catatan"].lower()

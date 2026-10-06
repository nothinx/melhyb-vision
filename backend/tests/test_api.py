"""Uji ujung-ke-ujung: analisis -> UKDdP -> kalibrasi -> estimasi."""
from datetime import date, timedelta


def test_kesehatan(client):
    assert client.get("/api/kesehatan").json()["status"] == "ok"


def test_metodologi_terbuka(client):
    """Penguji harus bisa membaca seluruh bobot dan ambang dari sistem yang
    berjalan, tanpa membuka kode."""
    m = client.get("/api/metodologi").json()
    assert abs(sum(m["bobot_indeks_fisik"].values()) - 1.0) < 1e-9
    assert m["bobot_skor_akhir"]["daya_berkecambah"] > 0.5
    assert any("bukan pengganti sertifikasi" in b.lower() for b in m["batasan"])


def test_komoditas_awal_terisi(client):
    slugs = {k["slug"] for k in client.get("/api/katalog/komoditas").json()}
    assert slugs == {"melon"}
    nama = {v["nama"] for v in client.get("/api/katalog/varietas").json()}
    assert {"Golden Aroma", "Honey Globe", "Apollo", "Benih petani"} <= nama


def test_varietas_komoditas_lain_ditolak(client, lot_bagus):
    r = client.post("/api/analisis",
                    files={"berkas": ("lot.jpg", lot_bagus, "image/jpeg")},
                    data={"komoditas": "melon", "varietas_id": 9999})
    assert r.status_code == 404


def test_komoditas_tak_dikenal_ditolak(client, lot_bagus):
    r = client.post("/api/analisis",
                    files={"berkas": ("lot.jpg", lot_bagus, "image/jpeg")},
                    data={"komoditas": "kacang_mede"})
    assert r.status_code == 404


def test_foto_buram_ditolak_dengan_panduan(client, lot_buram):
    r = client.post("/api/analisis",
                    files={"berkas": ("lot.jpg", lot_buram, "image/jpeg")},
                    data={"komoditas": "melon"})
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert any(m["kode"] == "buram" for m in detail["gerbang_citra"]["masalah"])


def test_berkas_bukan_citra_ditolak(client):
    r = client.post("/api/analisis",
                    files={"berkas": ("catatan.txt", b"bukan gambar", "text/plain")},
                    data={"komoditas": "melon"})
    assert r.status_code == 400


def test_analisis_tanpa_kalibrasi_tidak_mengarang_angka(client, lot_bagus):
    r = client.post("/api/analisis",
                    files={"berkas": ("lot.jpg", lot_bagus, "image/jpeg")},
                    data={"komoditas": "melon"})
    assert r.status_code == 201
    body = r.json()
    assert body["indeks_mutu_fisik"] > 0
    assert body["estimasi_fisiologis"] == []
    assert body["putusan"]["skor"] is None
    assert body["putusan"]["kelas"] == "Belum dapat dinilai"
    assert len(body["indeks_terukur"]) == 5
    assert body["segmentasi"]["jumlah_benih"] >= 15


def test_citra_anotasi_dapat_diunduh(client, lot_bagus):
    aid = client.post("/api/analisis",
                      files={"berkas": ("lot.jpg", lot_bagus, "image/jpeg")},
                      data={"komoditas": "melon"}).json()["id"]
    r = client.get(f"/api/analisis/{aid}/citra?anotasi=true")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"
    assert len(r.content) > 1000


def test_ringkasan_mengagregasi(client):
    s = client.get("/api/analisis/ringkasan").json()
    assert s["total"] >= 2
    assert s["imf_rata2"] is not None
    assert any(p["komoditas"] == "melon" for p in s["per_komoditas"])


def test_ekspor_csv(client):
    r = client.get("/api/analisis/ekspor/csv")
    assert r.status_code == 200
    assert "indeks_mutu_fisik" in r.text.splitlines()[0]


def test_rumus_daya_berkecambah_sesuai_proposal(client):
    """DB = (A + B) / N x 100."""
    b = client.post("/api/batch", json={
        "kode": "UJI-RUMUS", "komoditas_id": 1}).json()
    r = client.post("/api/kalibrasi/ukddp", json={
        "batch_id": b["id"], "tanggal_tanam": "2026-01-01",
        "tanggal_hitung_1": "2026-01-05", "tanggal_hitung_2": "2026-01-12",
        "jumlah_benih": 200, "normal_hitungan_1": 120,
        "normal_hitungan_2": 54, "abnormal": 16, "tidak_tumbuh": 10})
    assert r.status_code == 201
    uji = r.json()["uji"]
    assert uji["daya_berkecambah"] == 87.0          # (120+54)/200*100
    assert uji["keserempakan_tumbuh"] == 60.0       # 120/200*100
    assert uji["kecepatan_tumbuh"] is not None


def test_ukddp_menolak_total_melebihi_n(client):
    b = client.post("/api/batch", json={
        "kode": "UJI-SALAH", "komoditas_id": 1}).json()
    r = client.post("/api/kalibrasi/ukddp", json={
        "batch_id": b["id"], "tanggal_tanam": "2026-01-01",
        "jumlah_benih": 50, "normal_hitungan_1": 40,
        "normal_hitungan_2": 20})
    assert r.status_code == 400
    assert "melebihi" in r.json()["detail"]


def test_status_kalibrasi_jujur_saat_kosong(client):
    rows = client.get("/api/kalibrasi/status").json()
    melon_db = [r for r in rows if r["komoditas"] == "melon"
                and r["target"] == "daya_berkecambah"][0]
    assert melon_db["siap_pakai"] is False


def test_latih_tanpa_pasangan_ditolak(client):
    r = client.post("/api/kalibrasi/latih?komoditas=melon")
    assert r.status_code == 400
    assert "UKDdP" in r.json()["detail"]


def test_loop_kalibrasi_penuh(client, lot_bagus, lot_buruk):
    """Foto lot -> catat UKDdP lot yang sama -> latih -> model boleh dipakai."""
    from app.config import settings
    n = settings.min_calibration_samples + 4
    tanam = date(2026, 2, 1)

    for i in range(n):
        bagus = i % 2 == 0
        blob = lot_bagus if bagus else lot_buruk
        batch = client.post("/api/batch", json={
            "kode": f"KAL-{i:03d}", "komoditas_id": 1}).json()
        aid = client.post(
            "/api/analisis",
            files={"berkas": (f"{i}.jpg", blob, "image/jpeg")},
            data={"komoditas": "melon", "batch_id": batch["id"]},
        ).json()["id"]
        normal1 = 88 if bagus else 44
        normal2 = 6 if bagus else 8
        client.post("/api/kalibrasi/ukddp", json={
            "batch_id": batch["id"], "analisis_id": aid,
            "tanggal_tanam": tanam.isoformat(),
            "tanggal_hitung_1": (tanam + timedelta(days=4)).isoformat(),
            "tanggal_hitung_2": (tanam + timedelta(days=11)).isoformat(),
            "jumlah_benih": 100, "normal_hitungan_1": normal1,
            "normal_hitungan_2": normal2,
            "abnormal": 2, "tidak_tumbuh": 100 - normal1 - normal2 - 2,
        })

    rep = client.post("/api/kalibrasi/latih?komoditas=melon").json()
    assert rep["n_samples"] >= settings.min_calibration_samples
    assert rep["usable"] is True, rep["reason"]

    # Setelah terkalibrasi, analisis baru boleh menyertakan estimasi.
    body = client.post(
        "/api/analisis",
        files={"berkas": ("baru.jpg", lot_bagus, "image/jpeg")},
        data={"komoditas": "melon"}).json()
    est = body["estimasi_fisiologis"]
    assert est, body["putusan"]
    db = [e for e in est if e["target"] == "daya_berkecambah"][0]
    assert db["batas_bawah"] <= db["nilai"] <= db["batas_atas"]
    assert db["n_sampel_kalibrasi"] >= settings.min_calibration_samples
    assert body["putusan"]["skor"] is not None


def test_hapus_analisis(client, lot_bagus):
    aid = client.post("/api/analisis",
                      files={"berkas": ("x.jpg", lot_bagus, "image/jpeg")},
                      data={"komoditas": "melon"}).json()["id"]
    assert client.delete(f"/api/analisis/{aid}").status_code == 204
    assert client.get(f"/api/analisis/{aid}").status_code == 404


def test_endpoint_standar_terbuka(client):
    """Ambang resmi dan asal-usulnya harus bisa dibaca dari sistem berjalan."""
    d = client.get("/api/standar").json()
    slugs = {k["slug"] for k in d["komoditas"]}
    assert {"sorgum", "melon", "edamame"} == slugs
    for k in d["komoditas"]:
        assert k["regulasi"], k["slug"]
        assert "status" in k["daya_berkecambah_min"]
    assert d["cara_memperoleh_dokumen"]
    assert d["isian_operator"]["variabel"] == "SIGMA_AMBANG_OVERRIDE"
    # Tidak satu pun komoditas boleh mengaku siap sebelum diverifikasi.
    assert all(not k["siap_dipakai"] for k in d["komoditas"])
    # Tidak satu pun ambang operatif terisi.
    assert all(k["daya_berkecambah_min"]["nilai"] is None for k in d["komoditas"])

    # Klaim 95% untuk sorgum tercatat, lengkap dengan keberatannya.
    sorgum = next(k for k in d["komoditas"] if k["slug"] == "sorgum")
    klaim = sorgum["klaim_beredar"]
    assert any(k["nilai"] == 95.0 and k["keberatan"] for k in klaim)

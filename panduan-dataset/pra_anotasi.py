"""Pra-anotasi benih melon untuk Roboflow (format YOLO segmentasi).

Membuat poligon tiap benih secara otomatis dari foto light box berlatar abu-abu
tua, lalu menyusunnya dalam struktur folder yang langsung bisa diunggah ke
Roboflow (train/valid/test + data.yaml). Manusia tetap memeriksa setiap foto
di Roboflow; skrip ini hanya menghemat waktu menggambar poligon.

Konvensi nama berkas (wajib):
    {VARIETAS}_{TIPE}_{SPLIT}_{SESI}_{NOMOR}.jpg
    contoh: VA_M_train_S01_003.jpg

    TIPE  B = semua benih baik      -> semua poligon diberi kelas 'baik'
          J = semua benih cacat     -> semua poligon diberi kelas 'cacat'
          M = campuran baik + cacat -> semua diberi 'baik', kelas benih cacat
                                       DIGANTI MANUAL di Roboflow
          L = foto lot untuk aplikasi/kalibrasi (tidak masuk dataset YOLO)
    SPLIT train | valid | test  (ditentukan saat membagi benih, bukan acak)

Pemakaian:
    pip install opencv-python numpy
    python pra_anotasi.py --masuk foto_mentah --keluar dataset_yolo

Hasil:
    dataset_yolo/train/images, train/labels, valid/..., test/...
    dataset_yolo/data.yaml
    dataset_yolo/pratinjau/*.jpg   (kontur hasil, untuk diperiksa cepat)
    dataset_yolo/laporan.csv       (jumlah benih terdeteksi per foto)
"""
from __future__ import annotations

import argparse
import csv
import re
import shutil
from pathlib import Path

import cv2
import numpy as np

KELAS = ["baik", "cacat"]
TIPE_KE_KELAS = {"B": 0, "J": 1, "M": 0}
POLA = re.compile(r"^(?P<var>[A-Za-z0-9]+)_(?P<tipe>[BJML])_(?P<split>train|valid|test)_"
                  r"(?P<sesi>S\d+)_(?P<no>\d+)$")


def tutup_aruco(img: np.ndarray) -> np.ndarray:
    """Timpa penanda ArUco (beserta tepi putihnya) dengan warna latar.

    Tanpa ini, bingkai putih penanda ikut terbaca sebagai objek terang.
    """
    try:
        kamus = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        det = cv2.aruco.ArucoDetector(kamus, cv2.aruco.DetectorParameters())
        sudut, ids, _ = det.detectMarkers(img)
    except Exception:
        return img
    if ids is None:
        return img
    hasil = img.copy()
    latar = np.median(img.reshape(-1, 3), axis=0)
    for c in sudut:
        pts = c.reshape(4, 2)
        pusat = pts.mean(0)
        # perbesar 1,9x agar tepi putih (quiet zone) ikut tertutup
        besar = (pusat + (pts - pusat) * 1.9).astype(np.int32)
        cv2.fillPoly(hasil, [besar], latar.tolist())
    return hasil


def segmentasi(img: np.ndarray) -> list[np.ndarray]:
    """Kembalikan daftar kontur benih (koordinat piksel).

    Saturasi dicoba dulu: benih krem di atas alas abu-abu (tak berwarna)
    terpisah bersih di kanal itu walau cahaya bergradasi. Kanal kecerahan
    hanya cadangan; pada gradasi cahaya ia "terbelah" jadi sisi terang/gelap
    alas dan menghasilkan bintik tekstur, bukan benih.
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    for i, ch in enumerate((hsv[:, :, 1], hsv[:, :, 2], 255 - hsv[:, :, 2])):
        blur = cv2.GaussianBlur(ch, (5, 5), 0)
        _, m = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        # 10 benih kecil di foto 12 MP hanya ~0,5% piksel
        if not 0.001 < (m > 0).mean() < 0.6:
            continue
        if i == 0:  # kanal saturasi
            m = _rapikan_tepi(hsv[:, :, 2], m)
        kontur = _kontur_benih(img, m)
        if kontur:
            return kontur
    return []


def _rapikan_tepi(v: np.ndarray, topeng: np.ndarray) -> np.ndarray:
    """Perbaiki tepi topeng saturasi dengan kecerahan relatif terhadap latar.

    Saturasi saja ikut menangkap bayangan benih (cokelat = jenuh) dan kehilangan
    sisi benih pucat yang terkena cahaya (hampir putih = tak jenuh). Di dalam zona
    topeng yang dilebarkan, benih adalah piksel yang jelas lebih terang dari
    latar setempat; ambang Otsu dihitung hanya di zona itu agar tidak lari ke
    tekstur alas.
    """
    kecil = cv2.resize(v, None, fx=0.1, fy=0.1, interpolation=cv2.INTER_AREA)
    latar = cv2.resize(cv2.medianBlur(kecil, 31), (v.shape[1], v.shape[0]))
    terang = cv2.GaussianBlur(cv2.subtract(v, latar), (5, 5), 0)
    zona = cv2.dilate(topeng, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))) > 0
    t, _ = cv2.threshold(terang[zona].reshape(-1, 1), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return ((terang > t) & zona).astype(np.uint8) * 255


def _kontur_benih(img: np.ndarray, topeng: np.ndarray) -> list[np.ndarray]:
    h, w = img.shape[:2]
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    m = cv2.morphologyEx(topeng, cv2.MORPH_OPEN, k)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k, iterations=2)
    # buang objek yang menyentuh tepi foto (dinding light box, dsb.) lebih dulu:
    # objek di pojok (0,0) merusak floodFill di bawah, dan objek besar menaikkan
    # jarak.max() sehingga inti benih jatuh di bawah ambang 0,5
    _, lbl, st, _ = cv2.connectedComponentsWithStats(m)
    tepi = (st[:, 0] <= 1) | (st[:, 1] <= 1) | (st[:, 0] + st[:, 2] >= w - 1) | (st[:, 1] + st[:, 3] >= h - 1)
    m[tepi[lbl] & (m > 0)] = 0
    if not m.any():
        return []
    # isi lubang (bintik gelap/noda di dalam benih tidak boleh jadi lubang)
    isi = m.copy()
    mask_ff = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(isi, mask_ff, (0, 0), 255)
    m = m | cv2.bitwise_not(isi)

    # pisahkan benih yang bersentuhan
    jarak = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    _, inti = cv2.threshold(jarak, 0.5 * jarak.max(), 255, 0)
    inti = inti.astype(np.uint8)
    n, penanda = cv2.connectedComponents(inti)
    penanda = penanda + 1
    penanda[(cv2.dilate(m, k, iterations=3) > 0) & (inti == 0)] = 0
    penanda[m == 0] = 1
    penanda = cv2.watershed(img, penanda)

    kontur = []
    for lbl in range(2, n + 1):
        comp = ((penanda == lbl) & (m > 0)).astype(np.uint8)
        cs, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not cs:
            continue
        c = max(cs, key=cv2.contourArea)
        x, y, bw, bh = cv2.boundingRect(c)
        if x <= 1 or y <= 1 or x + bw >= w - 1 or y + bh >= h - 1:
            continue  # terpotong tepi foto: jangan dianotasi
        kontur.append(c)
    if not kontur:
        return []
    luas = np.array([cv2.contourArea(c) for c in kontur])
    med = np.median(luas)
    # buang debu/serpihan (< 15% median) dan gumpalan raksasa (> 4x median)
    return [c for c, a in zip(kontur, luas) if 0.15 * med < a < 4 * med]


def kelas_dari_tata_letak(kontur: list[np.ndarray], jelek: int) -> tuple[list[int], float]:
    """Foto campuran S03: benih baik dan jelek disusun dua kelompok terpisah.

    Kolom "Posisi benih baik" di log TIDAK cocok dengan foto (dicek 3 Nov 2026):
    kenyataannya VA & VC selalu dua kolom dengan jelek di KIRI, VB dua baris dengan
    jelek di BAWAH. Sumbu dipilih dari celah antar-kelompok yang lebih lebar.
    Kembalikan juga rasio celah (celah antar-kelompok / median jarak tetangga);
    < 1,5 berarti kelompok tidak terpisah jelas -> periksa manual.
    """
    pusat = np.array([c.reshape(-1, 2).mean(0) for c in kontur])
    if not 0 < jelek < len(kontur):
        return [1] * len(kontur), 0.0
    terbaik = None
    for sumbu, tanda in ((0, 1), (1, -1)):  # kolom: kiri dulu; baris: bawah dulu
        v = pusat[:, sumbu] * tanda
        p = np.sort(v)
        rasio = (p[jelek] - p[jelek - 1]) / max(np.median(np.diff(p)), 1e-9)
        if terbaik is None or rasio > terbaik[0]:
            terbaik = (rasio, np.argsort(v))
    rasio, urut = terbaik
    kelas = [0] * len(kontur)
    for i in urut[:jelek]:
        kelas[i] = 1
    return kelas, float(rasio)


def ke_baris_yolo(c: np.ndarray, kelas: int, w: int, h: int) -> str:
    eps = 0.004 * cv2.arcLength(c, True)
    p = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
    if len(p) < 3:
        p = c.reshape(-1, 2)
    koord = " ".join(f"{x / w:.5f} {y / h:.5f}" for x, y in p)
    return f"{kelas} {koord}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--masuk", required=True, type=Path)
    ap.add_argument("--keluar", required=True, type=Path)
    ap.add_argument("--posisi", type=Path,
                    help="posisi_SXX.csv dari siapkan_sesi.py; hanya foto di daftar ini yang diproses")
    a = ap.parse_args()
    posisi = {}
    if a.posisi:
        with open(a.posisi, encoding="utf-8") as fh:
            posisi = {r["nama"]: r for r in csv.DictReader(fh)}

    for s in ("train", "valid", "test"):
        (a.keluar / s / "images").mkdir(parents=True, exist_ok=True)
        (a.keluar / s / "labels").mkdir(parents=True, exist_ok=True)
    (a.keluar / "pratinjau").mkdir(parents=True, exist_ok=True)

    baris_lap = []
    berkas = sorted(p for p in a.masuk.iterdir()
                    if p.suffix.lower() in (".jpg", ".jpeg", ".png"))
    if posisi:
        berkas = [p for p in berkas if p.stem in posisi]
    for p in berkas:
        cocok = POLA.match(p.stem)
        if not cocok:
            print(f"[lewati] nama tidak sesuai konvensi: {p.name}")
            continue
        if cocok["tipe"] == "L":
            continue
        img = cv2.imread(str(p))
        if img is None:
            print(f"[lewati] tidak terbaca: {p.name}")
            continue
        h, w = img.shape[:2]
        kontur = segmentasi(tutup_aruco(img))
        kelas = TIPE_KE_KELAS[cocok["tipe"]]
        kelas_tiap = [kelas] * len(kontur)
        catatan = ""
        if p.stem in posisi:
            r = posisi[p.stem]
            kelas_tiap, rasio = kelas_dari_tata_letak(kontur, int(r["jelek"]))
            harap = int(r["baik"]) + int(r["jelek"])
            if len(kontur) != harap or rasio < 1.5:
                catatan = f"PERIKSA (harap {harap}, celah {rasio:.1f})"
        split = cocok["split"]
        shutil.copy2(p, a.keluar / split / "images" / p.name)
        (a.keluar / split / "labels" / f"{p.stem}.txt").write_text(
            "\n".join(ke_baris_yolo(c, k, w, h) for c, k in zip(kontur, kelas_tiap)) + "\n")

        prev = img.copy()
        for c, k in zip(kontur, kelas_tiap):
            cv2.drawContours(prev, [c], -1, (90, 200, 60) if k == 0 else (0, 140, 255), max(2, w // 900))
        cv2.putText(prev, f"{len(kontur)} benih {catatan}", (30, 80), cv2.FONT_HERSHEY_SIMPLEX,
                    w / 1400, (255, 255, 255), max(2, w // 700))
        skala = 1600 / max(w, h)
        cv2.imwrite(str(a.keluar / "pratinjau" / p.name),
                    cv2.resize(prev, None, fx=skala, fy=skala))
        baris_lap.append([p.name, cocok["var"], cocok["tipe"], split, cocok["sesi"], len(kontur), catatan])
        print(f"{p.name}: {len(kontur)} benih {catatan}")

    (a.keluar / "data.yaml").write_text(
        "train: train/images\nval: valid/images\ntest: test/images\n"
        f"nc: {len(KELAS)}\nnames: {KELAS}\n")
    with open(a.keluar / "laporan.csv", "w", newline="") as f:
        csv.writer(f).writerows([["berkas", "varietas", "tipe", "split", "sesi",
                                  "terdeteksi", "catatan"]] + baris_lap)
    print(f"Selesai. Bandingkan kolom 'terdeteksi' di laporan.csv dengan jumlah benih "
          f"yang kalian taruh di lembar log.")


if __name__ == "__main__":
    main()

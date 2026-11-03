"""Tahap 2: klasifikasi baik/cacat per benih dari ciri fisik + varietas.

Tahap 1 (YOLO v2 di Colab) sudah tepat menemukan dan menghitung benih, tetapi
kelas cacatnya gagal: benih cacat di wadah valid/test (mulus, lebih besar)
berbeda jenis dari wadah train (keriput, gemuk). Karena itu wadah valid ikut
dilatih; wadah test tetap tidak tersentuh (butirnya tidak pernah difoto di wadah
lain, jadi tidak bocor).

Varietas wajib jadi masukan: benih VA cacat seukuran benih VB/VC baik.
Varietas = varietas LOT (awalan nama foto), bukan varietas asli tiap benih: hanya
itu yang diketahui operator saat inferensi, dan varietas per benih akan
membocorkan label. Sejak S03, benih "cacat" di foto VB/VC adalah benih VA jelek
yang dicampur (VB/VC tidak punya benih rusak sendiri). Artinya untuk lot VB/VC
model belajar "benih varietas lain / VA jelek", BUKAN kerusakan VB/VC; karena
itu akurasi dilaporkan dan diuji per varietas, bukan hanya gabungan.

Pemakaian:
    python klasifikasi_benih.py --data potong1664 --keluar klasifikasi_benih.joblib
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier

VARIETAS = ["VA", "VB", "VC"]
FITUR = ["luas", "lonjong", "soliditas", "H", "S", "V", "sebaran_V", "tekstur"]
SISI = 1664  # ukuran potongan potong_lot.py; luas dalam piksel skala asli


def ciri(img: np.ndarray, poli: np.ndarray, varietas: str) -> list[float]:
    """Ciri satu benih. Urutan TETAP: model tersimpan bergantung padanya."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    m = np.zeros(img.shape[:2], np.uint8)
    cv2.fillPoly(m, [poli], 255)
    luas = cv2.contourArea(poli)
    (_, _), (w, h), _ = cv2.minAreaRect(poli)
    px = hsv[m > 0].astype(float)
    lap = np.abs(cv2.Laplacian(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), cv2.CV_64F))[m > 0]
    dasar = [luas, max(w, h) / max(min(w, h), 1),
             luas / max(cv2.contourArea(cv2.convexHull(poli)), 1),
             *px.mean(0), px[:, 2].std(), lap.mean()]
    satu = [float(varietas == v) for v in VARIETAS]
    # interaksi varietas x ciri: ambang ukuran/bentuk berbeda per varietas
    return satu + dasar + [s * d for s in satu for d in dasar]


def baca(folder: Path) -> tuple[np.ndarray, np.ndarray]:
    X, y = [], []
    for f in sorted(folder.glob("labels/*.txt")):
        img = cv2.imread(str(folder / "images" / f"{f.stem}.jpg"))
        for b in f.read_text().splitlines():
            if b.strip():
                v = b.split()
                poli = (np.array(v[1:], float).reshape(-1, 2) * SISI).astype(np.int32)
                X.append(ciri(img, poli, f.stem.split("_")[0]))
                y.append(int(v[0]))
    return np.array(X), np.array(y)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, type=Path)
    ap.add_argument("--keluar", required=True, type=Path)
    a = ap.parse_args()

    Xtr, ytr = map(np.concatenate, zip(baca(a.data / "train"), baca(a.data / "valid")))
    Xte, yte = baca(a.data / "test")
    # v3 (3 Nov 2026, test S01-S03): logreg VA .974 VB .943 VC .834; HGB VA .990 VB .960 VC .866
    model = HistGradientBoostingClassifier(max_iter=400, learning_rate=0.05,
                                           class_weight="balanced", random_state=0)
    model.fit(Xtr, ytr)

    p = model.predict(Xte)
    lulus = True
    # kolom 0..2 = one-hot varietas lot; None = gabungan
    for i, nama in [(None, "semua")] + list(enumerate(VARIETAS)):
        pilih = np.ones(len(yte), bool) if i is None else Xte[:, i] == 1
        if not pilih.any():
            continue
        y, q = yte[pilih], p[pilih]
        c = y == 1
        akurasi = np.mean(q == y)
        print(f"TEST {nama:5s}: akurasi {akurasi:.3f} | cacat tepat {np.sum(q[c] == 1)}/{c.sum()} | "
              f"baik salah jadi cacat {np.sum(q[~c] == 1)}/{(~c).sum()}")
        lulus &= akurasi > 0.9
    assert lulus, "akurasi test (gabungan atau salah satu varietas) di bawah 0,9: jangan dipakai"
    joblib.dump({"model": model, "varietas": VARIETAS, "fitur": FITUR, "sisi": SISI}, a.keluar)
    print("Tersimpan:", a.keluar)


if __name__ == "__main__":
    main()

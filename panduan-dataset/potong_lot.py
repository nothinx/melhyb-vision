"""Potong foto mentah ke area kelompok benih (resolusi asli) + sesuaikan label YOLO-seg.

Foto 12 MP sebagian besar berisi alas kosong; kalau seluruh foto diperkecil ke
1280 px, benih tinggal ±47 px dan ciri cacat (sobek, keriput) hilang. Potongan
persegi 1664 px di sekitar benih, dilatih pada imgsz 1664, menjaga skala asli (±110 px).

Konsekuensi untuk inferensi: model hasilnya mengharapkan potongan serupa
(area benih + margin), bukan foto utuh yang diperkecil.

Pemakaian:
    python potong_lot.py --foto foto_mentah --label dataset_yolo --keluar dataset_potong
    (--label = folder berisi train/valid/test/labels hasil pra_anotasi/perapian)
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np

SISI = 1664  # ukuran potongan tetap (kelipatan 32): skala piksel sama di semua foto,
#              karena ukuran benih adalah ciri cacat dan tidak boleh ikut berubah


def _kelompok(poli: list[np.ndarray], sisi: int) -> list[list[int]]:
    """Bagi benih ke kelompok yang masing-masing muat di satu potongan `sisi` px.

    S03 menyebar sampai ±2200 px; satu potongan 1664 akan memotong benih tepi.
    Rakus menurut sumbu terpanjang: tambah benih selama kotak kelompok masih muat.
    """
    semua = np.vstack(poli)
    sumbu = int(np.argmax(semua.max(0) - semua.min(0)))
    urut = sorted(range(len(poli)), key=lambda i: poli[i][:, sumbu].mean())
    grup, isi = [], []
    for i in urut:
        coba = np.vstack([poli[j] for j in isi + [i]])
        if isi and (coba.max(0) - coba.min(0) > sisi - 16).any():
            grup.append(isi)
            isi = []
        isi.append(i)
    return grup + [isi]


def potong(img: np.ndarray, poli: list[np.ndarray], kelas: list[str]):
    """Kembalikan daftar (potongan, poligon, kelas). Skala piksel tidak diubah.

    Benih yang hanya sebagian masuk potongan ditutup warna latar (seperti
    tutup_aruco di pra_anotasi.py): benih terpotong tanpa label akan diajarkan
    sebagai latar.
    """
    h, w = img.shape[:2]
    sisi = min(SISI, w, h)
    latar = np.median(img.reshape(-1, 3), axis=0).tolist()
    hasil = []
    for grup in _kelompok(poli, sisi):
        g = np.vstack([poli[i] for i in grup])
        cx, cy = (g.min(0) + g.max(0)) / 2
        kx = int(np.clip(cx - sisi / 2, 0, w - sisi))
        ky = int(np.clip(cy - sisi / 2, 0, h - sisi))
        crop = img[ky:ky + sisi, kx:kx + sisi].copy()
        p_out, k_out = [], []
        for p, k in zip(poli, kelas):
            q = p - [kx, ky]
            if (q >= 0).all() and (q < sisi).all():
                p_out.append(q)
                k_out.append(k)
            elif ((q >= 0) & (q < sisi)).all(1).any():
                qi = q.astype(np.int32)
                cv2.fillPoly(crop, [qi], latar)
                cv2.polylines(crop, [qi], True, latar, 25)  # ikut tutup bayangan tepi
        hasil.append((crop, p_out, k_out))
    return hasil


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--foto", required=True, type=Path)
    ap.add_argument("--label", required=True, type=Path)
    ap.add_argument("--keluar", required=True, type=Path)
    a = ap.parse_args()

    for lbl in sorted(a.label.glob("*/labels/*.txt")):
        split = lbl.parent.parent.name
        img = cv2.imread(str(a.foto / f"{lbl.stem}.jpg"))
        h, w = img.shape[:2]
        kelas, poli = [], []
        for baris in lbl.read_text().splitlines():
            if baris.strip():
                v = baris.split()
                kelas.append(v[0])
                poli.append(np.array(v[1:], float).reshape(-1, 2) * [w, h])
        if not poli:
            continue
        (a.keluar / split / "images").mkdir(parents=True, exist_ok=True)
        (a.keluar / split / "labels").mkdir(parents=True, exist_ok=True)
        bagian = potong(img, poli, kelas)
        for n, (crop, p_out, k_out) in enumerate(bagian):
            # satu potongan -> nama sama seperti dulu; lebih -> akhiran _p1, _p2
            nama = lbl.stem if len(bagian) == 1 else f"{lbl.stem}_p{n + 1}"
            s = crop.shape[0]
            cv2.imwrite(str(a.keluar / split / "images" / f"{nama}.jpg"), crop,
                        [cv2.IMWRITE_JPEG_QUALITY, 95])
            (a.keluar / split / "labels" / f"{nama}.txt").write_text("".join(
                f"{k} " + " ".join(f"{x / s:.5f} {y / s:.5f}" for x, y in p) + "\n"
                for k, p in zip(k_out, p_out)))
            print(f"{split:5s} {nama}: {s}px, {len(p_out)} benih")

    (a.keluar / "data.yaml").write_text(
        "train: train/images\nval: valid/images\ntest: test/images\n"
        "nc: 2\nnames: ['baik', 'cacat']\n")


if __name__ == "__main__":
    main()

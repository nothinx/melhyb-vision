"""Ubah unduhan satu sesi Drive (format S03) ke foto_mentah + daftar posisi benih baik.

Struktur masuk:  S03/{VAR}/{split}/{VAR}{F}/IMG_*.HEIC  (20 foto per kantong, urut
nomor IMG = pencetan U01..U20) + S03/Log_Foto_S03.xlsx (kolom "Posisi benih baik").

Keluar:
    foto_mentah/{VAR}_M_{split}_S03_{NNN}.jpg   NNN = (F-1)*20 + U
    posisi.csv    nama,posisi,baik,jelek  -> dipakai pra_anotasi.py --posisi
    asal-usul.csv ditambah (nama_baru,asal)

Pemakaian:
    pip install pillow pillow-heif openpyxl
    python siapkan_sesi.py --sesi S03-unduh/S03 --keluar sigma-dataset
"""
from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

import openpyxl
import pillow_heif
from PIL import Image, ImageOps

pillow_heif.register_heif_opener()
NAMA_LOG = re.compile(r"^(V[A-Z])_(S\d+)_(train|valid|test)_F(\d+)_U(\d+)\.jpg$")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sesi", required=True, type=Path)
    ap.add_argument("--keluar", required=True, type=Path)
    a = ap.parse_args()
    sesi = a.sesi.name
    wb = openpyxl.load_workbook(next(a.sesi.glob("Log_*.xlsx")), data_only=True)
    log = {}
    for r in wb[f"Log {sesi}"].iter_rows(min_row=2, values_only=True):
        if r[1]:
            log[r[1]] = (r[14], int(r[12]), int(r[13]))  # posisi, jumlah baik, jumlah jelek

    mentah = a.keluar / "foto_mentah"
    mentah.mkdir(parents=True, exist_ok=True)
    pos, asal = [], []
    for kantong in sorted(a.sesi.glob("V*/*/V*")):
        var, split, f = kantong.parent.parent.name, kantong.parent.name, int(kantong.name[2:])
        foto = sorted(kantong.glob("*.HEIC"))
        assert len(foto) == 20, f"{kantong}: {len(foto)} foto, harus 20"
        for u, p in enumerate(foto, 1):
            nama_log = f"{var}_{sesi}_{split}_F{f:02d}_U{u:02d}.jpg"
            posisi, baik, jelek = log[nama_log]
            nama = f"{var}_M_{split}_{sesi}_{(f - 1) * 20 + u:03d}"
            tujuan = mentah / f"{nama}.jpg"
            if not tujuan.exists():
                ImageOps.exif_transpose(Image.open(p)).convert("RGB").save(tujuan, quality=95)
            pos.append([nama, posisi, baik, jelek])
            asal.append([f"foto_mentah\\{nama}.jpg", str(p.relative_to(a.sesi.parent))])
            print(nama, posisi)

    with open(a.keluar / f"posisi_{sesi}.csv", "w", newline="", encoding="utf-8") as fh:
        csv.writer(fh).writerows([["nama", "posisi", "baik", "jelek"]] + pos)
    with open(a.keluar / "asal-usul.csv", "a", newline="", encoding="utf-8") as fh:
        csv.writer(fh).writerows(asal)


if __name__ == "__main__":
    main()

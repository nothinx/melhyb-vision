"""Perhitungan hasil uji perkecambahan (UKDdP).

Rumus daya berkecambah mengikuti yang tercantum di proposal:

    DB (%) = (A + B) / N x 100

    A = jumlah kecambah normal pada hitungan pertama
    B = jumlah kecambah normal pada hitungan terakhir
    N = jumlah seluruh benih yang diuji

Dua parameter lain dihitung dengan penyederhanaan yang dinyatakan terbuka,
karena hanya tersedia dua kali pengamatan, bukan pengamatan harian:

- Kecepatan tumbuh (K_CT) versi lengkap menjumlahkan persentase kecambah
  normal pada SETIAP etmal dibagi etmalnya. Dengan dua pengamatan, yang bisa
  dihitung adalah pendekatan dua suku. Isi `hitungan_harian` kalau pengamatan
  harian tersedia, dan rumus penuh yang dipakai.
- Keserempakan tumbuh di sini didefinisikan sebagai persentase kecambah
  normal yang sudah muncul pada hitungan pertama. Definisi ini harus ditulis
  apa adanya di laporan, jangan disamakan begitu saja dengan definisi lain
  di literatur.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class UKDdPResult:
    daya_berkecambah: float
    kecepatan_tumbuh: float | None
    keserempakan_tumbuh: float | None
    metode_kecepatan: str
    peringatan: list[str]


def hitung(
    jumlah_benih: int,
    normal_hitungan_1: int,
    normal_hitungan_2: int,
    abnormal: int = 0,
    tidak_tumbuh: int = 0,
    tanggal_tanam: date | None = None,
    tanggal_hitung_1: date | None = None,
    tanggal_hitung_2: date | None = None,
    hitungan_harian: list[dict] | None = None,
) -> UKDdPResult:
    if jumlah_benih <= 0:
        raise ValueError("Jumlah benih yang diuji harus lebih dari nol.")

    warn: list[str] = []
    total = normal_hitungan_1 + normal_hitungan_2 + abnormal + tidak_tumbuh
    if total > jumlah_benih:
        raise ValueError(
            f"Total pengamatan ({total}) melebihi jumlah benih diuji "
            f"({jumlah_benih}). Periksa kembali pencatatan.")
    if total < jumlah_benih:
        warn.append(
            f"{jumlah_benih - total} benih belum terklasifikasi (normal / "
            f"abnormal / tidak tumbuh). Hasil tetap dihitung terhadap N penuh.")

    db = (normal_hitungan_1 + normal_hitungan_2) / jumlah_benih * 100.0
    keserempakan = normal_hitungan_1 / jumlah_benih * 100.0

    kct: float | None = None
    metode = "tidak dihitung"
    if hitungan_harian:
        # K_CT = sum( %kecambah normal pada etmal-i / etmal-i )
        kct = 0.0
        for row in hitungan_harian:
            etmal = float(row.get("etmal", 0) or 0)
            n = float(row.get("normal", 0) or 0)
            if etmal > 0:
                kct += (n / jumlah_benih * 100.0) / etmal
        metode = "penuh (pengamatan harian)"
    elif tanggal_tanam and tanggal_hitung_1 and tanggal_hitung_2:
        t1 = (tanggal_hitung_1 - tanggal_tanam).days
        t2 = (tanggal_hitung_2 - tanggal_tanam).days
        if t1 > 0 and t2 > 0:
            kct = ((normal_hitungan_1 / jumlah_benih * 100.0) / t1
                   + (normal_hitungan_2 / jumlah_benih * 100.0) / t2)
            metode = "pendekatan dua suku (hanya dua kali pengamatan)"
            warn.append(
                "Kecepatan tumbuh dihitung dari dua pengamatan saja. Untuk "
                "laporan akhir, catat pengamatan harian agar rumus K_CT penuh "
                "bisa dipakai.")
        else:
            warn.append("Tanggal hitungan tidak valid; kecepatan tumbuh dilewati.")
    else:
        warn.append(
            "Tanggal tanam / hitungan belum lengkap, kecepatan tumbuh tidak "
            "dihitung.")

    return UKDdPResult(
        daya_berkecambah=round(db, 2),
        kecepatan_tumbuh=round(kct, 3) if kct is not None else None,
        keserempakan_tumbuh=round(keserempakan, 2),
        metode_kecepatan=metode,
        peringatan=warn,
    )

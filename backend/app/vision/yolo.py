"""Segmentasi + kelas baik/cacat per benih dengan YOLO26s-seg v3 (ONNX).

Model dilatih pada potongan 1664 px SKALA ASLI (ukuran benih ikut jadi ciri
cacat), jadi foto tidak diperkecil: foto dipecah jadi ubin 1664 px yang saling
tumpang, tiap ubin dideteksi, lalu hasilnya digabung. Benih yang menyentuh tepi
dalam ubin dibuang karena utuh di ubin tetangga (tumpang > ukuran benih).

Hasil uji (wadah test S01-S03, 3 Nov 2026): akurasi per benih 0,995, cacat
658/665, conf 0,15. Batasan: "cacat" di lot VB/VC = benih VA jelek yang
tercampur; foto dari light box dan tim yang sama.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

from .segment import Segmentation

SISI = 1664
TUMPANG = 384          # harus > diameter benih terbesar dalam piksel asli
SKALA_PROTO = 4        # proto 416 = 1664 / 4
NAMA = "yolo26s-seg v3"


@lru_cache(maxsize=2)
def _sesi(path: str):
    import onnxruntime as ort  # impor lambat: backend tetap jalan tanpa paket ini
    # Arena + pola memori bawaan membuat puncak 1,9 GB untuk input 1664 px;
    # tanpa keduanya ~1 GB (Vercel Standard = 2 GB, sempat SIGKILL).
    o = ort.SessionOptions()
    o.enable_cpu_mem_arena = False
    o.enable_mem_pattern = False
    return ort.InferenceSession(path, o, providers=["CPUExecutionProvider"])


def tersedia(path: Path) -> bool:
    if not path.is_file():
        return False
    try:
        import onnxruntime  # noqa: F401
    except ImportError:
        return False
    return True


def _awal(panjang: int) -> list[int]:
    if panjang <= SISI:
        return [0]
    titik = list(range(0, panjang - SISI, SISI - TUMPANG))
    return titik + [panjang - SISI]


def _ubin(sesi, ubin: np.ndarray, conf: float):
    """Satu ubin 1664x1664 BGR -> daftar (kotak xyxy, skor, kelas, topeng lokal)."""
    x = cv2.cvtColor(ubin, cv2.COLOR_BGR2RGB).transpose(2, 0, 1)[None].astype(np.float32) / 255
    out0, proto = sesi.run(None, {sesi.get_inputs()[0].name: x})
    p = out0[0].T                                   # (N, 4 + 2 + 32)
    skor_kls = p[:, 4:6]
    skor = skor_kls.max(1)
    p, skor, kls = p[skor >= conf], skor[skor >= conf], skor_kls[skor >= conf].argmax(1)
    if not len(p):
        return []
    cx, cy, w, h = p[:, 0], p[:, 1], p[:, 2], p[:, 3]
    kotak = np.stack([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], 1).clip(0, SISI)
    # NMS tanpa memandang kelas: satu benih hanya boleh satu kelas.
    pilih = cv2.dnn.NMSBoxes([[float(a), float(b), float(c - a), float(d - b)] for a, b, c, d in kotak],
                             skor.tolist(), conf, 0.5)
    proto = proto[0]
    hasil = []
    for i in np.array(pilih).reshape(-1):
        x1, y1, x2, y2 = kotak[i].astype(int)
        if x2 - x1 < 4 or y2 - y1 < 4:
            continue
        px1, py1 = x1 // SKALA_PROTO, y1 // SKALA_PROTO
        px2, py2 = -(-x2 // SKALA_PROTO), -(-y2 // SKALA_PROTO)
        m = np.tensordot(p[i, 6:], proto[:, py1:py2, px1:px2], 1)
        m = cv2.resize(m, ((px2 - px1) * SKALA_PROTO, (py2 - py1) * SKALA_PROTO))
        m = m[y1 - py1 * SKALA_PROTO: y2 - py1 * SKALA_PROTO,
              x1 - px1 * SKALA_PROTO: x2 - px1 * SKALA_PROTO] > 0   # logit > 0 = sigmoid > 0,5
        hasil.append((kotak[i], float(skor[i]), int(kls[i]), m))
    return hasil


def segment_yolo(img: np.ndarray, model: Path, conf: float) -> Segmentation:
    """Foto BGR utuh (tanpa gray-world: model dilatih pada warna asli kamera)."""
    sesi = _sesi(str(model))
    h, w = img.shape[:2]
    latar = np.median(img.reshape(-1, 3)[::97], 0).astype(np.uint8)
    H, W = max(h, SISI), max(w, SISI)
    kanvas = np.empty((H, W, 3), np.uint8)
    kanvas[:] = latar                       # potongan training juga ditutup warna latar
    kanvas[:h, :w] = img

    deteksi = []                            # (kotak global, skor, kelas, topeng)
    for oy in _awal(H):
        for ox in _awal(W):
            for k, s, c, m in _ubin(sesi, kanvas[oy:oy + SISI, ox:ox + SISI], conf):
                x1, y1, x2, y2 = k
                # tepi dalam ubin: benihnya terpotong, ambil dari ubin tetangga
                if (x1 < 2 and ox > 0) or (y1 < 2 and oy > 0) or \
                   (x2 > SISI - 2 and ox + SISI < W) or (y2 > SISI - 2 and oy + SISI < H):
                    continue
                deteksi.append((k + [ox, oy, ox, oy], s, c, m))
    # benih di area tumpang terdeteksi dua kali: NMS global
    if deteksi:
        kotak = [[float(k[0]), float(k[1]), float(k[2] - k[0]), float(k[3] - k[1])] for k, *_ in deteksi]
        pilih = np.array(cv2.dnn.NMSBoxes(kotak, [d[1] for d in deteksi], conf, 0.5)).reshape(-1)
        deteksi = sorted((deteksi[i] for i in pilih), key=lambda d: -d[1])

    label = np.zeros((H, W), np.int32)
    cacat: dict[int, bool] = {}
    tepi = 0
    n = 0
    for k, _, c, m in deteksi:
        x1, y1 = int(k[0]), int(k[1])
        x2, y2 = x1 + m.shape[1], y1 + m.shape[0]
        if x1 <= 0 or y1 <= 0 or x2 >= w or y2 >= h:
            tepi += 1                       # terpotong tepi foto: ukuran tak sah
            continue
        bebas = m & (label[y1:y2, x1:x2] == 0)
        if bebas.sum() < 50:
            continue
        n += 1
        label[y1:y2, x1:x2][bebas] = n
        cacat[n] = c == 1
    label = label[:h, :w]
    return Segmentation(labels=label, count=n, foreground_ratio=float((label > 0).mean()),
                        channel_used=NAMA, border_removed=tepi, watershed_splits=0, cacat=cacat)

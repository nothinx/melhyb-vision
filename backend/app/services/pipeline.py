"""Orkestrasi satu analisis: citra masuk -> putusan keluar.

Urutannya sengaja: gerbang kualitas dulu, baru pengukuran, baru estimasi,
baru putusan. Aplikasi lama langsung meloncat ke angka.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from pathlib import Path

import cv2

from ..config import settings
from ..scoring import calibration
from ..scoring.grading import Verdict, decide
from ..scoring.indices import Index, compute_indices, physical_quality_index
from ..vision.features import (LotFeatures, aggregate_lot, defect_flags,
                               extract_seed_features)
from ..vision.preprocess import (ImageGate, ScaleInfo, check_image,
                                 decode_image, detect_scale, gray_world_balance)
from ..vision import yolo
from ..vision.segment import annotate, segment_seeds


class AnalysisRejected(Exception):
    def __init__(self, payload: dict):
        self.payload = payload
        super().__init__(payload.get("pesan", "Analisis ditolak."))


@dataclass
class AnalysisOutput:
    gate: ImageGate
    scale: ScaleInfo
    lot: LotFeatures
    indices: list[Index]
    imf: float
    estimates: list[calibration.Estimate]
    verdict: Verdict
    image_path: Path
    annotated_path: Path
    segmentation_meta: dict

    def as_dict(self) -> dict:
        return {
            "gerbang_citra": self.gate.as_dict(),
            "skala": self.scale.as_dict(),
            "segmentasi": self.segmentation_meta,
            "fitur_lot": self.lot.as_dict(),
            "indeks_terukur": [i.as_dict() for i in self.indices],
            "indeks_mutu_fisik": round(self.imf, 1),
            "estimasi_fisiologis": [e.as_dict() for e in self.estimates],
            "putusan": self.verdict.as_dict(),
            "berkas_citra": self.image_path.name,
            "berkas_anotasi": self.annotated_path.name,
        }


def run(data: bytes, komoditas: str, marker_mm: float = 20.0) -> AnalysisOutput:
    img = decode_image(data)

    # 1. Gerbang kualitas citra - menolak lebih dulu, bukan menilai apa pun.
    gate = check_image(img)
    if not gate.passed:
        raise AnalysisRejected({
            "pesan": "Foto belum memenuhi syarat untuk dianalisis.",
            "gerbang_citra": gate.as_dict(),
        })

    balanced = gray_world_balance(img)
    scale = detect_scale(balanced, marker_mm=marker_mm)

    # 2. Segmentasi: satu foto = satu lot berisi banyak benih.
    # YOLO memakai warna asli (begitu dilatih); cadangannya Otsu + watershed.
    if yolo.tersedia(settings.yolo_model):
        seg = yolo.segment_yolo(img, settings.yolo_model, settings.yolo_conf)
    else:
        seg = segment_seeds(balanced)
    if seg.count < settings.min_seeds_detected:
        raise AnalysisRejected({
            "pesan": (
                f"Hanya {seg.count} benih terdeteksi, minimal "
                f"{settings.min_seeds_detected} diperlukan untuk analisis lot. "
                f"Sebarkan lebih banyak benih pada latar polos yang kontras, "
                f"jangan bertumpuk."),
            "gerbang_citra": gate.as_dict(),
            "jumlah_terdeteksi": seg.count,
        })
    if seg.count > settings.max_seeds_detected:
        raise AnalysisRejected({
            "pesan": (
                f"{seg.count} objek terdeteksi. Benih mungkin terlalu rapat "
                f"atau bagian latar ikut dikenali sebagai objek. Gunakan latar polos "
                f"dan sebarkan benih agar tidak saling menempel."),
            "gerbang_citra": gate.as_dict(),
            "jumlah_terdeteksi": seg.count,
        })

    # 3. Morfometrik terukur.
    feats = extract_seed_features(balanced, seg, scale)
    lot = aggregate_lot(feats, settings.defect_solidity_threshold, scale, seg)
    indices = compute_indices(lot)
    imf = physical_quality_index(indices)

    # 4. Estimasi fisiologis - hanya kalau modelnya sudah lolos validasi.
    estimates: list[calibration.Estimate] = []
    for target in calibration.TARGETS:
        est = calibration.predict(komoditas, target, lot)
        if est:
            estimates.append(est)
    # Estimasi hasil ekstrapolasi tetap ditampilkan apa adanya, tetapi tidak
    # boleh ikut menentukan kelas mutu.
    by_target = {e.target: e for e in estimates if e.usable}
    db_est = by_target.get("daya_berkecambah")
    vg_est = by_target.get("kecepatan_tumbuh")

    verdict = decide(
        komoditas, imf,
        db_est.value if db_est else None,
        db_est.lower if db_est else None,
        vg_est.value if vg_est else None,
    )

    # 5. Simpan citra asli dan citra beranotasi.
    stem = uuid.uuid4().hex[:16]
    img_path = settings.storage_dir / f"{stem}.jpg"
    ann_path = settings.storage_dir / f"{stem}_anotasi.jpg"
    cv2.imwrite(str(img_path), img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    cv2.imwrite(str(ann_path),
                annotate(img, seg,
                         defect_flags(feats, settings.defect_solidity_threshold, seg)),
                [cv2.IMWRITE_JPEG_QUALITY, 90])

    return AnalysisOutput(
        gate=gate, scale=scale, lot=lot, indices=indices, imf=imf,
        estimates=estimates, verdict=verdict,
        image_path=img_path, annotated_path=ann_path,
        segmentation_meta={
            "jumlah_benih": seg.count,
            "kanal_dipakai": seg.channel_used,
            "dibuang_karena_tepi": seg.border_removed,
            "dipisah_watershed": seg.watershed_splits,
            "rasio_objek": round(seg.foreground_ratio, 4),
        },
    )

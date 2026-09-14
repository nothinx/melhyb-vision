"""Buat citra benih sintetis untuk pengujian pipeline tanpa foto asli."""
import cv2
import numpy as np


def synthetic_lot(n=90, defect_ratio=0.12, size_cv=0.10, seed=7,
                  w=1600, h=1200):
    rng = np.random.default_rng(seed)
    img = np.full((h, w, 3), (235, 238, 240), np.uint8)   # latar terang polos
    img += rng.normal(0, 2, img.shape).astype(np.int16).clip(-6, 6).astype(np.uint8)

    placed, tries = [], 0
    base = 30.0
    while len(placed) < n and tries < n * 200:
        tries += 1
        cx, cy = rng.integers(90, w - 90), rng.integers(90, h - 90)
        rx = float(base * (1 + rng.normal(0, size_cv)))
        ry = rx * rng.uniform(0.62, 0.74)
        if any((cx - px) ** 2 + (cy - py) ** 2 < (rx + pr + 14) ** 2
               for px, py, pr in placed):
            continue
        placed.append((cx, cy, rx))
        ang = rng.uniform(0, 180)
        col = (int(rng.normal(58, 5)), int(rng.normal(78, 5)),
               int(rng.normal(128, 7)))          # cokelat kemerahan (BGR)
        cv2.ellipse(img, (int(cx), int(cy)), (int(rx), int(ry)), ang, 0, 360,
                    col, -1, cv2.LINE_AA)
        if rng.random() < defect_ratio:
            # gigit sebagian benih -> solidity turun, meniru benih pecah
            cv2.circle(img, (int(cx + rx * 0.6), int(cy)), int(rx * 0.45),
                       (235, 238, 240), -1, cv2.LINE_AA)
    return img


if __name__ == "__main__":
    cv2.imwrite("/tmp/lot_good.jpg", synthetic_lot(defect_ratio=0.03, size_cv=0.05))
    cv2.imwrite("/tmp/lot_bad.jpg", synthetic_lot(defect_ratio=0.45, size_cv=0.28, seed=3))
    cv2.imwrite("/tmp/lot_blur.jpg",
                cv2.GaussianBlur(synthetic_lot(seed=5), (31, 31), 0))
    print("fixtures written")

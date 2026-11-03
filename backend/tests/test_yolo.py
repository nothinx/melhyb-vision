import numpy as np
import pytest

from app.config import BASE_DIR
from app.vision import yolo

MODEL = BASE_DIR / "model_visi" / "benih_yolo_v3.onnx"


def test_ubin_menutup_seluruh_foto_dengan_tumpang():
    for panjang in (1000, 1664, 3024, 4032):
        awal = yolo._awal(panjang)
        assert awal[0] == 0 and awal[-1] + yolo.SISI >= panjang
        for a, b in zip(awal, awal[1:]):
            assert a + yolo.SISI - b >= yolo.TUMPANG


@pytest.mark.skipif(not yolo.tersedia(MODEL), reason="model ONNX tidak ada")
def test_latar_polos_tanpa_benih():
    img = np.full((2000, 2500, 3), 90, np.uint8)
    s = yolo.segment_yolo(img, MODEL, 0.15)
    assert s.count == 0 and s.cacat == {} and s.labels.shape == (2000, 2500)

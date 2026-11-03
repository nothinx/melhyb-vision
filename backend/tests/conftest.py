import os
import sys
import tempfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

_tmp = tempfile.mkdtemp(prefix="sigma-test-")
os.environ["SIGMA_DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SIGMA_STORAGE_DIR"] = f"{_tmp}/storage"
os.environ["SIGMA_MODEL_DIR"] = f"{_tmp}/models"
# Fixture sintetis bukan foto light box: uji jalur Otsu, YOLO diuji di test_yolo.py.
os.environ["SIGMA_YOLO_MODEL"] = f"{_tmp}/tanpa-model.onnx"

from fastapi.testclient import TestClient          # noqa: E402
from app.main import app                            # noqa: E402
from tests.make_fixture import synthetic_lot        # noqa: E402
import cv2                                          # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _encode(img) -> bytes:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    assert ok
    return buf.tobytes()


@pytest.fixture(scope="session")
def lot_bagus() -> bytes:
    return _encode(synthetic_lot(defect_ratio=0.03, size_cv=0.05, seed=7))


@pytest.fixture(scope="session")
def lot_buruk() -> bytes:
    return _encode(synthetic_lot(defect_ratio=0.45, size_cv=0.28, seed=3))


@pytest.fixture(scope="session")
def lot_buram() -> bytes:
    return _encode(cv2.GaussianBlur(synthetic_lot(seed=5), (31, 31), 0))


@pytest.fixture(scope="session")
def lot_kosong() -> bytes:
    return _encode(synthetic_lot(n=6, seed=11, w=800, h=680))

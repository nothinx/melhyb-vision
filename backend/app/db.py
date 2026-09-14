from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine, select

from .config import settings
from .models import Komoditas

engine = create_engine(
    settings.database_url, echo=False,
    connect_args={"check_same_thread": False}
    if settings.database_url.startswith("sqlite") else {},
)

SEED_KOMODITAS = [
    ("sorgum", "Sorgum", "Sorghum bicolor (L.) Moench", 80.0),
    ("melon", "Melon", "Cucumis melo L.", 75.0),
    ("edamame", "Edamame", "Glycine max (L.) Merr.", 80.0),
]


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        if not s.exec(select(Komoditas)).first():
            for slug, nama, latin, ambang in SEED_KOMODITAS:
                s.add(Komoditas(slug=slug, nama=nama, nama_latin=latin,
                                min_daya_berkecambah=ambang))
            s.commit()


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session

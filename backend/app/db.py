from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine, select

from .config import settings
from .models import Komoditas, Varietas

engine = create_engine(
    settings.database_url, echo=False,
    connect_args={"check_same_thread": False}
    if settings.database_url.startswith("sqlite") else {},
)

# Fokus penelitian: benih melon. Komoditas lain tetap bisa ditambah lewat
# POST /api/katalog/komoditas.
SEED_KOMODITAS = [
    ("melon", "Melon", "Cucumis melo L.", 75.0),
]

# Varietas melon yang diuji. Pemulia dan nomor pendaftaran sengaja kosong
# sampai dibaca dari label kemasan / dokumen pendaftaran varietas.
SEED_VARIETAS_MELON = [
    ("Golden Aroma", "Tipe Hami."),
    ("Honey Globe", "Tipe Juicy."),
    ("Apollo", "Tipe Crunchy."),
    ("Benih petani", "Pembanding: benih dari petani, tidak bersertifikat."),
]


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        if not s.exec(select(Komoditas)).first():
            for slug, nama, latin, ambang in SEED_KOMODITAS:
                s.add(Komoditas(slug=slug, nama=nama, nama_latin=latin,
                                min_daya_berkecambah=ambang))
            s.commit()
        melon = s.exec(select(Komoditas).where(Komoditas.slug == "melon")).first()
        if melon and not s.exec(select(Varietas)
                                .where(Varietas.komoditas_id == melon.id)).first():
            for nama, deskripsi in SEED_VARIETAS_MELON:
                s.add(Varietas(komoditas_id=melon.id, nama=nama,
                               deskripsi=deskripsi))
            s.commit()


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session

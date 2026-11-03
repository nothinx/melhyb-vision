"""Bangkitkan berkas ikon aplikasi dari satu definisi lambang.

Lambang MELHYB-VISION: satu benih di dalam lingkaran ukur — benda yang dinilai, dan
tindakan menilainya. Bentuk yang sama dipakai di kepala halaman (SVG sebaris
di Shell.tsx), sebagai favicon (public/ikon.svg), dan sebagai ikon aplikasi
saat dipasang ke layar utama ponsel (PNG di bawah).

Versi favicon sengaja lebih tebal daripada versi kepala halaman: garis 1,4px
pada viewBox 28 menghilang sama sekali di ubin 16px. Ini bukan aset yang sama
diperkecil, melainkan varian yang digambar untuk ukurannya.

Dijalankan sekali, hasilnya ikut disimpan di repo:

    backend/.venv/Scripts/python.exe frontend/skrip/buat-ikon.py

Butuh Pillow — sudah ada di requirements backend, bukan dependensi frontend.
"""
from pathlib import Path

from PIL import Image, ImageDraw

AKAR = Path(__file__).resolve().parent.parent
PUBLIC = AKAR / "public"

AKSEN = (15, 107, 78)      # --accent tema terang, #0f6b4e
TINTA = (255, 255, 255)
SS = 8                     # supersampling; tepi miring benih perlu ini


def gambar(sisi: int, *, radius_rel: float, latar=AKSEN) -> Image.Image:
    """Lambang pada kanvas persegi `sisi` piksel.

    Semua ukuran relatif terhadap sisi, jadi satu fungsi melayani 32px
    sampai 512px tanpa angka ajaib per ukuran.
    """
    n = sisi * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, n - 1, n - 1], radius=n * radius_rel, fill=latar)

    p = n / 2
    # Cincin ukur. Proporsinya ditentukan oleh ubin 16px, bukan oleh 512px:
    # pada percobaan pertama benih hampir menyentuh cincin, dan di ukuran
    # kecil keduanya melebur jadi satu gumpalan — gagasan "benih DI DALAM
    # lingkaran ukur" hilang persis di ukuran yang paling sering dilihat.
    # Jari-jari benih ditahan di ~52% jari-jari cincin supaya selalu ada
    # celah gelap yang memisahkan keduanya.
    r = n * 0.330
    tebal = max(SS, int(n * 0.046))
    d.ellipse([p - r, p - r, p + r, p + r],
              outline=TINTA + (215,), width=tebal)

    # Benih: elips yang dimiringkan. Digambar di lapis sendiri lalu diputar,
    # karena PIL tidak punya elips berotasi.
    rx, ry = n * 0.172, n * 0.113
    lapis = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(lapis).ellipse([p - rx, p - ry, p + rx, p + ry], fill=TINTA)
    img.alpha_composite(lapis.rotate(24, resample=Image.BICUBIC, center=(p, p)))

    return img.resize((sisi, sisi), Image.LANCZOS)


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)
    # apple-touch-icon dipasang penuh tanpa sudut membulat oleh iOS, yang
    # memberi masknya sendiri; sudut membulat ganda terlihat salah.
    keluaran = [
        ("apple-touch-icon.png", 180, 0.0),
        ("ikon-192.png", 192, 0.22),
        ("ikon-512.png", 512, 0.22),
    ]
    for nama, sisi, radius in keluaran:
        gambar(sisi, radius_rel=radius).save(PUBLIC / nama, optimize=True)
        print(f"  {nama:24} {sisi}x{sisi}")


if __name__ == "__main__":
    main()

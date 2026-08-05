"""Готовит картинки для сайта из презентации «Технология тепла».

В PDF каждая картинка лежит отдельно от своей альфа-маски (SMask): у иконок это
настоящая прозрачность, у фотографий — скруглённые углы. Поэтому пересобираем
изображение вместе с маской, а дальше расходимся: иконки остаются PNG с альфой,
фотографии кладутся на белый фон и ужимаются в JPEG до вебовых размеров.
"""

import io
import sys
from pathlib import Path

import fitz
from PIL import Image

PDF_PATH = Path(r"C:\Users\Sgoronkov\Downloads\Технологии тепла Родион.pdf")
ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "assets" / "img"
PHOTO_DIR = IMG_DIR / "projects"
# Превью страниц нужны только для сверки при разработке и на сайт не выкладываются.
PAGE_DIR = ROOT / "tools" / "preview" / "pages"

MIN_PIXELS = 200 * 200
ICON_MAX = 320
HERO_MAX = 900
PHOTO_MAX = 1400
THUMB_MAX = 700
JPEG_QUALITY = 82

ICONS = {
    16: "icon-stopwatch",
    20: "icon-warning",
    24: "icon-piggy-bank",
    28: "icon-check-cross",
    32: "icon-mousetrap",
    8: "logo-radiator",
    671: "icon-handshake",
    675: "icon-wrench",
    679: "icon-floor-heating",
    683: "icon-expansion-tank",
    687: "icon-gears",
    691: "icon-puzzle",
    695: "icon-boiler",
    699: "icon-radiator",
    1065: "icon-drawings",
}

HERO = {12: "hero-house-cutaway"}

DESIGNS = {
    1697: "design-1-floor-heating-3d",
    1701: "design-2-radiators-3d",
    1705: "design-3-water-supply-plan",
}

PHOTO_XREFS = [
    1777, 1781, 1785, 1789, 1793, 1797,
    1873, 1877, 1881, 1885, 1889, 1893,
    1969, 1973, 1977, 1981, 1985,
]


def load_rgba(doc: fitz.Document, xref: int, smask: int) -> Image.Image:
    """Возвращает изображение из PDF с приклеенной альфа-маской."""
    pix = fitz.Pixmap(doc, xref)
    if smask:
        pix = fitz.Pixmap(pix, fitz.Pixmap(doc, smask))
    if pix.colorspace and pix.colorspace.n > 3:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGBA")


def fit(image: Image.Image, longest: int) -> Image.Image:
    if max(image.size) <= longest:
        return image
    scale = longest / max(image.size)
    size = (round(image.width * scale), round(image.height * scale))
    return image.resize(size, Image.LANCZOS)


def save_png(image: Image.Image, dest: Path, longest: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    fit(image, longest).save(dest, optimize=True)


def save_jpeg(image: Image.Image, dest: Path, longest: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    flat = Image.new("RGB", image.size, "white")
    flat.paste(image, mask=image.getchannel("A"))
    fit(flat, longest).save(dest, quality=JPEG_QUALITY, optimize=True, progressive=True)


def main() -> int:
    if not PDF_PATH.exists():
        print(f"PDF not found: {PDF_PATH}")
        return 1

    PAGE_DIR.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(PDF_PATH)
    photo_names = {xref: f"project-{i:02d}" for i, xref in enumerate(PHOTO_XREFS, start=1)}
    seen: set[int] = set()
    saved = 0

    for page_index, page in enumerate(doc, start=1):
        page.get_pixmap(dpi=110).save(PAGE_DIR / f"page-{page_index}.png")

        for img in page.get_images(full=True):
            xref, smask, width, height = img[0], img[1], img[2], img[3]
            if xref in seen or width * height < MIN_PIXELS:
                continue
            seen.add(xref)

            if xref in ICONS:
                image = load_rgba(doc, xref, smask)
                save_png(image, IMG_DIR / f"{ICONS[xref]}.png", ICON_MAX)
                name = f"{ICONS[xref]}.png"
            elif xref in HERO:
                image = load_rgba(doc, xref, smask)
                save_png(image, IMG_DIR / f"{HERO[xref]}.png", HERO_MAX)
                name = f"{HERO[xref]}.png"
            elif xref in DESIGNS:
                image = load_rgba(doc, xref, smask)
                save_jpeg(image, IMG_DIR / f"{DESIGNS[xref]}.jpg", PHOTO_MAX)
                name = f"{DESIGNS[xref]}.jpg"
            elif xref in photo_names:
                stem = photo_names[xref]
                image = load_rgba(doc, xref, smask)
                save_jpeg(image, PHOTO_DIR / f"{stem}.jpg", PHOTO_MAX)
                save_jpeg(image, PHOTO_DIR / f"{stem}-thumb.jpg", THUMB_MAX)
                name = f"projects/{stem}.jpg (+thumb)"
            else:
                continue

            saved += 1
            print(f"{name}\t{width}x{height}")

    total = sum(f.stat().st_size for f in IMG_DIR.rglob("*") if f.is_file())
    print(f"\npages: {doc.page_count}, assets: {saved}, total: {total / 1024 / 1024:.1f} MB")
    doc.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

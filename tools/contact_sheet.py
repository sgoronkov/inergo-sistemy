"""Собирает превью картинок в один лист с подписями для быстрой ревизии.

Использование: python tools/contact_sheet.py [подпапка assets/img] [колонок]
"""

import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "preview" / "contact-sheet.png"

CELL = 300
PAD = 12
LABEL_H = 20


def main() -> int:
    sub = sys.argv[1] if len(sys.argv) > 1 else ""
    cols = int(sys.argv[2]) if len(sys.argv) > 2 else 6

    src = ROOT / "assets" / "img" / sub
    files = [f for f in sorted(src.glob("*")) if f.suffix in {".png", ".jpg", ".jpeg"} and "-thumb" not in f.stem]
    if not files:
        print(f"no images in {src}")
        return 1

    rows = (len(files) + cols - 1) // cols
    width = cols * (CELL + PAD) + PAD
    height = rows * (CELL + LABEL_H + PAD) + PAD

    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet = fitz.open()
    page = sheet.new_page(width=width, height=height)
    page.draw_rect(fitz.Rect(0, 0, width, height), color=None, fill=(1, 1, 1))

    for i, path in enumerate(files):
        col, row = i % cols, i // cols
        x = PAD + col * (CELL + PAD)
        y = PAD + row * (CELL + LABEL_H + PAD)
        page.insert_image(fitz.Rect(x, y, x + CELL, y + CELL), filename=str(path), keep_proportion=True)
        page.insert_text((x, y + CELL + 13), path.stem, fontsize=11)

    page.get_pixmap(dpi=96).save(OUT)
    print(f"{OUT}  ({len(files)} images, {rows} rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

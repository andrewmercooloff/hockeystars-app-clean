#!/usr/bin/env python3
"""Export album/card preview PNGs as JPGs for the share viewer."""
import glob
import os
import sys

from PIL import Image


def png_to_jpg(src: str, dst: str, quality: int = 88) -> None:
    with Image.open(src) as im:
        im.convert('RGB').save(dst, 'JPEG', quality=quality, optimize=True)


def main() -> None:
    preview_dir, pages_dir, *_ = sys.argv[1:4]
    os.makedirs(pages_dir, exist_ok=True)

    for kind in ('album', 'cards', 'stickers'):
        for src in sorted(glob.glob(os.path.join(preview_dir, f'{kind}-*.png'))):
            base = os.path.splitext(os.path.basename(src))[0]
            png_to_jpg(src, os.path.join(pages_dir, f'{base}.jpg'))

    # printer's spreads (imposed pairs, as they come off the press) → spreads-NN.jpg
    spreads_pdf = sys.argv[3] if len(sys.argv) > 3 else ''
    if spreads_pdf and os.path.exists(spreads_pdf):
        import pymupdf

        for old in glob.glob(os.path.join(pages_dir, 'spreads-*.jpg')):
            os.remove(old)
        with pymupdf.open(spreads_pdf) as doc:
            for i, page in enumerate(doc, start=1):
                page.get_pixmap(dpi=72).save(os.path.join(pages_dir, f'spreads-{i:02d}.jpg'), jpg_quality=86)


if __name__ == '__main__':
    main()

"""PDF finishing steps (PyMuPDF):

  python3 postprocess.py optimize  in.pdf out.pdf            - garbage-collect + deflate (same quality, smaller file)
  python3 postprocess.py light     in.pdf out.pdf [dpi]      - downsample images (default 130 dpi) for phone/e-mail preview
  python3 postprocess.py impose    in.pdf out.pdf bleed_mm   - saddle-stitch A4 pages onto A3 spreads (sheet order,
                                                               fronts/backs alternate, ready for duplex printing)
"""
import sys
import pymupdf

MM = 72 / 25.4


def optimize(src, dst):
    doc = pymupdf.open(src)
    doc.save(dst, garbage=4, deflate=True, clean=True)


def light(src, dst, dpi=110):
    """Raster copy (one JPEG per page) — small and opens on any phone. Not for print."""
    doc = pymupdf.open(src)
    out = pymupdf.open()
    for page in doc:
        pix = page.get_pixmap(dpi=dpi, colorspace=pymupdf.csRGB, alpha=False)
        img = pix.tobytes('jpeg', jpg_quality=80)
        new = out.new_page(width=page.rect.width, height=page.rect.height)
        new.insert_image(new.rect, stream=img)
    out.save(dst, garbage=4, deflate=True)


def impose(src, dst, bleed_mm):
    """12 pages → 3 sheets: (12,1)(2,11) (10,3)(4,9) (8,5)(6,7). Works for any multiple of 4."""
    doc = pymupdf.open(src)
    n = len(doc)
    assert n % 4 == 0, f'page count {n} is not a multiple of 4'
    src_w, src_h = doc[0].rect.width, doc[0].rect.height
    b = bleed_mm * MM
    page_w = src_w - b  # trimmed page + outer bleed only (inner bleed is dropped at the spine)
    out = pymupdf.open()
    lo, hi = 1, n
    while lo < hi:
        # front of sheet: hi | lo ; back of sheet: lo+1 | hi-1
        for left, right in ((hi, lo), (lo + 1, hi - 1)):
            page = out.new_page(width=page_w * 2, height=src_h)
            # left page: keep its left bleed, cut the right (spine) bleed
            page.show_pdf_page(pymupdf.Rect(0, 0, page_w, src_h), doc, left - 1, clip=pymupdf.Rect(0, 0, src_w - b, src_h))
            page.show_pdf_page(pymupdf.Rect(page_w, 0, page_w * 2, src_h), doc, right - 1, clip=pymupdf.Rect(b, 0, src_w, src_h))
            # spine mark (fold line) in the top/bottom bleed
            for y0, y1 in ((0, b * 0.8), (src_h - b * 0.8, src_h)):
                page.draw_line((page_w, y0), (page_w, y1), color=(0, 0, 0), width=0.3)
        lo += 2
        hi -= 2
    out.save(dst, garbage=4, deflate=True)


if __name__ == '__main__':
    cmd, src, dst = sys.argv[1:4]
    if cmd == 'optimize':
        optimize(src, dst)
    elif cmd == 'light':
        light(src, dst, int(sys.argv[4]) if len(sys.argv) > 4 else 130)
    elif cmd == 'impose':
        impose(src, dst, float(sys.argv[4]))
    else:
        raise SystemExit(__doc__)

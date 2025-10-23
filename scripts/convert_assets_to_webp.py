#!/usr/bin/env python3
import argparse
import sys
import os
from pathlib import Path

try:
    from PIL import Image
except Exception as e:
    print("Pillow is required. Install with: pip install pillow")
    sys.exit(1)


def convert_png_to_webp(src: Path, dst: Path, quality: int = 85, lossless: bool = False):
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        # Ensure RGBA preserved for transparency
        if im.mode not in ("RGBA", "RGB"):
            im = im.convert("RGBA")
        im.save(dst, format="WEBP", quality=quality, lossless=lossless, method=6)


def main():
    ap = argparse.ArgumentParser(description="Convert all project PNG assets to WebP.")
    ap.add_argument("--assets-dir", default="assets", help="Assets root directory to scan (default: assets)")
    ap.add_argument("--quality", type=int, default=85, help="WebP quality (default: 85)")
    ap.add_argument("--lossless", action="store_true", help="Use lossless WebP (may be larger)")
    ap.add_argument("--delete-png", action="store_true", help="Delete PNGs after successful conversion")
    ap.add_argument("--include-froghole", action="store_true", help="Also convert project-root froghole.png into assets/player/froghole.webp")
    args = ap.parse_args()
    
    root = Path(args.assets_dir)
    print (root)
    if not root.exists():
        print(f"Assets dir not found: {root}")
        sys.exit(2)

    converted = 0
    for p in root.rglob('*.png'):
        dst = p.with_suffix('.webp')
        try:
            convert_png_to_webp(p, dst, quality=args.quality, lossless=args.lossless)
            converted += 1
            print(f"WEBP {dst.relative_to(root)}")
            if args.delete_png:
                try:
                    p.unlink()
                except Exception:
                    pass
        except Exception as e:
            print(f"FAIL {p}: {e}")

    if args.include_froghole:
        src = Path('froghole.png')
        if src.exists():
            dst = root / 'player' / 'froghole.webp'
            try:
                convert_png_to_webp(src, dst, quality=args.quality, lossless=args.lossless)
                print(f"WEBP {dst.relative_to(root)} (from project root froghole.png)")
            except Exception as e:
                print(f"FAIL froghole.png: {e}")
        else:
            print("froghole.png not found in project root; skipping")

    print(f"Done. Converted {converted} PNGs under {root}.")

if __name__ == '__main__':
    main()

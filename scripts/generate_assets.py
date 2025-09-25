#!/usr/bin/env python3
import os
import sys
import json
import time
import base64
import argparse
import random
from pathlib import Path

try:
    from urllib import request
except Exception:
    print("Python stdlib urllib not available; cannot proceed.")
    sys.exit(1)


STYLE = "bright flat 2D cartoon, bold outlines, kid-friendly, no humans"

TILE_PROMPTS = [
    ("tiles/asphalt_{}.png", "Top-down city asphalt road background tile with subtle worn grid lines and faint road speckles, {}"),
    ("tiles/concrete_{}.png", "Top-down concrete pavement sidewalk tile with mild texture, {}, seamless"),
    ("tiles/grass_{}.png", "Top-down park grass background tile with a few scattered bushes, {}, seamless"),
    ("tiles/building_wall_{}.png", "Top-down compatible building wall texture (flat facade pattern usable as tile), clean stucco or brick, {}, seamless"),
    ("tiles/bush_{}.png", "Top-down bush cluster patch with soft edges, transparent background, {}"),
]

PLAYER_PROMPTS = [
    ("player/hole_decal.png", "Top-down black circular hole decal with soft, subtle outer ring, transparent background, {}"),
]

TRASH_CATEGORIES = {
    "bottles": "Assorted plastic bottles (small), top-down small sprite, transparent background, {}",
    "cans": "Assorted soda cans (small), top-down small sprite, transparent background, {}",
    "newspapers": "Folded newspapers (small stacks), top-down small sprite, transparent background, {}",
    "plastic_bags": "Crumpled plastic grocery bags, top-down small sprite, transparent background, {}",
    "coffee_cups": "Disposable coffee cups with lids, top-down small sprite, transparent background, {}",
    "food_wrappers": "Candy/chip food wrappers, top-down small sprite, transparent background, {}",
    "fruit_peels": "Banana/orange fruit peels, top-down small sprite, transparent background, {}",
}


def http_post_json(url: str, payload: dict, headers: dict, timeout_s: int = 180) -> dict:
    req = request.Request(url, method="POST")
    req.add_header("Content-Type", "application/json")
    # Helpful UA for observability
    req.add_header("User-Agent", "recyclehole-asset-gen/1.0")
    for k, v in headers.items():
        req.add_header(k, v)
    data = json.dumps(payload).encode("utf-8")
    try:
        with request.urlopen(req, data=data, timeout=timeout_s) as resp:
            body = resp.read()
            return json.loads(body)
    except Exception as e:
        # Try to extract response body if present (HTTPError)
        if hasattr(e, 'read'):
            try:
                body = e.read().decode('utf-8', errors='ignore')
                return json.loads(body)
            except Exception:
                pass
        raise


def generate_image(prompt: str, out_path: Path, api_key: str, size: str = "1024x1024", retry: int = 2, model: str = "gpt-image-1", timeout_s: int = 180, sleep_ms: int = 0):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "model": model,
        "prompt": prompt,
        "n": 1,
        "size": size,
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    last_err = None
    for attempt in range(retry + 1):
        if sleep_ms > 0 and attempt == 0:
            time.sleep(sleep_ms / 1000.0)
        elif attempt > 0:
            # exponential backoff with jitter
            backoff = (2 ** (attempt - 1)) + random.random()
            time.sleep(backoff)
        try:
            resp = http_post_json("https://api.openai.com/v1/images/generations", payload, headers, timeout_s=timeout_s)
            if 'error' in resp:
                raise RuntimeError(resp['error'].get('message', 'unknown error'))
            b64 = resp["data"][0]["b64_json"]
            raw = base64.b64decode(b64)
            with open(out_path, "wb") as f:
                f.write(raw)
            print(f"OK  -> {out_path}")
            return True
        except Exception as e:
            last_err = e
            print(f"ERR ({attempt+1}/{retry+1}) {out_path}: {e}")
    print(f"FAIL -> {out_path}: {last_err}")
    return False


def try_rescale_png(path: Path, max_px: int):
    try:
        from PIL import Image
    except Exception:
        print("Pillow not installed; skipping rescale.")
        return
    try:
        with Image.open(path) as im:
            w, h = im.size
            if max(w, h) <= max_px:
                return
            if w >= h:
                nw = max_px
                nh = int(h * (max_px / w))
            else:
                nh = max_px
                nw = int(w * (max_px / h))
            im = im.resize((nw, nh), Image.LANCZOS)
            im.save(path, optimize=True)
            print(f"rescaled {path} -> {nw}x{nh}")
    except Exception as e:
        print(f"rescale failed for {path}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Generate 1024x1024 PNG assets via OpenAI Images API.")
    parser.add_argument("--out", default="assets", help="Output directory root (default: assets)")
    parser.add_argument("--tile-variations", type=int, default=2, help="Variations per tile type (default: 2)")
    parser.add_argument("--trash-min", type=int, default=5, help="Min variations per trash category (default: 5)")
    parser.add_argument("--trash-max", type=int, default=8, help="Max variations per trash category (default: 8)")
    parser.add_argument("--rescale", type=int, default=0, help="Optional max dimension to rescale PNGs after generation (e.g., 512). 0 disables")
    parser.add_argument("--model", default="gpt-image-1", help="Image model (default: gpt-image-1)")
    parser.add_argument("--dry-run", action="store_true", help="Print the files that would be generated without calling the API")
    parser.add_argument("--timeout", type=int, default=180, help="Per-request timeout seconds (default: 180)")
    parser.add_argument("--retries", type=int, default=3, help="Max retries per image (default: 3)")
    parser.add_argument("--sleep-ms", type=int, default=250, help="Sleep milliseconds before each request (default: 250)")
    parser.add_argument("--skip-existing", action="store_true", default=True, help="Skip images that already exist (default: true)")
    parser.add_argument("--overwrite", action="store_true", help="Force re-generate even if file exists")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not args.dry_run and not api_key:
        print("ERROR: OPENAI_API_KEY not set.")
        sys.exit(2)

    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)

    generated = []

    # Build task list for deterministic progress
    tasks = []
    for rel_tmpl, prompt_tmpl in TILE_PROMPTS:
        for i in range(max(1, args.tile_variations)):
            rel = rel_tmpl.format(i)
            styled_prompt = prompt_tmpl.format(STYLE)
            tasks.append((rel, styled_prompt))
    for rel, prompt_tmpl in PLAYER_PROMPTS:
        tasks.append((rel, prompt_tmpl.format(STYLE)))
    for cat, prompt_tmpl in TRASH_CATEGORIES.items():
        n = max(args.trash_min, min(args.trash_max, 10))
        for i in range(n):
            rel = f"trash/{cat}/{cat}_{i}.png"
            tasks.append((rel, prompt_tmpl.format(STYLE)))

    total = len(tasks)
    print(f"Planned {total} assets.")

    # Execute
    for idx, (rel, prompt) in enumerate(tasks, start=1):
        full = out_root / rel
        generated.append(full)
        if args.dry_run:
            print(f"[{idx}/{total}] DRY: {full} <- {prompt}")
            continue
        if full.exists() and args.skip_existing and not args.overwrite:
            print(f"[{idx}/{total}] SKIP existing {full}")
            continue
        print(f"[{idx}/{total}] gen -> {full}")
        generate_image(prompt, full, api_key, size="1024x1024", model=args.model, timeout_s=args.timeout, retry=args.retries, sleep_ms=args.sleep_ms)

    # Optional rescale/compress
    if args.rescale and not args.dry_run:
        for p in generated:
            try_rescale_png(Path(p), args.rescale)

    print("Done.")


if __name__ == "__main__":
    main()

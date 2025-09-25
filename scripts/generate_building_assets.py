#!/usr/bin/env python3
import os
import sys
import json
import time
import base64
import random
import argparse
from pathlib import Path

try:
    from urllib import request
except Exception:
    print("Python stdlib urllib not available; cannot proceed.")
    sys.exit(1)

STYLE = "bright flat 2D cartoon, bold outlines, kid-friendly, no humans"

# Prompts tailored for facades usable as tiled materials on boxes.

CATEGORIES = [
    ("tiles/buildings/glass/glass_{}.png", "Seamless modern skyscraper glass facade tile, reflective blue glass windows grid, minimal mullions, {}, seamless, bright, readable"),
    ("tiles/buildings/metal/metal_{}.png", "Seamless skyscraper metal facade tile, brushed aluminum/steel panels with vertical lines and window strips, {}, seamless, bright, readable"),
    ("tiles/buildings/brick/brick_{}.png", "Seamless brick office facade tile with evenly spaced windows, red/brown brick, {}, seamless, readable"),
    ("tiles/buildings/stucco/stucco_{}.png", "Seamless stucco apartment facade tile with simple window pattern, light pastel stucco, {}, seamless, readable"),
    ("tiles/buildings/house_paint/house_paint_{}.png", "Seamless painted house siding facade tile with windows and trim, bright cheerful colors (teal, yellow, mint, coral), {}, seamless, readable"),
]



def http_post_json(url: str, payload: dict, headers: dict, timeout_s: int = 180) -> dict:
    req = request.Request(url, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "recyclehole-building-gen/1.0")
    for k, v in headers.items():
        req.add_header(k, v)
    data = json.dumps(payload).encode("utf-8")
    with request.urlopen(req, data=data, timeout=timeout_s) as resp:
        body = resp.read()
        return json.loads(body)


def generate_image(prompt: str, out_path: Path, api_key: str, size: str = "1024x1024", retries: int = 3, model: str = "gpt-image-1", timeout_s: int = 180, sleep_ms: int = 250) -> bool:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "model": model,
        "prompt": prompt,
        "n": 1,
        "size": size,
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    last_err = None
    for attempt in range(retries + 1):
        if sleep_ms > 0 and attempt == 0:
            time.sleep(sleep_ms / 1000.0)
        elif attempt > 0:
            back = (2 ** (attempt - 1)) + random.random()
            time.sleep(back)
        try:
            resp = http_post_json("https://api.openai.com/v1/images/generations", payload, headers, timeout_s=timeout_s)
            if 'error' in resp:
                raise RuntimeError(resp['error'].get('message', 'unknown error'))
            b64 = resp["data"][0]["b64_json"]
            raw = base64.b64decode(b64)
            out_path.write_bytes(raw)
            print(f"OK  -> {out_path}")
            return True
        except Exception as e:
            last_err = e
            print(f"ERR ({attempt+1}/{retries+1}) {out_path}: {e}")
    print(f"FAIL -> {out_path}: {last_err}")
    return False


def main():
    ap = argparse.ArgumentParser(description="Generate building facade textures for the City buildings.")
    ap.add_argument("--out", default="assets", help="Output directory root (default: assets)")
    ap.add_argument("--count", type=int, default=5, help="Number of variations per category to generate (default: 5 -> 0..4)")
    ap.add_argument("--model", default="gpt-image-1", help="Image model (default: gpt-image-1)")
    ap.add_argument("--timeout", type=int, default=180, help="Per-request timeout seconds (default: 180)")
    ap.add_argument("--retries", type=int, default=3, help="Max retries per image (default: 3)")
    ap.add_argument("--sleep-ms", type=int, default=250, help="Sleep milliseconds before each request (default: 250)")
    ap.add_argument("--skip-existing", action="store_true", default=True, help="Skip images that already exist (default: true)")
    ap.add_argument("--overwrite", action="store_true", help="Force re-generate even if file exists")
    ap.add_argument("--dry-run", action="store_true", help="Print planned outputs without generating")
    args = ap.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not args.dry_run and not api_key:
        print("ERROR: OPENAI_API_KEY not set.")
        sys.exit(2)

    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)

    tasks = []
    for rel_tmpl, prompt_tmpl in CATEGORIES:
        for i in range(max(1, args.count)):
            rel = rel_tmpl.format(i)
            tasks.append((rel, prompt_tmpl.format(STYLE)))

    total = len(tasks)
    print(f"Planned {total} assets.")

    for idx, (rel, prompt) in enumerate(tasks, start=1):
        full = out_root / rel
        if args.dry_run:
            print(f"[{idx}/{total}] DRY: {full} <- {prompt}")
            continue
        if full.exists() and args.skip_existing and not args.overwrite:
            print(f"[{idx}/{total}] SKIP existing {full}")
            continue
        print(f"[{idx}/{total}] gen -> {full}")
        generate_image(prompt, full, api_key, size="1024x1024", retries=args.retries, model=args.model, timeout_s=args.timeout, sleep_ms=args.sleep_ms)

    print("Done.")

if __name__ == "__main__":
    main()

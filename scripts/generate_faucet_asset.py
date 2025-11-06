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

FAUCET_PROMPT = (
    "assets/interactables/faucet.png",
    "A simple, cartoonish leaky faucet, top-down view, with a water drop falling from it. Transparent background. {}".format(STYLE)
)


def http_post_json(url: str, payload: dict, headers: dict, timeout_s: int = 180) -> dict:
    req = request.Request(url, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "recyclehole-asset-gen/1.0")
    for k, v in headers.items():
        req.add_header(k, v)
    data = json.dumps(payload).encode("utf-8")
    try:
        with request.urlopen(req, data=data, timeout=timeout_s) as resp:
            body = resp.read()
            return json.loads(body)
    except Exception as e:
        if hasattr(e, 'read'):
            try:
                body = e.read().decode('utf-8', errors='ignore')
                return json.loads(body)
            except Exception:
                pass
        raise


def generate_image(prompt: str, out_path: Path, api_key: str, size: str = "1024x1024", retry: int = 2, model: str = "dall-e-3", timeout_s: int = 180, sleep_ms: int = 0):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "model": model,
        "prompt": prompt,
        "n": 1,
        "size": size,
        "response_format": "b64_json",
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    last_err = None
    for attempt in range(retry + 1):
        if sleep_ms > 0 and attempt == 0:
            time.sleep(sleep_ms / 1000.0)
        elif attempt > 0:
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


def main():
    parser = argparse.ArgumentParser(description="Generate faucet asset via OpenAI Images API.")
    parser.add_argument("--out", default=".", help="Output directory root (default: .)")
    parser.add_argument("--model", default="dall-e-3", help="Image model (default: dall-e-3)")
    parser.add_argument("--dry-run", action="store_true", help="Print the files that would be generated without calling the API")
    parser.add_argument("--timeout", type=int, default=180, help="Per-request timeout seconds (default: 180)")
    parser.add_argument("--retries", type=int, default=3, help="Max retries per image (default: 3)")
    parser.add_argument("--sleep-ms", type=int, default=250, help="Sleep milliseconds before each request (default: 250)")
    parser.add_argument("--overwrite", action="store_true", help="Force re-generate even if file exists")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not args.dry_run and not api_key:
        print("ERROR: OPENAI_API_KEY not set.")
        sys.exit(2)

    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)

    rel, prompt = FAUCET_PROMPT
    full_path = out_root / rel

    if args.dry_run:
        print(f"DRY: {full_path} <- {prompt}")
    elif full_path.exists() and not args.overwrite:
        print(f"SKIP existing {full_path}")
    else:
        print(f"gen -> {full_path}")
        generate_image(prompt, full_path, api_key, size="1024x1024", model=args.model, timeout_s=args.timeout, retry=args.retries, sleep_ms=args.sleep_ms)

    print("Done.")


if __name__ == "__main__":
    main()

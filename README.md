Recycle Hole — Minimalist 3D cleanup game

Overview
- A small Hole.io-inspired game set in a simplified City of Davis.
- Control a growing cleanup hole and absorb trash within 60 seconds.
- Simple, clean visuals with readable tiles and trash.

How to run
- Generate assets (optional first step):
  - Ensure `OPENAI_API_KEY` is set in your environment.
  - Run: `python3 scripts/generate_assets.py` (see flags inside for variations).
- Start a static server in this folder:
  - Python 3: `python3 -m http.server 8000`
  - Then open http://localhost:8000 in a browser.

Controls
- Move: WASD or Arrow keys
- Goal: Absorb as much trash as possible before the 60s timer ends.

Assets
- The generator creates 1024x1024 PNGs under `assets/`:
  - Tiles: asphalt, concrete, grass, building walls, bushes
  - Trash categories with 5–10 variations each: bottles, cans, newspapers, plastic bags, coffee cups, food wrappers, fruit peels
  - Player: optional hole decal
- You can rescale/compress via flags (Pillow optional). See `scripts/generate_assets.py`.

Notes
- If assets are missing, the game uses simple colored placeholders.
- The visual style prompt used: bright, flat 2D, kid-friendly, bold outlines, no humans.


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



Building textures
- To add variety (glass, metal, brick, stucco, bright painted houses):
  - Ensure `OPENAI_API_KEY` is set
  - Run: `python3 scripts/generate_building_assets.py --count 5`
    - Creates per‑type folders:
      - `assets/tiles/buildings/glass/glass_{0..4}.png`
      - `assets/tiles/buildings/metal/metal_{0..4}.png`
      - `assets/tiles/buildings/brick/brick_{0..4}.png`
      - `assets/tiles/buildings/stucco/stucco_{0..4}.png`
      - `assets/tiles/buildings/house_paint/house_paint_{0..4}.png`
  - Increase variety with `--count 8` or higher as desired.

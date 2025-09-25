import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';
export class TextureLoaderEx {
  constructor() {
    this.loader = new THREE.TextureLoader();
  }

  async tryLoadTex(path) {
    try {
      const tex = await new Promise((resolve, reject) => {
        this.loader.load(
          path,
          (t) => resolve(t),
          undefined,
          (err) => reject(err)
        );
      });
      return tex;
    } catch (e) {
      return null;
    }
  }

  async loadTexOrFallback(path, color, label) {
    const webp = path.endsWith('.png') ? path.replace(/\.png$/, '.webp') : path;
    let tex = await this.tryLoadTex(webp);
    if (!tex) tex = await this.tryLoadTex(path);
    if (tex) return tex;
    return makeFallbackTexture(color, label);
  }
}


export function makeFallbackTexture(colorHex, label) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  ctx.fillStyle = '#222';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label || 'TEX', size / 2, size / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}


import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';
import { TextureLoaderEx, makeFallbackTexture } from './loader.js';

export async function startGame({ canvas, scoreEl, timeEl, tooltip }) {
  const WIDTH = window.innerWidth;
  const HEIGHT = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dff1ff');

  const camera = new THREE.PerspectiveCamera(60, WIDTH / HEIGHT, 0.1, 1000);
  camera.position.set(0, 18, 20);
  camera.lookAt(0, 0, 0);
  const camOffset = new THREE.Vector3(0, 18, 20);

  scene.add(new THREE.DirectionalLight(0xffffff, 1.0));
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const loader = new TextureLoaderEx();

  // Tunables
  const groundSize = 120;
  const ITEM_SCALE = 1.5;
  const growthPerItem = 0.035;
  const speed = 34;
  const friction = 0.85;

  // Ground
  const tileTexture = await loader.loadTexOrFallback('assets/tiles/asphalt_0.png', '#b9b9b9', 'ASPHALT');
  tileTexture.wrapS = tileTexture.wrapT = THREE.RepeatWrapping;
  tileTexture.repeat.set(12, 12);
  const groundMat = new THREE.MeshLambertMaterial({ map: tileTexture });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Scatter patches
  const patchTextures = await Promise.all([
    loader.loadTexOrFallback('assets/tiles/grass_0.png', '#9ae66e', 'GRASS'),
    loader.loadTexOrFallback('assets/tiles/concrete_0.png', '#cccccc', 'CONC')
  ]);
  const createPatch = (tex, size, x, z) => {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const g = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set(x, 0.01, z);
    mesh.renderOrder = 1;
    scene.add(mesh);
  };
  for (let i = 0; i < 12; i++) {
    const tex = patchTextures[i % patchTextures.length];
    const size = 6 + Math.random() * 8;
    const x = (Math.random() - 0.5) * (groundSize - 20);
    const z = (Math.random() - 0.5) * (groundSize - 20);
    createPatch(tex, size, x, z);
  }

  // Buildings: glass/metal/brick/stucco/houses
  const buildings = [];
  async function loadCategory(prefix, count=1) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const t = await loader.tryLoadTex(`assets/tiles/buildings/${prefix}/${prefix}_${i}.png`);
      if (t) list.push(t);
    }
    return list;
  }
  const glassTexs = await loadCategory('glass');
  const metalTexs = await loadCategory('metal');
  const brickTexs = await loadCategory('brick');
  const stuccoTexs = await loadCategory('stucco');
  const paintTexs = await loadCategory('house_paint');
  const fallbackWall = await loader.loadTexOrFallback('assets/tiles/building_wall_0.png', '#d3c7b8', 'WALL');
  const pick = (arr, fallback) => arr.length ? arr[Math.floor(Math.random()*arr.length)] : fallback;
  const makeMat = (tex, color) => new THREE.MeshLambertMaterial({ map: tex, color });
  const housePalette = [0xffffff, 0xfff1a8, 0xffd4d1, 0xcff0d6, 0xd6ebff, 0xf2f7ff, 0xf4e1ff];
  const edge = groundSize * 0.45;
  function addSkyscraper(x, z) {
    const w = 6 + Math.random() * 10;
    const d = 6 + Math.random() * 10;
    const h = 28 + Math.random() * 40;
    const pool = (Math.random() < 0.7) ? (Math.random() < 0.6 ? glassTexs : metalTexs) : (Math.random() < 0.5 ? brickTexs : stuccoTexs);
    const tex = pick(pool, fallbackWall);
    const mat = makeMat(tex, 0xffffff);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, h/2, z);
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.userData = { type: 'skyscraper', w, d, h, absorbing: false, absorbY: h/2 };
    scene.add(mesh);
    buildings.push(mesh);
  }
  function addHouse(x, z) {
    const w = 8 + Math.random() * 8;
    const d = 6 + Math.random() * 8;
    const h = 6 + Math.random() * 6;
    const wall = pick(paintTexs.length ? paintTexs : (stuccoTexs.length ? stuccoTexs : brickTexs), fallbackWall);
    const mat = makeMat(wall, housePalette[Math.floor(Math.random()*housePalette.length)]);
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    base.position.set(x, h/2, z);
    base.rotation.y = (Math.random() * 0.4) - 0.2;
    base.userData = { type: 'house', w, d, h, absorbing: false, absorbY: h/2 };
    scene.add(base);
    buildings.push(base);
    const roofH = Math.max(1.5, Math.min(6, Math.max(w, d) * 0.35));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)/1.4, roofH, 4), new THREE.MeshLambertMaterial({ color: 0xcc5544 }));
    roof.rotation.y = Math.PI/4;
    roof.position.set(x, h + roofH/2, z);
    scene.add(roof);
  }
  for (let i = -6; i <= 6; i++) {
    const x = i * 9;
    addSkyscraper(x, -edge - 6 - Math.random()*8);
    addSkyscraper(x, edge + 6 + Math.random()*8);
  }
  for (let i = -6; i <= 6; i++) {
    const z = i * 9;
    addSkyscraper(-edge - 6 - Math.random()*8, z);
    addSkyscraper(edge + 6 + Math.random()*8, z);
  }
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) continue;
      if (Math.random() < 0.35) continue;
      const x = gx * 15 + (Math.random()*6 - 3);
      const z = gz * 15 + (Math.random()*6 - 3);
      (Math.random() < 0.5 ? addHouse : addSkyscraper)(x, z);
    }
  }

  // Player hole
  const holeGroup = new THREE.Group();
  scene.add(holeGroup);
  let holeRadius = 2.0;
  let holeDisc = new THREE.Mesh(new THREE.CircleGeometry(holeRadius - 0.2, 64), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  holeDisc.rotation.x = -Math.PI / 2;
  holeDisc.position.y = 0.02;
  holeGroup.add(holeDisc);
  let ring = new THREE.Mesh(new THREE.RingGeometry(holeRadius - 0.2, holeRadius + 0.2, 64), new THREE.MeshBasicMaterial({ color: 0x333333 }));
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.021;
  holeGroup.add(ring);

  // Trash spawning
  const categories = [
    { key: 'bottles', baseSize: 0.7 },
    { key: 'cans', baseSize: 0.6 },
    { key: 'newspapers', baseSize: 0.9 },
    { key: 'plastic_bags', baseSize: 1.0 },
    { key: 'coffee_cups', baseSize: 0.7 },
    { key: 'food_wrappers', baseSize: 0.8 },
    { key: 'fruit_peels', baseSize: 0.5 },
  ];
  const maxPerCat = 30;
  const trash = [];
  const spawnArea = groundSize * 0.45;
  const pickTex = async (pathPrefix) => {
    for (let i = 0; i < 10; i++) {
      const p = `${pathPrefix}_${i}.png`;
      const tex = await loader.tryLoadTex(p);
      if (tex) return tex;
    }
    return null;
  };
  for (const cat of categories) {
    const count = Math.floor(maxPerCat * (0.7 + Math.random() * 0.6));
    for (let i = 0; i < count; i++) {
      const pathPrefix = `assets/trash/${cat.key}/${cat.key}`;
      const tex = (await pickTex(pathPrefix)) || makeFallbackTexture('#ffffff', cat.key.slice(0,3).toUpperCase());
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      const size = ITEM_SCALE * cat.baseSize * (0.85 + Math.random() * 0.5);
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      const x = (Math.random() - 0.5) * (spawnArea * 2);
      const z = (Math.random() - 0.5) * (spawnArea * 2);
      const baseY = 0.03;
      m.position.set(x, baseY, z);
      m.userData = { size, absorbing: false, absorbY: baseY };
      scene.add(m);
      trash.push(m);
    }
  }

  // Input & movement state
  const keys = new Set();
  window.addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); });
  window.addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); });
  const bounds = groundSize * 0.48;
  const holeVel = new THREE.Vector2(0, 0);

  // HUD/Timer
  let timeLeft = 60.0;
  let score = 0;
  let running = true;
  const updateHUD = () => {
    if (timeEl) timeEl.textContent = Math.max(0, Math.ceil(timeLeft)).toString();
    if (scoreEl) scoreEl.textContent = score.toString();
  };
  updateHUD();

  // Resize
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);

  // Game loop
  let last = performance.now();
  function tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (running) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        running = false;
        if (tooltip) tooltip.textContent = `Time's up! Score: ${score}. Press Restart.`;
      }
    }
    updateHUD();

    // Move input
    let ax = 0, az = 0;
    if (keys.has('arrowup') || keys.has('w')) az -= 1;
    if (keys.has('arrowdown') || keys.has('s')) az += 1;
    if (keys.has('arrowleft') || keys.has('a')) ax -= 1;
    if (keys.has('arrowright') || keys.has('d')) ax += 1;
    const len = Math.hypot(ax, az) || 1;
    ax /= len; az /= len;
    if (running) {
      holeVel.x += ax * speed * dt;
      holeVel.y += az * speed * dt;
    }
    holeVel.multiplyScalar(friction);
    holeGroup.position.x = THREE.MathUtils.clamp(holeGroup.position.x + holeVel.x * dt, -bounds, bounds);
    holeGroup.position.z = THREE.MathUtils.clamp(holeGroup.position.z + holeVel.y * dt, -bounds, bounds);

    // Camera follow
    {
      const desiredCamPos = new THREE.Vector3(
        holeGroup.position.x + camOffset.x,
        holeGroup.position.y + camOffset.y,
        holeGroup.position.z + camOffset.z
      );
      camera.position.lerp(desiredCamPos, 0.12);
      camera.lookAt(holeGroup.position.x, 0, holeGroup.position.z);
    }

    // Trash absorption
    const absorbR = holeRadius;
    for (let i = trash.length - 1; i >= 0; i--) {
      const t = trash[i];
      if (t.userData.absorbing) {
        t.userData.absorbY -= 4 * dt;
        t.position.y = t.userData.absorbY;
        if (t.userData.absorbY < -3) {
          if (running) {
            let newR = holeRadius + growthPerItem;
            if (newR > 6.0) newR = 6.0;
            if (newR !== holeRadius) {
              holeRadius = newR;
              holeDisc.geometry.dispose();
              ring.geometry.dispose();
              holeDisc = new THREE.Mesh(new THREE.CircleGeometry(holeRadius - 0.2, 64), new THREE.MeshBasicMaterial({ color: 0x111111 }));
              holeDisc.rotation.x = -Math.PI / 2;
              holeDisc.position.y = 0.02;
              ring = new THREE.Mesh(new THREE.RingGeometry(holeRadius - 0.2, holeRadius + 0.2, 64), new THREE.MeshBasicMaterial({ color: 0x333333 }));
              ring.rotation.x = -Math.PI/2;
              ring.position.y = 0.021;
              holeGroup.clear();
              holeGroup.add(holeDisc);
              holeGroup.add(ring);
            }
            score += Math.max(1, Math.round(10 * t.userData.size));
          }
          scene.remove(t);
          trash.splice(i, 1);
          continue;
        }
        continue;
      }
      const dx = t.position.x - holeGroup.position.x;
      const dz = t.position.z - holeGroup.position.z;
      const dist = Math.hypot(dx, dz);
      const size = t.userData.size;
      const absorbable = size <= absorbR * 0.6;
      if (running && absorbable && dist < absorbR) {
        t.userData.absorbing = true;
        t.userData.absorbY = t.position.y;
      }
    }

    // Building absorption (no collision blocking before that)
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if (b.userData.absorbing) {
        b.userData.absorbY -= 4 * dt;
        b.position.y = b.userData.absorbY;
        if (b.userData.absorbY < -5) {
          if (running) {
            let newR = holeRadius + Math.max(growthPerItem * 2.0, 0.08);
            if (newR > 8.0) newR = 8.0;
            if (newR !== holeRadius) {
              holeRadius = newR;
              holeDisc.geometry.dispose();
              ring.geometry.dispose();
              holeDisc = new THREE.Mesh(new THREE.CircleGeometry(holeRadius - 0.2, 64), new THREE.MeshBasicMaterial({ color: 0x111111 }));
              holeDisc.rotation.x = -Math.PI / 2;
              holeDisc.position.y = 0.02;
              ring = new THREE.Mesh(new THREE.RingGeometry(holeRadius - 0.2, holeRadius + 0.2, 64), new THREE.MeshBasicMaterial({ color: 0x333333 }));
              ring.rotation.x = -Math.PI/2;
              ring.position.y = 0.021;
              holeGroup.clear();
              holeGroup.add(holeDisc);
              holeGroup.add(ring);
            }
            score += Math.round(50 + Math.max(b.userData.w, b.userData.d));
          }
          scene.remove(b);
          buildings.splice(i, 1);
          continue;
        }
        continue;
      }
      const dx = b.position.x - holeGroup.position.x;
      const dz = b.position.z - holeGroup.position.z;
      const dist = Math.hypot(dx, dz);
      const footprint = Math.max(b.userData.w, b.userData.d) * 0.6;
      const heightGate = b.userData.h <= holeRadius * 4.0;
      const absorbable = (holeRadius >= footprint * 0.5) && heightGate;
      if (running && absorbable && dist < holeRadius) {
        b.userData.absorbing = true;
        b.userData.absorbY = b.position.y;
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  if (tooltip) setTimeout(() => tooltip.remove(), 4000);

  return {
    restart() { window.location.reload(); }
  };
}

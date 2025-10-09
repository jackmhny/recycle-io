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
  camera.position.set(0, 12, 14);
  camera.lookAt(0, 0, 0);
  const camOffset = new THREE.Vector3(0, 12, 14);

  scene.add(new THREE.DirectionalLight(0xffffff, 1.0));
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const loader = new TextureLoaderEx();

  // Tunables
  const groundSize = 120;
  const ITEM_SCALE = 1.5;
  const growthPerItem = 0.035;
  const speed = 180;
  const friction = 0.85;

  // Ground
  const groundTiles = [];
  const groundTilePaths = [
    'assets/tiles/grass_0.png',
    'assets/tiles/grass_1.png',
    'assets/tiles/asphalt_0.png',
    'assets/tiles/asphalt_1.png',
    'assets/tiles/concrete_0.png',
    'assets/tiles/concrete_1.png',
  ];
  for (const path of groundTilePaths) {
    const tex = await loader.loadTexOrFallback(path, '#9ae66e', 'TILE');
    groundTiles.push(tex);
  }

  const ground = new THREE.Group();
  const gridSize = 12;
  const tileSize = 10;
  // const groundSize = gridSize * tileSize; // This was the bug - groundSize is already defined
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const tileTexture = groundTiles[Math.floor(Math.random() * groundTiles.length)];
      const groundMat = new THREE.MeshLambertMaterial({ map: tileTexture });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(tileSize, tileSize), groundMat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.x = (i - gridSize / 2) * tileSize + tileSize / 2;
      plane.position.z = (j - gridSize / 2) * tileSize + tileSize / 2;
      ground.add(plane);
    }
  }
  scene.add(ground);

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
  for (let i = -4; i <= 4; i++) {
    const x = i * 9;
    addSkyscraper(x, -edge - 6 - Math.random()*8);
    addSkyscraper(x, edge + 6 + Math.random()*8);
  }
  for (let i = -4; i <= 4; i++) {
    const z = i * 9;
    addSkyscraper(-edge - 6 - Math.random()*8, z);
    addSkyscraper(edge + 6 + Math.random()*8, z);
  }
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) continue;
      if (Math.random() < 0.55) continue;
      const x = gx * 15 + (Math.random()*6 - 3);
      const z = gz * 15 + (Math.random()*6 - 3);
      (Math.random() < 0.5 ? addHouse : addSkyscraper)(x, z);
    }
  }

  // Player hole: trashcan and recycle bin images as decals
  const holeGroup = new THREE.Group();
  scene.add(holeGroup);
  let holeRadius = 2.0;

  const trashcanTex = await loader.tryLoadTex('assets/player/trashcan_hole.webp');
  const recyclecanTex = await loader.tryLoadTex('assets/player/recyclecan_hole.webp');

  const holeGeo = new THREE.PlaneGeometry(1, 1);

  const trashcanMat = new THREE.MeshBasicMaterial({ map: trashcanTex, transparent: true });
  const trashcanMesh = new THREE.Mesh(holeGeo, trashcanMat);
  trashcanMesh.rotation.x = -Math.PI / 2;
  trashcanMesh.position.y = 0.021;
  trashcanMesh.scale.set(holeRadius * 2, holeRadius * 2, 1);
  holeGroup.add(trashcanMesh);

  const recyclecanMat = new THREE.MeshBasicMaterial({ map: recyclecanTex, transparent: true });
  const recyclecanMesh = new THREE.Mesh(holeGeo, recyclecanMat);
  recyclecanMesh.rotation.x = -Math.PI / 2;
  recyclecanMesh.position.y = 0.021;
  recyclecanMesh.scale.set(holeRadius * 2, holeRadius * 2, 1);
  recyclecanMesh.visible = false;
  holeGroup.add(recyclecanMesh);

  let activeCharacter = 'trashcan';
  let holeMesh = trashcanMesh;

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      if (activeCharacter === 'trashcan') {
        trashcanMesh.visible = false;
        recyclecanMesh.visible = true;
        holeMesh = recyclecanMesh;
        activeCharacter = 'recyclecan';
      } else {
        trashcanMesh.visible = true;
        recyclecanMesh.visible = false;
        holeMesh = trashcanMesh;
        activeCharacter = 'trashcan';
      }
    }
  });

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
              holeMesh.scale.set(holeRadius * 2, holeRadius * 2, 1);
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
      const absorbable = size <= absorbR * 0.85;
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
              holeMesh.scale.set(holeRadius * 2, holeRadius * 2, 1);
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
      const heightGate = b.userData.h <= holeRadius * 5.0;
      const absorbable = (holeRadius >= footprint * 0.4) && heightGate;
      if (running && absorbable && dist < holeRadius) {
        b.userData.absorbing = true;
        b.userData.absorbY = b.position.y;
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  function run() {
    requestAnimationFrame(tick);
    if (tooltip) setTimeout(() => tooltip.remove(), 4000);
  }

  return {
    run,
    restart() { window.location.reload(); }
  };
}

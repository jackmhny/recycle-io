import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';
import { TextureLoaderEx, makeFallbackTexture } from './loader.js';
import { TRASH_CATEGORIES } from './trash-manifest.js';

export async function startGame({ canvas, scoreEl, timeEl, joystickDirection }) {
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
  const speed = 120 * 1.33;
  const friction = 0.85;

  // Ground
  async function loadTileSet(paths, fallbackColor, label) {
    const texs = [];
    for (const path of paths) {
      const tex = await loader.loadTexOrFallback(path, fallbackColor, label);
      texs.push(tex);
    }
    return texs;
  }

  const grassTiles = await loadTileSet(
    ['assets/tiles/grass_0.png', 'assets/tiles/grass_1.png'],
    '#9ae66e',
    'GR'
  );
  const roadTiles = await loadTileSet(
    ['assets/tiles/asphalt_0.png', 'assets/tiles/asphalt_1.png'],
    '#666666',
    'RD'
  );
  const concreteTiles = await loadTileSet(
    ['assets/tiles/concrete_0.png', 'assets/tiles/concrete_1.png'],
    '#bdbdbd',
    'CT'
  );

  const ground = new THREE.Group();
  const gridSize = 12;
  const tileSize = 10;
  // const groundSize = gridSize * tileSize; // This was the bug - groundSize is already defined
  const tileTypes = Array.from({ length: gridSize }, () => new Array(gridSize).fill('grass'));

  const centerIndex = Math.floor(gridSize / 2);
  const roadRows = new Set([centerIndex]);
  const roadCols = new Set([centerIndex]);
  const desiredRowCount = 2 + Math.floor(Math.random() * 2); // 2-3 rows total
  const desiredColCount = 2 + Math.floor(Math.random() * 2); // 2-3 cols total
  while (roadRows.size < desiredRowCount) {
    roadRows.add(Math.floor(Math.random() * gridSize));
  }
  while (roadCols.size < desiredColCount) {
    roadCols.add(Math.floor(Math.random() * gridSize));
  }

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (roadRows.has(i) || roadCols.has(j)) {
        tileTypes[i][j] = 'road';
      }
    }
  }

  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (tileTypes[i][j] !== 'grass') continue;
      const nearRoad = directions.some(([di, dj]) => {
        const ni = i + di;
        const nj = j + dj;
        return ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize && tileTypes[ni][nj] === 'road';
      });
      if (nearRoad && Math.random() < 0.6) {
        tileTypes[i][j] = 'concrete';
      }
    }
  }

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (tileTypes[i][j] !== 'grass') continue;
      const nearConcrete = directions.some(([di, dj]) => {
        const ni = i + di;
        const nj = j + dj;
        return ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize && tileTypes[ni][nj] === 'concrete';
      });
      if (nearConcrete && Math.random() < 0.35) {
        tileTypes[i][j] = 'concrete';
      }
    }
  }

  const grassTextureIndices = Array.from({ length: gridSize }, () => new Array(gridSize).fill(-1));
  const roadTextureByRow = new Map();
  const roadTextureByCol = new Map();

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      let tileTexture = grassTiles[0];
      const tileType = tileTypes[i][j];
      if (tileType === 'road') {
        let idx = -1;
        if (roadRows.has(i)) {
          if (!roadTextureByRow.has(i)) {
            roadTextureByRow.set(i, Math.floor(Math.random() * roadTiles.length));
          }
          idx = roadTextureByRow.get(i);
        }
        if (!roadRows.has(i) && roadCols.has(j)) {
          if (!roadTextureByCol.has(j)) {
            roadTextureByCol.set(j, Math.floor(Math.random() * roadTiles.length));
          }
          idx = roadTextureByCol.get(j);
        }
        if (idx < 0) idx = Math.floor(Math.random() * roadTiles.length);
        tileTexture = roadTiles[idx % roadTiles.length];
      } else if (tileType === 'concrete') {
        const idx = Math.floor(Math.random() * concreteTiles.length);
        tileTexture = concreteTiles[idx];
      } else {
        let idx = -1;
        const neighborIndices = [];
        if (i > 0 && tileTypes[i - 1][j] === 'grass') {
          const ni = grassTextureIndices[i - 1][j];
          if (ni >= 0) neighborIndices.push(ni);
        }
        if (j > 0 && tileTypes[i][j - 1] === 'grass') {
          const ni = grassTextureIndices[i][j - 1];
          if (ni >= 0) neighborIndices.push(ni);
        }
        if (neighborIndices.length && Math.random() < 0.75) {
          idx = neighborIndices[Math.floor(Math.random() * neighborIndices.length)];
        }
        if (idx < 0) {
          idx = Math.floor(Math.random() * grassTiles.length);
        }
        grassTextureIndices[i][j] = idx;
        tileTexture = grassTiles[idx];
      }
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

  // Player hole: decals for each bin type
  const holeGroup = new THREE.Group();
  scene.add(holeGroup);
  let holeRadius = 2.0;

  const holeGeo = new THREE.PlaneGeometry(1, 1);

  const binDefinitions = [
    { key: 'trash', path: 'assets/player/trashcan_hole.webp', fallbackColor: '#202020' },
    { key: 'paper', path: 'assets/player/paperbin.webp', fallbackColor: '#1d3d90' },
    { key: 'bottles', path: 'assets/player/bottlecanbin.webp', fallbackColor: '#3b8cff' },
    { key: 'compost', path: 'assets/player/organicbin.webp', fallbackColor: '#217a36' },
  ];

  const binMeshes = [];
  for (let i = 0; i < binDefinitions.length; i++) {
    const definition = binDefinitions[i];
    const tex =
      (await loader.tryLoadTex(definition.path)) ||
      makeFallbackTexture(definition.fallbackColor, definition.key.slice(0, 2).toUpperCase());
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(holeGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.021;
    mesh.scale.set(holeRadius * 2, holeRadius * 2, 1);
    mesh.visible = i === 0;
    mesh.userData = { key: definition.key };
    holeGroup.add(mesh);
    binMeshes.push(mesh);
  }

  function syncBinScales() {
    for (const mesh of binMeshes) {
      mesh.scale.set(holeRadius * 2, holeRadius * 2, 1);
    }
  }

  let activeBinIndex = 0;

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      binMeshes[activeBinIndex].visible = false;
      activeBinIndex = (activeBinIndex + 1) % binMeshes.length;
      const activeMesh = binMeshes[activeBinIndex];
      activeMesh.visible = true;
      syncBinScales();
    }
  });

  // Trash spawning
  const categories = TRASH_CATEGORIES;
  const maxPerCat = 30;
  const trash = [];
  const spawnArea = groundSize * 0.45;
  const pickTex = async (cat) => {
    const candidates = cat.textures || [];
    if (!candidates.length) return null;
    const indices = [...candidates.keys()];
    // Shuffle indices to randomize attempts without repeats
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (const idx of indices) {
      const path = candidates[idx];
      const tex =
        (await loader.tryLoadTex(path)) ||
        (path.endsWith('.webp')
          ? await loader.tryLoadTex(path.replace(/\.webp$/, '.png'))
          : null);
      if (tex) return tex;
    }
    return null;
  };
  for (const cat of categories) {
    const count = Math.floor(maxPerCat * (0.7 + Math.random() * 0.6));
    for (let i = 0; i < count; i++) {
      const tex =
        (await pickTex(cat)) || makeFallbackTexture('#ffffff', cat.key.slice(0, 3).toUpperCase());
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
      m.userData = {
        size,
        absorbing: false,
        absorbY: baseY,
        category: cat.key,
        binKey: cat.binKey || 'trash',
      };
      scene.add(m);
      trash.push(m);
    }
  }

  // Leaky Faucets
  const faucets = [];
  const numFaucets = 5;
  const faucetTex = await loader.loadTexOrFallback('assets/interactables/faucet.png', '#cccccc', 'FAUCET');

  for (let i = 0; i < numFaucets; i++) {
    const faucetMat = new THREE.MeshBasicMaterial({ map: faucetTex, transparent: true });
    const faucetGeo = new THREE.PlaneGeometry(2, 2);
    const faucet = new THREE.Mesh(faucetGeo, faucetMat);
    faucet.rotation.x = -Math.PI / 2;
    const x = (Math.random() - 0.5) * (spawnArea * 1.8);
    const z = (Math.random() - 0.5) * (spawnArea * 1.8);
    faucet.position.set(x, 0.03, z);
    faucet.userData = { leaking: true };
    scene.add(faucet);

    const puddleGeo = new THREE.CircleGeometry(1, 32);
    const puddleMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6 });
    const puddle = new THREE.Mesh(puddleGeo, puddleMat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, 0.01, z);
    puddle.scale.set(0.01, 0.01, 0.01); // Start very small
    scene.add(puddle);

    faucets.push({ faucet, puddle });
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
        const gameOverScreen = document.getElementById('game-over-screen');
        const finalScoreEl = document.getElementById('final-score');
        finalScoreEl.textContent = score;
        gameOverScreen.style.display = 'flex';
      }
    }
    updateHUD();

    // Move input
    let ax = 0, az = 0;
    if (keys.has('arrowup') || keys.has('w')) az -= 1;
    if (keys.has('arrowdown') || keys.has('s')) az += 1;
    if (keys.has('arrowleft') || keys.has('a')) ax -= 1;
    if (keys.has('arrowright') || keys.has('d')) ax += 1;

    if (joystickDirection && (joystickDirection.x !== 0 || joystickDirection.y !== 0)) {
      ax = joystickDirection.x;
      az = -joystickDirection.y; // Invert Y-axis for screen coordinates
    }

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
    const activeBinKey = binMeshes[activeBinIndex]?.userData?.key || 'trash';
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
              syncBinScales();
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
      const matchesBin = !t.userData.binKey || t.userData.binKey === activeBinKey;
      if (running && absorbable && matchesBin && dist < absorbR) {
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
              syncBinScales();
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

    // Faucet logic
    for (const { faucet, puddle } of faucets) {
      if (faucet.userData.leaking) {
        // Grow the puddle
        const newScale = puddle.scale.x + 0.1 * dt; // Grow rate
        puddle.scale.set(newScale, newScale, newScale);

        // Check for player interaction
        const dx = faucet.position.x - holeGroup.position.x;
        const dz = faucet.position.z - holeGroup.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < holeRadius) { // Player is close enough
          faucet.userData.leaking = false;
          // Make faucet grayscale by tinting it
          faucet.material.color.setRGB(0.5, 0.5, 0.5);
        }
      } else {
        // Shrink the puddle if it's not leaking and still visible
        if (puddle.scale.x > 0.01) {
          const newScale = puddle.scale.x - 2.0 * dt; // Shrink rate
          puddle.scale.set(Math.max(0.01, newScale), Math.max(0.01, newScale), Math.max(0.01, newScale));
        }
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  function run() {
    requestAnimationFrame(tick);
  }

  return {
    run,
    restart() { window.location.reload(); }
  };
}

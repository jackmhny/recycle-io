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

  const light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(10, 20, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const loader = new TextureLoaderEx();

  // Ground setup (single plane with repeated texture)
  const groundSize = 120;
  const tileTexture = await loader.loadTexOrFallback('assets/tiles/asphalt_0.png', '#b9b9b9', 'ASPHALT');
  tileTexture.wrapS = tileTexture.wrapT = THREE.RepeatWrapping;
  tileTexture.repeat.set(12, 12);
  const groundMat = new THREE.MeshLambertMaterial({ map: tileTexture });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = false;
  scene.add(ground);

  // Optional scattered decals: small grass/concrete patches for visual interest
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
    return mesh;
  };
  for (let i = 0; i < 12; i++) {
    const tex = patchTextures[i % patchTextures.length];
    const size = 6 + Math.random() * 8;
    const x = (Math.random() - 0.5) * (groundSize - 20);
    const z = (Math.random() - 0.5) * (groundSize - 20);
    createPatch(tex, size, x, z);
  }
  
  // Simple 3D buildings around edges (more density + variation)
  {
    const wallTex = await loader.loadTexOrFallback('assets/tiles/building_wall_0.png', '#d3c7b8', 'WALL');
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    const mats = [
      new THREE.MeshLambertMaterial({ map: wallTex, color: 0xffffff }),
      new THREE.MeshLambertMaterial({ map: wallTex, color: 0xffe6cf }),
      new THREE.MeshLambertMaterial({ map: wallTex, color: 0xd6ebff }),
      new THREE.MeshLambertMaterial({ map: wallTex, color: 0xeaeaea }),
    ];
    const buildings = new THREE.Group();
    const edge = groundSize * 0.45;
    // Perimeter rows/columns
    for (let i = -5; i <= 5; i++) {
      const w = 6 + Math.random() * 8;
      const d = 6 + Math.random() * 8;
      const h = 8 + Math.random() * 24;
      // top row
      let mat = mats[Math.floor(Math.random()*mats.length)];
      let b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(i * 10, h / 2, -edge - d/2 - 2);
      b.rotation.y = Math.random() * Math.PI;
      buildings.add(b);
      // bottom row
      mat = mats[Math.floor(Math.random()*mats.length)];
      b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(i * 10, h / 2, edge + d/2 + 2);
      b.rotation.y = Math.random() * Math.PI;
      buildings.add(b);
    }
    for (let i = -4; i <= 4; i++) {
      const w = 6 + Math.random() * 8;
      const d = 6 + Math.random() * 8;
      const h = 8 + Math.random() * 24;
      // left column
      let mat = mats[Math.floor(Math.random()*mats.length)];
      let b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(-edge - w/2 - 2, h / 2, i * 12);
      b.rotation.y = Math.random() * Math.PI;
      buildings.add(b);
      // right column
      mat = mats[Math.floor(Math.random()*mats.length)];
      b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(edge + w/2 + 2, h / 2, i * 12);
      b.rotation.y = Math.random() * Math.PI;
      buildings.add(b);
    }
    // Sparse inner blocks
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        if ((x === 0 && z === 0) || Math.random() < 0.35) continue; // leave play area open
        const w = 4 + Math.random() * 10;
        const d = 4 + Math.random() * 10;
        const h = 6 + Math.random() * 18;
        const mat = mats[Math.floor(Math.random()*mats.length)];
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(x * 18 + (Math.random()*4-2), h/2, z * 18 + (Math.random()*4-2));
        b.rotation.y = Math.random() * Math.PI;
        buildings.add(b);
      }
    }
    scene.add(buildings);
  }

  // Player hole (visual: black disc + subtle ring)

  const holeGroup = new THREE.Group();
  scene.add(holeGroup);
  const holeGeo = new THREE.CircleGeometry(1.8, 64);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const holeDisc = new THREE.Mesh(holeGeo, holeMat);
  holeDisc.rotation.x = -Math.PI / 2;
  holeDisc.position.y = 0.02;
  holeGroup.add(holeDisc);
  const ringGeo = new THREE.RingGeometry(1.8, 2.2, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
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
  const maxPerCat = 12;
  const trash = [];
  const spawnArea = groundSize * 0.45;

  const pickTex = async (pathPrefix) => {
    // try several indices and fallback if absent
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
      const size = cat.baseSize * (0.85 + Math.random() * 0.5);
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

  // Movement
  const keys = new Set();
  window.addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); });
  window.addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); });

  const bounds = groundSize * 0.48;
  const holeVel = new THREE.Vector2(0, 0);
  let holeRadius = 2.0;
  const growthPerItem = 0.035;
  const speed = 26;
  const friction = 0.85;

  // Timer & score
  let timeLeft = 60.0;
  let score = 0;
  let running = true;
  const updateHUD = () => {
    if (timeEl) timeEl.textContent = Math.max(0, Math.ceil(timeLeft)).toString();
    if (scoreEl) scoreEl.textContent = score.toString();
  };
  updateHUD();

  // Resize handling
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

    // Absorption check

    const absorbR = holeRadius;
    for (let i = trash.length - 1; i >= 0; i--) {
      const t = trash[i];
      if (t.userData.absorbing) {
        t.userData.absorbY -= 4 * dt; // sink
        t.position.y = t.userData.absorbY;
        if (t.userData.absorbY < -3) {
          // growth & score when fully absorbed
          if (running) {
            let newR = holeRadius + growthPerItem;
            if (newR > 6.0) newR = 6.0;
            if (newR !== holeRadius) {
              holeRadius = newR;
              holeDisc.geometry.dispose();
              ring.geometry.dispose();
              holeDisc.geometry = new THREE.CircleGeometry(holeRadius - 0.2, 64);
              ring.geometry = new THREE.RingGeometry(holeRadius - 0.2, holeRadius + 0.2, 64);
            }
            score += Math.max(1, Math.round(10 * t.userData.size));
          }
          scene.remove(t);
          trash.splice(i, 1); // fully remove so it can't re-trigger
          continue;
        }
        continue;
      }
      const dx = t.position.x - holeGroup.position.x;
      const dz = t.position.z - holeGroup.position.z;
      const dist = Math.hypot(dx, dz);
      const size = t.userData.size;
      const absorbable = size <= absorbR * 0.6; // stricter threshold
      if (running && absorbable && dist < absorbR) {
        t.userData.absorbing = true;
        t.userData.absorbY = t.position.y; // ensure start height is current
      }
    }

    renderer.render(scene, camera);

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  if (tooltip) setTimeout(() => tooltip.remove(), 4000);

  return {
    restart() {
      // quick reset: reload the page (keeps code simpler/minimal)
      window.location.reload();
    }
  };
}


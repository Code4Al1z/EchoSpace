// main.js - Three.js scene, render loop, player controller, visualiser

// ── Scene ─────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00000a);
scene.fog = new THREE.FogExp2(0x00000a, 0.028);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  120
);
camera.position.set(0, 6.0, 0);

// ── Lighting ──────────────────────────────────────────────────────────────

const ambient = new THREE.AmbientLight(0x060618, 4.0);
scene.add(ambient);

const skyLight = new THREE.HemisphereLight(0x0d0d33, 0x000008, 1.4);
scene.add(skyLight);

const fillLight = new THREE.PointLight(0x0a0820, 1.2, 40);
fillLight.position.set(0, 0.3, 0);
scene.add(fillLight);

// ── Floor ─────────────────────────────────────────────────────────────────

const floorGeo = new THREE.PlaneGeometry(80, 80, 1, 1);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x060614,
  roughness: 0.98,
  metalness: 0.0,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(80, 60, 0x0d0d2a, 0x080820);
gridHelper.position.y = 0.005;
scene.add(gridHelper);

// ── Pillars ───────────────────────────────────────────────────────────────

(function buildPillars() {
  const pillarPositions = [
    [-14, -14], [14, -14], [-14, 14], [14, 14],
    [-20, 0],   [20, 0],   [0, -20],  [0, 20],
    [-10, -20], [10, -20], [-10, 20], [10, 20],
    [-18, -18], [18, -18], // near discovery corner
  ];
  pillarPositions.forEach(([px, pz]) => {
    const height = 5 + Math.random() * 6;
    const radius = 0.18 + Math.random() * 0.12;
    const geo = new THREE.CylinderGeometry(radius * 0.6, radius, height, 6, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x080820, emissive: 0x04040f, roughness: 0.9, metalness: 0.3,
    });
    const pillar = new THREE.Mesh(geo, mat);
    pillar.position.set(px, height / 2, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
  });
})();

// ── Ceiling fragments ─────────────────────────────────────────────────────

(function buildCeilingFragments() {
  for (let i = 0; i < 28; i++) {
    const size = 0.4 + Math.random() * 1.2;
    const geo = new THREE.BoxGeometry(size, 0.08 + Math.random() * 0.15, size * (0.6 + Math.random() * 0.8));
    const mat = new THREE.MeshStandardMaterial({
      color: 0x070718, emissive: 0x030310, roughness: 0.95,
    });
    const slab = new THREE.Mesh(geo, mat);
    const angle = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * 16;
    slab.position.set(
      Math.cos(angle) * r + (Math.random() - 0.5) * 3,
      8 + Math.random() * 4,
      Math.sin(angle) * r + (Math.random() - 0.5) * 3
    );
    slab.rotation.y = Math.random() * Math.PI;
    slab.rotation.z = (Math.random() - 0.5) * 0.3;
    scene.add(slab);
  }
})();

// ── Floor light pools ─────────────────────────────────────────────────────

const lightPoolData = [
  { pos: [-7,  0.02, -6],  color: 0x0a1040 },
  { pos: [7,   0.02, -5],  color: 0x150a30 },
  { pos: [0,   0.02, -10], color: 0x0a1a10 },
  { pos: [-9,  0.02, 2],   color: 0x1a0808 },
  { pos: [8,   0.02, 4],   color: 0x121005 },
  { pos: [1,   0.02, 6],   color: 0x050510 },
  { pos: [-17, 0.02, -16], color: 0x1a0a2a }, // discovery object
];

lightPoolData.forEach(({ pos, color }) => {
  const geo = new THREE.CircleGeometry(2.2, 32);
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.55,
  });
  const pool = new THREE.Mesh(geo, mat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(...pos);
  scene.add(pool);
});

// ── Ambient particles ─────────────────────────────────────────────────────

(function buildAmbientParticles() {
  const count = 800;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = 0.5 + Math.random() * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x1a1a44, size: 0.05, transparent: true, opacity: 0.35, sizeAttenuation: true,
  });
  scene.add(new THREE.Points(geo, mat));
})();

// ── Mobile detection ──────────────────────────────────────────────────────

const isMobile = window.matchMedia('(pointer: coarse)').matches
  || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

if (isMobile) {
  document.getElementById('how-controls').textContent = 'Left stick to move, right stick to look, tap interact near an object';
  document.getElementById('how-menu').textContent = 'Tap menu at any time to pause.';
}

// ── Player controller (keyboard) ─────────────────────────────────────────

const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup',   e => { keys[e.code] = false; });

let yaw = 0;
let pitch = 0;
let isLocked = false;
let playerReady = false;

renderer.domElement.addEventListener('click', () => {
  if (!isLocked && playerReady && !isMobile) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === renderer.domElement;
  if (!isMobile) {
    document.getElementById('crosshair').classList.toggle('visible', isLocked);
  }
});

document.addEventListener('mousemove', e => {
  if (!isLocked) return;
  yaw   -= e.movementX * 0.0018;
  pitch -= e.movementY * 0.0018;
  pitch  = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, pitch));
});

const moveDir = new THREE.Vector3();
const MOVE_SPEED = 0.055;

// Virtual joystick state (mobile)
const touchMove = { x: 0, y: 0 };
const touchLook = { x: 0, y: 0 };

function updatePlayer() {
  if (!playerReady) return;

  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  moveDir.set(0, 0, 0);

  // Keyboard
  if (keys['KeyW'] || keys['ArrowUp'])    moveDir.z -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  moveDir.z += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  moveDir.x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;

  // Touch left joystick
  moveDir.z -= touchMove.y;
  moveDir.x += touchMove.x;

  // Touch right joystick (look)
  yaw   -= touchLook.x * 0.03;
  pitch -= touchLook.y * 0.02;
  pitch  = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, pitch));

  const isMoving = moveDir.lengthSq() > 0.001;

  if (isMoving) {
    moveDir.normalize().multiplyScalar(MOVE_SPEED);
    moveDir.applyEuler(new THREE.Euler(0, yaw, 0));
    camera.position.add(moveDir);
  }

  AudioEngine.triggerFootstep(isMoving || keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']);

  camera.position.x = Math.max(-24, Math.min(24, camera.position.x));
  camera.position.z = Math.max(-24, Math.min(24, camera.position.z));
  camera.position.y = 1.6;

  // Boundary wind - louder as player approaches edge (boundary at ±24)
  const edgeDist = Math.min(
    24 - Math.abs(camera.position.x),
    24 - Math.abs(camera.position.z)
  );
  AudioEngine.updateBoundaryWind(edgeDist);
}

// ── Mobile touch joystick setup ───────────────────────────────────────────

function setupTouchControls() {
  if (!isMobile) return;

  const hint = document.getElementById('controls-hint');
  hint.textContent = 'Left stick: move  |  Right stick: look  |  Tap objects to interact';

  const moveZone  = document.getElementById('touch-move');
  const lookZone  = document.getElementById('touch-look');
  const moveKnob  = document.getElementById('move-knob');
  const lookKnob  = document.getElementById('look-knob');
  const interactBtn = document.getElementById('touch-interact');

  moveZone.style.display = 'block';
  lookZone.style.display = 'block';
  moveZone.classList.add('visible');
  lookZone.classList.add('visible');

  // Track active touches by identifier
  const activeTouches = {};
  let moveTouchId = null;
  let lookTouchId = null;

  const ZONE_RADIUS = 50;

  function getZoneCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function clampJoystick(dx, dy, radius) {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > radius) {
      dx = (dx / len) * radius;
      dy = (dy / len) * radius;
    }
    return { dx, dy };
  }

  document.addEventListener('touchstart', e => {
    if (e.target.closest('#pause-menu, .info-panel, #menu-btn')) return;
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
      const x = touch.clientX;
      const y = touch.clientY;
      const hw = window.innerWidth / 2;

      if (x < hw && moveTouchId === null) {
        moveTouchId = touch.identifier;
        activeTouches[touch.identifier] = 'move';
      } else if (x >= hw && lookTouchId === null) {
        lookTouchId = touch.identifier;
        activeTouches[touch.identifier] = 'look';
      }
    });
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (e.target.closest('#pause-menu, .info-panel, #menu-btn')) return;
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
      const role = activeTouches[touch.identifier];
      if (!role) return;

      if (role === 'move') {
        const center = getZoneCenter(moveZone);
        let { dx, dy } = clampJoystick(
          touch.clientX - center.x,
          touch.clientY - center.y,
          ZONE_RADIUS
        );
        touchMove.x = dx / ZONE_RADIUS;
        touchMove.y = dy / ZONE_RADIUS;
        moveKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }

      if (role === 'look') {
        const center = getZoneCenter(lookZone);
        let { dx, dy } = clampJoystick(
          touch.clientX - center.x,
          touch.clientY - center.y,
          ZONE_RADIUS
        );
        touchLook.x = dx / ZONE_RADIUS;
        touchLook.y = dy / ZONE_RADIUS;
        lookKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
    });
  }, { passive: false });

  function endTouch(touch) {
    const role = activeTouches[touch.identifier];
    if (!role) return;
    if (role === 'move') {
      moveTouchId = null;
      touchMove.x = 0;
      touchMove.y = 0;
      moveKnob.style.transform = 'translate(-50%, -50%)';
    }
    if (role === 'look') {
      lookTouchId = null;
      touchLook.x = 0;
      touchLook.y = 0;
      lookKnob.style.transform = 'translate(-50%, -50%)';
    }
    delete activeTouches[touch.identifier];
  }

  document.addEventListener('touchend',    e => { if (e.target.closest('#pause-menu, .info-panel, #menu-btn')) return; e.preventDefault(); Array.from(e.changedTouches).forEach(endTouch); }, { passive: false });
  document.addEventListener('touchcancel', e => { if (e.target.closest('#pause-menu, .info-panel, #menu-btn')) return; e.preventDefault(); Array.from(e.changedTouches).forEach(endTouch); }, { passive: false });

  // Touch interact button
  interactBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    raycaster.setFromCamera(screenCenter, camera);
    const hits = raycaster.intersectObjects(ObjectManager.getAllMeshes());
    if (hits.length > 0) {
      const obj = ObjectManager.getObjectByMesh(hits[0].object);
      if (obj) {
        const plate = ObjectManager.interact(obj);
        showNamePlate(plate.name, plate.detail);
        triggerFirstInteractPulse();
      }
    }
  }, { passive: false });
}

// ── Arrival animation ─────────────────────────────────────────────────────

let arrivalProgress = 0;
const ARRIVAL_DURATION = 2.4;

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function updateArrival(delta) {
  if (playerReady) return;
  arrivalProgress += delta / ARRIVAL_DURATION;
  if (arrivalProgress >= 1) {
    arrivalProgress = 1;
    playerReady = true;
    if (!isMobile) renderer.domElement.requestPointerLock();
  }
  const t = easeOutCubic(arrivalProgress);
  camera.position.y = 6.0 + (1.6 - 6.0) * t;
  yaw = (1 - t) * 0.4;
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = 0;
}

// ── Name plate ────────────────────────────────────────────────────────────

const namePlate    = document.getElementById('name-plate');
const plateTitle   = document.getElementById('plate-title');
const plateDetail  = document.getElementById('plate-detail');
let plateFadeTimer = null;

function showNamePlate(name, detail) {
  plateTitle.textContent  = name;
  plateDetail.textContent = detail;
  namePlate.classList.add('visible');
  clearTimeout(plateFadeTimer);
  plateFadeTimer = setTimeout(() => namePlate.classList.remove('visible'), 3200);
}

// ── Pause menu and info panels ────────────────────────────────────────────

const pauseMenu = document.getElementById('pause-menu');
const panels    = Array.from(document.querySelectorAll('.info-panel'));
const menuBtn   = document.getElementById('menu-btn');
let paused       = false;
let panelOpen    = false;
let menuOpenedAt = 0;

function openMenu() {
  if (paused || !started) return;
  paused = true;
  menuOpenedAt = performance.now();
  pauseMenu.classList.add('visible');
  if (isLocked) document.exitPointerLock();
  AudioEngine.suspend();
}

function closePanels() {
  panels.forEach(p => p.classList.remove('visible'));
  panelOpen = false;
}

function openPanel(id) {
  closePanels();
  document.getElementById(id).classList.add('visible');
  panelOpen = true;
}

function closeMenu() {
  if (!paused) return;
  paused = false;
  closePanels();
  pauseMenu.classList.remove('visible');
  AudioEngine.resume();
  if (!isMobile && playerReady) renderer.domElement.requestPointerLock();
}

document.getElementById('resume-btn').addEventListener('click', closeMenu);
document.getElementById('controls-btn').addEventListener('click', () => openPanel('controls-panel'));
document.getElementById('story-btn').addEventListener('click', () => openPanel('story-panel'));
document.getElementById('credits-btn').addEventListener('click', () => openPanel('credits'));
panels.forEach(p => p.addEventListener('click', closePanels));
menuBtn.addEventListener('click', openMenu);

document.addEventListener('keydown', e => {
  if (e.code !== 'Escape') return;
  if (panelOpen) {
    closePanels();
  } else if (paused && performance.now() - menuOpenedAt > 300) {
    closeMenu();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (!isLocked && started && playerReady) openMenu();
});

// ── First-interact pulse (all connection lines flare simultaneously) ───────

const pulseFlash   = document.getElementById('pulse-flash');
let firstInteract  = false;

function triggerFirstInteractPulse() {
  if (firstInteract) return;
  firstInteract = true;

  // CSS flash on the full-screen overlay
  pulseFlash.style.transition = 'none';
  pulseFlash.style.background = 'rgba(100, 130, 255, 0.07)';
  pulseFlash.style.opacity    = '1';
  requestAnimationFrame(() => {
    pulseFlash.style.transition = 'opacity 1.8s ease';
    pulseFlash.style.opacity    = '0';
  });

  // Tell ConnectionManager to flare all lines
  ConnectionManager.triggerGlobalPulse();
}

// ── Boundary wind sound ───────────────────────────────────────────────────
// (initialised in start button handler after AudioEngine.init())

// ── Raycaster ─────────────────────────────────────────────────────────────

const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

document.addEventListener('click', () => {
  if (!isLocked || !playerReady || isMobile) return;
  raycaster.setFromCamera(screenCenter, camera);
  const hits = raycaster.intersectObjects(ObjectManager.getAllMeshes());
  if (hits.length > 0) {
    const obj = ObjectManager.getObjectByMesh(hits[0].object);
    if (obj) {
      const plate = ObjectManager.interact(obj);
      showNamePlate(plate.name, plate.detail);
      triggerFirstInteractPulse();
    }
  }
});

// ── Interact prompt ───────────────────────────────────────────────────────

const interactPrompt = document.getElementById('interact-prompt');
const touchInteract  = document.getElementById('touch-interact');

function updateInteractPrompt() {
  const nearest = ObjectManager.getNearestInteractable(camera, 5.0);
  const show = nearest && (isLocked || isMobile);
  if (show) {
    interactPrompt.textContent = nearest.def.interactMessage;
    interactPrompt.classList.add('visible');
    if (isMobile) touchInteract.classList.add('visible');
  } else {
    interactPrompt.classList.remove('visible');
    if (isMobile) touchInteract.classList.remove('visible');
  }
}

// ── Discovery event ───────────────────────────────────────────────────────

const discoveryHint = document.getElementById('discovery-hint');
let discoveryTriggered = false;

// Show the "something stirs" hint shortly after entering -
// this is the audio cue that tells the player to explore.
function scheduleDiscoveryHint() {
  setTimeout(() => {
    discoveryHint.classList.add('visible');
    // Fade it out after 4s
    setTimeout(() => discoveryHint.classList.add('fade'), 4000);
  }, 8000); // 8s after entering - enough time to absorb the space first
}

// When the hidden object is fully revealed, show a brief confirmation
window.addEventListener('echospace:discovered', () => {
  if (discoveryTriggered) return;
  discoveryTriggered = true;
  discoveryHint.classList.remove('fade');
  discoveryHint.textContent = 'you found the hidden sound';
  discoveryHint.classList.add('visible');
  setTimeout(() => discoveryHint.classList.add('fade'), 3500);
});

// ── Visualiser ────────────────────────────────────────────────────────────

const vizCanvas = document.getElementById('visualizer-canvas');
const vizCtx = vizCanvas.getContext('2d');

function resizeViz() {
  vizCanvas.width  = window.innerWidth;
  vizCanvas.height = 80;
}
resizeViz();

function drawVisualiser() {
  const data = AudioEngine.getFrequencyData();
  if (!data) return;

  const w = vizCanvas.width;
  const h = vizCanvas.height;

  vizCtx.fillStyle = 'rgba(0,0,8,0.35)';
  vizCtx.fillRect(0, 0, w, h);

  const binCount = data.length;
  const barWidth = w / binCount;

  for (let i = 0; i < binCount; i++) {
    const v = data[i] / 255;
    if (v < 0.02) continue;
    const barH  = v * h;
    const hue   = 220 + (i / binCount) * 100;
    const alpha = 0.35 + v * 0.6;
    vizCtx.fillStyle = `hsla(${hue}, 75%, 58%, ${alpha})`;
    vizCtx.fillRect(i * barWidth, h - barH, Math.max(1, barWidth - 1), barH);
  }

  vizCtx.strokeStyle = 'rgba(100,120,255,0.06)';
  vizCtx.beginPath();
  vizCtx.moveTo(0, 0);
  vizCtx.lineTo(w, 0);
  vizCtx.stroke();
}

// ── Resize ────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeViz();
});

// ── Controls hint ─────────────────────────────────────────────────────────

const controlsHint = document.getElementById('controls-hint');
function startHintFade() {
  setTimeout(() => controlsHint.classList.add('fade'), 12000);
}

// ── Start button ──────────────────────────────────────────────────────────

let started = false;

document.getElementById('start-btn').addEventListener('click', () => {
  if (started) return;
  started = true;

  AudioEngine.init();
  AudioEngine.initBoundaryWind();
  ObjectManager.init(scene);

  // Pass object definitions to ConnectionManager after objects are built
  ConnectionManager.init(scene, ObjectManager.getDefinitions());

  if (isMobile) setupTouchControls();

  const overlay = document.getElementById('overlay');
  overlay.classList.add('hidden');
  setTimeout(() => overlay.remove(), 900);

  setTimeout(() => {
    document.getElementById('arrival-fade').classList.add('gone');
  }, 500);

  startHintFade();
  scheduleDiscoveryHint();
  menuBtn.textContent = isMobile ? 'menu' : 'menu (esc)';
  menuBtn.classList.add('visible');
});

// ── Render loop ───────────────────────────────────────────────────────────

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta   = clock.getDelta();
  const elapsed = clock.elapsedTime;

  if (started && !paused) {
    updateArrival(delta);
    updatePlayer();

    const proximities   = ObjectManager.update(elapsed, camera);
    const objectWorldPositions = ObjectManager.getWorldPositions();

    ConnectionManager.update(elapsed, objectWorldPositions, proximities);
    AudioEngine.updateSympatheticResonance(proximities);
    AudioEngine.updateListener(camera);
    updateInteractPrompt();
    drawVisualiser();
  }

  renderer.render(scene, camera);
}

animate();

// objects.js - Interactive object definitions for Echospace

const ObjectManager = (() => {

  const objects = [];
  let scene = null;

  const definitions = [
    {
      id: 'obj_drone',
      synthType: 'drone',
      position: new THREE.Vector3(-7, 1.4, -6),
      geometry: 'icosahedron',
      color: 0x1a2a6e,
      emissive: 0x0a1040,
      emissiveOnInteract: 0x3355dd,
      wireColor: 0x2244aa,
      lightColor: 0x1133bb,
      scale: 0.9,
      interactMessage: '[ resonate ]',
      plateName: 'resonance',
      plateDetail: '110hz drone / 4 detuned oscillators / slow lfo',
      floatSpeed: 0.6,
      floatAmount: 0.18,
    },
    {
      id: 'obj_pulse',
      synthType: 'pulse',
      position: new THREE.Vector3(7, 1.2, -5),
      geometry: 'octahedron',
      color: 0x2a1a5e,
      emissive: 0x150a30,
      emissiveOnInteract: 0x7733cc,
      wireColor: 0x6622bb,
      lightColor: 0x5522aa,
      scale: 0.75,
      interactMessage: '[ pulse ]',
      plateName: 'pulse',
      plateDetail: '220hz square / amplitude lfo / bandpass filter',
      floatSpeed: 1.4,
      floatAmount: 0.25,
    },
    {
      id: 'obj_granular',
      synthType: 'granular',
      position: new THREE.Vector3(0, 1.6, -10),
      geometry: 'sphere',
      color: 0x1a3a2a,
      emissive: 0x0a1a10,
      emissiveOnInteract: 0x22bb66,
      wireColor: 0x1a8844,
      lightColor: 0x115533,
      scale: 1.0,
      interactMessage: '[ scatter ]',
      plateName: 'scatter',
      plateDetail: '165hz granular / 5 detuned grains / randomised envelopes',
      floatSpeed: 0.35,
      floatAmount: 0.3,
    },
    {
      id: 'obj_breath',
      synthType: 'breath',
      position: new THREE.Vector3(-9, 1.0, 2),
      geometry: 'torus',
      color: 0x3a1a1a,
      emissive: 0x1a0808,
      emissiveOnInteract: 0xcc3322,
      wireColor: 0xaa2211,
      lightColor: 0x881a10,
      scale: 0.8,
      interactMessage: '[ breathe ]',
      plateName: 'breath',
      plateDetail: '80hz sawtooth / lowpass sweep / 0.18hz lfo',
      floatSpeed: 0.22,
      floatAmount: 0.12,
    },
    {
      id: 'obj_chime',
      synthType: 'chime',
      position: new THREE.Vector3(8, 2.0, 4),
      geometry: 'tetrahedron',
      color: 0x2a2a1a,
      emissive: 0x121005,
      emissiveOnInteract: 0xddcc22,
      wireColor: 0xaaaa22,
      lightColor: 0x888811,
      scale: 0.7,
      interactMessage: '[ ring ]',
      plateName: 'chime',
      plateDetail: '528hz / inharmonic partials / exponential decay',
      floatSpeed: 0.9,
      floatAmount: 0.22,
    },
    {
      id: 'obj_sub',
      synthType: 'sub',
      position: new THREE.Vector3(1, 0.5, 6),
      geometry: 'box',
      color: 0x0a0a1a,
      emissive: 0x050510,
      emissiveOnInteract: 0x1133aa,
      wireColor: 0x0a1a66,
      lightColor: 0x081244,
      scale: 1.1,
      interactMessage: '[ ground ]',
      plateName: 'ground',
      plateDetail: '55hz sub / lowpass 120hz / frequency drift',
      floatSpeed: 0.15,
      floatAmount: 0.08,
      hidden: false,
    },
    {
      id: 'obj_discovery',
      synthType: 'whisper',
      position: new THREE.Vector3(-17, 1.2, -16),
      geometry: 'icosahedron',
      color: 0x1a0a2a,
      emissive: 0x0c0416,
      emissiveOnInteract: 0xcc88ff,
      wireColor: 0x8833cc,
      lightColor: 0x441166,
      scale: 0.55,
      interactMessage: '[ you found it ]',
      plateName: 'whisper',
      plateDetail: '880hz shimmer / 3 sine partials / micro lfo',
      floatSpeed: 0.4,
      floatAmount: 0.14,
      hidden: true,
    },
  ];

  // ── Geometry factory ──────────────────────────────────────────────────────

  function makeGeometry(type, scale) {
    switch (type) {
      case 'icosahedron': return new THREE.IcosahedronGeometry(scale, 1);
      case 'octahedron':  return new THREE.OctahedronGeometry(scale, 0);
      case 'sphere':      return new THREE.SphereGeometry(scale, 16, 10);
      case 'torus':       return new THREE.TorusGeometry(scale, scale * 0.32, 10, 24);
      case 'tetrahedron': return new THREE.TetrahedronGeometry(scale, 0);
      case 'box':         return new THREE.BoxGeometry(scale, scale, scale, 2, 2, 2);
      default:            return new THREE.IcosahedronGeometry(scale, 1);
    }
  }

  // ── Wireframe overlay ─────────────────────────────────────────────────────

  function makeWireframe(geo, color) {
    const wireGeo = new THREE.WireframeGeometry(geo);
    const wireMat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.22,
    });
    return new THREE.LineSegments(wireGeo, wireMat);
  }

  // ── Particle halo ─────────────────────────────────────────────────────────

  function makeParticleHalo(position, color, count = 90) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.1 + Math.random() * 1.0;
      positions[i * 3]     = position.x + r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = position.y + r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = position.z + r * Math.cos(phi);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: color,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }

  // ── Orbit ring ────────────────────────────────────────────────────────────

  function makeOrbitRing(position, radius, color) {
    const geo = new THREE.TorusGeometry(radius, 0.012, 4, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.18,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(position);
    ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    ring.rotation.z = (Math.random() - 0.5) * 0.4;
    return ring;
  }

  // ── Second tilted ring (added for visual depth) ────────────────────────────

  function makeSecondRing(position, radius, color) {
    const geo = new THREE.TorusGeometry(radius * 0.7, 0.008, 4, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.1,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(position);
    ring.rotation.x = (Math.random() - 0.5) * Math.PI;
    ring.rotation.y = (Math.random() - 0.5) * Math.PI;
    return ring;
  }

  // ── Floor glow decal ─────────────────────────────────────────────────────

  function makeFloorGlow(position, color) {
    const geo = new THREE.CircleGeometry(1.6, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.18,
    });
    const decal = new THREE.Mesh(geo, mat);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(position.x, 0.01, position.z);
    return decal;
  }

  // ── Build all objects ─────────────────────────────────────────────────────

  function init(threeScene) {
    scene = threeScene;

    definitions.forEach(def => {
      const geo = makeGeometry(def.geometry, def.scale);

      const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.emissive,
        emissiveIntensity: 0.5,
        roughness: 0.25,
        metalness: 0.7,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(def.position);
      mesh.castShadow = true;
      scene.add(mesh);

      // Wireframe overlay
      const wire = makeWireframe(geo, def.wireColor);
      mesh.add(wire); // child of mesh so it moves with it

      const halo = makeParticleHalo(def.position, def.color, 80);
      scene.add(halo);

      const ring = makeOrbitRing(def.position, def.scale * 2.4, def.wireColor);
      scene.add(ring);

      const ring2 = makeSecondRing(def.position, def.scale * 2.4, def.wireColor);
      scene.add(ring2);

      const floorGlow = makeFloorGlow(def.position, def.lightColor);
      scene.add(floorGlow);

      // Per-object point light - coloured, medium range
      const light = new THREE.PointLight(def.lightColor, 1.2, 10);
      light.position.copy(def.position);
      scene.add(light);

      // Hidden objects start fully invisible
      if (def.hidden) {
        mesh.visible = false;
        halo.visible = false;
        ring.visible = false;
        ring2.visible = false;
        floorGlow.visible = false;
        light.intensity = 0;
      }

      objects.push({
        id: def.id,
        mesh,
        wire,
        mat,
        halo,
        ring,
        ring2,
        floorGlow,
        light,
        def,
        baseY: def.position.y,
        floatPhase: Math.random() * Math.PI * 2,
        interactGlow: 0,
        revealed: !def.hidden,
        revealProgress: def.hidden ? 0 : 1,
      });

      AudioEngine.registerObject(def.id, def.position, def.synthType);
    });
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  function update(time, camera) {
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    let nearestDist = Infinity;
    const proximities = {};

    objects.forEach(obj => {
      const floatY = obj.baseY
        + Math.sin(time * obj.def.floatSpeed + obj.floatPhase) * obj.def.floatAmount;

      obj.mesh.position.y = floatY;
      obj.halo.position.y = floatY;
      obj.ring.position.y = floatY;
      obj.ring2.position.y = floatY;
      obj.light.position.y = floatY;

      // Rotation
      obj.mesh.rotation.y += 0.005;
      obj.mesh.rotation.x += 0.002;
      obj.ring.rotation.z  += 0.0012;
      obj.ring2.rotation.x += 0.0008;
      obj.ring2.rotation.y += 0.0015;

      // Halo pulse
      const pulse = 0.5 + 0.5 * Math.sin(time * obj.def.floatSpeed * 2.2 + obj.floatPhase);
      obj.halo.material.opacity = 0.2 + pulse * 0.25;
      obj.halo.material.size = 0.04 + pulse * 0.02;

      // Wireframe breathe
      obj.wire.material.opacity = 0.12 + pulse * 0.14;

      // Proximity
      const dist = camPos.distanceTo(obj.mesh.position);
      if (dist < nearestDist) nearestDist = dist;
      const proximity = Math.max(0, 1 - dist / 14);

      // Discovery object: gradually reveal when player walks within 9 units
      if (obj.def.hidden && !obj.revealed) {
        if (dist < 9) {
          obj.revealProgress = Math.min(1, obj.revealProgress + 0.008);
          if (!obj.mesh.visible) {
            obj.mesh.visible = true;
            obj.halo.visible = true;
            obj.ring.visible = true;
            obj.ring2.visible = true;
            obj.floorGlow.visible = true;
          }
          obj.mat.opacity = obj.revealProgress;
          obj.mat.transparent = true;
          obj.halo.material.opacity = obj.revealProgress * 0.35;
          obj.light.intensity = obj.revealProgress * 1.8;
          if (obj.revealProgress >= 1) {
            obj.revealed = true;
            obj.mat.transparent = false;
            // Notify main.js via a custom event
            window.dispatchEvent(new CustomEvent('echospace:discovered'));
          }
        }
        // Skip normal proximity logic for unrevealed object
        return;
      }

      obj.light.intensity = 0.7 + proximity * 2.2;
      obj.floorGlow.material.opacity = 0.12 + proximity * 0.3;
      proximities[obj.id] = proximity;

      // Interaction glow decay
      if (obj.interactGlow > 0) {
        obj.interactGlow = Math.max(0, obj.interactGlow - 0.016);
        const g = obj.interactGlow;
        obj.mat.emissive.setHex(lerpColor(obj.def.emissive, obj.def.emissiveOnInteract, g));
        obj.mat.emissiveIntensity = 0.5 + g * 2.0;
        obj.light.intensity += g * 3.0;
        obj.wire.material.opacity = 0.12 + g * 0.5;
      } else {
        obj.mat.emissiveIntensity = 0.5;
      }
    });

    const reverbAmount = Math.min(0.82, nearestDist / 16);
    AudioEngine.setReverbAmount(reverbAmount);
    return proximities;
  }

  // ── Interaction ───────────────────────────────────────────────────────────

  function getObjectByMesh(mesh) {
    return objects.find(o => o.mesh === mesh) || null;
  }

  function interact(obj) {
    obj.interactGlow = 1.0;
    AudioEngine.triggerInteraction(obj.id);
    return { name: obj.def.plateName, detail: obj.def.plateDetail };
  }

  function getNearestInteractable(camera, maxDist = 5.5) {
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    let nearest = null;
    let nearestDist = maxDist;
    objects.forEach(obj => {
      if (!obj.revealed) return;
      const dist = camPos.distanceTo(obj.mesh.position);
      if (dist < nearestDist) { nearestDist = dist; nearest = obj; }
    });
    return nearest;
  }

  function getAllMeshes() {
    return objects.filter(o => o.revealed).map(o => o.mesh);
  }

  function getDefinitions() {
    return definitions;
  }

  function getWorldPositions() {
    const out = {};
    objects.forEach(o => {
      out[o.id] = o.mesh.position.clone();
    });
    return out;
  }

  // ── Colour lerp ───────────────────────────────────────────────────────────

  function lerpColor(hexA, hexB, t) {
    const ra = (hexA >> 16) & 0xff, ga = (hexA >> 8) & 0xff, ba = hexA & 0xff;
    const rb = (hexB >> 16) & 0xff, gb = (hexB >> 8) & 0xff, bb = hexB & 0xff;
    return (Math.round(ra + (rb - ra) * t) << 16)
         | (Math.round(ga + (gb - ga) * t) << 8)
         |  Math.round(ba + (bb - ba) * t);
  }

  return { init, update, interact, getObjectByMesh, getAllMeshes, getNearestInteractable, getDefinitions, getWorldPositions };

})();

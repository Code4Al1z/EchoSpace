// connections.js - Visual lines between harmonically related objects
// Lines pulse in brightness when both objects are active / player is near.

const ConnectionManager = (() => {

  const lines = [];
  let scene = null;
  let ready = false;

  // Called after objects are initialised so we can read their positions
  function init(threeScene, objectDefs) {
    scene = threeScene;
    ready = true;

    const pairs = AudioEngine.getHarmonicPairs();

    pairs.forEach(({ a, b, label }) => {
      const defA = objectDefs.find(d => d.id === a);
      const defB = objectDefs.find(d => d.id === b);
      if (!defA || !defB) return;

      const points = [
        defA.position.clone(),
        defB.position.clone(),
      ];

      const geo = new THREE.BufferGeometry().setFromPoints(points);

      // Store mutable positions so we can animate them with object float
      const posArray = geo.attributes.position.array;

      const mat = new THREE.LineBasicMaterial({
        color: mixColor(defA.wireColor, defB.wireColor),
        transparent: true,
        opacity: 0.0,
      });

      const line = new THREE.Line(geo, mat);
      scene.add(line);

      lines.push({
        line,
        geo,
        posArray,
        idA: a,
        idB: b,
        label,
        baseOpacity: 0,
      });
    });
  }

  function mixColor(hexA, hexB) {
    const ra = (hexA >> 16) & 0xff, ga = (hexA >> 8) & 0xff, ba = hexA & 0xff;
    const rb = (hexB >> 16) & 0xff, gb = (hexB >> 8) & 0xff, bb = hexB & 0xff;
    return ((Math.round((ra + rb) / 2) << 16) |
            (Math.round((ga + gb) / 2) << 8)  |
             Math.round((ba + bb) / 2));
  }

  // Update endpoint Y positions to match floating objects,
  // and pulse opacity based on proximities.
  function update(time, objectPositions, proximities) {
    if (!ready) return;

    lines.forEach(conn => {
      const posA = objectPositions[conn.idA];
      const posB = objectPositions[conn.idB];
      if (!posA || !posB) return;

      // Sync line endpoints to current object world positions (including float)
      conn.posArray[0] = posA.x;
      conn.posArray[1] = posA.y;
      conn.posArray[2] = posA.z;
      conn.posArray[3] = posB.x;
      conn.posArray[4] = posB.y;
      conn.posArray[5] = posB.z;
      conn.geo.attributes.position.needsUpdate = true;

      // Pulse strength: product of both objects' proximities
      const proxA = proximities[conn.idA] || 0;
      const proxB = proximities[conn.idB] || 0;
      const strength = proxA * proxB;

      // Slow pulse oscillation on top of proximity
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.8 + conn.idA.length);
      const targetOpacity = strength * (0.25 + pulse * 0.35);

      // Smooth lerp to avoid hard pops
      conn.line.material.opacity += (targetOpacity - conn.line.material.opacity) * 0.05;
    });
  }

  // ── Global pulse: briefly flare all lines simultaneously ──────────────────

  function triggerGlobalPulse() {
    lines.forEach(conn => {
      conn.line.material.opacity = 0.9;
    });
    // Lines will decay back through the normal update lerp
  }

  return { init, update, triggerGlobalPulse };

})();

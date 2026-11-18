// audio.js - Web Audio API spatial engine for Echospace

const AudioEngine = (() => {

  let ctx = null;
  let masterGain = null;
  let reverbWet = null;
  let reverbConvolver = null;
  let dryBus = null;
  let analyser = null;
  let footstepGain = null;

  const sources = {};

  // ── Harmonic relationships between objects (for resonance system) ─────────
  // Each pair shares a partial ratio - drone:granular share a fifth,
  // chime:drone share an octave, etc. Used by ConnectionManager.

  const harmonicPairs = [
    { a: 'obj_drone',   b: 'obj_granular', ratio: 1.5,  label: 'fifth'   },
    { a: 'obj_drone',   b: 'obj_chime',    ratio: 2.0,  label: 'octave'  },
    { a: 'obj_pulse',   b: 'obj_sub',      ratio: 4.0,  label: 'octave'  },
    { a: 'obj_breath',  b: 'obj_granular', ratio: 1.25, label: 'third'   },
    { a: 'obj_chime',   b: 'obj_pulse',    ratio: 1.2,  label: 'third'   },
  ];

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.85;
    masterGain.connect(ctx.destination);

    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(masterGain);

    dryBus = ctx.createGain();
    dryBus.gain.value = 0.6;
    dryBus.connect(analyser);

    reverbConvolver = ctx.createConvolver();
    reverbConvolver.buffer = buildImpulseResponse(2.4, 2, false);

    reverbWet = ctx.createGain();
    reverbWet.gain.value = 0.38;
    reverbConvolver.connect(reverbWet);
    reverbWet.connect(analyser);

    // Footstep bus - dry only, no reverb send (footsteps are close/intimate)
    footstepGain = ctx.createGain();
    footstepGain.gain.value = 0.18;
    footstepGain.connect(masterGain);
  }

  // ── Impulse response ──────────────────────────────────────────────────────

  function buildImpulseResponse(duration, decay, reverse) {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = reverse ? length - i : i;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / length, decay);
      }
    }
    return impulse;
  }

  // ── Footstep synthesiser ──────────────────────────────────────────────────
  // Procedural: noise burst shaped by a fast exponential envelope,
  // passed through a bandpass filter tuned to mimic a soft stone step.
  // Pitch is randomised slightly each call for natural variation.

  let lastStepTime = 0;
  const STEP_INTERVAL = 0.38; // seconds between steps at full walk speed

  function triggerFootstep(moving) {
    if (!ctx || !moving) return;
    const now = ctx.currentTime;
    if (now - lastStepTime < STEP_INTERVAL) return;
    lastStepTime = now;

    // Noise source via short oscillator burst
    const bufLen = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buf;

    // Bandpass: centre frequency randomised around 180Hz for stone-like thud
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 160 + Math.random() * 60;
    filter.Q.value = 1.4;

    // Second filter for top-end click
    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.value = 800 + Math.random() * 200;
    filter2.Q.value = 3;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.9 + Math.random() * 0.2, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    source.connect(filter);
    source.connect(filter2);
    filter.connect(env);
    filter2.connect(env);
    env.connect(footstepGain);

    source.start(now);
    source.stop(now + 0.07);
  }

  // ── Sympathetic resonance between harmonically related objects ────────────
  // When the player is near object A, object B's gain subtly swells.
  // Amount is proportional to proximity to A, fades with distance.

  function updateSympatheticResonance(objectProximities) {
    if (!ctx) return;
    const targets = {};
    harmonicPairs.forEach(({ a, b }) => {
      const proxA = objectProximities[a] || 0;
      const proxB = objectProximities[b] || 0;
      targets[a] = Math.max(targets[a] || 0, proxB);
      targets[b] = Math.max(targets[b] || 0, proxA);
    });
    Object.keys(targets).forEach(id => {
      const s = sources[id];
      if (!s) return;
      s.res.gain.setTargetAtTime(1 + targets[id] * 0.6, ctx.currentTime, 0.8);
    });
  }

  function getHarmonicPairs() { return harmonicPairs; }

  // ── Panner ────────────────────────────────────────────────────────────────

  function createPanner(position) {
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 2;
    panner.maxDistance = 30;
    panner.rolloffFactor = 1.8;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
    if (panner.positionX) {
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
    } else {
      panner.setPosition(position.x, position.y, position.z);
    }

    const res = ctx.createGain();
    res.gain.value = 1.0;
    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    panner.connect(res);
    res.connect(gain);
    gain.connect(dryBus);
    gain.connect(reverbConvolver);
    return { panner, gain, res };
  }

  // ── Synth builders ────────────────────────────────────────────────────────

  function buildDroneSynth(baseFreq, detunes, lfoRate, lfoDepth) {
    const oscs = detunes.map(detune => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq;
      osc.detune.value = detune;
      return osc;
    });
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = lfoRate;
    lfoGain.gain.value = lfoDepth;
    lfo.connect(lfoGain);
    oscs.forEach(o => lfoGain.connect(o.frequency));
    const merger = ctx.createGain();
    merger.gain.value = 0.25 / oscs.length;
    oscs.forEach(o => o.connect(merger));
    lfo.start();
    oscs.forEach(o => o.start());
    return { node: merger, oscillators: [...oscs, lfo] };
  }

  function buildPulseSynth(freq, pulseRate) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq * 1.5;
    filter.Q.value = 4;
    const ampLfo = ctx.createOscillator();
    const ampGain = ctx.createGain();
    ampLfo.type = 'sine';
    ampLfo.frequency.value = pulseRate;
    ampGain.gain.value = 0.5;
    ampLfo.connect(ampGain);
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.5;
    ampGain.connect(oscGain.gain);
    osc.connect(filter);
    filter.connect(oscGain);
    ampLfo.start();
    osc.start();
    return { node: oscGain, oscillators: [osc, ampLfo] };
  }

  function buildGranularSynth(baseFreq) {
    const count = 5;
    const oscs = [];
    const merger = ctx.createGain();
    merger.gain.value = 0.18;
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = baseFreq * (1 + i * 0.07);
      osc.detune.value = (Math.random() - 0.5) * 80;
      const env = ctx.createGain();
      env.gain.value = 0;
      osc.connect(env);
      env.connect(merger);
      osc.start();
      const scheduleGrain = () => {
        if (ctx.state !== 'running') { setTimeout(scheduleGrain, 250); return; }
        const now = ctx.currentTime;
        const dur = 0.05 + Math.random() * 0.15;
        const gap = 0.02 + Math.random() * 0.18;
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(0.8, now + dur * 0.3);
        env.gain.linearRampToValueAtTime(0, now + dur);
        setTimeout(scheduleGrain, (dur + gap) * 1000);
      };
      scheduleGrain();
      oscs.push(osc);
    }
    return { node: merger, oscillators: oscs };
  }

  function buildBreathSynth(freq) {
    const noise = ctx.createOscillator();
    noise.type = 'sawtooth';
    noise.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 0.8;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    const gain = ctx.createGain();
    gain.gain.value = 0.22;
    noise.connect(filter);
    filter.connect(gain);
    noise.start();
    lfo.start();
    return { node: gain, oscillators: [noise, lfo] };
  }

  function buildChimeSynth(freq) {
    const merger = ctx.createGain();
    merger.gain.value = 0.3;
    const oscs = [];
    const partials = [1, 2.756, 5.404, 8.933];
    partials.forEach(p => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * p;
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(merger);
      osc.start();
      oscs.push({ osc, gain: g });
    });
    const schedulePing = () => {
      if (ctx.state !== 'running') { setTimeout(schedulePing, 250); return; }
      const now = ctx.currentTime;
      const decay = 1.2 + Math.random() * 1.4;
      oscs.forEach(({ gain }, i) => {
        const vol = [0.7, 0.45, 0.25, 0.12][i];
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
      });
      setTimeout(schedulePing, 1800 + Math.random() * 3200);
    };
    schedulePing();
    return { node: merger, oscillators: oscs.map(o => o.osc) };
  }

  function buildSubSynth(freq) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = freq * 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    osc.connect(filter);
    filter.connect(gain);
    osc.start();
    lfo.start();
    return { node: gain, oscillators: [osc, lfo] };
  }

  // ── Hidden object: distant whisper synth ──────────────────────────────────
  // Used for the discovery object - very quiet, high-frequency shimmer
  // that the player can only hear when they walk toward it.

  function buildWhisperSynth() {
    const count = 3;
    const merger = ctx.createGain();
    merger.gain.value = 0.12;
    const oscs = [];
    [880, 1320, 1760].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 20;
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.08 + i * 0.05;
      lfoG.gain.value = 12;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.value = 0.33;
      osc.connect(g);
      g.connect(merger);
      osc.start();
      lfo.start();
      oscs.push(osc, lfo);
    });
    return { node: merger, oscillators: oscs };
  }

  // ── Register ──────────────────────────────────────────────────────────────

  function registerObject(id, position, synthType) {
    if (!ctx) return;
    const { panner, gain, res } = createPanner(position);
    let synth;
    switch (synthType) {
      case 'drone':   synth = buildDroneSynth(110, [-8, 0, 8, 15], 0.12, 6); break;
      case 'pulse':   synth = buildPulseSynth(220, 1.8);                      break;
      case 'granular':synth = buildGranularSynth(165);                        break;
      case 'breath':  synth = buildBreathSynth(80);                           break;
      case 'chime':   synth = buildChimeSynth(528);                           break;
      case 'sub':     synth = buildSubSynth(55);                              break;
      case 'whisper': synth = buildWhisperSynth();                            break;
      default:        synth = buildDroneSynth(130, [0, 7], 0.1, 4);
    }
    synth.node.connect(panner);
    sources[id] = { panner, gain, res, oscillators: synth.oscillators };
  }

  let boundaryWindGain = null;

  // ── Boundary wind initialisation ──────────────────────────────────────────
  // Called from main.js after AudioEngine.init() - sets up a filtered
  // noise source that fades in as the player approaches the space edge.

  function initBoundaryWind() {
    if (!ctx) return;

    // White noise via short looping buffer
    const bufLen = ctx.sampleRate * 2;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    // Highpass to remove low rumble - keeps it airy rather than thunderous
    const hp = ctx.createBiquadFilter();
    hp.type            = 'highpass';
    hp.frequency.value = 900;
    hp.Q.value         = 0.5;

    // Lowpass to remove harsh top end
    const lp = ctx.createBiquadFilter();
    lp.type            = 'lowpass';
    lp.frequency.value = 3500;
    lp.Q.value         = 0.4;

    boundaryWindGain = ctx.createGain();
    boundaryWindGain.gain.value = 0;

    src.connect(hp);
    hp.connect(lp);
    lp.connect(boundaryWindGain);
    boundaryWindGain.connect(masterGain);

    src.start();
  }

  // edgeDist: units remaining before the wall (0 = at wall, 24 = centre)
  function updateBoundaryWind(edgeDist) {
    if (!boundaryWindGain) return;
    const amount = Math.max(0, 1 - edgeDist / 8) * 0.12;
    boundaryWindGain.gain.setTargetAtTime(amount, ctx.currentTime, 0.4);
  }

  // ── Interaction ───────────────────────────────────────────────────────────

  function triggerInteraction(id) {
    const s = sources[id];
    if (!s) return;
    const now = ctx.currentTime;
    s.gain.gain.cancelScheduledValues(now);
    s.gain.gain.setValueAtTime(s.gain.gain.value, now);
    s.gain.gain.linearRampToValueAtTime(2.2, now + 0.08);
    s.gain.gain.exponentialRampToValueAtTime(1.0, now + 1.4);
  }

  // ── Listener sync ─────────────────────────────────────────────────────────

  function updateListener(camera) {
    if (!ctx) return;
    const pos = new THREE.Vector3();
    camera.getWorldPosition(pos);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    if (ctx.listener.positionX) {
      ctx.listener.positionX.setValueAtTime(pos.x, ctx.currentTime);
      ctx.listener.positionY.setValueAtTime(pos.y, ctx.currentTime);
      ctx.listener.positionZ.setValueAtTime(pos.z, ctx.currentTime);
      ctx.listener.forwardX.setValueAtTime(forward.x, ctx.currentTime);
      ctx.listener.forwardY.setValueAtTime(forward.y, ctx.currentTime);
      ctx.listener.forwardZ.setValueAtTime(forward.z, ctx.currentTime);
      ctx.listener.upX.setValueAtTime(up.x, ctx.currentTime);
      ctx.listener.upY.setValueAtTime(up.y, ctx.currentTime);
      ctx.listener.upZ.setValueAtTime(up.z, ctx.currentTime);
    } else {
      ctx.listener.setPosition(pos.x, pos.y, pos.z);
      ctx.listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  // ── Reverb ────────────────────────────────────────────────────────────────

  function setReverbAmount(amount) {
    if (!reverbWet) return;
    const clamped = Math.max(0.1, Math.min(0.85, amount));
    reverbWet.gain.setTargetAtTime(clamped, ctx.currentTime, 0.3);
  }

  // ── Analyser ──────────────────────────────────────────────────────────────

  function getFrequencyData() {
    if (!analyser) return null;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
  }

  function suspend() {
    if (ctx && ctx.state === 'running') ctx.suspend();
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  return {
    init,
    suspend,
    resume,
    initBoundaryWind,
    updateBoundaryWind,
    registerObject,
    triggerInteraction,
    triggerFootstep,
    updateListener,
    updateSympatheticResonance,
    getHarmonicPairs,
    setReverbAmount,
    getFrequencyData,
  };

})();

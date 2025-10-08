// Minimal WebAudio helper to play short hit/slash sounds
// Uses an unlocked AudioContext and synthesizes a brief noise burst with a clicky transient.

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.buffers = new Map();
    this.loops = new Map(); // key -> { src, gain }
    this.pendingLoops = new Map(); // key -> options to start once unlocked
    this.urls = new Map(); // key -> url for lazy loading
  }

  init() {
    if (this.isInitialized) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      console.warn("WebAudio not supported; sound disabled");
      return;
    }
    this.ctx = new Ctx();
    // Attempt to resume on first interaction for iOS/Chrome policies
    const resume = () => {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      // Start any queued loops now that audio is unlocked
      this._drainPendingLoops();
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    this.isInitialized = true;
    // If already running (some browsers), drain immediately
    if (this.ctx.state === "running") {
      this._drainPendingLoops();
    }
  }

  async loadClip(key, url) {
    if (!this.ctx) return;
    if (this.buffers.has(key)) return;
    if (url) {
      this.urls.set(key, url);
    } else if (!this.urls.has(key)) {
      return; // no url known
    }
    const res = await fetch(url || this.urls.get(key));
    const arr = await res.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arr);
    this.buffers.set(key, buffer);
    // If anything was waiting on this buffer, try to start it now
    this._drainPendingLoops();
  }

  async loadClips(dict) {
    const entries = Object.entries(dict);
    // remember urls for lazy loading
    entries.forEach(([key, url]) => this.urls.set(key, url));
    await Promise.all(entries.map(([key, url]) => this.loadClip(key, url)));
  }

  playClip(key, options = {}) {
    if (!this.ctx) return;
    // If the context is running now, start any queued loops
    this._drainPendingLoops();
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    const vol = typeof options.volume === "number" ? options.volume : 0.6;
    gain.gain.setValueAtTime(vol, now);
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now + (options.delaySec || 0));
  }

  // Looping background music helper
  playLoop(key, options = {}) {
    if (!this.ctx) return;
    const buffer = this.buffers.get(key);
    if (!buffer) {
      // Lazy-load then try again
      const url = this.urls.get(key);
      if (url) {
        this.loadClip(key, url).then(() => {
          // If context not running yet, queue; else, start now
          if (this.ctx && this.ctx.state !== "running") {
            this.pendingLoops.set(key, options);
          } else {
            this.playLoop(key, options);
          }
        }).catch(() => {/* ignore load errors */});
      }
      // Also queue play intent in case context is locked
      if (this.ctx.state !== "running") {
        this.pendingLoops.set(key, options);
      }
      return;
    }
    // If context not yet running due to autoplay policy, queue this loop
    if (this.ctx.state !== "running") {
      this.pendingLoops.set(key, options);
      return;
    }
    // If already looping, update volume and return
    const existing = this.loops.get(key);
    const now = this.ctx.currentTime;
    if (existing) {
      if (typeof options.volume === "number") {
        existing.gain.gain.setValueAtTime(options.volume, now);
      }
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = this.ctx.createGain();
    const vol = typeof options.volume === "number" ? options.volume : 0.5;
    gain.gain.setValueAtTime(vol, now);
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now + (options.delaySec || 0));
    this.loops.set(key, { src, gain });
  }

  stopLoop(key, options = {}) {
    const node = this.loops.get(key);
    if (!node) return;
    const now = this.ctx?.currentTime ?? 0;
    const fadeMs = typeof options.fadeMs === "number" ? options.fadeMs : 120;
    try {
      if (this.ctx && fadeMs > 0) {
        const endT = now + fadeMs / 1000;
        node.gain.gain.cancelScheduledValues(now);
        node.gain.gain.setValueAtTime(node.gain.gain.value, now);
        node.gain.gain.linearRampToValueAtTime(0.0001, endT);
        node.src.stop(endT);
      } else {
        node.src.stop();
      }
    } catch (_) {
      // ignore
    }
    this.loops.delete(key);
    // Also ensure it's not pending anymore
    this.pendingLoops.delete(key);
  }

  _drainPendingLoops() {
    if (!this.ctx || this.ctx.state !== "running") return;
    if (this.pendingLoops.size === 0) return;
    const entries = Array.from(this.pendingLoops.entries());
    this.pendingLoops.clear();
    entries.forEach(([key, opts]) => {
      // Guard against having started meanwhile
      if (!this.loops.has(key)) {
        this.playLoop(key, opts || {});
      }
    });
  }

  // Quick synthetic slash: short filtered noise with pitchy transient
  playSlash(volume = 0.4) {
    if (!this.ctx) return;
    // If the context is running now, start any queued loops
    this._drainPendingLoops();
    const now = this.ctx.currentTime;

    // Gain envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    // Transient: short high-pitch osc for the initial "slice"
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
    oscGain.gain.setValueAtTime(volume * 0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    // Noise for the body of the slash
    const noiseBuffer = this._createNoiseBuffer(0.12);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1800, now);
    noiseFilter.Q.setValueAtTime(0.8, now);

    // Connect graph
    osc.connect(oscGain);
    oscGain.connect(gain);
    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.ctx.destination);

    // Start/stop
    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.1);
    noise.stop(now + 0.14);
  }

  // Metallic "CHING" for parry: bright resonant hit with short tail
  playParryChing(volume = 0.8) {
    if (!this.ctx) return;
    this._drainPendingLoops();
    const now = this.ctx.currentTime;

    // Master gain
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0012, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    // Two resonant bands to simulate metal
    const noiseBuffer = this._createNoiseBuffer(0.28);
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const bp1 = this.ctx.createBiquadFilter();
    bp1.type = "bandpass";
    bp1.frequency.setValueAtTime(3000, now);
    bp1.Q.setValueAtTime(10, now);
    const bp2 = this.ctx.createBiquadFilter();
    bp2.type = "bandpass";
    bp2.frequency.setValueAtTime(6000, now);
    bp2.Q.setValueAtTime(9, now);

    // High-pitched transient oscillators
    const osc1 = this.ctx.createOscillator();
    const osc1Gain = this.ctx.createGain();
    osc1.type = "square";
    osc1.frequency.setValueAtTime(3200, now);
    osc1.frequency.exponentialRampToValueAtTime(1600, now + 0.07);
    osc1Gain.gain.setValueAtTime(volume * 0.5, now);
    osc1Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    const osc2 = this.ctx.createOscillator();
    const osc2Gain = this.ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(2200, now);
    osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.08);
    osc2Gain.gain.setValueAtTime(volume * 0.28, now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    // Ring modulator for metallic shimmer
    const ringOsc = this.ctx.createOscillator();
    ringOsc.type = "sine";
    ringOsc.frequency.setValueAtTime(180, now);
    const ringGain = this.ctx.createGain();
    ringGain.gain.setValueAtTime(volume * 0.2, now);

    // Wire
    src.connect(bp1);
    bp1.connect(bp2);
    // Simple comb feedback network
    const delay = this.ctx.createDelay(0.03);
    delay.delayTime.setValueAtTime(0.011, now);
    const fb = this.ctx.createGain();
    fb.gain.setValueAtTime(0.35, now);
    bp2.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    // Dry/wet mix
    const wetGain = this.ctx.createGain();
    wetGain.gain.setValueAtTime(0.7, now);
    const dryGain = this.ctx.createGain();
    dryGain.gain.setValueAtTime(0.5, now);
    delay.connect(wetGain);
    bp2.connect(dryGain);
    // Ring modulation path
    const ringMultiplier = this.ctx.createGain();
    ringMultiplier.gain.setValueAtTime(0, now);
    ringOsc.connect(ringMultiplier.gain);
    wetGain.connect(ringMultiplier);
    dryGain.connect(gain);
    ringMultiplier.connect(gain);
    osc1.connect(osc1Gain);
    osc1Gain.connect(gain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gain);
    gain.connect(this.ctx.destination);

    // Play
    src.start(now);
    src.stop(now + 0.28);
    osc1.start(now);
    osc1.stop(now + 0.11);
    osc2.start(now + 0.005);
    osc2.stop(now + 0.12);
    ringOsc.start(now);
    ringOsc.stop(now + 0.26);
  }

  _createNoiseBuffer(durationSec = 0.12) {
    const rate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(durationSec * rate));
    const buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      // Colored noise leaning slightly towards high frequencies
      const white = Math.random() * 2 - 1;
      const t = i / length;
      // Emphasize attack
      const env = Math.pow(1 - t, 2);
      data[i] = white * env;
    }
    return buffer;
  }
}

export const audio = new AudioManager();



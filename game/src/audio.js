// Ridge Runner: Alpine Mail Run — sound, synthesized live, no audio files.
// One job: an engine hum that follows the throttle, wind that follows the
// speed, and a chime, a thud and a fanfare for the game's big moments.
// Everything is built from oscillators and filtered noise, so the game
// ships no sound files and loads nothing over the network.

export function makeAudio() {
  const audio = {
    ctx: null,
    engine: null,
    engineGain: null,
    windGain: null,
    muted: false,
    started: false,
  };

  // Browsers only let sound start after a user gesture, so the first
  // keypress or click builds the graph.
  audio.ensure = function ensure() {
    if (audio.started) return;
    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audio.ctx = ctx;

      // Engine: a sawtooth through a low-pass filter, pitch tied to throttle.
      // A second oscillator one octave up, mixed quietly, gives the engine
      // its buzz instead of a flat single tone.
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 70;
      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.value = 140;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      const gain = ctx.createGain();
      gain.gain.value = 0.0;
      const gain2 = ctx.createGain();
      gain2.gain.value = 0.25;
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc2.connect(gain2).connect(filter);
      osc.start();
      osc2.start();
      audio.engine = osc;
      audio.engine2 = osc2;
      audio.engineGain = gain;

      // Wind: looped white noise through a band-pass filter.
      const len = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 700;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.0;
      noise.connect(band).connect(windGain).connect(ctx.destination);
      noise.start();
      audio.windGain = windGain;

      audio.started = true;
    } catch {
      // No audio on this machine: the game plays silently, never crashes.
      audio.started = false;
    }
  };

  // Call every frame: the engine note and the wind follow the plane.
  audio.update = function update(throttle, speed) {
    if (!audio.started || audio.muted) return;
    const t = audio.ctx.currentTime;
    audio.engine.frequency.setTargetAtTime(55 + throttle * 95, t, 0.08);
    audio.engine2.frequency.setTargetAtTime(110 + throttle * 190, t, 0.08);
    audio.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.05, t, 0.1);
    audio.windGain.gain.setTargetAtTime(Math.min(0.09, speed * 0.0009), t, 0.15);
  };

  audio.setMuted = function setMuted(muted) {
    audio.muted = muted;
    if (!audio.started) return;
    const t = audio.ctx.currentTime;
    audio.engineGain.gain.setTargetAtTime(muted ? 0 : 0.06, t, 0.05);
    audio.windGain.gain.setTargetAtTime(0, t, 0.05);
  };

  // A short two-note chime when a ring is scored.
  audio.chime = function chime() {
    if (!audio.started || audio.muted) return;
    const ctx = audio.ctx;
    [880, 1318].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  };

  // A low thud when the plane hits terrain.
  audio.thud = function thud() {
    if (!audio.started || audio.muted) return;
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.25);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  };

  // A rising three-note fanfare for a successful landing.
  audio.fanfare = function fanfare() {
    if (!audio.started || audio.muted) return;
    const ctx = audio.ctx;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
  };

  return audio;
}

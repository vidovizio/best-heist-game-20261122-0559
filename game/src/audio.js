// audio.js — the heist's own sounds, synthesised in the browser with WebAudio: no files, no
// downloads. A low pulse that creeps louder as the alarm climbs, a crisp chime for loot, a hiss for
// smoke, a zap for the EMP, a click for a picked lock, and a falling groan when you are caught. One
// job: sound, made from oscillators.

export function createAudio() {
  let ctx = null;
  let master = null;
  let tense = null;
  let tenseGain = null;
  let muted = false;

  const ensure = () => {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
    // The tension bed: two detuned low oscillators, silent until the alarm gives them voice.
    tenseGain = ctx.createGain();
    tenseGain.gain.value = 0;
    tenseGain.connect(master);
    tense = [];
    for (const f of [55, 82.5]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.connect(tenseGain);
      o.start();
      tense.push(o);
    }
    return ctx;
  };

  const blip = (freq, dur, type, gain, slideTo) => {
    const c = ensure();
    if (!c || muted) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + dur + 0.03);
  };

  const noise = (dur, gain, lowpass) => {
    const c = ensure();
    if (!c || muted) return;
    const frames = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, frames, c.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.82 + white * 0.18;
      data[i] = last * (1 - i / frames);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
  };

  return {
    /** Unlocks the audio context from a user gesture (browsers require one). */
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.32; return muted; },
    isMuted() { return muted; },
    play(name) {
      if (name === 'loot') { blip(880, 0.18, 'sine', 0.5, 1320); setTimeout(() => blip(1320, 0.22, 'sine', 0.35), 90); }
      else if (name === 'smoke') noise(0.7, 0.4, 900);
      else if (name === 'emp') blip(1400, 0.35, 'sawtooth', 0.25, 90);
      else if (name === 'unlock') { blip(520, 0.09, 'square', 0.22, 640); setTimeout(() => blip(760, 0.12, 'square', 0.2), 100); }
      else if (name === 'whistle') blip(1750, 0.28, 'sine', 0.32, 1900);
      else if (name === 'caught') blip(420, 0.7, 'sawtooth', 0.4, 70);
      else if (name === 'alarm') blip(680, 0.5, 'square', 0.28, 940);
      else if (name === 'step') blip(120, 0.05, 'triangle', 0.07);
      else if (name === 'exit') { blip(660, 0.16, 'sine', 0.4, 990); setTimeout(() => blip(990, 0.3, 'sine', 0.35), 120); }
      else if (name === 'deny') blip(180, 0.12, 'square', 0.18);
    },
    /** The tension bed follows the alarm: one call per frame with a 0..1 share. */
    setTension(share) {
      if (!tenseGain || !ctx) return;
      const target = muted ? 0 : 0.02 + share * 0.16;
      tenseGain.gain.setTargetAtTime(target, ctx.currentTime, 0.25);
      const wobble = 1 + Math.sin(ctx.currentTime * 3.2) * 0.06 * share;
      for (let i = 0; i < tense.length; i++) tense[i].frequency.setTargetAtTime([55, 82.5][i] * wobble, ctx.currentTime, 0.2);
    },
  };
}

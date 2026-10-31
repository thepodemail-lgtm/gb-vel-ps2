'use strict';
import { TUNING } from './tuning.js';

/* Original WebAudio SFX. No samples from any existing game. */
export const AudioFX = (() => {
  let ctx = null, master = null, musicGain = null, musicNodes = [], started = false;

  function ensure() {
    if (started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = TUNING.sfxVolume;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = TUNING.musicVolume;
    musicGain.connect(ctx.destination);
    started = true;
  }
  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
  function tone(freq, dur, type, vol, slideTo) {
    ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol) {
    ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.6;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  function sword() { noise(0.12, 0.22); tone(420, 0.1, 'sawtooth', 0.12, 180); }
  function hit() { noise(0.08, 0.28); tone(140, 0.12, 'square', 0.18, 60); }
  function bark() { tone(520, 0.08, 'square', 0.16, 280); setTimeout(() => tone(380, 0.1, 'square', 0.12, 200), 70); }
  function hurt() { tone(220, 0.15, 'sawtooth', 0.2, 80); noise(0.1, 0.15); }
  function block() { tone(300, 0.06, 'triangle', 0.14); noise(0.05, 0.1); }
  function win() { tone(440, 0.15, 'square', 0.12); setTimeout(() => tone(660, 0.2, 'square', 0.12), 120); }
  function startMusic() {
    ensure();
    if (!ctx || !TUNING.musicEnabled) return;
    stopMusic();
    const t0 = ctx.currentTime + 0.05;
    [110, 164.81, 220].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.value = i === 0 ? 0.04 : 0.02;
      o.connect(g); g.connect(musicGain);
      o.start(t0);
      musicNodes.push(o, g);
    });
  }
  function stopMusic() {
    musicNodes.forEach(n => { try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch (_) {} });
    musicNodes = [];
  }
  function setMute(m) {
    ensure();
    if (!master) return;
    master.gain.value = m ? 0 : TUNING.sfxVolume;
    if (musicGain) musicGain.gain.value = m ? 0 : TUNING.musicVolume;
  }
  return { resume, sword, hit, bark, hurt, block, win, startMusic, stopMusic, setMute };
})();
